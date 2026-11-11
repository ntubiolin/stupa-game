import * as THREE from 'three';
import { createHeightfieldTerrain, pushCollider, seededRandom } from '../mapBase.js';
import { addCypressBarkRoof, addGraniteGroups, addRakedGravel, createCypressBarkMaterial } from '../japanGardenArchitecture.js';
import { QINGLONG_MAP, KII_MAP, KONGOBUJI_MAP, OKUNOIN_MAP } from '../../data/maps/japanPilgrimage.js';

const TAU = Math.PI * 2;
const { clamp, smoothstep } = THREE.MathUtils;

// Keep village architecture, small scenery, and grove canopies in shared instanced batches.
function createPrecinct(ctx, map, { height, groundHeight = height, paint, seed }) {
  const { id, origin } = map;
  const group = ctx.zoneGroups?.[id] ?? new THREE.Group();
  if (!ctx.zoneGroups?.[id]) ctx.scene?.add(group);
  const root = new THREE.Group();
  root.name = id + '-precinct';
  root.position.set(origin.x, 0, origin.z);
  group.add(root);

  const getHeight = (x, z) => height(x - origin.x, z - origin.z);
  const terrain = createHeightfieldTerrain(ctx, {
    origin, size: 184, segments: 132, heightFn: (x, z) => groundHeight(x - origin.x, z - origin.z),
    colorFn: (_x, _z, y, x, z) => paint(x, z, y),
  }).mesh;
  terrain.name = id + '-terrain';
  group.add(terrain);

  const shapes = {
    box: new THREE.BoxGeometry(),
    cedar: new THREE.ConeGeometry(0.5, 1, 8),
    column: new THREE.CylinderGeometry(0.39, 0.5, 1, 8),
    stone: new THREE.DodecahedronGeometry(0.6, 0),
    sphere: new THREE.IcosahedronGeometry(0.5, 1),
  };
  const materials = {
    stone: 0x797870, moss: 0x5a6d40, path: 0x9c9684, lime: 0xe4d4b6, bark: 0x524238,
    pine: 0x254b3f, youngPine: 0x39624b, leaf: 0x6c804c, rust: 0xae5041, rose: 0xcf7f83,
    darkWood: 0x49322c, wood: 0x956346, red: 0xa33b2e, gold: 0xcb9b44, jade: 0x448278,
    tile: 0x303743, tileEdge: 0x485462, weatheredWood: 0x7c6c56, beam: 0x53483c,
    water: 0x497884, foam: 0xb5d3d1, sail: 0xe4d5ab,
    lamp: { color: 0xffc66a, emissive: 0xff9238, emissiveIntensity: 0.7 },
  };
  const rng = seededRandom(seed);
  const batches = new Map();
  const colliders = [];
  const matrixDummy = new THREE.Object3D();

  function part(shape, mat, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
    const key = shape + '/' + mat;
    if (!batches.has(key)) batches.set(key, { shape, mat, matrices: [] });
    matrixDummy.position.set(x, y, z);
    matrixDummy.scale.set(sx, sy, sz);
    matrixDummy.rotation.set(rx, ry, rz);
    matrixDummy.updateMatrix();
    batches.get(key).matrices.push(matrixDummy.matrix.clone());
  }

  function collider(data) {
    colliders.push({ ...data, zone: id });
    pushCollider(ctx, id, data);
  }

  function circle(x, z, r) {
    collider({ type: 'circle', x: origin.x + x, z: origin.z + z, r });
  }

  function block(x, z, hx, hz) {
    collider({
      type: 'box',
      minX: origin.x + x - hx,
      maxX: origin.x + x + hx,
      minZ: origin.z + z - hz,
      maxZ: origin.z + z + hz,
    });
  }

  function finish() {
    for (const { shape, mat, matrices } of batches.values()) {
      const definition = materials[mat];
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.83,
        ...(typeof definition === 'number' ? { color: definition } : definition),
      });
      const mesh = new THREE.InstancedMesh(shapes[shape], material, matrices.length);
      mesh.name = id + '-' + shape + '-' + mat;
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.castShadow = !['water', 'foam', 'path'].includes(mat);
      mesh.receiveShadow = true;
      root.add(mesh);
    }
    for (const [shape, geometry] of Object.entries(shapes)) {
      if (![...batches.values()].some(batch => batch.shape === shape)) geometry.dispose();
    }
    return { group, root, colliders, getHeight, update() {} };
  }

  return { root, part, circle, block, height, rng, finish };
}

