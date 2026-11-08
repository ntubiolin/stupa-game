import * as THREE from 'three';
import { YARLUNG_CHAPTER } from '../../data/story/chapters/yarlung.js';
import { createMap } from '../../world/maps/yarlung.js';
import { seededRandom } from '../../world/mapBase.js';
import { buildNyenModel, buildHailCoreModel } from '../../gameplay/enemyModels/yarlung.js';
import { buildYarlhaShampoModel } from '../../gameplay/bosses/yarlhaShampo.js';

const pasture = { x: 4000, z: -72 };
const checkpointIds = YARLUNG_CHAPTER.checkpoints.map(({ id }) => id);
const approaches = {
  observe: [3.9, 3.5, 0, 1.3, 1.77],
  calm: [2.9, 3, 0, 1.75, 1.8],
  stone1: [2.9, 2.65, 0.95, 1.86, 0.35],
  pause: [2.9, 2.65, 0, 1.75, 2.05],
  stone2: [2.9, 2.65, 0.48, 1.52, 0.32],
  release: [2.9, 2.65, 0, 1.68, 1.75],
  guardian: [2.3, 2.65, 0, 1.23, 1.62],
};

function part(parent, geometry, material, position, scale) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeYak(group, sphere) {
  const yak = new THREE.Group();
  yak.name = 'StoryWhiteYak';
  group.add(yak);
  const wool = new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.96 });
  const fleece = new THREE.MeshStandardMaterial({ color: 0xf8f4ea, roughness: 0.91 });
  const gray = new THREE.MeshStandardMaterial({ color: 0xafa79b, roughness: 0.96 });
  const nose = new THREE.MeshStandardMaterial({ color: 0x565155, roughness: 0.82 });
  const hoof = new THREE.MeshStandardMaterial({ color: 0x423d3b, roughness: 0.91 });
  const ivory = new THREE.MeshStandardMaterial({ color: 0xd0b995, roughness: 0.68 });
  const wound = new THREE.MeshStandardMaterial({ color: 0x7b3b37, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x292424, roughness: 0.44 });
  const glint = new THREE.MeshBasicMaterial({ color: 0xfff5de });

  const torso = new THREE.Group();
  yak.add(torso);
  part(torso, sphere, wool, [0, 1.58, -0.4], [0.98, 0.85, 1.8]);
  part(torso, sphere, fleece, [0, 1.92, 0.63], [0.99, 0.93, 0.97]);
  part(torso, sphere, wool, [0, 1.44, 1.05], [0.81, 0.86, 0.7]);
  const forelegs = [];
  for (const side of [-1, 1]) {
    for (const z of [-1.5, 0.92]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.55, 1.16, z);
      part(leg, sphere, wool, [0, -0.08, 0], [0.28, 0.59, 0.37]);
      part(leg, sphere, gray, [0, -0.65, z > 0 ? 0.1 : -0.1], [0.146, 0.46, 0.17]);
      part(leg, sphere, hoof, [0, -1.02, z > 0 ? 0.16 : -0.06], [0.192, 0.146, 0.26]);
      yak.add(leg);
      if (z > 0) forelegs.push(leg);
    }
  }

  // The skirt of long hair distinguishes the yak from a short-coated ox.
  const locks = new THREE.InstancedMesh(sphere, fleece, 42);
  locks.castShadow = true;
  const tuft = new THREE.Object3D();
  const rng = seededRandom(950);
  const color = new THREE.Color();
  for (let i = 0; i < locks.count; i++) {
    const side = i < locks.count / 2 ? -1 : 1;
    const z = -1.91 + (i % 21) * 0.153;
    const x = side * (0.59 + 0.3 * Math.sin((z + 1.91) / 3.2 * Math.PI));
    tuft.position.set(x, 1.16 + rng() * 0.22, z);
    tuft.scale.set(0.13 + rng() * 0.11, 0.4 + rng() * 0.42, 0.15 + rng() * 0.09);
    tuft.rotation.set(-0.28 - rng() * 0.2, 0, side * (0.1 + rng() * 0.14));
    tuft.updateMatrix();
    locks.setMatrixAt(i, tuft.matrix);
    locks.setColorAt(i, color.setScalar(0.76 + rng() * 0.24));
  }
  torso.add(locks);
  part(torso, sphere, wool, [0.05, 1.12, -2.05], [0.22, 0.78, 0.27]).rotation.x = 0.37;

  const head = new THREE.Group();
  head.name = 'WhiteYakHead';
  head.position.set(0, 1.88, 1.17);
  torso.add(head);
  part(head, sphere, wool, [0, 0.03, 0.44], [0.59, 0.58, 0.73]);
  part(head, sphere, gray, [0, -0.22, 0.85], [0.43, 0.32, 0.49]);
  part(head, sphere, nose, [0, -0.28, 1.11], [0.39, 0.226, 0.29]);
  part(head, sphere, fleece, [0, -0.5, 0.47], [0.23, 0.35, 0.25]);
  for (const side of [-1, 1]) {
    part(head, sphere, gray, [side * 0.59, 0.18, 0.24], [0.33, 0.13, 0.18]).rotation.z = side * 0.21;
    part(head, sphere, dark, [side * 0.478, 0.06, 0.76], [0.1, 0.1, 0.12]);
    part(head, sphere, glint, [side * 0.543, 0.09, 0.818], [0.025, 0.025, 0.025]);
    part(head, sphere, dark, [side * 0.184, -0.23, 1.355], [0.078, 0.042, 0.022]);
    const curve = new THREE.CatmullRomCurve3([
      [0.42, 0.29, 0.29], [0.72, 0.31, 0.24], [1.02, 0.47, 0.22],
      [1.18, 0.74, 0.25], [1.16, 0.99, 0.32],
    ].map(([x, y, z]) => new THREE.Vector3(side * x, y, z)));
    const segments = 20;
    const sides = 8;
    const geometry = new THREE.TubeGeometry(curve, segments, 0.16, sides);
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const center = curve.getPointAt(t);
      for (let j = 0; j <= sides; j++) {
        const index = i * (sides + 1) + j;
        vertex.fromBufferAttribute(positions, index).lerp(center, t * 0.97);
        positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
      }
    }
    geometry.computeVertexNormals();
    part(head, geometry, ivory, [0, 0, 0], [1, 1, 1]);
  }
  part(head, sphere, wound, [0.89, 0.385, 0.324], [0.153, 0.054, 0.052]).rotation.z = 0.54;
  part(head, sphere, wound, [0.66, 0.262, 0.355], [0.056, 0.027, 0.02]).rotation.z = 0.2;

  return { yak, torso, head, forelegs };
}

