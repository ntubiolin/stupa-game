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
import { Vector3 } from 'three';
import { ACHIEVEMENTS } from '../systems/merit.js';
import { isJapanMap } from '../data/japan.js';
import '../i18n/japanMaps.js';
import '../i18n/elites.js';
import '../i18n/stupaBuild.js';

const JAPAN_SKILL_HELP_KEYS = {
  'controls.basic': 'skill.japan.sankosho.name',
  'controls.chant': 'skill.japan.komyoShingon.name',
  'mobile.chant': 'skill.japan.komyoShingon.name',
  'help.mantra.title': 'skill.japan.komyoShingon.name',
  'help.mantra.desc': 'skill.japan.komyoShingon.desc',
};

const RING_RADIUS = 24;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;
const CHANT_RING_RADIUS = 30;
const CHANT_RING_CIRC = 2 * Math.PI * CHANT_RING_RADIUS;

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
            <kbd>Space</kbd>
            <span data-i18n="controls.basic"></span>
          </div>
          <div class="control-chip">
            <kbd>Z</kbd>
            <span data-i18n="controls.jump"></span>
          </div>
          <div class="control-chip">
            <kbd>R</kbd>
            <span data-i18n="controls.chant"></span>
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
    <div id="play-hud" class="play-hud is-hidden" inert>
      <!-- Top-Center: Boss Health Bar -->
      <section id="boss-bar" class="boss-bar glass-panel is-hidden" aria-label="Boss health">
        <div class="boss-bar__header">
          <div class="boss-bar__titles">
            <span id="boss-bar-name" class="boss-bar__name"></span>
            <span id="boss-bar-title" class="boss-bar__title"></span>
          </div>
          <span id="boss-bar-phase" class="boss-bar__phase"></span>
        </div>
        <div class="boss-bar__track" id="boss-bar-track">
          <div id="boss-bar-fill" class="boss-bar__fill" style="width: 100%;"></div>
          <div id="boss-bar-ticks" class="boss-bar__ticks"></div>
          <span id="boss-bar-hp-text" class="boss-bar__hp-text"></span>
        </div>
      </section>

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
              <div class="vitals-stat-chip vitals-stat-chip--turquoise" id="hud-turquoise-chip" title="Turquoise">
                <span class="vitals-stat-icon" aria-hidden="true">💎</span>
                <span id="stat-turquoise" class="vitals-stat-val">0</span>
              </div>
            </div>
          </div>

          <div class="vitals-bars">
            <!-- HP Bar -->
            <div class="vitals-bar-wrap" id="hp-bar-wrap">
              <div class="vitals-bar-row">
                <div class="vitals-bar-track vitals-bar-track--hp">
                  <div id="stat-hp-bar" class="vitals-bar-fill vitals-bar-fill--hp" style="width: 100%;"></div>
                  <div id="stat-shield-bar" class="vitals-bar-fill vitals-bar-fill--shield" style="width: 0%;"></div>
                </div>
                <div id="potion-pips" class="potion-pips" aria-label="Amrita Pills">
                  <span class="potion-pip is-filled" data-pip="0"></span>
                  <span class="potion-pip is-filled" data-pip="1"></span>
                  <span class="potion-pip is-filled" data-pip="2"></span>
                  <span class="potion-pip is-filled" data-pip="3"></span>
                </div>
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
                <div id="stat-exp-fill" class="vitals-bar-fill vitals-bar-fill--exp" style="width: 0%;"></div>
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
            <span class="merit-toggle-chevron" aria-hidden="true">▾</span>
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
            <span class="time-toggle-chevron" aria-hidden="true">▾</span>
            <div class="speed-group" role="group" aria-label="Time speed">
              <button id="btn-speed-0" type="button" class="speed-btn" data-speed="0">⏸</button>
              <button id="btn-speed-1" type="button" class="speed-btn is-active" data-speed="1">1×</button>
              <button id="btn-speed-4" type="button" class="speed-btn" data-speed="4">4×</button>
            </div>
          </div>
          <input id="time-slider" class="time-slider" type="range" min="0" max="1" step="0.002" value="0.3" />
          <div class="season-group" role="group" aria-label="Season">
            <button id="btn-season-spring" type="button" class="season-btn is-active" data-season="spring">
              <span class="season-btn__icon" aria-hidden="true">🌸</span>
              <span class="season-btn__label" data-i18n="hud.seasonShort.spring"></span>
            </button>
            <button id="btn-season-summer" type="button" class="season-btn" data-season="summer">
              <span class="season-btn__icon" aria-hidden="true">🌿</span>
              <span class="season-btn__label" data-i18n="hud.seasonShort.summer"></span>
            </button>
            <button id="btn-season-autumn" type="button" class="season-btn" data-season="autumn">
              <span class="season-btn__icon" aria-hidden="true">🍁</span>
              <span class="season-btn__label" data-i18n="hud.seasonShort.autumn"></span>
            </button>
            <button id="btn-season-winter" type="button" class="season-btn" data-season="winter">
              <span class="season-btn__icon" aria-hidden="true">❄️</span>
              <span class="season-btn__label" data-i18n="hud.seasonShort.winter"></span>
            </button>
          </div>
        </div>

        <div class="utility-bar glass-panel">
          <button id="btn-inventory-toggle" type="button" class="icon-btn" aria-label="Inventory" title="Inventory (I)">
            <span>🎒</span>
          </button>
          <button id="btn-lang-toggle" type="button" class="icon-btn">
            <span id="btn-lang-text" class="icon-btn__text">EN</span>
          </button>
          <button id="btn-mute-toggle" type="button" class="icon-btn" aria-label="Mute">
            <span id="btn-mute-icon"></span>
          </button>
          <button id="btn-music-toggle" type="button" class="icon-btn" aria-label="Music">
            <span id="btn-music-icon"></span>
          </button>
          <button id="btn-help-toggle" type="button" class="icon-btn" aria-label="Guide">
            <span>?</span>
          </button>
          <button id="btn-debug-toggle" type="button" class="icon-btn" aria-label="Debug / 跳關" title="Debug Mode / 跳關">
            <span>🔑</span>
          </button>
          <button id="btn-hud-hide" type="button" class="icon-btn" aria-label="Hide HUD">
            <span>👁</span>
          </button>
          <button id="btn-utility-more" type="button" class="icon-btn utility-more-btn" aria-label="More tools" title="More">
            <span>⋯</span>
          </button>
        </div>

        <!-- Japanese Yamato-e Vertical Calligraphy Scroll Badge (和風縦書き地名巻物・朱印) -->
        <div id="japan-emaki-scroll" class="japan-emaki-scroll is-hidden" aria-hidden="true">
          <div class="japan-emaki-scroll__rod japan-emaki-scroll__rod--top"></div>
          <div class="japan-emaki-scroll__paper">
            <span id="japan-emaki-seal" class="japan-emaki-scroll__seal">空海</span>
            <span id="japan-emaki-title" class="japan-emaki-scroll__title">平安京・東寺</span>
            <span id="japan-emaki-sub" class="japan-emaki-scroll__sub">春・不二櫻花吹雪</span>
          </div>
          <div class="japan-emaki-scroll__rod japan-emaki-scroll__rod--bottom"></div>
        </div>
      </aside>

      <!-- Bottom-Center: Context Interaction Prompt Pill -->
      <div id="interaction-prompt-wrap" class="prompt-wrap">
        <button id="interaction-prompt" type="button" class="prompt-pill glass-panel is-hidden">
          <kbd id="prompt-key" class="prompt-pill__key">E</kbd>
          <span id="prompt-label" class="prompt-pill__label"></span>
        </button>
        <button id="interaction-prompt-secondary" type="button" class="prompt-pill prompt-pill--secondary glass-panel is-hidden">
          <kbd id="prompt-secondary-key" class="prompt-pill__key">F</kbd>
          <span id="prompt-secondary-label" class="prompt-pill__label"></span>
        </button>
      </div>

      <!-- Bottom-Right: Mobile / On-Screen Action Buttons -->
      <div id="mobile-actions" class="mobile-actions">
        <button id="btn-chant" data-action="chant" type="button" class="action-fab action-fab--chant glass-panel">
          <svg class="cooldown-ring" width="68" height="68" viewBox="0 0 68 68">
            <circle class="cooldown-ring__track" cx="34" cy="34" r="${CHANT_RING_RADIUS}" />
            <circle id="chant-cooldown-fill" class="cooldown-ring__fill" cx="34" cy="34" r="${CHANT_RING_RADIUS}"
              stroke-dasharray="${CHANT_RING_CIRC.toFixed(2)}"
              stroke-dashoffset="${CHANT_RING_CIRC.toFixed(2)}" />
          </svg>
          <span class="action-fab__syllable" aria-hidden="true">ཨོཾ</span>
          <span class="action-fab__label" data-i18n="mobile.chant"></span>
          <kbd class="action-fab__key">R</kbd>
        </button>
        <button id="btn-mobile-prostrate" data-action="prostrate" type="button" class="action-fab glass-panel">
          <span class="action-fab__icon" aria-hidden="true">🙏</span>
          <span class="action-fab__label" data-i18n="mobile.prostrate"></span>
          <kbd class="action-fab__key">Q</kbd>
        </button>
        <button id="btn-mobile-interact" data-action="interact" type="button" class="action-fab glass-panel">
          <span class="action-fab__icon" aria-hidden="true">🪔</span>
          <span class="action-fab__label" data-i18n="mobile.interact"></span>
          <kbd class="action-fab__key">E</kbd>
        </button>
        <button id="btn-mobile-feed" data-action="feed" type="button" class="action-fab glass-panel">
          <span class="action-fab__icon" aria-hidden="true">🍌</span>
          <span class="action-fab__label" data-i18n="mobile.feed"></span>
          <kbd class="action-fab__key">F</kbd>
        </button>
        <button id="btn-mobile-potion" data-action="potion" type="button" class="action-fab action-fab--potion glass-panel">
          <span class="action-fab__icon" aria-hidden="true">💊</span>
          <span class="action-fab__label" data-i18n="mobile.potion"></span>
          <span id="mobile-potion-count" class="action-fab__badge">4</span>
          <kbd class="action-fab__key">X</kbd>
        </button>
        <button id="btn-mobile-jump" data-action="jump" type="button" class="action-fab glass-panel">
          <span class="action-fab__icon" aria-hidden="true">⏫</span>
          <span class="action-fab__label" data-i18n="mobile.jump"></span>
          <kbd class="action-fab__key">Z</kbd>
        </button>
      </div>
    </div>

    <!-- Floating button when HUD is hidden -->
    <button id="btn-hud-restore" type="button" class="hud-restore-btn glass-panel is-hidden">
      <span>H</span>
    </button>

    <!-- Red Damage Vignette Overlay -->
    <div id="damage-vignette" class="damage-vignette" aria-hidden="true"></div>

    <!-- 3D Overlays: Enemy Overhead Health Bars & Floating Damage Numbers -->
    <div id="enemy-health-bars" class="enemy-health-bars" aria-hidden="true"></div>
    <div id="damage-numbers" class="damage-numbers" aria-hidden="true"></div>

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
              <div class="practice-card">
                <div class="practice-card__title">✨ <span data-i18n="help.mantra.title"></span></div>
                <p class="practice-card__desc" data-i18n="help.mantra.desc"></p>
              </div>
              <div class="practice-card">
                <div class="practice-card__title">⛩️ <span data-i18n="help.gate.title"></span></div>
                <p class="practice-card__desc" data-i18n="help.gate.desc"></p>
              </div>
              <div class="practice-card">
                <div class="practice-card__title">🪨 <span data-i18n="help.mani.title"></span></div>
                <p class="practice-card__desc" data-i18n="help.mani.desc"></p>
              </div>
              <div class="practice-card">
                <div class="practice-card__title">📿 <span data-i18n="help.items.title"></span></div>
                <p class="practice-card__desc" data-i18n="help.items.desc"></p>
              </div>
            </div>
          </section>

          <section class="modal-section">
            <h3 class="modal-section__title" data-i18n="help.controls"></h3>
            <div class="controls-table" id="help-controls-table">
              <div class="controls-row"><span data-i18n="controls.move"></span><kbd>WASD / ↑←↓→</kbd></div>
              <div class="controls-row"><span data-i18n="controls.run"></span><kbd>Shift</kbd></div>
              <div class="controls-row"><span data-i18n="controls.basic"></span><kbd>Space</kbd></div>
              <div class="controls-row"><span data-i18n="controls.jump"></span><kbd>Z</kbd></div>
              <div class="controls-row"><span data-i18n="controls.chant"></span><kbd>R</kbd></div>
              <div class="controls-row"><span data-i18n="controls.skills"></span><kbd>K</kbd></div>
              <div class="controls-row"><span data-i18n="controls.look"></span><kbd data-i18n="keys.drag"></kbd></div>
              <div class="controls-row"><span data-i18n="controls.zoom"></span><kbd data-i18n="keys.wheel"></kbd></div>
              <div class="controls-row"><span data-i18n="controls.prostrate"></span><kbd>Q</kbd></div>
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

    <!-- Debug & Chapter Skip Modal (Unlocked with password amitabha) -->
    <div id="debug-modal" class="modal-backdrop is-hidden" role="dialog" aria-modal="true" aria-labelledby="debug-modal-title">
      <div class="modal-card glass-panel debug-modal-card">
        <header class="modal-header">
          <h2 id="debug-modal-title" class="modal-title">🔑 密續除錯與跳關模式 (Debug Mode)</h2>
          <button id="btn-debug-close" type="button" class="icon-btn" aria-label="Close">✕</button>
        </header>

        <div class="modal-body">
          <!-- Locked Password View -->
          <section id="debug-lock-view" class="modal-section debug-lock-section">
            <p class="debug-lock-desc">請輸入解鎖密語以開啟「章節跳關」與「除錯工具」面板：</p>
            <div class="debug-password-row">
              <input
                id="debug-password-input"
                type="password"
                class="debug-password-input"
                placeholder="請輸入密語..."
                autocomplete="off"
                spellcheck="false"
              />
              <button id="btn-debug-unlock" type="button" class="btn-primary debug-unlock-btn">
                <span>解鎖 / Unlock</span>
              </button>
            </div>
            <p id="debug-password-error" class="debug-password-error is-hidden">密語不正確，請重新輸入。</p>
          </section>

          <!-- Unlocked Chapter Skip & Debug Tools View -->
          <div id="debug-panel-view" class="is-hidden">
            <section class="modal-section">
              <h3 class="modal-section__title">☸ 選擇章節跳關 (Chapter Skip)</h3>
              <p class="debug-panel-sub">點擊任一章節即可自動配發該章等級、技能與全套裝備並直接傳送前往：</p>
              <div class="debug-chapter-grid">
                <button type="button" class="debug-chapter-btn" data-skip-chapter="stupa">
                  <span class="debug-chapter-btn__tag">序章 · Hub</span>
                  <span class="debug-chapter-btn__title">博達哈大佛塔</span>
                  <span class="debug-chapter-btn__desc">回到加德滿都大佛塔主城</span>
                </button>
                <button type="button" class="debug-chapter-btn" data-skip-chapter="ch1">
                  <span class="debug-chapter-btn__tag">Chapter 1 · Lv.1+</span>
                  <span class="debug-chapter-btn__title">第一章・帕平與揚列雪</span>
                  <span class="debug-chapter-btn__desc">迎請蓮師・修持普巴金剛</span>
                </button>
                <button type="button" class="debug-chapter-btn" data-skip-chapter="ch2">
                  <span class="debug-chapter-btn__tag">Chapter 2 · Lv.8+</span>
                  <span class="debug-chapter-btn__title">第二章・芒域山口與十二丹瑪</span>
                  <span class="debug-chapter-btn__desc">暴風雪山口・調伏十二丹瑪女神</span>
                </button>
                <button type="button" class="debug-chapter-btn" data-skip-chapter="ch3">
                  <span class="debug-chapter-btn__tag">Chapter 3 · Lv.15+</span>
                  <span class="debug-chapter-btn__title">第三章・雅隆河谷與雅拉香波</span>
                  <span class="debug-chapter-btn__desc">雍布拉康・謝札水晶洞・雅拉香波雪山</span>
                </button>
                <button type="button" class="debug-chapter-btn" data-skip-chapter="ch4">
                  <span class="debug-chapter-btn__tag">Chapter 4 · Lv.22+</span>
                  <span class="debug-chapter-btn__title">第四章・桑耶寺與海波日山</span>
                  <span class="debug-chapter-btn__desc">晝建夜毀・海波日山金剛舞・白哈爾王</span>
                </button>
                <button type="button" class="debug-chapter-btn" data-skip-chapter="ch5">
                  <span class="debug-chapter-btn__tag">Chapter 5 · Lv.28+</span>
                  <span class="debug-chapter-btn__title">第五章・青朴聖地與伏藏界</span>
                  <span class="debug-chapter-btn__desc">益西措嘉・無盡伏藏秘境・終章圓滿</span>
                </button>
                <button type="button" class="debug-chapter-btn" data-skip-chapter="toji">
                  <span class="debug-chapter-btn__tag">🇯🇵 空海大師篇 · 京都</span>
                  <span class="debug-chapter-btn__title">京都東寺・教王護國寺</span>
                  <span class="debug-chapter-btn__desc">五重塔・金堂藥師三尊・講堂二十一尊立體曼荼羅</span>
                </button>
                <button type="button" class="debug-chapter-btn" data-skip-chapter="koyasan">
                  <span class="debug-chapter-btn__tag">🇯🇵 空海大師篇 · 高野山</span>
                  <span class="debug-chapter-btn__title">高野山・金剛峯寺</span>
                  <span class="debug-chapter-btn__desc">壇上伽藍根本大塔・蟠龍庭・奧之院萬燈籠堂</span>
                </button>
              </div>
            </section>

            <section class="modal-section">
              <h3 class="modal-section__title">🛠️ 快捷除錯工具 (Quick Tools)</h3>
              <div class="debug-tools-row">
                <button type="button" class="btn-secondary debug-tool-btn" data-debug-action="heal">❤️ 狀態全滿 (HP/MP/甘露)</button>
                <button type="button" class="btn-secondary debug-tool-btn" data-debug-action="god" id="btn-debug-god">🛡️ 無敵模式：關閉</button>
                <button type="button" class="btn-secondary debug-tool-btn" data-debug-action="turquoise">💎 +500 綠松石</button>
                <button type="button" class="btn-secondary debug-tool-btn" data-debug-action="levelup">⬆️ +3000 經驗值</button>
                <button type="button" class="btn-secondary debug-tool-btn" data-debug-action="step">✅ 完成當前任務步驟</button>
              </div>
            </section>
          </div>
        </div>

        <footer class="modal-footer">
          <span class="debug-footer-hint">Console API: <code>window.__stupa</code></span>
          <button id="btn-debug-close-bottom" type="button" class="btn-secondary" data-i18n="help.close">關閉</button>
        </footer>
      </div>
    </div>

    <!-- LEVEL UP BANNER -->
    <div id="levelup-banner" class="levelup-banner is-hidden" aria-live="polite">
      <div class="levelup-burst" aria-hidden="true"></div>
      <div class="levelup-card glass-panel">
        <div class="levelup-crown" aria-hidden="true">☸</div>
        <div class="levelup-title" id="levelup-title"></div>
        <div class="levelup-stats" id="levelup-stats"></div>
      </div>
    </div>

    <!-- FAINT OVERLAY -->
    <div id="faint-overlay" class="faint-overlay" aria-live="assertive">
      <div class="faint-content">
        <div class="faint-icon" aria-hidden="true">☸</div>
        <div id="faint-message" class="faint-message" data-i18n="hud.faintMessage"></div>
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
  const statTurquoise = root.querySelector('#stat-turquoise');
  const statHpBar = root.querySelector('#stat-hp-bar');
  const statShieldBar = root.querySelector('#stat-shield-bar');
  const statHpText = root.querySelector('#stat-hp-text');
  const potionPipsWrap = root.querySelector('#potion-pips');
  const potionPipEls = potionPipsWrap ? Array.from(potionPipsWrap.querySelectorAll('.potion-pip')) : [];
  const hpPopupAnchor = root.querySelector('#hp-popup-anchor');
  const statMpBar = root.querySelector('#stat-mp-bar');
  const statMpText = root.querySelector('#stat-mp-text');
  const mpPopupAnchor = root.querySelector('#mp-popup-anchor');
  const statExpFill = root.querySelector('#stat-exp-fill') || root.querySelector('#stat-exp-bar');
  const statExpBar = statExpFill;
  const statExpText = root.querySelector('#stat-exp-text');
  const vitalsBuffs = root.querySelector('#vitals-buffs');

  const levelupBanner = root.querySelector('#levelup-banner');
  const levelupTitle = root.querySelector('#levelup-title');
  const levelupStats = root.querySelector('#levelup-stats');
  const faintOverlay = root.querySelector('#faint-overlay');
  const faintMessage = root.querySelector('#faint-message');

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
  const seasonBtns = [
    root.querySelector('#btn-season-spring'),
    root.querySelector('#btn-season-summer'),
    root.querySelector('#btn-season-autumn'),
    root.querySelector('#btn-season-winter'),
  ].filter(Boolean);

  const btnLangToggle = root.querySelector('#btn-lang-toggle');
  const btnLangText = root.querySelector('#btn-lang-text');
  const btnInventoryToggle = root.querySelector('#btn-inventory-toggle');
  const btnMuteToggle = root.querySelector('#btn-mute-toggle');
  const btnMuteIcon = root.querySelector('#btn-mute-icon');
  const btnMusicToggle = root.querySelector('#btn-music-toggle');
  const btnMusicIcon = root.querySelector('#btn-music-icon');
  const btnHelpToggle = root.querySelector('#btn-help-toggle');
  const btnHudHide = root.querySelector('#btn-hud-hide');
  const btnHudRestore = root.querySelector('#btn-hud-restore');
  const btnUtilityMore = root.querySelector('#btn-utility-more');
  const meritPanelEl = root.querySelector('#merit-panel');
  const timePanelEl = root.querySelector('.time-panel');
  const timeRowEl = root.querySelector('.time-row');
  const utilityBarEl = root.querySelector('.utility-bar');

  if (meritPanelEl) {
    meritPanelEl.addEventListener('click', (e) => {
      e.stopPropagation();
      meritPanelEl.classList.toggle('is-mobile-expanded');
    });
  }
  if (timeRowEl && timePanelEl) {
    timeRowEl.addEventListener('click', (e) => {
      if (e.target.closest?.('.speed-group')) return;
      e.stopPropagation();
      timePanelEl.classList.toggle('is-mobile-expanded');
    });
  }
  if (btnUtilityMore && utilityBarEl) {
    btnUtilityMore.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = utilityBarEl.classList.toggle('is-mobile-expanded');
      btnUtilityMore.querySelector('span').textContent = expanded ? '✕' : '⋯';
    });
  }

  const promptBtn = root.querySelector('#interaction-prompt');
  const promptKey = root.querySelector('#prompt-key');
  const promptLabel = root.querySelector('#prompt-label');
  const promptSecondaryBtn = root.querySelector('#interaction-prompt-secondary');
  const promptSecondaryKey = root.querySelector('#prompt-secondary-key');
  const promptSecondaryLabel = root.querySelector('#prompt-secondary-label');

  const btnMobileChant = root.querySelector('#btn-chant') || root.querySelector('#btn-mobile-chant') || root.querySelector('[data-action="chant"]');
  // Ensure both #btn-chant and legacy #btn-mobile-chant resolve to the chant action button
  if (typeof document !== 'undefined') {
    const origGetElementById = document.getElementById.bind(document);
    document.getElementById = function (id) {
      if (id === 'btn-mobile-chant') return btnMobileChant || origGetElementById('btn-chant');
      return origGetElementById(id);
    };
    const origDocQuerySelector = document.querySelector.bind(document);
    document.querySelector = function (sel) {
      if (sel === '#btn-mobile-chant') return btnMobileChant || origDocQuerySelector('#btn-chant');
      return origDocQuerySelector(sel);
    };
    const origRootQuerySelector = root.querySelector.bind(root);
    root.querySelector = function (sel) {
      if (sel === '#btn-mobile-chant') return btnMobileChant || origRootQuerySelector('#btn-chant');
      return origRootQuerySelector(sel);
    };
  }
  const chantCooldownFill = root.querySelector('#chant-cooldown-fill');
  const btnMobileProstrate = root.querySelector('#btn-mobile-prostrate');
  const btnMobileInteract = root.querySelector('#btn-mobile-interact');
  const btnMobileFeed = root.querySelector('#btn-mobile-feed');
  const btnMobilePotion = root.querySelector('#btn-mobile-potion');
  const mobilePotionCount = root.querySelector('#mobile-potion-count');

  const toastStack = root.querySelector('#toast-stack');
  const damageVignette = root.querySelector('#damage-vignette');
  const enemyHpContainer = root.querySelector('#enemy-health-bars');
  const damageNumbersContainer = root.querySelector('#damage-numbers');
  const bossBarEl = root.querySelector('#boss-bar');
  const bossBarNameEl = root.querySelector('#boss-bar-name');
  const bossBarTitleEl = root.querySelector('#boss-bar-title');
  const bossBarPhaseEl = root.querySelector('#boss-bar-phase');
  const bossBarFillEl = root.querySelector('#boss-bar-fill');
  const bossBarTicksEl = root.querySelector('#boss-bar-ticks');
  const bossBarHpTextEl = root.querySelector('#boss-bar-hp-text');
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
  let lastSeason = '';
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
    renderMusicButton();
  }

  function renderMusicButton() {
    const on = ctx.audio?.isMusicEnabled?.() ?? true;
    btnMusicIcon.innerHTML = on
      ? `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`
      : `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="m3 3 18 18"/></svg>`;
    const label = i18n.t(on ? 'hud.musicOff' : 'hud.musicOn');
    btnMusicToggle.title = label;
    btnMusicToggle.setAttribute('aria-label', label);
    btnMusicToggle.classList.toggle('is-off', !on);
  }

  function resolvePromptLabel(payload) {
    if (!payload) return '';
    if (typeof payload.getLabel === 'function') {
      const dynamicText = payload.getLabel();
      if (dynamicText) return dynamicText;
    }
    if (payload.text) return payload.text;
    return i18n.t(payload.labelKey, payload.params);
  }

  function applyTranslations() {
    const japan = isJapanMap(state.zone);
    const nodes = root.querySelectorAll('[data-i18n]');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = i18n.t((japan && JAPAN_SKILL_HELP_KEYS[key]) || key);
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
    for (const sBtn of seasonBtns) {
      const sKey = sBtn.getAttribute('data-season');
      if (sKey) {
        const titleStr = i18n.t(`hud.season.${sKey}`);
        sBtn.title = titleStr;
        sBtn.setAttribute('aria-label', titleStr);
      }
    }

    // Force refresh dynamic localized labels
    lastPhase = '';
    displayedStats.koraPct = -1;
    if (currentPrompt) {
      promptLabel.textContent = resolvePromptLabel(currentPrompt);
      if (currentPrompt.secondary && promptSecondaryLabel) {
        promptSecondaryLabel.textContent = resolvePromptLabel(currentPrompt.secondary);
      }
    }

    // Re-localize active toasts
    for (let i = 0; i < activeToasts.length; i++) {
      const item = activeToasts[i];
      if (item.key) {
        item.textEl.textContent = i18n.t(item.key, item.params);
      }
    }

    renderMuteButton();
    renderAchievementsModal();
    if (ctx.vitals?.getStats) {
      const vs = ctx.vitals.getStats();
      const maxLvl = ctx.config?.VITALS?.maxLevel || 40;
      if ((vs.level >= maxLvl || vs.isMaxLevel) && statExpText) {
        statExpText.textContent = i18n.t('hud.max') || 'MAX';
      }
    }
    if (state.player?.buffs) {
      renderBuffs(state.player.buffs);
    }
    if (bossBarState.visible) {
      renderBossBarText();
    }
  }

  i18n.onChange(applyTranslations);
  bus.on('zone:change', ({ from, to } = {}) => {
    if (from !== to && (isJapanMap(from) || isJapanMap(to))) {
      for (const entry of activeToasts) entry.el.remove();
      activeToasts.length = 0;
    }
    if (isJapanMap(from) !== isJapanMap(to)) applyTranslations();
  });
  bus.on('audio:change', renderMuteButton);

  // ---------------------------------------------------------------- toasts
  function showToast(payload) {
    if (!payload || (!payload.key && !payload.text)) return;
    const el = document.createElement('div');
    const kind = payload.kind || 'info';
    el.className = `toast-item glass-panel toast-item--${kind}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-item__icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = kind === 'achievement' ? '✦' : kind === 'warning' ? '↺' : '☸';

    const textEl = document.createElement('span');
    textEl.className = 'toast-item__text';
    textEl.textContent = payload.key
      ? i18n.t(payload.key, payload.params)
      : String(payload.text || '');

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

  let lastJumpDodgeToastAt = -10;
  bus.on('player:jumpDodge', () => {
    const now = state.elapsed || 0;
    if (now - lastJumpDodgeToastAt >= 1.5) {
      lastJumpDodgeToastAt = now;
      showToast({ key: 'toast.jumpDodge', kind: 'info' });
    }
  });

  // ---------------------------------------------------------------- interaction prompt
  bus.on('prompt', (payload) => {
    currentPrompt = payload;
    if (!payload) {
      promptBtn.classList.add('is-hidden');
      promptSecondaryBtn?.classList.add('is-hidden');
    } else {
      promptKey.textContent = payload.keyHint || 'E';
      promptLabel.textContent = resolvePromptLabel(payload);
      promptBtn.classList.remove('is-hidden');
      if (payload.secondary && promptSecondaryBtn) {
        promptSecondaryKey.textContent = payload.secondary.keyHint || 'F';
        promptSecondaryLabel.textContent = resolvePromptLabel(payload.secondary);
        promptSecondaryBtn.classList.remove('is-hidden');
      } else {
        promptSecondaryBtn?.classList.add('is-hidden');
      }
    }
  });

  let lastPromptPointerDownTime = 0;
  promptBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    lastPromptPointerDownTime = performance.now();
    if (currentPrompt && ctx.input) {
      ctx.input.trigger(currentPrompt.action || 'interact');
    }
  });
  promptBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (performance.now() - lastPromptPointerDownTime < 400) return;
    if (currentPrompt && ctx.input) {
      ctx.input.trigger(currentPrompt.action || 'interact');
    }
  });

  let lastSecPromptPointerDownTime = 0;
  promptSecondaryBtn?.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    lastSecPromptPointerDownTime = performance.now();
    if (currentPrompt?.secondary && ctx.input) {
      ctx.input.trigger(currentPrompt.secondary.action || 'feed');
    }
  });
  promptSecondaryBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (performance.now() - lastSecPromptPointerDownTime < 400) return;
    if (currentPrompt?.secondary && ctx.input) {
      ctx.input.trigger(currentPrompt.secondary.action || 'feed');
    }
  });

  // ---------------------------------------------------------------- event handlers
  btnBegin.addEventListener('click', () => {
    bus.emit('game:start');
  });

  bus.on('game:start', () => {
    titleScreen.classList.add('is-hidden');
    playHud.classList.remove('is-hidden');
    playHud.inert = hudHidden;
    showToast({ key: 'toast.welcome', kind: 'info' });
  });

  titleLangZh.addEventListener('click', () => i18n.setLang('zh'));
  titleLangEn.addEventListener('click', () => i18n.setLang('en'));
  btnLangToggle.addEventListener('click', () => {
    i18n.setLang(i18n.lang === 'zh' ? 'en' : 'zh');
  });

  if (btnInventoryToggle) {
    btnInventoryToggle.addEventListener('click', () => {
      if (ctx.inventoryUi?.toggle) {
        ctx.inventoryUi.toggle('bag');
      } else {
        ctx.input?.trigger('inventory');
      }
    });
  }

  bus.on('currency:changed', (payload) => {
    if (statTurquoise && payload && payload.turquoise != null) {
      statTurquoise.textContent = String(payload.turquoise);
    }
  });

  btnMuteToggle.addEventListener('click', () => {
    ctx.audio?.toggleMute();
  });

  btnMusicToggle.addEventListener('click', () => {
    ctx.audio?.toggleMusic?.();
  });

  function setHudHidden(next) {
    hudHidden = Boolean(next);
    playHud.classList.toggle('is-hud-minimized', hudHidden);
    playHud.inert = hudHidden || playHud.classList.contains('is-hidden');
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

  // ---------------------------------------------------------------- Debug & Chapter Skip Modal
  const btnDebugToggle = root.querySelector('#btn-debug-toggle');
  const debugModal = root.querySelector('#debug-modal');
  const btnDebugClose = root.querySelector('#btn-debug-close');
  const btnDebugCloseBottom = root.querySelector('#btn-debug-close-bottom');
  const debugLockView = root.querySelector('#debug-lock-view');
  const debugPanelView = root.querySelector('#debug-panel-view');
  const debugPasswordInput = root.querySelector('#debug-password-input');
  const btnDebugUnlock = root.querySelector('#btn-debug-unlock');
  const debugPasswordError = root.querySelector('#debug-password-error');
  const btnDebugGod = root.querySelector('#btn-debug-god');

  function syncDebugModalState() {
    const isUnlocked = Boolean(ctx.debug?.unlockedByPassword);
    debugLockView?.classList.toggle('is-hidden', isUnlocked);
    debugPanelView?.classList.toggle('is-hidden', !isUnlocked);
    debugPasswordError?.classList.add('is-hidden');
    if (btnDebugGod) {
      const godOn = Boolean(state.vitals?.god);
      btnDebugGod.textContent = godOn ? '🛡️ 無敵模式：開啟' : '🛡️ 無敵模式：關閉';
    }
  }

  function openDebugModal(open) {
    if (!debugModal) return;
    debugModal.classList.toggle('is-hidden', !open);
    state.uiOpen = Boolean(
      open ||
        ctx.dialogue?.isOpen?.() ||
        ctx.questUi?.isOpen?.() ||
        ctx.shop?.isOpen?.() ||
        ctx.crafting?.isOpen?.() ||
        ctx.inventoryUi?.isOpen?.()
    );
    if (open) {
      syncDebugModalState();
      if (!ctx.debug?.unlockedByPassword && debugPasswordInput) {
        debugPasswordInput.value = '';
        setTimeout(() => debugPasswordInput.focus(), 40);
      }
    }
  }

  function attemptDebugUnlock() {
    const raw = debugPasswordInput?.value || '';
    const ok = ctx.debug?.unlock
      ? ctx.debug.unlock(raw)
      : String(raw).trim().toLowerCase() === 'amitabha';
    if (ok) {
      ctx.debug?.enable?.();
      syncDebugModalState();
      bus.emit('sfx', { name: 'bowl' });
      showToast({ text: '☸ 已解鎖 Debug 跳關模式！', kind: 'info' });
    } else {
      debugPasswordError?.classList.remove('is-hidden');
      if (debugPasswordInput) {
        debugPasswordInput.select();
      }
    }
  }

  btnDebugToggle?.addEventListener('click', () => {
    openDebugModal(debugModal.classList.contains('is-hidden'));
  });
  btnDebugClose?.addEventListener('click', () => openDebugModal(false));
  btnDebugCloseBottom?.addEventListener('click', () => openDebugModal(false));
  debugModal?.addEventListener('click', (e) => {
    if (e.target === debugModal) openDebugModal(false);
  });
  btnDebugUnlock?.addEventListener('click', attemptDebugUnlock);
  debugPasswordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      attemptDebugUnlock();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      openDebugModal(false);
    }
  });

  for (const chBtn of root.querySelectorAll('[data-skip-chapter]')) {
    chBtn.addEventListener('click', async () => {
      const target = chBtn.getAttribute('data-skip-chapter');
      openDebugModal(false);
      if (target === 'stupa') {
        await ctx.zones?.teleport?.('stupa', { spawn: 'south' });
        showToast({ text: '☸ 已傳送回博達哈大佛塔', kind: 'info' });
      } else if (target === 'toji') {
        await ctx.zones?.teleport?.('toji', { spawn: 'gojunoto' });
        showToast({ text: '🏯 已傳送至京都東寺・教王護國寺', kind: 'info' });
      } else if (target === 'koyasan') {
        await ctx.zones?.teleport?.('koyasan', { spawn: 'garan' });
        showToast({ text: '⛰️ 已傳送至高野山・金剛峯寺', kind: 'info' });
      } else if (target) {
        await ctx.quests?.skipTo?.(target);
        showToast({ text: `☸ 已跳關至 ${target.toUpperCase()}`, kind: 'info' });
      }
    });
  }

  for (const toolBtn of root.querySelectorAll('[data-debug-action]')) {
    toolBtn.addEventListener('click', () => {
      const act = toolBtn.getAttribute('data-debug-action');
      if (act === 'heal') {
        if (state.player) {
          ctx.vitals?.set?.({ hp: state.player.maxHp || 100, mp: state.player.maxMp || 60 });
        }
        ctx.potions?.refill?.();
        showToast({ text: '❤️ HP / MP 與甘露丸已全滿', kind: 'info' });
      } else if (act === 'god') {
        const nextGod = !Boolean(state.vitals?.god);
        ctx.vitals?.god?.(nextGod);
        syncDebugModalState();
        showToast({ text: nextGod ? '🛡️ 無敵模式已開啟' : '🛡️ 無敵模式已關閉', kind: 'info' });
      } else if (act === 'turquoise') {
        ctx.inventory?.addTurquoise?.(500);
        showToast({ text: '💎 已獲得 +500 綠松石', kind: 'info' });
      } else if (act === 'levelup') {
        ctx.vitals?.addExp?.(3000);
      } else if (act === 'step') {
        const activeList = ctx.quests?.getActive?.() || [];
        const firstActive = activeList[0];
        if (firstActive) {
          ctx.quests?.completeStep?.(firstActive.id);
          showToast({ text: `✅ 已推進任務步驟：${firstActive.id}`, kind: 'info' });
        } else {
          showToast({ text: '目前沒有進行中的任務步驟', kind: 'info' });
        }
      }
    });
  }

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

  function selectSeason(seasonKey, announce = true) {
    if (!seasonKey) return;
    if (ctx.sky?.setSeason) {
      ctx.sky.setSeason(seasonKey, { silent: false });
    } else {
      state.time.season = seasonKey;
      bus.emit('season:change', { season: seasonKey });
    }
    if (announce) {
      showToast({
        key: 'toast.seasonChanged',
        params: { season: i18n.t(`hud.season.${seasonKey}`) },
        kind: 'info',
      });
    }
  }

  for (const sBtn of seasonBtns) {
    sBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sKey = sBtn.getAttribute('data-season');
      if (sKey) selectSeason(sKey, true);
    });
  }

  // Mobile / on-screen action buttons (with multi-touch pointerdown & stopPropagation)
  function bindActionButton(btn, action) {
    if (!btn) return;
    let lastPointerDownTime = 0;
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      lastPointerDownTime = performance.now();
      ctx.input?.trigger(action);
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (performance.now() - lastPointerDownTime < 400) return;
      ctx.input?.trigger(action);
    });
  }

  bindActionButton(btnMobileChant, 'chant');
  bindActionButton(btnMobileProstrate, 'prostrate');
  bindActionButton(btnMobileInteract, 'interact');
  bindActionButton(btnMobileFeed, 'feed');
  bindActionButton(btnMobilePotion, 'potion');

  // Amrita potion pips & mobile badge
  let lastPotionCharges = -1;
  let lastPotionMax = -1;
  function renderPotionPips(payload) {
    const pot = payload || state.player?.potions || { charges: 4, max: 4 };
    const charges = Math.max(0, Number(pot.charges ?? 4));
    const max = Math.max(1, Number(pot.max ?? 4));
    if (charges === lastPotionCharges && max === lastPotionMax) return;
    lastPotionCharges = charges;
    lastPotionMax = max;

    for (let i = 0; i < potionPipEls.length; i++) {
      const pip = potionPipEls[i];
      const filled = i < charges;
      pip.classList.toggle('is-filled', filled);
      pip.classList.toggle('is-empty', !filled);
    }
    if (potionPipsWrap) {
      potionPipsWrap.title = `${i18n.t('hud.potions') || 'Amrita'}: ${charges}/${max}`;
    }
    if (mobilePotionCount) {
      mobilePotionCount.textContent = String(charges);
    }
    if (btnMobilePotion) {
      btnMobilePotion.classList.toggle('is-empty', charges <= 0);
    }
  }

  bus.on('potion:change', renderPotionPips);
  bus.on('potion:use', renderPotionPips);
  renderPotionPips();

  // Flash MP bar on insufficient MP
  const mpBarTrack = statMpBar?.parentElement;
  let noMpTimer = null;
  bus.on('mantra:nomp', () => {
    if (!mpBarTrack) return;
    mpBarTrack.classList.remove('is-nomp-flash');
    void mpBarTrack.offsetWidth;
    mpBarTrack.classList.add('is-nomp-flash');
    if (noMpTimer) clearTimeout(noMpTimer);
    noMpTimer = setTimeout(() => {
      mpBarTrack.classList.remove('is-nomp-flash');
      noMpTimer = null;
    }, 500);
  });

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
  function spawnVitalsPopup(type, delta, dmgType = 'physical') {
    const anchor = type === 'hp' ? hpPopupAnchor : mpPopupAnchor;
    if (!anchor) return;
    const el = document.createElement('div');
    const isPos = delta > 0;
    const sign = isPos ? '+' : '';
    const kind = type === 'hp'
      ? (isPos ? 'vitals-popup--heal' : 'vitals-popup--damage')
      : (isPos ? 'vitals-popup--mp-gain' : 'vitals-popup--mp-spend');
    const typeClass = dmgType === 'magic' ? 'is-magic floating-damage--magic' : 'is-physical floating-damage--physical';
    el.className = `vitals-popup ${kind} ${typeClass}`;
    el.textContent = `${sign}${delta}`;
    anchor.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 950);
  }

  // ---------------------------------------------------------------- Boss Health Bar UI
  const bossBarState = {
    visible: false,
    nameKey: '',
    titleKey: '',
    hp: 100,
    maxHp: 100,
    phase: 1,
    phaseCount: 1,
    demoActive: false,
    demoElapsed: 0,
    demoDuration: 3.0,
  };

  function renderBossBarText() {
    if (!bossBarEl) return;
    if (bossBarNameEl) {
      bossBarNameEl.textContent = bossBarState.nameKey ? i18n.t(bossBarState.nameKey) : '';
    }
    if (bossBarTitleEl) {
      const tStr = bossBarState.titleKey ? i18n.t(bossBarState.titleKey) : '';
      bossBarTitleEl.textContent = tStr;
      bossBarTitleEl.style.display = tStr ? '' : 'none';
    }
    if (bossBarPhaseEl) {
      if (bossBarState.phaseCount > 1) {
        bossBarPhaseEl.textContent = i18n.t('hud.bossPhase', {
          phase: bossBarState.phase,
          total: bossBarState.phaseCount,
        });
        bossBarPhaseEl.style.display = '';
      } else {
        bossBarPhaseEl.textContent = '';
        bossBarPhaseEl.style.display = 'none';
      }
    }
  }

  function renderBossBarValues() {
    if (!bossBarEl) return;
    const maxHp = Math.max(1, bossBarState.maxHp || 1);
    const hp = Math.max(0, Math.min(maxHp, bossBarState.hp ?? maxHp));
    const pct = (hp / maxHp) * 100;
    if (bossBarFillEl) {
      bossBarFillEl.style.width = `${pct.toFixed(1)}%`;
    }
    if (bossBarHpTextEl) {
      bossBarHpTextEl.textContent = `${Math.round(hp)} / ${Math.round(maxHp)}`;
    }
  }

  function showBossBar({ nameKey = 'boss.demo.name', titleKey = '', hp = 1000, maxHp = 1000, phase = 1, phaseCount = 3 } = {}) {
    bossBarState.visible = true;
    bossBarState.nameKey = nameKey;
    bossBarState.titleKey = titleKey;
    bossBarState.maxHp = Math.max(1, Number(maxHp) || 1000);
    bossBarState.hp = Math.max(0, Math.min(bossBarState.maxHp, Number(hp ?? bossBarState.maxHp)));
    bossBarState.phaseCount = Math.max(1, Math.floor(Number(phaseCount) || 1));
    bossBarState.phase = Math.max(1, Math.min(bossBarState.phaseCount, Math.floor(Number(phase) || 1)));
    bossBarState.demoActive = false;

    if (bossBarTicksEl) {
      bossBarTicksEl.innerHTML = '';
      for (let p = 1; p < bossBarState.phaseCount; p++) {
        const tick = document.createElement('span');
        tick.className = 'boss-bar__tick';
        tick.style.left = `${((p / bossBarState.phaseCount) * 100).toFixed(2)}%`;
        bossBarTicksEl.appendChild(tick);
      }
    }

    renderBossBarText();
    renderBossBarValues();

    if (bossBarEl) {
      bossBarEl.classList.remove('is-hidden');
    }
    if (playHud) {
      playHud.classList.add('has-boss-bar');
    }
  }

  function updateBossBar({ hp, maxHp, phase } = {}) {
    if (maxHp != null) bossBarState.maxHp = Math.max(1, Number(maxHp));
    if (hp != null) bossBarState.hp = Math.max(0, Math.min(bossBarState.maxHp, Number(hp)));
    if (phase != null && phase !== bossBarState.phase) {
      bossBarState.phase = Math.max(1, Math.min(bossBarState.phaseCount, Math.floor(Number(phase))));
      renderBossBarText();
    }
    renderBossBarValues();
  }

  function hideBossBar() {
    bossBarState.visible = false;
    bossBarState.demoActive = false;
    if (bossBarEl) {
      bossBarEl.classList.add('is-hidden');
    }
    if (playHud) {
      playHud.classList.remove('has-boss-bar');
    }
  }

  function startBossBarDemo() {
    if (titleScreen && !titleScreen.classList.contains('is-hidden')) {
      bus.emit('game:start');
    }
    showBossBar({
      nameKey: 'boss.demo.name',
      titleKey: 'boss.demo.title',
      hp: 1000,
      maxHp: 1000,
      phase: 1,
      phaseCount: 3,
    });
    bossBarState.demoActive = true;
    bossBarState.demoElapsed = 0;
    bossBarState.demoDuration = 3.0;
    return true;
  }

  // ---------------------------------------------------------------- 3D Overlays (Health Bars, Pooled Damage Numbers, Vignette)
  const DMG_POOL_SIZE = 40;
  const dmgPool = [];
  if (damageNumbersContainer) {
    damageNumbersContainer.innerHTML = '';
    for (let i = 0; i < DMG_POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'floating-damage';
      el.style.display = 'none';
      damageNumbersContainer.appendChild(el);
      dmgPool.push({
        el,
        active: false,
        timer: 0,
        duration: 0.85,
        bornAt: 0,
      });
    }
  }

  function spawnFloatingDamage(screenX, screenY, amount, { type = 'physical', crit = false, isEnemy = true } = {}) {
    if (!dmgPool.length) return;
    let slot = dmgPool.find((s) => !s.active);
    if (!slot) {
      // Reuse the oldest active slot so DOM node count never exceeds 40
      let oldest = dmgPool[0];
      for (let i = 1; i < dmgPool.length; i++) {
        if (dmgPool[i].bornAt < oldest.bornAt) oldest = dmgPool[i];
      }
      slot = oldest;
    }

    slot.active = true;
    slot.timer = 0;
    slot.duration = crit ? 0.95 : 0.85;
    slot.bornAt = performance.now();

    const el = slot.el;
    const isMagic = type === 'magic';
    const typeCls = isMagic ? 'floating-damage--magic is-magic' : 'floating-damage--physical is-physical';
    const critCls = crit ? 'floating-damage--crit is-crit' : '';
    const targetCls = isEnemy ? 'enemy-dmg-number' : 'player-dmg-number';

    // Reset animation cleanly
    el.style.display = 'none';
    el.className = `floating-damage ${typeCls} ${critCls} ${targetCls}`.trim();
    el.textContent = crit ? `-${amount}!` : `-${amount}`;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    void el.offsetWidth;
    el.style.display = 'block';
  }

  const projVec = new Vector3();
  function toScreen(pos) {
    if (!ctx.camera) return null;
    ctx.camera.updateMatrixWorld();
    ctx.camera.matrixWorldInverse.copy(ctx.camera.matrixWorld).invert();
    projVec.set(pos.x, pos.y, pos.z);
    projVec.project(ctx.camera);
    if (projVec.z > 1 || projVec.z < -1) return null;
    const x = (projVec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projVec.y * 0.5 + 0.5) * window.innerHeight;
    if (x < -80 || x > window.innerWidth + 80 || y < -80 || y > window.innerHeight + 80) {
      return null;
    }
    return { x, y };
  }

  const slowIcon = document.createElement('div');
  slowIcon.id = 'player-slow-icon';
  slowIcon.className = 'player-slow-icon';
  slowIcon.textContent = '❄️';
  slowIcon.style.display = 'none';
  if (playHud) playHud.appendChild(slowIcon);

  let vignetteTimer = null;
  bus.on('player:hurt', (payload) => {
    if (damageVignette) {
      damageVignette.classList.remove('is-active');
      void damageVignette.offsetWidth;
      damageVignette.classList.add('is-active');
      if (vignetteTimer) clearTimeout(vignetteTimer);
      vignetteTimer = setTimeout(() => {
        damageVignette.classList.remove('is-active');
        vignetteTimer = null;
      }, 350);
    }

    if (payload && typeof payload.amount === 'number' && payload.amount > 0 && damageNumbersContainer) {
      const playerPos = state.player?.position;
      if (playerPos) {
        const pt = toScreen({ x: playerPos.x, y: playerPos.y + 1.85, z: playerPos.z });
        if (pt) {
          const jitterX = (Math.random() - 0.5) * 16;
          spawnFloatingDamage(pt.x + jitterX, pt.y, payload.amount, {
            type: payload.type || 'physical',
            crit: false,
            isEnemy: false,
          });
        }
      }
    }
  });

  bus.on('enemy:hit', (payload) => {
    if (!payload || !payload.position || !damageNumbersContainer) return;
    const pt = toScreen(payload.position);
    if (!pt) return;

    const jitterX = (Math.random() - 0.5) * 22;
    const jitterY = (Math.random() - 0.5) * 8;
    spawnFloatingDamage(pt.x + jitterX, pt.y + jitterY, payload.damage, {
      type: payload.type || 'physical',
      crit: Boolean(payload.crit),
      isEnemy: true,
    });
  });

  const enemyBars = new Map();
  function updateEnemyHealthBars() {
    if (!enemyHpContainer) return;
    if (!ctx.world?.isCombatZone() || hudHidden || !ctx.enemies) {
      enemyHpContainer.style.display = 'none';
      return;
    }
    enemyHpContainer.style.display = '';

    const enemies = ctx.enemies.getActiveEnemies ? ctx.enemies.getActiveEnemies() : [];
    const activeIds = new Set();

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      activeIds.add(e.id);

      const isElite = e.rank === 'champion' || e.rank === 'rare';
      if (e.hp <= 0 || e.state === 'liberated' || (!isElite && e.hp >= e.maxHp)) {
        const bar = enemyBars.get(e.id);
        if (bar) bar.wrap.style.display = 'none';
        continue;
      }

      const pt = toScreen({ x: e.pos.x, y: e.pos.y + e.height + 0.35, z: e.pos.z });
      if (!pt) {
        const bar = enemyBars.get(e.id);
        if (bar) bar.wrap.style.display = 'none';
        continue;
      }

      let bar = enemyBars.get(e.id);
      if (!bar) {
        const wrap = document.createElement('div');
        wrap.className = 'enemy-hp-wrap';
        wrap.innerHTML = `
          <div class="enemy-hp-title"></div>
          <div class="enemy-hp-affixes"></div>
          <div class="enemy-hp-row">
            <span class="enemy-hp-level">Lv1</span>
            <div class="enemy-hp-track"><div class="enemy-hp-fill"></div></div>
          </div>
        `;
        const titleEl = wrap.querySelector('.enemy-hp-title');
        const affixesEl = wrap.querySelector('.enemy-hp-affixes');
        const fill = wrap.querySelector('.enemy-hp-fill');
        const lvl = wrap.querySelector('.enemy-hp-level');
        enemyHpContainer.appendChild(wrap);
        bar = {
          wrap,
          titleEl,
          affixesEl,
          fill,
          lvl,
          lastLevel: -1,
          lastTitle: '',
          lastAffixes: '',
          lastRank: '',
          lastShielded: null,
        };
        enemyBars.set(e.id, bar);
      }

      const curLvl = e.level || 1;
      if (bar.lastLevel !== curLvl && bar.lvl) {
        bar.lastLevel = curLvl;
        bar.lvl.textContent = `Lv${curLvl}`;
      }

      const curRank = e.rank || 'normal';
      if (bar.lastRank !== curRank) {
        bar.lastRank = curRank;
        bar.wrap.classList.toggle('enemy-hp-wrap--champion', curRank === 'champion');
        bar.wrap.classList.toggle('enemy-hp-wrap--rare', curRank === 'rare');
      }

      const curShielded = Boolean(e.shielded);
      if (bar.lastShielded !== curShielded) {
        bar.lastShielded = curShielded;
        bar.wrap.classList.toggle('is-shielded', curShielded);
      }

      const nextTitle = isElite ? (e.eliteName || '') : '';
      if (bar.lastTitle !== nextTitle && bar.titleEl) {
        bar.lastTitle = nextTitle;
        bar.titleEl.textContent = nextTitle;
        bar.titleEl.style.display = nextTitle ? 'block' : 'none';
      }

      const nextAffixes = curRank === 'rare' ? (e.eliteSubtitle || '') : '';
      if (bar.lastAffixes !== nextAffixes && bar.affixesEl) {
        bar.lastAffixes = nextAffixes;
        bar.affixesEl.textContent = nextAffixes;
        bar.affixesEl.style.display = nextAffixes ? 'block' : 'none';
      }

      bar.wrap.style.display = '';
      bar.wrap.style.left = `${pt.x}px`;
      bar.wrap.style.top = `${pt.y}px`;
      const pct = Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100));
      bar.fill.style.width = `${pct}%`;
    }

    for (const [id, bar] of enemyBars.entries()) {
      if (!activeIds.has(id)) {
        if (bar.wrap.parentNode) bar.wrap.parentNode.removeChild(bar.wrap);
        enemyBars.delete(id);
      }
    }
  }

  const BUFF_ICONS = {
    sungdu: '🪢',
    dungkar: '🐚',
    shrine_diligence: '⚡',
    shrine_vajra: '🛡️',
    shrine_wisdom: '📖',
    shrine_amrita: '💧',
    shrine_fortune: '🍀',
    chimphuStill: '📿',
    guruBlessing: '☸',
    vajraGuruChannel: '✨',
    protectorOath: '🛡️',
    samyeCoopBlessing: '☸',
  };
  let lastBuffKey = '';

  function renderBuffs(buffs) {
    if (!vitalsBuffs) return;
    if (!buffs || buffs.length === 0) {
      if (lastBuffKey !== '') {
        lastBuffKey = '';
        vitalsBuffs.innerHTML = '';
        vitalsBuffs.style.display = 'none';
      }
      return;
    }

    const key = buffs
      .map((b) => `${b.id}:${Math.ceil(Math.max(0, b.remaining || 0))}`)
      .join(';') + `:${i18n.lang}`;

    if (key === lastBuffKey) return;
    lastBuffKey = key;

    vitalsBuffs.style.display = 'flex';
    vitalsBuffs.innerHTML = buffs
      .map((b) => {
        const icon = BUFF_ICONS[b.id] || '✦';
        const itemKey = 'item.' + b.id;
        const fallbackKey =
          b.nameKey ||
          (b.id === 'samyeCoopBlessing' ? state.samyeCoopBlessing?.nameKey : '');
        const name = i18n.has(itemKey)
          ? i18n.t(itemKey)
          : fallbackKey && i18n.has(fallbackKey)
            ? i18n.t(fallbackKey)
            : i18n.t(itemKey);
        const secs = Math.ceil(Math.max(0, b.remaining || 0)) + 's';
        return `
          <div class="vitals-buff-chip" title="${name}">
            <span class="vitals-buff-icon">${icon}</span>
            <span class="vitals-buff-name">${name}</span>
            <span class="vitals-buff-time">${secs}</span>
          </div>
        `;
      })
      .join('');
  }

  function updateVitals(payload) {
    if (!payload) return;
    const { hp, maxHp, shield, mp, maxMp, exp, maxExp, level, atk, def, buffs, deltaHp, deltaMp } = payload;

    if (statLevel && level != null) statLevel.textContent = String(level);
    if (statAtk && atk != null) statAtk.textContent = String(atk);
    if (statDef && def != null) statDef.textContent = String(def);
    if (statTurquoise) {
      const tq =
        payload.turquoise ??
        ctx.inventory?.getTurquoise?.() ??
        state.inventory?.turquoise ??
        0;
      statTurquoise.textContent = String(tq);
    }

    if (statHpBar && maxHp > 0 && hp != null) {
      const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
      statHpBar.style.width = `${pct}%`;
    }
    const curShield = Math.max(0, Math.round(Number(shield ?? state.player?.shield) || 0));
    if (statShieldBar && maxHp > 0) {
      const shPct = Math.max(0, Math.min(100, (curShield / maxHp) * 100));
      statShieldBar.style.width = `${shPct}%`;
      statShieldBar.classList.toggle('is-active', curShield > 0);
    }
    if (statHpText && hp != null && maxHp != null) {
      statHpText.textContent =
        curShield > 0 ? `${hp} / ${maxHp} (+${curShield})` : `${hp} / ${maxHp}`;
    }

    if (statMpBar && maxMp > 0 && mp != null) {
      const pct = Math.max(0, Math.min(100, (mp / maxMp) * 100));
      statMpBar.style.width = `${pct}%`;
    }
    if (statMpText && mp != null && maxMp != null) {
      statMpText.textContent = `${mp} / ${maxMp}`;
    }

    const maxLvl = ctx.config?.VITALS?.maxLevel || 40;
    if (level != null && level >= maxLvl) {
      if (statExpFill) statExpFill.style.width = '100%';
      if (statExpText) statExpText.textContent = i18n.t('hud.max') || 'MAX';
    } else {
      if (statExpFill && maxExp > 0 && exp != null) {
        const pct = Math.max(0, Math.min(100, (exp / maxExp) * 100));
        statExpFill.style.width = `${pct}%`;
      }
      if (statExpText && exp != null && maxExp != null) {
        statExpText.textContent = `${exp} / ${maxExp}`;
      }
    }

    if (buffs) {
      renderBuffs(buffs);
    }

    if (deltaHp && deltaHp !== 0) {
      spawnVitalsPopup('hp', deltaHp, payload.type);
    }
    if (deltaMp && deltaMp !== 0) {
      spawnVitalsPopup('mp', deltaMp);
    }
  }

  let levelupTimer = null;
  let levelupRemaining = 0;
  function showLevelUpBanner(payload) {
    if (!levelupBanner) return;
    const level = payload.level ?? 1;
    const deltaMaxHp = payload.deltaMaxHp ?? 0;
    const deltaMaxMp = payload.deltaMaxMp ?? 0;
    const deltaAtk = payload.deltaAtk ?? 0;

    if (levelupTitle) {
      levelupTitle.textContent = i18n.t('hud.levelUpBanner', { level });
    }
    if (levelupStats) {
      levelupStats.textContent = i18n.t('hud.levelUpStats', { deltaMaxHp, deltaMaxMp, deltaAtk });
    }

    levelupBanner.classList.remove('is-hidden');
    levelupBanner.classList.add('is-active');
    levelupRemaining = 2.8;

    if (levelupTimer) clearTimeout(levelupTimer);
    levelupTimer = setTimeout(() => {
      levelupBanner.classList.remove('is-active');
      levelupBanner.classList.add('is-hidden');
      levelupTimer = null;
      levelupRemaining = 0;
    }, 2800);
  }

  bus.on('level:up', (payload) => {
    if (!payload) return;
    showLevelUpBanner(payload);
  });

  bus.on('player:faint', () => {
    if (faintOverlay) {
      if (faintMessage) {
        faintMessage.textContent = i18n.t('hud.faintMessage');
      }
      faintOverlay.classList.add('is-active');
    }
  });

  bus.on('player:wake', () => {
    if (faintOverlay) {
      faintOverlay.classList.remove('is-active');
    }
  });

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
    const curZone = state.zone || 'stupa';
    if (playHud && playHud.dataset.zone !== curZone) {
      playHud.dataset.zone = curZone;
    }
    if (levelupRemaining > 0) {
      levelupRemaining -= dt;
      if (levelupRemaining <= 0 && levelupBanner) {
        levelupBanner.classList.remove('is-active');
        levelupBanner.classList.add('is-hidden');
        if (levelupTimer) {
          clearTimeout(levelupTimer);
          levelupTimer = null;
        }
      }
    }
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

    const curSeason = state.time.season || 'spring';
    if (curSeason !== lastSeason) {
      lastSeason = curSeason;
      for (const sBtn of seasonBtns) {
        const s = sBtn.getAttribute('data-season');
        sBtn.classList.toggle('is-active', s === curSeason);
      }
    }

    // 2b. Japanese Emaki Scroll Badge
    const curLang = i18n.lang;
    const emakiKey = `${curZone}:${curSeason}:${curLang}`;
    if (emakiKey !== root._lastEmakiKey) {
      root._lastEmakiKey = emakiKey;
      const emakiScroll = root.querySelector('#japan-emaki-scroll');
      const emakiSeal = root.querySelector('#japan-emaki-seal');
      const emakiTitle = root.querySelector('#japan-emaki-title');
      const emakiSub = root.querySelector('#japan-emaki-sub');
      const isJp = isJapanMap(curZone);
      if (emakiScroll) {
        emakiScroll.classList.toggle('is-hidden', !isJp);
        if (isJp && emakiSeal && emakiTitle && emakiSub) {
          emakiScroll.lang = curLang;
          const isEn = curLang === 'en';
          if (curZone === 'toji') {
            emakiSeal.textContent = '空海';
            emakiTitle.textContent = isEn ? 'Kyoto · Tō-ji' : '平安京・東寺';
            const seasonVerse = {
              spring: isEn ? 'Fuji-zakura Petals' : '春・不二櫻花吹雪',
              summer: isEn ? 'Lotus Pond & Green Maple' : '夏・瓢箪池青楓',
              autumn: isEn ? 'Crimson Momiji Brocade' : '秋・五重塔錦紅葉',
              winter: isEn ? 'Sacred Pagoda in Snow' : '冬・九條雪見伽藍',
            };
            emakiSub.textContent = seasonVerse[curSeason] || seasonVerse.spring;
          } else if (curZone === 'koyasan') {
            emakiSeal.textContent = '遍照';
            emakiTitle.textContent = isEn ? 'Mt. Kōya · Kongōbu-ji' : '高野山・金剛峯';
            const seasonVerse = {
              spring: isEn ? 'Mountain Cherry Mist' : '春・八葉蓮華山櫻',
              summer: isEn ? 'Ancient Cedar Sanctuary' : '夏・奧之院千本杉',
              autumn: isEn ? 'Jabara-michi Crimson' : '秋・蛇腹路紅楓',
              winter: isEn ? 'Snowy Mandala Basin' : '冬・密嚴淨土雪嶺',
            };
            emakiSub.textContent = seasonVerse[curSeason] || seasonVerse.spring;
          } else {
            emakiSeal.textContent = '空海';
            emakiTitle.textContent = i18n.t(`hud.japan.emaki.${curZone}.name`);
            emakiSub.textContent = i18n.t(`hud.japan.emaki.${curZone}.verse`);
          }
        }
      }
    }

    // 3. Highlight mobile interact / feed buttons when a matching target is in range
    const target = state.interactionTarget;
    const targetsByAction = state.interactionTargetsByAction;
    const canInteract = Boolean((target && target.action === 'interact') || targetsByAction?.interact);
    const canFeed = Boolean((target && target.action === 'feed') || targetsByAction?.feed);
    if (canInteract !== lastInteractAvailable) {
      lastInteractAvailable = canInteract;
      btnMobileInteract.classList.toggle('is-ready', canInteract);
    }
    if (canFeed !== lastFeedAvailable) {
      lastFeedAvailable = canFeed;
      btnMobileFeed.classList.toggle('is-ready', canFeed);
    }

    // 4. Update buff chips & potion pips if active
    if (state.player?.buffs) {
      renderBuffs(state.player.buffs);
    }
    if (state.player?.potions) {
      renderPotionPips(state.player.potions);
    }

    // 5. Update mobile chant button cooldown ring
    if (chantCooldownFill) {
      const cdFrac = ctx.mantra ? ctx.mantra.getCooldownFraction() : 0;
      const offset = CHANT_RING_CIRC * (1 - cdFrac);
      chantCooldownFill.setAttribute('stroke-dashoffset', offset.toFixed(2));
      if (btnMobileChant) {
        btnMobileChant.classList.toggle('is-cooldown', cdFrac > 0.001);
      }
    }

    // 6. Update enemy overhead health bars
    updateEnemyHealthBars();

    // 7. Tick pooled floating damage numbers
    for (let i = 0; i < dmgPool.length; i++) {
      const slot = dmgPool[i];
      if (!slot.active) continue;
      slot.timer += dt;
      if (slot.timer >= slot.duration) {
        slot.active = false;
        slot.el.style.display = 'none';
      }
    }

    // 8. Tick Boss bar demo if active
    if (bossBarState.demoActive && bossBarState.visible) {
      bossBarState.demoElapsed += dt;
      const u = Math.min(1, bossBarState.demoElapsed / (bossBarState.demoDuration || 3.0));
      const nextHp = Math.round(bossBarState.maxHp * (1 - u * 0.82));
      const ratio = nextHp / bossBarState.maxHp;
      let nextPhase = 1;
      if (ratio <= 0.34) nextPhase = 3;
      else if (ratio <= 0.67) nextPhase = 2;
      updateBossBar({ hp: nextHp, phase: nextPhase });
      if (u >= 1) {
        bossBarState.demoActive = false;
      }
    }

    // 9. Update player slow status icon
    const isSlowed = state.elapsed < (state.player?.slowUntil || 0);
    if (isSlowed && state.player?.position && !hudHidden) {
      const pt = toScreen({ x: state.player.position.x, y: state.player.position.y + 2.1, z: state.player.position.z });
      if (pt) {
        slowIcon.style.display = 'block';
        slowIcon.style.left = `${pt.x}px`;
        slowIcon.style.top = `${pt.y}px`;
      } else {
        slowIcon.style.display = 'none';
      }
    } else {
      slowIcon.style.display = 'none';
    }
  }

  const api = {
    update,
    showBossBar,
    updateBossBar,
    hideBossBar,
    bossBar: {
      demo: startBossBarDemo,
      show: showBossBar,
      update: updateBossBar,
      hide: hideBossBar,
    },
  };

  ctx.hud = api;
  ctx.debug?.register('hud', api);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.hud = api;
  }

  return api;
}
