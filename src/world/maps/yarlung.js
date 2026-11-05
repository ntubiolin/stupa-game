// ============================================================================
// Chapter 3 World Map — Yarlung Valley · Yarlha Shampo (`src/world/maps/yarlung.js`)
//
// Landmarks (relative to origin (4000, 0)):
//   - Entrance & Waypoint:    (0, 85)    -> world (4000, 85), safe zone r = 12m
//   - Yarlung Village:        (25, 45)   -> world (4025, 45), safe zone r = 12m
//                             (barley fields, watermill with rotating wheel, calmed yaks)
//   - Yumbulagang Palace:     (-45, 20)  -> world (3955, 20), ridge palace + switchback trail
//   - Sheldrak Crystal Cave:  (60, -30)  -> world (4060, -30), 4-pillar light-reflection puzzle
//   - Alpine Pasture Arena:   (0, -75)   -> world (4000, -75), r = 22m
//   - Mount Yarlha Shampo:    (0, -155)  -> world (4000, -155), northern snow peak backdrop
//
// Strictly 0 PointLights. Draw calls < 400, Triangles < 600k.
// ============================================================================
import * as THREE from 'three';
import {
  createHeightfieldTerrain,
  scatterRocks,
  addRimMountains,
  seededRandom,
  buildGateArch,
  pushCollider,
} from '../mapBase.js';

const TWO_PI = Math.PI * 2;
const STEP_RAD = Math.PI / 4; // 45 degrees per crystal pillar rotation

function makeRiverTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  if (!c) return null;

  c.fillStyle = '#1b6ca8';
  c.fillRect(0, 0, 128, 256);

  for (let i = 0; i < 36; i++) {
    const x = (i * 37) % 120;
    const y = (i * 53) % 256;
    c.fillStyle = i % 2 === 0 ? 'rgba(125, 211, 252, 0.35)' : 'rgba(224, 242, 254, 0.25)';
    c.fillRect(x, y, 14, 26);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 14);
  return tex;
}

