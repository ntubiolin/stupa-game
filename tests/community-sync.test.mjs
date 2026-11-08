import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCommunity, resolveApiUrl } from '../src/systems/community.js';

function createMockCtx(initialSave = null) {
  const listeners = new Map();
  const bus = {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
      return () => {
        const arr = listeners.get(event) || [];
        const idx = arr.indexOf(fn);
        if (idx >= 0) arr.splice(idx, 1);
      };
    },
    emit(event, payload) {
      const arr = listeners.get(event) || [];
      for (const fn of [...arr]) {
        fn(payload);
      }
    },
  };

  const store = new Map();
  if (initialSave) {
    store.set('community', JSON.parse(JSON.stringify(initialSave)));
  }

  const save = {
    get(section, fallback) {
      if (!store.has(section)) return JSON.parse(JSON.stringify(fallback));
      return JSON.parse(JSON.stringify(store.get(section)));
    },
    set(section, data) {
      store.set(section, JSON.parse(JSON.stringify(data)));
    },
    rawStore: store,
  };

  const debugRegistry = {};
  const ctx = {
    bus,
    save,
    state: { mode: 'play' },
    i18n: { t: (k) => k },
    merit: { getStats: () => ({ kora: 12, prostration: 36 }) },
    debug: {
      register(name, obj) {
        debugRegistry[name] = obj;
      },
      registry: debugRegistry,
    },
  };

  return ctx;
}

test('Test 1: syncFromServer parses both { ok: true, data: ... } and top-level envelopes and merges lamps, stupas, rejoice counts, and Samye progress', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    delete globalThis.__STUPA_BACKEND_URL__;
  });

  // Start with autoSync disabled so we can control sync calls deterministically
  const ctx = createMockCtx();
  const offeredEvents = [];
  const stupaEvents = [];
  const changedEvents = [];
  ctx.bus.on('community:lampOffered', (e) => offeredEvents.push(e));
  ctx.bus.on('community:stupaBuilt', (e) => stupaEvents.push(e));
  ctx.bus.on('community:changed', (e) => changedEvents.push(e));

  const community = createCommunity(ctx, { autoSync: false, apiBase: 'https://relay.stupa.example/' });
  assert.equal(resolveApiUrl('/api/community', 'https://relay.stupa.example/'), 'https://relay.stupa.example/api/community');
  assert.equal(community.getBackendStatus().apiBase, 'https://relay.stupa.example');

  // 1a. Envelope `{ ok: true, data: { lamps, stupas, samye } }` + rejoiceCount update on existing seed item
  let requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(url);
    return {
      ok: true,
      headers: { get: () => 'application/json; charset=utf-8' },
      json: async () => ({
        ok: true,
        data: {
          lamps: [
            {
              id: 'srv-lamp-101',
              stationIdx: 1,
              lampIdx: 2,
              pilgrimName: '仁青多傑',
              tag: 'wisdom',
              message: '願般若燈明常照雪山。',
              createdAt: 1710009000000,
              rejoiceCount: 7,
              burnBonusSec: 840,
            },
            {
              id: 'seed-lamp-1',
              rejoiceCount: 50,
              burnBonusSec: 960,
            },
          ],
          stupas: [
            {
              id: 'srv-stupa-201',
              pilgrimName: '白瑪央金',
              title: '吉祥金剛塔',
              message: '迴向法界眾生同證菩提。',
              kora: 18,
              prostrations: 108,
              spec: { plinth: 'vajra', dome: 'gilded', spire: 'gold13', ornament: 'vajraFlame' },
              rejoiceCount: 12,
              createdAt: 1710009100000,
            },
            {
              id: 'seed-stupa-1',
              rejoiceCount: 60,
            },
          ],
          samye: {
            contributedStupas: 410,
            totalKora: 1500,
            totalProstrations: 5200,
            contributors: [
              {
                id: 'srv-samye-301',
                pilgrimName: '貢嘎堅贊',
                stupas: 5,
                kora: 21,
                prostrations: 108,
                message: '共成桑耶千塔！',
                createdAt: 1710009200000,
              },
            ],
          },
        },
      }),
    };
  };

  const changed1 = await community.syncFromServer();
  assert.equal(changed1, true);
  assert.equal(requestedUrls[0], 'https://relay.stupa.example/api/community');
  assert.equal(community.getBackendStatus().online, true);
  assert.ok(community.getBackendStatus().lastSyncAt > 0);

  const lampsAfter1 = community.getLamps();
  const srvLamp = lampsAfter1.find((l) => l.id === 'srv-lamp-101');
  assert.ok(srvLamp, 'new server lamp should be merged');
  assert.equal(srvLamp.pilgrimName, '仁青多傑');
  assert.equal(srvLamp.rejoiceCount, 7);

  const seedLamp1 = lampsAfter1.find((l) => l.id === 'seed-lamp-1');
  assert.equal(seedLamp1.rejoiceCount, 50, 'existing seed-lamp-1 rejoiceCount should update from server');
  assert.equal(seedLamp1.burnBonusSec, 960, 'existing seed-lamp-1 burnBonusSec should update from server');
  assert.equal(seedLamp1.pilgrimName, '丹增嘉措', 'existing seed-lamp-1 metadata should be preserved');

  const stupasAfter1 = community.getStupas();
  const srvStupa = stupasAfter1.find((s) => s.id === 'srv-stupa-201');
  assert.ok(srvStupa, 'new server stupa should be merged');
  assert.equal(srvStupa.title, '吉祥金剛塔');
  assert.equal(srvStupa.rejoiceCount, 12);

  const seedStupa1 = stupasAfter1.find((s) => s.id === 'seed-stupa-1');
  assert.equal(seedStupa1.rejoiceCount, 60, 'existing seed-stupa-1 rejoiceCount should update from server');

  const samye1 = community.getSamyeProgress();
  assert.equal(samye1.contributedStupas, 410);
  assert.equal(samye1.totalKora, 1500);
  assert.equal(samye1.totalProstrations, 5200);
  assert.ok(samye1.contributors.some((c) => c.id === 'srv-samye-301'));
  assert.equal(offeredEvents.length, 1);
  assert.equal(stupaEvents.length, 1);
  assert.ok(changedEvents.some((e) => e.type === 'sync'));

  // 1b. Top-level `{ lamps, stupas, samye }` envelope without `.data` wrapper
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      lamps: [
        {
          id: 'srv-lamp-102',
          stationIdx: 0,
          lampIdx: 1,
          pilgrimName: 'TopLevelPilgrim',
          tag: 'peace',
          message: 'Top-level lamp envelope test',
          createdAt: 1710009500000,
          rejoiceCount: 3,
          burnBonusSec: 360,
        },
      ],
      stupas: [
        {
          id: 'srv-stupa-202',
          pilgrimName: 'TopLevelBuilder',
          title: '蓮花清淨塔',
          message: 'Top-level stupa envelope test',
          kora: 9,
          prostrations: 54,
          spec: { plinth: 'lotus', dome: 'white', spire: 'turquoise', ornament: 'parasol' },
          rejoiceCount: 4,
          createdAt: 1710009600000,
        },
      ],
      samye: {
        contributedStupas: 425,
        totalKora: 1620,
        totalProstrations: 5400,
        contributors: [],
      },
    }),
  });

  const changed2 = await community.syncFromServer();
  assert.equal(changed2, true);
  assert.ok(community.getLamps().some((l) => l.id === 'srv-lamp-102'));
  assert.ok(community.getStupas().some((s) => s.id === 'srv-stupa-202'));
  assert.equal(community.getSamyeProgress().contributedStupas, 425);
});

