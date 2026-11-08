import * as THREE from 'three';
import { createBus } from '../../core/events.js';
import { MANGYUL_CHAPTER } from '../../data/story/chapters/mangyul.js';
import { seededRandom } from '../../world/mapBase.js';
import { createMangyulMap } from '../../world/maps/mangyul.js';
import {
  buildSnowSpriteModel,
  buildHailGhostModel,
  buildAvalancheBruteModel,
} from '../../gameplay/enemyModels/mangyul.js';

const colors = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
const checkpoints = MANGYUL_CHAPTER.checkpoints.map(({ id }) => id);
const firstAltar = checkpoints.indexOf('altar1');
const flagsIndex = checkpoints.indexOf('flags');
const calmIndex = checkpoints.indexOf('answer');
const altarIds = MANGYUL_CHAPTER.checkpoints
  .filter(step => step.signal === 'altar:observe').map(step => step.id);
const flagColors = colors.map(color => new THREE.Color(color));

function isClear(colliders, x, z, margin) {
  return colliders.every(collider => {
    if (collider.type === 'circle') return Math.hypot(x - collider.x, z - collider.z) > collider.r + margin;
    if (collider.type === 'box') {
      return Math.hypot(x - THREE.MathUtils.clamp(x, collider.minX, collider.maxX),
        z - THREE.MathUtils.clamp(z, collider.minZ, collider.maxZ)) > margin;
    }
    return true;
  });
}

function getApproach(point, previous, colliders, margin, lookHeight) {
  const direction = Math.atan2(previous.z - point.z, previous.x - point.x);
  for (const turn of [0, 1, -1, 2, -2, 3, -3, 4]) {
    const angle = direction + turn * Math.PI / 4;
    const x = point.x + Math.cos(angle) * 2.45;
    const z = point.z + Math.sin(angle) * 2.45;
    if (isClear(colliders, x, z, margin)) {
      return { x, z, lookAt: { x: point.x, y: point.y + lookHeight, z: point.z } };
    }
  }
  throw new Error('No safe approach to the Mangyul station');
}

function makePassFlags(group, x, y, z) {
  const posts = new THREE.Group();
  posts.name = 'StoryMangyulPrayerFlagLine';
  posts.position.set(x, y, z);
  group.add(posts);

  const postGeometry = new THREE.CylinderGeometry(0.07, 0.11, 2.55, 7);
  const ropeGeometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-1.78, 2.32, 0), new THREE.Vector3(0, 1.66, 0), new THREE.Vector3(1.78, 2.32, 0),
  ), 12, 0.022, 5, false);
  const wood = new THREE.MeshStandardMaterial({ color: 0x694327, roughness: 0.95 });
  const rope = new THREE.MeshStandardMaterial({ color: 0xac8d5f, roughness: 0.97 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(postGeometry, wood);
    post.position.set(side * 1.78, 1.275, 0);
    posts.add(post);
  }
  posts.add(new THREE.Mesh(ropeGeometry, rope));

  const clothGeometry = new THREE.PlaneGeometry(0.55, 0.53);
  // Pivot at the knot on the top edge, so the cloth can unfurl below it.
  clothGeometry.translate(0, -0.265, 0);
  const cloth = colors.map((color, index) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.86, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(clothGeometry, material);
    const fraction = (index + 0.5) / colors.length;
    mesh.position.set(-1.78 + 3.56 * fraction, 2.32 - 1.32 * fraction * (1 - fraction), 0);
    posts.add(mesh);
    return mesh;
  });

  return {
    set(tied, progress, elapsed, storm) {
      cloth.forEach((mesh, index) => {
        mesh.visible = tied || index === 2;
        mesh.scale.set(tied ? 1 : 0.62, tied ? Math.max(0.09, progress) : 0.09, 1);
        mesh.rotation.x = Math.sin(elapsed * (2 + storm * 4) + index) * (0.18 + storm * 0.22) * progress;
      });
    },
  };
}

function setAltarFlags(altar, progress, focused) {
  altar.forEach((mesh, index) => {
    mesh.material.color.setHex(0x8b8e92).lerp(flagColors[index], progress);
    mesh.material.emissive.setHex(focused ? 0xa0c5dc : colors[index]);
    mesh.material.emissiveIntensity = focused ? 0.35 : 0.14 * progress;
  });
}

