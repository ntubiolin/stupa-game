// ============================================================================
// Chapter 3 — Yarlung Valley · Yarlha Shampo NPC Definitions (`src/data/npcs/ch3.js`)
// ============================================================================
import '../../i18n/ch3.js';

export const CH3_NPCS = [
  {
    id: 'palaceKeeper',
    map: 'yarlung',
    x: 3955,
    z: 20,
    heading: 0.75,
    look: 'lama',
    nameKey: 'npc.palaceKeeper',
    idle: 'pray',
    quests: ['ch3.valley', 'ch3.sheldrak'],
    dialogue: [
      { if: { questStep: 'ch3.valley:talk_keeper' }, id: 'ch3.palaceKeeper.valleyIntro' },
      { if: { questStep: 'ch3.valley:reach_palace' }, id: 'ch3.palaceKeeper.valleyIntro' },
      { if: { flag: 'ch3.valley.done' }, id: 'ch3.palaceKeeper.afterValley' },
      { id: 'ch3.palaceKeeper.valleyIntro' },
    ],
  },
  {
    id: 'herder',
    map: 'yarlung',
    x: 4025,
    z: 45,
    heading: -0.45,
    look: 'villager',
    nameKey: 'npc.herder',
    idle: 'stand',
    quests: ['ch3.yaks'],
    dialogue: [
      { if: { flag: 'ch3.done' }, id: 'ch3.herder.afterShampo' },
      { if: { questStep: 'ch3.yaks:talk_herder' }, id: 'ch3.herder.yaksReport' },
      { if: { questActive: 'ch3.yaks' }, id: 'ch3.herder.yaksActive' },
      { if: { flag: 'ch3.yaks.done' }, id: 'ch3.herder.afterShampo' },
      { id: 'ch3.herder.yaksActive' },
    ],
  },
  {
    id: 'yarlungVillager1',
    map: 'yarlung',
    x: 4020,
    z: 50,
    heading: 0.6,
    look: 'villager',
    nameKey: 'npc.yarlungVillager1',
    idle: 'work',
    dialogue: [
      { id: 'ch3.villager1.default' },
    ],
  },
  {
    id: 'yarlungVillager2',
    map: 'yarlung',
    x: 4014,
    z: 46,
    heading: 0.25,
    look: 'villager',
    nameKey: 'npc.yarlungVillager2',
    idle: 'stand',
    dialogue: [
      { id: 'ch3.villager2.default' },
    ],
  },
  {
    id: 'guruVision.yarlung',
    map: 'yarlung',
    x: 4000,
    z: -52,
    heading: 0.0,
    look: 'vision',
    nameKey: 'npc.guruVision.yarlung',
    idle: 'pray',
    quests: ['ch3.shampo'],
    dialogue: [
      { if: { flag: 'ch3.done' }, id: 'ch3.guruVision.done' },
      { if: { questStep: 'ch3.shampo:talk_vision' }, id: 'ch3.guruVision.shampoComplete' },
      { if: { flag: 'boss.yarlhaShampo' }, id: 'ch3.guruVision.shampoComplete' },
      { if: { questActive: 'ch3.shampo' }, id: 'ch3.guruVision.shampoActive' },
      { id: 'ch3.guruVision.shampoActive' },
    ],
  },
];

export default CH3_NPCS;
