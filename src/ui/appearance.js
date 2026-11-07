/**
 * Pilgrim Appearance & Face/Outfit Customization Studio UI (`src/ui/appearance.js`)
 *
 * Features:
 *   - Title Screen button `#btn-title-customize` ("✨ 塑造法相・自定義角色") & `V` Front-Cam control chip
 *   - Top-Right Utility Bar button `#btn-appearance-toggle` ("🪞") & Inventory Paperdoll shortcut button
 *   - Floating Front-Camera HUD Pill (`#front-cam-pill`) when `V` Front Portrait View is active
 *   - Right-side glassmorphic Appearance Studio Drawer (`#appearance-studio`) with live 3D camera fly-in:
 *       - Pilgrim Dharma Name input + "🎲 隨機法號" generator + overhead nameplate toggle
 *       - 3 Tabs: "🙂 五官與髮型" (Face & Hair), "👘 法衣與配色" (Robes & Aura), "👑 法帽與莊嚴具" (Hats & Relics)
 *       - Interactive 360° character drag-rotation on the 3D stage + Face/Full-body zoom toggle + Pose preview bar
 */
import '../i18n/appearance.js';
import {
  SKIN_TONES,
  EYE_STYLES,
  EYE_COLORS,
  BROW_STYLES,
  MOUTH_STYLES,
  MARK_TYPES,
  HAIR_STYLES,
  HAIR_COLORS,
  ROBE_COLORS,
  SHAWL_COLORS,
  TRIM_COLORS,
  HAT_TYPES,
  NECK_TYPES,
  CHEST_TYPES,
  BACK_TYPES,
  AURA_COLORS,
  DEFAULT_APPEARANCE,
  rollRandomAppearance,
  rollRandomDharmaName,
} from '../data/appearance.js';

