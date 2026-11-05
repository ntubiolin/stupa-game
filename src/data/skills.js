/**
 * Skill Definitions (#26) — 7-slot Tibetan Buddhist action RPG skill framework.
 *
 * Slots:
 *   basic    (Space) : humBolt    (ཧཱུྃ — Hum Seed Bolt)
 *   chant    (R)     : mantra     (ཨོཾ — Six-Syllable Mantra)
 *   skill1   (1)     : phurba     (ཕུར — Vajra Phurba)
 *   skill2   (2)     : lotusWard  (པདྨ — Lotus Ward)
 *   skill3   (3)     : vajraBell  (དྲིལ — Vajra Bell)
 *   skill4   (4)     : protector  (སྲུང — Dharma Protector)
 *   ultimate (T)     : guruMantra (གུ་རུ — Vajra Guru Mantra)
 */
import '../i18n/skills.js';

export const SKILL_SLOTS = [
  'basic',
  'chant',
  'skill1',
  'skill2',
  'skill3',
  'skill4',
  'ultimate',
];

export const SKILLS = [
  {
    id: 'humBolt',
    slot: 'basic',
    keyLabel: 'Space',
    nameKey: 'skill.humBolt.name',
    descKey: 'skill.humBolt.desc',
    glyph: 'ཧཱུྃ',
    mpCost: 0,
    cooldown: 0.35,
    castTime: 0.2,
    maxRank: 5,
    rankScaling: {
      damageMult: [0.60, 0.68, 0.76, 0.84, 0.92],
    },
    enhancements: {
      a: { id: 'a', nameKey: 'skill.humBolt.enhA.name', descKey: 'skill.humBolt.enhA.desc' },
      b: { id: 'b', nameKey: 'skill.humBolt.enhB.name', descKey: 'skill.humBolt.enhB.desc' },
    },
    unlock: { flag: null, hintKey: null },
    cast(ctx, { rank = 1, enh = null, origin, dir, target }) {
      const idx = Math.max(0, Math.min(4, rank - 1));
      const damageMult = this.rankScaling.damageMult[idx] ?? 0.60;
      const castDir = typeof dir === 'number' ? dir : (ctx.state?.player?.heading || 0);
      if (ctx.state?.player) {
        ctx.state.player.heading = castDir;
        ctx.state.player.castHeading = castDir;
        ctx.state.player.castSlowUntil = (ctx.state.elapsed || 0) + this.castTime;
      }
      ctx.projectiles?.fireHumBolt?.({
        origin: origin || ctx.state?.player?.position,
        dir: castDir,
        target,
        rank,
        enh,
        damageMult,
        speed: 22,
        maxRange: 14,
      });
      ctx.bus?.emit('sfx', { name: 'humBolt' });
      return true;
    },
  },
  {
    id: 'mantra',
    slot: 'chant',
    keyLabel: 'R',
    nameKey: 'skill.mantra.name',
    descKey: 'skill.mantra.desc',
    glyph: 'ཨོཾ',
    mpCost: 15,
    cooldown: 0.85,
    stupaCooldown: 0.45,
    castTime: 0,
    maxRank: 5,
    rankScaling: {
      damageMult: [1.0, 1.08, 1.16, 1.24, 1.32],
      radiusAdd: [0, 0.3, 0.6, 0.9, 1.2],
    },
    enhancements: {
      a: { id: 'a', nameKey: 'skill.mantra.enhA.name', descKey: 'skill.mantra.enhA.desc' },
      b: { id: 'b', nameKey: 'skill.mantra.enhB.name', descKey: 'skill.mantra.enhB.desc' },
    },
    unlock: { flag: null, hintKey: null },
    cast(ctx, { rank = 1, enh = null, peaceful = false }) {
      const idx = Math.max(0, Math.min(4, rank - 1));
      const damageMult = this.rankScaling.damageMult[idx] ?? 1.0;
      const radiusAdd = this.rankScaling.radiusAdd[idx] ?? 0;
      if (ctx.mantra?.castFromSkill) {
        return ctx.mantra.castFromSkill({ rank, enh, damageMult, radiusAdd, peaceful });
      }
      if (ctx.mantra?.cast) {
        ctx.mantra.cast({ rank, enh, damageMult, radiusAdd, peaceful });
        return true;
      }
      return true;
    },
  },
  {
    id: 'phurba',
    slot: 'skill1',
    keyLabel: '1',
    nameKey: 'skill.phurba.name',
    descKey: 'skill.phurba.desc',
    glyph: 'ཕུར',
    mpCost: 18,
    cooldown: 5.0,
    castTime: 0.15,
    maxRank: 5,
    rankScaling: {
      damageMult: [1.35, 1.50, 1.65, 1.80, 1.95],
    },
    enhancements: {
      a: { id: 'a', nameKey: 'skill.phurba.enhA.name', descKey: 'skill.phurba.enhA.desc' },
      b: { id: 'b', nameKey: 'skill.phurba.enhB.name', descKey: 'skill.phurba.enhB.desc' },
    },
    unlock: { flag: 'skill.phurba', hintKey: 'skill.phurba.unlockHint' },
    cast(ctx, payload) {
      if (ctx.skillEffects?.castPhurba) {
        return ctx.skillEffects.castPhurba(payload);
      }
      ctx.bus?.emit('skill:effect', { id: 'phurba', ...payload });
      ctx.bus?.emit('sfx', { name: 'humBolt' });
      return true;
    },
  },
  {
    id: 'lotusWard',
    slot: 'skill2',
    keyLabel: '2',
    nameKey: 'skill.lotusWard.name',
    descKey: 'skill.lotusWard.desc',
    glyph: 'པདྨ',
    mpCost: 22,
    cooldown: 10.0,
    castTime: 0,
    maxRank: 5,
    rankScaling: {
      damageMult: [1.00, 1.15, 1.30, 1.45, 1.60],
    },
    enhancements: {
      a: { id: 'a', nameKey: 'skill.lotusWard.enhA.name', descKey: 'skill.lotusWard.enhA.desc' },
      b: { id: 'b', nameKey: 'skill.lotusWard.enhB.name', descKey: 'skill.lotusWard.enhB.desc' },
    },
    unlock: { flag: 'skill.lotusWard', hintKey: 'skill.lotusWard.unlockHint' },
    cast(ctx, payload) {
      if (ctx.skillEffects?.castLotusWard) {
        return ctx.skillEffects.castLotusWard(payload);
      }
      ctx.bus?.emit('skill:effect', { id: 'lotusWard', ...payload });
      ctx.bus?.emit('sfx', { name: 'chant' });
      return true;
    },
  },
  {
    id: 'vajraBell',
    slot: 'skill3',
    keyLabel: '3',
    nameKey: 'skill.vajraBell.name',
    descKey: 'skill.vajraBell.desc',
    glyph: 'དྲིལ',
    mpCost: 20,
    cooldown: 8.0,
    castTime: 0,
    maxRank: 5,
    rankScaling: {
      damageMult: [0.90, 1.02, 1.14, 1.26, 1.38],
    },
    enhancements: {
      a: { id: 'a', nameKey: 'skill.vajraBell.enhA.name', descKey: 'skill.vajraBell.enhA.desc' },
      b: { id: 'b', nameKey: 'skill.vajraBell.enhB.name', descKey: 'skill.vajraBell.enhB.desc' },
    },
    unlock: { flag: 'skill.vajraBell', hintKey: 'skill.vajraBell.unlockHint' },
    cast(ctx, payload) {
      if (ctx.skillEffects?.castVajraBell) {
        return ctx.skillEffects.castVajraBell(payload);
      }
      ctx.bus?.emit('skill:effect', { id: 'vajraBell', ...payload });
      ctx.bus?.emit('sfx', { name: 'chant' });
      return true;
    },
  },
  {
    id: 'protector',
    slot: 'skill4',
    keyLabel: '4',
    nameKey: 'skill.protector.name',
    descKey: 'skill.protector.desc',
    glyph: 'སྲུང',
    mpCost: 25,
    cooldown: 16.0,
    castTime: 0,
    maxRank: 5,
    rankScaling: {
      damageMult: [0.85, 0.98, 1.11, 1.24, 1.37],
    },
    enhancements: {
      a: { id: 'a', nameKey: 'skill.protector.enhA.name', descKey: 'skill.protector.enhA.desc' },
      b: { id: 'b', nameKey: 'skill.protector.enhB.name', descKey: 'skill.protector.enhB.desc' },
    },
    unlock: { flag: 'skill.protector', hintKey: 'skill.protector.unlockHint' },
    cast(ctx, payload) {
      if (ctx.skillEffects?.castProtector) {
        return ctx.skillEffects.castProtector(payload);
      }
      ctx.bus?.emit('skill:effect', { id: 'protector', ...payload });
      ctx.bus?.emit('sfx', { name: 'chant' });
      return true;
    },
  },
  {
    id: 'guruMantra',
    slot: 'ultimate',
    keyLabel: 'T',
    nameKey: 'skill.guruMantra.name',
    descKey: 'skill.guruMantra.desc',
    glyph: 'གུ་རུ',
    mpCost: 40,
    cooldown: 30.0,
    castTime: 0.2,
    maxRank: 5,
    rankScaling: {
      damageMult: [2.20, 2.50, 2.80, 3.10, 3.40],
    },
    enhancements: {
      a: { id: 'a', nameKey: 'skill.guruMantra.enhA.name', descKey: 'skill.guruMantra.enhA.desc' },
      b: { id: 'b', nameKey: 'skill.guruMantra.enhB.name', descKey: 'skill.guruMantra.enhB.desc' },
    },
    unlock: { flag: 'skill.guruMantra', hintKey: 'skill.guruMantra.unlockHint' },
    cast(ctx, payload) {
      if (ctx.skillEffects?.castGuruMantra) {
        return ctx.skillEffects.castGuruMantra(payload);
      }
      ctx.bus?.emit('skill:effect', { id: 'guruMantra', ...payload });
      ctx.bus?.emit('sfx', { name: 'chant' });
      return true;
    },
  },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const SKILL_BY_SLOT = Object.fromEntries(SKILLS.map((s) => [s.slot, s]));

export function getSkillDef(slotOrId) {
  if (!slotOrId) return null;
  return SKILL_BY_ID[slotOrId] || SKILL_BY_SLOT[slotOrId] || null;
}
