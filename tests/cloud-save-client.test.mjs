import test from 'node:test';
import assert from 'node:assert/strict';
import { createBus } from '../src/core/events.js';
import { createSave, SAVE_STORAGE_KEY } from '../src/systems/save.js';
import {
  createCloudSave,
  AUTH_STORAGE_KEY,
  CLOUD_SYNC_INTERVAL_SEC,
  MILESTONE_DEBOUNCE_SEC,
  extractSaveSummary,
  isFreshSave,
  hasStoryProgress,
} from '../src/systems/cloudSave.js';
import { createCommunity } from '../src/systems/community.js';

function withMockEnv(t, initialStorage = {}) {
  const origStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const origFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');

  const store = new Map(Object.entries(initialStorage));
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
  });

  t.after(() => {
    if (origStorage) Object.defineProperty(globalThis, 'localStorage', origStorage);
    else delete globalThis.localStorage;
    if (origFetch) Object.defineProperty(globalThis, 'fetch', origFetch);
    else delete globalThis.fetch;
  });

  return {
    store,
    setFetch(fn) {
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        value: fn,
      });
    },
  };
}

test('1. save.js onFlush hook, save:flushed bus event, and getWritableSections', (t) => {
  withMockEnv(t);
  const bus = createBus();
  const ctx = { bus };
  const save = createSave(ctx, { writableSections: ['story'] });

  assert.deepEqual(save.getWritableSections(), ['story']);

  const flushedHooks = [];
  const flushedEvents = [];
  const unsub = save.onFlush((payload) => flushedHooks.push(payload));
  bus.on('save:flushed', (payload) => flushedEvents.push(payload));

  save.set('story', { version: 2, beat: 'arrival' });
  assert.equal(save.flush(), true);

  assert.equal(flushedHooks.length, 1);
  assert.equal(flushedEvents.length, 1);
  assert.equal(flushedHooks[0].writeCount, 1);
  assert.deepEqual(flushedHooks[0].writableSections, ['story']);
  assert.ok(flushedHooks[0].sections.includes('story'));

  unsub();
  save.set('story', { version: 2, beat: 'losang' });
  assert.equal(save.flush(), true);
  assert.equal(flushedHooks.length, 1);
  assert.equal(flushedEvents.length, 2);
});

test('2. Guest-to-Google sign-in first upload (!cloud.exists -> auto-uploads local progress)', async (t) => {
  const { store, setFetch } = withMockEnv(t, {
    [SAVE_STORAGE_KEY]: JSON.stringify({
      version: 2,
      savedAt: 1710000000000,
      sections: {
        vitals: { level: 9, exp: 180 },
        merit: { points: 540, kora: 5 },
        quests: { done: ['q1', 'q2'], active: {} },
      },
    }),
  });

  const requests = [];
  let cloudSaveData = null;

  setFetch(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    requests.push({ url, method, headers: opts.headers, body });

    if (url.endsWith('/api/auth/google') && method === 'POST') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          sessionToken: 'tok-guest-1',
          expiresAt: Date.now() + 3600_000,
          user: {
            uid: 'google-u1',
            email: 'tenzin@example.com',
            displayName: 'Tenzin',
            photoURL: '',
          },
        }),
      };
    }

    if (url.endsWith('/api/save') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          exists: Boolean(cloudSaveData),
          uid: 'google-u1',
          summary: cloudSaveData ? extractSaveSummary(cloudSaveData) : null,
          saveData: cloudSaveData,
          updatedAt: cloudSaveData?.savedAt || 0,
        }),
      };
    }

    if (url.endsWith('/api/save') && method === 'POST') {
      cloudSaveData = body.saveData;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          exists: true,
          uid: 'google-u1',
          summary: extractSaveSummary(cloudSaveData),
          saveData: cloudSaveData,
          updatedAt: cloudSaveData.savedAt,
        }),
      };
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  const bus = createBus();
  const toasts = [];
  bus.on('toast', (msg) => toasts.push(msg));

  const ctx = { bus, state: { mode: 'play' } };
  createSave(ctx);
  const cloud = createCloudSave(ctx);

  assert.equal(cloud.isSignedIn(), false);

  const res = await cloud.signInWithGoogle({
    devProfile: { email: 'tenzin@example.com', displayName: 'Tenzin' },
  });

  assert.equal(res.ok, true);
  assert.equal(cloud.isSignedIn(), true);
  assert.equal(cloud.getStatus(), 'synced');
  assert.ok(store.has(AUTH_STORAGE_KEY));

  // Verify local guest progress was automatically uploaded to cloud
  assert.ok(cloudSaveData);
  assert.equal(cloudSaveData.sections.vitals.level, 9);
  assert.equal(cloudSaveData.sections.merit.points, 540);
  assert.equal(cloud.getState().cloudSummary.level, 9);
  assert.ok(toasts.some((item) => item.key === 'settings.cloud.toastFirstSync'));
});

