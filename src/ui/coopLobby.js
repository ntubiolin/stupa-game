/**
 * Vajra Sangha Co-op Lobby Modal & Top-Left Party/Presence HUD Frame (`src/ui/coopLobby.js`) — Issue #61 / #176
 *
 * Features:
 *   - Scoped styles (`#coop-lobby-styles`) injected into `document.head`
 *   - Utility bar button `#btn-coop-lobby-toggle` (`🤝`)
 *   - Top-Left Party & Zone Presence HUD Frame `#coop-party-hud` inside `.hud-left-stack`:
 *       - Shown when in a party (`active`) OR when other online pilgrims are in the same zone (`zonePilgrims.length > 0`)
 *       - Room code badge (click to copy) or Zone Shard badge (`stupa#1`)
 *       - Party bonus badge (`+XX% 尋寶 · ☸ 真言共鳴`) or Shared Kora Communion hint
 *       - Compact member/pilgrim cards (Name, Lv, HP bars, Zone badge, Revive / Teleport buttons)
 *       - Quick Dharma Emote bar (`🙏`, `☸`, `🪔`, `⚔️`)
 *   - Co-op Lobby Modal `#coop-lobby-modal`:
 *       - 🌐 Live Zone Presence banner, zone counts (`博達哈大佛塔` / `祈願塔林` / `北郊原野`), and `#coop-ambient-toggle`
 *       - Pilgrim Dharma Name input, Create/Join/Copy/Leave Room, and `#coop-public-room-toggle`
 *       - 🔓 Public Room Browser (`#coop-public-rooms-list`) with 1-click join & refresh
 *       - 🙏 Dharma Emote Bar (`#coop-emote-bar`) with 4 prayer bubble buttons
 *       - "➕ 召喚同行道友幻身 (Summon Dharma Companion)" buttons & 4-Slot Party Roster
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
        min-width: 224px;
        max-width: 274px;
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
      .coop-hud__card.is-ambient {
        border-color: rgba(56, 189, 248, 0.45);
        background: rgba(12, 26, 46, 0.72);
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
      .coop-hud__bar-fill.is-ambient {
        background: linear-gradient(90deg, #0284c7, #38bdf8);
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
      .coop-hud__emote-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        margin-top: 7px;
        padding-top: 6px;
        border-top: 1px solid rgba(148, 163, 184, 0.18);
      }
      .coop-hud__emote-btn {
        flex: 1;
        padding: 3px 4px;
        border-radius: 6px;
        border: 1px solid rgba(251, 191, 36, 0.35);
        background: rgba(30, 41, 59, 0.85);
        color: #fef08a;
        font-size: 11px;
        cursor: pointer;
        text-align: center;
      }
      .coop-hud__emote-btn:hover {
        background: rgba(217, 119, 6, 0.32);
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
        width: min(620px, 95vw);
        max-height: 92vh;
        overflow-y: auto;
        padding: 20px 24px;
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
        font-size: 20px;
      }
      .coop-modal__sub {
        margin: 0 0 12px;
        color: #cbd5e1;
        font-size: 12px;
        line-height: 1.5;
      }
      .coop-modal__section {
        padding: 11px 14px;
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.78);
        border: 1px solid rgba(148, 163, 184, 0.22);
        margin-bottom: 10px;
      }
      .coop-modal__row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .coop-modal__input {
        flex: 1;
        min-width: 140px;
        padding: 7px 10px;
        border-radius: 7px;
        border: 1px solid rgba(148, 163, 184, 0.4);
        background: rgba(15, 23, 42, 0.95);
        color: #f8fafc;
        font-size: 13px;
      }
      .coop-modal__btn {
        padding: 7px 12px;
        border-radius: 8px;
        border: 1px solid rgba(251, 191, 36, 0.48);
        background: rgba(30, 41, 59, 0.9);
        color: #fef08a;
        font-size: 12px;
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
        gap: 7px;
        margin-top: 8px;
      }
      .coop-modal__slot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 11px;
        border-radius: 9px;
        background: rgba(30, 41, 59, 0.72);
        border: 1px solid rgba(148, 163, 184, 0.25);
        font-size: 12.5px;
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
      .coop-modal__check-label {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        color: #cbd5e1;
        cursor: pointer;
        user-select: none;
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

  // 2. Top-Left Party & Zone Presence HUD Frame (`#coop-party-hud`)
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
    const zonePilgrims = st?.zonePilgrims || [];
    const hasParty = Boolean(st && (st.active || st.partySize > 1));
    const hasAmbient = zonePilgrims.length > 0;

    if (!st || (!hasParty && !hasAmbient)) {
      partyHudEl.classList.add('is-hidden');
      lastHudSignature = 'hidden';
      return;
    }

    const sig = JSON.stringify({
      lang: i18n.lang,
      active: st.active,
      room: st.roomCode,
      size: st.partySize,
      res: st.resonanceCount,
      kora: st.koraCommunionCount,
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
      ambient: zonePilgrims.slice(0, 3).map((m) => ({
        id: m.id,
        name: m.name,
        lv: m.level,
        hp: Math.round(m.hp),
        maxHp: Math.round(m.maxHp),
        emote: m.emote?.text || '',
      })),
      ambientCount: zonePilgrims.length,
    });
    if (sig === lastHudSignature) return;
    lastHudSignature = sig;

    partyHudEl.classList.remove('is-hidden');

    const visibleCards = hasParty ? st.members : zonePilgrims.slice(0, 3);
    const memberCards = visibleCards.map((m) => {
      const hpPct = Math.max(
        0,
        Math.min(100, Math.round(((m.hp || 0) / Math.max(1, m.maxHp || 100)) * 100)),
      );
      const diffZone = m.zone && m.zone !== state.zone;
      const isAmb = Boolean(m.isAmbient);
      const roleIcon = isAmb ? '🌐' : m.isHost ? '👑' : m.isAi ? '☸' : '🤝';
      return `
        <div class="coop-hud__card ${m.fainted ? 'is-fainted' : ''} ${isAmb ? 'is-ambient' : ''}" data-member-id="${m.id}">
          <div class="coop-hud__card-top">
            <span class="coop-hud__name">${roleIcon} Lv.${m.level || 1} ${m.name}</span>
            <span class="coop-hud__zone">${isAmb ? i18n.t('coop.presence.ambientTag') : formatZoneLabel(m.zone)}</span>
          </div>
          <div class="coop-hud__bar-track">
            <div class="coop-hud__bar-fill ${m.fainted ? 'is-fainted' : ''} ${isAmb ? 'is-ambient' : ''}" style="width:${hpPct}%;"></div>
          </div>
          <div class="coop-hud__actions">
            <span style="font-size:10px;color:${m.fainted ? '#fca5a5' : '#94a3b8'};">
              ${
                m.emote?.text
                  ? m.emote.text
                  : m.fainted
                    ? i18n.t('coop.hud.fainted')
                    : `${Math.round(m.hp || 0)}/${Math.round(m.maxHp || 100)} HP`
              }
            </span>
            <div style="display:flex;gap:4px;">
              ${
                !isAmb && m.fainted
                  ? `<button type="button" class="coop-hud__mini-btn" data-revive-id="${m.id}">${i18n.t('coop.party.reviveBtn')}</button>`
                  : ''
              }
              ${
                !isAmb &&
                ((m.isHost && diffZone) || (m.isHost && m.zone === 'terma' && state.zone !== 'terma'))
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

    const headerTitle = hasParty
      ? `🤝 ${i18n.t('coop.hud.title')} (${st.partySize}/4)`
      : i18n.t('coop.presence.hudTitle', { count: zonePilgrims.length });

    const bonusText = hasParty
      ? `${i18n.t('coop.hud.bonus', { bonus: st.findBonusPct || 0, count: st.resonanceCount || 0 })}${
          hasAmbient ? ` · 🌐 +${zonePilgrims.length}` : ''
        }`
      : i18n.t('coop.presence.hudSub');

    partyHudEl.innerHTML = `
      <div class="coop-hud__header">
        <span class="coop-hud__title" id="coop-hud-open-lobby">${headerTitle}</span>
        ${
          hasParty
            ? `<button type="button" class="coop-hud__room-pill" id="coop-hud-copy-code" title="${i18n.t('coop.room.copyBtn')}">
                ${st.roomCode || 'SANGHA'} 📋
              </button>`
            : `<button type="button" class="coop-hud__room-pill" id="coop-hud-shard-pill">
                ${st.shardId || 'stupa#1'}
              </button>`
        }
      </div>
      <div class="coop-hud__bonus">
        ${bonusText}
      </div>
      <div class="coop-hud__members">
        ${memberCards.join('')}
      </div>
      <div class="coop-hud__emote-row">
        <button type="button" class="coop-hud__emote-btn" data-hud-emote="prostrate" title="${i18n.t('coop.emote.prostrate')}">🙏</button>
        <button type="button" class="coop-hud__emote-btn" data-hud-emote="mantra" title="${i18n.t('coop.emote.mantra')}">☸</button>
        <button type="button" class="coop-hud__emote-btn" data-hud-emote="lamp" title="${i18n.t('coop.emote.lamp')}">🪔</button>
        <button type="button" class="coop-hud__emote-btn" data-hud-emote="protect" title="${i18n.t('coop.emote.protect')}">⚔️</button>
      </div>
    `;

    partyHudEl.querySelector('#coop-hud-open-lobby')?.addEventListener('click', () => open());
    partyHudEl.querySelector('#coop-hud-shard-pill')?.addEventListener('click', () => open());
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
    partyHudEl.querySelectorAll('[data-hud-emote]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emoteId = btn.getAttribute('data-hud-emote');
        ctx.coop?.sendEmote?.(emoteId);
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
      isRoomPublic: true,
      pilgrimName: i18n.t('coop.pilgrimName.default'),
      members: [],
      partySize: 1,
      resonanceCount: 0,
      findBonusPct: 0,
      showAmbientPilgrims: true,
      zonePilgrims: [],
      zoneCounts: { stupa: 1, grove: 0, wild: 0 },
      totalOnline: 1,
      shardId: 'stupa#1',
      publicRooms: [],
    };

    const p = state.player || {};
    const zCounts = st.zoneCounts || {};
    const hereCount = 1 + (st.zonePilgrims?.length || 0) + (st.members?.filter((m) => m.zone === state.zone).length || 0);
    const publicRooms = st.publicRooms || [];

    const publicRoomsHtml =
      publicRooms.length > 0
        ? publicRooms
            .map(
              (r) => `
          <div class="coop-modal__slot" data-public-room="${r.code}">
            <span>
              ${i18n.t('coop.publicRooms.roomItem', {
                code: r.code,
                host: r.hostName || 'Pilgrim',
                zone: formatZoneLabel(r.zone),
                size: r.partySize || 1,
                max: r.maxSize || 4,
              })}
            </span>
            <button type="button" class="coop-modal__btn coop-modal__btn--primary" data-join-public-room="${r.code}">
              ${i18n.t('coop.publicRooms.joinBtn')}
            </button>
          </div>
        `,
            )
            .join('')
        : `<div class="coop-modal__slot coop-modal__slot--empty">${i18n.t('coop.publicRooms.empty')}</div>`;

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

        <!-- 1. Live Zone Presence & Shard Status -->
        <div class="coop-modal__section" id="coop-zone-presence-section">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:4px;">
            <strong style="color:#7dd3fc;font-size:13.5px;">${i18n.t('coop.presence.title')}</strong>
            <span style="font-size:12px;color:#38bdf8;">
              ${i18n.t('coop.presence.banner', {
                total: st.totalOnline || 1,
                shard: st.shardId || 'stupa#1',
                here: hereCount,
              })}
            </span>
          </div>
          <div style="font-size:11.5px;color:#94a3b8;margin-bottom:8px;">
            ${i18n.t('coop.presence.zoneCount', {
              stupa: zCounts.stupa || 0,
              grove: zCounts.grove || 0,
              wild: zCounts.wild || 0,
            })}
          </div>
          <label class="coop-modal__check-label" for="coop-ambient-toggle">
            <input
              type="checkbox"
              id="coop-ambient-toggle"
              ${st.showAmbientPilgrims !== false ? 'checked' : ''}
            />
            <span>${i18n.t('coop.presence.toggle')}</span>
          </label>
        </div>

        <!-- 2. Pilgrim Name & Room Code -->
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

          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            <div style="font-size:12px;color:#94a3b8;">
              ${i18n.t('coop.room.label')}：
              <strong id="coop-current-room-code" style="color:#5eead4;font-size:14px;">
                ${st.active && st.roomCode ? st.roomCode : i18n.t('coop.room.none')}
              </strong>
            </div>
            <label class="coop-modal__check-label" for="coop-public-room-toggle">
              <input
                type="checkbox"
                id="coop-public-room-toggle"
                ${st.isRoomPublic !== false ? 'checked' : ''}
              />
              <span>${i18n.t('coop.publicRooms.publicToggle')}</span>
            </label>
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

        <!-- 3. Public Rooms Matchmaking Browser -->
        <div class="coop-modal__section">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <strong style="color:#fde68a;font-size:13px;">${i18n.t('coop.publicRooms.title')}</strong>
            <button type="button" id="btn-coop-refresh-rooms" class="coop-modal__btn" style="padding:4px 10px;font-size:11.5px;">
              ${i18n.t('coop.publicRooms.refreshBtn')}
            </button>
          </div>
          <div id="coop-public-rooms-list" class="coop-modal__slot-list">
            ${publicRoomsHtml}
          </div>
        </div>

        <!-- 4. Dharma Emote / Prayer Bubble Bar -->
        <div class="coop-modal__section">
          <div style="font-weight:700;color:#fde68a;font-size:13px;margin-bottom:8px;">
            ${i18n.t('coop.emote.title')}
          </div>
          <div id="coop-emote-bar" class="coop-modal__row">
            <button type="button" class="coop-modal__btn" data-coop-emote="prostrate">
              ${i18n.t('coop.emote.prostrate')}
            </button>
            <button type="button" class="coop-modal__btn" data-coop-emote="mantra">
              ${i18n.t('coop.emote.mantra')}
            </button>
            <button type="button" class="coop-modal__btn" data-coop-emote="lamp">
              ${i18n.t('coop.emote.lamp')}
            </button>
            <button type="button" class="coop-modal__btn" data-coop-emote="protect">
              ${i18n.t('coop.emote.protect')}
            </button>
          </div>
        </div>

        <!-- 5. AI Dharma Companions -->
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

        <!-- 6. Party Roster (4 Slots) -->
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
    const ambientToggle = modalEl.querySelector('#coop-ambient-toggle');
    ambientToggle?.addEventListener('change', () => {
      ctx.coop?.setShowAmbientPilgrims?.(ambientToggle.checked);
      renderModal();
      renderPartyHud();
    });

    const publicToggle = modalEl.querySelector('#coop-public-room-toggle');
    publicToggle?.addEventListener('change', () => {
      ctx.coop?.setRoomPublic?.(publicToggle.checked);
      renderModal();
    });

    const nameInput = modalEl.querySelector('#coop-pilgrim-name-input');
    nameInput?.addEventListener('change', () => {
      ctx.coop?.setPilgrimName?.(nameInput.value);
    });

    modalEl.querySelector('#btn-coop-create-room')?.addEventListener('click', () => {
      if (nameInput?.value) ctx.coop?.setPilgrimName?.(nameInput.value);
      const rawCode = modalEl.querySelector('#coop-room-code-input')?.value?.trim();
      ctx.coop?.createRoom?.(rawCode || undefined, {
        isPublic: publicToggle ? publicToggle.checked : true,
      });
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

    modalEl.querySelector('#btn-coop-refresh-rooms')?.addEventListener('click', () => {
      ctx.coop?.refreshPublicRooms?.();
    });

    modalEl.querySelectorAll('[data-join-public-room]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-join-public-room');
        if (code) {
          ctx.coop?.joinRoom?.(code);
          renderModal();
          renderPartyHud();
        }
      });
    });

    modalEl.querySelectorAll('[data-coop-emote]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emoteId = btn.getAttribute('data-coop-emote');
        ctx.coop?.sendEmote?.(emoteId);
      });
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
    ctx.coop?.refreshPublicRooms?.();
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
