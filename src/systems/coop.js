/**
 * Vajra Sangha Co-op Party & Real-Time Synchronization System (`src/systems/coop.js`) — Issue #61
 *
 * Supports 2–4 player Co-op Parties via:
 *   1. Multi-tab / multi-window `BroadcastChannel('stupa.coop.v1')` (~15Hz state + instant events)
 *   2. Dev-server `/api/coop` HTTP polling/push (~2Hz cross-browser sync)
 *   3. AI Dharma Companions (`蓮華行者・扎西`, `普巴行者・卓瑪`, `金剛行者・貢噶`) so a solo or 2-player
 *      party can fill up to 4 slots immediately, follow across zones & Terma floors, fight enemies,
 *      and trigger Six-Syllable Mantra Resonance (`☸ 六字真言共鳴`)!
 */
import '../i18n/coop.js';
import { i18n } from '../i18n.js';
import { resolveAppearanceColors } from '../data/appearance.js';

const CHANNEL_NAME = 'stupa.coop.v1';
const STORAGE_NAME_KEY = 'stupa.coop.pilgrimName';

const ROOM_PREFIXES = ['PADMA', 'VAJRA', 'LOTUS', 'MANI', 'SAMYE', 'TERMA', 'TARA', 'HUM'];

const AI_PRESETS = [
  {
    presetIdx: 0,
    nameKey: 'coop.ai.name.0',
    titleKey: 'coop.ai.title.0',
    look: {
      robeColor: 0x881337,
      shawlColor: 0xf59e0b,
      hatType: 'lotus',
      auraColor: 0xfbbf24,
    },
  },
  {
    presetIdx: 1,
    nameKey: 'coop.ai.name.1',
    titleKey: 'coop.ai.title.1',
    look: {
      robeColor: 0x1e3a8a,
      shawlColor: 0x2dd4bf,
      hatType: 'headband',
      auraColor: 0x2dd4bf,
    },
  },
  {
    presetIdx: 2,
    nameKey: 'coop.ai.name.2',
    titleKey: 'coop.ai.title.2',
    look: {
      robeColor: 0x7c2d12,
      shawlColor: 0xfde047,
      hatType: 'straw',
      auraColor: 0xf97316,
    },
  },
];

