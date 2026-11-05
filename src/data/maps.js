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
    ],
    spawns: {
      default: { x: stupaSouthPt.x, z: stupaSouthPt.z, heading: 0 },
      south: { x: stupaSouthPt.x, z: stupaSouthPt.z, heading: 0 },
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
    safeZones: [
      {
        x: W.wildGate.x,
        z: W.wildGate.z,
        r: CONFIG.ENEMIES?.gateSafeRadius ?? W.safeZoneRadius ?? 10,
      },
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
      { kind: 'preta', area: 'near', count: 5, clusters: [3, 2] },
      { kind: 'tsen', area: 'mid', count: 4 },
      { kind: 'migoi', area: 'deep', count: 3 },
    ],
    spawnAreas: {
      near: { minR: 8, maxR: 26 },
      mid: { minR: 26, maxR: 46 },
      deep: { minR: 46, maxR: 65 },
    },
    ambience: 'wild',
    enterToastKey: 'toast.enterWild',
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

export function getMapDef(id) {
  return MAPS[id] || MAPS.stupa;
}
