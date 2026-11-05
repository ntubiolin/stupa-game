/**
 * Elite Monster Affix Definitions (7 affixes for Champion packs and Rare leaders).
 */
import '../i18n/elites.js';
import { ELITE_NAME_COUNT, ELITE_STRINGS } from '../i18n/elites.js';
import { i18n } from '../i18n.js';

export const ELITE_AFFIXES = [
  {
    id: 'swift',
    nameKey: 'eliteAffix.swift',
    speedMult: 1.5,
    cooldownMult: 0.8,
  },
  {
    id: 'armored',
    nameKey: 'eliteAffix.armored',
    incomingDmgMult: 0.7,
  },
  {
    id: 'frozen',
    nameKey: 'eliteAffix.frozen',
    interval: 6.0,
    range: 14.0,
    orbCount: 3,
    orbOffsetMin: 1.5,
    orbOffsetMax: 2.5,
    fuseTime: 1.5,
    blastRadius: 1.8,
    baseDamage: 8,
    slowDuration: 2.0,
  },
  {
    id: 'molten',
    nameKey: 'eliteAffix.molten',
    trailInterval: 0.8,
    patchDuration: 3.5,
    patchRadius: 1.3,
    tickInterval: 0.5,
    tickDamage: 2,
    deathFuseTime: 1.5,
    deathBlastRadius: 2.5,
    deathDamage: 14,
  },
  {
    id: 'vengeful',
    nameKey: 'eliteAffix.vengeful',
    splitKind: 'preta',
    splitCount: 2,
  },
  {
    id: 'shielding',
    nameKey: 'eliteAffix.shielding',
    interval: 8.0,
    duration: 3.0,
  },
  {
    id: 'teleporter',
    nameKey: 'eliteAffix.teleporter',
    interval: 5.0,
    minDist: 8.0,
    targetDist: 2.2,
  },
];

export const ELITE_AFFIXES_BY_ID = Object.fromEntries(
  ELITE_AFFIXES.map((a) => [a.id, a])
);

export const ELITE_AFFIX_IDS = ELITE_AFFIXES.map((a) => a.id);

/**
 * Pick `count` distinct elite affix IDs at random.
 */
export function pickEliteAffixes(count = 1) {
  const pool = [...ELITE_AFFIX_IDS];
  const out = [];
  const n = Math.max(0, Math.min(pool.length, Math.floor(count)));
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * Roll a two-part rare monster name seed `{ a, b }`.
 */
export function rollRareMonsterSeed() {
  const a = Math.floor(Math.random() * ELITE_NAME_COUNT);
  const b = Math.floor(Math.random() * ELITE_NAME_COUNT);
  return { a, b };
}

function tElite(key, lang) {
  if (!lang) return i18n.t(key);
  const dict = ELITE_STRINGS[lang === 'en' ? 'en' : 'zh-Hant'];
  return dict?.[key] ?? i18n.t(key);
}

/**
 * Format localized overhead title for a Champion or Rare enemy.
 */
export function formatEliteTitle(enemy, lang) {
  if (!enemy) return '';
  const activeLang = lang || (i18n.lang === 'en' ? 'en' : 'zh-Hant');
  const isEn = activeLang === 'en';
  const shortKey = `enemyShort.${enemy.kind}`;
  const rawShort = tElite(shortKey, activeLang);
  const fullKey = `enemy.${enemy.kind}`;
  const rawFull = tElite(fullKey, activeLang);
  const kindStr =
    rawShort && rawShort !== shortKey
      ? rawShort
      : rawFull && rawFull !== fullKey
        ? rawFull
        : enemy.kind;

  if (enemy.rank === 'champion') {
    const firstAffix = Array.isArray(enemy.affixes) && enemy.affixes[0] ? enemy.affixes[0] : 'swift';
    const affixStr = tElite(`eliteAffix.${firstAffix}`, activeLang);
    return isEn ? `${affixStr} ${kindStr}` : `${affixStr}的${kindStr}`;
  }

  if (enemy.rank === 'rare') {
    const seed = enemy.eliteNameSeed || { a: 0, b: 0 };
    const wordA = tElite(`eliteName.a.${seed.a % ELITE_NAME_COUNT}`, activeLang);
    const wordB = tElite(`eliteName.b.${seed.b % ELITE_NAME_COUNT}`, activeLang);
    return isEn ? `${wordA} ${wordB} ${kindStr}` : `${wordA}${wordB}・${kindStr}`;
  }

  return kindStr;
}

/**
 * Format localized affix list subtitle (e.g. "冰縛・堅甲" / "Frozen · Armored").
 */
export function formatEliteAffixSubtitle(affixIds, lang) {
  if (!Array.isArray(affixIds) || affixIds.length === 0) return '';
  const activeLang = lang || (i18n.lang === 'en' ? 'en' : 'zh-Hant');
  const sep = activeLang === 'en' ? ' · ' : '・';
  return affixIds.map((id) => tElite(`eliteAffix.${id}`, activeLang)).join(sep);
}
