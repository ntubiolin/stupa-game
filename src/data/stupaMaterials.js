/**
 * Data-driven definitions for Personal Votive Stupa parts, Merit unlock requirements,
 * and Samye Monastery 1,008 Perimeter Stupas Global Co-op Milestones (Ticket #60).
 */
import '../i18n/stupaBuild.js';

function createHybridPartList(category, items) {
  const arr = items.map((item) => ({
    category,
    nameKey: `stupaBuild.part.${category}.${item.id}.name`,
    descKey: `stupaBuild.part.${category}.${item.id}.desc`,
    ...item,
  }));
  for (const part of arr) {
    Object.defineProperty(arr, part.id, {
      value: part,
      enumerable: false,
      configurable: true,
    });
  }
  return arr;
}

export const STUPA_PART_CATEGORIES = ['plinth', 'dome', 'spire', 'ornament'];

export const STUPA_PARTS = {
  plinth: createHybridPartList('plinth', [
    {
      id: 'whiteStone',
      nameZh: '河岸白石座',
      nameEn: 'White River Stone Plinth',
      req: { kora: 0, prostration: 0 },
      color: 0xeae6df,
      tier: 1,
    },
    {
      id: 'lapisStone',
      nameZh: '雅隆青金石座',
      nameEn: 'Yarlung Lapis Plinth',
      req: { kora: 2 },
      color: 0x1e3a8a,
      emissive: 0x172554,
      tier: 2,
    },
    {
      id: 'alabaster',
      nameZh: '芒域雪花玉座',
      nameEn: 'Mangyul Alabaster Plinth',
      req: { prostration: 7 },
      color: 0xf8fafc,
      emissive: 0x38bdf8,
      tier: 3,
    },
    {
      id: 'vajraLotus',
      nameZh: '金剛蓮華寶座',
      nameEn: 'Vajra Lotus Plinth',
      req: { kora: 5, prostration: 18 },
      color: 0xd97706,
      emissive: 0x92400e,
      lotusPetals: true,
      tier: 4,
    },
  ]),

  dome: createHybridPartList('dome', [
    {
      id: 'whitePeace',
      nameZh: '慈悲白塔（息災）',
      nameEn: 'White Stupa of Compassion',
      req: {},
      color: 0xf5f3ef,
      trim: 0xd97706,
      tier: 1,
    },
    {
      id: 'redWisdom',
      nameZh: '般若紅塔（懷愛）',
      nameEn: 'Red Stupa of Wisdom',
      req: { kora: 1 },
      color: 0x991b1b,
      trim: 0xfbbf24,
      tier: 2,
    },
    {
      id: 'greenActivity',
      nameZh: '事業綠塔（成辦）',
      nameEn: 'Green Stupa of Activity',
      req: { prostration: 5 },
      color: 0x065f46,
      trim: 0x34d399,
      tier: 2,
    },
    {
      id: 'blackWrathful',
      nameZh: '護法黑塔（降伏）',
      nameEn: 'Black Stupa of Protection',
      req: { kora: 3 },
      color: 0x1f2937,
      trim: 0xf59e0b,
      tier: 3,
    },
    {
      id: 'crystalMandala',
      nameZh: '伏藏琉璃光塔',
      nameEn: 'Terma Crystal Mandala Stupa',
      req: { kora: 7, prostration: 27 },
      color: 0x2dd4bf,
      emissive: 0x0d9488,
      transparent: true,
      trim: 0xfde68a,
      tier: 4,
    },
  ]),

  spire: createHybridPartList('spire', [
    {
      id: 'timberSpire',
      nameZh: '檀木相輪',
      nameEn: 'Sandalwood Spire',
      req: {},
      color: 0x78350f,
      wheels: 7,
      tier: 1,
    },
    {
      id: 'copperWheels',
      nameZh: '赤銅十三天輪',
      nameEn: 'Copper 13-Wheel Spire',
      req: { prostration: 7 },
      color: 0xb45309,
      metalness: 0.7,
      wheels: 13,
      tier: 2,
    },
    {
      id: 'goldSunMoon',
      nameZh: '純金日月寶頂',
      nameEn: 'Pure Gold Sun-Moon Finial',
      req: { kora: 4, prostration: 14 },
      color: 0xfbbf24,
      emissive: 0xd97706,
      metalness: 0.85,
      sunMoon: true,
      wheels: 13,
      tier: 3,
    },
  ]),

  ornament: createHybridPartList('ornament', [
    {
      id: 'none',
      nameZh: '素淨法相',
      nameEn: 'Simple Purity',
      req: {},
      tier: 1,
    },
    {
      id: 'prayerFlags',
      nameZh: '五色風馬經幡',
      nameEn: 'Five-Color Prayer Flags',
      req: { kora: 2 },
      tier: 2,
    },
    {
      id: 'butterLamps',
      nameZh: '長明酥油燈環',
      nameEn: 'Eternal Butter-Lamp Ring',
      req: { lamp: 3 },
      tier: 2,
    },
    {
      id: 'mantraHalo',
      nameZh: '藏文六字真言金環',
      nameEn: 'Six-Syllable Golden Halo',
      req: { kora: 6, prostration: 21 },
      tier: 4,
    },
  ]),
};

