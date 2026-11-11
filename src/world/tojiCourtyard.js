import * as THREE from 'three';
import { seededRandom } from './mapBase.js';
import { SKY_SHADER_UNIFORMS } from './sky.js';

const TILE_SIZE = 256;

function graniteTone(value, warmth) {
  return `rgb(${value + warmth}, ${value}, ${value - warmth})`;
}

function drawGravel(context) {
  const random = seededRandom(302);
  context.fillStyle = '#bfb7a7';
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  for (let i = 0; i < 8500; i++) {
    const x = random() * TILE_SIZE;
    const y = random() * TILE_SIZE;
    const width = 0.8 + random() ** 3 * 4.0;
    const height = width * (0.35 + random() * 0.48);
    const tone = Math.round(143 + random() * 87);
    context.fillStyle = graniteTone(tone, Math.round(3 + random() * 10));
    context.beginPath();
    // Wrap particles at the tile seam, including their antialiased edges.
    for (const dx of x + width >= TILE_SIZE ? [0, -TILE_SIZE] : x < width ? [0, TILE_SIZE] : [0]) {
      for (const dy of y + height >= TILE_SIZE ? [0, -TILE_SIZE] : y < height ? [0, TILE_SIZE] : [0]) {
        context.rect(x + dx - width / 2, y + dy - height / 2, width, height);
      }
    }
    context.fill();
  }
}

function drawPaving(context) {
  const random = seededRandom(470);
  const seamWidth = 1;
  const courses = [
    [0, 51, 119, 184, 256],
    [0, 75, 134, 201, 256],
    [0, 61, 126, 192, 256],
    [0, 42, 114, 176, 256],
    [0, 68, 139, 197, 256],
  ];
  context.fillStyle = '#797269';
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  for (const [row, joints] of courses.entries()) {
    const top = row * TILE_SIZE / courses.length + seamWidth;
    const bottom = (row + 1) * TILE_SIZE / courses.length - seamWidth;
    for (let column = 0; column < joints.length - 1; column++) {
      const left = joints[column] + seamWidth;
      const right = joints[column + 1] - seamWidth;
      const tone = Math.round(144 + random() * 28);
      context.beginPath();
      context.moveTo(left + 1, top + 2);
      context.lineTo(right - 2, top);
      context.lineTo(right, top + 5);
      context.lineTo(right - 1, bottom - 1);
      context.lineTo(left + 3, bottom);
      context.lineTo(left, bottom - 5);
      context.closePath();
      context.save();
      context.clip();
      context.fillStyle = graniteTone(tone, 8);
      context.fillRect(left, top, right - left, bottom - top);
      for (let i = 0; i < 260; i++) {
        const grain = Math.round(tone + (random() - 0.48) * 58);
        context.fillStyle = graniteTone(grain, Math.round(2 + random() * 12));
        context.fillRect(left + random() * (right - left), top + random() * (bottom - top),
          0.6 + random() * 2.0, 0.5 + random() * 1.4);
      }
      context.strokeStyle = graniteTone(tone + 22, 8);
      context.lineWidth = 1.4;
      context.stroke();
      context.restore();
    }
  }
}

function makeTile(draw) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return null;
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 2;
  return texture;
}

function extendMaterial(material, key, compile) {
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = function (shader, renderer) {
    previousCompile.call(this, shader, renderer);
    compile(shader);
  };
  material.customProgramCacheKey = () => `${previousKey}|toji-${key}`;
  material.needsUpdate = true;
}

function addLocalCoordinates(shader, center) {
  shader.uniforms.uKondoCenter = center;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `
      #include <common>
      uniform vec2 uKondoCenter;
      varying vec3 vKondoPosition;
    `)
    .replace('#include <project_vertex>', `
      #include <project_vertex>
      vKondoPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vKondoPosition.xz -= uKondoCenter;
    `);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
    #include <common>
    varying vec3 vKondoPosition;
  `);
}

function dressCourtyardSurface(material, center, footprint, tile, paving) {
  extendMaterial(material, paving ? 'paving' : 'gravel', shader => {
    addLocalCoordinates(shader, center);
    shader.uniforms.uCourtyardTile = { value: tile };
    shader.uniforms.uKondoFootprint = footprint;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `
        #include <common>
        uniform sampler2D uCourtyardTile;
        uniform vec4 uKondoFootprint;
      `)
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        vec2 courtyard = vKondoPosition.xz;
        vec2 courtyardDx = dFdx(courtyard);
        vec2 courtyardDy = dFdy(courtyard);
        float crossAxis = abs(courtyard.x);
        if (crossAxis < 21.0 && courtyard.y > -10.0 && courtyard.y < 29.0) {
          float edgeFade = (1.0 - smoothstep(16.5, 21.0, crossAxis))
            * smoothstep(-10.0, -7.0, courtyard.y)
            * (1.0 - smoothstep(23.0, 29.0, courtyard.y));
          vec2 tileScale = ${paving ? 'vec2(6.4, 5.0)' : 'vec2(3.4)'};
          vec2 tileUv = courtyard / tileScale;
          ${paving ? 'tileUv.x += 0.5;' : `
            // Compact fine gravel near the paths and leave irregular margins toward the lawn.
            float wear = 0.5 + 0.5 * sin(courtyard.y * 0.53 + sin(courtyard.x * 0.38));
            edgeFade *= mix(0.78, 0.97, wear);
          `}
          // Explicit gradients keep the mips defined even at the courtyard boundary.
          vec3 tileColor = textureGrad(uCourtyardTile, tileUv, courtyardDx / tileScale, courtyardDy / tileScale).rgb;
          diffuseColor.rgb = mix(diffuseColor.rgb, tileColor, edgeFade);

          // Ambient contact at the stone podium and approach steps, even with mobile shadows off.
          vec2 podium = abs(courtyard) - uKondoFootprint.xy;
          float fromPodiumFront = courtyard.y - uKondoFootprint.y;
          vec2 stairs = vec2(crossAxis - uKondoFootprint.z, max(-fromPodiumFront, fromPodiumFront - uKondoFootprint.w));
          float contactDist = min(length(max(podium, 0.0)), length(max(stairs, 0.0)));
          diffuseColor.rgb *= mix(0.72, 1.0, smoothstep(0.0, 1.7, contactDist));
        }
      `);
  });
}

