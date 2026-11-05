/**
 * Chapter 4 (Samye Monastery & Mount Hepo Ri) — Enemy Definitions (`src/data/enemies/samye.js`) — Issue #35
 *
 * Defines 3 new Chapter 4 enemy kinds (Lv1 base stats, auto-scaled to map level 23–30):
 *   1. `wallBreaker` (夜拆鬼 / Night Wall-Breaker):
 *      - HP 40, speed 2.0, exp 10
 *      - Prioritizes attacking temple wall segments until hit by player; `smash` melee 12 dmg
 *   2. `du` (黑煙魔 / Dü Demon):
 *      - HP 60, speed 2.4, exp 16
 *      - `shadowStep`: teleports behind player and strikes for 16 dmg + `claw` melee
 *   3. `gyalpo` (白笠王魔 / Gyalpo Spirit):
 *      - HP 55, speed 1.8, exp 18
 *      - `curseOrb`: 3 orbiting magic orbs fired at player (10 dmg);
 *        `silence`: 3m AoE silencing player skills for 2s
 */
import '../../i18n/ch4.js';

export const SAMYE_ENEMIES = {
  wallBreaker: {
    hp: 40,
    speed: 2.0,
    exp: 10,
    def: 16,
    ccResist: 0.1,
    ring: 'near',
    radius: 0.65,
    height: 1.55,
    stopDistance: 1.35,
    prioritizeWall: true,
    nameKey: 'enemy.wallBreaker',
    tags: ['wallBreaker', 'eightClasses', 'samye'],
    attacks: [
      {
        id: 'smash',
        type: 'melee',
        damage: 12,
        range: 1.9,
        hitReach: 2.2,
        windup: 0.45,
        recover: 0.4,
        cooldown: 2.1,
        weight: 1.0,
      },
    ],
  },

  du: {
    hp: 60,
    speed: 2.4,
    exp: 16,
    def: 20,
    ccResist: 0.2,
    ring: 'mid',
    radius: 0.62,
    height: 1.85,
    stopDistance: 1.3,
    nameKey: 'enemy.du',
    tags: ['du', 'eightClasses', 'samye'],
    attacks: [
      {
        id: 'shadowStep',
        type: 'special',
        damage: 16,
        minRange: 2.2,
        range: 13.0,
        hitReach: 2.5,
        windup: 0.48,
        recover: 0.42,
        cooldown: 5.2,
        weight: 1.4,
      },
      {
        id: 'claw',
        type: 'melee',
        damage: 12,
        range: 1.8,
        hitReach: 2.0,
        windup: 0.35,
        recover: 0.32,
        cooldown: 1.9,
        weight: 1.0,
      },
    ],
  },

  gyalpo: {
    hp: 55,
    speed: 1.8,
    exp: 18,
    def: 18,
    ccResist: 0.25,
    ring: 'deep',
    radius: 0.64,
    height: 2.05,
    stopDistance: 5.5,
    nameKey: 'enemy.gyalpo',
    tags: ['gyalpo', 'eightClasses', 'samye'],
    attacks: [
      {
        id: 'curseOrb',
        type: 'magic',
        damage: 10,
        count: 3,
        minRange: 1.8,
        range: 14.0,
        windup: 0.55,
        recover: 0.45,
        cooldown: 3.4,
        speed: 4.8,
        turnRate: 1.15,
        lifetime: 3.8,
        hitRadius: 0.42,
        weight: 1.2,
      },
      {
        id: 'silence',
        type: 'aoe',
        damage: 10,
        aoeRadius: 3.0,
        silenceDuration: 2.0,
        range: 3.4,
        windup: 0.72,
        recover: 0.5,
        cooldown: 6.5,
        weight: 1.1,
      },
    ],
  },
};

export default SAMYE_ENEMIES;
