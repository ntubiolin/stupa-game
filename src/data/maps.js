import { CONFIG, deg, polar } from '../config.js';
import '../i18n/maps.js';

const W = CONFIG.WILD;
const startAng = deg(CONFIG.PLAYER?.startAngleDeg ?? 90);
const startRad = CONFIG.PLAYER?.startRadius ?? 30;
const stupaSouthPt = polar(startAng, startRad);

export const MAPS = {
  stupa: {
    id: 'stupa',
    type: 'hub',
    nameKey: 'map.stupa',
    origin: { x: 0, z: 0 },
    level: [1, 1],
    innerRadius: CONFIG.WORLD?.stupaColliderRadius ?? 19.9,
    walkRadius: CONFIG.WORLD?.walkRadius ?? 38,
    minimapColor: '#d9ccb4',
    waypoint: { x: 10, z: -26, localX: 10, localZ: -26 },
    safeZones: [{ x: 0, z: 0, r: 45 }],
    gates: [
      {
        id: 'north',
        x: W.stupaGate.x,
        z: W.stupaGate.z,
        radius: W.stupaGate.radius,
        to: 'wild',
        toGate: 'from-stupa',
        labelKey: 'prompt.enterWild',
      },
      {
        id: 'south',
        x: 0,
        z: 35.6,
        radius: 4.8,
        to: 'grove',
        toGate: 'from-stupa',
        labelKey: 'prompt.enterStupaGrove',
      },
    ],
    spawns: {
      default: { x: stupaSouthPt.x, z: stupaSouthPt.z, heading: 0 },
      south: { x: stupaSouthPt.x, z: stupaSouthPt.z, heading: 0 },
      'from-grove': { x: 0, z: 33.2, heading: 0 },
      waypoint: { x: 10, z: -24, heading: 0 },
      north: {
        x: W.stupaGate.returnPos.x,
        z: W.stupaGate.returnPos.z,
        heading: W.stupaGate.returnHeading,
      },
      'from-wild': {
        x: W.stupaGate.returnPos.x,
        z: W.stupaGate.returnPos.z,
        heading: W.stupaGate.returnHeading,
      },
    },
    spawnTable: [],
    spawnAreas: {},
    ambience: 'stupa',
    enterToastKey: 'toast.returnStupa',
    debugOnly: false,
    loaded: true,
    load: null,
  },

  wild: {
    id: 'wild',
    type: 'combat',
    nameKey: 'map.wild',
    origin: { x: W.origin.x, z: W.origin.z },
    level: [1, 5],
    walkRadius: W.walkRadius,
    minimapColor: '#6f7c56',
    waypoint: { x: W.origin.x + 6, z: 32, localX: 6, localZ: 32 },
    safeZones: [
      {
        x: W.wildGate.x,
        z: W.wildGate.z,
        r: 15,
      },
      { x: 1018, z: 22, r: 5.5, sanctuary: true },
      { x: 1006, z: 36, r: 4.5, sanctuary: true },
    ],
    gates: [
      {
        id: 'south',
        x: W.wildGate.x,
        z: W.wildGate.z,
        radius: W.wildGate.radius,
        to: 'stupa',
        toGate: 'north',
        labelKey: 'prompt.returnStupa',
      },
    ],
    spawns: {
      default: {
        x: W.wildGate.teleportPos.x,
        z: W.wildGate.teleportPos.z,
        heading: W.wildGate.spawnHeading,
      },
      teleport: {
        x: W.wildGate.teleportPos.x,
        z: W.wildGate.teleportPos.z,
        heading: W.wildGate.spawnHeading,
      },
      waypoint: {
        x: W.origin.x + 6,
        z: 34,
        heading: W.wildGate.spawnHeading,
      },
      'from-stupa': {
        x: W.wildGate.spawnPos.x,
        z: W.wildGate.spawnPos.z,
        heading: W.wildGate.spawnHeading,
      },
      south: {
        x: W.wildGate.spawnPos.x,
        z: W.wildGate.spawnPos.z,
        heading: W.wildGate.spawnHeading,
      },
    },
    spawnTable: [
      { kind: 'preta', area: 'near', count: 5, clusters: [2, 2, 1] },
      { kind: 'tsen', area: 'mid', count: 3 },
      { kind: 'migoi', area: 'deep', count: 2 },
    ],
    elitePacks: { champion: 1, rare: 1 },
    shrineSpots: [
      { x: 18, z: 22, guaranteed: true },
      { x: -24, z: -18 },
      { x: 26, z: -22 },
      { x: -20, z: 28 },
      { x: 28, z: 24 },
    ],
    spawnAreas: {
      near: {
        minR: 8, maxR: 26,
        polygon: [{ x: 962, z: 16 }, { x: 1038, z: 16 }, { x: 1038, z: 46 }, { x: 962, z: 46 }],
      },
      mid: {
        minR: 26, maxR: 46,
        polygon: [{ x: 952, z: -16 }, { x: 1048, z: -16 }, { x: 1048, z: 16 }, { x: 952, z: 16 }],
      },
      deep: {
        minR: 46, maxR: 65,
        polygon: [{ x: 952, z: -52 }, { x: 1048, z: -52 }, { x: 1048, z: -18 }, { x: 952, z: -18 }],
      },
    },
    ambience: 'wild',
    enterToastKey: 'toast.enterWild',
    chapterIntro: {
      flag: 'prologue.introSeen',
      chapterId: 'prologue',
      titleKey: 'mural.prologue.title',
      locationKey: 'mural.prologue.location',
      eraKey: 'mural.prologue.era',
      narrationKey: 'mural.prologue.narration',
      hintKey: 'ch1.intro.hint',
    },
    tutorialKey: 'stupa_wild_tutorial_v1',
    tutorials: [
      { delay: 0.4, key: 'tutorial.wild1' },
      { delay: 2.8, key: 'tutorial.wild2' },
      { delay: 5.2, key: 'tutorial.wild3' },
    ],
    debugOnly: false,
    load: () => import('../world/wilderness.js'),
  },

  sandbox: {
    id: 'sandbox',
    type: 'combat',
    nameKey: 'map.sandbox',
    origin: { x: 9000, z: 0 },
    level: [1, 40],
    walkRadius: 60,
    minimapColor: '#7a8264',
    waypoint: { x: 9008, z: -4, localX: 8, localZ: -4 },
    safeZones: [
      { x: 9000, z: 50, r: 10 },
    ],
    gates: [
      {
        id: 'south',
        x: 9000,
        z: 50,
        radius: 3.5,
        to: 'stupa',
        toGate: 'north',
        labelKey: 'prompt.returnStupa',
      },
    ],
    spawns: {
      default: { x: 9000, z: 20, heading: 0 },
      teleport: { x: 9000, z: 20, heading: 0 },
      waypoint: { x: 9008, z: -2, heading: 0 },
      south: { x: 9000, z: 44, heading: 0 },
      'from-stupa': { x: 9000, z: 44, heading: 0 },
    },
    spawnTable: [],
    spawnAreas: {
      near: { minR: 8, maxR: 22 },
      mid: { minR: 22, maxR: 38 },
      deep: { minR: 38, maxR: 52 },
    },
    ambience: 'wild',
    debugOnly: true,
    load: () => import('../world/maps/sandbox.js'),
  },
};

