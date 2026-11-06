const LIGHTING = {
  dawn: {
    time: 0.271,
    sky: [0x7188a2, 0xa2b2bd, 0xd9c1b0, 0x665b55],
    sun: [0xffd4ad, 1.1],
    hemi: [0xb1c6d5, 0xa18e78, 0.86],
    fog: [0xc7bdb5, 0.0085],
    exposure: 0.97,
    environment: 0.33,
  },
  day: {
    time: 0.46,
    sky: [0x708da8, 0x98b0c1, 0xc5d0d4, 0x666259],
    sun: [0xffebd5, 1.62],
    hemi: [0xbccbd3, 0xa09887, 0.88],
    fog: [0xbfcbd0, 0.0065],
    exposure: 0.98,
    environment: 0.39,
  },
  dusk: {
    time: 0.759,
    sky: [0x4a5773, 0x717d93, 0xc4937d, 0x534342],
    sun: [0xffb37a, 0.53],
    hemi: [0x899dbf, 0x76635c, 0.82],
    fog: [0x9c97a2, 0.0095],
    exposure: 1.04,
    environment: 0.29,
  },
};

const SKY_COLORS = ['uZenithColor', 'uMidColor', 'uHorizonColor', 'uGroundColor'];
const MATERIAL_GRADE = /* glsl */ `
  #include <color_fragment>
  float storyLuminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = mix(vec3(storyLuminance), diffuseColor.rgb, 0.64);
  diffuseColor.rgb *= vec3(0.96, 0.945, 0.92);
`;

