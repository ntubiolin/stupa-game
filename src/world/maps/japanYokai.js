import * as THREE from 'three';

const PALETTES = {
  kappaCreek: { ground: 0x315a47, accent: 0x62aeb0, trunk: 0x55452f, foliage: 0x244f36 },
  tenguForest: { ground: 0x3c4430, accent: 0x9e3028, trunk: 0x443126, foliage: 0x1e382a },
  oniPass: { ground: 0x574039, accent: 0xb9432e, trunk: 0x302723, foliage: 0x4d352e },
};

function addTree(THREE, group, x, z, shared, scale = 1) {
  const trunk = new THREE.Mesh(shared.trunkGeo, shared.trunkMat);
  trunk.position.set(x, 2.5 * scale, z); trunk.scale.setScalar(scale); trunk.castShadow = true;
  const crown = new THREE.Mesh(shared.crownGeo, shared.foliageMat);
  crown.position.set(x, 5.5 * scale, z); crown.scale.setScalar(scale); crown.castShadow = true; group.add(trunk, crown);
}

export function createYokaiMap(ctx, id) {
  const map = ctx.world?.getMap?.(id);
  const origin = map.origin;
  const palette = PALETTES[id];
  const group = ctx.zoneGroups?.[id] || new THREE.Group();
  group.name = `${id}Map`;
  if (!ctx.zoneGroups?.[id]) ctx.scene.add(group);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(map.walkRadius, 64),
    new THREE.MeshStandardMaterial({ color: palette.ground, roughness: .98 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(origin.x, -.04, origin.z); ground.receiveShadow = true; group.add(ground);

  const treeShared = {
    trunkGeo: new THREE.CylinderGeometry(.3, .48, 5, 7), crownGeo: new THREE.ConeGeometry(1.65, 4.6, 8),
    trunkMat: new THREE.MeshStandardMaterial({ color: palette.trunk, roughness: .95 }),
    foliageMat: new THREE.MeshStandardMaterial({ color: palette.foliage, roughness: .9 }),
  };
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + (i % 3) * .08; const r = 49 + (i % 4) * 4;
    const x = origin.x + Math.cos(a) * r; const z = origin.z + Math.sin(a) * r; const scale = .8 + (i % 3) * .12;
    addTree(THREE, group, x, z, treeShared, scale);
    ctx.colliders.push({ type: 'circle', x, z, r: .48 * scale, zone: id });
  }
  if (id === 'tenguForest') {
    // A second cedar ring closes the forest silhouette while retaining the broad central combat corridor.
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + .11; const r = 40 + (i % 2) * 3;
      const x = origin.x + Math.cos(a) * r; const z = origin.z + Math.sin(a) * r;
      addTree(THREE, group, x, z, treeShared, .92);
      ctx.colliders.push({ type: 'circle', x, z, r: .44, zone: id });
    }
  }

  if (id === 'kappaCreek') {
    // A shallow creek: players may wade across it or use the stepping stones.
    const water = new THREE.Mesh(new THREE.PlaneGeometry(14, 105), new THREE.MeshStandardMaterial({ color: palette.accent, roughness: .28, metalness: .12, transparent: true, opacity: .72 }));
    water.rotation.x = -Math.PI / 2; water.position.set(origin.x + 20, .02, origin.z - 3); group.add(water);
    for (let z = -42; z <= 34; z += 19) {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.45, .35, 8), new THREE.MeshStandardMaterial({ color: 0x777b70, roughness: .95 }));
      stone.position.set(origin.x + 20, .16, origin.z + z); group.add(stone);
    }
  } else if (id === 'tenguForest') {
    for (let z = -38; z <= 20; z += 14) {
      const gate = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: .76 });
      for (const x of [-2.3, 2.3]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.45, 4.2, .45), mat); post.position.set(origin.x + x, 2.1, origin.z + z); gate.add(post); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(6, .48, .55), mat); beam.position.set(origin.x, 4.05, origin.z + z); gate.add(beam); group.add(gate);
      ctx.colliders.push({ type: 'circle', x: origin.x - 2.3, z: origin.z + z, r: .38, zone: id });
      ctx.colliders.push({ type: 'circle', x: origin.x + 2.3, z: origin.z + z, r: .38, zone: id });
    }
  } else {
    const borderRockGeo = new THREE.ConeGeometry(2.8, 9, 6);
    const borderRockMat = new THREE.MeshStandardMaterial({ color: 0x382d2b, roughness: 1 });
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2; const r = 56 + (i % 3) * 2;
      const peak = new THREE.Mesh(borderRockGeo, borderRockMat);
      peak.position.set(origin.x + Math.cos(a) * r, 4.1 + (i % 4) * .55, origin.z + Math.sin(a) * r);
      peak.scale.set(.75 + (i % 3) * .2, .9 + (i % 4) * .12, .8); peak.rotation.y = a; group.add(peak);
      ctx.colliders.push({ type: 'circle', x: peak.position.x, z: peak.position.z, r: 1.9, zone: id });
    }
    for (let i = 0; i < 18; i++) {
      const a = i * 2.13; const r = 20 + (i % 5) * 7;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 + (i % 3) * .45, 0), new THREE.MeshStandardMaterial({ color: 0x463936, roughness: 1 }));
      rock.position.set(origin.x + Math.cos(a) * r, .8, origin.z + Math.sin(a) * r); rock.scale.y = 1.8; group.add(rock);
      ctx.colliders.push({ type: 'circle', x: rock.position.x, z: rock.position.z, r: 1.1 + (i % 3) * .45, zone: id });
    }
  }

  const marker = new THREE.Mesh(new THREE.TorusGeometry(3, .13, 6, 32), new THREE.MeshBasicMaterial({ color: palette.accent }));
  marker.rotation.x = Math.PI / 2; marker.position.set(origin.x, .08, origin.z + 52); group.add(marker);
  return { group, getHeight: () => 0, update(dt) { marker.rotation.z += dt * .28; } };
}
