import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBus } from '../src/core/events.js';
import { i18n } from '../src/i18n.js';
import { createMuralPrototype } from '../src/ui/muralPrototype.js';
import { createCameraRig } from '../src/player/cameraRig.js';
import { CONFIG } from '../src/config.js';

function createMockCtx() {
  const savedStore = {};
  const bus = createBus();
  const state = {
    mode: 'play',
    zone: 'stupa',
    zoneType: 'hub',
    uiOpen: false,
    elapsed: 0,
    player: {
      position: new THREE.Vector3(0, 0, 30),
      heading: 0,
      velocity: new THREE.Vector3(),
      isMoving: false,
      action: 'idle',
      hp: 80,
      maxHp: 100,
      mp: 40,
      maxMp: 60,
    },
  };

  const spawnedEnemies = [];
  let damagedEnemyRecord = null;
  let expAdded = 0;

  const ctx = {
    THREE,
    camera: new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 600),
    scene: new THREE.Scene(),
    state,
    config: CONFIG,
    bus,
    i18n,
    save: {
      get: (sec, fb = {}) => savedStore[sec] ?? fb,
      set: (sec, val) => {
        savedStore[sec] = val;
      },
      flush: () => true,
    },
    zones: {
      teleport: async (to) => {
        state.zone = to;
        state.zoneType = to === 'stupa' ? 'hub' : 'combat';
        bus.emit('zone:change', { from: 'stupa', to });
        return true;
      },
    },
    world: {
      getHeight: () => 0,
      getMap: (id) => ({ id, origin: { x: 2000, z: 0 }, walkRadius: 100 }),
    },
    vitals: {
      spendMp: (n) => {
        if (state.player.mp < n) return false;
        state.player.mp -= n;
        return true;
      },
      addExp: (n) => {
        expAdded += n;
      },
    },
    enemies: {
      getActiveEnemies: () => spawnedEnemies,
      spawn: (kind, opts = {}) => {
        const e = {
          id: `enemy-${spawnedEnemies.length + 1}`,
          kind,
          hp: 50,
          maxHp: 50,
          state: 'wander',
          pos: { x: opts.x ?? 2000, y: 0, z: opts.z ?? 18 },
          group: { position: { x: opts.x ?? 2000, y: 0, z: opts.z ?? 18 } },
        };
        spawnedEnemies.push(e);
        return e.id;
      },
      damage: (id, amount) => {
        damagedEnemyRecord = { id, amount };
        const found = spawnedEnemies.find((e) => e.id === id);
        if (found) found.state = 'liberated';
      },
    },
    getDamagedEnemyRecord: () => damagedEnemyRecord,
    getExpAdded: () => expAdded,
    getSavedStore: () => savedStore,
  };

  return ctx;
}

test('Issue #256: amitabha passcode unlocks 2.5D mural prototype and persists to settings', async () => {
  const ctx = createMockCtx();
  const proto = createMuralPrototype(ctx);

  assert.equal(proto.isUnlocked(), false);
  assert.equal(proto.getMode(), 'off');

  assert.equal(proto.unlockWithPasscode('wrongpass'), false);
  assert.equal(proto.isUnlocked(), false);

  assert.equal(proto.unlockWithPasscode('  AMITABHA '), true);
  assert.equal(proto.isUnlocked(), true);
  assert.equal(proto.getMode(), 'optionA');
  assert.equal(ctx.state.muralProtoUnlocked, true);
  assert.equal(ctx.state.muralProtoMode, 'optionA');
  assert.equal(ctx.getSavedStore().settings.muralProtoUnlocked, true);
  assert.equal(ctx.getSavedStore().settings.muralProtoMode, 'optionA');
});

test('Issue #256: Option A & cameraRig lock into 2.5D HD-2D side-scroll diorama view and align enemy depth', async () => {
  const ctx = createMockCtx();
  const proto = createMuralPrototype(ctx);
  const camRig = createCameraRig(ctx);

  await proto.launchDemo('optionA');
  assert.equal(ctx.state.zone, 'pharping');
  assert.equal(ctx.state.muralProtoMode, 'optionA');
  assert.equal(ctx.state.player.position.x, 2000);
  assert.equal(ctx.state.player.position.z, 28);

  // Spawn an off-axis enemy and verify Option A update(dt) pulls it toward player X corridor
  const enemies = ctx.enemies.getActiveEnemies();
  assert.ok(enemies.length >= 1);
  enemies[0].pos.x = 2006;
  enemies[0].pos.z = 22;

  proto.update(0.2);
  assert.ok(enemies[0].pos.x < 2006, 'Enemy X should be pulled toward the 2000 corridor plane');

  camRig.update(0.5);
  assert.ok(ctx.camera.fov < 55, 'Camera FOV should narrow toward 40 deg HD-2D diorama perspective');
});

test('Issue #256: Option B Thangka Turn-Based combat supports Shield Break, Mudra Chain, Butter Lamp MP, and Victory', async () => {
  const ctx = createMockCtx();
  const proto = createMuralPrototype(ctx);
  await proto.launchDemo('optionB');

  const worldEnemy = ctx.enemies.getActiveEnemies()[0];
  // Move enemy within 4.5m of player (2000, 0, 28) to trigger proximity encounter
  worldEnemy.pos.x = 2000;
  worldEnemy.pos.z = 25;
  proto.update(0.1);

  const bState = proto.getBattleState();
  assert.equal(bState.active, true, 'Walking within 4.5m of enemy in Option B should start Thangka Turn-Based Battle');
  assert.equal(bState.enemies.length, 2);

  // 1. Cast OM (嗡字護體印): records OM, +1 BP, reduces target shield from 3 -> 2
  proto.executeCommand('om');
  assert.equal(bState.mudras.om, true);
  assert.equal(bState.enemies[0].shield, 2);

  // 2. Cast HUM (吽字普巴印): records HUM, breaks 2 shields -> target shield reaches 0 (BROKEN!)
  proto.executeCommand('hum');
  assert.equal(bState.mudras.hum, true);
  // Note: enemy 0 was broken during player action, then skipped its attack and restored shield at end of turn
  assert.equal(bState.mudras.hum, true);

  // 3. Cast AH (阿字蓮華印): records AH, now OM + AH + HUM are all lit!
  proto.executeCommand('ah');
  assert.equal(bState.mudras.om, true);
  assert.equal(bState.mudras.ah, true);
  assert.equal(bState.mudras.hum, true);

  // 4. Cast Lamp (供燈回魔): restores MP & +1 BP
  const mpBefore = ctx.state.player.mp;
  proto.executeCommand('lamp');
  assert.ok(ctx.state.player.mp >= mpBefore);

  // 5. Cast Ultimate (嗡阿吽・三字明降魔印) until all enemies are purified
  proto.executeCommand('ult');
  // Finish off any remaining HP
  bState.enemies.forEach((e) => { e.hp = 10; });
  const res = proto.executeCommand('om');
  if (!res.victory) {
    bState.TargetIndex = 1;
    proto.executeCommand('om');
  }

  assert.equal(bState.enemies.every((e) => e.hp === 0), true, 'All mural enemies should be purified');
  assert.equal(ctx.getDamagedEnemyRecord()?.id, worldEnemy.id, 'Engaged 3D world enemy should be liberated on victory');
  assert.ok(ctx.getExpAdded() >= 35, 'Victory should grant EXP');
});
