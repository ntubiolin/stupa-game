import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { STORY_BEATS } from '../src/data/story/beats.js';
import { adventureBrowserArgs } from './adventure-browser-start.mjs';

const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.STORY_ARTIFACTS || 'artifacts/story-media';
const key = 'stupa.save.v2';
const assets = '/story/';
const linuxCI = Boolean(process.env.CI) && process.platform === 'linux';
const deviceScaleFactor = linuxCI ? 0.25 : process.env.CI ? 0.5 : 1;
const browser = await chromium.launch({
  ...(process.env.BROWSER_CHANNEL && { channel: process.env.BROWSER_CHANNEL }),
  args: [
    ...adventureBrowserArgs,
    ...(linuxCI ? ['--disable-accelerated-video-decode'] : []),
  ],
});
await mkdir(output, { recursive: true });
const report = { browser: browser.version(), deviceScaleFactor, linuxSoftwareProfile: linuxCI, scenarios: [], errors: [] };
const mediaTraffic = new Map();

async function openScenario(name, { mobile = false, reduced = false, activeChapter = false, abort } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1152, height: 760 },
    deviceScaleFactor,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    hasTouch: mobile,
    isMobile: mobile,
  });
  const beat = activeChapter ? 'complete' : 'restoration';
  const fixture = {
    version: 2, savedAt: 1,
    sections: {
      settings: { lang: 'en', muted: true },
      adventureSentinel: { equipment: 'keep' },
      story: {
        version: 2, beat, elapsedSeconds: 0,
        evidence: STORY_BEATS.slice(0, STORY_BEATS.findIndex(item => item.id === beat))
          .flatMap(item => item.evidence ?? []),
        choices: {}, flags: {}, clipsSeen: [],
        journey: activeChapter ? {
          activeChapterId: 'pharping',
          chapters: { pharping: { checkpointId: 'spring2', completed: false, choices: {}, flags: {} } },
        } : { activeChapterId: null, chapters: {} },
      },
    },
  };
  await context.addInitScript(({ key, fixture }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
    window.mediaRegressionEvents = [];
    for (const type of ['error', 'stalled', 'waiting', 'playing', 'pause', 'seeked']) {
      document.addEventListener(type, event => {
        const node = event.target;
        if (!(node instanceof HTMLVideoElement)) return;
        window.mediaRegressionEvents.push({
          type, src: node.currentSrc, paused: node.paused, time: node.currentTime,
          readyState: node.readyState, networkState: node.networkState,
        });
      }, true);
    }
  }, { key, fixture });
  if (abort) await context.route(abort, route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const requested = new Set();
  const traffic = [];
  mediaTraffic.set(name, traffic);
  const started = performance.now();
  const record = (url, detail) => {
    const path = new URL(url).pathname;
    if (path.endsWith('.mp4')) traffic.push({ path, ms: Math.round(performance.now() - started), ...detail });
  };
  page.on('response', response => record(response.url(), { status: response.status(),
    contentType: response.headers()['content-type'] }));
  page.on('requestfailed', request => record(request.url(), { failure: request.failure()?.errorText }));
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith(assets)) requested.add(pathname);
    record(request.url(), { request: true });
  });
  page.on('pageerror', error => report.errors.push({ name, error: error.message }));
  await page.goto(`${base}/?mode=story&debug=1`);
  await page.waitForFunction(() => window.__stupa?.storyRuntime);
  if (process.env.CI) await page.evaluate(() => window.__stupa.storyArt.setQuality('low'));
  const dialog = page.locator('.story-documentary');
  const frame = dialog.locator('.story-documentary-still');
  const caption = dialog.locator('.story-documentary-caption');
  const action = id => dialog.locator(`[data-action="${id}"]`);
  return {
    name, context, page, dialog, frame, caption, requested, action,
    click: locator => mobile ? locator.tap() : locator.click(),
    screenshot: suffix => page.screenshot({ path: join(output, `${name}-${suffix}.png`) }),
  };
}

async function waitForFrame(ui, media, path) {
  await ui.page.waitForFunction(({ media, path }) => {
    const frame = document.querySelector('.story-documentary[open] .story-documentary-still');
    const node = frame?.querySelector(media);
    if (!node || new URL(node.currentSrc || node.src).pathname !== path) return false;
    return media === 'video' ? frame.dataset.playing === 'true' && node.videoWidth > 0
      : !node.hidden && node.complete && node.naturalWidth > 0 && getComputedStyle(node).visibility === 'visible';
  }, { media, path });
}

