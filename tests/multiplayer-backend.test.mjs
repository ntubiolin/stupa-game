/**
 * Persistent Community & Real-Time Multiplayer Backend Verification (`tests/multiplayer-backend.test.mjs`) — Issue #173
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

import { createMultiplayerStore } from '../server/store.js';
import { createApiMiddleware } from '../server/handler.js';
import { attachWebSocketServer, encodeWsFrame, decodeWsFrames } from '../server/ws.js';

function createMaskedClientFrame(obj, opcode = 0x01) {
  const payload = Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj), 'utf8');
  const maskKey = crypto.randomBytes(4);
  const maskedPayload = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) {
    maskedPayload[i] = payload[i] ^ maskKey[i & 3];
  }

  let header;
  if (payload.length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | payload.length;
  } else {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  }

  return Buffer.concat([header, maskKey, maskedPayload]);
}

test('1. Community persistence to disk across store restarts (lamps, stupas, rejoices, Samye 1008)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stupa-backend-test-'));
  const dbPath = path.join(tmpDir, 'stupa-backend.json');

  try {
    const store1 = createMultiplayerStore({ dbPath, inMemoryOnly: false });

    // Offer a butter lamp (with HTML characters that must be sanitized)
    store1.applyCommunityAction('lamp', {
      id: 'lamp-test-1',
      stationIdx: 1,
      lampIdx: 4,
      pilgrimName: '  蓮華行者<script>  ',
      tag: 'bodhicitta',
      message: '願以此燈照徹法界 <b>一切有情</b>',
      createdAt: 1715000000000,
    });

    // Rejoice both custom lamp and seeded lamp
    store1.applyCommunityAction('rejoiceLamp', { id: 'lamp-test-1' });
    store1.applyCommunityAction('rejoiceLamp', { id: 'seed-lamp-1' });

    // Build personal votive stupa
    store1.applyCommunityAction('stupa', {
      id: 'stupa-test-1',
      pilgrimName: '仁欽多傑',
      title: '雪域蓮華光明塔',
      message: '見塔生歡喜，速證無上道。',
      kora: 21,
      prostrations: 108,
      spec: { plinth: 'mandala', dome: 'gilded', spire: 'gold13', ornament: 'garuda' },
      createdAt: 1715000100000,
    });

    // Rejoice stupa
    store1.applyCommunityAction('rejoiceStupa', { id: 'stupa-test-1' });
    store1.applyCommunityAction('rejoiceStupa', { id: 'seed-stupa-1' });

    // Contribute to Samye 1,008 stupas
    store1.applyCommunityAction('samyeContribute', {
      id: 'samye-contrib-1',
      pilgrimName: '仁欽多傑',
      stupas: 12,
      kora: 54,
      prostrations: 216,
      message: '奉獻桑耶紅白黑綠四塔資糧',
    });

    assert.equal(fs.existsSync(dbPath), true, 'DB file should be written to disk');

    // Create a brand new store instance reading from the same dbPath
    const store2 = createMultiplayerStore({ dbPath, inMemoryOnly: false });
    const state = store2.getCommunityState();

    const savedLamp = state.lamps.find((l) => l.id === 'lamp-test-1');
    assert.ok(savedLamp, 'Custom lamp should persist across store reload');
    assert.equal(savedLamp.pilgrimName, '蓮華行者script');
    assert.equal(savedLamp.message, '願以此燈照徹法界 b一切有情/b');
    assert.equal(savedLamp.rejoiceCount, 2);
    assert.equal(savedLamp.burnBonusSec, 240);

    const rejoicedSeedLamp = state.lamps.find((l) => l.id === 'seed-lamp-1');
    assert.ok(rejoicedSeedLamp, 'Seeded lamp rejoice should be tracked on server');
    assert.equal(rejoicedSeedLamp.rejoiceCount, 29);

    const savedStupa = state.stupas.find((s) => s.id === 'stupa-test-1');
    assert.ok(savedStupa, 'Custom votive stupa should persist across store reload');
    assert.equal(savedStupa.title, '雪域蓮華光明塔');
    assert.equal(savedStupa.rejoiceCount, 2);
    assert.deepEqual(savedStupa.spec, {
      plinth: 'mandala',
      dome: 'gilded',
      spire: 'gold13',
      ornament: 'garuda',
    });

    assert.equal(state.samye.contributedStupas, 324 + 12);
    assert.equal(state.samye.totalKora, 1080 + 54);
    assert.equal(state.samye.totalProstrations, 4320 + 216);
    assert.equal(state.samye.contributors[0].pilgrimName, '仁欽多傑');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('2. Zone Sharding & Ambient Presence (auto-overflow >12 pilgrims to #2 shard, zoneCounts & events)', () => {
  const store = createMultiplayerStore({
    inMemoryOnly: true,
    shardCapacity: 12,
    presenceTtlMs: 12000,
  });

  const baseNow = 1715000000000;

  // Add 14 pilgrims to 'stupa' zone
  const results = [];
  for (let i = 1; i <= 14; i++) {
    const res = store.updatePresence({
      peerId: `pilgrim_${i}`,
      zone: 'stupa',
      pilgrim: {
        id: `pilgrim_${i}`,
        name: `行者_${i}`,
        level: i,
        x: i * 1.5,
        y: 0,
        z: -i * 1.2,
        action: i % 2 === 0 ? 'prostrate' : 'walk',
      },
      now: baseNow + i * 10,
    });
    results.push(res);
  }

  // First 12 pilgrims should be in stupa#1
  for (let i = 0; i < 12; i++) {
    assert.equal(results[i].shardId, 'stupa#1');
  }
  assert.equal(results[11].pilgrims.length, 12);

  // Pilgrim 13 and 14 should overflow into stupa#2
  assert.equal(results[12].shardId, 'stupa#2');
  assert.equal(results[13].shardId, 'stupa#2');
  assert.equal(results[13].pilgrims.length, 2);
  assert.equal(results[13].zoneCounts.stupa, 14);
  assert.equal(results[13].totalOnline, 14);

  // Move pilgrim_1 to 'wild' zone and emit a world combat event
  const wildRes = store.updatePresence({
    peerId: 'pilgrim_1',
    zone: 'wild',
    pilgrim: { id: 'pilgrim_1', name: '行者_1', x: 10, y: 0, z: 20, action: 'cast' },
    events: [
      {
        id: 'ev-wild-dmg-1',
        type: 'enemy:damage',
        payload: { enemyId: 'wild_wolf_1', amount: 45 },
        ts: baseNow + 500,
      },
    ],
    since: baseNow,
    now: baseNow + 500,
  });

  assert.equal(wildRes.zone, 'wild');
  assert.equal(wildRes.shardId, 'wild#1');
  assert.equal(wildRes.zoneCounts.stupa, 13);
  assert.equal(wildRes.zoneCounts.wild, 1);
  assert.equal(wildRes.totalOnline, 14);
  assert.equal(wildRes.events.length, 1);
  assert.equal(wildRes.events[0].type, 'enemy:damage');
});

test('3. Co-op Rooms & Public Matchmaking (isPublic, host migration on leave, dungeonState sync)', () => {
  const store = createMultiplayerStore({ inMemoryOnly: true, roomTtlMs: 15000 });
  const now = 1715000000000;

  // Host creates public room LOTUS-108
  const r1 = store.syncCoopRoom({
    room: 'lotus-108',
    isPublic: true,
    peerId: 'peer_host',
    member: { id: 'peer_host', name: '蓮師行者', zone: 'terma', level: 8 },
    dungeonState: { active: true, tier: 2, seed: 998877, floor: 3 },
    now,
  });

  assert.equal(r1.ok, true);
  assert.equal(r1.room, 'LOTUS-108');
  assert.equal(r1.isPublic, true);
  assert.equal(r1.hostId, 'peer_host');
  assert.equal(r1.publicRooms.length, 1);
  assert.equal(r1.publicRooms[0].room, 'LOTUS-108');
  assert.equal(r1.publicRooms[0].memberCount, 1);

  // Second player joins LOTUS-108
  const r2 = store.syncCoopRoom({
    room: 'LOTUS-108',
    peerId: 'peer_guest',
    member: { id: 'peer_guest', name: '金剛道友', zone: 'terma', level: 7 },
    now: now + 100,
  });

  assert.equal(r2.members.length, 2);
  assert.equal(r2.hostId, 'peer_host');
  assert.deepEqual(r2.dungeonState, { active: true, tier: 2, seed: 998877, floor: 3 });

  // Host leaves room -> hostId should migrate automatically to peer_guest
  const r3 = store.leaveCoopRoom({
    room: 'LOTUS-108',
    peerId: 'peer_host',
    now: now + 200,
  });

  assert.equal(r3.members.length, 1);
  assert.equal(r3.hostId, 'peer_guest');
  assert.equal(r3.members[0].id, 'peer_guest');
  assert.equal(r3.members[0].isHost, true);
});

test('4. Live HTTP API & RFC 6455 WebSocket Server end-to-end integration', async () => {
  const store = createMultiplayerStore({ inMemoryOnly: true, shardCapacity: 12 });
  const apiMiddleware = createApiMiddleware(store, null);
  const server = http.createServer((req, res) => {
    apiMiddleware(req, res);
  });
  const wsHub = attachWebSocketServer(server, store, '/ws/multiplayer');
  apiMiddleware.setWsHub(wsHub);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 4a. Verify GET /api/health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.status, 'healthy');

    // 4b. Connect two raw WebSocket clients to /ws/multiplayer
    const connectWsClient = (peerId, zone = 'stupa') =>
      new Promise((resolve, reject) => {
        const key = crypto.randomBytes(16).toString('base64');
        const req = http.request({
           host: '127.0.0.1',
          port,
          path: `/ws/multiplayer?peerId=${peerId}&zone=${zone}`,
          headers: {
            Connection: 'Upgrade',
            Upgrade: 'websocket',
            'Sec-WebSocket-Key': key,
            'Sec-WebSocket-Version': '13',
          },
        });

        req.on('upgrade', (res, socket, head) => {
          const messages = [];
          const waiters = [];
          let buf = head && head.length > 0 ? Buffer.from(head) : Buffer.alloc(0);

          const pushMsg = (parsed) => {
            for (let i = 0; i < waiters.length; i++) {
              if (waiters[i].predicate(parsed)) {
                const w = waiters.splice(i, 1)[0];
                w.resolve(parsed);
                return;
              }
            }
            messages.push(parsed);
          };

          socket.on('data', (chunk) => {
            buf = Buffer.concat([buf, chunk]);
            const { frames, remaining } = decodeWsFrames(buf);
            buf = remaining;
            for (const f of frames) {
              if (f.opcode === 0x01) {
                try {
                  pushMsg(JSON.parse(f.payload.toString('utf8')));
                } catch {
                  /* ignore */
                }
              }
            }
          });

          const waitFor = (predicate, timeoutMs = 2000) => {
            const idx = messages.findIndex(predicate);
            if (idx >= 0) {
              return Promise.resolve(messages.splice(idx, 1)[0]);
            }
            return new Promise((resWait, rejWait) => {
              const timer = setTimeout(() => {
                rejWait(new Error('Timed out waiting for WebSocket message'));
              }, timeoutMs);
              waiters.push({
                predicate,
                resolve: (val) => {
                  clearTimeout(timer);
                  resWait(val);
                },
              });
            });
          };

          const send = (obj) => {
            socket.write(createMaskedClientFrame(obj, 0x01));
          };

          resolve({ socket, send, waitFor, messages });
        });

        req.on('error', reject);
        req.end();
      });

    const clientA = await connectWsClient('ws_peer_a', 'stupa');
    const clientB = await connectWsClient('ws_peer_b', 'stupa');

    clientA.send({
      type: 'hello',
      peerId: 'ws_peer_a',
      zone: 'stupa',
      pilgrim: { id: 'ws_peer_a', name: '行者甲', x: 3, y: 0, z: 4 },
    });
    const initA = await clientA.waitFor((m) => m.type === 'presence:state');
    assert.equal(initA.shardId, 'stupa#1');

    clientB.send({
      type: 'hello',
      peerId: 'ws_peer_b',
      zone: 'stupa',
      pilgrim: { id: 'ws_peer_b', name: '行者乙', x: -2, y: 0, z: 5 },
    });

    // Client A should receive presence:diff when Client B joins shard stupa#1
    const diffOnA = await clientA.waitFor(
      (m) => m.type === 'presence:diff' && m.peerId === 'ws_peer_b',
    );
    assert.equal(diffOnA.shardId, 'stupa#1');
    assert.equal(diffOnA.totalOnline, 2);

    // 4c. POST /api/community should broadcast community:event over WebSocket to connected clients
    const postCommRes = await fetch(`${baseUrl}/api/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'lamp',
        payload: {
          id: 'lamp-live-ws-1',
          pilgrimName: '供燈行者',
          tag: 'wisdom',
          message: '願智慧光常明',
        },
      }),
    });
    assert.equal(postCommRes.status, 200);
    const postCommJson = await postCommRes.json();
    assert.equal(postCommJson.ok, true);
    assert.equal(postCommJson.lamps[0].id, 'lamp-live-ws-1');
    assert.equal(postCommJson.data.lamps[0].id, 'lamp-live-ws-1');

    const commEventOnB = await clientB.waitFor(
      (m) => m.type === 'community:event' && m.action === 'lamp',
    );
    assert.equal(commEventOnB.payload.id, 'lamp-live-ws-1');

    clientA.socket.destroy();
    clientB.socket.destroy();
  } finally {
    wsHub.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
