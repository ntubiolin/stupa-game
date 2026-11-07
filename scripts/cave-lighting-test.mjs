import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { createBus } from '../src/core/events.js';
import { createSky } from '../src/world/sky.js';
import { createCameraRig } from '../src/player/cameraRig.js';
import { createDungeon, DOOR_WIDTH } from '../src/gameplay/dungeon.js';
import { createTermaCaves, TERMA_CAVE_DEFS } from '../src/gameplay/termaCaves.js';
import { createMap as createPharpingMap } from '../src/world/maps/pharping.js';
import { createMap as createYarlungMap } from '../src/world/maps/yarlung.js';
import { createMap as createChimphuMap } from '../src/world/maps/chimphu.js';
import { createMap as createTermaMap } from '../src/world/maps/terma.js';

function createTestContext() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 900);
  const flags = new Set();
  const state = {
    zone: 'stupa',
    timeOfDay: 0.5,
    dayLengthSeconds: 600,
    elapsed: 10.0,
    caveFactor: 0,
    caveCeilingY: null,
    time: {
      sunDir: new THREE.Vector3(0, 1, 0),
      nightFactor: 0,
      hour: 12,
    },
    player: {
      position: new THREE.Vector3(0, 0, 15),
      velocity: new THREE.Vector3(),
      heading: 0,
      stats: { level: 35 },
    },
    input: {
      pointerDeltaX: 0,
      pointerDeltaY: 0,
      wheelDelta: 0,
    },
  };

  const ctx = {
    THREE,
    scene,
    camera,
    config: CONFIG,
    state,
    bus: createBus(),
    renderer: { toneMappingExposure: 1.0 },
    input: {
      pressed: () => false,
      look: { dx: 0, dy: 0 },
      zoom: 0,
      lastLookTime: 0,
    },
    zoneGroups: {},
    interactables: [],
    colliders: [],
    world: {
      getMap: () => null,
      getHeight: () => 0,
      getTerrainHeight: () => 0,
    },
    zones: {
      registerCollider(c) {
        ctx.colliders.push(c);
      },
      registerInteractable(it) {
        ctx.interactables.push(it);
      },
      teleport(zoneId) {
        state.zone = zoneId;
      },
    },
    quests: {
      hasFlag: (f) => flags.has(f),
      setFlag: (f, val = true) => {
        if (val) flags.add(f);
        else flags.delete(f);
      },
      completeStep: () => {},
    },
    i18n: {
      t: (k) => k,
    },
    hud: {
      toast: () => {},
    },
  };
  return ctx;
}

function countPointLights(root) {
  let count = 0;
  root.traverse((obj) => {
    if (obj.isPointLight) count++;
  });
  return count;
}

