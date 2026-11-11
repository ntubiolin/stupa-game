import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TOJI_LOADED_LANDMARK_COLLIDERS } from '../src/world/maps/toji.js';
import { KOYASAN_LOADED_DAITO_COLLIDERS } from '../src/world/maps/koyasan.js';

const EPSILON = 1e-3;

async function groundBounds(file, { x = 0, z = 0, scale = 1, materials }) {
  const buffer = await readFile(new URL(`../public/models/kukai/${file}.glb`, import.meta.url));
  const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  // This Node test checks the shipped vertex data and transforms. Decode real
  // images in the browser acceptance suite; Node has no DOM/ImageBitmap API.
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: 'NodeCollisionTexturePlaceholder',
    loadTexture: async () => new THREE.Texture(),
  }));
  const { scene } = await loader.parseAsync(data, '');
  scene.position.set(x, 0, z);
  scene.scale.setScalar(scale);
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  scene.traverse(object => {
    if (object.isMesh && materials.has(object.material?.name)) {
      bounds.expandByObject(object);
    }
  });
  assert.equal(bounds.isEmpty(), false, `${file} ground material was not found`);
  return bounds;
}

function colliderBounds(colliders) {
  const bounds = new THREE.Box3();
  for (const shape of colliders) {
    if (shape.type === 'circle') {
      bounds.expandByPoint(new THREE.Vector3(shape.x - shape.r, 0, shape.z - shape.r));
      bounds.expandByPoint(new THREE.Vector3(shape.x + shape.r, 0, shape.z + shape.r));
    } else {
      bounds.expandByPoint(new THREE.Vector3(shape.cx - shape.hx, 0, shape.cz - shape.hz));
      bounds.expandByPoint(new THREE.Vector3(shape.cx + shape.hx, 0, shape.cz + shape.hz));
    }
  }
  return bounds;
}

function assertXZClose(actual, expected, label) {
  for (const axis of ['x', 'z']) {
    assert(Math.abs(actual.min[axis] - expected.min[axis]) < EPSILON,
      `${label} min.${axis}: ${actual.min[axis]} != ${expected.min[axis]}`);
    assert(Math.abs(actual.max[axis] - expected.max[axis]) < EPSILON,
      `${label} max.${axis}: ${actual.max[axis]} != ${expected.max[axis]}`);
  }
}

test('loaded Tō-ji collider extents match shipped GLB ground structures', async () => {
  const fixtures = [
    {
      landmark: 'gojunoto', file: 'toji_gojunoto', x: 36, z: 18, scale: 1.05,
      materials: new Set(['Toji_GraniteLight_TemplePBR']),
    },
    {
      landmark: 'kondo', file: 'toji_kondo', x: 0, z: 8, scale: 1.25,
      materials: new Set(['Toji_GraniteLight_KondoPBR']),
    },
    {
      landmark: 'kodo', file: 'toji_kodo', x: 0, z: -36, scale: 1.25,
      materials: new Set(['Toji_GraniteDark_TemplePBR', 'Toji_HomosenRed']),
    },
  ];
  for (const fixture of fixtures) {
    const actual = await groundBounds(fixture.file, fixture);
    const expected = colliderBounds(TOJI_LOADED_LANDMARK_COLLIDERS
      .filter(shape => shape.landmark === fixture.landmark));
    assertXZClose(actual, expected, fixture.landmark);
  }
});

test('loaded Kōyasan Daitō collider extents match the shipped granite structures', async () => {
  const actual = await groundBounds('konpon_daito', {
    x: -62, z: 6, materials: new Set(['Kukai_GraniteStone_TemplePBR']),
  });
  assertXZClose(actual, colliderBounds(KOYASAN_LOADED_DAITO_COLLIDERS), 'konponDaito');
});

test('loaded Kōdō keeps the real gaps between its three benches open', () => {
  const point = { x: 3, z: -36 + 9.25 };
  const blocked = TOJI_LOADED_LANDMARK_COLLIDERS.some(shape =>
    shape.landmark === 'kodo'
    && Math.abs(point.x - shape.cx) <= shape.hx
    && Math.abs(point.z - shape.cz) <= shape.hz);
  assert.equal(blocked, false);
});
