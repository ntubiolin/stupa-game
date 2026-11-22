import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createMultiplayerServer } from '../server/index.js';

test('desktop Google auth handoff and tibetUnreal cloud save coexist with web sections', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stupa-desktop-auth-'));
  const { server, store } = createMultiplayerServer({
    storeOptions: { dbPath: path.join(tmpDir, 'stupa.sqlite') },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close?.();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const ticket = 'unreal_ticket_1234567890abcdef';
  const startRes = await fetch(`${base}/api/auth/desktop-start?ticket=${ticket}`);
  assert.equal(startRes.status, 200);
  const html = await startRes.text();
  assert.match(html, /蓮師足跡/);

  const pendingPoll = await (await fetch(`${base}/api/auth/desktop-poll?ticket=${ticket}`)).json();
  assert.equal(pendingPoll.ok, true);
  assert.equal(pendingPoll.status, 'pending');

  const authRes = await (
    await fetch(`${base}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devProfile: { email: 'pilgrim@example.com', name: '蓮師行者' } }),
    })
  ).json();
  assert.equal(authRes.ok, true);

  // Seed web story/vitals save first
  const webPut = await (
    await fetch(`${base}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authRes.sessionToken}`,
      },
      body: JSON.stringify({
        mode: 'merge',
        saveData: {
          version: 2,
          savedAt: Date.now(),
          sections: { vitals: { level: 5, exp: 120 } },
        },
      }),
    })
  ).json();
  assert.equal(webPut.ok, true);

  // Complete desktop handoff and poll once
  const completeRes = await (
    await fetch(`${base}/api/auth/desktop-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket,
        sessionToken: authRes.sessionToken,
        user: authRes.user,
      }),
    })
  ).json();
  assert.equal(completeRes.ok, true);

  const readyPoll = await (await fetch(`${base}/api/auth/desktop-poll?ticket=${ticket}`)).json();
  assert.equal(readyPoll.ok, true);
  assert.equal(readyPoll.status, 'complete');
  assert.equal(readyPoll.sessionToken, authRes.sessionToken);

  // Second poll after consumption must expire (one-time token exchange)
  const consumedPoll = await fetch(`${base}/api/auth/desktop-poll?ticket=${ticket}`);
  assert.equal(consumedPoll.status, 404);

  // Unreal client merges tibetUnreal without overwriting web vitals
  const unrealPut = await (
    await fetch(`${base}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${readyPoll.sessionToken}`,
      },
      body: JSON.stringify({
        mode: 'merge',
        writableSections: ['tibetUnreal'],
        saveData: {
          version: 2,
          savedAt: Date.now(),
          sections: {
            tibetUnreal: { map: 'samye', bComplete: true, steps: { stupa: 5, samye: 8 } },
          },
        },
      }),
    })
  ).json();
  assert.equal(unrealPut.ok, true);

  const combined = await (
    await fetch(`${base}/api/save`, {
      headers: { Authorization: `Bearer ${readyPoll.sessionToken}` },
    })
  ).json();
  assert.equal(combined.ok, true);
  assert.equal(combined.saveData.sections.vitals.level, 5);
  assert.equal(combined.saveData.sections.tibetUnreal.map, 'samye');
  assert.equal(combined.saveData.sections.tibetUnreal.bComplete, true);
});
