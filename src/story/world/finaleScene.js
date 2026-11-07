import * as THREE from 'three';
import { FINALE_CHAPTER } from '../../data/story/chapters/finale.js';

const targets = {
  custody: [-11, 27.8, -11, 1.18, 32],
  kora1: [-30, 0, 0, 9, 0],
  kora2: [0, -30, 0, 9, 0],
  kora3: [30, 0, 0, 9, 0],
  kora4: [0, 28, 10, 1.8, 32],
  lamp: [10, 28.5, 10, 1.16, 32],
};
const checkpoints = FINALE_CHAPTER.checkpoints.map(({ id }) => id);
const custodyIndex = checkpoints.indexOf('custody');
const koraIndex = checkpoints.indexOf('kora1');
const diaryIndex = checkpoints.indexOf('lampPrayer');

function addBox(group, material, width, height, depth, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function makeChapel(group, plaster, wood, trim) {
  const chapel = new THREE.Group();
  chapel.name = 'FinaleCustodyChapel';
  chapel.position.set(-11, 0, 32);
  chapel.rotation.y = Math.PI;
  group.add(chapel);

  addBox(chapel, plaster, 3.25, 0.18, 2.6, 0, 0.09, 0);
  addBox(chapel, plaster, 3.0, 2.05, 0.18, 0, 1.16, -1.08);
  for (const x of [-1.44, 1.44]) {
    addBox(chapel, plaster, 0.18, 2.05, 2.16, x, 1.16, 0);
    addBox(chapel, wood, 0.23, 2.03, 0.24, x * 0.79, 1.16, 1.12);
  }
  addBox(chapel, trim, 3.27, 0.27, 2.45, 0, 2.16, 0.03);
  addBox(chapel, wood, 3.53, 0.16, 2.7, 0, 2.36, 0.03);
  addBox(chapel, wood, 3.27, 0.1, 2.43, 0, 2.49, 0.03);

  const niche = new THREE.Group();
  niche.name = 'FinaleStoneNiche';
  niche.position.set(0, 1.08, -0.73);
  chapel.add(niche);
  const stone = new THREE.MeshStandardMaterial({ color: 0xa69c84, roughness: 0.95 });
  const recess = new THREE.MeshStandardMaterial({ color: 0x514e48, roughness: 0.94 });
  addBox(niche, recess, 0.78, 0.78, 0.06, 0, 0.23, -0.25);
  addBox(niche, stone, 0.97, 0.09, 0.62, 0, -0.08, 0.02);
  addBox(niche, stone, 0.94, 0.12, 0.49, 0, 0.66, -0.03);
  for (const x of [-0.41, 0.41]) addBox(niche, stone, 0.13, 0.72, 0.44, x, 0.29, -0.05);

  addBox(chapel, wood, 0.68, 0.84, 0.55, -0.6, 0.55, 0.73);
  addBox(chapel, wood, 0.84, 0.075, 0.65, -0.6, 0.99, 0.73);
  const paper = new THREE.MeshStandardMaterial({ color: 0xdccba3, roughness: 0.88 });
  const record = addBox(chapel, paper, 0.28, 0.018, 0.29, -0.79, 1.045, 0.85);
  record.name = 'FinaleCustodyRecord';
  record.rotation.y = -0.16;

  const edge = new THREE.Shape();
  edge.moveTo(-0.26, -0.29);
  edge.lineTo(0.19, -0.29);
  edge.lineTo(0.26, -0.23);
  edge.lineTo(0.24, 0.25);
  edge.lineTo(0.1, 0.31);
  edge.lineTo(-0.22, 0.27);
  edge.lineTo(-0.28, 0.12);
  edge.closePath();
  const tablet = new THREE.Mesh(new THREE.ExtrudeGeometry(edge, {
    depth: 0.08, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.013, bevelThickness: 0.012,
  }), new THREE.MeshStandardMaterial({ color: 0x6a6c64, roughness: 0.87 }));
  tablet.name = 'FinaleTablet';
  tablet.castShadow = true;
  chapel.add(tablet);

  const checkedPosition = new THREE.Vector3(-0.49, 1.1, 0.67);
  const storedPosition = new THREE.Vector3(0, 1.34, -0.71);
  return progress => {
    tablet.position.lerpVectors(checkedPosition, storedPosition, progress);
    tablet.position.y += Math.sin(progress * Math.PI) * 0.33;
    tablet.rotation.set(THREE.MathUtils.lerp(-1.24, -0.13, progress), -0.14 * (1 - progress), 0);
  };
}

function makeLampRoom(group, plaster, wood, trim) {
  const room = new THREE.Group();
  room.name = 'FinaleLampRoom';
  room.position.set(10, 0, 32);
  group.add(room);
  addBox(room, plaster, 2.7, 0.16, 2.4, 0, 0.08, 0);
  addBox(room, plaster, 2.55, 1.95, 0.16, 0, 1.13, 1.05);
  addBox(room, trim, 2.72, 0.26, 2.5, 0, 2.19, 0.02);
  addBox(room, wood, 2.92, 0.14, 2.68, 0, 2.39, 0.02);
  for (const x of [-1.13, 1.13]) {
    addBox(room, wood, 0.17, 2.12, 0.17, x, 1.2, -1.02);
  }
  addBox(room, wood, 1.65, 0.82, 0.63, 0, 0.55, -0.02);
  addBox(room, wood, 1.83, 0.09, 0.76, 0, 0.99, -0.02);

  const brass = new THREE.MeshStandardMaterial({ color: 0xbc8e52, metalness: 0.43, roughness: 0.46 });
  const wax = new THREE.MeshStandardMaterial({
    color: 0xb39e6b, emissive: 0xf09537, emissiveIntensity: 0, roughness: 0.62,
  });
  const lamp = new THREE.Group();
  lamp.name = 'FinaleButterLamp';
  lamp.position.set(0, 1.035, -0.09);
  room.add(lamp);
  for (const [top, bottom, height, y] of [
    [0.09, 0.13, 0.05, 0.025], [0.075, 0.08, 0.095, 0.093], [0.23, 0.08, 0.13, 0.2],
  ]) {
    const piece = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 20), brass);
    piece.position.y = y;
    piece.castShadow = true;
    lamp.add(piece);
  }
  const surface = new THREE.Mesh(new THREE.CylinderGeometry(0.208, 0.208, 0.012, 20), wax);
  surface.position.y = 0.263;
  lamp.add(surface);
  addBox(lamp, wood, 0.035, 0.064, 0.035, 0, 0.289, 0);

  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.6, 1.23, 0.33), toneMapped: false,
  }));
  flame.name = 'FinaleLampFlame';
  flame.position.y = 0.395;
  lamp.add(flame);

  return (progress, seconds) => {
    flame.visible = progress > 0;
    flame.scale.set(0.52 * progress, (1 + Math.sin(seconds * 7) * 0.08) * progress, 0.52 * progress);
    flame.rotation.z = Math.sin(seconds * 4) * 0.14;
    wax.emissiveIntensity = 0.45 * progress;
  };
}

