// ============================================================================
// Chapter 1 — Pharping · Yangleshö NPC Definitions (`src/data/npcs/ch1.js`)
// ============================================================================
import '../../i18n/ch1.js';

export const CH1_NPCS = [
  {
    id: 'villageElder',
    map: 'pharping',
    x: 1970,
    z: 55,
    heading: 0.35,
    look: 'villager',
    nameKey: 'npc.villageElder',
    idle: 'pray',
    quests: ['ch1.drought'],
    dialogue: [
      { if: { flag: 'ch1.rain' }, id: 'ch1.villageElder.afterRain' },
      { if: { questStep: 'ch1.drought:report_elder' }, id: 'ch1.villageElder.droughtReport' },
      { if: { questStep: 'ch1.drought:talk_elder' }, id: 'ch1.villageElder.droughtIntro' },
      { if: { questActive: 'ch1.drought' }, id: 'ch1.villageElder.droughtActive' },
      { if: { flag: 'ch1.drought.done' }, id: 'ch1.villageElder.droughtReport' },
      { id: 'ch1.villageElder.droughtIntro' },
    ],
  },
  {
    id: 'pharpingVillager1',
    map: 'pharping',
    x: 1964,
    z: 58,
    heading: 0.8,
    look: 'villager',
    nameKey: 'npc.pharpingVillager1',
    idle: 'stand',
    dialogue: [
      { if: { flag: 'ch1.rain' }, id: 'ch1.villager1.afterRain' },
      { id: 'ch1.villager1.dry' },
    ],
  },
  {
    id: 'pharpingVillager2',
    map: 'pharping',
    x: 1975,
    z: 52,
    heading: -0.6,
    look: 'villager',
    nameKey: 'npc.pharpingVillager2',
    idle: 'work',
    dialogue: [
      { if: { flag: 'ch1.rain' }, id: 'ch1.villager2.afterRain' },
      { id: 'ch1.villager2.dry' },
    ],
  },
  {
    id: 'guruVision.pharping',
    map: 'pharping',
    x: 2020,
    z: -45,
    heading: -0.45,
    look: 'vision',
    nameKey: 'npc.guruVision.pharping',
    idle: 'pray',
    showIf: { flag: 'ch1.lamps.lit' },
    quests: ['ch1.lamps', 'ch1.scrolls', 'ch1.kilaya'],
    dialogue: [
      { if: { flag: 'ch1.done' }, id: 'ch1.guruVision.done' },
      { if: { questStep: 'ch1.kilaya:report_vision' }, id: 'ch1.guruVision.kilayaComplete' },
      { if: { questActive: 'ch1.kilaya' }, id: 'ch1.guruVision.kilayaActive' },
      { if: { questStep: 'ch1.scrolls:deliver_scrolls' }, id: 'ch1.guruVision.scrollsDeliver' },
      { if: { questActive: 'ch1.scrolls' }, id: 'ch1.guruVision.scrollsActive' },
      { if: { questStep: 'ch1.lamps:talk_vision' }, id: 'ch1.guruVision.lampsTalk' },
      { id: 'ch1.guruVision.lampsTalk' },
    ],
  },
  {
    id: 'messenger',
    map: 'pharping',
    x: 1930,
    z: -40,
    heading: 1.2,
    look: 'villager',
    prop: 'sutraPack',
    nameKey: 'npc.messenger',
    idle: 'stand',
    quests: ['ch1.scrolls'],
    dialogue: [
      { if: { flag: 'ch1.escort.arrived' }, id: 'ch1.messenger.arrived' },
      { if: { questStep: 'ch1.scrolls:find_messenger' }, id: 'ch1.messenger.start' },
      { if: { questActive: 'ch1.scrolls' }, id: 'ch1.messenger.escorting' },
      { id: 'ch1.messenger.start' },
    ],
  },
];

export default CH1_NPCS;
