import * as THREE from 'three';
import { CHIMPHU_CHAPTER } from '../../data/story/chapters/chimphu.js';
import { buildChimphuMap } from '../../world/maps/chimphu.js';
import { seededRandom } from '../../world/mapBase.js';
import { buildTermaGuardianModel } from '../../gameplay/bosses/termaGuardian.js';

const checkpoints = CHIMPHU_CHAPTER.checkpoints.map(({ id }) => id);
const approaches = {
  road: [6004, 21, 6003, 19.2, 1.08],
  custody: [5986, -1.4, 5985.6, -3.6, 1.08],
  bundle: [5986, -1.4, 5985.9, -3.6, 0.98],
  cave: [5985, -30.3, 5985, -35.1, 1.48],
  light: [5985, -33.5, 5985, -35.1, 1.48],
};

function mesh(parent, geometry, material, position, scale) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  item.scale.set(...scale);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

function place(parent, getHeight, x, z) {
  const station = new THREE.Group();
  station.position.set(x, getHeight(x, z), z);
  parent.add(station);
  return station;
}

function createRoadside(group, getHeight, box) {
  const post = place(group, getHeight, 6003, 19.2);
  post.name = 'ChimphuRoadMarker';
  const wood = new THREE.MeshStandardMaterial({ color: 0x604938, roughness: 0.9 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x656e67, roughness: 0.94 });
  mesh(post, box, stone, [0, 0.12, 0], [0.48, 0.24, 0.45]);
  mesh(post, box, wood, [0, 0.73, 0], [0.14, 1.46, 0.16]);
  mesh(post, box, wood, [-0.09, 1.18, 0], [0.74, 0.26, 0.12]).rotation.z = 0.08;
  mesh(post, box, wood, [-0.45, 1.21, 0], [0.19, 0.19, 0.12]).rotation.z = Math.PI / 4;
}

function createCustody(group, getHeight, box) {
  const station = place(group, getHeight, 5985.6, -3.6);
  station.name = 'ChimphuCustodyStation';
  const wood = new THREE.MeshStandardMaterial({ color: 0x593e2d, roughness: 0.93 });
  const boards = new THREE.MeshStandardMaterial({ color: 0x926951, roughness: 0.91 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xe5d3a4, roughness: 0.98 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x86634e, roughness: 1 });
  const darkCloth = new THREE.MeshStandardMaterial({ color: 0x493c35, roughness: 1 });
  const wax = new THREE.MeshStandardMaterial({ color: 0x8f342a, roughness: 0.82 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x4e4b4d, roughness: 0.94 });

  // A narrow custody room, open toward the player's approach. Plain surfaces avoid invented script.
  mesh(station, box, paper, [0, 1.25, -1.1], [3, 2.5, 0.12]);
  for (const x of [-1.45, 1.45]) mesh(station, box, paper, [x, 1.25, -0.25], [0.12, 2.5, 1.8]);
  mesh(station, box, wood, [-0.83, 0.4, -0.73], [0.65, 0.8, 0.48]);
  const disk = mesh(station, box, stone, [0.47, 0.88, 0.2], [0.22, 0.025, 0.29]);
  disk.name = 'ChimphuDigitalDisk';
  mesh(station, box, paper, [0.47, 0.897, 0.2], [0.14, 0.008, 0.1]);
  mesh(station, box, boards, [0, 0.8, 0], [2, 0.12, 0.96]);
  for (const x of [-0.81, 0.81]) {
    for (const z of [-0.34, 0.34]) mesh(station, box, wood, [x, 0.37, z], [0.12, 0.74, 0.12]);
  }

  const chest = new THREE.Group();
  chest.position.set(-0.49, 0.87, -0.06);
  station.add(chest);
  mesh(chest, box, wood, [0, 0.13, 0], [0.76, 0.26, 0.55]);
  mesh(chest, box, boards, [0, 0.225, 0.27], [0.79, 0.13, 0.04]);
  const lid = new THREE.Group();
  lid.name = 'ChimphuRecordChestLid';
  lid.position.set(0, 0.29, -0.28);
  chest.add(lid);
  mesh(lid, box, boards, [0, 0, 0.28], [0.8, 0.085, 0.6]);

  const documents = new THREE.Group();
  documents.name = 'ChimphuCustodyRecords';
  documents.position.set(0.14, 0.87, 0.13);
  station.add(documents);
  mesh(documents, box, paper, [-0.12, 0.012, 0], [0.23, 0.022, 0.36]).rotation.y = -0.21;
  mesh(documents, box, paper, [0.07, 0.023, -0.02], [0.24, 0.018, 0.34]).rotation.y = 0.21;
  // Plain binding and seal motifs, with the legible fictional records in the UI.
  mesh(documents, box, wax, [0.13, 0.035, 0.069], [0.047, 0.011, 0.042]);

  const bundle = new THREE.Group();
  bundle.name = 'ChimphuSealedBundle';
  station.add(bundle);
  mesh(bundle, box, cloth, [0, 0.032, 0], [0.52, 0.058, 0.42]).rotation.y = 0.14;
  mesh(bundle, box, stone, [0.07, 0.083, -0.04], [0.31, 0.079, 0.24]).rotation.y = -0.1;
  mesh(bundle, box, darkCloth, [0.07, 0.127, -0.04], [0.071, 0.012, 0.24]).rotation.y = -0.1;
  mesh(bundle, box, paper, [-0.13, 0.085, 0.04], [0.18, 0.025, 0.13]).rotation.y = 0.24;
  mesh(bundle, box, wax, [-0.13, 0.103, 0.047], [0.033, 0.014, 0.029]);
  return { lid, documents, bundle };
}

