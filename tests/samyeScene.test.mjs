import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CH4_CODEX_ENTRIES } from '../src/data/codex/ch4.js';
import { SAMYE_CHAPTER } from '../src/data/story/chapters/samye.js';
import { i18n } from '../src/i18n.js';
import { createSamyeScene } from '../src/story/world/samyeScene.js';
import { createMap } from '../src/world/maps/samye.js';

test('Samye animates the placed stone, raised beam, night collapse and rebuild', async () => {
  const scene = await createSamyeScene({ colliders: [] });
  const object = name => scene.group.getObjectByName(name);
  const stone = object('SamyeWorksiteStone');
  const timber = object('SamyeWorksiteTimber');
  const structure = object('Samye_Monastery_Mandala');
  const wall = object('Samye_PerimeterWall');
  const sky = object('SamyeNightSky');
  const dust = object('SamyeCollapseDust');
  const stock = stone.position.clone();
  const stackedBeam = timber.position.clone();
  assert.equal(wall.visible, false);

  scene.restore('wood', { animate: true });
  assert.equal(wall.visible, true);
  assert.deepEqual(stone.position, stock);
  scene.update(0.6);
  assert.ok(stone.position.distanceTo(stock) > 1);
  scene.update(1);
  const laid = stone.position.clone();
  assert.deepEqual(timber.position, stackedBeam);

  scene.restore('night', { animate: true });
  scene.update(0.65);
  assert.ok(timber.position.distanceTo(stackedBeam) > 1);
  scene.update(1);
  const raised = timber.position.clone();
  assert.equal(scene.getSnapshot().stage, 2);
  assert.equal(sky.visible, false);

  scene.restore('rebuild', { animate: true });
  scene.update(0.6);
  assert.ok(structure.scale.y < 0.6);
  assert.ok(sky.material.opacity > 0 && sky.material.opacity < 1);
  assert.equal(dust.visible, true);
  scene.update(1);
  assert.equal(wall.visible, false);
  assert.notDeepEqual(stone.position, laid);
  assert.notDeepEqual(timber.position, raised);
  assert.equal(sky.material.opacity, 1);
  assert.equal(dust.visible, false);

  scene.restore('hepori', { animate: true });
  scene.update(0.6);
  assert.equal(wall.visible, true);
  assert.ok(sky.material.opacity > 0 && sky.material.opacity < 1);
  scene.update(1);
  assert.equal(scene.getSnapshot().stage, 3);
  assert.equal(sky.visible, false);
  assert.deepEqual(stone.position, laid);
  assert.deepEqual(timber.position, raised);
  scene.dispose();
});

test('Samye restores each checkpoint directly and in replay, including reduced motion', async () => {
  const first = await createSamyeScene({ colliders: [] });
  const second = await createSamyeScene({ colliders: [] });
  const states = [0, 1, 2, 0, 3, 3, 3, 3];

  function visibleState(scene) {
    const object = name => scene.group.getObjectByName(name);
    const timber = object('SamyeWorksiteTimber');
    return {
      ...scene.getSnapshot(),
      timber: timber.position.toArray(),
      timberColor: timber.material.color.getHex(),
      stone: object('SamyeWorksiteStone').position.toArray(),
      sky: object('SamyeNightSky').visible,
      wall: object('Samye_PerimeterWall').visible,
    };
  }

  for (const [index, { id }] of SAMYE_CHAPTER.checkpoints.entries()) {
    first.restore(id, { animate: true, reducedMotion: true });
    second.restore('complete');
    second.restore(id);
    const expected = visibleState(second);
    assert.equal(expected.stage, states[index]);
    assert.deepEqual(visibleState(first), expected);
    first.update(10);
    assert.deepEqual(visibleState(first), expected);
  }
  first.restore('stone');
  assert.equal(first.getSnapshot().stage, 0);
  assert.equal(first.group.getObjectByName('SamyeNightSky').visible, false);
  first.dispose();
  second.dispose();
});

