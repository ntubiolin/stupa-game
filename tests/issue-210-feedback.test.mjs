import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { createBus } from '../src/core/events.js';
import { DIFFICULTIES, resolveDifficulty, getDifficulty } from '../src/data/combatSettings.js';
import { createBoss } from '../src/gameplay/bosses/bossBase.js';
import { createPatternRunner } from '../src/gameplay/bosses/patterns.js';
import { createProjectiles } from '../src/gameplay/projectiles.js';
import { createTargeting } from '../src/gameplay/targeting.js';
import { createQuests } from '../src/systems/quests.js';
import { resolveNpcDialogueId } from '../src/gameplay/npcs.js';
import { NPCS } from '../src/data/npcs.js';

function countPointLights(root) {
  let count = 0;
  root.traverse((obj) => {
    if (obj?.isPointLight) count++;
  });
  return count;
}

test('Issue #210 (1): Boss arena restriction is disabled on easy/normal and enforced only on hard difficulty', () => {
  assert.equal(DIFFICULTIES.length, 3);
  assert.equal(resolveDifficulty('easy').bossArenaLock, false);
  assert.equal(resolveDifficulty('normal').bossArenaLock, false);
  assert.equal(resolveDifficulty('hard').bossArenaLock, true);

  const bus = createBus();
  const scene = new THREE.Scene();
  const ctx = {
    bus,
    scene,
    config: CONFIG,
    zoneGroups: {},
    interactables: [],
    i18n: { t: (k) => k },
    settings: { get: () => ({ difficulty: 'normal', cameraFollow: 'smart' }) },
    world: {
      getHeight: () => 0,
      getMap: () => ({ id: 'wild', walkRadius: 95 }),
    },
    state: {
      mode: 'play',
      zone: 'wild',
      elapsed: 0,
      settings: { difficulty: 'normal' },
      player: {
        position: new THREE.Vector3(0, 0, -58),
        heading: 0,
        hp: 100,
        maxHp: 100,
      },
    },
  };

  let aiTargetStep = null;
  const boss = createBoss(ctx, {
    id: 'migoiKing',
    nameKey: 'boss.migoiKing.name',
    titleKey: 'boss.migoiKing.title',
    level: 5,
    maxHp: 500,
    atk: 18,
    def: 8,
    speed: 3.5,
    scale: 1.5,
    arena: { map: 'wild', x: 0, z: -60, r: 20, aggroR: 18, leashR: 26 },
    buildModel() {
      const group = new THREE.Group();
      return { group };
    },
    onUpdate(_dt, bossState) {
      if (aiTargetStep) {
        bossState.setPosition(aiTargetStep.x, aiTargetStep.z);
      }
    },
  });

  // Engage Boss on default ('normal') difficulty
  boss.update(0.05);
  assert.equal(boss.isActive(), true);
  assert.equal(boss.isArenaLocked(), false);

  // Move player outside the 20m arena radius (e.g. z = -35, 25m from center (0, -60))
  ctx.state.player.position.set(0, 0, -35);
  aiTargetStep = { x: 0, z: -36 }; // Boss chases outside the 20m arena radius
  boss.update(0.05);

  // Player is NOT clamped back inside r=20, and Boss can step outside r=20 to z=-36
  assert.equal(ctx.state.player.position.z, -35);
  assert.equal(boss.getState().position.z, -36);

  // Retreating beyond leash radius on normal difficulty cleanly resets/disengages the Boss
  ctx.state.player.position.set(0, 0, 10);
  boss.update(0.05);
  assert.equal(boss.isActive(), false);

  // Switch to 'hard' difficulty and re-engage
  ctx.state.settings.difficulty = 'hard';
  ctx.settings.get = () => ({ difficulty: 'hard', cameraFollow: 'smart' });
  assert.equal(getDifficulty(ctx).bossArenaLock, true);

  ctx.state.player.position.set(0, 0, -55);
  aiTargetStep = { x: 0, z: -30 }; // Attempt to move Boss outside r=20 on hard
  boss.update(0.05);
  assert.equal(boss.isActive(), true);
  assert.equal(boss.isArenaLocked(), true);

  // Attempt to move player outside r=20 on hard -> clamped to arena.r - 0.65 = 19.35m from (0, -60)
  ctx.state.player.position.set(0, 0, -30);
  boss.update(0.05);
  const playerDistFromCenter = Math.hypot(ctx.state.player.position.x, ctx.state.player.position.z - -60);
  const bossDistFromCenter = Math.hypot(boss.getState().position.x, boss.getState().position.z - -60);
  assert.ok(playerDistFromCenter <= 19.5, `Hard difficulty clamps player inside arena (dist=${playerDistFromCenter})`);
  assert.ok(bossDistFromCenter <= 19.5, `Hard difficulty clamps boss inside arena (dist=${bossDistFromCenter})`);
});

