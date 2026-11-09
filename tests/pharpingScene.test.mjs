import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createPharpingScene } from '../src/story/world/pharpingScene.js';

test('Pharping moves separate obstructions and exposes moving water before restoring the spring', async () => {
  const scene = await createPharpingScene({ colliders: [] });
  const object = (name) => scene.group.getObjectByName(name);
  const names = ['SpringStoneA', 'SpringStoneB', 'ChannelDebrisA', 'ChannelDebrisB'];
  const before = names.map((name) => object(name).position.clone());
  const checkpoints = ['spring2', 'channel1', 'channel2', 'manuscript'];
  for (const [i, checkpoint] of checkpoints.entries()) {
    scene.restore(checkpoint, { animate: true });
    assert.deepEqual(object(names[i]).position, before[i]);
    scene.update(0.39);
    assert.ok(object(names[i]).position.distanceTo(before[i]) > 0.3);
    scene.update(0.42);
    assert.ok(object(names[i]).position.distanceTo(before[i]) > 1.4);
    for (let j = i + 1; j < names.length; j++) {
      assert.deepEqual(object(names[j]).position, before[j]);
    }
    assert.equal(object('UncoveredSeep').visible, i >= 2);
    assert.equal(object('UncoveredChannel').visible, i >= 3);
    assert.equal(object('RestoredSpringFlow').visible, false);
  }

  const ripples = object('ChannelSurfaceRipples').geometry.attributes.position;
  const x = ripples.getX(0);
  scene.update(0.2);
  assert.notEqual(ripples.getX(0), x);
  scene.restore('manuscript', { reducedMotion: true });
  const staticX = ripples.getX(0);
  scene.update(0.2);
  assert.equal(ripples.getX(0), staticX);
  scene.dispose();
});

test('Pharping restores manuscript, shadow and rain independently of replay history', async () => {
  const scene = await createPharpingScene({ colliders: [] });
  const object = (name) => scene.group.getObjectByName(name);
  const terrain = () => object('PharpingMap').children[0].geometry.attributes.color;
  const dryColors = terrain().array.slice();
  scene.restore('manuscript');
  assert.equal(object('WrappedManuscript').visible, true);
  assert.equal(object('WrappedManuscript').position.x, 2028);
  scene.restore('cave', { animate: true });
  scene.update(0.5);
  assert.equal(object('WrappedManuscript').visible, false);
  scene.restore('shadow', { animate: true });
  assert.equal(object('WrappedManuscript').visible, true);
  assert.equal(object('WrappedManuscript').position.x, 2020);
  assert.equal(object('WellShadow').visible, true);
  scene.restore('release');
  scene.restore('rain', { animate: true });
  scene.update(0.75);
  assert.equal(object('ShadowDust').visible, true);
  assert.equal(scene.getSnapshot().raining, false);
  scene.update(1);
  assert.equal(object('WellShadow').visible, false);
  assert.equal(object('ValleyRainStreaks').visible, true);
  assert.equal(object('RestoredSpringFlow').visible, true);
  assert.notDeepEqual(terrain().array, dryColors);

  scene.restore('spring1');
  assert.equal(object('ValleyRainStreaks').visible, false);
  assert.equal(object('RestoredSpringFlow').visible, false);
  assert.equal(object('WrappedManuscript').position.x, 2028);
  assert.deepEqual(terrain().array, dryColors);
  scene.restore('rain', { reducedMotion: true });
  assert.equal(object('ValleyRainStreaks').visible, true);
  assert.notDeepEqual(terrain().array, dryColors);
  const rain = object('ValleyRainStreaks').geometry.attributes.position.array.slice();
  scene.update(2);
  assert.deepEqual(object('ValleyRainStreaks').geometry.attributes.position.array, rain);
  scene.dispose();
});

