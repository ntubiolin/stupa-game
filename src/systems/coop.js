/**
 * Vajra Sangha Co-op Party, Zone Presence & Real-Time Synchronization (`src/systems/coop.js`) — Issue #61 / #176
 *
 * Supports:
 *   1. Public Zone Presence (`stupa`, `grove`, `wild`, chapter zones): online pilgrims share the same
 *      zone shard without needing a room code, walk Kora together for Shared Kora Communion (`☸ 十方共修繞塔加持`),
 *      send Dharma Emotes / Prayer Bubbles (`🙏`, `☸`, `🪔`, `⚔️`), and co-fight monsters in the wilderness.
 *   2. WebSocket Real-Time Client (`/ws/multiplayer`) with automatic fallback to HTTP (`/api/presence`, `/api/coop`)
 *      and multi-tab `BroadcastChannel('stupa.coop.v1')`.
 *   3. 2–4 player Co-op Parties with Public Room Matchmaking (`getPublicRooms`, `refreshPublicRooms`)
 *      and AI Dharma Companions (`蓮華行者・扎西`, `普巴行者・卓瑪`, `金剛行者・貢噶`).
 */
import '../i18n/coop.js';
import { i18n } from '../i18n.js';
import { resolveAppearanceColors } from '../data/appearance.js';

const CHANNEL_NAME = 'stupa.coop.v1';
const STORAGE_NAME_KEY = 'stupa.coop.pilgrimName';
const STORAGE_AMBIENT_KEY = 'stupa.coop.showAmbientPilgrims';

const ROOM_PREFIXES = ['PADMA', 'VAJRA', 'LOTUS', 'MANI', 'SAMYE', 'TERMA', 'TARA', 'HUM'];

