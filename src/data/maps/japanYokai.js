import '../../i18n/japanYokai.js';

const SIDE_MAPS = [
  { id: 'kappaCreek', originX: 12000, level: [8, 14], color: '#477f78', kind: 'kappa', count: 7 },
  { id: 'tenguForest', originX: 12500, level: [14, 22], color: '#6b4935', kind: 'tengu', count: 6 },
  { id: 'oniPass', originX: 13000, level: [22, 30], color: '#7d403b', kind: 'akaOni', count: 5 },
];

function makeMap(spec) {
  const { id, originX, level, color, kind, count } = spec;
  return {
    id, type: 'combat', nameKey: `map.${id}`, subtitleKey: `map.${id}.subtitle`,
    origin: { x: originX, z: 0 }, level, levelRange: level, walkRadius: 68,
    minimapColor: color, waypoint: { x: originX, z: 48, localX: 0, localZ: 48 },
    safeZones: [{ x: originX, z: 52, r: 13 }],
    gates: [{ id: 'south', x: originX, z: 56, radius: 4, to: 'kii', toGate: `from-${id}`, labelKey: 'prompt.japanYokai.returnKii' }],
    spawns: {
      default: { x: originX - 3, z: 48, heading: 0 }, teleport: { x: originX - 3, z: 48, heading: 0 },
      waypoint: { x: originX + 2, z: 48, heading: 0 }, south: { x: originX, z: 50, heading: 0 },
      'from-kii': { x: originX, z: 50, heading: 0 },
    },
    spawnTable: [{ kind, area: 'near', count: Math.ceil(count / 2) }, { kind, area: 'deep', count: Math.floor(count / 2) }],
    elitePacks: { champion: 1, rare: id === 'oniPass' ? 1 : 0 },
    spawnAreas: { near: { minR: 18, maxR: 38 }, deep: { minR: 40, maxR: 59 } },
    ambience: 'wild', enterToastKey: `toast.japanYokai.${id}`, debugOnly: false, loaded: false,
    load: () => import('../../world/maps/japanYokai.js')
      .then(module => ({ createMap: ctx => module.createYokaiMap(ctx, id) })),
  };
}

export const [KAPPA_CREEK_MAP, TENGU_FOREST_MAP, ONI_PASS_MAP] = SIDE_MAPS.map(makeMap);
