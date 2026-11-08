import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Deterministic pseudo-random number generator with fixed seed.
 */
export function seededRandom(seed = 12345) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Push a collider tagged with `zone: mapId`.
 */
export function pushCollider(ctx, mapId, shape) {
  if (!ctx?.colliders || !shape) return;
  ctx.colliders.push({
    ...shape,
    zone: mapId,
  });
}

/**
 * Generate a seamless procedural ground micro-detail & bump CanvasTexture
 * in browser environments (`typeof document !== 'undefined'`).
 * Uses neutral warm-grey/white tones (`rgb(215..255)`) so it multiplies cleanly
 * with `vertexColors: true` while providing crisp `bumpMap` micro-relief.
 */
export function createGroundDetailTexture(seed = 4109) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const size = 128;
  const canvas = document.createElement('canvas');
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g || typeof g.fillRect !== 'function') return null;

  const rng = seededRandom(seed);
  g.fillStyle = 'rgb(238, 236, 232)';
  g.fillRect(0, 0, size, size);

  // Fine turf & wind-swept soil/stone striations (wrapped seamlessly across tile edges)
  for (let i = 0; i < 420; i++) {
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    const w = 2 + Math.floor(rng() * 6);
    const h = 1 + (rng() > 0.78 ? 1 : 0);
    const v = 216 + Math.floor(rng() * 36);
    const warm = Math.floor((rng() - 0.5) * 6);
    g.fillStyle = `rgb(${Math.min(255, v + warm)}, ${v}, ${Math.max(215, v - warm)})`;
    g.fillRect(x, y, w, h);
    if (x + w > size) g.fillRect(x - size, y, w, h);
    if (y + h > size) g.fillRect(x, y - size, w, h);
  }

  // Organic pebbles, soil grain & snow/quartz micro-specks
  for (let i = 0; i < 360; i++) {
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    const s = rng() > 0.82 ? 2 : 1;
    const isHighlight = rng() > 0.52;
    const v = isHighlight
      ? 244 + Math.floor(rng() * 12)
      : 215 + Math.floor(rng() * 18);
    g.fillStyle = `rgb(${v}, ${Math.max(215, v - 1)}, ${Math.max(215, v - 3)})`;
    g.fillRect(x, y, s, s);
    if (x + s > size) g.fillRect(x - size, y, s, s);
    if (y + s > size) g.fillRect(x, y - size, s, s);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(32, 32);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Create a subdivided heightfield terrain mesh with vertex colors and procedural micro-detail bump map.
 * Returns `{ mesh, getHeight }`.
 */
export function createHeightfieldTerrain(ctx, {
  origin = { x: 0, z: 0 },
  size = 180,
  segments = 96,
  heightFn = () => 0,
  colorFn = null,
} = {}) {
  const terrainGeo = new THREE.PlaneGeometry(size, size, segments, segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const vertexCount = posAttr.count;
  const colorAttr = new Float32Array(vertexCount * 3);

  const defaultCol = new THREE.Color(0x82845c);
  const tmpCol = new THREE.Color();

  for (let i = 0; i < vertexCount; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const wx = lx + origin.x;
    const wz = lz + origin.z;
    const y = heightFn(wx, wz);
    posAttr.setY(i, y);

    let c = defaultCol;
    if (typeof colorFn === 'function') {
      const res = colorFn(wx, wz, y, lx, lz);
      if (res instanceof THREE.Color) {
        c = res;
      } else if (typeof res === 'number') {
        c = tmpCol.setHex(res);
      } else if (res && typeof res.r === 'number') {
        c = res;
      }
    }

    colorAttr[i * 3 + 0] = c.r;
    colorAttr[i * 3 + 1] = c.g;
    colorAttr[i * 3 + 2] = c.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
  terrainGeo.computeVertexNormals();

  const detailTex = createGroundDetailTexture();
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
    ...(detailTex ? { map: detailTex, bumpMap: detailTex, bumpScale: 0.06 } : {}),
  });

  const mesh = new THREE.Mesh(terrainGeo, terrainMat);
  mesh.position.set(origin.x, 0, origin.z);
  mesh.receiveShadow = true;

  return { mesh, getHeight: heightFn };
}

/**
 * Build a stratified Himalayan crag boulder cluster prototype geometry
 * (main faceted crag + 2 basal companion stones) with vertex color shading.
 */
function buildStratifiedRockClusterGeometry() {
  const parts = [];

  // 1. Main multi-faceted stratified crag boulder
  const mainGeo = new THREE.DodecahedronGeometry(1, 1);
  const mPos = mainGeo.attributes.position;
  for (let v = 0; v < mPos.count; v++) {
    const vx = mPos.getX(v);
    const vy = mPos.getY(v);
    const vz = mPos.getZ(v);
    // Deterministic spatial displacement keeps shared vertices watertight
    const strata = Math.sin(vy * 7.5 + vx * 1.4) * 0.075;
    const crag = Math.cos(vx * 3.8 - vz * 3.4) * Math.sin(vy * 4.2 + vz * 2.7) * 0.09;
    const flattenBase = vy < -0.35 ? 0.72 : 1.0;
    const sx = (1.04 + strata + crag) * (vy > 0.25 ? 0.92 : 1.04);
    const sy = (0.88 + crag * 0.6) * flattenBase;
    const sz = (1.02 - strata * 0.7 + crag) * (vy > 0.25 ? 0.92 : 1.04);
    mPos.setXYZ(v, vx * sx, vy * sy, vz * sz);
  }
  mainGeo.computeVertexNormals();
  parts.push(mainGeo);

  // 2. Flanking basal companion stone A
  const subA = new THREE.DodecahedronGeometry(0.46, 0);
  const aPos = subA.attributes.position;
  for (let v = 0; v < aPos.count; v++) {
    const vx = aPos.getX(v);
    const vy = aPos.getY(v);
    const vz = aPos.getZ(v);
    const step = 1.0 + Math.sin(vy * 6.0 + vx * 2.5) * 0.08;
    aPos.setXYZ(v, vx * 1.15 * step + 0.62, vy * 0.74 - 0.34, vz * 0.96 * step + 0.36);
  }
  subA.computeVertexNormals();
  parts.push(subA);

  // 3. Flanking basal companion stone B
  const subB = new THREE.DodecahedronGeometry(0.36, 0);
  const bPos = subB.attributes.position;
  for (let v = 0; v < bPos.count; v++) {
    const vx = bPos.getX(v);
    const vy = bPos.getY(v);
    const vz = bPos.getZ(v);
    const step = 1.0 + Math.cos(vy * 5.5 - vz * 2.8) * 0.08;
    bPos.setXYZ(v, vx * 0.95 * step - 0.54, vy * 0.68 - 0.38, vz * 1.12 * step - 0.32);
  }
  subB.computeVertexNormals();
  parts.push(subB);

  const clusterGeo = mergeGeometries(parts, false);
  clusterGeo.computeVertexNormals();

  const cPos = clusterGeo.attributes.position;
  const cNorm = clusterGeo.attributes.normal;
  const cCols = new Float32Array(cPos.count * 3);

  for (let v = 0; v < cPos.count; v++) {
    const vx = cPos.getX(v);
    const vy = cPos.getY(v);
    const vz = cPos.getZ(v);
    const ny = cNorm.getY(v);
    const band = Math.sin(vy * 9.0 + vx * 2.2 - vz * 1.8) * 0.045;

    let r = 0.76 + band;
    let g = 0.75 + band;
    let b = 0.72 + band;

    if (vy < -0.22) {
      // Darker earthy/mossy base grounded in soil
      const t = Math.min(1, (-0.22 - vy) / 0.55);
      r = THREE.MathUtils.lerp(r, 0.46, t);
      g = THREE.MathUtils.lerp(g, 0.45, t);
      b = THREE.MathUtils.lerp(b, 0.39, t);
    }
    if (ny > 0.45) {
      // Pale alpine lichen / frost crest on upward-facing ledges
      const crest = Math.min(1, (ny - 0.45) / 0.48);
      r = THREE.MathUtils.lerp(r, 0.96, crest * 0.75);
      g = THREE.MathUtils.lerp(g, 0.97, crest * 0.75);
      b = THREE.MathUtils.lerp(b, 0.94, crest * 0.75);
    }

    cCols[v * 3 + 0] = r;
    cCols[v * 3 + 1] = g;
    cCols[v * 3 + 2] = b;
  }

  clusterGeo.setAttribute('color', new THREE.BufferAttribute(cCols, 3));
  return clusterGeo;
}

/**
 * Scatter stratified Himalayan crag boulders using InstancedMesh and register circle colliders.
 */
export function scatterRocks(ctx, group, {
  mapId = 'wild',
  origin = { x: 0, z: 0 },
  count = 20,
  rng = seededRandom(7789),
  area = { minR: 12, maxR: 58 },
  minRadius = 1.0,
  maxRadius = 2.2,
  minSpacing = 6,
  avoid = [],
  getHeight = () => 0,
  color = 0x6e6962,
} = {}) {
  const placed = [];
  let attempts = 0;
  const maxAttempts = count * 12;

  while (placed.length < count && attempts < maxAttempts) {
    attempts++;
    const a = rng() * Math.PI * 2;
    const minR = area.minR ?? 10;
    const maxR = area.maxR ?? 58;
    const rad = minR + rng() * (maxR - minR);
    const bx = origin.x + Math.cos(a) * rad;
    const bz = origin.z + Math.sin(a) * rad;

    let skip = false;
    for (let i = 0; i < avoid.length; i++) {
      const av = avoid[i];
      if (!av) continue;
      if (typeof av === 'function') {
        if (av(bx, bz)) { skip = true; break; }
      } else if (Math.hypot(bx - av.x, bz - av.z) < (av.r || 8)) {
        skip = true;
        break;
      }
    }
    if (skip) continue;

    for (let o = 0; o < placed.length; o++) {
      if (Math.hypot(bx - placed[o].x, bz - placed[o].z) < minSpacing) {
        skip = true;
        break;
      }
    }
    if (skip) continue;

    const r = minRadius + rng() * (maxRadius - minRadius);
    const by = getHeight(bx, bz);
    const rx = rng() * Math.PI;
    const ry = rng() * Math.PI;
    const sx = 1.0 + (rng() - 0.5) * 0.3;
    const sy = 0.82 + (rng() - 0.5) * 0.25;
    const sz = 1.0 + (rng() - 0.5) * 0.3;

    placed.push({ x: bx, y: by, z: bz, r, rx, ry, sx, sy, sz });

    pushCollider(ctx, mapId, {
      type: 'circle',
      x: bx,
      z: bz,
      r: r * 0.9,
    });
  }

  if (placed.length === 0) return { instanced: null, placed };

  const baseGeo = buildStratifiedRockClusterGeometry();
  const rockMat = new THREE.MeshStandardMaterial({
    color,
    vertexColors: true,
    roughness: 0.90,
    metalness: 0.05,
  });

  const instanced = new THREE.InstancedMesh(baseGeo, rockMat, placed.length);
  instanced.castShadow = true;
  instanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const instCol = new THREE.Color();
  const colRng = seededRandom(8421);

  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    dummy.position.set(p.x, p.y + p.r * 0.48, p.z);
    // Keep crag base grounded and frost/lichen crest facing skyward with natural tilt
    dummy.rotation.set((p.rx - Math.PI * 0.5) * 0.22, p.ry * 2.0, (p.rx - 1.5) * 0.16);
    dummy.scale.set(p.r * p.sx, p.r * p.sy, p.r * p.sz);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);

    const shade = 0.88 + colRng() * 0.24;
    const warm = (colRng() - 0.5) * 0.06;
    instCol.setRGB(
      THREE.MathUtils.clamp(shade + warm, 0.75, 1.15),
      THREE.MathUtils.clamp(shade, 0.75, 1.15),
      THREE.MathUtils.clamp(shade - warm, 0.75, 1.15)
    );
    instanced.setColorAt(i, instCol);
  }
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  if (group) group.add(instanced);

  return { instanced, placed };
}

