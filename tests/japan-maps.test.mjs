import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { JAPAN_CHAPTERS, JAPAN_MAP_IDS, isJapanMap } from '../src/data/japan.js';
import { MAPS } from '../src/data/maps.js';
import { resolveWaypointCoords } from '../src/gameplay/waypoints.js';
import { createPlayer } from '../src/player/player.js';
import { WORLD_ROUTE_NODES } from '../src/ui/worldmap.js';
import { buildJapanWaypoint, setJapanWaypointUnlocked } from '../src/world/japanArchitecture.js';

const mapIds = ['qinglong', 'toji', 'kii', 'koyasan', 'kongobuji', 'okunoin'];
const campaignAnchors = {
  qinglong: [[-9, 25], [0, 18], [7, 18]],
  toji: [[-9, 42], [0, 22], [0, -22], [-22, 32], [20, 26], [-21, -18]],
  kii: [[0, 42], [-10, 29], [12, 8], [0, -22], [0, -30]],
  koyasan: [[-54, 30], [-40, -8], [-57, 21], [-44, 25], [-27, 20], [-40, 16]],
  kongobuji: [[-9, 24], [0, 15], [-16, 1], [16, 1]],
  okunoin: [[-5, 44], [0, 9], [0, -9], [6, -26], [0, -47]],
};

async function loadMap(id) {
  const state = {
    mode: 'play',
    zone: id,
    uiOpen: false,
    player: { position: new THREE.Vector3(), velocity: new THREE.Vector3(), heading: 0 },
  };
  const ctx = {
    THREE,
    state,
    scene: new THREE.Group(),
    bus: { on() {}, emit() {} },
    config: CONFIG,
    colliders: [],
    interactables: [],
  };
  const { createMap } = await MAPS[id].load();
  const instance = createMap(ctx);
  ctx.world = {
    getMap: id => MAPS[id],
    getHeight: instance.getHeight,
    isCombatZone: () => false,
  };
  return { ctx, instance };
}

// Flood-fill a one-metre grid after expanding every collider by the player's radius.
function reachablePositions(map, colliders) {
  const radius = CONFIG.PLAYER.radius;
  const { x: ox, z: oz } = map.origin;
  const size = Math.ceil(map.walkRadius) * 2 + 1;
  const center = Math.floor(size / 2);
  const indexOf = (x, z) => (z + center) * size + x + center;
  const blocked = new Uint8Array(size * size);
  const visited = new Uint8Array(size * size);
  for (let z = -center; z <= center; z++) {
    for (let x = -center; x <= center; x++) {
      const wx = x + ox;
      const wz = z + oz;
      if (Math.hypot(x, z) >= map.walkRadius - radius || colliders.some(c => {
        if (c.type === 'circle') return Math.hypot(wx - c.x, wz - c.z) < c.r + radius;
        const dx = Math.max(0, c.minX - wx, wx - c.maxX);
        const dz = Math.max(0, c.minZ - wz, wz - c.maxZ);
        return Math.hypot(dx, dz) < radius;
      })) blocked[indexOf(x, z)] = 1;
    }
  }
  const { x, z } = map.spawns.default;
  const start = [Math.round(x - ox), Math.round(z - oz)];
  assert.equal(blocked[indexOf(...start)], 0, 'Default spawn is unobstructed');
  const queue = [start];
  visited[indexOf(...start)] = 1;
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i];
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx;
      const nz = z + dz;
      const index = indexOf(nx, nz);
      if (blocked[index] || visited[index]) continue;
      visited[index] = 1;
      queue.push([nx, nz]);
    }
  }
  return queue;
}

test('Japan route nodes and reciprocal gates follow all six chapters', () => {
  assert.deepEqual(JAPAN_MAP_IDS, mapIds);
  assert.equal(isJapanMap('stupa'), false);
  assert.deepEqual(WORLD_ROUTE_NODES.filter(node => node.japanOnly && !node.japanSide).map(node => node.id), mapIds);
  for (const [index, { mapId, origin }] of JAPAN_CHAPTERS.entries()) {
    const map = MAPS[mapId];
    assert.deepEqual(map.origin, origin);
    assert.ok(resolveWaypointCoords(map));
    assert.ok(map.spawns.default && map.spawns.teleport);
    const previous = mapIds[index - 1] ?? 'stupa';
    assert.ok(map.gates.some(gate => gate.to === previous && !gate.chapterRequired));
    const next = mapIds[index + 1];
    if (next) assert.ok(map.gates.some(gate => gate.to === next && gate.chapterRequired));
    else assert.ok(map.gates.some(gate => gate.to === 'stupa'));
    for (const gate of map.gates) assert.ok(MAPS[gate.to].spawns[gate.toGate]);
  }
});

