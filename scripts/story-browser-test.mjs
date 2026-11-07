import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { CHAPTERS } from '../src/data/story/chapters.js';
import { phoneThreads } from '../src/data/story/phoneThreads.js';
import { adventureCIOptions, adventureBrowserArgs, startAdventureWithInput } from './adventure-browser-start.mjs';

const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.STORY_ARTIFACTS || 'artifacts/story';
const ciDevice = process.env.CI ? { deviceScaleFactor: .5 } : {};
const suite = process.env.STORY_SUITE || 'all';
assert(['all', 'desktop', 'mobile', 'recovery', 'art', 'journey'].includes(suite), 'Unknown STORY_SUITE');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}), args: suite === 'recovery' || suite === 'all' ? adventureBrowserArgs : ['--enable-unsafe-swiftshader'] });
const report = { startedAt: new Date().toISOString(), browser: browser.version(), suite, renderProfile: process.env.CI ? 'Software CI: low journey quality, 0.5 render DPR; CSS viewport unchanged. Not art/performance acceptance.' : 'Native quality/DPR: art and layout acceptance', scenarios: [], errors: [], metrics: [] };
const seedSections = { vitals: { level: 12, exp: 77, hp: 150, mp: 60 }, quests: { active: {}, done: ['prologue.kora'], flags: { 'sentinel': true } }, inventory: { bag: [], equipped: {}, turquoise: 321 }, appearance: { displayName: 'Save sentinel' }, coop: { sentinel: 'preserve' }, merit: { points: 987 }, settings: { lang: 'zh', muted: true }, unknownFutureSection: { keep: [1, 2, 3] } };
const shot = (page, name) => {
  console.log(`Capturing ${name}`);
  return page.screenshot({ path: `${output}/${name}.png` });
};
const waitBeat = (page, beat) => page.waitForFunction(b => window.__stupa?.story?.getState().beat === b, beat);
async function fixture(context, beat, lang = 'zh') {
  await context.addInitScript(({ sections, beat, lang }) => {
    if (!localStorage.getItem('stupa.save.v2')) {
      const all = structuredClone(sections); all.settings.lang = lang;
      if (beat) all.story = { version: 1, beat, evidence: [], choices: {}, flags: {}, clipsSeen: [], elapsedSeconds: 30 };
      localStorage.setItem('stupa.save.v2', JSON.stringify({ version: 2, savedAt: 1, sections: all }));
    }
  }, { sections: seedSections, beat, lang });
}
function monitor(page, name) {
  console.log(`Starting ${name}`);
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', e => report.errors.push({ scenario: name, error: e.message }));
}
async function ready(page) {
  await page.goto(`${base}/?mode=story&debug=1`);
  await page.waitForFunction(() => window.__stupa?.storyRuntime);
  if (process.env.CI) await page.evaluate(() => {
    __stupa.storyArt.setQuality('low');
  });
}
async function artMatrix(page) {
  // Same pose, all 3 lighting × 2 quality × 2 art combinations.
  await page.evaluate(() => __stupa.storyCamera.setPose({ x: 0, y: 1.68, z: 31, yaw: 0, pitch: .34, fov: 55 }));
  for (const lighting of ['dawn', 'day', 'dusk']) for (const quality of ['high', 'low']) for (const preset of ['legacy', 'cinematic']) {
    await page.evaluate(({ lighting, quality, preset }) => { __stupa.storyArt.setLighting(lighting); __stupa.storyArt.setQuality(quality); __stupa.storyArt.setPreset(preset); __stupa.storyRuntime.resetMetrics(); }, { lighting, quality, preset });
    await page.waitForTimeout(1200);
    await shot(page, `art-${lighting}-${quality}-${preset}`);
    const metric = await page.evaluate(() => __stupa.storyRuntime.getMetrics());
    assert.equal(metric.pointLights, 0); report.metrics.push(metric);
  }
}

