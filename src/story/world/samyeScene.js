import * as THREE from 'three';
import { createMap } from '../../world/maps/samye.js';
import { seededRandom } from '../../world/mapBase.js';
import { SAMYE_CHAPTER } from '../../data/story/chapters/samye.js';

const approaches = {
  stone: [5008, 38, 5008, 35, 0.6],
  wood: [5016, 38, 5017, 35, 0.8],
  night: [5012, 42, 5012, 34, 1.3],
  rebuild: [5004, 34, 5010, 34, 0.7],
  hepori: [5063, 5, 5075, -10, 1.0],
  memory: [5063, 5, 5000, 0, 9],
};
const stages = [0, 1, 2, 0, 3, 3, 3, 3];
const transitionSeconds = 1.25;

function makeWorksite(group, getHeight) {
  const stone = new THREE.MeshStandardMaterial({ color: 0xb0a38e, roughness: 0.94 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x835434, roughness: 0.86 });
  const blockGeometry = new THREE.BoxGeometry(0.83, 0.46, 0.64);
  const beamGeometry = new THREE.BoxGeometry(2.6, 0.19, 0.21);
  const pieces = [];

  function add(name, geometry, material, stacked, placed, fallen) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const poses = [stacked, placed, fallen].map(([x, z, rise, angle = 0, tilt = 0]) => ({
      position: new THREE.Vector3(x, getHeight(x, z) + rise, z),
      angle, tilt,
    }));
    pieces.push({ mesh, poses, isBeam: geometry === beamGeometry });
  }

  for (let i = 0; i < 6; i++) {
    const column = i % 3;
    const course = Math.floor(i / 3);
    add(
      'SamyeWorksiteStone', blockGeometry, stone,
      [5007.2 + 0.92 * column, 35 - course * 0.72, 0.24, 0.08 * i],
      [5011.1 + column * 0.85, 34, 0.24 + course * 0.46],
      [5007.6 + i * 0.83, 34.2 + (i % 2) * 1.05, 0.29, i * 0.46, 0.24],
    );
  }
  for (let i = 0; i < 2; i++) {
    add(
      'SamyeWorksiteTimber', beamGeometry, timber,
      [5017, 34.8 + i * 0.43, 0.15, 0.2],
      [5012, 33.84 + i * 0.32, 1.02],
      [5012.5 + i, 36.4 + i * 0.65, 0.15, 0.6 - i * 0.95, 0.12],
    );
  }

  const footing = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.1, 0.85), stone);
  footing.position.set(5012, getHeight(5012, 34) + 0.05, 34);
  group.add(footing);

  function poseFor(piece, checkpoint) {
    if (checkpoint === 3) return piece.poses[2];
    if (checkpoint >= (piece.isBeam ? 2 : 1)) return piece.poses[1];
    return piece.poses[0];
  }

  return {
    set(from, to, progress) {
      for (const piece of pieces) {
        const first = poseFor(piece, from);
        const last = poseFor(piece, to);
        piece.mesh.position.lerpVectors(first.position, last.position, progress);
        if (first !== last) piece.mesh.position.y += Math.sin(progress * Math.PI) * 0.6;
        piece.mesh.rotation.set(0, THREE.MathUtils.lerp(first.angle, last.angle, progress),
          THREE.MathUtils.lerp(first.tilt, last.tilt, progress));
      }
    },
  };
}

function addBuilders(group, getHeight, colliders) {
  const tunics = [
    new THREE.MeshStandardMaterial({ color: 0x7a4937 }),
    new THREE.MeshStandardMaterial({ color: 0x535f63 }),
  ];
  const skin = new THREE.MeshStandardMaterial({ color: 0xaa7858 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x403a35 });
  const body = new THREE.CylinderGeometry(0.18, 0.27, 0.58, 8);
  const leg = new THREE.CylinderGeometry(0.07, 0.065, 0.64, 7);
  const head = new THREE.SphereGeometry(0.14, 10, 8);
  const cap = new THREE.SphereGeometry(0.147, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.51);
  const arm = new THREE.CylinderGeometry(0.065, 0.052, 0.45, 7);
  const positions = [[5009.8, 32.8], [5015.6, 33]];
  const builders = positions.map(([x, z], index) => {
    const builder = new THREE.Group();
    builder.name = 'SamyeWorksiteBuilder';
    builder.position.set(x, getHeight(x, z), z);
    builder.rotation.y = index === 0 ? 0.68 : -0.8;
    group.add(builder);
    colliders.push({ type: 'circle', zone: 'samye', x, z, r: 0.35 });

    function meshAt(geometry, material, x, y, z) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      builder.add(mesh);
      return mesh;
    }

    meshAt(body, tunics[index], 0, 0.93, 0);
    meshAt(head, skin, 0, 1.38, 0.04);
    meshAt(cap, cloth, 0, 1.41, 0.04);
    meshAt(leg, cloth, -0.12, 0.32, 0);
    meshAt(leg, cloth, 0.12, 0.32, 0);
    return [-0.25, 0.25].map(x => meshAt(arm, tunics[index], x, 0.97, 0.12));
  });
  return (progress, working) => {
    for (const [index, arms] of builders.entries()) {
      const lift = working ? Math.sin(progress * Math.PI) * (1.05 - index * 0.23) : 0;
      for (const arm of arms) arm.rotation.x = -0.6 - lift;
    }
  };
}

