/**
 * Personal Votive Stupa Builder & Samye 1,008 Stupas Global Co-op Modal UI (`src/ui/stupaBuilder.js`) — Ticket #60.
 *
 * Features:
 *  - Injects scoped `<style id="stupa-builder-styles">` into `document.head`
 *  - Appends `.icon-btn` with `🏛️` (`id="btn-stupa-builder-toggle"`) into `.utility-bar`
 *  - Tab 1 (`build`): Personal Votive Stupa Builder with Merit stats bar, 4 part category selectors
 *    (`plinth`, `dome`, `spire`, `ornament`), Pure-Vision Preview toggle (`⚡ 淨相預覽模式`),
 *    live 2D Canvas Stupa preview, Pilgrim Name / Stupa Title / Dedication Inscription inputs + presets,
 *    and "🏛️ 立塔銘刻・安奉於塔林" action button.
 *  - Tab 2 (`samye`): Samye 1,008 Perimeter Stupas Global Co-op progress bar, 4 Milestone buff cards,
 *    Merit contribution panel (`108 Merit = +1 Stupa` + Devotional offering), and Recent Contributors roll.
 */
import '../i18n/stupaBuild.js';
import {
  STUPA_PART_CATEGORIES,
  STUPA_PARTS,
  DEFAULT_STUPA_SPEC,
  getPartDef,
  normalizeStupaSpec,
  isPartUnlocked,
  formatPartReq,
  SAMYE_COOP_MILESTONES,
  getActiveSamyeMilestone,
} from '../data/stupaMaterials.js';

const MERIT_COST_PER_SAMYE_STUPA = 108;

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hexToCss(hexNum, alpha = 1) {
  const n = Number(hexNum) || 0;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  if (alpha < 1) return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  return `rgb(${r}, ${g}, ${b})`;
}

function injectStupaBuilderStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('stupa-builder-styles')) return;

  const style = document.createElement('style');
  style.id = 'stupa-builder-styles';
  style.textContent = `
    .stupa-builder-modal {
      position: fixed;
      inset: 0;
      z-index: 860;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(8, 12, 22, 0.78);
      backdrop-filter: blur(8px);
      padding: 18px;
      opacity: 1;
      transition: opacity 0.22s ease;
    }
    .stupa-builder-modal.is-hidden {
      display: none !important;
      opacity: 0;
      pointer-events: none;
    }
    .stupa-builder-dialog {
      width: min(1080px, 96vw);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(165deg, rgba(22, 28, 45, 0.96) 0%, rgba(14, 18, 30, 0.98) 100%);
      border: 1px solid rgba(251, 191, 36, 0.48);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.72), 0 0 28px rgba(251, 191, 36, 0.14);
      color: #f8fafc;
      overflow: hidden;
    }
    .stupa-builder-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 20px;
      border-bottom: 1px solid rgba(251, 191, 36, 0.25);
      background: rgba(15, 23, 42, 0.72);
      flex-wrap: wrap;
    }
    .stupa-builder-header__titles {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .stupa-builder-header__icon {
      font-size: 28px;
      filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.5));
    }
    .stupa-builder-title {
      margin: 0;
      font-family: "Noto Serif TC", Georgia, serif;
      font-size: 20px;
      font-weight: 700;
      color: #fde68a;
      letter-spacing: 0.03em;
    }
    .stupa-builder-subtitle {
      margin: 2px 0 0;
      font-size: 12.5px;
      color: #cbd5e1;
    }
    .stupa-builder-tabs {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .stupa-builder-tab {
      padding: 8px 16px;
      border-radius: 999px;
      border: 1px solid rgba(251, 191, 36, 0.32);
      background: rgba(30, 41, 59, 0.75);
      color: #e2e8f0;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .stupa-builder-tab:hover {
      border-color: rgba(251, 191, 36, 0.7);
      color: #fef08a;
    }
    .stupa-builder-tab.is-active {
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      border-color: #fde047;
      color: #fffbeb;
      box-shadow: 0 0 14px rgba(245, 158, 11, 0.45);
    }
    .stupa-builder-close {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(30, 41, 59, 0.8);
      color: #f1f5f9;
      font-size: 16px;
      cursor: pointer;
    }
    .stupa-builder-close:hover {
      background: rgba(220, 38, 38, 0.75);
      border-color: #fca5a5;
    }
    .stupa-builder-body {
      flex: 1;
      overflow-y: auto;
      padding: 18px 22px;
    }
    .stupa-builder-pane {
      display: none;
    }
    .stupa-builder-pane.is-active {
      display: block;
    }
    .stupa-stats-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      padding: 10px 16px;
      border-radius: 12px;
      background: rgba(30, 41, 59, 0.68);
      border: 1px solid rgba(251, 191, 36, 0.25);
      margin-bottom: 16px;
    }
    .stupa-stats-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
    }
    .stupa-stat-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #e2e8f0;
    }
    .stupa-stat-pill strong {
      color: #fde047;
      font-size: 15px;
    }
    .stupa-preview-toggle {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 12.5px;
      color: #fde68a;
      cursor: pointer;
      user-select: none;
      padding: 5px 11px;
      border-radius: 8px;
      border: 1px solid rgba(251, 191, 36, 0.38);
      background: rgba(120, 53, 15, 0.35);
    }
    .stupa-preview-toggle input {
      accent-color: #f59e0b;
      cursor: pointer;
    }
    .stupa-build-grid {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 20px;
    }
    @media (max-width: 860px) {
      .stupa-build-grid {
        grid-template-columns: 1fr;
      }
    }
    .stupa-cat-block {
      margin-bottom: 14px;
    }
    .stupa-cat-title {
      margin: 0 0 8px;
      font-size: 13.5px;
      font-weight: 700;
      color: #fcd34d;
      letter-spacing: 0.04em;
    }
    .stupa-parts-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(142px, 1fr));
      gap: 8px;
    }
    .stupa-part-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 9px 11px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      background: rgba(15, 23, 42, 0.78);
      color: #f1f5f9;
      text-align: left;
      cursor: pointer;
      transition: all 0.16s ease;
    }
    .stupa-part-card:hover {
      border-color: rgba(251, 191, 36, 0.65);
      transform: translateY(-1px);
    }
    .stupa-part-card.is-selected {
      border-color: #fde047;
      background: linear-gradient(145deg, rgba(120, 53, 15, 0.52), rgba(30, 41, 59, 0.92));
      box-shadow: 0 0 12px rgba(251, 191, 36, 0.32);
    }
    .stupa-part-card.is-locked {
      opacity: 0.72;
    }
    .stupa-part-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 6px;
    }
    .stupa-part-swatch {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.6);
      flex-shrink: 0;
    }
    .stupa-part-name {
      font-size: 13px;
      font-weight: 600;
      color: #fef3c7;
    }
    .stupa-part-desc {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.35;
    }
    .stupa-part-badge {
      margin-top: 2px;
      font-size: 10.5px;
      padding: 2px 6px;
      border-radius: 6px;
      font-weight: 600;
    }
    .stupa-part-badge.is-unlocked {
      background: rgba(22, 163, 74, 0.25);
      color: #86efac;
      border: 1px solid rgba(74, 222, 128, 0.35);
    }
    .stupa-part-badge.is-locked {
      background: rgba(153, 27, 27, 0.28);
      color: #fca5a5;
      border: 1px solid rgba(248, 113, 113, 0.35);
    }
    .stupa-right-col {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .stupa-preview-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      border-radius: 12px;
      background: radial-gradient(circle at 50% 38%, rgba(251, 191, 36, 0.18), rgba(15, 23, 42, 0.92) 72%);
      border: 1px solid rgba(251, 191, 36, 0.35);
    }
    .stupa-preview-canvas {
      width: 100%;
      max-width: 340px;
      height: 220px;
      border-radius: 8px;
    }
    .stupa-preview-warning {
      margin-top: 6px;
      font-size: 11.5px;
      color: #fcd34d;
      text-align: center;
    }
    .stupa-form-card {
      padding: 14px 16px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.78);
      border: 1px solid rgba(148, 163, 184, 0.25);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .stupa-form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stupa-form-field label {
      font-size: 12px;
      font-weight: 600;
      color: #fde68a;
    }
    .stupa-form-input,
    .stupa-form-textarea {
      padding: 8px 11px;
      border-radius: 8px;
      border: 1px solid rgba(251, 191, 36, 0.35);
      background: rgba(2, 6, 23, 0.75);
      color: #f8fafc;
      font-size: 13px;
      font-family: inherit;
    }
    .stupa-form-textarea {
      resize: vertical;
      min-height: 54px;
    }
    .stupa-presets-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .stupa-preset-chip {
      padding: 4px 9px;
      border-radius: 999px;
      border: 1px solid rgba(251, 191, 36, 0.3);
      background: rgba(30, 41, 59, 0.85);
      color: #e2e8f0;
      font-size: 11px;
      cursor: pointer;
    }
    .stupa-preset-chip:hover {
      border-color: #fde047;
      color: #fef08a;
    }
    .stupa-primary-btn {
      padding: 11px 18px;
      border-radius: 10px;
      border: 1px solid #fde047;
      background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%);
      color: #fffbeb;
      font-size: 14.5px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.38);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .stupa-primary-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(245, 158, 11, 0.55);
    }
    /* Samye Tab */
    .samye-hero-card {
      padding: 16px 20px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(69, 26, 3, 0.65) 0%, rgba(15, 23, 42, 0.92) 100%);
      border: 1px solid rgba(251, 191, 36, 0.42);
      margin-bottom: 16px;
    }
    .samye-progress-track {
      width: 100%;
      height: 22px;
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.85);
      border: 1px solid rgba(251, 191, 36, 0.45);
      overflow: hidden;
      margin: 10px 0;
      position: relative;
    }
    .samye-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #b45309 0%, #f59e0b 55%, #fde047 100%);
      box-shadow: 0 0 16px rgba(251, 191, 36, 0.65);
      transition: width 0.35s ease;
    }
    .samye-progress-text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: #fffbeb;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
    }
    .samye-milestones-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    @media (max-width: 820px) {
      .samye-milestones-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .samye-milestone-card {
      padding: 11px 12px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      background: rgba(15, 23, 42, 0.75);
    }
    .samye-milestone-card.is-unlocked {
      border-color: #fbbf24;
      background: linear-gradient(145deg, rgba(120, 53, 15, 0.48), rgba(15, 23, 42, 0.9));
      box-shadow: 0 0 14px rgba(251, 191, 36, 0.22);
    }
    .samye-bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 820px) {
      .samye-bottom-grid {
        grid-template-columns: 1fr;
      }
    }
    .samye-contributors-list {
      max-height: 220px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .samye-contributor-row {
      padding: 8px 11px;
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.55);
      border-left: 3px solid #f59e0b;
      font-size: 12.5px;
    }
  `;
  document.head.appendChild(style);
}

