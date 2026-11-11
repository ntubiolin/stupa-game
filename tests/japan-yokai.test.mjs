import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { MAPS } from '../src/data/maps.js';
import { JAPAN_MAP_IDS, JAPAN_SIDE_MAP_IDS, isJapanMap } from '../src/data/japan.js';
import { WORLD_ROUTE_NODES } from '../src/ui/worldmap.js';
import { buildKappaModel, buildTenguModel, buildAkaOniModel } from '../src/gameplay/enemyModels/japanYokai.js';
import { JAPAN_YOKAI_ENEMIES } from '../src/data/enemies/japanYokai.js';

test('yokai maps remain optional branches of the six-chapter pilgrimage', () => {
  assert.deepEqual(JAPAN_MAP_IDS, ['qinglong', 'toji', 'kii', 'koyasan', 'kongobuji', 'okunoin']);
  assert.deepEqual(JAPAN_SIDE_MAP_IDS, ['kappaCreek', 'tenguForest', 'oniPass']);
  const kii = MAPS.kii;
  for (const id of JAPAN_SIDE_MAP_IDS) {
    assert.equal(isJapanMap(id), true);
    assert.ok(kii.gates.some(g => g.to === id));
    const map = MAPS[id];
    assert.equal(map.type, 'combat');
    assert.ok(map.gates.some(g => g.to === 'kii'));
    assert.ok(kii.spawns[`from-${id}`]);
    assert.ok(map.spawns['from-kii']);
    assert.notDeepEqual(map.spawns.default, map.waypoint);
    assert.ok(WORLD_ROUTE_NODES.some(n => n.id === id && n.japanSide));
  }
});

test('yokai maps load with reachable clear spawns and no PointLights', async () => {
  for (const id of JAPAN_SIDE_MAP_IDS) {
    const map = MAPS[id];
    const ctx = { THREE, state: { zone: 'kii' }, scene: new THREE.Group(), zoneGroups: { [id]: new THREE.Group() },
      colliders: [], interactables: [], world: { getMap: key => MAPS[key] } };
    const { createMap } = await map.load();
    const instance = createMap(ctx);
    for (const spawn of Object.values(map.spawns)) {
      assert.ok(Math.hypot(spawn.x - map.origin.x, spawn.z - map.origin.z) < map.walkRadius);
      assert.ok(!ctx.colliders.some(c => c.zone === id && c.type === 'circle' && Math.hypot(spawn.x-c.x, spawn.z-c.z) < c.r));
    }
    let pointLights = 0; instance.group.traverse(o => { if (o.isPointLight) pointLights++; });
    assert.equal(pointLights, 0);
    assert.equal(instance.getHeight(map.origin.x, map.origin.z), 0);
  }
});

test('each yokai has a distinct model and supported combat attacks', () => {
  const models = [buildKappaModel, buildTenguModel, buildAkaOniModel].map(fn => fn(THREE));
  assert.ok(models.every(model => model.root.isGroup && typeof model.animate === 'function'));
  assert.deepEqual(Object.keys(JAPAN_YOKAI_ENEMIES), ['kappa', 'tengu', 'akaOni']);
  const supported = new Set(['claw', 'ghostfire', 'redArrow', 'spinDash', 'smash', 'groundSlam']);
  for (const enemy of Object.values(JAPAN_YOKAI_ENEMIES)) {
    assert.ok(enemy.attacks.length >= 2);
    assert.ok(enemy.attacks.every(attack => supported.has(attack.id)));
  }
});