test('3. Fresh local device sign-in (isFreshSave -> auto-imports cloud progress into ctx.save & registered systems)', async (t) => {
  const { setFetch } = withMockEnv(t);

  const remoteDoc = {
    version: 2,
    savedAt: 1715000000000,
    sections: {
      vitals: { level: 16, exp: 420 },
      merit: { points: 1080, kora: 12 },
      inventory: { turquoise: 350, bag: ['vajra_bell'] },
      story: { version: 2, beat: 'complete', journey: { activeChapterId: 'samye', chapters: {} } },
    },
  };

  setFetch(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    if (url.endsWith('/api/auth/google') && method === 'POST') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          sessionToken: 'tok-fresh-2',
          expiresAt: Date.now() + 3600_000,
          user: { uid: 'google-u2', email: 'pema@example.com', displayName: 'Pema', photoURL: '' },
        }),
      };
    }
    if (url.endsWith('/api/save') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          exists: true,
          uid: 'google-u2',
          summary: extractSaveSummary(remoteDoc),
          saveData: remoteDoc,
          updatedAt: remoteDoc.savedAt,
        }),
      };
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  const bus = createBus();
  let deserializedInventory = null;
  let vitalsPatched = null;
  const ctx = {
    bus,
    state: { mode: 'play' },
    vitals: {
      set(patch) {
        vitalsPatched = patch;
      },
    },
  };
  createSave(ctx);
  ctx.save.register(
    'inventory',
    () => deserializedInventory || { turquoise: 0, bag: [] },
    (data) => {
      deserializedInventory = data;
    }
  );

  assert.equal(isFreshSave(ctx.save.dump()), true);
  assert.equal(hasStoryProgress(remoteDoc), true);

  const cloud = createCloudSave(ctx);
  const res = await cloud.signInWithGoogle({
    devProfile: { email: 'pema@example.com', displayName: 'Pema' },
  });

  assert.equal(res.ok, true);
  assert.equal(cloud.getStatus(), 'synced');
  assert.equal(ctx.save.get('vitals').level, 16);
  assert.equal(ctx.save.get('merit').points, 1080);
  assert.deepEqual(deserializedInventory, { turquoise: 350, bag: ['vajra_bell'] });
  assert.deepEqual(vitalsPatched, { level: 16, exp: 420 });
  assert.equal(cloud.getState().dirtySinceLastSync, false);
  assert.equal(cloud.getState().lastSyncedSavedAt, 1715000000000);
});

