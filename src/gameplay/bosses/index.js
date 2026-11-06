/**
 * Boss Manager (`src/gameplay/bosses/index.js`)
 *
 * Responsibilities:
 *  - Instantiates registered Boss definitions (Prologue Boss: Migoi King `migoiKing`)
 *  - Registers Boss i18n strings and Oath dialogues (`boss.migoiKing.oath`)
 *  - Bridges `boss:start`, `boss:hp`, `boss:phase`, `boss:end`, `boss:reset` to `ctx.hud` (`#boss-bar`)
 *  - Seamlessly integrates active Boss hit detection & spatial queries into `ctx.enemies`
 *    (`queryCircle`, `queryCone`, `queryLine`, `nearest`, `damage`, `damageNearest`, `applyStatus`, `list`)
 *  - Exposes `__stupa.bosses` debug API (`start`, `setHp`, `subdue`, `reset`, `getState`)
 */
import { registerBossI18n } from '../../i18n/bosses.js';
import { createBoss } from './bossBase.js';
import { MIGOI_KING_DEF, registerMigoiKingDialogue } from './migoiKing.js';

export { createBoss, MIGOI_KING_DEF };

function dirToVec(dirRad) {
  if (typeof dirRad === 'object' && dirRad !== null) {
    const len = Math.hypot(dirRad.x || 0, dirRad.z || 0) || 1;
    return { x: (dirRad.x || 0) / len, z: (dirRad.z || 0) / len };
  }
  const a = Number(dirRad) || 0;
  return { x: -Math.sin(a), z: -Math.cos(a) };
}

