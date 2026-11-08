import * as THREE from 'three';
import { createMap } from '../../world/maps/pharping.js';
import { seededRandom } from '../../world/mapBase.js';
import { createWellShadow } from './wellShadow.js';
import {
  buildDroughtSpriteModel,
  buildDustDevilModel,
  buildThirstyPretaModel,
} from '../../gameplay/enemyModels/pharping.js';
import { buildDroughtLordModel } from '../../gameplay/bosses/droughtLord.js';

const visualCheckpoints = ['spring1', 'spring2', 'channel1', 'channel2', 'manuscript',
  'cave', 'shadow', 'release', 'rain', 'diary', 'complete'];
const approaches = {
  spring1: [2041.8, 32.85, 2040.6, 30.1, 0.45],
  spring2: [2038, 32.5, 2039.5, 29.4, 0.5],
  channel1: [2038.6, 25.6, 2036.6, 25.8, 0.28],
  channel2: [2035.8, 22, 2034.4, 22.8, 0.28],
  manuscript: [2029.5, -25.6, 2028, -28, 0.56],
  cave: [2020, -41.3, 2020, -44.5, 0.92],
  shadow: [1970, 56.5, 1970, 52.6, 1.52],
  release: [1970, 56.5, 1970, 52.6, 1.52],
  settle: [2038, 32.5, 2039.5, 29.4, 0.5],
  wait: [2035.8, 22, 2034.4, 22.8, 0.28],
  lamp: [2020, -41.3, 2020, -45.9, 1.0],
  rain: [1970, 56.5, 1970, 52.6, 0.78],
};

function disposeGroup(group) {
  const geometries = new Set();
  const materials = new Set();
  group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      for (const material of [object.material].flat()) materials.add(material);
    }
    if (object.isInstancedMesh) object.dispose();
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  group.removeFromParent();
  group.clear();
}

function makeBase() {
  const scene = new THREE.Group();
  const colliders = [];
  const interactables = [];
  const listeners = new Map();
  const child = {
    scene, colliders, interactables,
    bus: { on: (name, fn) => listeners.set(name, fn), emit: () => {} },
    state: { zone: 'pharping', player: { position: new THREE.Vector3() } },
  };
  const map = createMap(child);
  // Only the rain transformation is used. No original adventure callbacks survive.
  const startRain = listeners.get('pharping:rain');
  listeners.clear();
  interactables.length = 0;
  map.group.getObjectByName('AsuraCaveArena').visible = false;
  // Bring the existing butter lamps forward from behind the back wall.
  for (const [i, lamp] of map.lampNiches.entries()) {
    const angle = Math.PI * (0.11 + i * 0.13);
    const x = 2020 + Math.cos(angle) * 2.15;
    const z = -45.9 - Math.sin(angle) * 0.33;
    lamp.flameGrp.parent.position.set(x, map.getHeight(x, z), z);
    lamp.flameGrp.visible = true;
  }
  return { map, colliders, startRain, state: child.state };
}

function makeDebris(group, getHeight) {
  const shapes = new THREE.DodecahedronGeometry(1, 0);
  const ochre = new THREE.MeshStandardMaterial({ color: 0x92735c, roughness: 0.94 });
  const slate = new THREE.MeshStandardMaterial({ color: 0x706052, roughness: 0.91 });
  const stickGeo = new THREE.CylinderGeometry(0.095, 0.125, 1.4, 7);
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x4d3020, roughness: 1 });
  const specs = [
    { from: [2040.6, 30.1], to: [2042.15, 29.55], size: [0.92, 0.65, 0.76] },
    { from: [2039.5, 29.4], to: [2039.55, 27.25], size: [0.77, 0.57, 0.71] },
    { from: [2036.6, 25.8], to: [2035.1, 26.25], size: [0.72, 0.45, 0.62] },
    { from: [2034.4, 22.8], to: [2032.7, 23.4], size: [0.66, 0.41, 0.67] },
  ];
  return specs.map(({ from, to, size }, i) => {
    const object = new THREE.Group();
    object.name = ['SpringStoneA', 'SpringStoneB', 'ChannelDebrisA', 'ChannelDebrisB'][i];
    const stone = new THREE.Mesh(shapes, i % 2 ? slate : ochre);
    stone.scale.set(...size);
    stone.position.y = size[1] * 0.61;
    stone.rotation.set(i * 0.45, 0.24 * i, i * -0.17);
    stone.castShadow = true;
    object.add(stone);
    if (i >= 2) {
      const branch = new THREE.Mesh(stickGeo, stickMat);
      branch.position.set(0.23, 0.37, 0.07);
      branch.rotation.set(0.58, 0.2, 1.18);
      object.add(branch);
    }
    group.add(object);
    const collider = { type: 'circle', x: from[0], z: from[1], r: size[0] * 0.83, zone: 'pharping' };
    return {
      collider,
      set(progress) {
        const x = THREE.MathUtils.lerp(from[0], to[0], progress);
        const z = THREE.MathUtils.lerp(from[1], to[1], progress);
        object.position.set(x, getHeight(x, z) + Math.sin(progress * Math.PI) * 0.22, z);
        object.rotation.set(progress * 0.37, progress * (i % 2 ? -0.85 : 0.85), progress * -0.53);
        collider.x = x;
        collider.z = z;
      },
    };
  });
}

