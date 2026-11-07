/** Shared encounter geometry and player incoming-damage difficulty presets. */
export const MIGOI_ARENA_RADIUS = 20;
export const DIFFICULTIES = Object.freeze([
  Object.freeze({ id: 'easy', damageTaken: 0.5, passiveNearMonsters: true, maxSimultaneousChasers: 2, maxSimultaneousAttackers: 1, mantraHealRatio: 0.16, sanctuarySafe: true }),
  Object.freeze({ id: 'normal', damageTaken: 1, passiveNearMonsters: false, maxSimultaneousChasers: 3, maxSimultaneousAttackers: 2, mantraHealRatio: 0.10, sanctuarySafe: true }),
  Object.freeze({ id: 'hard', damageTaken: 1.4, passiveNearMonsters: false, maxSimultaneousChasers: 6, maxSimultaneousAttackers: 4, mantraHealRatio: 0.06, sanctuarySafe: false }),
]);

export function resolveDifficulty(value) {
  return DIFFICULTIES.find(preset => preset.id === value) || DIFFICULTIES[1];
}

export function getDifficulty(ctx) {
  return resolveDifficulty(ctx.save?.get('settings', {})?.difficulty);
}
