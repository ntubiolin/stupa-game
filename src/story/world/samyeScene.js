import * as THREE from 'three';
import { isTibetanSurfaceLowSpec } from '../../world/tibetanSurfaces.js';
import { createMap } from '../../world/maps/samye.js';
import { seededRandom } from '../../world/mapBase.js';
import {
  buildWallBreakerModel,
  buildDuModel,
  buildGyalpoModel,
} from '../../gameplay/enemyModels/samye.js';
import { buildPeharModel } from '../../gameplay/bosses/pehar.js';

const approaches = {
  stone: [5008, 38, 5008, 35, 0.6],
  wood: [5016, 38, 5017, 35, 0.8],
  photo: [5012, 39.5, 5012, 34, 1.3],
  night: [5012, 39.5, 5012, 34, 1.3],
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
  const buildersGroup = new THREE.Group();
  buildersGroup.name = 'StorySamyeBuilders';
  group.add(buildersGroup);
  const builders = positions.map(([x, z], index) => {
    const builder = new THREE.Group();
    builder.name = 'SamyeWorksiteBuilder';
    builder.position.set(x, getHeight(x, z), z);
    builder.rotation.y = index === 0 ? 0.68 : -0.8;
    buildersGroup.add(builder);
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
    return {
      builder,
      baseY: getHeight(x, z),
      arms: [-0.25, 0.25].map(x => meshAt(arm, tunics[index], x, 0.97, 0.12)),
    };
  });
  return (progress, working, time = 0, daytime = true) => {
    for (const [index, { builder, baseY, arms }] of builders.entries()) {
      const idleWave = daytime ? Math.sin(time * 3.0 + index * 1.4) * 0.18 : 0;
      const lift = working ? Math.sin(progress * Math.PI) * (1.05 - index * 0.23) : idleWave;
      for (const arm of arms) arm.rotation.x = -0.6 - lift;
      builder.position.y = baseY + (daytime ? Math.abs(Math.sin(time * 2.5 + index)) * 0.03 : 0);
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

function disposeGroup(group, surfaceTextures) {
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
  for (const texture of surfaceTextures) texture.dispose();
  group.removeFromParent();
  group.clear();
}

function makeMonstersAndPehar(group, getHeight) {
  const monstersGroup = new THREE.Group();
  monstersGroup.name = 'StorySamyeMonsters';
  group.add(monstersGroup);

  const wallBreaker = buildWallBreakerModel();
  wallBreaker.group.name = 'StoryWallBreaker';
  monstersGroup.add(wallBreaker.group);

  const du = buildDuModel();
  du.group.name = 'StoryDuDemon';
  monstersGroup.add(du.group);

  const gyalpo = buildGyalpoModel();
  gyalpo.group.name = 'StoryGyalpoSpirit';
  monstersGroup.add(gyalpo.group);

  const oathRingGeo = new THREE.TorusGeometry(0.55, 0.035, 6, 20);
  oathRingGeo.rotateX(Math.PI / 2);
  const oathRingMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.85,
  });

  const demonSpecs = [
    {
      model: wallBreaker,
      closePos: [5011.2, 35.1],
      recoilPos: [5006.8, 36.6],
      yaw: 0.25,
    },
    {
      model: du,
      closePos: [5013.4, 35.2],
      recoilPos: [5017.2, 36.8],
      yaw: -0.35,
    },
    {
      model: gyalpo,
      closePos: [5012.0, 31.8],
      recoilPos: [5012.0, 29.8],
      yaw: Math.PI,
    },
  ].map((spec) => {
    const ring = new THREE.Mesh(oathRingGeo, oathRingMat);
    ring.name = 'StoryDemonOathRing';
    ring.position.y = 0.88;
    ring.visible = false;
    spec.model.group.add(ring);
    return { ...spec, ring };
  });

  // Pehar and Golden Oath-Mandala on Mount Hepo Ri
  const pehar = buildPeharModel();
  pehar.group.name = 'StoryPehar';
  const hx = 5075;
  const hz = -10;
  const hy = getHeight(hx, hz);
  pehar.group.position.set(hx, hy, hz);
  pehar.group.rotation.y = Math.atan2(5063 - hx, 5 - hz);
  group.add(pehar.group);

  const heporiMandala = new THREE.Group();
  heporiMandala.name = 'StoryHeporiMandala';
  heporiMandala.position.set(hx, hy + 0.14, hz);
  const mandalaMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.38, 36), mandalaMat);
  outerRing.rotation.x = -Math.PI / 2;
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.42, 32), mandalaMat);
  innerRing.rotation.x = -Math.PI / 2;
  heporiMandala.add(outerRing, innerRing);
  group.add(heporiMandala);

  return (checkpointId, checkpointIdx, dt, time) => {
    const stepDt = dt > 0 ? dt : 0.016;
    const isDaytime = ['stone', 'wood', 'photo'].includes(checkpointId);
    const isNightAttack = checkpointId === 'night';
    const isRebuild = checkpointId === 'rebuild';
    const isSubdued = checkpointIdx >= 4;

    monstersGroup.visible = !isDaytime;
    if (monstersGroup.visible) {
      for (const [idx, { model, closePos, recoilPos, yaw, ring }] of demonSpecs.entries()) {
        const [bx, bz] = isNightAttack ? closePos : recoilPos;
        const orbit = isNightAttack ? Math.sin(time * 2.8 + idx * 2.1) * 0.45 : 0;
        const x = bx + orbit;
        const z = bz + (isNightAttack ? Math.cos(time * 2.8 + idx * 2.1) * 0.35 : 0);
        const y = getHeight(x, z);

        model.animate(
          {
            animTime: time + idx * 0.8,
            state: isNightAttack ? 'windup' : 'idle',
          },
          stepDt,
          isNightAttack,
        );

        model.group.position.set(x, y + (isSubdued ? -0.18 : 0), z);
        model.group.rotation.set(isSubdued ? 0.42 : 0, yaw, 0);
        ring.visible = isSubdued;
        if (isSubdued) {
          ring.rotation.z = time * 1.6 + idx;
        }
      }
    }

    pehar.group.visible = isSubdued;
    heporiMandala.visible = isSubdued;
    if (isSubdued) {
      pehar.anim('kneel', time, stepDt, { subdued: true });
      outerRing.rotation.z = time * 0.85;
      innerRing.rotation.z = -time * 1.15;
    }
  };
}

