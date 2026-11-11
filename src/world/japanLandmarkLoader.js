import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function collectResources(model, resources) {
  model.traverse(object => {
    if (!object.isMesh) return;
    resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material) continue;
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
}

/** Commit a complete landmark set together so failed requests never overlap its fallback. */
export function loadJapanLandmarks({ parent, fallback, specs, onReady, loader = new GLTFLoader() }) {
  let disposed = false;
  let failed = false;
  const resources = new Set();
  const models = [];
  function release() {
    for (const model of models) model.removeFromParent();
    for (const resource of resources) resource?.dispose?.();
    resources.clear();
    models.length = 0;
  }
  const ready = Promise.all(specs.map(async spec => {
    const { scene: model } = await loader.loadAsync(spec.url);
    if (disposed || failed) {
      const lateResources = new Set();
      collectResources(model, lateResources);
      for (const resource of lateResources) resource?.dispose?.();
      return null;
    }
    model.name = spec.name || spec.url.split('/').pop().replace('.glb', '');
    model.position.set(spec.x || 0, spec.y || 0, spec.z || 0);
    model.scale.setScalar(spec.scale ?? 1);
    model.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    collectResources(model, resources);
    models.push(model);
    return model;
  })).then(loaded => {
    if (disposed || failed) return false;
    onReady?.(loaded);
    parent.add(...loaded);
    fallback.visible = false;
    return true;
  }).catch(() => {
    failed = true;
    release();
    // Retain the complete procedural scene for offline/failed asset requests.
    return false;
  });
  return {
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      release();
    },
  };
}
