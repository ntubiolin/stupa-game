/**
 * Dharma Protector Definitions (#27) — 3 summonable Tibetan guardian manifestations.
 *
 *  1. tenma    (丹瑪女神) : Ranged — floats gracefully, fires hailstone light orbs every 1.2s (ATK × 0.5 + chill)
 *  2. whiteYak (白犛牛)   : Tank   — charges enemies (ATK × 0.8 + knockback) & taunts nearby enemies every 5.0s
 *  3. pehar    (白哈爾)   : AoE    — 3-headed/crowned Dharmapala, drops a golden Dharma wheel every 3.0s in 4.0m AoE (ATK × 1.0)
 */
import '../i18n/skills.js';

export const PROTECTORS = [
  {
    id: 'tenma',
    role: 'ranged',
    roleKey: 'protector.tenma.title',
    glyph: 'ལྷ',
    icon: '❄️',
    color: 0x7dd3fc,
    baseDuration: 12.0,
    unlockFlag: 'protector.tenma',
    nameKey: 'protector.tenma.name',
    titleKey: 'protector.tenma.title',
    descKey: 'protector.tenma.desc',
    unlockHintKey: 'protector.tenma.unlockHint',
    attackInterval: 1.2,
    damageMult: 0.5,
    range: 14.0,
    chillDuration: 2.0,
    chillMult: 0.6,
  },
  {
    id: 'whiteYak',
    role: 'tank',
    roleKey: 'protector.whiteYak.title',
    glyph: 'གཡག',
    icon: '🦬',
    color: 0xf8fafc,
    baseDuration: 12.0,
    unlockFlag: 'protector.whiteYak',
    nameKey: 'protector.whiteYak.name',
    titleKey: 'protector.whiteYak.title',
    descKey: 'protector.whiteYak.desc',
    unlockHintKey: 'protector.whiteYak.unlockHint',
    attackInterval: 1.5,
    damageMult: 0.8,
    knockback: 2.4,
    tauntInterval: 5.0,
    tauntRadius: 8.0,
    tauntStun: 1.0,
    range: 10.0,
  },
  {
    id: 'pehar',
    role: 'aoe',
    roleKey: 'protector.pehar.title',
    glyph: 'པེ་ཧར',
    icon: '☸',
    color: 0xfbbf24,
    baseDuration: 12.0,
    unlockFlag: 'protector.pehar',
    nameKey: 'protector.pehar.name',
    titleKey: 'protector.pehar.title',
    descKey: 'protector.pehar.desc',
    unlockHintKey: 'protector.pehar.unlockHint',
    attackInterval: 3.0,
    damageMult: 1.0,
    aoeRadius: 4.0,
    range: 12.0,
  },
];

export const PROTECTOR_BY_ID = Object.fromEntries(
  PROTECTORS.map((p) => [p.id, p])
);

export const PROTECTORS_BY_ID = PROTECTOR_BY_ID;

export function getProtectorDef(id) {
  if (!id) return null;
  return PROTECTOR_BY_ID[id] || null;
}
