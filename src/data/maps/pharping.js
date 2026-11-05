// ============================================================================
// Chapter 1 Map Definition — Pharping · Yangleshö (`src/data/maps/pharping.js`)
// ============================================================================
import '../../i18n/ch1.js';

export const PHARPING_MAP = {
  id: 'pharping',
  type: 'combat',
  nameKey: 'map.pharping',
  origin: { x: 2000, z: 0 },
  level: [5, 10],
  levelRange: [5, 10],
  walkRadius: 105,
  minimapColor: '#9c7248',
  waypoint: { x: 2000, z: 80, localX: 0, localZ: 80 },
  safeZones: [
    { x: 2000, z: 80, r: 12 }, // Entrance & Waypoint safe zone
    { x: 1970, z: 55, r: 14 }, // Pharping Village safe zone
  ],
  gates: [
    {
      id: 'south',
      x: 2000,
      z: 84,
      radius: 3.5,
      to: 'stupa',
      toGate: 'north',
      labelKey: 'prompt.returnStupa',
    },
  ],
  spawns: {
    default: { x: 2000, z: 76, heading: Math.PI },
    teleport: { x: 2000, z: 76, heading: Math.PI },
    waypoint: { x: 2000, z: 78, heading: Math.PI },
    south: { x: 2000, z: 78, heading: Math.PI },
  },
  spawnTable: [
    {
      kind: 'droughtSprite',
      area: 'near',
      count: 2,
      tag: 'spring1',
      positions: [
        { x: -58, z: 13, tag: 'spring1' },
        { x: -52, z: 7, tag: 'spring1' },
      ],
    },
    {
      kind: 'droughtSprite',
      area: 'near',
      count: 2,
      tag: 'spring2',
      positions: [
        { x: 37, z: 33, tag: 'spring2' },
        { x: 43, z: 27, tag: 'spring2' },
      ],
    },
    {
      kind: 'droughtSprite',
      area: 'mid',
      count: 2,
      tag: 'spring3',
      positions: [
        { x: 7, z: -17, tag: 'spring3' },
        { x: 13, z: -23, tag: 'spring3' },
      ],
    },
    {
      kind: 'dustDevil',
      area: 'mid',
      count: 5,
      positions: [
        { x: -20, z: 22 },
        { x: 18, z: 42 },
        { x: -42, z: -18 },
        { x: -12, z: -48 },
        { x: 45, z: -15 },
      ],
    },
    {
      kind: 'thirstyPreta',
      area: 'near',
      count: 3,
      positions: [
        { x: -15, z: 6 },
        { x: 26, z: 6 },
        { x: -32, z: -34 },
      ],
    },
  ],
  elitePacks: { champion: 2, rare: 1 },
  shrineSpots: [
    { x: -42, z: 36 },
    { x: 48, z: 12 },
    { x: -48, z: -26 },
    { x: 18, z: -64 },
  ],
  spawnAreas: {
    near: { minR: 16, maxR: 48 },
    mid: { minR: 35, maxR: 74 },
    deep: { minR: 60, maxR: 92 },
  },
  ambience: 'wild',
  enterToastKey: 'toast.enterPharping',
  chapterIntro: {
    flag: 'ch1.introSeen',
    startQuest: 'ch1.drought',
    kickerKey: 'ch1.intro.kicker',
    titleKey: 'ch1.intro.title',
    metaKey: 'ch1.intro.meta',
    lines: ['ch1.intro.line1', 'ch1.intro.line2', 'ch1.intro.line3'],
    hintKey: 'ch1.intro.dismiss',
  },
  debugOnly: false,
  loaded: false,
  load: () => import('../../world/maps/pharping.js'),
};

export default PHARPING_MAP;
