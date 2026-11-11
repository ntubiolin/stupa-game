import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { createBus } from '../src/core/events.js';
import { MANGYUL_MAP } from '../src/data/maps/mangyul.js';
import { createPlayer } from '../src/player/player.js';
import { createMangyulMap, mangyulHeightFn } from '../src/world/maps/mangyul.js';

test('Kyirong bridge keeps the player on its deck and inside both suspension rails (#291)', t => {
  const state = {
    mode: 'play', zone: 'mangyul', uiOpen: false, elapsed: 0,
    player: {
      position: new THREE.Vector3(3000, 0, 72), velocity: new THREE.Vector3(),
      heading: Math.PI, isMoving: false, action: 'idle', hp: 100,
    },
  };
  const ctx = {
    THREE, scene: new THREE.Group(), state, config: CONFIG, bus: createBus(),
    colliders: [], interactables: [],
  };
  const map = createMangyulMap(ctx, { presentationOnly: true });
  t.after(() => map.dispose());
  ctx.world = {
    getMap: id => id === 'mangyul' ? MANGYUL_MAP : null,
    getHeight: (x, z) => map.getHeight(x, z),
    isCombatZone: () => true,
  };
  const player = createPlayer(ctx);

  const bridge = map.group.getObjectByName('KyirongSuspensionBridge');
  assert.ok(bridge);
  const deck = bridge.children.find(child => child.geometry?.type === 'BoxGeometry'
    && child.geometry.parameters.width === 3.8
    && child.geometry.parameters.height === 0.22
    && child.geometry.parameters.depth === 6.2);
  assert.ok(deck, 'expected the rendered Kyirong bridge deck');
  const renderedDeckTop = bridge.position.y + deck.position.y + deck.geometry.parameters.height / 2;
  assert.ok(renderedDeckTop - mangyulHeightFn(3000, 67) > 0.38,
    'the visual deck must sit above the stream terrain');
  assert.equal(map.getHeight(3000, 67), renderedDeckTop,
    'walkable height must match the rendered deck top');

  const railColliders = ctx.colliders.filter(collider => collider.zone === 'mangyul'
    && collider.type === 'box'
    && Math.abs(collider.minZ - 62.325) < 1e-9
    && Math.abs(collider.maxZ - 71.675) < 1e-9);
  assert.equal(railColliders.length, 2, 'both suspension rails and pylon rows need collision');

  bridge.updateWorldMatrix(true, true);
  const raycaster = new THREE.Raycaster(undefined, new THREE.Vector3(0, -1, 0));
  for (const z of [62.9, 63.65, 70.35, 71.1]) {
    raycaster.set(new THREE.Vector3(3000, 10, z), new THREE.Vector3(0, -1, 0));
    const surface = raycaster.intersectObject(bridge, true)[0];
    assert.ok(surface, `expected visible bridge surface at z=${z}`);
    assert.ok(Math.abs(surface.point.y - map.getHeight(3000, z)) < 1e-5,
      `visible surface and walk height differ at z=${z}: ${surface.point.y} vs ${map.getHeight(3000, z)}`);
  }

  for (const [from, to] of [[72, 62], [62, 72]]) {
    state.player.position.set(3000, map.getHeight(3000, from), from);
    const dz = (to - from) / 40;
    for (let step = 0; step < 40; step++) {
      player.moveWithCollisions(0, dz);
      if (state.player.position.z >= 63.525 && state.player.position.z <= 70.475) {
        assert.equal(state.player.position.y, renderedDeckTop);
      }
    }
    assert.ok(Math.abs(state.player.position.z - to) < 1e-4,
      `expected an unobstructed crossing from ${from} to ${to}, got z=${state.player.position.z}`);
  }

  for (const side of [-1, 1]) {
    state.player.position.set(3000, renderedDeckTop, 67);
    player.moveWithCollisions(side * 4, 0);
    const innerLimit = 3000 + side * (1.6 - CONFIG.PLAYER.radius);
    assert.ok(side * (state.player.position.x - innerLimit) <= 1e-4,
      `${side < 0 ? 'west' : 'east'} rail must contain the player, got x=${state.player.position.x}`);
    assert.equal(state.player.position.y, renderedDeckTop);

    state.player.position.set(3000 + side * 3, mangyulHeightFn(3000 + side * 3, 67), 67);
    player.moveWithCollisions(-side * 6, 0);
    const outerLimit = 3000 + side * (2.12 + CONFIG.PLAYER.radius);
    assert.ok(side * (state.player.position.x - outerLimit) >= -1e-4,
      `${side < 0 ? 'west' : 'east'} pylon row must prevent side entry, got x=${state.player.position.x}`);
    assert.equal(state.player.position.y, mangyulHeightFn(state.player.position.x, 67));
  }
});