function makeMonstersAndGoddesses(props, getHeight, altarPoints, passMarker) {
  const kCfg = {
    skin: 0x8ecae6,
    armor: 0x1d3557,
    accent: 0xe0fbfc,
    glow: 0x90e0ef,
    dark: 0x0f172a,
    color: 0x8ecae6,
    accentColor: 0xe0fbfc,
    eyeColor: 0x90e0ef,
  };

  const monstersGroup = new THREE.Group();
  monstersGroup.name = 'StoryMangyulMonsters';
  props.add(monstersGroup);

  const sprite1 = buildSnowSpriteModel(THREE, kCfg);
  sprite1.root.name = 'StorySnowSpriteA';
  const s1x = altarPoints[1].x - 3.8;
  const s1z = altarPoints[1].z - 1.2;
  sprite1.root.position.set(s1x, getHeight(s1x, s1z), s1z);
  monstersGroup.add(sprite1.root);

  const hail1 = buildHailGhostModel(THREE, kCfg);
  hail1.root.name = 'StoryHailGhostA';
  const h1x = altarPoints[4].x + 3.8;
  const h1z = altarPoints[4].z - 1.0;
  hail1.root.position.set(h1x, getHeight(h1x, h1z), h1z);
  monstersGroup.add(hail1.root);

  const sprite2 = buildSnowSpriteModel(THREE, kCfg);
  sprite2.root.name = 'StorySnowSpriteB';
  const s2x = altarPoints[7].x - 3.8;
  const s2z = altarPoints[7].z - 1.2;
  sprite2.root.position.set(s2x, getHeight(s2x, s2z), s2z);
  monstersGroup.add(sprite2.root);

  const hail2 = buildHailGhostModel(THREE, kCfg);
  hail2.root.name = 'StoryHailGhostB';
  const h2x = altarPoints[9].x + 3.8;
  const h2z = altarPoints[9].z - 1.0;
  hail2.root.position.set(h2x, getHeight(h2x, h2z), h2z);
  monstersGroup.add(hail2.root);

  const brute = buildAvalancheBruteModel(THREE, kCfg);
  brute.root.name = 'StoryAvalancheBrute';
  const bx = passMarker.x + 5.2;
  const bz = passMarker.z - 2.4;
  brute.root.position.set(bx, getHeight(bx, bz), bz);
  monstersGroup.add(brute.root);

  const monsterEntries = [
    { model: sprite1, state: { animPhase: 0.2, state: 'idle' }, basePos: sprite1.root.position.clone() },
    { model: hail1, state: { animPhase: 1.1, state: 'idle' }, basePos: hail1.root.position.clone() },
    { model: sprite2, state: { animPhase: 2.3, state: 'idle' }, basePos: sprite2.root.position.clone() },
    { model: hail2, state: { animPhase: 3.4, state: 'idle' }, basePos: hail2.root.position.clone() },
    { model: brute, state: { animPhase: 0.7, state: 'idle', dashTimer: 0 }, basePos: brute.root.position.clone() },
  ];

  // Twelve Tenma Goddesses (十二丹瑪女神) beside the 12 cairn altars
  const goddessesGroup = new THREE.Group();
  goddessesGroup.name = 'StoryTenmaGoddesses';
  props.add(goddessesGroup);

  const robeGeo = new THREE.ConeGeometry(0.36, 1.38, 10);
  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.56, 10);
  const headGeo = new THREE.SphereGeometry(0.16, 10, 8);
  const crownGeo = new THREE.TorusGeometry(0.16, 0.025, 6, 16);
  crownGeo.rotateX(Math.PI / 2);
  const haloGeo = new THREE.RingGeometry(0.38, 0.46, 24);

  const goddessEntries = altarPoints.map((pt, index) => {
    const goddess = new THREE.Group();
    goddess.name = `StoryTenmaGoddess_${index + 1}`;
    const side = index % 2 === 0 ? -1 : 1;
    const gx = pt.x + side * 1.45;
    const gz = pt.z - 0.95;
    const gy = getHeight(gx, gz);
    goddess.position.set(gx, gy, gz);
    goddess.rotation.y = side * 0.45;

    const robeMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x0e7490,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0.78,
    });
    const goldMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });

    const robe = new THREE.Mesh(robeGeo, robeMat);
    robe.position.y = 0.69;
    const torso = new THREE.Mesh(torsoGeo, robeMat);
    torso.position.y = 1.24;
    const head = new THREE.Mesh(headGeo, robeMat);
    head.position.y = 1.66;
    const crown = new THREE.Mesh(crownGeo, goldMat);
    crown.position.y = 1.78;
    const halo = new THREE.Mesh(haloGeo, goldMat);
    halo.position.set(0, 1.66, -0.14);
    goddess.add(robe, torso, head, crown, halo);
    goddessesGroup.add(goddess);

    return {
      group: goddess,
      halo,
      robeMat,
      goldMat,
      baseY: gy,
      defaultYaw: side * 0.45,
      summitYaw: Math.atan2(passMarker.x - gx, passMarker.z - gz),
    };
  });

  return {
    set(checkpoint, dt, time) {
      const stepDt = dt > 0 ? dt : 0.016;
      const inQuestions = checkpoint >= firstAltar + 12 && checkpoint <= calmIndex;
      const pacified = checkpoint > calmIndex;

      for (const [idx, entry] of monsterEntries.entries()) {
        const { model, state, basePos } = entry;
        state.state = inQuestions ? 'windup' : 'idle';
        model.animate(state, stepDt, !pacified);
        if (pacified) {
          model.root.scale.setScalar(0.62);
          model.bodyRoot.rotation.x = 0.45;
          model.root.position.set(
            basePos.x,
            basePos.y - 0.15 + Math.sin(time * 1.8 + idx) * 0.03,
            basePos.z,
          );
        } else {
          model.root.scale.setScalar(inQuestions ? 1.12 : 1.0);
          model.bodyRoot.rotation.x = 0;
          const swirl = Math.sin(time * 2.2 + idx * 1.3) * 0.28;
          model.root.position.set(basePos.x + swirl, basePos.y, basePos.z);
          if (inQuestions) {
            model.root.rotation.y = Math.atan2(
              passMarker.x - model.root.position.x,
              passMarker.z - model.root.position.z,
            );
          } else {
            model.root.rotation.y = Math.sin(time * 1.4 + idx) * 0.45;
          }
        }
      }

      for (const [idx, g] of goddessEntries.entries()) {
        const active = checkpoint >= firstAltar + idx;
        g.group.visible = active;
        if (!active) continue;
        g.group.position.y = g.baseY + Math.sin(time * 2.4 + idx * 0.6) * 0.08;
        g.halo.rotation.z = time * 1.1 + idx * 0.5;
        g.group.rotation.y = inQuestions || pacified ? g.summitYaw : g.defaultYaw;
        g.robeMat.emissiveIntensity = pacified ? 0.85 : inQuestions ? 0.72 : 0.55;
      }
    },
  };
}