export function createMap(ctx) {
  const mapDef = ctx.world?.getMap?.('yarlung') || {
    id: 'yarlung',
    origin: { x: 4000, z: 0 },
    walkRadius: 115,
    gates: [
      {
        id: 'south',
        x: 4000,
        z: 89,
        radius: 3.5,
        to: 'stupa',
        toGate: 'north',
        labelKey: 'prompt.returnStupa',
      },
    ],
  };
  const origin = mapDef.origin || { x: 4000, z: 0 };

  const group = ctx.zoneGroups?.yarlung || new THREE.Group();
  group.name = 'YarlungMap';
  if (!ctx.zoneGroups?.yarlung) {
    ctx.scene.add(group);
  }

  // ---------------------------------------------------------------- 1. Heightfield Terrain
  const getHeight = (wx, wz) => {
    const lx = wx - origin.x;
    const lz = wz - origin.z;
    const r = Math.hypot(lx, lz);

    // 1. South Entrance & Waypoint plateau (0, 85)
    if (Math.hypot(lx - 0, lz - 85) < 14) return 0.1;

    // 2. Yarlung Village plateau (25, 45)
    if (Math.hypot(lx - 25, lz - 45) < 15) return 0.35;

    // 3. Yumbulagang Palace ridge plateau (-45, 20) + switchback approach ramp
    const dPalace = Math.hypot(lx - -45, lz - 20);
    if (dPalace < 12) return 3.6;
    if (dPalace < 24) {
      const t = 1 - (dPalace - 12) / 12;
      return 0.4 + t * 3.2;
    }

    // 4. Sheldrak Crystal Cave terrace (60, -30)
    const dCave = Math.hypot(lx - 60, lz - -30);
    if (dCave < 14) return 1.6;
    if (dCave < 22) {
      const t = 1 - (dCave - 14) / 8;
      return 0.4 + t * 1.2;
    }

    // 5. Northern Alpine Pasture & Boss Arena (0, -75, r = 22)
    const dArena = Math.hypot(lx - 0, lz - -75);
    if (dArena < 24) return 1.8;

    // 6. Central river channel shallow depression (lx near 0, between z = -48 and z = 72)
    if (Math.abs(lx) < 5.5 && lz > -48 && lz < 72) {
      return 0.05;
    }

    // Gentle north-rising alpine slope + valley undulations
    const northSlope = Math.max(0, (35 - lz) * 0.015);
    const undulation = Math.sin(lx * 0.05) * Math.cos(lz * 0.05) * 0.45;
    let h = Math.max(0.1, northSlope + undulation * 0.45);

    if (r > 106) {
      const rim = (r - 106) / 28;
      h += rim * rim * 10.5;
    }
    return h;
  };

  const valleyGreen = new THREE.Color(0x5d8a41);
  const barleyGold = new THREE.Color(0x9ab046);
  const riverBankCol = new THREE.Color(0x7c7458);
  const ridgeRockCol = new THREE.Color(0x786d5f);
  const snowPastureCol = new THREE.Color(0xdbe4ea);
  const tmpCol = new THREE.Color();

  const { mesh: terrainMesh } = createHeightfieldTerrain(ctx, {
    origin,
    size: 260,
    segments: 96,
    heightFn: getHeight,
    colorFn: (wx, wz, y, lx, lz) => {
      const noise = Math.sin(lx * 0.12) * Math.cos(lz * 0.12) * 0.5 + 0.5;
      // Snowline transition in the northern Alpine Pasture (lz < -50)
      if (lz < -50) {
        const snowMix = Math.min(1, (-50 - lz) / 22);
        return tmpCol.lerpColors(valleyGreen, snowPastureCol, snowMix * 0.78);
      }
      // Yumbulagang ridge & high rock
      if (y > 2.2) {
        return tmpCol.lerpColors(valleyGreen, ridgeRockCol, Math.min(1, (y - 2.2) / 2.2));
      }
      // River channel & banks
      if (Math.abs(lx) < 7.0 && lz > -48 && lz < 72) {
        return tmpCol.lerpColors(riverBankCol, valleyGreen, 0.35);
      }
      return tmpCol.lerpColors(valleyGreen, barleyGold, noise * 0.55);
    },
  });
  group.add(terrainMesh);

  // Valley rim mountains (leaving north open for Mount Yarlha Shampo)
  addRimMountains(ctx, group, {
    origin,
    innerR: 132,
    outerR: 195,
    count: 22,
    heightRange: [40, 78],
  });

  // ---------------------------------------------------------------- 2. Mount Yarlha Shampo (Northern Backdrop Peak at z ~ -155)
  const shampoGroup = new THREE.Group();
  shampoGroup.name = 'MountYarlhaShampo';
  shampoGroup.position.set(origin.x, 0, origin.z - 155);
  group.add(shampoGroup);

  const mtnBaseMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.88,
  });
  const mtnSnowMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.45,
    metalness: 0.08,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.22,
  });
  const cloudBandMat = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });

  // Main colossal pyramid peak + flanking glacial shoulders
  const mainPeakBase = new THREE.Mesh(new THREE.ConeGeometry(54, 68, 7), mtnBaseMat);
  mainPeakBase.position.set(0, 34, 0);
  const mainPeakSnow = new THREE.Mesh(new THREE.ConeGeometry(35, 46, 7), mtnSnowMat);
  mainPeakSnow.position.set(0, 58, 0);

  const westShoulder = new THREE.Mesh(new THREE.ConeGeometry(34, 52, 6), mtnSnowMat);
  westShoulder.position.set(-42, 26, 8);
  const eastShoulder = new THREE.Mesh(new THREE.ConeGeometry(34, 50, 6), mtnSnowMat);
  eastShoulder.position.set(42, 25, 10);

  const cloudRing1 = new THREE.Mesh(new THREE.TorusGeometry(36, 3.2, 8, 24), cloudBandMat);
  cloudRing1.rotation.x = Math.PI / 2;
  cloudRing1.position.set(0, 36, 0);

  const cloudRing2 = new THREE.Mesh(new THREE.TorusGeometry(26, 2.4, 8, 20), cloudBandMat);
  cloudRing2.rotation.x = Math.PI / 2 + 0.08;
  cloudRing2.position.set(0, 50, 0);

  shampoGroup.add(mainPeakBase, mainPeakSnow, westShoulder, eastShoulder, cloudRing1, cloudRing2);

  // ---------------------------------------------------------------- 3. Central Yarlung River & Wooden Bridge
  const riverTex = makeRiverTexture();
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    map: riverTex || null,
    roughness: 0.16,
    metalness: 0.42,
    emissive: new THREE.Color(0x0369a1),
    emissiveIntensity: 0.38,
    transparent: true,
    opacity: 0.88,
  });
  const riverGeo = new THREE.PlaneGeometry(9.5, 122, 4, 24);
  riverGeo.rotateX(-Math.PI / 2);
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.position.set(origin.x, 0.14, origin.z + 12);
  group.add(riverMesh);

  // Wooden bridge across the river at (0, 42)
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.86 });
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(origin.x, 0.38, origin.z + 42);
  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.28, 3.8), timberMat);
  const railN = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.65, 0.18), timberMat);
  railN.position.set(0, 0.42, -1.75);
  const railS = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.65, 0.18), timberMat);
  railS.position.set(0, 0.42, 1.75);
  bridgeGroup.add(bridgeDeck, railN, railS);
  group.add(bridgeGroup);

  // ---------------------------------------------------------------- 4. Swaying Barley Fields on Both Riverbanks (`InstancedMesh`)
  const barleyCount = 320;
  const stalkGeo = new THREE.ConeGeometry(0.16, 1.15, 5);
  stalkGeo.translate(0, 0.57, 0);
  const barleyMat = new THREE.MeshStandardMaterial({
    color: 0xc5d84d,
    roughness: 0.78,
    emissive: new THREE.Color(0x3f4d12),
    emissiveIntensity: 0.2,
  });
  const barleyInstanced = new THREE.InstancedMesh(stalkGeo, barleyMat, barleyCount);
  barleyInstanced.name = 'BarleyFieldsInstanced';
  const dummy = new THREE.Object3D();
  const bRng = seededRandom(3401);

  for (let i = 0; i < barleyCount; i++) {
    const bank = i % 2 === 0 ? -1 : 1; // west bank & east bank
    const lx = bank * (8.5 + bRng() * 14.0);
    const lz = -18 + bRng() * 78; // z from -18 to +60
    const wx = origin.x + lx;
    const wz = origin.z + lz;
    const wy = getHeight(wx, wz);

    dummy.position.set(wx, wy, wz);
    dummy.rotation.set((bRng() - 0.5) * 0.15, bRng() * TWO_PI, (bRng() - 0.5) * 0.15);
    const s = 0.8 + bRng() * 0.55;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    barleyInstanced.setMatrixAt(i, dummy.matrix);
  }
  barleyInstanced.instanceMatrix.needsUpdate = true;
  group.add(barleyInstanced);

  // ---------------------------------------------------------------- 5. South Entrance Gate (4000, 89)
  const gateCfg = (mapDef.gates && mapDef.gates[0]) || { x: origin.x, z: origin.z + 89 };
  buildGateArch(ctx, group, {
    mapId: 'yarlung',
    x: gateCfg.x,
    z: gateCfg.z,
    y: getHeight(gateCfg.x, gateCfg.z),
  });

  // ---------------------------------------------------------------- 6. Yarlung Village (4025, 45) + Watermill + Calmed Grazing Yaks
  const villageGroup = new THREE.Group();
  villageGroup.name = 'YarlungVillage';
  group.add(villageGroup);

  const stoneWallMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.88 });
  const redFriezeMat = new THREE.MeshStandardMaterial({ color: 0x8c2318, roughness: 0.82 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3e2718, roughness: 0.88 });

  const houseSpecs = [
    { lx: 18, lz: 52, w: 4.5, d: 3.8, h: 2.8, rot: 0.2 },
    { lx: 31, lz: 53, w: 4.2, d: 3.6, h: 2.6, rot: -0.25 },
    { lx: 34, lz: 43, w: 4.8, d: 3.8, h: 2.9, rot: -0.45 },
    { lx: 20, lz: 37, w: 4.2, d: 3.5, h: 2.6, rot: 0.35 },
    { lx: 31, lz: 35, w: 4.0, d: 3.4, h: 2.5, rot: -0.15 },
  ];

  for (const hs of houseSpecs) {
    const hx = origin.x + hs.lx;
    const hz = origin.z + hs.lz;
    const hy = getHeight(hx, hz);
    const hGrp = new THREE.Group();
    hGrp.position.set(hx, hy, hz);
    hGrp.rotation.y = hs.rot;

    const body = new THREE.Mesh(new THREE.BoxGeometry(hs.w, hs.h, hs.d), stoneWallMat);
    body.position.y = hs.h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    hGrp.add(body);

    const frieze = new THREE.Mesh(new THREE.BoxGeometry(hs.w + 0.16, 0.34, hs.d + 0.16), redFriezeMat);
    frieze.position.y = hs.h - 0.12;
    hGrp.add(frieze);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.55, 0.12), darkWoodMat);
    door.position.set(0, 0.78, hs.d * 0.5 + 0.04);
    hGrp.add(door);

    villageGroup.add(hGrp);
    pushCollider(ctx, 'yarlung', {
      type: 'circle',
      x: hx,
      z: hz,
      r: Math.max(hs.w, hs.d) * 0.52,
    });
  }

  // Streamside Watermill with rotating waterwheel at local (11, 47)
  const millX = origin.x + 11;
  const millZ = origin.z + 47;
  const millY = getHeight(millX, millZ);
  const millGroup = new THREE.Group();
  millGroup.position.set(millX, millY, millZ);

  const millHouse = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.5, 3.2), stoneWallMat);
  millHouse.position.y = 1.25;
  millGroup.add(millHouse);

  const waterWheel = new THREE.Group();
  waterWheel.position.set(-2.05, 1.25, 0);
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.1, 8, 16), timberMat);
  wheelRim.rotation.y = Math.PI / 2;
  waterWheel.add(wheelRim);
  for (let p = 0; p < 8; p++) {
    const a = (p / 8) * TWO_PI;
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 2.2), darkWoodMat);
    paddle.rotation.x = a;
    waterWheel.add(paddle);
  }
  millGroup.add(waterWheel);
  villageGroup.add(millGroup);
  pushCollider(ctx, 'yarlung', { type: 'circle', x: millX, z: millZ, r: 2.1 });

  // Two calmed domestic yaks grazing peacefully beside Herder Dawa at (25, 45)
  const calmYakMat = new THREE.MeshStandardMaterial({ color: 0x26211d, roughness: 0.9 });
  const villageYakHeads = [];
  [
    { lx: 22.5, lz: 42.5, rot: 0.6 },
    { lx: 27.8, lz: 43.2, rot: -0.8 },
  ].forEach((yk) => {
    const yx = origin.x + yk.lx;
    const yz = origin.z + yk.lz;
    const yy = getHeight(yx, yz);
    const yGrp = new THREE.Group();
    yGrp.position.set(yx, yy, yz);
    yGrp.rotation.y = yk.rot;
    const yBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 1.4), calmYakMat);
    yBody.position.y = 0.65;
    const yHead = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 0.52), calmYakMat);
    yHead.position.set(0, 0.46, -0.78);
    yHead.rotation.x = 0.55;
    yGrp.add(yBody, yHead);
    villageYakHeads.push(yHead);
    villageGroup.add(yGrp);
  });

  // ---------------------------------------------------------------- 7. Yumbulagang Palace (-45, 20) on Western Ridge
  const palaceX = origin.x - 45;
  const palaceZ = origin.z + 20;
  const palaceY = getHeight(palaceX, palaceZ);
  const palaceGroup = new THREE.Group();
  palaceGroup.name = 'YumbulagangPalace';
  palaceGroup.position.set(palaceX, palaceY, palaceZ);
  group.add(palaceGroup);

  const goldRoofMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.28,
    metalness: 0.78,
    emissive: new THREE.Color(0xb45309),
    emissiveIntensity: 0.35,
  });

  // Switchback trail stone steps leading up from (-27, 24) to (-40, 20)
  for (let s = 0; s < 8; s++) {
    const u = s / 7;
    const sx = origin.x - 26 - u * 14;
    const sz = origin.z + 24 - Math.sin(u * Math.PI * 2) * 2.5 - u * 4;
    const sy = getHeight(sx, sz);
    const stepStone = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 1.6), stoneWallMat);
    stepStone.position.set(sx, sy + 0.06, sz);
    group.add(stepStone);
  }

  // Fortress lower hall & iconic watchtower set slightly west (-6m) so (3955, 20) courtyard is open for Palace Keeper
  const fortressHall = new THREE.Mesh(new THREE.BoxGeometry(6.8, 4.6, 5.4), stoneWallMat);
  fortressHall.position.set(-5.8, 2.3, 0);
  fortressHall.castShadow = true;
  const fortressFrieze = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.65, 5.6), redFriezeMat);
  fortressFrieze.position.set(-5.8, 4.35, 0);

  const watchTower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 8.2, 3.4), stoneWallMat);
  watchTower.position.set(-6.5, 4.1, -1.2);
  watchTower.castShadow = true;

  const towerCrimson = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 3.6), redFriezeMat);
  towerCrimson.position.set(-6.5, 7.8, -1.2);

  const goldenRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.6, 4), goldRoofMat);
  goldenRoof.rotation.y = Math.PI / 4;
  goldenRoof.position.set(-6.5, 9.0, -1.2);

  palaceGroup.add(fortressHall, fortressFrieze, watchTower, towerCrimson, goldenRoof);
  pushCollider(ctx, 'yarlung', { type: 'circle', x: palaceX - 6.0, z: palaceZ - 0.4, r: 3.4 });

  // ---------------------------------------------------------------- 8. Sheldrak Crystal Cave (4060, -30) & 4-Pillar Light-Reflection Puzzle
  const caveX = origin.x + 60;
  const caveZ = origin.z - 30;
  const caveY = getHeight(caveX, caveZ);
  const caveGroup = new THREE.Group();
  caveGroup.name = 'SheldrakCrystalCave';
  caveGroup.position.set(caveX, caveY, caveZ);
  group.add(caveGroup);

  const cliffMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 });
  const quartzMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    roughness: 0.2,
    metalness: 0.45,
    emissive: new THREE.Color(0x0891b2),
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.88,
  });

  // Open rock arch & crystal-lined walls
  const backWall = new THREE.Mesh(new THREE.DodecahedronGeometry(6.2, 1), cliffMat);
  backWall.position.set(6.8, 3.2, 0);
  backWall.scale.set(0.85, 1.2, 1.6);
  const northWall = new THREE.Mesh(new THREE.DodecahedronGeometry(4.8, 1), cliffMat);
  northWall.position.set(1.2, 2.8, -6.8);
  northWall.scale.set(1.5, 1.1, 0.8);
  const southWall = new THREE.Mesh(new THREE.DodecahedronGeometry(4.8, 1), cliffMat);
  southWall.position.set(1.2, 2.8, 6.8);
  southWall.scale.set(1.5, 1.1, 0.8);
  const roofArch = new THREE.Mesh(new THREE.DodecahedronGeometry(6.5, 1), cliffMat);
  roofArch.position.set(2.0, 6.4, 0);
  roofArch.scale.set(1.3, 0.38, 1.4);
  caveGroup.add(backWall, northWall, southWall, roofArch);

  // Decorative quartz crystals along the cave walls
  [
    { x: 4.5, y: 1.4, z: -4.8, rz: 0.3 },
    { x: 4.5, y: 1.5, z: 4.8, rz: -0.3 },
    { x: -2.0, y: 1.3, z: -5.2, rz: 0.25 },
    { x: -2.0, y: 1.3, z: 5.2, rz: -0.25 },
  ].forEach((q) => {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.85, 6), quartzMat);
    shard.position.set(q.x, q.y, q.z);
    shard.rotation.z = q.rz;
    caveGroup.add(shard);
  });

  // Puzzle Nodes (World Coordinates):
  // Sunlight mouth -> Pillar 0 -> Pillar 1 -> Pillar 2 -> Pillar 3 -> Terma Casket
  const sunEntryPos = new THREE.Vector3(caveX - 7.5, caveY + 1.45, caveZ - 1.5);
  const pillarSpecs = [
    { index: 0, id: 'sheldrakPillar_0', wx: caveX - 3.2, wz: caveZ - 2.8, targetStep: 2 },
    { index: 1, id: 'sheldrakPillar_1', wx: caveX + 1.4, wz: caveZ - 3.2, targetStep: 4 },
    { index: 2, id: 'sheldrakPillar_2', wx: caveX + 2.2, wz: caveZ + 2.8, targetStep: 6 },
    { index: 3, id: 'sheldrakPillar_3', wx: caveX - 2.4, wz: caveZ + 2.6, targetStep: 0 },
  ];
  const casketPos = new THREE.Vector3(caveX + 4.8, caveY + 0.95, caveZ + 0.0);

  // Terma Casket (伏藏匣) at back of Sheldrak Cave
  const casketGroup = new THREE.Group();
  casketGroup.name = 'SheldrakTermaCasket';
  casketGroup.position.set(casketPos.x, getHeight(casketPos.x, casketPos.z), casketPos.z);
  group.add(casketGroup);

  const casketPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 0.55, 8), stoneWallMat);
  casketPedestal.position.y = 0.275;
  const casketBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.68), goldRoofMat);
  casketBase.position.y = 0.75;
  const casketLid = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.22, 0.7), redFriezeMat);
  casketLid.position.set(0, 1.02, 0);
  const casketScrollGlow = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24, 1),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.4, 2.0, 0.6),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  casketScrollGlow.position.set(0, 1.18, 0);
  casketScrollGlow.visible = false;
  casketGroup.add(casketPedestal, casketBase, casketLid, casketScrollGlow);

  // 4 Rotatable Crystal Pillars
  const pillars = [];
  for (const ps of pillarSpecs) {
    const py = getHeight(ps.wx, ps.wz);
    const pGrp = new THREE.Group();
    pGrp.name = ps.id;
    pGrp.position.set(ps.wx, py, ps.wz);

    const basePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.45, 8), stoneWallMat);
    basePedestal.position.y = 0.225;
    pGrp.add(basePedestal);

    const crystalPivot = new THREE.Group();
    crystalPivot.position.y = 1.15;
    pGrp.add(crystalPivot);

    const prismMat = quartzMat.clone();
    const prismMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 1.45, 6), prismMat);
    crystalPivot.add(prismMesh);

    // Golden mirror facet fin showing current rotation angle
    const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.55), goldRoofMat);
    finMesh.position.y = 0.1;
    crystalPivot.add(finMesh);

    group.add(pGrp);

    // Deterministic initial orientation: 1 step (45°) before targetStep
    const initStep = (ps.targetStep - 1 + 8) % 8;
    const initAngle = initStep * STEP_RAD;
    crystalPivot.rotation.y = initAngle;

    pillars.push({
      index: ps.index,
      id: ps.id,
      wx: ps.wx,
      wy: py,
      wz: ps.wz,
      posVec: new THREE.Vector3(ps.wx, py, ps.wz),
      beamPoint: new THREE.Vector3(ps.wx, py + 1.25, ps.wz),
      step: initStep,
      targetStep: ps.targetStep,
      angle: Number(initAngle.toFixed(4)),
      targetAngle: Number((ps.targetStep * STEP_RAD).toFixed(4)),
      crystalPivot,
      prismMat,
    });
  }

  // 5 Additive Glowing Light Beam Cylinder Segments:
  //   0: Cave Mouth -> Pillar 0
  //   1: Pillar 0   -> Pillar 1
  //   2: Pillar 1   -> Pillar 2
  //   3: Pillar 2   -> Pillar 3
  //   4: Pillar 3   -> Terma Casket
  const beamUnitGeo = new THREE.CylinderGeometry(0.085, 0.085, 1.0, 10, 1, true);
  beamUnitGeo.rotateX(Math.PI / 2); // Align cylinder height along +Z for lookAt
  const beamMatActive = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 2.1, 0.75),
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

  const beamSegments = [];
  const beamEndpoints = [
    [sunEntryPos, pillars[0].beamPoint],
    [pillars[0].beamPoint, pillars[1].beamPoint],
    [pillars[1].beamPoint, pillars[2].beamPoint],
    [pillars[2].beamPoint, pillars[3].beamPoint],
    [pillars[3].beamPoint, casketPos],
  ];

  for (let i = 0; i < beamEndpoints.length; i++) {
    const [pA, pB] = beamEndpoints[i];
    const segMesh = new THREE.Mesh(beamUnitGeo, beamMatActive);
    const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
    const len = pA.distanceTo(pB);
    segMesh.position.copy(mid);
    segMesh.lookAt(pB);
    segMesh.scale.set(1, 1, len);
    segMesh.visible = i === 0;
    group.add(segMesh);
    beamSegments.push(segMesh);
  }

  let sheldrakSolved = Boolean(ctx.quests?.hasFlag?.('ch3.sheldrak.solved'));
  let beamHits = 0;

  function grantSheldrakRewards() {
    if (sheldrakSolved) return;
    sheldrakSolved = true;
    casketLid.rotation.x = -1.1;
    casketLid.position.set(0, 1.15, 0.25);
    casketScrollGlow.visible = true;

    ctx.quests?.setFlag?.('ch3.sheldrak.solved', true);
    ctx.codex?.unlock?.('sheldrak');
    ctx.codex?.unlock?.('terma');

    // If C3-2 is active and still on reach_cave, complete reach_cave first so quest:item completes collect_shard
    ctx.quests?.completeStep?.('ch3.sheldrak', 'reach_cave');

    // Grant quest item `termaScrollShard`
    ctx.bus?.emit?.('quest:item', { item: 'termaScrollShard', count: 1 });
    ctx.bus?.emit?.('item:collect', { item: 'termaScrollShard', id: 'termaScrollShard', count: 1 });
    ctx.bus?.emit?.('sfx', { name: 'levelup' });

    // Drop a rare or higher equipment item at the casket
    if (ctx.loot?.generate) {
      const dropItem = ctx.loot.generate({
        ilvl: 20,
        rarity: 'rare',
      });
      if (dropItem) {
        const dropPos = {
          x: casketPos.x - 1.0,
          y: getHeight(casketPos.x - 1.0, casketPos.z),
          z: casketPos.z,
        };
        ctx.bus?.emit?.('loot:drop', {
          item: dropItem,
          startPos: { x: casketPos.x, y: casketPos.y, z: casketPos.z },
          position: dropPos,
        });
      }
    }

    const msg =
      ctx.i18n?.t?.('toast.sheldrak.solved') ||
      '四座水晶柱共鳴齊明！光束貫穿岩洞，開啟了古老的伏藏匣！';
    ctx.hud?.toast?.(msg);
  }

  function recomputeSheldrakBeams() {
    // Segment 0 (sunlight into Pillar 0) is always active
    beamSegments[0].visible = true;
    let sequentialHits = 0;
    for (let i = 0; i < 4; i++) {
      const p = pillars[i];
      const aligned = p.step === p.targetStep;
      p.prismMat.emissiveIntensity = aligned ? 1.25 : 0.55;
      if (aligned && sequentialHits === i) {
        sequentialHits = i + 1;
        beamSegments[i + 1].visible = true;
      } else {
        beamSegments[i + 1].visible = false;
      }
    }
    beamHits = sequentialHits;
    if (beamHits === 4 && !sheldrakSolved) {
      grantSheldrakRewards();
    }
    return beamHits;
  }

  function rotatePillar(index) {
    const p = pillars[index];
    if (!p) return getSheldrakState();
    p.step = (p.step + 1) % 8;
    p.angle = Number((p.step * STEP_RAD).toFixed(4));
    p.crystalPivot.rotation.y = p.angle;
    ctx.bus?.emit?.('sfx', { name: 'chime' });

    const hits = recomputeSheldrakBeams();
    if (!sheldrakSolved) {
      const msg =
        ctx.i18n?.t?.('toast.sheldrak.pillarRotated', { hits }) ||
        `水晶柱轉動 45° —— 日光折射軌跡隨之改變（已對齊 ${hits}/4）`;
      ctx.hud?.toast?.(msg);
    }
    return getSheldrakState();
  }

  function solveSheldrak() {
    for (const p of pillars) {
      p.step = p.targetStep;
      p.angle = Number((p.targetStep * STEP_RAD).toFixed(4));
      p.crystalPivot.rotation.y = p.angle;
    }
    recomputeSheldrakBeams();
    grantSheldrakRewards();
    return getSheldrakState();
  }

  function getSheldrakState() {
    return {
      solved: sheldrakSolved,
      angles: pillars.map((p) => p.angle),
      targetAngles: pillars.map((p) => p.targetAngle),
      steps: pillars.map((p) => p.step),
      targetSteps: pillars.map((p) => p.targetStep),
      beamHits,
    };
  }

  // Register interactables for all 4 crystal pillars
  for (const p of pillars) {
    const entry = {
      id: p.id,
      kind: 'crystalPillar',
      zone: 'yarlung',
      action: 'interact',
      labelKey: 'prompt.rotateCrystalPillar',
      radius: 2.8,
      position: { x: p.wx, y: p.wy, z: p.wz },
      getPosition: () => p.posVec,
      isAvailable: () =>
        (ctx.state.zone || 'stupa') === 'yarlung' && !ctx.state.uiOpen && !sheldrakSolved,
      interact: () => rotatePillar(p.index),
      onInteract: () => rotatePillar(p.index),
    };
    ctx.interaction?.register?.(entry);
    if (Array.isArray(ctx.interactables)) {
      ctx.interactables.push(entry);
    }
  }

  // Initialize beam reflection state (or restore solved state if revisited)
  if (sheldrakSolved) {
    solveSheldrak();
  } else {
    recomputeSheldrakBeams();
  }

  const sheldrakApi = {
    solve: solveSheldrak,
    rotatePillar,
    getState: getSheldrakState,
  };
  ctx.sheldrak = sheldrakApi;
  ctx.debug?.register?.('sheldrak', sheldrakApi);
  if (typeof window !== 'undefined') {
    window.__stupa = window.__stupa || {};
    window.__stupa.sheldrak = sheldrakApi;
  }

  // ---------------------------------------------------------------- 9. Alpine Pasture & Boss Arena (4000, -75, r = 22)
  const arenaX = origin.x;
  const arenaZ = origin.z - 75;
  const arenaY = getHeight(arenaX, arenaZ);
  const pastureGroup = new THREE.Group();
  pastureGroup.name = 'AlpinePastureArena';
  pastureGroup.position.set(arenaX, arenaY, arenaZ);
  group.add(pastureGroup);

  const arenaRingGeo = new THREE.RingGeometry(21.2, 22.0, 56);
  arenaRingGeo.rotateX(-Math.PI / 2);
  const arenaRing = new THREE.Mesh(
    arenaRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  arenaRing.position.y = 0.04;
  pastureGroup.add(arenaRing);

  // Ice-rimmed glacial boulders framing the northern edge of the pasture
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 0.2 + (i / 5) * Math.PI * 0.6;
    const iceCrag = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8, 0), mtnSnowMat);
    iceCrag.position.set(Math.cos(a + Math.PI) * 23.2, 1.8, Math.sin(a + Math.PI) * 23.2);
    iceCrag.scale.set(1.2, 1.3, 0.9);
    pastureGroup.add(iceCrag);
  }

  // ---------------------------------------------------------------- 10. Scatter Valley Rocks
  const rng = seededRandom(3409);
  scatterRocks(ctx, group, {
    mapId: 'yarlung',
    origin,
    count: 24,
    rng,
    area: { minR: 18, maxR: 96 },
    minRadius: 1.0,
    maxRadius: 2.2,
    minSpacing: 10,
    avoid: [
      { x: origin.x, z: origin.z + 85, r: 15 }, // Entrance & Waypoint
      { x: origin.x + 25, z: origin.z + 45, r: 16 }, // Yarlung Village
      { x: origin.x, z: origin.z + 42, r: 9 }, // River Bridge
      { x: origin.x - 45, z: origin.z + 20, r: 16 }, // Yumbulagang Palace
      { x: origin.x + 60, z: origin.z - 30, r: 15 }, // Sheldrak Crystal Cave
      { x: origin.x, z: origin.z - 75, r: 25 }, // Alpine Pasture Arena
      { x: origin.x, z: origin.z - 52, r: 8 }, // Guru Vision spot
    ],
    getHeight,
    color: 0x6b7280,
  });

  // ---------------------------------------------------------------- 11. Per-Frame Update
  let animTime = 0;
  function update(dt) {
    animTime += dt;

    // 1. Scroll river UV & shimmer
    if (riverTex) {
      riverTex.offset.y -= dt * 0.35;
    }
    riverMat.emissiveIntensity = 0.34 + Math.sin(animTime * 2.8) * 0.1;

    // 2. Rotate village watermill wheel
    waterWheel.rotation.x += dt * 1.45;

    // 3. Gentle wind sway on barley field InstancedMesh
    barleyInstanced.rotation.z = Math.sin(animTime * 1.8) * 0.012;

    // 4. Drift cloud bands around Mount Yarlha Shampo
    cloudRing1.rotation.z += dt * 0.12;
    cloudRing2.rotation.z -= dt * 0.16;

    // 5. Gentle grazing nod for village calmed yaks
    for (let i = 0; i < villageYakHeads.length; i++) {
      villageYakHeads[i].rotation.x = 0.52 + Math.sin(animTime * 2.5 + i) * 0.08;
    }

    // 6. Pulse Sheldrak light beam & casket scroll glow
    beamMatActive.opacity = 0.78 + Math.sin(animTime * 5.0) * 0.12;
    if (casketScrollGlow.visible) {
      casketScrollGlow.rotation.y += dt * 2.2;
    }
  }

  return {
    group,
    getHeight,
    update,
    sheldrak: sheldrakApi,
  };
}

export default createMap;
