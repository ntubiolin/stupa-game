import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Budgets count one geometry pass; renderer shadow passes are additional.
const budgets = {
  // Focused quality reference: one baked hero, 512px maximum textures. Other
  // landmarks retain their previous budgets. See docs/toji-quality-reference.md.
  toji_kondo: { triangles: 78000, primitives: 21, bytes: 5000000 },
  toji_kodo: { triangles: 65000, primitives: 16, bytes: 2300000 },
  toji_gojunoto: { triangles: 65000, primitives: 14, bytes: 2200000 },
  konpon_daito: { triangles: 26000, primitives: 12, bytes: 850000 },
};
for (const [name, budget] of Object.entries(budgets)) {
  test(`${name} is self-contained and stays within its game asset budget`, () => {
    const buffer = readFileSync(new URL(`../public/models/kukai/${name}.glb`, import.meta.url));
    assert.equal(buffer.toString('utf8', 0, 4), 'glTF');
    assert.equal(buffer.readUInt32LE(4), 2);
    assert.equal(buffer.readUInt32LE(8), buffer.length);
    assert(buffer.length <= budget.bytes, `${buffer.length} bytes exceeds ${budget.bytes}`);
    const json = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
    assert(!json.extensionsUsed?.includes('KHR_lights_punctual'), 'landmarks must add no lights');
    assert(!json.buffers.some(item => item.uri), 'no external buffer dependency');
    assert(!json.images?.some(item => item.uri), 'no external texture dependency');
    let triangles = 0; let primitives = 0;
    for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode ?? 4, 4);
      const count = json.accessors[primitive.indices ?? primitive.attributes.POSITION].count;
      assert.equal(count % 3, 0);
      triangles += count / 3; primitives++;
      const positions = json.accessors[primitive.attributes.POSITION];
      assert([...positions.min, ...positions.max].every(Number.isFinite));
    }
    assert(triangles > 1000 && triangles <= budget.triangles, `${triangles} triangles exceeds ${budget.triangles}`);
    assert(primitives <= budget.primitives, `${primitives} material primitives exceeds ${budget.primitives}`);
  });
}

test('Kondō ships bounded PBR textures and the hero bake with matching UV sets', () => {
  const buffer = readFileSync(new URL('../public/models/kukai/toji_kondo.glb', import.meta.url));
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  const binaryStart = 20 + jsonLength + 8;
  let decodedBytes = 0;
  assert(gltf.images.length >= 10 && gltf.images.length <= 20);
  for (const image of gltf.images) {
    assert.equal(image.mimeType, 'image/png');
    const view = gltf.bufferViews[image.bufferView];
    const start = binaryStart + (view.byteOffset || 0);
    assert.equal(buffer.toString('hex', start, start + 8), '89504e470d0a1a0a');
    let width = buffer.readUInt32BE(start + 16);
    let height = buffer.readUInt32BE(start + 20);
    assert(width > 0 && height > 0 && width <= 512 && height <= 512);
    do {
      decodedBytes += width * height * 4;
      if (width === 1 && height === 1) break;
      width = Math.max(1, Math.floor(width / 2));
      height = Math.max(1, Math.floor(height / 2));
    } while (true);
  }
  assert(decodedBytes <= 12 * 1024 * 1024, `RGBA8+mips exceeds 12 MiB: ${decodedBytes}`);
  const heroIndex = gltf.materials.findIndex(material => material.name.startsWith('Toji_YakushiBakedGilt'));
  assert(heroIndex >= 0, 'principal sculpture must retain its dedicated baked material');
  const hero = gltf.materials[heroIndex];
  assert.equal(hero.normalTexture?.texCoord, 1);
  assert.equal(hero.occlusionTexture?.texCoord, 1);
  assert(hero.occlusionTexture.strength > 0 && hero.occlusionTexture.strength <= 0.7);
  assert(!hero.emissiveFactor?.some(value => value > 0), 'gilt uses illumination, not emissive fill');
  assert(hero.pbrMetallicRoughness.baseColorTexture);
  assert(hero.pbrMetallicRoughness.metallicRoughnessTexture);
  const primitives = gltf.meshes.flatMap(mesh => mesh.primitives).filter(p => p.material === heroIndex);
  assert(primitives.length > 0);
  for (const primitive of primitives) {
    assert.notEqual(primitive.attributes.TEXCOORD_0, undefined);
    assert.notEqual(primitive.attributes.TEXCOORD_1, undefined);
    const count = gltf.accessors[primitive.attributes.POSITION].count;
    assert.equal(gltf.accessors[primitive.attributes.TEXCOORD_0].count, count);
    assert.equal(gltf.accessors[primitive.attributes.TEXCOORD_1].count, count);
  }
  assert(!gltf.nodes.some(node => /HighSource|SculptSource/.test(node.name || '')));
});
