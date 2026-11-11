import * as THREE from 'three';
import { seededRandom } from './mapBase.js';

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const CEDAR_CHUNK_SIZE = 52;
const CEDAR_LOD_DISTANCE = 68;
const SPRAY_SIZE = 128;

function createSprayTexture(kind) {
  const pixels = new Uint8Array(SPRAY_SIZE * SPRAY_SIZE * 4);
  const rng = seededRandom({ cedar: 6131, leaf: 2367, blossom: 7997, frost: 2669 }[kind]);

  function stamp(x, y, rx, ry, shade) {
    for (let py = Math.max(0, Math.floor(y - ry)); py < Math.min(SPRAY_SIZE, y + ry); py++) {
      for (let px = Math.max(0, Math.floor(x - rx)); px < Math.min(SPRAY_SIZE, x + rx); px++) {
        if (((px - x) / rx) ** 2 + ((py - y) / ry) ** 2 > 1) continue;
        const index = (py * SPRAY_SIZE + px) * 4;
        pixels[index] = shade;
        pixels[index + 1] = shade;
        pixels[index + 2] = shade;
        pixels[index + 3] = 255;
      }
    }
  }

  function line(x1, y1, x2, y2, radius, shade) {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
    for (let step = 0; step <= steps; step++) {
      const t = step / Math.max(steps, 1);
      const width = radius * (1 - 0.52 * t);
      stamp(THREE.MathUtils.lerp(x1, x2, t), THREE.MathUtils.lerp(y1, y2, t), width, width, shade);
    }
  }

  if (kind === 'cedar') {
    line(2, 63, 125, 64, 2.1, 140);
    for (let shoot = 0; shoot < 21; shoot++) {
      const t = shoot / 21;
      const side = shoot % 2 === 0 ? 1 : -1;
      const x = 8 + 97 * t;
      const spread = (22 + 25 * rng()) * (1 - 0.57 * t);
      const tipX = Math.min(122, x + 15 + spread * (0.36 + 0.30 * rng()));
      const tipY = 63 + side * spread;
      line(x, 63, tipX, tipY, 3, 149);
      for (let i = 1; i <= 10; i++) {
        const u = i / 10;
        const sx = THREE.MathUtils.lerp(x, tipX, u);
        const sy = THREE.MathUtils.lerp(63, tipY, u);
        const needle = 5 + 12 * rng();
        const shade = Math.round(171 + rng() * 84);
        for (const sign of [-1, 1]) {
          line(sx, sy, sx + needle, sy + sign * (7 + rng() * 11) * (1 - u * 0.45), 2.55, shade);
        }
      }
    }
  } else {
    // Compact clusters soften the contour when several cards overlap around a twig.
    const frost = kind === 'frost';
    const clusters = [[52, 53], [48, 81], [79, 47], [83, 79], [104, 67], [22, 65], [67, 102], [61, 27]];
    for (const [cx, cy] of clusters) {
      for (let i = 0; i < (frost ? 5 : 25); i++) {
        const angle = rng() * TAU;
        const spread = Math.sqrt(rng()) * 21;
        const x = cx + Math.cos(angle) * spread;
        const y = cy + Math.sin(angle) * spread * 0.8;
        const shade = Math.round(154 + rng() * 101);
        if (kind === 'blossom') {
          const petal = 1.7 + rng() * 2.4;
          for (let p = 0; p < 5; p++) {
            const a = p / 5 * TAU;
            stamp(x + petal * Math.cos(a), y + petal * Math.sin(a), petal, petal, shade);
          }
          stamp(x, y, 1.35, 1.35, 160);
        } else {
          const leaf = frost ? 1.7 + rng() * 1.1 : 2.9 + rng() * 3.8;
          stamp(x, y, leaf * (0.75 + rng() * 0.85), leaf, shade);
        }
      }
    }
  }

  // Transparent texels keep a neutral RGB so mipmapping doesn't darken cutout edges.
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) pixels.fill(193, i, i + 3);
  }
  const texture = new THREE.DataTexture(pixels, SPRAY_SIZE, SPRAY_SIZE, THREE.RGBAFormat);
  texture.name = 'Japan ' + kind + ' foliage';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createBarkTexture() {
  const width = 64;
  const height = 128;
  const pixels = new Uint8Array(width * height * 4);
  const rng = seededRandom(1827);
  const grooves = Array.from({ length: width }, () => 0.70 + rng() * 0.30);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ridge = grooves[(x + Math.round(1.5 * Math.sin(y * 0.049 + x * 0.063)) + width) % width];
      const shade = Math.round((0.88 + rng() * 0.12) * ridge * 255);
      const i = (y * width + x) * 4;
      pixels.fill(shade, i, i + 3);
      pixels[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.name = 'Japan tree bark';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function geometryWriter() {
  const positions = [], normals = [], colors = [], uvs = [], indices = [];
  return {
    vertex(position, normal, shade, u = 0, v = 0) {
      const index = positions.length / 3;
      positions.push(position.x, position.y, position.z);
      normals.push(normal.x, normal.y, normal.z);
      colors.push(shade, shade, shade);
      uvs.push(u, v);
      return index;
    },
    triangle(a, b, c) {
      indices.push(a, b, c);
    },
    finish() {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      return geometry;
    },
  };
}

// Open tapered tubes intersect the parent limb. Their ends are buried in another tube or foliage.
function stem(writer, from, to, base, tip, sides) {
  const axis = to.clone().sub(from).normalize();
  const across = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 0, 1)).normalize();
  const depth = new THREE.Vector3().crossVectors(axis, across);
  const bottom = [], top = [];
  for (let i = 0; i <= sides; i++) {
    const angle = i / sides * TAU;
    const normal = across.clone().multiplyScalar(Math.cos(angle)).addScaledVector(depth, Math.sin(angle));
    const shade = 0.67 + 0.32 * ((((i % sides) * 7) % 11) / 10);
    bottom.push(writer.vertex(from.clone().addScaledVector(normal, base), normal, shade * 0.87, i / sides, 0));
    top.push(writer.vertex(to.clone().addScaledVector(normal, tip), normal, shade, i / sides, 1));
  }
  for (let i = 0; i < sides; i++) {
    writer.triangle(bottom[i], bottom[i + 1], top[i]);
    writer.triangle(bottom[i + 1], top[i + 1], top[i]);
  }
}

