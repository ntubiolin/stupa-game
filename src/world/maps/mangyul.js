// ============================================================================
// Mangyul Pass (芒域山口・吉隆) Procedural 3D Map + Twelve Tenma Trials — Chapter 2
// Lazy-loaded by src/systems/zones.js when entering 'mangyul'.
// Performance constraints:
//   - ZERO PointLights anywhere (emissive / MeshBasicMaterial only)
//   - Draw calls < 400, Triangles < 600k (InstancedMesh for pines, rocks,
//     latse stones, prayer flags, and pooled Points for snow particles)
// ============================================================================

import * as THREE from 'three';
import { pushCollider, buildGateArch, addRimMountains } from '../mapBase.js';
import { MANGYUL_MAP } from '../../data/maps/mangyul.js';

const ORIGIN_X = MANGYUL_MAP.origin.x; // 3000
const ORIGIN_Z = MANGYUL_MAP.origin.z; // 0

// Vibrant 5-color Tibetan Lungta palette (Blue, White, Red, Green, Yellow)
const LUNGTA_COLORS = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
const FADED_FLAG_COLOR = 0x8b8e92;

// 12 Tenma Altars along the switchback mountain trail and side valleys
// (3 each of 'hail', 'avalanche', 'fog', 'lightning')
const TENMA_ALTAR_DEFS = [
  { index: 0, type: 'hail', lx: -12, lz: 34 },
  { index: 1, type: 'avalanche', lx: 16, lz: 26 },
  { index: 2, type: 'fog', lx: -18, lz: 18 },
  { index: 3, type: 'lightning', lx: 20, lz: 10 },
  { index: 4, type: 'hail', lx: -20, lz: 2 },
  { index: 5, type: 'avalanche', lx: 18, lz: -6 },
  { index: 6, type: 'fog', lx: -18, lz: -14 },
  { index: 7, type: 'lightning', lx: 20, lz: -22 },
  { index: 8, type: 'hail', lx: -16, lz: -30 },
  { index: 9, type: 'avalanche', lx: 18, lz: -36 },
  { index: 10, type: 'fog', lx: -18, lz: -44 },
  { index: 11, type: 'lightning', lx: 18, lz: -46 },
];

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Deterministic terrain height for Mangyul Pass (world coords wx, wz).
 * South (lz > 30): Low Kyirong conifer valley (~0.5–2.2m)
 * Middle (-35 <= lz <= 30): Switchback mountain trail climbing steadily (~2.2–12.5m)
 * North (lz < -35): High snow-line pass & Pass Latse boss arena (~13.0–13.5m)
 */
export function mangyulHeightFn(wx, wz) {
  const lx = wx - ORIGIN_X;
  const lz = wz - ORIGIN_Z;

  // Base south-to-north elevation ramp
  const climbT = smoothstep(55, -55, lz);
  let h = climbT * 13.5;

  // Gentle organic mountain undulation
  let undulation =
    Math.sin(lx * 0.055) * Math.cos(lz * 0.055) * 0.9 +
    Math.sin(lx * 0.12 + lz * 0.09) * 0.35;

  // East and west valley ridge walls (rise steeper on flanks)
  const flankDist = Math.max(0, Math.abs(lx) - 26);
  const flankRise = (flankDist * flankDist) * 0.012;

  // Flatten key areas so buildings, altars, camp, and boss arena sit cleanly:
  // 1. Southern entrance + Waypoint (0, 85, r=12)
  const dEntrance = Math.hypot(lx - 0, lz - 85);
  const fEntrance = smoothstep(4, 15, dEntrance);

  // 2. Envoy Camp (10, 50, r=10)
  const dCamp = Math.hypot(lx - 10, lz - 50);
  const fCamp = smoothstep(5, 13, dCamp);

  // 3. Pass Latse + Boss Arena (0, -65, r=18)
  const dPass = Math.hypot(lx - 0, lz - -65);
  const fPass = smoothstep(14, 22, dPass);

  // 4. Flatten around the 12 Tenma Altars
  let fAltar = 1.0;
  for (let i = 0; i < TENMA_ALTAR_DEFS.length; i++) {
    const a = TENMA_ALTAR_DEFS[i];
    const da = Math.hypot(lx - a.lx, lz - a.lz);
    if (da < 7.5) {
      fAltar = Math.min(fAltar, smoothstep(2.8, 7.5, da));
    }
  }

  const flatMask = fEntrance * fCamp * fPass * fAltar;
  h += (undulation + flankRise) * flatMask;

  // Shallow stream bed in southern Kyirong valley (around lz = 68, lx < 4)
  if (lz > 56 && lz < 76) {
    const streamCenterZ = 67 + Math.sin(lx * 0.08) * 2.5;
    const ds = Math.abs(lz - streamCenterZ);
    if (ds < 3.2 && Math.abs(lx) > 3.5) {
      h -= (1 - ds / 3.2) * 0.55;
    }
  }

  return h;
}

