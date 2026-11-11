import * as THREE from 'three';
import { SKY_SHADER_UNIFORMS } from './sky.js';

const HALLS = {
  kodo: { halfWidth: 9.0, halfDepth: 4.4, floor: 1.0, ceiling: 5.4 },
  gojunoto: { halfWidth: 3.425, halfDepth: 3.425, floor: 1.35, ceiling: 4.7, cardinalDoors: true },
  daito: { halfWidth: 4.9, halfDepth: 4.9, floor: 1.4, ceiling: 6.4 },
};

export function extendJapanMaterial(material, key, compile) {
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = function (shader, renderer) {
    previousCompile.call(this, shader, renderer);
    compile(shader);
  };
  material.customProgramCacheKey = () => `${previousKey}|${key}`;
  material.needsUpdate = true;
}

function addWorldPosition(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vJapanWorld;')
    .replace('#include <project_vertex>', `
      #include <project_vertex>
      vJapanWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
    `);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
    #include <common>
    varying vec3 vJapanWorld;
  `);
}

/** Shade the landmark using its existing direct and indirect lighting. */
export function lightJapanLandmark(model, { landmark, x, y = 0, z, lowSpec = false }) {
  const { halfWidth, halfDepth, floor, ceiling, cardinalDoors } = HALLS[landmark];
  const center = { value: new THREE.Vector3(x, y, z) };
  const bounds = { value: new THREE.Vector4(halfWidth, halfDepth, floor, ceiling) };
  const inverseScale = { value: 1 / model.scale.x };
  const materials = new Set();
  model.traverse(object => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material?.isMeshStandardMaterial) materials.add(material);
    }
  });

  for (const material of materials) {
    // loadJapanLandmarks collects textures before onReady. It still owns the
    // source normal maps even when this profile never uploads them.
    if (lowSpec && material.name.endsWith('_TemplePBR')) material.normalMap = null;
    extendJapanMaterial(material, cardinalDoors ? 'japan-hall-cardinal' : 'japan-hall-south', shader => {
      addWorldPosition(shader);
      shader.uniforms.uJapanHallCenter = center;
      shader.uniforms.uJapanHallBounds = bounds;
      shader.uniforms.uJapanHallInverseScale = inverseScale;
      shader.uniforms.uJapanHallNight = SKY_SHADER_UNIFORMS.uNightFactor;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `
          #include <common>
          uniform vec3 uJapanHallCenter;
          uniform vec4 uJapanHallBounds;
          uniform float uJapanHallInverseScale;
          uniform float uJapanHallNight;
        `)
        .replace('#include <lights_fragment_end>', `
          vec3 hall = (vJapanWorld - uJapanHallCenter) * uJapanHallInverseScale;
          vec2 walls = uJapanHallBounds.xy;
          vec2 insideWalls = 1.0 - smoothstep(walls - 0.2, walls + 0.5, abs(hall.xz));
          float aboveFloor = smoothstep(uJapanHallBounds.z - 0.14, uJapanHallBounds.z + 0.1, hall.y);
          float belowCeiling = 1.0 - smoothstep(uJapanHallBounds.w - 0.15, uJapanHallBounds.w + 0.6, hall.y);
          vec3 hallNormal = transformNormalByInverseViewMatrix(geometryNormal, viewMatrix);
          // Downward-facing roof surfaces see less sky, including upper eaves.
          float underside = smoothstep(0.08, 0.8, -hallNormal.y)
            * smoothstep(uJapanHallBounds.w - 1.1, uJapanHallBounds.w, hall.y);

          vec2 doorway = hall.xz;
          vec3 entrance = vec3(0.0, -0.45, 0.89);
          ${cardinalDoors ? `
            // The ground story has an opening on each face.
            if (abs(doorway.x) > abs(doorway.y)) {
              doorway = doorway.yx;
              entrance.xz = vec2(0.89 * sign(doorway.y), 0.0);
            } else {
              entrance.z *= sign(doorway.y);
            }
            doorway.y = abs(doorway.y);
          ` : ''}
          float openAxis = 1.0 - smoothstep(0.12, 0.76, abs(doorway.x) / walls.x);
          float doorwayExposure = smoothstep(-walls.y * 0.6, walls.y, doorway.y) * openAxis;
          float interior = insideWalls.x * insideWalls.y * aboveFloor * belowCeiling;
          float covered = max(interior * (1.0 - 0.6 * doorwayExposure), underside * 0.82);
          float sunOcclusion = covered * (1.0 - 0.82 * uJapanHallNight);
          reflectedLight.directDiffuse *= 1.0 - 0.45 * sunOcclusion;
          reflectedLight.directSpecular *= 1.0 - 0.30 * sunOcclusion;
          irradiance *= 1.0 - 0.21 * covered;
          radiance *= 1.0 - 0.16 * covered;
          iblIrradiance *= 1.0 - 0.21 * covered;

          float groundExposure = doorwayExposure * aboveFloor
            * (1.0 - smoothstep(walls.y, walls.y + 2.0, doorway.y))
            * (1.0 - smoothstep(uJapanHallBounds.w - 1.0, uJapanHallBounds.w + 0.25, hall.y));
          vec3 bounce = mix(vec3(0.17, 0.125, 0.079), vec3(0.036, 0.044, 0.060), uJapanHallNight);
          irradiance += bounce * groundExposure * (0.25 + 0.75 * max(0.0, dot(hallNormal, entrance)));
          vec3 hallReflection = transformDirectionByInverseViewMatrix(reflect(-geometryViewDir, geometryNormal), viewMatrix);
          radiance += bounce * groundExposure * smoothstep(0.25, 0.95, dot(hallReflection, entrance)) * 0.32;
          #include <lights_fragment_end>
        `);
    });
  }
}

/** Apply a mipmapped ground tile and contact shading to an existing surface. */
export function dressJapanLandmarkGround(material, tile, patches, { paving = false } = {}) {
  if (!tile) return;
  const centers = { value: patches.map(({ x, z }) => new THREE.Vector2(x, z)) };
  const bounds = { value: patches.map(({ podium, area }) => new THREE.Vector4(...podium, ...area)) };
  const stairs = { value: patches.map(({ approach = [0, 0] }) => new THREE.Vector2(...approach)) };
  // Tō-ji's two tiles are shared with Kondō and should each be counted once.
  const textures = new Set(material.userData.extraTextures);
  textures.add(tile);
  material.userData.extraTextures = [...textures];

  const count = patches.length;
  extendJapanMaterial(material, `japan-ground-${count}-${paving}`, shader => {
    addWorldPosition(shader);
    shader.uniforms.uJapanGroundTile = { value: tile };
    shader.uniforms.uJapanGroundCenters = centers;
    shader.uniforms.uJapanGroundBounds = bounds;
    shader.uniforms.uJapanGroundStairs = stairs;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `
        #include <common>
        uniform sampler2D uJapanGroundTile;
        uniform vec2 uJapanGroundCenters[${count}];
        uniform vec4 uJapanGroundBounds[${count}];
        uniform vec2 uJapanGroundStairs[${count}];
      `)
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        vec2 groundXZ = vJapanWorld.xz;
        vec2 groundDx = dFdx(groundXZ);
        vec2 groundDy = dFdy(groundXZ);
        for (int patchIndex = 0; patchIndex < ${count}; patchIndex++) {
          vec2 ground = groundXZ - uJapanGroundCenters[patchIndex];
          vec4 bounds = uJapanGroundBounds[patchIndex];
          vec2 absGround = abs(ground);
          if (all(lessThan(absGround, bounds.zw))) {
            vec2 border = 1.0 - smoothstep(bounds.zw - vec2(4.0), bounds.zw, absGround);
            vec2 tileScale = ${paving ? 'vec2(6.4, 5.0)' : 'vec2(3.4)'};
            float coverage = border.x * border.y * ${paving ? '1.0' : '0.88'};
            vec3 aggregate = textureGrad(uJapanGroundTile, ground / tileScale,
              groundDx / tileScale, groundDy / tileScale).rgb;
            diffuseColor.rgb = mix(diffuseColor.rgb, aggregate, coverage);
            vec2 step = uJapanGroundStairs[patchIndex];
            float contact = length(max(absGround - bounds.xy, 0.0));
            if (step.y > 0.0) {
              vec2 stepSize = vec2(step.x, bounds.y + step.y);
              contact = min(contact, length(max(absGround - stepSize, 0.0)));
              stepSize = vec2(bounds.x + step.y, step.x);
              contact = min(contact, length(max(absGround - stepSize, 0.0)));
            }
            diffuseColor.rgb *= 1.0 - 0.28 * coverage * (1.0 - smoothstep(0.0, 1.65, contact));
          }
        }
      `);
  });
}
