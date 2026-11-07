import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { createBus } from '../src/core/events.js';
import { createBoss } from '../src/gameplay/bosses/bossBase.js';
import { createPatternRunner } from '../src/gameplay/bosses/patterns.js';
import { TENMA_STORM_BOSS } from '../src/gameplay/bosses/tenmaStorm.js';
import { i18n } from '../src/i18n.js';
import { registerBossI18n } from '../src/i18n/bosses.js';
import { createVitals } from '../src/systems/vitals.js';

function createTestHarness() {
  registerBossI18n();
  const bus = createBus();
  const scene = new THREE.Group();
  const mangyulGroup = new THREE.Group();
  scene.add(mangyulGroup);

  const store = new Map();
  const save = {
    get(key, fallback) {
      return store.has(key) ? structuredClone(store.get(key)) : fallback;
    },
    set(key, val) {
      store.set(key, structuredClone(val));
    },
  };

  const state = {
    mode: 'play',
    zone: 'mangyul',
    zoneType: 'combat',
    elapsed: 0,
    flags: { 'ch2.tenma.done': true },
    player: {
      position: new THREE.Vector3(3000, 0, -60),
      velocity: new THREE.Vector3(),
      heading: 0,
      isMoving: false,
      action: 'idle',
      level: 12,
      exp: 100,
    },
  };

  const ctx = {
    scene,
    zoneGroups: { mangyul: mangyulGroup },
    state,
    config: CONFIG,
    bus,
    i18n,
    save,
    world: { getHeight: () => 0 },
    quests: {
      getFlag: (k) => Boolean(state.flags[k]),
      setFlag: (k, v) => {
        state.flags[k] = v;
      },
    },
    zones: {
      teleport(zoneId) {
        state.zone = zoneId;
        state.zoneType = zoneId === 'stupa' ? 'hub' : 'combat';
        if (zoneId === 'stupa') {
          state.player.position.set(0, 0, 30);
        }
      },
    },
  };

  const vitals = createVitals(ctx);
  return { ctx, state, bus, vitals, scene };
}

test('patternRunner.update does not throw or double-cleanup when a task at index > 0 triggers player:faint -> clear()', () => {
  const { ctx, state, bus, vitals } = createTestHarness();
  const parentGroup = new THREE.Group();
  const runner = createPatternRunner(ctx, parentGroup);

  let clearCount = 0;
  bus.on('player:faint', () => {
    clearCount++;
    runner.clear();
  });

  const bossMock = {
    pos: new THREE.Vector3(3000, 0, -65),
    facing: 0,
    animState: 'idle',
    setPosition(x, z) {
      this.pos.set(x, 0, z);
    },
  };

  // Queue multiple activeTasks: ringWave (index 0) + targetedAoe (spawners at indices 1..3) + radialAoe (index 4)
  runner.patterns.ringWave(bossMock, { windup: 5.0, damage: 20 });
  runner.patterns.targetedAoe(bossMock, { count: 3, interval: 0.45, windup: 0.5, damage: 25 });
  runner.patterns.radialAoe(bossMock, {
    x: state.player.position.x,
    z: state.player.position.z,
    radius: 6.0,
    windup: 0.2,
    damage: 50,
  });

  // Put player at 1 HP so the radialAoe (at the end of activeTasks, index > 0) deals lethal damage
  vitals.set({ hp: 1 });
  state.elapsed = 10;

  assert.doesNotThrow(() => {
    runner.update(0.25);
  });

  assert.equal(clearCount, 1, 'player:faint should have triggered runner.clear() synchronously');
  assert.equal(vitals.isFainting(), true);
  assert.equal(state.player.hp, 0);
});

test('patternRunner.update does not throw when projectileVolley projectile at index > 0 triggers player:faint -> clear()', () => {
  const { ctx, state, bus, vitals } = createTestHarness();
  const parentGroup = new THREE.Group();
  const runner = createPatternRunner(ctx, parentGroup);

  let clearCount = 0;
  bus.on('player:faint', () => {
    clearCount++;
    runner.clear();
  });

  const bossMock = {
    pos: new THREE.Vector3(3000, 0, -65),
    facing: 0,
    animState: 'idle',
  };

  // Place player 2.4m in front of the boss so when windup finishes, projectile i=6 hits player while 0..5 are still queued
  state.player.position.set(3000, 0, -62.6);
  runner.patterns.projectileVolley(bossMock, {
    count: 7,
    spreadAngle: 0.15,
    windup: 0.2,
    speed: 10.0,
    damage: 40,
  });

  vitals.set({ hp: 1 });
  state.elapsed = 20;

  // Update finishes windup, spawns 7 activeProjectiles, and hits player on the first projectile iteration -> triggers clear() mid-loop
  assert.doesNotThrow(() => {
    runner.update(0.2);
  });

  assert.equal(clearCount, 1);
  assert.equal(vitals.isFainting(), true);
});