async function assertLayout(ui, media) {
  const metrics = await ui.dialog.evaluate((dialog, media) => {
    const frame = dialog.querySelector('.story-documentary-still');
    const node = frame.querySelector(media);
    const captions = dialog.querySelector('.story-documentary-captions');
    const source = dialog.querySelector('.story-documentary-source');
    const player = node.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const captionRect = captions.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      fit: style.objectFit, position: style.objectPosition, transform: style.transform,
      contained: player.x >= frameRect.x - 1 && player.y >= frameRect.y - 1
        && player.right <= frameRect.right + 1 && player.bottom <= frameRect.bottom + 1,
      separated: frameRect.bottom <= captionRect.top,
      noHorizontalScroll: dialog.scrollWidth <= dialog.clientWidth + 1,
      caption: captions.textContent.trim(), source: source.textContent.trim(),
    };
  }, media);
  assert.equal(metrics.fit, 'contain');
  assert.equal(metrics.position, '50% 50%');
  assert.equal(metrics.transform, 'none');
  assert.equal(metrics.contained, true);
  assert.equal(metrics.separated, true);
  assert.equal(metrics.noHorizontalScroll, true);
  assert.ok(metrics.caption && metrics.source);
  if (media === 'video') {
    assert.match(await ui.dialog.locator('.story-documentary-provenance').innerText(), /not archival footage/i);
  }
}

async function waitBeat(ui, beat) {
  await ui.page.waitForFunction(beat => window.__stupa.story.getState().beat === beat, beat);
}

async function playback(mobile) {
  const ui = await openScenario(mobile ? 'mobile' : 'desktop', { mobile });
  const { page, frame, action } = ui;
  const h264 = await page.evaluate(() => document.createElement('video')
    .canPlayType('video/mp4; codecs="avc1.64001e"'));
  assert.ok(h264, 'This browser must support the delivered H.264 stream');
  await waitForFrame(ui, 'video', '/story/video/V1.mp4');
  await ui.click(action('toggle'));
  assert.equal(await ui.dialog.getAttribute('data-paused'), 'true');
  const seek = ui.dialog.locator('.story-documentary-seek');
  await seek.waitFor();
  await seek.evaluate(input => {
    input.value = '1.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const video = document.querySelector('.story-documentary-still video');
    return video.paused && !video.seeking && Math.abs(video.currentTime - 1.5) < 0.15;
  });
  await assertLayout(ui, 'video');
  await ui.screenshot('A');
  await ui.click(action('toggle'));
  await page.waitForFunction(() => document.querySelector('.story-documentary-still video')?.currentTime > 1.6);

  for (const [number, letter] of [[2, 'B'], [3, 'C']]) {
    const previous = await frame.locator('video').elementHandle();
    await ui.click(action('next'));
    await waitForFrame(ui, 'video', `/story/video/V${number}.mp4`);
    assert.equal(await previous.evaluate(node => !node.isConnected && !node.hasAttribute('src')), true);
    await previous.dispose();
    await assertLayout(ui, 'video');
    await ui.screenshot(letter);
  }
  await ui.click(action('next'));
  await waitForFrame(ui, 'img', '/story/restoration/D.webp');
  assert.equal(await frame.locator('video').count(), 0);
  await assertLayout(ui, 'img');
  await ui.screenshot('D');
  await ui.click(action('replay'));
  await waitForFrame(ui, 'video', '/story/video/V1.mp4');
  await waitBeat(ui, 'restoration');
  await ui.click(action('skip'));
  await waitBeat(ui, 'losang');
  report.scenarios.push({ name: ui.name, cues: [...ui.requested],
    events: await page.evaluate(() => window.mediaRegressionEvents) });
  await ui.context.close();
}

