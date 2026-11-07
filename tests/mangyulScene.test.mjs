import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createBus } from '../src/core/events.js';
import { MANGYUL_CHAPTER } from '../src/data/story/chapters/mangyul.js';
import { i18n } from '../src/i18n.js';
import '../src/i18n/storyMangyul.js';
import { createMangyulScene } from '../src/story/world/mangyulScene.js';
import { createMangyulMap } from '../src/world/maps/mangyul.js';

test('the chapter uses a complete bilingual route and existing sacred-site identifiers', t => {
  const originalLanguage = i18n.lang;
  t.after(() => i18n.setLang(originalLanguage));
  assert.equal(MANGYUL_CHAPTER.previousId, 'pharping');
  assert.equal(MANGYUL_CHAPTER.checkpoints.filter(step => step.signal === 'altar:observe').length, 12);
  assert.equal(MANGYUL_CHAPTER.checkpoints.at(-2).signal, 'diary:read');
  assert.equal(MANGYUL_CHAPTER.checkpoints.at(-1).signal, null);
  assert.deepEqual(MANGYUL_CHAPTER.siteIds, ['mangyul', 'twelveTenma', 'windhorse', 'latse']);

  const prefix = 'mirror.chapter.mangyul.';
  const keys = ['title', 'summary', 'intro', 'diary.finish'];
  for (const { id, signal } of MANGYUL_CHAPTER.checkpoints) {
    if (signal) keys.push(...['title', 'body', 'action'].map(field => `${id}.${field}`));
  }
  for (const language of ['zh', 'en']) {
    i18n.setLang(language);
    for (const key of keys) assert.notEqual(i18n.t(prefix + key), prefix + key);
  }
  assert.match(i18n.t(prefix + 'altar1.body'), /lose his job/);
  assert.match(i18n.t(prefix + 'altar2.body'), /replace humanity/);
  assert.match(i18n.t(prefix + 'altar3.body'), /world is leaving him behind/);
  assert.match(i18n.t(prefix + 'altar4.body'), /sleet/);
  assert.match(i18n.t(prefix + 'altar12.body'), /Twelve figures/);
  assert.deepEqual(MANGYUL_CHAPTER.checkpoints.find(step => step.id === 'answer').choices, ['yes']);
  for (const language of ['zh', 'en']) {
    i18n.setLang(language);
    for (const key of keys) assert.doesNotMatch(i18n.t(prefix + key), /原作小說對話節選|原作情節改編|場景改編|Scene adaptation|Selected dialogue adapted/);
  }
  i18n.setLang('zh');
  for (const [id, question] of [
    ['question1', '你為什麼還在走？'],
    ['question2', '你以為走到終點，就能找回失去的人嗎？'],
    ['question3', '如果那只是機器呢？'],
    ['answer', '如果她已經不在了，你還會繼續走嗎？'],
  ]) assert.ok(i18n.t(prefix + id + '.body').includes(question));
});

test('all Mangyul action targets have a walkable route on terrain and no new lights', async t => {
  const unrelated = { zone: 'stupa' };
  const ctx = { colliders: [unrelated], state: { player: { position: new THREE.Vector3() } } };
  const scene = await createMangyulScene(ctx);
  t.after(() => scene.dispose());
  assert.equal(scene.group.parent, null);
  scene.group.traverse(object => assert.equal(Boolean(object.isPointLight), false));
  const routes = MANGYUL_CHAPTER.checkpoints.filter(step => step.presentation === 'action');
  let previous = { x: 3000, z: 43 };
  for (const { id } of routes) {
    const target = scene.getTarget(id);
    assert.ok(target, id);
    assert.ok(Number.isFinite(scene.getHeight(target.x, target.z)), id);
    assert.ok(Math.hypot(target.x - target.lookAt.x, target.z - target.lookAt.z) < 3, id);
    for (let sample = 0; sample <= 80; sample++) {
      const x = THREE.MathUtils.lerp(previous.x, target.x, sample / 80);
      const z = THREE.MathUtils.lerp(previous.z, target.z, sample / 80);
      for (const collider of ctx.colliders) {
        if (collider.zone !== 'mangyul') continue;
        if (collider.type === 'circle') assert.ok(Math.hypot(x - collider.x, z - collider.z) >= collider.r + 0.35, id);
        if (collider.type === 'box') {
          const nearX = THREE.MathUtils.clamp(x, collider.minX, collider.maxX);
          const nearZ = THREE.MathUtils.clamp(z, collider.minZ, collider.maxZ);
          assert.ok(Math.hypot(x - nearX, z - nearZ) >= 0.35, id);
        }
      }
    }
    previous = target;
  }
  for (const id of ['message', 'answer', 'diary', 'complete', 'toString']) assert.equal(scene.getTarget(id), null);
  const target = scene.getTarget('altar1');
  target.lookAt.x = -1000;
  assert.ok(scene.getTarget('altar1').lookAt.x > 0);
  scene.dispose();
  scene.dispose();
  assert.deepEqual(ctx.colliders, [unrelated]);
  assert.equal(scene.group.children.length, 0);
});

