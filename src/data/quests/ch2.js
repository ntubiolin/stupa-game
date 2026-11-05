// ============================================================================
// Chapter 2 — Mangyul Pass & Twelve Tenma (芒域山口・十二丹瑪) Quests
// Auto-discovered by src/systems/quests.js via import.meta.glob('../data/quests/*.js')
// ============================================================================

export const CH2_QUESTS = [
  // ── C2-1: Envoys of the Tibetan King (藏王的使者) ──
  {
    id: 'ch2.envoy',
    chapter: 2,
    kind: 'main',
    titleKey: 'quest.ch2.envoy.title',
    descKey: 'quest.ch2.envoy.desc',
    autoStart: true,
    requires: {
      flags: ['ch2.unlocked'],
    },
    steps: [
      {
        id: 'talk_envoy',
        type: 'talk',
        npc: 'envoyLeader',
        textKey: 'quest.ch2.envoy.step1',
        x: 3010,
        z: 50,
      },
    ],
    rewards: {
      exp: 220,
      turquoise: 45,
      codex: ['trisongDetsen', 'shantarakshita', 'mangyul'],
      flags: ['ch2.envoy.done'],
    },
    nextQuest: 'ch2.tenma',
  },

  // ── C2-2: The Twelve Tenma (十二丹瑪) ──
  {
    id: 'ch2.tenma',
    chapter: 2,
    kind: 'main',
    titleKey: 'quest.ch2.tenma.title',
    descKey: 'quest.ch2.tenma.desc',
    autoStart: true,
    requires: {
      flags: ['ch2.envoy.done'],
    },
    steps: [
      {
        id: 'complete_altars',
        type: 'event',
        name: 'tenma:oath',
        event: 'tenma:oath',
        count: 12,
        textKey: 'quest.ch2.tenma.step1',
        x: 3000,
        z: 10,
      },
    ],
    rewards: {
      exp: 380,
      turquoise: 80,
      codex: ['twelveTenma'],
      flags: ['ch2.tenma.done'],
    },
    nextQuest: 'ch2.storm',
  },

  // ── C2-3: Storm at the Pass (山口的風暴) ──
  {
    id: 'ch2.storm',
    chapter: 2,
    kind: 'main',
    titleKey: 'quest.ch2.storm.title',
    descKey: 'quest.ch2.storm.desc',
    autoStart: true,
    requires: {
      flags: ['ch2.tenma.done'],
    },
    steps: [
      {
        id: 'reach_pass',
        type: 'reach',
        map: 'mangyul',
        x: 3000,
        z: -65,
        r: 18,
        textKey: 'quest.ch2.storm.step1',
      },
      {
        id: 'subdue_tenma_storm',
        type: 'boss',
        bossId: 'tenmaStorm',
        boss: 'tenmaStorm',
        count: 1,
        textKey: 'quest.ch2.storm.step2',
        x: 3000,
        z: -65,
      },
    ],
    rewards: {
      exp: 520,
      turquoise: 110,
      codex: ['twelveTenma'],
      flags: ['ch2.storm.done'],
    },
    nextQuest: 'ch2.tibet',
  },

  // ── C2-4: Entering Tibet (入藏) ──
  {
    id: 'ch2.tibet',
    chapter: 2,
    kind: 'main',
    titleKey: 'quest.ch2.tibet.title',
    descKey: 'quest.ch2.tibet.desc',
    autoStart: true,
    requires: {
      flags: ['ch2.storm.done'],
    },
    steps: [
      {
        id: 'talk_vision',
        type: 'talk',
        npc: 'guruVision.mangyul',
        textKey: 'quest.ch2.tibet.step1',
        x: 3000,
        z: -60,
      },
      {
        id: 'hang_pass_flags',
        type: 'interact',
        target: 'passPrayerFlags',
        count: 1,
        textKey: 'quest.ch2.tibet.step2',
        x: 3000,
        z: -63,
      },
    ],
    rewards: {
      exp: 600,
      turquoise: 150,
      skillUnlock: 'vajraBell',
      protector: 'tenma',
      codex: ['twelveTenma', 'windhorse', 'latse'],
      waypoint: 'yarlung',
      flags: ['ch2.done', 'ch3.unlocked', 'skill.vajraBell', 'protector.tenma'],
      chapterBanner: {
        kickerKey: 'ch2.banner.complete.kicker',
        titleKey: 'ch2.banner.complete.title',
        subKey: 'ch2.banner.complete.sub',
      },
    },
  },
];

export default CH2_QUESTS;
