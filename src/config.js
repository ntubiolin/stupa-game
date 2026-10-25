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
};

export const deg = (d) => (d * Math.PI) / 180;

/** Polar (angle in radians, radius) -> {x, z} on the ground plane. */
export function polar(angle, radius) {
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}