test('visual restoration is reversible and animates a tied flag and falling storm', async t => {
  const scene = await createMangyulScene({ colliders: [] });
  t.after(() => scene.dispose());
  const flagLine = scene.group.getObjectByName('StoryMangyulPrayerFlagLine');
  const cloth = flagLine.children.filter(object => object.geometry.type === 'PlaneGeometry');
  const root = scene.group.getObjectByName('MangyulLocalRoot');
  const firstAltar = root.children.find(object => object.isGroup && object.position.x === -12 && object.position.z === 34);
  const altarFlag = firstAltar.children.find(object => object.geometry.type === 'PlaneGeometry');
  const snow = root.children.find(object => object.isPoints);
  for (let index = 1; index <= 12; index++) {
    scene.restore(`altar${index}`);
    assert.equal(scene.getSnapshot().altarsObserved, index - 1);
  }
  assert.equal(altarFlag.material.color.getHex(), 0x2563eb);
  for (const id of ['question1', 'question2', 'question3', 'answer']) {
    scene.restore(id);
    assert.equal(scene.getSnapshot().storm, true, `${id} must retain the storm until the final answer`);
  }
  scene.restore('flags', { animate: true });
  assert.deepEqual(scene.getSnapshot(), { checkpointId: 'flags', altarsObserved: 12, flagsTied: false, storm: true });
  scene.update(0.5);
  assert.ok(snow.material.opacity > 0 && snow.material.opacity < 0.92);
  scene.update(0.4);
  assert.equal(snow.visible, false, 'the accepted answer calms the snow before flag tying');
  assert.equal(cloth.filter(object => object.visible).length, 1);

  scene.restore('clearing', { animate: true });
  const foldedScale = cloth[0].scale.y;
  scene.update(0.5);
  assert.ok(cloth[0].scale.y > foldedScale);
  assert.ok(snow.material.opacity < 0.92);
  scene.update(0.4);
  assert.equal(snow.visible, false);
  assert.equal(cloth.filter(object => object.visible).length, 5);
  assert.equal(cloth[0].scale.y, 1);
  scene.restore('diary', { animate: true });
  assert.equal(snow.visible, false, 'snow must not flash back between clearing and the diary');

  scene.restore('altar1');
  assert.equal(scene.getSnapshot().altarsObserved, 0);
  assert.equal(altarFlag.material.color.getHex(), 0x8b8e92);
  assert.equal(cloth.filter(object => object.visible).length, 1);
  assert.equal(snow.visible, true);
  scene.restore('answer', { reducedMotion: true });
  assert.equal(snow.visible, true);
  scene.restore('flags', { animate: true, reducedMotion: true });
  assert.equal(snow.visible, false);
  assert.equal(cloth.filter(object => object.visible).length, 1);
  scene.restore('clearing', { animate: true, reducedMotion: true });
  assert.equal(cloth[0].scale.y, 1);
  assert.equal(snow.visible, false);
});

test('story map installs no browser bindings while default adventure still does', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events = [];
  const debug = { tenma: { placeholder: true } };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      __stupa: debug,
      addEventListener: (...args) => events.push(['add', ...args]),
      removeEventListener: (...args) => events.push(['remove', ...args]),
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else delete globalThis.window;
  });

  const scene = await createMangyulScene({ colliders: [] });
  scene.dispose();
  assert.deepEqual(events, []);
  assert.deepEqual(debug.tenma, { placeholder: true });

  const ctx = { scene: new THREE.Group(), state: {}, bus: createBus() };
  const map = createMangyulMap(ctx);
  assert.equal(ctx.tenma, map.tenma);
  assert.equal(debug.tenma, map.tenma);
  assert.equal(events[0][0], 'add');
  assert.equal(events[0][1], 'keydown');
  map.dispose();
  assert.deepEqual(events[1], ['remove', 'keydown', events[0][2]]);
});
