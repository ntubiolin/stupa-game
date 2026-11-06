/**
 * Ending Credits Overlay (`src/ui/credits.js`) — Issue #36
 *
 * Triggered upon completing C5-3 `ch5.epilogue` (`bus.emit('credits:play')`) or via
 * `ctx.credits.play()` / `window.__stupa.credits.play()`.
 *
 * Displays:
 *   - Tibetan Vajra Guru Mantra header (`ཨོཾ་ཨཱཿ་ཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ`)
 *   - Pilgrimage summary across Prologue through Chapter 5
 *   - Historical & traditional figures
 *   - Live Codex collection progress (`X / Y`) & Highest Terma Tier cleared
 *   - Historical vs. Legendary disclaimer:「本作的故事取材自蓮師傳記等佛教文獻，部分內容屬傳說」
 *   - Primary scholarly & encyclopedic reference links
 */
import '../i18n/ch5.js';
import { i18n } from '../i18n.js';

export function createCredits(ctx) {
  if (ctx.credits) return ctx.credits;
  const { state, bus } = ctx;

  let overlayEl = null;
  let openFlag = false;

  function ensureDom() {
    if (overlayEl || typeof document === 'undefined') return;
    overlayEl = document.createElement('div');
    overlayEl.id = 'credits-overlay';
    overlayEl.className = 'is-hidden';
    overlayEl.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:160',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:radial-gradient(circle at 50% 20%, rgba(30, 27, 56, 0.96), rgba(7, 9, 18, 0.98))',
      'backdrop-filter:blur(8px)',
      'color:#f8fafc',
      'font-family:"Noto Serif TC", "PingFang TC", Georgia, serif',
      'padding:24px',
      'overflow-y:auto',
    ].join(';');
    document.body.appendChild(overlayEl);
  }

  function render() {
    ensureDom();
    if (!overlayEl) return;

    const codexCounts = ctx.codex?.count?.() || { unlocked: 1, total: 36 };
    const pct =
      codexCounts.total > 0
        ? Math.round((codexCounts.unlocked / codexCounts.total) * 100)
        : 100;
    const highestTier =
      ctx.dungeon?.getHighestClearedTier?.() ?? state.dungeon?.highestClearedTier ?? 1;
    const playerLevel = state.player?.level || 1;

    overlayEl.innerHTML = `
      <div style="
        max-width:740px;
        width:100%;
        max-height:88vh;
        overflow-y:auto;
        padding:36px 40px;
        border-radius:18px;
        background:linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(10, 14, 26, 0.96));
        border:1px solid rgba(251, 191, 36, 0.55);
        box-shadow:0 24px 70px rgba(0, 0, 0, 0.85);
        text-align:center;
        line-height:1.75;
      ">
        <div style="color:#5eead4;font-size:20px;letter-spacing:0.12em;margin-bottom:8px;">
          ${i18n.t('credits.mantra')}
        </div>
        <h1 style="margin:0 0 6px;color:#fde68a;font-size:28px;font-weight:700;">
          ${i18n.t('credits.title')}
        </h1>
        <div style="color:#94a3b8;font-size:14px;margin-bottom:18px;">
          ${i18n.t('credits.subtitle')}
        </div>
        <p style="
          margin:0 auto 26px;
          max-width:600px;
          color:#fef08a;
          font-style:italic;
          font-size:14px;
          padding:10px 16px;
          border-top:1px solid rgba(251,191,36,0.28);
          border-bottom:1px solid rgba(251,191,36,0.28);
        ">
          ${i18n.t('credits.epigraph')}
        </p>

        <section style="text-align:left;margin-bottom:24px;">
          <h3 style="color:#fbbf24;font-size:16px;margin:0 0 10px;border-bottom:1px solid rgba(251,191,36,0.25);padding-bottom:4px;">
            ✦ ${i18n.t('credits.section.journey')}
          </h3>
          <ul style="list-style:none;padding:0;margin:0;color:#e2e8f0;font-size:13.5px;display:grid;gap:6px;">
            <li>• ${i18n.t('credits.ch0')}</li>
            <li>• ${i18n.t('credits.ch1')}</li>
            <li>• ${i18n.t('credits.ch2')}</li>
            <li>• ${i18n.t('credits.ch3')}</li>
            <li>• ${i18n.t('credits.ch4')}</li>
            <li>• ${i18n.t('credits.ch5')}</li>
          </ul>
        </section>

        <section style="text-align:left;margin-bottom:24px;">
          <h3 style="color:#fbbf24;font-size:16px;margin:0 0 8px;border-bottom:1px solid rgba(251,191,36,0.25);padding-bottom:4px;">
            ✦ ${i18n.t('credits.section.figures')}
          </h3>
          <div style="color:#cbd5e1;font-size:13.5px;">
            ${i18n.t('credits.figures.list')}
          </div>
        </section>

        <section style="
          padding:14px 18px;
          border-radius:12px;
          background:rgba(20, 184, 166, 0.12);
          border:1px solid rgba(45, 212, 191, 0.4);
          margin-bottom:24px;
          display:flex;
          flex-wrap:wrap;
          justify-content:space-around;
          gap:12px;
          font-size:14px;
          font-weight:600;
          color:#5eead4;
        ">
          <div>📖 ${i18n.t('credits.stats.codex', { unlocked: codexCounts.unlocked, total: codexCounts.total, pct })}</div>
          <div>🏔️ ${i18n.t('credits.stats.termaTier', { tier: highestTier })}</div>
          <div>🪷 ${i18n.t('credits.stats.level', { level: playerLevel })}</div>
        </section>

        <section style="
          text-align:left;
          padding:14px 18px;
          border-radius:12px;
          background:rgba(251, 191, 36, 0.08);
          border:1px solid rgba(251, 191, 36, 0.35);
          margin-bottom:24px;
        ">
          <h3 style="color:#fde68a;font-size:15px;margin:0 0 6px;">
            ⚖️ ${i18n.t('credits.section.disclaimer')}
          </h3>
          <p style="margin:0;color:#e2e8f0;font-size:13px;">
            ${i18n.t('credits.disclaimer.body')}
          </p>
        </section>

        <section style="text-align:left;margin-bottom:26px;">
          <h3 style="color:#fbbf24;font-size:15px;margin:0 0 8px;">
            📚 ${i18n.t('credits.section.sources')}
          </h3>
          <div style="display:flex;flex-wrap:wrap;gap:10px 18px;font-size:13px;">
            <a href="https://en.wikipedia.org/wiki/Padmasambhava" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;">↗ Wikipedia: Padmasambhava</a>
            <a href="https://en.wikipedia.org/wiki/Boudhanath" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;">↗ Wikipedia: Boudhanath (Jarung Khashor)</a>
            <a href="https://en.wikipedia.org/wiki/Samye" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;">↗ Wikipedia: Samye Monastery</a>
            <a href="https://en.wikipedia.org/wiki/Yeshe_Tsogyal" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;">↗ Wikipedia: Yeshe Tsogyal</a>
            <a href="https://en.wikipedia.org/wiki/Terma_(religion)" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;">↗ Wikipedia: Terma Tradition</a>
            <a href="https://treasuryoflives.org/" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;">↗ The Treasury of Lives</a>
            <a href="https://www.rigpawiki.org/" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;">↗ Rigpa Shedra Wiki</a>
          </div>
        </section>

        <button
          type="button"
          id="credits-close-btn"
          style="
            padding:10px 26px;
            border-radius:999px;
            border:1px solid #fbbf24;
            background:linear-gradient(135deg, #b45309, #d97706);
            color:#fffbeb;
            font-size:14px;
            font-weight:700;
            cursor:pointer;
          "
        >${i18n.t('credits.closeBtn')}</button>
      </div>
    `;

    overlayEl.querySelector('#credits-close-btn')?.addEventListener('click', () => {
      hide();
    });
  }

  function play() {
    ensureDom();
    if (!overlayEl) return false;
    openFlag = true;
    state.uiOpen = true;
    render();
    overlayEl.classList.remove('is-hidden');
    overlayEl.style.display = 'flex';
    bus.emit('sfx', { name: 'bowl' });
    bus.emit('credits:opened', {});
    return true;
  }

  function hide() {
    if (!openFlag || !overlayEl) return false;
    openFlag = false;
    overlayEl.classList.add('is-hidden');
    overlayEl.style.display = 'none';
    state.uiOpen = false;
    bus.emit('credits:closed', {});
    return true;
  }

  bus.on('credits:play', () => {
    play();
  });

  i18n.onChange(() => {
    if (openFlag) render();
  });

  function update() {
    if (openFlag && ctx.input?.pressed?.('closeUi')) {
      hide();
    }
  }

  const api = {
    play,
    open: play,
    hide,
    close: hide,
    update,
    isOpen: () => openFlag,
  };

  ctx.credits = api;
  ctx.debug?.register?.('credits', api);
  if (typeof window !== 'undefined') {
    window.__stupa = window.__stupa || {};
    window.__stupa.credits = api;
  }

  return api;
}

export default createCredits;
