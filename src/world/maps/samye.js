/**
 * Chapter 4 Map Scene — Mount Hepo Ri & Samye Monastery (`src/world/maps/samye.js`) — Issue #35
 *
 * Implements:
 *   - Yarlung Tsangpo River north bank sandy plains & dunes, ferry crossing with coracle (`牛皮筏`) at `(5000, 90)`
 *   - Construction Camp at `(4970, 55)`, Riverside Stone Quarries at `(4940, 70)` & `(5050, 75)`, Ferry Timber Pile at `(5010, 88)`
 *   - Mount Hepo Ri climbable red hill & summit gauntlet arena at `(5075, -10)` (`r: 15m`)
 *   - Pehar Boss Arena north of Samye at `(5000, -65)` (`r: 18m`)
 *   - 5 Construction Stages (`0..4`) of Samye Monastery at `(5000, 0)` (`outer wall r = 43m`):
 *       Stage 0: Foundation outlines + stacked materials
 *       Stage 1: Half-height circular outer wall + ground floor of Utse Great Hall (`烏孜大殿`)
 *       Stage 2: Full circular outer wall + 2 floors of Utse Great Hall + Four Colored Stupas foundations
 *       Stage 3: 3-story Utse Great Hall (Tibetan/Chinese/Indian roofs) + Four Colored Stupas (White SE, Red SW, Black NW, Green NE) + Four Continents temples (`四大部洲殿`)
 *       Stage 4: Sun & Moon chapels (`日月殿`), Eight Sub-continents chapels (`八小洲殿`), 1008 mini-stupas atop the perimeter wall (SINGLE `THREE.InstancedMesh`, `count = 1008`), prayer flags, gleaming golden roof, and 7 Tested Men (`七覺士`)
 *   - Day-Build / Night-Destroy Defense (`__stupa.samye.startNight()`, `__stupa.samye.endNight()`, `__stupa.samye.damageWall()`)
 *   - Mount Hepo Ri 4-Wave Gauntlet (`__stupa.hepori.start()`, `__stupa.hepori.complete()`)
 *   - "Samye!" (`བསམ་ཡས`) Palm-Vision Ending Cutscene (`__stupa.samye.playEnding()`, `__stupa.samye.skipEnding()`)
 *   - Strictly ZERO PointLights (emissive materials & additive meshes only) and low draw calls (< 400).
 */
import * as THREE from 'three';
import {
  createHeightfieldTerrain,
  scatterRocks,
  addRimMountains,
  seededRandom,
  pushCollider,
} from '../mapBase.js';
import { SAMYE_MAP } from '../../data/maps/samye.js';
import '../../i18n/ch4.js';

const TWO_PI = Math.PI * 2;
const WALL_RADIUS = 43.0;
const MINI_STUPA_COUNT = 1008;

/**
 * Deterministic heightfield for Samye (`origin = (5000, 0)`):
 *   - Flat mandala courtyard around `(0, 0)` (`r <= 48`) so Samye Monastery and kora path sit cleanly
 *   - Gentle sandy bank sloping down toward the Yarlung Tsangpo River in the south (`lz > 82`)
 *   - Climbable Mount Hepo Ri (`海波日山`) rising in the east centered at `local (75, -10)` with a flat summit plateau (`r <= 15`, `y ~ 8.5m`) and a walkable western ramp
 *   - Flat Pehar Boss Arena at `local (0, -65)` (`r <= 18`)
 */
function samyeHeight(lx, lz) {
  // 1. Central Samye Monastery & Kora Ring (`r <= 50`) -> flat plateau at y = 0
  const distCenter = Math.hypot(lx, lz);
  const centerFlat = distCenter <= 46 ? 0 : Math.min(1, (distCenter - 46) / 12);

  // 2. Pehar Boss Arena at (0, -65), r = 18 -> flat at y = 0.2
  const distPehar = Math.hypot(lx - 0, lz - -65);
  const peharMask = distPehar <= 18 ? 0 : Math.min(1, (distPehar - 18) / 8);

  // 3. Mount Hepo Ri (`海波日山`) centered at local (75, -10)
  const hdx = lx - 75;
  const hdz = lz - -10;
  const distHepo = Math.hypot(hdx, hdz);
  let hepoHeight = 0;
  if (distHepo < 42) {
    if (distHepo <= 14.5) {
      // Flat summit arena plateau
      hepoHeight = 8.4;
    } else {
      const u = Math.max(0, 1 - (distHepo - 14.5) / (42 - 14.5));
      hepoHeight = 8.4 * u * u * (3 - 2 * u);
    }
  }

  // 4. Sandy dunes undulations outside flat zones
  const dune =
    (Math.sin(lx * 0.045) * Math.cos(lz * 0.042) * 0.85 +
      Math.sin((lx + lz) * 0.08) * 0.35) *
    centerFlat *
    peharMask;

  // 5. Southern riverbank slope (`lz > 85`)
  let riverSlope = 0;
  if (lz > 85) {
    riverSlope = -Math.min(1.6, (lz - 85) * 0.09);
  }

  // 6. Northern Chimphu foothills rim (`distCenter > 98` and `lz < -75`)
  let northRim = 0;
  if (lz < -82 && distPehar > 22) {
    const nr = Math.max(0, (-lz - 82) / 38);
    northRim = nr * nr * 9.5;
  }

  return hepoHeight + dune + riverSlope + northRim;
}

/**
 * Builds a merged geometry for the 1008 mini-stupas so a single `THREE.InstancedMesh`
 * renders all 1008 perimeter stupas in 1 draw call.
 */
function createMiniStupaGeometry() {
  const baseGeo = new THREE.BoxGeometry(0.42, 0.22, 0.42);
  baseGeo.translate(0, 0.11, 0);
  const domeGeo = new THREE.ConeGeometry(0.22, 0.48, 6);
  domeGeo.translate(0, 0.46, 0);
  const spireGeo = new THREE.ConeGeometry(0.08, 0.34, 5);
  spireGeo.translate(0, 0.82, 0);

  const geos = [baseGeo, domeGeo, spireGeo];
  let totalVerts = 0;
  let totalIndices = 0;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }

  const posArr = new Float32Array(totalVerts * 3);
  const normArr = new Float32Array(totalVerts * 3);
  const idxArr = new Uint16Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;
  for (const g of geos) {
    const pos = g.attributes.position.array;
    const norm = g.attributes.normal.array;
    posArr.set(pos, vOffset * 3);
    normArr.set(norm, vOffset * 3);
    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) {
        idxArr[iOffset + i] = idx[i] + vOffset;
      }
      iOffset += idx.length;
    }
    vOffset += g.attributes.position.count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  merged.setIndex(new THREE.BufferAttribute(idxArr, 1));
  return merged;
}

