// ============================================================================
// Chapter 3 Map Definition — Yarlung Valley · Yarlha Shampo (`src/data/maps/yarlung.js`)
// ============================================================================
import '../../i18n/ch3.js';

export const YARLUNG_MAP = {
  id: 'yarlung',
  type: 'combat',
  combat: true,
  unlockFlag: 'ch3.unlocked',
  nameKey: 'map.yarlung',
  origin: { x: 4000, z: 0 },
  level: [16, 23],
  levelRange: [16, 23],
  walkRadius: 115,
  minimapColor: '#8ba848',
  waypoint: { x: 4000, z: 85, localX: 0, localZ: 85 },
  safeZones: [
    { x: 4000, z: 85, r: 12 }, // Entrance & Waypoint safe zone (lower river valley)
    { x: 4025, z: 45, r: 12 }, // Yarlung Village safe zone
  ],
  gates: [
    {
      id: 'south',
      x: 4000,
      z: 89,
      radius: 3.5,
      to: 'stupa',
      toGate: 'north',
      labelKey: 'prompt.returnStupa',
    },
  ],
  spawns: {
    default: { x: 4000, z: 81, heading: Math.PI },
    teleport: { x: 4000, z: 81, heading: Math.PI },
    waypoint: { x: 4000, z: 83, heading: Math.PI },
    south: { x: 4000, z: 83, heading: Math.PI },
    'from-stupa': { x: 4000, z: 81, heading: Math.PI },
  },
  spawnTable: [
    {
      kind: 'wildYak',
      area: 'near',
      count: 15,
      tags: ['wildYak', 'animal'],
      positions: [
        { x: -18, z: 62 },
        { x: -26, z: 50 },
        { x: -14, z: 38 },
        { x: -28, z: 30 },
        { x: 8, z: 30 },
        { x: 20, z: 22 },
        { x: 34, z: 18 },
        { x: -16, z: 14 },
        { x: 14, z: 8 },
        { x: -26, z: 2 },
        { x: 26, z: -2 },
        { x: -18, z: -12 },
        { x: 18, z: -14 },
        { x: -28, z: -24 },
        { x: 26, z: -24 },
      ],
    },
    {
      kind: 'nyen',
      area: 'mid',
      count: 6,
      positions: [
        { x: -34, z: 36 },
        { x: -38, z: -4 },
        { x: 38, z: 0 },
        { x: 44, z: -18 },
        { x: -24, z: -38 },
        { x: 26, z: -40 },
      ],
    },
    {
      kind: 'tsen',
      area: 'deep',
      count: 4,
      positions: [
        { x: -32, z: -22 },
        { x: 32, z: -26 },
        { x: -18, z: -46 },
        { x: 18, z: -46 },
      ],
    },
  ],
  elitePacks: { champion: 2, rare: 1 },
  shrineSpots: [
    { x: -28, z: 54 },
    { x: 44, z: 24 },
    { x: -54, z: -14 },
    { x: 34, z: -50 },
  ],
  spawnAreas: {
    near: { minR: 16, maxR: 52 },
    mid: { minR: 38, maxR: 80 },
    deep: { minR: 62, maxR: 98 },
  },
  ambience: 'wild',
  enterToastKey: 'toast.enterYarlung',
  chapterIntro: {
    flag: 'ch3.introSeen',
    titleKey: 'ch3.intro.title',
    locationKey: 'ch3.intro.location',
    eraKey: 'ch3.intro.era',
    narrationKey: 'ch3.intro.narration',
    hintKey: 'ch3.intro.hint',
    startQuest: 'ch3.valley',
  },
  debugOnly: false,
  loaded: false,
  load: () => import('../../world/maps/yarlung.js'),
};

export default YARLUNG_MAP;
