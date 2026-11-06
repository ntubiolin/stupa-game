/**
 * Chapter 5 Quests — Chimphu Hermitage & The Terma Realm (`src/data/quests/ch5.js`) — Issue #36
 *
 * Implements:
 *   - C5-1 `ch5.tsogyal`（「益西措嘉」）
 *   - C5-2 `ch5.firstTerma`（「第一部伏藏」）
 *   - C5-3 `ch5.epilogue`（「回到起點」）
 */
import '../../i18n/ch5.js';

export const CH5_QUESTS = [
  // ==========================================================================
  // C5-1: Yeshe Tsogyal (「益西措嘉」)
  // ==========================================================================
  {
    id: 'ch5.tsogyal',
    chapter: 'ch5',
    map: 'chimphu',
    titleKey: 'quest.ch5.tsogyal.title',
    descKey: 'quest.ch5.tsogyal.desc',
    giverNpc: 'yesheTsogyal',
    giverNpcId: 'yesheTsogyal',
    turnInNpcId: 'yesheTsogyal',
    requires: {
      flags: ['ch5.unlocked'],
    },
    autoStart: true,
    autoStartFlag: 'ch5.unlocked',
    nextQuest: 'ch5.firstTerma',
    steps: [
      {
        id: 'talk_tsogyal',
        type: 'talk',
        npc: 'yesheTsogyal',
        target: 'yesheTsogyal',
        map: 'chimphu',
        x: 6000,
        z: -16,
        textKey: 'quest.ch5.tsogyal.step.talk_tsogyal',
        labelKey: 'quest.ch5.tsogyal.step.talk_tsogyal',
        pos: { map: 'chimphu', x: 6000, z: -16 },
      },
    ],
    rewards: {
      exp: 1200,
      turquoise: 150,
      codex: ['chimphu', 'yesheTsogyal', 'terma', 'terton'],
      flags: ['ch5.tsogyal.done'],
      nextQuest: 'ch5.firstTerma',
    },
  },

  // ==========================================================================
  // C5-2: The First Terma (「第一部伏藏」)
  // ==========================================================================
  {
    id: 'ch5.firstTerma',
    chapter: 'ch5',
    map: 'chimphu',
    titleKey: 'quest.ch5.firstTerma.title',
    descKey: 'quest.ch5.firstTerma.desc',
    giverNpc: 'yesheTsogyal',
    giverNpcId: 'yesheTsogyal',
    turnInNpcId: 'yesheTsogyal',
    requires: {
      flags: ['ch5.tsogyal.done'],
    },
    autoStart: true,
    prereqQuests: ['ch5.tsogyal'],
    nextQuest: 'ch5.epilogue',
    steps: [
      {
        id: 'clear_terma_1',
        type: 'event',
        name: 'terma:cleared',
        event: 'terma:cleared',
        count: 1,
        map: 'chimphu',
        x: 6000,
        z: -40,
        textKey: 'quest.ch5.firstTerma.step.clear_terma_1',
        labelKey: 'quest.ch5.firstTerma.step.clear_terma_1',
        pos: { map: 'chimphu', x: 6000, z: -40 },
      },
      {
        id: 'report_tsogyal',
        type: 'talk',
        npc: 'yesheTsogyal',
        target: 'yesheTsogyal',
        map: 'chimphu',
        x: 6000,
        z: -16,
        textKey: 'quest.ch5.firstTerma.step.report_tsogyal',
        labelKey: 'quest.ch5.firstTerma.step.report_tsogyal',
        pos: { map: 'chimphu', x: 6000, z: -16 },
      },
    ],
    rewards: {
      exp: 1800,
      turquoise: 250,
      item: { rarity: 'terma', ilvl: 32, inDungeon: true },
      flags: ['ch5.firstTerma.done'],
      nextQuest: 'ch5.epilogue',
    },
  },

  // ==========================================================================
  // C5-3: Return to the Beginning (「回到起點」)
  // ==========================================================================
  {
    id: 'ch5.epilogue',
    chapter: 'ch5',
    map: 'stupa',
    titleKey: 'quest.ch5.epilogue.title',
    descKey: 'quest.ch5.epilogue.desc',
    giverNpc: 'yesheTsogyal',
    giverNpcId: 'yesheTsogyal',
    turnInNpcId: 'oldLama',
    requires: {
      flags: ['ch5.firstTerma.done'],
    },
    autoStart: true,
    prereqQuests: ['ch5.firstTerma'],
    steps: [
      {
        id: 'talk_old_lama',
        type: 'talk',
        npc: 'oldLama',
        target: 'oldLama',
        map: 'stupa',
        x: -6,
        z: 32,
        textKey: 'quest.ch5.epilogue.step.talk_old_lama',
        labelKey: 'quest.ch5.epilogue.step.talk_old_lama',
        pos: { map: 'stupa', x: -6, z: 32 },
      },
    ],
    rewards: {
      exp: 2000,
      turquoise: 300,
      flags: ['ch5.done', 'ch5.epilogue.done'],
      banner: 'ch5.banner.complete',
    },
  },
];

export default CH5_QUESTS;
