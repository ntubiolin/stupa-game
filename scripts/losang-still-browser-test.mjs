import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.STORY_ARTIFACTS || 'artifacts/losang-113';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  args: ['--enable-unsafe-swiftshader'],
});
const report = { browser: browser.version(), scenarios: [], errors: [] };
const preserved = {
  vitals: { level: 12, exp: 77, hp: 150, mp: 60 },
  inventory: { bag: [], equipped: {}, turquoise: 321 },
  settings: { lang: 'zh', muted: true },
  unknownFutureSection: { sentinel: 'preserve' },
};
const stillSelector = '.story-losang-still';
const stillUrl = '**/story/losang-map-handoff.webp';
const beat = page => page.evaluate(() => __stupa.story.getState().beat);
const evidence = page => page.evaluate(() => __stupa.story.getState().evidence);
const continueButton = page => page.locator('[data-card="continue"]');
const action = page => page.locator('.story-objective [data-action="interact"]');
async function seed(context) {
  await context.addInitScript(sections => {
    if (localStorage.getItem('stupa.save.v2')) return;
    localStorage.setItem('stupa.save.v2', JSON.stringify({ version: 2, savedAt: 1, sections: {
      ...sections,
      story: { version: 1, beat: 'losang', evidence: [], choices: {}, flags: {}, clipsSeen: [], elapsedSeconds: 30 },
    } }));
  }, preserved);
}
async function ready(page) {
  await page.goto(`${base}/?mode=story&debug=1`);
  await page.waitForFunction(() => window.__stupa?.storyRuntime);
  await page.waitForFunction(() => __stupa.story.getState().beat === 'losang');
}
async function openDialogue(page, mobile) {
  const guide = page.locator('[data-action="guide"]');
  if (mobile) { await guide.tap(); await action(page).tap(); }
  else { await guide.click(); await page.locator('#app canvas').focus(); await page.keyboard.press('KeyE'); }
  await continueButton(page).waitFor();
}
async function mapLine(page) {
  for (let i = 0; i < 5; i++) await continueButton(page).click();
}
async function checkLayout(page) {
  const result = await page.locator(stillSelector).evaluate(figure => {
    const image = figure.querySelector('img'), caption = figure.querySelector('figcaption');
    const prose = figure.nextElementSibling;
    const img = image.getBoundingClientRect(), cap = caption.getBoundingClientRect();
    const card = figure.closest('.story-card').getBoundingClientRect();
    return { natural: [image.naturalWidth, image.naturalHeight], fit: getComputedStyle(image).objectFit,
      ratio: img.width / img.height, captionBelow: cap.top >= img.bottom, proseBelow: prose.getBoundingClientRect().top >= cap.bottom,
      cardFits: card.left >= 0 && card.right <= innerWidth, noOverflow: document.documentElement.scrollWidth <= innerWidth,
      dpr: devicePixelRatio, uiOpen: __stupa.state.uiOpen };
  });
  assert.deepEqual(result.natural, [1664, 936]);
  assert.equal(result.fit, 'contain');
  assert(Math.abs(result.ratio - 16 / 9) < .01);
  assert.equal(result.captionBelow, true);
  assert.equal(result.proseBelow, true);
  assert.equal(result.cardFits, true);
  assert.equal(result.noOverflow, true);
  assert.equal(result.uiOpen, true);
  return result;
}

