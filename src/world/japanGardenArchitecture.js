import * as THREE from 'three';
import { seededRandom } from './mapBase.js';

const TAU = 2 * Math.PI;
const gravelGroove = distance => Math.pow(0.5 + 0.5 * Math.cos(distance * TAU / 0.32), 3);
const { lerp, smoothstep } = THREE.MathUtils;

function surfaceTexture(width, height, getColor, repeat = false) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const [r, g, b] = getColor(col / width, row / height);
      const offset = (row * width + col) * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(new Uint8Array(pixels.buffer), width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function addRakedGravel(parent, { x, y, z, width, depth, rings }) {
  const rng = seededRandom(634);
  const texture = surfaceTexture(768, 576, (u, v) => {
    const px = (u - 0.5) * width;
    const pz = (0.5 - v) * depth;
    const wave = pz + 0.38 * Math.sin(px * 0.22) + 0.12 * Math.cos(px * 0.55 + pz * 0.4);
    let rake = gravelGroove(wave);
    for (const { x, z, stretch } of rings) {
      const distance = Math.hypot((px - x) / stretch, pz - z);
      rake = lerp(rake, gravelGroove(distance), 1 - smoothstep(distance, 2.2, 4.1));
    }
    const grain = (rng() + rng() - 1) * 37;
    const stoneDust = Math.sin(px * 6.8 + pz * 3.1) * Math.sin(pz * 5.3) * 4.4;
    const shade = 227 - rake * 31 + grain + stoneDust;
    return [shade, shade - 4, shade - 12];
  });
  const gravel = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: 0.026,
    roughness: 1,
  }));
  gravel.name = 'Banryutei_RakedGravel';
  gravel.rotation.x = -Math.PI / 2;
  gravel.position.set(x, y, z);
  gravel.receiveShadow = true;
  parent.add(gravel);
  return gravel;
}

export function createGraniteGeometry(seed, detail = 2) {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const granite = new THREE.Color(0x77746e);
  const schist = new THREE.Color(0x464f52);
  const moss = new THREE.Color(0x707347);
  const color = new THREE.Color();

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const fracture = Math.sin(12.8 * x + y * 8 + seed) * Math.cos(z * 8.3 - seed);
    const layer = Math.sin(19 * y + x * 11 - z * 7.1 + seed);
    const lean = Math.cos(y * 4 + seed) * 0.15 + y * 0.18;
    const scale = 0.55 + fracture * 0.1 + layer * 0.055;
    position.setXYZ(i, x * scale + lean, Math.max(-0.5, y * (0.56 + fracture * 0.09)), z * scale);
    color.lerpColors(schist, granite, smoothstep(layer + fracture * 0.5, -1, 1.1));
    color.lerp(moss, smoothstep(y * 0.67 + fracture + layer * 0.36, 0.3, 1.1) * 0.77);
    color.multiplyScalar(0.90 + fracture * 0.1 + y * 0.13).toArray(colors, i * 3);
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createGraniteMaterial() {
  const rng = seededRandom(704);
  const texture = surfaceTexture(128, 128, (u, v) => {
    const vein = Math.sin(TAU * (v * 12 + u * 6 + Math.sin(u * TAU * 3) * 0.38));
    const flecks = Math.pow(rng(), 4) * 35;
    const shade = 230 + vein * 9 - flecks;
    return [shade, shade, shade];
  }, true);
  return new THREE.MeshStandardMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: 0.028,
    vertexColors: true,
    roughness: 0.97,
  });
}

export function addGraniteGroups(parent, rocks) {
  const material = createGraniteMaterial();
  const transform = new THREE.Object3D();
  for (let variant = 0; variant < 3; variant++) {
    const pieces = rocks.filter((_, index) => index % 3 === variant);
    const mesh = new THREE.InstancedMesh(createGraniteGeometry(variant * 1.8), material, pieces.length);
    mesh.name = 'Kongobuji_DragonGranite_' + variant;
    pieces.forEach(({ x, y, z, sx, sy, sz, rotation, tilt }, index) => {
      transform.position.set(x, y, z);
      transform.scale.set(sx, sy, sz);
      transform.rotation.set(0.11, rotation, tilt);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
}

export function createCypressBarkMaterial() {
  const rng = seededRandom(1286);
  const texture = surfaceTexture(256, 256, (u, v) => {
    const course = v * 38 + 0.075 * Math.sin(u * TAU * 9);
    const overlap = Math.pow(0.5 + 0.5 * Math.cos(course * TAU), 8);
    const fibers = Math.sin(TAU * (u * 49 + 0.12 * Math.sin(v * TAU * 5)));
    const stains = Math.cos(u * TAU * 7 - v * TAU) * Math.sin(u * TAU * 3 + v * TAU * 2);
    const shade = 119 - overlap * 28 + fibers * 5 + stains * 13 + (rng() - 0.5) * 27;
    return [shade, shade - 13, shade - 26];
  }, true);
  return new THREE.MeshStandardMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: 0.028,
    roughness: 0.96,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
}

export function addCypressBarkRoof(parent, material, { x, y, z, width, depth, rise, hip = 0, rotation = 0 }) {
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];
  const rows = 12;
  const cols = 16;
  const run = depth / 2;

  function vertex(px, py, pz, u, v, shade = 1) {
    const index = positions.length / 3;
    positions.push(px, py, pz);
    uvs.push(u, v);
    colors.push(shade, shade, shade);
    return index;
  }

  function quad(a, b, c, d, flip = false) {
    if (flip) indices.push(a, c, b, b, c, d);
    else indices.push(a, b, c, b, d, c);
  }

  for (const side of [-1, 1]) {
    const surface = [];
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      const halfWidth = width / 2 * (1 - hip * smoothstep(t, 0, 0.7));
      for (let col = 0; col <= cols; col++) {
        const u = col / cols * 2 - 1;
        const upturn = Math.pow(Math.abs(u), 5) * Math.pow(1 - t, 2) * 0.23;
        const px = u * halfWidth;
        const py = rise * (0.42 * t + 0.58 * t * t) + upturn;
        const pz = side * run * (1 - t);
        const index = vertex(px, py, pz, px / 4, t * Math.hypot(run, rise) / 4);
        surface.push(index);
        if (col && row) quad(index - cols - 2, index - cols - 1, index - 1, index, side < 0);
      }
    }
    // Dark exposed bark edges sit above the timber fascia. The ends close
    // the two slopes and make the inset upper gables visible from the side.
    const eave = surface.slice(0, cols + 1);
    const left = Array.from({ length: rows + 1 }, (_, row) => surface[row * (cols + 1)]);
    const right = left.map(index => index + cols);
    for (const [edge, isGable] of [[eave, false], [left, true], [right, true]]) {
      let previous;
      for (const index of edge) {
        const [px, py, pz] = positions.slice(index * 3, index * 3 + 3);
        const u = (isGable ? pz : px) / 4;
        const top = vertex(px, py, pz, u, py / 4, 0.66);
        const bottom = vertex(px, isGable ? -0.15 : py - 0.17, pz, u, -0.04, 0.56);
        if (previous) quad(...previous, top, bottom);
        previous = [top, bottom];
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const roof = new THREE.Mesh(geometry, material);
  roof.name = 'Kongobuji_Hiwadabuki';
  roof.position.set(x, y, z);
  roof.rotation.y = rotation;
  roof.castShadow = true;
  roof.receiveShadow = true;
  parent.add(roof);
}
