import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { STORY_BEATS } from '../src/data/story/beats.js';

const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.STORY_ARTIFACTS || 'artifacts/story-debug';
const key = 'stupa.save.v2';
const browser = await chromium.launch({
  ...(process.env.BROWSER_CHANNEL && { channel: process.env.BROWSER_CHANNEL }),
  args: ['--enable-unsafe-swiftshader'],
});
await mkdir(output, { recursive: true });
const errors = [];

async function createPage({ complete = false, mobile = false } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 960, height: 660 },
    deviceScaleFactor: process.env.CI ? 0.5 : 1,
    reducedMotion: 'reduce',
    isMobile: mobile,
    hasTouch: mobile,
  });
  const fixture = {
    version: 2,
    savedAt: 1,
    sections: {
      settings: { lang: 'en', muted: true },
      preserveAdventure: { inventory: ['keep'] },
      story: {
        version: 2, beat: complete ? 'complete' : 'prologue',
        evidence: complete ? STORY_BEATS.flatMap(beat => beat.evidence ?? []) : [],
        choices: {}, flags: {}, clipsSeen: [], elapsedSeconds: 0,
        journey: complete ? {
          activeChapterId: 'pharping',
          chapters: { pharping: { checkpointId: 'spring2', completed: false, choices: {}, flags: {} } },
        } : { activeChapterId: null, chapters: {} },
      },
    },
  };
  await context.addInitScript(({ key, fixture }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
  }, { key, fixture });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/?mode=story`);
  return {
    context, page,
    click: selector => mobile ? page.locator(selector).tap() : page.locator(selector).click(),
    field: name => page.locator(`[data-story-debug="${name}"]`),
    raw: () => page.evaluate(key => localStorage.getItem(key), key),
  };
}

async function openPanel(ui) {
  await ui.click('[data-action="settings"]');
  await ui.click('[data-settings="debug"]');
  await ui.page.locator('.story-debug-panel[open]').waitFor();
}

async function unlock(ui) {
  await ui.field('password').fill('amitabha');
  await ui.click('[data-story-debug="unlock"]');
  await ui.field('chapter').waitFor();
  await ui.page.evaluate(() => window.__stupa.storyArt.setQuality('low'));
}

async function selectPreview(ui, chapter, checkpoint, choice) {
  await ui.field('chapter').selectOption(chapter);
  await ui.field('checkpoint').selectOption(checkpoint);
  if (choice) await ui.field('choice').selectOption(choice);
  await ui.click('[data-story-debug="preview"]');
}

function waitForPreview(ui, checkpointId) {
  return ui.page.waitForFunction(id => window.__stupa?.chapterScene?.getCheckpoint() === id
    && window.__stupa.chapters.getState().testing, checkpointId);
}

async function unfinishedDemo() {
  const ui = await createPage();
  const { page } = ui;
  await ui.click('.story-phone__close');
  await openPanel(ui);
  assert.equal(await page.evaluate(() => Boolean(window.__stupa?.chapters)), false);
  await ui.field('password').fill('wrong');
  await ui.click('[data-story-debug="unlock"]');
  await page.getByRole('alert').getByText('Incorrect password.').waitFor();
  assert.equal(await ui.field('chapter').count(), 0);
  await unlock(ui);
  await ui.field('demo-beat').selectOption('map');
  const cancelled = page.waitForEvent('dialog').then(dialog => dialog.dismiss());
  await Promise.all([cancelled, ui.click('[data-story-debug="demo-jump"]')]);
  assert.equal(await page.evaluate(() => window.__stupa.story.getState().beat), 'prologue');
  assert.equal(await page.evaluate(() => window.__stupa.save.flush()), true);
  const before = await ui.raw();
  const elapsedBefore = await page.evaluate(() => window.__stupa.story.getState().elapsedSeconds);

  await selectPreview(ui, 'chimphu', 'light');
  await waitForPreview(ui, 'light');
  assert.equal(await page.locator('[data-action="phone"]').isDisabled(), true);
  await page.locator('.story-objective').getByText('Test mode · Chapter progress and choices are never saved').waitFor();
  await page.screenshot({ path: join(output, 'desktop-chimphu-preview.png') });
  await ui.click('[data-action="interact"]');
  await waitForPreview(ui, 'diary');
  await ui.click('[data-action="interact"]');
  await ui.click('[data-chapter-action="read-diary"]');
  await waitForPreview(ui, 'complete');
  assert.equal(await page.evaluate(() => window.__stupa.story.getState().elapsedSeconds), elapsedBefore);
  assert.equal(await ui.raw(), before);

  await openPanel(ui);
  await page.route(/\/assets\/samyeScene-[^/]+\.js$/, route => route.abort());
  await selectPreview(ui, 'samye', 'night');
  await page.getByText('The preview could not load. Your current progress is unchanged.').waitFor();
  assert.equal(await page.evaluate(() => window.__stupa.chapterScene.getCheckpoint()), 'complete');
  assert.equal(await ui.raw(), before);
  await ui.click('[data-card="continue"]');
  await ui.click('[data-story-debug="exit"]');
  await page.locator('.story-phone[open]').waitFor();
  assert.equal(await page.evaluate(() => window.__stupa.story.getState().beat), 'prologue');
  assert.equal(await page.evaluate(() => window.__stupa.chapters.getState().testing), undefined);
  await page.reload();
  await page.locator('.story-phone[open]').waitFor();
  assert.equal(await page.evaluate(() => window.__stupa.story.getState().beat), 'prologue');
  await ui.context.close();
}

async function canonicalChapter() {
  const ui = await createPage({ complete: true, mobile: true });
  const { page } = ui;
  await page.locator('[data-action="interact"]:enabled').waitFor();
  const before = await ui.raw();
  await openPanel(ui);
  await unlock(ui);
  assert.equal(await ui.field('demo-jump').count(), 0);
  await ui.field('chapter').selectOption('finale');
  await ui.field('checkpoint').selectOption('response');
  assert.equal(await ui.field('choice').inputValue(), '');
  await ui.click('[data-story-debug="preview"]');
  await ui.field('choice').waitFor();
  await page.screenshot({ path: join(output, 'mobile-finale-preview-controls.png') });
  await ui.field('choice').selectOption('retain');
  await ui.click('[data-story-debug="preview"]');
  await waitForPreview(ui, 'response');
  await ui.click('[data-action="interact"]');
  await page.getByText(/offline page has kept the link/i).waitFor();
  await ui.click('[data-card="close"]');

  await openPanel(ui);
  await selectPreview(ui, 'finale', 'response', 'end');
  await waitForPreview(ui, 'response');
  await ui.click('[data-action="interact"]');
  await page.getByText(/She did not leave the following message/i).waitFor();
  await ui.click('[data-card="close"]');
  assert.equal(await ui.raw(), before);
  await openPanel(ui);
  await ui.click('[data-story-debug="exit"]');
  await page.waitForFunction(() => window.__stupa?.chapterScene?.getCheckpoint() === 'spring2');
  assert.equal(await page.evaluate(() => window.__stupa.chapters.getState().testing), undefined);
  assert.equal(await ui.raw(), before);
  await page.reload();
  await page.waitForFunction(() => window.__stupa?.chapterScene?.getCheckpoint() === 'spring2');
  assert.equal(await ui.raw(), before);
  await ui.context.close();
}

try {
  await unfinishedDemo();
  await canonicalChapter();
  assert.deepEqual(errors, []);
  console.log('PASS: password, desktop and touch previews, load failure, choices, exit and reload');
} catch (error) {
  const pages = browser.contexts().flatMap(context => context.pages());
  await Promise.allSettled(pages.map((page, index) =>
    page.screenshot({ path: join(output, `failure-${index + 1}.png`), timeout: 5000 })));
  throw error;
} finally {
  await browser.close();
}