export const scatterProps = scatterRocks;

/**
 * Create a single faceted Himalayan peak geometry with ridge/gully displacement
 * and slope + elevation-aware vertex coloring.
 */
export function buildHimalayanPeakGeometry(peakR, peakH, seedIdx = 0, snowLine = 0.44, radialSegs = 10, heightSegs = 5) {
  const cone = new THREE.ConeGeometry(peakR, peakH, radialSegs, heightSegs);
  const cPos = cone.attributes.position;
  const phase1 = seedIdx * 1.73;
  const phase2 = seedIdx * 2.91;

  for (let v = 0; v < cPos.count; v++) {
    const vx = cPos.getX(v);
    const vy = cPos.getY(v);
    const vz = cPos.getZ(v);
    const u = (vy + peakH * 0.5) / peakH; // 0 at base, 1 at summit

    if (u >= 0.98) {
      // Windswept asymmetric horn summit
      cPos.setXYZ(
        v,
        vx + Math.cos(phase1) * peakR * 0.08,
        vy,
        vz + Math.sin(phase2) * peakR * 0.08
      );
    } else if (u > 0.02) {
      // Integer angular frequencies keep UV seam vertices 100% watertight
      const theta = Math.atan2(vz, vx);
      const ridge5 = Math.cos(5 * theta + phase1);
      const gully3 = Math.sin(3 * theta - phase2);
      const terrace = Math.sin(u * Math.PI * 4 + seedIdx) * 0.06;
      const radialScale = 1.0 + (ridge5 * 0.16 + gully3 * 0.10 + terrace) * Math.sin(u * Math.PI * 0.92);
      const yLift = ridge5 * peakH * 0.035 * u * (1 - u);
      cPos.setXYZ(v, vx * radialScale, vy + yLift, vz * radialScale);
    }
  }

  cone.computeVertexNormals();
  const cNorm = cone.attributes.normal;
  const cCols = new Float32Array(cPos.count * 3);

  for (let v = 0; v < cPos.count; v++) {
    const vx = cPos.getX(v);
    const vy = cPos.getY(v);
    const vz = cPos.getZ(v);
    const ny = cNorm.getY(v);
    const u = THREE.MathUtils.clamp((vy + peakH * 0.5) / peakH, 0, 1);
    const theta = Math.atan2(vz, vx);
    const ridgeFactor = Math.cos(5 * theta + phase1);

    // Snow line dips into gullies and rises on sheer rock faces
    const localSnowLine = snowLine - ridgeFactor * 0.055 - Math.max(0, ny - 0.35) * 0.08;

    let r;
    let g;
    let b;
    if (u >= localSnowLine) {
      // Gleaming snow ridges & glacial blue-white gullies
      const snowT = THREE.MathUtils.clamp((u - localSnowLine) / Math.max(0.12, 1 - localSnowLine), 0, 1);
      const sunExpose = THREE.MathUtils.clamp(0.5 + ridgeFactor * 0.35 + ny * 0.25, 0, 1);
      r = THREE.MathUtils.lerp(0.76, 0.96, sunExpose * 0.7 + snowT * 0.3);
      g = THREE.MathUtils.lerp(0.84, 0.98, sunExpose * 0.7 + snowT * 0.3);
      b = THREE.MathUtils.lerp(0.95, 1.00, sunExpose * 0.7 + snowT * 0.3);
    } else if (u >= localSnowLine - 0.13) {
      // Frost-streaked alpine scree transition zone
      const screeT = (u - (localSnowLine - 0.13)) / 0.13;
      r = THREE.MathUtils.lerp(0.32, 0.68, screeT);
      g = THREE.MathUtils.lerp(0.34, 0.73, screeT);
      b = THREE.MathUtils.lerp(0.38, 0.80, screeT);
    } else {
      // Dark Himalayan granite & slate lower cliffs
      const cliffShade = THREE.MathUtils.clamp(0.19 + u * 0.28 + ridgeFactor * 0.04, 0.16, 0.38);
      r = cliffShade * 0.94;
      g = cliffShade * 0.98;
      b = cliffShade * 1.06;
    }

    cCols[v * 3 + 0] = r;
    cCols[v * 3 + 1] = g;
    cCols[v * 3 + 2] = b;
  }

  cone.setAttribute('color', new THREE.BufferAttribute(cCols, 3));
  return cone;
}

