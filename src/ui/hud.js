/**
 * HUD & Title Screen UI — glassmorphic Himalayan interface over the 3D scene.
 *
 * Features:
 *  - Title screen over live 3D intro orbit with language toggle, control hints & Begin button
 *  - Merit panel with SVG circular kora progress ring & smooth animated counters
 *  - Celestial clock (HH:MM + sun/moon/dawn/dusk icon), time-of-day slider & speed controls
 *  - Language switch (zh-Hant / en), mute toggle, HUD visibility toggle (H), Pilgrim's Guide modal
 *  - Context-sensitive bottom interaction prompt pill + toast notification stack
 *  - Touch/mobile action buttons (prostrate, interact, feed)
 *  - Zero per-frame DOM thrash: updates text/attributes only when values change
 */
import { ACHIEVEMENTS } from '../systems/merit.js';

const RING_RADIUS = 24;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function formatClock(t) {
  const totalMinutes = Math.floor(((t % 1) + 1) % 1 * 24 * 60);
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function getDayPhase(t) {
  const u = ((t % 1) + 1) % 1;
  if (u >= 0.21 && u < 0.30) return 'dawn';
  if (u >= 0.30 && u < 0.70) return 'day';
  if (u >= 0.70 && u < 0.80) return 'dusk';
  return 'night';
}

const PHASE_ICONS = {
  day: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/></svg>`,
  dawn: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V3m-4 3 4-3 4 3M2 18h20M5 21h14"/></svg>`,
  dusk: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 3v6m-4-3 4 3 4-3M2 18h20M5 21h14"/></svg>`,
  night: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/></svg>`,
};

export function createHud(ctx) {
  const { state, bus, i18n } = ctx;
  const uiRoot = document.getElementById('ui') || document.body;

  // Build main HUD wrapper without removing existing #joystick
  const root = document.createElement('div');
  root.id = 'hud-root';
  root.className = 'hud-root';
  uiRoot.appendChild(root);

  root.innerHTML = `
    <!-- TITLE OVERLAY -->
    <section id="title-screen" class="title-screen" aria-labelledby="title-heading">
      <div class="title-card glass-panel">
        <div class="title-card__ornament" aria-hidden="true">
          <span class="ornament-line"></span>
          <span class="ornament-lotus">☸</span>
          <span class="ornament-line"></span>
        </div>

        <p id="title-eyebrow" class="title-eyebrow" data-i18n="title.eyebrow"></p>
        <h1 id="title-heading" class="title-heading" data-i18n="title.name"></h1>
        <p id="title-sub" class="title-sub" data-i18n="title.sub"></p>
        <p id="title-desc" class="title-desc" data-i18n="title.desc"></p>

        <div class="title-actions">
          <button id="btn-begin" type="button" class="btn-primary">
            <span class="btn-primary__glow" aria-hidden="true"></span>
            <span id="btn-begin-label" data-i18n="title.begin"></span>
          </button>

          <div class="title-lang" role="group" aria-label="Language">
            <button id="title-lang-zh" type="button" class="lang-pill" data-lang="zh">繁體中文</button>
            <button id="title-lang-en" type="button" class="lang-pill" data-lang="en">English</button>
          </div>
        </div>

        <p id="title-sound-hint" class="title-sound-hint" data-i18n="title.soundHint"></p>

        <div class="title-controls" aria-label="Controls summary">
          <div class="control-chip">
            <kbd>WASD</kbd>
            <span data-i18n="controls.move"></span>
          </div>
          <div class="control-chip">
            <kbd>Shift</kbd>
            <span data-i18n="controls.run"></span>
          </div>
          <div class="control-chip">
            <kbd>Q</kbd>
            <span data-i18n="controls.prostrate"></span>
          </div>
          <div class="control-chip">
            <kbd>E</kbd>
            <span data-i18n="controls.interact"></span>
          </div>
          <div class="control-chip">
            <kbd>F</kbd>
            <span data-i18n="controls.feed"></span>
          </div>
        </div>
      </div>
    </section>

    <!-- PLAY HUD -->
    <div id="play-hud" class="play-hud is-hidden">
      <!-- Top-Left: Stacked Vitals & Merit Panels -->
      <div class="hud-left-stack">
        <!-- Vitals Panel -->
        <aside id="vitals-panel" class="vitals-panel glass-panel" aria-label="Player vitals">
          <div class="vitals-header">
            <div class="vitals-level-wrap">
              <span class="vitals-level-prefix" data-i18n="hud.level">Lv</span>
              <span id="stat-level" class="vitals-level-val">1</span>
            </div>
            <div class="vitals-combat-stats">
              <div class="vitals-stat-chip">
                <span class="vitals-stat-label" data-i18n="hud.atk">ATK</span>
                <span id="stat-atk" class="vitals-stat-val">10</span>
              </div>
              <div class="vitals-stat-chip">
                <span class="vitals-stat-label" data-i18n="hud.def">DEF</span>
                <span id="stat-def" class="vitals-stat-val">0</span>
              </div>
            </div>
          </div>

          <div class="vitals-bars">
            <!-- HP Bar -->
            <div class="vitals-bar-wrap" id="hp-bar-wrap">
              <div class="vitals-bar-track vitals-bar-track--hp">
                <div id="stat-hp-bar" class="vitals-bar-fill vitals-bar-fill--hp" style="width: 100%;"></div>
              </div>
              <div class="vitals-bar-meta">
                <span class="vitals-bar-label" data-i18n="hud.hp">HP</span>
                <span id="stat-hp-text" class="vitals-bar-text">100 / 100</span>
              </div>
              <div id="hp-popup-anchor" class="vitals-popup-anchor"></div>
            </div>

            <!-- MP Bar -->
            <div class="vitals-bar-wrap" id="mp-bar-wrap">
              <div class="vitals-bar-track vitals-bar-track--mp">
                <div id="stat-mp-bar" class="vitals-bar-fill vitals-bar-fill--mp" style="width: 100%;"></div>
              </div>
              <div class="vitals-bar-meta">
                <span class="vitals-bar-label" data-i18n="hud.mp">MP</span>
                <span id="stat-mp-text" class="vitals-bar-text">60 / 60</span>
              </div>
              <div id="mp-popup-anchor" class="vitals-popup-anchor"></div>
            </div>

            <!-- EXP Bar -->
            <div class="vitals-bar-wrap vitals-bar-wrap--exp" id="exp-bar-wrap">
              <div class="vitals-bar-track vitals-bar-track--exp">
                <div id="stat-exp-bar" class="vitals-bar-fill vitals-bar-fill--exp" style="width: 0%;"></div>
              </div>
              <div class="vitals-bar-meta">
                <span class="vitals-bar-label" data-i18n="hud.exp">EXP</span>
                <span id="stat-exp-text" class="vitals-bar-text">0 / 20</span>
              </div>
            </div>
          </div>

          <!-- Reserved buff icon strip for #4 -->
          <div id="vitals-buffs" class="vitals-buffs"></div>
        </aside>

        <!-- Merit & Kora Progress -->
        <aside id="merit-panel" class="merit-panel glass-panel" aria-label="Merit and kora progress">
          <div class="merit-header">
            <div class="kora-ring-wrap" id="kora-ring-wrap">
              <svg class="kora-ring" width="60" height="60" viewBox="0 0 60 60">
                <circle class="kora-ring__track" cx="30" cy="30" r="${RING_RADIUS}" />
                <circle id="kora-ring-fill" class="kora-ring__fill" cx="30" cy="30" r="${RING_RADIUS}"
                  stroke-dasharray="${RING_CIRC.toFixed(2)}"
                  stroke-dashoffset="${RING_CIRC.toFixed(2)}" />
              </svg>
              <div class="kora-ring__center">
                <span id="stat-kora-laps" class="kora-ring__laps">0</span>
                <span class="kora-ring__unit" data-i18n="hud.laps"></span>
              </div>
            </div>

            <div class="merit-summary">
              <div class="merit-summary__label" data-i18n="hud.merit"></div>
              <div id="stat-total-points" class="merit-summary__points">0</div>
              <div id="stat-kora-pct" class="merit-summary__sub"></div>
            </div>
          </div>

          <div class="merit-grid">
            <div class="merit-item" id="merit-item-prostration">
              <span class="merit-item__icon" aria-hidden="true">🙏</span>
              <div class="merit-item__body">
                <span class="merit-item__label" data-i18n="hud.prostrations"></span>
                <span id="stat-prostrations" class="merit-item__value">0</span>
              </div>
            </div>
            <div class="merit-item" id="merit-item-lamps">
              <span class="merit-item__icon" aria-hidden="true">🪔</span>
              <div class="merit-item__body">
                <span class="merit-item__label" data-i18n="hud.lamps"></span>
                <span id="stat-lamps" class="merit-item__value">0</span>
              </div>
            </div>
            <div class="merit-item" id="merit-item-monkeys">
              <span class="merit-item__icon" aria-hidden="true">🐒</span>
              <div class="merit-item__body">
                <span class="merit-item__label" data-i18n="hud.monkeys"></span>
                <span id="stat-monkeys" class="merit-item__value">0</span>
              </div>
            </div>
            <div class="merit-item" id="merit-item-wheels">
              <span class="merit-item__icon" aria-hidden="true">☸</span>
              <div class="merit-item__body">
                <span class="merit-item__label" data-i18n="hud.wheels"></span>
                <span id="stat-wheels" class="merit-item__value">0</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- Top-Right: Celestial Clock, Time Slider & Utility Buttons -->
      <aside id="top-controls" class="top-controls">
        <div class="time-panel glass-panel">
          <div class="time-row">
            <span id="clock-icon" class="clock-icon" aria-hidden="true"></span>
            <span id="clock-display" class="clock-display">07:12</span>
            <span id="clock-phase" class="clock-phase"></span>
            <div class="speed-group" role="group" aria-label="Time speed">
              <button id="btn-speed-0" type="button" class="speed-btn" data-speed="0">⏸</button>
              <button id="btn-speed-1" type="button" class="speed-btn is-active" data-speed="1">1×</button>
              <button id="btn-speed-4" type="button" class="speed-btn" data-speed="4">4×</button>
            </div>
          </div>
          <input id="time-slider" class="time-slider" type="range" min="0" max="1" step="0.002" value="0.3" />
        </div>

        <div class="utility-bar glass-panel">
          <button id="btn-lang-toggle" type="button" class="icon-btn">
            <span id="btn-lang-text" class="icon-btn__text">EN</span>
          </button>
          <button id="btn-mute-toggle" type="button" class="icon-btn" aria-label="Mute">
            <span id="btn-mute-icon"></span>
          </button>
          <button id="btn-help-toggle" type="button" class="icon-btn" aria-label="Guide">
            <span>?</span>
          </button>
          <button id="btn-hud-hide" type="button" class="icon-btn" aria-label="Hide HUD">
            <span>👁</span>
          </button>
        </div>
      </aside>

      <!-- Bottom-Center: Context Interaction Prompt Pill -->
      <div id="interaction-prompt-wrap" class="prompt-wrap">
        <button id="interaction-prompt" type="button" class="prompt-pill glass-panel is-hidden">
          <kbd id="prompt-key" class="prompt-pill__key">E</kbd>
          <span id="prompt-label" class="prompt-pill__label"></span>
        </button>
      </div>

      <!-- Bottom-Right: Mobile / On-Screen Action Buttons -->
      <div id="mobile-actions" class="mobile-actions">
        <button id="btn-mobile-prostrate" type="button" class="action-fab glass-panel">
          <span class="action-fab__icon" aria-hidden="true">🙏</span>
          <span class="action-fab__label" data-i18n="mobile.prostrate"></span>
          <kbd class="action-fab__key">Q</kbd>
        </button>
        <button id="btn-mobile-interact" type="button" class="action-fab glass-panel">
          <span class="action-fab__icon" aria-hidden="true">🪔</span>
          <span class="action-fab__label" data-i18n="mobile.interact"></span>
          <kbd class="action-fab__key">E</kbd>
        </button>
        <button id="btn-mobile-feed" type="button" class="action-fab glass-panel">
          <span class="action-fab__icon" aria-hidden="true">🍌</span>
          <span class="action-fab__label" data-i18n="mobile.feed"></span>
          <kbd class="action-fab__key">F</kbd>
        </button>
      </div>
    </div>

    <!-- Floating button when HUD is hidden -->
    <button id="btn-hud-restore" type="button" class="hud-restore-btn glass-panel is-hidden">
      <span>H</span>
    </button>

    <!-- Toast Notification Stack -->
    <div id="toast-stack" class="toast-stack" aria-live="polite"></div>

    <!-- Pilgrim's Guide & Achievements Modal -->
    <div id="help-modal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
      <div class="modal-card glass-panel">
        <header class="modal-header">
          <h2 id="help-modal-title" class="modal-title" data-i18n="help.title"></h2>
          <button id="btn-help-close" type="button" class="icon-btn" aria-label="Close">✕</button>
        </header>

        <div class="modal-body">
          <section class="modal-section">
            <h3 class="modal-section__title" data-i18n="help.practices"></h3>
            <div class="practice-list">
              <div class="practice-card">
                <div class="practice-card__title">☸ <span data-i18n="help.kora.title"></span></div>
                <p class="practice-card__desc" data-i18n="help.kora.desc"></p>
              </div>
              <div class="practice-card">
                <div class="practice-card__title">🙏 <span data-i18n="help.prostration.title"></span></div>
                <p class="practice-card__desc" data-i18n="help.prostration.desc"></p>
              </div>
              <div class="practice-card">
                <div class="practice-card__title">🪔 <span data-i18n="help.lamp.title"></span></div>
                <p class="practice-card__desc" data-i18n="help.lamp.desc"></p>
              </div>
              <div class="practice-card">
                <div class="practice-card__title">🐒 <span data-i18n="help.monkey.title"></span></div>
                <p class="practice-card__desc" data-i18n="help.monkey.desc"></p>
              </div>
              <div class="practice-card">
                <div class="practice-card__title">📿 <span data-i18n="help.wheel.title"></span></div>
                <p class="practice-card__desc" data-i18n="help.wheel.desc"></p>
              </div>
            </div>
          </section>

          <section class="modal-section">
            <h3 class="modal-section__title" data-i18n="help.controls"></h3>
            <div class="controls-table" id="help-controls-table">
              <div class="controls-row"><span data-i18n="controls.move"></span><kbd>WASD / ↑←↓→</kbd></div>
              <div class="controls-row"><span data-i18n="controls.run"></span><kbd>Shift</kbd></div>
              <div class="controls-row"><span data-i18n="controls.look"></span><kbd data-i18n="keys.drag"></kbd></div>
              <div class="controls-row"><span data-i18n="controls.zoom"></span><kbd data-i18n="keys.wheel"></kbd></div>
              <div class="controls-row"><span data-i18n="controls.prostrate"></span><kbd>Q / 1</kbd></div>
              <div class="controls-row"><span data-i18n="controls.interact"></span><kbd>E</kbd></div>
              <div class="controls-row"><span data-i18n="controls.feed"></span><kbd>F</kbd></div>
              <div class="controls-row"><span data-i18n="controls.pause"></span><kbd>P</kbd></div>
              <div class="controls-row"><span data-i18n="controls.hud"></span><kbd>H</kbd></div>
            </div>
          </section>

          <section class="modal-section">
            <h3 class="modal-section__title" data-i18n="help.achievements"></h3>
            <div id="achievements-grid" class="achievements-grid"></div>
          </section>
        </div>

        <footer class="modal-footer">
          <button id="btn-reset-progress" type="button" class="btn-subtle" data-i18n="help.reset"></button>
          <button id="btn-help-close-bottom" type="button" class="btn-secondary" data-i18n="help.close"></button>
        </footer>
      </div>
    </div>
  `;

  // ---------------------------------------------------------------- element references
  const titleScreen = root.querySelector('#title-screen');
  const playHud = root.querySelector('#play-hud');
  const btnBegin = root.querySelector('#btn-begin');
  const titleLangZh = root.querySelector('#title-lang-zh');
  const titleLangEn = root.querySelector('#title-lang-en');

  const statLevel = root.querySelector('#stat-level');
  const statAtk = root.querySelector('#stat-atk');
  const statDef = root.querySelector('#stat-def');
  const statHpBar = root.querySelector('#stat-hp-bar');
  const statHpText = root.querySelector('#stat-hp-text');
  const hpPopupAnchor = root.querySelector('#hp-popup-anchor');
  const statMpBar = root.querySelector('#stat-mp-bar');
  const statMpText = root.querySelector('#stat-mp-text');
  const mpPopupAnchor = root.querySelector('#mp-popup-anchor');
  const statExpBar = root.querySelector('#stat-exp-bar');
  const statExpText = root.querySelector('#stat-exp-text');
  const vitalsBuffs = root.querySelector('#vitals-buffs');

  const koraRingFill = root.querySelector('#kora-ring-fill');
  const statKoraLaps = root.querySelector('#stat-kora-laps');
  const statTotalPoints = root.querySelector('#stat-total-points');
  const statKoraPct = root.querySelector('#stat-kora-pct');
  const statProstrations = root.querySelector('#stat-prostrations');
  const statLamps = root.querySelector('#stat-lamps');
  const statMonkeys = root.querySelector('#stat-monkeys');
  const statWheels = root.querySelector('#stat-wheels');

  const meritItems = {
    prostration: root.querySelector('#merit-item-prostration'),
    lamp: root.querySelector('#merit-item-lamps'),
    monkey: root.querySelector('#merit-item-monkeys'),
    wheel: root.querySelector('#merit-item-wheels'),
  };

  const clockIcon = root.querySelector('#clock-icon');
  const clockDisplay = root.querySelector('#clock-display');
  const clockPhase = root.querySelector('#clock-phase');
  const timeSlider = root.querySelector('#time-slider');
  const speedBtns = [
    root.querySelector('#btn-speed-0'),
    root.querySelector('#btn-speed-1'),
    root.querySelector('#btn-speed-4'),
  ];

  const btnLangToggle = root.querySelector('#btn-lang-toggle');
  const btnLangText = root.querySelector('#btn-lang-text');
  const btnMuteToggle = root.querySelector('#btn-mute-toggle');
  const btnMuteIcon = root.querySelector('#btn-mute-icon');
  const btnHelpToggle = root.querySelector('#btn-help-toggle');
  const btnHudHide = root.querySelector('#btn-hud-hide');
  const btnHudRestore = root.querySelector('#btn-hud-restore');

  const promptBtn = root.querySelector('#interaction-prompt');
  const promptKey = root.querySelector('#prompt-key');
  const promptLabel = root.querySelector('#prompt-label');

  const btnMobileProstrate = root.querySelector('#btn-mobile-prostrate');
  const btnMobileInteract = root.querySelector('#btn-mobile-interact');
  const btnMobileFeed = root.querySelector('#btn-mobile-feed');

  const toastStack = root.querySelector('#toast-stack');
  const helpModal = root.querySelector('#help-modal');
  const btnHelpClose = root.querySelector('#btn-help-close');
  const btnHelpCloseBottom = root.querySelector('#btn-help-close-bottom');
  const btnResetProgress = root.querySelector('#btn-reset-progress');
  const achievementsGrid = root.querySelector('#achievements-grid');

  // ---------------------------------------------------------------- cached render state (prevent DOM thrash)
  let hudHidden = false;
  let sliderDragging = false;
  let lastSpeedBeforePause = 1;
  let currentPrompt = null;

  const displayedStats = {
    points: 0,
    kora: -1,
    koraPct: -1,
    prostration: -1,
    lamp: -1,
    monkey: -1,
    wheel: -1,
  };
  let targetPoints = 0;
  let lastClockStr = '';
  let lastPhase = '';
  let lastSpeed = -1;
  let lastSliderBucket = -1;
  let lastInteractAvailable = null;
  let lastFeedAvailable = null;

  const activeToasts = [];

  // ---------------------------------------------------------------- localization
  function renderAchievementsModal() {
    const unlockedSet = new Set(ctx.merit?.getStats()?.achievements || []);
    achievementsGrid.innerHTML = ACHIEVEMENTS.map((a) => {
      const unlocked = unlockedSet.has(a.id);
      const title = i18n.t(`ach.${a.id}`);
      const desc = i18n.t(`ach.${a.id}.desc`);
      const badge = unlocked ? '✦' : '○';
      return `
        <div class="ach-card ${unlocked ? 'is-unlocked' : 'is-locked'}">
          <div class="ach-card__badge" aria-hidden="true">${badge}</div>
          <div class="ach-card__content">
            <div class="ach-card__title">${title}</div>
            <div class="ach-card__desc">${desc}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderMuteButton() {
    const isMuted = ctx.audio?.isMuted() ?? false;
    btnMuteIcon.innerHTML = isMuted
      ? `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="m22 9-6 6m0-6 6 6"/></svg>`
      : `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
    const label = i18n.t(isMuted ? 'hud.unmute' : 'hud.mute');
    btnMuteToggle.title = label;
    btnMuteToggle.setAttribute('aria-label', label);
  }

  function applyTranslations() {
    const nodes = root.querySelectorAll('[data-i18n]');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = i18n.t(key);
    }

    titleLangZh.classList.toggle('is-active', i18n.lang === 'zh');
    titleLangEn.classList.toggle('is-active', i18n.lang === 'en');
    btnLangText.textContent = i18n.lang === 'zh' ? 'EN' : '中';
    btnLangToggle.title = i18n.t('hud.lang');
    btnHelpToggle.title = i18n.t('hud.help');
    btnHudHide.title = i18n.t('hud.hide');
    timeSlider.title = i18n.t('hud.timeSlider');
    timeSlider.setAttribute('aria-label', i18n.t('hud.timeSlider'));
    speedBtns[0].title = i18n.t('hud.speedPause');
    speedBtns[1].title = i18n.t('hud.speed1');
    speedBtns[2].title = i18n.t('hud.speed4');

    // Force refresh dynamic localized labels
    lastPhase = '';
    displayedStats.koraPct = -1;
    if (currentPrompt) {
      promptLabel.textContent = i18n.t(currentPrompt.labelKey);
    }

    // Re-localize active toasts
    for (let i = 0; i < activeToasts.length; i++) {
      const item = activeToasts[i];
      item.textEl.textContent = i18n.t(item.key, item.params);
    }

    renderMuteButton();
    renderAchievementsModal();
  }

  i18n.onChange(applyTranslations);
  bus.on('audio:change', renderMuteButton);

  // ---------------------------------------------------------------- toasts
  function showToast(payload) {
    if (!payload || !payload.key) return;
    const el = document.createElement('div');
    const kind = payload.kind || 'info';
    el.className = `toast-item glass-panel toast-item--${kind}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-item__icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = kind === 'achievement' ? '✦' : kind === 'warning' ? '↺' : '☸';

    const textEl = document.createElement('span');
    textEl.className = 'toast-item__text';
    textEl.textContent = i18n.t(payload.key, payload.params);

    el.append(iconSpan, textEl);
    toastStack.appendChild(el);

    // Cap visible toast count
    while (activeToasts.length >= 4) {
      const oldest = activeToasts.shift();
      oldest.el.remove();
    }

    const entry = { el, textEl, key: payload.key, params: payload.params };
    activeToasts.push(entry);

    requestAnimationFrame(() => el.classList.add('is-visible'));

    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => {
        const idx = activeToasts.indexOf(entry);
        if (idx !== -1) activeToasts.splice(idx, 1);
        el.remove();
      }, 360);
    }, 3800);
  }

  bus.on('toast', showToast);

  // ---------------------------------------------------------------- interaction prompt
  bus.on('prompt', (payload) => {
    currentPrompt = payload;
    if (!payload) {
      promptBtn.classList.add('is-hidden');
    } else {
      promptKey.textContent = payload.keyHint || 'E';
      promptLabel.textContent = i18n.t(payload.labelKey);
      promptBtn.classList.remove('is-hidden');
    }
  });

  promptBtn.addEventListener('click', () => {
    if (currentPrompt && ctx.input) {
      ctx.input.trigger(currentPrompt.action || 'interact');
    }
  });

  // ---------------------------------------------------------------- event handlers
  btnBegin.addEventListener('click', () => {
    bus.emit('game:start');
  });

  bus.on('game:start', () => {
    titleScreen.classList.add('is-hidden');
    playHud.classList.remove('is-hidden');
    showToast({ key: 'toast.welcome', kind: 'info' });
  });

  titleLangZh.addEventListener('click', () => i18n.setLang('zh'));
  titleLangEn.addEventListener('click', () => i18n.setLang('en'));
  btnLangToggle.addEventListener('click', () => {
    i18n.setLang(i18n.lang === 'zh' ? 'en' : 'zh');
  });

  btnMuteToggle.addEventListener('click', () => {
    ctx.audio?.toggleMute();
  });

  function setHudHidden(next) {
    hudHidden = Boolean(next);
    playHud.classList.toggle('is-hud-minimized', hudHidden);
    btnHudRestore.classList.toggle('is-hidden', !hudHidden);
    if (hudHidden) {
      showToast({ key: 'toast.hudHidden', kind: 'info' });
    }
  }

  btnHudHide.addEventListener('click', () => setHudHidden(true));
  btnHudRestore.addEventListener('click', () => setHudHidden(false));

  function openHelp(open) {
    helpModal.classList.toggle('is-hidden', !open);
    if (open) renderAchievementsModal();
  }
  btnHelpToggle.addEventListener('click', () => openHelp(helpModal.classList.contains('is-hidden')));
  btnHelpClose.addEventListener('click', () => openHelp(false));
  btnHelpCloseBottom.addEventListener('click', () => openHelp(false));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) openHelp(false);
  });

  btnResetProgress.addEventListener('click', () => {
    if (window.confirm(i18n.t('help.resetConfirm'))) {
      ctx.merit?.reset();
      displayedStats.points = 0;
      targetPoints = 0;
      statTotalPoints.textContent = '0';
      renderAchievementsModal();
    }
  });

  // Time controls
  timeSlider.addEventListener('pointerdown', () => { sliderDragging = true; });
  window.addEventListener('pointerup', () => { sliderDragging = false; });
  timeSlider.addEventListener('input', () => {
    state.time.t = parseFloat(timeSlider.value) % 1;
  });

  function setTimeSpeed(spd, announce = false) {
    if (spd > 0) lastSpeedBeforePause = spd;
    state.time.speed = spd;
    if (announce) {
      showToast({ key: spd === 0 ? 'toast.timePaused' : 'toast.timeResumed' });
    }
  }

  for (const btn of speedBtns) {
    btn.addEventListener('click', () => {
      const spd = Number(btn.getAttribute('data-speed'));
      setTimeSpeed(spd, false);
    });
  }

  // Mobile / on-screen action buttons
  btnMobileProstrate.addEventListener('click', () => ctx.input?.trigger('prostrate'));
  btnMobileInteract.addEventListener('click', () => ctx.input?.trigger('interact'));
  btnMobileFeed.addEventListener('click', () => ctx.input?.trigger('feed'));

  // Pulse animation on merit counter cards
  function pulseElement(el) {
    if (!el) return;
    el.classList.remove('is-pulsing');
    void el.offsetWidth;
    el.classList.add('is-pulsing');
  }

  bus.on('merit', (payload) => {
    const type = payload?.type;
    if (type === 'kora') {
      pulseElement(root.querySelector('#kora-ring-wrap'));
    } else if (type && meritItems[type]) {
      pulseElement(meritItems[type]);
    }
  });

  bus.on('achievement', () => {
    if (!helpModal.classList.contains('is-hidden')) {
      renderAchievementsModal();
    }
  });

  // ---------------------------------------------------------------- vitals & floating popups
  function spawnVitalsPopup(type, delta) {
    const anchor = type === 'hp' ? hpPopupAnchor : mpPopupAnchor;
    if (!anchor) return;
    const el = document.createElement('div');
    const isPos = delta > 0;
    const sign = isPos ? '+' : '';
    const kind = type === 'hp'
      ? (isPos ? 'vitals-popup--heal' : 'vitals-popup--damage')
      : (isPos ? 'vitals-popup--mp-gain' : 'vitals-popup--mp-spend');
    el.className = `vitals-popup ${kind}`;
    el.textContent = `${sign}${delta}`;
    anchor.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 950);
  }

  function renderBuffs(buffs) {
    if (!vitalsBuffs) return;
    if (!buffs || buffs.length === 0) {
      vitalsBuffs.innerHTML = '';
      vitalsBuffs.style.display = 'none';
      return;
    }
    vitalsBuffs.style.display = 'flex';
    vitalsBuffs.innerHTML = buffs.map((b) => `
      <div class="vitals-buff-chip" title="${b.id || ''}">
        <span class="vitals-buff-icon">✦</span>
        <span class="vitals-buff-time">${Math.ceil(b.remaining || 0)}s</span>
      </div>
    `).join('');
  }

  function updateVitals(payload) {
    if (!payload) return;
    const { hp, maxHp, mp, maxMp, exp, maxExp, level, atk, def, buffs, deltaHp, deltaMp } = payload;

    if (statLevel && level != null) statLevel.textContent = String(level);
    if (statAtk && atk != null) statAtk.textContent = String(atk);
    if (statDef && def != null) statDef.textContent = String(def);

    if (statHpBar && maxHp > 0 && hp != null) {
      const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
      statHpBar.style.width = `${pct}%`;
    }
    if (statHpText && hp != null && maxHp != null) {
      statHpText.textContent = `${hp} / ${maxHp}`;
    }

    if (statMpBar && maxMp > 0 && mp != null) {
      const pct = Math.max(0, Math.min(100, (mp / maxMp) * 100));
      statMpBar.style.width = `${pct}%`;
    }
    if (statMpText && mp != null && maxMp != null) {
      statMpText.textContent = `${mp} / ${maxMp}`;
    }

    if (statExpBar && maxExp > 0 && exp != null) {
      const pct = Math.max(0, Math.min(100, (exp / maxExp) * 100));
      statExpBar.style.width = `${pct}%`;
    }
    if (statExpText && exp != null && maxExp != null) {
      statExpText.textContent = `${exp} / ${maxExp}`;
    }

    if (buffs) {
      renderBuffs(buffs);
    }

    if (deltaHp && deltaHp !== 0) {
      spawnVitalsPopup('hp', deltaHp);
    }
    if (deltaMp && deltaMp !== 0) {
      spawnVitalsPopup('mp', deltaMp);
    }
  }

  bus.on('vitals:changed', (payload) => {
    updateVitals(payload);
  });

  if (ctx.vitals?.getStats) {
    updateVitals(ctx.vitals.getStats());
  }

  // Initial translation pass
  applyTranslations();

  // ---------------------------------------------------------------- per-frame update
  function update(dt) {
    const input = ctx.input;
    if (state.mode === 'play' && input) {
      if (input.pressed('toggleHud')) {
        setHudHidden(!hudHidden);
      }
      if (input.pressed('pause')) {
        const nextSpeed = state.time.speed === 0 ? (lastSpeedBeforePause || 1) : 0;
        setTimeSpeed(nextSpeed, true);
      }
    }

    // 1. Update merit counters only when changed
    const stats = ctx.merit?.getStats();
    if (stats) {
      targetPoints = stats.points;
      if (displayedStats.points !== targetPoints) {
        const diff = targetPoints - displayedStats.points;
        const step = Math.max(1, Math.ceil(Math.abs(diff) * Math.min(1, dt * 14)));
        if (Math.abs(diff) <= step) displayedStats.points = targetPoints;
        else displayedStats.points += Math.sign(diff) * step;
        statTotalPoints.textContent = String(displayedStats.points);
      }

      if (displayedStats.kora !== stats.kora) {
        displayedStats.kora = stats.kora;
        statKoraLaps.textContent = String(stats.kora);
      }

      const pct = Math.round((stats.koraFraction || 0) * 100);
      if (displayedStats.koraPct !== pct) {
        displayedStats.koraPct = pct;
        const offset = RING_CIRC * (1 - (stats.koraFraction || 0));
        koraRingFill.setAttribute('stroke-dashoffset', offset.toFixed(2));
        statKoraPct.textContent = i18n.t('hud.koraProgress', { pct });
      }

      if (displayedStats.prostration !== stats.prostration) {
        displayedStats.prostration = stats.prostration;
        statProstrations.textContent = String(stats.prostration);
      }
      if (displayedStats.lamp !== stats.lamp) {
        displayedStats.lamp = stats.lamp;
        statLamps.textContent = String(stats.lamp);
      }
      if (displayedStats.monkey !== stats.monkey) {
        displayedStats.monkey = stats.monkey;
        statMonkeys.textContent = String(stats.monkey);
      }
      if (displayedStats.wheel !== stats.wheel) {
        displayedStats.wheel = stats.wheel;
        statWheels.textContent = String(stats.wheel);
      }
    }

    // 2. Update clock & celestial icon only when minute or phase changes
    const t = state.time.t;
    const clockStr = formatClock(t);
    if (clockStr !== lastClockStr) {
      lastClockStr = clockStr;
      clockDisplay.textContent = clockStr;
    }

    const phase = getDayPhase(t);
    if (phase !== lastPhase) {
      lastPhase = phase;
      clockIcon.innerHTML = PHASE_ICONS[phase] || PHASE_ICONS.day;
      clockPhase.textContent = i18n.t(`hud.${phase}`);
    }

    const sliderBucket = Math.round(t * 500);
    if (!sliderDragging && sliderBucket !== lastSliderBucket) {
      lastSliderBucket = sliderBucket;
      timeSlider.value = String(t.toFixed(3));
    }

    if (state.time.speed !== lastSpeed) {
      lastSpeed = state.time.speed;
      for (const btn of speedBtns) {
        const s = Number(btn.getAttribute('data-speed'));
        btn.classList.toggle('is-active', s === lastSpeed);
      }
    }

    // 3. Highlight mobile interact / feed buttons when a matching target is in range
    const target = state.interactionTarget;
    const canInteract = Boolean(target && target.action === 'interact');
    const canFeed = Boolean(target && target.action === 'feed');
    if (canInteract !== lastInteractAvailable) {
      lastInteractAvailable = canInteract;
      btnMobileInteract.classList.toggle('is-ready', canInteract);
    }
    if (canFeed !== lastFeedAvailable) {
      lastFeedAvailable = canFeed;
      btnMobileFeed.classList.toggle('is-ready', canFeed);
    }
  }

  return {
    update,
  };
}
