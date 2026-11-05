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

    <!-- 3. Quest Complete Center Banner -->
    <div id="quest-complete-banner" class="quest-complete-banner is-hidden" aria-live="polite">
      <div class="quest-complete-burst" aria-hidden="true"></div>
      <div class="quest-complete-card glass-panel">
        <div class="quest-complete-lotus" aria-hidden="true">☸</div>
        <div id="quest-complete-title" class="quest-complete-title"></div>
        <div id="quest-complete-rewards" class="quest-complete-rewards"></div>
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
  const trackerJournalBtn = root.querySelector('#quest-tracker-journal-btn');
  const trackerCollapseBtn = root.querySelector('#quest-tracker-collapse-btn');
  const trackerChevronEl = root.querySelector('#quest-tracker-chevron');
  const trackerBodyEl = root.querySelector('#quest-tracker-body');

  const bannerEl = root.querySelector('#quest-complete-banner');
  const bannerTitleEl = root.querySelector('#quest-complete-title');
  const bannerRewardsEl = root.querySelector('#quest-complete-rewards');

  const chapterBannerEl = root.querySelector('#chapter-unlock-banner');
  const chapterKickerEl = root.querySelector('#chapter-unlock-kicker');
  const chapterTitleEl = root.querySelector('#chapter-unlock-title');
  const chapterSubEl = root.querySelector('#chapter-unlock-sub');

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
      return;
    }

    trackerBodyEl.innerHTML = trackedList
      .map((q) => {
        const title = escapeHtml(i18n.t(q.def.titleKey));
        const stepText = q.step ? escapeHtml(i18n.t(q.step.textKey)) : '';
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
    const chKey = chapter === 'prologue' ? 0 : (chapter ?? 0);
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
      html += `
        <div class="quest-chapter-group">
          <h3 class="quest-chapter-heading">${escapeHtml(getChapterTitle(ch))}</h3>
          <div class="quest-chapter-cards">
      `;

      for (const item of list) {
        const { def, status, activeInfo } = item;
        const title = escapeHtml(i18n.t(def.titleKey));
        const desc = escapeHtml(i18n.t(def.descKey));
        const rewardText = formatRewardsSummary(i18n, def.rewards);

        let stepsHtml = '';
        if (Array.isArray(def.steps)) {
          stepsHtml = def.steps
            .map((st, idx) => {
              const stLabel = escapeHtml(i18n.t(st.textKey));
              if (status === 'done' || (activeInfo && idx < activeInfo.stepIndex)) {
                return `<div class="quest-step-row is-done"><span class="quest-step-check">✓</span><span>${stLabel}</span></div>`;
              }
              if (activeInfo && idx === activeInfo.stepIndex) {
                return `
                  <div class="quest-step-row is-current">
                    <span class="quest-step-check">◆</span>
                    <span>${stLabel}</span>
                    <span class="quest-step-count">${activeInfo.progress}/${activeInfo.goal}</span>
                  </div>
                `;
              }
              return `<div class="quest-step-row is-upcoming"><span class="quest-step-check">·</span><span>${stLabel}</span></div>`;
            })
            .join('');
        }

        const actionBtnHtml =
          status === 'active'
            ? `<button type="button" class="quest-track-btn ${activeInfo.tracked ? 'is-tracked' : ''}" data-track-quest="${escapeHtml(def.id)}">
                 ${escapeHtml(i18n.t(activeInfo.tracked ? 'quest.journal.tracked' : 'quest.journal.track'))}
               </button>`
            : `<span class="quest-done-badge">${escapeHtml(i18n.t('quest.journal.doneBadge'))}</span>`;

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

  function openJournal() {
    if (ctx.dialogue?.isOpen?.()) return;
    journalOpen = true;
    state.uiOpen = true;
    renderJournal();
    journalModalEl.classList.remove('is-hidden');
    bus.emit('sfx', { name: 'step' });
  }

  function closeJournal() {
    if (!journalOpen) return;
    journalOpen = false;
    journalModalEl.classList.add('is-hidden');
    state.uiOpen = Boolean(
      ctx.dialogue?.isOpen?.() ||
        ctx.shop?.isOpen?.() ||
        ctx.crafting?.isOpen?.() ||
        ctx.inventoryUi?.isOpen?.()
    );
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

    bannerEl.classList.remove('is-hidden');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      bannerEl.classList.add('is-hidden');
      bannerTimer = null;
    }, 3400);
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
    if (window.innerWidth <= 720 || trackerCollapsed) {
      trackerCollapsed = !trackerCollapsed;
      applyTrackerCollapsedState();
    } else {
      toggleJournal();
    }
  });

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
  bus.on('quest:reset', () => {
    renderTracker();
    if (journalOpen) renderJournal();
  });
  bus.on('game:start', () => {
    trackerEl.classList.remove('is-hidden');
    renderTracker();
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

    if (onScreen && dist <= 28) {
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
    isOpen() {
      return journalOpen;
    },
  };

  ctx.questUi = api;
  return api;
}
