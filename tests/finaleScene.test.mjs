import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { FINALE_CHAPTER } from '../src/data/story/chapters/finale.js';
import { CH5_CODEX } from '../src/data/codex/ch5.js';
import { i18n } from '../src/i18n.js';
import { createFinaleScene } from '../src/story/world/finaleScene.js';

test('the tablet travels from the custody record into the chapel niche, and the single lamp is lit', async () => {
  const scene = await createFinaleScene({ colliders: [] });
  const object = name => scene.group.getObjectByName(name);
  const chapel = object('FinaleCustodyChapel');
  const niche = object('FinaleStoneNiche');
  const tablet = object('FinaleTablet');
  const flame = object('FinaleLampFlame');

  assert.equal(chapel.visible, false);
  scene.restore('custody');
  assert.equal(chapel.visible, true);
  assert.equal(scene.getSnapshot().tabletStored, false);
  const unchecked = tablet.position.clone();
  assert.equal(tablet.parent, chapel);
  assert.equal(niche.parent, chapel);

  scene.restore('kora1', { animate: true });
  assert.deepEqual(tablet.position, unchecked);
  scene.update(0.55);
  assert.ok(tablet.position.distanceTo(unchecked) > 0.5);
  assert.equal(scene.getSnapshot().tabletStored, false);
  scene.update(0.55);
  assert.ok(Math.abs(tablet.position.z - niche.position.z) < 0.05);
  assert.equal(scene.getSnapshot().tabletStored, true);
  assert.equal(flame.visible, false);

  scene.restore('lamp');
  scene.restore('lampPrayer', { animate: true });
  assert.equal(flame.visible, false);
  scene.update(0.26);
  assert.equal(flame.visible, true);
  const partial = flame.scale.y;
  scene.update(0.65);
  assert.ok(flame.scale.y > partial);
  assert.equal(scene.getSnapshot().lampLit, true);
  scene.dispose();
});

test('the finale restores all checkpoints and resets tablet and lamp for replay', async () => {
  const staged = await createFinaleScene({ colliders: [] });
  const reloaded = await createFinaleScene({ colliders: [] });
  const ids = FINALE_CHAPTER.checkpoints.map(({ id }) => id);
  for (const id of ids) {
    staged.restore(id, { animate: true, reducedMotion: true });
    reloaded.restore('complete');
    reloaded.restore(id);
    const stored = ids.indexOf(id) >= ids.indexOf('kora1');
    const lit = ids.indexOf(id) >= ids.indexOf('lampPrayer');
    assert.deepEqual(staged.getSnapshot(), reloaded.getSnapshot());
    assert.equal(staged.getSnapshot().tabletStored, stored, id);
    assert.equal(staged.getSnapshot().lampLit, lit, id);
    const flame = staged.group.getObjectByName('FinaleLampFlame');
    const scale = flame.scale.clone();
    staged.update(2);
    assert.deepEqual(flame.scale, scale);
  }

  staged.restore('letter1', { animate: true });
  assert.equal(staged.getSnapshot().lampLit, false);
  assert.equal(staged.getSnapshot().tabletStored, false);
  assert.equal(staged.getSnapshot().propsVisible, false);
  staged.dispose();
  reloaded.dispose();
});

