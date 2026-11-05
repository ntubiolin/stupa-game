/**
 * Terma (伏藏 / Legendary) item definitions.
 * Each Terma item uses a fixed base item, rolls 3 random non-duplicate affixes,
 * and carries a unique `powerId` queried via `ctx.powers.has(powerId)`.
 */

export const LEGENDARIES = [
  {
    id: 'phurbaSplit',
    powerId: 'phurbaSplit',
    baseId: 'ironPhurba',
    slot: 'mainhand',
    minIlvl: 8,
    nameKey: 'legendary.phurbaSplit.name',
    powerKey: 'legendary.phurbaSplit.power',
  },
  {
    id: 'yakFrost',
    powerId: 'yakFrost',
    baseId: 'bodhiMala',
    slot: 'neck',
    minIlvl: 1,
    nameKey: 'legendary.yakFrost.name',
    powerKey: 'legendary.yakFrost.power',
  },
  {
    id: 'tenmaOath',
    powerId: 'tenmaOath',
    baseId: 'silverRing',
    slot: 'ring',
    minIlvl: 1,
    nameKey: 'legendary.tenmaOath.name',
    powerKey: 'legendary.tenmaOath.power',
  },
  {
    id: 'bellReset',
    powerId: 'bellReset',
    baseId: 'bronzeBell',
    slot: 'offhand',
    minIlvl: 1,
    nameKey: 'legendary.bellReset.name',
    powerKey: 'legendary.bellReset.power',
  },
  {
    id: 'chimphuStill',
    powerId: 'chimphuStill',
    baseId: 'turquoiseMala',
    slot: 'neck',
    minIlvl: 12,
    nameKey: 'legendary.chimphuStill.name',
    powerKey: 'legendary.chimphuStill.power',
  },
  {
    id: 'samyeMandala',
    powerId: 'samyeMandala',
    baseId: 'brocadeRobe',
    slot: 'body',
    minIlvl: 12,
    nameKey: 'legendary.samyeMandala.name',
    powerKey: 'legendary.samyeMandala.power',
  },
];

export const LEGENDARIES_BY_ID = Object.fromEntries(
  LEGENDARIES.map((leg) => [leg.id, leg])
);
