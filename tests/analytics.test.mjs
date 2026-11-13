import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createAnalyticsStore, taipeiDay } from '../server/analyticsStore.js';
import { createSave, INSTALLATION_STORAGE_KEY } from '../src/systems/save.js';
import { createAnalytics } from '../src/systems/analytics.js';
import { createBus } from '../src/core/events.js';
import { createAuthManager } from '../server/auth.js';
import { createMultiplayerStore } from '../server/store.js';
import { createApiMiddleware } from '../server/handler.js';

async function callApi(handler, url, body = {}, headers = {}) {
  let payload = null;
  const responseHeaders = {};
  const req = { method: 'POST', url, body, headers, socket: { remoteAddress: '127.0.0.1' } };
  const res = {
    statusCode: 200,
    setHeader: (key, value) => { responseHeaders[key] = value; },
    end: (raw) => { payload = raw ? JSON.parse(raw) : null; },
  };
  await handler(req, res);
  return { status: res.statusCode, body: payload, headers: responseHeaders };
}

test('Taipei calendar day rolls over at local midnight', () => {
  assert.equal(taipeiDay(Date.parse('2026-11-12T15:59:59.999Z')), '2026-11-12');
  assert.equal(taipeiDay(Date.parse('2026-11-12T16:00:00.000Z')), '2026-11-13');
});

test('daily players deduplicate retries and merge a same-day guest into the signed-in player', () => {
  const analytics = createAnalyticsStore({ inMemoryOnly: true });
  const now = Date.parse('2026-11-13T04:00:00Z');
  const visitorId = 'visitor_abcdefghijklmnop';

  assert.equal(analytics.recordGameplay({ visitorId, mode: 'adventure', now }).ok, true);
  analytics.recordGameplay({ visitorId, mode: 'story', now: now + 1000 });
  assert.equal(analytics.getSummary('2026-11-13').dau, 1);

  analytics.recordGameplay({ visitorId, uid: 'google-1', authenticated: true, now: now + 2000 });
  analytics.recordGameplay({ visitorId: 'visitor_second_browser', uid: 'google-1', authenticated: true, now: now + 3000 });
  analytics.recordGameplay({ visitorId, now: now + 4000 }); // stale signed-out tab resolves through alias
  assert.equal(analytics.getSummary('2026-11-13').dau, 1);

  analytics.recordGameplay({ visitorId, uid: 'google-2', authenticated: true, now: now + 5000 });
  analytics.recordGameplay({ visitorId, now: now + 6000 });
  assert.equal(analytics.getSummary('2026-11-13').dau, 2, 'switching accounts counts both accounts');

  analytics.recordGameplay({ visitorId, now: Date.parse('2026-11-13T16:00:00Z') });
  assert.equal(analytics.getSummary('2026-11-14').dau, 1);
});

test('Google users are unique, dev-style activity remains guest activity, and SQLite survives restart', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stupa-analytics-'));
  const dbPath = path.join(dir, 'analytics.sqlite');
  try {
    const first = createAnalyticsStore({ dbPath });
    first.recordGoogleSignIn('google-1', 1000);
    first.recordGoogleSignIn('google-1', 2000);
    first.recordGoogleSignIn('google-2', 3000);
    first.recordGameplay({ visitorId: 'visitor_dev_account_1', uid: 'dev-1', authenticated: false, now: Date.parse('2026-11-13T00:00:00Z') });
    assert.equal(first.getSummary('2026-11-13').googleUsers, 2);
    first.close();

    const reopened = createAnalyticsStore({ dbPath });
    assert.deepEqual(reopened.getSummary('2026-11-13').googleUsers, 2);
    assert.equal(reopened.getSummary('2026-11-13').dau, 1);
    assert.match(reopened.getSummary().collectionSince, /^\d{4}-\d{2}-\d{2}T/);
    reopened.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('installation ID is stable outside save export/reset and client reports only after entry', async (t) => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  const storage = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
  });
  const requests = [];
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (url, init) => {
      requests.push({ url, init, body: JSON.parse(init.body) });
      return { ok: true, json: async () => ({ ok: true, day: '2026-11-13' }) };
    },
  });
  t.after(() => {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch);
    else delete globalThis.fetch;
  });

  const bus = createBus();
  const ctx = { bus, cloudSave: { getSessionToken: () => '' } };
  createSave(ctx);
  const installationId = ctx.save.getInstallationId();
  const analytics = createAnalytics(ctx, { mode: 'adventure', apiBase: 'https://example.test' });
  await Promise.resolve();
  assert.equal(requests.length, 0);

  analytics.enterGame();
  assert.equal(await analytics.report({ force: true }), false, 'parallel report is suppressed');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.visitorId, installationId);
  assert.equal(requests[0].body.mode, 'adventure');

  ctx.save.reset();
  assert.equal(ctx.save.getInstallationId(), installationId);
  assert.equal(storage.get(INSTALLATION_STORAGE_KEY), installationId);
  assert.equal(ctx.save.exportString().includes(installationId), false);
});

