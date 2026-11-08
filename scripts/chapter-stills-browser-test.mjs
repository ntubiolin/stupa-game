import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.STORY_ARTIFACTS || 'artifacts/chapter-stills-114';
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  args: ['--enable-unsafe-swiftshader'],
});

const CASES = [
  { id: '01-yarlung-yak-held', chapter: 'yarlung', checkpoint: 'calm', path: '/story/chapters/01-yarlung-yak-held.webp' },
  { id: '02-yarlung-yak-released', chapter: 'yarlung', checkpoint: 'release', path: '/story/chapters/02-yarlung-yak-released.webp' },
  { id: '03-chimphu-cave', chapter: 'chimphu', checkpoint: 'cave', path: '/story/chapters/03-chimphu-cave.webp' },
  { id: '04-chimphu-custody', chapter: 'chimphu', checkpoint: 'records', path: '/story/chapters/04-chimphu-custody.webp' },
  { id: '05-mangyul-twelve-altars', chapter: 'mangyul', checkpoint: 'crossing', path: '/story/chapters/05-mangyul-twelve-altars.webp' },
  { id: '06-samye-unfinished', chapter: 'samye', checkpoint: 'stone', path: '/story/chapters/06-samye-unfinished.webp', onIntro: true },
  { id: '07-samye-night-disassembled', chapter: 'samye', checkpoint: 'rebuild', path: '/story/chapters/07-samye-night-disassembled.webp', phoneFirst: true },
  { id: '08-samye-morning-restored', chapter: 'samye', checkpoint: 'hepori', path: '/story/chapters/08-samye-morning-restored.webp' },
  { id: '09-finale-butter-lamp', chapter: 'finale', checkpoint: 'lampPrayer', path: '/story/chapters/09-finale-butter-lamp.webp', options: { choice: 'end' } },
];

const preserved = {
  vitals: { level: 12, exp: 77, hp: 150, mp: 60 },
  inventory: { bag: [], equipped: {}, turquoise: 321 },
  settings: { lang: 'zh', muted: true },
  unknownFutureSection: { sentinel: 'preserve' },
};

const report = { browser: browser.version(), scenarios: [], errors: [] };

async function seed(context) {
  await context.addInitScript(sections => {
    sessionStorage.setItem('stupa.debug.unlocked', '1');
    if (localStorage.getItem('stupa.save.v2')) return;
    localStorage.setItem('stupa.save.v2', JSON.stringify({
      version: 2,
      savedAt: 1,
      sections: {
        ...sections,
        story: {
          version: 2,
          beat: 'complete',
          evidence: [],
          choices: {},
          flags: {},
          clipsSeen: [],
          elapsedSeconds: 30,
          journey: { activeChapterId: null, chapters: {} },
        },
      },
    }));
  }, preserved);
}

async function openStillCard(page, item, mobile) {
  const click = selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
  await page.waitForFunction(() => !window.__stupa.state.uiOpen);
  const ok = await page.evaluate(async ({ chapter, checkpoint, options }) => {
    return await window.__stupa.storyRuntime.ctx.requestChapterPreview(chapter, checkpoint, options);
  }, item);
  assert.equal(ok, true, `preview ${item.chapter}:${item.checkpoint} should succeed`);
  await page.waitForFunction(checkpoint => window.__stupa?.chapterScene?.getCheckpoint() === checkpoint, item.checkpoint);

  if (item.onIntro) {
    await page.locator(`.story-chapter-still[data-still="${item.id}"]`).waitFor();
    return;
  }
  await page.waitForFunction(() => !window.__stupa.state.uiOpen);
  if (await page.locator('[data-action="guide"]').isVisible()) {
    await click('[data-action="guide"]');
  }
  await click('.story-objective [data-action="interact"]');
  if (item.phoneFirst) {
    await page.locator('.story-phone[open]').waitFor();
    while (await page.locator('.story-phone[open]').isVisible()) {
      await click('.story-phone__actions .story-phone__action--primary');
    }
  }
  await page.locator(`.story-chapter-still[data-still="${item.id}"]`).waitFor();
}

async function checkStillLayout(page, id) {
  await page.waitForFunction(stillId => {
    const img = document.querySelector(`.story-chapter-still[data-still="${stillId}"] img`);
    return img && !img.hidden && img.complete && img.naturalWidth === 1920 && img.naturalHeight === 1080;
  }, id);
  const result = await page.locator(`.story-chapter-still[data-still="${id}"]`).evaluate(figure => {
    const image = figure.querySelector('img');
    const fallback = figure.querySelector('.story-chapter-still-fallback');
    const caption = figure.querySelector('figcaption');
    const prose = figure.nextElementSibling;
    const img = image.getBoundingClientRect();
    const cap = caption.getBoundingClientRect();
    const card = figure.closest('.story-card').getBoundingClientRect();
    return {
      natural: [image.naturalWidth, image.naturalHeight],
      fit: getComputedStyle(image).objectFit,
      ratio: img.width / img.height,
      fallbackHidden: fallback.hidden,
      captionBelow: cap.top >= img.bottom - 1,
      proseBelow: prose.getBoundingClientRect().top >= cap.bottom - 1,
      cardFits: card.left >= 0 && card.right <= innerWidth + 1,
      noOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
      captionText: caption.textContent.trim(),
      uiOpen: window.__stupa.state.uiOpen,
    };
  });
  assert.deepEqual(result.natural, [1920, 1080]);
  assert.equal(result.fit, 'contain');
  assert(Math.abs(result.ratio - 16 / 9) < 0.02, `expected 16:9 ratio, got ${result.ratio}`);
  assert.equal(result.fallbackHidden, true);
  assert.equal(result.captionBelow, true);
  assert.equal(result.proseBelow, true);
  assert.equal(result.cardFits, true);
  assert.equal(result.noOverflow, true);
  assert.equal(result.uiOpen, true);
  return result;
}

