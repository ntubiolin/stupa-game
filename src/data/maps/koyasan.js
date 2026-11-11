/**
 * Mount Kōya Sacred Sanctuary Map Data (`koyasan`, `src/data/maps/koyasan.js`) — Issue #249
 *
 * Head Temple of Shingon Buddhism founded by Kōbō Daishi Kūkai in 816 CE:
 *   - West Precinct: Danjō Garan (`壇上伽藍`: Chūmon, Konpon Daitō, Kondō, Miedō, Sanko-no-Matsu)
 *   - Center Precinct: Kongōbu-ji (`金剛峯寺`: Seimon, Omo-ya Main Hall with rooftop water tubs, Banryūtei Dragon Rock Garden)
 *   - East/Northeast Precinct: Okunoin (`奧之院`: Millennium Cedar Avenue, Gorintō Memorial Forest, Tamagawa & Gobyōbashi, Tōrōdō, Kōbō Daishi Gobyō)
 */
import '../../i18n/koyasan.js';
import { JAPAN_CHAPTERS } from '../japan.js';

const { origin } = JAPAN_CHAPTERS[3];

export const KOYASAN_MAP = {
  id: 'koyasan',
  type: 'hub',
  nameKey: 'map.koyasan',
  subtitleKey: 'map.koyasan.subtitle',
  origin,
  walkRadius: 115,
  level: [1, 40],
  combat: false,
  minimapColor: '#5c7258',

  waypoint: {
    id: 'koyasan',
    x: 8000,
    z: 72,
    localX: 0,
    localZ: 72,
    nameKey: 'waypoint.koyasan.name',
    regionKey: 'waypoint.koyasan.region',
  },

  waypoints: [
    {
      id: 'koyasan',
      x: 8000,
      z: 72,
      nameKey: 'waypoint.koyasan.name',
      regionKey: 'waypoint.koyasan.region',
    },
  ],

  safeZones: [
    { x: 8000, z: 0, r: 120 },
  ],

  gates: [
    {
      id: 'south',
      x: 8000,
      z: 88,
      radius: 4.0,
      to: 'kii',
      toGate: 'from-koyasan',
      labelKey: 'prompt.japan.travel.kii',
    },
    {
      id: 'east',
      x: origin.x + 16,
      z: 22,
      radius: 3.3,
      to: 'kongobuji',
      toGate: 'from-koyasan',
      labelKey: 'prompt.japan.travel.kongobuji',
      chapterRequired: true,
    },
    {
      id: 'west',
      x: 7945,
      z: 72,
      radius: 4.0,
      to: 'stupa',
      toGate: 'south',
      labelKey: 'prompt.returnStupa',
    },
  ],

  spawns: {
    default: { x: 8000, z: 78, heading: 0 },
    south: { x: 8000, z: 80, heading: 0 },
    'from-kii': { x: origin.x, z: 80, heading: 0 },
    'from-kongobuji': { x: origin.x + 16, z: 29, heading: 0 },
    'from-toji': { x: 8000, z: 80, heading: 0 },
    'from-stupa': { x: 7952, z: 72, heading: Math.PI * 0.5 },
    waypoint: { x: 8000, z: 70, heading: 0 },
    teleport: { x: 8000, z: 76, heading: 0 },
    garan: { x: 7955, z: 32, heading: 0 },
    kongobuji: { x: 8000, z: 18, heading: 0 },
    okunoin: { x: 8048, z: -8, heading: 0 },
  },

   landmarks: [
    { id: 'konponDaito', x: 7938, z: 6, r: 8, kind: 'stupa', nameKey: 'prompt.koyasan.konponDaito' },
    { id: 'kondo', x: 7966, z: 8, r: 7, kind: 'temple', nameKey: 'prompt.koyasan.kondo' },
    { id: 'miedoSanko', x: 7953, z: -12, r: 6, kind: 'shrine', nameKey: 'prompt.koyasan.miedoSanko' },
    { id: 'kongobuji', x: 8000, z: -8, r: 9, kind: 'temple', nameKey: 'prompt.koyasan.kongobuji' },
    { id: 'torodo', x: 8048, z: -42, r: 7, kind: 'temple', nameKey: 'prompt.koyasan.torodo' },
    { id: 'gobyo', x: 8048, z: -66, r: 7, kind: 'shrine', nameKey: 'prompt.koyasan.gobyo' },
  ],

  spawnTable: [],
  spawnAreas: {},
  ambience: 'stupa',
  enterToastKey: 'toast.enterKoyasan',
  debugOnly: false,

  sky: {
    fogColor: 0x9eb2a8,
    fogDensity: 0.0024,
    exposure: 0.94,
  },

  load: () => import('../../world/maps/koyasan.js'),
};

export default KOYASAN_MAP;
