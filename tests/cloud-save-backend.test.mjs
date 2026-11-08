/**
 * Google Authentication & SQLite WAL Cloud Save Backend Verification (`tests/cloud-save-backend.test.mjs`) — Issue #224
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

import {
  verifyGoogleIdToken,
  issueSessionToken,
  verifySessionToken,
  extractAuthUser,
  createAuthManager,
  base64UrlEncode,
} from '../server/auth.js';
import { createSaveStore, MAX_SAVE_BYTES } from '../server/saveStore.js';
import { createMultiplayerStore } from '../server/store.js';
import { createApiMiddleware } from '../server/handler.js';

function signRsaJwt(header, payload, privateKey) {
  const h = base64UrlEncode(header);
  const p = base64UrlEncode(payload);
  const signingInput = Buffer.from(`${h}.${p}`, 'utf8');
  const sig = crypto.sign('RSA-SHA256', signingInput, privateKey);
  return `${h}.${p}.${base64UrlEncode(sig)}`;
}

test('1. Google RS256 ID Token verification (real RSA-2048 JWK), Dev Auth, and HMAC Session Token lifecycle', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const publicJwk = {
    ...publicKey.export({ format: 'jwk' }),
    kid: 'test-google-kid-2026',
    alg: 'RS256',
    use: 'sig',
  };

  const now = 1715000000000;
  const nowSec = Math.floor(now / 1000);
  const clientId = 'stupa-test-client.apps.googleusercontent.com';

  // 1a. Valid RS256 Google ID Token verified via JWKS fetcher
  let jwksFetchCount = 0;
  const jwksFetcher = async () => {
    jwksFetchCount += 1;
    return { keys: [publicJwk] };
  };

  const validJwt = signRsaJwt(
    { alg: 'RS256', typ: 'JWT', kid: 'test-google-kid-2026' },
    {
      iss: 'https://accounts.google.com',
      aud: clientId,
      sub: 'google-sub-108',
      email: 'tenzin.gyatso@example.com',
      name: '丹增嘉措 <script>',
      picture: 'https://lh3.googleusercontent.com/a/tenzin',
      iat: nowSec - 60,
      exp: nowSec + 3600,
    },
    privateKey,
  );

  const user = await verifyGoogleIdToken(validJwt, {
    googleClientId: clientId,
    jwksFetcher,
    now,
    allowDevAuth: false,
  });

  assert.ok(user, 'RS256 Google ID token should verify against JWK');
  assert.equal(user.uid, 'google-sub-108');
  assert.equal(user.email, 'tenzin.gyatso@example.com');
  assert.equal(user.displayName, '丹增嘉措 script');
  assert.equal(user.photoURL, 'https://lh3.googleusercontent.com/a/tenzin');
  assert.equal(user.provider, 'google');
  assert.equal(jwksFetchCount, 1);

  // Second verification within 1-hour TTL should use cached JWKS without re-fetching
  const cachedUser = await verifyGoogleIdToken(validJwt, {
    googleClientId: clientId,
    jwksFetcher,
    now: now + 60000,
    allowDevAuth: false,
  });
  assert.equal(cachedUser.uid, 'google-sub-108');
  assert.equal(jwksFetchCount, 1, 'JWKS should be served from 1-hour cache');

  // 1b. Reject tampered signature, wrong audience, wrong issuer, and expired token
  const tamperedJwt = `${validJwt.slice(0, -4)}AAAA`;
  assert.equal(
    await verifyGoogleIdToken(tamperedJwt, {
      googleClientId: clientId,
      publicKeys: { keys: [publicJwk] },
      now,
    }),
    null,
  );

  assert.equal(
    await verifyGoogleIdToken(validJwt, {
      googleClientId: 'wrong-client-id.apps.googleusercontent.com',
      publicKeys: { keys: [publicJwk] },
      now,
    }),
    null,
  );

  const expiredJwt = signRsaJwt(
    { alg: 'RS256', typ: 'JWT', kid: 'test-google-kid-2026' },
    {
      iss: 'accounts.google.com',
      aud: clientId,
      sub: 'google-sub-108',
      email: 'tenzin@example.com',
      exp: nowSec - 120,
    },
    privateKey,
  );
  assert.equal(
    await verifyGoogleIdToken(expiredJwt, {
      googleClientId: clientId,
      publicKeys: { keys: [publicJwk] },
      now,
    }),
    null,
  );

  // 1c. Dev authentication (`dev:` token & `devProfile` object) when allowDevAuth is enabled
  const devUser1 = await verifyGoogleIdToken(
    'dev:pilgrim_dev_1:pema@stupa.local:蓮華行者',
    { allowDevAuth: true, now },
  );
  assert.equal(devUser1.uid, 'pilgrim_dev_1');
  assert.equal(devUser1.email, 'pema@stupa.local');
  assert.equal(devUser1.displayName, '蓮華行者');

  // Reject dev token when allowDevAuth is false
  assert.equal(
    await verifyGoogleIdToken('dev:pilgrim_dev_1:pema@stupa.local:蓮華行者', {
      allowDevAuth: false,
      now,
    }),
    null,
  );

  // 1d. HMAC-SHA256 Session Token issuance, verification, header extraction, and expiration
  const authManager = createAuthManager({
    secret: 'unit-test-hmac-secret-key-224',
    ttlMs: 10000,
  });

  const sessionToken = issueSessionToken(user, {
    secret: 'unit-test-hmac-secret-key-224',
    now,
    ttlMs: 10000,
  });

  const verifiedSession = verifySessionToken(sessionToken, {
    secret: 'unit-test-hmac-secret-key-224',
    now: now + 5000,
  });
  assert.ok(verifiedSession);
  assert.equal(verifiedSession.uid, 'google-sub-108');
  assert.equal(verifiedSession.exp, now + 10000);

  // Expired session token returns null
  assert.equal(
    verifySessionToken(sessionToken, {
      secret: 'unit-test-hmac-secret-key-224',
      now: now + 15000,
    }),
    null,
  );

  // Wrong secret returns null
  assert.equal(
    verifySessionToken(sessionToken, {
      secret: 'wrong-secret',
      now,
    }),
    null,
  );

  // extractAuthUser reads Authorization: Bearer <token>
  const reqMock = {
    headers: {
      authorization: `Bearer ${authManager.issueSessionToken(user)}`,
    },
  };
  const extracted = extractAuthUser(reqMock, authManager);
  assert.ok(extracted);
  assert.equal(extracted.uid, 'google-sub-108');
  assert.equal(extracted.email, 'tenzin.gyatso@example.com');
});

test('2. SQLite WAL persistence across store restarts and HTTP /api/save CRUD lifecycle', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stupa-sqlite-save-'));
  const saveDbPath = path.join(tmpDir, 'stupa-saves.sqlite');
  const dbPath = path.join(tmpDir, 'stupa-backend.json');

  try {
    const store1 = createMultiplayerStore({
      dbPath,
      saveDbPath,
      inMemoryOnly: false,
      authOptions: {
        secret: 'test-sqlite-secret',
        allowDevAuth: true,
      },
    });

    assert.equal(store1.saves.engine, 'sqlite', 'Should use Node 22 built-in SQLite engine');
    assert.equal(fs.existsSync(saveDbPath), true, 'SQLite file should exist on disk');

    const api1 = createApiMiddleware(store1, null);
    const server1 = http.createServer((req, res) => api1(req, res));
    await new Promise((resolve) => server1.listen(0, '127.0.0.1', resolve));
    const port1 = server1.address().port;
    const baseUrl1 = `http://127.0.0.1:${port1}`;

    let sessionToken = '';
    try {
      // 2a. Authenticate via POST /api/auth/google
      const authRes = await fetch(`${baseUrl1}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devProfile: {
            uid: 'google_pilgrim_108',
            email: 'pilgrim108@stupa.org',
            displayName: '雪域行者',
            photoURL: 'https://example.com/avatar.png',
          },
        }),
      });
      assert.equal(authRes.status, 200);
      const authJson = await authRes.json();
      assert.equal(authJson.ok, true);
      assert.equal(authJson.user.uid, 'google_pilgrim_108');
      assert.ok(authJson.sessionToken);
      sessionToken = authJson.sessionToken;

      // 2b. Verify GET /api/auth/session
      const sessRes = await fetch(`${baseUrl1}/api/auth/session`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const sessJson = await sessRes.json();
      assert.equal(sessJson.authenticated, true);
      assert.equal(sessJson.user.displayName, '雪域行者');

      // 2c. Initial GET /api/save returns exists: false
      const initGetRes = await fetch(`${baseUrl1}/api/save`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      assert.equal(initGetRes.status, 200);
      const initGetJson = await initGetRes.json();
      assert.equal(initGetJson.ok, true);
      assert.equal(initGetJson.exists, false);

      // 2d. POST /api/save persists full v2 saveData
      const postRes = await fetch(`${baseUrl1}/api/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          saveData: {
            version: 2,
            savedAt: 1715000100000,
            sections: {
              merit: { points: 540, kora: 12, prostrations: 108 },
              vitals: { level: 7, exp: 350, hp: 160, mp: 90 },
              quests: { active: {}, done: ['q_lamp', 'q_kora', 'q_prostrate'] },
              story: {
                beat: 'yarlung_arrival',
                journey: { activeChapterId: 'ch3_yarlung' },
              },
            },
          },
        }),
      });
      assert.equal(postRes.status, 200);
      const postJson = await postRes.json();
      assert.equal(postJson.ok, true);
      assert.equal(postJson.exists, true);
      assert.equal(postJson.summary.level, 7);
      assert.equal(postJson.summary.points, 540);
      assert.equal(postJson.summary.kora, 12);
      assert.equal(postJson.summary.questsDone, 3);
      assert.equal(postJson.summary.activeChapterId, 'ch3_yarlung');
    } finally {
      await new Promise((resolve) => server1.close(resolve));
      store1.close();
    }

    // 2e. Reopen SQLite store from disk and verify data survived restart
    const store2 = createMultiplayerStore({
      dbPath,
      saveDbPath,
      inMemoryOnly: false,
      authOptions: {
        secret: 'test-sqlite-secret',
        allowDevAuth: true,
      },
    });
    const api2 = createApiMiddleware(store2, null);
    const server2 = http.createServer((req, res) => api2(req, res));
    await new Promise((resolve) => server2.listen(0, '127.0.0.1', resolve));
    const port2 = server2.address().port;
    const baseUrl2 = `http://127.0.0.1:${port2}`;

    try {
      const getRes = await fetch(`${baseUrl2}/api/save`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      assert.equal(getRes.status, 200);
      const getJson = await getRes.json();
      assert.equal(getJson.ok, true);
      assert.equal(getJson.exists, true);
      assert.equal(getJson.summary.level, 7);
      assert.equal(getJson.saveData.sections.merit.points, 540);
      assert.equal(getJson.saveData.sections.story.journey.activeChapterId, 'ch3_yarlung');

      // 2f. DELETE /api/save removes cloud save
      const delRes = await fetch(`${baseUrl2}/api/save`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      assert.equal(delRes.status, 200);
      const delJson = await delRes.json();
      assert.equal(delJson.ok, true);
      assert.equal(delJson.deleted, true);

      const afterDelRes = await fetch(`${baseUrl2}/api/save`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const afterDelJson = await afterDelRes.json();
      assert.equal(afterDelJson.exists, false);
    } finally {
      await new Promise((resolve) => server2.close(resolve));
      store2.close();
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('3. Orthogonal section merging: ?mode=story and Adventure updates never clobber each other', async () => {
  const store = createMultiplayerStore({
    inMemoryOnly: true,
    authOptions: { secret: 'merge-test-secret', allowDevAuth: true },
  });
  const api = createApiMiddleware(store, null);
  const server = http.createServer((req, res) => api(req, res));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const token = store.auth.issueSessionToken({
      uid: 'merge_pilgrim_1',
      email: 'merge@stupa.org',
      displayName: '雙軌行者',
    });

    // Step 1: Adventure mode saves vitals, inventory, merit, and initial story
    const advRes1 = await fetch(`${baseUrl}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        saveData: {
          version: 2,
          savedAt: 1715000100000,
          sections: {
            vitals: { level: 10, exp: 900, hp: 220 },
            inventory: { items: { butter_tea: 5, tsampa: 3 } },
            merit: { points: 1080, kora: 21 },
            story: { beat: 'prologue', journey: { activeChapterId: 'ch1_boudha' } },
          },
        },
      }),
    });
    const advJson1 = await advRes1.json();
    assert.equal(advJson1.ok, true);

    // Step 2: ?mode=story client sends updated `story` AND a blank/default `vitals` in its local payload;
    // Because `?mode=story` restricts writableSections to ['story'], `vitals` & `inventory` must NOT be overwritten!
    const storyRes = await fetch(`${baseUrl}/api/save?mode=story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        baseSavedAt: advJson1.updatedAt,
        saveData: {
          version: 2,
          savedAt: 1715000200000,
          sections: {
            vitals: { level: 1, exp: 0, hp: 100 }, // Should be ignored in ?mode=story
            story: {
              beat: 'samye_debate_won',
              journey: { activeChapterId: 'ch5_samye', unlockedChapters: ['ch1', 'ch5'] },
            },
          },
        },
      }),
    });
    assert.equal(storyRes.status, 200);
    const storyJson = await storyRes.json();
    assert.equal(storyJson.ok, true);
    assert.equal(storyJson.saveData.sections.vitals.level, 10, 'Adventure vitals must remain intact');
    assert.equal(storyJson.saveData.sections.inventory.items.butter_tea, 5, 'Adventure inventory must remain intact');
    assert.equal(storyJson.saveData.sections.story.journey.activeChapterId, 'ch5_samye', 'Story section must update');

    // Step 3: Adventure client (which still has baseSavedAt from Step 1!) updates vitals & merit with mode='adventure'
    // Because Adventure did not change since Step 1, it must NOT conflict with Step 2's story update and must preserve ch5_samye!
    const advRes2 = await fetch(`${baseUrl}/api/save?mode=adventure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        baseSavedAt: advJson1.updatedAt,
        saveData: {
          version: 2,
          savedAt: 1715000300000,
          sections: {
            vitals: { level: 12, exp: 1400, hp: 260 },
            merit: { points: 1500, kora: 28 },
            story: { beat: 'prologue', journey: { activeChapterId: 'ch1_boudha' } }, // Stale story ignored in mode=adventure
          },
        },
      }),
    });
    assert.equal(advRes2.status, 200);
    const advJson2 = await advRes2.json();
    assert.equal(advJson2.ok, true);
    assert.equal(advJson2.saveData.sections.vitals.level, 12);
    assert.equal(advJson2.saveData.sections.merit.points, 1500);
    assert.equal(
      advJson2.saveData.sections.story.journey.activeChapterId,
      'ch5_samye',
      'Story progress from ?mode=story must remain intact after Adventure save',
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  }
});

test('4. Cross-device conflict detection (409 save-conflict on stale baseSavedAt, resolved by force: true)', async () => {
  const saveStore = createSaveStore({ inMemoryOnly: true });
  const uid = 'conflict_pilgrim_1';

  // Device A initial save at t = 1715000100000
  const r1 = saveStore.putSave({
    uid,
    profile: { displayName: 'Device A' },
    saveData: {
      version: 2,
      savedAt: 1715000100000,
      sections: {
        vitals: { level: 5, exp: 200 },
        merit: { points: 300, kora: 5 },
      },
    },
  });
  assert.equal(r1.ok, true);
  const initialSyncedTs = r1.updatedAt;

  // Device B (synced at initialSyncedTs) advances to level 9 and saves first
  const r2 = saveStore.putSave({
    uid,
    profile: { displayName: 'Device B' },
    baseSavedAt: initialSyncedTs,
    saveData: {
      version: 2,
      savedAt: 1715000200000,
      sections: {
        vitals: { level: 9, exp: 800 },
        merit: { points: 900, kora: 18 },
      },
    },
  });
  assert.equal(r2.ok, true);

  // Device A (still holding stale baseSavedAt = initialSyncedTs) tries to save level 6 without force
  const conflictRes = saveStore.putSave({
    uid,
    profile: { displayName: 'Device A' },
    baseSavedAt: initialSyncedTs,
    saveData: {
      version: 2,
      savedAt: 1715000150000,
      sections: {
        vitals: { level: 6, exp: 250 },
        merit: { points: 350, kora: 6 },
      },
    },
  });

  assert.equal(conflictRes.ok, false);
  assert.equal(conflictRes.status, 409);
  assert.equal(conflictRes.error, 'save-conflict');
  assert.ok(conflictRes.cloud, '409 response must include cloud save snapshot for comparison');
  assert.equal(conflictRes.cloud.summary.level, 9);
  assert.equal(conflictRes.cloud.saveData.sections.merit.points, 900);

  // Device A user chooses to overwrite cloud save with force: true
  const forcedRes = saveStore.putSave({
    uid,
    profile: { displayName: 'Device A' },
    baseSavedAt: initialSyncedTs,
    force: true,
    saveData: {
      version: 2,
      savedAt: 1715000300000,
      sections: {
        vitals: { level: 6, exp: 250 },
        merit: { points: 350, kora: 6 },
      },
    },
  });

  assert.equal(forcedRes.ok, true);
  assert.equal(forcedRes.summary.level, 6);
  assert.equal(forcedRes.saveData.sections.merit.points, 350);
  saveStore.close();
});

test('5. Security guardrails: 401 unauthorized, 413 >64KB payload, prototype pollution stripping, and votive stupa ownerUid protection', async () => {
  const store = createMultiplayerStore({
    inMemoryOnly: true,
    authOptions: { secret: 'sec-test-secret', allowDevAuth: true },
  });
  const api = createApiMiddleware(store, null);
  const server = http.createServer((req, res) => api(req, res));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 5a. Unauthenticated requests to /api/save must return 401
    const unauthGet = await fetch(`${baseUrl}/api/save`);
    assert.equal(unauthGet.status, 401);

    const unauthPost = await fetch(`${baseUrl}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveData: { version: 2, sections: {} } }),
    });
    assert.equal(unauthPost.status, 401);

    const tokenA = store.auth.issueSessionToken({
      uid: 'user_alpha',
      email: 'alpha@stupa.org',
      displayName: '行者甲',
    });
    const tokenB = store.auth.issueSessionToken({
      uid: 'user_beta',
      email: 'beta@stupa.org',
      displayName: '行者乙',
    });

    // 5b. Oversized saveData (> 64 KB) returns 413 save-too-large
    const hugeSave = {
      version: 2,
      savedAt: Date.now(),
      sections: {
        notes: { blob: '經'.repeat(MAX_SAVE_BYTES) },
      },
    };
    const tooLargeRes = await fetch(`${baseUrl}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ saveData: hugeSave }),
    });
    assert.equal(tooLargeRes.status, 413);

    // 5c. Prototype pollution keys (__proto__, constructor, prototype) are stripped
    const rawPollutedJson =
      '{"saveData":{"version":2,"sections":{"__proto__":{"polluted":true},"vitals":{"level":4,"constructor":{"bad":1}}}}}';
    const protoRes = await fetch(`${baseUrl}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: rawPollutedJson,
    });
    assert.equal(protoRes.status, 200);
    const protoJson = await protoRes.json();
    assert.equal( ({}).polluted, undefined );
    assert.equal(Object.prototype.hasOwnProperty.call(protoJson.saveData.sections, '__proto__'), false);
    assert.equal(
      Object.prototype.hasOwnProperty.call(protoJson.saveData.sections.vitals, 'constructor'),
      false,
    );

    // 5d. Authenticated POST /api/community tags stupa with ownerUid and prevents hijacking by another user
    const createStupaRes = await fetch(`${baseUrl}/api/community`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        action: 'stupa',
        payload: {
          id: 'stupa-alpha-owned',
          pilgrimName: '行者甲',
          title: '甲之蓮華塔',
          message: '清淨本然',
          kora: 10,
          prostrations: 108,
        },
      }),
    });
    const createStupaJson = await createStupaRes.json();
    const alphaStupa = createStupaJson.stupas.find((s) => s.id === 'stupa-alpha-owned');
    assert.ok(alphaStupa);
    assert.equal(alphaStupa.ownerUid, 'user_alpha');

    // User B attempts to overwrite User A's stupa id 'stupa-alpha-owned'
    const hijackRes = await fetch(`${baseUrl}/api/community`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        action: 'stupa',
        payload: {
          id: 'stupa-alpha-owned',
          pilgrimName: '駭客乙',
          title: '被篡改之塔',
          message: '篡改內容',
        },
      }),
    });
    const hijackJson = await hijackRes.json();
    const afterHijack = hijackJson.stupas.find((s) => s.id === 'stupa-alpha-owned');
    assert.equal(afterHijack.title, '甲之蓮華塔', 'Verified owner stupa must not be overwritten by another user');
    assert.equal(afterHijack.ownerUid, 'user_alpha');

    // User A updating their own stupa (even with a different client-generated id) updates their existing stupa
    const updateOwnRes = await fetch(`${baseUrl}/api/community`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        action: 'stupa',
        payload: {
          id: 'stupa-alpha-new-device-id',
          pilgrimName: '行者甲',
          title: '甲之圓滿光明塔',
          message: '跨裝置更新自塔',
          kora: 21,
          prostrations: 216,
        },
      }),
    });
    const updateOwnJson = await updateOwnRes.json();
    const alphaStupas = updateOwnJson.stupas.filter((s) => s.ownerUid === 'user_alpha');
    assert.equal(alphaStupas.length, 1, 'Same ownerUid should update their single personal stupa');
    assert.equal(alphaStupas[0].title, '甲之圓滿光明塔');
    assert.equal(alphaStupas[0].kora, 21);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  }
});