function terrainPaint(colors, pathDistance) {
  const [offPath, ground, border] = colors.map(color => new THREE.Color(color));
  const color = new THREE.Color();
  return (x, z) => {
    const distance = pathDistance(x, z);
    color.lerpColors(ground, offPath, smoothstep(distance, 1.9, 5.4));
    color.lerp(border, smoothstep(Math.hypot(x, z), 43, 86) * 0.45);
    const mottling = Math.sin(x * 0.75 + z * 0.17) * Math.cos(z * 0.65) * 0.08
      + Math.sin(x * 0.22 + z * 0.29) * 0.055;
    return color.multiplyScalar(1 + mottling);
  };
}

// Tile courses follow a pitched roof, with the eaves lifting toward both ends.
function roof(scene, x, y, z, width, depth, rise, color = 'tile') {
  const { part } = scene;
  const rows = 6;
  const run = depth / 2;
  const slope = Math.atan2(rise, run);
  for (const side of [-1, 1]) {
    for (let row = 0; row < rows; row++) {
      const t = (row + 0.5) / rows;
      part('box', color, x, y + rise * (1 - t), z + side * run * t,
        width * (0.91 + 0.09 * t), 0.16, Math.hypot(run, rise) / rows + 0.12, 0, side * slope);
      const tiles = Math.ceil(width / 0.45);
      for (let col = 1; col < tiles; col++) {
        const u = col / tiles - 0.5;
        part('box', 'tileEdge', x + u * width * (0.91 + 0.09 * t), y + rise * (1 - t) + 0.10,
          z + side * run * t, 0.11, 0.10, Math.hypot(run, rise) / rows + 0.04, 0, side * slope);
      }
    }
    part('box', 'tileEdge', x, y + 0.02, z + side * run, width, 0.25, 0.27);
    for (const end of [-1, 1]) {
      part('box', 'tileEdge', x + end * width * 0.49, y + 0.26, z + side * run,
        1.65, 0.23, 0.31, 0, 0, end * 0.32);
    }
  }
  part('box', 'tileEdge', x, y + rise + 0.05, z, width * 0.92, 0.29, 0.32);
  for (const end of [-1, 1]) {
    part('stone', 'gold', x + end * width * 0.44, y + rise + 0.35, z, 0.38, 0.86, 0.47, 0, 0, end * 0.33);
  }
}

function tiledGate(scene, x, z, width = 5, height = 4.2, post = 'red') {
  const { part, circle } = scene;
  const y = scene.height(x, z);
  for (const side of [-1, 1]) {
    const px = x + side * width * 0.42;
    part('box', 'stone', px, y + 0.20, z, 0.88, 0.40, 0.88);
    part('column', post, px, y + height / 2, z, 0.58, height, 0.58);
    part('box', 'jade', px, y + height - 0.37, z, 1.02, 0.25, 0.90);
    circle(px, z, 0.46);
  }
  part('box', post, x, y + height - 0.64, z, width, 0.24, 0.49);
  part('box', 'darkWood', x, y + height - 0.11, z, width + 0.5, 0.37, 0.74);
  roof(scene, x, y + height + 0.05, z, width + 1.55, 2.6, 0.63);
}