// ---------------------------------------------------------------- 1. Sky System & Cave Profile Transitions
{
  const ctx = createTestContext();
  const sky = createSky(ctx);

  // Outdoor Stupa zone should have zero cave factor
  ctx.state.zone = 'stupa';
  ctx.state.player.position.set(0, 0, 15);
  for (let i = 0; i < 20; i++) sky.update(0.1);
  assert.ok(ctx.state.caveFactor < 0.01, 'outdoor stupa has caveFactor ~ 0');
  assert.equal(ctx.state.caveCeilingY, null, 'outdoor stupa has null caveCeilingY');

  // Subterranean Terma dungeon should fully enclose sky and activate subterranean lighting
  ctx.state.zone = 'terma';
  ctx.state.player.position.set(7000, 0, 0);
  for (let i = 0; i < 30; i++) sky.update(0.1);
  assert.ok(ctx.state.caveFactor > 0.95, 'terma reaches full caveFactor');
  assert.equal(ctx.state.caveCeilingY, 5.5, 'terma sets caveCeilingY to 5.5m');

  // Pharping Yangleshö Cave (2020, -46) & Asura Cave (1990, -91.5)
  ctx.state.zone = 'pharping';
  ctx.state.player.position.set(2020, 0, -46);
  for (let i = 0; i < 30; i++) sky.update(0.1);
  assert.ok(ctx.state.caveFactor > 0.85, 'Yangleshö Cave activates caveFactor');
  assert.equal(ctx.state.caveCeilingY, 6.0, 'Yangleshö Cave sets 6.0m ceiling clamp');

  ctx.state.player.position.set(1990, 0, -91.5);
  for (let i = 0; i < 30; i++) sky.update(0.1);
  assert.ok(ctx.state.caveFactor > 0.85, 'Asura Cave activates caveFactor');
  assert.equal(ctx.state.caveCeilingY, 7.4, 'Asura Cave sets 7.4m ceiling clamp');

  // Yarlung Sheldrak Crystal Cave (4061, -30)
  ctx.state.zone = 'yarlung';
  ctx.state.player.position.set(4061, 0, -30);
  for (let i = 0; i < 30; i++) sky.update(0.1);
  assert.ok(ctx.state.caveFactor > 0.85, 'Sheldrak Crystal Cave activates caveFactor');
  assert.equal(ctx.state.caveCeilingY, 6.4, 'Sheldrak Crystal Cave sets 6.4m ceiling clamp');

  // Chimphu Northern Retreat Caves (6000, -36)
  ctx.state.zone = 'chimphu';
  ctx.state.player.position.set(6000, 0, -36);
  for (let i = 0; i < 30; i++) sky.update(0.1);
  assert.ok(ctx.state.caveFactor > 0.85, 'Chimphu Northern Cave activates caveFactor');
  assert.equal(ctx.state.caveCeilingY, 8.2, 'Chimphu Northern Cave sets 8.2m ceiling clamp');

  // 5 Chapter Terma Caves (pharping, mangyul, yarlung, samye, chimphu)
  for (const def of TERMA_CAVE_DEFS) {
    ctx.state.zone = def.map;
    ctx.state.player.position.set(def.x, 0, def.z);
    for (let i = 0; i < 30; i++) sky.update(0.1);
    assert.ok(
      ctx.state.caveFactor > 0.85,
      `Terma Cave ${def.id} activates caveFactor (${ctx.state.caveFactor.toFixed(2)})`,
    );
    assert.equal(ctx.state.caveCeilingY, 5.0, `Terma Cave ${def.id} sets 5.0m ceiling clamp`);
  }
}

// ---------------------------------------------------------------- 2. Camera Rig Cave Ceiling Clamping
{
  const ctx = createTestContext();
  ctx.state.mode = 'play';
  ctx.state.zone = 'terma';
  ctx.state.player.position.set(1000, 0, 0);
  const rig = createCameraRig(ctx);

  // Pitch camera steeply and zoom out while caveCeilingY is null -> camera rises high (> 7m)
  ctx.state.caveFactor = 0;
  ctx.state.caveCeilingY = null;
  ctx.input.look.dy = 400;
  ctx.input.zoom = 1000;
  for (let i = 0; i < 40; i++) rig.update(0.1);
  assert.ok(ctx.camera.position.y > 7.0, 'outdoor camera can rise above 7m');

  // Inside a cave with 5.5m ceiling -> camera height is strictly clamped <= 5.5m
  ctx.state.caveFactor = 1.0;
  ctx.state.caveCeilingY = 5.5;
  for (let i = 0; i < 40; i++) rig.update(0.1);
  assert.ok(
    ctx.camera.position.y <= 5.501,
    `cave camera y (${ctx.camera.position.y.toFixed(3)}) is clamped to ceiling (5.5m)`,
  );
}

// ---------------------------------------------------------------- 3. Terma Underground Cavern Dungeon Enclosure & Lighting
{
  const ctx = createTestContext();
  assert.equal(DOOR_WIDTH, 5.8, 'DOOR_WIDTH exported for doorway clamping');
  const dungeon = createDungeon(ctx);
  const terma = createTermaMap(ctx);
  ctx.state.zone = 'terma';
  terma.update(0.016);

  const layout = dungeon.getLayout();
  assert.ok(layout && layout.rooms.length >= 6, 'Terma Floor 1 layout generated');

  const requiredNames = [
    'TermaAbyssFloor',
    'TermaCavernOuterShell',
    'TermaCeilingVaultInst',
    'TermaCeilingArchInst',
    'TermaRockCragsInst',
    'TermaStalactitesInst',
    'TermaBraziersInst',
    'TermaBrazierFlamesInst',
    'TermaWarmPoolsInst',
    'TermaCoolPoolsInst',
    'TermaLightShaftsInst',
    'TermaCavernDustMotes',
  ];
  for (const name of requiredNames) {
    const obj = ctx.scene.getObjectByName(name);
    assert.ok(obj, `Terma scene contains ${name}`);
  }

  const vaultInst = ctx.scene.getObjectByName('TermaCeilingVaultInst');
  const warmPoolsInst = ctx.scene.getObjectByName('TermaWarmPoolsInst');
  const coolPoolsInst = ctx.scene.getObjectByName('TermaCoolPoolsInst');
  assert.ok(
    vaultInst.count >= layout.rooms.length,
    'every Terma room and tunnel has a ceiling vault slab',
  );
  assert.ok(
    warmPoolsInst.count + coolPoolsInst.count >= layout.rooms.length * 5,
    'every Terma room has 4 corner + center warm/cool light pools',
  );

  // Verify clampPosition works cleanly with exported DOOR_WIDTH
  const startRoom = layout.startRoom;
  const clamped = dungeon.clampPosition({ x: startRoom.wx, z: startRoom.wz }, 0.5);
  assert.equal(clamped.x, startRoom.wx);
  assert.equal(clamped.z, startRoom.wz);
}