function makeChannel(group, getHeight) {
  const route = new THREE.CatmullRomCurve3([
    [2040.05, 29.65], [2038.1, 28], [2036.6, 25.8], [2034.4, 22.8],
    [2033.2, 20.55], [2031.6, 18.25],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const sample = (t, across = 0, rise = 0.13) => {
    const point = route.getPoint(t);
    const tangent = route.getTangent(t);
    point.x -= tangent.z * across;
    point.z += tangent.x * across;
    point.y = getHeight(point.x, point.z) + rise;
    return point;
  };
  function ribbon(name, material, start, end, width, rise) {
    const positions = [];
    const indices = [];
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
      const t = THREE.MathUtils.lerp(start, end, i / segments);
      const taper = name === 'DryChannelBed' || name === 'RestoredSpringFlow'
        ? 1 : 0.34 + Math.sin((i / segments) * Math.PI) * 0.66;
      const edge = width * taper * (0.91 + Math.sin(t * 27) * 0.09);
      for (const side of [-1, 0, 1]) positions.push(...sample(t, side * edge, rise).toArray());
      const vertex = i * 3;
      if (i < segments) {
        indices.push(vertex, vertex + 3, vertex + 1, vertex + 1, vertex + 3, vertex + 4,
          vertex + 1, vertex + 4, vertex + 2, vertex + 2, vertex + 4, vertex + 5);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    const colors = [];
    for (let i = 0; i <= segments; i++) {
      const mottling = 0.93 + Math.sin(i * 0.87) * 0.035 + Math.cos(i * 1.69) * 0.025;
      for (const side of [-1, 0, 1]) {
        const shade = mottling * (side === 0 ? 1.16 : 0.58);
        colors.push(shade, shade, shade);
      }
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    material.vertexColors = true;
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    group.add(mesh);
    return mesh;
  }
  ribbon('DryChannelBed', new THREE.MeshStandardMaterial({
    color: 0x5c3926, roughness: 1, side: THREE.DoubleSide,
  }), 0.13, 1, 0.69, 0.105);
  const edgeGeometry = new THREE.DodecahedronGeometry(1);
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xa08467, roughness: 0.93 });
  const rim = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, 48);
  const rng = seededRandom(93);
  const marker = new THREE.Object3D();
  for (let i = 0; i < rim.count; i++) {
    const t = 0.14 + Math.floor(i / 2) / 28;
    marker.position.copy(sample(t, (i % 2 ? 1 : -1) * (0.62 + rng() * 0.14), 0.11));
    marker.scale.set(0.18 + rng() * 0.18, 0.12 + rng() * 0.1, 0.19 + rng() * 0.16);
    marker.rotation.set(0.2, rng() * Math.PI, 0.1);
    marker.updateMatrix();
    rim.setMatrixAt(i, marker.matrix);
  }
  group.add(rim);

  const pool = ribbon('UncoveredSeep', new THREE.MeshStandardMaterial({
    color: 0x49847e, roughness: 0.39, emissive: 0x153c3d, emissiveIntensity: 0.43,
    side: THREE.DoubleSide,
  }), 0.29, 0.51, 0.25, 0.13);
  const trickle = ribbon('UncoveredChannel', pool.material, 0.45, 0.96, 0.31, 0.13);
  const flow = ribbon('RestoredSpringFlow', new THREE.MeshStandardMaterial({
    color: 0x51c3c9, roughness: 0.27, emissive: 0x246368, emissiveIntensity: 0.58,
    side: THREE.DoubleSide,
  }), 0.04, 1, 0.55, 0.15);
  const rippleCount = 33;
  const ripplePosition = new THREE.BufferAttribute(new Float32Array(rippleCount * 6), 3);
  ripplePosition.setUsage(THREE.DynamicDrawUsage);
  const rippleGeometry = new THREE.BufferGeometry();
  rippleGeometry.setAttribute('position', ripplePosition);
  const ripples = new THREE.LineSegments(rippleGeometry, new THREE.LineBasicMaterial({
    color: 0xb4e6db, opacity: 0.76, transparent: true,
  }));
  ripples.name = 'ChannelSurfaceRipples';
  ripples.frustumCulled = false;
  group.add(ripples);

  return {
    set(cleared, raining, time) {
      pool.visible = cleared >= 1 && !raining;
      trickle.visible = cleared >= 2 && !raining;
      flow.visible = raining;
      ripples.visible = pool.visible || flow.visible;
      if (!ripples.visible) return;
      const start = raining ? 0.06 : 0.31;
      const end = raining ? 1 : cleared >= 2 ? 0.94 : 0.51;
      const count = raining ? rippleCount : cleared >= 2 ? 17 : 6;
      rippleGeometry.setDrawRange(0, count * 2);
      for (let i = 0; i < count; i++) {
        const phase = (i * 0.619 + time * (raining ? 0.25 : 0.095)) % 1;
        const t = THREE.MathUtils.lerp(start, end, phase);
        const offset = Math.sin(i * 81) * (raining ? 0.38 : 0.17);
        const a = sample(t, offset, raining ? 0.172 : 0.151);
        const b = sample(Math.min(end, t + 0.015 + (i % 3) * 0.008), offset + 0.024, raining ? 0.172 : 0.151);
        ripplePosition.setXYZ(i * 2, a.x, a.y, a.z);
        ripplePosition.setXYZ(i * 2 + 1, b.x, b.y, b.z);
      }
      ripplePosition.needsUpdate = true;
    },
  };
}

function makeManuscript(group, getHeight) {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x88715b, roughness: 0.92 });
  for (const [x, z, sx, sz, height] of [[2028, -28, 0.68, 0.48, 0.39], [2020, -44.5, 0.91, 0.63, 0.73]]) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(1), stoneMat);
    stone.position.set(x, getHeight(x, z) + height * 0.43, z);
    stone.scale.set(sx, height * 0.6, sz);
    stone.castShadow = true;
    group.add(stone);
  }
  const manuscript = new THREE.Group();
  manuscript.name = 'WrappedManuscript';
  const paper = new THREE.MeshStandardMaterial({ color: 0xe1c38d, roughness: 0.85 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0xaa4d31, roughness: 0.82 });
  const thread = new THREE.MeshStandardMaterial({ color: 0xe8b765, roughness: 0.75 });
  const parts = [
    [0.92, 0.16, 0.44, 0, 0.12, paper],
    [0.99, 0.05, 0.49, 0, 0.022, fabric],
    [0.99, 0.055, 0.49, 0, 0.205, fabric],
    [0.083, 0.24, 0.502, -0.23, 0.12, thread],
    [0.083, 0.24, 0.502, 0.23, 0.12, thread],
  ];
  for (const [w, h, d, x, y, material] of parts) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    part.position.set(x, y, 0);
    part.castShadow = true;
    manuscript.add(part);
  }
  group.add(manuscript);

  return {
    set(state, amount) {
      manuscript.visible = state !== 'carried' || amount < 1;
      const placed = state === 'returned';
      const x = placed ? 2020 : 2028;
      const z = placed ? -44.5 : -28;
      const lift = state === 'carried' ? amount * 1.25 : placed ? (1 - amount) * 0.62 : 0;
      manuscript.position.set(x, getHeight(x, z) + (placed ? 0.73 : 0.38) + lift, z);
      manuscript.rotation.set((state === 'carried' ? amount : 0) * 0.34, placed ? 0.08 : -0.25, 0);
      manuscript.scale.setScalar(state === 'carried' ? 1 - amount * 0.8 : 1);
    },
  };
}