function hall(scene, x, z, width, depth, { tang = false, passage = false } = {}) {
  const { part, block, height } = scene;
  const y = height(x, z);
  const posts = tang ? 'red' : 'darkWood';
  const top = tang ? 6.6 : 5.4;
  if (!passage) {
    part('box', 'stone', x, y + 0.29, z, width + 1, 0.58, depth + 1);
    for (let i = 0; i < 3; i++) {
      part('box', 'path', x, y + 0.1 + i * 0.08, z + depth / 2 + 1.4 - i * 0.35, 5.2, 0.2 + i * 0.16, 0.43);
    }
    part('box', 'lime', x, y + top / 2, z, width - 0.35, top - 0.8, depth - 0.55);
    block(x, z, width / 2 + 0.5, depth / 2 + 0.5);
  }

  for (const side of [-1, 1]) {
    const face = z + side * depth / 2;
    for (let i = 0; i <= 6; i++) {
      const px = x + (i / 6 - 0.5) * width;
      if (passage && Math.abs(px - x) < 2.9) continue;
      part('column', posts, px, y + top * 0.5, face, 0.57, top, 0.57);
      part('box', tang ? 'jade' : 'wood', px, y + top - 0.42, face, 1.18, 0.28, 0.78);
      if (i === 6 || passage) continue;
      const bay = px + width / 12;
      part('box', posts, bay, y + 2.36, face + side * 0.025, width / 6 - 0.31, 3.4, 0.12);
      if (tang) {
        for (let bar = -2; bar <= 2; bar++) {
          part('box', 'gold', bay + bar * width / 50, y + 3.35, face + side * 0.11, 0.07, 1.08, 0.075);
        }
        part('box', 'gold', bay, y + 3.32, face + side * 0.11, width / 7, 0.08, 0.075);
      } else {
        part('box', 'lime', bay, y + 2.74, face + side * 0.12, width / 6 - 0.55, 1.76, 0.075);
        for (let bar = -2; bar <= 2; bar++) {
          part('box', posts, bay + bar * width / 50, y + 2.74, face + side * 0.16, 0.06, 1.76, 0.05);
        }
        for (const rail of [2.2, 2.74, 3.28]) {
          part('box', posts, bay, y + rail, face + side * 0.16, width / 6 - 0.55, 0.065, 0.05);
        }
      }
    }
  }
  if (passage) {
    for (const side of [-1, 1]) {
      for (const pz of [z - depth / 2, z + depth / 2]) {
        for (const px of [width / 3, width / 2]) scene.circle(x + side * px, pz, 0.44);
      }
      block(x + side * width / 2, z, 0.25, depth / 2);
    }
  }
  part('box', posts, x, y + top - 0.15, z, width + 0.65, 0.39, depth + 0.6);
  roof(scene, x, y + top + 0.07, z, width + 3.3, depth + 2.8, tang ? 2.7 : 2.2);
  if (tang) {
    part('box', 'red', x, y + top + 2.58, z, width * 0.46, 0.7, 2);
    roof(scene, x, y + top + 2.95, z, width * 0.56, 4.1, 1.3);
  }
}

function lantern(scene, x, z, scale = 1, wood = false) {
  const { part, height, circle } = scene;
  const y = height(x, z);
  const shell = wood ? 'darkWood' : 'stone';
  part('box', shell, x, y + 0.13 * scale, z, 0.72 * scale, 0.26 * scale, 0.72 * scale);
  part('column', shell, x, y + 0.69 * scale, z, 0.41 * scale, 1.04 * scale, 0.41 * scale);
  part('box', 'lamp', x, y + 1.30 * scale, z, 0.46 * scale, 0.43 * scale, 0.46 * scale);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      part('box', shell, x + sx * 0.24 * scale, y + 1.29 * scale, z + sz * 0.24 * scale,
        0.11 * scale, 0.59 * scale, 0.11 * scale);
    }
  }
  part('cedar', shell, x, y + 1.68 * scale, z, 1.05 * scale, 0.39 * scale, 1.05 * scale, Math.PI / 4);
  part('sphere', shell, x, y + 1.91 * scale, z, 0.27 * scale, 0.25 * scale, 0.27 * scale);
  circle(x, z, 0.38 * scale);
}

function cedar(scene, x, z, height, radius, solid = true) {
  const y = scene.height(x, z);
  scene.part('column', 'bark', x, y + height * 0.45, z, radius, height * 0.9, radius);
  for (let layer = 0; layer < 4; layer++) {
    const crown = radius * (6.3 - layer);
    const shift = (scene.rng() - 0.5) * radius;
    scene.part('cedar', layer % 2 ? 'youngPine' : 'pine', x + shift, y + height * (0.57 + layer * 0.11), z,
      crown, height * 0.32, crown * 0.91, scene.rng() * TAU, 0, 0.045);
  }
  if (solid) scene.circle(x, z, radius * 0.55);
}

function copse(scene, count, reserve) {
  for (let i = 0; i < count * 3 && count > 0; i++) {
    const x = (scene.rng() - 0.5) * 160;
    const z = (scene.rng() - 0.5) * 160;
    if (reserve(x, z)) continue;
    cedar(scene, x, z, 10 + scene.rng() * 14, 0.74 + scene.rng() * 0.66, Math.hypot(x, z) < 75);
    count--;
  }
}

