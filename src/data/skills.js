/**
 * Skill Definitions (#26, #27) — 7-slot Tibetan Buddhist action RPG skill framework.
 *
 * Slots:
 *   basic    (Space) : humBolt     (ཧཱུྃ — Hum Seed Bolt)
 *   chant    (R)     : mantra      (ཨོཾ — Six-Syllable Mantra)
 *   skill1   (1)     : phurba      (ཕུར — Vajra Phurba)
 *   skill2   (2)     : vajraBell   (དྲིལ — Vajra Bell)
 *   skill3   (3)     : lotusShield (པདྨ — Lotus Shield, alias lotusWard)
 *   skill4   (4)     : protector   (སྲུང — Dharma Protector)
 *   ultimate (T)     : vajraGuru   (གུ་རུ — Vajra Guru Mantra, alias guruMantra)
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

export const SKILL_ALIASES = {
  lotusWard: 'lotusShield',
  lotusShield: 'lotusShield',
  guruMantra: 'vajraGuru',
  vajraGuru: 'vajraGuru',
};

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
      let damageMult = this.rankScaling.damageMult[idx] ?? 0.60;
      const tsogyalBoosted = Boolean(ctx.powers?.consumeTsogyalHum?.());
      if (tsogyalBoosted) {
        damageMult *= 2.0;
      }
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
        tsogyalBoosted,
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
    mpCost: 14,
    cooldown: 6.0,
    castTime: 0.15,
    maxRank: 5,
    rankScaling: {
      damageMult: [1.40, 1.54, 1.68, 1.82, 1.96],
      rootDuration: [2.0, 2.0, 2.0, 2.0, 2.0],
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
      ctx.bus?.emit('sfx', { name: 'phurba' });
      return true;
    },
  },
  {
    id: 'vajraBell',
    slot: 'skill2',
    keyLabel: '2',
    nameKey: 'skill.vajraBell.name',
    descKey: 'skill.vajraBell.desc',
    glyph: 'དྲིལ',
    mpCost: 18,
    cooldown: 9.0,
    castTime: 0,
    maxRank: 5,
    rankScaling: {
      damageMult: [1.0, 1.1, 1.2, 1.3, 1.4],
      stunDuration: [1.0, 1.1, 1.2, 1.3, 1.4],
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
      ctx.bus?.emit('sfx', { name: 'vajraBell' });
      return true;
    },
  },
  {
    id: 'lotusShield',
    alias: 'lotusWard',
    slot: 'skill3',
    keyLabel: '3',
    nameKey: 'skill.lotusShield.name',
    descKey: 'skill.lotusShield.desc',
    glyph: 'པདྨ',
    mpCost: 20,
    cooldown: 16.0,
    castTime: 0,
    maxRank: 5,
    rankScaling: {
      shieldPct: [0.30, 0.35, 0.40, 0.45, 0.50],
      damageMult: [0.80, 0.80, 0.80, 0.80, 0.80],
    },
    enhancements: {
      a: { id: 'a', nameKey: 'skill.lotusShield.enhA.name', descKey: 'skill.lotusShield.enhA.desc' },
      b: { id: 'b', nameKey: 'skill.lotusShield.enhB.name', descKey: 'skill.lotusShield.enhB.desc' },
    },
    unlock: {
      flag: 'skill.lotusShield',
      altFlag: 'skill.lotusWard',
      hintKey: 'skill.lotusShield.unlockHint',
    },
    cast(ctx, payload) {
      if (ctx.skillEffects?.castLotusShield) {
        return ctx.skillEffects.castLotusShield(payload);
      }
      if (ctx.skillEffects?.castLotusWard) {
        return ctx.skillEffects.castLotusWard(payload);
      }
      ctx.bus?.emit('skill:effect', { id: 'lotusShield', ...payload });
      ctx.bus?.emit('sfx', { name: 'lotus' });
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
    mpCost: 30,
    cooldown: 30.0,
    castTime: 0,
    maxRank: 5,
    rankScaling: {
      duration: [12, 14, 16, 18, 20],
      damageMult: [1.0, 1.1, 1.2, 1.3, 1.4],
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
      ctx.bus?.emit('sfx', { name: 'summon' });
      return true;
    },
  },
  {
    id: 'vajraGuru',
    alias: 'guruMantra',
    slot: 'ultimate',
    keyLabel: 'T',
    nameKey: 'skill.vajraGuru.name',
    descKey: 'skill.vajraGuru.desc',
    glyph: 'གུ་རུ',
    mpCost: 0,
    cooldown: 0,
    usesCharge: true,
    maxCharge: 30,
    channelDuration: 2.5,
    castTime: 2.5,
    maxRank: 5,
    rankScaling: {
      damageMult: [5.0, 5.5, 6.0, 6.5, 7.0],
      radius: [16, 16, 16, 16, 16],
    },
    enhancements: {
      a: { id: 'a', nameKey: 'skill.vajraGuru.enhA.name', descKey: 'skill.vajraGuru.enhA.desc' },
      b: { id: 'b', nameKey: 'skill.vajraGuru.enhB.name', descKey: 'skill.vajraGuru.enhB.desc' },
    },
    unlock: {
      flag: 'skill.vajraGuru',
      altFlag: 'skill.guruMantra',
      hintKey: 'skill.vajraGuru.unlockHint',
    },
    cast(ctx, payload) {
      if (ctx.skillEffects?.castVajraGuru) {
        return ctx.skillEffects.castVajraGuru(payload);
      }
      if (ctx.skillEffects?.castGuruMantra) {
        return ctx.skillEffects.castGuruMantra(payload);
      }
      ctx.bus?.emit('skill:effect', { id: 'vajraGuru', ...payload });
      ctx.bus?.emit('sfx', { name: 'vajraGuru' });
      return true;
    },
  },
];

export const SKILL_BY_ID = {};
for (const s of SKILLS) {
  SKILL_BY_ID[s.id] = s;
  if (s.alias) {
    SKILL_BY_ID[s.alias] = s;
  }
}

export const SKILL_BY_SLOT = Object.fromEntries(SKILLS.map((s) => [s.slot, s]));

export function getSkillDef(slotOrId) {
  if (!slotOrId) return null;
  const aliased = SKILL_ALIASES[slotOrId] || slotOrId;
  return SKILL_BY_ID[aliased] || SKILL_BY_ID[slotOrId] || SKILL_BY_SLOT[slotOrId] || null;
}