function makeValleyDetails(group, getHeight) {
  const rng = seededRandom(213);
  const dust = [];
  const grass = [];
  const areas = [[2039, 27, 12], [1970, 55, 15], [2025, -35, 12]];
  for (const [cx, cz, span] of areas) {
    for (let i = 0; i < 120; i++) {
      const x = cx + (rng() - 0.5) * span * 2;
      const z = cz + (rng() - 0.5) * span * 2;
      if (Math.hypot(x - 1970, z - 53) < 1.7 ||
          Math.hypot(x - 2040, z - 30) < 2.5 ||
          Math.abs(z - (x - 2032) * 1.35 - 19) < 1.65 && cx === 2039) continue;

      const angle = rng() * Math.PI * 2;
      const run = 0.3 + rng() * 0.65;
      const start = [x, getHeight(x, z) + 0.024, z];
      const mx = x + Math.cos(angle) * run;
      const mz = z + Math.sin(angle) * run;
      const fork = [mx, getHeight(mx, mz) + 0.024, mz];
      dust.push(...start, ...fork);
      for (const turn of [-1, 1]) {
        const ex = mx + Math.cos(angle + turn * 0.86) * run * 0.65;
        const ez = mz + Math.sin(angle + turn * 0.86) * run * 0.65;
        dust.push(...fork, ex, getHeight(ex, ez) + 0.024, ez);
      }
      if (rng() > 0.42) continue;
      for (const turn of [-1, 0, 1]) {
        const dx = Math.cos(angle + turn * 0.88);
        const dz = Math.sin(angle + turn * 0.88);
        const rise = 0.12 + rng() * 0.26;
        const y = start[1];
        grass.push(x - 0.047, y, z, x + 0.047, y, z, x + dx * rise, y + rise, z + dz * rise);
      }
    }
  }
  function geometry(data) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(data, 3));
    return geo;
  }
  const cracks = new THREE.LineSegments(geometry(dust), new THREE.LineBasicMaterial({
    color: 0x462818, transparent: true, opacity: 0.53,
  }));
  const shoots = new THREE.Mesh(geometry(grass), new THREE.MeshBasicMaterial({
    color: 0x548e48, side: THREE.DoubleSide,
  }));
  cracks.name = 'DroughtCracks';
  shoots.name = 'RainFedShoots';
  group.add(cracks, shoots);

  const wellGroup = new THREE.Group();
  wellGroup.position.set(1970, getHeight(1970, 53), 53);
  const coping = new THREE.InstancedMesh(new THREE.BoxGeometry(0.44, 0.22, 0.29),
    new THREE.MeshStandardMaterial({ color: 0x8c7861, roughness: 0.96 }), 20);
  const stone = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < coping.count; i++) {
    const a = i / coping.count * Math.PI * 2;
    stone.position.set(Math.sin(a) * 1.34, 0.82 + rng() * 0.045, Math.cos(a) * 1.34);
    stone.rotation.y = a;
    stone.updateMatrix();
    coping.setMatrixAt(i, stone.matrix);
    coping.setColorAt(i, color.setScalar(0.65 + rng() * 0.35));
  }
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.26, 24), new THREE.MeshStandardMaterial({
    color: 0x468f8a, emissive: 0x255a56, emissiveIntensity: 0.6, roughness: 0.34,
  }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.73;
  const ripples = [0.31, 0.65, 1.01].map((radius) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.013, 32),
      new THREE.MeshBasicMaterial({ color: 0xb3dcd7, transparent: true, opacity: 0.44 }));
    ring.position.y = water.position.y + 0.003;
    ring.rotation.x = water.rotation.x;
    return ring;
  });
  wellGroup.add(coping, water, ...ripples);
  group.add(wellGroup);
  return {
    set(wet, time) {
      cracks.visible = !wet;
      shoots.visible = wet;
      water.visible = wet;
      for (const [i, ring] of ripples.entries()) {
        ring.visible = wet;
        ring.scale.setScalar(0.9 + Math.sin(time * 3 + i) * 0.08);
        ring.material.opacity = 0.4 + Math.sin(time * 3 + i * 2) * 0.16;
      }
    },
  };
}

