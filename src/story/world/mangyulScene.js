import * as THREE from 'three';
import { createBus } from '../../core/events.js';
import { MANGYUL_CHAPTER } from '../../data/story/chapters/mangyul.js';
import { seededRandom } from '../../world/mapBase.js';
import { createMangyulMap } from '../../world/maps/mangyul.js';

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

function disposeMeshes(group, { disposeMaterials = true } = {}) {
  const geometries = new Set();
  const materials = new Set();
  group.traverse(mesh => {
    if (mesh.isInstancedMesh) mesh.dispose();
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) materials.add(mesh.material);
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
  try {
    const altarEntries = interactables.filter(entry => entry.kind === 'tenmaAltar');
    const passPosition = interactables.find(entry => entry.kind === 'passPrayerFlags').getPosition();
    const marker = new THREE.Vector3(passPosition.x, passPosition.y, passPosition.z + 1);
    colliders.push(...[-1.78, 1.78].map(dx =>
      ({ type: 'circle', zone: 'mangyul', x: marker.x + dx, z: marker.z, r: 0.13 })));
    const margin = (ctx.config?.PLAYER?.radius ?? 0.35) + 0.18;
    let previous = { x: root.position.x, z: 43 };
    altars = altarEntries.map((entry, index) => {
      const point = entry.getPosition();
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

  function renderState(refreshAltarFlags) {
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
    renderState(transitioning);
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
