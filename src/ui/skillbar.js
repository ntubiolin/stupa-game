/**
 * Skill Bar, Skills Modal Panel (K), and Mobile Arc Skill Pad (#26).
 *
 * - Desktop Skill Bar: bottom-center 7 slots (Space, R, 1, 2, 3, 4, T) with Tibetan glyphs,
 *   keybind badges, MP cost badges, radial conic cooldown sweeps, .is-nomp, and .is-locked states.
 * - Skills Modal Panel (K): toggles state.uiOpen, displays available Skill Points, hub-only Respec,
 *   7 skill upgrade rows (+ button), and Rank 3 A/B Mastery Enhancement cards.
 * - Mobile Arc Skill Pad: in combat zones (state.zone !== 'stupa'), replaces #mobile-actions with
 *   an ergonomic thumb arc pad (large center ཧཱུྃ button + surrounding arc buttons + Amrita potion),
 *   using pointerdown + stopPropagation() for simultaneous dual-thumb joystick + skill casting.
 */
import { SKILLS } from '../data/skills.js';
import { i18n } from '../i18n.js';
import '../i18n/skills.js';

export function createSkillbar(ctx) {
  const { state, bus } = ctx;

  const playHud = document.getElementById('play-hud') || document.getElementById('hud-root') || document.getElementById('ui') || document.body;
  const hudRoot = document.getElementById('hud-root') || document.getElementById('ui') || document.body;
  const mobileActions = document.getElementById('mobile-actions');

  let modalOpen = false;

  // ---------------------------------------------------------------- 1. Desktop 7-Slot Skill Bar
  const skillBarEl = document.createElement('div');
  skillBarEl.id = 'skill-bar';
  skillBarEl.className = 'skill-bar glass-panel';
  skillBarEl.setAttribute('role', 'toolbar');
  skillBarEl.setAttribute('aria-label', 'Skills');

  const slotEls = new Map();

  for (const def of SKILLS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `skill-slot skill-slot--${def.slot}`;
    btn.dataset.slot = def.slot;
    btn.dataset.skillId = def.id;
    btn.innerHTML = `
      <div class="skill-slot__cd" aria-hidden="true"></div>
      <span class="skill-slot__glyph" aria-hidden="true">${def.glyph}</span>
      <span class="skill-slot__lock" aria-hidden="true">🔒</span>
      <kbd class="skill-slot__key">${def.keyLabel}</kbd>
      ${def.mpCost > 0 ? `<span class="skill-slot__mp">${def.mpCost}</span>` : ''}
      <span class="skill-slot__cd-text" aria-hidden="true"></span>
      <span class="skill-slot__rank-dots" aria-hidden="true"></span>
    `;
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      ctx.skills?.cast(def.slot);
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      // Fallback for synthetic DOM click() in automated tests
      if (e.detail === 0) {
        ctx.skills?.cast(def.slot);
      }
    });
    skillBarEl.appendChild(btn);
    slotEls.set(def.id, {
      btn,
      cdEl: btn.querySelector('.skill-slot__cd'),
      cdTextEl: btn.querySelector('.skill-slot__cd-text'),
      mpEl: btn.querySelector('.skill-slot__mp'),
      rankDotsEl: btn.querySelector('.skill-slot__rank-dots'),
    });
  }

  // Small K button on the right end of the skill bar to open the Skills Modal
  const openModalBtn = document.createElement('button');
  openModalBtn.id = 'btn-skillbar-modal';
  openModalBtn.type = 'button';
  openModalBtn.className = 'skill-bar__panel-btn';
  openModalBtn.innerHTML = `
    <span class="skill-bar__panel-icon" aria-hidden="true">☸</span>
    <kbd class="skill-bar__panel-key">K</kbd>
    <span id="skill-bar-points-badge" class="skill-bar__points-badge is-hidden">0</span>
  `;
  openModalBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });
  openModalBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModal();
  });
  skillBarEl.appendChild(openModalBtn);
  const pointsBadgeEl = openModalBtn.querySelector('#skill-bar-points-badge');

  playHud.appendChild(skillBarEl);

  // ---------------------------------------------------------------- 2. Mobile Arc Skill Pad
  const mobilePadEl = document.createElement('div');
  mobilePadEl.id = 'mobile-skill-pad';
  mobilePadEl.className = 'mobile-skill-pad is-hidden';
  mobilePadEl.setAttribute('aria-label', 'Combat Skill Pad');

  const mobileSlotEls = new Map();

  // Primary center button: humBolt (basic)
  const basicDef = SKILLS[0];
  const centerBtn = document.createElement('button');
  centerBtn.id = 'btn-mobile-basic';
  centerBtn.type = 'button';
  centerBtn.className = 'arc-btn arc-btn--primary glass-panel';
  centerBtn.dataset.mobileSlot = 'basic';
  centerBtn.dataset.skillId = basicDef.id;
  centerBtn.innerHTML = `
    <div class="arc-btn__cd" aria-hidden="true"></div>
    <span class="arc-btn__glyph" aria-hidden="true">${basicDef.glyph}</span>
    <kbd class="arc-btn__key">${basicDef.keyLabel}</kbd>
  `;
  centerBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    ctx.skills?.cast('basic');
  });
  centerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.detail === 0) ctx.skills?.cast('basic');
  });
  mobilePadEl.appendChild(centerBtn);
  mobileSlotEls.set(basicDef.id, {
    btn: centerBtn,
    cdEl: centerBtn.querySelector('.arc-btn__cd'),
  });

  // Arc satellite buttons around the primary button
  const arcDefs = SKILLS.slice(1); // mantra, skill1..4, ultimate
  arcDefs.forEach((def, idx) => {
    const b = document.createElement('button');
    b.id = `btn-mobile-${def.slot}`;
    b.type = 'button';
    b.className = `arc-btn arc-btn--sat arc-btn--pos-${idx} glass-panel`;
    b.dataset.mobileSlot = def.slot;
    b.dataset.skillId = def.id;
    b.innerHTML = `
      <div class="arc-btn__cd" aria-hidden="true"></div>
      <span class="arc-btn__glyph" aria-hidden="true">${def.glyph}</span>
      <span class="arc-btn__lock" aria-hidden="true">🔒</span>
      ${def.mpCost > 0 ? `<span class="arc-btn__mp">${def.mpCost}</span>` : ''}
      <kbd class="arc-btn__key">${def.keyLabel}</kbd>
    `;
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      ctx.skills?.cast(def.slot);
    });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.detail === 0) ctx.skills?.cast(def.slot);
    });
    mobilePadEl.appendChild(b);
    mobileSlotEls.set(def.id, {
      btn: b,
      cdEl: b.querySelector('.arc-btn__cd'),
    });
  });

  // Small Amrita Potion button (X)
  const potionBtn = document.createElement('button');
  potionBtn.id = 'btn-mobile-potion';
  potionBtn.type = 'button';
  potionBtn.className = 'arc-btn arc-btn--potion glass-panel';
  potionBtn.dataset.mobileAction = 'potion';
  potionBtn.innerHTML = `
    <span class="arc-btn__icon" aria-hidden="true">🏺</span>
    <kbd class="arc-btn__key">X</kbd>
  `;
  potionBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    ctx.input?.trigger('potion');
    ctx.bus?.emit('action:potion');
  });
  mobilePadEl.appendChild(potionBtn);

  playHud.appendChild(mobilePadEl);

  // ---------------------------------------------------------------- 3. Skills Modal Panel (K)
  const modalEl = document.createElement('div');
  modalEl.id = 'skills-modal';
  modalEl.className = 'modal-backdrop skills-modal-backdrop is-hidden';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-labelledby', 'skills-modal-title');
  modalEl.innerHTML = `
    <div class="modal-card skills-modal-card glass-panel">
      <header class="modal-header skills-modal-header">
        <div class="skills-modal-title-wrap">
          <h2 id="skills-modal-title" class="modal-title"></h2>
          <p id="skills-modal-subtitle" class="skills-modal-subtitle"></p>
        </div>
        <div class="skills-modal-actions">
          <div id="skills-points-pill" class="skills-points-pill" data-points="0"></div>
          <button id="btn-skills-respec" type="button" class="btn-secondary skills-respec-btn"></button>
          <button id="btn-skills-close" type="button" class="icon-btn" aria-label="Close">✕</button>
        </div>
      </header>
      <div id="skills-modal-list" class="modal-body skills-modal-list"></div>
    </div>
  `;
  hudRoot.appendChild(modalEl);

  const modalTitleEl = modalEl.querySelector('#skills-modal-title');
  const modalSubtitleEl = modalEl.querySelector('#skills-modal-subtitle');
  const modalPointsPillEl = modalEl.querySelector('#skills-points-pill');
  const respecBtnEl = modalEl.querySelector('#btn-skills-respec');
  const closeBtnEl = modalEl.querySelector('#btn-skills-close');
  const modalListEl = modalEl.querySelector('#skills-modal-list');

  closeBtnEl.addEventListener('click', () => closeModal());
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeModal();
  });
  respecBtnEl.addEventListener('click', () => {
    ctx.skills?.respec();
    renderModal();
  });

  function formatEffectText(def, rankIndex) {
    const mult = Math.round((def.rankScaling?.damageMult?.[rankIndex] ?? 1) * 100);
    const radAdd = def.rankScaling?.radiusAdd?.[rankIndex];
    if (typeof radAdd === 'number' && radAdd > 0) {
      return i18n.t('skills.effectDamageRadius', { mult, radius: radAdd.toFixed(1) });
    }
    return i18n.t('skills.effectDamage', { mult });
  }

  function renderModal() {
    if (!ctx.skills) return;
    const pts = ctx.skills.getPoints();
    const inHub = (state.zone || 'stupa') === 'stupa' || state.zoneType === 'hub';

    modalTitleEl.textContent = i18n.t('skills.title');
    modalSubtitleEl.textContent = i18n.t('skills.subtitle');
    modalPointsPillEl.textContent = i18n.t('skills.points', { points: pts });
    modalPointsPillEl.dataset.points = String(pts);

    respecBtnEl.textContent = i18n.t('skills.respec');
    respecBtnEl.disabled = !inHub;
    respecBtnEl.classList.toggle('is-disabled', !inHub);
    respecBtnEl.title = inHub ? i18n.t('skills.respec') : i18n.t('skills.respecHubHint');

    modalListEl.innerHTML = '';

    const skillsList = ctx.skills.list();
    for (const sk of skillsList) {
      const { def } = sk;
      const row = document.createElement('article');
      row.className = `skill-row ${sk.unlocked ? 'is-unlocked' : 'is-locked'}`;
      row.dataset.skillId = def.id;
      row.dataset.slot = def.slot;

      const curIdx = Math.max(0, Math.min(sk.maxRank - 1, sk.rank - 1));
      const curEffect = formatEffectText(def, curIdx);
      const nextEffect = sk.rank < sk.maxRank
        ? i18n.t('skills.nextEffect', { effect: formatEffectText(def, curIdx + 1) })
        : i18n.t('skills.maxRankReached');

      const mpLabel = def.mpCost > 0
        ? i18n.t('skills.mpCost', { mp: def.mpCost })
        : i18n.t('skills.mpFree');
      const cdLabel = i18n.t('skills.cooldown', { cd: sk.effectiveCooldown.toFixed(2).replace(/\.00$/, '') });

      const canUpgrade = sk.unlocked && pts > 0 && sk.rank < sk.maxRank;
      const unlockHint = i18n.t(def.unlock?.hintKey || 'skills.unlockDefaultHint');

      const enhA = def.enhancements?.a;
      const enhB = def.enhancements?.b;
      const canChooseEnh = sk.unlocked && sk.rank >= 3;

      row.innerHTML = `
        <div class="skill-row__main">
          <div class="skill-row__icon">
            <span class="skill-row__glyph">${def.glyph}</span>
            <kbd class="skill-row__key">${def.keyLabel}</kbd>
          </div>
          <div class="skill-row__info">
            <div class="skill-row__title-line">
              <h3 class="skill-row__name">${i18n.t(def.nameKey)}</h3>
              <span id="skill-rank-${def.id}" class="skill-row__rank" data-rank="${sk.rank}">
                ${sk.unlocked ? i18n.t('skills.rank', { rank: sk.rank, max: sk.maxRank }) : `🔒 ${i18n.t('skills.locked')}`}
              </span>
              <span class="skill-row__meta-chip">${mpLabel}</span>
              <span class="skill-row__meta-chip">${cdLabel}</span>
            </div>
            <p class="skill-row__desc">${i18n.t(def.descKey)}</p>
            ${sk.unlocked ? `
              <div class="skill-row__scaling">
                <span class="skill-row__effect-cur">${i18n.t('skills.currentEffect', { effect: curEffect })}</span>
                <span class="skill-row__effect-next">${nextEffect}</span>
              </div>
            ` : `
              <div class="skill-row__unlock-hint">🔒 ${unlockHint}</div>
            `}
          </div>
          <div class="skill-row__upgrade">
            <button
              type="button"
              class="btn-skill-upgrade ${canUpgrade ? 'is-available' : ''}"
              data-upgrade-skill="${def.id}"
              ${canUpgrade ? '' : 'disabled'}
              aria-label="${i18n.t('skills.upgradeBtn')}"
            >
              <span class="btn-skill-upgrade__plus">+</span>
              <span class="btn-skill-upgrade__label">${i18n.t('skills.upgradeBtn')}</span>
            </button>
          </div>
        </div>
        ${(enhA && enhB) ? `
          <div class="skill-row__enhancements ${canChooseEnh ? 'is-unlocked' : 'is-locked'}">
            <div class="skill-row__enh-header">
              <span>${i18n.t('skills.enhTitle')}</span>
              ${!canChooseEnh ? `<span class="skill-row__enh-lock-hint">${i18n.t('skills.enhLocked')}</span>` : ''}
            </div>
            <div class="skill-row__enh-grid">
              <button
                type="button"
                class="skill-enh-card ${sk.enh === 'a' ? 'is-selected' : ''}"
                data-enh-skill="${def.id}"
                data-enh="a"
                ${canChooseEnh ? '' : 'disabled'}
              >
                <div class="skill-enh-card__head">
                  <span class="skill-enh-card__title">${i18n.t(enhA.nameKey)}</span>
                  <span class="skill-enh-card__badge">${sk.enh === 'a' ? i18n.t('skills.enhSelected') : i18n.t('skills.enhChoose')}</span>
                </div>
                <p class="skill-enh-card__desc">${i18n.t(enhA.descKey)}</p>
              </button>
              <button
                type="button"
                class="skill-enh-card ${sk.enh === 'b' ? 'is-selected' : ''}"
                data-enh-skill="${def.id}"
                data-enh="b"
                ${canChooseEnh ? '' : 'disabled'}
              >
                <div class="skill-enh-card__head">
                  <span class="skill-enh-card__title">${i18n.t(enhB.nameKey)}</span>
                  <span class="skill-enh-card__badge">${sk.enh === 'b' ? i18n.t('skills.enhSelected') : i18n.t('skills.enhChoose')}</span>
                </div>
                <p class="skill-enh-card__desc">${i18n.t(enhB.descKey)}</p>
              </button>
            </div>
          </div>
        ` : ''}
      `;

      const upgBtn = row.querySelector(`[data-upgrade-skill="${def.id}"]`);
      if (upgBtn) {
        upgBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (ctx.skills?.spendPoint(def.id)) {
            renderModal();
          }
        });
      }

      const enhBtns = row.querySelectorAll(`[data-enh-skill="${def.id}"]`);
      enhBtns.forEach((eb) => {
        eb.addEventListener('click', (e) => {
          e.stopPropagation();
          const choice = eb.dataset.enh;
          if (ctx.skills?.chooseEnhancement(def.id, choice)) {
            renderModal();
          }
        });
      });

      modalListEl.appendChild(row);
    }
  }

  function openModal() {
    if (state.mode !== 'play') return false;
    modalOpen = true;
    state.uiOpen = true;
    renderModal();
    modalEl.classList.remove('is-hidden');
    return true;
  }

  function closeModal() {
    if (!modalOpen) return false;
    modalOpen = false;
    state.uiOpen = false;
    modalEl.classList.add('is-hidden');
    return true;
  }

  function toggleModal() {
    if (modalOpen) return closeModal();
    return openModal();
  }

  // Re-render modal when language or skill ranks/points change
  i18n.onChange(() => {
    if (modalOpen) renderModal();
  });
  bus?.on('skill:rank', () => {
    if (modalOpen) renderModal();
  });
  bus?.on('skill:points', () => {
    if (modalOpen) renderModal();
  });
  bus?.on('skill:unlock', () => {
    if (modalOpen) renderModal();
  });
  bus?.on('zone:change', () => {
    if (modalOpen) renderModal();
  });

  // ---------------------------------------------------------------- 4. Per-Frame Update
  function update() {
    const input = ctx.input;
    if (state.mode === 'play' && input) {
      if (input.pressed('skills')) {
        toggleModal();
      } else if (modalOpen && input.pressed('closeUi')) {
        closeModal();
      }
    }

    if (!ctx.skills) return;

    const pts = ctx.skills.getPoints();
    if (pts > 0) {
      pointsBadgeEl.textContent = String(pts);
      pointsBadgeEl.classList.remove('is-hidden');
    } else {
      pointsBadgeEl.classList.add('is-hidden');
    }

    const isCombat = Boolean(ctx.world?.isCombatZone ? ctx.world.isCombatZone() : state.zone !== 'stupa');
    const curMp = state.player?.mp ?? 0;

    // Toggle mobile pad vs Stupa ritual buttons based on zone
    if (isCombat) {
      mobilePadEl.classList.remove('is-hidden');
      if (mobileActions) mobileActions.classList.add('is-combat-hidden');
    } else {
      mobilePadEl.classList.add('is-hidden');
      if (mobileActions) mobileActions.classList.remove('is-combat-hidden');
    }

    for (const def of SKILLS) {
      const sk = ctx.skills.getSkillState(def.id);
      if (!sk) continue;
      const frac = sk.cooldownFraction;
      const deg = Math.round(frac * 360);
      const noMp = sk.unlocked && def.mpCost > 0 && (def.id !== 'mantra' || isCombat) && curMp < def.mpCost;

      // Desktop slot update
      const ui = slotEls.get(def.id);
      if (ui) {
        ui.btn.classList.toggle('is-locked', !sk.unlocked);
        ui.btn.classList.toggle('is-nomp', noMp);
        ui.btn.classList.toggle('is-cooldown', frac > 0.001);
        if (frac > 0.001) {
          ui.cdEl.style.background = `conic-gradient(rgba(10, 6, 18, 0.84) ${deg}deg, transparent ${deg}deg)`;
          ui.cdTextEl.textContent = sk.cooldownRemaining >= 1
            ? Math.ceil(sk.cooldownRemaining).toString()
            : sk.cooldownRemaining.toFixed(1);
        } else {
          ui.cdEl.style.background = 'none';
          ui.cdTextEl.textContent = '';
        }
        if (ui.rankDotsEl) {
          ui.rankDotsEl.textContent = sk.unlocked ? '•'.repeat(sk.rank) : '';
        }
      }

      // Mobile arc button update
      const mob = mobileSlotEls.get(def.id);
      if (mob) {
        mob.btn.classList.toggle('is-locked', !sk.unlocked);
        mob.btn.classList.toggle('is-nomp', noMp);
        mob.btn.classList.toggle('is-cooldown', frac > 0.001);
        if (frac > 0.001) {
          mob.cdEl.style.background = `conic-gradient(rgba(10, 6, 18, 0.84) ${deg}deg, transparent ${deg}deg)`;
        } else {
          mob.cdEl.style.background = 'none';
        }
      }
    }
  }

  const api = {
    update,
    openModal,
    closeModal,
    toggleModal,
    isOpen: () => modalOpen,
    renderModal,
  };

  ctx.skillbar = api;
  return api;
}