function makeRain(group) {
  const drops = 420;
  const positions = new THREE.BufferAttribute(new Float32Array(drops * 6), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', positions);
  const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: 0xa9d4e5, opacity: 0.5, transparent: true, depthWrite: false,
  }));
  rain.name = 'ValleyRainStreaks';
  rain.frustumCulled = false;
  group.add(rain);
  const rng = seededRandom(939);
  const offsets = Array.from({ length: drops }, () => [
    (rng() - 0.5) * 29, rng() * 14, (rng() - 0.5) * 29, 7 + rng() * 5, 0.24 + rng() * 0.41,
  ]);
  return {
    set(visible, time, center) {
      rain.visible = visible;
      if (!visible) return;
      for (let i = 0; i < drops; i++) {
        const [dx, phase, dz, speed, length] = offsets[i];
        const y = ((phase - time * speed) % 14 + 14) % 14;
        positions.setXYZ(i * 2, center.x + dx + y * 0.12, y, center.z + dz);
        positions.setXYZ(i * 2 + 1, center.x + dx + (y + length) * 0.12, y + length, center.z + dz);
      }
      positions.needsUpdate = true;
    },
  };
}

function makeMonsters(group, getHeight) {
  const monsters = new THREE.Group();
  monsters.name = 'StoryPharpingMonsters';
  group.add(monsters);

  const droughtSprite = buildDroughtSpriteModel(THREE);
  droughtSprite.root.name = 'StoryDroughtSprite';
  const sx = 2040.2;
  const sz = 30.6;
  droughtSprite.root.position.set(sx, getHeight(sx, sz), sz);
  droughtSprite.root.rotation.y = 0.35;
  monsters.add(droughtSprite.root);

  const dustDevil = buildDustDevilModel(THREE);
  dustDevil.root.name = 'StoryDustDevil';
  const cx = 2035.4;
  const cz = 24.5;
  dustDevil.root.position.set(cx, getHeight(cx, cz), cz);
  monsters.add(dustDevil.root);

  const thirstyPreta = buildThirstyPretaModel(THREE);
  thirstyPreta.root.name = 'StoryThirstyPreta';
  const px = 1972.1;
  const pz = 53.6;
  thirstyPreta.root.position.set(px, getHeight(px, pz), pz);
  thirstyPreta.root.rotation.y = -1.25;
  monsters.add(thirstyPreta.root);

  const droughtLord = buildDroughtLordModel(THREE);
  droughtLord.group.name = 'StoryDroughtLord';
  const wellY = getHeight(1970, 53);
  droughtLord.group.position.set(1970, wellY - 1.15, 53);
  droughtLord.group.rotation.y = Math.PI;
  droughtLord.group.scale.setScalar(0.45);
  monsters.add(droughtLord.group);

  // Cave practitioner silhouette breathing gently near the Yangleshö cave shrine
  const practitioner = new THREE.Group();
  practitioner.name = 'StoryPharpingPractitioner';
  const prX = 2021.8;
  const prZ = -44.2;
  practitioner.position.set(prX, getHeight(prX, prZ), prZ);
  practitioner.rotation.y = -0.55;
  const robeMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.85,
    emissive: 0x2a1208,
    emissiveIntensity: 0.25,
  });
  const saffronMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.78,
    emissive: 0x451a03,
    emissiveIntensity: 0.2,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc6946e, roughness: 0.8 });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.88, 10), robeMat);
  robe.position.y = 0.44;
  const shawl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.44, 10), saffronMat);
  shawl.position.y = 0.72;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skinMat);
  head.position.y = 1.08;
  practitioner.add(robe, shawl, head);
  monsters.add(practitioner);

  const spriteDummy = {
    model: droughtSprite,
    state: 'idle',
    stateTimer: 0,
    currentAttack: { windup: 0.7 },
  };
  const devilDummy = { state: 'attack' };

  return {
    set(checkpoint, raining, dt, time) {
      const stepDt = dt > 0 ? dt : 0.016;

      // 1. Spring Drought Sprite: chokes spring until spring2 is cleared (checkpoint >= 2)
      const springCleared = checkpoint >= 2;
      spriteDummy.state = springCleared ? 'idle' : 'windup';
      spriteDummy.stateTimer = springCleared ? 0 : 0.35 + Math.sin(time * 3) * 0.15;
      droughtSprite.animate(spriteDummy, stepDt, time);
      if (springCleared) {
        droughtSprite.root.scale.setScalar(raining ? 0.42 : 0.58);
        droughtSprite.bodyRoot.rotation.x = 0.45;
        droughtSprite.materials[0].emissive.setHex(raining ? 0x246368 : 0x3b2810);
      } else {
        droughtSprite.root.scale.setScalar(checkpoint === 1 ? 0.82 : 1.0);
        droughtSprite.bodyRoot.rotation.x = 0;
        droughtSprite.materials[0].emissive.setHex(0x5a1804);
      }

      // 2. Channel Dust Devil: swirls aggressively until channel2 is cleared (checkpoint >= 4)
      const channelCleared = checkpoint >= 4;
      devilDummy.state = channelCleared ? 'idle' : 'attack';
      dustDevil.animate(devilDummy, stepDt, time);
      dustDevil.root.scale.setScalar(
        channelCleared ? (raining ? 0.28 : 0.4) : (checkpoint === 3 ? 0.76 : 1.0),
      );
      dustDevil.materials[0].opacity = channelCleared ? 0.35 : 0.88;
      dustDevil.materials[0].emissive.setHex(channelCleared ? 0x246368 : 0x3b2810);

      // 3. Dry Well Thirsty Preta: reaches hungrily toward well until pacified at release/rain (checkpoint >= 7)
      const pacified = checkpoint >= 7;
      thirstyPreta.bodyRoot.position.y = pacified
        ? -0.18 + Math.sin(time * 2.0) * 0.02
        : Math.sin(time * 3.4) * 0.05;
      thirstyPreta.bodyRoot.rotation.x = pacified
        ? 0.38
        : 0.12 + Math.sin(time * 4.2) * 0.06;
      thirstyPreta.leftArm.rotation.x = pacified
        ? -0.65
        : -0.95 + Math.sin(time * 4.5) * 0.22;
      thirstyPreta.rightArm.rotation.x = pacified
        ? -0.65
        : -0.95 - Math.sin(time * 4.5) * 0.22;
      thirstyPreta.materials[0].emissive.setHex(pacified ? 0x246368 : 0x2a1d08);

      // 4. Drought Lord rising from the dry well at 'shadow' (6) and subdued at 'release' (7) / 'rain' (8+)
      if (checkpoint === 6) {
        droughtLord.group.scale.setScalar(0.78);
        droughtLord.group.position.set(1970, wellY - 0.1 + Math.sin(time * 2.8) * 0.08, 53);
        droughtLord.anim(stepDt, { animState: 'enrage', enraged: true, subdued: false });
      } else if (checkpoint === 7) {
        droughtLord.group.scale.setScalar(0.62);
        droughtLord.group.position.set(1970, wellY - 0.35 + Math.sin(time * 1.8) * 0.03, 53);
        droughtLord.anim(stepDt, { animState: 'kneel', enraged: false, subdued: true });
      } else if (checkpoint >= 8) {
        droughtLord.group.scale.setScalar(0.42);
        droughtLord.group.position.set(1970, wellY - 0.85 + Math.sin(time * 1.5) * 0.02, 53);
        droughtLord.anim(stepDt, { animState: 'kneel', enraged: false, subdued: true });
      } else {
        droughtLord.group.scale.setScalar(0.45);
        droughtLord.group.position.set(1970, wellY - 1.15 + Math.sin(time * 2.2) * 0.04, 53);
        droughtLord.anim(stepDt, { animState: 'idle', enraged: false, subdued: false });
      }

      // 5. Cave practitioner subtle breathing & swaying
      practitioner.scale.y = 1 + Math.sin(time * 2.4) * 0.025;
      practitioner.rotation.z = Math.sin(time * 1.6) * 0.03;
    },
  };
}

