import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { createBus } from '../src/core/events.js';
import { createQuests } from '../src/systems/quests.js';
import { NPCS } from '../src/data/npcs.js';

function createTestCtx(overrides = {}) {
  const bus = createBus();
  const scene = new THREE.Scene();
  const savedStore = {};
  const ctx = {
    THREE,
    bus,
    scene,
    config: CONFIG,
    interactables: [],
    i18n: { t: (k) => k },
    save: {
      get: (k, fb) => (k in savedStore ? savedStore[k] : fb),
      set: (k, v) => {
        savedStore[k] = v;
      },
    },
    world: {
      getHeight: () => 0,
      isCombatZone: (z) => z !== 'stupa' && z !== 'grove',
      getMap: (id) => ({ id: id || 'stupa', origin: { x: 0, z: 0 }, walkRadius: 95 }),
    },
    npcs: {
      getNpc: (id) => NPCS.find((n) => n.id === id) || null,
      list: () => NPCS,
    },
    enemies: {
      getActiveEnemies: () => [],
      getActive: () => [],
      list: () => [],
    },
    state: {
      mode: 'play',
      zone: 'stupa',
      elapsed: 1.0,
      player: {
        position: new THREE.Vector3(0, 0, 22.5),
        heading: 0,
      },
    },
    ...overrides,
  };
  return ctx;
}

test('Issue #232 (1): prologue.vow kora step renders 24-node circular floor guidance around stupa and leads clockwise', () => {
  const ctx = createTestCtx();
  const quests = createQuests(ctx);
  ctx.bus.emit('game:start');

  // Advance from talk_intro to kora
  ctx.bus.emit('npc:talk', { id: 'oldLama' });
  assert.equal(quests.isAtStep('prologue.vow', 'kora'), true);

  // Player at South of stupa (0, 22.5) -> angle = pi/2
  ctx.state.player.position.set(0, 0, 22.5);
  const targets = quests.getTrackedTargets('stupa');
  assert.equal(targets.length, 1);
  const koraTarget = targets[0];
  assert.equal(koraTarget.type, 'kora');
  assert.ok(koraTarget.koraRing, 'kora target includes koraRing metadata');
  assert.equal(koraTarget.koraRing.cx, 0);
  assert.equal(koraTarget.koraRing.cz, 0);
  assert.equal(koraTarget.koraRing.radius, 22.5);

  // Clockwise from South (0, 22.5, angle = +90deg) is +150deg (Southwest/West, x < 0, z > 0)
  const expectedAngle = Math.PI / 2 + Math.PI / 3;
  assert.ok(Math.abs(koraTarget.x - Math.cos(expectedAngle) * 22.5) < 0.05);
  assert.ok(Math.abs(koraTarget.z - Math.sin(expectedAngle) * 22.5) < 0.05);

  // Update 3D trail and verify all 24 lotus nodes form a full circle at r = 22.5 around (0, 0)
  quests.update(0.05);
  const trailGroup = ctx.scene.getObjectByName('QuestGuidanceTrailGroup');
  assert.ok(trailGroup);
  assert.equal(trailGroup.visible, true);
  assert.equal(trailGroup.children.length, 24);

  const quadrants = new Set();
  for (const mesh of trailGroup.children) {
    assert.equal(mesh.visible, true, 'All 24 circular kora trail nodes are visible');
    const r = Math.hypot(mesh.position.x, mesh.position.z);
    assert.ok(Math.abs(r - 22.5) < 0.05, `Expected node on r=22.5 ring, got r=${r}`);
    const qx = mesh.position.x >= 0 ? 'E' : 'W';
    const qz = mesh.position.z >= 0 ? 'S' : 'N';
    quadrants.add(`${qx}${qz}`);
  }
  assert.equal(quadrants.size, 4, 'Circular kora trail spans all 4 quadrants around the stupa');
});

test('Issue #232 (2): prologue.vow light step points to the nearest butter-lamp offering station instead of (0, 20.4)', () => {
  const ctx = createTestCtx();
  const quests = createQuests(ctx);
  ctx.bus.emit('game:start');
  ctx.bus.emit('npc:talk', { id: 'oldLama' });
  ctx.bus.emit('kora:lap');
  assert.equal(quests.isAtStep('prologue.vow', 'light'), true);

  // 1. Player near SE lamp station (45 deg, 22.5m -> ~15.91, 15.91)
  ctx.state.player.position.set(10, 0, 20);
  let [target] = quests.getTrackedTargets('stupa');
  assert.equal(target.stepId, 'light');
  assert.ok(
    Math.hypot(target.x - 15.91, target.z - 15.91) < 0.2,
    `Expected SE lamp station (15.91, 15.91), got (${target.x}, ${target.z})`,
  );

  // 2. Player near West-SW lamp station (165 deg, 22.5m -> ~-21.73, 5.82)
  ctx.state.player.position.set(-20, 0, 8);
  [target] = quests.getTrackedTargets('stupa');
  assert.ok(
    Math.hypot(target.x - -21.73, target.z - 5.82) < 0.2,
    `Expected WSW lamp station (-21.73, 5.82), got (${target.x}, ${target.z})`,
  );

  // 3. Player near North-NE lamp station (285 deg, 22.5m -> ~5.82, -21.73) with ctx.interactables populated
  ctx.interactables.push({
    id: 'lamp-2',
    kind: 'lamp',
    zone: 'stupa',
    getPosition: () => new THREE.Vector3(5.82, 0, -21.73),
    isAvailable: () => true,
  });
  ctx.state.player.position.set(4, 0, -20);
  [target] = quests.getTrackedTargets('stupa');
  assert.ok(
    Math.hypot(target.x - 5.82, target.z - -21.73) < 0.2,
    `Expected NNE lamp station (5.82, -21.73), got (${target.x}, ${target.z})`,
  );
});

