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
      maniInterval: 1.0,
    },
  };

  let invulnTimer = 0;
  let isFainting = false;
  let faintTimer = 0;
  let faintTeleported = false;

  // ---------------------------------------------------------------- Persistence
  function loadSaved() {
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
    try {
      const p = state.player;
      const data = {
        level: p.level,
        exp: p.exp,
        hp: p.hp,
        mp: p.mp,
        permanent: {
          atk: p.permanent?.atk || 0,
          def: p.permanent?.def || 0,
        },
      };
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

    p.maxHp = V.baseHp + V.hpPerLevel * (lvl - 1);
    p.maxMp = V.baseMp + V.mpPerLevel * (lvl - 1);

    const baseAtk = V.baseAtk + V.atkPerLevel * (lvl - 1);
    const baseDef = V.baseDef ?? 0;
    const perm = p.permanent || { atk: 0, def: 0 };

    let atkMult = 1.0;
    let atkAdd = 0;
    let defMult = 1.0;
    let defAdd = 0;

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
      }
    }

    p.atk = Math.round((baseAtk + (perm.atk || 0)) * atkMult + atkAdd);
    p.def = Math.round((baseDef + (perm.def || 0)) * defMult + defAdd);

    if (p.hp != null) p.hp = Math.min(p.hp, p.maxHp);
    if (p.mp != null) p.mp = Math.min(p.mp, p.maxMp);
  }

  // ---------------------------------------------------------------- Initial State
  const saved = loadSaved();
  const maxLvl = V.maxLevel || 30;

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
  };
  state.player.buffs = [];
  state.player.invulnUntil = 0;
  state.player.slowUntil = 0;
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
      hp: p.hp,
      maxHp: p.maxHp,
      mp: p.mp,
      maxMp: p.maxMp,
      exp: isMax ? 0 : p.exp,
      maxExp: isMax ? 0 : getMaxExp(p.level),
      level: p.level,
      isMaxLevel: isMax,
      atk: p.atk,
      def: p.def,
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

    p.exp = (p.exp || 0) + Math.floor(n);

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

  function addPermanent(stat, n) {
    const p = state.player;
    if (!p.permanent) p.permanent = { atk: 0, def: 0 };
    const cap = config.ITEMS?.permanentCap ?? 20;
    const currentVal = p.permanent[stat] || 0;
    p.permanent[stat] = Math.min(cap, currentVal + (Number(n) || 0));
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
    if (patch.mp != null) {
      p.mp = Math.max(0, Math.min(p.maxMp, Number(patch.mp)));
    }
    if (patch.exp != null) {
      p.exp = Math.max(0, Math.floor(Number(patch.exp)));
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

  function applyDamage(amount, type = 'physical', extra = {}) {
    const p = state.player;
    if (isFainting) return 0;
    if (typeof amount !== 'number' || amount <= 0) return 0;
    if (p.hp <= 0) return 0;

    if ((invulnTimer > 0 || state.elapsed < (p.invulnUntil || 0)) && !extra.ignoreInvuln) {
      return 0;
    }

    if (state.vitals?.god) {
      invulnTimer = V.invulnDuration ?? 0.8;
      p.invulnUntil = state.elapsed + invulnTimer;
      bus.emit('player:hurt', { amount: 0, type, sourcePos: extra.sourcePos });
      bus.emit('player:damaged', { amount: 0, type, sourcePos: extra.sourcePos });
      return 0;
    }

    const defConst = V.defConstant ?? 50;
    const magicFactor = V.magicDefFactor ?? 0.5;
    const currentDef = Math.max(0, p.def ?? 0);

    let dmg = 0;
    if (type === 'magic') {
      dmg = Math.max(1, Math.round((amount * defConst) / (defConst + currentDef * magicFactor)));
    } else {
      dmg = Math.max(1, Math.round((amount * defConst) / (defConst + currentDef)));
    }

    p.hp = Math.max(0, p.hp - dmg);
    invulnTimer = V.invulnDuration ?? 0.8;
    p.invulnUntil = state.elapsed + invulnTimer;

    if (extra.slow && extra.slow > 0) {
      p.slowUntil = Math.max(p.slowUntil || 0, state.elapsed + extra.slow);
    }

    bus.emit('player:hurt', { amount: dmg, type, sourcePos: extra.sourcePos });
    bus.emit('player:damaged', { amount: dmg, type, sourcePos: extra.sourcePos });

    save();
    emitChanged({ deltaHp: -dmg, type, source: extra.source });

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

  bus.on('merit:reset', () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const p = state.player;
    p.level = 1;
    p.exp = 0;
    p.permanent = { atk: 0, def: 0 };
    p.buffs = [];
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

  const api = {
    update(dt) {
      const p = state.player;

      // Faint sequence handling
      if (isFainting) {
        faintTimer += dt;
        const teleportTime = V.faintTeleportTime ?? 1.2;
        const faintDur = V.faintDuration ?? 1.8;

        if (!faintTeleported && faintTimer >= teleportTime) {
          faintTeleported = true;
          if (ctx.zones?.teleport) {
            ctx.zones.teleport('stupa', { southSpawn: true, skipFade: true });
          } else {
            const startAng = deg(config.PLAYER?.startAngleDeg ?? 90);
            const startRad = config.PLAYER?.startRadius ?? 30;
            const pt = polar(startAng, startRad);
            state.player.position.set(pt.x, 0, pt.z);
            state.player.heading = 0;
            state.player.velocity.set(0, 0, 0);
            state.player.isMoving = false;
            state.zone = 'stupa';
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
    addPermanent,
    getStats,
    set,
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
  };

  ctx.vitals = api;

  ctx.debug?.register('vitals', {
    set: (patch) => api.set(patch),
    damage: (amount, type = 'physical', extra = {}) =>
      api.damage(amount, type, extra),
    god: (bool) => api.god(bool),
    get: () => api.getStats(),
    addExp: (n) => api.addExp(n),
    faint: () => api.faint(),
  });

  return api;
}