function flagstones(scene, xAt, start, end, width, step = 2.25) {
  for (let z = start; z <= end; z += step) {
    const x = xAt(z);
    const offsets = [-0.30, 0.03, 0.36];
    for (const offset of offsets) {
      const px = x + offset * width;
      scene.part('box', 'path', px, scene.height(px, z) + 0.035, z,
        width * (0.23 + scene.rng() * 0.08), 0.13, step * (0.67 + scene.rng() * 0.18),
        (scene.rng() - 0.5) * 0.19);
    }
  }
}

function stoneMarker(scene, x, z, scale = 1) {
  const { part, height } = scene;
  const y = height(x, z);
  const ry = (scene.rng() - 0.5) * 0.42;
  part('box', 'moss', x, y + 0.14 * scale, z, 0.93 * scale, 0.28 * scale, 0.87 * scale, ry);
  part('box', 'stone', x, y + 0.43 * scale, z, 0.72 * scale, 0.32 * scale, 0.71 * scale, ry);
  part('sphere', 'stone', x, y + 0.84 * scale, z, 0.81 * scale, 0.72 * scale, 0.81 * scale, ry);
  part('box', 'stone', x, y + 1.24 * scale, z, 0.68 * scale, 0.18 * scale, 0.68 * scale, ry);
  part('stone', 'stone', x, y + 1.44 * scale, z, 0.43 * scale, 0.39 * scale, 0.43 * scale, ry);
  scene.circle(x, z, 0.46 * scale);
}

export function createQinglongMap(ctx) {
  const coast = z => 4.8 * smoothstep(-z, 33, 47) - 12 * smoothstep(-z, 59, 72);
  const scene = createPrecinct(ctx, QINGLONG_MAP, {
    seed: 804,
    height: (x, z) => coast(z) + 1.8 * smoothstep(Math.abs(x), 34, 73) * Math.cos(z * 0.07),
    paint: terrainPaint([0x89855e, 0xb5a586, 0x9a7864], (x, z) => Math.max(0, Math.abs(x) - (z > 3 ? 13 : 1))),
  });
  const { part, height, block, circle, rng } = scene;

  // Tang temple's initiation terrace and sheltered side galleries.
  hall(scene, 0, -6, 24, 13, { tang: true });
  for (const x of [-21, 21]) {
    hall(scene, x, 11, 7.5, 12, { tang: true });
    for (const z of [27, 40]) lantern(scene, x, z, 1.4, true);
  }
  tiledGate(scene, 0, 50, 7.3, 5.4);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const x = side * (6.1 + i * 3.8);
      const y = height(x, 43);
      part('box', 'lime', x, y + 1.1, 43, 3.85, 2.2, 0.55);
      part('box', 'tile', x, y + 2.25, 43, 3.95, 0.26, 0.93);
      block(x, 43, 1.92, 0.29);
    }
  }
  for (const x of [-15, 15]) {
    flagstones(scene, () => x, -48, 37, 2.9);
    for (const z of [-30, -13, 10, 31]) {
      lantern(scene, x + Math.sign(x) * 2, z, 1.22, true);
    }
  }
  flagstones(scene, () => 0, 15, 48, 5.0);
  flagstones(scene, () => 0, -57, -35, 5.0);
  for (const x of [-12, 12]) {
    for (const z of [2, 32]) {
      const y = height(x, z);
      part('column', 'bark', x, y + 2.8, z, 0.75, 5.6, 0.75);
      for (let crown = 0; crown < 7; crown++) {
        const a = crown * TAU / 7;
        part('sphere', crown % 3 ? 'rose' : 'rust', x + Math.cos(a) * 1.9, y + 4.4 + rng() * 2.7,
          z + Math.sin(a) * 1.9, 4.6, 3.1, 4.1, a);
      }
      circle(x, z, 0.48);
    }
  }

  // The coastal promontory is a narrative transition from Chang’an to the sea voyage.
  tiledGate(scene, 0, -54, 6.4, 4.2, 'darkWood');
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 6; i++) {
      const x = side * (4 + i * 5);
      part('column', 'darkWood', x, 5.35, -59.5, 0.30, 1.32, 0.30);
      part('box', 'wood', x, 5.57, -59.5, 5.1, 0.16, 0.20);
    }
  }
  part('box', 'wood', 0, 5.57, -59.5, 3.1, 0.16, 0.20);
  block(0, -59.6, 85, 0.6);
  part('box', 'water', 0, -3.5, -134, 330, 0.3, 147);
  for (let i = 0; i < 135; i++) {
    part('box', 'foam', (rng() - 0.5) * 260, -3.33, -67 - rng() * 130,
      1.3 + rng() * 9, 0.018, 0.08 + rng() * 0.15, (rng() - 0.5) * 0.12);
  }
  for (const [x, z, scale] of [[4, -91, 1.2], [-24, -105, 0.94], [32, -118, 0.76]]) {
    part('stone', 'darkWood', x, -3.14, z, 3.1 * scale, 0.87 * scale, 8.2 * scale, 0.54);
    part('column', 'wood', x, -0.2 * scale - 3, z, 0.22, 6.0 * scale, 0.22);
    part('box', 'sail', x + 0.1, -2.7 + scale * 1.64, z, 3.95 * scale, 3.4 * scale, 0.12, 0.24);
    for (let batten = 0; batten < 4; batten++) {
      part('box', 'wood', x + 0.1, -2.7 + scale * (0.53 + batten * 0.67), z - 0.05,
        3.98 * scale, 0.05, 0.13, 0.24);
    }
  }
  copse(scene, 80, (x, z) => z < -38 || Math.abs(x) < 32);
  return scene.finish();
}