function spray(writer, start, end, width, roll, shade, curl = 0) {
  const along = end.clone().sub(start).normalize();
  const across = new THREE.Vector3(-along.z, 0, along.x).normalize().applyAxisAngle(along, roll);
  const normal = new THREE.Vector3().crossVectors(along, across);
  const a = writer.vertex(start.clone().addScaledVector(across, -width * 0.5), normal, shade, 0, 0);
  const b = writer.vertex(end.clone().addScaledVector(across, -width * 0.5), normal, shade, 1, 0);
  const c = writer.vertex(end.clone().addScaledVector(across, width * 0.5), normal, shade, 1, 1);
  const d = writer.vertex(start.clone().addScaledVector(across, width * 0.5), normal, shade, 0, 1);
  if (curl) {
    const ridge = start.clone().lerp(end, 0.52).addScaledVector(normal, curl);
    const e = writer.vertex(ridge.clone().addScaledVector(across, -width * 0.5), normal, shade, 0.52, 0);
    const f = writer.vertex(ridge.clone().addScaledVector(across, width * 0.5), normal, shade, 0.52, 1);
    writer.triangle(a, e, f);
    writer.triangle(a, f, d);
    writer.triangle(e, b, c);
    writer.triangle(e, c, f);
  } else {
    writer.triangle(a, b, c);
    writer.triangle(a, c, d);
  }
}