export function createCoop(ctx) {
  if (ctx.coop) return ctx.coop;
  const { state, bus } = ctx;

  const peerId = `peer_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36).slice(-4)}`;

  let pilgrimName = loadPilgrimName();
  let active = false;
  let roomCode = '';
  let isHost = false;
  let resonanceCount = 0;

  // Map<peerId, memberSnapshot>
  const remoteMembers = new Map();
  // Array<aiCompanion>
  const aiCompanions = [];

  // Networking & sync timers
  let bc = null;
  let broadcastTimer = 0;
  let httpSyncTimer = 0;
  let httpInFlight = false;
  let lastHttpEventTs = 0;
  const outboundHttpEvents = [];
  const seenEventIds = new Set();
  let leaderDungeonState = null;

  // Mantra Resonance tracking
  let lastLocalMantraTime = -999;
  let lastRemoteMantraTime = -999;
  let lastRemoteMantraMember = null;
  let lastResonanceTime = -999;
  const RESONANCE_WINDOW_SEC = 3.0;
  const RESONANCE_COOLDOWN_SEC = 6.0;
  const RESONANCE_RANGE = 18.0;

  function loadPilgrimName() {
    try {
      const saved = localStorage.getItem(STORAGE_NAME_KEY);
      if (saved && saved.trim()) return saved.trim().slice(0, 20);
    } catch {
      /* ignore */
    }
    return i18n.t('coop.pilgrimName.default');
  }

  function setPilgrimName(name) {
    const clean = String(name || '').trim().slice(0, 20);
    pilgrimName = clean || i18n.t('coop.pilgrimName.default');
    try {
      localStorage.setItem(STORAGE_NAME_KEY, pilgrimName);
    } catch {
      /* ignore */
    }
    syncStateOnCtx();
    bus?.emit('coop:changed', getState());
    return pilgrimName;
  }

  function getPilgrimName() {
    if (!pilgrimName || pilgrimName === 'coop.pilgrimName.default') {
      pilgrimName = i18n.t('coop.pilgrimName.default');
    }
    return pilgrimName;
  }

  function generateRoomCode() {
    const prefix = ROOM_PREFIXES[Math.floor(Math.random() * ROOM_PREFIXES.length)];
    const num = 100 + Math.floor(Math.random() * 900);
    return `${prefix}-${num}`;
  }

  function nowSec() {
    return typeof state.elapsed === 'number' ? state.elapsed : performance.now() / 1000;
  }

  function buildLocalMemberSnapshot() {
    const p = state.player || {};
    const pos = p.position || { x: 0, y: 0, z: 0 };
    const resolvedLook = resolveAppearanceColors(p.appearance || {});
    return {
      id: peerId,
      name: resolvedLook.name || getPilgrimName(),
      isHost,
      isAi: false,
      look: {
        robeColor: resolvedLook.robeHex || 0x7a1c24,
        shawlColor: resolvedLook.shawlHex || 0xe08a1e,
        hatType: resolvedLook.hatType || 'none',
        auraColor: resolvedLook.auraHex || 0xfbbf24,
      },
      zone: state.zone || 'stupa',
      x: Number((pos.x || 0).toFixed(2)),
      y: Number((pos.y || 0).toFixed(2)),
      z: Number((pos.z || 0).toFixed(2)),
      heading: Number((p.heading || 0).toFixed(3)),
      action: p.action || 'idle',
      level: p.level || 1,
      hp: Math.max(0, Math.round(p.hp ?? p.maxHp ?? 100)),
      maxHp: Math.max(1, Math.round(p.maxHp ?? 100)),
      mp: Math.max(0, Math.round(p.mp ?? p.maxMp ?? 60)),
      maxMp: Math.max(1, Math.round(p.maxMp ?? 60)),
      fainted: p.action === 'faint' || (p.hp != null && p.hp <= 0),
    };
  }

  function buildLocalDungeonState() {
    if (state.zone === 'terma' && ctx.dungeon?.isActive?.()) {
      return {
        active: true,
        tier: ctx.dungeon.getTier(),
        seed: ctx.dungeon.getSeed(),
        floor: ctx.dungeon.getFloor(),
      };
    }
    return { active: false };
  }

  function getMembers() {
    if (!active) return [];
    const list = [];
    for (const m of remoteMembers.values()) {
      if (m.id === peerId) continue;
      list.push({
        id: m.id,
        name: m.name || 'Pilgrim',
        isHost: Boolean(m.isHost),
        isAi: Boolean(m.isAi),
        look: m.look || {
          robeColor: 0x7a1c24,
          shawlColor: 0xe08a1e,
          hatType: 'lotus',
          auraColor: 0xfbbf24,
        },
        zone: m.zone || 'stupa',
        x: Number(m.x) || 0,
        y: Number(m.y) || 0,
        z: Number(m.z) || 0,
        heading: Number(m.heading) || 0,
        action: m.action || 'idle',
        level: Number(m.level) || 1,
        hp: Number(m.hp ?? 100),
        maxHp: Number(m.maxHp || 100),
        mp: Number(m.mp ?? 60),
        maxMp: Number(m.maxMp || 60),
        fainted: Boolean(m.fainted),
      });
      if (list.length >= 3) break;
    }

    for (const ai of aiCompanions) {
      if (list.length >= 3) break;
      list.push({
        id: ai.id,
        name: i18n.t(ai.nameKey),
        title: i18n.t(ai.titleKey),
        presetIdx: ai.presetIdx,
        isHost: false,
        isAi: true,
        look: { ...ai.look },
        zone: ai.zone,
        x: Number(ai.x.toFixed(2)),
        y: Number(ai.y.toFixed(2)),
        z: Number(ai.z.toFixed(2)),
        heading: Number(ai.heading.toFixed(3)),
        action: ai.action,
        level: ai.level,
        hp: Math.round(ai.hp),
        maxHp: Math.round(ai.maxHp),
        mp: Math.round(ai.mp),
        maxMp: Math.round(ai.maxMp),
        fainted: Boolean(ai.fainted),
      });
    }
    return list;
  }

  function getPartySize() {
    if (!active) return 1;
    return Math.min(4, 1 + getMembers().length);
  }

  function getFindBonusPct() {
    const extra = Math.max(0, getPartySize() - 1);
    return extra * 25;
  }

  function getHpScaleMult() {
    const extra = Math.max(0, getPartySize() - 1);
    return Number((1 + 0.45 * extra).toFixed(2));
  }

  function getState() {
    const members = getMembers();
    const partySize = active ? Math.min(4, 1 + members.length) : 1;
    return {
      active,
      roomCode,
      isHost,
      peerId,
      pilgrimName: getPilgrimName(),
      members,
      partySize,
      resonanceCount,
      findBonusPct: Math.max(0, partySize - 1) * 25,
      hpScaleMult: Number((1 + 0.45 * Math.max(0, partySize - 1)).toFixed(2)),
      leaderDungeonState,
    };
  }

  function syncStateOnCtx() {
    state.coop = getState();
  }

  // ---------------------------------------------------------------- BroadcastChannel & HTTP Sync
  function ensureBroadcastChannel() {
    if (bc || typeof BroadcastChannel === 'undefined') return;
    try {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (ev) => {
        const msg = ev?.data;
        if (!msg || !active || msg.room !== roomCode || msg.senderId === peerId) return;
        if (msg.kind === 'snapshot' && msg.member) {
          upsertRemoteMember(msg.member);
          if (msg.dungeonState && msg.member.isHost) {
            leaderDungeonState = msg.dungeonState;
          }
        } else if (msg.kind === 'leave') {
          remoteMembers.delete(msg.senderId);
          syncStateOnCtx();
          bus?.emit('coop:changed', getState());
        } else if (msg.kind === 'event' && msg.event) {
          handleRemoteEvent(msg.event);
        }
      };
    } catch {
      bc = null;
    }
  }

  function closeBroadcastChannel() {
    if (!bc) return;
    try {
      bc.close();
    } catch {
      /* ignore */
    }
    bc = null;
  }

  function upsertRemoteMember(m) {
    if (!m || !m.id || m.id === peerId) return;
    const isNew = !remoteMembers.has(m.id);
    if (isNew && 1 + remoteMembers.size + aiCompanions.length >= 4) {
      return;
    }
    remoteMembers.set(m.id, {
      ...m,
      updatedAt: Date.now(),
    });
    if (isNew) {
      syncStateOnCtx();
      bus?.emit('coop:memberJoined', m);
      bus?.emit('coop:changed', getState());
    }
  }

  function broadcastEvent(type, payload = {}) {
    if (!active || !roomCode) return false;
    const ev = {
      id: `${peerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      room: roomCode,
      senderId: peerId,
      type,
      payload,
      ts: Date.now(),
    };
    seenEventIds.add(ev.id);
    if (bc) {
      try {
        bc.postMessage({
          room: roomCode,
          senderId: peerId,
          kind: 'event',
          event: ev,
        });
      } catch {
        /* ignore */
      }
    }
    outboundHttpEvents.push(ev);
    if (outboundHttpEvents.length > 30) outboundHttpEvents.shift();
    return true;
  }

  async function pollHttpCoop(extraBody = null) {
    if (!active || !roomCode || httpInFlight || typeof fetch === 'undefined') return;
    httpInFlight = true;
    try {
      const body = extraBody || {
        room: roomCode,
        since: lastHttpEventTs,
        member: buildLocalMemberSnapshot(),
        dungeonState: isHost ? buildLocalDungeonState() : undefined,
        events: outboundHttpEvents.splice(0, outboundHttpEvents.length),
      };
      const res = await fetch('/api/coop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok && data.room === roomCode) {
          if (data.hostId) {
            isHost = data.hostId === peerId;
          }
          if (data.dungeonState) {
            leaderDungeonState = data.dungeonState;
          }
          if (Array.isArray(data.members)) {
            const seenRemoteIds = new Set();
            for (const m of data.members) {
              if (!m || m.id === peerId) continue;
              seenRemoteIds.add(m.id);
              upsertRemoteMember({
                ...m,
                isHost: data.hostId ? m.id === data.hostId : Boolean(m.isHost),
              });
            }
          }
          if (Array.isArray(data.events)) {
            for (const ev of data.events) {
              if (ev.ts && ev.ts > lastHttpEventTs) {
                lastHttpEventTs = ev.ts;
              }
              handleRemoteEvent(ev);
            }
          }
        }
      }
    } catch {
      /* offline or static build without /api/coop middleware */
    } finally {
      httpInFlight = false;
    }
  }

  // ---------------------------------------------------------------- Room Lifecycle
  function createRoom(customCode) {
    const cleanCustom = customCode ? String(customCode).trim().toUpperCase() : '';
    roomCode = cleanCustom || generateRoomCode();
    active = true;
    isHost = true;
    remoteMembers.clear();
    outboundHttpEvents.length = 0;
    lastHttpEventTs = Date.now();
    ensureBroadcastChannel();
    syncStateOnCtx();

    pollHttpCoop();
    bus?.emit('coop:roomCreated', getState());
    bus?.emit('coop:changed', getState());
    bus?.emit('toast', {
      key: 'toast.coopCreated',
      params: { code: roomCode },
      text: i18n.t('toast.coopCreated', { code: roomCode }),
      kind: 'merit',
    });
    return roomCode;
  }

  function joinRoom(code) {
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) return false;
    roomCode = clean;
    active = true;
    isHost = false;
    remoteMembers.clear();
    outboundHttpEvents.length = 0;
    lastHttpEventTs = Date.now() - 5000;
    ensureBroadcastChannel();
    syncStateOnCtx();

    // Immediately broadcast snapshot & poll HTTP
    if (bc) {
      try {
        bc.postMessage({
          room: roomCode,
          senderId: peerId,
          kind: 'snapshot',
          member: buildLocalMemberSnapshot(),
        });
      } catch {
        /* ignore */
      }
    }
    pollHttpCoop();

    bus?.emit('coop:roomJoined', getState());
    bus?.emit('coop:changed', getState());
    bus?.emit('toast', {
      key: 'toast.coopJoined',
      params: { code: roomCode },
      text: i18n.t('toast.coopJoined', { code: roomCode }),
      kind: 'merit',
    });
    return true;
  }

  function leaveRoom() {
    if (!active) return;
    const prevCode = roomCode;
    if (bc) {
      try {
        bc.postMessage({
          room: prevCode,
          senderId: peerId,
          kind: 'leave',
        });
      } catch {
        /* ignore */
      }
    }
    if (typeof fetch !== 'undefined' && prevCode) {
      fetch('/api/coop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: prevCode, action: 'leave', peerId }),
      }).catch(() => {});
    }
    active = false;
    roomCode = '';
    isHost = false;
    remoteMembers.clear();
    aiCompanions.length = 0;
    leaderDungeonState = null;
    closeBroadcastChannel();
    syncStateOnCtx();
    bus?.emit('coop:roomLeft', { roomCode: prevCode });
    bus?.emit('coop:changed', getState());
    bus?.emit('toast', {
      key: 'toast.coopLeft',
      text: i18n.t('toast.coopLeft'),
      kind: 'info',
    });
  }

  // ---------------------------------------------------------------- AI Dharma Companions
  function addAiCompanion(presetIdx) {
    if (!active) {
      createRoom();
    }
    if (getPartySize() >= 4) {
      bus?.emit('toast', {
        key: 'toast.coopPartyFull',
        text: i18n.t('toast.coopPartyFull'),
        kind: 'warning',
      });
      return null;
    }

    const usedPresets = new Set(aiCompanions.map((a) => a.presetIdx));
    let chosenIdx =
      typeof presetIdx === 'number' && presetIdx >= 0 && presetIdx < AI_PRESETS.length
        ? presetIdx
        : AI_PRESETS.findIndex((p) => !usedPresets.has(p.presetIdx));
    if (chosenIdx < 0) chosenIdx = aiCompanions.length % AI_PRESETS.length;

    const preset = AI_PRESETS[chosenIdx];
    const p = state.player || {};
    const pos = p.position || { x: 0, y: 0, z: 0 };
    const slotIndex = aiCompanions.length;
    const angle = (p.heading || 0) + Math.PI * 0.65 + slotIndex * 1.35;
    const dist = 2.6 + slotIndex * 0.4;
    const sx = (pos.x || 0) + Math.cos(angle) * dist;
    const sz = (pos.z || 0) + Math.sin(angle) * dist;
    const sy = ctx.world?.getHeight ? ctx.world.getHeight(sx, sz) : pos.y || 0;

    const maxHp = Math.max(100, Math.round((p.maxHp || 120) * 0.95));
    const maxMp = Math.max(60, Math.round((p.maxMp || 80) * 0.95));

    const ai = {
      id: `ai_companion_${preset.presetIdx}_${Date.now().toString(36).slice(-3)}`,
      presetIdx: preset.presetIdx,
      nameKey: preset.nameKey,
      titleKey: preset.titleKey,
      isHost: false,
      isAi: true,
      look: { ...preset.look },
      zone: state.zone || 'stupa',
      x: sx,
      y: sy,
      z: sz,
      heading: p.heading || 0,
      action: 'idle',
      level: Math.max(1, p.level || 1),
      hp: maxHp,
      maxHp,
      mp: maxMp,
      maxMp,
      fainted: false,
      followAngle: Math.PI * 0.65 + slotIndex * 1.45,
      followDist: 2.5 + (slotIndex % 2) * 0.6,
      attackTimer: 0.6 + slotIndex * 0.3,
      mantraTimer: 3.5 + slotIndex * 1.8,
    };

    aiCompanions.push(ai);
    syncStateOnCtx();

    const memberSnap = getMembers().find((m) => m.id === ai.id) || ai;
    bus?.emit('sfx', { name: 'summon' });
    bus?.emit('coop:memberJoined', memberSnap);
    bus?.emit('coop:changed', getState());
    bus?.emit('toast', {
      key: 'toast.coopAiSummoned',
      params: { name: i18n.t(ai.nameKey), size: getPartySize() },
      text: i18n.t('toast.coopAiSummoned', { name: i18n.t(ai.nameKey), size: getPartySize() }),
      kind: 'merit',
    });
    return memberSnap;
  }

  function removeAiCompanion(id) {
    if (aiCompanions.length === 0) return false;
    const idx = id ? aiCompanions.findIndex((a) => a.id === id) : aiCompanions.length - 1;
    if (idx < 0) return false;
    const [removed] = aiCompanions.splice(idx, 1);
    syncStateOnCtx();
    bus?.emit('coop:memberLeft', { id: removed.id });
    bus?.emit('coop:changed', getState());
    bus?.emit('toast', {
      key: 'toast.coopAiDismissed',
      params: { name: i18n.t(removed.nameKey) },
      text: i18n.t('toast.coopAiDismissed', { name: i18n.t(removed.nameKey) }),
      kind: 'info',
    });
    return true;
  }

  // ---------------------------------------------------------------- Six-Syllable Mantra Resonance
  function triggerResonance(partnerMember = null) {
    const now = nowSec();
    const p = state.player || {};
    const pos = p.position || { x: 0, y: 0, z: 0 };
    lastResonanceTime = now;
    resonanceCount += 1;

    const partner =
      partnerMember ||
      lastRemoteMantraMember ||
      getMembers().find((m) => m.zone === state.zone && !m.fainted) ||
      null;

    // 1. Heal local player 15% maxHp & 15% maxMp
    const healHp = Math.max(10, Math.round((p.maxHp || 100) * 0.15));
    const healMp = Math.max(8, Math.round((p.maxMp || 60) * 0.15));
    bus?.emit('vitals:restore', {
      hp: healHp,
      mp: healMp,
      source: 'coopResonance',
    });

    // Also heal AI companions by 15%
    for (const ai of aiCompanions) {
      if (!ai.fainted) {
        ai.hp = Math.min(ai.maxHp, ai.hp + Math.round(ai.maxHp * 0.15));
        ai.mp = Math.min(ai.maxMp, ai.mp + Math.round(ai.maxMp * 0.15));
      }
    }

    // 2. Deal bonus liberation damage (player.atk * 2.2) to all enemies within 12m
    const bonusDmg = Math.max(12, Math.round((p.atk || 10) * 2.2));
    const hitEnemies = ctx.enemies?.queryCircle?.(pos, 12.0) || [];
    for (const e of hitEnemies) {
      if (e && e.id) {
        ctx.enemies?.damage?.(e.id, bonusDmg, {
          type: 'magic',
          source: 'coop:resonance',
          from: pos,
        });
      }
    }

    // 3. Emit VFX, audio & toast
    const resonancePayload = {
      x: pos.x || 0,
      y: pos.y || 0,
      z: pos.z || 0,
      partnerId: partner?.id || null,
      partnerX: partner?.x ?? (pos.x || 0) + 2.2,
      partnerZ: partner?.z ?? (pos.z || 0) + 2.2,
      radius: 12.0,
      damage: bonusDmg,
      count: resonanceCount,
    };
    syncStateOnCtx();
    bus?.emit('coop:resonance', resonancePayload);
    bus?.emit('sfx', { name: 'bowl' });
    bus?.emit('toast', {
      key: 'toast.mantraResonance',
      text: i18n.t('toast.mantraResonance'),
      kind: 'merit',
    });
    bus?.emit('coop:changed', getState());
    return resonancePayload;
  }

  function handleRemoteSkillCast(member, skillId = 'mantra', extra = {}) {
    if (!member) return;
    const now = nowSec();
    const mx = Number(extra.x ?? member.x) || 0;
    const my = Number(extra.y ?? member.y) || 0;
    const mz = Number(extra.z ?? member.z) || 0;

    bus?.emit('coop:remoteSkill', {
      memberId: member.id,
      memberName: member.name || (member.nameKey ? i18n.t(member.nameKey) : 'Pilgrim'),
      skillId,
      x: mx,
      y: my,
      z: mz,
    });

    if (skillId === 'mantra' && (member.zone || state.zone) === state.zone) {
      // Damage enemies around teammate's mantra wave (radius 6m)
      const allyAtk = Math.max(8, Math.round((state.player?.atk || 10) * 0.75));
      const nearby = ctx.enemies?.queryCircle?.({ x: mx, z: mz }, 6.0) || [];
      for (const e of nearby) {
        if (e && e.id) {
          ctx.enemies?.damage?.(e.id, allyAtk, {
            type: 'magic',
            source: 'ally:mantra',
            from: { x: mx, y: my, z: mz },
          });
        }
      }

      // Check distance to local player for Six-Syllable Mantra Resonance (within 18m)
      const pPos = state.player?.position;
      if (pPos) {
        const dist = Math.hypot(pPos.x - mx, pPos.z - mz);
        if (dist <= RESONANCE_RANGE) {
          lastRemoteMantraTime = now;
          lastRemoteMantraMember = {
            id: member.id,
            x: mx,
            z: mz,
          };
          if (
            now - lastLocalMantraTime <= RESONANCE_WINDOW_SEC &&
            now - lastResonanceTime >= RESONANCE_COOLDOWN_SEC
          ) {
            triggerResonance(lastRemoteMantraMember);
          }
        }
      }
    }
  }

  function onLocalMantraCast(origin) {
    if (!active) return;
    const now = nowSec();
    const pos = origin || state.player?.position || { x: 0, y: 0, z: 0 };
    lastLocalMantraTime = now;

    broadcastEvent('skill:cast', {
      skillId: 'mantra',
      x: Number((pos.x || 0).toFixed(2)),
      y: Number((pos.y || 0).toFixed(2)),
      z: Number((pos.z || 0).toFixed(2)),
    });

    // If a fainted teammate is within 3.2m when casting Mantra, revive them!
    for (const m of getMembers()) {
      if (m.fainted && m.zone === state.zone) {
        const d = Math.hypot((pos.x || 0) - m.x, (pos.z || 0) - m.z);
        if (d <= 3.2) {
          reviveMember(m.id);
        }
      }
    }

    // Check if a remote member or AI companion cast mantra within 3.0s within 18m
    if (
      now - lastRemoteMantraTime <= RESONANCE_WINDOW_SEC &&
      now - lastResonanceTime >= RESONANCE_COOLDOWN_SEC
    ) {
      triggerResonance(lastRemoteMantraMember);
      return;
    }

    // If an AI Dharma Companion is within 18m and not fainted, have them harmonize their chant
    // so Six-Syllable Mantra Resonance activates seamlessly in AI companion parties!
    if (now - lastResonanceTime >= RESONANCE_COOLDOWN_SEC) {
      const readyAi = aiCompanions.find(
        (ai) =>
          !ai.fainted &&
          ai.zone === state.zone &&
          Math.hypot((pos.x || 0) - ai.x, (pos.z || 0) - ai.z) <= RESONANCE_RANGE,
      );
      if (readyAi) {
        readyAi.mantraTimer = 7.5;
        handleRemoteSkillCast(readyAi, 'mantra');
      }
    }
  }

  // ---------------------------------------------------------------- Teammate Revive & Teleport
  function reviveMember(id, opts = {}) {
    if (!active) return false;
    let targetName = 'Pilgrim';
    let revived = false;

    const ai = aiCompanions.find((a) => a.id === id || (!id && a.fainted));
    if (ai && ai.fainted) {
      ai.fainted = false;
      ai.hp = Math.max(1, Math.round(ai.maxHp * 0.6));
      ai.action = 'idle';
      targetName = i18n.t(ai.nameKey);
      revived = true;
    } else if (id && remoteMembers.has(id)) {
      const rm = remoteMembers.get(id);
      if (rm) {
        rm.fainted = false;
        rm.hp = Math.max(1, Math.round((rm.maxHp || 100) * 0.6));
        rm.action = 'idle';
        targetName = rm.name || 'Pilgrim';
        revived = true;
      }
    }

    if (revived) {
      if (!opts.fromRemote) {
        broadcastEvent('coop:revive', { targetId: id });
      }
      syncStateOnCtx();
      bus?.emit('sfx', { name: 'bell' });
      bus?.emit('coop:revived', { id, name: targetName });
      bus?.emit('coop:changed', getState());
      bus?.emit('toast', {
        key: 'toast.allyRevived',
        params: { name: targetName },
        text: i18n.t('toast.allyRevived', { name: targetName }),
        kind: 'merit',
      });
    }
    return revived;
  }

  function setMemberFainted(id, fainted = true) {
    const ai = aiCompanions.find((a) => a.id === id) || aiCompanions[0];
    if (ai) {
      ai.fainted = Boolean(fainted);
      ai.hp = ai.fainted ? 0 : Math.round(ai.maxHp * 0.6);
      ai.action = ai.fainted ? 'faint' : 'idle';
      syncStateOnCtx();
      bus?.emit('coop:changed', getState());
      return true;
    }
    if (id && remoteMembers.has(id)) {
      const rm = remoteMembers.get(id);
      rm.fainted = Boolean(fainted);
      rm.hp = rm.fainted ? 0 : Math.round((rm.maxHp || 100) * 0.6);
      rm.action = rm.fainted ? 'faint' : 'idle';
      syncStateOnCtx();
      bus?.emit('coop:changed', getState());
      return true;
    }
    return false;
  }

  function teleportToLeader() {
    if (!active) return false;
    const hostMember =
      Array.from(remoteMembers.values()).find((m) => m.isHost) ||
      Array.from(remoteMembers.values())[0] ||
      aiCompanions[0];

    if (leaderDungeonState?.active && ctx.dungeon?.enter) {
      ctx.dungeon.enter(leaderDungeonState.tier || 1, leaderDungeonState.seed, { fromCoop: true });
      if (leaderDungeonState.floor > 1 && ctx.dungeon.loadFloor) {
        ctx.dungeon.loadFloor(leaderDungeonState.floor, { fromCoop: true });
      }
      bus?.emit('toast', {
        key: 'toast.coopTermaSynced',
        params: {
          tier: leaderDungeonState.tier || 1,
          floor: leaderDungeonState.floor || 1,
        },
        text: i18n.t('toast.coopTermaSynced', {
          tier: leaderDungeonState.tier || 1,
          floor: leaderDungeonState.floor || 1,
        }),
        kind: 'info',
      });
      return true;
    }

    if (!hostMember) return false;

    const targetZone = hostMember.zone || 'stupa';
    if (targetZone === 'terma' && ctx.dungeon?.enter) {
      const tier = leaderDungeonState?.tier || 1;
      const seed = leaderDungeonState?.seed || 123;
      ctx.dungeon.enter(tier, seed, { fromCoop: true });
    } else if (state.zone !== targetZone && ctx.zones?.teleport) {
      ctx.zones.teleport(targetZone, {
        skipFade: true,
        spawn: {
          x: hostMember.x || 0,
          z: hostMember.z || 0,
          heading: hostMember.heading || 0,
        },
      });
    }

    if (state.player?.position) {
      state.player.position.set(
        (hostMember.x || 0) + 1.5,
        hostMember.y || 0,
        (hostMember.z || 0) + 1.5,
      );
    }

    bus?.emit('toast', {
      key: 'toast.coopTeleported',
      text: i18n.t('toast.coopTeleported'),
      kind: 'info',
    });
    return true;
  }

  // ---------------------------------------------------------------- Remote Event Handling
  function handleRemoteEvent(ev) {
    if (!ev || !ev.type || ev.senderId === peerId) return;
    if (ev.id) {
      if (seenEventIds.has(ev.id)) return;
      seenEventIds.add(ev.id);
      if (seenEventIds.size > 400) {
        const first = seenEventIds.values().next().value;
        seenEventIds.delete(first);
      }
    }

    const payload = ev.payload || {};
    const sender = remoteMembers.get(ev.senderId) || {
      id: ev.senderId,
      name: payload.senderName || 'Pilgrim',
      zone: payload.zone || state.zone,
      x: payload.x || 0,
      y: payload.y || 0,
      z: payload.z || 0,
    };

    switch (ev.type) {
      case 'skill:cast': {
        handleRemoteSkillCast(sender, payload.skillId || 'mantra', payload);
        break;
      }
      case 'terma:entered': {
        const tier = Number(payload.tier) || 1;
        const seed = payload.seed;
        const floor = Number(payload.floor) || 1;
        leaderDungeonState = { active: true, tier, seed, floor };
        if (
          ctx.dungeon?.enter &&
          (!ctx.dungeon.isActive?.() ||
            ctx.dungeon.getSeed?.() !== seed ||
            ctx.dungeon.getTier?.() !== tier)
        ) {
          ctx.dungeon.enter(tier, seed, { fromCoop: true });
          if (floor > 1 && ctx.dungeon.loadFloor) {
            ctx.dungeon.loadFloor(floor, { fromCoop: true });
          }
          bus?.emit('toast', {
            key: 'toast.coopTermaSynced',
            params: { tier, floor },
            text: i18n.t('toast.coopTermaSynced', { tier, floor }),
            kind: 'info',
          });
        }
        break;
      }
      case 'terma:floor': {
        const floor = Number(payload.floor) || 1;
        if (leaderDungeonState) leaderDungeonState.floor = floor;
        if (ctx.dungeon?.isActive?.() && ctx.dungeon.getFloor?.() !== floor) {
          ctx.dungeon.loadFloor(floor, { fromCoop: true });
        }
        break;
      }
      case 'crystal:broken': {
        if (ctx.dungeon?.isActive?.() && payload.id != null) {
          ctx.dungeon.breakCrystal(payload.id, { fromCoop: true });
        }
        break;
      }
      case 'enemy:damage': {
        const amount = Number(payload.amount) || 0;
        if (amount <= 0) break;
        const activeEnemies = ctx.enemies?.getActiveEnemies?.() || [];
        const target =
          (payload.enemyId && activeEnemies.find((e) => e.id === payload.enemyId)) ||
          (typeof payload.index === 'number' && activeEnemies[payload.index]) ||
          null;
        if (target && target.hp > 0) {
          ctx.enemies?.damage?.(target.id, amount, {
            type: 'magic',
            source: 'coop:remote',
            fromCoop: true,
          });
        } else if (payload.isBoss && ctx.bosses?.getActiveBoss?.()) {
          const boss = ctx.bosses.getActiveBoss();
          boss.damage?.(amount, { source: 'coop:remote', fromCoop: true });
        }
        break;
      }
      case 'coop:revive': {
        if (payload.targetId === peerId && state.player) {
          state.player.hp = Math.max(1, Math.round((state.player.maxHp || 100) * 0.6));
          if (state.player.action === 'faint') {
            state.player.action = 'idle';
          }
          bus?.emit('vitals:restore', {
            hp: Math.round((state.player.maxHp || 100) * 0.6),
            source: 'coopRevive',
          });
          bus?.emit('toast', {
            key: 'toast.allyRevived',
            params: { name: getPilgrimName() },
            text: i18n.t('toast.allyRevived', { name: getPilgrimName() }),
            kind: 'merit',
          });
        } else if (payload.targetId) {
          reviveMember(payload.targetId, { fromRemote: true });
        }
        break;
      }
      default:
        break;
    }
  }

  // ---------------------------------------------------------------- Local Bus Listeners
  bus?.on('mantra:cast', (payload) => {
    onLocalMantraCast(payload?.origin || state.player?.position);
  });

  bus?.on('skill:cast', (payload) => {
    if (!active) return;
    const skillId = payload?.id || payload?.skillId;
    if (skillId === 'mantra') {
      // Handled via mantra:cast or if emitted only on skill:cast
      if (nowSec() - lastLocalMantraTime > 0.25) {
        onLocalMantraCast(payload?.origin || state.player?.position);
      }
      return;
    }
    const pos = payload?.origin || state.player?.position || { x: 0, y: 0, z: 0 };
    broadcastEvent('skill:cast', {
      skillId: skillId || 'skill',
      x: Number((pos.x || 0).toFixed(2)),
      y: Number((pos.y || 0).toFixed(2)),
      z: Number((pos.z || 0).toFixed(2)),
    });
  });

  // ---------------------------------------------------------------- Frame Update
  function updateAiCompanions(dt) {
    if (!active || aiCompanions.length === 0) return;
    const p = state.player;
    const pPos = p?.position;
    if (!pPos) return;

    const enemies = ctx.enemies?.list?.() || [];
    const playerAtk = Math.max(10, Number(p.atk) || 12);

    for (let i = 0; i < aiCompanions.length; i++) {
      const ai = aiCompanions[i];

      // Sync level & zone with player
      ai.level = Math.max(1, p.level || 1);
      if (ai.zone !== state.zone) {
        ai.zone = state.zone;
        const ang = (p.heading || 0) + ai.followAngle;
        ai.x = pPos.x + Math.cos(ang) * ai.followDist;
        ai.z = pPos.z + Math.sin(ang) * ai.followDist;
        ai.y = ctx.world?.getHeight ? ctx.world.getHeight(ai.x, ai.z) : pPos.y || 0;
      }

      if (ai.fainted) {
        ai.action = 'faint';
        ai.hp = 0;
        continue;
      }

      // Teleport back near player if too far (> 28m, e.g. dungeon floor transition)
      const distToPlayer = Math.hypot(ai.x - pPos.x, ai.z - pPos.z);
      if (distToPlayer > 28) {
        const ang = (p.heading || 0) + ai.followAngle;
        ai.x = pPos.x + Math.cos(ang) * ai.followDist;
        ai.z = pPos.z + Math.sin(ang) * ai.followDist;
      }

      // Find nearest enemy within 10m of player or AI
      let nearestEnemy = null;
      let bestDist = 10.0;
      for (const e of enemies) {
        if (!e || e.hp <= 0) continue;
        const ex = e.x ?? e.position?.x ?? 0;
        const ez = e.z ?? e.position?.z ?? 0;
        const d = Math.hypot(ex - ai.x, ez - ai.z);
        if (d < bestDist) {
          bestDist = d;
          nearestEnemy = { ...e, x: ex, z: ez };
        }
      }

      if (nearestEnemy) {
        const dx = nearestEnemy.x - ai.x;
        const dz = nearestEnemy.z - ai.z;
        const dist = Math.hypot(dx, dz) || 0.001;
        ai.heading = Math.atan2(-dx, -dz);

        if (dist > 2.0) {
          const step = Math.min(dist - 1.8, 5.2 * dt);
          ai.x += (dx / dist) * step;
          ai.z += (dz / dist) * step;
          ai.action = 'run';
        } else {
          ai.action = 'idle';
        }

        ai.attackTimer -= dt;
        if (ai.attackTimer <= 0 && dist <= 6.5) {
          ai.attackTimer = 1.25 + (i % 2) * 0.25;
          const dmg = Math.max(4, Math.round(playerAtk * 0.6));
          ctx.enemies?.damage?.(nearestEnemy.id, dmg, {
            type: 'magic',
            source: 'ally',
            from: { x: ai.x, y: ai.y, z: ai.z },
          });
          bus?.emit('coop:remoteSkill', {
            memberId: ai.id,
            memberName: i18n.t(ai.nameKey),
            skillId: 'hum',
            x: ai.x,
            y: ai.y,
            z: ai.z,
            targetX: nearestEnemy.x,
            targetZ: nearestEnemy.z,
          });
        }
      } else {
        // Smoothly follow near player at formation offset (2.2–3.5m)
        const targetAng = (p.heading || 0) + ai.followAngle;
        const tx = pPos.x + Math.cos(targetAng) * ai.followDist;
        const tz = pPos.z + Math.sin(targetAng) * ai.followDist;
        const dx = tx - ai.x;
        const dz = tz - ai.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.35) {
          const speed = dist > 4.5 ? 6.2 : 3.8;
          const step = Math.min(dist, speed * dt);
          ai.x += (dx / dist) * step;
          ai.z += (dz / dist) * step;
          ai.heading = Math.atan2(-dx, -dz);
          ai.action = dist > 2.2 ? 'run' : 'walk';
        } else {
          ai.action = p.action === 'prostrate' ? 'prostrate' : 'idle';
        }
      }

      ai.y = ctx.world?.getHeight ? ctx.world.getHeight(ai.x, ai.z) : pPos.y || 0;

      // Periodically cast Six-Syllable Mantra every ~7s
      ai.mantraTimer -= dt;
      if (ai.mantraTimer <= 0) {
        ai.mantraTimer = 6.8 + (i % 3) * 0.9;
        if (nearestEnemy || nowSec() - lastLocalMantraTime <= RESONANCE_WINDOW_SEC) {
          handleRemoteSkillCast(ai, 'mantra');
        }
      }
    }
  }

  function update(dt) {
    if (!active) return;

    updateAiCompanions(dt);

    // Broadcast local snapshot at ~15Hz over BroadcastChannel
    broadcastTimer += dt;
    if (broadcastTimer >= 0.066) {
      broadcastTimer = 0;
      if (bc && roomCode) {
        try {
          bc.postMessage({
            room: roomCode,
            senderId: peerId,
            kind: 'snapshot',
            member: buildLocalMemberSnapshot(),
            dungeonState: isHost ? buildLocalDungeonState() : undefined,
          });
        } catch {
          /* ignore */
        }
      }
    }

    // Sync with /api/coop at ~2Hz
    httpSyncTimer += dt;
    if (httpSyncTimer >= 0.5) {
      httpSyncTimer = 0;
      pollHttpCoop();
    }

    syncStateOnCtx();
  }

  syncStateOnCtx();

  const api = {
    getState,
    getPartySize,
    getMembers,
    getFindBonusPct,
    getHpScaleMult,
    getPilgrimName,
    setPilgrimName,
    createRoom,
    joinRoom,
    leaveRoom,
    addAiCompanion,
    removeAiCompanion,
    broadcastEvent,
    reviveMember,
    setMemberFainted,
    teleportToLeader,
    triggerResonance,
    handleRemoteEvent,
    update,
  };

  ctx.coop = api;
  ctx.debug?.register?.('coop', api);
  if (typeof window !== 'undefined') {
    window.__stupa = window.__stupa || {};
    window.__stupa.coop = api;
  }

  return api;
}

export default createCoop;