test('4. Two-tier throttling: 45s periodic sync and 3s milestone event debounce', async (t) => {
  const { setFetch } = withMockEnv(t);

  let postCalls = [];
  setFetch(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    if (url.endsWith('/api/auth/google')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          sessionToken: 'tok-throttle',
          expiresAt: Date.now() + 3600_000,
          user: { uid: 'google-u3', email: 'dorje@example.com', displayName: 'Dorje', photoURL: '' },
        }),
      };
    }
    if (url.endsWith('/api/save') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, exists: false, uid: 'google-u3', summary: null, saveData: null }),
      };
    }
    if (url.endsWith('/api/save') && method === 'POST') {
      postCalls.push(body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          exists: true,
          uid: 'google-u3',
          summary: extractSaveSummary(body.saveData),
          saveData: body.saveData,
          updatedAt: body.saveData.savedAt,
        }),
      };
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  const bus = createBus();
  const ctx = { bus, state: { mode: 'play' } };
  createSave(ctx);
  const cloud = createCloudSave(ctx);

  await cloud.signInWithGoogle({ devProfile: { email: 'dorje@example.com', displayName: 'Dorje' } });
  assert.equal(postCalls.length, 1); // Initial upload

  // Modify local save and flush
  ctx.save.set('merit', { points: 216, kora: 2 });
  ctx.save.flush();
  assert.equal(cloud.getState().dirtySinceLastSync, true);

  // Advancing 20s (< 45s) should NOT trigger periodic sync yet
  cloud.update(20.0);
  assert.equal(postCalls.length, 1);

  // Advancing another 25s (total 45s >= CLOUD_SYNC_INTERVAL_SEC) triggers periodic sync
  cloud.update(CLOUD_SYNC_INTERVAL_SEC - 20.0);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(postCalls.length, 2);
  assert.equal(postCalls[1].saveData.sections.merit.points, 216);
  assert.equal(cloud.getState().dirtySinceLastSync, false);

  // Emit milestone event ('quest:complete') -> schedules 3s debounced sync
  ctx.save.set('quests', { done: ['prologue_1'], active: {} });
  ctx.save.flush();
  bus.emit('quest:complete', { id: 'prologue_1' });

  cloud.update(1.5);
  assert.equal(postCalls.length, 2); // Not yet 3s

  cloud.update(MILESTONE_DEBOUNCE_SEC - 1.5 + 0.1);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(postCalls.length, 3);
  assert.deepEqual(postCalls[2].saveData.sections.quests.done, ['prologue_1']);
});

test('5. Divergent saves conflict detection and resolution via resolveConflict("cloud" | "local")', async (t) => {
  const { setFetch } = withMockEnv(t, {
    [SAVE_STORAGE_KEY]: JSON.stringify({
      version: 2,
      savedAt: 1712000000000,
      sections: {
        vitals: { level: 5, exp: 50 },
        merit: { points: 300, kora: 3 },
      },
    }),
  });

  let cloudDoc = {
    version: 2,
    savedAt: 1718000000000,
    sections: {
      vitals: { level: 12, exp: 90 },
      merit: { points: 900, kora: 9 },
    },
  };

  setFetch(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    if (url.endsWith('/api/auth/google')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          sessionToken: 'tok-conflict',
          expiresAt: Date.now() + 3600_000,
          user: { uid: 'google-u4', email: 'karma@example.com', displayName: 'Karma', photoURL: '' },
        }),
      };
    }
    if (url.endsWith('/api/save') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          exists: true,
          uid: 'google-u4',
          summary: extractSaveSummary(cloudDoc),
          saveData: cloudDoc,
          updatedAt: cloudDoc.savedAt,
        }),
      };
    }
    if (url.endsWith('/api/save') && method === 'POST') {
      cloudDoc = body.saveData;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          exists: true,
          uid: 'google-u4',
          summary: extractSaveSummary(cloudDoc),
          saveData: cloudDoc,
          updatedAt: cloudDoc.savedAt,
        }),
      };
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  const bus = createBus();
  let conflictEvents = 0;
  bus.on('cloudSave:conflict', () => {
    conflictEvents += 1;
  });

  const ctx = { bus, state: { mode: 'play' } };
  createSave(ctx);
  const cloud = createCloudSave(ctx);

  await cloud.signInWithGoogle({ devProfile: { email: 'karma@example.com', displayName: 'Karma' } });

  // Both local (Lv 5) and cloud (Lv 12) have divergent progress -> status === 'conflict'
  assert.equal(cloud.getStatus(), 'conflict');
  assert.equal(conflictEvents, 1);
  const conflict = cloud.getConflict();
  assert.ok(conflict);
  assert.equal(conflict.localSummary.level, 5);
  assert.equal(conflict.cloudSummary.level, 12);

  // Resolve conflict by choosing 'cloud'
  const resCloud = await cloud.resolveConflict('cloud', { reload: false });
  assert.equal(resCloud.ok, true);
  assert.equal(cloud.getStatus(), 'synced');
  assert.equal(cloud.getConflict(), null);
  assert.equal(ctx.save.get('vitals').level, 12);
  assert.equal(ctx.save.get('merit').points, 900);

  // Now simulate a 409 conflict on POST /api/save and resolve with 'local'
  setFetch(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    if (url.endsWith('/api/save') && method === 'POST') {
      if (!body.force) {
        return {
          ok: false,
          status: 409,
          json: async () => ({
            ok: false,
            error: 'save-conflict',
            cloud: {
              exists: true,
              summary: { level: 15, points: 1200, kora: 15, savedAt: 1719000000000 },
              saveData: {
                version: 2,
                savedAt: 1719000000000,
                sections: { vitals: { level: 15 }, merit: { points: 1200, kora: 15 } },
              },
              updatedAt: 1719000000000,
            },
          }),
        };
      }
      cloudDoc = body.saveData;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          exists: true,
          uid: 'google-u4',
          summary: extractSaveSummary(cloudDoc),
          saveData: cloudDoc,
          updatedAt: cloudDoc.savedAt,
        }),
      };
    }
    throw new Error(`Unexpected: ${method} ${url}`);
  });

  ctx.save.set('vitals', { level: 20, exp: 0 });
  ctx.save.flush();
  const conflictSync = await cloud.syncNow();
  assert.equal(conflictSync.ok, false);
  assert.equal(cloud.getStatus(), 'conflict');

  const resLocal = await cloud.resolveConflict('local', { reload: false });
  assert.equal(resLocal.ok, true);
  assert.equal(cloud.getStatus(), 'synced');
  assert.equal(cloudDoc.sections.vitals.level, 20);
});

