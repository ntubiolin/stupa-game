import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { MAPS } from '../src/data/maps.js';

function compile(material, template) {
  const shader = { vertexShader: template.vertexShader, uniforms: {} };
  material.onBeforeCompile(shader);
  return shader.uniforms;
}

for (const id of ['toji', 'koyasan']) {
  test(id + ' shares the active wind with branches, foliage, and their shadow passes', async () => {
    const state = { zone: id, elapsed: 0, time: { season: 'spring' }, wind: { strength: 0, dir: new THREE.Vector2(1, 0) } };
    const { createMap } = await MAPS[id].load();
    const map = createMap({ state, scene: new THREE.Scene(), colliders: [], interactables: [] });
    try {
      const meshes = [];
      map.group.traverse(mesh => {
        if (mesh.isInstancedMesh && / (trunks|foliage)$/.test(mesh.name)) meshes.push(mesh);
      });
      assert.ok(meshes.some(mesh => mesh.name.endsWith(' trunks')));
      assert.ok(meshes.some(mesh => mesh.name.endsWith(' foliage')));
      const uniforms = meshes.map(mesh => {
        const surface = compile(mesh.material, THREE.ShaderLib.lambert);
        if (mesh.castShadow) {
          for (const [material, template] of [[mesh.customDepthMaterial, THREE.ShaderLib.depth],
            [mesh.customDistanceMaterial, THREE.ShaderLib.distance]]) {
            const shadow = compile(material, template);
            assert.equal(shadow.treeWindTime, surface.treeWindTime);
            assert.equal(shadow.treeWindStrength, surface.treeWindStrength);
            assert.equal(shadow.treeWindDir, surface.treeWindDir);
            assert.equal(shadow.treeHeight.value, surface.treeHeight.value);
            assert.ok(map.disposables.includes(material));
          }
        }
        return surface;
      });
      const matrixVersions = meshes.map(mesh => mesh.instanceMatrix.version);
      for (const [time, strength, dx, dz] of [[2, 0, 1, 0], [17, 1.1, 0, -1]]) {
        Object.assign(state, { elapsed: time, wind: { strength, dir: new THREE.Vector2(dx, dz) } });
        map.update(1 / 60);
        for (const surface of uniforms) {
          assert.equal(surface.treeWindTime.value, time);
          assert.equal(surface.treeWindStrength.value, strength);
          assert.deepEqual(surface.treeWindDir.value.toArray(), [dx, dz]);
        }
      }
      assert.deepEqual(meshes.map(mesh => mesh.instanceMatrix.version), matrixVersions);
    } finally {
      map.dispose();
    }
  });
}
