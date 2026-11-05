/**
 * Chapter 4 (Samye Monastery & Mount Hepo Ri) — Dialogue Trees (`src/data/dialogues/ch4.js`) — Issue #35
 *
 * Defines quest-aware dialogue trees for:
 *   - `ch4.shantarakshita` (Abbot Śāntarakṣita)
 *   - `ch4.trisongDetsen` (King Trisong Detsen)
 *   - `ch4.samyeArtisan` (Samye Master Artisan — also triggers material delivery on talk)
 *   - `ch4.guruVision` (Pure Vision of Guru Rinpoche on Mount Hepo Ri)
 *   - `ch4.sevenTestedMen` (Seven Tested Men representative Ba Salnang)
 */
import '../../i18n/ch4.js';

export const CH4_DIALOGUES = {
  // ---------------------------------------------------------------- 1. Abbot Śāntarakṣita
  'ch4.shantarakshita': {
    start: 'root',
    nodes: {
      root: {
        speaker: 'npc.shantarakshita.name',
        text: 'dlg.ch4.shanta.foundation.1',
        branches: [
          {
            when: { quest: 'ch4.samye', step: 2 },
            goto: 'samye_complete_1',
          },
          {
            when: { flag: 'ch4.done' },
            goto: 'samye_complete_1',
          },
          {
            when: { quest: 'ch4.pehar' },
            goto: 'pehar_hint',
          },
          {
            when: { quest: 'ch4.hepori' },
            goto: 'hepori_hint',
          },
          {
            when: { quest: 'ch4.dayNight' },
            goto: 'daynight_hint',
          },
        ],
        next: 'foundation_2',
      },
      foundation_2: {
        speaker: 'npc.shantarakshita.name',
        text: 'dlg.ch4.shanta.foundation.2',
        next: 'foundation_3',
      },
      foundation_3: {
        speaker: 'npc.shantarakshita.name',
        text: 'dlg.ch4.shanta.foundation.3',
        actions: [{ type: 'codex', id: 'shantarakshita' }, { type: 'codex', id: 'samye' }],
        end: true,
      },
      daynight_hint: {
        speaker: 'npc.shantarakshita.name',
        text: 'dlg.ch4.shanta.dayNight',
        end: true,
      },
      hepori_hint: {
        speaker: 'npc.shantarakshita.name',
        text: 'dlg.ch4.shanta.hepori',
        end: true,
      },
      pehar_hint: {
        speaker: 'npc.shantarakshita.name',
        text: 'dlg.ch4.shanta.pehar',
        end: true,
      },
      samye_complete_1: {
        speaker: 'npc.shantarakshita.name',
        text: 'dlg.ch4.shanta.samyeComplete.1',
        next: 'samye_complete_2',
      },
      samye_complete_2: {
        speaker: 'npc.shantarakshita.name',
        text: 'dlg.ch4.shanta.samyeComplete.2',
        actions: [
          { type: 'codex', id: 'samyeName' },
          { type: 'codex', id: 'sevenTestedMen' },
        ],
        end: true,
      },
    },
  },

  // ---------------------------------------------------------------- 2. King Trisong Detsen
  'ch4.trisongDetsen': {
    start: 'root',
    nodes: {
      root: {
        speaker: 'npc.trisongDetsen.name',
        text: 'dlg.ch4.king.foundation.1',
        branches: [
          {
            when: { flag: 'ch4.pehar.done' },
            goto: 'after_ending',
          },
          {
            when: { flag: 'ch4.foundation.done' },
            goto: 'progress',
          },
        ],
        next: 'foundation_2',
      },
      foundation_2: {
        speaker: 'npc.trisongDetsen.name',
        text: 'dlg.ch4.king.foundation.2',
        actions: [
          { type: 'codex', id: 'trisongDetsen' },
          { type: 'codex', id: 'samyeMandala' },
        ],
        end: true,
      },
      progress: {
        speaker: 'npc.trisongDetsen.name',
        text: 'dlg.ch4.king.progress',
        end: true,
      },
      after_ending: {
        speaker: 'npc.trisongDetsen.name',
        text: 'dlg.ch4.king.afterEnding',
        actions: [{ type: 'emit', event: 'samye:requestEnding', payload: {} }],
        end: true,
      },
    },
  },

  // ---------------------------------------------------------------- 3. Samye Master Artisan
  'ch4.samyeArtisan': {
    start: 'root',
    nodes: {
      root: {
        speaker: 'npc.samyeArtisan.name',
        text: 'dlg.ch4.artisan.day',
        branches: [
          {
            when: { flag: 'ch4.hepori.done' },
            goto: 'done',
          },
        ],
        actions: [{ type: 'emit', event: 'samye:deliverMaterials', payload: {} }],
        end: true,
      },
      done: {
        speaker: 'npc.samyeArtisan.name',
        text: 'dlg.ch4.artisan.done',
        end: true,
      },
    },
  },

  // ---------------------------------------------------------------- 4. Pure Vision of Guru Rinpoche (Hepo Ri / Samye)
  'ch4.guruVision': {
    start: 'root',
    nodes: {
      root: {
        speaker: 'npc.guruVision.samye.name',
        text: 'dlg.ch4.vision.hepori',
        branches: [
          {
            when: { flag: 'ch4.pehar.done' },
            goto: 'palm_vision',
          },
        ],
        actions: [
          { type: 'codex', id: 'hepori' },
          { type: 'codex', id: 'eightClasses' },
          { type: 'emit', event: 'hepori:requestStart', payload: {} },
        ],
        end: true,
      },
      palm_vision: {
        speaker: 'npc.guruVision.samye.name',
        text: 'dlg.ch4.vision.samye',
        actions: [{ type: 'emit', event: 'samye:requestEnding', payload: {} }],
        end: true,
      },
    },
  },

  // ---------------------------------------------------------------- 5. Seven Tested Men Representative
  'ch4.sevenTestedMen': {
    start: 'root',
    nodes: {
      root: {
        speaker: 'npc.sevenTestedMen.name',
        text: 'dlg.ch4.seven.greeting',
        actions: [{ type: 'codex', id: 'sevenTestedMen' }],
        end: true,
      },
    },
  },
};

export default CH4_DIALOGUES;