const kiiTrailX = z => 5.7 * Math.sin((z - 18) * 0.092) * (1 - smoothstep(Math.abs(z), 35, 56));

export function createKiiMap(ctx) {
  const pathDistance = (x, z) => Math.min(Math.abs(x - kiiTrailX(z)), Math.hypot(x * 0.28, z + 29));
  const scene = createPrecinct(ctx, KII_MAP, {
    seed: 816,
    height: (x, z) => 1.35 * Math.sin(z * 0.078) + smoothstep(pathDistance(x, z), 6, 38)
      * (5.8 + Math.sin(x * 0.16 + z * 0.18) * 3.1),
    paint: terrainPaint([0x345647, 0x989381, 0x284c47], pathDistance),
  });
  const { part, height, circle, rng } = scene;
  tiledGate(scene, 0, 58, 5.6, 4.15, 'darkWood');
  tiledGate(scene, 0, -53, 6.4, 4.6);
  flagstones(scene, kiiTrailX, -49, 55, 3.4, 2.4);
  // Gaps in the rows form small forest clearings for the dog encounters.
  const openings = [[0, 42], [-10, 29], [12, 8], [0, -22], [0, -30], [3.8, 48]];
  const isClearing = (x, z) => openings.some(([px, pz]) => Math.hypot(x - px, z - pz) < 6);
  copse(scene, 255, (x, z) => pathDistance(x, z) < 7.6 || isClearing(x, z));
  for (let z = -47; z < 53; z += 4.1) {
    for (const side of [-1, 1]) {
      const x = kiiTrailX(z) + side * (4.5 + rng() * 2.2);
      if (isClearing(x, z)) continue;
      stoneMarker(scene, x, z, 0.62 + rng() * 0.38);
    }
  }
  for (let i = 0; i < 75; i++) {
    const x = (rng() - 0.5) * 132;
    const z = (rng() - 0.5) * 127;
    if (pathDistance(x, z) < 4.2 || isClearing(x, z)) continue;
    const scale = 0.6 + rng() * 1.8;
    part('stone', i % 2 ? 'moss' : 'stone', x, height(x, z) + scale * 0.2, z,
      scale * 1.4, scale * 0.8, scale, rng() * TAU);
    if (scale > 1.4) circle(x, z, scale * 0.55);
  }
  for (const x of [-7.2, 7.2]) {
    lantern(scene, x, -36, 1.24);
    lantern(scene, x, 54, 1.13);
  }
  return scene.finish();
}

