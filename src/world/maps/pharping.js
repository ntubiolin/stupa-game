// ============================================================================
// Chapter 1 World Map — Pharping · Yangleshö (`src/world/maps/pharping.js`)
//
// Landmarks (relative to origin (2000, 0)):
//   - Entrance & Waypoint: (0, 80)   -> world (2000, 80)
//   - Pharping Village:    (-30, 55) -> world (1970, 55)
//   - Three Dry Springs:   (-55, 10), (40, 30), (10, -20)
//   - Escort Canyon Route: (-70, -40) -> (15, -45)
//   - Yangleshö Cave:      (20, -45) -> world (2020, -45) with 7 butter lamp niches
//   - Asura Cave Arena:    (-10, -80) -> world (1990, -80), r = 16m
//   - Rain Transformation: Triggered by `ch1.rain` flag (falling rain, green terrain,
//                          valley terrace crops/foliage, tree foliage canopies & blossoms,
//                          full springs/well, cooled boss arena runes, rain soundscape)
//
// Strictly 0 PointLights.
// ============================================================================
import * as THREE from 'three';
import { createTibetanSurfaces } from '../tibetanSurfaces.js';
import {
  createHeightfieldTerrain,
  scatterRocks,
  addRimMountains,
  seededRandom,
  buildGateArch,
  pushCollider,
} from '../mapBase.js';

const TWO_PI = Math.PI * 2;