try {
  for (const mobile of [false, true]) {
    const name = mobile ? 'mobile-390' : 'desktop';
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    await seed(context);
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => report.errors.push({ scenario: name, message: error.message }));
    const requests = [];
    page.on('request', request => { if (request.url().endsWith('/story/losang-map-handoff.webp')) requests.push(request.url()); });
    await ready(page);
    assert.equal(requests.length, 0, 'not requested before the handoff');
    await openDialogue(page, mobile);
    // Repeat a removed button event: it cannot consume the next card's callback.
    await continueButton(page).evaluate(button => { button.click(); button.click(); });
    await page.waitForFunction(() => document.querySelector('.story-prose')?.textContent.includes('她總是想知道'));
    for (let i = 1; i < 5; i++) await continueButton(page).click();
    await page.waitForFunction(() => document.querySelector('.story-losang-still img')?.naturalWidth === 1664);
    assert.equal(requests.length, 1, 'only the final line requests the export');
    assert.equal(await beat(page), 'losang');
    const before = await evidence(page);
    const layout = await checkLayout(page);
    await page.screenshot({ path: `${output}/${name}-zh.png` });
    const oldImage = await page.locator(`${stillSelector} img`).elementHandle();
    const oldContinue = await continueButton(page).elementHandle();
    await page.evaluate(() => __stupa.storyRuntime.ctx.i18n.setLang('en'));
    await page.locator(`${stillSelector} figcaption`).filter({ hasText: 'not a historical photograph' }).waitFor();
    assert.equal(await oldImage.getAttribute('src'), null, 'language rerender releases old image');
    await oldContinue.evaluate(button => button.click());
    assert.equal(await beat(page), 'losang', 'stale language version cannot accept map');
    await page.waitForFunction(() => document.querySelector('.story-losang-still img')?.naturalWidth === 1664);
    await checkLayout(page);
    await page.screenshot({ path: `${output}/${name}-en.png` });
    const closingImage = await page.locator(`${stillSelector} img`).elementHandle();
    if (mobile) await page.locator('[data-card="close"]').tap();
    else await page.keyboard.press('Escape');
    await page.waitForFunction(() => !__stupa.state.uiOpen);
    assert.equal(await closingImage.getAttribute('src'), null, 'dismissal releases source');
    assert.equal(await page.locator(stillSelector).count(), 0);
    assert.equal(await beat(page), 'losang');
    assert.deepEqual(await evidence(page), before);
    assert.equal(await page.locator('#app canvas').evaluate(canvas => document.activeElement === canvas), true);
    if (mobile) await action(page).tap(); else await page.keyboard.press('KeyE');
    await page.waitForFunction(() => document.querySelector('.story-losang-still img')?.naturalWidth === 1664);
    assert.match(await continueButton(page).textContent(), /Accept the old map/);
    // One acceptance advances once to map; a repeated detached event cannot consume its card.
    await continueButton(page).evaluate(button => { button.click(); button.click(); });
    await page.waitForFunction(() => __stupa.story.getState().beat === 'map');
    assert.equal((await evidence(page)).filter(id => id === 'old-map').length, 1);
    assert.equal(await page.locator('.story-map').count(), 1);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !__stupa.state.uiOpen);
    await page.evaluate(() => __stupa.save.flush());
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('stupa.save.v2')).sections);
    for (const [key, value] of Object.entries(preserved)) assert.deepEqual(saved[key], value, `preserves ${key}`);
    await page.reload();
    await page.waitForFunction(() => window.__stupa?.storyRuntime && __stupa.story.getState().beat === 'map');
    assert.equal(await page.locator(stillSelector).count(), 0, 'resume does not restore a dismissed handoff modal');
    assert.equal(await page.locator('.story-map').count(), 1, 'map remains playable on resume');
    report.scenarios.push({ name, status: 'passed', layout, checks: ['lazy loading', 'six-line dialogue', 'stale/repeated clicks', 'zh/en rerender', 'full-frame and caption layout', 'close/escape and reopen', 'focus and uiOpen release', 'single evidence grant', 'map progression', 'save isolation', 'map resume'] });
    await context.close();
  }

  // Missing-media run uses a real failed image request, not a synthetic load callback.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await seed(context);
  await context.route(stillUrl, route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push({ scenario: 'missing-media', message: error.message }));
  await ready(page); await openDialogue(page, true); await mapLine(page);
  await page.locator('.story-losang-still-fallback').waitFor({ state: 'visible' });
  assert.equal(await page.locator(`${stillSelector} img`).isVisible(), false);
  assert.equal(await page.locator(`${stillSelector} img`).evaluate(img => getComputedStyle(img).display), 'none');
  assert.equal(await beat(page), 'losang');
  assert.equal((await evidence(page)).includes('old-map'), false);
  await page.screenshot({ path: `${output}/mobile-390-missing-media.png` });
  await page.locator('[data-card="close"]').tap();
  await page.waitForFunction(() => !__stupa.state.uiOpen);
  await action(page).tap();
  await page.locator('.story-losang-still-fallback').waitFor({ state: 'visible' });
  await page.evaluate(() => __stupa.storyRuntime.ctx.i18n.setLang('en'));
  await page.locator('.story-losang-still-fallback').filter({ hasText: 'illustration is unavailable' }).waitFor();
  await continueButton(page).tap();
  await page.waitForFunction(() => __stupa.story.getState().beat === 'map');
  assert.equal((await evidence(page)).filter(id => id === 'old-map').length, 1);
  report.scenarios.push({ name: 'missing-media-mobile', status: 'passed', checks: ['real request failure', 'broken image hidden', 'localized fallback', 'close/reopen', 'language change', 'normal acceptance'] });
  await context.close();
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(`${output}/browser-report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