/**
 * Dress the existing terrain and sandō materials only within Kondō's forecourt.
 * Two mipmapped tiles add no geometry, transparent overlays, or extra passes.
 */
export function createTojiCourtyard({ origin, x, z, terrainMaterial, pavingMaterial, disposables }) {
  const center = { value: new THREE.Vector2(origin.x + x, origin.z + z) };
  // Start with the procedural podium and steps, then match the scaled GLB on asset swap.
  const footprint = { value: new THREE.Vector4(14.2, 9.2, 3.8, 1.04) };
  const gravel = makeTile(drawGravel);
  const paving = makeTile(drawPaving);
  if (gravel) {
    dressCourtyardSurface(terrainMaterial, center, footprint, gravel, false);
    disposables.push(gravel);
  }
  if (paving) {
    dressCourtyardSurface(pavingMaterial, center, footprint, paving, true);
    disposables.push(paving);
  }

  return {
    lightHall(model) {
      const scale = model.scale.x;
      footprint.value.set(9.1, 5.9, 2.4, 0.96).multiplyScalar(scale);
      const materials = new Set();
      model.traverse(object => {
        if (!object.isMesh) return;
        const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of meshMaterials) {
          if (material?.isMeshStandardMaterial) materials.add(material);
        }
      });
      for (const material of materials) {
        extendMaterial(material, 'hall', shader => {
          addLocalCoordinates(shader, center);
          shader.uniforms.uKondoNight = SKY_SHADER_UNIFORMS.uNightFactor;
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `
              #include <common>
              uniform float uKondoNight;
            `)
            .replace('#include <lights_fragment_end>', `
              // Give the floor and carved figures depth below the eaves, including on
              // mobile where the shared sun does not render a shadow map.
              float interior = (1.0 - smoothstep(1.0, 6.3, vKondoPosition.z))
                * smoothstep(-7.3, -6.4, vKondoPosition.z)
                * (1.0 - smoothstep(8.3, 9.4, abs(vKondoPosition.x)))
                * smoothstep(1.4, 1.65, vKondoPosition.y)
                * (1.0 - smoothstep(6.0, 6.8, vKondoPosition.y));
              float sunOcclusion = interior * (1.0 - 0.82 * uKondoNight);
              reflectedLight.directDiffuse *= 1.0 - 0.45 * sunOcclusion;
              reflectedLight.directSpecular *= 1.0 - 0.30 * sunOcclusion;
              irradiance *= 1.0 - 0.19 * interior;
              radiance *= 1.0 - 0.14 * interior;
              iblIrradiance *= 1.0 - 0.19 * interior;

              // Broad reflected light from the gravel through the south-facing entrance.
              // The bounce tapers with depth and off-axis distance inside the hall.
              vec3 kondoNormal = transformNormalByInverseViewMatrix(geometryNormal, viewMatrix);
              float courtyardExposure = smoothstep(-2.4, 6.0, vKondoPosition.z)
                * (1.0 - smoothstep(2.4, 7.5, abs(vKondoPosition.x)))
                * (1.0 - smoothstep(3.0, 9.0, vKondoPosition.y));
              vec3 bounceTint = mix(vec3(0.18, 0.132, 0.081), vec3(0.018, 0.024, 0.036), uKondoNight);
              float bounceFacing = 0.25 + 0.75 * max(0.0, dot(kondoNormal, vec3(0.0, -0.45, 0.89)));
              irradiance += bounceTint * courtyardExposure * bounceFacing;

              // The same broad source gives gilded faces a soft reflection without emissive fill.
              vec3 bounceReflection = transformDirectionByInverseViewMatrix(reflect(-geometryViewDir, geometryNormal), viewMatrix);
              radiance += bounceTint * courtyardExposure
                * smoothstep(0.25, 0.95, dot(bounceReflection, vec3(0.0, -0.45, 0.89))) * 0.32;
              #include <lights_fragment_end>
            `);
        });
      }
    },
  };
}