test('Issue #232 (3): non-kora ground trail curves around central stupa collider when path crosses (0, 0)', () => {
  const ctx = createTestCtx();
  const quests = createQuests(ctx);
  ctx.bus.emit('game:start');
  // At talk_intro -> target is oldLama at (-6, 32)
  // Place player at North side of stupa (5.82, -21.73) so straight chord crosses through (0, 0)
  ctx.state.player.position.set(5.82, 0, -21.73);
  quests.update(0.05);

  const trailGroup = ctx.scene.getObjectByName('QuestGuidanceTrailGroup');
  assert.equal(trailGroup.visible, true);
  const visibleNodes = trailGroup.children.filter((m) => m.visible);
  assert.equal(visibleNodes.length, 8, 'Non-kora step uses 8 stepping-stone nodes');
  for (const mesh of visibleNodes) {
    const r = Math.hypot(mesh.position.x, mesh.position.z);
    assert.ok(
      r >= 21.9,
      `Expected trail node to curve outside stupa collider (r >= 22.0), got r=${r}`,
    );
  }
});

test('Issue #232 (4): dynamic quest indicators across ch1-ch5 and cross-map transit', () => {
  const activeEnemies = [];
  const ctx = createTestCtx({
    enemies: {
      getActiveEnemies: () => activeEnemies,
      getActive: () => activeEnemies,
      list: () => activeEnemies,
    },
  });
  const quests = createQuests(ctx);

  // A. Cross-map transit: prologue.north at liberate (wild) while player is in stupa -> guides to North Gate (0, -35.6)
  quests.complete('prologue.vow');
  assert.equal(quests.isActive('prologue.north'), true);
  ctx.bus.emit('npc:talk', { id: 'oldLama' });
  assert.equal(quests.isAtStep('prologue.north', 'liberate'), true);
  ctx.state.zone = 'stupa';
  let [target] = quests.getTrackedTargets('stupa');
  assert.equal(target.viaTransit, true);
  assert.equal(target.destMap, 'wild');
  assert.ok(Math.hypot(target.x - 0, target.z - -35.6) < 0.2, 'Guides to Stupa North Gate toward wild');

  // B. ch1.drought liberate_sprites & interact_springs: dynamically picks live enemy and nearest un-interacted spring
  quests.reset();
  ctx.state.zone = 'pharping';
  quests.start('ch1.drought');
  ctx.bus.emit('npc:talk', { id: 'villageElder' });
  assert.equal(quests.isAtStep('ch1.drought', 'liberate_sprites'), true);

  activeEnemies.push({
    id: 'sprite_1',
    kind: 'droughtSprite',
    zone: 'pharping',
    hp: 40,
    position: new THREE.Vector3(2038, 0, 28),
  });
  [target] = quests.getTrackedTargets('pharping');
  assert.equal(target.x, 2038);
  assert.equal(target.z, 28);

  // Advance to interact_springs
  quests.completeStep('ch1.drought', 'liberate_sprites');
  assert.equal(quests.isAtStep('ch1.drought', 'interact_springs'), true);

  ctx.state.player.position.set(1950, 0, 12);
  [target] = quests.getTrackedTargets('pharping');
  assert.equal(target.x, 1945);
  assert.equal(target.z, 10);

  // After interacting with spring1, indicator shifts to nearest remaining spring (spring3 at 2010, -20)
  ctx.bus.emit('quest:interact', { target: 'spring1', uniqueId: 'spring1', count: 1 });
  [target] = quests.getTrackedTargets('pharping');
  assert.equal(target.x, 2010);
  assert.equal(target.z, -20);

  // D. ch2.tenma complete_altars: has map 'mangyul' and advances to next uncompleted Tenma altar
  quests.reset();
  ctx.state.zone = 'mangyul';
  ctx.state.player.position.set(2990, 0, 35);
  quests.start('ch2.tenma');
  [target] = quests.getTrackedTargets('mangyul');
  assert.equal(target.questId, 'ch2.tenma');
  assert.equal(target.x, 2988);
  assert.equal(target.z, 34);

  // Complete altar 0 -> moves to next nearest altar (altar 2 at 2982, 18)
  ctx.bus.emit('tenma:oath', { altarIndex: 0, increment: 1 });
  [target] = quests.getTrackedTargets('mangyul');
  assert.equal(target.x, 2982);
  assert.equal(target.z, 18);

  // E. ch5.firstTerma inside 'terma' dungeon -> guides to exitRoomWorld on floor
  quests.reset();
  ctx.state.zone = 'terma';
  ctx.state.dungeon = {
    floor: 3,
    gateUnlocked: true,
    exitRoomWorld: { x: 32, z: -48 },
  };
  quests.start('ch5.firstTerma');
  [target] = quests.getTrackedTargets('terma');
  assert.equal(target.questId, 'ch5.firstTerma');
  assert.equal(target.map, 'terma');
  assert.equal(target.x, 32);
  assert.equal(target.z, -48);
});
