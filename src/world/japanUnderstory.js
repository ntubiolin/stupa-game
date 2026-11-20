import * as THREE from 'three';
import { seededRandom } from './mapBase.js';

// One low moss cushion with a few folded sedge blades, coloured within the mesh
// so each planted instance can share the same opaque material and geometry.
function mossAndSedge() {
  const rng = seededRandom(1941);
  const positions = [], colors = [];
  const triangle = (a, b, c, shade) => {
    positions.push(...a, ...b, ...c);
    const color = new THREE.Color(shade);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  };
  const outline = [];
  for (let i = 0; i < 9; i++) {
    const angle = i * Math.PI * 2 / 9;
    const r = 0.39 + rng() * 0.16;
    outline.push([Math.cos(angle) * r, -0.025, Math.sin(angle) * r * 0.76]);
  }
  for (let i = 0; i < outline.length; i++) {
    triangle([0.05, 0.09, -0.015], outline[(i + 1) % outline.length], outline[i],
      i % 3 === 0 ? 0x627145 : 0x56643e);
  }
  for (let i = 0; i < 12; i++) {
    const angle = rng() * Math.PI * 2;
    const x = (rng() - 0.5) * 0.31, z = (rng() - 0.5) * 0.27;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const h = 0.13 + rng() * 0.23;
    const tip = [x + dx * h * 0.7, h * 0.91, z + dz * h * 0.7];
    const ridge = [x + dx * 0.045, h * 0.68, z + dz * 0.045];
    const left = [x - dz * 0.026, 0.04, z + dx * 0.026];
    const right = [x + dz * 0.026, 0.04, z - dx * 0.026];
    triangle(left, ridge, right, 0x6d834e);
    triangle(left, tip, ridge, 0x8f9c5f);
    triangle(right, ridge, tip, 0x738952);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Map-local planting beds. Height samples align each tuft with its patch of soil. */
export function addJapanUnderstory(parent, { beds, heightAt, canPlant, seed, lowSpec, disposables }) {
  const rng = seededRandom(seed);
  const stems = [];
  for (const { x, z, scale = 1 } of beds) {
    const clusters = 1 + Math.floor(rng() * 3);
    for (let c = 0; c < clusters; c++) {
      const angle = rng() * Math.PI * 2;
      const radius = (0.65 + rng() * 1.35) * scale;
      const cx = x + Math.cos(angle) * radius, cz = z + Math.sin(angle) * radius;
      // Leave irregular open ground between colonies, including on low-spec devices.
      for (let i = 0; i < 6; i++) {
        const px = cx + (rng() - 0.5) * 1.8, pz = cz + (rng() - 0.5) * 1.3;
        const size = 0.52 + rng() * 0.67, yaw = rng() * Math.PI * 2;
        if ((!lowSpec || i % 2 === 0) && canPlant(px, pz)) stems.push({ x: px, z: pz, size, yaw });
      }
    }
  }
  if (!stems.length) return;
  const geometry = mossAndSedge();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geometry, material, stems.length);
  mesh.name = 'Moss and sedge beneath trees';
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3();
  for (const [i, { x, z, size, yaw }] of stems.entries()) {
    normal.set(heightAt(x - 0.22, z) - heightAt(x + 0.22, z), 0.44,
      heightAt(x, z - 0.22) - heightAt(x, z + 0.22)).normalize();
    dummy.quaternion.setFromUnitVectors(up, normal);
    dummy.rotateY(yaw);
    dummy.position.set(x, heightAt(x, z) + 0.012, z);
    dummy.scale.setScalar(size);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.computeBoundingSphere();
  parent.add(mesh);
  disposables.push(geometry, material, mesh);
}
