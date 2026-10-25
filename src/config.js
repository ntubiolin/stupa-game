/**
 * Global world/gameplay constants. Single source of truth for layout so the
 * World and Gameplay modules agree on positions without talking to each other.
 *
 * Coordinate conventions (see ARCHITECTURE.md):
 *  - Units are meters. +Y is up. Origin = stupa center at ground level (y = 0).
 *  - North = -Z, East = +X.
 *  - Polar angle θ = Math.atan2(z, x). Clockwise kora (viewed from above,
 *    stupa on the walker's RIGHT shoulder) means θ is INCREASING.
 */
export const CONFIG = {
  STUPA: {
    baseHalf: 13,          // outer mandala tier half-width (square, with indented corners)
    tierCount: 3,
    tierHeight: 1.6,       // => terrace top at y = 4.8
    domeRadius: 9,
    harmikaSize: 5,        // gilded cube with Buddha eyes
    harmikaHeight: 4,
    spireTop: 26,          // y of the top of the 13-step spire
    pinnacleTop: 29,       // y of the very top (umbrella + finial)
  },

  /** Low circular wall around the stupa, prayer wheels on its OUTER face. */
  WALL: {
    radius: 19,
    height: 1.3,
    thickness: 0.6,
    gateAngleDeg: -90,     // single entrance on the north side (visual only, not walkable)
    wheelCount: 108,
    wheelSpinRadius: 1.3,  // player within this distance of a wheel (and moving) spins it
  },

  /** Walkable plaza is the ring between these radii. */
  WORLD: {
    stupaColliderRadius: 19.9, // nothing walks inside this circle
    walkRadius: 38,            // outer boundary for player/monkeys
    buildingsInnerRadius: 40,  // building facades start here
    groundRadius: 160,
  },

  PLAYER: {
    radius: 0.35,
    height: 1.7,
    walkSpeed: 2.6,
    runSpeed: 5.0,
    startAngleDeg: 90,     // south side (+Z), facing the stupa
    startRadius: 30,
  },

  LAMPS: {
    /** Butter-lamp stations on the kora path, each holding `lampsPerStation` lamps. */
    stations: [
      { angleDeg: 45, radius: 22.5 },
      { angleDeg: 165, radius: 22.5 },
      { angleDeg: 285, radius: 22.5 },
    ],
    lampsPerStation: 12,
    interactRadius: 2.2,
  },

  MONKEYS: {
    count: 5,
    interactRadius: 5,
  },

  TIME: {
    dayLengthSec: 240,     // full 24h cycle
    start: 0.30,           // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
  },

  RENDER: {
    maxPixelRatio: 2,
    bloom: { strength: 0.34, radius: 0.4, threshold: 1.05 },
    shadowMapSize: 2048,
  },

  /** Highland wilderness zone (accessible via north monastery gate). */
  WILD: {
    origin: { x: 1000, z: 0 },
    walkRadius: 70,
    stupaGate: {
      x: 0,
      z: -37.0,
      radius: 3.2,
      returnPos: { x: 0, z: -34.2 },
      returnHeading: Math.PI, // faces stupa at (0, 0)
    },
    wildGate: {
      x: 1000,
      z: 62,
      radius: 3.5,
      spawnPos: { x: 1000, z: 57 },
      teleportPos: { x: 1000, z: 38 },
      spawnHeading: 0, // faces north into wilderness (-Z)
    },
    safeZoneRadius: 10,
    SafeZoneRadius: 10,
    maniStones: [
      { x: 988, z: 28, radius: 4 },
      { x: 1018, z: 5, radius: 4 },
      { x: 992, z: -24, radius: 4 },
    ],
    zones: [
      { id: 'near', minR: 8, maxR: 26 },
      { id: 'mid', minR: 26, maxR: 46 },
      { id: 'deep', minR: 46, maxR: 65 },
    ],
    terrain: {
      size: 180,
      segments: 96,
      wave1FreqX: 0.052,
      wave1FreqZ: 0.048,
      wave1Amp: 2.2,
      wave2FreqX: 0.11,
      wave2FreqZ: 0.08,
      wave2Amp: 1.1,
      wave3FreqX: 0.025,
      wave3FreqZ: 0.035,
      wave3Amp: 1.5,
      rimRadius: 58,
      rimAmp: 14,
    },
    chorten: {
      x: 1000,
      z: 0,
      colliderRadius: 1.8,
    },
    boulders: {
      count: 22,
      minRadius: 1.1,
      maxRadius: 2.3,
    },
    mountains: {
      count: 24,
      innerRadius: 125,
      outerRadius: 180,
      minHeight: 38,
      maxHeight: 75,
    },
  },

  VITALS: {
    baseHp: 100,
    hpPerLevel: 10,
    baseMp: 60,
    mpPerLevel: 5,
    baseAtk: 10,
    atkPerLevel: 4,
    baseDef: 0,
    expBase: 20,
    expExponent: 1.5,
    maxLevel: 30,
    defConstant: 50,
    magicDefFactor: 0.5,
    invulnDuration: 0.8,
    knockbackDist: 1.5,
    slowMultiplier: 0.5,
    faintDuration: 1.8,
    faintTeleportTime: 1.2,
    faintInvulnDuration: 3.0,
    faintHpRatio: 0.5,
    faintExpLossRatio: 0.1,
    restore: {
      prostrationHp: 25,
      lampMp: 15,
      monkeyMp: 10,
      maniMp: 1,
      maniRadius: 4,
      maniInterval: 0.85,
    },
  },

  MERIT: {
    weights: {
      kora: 108,
      prostration: 27,
      lamp: 18,
      monkey: 12,
      wheel: 3,
      preta: 1,
      tsen: 3,
      migoi: 8,
    },
    achievements: [
      { id: 'firstKora' },
      { id: 'threeKora' },
      { id: 'sevenProstrations' },
      { id: 'prostrations108' },
      { id: 'firstLamp' },
      { id: 'lamps21' },
      { id: 'feed5' },
      { id: 'wheels108' },
      { id: 'sunset' },
      { id: 'night' },
      { id: 'allPractices' },
      { id: 'firstLiberation' },
      { id: 'liberatePreta50' },
      { id: 'liberateTsen' },
      { id: 'liberateMigoi' },
      { id: 'level10' },
      { id: 'fullDorje' },
      { id: 'compassion' },
    ],
  },

  ITEMS: {
    dropChance: 0.3,
    pityThreshold: 5,
    despawnSec: 60,
    pickupRadius: 1.2,
    permanentCap: 20,
    flightDur: 0.55,
    dropFlightDur: 0.35,
    arcHeight: 1.6,
    dropArcHeight: 1.1,
    bobAmp: 0.06,
    bobFreq: 2.2,
    rotSpeed: 1.2,
    table: {
      sungdu: { id: 'sungdu', permanent: false, weight: 35, duration: 120, stats: { defAdd: 15 } },
      dungkar: { id: 'dungkar', permanent: false, weight: 35, duration: 90, stats: { atkMult: 1.5 } },
      gau: { id: 'gau', permanent: true, weight: 15, stat: 'def', amount: 2, cap: 20 },
      dorje: { id: 'dorje', permanent: true, weight: 15, stat: 'atk', amount: 2, cap: 20 },
    },
  },

  MANTRA: {
    mpCost: 8,
    cooldown: 0.85,
    stupaCooldown: 0.45,
    radius: 6.0,
    startRadius: 0.5,
    stupaRadius: 1.5,
    duration: 0.5,
    moveSpeedMult: 0.6,
    poolSize: 6,
    syllables: ['ཨོཾ', 'མ', 'ཎི', 'པ', 'དྨེ', 'ཧཱུྃ'],
    ringSegments: 64,
    ringInnerRatio: 0.88,
    innerRingRadius: 2.8,
    innerRingInnerRatio: 0.84,
    spriteHeight: 0.85,
    spriteScale: 0.85,
    rotationSpeed: Math.PI * 0.75,
  },

  PROJECTILES: {
    maxActive: 20,
  },

  ENEMIES: {
    maxCount: 12,
    sightRange: 14,
    leashRange: 25,
    gateSafeRadius: 10,
    respawnMin: 20,
    respawnMax: 40,
    respawnMinPlayerDist: 20,
    contactDamage: 3,
    hurtDuration: 0.25,
    hurtKnockback: 1.5,
    liberateDuration: 1.2,
    playerKnockback: 1.5,
    initialCounts: {
      preta: 5,
      tsen: 4,
      migoi: 3,
    },
    kinds: {
      preta: {
        id: 'preta',
        nameKey: 'enemy.preta',
        hp: 20,
        speed: 1.8,
        exp: 5,
        ring: 'near',
        radius: 0.55,
        height: 1.5,
        stopDistance: 1.2,
        attacks: [
          {
            id: 'claw',
            type: 'melee',
            magic: false,
            damage: 6,
            range: 1.5,
            hitReach: 1.8,
            windup: 0.4,
            cooldown: 1.5,
            recover: 0.35,
            weight: 1.0,
          },
          {
            id: 'ghostfire',
            type: 'magic',
            magic: true,
            damage: 8,
            range: 10.0,
            minRange: 1.6,
            speed: 4.0,
            turnRate: 1.2,
            lifetime: 4.0,
            cooldown: 3.2,
            windup: 0.6,
            recover: 0.35,
            hitRadius: 0.45,
            weight: 1.0,
          },
        ],
      },
      tsen: {
        id: 'tsen',
        nameKey: 'enemy.tsen',
        hp: 45,
        speed: 2.2,
        chargeSpeed: 20,
        exp: 15,
        ring: 'mid',
        radius: 0.8,
        height: 2.1,
        stopDistance: 6.5,
        attacks: [
          {
            id: 'spearCharge',
            type: 'charge',
            magic: false,
            damage: 14,
            range: 8.0,
            dashDist: 8.0,
            dashDuration: 0.4,
            hitWidth: 1.1,
            windup: 0.6,
            cooldown: 4.0,
            recover: 0.35,
            weight: 1.0,
          },
          {
            id: 'redArrow',
            type: 'ranged',
            magic: false,
            damage: 10,
            range: 16.0,
            minRange: 3.0,
            speed: 18.0,
            lifetime: 1.5,
            cooldown: 2.8,
            windup: 0.7,
            recover: 0.35,
            hitRadius: 0.4,
            weight: 1.2,
          },
        ],
      },
      migoi: {
        id: 'migoi',
        nameKey: 'enemy.migoi',
        hp: 120,
        speed: 1.4,
        exp: 40,
        ring: 'deep',
        radius: 1.0,
        height: 2.6,
        stopDistance: 3.2,
        attacks: [
          {
            id: 'groundSlam',
            type: 'aoe',
            magic: false,
            damage: 20,
            range: 3.5,
            aoeRadius: 3.5,
            windup: 1.0,
            cooldown: 5.0,
            recover: 0.5,
            weight: 1.0,
          },
          {
            id: 'boulder',
            type: 'ranged',
            magic: false,
            damage: 16,
            minRange: 6.0,
            range: 18.0,
            flightDuration: 1.2,
            hitRadius: 1.8,
            arcHeight: 5.5,
            cooldown: 5.5,
            windup: 0.45,
            recover: 0.45,
            weight: 1.0,
          },
          {
            id: 'frostRoar',
            type: 'magic',
            magic: true,
            damage: 12,
            minRange: 3.5,
            range: 14.0,
            aoeRadius: 2.2,
            eruptDelay: 1.2,
            slow: 2.0,
            cooldown: 7.2,
            windup: 0.4,
            recover: 0.5,
            weight: 1.0,
          },
        ],
      },
    },
  },
};

export const deg = (d) => (d * Math.PI) / 180;

/** Polar (angle in radians, radius) -> {x, z} on the ground plane. */
export function polar(angle, radius) {
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}
