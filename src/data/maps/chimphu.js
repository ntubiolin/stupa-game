/**
 * Chapter 5 Hub Map Data — Chimphu Hermitage (`chimphu`, `src/data/maps/chimphu.js`) — Issue #36
 *
 * Origin: (6000, 0), walkRadius: 65, level: [30, 40], type: 'hub', combat: false.
 */
import '../../i18n/ch5.js';

export const CHIMPHU_MAP = {
  id: 'chimphu',
  type: 'hub',
  nameKey: 'map.chimphu',
  subtitleKey: 'map.chimphu.subtitle',
  chapter: 5,
  origin: { x: 6000, z: 0 },
  walkRadius: 65,
  level: [30, 40],
  combat: false,
  unlockFlag: 'ch5.unlocked',
  minimapColor: '#5b6e58',

  atmosphere: {
    skyTop: '#1e3448',
    skyHorizon: '#8ca89e',
    fogColor: '#7a9488',
    fogNear: 45,
    fogFar: 185,
    sunColor: '#fff1d0',
    sunIntensity: 1.55,
    hemiSky: '#b8d4c8',
    hemiGround: '#3d4c3b',
    hemiIntensity: 0.72,
  },

  waypoint: {
    id: 'chimphu',
    x: 6000,
    z: 36,
    localX: 0,
    localZ: 36,
    nameKey: 'waypoint.chimphu.name',
    regionKey: 'waypoint.chimphu.region',
  },

  waypoints: [
    {
      id: 'chimphu',
      x: 6000,
      z: 36,
      nameKey: 'waypoint.chimphu.name',
      regionKey: 'waypoint.chimphu.region',
    },
  ],

  spawns: {
    default: { x: 6000, z: 32, heading: 0 },
    waypoint: { x: 6000, z: 34, heading: 0 },
    south: { x: 6000, z: 42, heading: 0 },
    'from-terma': { x: 6000, z: -28, heading: Math.PI },
    termaGate: { x: 6000, z: -32, heading: 0 },
  },

  gates: [
    {
      id: 'south',
      from: { x: 6000, z: 48, r: 3.5 },
      x: 6000,
      z: 48,
      radius: 3.5,
      to: 'samye',
      toMap: 'samye',
      toGate: 'default',
      spawn: { x: 5000, z: 86, heading: 0 },
      labelKey: 'prompt.leaveWild',
    },
  ],

  landmarks: [
    { id: 'termaGate', x: 6000, z: -40, r: 6, kind: 'gate', nameKey: 'map.terma' },
    { id: 'guruCave', x: 6000, z: -24, r: 5, kind: 'cave', nameKey: 'npc.guruVision.chimphu' },
    { id: 'tsogyalTerrace', x: 6000, z: -16, r: 5, kind: 'shrine', nameKey: 'npc.yesheTsogyal' },
    { id: 'retreatHutWest', x: 5982, z: -5, r: 4, kind: 'hut', nameKey: 'npc.chimphuRetreatant1' },
    { id: 'retreatHutEast', x: 6020, z: -8, r: 4, kind: 'hut', nameKey: 'npc.chimphuRetreatant2' },
    { id: 'amritaSpring', x: 5988, z: 12, r: 3.5, kind: 'spring', nameKey: 'prompt.amritaSpring' },
    { id: 'scenicOverlook', x: 6000, z: 40, r: 5, kind: 'overlook', nameKey: 'prompt.chimphuOverlook' },
  ],

  spawnTable: [],
  eliteChance: 0,
  maxActiveEnemies: 0,

  chapterIntro: {
    flag: 'ch5.introSeen',
    titleKey: 'ch5.intro.title',
    locationKey: 'ch5.intro.location',
    eraKey: 'ch5.intro.era',
    narrationKey: 'ch5.intro.narration',
    startQuest: 'ch5.tsogyal',
  },
};

export default CHIMPHU_MAP;
