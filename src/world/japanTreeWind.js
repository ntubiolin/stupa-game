import * as THREE from 'three';

const windDeclarations = /* glsl */`
uniform vec2 treeWindOrigin;
uniform vec2 treeWindDir;
uniform float treeWindTime;
uniform float treeWindStrength;
uniform float treeHeight;
`;

const bendTree = /* glsl */`
mat4 treeToWorld = modelMatrix;
#ifdef USE_INSTANCING
  treeToWorld = modelMatrix * instanceMatrix;
#endif
vec2 treeCenter = treeToWorld[3].xz - treeWindOrigin;
vec3 branch = mat3(treeToWorld) * transformed;
float wave = treeWindTime * 1.55 - dot(treeCenter, treeWindDir) * 0.27;
float heightWeight = smoothstep(0.75, treeHeight, transformed.y);
float twigWeight = smoothstep(0.75, 2.8, length(transformed.xz))
                 * smoothstep(0.75, 2.0, transformed.y);
float bend = heightWeight * treeHeight * 0.029 * (0.58 + 0.42 * sin(wave));
float flutter = twigWeight * 0.075 * sin(3.1 * treeWindTime + wave + dot(branch, vec3(0.8, 0.6, 1.3)));
vec3 offsetWorld = vec3(treeWindDir.x, 0.0, treeWindDir.y) * (bend + flutter) * treeWindStrength;
// Map transforms consist of translation, rotation and nonuniform scale. Project
// wind onto each local axis before Three projects the vertex for either pass.
mat3 axes = mat3(treeToWorld);
transformed += (transpose(axes) * offsetWorld) / vec3(
  dot(axes[0], axes[0]), dot(axes[1], axes[1]), dot(axes[2], axes[2])
);
`;

/** One set of gust uniforms per map, shared by visible geometry and its shadow casters. */
export function createJapanTreeWind(origin) {
  const uniforms = {
    treeWindOrigin: { value: new THREE.Vector2(origin.x, origin.z) },
    treeWindDir: { value: new THREE.Vector2(1, 0) },
    treeWindStrength: { value: 0 },
    treeWindTime: { value: 0 },
  };

  function bendMaterial(material, height) {
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms, { treeHeight: { value: height } });
      shader.vertexShader = windDeclarations + shader.vertexShader.replace(
        '#include <begin_vertex>', '#include <begin_vertex>\n' + bendTree
      );
    };
    material.customProgramCacheKey = () => 'japan-tree-wind';
  }

  return {
    update(wind, elapsed) {
      uniforms.treeWindTime.value = elapsed;
      uniforms.treeWindStrength.value = THREE.MathUtils.clamp(wind?.strength ?? 0, 0, 1.5);
      if (wind?.dir) uniforms.treeWindDir.value.copy(wind.dir).normalize();
    },
    bendMaterial,
    // Three copies the current cutout texture and alpha threshold from the visible
    // material when drawing each shadow. Keep separate shadow materials per surface.
    shadowMaterials(height, disposables) {
      const depth = new THREE.MeshDepthMaterial();
      const distance = new THREE.MeshDistanceMaterial();
      bendMaterial(depth, height);
      bendMaterial(distance, height);
      disposables.push(depth, distance);
      return { customDepthMaterial: depth, customDistanceMaterial: distance };
    },
  };
}
