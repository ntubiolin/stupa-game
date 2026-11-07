/**
 * Asynchronous Pilgrim Communion Network Layer (`src/systems/community.js`) — Epic #57 / Ticket #59 & #60
 *
 * Unifies:
 *  1. Shared Butter-Lamp Offerings & Dedication Prayers (`lamps`, `offerLamp`, `rejoiceLamp`)
 *  2. Personal Votive Stupas (`stupas`, `saveOwnStupa`, `rejoiceStupa`)
 *  3. Samye Monastery Global Co-op Construction (`samye`, `contributeSamye`, `getSamyeProgress`)
 *  4. Multi-tab `BroadcastChannel('stupa.community.v1')`, `/api/community` dev/relay sync,
 *     `ctx.save` persistence (`'community'` section), and offline `STUPA-V1:` share codes.
 */
import '../i18n/community.js';

const CHANNEL_NAME = 'stupa.community.v1';
const SHARE_PREFIX = 'STUPA-V1:';
const SYNC_INTERVAL_SEC = 10.0;
const SAMYE_TARGET_STUPAS = 1008;
const MAX_PENDING_ACTIONS = 50;

export function resolveApiBase(explicitBase = '') {
  const fromArg = typeof explicitBase === 'string' ? explicitBase.trim() : '';
  if (fromArg) return fromArg.replace(/\/+$/, '');
  const fromGlobal =
    typeof globalThis !== 'undefined' && typeof globalThis.__STUPA_BACKEND_URL__ === 'string'
      ? globalThis.__STUPA_BACKEND_URL__.trim()
      : '';
  if (fromGlobal) return fromGlobal.replace(/\/+$/, '');
  const fromEnv =
    typeof import.meta !== 'undefined' && typeof import.meta.env?.VITE_BACKEND_URL === 'string'
      ? import.meta.env.VITE_BACKEND_URL.trim()
      : '';
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  return '';
}