test('the clockwise route stays within the plaza, and disposal only touches scene-owned resources', async () => {
  const retained = { type: 'circle', zone: 'stupa', x: 0, z: 0, r: 19.9 };
  const ctx = new Proxy({ colliders: [retained] }, {
    get(target, key) {
      assert.equal(key, 'colliders', 'scene accessed runtime-owned services');
      return target[key];
    },
  });
  const finale = await createFinaleScene(ctx);
  const world = new THREE.Scene();
  world.add(finale.group);
  assert.deepEqual(ctx.colliders, [retained]);
  finale.restore('custody');
  assert.equal(ctx.colliders.length, 3);

  let previous;
  for (const { id, presentation } of FINALE_CHAPTER.checkpoints) {
    const point = finale.getTarget(id);
    if (presentation === 'card' && id !== 'custody') {
      assert.equal(point, null);
      continue;
    }
    const { x, z, lookAt } = point;
    assert.ok(Math.hypot(x, z) >= 22 && Math.hypot(x, z) <= 37, id);
    assert.ok(Number.isFinite(lookAt.y));
    assert.equal(finale.getHeight(x, z), 0);
    for (const collider of ctx.colliders.slice(1)) {
      const nx = THREE.MathUtils.clamp(x, collider.minX, collider.maxX);
      const nz = THREE.MathUtils.clamp(z, collider.minZ, collider.maxZ);
      assert.ok(Math.hypot(x - nx, z - nz) > 0.4, id);
    }
    if (id.startsWith('kora')) {
      if (previous) assert.ok(previous.x * z - previous.z * x > 0, id);
      previous = point;
    }
  }

  const resources = new Map();
  finale.group.traverse(object => {
    assert.equal(Boolean(object.isPointLight), false);
    for (const resource of [object.material, object.geometry]) {
      if (!resource || resources.has(resource)) continue;
      resources.set(resource, 0);
      resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
    }
  });
  finale.restore('letter1');
  assert.deepEqual(ctx.colliders, [retained]);
  finale.restore('lamp');
  finale.dispose();
  finale.dispose();
  assert.ok([...resources.values()].every(count => count === 1));
  assert.deepEqual(ctx.colliders, [retained]);
  assert.equal(world.children.length, 0);
});

test('the six fixed letter pages and explicit proxy branches have bilingual text', () => {
  const { zh, en } = i18n.getStrings();
  const prefix = 'mirror.chapter.finale';
  for (const { id } of FINALE_CHAPTER.checkpoints) {
    for (const suffix of ['title', 'body', 'action']) {
      const key = `${prefix}.${id}.${suffix}`;
      assert.ok(zh[key]?.trim() && en[key]?.trim(), key);
    }
  }
  const decision = FINALE_CHAPTER.checkpoints.find(({ id }) => id === 'decision');
  assert.deepEqual(decision.choices, ['end', 'retain']);
  for (const strings of [zh, en]) {
    assert.ok(strings[`${prefix}.decision.end`]);
    assert.ok(strings[`${prefix}.decision.retain`]);
    assert.notEqual(strings[`${prefix}.response.body.end`], strings[`${prefix}.response.body.retain`]);
  }
  assert.match(zh[`${prefix}.letter1.body`], /^親愛的林澈/);
  assert.match(zh[`${prefix}.letter6.body`], /映真$/);
  assert.match(zh[`${prefix}.response.body.end`], /謝謝你陪我走完這段路。/);
  assert.match(zh[`${prefix}.response.body.end`], /再見，林澈。/);
  assert.match(zh[`${prefix}.response.body.end`], /帳號已停用/);
  assert.match(zh[`${prefix}.response.body.retain`], /我會把這些記憶留在這裡。/);
  assert.match(zh[`${prefix}.response.body.retain`], /但接下來的路，你要自己走了。/);
  assert.match(en[`${prefix}.response.body.retain`], /quiet archive/);
  assert.doesNotMatch(zh[`${prefix}.response.body.retain`], /【/);
  assert.match(zh[`${prefix}.lampPrayer.body`], /雙手合十/);
  assert.match(zh[`${prefix}.lampPrayer.body`], /「我到了。」[\s\S]*「你可以放心了。」/);
  assert.match(zh[`${prefix}.diary.body`], /熱奶茶[\s\S]*博達哈的清晨，風很輕。/);
  assert.match(zh[`${prefix}.complete.body`], /有些人留下能夠思考的機器。/);
  assert.match(zh[`${prefix}.complete.body`], /他沒有忘記她。[\s\S]*帶著那份記憶繼續生活。/);
  const ids = FINALE_CHAPTER.checkpoints.map(({ id }) => id);
  assert.equal(ids.indexOf('lampPrayer'), ids.indexOf('lamp') + 1);
  assert.equal(ids.indexOf('diary'), ids.indexOf('lampPrayer') + 1);
  assert.ok(FINALE_CHAPTER.siteIds.every(id => CH5_CODEX.some(record => record.id === id)));
});
