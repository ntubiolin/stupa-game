// ============================================================================
// Mangyul Pass (芒域山口・吉隆) Map Definition — Chapter 2
// Auto-discovered by src/data/maps.js via import.meta.glob('./maps/*.js')
// ============================================================================
import '../../i18n/ch2.js';

export const MANGYUL_MAP = {
  id: 'mangyul',
  type: 'combat',
  combat: true,
  nameKey: 'map.mangyul',
  origin: { x: 3000, z: 0 },
  walkRadius: 110,
  level: [10, 16],
  levelRange: [10, 16],
  minimapColor: '#5c8fb8',
  unlockFlag: 'ch2.unlocked',
  waypoint: { x: 3000, z: 85, localX: 0, localZ: 85 },
  safeZones: [
    { x: 3000, z: 85, r: 12 }, // Southern entrance & Waypoint (Kyirong woodland)
    { x: 3010, z: 50, r: 10 }, // Tibetan Envoy Camp
  ],
  gates: [
    {
      id: 'south',
      x: 3000,
      z: 92,
      pos: { x: 3000, z: 92 },
      radius: 3.5,
      to: 'stupa',
      toGate: 'north',
      spawn: { x: 3000, z: 85, heading: Math.PI },
      labelKey: 'prompt.returnStupa',
    },
  ],
  spawns: {
    default: { x: 3000, z: 85, heading: Math.PI },
    teleport: { x: 3000, z: 85, heading: Math.PI },
    waypoint: { x: 3000, z: 85, heading: Math.PI },
    south: { x: 3000, z: 85, heading: Math.PI },
  },
  spawnTable: [
    { kind: 'snowSprite', area: 'near', count: 6 },
    { kind: 'hailGhost', area: 'mid', count: 5 },
    { kind: 'avalancheBrute', area: 'deep', count: 3 },
    { kind: 'migoi', area: 'deep', count: 3 },
  ],
  spawnAreas: {
    near: { minR: 16, maxR: 48 },
    mid: { minR: 35, maxR: 74 },
    deep: { minR: 58, maxR: 98 },
  },
  elitePacks: { champion: 2, rare: 1 },
  shrineSpots: [
    { x: -16, z: 58, area: 'near' },
    { x: 24, z: 4, area: 'mid' },
    { x: -26, z: -42, area: 'deep' },
  ],
  chapterIntro: {
    flag: 'ch2.introSeen',
    locationKey: 'ch2.intro.location',
    eraKey: 'ch2.intro.era',
    titleKey: 'ch2.intro.title',
    narrationKey: 'ch2.intro.narration',
    hintKey: 'ch2.intro.hint',
    startQuest: 'ch2.envoy',
  },
  load: () => import('../../world/maps/mangyul.js'),
};

export default MANGYUL_MAP;
