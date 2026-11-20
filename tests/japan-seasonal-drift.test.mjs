import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { addSeasonalDrift } from '../src/world/japanSeasonalDrift.js';
import { MAPS } from '../src/data/maps.js';

function makeDrift(windX = 0, strength = 0, lowSpec = false) {
  const root = new THREE.Group();
  root.position.set(7500, 0, 15);
  const crown = (x, z) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 4, 0], 3));
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), 1);
    mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(x, 0, z));
    const batch = new THREE.Group();
    batch.position.z = 1;
    batch.add(mesh);
    root.add(batch);
    return { crownMeshes: [mesh] };
  };
  const disposables = [];
  const drift = addSeasonalDrift(root, {
    cherries: crown(3, 0), maples: crown(-7, 0),
    groundHeight: () => 0.2, lowSpec, seed: 2026, disposables,
  });
  const wind = { dir: new THREE.Vector2(windX, 0), strength };
  const mesh = root.getObjectByName('Seasonal canopy drift');
  return {
    mesh, disposables,
    step: (season = 'spring', x = 0, z = 0, dt = 1 / 30) => drift.update(dt, season, wind, x, z),
    point(i = 0) {
      const matrix = new THREE.Matrix4();
      mesh.getMatrixAt(i, matrix);
      return new THREE.Vector3().setFromMatrixPosition(matrix);
    },
  };
}

test('Season switches change silhouette and release only from the matching transformed crown', () => {
  const drift = makeDrift();
  drift.step('spring', 0, 0, 0);
  const blossom = drift.mesh.geometry;
  assert.equal(drift.mesh.count, 2);
  assert.deepEqual(drift.point().toArray(), [3, 4, 1]);
  drift.step('autumn', 0, 0, 0);
  assert.deepEqual(drift.point().toArray(), [-7, 4, 1]);
  assert.ok(drift.mesh.geometry.attributes.position.count > blossom.attributes.position.count);
  for (const season of ['summer', 'winter']) {
    drift.step(season);
    assert.equal(drift.mesh.count, 0);
    assert.equal(drift.mesh.visible, false);
  }
  drift.step('spring', 300, 300);
  assert.equal(drift.mesh.count, 0);
  assert.ok(drift.disposables.includes(blossom) && drift.disposables.includes(drift.mesh.material));
});

test('Gusts increase shedding and displacement, fallen leaves rest at terrain height, and mobile stays bounded', () => {
  const calm = makeDrift();
  const gust = makeDrift(1, 1, true);
  const reversed = makeDrift(-1, 1, true);
  for (let i = 0; i < 30; i++) {
    for (const drift of [calm, gust, reversed]) drift.step('autumn');
  }
  assert.ok(gust.mesh.count > calm.mesh.count);
  assert.ok(gust.point().x > reversed.point().x + 1.5);
  let resting = false;
  for (let i = 0; i < 450; i++) {
    gust.step('autumn');
    assert.ok(gust.mesh.count <= 36);
    for (let j = 0; j < gust.mesh.count; j++) {
      const { y } = gust.point(j);
      assert.ok(y >= 0.22);
      if (Math.abs(y - 0.224) < 1e-5) resting = true;
    }
  }
  assert.ok(resting);
  gust.step('autumn', 1500, 0);
  assert.equal(gust.mesh.count, 0);
});

test('Japan map updates use world player coordinates and retain Tō-ji summer motes and winter snow', async () => {
  for (const [id, x, z, mapleX, mapleZ] of [['toji', 24, 6, 22, 32], ['koyasan', -64, 24, -74, 18]]) {
    const { origin } = MAPS[id];
    const state = { zone: id, elapsed: 0, time: { season: 'spring' },
      player: { position: new THREE.Vector3(origin.x + x, 0, origin.z + z) } };
    const ctx = { scene: new THREE.Group(), state, lowSpec: true, colliders: [], interactables: [] };
    const { createMap } = await MAPS[id].load();
    const map = createMap(ctx);
    const drift = map.group.getObjectByName('Seasonal canopy drift');
    map.update(1 / 60);
    assert.ok(drift.count > 0, id + ' emits spring petals near the player');
    state.player.position.set(origin.x + mapleX, 0, origin.z + mapleZ);
    state.time.season = 'autumn';
    map.update(1 / 60);
    assert.ok(drift.count > 0, id + ' emits maple leaves');
    for (const season of ['summer', 'winter']) {
      state.time.season = season;
      map.update(1 / 60);
      assert.equal(drift.visible, false);
      if (id === 'toji') {
        const ambient = map.group.getObjectByName('TojiSeasonalParticlesInstanced');
        assert.equal(ambient.visible, true);
        assert.equal(ambient.count, 48);
      }
    }
    map.dispose();
  }
});
