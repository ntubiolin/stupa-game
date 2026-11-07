import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createCameraRig } from '../src/player/cameraRig.js';

function installGlobal(t, name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  });
}

function harness({ zone = 'wild', radius = 35, settings = {}, stateMode, save = true } = {}) {
  const listeners = new Map();
  const events = [];
  const writes = [];
  let savedSettings = { musicVolume: 0.4, ...settings };
  const ctx = {
    THREE,
    camera: new THREE.PerspectiveCamera(),
    state: {
      mode: 'play', zone, elapsed: 10, cameraAutoFollow: stateMode,
      player: { position: new THREE.Vector3(radius, 0, 0), heading: 0, isMoving: true },
    },
    config: { WORLD: { stupaColliderRadius: 20, buildingsInnerRadius: 48 }, WILD: { origin: { x: 0, z: 0 }, walkRadius: 100 } },
    input: { move: { x: 0, y: 1 }, look: { dx: 0, dy: 0 }, zoom: 0, lastLookTime: -1e9, pressed: () => false },
    i18n: { lang: 'en' },
    interactables: [], colliders: [],
    bus: {
      on(event, fn) {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(fn);
      },
      emit(event, payload) {
        events.push({ event, payload });
        for (const fn of listeners.get(event) || []) fn(payload);
      },
    },
  };
  if (save) ctx.save = {
    get: () => savedSettings,
    set(key, value) { writes.push({ key, value }); savedSettings = value; },
  };
  const rig = createCameraRig(ctx);
  ctx.bus.emit('zone:change'); // Finish intro and initialize camera at the player.
  ctx.state.player.heading = 0.8;
  function advance(seconds = 1) {
    const frames = Math.ceil(seconds * 60);
    for (let i = 0; i < frames; i++) {
      ctx.state.elapsed += seconds / frames;
      rig.update(seconds / frames);
    }
  }
  return { ctx, rig, events, writes, advance };
}

test('defaults to smart, persists merged settings, and keeps yaw locked in smart and off modes', () => {
  const { ctx, rig, writes, events, advance } = harness();
  assert.equal(ctx.cameraRig, rig);
  assert.equal(rig.getAutoFollowMode(), 'smart');
  assert.equal(ctx.state.cameraAutoFollow, 'smart');
  // In default 'smart' mode, normal movement in wilderness never overrides yaw
  advance(5);
  assert.equal(rig.getYaw(), 0);
  assert.equal(rig.setAutoFollowMode('off'), 'off');
  assert.equal(ctx.state.cameraAutoFollow, 'off');
  assert.deepEqual(writes.at(-1), { key: 'settings', value: { musicVolume: 0.4, cameraAutoFollow: 'off' } });
  assert.deepEqual(events.at(-1).payload, { text: 'Camera: Fixed Angle (Auto-Follow Off)', kind: 'info' });
  advance(5);
  assert.equal(rig.getYaw(), 0);
  assert.equal(rig.toggleAutoFollow(), 'smart');
  assert.equal(ctx.save.get().cameraAutoFollow, 'smart');
  rig.setYaw(0.4);
  assert.ok(Math.abs(rig.getYaw() - 0.4) < 1e-12);
  rig.setAutoFollowMode('on', true);
  assert.equal(rig.toggleAutoFollow(true), 'off');
  assert.equal(rig.isFrontCam(), false);
  assert.equal(rig.toggleFrontCam(), true);
  assert.equal(rig.setFrontCam(false, true), false);
});

test('initial modes use save then state, and invalid modes normalize to smart', () => {
  for (const [options, expected] of [
    [{ settings: { cameraAutoFollow: 'off' }, stateMode: 'on' }, 'off'],
    [{ stateMode: 'on' }, 'on'],
    [{ settings: { cameraAutoFollow: 'invalid' }, stateMode: 'off' }, 'smart'],
    [{ save: false }, 'smart'],
  ]) {
    const { rig, ctx } = harness(options);
    assert.equal(rig.getAutoFollowMode(), expected);
    assert.equal(ctx.state.cameraAutoFollow, expected);
    rig.setAutoFollowMode('invalid', true);
    assert.equal(rig.getAutoFollowMode(), 'smart');
  }
});