function makeNight(group) {
  const rng = seededRandom(964);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(242, 32, 16), new THREE.MeshBasicMaterial({
    color: 0x17203a, side: THREE.BackSide, transparent: true, opacity: 0,
    depthWrite: false, fog: false,
  }));
  sky.name = 'SamyeNightSky';
  sky.position.set(5000, 0, 0);
  group.add(sky);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 8), new THREE.MeshBasicMaterial({
    color: 0xdce4ed, transparent: true, opacity: 0, fog: false,
  }));
  moon.position.set(4981, 31, -118);
  group.add(moon);

  const drift = Array.from({ length: 80 }, () => [rng() * 19, rng() * 1.5, rng() * 8]);
  const points = new THREE.BufferAttribute(new Float32Array(drift.length * 3), 3);
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', points),
    new THREE.PointsMaterial({ color: 0xe7d4af, size: 0.14, transparent: true, depthWrite: false }));
  dust.name = 'SamyeCollapseDust';
  dust.frustumCulled = false;
  group.add(dust);

  const colors = new Map();
  group.traverse(({ material }) => {
    if (material?.isMeshStandardMaterial && !colors.has(material)) {
      colors.set(material, material.color.clone());
    }
  });
  const shade = new THREE.Color();
  let nightLevel = -1;

  return (level, dustProgress) => {
    if (nightLevel !== level) {
      nightLevel = level;
      sky.visible = moon.visible = level > 0;
      sky.material.opacity = moon.material.opacity = level;
      shade.setRGB(1 - level * 0.73, 1 - level * 0.65, 1 - level * 0.47);
      for (const [material, color] of colors) material.color.copy(color).multiply(shade);
    }
    dust.visible = dustProgress > 0 && dustProgress < 1;
    if (dust.visible) {
      dust.material.opacity = 0.68 * Math.sin(Math.PI * dustProgress);
      for (const [index, [x, y, z]] of drift.entries()) {
        points.setXYZ(index, 5001 + x + dustProgress * 7, 0.2 + y + dustProgress, 29 + z);
      }
      points.needsUpdate = true;
    }
  };
}

function disposeGroup(group) {
  const geometries = new Set();
  const materials = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (Array.isArray(object.material)) {
      for (const material of object.material) materials.add(material);
    } else if (object.material) {
      materials.add(object.material);
    }
    if (object.isInstancedMesh) object.dispose();
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  group.removeFromParent();
  group.clear();
}

export async function createSamyeScene(ctx) {
  const colliders = [];
  const { group, getHeight, setStage, structure, nightTorches } =
    createMap({ colliders }, undefined, { presentationOnly: true });
  group.name = 'StorySamye';
  const worksite = makeWorksite(group, getHeight);
  const poseBuilders = addBuilders(group, getHeight, colliders);
  const setNight = makeNight(group);
  colliders.push({ type: 'box', zone: 'samye', minX: 5010.4, maxX: 5013.6, minZ: 33.5, maxZ: 34.5 });
  ctx.colliders.push(...colliders);

  let checkpoint = 0;
  let previous = 0;
  let progress = 1;
  let visibleStage = -1;
  let disposed = false;

  function render() {
    const eased = progress * progress * (3 - 2 * progress);
    const transitioning = progress < 1;
    const collapsing = transitioning && checkpoint === 3;
    const stage = collapsing ? stages[previous] : stages[checkpoint];
    if (stage !== visibleStage) visibleStage = setStage(stage);

    structure.scale.y = collapsing ? 1 - eased * 0.92
      : transitioning ? 0.55 + eased * 0.45 : 1;
    worksite.set(previous, checkpoint, eased);
    poseBuilders(eased, transitioning && !collapsing);

    const night = THREE.MathUtils.lerp(Number(previous === 3), Number(checkpoint === 3), eased);
    nightTorches.visible = night > 0.45;
    setNight(night, collapsing ? progress : 1);
  }

  function restore(checkpointId, { animate = false, reducedMotion = false } = {}) {
    const next = SAMYE_CHAPTER.checkpoints.findIndex(({ id }) => id === checkpointId);
    if (disposed || next === -1) return;
    const transition = animate && !reducedMotion && next === checkpoint + 1 && next <= 4;
    previous = transition ? checkpoint : next;
    checkpoint = next;
    progress = transition ? 0 : 1;
    render();
  }

  render();
  return {
    group, getHeight, restore,
    update(dt) {
      if (disposed || progress === 1 || !Number.isFinite(dt) || dt <= 0) return;
      progress = Math.min(1, progress + dt / transitionSeconds);
      render();
    },
    getTarget(id) {
      if (!Object.hasOwn(approaches, id)) return null;
      const [x, z, lookX, lookZ, rise] = approaches[id];
      return { x, z, lookAt: { x: lookX, y: getHeight(lookX, lookZ) + rise, z: lookZ } };
    },
    getSnapshot() {
      return {
        checkpointId: SAMYE_CHAPTER.checkpoints[checkpoint].id,
        stage: visibleStage,
        site: ['supplies', 'stone-laid', 'timber-raised', 'ruins'][checkpoint] ?? 'rebuilt',
        phase: checkpoint === 3 ? 'night' : checkpoint >= 4 ? 'dawn' : 'day',
        animating: progress < 1,
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