async function missingVideo() {
  const ui = await openScenario('missing-v3', { abort: '**/story/video/V3.mp4' });
  await waitForFrame(ui, 'video', '/story/video/V1.mp4');
  await ui.click(ui.action('next'));
  await waitForFrame(ui, 'video', '/story/video/V2.mp4');
  await ui.click(ui.action('next'));
  await waitForFrame(ui, 'img', '/story/restoration/C.webp');
  await ui.frame.locator('video').waitFor({ state: 'detached' });
  assert(ui.requested.has('/story/video/V3.mp4'));
  await assertLayout(ui, 'img');
  await ui.screenshot('C-still');
  await ui.click(ui.action('next'));
  await waitForFrame(ui, 'img', '/story/restoration/D.webp');
  await ui.click(ui.action('next'));
  await waitBeat(ui, 'losang');
  report.scenarios.push({ name: ui.name, cues: [...ui.requested] });
  await ui.context.close();
}

async function captionsOnly() {
  const ui = await openScenario('missing-all', { abort: '**/story/**' });
  const captions = [];
  for (let step = 1; step <= 4; step++) {
    await ui.frame.locator('.story-documentary-fallback').waitFor();
    await ui.dialog.locator('.story-documentary-progress').filter({ hasText: `Scene ${step} of 4` }).waitFor();
    captions.push((await ui.caption.innerText()).trim());
    if (step === 1) await ui.screenshot('caption');
    await ui.click(ui.action('next'));
  }
  assert.equal(new Set(captions).size, 4);
  assert(captions.every(Boolean));
  await waitBeat(ui, 'losang');
  report.scenarios.push({ name: ui.name, captions: captions.length });
  await ui.context.close();
}

async function reducedMotion() {
  const ui = await openScenario('reduced-motion', { reduced: true });
  for (const letter of ['A', 'B', 'C', 'D']) {
    await waitForFrame(ui, 'img', `/story/restoration/${letter}.webp`);
    assert.equal(await ui.frame.locator('video').count(), 0);
    await assertLayout(ui, 'img');
    if (letter !== 'D') await ui.click(ui.action('next'));
  }
  assert.equal([...ui.requested].some(path => path.endsWith('.mp4')), false);
  await ui.click(ui.action('replay'));
  await waitForFrame(ui, 'img', '/story/restoration/A.webp');
  await ui.click(ui.action('motion'));
  await waitForFrame(ui, 'video', '/story/video/V1.mp4');
  assert.deepEqual([...ui.requested].filter(path => path.endsWith('.mp4')), ['/story/video/V1.mp4']);
  await ui.click(ui.action('next'));
  await waitForFrame(ui, 'img', '/story/restoration/B.webp');
  assert.equal([...ui.requested].filter(path => path.endsWith('.mp4')).length, 1);
  report.scenarios.push({ name: ui.name, cues: [...ui.requested] });
  await ui.context.close();
}

async function visionViewer() {
  const ui = await openScenario('vision', { activeChapter: true });
  const { page } = ui;
  await page.waitForFunction(() => window.__stupa.chapterScene.getCheckpoint() === 'spring2');
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  for (const finish of ['close', 'next']) {
    await ui.click(page.locator('[data-action="settings"]'));
    await ui.click(page.locator('[data-settings="vision-video"]'));
    await waitForFrame(ui, 'video', '/story/video/V4.mp4');
    await assertLayout(ui, 'video');
    if (finish === 'close') await ui.screenshot('V4');
    await ui.click(ui.action(finish));
    await ui.dialog.waitFor({ state: 'hidden' });
    await waitBeat(ui, 'complete');
    assert.equal(await page.evaluate(() => window.__stupa.chapterScene.getCheckpoint()), 'spring2');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), before);
  }
  report.scenarios.push({ name: ui.name, checkpoint: 'spring2', savedBytesPreserved: true });
  await ui.context.close();
}

try {
  await playback(false);
  await playback(true);
  await missingVideo();
  await captionsOnly();
  await reducedMotion();
  await visionViewer();
  assert.deepEqual(report.errors, []);
  report.result = 'PASS';
  console.log('PASS: motion and static cues, containment, controls, fallback, and optional V4');
} catch (error) {
  report.result = 'FAIL';
  report.failure = error.stack;
  report.mediaTraffic = Object.fromEntries(mediaTraffic);
  const pages = browser.contexts().flatMap(context => context.pages());
  report.failureMediaEvents = await Promise.allSettled(pages.map(page =>
    page.evaluate(() => window.mediaRegressionEvents)));
  await Promise.allSettled(pages.map((page, index) =>
    page.screenshot({ path: join(output, `failure-${index + 1}.png`), timeout: 5000 })));
  throw error;
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
