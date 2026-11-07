/**
 * Skills Runtime System (#26 & #27) — manages the 7 skill slots, cooldowns with CDR,
 * Ultimate Charge (0..30 for Vajra Guru Mantra), Dharma Protector unlock integration,
 * skill points (earned on level up + legacy save reconciliation), rank upgrades (1..5),
 * Rank 3 A/B mastery enhancements, hub-only respec, and persistence.
 */
import { SKILLS, getSkillDef } from '../data/skills.js';
import { createAllies } from '../gameplay/allies.js';
import { createActiveSkills } from '../gameplay/skills/activeSkills.js';
import { createPowers } from './powers.js';
import { i18n } from '../i18n.js';

export function createSkills(ctx) {
  const { state, bus } = ctx;

  // Ensure #27 subsystems (protectors/allies, activeSkills, powers) are wired on ctx
  // even when src/main.js is untouched in an isolated worktree.
  if (!ctx.protectors) {
    createAllies(ctx);
  }
  if (!ctx.powers || !ctx.powers.definitions) {
    createPowers(ctx);
  }
  if (!ctx.activeSkills) {
    createActiveSkills(ctx);
  }

  let noCooldownFlag = false;
  let points = 0;
  let spentPoints = 0;
  let bonusPoints = 0;
  let reconciledLevel = 1;
  let ultCharge = 0;
  const ULT_MAX_CHARGE = 30;

  let lastSubUpdateElapsed = -1;

  // Per-skill state keyed by canonical skill id
  const skillStates = {};

  function defaultSkillState(def) {
    return {
      unlocked: !def.unlock?.flag,
      rank: 1,
      enh: null,
      cooldownRemaining: 0,
      lastMaxCd: def.cooldown || 1,
    };
  }

  function initDefaults() {
    for (const def of SKILLS) {
      skillStates[def.id] = defaultSkillState(def);
    }
    points = 0;
    spentPoints = 0;
    bonusPoints = 0;
    reconciledLevel = 1;
    ultCharge = 0;
  }

  initDefaults();

  function loadFromSave() {
    const saved = ctx.save?.get?.('skills', null);
    if (saved && typeof saved === 'object') {
      if (typeof saved.points === 'number') points = Math.max(0, Math.floor(saved.points));
      if (typeof saved.spentPoints === 'number') spentPoints = Math.max(0, Math.floor(saved.spentPoints));
      if (typeof saved.bonusPoints === 'number') bonusPoints = Math.max(0, Math.floor(saved.bonusPoints));
      if (typeof saved.ultCharge === 'number') {
        ultCharge = Math.max(0, Math.min(ULT_MAX_CHARGE, Math.floor(saved.ultCharge)));
      }
      if (typeof saved.reconciledLevel === 'number') {
        reconciledLevel = Math.max(1, Math.floor(saved.reconciledLevel));
      }
      if (saved.skills && typeof saved.skills === 'object') {
        for (const def of SKILLS) {
          const s =
            saved.skills[def.id] ||
            (def.alias ? saved.skills[def.alias] : null);
          if (s && typeof s === 'object') {
            const st = skillStates[def.id];
            st.unlocked = Boolean(s.unlocked || !def.unlock?.flag);
            st.rank = Math.max(1, Math.min(def.maxRank || 5, Math.floor(Number(s.rank) || 1)));
            st.enh = st.rank >= 3 && (s.enh === 'a' || s.enh === 'b') ? s.enh : null;
          }
        }
      }
    }
    reconcileLevelPoints(false);
  }

  function persist() {
    if (!ctx.save?.set) return;
    const serializedSkills = {};
    for (const def of SKILLS) {
      const st = skillStates[def.id];
      serializedSkills[def.id] = {
        unlocked: st.unlocked,
        rank: st.rank,
        enh: st.enh,
      };
    }
    ctx.save.set('skills', {
      points,
      spentPoints,
      bonusPoints,
      reconciledLevel,
      ultCharge,
      skills: serializedSkills,
    });
  }

  function reconcileLevelPoints(shouldPersist = true) {
    const curLevel = Math.max(1, Math.floor(Number(state.player?.level) || 1));
    if (curLevel > reconciledLevel) {
      const gained = curLevel - reconciledLevel;
      points += gained;
      reconciledLevel = curLevel;
      if (shouldPersist) persist();
      bus?.emit('skill:points', { points });
    } else if (curLevel < reconciledLevel) {
      reconciledLevel = curLevel;
    }
  }

  function isUnlocked(slotOrId) {
    const def = getSkillDef(slotOrId);
    if (!def) return false;
    const st = skillStates[def.id];
    if (st?.unlocked) return true;
    if (!def.unlock?.flag) {
      st.unlocked = true;
      return true;
    }
    // Protector skill is unlocked when player has any unlocked protector or flag
    if (def.id === 'protector' && ctx.protectors?.hasAny?.()) {
      st.unlocked = true;
      return true;
    }
    const flagVal =
      ctx.flags?.get?.(def.unlock.flag) ||
      state.flags?.[def.unlock.flag] ||
      (def.unlock.altFlag &&
        (ctx.flags?.get?.(def.unlock.altFlag) || state.flags?.[def.unlock.altFlag]));
    if (flagVal) {
      st.unlocked = true;
      return true;
    }
    return false;
  }

  function getRequiredUltCharge(def) {
    const baseMax = def?.maxCharge || ULT_MAX_CHARGE;
    if (ctx.powers?.has?.('uddiyanaLotusHat')) {
      return Math.max(10, baseMax - 5);
    }
    return baseMax;
  }

  function getEffectiveCooldown(slotOrId) {
    const def = getSkillDef(slotOrId);
    if (!def) return 0;
    const baseCd = Number(def.cooldown) || 0;
    if (baseCd <= 0) return 0;
    const rawCdr = Number(state.player?.cdr || 0);
    const hatBonus = ctx.powers?.has?.('uddiyanaLotusHat') ? 0.10 : 0;
    const cdrFrac = Math.min(0.45, Math.max(0, (rawCdr > 1 ? rawCdr / 100 : rawCdr) + hatBonus));
    const rawShrine = Number(state.player?.shrineCdr || 0);
    const shrineFrac = Math.max(0, rawShrine > 1 ? rawShrine / 100 : rawShrine);
    const mult = Math.max(0.2, 1 - cdrFrac - shrineFrac);
    return Number((baseCd * mult).toFixed(4));
  }

  function getCooldownFraction(slotOrId) {
    const def = getSkillDef(slotOrId);
    if (!def) return 0;
    if (def.maxCharge) {
      if (noCooldownFlag) return 0;
      const req = getRequiredUltCharge(def);
      return Math.max(0, Math.min(1, 1 - ultCharge / req));
    }
    if (noCooldownFlag) return 0;
    const st = skillStates[def.id];
    if (!st || st.cooldownRemaining <= 0) return 0;
    const denom = st.lastMaxCd || getEffectiveCooldown(def.id) || 1;
    return Math.max(0, Math.min(1, st.cooldownRemaining / denom));
  }

  // ---------------------------------------------------------------- Ultimate Charge (0..30)
  function addUltCharge(delta = 1) {
    const add = Math.max(0, Number(delta) || 0);
    if (add <= 0) return ultCharge;
    const prev = ultCharge;
    const reqMax = getRequiredUltCharge(getSkillDef('vajraGuru'));
    ultCharge = Math.min(ULT_MAX_CHARGE, ultCharge + add);
    if (ultCharge !== prev) {
      persist();
      bus?.emit('skill:ultCharge', {
        charge: ultCharge,
        maxCharge: reqMax,
        ready: ultCharge >= reqMax,
      });
    }
    return ultCharge;
  }

  function fillUlt() {
    ultCharge = ULT_MAX_CHARGE;
    if (skillStates.vajraGuru) {
      skillStates.vajraGuru.cooldownRemaining = 0;
    }
    persist();
    bus?.emit('skill:ultCharge', {
      charge: ultCharge,
      maxCharge: ULT_MAX_CHARGE,
      ready: true,
    });
    return ultCharge;
  }

  function getUltCharge() {
    return ultCharge;
  }

  function resetCooldown(slotOrId) {
    if (!slotOrId) {
      for (const def of SKILLS) {
        if (skillStates[def.id]) skillStates[def.id].cooldownRemaining = 0;
      }
      fillUlt();
      return true;
    }
    const def = getSkillDef(slotOrId);
    if (!def) return false;
    const st = skillStates[def.id];
    if (st) {
      st.cooldownRemaining = 0;
    }
    if (def.maxCharge) {
      fillUlt();
    }
    return true;
  }

  function reduceCooldown(slotOrId, fraction = 0.5) {
    const def = getSkillDef(slotOrId);
    if (!def) return 0;
    const st = skillStates[def.id];
    if (!st || st.cooldownRemaining <= 0) return 0;
    const frac = Math.max(0, Math.min(1, Number(fraction) || 0));
    st.cooldownRemaining = Number((st.cooldownRemaining * (1 - frac)).toFixed(4));
    return st.cooldownRemaining;
  }

  function canCast(slotOrId) {
    const def = getSkillDef(slotOrId);
    if (!def) return false;
    if (state.mode !== 'play' || state.uiOpen) return false;
    const action = state.player?.action;
    if (action === 'faint' || action === 'prostrate') return false;
    if (!isUnlocked(def.id)) return false;
    const st = skillStates[def.id];
    if (def.maxCharge) {
      if (!noCooldownFlag && ultCharge < getRequiredUltCharge(def)) return false;
    } else if (!noCooldownFlag && st.cooldownRemaining > 0) {
      return false;
    }
    const isCombat = Boolean(ctx.world?.isCombatZone ? ctx.world.isCombatZone() : state.zone !== 'stupa');
    if (def.id === 'mantra' && !isCombat) return true;
    const freeMp = Boolean(state.player?.shrineFreeMp);
    if (!freeMp && def.mpCost > 0 && (state.player?.mp ?? 0) < def.mpCost) return false;
    return true;
  }

  function cast(slotOrId) {
    const def = getSkillDef(slotOrId);
    if (!def) return false;
    if (state.mode !== 'play' || state.uiOpen) return false;
    const action = state.player?.action;
    if (action === 'faint' || action === 'prostrate' || action === 'hurt') return false;

    if (!isUnlocked(def.id)) {
      bus?.emit('toast', { key: 'toast.skillLocked', kind: 'warning' });
      return false;
    }

    const st = skillStates[def.id];

    // Check Ultimate Charge requirement for vajraGuru
    if (def.maxCharge) {
      if (!noCooldownFlag && ultCharge < getRequiredUltCharge(def)) {
        bus?.emit('toast', { key: 'toast.ultNotReady', kind: 'warning' });
        return false;
      }
    } else if (!noCooldownFlag && st.cooldownRemaining > 0) {
      return false;
    }

    const isCombat = Boolean(ctx.world?.isCombatZone ? ctx.world.isCombatZone() : state.zone !== 'stupa');

    // Hub peaceful chant for Six-Syllable Mantra
    if (def.id === 'mantra' && !isCombat) {
      const hubCd = def.stupaCooldown ?? 0.45;
      st.lastMaxCd = hubCd;
      st.cooldownRemaining = noCooldownFlag ? 0 : hubCd;
      const origin = state.player.position.clone();
      const dir = state.player?.heading || 0;
      def.cast(ctx, {
        rank: st.rank,
        enh: st.enh,
        origin,
        dir,
        target: null,
        peaceful: true,
      });
      bus?.emit('skill:cast', {
        id: def.id,
        slot: def.slot,
        origin,
        dir,
        target: null,
        rank: st.rank,
        enh: st.enh,
        peaceful: true,
      });
      return true;
    }

    // Spend MP if needed (respecting shrineFreeMp / Guru Blessing)
    const freeMp = Boolean(state.player?.shrineFreeMp);
    if (def.mpCost > 0 && !freeMp) {
      const hasMp = (state.player?.mp ?? 0) >= def.mpCost;
      const spent = hasMp && (ctx.vitals ? ctx.vitals.spendMp(def.mpCost) : true);
      if (!spent) {
        bus?.emit('toast', { key: 'toast.noMp', kind: 'warning' });
        if (def.id === 'mantra') bus?.emit('mantra:nomp');
        return false;
      }
    }

    const acquired = ctx.targeting?.acquire
      ? ctx.targeting.acquire({ range: 14, halfAngle: Math.PI * 0.45 })
      : { target: null, dir: state.player?.heading || 0, targetPos: null };

    const origin = state.player.position.clone();
    const dir = typeof acquired?.dir === 'number' ? acquired.dir : (state.player?.heading || 0);
    const target = acquired?.target || null;

    if (def.maxCharge) {
      if (!noCooldownFlag) {
        ultCharge = 0;
        persist();
      }
      bus?.emit('skill:ultCharge', {
        charge: ultCharge,
        maxCharge: ULT_MAX_CHARGE,
        ready: ultCharge >= ULT_MAX_CHARGE,
      });
    } else {
      const effCd = getEffectiveCooldown(def.id);
      st.lastMaxCd = Math.max(0.05, effCd);
      st.cooldownRemaining = noCooldownFlag ? 0 : effCd;
    }

    const idx = Math.max(0, Math.min((def.maxRank || 5) - 1, st.rank - 1));
    def.cast(ctx, {
      rank: st.rank,
      enh: st.enh,
      origin,
      dir,
      target,
      peaceful: false,
      damageMult: def.rankScaling?.damageMult?.[idx] ?? 1.0,
      radiusAdd: def.rankScaling?.radiusAdd?.[idx] ?? 0,
      stunDuration: def.rankScaling?.stunDuration?.[idx] ?? undefined,
      shieldPct: def.rankScaling?.shieldPct?.[idx] ?? undefined,
      duration: def.rankScaling?.duration?.[idx] ?? undefined,
    });

    bus?.emit('skill:cast', {
      id: def.id,
      alias: def.alias || null,
      slot: def.slot,
      origin,
      dir,
      target,
      rank: st.rank,
      enh: st.enh,
      peaceful: false,
    });

    return true;
  }

  function unlock(slotOrId) {
    const def = getSkillDef(slotOrId);
    if (!def) return false;
    const st = skillStates[def.id];
    const wasUnlocked = st.unlocked;
    st.unlocked = true;
    if (def.unlock?.flag && state.flags) {
      state.flags[def.unlock.flag] = true;
    }
    if (def.unlock?.altFlag && state.flags) {
      state.flags[def.unlock.altFlag] = true;
    }
    if (def.id === 'protector' && ctx.protectors && !ctx.protectors.hasAny()) {
      ctx.protectors.unlock('tenma');
    }
    persist();
    if (!wasUnlocked) {
      bus?.emit('skill:unlock', { id: def.id, slot: def.slot });
    }
    return true;
  }

  function unlockAll() {
    for (const def of SKILLS) {
      const st = skillStates[def.id];
      st.unlocked = true;
      if (def.unlock?.flag && state.flags) {
        state.flags[def.unlock.flag] = true;
      }
      if (def.unlock?.altFlag && state.flags) {
        state.flags[def.unlock.altFlag] = true;
      }
      bus?.emit('skill:unlock', { id: def.id, slot: def.slot });
    }
    if (ctx.protectors?.unlockAll) {
      ctx.protectors.unlockAll();
    }
    persist();
    return true;
  }

  function spendPoint(slotOrId) {
    reconcileLevelPoints(false);
    const def = getSkillDef(slotOrId);
    if (!def) return false;
    if (!isUnlocked(def.id)) return false;
    const st = skillStates[def.id];
    if (points <= 0 || st.rank >= (def.maxRank || 5)) return false;

    points -= 1;
    spentPoints += 1;
    st.rank += 1;
    persist();

    bus?.emit('skill:rank', {
      id: def.id,
      slot: def.slot,
      rank: st.rank,
      enh: st.enh,
      points,
    });
    bus?.emit('skill:points', { points });
    return true;
  }

  function chooseEnhancement(slotOrId, enhId) {
    const def = getSkillDef(slotOrId);
    if (!def) return false;
    if (enhId !== 'a' && enhId !== 'b') return false;
    if (!isUnlocked(def.id)) return false;
    const st = skillStates[def.id];
    if (st.rank < 3) return false;

    st.enh = enhId;
    persist();

    bus?.emit('skill:rank', {
      id: def.id,
      slot: def.slot,
      rank: st.rank,
      enh: st.enh,
      points,
    });
    return true;
  }

  function setRank(slotOrId, rank, enh = undefined) {
    const def = getSkillDef(slotOrId);
    if (!def) return false;
    const st = skillStates[def.id];
    st.unlocked = true;
    if (def.id === 'protector' && ctx.protectors && !ctx.protectors.hasAny()) {
      ctx.protectors.unlock('tenma');
    }
    const clamped = Math.max(1, Math.min(def.maxRank || 5, Math.floor(Number(rank) || 1)));
    st.rank = clamped;
    if (clamped < 3) {
      st.enh = null;
    } else if (enh === 'a' || enh === 'b' || enh === null) {
      st.enh = enh;
    }
    persist();

    bus?.emit('skill:rank', {
      id: def.id,
      slot: def.slot,
      rank: st.rank,
      enh: st.enh,
      points,
    });
    return true;
  }

  function addPoints(n = 1) {
    const add = Math.floor(Number(n) || 0);
    if (add === 0) return points;
    points = Math.max(0, points + add);
    if (add > 0) bonusPoints += add;
    persist();
    bus?.emit('skill:points', { points });
    return points;
  }

  function noCooldown(bool = true) {
    noCooldownFlag = Boolean(bool);
    if (noCooldownFlag) {
      for (const def of SKILLS) {
        skillStates[def.id].cooldownRemaining = 0;
      }
      ultCharge = ULT_MAX_CHARGE;
    }
    return noCooldownFlag;
  }

  function respec() {
    const inHub = (state.zone || 'stupa') === 'stupa' || state.zoneType === 'hub';
    if (!inHub) {
      bus?.emit('toast', { key: 'toast.respecHubOnly', kind: 'warning' });
      return false;
    }
    for (const def of SKILLS) {
      const st = skillStates[def.id];
      st.rank = 1;
      st.enh = null;
    }
    const curLevel = Math.max(1, Math.floor(Number(state.player?.level) || 1));
    reconciledLevel = curLevel;
    spentPoints = 0;
    points = Math.max(0, (curLevel - 1) + bonusPoints);
    persist();

    bus?.emit('toast', { key: 'toast.respecDone', kind: 'info' });
    bus?.emit('skill:respec', { points });
    bus?.emit('skill:rank', { id: 'all', points });
    bus?.emit('skill:points', { points });
    return true;
  }

  function getSkillState(slotOrId) {
    const def = getSkillDef(slotOrId);
    if (!def) return null;
    const st = skillStates[def.id];
    const unlocked = isUnlocked(def.id);
    const idx = Math.max(0, Math.min((def.maxRank || 5) - 1, st.rank - 1));
    const isUlt = Boolean(def.maxCharge);
    const maxCharge = def.maxCharge || 0;
    const curCharge = isUlt ? (noCooldownFlag ? maxCharge : ultCharge) : 0;

    return {
      id: def.id,
      alias: def.alias || null,
      slot: def.slot,
      keyLabel: def.keyLabel,
      glyph: def.glyph,
      name: i18n.t(def.nameKey),
      nameKey: def.nameKey,
      descKey: def.descKey,
      mpCost: def.mpCost,
      cooldown: def.cooldown,
      effectiveCooldown: getEffectiveCooldown(def.id),
      cooldownRemaining: noCooldownFlag ? 0 : st.cooldownRemaining,
      cooldownFraction: getCooldownFraction(def.id),
      isUltimate: isUlt,
      charge: curCharge,
      ultCharge: curCharge,
      maxCharge,
      chargeFraction: isUlt && maxCharge > 0 ? Math.min(1, curCharge / maxCharge) : 0,
      unlocked,
      rank: st.rank,
      maxRank: def.maxRank || 5,
      enh: st.enh,
      damageMult: def.rankScaling?.damageMult?.[idx] ?? 1.0,
      radiusAdd: def.rankScaling?.radiusAdd?.[idx] ?? 0,
      stunDuration: def.rankScaling?.stunDuration?.[idx] ?? null,
      shieldPct: def.rankScaling?.shieldPct?.[idx] ?? null,
      duration: def.rankScaling?.duration?.[idx] ?? null,
      def,
    };
  }

  function list() {
    reconcileLevelPoints(false);
    return SKILLS.map((def) => getSkillState(def.id));
  }

  function getPoints() {
    reconcileLevelPoints(false);
    return points;
  }

  function update(dt) {
    reconcileLevelPoints(false);

    // Tick #27 subsystems once per frame
    const curElapsed = state.elapsed ?? 0;
    if (curElapsed !== lastSubUpdateElapsed) {
      lastSubUpdateElapsed = curElapsed;
      ctx.protectors?.update?.(dt);
      ctx.powers?.update?.(dt);
      ctx.activeSkills?.update?.(dt);
    }

    for (const def of SKILLS) {
      const st = skillStates[def.id];
      if (st.cooldownRemaining > 0) {
        st.cooldownRemaining = Math.max(0, st.cooldownRemaining - dt);
      }
    }

    if (state.mode !== 'play' || state.uiOpen) return;
    const input = ctx.input;
    if (!input) return;

    if (input.pressed('basic')) cast('basic');
    if (input.pressed('chant')) cast('chant');
    if (input.pressed('skill1')) cast('skill1');
    if (input.pressed('skill2')) cast('skill2');
    if (input.pressed('skill3')) cast('skill3');
    if (input.pressed('skill4')) cast('skill4');
    if (input.pressed('ultimate')) cast('ultimate');
  }

  // Ultimate charge listeners:
  // - Normal enemy liberated: +1 charge
  // - Elite (champion / rare) liberated: +5 charge
  // - Boss phase transition (boss:phase): +10 charge
  bus?.on('enemy:liberated', (payload) => {
    const rank = payload?.rank || 'normal';
    if (rank === 'champion' || rank === 'rare') {
      addUltCharge(5);
    } else if (rank === 'boss') {
      addUltCharge(10);
    } else {
      addUltCharge(1);
    }
  });

  bus?.on('boss:phase', () => {
    addUltCharge(10);
  });

  // Listen to level up, vitals changes, and reset events
  bus?.on('level:up', ({ level, prevLevel } = {}) => {
    const curLvl = Math.max(1, Math.floor(Number(level ?? state.player?.level) || 1));
    if (curLvl > reconciledLevel) {
      points += curLvl - reconciledLevel;
      reconciledLevel = curLvl;
    } else if (typeof level === 'number' && typeof prevLevel === 'number' && level > prevLevel) {
      points += level - prevLevel;
      reconciledLevel = Math.max(reconciledLevel, level);
    }
    persist();
    bus?.emit('skill:points', { points });
  });

  bus?.on('vitals:changed', () => {
    reconcileLevelPoints(true);
  });

  bus?.on('game:start', () => {
    reconcileLevelPoints(true);
  });

  bus?.on('merit:reset', () => {
    initDefaults();
    reconcileLevelPoints(true);
    persist();
    bus?.emit('skill:points', { points });
    bus?.emit('skill:rank', { id: 'all', points });
  });

  loadFromSave();

  const api = {
    update,
    cast,
    canCast,
    getCooldownFraction,
    getEffectiveCooldown,
    resetCooldown,
    reduceCooldown,
    addUltCharge,
    fillUlt,
    getUltCharge,
    unlock,
    unlockAll,
    spendPoint,
    upgrade: spendPoint,
    chooseEnhancement,
    chooseEnh: chooseEnhancement,
    setRank,
    addPoints,
    noCooldown,
    respec,
    list,
    getPoints,
    getSkillState,
    isUnlocked,
  };

  ctx.skills = api;

  ctx.debug?.register('skills', {
    list: () => api.list(),
    unlock: (id) => api.unlock(id),
    unlockAll: () => api.unlockAll(),
    addPoints: (n = 1) => api.addPoints(n),
    setRank: (id, rank, enh) => api.setRank(id, rank, enh),
    spendPoint: (id) => api.spendPoint(id),
    upgrade: (id) => api.spendPoint(id),
    chooseEnhancement: (id, enh) => api.chooseEnhancement(id, enh),
    chooseEnh: (id, enh) => api.chooseEnhancement(id, enh),
    noCooldown: (bool = true) => api.noCooldown(bool),
    fillUlt: () => api.fillUlt(),
    addUltCharge: (n = 1) => api.addUltCharge(n),
    getUltCharge: () => api.getUltCharge(),
    resetCooldown: (slotOrId) => api.resetCooldown(slotOrId),
    reduceCooldown: (slotOrId, frac) => api.reduceCooldown(slotOrId, frac),
    respec: () => api.respec(),
    cast: (slotOrId) => api.cast(slotOrId),
    getEffectiveCooldown: (slotOrId) => api.getEffectiveCooldown(slotOrId),
    getPoints: () => api.getPoints(),
    getSkillState: (slotOrId) => api.getSkillState(slotOrId),
  });

  return api;
}