/**
 * Add a distant multi-layered ring of faceted Himalayan mountain peaks around `origin`.
 */
export function addRimMountains(ctxOrGroup, groupOrOpts, maybeOpts = {}) {
  let group = groupOrOpts;
  let opts = maybeOpts;
  if (ctxOrGroup && typeof ctxOrGroup.add === 'function') {
    group = ctxOrGroup;
    opts = groupOrOpts || {};
  }
  const {
    origin = { x: 0, z: 0 },
    innerR = 125,
    outerR = 180,
    count = 24,
    heightRange = [38, 75],
    snowLine = 0.44,
  } = opts || {};
  const mountainGeos = [];
  const minH = heightRange[0] ?? 38;
  const maxH = heightRange[1] ?? 75;

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const dist = innerR + ((i * 37) % 19) * ((outerR - innerR) / 25);
    const px = origin.x + Math.cos(a) * dist;
    const pz = origin.z + Math.sin(a) * dist;
    const peakH = minH + ((i * 53) % 29) * ((maxH - minH) / 28);
    const peakR = 24 + ((i * 17) % 11) * 1.4;

    // Primary jagged Himalayan peak
    const cone = buildHimalayanPeakGeometry(peakR, peakH, i, snowLine, 10, 5);
    cone.rotateY((i * 1.7) % (Math.PI * 2));
    cone.translate(px, peakH * 0.5 - 2, pz);
    mountainGeos.push(cone);

    // Secondary flanking spur / foothill ridge for layered depth
    const spurAngle = a + (((i % 2 === 0) ? 1 : -1) * (0.075 + ((i * 13) % 7) * 0.008));
    const spurDist = Math.max(innerR - 6, dist - 7 + ((i * 11) % 9));
    const spurH = peakH * (0.54 + ((i * 19) % 11) * 0.015);
    const spurR = peakR * 0.66;
    const spur = buildHimalayanPeakGeometry(spurR, spurH, i + 101, Math.min(0.82, snowLine + 0.08), 8, 4);
    spur.rotateY(((i + 5) * 2.1) % (Math.PI * 2));
    spur.translate(
      origin.x + Math.cos(spurAngle) * spurDist,
      spurH * 0.5 - 2.5,
      origin.z + Math.sin(spurAngle) * spurDist
    );
    mountainGeos.push(spur);
  }

  if (mountainGeos.length && group) {
    const mMeshGeo = mergeGeometries(mountainGeos, false);
    const mMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.90,
      metalness: 0.03,
    });
    const mMesh = new THREE.Mesh(mMeshGeo, mMat);
    group.add(mMesh);
    return mMesh;
  }
  return null;
}

