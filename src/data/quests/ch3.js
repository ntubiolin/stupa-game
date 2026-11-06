// ============================================================================
// Chapter 3 — Yarlung Valley · Yarlha Shampo White Yak Quest Definitions
// (`src/data/quests/ch3.js`)
//   - C3-1 `ch3.valley`:   「雍布拉康」 ("Yumbulagang")
//   - C3-2 `ch3.sheldrak`: 「水晶崖的伏藏」 ("Terma of Crystal Cliff", Side Quest)
//   - C3-3 `ch3.yaks`:     「犛牛群暴走」 ("Stampede of the Wild Yaks")
//   - C3-4 `ch3.shampo`:   「白犛牛」 ("The White Yak of Yarlha Shampo")
// ============================================================================
import '../../i18n/ch3.js';

export const CH3_QUESTS = [
  // C3-1: 雍布拉康 (Yumbulagang)
  {
    id: 'ch3.valley',
    chapter: 'ch3',
    map: 'yarlung',
    titleKey: 'quest.ch3.valley.title',
    descKey: 'quest.ch3.valley.desc',
    giverNpc: 'palaceKeeper',
    requires: {
      flags: ['ch3.unlocked'],
    },
    autoStart: true,
    nextQuest: 'ch3.yaks',
    steps: [
      {
        id: 'reach_palace',
        type: 'reach',
        map: 'yarlung',
        x: 3955,
        z: 20,
        r: 12,
        pos: { x: 3955, z: 20 },
        textKey: 'quest.ch3.valley.step.reach_palace',
        labelKey: 'quest.ch3.valley.step.reach_palace',
      },
      {
        id: 'talk_keeper',
        type: 'talk',
        npc: 'palaceKeeper',
        map: 'yarlung',
        x: 3955,
        z: 20,
        pos: { x: 3955, z: 20 },
        textKey: 'quest.ch3.valley.step.talk_keeper',
        labelKey: 'quest.ch3.valley.step.talk_keeper',
      },
    ],
    rewards: {
      exp: 1800,
      turquoise: 65,
      codex: ['yarlungValley', 'yumbulagang'],
      flags: ['ch3.valley.done'],
      nextQuest: 'ch3.yaks',
    },
  },

  // C3-2: 水晶崖的伏藏 (Terma of Crystal Cliff — Optional Side Quest)
  {
    id: 'ch3.sheldrak',
    chapter: 'ch3',
    map: 'yarlung',
    sideQuest: true,
    optional: true,
    titleKey: 'quest.ch3.sheldrak.title',
    descKey: 'quest.ch3.sheldrak.desc',
    giverNpc: 'palaceKeeper',
    requires: {
      flags: ['ch3.valley.done'],
    },
    autoStart: true,
    steps: [
      {
        id: 'reach_cave',
        type: 'reach',
        map: 'yarlung',
        x: 4060,
        z: -30,
        r: 12,
        pos: { x: 4060, z: -30 },
        textKey: 'quest.ch3.sheldrak.step.reach_cave',
        labelKey: 'quest.ch3.sheldrak.step.reach_cave',
      },
      {
        id: 'collect_shard',
        type: 'collect',
        item: 'termaScrollShard',
        count: 1,
        map: 'yarlung',
        x: 4060,
        z: -30,
        pos: { x: 4060, z: -30 },
        textKey: 'quest.ch3.sheldrak.step.collect_shard',
        labelKey: 'quest.ch3.sheldrak.step.collect_shard',
      },
    ],
    rewards: {
      exp: 1600,
      turquoise: 85,
      codex: ['sheldrak', 'terma'],
      flags: ['ch3.sheldrak.done'],
    },
  },

  // C3-3: 犛牛群暴走 (Stampede of the Wild Yaks)
  {
    id: 'ch3.yaks',
    chapter: 'ch3',
    map: 'yarlung',
    titleKey: 'quest.ch3.yaks.title',
    descKey: 'quest.ch3.yaks.desc',
    giverNpc: 'herder',
    requires: {
      flags: ['ch3.valley.done'],
    },
    autoStart: true,
    nextQuest: 'ch3.shampo',
    steps: [
      {
        id: 'calm_yaks',
        type: 'liberate',
        tag: 'calmed',
        count: 15,
        map: 'yarlung',
        x: 4000,
        z: 20,
        pos: { x: 4000, z: 20 },
        textKey: 'quest.ch3.yaks.step.calm_yaks',
        labelKey: 'quest.ch3.yaks.step.calm_yaks',
      },
      {
        id: 'talk_herder',
        type: 'talk',
        npc: 'herder',
        map: 'yarlung',
        x: 4025,
        z: 45,
        pos: { x: 4025, z: 45 },
        textKey: 'quest.ch3.yaks.step.talk_herder',
        labelKey: 'quest.ch3.yaks.step.talk_herder',
      },
    ],
    rewards: {
      exp: 2400,
      turquoise: 80,
      flags: ['ch3.yaks.done'],
      nextQuest: 'ch3.shampo',
    },
  },

  // C3-4: 白犛牛 (The White Yak of Yarlha Shampo)
  {
    id: 'ch3.shampo',
    chapter: 'ch3',
    map: 'yarlung',
    titleKey: 'quest.ch3.shampo.title',
    descKey: 'quest.ch3.shampo.desc',
    giverNpc: 'guruVision.yarlung',
    requires: {
      flags: ['ch3.yaks.done'],
    },
    autoStart: true,
    steps: [
      {
        id: 'reach_pasture',
        type: 'reach',
        map: 'yarlung',
        x: 4000,
        z: -75,
        r: 22,
        pos: { x: 4000, z: -75 },
        textKey: 'quest.ch3.shampo.step.reach_pasture',
        labelKey: 'quest.ch3.shampo.step.reach_pasture',
      },
      {
        id: 'subdue_boss',
        type: 'boss',
        bossId: 'yarlhaShampo',
        boss: 'yarlhaShampo',
        count: 1,
        map: 'yarlung',
        x: 4000,
        z: -75,
        pos: { x: 4000, z: -75 },
        textKey: 'quest.ch3.shampo.step.subdue_boss',
        labelKey: 'quest.ch3.shampo.step.subdue_boss',
      },
      {
        id: 'talk_vision',
        type: 'talk',
        npc: 'guruVision.yarlung',
        map: 'yarlung',
        x: 4000,
        z: -52,
        pos: { x: 4000, z: -52 },
        textKey: 'quest.ch3.shampo.step.talk_vision',
        labelKey: 'quest.ch3.shampo.step.talk_vision',
      },
    ],
    rewards: {
      exp: 3200,
      turquoise: 130,
      skillUnlock: 'lotusShield',
      protector: 'whiteYak',
      items: [
        {
          id: 'yakFrost',
          legendaryId: 'yakFrost',
          rarity: 'terma',
          ilvl: 23,
        },
      ],
      codex: [
        'yarlhaShampo',
        'nyen',
        'eightClasses',
      ],
      waypoint: 'samye',
      flags: ['ch3.done', 'ch4.unlocked', 'skill.lotusShield', 'protector.whiteYak'],
      chapterBanner: {
        kickerKey: 'ch3.banner.complete.kicker',
        titleKey: 'ch3.banner.complete.title',
        subKey: 'ch3.banner.complete.sub',
      },
    },
  },
];

export default CH3_QUESTS;