test('Tenma Storm Boss fight: first failure mid-update recovers from faint to stupa, and rematch failure also recovers cleanly', () => {
  const { ctx, state, vitals } = createTestHarness();
  const boss = createBoss(ctx, TENMA_STORM_BOSS);
  ctx.bosses = {
    getActiveBoss: () => (boss.isActive() ? boss : null),
    getState: () => boss.getState(),
  };

  // --- Attempt 1: Enter Phase 2 (detached corner orbs + targetedAoe + ringWave) and faint ---
  boss.start();
  assert.equal(boss.isActive(), true);

  // Transition to Phase 2 (<= 60% HP) so 4 corner weather orbs detach
  boss.setHp(0.55);
  assert.equal(boss.getState().phase, 2);
  assert.equal(boss.getState().detachedOrbs, 4);

  // Queue multiple simultaneous patterns (targetedAoe + radialAoe on player)
  const internal = boss.getInternalState();
  internal.patternRunner.patterns.targetedAoe(internal, {
    count: 3,
    interval: 0.4,
    windup: 0.2,
    damage: 30,
  });
  internal.patternRunner.patterns.radialAoe(internal, {
    x: state.player.position.x,
    z: state.player.position.z,
    radius: 8.0,
    windup: 0.2,
    damage: 50,
  });

  // Set player HP low so the active task kills the player during boss.update(dt)
  vitals.set({ hp: 1 });
  state.elapsed = 30;

  assert.doesNotThrow(() => {
    boss.update(0.25);
    vitals.update(0.25);
  });

  // Boss must have reset cleanly and returned all detached Phase 2 orbs
  assert.equal(boss.isActive(), false);
  assert.equal(boss.getState().detachedOrbs, 0);
  assert.equal(vitals.isFainting(), true);
  assert.equal(state.player.action, 'faint');

  // Tick through the rest of faintDuration (1.8s total) to verify full recovery & teleport to stupa
  for (let step = 0; step < 20; step++) {
    state.elapsed += 0.1;
    boss.update(0.1);
    vitals.update(0.1);
  }

  assert.equal(vitals.isFainting(), false);
  assert.equal(state.zone, 'stupa');
  assert.equal(state.mode, 'play');
  assert.equal(state.player.action, 'idle');
  assert.ok(state.player.hp > 0, 'Player HP must be restored above 0 after waking at stupa');
  assert.equal(state.player.hp, Math.round(state.player.maxHp * CONFIG.VITALS.faintHpRatio));
  assert.equal(state.flags['ch2.tenma.done'], true, 'Saved quest flags must remain intact');

  // --- Attempt 2: Return to Mangyul Pass, challenge Tenma Storm again, and fail via projectileVolley ---
  state.zone = 'mangyul';
  state.zoneType = 'combat';
  state.player.position.set(3000, 0, -62.6);

  // Stepping into the arena auto-starts the boss fight again
  boss.update(0.1);
  assert.equal(boss.isActive(), true);
  assert.equal(boss.getState().hp, boss.getState().maxHp);

  // Spawn a 7-projectile volley aimed at the player and set HP to 1 before windup completes
  internal.patternRunner.patterns.projectileVolley(internal, {
    count: 7,
    spreadAngle: 0.15,
    windup: 0.2,
    speed: 10.0,
    damage: 45,
  });
  vitals.set({ hp: 1 });
  state.elapsed += 10;

  assert.doesNotThrow(() => {
    boss.update(0.2);
    vitals.update(0.2);
  });

  assert.equal(boss.isActive(), false);
  assert.equal(vitals.isFainting(), true);

  // Tick through the second faint recovery
  for (let step = 0; step < 20; step++) {
    state.elapsed += 0.1;
    boss.update(0.1);
    vitals.update(0.1);
  }

  assert.equal(vitals.isFainting(), false);
  assert.equal(state.zone, 'stupa');
  assert.equal(state.player.action, 'idle');
  assert.ok(state.player.hp > 0);
});