test('All Japan entrances, waypoint landings, gates, and campaign clearings are reachable', async () => {
  for (const id of mapIds) {
    const { ctx, instance } = await loadMap(id);
    const map = MAPS[id];
    const waypoint = resolveWaypointCoords(map);
    const colliders = [...ctx.colliders, { type: 'circle', x: waypoint.x, z: waypoint.z, r: 0.72 }];
    for (const collider of ctx.colliders) {
      assert.equal(collider.zone, id);
      if (collider.type === 'box') {
        assert.ok(collider.minX < collider.maxX);
        assert.ok(collider.minZ < collider.maxZ);
      }
    }
    let pointLights = 0;
    instance.group.traverse(object => { if (object.isPointLight) pointLights++; });
    assert.equal(pointLights, 0, id + ' PointLight budget');

    const { x: ox, z: oz } = map.origin;
    const reachable = reachablePositions(map, colliders);
    for (const [name, { x, z }] of Object.entries(map.spawns)) {
      assert.ok(reachable.some(([px, pz]) => Math.hypot(px - (x - ox), pz - (z - oz)) < 0.95),
        id + ' spawn ' + name);
    }
    for (const gate of map.gates) {
      assert.ok(reachable.some(([x, z]) => Math.hypot(x - (gate.x - ox), z - (gate.z - oz)) < gate.radius),
        id + ' gate ' + gate.id);
    }
    for (const [x, z] of campaignAnchors[id]) {
      assert.ok(reachable.some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.8),
        id + ' campaign clearing at ' + x + ', ' + z);
    }
  }
});

test('Okunoin river crossing uses the elevated bridge and blocks movement through the river', async () => {
  const { ctx, instance } = await loadMap('okunoin');
  const { x } = MAPS.okunoin.origin;
  const player = createPlayer(ctx);
  const pos = ctx.state.player.position;

  pos.set(x, instance.getHeight(x, 10), 10);
  for (let i = 0; i < 20; i++) player.moveWithCollisions(0, -0.5);
  assert.ok(Math.abs(pos.z) < 1e-4);
  assert.ok(pos.y > 1, 'Player stands above the river on the deck');
  for (let i = 0; i < 20; i++) player.moveWithCollisions(0, -0.5);
  assert.ok(pos.z < -9.9);

  pos.set(x + 13, instance.getHeight(x + 13, 10), 10);
  for (let i = 0; i < 40; i++) player.moveWithCollisions(0, -0.5);
  assert.ok(pos.z >= 5.5 + CONFIG.PLAYER.radius - 1e-4, 'River bank prevents crossing away from the bridge');
});

test('Japanese temple foundations stop the player at their visible outer edge (#291)', async () => {
  const cases = [
    { map: 'toji', start: [0, 21], move: [0, -0.5], edge: ['z', 18.24 + CONFIG.PLAYER.radius], landmark: 'toji-kondo' },
    { map: 'toji', start: [9, 18], move: [-0.5, 0], edge: ['x', 3.8 + CONFIG.PLAYER.radius] },
    { map: 'toji', start: [0, -20], move: [0, -0.5], edge: ['z', -26.25 + CONFIG.PLAYER.radius], landmark: 'toji-kodo' },
    { map: 'koyasan', start: [-34, 19], move: [0, -0.5], edge: ['z', 16.705 + CONFIG.PLAYER.radius], landmark: 'koyasan:kondo' },
    { map: 'koyasan', start: [-50, -8], move: [0, -0.5], edge: ['z', -12.9 + CONFIG.PLAYER.radius] },
    { map: 'koyasan', start: [-3.2, 15], move: [0, -0.5], edge: ['z', 12.7 + CONFIG.PLAYER.radius] },
  ];

  for (const sample of cases) {
    const { ctx, instance } = await loadMap(sample.map);
    const { x: ox, z: oz } = MAPS[sample.map].origin;
    const player = createPlayer(ctx);
    const [lx, lz] = sample.start;
    ctx.state.player.position.set(ox + lx, instance.getHeight(ox + lx, oz + lz), oz + lz);
    for (let i = 0; i < 40; i++) player.moveWithCollisions(...sample.move);

    const [axis, localBoundary] = sample.edge;
    const localPosition = ctx.state.player.position[axis] - (axis === 'z' ? oz : ox);
    assert.ok(localPosition >= localBoundary - 1e-4,
      `${sample.map} player entered the temple foundation at ${axis}=${localPosition}`);
    if (sample.landmark) {
      const landmark = ctx.interactables.find(target => target.id === sample.landmark);
      assert.ok(landmark, `${sample.landmark} interactable exists`);
      const target = landmark.getPosition();
      assert.ok(ctx.state.player.position.distanceTo(target) <= landmark.radius,
        `${sample.landmark} remains reachable outside its collision footprint`);
    }
  }
});

