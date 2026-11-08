/**
 * Quest UI System (`src/ui/quests.js`).
 *
 * Features:
 *  - Right-side Quest Tracker (shows up to 3 tracked quests with title, step text, progress `3/10`;
 *    collapsible pill on mobile)
 *  - Quest Journal modal toggled via `J` (`KeyJ: 'quests'`), grouped by chapter, showing active
 *    and completed quests with track/untrack toggle button
 *  - Projected World Quest Diamond Marker & Screen-Edge Directional Arrow when off-screen/far
 *  - Center Quest Completion Banner (`任務完成：〇〇`) on `quest:complete`
 */
import * as THREE from 'three';
import '../i18n/quests.js';
import '../i18n/murals.js';
import { MuralScrollCanvas, getChapterMural, getMuralEpisodeByQuest } from './mural/scroll.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRewardsSummary(i18n, rewards) {
  if (!rewards || typeof rewards !== 'object') return '';
  const parts = [];
  if (rewards.exp) {
    parts.push(i18n.t('quest.reward.exp', { n: rewards.exp }));
  }
  if (rewards.turquoise) {
    parts.push(i18n.t('quest.reward.turquoise', { n: rewards.turquoise }));
  }
  if (Array.isArray(rewards.items) && rewards.items.length > 0) {
    parts.push(i18n.t('quest.reward.item', { n: rewards.items.length }));
  }
  if (Array.isArray(rewards.codex) && rewards.codex.length > 0) {
    parts.push(i18n.t('quest.reward.codex'));
  }
  return parts.join(' · ');
}

