import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createBus } from '../src/core/events.js';
import { createVitals } from '../src/systems/vitals.js';
import { resolveDifficulty, MIGOI_ARENA_RADIUS } from '../src/data/combatSettings.js';
import { computeWildernessHeight } from '../src/world/wilderness.js';
import { MIGOI_KING_DEF } from '../src/gameplay/bosses/migoiKing.js';

function fixture(difficulty) {
  const sections = { settings: { difficulty, muted: true } };
  const ctx = {
    config: CONFIG, bus: createBus(), state: { elapsed: 10, player: {} },
    save: {
      get: (section, fallback) => structuredClone(sections[section] ?? fallback),
      set: (section, value) => { sections[section] = structuredClone(value); },
    },
  };
  const vitals = createVitals(ctx);
  return { ctx, vitals, sections };
}
for (const type of ['physical', 'magic']) {
  for (const [difficulty, expected] of [['easy', 12], ['normal', 20], ['hard', 28], [undefined, 20], ['invalid', 20]]) {
    const { ctx, vitals } = fixture(difficulty);
    ctx.state.player.def = 0;
    assert.equal(vitals.damage(20, type), expected, `${difficulty}/${type}`);
    assert.equal(vitals.damage(20, type), 0, 'invulnerability blocks repeated hits');
  }
}
{
  const { ctx, vitals, sections } = fixture('normal');
  ctx.state.player.def = 50;
  assert.equal(vitals.damage(20), 10, 'normal retains defense mitigation');
  sections.settings.difficulty = 'easy';
  assert.equal(vitals.damage(20, 'physical', { ignoreInvuln: true }), 6, 'live change applies on next hit');
  vitals.addShield(10, 30);
  assert.equal(vitals.damage(20, 'physical', { ignoreInvuln: true }), 0, 'shield absorbs scaled damage');
  assert.equal(ctx.state.player.shield, 4);
  vitals.clearShield();
  assert.equal(vitals.damage(0.1, 'physical', { ignoreInvuln: true }), 1, 'minimum damage');
  vitals.god(true);
  assert.equal(vitals.damage(100, 'magic', { ignoreInvuln: true }), 0, 'god mode unchanged');
  assert.equal(sections.settings.muted, true);
}
assert.equal(resolveDifficulty('__proto__').id, 'normal');
assert.equal(MIGOI_KING_DEF.arena.r, 20);
for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 32) {
  for (const radius of [14, 17, MIGOI_ARENA_RADIUS]) {
    const height = computeWildernessHeight(1000 + Math.cos(angle) * radius, -48 + Math.sin(angle) * radius, CONFIG.WILD);
    assert.equal(Math.abs(height), 0, `walkable flat arena at radius ${radius}`);
  }
}
console.log('PASS: difficulty damage, mitigation, invulnerability, shield, live change, fallback and 20m arena terrain');