test('Pharping approach points are walkable and disposal only removes owned scene resources', async () => {
  const retained = { type: 'circle', x: 0, z: 0, r: 2, zone: 'stupa' };
  const ctx = { colliders: [retained], zoneGroups: { pharping: new THREE.Group() }, interactables: [] };
  const scene = await createPharpingScene(ctx);
  const world = new THREE.Scene();
  assert.equal(scene.group.parent, null);
  world.add(scene.group);
  assert.equal(ctx.zoneGroups.pharping.children.length, 0);
  assert.deepEqual(ctx.interactables, []);
  const checkpoints = ['spring1', 'spring2', 'channel1', 'channel2', 'manuscript',
    'cave', 'shadow', 'release', 'rain', 'settle', 'wait', 'lamp'];
  for (const checkpoint of checkpoints) {
    scene.restore(checkpoint);
    const { x, z, lookAt } = scene.getTarget(checkpoint);
    assert.ok(Number.isFinite(lookAt.y));
    for (const collider of ctx.colliders) {
      assert.ok(Math.hypot(collider.x - x, collider.z - z) > collider.r + 0.4, checkpoint);
    }
  }
  assert.equal(scene.getTarget('diary'), null);
  assert.equal(scene.getTarget('complete'), null);
  assert.equal(scene.getTarget('constructor'), null);
  const resources = new Set();
  scene.group.traverse((object) => {
    assert.equal(Boolean(object.isPointLight), false);
    if (object.geometry) resources.add(object.geometry);
    if (object.material) resources.add(object.material);
  });
  let disposed = 0;
  for (const resource of resources) resource.addEventListener('dispose', () => { disposed++; });
  scene.dispose();
  scene.dispose();
  assert.equal(disposed, resources.size);
  assert.equal(scene.group.parent, null);
  assert.deepEqual(ctx.colliders, [retained]);
});


test('Pharping water observation and lamp lighting restore across checkpoints and replay', async t => {
  const scene = await createPharpingScene({ colliders: [] });
  t.after(() => scene.dispose());
  const seep = scene.group.getObjectByName('UncoveredSeep');
  scene.restore('settle');
  assert.equal(seep.visible, true);
  assert.equal(seep.material.color.getHex(), 0x8b7250);
  assert.equal(scene.getSnapshot().waterSettled, false);
  scene.restore('wait');
  assert.equal(seep.material.color.getHex(), 0x8b7250);
  assert.equal(scene.getSnapshot().waterSettled, false);
  scene.restore('manuscript');
  assert.equal(seep.material.color.getHex(), 0x49847e);
  assert.equal(scene.getSnapshot().waterSettled, true);
  scene.restore('lamp');
  assert.equal(scene.getSnapshot().lampLit, false);
  scene.restore('phone', { reducedMotion: true });
  assert.equal(scene.getSnapshot().lampLit, true);
  scene.restore('diary');
  assert.equal(scene.getSnapshot().lampLit, true);
  scene.restore('lamp');
  assert.equal(scene.getSnapshot().lampLit, false);
  scene.restore('backup');
  assert.equal(scene.getSnapshot().raining, false);
  assert.equal(scene.getSnapshot().waterSettled, false);
  assert.equal(scene.getSnapshot().lampLit, false);
});

test('Pharping renders 3D drought monsters and Drought Lord that pacify across checkpoints', async (t) => {
  const scene = await createPharpingScene({ colliders: [] });
  t.after(() => scene.dispose());
  const object = (name) => scene.group.getObjectByName(name);

  const monsters = object('StoryPharpingMonsters');
  const sprite = object('StoryDroughtSprite');
  const devil = object('StoryDustDevil');
  const preta = object('StoryThirstyPreta');
  const lord = object('StoryDroughtLord');
  const practitioner = object('StoryPharpingPractitioner');
  assert.ok(monsters && sprite && devil && preta && lord && practitioner);
  assert.equal(scene.practitioner?.id, 'story:pharping:practitioner');
  assert.equal(scene.practitioner?.x, 2021.8);
  assert.equal(scene.practitioner?.z, -44.2);
  assert.equal(scene.practitioner?.radius, 3.5);

  scene.restore('spring1');
  assert.equal(sprite.scale.x, 1);
  assert.equal(devil.scale.x, 1);
  const initialPractitionerScaleY = practitioner.scale.y;
  scene.update(0.35);
  assert.notEqual(practitioner.scale.y, initialPractitionerScaleY);

  // Clearing spring stones pacifies the spring drought sprite
  scene.restore('channel1');
  assert.ok(sprite.scale.x < 0.7);
  assert.equal(devil.scale.x, 1);

  // Clearing channel debris subsides the dust devil
  scene.restore('manuscript');
  assert.ok(devil.scale.x < 0.5);

  // At shadow, Drought Lord looms larger from the dry well
  scene.restore('shadow');
  assert.ok(lord.scale.x > 0.7);
  const shadowY = lord.position.y;

  // At release and rain, Drought Lord and spirits bow in pacified subjugation
  scene.restore('release');
  assert.ok(lord.scale.x < 0.7);
  assert.ok(lord.position.y < shadowY);

  scene.restore('rain');
  assert.ok(lord.scale.x < 0.5);
});
