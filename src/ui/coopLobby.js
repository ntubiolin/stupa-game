/**
 * Vajra Sangha Co-op Lobby Modal & Top-Left Party HUD Frame (`src/ui/coopLobby.js`) — Issue #61
 *
 * Features:
 *   - Scoped styles (`#coop-lobby-styles`) injected into `document.head`
 *   - Utility bar button `#btn-coop-lobby-toggle` (`🤝`)
 *   - Top-Left Party HUD Frame `#coop-party-hud` inside `.hud-left-stack`:
 *       - Room code badge (click to copy)
 *       - Party bonus badge (`+XX% 尋寶 · ☸ 真言共鳴`)
 *       - Compact member cards (Name, Lv, HP/MP bars, Zone badge, Revive / Teleport to Leader buttons)
 *   - Co-op Lobby Modal `#coop-lobby-modal`:
 *       - Pilgrim Dharma Name input
 *       - Create Room / Join Room Code input + button / Copy Room Code / Leave Party
 *       - "➕ 召喚同行道友幻身 (Summon Dharma Companion)" buttons (up to 4 party members)
 *       - 4-Slot Party Roster & "⚔️ 全隊進入伏藏秘境 (Launch Co-op Terma Run)" shortcut button
 */
import '../i18n/coop.js';
import { i18n } from '../i18n.js';