test('6. Offline resilience & community.js Authorization header integration', async (t) => {
  const { setFetch } = withMockEnv(t);

  let networkOnline = true;
  const communityHeaders = [];

  setFetch(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;

    if (url.endsWith('/api/community')) {
      communityHeaders.push(opts.headers || {});
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ ok: true, data: {} }),
      };
    }

    if (!networkOnline) {
      throw new Error('Network offline');
    }

    if (url.endsWith('/api/auth/google')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          sessionToken: 'tok-offline-test',
          expiresAt: Date.now() + 3600_000,
          user: { uid: 'google-u5', email: 'lobsang@example.com', displayName: 'Lobsang', photoURL: '' },
        }),
      };
    }
    if (url.endsWith('/api/save') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, exists: false, uid: 'google-u5', summary: null, saveData: null }),
      };
    }
    if (url.endsWith('/api/save') && method === 'POST') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          exists: true,
          uid: 'google-u5',
          summary: extractSaveSummary(body.saveData),
          saveData: body.saveData,
          updatedAt: body.saveData.savedAt,
        }),
      };
    }
    throw new Error(`Unexpected: ${method} ${url}`);
  });

  const bus = createBus();
  const ctx = { bus, state: { mode: 'play' }, i18n: { t: (k) => k } };
  createSave(ctx);
  const community = createCommunity(ctx, { autoSync: false });
  const cloud = createCloudSave(ctx);

  await cloud.signInWithGoogle({ devProfile: { email: 'lobsang@example.com', displayName: 'Lobsang' } });
  assert.equal(cloud.getStatus(), 'synced');
  assert.equal(community.getPilgrimName(), 'Lobsang');

  // Verify community requests attach Authorization Bearer token
  await community.syncFromServer();
  assert.ok(communityHeaders.length >= 1);
  assert.equal(communityHeaders[0].Authorization, 'Bearer tok-offline-test');

  // Go offline and attempt sync -> status becomes 'pending'
  networkOnline = false;
  ctx.save.set('vitals', { level: 7, exp: 10 });
  ctx.save.flush();
  const failedSync = await cloud.syncNow();
  assert.equal(failedSync.ok, false);
  assert.equal(cloud.getStatus(), 'pending');
  assert.equal(cloud.getState().dirtySinceLastSync, true);

  // Reconnect and sync -> status recovers to 'synced'
  networkOnline = true;
  const recoveredSync = await cloud.syncNow();
  assert.equal(recoveredSync.ok, true);
  assert.equal(cloud.getStatus(), 'synced');
  assert.equal(cloud.getState().dirtySinceLastSync, false);
  assert.equal(cloud.getState().cloudSummary.level, 7);
});
