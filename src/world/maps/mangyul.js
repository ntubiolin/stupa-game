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

// Elemental accent colors for the 4 Tenma trial types
const TENMA_ELEMENT_COLORS = {
  hail: { color: 0x38bdf8, emissive: 0x0284c7 },
  avalanche: { color: 0x93c5fd, emissive: 0x2563eb },
  fog: { color: 0x5eead4, emissive: 0x0d9488 },
  lightning: { color: 0xc084fc, emissive: 0x9333ea },
};

/**
 * Procedural tileable alpine snow-and-slate micro-relief texture (`CanvasTexture`).
 * Returns `null` in headless Node environments where `document` is unavailable.
 */
function createMangyulTerrainTexture() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c2d = canvas.getContext?.('2d');
  if (!c2d) return null;

  c2d.fillStyle = '#dde5ed';
  c2d.fillRect(0, 0, 128, 128);

  // Deterministic LCG for crisp slate fractures & frost grain
  let seed = 21401;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  // Subtle wind-swept snow ripples & slate strata lines
  for (let i = 0; i < 42; i++) {
    const y = Math.floor(rand() * 128);
    const w = 18 + Math.floor(rand() * 48);
    const x = Math.floor(rand() * 128);
    c2d.fillStyle = rand() > 0.45 ? 'rgba(255,255,255,0.22)' : 'rgba(100,116,139,0.18)';
    c2d.fillRect(x, y, w, 2);
    if (x + w > 128) c2d.fillRect(0, y, (x + w) - 128, 2);
  }

  // Fine mineral & ice crystal speckles
  for (let i = 0; i < 1100; i++) {
    const x = Math.floor(rand() * 128);
    const y = Math.floor(rand() * 128);
    const v = 185 + Math.floor(rand() * 68);
    c2d.fillStyle = `rgb(${v},${v + 2},${Math.min(255, v + 6)})`;
    c2d.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  return tex;
}

/**
 * Procedural Twelve Tenma wind-mandala floor emblem for the Pass Latse Boss Arena.
 * Returns `null` in headless Node environments where `document` is unavailable.
 */
function createTenmaArenaMandalaTexture() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c2d = canvas.getContext?.('2d');
  if (!c2d) return null;

  const cx = 128;
  const cy = 128;
  c2d.clearRect(0, 0, 256, 256);

  // Soft icy radial aura
  const grad = c2d.createRadialGradient(cx, cy, 12, cx, cy, 122);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.42)');
  grad.addColorStop(0.55, 'rgba(30, 58, 138, 0.28)');
  grad.addColorStop(0.88, 'rgba(125, 211, 252, 0.36)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
  c2d.fillStyle = grad;
  c2d.beginPath();
  c2d.arc(cx, cy, 122, 0, Math.PI * 2);
  c2d.fill();

  // Concentric sacred geometry rings
  c2d.strokeStyle = 'rgba(186, 230, 253, 0.85)';
  for (const [r, lw] of [
    [116, 3.0],
    [104, 1.5],
    [82, 2.2],
    [54, 1.8],
    [26, 2.2],
  ]) {
    c2d.lineWidth = lw;
    c2d.beginPath();
    c2d.arc(cx, cy, r, 0, Math.PI * 2);
    c2d.stroke();
  }

  // 12 Tenma directional spokes & lotus petals
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);

    c2d.strokeStyle = i % 3 === 0 ? 'rgba(250, 204, 21, 0.85)' : 'rgba(125, 211, 252, 0.72)';
    c2d.lineWidth = i % 3 === 0 ? 2.4 : 1.4;
    c2d.beginPath();
    c2d.moveTo(cx + cos * 26, cy + sin * 26);
    c2d.lineTo(cx + cos * 116, cy + sin * 116);
    c2d.stroke();

    // Outer 12 Tenma rune diamonds
    const rx = cx + cos * 93;
    const ry = cy + sin * 93;
    c2d.fillStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.88)' : 'rgba(250, 204, 21, 0.82)';
    c2d.beginPath();
    c2d.arc(rx, ry, 4.5, 0, Math.PI * 2);
    c2d.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Procedural soft radial gradient texture (`CanvasTexture`) for the Kyirong Gorge
 * Cloud-Inversion Sea of Mist and *Firewatch* alpenglow horizon mist.
 * Returns `null` in headless Node environments where `document` is unavailable.
 */
function createCloudInversionTexture() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c2d = canvas.getContext?.('2d');
  if (!c2d) return null;

  c2d.clearRect(0, 0, 256, 256);
  const grad = c2d.createRadialGradient(128, 128, 10, 128, 128, 124);
  grad.addColorStop(0.0, 'rgba(255, 244, 232, 0.88)');
  grad.addColorStop(0.38, 'rgba(254, 226, 210, 0.62)');
  grad.addColorStop(0.72, 'rgba(224, 236, 255, 0.26)');
  grad.addColorStop(1.0, 'rgba(224, 236, 255, 0.0)');
  c2d.fillStyle = grad;
  c2d.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

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