test('Issue #210 (2): Jumping evades enemy arrows, ground eruptions, and Boss ground/charge/ring/volley attacks', () => {
  const bus = createBus();
  const scene = new THREE.Scene();
  let damageTaken = 0;
  let jumpDodgeCount = 0;
  bus.on('player:jumpDodge', () => {
    jumpDodgeCount++;
  });

  const ctx = {
    bus,
    scene,
    config: CONFIG,
    zoneGroups: {},
    state: {
      mode: 'play',
      zone: 'wild',
      elapsed: 1.0,
      player: {
        position: new THREE.Vector3(0, 0, 0),
        heading: 0,
        isJumping: true,
        jumpHeight: 0.75,
        hp: 100,
        maxHp: 100,
      },
    },
    world: {
      getHeight: () => 0,
      isCombatZone: () => true,
      getMap: () => ({ id: 'wild', origin: { x: 0, z: 0 }, walkRadius: 95 }),
    },
    vitals: {
      takeDamage(amount) {
        damageTaken += amount;
        return amount;
      },
      damage(amount) {
        damageTaken += amount;
        return amount;
      },
    },
  };

  // 1. Enemy arrow (`redArrow`) and ground spike (`frostRoar`) via projectiles.js
  const projectiles = createProjectiles(ctx);
  projectiles.spawn('redArrow', {
    origin: { x: 0, y: 1.0, z: -1.0 },
    dir: { x: 0, z: 1 },
    damage: 25,
    speed: 20,
  });
  projectiles.update(0.05);
  assert.equal(damageTaken, 0, 'Jumping player evades enemy arrow');
  assert.ok(jumpDodgeCount >= 1, 'Emits player:jumpDodge on arrow evasion');

  projectiles.spawn('frostRoar', {
    targetPos: { x: 0, y: 0, z: 0 },
    damage: 30,
    eruptDelay: 0.05,
  });
  projectiles.update(0.06);
  assert.equal(damageTaken, 0, 'Jumping player evades ground frostRoar eruption');
  assert.ok(jumpDodgeCount >= 2, 'Emits player:jumpDodge on frostRoar evasion');

  // 2. Boss patterns (`radialAoe`, `lineCharge`) via patterns.js
  const runner = createPatternRunner(ctx, scene);
  const bossObj = {
    pos: { x: 0, y: 0, z: -2 },
    facing: 0,
    setPosition(nx, nz) {
      this.pos.x = nx;
      this.pos.z = nz;
    },
  };

  // radialAoe
  runner.patterns.radialAoe(bossObj, { x: 0, z: 0, radius: 5, windup: 0.05, damage: 40 });
  runner.update(0.1);
  assert.equal(damageTaken, 0, 'Jumping player evades Boss radialAoe');

  // lineCharge
  runner.patterns.lineCharge(bossObj, {
    width: 3,
    length: 4,
    windup: 0.05,
    chargeDuration: 0.1,
    damage: 45,
  });
  runner.update(0.06);
  runner.update(0.06);
  assert.equal(damageTaken, 0, 'Jumping player evades Boss lineCharge');

  // Landing makes player vulnerable again
  ctx.state.player.isJumping = false;
  ctx.state.player.jumpHeight = 0;
  runner.patterns.radialAoe(bossObj, { x: 0, z: 0, radius: 5, windup: 0.05, damage: 40 });
  runner.update(0.1);
  assert.ok(damageTaken > 0, 'Grounded player takes radialAoe damage normally');
});

