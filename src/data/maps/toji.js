/**
 * Kōbō Daishi Kūkai Epic Hub Map Data — Kyoto Tō-ji (`src/data/maps/toji.js`) — Issue #250
 *
 * Kyō-ō-gokoku-ji (教王護國寺 / 東寺), granted to Kūkai by Emperor Saga in Kōnin 14 (823 CE)
 * as the fundamental Shingon sanctuary for protecting the nation.
 * Features the Five-Story Pagoda (`五重塔`), Kondō (`金堂・藥師三尊與十二神將`),
 * Kōdō (`講堂・二十一尊立體曼荼羅`), Nandaimon (`南大門`), and Hyōtan-ike Pond (`瓢箪池`).
 */
import '../../i18n/toji.js';
import { JAPAN_CHAPTERS } from '../japan.js';

const { origin } = JAPAN_CHAPTERS[1];

export const TOJI_MAP = {
  id: 'toji',
  type: 'hub',
  nameKey: 'map.toji',
  subtitleKey: 'map.toji.subtitle',
  origin,
  walkRadius: 105,
  level: [1, 40],
  minimapColor: '#9c8d74',
  waypoint: { x: 7500, z: 68, localX: 0, localZ: 68 },
  waypoints: [
    {
      id: 'toji',
      x: 7500,
      z: 68,
      nameKey: 'waypoint.toji.name',
      regionKey: 'waypoint.toji.region',
    },
  ],
  safeZones: [{ x: 7500, z: 0, r: 110 }],
  gates: [
    {
      id: 'south',
      x: 7500,
      z: 82,
      radius: 4.0,
      to: 'qinglong',
      toGate: 'from-toji',
      labelKey: 'prompt.japan.travel.qinglong',
    },
    {
      id: 'return',
      x: origin.x - 23,
      z: 70,
      radius: 3.3,
      to: 'stupa',
      toGate: 'south',
      labelKey: 'prompt.returnStupa',
    },
    {
      id: 'north',
      x: 7500,
      z: -78,
      radius: 4.0,
      to: 'kii',
      toGate: 'from-toji',
      labelKey: 'prompt.japan.travel.kii',
      chapterRequired: true,
    },
  ],
  spawns: {
    default: { x: 7500, z: 72, heading: 0 },
    south: { x: 7500, z: 74, heading: 0 },
    'from-qinglong': { x: origin.x, z: 74, heading: 0 },
    'from-kii': { x: origin.x, z: -70, heading: Math.PI },
    'from-stupa': { x: 7500, z: 74, heading: 0 },
    'from-koyasan': { x: 7500, z: -70, heading: Math.PI },
    waypoint: { x: 7500, z: 66, heading: 0 },
    teleport: { x: 7500, z: 70, heading: 0 },
    gojunoto: { x: 7536, z: 34, heading: 0 },
    kondo: { x: 7500, z: 26, heading: 0 },
    kodo: { x: 7500, z: -18, heading: 0 },
  },
  spawnPos: { x: 7500, z: 72, heading: 0 },
  teleportPos: { x: 7500, z: 70, heading: 0 },
  spawnTable: [],
  spawnAreas: {},
  ambience: 'stupa',
  enterToastKey: 'toast.enterToji',
  debugOnly: false,
  sky: {
    fogColor: 0xd4c5b0,
    fogDensity: 0.002,
    exposure: 0.96,
  },
  load: () => import('../../world/maps/toji.js'),
};

export default TOJI_MAP;