export function createAppearanceUi(ctx) {
  if (ctx.appearanceUi) return ctx.appearanceUi;
  const { state, bus, i18n } = ctx;

  let studioOpen = false;
  let activeTab = 'face'; // 'face' | 'outfit' | 'gear'
  let zoomMode = 'face';  // 'face' | 'body'
  let isDraggingStage = false;
  let dragLastX = 0;

  state.customizing = false;
  state.customizeZoomMode = 'face';
  state.customizePreviewYaw = 0;

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById('appearance-studio-styles')) return;
    const style = document.createElement('style');
    style.id = 'appearance-studio-styles';
    style.textContent = `
      /* Title Screen Customize Button */
      .btn-title-customize {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 11px 22px;
        border-radius: 999px;
        border: 1px solid rgba(251, 191, 36, 0.55);
        background: rgba(24, 18, 38, 0.82);
        color: #fde68a;
        font-family: "Noto Serif TC", "Outfit", system-ui, sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.38);
      }
      .btn-title-customize:hover {
        background: rgba(45, 32, 68, 0.94);
        border-color: #fbbf24;
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(251, 191, 36, 0.22);
      }
      .btn-title-customize__badge {
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(251, 191, 36, 0.16);
        border: 1px solid rgba(251, 191, 36, 0.38);
        color: #fef08a;
        font-size: 12px;
      }

      .title-screen.is-customizing {
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.28s ease;
      }

      /* Inventory Paperdoll Customize Shortcut */
      .inv-customize-btn {
        margin-top: 10px;
        width: 100%;
        padding: 8px 12px;
        border-radius: 9px;
        border: 1px solid rgba(251, 191, 36, 0.48);
        background: linear-gradient(135deg, rgba(45, 30, 64, 0.88), rgba(25, 18, 38, 0.92));
        color: #fde68a;
        font-family: "Noto Serif TC", system-ui, sans-serif;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.18s ease;
      }
      .inv-customize-btn:hover {
        border-color: #fbbf24;
        background: rgba(62, 42, 88, 0.95);
      }

      /* Front Camera HUD Pill (V key) */
      #front-cam-pill {
        position: fixed;
        top: 18px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 95;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 7px 14px;
        border-radius: 999px;
        background: rgba(15, 20, 34, 0.88);
        border: 1px solid rgba(45, 212, 191, 0.6);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
        color: #e2e8f0;
        font-family: "Noto Serif TC", system-ui, sans-serif;
        font-size: 12.5px;
        pointer-events: auto;
        backdrop-filter: blur(8px);
      }
      #front-cam-pill.is-hidden {
        display: none !important;
      }
      .front-cam-pill__btn {
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid rgba(251, 191, 36, 0.55);
        background: rgba(217, 119, 6, 0.25);
        color: #fde68a;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
      }
      .front-cam-pill__btn:hover {
        background: rgba(217, 119, 6, 0.45);
      }
      .front-cam-pill__close {
        border: none;
        background: transparent;
        color: #94a3b8;
        font-size: 14px;
        cursor: pointer;
        padding: 2px 4px;
      }
      .front-cam-pill__close:hover {
        color: #f8fafc;
      }

      /* Appearance Studio Overlay & Right Drawer */
      #appearance-studio {
        position: fixed;
        inset: 0;
        z-index: 135;
        display: flex;
        justify-content: space-between;
        pointer-events: none;
        font-family: "Noto Serif TC", "Outfit", system-ui, sans-serif;
        color: #f8fafc;
      }
      #appearance-studio.is-hidden {
        display: none !important;
      }

      /* Left 3D Stage Interactive Area */
      .app-stage {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        padding: 24px;
        pointer-events: auto;
        cursor: grab;
        user-select: none;
      }
      .app-stage:active {
        cursor: grabbing;
      }
      .app-stage__toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(15, 20, 34, 0.86);
        border: 1px solid rgba(251, 191, 36, 0.42);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(10px);
      }
      .app-stage__chip {
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(30, 41, 59, 0.78);
        color: #e2e8f0;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .app-stage__chip:hover {
        border-color: rgba(251, 191, 36, 0.65);
        color: #fef08a;
      }
      .app-stage__chip.is-active {
        background: linear-gradient(135deg, rgba(217, 119, 6, 0.45), rgba(180, 83, 9, 0.55));
        border-color: #fbbf24;
        color: #fef08a;
      }
      .app-stage__sep {
        width: 1px;
        height: 18px;
        background: rgba(148, 163, 184, 0.3);
      }

      /* Right Customization Drawer */
      .app-drawer {
        width: min(440px, 94vw);
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: linear-gradient(165deg, rgba(16, 20, 34, 0.95), rgba(11, 14, 25, 0.98));
        border-left: 1px solid rgba(251, 191, 36, 0.45);
        box-shadow: -16px 0 48px rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(14px);
        pointer-events: auto;
      }
      .app-drawer__header {
        padding: 18px 22px 12px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      }
      .app-drawer__eyebrow {
        color: #5eead4;
        font-size: 11.5px;
        letter-spacing: 0.08em;
      }
      .app-drawer__title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 3px 0 4px;
      }
      .app-drawer__title {
        margin: 0;
        color: #fde68a;
        font-size: 20px;
      }
      .app-drawer__close {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(30, 41, 59, 0.7);
        color: #cbd5e1;
        font-size: 14px;
        cursor: pointer;
      }
      .app-drawer__close:hover {
        color: #fff;
        border-color: #fbbf24;
      }
      .app-drawer__sub {
        margin: 0;
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.45;
      }

      /* Name & Identity Block */
      .app-name-box {
        margin: 12px 22px 0;
        padding: 11px 13px;
        border-radius: 11px;
        background: rgba(24, 33, 52, 0.72);
        border: 1px solid rgba(251, 191, 36, 0.32);
      }
      .app-name-box__label {
        display: block;
        color: #fde68a;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .app-name-box__row {
        display: flex;
        gap: 7px;
      }
      .app-name-box__input {
        flex: 1;
        min-width: 0;
        padding: 7px 10px;
        border-radius: 7px;
        border: 1px solid rgba(148, 163, 184, 0.42);
        background: rgba(11, 15, 26, 0.92);
        color: #f8fafc;
        font-size: 13.5px;
        font-family: inherit;
      }
      .app-name-box__input:focus {
        outline: none;
        border-color: #fbbf24;
      }
      .app-name-box__rand {
        padding: 7px 11px;
        border-radius: 7px;
        border: 1px solid rgba(45, 212, 191, 0.5);
        background: rgba(13, 148, 136, 0.24);
        color: #5eead4;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .app-name-box__rand:hover {
        background: rgba(13, 148, 136, 0.42);
      }
      .app-name-box__check {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        font-size: 12px;
        color: #cbd5e1;
        cursor: pointer;
      }

      /* Category Tabs */
      .app-tabs {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        padding: 12px 22px 10px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.16);
      }
      .app-tab {
        padding: 8px 6px;
        border-radius: 8px;
        border: 1px solid rgba(148, 163, 184, 0.25);
        background: rgba(30, 41, 59, 0.65);
        color: #cbd5e1;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
        transition: all 0.15s ease;
      }
      .app-tab:hover {
        color: #fef08a;
        border-color: rgba(251, 191, 36, 0.45);
      }
      .app-tab.is-active {
        background: linear-gradient(135deg, rgba(217, 119, 6, 0.36), rgba(180, 83, 9, 0.46));
        border-color: #fbbf24;
        color: #fef08a;
      }

      /* Scrollable Options Body */
      .app-body {
        flex: 1;
        overflow-y: auto;
        padding: 14px 22px 18px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .app-sec {
        background: rgba(20, 28, 46, 0.62);
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .app-sec__title {
        font-size: 12px;
        font-weight: 600;
        color: #fcd34d;
        margin-bottom: 8px;
      }
      .app-swatches {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }
      .app-swatch {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px 5px 6px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.3);
        background: rgba(15, 23, 42, 0.85);
        color: #e2e8f0;
        font-size: 11.5px;
        cursor: pointer;
        transition: all 0.14s ease;
      }
      .app-swatch:hover {
        border-color: rgba(251, 191, 36, 0.65);
      }
      .app-swatch.is-active {
        border-color: #fbbf24;
        background: rgba(217, 119, 6, 0.28);
        color: #fef08a;
        box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.4);
      }
      .app-swatch__dot {
        width: 15px;
        height: 15px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.45);
        flex-shrink: 0;
      }
      .app-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .app-pill {
        padding: 6px 11px;
        border-radius: 8px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        background: rgba(15, 23, 42, 0.85);
        color: #e2e8f0;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.14s ease;
      }
      .app-pill:hover {
        border-color: rgba(251, 191, 36, 0.6);
        color: #fef08a;
      }
      .app-pill.is-active {
        border-color: #2dd4bf;
        background: rgba(13, 148, 136, 0.32);
        color: #5eead4;
        font-weight: 600;
      }

      /* Footer Actions */
      .app-footer {
        padding: 13px 22px 18px;
        border-top: 1px solid rgba(148, 163, 184, 0.2);
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        background: rgba(11, 15, 26, 0.95);
      }
      .app-footer__btn {
        flex: 1;
        padding: 10px 14px;
        border-radius: 10px;
        border: 1px solid rgba(251, 191, 36, 0.48);
        background: rgba(30, 41, 59, 0.9);
        color: #fde68a;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
      }
      .app-footer__btn:hover {
        background: rgba(51, 65, 85, 0.95);
      }
      .app-footer__btn--primary {
        border-color: #fbbf24;
        background: linear-gradient(135deg, #d97706, #b45309);
        color: #fffbeb;
        box-shadow: 0 6px 18px rgba(217, 119, 6, 0.35);
      }
      .app-footer__btn--primary:hover {
        background: linear-gradient(135deg, #f59e0b, #d97706);
      }

      @media (max-width: 760px) {
        #appearance-studio {
          flex-direction: column;
        }
        .app-stage {
          padding: 12px;
          min-height: 36vh;
        }
        .app-drawer {
          width: 100vw;
          height: 64vh;
          border-left: none;
          border-top: 1px solid rgba(251, 191, 36, 0.45);
        }
      }
    `;
    document.head.appendChild(style);
  }

  injectStyles();

  // ---------------------------------------------------------------- Mount Title Screen & Utility Buttons
  const uiRoot = document.getElementById('ui') || document.body;

  // 1. Title Screen button (#btn-title-customize) & Front-Cam control chip
  let titleCustomizeBtn = null;
  let titleNameBadge = null;
  const beginBtn = document.getElementById('btn-begin');
  if (beginBtn) {
    beginBtn.addEventListener('click', (e) => {
      if (state.mode === 'intro' && !ctx.player?.getAppearance?.()?.customizedOnce) {
        e.stopImmediatePropagation();
        e.preventDefault();
        bus.emit('sfx', { name: 'bell' });
        open('face');
      }
    }, true);
  }
  const titleActions = document.querySelector('#title-screen .title-actions');
  if (titleActions && !document.getElementById('btn-title-customize')) {
    titleCustomizeBtn = document.createElement('button');
    titleCustomizeBtn.id = 'btn-title-customize';
    titleCustomizeBtn.type = 'button';
    titleCustomizeBtn.className = 'btn-title-customize';
    titleCustomizeBtn.innerHTML = `
      <span id="btn-title-customize-label" data-i18n="appearance.btn.titleCustomize">${i18n.t('appearance.btn.titleCustomize')}</span>
      <span id="btn-title-customize-badge" class="btn-title-customize__badge"></span>
    `;
    if (beginBtn && beginBtn.nextSibling) {
      titleActions.insertBefore(titleCustomizeBtn, beginBtn.nextSibling);
    } else {
      titleActions.appendChild(titleCustomizeBtn);
    }
    titleNameBadge = titleCustomizeBtn.querySelector('#btn-title-customize-badge');
    titleCustomizeBtn.addEventListener('click', () => {
      bus.emit('sfx', { name: 'click' });
      open('face');
    });
  }

  const titleControls = document.querySelector('#title-screen .title-controls');
  if (titleControls && !titleControls.querySelector('[data-i18n="controls.frontCam"]')) {
    const chip = document.createElement('div');
    chip.className = 'control-chip';
    chip.innerHTML = `<kbd>V</kbd><span data-i18n="controls.frontCam">${i18n.t('controls.frontCam')}</span>`;
    titleControls.appendChild(chip);
  }

  // 2. Top-Right Utility Bar button (#btn-appearance-toggle)
  const utilBar = document.querySelector('#top-controls .utility-bar');
  if (utilBar && !document.getElementById('btn-appearance-toggle')) {
    const btn = document.createElement('button');
    btn.id = 'btn-appearance-toggle';
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.title = i18n.t('appearance.btn.hudTitle');
    btn.setAttribute('aria-label', i18n.t('appearance.btn.hudTitle'));
    btn.innerHTML = '<span>🪞</span>';
    utilBar.insertBefore(btn, utilBar.firstChild);
    btn.addEventListener('click', () => {
      bus.emit('sfx', { name: 'click' });
      open('face');
    });
  }

  // 3. Inventory Paperdoll shortcut button (#btn-inv-appearance)
  const invEquipCol = document.querySelector('#inventory-modal .inv-equip-col');
  if (invEquipCol && !document.getElementById('btn-inv-appearance')) {
    const invBtn = document.createElement('button');
    invBtn.id = 'btn-inv-appearance';
    invBtn.type = 'button';
    invBtn.className = 'inv-customize-btn';
    invBtn.setAttribute('data-i18n', 'appearance.btn.invCustomize');
    invBtn.textContent = i18n.t('appearance.btn.invCustomize');
    invEquipCol.appendChild(invBtn);
    invBtn.addEventListener('click', () => {
      bus.emit('sfx', { name: 'click' });
      ctx.inventoryUi?.close?.();
      open('face');
    });
  }

  // 4. Front Camera HUD Pill (#front-cam-pill)
  const frontPill = document.createElement('div');
  frontPill.id = 'front-cam-pill';
  frontPill.className = 'is-hidden';
  frontPill.innerHTML = `
    <span id="front-cam-pill-text" data-i18n="appearance.frontCam.pill">${i18n.t('appearance.frontCam.pill')}</span>
    <button id="front-cam-open-studio" type="button" class="front-cam-pill__btn" data-i18n="appearance.frontCam.openStudioBtn">${i18n.t('appearance.frontCam.openStudioBtn')}</button>
    <button id="front-cam-close-btn" type="button" class="front-cam-pill__close" aria-label="Exit Front View">✕</button>
  `;
  uiRoot.appendChild(frontPill);

  frontPill.querySelector('#front-cam-open-studio').addEventListener('click', () => {
    bus.emit('sfx', { name: 'click' });
    open('face');
  });
  frontPill.querySelector('#front-cam-close-btn').addEventListener('click', () => {
    bus.emit('sfx', { name: 'click' });
    bus.emit('camera:setFront', { active: false });
  });

  // 5. Studio Overlay & Right Drawer (#appearance-studio)
  const studioEl = document.createElement('div');
  studioEl.id = 'appearance-studio';
  studioEl.className = 'is-hidden';
  studioEl.innerHTML = `
    <div id="app-stage" class="app-stage" aria-label="3D Character Preview Stage">
      <div class="app-stage__toolbar">
        <button id="app-zoom-face" type="button" class="app-stage__chip is-active" data-i18n="appearance.cam.face"></button>
        <button id="app-zoom-body" type="button" class="app-stage__chip" data-i18n="appearance.cam.body"></button>
        <span class="app-stage__sep"></span>
        <button id="app-pose-idle" type="button" class="app-stage__chip is-active" data-pose="idle" data-i18n="appearance.pose.idle"></button>
        <button id="app-pose-chant" type="button" class="app-stage__chip" data-pose="chant" data-i18n="appearance.pose.chant"></button>
        <button id="app-pose-prostrate" type="button" class="app-stage__chip" data-pose="prostrate" data-i18n="appearance.pose.prostrate"></button>
        <span class="app-stage__sep"></span>
        <button id="app-btn-random-all" type="button" class="app-stage__chip" data-i18n="appearance.btn.randomAll"></button>
        <button id="app-btn-reset" type="button" class="app-stage__chip" data-i18n="appearance.btn.resetDefault"></button>
      </div>
    </div>

    <aside class="app-drawer" role="dialog" aria-modal="true" aria-labelledby="app-drawer-title">
      <header class="app-drawer__header">
        <div class="app-drawer__eyebrow" data-i18n="appearance.studio.eyebrow"></div>
        <div class="app-drawer__title-row">
          <h2 id="app-drawer-title" class="app-drawer__title" data-i18n="appearance.studio.title"></h2>
          <button id="app-drawer-close" type="button" class="app-drawer__close" aria-label="Close">✕</button>
        </div>
        <p class="app-drawer__sub" data-i18n="appearance.studio.subtitle"></p>
      </header>

      <div class="app-name-box">
        <label for="app-name-input" class="app-name-box__label" data-i18n="appearance.name.label"></label>
        <div class="app-name-box__row">
          <input id="app-name-input" type="text" maxlength="20" class="app-name-box__input" />
          <button id="app-name-random" type="button" class="app-name-box__rand" data-i18n="appearance.name.randomBtn"></button>
        </div>
        <label class="app-name-box__check">
          <input id="app-show-nameplate" type="checkbox" checked />
          <span data-i18n="appearance.name.showTag"></span>
        </label>
      </div>

      <nav class="app-tabs" role="tablist">
        <button id="app-tab-face" type="button" class="app-tab is-active" data-tab="face" data-i18n="appearance.tab.face"></button>
        <button id="app-tab-outfit" type="button" class="app-tab" data-tab="outfit" data-i18n="appearance.tab.outfit"></button>
        <button id="app-tab-gear" type="button" class="app-tab" data-tab="gear" data-i18n="appearance.tab.gear"></button>
      </nav>

      <div id="app-options-body" class="app-body"></div>

      <footer id="app-footer" class="app-footer"></footer>
    </aside>
  `;
  uiRoot.appendChild(studioEl);

  const stageEl = studioEl.querySelector('#app-stage');
  const zoomFaceBtn = studioEl.querySelector('#app-zoom-face');
  const zoomBodyBtn = studioEl.querySelector('#app-zoom-body');
  const poseBtns = Array.from(studioEl.querySelectorAll('[data-pose]'));
  const randomAllBtn = studioEl.querySelector('#app-btn-random-all');
  const resetBtn = studioEl.querySelector('#app-btn-reset');
  const closeTopBtn = studioEl.querySelector('#app-drawer-close');
  const nameInput = studioEl.querySelector('#app-name-input');
  const nameRandomBtn = studioEl.querySelector('#app-name-random');
  const showNameplateChk = studioEl.querySelector('#app-show-nameplate');
  const tabBtns = Array.from(studioEl.querySelectorAll('.app-tab'));
  const optionsBody = studioEl.querySelector('#app-options-body');
  const footerEl = studioEl.querySelector('#app-footer');

  // ---------------------------------------------------------------- Stage Drag-to-Rotate
  stageEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.app-stage__toolbar')) return;
    isDraggingStage = true;
    dragLastX = e.clientX;
    try { stageEl.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  });
  stageEl.addEventListener('pointermove', (e) => {
    if (!isDraggingStage) return;
    const dx = e.clientX - dragLastX;
    dragLastX = e.clientX;
    state.customizePreviewYaw = ((state.customizePreviewYaw || 0) + dx * 0.012) % (Math.PI * 2);
  });
  const endStageDrag = () => { isDraggingStage = false; };
  stageEl.addEventListener('pointerup', endStageDrag);
  stageEl.addEventListener('pointercancel', endStageDrag);

  function setZoomMode(mode) {
    zoomMode = mode === 'body' ? 'body' : 'face';
    state.customizeZoomMode = zoomMode;
    zoomFaceBtn.classList.toggle('is-active', zoomMode === 'face');
    zoomBodyBtn.classList.toggle('is-active', zoomMode === 'body');
    bus.emit('appearance:zoomMode', { mode: zoomMode });
  }

  function setPreviewPose(pose) {
    ctx.player?.setPreviewPose?.(pose);
    for (const b of poseBtns) {
      b.classList.toggle('is-active', b.dataset.pose === pose);
    }
  }

  zoomFaceBtn.addEventListener('click', () => {
    bus.emit('sfx', { name: 'click' });
    setZoomMode('face');
  });
  zoomBodyBtn.addEventListener('click', () => {
    bus.emit('sfx', { name: 'click' });
    setZoomMode('body');
  });
  for (const b of poseBtns) {
    b.addEventListener('click', () => {
      bus.emit('sfx', { name: 'click' });
      setPreviewPose(b.dataset.pose);
      if (b.dataset.pose === 'prostrate') setZoomMode('body');
    });
  }

  randomAllBtn.addEventListener('click', () => {
    bus.emit('sfx', { name: 'bell' });
    const cur = ctx.player?.getAppearance?.() || DEFAULT_APPEARANCE;
    const next = rollRandomAppearance(cur);
    ctx.player?.setAppearance?.(next);
    renderOptions();
  });

  resetBtn.addEventListener('click', () => {
    bus.emit('sfx', { name: 'click' });
    const cur = ctx.player?.getAppearance?.() || DEFAULT_APPEARANCE;
    ctx.player?.setAppearance?.({
      ...DEFAULT_APPEARANCE,
      name: cur.name,
      customizedOnce: Boolean(cur.customizedOnce),
    });
    state.customizePreviewYaw = 0;
    renderOptions();
  });

  closeTopBtn.addEventListener('click', () => {
    bus.emit('sfx', { name: 'click' });
    close(true);
  });

  nameInput.addEventListener('input', () => {
    const clean = nameInput.value.trim().slice(0, 20);
    ctx.player?.setAppearance?.({ name: clean });
    updateTitleBadge();
  });

  nameRandomBtn.addEventListener('click', () => {
    bus.emit('sfx', { name: 'click' });
    const rolled = rollRandomDharmaName(i18n.getLang());
    nameInput.value = rolled;
    ctx.player?.setAppearance?.({ name: rolled });
    updateTitleBadge();
  });

  showNameplateChk.addEventListener('change', () => {
    ctx.player?.setAppearance?.({ showNameplate: Boolean(showNameplateChk.checked) });
  });

  for (const tb of tabBtns) {
    tb.addEventListener('click', () => {
      bus.emit('sfx', { name: 'click' });
      activeTab = tb.dataset.tab || 'face';
      for (const b of tabBtns) b.classList.toggle('is-active', b === tb);
      if (activeTab === 'face') {
        setZoomMode('face');
        state.customizePreviewYaw = 0;
      } else if (activeTab === 'outfit') {
        setZoomMode('body');
        state.customizePreviewYaw = 0;
      }
      renderOptions();
    });
  }

  function renderSectionSwatches(secKey, field, list, currentVal, onSelect) {
    const sec = document.createElement('section');
    sec.className = 'app-sec';
    sec.innerHTML = `<div class="app-sec__title">${i18n.t(secKey)}</div>`;
    const wrap = document.createElement('div');
    wrap.className = 'app-swatches';
    for (const item of list) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `app-swatch${currentVal === item.id ? ' is-active' : ''}`;
      btn.innerHTML = `
        <span class="app-swatch__dot" style="background:${item.css}"></span>
        <span>${i18n.t(item.labelKey)}</span>
      `;
      btn.addEventListener('click', () => {
        bus.emit('sfx', { name: 'click' });
        ctx.player?.setAppearance?.({ [field]: item.id });
        if (onSelect) onSelect(item);
        renderOptions();
      });
      wrap.appendChild(btn);
    }
    sec.appendChild(wrap);
    return sec;
  }

  function renderSectionPills(secKey, field, list, currentVal, onSelect) {
    const sec = document.createElement('section');
    sec.className = 'app-sec';
    sec.innerHTML = `<div class="app-sec__title">${i18n.t(secKey)}</div>`;
    const wrap = document.createElement('div');
    wrap.className = 'app-pills';
    for (const item of list) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `app-pill${currentVal === item.id ? ' is-active' : ''}`;
      btn.textContent = i18n.t(item.labelKey);
      btn.addEventListener('click', () => {
        bus.emit('sfx', { name: 'click' });
        ctx.player?.setAppearance?.({ [field]: item.id });
        if (onSelect) onSelect(item);
        renderOptions();
      });
      wrap.appendChild(btn);
    }
    sec.appendChild(wrap);
    return sec;
  }

  function renderOptions() {
    const spec = ctx.player?.getAppearance?.() || DEFAULT_APPEARANCE;
    optionsBody.innerHTML = '';

    // Static i18n texts inside studio
    studioEl.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (k) el.textContent = i18n.t(k);
    });
    nameInput.placeholder = i18n.t('appearance.name.placeholder');
    const fallbackName = ctx.coop?.getPilgrimName?.() || i18n.t('coop.pilgrimName.default');
    if (document.activeElement !== nameInput) {
      nameInput.value = spec.name || fallbackName;
    }
    showNameplateChk.checked = Boolean(spec.showNameplate);

    if (activeTab === 'face') {
      optionsBody.appendChild(
        renderSectionSwatches('appearance.sec.skinTone', 'skinTone', SKIN_TONES, spec.skinTone, () => setZoomMode('face'))
      );
      optionsBody.appendChild(
        renderSectionPills('appearance.sec.hairStyle', 'hairStyle', HAIR_STYLES, spec.hairStyle, () => setZoomMode('face'))
      );
      optionsBody.appendChild(
        renderSectionSwatches('appearance.sec.hairColor', 'hairColor', HAIR_COLORS, spec.hairColor, () => setZoomMode('face'))
      );
      optionsBody.appendChild(
        renderSectionPills('appearance.sec.browStyle', 'browStyle', BROW_STYLES, spec.browStyle, () => setZoomMode('face'))
      );
      optionsBody.appendChild(
        renderSectionPills('appearance.sec.eyeStyle', 'eyeStyle', EYE_STYLES, spec.eyeStyle, () => {
          setZoomMode('face');
          setPreviewPose('idle');
          state.customizePreviewYaw = 0;
        })
      );
      optionsBody.appendChild(
        renderSectionSwatches('appearance.sec.eyeColor', 'eyeColor', EYE_COLORS, spec.eyeColor, () => {
          setZoomMode('face');
          setPreviewPose('idle');
        })
      );
      optionsBody.appendChild(
        renderSectionPills('appearance.sec.mouthStyle', 'mouthStyle', MOUTH_STYLES, spec.mouthStyle, () => setZoomMode('face'))
      );
      optionsBody.appendChild(
        renderSectionPills('appearance.sec.markType', 'markType', MARK_TYPES, spec.markType, () => setZoomMode('face'))
      );
    } else if (activeTab === 'outfit') {
      optionsBody.appendChild(
        renderSectionSwatches('appearance.sec.robeColor', 'robeColor', ROBE_COLORS, spec.robeColor, () => setZoomMode('body'))
      );
      optionsBody.appendChild(
        renderSectionSwatches('appearance.sec.shawlColor', 'shawlColor', SHAWL_COLORS, spec.shawlColor, () => setZoomMode('body'))
      );
      optionsBody.appendChild(
        renderSectionSwatches('appearance.sec.trimColor', 'trimColor', TRIM_COLORS, spec.trimColor, () => setZoomMode('body'))
      );
      optionsBody.appendChild(
        renderSectionSwatches('appearance.sec.auraColor', 'auraColor', AURA_COLORS, spec.auraColor, () => {
          setZoomMode('body');
          setPreviewPose('chant');
        })
      );
    } else {
      optionsBody.appendChild(
        renderSectionPills('appearance.sec.hatType', 'hatType', HAT_TYPES, spec.hatType, () => {
          setZoomMode('face');
          state.customizePreviewYaw = 0;
        })
      );
      optionsBody.appendChild(
        renderSectionPills('appearance.sec.neckType', 'neckType', NECK_TYPES, spec.neckType, () => {
          setZoomMode('face');
          state.customizePreviewYaw = 0;
        })
      );
      optionsBody.appendChild(
        renderSectionPills('appearance.sec.chestType', 'chestType', CHEST_TYPES, spec.chestType, () => {
          setZoomMode('body');
          state.customizePreviewYaw = 0;
        })
      );
      optionsBody.appendChild(
        renderSectionPills('appearance.sec.backType', 'backType', BACK_TYPES, spec.backType, (item) => {
          setZoomMode('body');
          state.customizePreviewYaw = item.id === 'none' ? 0 : Math.PI * 0.72;
        })
      );
    }

    // Footer buttons depend on whether we are on Title Screen ('intro') or in-game ('play')
    footerEl.innerHTML = '';
    if (state.mode === 'intro') {
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'app-footer__btn';
      backBtn.textContent = i18n.t('appearance.btn.saveBackTitle');
      backBtn.addEventListener('click', () => {
        bus.emit('sfx', { name: 'click' });
        close(true);
      });

      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'app-footer__btn app-footer__btn--primary';
      startBtn.textContent = i18n.t('appearance.btn.saveStartGame');
      startBtn.addEventListener('click', () => {
        bus.emit('sfx', { name: 'bell' });
        close(false);
        bus.emit('game:start');
      });

      footerEl.appendChild(backBtn);
      footerEl.appendChild(startBtn);
    } else {
      const doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.className = 'app-footer__btn app-footer__btn--primary';
      doneBtn.textContent = i18n.t('appearance.btn.saveClosePlay');
      doneBtn.addEventListener('click', () => {
        bus.emit('sfx', { name: 'bell' });
        close(true);
      });
      footerEl.appendChild(doneBtn);
    }
  }

  function updateTitleBadge() {
    const spec = ctx.player?.getAppearance?.() || DEFAULT_APPEARANCE;
    const display = spec.name || ctx.coop?.getPilgrimName?.() || i18n.t('coop.pilgrimName.default');
    if (titleNameBadge) {
      titleNameBadge.textContent = `☸ ${display}`;
    }
    const titleLabel = document.getElementById('btn-title-customize-label');
    if (titleLabel) {
      titleLabel.textContent = i18n.t('appearance.btn.titleCustomize');
    }
    const invBtn = document.getElementById('btn-inv-appearance');
    if (invBtn) {
      invBtn.textContent = i18n.t('appearance.btn.invCustomize');
    }
    const utilBtn = document.getElementById('btn-appearance-toggle');
    if (utilBtn) {
      utilBtn.title = i18n.t('appearance.btn.hudTitle');
    }
    frontPill.querySelector('#front-cam-pill-text').textContent = i18n.t('appearance.frontCam.pill');
    frontPill.querySelector('#front-cam-open-studio').textContent = i18n.t('appearance.frontCam.openStudioBtn');
  }

  function open(tab = 'face') {
    studioOpen = true;
    activeTab = tab || 'face';
    state.customizing = true;
    state.uiOpen = true;
    state.customizePreviewYaw = 0;

    for (const b of tabBtns) {
      b.classList.toggle('is-active', b.dataset.tab === activeTab);
    }
    setZoomMode(activeTab === 'outfit' ? 'body' : 'face');
    setPreviewPose('idle');

    const titleScreen = document.getElementById('title-screen');
    if (titleScreen && state.mode === 'intro') {
      titleScreen.classList.add('is-customizing');
    }

    studioEl.classList.remove('is-hidden');
    renderOptions();
  }

  function close(showToast = false) {
    if (!studioOpen) return;
    const rawInput = nameInput.value.trim().slice(0, 20);
    ctx.player?.setAppearance?.({ ...(rawInput ? { name: rawInput } : {}), customizedOnce: true });
    studioOpen = false;
    state.customizing = false;
    state.uiOpen = false;
    state.customizePreviewYaw = 0;
    setPreviewPose('idle');

    const titleScreen = document.getElementById('title-screen');
    if (titleScreen) {
      titleScreen.classList.remove('is-customizing');
    }

    studioEl.classList.add('is-hidden');
    updateTitleBadge();

    if (showToast) {
      const spec = ctx.player?.getAppearance?.() || DEFAULT_APPEARANCE;
      const finalName = spec.name || ctx.coop?.getPilgrimName?.() || i18n.t('coop.pilgrimName.default');
      bus.emit('toast', {
        key: 'toast.appearanceSaved',
        params: { name: finalName },
        kind: 'merit',
      });
    }
  }

  bus.on('appearance:changed', updateTitleBadge);
  bus.on('coop:changed', updateTitleBadge);
  i18n.onChange(() => {
    updateTitleBadge();
    if (studioOpen) renderOptions();
  });

  updateTitleBadge();

  function update() {
    if (studioOpen && ctx.input?.pressed?.('closeUi')) {
      close(true);
      return;
    }
    const showFrontPill = Boolean(state.frontCam) && state.mode === 'play' && !studioOpen && !state.uiOpen;
    frontPill.classList.toggle('is-hidden', !showFrontPill);
  }

  const api = {
    update,
    open,
    close,
    toggle(tab) {
      if (studioOpen) close(true);
      else open(tab);
    },
    isOpen() {
      return studioOpen;
    },
  };
  ctx.appearanceUi = api;
  return api;
}
