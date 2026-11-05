// ============================================================================
// Chapter 2 — Mangyul Pass & Twelve Tenma (芒域山口・十二丹瑪) Dialogue Trees
// Auto-discovered by src/ui/dialogue.js via import.meta.glob('../data/dialogues/*.js')
// ============================================================================

export const CH2_DIALOGUES = {
  // ── C2-1: Tibetan Envoy Leader Ba Salnang ──
  'ch2.envoyLeader': {
    id: 'ch2.envoyLeader',
    nodes: {
      start: {
        speaker: 'npc.envoyLeader',
        look: 'noble',
        textKey: 'dlg.ch2.envoy.n1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.envoyLeader',
        look: 'noble',
        textKey: 'dlg.ch2.envoy.n2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.envoyLeader',
        look: 'noble',
        textKey: 'dlg.ch2.envoy.n3',
        next: 'n4',
      },
      n4: {
        speaker: 'npc.envoyLeader',
        look: 'noble',
        textKey: 'dlg.ch2.envoy.n4',
        choices: [
          {
            textKey: 'dlg.ch2.envoy.choice1',
            actions: [
              { type: 'codexUnlock', entryId: 'trisongDetsen' },
              { type: 'codexUnlock', entryId: 'shantarakshita' },
              { type: 'codexUnlock', entryId: 'mangyul' },
            ],
            next: 'after',
          },
        ],
      },
      after: {
        speaker: 'npc.envoyLeader',
        look: 'noble',
        textKey: 'dlg.ch2.envoy.after',
        choices: [
          {
            textKey: 'dlg.ch2.envoy.choiceAfter',
            next: null,
          },
        ],
      },
    },
  },

  // ── Envoy Camp Retinue 1: Windhorse Flag Lore ──
  'ch2.envoyRetinue1': {
    id: 'ch2.envoyRetinue1',
    nodes: {
      start: {
        speaker: 'npc.envoyRetinue1',
        look: 'villager',
        textKey: 'dlg.ch2.retinue1.n1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.envoyRetinue1',
        look: 'villager',
        textKey: 'dlg.ch2.retinue1.n2',
        choices: [
          {
            textKey: 'dlg.ch2.retinue1.close',
            actions: [{ type: 'codexUnlock', entryId: 'windhorse' }],
            next: null,
          },
        ],
      },
    },
  },

  // ── Envoy Camp Retinue 2: Latse Mountain Pass Cairn Lore ──
  'ch2.envoyRetinue2': {
    id: 'ch2.envoyRetinue2',
    nodes: {
      start: {
        speaker: 'npc.envoyRetinue2',
        look: 'villager',
        textKey: 'dlg.ch2.retinue2.n1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.envoyRetinue2',
        look: 'villager',
        textKey: 'dlg.ch2.retinue2.n2',
        choices: [
          {
            textKey: 'dlg.ch2.retinue2.close',
            actions: [{ type: 'codexUnlock', entryId: 'latse' }],
            next: null,
          },
        ],
      },
    },
  },

  // ── Envoy Camp Porter: Valley & Glacier Ambience ──
  'ch2.envoyPorter': {
    id: 'ch2.envoyPorter',
    nodes: {
      start: {
        speaker: 'npc.envoyPorter',
        look: 'villager',
        textKey: 'dlg.ch2.porter.n1',
        choices: [
          {
            textKey: 'dlg.ch2.porter.close',
            next: null,
          },
        ],
      },
    },
  },

  // ── C2-4: Guru Vision beside the Pass Latse ──
  'ch2.guruVision': {
    id: 'ch2.guruVision',
    nodes: {
      start: {
        speaker: 'npc.guruVision.mangyul',
        look: 'vision',
        textKey: 'dlg.ch2.vision.n1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.guruVision.mangyul',
        look: 'vision',
        textKey: 'dlg.ch2.vision.n2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.guruVision.mangyul',
        look: 'vision',
        textKey: 'dlg.ch2.vision.n3',
        choices: [
          {
            textKey: 'dlg.ch2.vision.choice1',
            actions: [
              { type: 'codexUnlock', entryId: 'twelveTenma' },
              { type: 'codexUnlock', entryId: 'windhorse' },
              { type: 'codexUnlock', entryId: 'latse' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // ── Boss Oath Dialogue: Storm of the Twelve Tenma ──
  'boss.tenmaStorm.oath': {
    id: 'boss.tenmaStorm.oath',
    nodes: {
      start: {
        speaker: 'boss.tenmaStorm.name',
        look: 'yogini',
        textKey: 'boss.tenmaStorm.oath.n1',
        next: 'n2',
      },
      n2: {
        speaker: 'boss.tenmaStorm.name',
        look: 'yogini',
        textKey: 'boss.tenmaStorm.oath.n2',
        next: 'n3',
      },
      n3: {
        speaker: 'boss.tenmaStorm.name',
        look: 'yogini',
        textKey: 'boss.tenmaStorm.oath.n3',
        choices: [
          {
            textKey: 'boss.tenmaStorm.oath.accept',
            actions: [
              { type: 'setFlag', flag: 'boss.tenmaStorm', value: true },
              { type: 'setFlag', flag: 'protector.tenma', value: true },
              { type: 'codexUnlock', entryId: 'twelveTenma' },
            ],
            next: null,
          },
        ],
      },
    },
  },
};

export default CH2_DIALOGUES;
