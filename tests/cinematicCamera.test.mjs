import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createNarrativeCamera } from '../src/story/narrativeCamera.js';

function setup() {
  const document = new EventTarget();
  document.defaultView = new EventTarget();
  const indicator = { style: { setProperty() {} }, setAttribute() {}, remove() { this.removed = true; } };
  document.createElement = () => indicator;
  const canvas = new EventTarget();
  const captures = new Set();
  Object.assign(canvas, {
    ownerDocument: document,
    parentElement: { appendChild() {} },
    style: { touchAction: 'auto' },
    getBoundingClientRect: () => ({ left: 0, width: 400 }),
    setPointerCapture: id => captures.add(id),
    hasPointerCapture: id => captures.has(id),
    releasePointerCapture: id => captures.delete(id),
  });
  const ctx = {
    camera: new THREE.PerspectiveCamera(55),
    renderer: { domElement: canvas },
    config: {
      PLAYER: { radius: 0.35 },
      WORLD: { stupaColliderRadius: 19.9, walkRadius: 38 },
    },
    state: {
      zone: 'stupa',
      player: { position: new THREE.Vector3(0, 0, 31), heading: 0 },
    },
    colliders: [{ type: 'circle', x: 0, z: 0, r: 19.9 }],
    world: {
      getMap: () => ({ origin: { x: 2000, z: 0 }, walkRadius: 105 }),
      getHeight: (x, z, zone) => zone === 'pharping' ? 0.02 * z + 1 : 0,
    },
  };
  const camera = createNarrativeCamera(ctx);

  function fire(target, type, properties, origin) {
    const event = Object.assign(new Event(type, { cancelable: true }), properties);
    if (origin) Object.defineProperty(event, 'target', { value: origin });
    return target.dispatchEvent(event);
  }
  return {
    ctx, camera, canvas, indicator, captures,
    blur: () => document.defaultView.dispatchEvent(new Event('blur')),
    key: (type, code, tag, modifiers) => {
      const origin = tag && { closest: selector => selector.split(', ').includes(tag) };
      return fire(document.defaultView, type, { code, ...modifiers }, origin);
    },
    pointer: (type, pointerId, clientX, clientY, pointerType = 'mouse') => {
      fire(canvas, type, { pointerId, clientX, clientY, pointerType, button: 0 });
    },
  };
}

test('eye pose uses the shared player state and positive pitch looks up', () => {
  const { ctx, camera } = setup();
  const pose = { x: 0, y: 1.68, z: 31, yaw: 0, pitch: 0.34, fov: 55 };
  ctx.state.uiOpen = true;
  camera.setPose(pose);
  camera.update(0);
  assert.deepEqual(camera.getPose(), pose);
  assert.deepEqual(ctx.state.player.position.toArray(), [0, 0, 31]);
  const direction = ctx.camera.getWorldDirection(new THREE.Vector3());
  assert.ok(Math.abs(direction.y - Math.sin(pose.pitch)) < 1e-10);
  assert.ok(direction.z < 0);
});

test('keyboard walks at 4 m/s and either held Shift raises it to 6 m/s', () => {
  const { camera, key } = setup();
  function expectStep(distance) {
    const from = camera.getPose();
    camera.update(0.1);
    const to = camera.getPose();
    assert.ok(Math.abs(Math.hypot(to.x - from.x, to.z - from.z) - distance) < 1e-8);
  }

  key('keydown', 'KeyW');
  expectStep(0.4);
  key('keydown', 'KeyD');
  expectStep(0.4); // The diagonal has the same speed.
  assert.equal(key('keydown', 'ShiftLeft'), true);
  expectStep(0.6);
  key('keydown', 'ShiftRight');
  key('keyup', 'ShiftLeft');
  expectStep(0.6);
  key('keyup', 'ShiftRight');
  expectStep(0.4);
});

test('opening a modal or losing window focus clears held movement and Shift', () => {
  const { ctx, camera, key, blur } = setup();
  function expectForwardStep(distance) {
    const before = camera.getPose().z;
    camera.update(0.1);
    assert.ok(Math.abs(before - camera.getPose().z - distance) < 1e-8);
  }

  key('keydown', 'ShiftLeft');
  key('keydown', 'KeyW');
  ctx.state.uiOpen = true;
  expectForwardStep(0);
  ctx.state.uiOpen = false;
  expectForwardStep(0);
  key('keydown', 'KeyW');
  expectForwardStep(0.4);

  key('keydown', 'ShiftRight');
  expectForwardStep(0.6);
  blur();
  expectForwardStep(0);
  key('keydown', 'KeyW');
  expectForwardStep(0.4);
});

