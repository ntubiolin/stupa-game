/**
 * Equipment item base definitions across 8 equipment slots.
 * Each base defines:
 *   - id: unique identifier
 *   - slot: 'mainhand' | 'offhand' | 'head' | 'body' | 'hands' | 'feet' | 'neck' | 'ring'
 *   - minIlvl: minimum item level required for this base to drop
 *   - implicit: { stat, min, max, float? }
 *   - extraImplicit?: { stat, min, max } (e.g. Silver Damaru also grants +3% skillDamage)
 */

export const EQUIPMENT_SLOTS = [
  'mainhand',
  'offhand',
  'head',
  'body',
  'hands',
  'feet',
  'neck',
  'ring',
];

export const ITEM_BASES = [
  // ---------------------------------------------------------------- mainhand (主手法器)
  {
    id: 'bronzeVajra',
    slot: 'mainhand',
    minIlvl: 1,
    nameKey: 'itemBase.bronzeVajra',
    implicit: { stat: 'atk', min: 3, max: 5 },
  },
  {
    id: 'ironPhurba',
    slot: 'mainhand',
    minIlvl: 8,
    nameKey: 'itemBase.ironPhurba',
    implicit: { stat: 'atk', min: 7, max: 10 },
  },
  {
    id: 'silverDamaru',
    slot: 'mainhand',
    minIlvl: 16,
    nameKey: 'itemBase.silverDamaru',
    implicit: { stat: 'atk', min: 11, max: 15 },
    extraImplicit: { stat: 'skillDamage', min: 3, max: 3, noScale: true },
  },
  {
    id: 'giltVajra',
    slot: 'mainhand',
    minIlvl: 26,
    nameKey: 'itemBase.giltVajra',
    implicit: { stat: 'atk', min: 18, max: 24 },
  },

  // ---------------------------------------------------------------- offhand (副手)
  {
    id: 'bronzeBell',
    slot: 'offhand',
    minIlvl: 1,
    nameKey: 'itemBase.bronzeBell',
    implicit: { stat: 'maxMp', min: 10, max: 15 },
  },
  {
    id: 'scriptureCase',
    slot: 'offhand',
    minIlvl: 10,
    nameKey: 'itemBase.scriptureCase',
    implicit: { stat: 'cdr', min: 2, max: 4 },
  },
  {
    id: 'giltBell',
    slot: 'offhand',
    minIlvl: 24,
    nameKey: 'itemBase.giltBell',
    implicit: { stat: 'maxMp', min: 30, max: 40 },
  },

  // ---------------------------------------------------------------- head (法帽)
  {
    id: 'woolHat',
    slot: 'head',
    minIlvl: 1,
    nameKey: 'itemBase.woolHat',
    implicit: { stat: 'def', min: 2, max: 4 },
  },
  {
    id: 'brocadeHat',
    slot: 'head',
    minIlvl: 14,
    nameKey: 'itemBase.brocadeHat',
    implicit: { stat: 'def', min: 6, max: 9 },
  },

  // ---------------------------------------------------------------- body (法衣)
  {
    id: 'puluRobe',
    slot: 'body',
    minIlvl: 1,
    nameKey: 'itemBase.puluRobe',
    implicit: { stat: 'maxHp', min: 15, max: 25 },
  },
  {
    id: 'brocadeRobe',
    slot: 'body',
    minIlvl: 12,
    nameKey: 'itemBase.brocadeRobe',
    implicit: { stat: 'maxHp', min: 40, max: 60 },
  },
  {
    id: 'goldThreadRobe',
    slot: 'body',
    minIlvl: 26,
    nameKey: 'itemBase.goldThreadRobe',
    implicit: { stat: 'maxHp', min: 80, max: 110 },
  },

  // ---------------------------------------------------------------- hands (護腕)
  {
    id: 'leatherBracers',
    slot: 'hands',
    minIlvl: 1,
    nameKey: 'itemBase.leatherBracers',
    implicit: { stat: 'def', min: 1, max: 3 },
  },
  {
    id: 'silverBracers',
    slot: 'hands',
    minIlvl: 14,
    nameKey: 'itemBase.silverBracers',
    implicit: { stat: 'critChance', min: 1, max: 2 },
  },

  // ---------------------------------------------------------------- feet (藏靴)
  {
    id: 'feltBoots',
    slot: 'feet',
    minIlvl: 1,
    nameKey: 'itemBase.feltBoots',
    implicit: { stat: 'moveSpeed', min: 2, max: 4 },
  },
  {
    id: 'embroideredBoots',
    slot: 'feet',
    minIlvl: 16,
    nameKey: 'itemBase.embroideredBoots',
    implicit: { stat: 'moveSpeed', min: 4, max: 6 },
  },

  // ---------------------------------------------------------------- neck (念珠)
  {
    id: 'bodhiMala',
    slot: 'neck',
    minIlvl: 1,
    nameKey: 'itemBase.bodhiMala',
    implicit: { stat: 'mpRegen', min: 0.3, max: 0.5, float: true },
  },
  {
    id: 'turquoiseMala',
    slot: 'neck',
    minIlvl: 12,
    nameKey: 'itemBase.turquoiseMala',
    implicit: { stat: 'mpRegen', min: 0.6, max: 1.0, float: true },
  },

  // ---------------------------------------------------------------- ring (戒指)
  {
    id: 'silverRing',
    slot: 'ring',
    minIlvl: 1,
    nameKey: 'itemBase.silverRing',
    implicit: { stat: 'atk', min: 1, max: 3 },
  },
  {
    id: 'coralRing',
    slot: 'ring',
    minIlvl: 10,
    nameKey: 'itemBase.coralRing',
    implicit: { stat: 'critDamage', min: 5, max: 10 },
  },
];

export const ITEM_BASES_BY_ID = Object.fromEntries(
  ITEM_BASES.map((base) => [base.id, base])
);

export function getBasesForSlot(slot, ilvl = 1) {
  const candidates = ITEM_BASES.filter(
    (b) => (!slot || b.slot === slot) && b.minIlvl <= ilvl
  );
  if (candidates.length > 0) return candidates;
  return ITEM_BASES.filter((b) => !slot || b.slot === slot);
}
