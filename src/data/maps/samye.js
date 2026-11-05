/**
 * Chapter 4 Map Data — Mount Hepo Ri & Samye Monastery (`src/data/maps/samye.js`) — Issue #35
 *
 * Lazy-loads the 3D scene builder from `src/world/maps/samye.js`.
 */
import '../../i18n/ch4.js';

export const SAMYE_MAP = {
  id: 'samye',
  nameKey: 'map.samye',
  subtitleKey: 'map.samye.subtitle',
  chapter: 4,
  origin: { x: 5000, z: 0 },
  walkRadius: 120,
  level: [23, 30],
  combat: true,
  unlockFlag: 'ch4.unlocked',
  safeZones: [
    // Riverside Ferry Crossing (Entrance + Waypoint)
    { x: 5000, z: 90, r: 12 },
    // Samye Construction Camp (Śāntarakṣita, King Trisong Detsen, Master Artisan)
    { x: 4970, z: 55, r: 12 },
  ],
  waypoints: [
    {
      id: 'samye',
      x: 5000,
      z: 90,
      nameKey: 'waypoint.samye.name',
      regionKey: 'waypoint.samye.region',
    },
  ],
  gates: [
    {
      from: { x: 5000, z: 95, r: 3.5 },
      toMap: 'yarlung',
      spawn: { x: 4000, z: 50, heading: 0 },
      promptKey: 'prompt.leaveWild',
    },
  ],
  spawnPos: { x: 5000, z: 86, heading: 0 },
  teleportPos: { x: 5000, z: 86, heading: 0 },
  spawnTable: [
    { kind: 'wallBreaker', count: 3, area: 'near' },
    { kind: 'du', count: 3, area: 'mid' },
    { kind: 'gyalpo', count: 2, area: 'deep' },
    { kind: 'tsen', count: 2, area: 'mid' },
  ],
  boss: 'pehar',
  sky: {
    fogColor: 0xc2b298,
    fogDensity: 0.0022,
    exposure: 0.92,
  },
  chapterIntro: {
    flag: 'ch4.introSeen',
    titleKey: 'ch4.intro.title',
    locationKey: 'ch4.intro.location',
    eraKey: 'ch4.intro.era',
    narrationKey: 'ch4.intro.narration',
    startQuest: 'ch4.foundation',
  },
  load: () => import('../../world/maps/samye.js'),
};

export default SAMYE_MAP;
