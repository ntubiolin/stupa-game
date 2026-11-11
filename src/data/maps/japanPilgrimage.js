import { JAPAN_CHAPTERS } from '../japan.js';
import '../../i18n/japanMaps.js';

function makePilgrimageMap(id, { walkRadius, fogColor, fogDensity, minimapColor, gateIn, gateOut, load }) {
  const index = JAPAN_CHAPTERS.findIndex(chapter => chapter.id === id);
  const { origin } = JAPAN_CHAPTERS[index];
  const previous = JAPAN_CHAPTERS[index - 1]?.mapId ?? 'stupa';
  const next = JAPAN_CHAPTERS[index + 1]?.mapId;
  const [inX, inZ] = gateIn;
  const point = (x, z) => ({ x: origin.x + x, z: origin.z + z });
  const spawn = (x, z, heading = 0) => ({ ...point(x, z), heading });
  const gate = (gateId, [x, z], to, toGate, chapterRequired = false) => ({
    id: gateId,
    ...point(x, z),
    radius: 3.3,
    to,
    toGate,
    chapterRequired,
    labelKey: to === 'stupa' ? 'prompt.returnStupa' : `prompt.japan.travel.${to}`,
  });
  const gates = [gate('south', gateIn, previous, previous === 'stupa' ? 'south' : `from-${id}`)];
  const spawns = {
    default: spawn(inX, inZ - 8),
    teleport: spawn(inX, inZ - 8),
    waypoint: spawn(inX + 1.8, inZ - 10),
    [`from-${previous}`]: spawn(inX, inZ - 8),
  };

  if (next) {
    const [x, z] = gateOut;
    gates.push(gate('north', gateOut, next, `from-${id}`, true));
    spawns[`from-${next}`] = spawn(x, z + 6, Math.PI);
  } else {
    gates.push(gate('return', gateOut, 'stupa', 'south'));
  }

  return {
    id,
    type: 'hub',
    nameKey: `map.${id}`,
    subtitleKey: `map.${id}.subtitle`,
    origin,
    walkRadius,
    level: [1, 40],
    combat: false,
    minimapColor,
    waypoint: { ...point(inX + 3.8, inZ - 10), localX: inX + 3.8, localZ: inZ - 10 },
    safeZones: [{ ...origin, r: walkRadius }],
    gates,
    spawns,
    ambience: 'stupa',
    enterToastKey: `toast.japan.arrival.${id}`,
    sky: { fogColor, fogDensity },
    load,
  };
}

const load = createMap => import('../../world/maps/japanPilgrimage.js')
  .then(module => ({ createMap: module[createMap] }));

export const QINGLONG_MAP = makePilgrimageMap('qinglong', {
  walkRadius: 74, fogColor: 0xc8ad91, fogDensity: 0.0041, minimapColor: '#a28462',
  gateIn: [0, 50], gateOut: [0, -54], load: () => load('createQinglongMap'),
});

export const KII_MAP = makePilgrimageMap('kii', {
  walkRadius: 71, fogColor: 0x8ca8a1, fogDensity: 0.010, minimapColor: '#466958',
  gateIn: [0, 58], gateOut: [0, -53], load: () => load('createKiiMap'),
});

for (const [id, x] of [['kappaCreek', -25], ['tenguForest', 0], ['oniPass', 25]]) {
  KII_MAP.gates.push({ id: `side-${id}`, ...KII_MAP.origin, x: KII_MAP.origin.x + x, z: KII_MAP.origin.z - 42,
    radius: 3.3, to: id, toGate: 'from-kii', labelKey: `prompt.japanYokai.enter.${id}` });
  KII_MAP.spawns[`from-${id}`] = { x: KII_MAP.origin.x + x, z: KII_MAP.origin.z - 37, heading: Math.PI };
}

export const KONGOBUJI_MAP = makePilgrimageMap('kongobuji', {
  walkRadius: 69, fogColor: 0xd4c6ac, fogDensity: 0.004, minimapColor: '#a89b79',
  gateIn: [0, 48], gateOut: [31, -36], load: () => load('createKongobujiMap'),
});

export const OKUNOIN_MAP = makePilgrimageMap('okunoin', {
  walkRadius: 74, fogColor: 0x9ea8a9, fogDensity: 0.0077, minimapColor: '#687770',
  gateIn: [0, 61], gateOut: [17, -50], load: () => load('createOkunoinMap'),
});