import GROVE_MAP from './maps/grove.js';
import PHARPING_MAP from './maps/pharping.js';
import MANGYUL_MAP from './maps/mangyul.js';
import YARLUNG_MAP from './maps/yarlung.js';
import SAMYE_MAP from './maps/samye.js';
import CHIMPHU_MAP from './maps/chimphu.js';
import TERMA_MAP from './maps/terma.js';
import TOJI_MAP from './maps/toji.js';
import KOYASAN_MAP from './maps/koyasan.js';
import * as japanPilgrimageMaps from './maps/japanPilgrimage.js';

// Auto-discover chapter map definitions (`src/data/maps/*.js`) and chapter i18n (`src/i18n/*.js`)
const fallbackMapModules = {
  grove: { GROVE_MAP },
  pharping: { PHARPING_MAP },
  mangyul: { MANGYUL_MAP },
  yarlung: { YARLUNG_MAP },
  samye: { SAMYE_MAP },
  chimphu: { CHIMPHU_MAP },
  terma: { TERMA_MAP },
  toji: { TOJI_MAP },
  koyasan: { KOYASAN_MAP },
  japanPilgrimage: japanPilgrimageMaps,
};
let chapterMapModules = fallbackMapModules;
try {
  import.meta.glob('../i18n/*.js', { eager: true });
  chapterMapModules = {
    ...fallbackMapModules,
    ...(import.meta.glob('./maps/*.js', { eager: true }) || {}),
  };
} catch {
  chapterMapModules = fallbackMapModules;
}
for (const mod of Object.values(chapterMapModules)) {
  if (!mod || typeof mod !== 'object') continue;
  for (const val of Object.values(mod)) {
    if (val && typeof val === 'object' && typeof val.id === 'string' && val.origin) {
      MAPS[val.id] = val;
    }
  }
}

export function registerMap(def) {
  if (!def || typeof def.id !== 'string') return null;
  MAPS[def.id] = def;
  return def;
}

export function getMapDef(id) {
  return MAPS[id] || MAPS.stupa;
}
