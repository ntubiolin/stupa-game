import * as THREE from 'three';
import { seededRandom } from './mapBase.js';

const TAU = Math.PI * 2;

// XY outlines in metres. The maple's stalk and five lobes remain legible as it rolls over.
const OUTLINES = {
  spring: [[0, -0.071], [0.031, -0.024], [0.044, 0.015], [0.035, 0.054],
    [0.012, 0.068], [0.001, 0.049], [-0.018, 0.065], [-0.039, 0.049],
    [-0.043, 0.015], [-0.029, -0.032]],
  autumn: [[-0.005, -0.112], [0.004, -0.111], [0.009, -0.049], [0.082, -0.048],
    [0.039, -0.015], [0.105, 0.051], [0.029, 0.029], [0, 0.131],
    [-0.027, 0.028], [-0.093, 0.066], [-0.042, -0.009], [-0.083, -0.036],
    [-0.009, -0.049]],
};

function leafGeometry(outline) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ShapeGeometry(shape);
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    vertices.setZ(i, Math.abs(vertices.getX(i)) * 0.20);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Sample the rendered crowns once, including each instance's yaw, lean and nonuniform scale.
function sampleCrowns(meshes, toLocal, random) {
  const trees = [];
  const matrix = new THREE.Matrix4();
  const batchMatrix = new THREE.Matrix4();
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    batchMatrix.multiplyMatrices(toLocal, mesh.matrixWorld);
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      matrix.premultiply(batchMatrix);
      const foot = new THREE.Vector3().setFromMatrixPosition(matrix);
      const tips = Array.from({ length: 16 }, () => new THREE.Vector3()
        .fromBufferAttribute(positions, Math.floor(random() * positions.count)).applyMatrix4(matrix));
      trees.push({ x: foot.x, z: foot.z, tips });
    }
  }
  return trees;
}

export function addSeasonalDrift(parent, { cherries, maples, groundHeight, lowSpec, seed, disposables }) {
  const random = seededRandom(seed);
  parent.updateWorldMatrix(true, false);
  const toLocal = parent.matrixWorld.clone().invert();
  const crowns = {
    spring: sampleCrowns(cherries.crownMeshes, toLocal, random),
    autumn: sampleCrowns(maples.crownMeshes, toLocal, random),
  };
  const shapes = { spring: leafGeometry(OUTLINES.spring), autumn: leafGeometry(OUTLINES.autumn) };
  const material = new THREE.MeshLambertMaterial({ color: 0xffc8da, side: THREE.DoubleSide });
  const capacity = lowSpec ? 36 : 96;
  const mesh = new THREE.InstancedMesh(shapes.spring, material, capacity);
  mesh.name = 'Seasonal canopy drift';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // The pool can relocate to a different stand on teleport. Explicit distance filtering bounds its work.
  mesh.frustumCulled = false;
  mesh.count = 0;
  parent.add(mesh);
  disposables.push(mesh, material, shapes.spring, shapes.autumn);

  const dummy = new THREE.Object3D();
  const particles = Array.from({ length: capacity }, () => ({}));
  const nearby = [];
  const radius = lowSpec ? 24 : 36;
  let previousSeason;
  let count = 0;
  let credit = 0;

  function release() {
    const tree = nearby[Math.floor(random() * nearby.length)];
    const tip = tree.tips[Math.floor(random() * tree.tips.length)];
    const p = particles[count++];
    p.x = tip.x;
    p.y = tip.y;
    p.z = tip.z;
    p.phase = random() * TAU;
    p.fall = 0.76 + random() * 0.48;
    p.scale = 0.80 + random() * 0.45;
    p.settled = 0;
    p.age = 0;
  }

  return {
    update(dt, season, wind, playerX, playerZ) {
      if (season !== previousSeason) {
        previousSeason = season;
        mesh.count = count = 0;
        credit = 2;
        mesh.visible = Boolean(crowns[season]);
        if (mesh.visible) {
          mesh.geometry = shapes[season];
          material.color.setHex(season === 'spring' ? 0xffc8da : 0xc74c27);
        }
      }
      if (!mesh.visible) return;
      const step = Math.min(Math.max(dt, 0), 0.1);
      const spring = season === 'spring';
      const strength = wind?.strength ?? 0;
      const windX = strength * (wind?.dir?.x ?? 0);
      const windZ = strength * (wind?.dir?.y ?? 0);
      nearby.length = 0;
      for (const tree of crowns[season]) {
        if (Math.hypot(tree.x - playerX, tree.z - playerZ) <= radius) nearby.push(tree);
      }
      if (nearby.length) {
        // Quiet trees occasionally shed a leaf; a gust briefly releases a larger spray.
        const rate = (0.9 + 4.2 * strength * strength) * Math.min(nearby.length, lowSpec ? 2 : 4);
        credit = Math.min(credit + rate * step, capacity - count);
        while (credit >= 1) {
          release();
          credit--;
        }
      } else {
        credit = 1;
      }

      for (let i = count - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += step;
        const phase = p.phase + p.age * (spring ? 2.1 : 3.3);
        const wave = Math.sin(phase);
        if (p.settled === 0) {
          const drift = spring ? 1.75 : 1.10;
          p.x += (windX * drift + wave * (spring ? 0.28 : 0.76)) * step;
          p.z += (windZ * drift + Math.cos(phase * 0.85) * 0.33) * step;
          p.y -= (spring ? 0.58 : 0.91) * p.fall * (1 + wave * 0.24) * step;
          const floor = groundHeight(p.x, p.z) + 0.024;
          if (p.y <= floor) {
            p.y = floor;
            p.settled = 0.001;
          }
        } else {
          p.settled += step;
        }
        if (p.settled >= 3 || Math.hypot(p.x - playerX, p.z - playerZ) > radius + 12) {
          // Swap with the last live particle; its transform has already been written this frame.
          const last = --count;
          if (last !== i) {
            particles[i] = particles[last];
            particles[last] = p;
            mesh.getMatrixAt(last, dummy.matrix);
            mesh.setMatrixAt(i, dummy.matrix);
          }
          continue;
        }
        if (p.settled) {
          dummy.rotation.set(-Math.PI / 2, 0, p.phase);
        } else if (spring) {
          dummy.rotation.set(0.7 + wave * 0.6, p.phase + p.age * 1.2, wave * 0.65);
        } else {
          dummy.rotation.set(phase * 0.73, p.phase + wave * 1.1, wave * 0.85);
        }
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.setScalar(p.scale * Math.min(1, 3 - p.settled));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.count = count;
      if (count) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
