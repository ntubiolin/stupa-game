import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { adventureCIOptions, startAdventureWithInput } from './adventure-browser-start.mjs';

const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.MODE_SWITCH_ARTIFACTS || 'artifacts/mode-switch';
const saveKey = 'stupa.save.v2';
const polling = { polling: 100, timeout: 60000 };
const fixture = {
  version: 2,
  sections: {
    settings: { lang: 'en', muted: true },
    inventory: { bag: [], equipped: {}, turquoise: 321 },
    codex: { unlocked: ['pharping'], seen: [] },
    story: {
      version: 2, beat: 'complete', evidence: ['new-diary'], choices: {},
      flags: {}, clipsSeen: [], elapsedSeconds: 5,
      journey: {
        activeChapterId: 'pharping',
        chapters: { pharping: { checkpointId: 'spring2', completed: false } },
      },
    },
  },
};

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL && { channel: process.env.BROWSER_CHANNEL }),
  args: ['--enable-unsafe-swiftshader'],
});
const report = { browser: browser.version(), scenarios: [], errors: [] };

async function readSave(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
}

async function waitForCheckpoint(page, checkpoint) {
  await page.waitForFunction(id => window.__stupa?.chapterScene?.getCheckpoint() === id, checkpoint, polling);
  assert.equal(await page.evaluate(() => window.__stupa.storyRuntime.getMetrics().zone), 'pharping');
}