export function createMangyulMap(ctx) {
  const { scene, state, bus, i18n } = ctx;
  const zoneGroup = ctx.zoneGroups?.mangyul || new THREE.Group();
  zoneGroup.name = 'MangyulMap';
  if (!ctx.zoneGroups?.mangyul) {
    scene.add(zoneGroup);
  }

  // Local coordinate root at (3000, 0, 0) so local (lx, y, lz) maps to world (3000 + lx, y, lz)
  const root = new THREE.Group();
  root.name = 'MangyulLocalRoot';
  root.position.set(ORIGIN_X, 0, ORIGIN_Z);
  zoneGroup.add(root);

  const base = {
    group: zoneGroup,
    addCollider(shape) {
      pushCollider(ctx, 'mangyul', {
        type: 'circle',
        ...shape,
      });
    },
    dispose() {
      zoneGroup.remove(root);
    },
  };

  // Build southern gate arch at (3000, 92) and rim mountains
  buildGateArch(ctx, zoneGroup, {
    mapId: 'mangyul',
    x: ORIGIN_X,
    z: 92,
    y: mangyulHeightFn(ORIGIN_X, 92),
    facing: 0,
  });
  addRimMountains(ctx, zoneGroup, {
    origin: { x: ORIGIN_X, z: ORIGIN_Z },
    radius: 118,
    count: 28,
    color: 0x64748b,
    snowColor: 0xe2e8f0,
  });

  // Track resources for clean disposal
  const geometries = [];
  const materials = [];
  const trackGeo = (g) => {
    geometries.push(g);
    return g;
  };
  const trackMat = (m) => {
    materials.push(m);
    return m;
  };

  // ==========================================================================
  // 1. Terrain Mesh with South-to-North Biome Vertex Colors
  // ==========================================================================
  const terrainSize = 240;
  const terrainSegs = 96;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const colorArr = new Float32Array(posAttr.count * 3);
  const cForest = new THREE.Color(0x2f4f38); // Kyirong conifer valley moss
  const cTrail = new THREE.Color(0x6e685f);  // Switchback stone path
  const cSlate = new THREE.Color(0x566370);  // Mountain slate rock
  const cSnow = new THREE.Color(0xe6f0fa);   // High alpine snow
  const cGlacier = new THREE.Color(0x8fd0f5); // East/west glacier ice
  const tmpColor = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const wy = mangyulHeightFn(ORIGIN_X + lx, ORIGIN_Z + lz);
    posAttr.setY(i, wy);

    // Biome blend based on lz and switchback trail proximity
    const snowBlend = smoothstep(25, -38, lz);
    tmpColor.copy(cForest).lerp(cSlate, smoothstep(55, 5, lz));
    tmpColor.lerp(cSnow, snowBlend);

    // Switchback trail ribbon: x oscillates with sin(lz) between lz = 45 and lz = -55
    const trailCenterX =
      lz > 40
        ? smoothstep(85, 45, lz) * 8
        : lz > -45
          ? Math.sin(lz * 0.14) * 14
          : 0;
    const distToTrail = Math.abs(lx - trailCenterX);
    if (distToTrail < 3.4 && lz > -65 && lz < 88) {
      const trailMix = (1 - distToTrail / 3.4) * 0.65;
      tmpColor.lerp(cTrail, trailMix);
    }

    // Glacier tint on northern flanks
    if (lz < -25 && Math.abs(lx) > 22) {
      const gMix = smoothstep(22, 42, Math.abs(lx)) * smoothstep(-20, -45, lz);
      tmpColor.lerp(cGlacier, gMix * 0.75);
    }

    colorArr[i * 3] = tmpColor.r;
    colorArr[i * 3 + 1] = tmpColor.g;
    colorArr[i * 3 + 2] = tmpColor.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // ==========================================================================
  // 2. Southern Kyirong Valley: Stream, Bridge, Waypoint & Conifer Forest
  // ==========================================================================
  const streamGeo = trackGeo(new THREE.PlaneGeometry(90, 4.2, 24, 2));
  streamGeo.rotateX(-Math.PI / 2);
  const sPos = streamGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const sx = sPos.getX(i);
    const sz = 67 + Math.sin(sx * 0.08) * 2.5 + sPos.getZ(i);
    sPos.setZ(i, sz);
    sPos.setY(i, mangyulHeightFn(ORIGIN_X + sx, sz) + 0.12);
  }
  streamGeo.computeVertexNormals();
  const streamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.82,
    })
  );
  const streamMesh = new THREE.Mesh(streamGeo, streamMat);
  root.add(streamMesh);

  // Wooden footbridge over the Kyirong stream at (0, 67)
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85, flatShading: true })
  );
  const bridgeGroup = new THREE.Group();
  const bridgeY = mangyulHeightFn(ORIGIN_X, 67) + 0.28;
  bridgeGroup.position.set(0, bridgeY, 67);
  const deck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.8, 0.22, 6.2)), woodMat);
  bridgeGroup.add(deck);
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.14, 1.3, 6));
  for (const px of [-1.75, 1.75]) {
    for (const pz of [-2.6, 0, 2.6]) {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(px, 0.6, pz);
      bridgeGroup.add(post);
    }
  }
  root.add(bridgeGroup);

  // Southern Entrance Waypoint Shrine at (3000, 85) -> local (0, 85)
  const waypointGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    })
  );
  const wpGroup = new THREE.Group();
  wpGroup.position.set(0, mangyulHeightFn(ORIGIN_X, 85), 85);
  const wpBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.4, 1.7, 0.45, 8)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, flatShading: true }))
  );
  wpBase.position.y = 0.22;
  const wpPillar = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.55, 0)),
    waypointGlowMat
  );
  wpPillar.scale.set(0.7, 1.6, 0.7);
  wpPillar.position.y = 1.25;
  wpGroup.add(wpBase, wpPillar);
  root.add(wpGroup);

  // InstancedMesh Conifer Pines in Southern Valley & Lower Trail (72 trees = 3 draw calls)
  const PINE_COUNT = 72;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 1.8, 6));
  const foliageGeo1 = trackGeo(new THREE.ConeGeometry(1.35, 2.8, 7));
  const foliageGeo2 = trackGeo(new THREE.ConeGeometry(0.95, 2.2, 7));
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4a321f, roughness: 0.9, flatShading: true })
  );
  const foliageMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e462c, roughness: 0.82, flatShading: true })
  );
  const snowFoliageMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4b7265, roughness: 0.75, flatShading: true })
  );

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, PINE_COUNT);
  const foliageLowInst = new THREE.InstancedMesh(foliageGeo1, foliageMat, PINE_COUNT);
  const foliageHighInst = new THREE.InstancedMesh(foliageGeo2, snowFoliageMat, PINE_COUNT);
  trunkInst.castShadow = true;
  foliageLowInst.castShadow = true;
  foliageHighInst.castShadow = true;

  const dummy = new THREE.Object3D();
  let pineIdx = 0;
  for (let i = 0; i < PINE_COUNT; i++) {
    // Place mostly in south (lz 15..95), avoiding entrance, camp, and central trail
    const ring = (i % 9) / 9;
    const side = i % 2 === 0 ? -1 : 1;
    const lx = side * (14 + ((i * 17) % 34)) + Math.sin(i * 2.1) * 4;
    const lz = 12 + ring * 82 + Math.cos(i * 1.7) * 4;
    if (Math.hypot(lx - 10, lz - 50) < 12 || Math.hypot(lx, lz - 85) < 11) {
      // Shift away from camp/entrance
      dummy.position.set(lx + side * 12, 0, lz);
    } else {
      dummy.position.set(lx, 0, lz);
    }
    const px = dummy.position.x;
    const pz = dummy.position.z;
    const py = mangyulHeightFn(ORIGIN_X + px, pz);
    const scale = 0.85 + ((i * 13) % 10) * 0.045;

    dummy.position.set(px, py + 0.9 * scale, pz);
    dummy.rotation.set(0, (i * 1.1) % (Math.PI * 2), 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(pineIdx, dummy.matrix);

    dummy.position.set(px, py + 2.3 * scale, pz);
    dummy.updateMatrix();
    foliageLowInst.setMatrixAt(pineIdx, dummy.matrix);

    dummy.position.set(px, py + 3.6 * scale, pz);
    dummy.updateMatrix();
    foliageHighInst.setMatrixAt(pineIdx, dummy.matrix);
    pineIdx++;
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  foliageLowInst.instanceMatrix.needsUpdate = true;
  foliageHighInst.instanceMatrix.needsUpdate = true;
  root.add(trunkInst, foliageLowInst, foliageHighInst);

  // ==========================================================================
  // 3. Envoy Camp at (3010, 50) -> local (10, 50): Tents, Horses, Emissive Campfire
  // ==========================================================================
  const campGroup = new THREE.Group();
  const campY = mangyulHeightFn(ORIGIN_X + 10, 50);
  campGroup.position.set(10, campY, 50);
  root.add(campGroup);

  const tentClothMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2d5be,
      roughness: 0.85,
      flatShading: true,
    })
  );
  const tentTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.75,
      flatShading: true,
    })
  );

  // Two Tibetan envoy tents
  const tentPositions = [
    { x: -4.2, z: -2.8, rot: 0.4 },
    { x: 4.5, z: -2.2, rot: -0.45 },
  ];
  const tentConeGeo = trackGeo(new THREE.ConeGeometry(2.3, 2.6, 6));
  const tentRoofTrimGeo = trackGeo(new THREE.CylinderGeometry(0.4, 2.35, 0.35, 6));
  for (const tp of tentPositions) {
    const tGrp = new THREE.Group();
    tGrp.position.set(tp.x, 0, tp.z);
    tGrp.rotation.y = tp.rot;
    const cone = new THREE.Mesh(tentConeGeo, tentClothMat);
    cone.position.y = 1.3;
    cone.castShadow = true;
    const trim = new THREE.Mesh(tentRoofTrimGeo, tentTrimMat);
    trim.position.y = 0.35;
    tGrp.add(cone, trim);
    campGroup.add(tGrp);
    base.addCollider({ x: ORIGIN_X + 10 + tp.x, z: 50 + tp.z, r: 2.0 });
  }

  // Two pack horses at the Envoy Camp
  const horseMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85, flatShading: true })
  );
  const saddleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75, flatShading: true })
  );
  const horseBodyGeo = trackGeo(new THREE.BoxGeometry(0.65, 0.62, 1.35));
  const horseNeckGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.55, 0.35));
  const horseLegGeo = trackGeo(new THREE.CylinderGeometry(0.07, 0.05, 0.75, 5));
  for (const [hx, hz, hRot] of [
    [-4.8, 3.2, 1.1],
    [-2.8, 4.4, 0.7],
  ]) {
    const hGrp = new THREE.Group();
    hGrp.position.set(hx, 0, hz);
    hGrp.rotation.y = hRot;
    const body = new THREE.Mesh(horseBodyGeo, horseMat);
    body.position.y = 0.95;
    const saddle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.72, 0.25, 0.65)), saddleMat);
    saddle.position.y = 1.22;
    const neck = new THREE.Mesh(horseNeckGeo, horseMat);
    neck.position.set(0, 1.32, 0.55);
    neck.rotation.x = 0.35;
    hGrp.add(body, saddle, neck);
    for (const [lx, lz] of [
      [-0.22, -0.45],
      [0.22, -0.45],
      [-0.22, 0.45],
      [0.22, 0.45],
    ]) {
      const leg = new THREE.Mesh(horseLegGeo, horseMat);
      leg.position.set(lx, 0.38, lz);
      hGrp.add(leg);
    }
    campGroup.add(hGrp);
  }

  // Emissive Campfire (ZERO PointLights — emissive flame cones + glowing ground disc)
  const campfireGroup = new THREE.Group();
  campfireGroup.position.set(0, 0, 1.2);
  campGroup.add(campfireGroup);

  const emberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      emissive: 0xff4500,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    })
  );
  const flameOuterMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff7b1a,
      transparent: true,
      opacity: 0.88,
    })
  );
  const flameInnerMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.92,
    })
  );
  const fireGlowDiscMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff8c1a,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );

  const fireRingGeo = trackGeo(new THREE.DodecahedronGeometry(0.18, 0));
  const stoneRingMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true })
  );
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const st = new THREE.Mesh(fireRingGeo, stoneRingMat);
    st.position.set(Math.cos(ang) * 0.65, 0.1, Math.sin(ang) * 0.65);
    campfireGroup.add(st);
  }
  const emberCore = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.38, 8, 6)), emberMat);
  emberCore.scale.set(1, 0.45, 1);
  emberCore.position.y = 0.12;
  const flameOuter = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.36, 0.95, 6)), flameOuterMat);
  flameOuter.position.y = 0.52;
  const flameInner = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.2, 0.68, 5)), flameInnerMat);
  flameInner.position.y = 0.46;
  const fireGlowDisc = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(2.4, 16)), fireGlowDiscMat);
  fireGlowDisc.rotation.x = -Math.PI / 2;
  fireGlowDisc.position.y = 0.03;
  campfireGroup.add(emberCore, flameOuter, flameInner, fireGlowDisc);

  // ==========================================================================
  // 4. Instanced Rocks, Boulders & Northern Glaciers
  // ==========================================================================
  const ROCK_COUNT = 84;
  const rockGeo = trackGeo(new THREE.DodecahedronGeometry(1.0, 0));
  const rockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x52606d, roughness: 0.88, flatShading: true })
  );
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, ROCK_COUNT);
  rockInst.castShadow = true;
  for (let i = 0; i < ROCK_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const lx = side * (22 + ((i * 19) % 45)) + Math.sin(i * 3.1) * 5;
    const lz = -80 + (i / ROCK_COUNT) * 165;
    const ry = mangyulHeightFn(ORIGIN_X + lx, lz);
    const sx = 0.9 + ((i * 7) % 10) * 0.22;
    const sy = 0.7 + ((i * 11) % 10) * 0.25;
    const sz = 0.9 + ((i * 13) % 10) * 0.2;
    dummy.position.set(lx, ry + sy * 0.35, lz);
    dummy.rotation.set(i * 0.4, i * 0.9, i * 0.3);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
  }
  rockInst.instanceMatrix.needsUpdate = true;
  root.add(rockInst);

  // East & West Glaciers in the Northern Pass (z < -30)
  const glacierMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x99dcff,
      emissive: 0x164e63,
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88,
      flatShading: true,
    })
  );
  const GLACIER_SPIRE_COUNT = 36;
  const glacierGeo = trackGeo(new THREE.ConeGeometry(2.6, 9.5, 5));
  const glacierInst = new THREE.InstancedMesh(glacierGeo, glacierMat, GLACIER_SPIRE_COUNT);
  for (let i = 0; i < GLACIER_SPIRE_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const lx = side * (26 + ((i * 11) % 28));
    const lz = -34 - ((i * 17) % 58);
    const gy = mangyulHeightFn(ORIGIN_X + lx, lz);
    const s = 0.75 + ((i * 7) % 9) * 0.16;
    dummy.position.set(lx, gy + 3.8 * s, lz);
    dummy.rotation.set(
      (side * -0.15) + Math.sin(i) * 0.08,
      (i * 0.8) % (Math.PI * 2),
      side * 0.18
    );
    dummy.scale.set(s, s * (1.1 + (i % 3) * 0.2), s);
    dummy.updateMatrix();
    glacierInst.setMatrixAt(i, dummy.matrix);
  }
  glacierInst.instanceMatrix.needsUpdate = true;
  root.add(glacierInst);

  // ==========================================================================
  // 5. Pass Latse (山口拉則) + Boss Arena at (3000, -65), r = 18
  // ==========================================================================
  const passY = mangyulHeightFn(ORIGIN_X, -65);
  const latseGroup = new THREE.Group();
  latseGroup.position.set(0, passY, -65);
  root.add(latseGroup);

  // Arena perimeter stone ring markers (radius 18m)
  const arenaRingGeo = trackGeo(new THREE.RingGeometry(17.6, 18.1, 48));
  arenaRingGeo.rotateX(-Math.PI / 2);
  const arenaRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const arenaRingMesh = new THREE.Mesh(arenaRingGeo, arenaRingMat);
  arenaRingMesh.position.y = 0.06;
  latseGroup.add(arenaRingMesh);

  // Monumental Latse Cairn (placed at northern rim of the arena z = -72 so center is open for combat,
  // while still inside the pass plaza!)
  const cairnCenter = new THREE.Group();
  cairnCenter.position.set(0, 0, -6.5);
  latseGroup.add(cairnCenter);
  base.addCollider({ x: ORIGIN_X, z: -71.5, r: 2.8 });

  // Instanced stacked white quartz & slate stones for the Latse (64 stones = 1 draw call)
  const LATSE_STONE_COUNT = 64;
  const latseStoneGeo = trackGeo(new THREE.DodecahedronGeometry(0.45, 0));
  const latseStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdbe4ee,
      emissive: 0x1e293b,
      emissiveIntensity: 0.18,
      roughness: 0.75,
      flatShading: true,
    })
  );
  const latseStoneInst = new THREE.InstancedMesh(latseStoneGeo, latseStoneMat, LATSE_STONE_COUNT);
  for (let i = 0; i < LATSE_STONE_COUNT; i++) {
    const tier = Math.floor(i / 16); // 4 tiers
    const idxInTier = i % 16;
    const ang = (idxInTier / 16) * Math.PI * 2 + tier * 0.25;
    const rad = Math.max(0.35, 2.3 - tier * 0.52);
    const sy = 0.35 + tier * 0.55;
    dummy.position.set(Math.cos(ang) * rad, sy, Math.sin(ang) * rad);
    dummy.rotation.set(i * 0.3, ang, i * 0.2);
    dummy.scale.set(1.1 - tier * 0.12, 0.72, 1.0 - tier * 0.1);
    dummy.updateMatrix();
    latseStoneInst.setMatrixAt(i, dummy.matrix);
  }
  latseStoneInst.instanceMatrix.needsUpdate = true;
  cairnCenter.add(latseStoneInst);

  // Central wooden arrows / spears ("Dadar") crowning the Latse
  const spirePole = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1, 0.16, 4.8, 6)),
    woodMat
  );
  spirePole.position.y = 2.6;
  cairnCenter.add(spirePole);

  // Prayer flag arrays radiating from the Latse cairn
  const animatedFlags = [];
  const flagPlaneGeo = trackGeo(new THREE.PlaneGeometry(0.44, 0.34));
  const lungtaMats = LUNGTA_COLORS.map((hex) =>
    trackMat(
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.28,
        roughness: 0.6,
        side: THREE.DoubleSide,
      })
    )
  );

  for (let strand = 0; strand < 6; strand++) {
    const ang = (strand / 6) * Math.PI * 2;
    const strandGroup = new THREE.Group();
    strandGroup.rotation.y = ang;
    cairnCenter.add(strandGroup);
    for (let f = 0; f < 5; f++) {
      const t = (f + 1) / 6;
      const fm = new THREE.Mesh(flagPlaneGeo, lungtaMats[f % 5]);
      fm.position.set(t * 3.8, 4.4 - t * 2.2, 0);
      strandGroup.add(fm);
      animatedFlags.push({ mesh: fm, baseRotZ: 0, phase: strand * 1.1 + f * 0.7 });
    }
  }

  // Extra celebratory prayer flag array at (3000, -63) revealed when player hangs flags in C2-4 (`passPrayerFlags`)
  const hungPassFlagsGroup = new THREE.Group();
  hungPassFlagsGroup.position.set(0, 0, 2.0); // relative to latseGroup (0, -65) -> world (3000, -63)
  hungPassFlagsGroup.visible = Boolean(ctx.quests?.getFlag?.('ch2.done') || state.flags?.['ch2.passFlagsHung']);
  latseGroup.add(hungPassFlagsGroup);

  const passFlagPostL = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6)),
    woodMat
  );
  passFlagPostL.position.set(-2.4, 1.6, 0);
  const passFlagPostR = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6)),
    woodMat
  );
  passFlagPostR.position.set(2.4, 1.6, 0);
  latseGroup.add(passFlagPostL, passFlagPostR);

  for (let f = 0; f < 10; f++) {
    const u = (f + 0.5) / 10;
    const fx = -2.2 + u * 4.4;
    const fy = 2.85 - Math.sin(u * Math.PI) * 0.35;
    const fm = new THREE.Mesh(flagPlaneGeo, lungtaMats[f % 5]);
    fm.position.set(fx, fy, 0);
    hungPassFlagsGroup.add(fm);
    animatedFlags.push({ mesh: fm, baseRotZ: 0, phase: f * 0.55 });
  }

  // ==========================================================================
  // 6. Twelve Tenma Altars & Weather Trial System
  // ==========================================================================
  const altarStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, flatShading: true })
  );
  const oathStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.1,
      roughness: 0.2,
      flatShading: true,
    })
  );

  const altarBaseGeo = trackGeo(new THREE.CylinderGeometry(1.15, 1.35, 0.55, 7));
  const altarTableGeo = trackGeo(new THREE.BoxGeometry(1.2, 0.38, 0.9));
  const oathStoneGeo = trackGeo(new THREE.OctahedronGeometry(0.28, 0));
  const altarPoleGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.08, 2.7, 5));

  const altars = TENMA_ALTAR_DEFS.map((def) => {
    const wx = ORIGIN_X + def.lx;
    const wz = ORIGIN_Z + def.lz;
    const wy = mangyulHeightFn(wx, wz);

    const aGrp = new THREE.Group();
    aGrp.position.set(def.lx, wy, def.lz);
    root.add(aGrp);
    base.addCollider({ x: wx, z: wz, r: 1.3 });

    const baseMesh = new THREE.Mesh(altarBaseGeo, altarStoneMat);
    baseMesh.position.y = 0.27;
    const tableMesh = new THREE.Mesh(altarTableGeo, altarStoneMat);
    tableMesh.position.y = 0.72;
    aGrp.add(baseMesh, tableMesh);

    const poleL = new THREE.Mesh(altarPoleGeo, woodMat);
    poleL.position.set(-1.15, 1.35, -0.35);
    const poleR = new THREE.Mesh(altarPoleGeo, woodMat);
    poleR.position.set(1.15, 1.35, -0.35);
    aGrp.add(poleL, poleR);

    // Oath stone (visible once placed)
    const oathStoneMesh = new THREE.Mesh(oathStoneGeo, oathStoneMat);
    oathStoneMesh.position.set(0, 1.18, 0);
    oathStoneMesh.visible = false;
    aGrp.add(oathStoneMesh);

    // 5 prayer flags strung between poleL and poleR
    const flagMeshes = [];
    const flagMats = [];
    for (let f = 0; f < 5; f++) {
      const fMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: FADED_FLAG_COLOR,
          emissive: 0x000000,
          emissiveIntensity: 0,
          roughness: 0.85,
          side: THREE.DoubleSide,
        })
      );
      const u = (f + 0.5) / 5;
      const fMesh = new THREE.Mesh(flagPlaneGeo, fMat);
      fMesh.position.set(-0.95 + u * 1.9, 2.35 - Math.sin(u * Math.PI) * 0.2, -0.35);
      aGrp.add(fMesh);
      flagMeshes.push(fMesh);
      flagMats.push(fMat);
      animatedFlags.push({ mesh: fMesh, baseRotZ: 0, phase: def.index * 0.9 + f * 0.6 });
    }

    const flagKey = `tenma.altar.${def.index}`;
    const alreadyDone = Boolean(
      ctx.quests?.getFlag?.(flagKey) ||
        state.flags?.[flagKey] ||
        ctx.quests?.getFlag?.('ch2.tenma.done') ||
        ctx.quests?.getFlag?.('ch2.done')
    );

    const altarObj = {
      index: def.index,
      type: def.type,
      lx: def.lx,
      lz: def.lz,
      wx,
      wz,
      wy,
      status: alreadyDone ? 'completed' : 'unstarted', // 'unstarted' | 'active' | 'passed' | 'completed'
      group: aGrp,
      oathStoneMesh,
      flagMeshes,
      flagMats,
    };

    if (alreadyDone) {
      applyAltarCompletedVisuals(altarObj);
    }

    return altarObj;
  });

  function applyAltarCompletedVisuals(altar) {
    altar.status = 'completed';
    altar.oathStoneMesh.visible = true;
    for (let f = 0; f < altar.flagMats.length; f++) {
      const hex = LUNGTA_COLORS[f % LUNGTA_COLORS.length];
      altar.flagMats[f].color.setHex(hex);
      altar.flagMats[f].emissive.setHex(hex);
      altar.flagMats[f].emissiveIntensity = 0.42;
    }
  }

  function getCompletedAltarCount() {
    let c = 0;
    for (let i = 0; i < altars.length; i++) {
      if (altars[i].status === 'completed') c++;
    }
    return c;
  }

  // Active Weather Trial State & Hazard Pools
  let activeTrial = null;
  const trialHazardGroup = new THREE.Group();
  root.add(trialHazardGroup);

  const activeAvalancheRolls = [];
  const activeLightningStrikes = [];

  const snowBoulderGeo = trackGeo(new THREE.DodecahedronGeometry(1.15, 1));
  const snowBoulderMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2f1ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      flatShading: true,
    })
  );
  const avalancheTelegraphGeo = trackGeo(new THREE.PlaneGeometry(2.4, 16.0));
  avalancheTelegraphGeo.translate(0, 8.0, 0);
  avalancheTelegraphGeo.rotateX(-Math.PI / 2);

  const lightningRingGeo = trackGeo(new THREE.RingGeometry(1.75, 2.0, 24));
  lightningRingGeo.rotateX(-Math.PI / 2);
  const lightningFillGeo = trackGeo(new THREE.CircleGeometry(1.9, 24));
  lightningFillGeo.rotateX(-Math.PI / 2);
  const lightningBeamGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.35, 14, 6));
  lightningBeamGeo.translate(0, 7, 0);

  function clearTrialHazards() {
    for (const av of activeAvalancheRolls) {
      trialHazardGroup.remove(av.group);
      av.lineMat.dispose();
    }
    activeAvalancheRolls.length = 0;

    for (const ls of activeLightningStrikes) {
      trialHazardGroup.remove(ls.group);
      ls.ringMat.dispose();
      ls.fillMat.dispose();
      ls.beamMat.dispose();
    }
    activeLightningStrikes.length = 0;
  }

  function spawnAvalancheHazard(cx, cz) {
    // Roll from north-uphill to south-downhill across (cx, cz)
    const offsetX = (Math.random() - 0.5) * 7.0;
    const startX = cx + offsetX;
    const startZ = cz - 8.0;
    const startY = mangyulHeightFn(startX, startZ);

    const grp = new THREE.Group();
    grp.position.set(startX - ORIGIN_X, startY + 0.05, startZ - ORIGIN_Z);

    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const lineMesh = new THREE.Mesh(avalancheTelegraphGeo, lineMat);
    // Point +Z (southward downhill)
    lineMesh.rotation.y = Math.PI;
    grp.add(lineMesh);

    const boulderMesh = new THREE.Mesh(snowBoulderGeo, snowBoulderMat);
    boulderMesh.position.set(0, 1.1, 0);
    grp.add(boulderMesh);

    trialHazardGroup.add(grp);
    activeAvalancheRolls.push({
      group: grp,
      boulderMesh,
      lineMesh,
      lineMat,
      startX,
      startZ,
      x: startX,
      z: startZ,
      windup: 0.75,
      progress: 0,
      dist: 16.0,
      duration: 1.15,
      radius: 1.35,
      damage: 18,
      hasHit: false,
    });
  }

  function spawnLightningStrikeHazard(tx, tz) {
    const ty = mangyulHeightFn(tx, tz);
    const grp = new THREE.Group();
    grp.position.set(tx - ORIGIN_X, ty + 0.05, tz - ORIGIN_Z);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xe9d5ff,
      transparent: true,
      opacity: 0.95,
    });

    const ringMesh = new THREE.Mesh(lightningRingGeo, ringMat);
    const fillMesh = new THREE.Mesh(lightningFillGeo, fillMat);
    fillMesh.scale.setScalar(0.05);
    const beamMesh = new THREE.Mesh(lightningBeamGeo, beamMat);
    beamMesh.visible = false;

    grp.add(ringMesh, fillMesh, beamMesh);
    trialHazardGroup.add(grp);

    activeLightningStrikes.push({
      group: grp,
      ringMat,
      fillMat,
      beamMat,
      fillMesh,
      beamMesh,
      x: tx,
      y: ty,
      z: tz,
      fuse: 0.85,
      maxFuse: 0.85,
      flashTimer: 0,
      radius: 1.9,
      damage: 14,
      erupted: false,
    });
  }

  function showToast(msg) {
    if (!msg) return;
    if (ctx.hud?.toast) ctx.hud.toast(msg);
    else if (ctx.toast?.show) ctx.toast.show(msg);
    else bus?.emit?.('toast', { text: msg });
  }

  function startAltarTrial(altarOrType) {
    let altar = null;
    let type = 'hail';
    if (typeof altarOrType === 'string') {
      type = altarOrType;
      altar =
        altars.find((a) => a.type === type && a.status !== 'completed') ||
        altars.find((a) => a.type === type) ||
        altars[0];
    } else if (altarOrType && typeof altarOrType === 'object') {
      altar = altarOrType;
      type = altar.type;
    }
    if (!altar) return false;

    clearTrialHazards();
    if (altar.status !== 'completed') {
      altar.status = 'active';
    }

    const pPos = state.player?.position || { x: altar.wx, z: altar.wz };
    const center =
      typeof altarOrType === 'string'
        ? { x: pPos.x, z: pPos.z }
        : { x: altar.wx, z: altar.wz };

    activeTrial = {
      altarIndex: altar.index,
      altar,
      type,
      center,
      duration: 30.0,
      timer: 30.0,
      stepTimer: 0.4,
      spawnedIds: [],
    };

    // Spawn trial enemies for 'fog' (6 hailGhosts) or 'lightning' (3 snowSprites)
    if (type === 'fog' && ctx.enemies?.spawn) {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const sx = center.x + Math.cos(ang) * 5.5;
        const sz = center.z + Math.sin(ang) * 5.5;
        const id = ctx.enemies.spawn('hailGhost', {
          x: sx,
          z: sz,
          tags: ['hailGhost', 'tenmaTrialFog'],
        });
        if (id) activeTrial.spawnedIds.push(id);
      }
    } else if (type === 'lightning' && ctx.enemies?.spawn) {
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2;
        const sx = center.x + Math.cos(ang) * 6.0;
        const sz = center.z + Math.sin(ang) * 6.0;
        const id = ctx.enemies.spawn('snowSprite', {
          x: sx,
          z: sz,
          tags: ['snowSprite', 'tenmaTrialLightning'],
        });
        if (id) activeTrial.spawnedIds.push(id);
      }
    }

    const toastKey = `toast.tenmaTrialStart.${type}`;
    showToast(i18n?.t ? i18n.t(toastKey) : `Tenma Trial: ${type}`);
    bus.emit('tenma:trialStart', { altarIndex: altar.index, type });
    return true;
  }

  function finishCurrentTrial(placeOathImmediately = false) {
    if (!activeTrial) return false;
    const altar = activeTrial.altar;
    clearTrialHazards();
    if (altar && altar.status !== 'completed') {
      altar.status = 'passed';
    }
    const finishedIndex = activeTrial.altarIndex;
    const finishedType = activeTrial.type;
    activeTrial = null;

    showToast(
      i18n?.t
        ? i18n.t('toast.tenmaTrialPassed')
        : 'Trial passed! Interact with the Tenma Altar to place the Oath Stone'
    );
    bus.emit('tenma:trialPass', { altarIndex: finishedIndex, type: finishedType });

    if (placeOathImmediately && altar) {
      placeOathStoneOnAltar(altar);
    }
    return true;
  }

  function placeOathStoneOnAltar(altar) {
    if (!altar || altar.status === 'completed') return false;
    applyAltarCompletedVisuals(altar);
    const flagKey = `tenma.altar.${altar.index}`;
    if (ctx.quests?.setFlag) {
      ctx.quests.setFlag(flagKey, true);
    } else if (state.flags) {
      state.flags[flagKey] = true;
    }

    const completedCount = getCompletedAltarCount();
    const msg = (i18n?.t ? i18n.t('toast.tenmaOathPlaced') : 'Oath Stone placed! ({n}/12)').replace(
      '{n}',
      String(completedCount)
    );
    showToast(msg);
    bus.emit('sfx', { name: 'chime' });
    bus.emit('tenma:oath', {
      altarIndex: altar.index,
      completedCount,
      increment: 1,
    });

    if (completedCount >= 12) {
      showToast(
        i18n?.t
          ? i18n.t('toast.tenmaAllComplete')
          : 'All 12 Tenma Altars are illuminated! Ascend to the Pass Latse!'
      );
    }
    return true;
  }

  // Fainting during an active trial resets ONLY the active trial; completed altars stay completed
  const onPlayerFaint = () => {
    if (!activeTrial) return;
    const altar = activeTrial.altar;
    if (altar && altar.status !== 'completed') {
      altar.status = 'unstarted';
    }
    clearTrialHazards();
    activeTrial = null;
    showToast(
      i18n?.t
        ? i18n.t('toast.tenmaTrialReset')
        : 'Active altar trial reset (completed altars remain intact)'
    );
  };
  const offVitalsFaint = bus.on('vitals:faint', onPlayerFaint);
  const offPlayerFaint = bus.on('player:faint', onPlayerFaint);

  // Sync already-completed altars when quest `ch2.tenma` starts
  const offQuestStart = bus.on('quest:start', (payload) => {
    if (payload?.id === 'ch2.tenma') {
      const done = getCompletedAltarCount();
      if (done > 0) {
        bus.emit('tenma:oath', {
          altarIndex: -1,
          completedCount: done,
          increment: done,
        });
      }
    }
  });

  // ==========================================================================
  // 7. Pooled Snow Particle System (1 Points draw call, zero per-frame allocs)
  // ==========================================================================
  const SNOW_COUNT = 320;
  const snowPositions = new Float32Array(SNOW_COUNT * 3);
  const snowVelocities = new Float32Array(SNOW_COUNT * 3);
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowPositions[i * 3] = (Math.random() - 0.5) * 70;
    snowPositions[i * 3 + 1] = Math.random() * 22;
    snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 70;
    snowVelocities[i * 3] = -2.2 - Math.random() * 2.0; // Wind blowing across pass
    snowVelocities[i * 3 + 1] = -3.2 - Math.random() * 2.2;
    snowVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
  }
  const snowGeo = trackGeo(new THREE.BufferGeometry());
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snowMat = trackMat(
    new THREE.PointsMaterial({
      color: 0xf0f9ff,
      size: 0.24,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    })
  );
  const snowPoints = new THREE.Points(snowGeo, snowMat);
  root.add(snowPoints);

  // ==========================================================================
  // 8. Interactive E-Key Handling (12 Tenma Altars + Pass Prayer Flags)
  // ==========================================================================
  let bossAutoSpawned = false;

  function findNearestInteractable(pPos) {
    if (!pPos) return null;

    // 1. Check Pass Prayer Flags at (3000, -63)
    const dPassFlags = Math.hypot(pPos.x - ORIGIN_X, pPos.z - (ORIGIN_Z - 63));
    if (dPassFlags <= 3.8 && !hungPassFlagsGroup.visible) {
      return { kind: 'passPrayerFlags', dist: dPassFlags };
    }

    // 2. Check 12 Tenma Altars
    let bestAltar = null;
    let bestDist = 3.8;
    for (let i = 0; i < altars.length; i++) {
      const a = altars[i];
      const d = Math.hypot(pPos.x - a.wx, pPos.z - a.wz);
      if (d <= bestDist) {
        bestDist = d;
        bestAltar = a;
      }
    }
    if (bestAltar) {
      return { kind: 'tenmaAltar', altar: bestAltar, dist: bestDist };
    }
    return null;
  }

  function handleInteract() {
    if (state.zone !== 'mangyul') return false;
    const pPos = state.player?.position;
    const target = findNearestInteractable(pPos);
    if (!target) return false;

    if (target.kind === 'passPrayerFlags') {
      hungPassFlagsGroup.visible = true;
      if (state.flags) state.flags['ch2.passFlagsHung'] = true;
      showToast(
        i18n?.t
          ? i18n.t('toast.passFlagsHung')
          : 'Five-colored windhorse flags hung atop Mangyul Pass!'
      );
      bus.emit('sfx', { name: 'chime' });
      bus.emit('quest:interact', { target: 'passPrayerFlags', count: 1 });
      return true;
    }

    if (target.kind === 'tenmaAltar') {
      const a = target.altar;
      if (a.status === 'unstarted') {
        startAltarTrial(a);
        return true;
      }
      if (a.status === 'passed') {
        placeOathStoneOnAltar(a);
        return true;
      }
      if (a.status === 'active') {
        return true;
      }
    }
    return false;
  }

  // Register 12 Tenma Altars and Pass Prayer Flags into ctx.interactables for F/E key + HUD prompt
  if (Array.isArray(ctx.interactables)) {
    for (let i = 0; i < altars.length; i++) {
      const a = altars[i];
      const posVec = new THREE.Vector3(a.wx, a.wy, a.wz);
      ctx.interactables.push({
        id: `mangyul-tenma-altar-${a.index}`,
        kind: 'tenmaAltar',
        zone: 'mangyul',
        action: 'interact',
        labelKey: 'prompt.tenmaOathStone',
        radius: 3.6,
        getPosition: () => posVec,
        isAvailable: () =>
          (ctx.state.zone || 'stupa') === 'mangyul' &&
          !ctx.state.uiOpen &&
          (a.status === 'unstarted' || a.status === 'passed'),
        onInteract: () => {
          if (a.status === 'unstarted') startAltarTrial(a);
          else if (a.status === 'passed') placeOathStoneOnAltar(a);
        },
      });
    }

    const passFlagsVec = new THREE.Vector3(ORIGIN_X, passY, ORIGIN_Z - 63);
    ctx.interactables.push({
      id: 'mangyul-pass-prayer-flags',
      kind: 'passPrayerFlags',
      zone: 'mangyul',
      action: 'interact',
      labelKey: 'prompt.passPrayerFlags',
      radius: 3.8,
      getPosition: () => passFlagsVec,
      isAvailable: () =>
        (ctx.state.zone || 'stupa') === 'mangyul' &&
        !ctx.state.uiOpen &&
        !hungPassFlagsGroup.visible,
      onInteract: () => {
        hungPassFlagsGroup.visible = true;
        if (state.flags) state.flags['ch2.passFlagsHung'] = true;
        showToast(
          i18n?.t
            ? i18n.t('toast.passFlagsHung')
            : 'Five-colored windhorse flags hung atop Mangyul Pass!'
        );
        bus.emit('sfx', { name: 'chime' });
        bus.emit('quest:interact', { target: 'passPrayerFlags', count: 1 });
      },
    });
  }

  const onKeyDown = (ev) => {
    if (ev.code === 'KeyE' && state.zone === 'mangyul' && !ctx.dialogue?.isOpen?.()) {
      handleInteract();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
  }

  // ==========================================================================
  // 9. Debug & Public Tenma API (`window.__stupa.tenma` & `ctx.tenma`)
  // ==========================================================================
  const tenmaApi = {
    complete(n = 12) {
      const targetCount = Math.max(0, Math.min(12, Math.floor(Number(n) || 12)));
      let newlyCompleted = 0;
      for (let i = 0; i < altars.length; i++) {
        if (getCompletedAltarCount() >= targetCount) break;
        const a = altars[i];
        if (a.status !== 'completed') {
          applyAltarCompletedVisuals(a);
          const flagKey = `tenma.altar.${a.index}`;
          if (ctx.quests?.setFlag) ctx.quests.setFlag(flagKey, true);
          else if (state.flags) state.flags[flagKey] = true;
          newlyCompleted++;
        }
      }
      clearTrialHazards();
      activeTrial = null;
      const totalDone = getCompletedAltarCount();
      // Always emit at least targetCount if quest is waiting on tenma:oath
      const emitIncrement = newlyCompleted > 0 ? newlyCompleted : targetCount;
      if (emitIncrement > 0) {
        bus.emit('tenma:oath', {
          altarIndex: targetCount - 1,
          completedCount: totalDone,
          increment: emitIncrement,
        });
      }
      return { completedCount: totalDone, newlyCompleted };
    },
    trial(type = 'hail') {
      const validTypes = ['hail', 'avalanche', 'fog', 'lightning'];
      const chosen = validTypes.includes(type) ? type : 'hail';
      return startAltarTrial(chosen);
    },
    finishActiveTrial(placeOath = false) {
      return finishCurrentTrial(placeOath);
    },
    placeOathStone(altarIndex) {
      const a =
        typeof altarIndex === 'number'
          ? altars[altarIndex]
          : altars.find((al) => al.status === 'passed') || altars.find((al) => al.status !== 'completed');
      return placeOathStoneOnAltar(a);
    },
    hangPassFlags() {
      hungPassFlagsGroup.visible = true;
      if (state.flags) state.flags['ch2.passFlagsHung'] = true;
      bus.emit('quest:interact', { target: 'passPrayerFlags', count: 1 });
      return true;
    },
    getState() {
      return {
        completedCount: getCompletedAltarCount(),
        activeTrial: activeTrial
          ? {
              altarIndex: activeTrial.altarIndex,
              type: activeTrial.type,
              remaining: Number(activeTrial.timer.toFixed(2)),
              duration: activeTrial.duration,
            }
          : null,
        altars: altars.map((a) => ({
          index: a.index,
          type: a.type,
          status: a.status,
          x: a.wx,
          z: a.wz,
        })),
      };
    },
  };

  ctx.tenma = tenmaApi;
  ctx.debug?.register?.('tenma', tenmaApi);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.tenma = tenmaApi;
  }

  // ==========================================================================
  // 10. Per-Frame Update (Weather Gradient, Flags, Campfire, Tenma Trials)
  // ==========================================================================
  const savedFogNear = scene.fog?.near ?? 35;
  const savedFogFar = scene.fog?.far ?? 135;

  function update(dt, elapsed = state.elapsed || 0) {
    const pPos = state.player?.position || { x: ORIGIN_X, y: 0, z: 75 };
    const plx = pPos.x - ORIGIN_X;
    const plz = pPos.z - ORIGIN_Z;

    // Northward weather intensity (0 in south conifer valley -> 1 at northern pass)
    const northFactor = smoothstep(65, -60, plz);
    const isFogTrial = activeTrial?.type === 'fog';

    // 1. Dynamic Fog tightening as player climbs north or during 'fog' trial
    if (scene.fog) {
      const targetNear = isFogTrial ? 6 : 32 - northFactor * 16;
      const targetFar = isFogTrial ? 24 : 130 - northFactor * 55;
      scene.fog.near += (targetNear - scene.fog.near) * Math.min(1, dt * 3);
      scene.fog.far += (targetFar - scene.fog.far) * Math.min(1, dt * 3);
    }

    // 2. Pooled Snow Particles (centered around player, intensifies northward)
    const windSpeedMult = 0.65 + northFactor * 1.65;
    snowMat.opacity = 0.28 + northFactor * 0.62;
    snowMat.size = 0.18 + northFactor * 0.14;
    const sAttr = snowGeo.attributes.position;
    for (let i = 0; i < SNOW_COUNT; i++) {
      let sx = sAttr.getX(i) + snowVelocities[i * 3] * windSpeedMult * dt;
      let sy = sAttr.getY(i) + snowVelocities[i * 3 + 1] * windSpeedMult * dt;
      let sz = sAttr.getZ(i) + snowVelocities[i * 3 + 2] * windSpeedMult * dt;

      // Wrap relative to player local coordinates
      if (sy < pPos.y - 2) {
        sy = pPos.y + 16 + Math.random() * 6;
        sx = plx + (Math.random() - 0.5) * 56;
        sz = plz + (Math.random() - 0.5) * 56;
      }
      if (sx < plx - 30) sx += 60;
      else if (sx > plx + 30) sx -= 60;
      if (sz < plz - 30) sz += 60;
      else if (sz > plz + 30) sz -= 60;

      sAttr.setXYZ(i, sx, sy, sz);
    }
    sAttr.needsUpdate = true;

    // 3. Prayer Flag Wind Flutter (stronger at high pass)
    const flutterSpeed = 4.5 + northFactor * 9.5;
    const flutterAmp = 0.14 + northFactor * 0.32;
    for (let i = 0; i < animatedFlags.length; i++) {
      const af = animatedFlags[i];
      af.mesh.rotation.y = Math.sin(elapsed * flutterSpeed + af.phase) * flutterAmp;
      af.mesh.rotation.z =
        af.baseRotZ + Math.cos(elapsed * (flutterSpeed * 0.8) + af.phase) * (flutterAmp * 0.5);
    }

    // 4. Envoy Campfire Emissive Flicker
    const flicker = 0.9 + Math.sin(elapsed * 14) * 0.12 + Math.cos(elapsed * 23) * 0.08;
    flameOuter.scale.set(1, flicker, 1);
    flameInner.scale.set(1, 1.05 + (1 - flicker), 1);
    fireGlowDiscMat.opacity = 0.22 + (flicker - 0.85) * 0.35;

    // 5. Altar Oath Stone rotation & UI interaction prompt
    for (let i = 0; i < altars.length; i++) {
      const a = altars[i];
      if (a.oathStoneMesh.visible) {
        a.oathStoneMesh.rotation.y += dt * 1.8;
        a.oathStoneMesh.position.y = 1.18 + Math.sin(elapsed * 3 + i) * 0.05;
      }
    }

    const nearInteract = findNearestInteractable(pPos);
    if (nearInteract) {
      if (nearInteract.kind === 'passPrayerFlags') {
        const label = i18n?.t ? i18n.t('prompt.passPrayerFlags') : 'Press E to hang prayer flags';
        bus.emit('ui:prompt', { text: label, key: 'E', source: 'mangyul' });
      } else if (nearInteract.kind === 'tenmaAltar') {
        const a = nearInteract.altar;
        const typeLabel = i18n?.t ? i18n.t(`tenma.type.${a.type}`) : a.type;
        let label = '';
        if (a.status === 'unstarted') {
          label = (i18n?.t ? i18n.t('prompt.tenmaAltar') : 'Press E: Tenma Trial ({type})').replace(
            '{type}',
            typeLabel
          );
        } else if (a.status === 'passed') {
          label = i18n?.t ? i18n.t('prompt.tenmaOathStone') : 'Press E to place Oath Stone';
        }
        if (label) {
          bus.emit('ui:prompt', { text: label, key: 'E', source: 'mangyul' });
        }
      }
    }

    // 6. Update Active Tenma Weather Trial
    if (activeTrial) {
      activeTrial.timer -= dt;
      activeTrial.stepTimer -= dt;

      if (activeTrial.type === 'hail') {
        if (activeTrial.stepTimer <= 0) {
          activeTrial.stepTimer = 0.95;
          // Drop 2 targeted hail circles near player
          for (let h = 0; h < 2; h++) {
            const ang = Math.random() * Math.PI * 2;
            const r = h === 0 ? Math.random() * 1.2 : 1.8 + Math.random() * 3.2;
            const hx = pPos.x + Math.cos(ang) * r;
            const hz = pPos.z + Math.sin(ang) * r;
            const hy = mangyulHeightFn(hx, hz);
            ctx.projectiles?.spawn?.('frostRoar', {
              targetPos: { x: hx, y: hy, z: hz },
              damage: 11,
              aoeRadius: 1.85,
              eruptDelay: 0.85,
              slow: { mult: 0.65, duration: 1.4 },
              magic: true,
            });
          }
        }
      } else if (activeTrial.type === 'avalanche') {
        if (activeTrial.stepTimer <= 0) {
          activeTrial.stepTimer = 1.65;
          spawnAvalancheHazard(pPos.x, pPos.z);
        }
      } else if (activeTrial.type === 'fog') {
        // Check if all 6 spawned hailGhosts have been liberated
        if (activeTrial.spawnedIds.length > 0 && ctx.enemies?.getActiveEnemies) {
          const activeList = ctx.enemies.getActiveEnemies();
          const remaining = activeList.filter(
            (e) =>
              e.state !== 'liberated' &&
              e.hp > 0 &&
              (activeTrial.spawnedIds.includes(e.id) || e.tags?.includes('tenmaTrialFog'))
          );
          if (remaining.length === 0) {
            activeTrial.timer = 0;
          }
        }
      } else if (activeTrial.type === 'lightning') {
        if (activeTrial.stepTimer <= 0) {
          activeTrial.stepTimer = 1.75;
          for (let l = 0; l < 2; l++) {
            const ang = Math.random() * Math.PI * 2;
            const r = l === 0 ? Math.random() * 1.4 : 2.2 + Math.random() * 3.0;
            spawnLightningStrikeHazard(pPos.x + Math.cos(ang) * r, pPos.z + Math.sin(ang) * r);
          }
        }
      }

      if (activeTrial && activeTrial.timer <= 0) {
        finishCurrentTrial(false);
      }
    }

    // 6b. Update Avalanche Rolling Boulders
    for (let i = activeAvalancheRolls.length - 1; i >= 0; i--) {
      const av = activeAvalancheRolls[i];
      if (av.windup > 0) {
        av.windup -= dt;
        av.lineMat.opacity = 0.35 + Math.sin(elapsed * 18) * 0.2;
      } else {
        av.lineMesh.visible = false;
        av.progress += dt / av.duration;
        const u = Math.min(1, av.progress);
        av.z = av.startZ + u * av.dist;
        const wy = mangyulHeightFn(av.x, av.z);
        av.group.position.set(av.x - ORIGIN_X, wy + 0.05, av.z - ORIGIN_Z);
        av.boulderMesh.rotation.x += dt * 10;

        if (!av.hasHit && Math.hypot(pPos.x - av.x, pPos.z - av.z) <= av.radius + 0.4) {
          av.hasHit = true;
          bus.emit('vitals:damage', {
            amount: av.damage,
            type: 'physical',
            sourcePos: { x: av.x, y: wy, z: av.z },
          });
        }
        if (u >= 1) {
          trialHazardGroup.remove(av.group);
          av.lineMat.dispose();
          activeAvalancheRolls.splice(i, 1);
        }
      }
    }

    // 6c. Update Lightning Strike Hazards
    for (let i = activeLightningStrikes.length - 1; i >= 0; i--) {
      const ls = activeLightningStrikes[i];
      if (!ls.erupted) {
        ls.fuse -= dt;
        const u = Math.min(1, 1 - Math.max(0, ls.fuse) / ls.maxFuse);
        ls.fillMesh.scale.setScalar(Math.max(0.05, u));
        if (ls.fuse <= 0) {
          ls.erupted = true;
          ls.flashTimer = 0.22;
          ls.beamMesh.visible = true;
          bus.emit('sfx', { name: 'thunder' });
          if (Math.hypot(pPos.x - ls.x, pPos.z - ls.z) <= ls.radius) {
            bus.emit('vitals:damage', {
              amount: ls.damage,
              type: 'magic',
              sourcePos: { x: ls.x, y: ls.y, z: ls.z },
            });
          }
        }
      } else {
        ls.flashTimer -= dt;
        ls.beamMat.opacity = Math.max(0, ls.flashTimer / 0.22);
        if (ls.flashTimer <= 0) {
          trialHazardGroup.remove(ls.group);
          ls.ringMat.dispose();
          ls.fillMat.dispose();
          ls.beamMat.dispose();
          activeLightningStrikes.splice(i, 1);
        }
      }
    }

    // 7. Auto-spawn Boss `tenmaStorm` when player reaches the Pass Latse arena (3000, -65, r=18)
    // once 12 altars are done or quest ch2.storm is active
    const dArena = Math.hypot(pPos.x - ORIGIN_X, pPos.z - (ORIGIN_Z - 65));
    if (
      !bossAutoSpawned &&
      dArena <= 17.5 &&
      !ctx.quests?.getFlag?.('boss.tenmaStorm') &&
      !ctx.bosses?.getActive?.() &&
      (getCompletedAltarCount() >= 12 ||
        ctx.quests?.getFlag?.('ch2.tenma.done') ||
        ctx.quests?.isActive?.('ch2.storm'))
    ) {
      bossAutoSpawned = true;
      ctx.bosses?.spawn?.('tenmaStorm');
    }
  }

  function dispose() {
    clearTrialHazards();
    offVitalsFaint?.();
    offPlayerFaint?.();
    offQuestStart?.();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKeyDown);
    }
    if (scene.fog) {
      scene.fog.near = savedFogNear;
      scene.fog.far = savedFogFar;
    }
    base.dispose();
    for (const g of geometries) g.dispose?.();
    for (const m of materials) m.dispose?.();
  }

  return {
    id: 'mangyul',
    group: zoneGroup,
    getHeight: mangyulHeightFn,
    update,
    dispose,
    tenma: tenmaApi,
  };
}

export const createMap = createMangyulMap;
export default createMangyulMap;
