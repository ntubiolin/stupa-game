/**
 * Chapter 4 (Samye Monastery & Mount Hepo Ri) — Quest Definitions (`src/data/quests/ch4.js`) — Issue #35
 *
 * Defines 5 sequential quests for Chapter 4 (`ch4`):
 *   - C4-1 `ch4.foundation`（「寂護與藏王」）: talk shantarakshita -> talk trisongDetsen
 *   - C4-2 `ch4.dayNight`（「晝建夜毀」）: survive 3 day-build / night-defense cycles (`samye:nightSurvived` x3)
 *   - C4-3 `ch4.hepori`（「海波日山之巔」）: reach Hepo Ri summit `(5075, -10, r: 15)` -> `hepori:cleared`
 *   - C4-4 `ch4.pehar`（「白哈爾王」）: boss `pehar` at `(5000, -65)`
 *   - C4-5 `ch4.samye`（「桑耶」）: `samye:endingPlayed` -> `kora` (`count: 1` around Samye) -> `talk shantarakshita`
 */
import '../../i18n/ch4.js';

export const CH4_QUESTS = [
  // ---------------------------------------------------------------- C4-1: ch4.foundation
  {
    id: 'ch4.foundation',
    chapter: 'ch4',
    map: 'samye',
    titleKey: 'quest.ch4.foundation.title',
    descKey: 'quest.ch4.foundation.desc',
    giverNpc: 'shantarakshita',
    requires: {
      flags: ['ch4.unlocked'],
    },
    autoStart: true,
    nextQuest: 'ch4.dayNight',
    steps: [
      {
        id: 'talk_shanta',
        type: 'talk',
        npc: 'shantarakshita',
        map: 'samye',
        x: 4970,
        z: 55,
        pos: { x: 4970, z: 55 },
        textKey: 'quest.ch4.foundation.step.talk_shanta',
        labelKey: 'quest.ch4.foundation.step.talk_shanta',
      },
      {
        id: 'talk_king',
        type: 'talk',
        npc: 'trisongDetsen',
        map: 'samye',
        x: 4973.5,
        z: 55,
        pos: { x: 4973.5, z: 55 },
        textKey: 'quest.ch4.foundation.step.talk_king',
        labelKey: 'quest.ch4.foundation.step.talk_king',
      },
    ],
    rewards: {
      exp: 420,
      turquoise: 120,
      codex: ['samye', 'shantarakshita', 'trisongDetsen'],
      flags: ['ch4.foundation.done'],
      nextQuest: 'ch4.dayNight',
    },
  },

  // ---------------------------------------------------------------- C4-2: ch4.dayNight
  {
    id: 'ch4.dayNight',
    chapter: 'ch4',
    map: 'samye',
    titleKey: 'quest.ch4.dayNight.title',
    descKey: 'quest.ch4.dayNight.desc',
    giverNpc: 'trisongDetsen',
    requires: {
      flags: ['ch4.foundation.done'],
    },
    autoStart: true,
    nextQuest: 'ch4.hepori',
    steps: [
      {
        id: 'survive_nights',
        type: 'event',
        name: 'samye:nightSurvived',
        event: 'samye:nightSurvived',
        count: 3,
        map: 'samye',
        x: 4966.5,
        z: 52.5,
        pos: { x: 4966.5, z: 52.5 },
        textKey: 'quest.ch4.dayNight.step.survive_nights',
        labelKey: 'quest.ch4.dayNight.step.survive_nights',
      },
    ],
    rewards: {
      exp: 680,
      turquoise: 180,
      item: { rarity: 'rare', slot: 'armor', level: 26 },
      items: [{ rarity: 'rare', slot: 'armor', level: 26 }],
      codex: ['samyeMandala'],
      flags: ['ch4.dayNight.done'],
      nextQuest: 'ch4.hepori',
    },
  },

  // ---------------------------------------------------------------- C4-3: ch4.hepori
  {
    id: 'ch4.hepori',
    chapter: 'ch4',
    map: 'samye',
    titleKey: 'quest.ch4.hepori.title',
    descKey: 'quest.ch4.hepori.desc',
    giverNpc: 'guruVision.samye',
    requires: {
      flags: ['ch4.dayNight.done'],
    },
    autoStart: true,
    nextQuest: 'ch4.pehar',
    steps: [
      {
        id: 'reach_summit',
        type: 'reach',
        map: 'samye',
        x: 5075,
        z: -10,
        r: 15,
        radius: 15,
        pos: { x: 5075, z: -10 },
        textKey: 'quest.ch4.hepori.step.reach_summit',
        labelKey: 'quest.ch4.hepori.step.reach_summit',
      },
      {
        id: 'clear_gauntlet',
        type: 'event',
        name: 'hepori:cleared',
        event: 'hepori:cleared',
        count: 1,
        map: 'samye',
        x: 5075,
        z: -10,
        pos: { x: 5075, z: -10 },
        textKey: 'quest.ch4.hepori.step.clear_gauntlet',
        labelKey: 'quest.ch4.hepori.step.clear_gauntlet',
      },
    ],
    rewards: {
      exp: 760,
      turquoise: 210,
      codex: ['hepori', 'eightClasses'],
      flags: ['ch4.hepori.done'],
      nextQuest: 'ch4.pehar',
    },
  },

  // ---------------------------------------------------------------- C4-4: ch4.pehar
  {
    id: 'ch4.pehar',
    chapter: 'ch4',
    map: 'samye',
    titleKey: 'quest.ch4.pehar.title',
    descKey: 'quest.ch4.pehar.desc',
    giverNpc: 'shantarakshita',
    requires: {
      flags: ['ch4.hepori.done'],
    },
    autoStart: true,
    nextQuest: 'ch4.samye',
    steps: [
      {
        id: 'boss',
        type: 'boss',
        boss: 'pehar',
        bossId: 'pehar',
        map: 'samye',
        x: 5000,
        z: -65,
        pos: { x: 5000, z: -65 },
        textKey: 'quest.ch4.pehar.step.boss',
        labelKey: 'quest.ch4.pehar.step.boss',
      },
    ],
    rewards: {
      exp: 950,
      turquoise: 260,
      item: { rarity: 'dharma', slot: 'mainhand', level: 30 },
      items: [{ rarity: 'dharma', slot: 'mainhand', level: 30 }],
      codex: ['pehar'],
      flags: ['ch4.pehar.done', 'boss.pehar', 'protector.pehar'],
      nextQuest: 'ch4.samye',
    },
  },

  // ---------------------------------------------------------------- C4-5: ch4.samye
  {
    id: 'ch4.samye',
    chapter: 'ch4',
    map: 'samye',
    titleKey: 'quest.ch4.samye.title',
    descKey: 'quest.ch4.samye.desc',
    giverNpc: 'shantarakshita',
    requires: {
      flags: ['ch4.pehar.done'],
    },
    autoStart: true,
    steps: [
      {
        id: 'ending',
        type: 'event',
        name: 'samye:endingPlayed',
        event: 'samye:endingPlayed',
        count: 1,
        map: 'samye',
        x: 4973.5,
        z: 55,
        pos: { x: 4973.5, z: 55 },
        textKey: 'quest.ch4.samye.step.ending',
        labelKey: 'quest.ch4.samye.step.ending',
      },
      {
        id: 'kora',
        type: 'kora',
        count: 1,
        laps: 1,
        map: 'samye',
        x: 5000,
        z: 48,
        pos: { x: 5000, z: 48 },
        textKey: 'quest.ch4.samye.step.kora',
        labelKey: 'quest.ch4.samye.step.kora',
      },
      {
        id: 'talk_shanta',
        type: 'talk',
        npc: 'shantarakshita',
        map: 'samye',
        x: 4970,
        z: 55,
        pos: { x: 4970, z: 55 },
        textKey: 'quest.ch4.samye.step.talk_shanta',
        labelKey: 'quest.ch4.samye.step.talk_shanta',
      },
    ],
    rewards: {
      exp: 1100,
      turquoise: 320,
      skillUnlock: 'vajraGuru',
      protector: 'pehar',
      codex: ['samyeName', 'sevenTestedMen'],
      waypoint: 'chimphu',
      flags: ['ch4.done', 'ch5.unlocked', 'skill.vajraGuru', 'protector.pehar'],
      chapterBanner: 'ch4.banner.complete',
    },
  },
];

export default CH4_QUESTS;