test('Test 2: Offline write queue (pendingActions) stores offerLamp, saveOwnStupa, rejoiceLamp, contributeSamye when offline, persists to ctx.save, and flushes when back online', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // Simulate offline environment where fetch rejects
  globalThis.fetch = async () => {
    throw new Error('Network offline');
  };

  const ctx = createMockCtx();
  const outboundEvents = [];
  ctx.bus.on('community:outbound', (ev) => outboundEvents.push(ev));

  const community = createCommunity(ctx, { autoSync: false });

  // Perform all 4 actions while offline (plus an extra saveOwnStupa to verify stupa deduplication)
  const offered = community.offerLamp({
    stationIdx: 2,
    lampIdx: 3,
    pilgrimName: '離線行者',
    tag: 'bodhicitta',
    message: '離線供燈祈願文',
  });
  community.saveOwnStupa({
    pilgrimName: '離線行者',
    title: '初版祈願塔',
    message: '初版迴向',
    spec: { plinth: 'stepped', dome: 'white', spire: 'bronze', ornament: 'parasol' },
  });
  const updatedStupa = community.saveOwnStupa({
    pilgrimName: '離線行者',
    title: '二版圓滿塔',
    message: '更新後的迴向文',
    spec: { plinth: 'mandala', dome: 'gilded', spire: 'gold13', ornament: 'vajraFlame' },
  });
  const rejoicedOk = community.rejoiceLamp('seed-lamp-2');
  assert.equal(rejoicedOk, true);
  community.contributeSamye({
    stupas: 3,
    kora: 21,
    prostrations: 108,
    pilgrimName: '離線行者',
    message: '離線護持桑耶',
  });

  assert.equal(outboundEvents.length, 5, 'community:outbound should fire for every local action');

  // Wait for rejected in-flight promises to settle
  await new Promise((r) => setTimeout(r, 10));

  const statusOffline = community.getBackendStatus();
  assert.equal(statusOffline.online, false);
  assert.equal(
    statusOffline.pendingCount,
    4,
    'pendingActions should hold 4 actions (stupa update deduplicated by stupa id)'
  );

  // Verify persistence in ctx.save
  const saved = ctx.save.get('community', {});
  assert.equal(Array.isArray(saved.pendingActions), true);
  assert.equal(saved.pendingActions.length, 4);
  assert.deepEqual(
    saved.pendingActions.map((a) => a.action),
    ['lamp', 'stupa', 'rejoiceLamp', 'samyeContribute']
  );
  assert.equal(saved.pendingActions[0].payload.id, offered.id);
  assert.equal(saved.pendingActions[1].payload.id, updatedStupa.id);
  assert.equal(saved.pendingActions[1].payload.title, '二版圓滿塔');
  assert.equal(saved.pendingActions[2].payload.id, 'seed-lamp-2');
  assert.equal(saved.pendingActions[3].payload.stupas, 3);

  // Bring fetch back online and verify flushPendingActions sends all queued actions and clears the queue
  const flushedPosts = [];
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === 'POST') {
      flushedPosts.push({ url, body: JSON.parse(init.body) });
    }
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: true, data: {} }),
    };
  };

  const flushedCount = await community.flushPendingActions();
  assert.equal(flushedCount, 4);
  assert.equal(flushedPosts.length, 4);
  assert.deepEqual(
    flushedPosts.map((p) => p.body.action),
    ['lamp', 'stupa', 'rejoiceLamp', 'samyeContribute']
  );

  const statusOnline = community.getBackendStatus();
  assert.equal(statusOnline.online, true);
  assert.equal(statusOnline.pendingCount, 0);
  assert.equal(ctx.save.get('community', {}).pendingActions.length, 0);
});

