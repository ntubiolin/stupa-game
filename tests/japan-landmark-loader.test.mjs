import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadJapanLandmarks } from '../src/world/japanLandmarkLoader.js';

function fixture() {
  const parent = new THREE.Group();
  const fallback = new THREE.Group();
  const pending = [];
  const loader = { loadAsync() { return new Promise((resolve, reject) => pending.push({ resolve, reject })); } };
  const loaded = loadJapanLandmarks({ parent, fallback, loader, specs: [{ url: 'first.glb' }, { url: 'second.glb' }] });
  return { parent, fallback, pending, loaded };
}
function model() {
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const disposals = { geometry: 0, material: 0, texture: 0 };
  for (const [key, resource] of Object.entries({ geometry, material, texture })) resource.addEventListener('dispose', () => disposals[key]++);
  scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  return { scene, disposals };
}

test('all models replace the fallback atomically and share disposal ownership', async () => {
  const f = fixture(); const a = model(); const b = model();
  f.pending[0].resolve(a); await Promise.resolve();
  assert.equal(f.parent.children.length, 0); assert.equal(f.fallback.visible, true);
  f.pending[1].resolve(b); assert.equal(await f.loaded.ready, true);
  assert.equal(f.parent.children.length, 2); assert.equal(f.fallback.visible, false);
  f.loaded.dispose(); f.loaded.dispose();
  assert.deepEqual(a.disposals, { geometry: 1, material: 1, texture: 1 });
  assert.deepEqual(b.disposals, a.disposals);
  assert.equal(f.parent.children.length, 0);
});

test('partial failure leaves complete fallback and releases early and late responses', async () => {
  const f = fixture(); const late = model();
  f.pending[0].reject(new Error('offline')); assert.equal(await f.loaded.ready, false);
  f.pending[1].resolve(late); await Promise.resolve();
  assert.equal(f.fallback.visible, true); assert.equal(f.parent.children.length, 0);
  assert.deepEqual(late.disposals, { geometry: 1, material: 1, texture: 1 });
  const g = fixture(); const early = model();
  g.pending[0].resolve(early); await Promise.resolve();
  g.pending[1].reject(new Error('404')); assert.equal(await g.loaded.ready, false);
  assert.deepEqual(early.disposals, { geometry: 1, material: 1, texture: 1 });
});

test('disposing while loading cannot attach or leak a late model', async () => {
  const f = fixture(); const a = model(); const b = model();
  f.loaded.dispose(); f.pending[0].resolve(a); f.pending[1].resolve(b);
  assert.equal(await f.loaded.ready, false); assert.equal(f.parent.children.length, 0);
  assert.deepEqual(a.disposals, { geometry: 1, material: 1, texture: 1 });
  assert.deepEqual(b.disposals, a.disposals);
});
