/**
 * Kōbō Daishi Kūkai Epic Hub Map Scene — Kyoto Tō-ji (`src/world/maps/toji.js`) — Issue #250
 *
 * Kyō-ō-gokoku-ji (`教王護國寺 / 東寺`, `origin = (7500, 0)`), Heian-kyō's imperial Shingon head temple:
 *   1. 南大門 (Nandaimon) at `local (0, 80)` & 九條通五本線築地塀 (5-striped imperial earthen walls)
 *   2. 東寺五重塔 (Gojū-no-tō, ~35m tall) at `local (36, 18)` with 5 tapering tiled roofs,
 *      20 corner wind bells (`風鐸`), 9-ring bronze finial (`相輪`), and open ground sanctum revealing
 *      the Heart Pillar (`心柱・大日如來`), Four Diamond-Realm Buddhas (`金剛界四佛`), & Eight Bodhisattvas (`八大菩薩`)
 *   3. 東寺金堂 (Kondō) at `local (0, 8)`: double-roofed hip-and-gable hall (`重層入母屋造`) with
 *      front `軒唐破風` karahafu gable, housing the golden Yakushi Triad (`藥師三尊：藥師如來・日光菩薩・月光菩薩`)
 *      with Seven-Yakushi mandorla (`七佛藥師光背`) and Twelve Heavenly Generals (`十二神將`)
 *   4. 東寺講堂 (Kōdō) at `local (0, -36)`: vermilion-pillared Heian lecture hall housing Kūkai’s
 *      21-Deity Three-Dimensional Mandala (`二十一尊立體曼荼羅` — 5 Wisdom Buddhas, 5 Great Bodhisattvas,
 *      5 Wisdom Kings with blazing Garuda flame halos, Bonten on geese, Taishakuten on white elephant, & 4 Heavenly Kings)
 *   5. 瓢箪池庭園 (Hyōtan-ike Gourd Pond & Garden) at `local (36, -16)` with curved granite bridge,
 *      stone lanterns (`石燈籠`), weeping cherry (`不二櫻` InstancedMesh), and crimson maples (`紅葉` InstancedMesh)
 *
 * Strictly ZERO PointLights — uses emissive materials, AdditiveBlending halos, merged static meshes,
 * and InstancedMesh for foliage/blossoms to keep draw calls low (< 120).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createHeightfieldTerrain,
  addRimMountains,
  pushCollider,
  seededRandom,
} from '../mapBase.js';
import { TOJI_MAP } from '../../data/maps/toji.js';
import { i18n } from '../../i18n.js';
import '../../i18n/toji.js';
import { addJapanRouteGate } from '../japanArchitecture.js';

const TWO_PI = Math.PI * 2;

/**
 * Merge an array of BufferGeometries into a single BufferGeometry and dispose source parts.
 */
function mergeAndDispose(geos) {
  if (!geos || geos.length === 0) return null;
  const nonIndexed = geos.map((g) => {
    if (g.index) {
      const ni = g.toNonIndexed();
      g.dispose();
      return ni;
    }
    return g;
  });
  const merged = mergeGeometries(nonIndexed, false);
  for (const g of nonIndexed) {
    g.dispose();
  }
  return merged;
}

/**
 * Deterministic heightfield for Kyoto Tō-ji (`origin = (7500, 0)`).
 * Keeps the walled Heian-kyō Garan precinct flat at `y = 0`, carves a shallow basin
 * for Hyōtan-ike Gourd Pond around `local (36, -16)`, and raises gentle Kyoto foothills outside.
 */
function tojiHeight(wx, wz, origin = TOJI_MAP.origin) {
  const lx = wx - origin.x;
  const lz = wz - origin.z;

  // Shallow basin for Hyōtan-ike Gourd Pond (two lobes around (36, -11) and (35, -22))
  const dPondSouth = Math.hypot(lx - 36, lz - -11);
  const dPondNorth = Math.hypot(lx - 35, lz - -22);
  if (dPondSouth < 8.6 || dPondNorth < 6.9) {
    const uS = Math.max(0, 1 - dPondSouth / 8.6);
    const uN = Math.max(0, 1 - dPondNorth / 6.9);
    const depth = Math.max(uS, uN);
    return -0.32 * depth;
  }

  // Keep the entire walled Garan compound and Kujō avenue flat
  if (Math.abs(lx) <= 72 && Math.abs(lz) <= 86) {
    return 0;
  }

  // Gentle rise toward the outer Kyoto basin hills
  const dx = Math.max(0, Math.abs(lx) - 72);
  const dz = Math.max(0, Math.abs(lz) - 86);
  const rimDist = Math.hypot(dx, dz);
  const wave =
    Math.sin(lx * 0.05 + 0.8) * Math.cos(lz * 0.05 - 0.4) * 0.45 +
    Math.sin((lx + lz) * 0.035) * 0.3;
  return Math.min(9.5, (rimDist / 26) * (rimDist / 26) * 4.8 + wave * Math.min(1, rimDist / 12));
}

/**
 * Helper to append a sculpted seated Buddha (`如來坐像`) into `{ gGold, gWood, gHalo }`.
 */
function appendSeatedBuddha({
  gGold,
  gHalo,
  x = 0,
  y = 0,
  z = 0,
  scale = 1.0,
  rotY = 0,
  withCrown = false,
}) {
  const s = scale;
  const parts = [];

  // Octagonal / lotus pedestal base
  const lotusBase = new THREE.CylinderGeometry(0.68 * s, 0.82 * s, 0.34 * s, 12);
  lotusBase.translate(0, 0.17 * s, 0);
  parts.push(lotusBase);

  const lotusWaist = new THREE.CylinderGeometry(0.48 * s, 0.52 * s, 0.22 * s, 10);
  lotusWaist.translate(0, 0.45 * s, 0);
  parts.push(lotusWaist);

  const lotusUpper = new THREE.CylinderGeometry(0.74 * s, 0.50 * s, 0.28 * s, 12);
  lotusUpper.translate(0, 0.70 * s, 0);
  parts.push(lotusUpper);

  // Crossed legs (padmāsana)
  const legs = new THREE.CylinderGeometry(0.58 * s, 0.66 * s, 0.26 * s, 10);
  legs.scale(1.18, 1.0, 0.82);
  legs.translate(0, 0.96 * s, 0.04 * s);
  parts.push(legs);

  // Meditative torso & broad shoulders
  const torso = new THREE.CylinderGeometry(0.36 * s, 0.44 * s, 0.74 * s, 10);
  torso.scale(1.15, 1.0, 0.78);
  torso.translate(0, 1.42 * s, 0);
  parts.push(torso);

  // Mudra hands in front of chest/lap
  const hands = new THREE.SphereGeometry(0.16 * s, 8, 6);
  hands.translate(0, 1.28 * s, 0.28 * s);
  parts.push(hands);

  // Head & Ushnisha
  const head = new THREE.SphereGeometry(0.24 * s, 10, 8);
  head.translate(0, 1.98 * s, 0.02 * s);
  parts.push(head);

  const ushnisha = new THREE.SphereGeometry(0.11 * s, 8, 6);
  ushnisha.translate(0, 2.22 * s, 0.01 * s);
  parts.push(ushnisha);

  if (withCrown) {
    // Five-Buddha宝冠 for Mahāvairocana (Dainichi Nyorai)
    const crown = new THREE.CylinderGeometry(0.26 * s, 0.22 * s, 0.22 * s, 8);
    crown.translate(0, 2.18 * s, 0.02 * s);
    parts.push(crown);
  }

  for (const p of parts) {
    if (rotY) p.rotateY(rotY);
    p.translate(x, y, z);
    gGold.push(p);
  }

  if (gHalo) {
    // Boat-shaped / circular aureole behind the Buddha (`光背`)
    const haloRing = new THREE.RingGeometry(0.45 * s, 0.92 * s, 18);
    haloRing.translate(0, 1.68 * s, -0.26 * s);
    if (rotY) haloRing.rotateY(rotY);
    haloRing.translate(x, y, z);
    gHalo.push(haloRing);
  }
}

/**
 * Helper to append a graceful standing/seated Bodhisattva (`菩薩像`) into `{ gGold, gHalo }`.
 */
function appendBodhisattva({
  gGold,
  gHalo,
  x = 0,
  y = 0,
  z = 0,
  scale = 1.0,
  rotY = 0,
  standing = true,
}) {
  const s = scale;
  const parts = [];

  // Lotus pedestal
  const base = new THREE.CylinderGeometry(0.52 * s, 0.62 * s, 0.32 * s, 10);
  base.translate(0, 0.16 * s, 0);
  parts.push(base);

  if (standing) {
    const skirt = new THREE.CylinderGeometry(0.26 * s, 0.34 * s, 0.86 * s, 10);
    skirt.translate(0, 0.75 * s, 0);
    parts.push(skirt);

    const torso = new THREE.CylinderGeometry(0.28 * s, 0.24 * s, 0.68 * s, 10);
    torso.translate(0, 1.48 * s, 0);
    parts.push(torso);

    const head = new THREE.SphereGeometry(0.19 * s, 10, 8);
    head.translate(0, 1.98 * s, 0);
    parts.push(head);

    const crown = new THREE.ConeGeometry(0.16 * s, 0.30 * s, 7);
    crown.translate(0, 2.24 * s, 0);
    parts.push(crown);
  } else {
    const legs = new THREE.CylinderGeometry(0.46 * s, 0.52 * s, 0.24 * s, 10);
    legs.translate(0, 0.44 * s, 0);
    parts.push(legs);

    const torso = new THREE.CylinderGeometry(0.28 * s, 0.32 * s, 0.64 * s, 10);
    torso.translate(0, 0.88 * s, 0);
    parts.push(torso);

    const head = new THREE.SphereGeometry(0.19 * s, 10, 8);
    head.translate(0, 1.36 * s, 0);
    parts.push(head);

    const crown = new THREE.ConeGeometry(0.15 * s, 0.28 * s, 7);
    crown.translate(0, 1.60 * s, 0);
    parts.push(crown);
  }

  for (const p of parts) {
    if (rotY) p.rotateY(rotY);
    p.translate(x, y, z);
    gGold.push(p);
  }

  if (gHalo) {
    const hY = standing ? 1.85 * s : 1.25 * s;
    const nimbus = new THREE.RingGeometry(0.32 * s, 0.68 * s, 16);
    nimbus.translate(0, hY, -0.22 * s);
    if (rotY) nimbus.rotateY(rotY);
    nimbus.translate(x, y, z);
    gHalo.push(nimbus);
  }
}

/**
 * Helper to append a wrathful Wisdom King (`明王像`) with Garuda flame mandorla (`迦樓羅焰光背`).
 */
function appendWisdomKing({
  gIndigo,
  gFlame,
  gGold,
  gWhite,
  x = 0,
  y = 0,
  z = 0,
  scale = 1.0,
  bullMount = false,
}) {
  const s = scale;

  if (bullMount && gWhite) {
    // Recumbent sacred white water-buffalo mount (`白牛座`) for Daiitoku Myōō (`大威德明王`)
    const bullBody = new THREE.BoxGeometry(1.15 * s, 0.46 * s, 0.68 * s);
    bullBody.translate(x, y + 0.26 * s, z);
    gWhite.push(bullBody);

    const bullHead = new THREE.BoxGeometry(0.38 * s, 0.36 * s, 0.42 * s);
    bullHead.translate(x, y + 0.42 * s, z + 0.42 * s);
    gWhite.push(bullHead);
  } else {
    // Craggy rock pedestal (`瑟瑟座 / 盤石座`)
    const rockBase = new THREE.DodecahedronGeometry(0.58 * s, 0);
    rockBase.scale(1.15, 0.55, 0.95);
    rockBase.translate(x, y + 0.28 * s, z);
    gIndigo.push(rockBase);
  }

  const baseH = 0.52 * s;
  const torso = new THREE.CylinderGeometry(0.34 * s, 0.42 * s, 0.78 * s, 9);
  torso.translate(x, y + baseH + 0.39 * s, z);
  gIndigo.push(torso);

  const head = new THREE.SphereGeometry(0.22 * s, 9, 7);
  head.translate(x, y + baseH + 0.94 * s, z);
  gIndigo.push(head);

  // Upright Kurikara vajra sword (`俱利伽羅劍`) in right hand
  const sword = new THREE.BoxGeometry(0.06 * s, 0.78 * s, 0.06 * s);
  sword.translate(x - 0.38 * s, y + baseH + 0.72 * s, z + 0.18 * s);
  gGold.push(sword);

  // Blazing crimson-orange Garuda Flame Halo (`迦樓羅焰光背`)
  const flameOuter = new THREE.ConeGeometry(0.88 * s, 2.05 * s, 7);
  flameOuter.scale(1.0, 1.0, 0.22);
  flameOuter.translate(x, y + baseH + 0.95 * s, z - 0.26 * s);
  gFlame.push(flameOuter);
}

