import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { YARLUNG_CHAPTER } from '../src/data/story/chapters/yarlung.js';
import { createYarlungScene } from '../src/story/world/yarlungScene.js';
import { createMap } from '../src/world/maps/yarlung.js';

test('Yarlung shows the two separate stone removals and distinct pause and release', async () => {
  const scene = await createYarlungScene({ colliders: [] });
  const object = (name) => scene.group.getObjectByName(name);
  const first = object('YakLooseStoneA');
  const second = object('YakLooseStoneB');
  const head = object('WhiteYakHead');
  const yak = object('StoryWhiteYak');
  const firstStart = first.position.clone();
  const secondStart = second.position.clone();

  scene.restore('stone1');
  const calmAngle = head.rotation.x;
  scene.restore('pause', { animate: true });
  assert.deepEqual(first.position, firstStart);
  scene.update(0.4);
  assert.ok(first.position.distanceTo(firstStart) > 0.6);
  assert.deepEqual(second.position, secondStart);
  scene.update(0.5);
  assert.ok(head.rotation.x < calmAngle - 0.2);

  scene.restore('stone2', { animate: true });
  scene.update(1);
  assert.ok(head.rotation.x > calmAngle);
  assert.deepEqual(second.position, secondStart);
  scene.restore('release', { animate: true });
  scene.update(0.4);
  assert.ok(second.position.distanceTo(secondStart) > 0.65);
  assert.equal(Math.abs(yak.position.z), 0);
  scene.restore('guardian', { animate: true });
  scene.update(1);
  assert.ok(yak.position.z < -0.4);
  assert.ok(head.rotation.x > 0.5);

  scene.restore('memory', { animate: true });
  assert.equal(object('YarlungGuardianVision').visible, false);
  scene.update(0.4);
  assert.equal(object('YarlungGuardianVision').visible, true);
  scene.update(1);
  assert.equal(yak.visible, false);
  scene.restore('observe', { reducedMotion: true });
  assert.equal(yak.visible, true);
  assert.equal(Math.abs(yak.position.z), 0);
  assert.equal(object('YarlungGuardianVision').visible, false);
  assert.deepEqual(first.position, firstStart);
  assert.deepEqual(second.position, secondStart);
  const staticAngle = head.rotation.x;
  scene.update(1);
  assert.equal(head.rotation.x, staticAngle);
  scene.restore('memory', { animate: true, reducedMotion: true });
  assert.equal(yak.visible, false);
  assert.equal(object('YarlungGuardianVision').visible, true);
  scene.dispose();
});

test('Yarlung approaches stay walkable, and the story instance never publishes Adventure actions', async () => {
  const oldWindow = globalThis.window;
  const retainedCollider = { type: 'circle', x: 0, z: 0, r: 2, zone: 'stupa' };
  const adventure = { scene: new THREE.Group(), colliders: [], interactables: [] };
  globalThis.window = { __stupa: {} };
  try {
    createMap(adventure);
    const sheldrak = window.__stupa.sheldrak;
    assert.equal(sheldrak, adventure.sheldrak);
    assert.equal(adventure.interactables.length, 4);
    const story = {
      zoneGroups: { yarlung: new THREE.Group() },
      colliders: [retainedCollider],
      get quests() { throw new Error('Story reads Adventure quests'); },
      get save() { throw new Error('Story accesses a save'); },
      get interactables() { throw new Error('Story exposes Adventure interactions'); },
    };
    const scene = await createYarlungScene(story);
    assert.equal(window.__stupa.sheldrak, sheldrak);
    assert.equal(scene.group.parent, null);
    assert.equal(story.zoneGroups.yarlung.children.length, 0);
    assert.deepEqual(YARLUNG_CHAPTER.checkpoints.filter(({ presentation }) => presentation === 'card')
      .map(({ id }) => id), ['calm', 'guardian', 'memory', 'boundary', 'diary']);
    for (const { id, presentation, signal } of YARLUNG_CHAPTER.checkpoints) {
      scene.restore(id);
      const target = scene.getTarget(id);
      if (['memory', 'boundary', 'diary'].includes(id) || !signal) {
        assert.equal(target, null);
        continue;
      }
      assert.ok(Number.isFinite(target.lookAt.y));
      for (const collider of story.colliders) {
        if (collider.type === 'circle') {
          assert.ok(Math.hypot(collider.x - target.x, collider.z - target.z) > collider.r + 0.4, id);
        }
      }
    }
    const resources = new Set();
    scene.group.traverse((object) => {
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
    assert.deepEqual(story.colliders, [retainedCollider]);
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
  }
});