test('Test 3: Real-time bus.emit("ws:community", { action, payload }) updates lamps, stupas, and Samye progress and emits events with deduplication', () => {
  const ctx = createMockCtx();
  const community = createCommunity(ctx, { autoSync: false });

  const lampEvents = [];
  const stupaEvents = [];
  const samyeEvents = [];
  const changedEvents = [];

  ctx.bus.on('community:lampOffered', (e) => lampEvents.push(e));
  ctx.bus.on('community:stupaBuilt', (e) => stupaEvents.push(e));
  ctx.bus.on('community:samyeContributed', (e) => samyeEvents.push(e));
  ctx.bus.on('community:changed', (e) => changedEvents.push(e));

  // 1. Incoming live lamp via ws:community
  ctx.bus.emit('ws:community', {
    action: 'lamp',
    payload: {
      id: 'ws-lamp-501',
      stationIdx: 1,
      lampIdx: 4,
      pilgrimName: '即時行者・扎西',
      tag: 'peace',
      message: '願十方無障，世間安隱。',
      createdAt: Date.now(),
      rejoiceCount: 2,
      burnBonusSec: 240,
    },
  });

  assert.equal(lampEvents.length, 1);
  assert.equal(lampEvents[0].id, 'ws-lamp-501');
  assert.ok(community.getLamps().some((l) => l.id === 'ws-lamp-501'));

  // Duplicate ws:community with same id & rejoiceCount should be ignored
  ctx.bus.emit('ws:community', {
    action: 'lamp',
    payload: {
      id: 'ws-lamp-501',
      pilgrimName: '即時行者・扎西',
      rejoiceCount: 2,
      burnBonusSec: 240,
    },
  });
  assert.equal(lampEvents.length, 1, 'duplicate ws lamp should not re-emit community:lampOffered');

  // 2. Incoming live stupa via ws:community
  ctx.bus.emit('ws:community', {
    action: 'stupa',
    payload: {
      id: 'ws-stupa-601',
      pilgrimName: '即時行者・央金',
      title: '空行光明塔',
      message: '願智慧光遍照無明。',
      kora: 27,
      prostrations: 108,
      spec: { plinth: 'lotus', dome: 'saffron', spire: 'gold13', ornament: 'moonSun' },
      rejoiceCount: 5,
      createdAt: Date.now(),
    },
  });

  assert.equal(stupaEvents.length, 1);
  assert.equal(stupaEvents[0].id, 'ws-stupa-601');
  assert.ok(community.getStupas().some((s) => s.id === 'ws-stupa-601'));

  // 3. Incoming live Samye contribution via ws:community
  const beforeSamye = community.getSamyeProgress();
  ctx.bus.emit('ws:community', {
    action: 'samyeContribute',
    payload: {
      id: 'ws-samye-701',
      pilgrimName: '即時行者・洛桑',
      stupas: 4,
      kora: 16,
      prostrations: 64,
      message: '同願桑耶千塔早成！',
      createdAt: Date.now(),
    },
  });

  const afterSamye = community.getSamyeProgress();
  assert.equal(afterSamye.contributedStupas, beforeSamye.contributedStupas + 4);
  assert.equal(afterSamye.totalKora, beforeSamye.totalKora + 16);
  assert.equal(afterSamye.totalProstrations, beforeSamye.totalProstrations + 64);
  assert.equal(samyeEvents.length, 1);

  // Duplicate samye contribution with same id should be ignored
  ctx.bus.emit('ws:community', {
    action: 'samyeContribute',
    payload: {
      id: 'ws-samye-701',
      pilgrimName: '即時行者・洛桑',
      stupas: 4,
      kora: 16,
      prostrations: 64,
    },
  });
  assert.equal(community.getSamyeProgress().contributedStupas, afterSamye.contributedStupas);
  assert.ok(changedEvents.length >= 3);
});