/**
 * Append ornate traditional Tibetan gate arch geometries into the 5 material buckets:
 * `{ gPlaster, gMaroon, gWood, gTile, gGold }`.
 */
export function populateTibetanGateGeometries({
  gPlaster,
  gMaroon,
  gWood,
  gTile,
  gGold,
  gPillarX = 2.2,
  gPillarH = 3.4,
}) {
  // 1. Stepped stone threshold paving slab & border curbs on the ground
  const thresholdSlab = new THREE.BoxGeometry(5.6, 0.08, 1.38);
  thresholdSlab.translate(0, 0.04, 0);
  gPlaster.push(thresholdSlab);

  const thresholdStep = new THREE.BoxGeometry(3.5, 0.05, 1.66);
  thresholdStep.translate(0, 0.025, 0);
  gTile.push(thresholdStep);

  for (const s of [-1, 1]) {
    const px = s * gPillarX;

    // Stepped stone foundation plinth
    const lowerFoot = new THREE.BoxGeometry(1.04, 0.14, 1.04);
    lowerFoot.translate(px, 0.07, 0);
    gTile.push(lowerFoot);

    const base = new THREE.BoxGeometry(0.88, 0.45, 0.88);
    base.translate(px, 0.225, 0);
    gPlaster.push(base);

    const band = new THREE.BoxGeometry(0.82, 0.12, 0.82);
    band.translate(px, 0.51, 0);
    gMaroon.push(band);

    // Tapered whitewashed Tibetan pillar shaft
    const shaft = new THREE.BoxGeometry(0.68, gPillarH - 0.7, 0.68);
    shaft.translate(px, 0.57 + (gPillarH - 0.7) * 0.5, 0);
    gPlaster.push(shaft);

    // Timber niche & flanking mini prayer wheel (轉經筒) on inner pillar face
    const nicheFrame = new THREE.BoxGeometry(0.14, 0.56, 0.74);
    nicheFrame.translate(px - s * 0.31, 1.65, 0);
    gWood.push(nicheFrame);

    const pWheel = new THREE.CylinderGeometry(0.10, 0.10, 0.38, 10);
    pWheel.translate(px - s * 0.35, 1.65, 0);
    gGold.push(pWheel);

    const neck = new THREE.BoxGeometry(0.78, 0.14, 0.78);
    neck.translate(px, gPillarH - 0.07, 0);
    gMaroon.push(neck);

    const cap = new THREE.BoxGeometry(0.86, 0.12, 0.86);
    cap.translate(px, gPillarH + 0.06, 0);
    gGold.push(cap);

    // Carved Tibetan corbel brackets (雀替 / 弓木) supporting the lintel
    const corbelLower = new THREE.BoxGeometry(1.26, 0.14, 0.78);
    corbelLower.translate(px - s * 0.12, gPillarH - 0.18, 0);
    gWood.push(corbelLower);

    const corbelUpper = new THREE.BoxGeometry(1.62, 0.16, 0.84);
    corbelUpper.translate(px - s * 0.18, gPillarH + 0.14, 0);
    gWood.push(corbelUpper);
  }

  // Main timber lintel beam
  const gLintel = new THREE.BoxGeometry(5.6, 0.36, 0.76);
  gLintel.translate(0, gPillarH + 0.30, 0);
  gWood.push(gLintel);

  // Projecting Tibetan rafter tails (椽木) above the lintel
  for (let rIdx = -4; rIdx <= 4; rIdx++) {
    const rafter = new THREE.BoxGeometry(0.11, 0.09, 1.06);
    rafter.translate(rIdx * 0.58, gPillarH + 0.48, 0);
    gWood.push(rafter);
  }

  // Maroon Penma frieze band (邊瑪牆)
  const gBrackets = new THREE.BoxGeometry(5.8, 0.28, 0.92);
  gBrackets.translate(0, gPillarH + 0.62, 0);
  gMaroon.push(gBrackets);

  // Whitewashed cornice trim above Penma frieze
  const cornice = new THREE.BoxGeometry(6.0, 0.08, 1.02);
  cornice.translate(0, gPillarH + 0.78, 0);
  gPlaster.push(cornice);

  // Burnished golden mirror bosses (圓鏡銅飾) along the Penma frieze
  for (const bx of [-2.0, -1.15, 0, 1.15, 2.0]) {
    const boss = new THREE.CylinderGeometry(0.09, 0.09, 0.96, 10);
    boss.rotateX(Math.PI / 2);
    boss.translate(bx, gPillarH + 0.62, 0);
    gGold.push(boss);
  }

  // Inscription plaques on both faces (-Z and +Z)
  for (const faceZ of [-1, 1]) {
    const gPlaque = new THREE.BoxGeometry(2.4, 0.55, 0.10);
    gPlaque.translate(0, gPillarH + 0.30, faceZ * 0.41);
    gMaroon.push(gPlaque);

    const gPlaqueRim = new THREE.BoxGeometry(2.48, 0.62, 0.07);
    gPlaqueRim.translate(0, gPillarH + 0.30, faceZ * 0.39);
    gGold.push(gPlaqueRim);
  }

  // Multi-tier Tibetan roof slabs with upturned eaves & golden Makara tips
  const gRoof1 = new THREE.BoxGeometry(6.4, 0.20, 1.45);
  gRoof1.translate(0, gPillarH + 0.86, 0);
  gTile.push(gRoof1);

  const gRoof2 = new THREE.BoxGeometry(5.0, 0.28, 1.15);
  gRoof2.translate(0, gPillarH + 1.10, 0);
  gTile.push(gRoof2);

  for (const s of [-1, 1]) {
    // Upturned eaves on lower roof tier
    const eave1 = new THREE.BoxGeometry(0.52, 0.16, 1.50);
    eave1.rotateZ(s * 0.24);
    eave1.translate(s * 3.22, gPillarH + 0.93, 0);
    gTile.push(eave1);

    const makara1 = new THREE.BoxGeometry(0.18, 0.18, 0.22);
    makara1.translate(s * 3.42, gPillarH + 1.04, 0);
    gGold.push(makara1);

    // Upturned eaves on upper roof tier
    const eave2 = new THREE.BoxGeometry(0.44, 0.18, 1.20);
    eave2.rotateZ(s * 0.26);
    eave2.translate(s * 2.52, gPillarH + 1.18, 0);
    gTile.push(eave2);

    const makara2 = new THREE.BoxGeometry(0.16, 0.18, 0.20);
    makara2.translate(s * 2.68, gPillarH + 1.29, 0);
    gGold.push(makara2);

    // Flanking kneeling golden deer (法輪雙鹿)
    const dBody = new THREE.BoxGeometry(0.38, 0.24, 0.16);
    dBody.translate(s * 0.68, gPillarH + 1.36, 0);
    gGold.push(dBody);

    const dHead = new THREE.BoxGeometry(0.14, 0.22, 0.14);
    dHead.translate(s * 0.52, gPillarH + 1.54, 0);
    gGold.push(dHead);
  }

  // Central Dharma Wheel (法輪) & lotus pedestal
  const wheelPedestal = new THREE.BoxGeometry(0.54, 0.12, 0.24);
  wheelPedestal.translate(0, gPillarH + 1.28, 0);
  gGold.push(wheelPedestal);

  const gWheel = new THREE.CylinderGeometry(0.36, 0.36, 0.10, 16);
  gWheel.rotateX(Math.PI / 2);
  gWheel.translate(0, gPillarH + 1.58, 0);
  gGold.push(gWheel);

  const gWheelHub = new THREE.SphereGeometry(0.12, 10, 8);
  gWheelHub.translate(0, gPillarH + 1.58, 0);
  gGold.push(gWheelHub);
}

