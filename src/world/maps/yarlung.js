// ============================================================================
// Chapter 3 World Map — Yarlung Valley · Yarlha Shampo (`src/world/maps/yarlung.js`)
//
// Landmarks (relative to origin (4000, 0)):
//   - Entrance & Waypoint:    (0, 85)    -> world (4000, 85), safe zone r = 12m
//   - Yarlung Village:        (25, 45)   -> world (4025, 45), safe zone r = 12m
//                             (terraced barley fields, watermill + threshing court, calmed yaks)
//   - Yumbulagang Palace:     (-45, 20)  -> world (3955, 20), Tibetan royal Dzong + switchback stairs
//   - Sheldrak Crystal Cave:  (60, -30)  -> world (4060, -30), 4-pillar light-reflection puzzle
//   - Alpine Pasture Arena:   (0, -75)   -> world (4000, -75), r = 22m (frost mandala, steles & spires)
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

function makeYarlungGlowTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  if (c) {
    const grad = c.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.32, 'rgba(220, 248, 255, 0.72)');
    grad.addColorStop(0.68, 'rgba(120, 220, 255, 0.24)');
    grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeRiverTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  if (!c) return null;

  c.fillStyle = '#0f8a96';
  c.fillRect(0, 0, 128, 256);

  for (let i = 0; i < 48; i++) {
    const x = (i * 37) % 120;
    const y = (i * 53) % 256;
    c.fillStyle = i % 2 === 0 ? 'rgba(153, 246, 228, 0.45)' : 'rgba(254, 243, 199, 0.28)';
    c.fillRect(x, y, 10, 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 14);
  return tex;
}

function makeArenaMandalaTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const c = canvas.getContext('2d');
  if (!c) return null;

  const cx = 256;
  const cy = 256;
  c.clearRect(0, 0, 512, 512);

  // Subtle frost radial glow
  const bgGrad = c.createRadialGradient(cx, cy, 18, cx, cy, 248);
  bgGrad.addColorStop(0.0, 'rgba(56, 189, 248, 0.28)');
  bgGrad.addColorStop(0.55, 'rgba(125, 211, 252, 0.16)');
  bgGrad.addColorStop(0.88, 'rgba(250, 204, 21, 0.14)');
  bgGrad.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');
  c.fillStyle = bgGrad;
  c.fillRect(0, 0, 512, 512);

  // Concentric sacred Tibetan mandala & glacier rings
  const rings = [
    { r: 238, w: 5, stroke: 'rgba(125, 211, 252, 0.65)' },
    { r: 222, w: 3, stroke: 'rgba(250, 204, 21, 0.62)' },
    { r: 184, w: 4, stroke: 'rgba(56, 189, 248, 0.55)' },
    { r: 132, w: 3, stroke: 'rgba(250, 204, 21, 0.52)' },
    { r: 78, w: 3, stroke: 'rgba(224, 242, 254, 0.68)' },
    { r: 34, w: 3, stroke: 'rgba(250, 204, 21, 0.75)' },
  ];
  for (const rg of rings) {
    c.beginPath();
    c.arc(cx, cy, rg.r, 0, TWO_PI);
    c.lineWidth = rg.w;
    c.strokeStyle = rg.stroke;
    c.stroke();
  }

  // 16 snow-lotus petals & 8-spoked glacier dharma rays
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TWO_PI;
    const isMajor = i % 2 === 0;
    c.save();
    c.translate(cx, cy);
    c.rotate(a);
    c.beginPath();
    c.moveTo(36, 0);
    c.quadraticCurveTo(110, isMajor ? 24 : 14, isMajor ? 218 : 178, 0);
    c.quadraticCurveTo(110, isMajor ? -24 : -14, 36, 0);
    c.strokeStyle = isMajor ? 'rgba(250, 204, 21, 0.58)' : 'rgba(125, 211, 252, 0.48)';
    c.lineWidth = isMajor ? 3 : 2;
    c.stroke();
    c.restore();
  }

  // 24 outer Tibetan royal border key notches
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TWO_PI;
    const x1 = cx + Math.cos(a) * 222;
    const y1 = cy + Math.sin(a) * 222;
    const x2 = cx + Math.cos(a) * 238;
    const y2 = cy + Math.sin(a) * 238;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.lineWidth = 3;
    c.strokeStyle = i % 2 === 0 ? 'rgba(250, 204, 21, 0.68)' : 'rgba(186, 230, 253, 0.6)';
    c.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
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
  const BRIDGE_LZ = 42;
  const BRIDGE_DECK_Y = 0.52;
  const BRIDGE_DECK_HALF_X = 5.5;
  const BRIDGE_RAMP_END_X = 6.9;
  const BRIDGE_HALF_Z = 1.95;

  const getTerrainHeight = (wx, wz) => {
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

  const getHeight = (wx, wz) => {
    const baseH = getTerrainHeight(wx, wz);
    const lx = wx - origin.x;
    const lz = wz - origin.z;

    // Wooden bridge deck & East/West approach ramps across the central river at (0, 42)
    if (Math.abs(lz - BRIDGE_LZ) <= BRIDGE_HALF_Z && Math.abs(lx) < BRIDGE_RAMP_END_X) {
      const absX = Math.abs(lx);
      if (absX <= BRIDGE_DECK_HALF_X) {
        return BRIDGE_DECK_Y;
      }
      const t = (BRIDGE_RAMP_END_X - absX) / (BRIDGE_RAMP_END_X - BRIDGE_DECK_HALF_X);
      return baseH + (BRIDGE_DECK_Y - baseH) * t;
    }

    return baseH;
  };

  const valleyGreen = new THREE.Color(0x82a842);     // SEASON sunlit emerald meadow
  const barleyGold = new THREE.Color(0xdca23a);      // SEASON storybook golden-amber barley terraces
  const harvestAmber = new THREE.Color(0xebb844);    // Sunlit harvest gold stripe
  const riverBankCol = new THREE.Color(0x9e8c64);    // Warm sunlit river gravel bank
  const ridgeRockCol = new THREE.Color(0x988672);    // Warm limestone spur rock
  const snowPastureCol = new THREE.Color(0xeaf2f8);  // Bright alpine snow pasture
  const tmpCol = new THREE.Color();

  const { mesh: terrainMesh } = createHeightfieldTerrain(ctx, {
    origin,
    size: 260,
    segments: 96,
    heightFn: getTerrainHeight,
    colorFn: (wx, wz, y, lx, lz) => {
      const noise = Math.sin(lx * 0.12) * Math.cos(lz * 0.12) * 0.5 + 0.5;
      // Snowline transition in the northern Alpine Pasture (lz < -50)
      if (lz < -50) {
        const snowMix = Math.min(1, (-50 - lz) / 22);
        return tmpCol.lerpColors(valleyGreen, snowPastureCol, snowMix * 0.82);
      }
      // Yumbulagang ridge & high limestone rock
      if (y > 2.2) {
        return tmpCol.lerpColors(valleyGreen, ridgeRockCol, Math.min(1, (y - 2.2) / 2.2));
      }
      // Braided river channel & warm pebble banks
      if (Math.abs(lx) < 7.0 && lz > -48 && lz < 72) {
        return tmpCol.lerpColors(riverBankCol, valleyGreen, 0.38);
      }
      // Terraced golden barley belt on West & East banks
      if (Math.abs(lx) >= 7.5 && Math.abs(lx) <= 27.5 && lz > -22 && lz < 62) {
        const terraceStripe = Math.sin(lz * 0.34 + (lx > 0 ? 0.8 : 0)) * 0.5 + 0.5;
        tmpCol.lerpColors(valleyGreen, barleyGold, 0.62 + noise * 0.28);
        return tmpCol.lerp(harvestAmber, terraceStripe * 0.35);
      }
      return tmpCol.lerpColors(valleyGreen, barleyGold, 0.28 + noise * 0.52);
    },
  });
  if (terrainMesh.material) {
    terrainMesh.material.emissive = new THREE.Color(0x362814);
    terrainMesh.material.emissiveIntensity = 0.25;
    terrainMesh.material.roughness = 0.86;
  }
  group.add(terrainMesh);

  // Valley rim mountains (leaving north open for Mount Yarlha Shampo)
  addRimMountains(ctx, group, {
    origin,
    innerR: 132,
    outerR: 195,
    count: 22,
    heightRange: [40, 78],
  });

  // Shared glow texture & Tibetan architectural / natural materials (instantiated per createMap call)
  const glowTex = makeYarlungGlowTexture();
  const stoneWallMat = new THREE.MeshStandardMaterial({
    color: 0xf2eae0,
    emissive: new THREE.Color(0x2e2318),
    emissiveIntensity: 0.2,
    roughness: 0.84,
  });
  const dressedStoneMat = new THREE.MeshStandardMaterial({
    color: 0xa89d8e,
    emissive: new THREE.Color(0x241d15),
    emissiveIntensity: 0.18,
    roughness: 0.88,
  });
  const redFriezeMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: new THREE.Color(0x3b0a0a),
    emissiveIntensity: 0.22,
    roughness: 0.76,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.85 });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x6b472e,
    emissive: new THREE.Color(0x24150b),
    emissiveIntensity: 0.18,
    roughness: 0.84,
  });
  const goldRoofMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.24,
    metalness: 0.82,
    emissive: new THREE.Color(0xd97706),
    emissiveIntensity: 0.44,
  });
  const warmWindowMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.32,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 0.62,
  });
  const bannerClothMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.72,
    emissive: new THREE.Color(0x0f172a),
    emissiveIntensity: 0.22,
  });
  const prayerFlagPalette = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
  const prayerFlagMats = prayerFlagPalette.map(
    (hex) =>
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.62,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(hex),
        emissiveIntensity: 0.24,
      }),
  );

  // ---------------------------------------------------------------- 2. Mount Yarlha Shampo (Colossal Fluted Glacial Pyramid at z ~ -155)
  const shampoGroup = new THREE.Group();
  shampoGroup.name = 'MountYarlhaShampo';
  shampoGroup.position.set(origin.x, 0, origin.z - 155);
  group.add(shampoGroup);

  const mtnBaseMat = new THREE.MeshStandardMaterial({
    color: 0x3b4963,
    emissive: new THREE.Color(0x1e293b),
    emissiveIntensity: 0.24,
    roughness: 0.86,
    flatShading: true,
  });
  const mtnSnowMat = new THREE.MeshStandardMaterial({
    color: 0xfefce8,
    roughness: 0.36,
    metalness: 0.12,
    emissive: new THREE.Color(0xfde68a),
    emissiveIntensity: 0.32,
    flatShading: true,
  });
  const lavenderGullyMat = new THREE.MeshStandardMaterial({
    color: 0xc4b5fd,
    roughness: 0.28,
    metalness: 0.24,
    emissive: new THREE.Color(0x4f46e5),
    emissiveIntensity: 0.38,
    flatShading: true,
  });
  const glacierSeracMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.2,
    metalness: 0.38,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 0.5,
    flatShading: true,
  });
  const summitGoldSnowMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    roughness: 0.26,
    metalness: 0.28,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 0.62,
    flatShading: true,
  });
  const cloudBandMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
  });

  // Colossal 4-sided fluted glacial pyramid peak towering high above the northern valley rim
  const mainPeakBase = new THREE.Mesh(new THREE.ConeGeometry(68, 86, 6), mtnBaseMat);
  mainPeakBase.position.set(0, 42, 0);
  const mainPeakSnow = new THREE.Mesh(new THREE.ConeGeometry(48, 72, 4), mtnSnowMat);
  mainPeakSnow.rotation.y = Math.PI / 4;
  mainPeakSnow.position.set(0, 66, 2);
  const summitGoldCrown = new THREE.Mesh(new THREE.ConeGeometry(24, 38, 4), summitGoldSnowMat);
  summitGoldCrown.rotation.y = Math.PI / 4;
  summitGoldCrown.position.set(0, 91, 2);

  const westShoulder = new THREE.Mesh(new THREE.ConeGeometry(42, 68, 5), mtnSnowMat);
  westShoulder.position.set(-52, 34, 8);
  westShoulder.rotation.y = 0.28;
  const eastShoulder = new THREE.Mesh(new THREE.ConeGeometry(42, 66, 5), mtnSnowMat);
  eastShoulder.position.set(52, 33, 10);
  eastShoulder.rotation.y = -0.28;

  // Fluted glacial pyramid ribs & lavender-blue glacial gullies descending the south face
  const glacierSpurSpecs = [
    // Sunlit golden-white pyramidal arête ribs
    { x: 0, y: 52, z: 18, r: 14, h: 64, rotY: Math.PI / 4, mat: summitGoldSnowMat },
    { x: -18, y: 42, z: 16, r: 13, h: 54, rotY: 0.55, mat: summitGoldSnowMat },
    { x: 18, y: 41, z: 16, r: 13, h: 52, rotY: -0.55, mat: mtnSnowMat },
    // Deep lavender-blue glacial gullies recessed between the sunlit ribs
    { x: -9, y: 44, z: 19, r: 10.5, h: 52, rotY: 0.22, mat: lavenderGullyMat },
    { x: 9, y: 44, z: 19, r: 10.5, h: 52, rotY: -0.22, mat: lavenderGullyMat },
    { x: -28, y: 28, z: 22, r: 12, h: 38, rotY: 0.38, mat: lavenderGullyMat },
    { x: 28, y: 28, z: 22, r: 12, h: 38, rotY: -0.38, mat: lavenderGullyMat },
    // Lower crystalline glacier seracs & icefalls approaching the pasture arena
    { x: -22, y: 18, z: 26, r: 16, h: 36, rotY: 0.35, mat: mtnSnowMat },
    { x: 22, y: 17, z: 27, r: 15, h: 34, rotY: -0.35, mat: mtnSnowMat },
    { x: 0, y: 16, z: 32, r: 18, h: 32, rotY: 0.12, mat: glacierSeracMat },
    { x: -13, y: 11, z: 40, r: 10, h: 23, rotY: 0.48, mat: glacierSeracMat },
    { x: 13, y: 11, z: 40, r: 10, h: 23, rotY: -0.42, mat: glacierSeracMat },
    { x: -35, y: 14, z: 30, r: 12, h: 26, rotY: 0.22, mat: glacierSeracMat },
    { x: 35, y: 14, z: 30, r: 12, h: 26, rotY: -0.22, mat: glacierSeracMat },
  ];
  const shampoSpurGeo = new THREE.ConeGeometry(1, 1, 5);
  for (const sp of glacierSpurSpecs) {
    const spur = new THREE.Mesh(shampoSpurGeo, sp.mat);
    spur.position.set(sp.x, sp.y, sp.z);
    spur.scale.set(sp.r, sp.h, sp.r * 0.85);
    spur.rotation.y = sp.rotY;
    shampoGroup.add(spur);
  }

  // Halo of Firewatch Golden-Hour Crepuscular Sunbeams (God Rays) radiating from behind Mount Yarlha Shampo
  const shampoBackHaloMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xffb36b,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shampoBackHalo = new THREE.Mesh(new THREE.PlaneGeometry(195, 118), shampoBackHaloMat);
  shampoBackHalo.position.set(0, 62, -14);
  shampoGroup.add(shampoBackHalo);

  const godRayGeo = new THREE.ConeGeometry(9.5, 124, 10, 1, true);
  godRayGeo.translate(0, 62, 0);
  const shampoGodRays = [];
  const godRayAngles = [-0.72, -0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54, 0.72];
  for (let i = 0; i < godRayAngles.length; i++) {
    const ang = godRayAngles[i];
    const isCoral = i % 2 === 1;
    const grMat = new THREE.MeshBasicMaterial({
      color: isCoral ? 0xff9458 : 0xffd166,
      transparent: true,
      opacity: isCoral ? 0.14 : 0.17,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const grMesh = new THREE.Mesh(godRayGeo, grMat);
    grMesh.position.set(Math.sin(ang) * 14, 34, -10);
    grMesh.rotation.z = -ang;
    grMesh.rotation.x = 0.12;
    grMesh.scale.set(0.85 + (i % 3) * 0.22, 0.92 + (i % 2) * 0.18, 0.5);
    shampoGroup.add(grMesh);
    shampoGodRays.push({
      mesh: grMesh,
      mat: grMat,
      baseAngle: -ang,
      baseOpacity: isCoral ? 0.14 : 0.17,
      phase: i * 0.85,
    });
  }

  // Soft Purple-Amber Valley Mist floating at the base of Mount Yarlha Shampo
  const shampoBaseMistGeo = new THREE.PlaneGeometry(1, 1);
  shampoBaseMistGeo.rotateX(-Math.PI / 2);
  const shampoBaseMistLayers = [];
  const shampoMistSpecs = [
    { x: 0, y: 4.2, z: 44, sx: 118, sz: 38, color: 0xd8b4fe, opacity: 0.26, speed: 0.28 },
    { x: -16, y: 7.5, z: 36, sx: 110, sz: 34, color: 0xfdba74, opacity: 0.24, speed: -0.24 },
    { x: 16, y: 11.2, z: 28, sx: 124, sz: 36, color: 0xc4b5fd, opacity: 0.25, speed: 0.22 },
    { x: 0, y: 15.8, z: 22, sx: 132, sz: 40, color: 0xfde68a, opacity: 0.22, speed: -0.20 },
  ];
  for (let i = 0; i < shampoMistSpecs.length; i++) {
    const ms = shampoMistSpecs[i];
    const mMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: ms.color,
      transparent: true,
      opacity: ms.opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mMesh = new THREE.Mesh(shampoBaseMistGeo, mMat);
    mMesh.position.set(ms.x, ms.y, ms.z);
    mMesh.scale.set(ms.sx, 1, ms.sz);
    shampoGroup.add(mMesh);
    shampoBaseMistLayers.push({
      mesh: mMesh,
      mat: mMat,
      baseX: ms.x,
      baseOpacity: ms.opacity,
      speed: ms.speed,
      phase: i * 1.2,
    });
  }

  const cloudRing1 = new THREE.Mesh(new THREE.TorusGeometry(42, 3.4, 8, 24), cloudBandMat);
  cloudRing1.rotation.x = Math.PI / 2;
  cloudRing1.position.set(0, 44, 2);

  const cloudRing2 = new THREE.Mesh(new THREE.TorusGeometry(30, 2.5, 8, 20), cloudBandMat);
  cloudRing2.rotation.x = Math.PI / 2 + 0.08;
  cloudRing2.position.set(0, 64, 2);

  shampoGroup.add(
    mainPeakBase,
    mainPeakSnow,
    summitGoldCrown,
    westShoulder,
    eastShoulder,
    cloudRing1,
    cloudRing2,
  );

  // ---------------------------------------------------------------- 3. Braided Turquoise Yarlung River, Weeping Willows & Bridge
  const riverTex = makeRiverTexture();
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    map: riverTex || null,
    roughness: 0.14,
    metalness: 0.42,
    emissive: new THREE.Color(0x0d9488),
    emissiveIntensity: 0.44,
    transparent: true,
    opacity: 0.9,
  });
  const riverGeo = new THREE.PlaneGeometry(9.8, 122, 6, 28);
  riverGeo.rotateX(-Math.PI / 2);
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.position.set(origin.x, 0.14, origin.z + 12);
  group.add(riverMesh);

  // Secondary Braided Turquoise Side-Channel Ribbons & Gravel Sandbar Islets (0 colliders)
  const braidRibbonGeo = new THREE.PlaneGeometry(2.3, 98, 2, 24);
  braidRibbonGeo.rotateX(-Math.PI / 2);
  const bPos = braidRibbonGeo.attributes.position;
  for (let i = 0; i < bPos.count; i++) {
    const bz = bPos.getZ(i);
    bPos.setX(i, bPos.getX(i) + Math.sin(bz * 0.11) * 1.15);
  }
  braidRibbonGeo.computeVertexNormals();
  for (const side of [-1, 1]) {
    const braidRibbon = new THREE.Mesh(braidRibbonGeo, riverMat);
    braidRibbon.position.set(origin.x + side * 4.2, 0.146, origin.z + 10);
    braidRibbon.scale.x = side;
    group.add(braidRibbon);
  }

  const sandbarGeo = new THREE.CylinderGeometry(0.95, 1.48, 0.12, 8);
  const sandbarMat = new THREE.MeshStandardMaterial({
    color: 0xb4a284,
    emissive: new THREE.Color(0x2e2518),
    emissiveIntensity: 0.18,
    roughness: 0.85,
  });
  const sandbarSpots = [
    { lx: -2.6, lz: 60, sx: 1.1, sz: 2.4 },
    { lx: 2.5, lz: 50, sx: 1.0, sz: 2.1 },
    { lx: -2.4, lz: 30, sx: 1.15, sz: 2.6 },
    { lx: 2.6, lz: 18, sx: 1.05, sz: 2.3 },
    { lx: -2.5, lz: 2, sx: 1.1, sz: 2.5 },
    { lx: 2.4, lz: -14, sx: 1.0, sz: 2.2 },
    { lx: -2.3, lz: -28, sx: 1.1, sz: 2.3 },
  ];
  for (const sb of sandbarSpots) {
    const bar = new THREE.Mesh(sandbarGeo, sandbarMat);
    bar.position.set(origin.x + sb.lx, 0.12, origin.z + sb.lz);
    bar.scale.set(sb.sx, 1, sb.sz);
    group.add(bar);
  }

  // Shimmering white-cyan foam bank edges along West & East river margins
  const foamEdgeMat = new THREE.MeshBasicMaterial({
    color: 0xccfbf1,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
  });
  const foamStripGeo = new THREE.PlaneGeometry(0.58, 120, 1, 16);
  foamStripGeo.rotateX(-Math.PI / 2);
  for (const side of [-1, 1]) {
    const foamStrip = new THREE.Mesh(foamStripGeo, foamEdgeMat);
    foamStrip.position.set(origin.x + side * 4.85, 0.154, origin.z + 12);
    group.add(foamStrip);
  }

  // Smooth river cobblestones scattered along both riverbanks (`InstancedMesh`, 0 colliders)
  const cobbleCount = 180;
  const cobbleGeo = new THREE.DodecahedronGeometry(0.28, 1);
  const cobbleMat = new THREE.MeshStandardMaterial({
    color: 0x8b8578,
    roughness: 0.72,
    metalness: 0.08,
  });
  const cobbleInstanced = new THREE.InstancedMesh(cobbleGeo, cobbleMat, cobbleCount);
  cobbleInstanced.name = 'RiverCobblesInstanced';
  const dummy = new THREE.Object3D();
  const cRng = seededRandom(3417);
  for (let i = 0; i < cobbleCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    let lz = -45 + cRng() * 114;
    if (Math.abs(lz - BRIDGE_LZ) < 3.4) {
      lz += lz >= BRIDGE_LZ ? 3.6 : -3.6;
    }
    const lx = side * (4.3 + cRng() * 2.4);
    const wx = origin.x + lx;
    const wz = origin.z + lz;
    const wy = getTerrainHeight(wx, wz);
    dummy.position.set(wx, wy + 0.04, wz);
    dummy.rotation.set(cRng() * 0.4, cRng() * TWO_PI, cRng() * 0.4);
    const sx = 0.65 + cRng() * 0.9;
    const sy = 0.35 + cRng() * 0.35;
    const sz = 0.6 + cRng() * 0.85;
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    cobbleInstanced.setMatrixAt(i, dummy.matrix);
  }
  cobbleInstanced.instanceMatrix.needsUpdate = true;
  group.add(cobbleInstanced);

  // Riverside reed clumps & sedge grass along the water's edge (`InstancedMesh`, 0 colliders)
  const reedCount = 120;
  const reedGeo = new THREE.ConeGeometry(0.14, 0.95, 5);
  reedGeo.translate(0, 0.47, 0);
  const reedMat = new THREE.MeshStandardMaterial({
    color: 0x659b48,
    roughness: 0.78,
    emissive: new THREE.Color(0x284218),
    emissiveIntensity: 0.24,
  });
  const reedInstanced = new THREE.InstancedMesh(reedGeo, reedMat, reedCount);
  reedInstanced.name = 'RiverReedsInstanced';
  for (let i = 0; i < reedCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    let lz = -38 + cRng() * 102;
    if (Math.abs(lz - BRIDGE_LZ) < 4.2) {
      lz += lz >= BRIDGE_LZ ? 4.4 : -4.4;
    }
    const lx = side * (4.6 + cRng() * 1.6);
    const wx = origin.x + lx;
    const wz = origin.z + lz;
    const wy = getTerrainHeight(wx, wz);
    dummy.position.set(wx, wy, wz);
    dummy.rotation.set((cRng() - 0.5) * 0.22, cRng() * TWO_PI, (cRng() - 0.5) * 0.22);
    const s = 0.75 + cRng() * 0.65;
    dummy.scale.set(s, s * (0.9 + cRng() * 0.4), s);
    dummy.updateMatrix();
    reedInstanced.setMatrixAt(i, dummy.matrix);
  }
  reedInstanced.instanceMatrix.needsUpdate = true;
  group.add(reedInstanced);

  // Riverside & Watermill Weeping Willow Trees (`垂柳`, 0 colliders) with drooping frond curtains
  const willowFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x76a83c,
    roughness: 0.76,
    emissive: new THREE.Color(0x2e4814),
    emissiveIntensity: 0.26,
  });
  const willowFrondMat = new THREE.MeshStandardMaterial({
    color: 0x9ec648,
    roughness: 0.72,
    emissive: new THREE.Color(0x3f5e16),
    emissiveIntensity: 0.28,
  });
  const willowTrunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 2.4, 7);
  const willowCrownGeo = new THREE.DodecahedronGeometry(1.5, 1);
  const willowSpots = [
    { lx: -7.5, lz: 64, s: 1.08 },
    { lx: 7.8, lz: 62, s: 1.02 },
    { lx: -7.4, lz: 52, s: 1.12 },
    { lx: 8.2, lz: 51, s: 1.15 }, // Flanking the village watermill flume
    { lx: 8.4, lz: 43.5, s: 1.06 }, // Beside the watermill & bridge east bank
    { lx: -7.8, lz: 35, s: 1.05 },
    { lx: -7.8, lz: 24, s: 1.12 },
    { lx: 7.6, lz: 22, s: 1.04 },
    { lx: -7.5, lz: 8, s: 0.98 },
    { lx: 7.7, lz: 6, s: 1.02 },
    { lx: -7.2, lz: -8, s: 0.94 },
    { lx: 7.4, lz: -14, s: 0.96 },
  ];

  const FRONDS_PER_WILLOW = 10;
  const willowFrondGeo = new THREE.ConeGeometry(0.24, 1.85, 5);
  willowFrondGeo.translate(0, -0.85, 0);
  const willowFrondInstanced = new THREE.InstancedMesh(
    willowFrondGeo,
    willowFrondMat,
    willowSpots.length * FRONDS_PER_WILLOW,
  );
  willowFrondInstanced.name = 'WeepingWillowFrondsInstanced';
  let frondIdx = 0;

  for (let wi = 0; wi < willowSpots.length; wi++) {
    const ws = willowSpots[wi];
    const wx = origin.x + ws.lx;
    const wz = origin.z + ws.lz;
    const wy = getTerrainHeight(wx, wz);
    const wTree = new THREE.Group();
    wTree.position.set(wx, wy, wz);
    wTree.scale.setScalar(ws.s);
    const trunk = new THREE.Mesh(willowTrunkGeo, timberMat);
    trunk.position.y = 1.15;
    trunk.rotation.z = ws.lx < 0 ? -0.1 : 0.1;
    const crownMain = new THREE.Mesh(willowCrownGeo, willowFoliageMat);
    crownMain.position.set(0, 2.65, 0);
    crownMain.scale.set(1.32, 0.94, 1.28);
    const crownSide = new THREE.Mesh(willowCrownGeo, willowFoliageMat);
    crownSide.position.set(ws.lx < 0 ? 0.72 : -0.72, 2.25, 0.32);
    crownSide.scale.set(0.92, 0.82, 0.92);
    const crownRear = new THREE.Mesh(willowCrownGeo, willowFoliageMat);
    crownRear.position.set(ws.lx < 0 ? -0.48 : 0.48, 2.35, -0.45);
    crownRear.scale.set(0.84, 0.76, 0.84);
    wTree.add(trunk, crownMain, crownSide, crownRear);
    group.add(wTree);

    // Drooping weeping willow frond curtains around the canopy perimeter
    for (let f = 0; f < FRONDS_PER_WILLOW; f++) {
      const ang = (f / FRONDS_PER_WILLOW) * TWO_PI + wi * 0.4;
      const rad = (1.15 + (f % 2) * 0.35) * ws.s;
      const fx = wx + Math.cos(ang) * rad;
      const fz = wz + Math.sin(ang) * rad;
      const fy = wy + (2.55 + (f % 3) * 0.18) * ws.s;
      dummy.position.set(fx, fy, fz);
      dummy.rotation.set(Math.sin(ang) * 0.12, ang, -Math.cos(ang) * 0.12);
      dummy.scale.set(ws.s, ws.s * (0.9 + (f % 3) * 0.18), ws.s);
      dummy.updateMatrix();
      willowFrondInstanced.setMatrixAt(frondIdx++, dummy.matrix);
    }
  }
  willowFrondInstanced.instanceMatrix.needsUpdate = true;
  group.add(willowFrondInstanced);

  // Wooden bridge across the river at (0, 42) — enhanced with carved Tibetan bridge gateposts & prayer flags
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = 'YarlungRiverBridge';
  bridgeGroup.position.set(origin.x, 0.38, origin.z + BRIDGE_LZ);
  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.28, 3.8), timberMat);
  bridgeDeck.castShadow = true;
  bridgeDeck.receiveShadow = true;

  // Transverse timber deck planks & stone abutment pads at each bank
  const plankGeo = new THREE.BoxGeometry(0.42, 0.04, 3.66);
  for (let i = -9; i <= 9; i++) {
    const plank = new THREE.Mesh(plankGeo, darkWoodMat);
    plank.position.set(i * 0.56, 0.15, 0);
    bridgeGroup.add(plank);
  }

  // East & West sloped timber approach ramps connecting the 0.52m deck to the riverbanks
  const rampGeo = new THREE.BoxGeometry(1.62, 0.24, 3.8);
  const rampPitch = Math.atan2(0.42, 1.4);
  const abutmentGeo = new THREE.BoxGeometry(1.2, 0.46, 4.3);
  for (const side of [-1, 1]) {
    const ramp = new THREE.Mesh(rampGeo, timberMat);
    ramp.position.set(side * 6.18, -0.18, 0);
    ramp.rotation.z = -side * rampPitch;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    bridgeGroup.add(ramp);

    const abutment = new THREE.Mesh(abutmentGeo, dressedStoneMat);
    abutment.position.set(side * 5.45, -0.22, 0);
    bridgeGroup.add(abutment);
  }

  const railN = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.65, 0.18), timberMat);
  railN.position.set(0, 0.42, -1.75);
  railN.castShadow = true;
  const railS = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.65, 0.18), timberMat);
  railS.position.set(0, 0.42, 1.75);
  railS.castShadow = true;
  bridgeGroup.add(bridgeDeck, railN, railS);

  // Sloped ramp side rails, timber support piers & carved Tibetan bridge gateposts with prayer flags
  const rampRailGeo = new THREE.BoxGeometry(1.55, 0.52, 0.18);
  const bridgePostGeo = new THREE.CylinderGeometry(0.13, 0.15, 1.35, 6);
  const gatePostGeo = new THREE.BoxGeometry(0.38, 2.25, 0.38);
  const gateCapGeo = new THREE.ConeGeometry(0.32, 0.42, 4);
  const bridgeFlagGeo = new THREE.PlaneGeometry(0.38, 0.28);
  const bridgeFlagMeshes = [];

  for (const rz of [-1.75, 1.75]) {
    for (const side of [-1, 1]) {
      const rampRail = new THREE.Mesh(rampRailGeo, timberMat);
      rampRail.position.set(side * 6.15, 0.18, rz);
      rampRail.rotation.z = -side * rampPitch;
      rampRail.castShadow = true;
      bridgeGroup.add(rampRail);

      // Carved Tibetan bridge gatepost at each bridge corner
      const gatePost = new THREE.Mesh(gatePostGeo, redFriezeMat);
      gatePost.position.set(side * 5.35, 1.05, rz);
      gatePost.castShadow = true;
      const gateCap = new THREE.Mesh(gateCapGeo, goldRoofMat);
      gateCap.position.set(side * 5.35, 2.32, rz);
      gateCap.rotation.y = Math.PI / 4;
      bridgeGroup.add(gatePost, gateCap);
    }

    for (const px of [-6.8, -5.4, -2.7, 0, 2.7, 5.4, 6.8]) {
      const isRampEnd = Math.abs(px) > 6.0;
      const post = new THREE.Mesh(bridgePostGeo, timberMat);
      post.position.set(px, isRampEnd ? -0.12 : 0.18, rz);
      post.castShadow = true;
      bridgeGroup.add(post);
    }

    // 10 fluttering prayer flags strung along the North & South bridge side railings
    for (let f = 0; f < 10; f++) {
      const u = (f + 0.5) / 10;
      const fx = -5.1 + u * 10.2;
      const sag = Math.sin(u * Math.PI) * 0.26;
      const fy = 1.98 - sag;
      const flag = new THREE.Mesh(bridgeFlagGeo, prayerFlagMats[f % 5]);
      flag.position.set(fx, fy, rz);
      bridgeGroup.add(flag);
      bridgeFlagMeshes.push({ mesh: flag, baseZ: rz, phase: f * 0.7 + (rz > 0 ? 1.2 : 0) });
    }
  }
  group.add(bridgeGroup);

  // Solid side railing colliders so entities cannot walk North/South through the bridge sides,
  // while leaving the 3.16m East-West roadway completely clear for crossing.
  pushCollider(ctx, 'yarlung', {
    type: 'box',
    minX: origin.x - BRIDGE_RAMP_END_X,
    maxX: origin.x + BRIDGE_RAMP_END_X,
    minZ: origin.z + BRIDGE_LZ - BRIDGE_HALF_Z,
    maxZ: origin.z + BRIDGE_LZ - 1.58,
  });
  pushCollider(ctx, 'yarlung', {
    type: 'box',
    minX: origin.x - BRIDGE_RAMP_END_X,
    maxX: origin.x + BRIDGE_RAMP_END_X,
    minZ: origin.z + BRIDGE_LZ + 1.58,
    maxZ: origin.z + BRIDGE_LZ + BRIDGE_HALF_Z,
  });

  // ---------------------------------------------------------------- 4. SEASON Swaying Golden Barley Terraces & Wildflowers (`InstancedMesh`, 0 colliders)
  // Low dry-stone terrace field borders (`青稞梯田石埂`, 0 colliders) + golden barley sheaves on both banks
  const terraceWallGeo = new THREE.BoxGeometry(13.8, 0.32, 0.46);
  const barleySheafGeo = new THREE.ConeGeometry(0.46, 0.92, 6);
  const barleyMat = new THREE.MeshStandardMaterial({
    color: 0xf2b938,
    roughness: 0.66,
    emissive: new THREE.Color(0x85580f),
    emissiveIntensity: 0.36,
  });
  const terracePlots = [
    { lx: -15.5, lz: 52, rotY: 0.04 },
    { lx: -15.5, lz: 34, rotY: -0.03 },
    { lx: -15.5, lz: 16, rotY: 0.02 },
    { lx: -15.5, lz: -2, rotY: -0.02 },
    { lx: 15.5, lz: 30, rotY: -0.04 },
    { lx: 15.5, lz: 14, rotY: 0.03 },
    { lx: 15.5, lz: -2, rotY: -0.02 },
    { lx: 15.5, lz: -16, rotY: 0.02 },
  ];
  for (let ti = 0; ti < terracePlots.length; ti++) {
    const tp = terracePlots[ti];
    const tx = origin.x + tp.lx;
    const tz = origin.z + tp.lz;
    const ty = getTerrainHeight(tx, tz);
    const bund = new THREE.Mesh(terraceWallGeo, dressedStoneMat);
    bund.position.set(tx, ty + 0.12, tz);
    bund.rotation.y = tp.rotY;
    group.add(bund);

    // Harvested golden barley stook sheaves stacked beside the terrace stone bund
    for (const sideX of [-4.2, 4.2]) {
      const sheaf = new THREE.Mesh(barleySheafGeo, barleyMat);
      sheaf.position.set(tx + sideX, ty + 0.45, tz + 0.65);
      sheaf.rotation.y = ti * 0.7;
      group.add(sheaf);
    }
  }

  // Dense swaying golden barley stalks (`青稞麥浪`, 460 instances in 1 draw call with golden-amber tint variation)
  const barleyCount = 460;
  const stalkGeo = new THREE.ConeGeometry(0.21, 1.34, 5);
  stalkGeo.translate(0, 0.67, 0);
  const barleyInstanced = new THREE.InstancedMesh(stalkGeo, barleyMat, barleyCount);
  barleyInstanced.name = 'BarleyFieldsInstanced';
  const bRng = seededRandom(3401);
  const bCol = new THREE.Color();
  const barleyTints = [0xf5c542, 0xe5a932, 0xfbd34d, 0xdca23a];

  for (let i = 0; i < barleyCount; i++) {
    const bank = i % 2 === 0 ? -1 : 1; // west bank & east bank
    const lx = bank * (8.2 + bRng() * 16.5);
    const lz = -20 + bRng() * 80; // z from -20 to +60
    const wx = origin.x + lx;
    const wz = origin.z + lz;
    const wy = getHeight(wx, wz);

    dummy.position.set(wx, wy, wz);
    dummy.rotation.set((bRng() - 0.5) * 0.16, bRng() * TWO_PI, (bRng() - 0.5) * 0.16);
    const s = 0.85 + bRng() * 0.62;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    barleyInstanced.setMatrixAt(i, dummy.matrix);
    bCol.setHex(barleyTints[i % barleyTints.length]);
    barleyInstanced.setColorAt(i, bCol);
  }
  barleyInstanced.instanceMatrix.needsUpdate = true;
  if (barleyInstanced.instanceColor) barleyInstanced.instanceColor.needsUpdate = true;
  group.add(barleyInstanced);

  // Alpine wildflowers scattered across the valley meadows (`InstancedMesh`, 0 colliders)
  const flowerCount = 140;
  const flowerGeo = new THREE.DodecahedronGeometry(0.16, 0);
  flowerGeo.translate(0, 0.14, 0);
  const flowerMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.6,
    emissive: new THREE.Color(0xd97706),
    emissiveIntensity: 0.28,
  });
  const flowerInstanced = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
  flowerInstanced.name = 'AlpineWildflowersInstanced';
  const fCol = new THREE.Color();
  const flowerPalette = [0xfef08a, 0x93c5fd, 0xf9a8d4, 0xfde047];
  for (let i = 0; i < flowerCount; i++) {
    const angle = bRng() * TWO_PI;
    const dist = 14 + bRng() * 72;
    const lx = Math.cos(angle) * dist;
    const lz = Math.sin(angle) * dist;
    if (Math.abs(lx) < 6.5) continue;
    const wx = origin.x + lx;
    const wz = origin.z + lz;
    const wy = getTerrainHeight(wx, wz);
    dummy.position.set(wx, wy, wz);
    dummy.rotation.set(0, bRng() * TWO_PI, 0);
    const s = 0.7 + bRng() * 0.65;
    dummy.scale.set(s, s * 0.65, s);
    dummy.updateMatrix();
    flowerInstanced.setMatrixAt(i, dummy.matrix);
    fCol.setHex(flowerPalette[i % flowerPalette.length]);
    flowerInstanced.setColorAt(i, fCol);
  }
  flowerInstanced.instanceMatrix.needsUpdate = true;
  if (flowerInstanced.instanceColor) flowerInstanced.instanceColor.needsUpdate = true;
  group.add(flowerInstanced);

  // ---------------------------------------------------------------- 5. South Entrance Gate (4000, 89)
  const gateCfg = (mapDef.gates && mapDef.gates[0]) || { x: origin.x, z: origin.z + 89 };
  buildGateArch(ctx, group, {
    mapId: 'yarlung',
    x: gateCfg.x,
    z: gateCfg.z,
    y: getHeight(gateCfg.x, gateCfg.z),
  });

  // ---------------------------------------------------------------- 6. Yarlung Village (4025, 45) + Watermill + Threshing Courtyard
  const villageGroup = new THREE.Group();
  villageGroup.name = 'YarlungVillage';
  group.add(villageGroup);

  const houseSpecs = [
    { lx: 18, lz: 52, w: 4.5, d: 3.8, h: 2.8, rot: 0.2 },
    { lx: 31, lz: 53, w: 4.2, d: 3.6, h: 2.6, rot: -0.25 },
    { lx: 34, lz: 43, w: 4.8, d: 3.8, h: 2.9, rot: -0.45 },
    { lx: 20, lz: 37, w: 4.2, d: 3.5, h: 2.6, rot: 0.35 },
    { lx: 31, lz: 35, w: 4.0, d: 3.4, h: 2.5, rot: -0.15 },
  ];

  const winFrameGeo = new THREE.BoxGeometry(0.68, 0.76, 0.1);
  const winPaneGeo = new THREE.BoxGeometry(0.44, 0.54, 0.12);
  const winLintelGeo = new THREE.BoxGeometry(0.82, 0.14, 0.15);
  const roofPoleGeo = new THREE.CylinderGeometry(0.035, 0.045, 1.35, 6);
  const sangFurnaceGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.45, 6);
  const brassMirrorGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 10);
  brassMirrorGeo.rotateX(Math.PI / 2);

  for (let hi = 0; hi < houseSpecs.length; hi++) {
    const hs = houseSpecs[hi];
    const hx = origin.x + hs.lx;
    const hz = origin.z + hs.lz;
    const hy = getHeight(hx, hz);
    const hGrp = new THREE.Group();
    hGrp.position.set(hx, hy, hz);
    hGrp.rotation.y = hs.rot;

    // Stone base plinth
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(hs.w + 0.24, 0.34, hs.d + 0.24),
      dressedStoneMat,
    );
    plinth.position.y = 0.17;
    hGrp.add(plinth);

    // Whitewashed stone main walls
    const body = new THREE.Mesh(new THREE.BoxGeometry(hs.w, hs.h, hs.d), stoneWallMat);
    body.position.y = hs.h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    hGrp.add(body);

    // Deep crimson Penma roof frieze + golden circular mirrors
    const frieze = new THREE.Mesh(
      new THREE.BoxGeometry(hs.w + 0.18, 0.38, hs.d + 0.18),
      redFriezeMat,
    );
    frieze.position.y = hs.h - 0.14;
    hGrp.add(frieze);

    for (const mx of [-hs.w * 0.28, 0, hs.w * 0.28]) {
      const mirror = new THREE.Mesh(brassMirrorGeo, goldRoofMat);
      mirror.position.set(mx, hs.h - 0.14, hs.d * 0.5 + 0.08);
      hGrp.add(mirror);
    }

    // Timber doorway with carved red lintel
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.68, 0.1), darkWoodMat);
    doorFrame.position.set(0, 0.84, hs.d * 0.5 + 0.03);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.54, 0.13), timberMat);
    door.position.set(0, 0.78, hs.d * 0.5 + 0.04);
    const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.18, 0.18), redFriezeMat);
    doorLintel.position.set(0, 1.72, hs.d * 0.5 + 0.06);
    hGrp.add(doorFrame, door, doorLintel);

    // Front Tibetan black-framed windows (`梯形黑框窗`)
    for (const wxOff of [-hs.w * 0.3, hs.w * 0.3]) {
      const wf = new THREE.Mesh(winFrameGeo, darkWoodMat);
      wf.position.set(wxOff, hs.h * 0.62, hs.d * 0.5 + 0.03);
      const wp = new THREE.Mesh(winPaneGeo, warmWindowMat);
      wp.position.set(wxOff, hs.h * 0.62, hs.d * 0.5 + 0.04);
      const wl = new THREE.Mesh(winLintelGeo, redFriezeMat);
      wl.position.set(wxOff, hs.h * 0.62 + 0.42, hs.d * 0.5 + 0.06);
      hGrp.add(wf, wp, wl);
    }

    // Rooftop corner incense burner (`煨桑爐`) & prayer flag pole (`風馬旗`)
    const sang = new THREE.Mesh(sangFurnaceGeo, stoneWallMat);
    sang.position.set(hs.w * 0.42, hs.h + 0.22, hs.d * 0.4);
    const pole = new THREE.Mesh(roofPoleGeo, timberMat);
    pole.position.set(-hs.w * 0.42, hs.h + 0.65, hs.d * 0.4);
    const roofFlag = new THREE.Mesh(bridgeFlagGeo, prayerFlagMats[hi % 5]);
    roofFlag.position.set(-hs.w * 0.42 + 0.2, hs.h + 1.05, hs.d * 0.4);
    hGrp.add(sang, pole, roofFlag);
    bridgeFlagMeshes.push({ mesh: roofFlag, baseZ: hs.d * 0.4, phase: hi * 1.1 });

    villageGroup.add(hGrp);
    pushCollider(ctx, 'yarlung', {
      type: 'circle',
      x: hx,
      z: hz,
      r: Math.max(hs.w, hs.d) * 0.52,
    });
  }

  // Streamside Watermill with rotating waterwheel & stone threshing courtyard at local (11, 47)
  const millX = origin.x + 11;
  const millZ = origin.z + 47;
  const millY = getHeight(millX, millZ);
  const millGroup = new THREE.Group();
  millGroup.position.set(millX, millY, millZ);

  // Paved stone threshing courtyard (`打麥場`, 0 colliders) & wooden barley drying rack (`禾架`)
  const threshingFloor = new THREE.Mesh(
    new THREE.CircleGeometry(4.4, 24).rotateX(-Math.PI / 2),
    dressedStoneMat,
  );
  threshingFloor.position.set(2.4, 0.02, -0.4);
  threshingFloor.receiveShadow = true;
  const threshingRim = new THREE.Mesh(
    new THREE.RingGeometry(4.15, 4.45, 24).rotateX(-Math.PI / 2),
    stoneWallMat,
  );
  threshingRim.position.set(2.4, 0.028, -0.4);
  millGroup.add(threshingFloor, threshingRim);

  // Barley drying rack (`青稞禾架`, 0 colliders) on edge of threshing court
  const rackPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.9, 6), timberMat);
  rackPostL.position.set(4.6, 0.95, -2.8);
  const rackPostR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.9, 6), timberMat);
  rackPostR.position.set(6.8, 0.95, -2.8);
  const rackBarTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.1), timberMat);
  rackBarTop.position.set(5.7, 1.72, -2.8);
  const rackBarMid = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.1), timberMat);
  rackBarMid.position.set(5.7, 1.15, -2.8);
  const hangingSheaf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.48, 0.28), barleyMat);
  hangingSheaf.position.set(5.7, 1.42, -2.8);
  millGroup.add(rackPostL, rackPostR, rackBarTop, rackBarMid, hangingSheaf);

  // Mill house with crimson Penma frieze & stone water flume
  const millHouse = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.5, 3.2), stoneWallMat);
  millHouse.position.y = 1.25;
  millHouse.castShadow = true;
  millHouse.receiveShadow = true;
  const millFrieze = new THREE.Mesh(new THREE.BoxGeometry(3.76, 0.32, 3.36), redFriezeMat);
  millFrieze.position.y = 2.38;
  const millFlume = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.26, 0.9), dressedStoneMat);
  millFlume.position.set(-2.1, 0.14, 0);
  millGroup.add(millHouse, millFrieze, millFlume);

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
  const yakHornMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.55 });
  const yakHornGeo = new THREE.ConeGeometry(0.06, 0.36, 6);
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
    const yBody = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.78, 1.48), calmYakMat);
    yBody.position.y = 0.66;
    const ySkirt = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.38, 1.36), calmYakMat);
    ySkirt.position.y = 0.34;
    const yHead = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.52), calmYakMat);
    yHead.position.set(0, 0.46, -0.78);
    yHead.rotation.x = 0.55;
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(yakHornGeo, yakHornMat);
      horn.position.set(side * 0.28, 0.18, -0.05);
      horn.rotation.z = -side * 0.75;
      yHead.add(horn);
    }
    yGrp.add(yBody, ySkirt, yHead);
    villageYakHeads.push(yHead);
    villageGroup.add(yGrp);
  });

  // ---------------------------------------------------------------- 7. Yumbulagang Royal Fortress (-45, 20) on Western Ridge
  const palaceX = origin.x - 45;
  const palaceZ = origin.z + 20;
  const palaceY = getHeight(palaceX, palaceZ);
  const palaceGroup = new THREE.Group();
  palaceGroup.name = 'YumbulagangPalace';
  palaceGroup.position.set(palaceX, palaceY, palaceZ);
  group.add(palaceGroup);

  // Stepped stone switchback staircase with low stone parapet walls leading up the ridge ramp
  // from (-25, 24) to (-40, 20) (0 new colliders)
  const stepTreadGeo = new THREE.BoxGeometry(2.3, 0.24, 1.75);
  const stepParapetGeo = new THREE.BoxGeometry(1.65, 0.48, 0.24);
  const stepCapGeo = new THREE.BoxGeometry(1.7, 0.1, 0.28);
  const stepCount = 14;
  for (let s = 0; s < stepCount; s++) {
    const u = s / (stepCount - 1);
    const sx = origin.x - 25.0 - u * 15.2;
    const sz = origin.z + 24.2 - Math.sin(u * Math.PI * 2) * 2.4 - u * 4.2;
    const sy = getHeight(sx, sz);

    const uNext = Math.min(1, (s + 1) / (stepCount - 1));
    const nx = origin.x - 25.0 - uNext * 15.2;
    const nz = origin.z + 24.2 - Math.sin(uNext * Math.PI * 2) * 2.4 - uNext * 4.2;
    const yaw = Math.atan2(nz - sz, nx - sx);

    const stepGrp = new THREE.Group();
    stepGrp.position.set(sx, sy + 0.05, sz);
    stepGrp.rotation.y = -yaw;

    const tread = new THREE.Mesh(stepTreadGeo, stoneWallMat);
    stepGrp.add(tread);

    // Alternating low whitewashed stone parapet walls with crimson coping along the ridge steps
    if (s % 2 === 0) {
      for (const side of [-1, 1]) {
        const parapet = new THREE.Mesh(stepParapetGeo, stoneWallMat);
        parapet.position.set(0, 0.3, side * 0.98);
        const cap = new THREE.Mesh(stepCapGeo, redFriezeMat);
        cap.position.set(0, 0.56, side * 0.98);
        stepGrp.add(parapet, cap);
      }
    }
    group.add(stepGrp);
  }

  // Ridge plateau stone terrace pavement & low perimeter parapet (leaving eastern entry open)
  const ridgePavement = new THREE.Mesh(
    new THREE.CylinderGeometry(9.6, 10.4, 0.32, 12),
    dressedStoneMat,
  );
  ridgePavement.position.set(-2.2, -0.12, 0);
  ridgePavement.receiveShadow = true;
  palaceGroup.add(ridgePavement);

  // Battered whitewashed Tibetan Dzong walls (inward-tapering 4-sided frustums rotated 45°)
  const makeBatteredWallGeo = (bottomW, topW, h, dRatio = 0.8) => {
    const geo = new THREE.CylinderGeometry(topW * 0.7071, bottomW * 0.7071, h, 4);
    geo.rotateY(Math.PI / 4);
    geo.scale(1, 1, dRatio);
    return geo;
  };

  // Lower Royal Hall (`下層宮殿`) at (-5.8, 0, 0) — battered stone walls + crimson Penma frieze
  const lowerFoundation = new THREE.Mesh(
    makeBatteredWallGeo(7.6, 7.1, 1.2, 0.82),
    dressedStoneMat,
  );
  lowerFoundation.position.set(-5.8, 0.6, 0);

  const fortressHall = new THREE.Mesh(makeBatteredWallGeo(7.1, 6.4, 4.4, 0.8), stoneWallMat);
  fortressHall.position.set(-5.8, 2.7, 0);
  fortressHall.castShadow = true;
  fortressHall.receiveShadow = true;

  const fortressFrieze = new THREE.Mesh(new THREE.BoxGeometry(6.75, 0.72, 5.45), redFriezeMat);
  fortressFrieze.position.set(-5.8, 4.62, 0);
  const fortressCornice = new THREE.Mesh(new THREE.BoxGeometry(6.95, 0.18, 5.65), goldRoofMat);
  fortressCornice.position.set(-5.8, 5.02, 0);

  // Golden circular mirrors (`圓鏡`) studded along the Lower Hall crimson Penma frieze
  const dzongMirrorGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12);
  dzongMirrorGeo.rotateZ(Math.PI / 2);
  for (const mz of [-1.8, -0.6, 0.6, 1.8]) {
    const mirrorE = new THREE.Mesh(dzongMirrorGeo, goldRoofMat);
    mirrorE.position.set(-2.4, 4.62, mz);
    palaceGroup.add(mirrorE);
  }

  // East ceremonial entrance portico projecting from the lower hall at x = -2.45
  const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.34, 2.55), redFriezeMat);
  porticoRoof.position.set(-2.35, 2.85, 0);
  const porticoTrim = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 2.68), goldRoofMat);
  porticoTrim.position.set(-2.35, 3.06, 0);
  const palaceDoor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.25, 1.45), darkWoodMat);
  palaceDoor.position.set(-2.48, 1.25, 0);
  for (const pz of [-0.95, 0.95]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.65, 8), redFriezeMat);
    pillar.position.set(-1.85, 1.35, pz);
    palaceGroup.add(pillar);
  }
  palaceGroup.add(
    lowerFoundation,
    fortressHall,
    fortressFrieze,
    fortressCornice,
    porticoRoof,
    porticoTrim,
    palaceDoor,
  );

  // Soaring Central Watchtower (`Utse` / `紅宮主塔樓`) rising above the western ridge
  const watchTower = new THREE.Mesh(makeBatteredWallGeo(4.1, 3.35, 8.8, 0.96), stoneWallMat);
  watchTower.position.set(-6.5, 4.6, -1.1);
  watchTower.castShadow = true;
  watchTower.receiveShadow = true;

  const towerCrimson = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.92, 3.55), redFriezeMat);
  towerCrimson.position.set(-6.5, 8.65, -1.1);
  const towerGoldCornice = new THREE.Mesh(new THREE.BoxGeometry(3.88, 0.18, 3.78), goldRoofMat);
  towerGoldCornice.position.set(-6.5, 9.18, -1.1);

  for (const mz of [-2.0, -1.1, -0.2]) {
    const tMirror = new THREE.Mesh(dzongMirrorGeo, goldRoofMat);
    tMirror.position.set(-4.65, 8.65, mz);
    palaceGroup.add(tMirror);
  }

  // Multi-story Tibetan trapezoidal black-framed windows (`梯形黑框窗`) on East, North & South facades
  const dzongWinFrameGeo = new THREE.BoxGeometry(0.14, 0.95, 0.72);
  const dzongWinPaneGeo = new THREE.BoxGeometry(0.16, 0.68, 0.46);
  const dzongWinBrowGeo = new THREE.BoxGeometry(0.22, 0.16, 0.86);
  const eastWindowCoords = [
    // Lower Hall East facade
    { x: -2.55, y: 3.35, z: -1.65 },
    { x: -2.55, y: 3.35, z: 1.65 },
    // Watchtower East facade (3 stories)
    { x: -4.75, y: 5.55, z: -1.85 },
    { x: -4.75, y: 5.55, z: -0.35 },
    { x: -4.82, y: 7.25, z: -1.85 },
    { x: -4.82, y: 7.25, z: -0.35 },
  ];
  for (const wc of eastWindowCoords) {
    const wf = new THREE.Mesh(dzongWinFrameGeo, darkWoodMat);
    wf.position.set(wc.x, wc.y, wc.z);
    const wp = new THREE.Mesh(dzongWinPaneGeo, warmWindowMat);
    wp.position.set(wc.x + 0.01, wc.y, wc.z);
    const wb = new THREE.Mesh(dzongWinBrowGeo, stoneWallMat);
    wb.position.set(wc.x + 0.03, wc.y + 0.52, wc.z);
    palaceGroup.add(wf, wp, wb);
  }

  // Double-tiered Gilded Tibetan Royal Pitched Roof (`金頂`), Dharma Wheel & Corner Victory Banners (`幢幡`)
  const lowerGoldEave = new THREE.Mesh(new THREE.ConeGeometry(3.05, 1.15, 4), goldRoofMat);
  lowerGoldEave.rotation.y = Math.PI / 4;
  lowerGoldEave.position.set(-6.5, 9.75, -1.1);

  const goldenRoof = new THREE.Mesh(new THREE.ConeGeometry(2.35, 1.55, 4), goldRoofMat);
  goldenRoof.rotation.y = Math.PI / 4;
  goldenRoof.position.set(-6.5, 10.65, -1.1);

  const roofSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.22, 1.1, 8), goldRoofMat);
  roofSpire.position.set(-6.5, 11.65, -1.1);

  // Golden Dharma Wheel (`法輪雙鹿`) on the east-facing roof brow
  const dharmaWheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 16), goldRoofMat);
  dharmaWheel.rotation.y = Math.PI / 2;
  dharmaWheel.position.set(-4.75, 9.62, -1.1);
  const deerGeo = new THREE.ConeGeometry(0.16, 0.42, 5);
  for (const side of [-1, 1]) {
    const deer = new THREE.Mesh(deerGeo, goldRoofMat);
    deer.position.set(-4.75, 9.38, -1.1 + side * 0.62);
    deer.rotation.x = -side * 0.45;
    palaceGroup.add(deer);
  }

  // 4 Corner Victory Banners (`Gyaltsen` / `幢幡`) on the watchtower parapet corners
  const gyaltsenCylinderGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.95, 10);
  const gyaltsenRingGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.14, 10);
  const gyaltsenTopGeo = new THREE.ConeGeometry(0.22, 0.35, 8);
  for (const cxOff of [-1.72, 1.72]) {
    for (const czOff of [-1.68, 1.68]) {
      const gx = -6.5 + cxOff;
      const gz = -1.1 + czOff;
      const gBody = new THREE.Mesh(gyaltsenCylinderGeo, bannerClothMat);
      gBody.position.set(gx, 9.72, gz);
      const gBand = new THREE.Mesh(gyaltsenRingGeo, goldRoofMat);
      gBand.position.set(gx, 9.72, gz);
      const gCap = new THREE.Mesh(gyaltsenTopGeo, goldRoofMat);
      gCap.position.set(gx, 10.35, gz);
      palaceGroup.add(gBody, gBand, gCap);
    }
  }

  palaceGroup.add(
    watchTower,
    towerCrimson,
    towerGoldCornice,
    lowerGoldEave,
    goldenRoof,
    roofSpire,
    dharmaWheel,
  );
  pushCollider(ctx, 'yarlung', { type: 'circle', x: palaceX - 6.0, z: palaceZ - 0.4, r: 3.4 });

  // Craggy Limestone Spur Buttresses beneath Yumbulagang Palace so it grows out of the razor-edge ridge (0 colliders)
  const limestoneSpurMat = new THREE.MeshStandardMaterial({
    color: 0xc2b29b,
    emissive: new THREE.Color(0x33271a),
    emissiveIntensity: 0.24,
    roughness: 0.86,
    flatShading: true,
  });
  const limestoneShadowMat = new THREE.MeshStandardMaterial({
    color: 0x857764,
    emissive: new THREE.Color(0x211a12),
    emissiveIntensity: 0.2,
    roughness: 0.9,
    flatShading: true,
  });
  const buttressPillarGeo = new THREE.ConeGeometry(1.0, 1.0, 5);
  const buttressCragGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const limestoneButtressSpecs = [
    // Sheer vertical limestone ribs directly beneath the Central Watchtower (Utse) & Lower Hall
    { x: -7.6, y: -1.4, z: -2.4, sx: 2.8, sy: 6.2, sz: 2.2, rotY: 0.35, shadow: false, isCone: true },
    { x: -8.4, y: -1.2, z: 0.4, sx: 3.1, sy: 6.8, sz: 2.5, rotY: -0.42, shadow: true, isCone: true },
    { x: -6.2, y: -1.5, z: -3.2, sx: 2.5, sy: 5.6, sz: 2.1, rotY: 0.68, shadow: false, isCone: true },
    { x: -5.4, y: -1.6, z: 2.9, sx: 2.6, sy: 5.4, sz: 2.2, rotY: -0.55, shadow: false, isCone: true },
    // Razor-edge eastern & southern spur buttresses descending toward the valley floor
    { x: -2.8, y: -1.8, z: -3.4, sx: 2.4, sy: 4.8, sz: 1.9, rotY: 0.25, shadow: false, isCone: true },
    { x: -2.6, y: -1.8, z: 3.3, sx: 2.4, sy: 4.8, sz: 1.9, rotY: -0.25, shadow: true, isCone: true },
    { x: 0.6, y: -2.1, z: -3.8, sx: 2.2, sy: 4.2, sz: 1.8, rotY: 0.48, shadow: false, isCone: true },
    { x: 0.8, y: -2.1, z: 3.6, sx: 2.2, sy: 4.2, sz: 1.8, rotY: -0.48, shadow: true, isCone: true },
    { x: 4.2, y: -2.4, z: -2.8, sx: 2.0, sy: 3.6, sz: 1.7, rotY: 0.18, shadow: false, isCone: true },
    { x: 4.5, y: -2.4, z: 2.6, sx: 2.0, sy: 3.6, sz: 1.7, rotY: -0.22, shadow: true, isCone: true },
    // Angular crag outcrops jutting from the cliff shoulder
    { x: -6.8, y: 0.4, z: -2.9, sx: 1.8, sy: 2.4, sz: 1.5, rotY: 0.4, shadow: false, isCone: false },
    { x: -6.6, y: 0.3, z: 2.7, sx: 1.7, sy: 2.2, sz: 1.5, rotY: -0.35, shadow: true, isCone: false },
    { x: -3.6, y: -0.4, z: -3.1, sx: 1.9, sy: 1.8, sz: 1.4, rotY: 0.7, shadow: false, isCone: false },
    { x: -3.4, y: -0.4, z: 3.0, sx: 1.9, sy: 1.8, sz: 1.4, rotY: -0.6, shadow: false, isCone: false },
  ];
  for (let i = 0; i < limestoneButtressSpecs.length; i++) {
    const lb = limestoneButtressSpecs[i];
    const bMesh = new THREE.Mesh(
      lb.isCone ? buttressPillarGeo : buttressCragGeo,
      lb.shadow ? limestoneShadowMat : limestoneSpurMat,
    );
    bMesh.position.set(lb.x, lb.y, lb.z);
    bMesh.scale.set(lb.sx, lb.sy, lb.sz);
    bMesh.rotation.y = lb.rotY;
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    palaceGroup.add(bMesh);
  }

  // Long Cascading 5-Color Prayer-Flag Lines strung from Yumbulagang Watchtower down to the terraced valley
  const palaceRopeMat = new THREE.MeshStandardMaterial({
    color: 0xd6c4a2,
    roughness: 0.88,
  });
  const palaceFlagCascadeSpecs = [
    { p0: [-4.7, 9.1, -1.8], p1: [5.5, 2.2, -5.8], p2: [17.5, -2.6, -9.5], count: 14 },
    { p0: [-4.7, 9.1, -0.4], p1: [6.2, 2.5, -1.2], p2: [19.0, -2.7, -2.2], count: 14 },
    { p0: [-4.7, 8.8, 0.4], p1: [5.8, 2.1, 3.8], p2: [18.2, -2.6, 7.4], count: 14 },
    { p0: [-2.4, 4.9, -2.4], p1: [5.2, 0.4, -7.2], p2: [14.5, -2.8, -11.6], count: 12 },
    { p0: [-2.4, 4.9, 2.4], p1: [5.4, 0.5, 6.8], p2: [15.0, -2.8, 11.2], count: 12 },
  ];
  for (let ci = 0; ci < palaceFlagCascadeSpecs.length; ci++) {
    const cs = palaceFlagCascadeSpecs[ci];
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...cs.p0),
      new THREE.Vector3(...cs.p1),
      new THREE.Vector3(...cs.p2),
    );
    const ropeGeo = new THREE.TubeGeometry(curve, 16, 0.022, 5, false);
    palaceGroup.add(new THREE.Mesh(ropeGeo, palaceRopeMat));

    const yaw = Math.atan2(cs.p2[2] - cs.p0[2], cs.p2[0] - cs.p0[0]);
    for (let f = 1; f <= cs.count; f++) {
      const u = f / (cs.count + 1);
      const pt = curve.getPoint(u);
      const flag = new THREE.Mesh(bridgeFlagGeo, prayerFlagMats[(ci + f) % 5]);
      flag.position.set(pt.x, pt.y - 0.16, pt.z);
      flag.rotation.y = -yaw;
      palaceGroup.add(flag);
      bridgeFlagMeshes.push({
        mesh: flag,
        baseZ: pt.z,
        phase: ci * 1.1 + f * 0.55,
      });
    }
  }

  // ---------------------------------------------------------------- 8. Sheldrak Crystal Cave (4060, -30) & 4-Pillar Light-Reflection Puzzle
  const caveX = origin.x + 60;
  const caveZ = origin.z - 30;
  const caveY = getHeight(caveX, caveZ);
  const caveGroup = new THREE.Group();
  caveGroup.name = 'SheldrakCrystalCave';
  caveGroup.position.set(caveX, caveY, caveZ);
  group.add(caveGroup);

  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x3b495e,
    roughness: 0.88,
    metalness: 0.08,
  });
  const innerVaultMat = new THREE.MeshStandardMaterial({
    color: 0x131c2b,
    roughness: 0.94,
    metalness: 0.08,
    emissive: 0x071521,
    emissiveIntensity: 0.38,
    side: THREE.DoubleSide,
  });
  const caveFloorMat = new THREE.MeshStandardMaterial({
    color: 0x1b2536,
    roughness: 0.86,
    metalness: 0.14,
  });
  const quartzMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    roughness: 0.18,
    metalness: 0.45,
    emissive: new THREE.Color(0x0891b2),
    emissiveIntensity: 0.72,
    transparent: true,
    opacity: 0.9,
  });

  // 8a. Dark slate cavern floor & sacred refraction mandala rings
  const caveFloor = new THREE.Mesh(new THREE.CircleGeometry(8.6, 28), caveFloorMat);
  caveFloor.rotation.x = -Math.PI / 2;
  caveFloor.position.set(0.8, 0.02, 0);
  caveFloor.receiveShadow = true;
  caveGroup.add(caveFloor);

  const caveMandalaRing = new THREE.Mesh(
    new THREE.RingGeometry(3.85, 4.12, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  caveMandalaRing.position.set(-0.5, 0.035, 0);
  caveGroup.add(caveMandalaRing);

  // 8b. Seamless inner dark rock vault dome (open on the western entrance -X so zero sky leaks inside)
  const innerDomeGeo = new THREE.SphereGeometry(
    8.2,
    24,
    16,
    -Math.PI * 0.56,
    Math.PI * 1.12,
    0,
    Math.PI * 0.62,
  );
  const innerDome = new THREE.Mesh(innerDomeGeo, innerVaultMat);
  innerDome.position.set(0.8, 0.2, 0);
  innerDome.scale.set(1.18, 0.96, 1.12);
  caveGroup.add(innerDome);

  // Solid overhead cavern ceiling liner covering all 4 pillars & casket
  const ceilingCap = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 9.0, 1.8, 20), innerVaultMat);
  ceilingCap.position.set(0.6, 6.95, 0);
  ceilingCap.scale.set(1.16, 1.0, 1.08);
  caveGroup.add(ceilingCap);

  // 8c. Continuous horseshoe cliff walls (North, East back wall, and South) covering all 4 pillars
  const wallPlacements = [
    { x: -4.2, y: 3.4, z: -7.6, sx: 1.35, sy: 1.45, sz: 0.95 },
    { x: 0.4, y: 3.6, z: -7.8, sx: 1.45, sy: 1.5, sz: 0.95 },
    { x: 5.0, y: 3.5, z: -7.2, sx: 1.35, sy: 1.45, sz: 1.05 },
    { x: 8.2, y: 3.8, z: -3.6, sx: 1.05, sy: 1.55, sz: 1.35 },
    { x: 8.8, y: 4.0, z: 0.0, sx: 1.1, sy: 1.6, sz: 1.45 },
    { x: 8.2, y: 3.8, z: 3.6, sx: 1.05, sy: 1.55, sz: 1.35 },
    { x: 5.0, y: 3.5, z: 7.2, sx: 1.35, sy: 1.45, sz: 1.05 },
    { x: 0.4, y: 3.6, z: 7.8, sx: 1.45, sy: 1.5, sz: 0.95 },
    { x: -4.2, y: 3.4, z: 7.6, sx: 1.35, sy: 1.45, sz: 0.95 },
  ];
  for (let i = 0; i < wallPlacements.length; i++) {
    const wp = wallPlacements[i];
    const wMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(3.4, 1), cliffMat);
    wMesh.position.set(wp.x, wp.y, wp.z);
    wMesh.scale.set(wp.sx, wp.sy, wp.sz);
    wMesh.rotation.set(i * 0.28, i * 0.45, 0);
    wMesh.castShadow = true;
    wMesh.receiveShadow = true;
    caveGroup.add(wMesh);
  }

  // Western entrance arch pillars, brow lintel & sunlight aperture ring at (-7.5, 1.45, -1.5)
  const westLeftPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), cliffMat);
  westLeftPillar.position.set(-7.2, 3.2, -5.6);
  westLeftPillar.scale.set(1.05, 1.45, 1.15);
  const westRightPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), cliffMat);
  westRightPillar.position.set(-7.2, 3.2, 5.6);
  westRightPillar.scale.set(1.05, 1.45, 1.15);
  const westEntranceBrow = new THREE.Mesh(new THREE.DodecahedronGeometry(5.8, 1), cliffMat);
  westEntranceBrow.position.set(-6.4, 6.85, 0);
  westEntranceBrow.scale.set(0.76, 0.46, 1.58);
  caveGroup.add(westLeftPillar, westRightPillar, westEntranceBrow);

  // Multi-layered vaulted cave roof & snow-crowned Sheldrak mountain peak overhead
  const roofVaultFront = new THREE.Mesh(new THREE.DodecahedronGeometry(7.5, 1), cliffMat);
  roofVaultFront.position.set(-1.2, 7.8, 0);
  roofVaultFront.scale.set(1.35, 0.46, 1.42);
  const roofVaultRear = new THREE.Mesh(new THREE.DodecahedronGeometry(7.8, 1), cliffMat);
  roofVaultRear.position.set(3.8, 8.4, 0);
  roofVaultRear.scale.set(1.32, 0.58, 1.38);
  const sheldrakPeak = new THREE.Mesh(new THREE.DodecahedronGeometry(6.6, 1), mtnBaseMat);
  sheldrakPeak.position.set(2.5, 12.2, -0.5);
  sheldrakPeak.scale.set(1.35, 1.05, 1.25);
  const sheldrakSnowCap = new THREE.Mesh(new THREE.ConeGeometry(5.6, 4.2, 8), mtnSnowMat);
  sheldrakSnowCap.position.set(2.5, 16.2, -0.5);
  caveGroup.add(roofVaultFront, roofVaultRear, sheldrakPeak, sheldrakSnowCap);

  // 8d. Decorative quartz crystal clusters along cave walls & hanging ceiling stalactites
  [
    { x: 5.8, y: 1.4, z: -4.8, rz: 0.3, s: 1.15 },
    { x: 5.8, y: 1.5, z: 4.8, rz: -0.3, s: 1.15 },
    { x: -2.0, y: 1.3, z: -5.6, rz: 0.25, s: 1.0 },
    { x: -2.0, y: 1.3, z: 5.6, rz: -0.25, s: 1.0 },
    { x: 2.2, y: 1.4, z: -5.8, rz: 0.22, s: 1.1 },
    { x: 2.2, y: 1.4, z: 5.8, rz: -0.22, s: 1.1 },
    { x: 6.6, y: 1.6, z: -2.1, rz: 0.35, s: 1.25 },
    { x: 6.6, y: 1.6, z: 2.1, rz: -0.35, s: 1.25 },
  ].forEach((q) => {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.85, 6), quartzMat);
    shard.position.set(q.x, q.y, q.z);
    shard.rotation.z = q.rz;
    shard.scale.setScalar(q.s || 1);
    caveGroup.add(shard);
  });

  // Hanging rock & glowing cyan quartz stalactites from the cavern ceiling
  const stalGeo = new THREE.ConeGeometry(0.3, 1.6, 6);
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * TWO_PI;
    const sr = i % 3 === 0 ? 3.0 : 5.4;
    const sx = 0.6 + Math.cos(ang) * sr;
    const sz = Math.sin(ang) * sr;
    const isQuartz = i % 2 === 0;
    const stal = new THREE.Mesh(stalGeo, isQuartz ? quartzMat : cliffMat);
    stal.position.set(sx, 5.95, sz);
    stal.rotation.x = Math.PI;
    stal.scale.set(0.75 + (i % 3) * 0.22, 0.85 + (i % 4) * 0.25, 0.75 + (i % 3) * 0.22);
    caveGroup.add(stal);
  }

  // 8e. Cavern Interior Lighting — Sunlight Aperture Shaft, Pillar Refraction Pools & Dust Motes (0 PointLights)
  const poolGeo = new THREE.PlaneGeometry(1, 1);
  poolGeo.rotateX(-Math.PI / 2);

  // Volumetric golden sunlight cone streaming from the western cave mouth (-7.5, 1.45, -1.5)
  const sunShaftMat = new THREE.MeshBasicMaterial({
    color: 0xffe484,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const sunEntranceShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 1.85, 5.4, 14, 1, true),
    sunShaftMat,
  );
  sunEntranceShaft.position.set(-5.35, 1.65, -2.15);
  sunEntranceShaft.rotation.z = -1.32;
  sunEntranceShaft.rotation.y = -0.28;
  caveGroup.add(sunEntranceShaft);

  // Ambient cyan-turquoise crystal bounce light across the cavern floor & ceiling
  const cavernGlowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const cavernGlowPool = new THREE.Mesh(poolGeo, cavernGlowMat);
  cavernGlowPool.position.set(0.6, 0.03, 0);
  cavernGlowPool.scale.set(13.5, 1, 13.5);
  caveGroup.add(cavernGlowPool);

  const vaultCrystalGlowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const vaultCrystalGlow = new THREE.Mesh(poolGeo, vaultCrystalGlowMat);
  vaultCrystalGlow.position.set(0.6, 5.85, 0);
  vaultCrystalGlow.scale.set(11.5, 1, 11.5);
  caveGroup.add(vaultCrystalGlow);

  // Floating crystal dust motes inside Sheldrak Cave
  const sheldrakDustCount = 48;
  const sheldrakDustGeo = new THREE.BufferGeometry();
  const sheldrakDustPos = new Float32Array(sheldrakDustCount * 3);
  for (let i = 0; i < sheldrakDustCount; i++) {
    const a = (i / sheldrakDustCount) * TWO_PI * 2.9;
    const r = 0.9 + ((i * 19) % 12) * 0.52;
    sheldrakDustPos[i * 3 + 0] = 0.5 + Math.cos(a) * r;
    sheldrakDustPos[i * 3 + 1] = 0.45 + ((i * 11) % 10) * 0.48;
    sheldrakDustPos[i * 3 + 2] = Math.sin(a) * r;
  }
  sheldrakDustGeo.setAttribute('position', new THREE.BufferAttribute(sheldrakDustPos, 3));
  const sheldrakDustMat = new THREE.PointsMaterial({
    color: 0xa5f3fc,
    size: 0.14,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sheldrakDustPoints = new THREE.Points(sheldrakDustGeo, sheldrakDustMat);
  sheldrakDustPoints.name = 'SheldrakCaveDust';
  caveGroup.add(sheldrakDustPoints);

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

  const casketPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.8, 0.55, 8),
    stoneWallMat,
  );
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

  const casketPoolMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const casketLightPool = new THREE.Mesh(poolGeo, casketPoolMat);
  casketLightPool.position.y = 0.03;
  casketLightPool.scale.set(4.2, 1, 4.2);

  casketGroup.add(casketPedestal, casketBase, casketLid, casketScrollGlow, casketLightPool);

  // 4 Rotatable Crystal Pillars
  const pillars = [];
  for (const ps of pillarSpecs) {
    const py = getHeight(ps.wx, ps.wz);
    const pGrp = new THREE.Group();
    pGrp.name = ps.id;
    pGrp.position.set(ps.wx, py, ps.wz);

    const basePedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 0.45, 8),
      stoneWallMat,
    );
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

    // Radial floor refraction pool beneath each crystal pillar
    const pillarPoolMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const pillarPool = new THREE.Mesh(poolGeo, pillarPoolMat);
    pillarPool.position.y = 0.03;
    pillarPool.scale.set(3.5, 1, 3.5);
    pGrp.add(pillarPool);

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
      pillarPoolMat,
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
    casketPoolMat.color.setHex(0xfde047);
    casketPoolMat.opacity = 0.72;

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
      const litByBeam = i === 0 || sequentialHits === i;
      p.prismMat.emissiveIntensity = aligned && litByBeam ? 1.45 : litByBeam ? 0.85 : 0.52;
      if (p.pillarPoolMat) {
        p.pillarPoolMat.color.setHex(aligned && litByBeam ? 0xfde047 : 0x22d3ee);
        p.pillarPoolMat.opacity = aligned && litByBeam ? 0.65 : litByBeam ? 0.42 : 0.26;
      }
      if (aligned && sequentialHits === i) {
        sequentialHits = i + 1;
        beamSegments[i + 1].visible = true;
      } else {
        beamSegments[i + 1].visible = false;
      }
    }
    beamHits = sequentialHits;
    const progress = beamHits / 4;
    cavernGlowMat.opacity = 0.22 + progress * 0.34;
    vaultCrystalGlowMat.opacity = 0.18 + progress * 0.28;
    if (beamHits === 4) {
      casketPoolMat.color.setHex(0xfde047);
      casketPoolMat.opacity = 0.72;
      if (!sheldrakSolved) {
        grantSheldrakRewards();
      }
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
  if (!ctx.storyPreview && typeof window !== 'undefined') {
    window.__stupa = window.__stupa || {};
    window.__stupa.sheldrak = sheldrakApi;
  }

  // ---------------------------------------------------------------- 9. Alpine Pasture & Yarlha Shampo Glacier Boss Arena (4000, -75, r = 22)
  const arenaX = origin.x;
  const arenaZ = origin.z - 75;
  const arenaY = getHeight(arenaX, arenaZ);
  const pastureGroup = new THREE.Group();
  pastureGroup.name = 'AlpinePastureArena';
  pastureGroup.position.set(arenaX, arenaY, arenaZ);
  group.add(pastureGroup);

  // First child MUST be the RingGeometry encounter ring (`yarlungScene.js` hides it in Story mode)
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

  // Sacred White Yak & Snow Mountain Mandala Floor Emblem (`CircleGeometry`, r = 18m, y + 0.03)
  const mandalaTex = makeArenaMandalaTexture();
  const arenaMandalaMat = new THREE.MeshBasicMaterial({
    map: mandalaTex || null,
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const arenaMandalaGeo = new THREE.CircleGeometry(18.0, 48);
  arenaMandalaGeo.rotateX(-Math.PI / 2);
  const arenaMandalaMesh = new THREE.Mesh(arenaMandalaGeo, arenaMandalaMat);
  arenaMandalaMesh.position.y = 0.03;
  pastureGroup.add(arenaMandalaMesh);

  // 10 Colossal Crystalline Glacier Ice Spires & Ancient Tibetan Royal Stone Steles (`吐蕃石碑`, r = 22.8m, 0 colliders)
  const glacierVeinMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.16,
    metalness: 0.48,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.68,
    transparent: true,
    opacity: 0.92,
  });
  const steleRuneMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.25,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.85,
  });

  const spireMainGeo = new THREE.ConeGeometry(1.15, 5.8, 6);
  const spireShardGeo = new THREE.ConeGeometry(0.68, 3.2, 5);
  const stelePlinthGeo = new THREE.BoxGeometry(1.75, 0.55, 1.35);
  const steleBodyGeo = new THREE.BoxGeometry(1.18, 3.85, 0.56);
  const steleFriezeGeo = new THREE.BoxGeometry(1.34, 0.36, 0.68);
  const steleCapGeo = new THREE.ConeGeometry(1.05, 0.65, 4);
  const steleRuneGeo = new THREE.BoxGeometry(0.32, 2.35, 0.6);

  const perimeterNodes = [];
  for (let i = 0; i < 10; i++) {
    // Arc from East-South-East around North to West-South-West (leaving South entry open)
    const u = i / 9;
    const ang = -Math.PI * 0.18 - u * Math.PI * 0.64; // -32° through -90° (North) to -148°
    const r = 22.8;
    const px = Math.cos(ang) * r;
    const pz = Math.sin(ang) * r;
    const nodeGrp = new THREE.Group();
    nodeGrp.position.set(px, 0, pz);
    nodeGrp.lookAt(0, 0, 0);

    if (i % 2 === 0) {
      // Crystalline Glacier Ice Spire (`冰川晶簇尖塔`)
      const mainSpire = new THREE.Mesh(spireMainGeo, glacierVeinMat);
      mainSpire.position.y = 2.85;
      mainSpire.rotation.x = -0.1;
      const sideShardL = new THREE.Mesh(spireShardGeo, mtnSnowMat);
      sideShardL.position.set(-0.78, 1.45, 0.25);
      sideShardL.rotation.z = 0.28;
      const sideShardR = new THREE.Mesh(spireShardGeo, glacierSeracMat);
      sideShardR.position.set(0.78, 1.55, -0.2);
      sideShardR.rotation.z = -0.26;
      nodeGrp.add(mainSpire, sideShardL, sideShardR);
      perimeterNodes.push(new THREE.Vector3(px, 4.4, pz));
    } else {
      // Ancient Tibetan Royal Stone Stele (`吐蕃石碑`)
      const plinth = new THREE.Mesh(stelePlinthGeo, dressedStoneMat);
      plinth.position.y = 0.275;
      const steleBody = new THREE.Mesh(steleBodyGeo, stoneWallMat);
      steleBody.position.y = 2.35;
      const steleFrieze = new THREE.Mesh(steleFriezeGeo, redFriezeMat);
      steleFrieze.position.y = 4.18;
      const steleCap = new THREE.Mesh(steleCapGeo, goldRoofMat);
      steleCap.position.y = 4.65;
      steleCap.rotation.y = Math.PI / 4;
      const steleRune = new THREE.Mesh(steleRuneGeo, steleRuneMat);
      steleRune.position.y = 2.35;
      nodeGrp.add(plinth, steleBody, steleFrieze, steleCap, steleRune);
      perimeterNodes.push(new THREE.Vector3(px, 4.35, pz));
    }
    pastureGroup.add(nodeGrp);
  }

  // Prayer flag lines (`五彩風馬旗`) stretching between the perimeter steles and glacier spires
  const arenaFlagGeo = new THREE.PlaneGeometry(0.52, 0.36);
  for (let i = 0; i < perimeterNodes.length - 1; i++) {
    const pA = perimeterNodes[i];
    const pB = perimeterNodes[i + 1];
    for (let f = 1; f <= 5; f++) {
      const t = f / 6;
      const fx = THREE.MathUtils.lerp(pA.x, pB.x, t);
      const fz = THREE.MathUtils.lerp(pA.z, pB.z, t);
      const fy = THREE.MathUtils.lerp(pA.y, pB.y, t) - Math.sin(t * Math.PI) * 0.42;
      const flag = new THREE.Mesh(arenaFlagGeo, prayerFlagMats[(i + f) % 5]);
      flag.position.set(fx, fy, fz);
      flag.lookAt(0, fy, 0);
      pastureGroup.add(flag);
      bridgeFlagMeshes.push({ mesh: flag, baseZ: fz, phase: i * 0.9 + f * 0.5 });
    }
  }

  // Ice-rimmed glacial boulders framing the northern edge of the pasture
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 0.2 + (i / 5) * Math.PI * 0.6;
    const iceCrag = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8, 0), mtnSnowMat);
    iceCrag.position.set(Math.cos(a + Math.PI) * 24.4, 1.8, Math.sin(a + Math.PI) * 24.4);
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
      { x: origin.x, z: origin.z + 42, r: 12 }, // River Bridge & East/West approaches
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

    // 1. Scroll river UV & shimmer foam edges
    if (riverTex) {
      riverTex.offset.y -= dt * 0.35;
    }
    riverMat.emissiveIntensity = 0.34 + Math.sin(animTime * 2.8) * 0.1;
    foamEdgeMat.opacity = 0.34 + Math.sin(animTime * 3.4) * 0.1;

    // 2. Rotate village watermill wheel
    waterWheel.rotation.x += dt * 1.45;

    // 3. Gentle wind sway on barley field, weeping willows & riverside reeds InstancedMeshes + prayer flags
    barleyInstanced.rotation.z = Math.sin(animTime * 1.9) * 0.016;
    barleyInstanced.rotation.x = Math.cos(animTime * 1.4) * 0.008;
    reedInstanced.rotation.z = Math.cos(animTime * 2.1) * 0.015;
    willowFrondInstanced.rotation.z = Math.sin(animTime * 1.65) * 0.018;
    for (let i = 0; i < bridgeFlagMeshes.length; i++) {
      const bf = bridgeFlagMeshes[i];
      bf.mesh.rotation.z = Math.sin(animTime * 4.2 + bf.phase) * 0.14;
    }

    // 4. Drift cloud bands, crepuscular God Rays & base mist around Mount Yarlha Shampo + pulse glacier veins
    cloudRing1.rotation.z += dt * 0.12;
    cloudRing2.rotation.z -= dt * 0.16;
    glacierVeinMat.emissiveIntensity = 0.62 + Math.sin(animTime * 2.0) * 0.16;
    shampoBackHaloMat.opacity = 0.22 + Math.sin(animTime * 1.3) * 0.05;
    for (let i = 0; i < shampoGodRays.length; i++) {
      const gr = shampoGodRays[i];
      gr.mat.opacity = gr.baseOpacity + Math.sin(animTime * gr.speed + gr.phase) * 0.04;
    }
    for (let i = 0; i < shampoBaseMistLayers.length; i++) {
      const ml = shampoBaseMistLayers[i];
      ml.mesh.position.x = ml.baseX + Math.sin(animTime * ml.driftSpeed + ml.phase) * 3.8;
      ml.mat.opacity = ml.baseOpacity + Math.cos(animTime * (ml.driftSpeed * 1.4) + ml.phase) * 0.035;
    }
    arenaMandalaMat.opacity = 0.66 + Math.sin(animTime * 1.6) * 0.08;

    // 5. Gentle grazing nod for village calmed yaks
    for (let i = 0; i < villageYakHeads.length; i++) {
      villageYakHeads[i].rotation.x = 0.52 + Math.sin(animTime * 2.5 + i) * 0.08;
    }

    // 6. Pulse Sheldrak light beam, entrance sunlight shaft & casket scroll glow
    beamMatActive.opacity = 0.78 + Math.sin(animTime * 5.0) * 0.12;
    sunShaftMat.opacity = 0.14 + Math.sin(animTime * 2.2) * 0.035;
    if (casketScrollGlow.visible) {
      casketScrollGlow.rotation.y += dt * 2.2;
    }

    // 7. Gentle upward drift for Sheldrak Crystal Cave dust motes
    const dustArr = sheldrakDustGeo.attributes.position.array;
    for (let i = 0; i < sheldrakDustCount; i++) {
      const idx = i * 3;
      dustArr[idx + 1] += dt * (0.14 + (i % 3) * 0.04);
      dustArr[idx + 0] += Math.sin(animTime * 1.1 + i) * dt * 0.04;
      if (dustArr[idx + 1] > 5.4) {
        dustArr[idx + 1] = 0.45;
      }
    }
    sheldrakDustGeo.attributes.position.needsUpdate = true;
  }

  return {
    group,
    getHeight,
    update,
    sheldrak: sheldrakApi,
  };
}

export default createMap;
