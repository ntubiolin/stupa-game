/**
 * Pluggable Persistent Store & Zone Sharding / Co-op Room Engine (`server/store.js`) — Issue #173
 *
 * Provides:
 *  1. Atomic JSON file persistence (`.data/stupa-backend.json`) or in-memory store for:
 *     - Shared Butter-Lamp offerings & rejoices (`lamps`, `lampRejoiceDeltas`)
 *     - Personal Votive Stupas & rejoices (`stupas`, `stupaRejoiceDeltas`)
 *     - Global Samye Monastery 1,008 Stupas progress (`samye`)
 *  2. Zone Sharding & Ambient Pilgrim Presence (`updatePresence`, `leavePresence`, `getZonePresence`)
 *     with automatic shard scaling (`stupa#1`, `stupa#2`, ... up to `shardCapacity` pilgrims per shard)
 *  3. Co-op Party Room state & Public Room Matchmaking (`syncCoopRoom`, `leaveCoopRoom`, `listPublicRooms`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createAuthManager } from './auth.js';
import { createSaveStore } from './saveStore.js';
import { createAnalyticsStore } from './analyticsStore.js';

export const SAMYE_TARGET_STUPAS = 1008;
export const MAX_DB_BYTES = 256 * 1024;
export const MAX_BATCH_ACTIONS = 25;
export const MAX_SHARDS_PER_ZONE = 20;
export const MAX_COOP_ROOMS = 200;

export const VALID_TAGS = new Set(['peace', 'wisdom', 'obstacle', 'beings', 'bodhicitta']);

const FORBIDDEN_IDS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
]);

export const VALID_ZONES = [
  'stupa',
  'grove',
  'wild',
  'pharping',
  'mangyul',
  'yarlung',
  'samye',
  'chimphu',
  'terma',
  'sandbox',
];

const VALID_ZONE_SET = new Set(VALID_ZONES);

const SEEDED_LAMP_BASES = new Map([
  ['seed-lamp-1', { stationIdx: 0, lampIdx: 0, pilgrimName: '丹增嘉措', tag: 'bodhicitta', message: '願燈碗化為三千大千世界，以此光明照徹法界一切有情，早證菩提。', createdAt: 1710000100000, rejoiceCount: 28, burnBonusSec: 360 }],
  ['seed-lamp-2', { stationIdx: 0, lampIdx: 1, pilgrimName: '卓瑪央金', tag: 'peace', message: '祈願雪域與世間刀兵疾疫悉皆平息，父母安康，晝夜吉祥。', createdAt: 1710000200000, rejoiceCount: 19, burnBonusSec: 240 }],
  ['seed-lamp-3', { stationIdx: 0, lampIdx: 2, pilgrimName: 'Tenzin Norbu', tag: 'wisdom', message: 'May this golden flame dispel the darkness of ignorance in all wandering minds.', createdAt: 1710000300000, rejoiceCount: 15, burnBonusSec: 180 }],
  ['seed-lamp-4', { stationIdx: 0, lampIdx: 3, pilgrimName: '洛桑曲珍', tag: 'beings', message: '迴向法界四生六道一切如母有情，離苦得樂，同生極樂淨土。', createdAt: 1710000400000, rejoiceCount: 34, burnBonusSec: 480 }],
  ['seed-lamp-5', { stationIdx: 1, lampIdx: 0, pilgrimName: 'Pema Chödrön', tag: 'bodhicitta', message: 'For as long as space endures and living beings remain, may I too abide to dispel misery.', createdAt: 1710000500000, rejoiceCount: 42, burnBonusSec: 600 }],
  ['seed-lamp-6', { stationIdx: 1, lampIdx: 1, pilgrimName: '卡瑪多傑', tag: 'obstacle', message: '嗡阿吽班雜咕嚕貝瑪悉地吽！願修行路上內外密障礙悉皆淨除。', createdAt: 1710000600000, rejoiceCount: 23, burnBonusSec: 360 }],
  ['seed-lamp-7', { stationIdx: 1, lampIdx: 2, pilgrimName: '次仁旺姆', tag: 'peace', message: '在博達哈佛塔下繞塔三匝，願遠方親友平安順遂，心懷慈悲。', createdAt: 1710000700000, rejoiceCount: 16, burnBonusSec: 240 }],
  ['seed-lamp-8', { stationIdx: 1, lampIdx: 3, pilgrimName: '林間行者・明覺', tag: 'wisdom', message: '一燈能除千年闇，一智能滅萬年愚。願正法久住，般若常明。', createdAt: 1710000800000, rejoiceCount: 21, burnBonusSec: 240 }],
  ['seed-lamp-9', { stationIdx: 2, lampIdx: 0, pilgrimName: '索南達吉', tag: 'beings', message: '願荒野中迷途的餓鬼與寒林眾生，皆得觀音甘露與明燈照護。', createdAt: 1710000900000, rejoiceCount: 29, burnBonusSec: 360 }],
  ['seed-lamp-10', { stationIdx: 2, lampIdx: 1, pilgrimName: 'Yeshe Tsogyal Pilgrim', tag: 'wisdom', message: 'May the lotus light of Samye and Boudhanath awaken timeless awareness in all hearts.', createdAt: 1710001000000, rejoiceCount: 31, burnBonusSec: 480 }],
  ['seed-lamp-11', { stationIdx: 2, lampIdx: 2, pilgrimName: '扎西頓珠', tag: 'obstacle', message: '祈願高原行旅風雪平息，行者道糧充足，身心輕安無畏。', createdAt: 1710001100000, rejoiceCount: 14, burnBonusSec: 180 }],
  ['seed-lamp-12', { stationIdx: 2, lampIdx: 3, pilgrimName: '阿旺嘉措', tag: 'bodhicitta', message: '文殊師利勇猛智，普賢慧行亦復然，我今迴向諸善根，隨彼一切常修學。', createdAt: 1710001200000, rejoiceCount: 37, burnBonusSec: 480 }],
]);

const SEEDED_STUPA_BASES = new Map([
  ['seed-stupa-1', { pilgrimName: '丹增嘉措', title: '蓮華光明塔', message: '願見此塔者悉發菩提心，如蓮華不染塵垢，圓滿福慧資糧。', kora: 21, prostrations: 108, spec: { plinth: 'lotus', dome: 'saffron', spire: 'gold13', ornament: 'parasol' }, rejoiceCount: 36, createdAt: 1710000150000 }],
  ['seed-stupa-2', { pilgrimName: '卓瑪央金', title: '雪域慈悲塔', message: '大悲觀音眷顧雪域眾生，願一切苦難化為清涼甘露。', kora: 14, prostrations: 64, spec: { plinth: 'stepped', dome: 'white', spire: 'turquoise', ornament: 'moonSun' }, rejoiceCount: 24, createdAt: 1710000250000 }],
  ['seed-stupa-3', { pilgrimName: 'Tenzin Norbu', title: '普賢行願塔', message: 'Dedicated to the ten directions and all wandering pilgrims on the path of awakening.', kora: 9, prostrations: 108, spec: { plinth: 'mandala', dome: 'gilded', spire: 'gold13', ornament: 'garuda' }, rejoiceCount: 19, createdAt: 1710000350000 }],
  ['seed-stupa-4', { pilgrimName: '卡瑪多傑', title: '金剛無畏塔', message: '摧伏四魔與無明障難，守護正法與行者清淨道場。', kora: 18, prostrations: 216, spec: { plinth: 'vajra', dome: 'crimson', spire: 'bronze', ornament: 'vajraFlame' }, rejoiceCount: 31, createdAt: 1710000450000 }],
  ['seed-stupa-5', { pilgrimName: '洛桑曲珍', title: '百八祈願塔', message: '一步一禮拜，一圈一咒音，迴向累世父母冤親同登覺岸。', kora: 33, prostrations: 108, spec: { plinth: 'lotus', dome: 'white', spire: 'gold13', ornament: 'moonSun' }, rejoiceCount: 28, createdAt: 1710000550000 }],
  ['seed-stupa-6', { pilgrimName: 'Pema Chödrön', title: '無盡菩提塔', message: 'May fearless compassion blossom in every heart that walks this kora.', kora: 12, prostrations: 54, spec: { plinth: 'stepped', dome: 'saffron', spire: 'turquoise', ornament: 'parasol' }, rejoiceCount: 22, createdAt: 1710000650000 }],
  ['seed-stupa-7', { pilgrimName: '索南達吉', title: '息災吉祥塔', message: '願高原本尊護佑行旅平安，風雪消歇，萬物欣榮。', kora: 7, prostrations: 49, spec: { plinth: 'mandala', dome: 'white', spire: 'bronze', ornament: 'parasol' }, rejoiceCount: 15, createdAt: 1710000750000 }],
  ['seed-stupa-8', { pilgrimName: '阿旺嘉措', title: '法界圓融塔', message: '紅白黑綠四塔鎮護桑耶，願十方善信共成無上佛道。', kora: 27, prostrations: 108, spec: { plinth: 'vajra', dome: 'gilded', spire: 'gold13', ornament: 'vajraFlame' }, rejoiceCount: 41, createdAt: 1710000850000 }],
]);

export function sanitizeText(str, maxLen = 120, fallback = '') {
  if (typeof str !== 'string') return fallback;
  const cleaned = str
    .replace(/[\x00-\x1F\x7F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.slice(0, maxLen) : fallback;
}

export function sanitizeId(str, fallback = '') {
  if (typeof str !== 'string') return fallback;
  const cleaned = str.replace(/[^a-zA-Z0-9_:.-]/g, '').trim().slice(0, 64);
  if (!cleaned || FORBIDDEN_IDS.has(cleaned)) return fallback;
  return cleaned;
}

export function clampTimestamp(ts, now = Date.now()) {
  const n = Number(ts);
  if (!Number.isFinite(n)) return now;
  return Math.max(1700000000000, Math.min(now + 5000, Math.round(n)));
}

export function clampCoord(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n)
    ? Number(Math.max(-20000, Math.min(20000, n)).toFixed(2))
    : fallback;
}

export function normalizeZone(zone) {
  const z = typeof zone === 'string' ? zone.trim().toLowerCase() : '';
  return VALID_ZONE_SET.has(z) ? z : 'stupa';
}

function sanitizeLook(look) {
  const l = look && typeof look === 'object' ? look : {};
  return {
    robeColor: Number.isFinite(Number(l.robeColor)) ? Number(l.robeColor) : 0x7a1c24,
    shawlColor: Number.isFinite(Number(l.shawlColor)) ? Number(l.shawlColor) : 0xe08a1e,
    hatType: sanitizeId(l.hatType, 'none').slice(0, 24),
    auraColor: Number.isFinite(Number(l.auraColor)) ? Number(l.auraColor) : 0xfbbf24,
  };
}

function sanitizeEmote(raw, now = Date.now()) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return sanitizeId(raw, '').slice(0, 24) || null;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const id = sanitizeId(raw.id, '').slice(0, 24);
    if (!id) return null;
    return {
      id,
      icon: sanitizeText(raw.icon, 8, ''),
      textKey: sanitizeId(raw.textKey, '').slice(0, 48),
      expiresAt: clampTimestamp(raw.expiresAt, now + 60000),
    };
  }
  return null;
}

export function sanitizeEventPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [rawKey, v] of Object.entries(raw).slice(0, 12)) {
    const key = sanitizeId(rawKey, '').slice(0, 32);
    if (!key || FORBIDDEN_IDS.has(key)) continue;
    if (typeof v === 'string') {
      out[key] = sanitizeText(v, 120, '');
    } else if (typeof v === 'number') {
      out[key] = Number.isFinite(v) ? v : 0;
    } else if (typeof v === 'boolean') {
      out[key] = v;
    }
  }
  return out;
}

export function sanitizeDungeonState(ds) {
  if (!ds || typeof ds !== 'object' || Array.isArray(ds)) return null;
  return {
    active: Boolean(ds.active),
    tier: Math.max(1, Math.min(20, Math.round(Number(ds.tier) || 1))),
    floor: Math.max(1, Math.min(10, Math.round(Number(ds.floor) || 1))),
    seed:
      typeof ds.seed === 'number' && Number.isFinite(ds.seed)
        ? ds.seed
        : sanitizeId(String(ds.seed ?? ''), '0').slice(0, 32),
  };
}

function sanitizeMemberSnapshot(raw, fallbackId, prevSnap = null, now = Date.now()) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const headingRaw = Number(r.heading ?? prevSnap?.heading ?? 0);
  const heading = Number.isFinite(headingRaw)
    ? Number(Math.max(-Math.PI * 4, Math.min(Math.PI * 4, headingRaw)).toFixed(3))
    : 0;
  return {
    id: fallbackId,
    name: sanitizeText(r.name ?? prevSnap?.name, 24, '朝聖行者'),
    level: Math.max(1, Math.min(99, Math.round(Number(r.level ?? prevSnap?.level) || 1))),
    zone: normalizeZone(r.zone ?? prevSnap?.zone),
    x: clampCoord(r.x ?? prevSnap?.x, 0),
    y: clampCoord(r.y ?? prevSnap?.y, 0),
    z: clampCoord(r.z ?? prevSnap?.z, 0),
    heading,
    action: sanitizeId(r.action ?? prevSnap?.action, 'idle').slice(0, 24),
    hp: Math.max(0, Math.min(999999, Math.round(Number(r.hp ?? prevSnap?.hp ?? 100) || 0))),
    maxHp: Math.max(1, Math.min(999999, Math.round(Number(r.maxHp ?? prevSnap?.maxHp ?? 100) || 100))),
    mp: Math.max(0, Math.min(999999, Math.round(Number(r.mp ?? prevSnap?.mp ?? 60) || 0))),
    maxMp: Math.max(1, Math.min(999999, Math.round(Number(r.maxMp ?? prevSnap?.maxMp ?? 60) || 60))),
    fainted: Boolean(r.fainted ?? prevSnap?.fainted ?? false),
    isAi: Boolean(r.isAi ?? prevSnap?.isAi ?? false),
    look: sanitizeLook(r.look ?? prevSnap?.look),
    emote: sanitizeEmote(r.emote !== undefined ? r.emote : prevSnap?.emote, now),
  };
}

function sanitizeLampEntry(raw, now = Date.now(), maxRejoice = 50, maxBurn = 600) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const id = sanitizeId(
    data.id,
    `lamp-${now}-${Math.random().toString(36).slice(2, 7)}`,
  );
  const ownerUid = sanitizeId(data.ownerUid, '');
  return {
    id,
    ...(ownerUid ? { ownerUid } : {}),
    stationIdx: Math.max(0, Math.min(2, Math.round(Number(data.stationIdx) || 0))),
    lampIdx: Math.max(0, Math.min(11, Math.round(Number(data.lampIdx) || 0))),
    pilgrimName: sanitizeText(data.pilgrimName, 24, '朝聖行者'),
    tag: VALID_TAGS.has(data.tag) ? data.tag : 'peace',
    message: sanitizeText(data.message, 120, ''),
    createdAt: clampTimestamp(data.createdAt, now),
    rejoiceCount: Math.max(1, Math.min(maxRejoice, Math.round(Number(data.rejoiceCount) || 1))),
    burnBonusSec: Math.max(120, Math.min(maxBurn, Math.round(Number(data.burnBonusSec) || 120))),
  };
}

function sanitizeStupaEntry(raw, now = Date.now(), maxRejoice = 50) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const id = sanitizeId(
    data.id,
    `stupa-${now}-${Math.random().toString(36).slice(2, 7)}`,
  );
  const ownerUid = sanitizeId(data.ownerUid, '');
  const spec = data.spec && typeof data.spec === 'object' ? data.spec : {};
  return {
    id,
    ...(ownerUid ? { ownerUid } : {}),
    pilgrimName: sanitizeText(data.pilgrimName, 24, '朝聖行者'),
    title: sanitizeText(data.title, 28, '祈願功德塔'),
    message: sanitizeText(data.message, 120, ''),
    kora: Math.max(0, Math.min(10000, Math.round(Number(data.kora) || 0))),
    prostrations: Math.max(0, Math.min(100000, Math.round(Number(data.prostrations) || 0))),
    spec: {
      plinth: sanitizeId(spec.plinth, 'lotus').slice(0, 24),
      dome: sanitizeId(spec.dome, 'white').slice(0, 24),
      spire: sanitizeId(spec.spire, 'gold13').slice(0, 24),
      ornament: sanitizeId(spec.ornament, 'moonSun').slice(0, 24),
    },
    rejoiceCount: Math.max(1, Math.min(maxRejoice, Math.round(Number(data.rejoiceCount) || 1))),
    createdAt: clampTimestamp(data.createdAt, now),
  };
}

function sanitizeContributorEntry(raw, now = Date.now()) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const ownerUid = sanitizeId(data.ownerUid, '');
  return {
    id: sanitizeId(data.id, `samye-${now}-${Math.random().toString(36).slice(2, 6)}`),
    ...(ownerUid ? { ownerUid } : {}),
    pilgrimName: sanitizeText(data.pilgrimName, 24, '朝聖行者'),
    stupas: Math.max(1, Math.min(50, Math.round(Number(data.stupas) || 1))),
    kora: Math.max(0, Math.min(5000, Math.round(Number(data.kora) || 0))),
    prostrations: Math.max(0, Math.min(5000, Math.round(Number(data.prostrations) || 0))),
    message: sanitizeText(data.message, 120, ''),
    createdAt: clampTimestamp(data.createdAt, now),
  };
}

function createInitialCommunityState() {
  return {
    lamps: [],
    stupas: [],
    samye: {
      contributedStupas: 324,
      targetStupas: SAMYE_TARGET_STUPAS,
      totalKora: 1080,
      totalProstrations: 4320,
      contributors: [],
    },
    lampRejoiceDeltas: {},
    stupaRejoiceDeltas: {},
  };
}

export function createMultiplayerStore(options = {}) {
  const dbPath =
    options.dbPath ||
    process.env.STUPA_DB_PATH ||
    path.resolve(process.cwd(), '.data/stupa-backend.json');
  const inMemoryOnly =
    options.inMemoryOnly !== undefined
      ? Boolean(options.inMemoryOnly)
      : Boolean(process.env.STUPA_IN_MEMORY);
  const presenceTtlMs = Number(options.presenceTtlMs) || 12000;
  const roomTtlMs = Number(options.roomTtlMs) || 15000;
  const shardCapacity = Math.max(1, Number(options.shardCapacity) || 12);

  const auth = options.auth || createAuthManager(options.authOptions || {});
  const resolvedSaveDbPath =
    options.saveDbPath ||
    process.env.STUPA_SAVE_DB_PATH ||
    (options.dbPath
      ? path.join(path.dirname(options.dbPath), 'stupa-saves.sqlite')
      : path.resolve(process.cwd(), '.data/stupa-saves.sqlite'));
  const saves =
    options.saveStore ||
    createSaveStore({
      inMemoryOnly,
      saveDbPath: resolvedSaveDbPath,
    });
  const analytics = options.analyticsStore || createAnalyticsStore({
    inMemoryOnly,
    dbPath: options.analyticsDbPath
      || process.env.STUPA_ANALYTICS_DB_PATH
      || (resolvedSaveDbPath.endsWith('.json')
        ? path.join(path.dirname(resolvedSaveDbPath), 'stupa-analytics.sqlite')
        : resolvedSaveDbPath),
  });

  let community = createInitialCommunityState();

  function pruneRejoiceDeltas() {
    const validLampIds = new Set(community.lamps.map((l) => l.id));
    const cleanLampDeltas = {};
    for (const [rawKey, val] of Object.entries(community.lampRejoiceDeltas || {})) {
      const k = sanitizeId(rawKey, '');
      const n = Math.min(100000, Math.max(0, Math.round(Number(val) || 0)));
      if (k && n > 0 && (validLampIds.has(k) || SEEDED_LAMP_BASES.has(k))) {
        cleanLampDeltas[k] = n;
      }
      if (Object.keys(cleanLampDeltas).length >= 120) break;
    }
    community.lampRejoiceDeltas = cleanLampDeltas;

    const validStupaIds = new Set(community.stupas.map((s) => s.id));
    const cleanStupaDeltas = {};
    for (const [rawKey, val] of Object.entries(community.stupaRejoiceDeltas || {})) {
      const k = sanitizeId(rawKey, '');
      const n = Math.min(100000, Math.max(0, Math.round(Number(val) || 0)));
      if (k && n > 0 && (validStupaIds.has(k) || SEEDED_STUPA_BASES.has(k))) {
        cleanStupaDeltas[k] = n;
      }
      if (Object.keys(cleanStupaDeltas).length >= 100) break;
    }
    community.stupaRejoiceDeltas = cleanStupaDeltas;
  }

  function loadFromDisk() {
    if (inMemoryOnly || !dbPath) return;
    try {
      if (!fs.existsSync(dbPath)) return;
      const stat = fs.statSync(dbPath);
      if (stat.size > MAX_DB_BYTES * 2) return;
      const raw = fs.readFileSync(dbPath, 'utf8');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;

      const now = Date.now();
      if (Array.isArray(parsed.lamps)) {
        community.lamps = parsed.lamps
          .slice(0, 100)
          .filter((l) => l && typeof l === 'object')
          .map((l) => sanitizeLampEntry(l, now, 100000, 86400 * 30));
      }
      if (Array.isArray(parsed.stupas)) {
        community.stupas = parsed.stupas
          .slice(0, 80)
          .filter((s) => s && typeof s === 'object')
          .map((s) => sanitizeStupaEntry(s, now, 100000));
      }
      if (parsed.samye && typeof parsed.samye === 'object') {
        community.samye = {
          contributedStupas: Math.min(
            SAMYE_TARGET_STUPAS,
            Math.max(324, Math.round(Number(parsed.samye.contributedStupas) || 324)),
          ),
          targetStupas: SAMYE_TARGET_STUPAS,
          totalKora: Math.min(
            10000000,
            Math.max(1080, Math.round(Number(parsed.samye.totalKora) || 1080)),
          ),
          totalProstrations: Math.min(
            50000000,
            Math.max(4320, Math.round(Number(parsed.samye.totalProstrations) || 4320)),
          ),
          contributors: Array.isArray(parsed.samye.contributors)
            ? parsed.samye.contributors
                .slice(0, 50)
                .filter((c) => c && typeof c === 'object')
                .map((c) => sanitizeContributorEntry(c, now))
            : [],
        };
      }
      if (parsed.lampRejoiceDeltas && typeof parsed.lampRejoiceDeltas === 'object') {
        community.lampRejoiceDeltas = { ...parsed.lampRejoiceDeltas };
      }
      if (parsed.stupaRejoiceDeltas && typeof parsed.stupaRejoiceDeltas === 'object') {
        community.stupaRejoiceDeltas = { ...parsed.stupaRejoiceDeltas };
      }
      pruneRejoiceDeltas();
    } catch {
      // Ignore corrupted or missing file on boot
    }
  }

  function serializeCommunityDb() {
    return JSON.stringify(
      {
        version: 1,
        updatedAt: Date.now(),
        lamps: community.lamps,
        stupas: community.stupas,
        samye: community.samye,
        lampRejoiceDeltas: community.lampRejoiceDeltas,
        stupaRejoiceDeltas: community.stupaRejoiceDeltas,
      },
      null,
      2,
    );
  }

  function saveToDisk() {
    if (inMemoryOnly || !dbPath) return;
    try {
      pruneRejoiceDeltas();
      let payload = serializeCommunityDb();
      if (Buffer.byteLength(payload, 'utf8') > MAX_DB_BYTES) {
        if (community.lamps.length > 60) community.lamps.length = 60;
        if (community.stupas.length > 50) community.stupas.length = 50;
        if (community.samye.contributors.length > 30) {
          community.samye.contributors.length = 30;
        }
        pruneRejoiceDeltas();
        payload = serializeCommunityDb();
      }
      if (Buffer.byteLength(payload, 'utf8') > MAX_DB_BYTES) {
        return;
      }
      const dir = path.dirname(dbPath);
      fs.mkdirSync(dir, { recursive: true });
      const tmpPath = `${dbPath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, payload, 'utf8');
      fs.renameSync(tmpPath, dbPath);
    } catch {
      // Non-fatal in read-only serverless environments
    }
  }

  loadFromDisk();

  // ---------------------------------------------------------------- Community Actions
  function applySingleCommunityAction(action, payload) {
    if (!action || typeof action !== 'string') return false;
    const data = payload && typeof payload === 'object' ? payload : {};
    const now = Date.now();

    if (action === 'lamp') {
      const entry = sanitizeLampEntry(data, now, 50, 600);
      const idx = community.lamps.findIndex((l) => l.id === entry.id);
      if (idx >= 0) {
        const prev = community.lamps[idx];
        if (prev.ownerUid && entry.ownerUid !== prev.ownerUid) {
          return false;
        }
        community.lamps[idx] = {
          ...prev,
          ...entry,
          ...(prev.ownerUid || entry.ownerUid
            ? { ownerUid: prev.ownerUid || entry.ownerUid }
            : {}),
          rejoiceCount: Math.max(prev.rejoiceCount || 0, entry.rejoiceCount),
          burnBonusSec: Math.max(prev.burnBonusSec || 0, entry.burnBonusSec),
        };
      } else {
        community.lamps.unshift(entry);
      }
      community.lamps.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (community.lamps.length > 100) community.lamps.length = 100;
      return true;
    }

    if (action === 'rejoiceLamp') {
      const id = sanitizeId(data.id, '');
      if (!id) return false;
      const target = community.lamps.find((l) => l.id === id);
      const seed = SEEDED_LAMP_BASES.get(id);
      if (!target && !seed) return false;

      const nextDelta = Math.min(100000, (Number(community.lampRejoiceDeltas[id]) || 0) + 1);
      community.lampRejoiceDeltas[id] = nextDelta;
      if (Object.keys(community.lampRejoiceDeltas).length > 120) {
        pruneRejoiceDeltas();
      }

      if (target) {
        target.rejoiceCount = Math.min(100000, (Number(target.rejoiceCount) || 0) + 1);
        target.burnBonusSec = Math.min(86400 * 30, (Number(target.burnBonusSec) || 0) + 120);
      } else if (seed) {
        community.lamps.unshift({
          id,
          stationIdx: seed.stationIdx,
          lampIdx: seed.lampIdx,
          pilgrimName: seed.pilgrimName,
          tag: seed.tag,
          message: seed.message,
          createdAt: seed.createdAt,
          rejoiceCount: seed.rejoiceCount + nextDelta,
          burnBonusSec: seed.burnBonusSec + nextDelta * 120,
        });
        if (community.lamps.length > 100) community.lamps.length = 100;
      }
      return true;
    }

    if (action === 'stupa') {
      const entry = sanitizeStupaEntry(data, now, 50);
      let idx = community.stupas.findIndex((s) => s.id === entry.id);
      if (idx >= 0) {
        const prev = community.stupas[idx];
        if (prev.ownerUid && entry.ownerUid !== prev.ownerUid) {
          return false;
        }
      } else if (entry.ownerUid) {
        idx = community.stupas.findIndex((s) => s.ownerUid === entry.ownerUid);
      }

      if (idx >= 0) {
        const prev = community.stupas[idx];
        community.stupas[idx] = {
          ...prev,
          ...entry,
          id: prev.id,
          ...(prev.ownerUid || entry.ownerUid
            ? { ownerUid: prev.ownerUid || entry.ownerUid }
            : {}),
          rejoiceCount: Math.max(prev.rejoiceCount || 0, entry.rejoiceCount),
        };
      } else {
        community.stupas.unshift(entry);
      }
      community.stupas.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (community.stupas.length > 80) community.stupas.length = 80;
      return true;
    }

    if (action === 'rejoiceStupa') {
      const id = sanitizeId(data.id, '');
      if (!id) return false;
      const target = community.stupas.find((s) => s.id === id);
      const seed = SEEDED_STUPA_BASES.get(id);
      if (!target && !seed) return false;

      const nextDelta = Math.min(100000, (Number(community.stupaRejoiceDeltas[id]) || 0) + 1);
      community.stupaRejoiceDeltas[id] = nextDelta;
      if (Object.keys(community.stupaRejoiceDeltas).length > 100) {
        pruneRejoiceDeltas();
      }

      if (target) {
        target.rejoiceCount = Math.min(100000, (Number(target.rejoiceCount) || 0) + 1);
      } else if (seed) {
        community.stupas.unshift({
          id,
          pilgrimName: seed.pilgrimName,
          title: seed.title,
          message: seed.message,
          kora: seed.kora,
          prostrations: seed.prostrations,
          spec: { ...seed.spec },
          rejoiceCount: seed.rejoiceCount + nextDelta,
          createdAt: seed.createdAt,
        });
        if (community.stupas.length > 80) community.stupas.length = 80;
      }
      return true;
    }

    if (action === 'samyeContribute') {
      const entry = sanitizeContributorEntry(data, now);

      community.samye.contributedStupas = Math.min(
        SAMYE_TARGET_STUPAS,
        community.samye.contributedStupas + entry.stupas,
      );
      community.samye.targetStupas = SAMYE_TARGET_STUPAS;
      community.samye.totalKora = Math.min(
        10000000,
        community.samye.totalKora + entry.kora,
      );
      community.samye.totalProstrations = Math.min(
        50000000,
        community.samye.totalProstrations + entry.prostrations,
      );

      if (!community.samye.contributors.some((c) => c.id === entry.id)) {
        community.samye.contributors.unshift(entry);
        if (community.samye.contributors.length > 50) {
          community.samye.contributors.length = 50;
        }
      }
      return true;
    }

    return false;
  }

  function applyCommunityAction(action, payload) {
    let mutated = false;
    if (action === 'batch') {
      const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.actions)
          ? payload.actions
          : [];
      const list = rawList.slice(0, MAX_BATCH_ACTIONS);
      for (const item of list) {
        if (item && typeof item === 'object' && item.action !== 'batch') {
          if (applySingleCommunityAction(item.action, item.payload)) {
            mutated = true;
          }
        }
      }
    } else {
      mutated = applySingleCommunityAction(action, payload);
    }

    if (mutated) {
      saveToDisk();
    }
    return getCommunityState();
  }

  function getCommunityState() {
    return {
      lamps: community.lamps.map((l) => ({ ...l })),
      stupas: community.stupas.map((s) => ({ ...s, spec: { ...s.spec } })),
      samye: {
        contributedStupas: community.samye.contributedStupas,
        targetStupas: SAMYE_TARGET_STUPAS,
        totalKora: community.samye.totalKora,
        totalProstrations: community.samye.totalProstrations,
        contributors: community.samye.contributors.map((c) => ({ ...c })),
      },
      lampRejoiceDeltas: { ...community.lampRejoiceDeltas },
      stupaRejoiceDeltas: { ...community.stupaRejoiceDeltas },
    };
  }

  // ---------------------------------------------------------------- Zone Sharding & Presence
  // Map<zone, Array<{ id: string, index: number, zone: string, pilgrims: Map<peerId, snap>, events: Array }>>
  const zoneShards = new Map();
  // Map<peerId, { zone: string, shardId: string }>
  const peerLocations = new Map();

  for (const z of VALID_ZONES) {
    zoneShards.set(z, [
      {
        id: `${z}#1`,
        index: 1,
        zone: z,
        pilgrims: new Map(),
        events: [],
      },
    ]);
  }

  function getOrCreateShard(zone, preferredShardId = null, peerId = null) {
    const z = normalizeZone(zone);
    let shards = zoneShards.get(z);
    if (!shards || shards.length === 0) {
      shards = [{ id: `${z}#1`, index: 1, zone: z, pilgrims: new Map(), events: [] }];
      zoneShards.set(z, shards);
    }

    if (preferredShardId) {
      const match = shards.find((s) => s.id === preferredShardId);
      if (match && ( (peerId && match.pilgrims.has(peerId)) || match.pilgrims.size < shardCapacity )) {
        return match;
      }
    }

    if (peerId) {
      const existing = shards.find((s) => s.pilgrims.has(peerId));
      if (existing) return existing;
    }

    for (const s of shards) {
      if (s.pilgrims.size < shardCapacity) {
        return s;
      }
    }

    if (shards.length >= MAX_SHARDS_PER_ZONE) {
      return shards[shards.length - 1];
    }

    const nextIdx = shards[shards.length - 1].index + 1;
    const newShard = {
      id: `${z}#${nextIdx}`,
      index: nextIdx,
      zone: z,
      pilgrims: new Map(),
      events: [],
    };
    shards.push(newShard);
    return newShard;
  }

  function prunePresence(now = Date.now()) {
    for (const [z, shards] of zoneShards.entries()) {
      for (const shard of shards) {
        for (const [pid, p] of shard.pilgrims.entries()) {
          if (now - p.updatedAt > presenceTtlMs) {
            shard.pilgrims.delete(pid);
            const loc = peerLocations.get(pid);
            if (loc && loc.shardId === shard.id) {
              peerLocations.delete(pid);
            }
          }
        }
        shard.events = shard.events.filter((e) => now - e.ts <= 15000);
      }
      // Remove trailing empty overflow shards beyond #1
      while (shards.length > 1 && shards[shards.length - 1].pilgrims.size === 0) {
        shards.pop();
      }
      if (shards.length === 0) {
        shards.push({ id: `${z}#1`, index: 1, zone: z, pilgrims: new Map(), events: [] });
      }
    }
  }

  function computeZoneCounts() {
    const zoneCounts = {};
    let totalOnline = 0;
    for (const z of VALID_ZONES) {
      const shards = zoneShards.get(z) || [];
      let count = 0;
      for (const s of shards) {
        count += s.pilgrims.size;
      }
      zoneCounts[z] = count;
      totalOnline += count;
    }
    return { zoneCounts, totalOnline };
  }

  function updatePresence({
    peerId,
    zone,
    pilgrim,
    events = [],
    since = 0,
    now = Date.now(),
  } = {}) {
    prunePresence(now);

    const rawPilgrim = pilgrim && typeof pilgrim === 'object' ? pilgrim : {};
    const effectivePeerId = sanitizeId(peerId || rawPilgrim.id, '');
    if (!effectivePeerId) {
      const { zoneCounts, totalOnline } = computeZoneCounts();
      return { ok: false, error: 'Missing peerId', zoneCounts, totalOnline };
    }

    const targetZone = normalizeZone(zone || rawPilgrim.zone);
    const prevLoc = peerLocations.get(effectivePeerId);
    if (prevLoc && prevLoc.zone !== targetZone) {
      const oldShards = zoneShards.get(prevLoc.zone) || [];
      const oldShard = oldShards.find((s) => s.id === prevLoc.shardId);
      if (oldShard) {
        oldShard.pilgrims.delete(effectivePeerId);
      }
      peerLocations.delete(effectivePeerId);
    }

    const shard = getOrCreateShard(
      targetZone,
      prevLoc?.zone === targetZone ? prevLoc.shardId : null,
      effectivePeerId,
    );

    const prevSnap = shard.pilgrims.get(effectivePeerId);
    const baseSnap = sanitizeMemberSnapshot(rawPilgrim, effectivePeerId, prevSnap, now);
    const snap = {
      ...baseSnap,
      zone: targetZone,
      shardId: shard.id,
      updatedAt: now,
    };

    shard.pilgrims.set(effectivePeerId, snap);
    peerLocations.set(effectivePeerId, { zone: targetZone, shardId: shard.id });

    if (Array.isArray(events) && events.length > 0) {
      for (const ev of events.slice(0, 20)) {
        if (!ev || typeof ev !== 'object') continue;
        const evId = sanitizeId(
          ev.id,
          `${effectivePeerId}-${now}-${Math.random().toString(36).slice(2, 6)}`,
        );
        if (shard.events.some((existing) => existing.id === evId)) continue;
        shard.events.push({
          id: evId,
          senderId: sanitizeId(ev.senderId, effectivePeerId),
          zone: targetZone,
          shardId: shard.id,
          type: sanitizeId(ev.type, 'event').slice(0, 32),
          payload: sanitizeEventPayload(ev.payload),
          ts: clampTimestamp(ev.ts, now),
        });
      }
      if (shard.events.length > 100) {
        shard.events = shard.events.slice(-100);
      }
    }

    const { zoneCounts, totalOnline } = computeZoneCounts();
    const sinceTs = Number(since) || 0;

    return {
      ok: true,
      zone: targetZone,
      shardId: shard.id,
      pilgrims: Array.from(shard.pilgrims.values()),
      events: shard.events.filter((e) => e.ts > sinceTs),
      zoneCounts,
      totalOnline,
    };
  }

  function leavePresence({ peerId, now = Date.now() } = {}) {
    prunePresence(now);
    const cleanId = sanitizeId(peerId, '');
    const loc = cleanId ? peerLocations.get(cleanId) : null;
    if (loc) {
      const shards = zoneShards.get(loc.zone) || [];
      const shard = shards.find((s) => s.id === loc.shardId);
      if (shard) {
        shard.pilgrims.delete(cleanId);
      }
      peerLocations.delete(cleanId);
    }
    const { zoneCounts, totalOnline } = computeZoneCounts();
    return {
      ok: true,
      peerId: cleanId || null,
      zone: loc?.zone || null,
      shardId: loc?.shardId || null,
      zoneCounts,
      totalOnline,
    };
  }

  function getZonePresence({
    zone = 'stupa',
    shardId = null,
    peerId = null,
    since = 0,
    now = Date.now(),
  } = {}) {
    prunePresence(now);
    const targetZone = normalizeZone(zone);
    const shards = zoneShards.get(targetZone) || [];
    let shard = null;
    if (shardId) {
      shard = shards.find((s) => s.id === shardId) || null;
    }
    if (!shard && peerId) {
      const loc = peerLocations.get(peerId);
      if (loc && loc.zone === targetZone) {
        shard = shards.find((s) => s.id === loc.shardId) || null;
      }
    }
    if (!shard) {
      shard = shards[0] || getOrCreateShard(targetZone);
    }

    const { zoneCounts, totalOnline } = computeZoneCounts();
    const sinceTs = Number(since) || 0;

    return {
      ok: true,
      zone: targetZone,
      shardId: shard.id,
      pilgrims: Array.from(shard.pilgrims.values()),
      events: shard.events.filter((e) => e.ts > sinceTs),
      zoneCounts,
      totalOnline,
    };
  }

  // ---------------------------------------------------------------- Co-op Rooms
  const coopRooms = new Map();

  function pruneRooms(now = Date.now()) {
    for (const [code, roomObj] of coopRooms.entries()) {
      for (const [pid, m] of roomObj.members.entries()) {
        if (now - m.updatedAt > roomTtlMs) {
          roomObj.members.delete(pid);
        }
      }
      if (roomObj.hostId && !roomObj.members.has(roomObj.hostId)) {
        const nextHost = roomObj.members.keys().next().value;
        roomObj.hostId = nextHost || null;
      }
      roomObj.events = roomObj.events.filter((e) => now - e.ts <= 15000);

      if (roomObj.members.size === 0) {
        if (!roomObj.emptySince) {
          roomObj.emptySince = now;
        } else if (now - roomObj.emptySince > 30000) {
          coopRooms.delete(code);
        }
      } else {
        roomObj.emptySince = null;
      }
    }
  }

  function listPublicRooms(now = Date.now()) {
    pruneRooms(now);
    const result = [];
    for (const roomObj of coopRooms.values()) {
      if (!roomObj.isPublic) continue;
      if (roomObj.members.size <= 0 || roomObj.members.size >= 4) continue;
      const hostMember =
        roomObj.members.get(roomObj.hostId) || roomObj.members.values().next().value;
      result.push({
        room: roomObj.room,
        hostId: roomObj.hostId,
        hostName: hostMember?.name || '朝聖行者',
        zone: hostMember?.zone || 'stupa',
        memberCount: roomObj.members.size,
        maxMembers: 4,
        dungeonState: roomObj.dungeonState || null,
        updatedAt: roomObj.updatedAt,
      });
    }
    return result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function formatRoomMembers(roomObj) {
    if (!roomObj) return [];
    return Array.from(roomObj.members.values()).map((m) => ({
      ...m,
      isHost: m.id === roomObj.hostId,
    }));
  }

  function syncCoopRoom({
    room,
    isPublic,
    action,
    peerId,
    member,
    dungeonState,
    events = [],
    since = 0,
    now = Date.now(),
  } = {}) {
    pruneRooms(now);
    const roomCode = String(room || '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .trim()
      .toUpperCase()
      .slice(0, 20);
    if (!roomCode) {
      return { ok: false, error: 'Missing room code' };
    }

    let roomObj = coopRooms.get(roomCode);

    if (action === 'leave') {
      const leavingId = sanitizeId(peerId || member?.id, '');
      if (roomObj && leavingId) {
        roomObj.members.delete(leavingId);
        if (roomObj.hostId === leavingId) {
          const nextHost = roomObj.members.keys().next().value;
          roomObj.hostId = nextHost || null;
        }
        roomObj.updatedAt = now;
        if (roomObj.members.size === 0) {
          roomObj.emptySince = now;
        }
      }
      const sinceTs = Number(since) || 0;
      return {
        ok: true,
        room: roomCode,
        isPublic: Boolean(roomObj?.isPublic),
        hostId: roomObj?.hostId || null,
        dungeonState: roomObj?.dungeonState || null,
        members: formatRoomMembers(roomObj),
        events: roomObj ? roomObj.events.filter((e) => e.ts > sinceTs) : [],
        publicRooms: listPublicRooms(now),
      };
    }

    if (!roomObj) {
      if (coopRooms.size >= MAX_COOP_ROOMS) {
        const oldestKey = coopRooms.keys().next().value;
        if (oldestKey) coopRooms.delete(oldestKey);
      }
      roomObj = {
        room: roomCode,
        hostId: sanitizeId(member?.id || peerId, '') || null,
        isPublic: Boolean(isPublic),
        dungeonState: null,
        members: new Map(),
        events: [],
        createdAt: now,
        updatedAt: now,
        emptySince: null,
      };
      coopRooms.set(roomCode, roomObj);
    }

    if (typeof isPublic === 'boolean') {
      roomObj.isPublic = isPublic;
    }

    if (member && typeof member === 'object' && member.id) {
      const memberId = sanitizeId(member.id, '');
      if (memberId) {
        if (!roomObj.hostId) {
          roomObj.hostId = memberId;
        }
        const canJoin =
          roomObj.members.has(memberId) || roomObj.members.size < 4;
        if (canJoin) {
          const prevMember = roomObj.members.get(memberId);
          const cleanMember = sanitizeMemberSnapshot(member, memberId, prevMember, now);
          roomObj.members.set(memberId, {
            ...cleanMember,
            isHost: roomObj.hostId === memberId,
            updatedAt: now,
          });
          roomObj.emptySince = null;
          roomObj.updatedAt = now;
        }
      }
    }

    if (dungeonState && typeof dungeonState === 'object') {
      roomObj.dungeonState = sanitizeDungeonState(dungeonState);
      roomObj.updatedAt = now;
    }

    if (Array.isArray(events) && events.length > 0) {
      for (const ev of events.slice(0, 20)) {
        if (!ev || typeof ev !== 'object') continue;
        const evId = sanitizeId(
          ev.id,
          `${roomCode}-${now}-${Math.random().toString(36).slice(2, 6)}`,
        );
        if (evId && roomObj.events.some((existing) => existing.id === evId)) continue;
        roomObj.events.push({
          id: evId,
          room: roomCode,
          zone: normalizeZone(ev.zone),
          senderId: sanitizeId(ev.senderId, sanitizeId(peerId || member?.id, '')),
          senderName: sanitizeText(ev.senderName, 24, '朝聖行者'),
          type: sanitizeId(ev.type, 'event').slice(0, 32),
          payload: sanitizeEventPayload(ev.payload),
          ts: clampTimestamp(ev.ts, now),
        });
      }
      if (roomObj.events.length > 80) {
        roomObj.events = roomObj.events.slice(-80);
      }
      roomObj.updatedAt = now;
    }

    const sinceTs = Number(since) || 0;
    return {
      ok: true,
      room: roomCode,
      isPublic: Boolean(roomObj.isPublic),
      hostId: roomObj.hostId,
      dungeonState: roomObj.dungeonState || null,
      members: formatRoomMembers(roomObj),
      events: roomObj.events.filter((e) => e.ts > sinceTs),
      publicRooms: listPublicRooms(now),
    };
  }

  function leaveCoopRoom({ room, peerId, now = Date.now() } = {}) {
    if (room) {
      return syncCoopRoom({ room, action: 'leave', peerId, now });
    }
    // If room is not specified, remove peerId from all rooms they belong to
    pruneRooms(now);
    const cleanId = sanitizeId(peerId, '');
    const affectedRooms = [];
    if (cleanId) {
      for (const [code, roomObj] of coopRooms.entries()) {
        if (roomObj.members.has(cleanId)) {
          const res = syncCoopRoom({ room: code, action: 'leave', peerId: cleanId, now });
          affectedRooms.push(res);
        }
      }
    }
    return { ok: true, affectedRooms, publicRooms: listPublicRooms(now) };
  }

  function getCoopRoom({ room, since = 0, now = Date.now() } = {}) {
    pruneRooms(now);
    const roomCode = String(room || '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .trim()
      .toUpperCase()
      .slice(0, 20);
    const roomObj = coopRooms.get(roomCode);
    const sinceTs = Number(since) || 0;
    if (!roomObj) {
      return {
        ok: true,
        room: roomCode,
        isPublic: false,
        hostId: null,
        dungeonState: null,
        members: [],
        events: [],
        publicRooms: listPublicRooms(now),
      };
    }
    return {
      ok: true,
      room: roomCode,
      isPublic: Boolean(roomObj.isPublic),
      hostId: roomObj.hostId,
      dungeonState: roomObj.dungeonState || null,
      members: formatRoomMembers(roomObj),
      events: roomObj.events.filter((e) => e.ts > sinceTs),
      publicRooms: listPublicRooms(now),
    };
  }

  return {
    dbPath,
    inMemoryOnly,
    shardCapacity,
    auth,
    saves,
    analytics,
    saveStore: saves,
    getSave: (...args) => saves.getSave(...args),
    putSave: (...args) => saves.putSave(...args),
    deleteSave: (...args) => saves.deleteSave(...args),
    close: () => {
      analytics.close?.();
      saves.close?.();
    },
    applyCommunityAction,
    getCommunityState,
    updatePresence,
    leavePresence,
    getZonePresence,
    computeZoneCounts,
    syncCoopRoom,
    leaveCoopRoom,
    getCoopRoom,
    listPublicRooms,
  };
}

let defaultStoreInstance = null;

export function getDefaultStore(options = {}) {
  if (!defaultStoreInstance) {
    defaultStoreInstance = createMultiplayerStore(options);
  }
  return defaultStoreInstance;
}
