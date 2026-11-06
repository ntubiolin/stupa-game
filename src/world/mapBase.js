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
 * Create a subdivided heightfield terrain mesh with vertex colors.
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

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });

  const mesh = new THREE.Mesh(terrainGeo, terrainMat);
  mesh.position.set(origin.x, 0, origin.z);
  mesh.receiveShadow = true;

  return { mesh, getHeight: heightFn };
}

/**
 * Scatter low-poly rocks using InstancedMesh and register circle colliders.
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

  const baseGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0.04,
  });

  const instanced = new THREE.InstancedMesh(baseGeo, rockMat, placed.length);
  instanced.castShadow = true;
  instanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    dummy.position.set(p.x, p.y + p.r * 0.55, p.z);
    dummy.rotation.set(p.rx, p.ry, 0);
    dummy.scale.set(p.r * p.sx, p.r * p.sy, p.r * p.sz);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);
  }
  instanced.instanceMatrix.needsUpdate = true;
  if (group) group.add(instanced);

  return { instanced, placed };
}

export const scatterProps = scatterRocks;

/**
 * Add a distant ring of mountain peaks around `origin`.
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

    const cone = new THREE.ConeGeometry(peakR, peakH, 6, 2);
    const cPos = cone.attributes.position;
    const cCols = new Float32Array(cPos.count * 3);

    for (let v = 0; v < cPos.count; v++) {
      const vy = cPos.getY(v) + peakH * 0.5;
      const isSnow = vy > peakH * snowLine;
      if (isSnow) {
        cCols[v * 3 + 0] = 0.90;
        cCols[v * 3 + 1] = 0.94;
        cCols[v * 3 + 2] = 0.99;
      } else {
        cCols[v * 3 + 0] = 0.28;
        cCols[v * 3 + 1] = 0.30;
        cCols[v * 3 + 2] = 0.32;
      }
    }
    cone.setAttribute('color', new THREE.BufferAttribute(cCols, 3));
    cone.translate(px, peakH * 0.5 - 2, pz);
    cone.rotateY((i * 1.7) % Math.PI);
    mountainGeos.push(cone);
  }

  if (mountainGeos.length && group) {
    const mMeshGeo = mergeGeometries(mountainGeos, false);
    const mMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
    });
    const mMesh = new THREE.Mesh(mMeshGeo, mMat);
    group.add(mMesh);
    return mMesh;
  }
  return null;
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

  for (const s of [-1, 1]) {
    const px = s * gPillarX;
    const base = new THREE.BoxGeometry(0.88, 0.45, 0.88);
    base.translate(px, 0.225, 0);
    gPlaster.push(base);

    const band = new THREE.BoxGeometry(0.82, 0.12, 0.82);
    band.translate(px, 0.51, 0);
    gMaroon.push(band);

    const shaft = new THREE.BoxGeometry(0.68, gPillarH - 0.7, 0.68);
    shaft.translate(px, 0.57 + (gPillarH - 0.7) * 0.5, 0);
    gPlaster.push(shaft);

    const neck = new THREE.BoxGeometry(0.78, 0.14, 0.78);
    neck.translate(px, gPillarH - 0.07, 0);
    gMaroon.push(neck);

    const cap = new THREE.BoxGeometry(0.86, 0.12, 0.86);
    cap.translate(px, gPillarH + 0.06, 0);
    gGold.push(cap);

    pushCollider(ctx, mapId, {
      type: 'circle',
      x: x + px,
      z,
      r: 0.55,
    });
  }

  const gLintel = new THREE.BoxGeometry(5.6, 0.36, 0.76);
  gLintel.translate(0, gPillarH + 0.30, 0);
  gWood.push(gLintel);

  const gBrackets = new THREE.BoxGeometry(5.8, 0.26, 0.92);
  gBrackets.translate(0, gPillarH + 0.61, 0);
  gMaroon.push(gBrackets);

  const gPlaque = new THREE.BoxGeometry(2.4, 0.55, 0.12);
  gPlaque.translate(0, gPillarH + 0.30, -0.42);
  gMaroon.push(gPlaque);

  const gPlaqueRim = new THREE.BoxGeometry(2.48, 0.62, 0.08);
  gPlaqueRim.translate(0, gPillarH + 0.30, -0.40);
  gGold.push(gPlaqueRim);

  const gRoof1 = new THREE.BoxGeometry(6.4, 0.20, 1.45);
  gRoof1.translate(0, gPillarH + 0.84, 0);
  gTile.push(gRoof1);

  const gRoof2 = new THREE.BoxGeometry(5.0, 0.28, 1.15);
  gRoof2.translate(0, gPillarH + 1.08, 0);
  gTile.push(gRoof2);

  const gWheel = new THREE.CylinderGeometry(0.36, 0.36, 0.10, 16);
  gWheel.rotateX(Math.PI / 2);
  gWheel.translate(0, gPillarH + 1.55, 0);
  gGold.push(gWheel);

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