try {
  for (const mobile of [false, true]) {
    const scenarioName = mobile ? 'mobile-390' : 'desktop';
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: process.env.CI ? 0.5 : mobile ? 2 : 1,
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: 'reduce',
    });
    await seed(context);
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => report.errors.push({ scenario: scenarioName, message: error.message }));
    const requested = new Set();
    page.on('request', req => {
      const pathname = new URL(req.url()).pathname;
      if (pathname.startsWith('/story/chapters/')) requested.add(pathname);
    });

    await page.goto(`${base}/?mode=story&debug=1`);
    await page.waitForFunction(() => window.__stupa?.storyRuntime);
    if (process.env.CI) await page.evaluate(() => window.__stupa.storyArt.setQuality('low'));
    assert.equal(requested.size, 0, 'no chapter still requested before opening a chapter card');

    const click = selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
    await click('[data-card="continue"]');
    await page.waitForFunction(() => !window.__stupa.state.uiOpen);

    const layouts = {};
    for (const item of CASES) {
      assert.equal(requested.has(item.path), false, `${item.id} should load lazily`);
      await openStillCard(page, item, mobile);
      assert.equal(requested.has(item.path), true, `${item.id} requested when card opens`);
      layouts[item.id] = await checkStillLayout(page, item.id);
      assert.match(layouts[item.id].captionText, /非歷史照片/);

      if (item.id === '01-yarlung-yak-held' || item.id === '09-finale-butter-lamp') {
        const oldImage = await page.locator(`.story-chapter-still[data-still="${item.id}"] img`).elementHandle();
        await page.evaluate(() => window.__stupa.storyRuntime.ctx.i18n.setLang('en'));
        await page.locator(`.story-chapter-still[data-still="${item.id}"] figcaption`)
          .filter({ hasText: 'not a historical photograph' }).waitFor();
        assert.equal(await oldImage.getAttribute('src'), null, 'language rerender disposes previous still');
        await checkStillLayout(page, item.id);
        await page.evaluate(() => window.__stupa.storyRuntime.ctx.i18n.setLang('zh'));
        await page.locator(`.story-chapter-still[data-still="${item.id}"] figcaption`)
          .filter({ hasText: '非歷史照片' }).waitFor();
      }

      if (!process.env.CI || item.id === '01-yarlung-yak-held' || item.id === '09-finale-butter-lamp') {
        await page.screenshot({ path: `${output}/${scenarioName}-${item.id}.jpg`, quality: 85 });
      }

      const activeImage = await page.locator(`.story-chapter-still[data-still="${item.id}"] img`).elementHandle();
      await click('[data-card="close"]');
      await page.waitForFunction(() => !window.__stupa.state.uiOpen);
      assert.equal(await activeImage.getAttribute('src'), null, 'closing card releases still src');
      assert.equal(await page.locator('.story-chapter-still').count(), 0);
    }

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('stupa.save.v2')).sections);
    for (const [key, value] of Object.entries(preserved)) {
      assert.deepEqual(saved[key], value, `preserves ${key}`);
    }
    report.scenarios.push({ name: scenarioName, status: 'passed', count: CASES.length, layouts });
    await context.close();
  }

  // Real missing-media failure fallback check
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: process.env.CI ? 0.5 : 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  await seed(context);
  await context.route('**/story/chapters/09-finale-butter-lamp.webp', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push({ scenario: 'missing-media', message: error.message }));
  await page.goto(`${base}/?mode=story&debug=1`);
  await page.waitForFunction(() => window.__stupa?.storyRuntime);
  await page.locator('[data-card="continue"]').tap();
  await page.waitForFunction(() => !window.__stupa.state.uiOpen);
  await openStillCard(page, CASES[8], true);
  await page.locator('.story-chapter-still-fallback').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.story-chapter-still img').isVisible(), false);
  assert.equal(await page.locator('.story-chapter-still img').evaluate(img => getComputedStyle(img).display), 'none');
  await page.evaluate(() => window.__stupa.storyRuntime.ctx.i18n.setLang('en'));
  await page.locator('.story-chapter-still-fallback').filter({ hasText: 'illustration is unavailable' }).waitFor();
  await page.locator('[data-card="continue"]').tap();
  await page.waitForFunction(() => window.__stupa?.chapterScene?.getCheckpoint() === 'diary');
  report.scenarios.push({ name: 'missing-media-mobile', status: 'passed' });
  await context.close();

  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify({ status: 'PASS', scenarios: report.scenarios.map(s => s.name) }, null, 2));
} finally {
  await writeFile(`${output}/browser-report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
