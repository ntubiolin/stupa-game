// ============================================================================
// Chapter 3 — Yarlung Valley · Yarlha Shampo Dialogue Trees
// (`src/data/dialogues/ch3.js`)
// ============================================================================
import '../../i18n/ch3.js';

export const CH3_DIALOGUES = {
  // 1. Palace Keeper (`palaceKeeper`) — Quest C3-1 Completion & C3-2 / C3-3 Start
  'ch3.palaceKeeper.valleyIntro': {
    id: 'ch3.palaceKeeper.valleyIntro',
    nodes: {
      start: {
        speaker: 'npc.palaceKeeper',
        look: 'lama',
        textKey: 'dlg.ch3.keeper.valleyIntro.1',
        actions: [
          { type: 'startQuest', id: 'ch3.valley' },
          { type: 'completeStep', id: 'ch3.valley', step: 'reach_palace' },
          { type: 'unlockCodex', id: 'yarlungValley' },
          { type: 'unlockCodex', id: 'yumbulagang' },
        ],
        next: 'n2',
      },
      n2: {
        speaker: 'npc.palaceKeeper',
        look: 'lama',
        textKey: 'dlg.ch3.keeper.valleyIntro.2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.palaceKeeper',
        look: 'lama',
        textKey: 'dlg.ch3.keeper.valleyIntro.3',
        actions: [
          { type: 'unlockCodex', id: 'sheldrak' },
          { type: 'unlockCodex', id: 'terma' },
          { type: 'completeStep', id: 'ch3.valley', step: 'talk_keeper' },
          { type: 'startQuest', id: 'ch3.yaks' },
          { type: 'startQuest', id: 'ch3.sheldrak' },
        ],
        choices: [
          {
            textKey: 'dlg.ch3.keeper.valleyIntro.choice.accept',
            labelKey: 'dlg.ch3.keeper.valleyIntro.choice.accept',
            actions: [
              { type: 'completeStep', id: 'ch3.valley', step: 'talk_keeper' },
              { type: 'startQuest', id: 'ch3.yaks' },
              { type: 'startQuest', id: 'ch3.sheldrak' },
            ],
            next: null,
          },
          {
            textKey: 'dlg.ch3.keeper.valleyIntro.choice.askSheldrak',
            labelKey: 'dlg.ch3.keeper.valleyIntro.choice.askSheldrak',
            actions: [
              { type: 'unlockCodex', id: 'sheldrak' },
              { type: 'unlockCodex', id: 'terma' },
            ],
            next: 'ask_sheldrak',
          },
        ],
      },
      ask_sheldrak: {
        speaker: 'npc.palaceKeeper',
        look: 'lama',
        textKey: 'dlg.ch3.keeper.valleyIntro.askReply',
        choices: [
          {
            textKey: 'dlg.ch3.keeper.valleyIntro.choice.accept',
            labelKey: 'dlg.ch3.keeper.valleyIntro.choice.accept',
            actions: [
              { type: 'completeStep', id: 'ch3.valley', step: 'talk_keeper' },
              { type: 'startQuest', id: 'ch3.yaks' },
              { type: 'startQuest', id: 'ch3.sheldrak' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 2. Palace Keeper — After C3-1 Done
  'ch3.palaceKeeper.afterValley': {
    id: 'ch3.palaceKeeper.afterValley',
    nodes: {
      start: {
        speaker: 'npc.palaceKeeper',
        look: 'lama',
        textKey: 'dlg.ch3.keeper.afterValley.1',
        choices: [
          {
            textKey: 'dlg.ch3.keeper.afterValley.choice.ok',
            labelKey: 'dlg.ch3.keeper.afterValley.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 3. Herder (`herder`) — Quest C3-3 Active
  'ch3.herder.yaksActive': {
    id: 'ch3.herder.yaksActive',
    nodes: {
      start: {
        speaker: 'npc.herder',
        look: 'villager',
        textKey: 'dlg.ch3.herder.yaksActive.1',
        choices: [
          {
            textKey: 'dlg.ch3.herder.yaksActive.choice.ok',
            labelKey: 'dlg.ch3.herder.yaksActive.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 4. Herder (`herder`) — Quest C3-3 Report & Start C3-4 (`ch3.shampo`)
  'ch3.herder.yaksReport': {
    id: 'ch3.herder.yaksReport',
    nodes: {
      start: {
        speaker: 'npc.herder',
        look: 'villager',
        textKey: 'dlg.ch3.herder.yaksReport.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.herder',
        look: 'villager',
        textKey: 'dlg.ch3.herder.yaksReport.2',
        actions: [
          { type: 'unlockCodex', id: 'yarlhaShampo' },
          { type: 'unlockCodex', id: 'nyen' },
          { type: 'completeStep', id: 'ch3.yaks', step: 'talk_herder' },
          { type: 'startQuest', id: 'ch3.shampo' },
        ],
        choices: [
          {
            textKey: 'dlg.ch3.herder.yaksReport.choice.accept',
            labelKey: 'dlg.ch3.herder.yaksReport.choice.accept',
            actions: [
              { type: 'completeStep', id: 'ch3.yaks', step: 'talk_herder' },
              { type: 'startQuest', id: 'ch3.shampo' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 5. Herder — After C3-3 Done
  'ch3.herder.afterShampo': {
    id: 'ch3.herder.afterShampo',
    nodes: {
      start: {
        speaker: 'npc.herder',
        look: 'villager',
        textKey: 'dlg.ch3.herder.afterShampo.1',
        choices: [
          {
            textKey: 'dlg.ch3.herder.afterShampo.choice.ok',
            labelKey: 'dlg.ch3.herder.afterShampo.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 6. Yarlung Villagers (`yarlungVillager1`, `yarlungVillager2`)
  'ch3.villager1.default': {
    id: 'ch3.villager1.default',
    nodes: {
      start: {
        speaker: 'npc.yarlungVillager1',
        look: 'villager',
        textKey: 'dlg.ch3.villager1.default',
        actions: [
          { type: 'unlockCodex', id: 'yarlungValley' },
          { type: 'unlockCodex', id: 'yumbulagang' },
        ],
      },
    },
  },
  'ch3.villager2.default': {
    id: 'ch3.villager2.default',
    nodes: {
      start: {
        speaker: 'npc.yarlungVillager2',
        look: 'villager',
        textKey: 'dlg.ch3.villager2.default',
        actions: [
          { type: 'unlockCodex', id: 'nyen' },
          { type: 'unlockCodex', id: 'sheldrak' },
        ],
      },
    },
  },

  // 7. Guru Rinpoche Pure Vision (`guruVision.yarlung`) — Quest C3-4 Active
  'ch3.guruVision.shampoActive': {
    id: 'ch3.guruVision.shampoActive',
    nodes: {
      start: {
        speaker: 'npc.guruVision.yarlung',
        look: 'vision',
        textKey: 'dlg.ch3.vision.shampoActive.1',
        choices: [
          {
            textKey: 'dlg.ch3.vision.shampoActive.choice.ok',
            labelKey: 'dlg.ch3.vision.shampoActive.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 8. Guru Rinpoche Pure Vision — Quest C3-4 Complete (Imparts Lotus Shield [4], unlocks Samye Ch.4)
  'ch3.guruVision.shampoComplete': {
    id: 'ch3.guruVision.shampoComplete',
    nodes: {
      start: {
        speaker: 'npc.guruVision.yarlung',
        look: 'vision',
        textKey: 'dlg.ch3.vision.shampoComplete.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.guruVision.yarlung',
        look: 'vision',
        textKey: 'dlg.ch3.vision.shampoComplete.2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.guruVision.yarlung',
        look: 'vision',
        textKey: 'dlg.ch3.vision.shampoComplete.3',
        actions: [
          { type: 'unlockCodex', id: 'yarlhaShampo' },
          { type: 'unlockCodex', id: 'nyen' },
          { type: 'unlockCodex', id: 'eightClasses' },
          { type: 'completeStep', id: 'ch3.shampo', step: 'talk_vision' },
        ],
        choices: [
          {
            textKey: 'dlg.ch3.vision.shampoComplete.choice.complete',
            labelKey: 'dlg.ch3.vision.shampoComplete.choice.complete',
            actions: [
              { type: 'completeStep', id: 'ch3.shampo', step: 'talk_vision' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 9. Guru Rinpoche Pure Vision — Post-Chapter 3 Completed
  'ch3.guruVision.done': {
    id: 'ch3.guruVision.done',
    nodes: {
      start: {
        speaker: 'npc.guruVision.yarlung',
        look: 'vision',
        textKey: 'dlg.ch3.vision.done.1',
        choices: [
          {
            textKey: 'dlg.ch3.vision.done.choice.ok',
            labelKey: 'dlg.ch3.vision.done.choice.ok',
            next: null,
          },
        ],
      },
    },
  },
};

export default CH3_DIALOGUES;