export function createMap(ctx, mapDef = SAMYE_MAP, { presentationOnly = false } = {}) {
  const { state, bus, i18n } = ctx;
  const origin = mapDef?.origin || { x: 5000, z: 0 };
  const ox = origin.x; // 5000
  const oz = origin.z; // 0

  const group = ctx.zoneGroups?.samye || new THREE.Group();
  group.name = 'SamyeMap';
  if (!ctx.zoneGroups?.samye && ctx.scene) {
    ctx.scene.add(group);
  }

  // Local root positioned at map origin (5000, 0, 0) so all local (lx, lz) children map to (5000 + lx, lz)
  const root = new THREE.Group();
  root.name = 'Samye_LocalRoot';
  root.position.set(ox, 0, oz);
  group.add(root);

  const getHeightWorld = (wx, wz) => samyeHeight(wx - ox, wz - oz);
  const getHeight = (lx, lz) => samyeHeight(lx, lz);
  const addCollider = (wx, wz, r) => pushCollider(ctx, 'samye', { type: 'circle', x: wx, z: wz, r });

  // Terrain mesh with warm sandy plain, red-hill Hepo Ri, and mandala courtyard vertex palette
  const sandCol = new THREE.Color(0xcab38b);
  const duneCol = new THREE.Color(0xb89c6f);
  const hepoRedCol = new THREE.Color(0x9e4733);
  const courtStoneCol = new THREE.Color(0xd6d1c4);
  const tmpCol = new THREE.Color();

  const { mesh: terrainMesh } = createHeightfieldTerrain(ctx, {
    origin,
    size: 280,
    segments: 112,
    heightFn: getHeightWorld,
    colorFn(wx, wz, y, lx, lz) {
      const dCenter = Math.hypot(lx, lz);
      const dHepo = Math.hypot(lx - 75, lz - -10);
      if (dCenter < 43.2) {
        return courtStoneCol;
      }
      if (dHepo < 40) {
        const u = Math.min(1, Math.max(0, 1 - dHepo / 40));
        return tmpCol.lerpColors(sandCol, hepoRedCol, u * 0.85);
      }
      const n = Math.sin(lx * 0.08) * Math.cos(lz * 0.08) * 0.5 + 0.5;
      return tmpCol.lerpColors(duneCol, sandCol, n);
    },
  });
  group.add(terrainMesh);

  addRimMountains(ctx, group, {
    origin,
    innerR: 132,
    outerR: 195,
    count: 22,
    heightRange: [40, 78],
  });

  scatterRocks(ctx, group, {
    mapId: 'samye',
    origin,
    count: 16,
    rng: seededRandom(3504),
    area: { minR: 54, maxR: 108 },
    avoid: [
      { x: ox, z: oz + 90, r: 16 },
      { x: ox - 30, z: oz + 55, r: 16 },
      { x: ox + 75, z: oz - 10, r: 24 },
      { x: ox, z: oz - 65, r: 22 },
      { x: ox - 60, z: oz + 70, r: 10 },
      { x: ox + 50, z: oz + 75, r: 10 },
    ],
    getHeight: getHeightWorld,
    color: 0x8c7b6b,
  });

  // ---------------------------------------------------------------- Shared Materials (Zero PointLights!)
  const stoneWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1efe9,
    roughness: 0.78,
    metalness: 0.05,
  });
  const tibetanRedMat = new THREE.MeshStandardMaterial({
    color: 0x8b1e24,
    roughness: 0.72,
    metalness: 0.08,
  });
  const chineseJadeRoofMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    emissive: 0x115e59,
    emissiveIntensity: 0.2,
    roughness: 0.42,
    metalness: 0.28,
  });
  const indianGoldRoofMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.24,
    metalness: 0.75,
  });
  const woodTimberMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.85,
  });
  const foundationLineMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const torchFlameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.35, 0.3),
    toneMapped: false,
  });
  const torchHaloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.0, 0.95, 0.2),
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  // ---------------------------------------------------------------- 1. Yarlung Tsangpo River & Ferry Crossing (0, 90)
  const riverGroup = new THREE.Group();
  riverGroup.name = 'Samye_YarlungRiver';
  root.add(riverGroup);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1e6091,
    emissive: 0x0c4a6e,
    emissiveIntensity: 0.28,
    roughness: 0.22,
    metalness: 0.55,
  });
  const riverPlane = new THREE.Mesh(new THREE.PlaneGeometry(280, 90), waterMat);
  riverPlane.rotation.x = -Math.PI / 2;
  riverPlane.position.set(0, -0.65, 134);
  riverGroup.add(riverPlane);

  // Wooden Ferry Pier & Hide Coracle (`牛皮筏`) at local (0, 90) -> world (5000, 90)
  const pierGroup = new THREE.Group();
  pierGroup.position.set(0, getHeight(0, 90), 90);
  riverGroup.add(pierGroup);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.28, 7.5), woodTimberMat);
  deck.position.set(0, 0.35, 2.2);
  deck.castShadow = true;
  pierGroup.add(deck);

  // Hide Coracle (`牛皮筏`) moored beside the pier
  const coracleMat = new THREE.MeshStandardMaterial({
    color: 0x3f2314,
    roughness: 0.82,
  });
  const coracleMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.35, 12, 8, 0, TWO_PI, Math.PI * 0.45, Math.PI * 0.55),
    coracleMat
  );
  coracleMesh.scale.set(1.15, 0.65, 1.35);
  coracleMesh.position.set(-3.4, 0.25, 3.8);
  pierGroup.add(coracleMesh);

  // ---------------------------------------------------------------- 2. Construction Camp at local (-30, 55) -> world (4970, 55)
  const campGroup = new THREE.Group();
  campGroup.name = 'Samye_ConstructionCamp';
  campGroup.position.set(-30, getHeight(-30, 55), 55);
  root.add(campGroup);

  const tentClothMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0x78350f,
    emissiveIntensity: 0.12,
    roughness: 0.75,
  });
  const royalCanopy = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.6, 8), tentClothMat);
  royalCanopy.position.set(1.5, 3.2, -3.2);
  royalCanopy.castShadow = true;
  campGroup.add(royalCanopy);

  const royalTrim = new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.65, 0.35, 8), tibetanRedMat);
  royalTrim.position.set(1.5, 1.85, -3.2);
  campGroup.add(royalTrim);

  // Stockpile of stone blocks & logs next to Master Artisan
  const stockGroup = new THREE.Group();
  stockGroup.position.set(-4.5, 0, -3.0);
  campGroup.add(stockGroup);
  for (let i = 0; i < 6; i++) {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.65), stoneWhiteMat);
    blk.position.set((i % 3) * 0.92 - 0.9, Math.floor(i / 3) * 0.56 + 0.28, 0);
    blk.castShadow = true;
    stockGroup.add(blk);
  }

  // ---------------------------------------------------------------- 3. Interactive Resource Nodes (Stone Quarries & Timber Pile)
  const resourceNodes = [
    {
      id: 'quarry_west',
      kind: 'stone',
      lx: -60,
      lz: 70,
      wx: ox - 60, // 4940
      wz: oz + 70, // 70
      promptKey: 'prompt.samyeQuarry',
    },
    {
      id: 'quarry_east',
      kind: 'stone',
      lx: 50,
      lz: 75,
      wx: ox + 50, // 5050
      wz: oz + 75, // 75
      promptKey: 'prompt.samyeQuarry',
    },
    {
      id: 'timber_ferry',
      kind: 'wood',
      lx: 10,
      lz: 88,
      wx: ox + 10, // 5010
      wz: oz + 88, // 88
      promptKey: 'prompt.samyeTimber',
    },
  ];

  const nodeBeaconMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.0, 1.6, 0.4),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const nodeBeacons = [];

  for (const node of resourceNodes) {
    const g = new THREE.Group();
    const ny = getHeight(node.lx, node.lz);
    g.position.set(node.lx, ny, node.lz);
    root.add(g);

    if (node.kind === 'stone') {
      for (let i = 0; i < 5; i++) {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.75 + (i % 2) * 0.25, 0),
          stoneWhiteMat
        );
        const a = (i / 5) * TWO_PI;
        rock.position.set(Math.cos(a) * 1.1, 0.45, Math.sin(a) * 1.1);
        rock.castShadow = true;
        g.add(rock);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const log = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 2.8, 8),
          woodTimberMat
        );
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.24 + Math.floor(i / 3) * 0.44, (i % 3) * 0.52 - 0.52);
        log.castShadow = true;
        g.add(log);
      }
    }

    const ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.15, 24), nodeBeaconMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    g.add(ring);
    nodeBeacons.push(ring);

    if (!presentationOnly && Array.isArray(ctx.interactables)) {
      const nodePos = new THREE.Vector3(node.wx, ny, node.wz);
      ctx.interactables.push({
        id: `samye:${node.id}`,
        kind: 'samyeResource',
        zone: 'samye',
        action: 'interact',
        labelKey: node.promptKey,
        radius: 3.6,
        getPosition() {
          return nodePos;
        },
        isAvailable() {
          return state.zone === 'samye' && !state.uiOpen && !endingState.playing;
        },
        onInteract() {
          // Handled in samye.update(dt) on `interact` press
        },
      });
    }
  }

  // ---------------------------------------------------------------- 4. Samye Monastery 5 Construction Stages (0..4) at local (0, 0)
  const monasteryGroup = new THREE.Group();
  monasteryGroup.name = 'Samye_Monastery_Mandala';
  monasteryGroup.position.set(0, 0, 0);
  root.add(monasteryGroup);

  // --- Stage 0: Foundation outlines & scaffolding poles
  const stage0Group = new THREE.Group();
  stage0Group.name = 'Samye_Stage0_Foundations';
  monasteryGroup.add(stage0Group);

  const outerFoundationRing = new THREE.Mesh(
    new THREE.RingGeometry(WALL_RADIUS - 0.6, WALL_RADIUS + 0.6, 64),
    foundationLineMat
  );
  outerFoundationRing.rotation.x = -Math.PI / 2;
  outerFoundationRing.position.y = 0.04;
  stage0Group.add(outerFoundationRing);

  const utseFoundationLine = new THREE.Mesh(
    new THREE.RingGeometry(11.5, 12.4, 4),
    foundationLineMat
  );
  utseFoundationLine.rotation.x = -Math.PI / 2;
  utseFoundationLine.rotation.z = Math.PI / 4;
  utseFoundationLine.position.y = 0.05;
  stage0Group.add(utseFoundationLine);

  // --- Stage 1 & 2: Circular Outer Perimeter Wall (4 cardinal segments: N, E, S, W with gate openings)
  const wallGroup = new THREE.Group();
  wallGroup.name = 'Samye_PerimeterWall';
  monasteryGroup.add(wallGroup);

  // 4 Wall Segments: 0 = North (-Z), 1 = East (+X), 2 = South (+Z), 3 = West (-X)
  const wallSegments = [
    { index: 0, id: 'N', labelKey: 'samye.hud.wallN', wx: ox, wz: oz - WALL_RADIUS, hp: 100, maxHp: 100, broken: false, mesh: null },
    { index: 1, id: 'E', labelKey: 'samye.hud.wallE', wx: ox + WALL_RADIUS, wz: oz, hp: 100, maxHp: 100, broken: false, mesh: null },
    { index: 2, id: 'S', labelKey: 'samye.hud.wallS', wx: ox, wz: oz + WALL_RADIUS, hp: 100, maxHp: 100, broken: false, mesh: null },
    { index: 3, id: 'W', labelKey: 'samye.hud.wallW', wx: ox - WALL_RADIUS, wz: oz, hp: 100, maxHp: 100, broken: false, mesh: null },
  ];

  // Center angles for N (-PI/2), E (0), S (PI/2), W (PI) in (x = cos a, z = sin a)
  const segStartAngles = [-Math.PI * 0.72, -Math.PI * 0.22, Math.PI * 0.28, Math.PI * 0.78];
  const segSpan = Math.PI * 0.44; // leaves 4 cardinal gate openings!

  for (let s = 0; s < 4; s++) {
    const arcGeo = new THREE.CylinderGeometry(
      WALL_RADIUS + 0.55,
      WALL_RADIUS + 0.65,
      3.4,
      24,
      1,
      true,
      segStartAngles[s],
      segSpan
    );
    arcGeo.translate(0, 1.7, 0);
    const arcMat = stoneWhiteMat.clone();
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.castShadow = true;
    arcMesh.receiveShadow = true;
    wallGroup.add(arcMesh);
    wallSegments[s].mesh = arcMesh;
    wallSegments[s].mat = arcMat;
  }

  // Night Emissive Torches along the 4 Wall Gates (ZERO PointLights!)
  const wallTorchesGroup = new THREE.Group();
  wallTorchesGroup.name = 'Samye_EmissiveWallTorches';
  wallTorchesGroup.visible = false;
  monasteryGroup.add(wallTorchesGroup);

  const torchPostGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.4, 6);
  const torchFlameGeo = new THREE.ConeGeometry(0.22, 0.55, 7);
  const torchHaloGeo = new THREE.SphereGeometry(0.48, 8, 8);
  const gateAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  for (const ga of gateAngles) {
    for (const offset of [-0.08, 0.08]) {
      const ang = ga + offset;
      const tx = Math.cos(ang) * (WALL_RADIUS + 0.9);
      const tz = Math.sin(ang) * (WALL_RADIUS + 0.9);
      const post = new THREE.Mesh(torchPostGeo, woodTimberMat);
      post.position.set(tx, 2.2, tz);
      const flame = new THREE.Mesh(torchFlameGeo, torchFlameMat);
      flame.position.set(tx, 3.1, tz);
      const halo = new THREE.Mesh(torchHaloGeo, torchHaloMat);
      halo.position.set(tx, 3.1, tz);
      wallTorchesGroup.add(post, flame, halo);
    }
  }

  // --- Central Utse Great Hall (`烏孜大殿` — 3 stories: Tibetan, Chinese, Indian)
  const utseFloor1Group = new THREE.Group(); // Stage 1+: Tibetan stone base
  const utseFloor2Group = new THREE.Group(); // Stage 2+: Chinese glazed-tile eave second floor
  const utseFloor3Group = new THREE.Group(); // Stage 3+: Indian golden dome/roof third floor
  monasteryGroup.add(utseFloor1Group, utseFloor2Group, utseFloor3Group);

  // Floor 1 (Tibetan style): whitewashed battered stone walls + crimson frieze
  const utseF1Body = new THREE.Mesh(new THREE.BoxGeometry(16.0, 5.2, 16.0), stoneWhiteMat);
  utseF1Body.position.y = 2.6;
  utseF1Body.castShadow = true;
  utseF1Body.receiveShadow = true;
  const utseF1Band = new THREE.Mesh(new THREE.BoxGeometry(16.3, 0.9, 16.3), tibetanRedMat);
  utseF1Band.position.y = 4.75;
  utseFloor1Group.add(utseF1Body, utseF1Band);

  // Collider for Central Utse Great Hall so player walks around it
  addCollider(ox, oz, 9.5);

  // Floor 2 (Chinese style): crimson colonnade + sweeping jade-green overhanging eaves
  const utseF2Body = new THREE.Mesh(new THREE.BoxGeometry(12.2, 4.0, 12.2), tibetanRedMat);
  utseF2Body.position.y = 7.2;
  utseF2Body.castShadow = true;
  const utseF2Roof = new THREE.Mesh(new THREE.ConeGeometry(10.6, 1.8, 4), chineseJadeRoofMat);
  utseF2Roof.rotation.y = Math.PI / 4;
  utseF2Roof.position.y = 9.6;
  utseFloor2Group.add(utseF2Body, utseF2Roof);

  // Floor 3 (Indian style): mandala pavilion + gleaming golden roof (Serto)
  const utseF3Body = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.2, 8.4), stoneWhiteMat);
  utseF3Body.position.y = 11.4;
  utseF3Body.castShadow = true;
  const utseF3GoldRoof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 2.8, 4), indianGoldRoofMat);
  utseF3GoldRoof.rotation.y = Math.PI / 4;
  utseF3GoldRoof.position.y = 14.2;
  const utseFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), indianGoldRoofMat);
  utseFinial.position.y = 16.2;
  utseFloor3Group.add(utseF3Body, utseF3GoldRoof, utseFinial);

  // --- Stage 2 & 3: Four Colored Stupas (`四色塔`: White SE, Red SW, Black NW, Green NE)
  const stupaFoundationsGroup = new THREE.Group();
  const fourStupasGroup = new THREE.Group();
  monasteryGroup.add(stupaFoundationsGroup, fourStupasGroup);

  const coloredStupaDefs = [
    { id: 'white_se', lx: 21, lz: 21, color: 0xf8fafc, emissive: 0x64748b },   // SE White Stupa
    { id: 'red_sw', lx: -21, lz: 21, color: 0xdc2626, emissive: 0x991b1b },    // SW Red Stupa
    { id: 'black_nw', lx: -21, lz: -21, color: 0x1e293b, emissive: 0x0f172a }, // NW Black Stupa
    { id: 'green_ne', lx: 21, lz: -21, color: 0x0d9488, emissive: 0x115e59 },  // NE Green/Turquoise Stupa
  ];

  for (const cs of coloredStupaDefs) {
    // Stage 2 stone foundation plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 5.4), stoneWhiteMat);
    plinth.position.set(cs.lx, 0.55, cs.lz);
    plinth.castShadow = true;
    stupaFoundationsGroup.add(plinth);

    // Stage 3 full colored stupa
    const sMat = new THREE.MeshStandardMaterial({
      color: cs.color,
      emissive: cs.emissive,
      emissiveIntensity: 0.32,
      roughness: 0.55,
      metalness: 0.12,
    });
    const sg = new THREE.Group();
    sg.position.set(cs.lx, 1.1, cs.lz);

    const tier = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 4.2), sMat);
    tier.position.y = 0.8;
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 2.2, 12), sMat);
    dome.position.y = 2.7;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.8, 10), indianGoldRoofMat);
    spire.position.y = 5.2;
    sg.add(tier, dome, spire);
    fourStupasGroup.add(sg);

    addCollider(ox + cs.lx, oz + cs.lz, 2.8);
  }

  // --- Stage 3: Four Continents Temples (`四大部洲殿` at N, E, S, W)
  const fourContinentsGroup = new THREE.Group();
  monasteryGroup.add(fourContinentsGroup);

  const continentCoords = [
    [0, -25],
    [25, 0],
    [0, 25],
    [-25, 0],
  ];
  for (const [cx, cz] of continentCoords) {
    const cg = new THREE.Group();
    cg.position.set(cx, 0, cz);
    const hall = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.6, 6.2), stoneWhiteMat);
    hall.position.y = 1.8;
    hall.castShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.65, 6.6), tibetanRedMat);
    roof.position.y = 3.85;
    cg.add(hall, roof);
    fourContinentsGroup.add(cg);
    addCollider(ox + cx, oz + cz, 3.4);
  }

  // --- Stage 4: Sun & Moon Chapels (`日月殿`), Eight Sub-continents (`八小洲殿`),
  //              1008 Mini-Stupas (`InstancedMesh`), and Prayer Flags
  const stage4Group = new THREE.Group();
  stage4Group.name = 'Samye_Stage4_Complete';
  monasteryGroup.add(stage4Group);

  // Sun Chapel (North of Utse: `local (0, -14.5)`) & Moon Chapel (South of Utse: `local (0, 14.5)`)
  const sunChapel = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.5, 3.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.45, roughness: 0.4 })
  );
  sunChapel.position.set(0, 1.6, -14.5);
  const moonChapel = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.5, 3.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.45, roughness: 0.4 })
  );
  moonChapel.position.set(0, 1.6, 14.5);
  stage4Group.add(sunChapel, moonChapel);

  // Eight Sub-continents Chapels (`八小洲殿`) as a single InstancedMesh (count = 8)
  const subChapelGeo = new THREE.BoxGeometry(3.4, 2.6, 3.4);
  subChapelGeo.translate(0, 1.3, 0);
  const subChapelInst = new THREE.InstancedMesh(subChapelGeo, stoneWhiteMat, 8);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI + Math.PI / 8;
    dummy.position.set(Math.cos(a) * 31.5, 0, Math.sin(a) * 31.5);
    dummy.rotation.set(0, -a, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    subChapelInst.setMatrixAt(i, dummy.matrix);
  }
  subChapelInst.instanceMatrix.needsUpdate = true;
  stage4Group.add(subChapelInst);

  // 1008 Mini-Stupas along the top of the circular perimeter wall (SINGLE InstancedMesh, count = 1008!)
  const miniStupaGeo = createMiniStupaGeometry();
  const miniStupaMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xd97706,
    emissiveIntensity: 0.42,
    roughness: 0.45,
    metalness: 0.25,
  });
  const miniStupasInst = new THREE.InstancedMesh(miniStupaGeo, miniStupaMat, MINI_STUPA_COUNT);
  miniStupasInst.name = 'SamyeMiniStupas1008';

  function updateMiniStupasTransform(litFraction = 1.0) {
    const limit = Math.max(0, Math.min(MINI_STUPA_COUNT, Math.round(MINI_STUPA_COUNT * litFraction)));
    for (let i = 0; i < MINI_STUPA_COUNT; i++) {
      const ang = (i / MINI_STUPA_COUNT) * TWO_PI;
      const r = WALL_RADIUS + 0.6;
      dummy.position.set(Math.cos(ang) * r, 3.4, Math.sin(ang) * r);
      dummy.rotation.set(0, -ang, 0);
      const s = i < limit ? 1.0 : 0.001;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      miniStupasInst.setMatrixAt(i, dummy.matrix);
    }
    miniStupasInst.instanceMatrix.needsUpdate = true;
  }
  updateMiniStupasTransform(1.0);
  stage4Group.add(miniStupasInst);

  // Radial Prayer Flag Lines from Utse roof to perimeter wall
  const flagLineMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TWO_PI;
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 36), flagLineMat);
    ribbon.position.set(Math.cos(ang) * 22, 8.8, Math.sin(ang) * 22);
    ribbon.rotation.y = Math.atan2(Math.cos(ang), Math.sin(ang));
    ribbon.rotation.x = 0.26;
    stage4Group.add(ribbon);
  }

  // ---------------------------------------------------------------- 5. Mount Hepo Ri Summit Altar & Guru Vision Vajra Dance at local (75, -10)
  const heporiGroup = new THREE.Group();
  heporiGroup.name = 'Samye_MountHepoRi';
  const hepoY = getHeight(75, -10);
  heporiGroup.position.set(75, hepoY, -10);
  root.add(heporiGroup);

  // Mandala Stone Platform & Sang-Smoke Censers on Mount Hepo Ri Summit
  const altarDisc = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.2, 0.45, 24), stoneWhiteMat);
  altarDisc.position.y = 0.22;
  heporiGroup.add(altarDisc);

  const altarRing = new THREE.Mesh(new THREE.RingGeometry(5.6, 6.1, 32), nodeBeaconMat);
  altarRing.rotation.x = -Math.PI / 2;
  altarRing.position.y = 0.48;
  heporiGroup.add(altarRing);

  // Wrathful Vajra Dance Aura & Halo around Guru Vision at Hepo Ri
  const vajraDanceAura = new THREE.Group();
  vajraDanceAura.position.set(0, 0.5, 0);
  heporiGroup.add(vajraDanceAura);

  const vajraHalo = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 2.1, 28),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.4, 1.75, 0.4),
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    })
  );
  vajraHalo.rotation.x = -Math.PI / 2;
  vajraDanceAura.add(vajraHalo);

  // Golden Light Motes (`heporiMotesGroup`) that fly from Hepo Ri to Samye when gauntlet completes
  const MOTES_COUNT = 24;
  const heporiMotesGroup = new THREE.Group();
  heporiMotesGroup.visible = false;
  root.add(heporiMotesGroup);
  const moteGeo = new THREE.SphereGeometry(0.32, 8, 8);
  const moteMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.5, 1.95, 0.5),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
  });
  const moteMeshes = [];
  for (let i = 0; i < MOTES_COUNT; i++) {
    const m = new THREE.Mesh(moteGeo, moteMat);
    heporiMotesGroup.add(m);
    moteMeshes.push(m);
  }
  let motesFlightTimer = 0;

  // ---------------------------------------------------------------- 6. Pehar Boss Arena at local (0, -65) -> world (5000, -65)
  const peharArenaGroup = new THREE.Group();
  peharArenaGroup.name = 'Samye_PeharArena';
  peharArenaGroup.position.set(0, getHeight(0, -65), -65);
  root.add(peharArenaGroup);

  const peharArenaRing = new THREE.Mesh(
    new THREE.RingGeometry(17.4, 18.0, 48),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  peharArenaRing.rotation.x = -Math.PI / 2;
  peharArenaRing.position.y = 0.05;
  peharArenaGroup.add(peharArenaRing);

  // ---------------------------------------------------------------- 7. Golden Palm-Vision Miniature Samye Monastery
  const palmMiniatureGroup = new THREE.Group();
  palmMiniatureGroup.name = 'Samye_PalmVisionMiniature';
  palmMiniatureGroup.position.set(-28.2, getHeight(-30, 55) + 1.85, 53.5);
  palmMiniatureGroup.scale.setScalar(0.065);
  palmMiniatureGroup.visible = false;
  root.add(palmMiniatureGroup);

  const palmGoldMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.85, 0.45),
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const miniWall = new THREE.Mesh(new THREE.CylinderGeometry(43, 43, 4, 32, 1, true), palmGoldMat);
  miniWall.position.y = 2;
  const miniUtse1 = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 16), palmGoldMat);
  miniUtse1.position.y = 3;
  const miniUtse2 = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 11), palmGoldMat);
  miniUtse2.position.y = 8.5;
  const miniUtse3 = new THREE.Mesh(new THREE.ConeGeometry(8, 5, 4), palmGoldMat);
  miniUtse3.rotation.y = Math.PI / 4;
  miniUtse3.position.y = 13.5;
  palmMiniatureGroup.add(miniWall, miniUtse1, miniUtse2, miniUtse3);
  for (const cs of coloredStupaDefs) {
    const ms = new THREE.Mesh(new THREE.ConeGeometry(2.5, 7, 8), palmGoldMat);
    ms.position.set(cs.lx, 3.5, cs.lz);
    palmMiniatureGroup.add(ms);
  }

  // ---------------------------------------------------------------- 8. Construction Stage Controller (0..4)
  let currentStage = 0;

  function loadInitialStage() {
    if (ctx.quests?.getFlag?.('ch4.done') || ctx.quests?.getFlag?.('ch4.stage.4')) return 4;
    if (ctx.quests?.getFlag?.('ch4.hepori.done') || ctx.quests?.getFlag?.('ch4.stage.3')) return 3;
    if (ctx.quests?.getFlag?.('ch4.stage.2')) return 2;
    if (ctx.quests?.getFlag?.('ch4.stage.1')) return 1;
    const saved = ctx.save?.get?.('samye', null);
    if (saved && Number.isFinite(saved.stage)) {
      return Math.max(0, Math.min(4, Math.floor(saved.stage)));
    }
    return 0;
  }

  function setStage(stage) {
    const s = Math.max(0, Math.min(4, Math.floor(Number(stage) || 0)));
    currentStage = s;

    // Stage 0: Foundation lines
    stage0Group.visible = s === 0;

    // Stage 1+: Circular outer wall (half height at Stage 1, full height at Stage 2+) & Utse Floor 1
    wallGroup.visible = s >= 1;
    for (let i = 0; i < 4; i++) {
      const seg = wallSegments[i];
      if (seg.mesh) {
        const hScale = seg.broken ? 0.25 : s === 1 ? 0.52 : 1.0;
        seg.mesh.scale.set(1, hScale, 1);
      }
    }
    utseFloor1Group.visible = s >= 1;

    // Stage 2+: Utse Floor 2 + Four Colored Stupa Foundations
    utseFloor2Group.visible = s >= 2;
    stupaFoundationsGroup.visible = s >= 2;

    // Stage 3+: Utse Floor 3 + Four Colored Stupas + Four Continents Temples
    utseFloor3Group.visible = s >= 3;
    fourStupasGroup.visible = s >= 3;
    fourContinentsGroup.visible = s >= 3;

    // Stage 4: Sun & Moon Chapels, Eight Sub-continents, 1008 Mini-Stupas, Prayer Flags, & 7 Tested Men
    stage4Group.visible = s >= 4;
    if (s >= 4) {
      updateMiniStupasTransform(1.0);
    }

    if (presentationOnly) return s;

    // Persist flag & save state
    if (ctx.quests?.setFlag) {
      ctx.quests.setFlag(`ch4.stage.${s}`, true);
    }
    if (ctx.save?.set) {
      ctx.save.set('samye', { stage: s, nightsSurvived });
    }
    bus.emit('samye:stageChanged', { stage: s });
    return s;
  }

  // Narrative callers own the detached map and drive visual stages directly.
  // Exit before constructing defense state or registering any adventure hooks.
  if (presentationOnly) {
    setStage(0);
    for (const beacon of nodeBeacons) beacon.visible = false;
    peharArenaGroup.visible = false;
    vajraDanceAura.visible = false;
    return {
      group, getHeight: getHeightWorld, setStage,
      structure: monasteryGroup,
      nightTorches: wallTorchesGroup,
    };
  }

  // ---------------------------------------------------------------- 9. Day-Build / Night-Destroy Defense System & Top HUD
  let phase = 'day'; // 'day' | 'night'
  let nightsSurvived = 0;
  let nightTimer = 0;
  const NIGHT_DURATION_SEC = 120;
  let nightSpawnCooldown = 0;
  let extraRepairMaterials = 0; // Incremented whenever a wall segment reaches 0 HP

  const carrying = { stone: 0, wood: 0 };
  const delivered = { stone: 0, wood: 0 };
  const BASE_REQ_STONE = 6;
  const BASE_REQ_WOOD = 4;
  const MAX_CARRY = 4;

  function getReqStone() {
    return BASE_REQ_STONE + extraRepairMaterials * 2;
  }
  function getReqWood() {
    return BASE_REQ_WOOD + extraRepairMaterials;
  }
  function totalCarrying() {
    return carrying.stone + carrying.wood;
  }

  // Create compact DOM HUD widget at top of screen for Day-Build / Night-Destroy & Hepo Ri Gauntlet
  let hudEl = null;
  let cutsceneEl = null;

  function ensureHudElement() {
    if (typeof document === 'undefined') return null;
    if (!hudEl) {
      hudEl = document.getElementById('samye-defense-hud');
      if (!hudEl) {
        hudEl = document.createElement('div');
        hudEl.id = 'samye-defense-hud';
        hudEl.style.cssText = [
          'position:fixed',
          'top:62px',
          'left:50%',
          'transform:translateX(-50%)',
          'z-index:35',
          'background:rgba(15,23,42,0.86)',
          'border:1px solid rgba(251,191,36,0.55)',
          'border-radius:10px',
          'padding:8px 16px',
          'color:#fef3c7',
          'font-family:"Noto Serif TC",serif',
          'font-size:13px',
          'text-align:center',
          'pointer-events:auto',
          'box-shadow:0 4px 18px rgba(0,0,0,0.45)',
          'display:none',
          'min-width:320px',
        ].join(';');
        document.body.appendChild(hudEl);
      }
    }
    return hudEl;
  }

  function formatCodexLinksHtml(text) {
    if (!text) return '';
    return String(text).replace(/\[\[codex:([a-zA-Z0-9_.-]+)\]\]/g, (_, entryId) => {
      const title = i18n?.t ? i18n.t(`codex.entry.${entryId}.title`) : entryId;
      return `<button type="button" data-codex-link="${entryId}" style="background:none;border:none;color:#fbbf24;text-decoration:underline;cursor:pointer;font:inherit;padding:0 2px;">${title}</button>`;
    });
  }

  function renderDefenseHud() {
    const el = ensureHudElement();
    if (!el) return;

    // Show Hepo Ri Gauntlet banner if active
    if (heporiState.active) {
      el.style.display = 'block';
      const wIdx = Math.max(1, Math.min(4, heporiState.wave));
      const title = i18n?.t ? i18n.t(`hepori.wave${wIdx}.title`) : `Wave ${wIdx}/4`;
      const desc = i18n?.t ? i18n.t(`hepori.wave${wIdx}.desc`) : '';
      el.innerHTML = `
        <div style="font-weight:700;color:#fbbf24;margin-bottom:3px;">${title}</div>
        <div style="font-size:12px;color:#e2e8f0;">${formatCodexLinksHtml(desc)}</div>
      `;
      const links = el.querySelectorAll('[data-codex-link]');
      links.forEach((btn) => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          const cid = btn.getAttribute('data-codex-link');
          if (cid) {
            ctx.codex?.unlock?.(cid);
            bus.emit('codex:open', { id: cid });
          }
        };
      });
      return;
    }

    const isDayNightQuest =
      ctx.quests?.getActive?.()?.some?.((q) => q.id === 'ch4.dayNight') ||
      phase === 'night';

    if (!isDayNightQuest || state.zone !== 'samye') {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'block';
    if (phase === 'day') {
      const cycle = Math.min(3, nightsSurvived + 1);
      const dayTitle = (i18n?.t ? i18n.t('samye.hud.dayTitle') : 'Day {cycle}/3').replace('{cycle}', cycle);
      const matLine = (i18n?.t ? i18n.t('samye.hud.materials') : 'Stone {stone}/{reqStone} | Wood {wood}/{reqWood}')
        .replace('{stone}', delivered.stone)
        .replace('{reqStone}', getReqStone())
        .replace('{wood}', delivered.wood)
        .replace('{reqWood}', getReqWood());
      const carryLine = (i18n?.t ? i18n.t('samye.hud.carry') : 'Carry: Stone {cStone} Wood {cWood}')
        .replace('{cStone}', carrying.stone)
        .replace('{cWood}', carrying.wood);
      const extraNote =
        extraRepairMaterials > 0
          ? `<div style="color:#f87171;font-size:11px;margin-top:2px;">${(i18n?.t ? i18n.t('samye.hud.repairExtra') : '+{extra} repair').replace('{extra}', extraRepairMaterials)}</div>`
          : '';
      el.innerHTML = `
        <div style="font-weight:700;color:#fbbf24;">${dayTitle}</div>
        <div style="margin-top:2px;">${matLine}</div>
        <div style="font-size:12px;color:#cbd5e1;">${carryLine}</div>
        ${extraNote}
      `;
    } else {
      const nightNum = Math.min(3, nightsSurvived + 1);
      const secLeft = Math.max(0, Math.ceil(nightTimer));
      const nightTitle = (i18n?.t ? i18n.t('samye.hud.nightTitle') : 'Night {night}/3 — {sec}s')
        .replace('{night}', nightNum)
        .replace('{sec}', secLeft);
      const barsHtml = wallSegments
        .map((seg) => {
          const name = i18n?.t ? i18n.t(seg.labelKey) : seg.id;
          const pct = Math.max(0, Math.min(100, Math.round((seg.hp / seg.maxHp) * 100)));
          const barCol = seg.broken ? '#ef4444' : pct > 50 ? '#22c55e' : '#f59e0b';
          return `
            <div style="display:inline-block;width:68px;margin:0 4px;text-align:center;">
              <div style="font-size:11px;color:${seg.broken ? '#f87171' : '#e2e8f0'};">${name} ${pct}%</div>
              <div style="height:6px;background:#334155;border-radius:3px;overflow:hidden;margin-top:2px;">
                <div style="width:${pct}%;height:100%;background:${barCol};"></div>
              </div>
            </div>
          `;
        })
        .join('');
      el.innerHTML = `
        <div style="font-weight:700;color:#f87171;margin-bottom:4px;">${nightTitle}</div>
        <div>${barsHtml}</div>
      `;
    }
  }

  function applyMorningSky() {
    ctx.sky?.setTimeOverride?.({ t: 0.38, speed: 0, transitionSec: 1.2 });
    wallTorchesGroup.visible = false;
  }

  function applyNightSky() {
    ctx.sky?.setTimeOverride?.({ t: 0.86, speed: 0, transitionSec: 1.8 });
    wallTorchesGroup.visible = true;
  }

  function damageWall(segIndex, amount = 25) {
    const idx = Math.max(0, Math.min(3, Math.floor(Number(segIndex) || 0)));
    const seg = wallSegments[idx];
    if (!seg || seg.broken) return seg;

    seg.hp = Math.max(0, seg.hp - Math.max(0, Number(amount) || 0));
    if (seg.mat) {
      seg.mat.emissive.setHex(0xef4444);
      seg.mat.emissiveIntensity = 0.55;
      setTimeout(() => {
        if (seg.mat) {
          seg.mat.emissive.setHex(0x000000);
          seg.mat.emissiveIntensity = 0;
        }
      }, 180);
    }

    if (seg.hp <= 0 && !seg.broken) {
      seg.broken = true;
      extraRepairMaterials += 1;
      if (seg.mesh) {
        seg.mesh.scale.set(1, 0.25, 1);
      }
      bus.emit('samye:wallBroken', {
        segIndex: idx,
        id: seg.id,
        extraRepairMaterials,
      });
    }
    renderDefenseHud();
    return seg;
  }

  function spawnNightWaveEnemies() {
    if (!ctx.enemies?.spawn) return;
    const nightNum = Math.min(3, nightsSurvived + 1);
    const dirAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

    for (let s = 0; s < 4; s++) {
      const seg = wallSegments[s];
      const ang = dirAngles[s] + (Math.random() - 0.5) * 0.25;
      const spawnR = 64 + Math.random() * 6;
      const sx = ox + Math.cos(ang) * spawnR;
      const sz = oz + Math.sin(ang) * spawnR;

      let kind = 'wallBreaker';
      if (nightNum === 2 && s === 1) kind = 'du';
      if (nightNum >= 3 && s === 1) kind = 'du';
      if (nightNum >= 3 && s === 3) kind = 'gyalpo';

      const wallTarget = {
        segIndex: s,
        x: seg.wx,
        z: seg.wz,
        active: !seg.broken,
        onHit(dmg) {
          damageWall(s, dmg);
        },
      };
      const spawned = ctx.enemies.spawn(kind, {
        x: sx,
        z: sz,
        level: 24 + nightNum,
        noSplit: true,
        wallTarget,
      });
      const activeList = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.getActive?.() || [];
      const inst =
        typeof spawned === 'string'
          ? activeList.find((en) => en.id === spawned)
          : spawned;
      if (inst && typeof inst === 'object') {
        inst.noSplit = true;
        inst.state = 'chase';
        inst.wallTarget = wallTarget;
      }
    }
  }

  function startNight() {
    phase = 'night';
    nightTimer = NIGHT_DURATION_SEC;
    nightSpawnCooldown = 0.5;
    for (const seg of wallSegments) {
      seg.hp = seg.maxHp;
      seg.broken = false;
      if (seg.mesh) {
        seg.mesh.scale.set(1, currentStage <= 1 ? 0.55 : 1.0, 1);
      }
    }
    if (currentStage < 1) {
      setStage(1);
    }
    applyNightSky();
    renderDefenseHud();
    bus.emit('samye:nightStarted', { night: nightsSurvived + 1 });
    return true;
  }

  function endNight() {
    if (phase !== 'night') {
      // Allow direct debug call to `endNight()` even from day phase so tests can advance immediately
      phase = 'night';
    }
    phase = 'day';
    nightTimer = 0;

    // Clear remaining night wave enemies
    const list = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.getActive?.() || [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].wallTarget) {
        ctx.enemies.damage(list[i].id, 999999, 'magic', { execute: true });
      }
    }

    const brokenSegments = wallSegments.filter((s) => s.broken).map((s) => s.id);
    nightsSurvived = Math.min(3, nightsSurvived + 1);
    const nextStage = Math.max(currentStage, Math.min(3, nightsSurvived));
    setStage(nextStage);

    // Reset daily delivered materials for next cycle (extraRepairMaterials carries over if a wall broke)
    delivered.stone = 0;
    delivered.wood = 0;
    carrying.stone = 0;
    carrying.wood = 0;
    for (const seg of wallSegments) {
      seg.hp = seg.maxHp;
      seg.broken = false;
      if (seg.mesh) seg.mesh.scale.set(1, nextStage === 1 ? 0.52 : 1.0, 1);
    }

    applyMorningSky();
    renderDefenseHud();

    bus.emit('toast', {
      key: 'samye.hud.nightSurvived',
      params: { stage: nextStage },
    });
    bus.emit('samye:nightSurvived', {
      night: nightsSurvived,
      stage: nextStage,
      brokenSegments,
      extraRepairMaterials,
    });
    return { night: nightsSurvived, stage: nextStage, brokenSegments };
  }

  function deliverCarriedMaterials() {
    if (carrying.stone <= 0 && carrying.wood <= 0) return false;
    delivered.stone = Math.min(getReqStone(), delivered.stone + carrying.stone);
    delivered.wood = Math.min(getReqWood(), delivered.wood + carrying.wood);
    carrying.stone = 0;
    carrying.wood = 0;
    bus.emit('sfx', { name: 'bell' });
    bus.emit('toast', {
      key: 'toast.materialsDelivered',
      params: {
        stone: delivered.stone,
        reqStone: getReqStone(),
        wood: delivered.wood,
        reqWood: getReqWood(),
      },
    });
    renderDefenseHud();

    if (delivered.stone >= getReqStone() && delivered.wood >= getReqWood() && phase === 'day') {
      extraRepairMaterials = 0;
      startNight();
    }
    return true;
  }

  bus.on('samye:deliverMaterials', () => {
    deliverCarriedMaterials();
  });

  // ---------------------------------------------------------------- 10. Mount Hepo Ri 4-Wave Gauntlet
  const heporiState = {
    active: false,
    cleared: Boolean(ctx.quests?.getFlag?.('ch4.hepori.done')),
    wave: 0,
    pauseTimer: 0,
    spawnedIds: [],
  };

  function spawnHeporiWave(waveNum) {
    heporiState.wave = waveNum;
    heporiState.spawnedIds = [];
    renderDefenseHud();

    if (!ctx.enemies?.spawn) return;
    const cx = ox + 75; // 5075
    const cz = oz - 10; // -10

    const defs =
      waveNum === 1
        ? [
            { kind: 'tsen', rank: 'normal' },
            { kind: 'tsen', rank: 'normal' },
            { kind: 'tsen', rank: 'normal' },
          ]
        : waveNum === 2
          ? [
              { kind: 'du', rank: 'normal' },
              { kind: 'du', rank: 'normal' },
              { kind: 'du', rank: 'normal' },
            ]
          : waveNum === 3
            ? [
                { kind: 'gyalpo', rank: 'normal' },
                { kind: 'gyalpo', rank: 'normal' },
                { kind: 'gyalpo', rank: 'normal' },
              ]
            : [
                { kind: 'tsen', rank: 'normal' },
                { kind: 'du', rank: 'normal' },
                { kind: 'gyalpo', rank: 'rare', affixes: ['swift', 'armored'] },
              ];

    for (let i = 0; i < defs.length; i++) {
      const a = (i / defs.length) * TWO_PI;
      const sx = cx + Math.cos(a) * 8.5;
      const sz = cz + Math.sin(a) * 8.5;
      const spawned = ctx.enemies.spawn(defs[i].kind, {
        x: sx,
        z: sz,
        level: 26 + waveNum,
        rank: defs[i].rank,
        affixes: defs[i].affixes || [],
        noSplit: true,
      });
      const activeList = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.getActive?.() || [];
      const inst =
        typeof spawned === 'string'
          ? activeList.find((en) => en.id === spawned)
          : spawned;
      const eid = typeof spawned === 'string' ? spawned : inst?.id;
      if (inst && typeof inst === 'object') {
        inst.noSplit = true;
        inst.state = 'chase';
      }
      if (eid) {
        heporiState.spawnedIds.push(eid);
      }
    }
  }

  function startHeporiGauntlet() {
    heporiState.active = true;
    heporiState.cleared = false;
    heporiState.wave = 1;
    heporiState.pauseTimer = 0;
    spawnHeporiWave(1);
    bus.emit('hepori:started', { wave: 1 });
    return heporiState;
  }

  function completeHeporiGauntlet() {
    heporiState.active = false;
    heporiState.cleared = true;
    heporiState.wave = 4;
    heporiState.pauseTimer = 0;

    // Liberate any remaining gauntlet enemies
    const activeList = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.getActive?.() || [];
    for (let i = activeList.length - 1; i >= 0; i--) {
      if (heporiState.spawnedIds.includes(activeList[i].id)) {
        ctx.enemies.damage(activeList[i].id, 999999, 'magic', { execute: true });
      }
    }
    heporiState.spawnedIds = [];

    // Launch golden light motes flying from Mount Hepo Ri (75, -10) to Samye Monastery (0, 0)
    motesFlightTimer = 3.2;
    heporiMotesGroup.visible = true;

    setStage(Math.max(currentStage, 3));
    renderDefenseHud();
    bus.emit('toast', { key: 'hepori.cleared' });
    bus.emit('hepori:cleared', { stage: currentStage });
    return true;
  }

  bus.on('hepori:requestStart', () => {
    if (!heporiState.active && !heporiState.cleared) {
      startHeporiGauntlet();
    }
  });

  // ---------------------------------------------------------------- 11. "Samye!" (`བསམ་ཡས`) Ending Cutscene
  let endingState = {
    playing: false,
    elapsed: 0,
    duration: 9.5,
    completed: Boolean(ctx.quests?.getFlag?.('ch4.done')),
  };

  function ensureCutsceneOverlay() {
    if (typeof document === 'undefined') return null;
    if (!cutsceneEl) {
      cutsceneEl = document.getElementById('samye-ending-overlay');
      if (!cutsceneEl) {
        cutsceneEl = document.createElement('div');
        cutsceneEl.id = 'samye-ending-overlay';
        cutsceneEl.style.cssText = [
          'position:fixed',
          'inset:0',
          'z-index:80',
          'pointer-events:none',
          'display:none',
          'flex-direction:column',
          'justify-content:space-between',
          'align-items:center',
          'padding:42px 24px',
          'background:radial-gradient(circle, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.68) 100%)',
          'font-family:"Noto Serif TC",serif',
        ].join(';');
        document.body.appendChild(cutsceneEl);
      }
    }
    return cutsceneEl;
  }

  function finishEndingCutscene() {
    if (!endingState.playing && endingState.completed) return;
    endingState.playing = false;
    endingState.completed = true;
    if (state.player) {
      state.player.lockedMovement = false;
    }
    palmMiniatureGroup.visible = false;
    setStage(4);
    updateMiniStupasTransform(1.0);
    ctx.sky?.clearTimeOverride?.();

    // Ensure Seven Tested Men NPC is visible at Stage 4
    ctx.quests?.setFlag?.('ch4.pehar.done', true);

    if (cutsceneEl) {
      cutsceneEl.style.display = 'none';
    }
    bus.emit('sfx', { name: 'bowl' });
    bus.emit('samye:endingPlayed', { stage: 4 });
  }

  function playEnding() {
    endingState.playing = true;
    endingState.elapsed = 0;
    if (state.player) {
      state.player.lockedMovement = true;
      state.player.velocity?.set?.(0, 0, 0);
    }
    palmMiniatureGroup.visible = true;
    const overlay = ensureCutsceneOverlay();
    if (overlay) {
      overlay.style.display = 'flex';
      renderEndingCutsceneOverlay(0);
    }
    bus.emit('sfx', { name: 'bell' });
    return true;
  }

  function skipEnding() {
    finishEndingCutscene();
    return true;
  }

  function renderEndingCutsceneOverlay(t) {
    const overlay = ensureCutsceneOverlay();
    if (!overlay) return;

    const q1 = i18n?.t ? i18n.t('samye.ending.q1') : 'What will the monastery look like when completed?';
    const q2 = i18n?.t ? i18n.t('samye.ending.q2') : 'Guru Rinpoche extends his palm with a golden miniature Samye.';
    const exclaim = i18n?.t ? i18n.t('samye.ending.samyeExclaim') : 'Samye! (བསམ་ཡས — Inconceivable!)';
    const sub = i18n?.t ? i18n.t('samye.ending.sub') : '';
    const skipLabel = i18n?.t ? i18n.t('samye.ending.skip') : 'Skip';

    const showTibetan = t >= 3.2;
    const lineText = t < 2.0 ? q1 : t < 4.5 ? q2 : exclaim;

    overlay.innerHTML = `
      <div style="width:100%;display:flex;justify-content:flex-end;">
        <button id="samye-ending-skip-btn" type="button" style="pointer-events:auto;background:rgba(15,23,42,0.88);border:1px solid #fbbf24;color:#fef3c7;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;">
          ${skipLabel}
        </button>
      </div>
      <div style="text-align:center;transition:opacity 0.4s;">
        ${
          showTibetan
            ? `<div style="font-size:74px;color:#fbbf24;text-shadow:0 0 28px rgba(251,191,36,0.92);font-weight:700;letter-spacing:4px;">བསམ་ཡས</div>
               <div style="font-size:28px;color:#fef3c7;text-shadow:0 2px 12px #000;margin-top:4px;">「桑耶！ — SAMYE!」</div>`
            : ''
        }
      </div>
      <div style="max-width:720px;background:rgba(15,23,42,0.88);border:1px solid rgba(251,191,36,0.55);border-radius:10px;padding:14px 22px;text-align:center;color:#fef3c7;">
        <div style="font-size:16px;line-height:1.5;">${lineText}</div>
        ${t >= 5.2 ? `<div style="font-size:13px;color:#fde68a;margin-top:6px;">${sub}</div>` : ''}
      </div>
    `;
    const btn = overlay.querySelector('#samye-ending-skip-btn');
    if (btn) {
      btn.onclick = () => skipEnding();
    }
  }

  bus.on('samye:requestEnding', () => {
    if (!endingState.playing) {
      playEnding();
    }
  });

  bus.on('quest:start', (payload) => {
    if (payload?.id === 'ch4.dayNight' && state.zone === 'samye') {
      applyMorningSky();
      renderDefenseHud();
    } else if (payload?.id === 'ch4.samye' && state.zone === 'samye') {
      setTimeout(() => {
        if (!endingState.playing && !endingState.completed) {
          playEnding();
        }
      }, 350);
    }
  });

  // Initialize stage from save/flags
  setStage(loadInitialStage());

  // If entering Samye during `ch4.dayNight`, apply morning sky
  if (
    ctx.quests?.isActive?.('ch4.dayNight') ||
    ctx.quests?.getActive?.()?.some?.((q) => q.id === 'ch4.dayNight')
  ) {
    applyMorningSky();
  }

  // ---------------------------------------------------------------- 12. Register Debug APIs (`__stupa.samye` & `__stupa.hepori`)
  const samyeApi = {
    setStage,
    getStage: () => currentStage,
    startNight,
    endNight,
    damageWall,
    playEnding,
    skipEnding,
    getState() {
      return {
        stage: currentStage,
        phase,
        nightsSurvived,
        nightTimer,
        carrying: { ...carrying },
        delivered: { ...delivered },
        reqStone: getReqStone(),
        reqWood: getReqWood(),
        extraRepairMaterials,
        wallSegments: wallSegments.map((s) => ({
          id: s.id,
          hp: s.hp,
          maxHp: s.maxHp,
          broken: s.broken,
        })),
        miniStupaCount: miniStupasInst.count,
        endingPlaying: endingState.playing,
      };
    },
  };

  const heporiApi = {
    start: startHeporiGauntlet,
    complete: completeHeporiGauntlet,
    getState() {
      return { ...heporiState };
    },
  };

  ctx.samye = samyeApi;
  ctx.hepori = heporiApi;
  ctx.debug?.register?.('samye', samyeApi);
  ctx.debug?.register?.('hepori', heporiApi);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.samye = samyeApi;
    window.__stupa.hepori = heporiApi;
  }

  // ---------------------------------------------------------------- 13. Per-Frame Update & Interaction Prompts
  let hudTick = 0;

  return {
    group,
    root,
    getHeight: getHeightWorld,
    samye: samyeApi,
    hepori: heporiApi,
    getInteractPrompt() {
      const pPos = state.player?.position;
      if (!pPos || state.uiOpen || endingState.playing) return null;

      // 1. Quarry / Timber gathering nodes
      for (const node of resourceNodes) {
        const d = Math.hypot(pPos.x - node.wx, pPos.z - node.wz);
        if (d <= 3.6) {
          if (totalCarrying() >= MAX_CARRY) {
            return { key: 'prompt.samyeCarryFull' };
          }
          return { key: node.promptKey };
        }
      }

      // 2. Deliver materials to Master Artisan at camp (4966.5, 52.5)
      if (totalCarrying() > 0 && Math.hypot(pPos.x - 4966.5, pPos.z - 52.5) <= 4.2) {
        return { key: 'prompt.samyeDeliver' };
      }

      // 3. Mount Hepo Ri summit Vajra Dance altar (5075, -10)
      if (
        !heporiState.active &&
        !heporiState.cleared &&
        Math.hypot(pPos.x - (ox + 75), pPos.z - (oz - 10)) <= 6.0
      ) {
        return { key: 'prompt.heporiAltar' };
      }

      return null;
    },

    update(dt) {
      const pPos = state.player?.position;
      const elapsed = state.elapsed || 0;

      // Pulse resource beacons & Hepo Ri Vajra Dance halo
      for (let i = 0; i < nodeBeacons.length; i++) {
        nodeBeacons[i].rotation.z = elapsed * 0.8;
      }
      vajraHalo.rotation.z = elapsed * 2.4;
      const haloScale = 1.0 + Math.sin(elapsed * 5.0) * 0.12;
      vajraHalo.scale.setScalar(haloScale);

      // Animate Guru Rinpoche Pure Vision Vajra Dance on Mount Hepo Ri
      const visionNpc = ctx.npcs?.get?.('guruVision.samye');
      if (visionNpc && visionNpc.group) {
        visionNpc.group.rotation.y = elapsed * (heporiState.active ? 3.2 : 1.1);
        visionNpc.group.position.y = hepoY + 0.25 + Math.abs(Math.sin(elapsed * 4.2)) * 0.35;
      }

      // Animate golden motes flying from Mount Hepo Ri (75, -10) to Samye (0, 0)
      if (motesFlightTimer > 0) {
        motesFlightTimer = Math.max(0, motesFlightTimer - dt);
        const u = 1 - motesFlightTimer / 3.2;
        for (let i = 0; i < MOTES_COUNT; i++) {
          const offset = (i / MOTES_COUNT) * 0.35;
          const p = Math.max(0, Math.min(1, (u - offset) / 0.65));
          const mx = 75 * (1 - p) + Math.sin(p * Math.PI * 3 + i) * 3.0;
          const mz = -10 * (1 - p) + Math.cos(p * Math.PI * 3 + i) * 3.0;
          const my = hepoY * (1 - p) + 4.0 + Math.sin(p * Math.PI) * 9.0;
          moteMeshes[i].position.set(mx, my, mz);
        }
        if (motesFlightTimer <= 0) {
          heporiMotesGroup.visible = false;
        }
      }

      // Handle ending cutscene progression
      if (endingState.playing) {
        endingState.elapsed += dt;
        const t = endingState.elapsed;
        palmMiniatureGroup.rotation.y = t * 1.1;
        palmMiniatureGroup.position.y = getHeight(-30, 55) + 1.85 + Math.sin(t * 2.5) * 0.12;

        if (t >= 4.2 && currentStage < 4) {
          setStage(4);
        }
        if (t >= 4.2) {
          const litProg = Math.min(1, (t - 4.2) / 3.6);
          updateMiniStupasTransform(litProg);
        }
        renderEndingCutsceneOverlay(t);
        if (t >= endingState.duration) {
          finishEndingCutscene();
        }
        return;
      }

      // Check `[E]` interactions for stone quarries, timber pile, artisan delivery, and Hepo Ri altar
      if (pPos && !state.uiOpen && ctx.input?.pressed?.('interact')) {
        // 1. Deliver materials if near Master Artisan
        if (totalCarrying() > 0 && Math.hypot(pPos.x - 4966.5, pPos.z - 52.5) <= 4.2) {
          deliverCarriedMaterials();
        } else {
          // 2. Gather from quarry / timber nodes
          for (const node of resourceNodes) {
            if (Math.hypot(pPos.x - node.wx, pPos.z - node.wz) <= 3.6) {
              if (totalCarrying() >= MAX_CARRY) {
                bus.emit('toast', { key: 'toast.carryFull', kind: 'warning' });
              } else {
                if (node.kind === 'stone') {
                  carrying.stone += 1;
                  bus.emit('toast', {
                    key: 'toast.stonePicked',
                    params: { carry: totalCarrying() },
                  });
                } else {
                  carrying.wood += 1;
                  bus.emit('toast', {
                    key: 'toast.woodPicked',
                    params: { carry: totalCarrying() },
                  });
                }
                bus.emit('sfx', { name: 'step' });
                renderDefenseHud();
              }
              break;
            }
          }

          // 3. Start Hepo Ri Gauntlet at summit altar
          if (
            !heporiState.active &&
            !heporiState.cleared &&
            Math.hypot(pPos.x - (ox + 75), pPos.z - (oz - 10)) <= 6.0
          ) {
            startHeporiGauntlet();
          }
        }
      }

      // Auto-deliver carried materials when walking right up to the Master Artisan stockpile
      if (pPos && totalCarrying() > 0 && Math.hypot(pPos.x - 4966.5, pPos.z - 52.5) <= 2.4) {
        deliverCarriedMaterials();
      }

      // Auto-start Hepo Ri Gauntlet when player reaches summit during `ch4.hepori`
      if (
        pPos &&
        !heporiState.active &&
        !heporiState.cleared &&
        (ctx.quests?.isActive?.('ch4.hepori') ||
          ctx.quests?.getActive?.()?.some?.((q) => q.id === 'ch4.hepori')) &&
        Math.hypot(pPos.x - (ox + 75), pPos.z - (oz - 10)) <= 12.0
      ) {
        startHeporiGauntlet();
      }

      // Tick Night Defense Phase (120s)
      if (phase === 'night') {
        nightTimer -= dt;
        nightSpawnCooldown -= dt;
        if (nightSpawnCooldown <= 0) {
          nightSpawnCooldown = 18.0;
          spawnNightWaveEnemies();
        }
        if (nightTimer <= 0) {
          endNight();
        }
      }

      // Tick Mount Hepo Ri 4-Wave Gauntlet
      if (heporiState.active) {
        const activeList = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.getActive?.() || [];
        const aliveCount = activeList.filter(
          (e) => heporiState.spawnedIds.includes(e.id) && e.hp > 0 && e.state !== 'liberated'
        ).length;

        if (aliveCount === 0) {
          if (heporiState.wave >= 4) {
            completeHeporiGauntlet();
          } else {
            heporiState.pauseTimer += dt;
            if (heporiState.pauseTimer >= 5.0) {
              heporiState.pauseTimer = 0;
              spawnHeporiWave(heporiState.wave + 1);
            }
          }
        }
      }

      hudTick += dt;
      if (hudTick >= 0.25) {
        hudTick = 0;
        renderDefenseHud();
      }
    },

    dispose() {
      if (hudEl) hudEl.style.display = 'none';
      if (cutsceneEl) cutsceneEl.style.display = 'none';
      if (state.player) state.player.lockedMovement = false;
      ctx.sky?.clearTimeOverride?.();
    },
  };
}

export const buildSamyeScene = createMap;
export default createMap;