export async function createPharpingScene(ctx) {
  const group = new THREE.Group();
  group.name = 'StoryPharping';
  let base = makeBase();
  group.add(base.map.group);
  const getHeight = base.map.getHeight;
  const debris = makeDebris(group, getHeight);
  const channel = makeChannel(group, getHeight);
  const manuscript = makeManuscript(group, getHeight);
  const shadow = createWellShadow(group, getHeight(1970, 53));
  const rain = makeRain(group);
  const valley = makeValleyDetails(group, getHeight);
  const monsters = makeMonsters(group, getHeight);
  const caveTable = { type: 'circle', x: 2020, z: -44.5, r: 0.84, zone: 'pharping' };
  const trailRock = { type: 'circle', x: 2028, z: -28, r: 0.58, zone: 'pharping' };
  const colliders = [...base.colliders, caveTable, trailRock, ...debris.map((item) => item.collider)];
  ctx.colliders.push(...colliders);

  const well = { x: 1970, z: 53 };
  let checkpoint = -1;
  let currentId = 'spring1';
  const visualStages = { backup: 0, settle: 2, wait: 4, lamp: 9, phone: 9, diary: 9, complete: 10 };
  let elapsed = 0;
  let ambient = 0;
  let transition = false;
  let reduced = false;
  let disposed = false;

  function setBase(animateRain) {
    const wantRain = checkpoint >= 8 && (!animateRain || elapsed >= 1.1);
    if (!wantRain && base.map.isRaining()) {
      disposeGroup(base.map.group);
      // The Adventure factory's rain state is one-way. Rebuild only the base;
      // deterministic base colliders already belong to the story instance.
      base = makeBase();
      group.add(base.map.group);
    }
    if (wantRain && !base.map.isRaining()) {
      base.state.player.position.set(well.x, getHeight(well.x, well.z), well.z);
      base.startRain();
      base.map.group.getObjectByName('PharpingRainParticles').visible = false;
      base.map.update(animateRain ? 0.05 : 2.5);
    }
    return wantRain;
  }

  function renderState(dt = 0) {
    const raining = setBase(transition && checkpoint === 8);
    if (raining && !reduced && dt > 0) base.map.update(dt);
    const easing = (duration) => transition ? THREE.MathUtils.smoothstep(elapsed, 0, duration) : 1;
    debris.forEach((item, i) => {
      item.set(checkpoint === i + 1 ? easing(0.76) : Number(checkpoint > i));
    });
    const cleared = Math.max(0, Math.min(2, checkpoint - 2 - Number(transition && elapsed < 0.27)));
    channel.set(cleared, raining, ambient);
    const seep = group.getObjectByName('UncoveredSeep');
    if (['settle', 'wait'].includes(currentId)) seep.visible = true;
    seep.material.color.setHex(['spring2', 'settle', 'wait'].includes(currentId) ? 0x8b7250 : 0x49847e);
    const manuscriptState = checkpoint >= 6 ? 'returned' : checkpoint >= 5 ? 'carried' : 'trail';
    manuscript.set(manuscriptState, checkpoint === 5 || checkpoint === 6 ? easing(0.48) : 1);
    shadow.set(checkpoint >= 6, checkpoint >= 8 ? easing(1.58) : 0, ambient);
    const lit = ['phone', 'diary', 'complete'].includes(currentId);
    base.map.lampNiches.forEach((lamp, index) => { lamp.flameGrp.visible = index > 0 || lit; });
    valley.set(raining, ambient);
    rain.set(raining, ambient, ctx.state?.player?.position || well);
    monsters.set(checkpoint, raining, dt, ambient);
  }

  function restore(checkpointId, { animate = false, reducedMotion = false } = {}) {
    const next = Object.hasOwn(visualStages, checkpointId) ? visualStages[checkpointId] : visualCheckpoints.indexOf(checkpointId);
    if (disposed || next < 0) return;
    transition = animate && !reducedMotion && next === checkpoint + 1 && checkpoint >= 0;
    reduced = reducedMotion;
    checkpoint = next;
    currentId = checkpointId;
    elapsed = 0;
    if (!transition) ambient = 0;
    renderState();
  }

  function update(dt) {
    if (disposed || reduced || !Number.isFinite(dt) || dt <= 0) return;
    elapsed += dt;
    ambient = (ambient + dt) % 1000;
    renderState(dt);
  }

  restore('spring1');
  return {
    group, getHeight, restore, update,
    getTarget(checkpointId) {
      const target = Object.hasOwn(approaches, checkpointId) ? approaches[checkpointId] : null;
      if (!target) return null;
      const [x, z, lookX, lookZ, rise] = target;
      return { x, z, lookAt: { x: lookX, y: getHeight(lookX, lookZ) + rise, z: lookZ } };
    },
    getSnapshot() {
      return {
        checkpointId: currentId, lampLit: ['phone', 'diary', 'complete'].includes(currentId),
        waterSettled: checkpoint >= 4 && currentId !== 'wait', raining: base.map.isRaining(),
        springStonesCleared: Math.max(0, Math.min(2, checkpoint)),
        channelDebrisCleared: Math.max(0, Math.min(2, checkpoint - 2)),
        manuscript: checkpoint >= 6 ? 'returned' : checkpoint >= 5 ? 'carried' : 'trail',
        shadow: checkpoint >= 8 ? 'released' : checkpoint >= 6 ? 'clutching' : 'absent',
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