// ---------------------------------------------------------------- 4. Chapter Caves (Pharping, Yarlung, Chimphu) & Zero PointLights
{
  const ctx = createTestContext();
  createSky(ctx);
  createDungeon(ctx);
  const terma = createTermaMap(ctx);
  const pharping = createPharpingMap(ctx);
  const yarlung = createYarlungMap(ctx);
  const chimphu = createChimphuMap(ctx);

  // Pharping Yangleshö Cave: 7 butter lamps dynamically brighten floor light pools when lit
  assert.ok(ctx.scene.getObjectByName('YangleshoCave'), 'YangleshoCave group exists');
  assert.ok(ctx.scene.getObjectByName('YangleshoCaveDust'), 'YangleshoCaveDust particles exist');
  assert.ok(ctx.scene.getObjectByName('AsuraCaveArena'), 'AsuraCaveArena group exists');
  assert.equal(pharping.lampNiches.length, 7, '7 butter lamp niches in Yangleshö Cave');
  for (const lamp of pharping.lampNiches) {
    assert.ok(lamp.lampPoolMat.opacity <= 0.1, 'unlit lamp has dim ember floor pool');
  }
  const lampInteractables = ctx.interactables.filter((it) => it.kind === 'yangleshoLamp');
  assert.equal(lampInteractables.length, 7);
  for (const it of lampInteractables) {
    it.onInteract();
  }
  pharping.update(0.016);
  for (const lamp of pharping.lampNiches) {
    assert.ok(lamp.lit, 'lamp is lit');
    assert.ok(lamp.lampPoolMat.opacity > 0.45, 'lit lamp brightens cave floor light pool');
  }
  assert.ok(ctx.quests.hasFlag('ch1.lamps.lit'), 'all 7 lamps lit sets ch1.lamps.lit flag');

  // Yarlung Sheldrak Crystal Cave: solving crystal puzzle illuminates all pillar & casket pools
  assert.ok(ctx.scene.getObjectByName('SheldrakCrystalCave'), 'SheldrakCrystalCave group exists');
  assert.ok(ctx.scene.getObjectByName('SheldrakCaveDust'), 'SheldrakCaveDust particles exist');
  const solvedState = ctx.sheldrak.solve();
  yarlung.update(0.016);
  assert.equal(solvedState.solved, true, 'Sheldrak puzzle solved');
  assert.equal(solvedState.beamHits, 4, 'All 4 crystal beams aligned');

  // Chimphu Northern Cavern Vault & Chapter Terma Caves
  assert.ok(
    ctx.scene.getObjectByName('ChimphuNorthernCavernVault'),
    'ChimphuNorthernCavernVault exists',
  );
  assert.ok(ctx.scene.getObjectByName('ChimphuCavernDust'), 'ChimphuCavernDust particles exist');
  const termaCaves = createTermaCaves(ctx);
  for (const def of TERMA_CAVE_DEFS) {
    ctx.state.zone = def.map;
    termaCaves.update(0.016);
    assert.ok(
      ctx.scene.getObjectByName(`TermaCave_${def.id}`),
      `TermaCave_${def.id} enclosed grotto exists`,
    );
  }
  chimphu.update(0.016, 12.0);
  terma.update(0.016);

  // Strictly 0 PointLights across all maps
  assert.equal(countPointLights(ctx.scene), 0, 'Strictly 0 PointLights across all cave scenes');
}

console.log(
  'PASS: sky subterranean shader, camera cave ceiling clamp, Terma vaulted dungeon, and Pharping/Yarlung/Chimphu cave lighting (0 PointLights)',
);