export function createCoopLobbyUi(ctx) {
  if (ctx.coopLobbyUi) return ctx.coopLobbyUi;
  const { state, bus } = ctx;

  let modalOpen = false;
  let lastHudSignature = '';

  function injectStyles() {
    if (typeof document === 'undefined' || document.getElementById('coop-lobby-styles')) return;
    const style = document.createElement('style');
    style.id = 'coop-lobby-styles';
    style.textContent = `
      #coop-party-hud {
        margin-top: 8px;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(15, 20, 34, 0.86);
        border: 1px solid rgba(45, 212, 191, 0.42);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.42);
        color: #f8fafc;
        font-family: "Noto Serif TC", system-ui, sans-serif;
        font-size: 12px;
        min-width: 220px;
        max-width: 268px;
        pointer-events: auto;
      }
      #coop-party-hud.is-hidden {
        display: none !important;
      }
      .coop-hud__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin-bottom: 6px;
      }
      .coop-hud__title {
        font-weight: 700;
        color: #fde68a;
        font-size: 13px;
        cursor: pointer;
      }
      .coop-hud__room-pill {
        padding: 2px 7px;
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.22);
        border: 1px solid rgba(45, 212, 191, 0.55);
        color: #5eead4;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }
      .coop-hud__bonus {
        font-size: 11px;
        color: #fcd34d;
        margin-bottom: 8px;
        padding: 3px 7px;
        border-radius: 6px;
        background: rgba(251, 191, 36, 0.12);
        border: 1px solid rgba(251, 191, 36, 0.28);
      }
      .coop-hud__members {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .coop-hud__card {
        padding: 6px 8px;
        border-radius: 8px;
        background: rgba(30, 41, 59, 0.78);
        border: 1px solid rgba(148, 163, 184, 0.25);
      }
      .coop-hud__card.is-fainted {
        border-color: rgba(248, 113, 113, 0.75);
        background: rgba(69, 10, 10, 0.65);
      }
      .coop-hud__card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        margin-bottom: 4px;
      }
      .coop-hud__name {
        font-weight: 600;
        color: #f1f5f9;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .coop-hud__zone {
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 4px;
        background: rgba(15, 23, 42, 0.75);
        color: #94a3b8;
        white-space: nowrap;
      }
      .coop-hud__bar-track {
        height: 6px;
        border-radius: 3px;
        background: rgba(15, 23, 42, 0.9);
        overflow: hidden;
        margin-bottom: 3px;
      }
      .coop-hud__bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #34d399);
        transition: width 0.2s ease;
      }
      .coop-hud__bar-fill.is-fainted {
        background: #ef4444;
      }
      .coop-hud__actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        margin-top: 4px;
      }
      .coop-hud__mini-btn {
        padding: 2px 7px;
        border-radius: 5px;
        border: 1px solid rgba(251, 191, 36, 0.5);
        background: rgba(217, 119, 6, 0.25);
        color: #fde68a;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
      }
      .coop-hud__mini-btn:hover {
        background: rgba(217, 119, 6, 0.45);
      }

      /* Co-op Lobby Modal */
      #coop-lobby-modal {
        position: fixed;
        inset: 0;
        z-index: 125;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(8, 10, 18, 0.8);
        backdrop-filter: blur(7px);
        font-family: "Noto Serif TC", system-ui, sans-serif;
        color: #f8fafc;
      }
      #coop-lobby-modal.is-hidden {
        display: none !important;
      }
      .coop-modal__dialog {
        width: min(580px, 94vw);
        max-height: 90vh;
        overflow-y: auto;
        padding: 22px 26px;
        border-radius: 16px;
        background: linear-gradient(165deg, rgba(17, 24, 39, 0.97), rgba(13, 18, 32, 0.99));
        border: 1px solid rgba(251, 191, 36, 0.55);
        box-shadow: 0 22px 55px rgba(0, 0, 0, 0.75);
      }
      .coop-modal__eyebrow {
        color: #5eead4;
        font-size: 12px;
        letter-spacing: 0.08em;
      }
      .coop-modal__title {
        margin: 4px 0 6px;
        color: #fde68a;
        font-size: 21px;
      }
      .coop-modal__sub {
        margin: 0 0 14px;
        color: #cbd5e1;
        font-size: 12.5px;
        line-height: 1.5;
      }
      .coop-modal__section {
        padding: 12px 14px;
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.78);
        border: 1px solid rgba(148, 163, 184, 0.22);
        margin-bottom: 12px;
      }
      .coop-modal__row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .coop-modal__input {
        flex: 1;
        min-width: 150px;
        padding: 7px 10px;
        border-radius: 7px;
        border: 1px solid rgba(148, 163, 184, 0.4);
        background: rgba(15, 23, 42, 0.95);
        color: #f8fafc;
        font-size: 13px;
      }
      .coop-modal__btn {
        padding: 8px 13px;
        border-radius: 8px;
        border: 1px solid rgba(251, 191, 36, 0.48);
        background: rgba(30, 41, 59, 0.9);
        color: #fef08a;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
      }
      .coop-modal__btn:hover {
        background: rgba(51, 65, 85, 0.95);
      }
      .coop-modal__btn--primary {
        border-color: #2dd4bf;
        background: linear-gradient(135deg, #0d9488, #0f766e);
        color: #f0fdfa;
      }
      .coop-modal__btn--danger {
        border-color: rgba(248, 113, 113, 0.55);
        background: rgba(127, 29, 29, 0.6);
        color: #fecaca;
      }
      .coop-modal__slot-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }
      .coop-modal__slot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 9px 12px;
        border-radius: 9px;
        background: rgba(30, 41, 59, 0.72);
        border: 1px solid rgba(148, 163, 184, 0.25);
        font-size: 13px;
      }
      .coop-modal__slot--empty {
        color: #64748b;
        border-style: dashed;
      }
      .coop-modal__badge {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-left: 6px;
      }
      .coop-modal__badge--host {
        background: rgba(251, 191, 36, 0.2);
        color: #fde68a;
        border: 1px solid rgba(251, 191, 36, 0.5);
      }
      .coop-modal__badge--ai {
        background: rgba(45, 212, 191, 0.18);
        color: #5eead4;
        border: 1px solid rgba(45, 212, 191, 0.45);
      }
    `;
    document.head.appendChild(style);
  }

  injectStyles();

  // 1. Utility Bar Button (`#btn-coop-lobby-toggle`)
  let toggleBtn = null;
  function ensureUtilityButton() {
    if (typeof document === 'undefined') return;
    if (!toggleBtn) {
      toggleBtn = document.getElementById('btn-coop-lobby-toggle');
    }
    if (toggleBtn) return;
    const utilityBar = document.querySelector('.utility-bar');
    if (!utilityBar) return;

    toggleBtn = document.createElement('button');
    toggleBtn.id = 'btn-coop-lobby-toggle';
    toggleBtn.type = 'button';
    toggleBtn.className = 'icon-btn';
    toggleBtn.title = i18n.t('coop.btn.toggleTitle');
    toggleBtn.setAttribute('aria-label', i18n.t('coop.btn.toggleTitle'));
    toggleBtn.innerHTML = '<span>🤝</span>';
    toggleBtn.addEventListener('click', () => toggle());
    utilityBar.insertBefore(toggleBtn, utilityBar.firstChild);
  }

  // 2. Top-Left Party HUD Frame (`#coop-party-hud`)
  let partyHudEl = null;
  function ensurePartyHud() {
    if (typeof document === 'undefined') return;
    if (!partyHudEl) {
      partyHudEl = document.getElementById('coop-party-hud');
    }
    if (partyHudEl) return;

    partyHudEl = document.createElement('aside');
    partyHudEl.id = 'coop-party-hud';
    partyHudEl.className = 'coop-party-hud glass-panel is-hidden';
    partyHudEl.setAttribute('aria-label', 'Co-op Party HUD');

    const leftStack = document.querySelector('.hud-left-stack');
    if (leftStack) {
      leftStack.appendChild(partyHudEl);
    } else {
      (document.getElementById('play-hud') || document.body).appendChild(partyHudEl);
    }
  }

  // 3. Co-op Lobby Modal (`#coop-lobby-modal`)
  let modalEl = null;
  function ensureModal() {
    if (typeof document === 'undefined') return;
    if (!modalEl) {
      modalEl = document.getElementById('coop-lobby-modal');
    }
    if (modalEl) return;

    modalEl = document.createElement('div');
    modalEl.id = 'coop-lobby-modal';
    modalEl.className = 'is-hidden';
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) close();
    });
    document.body.appendChild(modalEl);
  }

  function formatZoneLabel(zoneId) {
    const key = `map.${zoneId || 'stupa'}`;
    return i18n.has(key) ? i18n.t(key) : zoneId || 'stupa';
  }

  function renderPartyHud() {
    ensureUtilityButton();
    ensurePartyHud();
    if (!partyHudEl) return;

    const st = ctx.coop?.getState?.();
    if (!st || (!st.active && st.partySize <= 1)) {
      partyHudEl.classList.add('is-hidden');
      lastHudSignature = 'hidden';
      return;
    }

    const sig = JSON.stringify({
      lang: i18n.lang,
      room: st.roomCode,
      size: st.partySize,
      res: st.resonanceCount,
      zone: state.zone,
      leaderTerma: st.leaderDungeonState?.active,
      members: st.members.map((m) => ({
        id: m.id,
        name: m.name,
        lv: m.level,
        hp: Math.round(m.hp),
        maxHp: Math.round(m.maxHp),
        zone: m.zone,
        fainted: m.fainted,
        isHost: m.isHost,
      })),
    });
    if (sig === lastHudSignature) return;
    lastHudSignature = sig;

    partyHudEl.classList.remove('is-hidden');

    const memberCards = st.members.map((m) => {
      const hpPct = Math.max(0, Math.min(100, Math.round(((m.hp || 0) / Math.max(1, m.maxHp || 100)) * 100)));
      const diffZone = m.zone && m.zone !== state.zone;
      const roleIcon = m.isHost ? '👑' : m.isAi ? '☸' : '🤝';
      return `
        <div class="coop-hud__card ${m.fainted ? 'is-fainted' : ''}" data-member-id="${m.id}">
          <div class="coop-hud__card-top">
            <span class="coop-hud__name">${roleIcon} Lv.${m.level || 1} ${m.name}</span>
            <span class="coop-hud__zone">${formatZoneLabel(m.zone)}</span>
          </div>
          <div class="coop-hud__bar-track">
            <div class="coop-hud__bar-fill ${m.fainted ? 'is-fainted' : ''}" style="width:${hpPct}%;"></div>
          </div>
          <div class="coop-hud__actions">
            <span style="font-size:10px;color:${m.fainted ? '#fca5a5' : '#94a3b8'};">
              ${m.fainted ? i18n.t('coop.hud.fainted') : `${Math.round(m.hp || 0)}/${Math.round(m.maxHp || 100)} HP`}
            </span>
            <div style="display:flex;gap:4px;">
              ${
                m.fainted
                  ? `<button type="button" class="coop-hud__mini-btn" data-revive-id="${m.id}">${i18n.t('coop.party.reviveBtn')}</button>`
                  : ''
              }
              ${
                (m.isHost && diffZone) || (m.isHost && m.zone === 'terma' && state.zone !== 'terma')
                  ? `<button type="button" class="coop-hud__mini-btn" data-hud-teleport="1">${
                      m.zone === 'terma' ? i18n.t('coop.hud.joinTerma') : i18n.t('coop.hud.meetup')
                    }</button>`
                  : ''
              }
            </div>
          </div>
        </div>
      `;
    });

    partyHudEl.innerHTML = `
      <div class="coop-hud__header">
        <span class="coop-hud__title" id="coop-hud-open-lobby">🤝 ${i18n.t('coop.hud.title')} (${st.partySize}/4)</span>
        <button type="button" class="coop-hud__room-pill" id="coop-hud-copy-code" title="${i18n.t('coop.room.copyBtn')}">
          ${st.roomCode || 'SANGHA'} 📋
        </button>
      </div>
      <div class="coop-hud__bonus">
        ${i18n.t('coop.hud.bonus', { bonus: st.findBonusPct || 0, count: st.resonanceCount || 0 })}
      </div>
      <div class="coop-hud__members">
        ${memberCards.join('')}
      </div>
    `;

    partyHudEl.querySelector('#coop-hud-open-lobby')?.addEventListener('click', () => open());
    partyHudEl.querySelector('#coop-hud-copy-code')?.addEventListener('click', () => {
      copyRoomCode(st.roomCode);
    });
    partyHudEl.querySelectorAll('[data-revive-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-revive-id');
        ctx.coop?.reviveMember?.(id);
      });
    });
    partyHudEl.querySelectorAll('[data-hud-teleport]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ctx.coop?.teleportToLeader?.();
      });
    });
  }

  function copyRoomCode(code) {
    if (!code) return;
    try {
      navigator.clipboard?.writeText?.(code);
    } catch {
      /* ignore */
    }
    bus?.emit('toast', {
      key: 'coop.room.copied',
      params: { code },
      text: i18n.t('coop.room.copied', { code }),
      kind: 'info',
    });
  }

  function renderModal() {
    ensureModal();
    if (!modalEl || !modalOpen) return;

    const st = ctx.coop?.getState?.() || {
      active: false,
      roomCode: '',
      isHost: false,
      pilgrimName: i18n.t('coop.pilgrimName.default'),
      members: [],
      partySize: 1,
      resonanceCount: 0,
      findBonusPct: 0,
    };

    const p = state.player || {};
    const slotsHtml = [];

    // Slot 1: Local Player
    slotsHtml.push(`
      <div class="coop-modal__slot">
        <div>
          <strong>Lv.${p.level || 1} ${st.pilgrimName}</strong>
          <span class="coop-modal__badge coop-modal__badge--host">${i18n.t('coop.room.youBadge')}</span>
          ${st.active && st.isHost ? `<span class="coop-modal__badge coop-modal__badge--host">${i18n.t('coop.room.hostBadge')}</span>` : ''}
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
            ${formatZoneLabel(state.zone)} · HP ${Math.round(p.hp ?? 100)}/${Math.round(p.maxHp ?? 100)}
          </div>
        </div>
        <span style="color:#5eead4;font-size:12px;">☸ Online</span>
      </div>
    `);

    // Slots 2..4: Members or Empty
    for (let i = 0; i < 3; i++) {
      const m = st.members[i];
      if (m) {
        slotsHtml.push(`
          <div class="coop-modal__slot" data-slot-member="${m.id}">
            <div>
              <strong>Lv.${m.level || 1} ${m.name}</strong>
              ${
                m.isHost
                  ? `<span class="coop-modal__badge coop-modal__badge--host">${i18n.t('coop.room.hostBadge')}</span>`
                  : m.isAi
                    ? `<span class="coop-modal__badge coop-modal__badge--ai">${i18n.t('coop.room.aiBadge')}</span>`
                    : `<span class="coop-modal__badge coop-modal__badge--ai">${i18n.t('coop.room.peerBadge')}</span>`
              }
              <div style="font-size:11px;color:${m.fainted ? '#fca5a5' : '#94a3b8'};margin-top:2px;">
                ${formatZoneLabel(m.zone)} · ${
                  m.fainted
                    ? i18n.t('coop.hud.fainted')
                    : `HP ${Math.round(m.hp || 0)}/${Math.round(m.maxHp || 100)}`
                }
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              ${
                m.fainted
                  ? `<button type="button" class="coop-modal__btn" data-modal-revive="${m.id}">${i18n.t('coop.party.reviveBtn')}</button>`
                  : ''
              }
              ${
                m.isAi
                  ? `<button type="button" class="coop-modal__btn coop-modal__btn--danger" data-modal-dismiss="${m.id}">${i18n.t('coop.ai.dismissBtn')}</button>`
                  : ''
              }
            </div>
          </div>
        `);
      } else {
        slotsHtml.push(`
          <div class="coop-modal__slot coop-modal__slot--empty">
            <span>${i18n.t('coop.party.emptySlot')}</span>
          </div>
        `);
      }
    }

    modalEl.innerHTML = `
      <div class="coop-modal__dialog" role="dialog" aria-labelledby="coop-modal-title">
        <div class="coop-modal__eyebrow">ཨོཾ་མ་ཎི་པ་དྨེ་ཧཱུྃ · VAJRA SANGHA</div>
        <h2 id="coop-modal-title" class="coop-modal__title">${i18n.t('coop.title')}</h2>
        <p class="coop-modal__sub">${i18n.t('coop.subtitle')}</p>

        <!-- Pilgrim Name & Room Code -->
        <div class="coop-modal__section">
          <div class="coop-modal__row" style="margin-bottom:10px;">
            <label for="coop-pilgrim-name-input" style="font-size:12px;color:#cbd5e1;min-width:120px;">
              ${i18n.t('coop.pilgrimName.label')}
            </label>
            <input
              id="coop-pilgrim-name-input"
              class="coop-modal__input"
              type="text"
              maxlength="20"
              value="${st.pilgrimName}"
              placeholder="${i18n.t('coop.pilgrimName.placeholder')}"
            />
          </div>

          <div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">
            ${i18n.t('coop.room.label')}：
            <strong id="coop-current-room-code" style="color:#5eead4;font-size:14px;">
              ${st.active && st.roomCode ? st.roomCode : i18n.t('coop.room.none')}
            </strong>
          </div>

          <div class="coop-modal__row">
            <button type="button" id="btn-coop-create-room" class="coop-modal__btn coop-modal__btn--primary">
              ${i18n.t('coop.room.createBtn')}
            </button>
            <input
              id="coop-room-code-input"
              class="coop-modal__input"
              type="text"
              maxlength="16"
              value="${st.roomCode || ''}"
              placeholder="${i18n.t('coop.room.joinPlaceholder')}"
            />
            <button type="button" id="btn-coop-join-room" class="coop-modal__btn">
              ${i18n.t('coop.room.joinBtn')}
            </button>
            ${
              st.active && st.roomCode
                ? `
                  <button type="button" id="btn-coop-copy-code" class="coop-modal__btn">
                    ${i18n.t('coop.room.copyBtn')}
                  </button>
                  <button type="button" id="btn-coop-leave-room" class="coop-modal__btn coop-modal__btn--danger">
                    ${i18n.t('coop.room.leaveBtn')}
                  </button>
                `
                : ''
            }
          </div>
        </div>

        <!-- AI Dharma Companions -->
        <div class="coop-modal__section">
          <div style="font-weight:700;color:#fde68a;font-size:13.5px;margin-bottom:4px;">
            ${i18n.t('coop.ai.sectionTitle')}
          </div>
          <div style="color:#94a3b8;font-size:12px;margin-bottom:10px;">
            ${i18n.t('coop.ai.sectionDesc')}
          </div>
          <div class="coop-modal__row">
            <button
              type="button"
              id="btn-coop-add-ai"
              class="coop-modal__btn coop-modal__btn--primary"
              ${st.partySize >= 4 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}
            >
              ${i18n.t('coop.ai.summonBtn')}
            </button>
            <button type="button" class="coop-modal__btn" data-summon-preset="0">
              ${i18n.t('coop.ai.name.0')}
            </button>
            <button type="button" class="coop-modal__btn" data-summon-preset="1">
              ${i18n.t('coop.ai.name.1')}
            </button>
            <button type="button" class="coop-modal__btn" data-summon-preset="2">
              ${i18n.t('coop.ai.name.2')}
            </button>
          </div>
        </div>

        <!-- Party Roster (4 Slots) -->
        <div class="coop-modal__section">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
            <strong style="color:#fde68a;font-size:13.5px;">
              ${i18n.t('coop.party.header', { count: st.partySize })}
            </strong>
            <span style="font-size:12px;color:#5eead4;">
              ${i18n.t('coop.party.bonusBadge', {
                bonus: st.findBonusPct || 0,
                resonances: st.resonanceCount || 0,
              })}
            </span>
          </div>
          <div class="coop-modal__slot-list">
            ${slotsHtml.join('')}
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:14px;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" id="btn-coop-launch-terma" class="coop-modal__btn coop-modal__btn--primary">
              ${i18n.t('coop.party.launchTermaBtn')}
            </button>
            ${
              st.active && !st.isHost
                ? `<button type="button" id="btn-coop-teleport-leader" class="coop-modal__btn">
                    ${i18n.t('coop.party.teleportLeaderBtn')}
                  </button>`
                : ''
            }
          </div>
          <button type="button" id="btn-coop-close" class="coop-modal__btn">
            ${i18n.t('coop.party.closeBtn')}
          </button>
        </div>
      </div>
    `;

    // Wire events
    const nameInput = modalEl.querySelector('#coop-pilgrim-name-input');
    nameInput?.addEventListener('change', () => {
      ctx.coop?.setPilgrimName?.(nameInput.value);
    });

    modalEl.querySelector('#btn-coop-create-room')?.addEventListener('click', () => {
      if (nameInput?.value) ctx.coop?.setPilgrimName?.(nameInput.value);
      const rawCode = modalEl.querySelector('#coop-room-code-input')?.value?.trim();
      ctx.coop?.createRoom?.(rawCode || undefined);
      renderModal();
      renderPartyHud();
    });

    modalEl.querySelector('#btn-coop-join-room')?.addEventListener('click', () => {
      if (nameInput?.value) ctx.coop?.setPilgrimName?.(nameInput.value);
      const code = modalEl.querySelector('#coop-room-code-input')?.value?.trim();
      if (code) {
        ctx.coop?.joinRoom?.(code);
        renderModal();
        renderPartyHud();
      }
    });

    modalEl.querySelector('#btn-coop-copy-code')?.addEventListener('click', () => {
      copyRoomCode(st.roomCode);
    });

    modalEl.querySelector('#btn-coop-leave-room')?.addEventListener('click', () => {
      ctx.coop?.leaveRoom?.();
      renderModal();
      renderPartyHud();
    });

    modalEl.querySelector('#btn-coop-add-ai')?.addEventListener('click', () => {
      ctx.coop?.addAiCompanion?.();
      renderModal();
      renderPartyHud();
    });

    modalEl.querySelectorAll('[data-summon-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-summon-preset'));
        ctx.coop?.addAiCompanion?.(idx);
        renderModal();
        renderPartyHud();
      });
    });

    modalEl.querySelectorAll('[data-modal-dismiss]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-modal-dismiss');
        ctx.coop?.removeAiCompanion?.(id);
        renderModal();
        renderPartyHud();
      });
    });

    modalEl.querySelectorAll('[data-modal-revive]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-modal-revive');
        ctx.coop?.reviveMember?.(id);
        renderModal();
        renderPartyHud();
      });
    });

    modalEl.querySelector('#btn-coop-launch-terma')?.addEventListener('click', () => {
      close();
      ctx.dungeon?.openTierSelect?.();
    });

    modalEl.querySelector('#btn-coop-teleport-leader')?.addEventListener('click', () => {
      close();
      ctx.coop?.teleportToLeader?.();
    });

    modalEl.querySelector('#btn-coop-close')?.addEventListener('click', () => {
      close();
    });
  }

  function open() {
    ensureModal();
    if (!modalEl) return false;
    modalOpen = true;
    state.uiOpen = true;
    modalEl.classList.remove('is-hidden');
    renderModal();
    bus?.emit('coop:lobbyOpened');
    return true;
  }

  function close() {
    if (!modalOpen || !modalEl) return false;
    modalOpen = false;
    modalEl.classList.add('is-hidden');
    state.uiOpen = false;
    bus?.emit('coop:lobbyClosed');
    return true;
  }

  function toggle() {
    return modalOpen ? close() : open();
  }

  bus?.on('coop:changed', () => {
    lastHudSignature = '';
    renderPartyHud();
    if (modalOpen) renderModal();
  });

  i18n.onChange(() => {
    lastHudSignature = '';
    if (toggleBtn) {
      toggleBtn.title = i18n.t('coop.btn.toggleTitle');
    }
    renderPartyHud();
    if (modalOpen) renderModal();
  });

  function update() {
    if (modalOpen && ctx.input?.pressed?.('closeUi')) {
      close();
    }
    renderPartyHud();
  }

  ensureUtilityButton();
  ensurePartyHud();
  ensureModal();

  const api = {
    update,
    open,
    close,
    toggle,
    isOpen: () => modalOpen,
    render: () => {
      lastHudSignature = '';
      renderPartyHud();
      if (modalOpen) renderModal();
    },
  };

  ctx.coopLobbyUi = api;
  ctx.debug?.register?.('coopLobby', api);
  if (typeof window !== 'undefined') {
    window.__stupa = window.__stupa || {};
    window.__stupa.coopLobby = api;
  }

  return api;
}

export default createCoopLobbyUi;