function createCaveLights(group, getHeight) {
  const count = 96;
  const random = seededRandom(9702);
  const points = Array.from({ length: count }, () => ({
    x: (random() - 0.5) * 3.4,
    y: 0.5 + random() * 2.5,
    z: (random() - 0.5) * 1.3,
    drift: 0.3 + random(),
  }));
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(positions, 3);
  position.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position);
  const material = new THREE.PointsMaterial({
    color: 0xffdb9b, size: 0.04, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lights = new THREE.Points(geometry, material);
  lights.name = 'ChimphuCaveLights';
  lights.position.set(5985, getHeight(5985, -35.1), -35.1);
  lights.frustumCulled = false;
  group.add(lights);

  return {
    lights,
    render(appear, scatter, elapsed) {
      lights.visible = appear > 0 && scatter < 1;
      if (!lights.visible) return;
      material.opacity = appear * (1 - scatter) * 0.94;
      for (let index = 0; index < count; index++) {
        const { x, y, z, drift } = points[index];
        position.setXYZ(index,
          x * (0.28 + appear * 0.72 + scatter * 0.62) + Math.sin(elapsed + index) * 0.055,
          1.4 + (y - 1.4) * appear + scatter * drift + Math.sin(elapsed * drift + index) * 0.08,
          z + scatter * (0.8 + drift),
        );
      }
      position.needsUpdate = true;
    },
  };
}

function disposeOwned(group, extras) {
  const resources = new Set(extras);
  group.traverse(object => {
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry) resources.add(object.geometry);
    if (object.material) {
      for (const material of [object.material].flat()) {
        resources.add(material);
        if (material.map) resources.add(material.map);
      }
    }
  });
  for (const resource of resources) resource.dispose();
  group.removeFromParent();
  group.clear();
}