function kongobujiMainHall(scene, barkRoof, x, z, width, depth) {
  const { root, part, block, height } = scene;
  const y = height(x, z);
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const eave = 5.15;
  const rise = 3.65;

  part('box', 'stone', x, y + 0.19, z, width + 0.82, 0.38, depth + 0.82);
  part('box', 'beam', x, y + 0.46, z, width + 1, 0.22, depth + 1);
  part('box', 'lime', x, y + 2.7, z, width - 2.4, 4.2, depth - 2.5);
  block(x, z, halfWidth + 0.5, halfDepth + 0.5);

  for (const side of [-1, 1]) {
    const edge = z + side * halfDepth;
    const wall = edge - side * 1.19;
    part('box', 'beam', x, y + eave - 0.2, edge, width + 0.2, 0.46, 0.32);
    part('box', 'weatheredWood', x, y + 0.9, wall, width - 2.38, 0.70, 0.12);
    part('box', 'beam', x, y + 3.78, wall, width - 2.38, 0.15, 0.12);

    for (let i = 0; i <= 10; i++) {
      const px = x + (i / 10 - 0.5) * width;
      part('box', 'beam', px, y + 2.79, edge, 0.28, 4.45, 0.3);
      part('box', 'weatheredWood', px, y + 4.65, edge, 0.54, 0.18, 0.56);
      if (i === 10) continue;
      const bay = px + width / 20;
      if (i > 0 && i < 9) {
        part('box', 'weatheredWood', bay, y + 2.49, wall, width / 10 - 0.11, 2.53, 0.13);
        if (i === 4 || i === 5) {
          part('box', 'beam', bay + (i === 4 ? 1.08 : -1.08), y + 2.25, wall + side * 0.10,
            0.08, 0.25, 0.06);
        } else {
          part('box', 'lime', bay, y + 2.63, wall + side * 0.09, width / 10 - 0.31, 1.73, 0.08);
          for (const offset of [-0.92, -0.46, 0, 0.46, 0.92]) {
            part('box', 'beam', bay + offset, y + 2.63, wall + side * 0.14, 0.045, 1.73, 0.05);
          }
          for (const rail of [2.18, 2.63, 3.08]) {
            part('box', 'beam', bay, y + rail, wall + side * 0.14, width / 10 - 0.31, 0.045, 0.05);
          }
        }
      }
    }
    for (let px = -halfWidth - 0.24; px < halfWidth + 0.4; px += 0.35) {
      part('box', 'weatheredWood', x + px, y + 0.57, edge - side * 0.53, 0.34, 0.06, 1.69);
    }
    for (let px = -halfWidth; px <= halfWidth; px += 0.68) {
      part('box', 'weatheredWood', x + px, y + eave - 0.16, edge + side * 0.72, 0.11, 0.16, 1.92);
    }

    const end = x + side * halfWidth;
    part('box', 'beam', end, y + eave - 0.2, z, 0.32, 0.46, depth);
    for (const offset of [-3.25, 0, 3.25]) {
      part('box', 'beam', end, y + 2.79, z + offset, 0.28, 4.45, 0.3);
    }
    part('box', 'weatheredWood', end - side * 1.16, y + 1.11, z, 0.12, 1.1, depth - 2.5);
    for (let pz = -halfDepth + 0.35; pz <= halfDepth - 0.35; pz += 0.35) {
      part('box', 'weatheredWood', end - side * 0.55, y + 0.57, z + pz, 1.69, 0.06, 0.34);
    }
  }

  addCypressBarkRoof(root, barkRoof, { x, y: y + eave, z, width: width + 3.4, depth: depth + 4.5, rise, hip: 0.21 });
  part('box', 'beam', x, y + eave + rise, z, (width + 3.4) * 0.80, 0.29, 0.48);

  for (let i = 0; i < 3; i++) {
    part('box', 'stone', x, y + 0.09 + i * 0.08, z + halfDepth + 1.56 - i * 0.36,
      5.5, 0.18 + i * 0.16, 0.44);
  }
  for (const side of [-1, 1]) {
    part('box', 'beam', x + side * 2.45, y + 2.17, z + halfDepth + 0.31, 0.32, 3.25, 0.34);
  }
  part('box', 'beam', x, y + 3.74, z + halfDepth + 0.31, 5.3, 0.26, 0.36);
  addCypressBarkRoof(root, barkRoof, { x, y: y + 3.84, z: z + halfDepth - 0.07,
    width: 4.5, depth: 6.35, rise: 1.18, rotation: Math.PI / 2 });
  part('box', 'beam', x, y + 5.02, z + halfDepth - 0.07, 0.28, 0.23, 4.52);

  // Open rain tubs break the long ridge silhouette above the main hall.
  for (const offset of [-8, 8]) {
    part('box', 'beam', x + offset, y + eave + rise + 0.1, z, 1.82, 0.32, 1.78);
    part('column', 'weatheredWood', x + offset, y + eave + rise + 0.62, z, 1.42, 0.82, 1.42);
    for (const hoop of [0.40, 0.78]) {
      part('column', 'beam', x + offset, y + eave + rise + hoop, z, 1.44, 0.11, 1.44);
    }
    part('column', 'darkWood', x + offset, y + eave + rise + 1.04, z, 1.18, 0.035, 1.18);
  }
}

