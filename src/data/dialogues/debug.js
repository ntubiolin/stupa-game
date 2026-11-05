import '../../i18n/quests.js';

export const DEBUG_DIALOGUES = {
  'debug.sandboxLama.intro': {
    id: 'debug.sandboxLama.intro',
    debugOnly: true,
    nodes: {
      start: {
        speaker: 'npc.sandbox_lama',
        look: 'lama',
        textKey: 'dlg.sandbox.intro.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.sandbox_lama',
        look: 'lama',
        textKey: 'dlg.sandbox.intro.2',
        choices: [
          {
            textKey: 'dlg.sandbox.choice.accept',
            next: 'accepted',
            actions: [
              { type: 'startQuest', id: 'debug.sample' },
            ],
          },
          {
            textKey: 'dlg.sandbox.choice.codex',
            next: 'codexNote',
            actions: [
              { type: 'unlockCodex', id: 'samye' },
            ],
          },
          {
            textKey: 'dlg.sandbox.choice.later',
            next: null,
          },
        ],
      },
      accepted: {
        speaker: 'npc.sandbox_lama',
        look: 'lama',
        textKey: 'dlg.sandbox.intro.accepted',
        next: null,
      },
      codexNote: {
        speaker: 'npc.sandbox_lama',
        look: 'lama',
        textKey: 'dlg.sandbox.intro.codexNote',
        choices: [
          {
            textKey: 'dlg.sandbox.choice.accept',
            next: 'accepted',
            actions: [
              { type: 'startQuest', id: 'debug.sample' },
            ],
          },
          {
            textKey: 'dlg.sandbox.choice.later',
            next: null,
          },
        ],
      },
    },
  },

  'debug.sandboxLama.active': {
    id: 'debug.sandboxLama.active',
    debugOnly: true,
    nodes: {
      start: {
        speaker: 'npc.sandbox_lama',
        look: 'lama',
        textKey: 'dlg.sandbox.active.1',
        next: null,
      },
    },
  },

  'debug.sandboxLama.report': {
    id: 'debug.sandboxLama.report',
    debugOnly: true,
    nodes: {
      start: {
        speaker: 'npc.sandbox_lama',
        look: 'lama',
        textKey: 'dlg.sandbox.report.1',
        actions: [
          { type: 'completeStep', id: 'debug.sample', step: 'report_lama' },
        ],
        next: null,
      },
    },
  },

  'debug.sandboxLama.done': {
    id: 'debug.sandboxLama.done',
    debugOnly: true,
    nodes: {
      start: {
        speaker: 'npc.sandbox_lama',
        look: 'lama',
        textKey: 'dlg.sandbox.done.1',
        choices: [
          {
            textKey: 'dlg.sandbox.choice.replay',
            requires: { flag: 'debug.sample.completed' },
            actions: [
              { type: 'startQuest', id: 'debug.sample', forceRestart: true },
            ],
            next: null,
          },
          {
            textKey: 'dlg.sandbox.choice.later',
            next: null,
          },
        ],
      },
    },
  },

  'debug.allActions': {
    id: 'debug.allActions',
    debugOnly: true,
    nodes: {
      start: {
        speaker: 'npc.vision',
        look: 'vision',
        textKey: 'dlg.debug.allActions.1',
        actions: [
          { type: 'startQuest', id: 'debug.ritual' },
          { type: 'completeStep', id: 'debug.ritual', step: 'kora' },
          { type: 'setFlag', flag: 'debug.flag.allActions', value: true },
          { type: 'unlockCodex', id: 'samye' },
          { type: 'giveItem', rarity: 'rare', slot: 'mainhand', ilvl: 10 },
          { type: 'giveTurquoise', amount: 50 },
          { type: 'giveExp', amount: 25 },
          { type: 'openShop', id: 'merchant' },
          { type: 'openCrafting', id: 'artisan' },
          { type: 'teleport', map: 'current', skipFade: true },
          { type: 'emit', event: 'debug:resonance', payload: { source: 'debug.allActions', ok: true } },
        ],
        choices: [
          {
            textKey: 'dlg.debug.choice.flagOnly',
            requires: { flag: 'debug.flag.allActions' },
            next: 'n2',
          },
          {
            textKey: 'dlg.debug.choice.next',
            next: 'n2',
          },
          {
            textKey: 'dlg.debug.choice.close',
            next: null,
          },
        ],
      },
      n2: {
        speaker: 'npc.abbot',
        look: 'abbot',
        textKey: 'dlg.debug.allActions.2',
        next: null,
      },
    },
  },
};
