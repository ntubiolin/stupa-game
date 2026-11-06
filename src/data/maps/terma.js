/**
 * Chapter 5 Procedural Dungeon Map Data — The Terma Realm (`terma`, `src/data/maps/terma.js`) — Issue #36
 *
 * Origin: (7000, 0), walkRadius: 80, level: [31, 40], type: 'dungeon', combat: true.
 * Note: `spawnTable` is empty because `src/gameplay/dungeon.js` spawns monsters and elite packs
 * procedurally per room on each of the 3 floors.
 */
import '../../i18n/ch5.js';

export const TERMA_MAP = {
  id: 'terma',
  type: 'dungeon',
  nameKey: 'map.terma',
  subtitleKey: 'map.terma.subtitle',
  chapter: 5,
  origin: { x: 7000, z: 0 },
  walkRadius: 80,
  level: [31, 40],
  combat: true,
  minimapColor: '#231f33',

  atmosphere: {
    skyTop: '#080711',
    skyHorizon: '#17152b',
    fogColor: '#121024',
    fogNear: 28,
    fogFar: 135,
    sunColor: '#a5f3fc',
    sunIntensity: 0.92,
    hemiSky: '#38bdf8',
    hemiGround: '#1e1b4b',
    hemiIntensity: 0.68,
  },

  spawns: {
    default: { x: 7000, z: 0, heading: 0 },
    start: { x: 7000, z: 0, heading: 0 },
  },

  gates: [],
  landmarks: [],
  spawnTable: [],
  eliteChance: 0,
  maxActiveEnemies: 32,
};

export default TERMA_MAP;