export async function createFinaleScene(ctx) {
  const group = new THREE.Group();
  group.name = 'StoryFinale';
  const plaster = new THREE.MeshStandardMaterial({ color: 0xd6caba, roughness: 0.94 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x503328, roughness: 0.81 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x70322c, roughness: 0.85 });
  const placeTablet = makeChapel(group, plaster, wood, trim);
  const lightLamp = makeLampRoom(group, plaster, wood, trim);
  const propsColliders = [
    { type: 'box', minX: -12.62, maxX: -9.38, minZ: 30.7, maxZ: 33.3, zone: 'stupa' },
    { type: 'box', minX: 8.65, maxX: 11.35, minZ: 30.8, maxZ: 33.2, zone: 'stupa' },
  ];
  let checkpoint = 0;
  let transition = 1;
  let seconds = 0;
  let reduced = false;
  let collidersInstalled = false;
  let disposed = false;

  function installColliders(active) {
    if (active === collidersInstalled) return;
    collidersInstalled = active;
    for (const collider of propsColliders) {
      if (active) ctx.colliders.push(collider);
      else {
        const index = ctx.colliders.indexOf(collider);
        if (index !== -1) ctx.colliders.splice(index, 1);
      }
    }
  }

  function render() {
    const active = checkpoint >= custodyIndex;
    // The runtime owns group visibility and the surrounding Boudhanath world.
    for (const prop of group.children) prop.visible = active;
    installColliders(active);
    const eased = transition * transition * (3 - 2 * transition);
    placeTablet(checkpoint === koraIndex ? eased : Number(checkpoint > koraIndex));
    lightLamp(checkpoint === diaryIndex ? eased : Number(checkpoint > diaryIndex), seconds);
  }

  function restore(checkpointId, { animate = false, reducedMotion = false } = {}) {
    const next = checkpoints.indexOf(checkpointId);
    if (disposed || next < 0) return;
    const motion = animate && !reducedMotion && next === checkpoint + 1;
    transition = motion && (next === koraIndex || next === diaryIndex) ? 0 : 1;
    checkpoint = next;
    reduced = reducedMotion;
    seconds = 0;
    render();
  }

  render();
  return {
    group, getHeight: () => 0, restore,
    getTarget(id) {
      if (!Object.hasOwn(targets, id)) return null;
      const [x, z, lookX, lookY, lookZ] = targets[id];
      return { x, z, lookAt: { x: lookX, y: lookY, z: lookZ } };
    },
    update(dt) {
      if (disposed || reduced || !Number.isFinite(dt) || dt <= 0) return;
      if (transition === 1 && checkpoint < diaryIndex) return;
      transition = Math.min(1, transition + dt / (checkpoint === koraIndex ? 1.1 : 0.65));
      seconds = (seconds + dt) % (Math.PI * 2);
      render();
    },
    getSnapshot() {
      return {
        checkpointId: checkpoints[checkpoint],
        propsVisible: collidersInstalled,
        tabletStored: checkpoint > koraIndex || (checkpoint === koraIndex && transition === 1),
        lampLit: checkpoint > diaryIndex || (checkpoint === diaryIndex && transition > 0),
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      installColliders(false);
      const materials = new Set();
      group.traverse(object => {
        object.geometry?.dispose();
        if (object.material) materials.add(object.material);
      });
      for (const material of materials) material.dispose();
      group.removeFromParent();
      group.clear();
    },
  };
}