export function createMangyulMap(ctx, { presentationOnly = false } = {}) {
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
  const textures = [];
  const instancedMeshes = [];
  const trackGeo = (g) => {
    geometries.push(g);
    return g;
  };
  const trackMat = (m) => {
    materials.push(m);
    return m;
  };
  const trackTex = (t) => {
    if (t) textures.push(t);
    return t;
  };
  const trackInst = (im) => {
    if (im) instancedMeshes.push(im);
    return im;
  };

  // Helper for switchback trail center X at local Z
  function getTrailCenterX(lz) {
    if (lz > 40) return smoothstep(85, 45, lz) * 8;
    if (lz > -45) return Math.sin(lz * 0.14) * 14;
    return 0;
  }

  // ==========================================================================
  // 1. Terrain Mesh with South-to-North Biome Vertex Colors & Bump Relief
  // ==========================================================================
  const terrainSize = 240;
  const terrainSegs = 96;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const colorArr = new Float32Array(posAttr.count * 3);
  const cForest = new THREE.Color(0x416e4e);     // Sun-warmed Kyirong conifer valley moss
  const cStreamBank = new THREE.Color(0x527364); // Warm pebble & sunlit moss bank
  const cTrail = new THREE.Color(0x948272);      // Golden-ochre switchback stone path
  const cSlate = new THREE.Color(0x6e7b8b);      // Twilight-lit mountain slate rock
  const cSnow = new THREE.Color(0xf6f8fc);       // Crisp high alpine snow
  const cGlacier = new THREE.Color(0xa5e1fa);    // Luminous east/west glacier ice
  const cAlpenglow = new THREE.Color(0xff9e6d);  // Firewatch coral-amber alpenglow kiss on high crests
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

    // Warm Firewatch alpenglow kiss across upper snow pass & western/southern sunlit ridges
    const alpenglowFactor =
      smoothstep(18, -55, lz) * (0.22 + 0.16 * smoothstep(-32, 32, -lx));
    if (alpenglowFactor > 0.01) {
      tmpColor.lerp(cAlpenglow, alpenglowFactor);
    }

    // Damp river pebble tint along the Kyirong stream bed
    if (lz > 58 && lz < 75) {
      const streamZ = 67 + Math.sin(lx * 0.08) * 2.5;
      const ds = Math.abs(lz - streamZ);
      if (ds < 5.0) {
        tmpColor.lerp(cStreamBank, (1 - ds / 5.0) * 0.55);
      }
    }

    // Switchback trail ribbon: x oscillates with sin(lz) between lz = 45 and lz = -55
    const trailCenterX = getTrailCenterX(lz);
    const distToTrail = Math.abs(lx - trailCenterX);
    if (distToTrail < 3.4 && lz > -65 && lz < 88) {
      const trailMix = (1 - distToTrail / 3.4) * 0.65;
      tmpColor.lerp(cTrail, trailMix);
    }

    // Glacier tint on northern and upper valley flanks
    if (lz < 5 && Math.abs(lx) > 22) {
      const gMix = smoothstep(22, 42, Math.abs(lx)) * smoothstep(5, -45, lz);
      tmpColor.lerp(cGlacier, gMix * 0.72);
    }

    colorArr[i * 3] = tmpColor.r;
    colorArr[i * 3 + 1] = tmpColor.g;
    colorArr[i * 3 + 2] = tmpColor.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
  terrainGeo.computeVertexNormals();

  const terrainDetailTex = trackTex(createMangyulTerrainTexture());
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: terrainDetailTex,
      bumpMap: terrainDetailTex,
      bumpScale: 0.07,
      emissive: new THREE.Color(0x2e231d),
      emissiveIntensity: 0.25,
      roughness: 0.84,
      metalness: 0.05,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // Shared 5-color Lungta prayer flag geometry, materials & animation registry
  const animatedFlags = [];
  const flagPlaneGeo = trackGeo(new THREE.PlaneGeometry(0.44, 0.34));
  const lungtaMats = LUNGTA_COLORS.map((hex) =>
    trackMat(
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.32,
        roughness: 0.58,
        side: THREE.DoubleSide,
      })
    )
  );

  // ==========================================================================
  // 2. Southern Kyirong Valley: Stream, Prayer-Flag Suspension Bridge,
  //    Cloud-Inversion Sea of Mist, Waypoint, Trail & Conifer Forest
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
      emissive: 0x0e7490,
      emissiveIntensity: 0.42,
      roughness: 0.18,
      metalness: 0.32,
      transparent: true,
      opacity: 0.85,
    })
  );
  const streamMesh = new THREE.Mesh(streamGeo, streamMat);
  root.add(streamMesh);

  // Whitewater foam ripples along the Kyirong stream bed (InstancedMesh, 0 colliders)
  const FOAM_COUNT = 28;
  const foamGeo = trackGeo(new THREE.RingGeometry(0.22, 0.56, 12));
  foamGeo.rotateX(-Math.PI / 2);
  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const foamInst = trackInst(new THREE.InstancedMesh(foamGeo, foamMat, FOAM_COUNT));
  const dummy = new THREE.Object3D();
  for (let i = 0; i < FOAM_COUNT; i++) {
    const fx = -40 + (i / (FOAM_COUNT - 1)) * 80;
    const fz = 67 + Math.sin(fx * 0.08) * 2.5 + Math.cos(i * 1.9) * 0.75;
    const fy = mangyulHeightFn(ORIGIN_X + fx, fz) + 0.14;
    dummy.position.set(fx, fy, fz);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(1.3 + (i % 3) * 0.35, 1, 0.7 + (i % 2) * 0.25);
    dummy.updateMatrix();
    foamInst.setMatrixAt(i, dummy.matrix);
  }
  foamInst.instanceMatrix.needsUpdate = true;
  root.add(foamInst);

  // Real-World Kyirong Gorge Prayer-Flag Suspension Bridge at (0, 67)
  // with stone towers, catenary suspension cables & fluttering 5-color Lungta flags
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7c4f2b,
      emissive: 0x261408,
      emissiveIntensity: 0.2,
      roughness: 0.82,
      flatShading: true,
    })
  );
  const bridgeStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      emissive: 0x1e293b,
      emissiveIntensity: 0.18,
      roughness: 0.86,
      flatShading: true,
    })
  );
  const bridgeRopeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc8a472,
      emissive: 0x3b2814,
      emissiveIntensity: 0.18,
      roughness: 0.88,
      flatShading: true,
    })
  );
  const brassCapMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0x92400e,
      emissiveIntensity: 0.36,
      roughness: 0.38,
      metalness: 0.48,
      flatShading: true,
    })
  );
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = 'KyirongSuspensionBridge';
  const bridgeY = mangyulHeightFn(ORIGIN_X, 67) + 0.28;
  bridgeGroup.position.set(0, bridgeY, 67);
  const deck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.8, 0.22, 6.2)), woodMat);
  bridgeGroup.add(deck);

  // Stone bridge abutments & twin suspension pylon towers at north & south banks
  const abutmentGeo = trackGeo(new THREE.BoxGeometry(4.3, 0.65, 0.85));
  const pylonPillarGeo = trackGeo(new THREE.BoxGeometry(0.46, 3.1, 0.46));
  const pylonCrossbeamGeo = trackGeo(new THREE.BoxGeometry(4.45, 0.28, 0.38));
  for (const az of [-3.05, 3.05]) {
    const abutment = new THREE.Mesh(abutmentGeo, bridgeStoneMat);
    abutment.position.set(0, -0.18, az);
    bridgeGroup.add(abutment);

    // Portal crossbeam & twin stone/timber suspension pylons
    const crossbeam = new THREE.Mesh(pylonCrossbeamGeo, woodMat);
    crossbeam.position.set(0, 2.86, az);
    bridgeGroup.add(crossbeam);
    for (const px of [-1.85, 1.85]) {
      const pylon = new THREE.Mesh(pylonPillarGeo, bridgeStoneMat);
      pylon.position.set(px, 1.45, az);
      const pylonCap = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(0.22, 0)),
        brassCapMat
      );
      pylonCap.position.set(px, 3.14, az);
      bridgeGroup.add(pylon, pylonCap);
    }
  }

  // Timber side curbs, twin rope handrails, overhead catenary suspension cables & Lungta flags
  const curbBeamGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.18, 6.2));
  const railRopeGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 5.3, 6));
  railRopeGeo.rotateX(Math.PI / 2);
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.14, 1.3, 6));
  const postCapGeo = trackGeo(new THREE.OctahedronGeometry(0.15, 0));
  const suspenderRopeGeo = trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5));

  for (const px of [-1.75, 1.75]) {
    const curbBeam = new THREE.Mesh(curbBeamGeo, woodMat);
    curbBeam.position.set(px, 0.16, 0);
    const upperRope = new THREE.Mesh(railRopeGeo, bridgeRopeMat);
    upperRope.position.set(px, 1.05, 0);
    const lowerRope = new THREE.Mesh(railRopeGeo, bridgeRopeMat);
    lowerRope.position.set(px, 0.65, 0);
    bridgeGroup.add(curbBeam, upperRope, lowerRope);
    for (const pz of [-2.6, 0, 2.6]) {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(px, 0.6, pz);
      const cap = new THREE.Mesh(postCapGeo, brassCapMat);
      cap.position.set(px, 1.32, pz);
      bridgeGroup.add(post, cap);
    }

    // Overhead sagging catenary suspension cable spanning between the north & south pylons
    const catenaryCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(px, 2.82, -3.05),
      new THREE.Vector3(px, 1.48, 0),
      new THREE.Vector3(px, 2.82, 3.05)
    );
    const catenaryGeo = trackGeo(new THREE.TubeGeometry(catenaryCurve, 16, 0.036, 6, false));
    const catenaryMesh = new THREE.Mesh(catenaryGeo, bridgeRopeMat);
    bridgeGroup.add(catenaryMesh);

    // Anchor backstay cables sloping into the north & south gorge banks
    for (const dirZ of [-1, 1]) {
      const backstayCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(px, 2.82, dirZ * 3.05),
        new THREE.Vector3(px * 1.08, 1.45, dirZ * 4.35),
        new THREE.Vector3(px * 1.15, 0.15, dirZ * 5.65)
      );
      const backstayGeo = trackGeo(new THREE.TubeGeometry(backstayCurve, 8, 0.028, 5, false));
      bridgeGroup.add(new THREE.Mesh(backstayGeo, bridgeRopeMat));
    }

    // Vertical suspender ropes & 10 fluttering 5-color Lungta prayer flags along each catenary cable
    for (let s = 1; s <= 9; s++) {
      const u = s / 10;
      const pt = catenaryCurve.getPoint(u);
      if (s % 2 === 1) {
        const suspH = Math.max(0.4, pt.y - 1.02);
        const susp = new THREE.Mesh(suspenderRopeGeo, bridgeRopeMat);
        susp.scale.set(1, suspH, 1);
        susp.position.set(px, 1.02 + suspH * 0.5, pt.z);
        bridgeGroup.add(susp);
      }
      const bFlag = new THREE.Mesh(flagPlaneGeo, lungtaMats[(s + (px > 0 ? 2 : 0)) % 5]);
      bFlag.position.set(pt.x, pt.y - 0.16, pt.z);
      bFlag.rotation.y = Math.PI / 2;
      bridgeGroup.add(bFlag);
      animatedFlags.push({
        mesh: bFlag,
        baseRotZ: 0,
        phase: s * 0.65 + (px > 0 ? 1.4 : 0),
      });
    }
  }
  root.add(bridgeGroup);

  // High Gorge-Spanning Prayer-Flag Catenary Lines across the Southern Kyirong Crossing (z ~ 46..70)
  const gorgeFlagSpans = [
    { x1: -15.5, y1: 6.2, z1: 69.5, x2: 15.5, y2: 6.4, z2: 65.0, sag: 1.55, flags: 12 },
    { x1: -17.0, y1: 7.4, z1: 61.5, x2: 16.5, y2: 7.1, z2: 63.5, sag: 1.75, flags: 12 },
    { x1: -18.5, y1: 8.6, z1: 53.0, x2: 18.0, y2: 8.2, z2: 55.5, sag: 1.85, flags: 14 },
    { x1: -19.5, y1: 9.8, z1: 45.5, x2: 19.5, y2: 9.5, z2: 47.0, sag: 1.95, flags: 14 },
  ];
  const gorgeSpanGroup = new THREE.Group();
  gorgeSpanGroup.name = 'KyirongGorgePrayerFlagCatenaries';
  root.add(gorgeSpanGroup);

  for (let sIdx = 0; sIdx < gorgeFlagSpans.length; sIdx++) {
    const sp = gorgeFlagSpans[sIdx];
    const pStart = new THREE.Vector3(
      sp.x1,
      mangyulHeightFn(ORIGIN_X + sp.x1, sp.z1) + sp.y1,
      sp.z1
    );
    const pEnd = new THREE.Vector3(
      sp.x2,
      mangyulHeightFn(ORIGIN_X + sp.x2, sp.z2) + sp.y2,
      sp.z2
    );
    const pMid = new THREE.Vector3(
      (pStart.x + pEnd.x) * 0.5,
      (pStart.y + pEnd.y) * 0.5 - sp.sag,
      (pStart.z + pEnd.z) * 0.5
    );
    const spanCurve = new THREE.QuadraticBezierCurve3(pStart, pMid, pEnd);
    const spanRopeGeo = trackGeo(new THREE.TubeGeometry(spanCurve, 18, 0.024, 5, false));
    gorgeSpanGroup.add(new THREE.Mesh(spanRopeGeo, bridgeRopeMat));

    const yaw = Math.atan2(pEnd.z - pStart.z, pEnd.x - pStart.x);
    for (let f = 1; f <= sp.flags; f++) {
      const u = f / (sp.flags + 1);
      const pt = spanCurve.getPoint(u);
      const fm = new THREE.Mesh(flagPlaneGeo, lungtaMats[(sIdx + f) % 5]);
      fm.position.set(pt.x, pt.y - 0.18, pt.z);
      fm.rotation.y = -yaw;
      gorgeSpanGroup.add(fm);
      animatedFlags.push({ mesh: fm, baseRotZ: 0, phase: sIdx * 1.3 + f * 0.55 });
    }
  }

  // Multi-Layered Cloud-Inversion Sea of Mist hovering in the Kyirong Canyon Transition Zone (z ~ 10..55)
  const cloudInversionTex = trackTex(createCloudInversionTexture());
  const cloudSeaGroup = new THREE.Group();
  cloudSeaGroup.name = 'KyirongCloudInversionSea';
  root.add(cloudSeaGroup);

  const cloudSeaLayers = [];
  const cloudPlaneGeo = trackGeo(new THREE.PlaneGeometry(1, 1));
  cloudPlaneGeo.rotateX(-Math.PI / 2);
  const cloudRingGeo = trackGeo(new THREE.RingGeometry(0.18, 0.52, 32));
  cloudRingGeo.rotateX(-Math.PI / 2);

  const cloudLayerDefs = [
    { x: 0, y: 2.35, z: 52, sx: 68, sz: 28, color: 0xffdfca, opacity: 0.30, speed: 0.32, isRing: false },
    { x: -6, y: 3.15, z: 42, sx: 74, sz: 32, color: 0xfde2e4, opacity: 0.28, speed: -0.26, isRing: false },
    { x: 5, y: 3.95, z: 32, sx: 78, sz: 34, color: 0xffe4c4, opacity: 0.28, speed: 0.24, isRing: true },
    { x: -4, y: 4.75, z: 24, sx: 82, sz: 34, color: 0xe0f2fe, opacity: 0.26, speed: -0.28, isRing: false },
    { x: 4, y: 5.55, z: 16, sx: 80, sz: 30, color: 0xffd8be, opacity: 0.25, speed: 0.22, isRing: true },
    { x: 0, y: 6.25, z: 11, sx: 72, sz: 26, color: 0xfce7f3, opacity: 0.22, speed: -0.20, isRing: false },
  ];
  for (let i = 0; i < cloudLayerDefs.length; i++) {
    const cd = cloudLayerDefs[i];
    const cMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: cd.color,
        map: cloudInversionTex,
        transparent: true,
        opacity: cd.opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    const cMesh = new THREE.Mesh(cd.isRing ? cloudRingGeo : cloudPlaneGeo, cMat);
    cMesh.position.set(cd.x, cd.y, cd.z);
    cMesh.scale.set(cd.sx, 1, cd.sz);
    cloudSeaGroup.add(cMesh);
    cloudSeaLayers.push({
      mesh: cMesh,
      mat: cMat,
      baseX: cd.x,
      baseY: cd.y,
      baseOpacity: cd.opacity,
      speed: cd.speed,
      phase: i * 1.15,
    });
  }

  // Weathered Flagstone Stepping Slabs & Switchback Retaining Curbs / Cairns (InstancedMesh, 0 colliders)
  const FLAGSTONE_COUNT = 84;
  const flagstoneGeo = trackGeo(new THREE.CylinderGeometry(0.85, 0.95, 0.1, 7));
  const flagstoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x788696,
      emissive: 0x1e293b,
      emissiveIntensity: 0.16,
      roughness: 0.88,
      flatShading: true,
    })
  );
  const flagstoneInst = trackInst(
    new THREE.InstancedMesh(flagstoneGeo, flagstoneMat, FLAGSTONE_COUNT)
  );
  for (let i = 0; i < FLAGSTONE_COUNT; i++) {
    const lz = 82 - (i / (FLAGSTONE_COUNT - 1)) * 138; // lz from 82 down to -56
    // Skip the stream crossing directly under the wooden bridge
    const safeLz = Math.abs(lz - 67) < 3.6 ? lz + 4.2 : lz;
    const cx = getTrailCenterX(safeLz) + Math.sin(i * 2.3) * 0.45;
    const cy = mangyulHeightFn(ORIGIN_X + cx, safeLz);
    dummy.position.set(cx, cy + 0.02, safeLz);
    dummy.rotation.set(0, i * 0.85, 0);
    dummy.scale.set(1.1 + (i % 3) * 0.2, 1, 0.78 + (i % 2) * 0.18);
    dummy.updateMatrix();
    flagstoneInst.setMatrixAt(i, dummy.matrix);
  }
  flagstoneInst.instanceMatrix.needsUpdate = true;
  root.add(flagstoneInst);

  // Trailside stacked mini mani cairns flanking the switchback bends (0 colliders)
  const TRAIL_CAIRN_COUNT = 28;
  const trailCairnBaseGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.42, 0.48, 6));
  const trailCairnTopGeo = trackGeo(new THREE.DodecahedronGeometry(0.22, 0));
  const trailCairnBaseInst = trackInst(
    new THREE.InstancedMesh(trailCairnBaseGeo, bridgeStoneMat, TRAIL_CAIRN_COUNT)
  );
  const trailCairnTopInst = trackInst(
    new THREE.InstancedMesh(trailCairnTopGeo, flagstoneMat, TRAIL_CAIRN_COUNT)
  );
  for (let i = 0; i < TRAIL_CAIRN_COUNT; i++) {
    const lz = 58 - (i / (TRAIL_CAIRN_COUNT - 1)) * 110;
    const side = i % 2 === 0 ? -1 : 1;
    const cx = getTrailCenterX(lz) + side * (3.8 + (i % 3) * 0.45);
    const cy = mangyulHeightFn(ORIGIN_X + cx, lz);
    dummy.position.set(cx, cy + 0.22, lz);
    dummy.rotation.set(0, i * 0.6, 0);
    dummy.scale.setScalar(0.9 + (i % 3) * 0.12);
    dummy.updateMatrix();
    trailCairnBaseInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(cx, cy + 0.54, lz);
    dummy.rotation.set(i * 0.3, i * 0.8, 0);
    dummy.updateMatrix();
    trailCairnTopInst.setMatrixAt(i, dummy.matrix);
  }
  trailCairnBaseInst.instanceMatrix.needsUpdate = true;
  trailCairnTopInst.instanceMatrix.needsUpdate = true;
  root.add(trailCairnBaseInst, trailCairnTopInst);

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
  const wpLotusRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.95, 1.15, 0.24, 8)),
    brassCapMat
  );
  wpLotusRing.position.y = 0.52;
  const wpPillar = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.55, 0)),
    waypointGlowMat
  );
  wpPillar.scale.set(0.7, 1.6, 0.7);
  wpPillar.position.y = 1.35;
  wpGroup.add(wpBase, wpLotusRing, wpPillar);
  root.add(wpGroup);

  // InstancedMesh Conifer Pines in Southern Valley & Lower Trail (72 trees = 3 draw calls)
  // Warmed & brightened with subtle dusk emissive fill so woodland is vibrant at 17:16
  const PINE_COUNT = 72;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 1.8, 6));
  const foliageGeo1 = trackGeo(new THREE.ConeGeometry(1.35, 2.8, 7));
  const foliageGeo2 = trackGeo(new THREE.ConeGeometry(0.95, 2.2, 7));
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x68472c,
      emissive: 0x29170b,
      emissiveIntensity: 0.24,
      roughness: 0.88,
      flatShading: true,
    })
  );
  const foliageMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2d6640,
      emissive: 0x163320,
      emissiveIntensity: 0.26,
      roughness: 0.78,
      flatShading: true,
    })
  );
  const snowFoliageMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x679887,
      emissive: 0x2d4a43,
      emissiveIntensity: 0.28,
      roughness: 0.72,
      flatShading: true,
    })
  );

  const trunkInst = trackInst(new THREE.InstancedMesh(trunkGeo, trunkMat, PINE_COUNT));
  const foliageLowInst = trackInst(new THREE.InstancedMesh(foliageGeo1, foliageMat, PINE_COUNT));
  const foliageHighInst = trackInst(
    new THREE.InstancedMesh(foliageGeo2, snowFoliageMat, PINE_COUNT)
  );
  trunkInst.castShadow = true;
  foliageLowInst.castShadow = true;
  foliageHighInst.castShadow = true;

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

  // Alpine Understory Flora: Frost-Dusted Juniper Shrubs & Ferns in Southern Valley (InstancedMesh, 0 colliders)
  const JUNIPER_COUNT = 56;
  const juniperGeo = trackGeo(new THREE.DodecahedronGeometry(0.68, 1));
  const juniperMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x366e56,
      emissive: 0x163024,
      emissiveIntensity: 0.22,
      roughness: 0.82,
      flatShading: true,
    })
  );
  const juniperInst = trackInst(new THREE.InstancedMesh(juniperGeo, juniperMat, JUNIPER_COUNT));
  for (let i = 0; i < JUNIPER_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    let lx = side * (9 + ((i * 13) % 36)) + Math.cos(i * 1.9) * 3;
    const lz = 8 + (i / JUNIPER_COUNT) * 84;
    if (Math.hypot(lx - 10, lz - 50) < 11) lx += side * 11;
    const jy = mangyulHeightFn(ORIGIN_X + lx, lz);
    const sx = 0.75 + (i % 4) * 0.22;
    const sy = 0.42 + (i % 3) * 0.14;
    dummy.position.set(lx, jy + sy * 0.45, lz);
    dummy.rotation.set(0, i * 0.9, 0);
    dummy.scale.set(sx, sy, sx);
    dummy.updateMatrix();
    juniperInst.setMatrixAt(i, dummy.matrix);
  }
  juniperInst.instanceMatrix.needsUpdate = true;
  root.add(juniperInst);

  const FERN_COUNT = 60;
  const fernGeo = trackGeo(new THREE.ConeGeometry(0.55, 0.62, 5));
  const fernMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b8462,
      emissive: 0x173828,
      emissiveIntensity: 0.22,
      roughness: 0.78,
      flatShading: true,
    })
  );
  const fernInst = trackInst(new THREE.InstancedMesh(fernGeo, fernMat, FERN_COUNT));
  for (let i = 0; i < FERN_COUNT; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    let lx = side * (7 + ((i * 19) % 34)) + Math.sin(i * 2.7) * 2.5;
    const lz = 18 + (i / FERN_COUNT) * 74;
    if (Math.hypot(lx - 10, lz - 50) < 10) lx += side * 10;
    const fy = mangyulHeightFn(ORIGIN_X + lx, lz);
    const s = 0.7 + (i % 4) * 0.18;
    dummy.position.set(lx, fy + 0.25 * s, lz);
    dummy.rotation.set(0.08, i * 1.3, -0.06);
    dummy.scale.set(s * 1.2, s * 0.85, s * 1.2);
    dummy.updateMatrix();
    fernInst.setMatrixAt(i, dummy.matrix);
  }
  fernInst.instanceMatrix.needsUpdate = true;
  root.add(fernInst);

  // ==========================================================================
  // 3. Envoy Camp at (3010, 50) -> local (10, 50): Tents, Horses, Emissive Campfire
  // ==========================================================================
  const campGroup = new THREE.Group();
  const campY = mangyulHeightFn(ORIGIN_X + 10, 50);
  campGroup.position.set(10, campY, 50);
  root.add(campGroup);

  const tentClothMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4e7ce,
      emissive: 0x5c3a1d,
      emissiveIntensity: 0.28,
      roughness: 0.8,
      flatShading: true,
    })
  );
  const tentTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      emissive: 0x450a0a,
      emissiveIntensity: 0.26,
      roughness: 0.72,
      flatShading: true,
    })
  );
  const yakSkirtMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b332e,
      emissive: 0x1c1613,
      emissiveIntensity: 0.2,
      roughness: 0.9,
      flatShading: true,
    })
  );

  // Two Tibetan envoy tents with yak-hair lower skirts, golden finials & entrance canopies
  const tentPositions = [
    { x: -4.2, z: -2.8, rot: 0.4 },
    { x: 4.5, z: -2.2, rot: -0.45 },
  ];
  const tentConeGeo = trackGeo(new THREE.ConeGeometry(2.3, 2.6, 6));
  const tentRoofTrimGeo = trackGeo(new THREE.CylinderGeometry(0.4, 2.35, 0.35, 6));
  const tentSkirtGeo = trackGeo(new THREE.CylinderGeometry(2.26, 2.42, 0.48, 6));
  const tentCanopyGeo = trackGeo(new THREE.BoxGeometry(1.15, 0.08, 0.95));
  for (const tp of tentPositions) {
    const tGrp = new THREE.Group();
    tGrp.position.set(tp.x, 0, tp.z);
    tGrp.rotation.y = tp.rot;
    const cone = new THREE.Mesh(tentConeGeo, tentClothMat);
    cone.position.y = 1.3;
    cone.castShadow = true;
    const trim = new THREE.Mesh(tentRoofTrimGeo, tentTrimMat);
    trim.position.y = 0.35;
    const skirt = new THREE.Mesh(tentSkirtGeo, yakSkirtMat);
    skirt.position.y = 0.24;
    const finial = new THREE.Mesh(postCapGeo, brassCapMat);
    finial.position.y = 2.68;
    const canopy = new THREE.Mesh(tentCanopyGeo, tentTrimMat);
    canopy.position.set(0, 1.38, 1.85);
    canopy.rotation.x = 0.22;
    tGrp.add(cone, trim, skirt, finial, canopy);
    campGroup.add(tGrp);
    base.addCollider({ x: ORIGIN_X + 10 + tp.x, z: 50 + tp.z, r: 2.0 });
  }

  // Envoy supply crates & tea barrels near the tents (0 colliders)
  const crateGeo = trackGeo(new THREE.BoxGeometry(0.76, 0.52, 0.56));
  const barrelGeo = trackGeo(new THREE.CylinderGeometry(0.26, 0.28, 0.66, 8));
  for (const [cx, cz, crot] of [
    [-1.5, -3.2, 0.25],
    [1.6, -2.9, -0.35],
  ]) {
    const crate = new THREE.Mesh(crateGeo, woodMat);
    crate.position.set(cx, 0.26, cz);
    crate.rotation.y = crot;
    const barrel = new THREE.Mesh(barrelGeo, bridgeRopeMat);
    barrel.position.set(cx + 0.62, 0.33, cz + 0.18);
    campGroup.add(crate, barrel);
  }

  // Two pack horses at the Envoy Camp
  const horseMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6e472b,
      emissive: 0x26160a,
      emissiveIntensity: 0.22,
      roughness: 0.82,
      flatShading: true,
    })
  );
  const saddleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x5c2804,
      emissiveIntensity: 0.24,
      roughness: 0.72,
      flatShading: true,
    })
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

  // Emissive Campfire (ZERO PointLights — emissive flame cones + glowing ground disc + tripod kettle)
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
  // Crossed firewood logs & cooking tripod over campfire
  const fireLogGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.09, 1.05, 6));
  for (let i = 0; i < 3; i++) {
    const logMesh = new THREE.Mesh(fireLogGeo, trunkMat);
    logMesh.position.y = 0.12;
    logMesh.rotation.set(Math.PI / 2, (i / 3) * Math.PI, 0);
    campfireGroup.add(logMesh);
  }
  const tripodLegGeo = trackGeo(new THREE.CylinderGeometry(0.03, 0.04, 1.45, 5));
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(tripodLegGeo, woodMat);
    leg.position.set(Math.cos(ang) * 0.42, 0.62, Math.sin(ang) * 0.42);
    leg.rotation.set(-Math.sin(ang) * 0.35, 0, Math.cos(ang) * 0.35);
    campfireGroup.add(leg);
  }
  const kettleMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.2, 8, 6)), brassCapMat);
  kettleMesh.position.y = 0.82;
  campfireGroup.add(kettleMesh);

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
  // 4. Instanced Rocks, Boulders, Snowdrifts & Glacial Ice Curtains
  // ==========================================================================
  const ROCK_COUNT = 84;
  const rockGeo = trackGeo(new THREE.DodecahedronGeometry(1.0, 0));
  const rockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x52606d, roughness: 0.88, flatShading: true })
  );
  const rockInst = trackInst(new THREE.InstancedMesh(rockGeo, rockMat, ROCK_COUNT));
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

  // East & West Glaciers in the Northern Pass & Upper Valley Flanks
  const glacierMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x99dcff,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.28,
      roughness: 0.18,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88,
      flatShading: true,
    })
  );
  const GLACIER_SPIRE_COUNT = 48;
  const glacierGeo = trackGeo(new THREE.ConeGeometry(2.6, 9.8, 6));
  const glacierInst = trackInst(
    new THREE.InstancedMesh(glacierGeo, glacierMat, GLACIER_SPIRE_COUNT)
  );
  for (let i = 0; i < GLACIER_SPIRE_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const lx = side * (26 + ((i * 11) % 30));
    const lz = -10 - ((i * 17) % 82);
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

  // Frozen Waterfall Ice Curtains along the East/West Valley Cliffs (InstancedMesh, 0 colliders)
  const ICE_CURTAIN_COUNT = 36;
  const iceCurtainGeo = trackGeo(new THREE.CylinderGeometry(0.75, 1.45, 6.8, 6));
  const iceCurtainInst = trackInst(
    new THREE.InstancedMesh(iceCurtainGeo, glacierMat, ICE_CURTAIN_COUNT)
  );
  for (let i = 0; i < ICE_CURTAIN_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const lx = side * (28 + ((i * 13) % 24));
    const lz = 18 - (i / ICE_CURTAIN_COUNT) * 105;
    const gy = mangyulHeightFn(ORIGIN_X + lx, lz);
    const s = 0.8 + (i % 4) * 0.22;
    dummy.position.set(lx, gy + 2.6 * s, lz);
    dummy.rotation.set(0, i * 0.5, side * 0.12);
    dummy.scale.set(s * 0.85, s * 1.25, s * 0.85);
    dummy.updateMatrix();
    iceCurtainInst.setMatrixAt(i, dummy.matrix);
  }
  iceCurtainInst.instanceMatrix.needsUpdate = true;
  root.add(iceCurtainInst);

  // Wind-Sculpted Snowdrifts along Upper Trail & Northern Pass (InstancedMesh, 0 colliders)
  const SNOWDRIFT_COUNT = 44;
  const snowdriftGeo = trackGeo(new THREE.SphereGeometry(1.4, 8, 6));
  const snowdriftMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeff6ff,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.12,
      roughness: 0.72,
    })
  );
  const snowdriftInst = trackInst(
    new THREE.InstancedMesh(snowdriftGeo, snowdriftMat, SNOWDRIFT_COUNT)
  );
  for (let i = 0; i < SNOWDRIFT_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const lz = 12 - (i / SNOWDRIFT_COUNT) * 98;
    const lx = side * (19 + ((i * 9) % 24)) + Math.sin(i * 1.7) * 3;
    const sy = mangyulHeightFn(ORIGIN_X + lx, lz);
    dummy.position.set(lx, sy + 0.15, lz);
    dummy.rotation.set(0, (i * 0.4) % Math.PI, 0);
    dummy.scale.set(1.8 + (i % 3) * 0.4, 0.28 + (i % 2) * 0.1, 0.95 + (i % 3) * 0.25);
    dummy.updateMatrix();
    snowdriftInst.setMatrixAt(i, dummy.matrix);
  }
  snowdriftInst.instanceMatrix.needsUpdate = true;
  root.add(snowdriftInst);

  // ==========================================================================
  // 4b. Dramatic *Firewatch* Coral-Crimson Alpenglow ("日照金山") Horizon Peaks
  //     Contrasting cool teal-indigo shadowed faces with sunlit coral/amber crests
  // ==========================================================================
  const alpenglowPeaksGroup = new THREE.Group();
  alpenglowPeaksGroup.name = 'FirewatchAlpenglowPeaks';
  root.add(alpenglowPeaksGroup);

  const mtnShadowIndigoMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      emissive: 0x0f253e,
      emissiveIntensity: 0.28,
      roughness: 0.86,
      flatShading: true,
    })
  );
  const mtnTwilightRoseMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd99b8c,
      emissive: 0x6b2737,
      emissiveIntensity: 0.34,
      roughness: 0.62,
      flatShading: true,
    })
  );
  const mtnCoralAlpenglowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff6b4a,
      emissive: 0xff451a,
      emissiveIntensity: 0.66,
      roughness: 0.38,
      metalness: 0.12,
      flatShading: true,
    })
  );
  const mtnGoldenSummitMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffb36b,
      emissive: 0xff9436,
      emissiveIntensity: 0.74,
      roughness: 0.28,
      metalness: 0.18,
      flatShading: true,
    })
  );

  const alpenglowPeakBaseGeo = trackGeo(new THREE.ConeGeometry(1, 1, 6));
  const alpenglowPeakMidGeo = trackGeo(new THREE.ConeGeometry(1, 1, 5));
  const alpenglowPeakHornGeo = trackGeo(new THREE.ConeGeometry(1, 1, 4));

  const alpenglowPeakDefs = [
    // Towering Gungthang / Himalayan northern & northwestern horizon range
    { x: 0, z: -146, r: 44, h: 98, rotY: 0.35, goldHorn: true },
    { x: -54, z: -138, r: 38, h: 88, rotY: -0.42, goldHorn: true },
    { x: 54, z: -138, r: 36, h: 84, rotY: 0.52, goldHorn: false },
    { x: -96, z: -116, r: 34, h: 78, rotY: 0.18, goldHorn: true },
    { x: 96, z: -116, r: 32, h: 74, rotY: -0.28, goldHorn: false },
    { x: -118, z: -64, r: 30, h: 72, rotY: 0.64, goldHorn: true },
    { x: 118, z: -64, r: 29, h: 68, rotY: -0.58, goldHorn: false },
    { x: -116, z: -8, r: 28, h: 64, rotY: 0.24, goldHorn: true },
    { x: 116, z: -8, r: 27, h: 62, rotY: -0.34, goldHorn: false },
  ];

  for (let i = 0; i < alpenglowPeakDefs.length; i++) {
    const pk = alpenglowPeakDefs[i];
    const pkGroup = new THREE.Group();
    pkGroup.position.set(pk.x, -2, pk.z);

    // 1. Cool teal-indigo shadowed lower massif
    const baseCone = new THREE.Mesh(alpenglowPeakBaseGeo, mtnShadowIndigoMat);
    baseCone.scale.set(pk.r, pk.h * 0.68, pk.r * 0.88);
    baseCone.position.y = pk.h * 0.34;
    baseCone.rotation.y = pk.rotY;
    pkGroup.add(baseCone);

    // 2. Twilight lavender-rose mid snow face (offset slightly toward sunlit west/south-west)
    const midCone = new THREE.Mesh(alpenglowPeakMidGeo, mtnTwilightRoseMat);
    midCone.scale.set(pk.r * 0.66, pk.h * 0.52, pk.r * 0.58);
    midCone.position.set(-pk.r * 0.04, pk.h * 0.54, pk.r * 0.04);
    midCone.rotation.y = pk.rotY + 0.3;
    pkGroup.add(midCone);

    // 3. Vibrant Firewatch coral-crimson sunlit upper crest
    const coralCrest = new THREE.Mesh(alpenglowPeakMidGeo, mtnCoralAlpenglowMat);
    coralCrest.scale.set(pk.r * 0.42, pk.h * 0.36, pk.r * 0.38);
    coralCrest.position.set(-pk.r * 0.06, pk.h * 0.74, pk.r * 0.05);
    coralCrest.rotation.y = pk.rotY + 0.55;
    pkGroup.add(coralCrest);

    // 4. Dazzling golden-amber alpenglow horn summit ("日照金山")
    const summitHorn = new THREE.Mesh(
      alpenglowPeakHornGeo,
      pk.goldHorn ? mtnGoldenSummitMat : mtnCoralAlpenglowMat
    );
    summitHorn.scale.set(pk.r * 0.24, pk.h * 0.24, pk.r * 0.22);
    summitHorn.position.set(-pk.r * 0.05, pk.h * 0.90, pk.r * 0.04);
    summitHorn.rotation.y = pk.rotY + 0.8;
    pkGroup.add(summitHorn);

    alpenglowPeaksGroup.add(pkGroup);
  }

  // Radiant Firewatch Coral-Gold Alpenglow Horizon Halo behind the main northern Gungthang peak
  const alpenglowHaloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff8a5b,
      map: cloudInversionTex,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const alpenglowHaloMesh = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(165, 92)),
    alpenglowHaloMat
  );
  alpenglowHaloMesh.position.set(0, 56, -152);
  alpenglowPeaksGroup.add(alpenglowHaloMesh);

  // ==========================================================================
  // 5. Pass Latse (山口拉則) + Boss Arena at (3000, -65), r = 18
  // ==========================================================================
  const passY = mangyulHeightFn(ORIGIN_X, -65);
  const latseGroup = new THREE.Group();
  latseGroup.position.set(0, passY, -65);
  root.add(latseGroup);

  // Twelve Tenma Wind-Mandala Floor Emblem (r = 15.5m)
  const arenaMandalaTex = trackTex(createTenmaArenaMandalaTexture());
  const arenaMandalaGeo = trackGeo(new THREE.CircleGeometry(15.5, 48));
  arenaMandalaGeo.rotateX(-Math.PI / 2);
  const arenaMandalaMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      map: arenaMandalaTex,
      transparent: true,
      opacity: arenaMandalaTex ? 0.82 : 0.18,
      depthWrite: false,
    })
  );
  const arenaMandalaMesh = new THREE.Mesh(arenaMandalaGeo, arenaMandalaMat);
  arenaMandalaMesh.position.y = 0.04;
  latseGroup.add(arenaMandalaMesh);

  // Arena perimeter stone ring markers (radius 18m & inner 15.5m ring)
  const arenaRingGeo = trackGeo(new THREE.RingGeometry(17.6, 18.1, 48));
  arenaRingGeo.rotateX(-Math.PI / 2);
  const arenaInnerRingGeo = trackGeo(new THREE.RingGeometry(15.2, 15.6, 48));
  arenaInnerRingGeo.rotateX(-Math.PI / 2);
  const arenaRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const arenaRingMesh = new THREE.Mesh(arenaRingGeo, arenaRingMat);
  arenaRingMesh.position.y = 0.06;
  const arenaInnerRingMesh = new THREE.Mesh(arenaInnerRingGeo, arenaRingMat);
  arenaInnerRingMesh.position.y = 0.05;
  latseGroup.add(arenaRingMesh, arenaInnerRingMesh);

  // Perimeter Ring of 12 Ancient Tenma Guardian Monoliths (r = 18.8m, 0 colliders)
  const MONOLITH_COUNT = 12;
  const monolithBaseGeo = trackGeo(new THREE.CylinderGeometry(0.68, 0.85, 0.48, 6));
  const monolithShaftGeo = trackGeo(new THREE.BoxGeometry(0.58, 2.65, 0.58));
  const monolithCrystalGeo = trackGeo(new THREE.OctahedronGeometry(0.32, 0));
  const monolithCrystalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      flatShading: true,
    })
  );
  const monolithBaseInst = trackInst(
    new THREE.InstancedMesh(monolithBaseGeo, bridgeStoneMat, MONOLITH_COUNT)
  );
  const monolithShaftInst = trackInst(
    new THREE.InstancedMesh(monolithShaftGeo, flagstoneMat, MONOLITH_COUNT)
  );
  const monolithCrystalInst = trackInst(
    new THREE.InstancedMesh(monolithCrystalGeo, monolithCrystalMat, MONOLITH_COUNT)
  );
  for (let i = 0; i < MONOLITH_COUNT; i++) {
    // Offset by half-step so the southern approach at angle = PI/2 is wide open
    const ang = ((i + 0.5) / MONOLITH_COUNT) * Math.PI * 2;
    const mx = Math.cos(ang) * 18.8;
    const mz = Math.sin(ang) * 18.8;
    dummy.position.set(mx, 0.24, mz);
    dummy.rotation.set(0, -ang, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    monolithBaseInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(mx, 1.65, mz);
    dummy.rotation.set(0, -ang + Math.PI / 4, 0);
    dummy.updateMatrix();
    monolithShaftInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(mx, 3.28, mz);
    dummy.rotation.set(0, ang * 2, 0);
    dummy.updateMatrix();
    monolithCrystalInst.setMatrixAt(i, dummy.matrix);
  }
  monolithBaseInst.instanceMatrix.needsUpdate = true;
  monolithShaftInst.instanceMatrix.needsUpdate = true;
  monolithCrystalInst.instanceMatrix.needsUpdate = true;
  latseGroup.add(monolithBaseInst, monolithShaftInst, monolithCrystalInst);

  // Monumental Latse Cairn (placed at northern rim of the arena z = -72 so center is open for combat,
  // while still inside the pass plaza!)
  const cairnCenter = new THREE.Group();
  cairnCenter.position.set(0, 0, -6.5);
  latseGroup.add(cairnCenter);
  base.addCollider({ x: ORIGIN_X, z: -71.5, r: 2.8 });

  // Carved octagonal stone pedestal beneath the Latse cairn
  const cairnPlinth = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.55, 2.85, 0.42, 8)),
    bridgeStoneMat
  );
  cairnPlinth.position.y = 0.21;
  cairnCenter.add(cairnPlinth);

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
  const latseStoneInst = trackInst(
    new THREE.InstancedMesh(latseStoneGeo, latseStoneMat, LATSE_STONE_COUNT)
  );
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

  // Central wooden arrows / spears ("Dadar") crowning the Latse with golden finial & turquoise ring
  const spirePole = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1, 0.16, 4.8, 6)),
    woodMat
  );
  spirePole.position.y = 2.6;
  const spireCrown = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.28, 0.65, 6)),
    brassCapMat
  );
  spireCrown.position.y = 5.15;
  const spireTurquoiseRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.42, 0.055, 6, 16)),
    monolithCrystalMat
  );
  spireTurquoiseRing.rotation.x = Math.PI / 2;
  spireTurquoiseRing.position.y = 4.45;
  cairnCenter.add(spirePole, spireCrown, spireTurquoiseRing);

  // Prayer flag arrays radiating from the Latse cairn
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
  // 5b. *SEASON*-Style Visual Wind Streamlines & Diagonal Alpenglow Sunbeams
  // ==========================================================================
  const windStreamlinesGroup = new THREE.Group();
  windStreamlinesGroup.name = 'SeasonWindStreamlines';
  root.add(windStreamlinesGroup);

  const windRibbonCyanMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const windRibbonGoldMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfed7aa,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  // Swirling Torus wind-wave arcs around the Pass Latse cairn & boss arena (z = -65)
  const windStreamlineRibbons = [];
  const passWindArcDefs = [
    { r: 5.2, tube: 0.045, arc: Math.PI * 1.15, y: passY + 2.4, z: -71.5, speed: 0.85, tiltX: 0.12, tiltZ: -0.08, gold: false },
    { r: 7.8, tube: 0.05, arc: Math.PI * 0.95, y: passY + 3.8, z: -71.5, speed: -0.72, tiltX: -0.14, tiltZ: 0.10, gold: true },
    { r: 11.4, tube: 0.055, arc: Math.PI * 0.82, y: passY + 2.1, z: -65.0, speed: 0.64, tiltX: 0.08, tiltZ: 0.06, gold: false },
    { r: 14.8, tube: 0.06, arc: Math.PI * 0.76, y: passY + 3.4, z: -65.0, speed: -0.58, tiltX: -0.09, tiltZ: -0.07, gold: true },
    { r: 17.2, tube: 0.05, arc: Math.PI * 0.68, y: passY + 4.8, z: -65.0, speed: 0.52, tiltX: 0.11, tiltZ: -0.09, gold: false },
  ];

  for (let i = 0; i < passWindArcDefs.length; i++) {
    const wd = passWindArcDefs[i];
    const arcGeo = trackGeo(new THREE.TorusGeometry(wd.r, wd.tube, 6, 28, wd.arc));
    arcGeo.rotateX(Math.PI / 2);
    const arcMesh = new THREE.Mesh(
      arcGeo,
      wd.gold ? windRibbonGoldMat : windRibbonCyanMat
    );
    arcMesh.position.set(0, wd.y, wd.z);
    arcMesh.rotation.set(wd.tiltX, i * 1.2, wd.tiltZ);
    windStreamlinesGroup.add(arcMesh);
    windStreamlineRibbons.push({
      mesh: arcMesh,
      baseY: wd.y,
      speed: wd.speed,
      phase: i * 1.3,
    });
  }

  // Sweeping S-curve TubeGeometry wind streamlines gliding along the canyon ridge & Kyirong gorge
  const canyonWindHeights = [-36, -12, 14, 38, 62];
  for (let i = 0; i < canyonWindHeights.length; i++) {
    const wz = canyonWindHeights[i];
    const wy = mangyulHeightFn(ORIGIN_X, wz) + 3.2 + (i % 2) * 1.4;
    const dir = i % 2 === 0 ? 1 : -1;
    const windCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-18 * dir, wy - 0.6, wz - 6),
      new THREE.Vector3(-6 * dir, wy + 0.8, wz - 2),
      new THREE.Vector3(6 * dir, wy - 0.4, wz + 2),
      new THREE.Vector3(18 * dir, wy + 0.9, wz + 6),
    ]);
    const windTubeGeo = trackGeo(new THREE.TubeGeometry(windCurve, 20, 0.048, 5, false));
    const windTubeMesh = new THREE.Mesh(
      windTubeGeo,
      i % 2 === 0 ? windRibbonGoldMat : windRibbonCyanMat
    );
    windStreamlinesGroup.add(windTubeMesh);
    windStreamlineRibbons.push({
      mesh: windTubeMesh,
      baseY: 0,
      speed: 0,
      phase: i * 0.95,
      isCanyonWave: true,
    });
  }

  // Diagonal Golden-Coral Sunbeam Shafts piercing the mountain pass & canyon at 17:16 dusk
  const sunbeamsGroup = new THREE.Group();
  sunbeamsGroup.name = 'FirewatchDiagonalSunbeams';
  root.add(sunbeamsGroup);

  const sunbeamShaftGeo = trackGeo(new THREE.CylinderGeometry(1.1, 3.6, 36, 12, 1, true));
  const sunbeamShafts = [];
  const sunbeamDefs = [
    { x: -10, y: passY + 13, z: -68, rotZ: -0.58, rotX: 0.18, scaleX: 1.3, scaleZ: 1.3, color: 0xffb36b, opacity: 0.14 },
    { x: 6, y: passY + 14, z: -60, rotZ: -0.56, rotX: 0.16, scaleX: 1.15, scaleZ: 1.15, color: 0xff8a5b, opacity: 0.12 },
    { x: -8, y: 19, z: -26, rotZ: -0.60, rotX: 0.15, scaleX: 1.25, scaleZ: 1.25, color: 0xffb36b, opacity: 0.13 },
    { x: 4, y: 16, z: 6, rotZ: -0.58, rotX: 0.14, scaleX: 1.35, scaleZ: 1.35, color: 0xff9e6d, opacity: 0.13 },
    { x: -6, y: 14, z: 32, rotZ: -0.55, rotX: 0.16, scaleX: 1.4, scaleZ: 1.4, color: 0xffb36b, opacity: 0.14 },
    { x: 6, y: 12, z: 54, rotZ: -0.54, rotX: 0.15, scaleX: 1.25, scaleZ: 1.25, color: 0xffc078, opacity: 0.13 },
  ];

  for (let i = 0; i < sunbeamDefs.length; i++) {
    const sb = sunbeamDefs[i];
    const sbMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: sb.color,
        transparent: true,
        opacity: sb.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    const sbMesh = new THREE.Mesh(sunbeamShaftGeo, sbMat);
    sbMesh.position.set(sb.x, sb.y, sb.z);
    sbMesh.rotation.set(sb.rotX, 0, sb.rotZ);
    sbMesh.scale.set(sb.scaleX, 1, sb.scaleZ);
    sunbeamsGroup.add(sbMesh);
    sunbeamShafts.push({
      mesh: sbMesh,
      mat: sbMat,
      baseOpacity: sb.opacity,
      phase: i * 1.1,
    });
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

  // Per-element crystal & rune materials for the 4 Tenma trial types
  const elementCrystalMats = {};
  for (const [elType, elCols] of Object.entries(TENMA_ELEMENT_COLORS)) {
    elementCrystalMats[elType] = trackMat(
      new THREE.MeshStandardMaterial({
        color: elCols.color,
        emissive: elCols.emissive,
        emissiveIntensity: 0.65,
        roughness: 0.25,
        flatShading: true,
      })
    );
  }

  const altarBaseGeo = trackGeo(new THREE.CylinderGeometry(1.15, 1.35, 0.55, 7));
  const altarMandalaPlinthGeo = trackGeo(new THREE.CylinderGeometry(1.65, 1.82, 0.12, 12));
  const altarRuneRingGeo = trackGeo(new THREE.RingGeometry(1.38, 1.56, 24));
  altarRuneRingGeo.rotateX(-Math.PI / 2);
  const altarTableGeo = trackGeo(new THREE.BoxGeometry(1.2, 0.38, 0.9));
  const altarManiSlateGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.08, 0.3));
  const altarCrystalInlayGeo = trackGeo(new THREE.OctahedronGeometry(0.16, 0));
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

    // Carved mandala plinth, elemental rune ring, crystal inlays & stacked mani slates
    // (added directly as Meshes with non-PlaneGeometry so every child has .geometry and PlaneGeometry count stays 5)
    const elMat = elementCrystalMats[def.type] || oathStoneMat;
    const mandalaPlinth = new THREE.Mesh(altarMandalaPlinthGeo, bridgeStoneMat);
    mandalaPlinth.position.y = 0.06;
    const runeRing = new THREE.Mesh(altarRuneRingGeo, elMat);
    runeRing.position.y = 0.13;
    const maniSlate = new THREE.Mesh(altarManiSlateGeo, latseStoneMat);
    maniSlate.position.set(0, 0.95, 0);
    const crystalL = new THREE.Mesh(altarCrystalInlayGeo, elMat);
    crystalL.position.set(-0.46, 1.02, 0.22);
    const crystalR = new THREE.Mesh(altarCrystalInlayGeo, elMat);
    crystalR.position.set(0.46, 1.02, 0.22);
    const poleCapL = new THREE.Mesh(altarCrystalInlayGeo, elMat);
    poleCapL.position.set(-1.15, 2.76, -0.35);
    const poleCapR = new THREE.Mesh(altarCrystalInlayGeo, elMat);
    poleCapR.position.set(1.15, 2.76, -0.35);
    aGrp.add(mandalaPlinth, runeRing, maniSlate, crystalL, crystalR, poleCapL, poleCapR);

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
  if (!presentationOnly && typeof window !== 'undefined') {
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

  if (!presentationOnly) {
    ctx.tenma = tenmaApi;
    ctx.debug?.register?.('tenma', tenmaApi);
    if (typeof window !== 'undefined' && window.__stupa) {
      window.__stupa.tenma = tenmaApi;
    }
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

    // 4b. Kyirong Cloud-Inversion Sea of Mist drift, SEASON wind streamlines & diagonal sunbeams
    for (let i = 0; i < cloudSeaLayers.length; i++) {
      const cl = cloudSeaLayers[i];
      cl.mesh.position.x = cl.baseX + Math.sin(elapsed * cl.speed + cl.phase) * 3.8;
      cl.mesh.position.y = cl.baseY + Math.cos(elapsed * 0.45 + cl.phase) * 0.16;
      cl.mat.opacity = cl.baseOpacity + Math.sin(elapsed * 0.7 + cl.phase) * 0.04;
    }

    const windWaveBoost = 1.0 + northFactor * 0.65;
    for (let i = 0; i < windStreamlineRibbons.length; i++) {
      const wr = windStreamlineRibbons[i];
      if (wr.isCanyonWave) {
        wr.mesh.position.x = Math.sin(elapsed * 1.1 + wr.phase) * 1.25;
        wr.mesh.position.y = Math.cos(elapsed * 1.6 + wr.phase) * 0.32;
      } else {
        wr.mesh.rotation.y += dt * wr.speed * windWaveBoost;
        wr.mesh.position.y = wr.baseY + Math.sin(elapsed * 1.8 + wr.phase) * 0.24;
      }
    }
    windRibbonCyanMat.opacity = 0.22 + Math.sin(elapsed * 2.1) * 0.06 + northFactor * 0.08;
    windRibbonGoldMat.opacity = 0.20 + Math.cos(elapsed * 1.7) * 0.05 + northFactor * 0.06;

    for (let i = 0; i < sunbeamShafts.length; i++) {
      const sb = sunbeamShafts[i];
      sb.mat.opacity = sb.baseOpacity + Math.sin(elapsed * 1.4 + sb.phase) * 0.025;
    }
    alpenglowHaloMat.opacity = 0.34 + Math.sin(elapsed * 1.1) * 0.05;

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
    if (!presentationOnly && typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKeyDown);
    }
    if (scene.fog) {
      scene.fog.near = savedFogNear;
      scene.fog.far = savedFogFar;
    }
    base.dispose();
    for (const im of instancedMeshes) im.dispose?.();
    for (const t of textures) t.dispose?.();
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
