/**
 * Prologue Dialogue Trees (`src/data/dialogues/prologue.js`) — Issue #31
 *   - Old Lama Lobsang (`oldLama`):
 *       - `prologue.oldLama.vowIntro`
 *       - `prologue.oldLama.vowActive`
 *       - `prologue.oldLama.vowLegend` (5-node Jarung Khashor legend + 4 sons' vows + codex links)
 *       - `prologue.oldLama.northIntro`
 *       - `prologue.oldLama.northActive`
 *       - `prologue.oldLama.northReport` (Guru Rinpoche's footsteps map + Pure Vision teaching)
 *       - `prologue.oldLama.completed`
 *   - Dharma Merchant Norbu (`merchant`):
 *       - `prologue.merchant.talk` (`openShop` + Amrita refill)
 *   - Lotus Artisan Pema (`artisan`):
 *       - `prologue.artisan.talk` (`openCrafting`)
 */
import '../../i18n/prologue.js';

export const PROLOGUE_DIALOGUES = {
  // 1. Quest P1 Intro: Old Lama welcomes the pilgrim
  'prologue.oldLama.vowIntro': {
    id: 'prologue.oldLama.vowIntro',
    nodes: {
      start: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowIntro.1',
        actions: [
          { type: 'startQuest', id: 'prologue.vow' },
          { type: 'completeStep', id: 'prologue.vow', step: 'talk_intro' },
        ],
        next: 'n2',
      },
      n2: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowIntro.2',
        choices: [
          {
            textKey: 'dlg.prologue.vowIntro.choice.accept',
            labelKey: 'dlg.prologue.vowIntro.choice.accept',
            actions: [
              { type: 'startQuest', id: 'prologue.vow' },
              { type: 'completeStep', id: 'prologue.vow', step: 'talk_intro' },
            ],
            next: null,
          },
          {
            textKey: 'dlg.prologue.vowIntro.choice.askStupa',
            labelKey: 'dlg.prologue.vowIntro.choice.askStupa',
            actions: [{ type: 'unlockCodex', id: 'jarungKhashor' }],
            next: 'ask_stupa',
          },
        ],
      },
      ask_stupa: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowIntro.askReply',
        choices: [
          {
            textKey: 'dlg.prologue.vowIntro.choice.accept',
            labelKey: 'dlg.prologue.vowIntro.choice.accept',
            actions: [
              { type: 'startQuest', id: 'prologue.vow' },
              { type: 'completeStep', id: 'prologue.vow', step: 'talk_intro' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 2. Quest P1 Active: Reminder to walk 1 Kora lap and light 3 butter lamps
  'prologue.oldLama.vowActive': {
    id: 'prologue.oldLama.vowActive',
    nodes: {
      start: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowActive.1',
        choices: [
          {
            textKey: 'dlg.prologue.vowActive.choice.ok',
            labelKey: 'dlg.prologue.vowActive.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 3. Quest P1 Legend of Jarung Khashor (5 nodes telling the full legend + 4 sons' vows)
  'prologue.oldLama.vowLegend': {
    id: 'prologue.oldLama.vowLegend',
    nodes: {
      start: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowLegend.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowLegend.2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowLegend.3',
        actions: [{ type: 'unlockCodex', id: 'jarungKhashor' }],
        next: 'n4',
      },
      n4: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowLegend.4',
        next: 'n5',
      },
      n5: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowLegend.5',
        actions: [
          { type: 'unlockCodex', id: 'padmasambhava' },
          { type: 'completeStep', id: 'prologue.vow', step: 'talk_legend' },
        ],
        choices: [
          {
            textKey: 'dlg.prologue.vowLegend.choice.complete',
            labelKey: 'dlg.prologue.vowLegend.choice.complete',
            actions: [
              { type: 'completeStep', id: 'prologue.vow', step: 'talk_legend' },
              { type: 'startQuest', id: 'prologue.north' },
            ],
            next: 'north_intro_1',
          },
        ],
      },
      north_intro_1: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.northIntro.1',
        actions: [
          { type: 'startQuest', id: 'prologue.north' },
          { type: 'completeStep', id: 'prologue.north', step: 'talk_intro' },
        ],
        next: 'north_intro_2',
      },
      north_intro_2: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.northIntro.2',
        choices: [
          {
            textKey: 'dlg.prologue.northIntro.choice.accept',
            labelKey: 'dlg.prologue.northIntro.choice.accept',
            actions: [
              { type: 'completeStep', id: 'prologue.north', step: 'talk_intro' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 4. Quest P2 Intro: Northern Wilderness restlessness
  'prologue.oldLama.northIntro': {
    id: 'prologue.oldLama.northIntro',
    nodes: {
      start: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.northIntro.1',
        actions: [
          { type: 'startQuest', id: 'prologue.north' },
          { type: 'completeStep', id: 'prologue.north', step: 'talk_intro' },
        ],
        next: 'n2',
      },
      n2: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.northIntro.2',
        choices: [
          {
            textKey: 'dlg.prologue.northIntro.choice.accept',
            labelKey: 'dlg.prologue.northIntro.choice.accept',
            actions: [
              { type: 'completeStep', id: 'prologue.north', step: 'talk_intro' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 5. Quest P2 Active: Reminder for Northern Wilderness tasks
  'prologue.oldLama.northActive': {
    id: 'prologue.oldLama.northActive',
    nodes: {
      start: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.northActive.1',
        choices: [
          {
            textKey: 'dlg.prologue.northActive.choice.ok',
            labelKey: 'dlg.prologue.northActive.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 6. Quest P2 Report: Ancient Pilgrim's Map & Pure Vision teaching
  'prologue.oldLama.northReport': {
    id: 'prologue.oldLama.northReport',
    nodes: {
      start: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.northReport.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.northReport.2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.northReport.3',
        actions: [
          { type: 'completeStep', id: 'prologue.north', step: 'talk_report' },
        ],
        choices: [
          {
            textKey: 'dlg.prologue.northReport.choice.complete',
            labelKey: 'dlg.prologue.northReport.choice.complete',
            actions: [
              { type: 'completeStep', id: 'prologue.north', step: 'talk_report' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 7. Post-Prologue Completed dialogue
  'prologue.oldLama.completed': {
    id: 'prologue.oldLama.completed',
    nodes: {
      start: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.completed.1',
        choices: [
          {
            textKey: 'dlg.prologue.completed.choice.reviewLegend',
            labelKey: 'dlg.prologue.completed.choice.reviewLegend',
            next: 'legend_1',
          },
          {
            textKey: 'dlg.prologue.completed.choice.close',
            labelKey: 'dlg.prologue.completed.choice.close',
            next: null,
          },
        ],
      },
      legend_1: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowLegend.1',
        next: 'legend_2',
      },
      legend_2: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowLegend.2',
        next: 'legend_3',
      },
      legend_3: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowLegend.3',
        next: 'legend_4',
      },
      legend_4: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowLegend.4',
        next: 'legend_5',
      },
      legend_5: {
        speaker: 'npc.oldLama',
        look: 'lama',
        textKey: 'dlg.prologue.vowLegend.5',
        next: null,
      },
    },
  },

  // 8. Dharma Instrument Merchant Norbu
  'prologue.merchant.talk': {
    id: 'prologue.merchant.talk',
    nodes: {
      start: {
        speaker: 'npc.merchant',
        look: 'merchant',
        textKey: 'dlg.prologue.merchant.1',
        choices: [
          {
            textKey: 'dlg.prologue.merchant.choice.shop',
            labelKey: 'dlg.prologue.merchant.choice.shop',
            actions: [{ type: 'openShop', id: 'merchant' }],
            next: null,
          },
          {
            textKey: 'dlg.prologue.merchant.choice.close',
            labelKey: 'dlg.prologue.merchant.choice.close',
            next: null,
          },
        ],
      },
    },
  },

  // 9. Lotus Artisan Pema
  'prologue.artisan.talk': {
    id: 'prologue.artisan.talk',
    nodes: {
      start: {
        speaker: 'npc.artisan',
        look: 'artisan',
        textKey: 'dlg.prologue.artisan.1',
        choices: [
          {
            textKey: 'dlg.prologue.artisan.choice.craft',
            labelKey: 'dlg.prologue.artisan.choice.craft',
            actions: [{ type: 'openCrafting', id: 'artisan' }],
            next: null,
          },
          {
            textKey: 'dlg.prologue.artisan.choice.close',
            labelKey: 'dlg.prologue.artisan.choice.close',
            next: null,
          },
        ],
      },
    },
  },
};