function createCaveProtectors(group, getHeight) {
  // 1. Elderly monastic custodian near the custody station table
  const custodian = new THREE.Group();
  custodian.name = 'StoryChimphuCustodian';
  const cx = 5984.5;
  const cz = -4.1;
  const cy = getHeight(cx, cz);
  custodian.position.set(cx, cy, cz);
  custodian.rotation.y = 0.45;
  const robeMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    roughness: 0.88,
    emissive: 0x2a0a0a,
    emissiveIntensity: 0.2,
  });
  const shawlMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.82,
    emissive: 0x3b1804,
    emissiveIntensity: 0.18,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6b498, roughness: 0.78 });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.18, 10), robeMat);
  robe.position.y = 0.59;
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.54, 10), shawlMat);
  torso.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), skinMat);
  head.position.y = 1.46;
  custodian.add(robe, torso, head);
  group.add(custodian);

  // 2. Terma Guardian standing guard at the cave threshold
  const guardian = buildTermaGuardianModel(THREE);
  guardian.group.name = 'StoryTermaGuardian';
  const gx = 5987.2;
  const gz = -34.2;
  guardian.group.position.set(gx, getHeight(gx, gz), gz);
  guardian.group.rotation.y = -0.35;
  guardian.group.scale.setScalar(0.78);
  group.add(guardian.group);

  // 3. Serene lotus-seated translucent golden-cyan silhouette of Yeshe Tsogyal inside the cave alcove
  const vision = new THREE.Group();
  vision.name = 'StoryYesheTsogyalVision';
  const vx = 5985;
  const vz = -35.1;
  const vy = getHeight(vx, vz) + 0.32;
  vision.position.set(vx, vy, vz);
  group.add(vision);

  const cyanGoldMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x0891b2,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.2,
    transparent: true,
    opacity: 0.82,
  });
  const goldHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });

  const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 0.22, 12), goldHaloMat);
  lotusBase.position.y = 0.11;
  const seatedRobe = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.92, 12), cyanGoldMat);
  seatedRobe.position.y = 0.58;
  const dakiniTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.48, 10), cyanGoldMat);
  dakiniTorso.position.y = 1.08;
  const dakiniHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), cyanGoldMat);
  dakiniHead.position.y = 1.46;
  const dakiniCrown = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 16), goldHaloMat);
  dakiniCrown.rotation.x = Math.PI / 2;
  dakiniCrown.position.y = 1.56;
  const mudraHands = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), goldHaloMat);
  mudraHands.position.set(0, 1.06, 0.24);
  const dakiniHalo = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.54, 28), goldHaloMat);
  dakiniHalo.position.set(0, 1.46, -0.15);

  const motesRing = new THREE.Group();
  motesRing.name = 'StoryDakiniStarlightMotes';
  motesRing.position.y = 1.15;
  const moteGeo = new THREE.OctahedronGeometry(0.065, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const mote = new THREE.Mesh(moteGeo, goldHaloMat);
    mote.position.set(Math.cos(a) * 0.78, (i % 2) * 0.18 - 0.09, Math.sin(a) * 0.78);
    motesRing.add(mote);
  }

  vision.add(lotusBase, seatedRobe, dakiniTorso, dakiniHead, dakiniCrown, mudraHands, dakiniHalo, motesRing);

  return {
    set(checkpointIdx, id, dt, time) {
      const stepDt = dt > 0 ? dt : 0.016;
      const custodyIdx = checkpoints.indexOf('custody');
      const bundleIdx = checkpoints.indexOf('bundle');
      const caveIdx = checkpoints.indexOf('cave');
      const starlight1Idx = checkpoints.indexOf('starlight1');

      // Custodian visible at custody, records, bundle
      custodian.visible = checkpointIdx >= custodyIdx && checkpointIdx <= bundleIdx;
      if (custodian.visible) {
        custodian.scale.y = 1 + Math.sin(time * 2.4) * 0.025;
        custodian.rotation.z = Math.sin(time * 1.6) * 0.02;
      }

      // Terma Guardian visible from 'cave' onwards; shifts to peaceful kneel at 'starlight1'+
      guardian.group.visible = checkpointIdx >= caveIdx;
      if (guardian.group.visible) {
        const subdued = checkpointIdx >= starlight1Idx;
        guardian.anim(stepDt, {
          animState: subdued ? 'kneel' : id === 'light' ? 'windup' : 'idle',
          enraged: id === 'light',
          subdued,
        });
      }

      // Yeshe Tsogyal Vision illuminates from 'starlight1' through 'complete'
      vision.visible = checkpointIdx >= starlight1Idx;
      if (vision.visible) {
        vision.position.y = vy + Math.sin(time * 2.2) * 0.08;
        dakiniHalo.rotation.z = time * 0.95;
        motesRing.rotation.y = time * 1.45;
      }
    },
  };
}