async function fullJourney(name, mobile, lang) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: mobile ? 2 : 1, ...ciDevice, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce', ...(!process.env.CI && { recordVideo: { dir: `${output}/video`, size: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 } } }) });
  await fixture(context, null, lang);
  const page = await context.newPage(); monitor(page, name);
  const wallStart = Date.now();
  const click = async locator => mobile ? locator.tap() : locator.click();
  const action = () => page.locator('.story-objective [data-action="interact"]');
  const cardContinue = () => page.locator('[data-card="continue"]');
  const guide = () => page.locator('[data-action="guide"]');
  const completePhoneThread = async threadId => {
    const thread = phoneThreads.find(entry => entry.id === threadId);
    await page.locator('.story-phone[open]').waitFor();
    for (let i = 0; i <= thread.turns.length; i++) {
      await click(page.locator('.story-phone__actions .story-phone__action--primary'));
    }
  };
  await ready(page);
  await page.locator('.story-phone[open]').waitFor();
  if (!mobile) {
    await page.evaluate(() => __stupa.storyArt.setQuality('low'));
    await page.waitForFunction(() => document.body.classList.contains('story-quality-low'));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.story-phone'), '::backdrop').backdropFilter), 'none');
    await page.evaluate(() => __stupa.storyArt.setQuality('high'));
    await page.waitForFunction(() => !document.body.classList.contains('story-quality-low'));
    assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('.story-phone'), '::backdrop').backdropFilter), /blur/);
    if (process.env.CI) await page.evaluate(() => __stupa.storyArt.setQuality('low'));
  }
  await shot(page, `${name}-01-prologue`);
  await click(page.locator('.story-phone__close'));
  await click(page.locator('[data-action="phone"]'));
  for (let i = 0; i < 3; i++) await click(page.locator('.story-phone__actions button').first());
  await ready(page); // No export/flush shortcut: exercise normal unload persistence.
  assert.equal(await page.locator('.story-phone__message--outgoing').count(), 3, `${name} retains partial conversation after reload`);
  for (let i = 3; i < 7; i++) await click(page.locator('.story-phone__actions button').first());
  await click(page.locator('.story-phone__actions button').first()); // transcript
  await shot(page, `${name}-02-recording`);
  await click(page.locator('.story-phone__actions button').first()); // depart
  await waitBeat(page, 'arrival');
  await click(cardContinue());
  await click(page.locator('[data-action="phone"]'));
  assert.equal(await page.locator('.story-phone__message--outgoing').count(), 7, `${name} shows completed history after advancing`);
  await click(page.locator('.story-phone__close'));
  // Verify real input changes the ground pose before using accessible journey controls.
  const before = await page.evaluate(() => __stupa.storyCamera.getPose());
  const waitForMovement = () => page.waitForFunction(previous => {
    const pose = __stupa.storyCamera.getPose();
    return Math.hypot(pose.x - previous.x, pose.z - previous.z) > .1;
  }, before);
  if (mobile) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 60, y: 400 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 60, y: 355 }] });
    await waitForMovement();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.locator('#app canvas').focus(); await page.keyboard.down('KeyW'); await waitForMovement(); await page.keyboard.up('KeyW');
  }
  const after = await page.evaluate(() => __stupa.storyCamera.getPose());
  assert(Math.hypot(after.x - before.x, after.z - before.z) > .1, `${name} movement`);
  for (let i = 0; i < 3; i++) {
    await click(guide()); await click(action());
    if (i === 1) await shot(page, `${name}-03-history`);
    await click(cardContinue());
  }
  await waitBeat(page, 'photography'); await click(guide()); await click(action());
  await page.locator('.story-photography[open]').waitFor();
  await click(page.locator('.story-photography [data-action="capture"]'));
  await waitBeat(page, 'photography');
  await click(page.locator('.story-photography [data-action="overlay"]'));
  await click(page.locator('.story-photography [data-action="overlay"]'));
  await click(page.locator('.story-photography [data-action="assist"]'));
  await shot(page, `${name}-04-photography`);
  await click(page.locator('.story-photography [data-action="capture"]'));
  await waitBeat(page, 'restoration'); await page.locator('.story-documentary[open]').waitFor();
  const documentaryAction = id => page.locator(`.story-documentary-controls [data-action="${id}"]`);
  await click(documentaryAction('toggle'));
  await shot(page, `${name}-05-documentary`);
  await click(documentaryAction('next'));
  assert.match(await page.locator('.story-documentary-progress').innerText(), /2.*4/);
  assert.equal(await page.locator('.story-documentary').getAttribute('data-paused'), 'true');
  await click(documentaryAction('replay'));
  await click(documentaryAction('toggle'));
  for (let i = 0; i < 3; i++) await click(documentaryAction('next'));
  await shot(page, `${name}-05b-documentary-last`);
  await click(documentaryAction('next')); // Finish reading, without waiting for a timer.
  await waitBeat(page, 'losang'); await click(guide()); await click(action());
  for (let i = 0; i < 6; i++) await click(cardContinue());
  await waitBeat(page, 'map'); await shot(page, `${name}-06-map`);
  await click(cardContinue()); await click(cardContinue());
  await completePhoneThread('hotel');
  await waitBeat(page, 'vision'); await cardContinue().waitFor(); await click(cardContinue());
  await shot(page, `${name}-07-vision`);
  for (let i = 0; i < 3; i++) { await click(guide()); await click(action()); await click(cardContinue()); }
  // Reproduce and guard the former last-card-close soft lock.
  await click(page.locator('[data-card="close"]')); await click(action()); await click(cardContinue());
  await waitBeat(page, 'return'); await click(cardContinue());
  await page.locator('.story-phone[open]').waitFor(); await shot(page, `${name}-08-diary`);
  await click(page.locator('.story-phone__record .story-phone__action--primary'));
  await waitBeat(page, 'complete'); await shot(page, `${name}-09-complete`); await click(cardContinue());
  const final = await page.evaluate(() => { __stupa.save.export(); return JSON.parse(localStorage.getItem('stupa.save.v2')); });
  const expected = structuredClone(seedSections); expected.settings.lang = lang;
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(final.sections[key], value, `${name} preserves ${key}`);
  assert.equal(final.sections.story.evidence.length, 5);
  await ready(page); await waitBeat(page, 'complete'); await click(cardContinue());
  await click(page.locator('[data-action="phone"]'));
  assert.equal(await page.locator('.story-phone__message--outgoing').count(), 7, `${name} retains archive after final reload`);
  await click(page.locator('.story-phone__close'));
  if (suite === 'journey') {
    await page.evaluate(() => window.__stupa?.storyAudio?.setEnabled(false));
    for (const chapter of CHAPTERS) {
      await click(page.locator('[data-action="journal"]'));
      await click(page.locator(`[data-chapter-action="start-${chapter.id}"]`));
      const waitCheckpoint = id => page.waitForFunction(({ chapterId, id }) =>
        window.__stupa?.chapters?.getState().activeChapterId === chapterId
        && window.__stupa?.chapterScene?.getCheckpoint() === id, { chapterId: chapter.id, id });
      await waitCheckpoint(chapter.entryCheckpoint);
      await click(cardContinue());
      for (const [index, step] of chapter.checkpoints.entries()) {
        await waitCheckpoint(step.id);
        console.log('continuous-journey', chapter.id, step.id);
        if (!step.signal) break;
        if (chapter.id === 'finale' && step.id === 'response') {
          await page.locator('.story-phone[open]').waitFor();
          await click(page.locator('.story-phone__actions .story-phone__action--primary'));
          await waitCheckpoint(chapter.checkpoints[index + 1].id);
          continue;
        }
        await action().waitFor({ state: 'visible' }); // HUD resumes on the next render after a card closes.
        if (await guide().isVisible()) await click(guide());
        await click(action());
        if (step.id === 'diary') await click(page.locator('[data-chapter-action="read-diary"]'));
        else if (chapter.id === 'finale' && step.id === 'decision') {
          await page.locator('.story-phone[open]').waitFor();
          await click(page.locator('.story-phone__actions .story-phone__action--primary'));
          await click(page.locator('.story-phone__actions button').first());
        } else if (chapter.id === 'yarlung' && step.id === 'memory') {
          await click(cardContinue());
          await page.locator('.story-documentary[open]').waitFor();
          await click(documentaryAction('skip'));
        } else if (step.phoneThreadId) {
          if (['mangyul', 'chimphu'].includes(chapter.id) && step.id !== 'phone') await click(cardContinue());
          await completePhoneThread(step.phoneThreadId);
          if (['yarlung', 'samye'].includes(chapter.id)) await click(cardContinue());
        } else if (step.choices) await click(page.locator(`[data-card-choice="${step.choices[0]}"]`));
        else if (step.presentation === 'card' || step.id.startsWith('altar')
          || chapter.id === 'pharping' && ['shadow', 'release', 'settle', 'wait', 'lamp'].includes(step.id)
          || chapter.id === 'mangyul' && step.id === 'clearing'
          || chapter.id === 'yarlung' && ['pause', 'release'].includes(step.id)
          || chapter.id === 'chimphu' && ['cave', 'light'].includes(step.id)) await click(cardContinue());
        await waitCheckpoint(chapter.checkpoints[index + 1].id);
      }
      await shot(page, `journey-${chapter.id}-complete`);
      const journey = await page.evaluate(() => __stupa.chapters.getState());
      assert.equal(journey.chapters[chapter.id].completed, true);
      assert.equal(journey.activeChapterId, chapter.id);
      // Start the next chapter directly from the completed chapter: no seeded save,
      // no password, no debug advancement and no intermediate reset/exit.
    }
    await page.reload();
    await page.waitForFunction(() => window.__stupa?.chapters?.getState().activeChapterId === 'finale'
      && window.__stupa?.chapterScene?.getCheckpoint() === 'complete');
    const sections = await page.evaluate(() => JSON.parse(localStorage.getItem('stupa.save.v2')).sections);
    for (const chapter of CHAPTERS) assert.equal(sections.story.journey.chapters[chapter.id].completed, true);
    assert.equal(sections.story.journey.chapters.finale.choices.decision, 'end');
    for (const [key, value] of Object.entries(expected)) assert.deepEqual(sections[key], value);
    report.scenarios.push({ name: 'continuous-six-chapter-handoff', result: 'PASS', checkpoints: CHAPTERS.reduce((n,c) => n+c.checkpoints.length, 0) });
  }
  if (!mobile && suite === 'all') await artMatrix(page);
  report.scenarios.push({ name, result: 'PASS', mode: 'complete user-facing flow, assisted navigation, no debug beat progression', language: lang, gameElapsedSeconds: final.sections.story.elapsedSeconds, automatedWallSeconds: (Date.now() - wallStart) / 1000, pacingNote: 'Fast automated path with navigation/photo assistance and manual cue advance; not a 15-minute human reading test' });
  await context.close();
}

