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
};

export const deg = (d) => (d * Math.PI) / 180;

/** Polar (angle in radians, radius) -> {x, z} on the ground plane. */
export function polar(angle, radius) {
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
}
