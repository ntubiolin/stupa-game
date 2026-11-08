import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { YARLUNG_MAP } from '../src/data/maps/yarlung.js';
import { createPlayer } from '../src/player/player.js';
import { createMap } from '../src/world/maps/yarlung.js';

function createEventBus() {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
      return () => {};
    },
    emit(event, payload) {
      const arr = listeners.get(event) || [];
      for (const fn of [...arr]) fn(payload);
    },
  };
}

test('Yarlung river bridge elevates deck height, ramps smoothly to both banks, and blocks side railing pass-through (#188)', () => {
  const bus = createEventBus();
  const state = {
    mode: 'play',
    zone: 'yarlung',
    uiOpen: false,
    elapsed: 0,
    player: {
      position: new THREE.Vector3(4000, 0, 81),
      velocity: new THREE.Vector3(),
      heading: Math.PI,
      isMoving: false,
      action: 'idle',
      hp: 100,
    },
  };

  const ctx = {
    THREE,
    scene: new THREE.Group(),
    state,
    config: CONFIG,
    bus,
    colliders: [],
    interactables: [],
  };

  const yarlung = createMap(ctx);
  ctx.world = {
    getMap: (id) => (id === 'yarlung' ? YARLUNG_MAP : null),
    getHeight: (x, z) => yarlung.getHeight(x, z),
    isCombatZone: () => true,
  };

  const player = createPlayer(ctx);

  // 1. Bridge 3D group and North/South side railing box colliders exist
  const bridgeGroup = yarlung.group.getObjectByName('YarlungRiverBridge');
  assert.ok(bridgeGroup, 'Expected YarlungRiverBridge group in Yarlung map');
  const bridgeBoxColliders = ctx.colliders.filter(
    (c) => c.zone === 'yarlung' && c.type === 'box',
  );
  assert.equal(
    bridgeBoxColliders.length,
    2,
    'Expected 2 box colliders for the North and South bridge railings',
  );

  // 2. Riverbed north & south of the bridge remains at shallow river height (0.05m),
  //    while the bridge deck at (4000, 42) is elevated to 0.52m (flush with deck top)
  assert.equal(yarlung.getHeight(4000, 35), 0.05);
  assert.equal(yarlung.getHeight(4000, 50), 0.05);
  assert.equal(yarlung.getHeight(4000, 42), 0.52);
  assert.equal(yarlung.getHeight(3995, 42), 0.52);
  assert.equal(yarlung.getHeight(4005, 42), 0.52);

  // 3. Approach ramps on West (x: 3993.1 -> 3994.5) and East (x: 4005.5 -> 4006.9)
  //    interpolate smoothly without abrupt vertical steps
  let prevWestH = yarlung.getHeight(3992.5, 42);
  assert.ok(prevWestH < 0.2, `Expected West bank height < 0.2m, got ${prevWestH}`);
  for (let x = 3993.2; x <= 3994.5; x += 0.25) {
    const h = yarlung.getHeight(x, 42);
    assert.ok(h >= prevWestH, `Expected West ramp height to rise monotonically at x=${x}`);
    assert.ok(h - prevWestH < 0.15, `Expected smooth ramp step at x=${x}, delta=${h - prevWestH}`);
    prevWestH = h;
  }

  let prevEastH = yarlung.getHeight(4005.5, 42);
  assert.equal(prevEastH, 0.52);
  for (let x = 4005.75; x <= 4007.0; x += 0.25) {
    const h = yarlung.getHeight(x, 42);
    assert.ok(h <= prevEastH, `Expected East ramp height to descend monotonically at x=${x}`);
    assert.ok(prevEastH - h < 0.15, `Expected smooth ramp step at x=${x}, delta=${prevEastH - h}`);
    prevEastH = h;
  }

  // 4. Crossing the bridge East-West along the roadway (z = 42) is completely unobstructed
  //    and lifts the player onto the 0.52m deck instead of clipping through at riverbed level
  state.player.position.set(3992.0, yarlung.getHeight(3992.0, 42), 42.0);
  for (let step = 0; step < 32; step++) {
    player.moveWithCollisions(0.5, 0);
    if (Math.abs(state.player.position.x - 4000) <= 5.4) {
      assert.equal(
        state.player.position.y,
        0.52,
        `Player on bridge deck at x=${state.player.position.x} must stand at y=0.52`,
      );
    }
  }
  assert.ok(
    Math.abs(state.player.position.x - 4008.0) < 1e-4,
    `Expected unobstructed East-West crossing to x=4008, got ${state.player.position.x}`,
  );
  assert.ok(
    state.player.position.y < 0.2,
    `Expected player to descend back to East bank height (< 0.2m), got ${state.player.position.y}`,
  );

  // 5. Walking North from the South river/entrance toward the bridge side (x = 4000, z: 46 -> 38)
  //    is blocked by the South railing collider and does not pass through the bridge body
  state.player.position.set(4000.0, yarlung.getHeight(4000.0, 46.0), 46.0);
  player.moveWithCollisions(0, -8.0);
  assert.ok(
    state.player.position.z >= 43.95 + CONFIG.PLAYER.radius - 1e-4,
    `Expected South bridge railing to block northward pass-through, got z=${state.player.position.z}`,
  );
  assert.equal(
    state.player.position.y,
    0.05,
    'Player stopped outside South bridge railing should remain at riverbed height (0.05m)',
  );

  // 6. Walking South from the North river toward the bridge side (x = 4000, z: 38 -> 46)
  //    is blocked by the North railing collider
  state.player.position.set(4000.0, yarlung.getHeight(4000.0, 38.0), 38.0);
  player.moveWithCollisions(0, 8.0);
  assert.ok(
    state.player.position.z <= 40.05 - CONFIG.PLAYER.radius + 1e-4,
    `Expected North bridge railing to block southward pass-through, got z=${state.player.position.z}`,
  );
  assert.equal(
    state.player.position.y,
    0.05,
    'Player stopped outside North bridge railing should remain at riverbed height (0.05m)',
  );

  // 7. While standing on the bridge deck (4000, 42), walking North or South into the railings
  //    keeps the player contained on the bridge deck (y = 0.52)
  state.player.position.set(4000.0, yarlung.getHeight(4000.0, 42.0), 42.0);
  player.moveWithCollisions(0, -4.0);
  assert.ok(
    state.player.position.z >= 40.42 + CONFIG.PLAYER.radius - 1e-4,
    `Expected North railing inner face to contain player on bridge deck, got z=${state.player.position.z}`,
  );
  assert.equal(state.player.position.y, 0.52);

  state.player.position.set(4000.0, yarlung.getHeight(4000.0, 42.0), 42.0);
  player.moveWithCollisions(0, 4.0);
  assert.ok(
    state.player.position.z <= 43.58 - CONFIG.PLAYER.radius + 1e-4,
    `Expected South railing inner face to contain player on bridge deck, got z=${state.player.position.z}`,
  );
  assert.equal(state.player.position.y, 0.52);
});