test('bus controls and external settings sync silently without a persistence loop', () => {
  const { ctx, rig, writes, events } = harness();
  ctx.bus.emit('camera:setAutoFollow', { mode: 'off', silent: true });
  assert.equal(rig.getAutoFollowMode(), 'off');
  assert.equal(writes.length, 1);
  ctx.bus.emit('settings:changed', { cameraAutoFollow: 'on' });
  assert.equal(rig.getAutoFollowMode(), 'on');
  assert.equal(ctx.state.cameraAutoFollow, 'on');
  assert.equal(writes.length, 1);
  ctx.save.set('settings', { cameraAutoFollow: 'smart' });
  ctx.bus.emit('settings:changed');
  assert.equal(rig.getAutoFollowMode(), 'smart');
  ctx.bus.emit('settings:changed', { cameraAutoFollow: 'bad' });
  assert.equal(rig.getAutoFollowMode(), 'smart');
  assert.equal(events.filter(({ event }) => event === 'toast').length, 0);
  ctx.i18n.lang = 'zh-Hant';
  rig.setAutoFollowMode('smart');
  assert.equal(events.at(-1).payload.text, '視角模式：智慧防暈運鏡');
});

test('smart locks for nearby living enemies and distant alerted enemies through all enemy sources', () => {
  for (const source of ['active', 'list', 'state']) {
    for (const enemy of [
      { state: 'idle', hp: 10, pos: { x: 53, z: 0 } },
      { state: 'chase', hp: 10, position: { x: 100, z: 0 } },
      { state: 'notice', x: 100, z: 0 },
    ]) {
      const { ctx, rig, advance } = harness();
      if (source === 'active') ctx.enemies = { getActiveEnemies: () => [enemy] };
      if (source === 'list') ctx.enemies = { list: () => [enemy] };
      if (source === 'state') ctx.state.enemies = [enemy];
      assert.equal(rig.isCombatLocked(), true);
      advance(5);
      assert.equal(rig.getYaw(), 0);
    }
  }
});

test('dead, liberated, calmed and distant idle enemies do not lock the camera', () => {
  const { ctx, rig, advance } = harness({ stateMode: 'on' });
  ctx.state.enemies = [null,
    { state: 'chase', hp: 0, x: 35, z: 0 },
    { state: 'liberated', hp: 10, x: 35, z: 0 },
    { state: 'calmed', hp: 10, x: 35, z: 0 },
    { state: 'idle', hp: 10, x: 53.01, z: 0 },
  ];
  assert.equal(rig.isCombatLocked(), false);
  advance();
  assert.ok(rig.getYaw() > 0);
});

test('every combat event locks for four seconds, refreshes the timer and records combat time', () => {
  for (const event of ['player:attack', 'player:chant', 'mantra:cast', 'skill:cast', 'vitals:damage']) {
    const { ctx, rig, advance } = harness({ stateMode: 'on' });
    ctx.bus.emit(event);
    assert.equal(ctx.state.lastCombatTime, ctx.state.elapsed);
    assert.equal(rig.isCombatLocked(), true);
    advance(3);
    assert.equal(rig.getYaw(), 0);
    ctx.bus.emit(event);
    advance(3.9);
    assert.equal(rig.isCombatLocked(), true);
    assert.equal(rig.getYaw(), 0);
    advance(0.2);
    assert.equal(rig.isCombatLocked(), false);
    assert.ok(rig.getYaw() > 0);
  }
});

test('boss and explicit combat targets lock smart follow', (t) => {
  const { ctx, rig, advance } = harness();
  for (const target of [ctx.state, ctx.state.player]) {
    target.combatTarget = {};
    assert.equal(rig.isCombatLocked(), true);
    advance();
    assert.equal(rig.getYaw(), 0);
    delete target.combatTarget;
  }
  ctx.state.boss = { active: true };
  assert.equal(rig.isCombatLocked(), true);
  advance();
  assert.equal(rig.getYaw(), 0);
  ctx.state.boss.active = false;
  let hidden = false;
  installGlobal(t, 'document', {
    getElementById: (id) => id === 'boss-bar' ? { classList: { contains: () => hidden } } : null,
  });
  assert.equal(rig.isCombatLocked(), true);
  advance();
  assert.equal(rig.getYaw(), 0);
  hidden = true;
  assert.equal(rig.isCombatLocked(), false);
});