export async function createSamyeScene(ctx) {
  const colliders = [];
  const { group, getHeight, setStage, structure, nightTorches, surfaceTextures } =
    createMap({ colliders, lowSpec: isTibetanSurfaceLowSpec(ctx) }, undefined, { presentationOnly: true });
  group.name = 'StorySamye';
  const worksite = makeWorksite(group, getHeight);
  const poseBuilders = addBuilders(group, getHeight, colliders);
  const setNight = makeNight(group);
  const setMonsters = makeMonstersAndPehar(group, getHeight);
  colliders.push({ type: 'box', zone: 'samye', minX: 5010.4, maxX: 5013.6, minZ: 33.5, maxZ: 34.5 });
  ctx.colliders.push(...colliders);

  let checkpoint = 0;
  let currentCheckpoint = 'stone';
  let previous = 0;
  let progress = 1;
  let ambient = 0;
  let reduced = false;
  let visibleStage = -1;
  let disposed = false;

  function render(dt = 0) {
    const eased = progress * progress * (3 - 2 * progress);
    const transitioning = progress < 1;
    const collapsing = transitioning && checkpoint === 3;
    const stage = collapsing ? stages[previous] : stages[checkpoint];
    if (stage !== visibleStage) visibleStage = setStage(stage);

    structure.scale.y = collapsing ? 1 - eased * 0.92
      : transitioning ? 0.55 + eased * 0.45 : 1;
    worksite.set(previous, checkpoint, eased);
    poseBuilders(eased, transitioning && !collapsing, ambient, checkpoint <= 2);

    const night = THREE.MathUtils.lerp(Number(previous === 3), Number(checkpoint === 3), eased);
    nightTorches.visible = night > 0.45;
    setNight(night, collapsing ? progress : 1);
    setMonsters(currentCheckpoint, checkpoint, dt, ambient);
  }

  function restore(checkpointId, { animate = false, reducedMotion = false } = {}) {
    // Keep visual phases keyed to the original checkpoints for old saves.
    const next = ['stone', 'wood', 'night', 'rebuild', 'hepori', 'memory', 'diary', 'complete']
      .indexOf(checkpointId === 'photo' ? 'night' : checkpointId);
    if (disposed || next === -1) return;
    const transition = animate && !reducedMotion && next === checkpoint + 1 && next <= 4;
    reduced = reducedMotion;
    previous = transition ? checkpoint : next;
    checkpoint = next;
    currentCheckpoint = checkpointId;
    progress = transition ? 0 : 1;
    if (!transition) ambient = 0;
    render();
  }

  render();
  return {
    group, getHeight, restore,
    update(dt) {
      if (disposed || reduced || !Number.isFinite(dt) || dt <= 0) return;
      ambient = (ambient + dt) % 1000;
      if (progress < 1) {
        progress = Math.min(1, progress + dt / transitionSeconds);
      }
      render(dt);
    },
    getTarget(id) {
      if (!Object.hasOwn(approaches, id)) return null;
      const [x, z, lookX, lookZ, rise] = approaches[id];
      return { x, z, lookAt: { x: lookX, y: getHeight(lookX, lookZ) + rise, z: lookZ } };
    },
    getSnapshot() {
      return {
        checkpointId: currentCheckpoint,
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
      disposeGroup(group, surfaceTextures);
    },
  };
}