let _pharpingGlowTex = null;
function getPharpingGlowTexture() {
  if (_pharpingGlowTex) return _pharpingGlowTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  if (c) {
    const grad = c.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.32, 'rgba(255, 232, 175, 0.68)');
    grad.addColorStop(0.68, 'rgba(255, 185, 95, 0.22)');
    grad.addColorStop(1.0, 'rgba(255, 160, 60, 0.0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  _pharpingGlowTex = tex;
  return tex;
}

let _kilayaMandalaTex = null;
function getKilayaMandalaTexture() {
  if (_kilayaMandalaTex) return _kilayaMandalaTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  if (c) {
    c.clearRect(0, 0, 256, 256);
    const cx = 128;
    const cy = 128;

    // Soft radial aura
    const bg = c.createRadialGradient(cx, cy, 8, cx, cy, 122);
    bg.addColorStop(0.0, 'rgba(251, 146, 60, 0.42)');
    bg.addColorStop(0.55, 'rgba(217, 119, 6, 0.22)');
    bg.addColorStop(0.88, 'rgba(180, 83, 9, 0.12)');
    bg.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    c.fillStyle = bg;
    c.fillRect(0, 0, 256, 256);

    // Outer & inner sacred geometric rings
    c.strokeStyle = 'rgba(253, 186, 116, 0.78)';
    c.lineWidth = 3;
    for (const r of [116, 98, 68, 36]) {
      c.beginPath();
      c.arc(cx, cy, r, 0, TWO_PI);
      c.stroke();
    }

    // 8 Lotus petals & Vajra spokes
    c.strokeStyle = 'rgba(251, 191, 36, 0.65)';
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TWO_PI;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 36, cy + Math.sin(a) * 36);
      c.lineTo(cx + Math.cos(a) * 114, cy + Math.sin(a) * 114);
      c.stroke();
    }

    // Sacred Vajra Kilaya (Phurba) triangular blade star
    c.strokeStyle = 'rgba(254, 215, 170, 0.88)';
    c.lineWidth = 3.2;
    for (let t = 0; t < 2; t++) {
      const rot = t * (Math.PI / 3) - Math.PI / 2;
      c.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = rot + (k * TWO_PI) / 3;
        const px = cx + Math.cos(a) * 86;
        const py = cy + Math.sin(a) * 86;
        if (k === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
      c.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  _kilayaMandalaTex = tex;
  return tex;
}

let _pharpingSunbeamTex = null;
function getPharpingSunbeamTexture() {
  if (_pharpingSunbeamTex) return _pharpingSunbeamTex;
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  const canvas = document.createElement('canvas');
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, 128, 256);
    for (let y = 0; y < 256; y++) {
      const v = y / 255;
      const vAlpha = Math.sin(v * Math.PI) * (1.0 - v * 0.32);
      const grad = g.createLinearGradient(0, y, 128, y);
      grad.addColorStop(0.0, 'rgba(255, 220, 145, 0.0)');
      grad.addColorStop(0.24, `rgba(255, 208, 125, ${(vAlpha * 0.44).toFixed(4)})`);
      grad.addColorStop(0.5, `rgba(255, 240, 192, ${(vAlpha * 0.90).toFixed(4)})`);
      grad.addColorStop(0.76, `rgba(255, 208, 125, ${(vAlpha * 0.44).toFixed(4)})`);
      grad.addColorStop(1.0, 'rgba(255, 220, 145, 0.0)');
      g.fillStyle = grad;
      g.fillRect(0, y, 128, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  _pharpingSunbeamTex = tex;
  return tex;
}

export function createMap(ctx) {
  const surfaces = createTibetanSurfaces(ctx);
  const mapDef = ctx.world?.getMap?.('pharping') || {
    id: 'pharping',
    origin: { x: 2000, z: 0 },
    walkRadius: 105,
    gates: [
      {
        id: 'south',
        x: 2000,
        z: 84,
        radius: 3.5,
        to: 'stupa',
        toGate: 'north',
        labelKey: 'prompt.returnStupa',
      },
    ],
  };
  const origin = mapDef.origin || { x: 2000, z: 0 };

  const group = ctx.zoneGroups?.pharping || new THREE.Group();
  group.name = 'PharpingMap';
  if (!ctx.zoneGroups?.pharping) {
    ctx.scene.add(group);
  }

  // ---------------------------------------------------------------- 1. Heightfield Terrain
  // Gently terraced valley sloping upward toward the northern cliffs (Yangleshö & Asura caves)
  // Flat plateaus at village (-30, 55), 3 springs, Yangleshö cave (20, -45), and Asura boss arena (-10, -80)
  const getHeight = (wx, wz) => {
    const lx = wx - origin.x;
    const lz = wz - origin.z;
    const r = Math.hypot(lx, lz);

    // Flatten key landmarks for clean footing
    const dGate = Math.hypot(lx - 0, lz - 80);
    if (dGate < 14) return 0;

    const dVillage = Math.hypot(lx - -30, lz - 55);
    if (dVillage < 15) return 0.2;

    const dS1 = Math.hypot(lx - -55, lz - 10);
    if (dS1 < 7) return 0.4;

    const dS2 = Math.hypot(lx - 40, lz - 30);
    if (dS2 < 7) return 0.35;

    const dS3 = Math.hypot(lx - 10, lz - -20);
    if (dS3 < 7) return 0.6;

    const dCave = Math.hypot(lx - 20, lz - -45);
    if (dCave < 11) return 1.2;

    const dArena = Math.hypot(lx - -10, lz - -80);
    if (dArena < 18) return 2.4;

    // Gentle north-rising slope + terraced valley undulations
    const northRise = Math.max(0, (40 - lz) * 0.02);
    const undulation = Math.sin(lx * 0.055) * Math.cos(lz * 0.055) * 0.55;
    let h = Math.max(0, northRise + undulation * 0.5);

    if (r > 96) {
      const rim = (r - 96) / 28;
      h += rim * rim * 11.0;
    }
    return h;
  };

  // Brighter Painterly SEASON x Firewatch Terrain Palettes (vivid at 17:16 dusk)
  // Drought: warm Firewatch golden-terracotta, sunlit amber-ochre & rose-slate cliffs
  const dryOchre = new THREE.Color(0xc87d44);
  const dryCrack = new THREE.Color(0xa65c2e);
  const dryMeadowGold = new THREE.Color(0xd69b4c);
  const dryPath = new THREE.Color(0xdcb07a);
  const drySlate = new THREE.Color(0x84685c);

  // Post-rain (`ch1.rain`): luminous SEASON emerald-ochre, sunlit sage meadow & warm flagstone path
  const wetGreen = new THREE.Color(0x5fa352);
  const wetMeadow = new THREE.Color(0x8ab858);
  const wetPath = new THREE.Color(0xa89874);
  const wetSlate = new THREE.Color(0x667a6c);
  const tmpCol = new THREE.Color();
  const tmpDry = new THREE.Color();
  const tmpWet = new THREE.Color();

  function computeDryWetColor(wx, wz, y, lx, lz, rainMix) {
    const noise = Math.sin(lx * 0.14) * Math.cos(lz * 0.14) * 0.5 + 0.5;
    const micro = Math.sin(lx * 0.31 - lz * 0.27) * 0.5 + 0.5;
    // Dry color: warm Firewatch golden-terracotta & amber-ochre
    if (y > 2.2) {
      tmpDry.lerpColors(dryOchre, drySlate, Math.min(1, (y - 2.2) / 4.2));
      if (micro > 0.58) tmpDry.lerp(dryMeadowGold, 0.24);
    } else if (Math.abs(lx + 15) < 6 && lz > -45 && lz < 78) {
      tmpDry.lerpColors(dryPath, dryMeadowGold, 0.32);
    } else if (Math.abs(lx - 15) < 5.5 && lz > -48 && lz < 20) {
      // Sunlit pilgrimage trail ascending to Yangleshö Cave
      tmpDry.lerpColors(dryPath, dryOchre, 0.30);
    } else {
      tmpDry.lerpColors(dryCrack, dryOchre, noise * 0.72 + micro * 0.28);
      if (noise > 0.52) {
        tmpDry.lerp(dryMeadowGold, (noise - 0.52) * 0.65);
      }
    }

    // Wet color: luminous SEASON emerald-ochre & sunlit meadow
    if (y > 2.2) {
      tmpWet.lerpColors(wetGreen, wetSlate, Math.min(1, (y - 2.2) / 4.2));
      if (micro > 0.55) tmpWet.lerp(wetMeadow, 0.28);
    } else if (Math.abs(lx + 15) < 6 && lz > -45 && lz < 78) {
      tmpWet.lerpColors(wetPath, wetMeadow, 0.38);
    } else if (Math.abs(lx - 15) < 5.5 && lz > -48 && lz < 20) {
      tmpWet.lerpColors(wetPath, wetGreen, 0.35);
    } else {
      tmpWet.lerpColors(wetGreen, wetMeadow, noise * 0.68 + micro * 0.32);
    }

    return tmpCol.lerpColors(tmpDry, tmpWet, rainMix);
  }

  const { mesh: terrainMesh } = createHeightfieldTerrain(ctx, {
    origin,
    size: 240,
    segments: 96,
    heightFn: getHeight,
    colorFn: (wx, wz, y, lx, lz) => computeDryWetColor(wx, wz, y, lx, lz, 0),
  });
  if (terrainMesh.material) {
    terrainMesh.material.emissive = new THREE.Color(0x28180c);
    terrainMesh.material.emissiveIntensity = 0.16;
  }
  // CRITICAL INVARIANT: terrainMesh MUST remain group.children[0]
  group.add(terrainMesh);

  const dryTerrainEmissive = new THREE.Color(0x28180c);
  const wetTerrainEmissive = new THREE.Color(0x162614);

  function updateTerrainColors(rainMix) {
    const posAttr = terrainMesh.geometry.attributes.position;
    const colAttr = terrainMesh.geometry.attributes.color;
    if (!posAttr || !colAttr) return;
    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i);
      const lz = posAttr.getZ(i);
      const y = posAttr.getY(i);
      const c = computeDryWetColor(lx + origin.x, lz + origin.z, y, lx, lz, rainMix);
      colAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colAttr.needsUpdate = true;
    if (terrainMesh.material?.emissive) {
      terrainMesh.material.emissive.lerpColors(dryTerrainEmissive, wetTerrainEmissive, rainMix);
    }
  }

  // Distant Himalayan foothill rim
  addRimMountains(ctx, group, {
    origin,
    innerR: 122,
    outerR: 185,
    count: 24,
    heightRange: [38, 76],
  });

  // ---------------------------------------------------------------- 2. South Entrance Gate & Prayer Flags (0, 84)
  const gateCfg = (mapDef.gates && mapDef.gates[0]) || { x: origin.x, z: origin.z + 84 };
  buildGateArch(ctx, group, {
    mapId: 'pharping',
    x: gateCfg.x,
    z: gateCfg.z,
    y: getHeight(gateCfg.x, gateCfg.z),
  });

  // ---------------------------------------------------------------- 2b. Stepped Agricultural Terrace Walls & Valley Foliage (InstancedMesh, 0 Colliders)
  const terraceWallGeo = new THREE.BoxGeometry(2.6, 0.52, 0.56);
  const terraceWallMat = new THREE.MeshStandardMaterial({
    color: 0x7a6855,
    roughness: 0.92,
  });
  surfaces.apply(terraceWallMat, 'masonry');
  const terraceArcs = [
    { cx: -28, cz: 32, r: 22, start: -0.65, end: 0.55, segs: 14 },
    { cx: -32, cz: 18, r: 28, start: -0.55, end: 0.62, segs: 16 },
    { cx: 28, cz: 46, r: 19, start: 2.1, end: 3.3, segs: 12 },
    { cx: 32, cz: 10, r: 24, start: 1.9, end: 3.2, segs: 14 },
    { cx: -18, cz: -8, r: 21, start: -0.4, end: 0.75, segs: 12 },
    { cx: 14, cz: -32, r: 24, start: 0.25, end: 1.35, segs: 12 },
  ];
  const totalTerraceStones = terraceArcs.reduce((acc, a) => acc + a.segs, 0);
  const terraceInst = new THREE.InstancedMesh(terraceWallGeo, terraceWallMat, totalTerraceStones);
  terraceInst.name = 'PharpingTerraceWalls';
  terraceInst.castShadow = true;
  terraceInst.receiveShadow = true;
  const dummyObj = new THREE.Object3D();
  const terraceColor = new THREE.Color();
  let tIdx = 0;
  for (const arc of terraceArcs) {
    for (let s = 0; s < arc.segs; s++) {
      const u = s / Math.max(1, arc.segs - 1);
      const ang = arc.start + u * (arc.end - arc.start);
      const wx = origin.x + arc.cx + Math.cos(ang) * arc.r;
      const wz = origin.z + arc.cz + Math.sin(ang) * arc.r;
      const wy = getHeight(wx, wz);
      dummyObj.position.set(wx, wy + 0.22, wz);
      dummyObj.rotation.set(0, -ang + Math.PI / 2, 0);
      dummyObj.scale.set(1.0 + (s % 3) * 0.08, 0.85 + (s % 2) * 0.24, 1.0);
      dummyObj.updateMatrix();
      terraceInst.setMatrixAt(tIdx, dummyObj.matrix);
      const shade = 0.86 + ((s * 17) % 7) * 0.035;
      terraceInst.setColorAt(tIdx, terraceColor.setRGB(shade, shade * 0.96, shade * 0.92));
      tIdx++;
    }
  }
  terraceInst.instanceMatrix.needsUpdate = true;
  if (terraceInst.instanceColor) terraceInst.instanceColor.needsUpdate = true;
  group.add(terraceInst);

  // Valley Grass / Barley Crop Clumps (reacts from drought parched brown -> emerald green on ch1.rain)
  const foliageCount = 240;
  const foliageGeo = new THREE.ConeGeometry(0.32, 0.58, 5);
  const dryFoliageCol = new THREE.Color(0x9a6b38);
  const wetFoliageCol = new THREE.Color(0x3f8f42);
  const foliageMat = new THREE.MeshStandardMaterial({
    color: dryFoliageCol.clone(),
    roughness: 0.84,
    emissive: 0x0d260e,
    emissiveIntensity: 0.0,
  });
  const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, foliageCount);
  foliageInst.name = 'PharpingValleyFoliage';
  const folRng = seededRandom(5109);
  let fPlaced = 0;
  let fAttempts = 0;
  while (fPlaced < foliageCount && fAttempts < foliageCount * 5) {
    fAttempts++;
    const lx = (folRng() - 0.5) * 168;
    const lz = -72 + folRng() * 148;
    // Keep clear of village center, cave interior, and boss arena center
    if (Math.hypot(lx + 30, lz - 55) < 11) continue;
    if (Math.hypot(lx - 20, lz + 45) < 9.5) continue;
    if (Math.hypot(lx + 10, lz + 80) < 15.5) continue;
    if (Math.hypot(lx, lz - 80) < 9) continue;
    const wx = origin.x + lx;
    const wz = origin.z + lz;
    const wy = getHeight(wx, wz);
    dummyObj.position.set(wx, wy + 0.22, wz);
    dummyObj.rotation.set((folRng() - 0.5) * 0.25, folRng() * TWO_PI, (folRng() - 0.5) * 0.25);
    const sc = 0.65 + folRng() * 0.85;
    dummyObj.scale.set(sc, sc * (0.75 + folRng() * 0.5), sc);
    dummyObj.updateMatrix();
    foliageInst.setMatrixAt(fPlaced, dummyObj.matrix);
    const tint = 0.85 + folRng() * 0.3;
    foliageInst.setColorAt(fPlaced, terraceColor.setRGB(tint, tint, tint));
    fPlaced++;
  }
  foliageInst.count = fPlaced;
  foliageInst.instanceMatrix.needsUpdate = true;
  if (foliageInst.instanceColor) foliageInst.instanceColor.needsUpdate = true;
  group.add(foliageInst);

  // ---------------------------------------------------------------- 3. Pharping Village (-30, 55) + Dry Stone Well
  const villageGroup = new THREE.Group();
  villageGroup.name = 'PharpingVillage';
  group.add(villageGroup);

  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x6e6256, roughness: 0.94 });
  surfaces.apply(plinthMat, 'masonry');
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xa86444, roughness: 0.88 });
  surfaces.apply(wallMat, 'plaster');
  const upperWallMat = new THREE.MeshStandardMaterial({ color: 0xede4d3, roughness: 0.85 });
  surfaces.apply(upperWallMat, 'plaster');
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5c3824, roughness: 0.82 });
  surfaces.apply(roofMat, 'roof');
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.88 });
  surfaces.apply(timberMat, 'timber');
  const brassFinialMat = new THREE.MeshStandardMaterial({
    color: 0xd4a238,
    roughness: 0.32,
    metalness: 0.72,
    emissive: 0x4a2c06,
    emissiveIntensity: 0.22,
  });
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.4,
    emissive: 0xd97706,
    emissiveIntensity: 0.38,
  });
  const clayJarMat = new THREE.MeshStandardMaterial({ color: 0x9c4a2d, roughness: 0.78 });
  const prayerFlagColors = [0x3b82f6, 0xf8fafc, 0xef4444, 0x22c55e, 0xeab308];
  const prayerFlagMats = prayerFlagColors.map(
    (col) =>
      new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
  );

  // Shared decorative geometries for village houses
  const winFrameGeo = new THREE.BoxGeometry(0.68, 0.74, 0.1);
  const winPaneGeo = new THREE.PlaneGeometry(0.46, 0.52);
  const rafterGeo = new THREE.BoxGeometry(0.1, 0.08, 0.42);
  const jarGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.44, 8);
  const flagPoleGeo = new THREE.CylinderGeometry(0.035, 0.05, 1.9, 6);
  const flagClothGeo = new THREE.PlaneGeometry(0.38, 0.48);

  // Cobbled stone village plaza floor inlay around (-30, 54)
  const plazaX = origin.x - 30;
  const plazaZ = origin.z + 54;
  const plazaY = getHeight(plazaX, plazaZ);
  const plazaDisc = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x857564, roughness: 0.94 }),
  );
  plazaDisc.rotation.x = -Math.PI / 2;
  plazaDisc.position.set(plazaX, plazaY + 0.015, plazaZ);
  plazaDisc.receiveShadow = true;
  villageGroup.add(plazaDisc);

  const plazaRingGeo = new THREE.RingGeometry(6.85, 7.35, 24);
  plazaRingGeo.rotateX(-Math.PI / 2);
  const plazaRing = new THREE.Mesh(plazaRingGeo, plinthMat);
  plazaRing.position.set(plazaX, plazaY + 0.022, plazaZ);
  villageGroup.add(plazaRing);

  const houseSpecs = [
    { lx: -40, lz: 62, w: 4.4, d: 3.6, h: 2.7, rot: 0.25 },
    { lx: -33, lz: 64, w: 4.0, d: 3.4, h: 2.5, rot: -0.15 },
    { lx: -22, lz: 61, w: 4.6, d: 3.8, h: 2.8, rot: -0.4 },
    { lx: -42, lz: 51, w: 4.2, d: 3.5, h: 2.6, rot: 0.5 },
    { lx: -19, lz: 50, w: 4.0, d: 3.4, h: 2.5, rot: -0.6 },
    { lx: -36, lz: 44, w: 4.5, d: 3.6, h: 2.7, rot: 0.18 },
    { lx: -25, lz: 44, w: 3.8, d: 3.2, h: 2.4, rot: -0.22 },
  ];

  for (const [hIdx, hs] of houseSpecs.entries()) {
    const hx = origin.x + hs.lx;
    const hz = origin.z + hs.lz;
    const hy = getHeight(hx, hz);
    const hGrp = new THREE.Group();
    hGrp.position.set(hx, hy, hz);
    hGrp.rotation.y = hs.rot;

    // 1. Stepped stone foundation plinth
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(hs.w + 0.36, 0.36, hs.d + 0.36),
      plinthMat,
    );
    plinth.position.y = 0.18;
    plinth.receiveShadow = true;
    hGrp.add(plinth);

    // 2. Lower warm terracotta brick wall + upper whitewashed Himalayan frieze band
    const lowerH = hs.h * 0.64;
    const upperH = hs.h * 0.36;
    const body = new THREE.Mesh(new THREE.BoxGeometry(hs.w, lowerH, hs.d), wallMat);
    body.position.y = 0.32 + lowerH * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    hGrp.add(body);

    const upperBody = new THREE.Mesh(
      new THREE.BoxGeometry(hs.w + 0.04, upperH, hs.d + 0.04),
      upperWallMat,
    );
    upperBody.position.y = 0.32 + lowerH + upperH * 0.5;
    upperBody.castShadow = true;
    upperBody.receiveShadow = true;
    hGrp.add(upperBody);

    // Timber belt band between stories
    const timberBelt = new THREE.Mesh(
      new THREE.BoxGeometry(hs.w + 0.14, 0.14, hs.d + 0.14),
      timberMat,
    );
    timberBelt.position.y = 0.32 + lowerH;
    hGrp.add(timberBelt);

    // 3. Overhanging two-tier Newar pitched roof with timber rafters & brass finial
    const lowerRoof = new THREE.Mesh(
      new THREE.BoxGeometry(hs.w + 0.72, 0.26, hs.d + 0.72),
      roofMat,
    );
    lowerRoof.position.y = hs.h + 0.38;
    lowerRoof.castShadow = true;
    hGrp.add(lowerRoof);

    const atticTier = new THREE.Mesh(
      new THREE.BoxGeometry(hs.w * 0.62, 0.52, hs.d * 0.62),
      upperWallMat,
    );
    atticTier.position.y = hs.h + 0.72;
    hGrp.add(atticTier);

    const upperRoof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(hs.w, hs.d) * 0.54, 0.72, 4),
      roofMat,
    );
    upperRoof.position.y = hs.h + 1.28;
    upperRoof.rotation.y = Math.PI / 4;
    upperRoof.scale.set(1.12, 1.0, (hs.d / hs.w) * 1.12);
    upperRoof.castShadow = true;
    hGrp.add(upperRoof);

    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 8), brassFinialMat);
    finial.position.y = hs.h + 1.76;
    hGrp.add(finial);

    // Front & back eaves rafters
    for (let r = -2; r <= 2; r++) {
      const rafterF = new THREE.Mesh(rafterGeo, timberMat);
      rafterF.position.set(r * (hs.w * 0.2), hs.h + 0.24, hs.d * 0.5 + 0.16);
      const rafterB = new THREE.Mesh(rafterGeo, timberMat);
      rafterB.position.set(r * (hs.w * 0.2), hs.h + 0.24, -hs.d * 0.5 - 0.16);
      hGrp.add(rafterF, rafterB);
    }

    // 4. Carved wooden front door + lintel + stone doorstep
    const doorStep = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 0.45), plinthMat);
    doorStep.position.set(0, 0.11, hs.d * 0.5 + 0.22);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.58, 0.14), timberMat);
    door.position.set(0, 0.32 + 0.79, hs.d * 0.5 + 0.04);
    const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.18, 0.22), timberMat);
    doorLintel.position.set(0, 0.32 + 1.62, hs.d * 0.5 + 0.06);
    hGrp.add(doorStep, door, doorLintel);

    // 5. Carved Newar wooden lattice windows (पेँझ्याः) with warm interior glow
    for (const side of [-1, 1]) {
      const wxOff = side * (hs.w * 0.29);
      const wyOff = 0.32 + hs.h * 0.62;
      const wzOff = hs.d * 0.5 + 0.03;
      const winFrame = new THREE.Mesh(winFrameGeo, timberMat);
      winFrame.position.set(wxOff, wyOff, wzOff);
      const winPane = new THREE.Mesh(winPaneGeo, windowGlowMat);
      winPane.position.set(wxOff, wyOff, wzOff + 0.06);
      hGrp.add(winFrame, winPane);
    }

    // 6. Rooftop prayer flag pole + clay water jar prop outside
    const pole = new THREE.Mesh(flagPoleGeo, timberMat);
    pole.position.set(hs.w * 0.46, hs.h + 1.15, hs.d * 0.42);
    const flagCloth = new THREE.Mesh(
      flagClothGeo,
      prayerFlagMats[hIdx % prayerFlagMats.length],
    );
    flagCloth.position.set(hs.w * 0.46 + 0.2, hs.h + 1.65, hs.d * 0.42);
    const clayJar = new THREE.Mesh(jarGeo, clayJarMat);
    clayJar.position.set(-hs.w * 0.38, 0.54, hs.d * 0.5 + 0.26);
    hGrp.add(pole, flagCloth, clayJar);

    villageGroup.add(hGrp);
    // Keep exact existing collider
    pushCollider(ctx, 'pharping', {
      type: 'circle',
      x: hx,
      z: hz,
      r: Math.max(hs.w, hs.d) * 0.52,
    });
  }

  // Village stone well + carved wooden canopy pavilion at (-30, 53)
  const wellX = origin.x - 30;
  const wellZ = origin.z + 53;
  const wellY = getHeight(wellX, wellZ);
  const wellGroup = new THREE.Group();
  wellGroup.position.set(wellX, wellY, wellZ);

  const wellBaseStep = new THREE.Mesh(
    new THREE.CylinderGeometry(1.72, 1.88, 0.22, 16),
    plinthMat,
  );
  wellBaseStep.position.y = 0.11;
  wellGroup.add(wellBaseStep);

  const wellRim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.48, 0.85, 12, 1, true),
    wallMat,
  );
  wellRim.position.y = 0.42;
  wellGroup.add(wellRim);

  // Carved wooden well canopy pillars, crossbeam, pulley wheel, and pitched pavilion roof
  const wellPillarGeo = new THREE.CylinderGeometry(0.09, 0.11, 2.35, 8);
  for (const [px, pz] of [
    [-1.15, -1.15],
    [1.15, -1.15],
    [-1.15, 1.15],
    [1.15, 1.15],
  ]) {
    const post = new THREE.Mesh(wellPillarGeo, timberMat);
    post.position.set(px, 1.25, pz);
    post.castShadow = true;
    wellGroup.add(post);
  }
  const wellCrossbeam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.18), timberMat);
  wellCrossbeam.position.set(0, 2.25, 0);
  const pulleyWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12),
    brassFinialMat,
  );
  pulleyWheel.rotation.x = Math.PI / 2;
  pulleyWheel.position.set(0, 2.02, 0);
  const wellCanopyRoof = new THREE.Mesh(new THREE.ConeGeometry(2.15, 0.85, 4), roofMat);
  wellCanopyRoof.position.set(0, 2.78, 0);
  wellCanopyRoof.rotation.y = Math.PI / 4;
  wellCanopyRoof.castShadow = true;
  const wellFinial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.36, 8), brassFinialMat);
  wellFinial.position.set(0, 3.32, 0);
  wellGroup.add(wellCrossbeam, pulleyWheel, wellCanopyRoof, wellFinial);

  const wellWaterMat = new THREE.MeshStandardMaterial({
    color: 0x2ec4b6,
    roughness: 0.18,
    metalness: 0.35,
    emissive: 0x0f766e,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.88,
  });
  const wellWaterMesh = new THREE.Mesh(new THREE.CircleGeometry(1.25, 16), wellWaterMat);
  wellWaterMesh.rotation.x = -Math.PI / 2;
  wellWaterMesh.position.y = 0.08;
  wellWaterMesh.visible = false;
  wellGroup.add(wellWaterMesh);
  villageGroup.add(wellGroup);
  pushCollider(ctx, 'pharping', { type: 'circle', x: wellX, z: wellZ, r: 1.4 });

  // ---------------------------------------------------------------- 4. Three Sacred Naga Springs (三處龍王泉眼)
  const springSpecs = [
    { id: 'spring1', lx: -55, lz: 10, tag: 'spring1' },
    { id: 'spring2', lx: 40, lz: 30, tag: 'spring2' },
    { id: 'spring3', lx: 10, lz: -20, tag: 'spring3' },
  ];
  const springs = [];
  const springStoneMat = new THREE.MeshStandardMaterial({ color: 0x7a6c5d, roughness: 0.88 });
  surfaces.apply(springStoneMat, 'masonry');
  const mossySlabMat = new THREE.MeshStandardMaterial({ color: 0x5d6e54, roughness: 0.86 });
  surfaces.apply(mossySlabMat, 'rock');
  const nagaCarvingMat = new THREE.MeshStandardMaterial({
    color: 0x8c7d6b,
    roughness: 0.78,
    metalness: 0.12,
  });
  const nagaJewelMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.25,
    metalness: 0.5,
    emissive: 0x0284c7,
    emissiveIntensity: 0.55,
  });
  const springWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.3,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.86,
  });

  const boulderGeo = new THREE.DodecahedronGeometry(0.45, 0);
  const rimSlabGeo = new THREE.BoxGeometry(0.95, 0.26, 0.52);
  const steleBodyGeo = new THREE.BoxGeometry(1.15, 1.65, 0.38);
  const steleHoodGeo = new THREE.ConeGeometry(0.82, 0.75, 5);
  const spoutGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.55, 8);
  const lotusPedestalGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.22, 8);

  for (const sp of springSpecs) {
    const sx = origin.x + sp.lx;
    const sz = origin.z + sp.lz;
    const sy = getHeight(sx, sz);
    const sGrp = new THREE.Group();
    sGrp.position.set(sx, sy, sz);

    // Stone-lined basin ring of 10 boulders + alternating mossy stepped stone slabs
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TWO_PI;
      const stone = new THREE.Mesh(boulderGeo, springStoneMat);
      stone.position.set(Math.cos(a) * 2.1, 0.24, Math.sin(a) * 2.1);
      stone.scale.set(1.1, 0.65, 1.1);
      sGrp.add(stone);

      const slab = new THREE.Mesh(rimSlabGeo, i % 2 === 0 ? mossySlabMat : springStoneMat);
      slab.position.set(Math.cos(a + 0.31) * 2.42, 0.13, Math.sin(a + 0.31) * 2.42);
      slab.rotation.y = -a - 0.31 + Math.PI / 2;
      sGrp.add(slab);
    }

    // Ancient carved Naga Spirit Stele & Makara water spout on the north rim (z = -2.25)
    const steleBody = new THREE.Mesh(steleBodyGeo, nagaCarvingMat);
    steleBody.position.set(0, 0.82, -2.25);
    steleBody.castShadow = true;
    const steleHood = new THREE.Mesh(steleHoodGeo, nagaCarvingMat);
    steleHood.position.set(0, 1.92, -2.22);
    steleHood.scale.set(1.15, 1.0, 0.55);
    const nagaJewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), nagaJewelMat);
    nagaJewel.position.set(0, 1.38, -2.02);
    const makaraSpout = new THREE.Mesh(spoutGeo, nagaCarvingMat);
    makaraSpout.rotation.x = Math.PI / 2.2;
    makaraSpout.position.set(0, 0.52, -1.92);
    const lotusCenter = new THREE.Mesh(lotusPedestalGeo, nagaCarvingMat);
    lotusCenter.position.set(0, 0.1, 0);
    sGrp.add(steleBody, steleHood, nagaJewel, makaraSpout, lotusCenter);

    // Dry mud bed
    const mudBed = new THREE.Mesh(
      new THREE.CircleGeometry(2.0, 18),
      new THREE.MeshStandardMaterial({ color: 0x4a321e, roughness: 0.95 }),
    );
    mudBed.rotation.x = -Math.PI / 2;
    mudBed.position.y = 0.03;
    sGrp.add(mudBed);

    // Water surface disc (hidden when dry, trickle when inspected, full when ch1.rain)
    const waterDisc = new THREE.Mesh(new THREE.CircleGeometry(1.95, 20), springWaterMat);
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.y = 0.12;
    waterDisc.scale.setScalar(0.01);
    waterDisc.visible = false;
    sGrp.add(waterDisc);

    group.add(sGrp);

    const springState = {
      id: sp.id,
      tag: sp.tag,
      x: sx,
      y: sy,
      z: sz,
      posVec: new THREE.Vector3(sx, sy, sz),
      inspected: false,
      waterDisc,
    };
    springs.push(springState);

    ctx.interactables.push({
      id: `pharping-${sp.id}`,
      kind: 'springBasin',
      zone: 'pharping',
      action: 'interact',
      labelKey: 'prompt.springBasin',
      radius: 3.4,
      getPosition: () => springState.posVec,
      isAvailable: () =>
        (ctx.state.zone || 'stupa') === 'pharping' &&
        !ctx.state.uiOpen &&
        !springState.inspected &&
        !ctx.quests?.hasFlag?.('ch1.rain'),
      onInteract: () => {
        if (springState.inspected) return;
        // Check if any active droughtSprite is still guarding within 14m
        const activeEnemies = ctx.enemies?.getActiveEnemies?.() || [];
        const guard = activeEnemies.find(
          (e) =>
            e.hp > 0 &&
            e.kind === 'droughtSprite' &&
            (e.tag === sp.tag || Math.hypot(e.group.position.x - sx, e.group.position.z - sz) < 14),
        );
        if (guard) {
          const msg =
            ctx.i18n?.t?.('toast.spring.guarded') ||
            '泉眼仍被旱魅盤踞，請先度化周圍的旱魅！';
          ctx.hud?.toast?.(msg);
          return;
        }

        springState.inspected = true;
        springState.waterDisc.visible = true;
        springState.waterDisc.scale.setScalar(0.52);
        ctx.bus.emit('sfx', { name: 'bowl' });
        const msg =
          ctx.i18n?.t?.('toast.spring.seep') ||
          '甘泉微湧——旱魅退散後，泉眼滲出清涼細流！';
        ctx.hud?.toast?.(msg);
        ctx.bus.emit('quest:interact', { target: sp.id, uniqueId: sp.id, count: 1 });
      },
    });
  }

  // ---------------------------------------------------------------- 5. Procedural Dead/Lush Trees (Sprout Foliage & Blossoms on `ch1.rain`)
  const treeCanopies = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d3624, roughness: 0.92 });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x3b7a3e,
    roughness: 0.78,
    emissive: 0x143316,
    emissiveIntensity: 0.2,
  });
  const canopyHighlightMat = new THREE.MeshStandardMaterial({
    color: 0x529e49,
    roughness: 0.74,
    emissive: 0x1a3d1c,
    emissiveIntensity: 0.22,
  });
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.6,
    emissive: 0xbe185d,
    emissiveIntensity: 0.28,
  });

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.34, 2.8, 7);
  const rootGeo = new THREE.CylinderGeometry(0.06, 0.16, 0.75, 5);
  const branchGeo1 = new THREE.CylinderGeometry(0.08, 0.14, 1.4, 6);
  const branchGeo2 = new THREE.CylinderGeometry(0.07, 0.13, 1.3, 6);
  const canopyMainGeo = new THREE.DodecahedronGeometry(1.35, 1);
  const canopySubGeo = new THREE.DodecahedronGeometry(0.95, 1);
  const blossomGeo = new THREE.DodecahedronGeometry(0.28, 0);

  const treeCoords = [
    { lx: -48, lz: 28 },
    { lx: -62, lz: -5 },
    { lx: -24, lz: 15 },
    { lx: 18, lz: 52 },
    { lx: 52, lz: 42 },
    { lx: 56, lz: 14 },
    { lx: 34, lz: -8 },
    { lx: -16, lz: -18 },
    { lx: -54, lz: -52 },
    { lx: 48, lz: -38 },
    { lx: -32, lz: -64 },
    { lx: 28, lz: -72 },
  ];

  for (const [tIdx, tc] of treeCoords.entries()) {
    const tx = origin.x + tc.lx;
    const tz = origin.z + tc.lz;
    const ty = getHeight(tx, tz);
    const tGrp = new THREE.Group();
    tGrp.position.set(tx, ty, tz);
    tGrp.rotation.y = tIdx * 0.85;

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.4;
    trunk.castShadow = true;
    tGrp.add(trunk);

    // Gnarled root buttresses
    for (let r = 0; r < 3; r++) {
      const ra = (r / 3) * TWO_PI + 0.3;
      const root = new THREE.Mesh(rootGeo, trunkMat);
      root.position.set(Math.cos(ra) * 0.25, 0.3, Math.sin(ra) * 0.25);
      root.rotation.z = -Math.cos(ra) * 0.55;
      root.rotation.x = Math.sin(ra) * 0.55;
      tGrp.add(root);
    }

    const b1 = new THREE.Mesh(branchGeo1, trunkMat);
    b1.position.set(0.35, 2.35, 0);
    b1.rotation.z = -0.65;
    const b2 = new THREE.Mesh(branchGeo2, trunkMat);
    b2.position.set(-0.32, 2.2, 0.15);
    b2.rotation.z = 0.58;
    const b3 = new THREE.Mesh(branchGeo2, trunkMat);
    b3.position.set(0.05, 2.25, -0.34);
    b3.rotation.x = -0.6;
    tGrp.add(b1, b2, b3);

    // Lush green foliage canopy + Himalayan rhododendron blossoms (blooms when ch1.rain is true)
    const canopy = new THREE.Group();
    canopy.position.y = 2.85;
    canopy.visible = false;
    const cMain = new THREE.Mesh(canopyMainGeo, canopyMat);
    cMain.scale.set(1.15, 0.85, 1.15);
    const cLeft = new THREE.Mesh(canopySubGeo, canopyHighlightMat);
    cLeft.position.set(-0.75, -0.25, 0.2);
    const cRight = new THREE.Mesh(canopySubGeo, canopyMat);
    cRight.position.set(0.75, -0.2, -0.15);
    const cTop = new THREE.Mesh(canopySubGeo, canopyHighlightMat);
    cTop.position.set(0.0, 0.55, 0.1);
    cTop.scale.set(0.85, 0.72, 0.85);
    const bl1 = new THREE.Mesh(blossomGeo, blossomMat);
    bl1.position.set(0.58, 0.42, 0.62);
    const bl2 = new THREE.Mesh(blossomGeo, blossomMat);
    bl2.position.set(-0.64, 0.28, -0.48);
    canopy.add(cMain, cLeft, cRight, cTop, bl1, bl2);
    tGrp.add(canopy);
    treeCanopies.push(canopy);

    group.add(tGrp);
    pushCollider(ctx, 'pharping', { type: 'circle', x: tx, z: tz, r: 0.55 });
  }

  // ---------------------------------------------------------------- 6. Yangleshö Cave (揚列雪洞) at (20, -45) & 7 Butter Lamp Niches
  const caveX = origin.x + 20;
  const caveZ = origin.z - 45;
  const caveY = getHeight(caveX, caveZ);
  const caveGroup = new THREE.Group();
  caveGroup.name = 'YangleshoCave';
  caveGroup.position.set(caveX, caveY, caveZ);
  group.add(caveGroup);

  const glowTex = getPharpingGlowTexture();
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x4b3f36,
    roughness: 0.92,
    metalness: 0.06,
  });
  surfaces.apply(cliffMat, 'rock');
  const innerVaultMat = new THREE.MeshStandardMaterial({
    color: 0x1e1814,
    roughness: 0.96,
    metalness: 0.04,
    emissive: 0x140d07,
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
  });
  surfaces.apply(innerVaultMat, 'rock');
  const caveFloorMat = new THREE.MeshStandardMaterial({
    color: 0x261f1a,
    roughness: 0.9,
    metalness: 0.08,
  });
  surfaces.apply(caveFloorMat, 'paving');

  // 6a. Dark stone cavern floor & sacred mandala altar ring
  const caveFloor = new THREE.Mesh(new THREE.CircleGeometry(7.6, 28), caveFloorMat);
  caveFloor.rotation.x = -Math.PI / 2;
  caveFloor.position.set(0, 0.02, -1.6);
  caveFloor.receiveShadow = true;
  caveGroup.add(caveFloor);

  const altarRingGeo = new THREE.RingGeometry(1.42, 1.68, 28);
  altarRingGeo.rotateX(-Math.PI / 2);
  const altarRing = new THREE.Mesh(
    altarRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  altarRing.position.set(0, 0.035, -1.2);
  caveGroup.add(altarRing);

  // 6b. Seamless inner dark rock vault dome (open to the south entrance so zero sky leaks overhead or behind)
  const innerDomeGeo = new THREE.SphereGeometry(
    7.4,
    24,
    16,
    Math.PI * 0.92,
    Math.PI * 1.16,
    0,
    Math.PI * 0.62,
  );
  const innerDome = new THREE.Mesh(innerDomeGeo, innerVaultMat);
  innerDome.position.set(0, 0.2, -1.5);
  innerDome.scale.set(1.12, 0.96, 1.15);
  caveGroup.add(innerDome);

  // Overhead solid rock ceiling liner covering the entire cave interior
  const ceilingCap = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 8.2, 1.8, 18), innerVaultMat);
  ceilingCap.position.set(0, 6.8, -1.8);
  ceilingCap.scale.set(1.12, 1.0, 1.12);
  caveGroup.add(ceilingCap);

  // 6c. Continuous 9-segment horseshoe cliff walls around north, west, and east perimeter (r = 8.4)
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const ang = -0.06 * Math.PI + t * 1.12 * Math.PI; // East-Southeast -> North -> West-Southwest
    const r = 8.3;
    const wx = Math.cos(ang) * r;
    const wz = -1.4 - Math.sin(ang) * r;
    const wallCrag = new THREE.Mesh(new THREE.DodecahedronGeometry(3.4, 1), cliffMat);
    wallCrag.position.set(wx, 3.4 + (i % 2) * 0.45, wz);
    wallCrag.scale.set(1.28, 1.48, 1.22);
    wallCrag.rotation.set(i * 0.35, ang, i * 0.2);
    wallCrag.castShadow = true;
    wallCrag.receiveShadow = true;
    caveGroup.add(wallCrag);
  }

  // Southern entrance archway pillars & sculpted cliff brow lintel
  const leftArchPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), cliffMat);
  leftArchPillar.position.set(-6.4, 3.2, 2.1);
  leftArchPillar.scale.set(1.05, 1.45, 1.15);
  const rightArchPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), cliffMat);
  rightArchPillar.position.set(6.4, 3.2, 2.1);
  rightArchPillar.scale.set(1.05, 1.45, 1.15);
  const entranceBrow = new THREE.Mesh(new THREE.DodecahedronGeometry(5.6, 1), cliffMat);
  entranceBrow.position.set(0, 6.9, 1.8);
  entranceBrow.scale.set(1.55, 0.45, 0.72);
  caveGroup.add(leftArchPillar, rightArchPillar, entranceBrow);

  // Multi-layered vaulted cave roof & upper Himalayan cliff peak
  const roofMain = new THREE.Mesh(new THREE.DodecahedronGeometry(7.2, 1), cliffMat);
  roofMain.position.set(0, 7.8, -2.4);
  roofMain.scale.set(1.48, 0.48, 1.38);
  const roofRear = new THREE.Mesh(new THREE.DodecahedronGeometry(6.8, 1), cliffMat);
  roofRear.position.set(0, 8.6, -6.2);
  roofRear.scale.set(1.42, 0.68, 1.15);
  const upperPeak = new THREE.Mesh(new THREE.DodecahedronGeometry(6.2, 1), cliffMat);
  upperPeak.position.set(-0.6, 11.8, -5.2);
  upperPeak.scale.set(1.35, 0.95, 1.1);
  caveGroup.add(roofMain, roofRear, upperPeak);

  // 6d. Hanging limestone stalactites along ceiling & cave brow
  const stalactiteGeo = new THREE.ConeGeometry(0.32, 1.55, 6);
  for (let i = 0; i < 14; i++) {
    const isBrow = i < 5;
    const ang = isBrow
      ? -0.28 * Math.PI + (i / 4) * 0.56 * Math.PI
      : (i / 9) * Math.PI * 1.65;
    const sr = isBrow ? 5.6 : 2.2 + (i % 3) * 1.65;
    const sx = isBrow ? Math.sin(ang) * sr : Math.cos(ang) * sr;
    const sz = isBrow ? 1.6 - Math.cos(ang) * 0.6 : -1.8 - Math.abs(Math.sin(ang)) * sr;
    const stal = new THREE.Mesh(stalactiteGeo, cliffMat);
    stal.position.set(sx, isBrow ? 5.55 : 5.85, sz);
    stal.rotation.x = Math.PI;
    stal.scale.set(0.75 + (i % 3) * 0.25, 0.8 + (i % 4) * 0.28, 0.75 + (i % 3) * 0.25);
    caveGroup.add(stal);
  }

  // Meditation seat stone inside Yangleshö Cave
  const seatMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.35, 0.38, 10),
    new THREE.MeshStandardMaterial({ color: 0x8c7b65, roughness: 0.8 }),
  );
  seatMesh.position.set(0, 0.19, -1.2);
  caveGroup.add(seatMesh);

  // 6e. Cave Interior Lighting — Altar Glow, Slanted Entrance Shaft & Dynamic Sanctuary Radiance (0 PointLights)
  const poolGeo = new THREE.PlaneGeometry(1, 1);
  poolGeo.rotateX(-Math.PI / 2);

  const altarGlowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xffb84d,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const altarGlowPool = new THREE.Mesh(poolGeo, altarGlowMat);
  altarGlowPool.position.set(0, 0.04, -1.2);
  altarGlowPool.scale.set(4.8, 1, 4.8);
  caveGroup.add(altarGlowPool);

  const sanctuaryGlowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xffaa33,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sanctuaryGlowPool = new THREE.Mesh(poolGeo, sanctuaryGlowMat);
  sanctuaryGlowPool.position.set(0, 0.035, -2.2);
  sanctuaryGlowPool.scale.set(11.5, 1, 11.5);
  caveGroup.add(sanctuaryGlowPool);

  // Overhead warm bounce light on the cave vault ceiling
  const vaultBounceMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xff9d2e,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const vaultBounceDisc = new THREE.Mesh(poolGeo, vaultBounceMat);
  vaultBounceDisc.position.set(0, 5.75, -2.0);
  vaultBounceDisc.scale.set(10.0, 1, 10.0);
  caveGroup.add(vaultBounceDisc);

  // Slanted crepuscular light shaft entering from the southern cave mouth
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0xffe4a0,
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const entranceShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 2.75, 6.8, 16, 1, true),
    shaftMat,
  );
  entranceShaft.position.set(0, 3.1, 1.35);
  entranceShaft.rotation.x = -0.34;
  caveGroup.add(entranceShaft);

  // Warm golden butter-lamp rock-wall bounce plates inside Yangleshö Cave (0 PointLights)
  const wallBounceGeo = new THREE.PlaneGeometry(1, 1);
  const caveWallBounceMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xffa938,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  for (const [bx, by, bz, ry, sx, sy] of [
    [-4.8, 2.2, -1.2, Math.PI * 0.42, 6.2, 4.4],
    [4.8, 2.2, -1.2, -Math.PI * 0.42, 6.2, 4.4],
    [0.0, 2.5, -5.2, 0.0, 7.4, 4.8],
    [-3.4, 1.8, 2.1, Math.PI * 0.22, 4.5, 3.4],
    [3.4, 1.8, 2.1, -Math.PI * 0.22, 4.5, 3.4],
  ]) {
    const wb = new THREE.Mesh(wallBounceGeo, caveWallBounceMat);
    wb.position.set(bx, by, bz);
    wb.rotation.y = ry;
    wb.scale.set(sx, sy, 1);
    caveGroup.add(wb);
  }

  // Real-World White Silk Khatag (哈達) Offering Scarves & Tibetan Retreat Facade Materials
  const khatagMat = new THREE.MeshStandardMaterial({
    color: 0xfaf8f2,
    roughness: 0.55,
    metalness: 0.04,
    emissive: 0x3a3224,
    emissiveIntensity: 0.46,
    side: THREE.DoubleSide,
  });
  surfaces.apply(khatagMat, 'cloth');
  const retreatWhitewashMat = new THREE.MeshStandardMaterial({
    color: 0xf2eadc,
    roughness: 0.88,
    emissive: 0x261d14,
    emissiveIntensity: 0.16,
  });
  surfaces.apply(retreatWhitewashMat, 'plaster');
  const retreatMaroonMat = new THREE.MeshStandardMaterial({
    color: 0x7c1f1a,
    roughness: 0.74,
    emissive: 0x240907,
    emissiveIntensity: 0.18,
  });
  surfaces.apply(retreatMaroonMat, 'plaster');
  const fantsangBlackMat = new THREE.MeshStandardMaterial({
    color: 0x221b18,
    roughness: 0.86,
  });
  surfaces.apply(fantsangBlackMat, 'timber');

  const khatagBandGeo = new THREE.BoxGeometry(0.95, 0.11, 0.05);
  const khatagTailGeo = new THREE.PlaneGeometry(0.24, 1.18);

  function createKhatagGarland(spanWidth = 5.4, sag = 0.45, tailCount = 5) {
    const kGrp = new THREE.Group();
    const segs = 10;
    for (let s = 0; s < segs; s++) {
      const u = (s + 0.5) / segs;
      const x = (u - 0.5) * spanWidth;
      const y = -4 * u * (1 - u) * sag;
      const slope = -4 * (1 - 2 * u) * (sag / spanWidth);
      const sw = new THREE.Mesh(khatagBandGeo, khatagMat);
      sw.position.set(x, y, Math.sin(u * Math.PI) * 0.12);
      sw.scale.set((spanWidth / segs) * 1.12, 1, 1);
      sw.rotation.z = Math.atan(slope);
      kGrp.add(sw);
    }
    for (let t = 0; t < tailCount; t++) {
      const u = tailCount === 1 ? 0.5 : t / (tailCount - 1);
      const x = (u - 0.5) * (spanWidth * 0.86);
      const y = -4 * u * (1 - u) * sag;
      const tail = new THREE.Mesh(khatagTailGeo, khatagMat);
      tail.position.set(x, y - 0.56, 0.08 + Math.sin(u * Math.PI) * 0.08);
      tail.rotation.set(0.08, (t % 2 === 0 ? 1 : -1) * 0.12, (u - 0.5) * 0.14);
      kGrp.add(tail);
    }
    return kGrp;
  }

  const retreatWallGeo = new THREE.BoxGeometry(3.4, 3.2, 1.35);
  const retreatPenmaGeo = new THREE.BoxGeometry(3.52, 0.46, 1.44);
  const retreatCorniceGeo = new THREE.BoxGeometry(3.68, 0.14, 1.56);
  const fantsangBorderGeo = new THREE.BoxGeometry(1.12, 1.18, 0.08);
  const mirrorBossGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10);
  mirrorBossGeo.rotateX(Math.PI / 2);

  function createCliffRetreatFacade(name) {
    const rGrp = new THREE.Group();
    rGrp.name = name;

    const wall = new THREE.Mesh(retreatWallGeo, retreatWhitewashMat);
    wall.position.y = 1.6;
    wall.castShadow = true;
    wall.receiveShadow = true;

    const penma = new THREE.Mesh(retreatPenmaGeo, retreatMaroonMat);
    penma.position.y = 3.38;

    const cornice = new THREE.Mesh(retreatCorniceGeo, brassFinialMat);
    cornice.position.y = 3.68;

    // Traditional black trapezoid-style Tibetan window border (fantsang) + carved wooden frame & warm glow
    const fantsang = new THREE.Mesh(fantsangBorderGeo, fantsangBlackMat);
    fantsang.position.set(0, 1.92, 0.66);
    const wFrame = new THREE.Mesh(winFrameGeo, timberMat);
    wFrame.position.set(0, 1.92, 0.70);
    const wPane = new THREE.Mesh(winPaneGeo, windowGlowMat);
    wPane.position.set(0, 1.92, 0.76);

    rGrp.add(wall, penma, cornice, fantsang, wFrame, wPane);

    for (const bx of [-1.05, 0, 1.05]) {
      const boss = new THREE.Mesh(mirrorBossGeo, brassFinialMat);
      boss.position.set(bx, 3.38, 0.73);
      rGrp.add(boss);
    }

    // Draped white silk Khatag above the retreat window lintel
    const winKhatag = createKhatagGarland(1.45, 0.18, 2);
    winKhatag.position.set(0, 2.58, 0.75);
    rGrp.add(winKhatag);

    return rGrp;
  }

  // Draped white silk Khatags across Yangleshö Cave brow, archway shrines & meditation seat
  const yangleshoBrowKhatag = createKhatagGarland(6.8, 0.58, 7);
  yangleshoBrowKhatag.name = 'YangleshoBrowKhatag';
  yangleshoBrowKhatag.position.set(0, 5.15, 2.15);
  caveGroup.add(yangleshoBrowKhatag);

  const yangleshoSeatKhatag = createKhatagGarland(1.9, 0.22, 3);
  yangleshoSeatKhatag.position.set(0, 0.42, -0.52);
  caveGroup.add(yangleshoSeatKhatag);

  // Traditional maroon-and-whitewashed Tibetan retreat house facades flanking Yangleshö Cave approach (0 colliders)
  const yangleshoRetreatWest = createCliffRetreatFacade('YangleshoRetreatFacadeWest');
  yangleshoRetreatWest.position.set(-7.8, 0.0, 2.8);
  yangleshoRetreatWest.rotation.y = 0.36;
  const yangleshoRetreatEast = createCliffRetreatFacade('YangleshoRetreatFacadeEast');
  yangleshoRetreatEast.position.set(7.8, 0.0, 2.5);
  yangleshoRetreatEast.rotation.y = -0.36;
  caveGroup.add(yangleshoRetreatWest, yangleshoRetreatEast);

  // Floating golden cave dust motes inside Yangleshö Cave
  const caveDustCount = 46;
  const caveDustGeo = new THREE.BufferGeometry();
  const caveDustPos = new Float32Array(caveDustCount * 3);
  for (let i = 0; i < caveDustCount; i++) {
    const a = (i / caveDustCount) * TWO_PI * 2.7;
    const r = 0.8 + ((i * 17) % 10) * 0.48;
    caveDustPos[i * 3 + 0] = Math.cos(a) * r;
    caveDustPos[i * 3 + 1] = 0.45 + ((i * 13) % 11) * 0.42;
    caveDustPos[i * 3 + 2] = -1.6 + Math.sin(a) * r * 0.85;
  }
  caveDustGeo.setAttribute('position', new THREE.BufferAttribute(caveDustPos, 3));
  const caveDustMat = new THREE.PointsMaterial({
    color: 0xffd584,
    size: 0.14,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const caveDustPoints = new THREE.Points(caveDustGeo, caveDustMat);
  caveDustPoints.name = 'YangleshoCaveDust';
  caveGroup.add(caveDustPoints);

  // 7 Butter Lamp Niches arranged in a sacred semicircle around Yangleshö Cave
  const lampNiches = [];
  const lampBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd4a238,
    roughness: 0.32,
    metalness: 0.76,
    emissive: 0x5c3808,
    emissiveIntensity: 0.35,
  });
  const lampFlameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.65, 0.55),
    toneMapped: false,
  });
  const lampHaloMat = new THREE.MeshBasicMaterial({
    color: 0xff9e2c,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const triggeredLampWaves = new Set();

  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * 0.18 + (i / 6) * Math.PI * 0.64; // semicircle facing south/west
    const r = 4.6;
    const lx = caveX + Math.cos(angle - Math.PI) * r;
    const lz = caveZ + Math.sin(angle - Math.PI) * r;
    const ly = getHeight(lx, lz);

    const nGrp = new THREE.Group();
    nGrp.position.set(lx, ly, lz);

    // Carved stone shrine niche backing behind each butter lamp
    const nicheBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 1.32, 0.28),
      cliffMat,
    );
    const outAngle = angle - Math.PI;
    nicheBack.position.set(Math.cos(outAngle) * 0.38, 0.66, Math.sin(outAngle) * 0.38);
    nicheBack.rotation.y = -outAngle + Math.PI / 2;

    // White silk Khatag scarf draped over the top of each rock shrine niche
    const nicheKhatag = new THREE.Mesh(khatagBandGeo, khatagMat);
    nicheKhatag.position.set(Math.cos(outAngle) * 0.36, 1.33, Math.sin(outAngle) * 0.36);
    nicheKhatag.rotation.y = -outAngle + Math.PI / 2;
    nicheKhatag.scale.set(0.84, 1.1, 6.2);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.36, 0.68, 8),
      springStoneMat,
    );
    pedestal.position.y = 0.34;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.13, 0.17, 10), lampBrassMat);
    bowl.position.y = 0.76;

    const flameGrp = new THREE.Group();
    flameGrp.position.y = 0.94;
    flameGrp.visible = false;
    const flameCone = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.28, 8), lampFlameMat);
    const haloSphere = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), lampHaloMat);
    flameGrp.add(flameCone, haloSphere);

    // Radial floor light pool under each butter lamp (brightens when lit)
    const lampPoolMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xffaa33,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const lampPool = new THREE.Mesh(poolGeo, lampPoolMat);
    lampPool.position.y = 0.03;
    lampPool.scale.set(3.2, 1, 3.2);

    nGrp.add(nicheBack, nicheKhatag, pedestal, bowl, flameGrp, lampPool);
    group.add(nGrp);

    const lampObj = {
      index: i,
      id: `yangleshoLamp_${i + 1}`,
      x: lx,
      y: ly,
      z: lz,
      posVec: new THREE.Vector3(lx, ly, lz),
      lit: false,
      flameGrp,
      lampPool,
      lampPoolMat,
    };
    lampNiches.push(lampObj);

    ctx.interactables.push({
      id: `pharping-lamp-${i + 1}`,
      kind: 'yangleshoLamp',
      zone: 'pharping',
      action: 'interact',
      labelKey: 'prompt.lightCaveLamp',
      radius: 2.8,
      getPosition: () => lampObj.posVec,
      isAvailable: () =>
        (ctx.state.zone || 'stupa') === 'pharping' &&
        !ctx.state.uiOpen &&
        !lampObj.lit,
      onInteract: () => {
        lampObj.lit = true;
        lampObj.flameGrp.visible = true;
        lampObj.lampPoolMat.opacity = 0.62;
        ctx.bus.emit('sfx', { name: 'lamp' });
        ctx.bus.emit('quest:interact', { target: 'yangleshoLamp', count: 1 });

        const litCount = lampNiches.filter((l) => l.lit).length;
        const msg =
          ctx.i18n?.t?.('toast.lamp.lit', { cur: litCount, max: 7 }) ||
          `已點亮揚列雪酥油燈（${litCount}/7）`;
        ctx.hud?.toast?.(msg);

        // Spawn obstacle wave at 2, 4, and 6 lamps lit
        if ((litCount === 2 || litCount === 4 || litCount === 6) && !triggeredLampWaves.has(litCount)) {
          triggeredLampWaves.add(litCount);
          const waveMsg =
            ctx.i18n?.t?.('toast.lamp.wave') ||
            '洞外熱風驟起——旱魅與沙塵精正撲向酥油燈！';
          ctx.hud?.toast?.(waveMsg);
          const kinds = litCount === 6 ? ['droughtSprite', 'dustDevil', 'droughtSprite'] : ['droughtSprite', 'dustDevil'];
          kinds.forEach((k, idx) => {
            const sx = caveX - 10 + idx * 3.5;
            const sz = caveZ + 9 + idx * 1.5;
            const eid = ctx.enemies?.spawn?.(k, {
              position: { x: sx, y: getHeight(sx, sz), z: sz },
              level: 6,
            });
            if (eid) {
              const list = ctx.enemies?.getActiveEnemies?.() || [];
              const inst = list.find((e) => e.id === eid);
              if (inst) {
                inst.isLampAttacker = true;
                inst.targetLampIndex = lampObj.index;
                inst.state = 'chase';
              }
            }
          });
        }

        // All 7 lamps lit -> manifest Guru Vision
        if (litCount >= 7 && !ctx.quests?.hasFlag?.('ch1.lamps.lit')) {
          ctx.quests?.setFlag?.('ch1.lamps.lit', true);
          const allMsg =
            ctx.i18n?.t?.('toast.lamps.allLit') ||
            '七盞酥油燈齊明，蓮師金色淨相於揚列雪洞中顯現！';
          ctx.hud?.toast?.(allMsg);
        }
      },
    });
  }

  // ---------------------------------------------------------------- 7. Asura Cave & Boss Arena (-10, -80)
  const arenaX = origin.x - 10;
  const arenaZ = origin.z - 80;
  const arenaY = getHeight(arenaX, arenaZ);
  const asuraGroup = new THREE.Group();
  asuraGroup.name = 'AsuraCaveArena';
  asuraGroup.position.set(arenaX, arenaY, arenaZ);
  group.add(asuraGroup);

  const charredMat = new THREE.MeshStandardMaterial({
    color: 0x2b201b,
    roughness: 0.9,
    emissive: 0x3b1206,
    emissiveIntensity: 0.25,
  });
  const asuraVeinMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.0, 0.65, 0.15),
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  // Outer ritual boundary ring
  const arenaRingGeo = new THREE.RingGeometry(15.2, 16.0, 48);
  arenaRingGeo.rotateX(-Math.PI / 2);
  const arenaRingMat = new THREE.MeshBasicMaterial({
    color: 0xd97706,
    transparent: true,
    opacity: 0.44,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const arenaRing = new THREE.Mesh(arenaRingGeo, arenaRingMat);
  arenaRing.position.y = 0.04;
  asuraGroup.add(arenaRing);

  // Sacred Vajra Kilaya (普巴金剛) mandala floor decal at center of Boss Arena
  const kilayaTex = getKilayaMandalaTexture();
  const arenaMandalaMat = new THREE.MeshBasicMaterial({
    map: kilayaTex,
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.56,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const arenaMandalaDisc = new THREE.Mesh(poolGeo, arenaMandalaMat);
  arenaMandalaDisc.position.set(0, 0.032, 0);
  arenaMandalaDisc.scale.set(22.0, 1, 22.0);
  asuraGroup.add(arenaMandalaDisc);

  // 8 Jagged Volcanic/Sandstone Monolith Pillars encircling the Boss Arena perimeter (r = 16.5m, 0 colliders)
  const monolithBodyGeo = new THREE.CylinderGeometry(0.62, 1.05, 4.6, 6);
  const monolithCapGeo = new THREE.ConeGeometry(0.75, 1.5, 6);
  const monolithRuneGeo = new THREE.BoxGeometry(0.18, 2.5, 0.18);
  for (let m = 0; m < 8; m++) {
    const ma = (m / 8) * TWO_PI + Math.PI / 8;
    // Leave south entrance approach clear
    if (Math.sin(ma) > 0.82) continue;
    const mr = 16.5;
    const mx = Math.cos(ma) * mr;
    const mz = Math.sin(ma) * mr;
    const mGrp = new THREE.Group();
    mGrp.position.set(mx, 0, mz);
    mGrp.rotation.y = -ma + Math.PI / 2;

    const mBody = new THREE.Mesh(monolithBodyGeo, charredMat);
    mBody.position.y = 2.2;
    mBody.rotation.z = (m % 2 === 0 ? 1 : -1) * 0.08;
    mBody.castShadow = true;
    const mCap = new THREE.Mesh(monolithCapGeo, charredMat);
    mCap.position.y = 5.1;
    const mRune = new THREE.Mesh(monolithRuneGeo, asuraVeinMat);
    mRune.position.set(0, 2.3, 0.72);
    mGrp.add(mBody, mCap, mRune);
    asuraGroup.add(mGrp);
  }

  // Deep Asura Volcanic Cavern Grotto on the north rim of the arena
  const asuraInnerDome = new THREE.Mesh(
    new THREE.SphereGeometry(9.2, 18, 12, Math.PI * 0.95, Math.PI * 1.1, 0, Math.PI * 0.58),
    innerVaultMat,
  );
  asuraInnerDome.position.set(0, 0.2, -16.2);
  asuraInnerDome.scale.set(1.25, 0.95, 0.95);
  asuraGroup.add(asuraInnerDome);

  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.16 + (i / 6) * Math.PI * 0.68;
    const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(3.8, 1), charredMat);
    crag.position.set(
      Math.cos(a + Math.PI) * 17.2,
      3.2 + Math.sin(a) * 2.6,
      Math.sin(a + Math.PI) * 17.2,
    );
    crag.scale.set(1.35, 1.55, 1.15);
    asuraGroup.add(crag);
  }
  const asuraRoofVault = new THREE.Mesh(new THREE.DodecahedronGeometry(7.8, 1), charredMat);
  asuraRoofVault.position.set(0, 8.2, -16.8);
  asuraRoofVault.scale.set(1.65, 0.52, 1.15);
  const asuraUpperPeak = new THREE.Mesh(new THREE.DodecahedronGeometry(6.8, 1), charredMat);
  asuraUpperPeak.position.set(0, 12.2, -19.5);
  asuraUpperPeak.scale.set(1.45, 0.95, 1.05);
  asuraGroup.add(asuraRoofVault, asuraUpperPeak);

  // Glowing crimson-amber fissure veins & floor glow pool at Asura Cave mouth
  for (let i = -2; i <= 2; i++) {
    const vein = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), asuraVeinMat);
    vein.position.set(i * 3.1, 1.8 + (Math.abs(i) % 2) * 1.1, -15.6 - Math.abs(i) * 0.4);
    vein.scale.set(0.6, 2.8, 0.6);
    vein.rotation.z = i * 0.22;
    asuraGroup.add(vein);
  }
  const asuraMouthPoolMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xea580c,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const asuraMouthPool = new THREE.Mesh(poolGeo, asuraMouthPoolMat);
  asuraMouthPool.position.set(0, 0.05, -13.5);
  asuraMouthPool.scale.set(11.0, 1, 8.5);
  asuraGroup.add(asuraMouthPool);

  // Real-World Asura Cave Entrance Details: Draped White Silk Khatags, Handprint Rock Shrine, Butter-Lamp Bounce Plates & Retreat Facades
  const asuraBrowKhatag = createKhatagGarland(8.6, 0.68, 9);
  asuraBrowKhatag.name = 'AsuraBrowKhatag';
  asuraBrowKhatag.position.set(0, 5.65, -13.4);
  asuraGroup.add(asuraBrowKhatag);

  const asuraShrineLeftKhatag = createKhatagGarland(3.2, 0.34, 4);
  asuraShrineLeftKhatag.position.set(-5.6, 2.75, -13.6);
  asuraShrineLeftKhatag.rotation.y = 0.28;
  const asuraShrineRightKhatag = createKhatagGarland(3.2, 0.34, 4);
  asuraShrineRightKhatag.position.set(5.6, 2.75, -13.6);
  asuraShrineRightKhatag.rotation.y = -0.28;
  asuraGroup.add(asuraShrineLeftKhatag, asuraShrineRightKhatag);

  for (const [bx, by, bz, ry, sx, sy] of [
    [-5.8, 2.2, -13.5, 0.32, 6.4, 4.6],
    [5.8, 2.2, -13.5, -0.32, 6.4, 4.6],
    [0.0, 3.0, -15.2, 0.0, 9.2, 5.4],
  ]) {
    const awb = new THREE.Mesh(wallBounceGeo, caveWallBounceMat);
    awb.position.set(bx, by, bz);
    awb.rotation.y = ry;
    awb.scale.set(sx, sy, 1);
    asuraGroup.add(awb);
  }

  const asuraRetreatWest = createCliffRetreatFacade('AsuraRetreatFacadeWest');
  asuraRetreatWest.position.set(-11.4, 0.2, -12.2);
  asuraRetreatWest.rotation.y = 0.42;
  const asuraRetreatEast = createCliffRetreatFacade('AsuraRetreatFacadeEast');
  asuraRetreatEast.position.set(11.4, 0.2, -12.2);
  asuraRetreatEast.rotation.y = -0.42;
  asuraGroup.add(asuraRetreatWest, asuraRetreatEast);

  // Escort Canyon Craggy Rock Arches along the western ambush canyon route (0 colliders)
  const canyonArchGeo = new THREE.DodecahedronGeometry(2.4, 1);
  const canyonArchSpecs = [
    { lx: -56, lz: -41, span: 5.8, h: 4.8, rot: 0.12 },
    { lx: -34, lz: -42.5, span: 6.2, h: 5.2, rot: -0.08 },
    { lx: -10, lz: -44, span: 5.6, h: 4.6, rot: 0.05 },
  ];
  for (const ca of canyonArchSpecs) {
    const ax = origin.x + ca.lx;
    const az = origin.z + ca.lz;
    const ay = getHeight(ax, az);
    const archGrp = new THREE.Group();
    archGrp.position.set(ax, ay, az);
    archGrp.rotation.y = ca.rot;

    const pNorth = new THREE.Mesh(canyonArchGeo, cliffMat);
    pNorth.position.set(0, ca.h * 0.48, -ca.span);
    pNorth.scale.set(0.95, 1.35, 0.95);
    const pSouth = new THREE.Mesh(canyonArchGeo, cliffMat);
    pSouth.position.set(0, ca.h * 0.48, ca.span);
    pSouth.scale.set(0.95, 1.35, 0.95);
    const lintel = new THREE.Mesh(canyonArchGeo, cliffMat);
    lintel.position.set(0, ca.h + 0.8, 0);
    lintel.scale.set(0.75, 0.42, 2.65);
    archGrp.add(pNorth, pSouth, lintel);
    group.add(archGrp);
  }

  // ---------------------------------------------------------------- 7b. Pilgrimage Stone Staircase & Real-World Overhead Lungta Prayer Flag Canopy Webs
  // Stepped stone staircase ascending toward Yangleshö Cave (20, -45) and up the northern ridge to Asura Cave (-10, -80) (0 colliders)
  const stepSlabGeo = new THREE.BoxGeometry(2.8, 0.14, 0.92);
  const stepSlabMat = new THREE.MeshStandardMaterial({
    color: 0x9c8872,
    roughness: 0.90,
    emissive: 0x241910,
    emissiveIntensity: 0.12,
  });
  surfaces.apply(stepSlabMat, 'paving');
  const stairWaypoints = [];
  // Segment A: Valley trail (14, 12) -> Yangleshö Cave forecourt (20, -35)
  for (let s = 0; s < 24; s++) {
    const u = s / 23;
    const lx = THREE.MathUtils.lerp(13.5, 19.8, u) + Math.sin(u * Math.PI * 2) * 1.1;
    const lz = THREE.MathUtils.lerp(10.0, -34.5, u);
    stairWaypoints.push({ lx, lz, ry: -0.14 + Math.cos(u * Math.PI * 2) * 0.08 });
  }
  // Segment B: Yangleshö cliff side (12, -48) -> Asura Cave southern approach (-10, -63)
  for (let s = 0; s < 18; s++) {
    const u = s / 17;
    const lx = THREE.MathUtils.lerp(11.5, -9.8, u) + Math.sin(u * Math.PI) * 1.4;
    const lz = THREE.MathUtils.lerp(-48.5, -62.5, u);
    stairWaypoints.push({ lx, lz, ry: 0.65 });
  }
  const stairInst = new THREE.InstancedMesh(stepSlabGeo, stepSlabMat, stairWaypoints.length);
  stairInst.name = 'PharpingPilgrimageStairs';
  stairInst.receiveShadow = true;
  for (let i = 0; i < stairWaypoints.length; i++) {
    const sw = stairWaypoints[i];
    const wx = origin.x + sw.lx;
    const wz = origin.z + sw.lz;
    const wy = getHeight(wx, wz);
    dummyObj.position.set(wx, wy + 0.04, wz);
    dummyObj.rotation.set(0, sw.ry, 0);
    dummyObj.scale.set(1.0 + (i % 3) * 0.08, 1.0, 1.0);
    dummyObj.updateMatrix();
    stairInst.setMatrixAt(i, dummyObj.matrix);
    const shade = 0.88 + ((i * 13) % 7) * 0.03;
    stairInst.setColorAt(i, terraceColor.setRGB(shade * 1.04, shade * 0.98, shade * 0.90));
  }
  stairInst.instanceMatrix.needsUpdate = true;
  if (stairInst.instanceColor) stairInst.instanceColor.needsUpdate = true;
  group.add(stairInst);

  // Multi-strand overhead 5-color Lungta prayer flag canopy webs strung high between pine trees & cliff faces
  const canopyFlagLines = [
    // Over the lower pilgrimage staircase toward Yangleshö Cave
    { start: [8, 5.2, -4], end: [24, 5.8, -14], sag: 1.15, flags: 18 },
    { start: [24, 5.8, -14], end: [10, 6.2, -24], sag: 1.25, flags: 18 },
    { start: [10, 6.2, -24], end: [27, 6.8, -33], sag: 1.30, flags: 18 },
    { start: [12, 6.6, -34], end: [28, 7.6, -42], sag: 1.35, flags: 18 },
    // crisscrossing high above Yangleshö Cave entrance & retreat houses (20, -45)
    { start: [11, 7.4, -41], end: [29, 7.8, -42], sag: 1.40, flags: 20 },
    { start: [12, 8.5, -44], end: [28, 8.8, -45], sag: 1.55, flags: 20 },
    { start: [14, 9.8, -47], end: [26, 9.6, -39], sag: 1.35, flags: 18 },
    { start: [26, 9.6, -47], end: [13, 8.9, -38], sag: 1.35, flags: 18 },
    // Spanning the upper cliff trail from Yangleshö Cave (20, -45) to Asura Cave (-10, -80)
    { start: [14, 7.8, -48], end: [1, 8.2, -56], sag: 1.40, flags: 18 },
    { start: [1, 8.2, -56], end: [-16, 8.6, -63], sag: 1.45, flags: 18 },
    { start: [6, 8.4, -52], end: [-12, 8.8, -61], sag: 1.35, flags: 18 },
    // High canopy web across Asura Cave cliff mouth & monoliths (-10, -80)
    { start: [-24, 8.8, -74], end: [4, 9.2, -74], sag: 1.85, flags: 22 },
    { start: [-22, 10.2, -82], end: [2, 10.4, -82], sag: 1.75, flags: 22 },
    { start: [-21, 11.4, -90], end: [1, 11.4, -76], sag: 1.65, flags: 20 },
    { start: [1, 11.4, -90], end: [-21, 11.2, -76], sag: 1.65, flags: 20 },
  ];

  const lungtaRopePositions = [];
  const lungtaFlagTransforms = [];
  for (let lIdx = 0; lIdx < canopyFlagLines.length; lIdx++) {
    const line = canopyFlagLines[lIdx];
    const [sx, syOff, sz] = line.start;
    const [ex, eyOff, ez] = line.end;
    const startVec = new THREE.Vector3(
      origin.x + sx,
      getHeight(origin.x + sx, origin.z + sz) + syOff,
      origin.z + sz,
    );
    const endVec = new THREE.Vector3(
      origin.x + ex,
      getHeight(origin.x + ex, origin.z + ez) + eyOff,
      origin.z + ez,
    );
    const yaw = Math.atan2(endVec.x - startVec.x, endVec.z - startVec.z);
    const segs = line.flags + 2;
    let prevPt = startVec.clone();
    for (let s = 1; s <= segs; s++) {
      const u = s / segs;
      const pt = new THREE.Vector3().lerpVectors(startVec, endVec, u);
      pt.y -= 4 * u * (1 - u) * line.sag;
      lungtaRopePositions.push(prevPt.x, prevPt.y, prevPt.z, pt.x, pt.y, pt.z);
      prevPt = pt;
      if (s >= 1 && s <= line.flags) {
        lungtaFlagTransforms.push({
          x: pt.x,
          y: pt.y - 0.16,
          z: pt.z,
          yaw: yaw + Math.PI * 0.5,
          tilt: 0.18 + ((lIdx + s) % 3) * 0.08,
          colorIdx: (lIdx * 2 + s) % 5,
        });
      }
    }
  }

  const lungtaRopeGeo = new THREE.BufferGeometry();
  lungtaRopeGeo.setAttribute('position', new THREE.Float32BufferAttribute(lungtaRopePositions, 3));
  const lungtaRopeMat = new THREE.LineBasicMaterial({ color: 0x5c4738, transparent: true, opacity: 0.78 });
  const lungtaRopeLines = new THREE.LineSegments(lungtaRopeGeo, lungtaRopeMat);
  lungtaRopeLines.name = 'PharpingPrayerFlagRopes';
  group.add(lungtaRopeLines);

  const lungtaQuadGeo = new THREE.PlaneGeometry(0.38, 0.30);
  const lungtaInstMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.76,
    emissive: 0x2a1d12,
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide,
  });
  surfaces.apply(lungtaInstMat, 'cloth');
  const lungtaInst = new THREE.InstancedMesh(lungtaQuadGeo, lungtaInstMat, lungtaFlagTransforms.length);
  lungtaInst.name = 'PharpingPrayerFlagCanopy';
  const lungtaPalette = [
    new THREE.Color(0x2563eb), // Tibetan blue (sky/space)
    new THREE.Color(0xf8fafc), // Tibetan white (air/wind)
    new THREE.Color(0xdc2626), // Tibetan red (fire)
    new THREE.Color(0x16a34a), // Tibetan green (water)
    new THREE.Color(0xfacc15), // Tibetan yellow (earth)
  ];
  for (let i = 0; i < lungtaFlagTransforms.length; i++) {
    const fl = lungtaFlagTransforms[i];
    dummyObj.position.set(fl.x, fl.y, fl.z);
    dummyObj.rotation.set(fl.tilt, fl.yaw, 0);
    dummyObj.scale.set(1, 1, 1);
    dummyObj.updateMatrix();
    lungtaInst.setMatrixAt(i, dummyObj.matrix);
    lungtaInst.setColorAt(i, lungtaPalette[fl.colorIdx]);
  }
  lungtaInst.instanceMatrix.needsUpdate = true;
  if (lungtaInst.instanceColor) lungtaInst.instanceColor.needsUpdate = true;
  group.add(lungtaInst);

  // ---------------------------------------------------------------- 7c. Dramatic Firewatch Forest Canopy Sunbeams (10 God Rays) & Valley Terrace Mist
  const sunbeamsGroup = new THREE.Group();
  sunbeamsGroup.name = 'PharpingCanopySunbeams';
  const sunbeamTex = getPharpingSunbeamTexture();
  const sunbeamPlaneGeo = new THREE.PlaneGeometry(1, 1);
  const pharpingSunbeams = [];
  const pharpingSunbeamSpecs = [
    // 1. Yangleshö Cave sacred entrance & Khatag brow shaft
    { lx: 18.2, lz: -41.5, y: 11.5, w: 9.2, h: 25.0, rotY: 0.26, rotZ: -0.44, opacity: 0.18, color: 0xffd27d },
    // 2. Upper Pilgrimage Stone Staircase shaft (below Yangleshö)
    { lx: 16.5, lz: -24.0, y: 10.8, w: 8.4, h: 23.5, rotY: -0.18, rotZ: -0.42, opacity: 0.16, color: 0xffc86b },
    // 3. Lower Pilgrimage Stone Staircase shaft
    { lx: 13.0, lz: -6.0, y: 10.4, w: 8.0, h: 22.5, rotY: 0.22, rotZ: -0.41, opacity: 0.15, color: 0xffc668 },
    // 4. Mountain Trail between Yangleshö and Asura Cave
    { lx: 2.0, lz: -55.0, y: 11.8, w: 8.6, h: 24.5, rotY: 0.32, rotZ: -0.45, opacity: 0.15, color: 0xffd480 },
    // 5. Asura Cave upper shrine & Khatag gateway shaft
    { lx: -11.5, lz: -74.0, y: 13.0, w: 9.8, h: 26.5, rotY: 0.18, rotZ: -0.46, opacity: 0.17, color: 0xffc466 },
    // 6. Pharping Village Cobbled Plaza & Stone Well shaft
    { lx: -31.5, lz: 53.5, y: 10.5, w: 9.4, h: 23.0, rotY: 0.24, rotZ: -0.40, opacity: 0.16, color: 0xffce74 },
    // 7. Sacred Naga Spring 1 (-55, 10) forest canopy shaft
    { lx: -56.0, lz: 10.0, y: 10.2, w: 7.6, h: 22.0, rotY: 0.30, rotZ: -0.42, opacity: 0.15, color: 0xffd07a },
    // 8. Sacred Naga Spring 2 (40, 30) forest canopy shaft
    { lx: 38.5, lz: 30.0, y: 10.2, w: 7.8, h: 22.0, rotY: -0.24, rotZ: -0.42, opacity: 0.15, color: 0xffd07a },
    // 9. Sacred Naga Spring 3 (10, -20) forest canopy shaft
    { lx: 8.5, lz: -20.0, y: 10.4, w: 7.6, h: 22.5, rotY: 0.15, rotZ: -0.43, opacity: 0.15, color: 0xffd482 },
    // 10. South Return Gate & Agricultural Terraces golden-hour shaft
    { lx: -1.5, lz: 72.0, y: 10.0, w: 8.8, h: 22.0, rotY: 0.12, rotZ: -0.39, opacity: 0.14, color: 0xffc668 },
  ];

  for (let i = 0; i < pharpingSunbeamSpecs.length; i++) {
    const sb = pharpingSunbeamSpecs[i];
    const sbMat = new THREE.MeshBasicMaterial({
      ...(sunbeamTex ? { map: sunbeamTex } : {}),
      color: sb.color,
      transparent: true,
      opacity: sb.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const sbMesh = new THREE.Mesh(sunbeamPlaneGeo, sbMat);
    sbMesh.position.set(origin.x + sb.lx, sb.y, origin.z + sb.lz);
    sbMesh.rotation.set(0.10, sb.rotY, sb.rotZ);
    sbMesh.scale.set(sb.w, sb.h, 1);
    sunbeamsGroup.add(sbMesh);
    pharpingSunbeams.push({ mat: sbMat, baseOpacity: sb.opacity, phase: i * 1.13 });
  }
  group.add(sunbeamsGroup);

  // Layered soft valley mist planes hovering over the lower Kathmandu valley terraces & hillside cliffs
  const valleyMistGroup = new THREE.Group();
  valleyMistGroup.name = 'PharpingValleyMist';
  const terraceMistLowerGeo = new THREE.RingGeometry(24, 96, 48);
  terraceMistLowerGeo.rotateX(-Math.PI / 2);
  const terraceMistLowerMat = new THREE.MeshBasicMaterial({
    color: 0xd9b09a,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const terraceMistLower = new THREE.Mesh(terraceMistLowerGeo, terraceMistLowerMat);
  terraceMistLower.position.set(origin.x, 0.85, origin.z + 24);
  valleyMistGroup.add(terraceMistLower);

  const cliffMistUpperGeo = new THREE.RingGeometry(18, 78, 48);
  cliffMistUpperGeo.rotateX(-Math.PI / 2);
  const cliffMistUpperMat = new THREE.MeshBasicMaterial({
    color: 0xc4a4be,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const cliffMistUpper = new THREE.Mesh(cliffMistUpperGeo, cliffMistUpperMat);
  cliffMistUpper.position.set(origin.x + 4, 2.35, origin.z - 52);
  valleyMistGroup.add(cliffMistUpper);

  const outerRimMistGeo = new THREE.RingGeometry(88, 138, 56);
  outerRimMistGeo.rotateX(-Math.PI / 2);
  const outerRimMistMat = new THREE.MeshBasicMaterial({
    color: 0xd4a89e,
    transparent: true,
    opacity: 0.21,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const outerRimMist = new THREE.Mesh(outerRimMistGeo, outerRimMistMat);
  outerRimMist.position.set(origin.x, 3.1, origin.z);
  valleyMistGroup.add(outerRimMist);
  group.add(valleyMistGroup);

  // ---------------------------------------------------------------- 8. Scatter Valley Rocks
  const rng = seededRandom(3201);
  scatterRocks(ctx, group, {
    mapId: 'pharping',
    origin,
    count: 26,
    rng,
    area: { minR: 16, maxR: 88 },
    minRadius: 1.0,
    maxRadius: 2.3,
    minSpacing: 9,
    avoid: [
      { x: origin.x, z: origin.z + 80, r: 15 }, // Entrance & Waypoint
      { x: origin.x - 30, z: origin.z + 55, r: 18 }, // Pharping Village
      { x: origin.x - 55, z: origin.z + 10, r: 9 }, // Spring 1
      { x: origin.x + 40, z: origin.z + 30, r: 9 }, // Spring 2
      { x: origin.x + 10, z: origin.z - 20, r: 9 }, // Spring 3
      { x: origin.x + 20, z: origin.z - 45, r: 12 }, // Yangleshö Cave
      { x: origin.x - 10, z: origin.z - 80, r: 19 }, // Asura Cave Arena
      { x: origin.x - 70, z: origin.z - 40, r: 8 }, // Messenger start
    ],
    getHeight,
    color: 0x735b46,
  });

  // ---------------------------------------------------------------- 9. Western Canyon Escort Route (`messenger` C1-3)
  const escortWaypoints = [
    { x: origin.x - 48, z: origin.z - 41, ambush: true, ambushId: 1 },
    { x: origin.x - 24, z: origin.z - 43, ambush: true, ambushId: 2 },
    { x: origin.x - 2, z: origin.z - 44, ambush: true, ambushId: 3 },
    { x: origin.x + 15, z: origin.z - 45, ambush: false, final: true },
  ];
  const escortState = {
    active: false,
    arrived: false,
    wpIndex: 0,
    hp: 120,
    maxHp: 120,
    restingTimer: 0,
    triggeredAmbushes: new Set(),
    damageCooldown: 0,
  };

  ctx.bus.on('escort:start', () => {
    if (escortState.arrived || ctx.quests?.hasFlag?.('ch1.escort.arrived')) return;
    escortState.active = true;
    escortState.hp = escortState.maxHp;
    escortState.restingTimer = 0;
    const msg =
      ctx.i18n?.t?.('toast.escort.start') ||
      '護送那爛陀信使前往揚列雪洞——小心峽谷中的旱魅伏擊！';
    ctx.hud?.toast?.(msg);
  });

  function updateEscort(dt) {
    if (!escortState.active || escortState.arrived) return;
    const msgNpc = ctx.npcs?.getById?.('messenger');
    if (!msgNpc) return;

    escortState.damageCooldown = Math.max(0, escortState.damageCooldown - dt);

    // If resting after reaching 0 HP, count down 5s recovery
    if (escortState.restingTimer > 0) {
      escortState.restingTimer -= dt;
      msgNpc.idle = 'rest';
      if (escortState.restingTimer <= 0) {
        escortState.hp = escortState.maxHp;
        msgNpc.idle = 'walk';
        const recMsg =
          ctx.i18n?.t?.('toast.escort.recovered') || '信使調息完畢，繼續前行！';
        ctx.hud?.toast?.(recMsg);
      }
      return;
    }

    // Check nearby enemy attacks on messenger
    const activeEnemies = ctx.enemies?.getActiveEnemies?.() || [];
    if (escortState.damageCooldown <= 0) {
      for (const e of activeEnemies) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(e.group.position.x - msgNpc.x, e.group.position.z - msgNpc.z);
        if (d <= 2.4) {
          escortState.damageCooldown = 1.0;
          escortState.hp = Math.max(0, escortState.hp - 25);
          if (escortState.hp <= 0) {
            escortState.restingTimer = 5.0;
            msgNpc.idle = 'rest';
            const restMsg =
              ctx.i18n?.t?.('toast.escort.resting') ||
              '信使體力不支，原地調息 5 秒後將繼續前行！';
            ctx.hud?.toast?.(restMsg);
            return;
          }
          break;
        }
      }
    }

    // Advance toward current waypoint
    const wp = escortWaypoints[escortState.wpIndex];
    if (!wp) return;

    const dx = wp.x - msgNpc.x;
    const dz = wp.z - msgNpc.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.6) {
      const speed = 3.1;
      const step = Math.min(dist, speed * dt);
      msgNpc.x += (dx / dist) * step;
      msgNpc.z += (dz / dist) * step;
      msgNpc.heading = Math.atan2(dx, dz);
      msgNpc.idle = 'walk';
    } else {
      // Reached waypoint
      if (wp.ambush && !escortState.triggeredAmbushes.has(wp.ambushId)) {
        escortState.triggeredAmbushes.add(wp.ambushId);
        const ambMsg =
          ctx.i18n?.t?.('toast.escort.ambush') || '峽谷伏兵出現！保護那爛陀信使！';
        ctx.hud?.toast?.(ambMsg);
        const kinds = wp.ambushId === 3 ? ['droughtSprite', 'dustDevil', 'droughtSprite'] : ['droughtSprite', 'dustDevil'];
        kinds.forEach((k, idx) => {
          const sx = wp.x + (idx - 0.5) * 4.0;
          const sz = wp.z + (idx % 2 === 0 ? -4.5 : 4.5);
          ctx.enemies?.spawn?.(k, {
            position: { x: sx, y: getHeight(sx, sz), z: sz },
            level: 7,
          });
        });
      }

      if (wp.final) {
        escortState.active = false;
        escortState.arrived = true;
        msgNpc.idle = 'stand';
        ctx.quests?.setFlag?.('ch1.escort.arrived', true);
        const arrMsg =
          ctx.i18n?.t?.('toast.escort.arrived') ||
          '那爛陀信使已安全抵達揚列雪洞口！';
        ctx.hud?.toast?.(arrMsg);
        ctx.bus.emit('escort:arrived', { npcId: 'messenger' });
      } else {
        escortState.wpIndex++;
      }
    }
  }

  // ---------------------------------------------------------------- 10. Rain Transformation (`ch1.rain`) & Rain Particle System
  const rainCount = 420;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3 + 0] = origin.x + (Math.random() - 0.5) * 160;
    rainPositions[i * 3 + 1] = Math.random() * 24;
    rainPositions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 160;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0xbae6fd,
    size: 0.22,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const rainPoints = new THREE.Points(rainGeo, rainMat);
  rainPoints.name = 'PharpingRainParticles';
  rainPoints.visible = false;
  group.add(rainPoints);

  let rainActive = false;
  let rainMix = 0;
  let rainChimeTimer = 0;

  function updateRainVisuals(mix) {
    updateTerrainColors(mix);
    foliageMat.color.lerpColors(dryFoliageCol, wetFoliageCol, mix);
    foliageMat.emissiveIntensity = mix * 0.18;
    for (const c of treeCanopies) {
      c.scale.setScalar(Math.max(0.05, mix));
    }
    // Cool Asura Cave arena veins from scorched amber to serene Naga water-spirit turquoise
    asuraVeinMat.color.setRGB(
      THREE.MathUtils.lerp(2.0, 0.35, mix),
      THREE.MathUtils.lerp(0.65, 1.55, mix),
      THREE.MathUtils.lerp(0.15, 1.85, mix),
    );
    arenaRingMat.color.setHex(mix > 0.5 ? 0x2dd4bf : 0xd97706);
    asuraMouthPoolMat.color.setHex(mix > 0.5 ? 0x0d9488 : 0xea580c);
  }

  function applyRainTransformation(immediate = false) {
    if (!rainActive) {
      rainActive = true;
      rainPoints.visible = true;
      wellWaterMesh.visible = true;
      for (const sp of springs) {
        sp.inspected = true;
        sp.waterDisc.visible = true;
        sp.waterDisc.scale.setScalar(1.0);
      }
      for (const c of treeCanopies) {
        c.visible = true;
      }
    }
    if (immediate && rainMix < 1) {
      rainMix = 1;
      updateRainVisuals(1);
    }
  }

  ctx.bus.on('pharping:rain', () => {
    applyRainTransformation(false);
  });

  // Sync lit lamps & rain state if revisited after completion
  function syncPersistedState() {
    if (ctx.quests?.hasFlag?.('ch1.lamps.lit') || ctx.quests?.hasFlag?.('ch1.lamps.done')) {
      for (const l of lampNiches) {
        l.lit = true;
        l.flameGrp.visible = true;
        if (l.lampPoolMat) l.lampPoolMat.opacity = 0.62;
      }
    }
    if (ctx.quests?.hasFlag?.('ch1.drought.done')) {
      for (const sp of springs) {
        sp.inspected = true;
        sp.waterDisc.visible = true;
        sp.waterDisc.scale.setScalar(rainActive ? 1.0 : 0.52);
      }
    }
    if (ctx.quests?.hasFlag?.('ch1.rain') || ctx.quests?.hasFlag?.('ch1.done')) {
      applyRainTransformation(!rainActive);
    }
  }

  // ---------------------------------------------------------------- 11. Per-Frame Update
  let animTime = 0;
  function update(dt) {
    animTime += dt;
    syncPersistedState();

    // Animate lit cave butter lamps, floor light pools & check lamp attackers
    const activeEnemies = ctx.enemies?.getActiveEnemies?.() || [];
    let litLampCount = 0;
    for (const l of lampNiches) {
      if (l.lit) {
        litLampCount++;
        const flicker = Math.sin(animTime * 9.0 + l.index * 1.4);
        const s = 0.92 + flicker * 0.14;
        l.flameGrp.scale.set(s, s, s);
        if (l.lampPoolMat) {
          l.lampPoolMat.opacity = 0.56 + flicker * 0.08;
        }
      } else if (l.lampPoolMat) {
        l.lampPoolMat.opacity = 0.08;
      }
    }

    // Scale central cave sanctuary, wall & ceiling bounce glow with lit butter lamps
    const lampProgress = litLampCount / 7;
    sanctuaryGlowMat.opacity =
      0.16 + lampProgress * 0.42 + Math.sin(animTime * 3.2) * 0.03;
    vaultBounceMat.opacity =
      0.12 + lampProgress * 0.28 + Math.cos(animTime * 2.8) * 0.025;
    caveWallBounceMat.opacity =
      0.22 + lampProgress * 0.26 + Math.sin(animTime * 3.5) * 0.03;
    altarGlowMat.opacity =
      0.44 + lampProgress * 0.24 + Math.sin(animTime * 4.0) * 0.04;
    shaftMat.opacity = 0.09 + Math.sin(animTime * 1.9) * 0.025;

    // Shimmer the 10 Firewatch forest canopy sunbeam shafts & valley mist layers
    for (let i = 0; i < pharpingSunbeams.length; i++) {
      const sb = pharpingSunbeams[i];
      sb.mat.opacity = sb.baseOpacity + 0.03 * Math.sin(animTime * 1.4 + sb.phase);
    }
    terraceMistLowerMat.opacity = 0.17 + 0.035 * Math.sin(animTime * 0.9);
    cliffMistUpperMat.opacity = 0.15 + 0.035 * Math.cos(animTime * 1.1);
    outerRimMistMat.opacity = 0.20 + 0.04 * Math.sin(animTime * 0.75 + 0.8);

    // Subtle pulse on Asura Cave Boss Arena mandala & runes
    arenaMandalaMat.opacity = 0.48 + Math.sin(animTime * 2.4) * 0.1;

    // Gentle upward drift for Yangleshö Cave dust motes
    const dustArr = caveDustGeo.attributes.position.array;
    for (let i = 0; i < caveDustCount; i++) {
      const idx = i * 3;
      dustArr[idx + 1] += dt * (0.14 + (i % 3) * 0.04);
      dustArr[idx + 0] += Math.sin(animTime * 1.1 + i) * dt * 0.05;
      if (dustArr[idx + 1] > 5.2) {
        dustArr[idx + 1] = 0.45;
      }
    }
    caveDustGeo.attributes.position.needsUpdate = true;

    // Check if any lamp-attacker enemy reached a lit lamp to blow it out
    if (!ctx.quests?.hasFlag?.('ch1.lamps.lit')) {
      for (const e of activeEnemies) {
        if (!e.isLampAttacker || e.hp <= 0) continue;
        for (const l of lampNiches) {
          if (!l.lit) continue;
          const d = Math.hypot(e.group.position.x - l.x, e.group.position.z - l.z);
          if (d <= 1.85) {
            l.lit = false;
            l.flameGrp.visible = false;
            if (l.lampPoolMat) l.lampPoolMat.opacity = 0.08;
            e.isLampAttacker = false;
            ctx.bus.emit('quest:interact', { target: 'yangleshoLamp', count: -1 });
            const extMsg =
              ctx.i18n?.t?.('toast.lamp.extinguished') ||
              '一盞酥油燈被熱風吹滅了！請擊退敵人並重新點燃（F）！';
            ctx.hud?.toast?.(extMsg);
            break;
          }
        }
      }
    }

    // Update escort quest (C1-3)
    updateEscort(dt);

    // Update Rain Transformation visuals & ambient raindrop particles
    if (rainActive) {
      if (rainMix < 1) {
        rainMix = Math.min(1, rainMix + dt * 0.45);
        updateRainVisuals(rainMix);
      }

      const pPos = ctx.state?.player?.position || origin;
      const arr = rainGeo.attributes.position.array;
      for (let i = 0; i < rainCount; i++) {
        const idx = i * 3;
        arr[idx + 1] -= dt * 16.5;
        if (arr[idx + 1] < 0.2) {
          arr[idx + 0] = pPos.x + (Math.random() - 0.5) * 70;
          arr[idx + 1] = 18 + Math.random() * 8;
          arr[idx + 2] = pPos.z + (Math.random() - 0.5) * 70;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;

      // Subtle water shimmer
      wellWaterMat.emissiveIntensity = 0.42 + Math.sin(animTime * 3.2) * 0.12;
      springWaterMat.emissiveIntensity = 0.46 + Math.cos(animTime * 3.6) * 0.14;

      // Occasional gentle rain/bird chime via procedural sfx
      rainChimeTimer -= dt;
      if (rainChimeTimer <= 0) {
        rainChimeTimer = 6.5 + Math.random() * 4.0;
        ctx.bus.emit('sfx', { name: 'chime' });
      }
    }
  }

  return {
    group,
    surfaceTextures: surfaces.textures,
    getHeight,
    update,
    springs,
    lampNiches,
    escortState,
    isRaining: () => rainActive,
  };
}

export default createMap;