export function createQuestUi(ctx) {
  const { state, bus, i18n, camera } = ctx;
  const uiRoot = document.getElementById('ui') || document.body;

  // ---------------------------------------------------------------- DOM Construction
  const root = document.createElement('div');
  root.id = 'quest-ui-root';
  root.className = 'quest-ui-root';
  root.innerHTML = `
    <!-- 1. Projected On-Screen Diamond Marker & Screen-Edge Directional Arrow -->
    <div id="quest-screen-marker" class="quest-screen-marker is-hidden" aria-hidden="true">
      <div class="quest-screen-marker__diamond">◆</div>
      <div id="quest-screen-marker-dist" class="quest-screen-marker__dist">0m</div>
    </div>

    <div id="quest-edge-arrow" class="quest-edge-arrow is-hidden" aria-hidden="true">
      <div id="quest-edge-arrow-rot" class="quest-edge-arrow__rot">
        <svg viewBox="0 0 28 28" width="26" height="26">
          <path d="M5 14 L23 14 M15 6 L23 14 L15 22" fill="none" stroke="#ffd84a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="quest-edge-arrow__badge">
        <span class="quest-edge-arrow__diamond">◆</span>
        <span id="quest-edge-arrow-dist" class="quest-edge-arrow__dist">0m</span>
      </div>
    </div>

    <!-- 2. Right-Side Quest Tracker -->
    <aside id="quest-tracker" class="quest-tracker glass-panel is-hidden" aria-label="Quest tracker">
      <div class="quest-tracker__header">
        <button id="quest-tracker-pill-btn" type="button" class="quest-tracker__pill-btn">
          <span class="quest-tracker__icon" aria-hidden="true">📜</span>
          <span id="quest-tracker-title" class="quest-tracker__title"></span>
          <span id="quest-tracker-count" class="quest-tracker__count">0</span>
        </button>
        <div class="quest-tracker__actions">
          <button id="quest-tracker-mural-btn" type="button" class="quest-tracker__btn" title="Mural Scroll">
            <span aria-hidden="true">🎨</span>
          </button>
          <button id="quest-tracker-journal-btn" type="button" class="quest-tracker__btn" title="Quest Journal (J)">
            <kbd>J</kbd>
          </button>
          <button id="quest-tracker-collapse-btn" type="button" class="quest-tracker__btn" aria-label="Collapse">
            <span id="quest-tracker-chevron">▾</span>
          </button>
        </div>
      </div>
      <div id="quest-tracker-body" class="quest-tracker__body"></div>
    </aside>

    <!-- 3. Quest Complete Center Banner (with Live Mural Coloring Viewport) -->
    <div id="quest-complete-banner" class="quest-complete-banner is-hidden" aria-live="polite">
      <div class="quest-complete-burst" aria-hidden="true"></div>
      <div class="quest-complete-card glass-panel">
        <div class="quest-complete-lotus" aria-hidden="true">☸</div>
        <div id="quest-complete-title" class="quest-complete-title"></div>
        <div id="quest-complete-rewards" class="quest-complete-rewards"></div>
        <div id="quest-complete-mural-wrap" class="quest-complete-mural-wrap is-hidden" title="">
          <canvas id="quest-complete-mural-canvas" class="quest-complete-mural-canvas" width="640" height="360"></canvas>
          <div id="quest-complete-mural-hint" class="quest-complete-mural-hint"></div>
        </div>
      </div>
    </div>

    <!-- 3b. Chapter Unlock Center Banner (e.g. 「第一章：帕平・揚列雪」) -->
    <div id="chapter-unlock-banner" class="chapter-unlock-banner is-hidden" aria-live="polite">
      <div class="chapter-unlock-card glass-panel">
        <div id="chapter-unlock-kicker" class="chapter-unlock-kicker"></div>
        <div id="chapter-unlock-title" class="chapter-unlock-title"></div>
        <div id="chapter-unlock-sub" class="chapter-unlock-sub"></div>
      </div>
    </div>

    <!-- 3c. Pure Vision Chapter Intro Scroll (章節開場壁畫畫卷) -->
    <div id="chapter-intro-overlay" class="chapter-intro-overlay is-hidden" role="dialog" aria-modal="true" style="position:fixed;inset:0;z-index:930;display:none;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%, rgba(255, 224, 112, 0.28) 0%, rgba(24, 15, 9, 0.94) 68%, rgba(10, 7, 5, 0.98) 100%);backdrop-filter:blur(6px);transition:opacity 0.55s ease;">
      <div class="chapter-intro-card mural-scroll-modal glass-panel">
        <header class="mural-scroll-header">
          <div class="mural-scroll-header__titles">
            <div id="chapter-intro-meta" class="mural-scroll-meta"></div>
            <h2 id="chapter-intro-title" class="mural-scroll-title"></h2>
          </div>
          <div id="chapter-intro-episodes" class="mural-episode-bar" role="toolbar" aria-label="Mural episodes"></div>
        </header>

        <div class="mural-scroll-stage">
          <canvas id="chapter-intro-mural-canvas" class="mural-scroll-canvas" width="1280" height="720"></canvas>
        </div>

        <footer class="mural-scroll-footer">
          <p id="chapter-intro-narration" class="mural-scroll-narration"></p>
          <div class="mural-scroll-actions">
            <button id="chapter-intro-enter-btn" type="button" class="mural-enter-btn"></button>
            <div id="chapter-intro-hint" class="mural-scroll-hint"></div>
          </div>
        </footer>
      </div>
    </div>

    <!-- 4. Quest Journal Modal (J) -->
    <section id="quest-journal-modal" class="quest-journal-modal is-hidden" aria-label="Quest Journal">
      <div class="quest-journal-card glass-panel">
        <header class="quest-journal__header">
          <div>
            <h2 id="quest-journal-title" class="quest-journal__title"></h2>
            <p id="quest-journal-subtitle" class="quest-journal__subtitle"></p>
          </div>
          <button id="quest-journal-close-btn" type="button" class="dialogue-close-btn" aria-label="Close">✕</button>
        </header>

        <div class="quest-journal__tabs" role="tablist">
          <button type="button" class="quest-journal__tab is-active" data-tab="all" id="qtab-all"></button>
          <button type="button" class="quest-journal__tab" data-tab="active" id="qtab-active"></button>
          <button type="button" class="quest-journal__tab" data-tab="done" id="qtab-done"></button>
        </div>

        <div id="quest-journal-content" class="quest-journal__content"></div>

        <footer class="quest-journal__footer">
          <span id="quest-journal-close-hint" class="dialogue-hint"></span>
        </footer>
      </div>
    </section>
  `;
  uiRoot.appendChild(root);

  const screenMarkerEl = root.querySelector('#quest-screen-marker');
  const screenMarkerDistEl = root.querySelector('#quest-screen-marker-dist');
  const edgeArrowEl = root.querySelector('#quest-edge-arrow');
  const edgeArrowRotEl = root.querySelector('#quest-edge-arrow-rot');
  const edgeArrowDistEl = root.querySelector('#quest-edge-arrow-dist');

  const trackerEl = root.querySelector('#quest-tracker');
  const trackerPillBtn = root.querySelector('#quest-tracker-pill-btn');
  const trackerTitleEl = root.querySelector('#quest-tracker-title');
  const trackerCountEl = root.querySelector('#quest-tracker-count');
  const trackerMuralBtn = root.querySelector('#quest-tracker-mural-btn');
  const trackerJournalBtn = root.querySelector('#quest-tracker-journal-btn');
  const trackerCollapseBtn = root.querySelector('#quest-tracker-collapse-btn');
  const trackerChevronEl = root.querySelector('#quest-tracker-chevron');
  const trackerBodyEl = root.querySelector('#quest-tracker-body');

  const bannerEl = root.querySelector('#quest-complete-banner');
  const bannerTitleEl = root.querySelector('#quest-complete-title');
  const bannerRewardsEl = root.querySelector('#quest-complete-rewards');
  const bannerMuralWrapEl = root.querySelector('#quest-complete-mural-wrap');
  const bannerMuralCanvasEl = root.querySelector('#quest-complete-mural-canvas');
  const bannerMuralHintEl = root.querySelector('#quest-complete-mural-hint');

  const chapterBannerEl = root.querySelector('#chapter-unlock-banner');
  const chapterKickerEl = root.querySelector('#chapter-unlock-kicker');
  const chapterTitleEl = root.querySelector('#chapter-unlock-title');
  const chapterSubEl = root.querySelector('#chapter-unlock-sub');

  const chapterIntroEl = root.querySelector('#chapter-intro-overlay');
  const chapterIntroMetaEl = root.querySelector('#chapter-intro-meta');
  const chapterIntroTitleEl = root.querySelector('#chapter-intro-title');
  const chapterIntroEpisodesEl = root.querySelector('#chapter-intro-episodes');
  const chapterIntroCanvasEl = root.querySelector('#chapter-intro-mural-canvas');
  const chapterIntroNarrationEl = root.querySelector('#chapter-intro-narration');
  const chapterIntroEnterBtn = root.querySelector('#chapter-intro-enter-btn');
  const chapterIntroHintEl = root.querySelector('#chapter-intro-hint');

  const introMural = chapterIntroCanvasEl
    ? new MuralScrollCanvas(chapterIntroCanvasEl, { ctx, chapterId: 'ch1' })
    : null;
  const bannerMural = bannerMuralCanvasEl
    ? new MuralScrollCanvas(bannerMuralCanvasEl, { ctx, chapterId: 'ch1' })
    : null;

  const journalModalEl = root.querySelector('#quest-journal-modal');
  const journalTitleEl = root.querySelector('#quest-journal-title');
  const journalSubtitleEl = root.querySelector('#quest-journal-subtitle');
  const journalCloseBtn = root.querySelector('#quest-journal-close-btn');
  const journalContentEl = root.querySelector('#quest-journal-content');
  const journalCloseHintEl = root.querySelector('#quest-journal-close-hint');
  const tabBtns = Array.from(root.querySelectorAll('.quest-journal__tab'));

  // ---------------------------------------------------------------- State
  let journalOpen = false;
  let currentTab = 'all';
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 720;
  let trackerCollapsed = isSmallScreen;
  let bannerTimer = null;

  function applyTrackerCollapsedState() {
    trackerEl.classList.toggle('is-collapsed', trackerCollapsed);
    if (trackerChevronEl) {
      trackerChevronEl.textContent = trackerCollapsed ? '▸' : '▾';
    }
  }
  applyTrackerCollapsedState();

  function renderTracker() {
    if (!ctx.quests) return;
    trackerTitleEl.textContent = i18n.t('quest.tracker.title');

    const activeList = ctx.quests.getActiveQuestsDetailed();
    const trackedList = activeList.filter((q) => q.tracked).slice(0, 3);
    trackerCountEl.textContent = String(trackedList.length);

    if (trackedList.length === 0) {
      trackerBodyEl.innerHTML = `<div class="quest-tracker__empty">${escapeHtml(i18n.t('quest.tracker.empty'))}</div>`;
      if (typeof window !== 'undefined' && window.innerWidth <= 720 && !trackerCollapsed) {
        trackerCollapsed = true;
        applyTrackerCollapsedState();
      }
      return;
    }

    trackerBodyEl.innerHTML = trackedList
      .map((q) => {
        const title = escapeHtml(i18n.t(q.def.titleKey));
        const stepParams = {
          progress: q.progress ?? 0,
          goal: q.goal ?? 1,
          count: q.goal ?? 1,
        };
        const stepText = q.step ? escapeHtml(i18n.t(q.step.textKey, stepParams)) : '';
        const progStr = `${q.progress}/${q.goal}`;
        const pct = q.goal > 0 ? Math.min(100, Math.round((q.progress / q.goal) * 100)) : 0;
        return `
          <div class="quest-tracker__item" data-quest-id="${escapeHtml(q.id)}">
            <div class="quest-tracker__item-head">
              <span class="quest-tracker__item-diamond">◆</span>
              <span class="quest-tracker__item-title">${title}</span>
            </div>
            <div class="quest-tracker__item-step">
              <span class="quest-tracker__step-text">${stepText}</span>
              <span class="quest-tracker__step-prog">${progStr}</span>
            </div>
            <div class="quest-tracker__bar">
              <div class="quest-tracker__bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function getChapterTitle(chapter) {
    let chKey = chapter ?? 0;
    if (chKey === 'prologue') chKey = 0;
    else if (typeof chKey === 'string' && chKey.startsWith('ch')) {
      chKey = Number(chKey.slice(2)) || 0;
    }
    const key = `quest.chapter.${chKey}`;
    return i18n.t(key);
  }

  function renderJournal() {
    if (!ctx.quests) return;

    journalTitleEl.textContent = i18n.t('quest.journal.title');
    journalSubtitleEl.textContent = i18n.t('quest.journal.subtitle');
    journalCloseHintEl.textContent = i18n.t('quest.journal.closeHint');

    root.querySelector('#qtab-all').textContent = i18n.t('quest.journal.tab.all');
    root.querySelector('#qtab-active').textContent = i18n.t('quest.journal.tab.active');
    root.querySelector('#qtab-done').textContent = i18n.t('quest.journal.tab.done');

    for (const btn of tabBtns) {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === currentTab);
    }

    const activeDetailed = ctx.quests.getActiveQuestsDetailed();
    const doneDefs = ctx.quests.getCompletedQuestsDetailed();

    const entries = [];
    if (currentTab === 'all' || currentTab === 'active') {
      for (const a of activeDetailed) {
        entries.push({ status: 'active', id: a.id, def: a.def, activeInfo: a });
      }
    }
    if (currentTab === 'all' || currentTab === 'done') {
      for (const d of doneDefs) {
        entries.push({ status: 'done', id: d.id, def: d, activeInfo: null });
      }
    }

    if (entries.length === 0) {
      const emptyKey = currentTab === 'done' ? 'quest.journal.emptyDone' : 'quest.journal.emptyActive';
      journalContentEl.innerHTML = `<div class="quest-journal__empty">${escapeHtml(i18n.t(emptyKey))}</div>`;
      return;
    }

    // Group by chapter
    const groups = new Map();
    for (const entry of entries) {
      const ch = entry.def.chapter ?? 0;
      if (!groups.has(ch)) groups.set(ch, []);
      groups.get(ch).push(entry);
    }

    let html = '';
    for (const [ch, list] of groups.entries()) {
      const chMural = getChapterMural(ch);
      html += `
        <div class="quest-chapter-group">
          <div class="quest-chapter-heading-row">
            <h3 class="quest-chapter-heading">${escapeHtml(getChapterTitle(ch))}</h3>
            ${
              chMural
                ? `<button type="button" class="quest-mural-open-btn" data-open-mural="${escapeHtml(String(ch))}">
                     📜 ${escapeHtml(i18n.t('mural.ui.viewScroll'))}
                   </button>`
                : ''
            }
          </div>
          <div class="quest-chapter-cards">
      `;

      for (const item of list) {
        const { def, status, activeInfo } = item;
        const title = escapeHtml(i18n.t(def.titleKey));
        const desc = escapeHtml(i18n.t(def.descKey));
        const rewardText = formatRewardsSummary(i18n, def.rewards);
        const hasMuralEpisode = Boolean(getMuralEpisodeByQuest(def.id));

        let stepsHtml = '';
        if (Array.isArray(def.steps)) {
          stepsHtml = def.steps
            .map((st, idx) => {
              const stGoal = Math.max(1, Number(st.count) || 1);
              if (status === 'done' || (activeInfo && idx < activeInfo.stepIndex)) {
                const stLabel = escapeHtml(
                  i18n.t(st.textKey, { progress: stGoal, goal: stGoal, count: stGoal })
                );
                return `<div class="quest-step-row is-done"><span class="quest-step-check">✓</span><span>${stLabel}</span></div>`;
              }
              if (activeInfo && idx === activeInfo.stepIndex) {
                const stLabel = escapeHtml(
                  i18n.t(st.textKey, {
                    progress: activeInfo.progress ?? 0,
                    goal: activeInfo.goal ?? stGoal,
                    count: activeInfo.goal ?? stGoal,
                  })
                );
                return `
                  <div class="quest-step-row is-current">
                    <span class="quest-step-check">◆</span>
                    <span>${stLabel}</span>
                    <span class="quest-step-count">${activeInfo.progress}/${activeInfo.goal}</span>
                  </div>
                `;
              }
              const stLabel = escapeHtml(
                i18n.t(st.textKey, { progress: 0, goal: stGoal, count: stGoal })
              );
              return `<div class="quest-step-row is-upcoming"><span class="quest-step-check">·</span><span>${stLabel}</span></div>`;
            })
            .join('');
        }

        const actionBtnHtml =
          status === 'active'
            ? `<button type="button" class="quest-track-btn ${activeInfo.tracked ? 'is-tracked' : ''}" data-track-quest="${escapeHtml(def.id)}">
                 ${escapeHtml(i18n.t(activeInfo.tracked ? 'quest.journal.tracked' : 'quest.journal.track'))}
               </button>`
            : `<div class="quest-card__done-actions">
                 ${
                   hasMuralEpisode
                     ? `<button type="button" class="quest-mural-replay-btn" data-replay-mural="${escapeHtml(def.id)}">
                          🎨 ${escapeHtml(i18n.t('mural.ui.replayColor'))}
                        </button>`
                     : ''
                 }
                 <span class="quest-done-badge">${escapeHtml(i18n.t('quest.journal.doneBadge'))}</span>
               </div>`;

        html += `
          <article class="quest-card ${status === 'done' ? 'is-done' : 'is-active'}">
            <div class="quest-card__top">
              <h4 class="quest-card__title">${title}</h4>
              ${actionBtnHtml}
            </div>
            <p class="quest-card__desc">${desc}</p>
            <div class="quest-card__steps">${stepsHtml}</div>
            ${
              rewardText
                ? `<div class="quest-card__rewards">
                     <span class="quest-card__rewards-label">${escapeHtml(i18n.t('quest.journal.rewards'))}:</span>
                     <span class="quest-card__rewards-val">${escapeHtml(rewardText)}</span>
                   </div>`
                : ''
            }
          </article>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    journalContentEl.innerHTML = html;
  }

  function syncUiOpenState() {
    state.uiOpen = Boolean(
      journalOpen ||
        activeIntroPayload ||
        ctx.dialogue?.isOpen?.() ||
        ctx.shop?.isOpen?.() ||
        ctx.crafting?.isOpen?.() ||
        ctx.inventoryUi?.isOpen?.()
    );
  }

  function openJournal() {
    if (ctx.dialogue?.isOpen?.()) return;
    journalOpen = true;
    syncUiOpenState();
    renderJournal();
    journalModalEl.classList.remove('is-hidden');
    bus.emit('sfx', { name: 'step' });
  }

  function closeJournal() {
    if (!journalOpen) return;
    journalOpen = false;
    journalModalEl.classList.add('is-hidden');
    syncUiOpenState();
  }

  function toggleJournal() {
    if (journalOpen) closeJournal();
    else openJournal();
  }

  let chapterBannerTimer = null;
  function showChapterBanner(payload = {}) {
    if (!chapterBannerEl) return;
    const kickerKey = payload.kickerKey || 'prologue.banner.chapter1.kicker';
    const titleKey = payload.titleKey || 'prologue.banner.chapter1.title';
    const subKey = payload.subKey || 'prologue.banner.chapter1.sub';

    chapterKickerEl.textContent = i18n.t(kickerKey);
    chapterTitleEl.textContent = i18n.t(titleKey);
    chapterSubEl.textContent = i18n.t(subKey);

    chapterBannerEl.classList.remove('is-hidden');
    if (chapterBannerTimer) clearTimeout(chapterBannerTimer);
    chapterBannerTimer = setTimeout(() => {
      chapterBannerEl.classList.add('is-hidden');
      chapterBannerTimer = null;
    }, 5200);
  }

  let activeIntroPayload = null;
  let introOpenedAt = 0;
  let activeIntroMuralId = 'ch1';
  let activeIntroFocusQuestId = null;

  function renderIntroEpisodeToolbar(mural, selectedQuestId = null) {
    if (!chapterIntroEpisodesEl || !mural) return;
    const episodes = mural.episodes || [];
    const pillsHtml = episodes
      .map((ep) => {
        const epState = introMural
          ? introMural.getEpisodeState(ep)
          : ctx.quests?.isDone?.(ep.questId)
            ? 'painted'
            : ctx.quests?.isActive?.(ep.questId)
              ? 'active'
              : 'sketch';
        const isDone = epState === 'painted';
        const isActive = epState === 'active';
        const stateCls = isDone ? 'is-painted' : isActive ? 'is-active' : 'is-sketch';
        const isFocused = selectedQuestId === ep.questId ? 'is-focused' : '';
        const label = escapeHtml(i18n.t(ep.titleKey));
        const statusBadge = isDone
          ? i18n.t('mural.ui.statusPainted')
          : isActive
            ? i18n.t('mural.ui.statusActive')
            : i18n.t('mural.ui.statusSketch');
        return `
          <button type="button" class="mural-ep-btn ${stateCls} ${isFocused}" data-mural-ep="${escapeHtml(ep.questId)}" title="${escapeHtml(statusBadge)}">
            <span class="mural-ep-btn__num">${escapeHtml(ep.num)}</span>
            <span class="mural-ep-btn__label">${label}</span>
          </button>
        `;
      })
      .join('');

    const firstDoneEp =
      episodes.find((ep) => ep.questId === selectedQuestId) ||
      episodes.find((ep) => (introMural ? introMural.getEpisodeState(ep) === 'painted' : ctx.quests?.isDone?.(ep.questId))) ||
      episodes[0];

    chapterIntroEpisodesEl.innerHTML = `
      <button type="button" class="mural-ep-btn mural-ep-btn--tool ${!selectedQuestId ? 'is-focused' : ''}" data-mural-action="overview">
        <span>☸</span>
        <span>${escapeHtml(i18n.t('mural.ui.overview'))}</span>
      </button>
      <button type="button" class="mural-ep-btn mural-ep-btn--tool" data-mural-action="pan">
        <span>👁</span>
        <span>${escapeHtml(i18n.t('mural.ui.panTour'))}</span>
      </button>
      ${pillsHtml}
      ${
        firstDoneEp
          ? `<button type="button" class="mural-ep-btn mural-ep-btn--replay" data-mural-replay="${escapeHtml(firstDoneEp.questId)}">
               <span>🎨</span>
               <span>${escapeHtml(i18n.t('mural.ui.replayColor'))}</span>
             </button>`
          : ''
      }
    `;
  }

  function showChapterIntro(payload = {}) {
    if (!chapterIntroEl) return;
    activeIntroPayload = payload;
    introOpenedAt = performance.now();
    syncUiOpenState();

    const inferredChapter =
      payload.chapterId ||
      payload.mapId ||
      (typeof payload.flag === 'string' && payload.flag.includes('.') ? payload.flag.split('.')[0] : null) ||
      state.zone ||
      'ch1';
    const mural = getChapterMural(inferredChapter);
    activeIntroMuralId = mural?.id || 'ch1';
    activeIntroFocusQuestId = payload.revealQuestId || payload.focusQuestId || null;

    const locKey = payload.locationKey || mural?.locationKey;
    const eraKey = payload.eraKey || mural?.eraKey;
    const titleKey = payload.titleKey || mural?.titleKey;
    const narrationKey = payload.narrationKey || mural?.narrationKey;

    const loc = locKey ? i18n.t(locKey) : '';
    const era = eraKey ? i18n.t(eraKey) : '';
    chapterIntroMetaEl.textContent = [loc, era].filter(Boolean).join(' · ');
    chapterIntroTitleEl.textContent = titleKey ? i18n.t(titleKey) : '';

    if (narrationKey) {
      chapterIntroNarrationEl.textContent = i18n.t(narrationKey);
    } else if (Array.isArray(payload.lines) && payload.lines.length > 0) {
      chapterIntroNarrationEl.textContent = payload.lines.map((k) => i18n.t(k)).join(' ');
    } else {
      chapterIntroNarrationEl.textContent = '';
    }

    if (chapterIntroEnterBtn) {
      chapterIntroEnterBtn.textContent = `☸ ${i18n.t('mural.ui.enterVision')}`;
    }
    chapterIntroHintEl.textContent = i18n.t(payload.hintKey || 'ch1.intro.hint');

    // Hide mini completion banner if open so full-screen scroll is unobstructed
    if (bannerEl) {
      bannerEl.classList.add('is-hidden');
      bannerMural?.stop();
    }

    if (introMural && mural) {
      introMural.setChapter(mural.id);
      introMural.start();
      if (payload.revealQuestId) {
        introMural.playColoringReveal(payload.revealQuestId, { duration: 2.35, immediateFocus: false });
      } else if (payload.focusQuestId) {
        introMural.focusEpisode(payload.focusQuestId, false);
      } else {
        introMural.startPanTour();
      }
    }

    renderIntroEpisodeToolbar(mural, activeIntroFocusQuestId);

    chapterIntroEl.style.display = 'flex';
    chapterIntroEl.classList.remove('is-hidden');
    chapterIntroEnterBtn?.focus?.();

    bus.emit('sfx', { name: 'bowl' });
  }

  function dismissChapterIntro() {
    if (!activeIntroPayload || !chapterIntroEl) return;
    const flag = activeIntroPayload.flag;
    activeIntroPayload = null;
    if (introMural) {
      introMural.stop();
    }
    chapterIntroEl.classList.add('is-hidden');
    chapterIntroEl.style.display = 'none';
    chapterIntroEnterBtn?.blur?.();
    syncUiOpenState();
    ctx.input?.pressed?.('interact');
    ctx.input?.pressed?.('jump');
    ctx.input?.clear?.();
    if (flag) {
      ctx.quests?.setFlag?.(flag, true);
    }
    bus.emit('sfx', { name: 'bell' });
  }

  if (chapterIntroEpisodesEl) {
    chapterIntroEpisodesEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const mural = getChapterMural(activeIntroMuralId);
      const epBtn = e.target.closest?.('[data-mural-ep]');
      if (epBtn && introMural) {
        const qId = epBtn.getAttribute('data-mural-ep');
        activeIntroFocusQuestId = qId;
        introMural.focusEpisode(qId, false);
        renderIntroEpisodeToolbar(mural, activeIntroFocusQuestId);
        bus.emit('sfx', { name: 'step' });
        return;
      }
      const actionBtn = e.target.closest?.('[data-mural-action]');
      if (actionBtn && introMural) {
        const act = actionBtn.getAttribute('data-mural-action');
        activeIntroFocusQuestId = null;
        if (act === 'pan') {
          introMural.startPanTour();
        } else {
          introMural.focusOverview(false);
        }
        renderIntroEpisodeToolbar(mural, null);
        bus.emit('sfx', { name: 'step' });
        return;
      }
      const replayBtn = e.target.closest?.('[data-mural-replay]');
      if (replayBtn && introMural) {
        const qId =
          activeIntroFocusQuestId ||
          replayBtn.getAttribute('data-mural-replay');
        if (qId) {
          activeIntroFocusQuestId = qId;
          introMural.playColoringReveal(qId, { duration: 2.35, immediateFocus: false });
          renderIntroEpisodeToolbar(mural, qId);
          bus.emit('sfx', { name: 'bowl' });
        }
      }
    });
  }

  if (chapterIntroCanvasEl) {
    chapterIntroCanvasEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!introMural) return;
      const mural = getChapterMural(activeIntroMuralId);
      if (!mural || !Array.isArray(mural.episodes) || mural.episodes.length === 0) return;
      const idx = mural.episodes.findIndex((ep) => ep.questId === activeIntroFocusQuestId);
      if (idx === -1) {
        activeIntroFocusQuestId = mural.episodes[0].questId;
        introMural.focusEpisode(activeIntroFocusQuestId, false);
      } else if (idx + 1 < mural.episodes.length) {
        activeIntroFocusQuestId = mural.episodes[idx + 1].questId;
        introMural.focusEpisode(activeIntroFocusQuestId, false);
      } else {
        activeIntroFocusQuestId = null;
        introMural.focusOverview(false);
      }
      renderIntroEpisodeToolbar(mural, activeIntroFocusQuestId);
    });
  }

  if (chapterIntroEnterBtn) {
    chapterIntroEnterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (performance.now() - introOpenedAt < 180) return;
      dismissChapterIntro();
    });
  }

  if (chapterIntroEl) {
    chapterIntroEl.style.display = 'none';
    chapterIntroEl.addEventListener('click', (e) => {
      if (e.target === chapterIntroEl) {
        e.preventDefault();
        e.stopPropagation();
        if (performance.now() - introOpenedAt < 180) return;
        dismissChapterIntro();
      }
    });
  }
  if (typeof window !== 'undefined') {
    window.addEventListener(
      'keydown',
      (e) => {
        if (!activeIntroPayload) return;
        if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault?.();
          e.stopPropagation?.();
          e.stopImmediatePropagation?.();
          if (performance.now() - introOpenedAt < 180) return;
          dismissChapterIntro();
        }
      },
      true
    );
  }

  let lastBannerQuestId = null;
  function showCompletionBanner(payload) {
    if (!payload) return;
    const def = ctx.quests?.getQuestDef?.(payload.id);
    const title = i18n.t(payload.titleKey || def?.titleKey || payload.id);
    const rewardsStr = formatRewardsSummary(i18n, payload.rewards || def?.rewards);

    bannerTitleEl.textContent = i18n.t('quest.banner.complete', { title });
    if (rewardsStr) {
      bannerRewardsEl.textContent = i18n.t('quest.banner.rewards', { rewards: rewardsStr });
      bannerRewardsEl.style.display = 'block';
    } else {
      bannerRewardsEl.style.display = 'none';
    }

    const hit = getMuralEpisodeByQuest(payload.id);
    lastBannerQuestId = payload.id;
    if (hit && bannerMural && bannerMuralWrapEl) {
      bannerMuralWrapEl.classList.remove('is-hidden');
      if (bannerMuralHintEl) {
        bannerMuralHintEl.textContent = `🎨 ${i18n.t('mural.ui.episodePainted')} · ${i18n.t('mural.ui.clickToExpand')}`;
      }
      bannerMural.setChapter(hit.mural.id);
      bannerMural.start();
      bannerMural.playColoringReveal(payload.id, { duration: 2.15, immediateFocus: true });
    } else if (bannerMuralWrapEl) {
      bannerMuralWrapEl.classList.add('is-hidden');
      bannerMural?.stop();
    }

    bannerEl.classList.remove('is-hidden');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      bannerEl.classList.add('is-hidden');
      bannerMural?.stop();
      bannerTimer = null;
    }, hit ? 5400 : 3400);
  }

  if (bannerMuralWrapEl) {
    bannerMuralWrapEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!lastBannerQuestId) return;
      const hit = getMuralEpisodeByQuest(lastBannerQuestId);
      if (hit) {
        bannerEl.classList.add('is-hidden');
        bannerMural?.stop();
        showChapterIntro({
          chapterId: hit.mural.id,
          revealQuestId: lastBannerQuestId,
        });
      }
    });
  }

  // ---------------------------------------------------------------- Event Listeners
  trackerCollapseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    trackerCollapsed = !trackerCollapsed;
    applyTrackerCollapsedState();
  });

  trackerPillBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const trackedCount = (ctx.quests?.getActiveQuestsDetailed?.() || []).filter((q) => q.tracked).length;
    if ((window.innerWidth <= 720 || trackerCollapsed) && trackedCount > 0) {
      trackerCollapsed = !trackerCollapsed;
      applyTrackerCollapsedState();
    } else {
      toggleJournal();
    }
  });

  if (trackerMuralBtn) {
    trackerMuralBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const activeList = ctx.quests?.getActiveQuestsDetailed?.() || [];
      const firstActive = activeList.find((q) => q.tracked) || activeList[0];
      const hit = firstActive ? getMuralEpisodeByQuest(firstActive.id) : null;
      const chId = hit?.mural?.id || state.zone || 'prologue';
      showChapterIntro({ chapterId: chId });
    });
  }

  trackerJournalBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleJournal();
  });

  trackerBodyEl.addEventListener('click', (e) => {
    const item = e.target.closest?.('.quest-tracker__item');
    if (item) {
      e.preventDefault();
      e.stopPropagation();
      openJournal();
    }
  });

  journalCloseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeJournal();
  });

  journalModalEl.addEventListener('click', (e) => {
    if (e.target === journalModalEl) {
      closeJournal();
    }
  });

  for (const btn of tabBtns) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentTab = btn.getAttribute('data-tab') || 'all';
      renderJournal();
    });
  }

  journalContentEl.addEventListener('click', (e) => {
    const openMuralBtn = e.target.closest?.('[data-open-mural]');
    if (openMuralBtn) {
      e.preventDefault();
      e.stopPropagation();
      const chId = openMuralBtn.getAttribute('data-open-mural');
      closeJournal();
      showChapterIntro({ chapterId: chId });
      return;
    }

    const replayMuralBtn = e.target.closest?.('[data-replay-mural]');
    if (replayMuralBtn) {
      e.preventDefault();
      e.stopPropagation();
      const qId = replayMuralBtn.getAttribute('data-replay-mural');
      const hit = getMuralEpisodeByQuest(qId);
      closeJournal();
      showChapterIntro({
        chapterId: hit?.mural?.id || state.zone || 'ch1',
        revealQuestId: qId,
      });
      return;
    }

    const trackBtn = e.target.closest?.('[data-track-quest]');
    if (trackBtn) {
      e.preventDefault();
      e.stopPropagation();
      const qId = trackBtn.getAttribute('data-track-quest');
      if (qId) {
        ctx.quests?.toggleTrack?.(qId);
        renderJournal();
        renderTracker();
      }
    }
  });

  bus.on('quest:start', () => {
    renderTracker();
    if (journalOpen) renderJournal();
  });
  bus.on('quest:progress', () => {
    renderTracker();
    if (journalOpen) renderJournal();
  });
  bus.on('quest:complete', (payload) => {
    renderTracker();
    if (journalOpen) renderJournal();
    showCompletionBanner(payload);
  });
  bus.on('chapter:banner', (payload) => {
    showChapterBanner(payload);
  });
  bus.on('chapter:intro', (payload) => {
    showChapterIntro(payload);
  });
  bus.on('quest:reset', () => {
    renderTracker();
    if (journalOpen) renderJournal();
  });
  bus.on('game:start', () => {
    trackerEl.classList.remove('is-hidden');
    trackerCollapsed = false;
    applyTrackerCollapsedState();
    renderTracker();
    if (ctx.quests?.isAtStep?.('prologue.vow', 'talk_intro')) {
      bus.emit('toast', { key: 'quest.toast.guideStart' });
    }
  });

  i18n.onChange(() => {
    renderTracker();
    if (journalOpen) renderJournal();
  });

  // ---------------------------------------------------------------- World Marker & Edge Arrow Projection
  const tmpWorld = new THREE.Vector3();
  const tmpView = new THREE.Vector3();
  const tmpNdc = new THREE.Vector3();

  function updateWorldAndEdgeMarkers() {
    if (state.mode !== 'play' || state.uiOpen || !ctx.quests) {
      screenMarkerEl.classList.add('is-hidden');
      edgeArrowEl.classList.add('is-hidden');
      return;
    }

    const targets = ctx.quests.getTrackedTargets();
    const currentZone = state.zone || 'stupa';
    const target = targets.find((t) => t.map === currentZone);

    if (!target || !camera) {
      screenMarkerEl.classList.add('is-hidden');
      edgeArrowEl.classList.add('is-hidden');
      return;
    }

    const px = state.player?.position?.x ?? 0;
    const pz = state.player?.position?.z ?? 0;
    const dist = Math.round(Math.hypot(target.x - px, target.z - pz));

    tmpWorld.set(target.x, (target.y ?? 0) + 2.65, target.z);
    tmpView.copy(tmpWorld).applyMatrix4(camera.matrixWorldInverse);
    tmpNdc.copy(tmpWorld).project(camera);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const inFront = tmpView.z < -0.1;
    const onScreen = inFront && Math.abs(tmpNdc.x) <= 0.86 && Math.abs(tmpNdc.y) <= 0.82;

    if (onScreen && dist <= 85) {
      // Show on-screen diamond indicator over the 3D marker
      const sx = (tmpNdc.x * 0.5 + 0.5) * w;
      const sy = (-tmpNdc.y * 0.5 + 0.5) * h;
      screenMarkerEl.style.left = `${sx.toFixed(1)}px`;
      screenMarkerEl.style.top = `${sy.toFixed(1)}px`;
      screenMarkerDistEl.textContent = `${dist}m`;
      screenMarkerEl.classList.remove('is-hidden');
      edgeArrowEl.classList.add('is-hidden');
    } else {
      // Off-screen or far away (> 28m): show screen-edge directional arrow
      screenMarkerEl.classList.add('is-hidden');

      let dirX = tmpView.x;
      let dirY = -tmpView.y;
      // When target is behind camera, push toward horizontal side so arrow points around clearly
      if (!inFront) {
        dirY = Math.max(0.25, Math.abs(dirY));
      }
      const len = Math.hypot(dirX, dirY) || 1;
      dirX /= len;
      dirY /= len;

      const cx = w * 0.5;
      const cy = h * 0.5;
      const rx = Math.max(100, cx - 58);
      const ry = Math.max(90, cy - 68);
      const ex = cx + dirX * rx;
      const ey = cy + dirY * ry;
      const angleDeg = (Math.atan2(dirY, dirX) * 180) / Math.PI;

      edgeArrowEl.style.left = `${ex.toFixed(1)}px`;
      edgeArrowEl.style.top = `${ey.toFixed(1)}px`;
      edgeArrowRotEl.style.transform = `rotate(${angleDeg.toFixed(1)}deg)`;
      edgeArrowDistEl.textContent = `${dist}m`;
      edgeArrowEl.classList.remove('is-hidden');
    }
  }

  function update() {
    if (state.mode === 'play' && trackerEl.classList.contains('is-hidden')) {
      trackerEl.classList.remove('is-hidden');
      renderTracker();
    }

    const input = ctx.input;
    if (state.mode === 'play' && input) {
      if (input.pressed('quests') && !ctx.dialogue?.isOpen?.()) {
        toggleJournal();
      } else if (journalOpen && input.pressed('closeUi')) {
        closeJournal();
      }
    }

    updateWorldAndEdgeMarkers();
  }

  renderTracker();

  const api = {
    update,
    openJournal,
    closeJournal,
    toggleJournal,
    renderTracker,
    showChapterIntro,
    dismissChapterIntro,
    openMuralScroll(chapterId = state.zone || 'ch1', opts = {}) {
      showChapterIntro({ chapterId, ...opts });
    },
    replayQuestColoring(questId) {
      const hit = getMuralEpisodeByQuest(questId);
      if (!hit) return false;
      showChapterIntro({ chapterId: hit.mural.id, revealQuestId: questId });
      return true;
    },
    isOpen() {
      return Boolean(journalOpen || activeIntroPayload);
    },
  };

  ctx.questUi = api;
  ctx.mural = {
    openScroll: (chapterId, opts) => api.openMuralScroll(chapterId, opts),
    closeScroll: () => dismissChapterIntro(),
    replayQuestColoring: (questId) => api.replayQuestColoring(questId),
    introMural,
    bannerMural,
  };
  ctx.debug?.register?.('mural', ctx.mural);
  return api;
}