test('Pilgrimage temple steps stop the player before the rendered stonework (#291)', async () => {
  const cases = [
    { map: 'qinglong', start: [0, 6], hallZ: -6, depth: 13 },
    { map: 'qinglong', start: [21, 22], hallZ: 11, depth: 12 },
    { map: 'kongobuji', start: [0, -12], hallZ: -24, depth: 13, stepProjection: 1.78 },
    { map: 'okunoin', start: [0, -47], hallZ: -57, depth: 10 },
  ];

  for (const sample of cases) {
    const { ctx, instance } = await loadMap(sample.map);
    const { x: ox, z: oz } = MAPS[sample.map].origin;
    const player = createPlayer(ctx);
    const [lx, lz] = sample.start;
    ctx.state.player.position.set(ox + lx, instance.getHeight(ox + lx, oz + lz), oz + lz);
    for (let i = 0; i < 40; i++) player.moveWithCollisions(0, -0.5);

    const stepEdge = sample.hallZ + sample.depth / 2 + (sample.stepProjection ?? 1.615);
    const localZ = ctx.state.player.position.z - oz;
    assert.ok(localZ >= stepEdge + CONFIG.PLAYER.radius - 1e-4,
      `${sample.map} player entered the hall steps at z=${localZ}`);
  }
});

test('Tō-ji landmark actions run through the selected interactable', async () => {
  const { ctx, instance } = await loadMap('toji');
  const kondo = ctx.interactables.find(target => target.id === 'toji-kondo');
  const restores = [];
  ctx.bus.emit = (event, payload) => {
    if (event === 'vitals:restore') restores.push(payload);
  };
  ctx.state.player.position.copy(kondo.getPosition());
  ctx.input = { pressed: action => action === 'interact' };
  instance.update(1 / 60);
  assert.equal(restores.length, 0, 'Map updates leave the input to the interaction system');
  kondo.onInteract();
  assert.deepEqual(restores, [{ hp: 30, mp: 30, source: 'toji' }]);
});

test('Japanese waypoints signal unlock with a lantern and no PointLights', () => {
  const marker = buildJapanWaypoint(false);
  const initial = marker.userData.paper.emissiveIntensity;
  setJapanWaypointUnlocked(marker, true);
  assert.ok(marker.userData.paper.emissiveIntensity > initial);
  marker.traverse(object => assert.equal(Boolean(object.isPointLight), false));
});

test('Cedar avenues keep tree placements across the near and distant batches', async () => {
  for (const id of ['qinglong', 'kii', 'koyasan', 'kongobuji', 'okunoin']) {
    const { instance } = await loadMap(id);
    let count = 0;
    instance.group.traverse(lod => {
      if (!lod.isLOD || !lod.name.endsWith(' cedars LOD')) return;
      assert.equal(lod.levels.length, 2);
      const [near, far] = lod.levels.map(level => level.object.children);
      assert.equal(near.length, 2);
      assert.equal(far.length, 2);
      for (let i = 0; i < near.length; i++) {
        assert.ok(near[i].isInstancedMesh && far[i].isInstancedMesh);
        assert.deepEqual(near[i].instanceMatrix.array, far[i].instanceMatrix.array);
        assert.ok(far[i].geometry.index.count < near[i].geometry.index.count * 0.5);
        assert.equal(far[i].castShadow, false);
      }
      assert.ok(near[1].material.alphaTest > 0);
      assert.equal(near[1].material.transparent, false);
      count++;
    });
    assert.ok(count > 1, id + ' has spatially separate cedar batches');
  }
});

test('Tō-ji and Mount Kōya switch cherry foliage through existing seasonal updates', async () => {
  for (const [id, name] of [['toji', 'Tō-ji weeping cherries'], ['koyasan', 'Mount Kōya cherries']]) {
    const { ctx, instance } = await loadMap(id);
    const { material, instanceMatrix } = instance.group.getObjectByName(name + ' foliage');
    for (const [season, texture] of [['spring', 'blossom'], ['summer', 'leaf'], ['winter', 'frost']]) {
      ctx.state.time = { season };
      instance.update(1 / 60);
      assert.equal(material.map.name, 'Japan ' + texture + ' foliage');
      assert.equal(instance.group.getObjectByName(name + ' foliage').instanceMatrix, instanceMatrix);
    }
  }
});