/**
 * Helper to append a Protective Deva / Heavenly King (`天部・四天王像`).
 */
function appendDevaGuardian({
  gArmor,
  gGold,
  gWhite,
  x = 0,
  y = 0,
  z = 0,
  scale = 1.0,
  mountType = 'demon', // 'elephant' | 'geese' | 'demon'
}) {
  const s = scale;
  let standY = y + 0.38 * s;

  if (mountType === 'elephant' && gWhite) {
    // Sacred white elephant mount (`白象座`) for Taishakuten (`帝釋天`)
    const eleBody = new THREE.BoxGeometry(1.10 * s, 0.66 * s, 0.82 * s);
    eleBody.translate(x, y + 0.38 * s, z);
    gWhite.push(eleBody);

    const eleHead = new THREE.SphereGeometry(0.34 * s, 8, 6);
    eleHead.translate(x, y + 0.56 * s, z + 0.52 * s);
    gWhite.push(eleHead);

    const trunk = new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 0.46 * s, 6);
    trunk.rotateX(0.35);
    trunk.translate(x, y + 0.34 * s, z + 0.76 * s);
    gWhite.push(trunk);
    standY = y + 0.74 * s;
  } else if (mountType === 'geese' && gWhite) {
    // Lotus throne supported by four sacred white geese (`四鵝座`) for Bonten (`梵天`)
    const geeseBase = new THREE.CylinderGeometry(0.62 * s, 0.68 * s, 0.42 * s, 8);
    geeseBase.translate(x, y + 0.22 * s, z);
    gWhite.push(geeseBase);

    const lotus = new THREE.CylinderGeometry(0.56 * s, 0.44 * s, 0.26 * s, 10);
    lotus.translate(x, y + 0.54 * s, z);
    gGold.push(lotus);
    standY = y + 0.68 * s;
  } else {
    // Subdued邪鬼 rock pedestal for Four Heavenly Kings (`四天王`)
    const base = new THREE.BoxGeometry(0.78 * s, 0.36 * s, 0.68 * s);
    base.translate(x, y + 0.18 * s, z);
    gArmor.push(base);
  }

  // Armored torso & skirt (`甲冑`)
  const armorSkirt = new THREE.CylinderGeometry(0.28 * s, 0.38 * s, 0.66 * s, 8);
  armorSkirt.translate(x, standY + 0.33 * s, z);
  gArmor.push(armorSkirt);

  const chest = new THREE.CylinderGeometry(0.32 * s, 0.26 * s, 0.62 * s, 8);
  chest.translate(x, standY + 0.94 * s, z);
  gArmor.push(chest);

  const shoulderGuard = new THREE.BoxGeometry(0.76 * s, 0.18 * s, 0.36 * s);
  shoulderGuard.translate(x, standY + 1.16 * s, z);
  gGold.push(shoulderGuard);

  const head = new THREE.SphereGeometry(0.19 * s, 8, 6);
  head.translate(x, standY + 1.42 * s, z);
  gGold.push(head);

  // Tall halberd / spear (`戟 / 寶塔`)
  const spear = new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 1.85 * s, 6);
  spear.translate(x + 0.38 * s, standY + 0.95 * s, z + 0.16 * s);
  gGold.push(spear);
}

/**
 * Helper to append a traditional Japanese Stone Lantern (`石燈籠 / Tōrō`).
 */
function appendStoneLantern({ gStone, gGlow, x, y = 0, z, scale = 1.0 }) {
  const s = scale;
  const base = new THREE.CylinderGeometry(0.38 * s, 0.46 * s, 0.22 * s, 6);
  base.translate(x, y + 0.11 * s, z);
  gStone.push(base);

  const post = new THREE.CylinderGeometry(0.16 * s, 0.20 * s, 0.95 * s, 6);
  post.translate(x, y + 0.68 * s, z);
  gStone.push(post);

  const platform = new THREE.CylinderGeometry(0.36 * s, 0.28 * s, 0.16 * s, 6);
  platform.translate(x, y + 1.22 * s, z);
  gStone.push(platform);

  // Glowing paper-screen firebox (`火袋`)
  const firebox = new THREE.CylinderGeometry(0.22 * s, 0.22 * s, 0.34 * s, 6);
  firebox.translate(x, y + 1.46 * s, z);
  gGlow.push(firebox);

  // Hexagonal stone umbrella roof (`笠`) & finial (`寶珠`)
  const roof = new THREE.ConeGeometry(0.54 * s, 0.32 * s, 6);
  roof.translate(x, y + 1.78 * s, z);
  gStone.push(roof);

  const jewel = new THREE.SphereGeometry(0.10 * s, 6, 5);
  jewel.translate(x, y + 1.98 * s, z);
  gStone.push(jewel);
}