test('backward, strafe and large heading differences never feed back into smart yaw', () => {
  for (const [move, heading] of [
    [{ x: 0, y: -1 }, Math.PI],
    [{ x: 1, y: 0 }, Math.PI / 2],
    [{ x: 0.7, y: 0.6 }, 0.8],
    [{ x: 0.2, y: 0.3 }, 0.8],
    [{ x: 0, y: 1 }, Math.PI * 0.6],
  ]) {
    const { ctx, rig, advance } = harness();
    ctx.input.move = move;
    ctx.state.player.heading = heading;
    advance(8);
    assert.equal(rig.getYaw(), 0);
  }
});

test('classic on mode follows only when out of combat, forward-only, and >4s after mouse look; smart and off keep mouse angle', () => {
  const { ctx, rig, advance } = harness();
  // In 'smart' mode, manual mouse orbit sets yaw and subsequent movement never resets it
  ctx.input.look.dx = 10;
  ctx.input.lastLookTime = performance.now() - 10000;
  rig.update(1 / 60);
  const manualYaw = rig.getYaw();
  assert.ok(Math.abs(manualYaw - (-0.048)) < 1e-12);
  ctx.input.look.dx = 0;
  advance(10);
  assert.equal(rig.getYaw(), manualYaw);

  // Switch to 'on' mode: while combat-locked, yaw stays locked
  rig.setAutoFollowMode('on', true);
  ctx.bus.emit('player:attack');
  advance(2);
  assert.equal(rig.getYaw(), manualYaw);

  // Once combat lock expires (>4s), 'on' mode gently follows forward movement
  advance(3);
  assert.ok(rig.getYaw() > manualYaw);
});

test('smart holds yaw around the stupa base and lamp ring', () => {
  for (const radius of [21, 22, 24, 25.5]) {
    const { ctx, rig } = harness({ zone: 'stupa', radius });
    for (let frame = 0; frame < 600; frame++) {
      const angle = frame * 0.006;
      ctx.state.player.position.set(radius * Math.cos(angle), 0, radius * Math.sin(angle));
      ctx.state.player.heading = angle;
      rig.update(1 / 60);
      assert.equal(rig.getYaw(), 0);
    }
  }
});

test('nearby interactables and pairs of colliders stabilize on-mode follow', () => {
  for (const objects of [
    { interactables: [{ x: 38.8, z: 0 }] },
    { interactables: [{ position: { x: 35, z: 3 } }] },
    { colliders: [{ x: 36, z: 0 }, { position: { x: 34, z: 0 } }] },
  ]) {
    const { ctx, rig, advance } = harness({ stateMode: 'on' });
    Object.assign(ctx, objects);
    advance(5);
    assert.equal(rig.getYaw(), 0);
  }
  const { ctx, rig, advance } = harness({ stateMode: 'on' });
  ctx.colliders = [{ x: 36, z: 0 }];
  ctx.interactables = [{ x: 35, z: 0, zone: 'stupa' }];
  advance();
  assert.ok(rig.getYaw() > 0);
});

test('outside dense clusters, on mode waits 4s after mouse look and follows gently', () => {
  const { ctx, rig } = harness({ zone: 'stupa', stateMode: 'on' });
  ctx.input.lastLookTime = performance.now() - 3500;
  rig.update(0.1);
  assert.equal(rig.getYaw(), 0);
  ctx.input.lastLookTime = performance.now() - 4500;
  rig.update(0.1);
  assert.ok(Math.abs(rig.getYaw() - 0.8 * 0.1 * 0.85) < 1e-12);
});

test('stupa clearance preserves actual horizontal viewing direction, including after damping', () => {
  for (const [radius, heading] of [[22, -1.1], [22, -Math.PI / 2], [46, 1.1]]) {
    const { ctx, rig } = harness({ zone: 'stupa', radius });
    ctx.state.player.heading = heading;
    ctx.bus.emit('zone:change');
    rig.setAutoFollowMode('off', true);
    const forward = new THREE.Vector3();
    for (let frame = 0; frame < 180; frame++) {
      ctx.state.player.position.z += 0.005;
      rig.update(1 / 60);
      ctx.camera.getWorldDirection(forward);
      const actualYaw = Math.atan2(-forward.x, -forward.z);
      assert.ok(Math.abs(actualYaw - heading) < 1e-9, `view twisted: ${actualYaw} vs ${heading}`);
      const camR = Math.hypot(ctx.camera.position.x, ctx.camera.position.z);
      assert.ok(camR >= 20.6 - 1e-9 && camR <= 47.4 + 1e-9);
    }
  }
});