export const DEFAULT_STUPA_SPEC = {
  plinth: 'whiteStone',
  dome: 'whitePeace',
  spire: 'timberSpire',
  ornament: 'none',
};

const PART_ID_ALIASES = {
  plinth: {
    stepped: 'whiteStone',
    mandala: 'lapisStone',
    lotus: 'alabaster',
    vajra: 'vajraLotus',
  },
  dome: {
    white: 'whitePeace',
    crimson: 'redWisdom',
    saffron: 'greenActivity',
    black: 'blackWrathful',
    gilded: 'crystalMandala',
  },
  spire: {
    bronze: 'timberSpire',
    turquoise: 'copperWheels',
    gold13: 'goldSunMoon',
  },
  ornament: {
    parasol: 'prayerFlags',
    moonSun: 'butterLamps',
    garuda: 'prayerFlags',
    vajraFlame: 'mantraHalo',
  },
};

/**
 * Look up a part definition by category and id, falling back to the category's default.
 */
export function getPartDef(category, partId) {
  const list = STUPA_PARTS[category];
  if (!Array.isArray(list) || list.length === 0) return null;
  const resolvedId = PART_ID_ALIASES[category]?.[partId] || partId;
  if (resolvedId && list[resolvedId]) return list[resolvedId];
  const found = list.find((p) => p.id === resolvedId);
  return found || list[0];
}

/**
 * Normalize a stupa spec object `{ plinth, dome, spire, ornament }`.
 */
export function normalizeStupaSpec(spec = {}) {
  return {
    plinth: getPartDef('plinth', spec?.plinth)?.id || DEFAULT_STUPA_SPEC.plinth,
    dome: getPartDef('dome', spec?.dome)?.id || DEFAULT_STUPA_SPEC.dome,
    spire: getPartDef('spire', spec?.spire)?.id || DEFAULT_STUPA_SPEC.spire,
    ornament: getPartDef('ornament', spec?.ornament)?.id || DEFAULT_STUPA_SPEC.ornament,
  };
}

/**
 * Checks whether a stupa part definition is unlocked given the player's `meritStats`.
 * Supports `isPartUnlocked(partDef, meritStats)` or `isPartUnlocked(category, partId, meritStats)`.
 */
export function isPartUnlocked(partDefOrCategory, meritStatsOrPartId, maybeMeritStats) {
  let partDef = partDefOrCategory;
  let meritStats = meritStatsOrPartId;
  if (typeof partDefOrCategory === 'string') {
    partDef = getPartDef(partDefOrCategory, meritStatsOrPartId);
    meritStats = maybeMeritStats;
  }
  if (!partDef) return false;
  const req = partDef.req || {};
  const stats = meritStats || {};
  const kora = Number(stats.kora) || 0;
  const prostration = Number(stats.prostration ?? stats.prostrations) || 0;
  const lamp = Number(stats.lamp ?? stats.lamps) || 0;
  const points = Number(stats.points) || 0;

  if (req.kora && kora < req.kora) return false;
  if (req.prostration && prostration < req.prostration) return false;
  if (req.lamp && lamp < req.lamp) return false;
  if (req.points && points < req.points) return false;
  return true;
}

/**
 * Format human-readable unlock requirement string for a part definition.
 */
export function formatPartReq(partDef, i18n) {
  const t = (k, p) => (i18n?.t ? i18n.t(k, p) : k);
  const req = partDef?.req || {};
  const clauses = [];
  if (req.kora > 0) {
    clauses.push(t('stupaBuild.req.kora', { n: req.kora }));
  }
  if (req.prostration > 0) {
    clauses.push(t('stupaBuild.req.prostration', { n: req.prostration }));
  }
  if (req.lamp > 0) {
    clauses.push(t('stupaBuild.req.lamp', { n: req.lamp }));
  }
  if (clauses.length === 0) {
    return t('stupaBuild.req.default');
  }
  return clauses.join(t('stupaBuild.req.join'));
}

/**
 * Global Co-op Milestones for Samye Monastery's 1,008 Perimeter Mini-Stupas.
 */
export const SAMYE_COOP_MILESTONES = [
  {
    tier: 1,
    stupas: 108,
    nameKey: 'stupaBuild.milestone.1',
    buff: { expBonus: 0.05, findBonus: 5 },
  },
  {
    tier: 2,
    stupas: 360,
    nameKey: 'stupaBuild.milestone.2',
    buff: { expBonus: 0.10, findBonus: 12 },
  },
  {
    tier: 3,
    stupas: 720,
    nameKey: 'stupaBuild.milestone.3',
    buff: { expBonus: 0.18, findBonus: 20 },
  },
  {
    tier: 4,
    stupas: 1008,
    nameKey: 'stupaBuild.milestone.4',
    buff: { expBonus: 0.30, findBonus: 35 },
  },
];

/**
 * Returns the highest unlocked milestone object for a given `contributedStupas` count (or null).
 */
export function getActiveSamyeMilestone(contributedStupas = 0) {
  const count = Math.max(0, Number(contributedStupas) || 0);
  let active = null;
  for (const m of SAMYE_COOP_MILESTONES) {
    if (count >= m.stupas) {
      active = m;
    }
  }
  return active;
}