async function runModeSwitch(mobile) {
  const name = mobile ? 'mobile' : 'desktop';
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1000, height: 720 },
    ...adventureCIOptions,
    hasTouch: mobile,
    isMobile: mobile,
    reducedMotion: 'reduce',
  });
  await context.addInitScript(({ key, seed }) => {
    sessionStorage.setItem('stupa.debug.unlocked', '1');
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
    window.modeTestDocument = crypto.randomUUID();
  }, { key: saveKey, seed: fixture });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push({ name, message: error.message }));
  const activate = locator => mobile ? locator.tap() : locator.click();
  const menu = () => page.locator('[data-mode-menu]');
  const dialog = () => page.getByRole('dialog', { name: /choose your journey/i });
  const target = mode => dialog().locator(`[data-mode-target="${mode}"]`);
  const documentId = () => page.evaluate(() => window.modeTestDocument);
  const screenshot = suffix => page.screenshot({ path: join(output, `${name}-${suffix}.png`) });

  async function openMenu(currentMode) {
    await activate(menu());
    await dialog().waitFor();
    assert.equal(await target(currentMode).isDisabled(), true);
    for (const mode of ['story', 'adventure', 'home'].filter(id => id !== currentMode)) {
      assert.equal(await target(mode).isEnabled(), true);
    }
  }

  async function navigateWithMenu(mode) {
    const previous = await documentId();
    const destination = new URL(mode === 'home' ? '/' : `/?mode=${mode}`, base);
    await Promise.all([
      page.waitForURL(url => url.pathname === destination.pathname && url.search === destination.search),
      activate(target(mode)),
    ]);
    await page.waitForFunction(previous => window.modeTestDocument && window.modeTestDocument !== previous, previous, polling);
  }

  await page.goto(`${base}/?mode=story`);
  await waitForCheckpoint(page, 'spring2');
  // The fixture resumes mid-chapter. Advance a real, in-range world action.
  await activate(page.locator('[data-action="interact"]'));
  await waitForCheckpoint(page, 'channel1');
  const journey = (await readSave(page)).sections.story.journey;
  assert.deepEqual(journey.chapters.pharping, { checkpointId: 'channel1', completed: false, choices: {}, flags: {} });
  assert.equal(journey.activeChapterId, 'pharping');

  await openMenu('story');
  await screenshot('story-menu');
  const beforeFailure = await documentId();
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (itemKey, value) {
      if (this === localStorage && itemKey === key) throw new DOMException('Test quota exhaustion', 'QuotaExceededError');
      return original.call(this, itemKey, value);
    };
    window.restoreModeTestStorage = () => { Storage.prototype.setItem = original; };
    window.__stupa.storyRuntime.ctx.save.set('story', JSON.parse(localStorage.getItem(key)).sections.story);
  }, saveKey);
  await activate(target('adventure'));
  await dialog().getByText(/not saved.*browser storage.*retry/i).waitFor();
  assert.equal(await documentId(), beforeFailure);
  assert.equal(new URL(page.url()).search, '?mode=story');
  assert.deepEqual((await readSave(page)).sections.story.journey, journey);
  await screenshot('storage-failure');
  await page.evaluate(() => window.restoreModeTestStorage());
  await navigateWithMenu('adventure');

  await startAdventureWithInput(page, { mobile });
  const gear = await page.evaluate(() => {
    const { inventory, codex } = window.__stupa;
    const item = inventory.give({ rarity: 'normal', baseId: 'bronzeVajra', ilvl: 8 });
    return {
      uid: item?.uid,
      equipped: inventory.equip(item?.uid),
      unlocked: codex.isUnlocked('pharping'),
    };
  });
  assert.ok(gear.uid);
  assert.equal(gear.equipped, true);
  assert.equal(gear.unlocked, true);
  const position = () => page.evaluate(() => {
    const { x, z } = window.__stupa.state.player.position;
    return { x, z };
  });
  await openMenu('adventure');
  const beforeInput = await position();
  assert.equal(await page.evaluate(() => window.__stupa.skills.cast('humBolt')), false);
  if (!mobile) {
    // Use the dialog itself to test combat input without activating a focused button.
    await dialog().evaluate(element => element.focus());
    assert.equal(await dialog().evaluate(element => document.activeElement === element), true);
    await page.keyboard.down('w');
    await page.keyboard.press('Space');
    await page.evaluate(() => new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    await page.keyboard.up('w');
    assert.deepEqual(await position(), beforeInput);
    assert.equal(await page.evaluate(() =>
      window.__stupa.skills.getSkillState('humBolt').cooldownRemaining), 0);
  }
  await screenshot('adventure-menu');
  const stay = dialog().getByRole('button', { name: 'Stay in this journey' });
  if (mobile) {
    await activate(stay);
  } else {
    await target('story').focus();
    await page.keyboard.press('Tab');
    assert.equal(await target('home').evaluate(element => document.activeElement === element), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await target('story').evaluate(element => document.activeElement === element), true);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await stay.evaluate(element => document.activeElement === element), true);
    await page.keyboard.press('Space');
  }
  await dialog().waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => window.__stupa.skills.cast('humBolt')), true);
  await openMenu('adventure');
  await navigateWithMenu('story');

  await waitForCheckpoint(page, 'channel1');
  const restored = (await readSave(page)).sections;
  assert.deepEqual(restored.story.journey, journey);
  assert.equal(restored.inventory.equipped.mainhand.uid, gear.uid);
  assert.ok(restored.codex.unlocked.includes('pharping'));
  assert.equal(await page.evaluate(() => Boolean(window.__stupa.inventory)), false);

  await openMenu('story');
  await navigateWithMenu('home');
  await page.locator('.mirror-launcher').waitFor();
  const launcherDocument = await documentId();
  await activate(page.locator('a[href="?mode=adventure"]'));
  await page.waitForURL(url => url.search === '?mode=adventure');
  await startAdventureWithInput(page, { mobile });
  assert.notEqual(await documentId(), launcherDocument);
  const adventure = await page.evaluate(() => ({
    equipped: window.__stupa.inventory.getEquipped().mainhand?.uid,
    codex: window.__stupa.codex.isUnlocked('pharping'),
    storyRuntime: Boolean(window.__stupa.storyRuntime),
  }));
  assert.deepEqual(adventure, { equipped: gear.uid, codex: true, storyRuntime: false });
  report.scenarios.push({ name, input: mobile ? 'touch' : 'mouse', checkpoint: 'channel1', gear: gear.uid, codex: 'pharping' });
  await context.close();
}

try {
  await runModeSwitch(false);
  await runModeSwitch(true);
  assert.deepEqual(report.errors, []);
  report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL';
  report.failure = error.stack;
  const pages = browser.contexts().flatMap(context => context.pages());
  report.failurePages = pages.map(page => page.url());
  await Promise.allSettled(pages.map((page, index) =>
    page.screenshot({ path: join(output, `failure-${index + 1}.png`), timeout: 5000 })));
  throw error;
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report));