function cedarModel(distant) {
  const wood = geometryWriter();
  const needles = geometryWriter();
  const rng = seededRandom(7201);
  const foot = new THREE.Vector3(0, -0.35, 0);
  const waist = new THREE.Vector3(0.16, 7.9, -0.14);
  const shoulder = new THREE.Vector3(-0.05, 14.4, -0.32);
  const leader = new THREE.Vector3(0.24, 19.3, 0.12);
  stem(wood, foot, waist, 0.59, 0.30, distant ? 5 : 8);
  stem(wood, waist, shoulder, 0.30, 0.13, distant ? 5 : 8);
  stem(wood, shoulder, leader, 0.13, 0.016, distant ? 5 : 6);
  if (!distant) {
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4 + 0.3;
      const root = new THREE.Vector3(Math.cos(a) * 0.96, -0.37, Math.sin(a) * 0.96);
      stem(wood, new THREE.Vector3(0, 0.70, 0), root, 0.22, 0.03, 4);
    }
  }

  for (let i = 0; i < 25; i++) {
    const t = i / 24;
    const a = i * GOLDEN_ANGLE + (rng() - 0.5) * 0.63;
    const reach = (3.7 - 3.11 * t) * (0.71 + 0.42 * rng());
    const height = 8.2 + 11.6 * t;
    const start = new THREE.Vector3(THREE.MathUtils.lerp(0.12, 0.25, t), height, -0.18);
    const elbow = start.clone().add(new THREE.Vector3(
      Math.cos(a) * reach * 0.52, -0.40 + 0.5 * t, Math.sin(a) * reach * 0.52
    ));
    const end = start.clone().add(new THREE.Vector3(
      Math.cos(a + 0.16) * reach, -0.48 + 0.97 * t, Math.sin(a + 0.16) * reach
    ));
    const width = (2.6 - t * 1.74) * (0.86 + 0.29 * rng());
    const shade = 0.61 + 0.39 * rng();
    if (!distant && i < 11) {
      const radius = 0.116 - 0.061 * t;
      stem(wood, start, elbow, radius, radius * 0.51, 4);
      stem(wood, elbow, end, radius * 0.51, 0.012, 3);
    }
    if (!distant || i % 2 === 0 || t > 0.75) {
      const inner = start.clone().lerp(elbow, 0.25);
      spray(needles, inner, end, width, 0.34 + t * 0.32, shade);
      spray(needles, inner, end, width * 0.93, 1.35 + (i % 3) * 0.25, shade * 0.84);
      if (t > 0.50) {
        const leaderSpray = start.clone().add(new THREE.Vector3(
          Math.cos(a + 0.3) * reach * 0.49, 0.64 + 0.43 * t, Math.sin(a + 0.3) * reach * 0.49
        ));
        spray(needles, start, leaderSpray, width * 0.86, 1.33 + t * 0.77, shade);
      }
      if (!distant) {
        const side = i % 2 === 0 ? 1 : -1;
        const angle = a + side * (0.59 + t * 0.24);
        const tip = elbow.clone().add(new THREE.Vector3(
          Math.cos(angle) * reach * 0.56, 0.45 + t * 0.32, Math.sin(angle) * reach * 0.56
        ));
        spray(needles, inner, tip, width * 0.69, 0.92 + side * 0.4, shade);
      }
    }
  }
  return [wood.finish(), needles.finish()];
}