export function resolveApiUrl(path = '/api/community', explicitBase = '') {
  const base = resolveApiBase(explicitBase);
  const cleanPath = String(path || '/api/community').startsWith('/')
    ? String(path || '/api/community')
    : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

const VALID_TAGS = new Set(['peace', 'wisdom', 'obstacle', 'beings', 'bodhicitta']);

const SEEDED_LAMPS = [
  {
    id: 'seed-lamp-1',
    stationIdx: 0,
    lampIdx: 0,
    pilgrimName: '丹增嘉措',
    tag: 'bodhicitta',
    message: '願燈碗化為三千大千世界，以此光明照徹法界一切有情，早證菩提。',
    createdAt: 1710000100000,
    rejoiceCount: 28,
    burnBonusSec: 360,
    isOwn: false,
  },
  {
    id: 'seed-lamp-2',
    stationIdx: 0,
    lampIdx: 1,
    pilgrimName: '卓瑪央金',
    tag: 'peace',
    message: '祈願雪域與世間刀兵疾疫悉皆平息，父母安康，晝夜吉祥。',
    createdAt: 1710000200000,
    rejoiceCount: 19,
    burnBonusSec: 240,
    isOwn: false,
  },
  {
    id: 'seed-lamp-3',
    stationIdx: 0,
    lampIdx: 2,
    pilgrimName: 'Tenzin Norbu',
    tag: 'wisdom',
    message: 'May this golden flame dispel the darkness of ignorance in all wandering minds.',
    createdAt: 1710000300000,
    rejoiceCount: 15,
    burnBonusSec: 180,
    isOwn: false,
  },
  {
    id: 'seed-lamp-4',
    stationIdx: 0,
    lampIdx: 3,
    pilgrimName: '洛桑曲珍',
    tag: 'beings',
    message: '迴向法界四生六道一切如母有情，離苦得樂，同生極樂淨土。',
    createdAt: 1710000400000,
    rejoiceCount: 34,
    burnBonusSec: 480,
    isOwn: false,
  },
  {
    id: 'seed-lamp-5',
    stationIdx: 1,
    lampIdx: 0,
    pilgrimName: 'Pema Chödrön',
    tag: 'bodhicitta',
    message: 'For as long as space endures and living beings remain, may I too abide to dispel misery.',
    createdAt: 1710000500000,
    rejoiceCount: 42,
    burnBonusSec: 600,
    isOwn: false,
  },
  {
    id: 'seed-lamp-6',
    stationIdx: 1,
    lampIdx: 1,
    pilgrimName: '卡瑪多傑',
    tag: 'obstacle',
    message: '嗡阿吽班雜咕嚕貝瑪悉地吽！願修行路上內外密障礙悉皆淨除。',
    createdAt: 1710000600000,
    rejoiceCount: 23,
    burnBonusSec: 360,
    isOwn: false,
  },
  {
    id: 'seed-lamp-7',
    stationIdx: 1,
    lampIdx: 2,
    pilgrimName: '次仁旺姆',
    tag: 'peace',
    message: '在博達哈佛塔下繞塔三匝，願遠方親友平安順遂，心懷慈悲。',
    createdAt: 1710000700000,
    rejoiceCount: 16,
    burnBonusSec: 240,
    isOwn: false,
  },
  {
    id: 'seed-lamp-8',
    stationIdx: 1,
    lampIdx: 3,
    pilgrimName: '林間行者・明覺',
    tag: 'wisdom',
    message: '一燈能除千年闇，一智能滅萬年愚。願正法久住，般若常明。',
    createdAt: 1710000800000,
    rejoiceCount: 21,
    burnBonusSec: 240,
    isOwn: false,
  },
  {
    id: 'seed-lamp-9',
    stationIdx: 2,
    lampIdx: 0,
    pilgrimName: '索南達吉',
    tag: 'beings',
    message: '願荒野中迷途的餓鬼與寒林眾生，皆得觀音甘露與明燈照護。',
    createdAt: 1710000900000,
    rejoiceCount: 29,
    burnBonusSec: 360,
    isOwn: false,
  },
  {
    id: 'seed-lamp-10',
    stationIdx: 2,
    lampIdx: 1,
    pilgrimName: 'Yeshe Tsogyal Pilgrim',
    tag: 'wisdom',
    message: 'May the lotus light of Samye and Boudhanath awaken timeless awareness in all hearts.',
    createdAt: 1710001000000,
    rejoiceCount: 31,
    burnBonusSec: 480,
    isOwn: false,
  },
  {
    id: 'seed-lamp-11',
    stationIdx: 2,
    lampIdx: 2,
    pilgrimName: '扎西頓珠',
    tag: 'obstacle',
    message: '祈願高原行旅風雪平息，行者道糧充足，身心輕安無畏。',
    createdAt: 1710001100000,
    rejoiceCount: 14,
    burnBonusSec: 180,
    isOwn: false,
  },
  {
    id: 'seed-lamp-12',
    stationIdx: 2,
    lampIdx: 3,
    pilgrimName: '阿旺嘉措',
    tag: 'bodhicitta',
    message: '文殊師利勇猛智，普賢慧行亦復然，我今迴向諸善根，隨彼一切常修學。',
    createdAt: 1710001200000,
    rejoiceCount: 37,
    burnBonusSec: 480,
    isOwn: false,
  },
];

const SEEDED_STUPAS = [
  {
    id: 'seed-stupa-1',
    isOwn: false,
    pilgrimName: '丹增嘉措',
    title: '蓮華光明塔',
    message: '願見此塔者悉發菩提心，如蓮華不染塵垢，圓滿福慧資糧。',
    kora: 21,
    prostrations: 108,
    spec: { plinth: 'lotus', dome: 'saffron', spire: 'gold13', ornament: 'parasol' },
    rejoiceCount: 36,
    createdAt: 1710000150000,
  },
  {
    id: 'seed-stupa-2',
    isOwn: false,
    pilgrimName: '卓瑪央金',
    title: '雪域慈悲塔',
    message: '大悲觀音眷顧雪域眾生，願一切苦難化為清涼甘露。',
    kora: 14,
    prostrations: 64,
    spec: { plinth: 'stepped', dome: 'white', spire: 'turquoise', ornament: 'moonSun' },
    rejoiceCount: 24,
    createdAt: 1710000250000,
  },
  {
    id: 'seed-stupa-3',
    isOwn: false,
    pilgrimName: 'Tenzin Norbu',
    title: '普賢行願塔',
    message: 'Dedicated to the ten directions and all wandering pilgrims on the path of awakening.',
    kora: 9,
    prostrations: 108,
    spec: { plinth: 'mandala', dome: 'gilded', spire: 'gold13', ornament: 'garuda' },
    rejoiceCount: 19,
    createdAt: 1710000350000,
  },
  {
    id: 'seed-stupa-4',
    isOwn: false,
    pilgrimName: '卡瑪多傑',
    title: '金剛無畏塔',
    message: '摧伏四魔與無明障難，守護正法與行者清淨道場。',
    kora: 18,
    prostrations: 216,
    spec: { plinth: 'vajra', dome: 'crimson', spire: 'bronze', ornament: 'vajraFlame' },
    rejoiceCount: 31,
    createdAt: 1710000450000,
  },
  {
    id: 'seed-stupa-5',
    isOwn: false,
    pilgrimName: '洛桑曲珍',
    title: '百八祈願塔',
    message: '一步一禮拜，一圈一咒音，迴向累世父母冤親同登覺岸。',
    kora: 33,
    prostrations: 108,
    spec: { plinth: 'lotus', dome: 'white', spire: 'gold13', ornament: 'moonSun' },
    rejoiceCount: 28,
    createdAt: 1710000550000,
  },
  {
    id: 'seed-stupa-6',
    isOwn: false,
    pilgrimName: 'Pema Chödrön',
    title: '無盡菩提塔',
    message: 'May fearless compassion blossom in every heart that walks this kora.',
    kora: 12,
    prostrations: 54,
    spec: { plinth: 'stepped', dome: 'saffron', spire: 'turquoise', ornament: 'parasol' },
    rejoiceCount: 22,
    createdAt: 1710000650000,
  },
  {
    id: 'seed-stupa-7',
    isOwn: false,
    pilgrimName: '索南達吉',
    title: '息災吉祥塔',
    message: '願高原本尊護佑行旅平安，風雪消歇，萬物欣榮。',
    kora: 7,
    prostrations: 49,
    spec: { plinth: 'mandala', dome: 'white', spire: 'bronze', ornament: 'parasol' },
    rejoiceCount: 15,
    createdAt: 1710000750000,
  },
  {
    id: 'seed-stupa-8',
    isOwn: false,
    pilgrimName: '阿旺嘉措',
    title: '法界圓融塔',
    message: '紅白黑綠四塔鎮護桑耶，願十方善信共成無上佛道。',
    kora: 27,
    prostrations: 108,
    spec: { plinth: 'vajra', dome: 'gilded', spire: 'gold13', ornament: 'vajraFlame' },
    rejoiceCount: 41,
    createdAt: 1710000850000,
  },
];

const SEEDED_SAMYE_CONTRIBUTORS = [
  {
    id: 'seed-samye-1',
    pilgrimName: '寂護門人・洛桑',
    stupas: 12,
    kora: 108,
    prostrations: 324,
    message: '願桑耶大寺三寶具足，顯密圓融，永鎮雪域。',
    createdAt: 1710000200000,
  },
  {
    id: 'seed-samye-2',
    pilgrimName: '丹增嘉措',
    stupas: 9,
    kora: 54,
    prostrations: 216,
    message: '奉獻繞塔與禮拜功德，祈願紅白黑綠四座鎮魔佛塔早日圓滿。',
    createdAt: 1710000400000,
  },
  {
    id: 'seed-samye-3',
    pilgrimName: '卓瑪央金',
    stupas: 6,
    kora: 36,
    prostrations: 108,
    message: '願一磚一石皆具蓮師加持，利益無量來世有情。',
    createdAt: 1710000600000,
  },
  {
    id: 'seed-samye-4',
    pilgrimName: 'Tenzin Norbu',
    stupas: 8,
    kora: 42,
    prostrations: 180,
    message: 'May the 1008 stupas of Samye stand indestructible as Mount Meru.',
    createdAt: 1710000800000,
  },
  {
    id: 'seed-samye-5',
    pilgrimName: '卡瑪多傑',
    stupas: 15,
    kora: 81,
    prostrations: 432,
    message: '哈波日山夜障已伏，願十方行者共聚願力，圓滿千塔大業！',
    createdAt: 1710001000000,
  },
  {
    id: 'seed-samye-6',
    pilgrimName: '阿旺嘉措',
    stupas: 11,
    kora: 64,
    prostrations: 270,
    message: '隨喜十方善信共建桑耶，願法輪常轉，國界安寧。',
    createdAt: 1710001200000,
  },
];

function computeBlessingTier(contributedStupas) {
  const n = Number(contributedStupas) || 0;
  if (n >= 1008) return 4;
  if (n >= 720) return 3;
  if (n >= 360) return 2;
  if (n >= 108) return 1;
  return 0;
}

function encodeBase64Utf8(jsonStr) {
  try {
    const bytes = new TextEncoder().encode(jsonStr);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
  } catch {
    return '';
  }
}

function decodeBase64Utf8(b64) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function sanitizeText(str, maxLen = 120, fallback = '') {
  if (typeof str !== 'string') return fallback;
  const cleaned = str.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLen) : fallback;
}