/**
 * Build a traditional Tibetan return gate mesh & pillar colliders at `(x, z)`.
 */
export function buildGateArch(ctx, group, {
  mapId = 'wild',
  x = 0,
  z = 0,
  y = 0,
} = {}) {
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xede6d8, roughness: 0.90 });
  const maroonMat = new THREE.MeshStandardMaterial({ color: 0x7c1e19, roughness: 0.72 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2417, roughness: 0.80 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x48413b, roughness: 0.76 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5bf42, roughness: 0.28, metalness: 0.84 });

  const gateGroup = new THREE.Group();
  gateGroup.name = 'ReturnMountainGate';
  gateGroup.position.set(x, y, z);

  const gPlaster = [];
  const gMaroon = [];
  const gWood = [];
  const gTile = [];
  const gGold = [];

  const gPillarX = 2.2;
  const gPillarH = 3.4;

  populateTibetanGateGeometries({
    gPlaster,
    gMaroon,
    gWood,
    gTile,
    gGold,
    gPillarX,
    gPillarH,
  });

  for (const s of [-1, 1]) {
    pushCollider(ctx, mapId, {
      type: 'circle',
      x: x + s * gPillarX,
      z,
      r: 0.55,
    });
  }

  for (const [geos, mat, recv] of [
    [gPlaster, plasterMat, true],
    [gMaroon, maroonMat, true],
    [gWood, woodMat, true],
    [gTile, tileMat, true],
    [gGold, goldMat, false],
  ]) {
    if (geos.length) {
      const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
      m.castShadow = true;
      m.receiveShadow = recv;
      gateGroup.add(m);
    }
  }

  if (group) group.add(gateGroup);
  return gateGroup;
}