function makeGuardian(group, sphere) {
  const guardian = new THREE.Group();
  guardian.name = 'YarlungGuardianVision';
  group.add(guardian);
  const light = new THREE.MeshBasicMaterial({
    color: 0xffdda2, transparent: true, depthWrite: false,
  });
  const shade = new THREE.MeshBasicMaterial({
    color: 0xd4a06a, transparent: true, depthWrite: false,
  });
  // A stylized apparition from the novel, with no attribution to a specific icon.
  const folds = new THREE.ConeGeometry(1, 1, 12, 1, true);
  part(guardian, folds, shade, [0, 1.42, 0], [0.98, 2.76, 0.52]);
  part(guardian, sphere, light, [0, 2.04, 0.06], [0.62, 0.85, 0.33]);
  part(guardian, sphere, light, [0, 3.03, 0.08], [0.3, 0.39, 0.27]);
  for (const side of [-1, 1]) {
    part(guardian, sphere, shade, [side * 0.62, 1.94, 0.12], [0.25, 0.72, 0.25]).rotation.z = side * 0.48;
  }
  const arc = new THREE.RingGeometry(0.74, 0.772, 52);
  const halo = part(guardian, arc, light, [0, 3.12, -0.22], [1, 1, 1]);
  light.side = THREE.DoubleSide;
  halo.rotation.y = 0.32;
  guardian.traverse((object) => { object.castShadow = false; });
  return {
    set(progress) {
      guardian.visible = progress > 0;
      guardian.position.y = (1 - progress) * -0.45;
      guardian.scale.setScalar(0.91 + progress * 0.09);
      light.opacity = progress * 0.86;
      shade.opacity = progress * 0.67;
    },
    group: guardian,
  };
}

function makeStone(group, geometry, material, name, from, to, size) {
  const stone = part(group, geometry, material, from, size);
  stone.name = name;
  const collider = { type: 'circle', x: 0, z: 0, r: size[0] * 0.85, zone: 'yarlung' };
  return {
    collider,
    set(progress) {
      const [x, y, z] = from.map((start, i) => THREE.MathUtils.lerp(start, to[i], progress));
      stone.position.set(x, y + Math.sin(progress * Math.PI) * 0.43, z);
      stone.rotation.set(0.18 + progress * 0.83, 0.1 + progress * 0.38, 0.11 + progress * 0.74);
      collider.x = x + pasture.x;
      collider.z = z + pasture.z;
    },
  };
}

function disposeGroup(group) {
  const resources = new Set();
  group.traverse((object) => {
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry) resources.add(object.geometry);
    for (const material of [object.material].flat()) {
      if (!material) continue;
      resources.add(material);
      if (material.map) resources.add(material.map);
    }
  });
  for (const resource of resources) resource.dispose();
  group.removeFromParent();
  group.clear();
}

