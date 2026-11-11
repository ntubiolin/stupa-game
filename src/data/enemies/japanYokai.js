export const JAPAN_YOKAI_ENEMIES = {
  kappa: {
    id: 'kappa', nameKey: 'enemy.kappa', hp: 105, speed: 2.5, exp: 18, radius: 0.55, height: 1.35, stopDistance: 1.4,
    attacks: [
      { id: 'claw', type: 'melee', range: 1.9, hitReach: 2, windup: 0.42, damage: 8, cooldown: 2.1, recover: 0.3 },
      { id: 'ghostfire', type: 'magic', range: 12, minRange: 3, windup: 0.7, damage: 7, speed: 5, lifetime: 3.5, hitRadius: 0.45, cooldown: 4.1, recover: 0.4 },
    ],
  },
  tengu: {
    id: 'tengu', nameKey: 'enemy.tengu', hp: 175, speed: 3.1, exp: 30, radius: 0.58, height: 1.8, stopDistance: 2.4,
    attacks: [
      { id: 'redArrow', type: 'ranged', range: 15, minRange: 4, windup: 0.62, damage: 12, speed: 11, lifetime: 2, hitRadius: 0.35, cooldown: 3.2, recover: 0.35 },
      { id: 'spinDash', type: 'charge', range: 8, minRange: 1.5, windup: 0.6, dashDist: 6.5, dashDuration: 0.42, hitWidth: 1.2, damage: 11, cooldown: 4.5, recover: 0.45 },
    ],
  },
  akaOni: {
    id: 'akaOni', nameKey: 'enemy.akaOni', hp: 310, speed: 1.85, exp: 52, radius: 0.82, height: 2.35, stopDistance: 1.7,
    attacks: [
      { id: 'smash', type: 'melee', range: 2.5, hitReach: 2.7, windup: 0.7, damage: 18, cooldown: 2.8, recover: 0.45 },
      { id: 'groundSlam', type: 'melee', range: 3.4, aoeRadius: 3.8, windup: 1, damage: 15, cooldown: 5.2, recover: 0.6 },
    ],
  },
};
