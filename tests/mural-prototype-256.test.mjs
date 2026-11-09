import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBus } from '../src/core/events.js';
import { i18n } from '../src/i18n.js';
import {
  MURAL_PROTO_MODES,
  MURAL_PROTO_PASSCODE,
  normalizeMuralProtoMode,
  createMuralPrototype,
} from '../src/ui/muralPrototype.js';
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

test('Issue #256 & #269: amitabha passcode unlocks 2.5D mural prototype without leaking passcode in UI strings', async () => {
  const ctx = createMockCtx();
  const proto = createMuralPrototype(ctx);

  assert.equal(MURAL_PROTO_PASSCODE, 'amitabha');
  assert.deepEqual(MURAL_PROTO_MODES, ['off', 'optionA']);
  assert.equal(proto.isUnlocked(), false);
  assert.equal(proto.getMode(), 'off');

  // Verify no UI string in zh-Hant or en leaks the secret passcode 'amitabha'
  const checkedKeys = [
    'settings.muralProto.title',
    'settings.muralProto.desc',
    'settings.muralProto.passLabel',
    'settings.muralProto.passPlaceholder',
    'settings.muralProto.unlockBtn',
    'settings.muralProto.unlockedBadge',
    'settings.muralProto.wrongPass',
    'settings.muralProto.unlockToast',
    'settings.muralProto.mode.optionA',
    'settings.muralProto.tryA',
  ];
  for (const lang of ['zh-Hant', 'en']) {
    i18n.setLang(lang);
    for (const key of checkedKeys) {
      const val = i18n.t(key);
      assert.equal(
        val.toLowerCase().includes('amitabha'),
        false,
        `i18n key "${key}" (${lang}) must not leak passcode "amitabha": "${val}"`
      );
      assert.equal(
        val.includes('阿彌陀佛'),
        false,
        `i18n key "${key}" (${lang}) must not leak "阿彌陀佛": "${val}"`
      );
    }
  }
  i18n.setLang('zh-Hant');

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

test('Issue #256 & #269: 2.5D mode & cameraRig lock into 2.5D HD-2D side-scroll diorama view and align enemy depth', async () => {
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

test('Issue #269: Option B is normalized to Option A and proximity does not trigger turn-based encounter', async () => {
  const ctx = createMockCtx();
  // Simulate legacy saved setting with optionB
  ctx.save.set('settings', { muralProtoUnlocked: true, muralProtoMode: 'optionB' });
  const proto = createMuralPrototype(ctx);

  assert.equal(normalizeMuralProtoMode('optionB'), 'optionA');
  assert.equal(proto.getMode(), 'optionA');
  assert.equal(ctx.state.muralProtoMode, 'optionA');

  await proto.launchDemo('optionB');
  assert.equal(proto.getMode(), 'optionA');
  assert.equal(ctx.state.muralProtoMode, 'optionA');

  const worldEnemy = ctx.enemies.getActiveEnemies()[0];
  // Move enemy within 4.5m of player (2000, 0, 28) — should NOT trigger turn-based battle
  worldEnemy.pos.x = 2000;
  worldEnemy.pos.z = 25;
  proto.update(0.1);

  const bState = proto.getBattleState();
  assert.equal(bState.active, false, 'Approaching enemy in 2.5D mode should stay in real-time scroll action without triggering turn-based battle');
});