test('Issue #210 (3): Initial quest prologue.vow auto-starts on game:start with 0-PointLight ground trail and Old Lama intro routing', () => {
  const bus = createBus();
  const scene = new THREE.Scene();
  const savedStore = {};
  const ctx = {
    bus,
    scene,
    zoneGroups: {},
    i18n: { t: (k) => k },
    save: {
      get: (k, fb) => (k in savedStore ? savedStore[k] : fb),
      set: (k, v) => {
        savedStore[k] = v;
      },
    },
    world: {
      getHeight: () => 0,
      isCombatZone: () => true,
      getMap: () => ({ id: 'wild', origin: { x: 0, z: 0 }, walkRadius: 95 }),
    },
    npcs: {
      getNpc: (id) => NPCS.find((n) => n.id === id) || null,
    },
    state: {
      mode: 'play',
      zone: 'stupa',
      elapsed: 1.5,
      player: {
        position: new THREE.Vector3(0, 0, 22),
      },
    },
  };

  const quests = createQuests(ctx);
  bus.emit('game:start');

  assert.equal(quests.isActive('prologue.vow'), true, 'prologue.vow auto-starts on fresh game:start');
  assert.equal(quests.isAtStep('prologue.vow', 'talk_intro'), true, 'starts at talk_intro step');

  const targets = quests.getTrackedTargets('stupa');
  assert.equal(targets.length, 1);
  assert.equal(targets[0].questId, 'prologue.vow');
  assert.equal(targets[0].x, -6);
  assert.equal(targets[0].z, 32);

  quests.update(0.05);
  const trailGroup = scene.getObjectByName('QuestGuidanceTrailGroup');
  assert.ok(trailGroup, 'QuestGuidanceTrailGroup is attached to scene');
  assert.equal(trailGroup.visible, true, 'Ground guidance trail is visible when >2.8m from Old Lama');
  assert.equal(countPointLights(scene), 0, 'Quest markers and ground trail add 0 PointLights');

  // Verify talking to Old Lama while prologue.vow is at talk_intro opens prologue.oldLama.vowIntro
  const oldLamaDef = NPCS.find((n) => n.id === 'oldLama');
  const resolvedDlg = resolveNpcDialogueId(ctx, oldLamaDef.dialogue);
  assert.equal(resolvedDlg, 'prologue.oldLama.vowIntro');
});

test('Issue #210 (4): Targeting auto-aims toward mouse cursor world position with narrow-cone soft-target assist', () => {
  const bus = createBus();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 12, 12);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);

  const enemyEast = {
    id: 'enemy_east',
    hp: 50,
    maxHp: 50,
    state: 'idle',
    position: new THREE.Vector3(5, 0, 0),
    group: new THREE.Group(),
  };

  const ctx = {
    bus,
    scene,
    camera,
    state: {
      mode: 'play',
      zone: 'wild',
      elapsed: 1.0,
      player: {
        position: new THREE.Vector3(0, 0, 0),
        heading: 0, // facing North (-Z)
      },
    },
    input: {
      mouse: {
        x: 0.65, // cursor pointing to the right (+X / East)
        y: 0.0,
        active: true,
      },
      pressed: () => false,
    },
    enemies: {
      getActiveEnemies: () => [enemyEast],
    },
  };

  const targeting = createTargeting(ctx);
  const acquired = targeting.acquire({ range: 16 });

  // Even though player is facing North (heading=0 -> dir=0), mouse cursor is to the East (+X -> dir ≈ -Math.PI/2),
  // so acquire() aims East toward the cursor (-Math.sin(dir) > 0.7) and soft-locks enemyEast near the cursor ray!
  const aimFwdX = -Math.sin(acquired.dir);
  assert.ok(aimFwdX > 0.7, `Aim direction follows mouse cursor to the East (aimFwdX=${aimFwdX})`);
  assert.equal(acquired.target, enemyEast, 'Soft-targets enemy within narrow cone of mouse cursor');
});