function deciduousModel(species) {
  const wood = geometryWriter();
  const foliage = geometryWriter();
  const rng = seededRandom({ maple: 6241, cherry: 5317, weepingCherry: 2401 }[species]);
  const weeping = species === 'weepingCherry';
  const base = new THREE.Vector3(0, -0.11, 0);
  const fork = new THREE.Vector3(0.18, 1.65, -0.14);
  const crown = new THREE.Vector3(-0.25, 2.94, 0.17);
  stem(wood, base, fork, 0.30, 0.19, 8);
  stem(wood, fork, crown, 0.19, 0.047, 7);

  function cluster(center, angle, width, incline) {
    const spread = new THREE.Vector3(Math.cos(angle) * width * 0.53, incline, Math.sin(angle) * width * 0.53);
    const start = center.clone().sub(spread);
    const end = center.clone().add(spread);
    spray(foliage, start, end, width, (rng() - 0.5) * 1.07, 0.77 + rng() * 0.23, 0.16);
    const offset = new THREE.Vector3(-spread.z * 0.18, -0.16, spread.x * 0.18);
    spray(foliage, start.add(offset), end.add(offset), width * 0.89, 0.92 + rng() * 1.26, 0.71 + rng() * 0.29, 0.12);
  }

  for (let branch = 0; branch < 9; branch++) {
    const a = branch * GOLDEN_ANGLE + (rng() - 0.5) * 0.63;
    const y = 2.2 + rng() * 1.11;
    const length = 1.65 + rng() * 1.25;
    const start = fork.clone().lerp(crown, 0.15 + rng() * 0.7);
    const elbow = new THREE.Vector3(Math.cos(a) * length * 0.53, y + 0.68, Math.sin(a) * length * 0.53);
    const end = new THREE.Vector3(
      Math.cos(a + 0.12) * length, y + (weeping ? 0.56 : 0.98), Math.sin(a + 0.12) * length
    );
    stem(wood, start, elbow, 0.10, 0.058, 5);
    stem(wood, elbow, end, 0.058, 0.014, 4);
    cluster(elbow.clone().lerp(end, 0.40), a, 1.45 + rng() * 0.45, 0.18 + rng() * 0.15);
    cluster(end, a + 0.35, 1.22 + rng() * 0.54, 0.1 + rng() * 0.31);
    for (const side of [-1, 1]) {
      const twigBase = elbow.clone().lerp(end, 0.13 + rng() * 0.5);
      const twigAngle = a + side * (0.32 + rng() * 0.64);
      const drop = weeping ? -0.72 - rng() * 0.96 : 0.14 + rng() * 0.70;
      const tip = twigBase.clone().add(new THREE.Vector3(Math.cos(twigAngle), drop, Math.sin(twigAngle)));
      stem(wood, twigBase, tip, 0.033, 0.004, 3);
      cluster(twigBase.clone().lerp(tip, 0.51), twigAngle, 1.19 + rng() * 0.47, drop * 0.39);
      cluster(tip, twigAngle + 0.48, 0.85 + rng() * 0.36, drop * 0.25);
    }
  }
  cluster(crown.clone().add(new THREE.Vector3(0, 0.8, 0.16)), 1, 1.8, 0.39);
  return [wood.finish(), foliage.finish()];
}

/**
 * Place deterministic whole-tree instances in map-local coordinates. Tall cedars use
 * spatially culled batches with a simpler distant model. Seasonal trees share their
 * map's palette material so the existing tint and emissive hooks still apply.
 */
