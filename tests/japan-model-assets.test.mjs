import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Budgets count one geometry pass; renderer shadow passes are additional.
const budgets = {
  toji_kondo: { triangles: 56000, primitives: 16, bytes: 1900000 },
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
