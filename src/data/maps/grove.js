/**
 * Outer Sanctuary Hub Map Data — Pilgrim Stupa Grove (`src/data/maps/grove.js`) — Issue #146
 *
 * Located outside the South Mountain Gate of Boudhanath Stupa (`origin = (-1000, 0)`).
 * Houses the Personal Votive Stupa Consecration Altar and the 8-slot Pilgrim Stupa Mandala Grove.
 */
import '../../i18n/maps.js';

export const GROVE_MAP = {
  id: 'grove',
  type: 'hub',
  nameKey: 'map.grove',
  origin: { x: -1000, z: 0 },
  level: [1, 40],
  walkRadius: 36,
  minimapColor: '#cfc2a9',
  waypoint: { x: -992, z: 14, localX: 8, localZ: 14 },
  safeZones: [{ x: -1000, z: 0, r: 40 }],
  gates: [
    {
      id: 'north',
      x: -1000,
      z: -33.0,
      radius: 3.2,
      to: 'stupa',
      toGate: 'from-grove',
      labelKey: 'prompt.returnStupa',
    },
  ],
  spawns: {
    default: { x: -1000, z: -27.5, heading: Math.PI },
    'from-stupa': { x: -1000, z: -27.5, heading: Math.PI },
    north: { x: -1000, z: -27.5, heading: Math.PI },
    waypoint: { x: -992, z: 16, heading: 0 },
    teleport: { x: -1000, z: -22, heading: Math.PI },
  },
  spawnTable: [],
  spawnAreas: {},
  ambience: 'stupa',
  enterToastKey: 'toast.enterGrove',
  debugOnly: false,
  load: () => import('../../world/maps/grove.js'),
};

export default GROVE_MAP;