export function createBosses(ctx) {
  const { bus, state } = ctx;
  registerBossI18n();
  registerMigoiKingDialogue(ctx);

  // Ensure convenience loot / groundLoot helpers exist if called directly
  if (ctx.loot && !ctx.loot.rollItem) {
    ctx.loot.rollItem = (opts) => ctx.loot.generate(opts);
  }
  if (ctx.groundLoot && !ctx.groundLoot.dropItem) {
    ctx.groundLoot.dropItem = (item, x, z) => {
      const y = ctx.world ? ctx.world.getHeight(x, z) : 0;
      return ctx.groundLoot.spawn(item, { x, y, z }, { x, y, z });
    };
  }

  const bosses = new Map();
  let activeBossId = 'migoiKing';

  function register(def) {
    const instance = createBoss(ctx, def);
    bosses.set(def.id, instance);
    return instance;
  }

  // Register Prologue Boss: Migoi King + auto-discover chapter boss modules (`src/gameplay/bosses/*.js`)
  register(MIGOI_KING_DEF);

  const bossModules = import.meta.glob('./*.js', { eager: true });
  for (const [path, mod] of Object.entries(bossModules)) {
    if (path.endsWith('/index.js') || path.endsWith('/bossBase.js') || path.endsWith('/patterns.js')) {
      continue;
    }
    if (!mod || typeof mod !== 'object') continue;
    for (const [exportKey, val] of Object.entries(mod)) {
      if (typeof val === 'function' && /^register.*Dialogue$/.test(exportKey)) {
        val(ctx);
      } else if (
        val &&
        typeof val === 'object' &&
        typeof val.id === 'string' &&
        typeof val.buildModel === 'function' &&
        !bosses.has(val.id)
      ) {
        register(val);
      }
    }
  }

  function getActiveBoss() {
    for (const b of bosses.values()) {
      if (b.isActive()) return b;
    }
    return null;
  }

  function getBossForCurrentZone() {
    const z = state.zone || 'stupa';
    for (const b of bosses.values()) {
      if (b.def?.arena?.map === z) return b;
    }
    return null;
  }

  function getBoss(id) {
    if (id && bosses.has(id)) return bosses.get(id);
    const active = getActiveBoss();
    if (active) return active;
    const zoneBoss = getBossForCurrentZone();
    if (zoneBoss) return zoneBoss;
    return bosses.get(activeBossId) || bosses.get('migoiKing') || null;
  }

  // ---------------------------------------------------------------- 1. Wire Boss Events to Top-Center HUD (#boss-bar)
  bus.on('boss:start', (payload) => {
    activeBossId = payload.id || activeBossId;
    ctx.hud?.showBossBar?.({
      nameKey: payload.nameKey || `boss.${payload.id}.name`,
      titleKey: payload.titleKey || `boss.${payload.id}.title`,
      hp: payload.hp,
      maxHp: payload.maxHp,
      phase: payload.phase,
      phaseCount: payload.totalPhases || 3,
    });

    // Align phase threshold ticks on #boss-bar-ticks with def.phases hpBelow values (e.g. 25%, 60%)
    const boss = getBoss(payload.id);
    const phases = boss?.def?.phases || [];
    if (typeof document !== 'undefined' && phases.length > 1) {
      const ticksEl = document.getElementById('boss-bar-ticks');
      if (ticksEl) {
        ticksEl.innerHTML = '';
        for (let i = 1; i < phases.length; i++) {
          const pct = Math.max(1, Math.min(99, Math.round((phases[i].hpBelow || 0.5) * 100)));
          const tick = document.createElement('div');
          tick.className = 'boss-bar-tick';
          tick.style.left = `${pct}%`;
          ticksEl.appendChild(tick);
        }
      }
    }
  });

  bus.on('boss:hp', (payload) => {
    ctx.hud?.updateBossBar?.({
      hp: payload.hp,
      maxHp: payload.maxHp,
      phase: payload.phase,
    });
  });

  bus.on('boss:phase', (payload) => {
    const boss = getBoss(payload.id);
    const st = boss?.getState?.();
    ctx.hud?.updateBossBar?.({
      hp: st?.hp ?? 0,
      maxHp: st?.maxHp ?? 1,
      phase: payload.phase,
    });
  });

  bus.on('boss:end', () => {
    ctx.hud?.hideBossBar?.();
  });

  bus.on('boss:reset', () => {
    ctx.hud?.hideBossBar?.();
  });

  // ---------------------------------------------------------------- 2. Integrate Active Boss into ctx.enemies Queries & Damage
  if (ctx.enemies && !ctx.enemies.__bossWrapped) {
    ctx.enemies.__bossWrapped = true;

    const origQueryCircle = ctx.enemies.queryCircle?.bind(ctx.enemies);
    const origQueryCone = ctx.enemies.queryCone?.bind(ctx.enemies);
    const origQueryLine = ctx.enemies.queryLine?.bind(ctx.enemies);
    const origNearest = ctx.enemies.nearest?.bind(ctx.enemies);
    const origDamage = ctx.enemies.damage?.bind(ctx.enemies);
    const origDamageNearest = ctx.enemies.damageNearest?.bind(ctx.enemies);
    const origApplyStatus = ctx.enemies.applyStatus?.bind(ctx.enemies);
    const origList = ctx.enemies.list?.bind(ctx.enemies);

    if (origQueryCircle) {
      ctx.enemies.queryCircle = (xOrObj, zOrR, maybeR) => {
        const out = origQueryCircle(xOrObj, zOrR, maybeR);
        const boss = getActiveBoss();
        if (!boss) return out;

        let cx = 0;
        let cz = 0;
        let r = 0;
        if (typeof xOrObj === 'object' && xOrObj !== null) {
          cx = xOrObj.x || 0;
          cz = xOrObj.z || 0;
          r = Number(zOrR) || 0;
        } else {
          cx = Number(xOrObj) || 0;
          cz = Number(zOrR) || 0;
          r = Number(maybeR) || 0;
        }
        const bs = boss.getInternalState();
        const dist = Math.hypot(bs.pos.x - cx, bs.pos.z - cz);
        if (dist <= r + (bs.radius || 1.2)) {
          out.push(bs);
        }
        return out;
      };
    }

    if (origQueryCone) {
      ctx.enemies.queryCone = (origin, dirRad, range, halfAngleRad) => {
        const out = origQueryCone(origin, dirRad, range, halfAngleRad);
        const boss = getActiveBoss();
        if (!boss || !origin) return out;

        const bs = boss.getInternalState();
        const dx = bs.pos.x - (origin.x || 0);
        const dz = bs.pos.z - (origin.z || 0);
        const dist = Math.hypot(dx, dz);
        if (dist > (Number(range) || 0) + (bs.radius || 1.2)) return out;
        if (dist <= 1e-5) {
          out.push(bs);
          return out;
        }
        const { x: fx, z: fz } = dirToVec(dirRad);
        const dot = (dx * fx + dz * fz) / dist;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (angle <= (Number(halfAngleRad) || 0) + 0.18) {
          out.push(bs);
        }
        return out;
      };
    }

    if (origQueryLine) {
      ctx.enemies.queryLine = (origin, dirRad, length, width) => {
        const out = origQueryLine(origin, dirRad, length, width);
        const boss = getActiveBoss();
        if (!boss || !origin) return out;

        const bs = boss.getInternalState();
        const dx = bs.pos.x - (origin.x || 0);
        const dz = bs.pos.z - (origin.z || 0);
        const { x: fx, z: fz } = dirToVec(dirRad);
        const forward = dx * fx + dz * fz;
        const perp = Math.abs(dx * -fz + dz * fx);
        const halfW = (Number(width) || 0) * 0.5 + (bs.radius || 1.2);
        if (forward >= -(bs.radius || 1.0) && forward <= (Number(length) || 0) && perp <= halfW) {
          out.push(bs);
        }
        return out;
      };
    }

    if (origNearest) {
      ctx.enemies.nearest = (origin, maxDist = Infinity, opts = {}) => {
        let best = origNearest(origin, maxDist, opts);
        const boss = getActiveBoss();
        if (!boss || !origin) return best;

        const bs = boss.getInternalState();
        const ox = origin.x || 0;
        const oz = origin.z || 0;
        const bossDist = Math.hypot(bs.pos.x - ox, bs.pos.z - oz);
        const curBestDist = best
          ? Math.hypot(best.pos.x - ox, best.pos.z - oz)
          : (typeof maxDist === 'number' ? maxDist : Infinity);

        if (bossDist <= curBestDist) {
          const hasCone = opts && opts.dirRad != null && opts.halfAngleRad != null;
          if (hasCone && bossDist > 1e-5) {
            const { x: fx, z: fz } = dirToVec(opts.dirRad);
            const dot = ((bs.pos.x - ox) * fx + (bs.pos.z - oz) * fz) / bossDist;
            const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
            if (angle > Number(opts.halfAngleRad) + 0.18) return best;
          }
          best = bs;
        }
        return best;
      };
    }

    if (origDamage) {
      ctx.enemies.damage = (idOrEnemy, amount, opts = {}) => {
        const targetId =
          typeof idOrEnemy === 'object' && idOrEnemy !== null ? idOrEnemy.id : idOrEnemy;
        const boss = bosses.get(targetId);
        if (boss && boss.isActive()) {
          return boss.damage(amount, opts);
        }
        return origDamage(idOrEnemy, amount, opts);
      };
    }

    if (origDamageNearest) {
      ctx.enemies.damageNearest = (amount = 10, opts = {}) => {
        const pPos = state.player?.position || { x: 1000, z: -48 };
        const target = ctx.enemies.nearest(pPos, Infinity);
        if (!target) return { dealt: 0, liberated: false, id: null };
        const res = ctx.enemies.damage(target.id, amount, opts);
        return { ...res, id: target.id };
      };
    }

    ctx.enemies.applyStatus = (idOrEnemy, kind, duration, extra) => {
      const targetId =
        typeof idOrEnemy === 'object' && idOrEnemy !== null ? idOrEnemy.id : idOrEnemy;
      const boss = bosses.get(targetId);
      if (boss && boss.isActive()) {
        return boss.applyStatus(kind, duration, extra);
      }
      return origApplyStatus ? origApplyStatus(idOrEnemy, kind, duration, extra) : false;
    };

    if (origList) {
      ctx.enemies.list = () => {
        const arr = origList();
        const boss = getActiveBoss();
        if (boss) {
          const st = boss.getState();
          arr.push({
            id: st.id,
            kind: st.id,
            rank: 'boss',
            level: boss.def.level || 6,
            hp: st.hp,
            maxHp: st.maxHp,
            phase: st.phase,
            position: st.position,
          });
        }
        return arr;
      };
    }
  }

  // ---------------------------------------------------------------- 3. Public & Debug API (__stupa.bosses)
  function start(id, opts = {}) {
    const boss = getBoss(id);
    if (!boss) return null;
    activeBossId = boss.id;
    return boss.start(opts);
  }

  function setHp(fraction, id) {
    const boss = getBoss(id);
    if (!boss) return null;
    activeBossId = boss.id;
    return boss.setHp(fraction);
  }

  function subdue(id) {
    const boss = getBoss(id);
    if (!boss) return null;
    activeBossId = boss.id;
    if (!boss.isActive()) {
      boss.start();
    }
    return boss.subdue();
  }

  function reset(id) {
    const boss = getBoss(id);
    if (!boss) return null;
    return boss.reset();
  }

  function getState(id) {
    const boss = (id ? bosses.get(id) : null) || getActiveBoss() || getBoss(id);
    return boss ? boss.getState() : null;
  }

  function dispelIllusions(id) {
    const boss = getBoss(id);
    if (!boss) return 0;
    const bs = boss.getInternalState();
    if (typeof boss.def?.dispelAllIllusions === 'function') {
      return boss.def.dispelAllIllusions(bs, ctx);
    }
    return 0;
  }

  function update(dt) {
    for (const boss of bosses.values()) {
      boss.update(dt);
    }
  }

  const api = {
    register,
    start,
    spawn: start,
    setHp,
    subdue,
    reset,
    getState,
    dispelIllusions,
    getBoss,
    getActiveBoss,
    getActive: getActiveBoss,
    update,
  };

  ctx.bosses = api;
  const debugBossesApi = {
    start,
    spawn: start,
    setHp,
    subdue,
    reset,
    getState,
    dispelIllusions,
  };
  ctx.debug?.register?.('bosses', debugBossesApi);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.bosses = debugBossesApi;
  }

  return api;
}