export function addJapanTrees(parent, trees, { name, species, canopyMaterial, disposables }) {
  if (!trees.length) return null;
  const cedar = species === 'cedar';
  const bark = createBarkTexture();
  const woodMaterial = new THREE.MeshLambertMaterial({
    color: cedar ? 0x926c50 : 0x755947,
    map: bark,
    vertexColors: true,
  });
  const leaves = createSprayTexture(cedar ? 'cedar' : 'leaf');
  const blossoms = species.endsWith('Cherry') || species === 'cherry' ? createSprayTexture('blossom') : null;
  const frost = cedar ? null : createSprayTexture('frost');
  const foliageMaterial = canopyMaterial ?? new THREE.MeshLambertMaterial({
    color: 0x688c5d,
    emissive: 0x1b3019,
    emissiveIntensity: 0.14,
  });
  foliageMaterial.map = blossoms ?? leaves;
  foliageMaterial.side = THREE.DoubleSide;
  foliageMaterial.alphaTest = 0.43;
  foliageMaterial.vertexColors = true;

  const model = cedar ? cedarModel(false) : deciduousModel(species);
  const distantModel = cedar ? cedarModel(true) : null;
  const batches = new Map();
  for (const tree of trees) {
    const ix = cedar ? Math.floor(tree.x / CEDAR_CHUNK_SIZE) : 0;
    const iz = cedar ? Math.floor(tree.z / CEDAR_CHUNK_SIZE) : 0;
    const key = ix + ':' + iz;
    if (!batches.has(key)) batches.set(key, {
      x: cedar ? (ix + 0.5) * CEDAR_CHUNK_SIZE : 0,
      z: cedar ? (iz + 0.5) * CEDAR_CHUNK_SIZE : 0,
      trees: [],
    });
    batches.get(key).trees.push(tree);
  }

  const rng = seededRandom(31847);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const resources = [bark, woodMaterial, leaves, ...model];
  if (!canopyMaterial) resources.push(foliageMaterial);
  if (blossoms) resources.push(blossoms);
  if (frost) resources.push(frost);
  if (distantModel) resources.push(...distantModel);

  for (const batch of batches.values()) {
    const near = new THREE.Group();
    near.name = name;
    const lod = cedar ? new THREE.LOD() : null;
    if (lod) {
      lod.name = name + ' LOD';
      lod.position.set(batch.x, 0, batch.z);
      parent.add(lod);
      lod.addLevel(near, 0);
    } else {
      parent.add(near);
    }

    function meshes(level, [wood, foliage], isNear) {
      const trunk = new THREE.InstancedMesh(wood, woodMaterial, batch.trees.length);
      const crown = new THREE.InstancedMesh(foliage, foliageMaterial, batch.trees.length);
      trunk.name = name + ' trunks';
      crown.name = name + ' foliage';
      trunk.castShadow = isNear;
      trunk.receiveShadow = isNear;
      crown.castShadow = isNear;
      crown.receiveShadow = isNear;
      level.add(trunk, crown);
      resources.push(trunk, crown);
      return [trunk, crown];
    }

    const [nearWood, nearFoliage] = meshes(near, model, true);
    let farWood, farFoliage;
    if (lod) {
      const distant = new THREE.Group();
      distant.name = name + ' distant';
      [farWood, farFoliage] = meshes(distant, distantModel, false);
      lod.addLevel(distant, CEDAR_LOD_DISTANCE, 0.12);
    }
    batch.trees.forEach((tree, i) => {
      const scale = tree.scale ?? 1;
      const width = tree.width ?? scale;
      const spread = 0.87 + 0.23 * rng();
      dummy.position.set(tree.x - batch.x, tree.y, tree.z - batch.z);
      dummy.scale.set(width * spread, tree.height ?? scale, width / spread);
      dummy.rotation.set((rng() - 0.5) * 0.035, tree.yaw ?? rng() * TAU, tree.lean ?? (rng() - 0.5) * 0.07, 'YXZ');
      dummy.updateMatrix();
      const tone = 0.79 + rng() * 0.21;
      tint.setRGB(tone, Math.min(1, tone + rng() * 0.14), tone);
      nearWood.setMatrixAt(i, dummy.matrix);
      nearFoliage.setMatrixAt(i, dummy.matrix);
      nearFoliage.setColorAt(i, tint);
      if (lod) {
        farWood.setMatrixAt(i, dummy.matrix);
        farFoliage.setMatrixAt(i, dummy.matrix);
        farFoliage.setColorAt(i, tint);
      }
    });
    for (const mesh of lod ? [nearWood, nearFoliage, farWood, farFoliage] : [nearWood, nearFoliage]) {
      mesh.computeBoundingSphere();
    }
  }

  disposables.push(...resources);
  return {
    setSeason(season) {
      foliageMaterial.map = (season === 'winter' && frost)
        || (season === 'spring' && blossoms)
        || leaves;
    },
  };
}
