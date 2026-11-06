import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CHIMPHU_CHAPTER } from '../src/data/story/chapters/chimphu.js';
import { createChimphuScene } from '../src/story/world/chimphuScene.js';

test('custody papers appear before the verified bundle, which visibly leaves the table', async () => {
  const scene = await createChimphuScene({ colliders: [] });
  const lid = scene.group.getObjectByName('ChimphuRecordChestLid');
  const bundle = scene.group.getObjectByName('ChimphuSealedBundle');

  scene.restore('custody');
  assert.equal(Math.abs(lid.rotation.x), 0);
  assert.equal(scene.getSnapshot().recordsVisible, false);
  assert.equal(bundle.visible, false);

  scene.restore('records', { animate: true });
  scene.update(0.25);
  assert.ok(lid.rotation.x < -0.5);
  assert.equal(scene.getSnapshot().recordsVisible, true);
  assert.equal(bundle.visible, false);

  scene.restore('bundle', { animate: true });
  scene.update(0.55);
  assert.equal(bundle.visible, true);
  const tableHeight = bundle.position.y;
  scene.restore('cave', { animate: true });
  scene.update(0.3);
  assert.ok(bundle.position.y > tableHeight);
  assert.equal(bundle.visible, true);
  scene.update(0.4);
  assert.equal(bundle.visible, false);

  scene.restore('records');
  assert.equal(lid.rotation.x, -1.42);
  assert.equal(scene.getSnapshot().recordsVisible, true);
  assert.equal(bundle.visible, false);
  scene.restore('bundle', { reducedMotion: true });
  assert.equal(bundle.position.y, tableHeight);
  assert.equal(bundle.visible, true);
  scene.restore('road');
  assert.equal(scene.getSnapshot().recordsVisible, false);
  assert.equal(bundle.visible, false);
  scene.dispose();
});

test('abstract cave lights appear and disperse, and checkpoints restore either side of the vision', async () => {
  const scene = await createChimphuScene({ colliders: [] });
  const lights = scene.group.getObjectByName('ChimphuCaveLights');
  const positions = lights.geometry.getAttribute('position');
  scene.restore('cave');
  assert.equal(lights.visible, false);
  scene.restore('light', { animate: true });
  scene.update(0.9);
  assert.equal(lights.visible, true);
  const initialZ = positions.getZ(0);
  const initialOpacity = lights.material.opacity;
  scene.restore('diary', { animate: true });
  scene.update(0.5);
  assert.ok(positions.getZ(0) > initialZ);
  assert.ok(lights.material.opacity < initialOpacity);
  scene.update(0.7);
  assert.equal(lights.visible, false);
  scene.restore('light', { reducedMotion: true });
  const staticPositions = positions.array.slice();
  assert.equal(lights.visible, true);
  scene.update(1);
  assert.deepEqual(positions.array, staticPositions);
  scene.restore('diary', { animate: true, reducedMotion: true });
  assert.equal(lights.visible, false);
  scene.dispose();
});

test('the story map is isolated, all world approaches are clear, and scene resources are released once', async () => {
  const outside = { type: 'circle', x: 0, z: 0, r: 1, zone: 'stupa' };
  const ctx = {
    colliders: [outside],
    get bus() { throw new Error('Story uses the shared Adventure bus'); },
    get state() { throw new Error('Story uses shared state to run the native map'); },
    get interactables() { throw new Error('Story exposes Adventure interactions'); },
    get save() { throw new Error('Story accesses a save'); },
    get dungeon() { throw new Error('Story accesses the Adventure dungeon'); },
  };
  const scene = await createChimphuScene(ctx);
  assert.equal(scene.group.parent, null);
  assert.equal(scene.group.getObjectByName('TermaRealmStoneGate').visible, false);
  assert.deepEqual(CHIMPHU_CHAPTER.checkpoints.filter(({ presentation }) => presentation === 'card')
    .map(({ id }) => id), ['message', 'custody', 'records', 'bundle', 'diary']);
  for (const { id, signal, presentation } of CHIMPHU_CHAPTER.checkpoints) {
    const target = scene.getTarget(id);
    if (['message', 'records', 'diary'].includes(id) || !signal) {
      assert.equal(target, null);
      continue;
    }
    assert.ok(Number.isFinite(target.lookAt.y));
    for (const collider of ctx.colliders) {
      if (collider.type === 'circle') {
        assert.ok(Math.hypot(collider.x - target.x, collider.z - target.z) > collider.r + 0.4, id);
      }
      if (collider.type === 'box') {
        assert.ok(Math.abs(target.x - collider.x) > collider.hw + 0.4
          || Math.abs(target.z - collider.z) > collider.hd + 0.4, id);
      }
    }
  }
  const resources = new Set();
  scene.group.traverse(object => {
    assert.ok(!object.isPointLight);
    if (object.geometry) resources.add(object.geometry);
    if (object.material) resources.add(object.material);
  });
  let disposed = 0;
  for (const resource of resources) resource.addEventListener('dispose', () => { disposed++; });
  const parent = new THREE.Group();
  parent.add(scene.group);
  scene.dispose();
  scene.dispose();
  assert.equal(disposed, resources.size);
  assert.equal(parent.children.length, 0);
  assert.deepEqual(ctx.colliders, [outside]);
});

test('the Adventure gate still builds its plaque and opens the dungeon selector', async () => {
  const { buildChimphuMap } = await import('../src/world/maps/chimphu.js');
  const previousDocument = globalThis.document;
  const gradient = { addColorStop() {} };
  const canvas = {
    getContext: () => ({
      clearRect() {}, fillRect() {}, strokeRect() {}, fillText() {},
      createRadialGradient: () => gradient,
    }),
  };
  const events = [];
  let opened = 0;
  const ctx = {
    scene: new THREE.Group(),
    state: { zone: 'chimphu', uiOpen: false },
    bus: { emit: (...args) => events.push(args) },
    interactables: [],
    dungeon: { openTierSelect: () => { opened++; } },
  };
  globalThis.document = { createElement: () => canvas };
  try {
    const { group, disposables } = buildChimphuMap(ctx);
    assert.equal(group.getObjectByName('TermaRealmStoneGate').visible, true);
    assert.ok(disposables.some(resource => resource.isCanvasTexture && resource.image === canvas));
    const gate = ctx.interactables.find(({ id }) => id === 'chimphu-terma-gate');
    assert.equal(gate.isAvailable(), true);
    gate.onInteract();
    assert.deepEqual(events, [['sfx', { name: 'bell' }]]);
    assert.equal(opened, 1);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