const VALID_EMOTES = new Set(['prostrate', 'mantra', 'lamp', 'protect']);
const COMBAT_ZONES = new Set(['wild', 'pharping', 'mangyul', 'yarlung', 'samye', 'chimphu', 'terma']);
const KORA_ZONES = new Set(['stupa', 'grove']);
const MAX_AMBIENT_PILGRIMS = 8;

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
  let showAmbientPilgrims = loadShowAmbientPilgrims();
  let active = false;
  let roomCode = '';
  let isHost = false;
  let roomPublic = true;
  let resonanceCount = 0;
  let koraCommunionCount = 0;
  let koraCommunionTimer = 0;

  // Map<peerId, memberSnapshot> for 4-player Co-op Party
  const remoteMembers = new Map();
  // Array<aiCompanion>
  const aiCompanions = [];

  // Map<peerId, ambientPilgrimSnapshot> for Public Zone Presence
  const zonePilgrims = new Map();
  // Map<peerId, { zone, updatedAt }> for BroadcastChannel peer tracking
  const bcPeerZones = new Map();
  // Map<roomCode, publicRoomSummary> for BroadcastChannel public rooms
  const bcPublicRooms = new Map();
  let serverPublicRooms = [];
  let serverZoneCounts = {};
  let serverTotalOnline = 0;
  let shardId = `${state.zone || 'stupa'}#1`;

  // Local Dharma Emote state
  let localEmote = null;

  // Networking & sync timers
  let bc = null;
  let broadcastTimer = 0;
  let presenceBroadcastTimer = 0;
  let httpSyncTimer = 0;
  let presenceHttpTimer = 0;
  let httpInFlight = false;
  let presenceHttpInFlight = false;
  let lastHttpEventTs = 0;
  let lastZoneEventTs = 0;
  let lastKnownZone = state.zone || 'stupa';
  let lastPlayerX = state.player?.position?.x ?? 0;
  let lastPlayerZ = state.player?.position?.z ?? 0;
  const outboundHttpEvents = [];
  const outboundZoneEvents = [];
  const seenEventIds = new Set();
  const liberatedEnemyIds = new Set();
  const remoteLiberatedEnemyIds = new Set();
  let leaderDungeonState = null;

  // WebSocket state
  let ws = null;
  let wsConnected = false;
  let wsConnecting = false;
  let wsSyncTimer = 0;
  let wsReconnectTimer = 0;
  let wsReconnectDelay = 2.0;

  // Mantra Resonance tracking
  let lastLocalMantraTime = -999;
  let lastRemoteMantraTime = -999;
  let lastRemoteMantraMember = null;
  let lastResonanceTime = -999;
  const RESONANCE_WINDOW_SEC = 3.0;
  const RESONANCE_COOLDOWN_SEC = 6.0;
  const RESONANCE_RANGE = 18.0;

  function resolveApiUrl(path) {
    const base =
      globalThis.__STUPA_BACKEND_URL__ ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
      '';
    return base ? `${String(base).replace(/\/$/, '')}${path}` : path;
  }

  function resolveWsUrl() {
    if (globalThis.__STUPA_WS_URL__) return String(globalThis.__STUPA_WS_URL__);
    const base =
      globalThis.__STUPA_BACKEND_URL__ ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
      '';
    if (base) {
      const wsBase = String(base)
        .replace(/^http:\/\//i, 'ws://')
        .replace(/^https:\/\//i, 'wss://')
        .replace(/\/$/, '');
      return `${wsBase}/ws/multiplayer`;
    }
    if (typeof window !== 'undefined' && window.location?.host) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.host}/ws/multiplayer`;
    }
    return '';
  }

  function loadPilgrimName() {
    try {
      const saved = localStorage.getItem(STORAGE_NAME_KEY);
      if (saved && saved.trim()) return saved.trim().slice(0, 20);
    } catch {
      /* ignore */
    }
    return i18n.t('coop.pilgrimName.default');
  }

  function loadShowAmbientPilgrims() {
    try {
      const saved = localStorage.getItem(STORAGE_AMBIENT_KEY);
      if (saved === 'false' || saved === '0') return false;
      if (saved === 'true' || saved === '1') return true;
    } catch {
      /* ignore */
    }
    return true;
  }

  function getShowAmbientPilgrims() {
    return Boolean(showAmbientPilgrims);
  }

  function setShowAmbientPilgrims(val) {
    showAmbientPilgrims = Boolean(val);
    try {
      localStorage.setItem(STORAGE_AMBIENT_KEY, showAmbientPilgrims ? 'true' : 'false');
    } catch {
      /* ignore */
    }
    if (showAmbientPilgrims) {
      postLocalPresence(true);
    }
    syncStateOnCtx();
    bus?.emit('coop:changed', getState());
    return showAmbientPilgrims;
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

  function getLocalEmote() {
    if (localEmote && localEmote.expiresAt > Date.now()) {
      return localEmote;
    }
    localEmote = null;
    return null;
  }

  function buildLocalMemberSnapshot() {
    const p = state.player || {};
    const pos = p.position || { x: 0, y: 0, z: 0 };
    const resolvedLook = resolveAppearanceColors(p.appearance || {});
    const activeEmote = getLocalEmote();
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
      emote: activeEmote ? { ...activeEmote } : null,
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

  function buildPublicRoomSummary() {
    if (!active || !roomCode || !roomPublic) return null;
    return {
      room: roomCode,
      code: roomCode,
      hostId: peerId,
      hostName: getPilgrimName(),
      zone: state.zone || 'stupa',
      partySize: getPartySize(),
      maxSize: 4,
      updatedAt: Date.now(),
    };
  }

  function formatPilgrimRecord(m, isAmbient = false) {
    const activeEmote =
      m.emote && m.emote.expiresAt && m.emote.expiresAt > Date.now() ? { ...m.emote } : null;
    return {
      id: m.id,
      name: m.name || 'Pilgrim',
      isHost: isAmbient ? false : Boolean(m.isHost),
      isAi: isAmbient ? false : Boolean(m.isAi),
      isAmbient: Boolean(isAmbient),
      look: m.look || {
        robeColor: 0x7a1c24,
        shawlColor: 0xe08a1e,
        hatType: 'lotus',
        auraColor: isAmbient ? 0x38bdf8 : 0xfbbf24,
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
      emote: activeEmote,
    };
  }

  function getMembers() {
    if (!active) return [];
    const list = [];
    for (const m of remoteMembers.values()) {
      if (m.id === peerId) continue;
      list.push(formatPilgrimRecord(m, false));
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
        isAmbient: false,
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
        emote: null,
      });
    }
    return list;
  }

  function getZonePilgrims() {
    const currentZone = state.zone || 'stupa';
    const list = [];
    const now = Date.now();
    for (const [id, m] of zonePilgrims.entries()) {
      if (!m || id === peerId || remoteMembers.has(id)) continue;
      if (m.updatedAt && now - m.updatedAt > 15000) {
        zonePilgrims.delete(id);
        continue;
      }
      if ((m.zone || 'stupa') !== currentZone) continue;
      list.push(formatPilgrimRecord(m, true));
      if (list.length >= MAX_AMBIENT_PILGRIMS) break;
    }
    return list;
  }

  function getAllVisiblePilgrims() {
    const party = getMembers();
    if (!showAmbientPilgrims) return party;
    const ambient = getZonePilgrims();
    return [...party, ...ambient];
  }

  function getZoneCounts() {
    const currentZone = state.zone || 'stupa';
    const counts = {
      stupa: 0,
      grove: 0,
      wild: 0,
      pharping: 0,
      mangyul: 0,
      yarlung: 0,
      samye: 0,
      chimphu: 0,
      terma: 0,
      ...serverZoneCounts,
    };

    // Count local player + active BroadcastChannel / party peers if server hasn't already counted them
    const localCountByZone = { [currentZone]: 1 };
    const countedPeers = new Set([peerId]);
    const now = Date.now();

    for (const [id, info] of bcPeerZones.entries()) {
      if (now - (info.updatedAt || 0) > 15000) {
        bcPeerZones.delete(id);
        continue;
      }
      if (!countedPeers.has(id)) {
        countedPeers.add(id);
        const z = info.zone || 'stupa';
        localCountByZone[z] = (localCountByZone[z] || 0) + 1;
      }
    }
    for (const [id, m] of remoteMembers.entries()) {
      if (!countedPeers.has(id)) {
        countedPeers.add(id);
        const z = m.zone || 'stupa';
        localCountByZone[z] = (localCountByZone[z] || 0) + 1;
      }
    }
    for (const [id, m] of zonePilgrims.entries()) {
      if (!countedPeers.has(id)) {
        countedPeers.add(id);
        const z = m.zone || 'stupa';
        localCountByZone[z] = (localCountByZone[z] || 0) + 1;
      }
    }

    for (const [z, c] of Object.entries(localCountByZone)) {
      counts[z] = Math.max(Number(counts[z]) || 0, c);
    }
    return counts;
  }

  function getTotalOnline() {
    const counts = getZoneCounts();
    const sumZones = Object.values(counts).reduce((acc, n) => acc + (Number(n) || 0), 0);
    return Math.max(1, Number(serverTotalOnline) || 0, sumZones);
  }

  function getPublicRooms() {
    const now = Date.now();
    const byCode = new Map();

    for (const r of serverPublicRooms) {
      const code = r?.code || r?.room;
      if (!code) continue;
      byCode.set(code, {
        code,
        room: code,
        hostName: r.hostName || r.host || 'Pilgrim',
        zone: r.zone || 'stupa',
        partySize: Number(r.partySize || r.size || 1),
        maxSize: Number(r.maxSize || 4),
      });
    }

    for (const [code, r] of bcPublicRooms.entries()) {
      if (r.updatedAt && now - r.updatedAt > 15000) {
        bcPublicRooms.delete(code);
        continue;
      }
      byCode.set(code, {
        code,
        room: code,
        hostName: r.hostName || 'Pilgrim',
        zone: r.zone || 'stupa',
        partySize: Number(r.partySize || 1),
        maxSize: Number(r.maxSize || 4),
      });
    }

    if (active && isHost && roomPublic && roomCode) {
      const own = buildPublicRoomSummary();
      if (own) {
        byCode.set(roomCode, {
          code: roomCode,
          room: roomCode,
          hostName: own.hostName,
          zone: own.zone,
          partySize: own.partySize,
          maxSize: own.maxSize,
        });
      }
    }

    return Array.from(byCode.values());
  }

  async function refreshPublicRooms() {
    ensureBroadcastChannel();
    if (bc) {
      try {
        bc.postMessage({
          kind: 'discover_rooms',
          senderId: peerId,
        });
      } catch {
        /* ignore */
      }
    }
    if (wsConnected) {
      wsSend({ type: 'coop:listPublic' });
    }
    if (typeof fetch !== 'undefined') {
      try {
        const res = await fetch(resolveApiUrl('/api/coop?list=public'));
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.rooms)) {
            serverPublicRooms = data.rooms;
          } else if (Array.isArray(data?.publicRooms)) {
            serverPublicRooms = data.publicRooms;
          }
        }
      } catch {
        /* offline or static mode */
      }
    }
    syncStateOnCtx();
    bus?.emit('coop:publicRooms', getPublicRooms());
    bus?.emit('coop:changed', getState());
    return getPublicRooms();
  }

  function isRoomPublic() {
    return Boolean(roomPublic);
  }

  function setRoomPublic(val) {
    roomPublic = Boolean(val);
    postLocalPresence(false);
    syncStateOnCtx();
    bus?.emit('coop:changed', getState());
    return roomPublic;
  }

  function getPartySize() {
    if (!active) return 1;
    return Math.min(4, 1 + getMembers().length);
  }

  function getFindBonusPct() {
    const extra = Math.max(0, getPartySize() - 1);
    return extra * 25;
  }

  function getExpBonusPct() {
    const extra = Math.max(0, getPartySize() - 1);
    return extra * 15;
  }

  function getHpScaleMult() {
    const extra = Math.max(0, getPartySize() - 1);
    return Number((1 + 0.45 * extra).toFixed(2));
  }

  function getState() {
    const members = getMembers();
    const partySize = active ? Math.min(4, 1 + members.length) : 1;
    const currentZone = state.zone || 'stupa';
    const currentShard = shardId && shardId.startsWith(currentZone) ? shardId : `${currentZone}#1`;
    return {
      active,
      roomCode,
      isHost,
      isRoomPublic: Boolean(roomPublic),
      peerId,
      pilgrimName: getPilgrimName(),
      members,
      partySize,
      resonanceCount,
      koraCommunionCount,
      findBonusPct: Math.max(0, partySize - 1) * 25,
      expBonusPct: Math.max(0, partySize - 1) * 15,
      hpScaleMult: Number((1 + 0.45 * Math.max(0, partySize - 1)).toFixed(2)),
      leaderDungeonState,
      showAmbientPilgrims: Boolean(showAmbientPilgrims),
      zonePilgrims: showAmbientPilgrims ? getZonePilgrims() : [],
      zoneCounts: getZoneCounts(),
      totalOnline: getTotalOnline(),
      shardId: currentShard,
      publicRooms: getPublicRooms(),
      localEmote: getLocalEmote(),
      wsConnected: Boolean(wsConnected),
    };
  }

  function syncStateOnCtx() {
    state.coop = getState();
  }

  // ---------------------------------------------------------------- BroadcastChannel, WebSocket & HTTP Sync
  function postLocalPresence(replyRequested = false) {
    ensureBroadcastChannel();
    if (!bc) return;
    try {
      bc.postMessage({
        kind: 'presence',
        senderId: peerId,
        zone: state.zone || 'stupa',
        pilgrim: buildLocalMemberSnapshot(),
        publicRoom: buildPublicRoomSummary(),
        replyRequested: Boolean(replyRequested),
      });
    } catch {
      /* ignore */
    }
  }

  function upsertZonePilgrim(p, fromBc = false) {
    if (!p || !p.id || p.id === peerId || remoteMembers.has(p.id)) return;
    const currentZone = state.zone || 'stupa';
    if ((p.zone || 'stupa') !== currentZone) {
      if (zonePilgrims.has(p.id)) {
        zonePilgrims.delete(p.id);
        syncStateOnCtx();
        bus?.emit('coop:changed', getState());
      }
      return;
    }
    const isNew = !zonePilgrims.has(p.id);
    if (isNew && zonePilgrims.size >= MAX_AMBIENT_PILGRIMS) return;
    const prev = zonePilgrims.get(p.id);
    zonePilgrims.set(p.id, {
      ...prev,
      ...p,
      emote: p.emote !== undefined ? p.emote : prev?.emote || null,
      isAmbient: true,
      fromBc: Boolean(fromBc || prev?.fromBc),
      updatedAt: Date.now(),
    });
    if (isNew) {
      syncStateOnCtx();
      bus?.emit('coop:zonePilgrimJoined', p);
      bus?.emit('coop:changed', getState());
    }
  }

  function ensureBroadcastChannel() {
    if (bc || typeof BroadcastChannel === 'undefined') return;
    try {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (ev) => {
        const msg = ev?.data;
        if (!msg || msg.senderId === peerId) return;

        // 1. Ambient Zone Presence & Public Room Discovery over BroadcastChannel
        if (msg.kind === 'presence') {
          const isUnknownPeer = !bcPeerZones.has(msg.senderId);
          bcPeerZones.set(msg.senderId, {
            zone: msg.zone || msg.pilgrim?.zone || 'stupa',
            updatedAt: Date.now(),
          });

          if (msg.publicRoom && msg.publicRoom.code) {
            bcPublicRooms.set(msg.publicRoom.code, {
              ...msg.publicRoom,
              updatedAt: Date.now(),
            });
          } else {
            for (const [code, r] of bcPublicRooms.entries()) {
              if (r.hostId === msg.senderId) bcPublicRooms.delete(code);
            }
          }

          if (msg.pilgrim) {
            upsertZonePilgrim(msg.pilgrim, true);
          }

          if (Array.isArray(msg.events)) {
            for (const e of msg.events) {
              handleRemoteEvent(e);
            }
          }

          if (msg.replyRequested || isUnknownPeer) {
            postLocalPresence(false);
          }
          syncStateOnCtx();
          return;
        }

        if (msg.kind === 'discover_rooms') {
          if (active && isHost && roomPublic && roomCode) {
            postLocalPresence(false);
          }
          return;
        }

        if (msg.kind === 'zone_event' && msg.event) {
          if (!msg.zone || msg.zone === (state.zone || 'stupa')) {
            handleRemoteEvent(msg.event);
          }
          return;
        }

        // 2. Private / Public 4-Player Co-op Room Messages
        if (!active || msg.room !== roomCode) return;
        if (msg.kind === 'snapshot' && msg.member) {
          zonePilgrims.delete(msg.member.id);
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

  function upsertRemoteMember(m) {
    if (!m || !m.id || m.id === peerId) return;
    zonePilgrims.delete(m.id);
    const isNew = !remoteMembers.has(m.id);
    if (isNew && 1 + remoteMembers.size + aiCompanions.length >= 4) {
      return;
    }
    const prev = remoteMembers.get(m.id);
    remoteMembers.set(m.id, {
      ...prev,
      ...m,
      emote: m.emote !== undefined ? m.emote : prev?.emote || null,
      updatedAt: Date.now(),
    });
    if (isNew) {
      syncStateOnCtx();
      bus?.emit('coop:memberJoined', m);
      bus?.emit('coop:changed', getState());
    }
  }

  function createEventEnvelope(type, payload = {}, roomTarget = roomCode) {
    return {
      id: `${peerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      room: roomTarget || '*',
      zone: payload.zone || state.zone || 'stupa',
      senderId: peerId,
      senderName: getPilgrimName(),
      type,
      payload: {
        ...payload,
        zone: payload.zone || state.zone || 'stupa',
        senderName: payload.senderName || getPilgrimName(),
      },
      ts: Date.now(),
    };
  }

  function broadcastEvent(type, payload = {}) {
    if (!active || !roomCode) return false;
    const ev = createEventEnvelope(type, payload, roomCode);
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
    if (wsConnected) {
      wsSend({
        type: 'coop:event',
        room: roomCode,
        peerId,
        event: ev,
      });
    }
    return true;
  }

  function broadcastZoneEvent(type, payload = {}) {
    const ev = createEventEnvelope(type, payload, roomCode || '*');
    seenEventIds.add(ev.id);
    ensureBroadcastChannel();
    if (bc) {
      try {
        bc.postMessage({
          kind: 'zone_event',
          zone: ev.zone,
          room: roomCode || '',
          senderId: peerId,
          event: ev,
        });
        if (active && roomCode) {
          bc.postMessage({
            room: roomCode,
            senderId: peerId,
            kind: 'event',
            event: ev,
          });
        }
      } catch {
        /* ignore */
      }
    }
    outboundZoneEvents.push(ev);
    if (outboundZoneEvents.length > 30) outboundZoneEvents.shift();
    if (active && roomCode) {
      outboundHttpEvents.push(ev);
      if (outboundHttpEvents.length > 30) outboundHttpEvents.shift();
    }
    if (wsConnected) {
      wsSend({
        type: 'presence:event',
        peerId,
        zone: ev.zone,
        room: roomCode || undefined,
        event: ev,
      });
    }
    return true;
  }

  function applyServerPresenceData(data) {
    if (!data || typeof data !== 'object') return;
    if (data.shardId || data.shard) {
      shardId = String(data.shardId || data.shard);
    }
    if (data.zoneCounts && typeof data.zoneCounts === 'object') {
      serverZoneCounts = { ...serverZoneCounts, ...data.zoneCounts };
    } else if (data.zones && typeof data.zones === 'object') {
      serverZoneCounts = { ...serverZoneCounts, ...data.zones };
    }
    if (typeof data.totalOnline === 'number') {
      serverTotalOnline = data.totalOnline;
    }
    if (Array.isArray(data.publicRooms)) {
      serverPublicRooms = data.publicRooms;
    }
    const list = data.pilgrims || data.zonePilgrims || data.members;
    if (Array.isArray(list)) {
      const now = Date.now();
      const serverIds = new Set();
      for (const p of list) {
        if (!p || p.id === peerId || remoteMembers.has(p.id)) continue;
        serverIds.add(p.id);
        upsertZonePilgrim(p, false);
      }
      // Remove non-BroadcastChannel pilgrims no longer in server snapshot for this zone
      for (const [id, existing] of zonePilgrims.entries()) {
        if (!existing.fromBc && !serverIds.has(id) && now - (existing.updatedAt || 0) > 4000) {
          zonePilgrims.delete(id);
        }
      }
    }
    if (Array.isArray(data.events)) {
      for (const ev of data.events) {
        if (ev?.ts && ev.ts > lastZoneEventTs) {
          lastZoneEventTs = ev.ts;
        }
        handleRemoteEvent(ev);
      }
    }
    syncStateOnCtx();
  }

  function applyServerCoopData(data) {
    if (!data || !active || (data.room && data.room !== roomCode)) return;
    if (data.hostId) {
      isHost = data.hostId === peerId;
    }
    if (data.dungeonState) {
      leaderDungeonState = data.dungeonState;
    }
    if (Array.isArray(data.members)) {
      for (const m of data.members) {
        if (!m || m.id === peerId) continue;
        upsertRemoteMember({
          ...m,
          isHost: data.hostId ? m.id === data.hostId : Boolean(m.isHost),
        });
      }
    }
    if (Array.isArray(data.events)) {
      for (const ev of data.events) {
        if (ev?.ts && ev.ts > lastHttpEventTs) {
          lastHttpEventTs = ev.ts;
        }
        handleRemoteEvent(ev);
      }
    }
    syncStateOnCtx();
  }

  function wsSend(msg) {
    if (!ws || !wsConnected) return false;
    try {
      ws.send(JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  function connectWebSocket() {
    if (ws || wsConnecting || typeof WebSocket === 'undefined') return;
    const url = resolveWsUrl();
    if (!url) return;
    wsConnecting = true;
    try {
      const socket = new WebSocket(url);
      ws = socket;
      socket.onopen = () => {
        wsConnecting = false;
        wsConnected = true;
        wsReconnectDelay = 2.0;
        wsSend({
          type: 'presence:update',
          peerId,
          zone: state.zone || 'stupa',
          pilgrim: buildLocalMemberSnapshot(),
          events: outboundZoneEvents.splice(0, outboundZoneEvents.length),
        });
        if (active && roomCode) {
          wsSend({
            type: 'coop:sync',
            room: roomCode,
            isPublic: roomPublic,
            member: buildLocalMemberSnapshot(),
            dungeonState: isHost ? buildLocalDungeonState() : undefined,
            events: outboundHttpEvents.splice(0, outboundHttpEvents.length),
          });
        }
        syncStateOnCtx();
      };
      socket.onmessage = (event) => {
        try {
          const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (!msg || typeof msg !== 'object') return;
          if (
            msg.type === 'presence:state' ||
            msg.type === 'presence:sync' ||
            msg.type === 'presence:update'
          ) {
            applyServerPresenceData(msg);
          } else if (msg.type === 'presence:event' || msg.type === 'zone:event') {
            if (msg.event) handleRemoteEvent(msg.event);
          } else if (
            msg.type === 'coop:state' ||
            msg.type === 'coop:sync' ||
            msg.type === 'coop:update'
          ) {
            applyServerCoopData(msg);
          } else if (msg.type === 'coop:event') {
            if (msg.event) handleRemoteEvent(msg.event);
          } else if (msg.type === 'coop:publicRooms') {
            if (Array.isArray(msg.rooms || msg.publicRooms)) {
              serverPublicRooms = msg.rooms || msg.publicRooms;
              syncStateOnCtx();
              bus?.emit('coop:publicRooms', getPublicRooms());
              bus?.emit('coop:changed', getState());
            }
          } else if (msg.type === 'community:event' || msg.type === 'community:state') {
            bus?.emit('ws:community', {
              action: msg.action || msg.type,
              payload: msg.payload ?? msg.state ?? msg,
            });
          }
        } catch {
          /* ignore malformed WS message */
        }
      };
      socket.onerror = () => {
        /* handled by onclose */
      };
      socket.onclose = () => {
        ws = null;
        wsConnected = false;
        wsConnecting = false;
        wsReconnectTimer = wsReconnectDelay;
        wsReconnectDelay = Math.min(30, wsReconnectDelay * 1.8);
      };
    } catch {
      ws = null;
      wsConnected = false;
      wsConnecting = false;
      wsReconnectTimer = wsReconnectDelay;
    }
  }

  async function pollHttpPresence() {
    if (!showAmbientPilgrims || presenceHttpInFlight || typeof fetch === 'undefined') return;
    presenceHttpInFlight = true;
    try {
      const body = {
        peerId,
        zone: state.zone || 'stupa',
        since: lastZoneEventTs,
        pilgrim: buildLocalMemberSnapshot(),
        events: outboundZoneEvents.splice(0, outboundZoneEvents.length),
      };
      const res = await fetch(resolveApiUrl('/api/presence'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok !== false) {
          applyServerPresenceData(data);
        }
      }
    } catch {
      /* offline or static mode */
    } finally {
      presenceHttpInFlight = false;
    }
  }

  async function pollHttpCoop(extraBody = null) {
    if (!active || !roomCode || httpInFlight || typeof fetch === 'undefined') return;
    httpInFlight = true;
    try {
      const body = extraBody || {
        room: roomCode,
        isPublic: roomPublic,
        since: lastHttpEventTs,
        member: buildLocalMemberSnapshot(),
        dungeonState: isHost ? buildLocalDungeonState() : undefined,
        events: outboundHttpEvents.splice(0, outboundHttpEvents.length),
      };
      const res = await fetch(resolveApiUrl('/api/coop'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok && data.room === roomCode) {
          applyServerCoopData(data);
        }
      }
    } catch {
      /* offline or static build without /api/coop middleware */
    } finally {
      httpInFlight = false;
    }
  }

  // ---------------------------------------------------------------- Room Lifecycle
  function createRoom(customCode, opts = {}) {
    const cleanCustom = customCode ? String(customCode).trim().toUpperCase() : '';
    roomCode = cleanCustom || generateRoomCode();
    active = true;
    isHost = true;
    if (typeof opts?.isPublic === 'boolean') {
      roomPublic = opts.isPublic;
    }
    remoteMembers.clear();
    outboundHttpEvents.length = 0;
    lastHttpEventTs = Date.now();
    ensureBroadcastChannel();
    postLocalPresence(false);
    syncStateOnCtx();

    if (wsConnected) {
      wsSend({
        type: 'coop:sync',
        room: roomCode,
        isPublic: roomPublic,
        member: buildLocalMemberSnapshot(),
        dungeonState: buildLocalDungeonState(),
        events: [],
      });
    } else {
      pollHttpCoop();
    }
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
    if (wsConnected) {
      wsSend({
        type: 'coop:sync',
        room: roomCode,
        isPublic: roomPublic,
        member: buildLocalMemberSnapshot(),
        events: [],
      });
    } else {
      pollHttpCoop();
    }

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
    bcPublicRooms.delete(prevCode);
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
    if (wsConnected && prevCode) {
      wsSend({
        type: 'coop:leave',
        room: prevCode,
        peerId,
      });
    } else if (typeof fetch !== 'undefined' && prevCode) {
      fetch(resolveApiUrl('/api/coop'), {
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
    postLocalPresence(false);
    syncStateOnCtx();
    bus?.emit('coop:roomLeft', { roomCode: prevCode });
    bus?.emit('coop:changed', getState());
    bus?.emit('toast', {
      key: 'toast.coopLeft',
      text: i18n.t('toast.coopLeft'),
      kind: 'info',
    });
  }

  // ---------------------------------------------------------------- Dharma Emotes / Prayer Bubbles
  function sendEmote(emoteId = 'mantra') {
    const cleanId = VALID_EMOTES.has(emoteId) ? emoteId : 'mantra';
    const text = i18n.t(`coop.emote.${cleanId}`);
    const expiresAt = Date.now() + 4500;
    localEmote = {
      id: cleanId,
      text,
      ts: Date.now(),
      expiresAt,
    };

    const pos = state.player?.position || { x: 0, y: 0, z: 0 };
    broadcastZoneEvent('coop:emote', {
      emoteId: cleanId,
      text,
      senderName: getPilgrimName(),
      zone: state.zone || 'stupa',
      x: Number((pos.x || 0).toFixed(2)),
      y: Number((pos.y || 0).toFixed(2)),
      z: Number((pos.z || 0).toFixed(2)),
    });
    postLocalPresence(false);
    syncStateOnCtx();

    bus?.emit('coop:emote', {
      peerId,
      isSelf: true,
      senderName: getPilgrimName(),
      emoteId: cleanId,
      text,
      expiresAt,
    });
    bus?.emit('toast', {
      key: 'toast.emoteSent',
      params: { text },
      text: i18n.t('toast.emoteSent', { text }),
      kind: 'merit',
    });
    bus?.emit('coop:changed', getState());
    return localEmote;
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
      getAllVisiblePilgrims().find((m) => m.zone === state.zone && !m.fainted) ||
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
    if (!active && zonePilgrims.size === 0) return;
    const now = nowSec();
    const pos = origin || state.player?.position || { x: 0, y: 0, z: 0 };
    lastLocalMantraTime = now;

    broadcastZoneEvent('skill:cast', {
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

    // Check if a remote member or ambient pilgrim cast mantra within 3.0s within 18m
    if (
      now - lastRemoteMantraTime <= RESONANCE_WINDOW_SEC &&
      now - lastResonanceTime >= RESONANCE_COOLDOWN_SEC
    ) {
      triggerResonance(lastRemoteMantraMember);
      return;
    }

    // If an AI Dharma Companion is within 18m and not fainted, have them harmonize their chant
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
    const sender =
      remoteMembers.get(ev.senderId) ||
      zonePilgrims.get(ev.senderId) || {
        id: ev.senderId,
        name: payload.senderName || ev.senderName || 'Pilgrim',
        zone: payload.zone || ev.zone || state.zone,
        x: payload.x || 0,
        y: payload.y || 0,
        z: payload.z || 0,
      };

    switch (ev.type) {
      case 'skill:cast': {
        handleRemoteSkillCast(sender, payload.skillId || 'mantra', payload);
        break;
      }
      case 'coop:emote': {
        const emoteId = VALID_EMOTES.has(payload.emoteId) ? payload.emoteId : 'mantra';
        const emoteText = payload.text || i18n.t(`coop.emote.${emoteId}`);
        const emoteObj = {
          id: emoteId,
          text: emoteText,
          ts: Date.now(),
          expiresAt: Date.now() + 4500,
        };
        if (remoteMembers.has(ev.senderId)) {
          remoteMembers.get(ev.senderId).emote = emoteObj;
        }
        if (zonePilgrims.has(ev.senderId)) {
          zonePilgrims.get(ev.senderId).emote = emoteObj;
        }
        syncStateOnCtx();
        bus?.emit('coop:emote', {
          peerId: ev.senderId,
          isSelf: false,
          senderName: payload.senderName || sender.name || 'Pilgrim',
          emoteId,
          text: emoteText,
          expiresAt: emoteObj.expiresAt,
        });
        bus?.emit('coop:changed', getState());
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
        if (payload.zone && state.zone && payload.zone !== state.zone) break;
        const amount = Number(payload.amount) || 0;
        if (amount <= 0) break;
        bus?.emit('coop:enemyDamage', {
          ...payload,
          senderId: ev.senderId,
        });
        const activeEnemies = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.list?.() || [];
        let target =
          (payload.enemyId && activeEnemies.find((e) => e.id === payload.enemyId && e.hp > 0)) ||
          (typeof payload.index === 'number' && activeEnemies[payload.index]) ||
          null;
        if (!target && activeEnemies.length > 0) {
          const ex = Number(payload.x ?? sender.x) || 0;
          const ez = Number(payload.z ?? sender.z) || 0;
          let bestDist = 16.0;
          for (const e of activeEnemies) {
            if (!e || e.hp <= 0 || e.state === 'liberated' || e.state === 'calmed') continue;
            if (payload.kind && e.kind && e.kind !== payload.kind) continue;
            const epX = e.pos?.x ?? e.x ?? 0;
            const epZ = e.pos?.z ?? e.z ?? 0;
            const d = Math.hypot(epX - ex, epZ - ez);
            if (d < bestDist) {
              bestDist = d;
              target = e;
            }
          }
        }
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
      case 'enemy:liberated': {
        if (payload.zone && state.zone && payload.zone !== state.zone) break;
        const pPos = state.player?.position || { x: 0, z: 0 };
        const ex = Number(payload.x ?? sender.x) || 0;
        const ez = Number(payload.z ?? sender.z) || 0;
        const distToEvent = Math.hypot((pPos.x || 0) - ex, (pPos.z || 0) - ez);
        const inSameParty = active && remoteMembers.has(ev.senderId);
        if (!inSameParty && distToEvent > 28.0) break;

        const enemyId = payload.enemyId || payload.id;
        if (enemyId && liberatedEnemyIds.has(enemyId)) break;
        if (enemyId) {
          remoteLiberatedEnemyIds.add(enemyId);
          if (remoteLiberatedEnemyIds.size > 400) {
            remoteLiberatedEnemyIds.delete(remoteLiberatedEnemyIds.values().next().value);
          }
        }

        const activeEnemies = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.list?.() || [];
        let target =
          (enemyId &&
            activeEnemies.find(
              (e) => e.id === enemyId && e.hp > 0 && e.state !== 'liberated' && e.state !== 'calmed',
            )) ||
          null;
        if (!target && activeEnemies.length > 0) {
          let bestDist = 12.0;
          for (const e of activeEnemies) {
            if (!e || e.hp <= 0 || e.state === 'liberated' || e.state === 'calmed') continue;
            if (payload.kind && e.kind && e.kind !== payload.kind) continue;
            const epX = e.pos?.x ?? e.x ?? 0;
            const epZ = e.pos?.z ?? e.z ?? 0;
            const d = Math.hypot(epX - ex, epZ - ez);
            if (d < bestDist) {
              bestDist = d;
              target = e;
            }
          }
        }

        if (target && target.hp > 0) {
          remoteLiberatedEnemyIds.add(target.id);
          ctx.enemies?.damage?.(target.id, target.hp + 9999, {
            type: 'magic',
            source: 'coop:remote',
            fromCoop: true,
            execute: true,
          });
        } else {
          if (enemyId) {
            liberatedEnemyIds.add(enemyId);
          }
          const baseExp = Math.max(0, Number(payload.exp) || 0);
          const extraContributors = Math.min(
            3,
            Math.max(1, Math.max(0, getPartySize() - 1) + getZonePilgrims().length),
          );
          const bonusExp = baseExp > 0 ? Math.max(1, Math.round(baseExp * 0.15 * extraContributors)) : 0;
          const totalSharedExp = baseExp + bonusExp;
          if (totalSharedExp > 0) {
            if (ctx.vitals?.addExp) {
              ctx.vitals.addExp(totalSharedExp);
            } else if (state.player && typeof state.player.exp === 'number') {
              state.player.exp += totalSharedExp;
            }
          }
          bus?.emit('coop:sharedLiberation', {
            enemyId,
            kind: payload.kind,
            baseExp,
            bonusExp,
            totalExp: totalSharedExp,
            senderId: ev.senderId,
          });
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
    const skillId = payload?.id || payload?.skillId;
    if (skillId === 'mantra') {
      if (nowSec() - lastLocalMantraTime > 0.25) {
        onLocalMantraCast(payload?.origin || state.player?.position);
      }
      return;
    }
    if (!active && zonePilgrims.size === 0) return;
    const pos = payload?.origin || state.player?.position || { x: 0, y: 0, z: 0 };
    broadcastZoneEvent('skill:cast', {
      skillId: skillId || 'skill',
      x: Number((pos.x || 0).toFixed(2)),
      y: Number((pos.y || 0).toFixed(2)),
      z: Number((pos.z || 0).toFixed(2)),
    });
  });

  // Wilderness & Dungeon Combat Sync (`enemy:hit` -> `enemy:damage`)
  bus?.on('enemy:hit', (payload) => {
    if (!payload || payload.source === 'coop:remote' || payload.fromCoop) return;
    const amount = Number(payload.damage ?? payload.amount) || 0;
    if (amount <= 0) return;
    const currentZone = state.zone || 'wild';
    if (!COMBAT_ZONES.has(currentZone)) return;
    const ex = Number((payload.position?.x ?? state.player?.position?.x ?? 0).toFixed(2));
    const ez = Number((payload.position?.z ?? state.player?.position?.z ?? 0).toFixed(2));
    broadcastZoneEvent('enemy:damage', {
      enemyId: payload.id || payload.enemyId,
      kind: payload.kind,
      amount,
      x: ex,
      z: ez,
      zone: currentZone,
    });
  });

  // Wilderness & Party Co-op Liberation EXP Sharing (+15% EXP bonus per extra pilgrim, 100% shared base EXP)
  bus?.on('enemy:liberated', (payload) => {
    if (!payload) return;
    const enemyId = payload.id || payload.enemyId;
    if (enemyId && liberatedEnemyIds.has(enemyId)) return;
    if (enemyId) {
      liberatedEnemyIds.add(enemyId);
      if (liberatedEnemyIds.size > 400) {
        liberatedEnemyIds.delete(liberatedEnemyIds.values().next().value);
      }
    }

    const ex = Number((payload.position?.x ?? state.player?.position?.x ?? 0).toFixed(2));
    const ez = Number((payload.position?.z ?? state.player?.position?.z ?? 0).toFixed(2));
    const baseExp = Math.max(0, Number(payload.exp) || 0);

    const nearbyAmbientCount = getZonePilgrims().filter(
      (m) => Math.hypot((m.x || 0) - ex, (m.z || 0) - ez) <= 24.0,
    ).length;
    const bonusContributors = Math.min(
      3,
      Math.max(0, getPartySize() - 1) + nearbyAmbientCount,
    );

    if (bonusContributors > 0 && baseExp > 0) {
      const bonusExp = Math.max(1, Math.round(baseExp * 0.15 * bonusContributors));
      if (ctx.vitals?.addExp) {
        ctx.vitals.addExp(bonusExp);
      } else if (state.player && typeof state.player.exp === 'number') {
        state.player.exp += bonusExp;
      }
      bus?.emit('coop:expBonus', {
        enemyId,
        baseExp,
        bonusExp,
        contributors: bonusContributors,
      });
    }

    const wasFromRemote =
      Boolean(payload.fromCoop) || Boolean(enemyId && remoteLiberatedEnemyIds.has(enemyId));
    if (!wasFromRemote && (active || zonePilgrims.size > 0)) {
      const currentZone = state.zone || payload.mapId || 'wild';
      if (COMBAT_ZONES.has(currentZone)) {
        broadcastZoneEvent('enemy:liberated', {
          enemyId,
          kind: payload.kind,
          exp: baseExp,
          level: payload.level || 1,
          rank: payload.rank || 'normal',
          x: ex,
          z: ez,
          zone: currentZone,
        });
      }
    }
  });

  // Forward Community Stupa / Butter Lamp outbound actions over WebSocket when connected
  bus?.on('community:outbound', (msg) => {
    if (!msg) return;
    wsSend({
      type: 'community:action',
      action: msg.action,
      payload: msg.payload,
    });
  });

  // ---------------------------------------------------------------- Shared Kora Communion
  function updateSharedKoraCommunion(dt) {
    const currentZone = state.zone || 'stupa';
    if (!KORA_ZONES.has(currentZone)) {
      koraCommunionTimer = 0;
      return;
    }

    const p = state.player || {};
    const pos = p.position || { x: 0, y: 0, z: 0 };
    const movedDist = Math.hypot((pos.x || 0) - lastPlayerX, (pos.z || 0) - lastPlayerZ);
    const isPracticing =
      p.action === 'walk' ||
      p.action === 'run' ||
      p.action === 'prostrate' ||
      Boolean(p.isMoving) ||
      (typeof p.speed === 'number' && p.speed > 0.1) ||
      movedDist > 0.005;

    if (!isPracticing) return;

    const visiblePilgrims = getAllVisiblePilgrims();
    const nearbyPilgrim = visiblePilgrims.find(
      (m) =>
        (m.zone || 'stupa') === currentZone &&
        !m.fainted &&
        Math.hypot((pos.x || 0) - (m.x || 0), (pos.z || 0) - (m.z || 0)) <= 15.0,
    );

    if (!nearbyPilgrim) return;

    koraCommunionTimer += dt;
    if (koraCommunionTimer >= 8.0) {
      koraCommunionTimer -= 8.0;
      koraCommunionCount += 1;

      const maxHp = Math.max(1, Number(p.maxHp) || 100);
      const maxMp = Math.max(1, Number(p.maxMp) || 60);
      const healHp = Math.max(1, Math.round(maxHp * 0.05));
      const healMp = Math.max(1, Math.round(maxMp * 0.08));

      if (typeof p.hp === 'number') {
        p.hp = Math.min(maxHp, p.hp + healHp);
      }
      if (typeof p.mp === 'number') {
        p.mp = Math.min(maxMp, p.mp + healMp);
      }

      bus?.emit('vitals:restore', {
        hp: healHp,
        mp: healMp,
        source: 'sharedKoraCommunion',
      });
      bus?.emit('merit', {
        type: 'kora',
        count: 1,
        source: 'sharedKoraCommunion',
      });
      bus?.emit('coop:koraCommunion', {
        count: koraCommunionCount,
        partnerId: nearbyPilgrim.id,
        partnerName: nearbyPilgrim.name,
        hp: healHp,
        mp: healMp,
      });
      bus?.emit('toast', {
        key: 'toast.sharedKoraCommunion',
        params: { name: nearbyPilgrim.name || i18n.t('coop.pilgrimName.default') },
        text: i18n.t('toast.sharedKoraCommunion', {
          name: nearbyPilgrim.name || i18n.t('coop.pilgrimName.default'),
        }),
        kind: 'merit',
      });
      syncStateOnCtx();
      bus?.emit('coop:changed', getState());
    }
  }

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
    if (state.mode && state.mode !== 'play') return;

    const currentZone = state.zone || 'stupa';
    if (currentZone !== lastKnownZone) {
      lastKnownZone = currentZone;
      shardId = `${currentZone}#1`;
      koraCommunionTimer = 0;
      postLocalPresence(true);
    }

    if (active) {
      updateAiCompanions(dt);
    }

    updateSharedKoraCommunion(dt);

    const pos = state.player?.position || { x: 0, y: 0, z: 0 };
    const isMovingOrActing =
      Math.hypot((pos.x || 0) - lastPlayerX, (pos.z || 0) - lastPlayerZ) > 0.005 ||
      (state.player?.action && state.player.action !== 'idle');
    lastPlayerX = pos.x || 0;
    lastPlayerZ = pos.z || 0;

    // 1. BroadcastChannel sync: ~15Hz for room members, ~5Hz for ambient zone presence
    ensureBroadcastChannel();
    if (active && roomCode) {
      broadcastTimer += dt;
      if (broadcastTimer >= 0.066) {
        broadcastTimer = 0;
        if (bc) {
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
    }

    if (showAmbientPilgrims || active) {
      presenceBroadcastTimer += dt;
      if (presenceBroadcastTimer >= 0.18) {
        presenceBroadcastTimer = 0;
        postLocalPresence(false);
      }
    }

    // 2. WebSocket Real-Time Sync or HTTP Fallback
    if (!ws && !wsConnecting) {
      if (wsReconnectTimer > 0) {
        wsReconnectTimer -= dt;
      } else {
        connectWebSocket();
      }
    }

    if (wsConnected) {
      wsSyncTimer += dt;
      const wsInterval =
        isMovingOrActing || outboundZoneEvents.length > 0 || outboundHttpEvents.length > 0
          ? 0.2
          : 1.0;
      if (wsSyncTimer >= wsInterval) {
        wsSyncTimer = 0;
        if (showAmbientPilgrims) {
          wsSend({
            type: 'presence:update',
            peerId,
            zone: currentZone,
            pilgrim: buildLocalMemberSnapshot(),
            events: outboundZoneEvents.splice(0, outboundZoneEvents.length),
          });
        }
        if (active && roomCode) {
          wsSend({
            type: 'coop:sync',
            room: roomCode,
            isPublic: roomPublic,
            member: buildLocalMemberSnapshot(),
            dungeonState: isHost ? buildLocalDungeonState() : undefined,
            events: outboundHttpEvents.splice(0, outboundHttpEvents.length),
          });
        }
      }
    } else {
      if (active && roomCode) {
        httpSyncTimer += dt;
        if (httpSyncTimer >= 0.5) {
          httpSyncTimer = 0;
          pollHttpCoop();
        }
      }
      if (showAmbientPilgrims) {
        presenceHttpTimer += dt;
        if (presenceHttpTimer >= 2.0) {
          presenceHttpTimer = 0;
          pollHttpPresence();
        }
      }
    }

    syncStateOnCtx();
  }

  // Initialize BroadcastChannel & announce initial presence immediately
  ensureBroadcastChannel();
  postLocalPresence(true);
  syncStateOnCtx();

  const api = {
    getState,
    getPartySize,
    getMembers,
    getZonePilgrims,
    getAllVisiblePilgrims,
    getZoneCounts,
    getTotalOnline,
    getShowAmbientPilgrims,
    setShowAmbientPilgrims,
    isRoomPublic,
    setRoomPublic,
    getPublicRooms,
    refreshPublicRooms,
    sendEmote,
    getLocalEmote,
    getFindBonusPct,
    getExpBonusPct,
    getHpScaleMult,
    getPilgrimName,
    setPilgrimName,
    createRoom,
    joinRoom,
    leaveRoom,
    addAiCompanion,
    removeAiCompanion,
    broadcastEvent,
    broadcastZoneEvent,
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