export async function createChimphuScene(ctx) {
  const group = new THREE.Group();
  group.name = 'StoryChimphu';
  const colliders = [];
  const map = buildChimphuMap({ scene: group, state: { elapsed: 0 }, colliders, storyPreview: true });
  const { getHeight } = map;
  // The native portal is an Adventure entrance. The vision takes place at the western alcove.
  map.group.getObjectByName('TermaRealmStoneGate').visible = false;

  const box = new THREE.BoxGeometry(1, 1, 1);
  createRoadside(group, getHeight, box);
  const { lid, documents, bundle } = createCustody(group, getHeight, box);
  const { lights, render: renderLights } = createCaveLights(group, getHeight);
  const protectors = createCaveProtectors(group, getHeight);
  const crack = mesh(group, box, new THREE.MeshBasicMaterial({
    color: 0xffd593, transparent: true, opacity: 0.75, toneMapped: false,
  }), [5985, getHeight(5985, -35.1) + 2, -35.4], [0.035, 2.1, 0.025]);
  crack.name = 'ChimphuGoldenCrack';
  colliders.push(
    { type: 'circle', x: 6003, z: 19.2, r: 0.28, zone: 'chimphu' },
    { type: 'circle', x: 5985.6, z: -3.6, r: 1.04, zone: 'chimphu' },
  );
  ctx.colliders.push(...colliders);

  let checkpoint = -1;
  let transition = false;
  let reduced = false;
  let disposed = false;
  let time = 0;
  let ambient = 0;

  function render() {
    const id = checkpoints[checkpoint];
    const progress = (duration) => transition ? THREE.MathUtils.smoothstep(time, 0, duration) : 1;
    const open = id === 'records' ? progress(0.5) : Number(checkpoint > checkpoints.indexOf('records'));
    lid.rotation.x = -1.42 * open;
    documents.visible = open > 0.14;
    documents.position.y = 0.87 + Math.sin(open * Math.PI) * 0.19;
    documents.position.x = THREE.MathUtils.lerp(-0.42, 0.14, open);
    documents.scale.setScalar(0.82 + open * 0.18);

    const offer = id === 'bundle' ? progress(0.55) : Number(checkpoint > checkpoints.indexOf('bundle'));
    const take = id === 'descent' ? progress(0.64) : Number(checkpoint > checkpoints.indexOf('descent'));
    bundle.visible = offer > 0 && take < 1;
    bundle.position.set(THREE.MathUtils.lerp(-0.32, 0.6, offer),
      0.87 + Math.sin(offer * Math.PI) * 0.22 + take * 0.73,
      -0.16 + offer * 0.31 + take * 0.51);
    bundle.scale.setScalar(1 - take * 0.65);

    const inVision = checkpoint >= checkpoints.indexOf('light') && checkpoint <= checkpoints.indexOf('starlight3');
    const appear = id === 'light' ? progress(0.85) : Number(inVision || id === 'descent');
    const scatter = id === 'descent' ? progress(1.15) : Number(checkpoint > checkpoints.indexOf('descent'));
    crack.visible = checkpoint >= checkpoints.indexOf('cave') && checkpoint <= checkpoints.indexOf('starlight3');
    renderLights(appear, scatter, ambient);
    protectors.set(checkpoint, id, 0.016, ambient);
  }

  function restore(checkpointId, { animate = false, reducedMotion = false } = {}) {
    const next = checkpoints.indexOf(checkpointId);
    if (disposed || next < 0) return;
    transition = animate && !reducedMotion && checkpoint >= 0 && next === checkpoint + 1;
    checkpoint = next;
    reduced = reducedMotion;
    time = 0;
    if (!transition) ambient = 0;
    render();
  }

  restore('road');
  return {
    group, getHeight, restore,
    getTarget(checkpointId) {
      if (!Object.hasOwn(approaches, checkpointId)) return null;
      const [x, z, focusX, focusZ, rise] = approaches[checkpointId];
      return { x, z, lookAt: { x: focusX, y: getHeight(focusX, focusZ) + rise, z: focusZ } };
    },
    update(dt) {
      if (disposed || reduced || !Number.isFinite(dt) || dt <= 0) return;
      time += dt;
      ambient += dt;
      map.update(dt, ambient);
      render();
    },
    getSnapshot() {
      return {
        checkpointId: checkpoints[checkpoint],
        recordsVisible: documents.visible,
        bundleVisible: bundle.visible,
        lightsVisible: lights.visible,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const collider of colliders) {
        const index = ctx.colliders.indexOf(collider);
        if (index >= 0) ctx.colliders.splice(index, 1);
      }
      disposeOwned(group, map.disposables);
    },
  };
}
