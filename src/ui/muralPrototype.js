import '../i18n/muralPrototype.js';

export const MURAL_PROTO_MODES = ['off', 'optionA', 'optionB'];
export const MURAL_PASSCODE = 'amitabha';

export function normalizeMuralProtoMode(val) {
  return MURAL_PROTO_MODES.includes(val) ? val : 'off';
}

export function createMuralPrototype(ctx) {
  const { state, bus, i18n } = ctx;

  const savedSettings = ctx.save?.get?.('settings', {}) || {};
  let unlocked = Boolean(savedSettings.muralProtoUnlocked);
  let mode = unlocked ? normalizeMuralProtoMode(savedSettings.muralProtoMode) : 'off';

  state.muralProtoUnlocked = unlocked;
  state.muralProtoMode = mode;
  state.muralBattleActive = false;

  let battleCooldown = 0;
  let unfurlTimer = 0;
  let previousUiOpen = false;

  const battleState = {
    active: false,
    turn: 1,
    bp: 1,
    maxBp: 4,
    mudras: { om: false, ah: false, hum: false },
    wardActive: false,
    allyBuffActive: false,
    targetIndex: 0,
    engagedWorldEnemyId: null,
    enemies: [],
    lastLog: '',
  };

  function persistSettings() {
    if (!ctx.save?.set) return;
    const cur = ctx.save.get?.('settings', {}) || {};
    const next = {
      ...cur,
      muralProtoUnlocked: unlocked,
      muralProtoMode: mode,
    };
    ctx.save.set('settings', next);
    ctx.save.flush?.();
  }

  // ---------------------------------------------------------------- DOM Construction
  const hasDom = typeof document !== 'undefined' && Boolean(document.body);
  let unfurlEl = null;
  let unfurlTitleEl = null;
  let barEl = null;
  let barSubEl = null;
  let frameOverlayEl = null;
  let brushLayerEl = null;
  let battleModalEl = null;

  if (hasDom) {
    // 1. Scroll Unfurl Transition Banner
    unfurlEl = document.createElement('div');
    unfurlEl.id = 'mural-scroll-unfurl';
    unfurlEl.className = 'mural-scroll-unfurl';
    unfurlEl.innerHTML = `
      <div class="mural-scroll-unfurl__parchment">
        <div class="mural-scroll-unfurl__kicker" data-i18n="muralProto.unfurl.kicker"></div>
        <h2 class="mural-scroll-unfurl__title"></h2>
        <div class="mural-scroll-unfurl__sub" data-i18n="muralProto.unfurl.sub"></div>
      </div>
    `;
    document.body.appendChild(unfurlEl);
    unfurlTitleEl = unfurlEl.querySelector('.mural-scroll-unfurl__title');

    // 2. Top Floating Prototype Switcher Bar
    barEl = document.createElement('div');
    barEl.id = 'mural-proto-bar';
    barEl.className = 'mural-proto-bar is-hidden';
    barEl.innerHTML = `
      <div class="mural-proto-bar__main">
        <span class="mural-proto-bar__tag" data-i18n="muralProto.bar.label"></span>
        <button type="button" class="mural-proto-bar__btn" data-mural-mode="off" data-i18n="muralProto.bar.off"></button>
        <button type="button" class="mural-proto-bar__btn" data-mural-mode="optionA" data-i18n="muralProto.bar.optionA"></button>
        <button type="button" class="mural-proto-bar__btn" data-mural-mode="optionB" data-i18n="muralProto.bar.optionB"></button>
        <button type="button" class="mural-proto-bar__btn mural-proto-bar__btn--action" data-mural-teleport data-i18n="muralProto.bar.teleport"></button>
        <button type="button" class="mural-proto-bar__btn mural-proto-bar__btn--battle" data-mural-start-battle data-i18n="muralProto.bar.startBattle"></button>
      </div>
      <div class="mural-proto-bar__sub is-hidden"></div>
    `;
    document.body.appendChild(barEl);
    barSubEl = barEl.querySelector('.mural-proto-bar__sub');

    barEl.addEventListener('click', (ev) => {
      const modeBtn = ev.target.closest('[data-mural-mode]');
      if (modeBtn) {
        setMode(modeBtn.dataset.muralMode, { playUnfurl: modeBtn.dataset.muralMode !== 'off' });
        return;
      }
      if (ev.target.closest('[data-mural-teleport]')) {
        teleportToMuralDemo();
        return;
      }
      if (ev.target.closest('[data-mural-start-battle]')) {
        if (mode !== 'optionB') {
          setMode('optionB', { playUnfurl: false });
        }
        startTurnBattle();
      }
    });

    // 3. 2.5D Scroll Frame & Brushwork Overlay
    frameOverlayEl = document.createElement('div');
    frameOverlayEl.id = 'mural-frame-overlay';
    frameOverlayEl.className = 'mural-frame-overlay is-hidden';
    frameOverlayEl.innerHTML = `
      <div class="mural-frame-overlay__tiltshift-top"></div>
      <div class="mural-frame-overlay__tiltshift-bottom"></div>
      <div class="mural-frame-overlay__clouds mural-frame-overlay__clouds--top"></div>
      <div class="mural-frame-overlay__clouds mural-frame-overlay__clouds--bottom"></div>
      <div class="mural-frame-overlay__border"></div>
      <div class="mural-brush-layer"></div>
    `;
    document.body.appendChild(frameOverlayEl);
    brushLayerEl = frameOverlayEl.querySelector('.mural-brush-layer');

    // 4. Option B: 2.5D Thangka Turn-Based Combat Stage Modal
    battleModalEl = document.createElement('div');
    battleModalEl.id = 'mural-turn-battle';
    battleModalEl.className = 'mural-turn-battle is-hidden';
    battleModalEl.setAttribute('role', 'dialog');
    battleModalEl.setAttribute('aria-modal', 'true');
    document.body.appendChild(battleModalEl);

    battleModalEl.addEventListener('click', (ev) => {
      const targetCard = ev.target.closest('[data-enemy-idx]');
      if (targetCard) {
        const idx = Number(targetCard.dataset.enemyIdx);
        if (battleState.enemies[idx] && battleState.enemies[idx].hp > 0) {
          battleState.targetIndex = idx;
          renderBattleModal();
        }
        return;
      }
      const cmdBtn = ev.target.closest('[data-mural-cmd]');
      if (cmdBtn && !cmdBtn.disabled) {
        executeCommand(cmdBtn.dataset.muralCmd);
        return;
      }
      if (ev.target.closest('[data-mural-flee]')) {
        closeTurnBattle({ fled: true });
      }
    });

    window.addEventListener('keydown', (ev) => {
      if (!battleState.active) return;
      if (ev.key === 'Escape') {
        ev.preventDefault();
        closeTurnBattle({ fled: true });
        return;
      }
      const keyMap = {
        Digit1: 'om',
        Digit2: 'ah',
        Digit3: 'hum',
        Digit4: 'ult',
        Digit5: 'ally',
        Digit6: 'lamp',
      };
      const cmd = keyMap[ev.code];
      if (cmd) {
        ev.preventDefault();
        executeCommand(cmd);
      }
    });
  }

  // ---------------------------------------------------------------- Brushwork Slash VFX (Ōkami style)
  function spawnBrushSlash(glyph = '吽', angleDeg = null) {
    if (!brushLayerEl) return;
    const el = document.createElement('div');
    el.className = 'mural-brush-slash';
    const angle = angleDeg ?? Math.round((Math.random() - 0.5) * 34);
    el.style.setProperty('--slash-angle', `${angle}deg`);
    el.innerHTML = `
      <svg viewBox="0 0 500 140" width="100%" height="100%" style="position:absolute;inset:0;overflow:visible">
        <defs>
          <linearGradient id="okamiGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0" />
            <stop offset="20%" stop-color="#fbbf24" stop-opacity="0.95" />
            <stop offset="65%" stop-color="#dc2626" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#78350f" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path d="M 15 85 Q 240 20 485 75 Q 250 55 15 85 Z" fill="url(#okamiGoldGrad)" />
        <path d="M 45 96 Q 255 48 455 88" stroke="#fef9c3" stroke-width="4" fill="none" stroke-linecap="round" />
      </svg>
      <span class="mural-brush-slash__glyph">${glyph}</span>
    `;
    brushLayerEl.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 640);
  }

  bus?.on?.('player:attack', () => {
    if (mode !== 'off') spawnBrushSlash('吽');
  });
  bus?.on?.('player:chant', () => {
    if (mode !== 'off') spawnBrushSlash('唵嘛呢叭咪吽', -8);
  });
  bus?.on?.('mantra:cast', () => {
    if (mode !== 'off') spawnBrushSlash('嗡阿吽', 8);
  });
  bus?.on?.('skill:cast', (payload) => {
    if (mode === 'off') return;
    const id = payload?.id || '';
    const glyph = id.includes('lotus') ? '阿・蓮華' : id.includes('phurba') ? '吽・普巴' : '金剛伏魔';
    spawnBrushSlash(glyph);
  });

  // ---------------------------------------------------------------- Scroll Unfurl Transition
  function triggerUnfurlBanner(forMode = mode) {
    if (forMode === 'off') return;
    unfurlTimer = 1.45;
    bus?.emit?.('sfx', { name: 'bell' });
    if (!unfurlEl) return;
    for (const el of unfurlEl.querySelectorAll('[data-i18n]')) {
      el.textContent = i18n.t(el.dataset.i18n);
    }
    if (unfurlTitleEl) {
      unfurlTitleEl.textContent = i18n.t(
        forMode === 'optionB' ? 'muralProto.unfurl.titleB' : 'muralProto.unfurl.titleA'
      );
    }
    unfurlEl.classList.add('is-active');
  }

  // ---------------------------------------------------------------- Teleport & Demo Setup in Pharping
  async function teleportToMuralDemo() {
    if (state.mode === 'intro') {
      state.mode = 'play';
      bus?.emit?.('game:start');
    }
    triggerUnfurlBanner(mode === 'off' ? 'optionA' : mode);
    if (ctx.zones?.teleport) {
      await ctx.zones.teleport('pharping', { skipFade: true, silent: true });
    } else {
      state.zone = 'pharping';
      state.zoneType = 'combat';
    }
    // Place Pilgrim along the scenic Yangleshö corridor outside the entrance safeZone
    const targetX = 2000;
    const targetZ = 28;
    const y = ctx.world?.getHeight?.(targetX, targetZ, 'pharping') ?? 0;
    if (state.player?.position?.set) {
      state.player.position.set(targetX, y, targetZ);
    } else if (state.player?.position) {
      state.player.position.x = targetX;
      state.player.position.y = y;
      state.player.position.z = targetZ;
    }
    if (state.player) {
      state.player.heading = 0; // Facing North (-Z, which is Screen Right in 2.5D view)
    }

    // Ensure a couple of enemies are right along the 2.5D scroll path ahead of the player
    const active = ctx.enemies?.getActiveEnemies?.() || [];
    const nearby = active.filter(
      (e) => e && e.state !== 'liberated' && Math.hypot((e.pos?.x ?? 0) - targetX, (e.pos?.z ?? 0) - targetZ) < 18
    );
    if (nearby.length === 0 && ctx.enemies?.spawn) {
      ctx.enemies.spawn('thirstyPreta', { x: 2000, z: 18 });
      ctx.enemies.spawn('dustDevil', { x: 2000, z: 10 });
    }
    syncUi();
  }

  // ---------------------------------------------------------------- Option B: Turn-Based Thangka Combat
  function resolveEnemyDisplayName(enemy, fallbackKey) {
    if (!enemy) return i18n.t(fallbackKey);
    if (enemy.eliteName) return enemy.eliteName;
    if (enemy.displayNameKey && i18n.has?.(enemy.displayNameKey)) return i18n.t(enemy.displayNameKey);
    if (enemy.kind && i18n.has?.(`enemy.${enemy.kind}`)) return i18n.t(`enemy.${enemy.kind}`);
    return i18n.t(fallbackKey);
  }

  function startTurnBattle(worldEnemy = null) {
    if (mode !== 'optionB') {
      mode = 'optionB';
      state.muralProtoMode = 'optionB';
    }
    battleState.active = true;
    state.muralBattleActive = true;
    previousUiOpen = Boolean(state.uiOpen);
    state.uiOpen = true;

    battleState.turn = 1;
    battleState.bp = 1;
    battleState.mudras = { om: false, ah: false, hum: false };
    battleState.wardActive = false;
    battleState.allyBuffActive = false;
    battleState.targetIndex = 0;
    battleState.engagedWorldEnemyId = worldEnemy?.id ?? null;

    const e1MaxHp = Math.max(60, Math.min(160, Math.round((worldEnemy?.maxHp || 48) * 1.8)));
    battleState.enemies = [
      {
        id: 'mural-e1',
        name: resolveEnemyDisplayName(worldEnemy, 'muralProto.battle.enemy1Default'),
        hp: e1MaxHp,
        maxHp: e1MaxHp,
        shield: 3,
        maxShield: 3,
        broken: false,
      },
      {
        id: 'mural-e2',
        name: i18n.t('muralProto.battle.enemy2Default'),
        hp: 100,
        maxHp: 100,
        shield: 3,
        maxShield: 3,
        broken: false,
      },
    ];
    battleState.lastLog = i18n.t('muralProto.battle.bannerStart');

    bus?.emit?.('sfx', { name: 'bowl' });
    bus?.emit?.('muralBattle:started', { engagedEnemyId: battleState.engagedWorldEnemyId });
    renderBattleModal();
    syncUi();
    return battleState;
  }

  function closeTurnBattle({ fled = false } = {}) {
    if (!battleState.active) return;
    battleState.active = false;
    state.muralBattleActive = false;
    state.uiOpen = previousUiOpen;
    battleCooldown = fled ? 4.0 : 3.0;
    if (battleModalEl) {
      battleModalEl.classList.add('is-hidden');
    }
    bus?.emit?.('muralBattle:ended', { fled });
    syncUi();
  }

  function getAliveTarget() {
    const cur = battleState.enemies[battleState.targetIndex];
    if (cur && cur.hp > 0) return cur;
    const firstAliveIdx = battleState.enemies.findIndex((e) => e.hp > 0);
    if (firstAliveIdx >= 0) {
      battleState.targetIndex = firstAliveIdx;
      return battleState.enemies[firstAliveIdx];
    }
    return null;
  }

  function applyHitToEnemy(enemy, baseDmg, shieldBreakCount) {
    if (!enemy || enemy.hp <= 0) return { dealt: 0,newlyBroken: false };
    let newlyBroken = false;
    if (!enemy.broken && shieldBreakCount > 0) {
      enemy.shield = Math.max(0, enemy.shield - shieldBreakCount);
      if (enemy.shield === 0) {
        enemy.broken = true;
        newlyBroken = true;
      }
    }
    const buffMult = battleState.allyBuffActive ? 1.5 : 1.0;
    const breakMult = enemy.broken ? 2.0 : 1.0;
    const dealt = Math.max(1, Math.round(baseDmg * buffMult * breakMult));
    enemy.hp = Math.max(0, enemy.hp - dealt);
    return { dealt, newlyBroken };
  }

  function canUseUltimate() {
    const allMudras = battleState.mudras.om && battleState.mudras.ah && battleState.mudras.hum;
    return allMudras || battleState.bp >= 2;
  }

  function executeCommand(cmdId) {
    if (!battleState.active) return { ok: false, reason: 'inactive' };
    const target = getAliveTarget();
    if (!target) return { ok: false, reason: 'no-target' };

    const p = state.player || {};
    const curMp = p.mp ?? 60;
    let logMsg = '';
    let breakNotice = '';

    if (cmdId === 'om') {
      battleState.mudras.om = true;
      battleState.wardActive = true;
      battleState.bp = Math.min(battleState.maxBp, battleState.bp + 1);
      const { dealt, newlyBroken } = applyHitToEnemy(target, 28, 1);
      battleState.allyBuffActive = false;
      spawnBrushSlash('嗡', -12);
      logMsg = i18n.t('muralProto.battle.logOm', { target: target.name, dmg: dealt });
      if (newlyBroken) breakNotice = i18n.t('muralProto.battle.logBreak', { target: target.name });
    } else if (cmdId === 'ah') {
      if (curMp < 10) {
        bus?.emit?.('toast', { key: 'toast.noMp', kind: 'warning' });
        return { ok: false, reason: 'no-mp' };
      }
      if (ctx.vitals?.spendMp) ctx.vitals.spendMp(10);
      else if (state.player) state.player.mp = Math.max(0, curMp - 10);

      battleState.mudras.ah = true;
      bus?.emit?.('vitals:restore', { hp: 20, source: 'muralAh' });
      if (!ctx.vitals && state.player) {
        state.player.hp = Math.min(state.player.maxHp || 100, (state.player.hp || 80) + 20);
      }

      let totalDealt = 0;
      for (const e of battleState.enemies) {
        if (e.hp <= 0) continue;
        const { dealt, newlyBroken } = applyHitToEnemy(e, 24, 1);
        totalDealt += dealt;
        if (newlyBroken && !breakNotice) {
          breakNotice = i18n.t('muralProto.battle.logBreak', { target: e.name });
        }
      }
      battleState.allyBuffActive = false;
      spawnBrushSlash('阿・蓮華', 10);
      logMsg = i18n.t('muralProto.battle.logAh', { dmg: totalDealt });
    } else if (cmdId === 'hum') {
      if (curMp < 15) {
        bus?.emit?.('toast', { key: 'toast.noMp', kind: 'warning' });
        return { ok: false, reason: 'no-mp' };
      }
      if (ctx.vitals?.spendMp) ctx.vitals.spendMp(15);
      else if (state.player) state.player.mp = Math.max(0, curMp - 15);

      battleState.mudras.hum = true;
      const { dealt, newlyBroken } = applyHitToEnemy(target, 42, 2);
      battleState.allyBuffActive = false;
      spawnBrushSlash('吽・普巴', -18);
      logMsg = i18n.t('muralProto.battle.logHum', { target: target.name, dmg: dealt });
      if (newlyBroken) breakNotice = i18n.t('muralProto.battle.logBreak', { target: target.name });
    } else if (cmdId === 'ult') {
      if (!canUseUltimate()) return { ok: false, reason: 'ult-locked' };
      const allMudras = battleState.mudras.om && battleState.mudras.ah && battleState.mudras.hum;
      if (allMudras) {
        battleState.mudras = { om: false, ah: false, hum: false };
      } else {
        battleState.bp = Math.max(0, battleState.bp - 2);
      }
      let totalDealt = 0;
      for (const e of battleState.enemies) {
        if (e.hp <= 0) continue;
        const { dealt, newlyBroken } = applyHitToEnemy(e, 76, 3);
        totalDealt += dealt;
        if (newlyBroken && !breakNotice) {
          breakNotice = i18n.t('muralProto.battle.logBreak', { target: e.name });
        }
      }
      battleState.allyBuffActive = false;
      spawnBrushSlash('嗡阿吽', 0);
      bus?.emit?.('sfx', { name: 'bell' });
      logMsg = i18n.t('muralProto.battle.logUlt', { dmg: totalDealt });
    } else if (cmdId === 'ally') {
      if (battleState.bp < 1) return { ok: false, reason: 'no-bp' };
      battleState.bp -= 1;
      battleState.allyBuffActive = true;
      let totalDealt = 0;
      for (const e of battleState.enemies) {
        if (e.hp <= 0) continue;
        const { dealt, newlyBroken } = applyHitToEnemy(e, 22, 1);
        totalDealt += dealt;
        if (newlyBroken && !breakNotice) {
          breakNotice = i18n.t('muralProto.battle.logBreak', { target: e.name });
        }
      }
      spawnBrushSlash('措嘉甘露', 14);
      logMsg = i18n.t('muralProto.battle.logAlly', { dmg: totalDealt });
    } else if (cmdId === 'lamp') {
      battleState.bp = Math.min(battleState.maxBp, battleState.bp + 1);
      bus?.emit?.('vitals:restore', { hp: 15, mp: 35, source: 'muralLamp' });
      if (!ctx.vitals && state.player) {
        state.player.hp = Math.min(state.player.maxHp || 100, (state.player.hp || 80) + 15);
        state.player.mp = Math.min(state.player.maxMp || 60, (state.player.mp || 20) + 35);
      }
      spawnBrushSlash('🪔 供燈', 0);
      bus?.emit?.('sfx', { name: 'bowl' });
      logMsg = i18n.t('muralProto.battle.logLamp');
    } else {
      return { ok: false, reason: 'unknown-cmd' };
    }

    // Check if all enemies are purified
    const anyAlive = battleState.enemies.some((e) => e.hp > 0);
    if (!anyAlive) {
      battleState.lastLog = `${logMsg} ${i18n.t('muralProto.battle.victoryTitle')}`;
      if (battleState.engagedWorldEnemyId && ctx.enemies?.damage) {
        ctx.enemies.damage(battleState.engagedWorldEnemyId, 9999, {
          type: 'magic',
          source: 'muralPrototype',
        });
      }
      ctx.vitals?.addExp?.(35);
      bus?.emit?.('merit', { type: 'lamp', count: 1, source: 'quickLamp' });
      bus?.emit?.('toast', { text: i18n.t('muralProto.battle.victoryToast'), kind: 'merit' });
      bus?.emit?.('muralBattle:victory', { turn: battleState.turn });
      renderBattleModal();
      setTimeout(() => {
        if (battleState.active && !battleState.enemies.some((e) => e.hp > 0)) {
          closeTurnBattle({ fled: false });
        }
      }, 950);
      return { ok: true, victory: true, log: battleState.lastLog };
    }

    // Enemy phase resolution
    const enemyLogs = [];
    for (const e of battleState.enemies) {
      if (e.hp <= 0) continue;
      if (e.broken) {
        enemyLogs.push(i18n.t('muralProto.battle.logEnemyStun', { actor: e.name }));
        e.broken = false;
        e.shield = e.maxShield;
      } else {
        const rawDmg = battleState.wardActive ? 6 : 12;
        if ( state.player ) {
          const curHp = state.player.hp ?? 100;
          state.player.hp = Math.max(1, curHp - rawDmg);
        }
        enemyLogs.push(i18n.t('muralProto.battle.logEnemyAtk', { actor: e.name, dmg: rawDmg }));
      }
    }
    battleState.wardActive = false;
    battleState.turn += 1;

    battleState.lastLog = [logMsg, breakNotice, ...enemyLogs].filter(Boolean).join(' ');
    renderBattleModal();
    return { ok: true, victory: false, log: battleState.lastLog };
  }

  function renderBattleModal() {
    if (!battleModalEl) return;
    if (!battleState.active) {
      battleModalEl.classList.add('is-hidden');
      return;
    }
    battleModalEl.classList.remove('is-hidden');

    const p = state.player || {};
    const hp = Math.round(p.hp ?? 100);
    const maxHp = Math.max(1, Math.round(p.maxHp ?? 100));
    const mp = Math.round(p.mp ?? 60);
    const maxMp = Math.max(1, Math.round(p.maxMp ?? 60));
    const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    const mpPct = Math.max(0, Math.min(100, (mp / maxMp) * 100));

    getAliveTarget();
    const ultReady = canUseUltimate();

    const bpOrbsHtml = Array.from({ length: battleState.maxBp }, (_, idx) =>
      `<span class="mural-turn-battle__bp-orb ${idx < battleState.bp ? 'is-filled' : ''}"></span>`
    ).join('');

    const enemiesHtml = battleState.enemies
      .map((e, idx) => {
        const eHpPct = Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100));
        const isTarget = idx === battleState.targetIndex && e.hp > 0;
        const shieldIcons = '🛡'.repeat(Math.max(0, e.shield));
        const statusBadge =
          e.hp <= 0
            ? `<span class="mural-enemy-card__shield">${i18n.t('muralProto.battle.defeatedBadge')}</span>`
            : e.broken
              ? `<span class="mural-enemy-card__shield">${i18n.t('muralProto.battle.brokenBadge')}</span>`
              : `<span class="mural-enemy-card__shield">${i18n.t('muralProto.battle.shieldLabel')}: ${shieldIcons || '0'} (${e.shield}/${e.maxShield})</span>`;

        return `
          <div class="mural-enemy-card ${isTarget ? 'is-targeted' : ''} ${e.broken ? 'is-broken' : ''} ${e.hp <= 0 ? 'is-defeated' : ''}" data-enemy-idx="${idx}">
            <div class="mural-enemy-card__top">
              <span class="mural-enemy-card__name">${isTarget ? '🎯 ' : '👹 '}${e.name}</span>
              ${statusBadge}
            </div>
            <div class="mural-turn-battle__bar-row">
              <span>HP ${e.hp}/${e.maxHp}</span>
              <div class="mural-turn-battle__bar-track">
                <div class="mural-turn-battle__bar-fill mural-turn-battle__bar-fill--hp" style="width:${eHpPct.toFixed(1)}%;background:linear-gradient(90deg,#dc2626,#f97316)"></div>
              </div>
            </div>
            <div class="mural-enemy-card__meta">
              <span>${i18n.t('muralProto.battle.weaknessLabel')}${i18n.t('muralProto.battle.weaknessVal')}</span>
              <span>${e.broken ? i18n.t('muralProto.battle.intentBroken') : i18n.t('muralProto.battle.intentAttack')}</span>
            </div>
          </div>
        `;
      })
      .join('');

    battleModalEl.innerHTML = `
      <div class="mural-turn-battle__scroll">
        <div class="mural-turn-battle__top">
          <h3 class="mural-turn-battle__title">${i18n.t('muralProto.battle.header')}</h3>
          <div class="mural-turn-battle__timeline">
            <span class="mural-turn-battle__timeline-label">${i18n.t('muralProto.battle.timeline')} (T${battleState.turn})：</span>
            <span class="mural-turn-battle__turn-chip is-current">${i18n.t('muralProto.battle.turnPilgrim')}</span>
            <span>→</span>
            <span class="mural-turn-battle__turn-chip">${i18n.t('muralProto.battle.turnProtector')}</span>
            <span>→</span>
            <span class="mural-turn-battle__turn-chip">${i18n.t('muralProto.battle.turnEnemy')}</span>
          </div>
        </div>

        <div class="mural-turn-battle__stage">
          <div class="mural-turn-battle__side">
            <div class="mural-turn-battle__hero-head">
              <div class="mural-turn-battle__avatar" aria-hidden="true">🧘</div>
              <div>
                <div style="font-weight:800;font-size:1rem;color:#fef08a">${i18n.t('muralProto.battle.pilgrimName')}</div>
                <div style="font-size:0.8rem;color:#fde68a;opacity:0.9">${i18n.t('muralProto.battle.protectorName')}</div>
              </div>
            </div>

            <div class="mural-turn-battle__bars">
              <div class="mural-turn-battle__bar-row">
                <strong style="min-width:78px">HP ${hp}/${maxHp}</strong>
                <div class="mural-turn-battle__bar-track">
                  <div class="mural-turn-battle__bar-fill mural-turn-battle__bar-fill--hp" style="width:${hpPct.toFixed(1)}%"></div>
                </div>
              </div>
              <div class="mural-turn-battle__bar-row">
                <strong style="min-width:78px">MP ${mp}/${maxMp}</strong>
                <div class="mural-turn-battle__bar-track">
                  <div class="mural-turn-battle__bar-fill mural-turn-battle__bar-fill--mp" style="width:${mpPct.toFixed(1)}%"></div>
                </div>
              </div>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:0.78rem">
              ${battleState.wardActive ? `<span class="settings-mural-proto__badge">${i18n.t('muralProto.battle.wardBuff')}</span>` : ''}
              ${battleState.allyBuffActive ? `<span class="settings-mural-proto__badge">${i18n.t('muralProto.battle.protectorBuff')}</span>` : `<span style="color:#a7f3d0">${i18n.t('muralProto.battle.protectorReady')}</span>`}
            </div>

            <div class="mural-turn-battle__mudra-row">
              <div>
                <span style="font-size:0.78rem;color:#fcd34d">${i18n.t('muralProto.battle.mudraLabel')}</span>
                <div class="mural-turn-battle__mudra-badges" style="margin-top:4px">
                  <span class="mural-turn-battle__mudra-pill ${battleState.mudras.om ? 'is-lit' : ''}">嗡 OM</span>
                  <span class="mural-turn-battle__mudra-pill ${battleState.mudras.ah ? 'is-lit' : ''}">阿 AH</span>
                  <span class="mural-turn-battle__mudra-pill ${battleState.mudras.hum ? 'is-lit' : ''}">吽 HUM</span>
                </div>
              </div>
              <div>
                <div style="font-size:0.78rem;color:#fcd34d;margin-bottom:4px">${i18n.t('muralProto.battle.bpLabel')}</div>
                <div class="mural-turn-battle__bp-orbs">${bpOrbsHtml}</div>
              </div>
            </div>
          </div>

          <div class="mural-turn-battle__enemies">
            ${enemiesHtml}
          </div>
        </div>

        <div class="mural-turn-battle__log" aria-live="polite">${battleState.lastLog}</div>

        <div class="mural-turn-battle__deck">
          <button type="button" class="mural-cmd-btn" data-mural-cmd="om">
            <div class="mural-cmd-btn__head">
              <span>[1] ☸️ ${i18n.t('muralProto.battle.cmd.om.name')}</span>
              <span class="mural-cmd-btn__cost">${i18n.t('muralProto.battle.cmd.om.cost')}</span>
            </div>
            <div class="mural-cmd-btn__desc">${i18n.t('muralProto.battle.cmd.om.desc')}</div>
          </button>

          <button type="button" class="mural-cmd-btn" data-mural-cmd="ah" ${mp < 10 ? 'disabled' : ''}>
            <div class="mural-cmd-btn__head">
              <span>[2] 🌸 ${i18n.t('muralProto.battle.cmd.ah.name')}</span>
              <span class="mural-cmd-btn__cost">${i18n.t('muralProto.battle.cmd.ah.cost')}</span>
            </div>
            <div class="mural-cmd-btn__desc">${i18n.t('muralProto.battle.cmd.ah.desc')}</div>
          </button>

          <button type="button" class="mural-cmd-btn" data-mural-cmd="hum" ${mp < 15 ? 'disabled' : ''}>
            <div class="mural-cmd-btn__head">
              <span>[3] ⚡ ${i18n.t('muralProto.battle.cmd.hum.name')}</span>
              <span class="mural-cmd-btn__cost">${i18n.t('muralProto.battle.cmd.hum.cost')}</span>
            </div>
            <div class="mural-cmd-btn__desc">${i18n.t('muralProto.battle.cmd.hum.desc')}</div>
          </button>

          <button type="button" class="mural-cmd-btn mural-cmd-btn--ult" data-mural-cmd="ult" ${!ultReady ? 'disabled' : ''}>
            <div class="mural-cmd-btn__head">
              <span>[4] ✨ ${i18n.t('muralProto.battle.cmd.ult.name')}</span>
              <span class="mural-cmd-btn__cost">${i18n.t('muralProto.battle.cmd.ult.cost')}</span>
            </div>
            <div class="mural-cmd-btn__desc">${i18n.t('muralProto.battle.cmd.ult.desc')}</div>
          </button>

          <button type="button" class="mural-cmd-btn" data-mural-cmd="ally" ${battleState.bp < 1 ? 'disabled' : ''}>
            <div class="mural-cmd-btn__head">
              <span>[5] 🦁 ${i18n.t('muralProto.battle.cmd.ally.name')}</span>
              <span class="mural-cmd-btn__cost">${i18n.t('muralProto.battle.cmd.ally.cost')}</span>
            </div>
            <div class="mural-cmd-btn__desc">${i18n.t('muralProto.battle.cmd.ally.desc')}</div>
          </button>

          <button type="button" class="mural-cmd-btn" data-mural-cmd="lamp">
            <div class="mural-cmd-btn__head">
              <span>[6] 🪔 ${i18n.t('muralProto.battle.cmd.lamp.name')}</span>
              <span class="mural-cmd-btn__cost">${i18n.t('muralProto.battle.cmd.lamp.cost')}</span>
            </div>
            <div class="mural-cmd-btn__desc">${i18n.t('muralProto.battle.cmd.lamp.desc')}</div>
          </button>
        </div>

        <div class="mural-turn-battle__footer">
          <button type="button" class="settings-backup__btn settings-cloud__btn--subtle" style="flex:0 0 auto" data-mural-flee>
            ${i18n.t('muralProto.battle.fleeBtn')}
          </button>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------- UI Sync
  function syncUi() {
    if (!hasDom) return;
    for (const root of [barEl, unfurlEl]) {
      if (!root) continue;
      for (const el of root.querySelectorAll('[data-i18n]')) {
        el.textContent = i18n.t(el.dataset.i18n);
      }
    }

    const showBar = unlocked && state.mode === 'play';
    if (barEl) {
      barEl.classList.toggle('is-hidden', !showBar);
      for (const btn of barEl.querySelectorAll('[data-mural-mode]')) {
        btn.classList.toggle('is-active', btn.dataset.muralMode === mode);
      }
      const startBattleBtn = barEl.querySelector('[data-mural-start-battle]');
      if (startBattleBtn) {
        startBattleBtn.classList.toggle('is-hidden', mode !== 'optionB');
      }
    }

    if (barSubEl) {
      if (mode === 'optionA') {
        barSubEl.textContent = i18n.t('muralProto.bar.subA');
        barSubEl.classList.remove('is-hidden');
      } else if (mode === 'optionB') {
        barSubEl.textContent = i18n.t('muralProto.bar.subB');
        barSubEl.classList.remove('is-hidden');
      } else {
        barSubEl.classList.add('is-hidden');
      }
    }

    const showFrame = unlocked && mode !== 'off' && state.mode === 'play' && state.zone !== 'stupa';
    if (frameOverlayEl) {
      frameOverlayEl.classList.toggle('is-hidden', !showFrame);
    }

    if (battleState.active) {
      renderBattleModal();
    }
  }

  // ---------------------------------------------------------------- Public API Methods
  function unlockWithPasscode(inputStr) {
    const normalized = String(inputStr || '').trim().toLowerCase();
    if (normalized !== MURAL_PASSCODE) {
      return false;
    }
    unlocked = true;
    state.muralProtoUnlocked = true;
    if (mode === 'off') {
      mode = 'optionA';
      state.muralProtoMode = 'optionA';
    }
    persistSettings();
    bus?.emit?.('sfx', { name: 'bell' });
    bus?.emit?.('toast', { text: i18n.t('settings.muralProto.unlockToast'), kind: 'merit' });
    bus?.emit?.('muralProto:changed', { unlocked, mode });
    syncUi();
    return true;
  }

  function setMode(nextMode, { teleportToPharping = false, playUnfurl = false } = {}) {
    const norm = normalizeMuralProtoMode(nextMode);
    if (norm !== 'off' && !unlocked) {
      unlocked = true;
      state.muralProtoUnlocked = true;
    }
    mode = norm;
    state.muralProtoMode = norm;
    if (mode !== 'optionB' && battleState.active) {
      closeTurnBattle({ fled: true });
    }
    persistSettings();
    bus?.emit?.('muralProto:changed', { unlocked, mode });
    syncUi();

    if (teleportToPharping) {
      return teleportToMuralDemo();
    }
    if (playUnfurl && mode !== 'off') {
      triggerUnfurlBanner(mode);
    }
    return Promise.resolve(true);
  }

  function launchDemo(targetMode = 'optionA') {
    unlocked = true;
    state.muralProtoUnlocked = true;
    ctx.settingsUi?.close?.();
    return setMode(targetMode, { teleportToPharping: true, playUnfurl: true });
  }

  bus?.on?.('zone:change', ({ to }) => {
    if (unlocked && mode !== 'off' && to && to !== 'stupa') {
      triggerUnfurlBanner(mode);
    }
    syncUi();
  });

  bus?.on?.('game:start', () => syncUi());
  i18n?.onChange?.(() => syncUi());
  syncUi();

  // ---------------------------------------------------------------- Frame Update
  function update(dt) {
    if (unfurlTimer > 0) {
      unfurlTimer = Math.max(0, unfurlTimer - dt);
      if (unfurlTimer === 0 && unfurlEl) {
        unfurlEl.classList.remove('is-active');
      }
    }

    if (battleCooldown > 0) {
      battleCooldown = Math.max(0, battleCooldown - dt);
    }

    if (!unlocked || mode === 'off' || state.mode !== 'play') return;

    // In combat zones: align nearby active enemies onto the 2.5D belt depth plane
    if (state.zone !== 'stupa' && !battleState.active) {
      const pPos = state.player?.position;
      const enemies = ctx.enemies?.getActiveEnemies?.() || [];
      if (pPos && enemies.length > 0) {
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!e || e.state === 'liberated' || e.state === 'calmed' || (e.hp !== undefined && e.hp <= 0)) continue;
          const pos = e.pos || e.position;
          if (!pos) continue;
          const dist = Math.hypot(pos.x - pPos.x, pos.z - pPos.z);

          // Option A & B: gently pull nearby enemies into the 2.5D side-scroll belt (same X plane)
          if (dist < 18) {
            pos.x += (pPos.x - pos.x) * Math.min(1, dt * 3.5);
            if (e.group?.position) {
              e.group.position.x = pos.x;
            }
          }

          // Option B: touching/approaching an enemy within 4.5m unfurls the Thangka Turn-Based Battle!
          if (mode === 'optionB' && battleCooldown <= 0 && dist <= 4.5) {
            startTurnBattle(e);
            break;
          }
        }
      }
    }
  }

  const api = {
    update,
    isUnlocked: () => unlocked,
    getMode: () => mode,
    unlockWithPasscode,
    setMode,
    launchDemo,
    teleportToMuralDemo,
    startTurnBattle,
    closeTurnBattle,
    executeCommand,
    getBattleState: () => battleState,
    spawnBrushSlash,
  };

  ctx.muralPrototype = api;
  ctx.debug?.register?.('muralPrototype', api);
  return api;
}