test('stupa look bias approaches its smaller target smoothly', () => {
  const { ctx, rig, advance } = harness({ zone: 'stupa', radius: 30 });
  ctx.state.player.isMoving = false;
  const looks = [];
  ctx.camera.lookAt = (look) => looks.push(look.clone());
  rig.update(1 / 60);
  assert.ok(looks[0].y > 1.45 && looks[0].y < 1.5);
  assert.ok(looks[0].x < 30 && looks[0].x > 29.99);
  advance(5);
  assert.ok(Math.abs(looks.at(-1).y - 2.1) < 1e-6);
  assert.ok(Math.abs(looks.at(-1).x - 29.68) < 1e-6);
});

test('hugging the inner kora boundary never sends the camera to the far side of the dome', () => {
  const { ctx, rig } = harness({ zone: 'stupa', radius: 20.35 });
  ctx.state.player.heading = -Math.PI / 2;
  ctx.bus.emit('zone:change');
  const previous = ctx.camera.position.clone();
  for (let frame = 0; frame < 300; frame++) {
    rig.update(1 / 60);
    assert.ok(ctx.camera.position.distanceTo(previous) < 0.1);
    assert.ok(Math.hypot(ctx.camera.position.x, ctx.camera.position.z) > ctx.config.WORLD.stupaColliderRadius);
    assert.ok(ctx.camera.position.x > 20);
    previous.copy(ctx.camera.position);
  }
});

test('input action toggles the camera lock and respects open UI', () => {
  const { ctx, rig } = harness();
  ctx.input.pressed = (action) => action === 'toggleCameraLock';
  rig.update(1 / 60);
  assert.equal(rig.getAutoFollowMode(), 'off');
  ctx.state.uiOpen = true;
  rig.update(1 / 60);
  assert.equal(rig.getAutoFollowMode(), 'off');
});

test('keyboard shortcuts respect mode, editing, repeats and UI; mapped input does not double toggle', (t) => {
  let keydown;
  installGlobal(t, 'window', { addEventListener: (event, fn) => { if (event === 'keydown') keydown = fn; } });
  installGlobal(t, 'document', { activeElement: null, getElementById: () => null });
  const { ctx, rig } = harness();
  function press(extra = {}) {
    keydown({ code: 'KeyL', preventDefault() {}, ...extra });
  }
  for (const activeElement of [{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { isContentEditable: true }]) {
    document.activeElement = activeElement;
    press();
    assert.equal(rig.getAutoFollowMode(), 'smart');
  }
  document.activeElement = null;
  for (const flag of ['uiOpen', 'customizing']) {
    ctx.state[flag] = true;
    press();
    assert.equal(rig.getAutoFollowMode(), 'smart');
    ctx.state[flag] = false;
  }
  ctx.state.mode = 'intro';
  press();
  assert.equal(rig.getAutoFollowMode(), 'smart');
  ctx.state.mode = 'play';
  press({ repeat: true });
  press({ code: 'KeyC' });
  assert.equal(rig.getAutoFollowMode(), 'smart');
  press();
  assert.equal(rig.getAutoFollowMode(), 'off');
  ctx.input.pressed = (action) => action === 'toggleCameraLock';
  rig.update(1 / 60);
  assert.equal(rig.getAutoFollowMode(), 'off');
  ctx.input.pressed = () => false;
  press({ code: 'KeyC', altKey: true });
  assert.equal(rig.getAutoFollowMode(), 'smart');
});

test('front camera can follow in off mode but smart combat still holds yaw', () => {
  const { ctx, rig, advance } = harness();
  rig.setAutoFollowMode('off', true);
  rig.setFrontCam(true, true);
  const frontYaw = rig.getYaw();
  ctx.state.player.heading += 0.3;
  advance();
  assert.notEqual(rig.getYaw(), frontYaw);
  rig.setAutoFollowMode('smart', true);
  ctx.bus.emit('player:attack');
  const lockedYaw = rig.getYaw();
  ctx.state.player.heading += 0.3;
  advance();
  assert.equal(rig.getYaw(), lockedYaw);
});