test('keyboard movement stays inside the plaza annulus and respects box colliders', () => {
  const { ctx, camera, key } = setup();
  key('keydown', 'KeyW');
  for (let i = 0; i < 100; i++) camera.update(0.1);
  assert.ok(Math.abs(camera.getPose().z - 20.25) < 1e-8);
  key('keyup', 'KeyW');
  key('keydown', 'ArrowDown');
  for (let i = 0; i < 100; i++) camera.update(0.1);
  assert.ok(Math.abs(camera.getPose().z - 37.65) < 1e-8);
  key('keyup', 'ArrowDown');

  camera.setPose({ z: 31 });
  ctx.colliders.push({ type: 'box', minX: -2, maxX: 2, minZ: 29.5, maxZ: 30 });
  key('keydown', 'KeyW');
  for (let i = 0; i < 20; i++) camera.update(0.1);
  assert.ok(camera.getPose().z >= 30.35 && camera.getPose().z < 30.6);
});

test('fast movement samples collisions between endpoints on slow frames', () => {
  const { ctx, camera, key } = setup();
  // Both ends of a full 0.6 m step clear this rock, but the straight path clips it.
  ctx.colliders.push({ type: 'circle', x: 0.49, z: 30.7, r: 0.2 });
  key('keydown', 'ShiftLeft');
  key('keydown', 'KeyW');
  camera.update(0.25);
  assert.ok(camera.getPose().z > 30.7);
});

test('Pharping movement honors its own map origin, boundary and terrain height', () => {
  const { ctx, camera, key } = setup();
  ctx.state.zone = 'pharping';
  camera.setPose({ x: 2000, y: 4.74, z: 103 });
  key('keydown', 'KeyS');
  key('keydown', 'ShiftLeft');
  for (let i = 0; i < 20; i++) camera.update(0.25);
  const pose = camera.getPose();
  assert.ok(Math.abs(pose.z - 104.65) < 1e-8);
  assert.equal(pose.x, 2000);
  assert.equal(pose.y, ctx.world.getHeight(pose.x, pose.z, 'pharping') + 1.68);
});

test('touch can walk and look simultaneously and modal clears pending input', () => {
  const { ctx, camera, key, pointer, indicator, captures, canvas } = setup();
  key('keydown', 'ShiftLeft');
  pointer('pointerdown', 1, 70, 140, 'touch');
  pointer('pointerdown', 2, 320, 140, 'touch');
  pointer('pointermove', 1, 70, 90, 'touch');
  pointer('pointermove', 2, 325, 120, 'touch');
  assert.equal(indicator.hidden, false);
  camera.update(0.1);
  const moved = camera.getPose();
  assert.ok(moved.z < 31 && moved.pitch > 0 && moved.yaw < 0);
  assert.ok(Math.abs(Math.hypot(moved.x, moved.z - 31) - 0.4) < 1e-8);

  ctx.state.uiOpen = true;
  camera.update(0.1);
  assert.equal(indicator.hidden, true);
  assert.equal(captures.size, 0);
  ctx.state.uiOpen = false;
  camera.update(0.1);
  assert.deepEqual(camera.getPose(), moved);

  camera.setEnabled(false);
  key('keydown', 'KeyW');
  camera.update(0.1);
  assert.deepEqual(camera.getPose(), moved);
  camera.dispose();
  assert.equal(indicator.removed, true);
  assert.equal(canvas.style.touchAction, 'auto');
});

test('mouse drag and keyboard look use the same yaw and pitch convention', () => {
  const { camera, key, pointer } = setup();
  pointer('pointerdown', 1, 100, 100);
  pointer('pointermove', 1, 120, 80);
  pointer('pointerup', 1, 120, 80);
  camera.update(0.02);
  const dragged = camera.getPose();
  assert.ok(dragged.yaw < 0 && dragged.pitch > 0);
  key('keydown', 'KeyJ');
  key('keydown', 'KeyK');
  camera.update(0.02);
  const keyboard = camera.getPose();
  assert.ok(keyboard.yaw > dragged.yaw && keyboard.pitch < dragged.pitch);
});

test('letters control the camera from HUD links and buttons while arrows stay native', () => {
  const { camera, key } = setup();
  assert.equal(key('keydown', 'KeyW', 'button'), false);
  assert.equal(key('keydown', 'KeyI', 'a'), false);
  assert.equal(key('keydown', 'ArrowRight', 'button'), true);
  assert.equal(key('keydown', 'ArrowLeft', 'a'), true);
  camera.update(0.1);
  const pose = camera.getPose();
  assert.equal(pose.x, 0);
  assert.ok(pose.z < 31 && pose.pitch > 0);
});

test('editable controls and browser key modifiers retain their native shortcuts', () => {
  const { camera, key } = setup();
  const pose = camera.getPose();
  for (const tag of ['input', 'select', 'textarea', '[contenteditable]']) {
    assert.equal(key('keydown', 'KeyW', tag), true);
    assert.equal(key('keydown', 'ArrowDown', tag), true);
    assert.equal(key('keydown', 'KeyI', tag), true);
  }
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey']) {
    assert.equal(key('keydown', 'KeyW', 'button', { [modifier]: true }), true);
  }
  camera.update(0.1);
  assert.deepEqual(camera.getPose(), pose);
});
