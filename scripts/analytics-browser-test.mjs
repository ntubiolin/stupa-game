import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { adventureBrowserArgs, startAdventureWithInput } from './adventure-browser-start.mjs';

const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL && { channel: process.env.BROWSER_CHANNEL }),
  args: adventureBrowserArgs,
});
const events = [];
const errors = [];
const context = await browser.newContext({
  viewport: { width: 1000, height: 720 },
  deviceScaleFactor: 0.5,
  reducedMotion: 'reduce',
});

async function waitForEvents(count) {
  const deadline = Date.now() + 60000;
  while (events.length < count && Date.now() < deadline) await delay(100);
  assert(events.length >= count, `Expected ${count} gameplay requests, received ${events.length}`);
}

async function newPage() {
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  return page;
}

try {
  // Capture analytics without changing production statistics, even for a preview
  // build that points at the production backend. Block other backend mutations.
  await context.route('**/api/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/analytics/play' && request.method() === 'POST') {
      events.push(request.postDataJSON());
      await route.fulfill({ json: { ok: true, day: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date()) } });
      return;
    }
    await route.fulfill({ json: { ok: true, authenticated: false, totalOnline: 0, zoneCounts: {}, pilgrims: [], rooms: [] } });
  });
  await context.addInitScript(() => {
    sessionStorage.setItem('stupa.debug.unlocked', '1');
    const originalFetch = window.fetch;
    window.analyticsEntrySnapshots = [];
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : input?.url;
      if (url && new URL(url, location.href).pathname === '/api/analytics/play') {
        window.analyticsEntrySnapshots.push({
          mode: window.__stupa?.state?.mode,
          storyPhoneOpen: Boolean(document.querySelector('.story-phone[open]')),
          canvas: Boolean(document.querySelector('#app canvas')),
        });
      }
      return originalFetch.call(this, input, init);
    };
  });

  const page = await newPage();
  await page.goto(`${base}/?mode=home`);
  await page.locator('.mirror-launcher').waitFor();
  await delay(500);
  assert.equal(events.length, 0, 'Home launcher does not count as gameplay');

  await page.goto(`${base}/?mode=adventure`);
  await page.locator('#btn-begin').waitFor();
  await delay(500);
  assert.equal(events.length, 0, 'Adventure title does not count as gameplay');
  await startAdventureWithInput(page);
  await waitForEvents(1);
  const visitorId = events[0].visitorId;
  assert.equal(typeof visitorId, 'string');
  assert(visitorId.length > 0);
  assert.equal(events[0].mode, 'adventure');

  await page.reload();
  await page.locator('#btn-begin').waitFor();
  const beforeReloadEntry = events.length;
  await delay(500);
  assert.equal(events.length, beforeReloadEntry, 'Reloaded title stays excluded');
  await startAdventureWithInput(page);
  await waitForEvents(beforeReloadEntry + 1);
  assert.equal(events.at(-1).visitorId, visitorId, 'Reload retains browser identity');

  const second = await newPage();
  await second.goto(`${base}/?mode=adventure`);
  const beforeTabEntry = events.length;
  await startAdventureWithInput(second);
  await waitForEvents(beforeTabEntry + 1);
  assert.equal(events.at(-1).visitorId, visitorId, 'Another tab uses the same identity');
  await second.close();

  const beforeStoryEntry = events.length;
  await page.goto(`${base}/?mode=story`);
  await page.locator('.story-phone[open]').waitFor();
  await waitForEvents(beforeStoryEntry + 1);
  assert.equal(events.at(-1).mode, 'story');
  assert.equal(events.at(-1).visitorId, visitorId, 'Mode navigation retains browser identity');
  const storySnapshots = await page.evaluate(() => window.analyticsEntrySnapshots);
  assert(storySnapshots.length > 0);
  assert(storySnapshots.every(snapshot => snapshot.storyPhoneOpen && snapshot.canvas), 'Story request follows initial scene and prologue UI readiness');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(JSON.stringify({
    passed: ['home excluded', 'title excluded', 'real Adventure entry', 'reload identity', 'tab identity', 'Story ready entry', 'cross-mode identity'],
    gameplayRequests: events.length,
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