test('Samye only installs owned colliders and disposes detached scene resources', async () => {
  const retained = { type: 'circle', zone: 'samye', x: 5200, z: 150, r: 3 };
  const adventure = new THREE.Group();
  const ctx = { colliders: [retained], zoneGroups: { samye: adventure }, interactables: [] };
  for (const key of ['save', 'samye', 'hepori', 'coop', 'bus', 'quests', 'codex', 'debug', 'enemies', 'state']) {
    Object.defineProperty(ctx, key, {
      get() { assert.fail(`story read adventure ${key}`); },
      set() { assert.fail(`story assigned adventure ${key}`); },
    });
  }
  const scene = await createSamyeScene(ctx);
  const parent = new THREE.Scene();
  assert.equal(scene.group.parent, null);
  parent.add(scene.group);
  assert.equal(adventure.children.length, 0);
  assert.deepEqual(ctx.interactables, []);
  assert.ok(ctx.colliders.length > 1);

  for (const { id } of SAMYE_CHAPTER.checkpoints.slice(0, -2)) {
    const { x, z, lookAt } = scene.getTarget(id);
    assert.ok(Number.isFinite(scene.getHeight(x, z)));
    assert.ok(Number.isFinite(lookAt.y));
    for (const collider of ctx.colliders) {
      if (collider.type === 'circle') {
        assert.ok(Math.hypot(x - collider.x, z - collider.z) > collider.r + 0.4, id);
      } else {
        const cx = THREE.MathUtils.clamp(x, collider.minX, collider.maxX);
        const cz = THREE.MathUtils.clamp(z, collider.minZ, collider.maxZ);
        assert.ok(Math.hypot(x - cx, z - cz) > 0.4, id);
      }
    }
  }
  assert.equal(scene.getTarget('diary'), null);
  assert.equal(scene.getTarget('complete'), null);
  assert.equal(scene.getTarget('constructor'), null);

  const counts = new Map();
  scene.group.traverse(object => {
    assert.ok(!object.isPointLight);
    for (const resource of [object.geometry, object.material, object.isInstancedMesh && object]) {
      if (!resource || counts.has(resource)) continue;
      counts.set(resource, 0);
      resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
    }
  });
  assert.ok(counts.size > 0);
  scene.dispose();
  scene.dispose();
  assert.equal(parent.children.length, 0);
  assert.deepEqual(ctx.colliders, [retained]);
  assert.ok([...counts.values()].every(count => count === 1));
});

test('Samye presentation opt-in skips hooks while default adventure still registers', () => {
  const calls = [];
  const ctx = {
    colliders: [],
    interactables: [],
    bus: { on: event => calls.push(['on', event]), emit: event => calls.push(['emit', event]) },
    state: { zone: 'samye', player: { position: new THREE.Vector3() } },
    save: { get: () => ({ stage: 2 }), set: (key, value) => calls.push(['save', key, value.stage]) },
  };
  const presentation = createMap(ctx, undefined, { presentationOnly: true });
  presentation.setStage(3);
  assert.deepEqual(calls, []);
  assert.equal(ctx.interactables.length, 0);
  assert.equal(ctx.samye, undefined);
  assert.equal(ctx.hepori, undefined);

  const adventure = createMap(ctx);
  assert.equal(ctx.samye, adventure.samye);
  assert.equal(ctx.hepori, adventure.hepori);
  assert.equal(adventure.samye.getStage(), 2);
  assert.ok(ctx.interactables.some(({ kind }) => kind === 'samyeResource'));
  assert.ok(calls.some(([type, event]) => type === 'on' && event === 'quest:start'));
  assert.ok(calls.some(([type, key, stage]) => type === 'save' && key === 'samye' && stage === 2));
  adventure.dispose();
});

test('Samye checkpoint labels are bilingual and sacred-site IDs reference original records', () => {
  const { zh, en } = i18n.getStrings();
  for (const key of ['title', 'intro', ...SAMYE_CHAPTER.checkpoints.flatMap(({ id }) =>
    ['title', 'action', 'body'].map(field => `${id}.${field}`))]) {
    const full = `mirror.chapter.samye.${key}`;
    assert.ok(zh[full] && en[full], full);
  }
  for (const id of SAMYE_CHAPTER.siteIds) {
    assert.ok(CH4_CODEX_ENTRIES.some(record => record.id === id));
  }
});