function kongobujiGardenGallery(scene, barkRoof, x) {
  const { root, part, circle } = scene;
  const z = -1.5;
  const length = 23.1;
  part('box', 'beam', x, 0.045, z, 2.52, 0.09, length);
  for (let i = 0; i < 66; i++) {
    part('box', 'weatheredWood', x, 0.08, z + (i - 32.5) * 0.35, 2.54, 0.06, 0.34);
  }
  for (const offset of [-1.14, 1.14]) {
    part('box', 'beam', x + offset, 3.01, z, 0.22, 0.24, length);
    for (const pz of [-12.4, -7, -2.7, 3.2, 8.9]) {
      part('box', 'stone', x + offset, 0.16, pz, 0.42, 0.32, 0.4);
      part('box', 'beam', x + offset, 1.63, pz, 0.22, 2.92, 0.23);
      circle(x + offset, pz, 0.18);
    }
  }
  for (let pz = z - 11; pz <= z + 11; pz += 0.73) {
    part('box', 'weatheredWood', x, 3.03, pz, 3.13, 0.13, 0.09);
  }
  addCypressBarkRoof(root, barkRoof, { x, y: 3.17, z, width: length + 0.86, depth: 3.88,
    rise: 0.79, rotation: Math.PI / 2 });
  part('box', 'beam', x, 4.0, z, 0.26, 0.18, length + 0.88);
}

export function createKongobujiMap(ctx) {
  const scene = createPrecinct(ctx, KONGOBUJI_MAP, {
    seed: 1593,
    height: (x, z) => smoothstep(Math.abs(x), 37, 75) * (4.1 + Math.cos(z * 0.13) * 1.5),
    paint: terrainPaint([0x7f8b66, 0xb2a888, 0x4a694f], (x, z) => Math.max(0, Math.abs(x) - 15 + Math.abs(z) * 0.1)),
  });
  const { root, part, block, circle, rng } = scene;
  const barkRoof = createCypressBarkMaterial();
  tiledGate(scene, 0, 48, 7.2, 4.5, 'darkWood');
  tiledGate(scene, 31, -36, 5.7, 4.4, 'darkWood');
  kongobujiMainHall(scene, barkRoof, 0, -24, 33, 13);
  flagstones(scene, () => 0, 10, 47, 5.2);
  flagstones(scene, () => 31, -31, 4, 3.7);

  addRakedGravel(root, { x: 0, y: 0.065, z: -1.5, width: 27.5, depth: 20,
    rings: [{ x: -6.8, z: -2.2, stretch: 1.5 }, { x: 6.8, z: 2.1, stretch: 1.5 }] });
  const rocks = [];
  for (const side of [-1, 1]) {
    // Upright head stones face each other across the center, with lower stones
    // trailing out toward the sides of the gravel bed.
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const x = side * (2.9 + 9.1 * t);
      const z = side * (1.5 + Math.sin(t * 4.6) * 3.9) - 1.8;
      const size = 0.6 + (1 - t) * 1.45;
      const sy = size * (i === 0 ? 1.78 : 0.72 + 0.29 * (i % 3));
      const rotation = rng() * TAU;
      rocks.push({ x, z, y: sy * 0.43, sx: size * 1.31, sy, sz: size * 1.1, rotation, tilt: side * 0.17 });
      circle(x, z, size * 0.63);
      if (i % 2 === 0) {
        rocks.push({ x: x - side * size * 0.36, z: z + side * size * 0.51,
          y: size * 0.19, sx: size * 0.76, sy: size * 0.38, sz: size * 0.68, rotation: -rotation, tilt: 0.23 });
      }
    }
    for (const z of [-9, 7]) lantern(scene, side * 18, z, 1.28);
    kongobujiGardenGallery(scene, barkRoof, side * 15.72);
    part('box', 'stone', side * 13.84, 0.055, -1.5, 0.27, 0.11, 20.26);
  }
  for (const z of [-11.62, 8.62]) {
    part('box', 'stone', 0, 0.055, z, 27.9, 0.11, 0.27);
  }
  addGraniteGroups(root, rocks);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const z = -29 + i * 8.3;
      part('box', 'lime', side * 37, 1.1, z, 0.55, 2.2, 8.36);
      part('box', 'tile', side * 37, 2.24, z, 0.92, 0.28, 8.4);
      block(side * 37, z, 0.34, 4.18);
    }
  }
  copse(scene, 92, (x, z) => Math.abs(x) < 39 && z > -38 && z < 53);
  return scene.finish();
}