function disposeMeshes(group, { disposeMaterials = true } = {}) {
  const geometries = new Set();
  const materials = new Set();
  group.traverse(mesh => {
    if (mesh.isInstancedMesh) mesh.dispose();
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      for (const m of [mesh.material].flat()) materials.add(m);
    }
  });
  if (!disposeMaterials) return;
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

export async function createMangyulScene(ctx) {
  const scene = new THREE.Group();
  const colliders = [];
  const interactables = [];
  const state = { zone: 'story-mangyul', player: { position: new THREE.Vector3() } };
  const map = createMangyulMap({ scene, colliders, interactables, state, bus: createBus() }, { presentationOnly: true });
  const { group, getHeight } = map;
  group.removeFromParent();
  group.name = 'StoryMangyul';
  const root = group.getObjectByName('MangyulLocalRoot');
  const props = new THREE.Group();
  group.add(props);

  function disposeWorld() {
    for (const child of group.children) disposeMeshes(child, { disposeMaterials: child !== root });
    map.dispose();
    group.removeFromParent();
    group.clear();
  }

  const targets = new Map();
  let altars;
  let snow;
  let passFlags;
  let spirits;
  try {
    const altarEntries = interactables.filter(entry => entry.kind === 'tenmaAltar');
    const passPosition = interactables.find(entry => entry.kind === 'passPrayerFlags').getPosition();
    const marker = new THREE.Vector3(passPosition.x, passPosition.y, passPosition.z + 1);
    colliders.push(...[-1.78, 1.78].map(dx =>
      ({ type: 'circle', zone: 'mangyul', x: marker.x + dx, z: marker.z, r: 0.13 })));
    const margin = (ctx.config?.PLAYER?.radius ?? 0.35) + 0.18;
    let previous = { x: root.position.x, z: 43 };
    const altarPoints = [];
    altars = altarEntries.map((entry, index) => {
      const point = entry.getPosition();
      altarPoints.push(point);
      const target = getApproach(point, previous, colliders, margin, 1.75);
      targets.set(altarIds[index], target);
      previous = target;
      const altar = root.children.find(child => child.isGroup
        && child.position.x + root.position.x === point.x && child.position.z + root.position.z === point.z);
      const flags = altar.children.filter(child => child.isMesh && child.geometry.type === 'PlaneGeometry');
      if (flags.length !== colors.length) throw new Error('Mangyul altar flag geometry changed');
      return flags;
    });
    if (altars.length !== altarIds.length) throw new Error('Mangyul altar count changed');
    const flagTarget = getApproach(marker, previous, colliders, margin, 2);
    targets.set('flags', flagTarget);
    targets.set('clearing', flagTarget);
    passFlags = makePassFlags(props, marker.x, marker.y, marker.z);
    spirits = makeMonstersAndGoddesses(props, getHeight, altarPoints, marker);
    snow = root.children.find(child => child.isPoints);
    if (!snow) throw new Error('Mangyul snow geometry missing');
    // Keep the live particle cloud visible after the player travels away from its initial bounds.
    snow.frustumCulled = false;
  } catch (err) {
    disposeWorld();
    throw err;
  }
  interactables.length = 0;
  ctx.colliders.push(...colliders);

  let checkpoint = 0;
  let ambient = 0;
  let elapsed = 0;
  let reduced = false;
  let transitioning = false;
  let disposed = false;

  function renderState(refreshAltarFlags, dt = 0) {
    const observed = THREE.MathUtils.clamp(checkpoint - firstAltar, 0, altars.length);
    const ease = transitioning ? THREE.MathUtils.smoothstep(elapsed, 0, 0.8) : 1;
    const tied = checkpoint > flagsIndex;
    const tying = checkpoint === flagsIndex + 1;
    const answered = checkpoint > calmIndex;
    const storm = answered ? (checkpoint === calmIndex + 1 ? 1 - ease : 0) : 1;
    if (refreshAltarFlags) {
      const justObserved = checkpoint > firstAltar && checkpoint <= firstAltar + altars.length;
      altars.forEach((flags, index) => {
        const progress = justObserved && index === observed - 1 ? ease : Number(index < observed);
        setAltarFlags(flags, progress, checkpoint === firstAltar + index);
      });
    }
    passFlags.set(tied, tied && tying ? ease : 1, ambient, storm);
    spirits.set(checkpoint, dt, ambient);
    snow.material.opacity = (reduced ? 0.42 : 0.92) * storm;
    snow.material.size = 0.35;
    snow.visible = storm > 0.01;
  }

  function restore(checkpointId, { animate = false, reducedMotion = false } = {}) {
    const next = checkpoints.indexOf(checkpointId);
    if (disposed || next < 0) return;
    transitioning = animate && !reducedMotion && next === checkpoint + 1;
    reduced = reducedMotion;
    checkpoint = next;
    elapsed = 0;
    if (!transitioning) {
      ambient = 0;
      const point = targets.get(checkpointId) ?? targets.get(checkpointId === 'answer' ? 'altar12' : 'altar1');
      const random = seededRandom(211);
      const positions = snow.geometry.getAttribute('position');
      const ground = getHeight(point.x, point.z);
      for (let i = 0; i < positions.count; i++) {
        positions.setXYZ(i, point.x - root.position.x + (random() - 0.5) * 54,
          ground - 1 + random() * 17, point.z + (random() - 0.5) * 54);
      }
      positions.needsUpdate = true;
    }
    renderState(true);
  }

  function update(dt) {
    if (disposed || reduced || !Number.isFinite(dt) || dt <= 0) return;
    elapsed += dt;
    ambient = (ambient + dt) % 1000;
    const position = ctx.state?.player?.position;
    if (position) state.player.position.copy(position);
    map.update(dt, ambient);
    renderState(transitioning, dt);
    if (elapsed >= 0.8) transitioning = false;
  }

  restore(MANGYUL_CHAPTER.entryCheckpoint);
  return {
    group, getHeight, restore, update,
    getTarget(checkpointId) {
      const point = targets.get(checkpointId);
      return point ? { ...point, lookAt: { ...point.lookAt } } : null;
    },
    getSnapshot() {
      return {
        checkpointId: checkpoints[checkpoint],
        altarsObserved: THREE.MathUtils.clamp(checkpoint - firstAltar, 0, altars.length),
        flagsTied: checkpoint > flagsIndex,
        storm: snow.visible,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const collider of colliders) {
        const index = ctx.colliders.indexOf(collider);
        if (index >= 0) ctx.colliders.splice(index, 1);
      }
      disposeWorld();
    },
  };
}