try {
  if (suite === 'all' || suite === 'desktop' || suite === 'journey') await fullJourney('desktop', false, 'zh');
  if (suite === 'all' || suite === 'mobile') await fullJourney('mobile', true, 'en');
  if (suite === 'art') {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...ciDevice, reducedMotion: 'reduce' });
    await fixture(context, 'complete');
    const page = await context.newPage(); monitor(page, 'art-matrix');
    await ready(page); await waitBeat(page, 'complete');
    await page.locator('[data-card="continue"]').click();
    await artMatrix(page);
    report.scenarios.push({ name: 'art-matrix', result: 'PASS', combinations: 12 });
    await context.close();
  }
  if (suite === 'all' || suite === 'recovery') {
    // Resume every checkpoint with genuine saved data, never a debug transition.
    for (const beat of ['prologue', 'arrival', 'photography', 'restoration', 'losang', 'map', 'vision', 'return', 'complete']) {
      const context = await browser.newContext(ciDevice); await fixture(context, beat);
      const page = await context.newPage(); monitor(page, `resume-${beat}`); await ready(page); await waitBeat(page, beat);
      await page.waitForFunction(() => document.querySelector('dialog[open]') || !document.querySelector('.story-modal').hidden || !document.querySelector('[data-action="interact"]').hidden);
      report.scenarios.push({ name: `resume-${beat}`, result: 'PASS' }); await context.close();
    }
    const fallback = await browser.newContext(ciDevice); await fixture(fallback, 'restoration');
    await fallback.route(/\/story\/(restoration-memory\.jpg|restoration\/|video\/)/, route => route.abort());
    const fp = await fallback.newPage(); monitor(fp, 'media-fallback'); await ready(fp);
    await fp.locator('.story-documentary-fallback').waitFor({ state: 'visible' });
    await shot(fp, 'missing-media-fallback');
    await fp.locator('.story-documentary-controls [data-action="skip"]').click(); await waitBeat(fp, 'losang');
    report.scenarios.push({ name: 'missing-media-fallback', result: 'PASS' }); await fallback.close();
    const adventure = await browser.newContext({ ...ciDevice, ...adventureCIOptions });
    await adventure.addInitScript(() => {
      if (!localStorage.getItem('stupa.save.v2')) {
        localStorage.setItem('stupa.save.v2', JSON.stringify({
          version: 2, savedAt: 1, sections: { appearance: { customizedOnce: true } },
        }));
      }
    });
    const ap = await adventure.newPage(); monitor(ap, 'adventure');
    await ap.goto(`${base}/?mode=adventure&debug=1`);
    await startAdventureWithInput(ap);
    assert.equal(await ap.evaluate(() => Boolean(__stupa.story)), false);
    const adventureChecks = await ap.evaluate(async () => {
      __stupa.inventory.give('magic');
      const bag = __stupa.inventory.getBag();
      const item = bag[0];
      if (item) __stupa.inventory.equip(item.uid);
      const equipped = Object.values(__stupa.inventory.getEquipped()).filter(Boolean).length;
      const cast = __stupa.skills.cast('humBolt');
      await __stupa.zones.teleport('pharping');
      const mapLoaded = __stupa.state.zone === 'pharping';
      await __stupa.zones.teleport('stupa');
      return { item: Boolean(item), equipped, cast, mapLoaded, mapCount: __stupa.zones.list().length, coopAvailable: Boolean(__stupa.coop) };
    });
    assert.equal(adventureChecks.item, true); assert(adventureChecks.equipped > 0); assert.equal(adventureChecks.mapLoaded, true); assert(adventureChecks.mapCount >= 9); assert.equal(adventureChecks.coopAvailable, true);
    report.scenarios.push({ name: 'adventure-equipment-skills-historical-maps', result: 'PASS', checks: adventureChecks });
    await shot(ap, 'adventure-preserved');
    report.scenarios.push({ name: 'adventure-bootstrap', result: 'PASS' }); await adventure.close();
  }
  assert.deepEqual(report.errors, [], 'No uncaught browser errors');
  report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL'; report.failure = error.stack;
  report.failurePages = [];
  for (const context of browser.contexts()) for (const page of context.pages()) {
    report.failurePages.push({ url: page.url(), text: await page.locator('body').innerText({ timeout: 5000 }).catch(() => 'unavailable') });
    await page.screenshot({ path: `${output}/failure-${report.failurePages.length}.png`, timeout: 5000 }).catch(() => {});
  }
  throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ result: report.result, scenarios: report.scenarios.length, errors: report.errors, metrics: report.metrics.length }));