export function createOkunoinMap(ctx) {
  const river = z => -2.4 * (1 - smoothstep(Math.abs(z), 3.3, 8.5));
  const bridge = z => 1.2 * (1 - smoothstep(Math.abs(z), 1.0, 9.2));
  const banks = (x, z) => river(z) + smoothstep(Math.abs(x), 9, 67) * Math.cos(z * 0.04) * 3.5;
  const scene = createPrecinct(ctx, OKUNOIN_MAP, {
    seed: 835,
    height: (x, z) => Math.abs(x) < 2.75 && Math.abs(z) < 9.2
      ? bridge(z)
      : banks(x, z),
    groundHeight: banks,
    paint: terrainPaint([0x4f6556, 0x858778, 0x37574f], x => Math.abs(x)),
  });
  const { part, height, block, rng } = scene;
  tiledGate(scene, 0, 61, 6.6, 4.65, 'darkWood');
  tiledGate(scene, 17, -50, 4.8, 4.1, 'darkWood');
  flagstones(scene, () => 0, 10, 59, 4.6);
  flagstones(scene, () => 0, -47, -10, 4.6);
  // Tamagawa river. The bank colliders leave only the bridge opening passable.
  for (const side of [-1, 1]) block(side * 43.65, 0, 40.9, 5.5);
  part('box', 'water', 0, -0.87, 0, 178, 0.2, 11.0);
  for (let i = 0; i < 95; i++) {
    part('box', 'foam', (rng() - 0.5) * 168, -0.76, (rng() - 0.5) * 9.2,
      0.95 + rng() * 3.9, 0.015, 0.09);
  }
  for (let z = -9.2; z <= 9.4; z += 0.38) {
    part('box', 'wood', 0, bridge(z) + 0.05, z, 5.52, 0.15, 0.4);
  }
  for (const side of [-1, 1]) {
    for (let i = -4; i <= 4; i++) {
      const z = i * 2.2;
      part('box', 'red', side * 2.67, bridge(z) + 0.63, z, 0.19, 1.24, 0.22);
      const midpoint = z + 1.1;
      if (i === 4) continue;
      const slope = Math.atan2(bridge(z) - bridge(z + 2.2), 2.2);
      for (const rail of [0.42, 1.04]) {
        part('box', 'red', side * 2.67, bridge(midpoint) + rail, midpoint, 0.18, 0.13, 2.27, 0, slope);
      }
    }
  }
  // The open centre of Tōrōdō frames the mausoleum further up the avenue.
  hall(scene, 0, -25, 20, 10, { passage: true });
  for (const side of [-1, 1]) {
    for (const row of [0, 1, 2]) {
      for (let i = 0; i < 8; i++) {
        const x = side * (3.5 + i * 0.87);
        const z = -20.2 - row * 2.62;
        part('box', 'lamp', x, 2.34 + row * 0.39, z, 0.48, 0.64, 0.43);
        part('box', 'darkWood', x, 2.72 + row * 0.39, z, 0.57, 0.13, 0.51);
        part('box', 'darkWood', x, 3.56 + row * 0.39, z, 0.038, 1.53, 0.038);
      }
    }
  }
  hall(scene, 0, -57, 14, 10);
  for (const side of [-1, 1]) {
    for (const z of [-48, -37, -14, 13, 25, 39, 53]) lantern(scene, side * 3.6, z, 1.28);
    for (let z = 15; z < 60; z += 4.9) {
      for (let row = 0; row < 3; row++) {
        const x = side * (6.8 + row * 4.5 + rng() * 1.7);
        stoneMarker(scene, x, z + rng() * 2.4, 0.63 + rng() * 0.68);
      }
    }
  }
  copse(scene, 210, (x, z) => Math.abs(z) < 9 || Math.abs(x) < (z > 12 ? 19 : 14)
    || (x > 8 && x < 26 && z < -42 && z > -59));
  for (const side of [-1, 1]) {
    for (const z of [15, 26, 37, 48, 58]) cedar(scene, side * 6.1, z, 21 + rng() * 6, 1.45);
  }
  return scene.finish();
}
