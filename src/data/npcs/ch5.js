/**
 * Chapter 5 — Chimphu Hermitage NPC Definitions (`src/data/npcs/ch5.js`) — Issue #36
 *
 *   - `yesheTsogyal` (`look: 'yogini'`, `x: 6000, z: -16`, `map: 'chimphu'`)
 *   - `chimphuRetreatant1` (`look: 'lama'`, `x: 5985, z: -4`, `map: 'chimphu'`)
 *   - `chimphuRetreatant2` (`look: 'lama'`, `x: 6016, z: -6`, `map: 'chimphu'`)
 *   - `guruVision.chimphu` (`look: 'vision'`, `x: 6000, z: -24`, `map: 'chimphu'`)
 */
import '../../i18n/ch5.js';

export const CH5_NPCS = [
  {
    id: 'yesheTsogyal',
    map: 'chimphu',
    x: 6000,
    z: -16,
    heading: 0,
    look: 'yogini',
    nameKey: 'npc.yesheTsogyal',
    titleKey: 'npc.yesheTsogyal.title',
    idle: 'pray',
    quests: ['ch5.tsogyal', 'ch5.firstTerma', 'ch5.epilogue'],
    dialogue: [
      { if: { questStep: 'ch5.firstTerma:report_tsogyal' }, id: 'ch5.yesheTsogyal.report' },
      { if: { questActive: 'ch5.firstTerma' }, id: 'ch5.yesheTsogyal.active' },
      { if: { flag: 'ch5.firstTerma.done' }, id: 'ch5.yesheTsogyal.after' },
      { if: { questStep: 'ch5.tsogyal:talk_tsogyal' }, id: 'ch5.yesheTsogyal.intro' },
      { if: { flag: 'ch5.tsogyal.done' }, id: 'ch5.yesheTsogyal.active' },
      { id: 'ch5.yesheTsogyal.intro' },
    ],
  },
  {
    id: 'chimphuRetreatant1',
    map: 'chimphu',
    x: 5985,
    z: -4,
    heading: 0.4,
    look: 'lama',
    nameKey: 'npc.chimphuRetreatant1',
    titleKey: 'npc.chimphuRetreatant1.title',
    idle: 'pray',
    dialogue: 'ch5.retreatant1',
  },
  {
    id: 'chimphuRetreatant2',
    map: 'chimphu',
    x: 6016,
    z: -6,
    heading: -0.4,
    look: 'lama',
    nameKey: 'npc.chimphuRetreatant2',
    titleKey: 'npc.chimphuRetreatant2.title',
    idle: 'pray',
    dialogue: 'ch5.retreatant2',
  },
  {
    id: 'guruVision.chimphu',
    map: 'chimphu',
    x: 6000,
    z: -24,
    heading: 0,
    look: 'vision',
    nameKey: 'npc.guruVision.chimphu',
    titleKey: 'npc.guruVision.chimphu.title',
    idle: 'pray',
    showIf: { notFlag: 'ch5.done' },
    dialogue: 'ch5.guruVision',
  },
];

export default CH5_NPCS;