function makeMonsters(clearing) {
  const monsters = new THREE.Group();
  monsters.name = 'StoryYarlungMonsters';
  clearing.add(monsters);

  const nyenA = buildNyenModel(THREE);
  nyenA.root.name = 'StoryNyenA';
  nyenA.root.position.set(-2.8, 0, 0.85);
  nyenA.root.rotation.y = 1.25;
  monsters.add(nyenA.root);

  const nyenB = buildNyenModel(THREE);
  nyenB.root.name = 'StoryNyenB';
  nyenB.root.position.set(2.8, 0, -0.65);
  nyenB.root.rotation.y = -1.35;
  monsters.add(nyenB.root);

  const hailA = buildHailCoreModel(THREE);
  hailA.root.name = 'StoryHailCoreA';
  hailA.root.position.set(-2.2, 0, -1.75);
  monsters.add(hailA.root);

  const hailB = buildHailCoreModel(THREE);
  hailB.root.name = 'StoryHailCoreB';
  hailB.root.position.set(2.35, 0, 1.45);
  monsters.add(hailB.root);

  const shampo = buildYarlhaShampoModel(THREE);
  shampo.group.name = 'StoryYarlhaShampo';
  shampo.group.position.set(0, 0, -4.2);
  shampo.group.scale.setScalar(0.65);
  clearing.add(shampo.group);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  const vajraRing = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.58, 36), ringMat);
  vajraRing.name = 'StoryYarlungVajraRing';
  vajraRing.rotation.x = Math.PI / 2;
  vajraRing.position.set(0, 1.65, 0);
  shampo.group.add(vajraRing);

  const nyenList = [
    { model: nyenA, basePos: new THREE.Vector3(-2.8, 0, 0.85) },
    { model: nyenB, basePos: new THREE.Vector3(2.8, 0, -0.65) },
  ];
  const hailList = [hailA, hailB];

  return {
    set(checkpoint, dt, time) {
      const stepDt = dt > 0 ? dt : 0.016;
      const stone1Cleared = checkpoint >= 3;
      const freed = checkpoint >= 5;

      for (const [idx, { model, basePos }] of nyenList.entries()) {
        model.animate(
          {
            animTime: time + idx * 0.9,
            state: stone1Cleared ? 'idle' : 'windup',
            stateTimer: 0.2,
            activeAttack: { id: 'rootGrasp', windup: 0.6 },
          },
          stepDt,
          !freed,
        );
        if (freed) {
          model.root.position.set(basePos.x * 1.25, -0.22, basePos.z * 1.25);
          model.bodyRoot.rotation.x = 0.42;
          model.root.scale.setScalar(0.84);
        } else {
          model.root.position.copy(basePos);
          model.bodyRoot.rotation.x = 0;
          model.root.scale.setScalar(stone1Cleared ? 0.92 : 1.0);
        }
      }

      for (const [idx, hail] of hailList.entries()) {
        const cleared = idx === 0 ? stone1Cleared : freed;
        hail.animate({ animTime: time + idx * 1.2 }, stepDt * (cleared ? 0.35 : 1.4));
        hail.root.scale.setScalar(cleared ? 0.42 : 0.88);
        hail.root.position.y = cleared ? -0.35 : 0;
      }

      const shampoVisible = checkpoint >= 6;
      shampo.group.visible = shampoVisible;
      if (shampoVisible) {
        shampo.anim(stepDt, { animState: 'kneel', subdued: true, enraged: false });
        vajraRing.rotation.z = time * 1.25;
      }
    },
  };
}

