/**
 * Chapter 5 — Chimphu Hermitage & Terma Realm Dialogue Trees (`src/data/dialogues/ch5.js`) — Issue #36
 */
import '../../i18n/ch5.js';

export const CH5_DIALOGUES = {
  // 1. Yeshe Tsogyal — C5-1 Intro & Transition to C5-2 (`ch5.firstTerma`)
  'ch5.yesheTsogyal.intro': {
    id: 'ch5.yesheTsogyal.intro',
    nodes: {
      start: {
        speaker: 'npc.yesheTsogyal',
        look: 'yogini',
        textKey: 'dlg.ch5.tsogyal.intro.1',
        actions: [
          { type: 'startQuest', id: 'ch5.tsogyal' },
          { type: 'unlockCodex', id: 'chimphu' },
          { type: 'unlockCodex', id: 'yesheTsogyal' },
        ],
        next: 'n2',
      },
      n2: {
        speaker: 'npc.yesheTsogyal',
        look: 'yogini',
        textKey: 'dlg.ch5.tsogyal.intro.2',
        actions: [
          { type: 'unlockCodex', id: 'terma' },
          { type: 'unlockCodex', id: 'terton' },
        ],
        next: 'n3',
      },
      n3: {
        speaker: 'npc.yesheTsogyal',
        look: 'yogini',
        textKey: 'dlg.ch5.tsogyal.intro.3',
        actions: [
          { type: 'completeStep', id: 'ch5.tsogyal', step: 'talk_tsogyal' },
          { type: 'startQuest', id: 'ch5.firstTerma' },
        ],
        choices: [
          {
            textKey: 'dlg.ch5.tsogyal.intro.choice.accept',
            labelKey: 'dlg.ch5.tsogyal.intro.choice.accept',
            actions: [
              { type: 'completeStep', id: 'ch5.tsogyal', step: 'talk_tsogyal' },
              { type: 'startQuest', id: 'ch5.firstTerma' },
            ],
            next: null,
          },
          {
            textKey: 'dlg.ch5.tsogyal.intro.choice.ask',
            labelKey: 'dlg.ch5.tsogyal.intro.choice.ask',
            next: 'ask_reply',
          },
        ],
      },
      ask_reply: {
        speaker: 'npc.yesheTsogyal',
        look: 'yogini',
        textKey: 'dlg.ch5.tsogyal.intro.askReply',
        choices: [
          {
            textKey: 'dlg.ch5.tsogyal.intro.choice.accept',
            labelKey: 'dlg.ch5.tsogyal.intro.choice.accept',
            actions: [
              { type: 'completeStep', id: 'ch5.tsogyal', step: 'talk_tsogyal' },
              { type: 'startQuest', id: 'ch5.firstTerma' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 2. Yeshe Tsogyal — C5-2 Active (`ch5.firstTerma`)
  'ch5.yesheTsogyal.active': {
    id: 'ch5.yesheTsogyal.active',
    nodes: {
      start: {
        speaker: 'npc.yesheTsogyal',
        look: 'yogini',
        textKey: 'dlg.ch5.tsogyal.active.1',
        choices: [
          {
            textKey: 'dlg.ch5.tsogyal.active.choice.openTier',
            labelKey: 'dlg.ch5.tsogyal.active.choice.openTier',
            actions: [{ type: 'emit', event: 'dungeon:openTierSelect', payload: {} }],
            next: null,
          },
          {
            textKey: 'dlg.ch5.tsogyal.active.choice.ok',
            labelKey: 'dlg.ch5.tsogyal.active.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 3. Yeshe Tsogyal — C5-2 Report & Transition to C5-3 (`ch5.epilogue`)
  'ch5.yesheTsogyal.report': {
    id: 'ch5.yesheTsogyal.report',
    nodes: {
      start: {
        speaker: 'npc.yesheTsogyal',
        look: 'yogini',
        textKey: 'dlg.ch5.tsogyal.report.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.yesheTsogyal',
        look: 'yogini',
        textKey: 'dlg.ch5.tsogyal.report.2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.yesheTsogyal',
        look: 'yogini',
        textKey: 'dlg.ch5.tsogyal.report.3',
        actions: [
          { type: 'completeStep', id: 'ch5.firstTerma', step: 'report_tsogyal' },
          { type: 'startQuest', id: 'ch5.epilogue' },
        ],
        choices: [
          {
            textKey: 'dlg.ch5.tsogyal.report.choice.returnStupa',
            labelKey: 'dlg.ch5.tsogyal.report.choice.returnStupa',
            actions: [
              { type: 'completeStep', id: 'ch5.firstTerma', step: 'report_tsogyal' },
              { type: 'startQuest', id: 'ch5.epilogue' },
              { type: 'teleport', map: 'stupa', spawn: 'south' },
            ],
            next: null,
          },
          {
            textKey: 'dlg.ch5.tsogyal.report.choice.stay',
            labelKey: 'dlg.ch5.tsogyal.report.choice.stay',
            actions: [
              { type: 'completeStep', id: 'ch5.firstTerma', step: 'report_tsogyal' },
              { type: 'startQuest', id: 'ch5.epilogue' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 4. Yeshe Tsogyal — Post-epilogue / Endless Terma Mode
  'ch5.yesheTsogyal.after': {
    id: 'ch5.yesheTsogyal.after',
    nodes: {
      start: {
        speaker: 'npc.yesheTsogyal',
        look: 'yogini',
        textKey: 'dlg.ch5.tsogyal.after.1',
        choices: [
          {
            textKey: 'dlg.ch5.tsogyal.after.choice.openTier',
            labelKey: 'dlg.ch5.tsogyal.after.choice.openTier',
            actions: [{ type: 'emit', event: 'dungeon:openTierSelect', payload: {} }],
            next: null,
          },
          {
            textKey: 'dlg.ch5.tsogyal.after.choice.leave',
            labelKey: 'dlg.ch5.tsogyal.after.choice.leave',
            next: null,
          },
        ],
      },
    },
  },

  // 5. Guru Vision at Chimphu Cave
  'ch5.guruVision': {
    id: 'ch5.guruVision',
    nodes: {
      start: {
        speaker: 'npc.guruVision.chimphu',
        look: 'vision',
        textKey: 'dlg.ch5.guruVision.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.guruVision.chimphu',
        look: 'vision',
        textKey: 'dlg.ch5.guruVision.2',
        choices: [
          {
            textKey: 'dlg.ch5.guruVision.choice.bow',
            labelKey: 'dlg.ch5.guruVision.choice.bow',
            actions: [
              { type: 'emit', event: 'vitals:restore', payload: { hp: 9999, mp: 9999 } },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 6. Chimphu Retreatant 1 & 2
  'ch5.retreatant1': {
    id: 'ch5.retreatant1',
    nodes: {
      start: {
        speaker: 'npc.chimphuRetreatant1',
        look: 'lama',
        textKey: 'dlg.ch5.retreatant1.1',
        choices: [
          {
            textKey: 'dlg.ch5.retreatant1.choice.ok',
            labelKey: 'dlg.ch5.retreatant1.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  'ch5.retreatant2': {
    id: 'ch5.retreatant2',
    nodes: {
      start: {
        speaker: 'npc.chimphuRetreatant2',
        look: 'lama',
        textKey: 'dlg.ch5.retreatant2.1',
        choices: [
          {
            textKey: 'dlg.ch5.retreatant2.choice.ok',
            labelKey: 'dlg.ch5.retreatant2.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 7. Old Lama at Boudhanath Stupa — C5-3 Epilogue (`ch5.oldLama.epilogue`)
  'ch5.oldLama.epilogue': {
    id: 'ch5.oldLama.epilogue',
    nodes: {
      start: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.ch5.oldLama.epilogue.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.ch5.oldLama.epilogue.2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.ch5.oldLama.epilogue.3',
        actions: [
          { type: 'completeStep', id: 'ch5.epilogue', step: 'talk_old_lama' },
          { type: 'setFlag', flag: 'ch5.done', value: true },
        ],
        choices: [
          {
            textKey: 'dlg.ch5.oldLama.epilogue.choice.complete',
            labelKey: 'dlg.ch5.oldLama.epilogue.choice.complete',
            actions: [
              { type: 'completeStep', id: 'ch5.epilogue', step: 'talk_old_lama' },
              { type: 'setFlag', flag: 'ch5.done', value: true },
              { type: 'emit', event: 'credits:play', payload: {} },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 8. Old Lama at Boudhanath Stupa — Post-Game (`ch5.oldLama.done`)
  'ch5.oldLama.done': {
    id: 'ch5.oldLama.done',
    nodes: {
      start: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.ch5.oldLama.done.1',
        choices: [
          {
            textKey: 'dlg.ch5.oldLama.done.choice.credits',
            labelKey: 'dlg.ch5.oldLama.done.choice.credits',
            actions: [{ type: 'emit', event: 'credits:play', payload: {} }],
            next: null,
          },
          {
            textKey: 'dlg.ch5.oldLama.done.choice.close',
            labelKey: 'dlg.ch5.oldLama.done.choice.close',
            next: null,
          },
        ],
      },
    },
  },
};

export default CH5_DIALOGUES;