test('account switch during an in-flight report retries with the new session', async (t) => {
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  let resolveFirst;
  const firstResponse = new Promise((resolve) => { resolveFirst = resolve; });
  const authorizations = [];
  let sessionToken = 'session-a';
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (_url, init) => {
      authorizations.push(init.headers.Authorization);
      if (authorizations.length === 1) return firstResponse;
      return { ok: true, json: async () => ({ ok: true, day: taipeiDay() }) };
    },
  });
  t.after(() => {
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch);
    else delete globalThis.fetch;
  });

  const bus = createBus();
  const ctx = {
    bus,
    save: { getInstallationIdAsync: async () => 'visitor_account_switch_1' },
    cloudSave: { getSessionToken: () => sessionToken },
  };
  const analytics = createAnalytics(ctx, { mode: 'adventure', apiBase: 'https://example.test' });
  analytics.enterGame();
  await Promise.resolve();
  assert.deepEqual(authorizations, ['Bearer session-a']);

  sessionToken = 'session-b';
  bus.emit('cloudSave:signedIn', {}); // Suppressed while A is still in flight.
  assert.equal(authorizations.length, 1);
  resolveFirst({ ok: true, json: async () => ({ ok: true, day: taipeiDay() }) });
  await new Promise((resolve) => setTimeout(resolve, 0));

  analytics.update(30);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(authorizations, ['Bearer session-a', 'Bearer session-b']);
});

test('HTTP endpoint counts verified Google exchange and merges authenticated gameplay', async () => {
  const baseAuth = createAuthManager({ secret: 'analytics-http-test', allowDevAuth: true });
  const verifiedUser = {
    uid: 'google-http-1', email: 'player@example.com', displayName: 'Player', photoURL: '',
    provider: 'google', authType: 'google',
  };
  const auth = {
    ...baseAuth,
    authenticateGoogle: async () => ({
      ok: true,
      user: verifiedUser,
      sessionToken: baseAuth.issueSessionToken(verifiedUser),
      expiresAt: Date.now() + 60_000,
    }),
  };
  const store = createMultiplayerStore({ inMemoryOnly: true, auth });
  const handler = createApiMiddleware(store);

  const login = await callApi(handler, '/api/auth/google', { idToken: 'verified-by-test-auth' });
  assert.equal(login.status, 200);
  assert.equal(store.analytics.getSummary().googleUsers, 1);

  await callApi(handler, '/api/analytics/play', {
    visitorId: 'visitor_http_endpoint_1', mode: 'adventure',
  });
  const played = await callApi(handler, '/api/analytics/play', {
    visitorId: 'visitor_http_endpoint_1', mode: 'story',
  }, { authorization: `Bearer ${login.body.sessionToken}` });
  assert.equal(played.status, 200);
  assert.equal(store.analytics.getSummary(played.body.day).dau, 1);
  store.close();
});

test('JSON cloud-save fallback keeps analytics in a sibling SQLite database', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stupa-analytics-json-'));
  try {
    const store = createMultiplayerStore({
      dbPath: path.join(dir, 'community.json'),
      saveDbPath: path.join(dir, 'saves.json'),
      inMemoryOnly: false,
    });
    assert.equal(store.saves.engine, 'json');
    assert.equal(store.analytics.engine, 'sqlite');
    assert.equal(store.analytics.dbPath, path.join(dir, 'stupa-analytics.sqlite'));
    store.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