export function createCommunity(ctx, options = {}) {
  const { bus, state, i18n } = ctx;

  function getEndpointUrl(path = '/api/community') {
    return resolveApiUrl(path, options?.apiBase);
  }

  let backendOnline = false;
  let lastSyncAt = 0;
  const inFlightPromises = new Set();
  let flushPromise = null;

  let pilgrimName = '';
  let lamps = [];
  let stupas = [];
  let rejoicedLampIds = new Set();
  let rejoicedStupaIds = new Set();
  let samye = {
    contributedStupas: 324,
    targetStupas: SAMYE_TARGET_STUPAS,
    totalKora: 1080,
    totalProstrations: 4320,
    contributors: [...SEEDED_SAMYE_CONTRIBUTORS],
    myContributedStupas: 0,
    myContributedKora: 0,
    myContributedProstrations: 0,
  };

  function buildDefaultSaveData() {
    return {
      pilgrimName: '',
      ownLamps: [],
      ownStupa: null,
      importedLamps: [],
      importedStupas: [],
      rejoicedLampIds: [],
      rejoicedStupaIds: [],
      lampRejoiceDeltas: {},
      stupaRejoiceDeltas: {},
      pendingActions: [],
      samye: {
        contributedStupas: 324,
        totalKora: 1080,
        totalProstrations: 4320,
        myContributedStupas: 0,
        myContributedKora: 0,
        myContributedProstrations: 0,
        myContributors: [],
      },
    };
  }

  let savedSection = buildDefaultSaveData();

  function rebuildStateFromSavedSection() {
    pilgrimName = sanitizeText(savedSection.pilgrimName, 24, '');
    rejoicedLampIds = new Set(Array.isArray(savedSection.rejoicedLampIds) ? savedSection.rejoicedLampIds : []);
    rejoicedStupaIds = new Set(Array.isArray(savedSection.rejoicedStupaIds) ? savedSection.rejoicedStupaIds : []);
    if (!Array.isArray(savedSection.pendingActions)) {
      savedSection.pendingActions = [];
    }

    const lampDeltas = savedSection.lampRejoiceDeltas || {};
    const stupaDeltas = savedSection.stupaRejoiceDeltas || {};

    // Merge seeded lamps + importedLamps + ownLamps
    const lampMap = new Map();
    for (const s of SEEDED_LAMPS) {
      const delta = Number(lampDeltas[s.id]) || 0;
      lampMap.set(s.id, {
        ...s,
        rejoiceCount: s.rejoiceCount + delta,
        burnBonusSec: s.burnBonusSec + delta * 120,
      });
    }
    if (Array.isArray(savedSection.importedLamps)) {
      for (const imp of savedSection.importedLamps) {
        if (!imp || !imp.id) continue;
        const delta = Number(lampDeltas[imp.id]) || 0;
        lampMap.set(imp.id, {
          ...imp,
          isOwn: Boolean(imp.isOwn),
          rejoiceCount: (Number(imp.rejoiceCount) || 0) + delta,
          burnBonusSec: (Number(imp.burnBonusSec) || 0) + delta * 120,
        });
      }
    }
    if (Array.isArray(savedSection.ownLamps)) {
      for (const own of savedSection.ownLamps) {
        if (!own || !own.id) continue;
        const delta = Number(lampDeltas[own.id]) || 0;
        lampMap.set(own.id, {
          ...own,
          isOwn: true,
          rejoiceCount: (Number(own.rejoiceCount) || 0) + delta,
          burnBonusSec: (Number(own.burnBonusSec) || 0) + delta * 120,
        });
      }
    }
    lamps = Array.from(lampMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Merge seeded stupas + importedStupas + ownStupa
    const stupaMap = new Map();
    for (const s of SEEDED_STUPAS) {
      const delta = Number(stupaDeltas[s.id]) || 0;
      stupaMap.set(s.id, {
        ...s,
        spec: { ...s.spec },
        rejoiceCount: s.rejoiceCount + delta,
      });
    }
    if (Array.isArray(savedSection.importedStupas)) {
      for (const imp of savedSection.importedStupas) {
        if (!imp || !imp.id) continue;
        const delta = Number(stupaDeltas[imp.id]) || 0;
        stupaMap.set(imp.id, {
          ...imp,
          isOwn: false,
          spec: { ...(imp.spec || { plinth: 'lotus', dome: 'white', spire: 'gold13', ornament: 'moonSun' }) },
          rejoiceCount: (Number(imp.rejoiceCount) || 0) + delta,
        });
      }
    }
    if (savedSection.ownStupa && savedSection.ownStupa.id) {
      const own = savedSection.ownStupa;
      const delta = Number(stupaDeltas[own.id]) || 0;
      stupaMap.set(own.id, {
        ...own,
        isOwn: true,
        spec: { ...(own.spec || { plinth: 'lotus', dome: 'white', spire: 'gold13', ornament: 'moonSun' }) },
        rejoiceCount: (Number(own.rejoiceCount) || 0) + delta,
      });
    }
    stupas = Array.from(stupaMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Samye progress
    const svSamye = savedSection.samye || {};
    const myStupas = Math.max(0, Number(svSamye.myContributedStupas) || 0);
    const myKora = Math.max(0, Number(svSamye.myContributedKora) || 0);
    const myPros = Math.max(0, Number(svSamye.myContributedProstrations) || 0);
    const baseStupas = Math.max(324 + myStupas, Number(svSamye.contributedStupas) || 324);
    const baseKora = Math.max(1080 + myKora, Number(svSamye.totalKora) || 1080);
    const basePros = Math.max(4320 + myPros, Number(svSamye.totalProstrations) || 4320);

    const contribMap = new Map();
    for (const c of SEEDED_SAMYE_CONTRIBUTORS) {
      contribMap.set(c.id, { ...c });
    }
    if (Array.isArray(svSamye.myContributors)) {
      for (const c of svSamye.myContributors) {
        if (c && c.id) contribMap.set(c.id, { ...c });
      }
    }

    samye = {
      contributedStupas: Math.min(SAMYE_TARGET_STUPAS, baseStupas),
      targetStupas: SAMYE_TARGET_STUPAS,
      totalKora: baseKora,
      totalProstrations: basePros,
      contributors: Array.from(contribMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      myContributedStupas: myStupas,
      myContributedKora: myKora,
      myContributedProstrations: myPros,
    };
  }

  function loadFromSave() {
    if (ctx.save) {
      savedSection = ctx.save.get('community', buildDefaultSaveData());
    } else {
      savedSection = buildDefaultSaveData();
    }
    rebuildStateFromSavedSection();
  }

  function persistToSave() {
    savedSection.pilgrimName = pilgrimName;
    savedSection.rejoicedLampIds = Array.from(rejoicedLampIds);
    savedSection.rejoicedStupaIds = Array.from(rejoicedStupaIds);
    savedSection.ownLamps = lamps.filter((l) => l.isOwn).slice(0, 24);
    savedSection.ownStupa = stupas.find((s) => s.isOwn) || null;
    savedSection.pendingActions = Array.isArray(savedSection.pendingActions)
      ? savedSection.pendingActions.slice(-MAX_PENDING_ACTIONS)
      : [];
    savedSection.samye = {
      contributedStupas: samye.contributedStupas,
      totalKora: samye.totalKora,
      totalProstrations: samye.totalProstrations,
      myContributedStupas: samye.myContributedStupas,
      myContributedKora: samye.myContributedKora,
      myContributedProstrations: samye.myContributedProstrations,
      myContributors: samye.contributors
        .filter((c) => !c.id.startsWith('seed-samye-'))
        .slice(0, 24),
    };
    ctx.save?.set?.('community', savedSection);
  }

  loadFromSave();

  bus.on('merit:reset', () => {
    savedSection = buildDefaultSaveData();
    rebuildStateFromSavedSection();
    bus.emit('community:changed', { type: 'reset' });
  });

  // ---------------------------------------------------------------- BroadcastChannel, WebSocket & Server Relay
  let channel = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.unref?.();
      channel.onmessage = (ev) => {
        const data = ev?.data;
        if (!data || typeof data !== 'object') return;
        handleIncomingAction(data.action, data.payload, { fromBroadcast: true });
      };
    } catch { /* ignore in restricted environments */ }
  }

  bus.on('ws:community', (msg) => {
    if (!msg || typeof msg !== 'object') return;
    handleIncomingAction(msg.action, msg.payload, { fromWs: true });
  });

  function enqueuePendingAction(action, payload) {
    if (!Array.isArray(savedSection.pendingActions)) {
      savedSection.pendingActions = [];
    }
    if (action === 'stupa' && payload?.id) {
      savedSection.pendingActions = savedSection.pendingActions.filter(
        (item) => !(item && item.action === 'stupa' && item.payload?.id === payload.id)
      );
    }
    const item = {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      payload: payload && typeof payload === 'object' ? JSON.parse(JSON.stringify(payload)) : payload,
      ts: Date.now(),
    };
    savedSection.pendingActions.push(item);
    if (savedSection.pendingActions.length > MAX_PENDING_ACTIONS) {
      savedSection.pendingActions = savedSection.pendingActions.slice(-MAX_PENDING_ACTIONS);
    }
    persistToSave();
    return item;
  }

  function removePendingActionById(queueId) {
    if (!Array.isArray(savedSection.pendingActions)) return;
    const before = savedSection.pendingActions.length;
    savedSection.pendingActions = savedSection.pendingActions.filter((item) => item && item.id !== queueId);
    if (savedSection.pendingActions.length !== before) {
      persistToSave();
    }
  }

  function broadcastAndPost(action, payload) {
    try {
      channel?.postMessage({ action, payload });
    } catch { /* ignore */ }
    bus.emit('community:outbound', { action, payload });

    const queuedItem = enqueuePendingAction(action, payload);
    if (typeof fetch !== 'function') {
      backendOnline = false;
      return Promise.resolve(false);
    }

    const reqPromise = (async () => {
      try {
        const res = await fetch(getEndpointUrl('/api/community'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ action, payload }),
        });
        if (!res || !res.ok) {
          backendOnline = false;
          return false;
        }
        backendOnline = true;
        lastSyncAt = Date.now();
        removePendingActionById(queuedItem.id);

        const contentType = res.headers?.get?.('content-type') || '';
        if ((!contentType || contentType.includes('application/json')) && typeof res.json === 'function') {
          try {
            const raw = await res.json();
            mergeServerSnapshot(raw);
          } catch { /* ignore non-json */ }
        }
        return true;
      } catch {
        backendOnline = false;
        return false;
      }
    })();

    inFlightPromises.add(reqPromise);
    reqPromise.finally(() => {
      inFlightPromises.delete(reqPromise);
    });
    return reqPromise;
  }

  function mergeIncomingLamp(entry, isOwnOverride = null) {
    if (!entry || !entry.id) return null;
    const existingIdx = lamps.findIndex((l) => l.id === entry.id);
    const prev = existingIdx >= 0 ? lamps[existingIdx] : null;
    const incomingRejoice = Math.max(0, Number(entry.rejoiceCount) || 0);
    const incomingBonus = entry.burnBonusSec !== undefined
      ? Math.max(0, Number(entry.burnBonusSec) || 0)
      : (prev && incomingRejoice > prev.rejoiceCount
        ? prev.burnBonusSec + (incomingRejoice - prev.rejoiceCount) * 120
        : incomingRejoice * 120);

    const normalized = {
      id: String(entry.id),
      stationIdx: entry.stationIdx !== undefined
        ? Math.max(0, Math.min(2, Number(entry.stationIdx) || 0))
        : (prev ? prev.stationIdx : 0),
      lampIdx: entry.lampIdx !== undefined
        ? Math.max(0, Math.min(11, Number(entry.lampIdx) || 0))
        : (prev ? prev.lampIdx : 0),
      pilgrimName: sanitizeText(entry.pilgrimName, 24, prev ? prev.pilgrimName : getPilgrimName()),
      tag: VALID_TAGS.has(entry.tag) ? entry.tag : (prev ? prev.tag : 'peace'),
      message: sanitizeText(entry.message, 120, prev ? prev.message : ''),
      createdAt: Number(entry.createdAt) || (prev ? prev.createdAt : Date.now()),
      rejoiceCount: incomingRejoice,
      burnBonusSec: incomingBonus,
      isOwn: isOwnOverride !== null ? isOwnOverride : Boolean(entry.isOwn),
    };

    if (existingIdx >= 0) {
      const updated = {
        ...prev,
        ...normalized,
        isOwn: prev.isOwn || normalized.isOwn,
        rejoiceCount: Math.max(prev.rejoiceCount, normalized.rejoiceCount),
        burnBonusSec: Math.max(prev.burnBonusSec, normalized.burnBonusSec),
      };
      lamps[existingIdx] = updated;
      if (updated.id.startsWith('seed-lamp-')) {
        const seedBase = SEEDED_LAMPS.find((s) => s.id === updated.id);
        if (seedBase && updated.rejoiceCount > seedBase.rejoiceCount) {
          if (!savedSection.lampRejoiceDeltas) savedSection.lampRejoiceDeltas = {};
          savedSection.lampRejoiceDeltas[updated.id] = Math.max(
            Number(savedSection.lampRejoiceDeltas[updated.id]) || 0,
            updated.rejoiceCount - seedBase.rejoiceCount
          );
        }
      } else if (!updated.isOwn) {
        if (!Array.isArray(savedSection.importedLamps)) savedSection.importedLamps = [];
        savedSection.importedLamps = [
          updated,
          ...savedSection.importedLamps.filter((l) => l.id !== updated.id),
        ].slice(0, 30);
      }
      return updated;
    }

    lamps.unshift(normalized);
    if (!normalized.isOwn && !normalized.id.startsWith('seed-lamp-')) {
      if (!Array.isArray(savedSection.importedLamps)) savedSection.importedLamps = [];
      savedSection.importedLamps = [
        normalized,
        ...savedSection.importedLamps.filter((l) => l.id !== normalized.id),
      ].slice(0, 30);
    }
    return normalized;
  }

  function mergeIncomingStupa(entry, isOwnOverride = null) {
    if (!entry || !entry.id) return null;
    const existingIdx = stupas.findIndex((s) => s.id === entry.id);
    const prev = existingIdx >= 0 ? stupas[existingIdx] : null;
    const spec = entry.spec && typeof entry.spec === 'object' ? entry.spec : {};
    const normalized = {
      id: String(entry.id),
      isOwn: isOwnOverride !== null ? isOwnOverride : Boolean(entry.isOwn),
      pilgrimName: sanitizeText(entry.pilgrimName, 24, prev ? prev.pilgrimName : getPilgrimName()),
      title: sanitizeText(entry.title, 28, prev ? prev.title : '祈願功德塔'),
      message: sanitizeText(entry.message, 120, prev ? prev.message : ''),
      kora: entry.kora !== undefined ? Math.max(0, Number(entry.kora) || 0) : (prev ? prev.kora : 0),
      prostrations: entry.prostrations !== undefined
        ? Math.max(0, Number(entry.prostrations) || 0)
        : (prev ? prev.prostrations : 0),
      spec: {
        plinth: spec.plinth || prev?.spec?.plinth || 'lotus',
        dome: spec.dome || prev?.spec?.dome || 'white',
        spire: spec.spire || prev?.spec?.spire || 'gold13',
        ornament: spec.ornament || prev?.spec?.ornament || 'moonSun',
      },
      rejoiceCount: Math.max(0, Number(entry.rejoiceCount) || 0),
      createdAt: Number(entry.createdAt) || (prev ? prev.createdAt : Date.now()),
    };

    if (existingIdx >= 0) {
      const updated = {
        ...prev,
        ...normalized,
        isOwn: prev.isOwn || normalized.isOwn,
        rejoiceCount: Math.max(prev.rejoiceCount, normalized.rejoiceCount),
      };
      stupas[existingIdx] = updated;
      if (updated.id.startsWith('seed-stupa-')) {
        const seedBase = SEEDED_STUPAS.find((s) => s.id === updated.id);
        if (seedBase && updated.rejoiceCount > seedBase.rejoiceCount) {
          if (!savedSection.stupaRejoiceDeltas) savedSection.stupaRejoiceDeltas = {};
          savedSection.stupaRejoiceDeltas[updated.id] = Math.max(
            Number(savedSection.stupaRejoiceDeltas[updated.id]) || 0,
            updated.rejoiceCount - seedBase.rejoiceCount
          );
        }
      } else if (!updated.isOwn) {
        if (!Array.isArray(savedSection.importedStupas)) savedSection.importedStupas = [];
        savedSection.importedStupas = [
          updated,
          ...savedSection.importedStupas.filter((s) => s.id !== updated.id),
        ].slice(0, 30);
      }
      return updated;
    }

    stupas.unshift(normalized);
    if (!normalized.isOwn && !normalized.id.startsWith('seed-stupa-')) {
      if (!Array.isArray(savedSection.importedStupas)) savedSection.importedStupas = [];
      savedSection.importedStupas = [
        normalized,
        ...savedSection.importedStupas.filter((s) => s.id !== normalized.id),
      ].slice(0, 30);
    }
    return normalized;
  }

  function handleIncomingAction(action, payload, _meta = {}) {
    if (!action || !payload) return;
    if (action === 'lamp') {
      const existing = payload.id ? lamps.find((l) => l.id === payload.id) : null;
      if (
        existing &&
        existing.rejoiceCount >= (Number(payload.rejoiceCount) || 0) &&
        existing.burnBonusSec >= (Number(payload.burnBonusSec) || 0)
      ) {
        return;
      }
      const merged = mergeIncomingLamp(payload, existing ? existing.isOwn : false);
      if (merged) {
        persistToSave();
        bus.emit('community:lampOffered', merged);
        bus.emit('community:changed', { type: 'lamp' });
      }
    } else if (action === 'rejoiceLamp') {
      const target = lamps.find((l) => l.id === payload.id);
      if (target) {
        if (typeof payload.rejoiceCount === 'number' && payload.rejoiceCount <= target.rejoiceCount) {
          return;
        }
        target.rejoiceCount = typeof payload.rejoiceCount === 'number'
          ? Math.max(target.rejoiceCount + 1, payload.rejoiceCount)
          : target.rejoiceCount + 1;
        target.burnBonusSec += 120;
        persistToSave();
        bus.emit('community:lampRejoiced', { id: target.id, lamp: target });
        bus.emit('community:changed', { type: 'rejoiceLamp', id: target.id });
      }
    } else if (action === 'stupa') {
      const existing = payload.id ? stupas.find((s) => s.id === payload.id) : null;
      if (
        existing &&
        existing.rejoiceCount >= (Number(payload.rejoiceCount) || 0) &&
        existing.title === sanitizeText(payload.title, 28, existing.title) &&
        existing.message === sanitizeText(payload.message, 120, existing.message) &&
        JSON.stringify(existing.spec) === JSON.stringify({
          plinth: payload.spec?.plinth || existing.spec?.plinth || 'lotus',
          dome: payload.spec?.dome || existing.spec?.dome || 'white',
          spire: payload.spec?.spire || existing.spec?.spire || 'gold13',
          ornament: payload.spec?.ornament || existing.spec?.ornament || 'moonSun',
        })
      ) {
        return;
      }
      const merged = mergeIncomingStupa(payload, existing ? existing.isOwn : false);
      if (merged) {
        persistToSave();
        bus.emit('community:stupaBuilt', merged);
        bus.emit('community:changed', { type: 'stupa' });
      }
    } else if (action === 'rejoiceStupa') {
      const target = stupas.find((s) => s.id === payload.id);
      if (target) {
        if (typeof payload.rejoiceCount === 'number' && payload.rejoiceCount <= target.rejoiceCount) {
          return;
        }
        target.rejoiceCount = typeof payload.rejoiceCount === 'number'
          ? Math.max(target.rejoiceCount + 1, payload.rejoiceCount)
          : target.rejoiceCount + 1;
        persistToSave();
        bus.emit('community:changed', { type: 'rejoiceStupa', id: target.id });
      }
    } else if (action === 'samyeContribute' || action === 'samye') {
      if (payload.id && samye.contributors.some((c) => c.id === payload.id)) {
        return;
      }
      const addStupas = Math.max(1, Number(payload.stupas) || 1);
      const addKora = Math.max(0, Number(payload.kora) || 0);
      const addPros = Math.max(0, Number(payload.prostrations) || 0);
      samye.contributedStupas = Math.min(SAMYE_TARGET_STUPAS, samye.contributedStupas + addStupas);
      samye.totalKora += addKora;
      samye.totalProstrations += addPros;
      const contribRecord = {
        id: payload.id || `samye-ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pilgrimName: sanitizeText(payload.pilgrimName, 24, '朝聖行者'),
        stupas: addStupas,
        kora: addKora,
        prostrations: addPros,
        message: sanitizeText(payload.message, 120, ''),
        createdAt: Number(payload.createdAt) || Date.now(),
      };
      samye.contributors.unshift(contribRecord);
      persistToSave();
      bus.emit('community:samyeContributed', contribRecord);
      bus.emit('community:changed', { type: 'samye' });
    }
  }

  // ---------------------------------------------------------------- Public API Methods
  function getPilgrimName() {
    if (pilgrimName) return pilgrimName;
    return i18n?.t?.('lamp.form.defaultPilgrim') || '朝聖行者';
  }

  function setPilgrimName(name) {
    pilgrimName = sanitizeText(name, 24, '');
    persistToSave();
    return getPilgrimName();
  }

  function getLamps() {
    return lamps.map((l) => ({ ...l }));
  }

  function offerLamp({ stationIdx = 0, lampIdx = 0, pilgrimName: nameArg, tag = 'peace', message = '' } = {}) {
    if (typeof nameArg === 'string' && nameArg.trim()) {
      setPilgrimName(nameArg);
    }
    const resolvedName = getPilgrimName();
    const resolvedTag = VALID_TAGS.has(tag) ? tag : 'peace';
    const defaultVerse = i18n?.t?.('lamp.preset.1.text') || '願以此燈光明，照徹法界一切有情。';
    const resolvedMsg = sanitizeText(message, 120, defaultVerse);

    const sIdx = Math.max(0, Math.min(2, Number(stationIdx) || 0));
    const lIdx = Math.max(0, Math.min(11, Number(lampIdx) || 0));

    const entry = {
      id: `lamp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      stationIdx: sIdx,
      lampIdx: lIdx,
      pilgrimName: resolvedName,
      tag: resolvedTag,
      message: resolvedMsg,
      createdAt: Date.now(),
      rejoiceCount: 1,
      burnBonusSec: 120,
      isOwn: true,
    };

    lamps.unshift(entry);
    persistToSave();
    broadcastAndPost('lamp', entry);
    bus.emit('community:lampOffered', entry);
    bus.emit('community:changed', { type: 'lamp' });
    return { ...entry };
  }

  function hasRejoicedLamp(id) {
    return rejoicedLampIds.has(id);
  }

  function rejoiceLamp(id) {
    if (!id || rejoicedLampIds.has(id)) return false;
    const target = lamps.find((l) => l.id === id);
    if (!target) return false;

    rejoicedLampIds.add(id);
    target.rejoiceCount = (Number(target.rejoiceCount) || 0) + 1;
    target.burnBonusSec = (Number(target.burnBonusSec) || 0) + 120;

    if (!savedSection.lampRejoiceDeltas) savedSection.lampRejoiceDeltas = {};
    savedSection.lampRejoiceDeltas[id] = (Number(savedSection.lampRejoiceDeltas[id]) || 0) + 1;

    persistToSave();
    bus.emit('merit', { type: 'lamp', count: 1 });
    bus.emit('vitals:restore', { mp: 10, source: 'lampRejoice' });
    bus.emit('community:lampRejoiced', { id, lamp: { ...target } });
    bus.emit('community:changed', { type: 'rejoiceLamp', id });
    broadcastAndPost('rejoiceLamp', { id });
    return true;
  }

  function getStupas() {
    return stupas.map((s) => ({ ...s, spec: { ...s.spec } }));
  }

  function getOwnStupa() {
    const own = stupas.find((s) => s.isOwn);
    return own ? { ...own, spec: { ...own.spec } } : null;
  }

  function saveOwnStupa({ pilgrimName: nameArg, title, message, spec } = {}) {
    if (typeof nameArg === 'string' && nameArg.trim()) {
      setPilgrimName(nameArg);
    }
    const stats = ctx.merit?.getStats?.() || {};
    const existingOwn = stupas.find((s) => s.isOwn);
    const id = existingOwn?.id || `stupa-own-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cleanSpec = {
      plinth: spec?.plinth || existingOwn?.spec?.plinth || 'lotus',
      dome: spec?.dome || existingOwn?.spec?.dome || 'saffron',
      spire: spec?.spire || existingOwn?.spec?.spire || 'gold13',
      ornament: spec?.ornament || existingOwn?.spec?.ornament || 'moonSun',
    };

    const entry = {
      id,
      isOwn: true,
      pilgrimName: getPilgrimName(),
      title: sanitizeText(title, 28, existingOwn?.title || '菩提祈願塔'),
      message: sanitizeText(
        message,
        120,
        existingOwn?.message || '願見此塔者皆發無上菩提心，晝夜六時恆吉祥。'
      ),
      kora: Math.max(Number(stats.kora) || 0, existingOwn?.kora || 0),
      prostrations: Math.max(Number(stats.prostration) || 0, existingOwn?.prostrations || 0),
      spec: cleanSpec,
      rejoiceCount: existingOwn ? existingOwn.rejoiceCount : 1,
      createdAt: Date.now(),
    };

    const existingIdx = stupas.findIndex((s) => s.isOwn || s.id === id);
    if (existingIdx >= 0) {
      stupas.splice(existingIdx, 1);
    }
    stupas.unshift(entry);

    persistToSave();
    broadcastAndPost('stupa', entry);
    bus.emit('community:stupaBuilt', { ...entry, spec: { ...entry.spec } });
    bus.emit('community:changed', { type: 'stupa' });
    return { ...entry, spec: { ...entry.spec } };
  }

  function hasRejoicedStupa(id) {
    return rejoicedStupaIds.has(id);
  }

  function rejoiceStupa(id) {
    if (!id || rejoicedStupaIds.has(id)) return false;
    const target = stupas.find((s) => s.id === id);
    if (!target) return false;

    rejoicedStupaIds.add(id);
    target.rejoiceCount = (Number(target.rejoiceCount) || 0) + 1;

    if (!savedSection.stupaRejoiceDeltas) savedSection.stupaRejoiceDeltas = {};
    savedSection.stupaRejoiceDeltas[id] = (Number(savedSection.stupaRejoiceDeltas[id]) || 0) + 1;

    persistToSave();
    bus.emit('merit', { type: 'prostration', count: 1 });
    broadcastAndPost('rejoiceStupa', { id });
    bus.emit('community:changed', { type: 'rejoiceStupa', id });
    return true;
  }

  function getSamyeProgress() {
    const contributedStupas = Math.min(SAMYE_TARGET_STUPAS, Math.max(0, samye.contributedStupas));
    return {
      contributedStupas,
      targetStupas: SAMYE_TARGET_STUPAS,
      totalKora: samye.totalKora,
      totalProstrations: samye.totalProstrations,
      contributors: samye.contributors.map((c) => ({ ...c })),
      myContributedStupas: samye.myContributedStupas,
      myContributedKora: samye.myContributedKora,
      myContributedProstrations: samye.myContributedProstrations,
      blessingTier: computeBlessingTier(contributedStupas),
    };
  }

  function contributeSamye({ stupas: addStupas = 1, kora = 0, prostrations = 0, pilgrimName: nameArg, message = '' } = {}) {
    if (typeof nameArg === 'string' && nameArg.trim()) {
      setPilgrimName(nameArg);
    }
    const nStupas = Math.max(1, Number(addStupas) || 1);
    const nKora = Math.max(0, Number(kora) || 0);
    const nPros = Math.max(0, Number(prostrations) || 0);

    samye.contributedStupas = Math.min(SAMYE_TARGET_STUPAS, samye.contributedStupas + nStupas);
    samye.totalKora += nKora;
    samye.totalProstrations += nPros;
    samye.myContributedStupas += nStupas;
    samye.myContributedKora += nKora;
    samye.myContributedProstrations += nPros;

    const record = {
      id: `samye-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pilgrimName: getPilgrimName(),
      stupas: nStupas,
      kora: nKora,
      prostrations: nPros,
      message: sanitizeText(message, 120, '願桑耶千塔早日圓滿，正法久住雪域！'),
      createdAt: Date.now(),
    };

    samye.contributors.unshift(record);
    persistToSave();
    broadcastAndPost('samyeContribute', record);
    bus.emit('community:samyeContributed', record);
    bus.emit('community:changed', { type: 'samye' });
    return getSamyeProgress();
  }

  function exportShareCode(kind = 'all') {
    const latestOwnLamp = lamps.find((l) => l.isOwn) || lamps[0] || null;
    const ownStupa = getOwnStupa();
    const payload = { v: 1 };

    if ((kind === 'all' || kind === 'lamp') && latestOwnLamp) {
      payload.lamp = {
        id: latestOwnLamp.id,
        stationIdx: latestOwnLamp.stationIdx,
        lampIdx: latestOwnLamp.lampIdx,
        pilgrimName: latestOwnLamp.pilgrimName,
        tag: latestOwnLamp.tag,
        message: latestOwnLamp.message,
        createdAt: latestOwnLamp.createdAt,
        rejoiceCount: latestOwnLamp.rejoiceCount,
        burnBonusSec: latestOwnLamp.burnBonusSec,
      };
    }
    if ((kind === 'all' || kind === 'stupa') && ownStupa) {
      payload.stupa = {
        id: ownStupa.id,
        pilgrimName: ownStupa.pilgrimName,
        title: ownStupa.title,
        message: ownStupa.message,
        kora: ownStupa.kora,
        prostrations: ownStupa.prostrations,
        spec: { ...ownStupa.spec },
        rejoiceCount: ownStupa.rejoiceCount,
        createdAt: ownStupa.createdAt,
      };
    }

    const encoded = encodeBase64Utf8(JSON.stringify(payload));
    return `${SHARE_PREFIX}${encoded}`;
  }

  function importShareCode(code) {
    if (typeof code !== 'string') return false;
    const trimmed = code.trim();
    if (!trimmed.startsWith(SHARE_PREFIX)) return false;
    const rawB64 = trimmed.slice(SHARE_PREFIX.length).trim();
    if (!rawB64) return false;

    const jsonStr = decodeBase64Utf8(rawB64);
    if (!jsonStr) return false;

    let parsed = null;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return false;
    }
    if (!parsed || typeof parsed !== 'object') return false;

    let importedAny = false;
    if (parsed.lamp && typeof parsed.lamp === 'object') {
      const lampCopy = {
        ...parsed.lamp,
        id: parsed.lamp.id || `imp-lamp-${Date.now()}`,
      };
      const merged = mergeIncomingLamp(lampCopy, false);
      if (merged) {
        importedAny = true;
        bus.emit('community:lampOffered', merged);
      }
    }
    if (parsed.stupa && typeof parsed.stupa === 'object') {
      const stupaCopy = {
        ...parsed.stupa,
        id: parsed.stupa.id || `imp-stupa-${Date.now()}`,
      };
      const merged = mergeIncomingStupa(stupaCopy, false);
      if (merged) {
        importedAny = true;
        bus.emit('community:stupaBuilt', merged);
      }
    }

    if (importedAny) {
      persistToSave();
      bus.emit('community:changed', { type: 'import' });
    }
    return importedAny;
  }

  function mergeServerSnapshot(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const payload = raw.data && typeof raw.data === 'object' ? raw.data : raw;
    if (!payload || typeof payload !== 'object') return false;

    let changed = false;
    if (Array.isArray(payload.lamps)) {
      for (const item of payload.lamps) {
        if (!item || !item.id) continue;
        const existing = lamps.find((l) => l.id === item.id);
        const prevRejoice = existing ? existing.rejoiceCount : -1;
        const prevBonus = existing ? existing.burnBonusSec : -1;
        const merged = mergeIncomingLamp(item, null);
        if (merged) {
          if (!existing) {
            changed = true;
            bus.emit('community:lampOffered', merged);
          } else if (merged.rejoiceCount > prevRejoice || merged.burnBonusSec > prevBonus) {
            changed = true;
          }
        }
      }
    }
    if (Array.isArray(payload.stupas)) {
      for (const item of payload.stupas) {
        if (!item || !item.id) continue;
        const existing = stupas.find((s) => s.id === item.id);
        const prevRejoice = existing ? existing.rejoiceCount : -1;
        const prevSpec = existing ? JSON.stringify(existing.spec) : '';
        const prevTitle = existing ? existing.title : '';
        const prevMsg = existing ? existing.message : '';
        const merged = mergeIncomingStupa(item, null);
        if (merged) {
          if (!existing) {
            changed = true;
            bus.emit('community:stupaBuilt', merged);
          } else if (
            merged.rejoiceCount > prevRejoice ||
            JSON.stringify(merged.spec) !== prevSpec ||
            merged.title !== prevTitle ||
            merged.message !== prevMsg
          ) {
            changed = true;
          }
        }
      }
    }
    if (payload.samye && typeof payload.samye === 'object') {
      const srvStupas = Number(payload.samye.contributedStupas) || 0;
      if (srvStupas > samye.contributedStupas) {
        samye.contributedStupas = Math.min(SAMYE_TARGET_STUPAS, srvStupas);
        changed = true;
      }
      const srvKora = Number(payload.samye.totalKora) || 0;
      if (srvKora > samye.totalKora) {
        samye.totalKora = srvKora;
        changed = true;
      }
      const srvPros = Number(payload.samye.totalProstrations) || 0;
      if (srvPros > samye.totalProstrations) {
        samye.totalProstrations = srvPros;
        changed = true;
      }
      if (Array.isArray(payload.samye.contributors)) {
        for (const c of payload.samye.contributors) {
          if (c && c.id && !samye.contributors.some((ex) => ex.id === c.id)) {
            samye.contributors.unshift({
              id: String(c.id),
              pilgrimName: sanitizeText(c.pilgrimName, 24, '朝聖行者'),
              stupas: Math.max(1, Number(c.stupas) || 1),
              kora: Math.max(0, Number(c.kora) || 0),
              prostrations: Math.max(0, Number(c.prostrations) || 0),
              message: sanitizeText(c.message, 120, ''),
              createdAt: Number(c.createdAt) || Date.now(),
            });
            changed = true;
          }
        }
      }
    }
    if (changed) {
      persistToSave();
      bus.emit('community:changed', { type: 'sync' });
    }
    return changed;
  }

  async function flushPendingActions() {
    if (inFlightPromises.size > 0) {
      await Promise.allSettled(Array.from(inFlightPromises));
    }
    if (flushPromise) {
      try {
        await flushPromise;
      } catch { /* ignore */ }
    }
    if (!Array.isArray(savedSection.pendingActions) || savedSection.pendingActions.length === 0) {
      return 0;
    }
    if (typeof fetch !== 'function') {
      backendOnline = false;
      return 0;
    }

    flushPromise = (async () => {
      let flushedCount = 0;
      const snapshot = [...savedSection.pendingActions];
      for (const item of snapshot) {
        if (!item || !item.action) continue;
        try {
          const res = await fetch(getEndpointUrl('/api/community'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ action: item.action, payload: item.payload }),
          });
          if (!res || !res.ok) {
            backendOnline = false;
            break;
          }
          backendOnline = true;
          lastSyncAt = Date.now();
          flushedCount += 1;
          removePendingActionById(item.id);

          const contentType = res.headers?.get?.('content-type') || '';
          if ((!contentType || contentType.includes('application/json')) && typeof res.json === 'function') {
            try {
              const raw = await res.json();
              mergeServerSnapshot(raw);
            } catch { /* ignore non-json */ }
          }
        } catch {
          backendOnline = false;
          break;
        }
      }
      return flushedCount;
    })();

    try {
      return await flushPromise;
    } finally {
      flushPromise = null;
    }
  }

  async function syncFromServer() {
    if (typeof fetch !== 'function') {
      backendOnline = false;
      return false;
    }
    if (
      inFlightPromises.size > 0 ||
      (Array.isArray(savedSection.pendingActions) && savedSection.pendingActions.length > 0)
    ) {
      await flushPendingActions();
    }
    try {
      const res = await fetch(getEndpointUrl('/api/community'), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res || !res.ok) {
        backendOnline = false;
        return false;
      }
      const contentType = res.headers?.get?.('content-type') || '';
      if (contentType && !contentType.includes('application/json')) {
        return false;
      }
      const raw = await res.json();
      if (!raw || typeof raw !== 'object') return false;

      backendOnline = true;
      lastSyncAt = Date.now();
      return mergeServerSnapshot(raw);
    } catch {
      // Static deployment or offline — silently ignore
      backendOnline = false;
      return false;
    }
  }

  function getBackendStatus() {
    return {
      online: Boolean(backendOnline),
      lastSyncAt,
      pendingCount: Array.isArray(savedSection.pendingActions) ? savedSection.pendingActions.length : 0,
      apiBase: resolveApiBase(options?.apiBase),
    };
  }

  let syncTimer = 0;
  function update(dt) {
    if (state.mode !== 'play') return;
    syncTimer += dt;
    if (syncTimer >= SYNC_INTERVAL_SEC) {
      syncTimer = 0;
      syncFromServer();
    }
  }

  // Trigger an initial background sync
  if (options?.autoSync !== false) {
    syncFromServer();
  }

  const api = {
    update,
    getPilgrimName,
    setPilgrimName,
    getLamps,
    offerLamp,
    rejoiceLamp,
    hasRejoicedLamp,
    getStupas,
    getOwnStupa,
    saveOwnStupa,
    rejoiceStupa,
    hasRejoicedStupa,
    getSamyeProgress,
    contributeSamye,
    exportShareCode,
    importShareCode,
    syncFromServer,
    flushPendingActions,
    getBackendStatus,
    getEndpointUrl,
  };

  ctx.community = api;

  ctx.debug?.register('community', {
    getLamps: () => api.getLamps(),
    offerLamp: (opts) => api.offerLamp(opts),
    rejoiceLamp: (id) => api.rejoiceLamp(id),
    getStupas: () => api.getStupas(),
    getOwnStupa: () => api.getOwnStupa(),
    saveOwnStupa: (opts) => api.saveOwnStupa(opts),
    getSamyeProgress: () => api.getSamyeProgress(),
    contributeSamye: (opts) => api.contributeSamye(opts),
    exportShareCode: (kind) => api.exportShareCode(kind),
    importShareCode: (code) => api.importShareCode(code),
    syncFromServer: () => api.syncFromServer(),
    flushPendingActions: () => api.flushPendingActions(),
    getBackendStatus: () => api.getBackendStatus(),
  });

  return api;
}
