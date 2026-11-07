/**
 * Outer Sanctuary Hub Map Scene — Pilgrim Stupa Grove (`src/world/maps/grove.js`) — Issue #146
 *
 * A serene Tibetan courtyard garden outside the South Mountain Gate of Boudhanath Stupa (`origin = (-1000, 0)`).
 * Houses the Central Votive Stupa Consecration Altar and the 8-slot Pilgrim Stupa Mandala Ring.
 *
 * Strictly ZERO PointLights — uses emissive materials and AdditiveBlending meshes only.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GROVE_MAP } from '../../data/maps/grove.js';

const TWO_PI = Math.PI * 2;
const FLAG_COLORS = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];

// Must match the 8 Pilgrim Stupa slot angles & radius in `src/gameplay/personalStupa.js`
export const GROVE_STUPA_RADIUS = 14.5;
export const GROVE_STUPA_ANGLES_DEG = [-135, -100, -65, -30, 30, 65, 100, 135];

function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Procedural CanvasTexture for the concentric mandala flagstone courtyard (`r = 24m`).
 */
function createGroveCourtyardTexture() {
  if (typeof document === 'undefined') return null;
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return null;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.49;

  // Base moss-warmed mortar tone
  g.fillStyle = '#756f61';
  g.fillRect(0, 0, size, size);

  // Subtle moss & weathered stone patina
  for (let i = 0; i < 900; i++) {
    const x = seededRandom(i * 3.1) * size;
    const y = seededRandom(i * 7.3) * size;
    const r = 8 + seededRandom(i * 11.7) * 26;
    const isMoss = i % 4 === 0;
    g.fillStyle = isMoss ? 'rgba(92, 110, 78, 0.16)' : 'rgba(138, 128, 112, 0.14)';
    g.beginPath();
    g.arc(x, y, r, 0, TWO_PI);
    g.fill();
  }

  // Concentric courses of flagstones
  const ringCount = 20;
  const innerStart = maxR * 0.18;
  const ringStep = (maxR - innerStart) / ringCount;

  for (let rIdx = 0; rIdx < ringCount; rIdx++) {
    const r0 = innerStart + rIdx * ringStep;
    const r1 = r0 + ringStep;
    const rMid = (r0 + r1) * 0.5;

    // Highlight the 14.5m stupa mandala ring (around rIdx 10..11) and outer border
    const isMandalaRing = rIdx === 10 || rIdx === 11;
    const isInnerRing = rIdx === 1;
    const baseHue = isMandalaRing
      ? [178, 138, 98]
      : isInnerRing
        ? [168, 130, 102]
        : [148, 141, 128];

    const segs = Math.max(12, Math.floor((TWO_PI * rMid) / 16));
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * TWO_PI + (rIdx % 2) * (Math.PI / segs);
      const a1 = ((s + 1) / segs) * TWO_PI + (rIdx % 2) * (Math.PI / segs);

      const jitter = ((s * 19 + rIdx * 29) % 17) - 8;
      const cr = baseHue[0] + jitter;
      const cg = baseHue[1] + jitter;
      const cb = baseHue[2] + jitter;

      g.beginPath();
      g.arc(cx, cy, r1 - 1.2, a0 + 0.005, a1 - 0.005, false);
      g.arc(cx, cy, r0 + 1.2, a1 - 0.005, a0 + 0.005, true);
      g.closePath();
      g.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      g.fill();
    }

    g.beginPath();
    g.arc(cx, cy, r0, 0, TWO_PI);
    g.strokeStyle = 'rgba(58, 54, 46, 0.5)';
    g.lineWidth = 2.0;
    g.stroke();
  }

  // Golden-ochre 8-spoked mandala lines radiating from center
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = 'rgba(212, 163, 75, 0.28)';
  g.lineWidth = 3.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI;
    g.beginPath();
    g.moveTo(Math.cos(a) * innerStart, Math.sin(a) * innerStart);
    g.lineTo(Math.cos(a) * (maxR * 0.96), Math.sin(a) * (maxR * 0.96));
    g.stroke();
  }
  g.restore();

  const tex = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createMap(ctx, mapDef = GROVE_MAP) {
  const origin = mapDef?.origin || { x: -1000, z: 0 };
  const ox = origin.x;
  const oz = origin.z;

  const zoneGroup = ctx.zoneGroups?.grove || new THREE.Group();
  zoneGroup.name = 'Zone_grove';
  if (!ctx.zoneGroups?.grove && ctx.scene) {
    ctx.scene.add(zoneGroup);
  }

  const root = new THREE.Group();
  root.name = 'StupaGroveMap';
  root.position.set(ox, 0, oz);
  zoneGroup.add(root);

  const colliders = ctx.colliders;

  // ---------------------------------------------------------------- 1. Ground Disc, Courtyard & Processional Path
  const outerGroundGeo = new THREE.CircleGeometry(96, 64);
  outerGroundGeo.rotateX(-Math.PI / 2);
  const outerGroundMat = new THREE.MeshStandardMaterial({
    color: 0x6b7458,
    roughness: 0.94,
    metalness: 0.02,
  });
  const outerGround = new THREE.Mesh(outerGroundGeo, outerGroundMat);
  outerGround.receiveShadow = true;
  root.add(outerGround);

  // Soft grass/moss garden ring within the courtyard wall (`r = 35.8m`)
  const gardenDiscGeo = new THREE.CircleGeometry(35.8, 72);
  gardenDiscGeo.rotateX(-Math.PI / 2);
  gardenDiscGeo.translate(0, 0.008, 0);
  const gardenDiscMat = new THREE.MeshStandardMaterial({
    color: 0x768262,
    roughness: 0.9,
    metalness: 0.02,
  });
  const gardenDisc = new THREE.Mesh(gardenDiscGeo, gardenDiscMat);
  gardenDisc.receiveShadow = true;
  root.add(gardenDisc);

  // Concentric Mandala Flagstone Courtyard (`r = 24m`)
  const courtyardGeo = new THREE.CircleGeometry(24.0, 80);
  courtyardGeo.rotateX(-Math.PI / 2);
  courtyardGeo.translate(0, 0.018, 0);
  const courtyardMat = new THREE.MeshStandardMaterial({
    map: createGroveCourtyardTexture(),
    color: 0xe6dfd3,
    roughness: 0.85,
    metalness: 0.04,
  });
  const courtyardMesh = new THREE.Mesh(courtyardGeo, courtyardMat);
  courtyardMesh.receiveShadow = true;
  root.add(courtyardMesh);

  // Stone curb ring around the 24m mandala courtyard
  const curbGeo = new THREE.RingGeometry(23.7, 24.4, 72);
  curbGeo.rotateX(-Math.PI / 2);
  curbGeo.translate(0, 0.04, 0);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x9b9284,
    roughness: 0.84,
    metalness: 0.05,
  });
  const curbMesh = new THREE.Mesh(curbGeo, stoneMat);
  curbMesh.receiveShadow = true;
  root.add(curbMesh);

  // North Gate stone processional walkway (`z = -35m .. -23.5m`)
  const walkwayGeo = new THREE.BoxGeometry(5.2, 0.05, 13.0);
  walkwayGeo.translate(0, 0.025, -29.5);
  const walkwayMesh = new THREE.Mesh(walkwayGeo, stoneMat);
  walkwayMesh.receiveShadow = true;
  root.add(walkwayMesh);

  // ---------------------------------------------------------------- 2. Central Raised Octagon Stone Lotus Terrace (`r = 5.5m`)
  const terraceGroup = new THREE.Group();
  terraceGroup.name = 'CentralLotusTerrace';

  const terraceStoneMat = new THREE.MeshStandardMaterial({
    color: 0xd6cfc2,
    roughness: 0.76,
    metalness: 0.08,
  });
  const crimsonTrimMat = new THREE.MeshStandardMaterial({
    color: 0x7c1e19,
    roughness: 0.72,
    metalness: 0.1,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf5bf42,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    roughness: 0.28,
    metalness: 0.82,
  });

  // Low walkable octagonal stone platform (`h = 0.08m`, `r = 5.5m`)
  const octBase = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.55, 0.08, 8), terraceStoneMat);
  octBase.position.y = 0.04;
  octBase.receiveShadow = true;
  terraceGroup.add(octBase);

  const octInner = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.0, 0.06, 8), crimsonTrimMat);
  octInner.position.y = 0.08;
  octInner.receiveShadow = true;
  terraceGroup.add(octInner);

  const goldInlayRing = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.75, 8), goldTrimMat);
  goldInlayRing.rotateX(-Math.PI / 2);
  goldInlayRing.position.y = 0.115;
  terraceGroup.add(goldInlayRing);

  // 8 Pilgrim Stupa stone lotus pedestals at `r = 14.5m`
  const padGeos = [];
  const padRingGeos = [];
  for (let i = 0; i < GROVE_STUPA_ANGLES_DEG.length; i++) {
    const rad = (GROVE_STUPA_ANGLES_DEG[i] * Math.PI) / 180;
    const lx = Math.cos(rad) * GROVE_STUPA_RADIUS;
    const lz = Math.sin(rad) * GROVE_STUPA_RADIUS;

    const pad = new THREE.CylinderGeometry(1.55, 1.72, 0.07, 16);
    pad.translate(lx, 0.035, lz);
    padGeos.push(pad);

    const ring = new THREE.RingGeometry(1.42, 1.54, 16);
    ring.rotateX(-Math.PI / 2);
    ring.translate(lx, 0.074, lz);
    padRingGeos.push(ring);
  }
  if (padGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(padGeos, false), terraceStoneMat);
    m.receiveShadow = true;
    terraceGroup.add(m);
  }
  if (padRingGeos.length) {
    terraceGroup.add(new THREE.Mesh(mergeGeometries(padRingGeos, false), goldTrimMat));
  }

  // 4 Corner Butter-Lamp Offering Pillars around the central terrace (`r = 4.85m`, 0 PointLights)
  const flameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.4, 0.38),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
  });
  for (let c = 0; c < 4; c++) {
    const ang = (c / 4) * TWO_PI + Math.PI / 4;
    const px = Math.cos(ang) * 4.85;
    const pz = Math.sin(ang) * 4.85;

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.92, 8), terraceStoneMat);
    pillar.position.set(px, 0.46, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.14, 10), goldTrimMat);
    bowl.position.set(px, 0.98, pz);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 8), flameMat);
    flame.position.set(px, 1.18, pz);

    terraceGroup.add(pillar, bowl, flame);
  }

  root.add(terraceGroup);

  // ---------------------------------------------------------------- 3. North Return Mountain Gate Archway (`(0, 0, -33.5)`)
  const gateGroup = new THREE.Group();
  gateGroup.name = 'NorthReturnGate';
  gateGroup.position.set(0, 0, -33.5);

  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xede7dc, roughness: 0.9 });
  const gateWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2417, roughness: 0.8 });
  const gateTileMat = new THREE.MeshStandardMaterial({ color: 0x48413b, roughness: 0.76 });

  const gatePlasterGeos = [];
  const gateMaroonGeos = [];
  const gateWoodGeos = [];
  const gateTileGeos = [];
  const gateGoldGeos = [];

  const pillarX = 2.2;
  const pillarH = 3.4;

  for (const s of [-1, 1]) {
    const px = s * pillarX;
    const base = new THREE.BoxGeometry(0.88, 0.45, 0.88);
    base.translate(px, 0.225, 0);
    gatePlasterGeos.push(base);

    const baseBand = new THREE.BoxGeometry(0.82, 0.12, 0.82);
    baseBand.translate(px, 0.51, 0);
    gateMaroonGeos.push(baseBand);

    const shaft = new THREE.BoxGeometry(0.68, pillarH - 0.7, 0.68);
    shaft.translate(px, 0.57 + (pillarH - 0.7) * 0.5, 0);
    gatePlasterGeos.push(shaft);

    const capBand = new THREE.BoxGeometry(0.78, 0.14, 0.78);
    capBand.translate(px, pillarH - 0.07, 0);
    gateMaroonGeos.push(capBand);

    const cap = new THREE.BoxGeometry(0.86, 0.12, 0.86);
    cap.translate(px, pillarH + 0.06, 0);
    gateGoldGeos.push(cap);

    if (Array.isArray(colliders)) {
      colliders.push({
        type: 'circle',
        x: ox + px,
        z: oz - 33.5,
        r: 0.55,
        zone: 'grove',
      });
    }
  }

  const lintel = new THREE.BoxGeometry(5.6, 0.36, 0.76);
  lintel.translate(0, pillarH + 0.3, 0);
  gateWoodGeos.push(lintel);

  const bracketTier = new THREE.BoxGeometry(5.8, 0.26, 0.92);
  bracketTier.translate(0, pillarH + 0.61, 0);
  gateMaroonGeos.push(bracketTier);

  const plaque = new THREE.BoxGeometry(2.4, 0.55, 0.12);
  plaque.translate(0, pillarH + 0.3, 0.42);
  gateMaroonGeos.push(plaque);

  const plaqueRim = new THREE.BoxGeometry(2.48, 0.62, 0.08);
  plaqueRim.translate(0, pillarH + 0.3, 0.4);
  gateGoldGeos.push(plaqueRim);

  const roofLower = new THREE.BoxGeometry(6.4, 0.2, 1.45);
  roofLower.translate(0, pillarH + 0.84, 0);
  gateTileGeos.push(roofLower);

  const roofUpper = new THREE.BoxGeometry(5.0, 0.28, 1.15);
  roofUpper.translate(0, pillarH + 1.08, 0);
  gateTileGeos.push(roofUpper);

  const wheelCrest = new THREE.CylinderGeometry(0.36, 0.36, 0.1, 16);
  wheelCrest.rotateX(Math.PI / 2);
  wheelCrest.translate(0, pillarH + 1.55, 0);
  gateGoldGeos.push(wheelCrest);

  const wheelHub = new THREE.SphereGeometry(0.12, 10, 8);
  wheelHub.translate(0, pillarH + 1.55, 0);
  gateGoldGeos.push(wheelHub);

  for (const s of [-1, 1]) {
    const deerBody = new THREE.BoxGeometry(0.38, 0.24, 0.16);
    deerBody.translate(s * 0.68, pillarH + 1.36, 0);
    gateGoldGeos.push(deerBody);

    const deerHead = new THREE.BoxGeometry(0.14, 0.22, 0.14);
    deerHead.translate(s * 0.52, pillarH + 1.54, 0);
    gateGoldGeos.push(deerHead);
  }

  if (gatePlasterGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(gatePlasterGeos, false), plasterMat);
    m.castShadow = true;
    m.receiveShadow = true;
    gateGroup.add(m);
  }
  if (gateMaroonGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(gateMaroonGeos, false), crimsonTrimMat);
    m.castShadow = true;
    m.receiveShadow = true;
    gateGroup.add(m);
  }
  if (gateWoodGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(gateWoodGeos, false), gateWoodMat);
    m.castShadow = true;
    m.receiveShadow = true;
    gateGroup.add(m);
  }
  if (gateTileGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(gateTileGeos, false), gateTileMat);
    m.castShadow = true;
    m.receiveShadow = true;
    gateGroup.add(m);
  }
  if (gateGoldGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(gateGoldGeos, false), goldTrimMat);
    m.castShadow = true;
    gateGroup.add(m);
  }

  root.add(gateGroup);

  // ---------------------------------------------------------------- 4. Perimeter Whitewashed Tibetan Courtyard Wall (`r = 35.5m`)
  const wallRadius = 35.5;
  const wallSegments = 36;
  const wallPlasterGeos = [];
  const wallMaroonGeos = [];
  const wallCapGeos = [];

  for (let i = 0; i < wallSegments; i++) {
    const a0 = (i / wallSegments) * TWO_PI;
    const a1 = ((i + 1) / wallSegments) * TWO_PI;
    const aMid = (a0 + a1) * 0.5;

    // Leave open archway entrance at the North Gate (angle around 3*PI/2 = 4.7124 rad)
    const northAngle = Math.PI * 1.5;
    const angDiff = Math.abs(Math.atan2(Math.sin(aMid - northAngle), Math.cos(aMid - northAngle)));
    if (angDiff < 0.14) continue;

    const segLen = wallRadius * ((TWO_PI / wallSegments) * 1.02);
    const wx = Math.cos(aMid) * wallRadius;
    const wz = Math.sin(aMid) * wallRadius;
    const rotY = -aMid + Math.PI * 0.5;

    const wallBody = new THREE.BoxGeometry(segLen, 1.45, 0.55);
    wallBody.translate(0, 0.725, 0);
    wallBody.rotateY(rotY);
    wallBody.translate(wx, 0, wz);
    wallPlasterGeos.push(wallBody);

    const frieze = new THREE.BoxGeometry(segLen + 0.04, 0.24, 0.6);
    frieze.translate(0, 1.55, 0);
    frieze.rotateY(rotY);
    frieze.translate(wx, 0, wz);
    wallMaroonGeos.push(frieze);

    const coping = new THREE.BoxGeometry(segLen + 0.1, 0.12, 0.68);
    coping.translate(0, 1.72, 0);
    coping.rotateY(rotY);
    coping.translate(wx, 0, wz);
    wallCapGeos.push(coping);
  }

  if (wallPlasterGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(wallPlasterGeos, false), plasterMat);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
  if (wallMaroonGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(wallMaroonGeos, false), crimsonTrimMat);
    m.castShadow = true;
    root.add(m);
  }
  if (wallCapGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(wallCapGeos, false), gateTileMat);
    m.castShadow = true;
    root.add(m);
  }

  // ---------------------------------------------------------------- 5. Sacred Cypress / Juniper Grove (`r = 26.5..32.5m`)
  const trunkGeos = [];
  const foliageDarkGeos = [];
  const foliageLightGeos = [];
  const treeCount = 20;

  for (let i = 0; i < treeCount; i++) {
    const a = (i / treeCount) * TWO_PI + (seededRandom(i * 5.7) - 0.5) * 0.12;
    const r = 26.8 + seededRandom(i * 13.1) * 5.2;
    const lx = Math.cos(a) * r;
    const lz = Math.sin(a) * r;

    // Keep North Gate processional path clear
    if (Math.abs(lx) < 5.5 && lz < -18) continue;
    // Keep Waypoint area (`(8, 14)`) clear
    if (Math.hypot(lx - 8, lz - 14) < 5.5) continue;

    const scale = 0.85 + seededRandom(i * 19.3) * 0.45;
    const trunkH = 2.2 * scale;
    const trunk = new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, trunkH, 7);
    trunk.translate(lx, trunkH * 0.5, lz);
    trunkGeos.push(trunk);

    const tier1 = new THREE.ConeGeometry(1.65 * scale, 2.8 * scale, 8);
    tier1.translate(lx, trunkH + 0.9 * scale, lz);
    foliageDarkGeos.push(tier1);

    const tier2 = new THREE.ConeGeometry(1.28 * scale, 2.4 * scale, 8);
    tier2.translate(lx, trunkH + 2.1 * scale, lz);
    foliageLightGeos.push(tier2);

    const tier3 = new THREE.ConeGeometry(0.85 * scale, 1.9 * scale, 7);
    tier3.translate(lx, trunkH + 3.2 * scale, lz);
    foliageDarkGeos.push(tier3);

    if (Array.isArray(colliders)) {
      colliders.push({
        type: 'circle',
        x: ox + lx,
        z: oz + lz,
        r: 0.6,
        zone: 'grove',
      });
    }
  }

  if (trunkGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(trunkGeos, false), gateWoodMat);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
  if (foliageDarkGeos.length) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2d4c36, roughness: 0.88 });
    const m = new THREE.Mesh(mergeGeometries(foliageDarkGeos, false), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
  if (foliageLightGeos.length) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3b6245, roughness: 0.85 });
    const m = new THREE.Mesh(mergeGeometries(foliageLightGeos, false), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }

  // ---------------------------------------------------------------- 6. Overhead 5-Color Prayer Flag Cords (`Lungta`)
  const flagsGroup = new THREE.Group();
  flagsGroup.name = 'GrovePrayerFlags';
  const cordMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
  const poleGeos = [];
  const flagBuckets = FLAG_COLORS.map(() => []);

  const poleCount = 8;
  const poleRadius = 24.2;
  for (let i = 0; i < poleCount; i++) {
    const ang = (i / poleCount) * TWO_PI + Math.PI / 8;
    const px = Math.cos(ang) * poleRadius;
    const pz = Math.sin(ang) * poleRadius;

    const pole = new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6);
    pole.translate(px, 2.1, pz);
    poleGeos.push(pole);

    const startPt = new THREE.Vector3(Math.cos(ang) * 4.85, 3.2, Math.sin(ang) * 4.85);
    const endPt = new THREE.Vector3(px, 3.95, pz);
    const dir = new THREE.Vector3().subVectors(endPt, startPt);
    const len = dir.length();

    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, len, 4), cordMat);
    cord.position.copy(startPt).addScaledVector(dir, 0.5);
    cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    flagsGroup.add(cord);

    const flagsPerCord = 15;
    for (let f = 0; f < flagsPerCord; f++) {
      const u = (f + 1) / (flagsPerCord + 1);
      const pos = new THREE.Vector3().lerpVectors(startPt, endPt, u);
      const fg = new THREE.PlaneGeometry(0.28, 0.32);
      fg.rotateY(-ang + Math.PI / 2);
      fg.translate(pos.x, pos.y - 0.16, pos.z);
      flagBuckets[(i + f) % FLAG_COLORS.length].push(fg);
    }
  }

  if (poleGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(poleGeos, false), gateWoodMat);
    m.castShadow = true;
    flagsGroup.add(m);
  }
  for (let c = 0; c < FLAG_COLORS.length; c++) {
    if (!flagBuckets[c].length) continue;
    const mat = new THREE.MeshBasicMaterial({
      color: FLAG_COLORS[c],
      side: THREE.DoubleSide,
    });
    flagsGroup.add(new THREE.Mesh(mergeGeometries(flagBuckets[c], false), mat));
  }
  root.add(flagsGroup);

  // ---------------------------------------------------------------- 7. Distant Kathmandu Valley Hills
  const hillSegs = 72;
  const hillInnerR = 92;
  const hillOuterR = 142;
  const hillPositions = [];
  const hillColors = [];
  const hillIndices = [];

  for (let i = 0; i <= hillSegs; i++) {
    const a = (i / hillSegs) * TWO_PI;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const ridge =
      12 +
      7.0 * Math.sin(a * 5.0 + 0.6) +
      4.5 * Math.cos(a * 9.0 - 1.1) +
      2.5 * Math.sin(a * 15.0 + 1.8);

    hillPositions.push(ca * hillInnerR, -0.5, sa * hillInnerR);
    hillColors.push(0.21, 0.29, 0.23);

    hillPositions.push(ca * hillOuterR, ridge, sa * hillOuterR);
    hillColors.push(0.25, 0.35, 0.3);

    if (i < hillSegs) {
      const b = i * 2;
      hillIndices.push(b, b + 2, b + 1);
      hillIndices.push(b + 1, b + 2, b + 3);
    }
  }

  const hillGeo = new THREE.BufferGeometry();
  hillGeo.setAttribute('position', new THREE.Float32BufferAttribute(hillPositions, 3));
  hillGeo.setAttribute('color', new THREE.Float32BufferAttribute(hillColors, 3));
  hillGeo.setIndex(hillIndices);
  hillGeo.computeVertexNormals();
  const hillMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  root.add(new THREE.Mesh(hillGeo, hillMat));

  return {
    group: root,
    getHeight: () => 0,
    update: () => {},
  };
}

export default createMap;
