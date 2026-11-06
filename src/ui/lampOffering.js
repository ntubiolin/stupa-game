/**
 * Butter-Lamp Offering & Pilgrim Lamp Wall UI (`src/ui/lampOffering.js`) — Ticket #59
 *
 * Features:
 *  - Injects scoped Tibetan dark-gold glassmorphic styles (`#lamp-offering-styles`)
 *  - Adds `🪔` button (`#btn-lamp-offering-toggle`) into `.utility-bar` and binds `KeyL` shortcut
 *  - Opens when a player lights a butter lamp at a station (`lamp:litByPlayer` / `lamp:stationInteract`)
 *    or clicks the utility bar button
 *  - Tab 1: Offer a Lamp & Dedication Form (Pilgrim Name, Shrine selector, 5 Prayer Intention pills,
 *           5 classical Buddhist dedication presets, 120-char custom prayer input)
 *  - Tab 2: Pilgrim Lamp Wall (十方祈願燈海) filterable by Shrine & Intention, showing live burn time
 *           and "🙏 Rejoice & Add Ghee (+120s)" button
 *  - Tab 3 / Bar: Offline/Static Share Code (`STUPA-V1:...`) export & import
 */
import '../i18n/community.js';

const TAG_KEYS = ['peace', 'wisdom', 'obstacle', 'beings', 'bodhicitta'];
const PRESET_IDS = [1, 2, 3, 4, 5];
const BASE_BURN_SEC = 210;

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDuration(sec) {
  const total = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lamp-offering-styles')) return;

  const style = document.createElement('style');
  style.id = 'lamp-offering-styles';
  style.textContent = `
    .lamp-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 880;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: radial-gradient(circle at 50% 40%, rgba(44, 26, 12, 0.55) 0%, rgba(10, 6, 18, 0.82) 100%);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      pointer-events: auto;
      transition: opacity 0.22s ease;
    }
    .lamp-modal-backdrop.is-hidden {
      display: none !important;
      pointer-events: none;
    }
    .lamp-modal-card {
      width: min(760px, 95vw);
      max-height: min(86vh, 760px);
      display: flex;
      flex-direction: column;
      border-radius: 18px;
      background: linear-gradient(165deg, rgba(28, 18, 34, 0.94) 0%, rgba(18, 12, 24, 0.97) 100%);
      border: 1px solid rgba(244, 206, 126, 0.45);
      box-shadow: 0 22px 60px rgba(0, 0, 0, 0.72), 0 0 36px rgba(240, 163, 58, 0.16), inset 0 1px 0 rgba(255, 240, 205, 0.22);
      color: var(--col-text, #f9f3e8);
      overflow: hidden;
    }
    .lamp-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 22px 12px;
      border-bottom: 1px solid rgba(232, 189, 106, 0.22);
      background: linear-gradient(90deg, rgba(120, 28, 36, 0.34) 0%, rgba(238, 195, 108, 0.08) 100%);
    }
    .lamp-modal-kicker {
      font-size: 0.74rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--col-gold, #eec36c);
      margin-bottom: 4px;
    }
    .lamp-modal-title {
      margin: 0;
      font-family: var(--font-serif, 'Noto Serif TC', Georgia, serif);
      font-size: 1.35rem;
      font-weight: 700;
      color: #fff6e4;
      text-shadow: 0 2px 12px rgba(240, 147, 43, 0.35);
    }
    .lamp-modal-subtitle {
      margin: 4px 0 0;
      font-size: 0.85rem;
      color: var(--col-text-muted, rgba(245, 234, 214, 0.72));
    }
    .lamp-modal-close {
      background: rgba(255, 244, 224, 0.08);
      border: 1px solid rgba(232, 189, 106, 0.32);
      color: #f9f3e8;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .lamp-modal-close:hover {
      background: rgba(238, 195, 108, 0.24);
      border-color: rgba(244, 206, 126, 0.75);
      transform: scale(1.05);
    }
    .lamp-tabs {
      display: flex;
      gap: 8px;
      padding: 10px 22px;
      border-bottom: 1px solid rgba(232, 189, 106, 0.18);
      background: rgba(12, 8, 18, 0.45);
    }
    .lamp-tab-btn {
      padding: 7px 15px;
      border-radius: 999px;
      border: 1px solid rgba(232, 189, 106, 0.26);
      background: rgba(255, 244, 224, 0.05);
      color: rgba(249, 243, 232, 0.78);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.16s ease;
    }
    .lamp-tab-btn:hover {
      background: rgba(238, 195, 108, 0.15);
      color: #fff;
    }
    .lamp-tab-btn.is-active {
      background: linear-gradient(135deg, rgba(240, 147, 43, 0.36) 0%, rgba(120, 28, 36, 0.65) 100%);
      border-color: rgba(244, 206, 126, 0.82);
      color: #fff7e6;
      box-shadow: 0 0 14px rgba(240, 163, 58, 0.28);
    }
    .lamp-modal-body {
      padding: 18px 22px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .lamp-pane.is-hidden {
      display: none !important;
    }
    .lamp-form-row {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 14px;
    }
    @media (max-width: 640px) {
      .lamp-form-row {
        grid-template-columns: 1fr;
      }
    }
    .lamp-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .lamp-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--col-gold, #eec36c);
      letter-spacing: 0.03em;
    }
    .lamp-input,
    .lamp-textarea,
    .lamp-select {
      width: 100%;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1px solid rgba(232, 189, 106, 0.34);
      background: rgba(10, 7, 16, 0.68);
      color: #fff8ec;
      font-family: inherit;
      font-size: 0.92rem;
      outline: none;
      user-select: text;
      -webkit-user-select: text;
    }
    .lamp-input:focus,
    .lamp-textarea:focus,
    .lamp-select:focus {
      border-color: rgba(244, 206, 126, 0.85);
      box-shadow: 0 0 0 2px rgba(240, 163, 58, 0.22);
    }
    .lamp-textarea {
      resize: vertical;
      min-height: 70px;
      line-height: 1.45;
    }
    .lamp-pill-group {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .lamp-pill {
      padding: 5px 12px;
      border-radius: 999px;
      border: 1px solid rgba(232, 189, 106, 0.3);
      background: rgba(255, 244, 224, 0.06);
      color: rgba(249, 243, 232, 0.85);
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .lamp-pill:hover {
      border-color: rgba(244, 206, 126, 0.65);
      background: rgba(238, 195, 108, 0.16);
    }
    .lamp-pill.is-active {
      background: linear-gradient(135deg, rgba(238, 195, 108, 0.34), rgba(240, 147, 43, 0.28));
      border-color: #f4ce7e;
      color: #fff9ec;
      font-weight: 600;
      box-shadow: 0 0 10px rgba(238, 195, 108, 0.25);
    }
    .lamp-preset-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .lamp-preset-btn {
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px dashed rgba(232, 189, 106, 0.36);
      background: rgba(255, 236, 196, 0.05);
      color: #f5dfb8;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.14s ease;
    }
    .lamp-preset-btn:hover {
      background: rgba(238, 195, 108, 0.18);
      border-style: solid;
      color: #fff;
    }
    .lamp-submit-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }
    .lamp-submit-btn {
      width: 100%;
      padding: 12px 20px;
      border-radius: 12px;
      border: 1px solid rgba(255, 222, 145, 0.78);
      background: linear-gradient(135deg, #d88928 0%, #8f2324 100%);
      color: #fffaf0;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(216, 137, 40, 0.35);
      transition: all 0.18s ease;
    }
    .lamp-submit-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 28px rgba(240, 163, 58, 0.48);
      filter: brightness(1.08);
    }
    .lamp-reward-hint {
      font-size: 0.78rem;
      color: rgba(238, 195, 108, 0.85);
      text-align: center;
    }
    .lamp-wall-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(232, 189, 106, 0.16);
    }
    .lamp-wall-stats {
      font-size: 0.84rem;
      color: var(--col-gold, #eec36c);
      font-weight: 600;
    }
    .lamp-wall-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 12px;
    }
    .lamp-card {
      padding: 13px 15px;
      border-radius: 13px;
      border: 1px solid rgba(232, 189, 106, 0.26);
      background: linear-gradient(160deg, rgba(36, 23, 38, 0.75) 0%, rgba(19, 13, 25, 0.86) 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 9px;
      transition: border-color 0.16s ease, transform 0.16s ease;
    }
    .lamp-card:hover {
      border-color: rgba(244, 206, 126, 0.58);
      transform: translateY(-1px);
    }
    .lamp-card.is-own {
      border-color: rgba(244, 206, 126, 0.72);
      box-shadow: 0 0 18px rgba(240, 163, 58, 0.15);
    }
    .lamp-card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .lamp-card__author {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 700;
      color: #fff5e0;
      font-size: 0.94rem;
    }
    .lamp-card__flame {
      display: inline-block;
      animation: lampFlamePulse 1.8s infinite ease-in-out;
      filter: drop-shadow(0 0 6px rgba(255, 175, 55, 0.85));
    }
    @keyframes lampFlamePulse {
      0%, 100% { transform: scale(1) rotate(-2deg); opacity: 0.95; }
      50% { transform: scale(1.14) rotate(2deg); opacity: 1; }
    }
    .lamp-card__badges {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }
    .lamp-badge {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      background: rgba(238, 195, 108, 0.16);
      border: 1px solid rgba(238, 195, 108, 0.38);
      color: #f7dba0;
    }
    .lamp-badge--own {
      background: rgba(72, 198, 184, 0.2);
      border-color: rgba(72, 198, 184, 0.55);
      color: #8ff0e4;
    }
    .lamp-card__msg {
      margin: 0;
      font-size: 0.88rem;
      line-height: 1.48;
      color: rgba(252, 244, 230, 0.92);
      font-family: var(--font-serif, 'Noto Serif TC', Georgia, serif);
      word-break: break-word;
    }
    .lamp-card__foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 6px;
      border-top: 1px solid rgba(232, 189, 106, 0.12);
    }
    .lamp-card__meta {
      font-size: 0.75rem;
      color: rgba(245, 234, 214, 0.65);
    }
    .lamp-rejoice-btn {
      padding: 5px 11px;
      border-radius: 999px;
      border: 1px solid rgba(244, 206, 126, 0.48);
      background: rgba(240, 147, 43, 0.18);
      color: #ffeaad;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .lamp-rejoice-btn:hover:not(:disabled) {
      background: rgba(240, 147, 43, 0.38);
      border-color: #ffe299;
      transform: scale(1.03);
    }
    .lamp-rejoice-btn.is-rejoiced,
    .lamp-rejoice-btn:disabled {
      background: rgba(72, 198, 184, 0.14);
      border-color: rgba(72, 198, 184, 0.4);
      color: #9be7de;
      cursor: default;
    }
    .lamp-share-box {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px;
      border-radius: 12px;
      border: 1px solid rgba(232, 189, 106, 0.25);
      background: rgba(12, 8, 18, 0.55);
    }
    .lamp-share-row {
      display: flex;
      gap: 8px;
    }
    .lamp-share-btn {
      padding: 8px 14px;
      border-radius: 10px;
      border: 1px solid rgba(244, 206, 126, 0.55);
      background: rgba(238, 195, 108, 0.2);
      color: #fff6e0;
      font-weight: 600;
      font-size: 0.84rem;
      cursor: pointer;
      white-space: nowrap;
    }
    .lamp-share-btn:hover {
      background: rgba(238, 195, 108, 0.34);
    }
    .lamp-modal-footer {
      padding: 10px 22px;
      border-top: 1px solid rgba(232, 189, 106, 0.18);
      background: rgba(10, 6, 16, 0.65);
      font-size: 0.78rem;
      color: rgba(245, 234, 214, 0.62);
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

export function createLampOfferingUi(ctx) {
  const { state, bus, i18n } = ctx;
  injectStyles();

  const uiRoot = document.getElementById('ui') || document.body;

  // Modal DOM
  const backdrop = document.createElement('div');
  backdrop.id = 'lamp-offering-modal';
  backdrop.className = 'lamp-modal-backdrop is-hidden';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'lamp-modal-title');

  backdrop.innerHTML = `
    <div class="lamp-modal-card glass-panel">
      <header class="lamp-modal-header">
        <div>
          <div id="lamp-modal-kicker" class="lamp-modal-kicker" data-i18n="lamp.modal.kicker"></div>
          <h2 id="lamp-modal-title" class="lamp-modal-title" data-i18n="lamp.modal.title"></h2>
          <p id="lamp-modal-subtitle" class="lamp-modal-subtitle" data-i18n="lamp.modal.subtitle"></p>
        </div>
        <button id="btn-lamp-modal-close" type="button" class="lamp-modal-close" aria-label="Close">✕</button>
      </header>

      <nav class="lamp-tabs" role="tablist">
        <button id="lamp-tab-offer" type="button" class="lamp-tab-btn is-active" data-lamp-tab="offer" data-i18n="lamp.tab.offer"></button>
        <button id="lamp-tab-wall" type="button" class="lamp-tab-btn" data-lamp-tab="wall" data-i18n="lamp.tab.wall"></button>
        <button id="lamp-tab-share" type="button" class="lamp-tab-btn" data-lamp-tab="share" data-i18n="lamp.tab.share"></button>
      </nav>

      <div class="lamp-modal-body">
        <!-- PANE 1: OFFER A LAMP -->
        <section id="lamp-pane-offer" class="lamp-pane">
          <div class="lamp-form-row">
            <div class="lamp-field">
              <label for="lamp-pilgrim-name" class="lamp-label" data-i18n="lamp.form.pilgrimLabel"></label>
              <input id="lamp-pilgrim-name" type="text" class="lamp-input" maxlength="24" />
            </div>
            <div class="lamp-field">
              <label for="lamp-station-select" class="lamp-label" data-i18n="lamp.form.stationLabel"></label>
              <select id="lamp-station-select" class="lamp-select">
                <option value="0" data-i18n="lamp.station.0"></option>
                <option value="1" data-i18n="lamp.station.1"></option>
                <option value="2" data-i18n="lamp.station.2"></option>
              </select>
            </div>
          </div>

          <div class="lamp-field" style="margin-top: 12px;">
            <span class="lamp-label" data-i18n="lamp.form.tagLabel"></span>
            <div id="lamp-offer-tags" class="lamp-pill-group"></div>
          </div>

          <div class="lamp-field" style="margin-top: 12px;">
            <span class="lamp-label" data-i18n="lamp.form.presetLabel"></span>
            <div id="lamp-preset-list" class="lamp-preset-list"></div>
          </div>

          <div class="lamp-field" style="margin-top: 12px;">
            <label for="lamp-offer-message" class="lamp-label" data-i18n="lamp.form.messageLabel"></label>
            <textarea id="lamp-offer-message" class="lamp-textarea" maxlength="120" rows="3"></textarea>
          </div>

          <div class="lamp-submit-wrap" style="margin-top: 14px;">
            <button id="btn-lamp-offer-submit" type="button" class="lamp-submit-btn" data-i18n="lamp.form.submitBtn"></button>
            <span class="lamp-reward-hint" data-i18n="lamp.form.rewardHint"></span>
          </div>
        </section>

        <!-- PANE 2: PILGRIM LAMP WALL -->
        <section id="lamp-pane-wall" class="lamp-pane is-hidden">
          <div class="lamp-wall-toolbar">
            <div id="lamp-wall-stats" class="lamp-wall-stats"></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <select id="lamp-wall-filter-station" class="lamp-select" style="width:auto;padding:5px 10px;font-size:0.8rem;">
                <option value="all" data-i18n="lamp.station.all"></option>
                <option value="0" data-i18n="lamp.station.0"></option>
                <option value="1" data-i18n="lamp.station.1"></option>
                <option value="2" data-i18n="lamp.station.2"></option>
              </select>
              <select id="lamp-wall-filter-tag" class="lamp-select" style="width:auto;padding:5px 10px;font-size:0.8rem;">
                <option value="all" data-i18n="lamp.tag.all"></option>
                <option value="peace" data-i18n="tag.peace"></option>
                <option value="wisdom" data-i18n="tag.wisdom"></option>
                <option value="obstacle" data-i18n="tag.obstacle"></option>
                <option value="beings" data-i18n="tag.beings"></option>
                <option value="bodhicitta" data-i18n="tag.bodhicitta"></option>
              </select>
            </div>
          </div>

          <div id="lamp-wall-grid" class="lamp-wall-grid" style="margin-top: 10px;"></div>
        </section>

        <!-- PANE 3: SHARE CODE -->
        <section id="lamp-pane-share" class="lamp-pane is-hidden">
          <div class="lamp-share-box">
            <div class="lamp-label" data-i18n="lamp.share.title"></div>
            <p style="margin:0;font-size:0.84rem;color:rgba(245,234,214,0.78);" data-i18n="lamp.share.desc"></p>

            <div class="lamp-field">
              <label for="lamp-share-export-input" class="lamp-label" data-i18n="lamp.share.exportLabel"></label>
              <div class="lamp-share-row">
                <input id="lamp-share-export-input" type="text" class="lamp-input" readonly />
                <button id="btn-lamp-share-copy" type="button" class="lamp-share-btn" data-i18n="lamp.share.copyBtn"></button>
              </div>
            </div>

            <div class="lamp-field">
              <label for="lamp-share-import-input" class="lamp-label" data-i18n="lamp.share.importLabel"></label>
              <div class="lamp-share-row">
                <input id="lamp-share-import-input" type="text" class="lamp-input" />
                <button id="btn-lamp-share-import" type="button" class="lamp-share-btn" data-i18n="lamp.share.importBtn"></button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="lamp-modal-footer" data-i18n="lamp.modal.closeHint"></footer>
    </div>
  `;

  uiRoot.appendChild(backdrop);

  const closeBtn = backdrop.querySelector('#btn-lamp-modal-close');
  const tabBtns = Array.from(backdrop.querySelectorAll('[data-lamp-tab]'));
  const paneOffer = backdrop.querySelector('#lamp-pane-offer');
  const paneWall = backdrop.querySelector('#lamp-pane-wall');
  const paneShare = backdrop.querySelector('#lamp-pane-share');

  const nameInput = backdrop.querySelector('#lamp-pilgrim-name');
  const stationSelect = backdrop.querySelector('#lamp-station-select');
  const offerTagsEl = backdrop.querySelector('#lamp-offer-tags');
  const presetListEl = backdrop.querySelector('#lamp-preset-list');
  const messageInput = backdrop.querySelector('#lamp-offer-message');
  const submitBtn = backdrop.querySelector('#btn-lamp-offer-submit');

  const wallStatsEl = backdrop.querySelector('#lamp-wall-stats');
  const wallFilterStation = backdrop.querySelector('#lamp-wall-filter-station');
  const wallFilterTag = backdrop.querySelector('#lamp-wall-filter-tag');
  const wallGridEl = backdrop.querySelector('#lamp-wall-grid');

  const shareExportInput = backdrop.querySelector('#lamp-share-export-input');
  const shareCopyBtn = backdrop.querySelector('#btn-lamp-share-copy');
  const shareImportInput = backdrop.querySelector('#lamp-share-import-input');
  const shareImportBtn = backdrop.querySelector('#btn-lamp-share-import');

  let modalOpen = false;
  let activeTab = 'offer';
  let selectedStationIdx = 0;
  let selectedLampIdx = 0;
  let selectedTag = 'peace';
  let filterStation = 'all';
  let filterTag = 'all';
  let openedFromStationLight = false;
  let utilityBtnAttached = false;

  function ensureUtilityButton() {
    if (utilityBtnAttached) return;
    const utilBar = document.querySelector('.utility-bar');
    if (!utilBar) return;
    if (document.getElementById('btn-lamp-offering-toggle')) {
      utilityBtnAttached = true;
      return;
    }
    const btn = document.createElement('button');
    btn.id = 'btn-lamp-offering-toggle';
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.setAttribute('aria-label', i18n.t('hud.lampWall'));
    btn.title = i18n.t('hud.lampWall');
    btn.innerHTML = '<span>🪔</span>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle({ tab: 'wall' });
    });
    utilBar.insertBefore(btn, utilBar.firstChild);
    utilityBtnAttached = true;
  }

  function localizeStaticElements() {
    const nodes = backdrop.querySelectorAll('[data-i18n]');
    for (const el of nodes) {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = i18n.t(key);
    }
    nameInput.placeholder = i18n.t('lamp.form.pilgrimPlaceholder');
    messageInput.placeholder = i18n.t('lamp.form.messagePlaceholder');
    shareImportInput.placeholder = i18n.t('lamp.share.importPlaceholder');

    const utilBtn = document.getElementById('btn-lamp-offering-toggle');
    if (utilBtn) {
      utilBtn.title = i18n.t('hud.lampWall');
      utilBtn.setAttribute('aria-label', i18n.t('hud.lampWall'));
    }
  }

  function renderOfferControls() {
    offerTagsEl.innerHTML = TAG_KEYS.map((tag) => {
      const activeCls = tag === selectedTag ? 'is-active' : '';
      return `<button type="button" class="lamp-pill ${activeCls}" data-select-tag="${tag}">${escapeHtml(i18n.t(`tag.${tag}`))}</button>`;
    }).join('');

    presetListEl.innerHTML = PRESET_IDS.map((id) => {
      return `<button type="button" class="lamp-preset-btn" data-preset-id="${id}">${escapeHtml(i18n.t(`lamp.preset.${id}.label`))}</button>`;
    }).join('');
  }

  function renderWall() {
    const allLamps = ctx.community?.getLamps?.() || [];
    const totalRejoices = allLamps.reduce((acc, l) => acc + (Number(l.rejoiceCount) || 0), 0);
    wallStatsEl.textContent = i18n.t('lamp.wall.stats', {
      total: allLamps.length,
      rejoices: totalRejoices,
    });

    const filtered = allLamps.filter((item) => {
      if (filterStation !== 'all' && String(item.stationIdx) !== String(filterStation)) {
        return false;
      }
      if (filterTag !== 'all' && item.tag !== filterTag) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      wallGridEl.innerHTML = `<div style="grid-column:1/-1;padding:24px;text-align:center;color:rgba(245,234,214,0.68);">${escapeHtml(i18n.t('lamp.wall.empty'))}</div>`;
      return;
    }

    wallGridEl.innerHTML = filtered
      .map((item) => {
        const tagLabel = escapeHtml(i18n.t(`tag.${item.tag || 'peace'}`));
        const stationLabel = escapeHtml(i18n.t(`lamp.station.${item.stationIdx || 0}`));
        const hasRejoiced = Boolean(ctx.community?.hasRejoicedLamp?.(item.id));
        const liveStationLamp = ctx.lamps?.stations?.[item.stationIdx]?.lamps?.[item.lampIdx];
        const remainingSec = liveStationLamp?.lit
          ? liveStationLamp.burnRemaining
          : BASE_BURN_SEC + (Number(item.burnBonusSec) || 0);
        const burnText = escapeHtml(
          i18n.t('lamp.wall.burnTime', { time: formatDuration(remainingSec) })
        );
        const btnLabel = hasRejoiced
          ? escapeHtml(i18n.t('lamp.wall.rejoicedBtn', { count: item.rejoiceCount || 1 }))
          : escapeHtml(i18n.t('lamp.wall.rejoiceBtn'));

        return `
          <article class="lamp-card ${item.isOwn ? 'is-own' : ''}" data-lamp-card="${escapeHtml(item.id)}">
            <div class="lamp-card__head">
              <div class="lamp-card__author">
                <span class="lamp-card__flame" aria-hidden="true">🪔</span>
                <span>${escapeHtml(item.pilgrimName)}</span>
              </div>
              <div class="lamp-card__badges">
                ${item.isOwn ? `<span class="lamp-badge lamp-badge--own">${escapeHtml(i18n.t('lamp.wall.ownBadge'))}</span>` : ''}
                <span class="lamp-badge">${tagLabel}</span>
              </div>
            </div>
            <p class="lamp-card__msg">「${escapeHtml(item.message)}」</p>
            <div class="lamp-card__foot">
              <span class="lamp-card__meta">${stationLabel} · ${burnText}</span>
              <button type="button" class="lamp-rejoice-btn ${hasRejoiced ? 'is-rejoiced' : ''}" data-rejoice-lamp="${escapeHtml(item.id)}" ${hasRejoiced ? 'disabled' : ''}>
                ${btnLabel}
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function renderShareCode() {
    if (shareExportInput && ctx.community?.exportShareCode) {
      shareExportInput.value = ctx.community.exportShareCode('all');
    }
  }

  function setTab(tabName) {
    activeTab = tabName === 'wall' || tabName === 'share' ? tabName : 'offer';
    for (const btn of tabBtns) {
      btn.classList.toggle('is-active', btn.getAttribute('data-lamp-tab') === activeTab);
    }
    paneOffer.classList.toggle('is-hidden', activeTab !== 'offer');
    paneWall.classList.toggle('is-hidden', activeTab !== 'wall');
    paneShare.classList.toggle('is-hidden', activeTab !== 'share');

    if (activeTab === 'offer') {
      renderOfferControls();
    } else if (activeTab === 'wall') {
      renderWall();
    } else if (activeTab === 'share') {
      renderShareCode();
    }
  }

  function open(opts = {}) {
    if (ctx.dialogue?.isOpen?.()) return;
    ensureUtilityButton();
    modalOpen = true;
    state.uiOpen = true;

    if (typeof opts.stationIdx === 'number') {
      selectedStationIdx = Math.max(0, Math.min(2, opts.stationIdx));
      stationSelect.value = String(selectedStationIdx);
    }
    if (typeof opts.lampIdx === 'number') {
      selectedLampIdx = Math.max(0, Math.min(11, opts.lampIdx));
    }
    openedFromStationLight = Boolean(opts.fromStationLight);

    localizeStaticElements();
    nameInput.value = ctx.community?.getPilgrimName?.() || '';
    if (!messageInput.value.trim()) {
      messageInput.value = i18n.t('lamp.preset.1.text');
    }

    setTab(opts.tab || 'offer');
    backdrop.classList.remove('is-hidden');
  }

  function close() {
    if (!modalOpen) return;
    modalOpen = false;
    openedFromStationLight = false;
    backdrop.classList.add('is-hidden');
    state.uiOpen = Boolean(
      ctx.dialogue?.isOpen?.() ||
        ctx.inventoryUi?.isOpen?.() ||
        ctx.stupaBuilderUi?.isOpen?.()
    );
  }

  function toggle(opts = {}) {
    if (modalOpen) close();
    else open(opts);
  }

  // ---------------------------------------------------------------- Event Handlers
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      close();
    }
  });

  for (const btn of tabBtns) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setTab(btn.getAttribute('data-lamp-tab'));
      bus.emit('sfx', { name: 'step' });
    });
  }

  stationSelect.addEventListener('change', () => {
    selectedStationIdx = Math.max(0, Math.min(2, Number(stationSelect.value) || 0));
  });

  offerTagsEl.addEventListener('click', (e) => {
    const pill = e.target.closest?.('[data-select-tag]');
    if (!pill) return;
    selectedTag = pill.getAttribute('data-select-tag') || 'peace';
    renderOfferControls();
    bus.emit('sfx', { name: 'step' });
  });

  presetListEl.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-preset-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-preset-id');
    messageInput.value = i18n.t(`lamp.preset.${id}.text`);
    bus.emit('sfx', { name: 'step' });
  });

  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const pName = nameInput.value.trim() || ctx.community?.getPilgrimName?.() || i18n.t('lamp.form.defaultPilgrim');
    const msg = messageInput.value.trim() || i18n.t('lamp.preset.1.text');
    const sIdx = Math.max(0, Math.min(2, Number(stationSelect.value) || 0));

    const entry = ctx.community?.offerLamp?.({
      stationIdx: sIdx,
      lampIdx: selectedLampIdx,
      pilgrimName: pName,
      tag: selectedTag,
      message: msg,
    });

    if (!openedFromStationLight) {
      ctx.lamps?.lightLampAt?.(sIdx, selectedLampIdx, 120);
      bus.emit('sfx', { name: 'light' });
      bus.emit('merit', { type: 'lamp' });
      bus.emit('vitals:restore', {
        mp: ctx.config?.VITALS?.restore?.lampMp ?? 15,
        source: 'lamp',
      });
    } else {
      ctx.lamps?.lightLampAt?.(sIdx, selectedLampIdx, 120);
      bus.emit('sfx', { name: 'bowl' });
    }

    openedFromStationLight = false;
    bus.emit('toast', { key: 'toast.lampOffered', kind: 'merit' });

    if (entry) {
      filterStation = 'all';
      filterTag = 'all';
      wallFilterStation.value = 'all';
      wallFilterTag.value = 'all';
      setTab('wall');
    }
  });

  wallFilterStation.addEventListener('change', () => {
    filterStation = wallFilterStation.value;
    renderWall();
  });

  wallFilterTag.addEventListener('change', () => {
    filterTag = wallFilterTag.value;
    renderWall();
  });

  wallGridEl.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-rejoice-lamp]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const lampId = btn.getAttribute('data-rejoice-lamp');
    if (ctx.community?.rejoiceLamp?.(lampId)) {
      bus.emit('sfx', { name: 'bell' });
      bus.emit('toast', { key: 'toast.lampRejoiced', kind: 'merit' });
      renderWall();
    }
  });

  shareCopyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    renderShareCode();
    const code = shareExportInput.value;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    } else {
      shareExportInput.select();
    }
    bus.emit('sfx', { name: 'bell' });
    bus.emit('toast', { key: 'toast.shareCodeCopied', kind: 'merit' });
  });

  shareImportBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = shareImportInput.value.trim();
    const ok = ctx.community?.importShareCode?.(raw);
    if (ok) {
      shareImportInput.value = '';
      bus.emit('sfx', { name: 'bowl' });
      bus.emit('toast', { key: 'toast.shareCodeImported', kind: 'merit' });
      setTab('wall');
    } else {
      bus.emit('toast', { key: 'toast.shareCodeInvalid', kind: 'warning' });
    }
  });

  // Listen to station lighting events from `lamps.js`
  bus.on('lamp:litByPlayer', ({ stationIdx = 0, lampIdx = 0 } = {}) => {
    open({ stationIdx, lampIdx, tab: 'offer', fromStationLight: true });
  });

  bus.on('lamp:stationInteract', ({ stationIdx = 0, lampIdx = 0 } = {}) => {
    open({ stationIdx, lampIdx, tab: 'offer', fromStationLight: false });
  });

  bus.on('community:changed', () => {
    if (!modalOpen) return;
    if (activeTab === 'wall') renderWall();
    if (activeTab === 'share') renderShareCode();
  });

  i18n.onChange(() => {
    localizeStaticElements();
    if (modalOpen) {
      renderOfferControls();
      renderWall();
    }
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (state.mode !== 'play') return;
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.code === 'Escape' && modalOpen) {
        e.preventDefault();
        close();
        return;
      }
      if (e.code === 'KeyL' && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!modalOpen && state.uiOpen) return;
        e.preventDefault();
        toggle({ tab: modalOpen ? activeTab : 'wall' });
      }
    });
  }

  ensureUtilityButton();
  localizeStaticElements();
  renderOfferControls();

  function update(_dt) {
    if (!utilityBtnAttached) {
      ensureUtilityButton();
    }
  }

  const api = {
    update,
    open,
    close,
    toggle,
    isOpen: () => modalOpen,
  };

  ctx.lampOfferingUi = api;
  ctx.debug?.register('lampOffering', {
    open: (opts) => api.open(opts),
    close: () => api.close(),
    toggle: (opts) => api.toggle(opts),
    isOpen: () => api.isOpen(),
  });

  return api;
}