export async function createYarlungScene(ctx) {
  const group = new THREE.Group();
  group.name = 'StoryYarlung';
  const colliders = [];
  const map = createMap({ scene: group, colliders, storyPreview: true });
  const { getHeight } = map;
  const arena = map.group.getObjectByName('AlpinePastureArena');
  // Keep the crags and terrain but hide the Adventure encounter boundary.
  arena.children.find((object) => object.geometry?.type === 'RingGeometry').visible = false;

  const clearing = new THREE.Group();
  clearing.position.set(pasture.x, getHeight(pasture.x, pasture.z), pasture.z);
  group.add(clearing);
  const sphere = new THREE.SphereGeometry(1, 18, 12);
  const { yak, torso, head, forelegs } = makeYak(clearing, sphere);
  const guardian = makeGuardian(clearing, sphere);
  const monsters = makeMonsters(clearing);
  const rocks = new THREE.DodecahedronGeometry(1);
  const rock = new THREE.MeshStandardMaterial({ color: 0x69625e, roughness: 0.97 });
  const stones = [
    makeStone(clearing, rocks, rock, 'YakLooseStoneA', [1.12, 0.31, 1.88], [2.17, 0.31, 0.55], [0.62, 0.43, 0.51]),
    makeStone(clearing, rocks, rock, 'YakLooseStoneB', [0.48, 0.26, 1.52], [-1.32, 0.26, 2.12], [0.54, 0.35, 0.45]),
  ];
  const animalCollider = { type: 'circle', x: pasture.x, z: pasture.z, r: 1.58, zone: 'yarlung' };
  colliders.push(animalCollider, ...stones.map(({ collider }) => collider));
  ctx.colliders.push(...colliders);

  let checkpoint = -1;
  let transition = false;
  let reduced = false;
  let disposed = false;
  let elapsed = 0;
  let ambient = 0;

  const agitation = [1, 0.78, 0.16, 0.84, 0.08, 0.13, 0.04, 0, 0, 0, 0];
  const bow = [-0.1, -0.07, 0.19, -0.22, 0.28, 0.04, 0.55, 0.55, 0.55, 0.55, 0.55];

  function render(dt = 0) {
    const ease = (duration) => transition ? THREE.MathUtils.smoothstep(elapsed, 0, duration) : 1;
    const from = transition ? checkpoint - 1 : checkpoint;
    const tension = THREE.MathUtils.lerp(agitation[from], agitation[checkpoint], ease(0.73));
    const settle = THREE.MathUtils.lerp(bow[from], bow[checkpoint], ease(0.84));
    const release = checkpoint === 6 ? ease(0.85) : Number(checkpoint > 6);
    const apparition = checkpoint === 7 ? ease(1.25) : Number(checkpoint > 7);
    const shiver = Math.sin(ambient * 8);
    torso.scale.y = 1 + Math.sin(ambient * 3.2) * (0.008 + tension * 0.018);
    torso.rotation.z = shiver * tension * 0.035;
    head.rotation.x = settle + shiver * tension * 0.16;
    head.rotation.y = Math.sin(ambient * 5) * tension * 0.17;
    const freeing = checkpoint === 5 ? Math.sin(ease(0.85) * Math.PI) * 0.66 : 0;
    const stepping = Math.sin(release * Math.PI) + freeing;
    forelegs[1].rotation.x = stepping * 0.34 + shiver * tension * 0.045;
    forelegs[1].position.y = 1.16 + stepping * 0.15;
    forelegs[0].rotation.x = -stepping * 0.15;
    yak.position.z = -0.48 * release;
    yak.visible = apparition < 0.65;
    yak.scale.setScalar(1 - apparition * 0.72);
    guardian.set(apparition);
    monsters.set(checkpoint, dt, ambient);
    animalCollider.z = pasture.z + yak.position.z;
    animalCollider.r = yak.visible ? 1.58 : 0.9;
    stones[0].set(checkpoint === 3 ? ease(0.78) : Number(checkpoint > 3));
    stones[1].set(checkpoint === 5 ? ease(0.78) : Number(checkpoint > 5));
  }

  function restore(checkpointId, { animate = false, reducedMotion = false } = {}) {
    const next = checkpointIds.indexOf(checkpointId);
    if (disposed || next < 0) return;
    transition = animate && !reducedMotion && checkpoint >= 0 && next === checkpoint + 1;
    checkpoint = next;
    reduced = reducedMotion;
    elapsed = 0;
    if (!transition) ambient = 0;
    render();
  }

  restore('observe');
  return {
    group, getHeight, restore,
    getTarget(checkpointId) {
      if (!Object.hasOwn(approaches, checkpointId)) return null;
      const [dx, dz, focusX, focusZ, rise] = approaches[checkpointId];
      const x = pasture.x + focusX;
      const z = pasture.z + focusZ;
      return { x: pasture.x + dx, z: pasture.z + dz, lookAt: { x, y: getHeight(x, z) + rise, z } };
    },
    update(dt) {
      if (disposed || reduced || !Number.isFinite(dt) || dt <= 0) return;
      elapsed += dt;
      ambient += dt;
      map.update(dt);
      render(dt);
    },
    getSnapshot() {
      return {
        checkpointId: checkpointIds[checkpoint],
        stonesCleared: Number(checkpoint >= 3) + Number(checkpoint >= 5),
        yakVisible: yak.visible,
        guardianVisible: guardian.group.visible,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const collider of colliders) {
        const index = ctx.colliders.indexOf(collider);
        if (index >= 0) ctx.colliders.splice(index, 1);
      }
      disposeGroup(group);
    },
  };
}
