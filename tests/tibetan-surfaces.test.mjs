import assert from 'node:assert/strict';
import test from 'node:test';
import { MeshStandardMaterial, NoColorSpace, SRGBColorSpace } from 'three';
import { createTibetanSurfaces } from '../src/world/tibetanSurfaces.js';
import { createChimphuScene } from '../src/story/world/chimphuScene.js';
import { createMangyulScene } from '../src/story/world/mangyulScene.js';
import { createPharpingScene } from '../src/story/world/pharpingScene.js';
import { createSamyeScene } from '../src/story/world/samyeScene.js';
import { createYarlungScene } from '../src/story/world/yarlungScene.js';

test('Tibetan tiles reuse each surface within one map and retain mobile color and roughness', () => {
  const desktop = createTibetanSurfaces({});
  const mobile = createTibetanSurfaces({ isMobile: true });
  const material = new MeshStandardMaterial({ color: 0x8b1e24, roughness: 0.7 });
  desktop.apply(material, 'plaster');
  const sameTile = desktop.apply(new MeshStandardMaterial(), 'plaster');
  const mobileTile = mobile.apply(new MeshStandardMaterial(), 'plaster');
  assert.equal(material.color.getHex(), 0x8b1e24);
  assert.equal(material.roughness, 0.7);
  assert.equal(desktop.textures.size, 2);
  assert.equal(material.map, sameTile.map);
  assert.equal(material.bumpMap, material.roughnessMap);
  assert.equal(material.roughnessMap.colorSpace, NoColorSpace);
  assert.equal(material.map.colorSpace, SRGBColorSpace);
  assert.equal(material.map.image.width, 128);
  assert.equal(mobileTile.map.image.width, 64);
  assert.equal(mobileTile.roughnessMap.image.width, 64);
  assert.equal(mobileTile.bumpMap, null);
});

function trackTiles(group) {
  const counts = new Map();
  group.traverse(({ material }) => {
    for (const mat of [material].flat()) {
      for (const texture of [mat?.map, mat?.roughnessMap]) {
        if (texture?.name.startsWith('Tibetan ') && !counts.has(texture)) {
          counts.set(texture, 0);
          texture.addEventListener('dispose', () => counts.set(texture, counts.get(texture) + 1));
        }
      }
    }
  });
  return counts;
}

for (const [map, createScene] of Object.entries({
  Pharping: createPharpingScene,
  Mangyul: createMangyulScene,
  Yarlung: createYarlungScene,
  Samye: createSamyeScene,
  Chimphu: createChimphuScene,
})) {
  test(`${map} story teardown disposes each owned Tibetan texture once`, async () => {
    const scene = await createScene({ colliders: [] });
    const counts = trackTiles(scene.group);
    assert.ok(counts.size >= 8 && counts.size <= 14);
    scene.dispose();
    assert.ok([...counts.values()].every(count => count === 1));
  });
}

test('Pharping rain reset disposes the old tiles independently of the rebuilt chapter', async () => {
  const scene = await createPharpingScene({ colliders: [] });
  scene.restore('rain');
  const beforeReset = trackTiles(scene.group);
  scene.restore('spring1');
  const afterReset = trackTiles(scene.group);
  assert.equal(afterReset.size, beforeReset.size);
  assert.ok([...beforeReset.values()].every(count => count === 1));
  assert.ok([...afterReset.keys()].every(tile => !beforeReset.has(tile)));
  scene.dispose();
  assert.ok([...afterReset.values()].every(count => count === 1));
});