export function createMap(ctx, mapDef = TOJI_MAP) {
  const { scene, state, bus } = ctx || {};
  const origin = mapDef?.origin || TOJI_MAP.origin;
  const ox = origin.x; // 7500
  const oz = origin.z; // 0

  const getHeight = (wx, wz) => tojiHeight(wx, wz, origin);

  const zoneGroup = ctx?.zoneGroups?.toji || new THREE.Group();
  zoneGroup.name = 'Zone_toji';
  if (!ctx?.zoneGroups?.toji && scene) {
    scene.add(zoneGroup);
  }

  const root = new THREE.Group();
  root.name = 'TojiGaranMap';
  root.position.set(ox, 0, oz);
  zoneGroup.add(root);

  const colliders = [];
  const interactables = [];
  const disposables = [];

  function registerCollider(shape) {
    if (shape.type === 'box') {
      const { cx, cz, hx, hz } = shape;
      shape = { type: 'box', minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz };
    }
    const col = { ...shape, zone: 'toji' };
    colliders.push(col);
    pushCollider(ctx, 'toji', shape);
  }

  function registerInteractable(item) {
    interactables.push(item);
    if (Array.isArray(ctx?.interactables)) {
      ctx.interactables.push(item);
    }
  }

  addJapanRouteGate(root, -23, getHeight(ox - 23, oz + 70), 70);
  for (const x of [-25.05, -20.95]) {
    registerCollider({ type: 'circle', x: ox + x, z: oz + 70, r: 0.38 });
  }

  // ---------------------------------------------------------------- 1. Terrain & Distant Kyoto Mountains
  const gravelCol = new THREE.Color(0xcbc4b6); // White-grey raked Shirakawa gravel
  const sandoCol = new THREE.Color(0x9b9589);  // Heian stone paving axis
  const mossCol = new THREE.Color(0x556b47);   // Temple garden moss & lawn
  const pondBedCol = new THREE.Color(0x283e3b);// Hyōtan-ike pond bed
  const foothillCol = new THREE.Color(0x4a5d43);
  const tmpCol = new THREE.Color();

  const { mesh: terrainMesh } = createHeightfieldTerrain(ctx, {
    origin,
    size: 220,
    segments: 88,
    heightFn: getHeight,
    colorFn(wx, wz, y, lx, lz) {
      if (y < -0.06) return pondBedCol;
      // Central axial Sandō stone avenue (`x = -4.2..4.2`) & eastern branch to Pagoda
      if (
        (Math.abs(lx) < 4.2 && lz >= -78 && lz <= 84) ||
        (Math.abs(lz - 26) < 2.8 && lx >= 0 && lx <= 38)
      ) {
        return sandoCol;
      }
      // Raked white gravel (`白川砂`) around Kondō, Kōdō, and Gojū-no-tō precincts
      if (
        (Math.abs(lx) < 22 && lz > -52 && lz < 32) ||
        (lx > 18 && lx < 52 && lz > 0 && lz < 36)
      ) {
        return gravelCol;
      }
      // Garden moss around Hyōtan-ike Pond (`lx > 14, lz < 2`)
      if (lx > 14 && lx < 60 && lz > -38 && lz < 4) {
        return mossCol;
      }
      if (Math.abs(lx) > 68 || Math.abs(lz) > 82) {
        return foothillCol;
      }
      const n = Math.sin(lx * 0.12) * Math.cos(lz * 0.12) * 0.5 + 0.5;
      return tmpCol.lerpColors(gravelCol, mossCol, 0.35 + n * 0.35);
    },
  });
  // `terrainMesh` is already positioned at `(origin.x, 0, origin.z)` by `createHeightfieldTerrain`
  zoneGroup.add(terrainMesh);

  const rimMountainMesh = addRimMountains(ctx, zoneGroup, {
    origin,
    innerR: 118,
    outerR: 176,
    count: 22,
    heightRange: [26, 52],
    style: 'japanese',
  });

  // ---------------------------------------------------------------- 2. Shared Materials (Strictly ZERO PointLights)
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x8d877d,
    roughness: 0.88,
    metalness: 0.05,
  });
  const sandoStoneMat = new THREE.MeshStandardMaterial({
    color: 0xa7a095,
    roughness: 0.84,
    metalness: 0.06,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3b261a,
    roughness: 0.78,
    metalness: 0.06,
  });
  const vermilionMat = new THREE.MeshStandardMaterial({
    color: 0xa62c22,
    roughness: 0.68,
    metalness: 0.08,
  });
  const plasterMat = new THREE.MeshStandardMaterial({
    color: 0xf1ece1,
    roughness: 0.88,
    metalness: 0.02,
  });
  const roofTileMat = new THREE.MeshStandardMaterial({
    color: 0x2c3034,
    roughness: 0.64,
    metalness: 0.22,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x5c7a67,
    roughness: 0.42,
    metalness: 0.72,
    emissive: 0x13261b,
    emissiveIntensity: 0.25,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.24,
    metalness: 0.88,
    emissive: 0xb45309,
    emissiveIntensity: 0.42,
  });
  const haloGoldMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.76,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const garudaFlameMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.35,
    metalness: 0.15,
    emissive: 0xdc2626,
    emissiveIntensity: 1.25,
  });
  const wrathfulIndigoMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    roughness: 0.55,
    metalness: 0.28,
    emissive: 0x0f172a,
    emissiveIntensity: 0.35,
  });
  const devaArmorMat = new THREE.MeshStandardMaterial({
    color: 0x365314,
    roughness: 0.58,
    metalness: 0.32,
  });
  const greenLatticeMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a43,
    roughness: 0.74,
    metalness: 0.08,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.3,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.35,
  });

  disposables.push(
    stoneMat,
    sandoStoneMat,
    darkWoodMat,
    vermilionMat,
    plasterMat,
    roofTileMat,
    bronzeMat,
    goldMat,
    haloGoldMat,
    garudaFlameMat,
    wrathfulIndigoMat,
    devaArmorMat,
    greenLatticeMat,
    lanternGlowMat
  );

  // Geometry accumulation buckets for merged static architecture
  const gStone = [];
  const gSando = [];
  const gDarkWood = [];
  const gVermilion = [];
  const gPlaster = [];
  const gRoofTile = [];
  const gBronze = [];
  const gGold = [];
  const gHalo = [];
  const gFlame = [];
  const gIndigo = [];
  const gArmor = [];
  const gGreenLattice = [];
  const gLanternGlow = [];

  // ---------------------------------------------------------------- 3. Axial Stone Sandō Walkways & Imperial 5-Striped Walls (`五本線筋塀`)
  // Main South-to-North stone walkway (`z = -78..82`)
  const mainWalkway = new THREE.BoxGeometry(6.4, 0.08, 158);
  mainWalkway.translate(0, 0.04, 2);
  gSando.push(mainWalkway);

  // Branch walkway from Kondō plaza east to Five-Story Pagoda (`x = 3..36, z = 25`)
  const pagodaWalkway = new THREE.BoxGeometry(33, 0.08, 4.2);
  pagodaWalkway.translate(19.5, 0.04, 25);
  gSando.push(pagodaWalkway);

  // Branch walkway from Pagoda north to Hyōtan-ike Pond (`x = 36, z = -4..8`)
  const pondWalkway = new THREE.BoxGeometry(3.4, 0.08, 14);
  pondWalkway.translate(36, 0.04, 2);
  gSando.push(pondWalkway);

  // Enclosing Imperial 5-Striped Earthen Walls (`築地塀`, `x = ±66`, `z = ±80`)
  function addImperialWallSegment(x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const cx = (x0 + x1) * 0.5;
    const cz = (z0 + z1) * 0.5;
    const ang = Math.atan2(dx, dz);

    const plinth = new THREE.BoxGeometry(0.95, 0.45, len);
    plinth.translate(0, 0.225, 0);
    plinth.rotateY(ang);
    plinth.translate(cx, 0, cz);
    gStone.push(plinth);

    const wallBody = new THREE.BoxGeometry(0.72, 2.35, len);
    wallBody.translate(0, 1.62, 0);
    wallBody.rotateY(ang);
    wallBody.translate(cx, 0, cz);
    gPlaster.push(wallBody);

    // 5 horizontal imperial stripes (`五本線定規筋`) embedded along both faces
    for (let s = 0; s < 5; s++) {
      const sy = 0.88 + s * 0.36;
      const stripe = new THREE.BoxGeometry(0.78, 0.05, len);
      stripe.translate(0, sy, 0);
      stripe.rotateY(ang);
      stripe.translate(cx, 0, cz);
      gSando.push(stripe);
    }

    const roofCap = new THREE.BoxGeometry(1.32, 0.34, len + 0.4);
    roofCap.translate(0, 2.94, 0);
    roofCap.rotateY(ang);
    roofCap.translate(cx, 0, cz);
    gRoofTile.push(roofCap);

    // Register box collider for straight axis-aligned segments
    if (Math.abs(dx) >= Math.abs(dz)) {
      registerCollider({
        type: 'box',
        cx: ox + cx,
        cz: oz + cz,
        hx: len * 0.5,
        hz: 0.65,
      });
    } else {
      registerCollider({
        type: 'box',
        cx: ox + cx,
        cz: oz + cz,
        hx: 0.65,
        hz: len * 0.5,
      });
    }
  }

  // South wall (`z = 80`) split around Nandaimon (`x = -66..-9` and `9..66`)
  addImperialWallSegment(-66, 80, -9, 80);
  addImperialWallSegment(9, 80, 66, 80);
  // North wall (`z = -80`) split around North Gate (`x = -66..-6` and `6..66`)
  addImperialWallSegment(-66, -80, -6, -80);
  addImperialWallSegment(6, -80, 66, -80);
  // West & East perimeter walls (`x = -66` and `x = 66`, `z = -80..80`)
  addImperialWallSegment(-66, -80, -66, 80);
  addImperialWallSegment(66, -80, 66, 80);

  // ---------------------------------------------------------------- 4. 南大門 (Nandaimon — Great South Gate) at `local (0, 80)`
  {
    const gx = 0;
    const gz = 80;
    // Split stone foundation blocks leaving central portal (`|x| < 3.4`) smoothly walkable
    for (const side of [-1, 1]) {
      const sidePlinth = new THREE.BoxGeometry(6.8, 0.48, 6.8);
      sidePlinth.translate(gx + side * 5.8, 0.24, gz);
      gStone.push(sidePlinth);
    }
    const threshold = new THREE.BoxGeometry(5.0, 0.08, 6.8);
    threshold.translate(gx, 0.04, gz);
    gStone.push(threshold);

    // 6 pairs of monumental dark-timber gate pillars (`五間三戶`)
    const pillarXs = [-7.8, -4.8, -2.2, 2.2, 4.8, 7.8];
    for (const px of pillarXs) {
      for (const pz of [-2.4, 2.4]) {
        const col = new THREE.CylinderGeometry(0.32, 0.36, 5.8, 10);
        col.translate(gx + px, 3.1, gz + pz);
        gDarkWood.push(col);
      }
    }
    // Outer bay walls (`白漆喰壁` + `連子窓`) at `|x| = 4.8..7.8`
    for (const side of [-1, 1]) {
      const bayWall = new THREE.BoxGeometry(2.8, 4.8, 0.36);
      bayWall.translate(gx + side * 6.3, 2.8, gz);
      gPlaster.push(bayWall);

      const lattice = new THREE.BoxGeometry(1.8, 1.8, 0.44);
      lattice.translate(gx + side * 6.3, 3.1, gz);
      gGreenLattice.push(lattice);

      // Collider for side bays of Nandaimon (`|x| > 3.6`), leaving central portal open
      registerCollider({
        type: 'box',
        cx: ox + gx + side * 5.8,
        cz: oz + gz,
        hx: 2.4,
        hz: 2.8,
      });
    }

    // Lintel beams & bracket complex (`斗栱`)
    const lintel = new THREE.BoxGeometry(16.8, 0.55, 5.4);
    lintel.translate(gx, 6.1, gz);
    gDarkWood.push(lintel);

    const bracketBand = new THREE.BoxGeometry(17.4, 0.48, 5.8);
    bracketBand.translate(gx, 6.6, gz);
    gVermilion.push(bracketBand);

    // Sweeping `切妻造本瓦葺` tiled roof with upturned eaves & golden `鴟尾` ridge finials
    const mainRoof = new THREE.BoxGeometry(19.6, 0.65, 8.2);
    mainRoof.translate(gx, 7.2, gz);
    gRoofTile.push(mainRoof);

    const upperRidge = new THREE.CylinderGeometry(1.8, 4.4, 19.2, 4);
    upperRidge.rotateZ(Math.PI / 2);
    upperRidge.rotateX(Math.PI / 4);
    upperRidge.scale(1.0, 0.52, 1.0);
    upperRidge.translate(gx, 8.35, gz);
    gRoofTile.push(upperRidge);

    for (const side of [-1, 1]) {
      const shibi = new THREE.BoxGeometry(0.45, 0.95, 0.55);
      shibi.translate(gx + side * 9.3, 9.35, gz);
      gGold.push(shibi);
    }

    // Golden temple plaque (`教王護國寺`)
    const plaque = new THREE.BoxGeometry(2.6, 0.9, 0.16);
    plaque.translate(gx, 6.25, gz - 2.75);
    gGold.push(plaque);
  }

  // North Gate (`慶賀門 / 高野山參道門`) at `local (0, -78)`
  {
    const ngZ = -78;
    for (const side of [-1, 1]) {
      const col = new THREE.CylinderGeometry(0.28, 0.32, 4.8, 10);
      col.translate(side * 3.2, 2.4, ngZ);
      gVermilion.push(col);
      registerCollider({
        type: 'circle',
        x: ox + side * 3.2,
        z: oz + ngZ,
        r: 0.55,
      });
    }
    const ngBeam = new THREE.BoxGeometry(7.8, 0.45, 1.2);
    ngBeam.translate(0, 4.9, ngZ);
    gVermilion.push(ngBeam);

    const ngRoof = new THREE.BoxGeometry(9.2, 0.55, 3.2);
    ngRoof.translate(0, 5.45, ngZ);
    gRoofTile.push(ngRoof);

    const ngRidge = new THREE.BoxGeometry(8.4, 0.28, 0.45);
    ngRidge.translate(0, 5.85, ngZ);
    gGold.push(ngRidge);
  }

  // Merge perimeter walls, sandō paths, Nandaimon, and North Gate into permanent `precinctGroup`
  const precinctGroup = new THREE.Group();
  precinctGroup.name = 'TojiPrecinctWallsAndGates';
  root.add(precinctGroup);
  const precinctBuckets = [
    [gStone, stoneMat, true, true, 'TojiPrecinctStone'],
    [gSando, sandoStoneMat, false, true, 'TojiPrecinctSando'],
    [gDarkWood, darkWoodMat, true, true, 'TojiPrecinctDarkWood'],
    [gVermilion, vermilionMat, true, true, 'TojiPrecinctVermilion'],
    [gPlaster, plasterMat, true, true, 'TojiPrecinctPlaster'],
    [gRoofTile, roofTileMat, true, true, 'TojiPrecinctRoofTile'],
    [gGold, goldMat, true, false, 'TojiPrecinctGold'],
    [gGreenLattice, greenLatticeMat, false, true, 'TojiPrecinctGreenLattice'],
  ];
  for (const [geos, mat, cast, receive, name] of precinctBuckets) {
    if (!geos.length) continue;
    const mergedGeo = mergeAndDispose([...geos]);
    geos.length = 0;
    if (!mergedGeo) continue;
    disposables.push(mergedGeo);
    const mesh = new THREE.Mesh(mergedGeo, mat);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    precinctGroup.add(mesh);
  }

  // ---------------------------------------------------------------- 5. Landmark 1: 東寺五重塔 (Tō-ji Gojū-no-tō — Five-Story Pagoda) at `local (36, 18)`
  const pagodaX = 36;
  const pagodaZ = 18;
  const pagodaFinialJewel = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 14, 12),
    goldMat
  );
  pagodaFinialJewel.position.set(pagodaX, 34.4, pagodaZ);
  root.add(pagodaFinialJewel);

  const pagodaJewelHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 1.25, 24),
    haloGoldMat
  );
  pagodaJewelHalo.position.set(pagodaX, 34.4, pagodaZ);
  root.add(pagodaJewelHalo);

  {
    // 5.1 Raised Stone Platform (`石造基壇`, `12.5m × 12.5m`, height `1.4m`)
    const kidan = new THREE.BoxGeometry(12.5, 1.4, 12.5);
    kidan.translate(pagodaX, 0.7, pagodaZ);
    gStone.push(kidan);

    // Stone steps (`石階`) on all 4 cardinal sides
    for (let st = 0; st < 4; st++) {
      const stepH = 0.35;
      const stepY = (st + 0.5) * stepH;
      const offset = 6.25 + (3.5 - st) * 0.42;
      // North/South steps
      for (const sz of [-1, 1]) {
        const sGeo = new THREE.BoxGeometry(3.2, stepH, 0.44);
        sGeo.translate(pagodaX, stepY, pagodaZ + sz * offset);
        gStone.push(sGeo);
      }
      // East/West steps
      for (const sx of [-1, 1]) {
        const sGeo = new THREE.BoxGeometry(0.44, stepH, 3.2);
        sGeo.translate(pagodaX + sx * offset, stepY, pagodaZ);
        gStone.push(sGeo);
      }
    }

    // 5.2 First-Floor Interior Esoteric Mandala (`初層內陣・心柱大日如來與四佛八菩薩`)
    // Sumeru altar dais (`須彌壇`, `4.4m × 4.4m`, `y = 1.4m..2.2m`)
    const sumeruDais = new THREE.BoxGeometry(4.4, 0.8, 4.4);
    sumeruDais.translate(pagodaX, 1.8, pagodaZ);
    gGold.push(sumeruDais);

    // Central Heart Pillar (`心柱 / Shinbashira`) rising through the pagoda as Mahāvairocana (`大日如來`)
    const shinbashira = new THREE.CylinderGeometry(0.42, 0.48, 25.2, 16);
    shinbashira.translate(pagodaX, 14.0, pagodaZ);
    gGold.push(shinbashira);

    // Four Inner Esoteric Pillars (`四天柱`) framing the Sumeru dais
    for (const sx of [-1.8, 1.8]) {
      for (const sz of [-1.8, 1.8]) {
        const innerCol = new THREE.CylinderGeometry(0.20, 0.22, 4.4, 10);
        innerCol.translate(pagodaX + sx, 3.6, pagodaZ + sz);
        gVermilion.push(innerCol);
      }
    }

    // Four Diamond-Realm Buddhas (`金剛界四佛：東阿閦、南寶生、西阿彌陀、北不空成就`) around the Heart Pillar
    const pagodaFourBuddhas = [
      { id: 'ashuku', dx: 1.25, dz: 0, rotY: Math.PI / 2 },
      { id: 'hosho', dx: 0, dz: 1.25, rotY: 0 },
      { id: 'amida', dx: -1.25, dz: 0, rotY: -Math.PI / 2 },
      { id: 'fukujoju', dx: 0, dz: -1.25, rotY: Math.PI },
    ];
    for (const b of pagodaFourBuddhas) {
      appendSeatedBuddha({
        gGold,
        gHalo,
        x: pagodaX + b.dx,
        y: 2.2,
        z: pagodaZ + b.dz,
        scale: 0.62,
        rotY: b.rotY,
      });
    }

    // Eight Great Bodhisattvas (`八大菩薩`) flanking the 4 Buddhas on the Sumeru dais
    const pagodaEightBodhisattvas = [
      [1.35, 0.85, Math.PI / 2],
      [1.35, -0.85, Math.PI / 2],
      [0.85, 1.35, 0],
      [-0.85, 1.35, 0],
      [-1.35, 0.85, -Math.PI / 2],
      [-1.35, -0.85, -Math.PI / 2],
      [0.85, -1.35, Math.PI],
      [-0.85, -1.35, Math.PI],
    ];
    for (const [bx, bz, rotY] of pagodaEightBodhisattvas) {
      appendBodhisattva({
        gGold,
        gHalo: null,
        x: pagodaX + bx,
        y: 2.2,
        z: pagodaZ + bz,
        scale: 0.48,
        rotY,
        standing: true,
      });
    }

    // 5.3 Ground Story Outer Columns, Open Portals, Stone Tamagaki Fence (`石玉垣`) & Dark-Timber `桟唐戸・連子窓`
    // Square carved stone fence (`石玉垣`, `13.6m × 13.6m`) around the ground podium (open at the 4 cardinal stairs)
    for (const side of [-1, 1]) {
      for (const segOff of [-4.2, 4.2]) {
        const fenceNS = new THREE.BoxGeometry(4.4, 0.72, 0.22);
        fenceNS.translate(pagodaX + segOff, 0.36, pagodaZ + side * 6.8);
        gStone.push(fenceNS);
        const fenceEW = new THREE.BoxGeometry(0.22, 0.72, 4.4);
        fenceEW.translate(pagodaX + side * 6.8, 0.36, pagodaZ + segOff);
        gStone.push(fenceEW);
      }
      for (const postOff of [-6.8, -2.0, 2.0, 6.8]) {
        const postNS = new THREE.BoxGeometry(0.28, 0.96, 0.28);
        postNS.translate(pagodaX + postOff, 0.48, pagodaZ + side * 6.8);
        gStone.push(postNS);
        const postEW = new THREE.BoxGeometry(0.28, 0.96, 0.28);
        postEW.translate(pagodaX + side * 6.8, 0.48, pagodaZ + postOff);
        gStone.push(postEW);
      }
    }

    const groundWallW = 7.8;
    const halfW = groundWallW * 0.5;
    // 12 outer columns on the ground story
    for (const c of [-halfW, -1.35, 1.35, halfW]) {
      for (const side of [-halfW, halfW]) {
        const colNS = new THREE.CylinderGeometry(0.24, 0.27, 4.4, 10);
        colNS.translate(pagodaX + c, 3.6, pagodaZ + side);
        gDarkWood.push(colNS);

        if (Math.abs(c) < halfW) {
          const colEW = new THREE.CylinderGeometry(0.24, 0.27, 4.4, 10);
          colEW.translate(pagodaX + side, 3.6, pagodaZ + c);
          gDarkWood.push(colEW);
        }
      }
    }
    // Dark weathered timber corner bays (`黒茶色桟唐戸・連子窓`) + white inter-bracket frieze (`白漆喰小壁`), leaving central 2.7m portal open!
    for (const side of [-1, 1]) {
      for (const corner of [-2.6, 2.6]) {
        const panelNS = new THREE.BoxGeometry(2.4, 3.5, 0.28);
        panelNS.translate(pagodaX + corner, 3.25, pagodaZ + side * halfW);
        gDarkWood.push(panelNS);

        const latticeNS = new THREE.BoxGeometry(1.5, 1.6, 0.34);
        latticeNS.translate(pagodaX + corner, 3.45, pagodaZ + side * halfW);
        gGreenLattice.push(latticeNS);

        const panelEW = new THREE.BoxGeometry(0.28, 3.5, 2.4);
        panelEW.translate(pagodaX + side * halfW, 3.25, pagodaZ + corner);
        gDarkWood.push(panelEW);

        const latticeEW = new THREE.BoxGeometry(0.34, 1.6, 1.5);
        latticeEW.translate(pagodaX + side * halfW, 3.45, pagodaZ + corner);
        gGreenLattice.push(latticeEW);
      }
    }
    // Ground-story white plaster inter-bracket soffit frieze (`初層白漆喰小壁`)
    const groundKokabe = new THREE.BoxGeometry(groundWallW + 0.16, 0.46, groundWallW + 0.16);
    groundKokabe.translate(pagodaX, 5.35, pagodaZ);
    gPlaster.push(groundKokabe);

    // 5.4 Five Progressively Tapering Stories (`初層` to `五層`, `y = 1.4m..26.0m`)
    const tierBaseYs = [1.4, 6.4, 11.2, 15.8, 20.2];
    const tierHeights = [4.5, 4.2, 4.0, 3.8, 3.6];
    const tierCoreWidths = [7.8, 7.1, 6.4, 5.7, 5.0];
    const tierRoofWidths = [13.2, 12.0, 10.9, 9.8, 8.8];

    for (let t = 0; t < 5; t++) {
      const y0 = tierBaseYs[t];
      const h = tierHeights[t];
      const coreW = tierCoreWidths[t];
      const roofW = tierRoofWidths[t];
      const roofY = y0 + h;

      if (t > 0) {
        // Upper story core shaft: dark weathered timber (`黒茶色の素木造 3間軸部`) + white inter-bracket frieze (`白漆喰小壁`) at top
        const coreBox = new THREE.BoxGeometry(coreW, h - 0.45, coreW);
        coreBox.translate(pagodaX, y0 + (h - 0.45) * 0.5, pagodaZ);
        gDarkWood.push(coreBox);

        const kokabeFrieze = new THREE.BoxGeometry(coreW + 0.14, 0.44, coreW + 0.14);
        kokabeFrieze.translate(pagodaX, roofY - 0.24, pagodaZ);
        gPlaster.push(kokabeFrieze);

        // Corner & bay timber pilasters + horizontal tie beams (`頭貫・長押`)
        const hw = coreW * 0.5 + 0.05;
        for (const pOff of [-hw, -hw * 0.35, hw * 0.35, hw]) {
          for (const s of [-1, 1]) {
            const p1 = new THREE.BoxGeometry(0.22, h, 0.22);
            p1.translate(pagodaX + pOff, y0 + h * 0.5, pagodaZ + s * hw);
            gDarkWood.push(p1);
          }
        }
        // Overhanging 3-rail wooden balcony (`組高欄 / 縁`) with rails crossing past the corners
        const railDeck = new THREE.BoxGeometry(coreW + 1.4, 0.16, coreW + 1.4);
        railDeck.translate(pagodaX, y0 + 0.12, pagodaZ);
        gDarkWood.push(railDeck);

        for (const rH of [0.34, 0.52, 0.72]) {
          const railBar = new THREE.BoxGeometry(coreW + 1.85, 0.08, coreW + 1.85);
          railBar.translate(pagodaX, y0 + rH, pagodaZ);
          gVermilion.push(railBar);
        }
      }

      // Multi-stepped bracket complex (`三手先斗栱 / 組物`) under each roof
      const kumimono = new THREE.BoxGeometry(coreW + 1.2, 0.52, coreW + 1.2);
      kumimono.translate(pagodaX, roofY - 0.22, pagodaZ);
      gDarkWood.push(kumimono);

      // White-painted double-tier rafter tips ring (`二軒繁垂木・木口白塗`) under each roof eave
      const whiteRafterRing = new THREE.BoxGeometry(roofW - 0.25, 0.12, roofW - 0.25);
      whiteRafterRing.translate(pagodaX, roofY + 0.02, pagodaZ);
      gPlaster.push(whiteRafterRing);

      // Sweeping dark-tiled pagoda roof (`本瓦葺`) + pyramidal slope cap + upturned corner eaves (`軒反り`)
      const eaveSlab = new THREE.BoxGeometry(roofW, 0.34, roofW);
      eaveSlab.translate(pagodaX, roofY + 0.20, pagodaZ);
      gRoofTile.push(eaveSlab);

      const roofSlope = new THREE.ConeGeometry(roofW * 0.68, 1.38, 4);
      roofSlope.rotateY(Math.PI / 4);
      roofSlope.translate(pagodaX, roofY + 0.94, pagodaZ);
      gRoofTile.push(roofSlope);

      // 4 upturned corner eaves, stepped diagonal hip ridges (`隅棟`), `鬼瓦`, & hanging bronze wind bells (`風鐸`)
      const cornerR = roofW * 0.5;
      for (const cx of [-1, 1]) {
        for (const cz of [-1, 1]) {
          const eaveTip = new THREE.BoxGeometry(0.92, 0.24, 0.92);
          eaveTip.rotateZ(-cx * 0.24);
          eaveTip.rotateX(cz * 0.24);
          eaveTip.translate(pagodaX + cx * cornerR, roofY + 0.40, pagodaZ + cz * cornerR);
          gRoofTile.push(eaveTip);

          // Stepped diagonal hip ridge (`隅棟`) & demon-tile finial (`鬼瓦`)
          const hipRidge = new THREE.BoxGeometry(0.28, 0.26, roofW * 0.36);
          hipRidge.rotateY(cx * cz > 0 ? Math.PI / 4 : -Math.PI / 4);
          hipRidge.translate(
            pagodaX + cx * cornerR * 0.68,
            roofY + 0.72,
            pagodaZ + cz * cornerR * 0.68
          );
          gRoofTile.push(hipRidge);

          const onigawara = new THREE.BoxGeometry(0.36, 0.42, 0.36);
          onigawara.translate(
            pagodaX + cx * (cornerR + 0.12),
            roofY + 0.58,
            pagodaZ + cz * (cornerR + 0.12)
          );
          gRoofTile.push(onigawara);

          // Hanging bronze wind bell (`風鐸`)
          const bell = new THREE.ConeGeometry(0.15, 0.46, 6);
          bell.translate(
            pagodaX + cx * (cornerR - 0.15),
            roofY - 0.16,
            pagodaZ + cz * (cornerR - 0.15)
          );
          gBronze.push(bell);
        }
      }
    }

    // 4 Continuous Vertical Corner Wind-Bell Chains (`隅鎖・風鐸鎖`) linking all 5 roof corners
    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const cornerChain = new THREE.CylinderGeometry(0.03, 0.03, 19.6, 6);
        cornerChain.rotateZ(cx * 0.11);
        cornerChain.rotateX(-cz * 0.11);
        cornerChain.translate(pagodaX + cx * 5.3, 15.6, pagodaZ + cz * 5.3);
        gBronze.push(cornerChain);
      }
    }

    // 5.5 Towering Bronze Finial (`相輪 / Sōrin`, `y = 25.0m..35.0m`)
    const sorinBaseY = 25.0;
    // Square base (`露盤`) & inverted bowl (`覆鉢`) & lotus petals (`受花`)
    const roban = new THREE.BoxGeometry(1.9, 0.48, 1.9);
    roban.translate(pagodaX, sorinBaseY + 0.24, pagodaZ);
    gBronze.push(roban);

    const fukubachi = new THREE.SphereGeometry(0.78, 12, 8, 0, TWO_PI, 0, Math.PI * 0.55);
    fukubachi.translate(pagodaX, sorinBaseY + 0.48, pagodaZ);
    gBronze.push(fukubachi);

    const ukebana = new THREE.CylinderGeometry(0.72, 0.48, 0.35, 12);
    ukebana.translate(pagodaX, sorinBaseY + 1.05, pagodaZ);
    gGold.push(ukebana);

    // Central bronze spire shaft (`擦管`)
    const spireShaft = new THREE.CylinderGeometry(0.18, 0.26, 8.8, 12);
    spireShaft.translate(pagodaX, sorinBaseY + 5.2, pagodaZ);
    gBronze.push(spireShaft);

    // 9 Stacked Bronze Rings (`九輪`)
    for (let r = 0; r < 9; r++) {
      const ringRadius = 0.68 - r * 0.022;
      const ring = new THREE.TorusGeometry(ringRadius, 0.075, 8, 18);
      ring.rotateX(Math.PI / 2);
      ring.translate(pagodaX, sorinBaseY + 1.55 + r * 0.56, pagodaZ);
      gGold.push(ring);
    }

    // Flame-carved openwork bronze filigree panels (`水煙`) & Dragon Wheel (`龍車`)
    for (const rot of [0, Math.PI / 2]) {
      const suien = new THREE.BoxGeometry(1.45, 1.65, 0.08);
      suien.rotateY(rot);
      suien.translate(pagodaX, sorinBaseY + 7.45, pagodaZ);
      gBronze.push(suien);
    }
    const ryusha = new THREE.SphereGeometry(0.32, 10, 8);
    ryusha.translate(pagodaX, sorinBaseY + 8.65, pagodaZ);
    gBronze.push(ryusha);

    // Pagoda collider (`12.2m × 12.2m` stone platform perimeter)
    registerCollider({
      type: 'box',
      cx: ox + pagodaX,
      cz: oz + pagodaZ,
      hx: 5.8,
      hz: 5.8,
    });
  }

  // ---------------------------------------------------------------- 6. Landmark 2: 東寺金堂 (Kondō — Main Golden Hall) at `local (0, 8)`
  const kondoX = 0;
  const kondoZ = 8;
  {
    // 6.1 Two-tiered stone platform (`二重石積基壇`, `26m × 16m`, height `1.5m`)
    const lowerPlinth = new THREE.BoxGeometry(28.4, 0.72, 18.4);
    lowerPlinth.translate(kondoX, 0.36, kondoZ);
    gStone.push(lowerPlinth);

    const upperPlinth = new THREE.BoxGeometry(26.4, 0.78, 16.4);
    upperPlinth.translate(kondoX, 1.11, kondoZ);
    gStone.push(upperPlinth);

    // Wide southern viewing steps (`石階`) at `z = 16.2..18.6`
    for (let st = 0; st < 5; st++) {
      const step = new THREE.BoxGeometry(7.6, 0.30, 0.48);
      step.translate(kondoX, (st + 0.5) * 0.30, kondoZ + 8.2 + (4 - st) * 0.45);
      gStone.push(step);
    }

    const floorY = 1.5;

    // 6.2 Exterior Columns, Walls, Double Roof (`重層入母屋造`), and Front `切り上げ` Stepped Central Eave
    // Back wall (`z = kondoZ - 7.2`) and East/West side walls (`x = ±12.2`)
    const backWall = new THREE.BoxGeometry(24.4, 5.4, 0.45);
    backWall.translate(kondoX, floorY + 2.7, kondoZ - 7.2);
    gDarkWood.push(backWall);

    for (const side of [-1, 1]) {
      const sideWall = new THREE.BoxGeometry(0.45, 5.4, 14.4);
      sideWall.translate(kondoX + side * 12.2, floorY + 2.7, kondoZ);
      gDarkWood.push(sideWall);

      // Front side walls (`|x| = 4.6..12.2`): dark unpainted timber lower wall + white plaster upper frieze, leaving central 9.2m portal open!
      const frontSideWall = new THREE.BoxGeometry(7.6, 4.8, 0.42);
      frontSideWall.translate(kondoX + side * 8.4, floorY + 2.4, kondoZ + 7.2);
      gDarkWood.push(frontSideWall);

      const frontSideFrieze = new THREE.BoxGeometry(7.6, 0.65, 0.44);
      frontSideFrieze.translate(kondoX + side * 8.4, floorY + 5.1, kondoZ + 7.2);
      gPlaster.push(frontSideFrieze);

      const frontLattice = new THREE.BoxGeometry(4.6, 2.2, 0.48);
      frontLattice.translate(kondoX + side * 8.4, floorY + 3.0, kondoZ + 7.2);
      gGreenLattice.push(frontLattice);
    }

    // Five-colored Buddhist curtain (`五色幕 Goshikimaku`) hanging across the front eaves
    const goshikiBuckets = [gGreenLattice, gGold, gVermilion, gPlaster, gIndigo];
    for (let sIdx = 0; sIdx < 15; sIdx++) {
      const stripeX = kondoX - 10.5 + sIdx * 1.5;
      if (Math.abs(stripeX - kondoX) < 3.6) continue; // Keep central Yakushi vista clear
      const stripe = new THREE.BoxGeometry(1.42, 0.92, 0.08);
      stripe.translate(stripeX, floorY + 4.95, kondoZ + 7.45);
      goshikiBuckets[sIdx % 5].push(stripe);
    }

    // Perimeter heavy dark-timber columns (`7 bays × 5 bays`)
    for (const px of [-12.2, -8.2, -4.4, 0, 4.4, 8.2, 12.2]) {
      for (const pz of [-7.2, 7.2]) {
        if (pz > 0 && px === 0) continue; // Keep center front bay completely unobstructed for viewing Yakushi
        const col = new THREE.CylinderGeometry(0.34, 0.38, 5.6, 10);
        col.translate(kondoX + px, floorY + 2.8, kondoZ + pz);
        gDarkWood.push(col);
      }
    }

    // Lower Roof (`下層屋根`, `29.6m × 19.6m`) at `y = floorY + 5.6`
    const lowerBracket = new THREE.BoxGeometry(25.6, 0.55, 15.6);
    lowerBracket.translate(kondoX, floorY + 5.55, kondoZ);
    gDarkWood.push(lowerBracket);

    const lowerRoof = new THREE.BoxGeometry(29.6, 0.58, 19.6);
    lowerRoof.translate(kondoX, floorY + 6.1, kondoZ);
    gRoofTile.push(lowerRoof);

    // Authentic Tō-ji Kondō Stepped Elevated Central Eave (`前面中央切り上げ本瓦葺`) over the central entrance!
    const kiriageFrieze = new THREE.BoxGeometry(9.6, 0.68, 0.42);
    kiriageFrieze.translate(kondoX, floorY + 6.45, kondoZ + 8.85);
    gPlaster.push(kiriageFrieze);

    const kiriageRoof = new THREE.BoxGeometry(10.6, 0.48, 3.2);
    kiriageRoof.translate(kondoX, floorY + 6.88, kondoZ + 8.95);
    gRoofTile.push(kiriageRoof);

    const kiriageGoldOrnament = new THREE.BoxGeometry(0.55, 0.45, 0.25);
    kiriageGoldOrnament.translate(kondoX, floorY + 7.12, kondoZ + 10.55);
    gGold.push(kiriageGoldOrnament);

    // Upper Clerestory Core (`上層白漆喰壁`, `21.2m × 12.2m`)
    const upperCore = new THREE.BoxGeometry(21.2, 3.4, 12.2);
    upperCore.translate(kondoX, floorY + 8.0, kondoZ);
    gPlaster.push(upperCore);

    const upperBracket = new THREE.BoxGeometry(22.4, 0.55, 13.4);
    upperBracket.translate(kondoX, floorY + 9.9, kondoZ);
    gVermilion.push(upperBracket);

    // Upper Monumental Hip-and-Gable Roof (`上層入母屋造本瓦葺`, `y = 11.5m..15.5m`)
    const upperRoofSlab = new THREE.BoxGeometry(26.8, 0.65, 16.8);
    upperRoofSlab.translate(kondoX, floorY + 10.45, kondoZ);
    gRoofTile.push(upperRoofSlab);

    const upperHip = new THREE.ConeGeometry(15.2, 3.4, 4);
    upperHip.rotateY(Math.PI / 4);
    upperHip.scale(1.26, 1.0, 0.82);
    upperHip.translate(kondoX, floorY + 12.4, kondoZ);
    gRoofTile.push(upperHip);

    const mainRidge = new THREE.BoxGeometry(16.5, 0.48, 0.65);
    mainRidge.translate(kondoX, floorY + 13.85, kondoZ);
    gRoofTile.push(mainRidge);

    for (const side of [-1, 1]) {
      const shibi = new THREE.BoxGeometry(0.55, 1.1, 0.65);
      shibi.translate(kondoX + side * 8.1, floorY + 14.3, kondoZ);
      gGold.push(shibi);
    }

    // 6.3 Interior Yakushi Triad (`藥師三尊`) & Twelve Heavenly Generals (`十二神將`)
    const kondoAltar = new THREE.BoxGeometry(14.5, 1.05, 5.6);
    kondoAltar.translate(kondoX, floorY + 0.525, kondoZ - 0.8);
    gDarkWood.push(kondoAltar);

    const kondoAltarTop = new THREE.BoxGeometry(14.8, 0.16, 5.8);
    kondoAltarTop.translate(kondoX, floorY + 1.10, kondoZ - 0.8);
    gGold.push(kondoAltarTop);

    const yakushiBaseY = floorY + 1.18;

    // Central Colossal Golden Yakushi Nyorai (`藥師如來坐像`) at `(0, 7.2)`
    appendSeatedBuddha({
      gGold,
      gHalo,
      x: kondoX,
      y: yakushiBaseY,
      z: kondoZ - 0.8,
      scale: 1.85,
      rotY: 0,
    });

    // Great Boat-Shaped Mandorla (`七佛藥師光背`) studded with 7 miniature Yakushi Buddhas
    const mandorla = new THREE.CylinderGeometry(2.4, 2.8, 0.18, 18);
    mandorla.rotateX(Math.PI / 2);
    mandorla.scale(0.88, 1.32, 1.0);
    mandorla.translate(kondoX, yakushiBaseY + 2.85, kondoZ - 1.55);
    gGold.push(mandorla);

    for (let mIdx = 0; mIdx < 7; mIdx++) {
      const ang = -Math.PI * 0.65 + (mIdx / 6) * Math.PI * 1.3;
      const mx = kondoX + Math.sin(ang) * 2.15;
      const my = yakushiBaseY + 2.75 + Math.cos(ang) * 2.55;
      const miniBuddha = new THREE.SphereGeometry(0.18, 8, 6);
      miniBuddha.translate(mx, my, kondoZ - 1.42);
      gGold.push(miniBuddha);
    }

    // Flanking Standing Bodhisattvas: Nikkō Bosatsu (`日光菩薩`, East `+x`) & Gakkō Bosatsu (`月光菩薩`, West `-x`)
    appendBodhisattva({
      gGold,
      gHalo,
      x: kondoX + 4.2,
      y: yakushiBaseY,
      z: kondoZ - 0.6,
      scale: 1.42,
      rotY: -0.15,
      standing: true,
    });
    appendBodhisattva({
      gGold,
      gHalo,
      x: kondoX - 4.2,
      y: yakushiBaseY,
      z: kondoZ - 0.6,
      scale: 1.42,
      rotY: 0.15,
      standing: true,
    });

    // Twelve Heavenly Generals (`十二神將`) arrayed around the base of Yakushi Nyorai's lotus pedestal
    for (let gIdx = 0; gIdx < 12; gIdx++) {
      const gx = kondoX - 5.5 + gIdx * 1.0;
      const gz = kondoZ + (gIdx % 2 === 0 ? 1.35 : 0.85);
      appendDevaGuardian({
        gArmor,
        gGold,
        gWhite: null,
        x: gx,
        y: yakushiBaseY,
        z: gz,
        scale: 0.56,
        mountType: 'demon',
      });
    }

    // Kondō outer platform collider (leaving southern viewing steps approachable)
    registerCollider({
      type: 'box',
      cx: ox + kondoX,
      cz: oz + kondoZ,
      hx: 13.0,
      hz: 7.8,
    });
  }

  // ---------------------------------------------------------------- 7. Landmark 3: 東寺講堂 (Kōdō — Lecture Hall) & 21-Deity 3D Mandala at `local (0, -36)`
  const kodoX = 0;
  const kodoZ = -36;
  const mandala21Deities = [];

  {
    // 7.1 Raised Stone Platform (`石造基壇`, `28m × 15m`, height `1.2m`) + Southern Steps
    const kodoKidan = new THREE.BoxGeometry(29.4, 1.2, 16.4);
    kodoKidan.translate(kodoX, 0.6, kodoZ);
    gStone.push(kodoKidan);

    for (let st = 0; st < 4; st++) {
      const step = new THREE.BoxGeometry(8.4, 0.30, 0.46);
      step.translate(kodoX, (st + 0.5) * 0.30, kodoZ + 8.2 + (3 - st) * 0.44);
      gStone.push(step);
    }

    const kodoFloorY = 1.2;

    // 7.2 Classical Heian Single-Story Hip-and-Gable Hall (`單層入母屋造本瓦葺`, height `11.5m`)
    // Vivid vermilion cylindrical columns (`丹塗円柱`), white plaster walls (`白漆喰壁`), green lattice windows (`連子窓`)
    const kodoBackWall = new THREE.BoxGeometry(26.4, 5.2, 0.42);
    kodoBackWall.translate(kodoX, kodoFloorY + 2.6, kodoZ - 6.8);
    gPlaster.push(kodoBackWall);

    for (const side of [-1, 1]) {
      const sideWall = new THREE.BoxGeometry(0.42, 5.2, 13.6);
      sideWall.translate(kodoX + side * 13.2, kodoFloorY + 2.6, kodoZ);
      gPlaster.push(sideWall);

      const sideLattice = new THREE.BoxGeometry(0.50, 2.1, 8.6);
      sideLattice.translate(kodoX + side * 13.2, kodoFloorY + 2.9, kodoZ);
      gGreenLattice.push(sideLattice);

      // Front corner bays (`|x| = 8.4..13.2`), leaving central 16.8m southern vista wide open to behold all 21 deities!
      const frontCornerWall = new THREE.BoxGeometry(4.8, 5.2, 0.42);
      frontCornerWall.translate(kodoX + side * 10.8, kodoFloorY + 2.6, kodoZ + 6.8);
      gPlaster.push(frontCornerWall);

      const frontLattice = new THREE.BoxGeometry(2.8, 2.0, 0.48);
      frontLattice.translate(kodoX + side * 10.8, kodoFloorY + 2.9, kodoZ + 6.8);
      gGreenLattice.push(frontLattice);
    }

    // Vermilion pillars (`丹塗円柱`) & horizontal tie-beams (`朱塗長押・頭貫`) along front, sides, and back
    for (const px of [-13.2, -9.2, -5.6, 5.6, 9.2, 13.2]) {
      for (const pz of [-6.8, 6.8]) {
        const col = new THREE.CylinderGeometry(0.32, 0.35, 5.4, 10);
        col.translate(kodoX + px, kodoFloorY + 2.7, kodoZ + pz);
        gVermilion.push(col);
      }
    }
    for (const beamY of [0.35, 3.85, 5.15]) {
      const backBeam = new THREE.BoxGeometry(26.6, 0.22, 0.48);
      backBeam.translate(kodoX, kodoFloorY + beamY, kodoZ - 6.8);
      gVermilion.push(backBeam);

      for (const side of [-1, 1]) {
        const sideBeam = new THREE.BoxGeometry(0.48, 0.22, 13.8);
        sideBeam.translate(kodoX + side * 13.2, kodoFloorY + beamY, kodoZ);
        gVermilion.push(sideBeam);

        const frontCornerBeam = new THREE.BoxGeometry(4.9, 0.22, 0.48);
        frontCornerBeam.translate(kodoX + side * 10.8, kodoFloorY + beamY, kodoZ + 6.8);
        gVermilion.push(frontCornerBeam);
      }
    }

    // Courtyard red-cloth benches (`緋毛氈の床几`) south of Kōdō
    for (const bx of [-9.5, 9.5]) {
      const benchTop = new THREE.BoxGeometry(3.2, 0.14, 1.15);
      benchTop.translate(kodoX + bx, 0.52, kodoZ + 12.2);
      gVermilion.push(benchTop);
      for (const lx of [-1.3, 1.3]) {
        for (const lz of [-0.42, 0.42]) {
          const leg = new THREE.BoxGeometry(0.14, 0.46, 0.14);
          leg.translate(kodoX + bx + lx, 0.23, kodoZ + 12.2 + lz);
          gDarkWood.push(leg);
        }
      }
    }

    const kodoBracket = new THREE.BoxGeometry(27.6, 0.55, 14.8);
    kodoBracket.translate(kodoX, kodoFloorY + 5.5, kodoZ);
    gVermilion.push(kodoBracket);

    const kodoRoofSlab = new THREE.BoxGeometry(31.2, 0.65, 18.2);
    kodoRoofSlab.translate(kodoX, kodoFloorY + 6.1, kodoZ);
    gRoofTile.push(kodoRoofSlab);

    const kodoRoofHip = new THREE.ConeGeometry(16.8, 3.8, 4);
    kodoRoofHip.rotateY(Math.PI / 4);
    kodoRoofHip.scale(1.32, 1.0, 0.78);
    kodoRoofHip.translate(kodoX, kodoFloorY + 8.2, kodoZ);
    gRoofTile.push(kodoRoofHip);

    const kodoMainRidge = new THREE.BoxGeometry(18.4, 0.45, 0.62);
    kodoMainRidge.translate(kodoX, kodoFloorY + 9.95, kodoZ);
    gRoofTile.push(kodoMainRidge);

    for (const side of [-1, 1]) {
      const shibi = new THREE.BoxGeometry(0.52, 1.05, 0.60);
      shibi.translate(kodoX + side * 9.0, kodoFloorY + 10.35, kodoZ);
      gGold.push(shibi);

      // `稚児棟` (Chigomune) secondary hip-ridge horns on the East/West gables
      for (const cz of [-1, 1]) {
        const chigomune = new THREE.BoxGeometry(3.2, 0.28, 0.32);
        chigomune.rotateY(side * cz * 0.42);
        chigomune.translate(kodoX + side * 12.4, kodoFloorY + 7.25, kodoZ + cz * 5.2);
        gRoofTile.push(chigomune);
      }
    }

    // 7.3 Grand Sumeru Altar (`須彌壇`, `18m × 6.5m`) & Kūkai's 21-Deity 3D Mandala (`二十一尊立體曼荼羅`)
    const sumeruAltarBody = new THREE.BoxGeometry(18.0, 0.96, 6.5);
    sumeruAltarBody.translate(kodoX, kodoFloorY + 0.48, kodoZ - 0.4);
    gPlaster.push(sumeruAltarBody);

    const sumeruAltarRim = new THREE.BoxGeometry(18.4, 0.16, 6.8);
    sumeruAltarRim.translate(kodoX, kodoFloorY + 1.0, kodoZ - 0.4);
    gDarkWood.push(sumeruAltarRim);

    const altarY = kodoFloorY + 1.08;
    const altarZ = kodoZ - 0.4;

    // Group A: Center — Five Wisdom Buddhas (`五智如來`, 5 golden seated Buddhas on lotus thrones)
    const fiveBuddhas = [
      { id: 'dainichi', name: '大日如來 (Mahāvairocana)', dx: 0, dz: 0, scale: 1.32, crown: true },
      { id: 'ashuku', name: '阿閦如來 (Akṣobhya)', dx: 1.95, dz: 1.25, scale: 0.92, crown: false },
      { id: 'hosho', name: '寶生如來 (Ratnasambhava)', dx: -1.95, dz: 1.25, scale: 0.92, crown: false },
      { id: 'amida', name: '阿彌陀如來 (Amitābha)', dx: -1.95, dz: -1.25, scale: 0.92, crown: false },
      { id: 'fukujoju', name: '不空成就如來 (Amoghasiddhi)', dx: 1.95, dz: -1.25, scale: 0.92, crown: false },
    ];
    for (const b of fiveBuddhas) {
      const wx = kodoX + b.dx;
      const wz = altarZ + b.dz;
      appendSeatedBuddha({
        gGold,
        gHalo,
        x: wx,
        y: altarY,
        z: wz,
        scale: b.scale,
        withCrown: b.crown,
      });
      mandala21Deities.push({
        id: b.id,
        name: b.name,
        group: 'fiveWisdomBuddhas',
        x: ox + wx,
        z: oz + wz,
      });
    }

    // Group B: East Wing (`+x` side) — Five Great Bodhisattvas (`五菩薩`, 5 golden bodhisattvas)
    const fiveBodhisattvas = [
      { id: 'kongoharamitsu', name: '金剛波羅蜜多菩薩', dx: 4.8, dz: 0, scale: 1.02 },
      { id: 'kongosatta', name: '金剛薩埵菩薩', dx: 6.0, dz: 1.25, scale: 0.84 },
      { id: 'kongohou', name: '金剛寶菩薩', dx: 3.6, dz: 1.25, scale: 0.84 },
      { id: 'kongohou_dharma', name: '金剛法菩薩', dx: 3.6, dz: -1.25, scale: 0.84 },
      { id: 'kongogou', name: '金剛業菩薩', dx: 6.0, dz: -1.25, scale: 0.84 },
    ];
    for (const bod of fiveBodhisattvas) {
      const wx = kodoX + bod.dx;
      const wz = altarZ + bod.dz;
      appendBodhisattva({
        gGold,
        gHalo,
        x: wx,
        y: altarY,
        z: wz,
        scale: bod.scale,
        standing: false,
      });
      mandala21Deities.push({
        id: bod.id,
        name: bod.name,
        group: 'fiveGreatBodhisattvas',
        x: ox + wx,
        z: oz + wz,
      });
    }

    // Group C: West Wing (`-x` side) — Five Wisdom Kings (`五大明王`, 5 wrathful figures with blazing Garuda flame halos)
    const fiveWisdomKings = [
      { id: 'fudo', name: '不動明王 (Acala)', dx: -4.8, dz: 0, scale: 1.08, bull: false },
      { id: 'gozanze', name: '降三世明王 (Trailokyavijaya)', dx: -3.6, dz: 1.25, scale: 0.88, bull: false },
      { id: 'gundari', name: '軍荼利明王 (Kuṇḍali)', dx: -6.0, dz: 1.25, scale: 0.88, bull: false },
      { id: 'daiitoku', name: '大威德明王 (Yamāntaka)', dx: -6.0, dz: -1.25, scale: 0.88, bull: true },
      { id: 'kongoyasha', name: '金剛夜叉明王 (Vajrayakṣa)', dx: -3.6, dz: -1.25, scale: 0.88, bull: false },
    ];
    for (const myoo of fiveWisdomKings) {
      const wx = kodoX + myoo.dx;
      const wz = altarZ + myoo.dz;
      appendWisdomKing({
        gIndigo,
        gFlame,
        gGold,
        gWhite: gPlaster,
        x: wx,
        y: altarY,
        z: wz,
        scale: myoo.scale,
        bullMount: myoo.bull,
      });
      mandala21Deities.push({
        id: myoo.id,
        name: myoo.name,
        group: 'fiveWisdomKings',
        x: ox + wx,
        z: oz + wz,
      });
    }

    // Group D: Outer Ends & Four Corners — Six Protective Devas (`梵天・帝釋天・四天王`, 6 statues)
    const sixDevas = [
      { id: 'bonten', name: '梵天 (Brahmā)', dx: 7.6, dz: 0, scale: 0.96, mount: 'geese' },
      { id: 'taishakuten', name: '帝釋天 (Indra)', dx: -7.6, dz: 0, scale: 0.96, mount: 'elephant' },
      { id: 'jikokuten', name: '持國天 (Dhṛtarāṣṭra)', dx: 8.1, dz: -2.25, scale: 0.95, mount: 'demon' },
      { id: 'zojoten', name: '增長天 (Virūḍhaka)', dx: 8.1, dz: 2.25, scale: 0.95, mount: 'demon' },
      { id: 'komokuten', name: '廣目天 (Virūpākṣa)', dx: -8.1, dz: 2.25, scale: 0.95, mount: 'demon' },
      { id: 'tamonten', name: '多聞天・毘沙門天 (Vaiśravaṇa)', dx: -8.1, dz: -2.25, scale: 0.95, mount: 'demon' },
    ];
    for (const deva of sixDevas) {
      const wx = kodoX + deva.dx;
      const wz = altarZ + deva.dz;
      appendDevaGuardian({
        gArmor,
        gGold,
        gWhite: gPlaster,
        x: wx,
        y: altarY,
        z: wz,
        scale: deva.scale,
        mountType: deva.mount,
      });
      mandala21Deities.push({
        id: deva.id,
        name: deva.name,
        group: 'sixProtectiveDevas',
        x: ox + wx,
        z: oz + wz,
      });
    }

    // Kōdō outer platform collider (leaving southern steps approachable)
    registerCollider({
      type: 'box',
      cx: ox + kodoX,
      cz: oz + kodoZ,
      hx: 14.0,
      hz: 7.6,
    });
  }

  // ---------------------------------------------------------------- 8. Landmark 4: 瓢箪池庭園 (Hyōtan-ike Gourd Pond & Cherry/Maple Garden) at `local (36, -16)`
  const pondWaterMat = new THREE.MeshStandardMaterial({
    color: 0x1e606e,
    roughness: 0.12,
    metalness: 0.52,
    emissive: 0x0b3b45,
    emissiveIntensity: 0.45,
  });
  disposables.push(pondWaterMat);

  {
    // Two connected gourd lobes of water (`瓢箪池`)
    const southLobeGeo = new THREE.CircleGeometry(8.2, 32);
    southLobeGeo.rotateX(-Math.PI / 2);
    southLobeGeo.translate(36, -0.05, -11);

    const northLobeGeo = new THREE.CircleGeometry(6.5, 28);
    northLobeGeo.rotateX(-Math.PI / 2);
    northLobeGeo.translate(35, -0.05, -22);

    const pondWaterMesh = new THREE.Mesh(
      mergeAndDispose([southLobeGeo, northLobeGeo]),
      pondWaterMat
    );
    pondWaterMesh.name = 'HyotanIkeWater';
    root.add(pondWaterMesh);

    // Curved Granite Stone Bridge (`石橋 / 反り橋`) spanning the gourd waist at `(35.5, -16.8)`
    for (let b = -3; b <= 3; b++) {
      const u = b / 3;
      const archY = 0.18 + (1 - u * u) * 0.42;
      const bridgeSlab = new THREE.BoxGeometry(1.15, 0.22, 2.2);
      bridgeSlab.translate(35.5 + b * 1.05, archY, -16.8);
      gStone.push(bridgeSlab);
    }

    // Natural shoreline garden boulders (`景石`) around Hyōtan-ike Pond
    const pondRocks = [
      [27.8, -9.5, 1.1],
      [44.2, -10.2, 1.25],
      [43.5, -14.8, 0.95],
      [28.5, -21.5, 1.15],
      [41.5, -23.0, 1.05],
      [34.8, -28.6, 1.2],
    ];
    for (const [rx, rz, rr] of pondRocks) {
      const rock = new THREE.DodecahedronGeometry(rr, 0);
      rock.scale(1.2, 0.72, 1.0);
      rock.translate(rx, 0.35 * rr, rz);
      gStone.push(rock);
    }

    // 3D Lotus Pads (`蓮の葉`) & Seed Pods (`蓮の花托`) floating on Hyōtan-ike Pond (from reference photo Angle 2)
    for (let lp = 0; lp < 28; lp++) {
      const lobeZ = lp < 16 ? -11.0 : -22.0;
      const lobeX = lp < 16 ? 36.0 : 35.0;
      const rad = 1.4 + ((lp * 1.73) % 4.8);
      const ang = lp * 2.39996;
      const lx = lobeX + Math.cos(ang) * rad;
      const lz = lobeZ + Math.sin(ang) * rad;
      const padR = 0.32 + (lp % 4) * 0.08;
      const pad = new THREE.CylinderGeometry(padR, padR * 0.9, 0.03, 10);
      pad.translate(lx, 0.02 + (lp % 3) * 0.04, lz);
      gGreenLattice.push(pad);

      if (lp % 3 === 0) {
        const stem = new THREE.CylinderGeometry(0.02, 0.025, 0.36, 5);
        stem.translate(lx, 0.20, lz);
        gDarkWood.push(stem);
        const pod = new THREE.ConeGeometry(0.11, 0.16, 7);
        pod.rotateX(Math.PI);
        pod.translate(lx, 0.38, lz);
        gDarkWood.push(pod);
      }
    }

    // Traditional Stone Lanterns (`石燈籠`) around the Pond, Pagoda, Kondō, and Kōdō
    const lanternCoords = [
      [30.5, -13.5, 1.05],
      [40.8, -19.2, 1.0],
      [28.5, 18.0, 1.15],
      [36.0, 26.8, 1.15],
      [-5.2, 18.8, 1.2],
      [5.2, 18.8, 1.2],
      [-5.6, -26.5, 1.2],
      [5.6, -26.5, 1.2],
      [-4.2, 72.0, 1.1],
      [4.2, 72.0, 1.1],
    ];
    for (const [lx, lz, sc] of lanternCoords) {
      appendStoneLantern({ gStone, gGlow: gLanternGlow, x: lx, y: 0, z: lz, scale: sc });
      registerCollider({
        type: 'circle',
        x: ox + lx,
        z: oz + lz,
        r: 0.45 * sc,
      });
    }
  }

  // ---------------------------------------------------------------- 9. Merge Procedural Landmark Buckets & Load Blender 5.2 Masterpiece GLBs
  const proceduralLandmarksGroup = new THREE.Group();
  proceduralLandmarksGroup.name = 'TojiProceduralLandmarksFallback';
  root.add(proceduralLandmarksGroup);

  const mergedBuckets = [
    [gStone, stoneMat, true, true, 'TojiStoneMerged'],
    [gSando, sandoStoneMat, false, true, 'TojiSandoMerged'],
    [gDarkWood, darkWoodMat, true, true, 'TojiDarkWoodMerged'],
    [gVermilion, vermilionMat, true, true, 'TojiVermilionMerged'],
    [gPlaster, plasterMat, true, true, 'TojiPlasterMerged'],
    [gRoofTile, roofTileMat, true, true, 'TojiRoofTileMerged'],
    [gBronze, bronzeMat, true, false, 'TojiBronzeMerged'],
    [gGold, goldMat, true, false, 'TojiGoldMerged'],
    [gHalo, haloGoldMat, false, false, 'TojiHaloMerged'],
    [gFlame, garudaFlameMat, false, false, 'TojiGarudaFlameMerged'],
    [gIndigo, wrathfulIndigoMat, true, false, 'TojiWisdomKingsMerged'],
    [gArmor, devaArmorMat, true, false, 'TojiDevaArmorMerged'],
    [gGreenLattice, greenLatticeMat, false, true, 'TojiGreenLatticeMerged'],
    [gLanternGlow, lanternGlowMat, false, false, 'TojiLanternGlowMerged'],
  ];

  for (const [geos, mat, cast, receive, name] of mergedBuckets) {
    if (!geos.length) continue;
    const mergedGeo = mergeAndDispose(geos);
    if (!mergedGeo) continue;
    disposables.push(mergedGeo);
    const mesh = new THREE.Mesh(mergedGeo, mat);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    proceduralLandmarksGroup.add(mesh);
  }

  // Load our personally sculpted Blender 5.2 BMesh Masterpiece GLBs (`/models/kukai/toji_*.glb`) in browser runtime
  const blenderMasterpieceGroup = new THREE.Group();
  blenderMasterpieceGroup.name = 'TojiBlenderMasterpieceGroup';
  root.add(blenderMasterpieceGroup);
  const glbSakuraMats = [];
  const glbMapleMats = [];

  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    const loader = new GLTFLoader();
    const glbSpecs = [
      { url: '/models/kukai/toji_gojunoto.glb', x: pagodaX, y: 0, z: pagodaZ, scale: 1.05 },
      { url: '/models/kukai/toji_kondo.glb', x: kondoX, y: 0, z: kondoZ, scale: 1.25 },
      { url: '/models/kukai/toji_kodo.glb', x: kodoX, y: 0, z: kodoZ, scale: 1.25 },
    ];
    let loadedCount = 0;
    for (const spec of glbSpecs) {
      loader.load(
        spec.url,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(spec.x, spec.y, spec.z);
          model.scale.setScalar(spec.scale);
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              const mName = child.material?.name || '';
              if (mName.includes('Sakura')) {
                glbSakuraMats.push(child.material);
              } else if (mName.includes('Momiji')) {
                glbMapleMats.push(child.material);
              }
            }
          });
          blenderMasterpieceGroup.add(model);
          loadedCount += 1;
          if (loadedCount === glbSpecs.length) {
            proceduralLandmarksGroup.visible = false;
            appliedSeason = null;
            applySeasonalPalette(state?.time?.season || 'spring');
          }
        },
        undefined,
        () => {}
      );
    }
  }

  // ---------------------------------------------------------------- 10. Weeping Cherry (`不二櫻`) & Crimson Japanese Maples (`紅葉`) InstancedMeshes
  // Tree locations: iconic Fuji-zakura (`不二櫻`) at `(24, 6)` + cherry & maple trees around Hyōtan-ike & precinct
  const cherryTrees = [
    { x: 24.0, z: 6.0, scale: 1.45 }, // Iconic Fuji-zakura weeping cherry NW of Gojū-no-tō
    { x: 25.5, z: -8.0, scale: 1.15 },
    { x: 45.5, z: -6.5, scale: 1.10 },
    { x: 46.0, z: 28.0, scale: 1.20 },
    { x: -22.0, z: 24.0, scale: 1.15 },
    { x: -24.0, z: -18.0, scale: 1.10 },
    { x: 22.0, z: -42.0, scale: 1.15 },
    { x: -18.0, z: 54.0, scale: 1.10 },
  ];
  const mapleTrees = [
    { x: 26.5, z: -18.5, scale: 1.20 },
    { x: 44.5, z: -18.0, scale: 1.25 },
    { x: 35.0, z: -31.0, scale: 1.15 },
    { x: 48.0, z: 8.0, scale: 1.15 },
    { x: 22.0, z: 32.0, scale: 1.10 },
    { x: -25.0, z: 4.0, scale: 1.20 },
    { x: -22.0, z: -44.0, scale: 1.15 },
    { x: 18.0, z: 56.0, scale: 1.10 },
  ];

  const trunkGeos = [];
  for (const t of [...cherryTrees, ...mapleTrees]) {
    const s = t.scale;
    const trunk = new THREE.CylinderGeometry(0.18 * s, 0.30 * s, 2.8 * s, 7);
    trunk.translate(t.x, 1.4 * s, t.z);
    trunkGeos.push(trunk);
    registerCollider({
      type: 'circle',
      x: ox + t.x,
      z: oz + t.z,
      r: 0.55 * s,
    });
  }
  // Wooden crutch poles (`添え木・支柱`) supporting the heavy weeping branches of Fuji-zakura (`不二櫻`) at `(24, 6)`
  for (const [px, pz, h] of [
    [22.4, 7.1, 3.1],
    [25.6, 7.2, 3.2],
    [25.8, 4.7, 3.0],
    [22.5, 4.8, 2.9],
  ]) {
    const pole = new THREE.CylinderGeometry(0.06, 0.07, h, 6);
    pole.translate(px, h * 0.5, pz);
    trunkGeos.push(pole);
    const crossbar = new THREE.BoxGeometry(0.42, 0.08, 0.12);
    crossbar.translate(px, h, pz);
    trunkGeos.push(crossbar);
  }
  if (trunkGeos.length) {
    const trunkGeoMerged = mergeAndDispose(trunkGeos);
    disposables.push(trunkGeoMerged);
    const trunkMesh = new THREE.Mesh(trunkGeoMerged, darkWoodMat);
    trunkMesh.castShadow = true;
    root.add(trunkMesh);
  }

  // InstancedMesh 1: Weeping Cherry Blossom Canopies (`不二櫻`, 9 clusters per tree including cascading weeping strands)
  const blossomGeo = new THREE.DodecahedronGeometry(1.15, 1);
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xf9a8d4,
    roughness: 0.72,
    metalness: 0.02,
    emissive: 0x831843,
    emissiveIntensity: 0.18,
  });
  disposables.push(blossomGeo, blossomMat);

  const blossomOffsets = [
    [0, 3.2, 0, 1.35, 0.85, 1.35],
    [-1.1, 2.6, 0.8, 0.95, 0.75, 0.95],
    [1.1, 2.5, -0.7, 0.95, 0.75, 0.95],
    [0.8, 2.4, 1.0, 0.88, 0.72, 0.88],
    [-0.9, 2.3, -0.9, 0.88, 0.72, 0.88],
    [-1.35, 1.75, 1.05, 0.45, 0.95, 0.45],
    [1.35, 1.72, 0.95, 0.45, 0.95, 0.45],
    [1.25, 1.68, -1.05, 0.45, 0.95, 0.45],
    [-1.25, 1.70, -1.0, 0.45, 0.95, 0.45],
  ];
  const cherryInstanced = new THREE.InstancedMesh(
    blossomGeo,
    blossomMat,
    cherryTrees.length * blossomOffsets.length
  );
  cherryInstanced.name = 'TojiCherryBlossomsInstanced';
  cherryInstanced.castShadow = true;
  const dummy = new THREE.Object3D();
  let cIdx = 0;
  for (const t of cherryTrees) {
    const s = t.scale;
    for (const [oxOff, oyOff, ozOff, sx, sy, sz] of blossomOffsets) {
      dummy.position.set(t.x + oxOff * s, oyOff * s, t.z + ozOff * s);
      dummy.scale.set(sx * s, sy * s, sz * s);
      dummy.updateMatrix();
      cherryInstanced.setMatrixAt(cIdx++, dummy.matrix);
    }
  }
  cherryInstanced.instanceMatrix.needsUpdate = true;
  root.add(cherryInstanced);

  // InstancedMesh 2: Crimson Japanese Maple Canopies (`紅葉`, 5 clusters per tree)
  const mapleGeo = new THREE.DodecahedronGeometry(1.1, 1);
  const mapleMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.76,
    metalness: 0.04,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.22,
  });
  disposables.push(mapleGeo, mapleMat);

  const mapleOffsets = [
    [0, 3.1, 0, 1.35, 0.78, 1.35],
    [-0.95, 2.5, 0.65, 0.95, 0.68, 0.95],
    [0.95, 2.6, -0.65, 0.95, 0.68, 0.95],
    [0.5, 2.3, 0.85, 0.88, 0.65, 0.88],
    [-0.65, 2.2, -0.8, 0.85, 0.62, 0.85],
  ];
  const mapleInstanced = new THREE.InstancedMesh(
    mapleGeo,
    mapleMat,
    mapleTrees.length * mapleOffsets.length
  );
  mapleInstanced.name = 'TojiCrimsonMaplesInstanced';
  mapleInstanced.castShadow = true;
  let mIdx = 0;
  for (const t of mapleTrees) {
    const s = t.scale;
    for (const [oxOff, oyOff, ozOff, sx, sy, sz] of mapleOffsets) {
      dummy.position.set(t.x + oxOff * s, oyOff * s, t.z + ozOff * s);
      dummy.scale.set(sx * s, sy * s, sz * s);
      dummy.updateMatrix();
      mapleInstanced.setMatrixAt(mIdx++, dummy.matrix);
    }
  }
  mapleInstanced.instanceMatrix.needsUpdate = true;
  root.add(mapleInstanced);

  // InstancedMesh 3: Four-Season Drifting Petals / Maple Leaves / Snowflakes (`四季落櫻・楓紅・飛雪`)
  const PARTICLE_COUNT = 160;
  const particleGeo = new THREE.PlaneGeometry(0.18, 0.14);
  const particleMat = new THREE.MeshBasicMaterial({
    color: 0xfbcfe8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
  });
  disposables.push(particleGeo, particleMat);
  const seasonalParticles = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
  seasonalParticles.name = 'TojiSeasonalParticlesInstanced';
  const particleSeeds = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: ((i * 37.3) % 96) - 36,
    y: (i * 1.47) % 14,
    z: ((i * 53.7) % 110) - 48,
    phase: i * 0.618,
    speed: 0.75 + (i % 7) * 0.14,
  }));
  root.add(seasonalParticles);

  // Japanese Aesthetic Atmospheric Layer: Slanted Komorebi Sunbeam Shafts (`木漏れ日・瑞光`)
  // and Yamato-e Floating Golden Cloud Ribbons (`大和繪金雲・霞帯`)
  const komorebiMat = new THREE.MeshBasicMaterial({
    color: 0xffedd5,
    transparent: true,
    opacity: 0.085,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const komorebiGeos = [];
  const beamSpots = [
    [22, 16, 15, 3.8, 7.2, 26],   // Over Weeping Fuji-zakura (`不二櫻`)
    [36, 18, 22, 4.5, 8.8, 34],   // Over Five-Story Pagoda (`五重塔`)
    [36, 12, -16, 3.6, 6.8, 24],  // Over Hyōtan-ike Lotus Pond (`瓢箪池`)
    [0, 14, 14, 4.2, 7.8, 26],    // Over Kondō courtyard (`金堂前庭`)
    [0, 14, -28, 4.0, 7.4, 25],   // Over Kōdō courtyard (`講堂前庭`)
  ];
  for (const [bx, by, bz, rTop, rBot, bHeight] of beamSpots) {
    const shaft = new THREE.CylinderGeometry(rTop, rBot, bHeight, 12, 1, true);
    shaft.rotateZ(-0.34);
    shaft.rotateX(0.18);
    shaft.translate(bx, by, bz);
    komorebiGeos.push(shaft);
  }
  const komorebiMesh = new THREE.Mesh(mergeAndDispose(komorebiGeos), komorebiMat);
  komorebiMesh.name = 'TojiKomorebiSunbeams';
  root.add(komorebiMesh);
  disposables.push(komorebiMesh.geometry, komorebiMat);

  let appliedSeason = null;
  function applySeasonalPalette(season) {
    if (season === appliedSeason) return;
    appliedSeason = season;
    if (season === 'spring') {
      // Full weeping Fuji-zakura cherry blossoms + fresh spring green maples
      blossomMat.color.setHex(0xf9a8d4);
      blossomMat.emissive.setHex(0x831843);
      blossomMat.emissiveIntensity = 0.22;
      mapleMat.color.setHex(0x4d9c46);
      mapleMat.emissive.setHex(0x1b4322);
      mapleMat.emissiveIntensity = 0.10;
      particleMat.color.setHex(0xfbcfe8);
      particleMat.opacity = 0.88;
      komorebiMat.color.setHex(0xffe4e6);
      komorebiMat.opacity = 0.036;
      if (rimMountainMesh?.material?.emissive) {
        rimMountainMesh.material.emissive.setHex(0x2d1f2d);
        rimMountainMesh.material.emissiveIntensity = 0.22;
      }
    } else if (season === 'summer') {
      // Lush deep emerald summer canopies
      blossomMat.color.setHex(0x2e7d32);
      blossomMat.emissive.setHex(0x0d3b14);
      blossomMat.emissiveIntensity = 0.08;
      mapleMat.color.setHex(0x256d29);
      mapleMat.emissive.setHex(0x0b3210);
      mapleMat.emissiveIntensity = 0.08;
      particleMat.color.setHex(0xd9f99d);
      particleMat.opacity = 0.55;
      komorebiMat.color.setHex(0xfef08a);
      komorebiMat.opacity = 0.034;
      if (rimMountainMesh?.material?.emissive) {
        rimMountainMesh.material.emissive.setHex(0x0f2922);
        rimMountainMesh.material.emissiveIntensity = 0.18;
      }
    } else if (season === 'autumn') {
      // Blazing Kyoto Momiji crimson/gold maples & warm amber cherry leaves
      blossomMat.color.setHex(0xd97706);
      blossomMat.emissive.setHex(0x78350f);
      blossomMat.emissiveIntensity = 0.18;
      mapleMat.color.setHex(0xdc2626);
      mapleMat.emissive.setHex(0x991b1b);
      mapleMat.emissiveIntensity = 0.30;
      particleMat.color.setHex(0xef4444);
      particleMat.opacity = 0.92;
      komorebiMat.color.setHex(0xfdba74);
      komorebiMat.opacity = 0.042;
      if (rimMountainMesh?.material?.emissive) {
        rimMountainMesh.material.emissive.setHex(0x3b1d16);
        rimMountainMesh.material.emissiveIntensity = 0.26;
      }
    } else if (season === 'winter') {
      // Frost-covered silver-white branches & falling snow
      blossomMat.color.setHex(0xe2e8f0);
      blossomMat.emissive.setHex(0x475569);
      blossomMat.emissiveIntensity = 0.16;
      mapleMat.color.setHex(0xcbd5e1);
      mapleMat.emissive.setHex(0x334155);
      mapleMat.emissiveIntensity = 0.14;
      particleMat.color.setHex(0xf8fafc);
      particleMat.opacity = 0.90;
      komorebiMat.color.setHex(0xe0f2fe);
      komorebiMat.opacity = 0.026;
      if (rimMountainMesh?.material?.emissive) {
        rimMountainMesh.material.emissive.setHex(0x334155);
        rimMountainMesh.material.emissiveIntensity = 0.32;
      }
    }
    for (const m of glbSakuraMats) {
      m.color?.copy?.(blossomMat.color);
      m.emissive?.copy?.(blossomMat.emissive);
      m.emissiveIntensity = blossomMat.emissiveIntensity;
    }
    for (const m of glbMapleMats) {
      m.color?.copy?.(mapleMat.color);
      m.emissive?.copy?.(mapleMat.emissive);
      m.emissiveIntensity = mapleMat.emissiveIntensity;
    }
  }

  // ---------------------------------------------------------------- 11. Landmark Interactables & Veneration Triggers
  const landmarkDefs = [
    {
      id: 'gojunoto',
      x: ox + 36,
      z: oz + 27,
      radius: 6.5,
      promptKey: 'prompt.toji.gojunoto',
      toastKey: 'toast.toji.gojunoto',
      sfx: 'bell',
    },
    {
      id: 'kondo',
      x: ox + 0,
      z: oz + 20,
      radius: 6.5,
      promptKey: 'prompt.toji.kondo',
      toastKey: 'toast.toji.kondo',
      sfx: 'bowl',
    },
    {
      id: 'kodo',
      x: ox + 0,
      z: oz - 24,
      radius: 6.5,
      promptKey: 'prompt.toji.kodo',
      toastKey: 'toast.toji.kodo',
      sfx: 'bell',
    },
    {
      id: 'hyotanIke',
      x: ox + 35.5,
      z: oz - 16.8,
      radius: 6.0,
      promptKey: 'prompt.toji.hyotanIke',
      toastKey: 'toast.toji.hyotanIke',
      sfx: 'bowl',
    },
  ];

  let lastInteractTime = -10;

  function triggerLandmarkInteraction(lm) {
    if (!lm) return false;
    const now = state?.elapsed || 0;
    if (now - lastInteractTime < 0.35) return false;
    lastInteractTime = now;

    bus?.emit?.('sfx', { name: lm.sfx });
    bus?.emit?.('toast', {
      key: lm.toastKey,
      text: i18n.t(lm.toastKey),
      kind: 'merit',
    });
    bus?.emit?.('vitals:restore', { hp: 30, mp: 30, source: 'toji' });
    return true;
  }

  for (const lm of landmarkDefs) {
    const posVec = new THREE.Vector3(lm.x, getHeight(lm.x, lm.z), lm.z);
    registerInteractable({
      id: `toji-${lm.id}`,
      kind: lm.id,
      zone: 'toji',
      action: 'interact',
      labelKey: lm.promptKey,
      radius: lm.radius,
      getPosition: () => posVec,
      isAvailable: () => state?.zone === 'toji' && !state?.uiOpen,
      onInteract() {
        triggerLandmarkInteraction(lm);
      },
    });
  }

  // ---------------------------------------------------------------- 12. Debug API Registration (`ctx.debug.register('toji', ...)`)
  const debugApi = {
    getLandmarks: () => landmarkDefs.map((l) => ({ ...l })),
    getMandala21Deities: () => mandala21Deities.map((d) => ({ ...d })),
    getYakushiTriad: () => ({
      hall: 'kondo',
      center: { id: 'yakushi', name: '藥師如來 (Bhaiṣajyaguru)', x: ox, z: oz + 7.2 },
      attendants: [
        { id: 'nikko', name: '日光菩薩 (Sūryaprabha)', x: ox + 4.2, z: oz + 7.4 },
        { id: 'gakko', name: '月光菩薩 (Candraprabha)', x: ox - 4.2, z: oz + 7.4 },
      ],
      generalsCount: 12,
      sevenYakushiHaloCount: 7,
    }),
    getPagodaInfo: () => ({
      id: 'gojunoto',
      x: ox + pagodaX,
      z: oz + pagodaZ,
      heightMeters: 35.0,
      stories: 5,
      sorinRings: 9,
      windBells: 20,
      heartPillarDeity: 'dainichi',
      fourBuddhas: ['ashuku', 'hosho', 'amida', 'fukujoju'],
      eightBodhisattvasCount: 8,
    }),
    venerate(landmarkId = 'kodo') {
      const lm = landmarkDefs.find((l) => l.id === landmarkId) || landmarkDefs[0];
      return triggerLandmarkInteraction(lm);
    },
    teleportTo(landmarkId = 'kodo') {
      const sp = TOJI_MAP.spawns?.[landmarkId] || TOJI_MAP.spawns.default;
      if (state?.player?.position && sp) {
        state.player.position.set(sp.x, getHeight(sp.x, sp.z), sp.z);
      }
      return sp;
    },
  };
  ctx?.debug?.register?.('toji', debugApi);

  return {
    group: zoneGroup,
    colliders,
    interactables,
    disposables,
    getHeight,
    getInteractionPrompt() {
      const pPos = state?.player?.position;
      if (!pPos || state?.uiOpen) return null;
      const lm = landmarkDefs.find(({ x, z, radius }) => Math.hypot(pPos.x - x, pPos.z - z) <= radius);
      return lm ? { key: lm.promptKey } : null;
    },
    update(dt, elapsed = state?.elapsed || 0) {
      // Subtle sacred pulse on the Five-Story Pagoda crowning jewel & Kōdō Garuda flame halos
      const jewelPulse = 1.0 + Math.sin(elapsed * 2.4) * 0.1;
      pagodaJewelHalo.scale.setScalar(jewelPulse);
      pagodaJewelHalo.rotation.y = elapsed * 0.5;
      garudaFlameMat.emissiveIntensity = 1.15 + Math.sin(elapsed * 4.2) * 0.22;

      // Four-Season Dynamic Foliage & Drifting Sakura / Maple / Snow Particles
      const curSeason = state?.time?.season || 'spring';
      applySeasonalPalette(curSeason);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particleSeeds[i];
        const py = 14.0 - (((elapsed * p.speed + p.y) % 13.8 + 13.8) % 13.8);
        const swayX = Math.sin(elapsed * 1.15 + p.phase) * 1.35;
        const swayZ = Math.cos(elapsed * 0.92 + p.phase) * 1.15;
        dummy.position.set(p.x + swayX, py, p.z + swayZ);
        dummy.rotation.set(elapsed * 1.6 + p.phase, elapsed * 1.2 + p.phase, elapsed * 0.9);
        const sc = curSeason === 'summer' ? 0.55 : 1.0;
        dummy.scale.setScalar(sc);
        dummy.updateMatrix();
        seasonalParticles.setMatrixAt(i, dummy.matrix);
      }
      seasonalParticles.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const d of disposables) {
        d?.dispose?.();
      }
    },
  };
}

export const buildTojiMap = createMap;
export default createMap;
