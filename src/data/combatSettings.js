/** Shared encounter geometry and player incoming-damage difficulty presets. */
export const MIGOI_ARENA_RADIUS = 20;
export const DIFFICULTIES = Object.freeze([
  Object.freeze({ id: 'easy', damageTaken: 0.6 }),
  Object.freeze({ id: 'normal', damageTaken: 1 }),
  Object.freeze({ id: 'hard', damageTaken: 1.4 }),
]);

export function resolveDifficulty(value) {
  return DIFFICULTIES.find(preset => preset.id === value) || DIFFICULTIES[1];
}

export function getDifficulty(ctx) {
  return resolveDifficulty(ctx.save?.get('settings', {})?.difficulty);
}