export function createStupaBuilderUi(ctx) {
  if (ctx.stupaBuilderUi) return ctx.stupaBuilderUi;
  const { state, bus, i18n } = ctx;

  injectStupaBuilderStyles();

  let modalOpen = false;
  let activeTab = 'build'; // 'build' | 'samye'
  let previewAnyPart = false;

  // Initialize selected spec from player's saved stupa or default
  const existingOwn = ctx.community?.getOwnStupa?.();
  let selectedSpec = normalizeStupaSpec(existingOwn?.spec || DEFAULT_STUPA_SPEC);

  // Track merit points already contributed to Samye in local save
  function getSpentSamyeMerit() {
    const saved = ctx.save?.get?.('stupaBuilder', null);
    return Math.max(0, Number(saved?.spentSamyeMerit) || 0);
  }

  function addSpentSamyeMerit(pts) {
    const cur = getSpentSamyeMerit();
    ctx.save?.set?.('stupaBuilder', { spentSamyeMerit: cur + Math.max(0, Number(pts) || 0) });
  }

  // ------------------------------------------------ 1. Utility Bar Button (`🏛️`)
  let utilBtn = null;
  function ensureUtilityButton() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('btn-stupa-builder-toggle')) {
      utilBtn = document.getElementById('btn-stupa-builder-toggle');
      return;
    }
    const bar = document.querySelector('.utility-bar');
    if (!bar) return;

    utilBtn = document.createElement('button');
    utilBtn.id = 'btn-stupa-builder-toggle';
    utilBtn.type = 'button';
    utilBtn.className = 'icon-btn';
    utilBtn.setAttribute('aria-label', 'Votive Stupa Builder');
    utilBtn.title = i18n?.t ? i18n.t('stupaBuild.btn.openTooltip') : '建造個人發願塔 ＆ 全服共建桑耶';
    utilBtn.innerHTML = '<span>🏛️</span>';
    utilBtn.addEventListener('click', () => {
      toggle();
    });

    // Insert right after inventory button if present, otherwise prepend
    const invBtn = bar.querySelector('#btn-inventory-toggle');
    if (invBtn && invBtn.nextSibling) {
      bar.insertBefore(utilBtn, invBtn.nextSibling);
    } else {
      bar.appendChild(utilBtn);
    }
  }
  ensureUtilityButton();

  // ------------------------------------------------ 2. Modal DOM Construction
  const uiRoot = (typeof document !== 'undefined' && (document.getElementById('ui') || document.body)) || null;
  const overlay = typeof document !== 'undefined' ? document.createElement('div') : null;

  if (overlay && uiRoot) {
    overlay.id = 'stupa-builder-modal';
    overlay.className = 'stupa-builder-modal is-hidden';
    overlay.innerHTML = `
      <div class="stupa-builder-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="stupa-builder-modal-title">
        <header class="stupa-builder-header">
          <div class="stupa-builder-header__titles">
            <span class="stupa-builder-header__icon" aria-hidden="true">🏛️</span>
            <div>
              <h2 id="stupa-builder-modal-title" class="stupa-builder-title"></h2>
              <p id="stupa-builder-modal-subtitle" class="stupa-builder-subtitle"></p>
            </div>
          </div>
          <div class="stupa-builder-tabs" role="tablist">
            <button id="stupa-tab-build" type="button" class="stupa-builder-tab is-active" data-tab="build"></button>
            <button id="stupa-tab-samye" type="button" class="stupa-builder-tab" data-tab="samye"></button>
          </div>
          <button id="stupa-builder-close-btn" type="button" class="stupa-builder-close" aria-label="Close">✕</button>
        </header>

        <div class="stupa-builder-body">
          <!-- TAB 1: Personal Votive Stupa Builder -->
          <div id="stupa-pane-build" class="stupa-builder-pane is-active">
            <div class="stupa-stats-strip">
              <div id="stupa-merit-stats-row" class="stupa-stats-chips"></div>
              <label class="stupa-preview-toggle">
                <input id="stupa-preview-any-checkbox" type="checkbox" />
                <span id="stupa-preview-any-label"></span>
              </label>
            </div>

            <div class="stupa-build-grid">
              <!-- Left column: 4 Part Category Selectors -->
              <div id="stupa-part-selectors" class="stupa-left-col"></div>

              <!-- Right column: 2D Canvas Stupa Preview + Inscription Form -->
              <div class="stupa-right-col">
                <div class="stupa-preview-card">
                  <canvas id="stupa-builder-preview-canvas" class="stupa-preview-canvas" width="340" height="220"></canvas>
                  <div id="stupa-preview-locked-warning" class="stupa-preview-warning" style="display:none;"></div>
                </div>

                <div class="stupa-form-card">
                  <div class="stupa-cat-title" id="stupa-form-section-title"></div>
                  <div class="stupa-form-field">
                    <label for="stupa-input-pilgrim" id="stupa-label-pilgrim"></label>
                    <input id="stupa-input-pilgrim" type="text" maxlength="24" class="stupa-form-input" />
                  </div>
                  <div class="stupa-form-field">
                    <label for="stupa-input-title" id="stupa-label-title"></label>
                    <input id="stupa-input-title" type="text" maxlength="28" class="stupa-form-input" />
                  </div>
                  <div class="stupa-form-field">
                    <label for="stupa-input-message" id="stupa-label-message"></label>
                    <textarea id="stupa-input-message" maxlength="100" class="stupa-form-textarea"></textarea>
                  </div>
                  <div class="stupa-form-field">
                    <label id="stupa-label-presets"></label>
                    <div id="stupa-presets-row" class="stupa-presets-wrap"></div>
                  </div>
                  <button id="stupa-btn-build-submit" type="button" class="stupa-primary-btn"></button>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: Samye 1,008 Stupas Global Co-op -->
          <div id="stupa-pane-samye" class="stupa-builder-pane">
            <div class="samye-hero-card">
              <h3 id="samye-coop-title" class="stupa-builder-title" style="margin-bottom:6px;"></h3>
              <p id="samye-coop-desc" class="stupa-builder-subtitle" style="margin-bottom:10px;"></p>
              <div class="samye-progress-track">
                <div id="samye-progress-fill" class="samye-progress-fill" style="width:32%;"></div>
                <span id="samye-progress-text" class="samye-progress-text"></span>
              </div>
              <div id="samye-coop-totals" class="stupa-stats-chips" style="margin-top:8px;"></div>
            </div>

            <div id="samye-milestones-grid" class="samye-milestones-grid"></div>

            <div class="samye-bottom-grid">
              <div class="stupa-form-card">
                <h4 id="samye-contribute-title" class="stupa-cat-title"></h4>
                <p id="samye-contribute-desc" class="stupa-part-desc" style="font-size:12px;"></p>
                <div id="samye-available-merit" style="font-size:13px;color:#fde047;font-weight:600;"></div>
                <div id="samye-spent-merit" style="font-size:12px;color:#94a3b8;"></div>
                <div class="stupa-form-field">
                  <label for="samye-input-note" id="samye-label-note"></label>
                  <input id="samye-input-note" type="text" maxlength="80" class="stupa-form-input" />
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
                  <button id="samye-btn-contribute-1" type="button" class="stupa-primary-btn" style="flex:1;"></button>
                  <button id="samye-btn-contribute-all" type="button" class="stupa-builder-tab" style="flex:1;"></button>
                </div>
              </div>

              <div class="stupa-form-card">
                <h4 id="samye-contributors-title" class="stupa-cat-title"></h4>
                <div id="samye-contributors-list" class="samye-contributors-list"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    uiRoot.appendChild(overlay);
  }

  // Element refs
  const titleEl = overlay?.querySelector('#stupa-builder-modal-title');
  const subtitleEl = overlay?.querySelector('#stupa-builder-modal-subtitle');
  const tabBuildBtn = overlay?.querySelector('#stupa-tab-build');
  const tabSamyeBtn = overlay?.querySelector('#stupa-tab-samye');
  const closeBtn = overlay?.querySelector('#stupa-builder-close-btn');
  const paneBuild = overlay?.querySelector('#stupa-pane-build');
  const paneSamye = overlay?.querySelector('#stupa-pane-samye');

  const meritStatsRow = overlay?.querySelector('#stupa-merit-stats-row');
  const previewCheckbox = overlay?.querySelector('#stupa-preview-any-checkbox');
  const previewLabel = overlay?.querySelector('#stupa-preview-any-label');
  const partSelectorsWrap = overlay?.querySelector('#stupa-part-selectors');
  const previewCanvas = overlay?.querySelector('#stupa-builder-preview-canvas');
  const previewWarningEl = overlay?.querySelector('#stupa-preview-locked-warning');

  const formSectionTitle = overlay?.querySelector('#stupa-form-section-title');
  const labelPilgrim = overlay?.querySelector('#stupa-label-pilgrim');
  const inputPilgrim = overlay?.querySelector('#stupa-input-pilgrim');
  const labelTitle = overlay?.querySelector('#stupa-label-title');
  const inputTitle = overlay?.querySelector('#stupa-input-title');
  const labelMessage = overlay?.querySelector('#stupa-label-message');
  const inputMessage = overlay?.querySelector('#stupa-input-message');
  const labelPresets = overlay?.querySelector('#stupa-label-presets');
  const presetsRow = overlay?.querySelector('#stupa-presets-row');
  const btnBuildSubmit = overlay?.querySelector('#stupa-btn-build-submit');

  const samyeTitleEl = overlay?.querySelector('#samye-coop-title');
  const samyeDescEl = overlay?.querySelector('#samye-coop-desc');
  const samyeProgressFill = overlay?.querySelector('#samye-progress-fill');
  const samyeProgressText = overlay?.querySelector('#samye-progress-text');
  const samyeTotalsEl = overlay?.querySelector('#samye-coop-totals');
  const samyeMilestonesGrid = overlay?.querySelector('#samye-milestones-grid');
  const samyeContributeTitle = overlay?.querySelector('#samye-contribute-title');
  const samyeContributeDesc = overlay?.querySelector('#samye-contribute-desc');
  const samyeAvailableMeritEl = overlay?.querySelector('#samye-available-merit');
  const samyeSpentMeritEl = overlay?.querySelector('#samye-spent-merit');
  const samyeLabelNote = overlay?.querySelector('#samye-label-note');
  const samyeInputNote = overlay?.querySelector('#samye-input-note');
  const samyeBtnContribute1 = overlay?.querySelector('#samye-btn-contribute-1');
  const samyeBtnContributeAll = overlay?.querySelector('#samye-btn-contribute-all');
  const samyeContributorsTitle = overlay?.querySelector('#samye-contributors-title');
  const samyeContributorsList = overlay?.querySelector('#samye-contributors-list');

  // ------------------------------------------------ 3. 2D Canvas Live Preview Renderer
  function drawStupaPreviewCanvas() {
    if (!previewCanvas) return;
    const g = previewCanvas.getContext('2d');
    if (!g) return;

    const w = previewCanvas.width;
    const h = previewCanvas.height;
    g.clearRect(0, 0, w, h);

    const plinthDef = getPartDef('plinth', selectedSpec.plinth);
    const domeDef = getPartDef('dome', selectedSpec.dome);
    const spireDef = getPartDef('spire', selectedSpec.spire);
    const ornamentDef = getPartDef('ornament', selectedSpec.ornament);

    const cx = w * 0.5;
    const baseY = h - 22;

    // Subtle mandala aura behind stupa
    const aura = g.createRadialGradient(cx, h * 0.48, 8, cx, h * 0.48, 95);
    aura.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
    aura.addColorStop(1, 'rgba(15, 23, 42, 0)');
    g.fillStyle = aura;
    g.beginPath();
    g.arc(cx, h * 0.48, 95, 0, Math.PI * 2);
    g.fill();

    // Ornament: Prayer Flags (drawn behind dome)
    if (ornamentDef.id === 'prayerFlags') {
      const flagCols = ['#2563eb', '#f8fafc', '#dc2626', '#16a34a', '#eab308'];
      for (const side of [-1, 1]) {
        g.strokeStyle = 'rgba(254, 243, 199, 0.75)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(cx, baseY - 148);
        g.lineTo(cx + side * 92, baseY - 38);
        g.stroke();

        for (let i = 0; i < 5; i++) {
          const u = (i + 1) / 6;
          const fx = cx + side * 92 * u;
          const fy = (baseY - 148) + 110 * u;
          g.fillStyle = flagCols[i % flagCols.length];
          g.fillRect(fx - 5, fy, 10, 11);
        }
      }
    }

    // 1. Plinth (3 stepped tiers)
    g.fillStyle = hexToCss(plinthDef.color ?? 0xeae6df);
    g.strokeStyle = hexToCss(domeDef.trim ?? 0xd97706);
    g.lineWidth = 1.8;

    g.fillRect(cx - 56, baseY - 16, 112, 16);
    g.strokeRect(cx - 56, baseY - 16, 112, 16);

    g.fillRect(cx - 46, baseY - 32, 92, 16);
    g.strokeRect(cx - 46, baseY - 32, 92, 16);

    g.fillRect(cx - 38, baseY - 48, 76, 16);
    g.strokeRect(cx - 38, baseY - 48, 76, 16);

    // Golden lotus petals if `vajraLotus`
    if (plinthDef.lotusPetals) {
      g.fillStyle = '#fbbf24';
      for (let i = -3; i <= 3; i++) {
        const px = cx + i * 10.5;
        g.beginPath();
        g.moveTo(px - 5, baseY - 46);
        g.lineTo(px, baseY - 56);
        g.lineTo(px + 5, baseY - 46);
        g.closePath();
        g.fill();
      }
    }

    // Ornament: Butter Lamps ring along plinth
    if (ornamentDef.id === 'butterLamps') {
      for (let i = -3; i <= 3; i++) {
        const lx = cx + i * 15;
        const ly = baseY - 18;
        g.fillStyle = '#d97706';
        g.fillRect(lx - 3, ly - 3, 6, 4);
        g.fillStyle = '#fde047';
        g.beginPath();
        g.arc(lx, ly - 6, 3.2, 0, Math.PI * 2);
        g.fill();
      }
    }

    // 2. Bumpa Dome
    g.fillStyle = hexToCss(domeDef.color ?? 0xf5f3ef, domeDef.transparent ? 0.82 : 1);
    g.beginPath();
    g.arc(cx, baseY - 52, 34, Math.PI, 0, false);
    g.lineTo(cx + 34, baseY - 48);
    g.lineTo(cx - 34, baseY - 48);
    g.closePath();
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = hexToCss(domeDef.trim ?? 0xd97706);
    g.stroke();

    // Ornament: Six-Syllable Golden Halo around Dome
    if (ornamentDef.id === 'mantraHalo') {
      g.save();
      g.strokeStyle = '#fde047';
      g.lineWidth = 2.5;
      g.beginPath();
      g.ellipse(cx, baseY - 68, 48, 12, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#fef08a';
      g.font = 'bold 11px serif';
      g.textAlign = 'center';
      g.fillText('ཨོཾ མ ཎི པ དྨེ ཧཱུྃ', cx, baseY - 64);
      g.restore();
    }

    // 3. Harmika with Buddha Eyes
    g.fillStyle = '#fbbf24';
    g.fillRect(cx - 16, baseY - 104, 32, 18);
    g.strokeRect(cx - 16, baseY - 104, 32, 18);
    g.fillStyle = '#1e1b4b';
    g.beginPath();
    g.arc(cx - 6, baseY - 95, 2.2, 0, Math.PI * 2);
    g.arc(cx + 6, baseY - 95, 2.2, 0, Math.PI * 2);
    g.fill();

    // 4. Spire (`7` or `13` wheels)
    const wheels = spireDef.wheels || 7;
    const spireCol = hexToCss(spireDef.color ?? 0x78350f);
    for (let i = 0; i < wheels; i++) {
      const u = i / Math.max(1, wheels - 1);
      const rw = 14 * (1 - u * 0.55);
      const wy = baseY - 108 - i * (36 / wheels);
      g.fillStyle = spireCol;
      g.fillRect(cx - rw, wy, rw * 2, 2.6);
    }

    // Finial (`goldSunMoon` vs standard)
    const topY = baseY - 150;
    if (spireDef.sunMoon) {
      g.strokeStyle = '#fde047';
      g.lineWidth = 2.2;
      g.beginPath();
      g.arc(cx, topY - 4, 7, 0.15 * Math.PI, 0.85 * Math.PI, false);
      g.stroke();

      g.fillStyle = '#fef08a';
      g.beginPath();
      g.arc(cx, topY - 8, 4.2, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = spireCol;
      g.beginPath();
      g.arc(cx, topY - 3, 3.5, 0, Math.PI * 2);
      g.fill();
    }

    // Title preview caption at top of canvas
    const titleVal = (inputTitle?.value || '').trim() || (i18n?.t ? i18n.t('stupaBuild.defaultTitle') : '蓮華吉祥塔');
    const pilgrimVal = (inputPilgrim?.value || '').trim() || ctx.community?.getPilgrimName?.() || '雪域行者';
    g.fillStyle = '#fde68a';
    g.font = 'bold 14px "Noto Serif TC", Georgia, serif';
    g.textAlign = 'center';
    g.fillText(`🏛️ ${titleVal} · ${pilgrimVal}`, cx, 20);
  }

  // ------------------------------------------------ 4. Render Build Tab & Samye Tab
  function getMeritStats() {
    return ctx.merit?.getStats?.() || { kora: 0, prostration: 0, lamp: 0, points: 0 };
  }

  function hasAnyLockedSelection(meritStats) {
    for (const cat of STUPA_PART_CATEGORIES) {
      const def = getPartDef(cat, selectedSpec[cat]);
      if (!isPartUnlocked(def, meritStats)) return true;
    }
    return false;
  }

  function renderBuildTab() {
    if (!overlay) return;
    const t = (k, p) => (i18n?.t ? i18n.t(k, p) : k);
    const stats = getMeritStats();

    if (meritStatsRow) {
      meritStatsRow.innerHTML = `
        <span class="stupa-stat-pill">☸ ${escapeHtml(t('stupaBuild.stats.kora'))}: <strong>${stats.kora || 0}</strong></span>
        <span class="stupa-stat-pill">🙏 ${escapeHtml(t('stupaBuild.stats.prostration'))}: <strong>${stats.prostration || 0}</strong></span>
        <span class="stupa-stat-pill">🪔 ${escapeHtml(t('stupaBuild.stats.lamp'))}: <strong>${stats.lamp || 0}</strong></span>
        <span class="stupa-stat-pill">✨ ${escapeHtml(t('stupaBuild.stats.merit'))}: <strong>${stats.points || 0}</strong></span>
      `;
    }

    if (previewLabel) {
      previewLabel.textContent = t('stupaBuild.previewMode.label');
    }
    if (previewCheckbox) {
      previewCheckbox.checked = previewAnyPart;
    }

    // Render 4 Category Part Selectors
    if (partSelectorsWrap) {
      partSelectorsWrap.innerHTML = STUPA_PART_CATEGORIES.map((cat) => {
        const parts = STUPA_PARTS[cat] || [];
        const cardsHtml = parts
          .map((part) => {
            const unlocked = isPartUnlocked(part, stats);
            const selected = selectedSpec[cat] === part.id;
            const reqText = unlocked ? t('stupaBuild.req.unlocked') : formatPartReq(part, i18n);
            const swatchColor = hexToCss(part.color ?? part.trim ?? 0xfbbf24);
            return `
              <button
                type="button"
                class="stupa-part-card ${selected ? 'is-selected' : ''} ${unlocked ? 'is-unlocked' : 'is-locked'}"
                data-part-cat="${cat}"
                data-part-id="${part.id}"
              >
                <div class="stupa-part-card__top">
                  <span class="stupa-part-name">${escapeHtml(t(part.nameKey))}</span>
                  <span class="stupa-part-swatch" style="background:${swatchColor};"></span>
                </div>
                <span class="stupa-part-desc">${escapeHtml(t(part.descKey))}</span>
                <span class="stupa-part-badge ${unlocked ? 'is-unlocked' : 'is-locked'}">${escapeHtml(reqText)}</span>
              </button>
            `;
          })
          .join('');

        return `
          <div class="stupa-cat-block">
            <h3 class="stupa-cat-title">${escapeHtml(t(`stupaBuild.cat.${cat}`))}</h3>
            <div class="stupa-parts-row">${cardsHtml}</div>
          </div>
        `;
      }).join('');
    }

    const anyLocked = hasAnyLockedSelection(stats);
    if (previewWarningEl) {
      previewWarningEl.style.display = anyLocked ? 'block' : 'none';
      previewWarningEl.textContent = t('stupaBuild.previewMode.warning');
    }

    if (formSectionTitle) formSectionTitle.textContent = t('stupaBuild.form.sectionTitle');
    if (labelPilgrim) labelPilgrim.textContent = t('stupaBuild.form.pilgrimName');
    if (inputPilgrim) {
      inputPilgrim.placeholder = t('stupaBuild.form.pilgrimPlaceholder');
      if (!inputPilgrim.value) {
        inputPilgrim.value = ctx.community?.getPilgrimName?.() || t('stupaBuild.defaultPilgrim');
      }
    }
    if (labelTitle) labelTitle.textContent = t('stupaBuild.form.stupaTitle');
    if (inputTitle) {
      inputTitle.placeholder = t('stupaBuild.form.stupaTitlePlaceholder');
      if (!inputTitle.value) {
        const own = ctx.community?.getOwnStupa?.();
        inputTitle.value = own?.title || t('stupaBuild.defaultTitle');
      }
    }
    if (labelMessage) labelMessage.textContent = t('stupaBuild.form.dedication');
    if (inputMessage) {
      inputMessage.placeholder = t('stupaBuild.form.dedicationPlaceholder');
      if (!inputMessage.value) {
        const own = ctx.community?.getOwnStupa?.();
        inputMessage.value = own?.message || t('stupaBuild.defaultMessage');
      }
    }
    if (labelPresets) labelPresets.textContent = t('stupaBuild.form.presetLabel');
    if (presetsRow) {
      presetsRow.innerHTML = [1, 2, 3, 4]
        .map((idx) => {
          const text = t(`stupaBuild.preset.${idx}`);
          return `<button type="button" class="stupa-preset-chip" data-preset-msg="${escapeHtml(text)}">${escapeHtml(text.slice(0, 16))}…</button>`;
        })
        .join('');
    }
    if (btnBuildSubmit) {
      btnBuildSubmit.textContent = t('stupaBuild.btn.build');
    }

    drawStupaPreviewCanvas();
  }

  function renderSamyeTab() {
    if (!overlay) return;
    const t = (k, p) => (i18n?.t ? i18n.t(k, p) : k);
    const prog = ctx.community?.getSamyeProgress?.() || {
      contributedStupas: 324,
      targetStupas: 1008,
      totalKora: 1080,
      totalProstrations: 4320,
      contributors: [],
      myContributedStupas: 0,
    };

    const current = Math.min(1008, Math.max(0, Number(prog.contributedStupas) || 0));
    const max = 1008;
    const pct = ((current / max) * 100).toFixed(1);

    if (samyeTitleEl) samyeTitleEl.textContent = t('stupaBuild.samye.headerTitle');
    if (samyeDescEl) samyeDescEl.textContent = t('stupaBuild.samye.headerDesc');
    if (samyeProgressFill) samyeProgressFill.style.width = `${pct}%`;
    if (samyeProgressText) {
      samyeProgressText.textContent = t('stupaBuild.samye.progressValue', { current, max, pct });
    }

    const activeMilestone = getActiveSamyeMilestone(current);
    const blessingSummary = activeMilestone
      ? `${t(activeMilestone.nameKey)} · ${t('stupaBuild.samye.blessingFmt', {
          exp: Math.round(activeMilestone.buff.expBonus * 100),
          find: activeMilestone.buff.findBonus,
        })}`
      : t('stupaBuild.samye.noBlessing');

    if (samyeTotalsEl) {
      samyeTotalsEl.innerHTML = `
        <span class="stupa-stat-pill">☸ ${escapeHtml(t('stupaBuild.samye.totalKora'))}: <strong>${prog.totalKora}</strong></span>
        <span class="stupa-stat-pill">🙏 ${escapeHtml(t('stupaBuild.samye.totalProstrations'))}: <strong>${prog.totalProstrations}</strong></span>
        <span class="stupa-stat-pill">✨ ${escapeHtml(t('stupaBuild.samye.activeBlessing'))}: <strong>${escapeHtml(blessingSummary)}</strong></span>
      `;
    }

    // 4 Milestone Cards
    if (samyeMilestonesGrid) {
      samyeMilestonesGrid.innerHTML = SAMYE_COOP_MILESTONES.map((m) => {
        const unlocked = current >= m.stupas;
        const buffText = t('stupaBuild.samye.blessingFmt', {
          exp: Math.round(m.buff.expBonus * 100),
          find: m.buff.findBonus,
        });
        const statusText = unlocked
          ? t('stupaBuild.samye.tierUnlocked')
          : t('stupaBuild.samye.tierLocked', { n: m.stupas });
        return `
          <div class="samye-milestone-card ${unlocked ? 'is-unlocked' : ''}">
            <div style="font-size:11px;color:#fcd34d;font-weight:700;">${escapeHtml(t('stupaBuild.tier', { n: m.tier }))} · ${m.stupas} / 1008</div>
            <div style="font-size:14px;font-weight:700;color:#fef3c7;margin:4px 0;">${escapeHtml(t(m.nameKey))}</div>
            <div style="font-size:12px;color:#86efac;margin-bottom:4px;">${escapeHtml(buffText)}</div>
            <div style="font-size:11px;color:${unlocked ? '#fde047' : '#94a3b8'};">${escapeHtml(statusText)}</div>
          </div>
        `;
      }).join('');
    }

    // Merit Contribution Panel
    const stats = getMeritStats();
    const spentMerit = getSpentSamyeMerit();
    const unspentMerit = Math.max(0, (Number(stats.points) || 0) - spentMerit);
    const buildableStupas = Math.floor(unspentMerit / MERIT_COST_PER_SAMYE_STUPA);

    if (samyeContributeTitle) samyeContributeTitle.textContent = t('stupaBuild.samye.contributeTitle');
    if (samyeContributeDesc) samyeContributeDesc.textContent = t('stupaBuild.samye.contributeDesc');
    if (samyeAvailableMeritEl) {
      samyeAvailableMeritEl.textContent = t('stupaBuild.samye.availableMerit', {
        merit: unspentMerit,
        stupas: buildableStupas,
      });
    }
    if (samyeSpentMeritEl) {
      samyeSpentMeritEl.textContent = t('stupaBuild.samye.spentMerit', {
        stupas: prog.myContributedStupas || 0,
        merit: spentMerit,
      });
    }
    if (samyeLabelNote) samyeLabelNote.textContent = t('stupaBuild.samye.noteLabel');
    if (samyeInputNote && !samyeInputNote.placeholder) {
      samyeInputNote.placeholder = t('stupaBuild.samye.notePlaceholder');
    }
    if (samyeBtnContribute1) {
      samyeBtnContribute1.textContent =
        buildableStupas >= 1
          ? t('stupaBuild.samye.btnContribute1')
          : t('stupaBuild.samye.btnDevotional');
    }
    if (samyeBtnContributeAll) {
      const nAll = Math.max(1, buildableStupas);
      samyeBtnContributeAll.textContent = t('stupaBuild.samye.btnContributeAll', { n: nAll });
      samyeBtnContributeAll.style.display = buildableStupas > 1 ? 'inline-block' : 'none';
    }

    // Recent Contributors List
    if (samyeContributorsTitle) {
      samyeContributorsTitle.textContent = t('stupaBuild.samye.contributorsTitle');
    }
    if (samyeContributorsList) {
      const contributors = Array.isArray(prog.contributors) ? prog.contributors : [];
      if (contributors.length === 0) {
        samyeContributorsList.innerHTML = `<div style="color:#94a3b8;font-size:12.5px;">${escapeHtml(t('stupaBuild.samye.contributorsEmpty'))}</div>`;
      } else {
        samyeContributorsList.innerHTML = contributors
          .slice(0, 12)
          .map((c) => {
            const line = t('stupaBuild.samye.contributorItem', {
              name: c.pilgrimName || '雪域行者',
              stupas: c.stupas || 1,
              kora: c.kora || 0,
              prostrations: c.prostrations || 0,
            });
            return `
              <div class="samye-contributor-row">
                <div style="color:#fde68a;font-weight:600;">☸ ${escapeHtml(line)}</div>
                ${c.message ? `<div style="color:#cbd5e1;font-style:italic;margin-top:2px;">「${escapeHtml(c.message)}」</div>` : ''}
              </div>
            `;
          })
          .join('');
      }
    }
  }

  function renderAll() {
    if (!overlay) return;
    const t = (k, p) => (i18n?.t ? i18n.t(k, p) : k);
    if (titleEl) titleEl.textContent = t('stupaBuild.title');
    if (subtitleEl) subtitleEl.textContent = t('stupaBuild.subtitle');
    if (tabBuildBtn) {
      tabBuildBtn.textContent = t('stupaBuild.tab.build');
      tabBuildBtn.classList.toggle('is-active', activeTab === 'build');
    }
    if (tabSamyeBtn) {
      tabSamyeBtn.textContent = t('stupaBuild.tab.samye');
      tabSamyeBtn.classList.toggle('is-active', activeTab === 'samye');
    }
    if (paneBuild) paneBuild.classList.toggle('is-active', activeTab === 'build');
    if (paneSamye) paneSamye.classList.toggle('is-active', activeTab === 'samye');
    if (utilBtn) {
      utilBtn.title = t('stupaBuild.btn.openTooltip');
    }

    renderBuildTab();
    renderSamyeTab();
  }

  // ------------------------------------------------ 5. Event Handlers
  function handleBuildStupa() {
    const t = (k, p) => (i18n?.t ? i18n.t(k, p) : k);
    const stats = getMeritStats();

    // Resolve spec: if any selected part is locked (and not in debug mode), fallback locked parts to unlocked defaults
    let hadLockedFallback = false;
    const finalSpec = { ...selectedSpec };
    for (const cat of STUPA_PART_CATEGORIES) {
      const def = getPartDef(cat, finalSpec[cat]);
      if (!isPartUnlocked(def, stats) && !ctx.debug?.enabled) {
        finalSpec[cat] = DEFAULT_STUPA_SPEC[cat];
        hadLockedFallback = true;
      }
    }
    selectedSpec = normalizeStupaSpec(finalSpec);

    const pilgrimName = (inputPilgrim?.value || '').trim() || t('stupaBuild.defaultPilgrim');
    const title = (inputTitle?.value || '').trim() || t('stupaBuild.defaultTitle');
    const message = (inputMessage?.value || '').trim() || t('stupaBuild.defaultMessage');

    ctx.community?.saveOwnStupa?.({
      pilgrimName,
      title,
      message,
      spec: selectedSpec,
    });

    ctx.personalStupa?.rebuildGrove?.();
    bus.emit('sfx', { name: 'bell' });

    if (hadLockedFallback) {
      bus.emit('toast', { key: 'toast.stupaLockedFallback', kind: 'warning' });
    }
    bus.emit('toast', {
      key: 'toast.stupaBuilt',
      params: { title },
      kind: 'merit',
    });

    renderAll();
  }

  function handleContributeSamye(useAll = false) {
    const t = (k, p) => (i18n?.t ? i18n.t(k, p) : k);
    const stats = getMeritStats();
    const spent = getSpentSamyeMerit();
    const unspent = Math.max(0, (Number(stats.points) || 0) - spent);
    const maxBuildable = Math.floor(unspent / MERIT_COST_PER_SAMYE_STUPA);

    let stupasToAdd = 1;
    let meritToSpend = 0;

    if (maxBuildable >= 1) {
      stupasToAdd = useAll ? maxBuildable : 1;
      meritToSpend = stupasToAdd * MERIT_COST_PER_SAMYE_STUPA;
      addSpentSamyeMerit(meritToSpend);
    }

    const pilgrimName =
      (inputPilgrim?.value || '').trim() ||
      ctx.community?.getPilgrimName?.() ||
      t('stupaBuild.defaultPilgrim');
    const message =
      (samyeInputNote?.value || '').trim() ||
      t('stupaBuild.preset.2');

    const updated = ctx.community?.contributeSamye?.({
      stupas: stupasToAdd,
      kora: Math.max(1, Number(stats.kora) || 1),
      prostrations: Math.max(3, Number(stats.prostration) || 3),
      pilgrimName,
      message,
    });

    ctx.personalStupa?.refreshSamyeGlobalBlessing?.();
    bus.emit('sfx', { name: 'bell' });
    bus.emit('toast', {
      key: meritToSpend > 0 ? 'toast.samyeContributed' : 'toast.samyeNoMerit',
      params: {
        n: stupasToAdd,
        total: updated?.contributedStupas ?? 325,
      },
      kind: 'merit',
    });

    if (samyeInputNote) samyeInputNote.value = '';
    renderAll();
  }

  if (overlay) {
    tabBuildBtn?.addEventListener('click', () => {
      activeTab = 'build';
      renderAll();
    });
    tabSamyeBtn?.addEventListener('click', () => {
      activeTab = 'samye';
      renderAll();
    });
    closeBtn?.addEventListener('click', () => close());
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) close();
    });

    previewCheckbox?.addEventListener('change', () => {
      previewAnyPart = Boolean(previewCheckbox.checked);
      renderBuildTab();
    });

    partSelectorsWrap?.addEventListener('click', (ev) => {
      const card = ev.target.closest('[data-part-cat]');
      if (!card) return;
      const cat = card.getAttribute('data-part-cat');
      const partId = card.getAttribute('data-part-id');
      if (!cat || !partId) return;

      const stats = getMeritStats();
      const def = getPartDef(cat, partId);
      if (!isPartUnlocked(def, stats) && !previewAnyPart && !ctx.debug?.enabled) {
        // Auto-enable Pure-Vision Preview when clicking a locked part so players can inspect it
        previewAnyPart = true;
      }
      selectedSpec[cat] = partId;
      bus.emit('sfx', { name: 'click' });
      renderBuildTab();
    });

    presetsRow?.addEventListener('click', (ev) => {
      const chip = ev.target.closest('[data-preset-msg]');
      if (!chip || !inputMessage) return;
      inputMessage.value = chip.getAttribute('data-preset-msg') || '';
      drawStupaPreviewCanvas();
    });

    inputPilgrim?.addEventListener('input', () => drawStupaPreviewCanvas());
    inputTitle?.addEventListener('input', () => drawStupaPreviewCanvas());

    btnBuildSubmit?.addEventListener('click', () => handleBuildStupa());
    samyeBtnContribute1?.addEventListener('click', () => handleContributeSamye(false));
    samyeBtnContributeAll?.addEventListener('click', () => handleContributeSamye(true));
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && modalOpen) {
        close();
      }
    });
  }

  // ------------------------------------------------ 6. Open / Close / Toggle API
  function open(tab = 'build') {
    if (tab === 'build' || tab === 'samye') {
      activeTab = tab;
    }
    const own = ctx.community?.getOwnStupa?.();
    if (own?.spec) {
      selectedSpec = normalizeStupaSpec(own.spec);
    }
    modalOpen = true;
    state.uiOpen = true;
    overlay?.classList.remove('is-hidden');
    renderAll();
  }

  function close() {
    if (!modalOpen) return;
    modalOpen = false;
    state.uiOpen = false;
    overlay?.classList.add('is-hidden');
  }

  function toggle(tab) {
    if (modalOpen) close();
    else open(tab || activeTab);
  }

  function update() {
    if (!utilBtn) ensureUtilityButton();
  }

  bus.on('community:changed', () => {
    if (modalOpen) renderAll();
  });
  bus.on('merit', () => {
    if (modalOpen) renderAll();
  });
  i18n?.onChange?.(() => {
    renderAll();
  });

  const api = {
    update,
    open,
    close,
    toggle,
    isOpen: () => modalOpen,
    getSelectedSpec: () => ({ ...selectedSpec }),
    setSelectedSpec: (spec) => {
      selectedSpec = normalizeStupaSpec({ ...selectedSpec, ...spec });
      if (modalOpen) renderBuildTab();
      return { ...selectedSpec };
    },
    buildStupa: handleBuildStupa,
    contributeSamye: handleContributeSamye,
  };

  ctx.stupaBuilderUi = api;

  ctx.debug?.register('stupaBuilder', {
    open: (tab) => api.open(tab),
    close: () => api.close(),
    toggle: (tab) => api.toggle(tab),
    isOpen: () => api.isOpen(),
    setSpec: (spec) => api.setSelectedSpec(spec),
    build: () => api.buildStupa(),
    contributeSamye: (all) => api.contributeSamye(all),
  });

  return api;
}
