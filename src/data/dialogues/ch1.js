// ============================================================================
// Chapter 1 — Pharping · Yangleshö Dialogue Trees (`src/data/dialogues/ch1.js`)
// ============================================================================
import '../../i18n/ch1.js';

export const CH1_DIALOGUES = {
  // 1. Village Elder — Quest C1-1 Intro
  'ch1.villageElder.droughtIntro': {
    id: 'ch1.villageElder.droughtIntro',
    nodes: {
      start: {
        speaker: 'npc.villageElder',
        look: 'villager',
        textKey: 'dlg.ch1.elder.droughtIntro.1',
        actions: [
          { type: 'startQuest', id: 'ch1.drought' },
          { type: 'completeStep', id: 'ch1.drought', step: 'talk_elder' },
          { type: 'unlockCodex', id: 'pharping' },
        ],
        next: 'n2',
      },
      n2: {
        speaker: 'npc.villageElder',
        look: 'villager',
        textKey: 'dlg.ch1.elder.droughtIntro.2',
        choices: [
          {
            textKey: 'dlg.ch1.elder.droughtIntro.choice.accept',
            labelKey: 'dlg.ch1.elder.droughtIntro.choice.accept',
            actions: [
              { type: 'startQuest', id: 'ch1.drought' },
              { type: 'completeStep', id: 'ch1.drought', step: 'talk_elder' },
            ],
            next: null,
          },
          {
            textKey: 'dlg.ch1.elder.droughtIntro.choice.ask',
            labelKey: 'dlg.ch1.elder.droughtIntro.choice.ask',
            actions: [{ type: 'unlockCodex', id: 'droughtLegend' }],
            next: 'ask_reply',
          },
        ],
      },
      ask_reply: {
        speaker: 'npc.villageElder',
        look: 'villager',
        textKey: 'dlg.ch1.elder.droughtIntro.askReply',
        choices: [
          {
            textKey: 'dlg.ch1.elder.droughtIntro.choice.accept',
            labelKey: 'dlg.ch1.elder.droughtIntro.choice.accept',
            actions: [
              { type: 'startQuest', id: 'ch1.drought' },
              { type: 'completeStep', id: 'ch1.drought', step: 'talk_elder' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 2. Village Elder — Quest C1-1 Active reminder
  'ch1.villageElder.droughtActive': {
    id: 'ch1.villageElder.droughtActive',
    nodes: {
      start: {
        speaker: 'npc.villageElder',
        look: 'villager',
        textKey: 'dlg.ch1.elder.droughtActive.1',
        choices: [
          {
            textKey: 'dlg.ch1.elder.droughtActive.choice.ok',
            labelKey: 'dlg.ch1.elder.droughtActive.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 3. Village Elder — Quest C1-1 Report & transition to C1-2 (`ch1.lamps`)
  'ch1.villageElder.droughtReport': {
    id: 'ch1.villageElder.droughtReport',
    nodes: {
      start: {
        speaker: 'npc.villageElder',
        look: 'villager',
        textKey: 'dlg.ch1.elder.droughtReport.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.villageElder',
        look: 'villager',
        textKey: 'dlg.ch1.elder.droughtReport.2',
        actions: [
          { type: 'unlockCodex', id: 'yangleshoCave' },
          { type: 'completeStep', id: 'ch1.drought', step: 'report_elder' },
          { type: 'startQuest', id: 'ch1.lamps' },
        ],
        choices: [
          {
            textKey: 'dlg.ch1.elder.droughtReport.choice.accept',
            labelKey: 'dlg.ch1.elder.droughtReport.choice.accept',
            actions: [
              { type: 'completeStep', id: 'ch1.drought', step: 'report_elder' },
              { type: 'startQuest', id: 'ch1.lamps' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 4. Village Elder — After Rain (`ch1.rain`)
  'ch1.villageElder.afterRain': {
    id: 'ch1.villageElder.afterRain',
    nodes: {
      start: {
        speaker: 'npc.villageElder',
        look: 'villager',
        textKey: 'dlg.ch1.elder.afterRain.1',
        choices: [
          {
            textKey: 'dlg.ch1.elder.afterRain.choice.ok',
            labelKey: 'dlg.ch1.elder.afterRain.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 5. Villager ambient dialogues (dry vs after rain)
  'ch1.villager1.dry': {
    id: 'ch1.villager1.dry',
    nodes: {
      start: {
        speaker: 'npc.pharpingVillager1',
        look: 'villager',
        textKey: 'dlg.ch1.villager1.dry',
      },
    },
  },
  'ch1.villager1.afterRain': {
    id: 'ch1.villager1.afterRain',
    nodes: {
      start: {
        speaker: 'npc.pharpingVillager1',
        look: 'villager',
        textKey: 'dlg.ch1.villager1.rain',
      },
    },
  },
  'ch1.villager2.dry': {
    id: 'ch1.villager2.dry',
    nodes: {
      start: {
        speaker: 'npc.pharpingVillager2',
        look: 'villager',
        textKey: 'dlg.ch1.villager2.dry',
      },
    },
  },
  'ch1.villager2.afterRain': {
    id: 'ch1.villager2.afterRain',
    nodes: {
      start: {
        speaker: 'npc.pharpingVillager2',
        look: 'villager',
        textKey: 'dlg.ch1.villager2.rain',
      },
    },
  },

  // 6. Guru Vision (`guruVision.pharping`) — Quest C1-2 Completion & C1-3 Start
  'ch1.guruVision.lampsTalk': {
    id: 'ch1.guruVision.lampsTalk',
    nodes: {
      start: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.lampsTalk.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.lampsTalk.2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.lampsTalk.3',
        actions: [
          { type: 'unlockCodex', id: 'yangleshoCave' },
          { type: 'unlockCodex', id: 'vajrakilaya' },
          { type: 'completeStep', id: 'ch1.lamps', step: 'talk_vision' },
          { type: 'startQuest', id: 'ch1.scrolls' },
        ],
        choices: [
          {
            textKey: 'dlg.ch1.vision.lampsTalk.choice.accept',
            labelKey: 'dlg.ch1.vision.lampsTalk.choice.accept',
            actions: [
              { type: 'completeStep', id: 'ch1.lamps', step: 'talk_vision' },
              { type: 'startQuest', id: 'ch1.scrolls' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 7. Guru Vision — Quest C1-3 Active
  'ch1.guruVision.scrollsActive': {
    id: 'ch1.guruVision.scrollsActive',
    nodes: {
      start: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.scrollsActive.1',
        choices: [
          {
            textKey: 'dlg.ch1.vision.scrollsActive.choice.ok',
            labelKey: 'dlg.ch1.vision.scrollsActive.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 8. Nalanda Sutra Messenger (`messenger`) — Quest C1-3 Escort Start
  'ch1.messenger.start': {
    id: 'ch1.messenger.start',
    nodes: {
      start: {
        speaker: 'npc.messenger',
        look: 'villager',
        textKey: 'dlg.ch1.messenger.start.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.messenger',
        look: 'villager',
        textKey: 'dlg.ch1.messenger.start.2',
        actions: [
          { type: 'startQuest', id: 'ch1.scrolls' },
          { type: 'completeStep', id: 'ch1.scrolls', step: 'find_messenger' },
          { type: 'emit', event: 'escort:start', payload: { npcId: 'messenger' } },
        ],
        choices: [
          {
            textKey: 'dlg.ch1.messenger.start.choice.escort',
            labelKey: 'dlg.ch1.messenger.start.choice.escort',
            actions: [
              { type: 'completeStep', id: 'ch1.scrolls', step: 'find_messenger' },
              { type: 'emit', event: 'escort:start', payload: { npcId: 'messenger' } },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 9. Messenger while escorting / after arrival
  'ch1.messenger.escorting': {
    id: 'ch1.messenger.escorting',
    nodes: {
      start: {
        speaker: 'npc.messenger',
        look: 'villager',
        textKey: 'dlg.ch1.messenger.escorting',
        actions: [
          { type: 'emit', event: 'escort:start', payload: { npcId: 'messenger' } },
        ],
      },
    },
  },
  'ch1.messenger.arrived': {
    id: 'ch1.messenger.arrived',
    nodes: {
      start: {
        speaker: 'npc.messenger',
        look: 'villager',
        textKey: 'dlg.ch1.messenger.arrived',
      },
    },
  },

  // 10. Guru Vision — Quest C1-3 Deliver Scrolls & Start C1-4 (`ch1.kilaya`)
  'ch1.guruVision.scrollsDeliver': {
    id: 'ch1.guruVision.scrollsDeliver',
    nodes: {
      start: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.scrollsDeliver.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.scrollsDeliver.2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.scrollsDeliver.3',
        actions: [
          { type: 'unlockCodex', id: 'asuraCave' },
          { type: 'unlockCodex', id: 'phurba' },
          { type: 'completeStep', id: 'ch1.scrolls', step: 'deliver_scrolls' },
          { type: 'startQuest', id: 'ch1.kilaya' },
        ],
        choices: [
          {
            textKey: 'dlg.ch1.vision.scrollsDeliver.choice.accept',
            labelKey: 'dlg.ch1.vision.scrollsDeliver.choice.accept',
            actions: [
              { type: 'completeStep', id: 'ch1.scrolls', step: 'deliver_scrolls' },
              { type: 'startQuest', id: 'ch1.kilaya' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 11. Guru Vision — Quest C1-4 Active
  'ch1.guruVision.kilayaActive': {
    id: 'ch1.guruVision.kilayaActive',
    nodes: {
      start: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.kilayaActive.1',
        choices: [
          {
            textKey: 'dlg.ch1.vision.kilayaActive.choice.ok',
            labelKey: 'dlg.ch1.vision.kilayaActive.choice.ok',
            next: null,
          },
        ],
      },
    },
  },

  // 12. Guru Vision — Quest C1-4 Complete (Imparts Vajrakilaya [2], unlocks Chapter 2 Mangyul)
  'ch1.guruVision.kilayaComplete': {
    id: 'ch1.guruVision.kilayaComplete',
    nodes: {
      start: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.kilayaComplete.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.kilayaComplete.2',
        next: 'n3',
      },
      n3: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.kilayaComplete.3',
        actions: [
          { type: 'setFlag', flag: 'ch1.rain', value: true },
          { type: 'completeStep', id: 'ch1.kilaya', step: 'report_vision' },
        ],
        choices: [
          {
            textKey: 'dlg.ch1.vision.kilayaComplete.choice.complete',
            labelKey: 'dlg.ch1.vision.kilayaComplete.choice.complete',
            actions: [
              { type: 'setFlag', flag: 'ch1.rain', value: true },
              { type: 'completeStep', id: 'ch1.kilaya', step: 'report_vision' },
            ],
            next: null,
          },
        ],
      },
    },
  },

  // 13. Guru Vision — Post-Chapter 1 Completed
  'ch1.guruVision.done': {
    id: 'ch1.guruVision.done',
    nodes: {
      start: {
        speaker: 'npc.guruVision.pharping',
        look: 'vision',
        textKey: 'dlg.ch1.vision.done.1',
        choices: [
          {
            textKey: 'dlg.ch1.vision.done.choice.ok',
            labelKey: 'dlg.ch1.vision.done.choice.ok',
            next: null,
          },
        ],
      },
    },
  },
};

export default CH1_DIALOGUES;