export function createCinematicArt(ctx) {
  const { THREE, scene, renderer, state } = ctx;
  const originalPixelRatio = renderer.getPixelRatio();
  const originalShadows = renderer.shadowMap.enabled;
  const originalTime = { t: state.time.t, speed: state.time.speed };
  const previousOverride = ctx.sky.getTimeOverride();
  const sky = scene.children.find(node => node.material?.uniforms?.uZenithColor)?.material.uniforms;
  const sun = scene.children.find(node => node.isDirectionalLight && node.castShadow);
  const hemi = scene.children.find(node => node.isHemisphereLight);
  const materials = new Map();
  const roots = new Map();
  const gradedColors = new Map();
  const gradedValues = new Map();

  let preset = 'cinematic';
  let lighting = 'day';
  let quality = 'high';
  let timeOverride;
  let disposed = false;

  function applyMaterial(material) {
    if (!material?.isMeshStandardMaterial || materials.has(material)) return;
    const { roughness, metalness, onBeforeCompile, customProgramCacheKey } = material;
    const programKey = material.customProgramCacheKey();
    materials.set(material, { roughness, metalness, onBeforeCompile, customProgramCacheKey });
    material.roughness = Math.min(1, roughness + 0.19);
    material.metalness = metalness * 0.68;
    material.onBeforeCompile = function (shader, activeRenderer) {
      onBeforeCompile.call(this, shader, activeRenderer);
      // This hook follows the map and vertex-color chunks, so both procedural
      // stone textures and Pharping's animated vertex palette keep their detail.
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', MATERIAL_GRADE);
    };
    material.customProgramCacheKey = () => `${programKey}|story-cinematic`;
    material.needsUpdate = true;
  }

  function applyMaterials() {
    for (const root of [...new Set([ctx.stupaGroup, ...Object.values(ctx.zoneGroups || {})])]) {
      if (!root || roots.get(root) === root.children.length) continue;
      roots.set(root, root.children.length);
      root.traverse(object => {
        if (Array.isArray(object.material)) {
          for (const material of object.material) applyMaterial(material);
        } else {
          applyMaterial(object.material);
        }
      });
    }
  }

  function restoreMaterials() {
    for (const [material, original] of materials) {
      Object.assign(material, original);
      material.needsUpdate = true;
    }
    materials.clear();
    roots.clear();
  }

  function gradeColor(color, hex, colorSpace) {
    let record = gradedColors.get(color);
    if (!record) {
      record = { original: color.clone(), applied: color.clone() };
      gradedColors.set(color, record);
    } else if (!color.equals(record.applied)) {
      record.original.copy(color);
    }
    color.setHex(hex, colorSpace);
    record.applied.copy(color);
  }

  function gradeValue(object, key, value) {
    let properties = gradedValues.get(object);
    if (!properties) {
      properties = new Map();
      gradedValues.set(object, properties);
    }
    let record = properties.get(key);
    if (!record) {
      record = { original: object[key] };
      properties.set(key, record);
    } else if (object[key] !== record.applied) {
      record.original = object[key];
    }
    object[key] = value;
    record.applied = value;
  }

  function applyLighting() {
    const grade = LIGHTING[lighting];
    if (sky) {
      SKY_COLORS.forEach((key, index) => {
        // The existing sky shader writes its palette directly to the output.
        gradeColor(sky[key].value, grade.sky[index], THREE.LinearSRGBColorSpace);
      });
      gradeColor(sky.uSunColor.value, grade.sun[0]);
    }
    if (sun) {
      gradeColor(sun.color, grade.sun[0]);
      gradeValue(sun, 'intensity', grade.sun[1]);
      gradeValue(sun, 'visible', true);
    }
    if (hemi) {
      gradeColor(hemi.color, grade.hemi[0]);
      gradeColor(hemi.groundColor, grade.hemi[1]);
      gradeValue(hemi, 'intensity', grade.hemi[2]);
    }
    if (scene.fog?.isFogExp2) {
      const vision = state.zone === 'pharping';
      gradeColor(scene.fog.color, vision ? 0xbaa994 : grade.fog[0]);
      gradeValue(scene.fog, 'density', grade.fog[1] + (vision ? 0.004 : 0));
    }
    gradeValue(scene, 'environmentIntensity', grade.environment);
    gradeValue(renderer, 'toneMappingExposure', grade.exposure);
  }

  function restoreLighting() {
    for (const [color, { original, applied }] of gradedColors) {
      if (color.equals(applied)) color.copy(original);
    }
    for (const [object, properties] of gradedValues) {
      for (const [key, { original, applied }] of properties) {
        if (object[key] === applied) object[key] = original;
      }
    }
    gradedColors.clear();
    gradedValues.clear();
  }

  function applyQuality() {
    const high = quality === 'high';
    const limit = high ? originalPixelRatio : 1;
    const displayRatio = renderer.domElement.ownerDocument.defaultView.devicePixelRatio;
    const pixelRatio = Math.min(limit, displayRatio || originalPixelRatio);
    if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio);
    renderer.shadowMap.enabled = high && originalShadows;
  }

  function setLighting(value) {
    if (disposed || !Object.hasOwn(LIGHTING, value)) return false;
    restoreLighting();
    lighting = value;
    timeOverride = ctx.sky.setTimeOverride({ t: LIGHTING[lighting].time, speed: 0 });
    if (preset === 'cinematic') applyLighting();
    return true;
  }

  setLighting(lighting);
  applyMaterials();

  return {
    update() {
      if (disposed) return;
      if (preset === 'cinematic') {
        applyMaterials();
        applyLighting();
      }
      applyQuality();
    },
    setPreset(value) {
      if (disposed || (value !== 'legacy' && value !== 'cinematic')) return false;
      if (value === preset) return true;
      preset = value;
      if (preset === 'legacy') {
        restoreMaterials();
        restoreLighting();
      } else {
        applyMaterials();
        applyLighting();
      }
      return true;
    },
    releaseRoot(root) {
      roots.delete(root);
      root.traverse(object => {
        for (const material of [object.material].flat().filter(Boolean)) {
          const original = materials.get(material);
          if (original) { Object.assign(material, original); material.needsUpdate = true; materials.delete(material); }
        }
      });
    },
    setLighting,
    setQuality(value) {
      if (disposed || (value !== 'high' && value !== 'low')) return false;
      quality = value;
      applyQuality();
      return true;
    },
    getState() {
      return { preset, lighting, quality };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      restoreMaterials();
      restoreLighting();
      if (ctx.sky.getTimeOverride() === timeOverride) {
        ctx.sky.clearTimeOverride();
        if (previousOverride) {
          ctx.sky.setTimeOverride({
            t: previousOverride.targetT,
            speed: previousOverride.speed,
            transitionSec: Math.max(0, previousOverride.transitionSec - previousOverride.elapsed),
          });
        } else {
          Object.assign(state.time, originalTime);
          ctx.sky.update(0);
        }
      }
      renderer.shadowMap.enabled = originalShadows;
      if (renderer.getPixelRatio() !== originalPixelRatio) renderer.setPixelRatio(originalPixelRatio);
    },
  };
}
