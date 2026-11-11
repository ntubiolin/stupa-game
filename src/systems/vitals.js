import { getDifficulty } from '../data/combatSettings.js';
import { deg, polar } from '../config.js';

/**
 * Vitals system — HP, MP, EXP, Level, ATK, DEF, buffs, and restoration / damage events.
 * Manages stats calculation, damage mitigation formula, faint sequence, and persistence.
 */

const STORAGE_KEY = 'stupa.vitals.v1';

export function createVitals(ctx) {
  const { state, config, bus } = ctx;
  const V = config.VITALS || {
    baseHp: 100,
    hpPerLevel: 10,
    baseMp: 60,
    mpPerLevel: 5,
    baseAtk: 10,
    atkPerLevel: 3,
    baseDef: 0,
    expBase: 20,
    expExponent: 1.5,
    maxLevel: 40,
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
      prostrationMp: 15,
      lampMp: 15,
      monkeyMp: 10,
      maniMp: 1,
      maniRadius: 4,
      maniInterval: 1.0,
    },
  };

  let invulnTimer = 0;
  let isFainting = false;
  let faintTimer = 0;
  let faintTeleported = false;

  // ---------------------------------------------------------------- Persistence
  function defaultVitalsData() {
    return {
      level: 1,
      exp: 0,
      hp: null,
      mp: null,
      permanent: { atk: 0, def: 0, maxHp: 0, maxMp: 0 },
    };
  }

  function loadSaved() {
    if (ctx.save) {
      return ctx.save.get('vitals', defaultVitalsData());
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return null;
      return data;
    } catch {
      return null;
    }
  }

  function save() {
    const p = state.player;
    const data = {
      level: p.level,
      exp: p.exp,
      hp: p.hp,
      mp: p.mp,
      permanent: {
        atk: p.permanent?.atk || 0,
        def: p.permanent?.def || 0,
        maxHp: p.permanent?.maxHp || 0,
        maxMp: p.permanent?.maxMp || 0,
      },
    };
    if (ctx.save) {
      ctx.save.set('vitals', data);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  // ---------------------------------------------------------------- EXP calculation
  function getMaxExp(level) {
    const base = V.expBase ?? 20;
    const exp = V.expExponent ?? 1.5;
    return Math.floor(base * Math.pow(Math.max(1, level), exp));
  }

  // ---------------------------------------------------------------- Stats Calculation
  function recalcDerived() {
    const p = state.player;
    const lvl = p.level || 1;
    const g = ctx.inventory?.getEquipStats?.() || {
      atk: 0,
      atkPct: 0,
      def: 0,
      maxHp: 0,
      maxMp: 0,
      mpRegen: 0,
      critChance: 0,
      critDamage: 0,
      moveSpeed: 0,
      cdr: 0,
      mantraRadius: 0,
      skillDamage: 0,
      magicRes: 0,
      hpOnLiberate: 0,
      expBonus: 0,
      findBonus: 0,
    };

    const perm = p.permanent || { atk: 0, def: 0, maxHp: 0, maxMp: 0 };

    p.maxHp = V.baseHp + V.hpPerLevel * (lvl - 1) + (g.maxHp || 0) + (perm.maxHp || 0);
    p.maxMp = V.baseMp + V.mpPerLevel * (lvl - 1) + (g.maxMp || 0) + (perm.maxMp || 0);

    const baseAtk = V.baseAtk + V.atkPerLevel * (lvl - 1);
    const baseDef = V.baseDef ?? 0;

    let atkMult = 1.0;
    let atkAdd = 0;
    let defMult = 1.0;
    let defAdd = 0;
    let shrineCdr = 0;
    let shrineInvuln = false;
    let shrineExpMult = 1.0;
    let shrineFreeMp = false;
    let shrineFindMult = 1.0;
    let buffSkillDamageAdd = 0;
    let buffMpRegenAdd = 0;
    let buffDmgTakenMult = 1.0;

    if (Array.isArray(p.buffs)) {
      for (let i = 0; i < p.buffs.length; i++) {
        const b = p.buffs[i];
        if (!b || !b.stats) continue;
        if (b.stats.atkMult != null) atkMult *= b.stats.atkMult;
        if (b.stats.atkAdd != null) atkAdd += b.stats.atkAdd;
        if (b.stats.atk != null) atkAdd += b.stats.atk;
        if (b.stats.defMult != null) defMult *= b.stats.defMult;
        if (b.stats.defAdd != null) defAdd += b.stats.defAdd;
        if (b.stats.def != null) defAdd += b.stats.def;
        if (b.stats.cdrAdd != null) shrineCdr += Number(b.stats.cdrAdd) || 0;
        if (b.stats.invuln === true) shrineInvuln = true;
        if (b.stats.expMult != null) shrineExpMult *= Number(b.stats.expMult) || 1;
        if (b.stats.freeMp === true) shrineFreeMp = true;
        if (b.stats.findMult != null) shrineFindMult *= Number(b.stats.findMult) || 1;
        if (b.stats.skillDamageAdd != null) buffSkillDamageAdd += Number(b.stats.skillDamageAdd) || 0;
        if (b.stats.mpRegenAdd != null) buffMpRegenAdd += Number(b.stats.mpRegenAdd) || 0;
        if (b.stats.dmgTakenMult != null) buffDmgTakenMult *= Number(b.stats.dmgTakenMult) || 1;
      }
    }

    p.shrineCdr = shrineCdr;
    p.shrineInvuln = shrineInvuln;
    p.shrineExpMult = shrineExpMult;
    p.shrineFreeMp = shrineFreeMp;
    p.shrineFindMult = shrineFindMult;
    p.dmgTakenMult = buffDmgTakenMult;

    p.atk = Math.round(
      ((baseAtk + (perm.atk || 0) + (g.atk || 0)) *
        (1 + (g.atkPct || 0) / 100)) *
        atkMult +
        atkAdd
    );
    p.def = Math.round(
      (baseDef + (perm.def || 0) + (g.def || 0)) * defMult + defAdd
    );

    const eqCritChance = Math.min(
      0.6,
      (V.baseCritChance ?? 0.05) + (g.critChance || 0) / 100
    );
    const eqCritDamage =
      (V.baseCritDamage ?? 1.5) + (g.critDamage || 0) / 100;
    p.critChance =
      p._critChanceOverride != null ? p._critChanceOverride : eqCritChance;
    p.critDamage =
      p._critDamageOverride != null ? p._critDamageOverride : eqCritDamage;

    p.moveSpeedMult = +(1 + Math.min(0.3, (g.moveSpeed || 0) / 100)).toFixed(4);
    p.cdr = +Math.min(0.4, (g.cdr || 0) / 100).toFixed(4);
    p.mpRegen = +((g.mpRegen || 0) + buffMpRegenAdd).toFixed(2);
    p.magicRes = +Math.min(0.6, (g.magicRes || 0) / 100).toFixed(4);
    p.hpOnLiberate = g.hpOnLiberate || 0;
    p.expBonus = g.expBonus || 0;
    p.findBonus = g.findBonus || 0;
    p.skillDamage = (g.skillDamage || 0) + buffSkillDamageAdd;
    p.mantraRadiusBonus = g.mantraRadius || 0;

    if (p.hp != null) p.hp = Math.min(p.hp, p.maxHp);
    if (p.mp != null) p.mp = Math.min(p.mp, p.maxMp);
  }

  function rollDamage(base, { mult = 1 } = {}) {
    const p = state.player;
    const baseVal = typeof base === 'number' ? base : (p.atk || 10);
    const critChance = p.critChance ?? 0.05;
    const critDamage = p.critDamage ?? 1.5;
    const crit = Math.random() < critChance;
    const raw = baseVal * mult * (crit ? critDamage : 1);
    const amount = Math.max(1, Math.round(raw));
    return { amount, crit };
  }

  // ---------------------------------------------------------------- Initial State
  const saved = loadSaved();
  const maxLvl = V.maxLevel || 40;

  state.player.level =
    typeof saved?.level === 'number' && saved.level >= 1
      ? Math.min(maxLvl, Math.floor(saved.level))
      : 1;
  state.player.exp =
    typeof saved?.exp === 'number' && saved.exp >= 0
      ? Math.floor(saved.exp)
      : 0;
  state.player.permanent = {
    atk: typeof saved?.permanent?.atk === 'number' ? saved.permanent.atk : 0,
    def: typeof saved?.permanent?.def === 'number' ? saved.permanent.def : 0,
    maxHp: typeof saved?.permanent?.maxHp === 'number' ? saved.permanent.maxHp : 0,
    maxMp: typeof saved?.permanent?.maxMp === 'number' ? saved.permanent.maxMp : 0,
  };
  state.player.buffs = [];
  state.player.invulnUntil = 0;
  state.player.slowUntil = 0;
  state.player.shield = 0;
  state.player.shieldMax = 0;
  state.player.shieldRemaining = 0;
  state.player.shieldAbsorbed = 0;
  state.player.shieldEnh = null;
  state.player.protectorDmgReduction = 0;
  state.vitals = state.vitals || {};
  state.vitals.god = false;

  recalcDerived();

  state.player.hp =
    typeof saved?.hp === 'number'
      ? Math.max(0, Math.min(state.player.maxHp, saved.hp))
      : state.player.maxHp;
  state.player.mp =
    typeof saved?.mp === 'number'
      ? Math.max(0, Math.min(state.player.maxMp, saved.mp))
      : state.player.maxMp;

  // ---------------------------------------------------------------- Snapshot & Emit
  let lastManiEmitTime = -999;

  function getStats() {
    const p = state.player;
    const isMax = (p.level || 1) >= maxLvl;
    return {
      hp: Math.round(p.hp ?? p.maxHp),
      maxHp: p.maxHp,
      shield: Math.max(0, Math.round(p.shield || 0)),
      shieldMax: Math.max(0, Math.round(p.shieldMax || 0)),
      mp: Math.round((p.mp ?? p.maxMp) * 10) / 10,
      maxMp: p.maxMp,
      exp: isMax ? 0 : p.exp,
      maxExp: isMax ? 0 : getMaxExp(p.level),
      level: p.level,
      isMaxLevel: isMax,
      atk: p.atk,
      def: p.def,
      critChance: p.critChance ?? 0.05,
      critDamage: p.critDamage ?? 1.5,
      moveSpeedMult: p.moveSpeedMult ?? 1,
      cdr: p.cdr ?? 0,
      mpRegen: p.mpRegen ?? 0,
      magicRes: p.magicRes ?? 0,
      hpOnLiberate: p.hpOnLiberate ?? 0,
      expBonus: p.expBonus ?? 0,
      findBonus: p.findBonus ?? 0,
      skillDamage: p.skillDamage ?? 0,
      mantraRadiusBonus: p.mantraRadiusBonus ?? 0,
      turquoise: ctx.inventory?.getTurquoise?.() ?? state.inventory?.turquoise ?? 0,
      shrineCdr: p.shrineCdr || 0,
      shrineInvuln: Boolean(p.shrineInvuln),
      shrineExpMult: p.shrineExpMult || 1,
      shrineFreeMp: Boolean(p.shrineFreeMp),
      shrineFindMult: p.shrineFindMult || 1,
      buffs: Array.isArray(p.buffs) ? [...p.buffs] : [],
      permanent: p.permanent ? { ...p.permanent } : { atk: 0, def: 0 },
    };
  }

  function emitChanged(extra = {}) {
    if (extra.source === 'mani') {
      const now =
        typeof performance !== 'undefined' && performance.now
          ? performance.now() / 1000
          : state.elapsed;
      if (now - lastManiEmitTime < 0.25) {
        return;
      }
      lastManiEmitTime = now;
    }

    const snap = getStats();
    bus.emit('vitals:changed', {
      ...snap,
      deltaHp: extra.deltaHp ?? 0,
      deltaMp: extra.deltaMp ?? 0,
      source: extra.source,
      ...extra,
    });
  }

  // ---------------------------------------------------------------- Core Operations
  function addExp(n) {
    if (typeof n !== 'number' || n <= 0) return;
    const p = state.player;
    if (p.level >= maxLvl) return;

    const expMult = (1 + (p.expBonus || 0) / 100) * (p.shrineExpMult || 1);
    const gained = Math.max(1, Math.round(n * expMult));
    p.exp = (p.exp || 0) + gained;

    let leveledUp = false;
    const prevLevel = p.level;
    const oldMaxHp = p.maxHp;
    const oldMaxMp = p.maxMp;
    const oldAtk = p.atk;

    while (p.level < maxLvl) {
      const needed = getMaxExp(p.level);
      if (p.exp >= needed) {
        p.exp -= needed;
        p.level += 1;
        leveledUp = true;
      } else {
        break;
      }
    }

    if (p.level >= maxLvl) {
      p.level = maxLvl;
      p.exp = 0;
    }

    if (leveledUp) {
      recalcDerived();
      p.hp = p.maxHp;
      p.mp = p.maxMp;

      const deltaMaxHp = p.maxHp - oldMaxHp;
      const deltaMaxMp = p.maxMp - oldMaxMp;
      const deltaAtk = p.atk - oldAtk;

      bus.emit('level:up', {
        level: p.level,
        prevLevel,
        maxHp: p.maxHp,
        maxMp: p.maxMp,
        atk: p.atk,
        deltaMaxHp,
        deltaMaxMp,
        deltaAtk,
      });

      bus.emit('toast', {
        key: 'toast.levelUp',
        params: { level: p.level },
      });
      bus.emit('sfx', { name: 'levelup' });
    }

    save();
    emitChanged({ deltaExp: n });
  }

  function spendMp(n) {
    const p = state.player;
    if (typeof n !== 'number' || n <= 0) return true;
    if (p.shrineFreeMp) return true;
    if (p.mp < n) return false;

    p.mp -= n;
    save();
    emitChanged({ deltaMp: -n });
    return true;
  }

  function addBuff(id, stats, duration) {
    const p = state.player;
    if (!Array.isArray(p.buffs)) p.buffs = [];

    const existing = p.buffs.find((b) => b.id === id);
    if (existing) {
      existing.remaining = duration;
      existing.duration = duration;
      existing.stats = stats;
    } else {
      p.buffs.push({
        id,
        remaining: duration,
        duration,
        stats,
      });
    }

    recalcDerived();
    emitChanged();
  }

  function removeBuff(id) {
    const buffs = state.player.buffs;
    const index = buffs?.findIndex((buff) => buff.id === id) ?? -1;
    if (index < 0) return false;
    buffs.splice(index, 1);
    recalcDerived();
    emitChanged();
    return true;
  }

  function addPermanent(statOrPatch, n) {
    const p = state.player;
    if (!p.permanent) p.permanent = { atk: 0, def: 0, maxHp: 0, maxMp: 0 };
    if (statOrPatch && typeof statOrPatch === 'object') {
      for (const [k, v] of Object.entries(statOrPatch)) {
        p.permanent[k] = (Number(p.permanent[k]) || 0) + (Number(v) || 0);
      }
    } else if (typeof statOrPatch === 'string') {
      const cap = statOrPatch === 'maxHp' || statOrPatch === 'maxMp' ? 500 : (config.ITEMS?.permanentCap ?? 60);
      const currentVal = p.permanent[statOrPatch] || 0;
      p.permanent[statOrPatch] = Math.min(cap, currentVal + (Number(n) || 0));
    }
    recalcDerived();
    save();
    emitChanged();
  }

  function set(patch = {}) {
    const p = state.player;

    if (patch.level != null && patch.level !== p.level) {
      p.level = Math.max(1, Math.min(maxLvl, Math.floor(patch.level)));
      recalcDerived();
    }
    if (patch.permanent != null) {
      if (!p.permanent) p.permanent = { atk: 0, def: 0 };
      Object.assign(p.permanent, patch.permanent);
      recalcDerived();
    }
    if (patch.atk != null) {
      p.atk = Number(patch.atk);
    }
    if (patch.def != null) {
      p.def = Number(patch.def);
    }
    if (patch.hp != null) {
      p.hp = Math.max(0, Math.min(p.maxHp, Number(patch.hp)));
    }
    if (patch.shield != null) {
      const sh = Math.max(0, Math.round(Number(patch.shield) || 0));
      p.shield = sh;
      p.shieldMax = Math.max(p.shieldMax || 0, sh);
    }
    if (patch.mp != null) {
      p.mp = Math.max(0, Math.min(p.maxMp, Number(patch.mp)));
    }
    if (patch.exp != null) {
      p.exp = Math.max(0, Math.floor(Number(patch.exp)));
    }
    if (patch.critChance != null) {
      p._critChanceOverride = Math.max(0, Math.min(1, Number(patch.critChance)));
      p.critChance = p._critChanceOverride;
    }
    if (patch.critDamage != null) {
      p._critDamageOverride = Math.max(1, Number(patch.critDamage));
      p.critDamage = p._critDamageOverride;
    }

    invulnTimer = 0;
    p.invulnUntil = 0;
    save();
    emitChanged();
  }

  function applyRestore(payload = {}) {
    const p = state.player;
    const oldHp = p.hp;
    const oldMp = p.mp;

    if (typeof payload.hp === 'number' && payload.hp > 0) {
      p.hp = Math.min(p.maxHp, p.hp + payload.hp);
    }
    if (typeof payload.mp === 'number' && payload.mp > 0) {
      p.mp = Math.min(p.maxMp, p.mp + payload.mp);
    }

    const deltaHp = p.hp - oldHp;
    const deltaMp = p.mp - oldMp;

    save();
    emitChanged({ deltaHp, deltaMp, source: payload.source });
  }

  function triggerFaint() {
    if (isFainting) return;
    isFainting = true;
    faintTimer = 0;
    faintTeleported = false;
    const p = state.player;
    p.hp = 0;
    p.action = 'faint';
    p.velocity.set(0, 0, 0);
    p.isMoving = false;
    bus.emit('sfx', { name: 'faint' });
    bus.emit('player:faint', {});
  }

  function addShield(amount, duration = 6.0, opts = {}) {
    const p = state.player;
    const sh = Math.max(1, Math.round(Number(amount) || 0));
    p.shield = sh;
    p.shieldMax = sh;
    p.shieldRemaining = Math.max(0.1, Number(duration) || 6.0);
    p.shieldAbsorbed = 0;
    p.shieldEnh = opts.enh || null;
    p.shieldSource = opts.source || 'lotusShield';
    emitChanged({ source: p.shieldSource });
    return sh;
  }

  function clearShield(reason = 'expired') {
    const p = state.player;
    if ((p.shield || 0) <= 0 && (p.shieldRemaining || 0) <= 0) return;
    const absorbed = p.shieldAbsorbed || 0;
    const enh = p.shieldEnh;
    const source = p.shieldSource;
    p.shield = 0;
    p.shieldMax = 0;
    p.shieldRemaining = 0;
    p.shieldEnh = null;
    bus.emit('shield:ended', { reason, absorbed, enh, source });
    if (reason === 'broken') {
      bus.emit('shield:broken', { absorbed, enh, source });
    }
    emitChanged({ source: 'shield' });
  }

  function applyDamage(amount, type = 'physical', extra = {}) {
    const p = state.player;
    if (isFainting) return 0;
    if (typeof amount !== 'number' || amount <= 0) return 0;
    if (p.hp <= 0) return 0;

    if ((invulnTimer > 0 || state.elapsed < (p.invulnUntil || 0)) && !extra.ignoreInvuln) {
      return 0;
    }

    if (state.vitals?.god || p.shrineInvuln) {
      invulnTimer = V.invulnDuration ?? 0.8;
      p.invulnUntil = state.elapsed + invulnTimer;
      bus.emit('player:hurt', { amount: 0, type, sourcePos: extra.sourcePos, knockback: extra.knockback });
      bus.emit('player:damaged', { amount: 0, type, sourcePos: extra.sourcePos, knockback: extra.knockback });
      return 0;
    }

    const defConst = V.defConstant ?? 50;
    const magicFactor = V.magicDefFactor ?? 0.5;
    const currentDef = Math.max(0, p.def ?? 0);

    let dmg = 0;
    if (type === 'magic') {
      const defMitigated = (amount * defConst) / (defConst + currentDef * magicFactor);
      const magicRes = Math.max(0, Math.min(0.6, p.magicRes || 0));
      dmg = Math.max(1, Math.round(defMitigated * (1 - magicRes)));
    } else {
      dmg = Math.max(1, Math.round((amount * defConst) / (defConst + currentDef)));
    }

    // Apply protector oath or buff damage reduction
    const protRed = Math.max(0, Math.min(0.5, Number(p.protectorDmgReduction) || 0));
    const buffMult = typeof p.dmgTakenMult === 'number' ? p.dmgTakenMult : 1.0;
    if (protRed > 0 || buffMult !== 1.0) {
      dmg = Math.max(1, Math.round(dmg * (1 - protRed) * buffMult));
    }

    // Difficulty scales mitigated incoming damage once, before shield absorption.
    dmg = Math.max(1, Math.round(dmg * getDifficulty(ctx).damageTaken));

    // Absorb from active shield first (#27 Lotus Shield / Tenma Oath)
    let shieldAbsorbedNow = 0;
    if ((p.shield || 0) > 0) {
      shieldAbsorbedNow = Math.min(p.shield, dmg);
      p.shield = Math.max(0, p.shield - shieldAbsorbedNow);
      p.shieldAbsorbed = (p.shieldAbsorbed || 0) + shieldAbsorbedNow;
      dmg -= shieldAbsorbedNow;
      if (p.shield <= 0) {
        clearShield('broken');
      }
    }

    p.hp = Math.max(0, p.hp - dmg);
    invulnTimer = V.invulnDuration ?? 0.8;
    p.invulnUntil = state.elapsed + invulnTimer;

    if (extra.slow && extra.slow > 0) {
      p.slowUntil = Math.max(p.slowUntil || 0, state.elapsed + extra.slow);
    }

    bus.emit('player:hurt', { amount: dmg, absorbed: shieldAbsorbedNow, type, sourcePos: extra.sourcePos, knockback: extra.knockback });
    bus.emit('player:damaged', { amount: dmg, absorbed: shieldAbsorbedNow, type, sourcePos: extra.sourcePos, knockback: extra.knockback });

    save();
    emitChanged({ deltaHp: -dmg, absorbed: shieldAbsorbedNow, type, source: extra.source });

    if (p.hp === 0) {
      triggerFaint();
    }

    return dmg;
  }

  // ---------------------------------------------------------------- Bus Listeners
  bus.on('vitals:restore', (payload) => {
    applyRestore(payload);
  });

  bus.on('vitals:damage', (payload) => {
    if (!payload) return;
    applyDamage(payload.amount, payload.type, payload);
  });

  bus.on('equipment:changed', () => {
    recalcDerived();
    save();
    emitChanged({ source: 'equipment' });
  });

  bus.on('enemy:liberated', () => {
    const heal = state.player?.hpOnLiberate || 0;
    if (heal > 0 && !isFainting && state.player.hp > 0) {
      applyRestore({ hp: heal, source: 'hpOnLiberate' });
    }
  });

  bus.on('merit:reset', () => {
    const p = state.player;
    p.level = 1;
    p.exp = 0;
    p.permanent = { atk: 0, def: 0 };
    p._critChanceOverride = null;
    p._critDamageOverride = null;
    p.buffs = [];
    p.shield = 0;
    p.shieldMax = 0;
    p.shieldRemaining = 0;
    p.shieldAbsorbed = 0;
    p.shieldEnh = null;
    p.protectorDmgReduction = 0;
    invulnTimer = 0;
    p.invulnUntil = 0;
    p.slowUntil = 0;
    isFainting = false;
    faintTimer = 0;
    faintTeleported = false;

    recalcDerived();
    p.hp = p.maxHp;
    p.mp = p.maxMp;

    save();
    emitChanged();
  });

  // ---------------------------------------------------------------- API & exports
  let buffEmitTimer = 0;
  let mpRegenTimer = 0;

  const api = {
    update(dt) {
      const p = state.player;

      // Shield expiration timer
      if ((p.shieldRemaining || 0) > 0) {
        p.shieldRemaining -= dt;
        if (p.shieldRemaining <= 0) {
          clearShield('expired');
        }
      }

      // Passive MP regeneration from equipment (active in both hub and combat zones)
      if (!isFainting && (p.mpRegen || 0) > 0 && p.mp < p.maxMp) {
        mpRegenTimer += dt;
        if (mpRegenTimer >= 1.0) {
          const ticks = Math.floor(mpRegenTimer);
          mpRegenTimer -= ticks;
          const gain = +(p.mpRegen * ticks).toFixed(1);
          const oldMp = p.mp;
          p.mp = Math.min(p.maxMp, +(p.mp + gain).toFixed(1));
          if (p.mp > oldMp) {
            save();
            emitChanged({ deltaMp: +(p.mp - oldMp).toFixed(1), source: 'mpRegen' });
          }
        }
      } else {
        mpRegenTimer = 0;
      }

      // Faint sequence handling
      if (isFainting) {
        faintTimer += dt;
        const teleportTime = V.faintTeleportTime ?? 1.2;
        const faintDur = V.faintDuration ?? 1.8;

        if (!faintTeleported && faintTimer >= teleportTime) {
          faintTeleported = true;
          if (state.zone === 'terma' && ctx.dungeon?.onPlayerFaint) {
            ctx.dungeon.onPlayerFaint();
          } else if (ctx.zones?.teleport) {
            ctx.zones.teleport('stupa', { spawn: 'south', skipFade: true });
          } else {
            const startAng = deg(config.PLAYER?.startAngleDeg ?? 90);
            const startRad = config.PLAYER?.startRadius ?? 30;
            const pt = polar(startAng, startRad);
            state.player.position.set(pt.x, 0, pt.z);
            state.player.heading = 0;
            state.player.velocity.set(0, 0, 0);
            state.player.isMoving = false;
            state.zone = 'stupa';
            state.zoneType = 'hub';
          }

          p.hp = Math.round(p.maxHp * (V.faintHpRatio ?? 0.5));
          p.exp = Math.floor(p.exp * (1 - (V.faintExpLossRatio ?? 0.1)));
          p.buffs = [];
          p.slowUntil = 0;
          recalcDerived();

          invulnTimer = V.faintInvulnDuration ?? 3.0;
          p.invulnUntil = state.elapsed + invulnTimer;
          save();
          emitChanged({ source: 'faint' });
        }

        // Keep invulnerability active through the remaining faint sequence
        if (faintTeleported && faintTimer < faintDur) {
          invulnTimer = V.faintInvulnDuration ?? 3.0;
          p.invulnUntil = state.elapsed + (V.faintInvulnDuration ?? 3.0);
        }

        if (faintTimer >= faintDur) {
          isFainting = false;
          faintTimer = 0;
          faintTeleported = false;
          p.action = 'idle';
          invulnTimer = V.faintInvulnDuration ?? 3.0;
          p.invulnUntil = state.elapsed + (V.faintInvulnDuration ?? 3.0);
          bus.emit('player:wake', {});
        }
      } else {
        if (invulnTimer > 0) {
          invulnTimer = Math.max(0, invulnTimer - dt);
        }
      }

      // Buffs decay
      if (!Array.isArray(p.buffs) || p.buffs.length === 0) {
        buffEmitTimer = 0;
        return;
      }

      let expired = false;
      for (let i = p.buffs.length - 1; i >= 0; i--) {
        const b = p.buffs[i];
        b.remaining -= dt;
        if (b.remaining <= 0) {
          p.buffs.splice(i, 1);
          expired = true;
        }
      }

      buffEmitTimer += dt;
      if (expired) {
        buffEmitTimer = 0;
        recalcDerived();
        emitChanged();
      } else if (buffEmitTimer >= 1.0) {
        buffEmitTimer = 0;
        emitChanged();
      }
    },
    addExp,
    spendMp,
    addBuff,
    removeBuff,
    addShield,
    clearShield,
    addPermanent,
    getStats,
    stats: getStats,
    recalcDerived,
    set,
    rollDamage,
    faint() {
      if (isFainting) return;
      triggerFaint();
    },
    isFainting() {
      return isFainting;
    },
    god(bool) {
      if (!state.vitals) state.vitals = {};
      state.vitals.god = Boolean(bool);
      return state.vitals.god;
    },
    damage(amount, type = 'physical', extra = {}) {
      return applyDamage(amount, type, extra);
    },
    damagePlayer(amount, type = 'physical', extra = {}) {
      return applyDamage(amount, type, extra);
    },
  };

  ctx.vitals = api;

  ctx.debug?.register('vitals', {
    set: (patch) => api.set(patch),
    damage: (amount, type = 'physical', extra = {}) =>
      api.damage(amount, type, extra),
    damagePlayer: (amount, type = 'physical', extra = {}) =>
      api.damage(amount, type, extra),
    addShield: (amount, duration, opts) => api.addShield(amount, duration, opts),
    clearShield: (reason) => api.clearShield(reason),
    god: (bool) => api.god(bool),
    get: () => api.getStats(),
    stats: () => api.getStats(),
    addExp: (n) => api.addExp(n),
    faint: () => api.faint(),
    rollDamage: (base, opts) => api.rollDamage(base, opts),
  });

  return api;
}
