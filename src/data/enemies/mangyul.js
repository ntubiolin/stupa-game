// ============================================================================
// Mangyul Pass (芒域山口) Enemy Definitions — Chapter 2
// Auto-discovered by src/gameplay/enemies.js via import.meta.glob('../data/enemies/*.js')
// ============================================================================

export const MANGYUL_ENEMIES = {
  snowSprite: {
    nameKey: 'enemy.snowSprite',
    hp: 26,
    speed: 2.4,
    exp: 8,
    radius: 0.65,
    aggroRadius: 14,
    leashRadius: 22,
    attackRange: 9.5,
    preferredMinDist: 4.8,
    color: 0x90e0ff,
    accentColor: 0xe0f8ff,
    eyeColor: 0x38d8ff,
    attacks: [
      {
        id: 'iceShard',
        name: 'iceShard',
        type: 'ranged',
        damage: 6,
        count: 3,
        spreadRad: 0.24,
        windup: 0.55,
        cooldown: 2.3,
        range: 9.5,
        speed: 10.5,
        projectileSpeed: 10.5,
      },
    ],
  },

  hailGhost: {
    nameKey: 'enemy.hailGhost',
    hp: 34,
    speed: 1.6,
    exp: 10,
    radius: 0.72,
    aggroRadius: 13,
    leashRadius: 22,
    attackRange: 8.5,
    color: 0x5c768d,
    accentColor: 0xa8d8f0,
    eyeColor: 0x70e4ff,
    attacks: [
      {
        id: 'hailCall',
        name: 'hailCall',
        type: 'targetedAoe',
        magic: true,
        damage: 9,
        count: 3,
        aoeRadius: 1.9,
        windup: 0.7,
        eruptDelay: 0.85,
        cooldown: 3.1,
        range: 9.0,
      },
    ],
  },

  avalancheBrute: {
    nameKey: 'enemy.avalancheBrute',
    hp: 90,
    speed: 1.3,
    exp: 25,
    radius: 1.15,
    aggroRadius: 13,
    leashRadius: 24,
    attackRange: 3.2,
    color: 0xdce8f2,
    accentColor: 0x6a7885,
    eyeColor: 0x4cc9ff,
    attacks: [
      {
        id: 'avalancheRoll',
        name: 'avalancheRoll',
        type: 'charge',
        damage: 18,
        windup: 0.85,
        cooldown: 4.2,
        range: 9.5,
        dashDist: 10.0,
        dashDuration: 0.5,
        hitWidth: 2.5,
      },
      {
        id: 'stomp',
        name: 'stomp',
        type: 'melee',
        damage: 14,
        windup: 0.75,
        cooldown: 3.2,
        range: 3.2,
        aoeRadius: 3.0,
      },
    ],
  },
};

export default MANGYUL_ENEMIES;
