import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { adventureCIOptions, startAdventureWithInput } from './adventure-browser-start.mjs';

const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.ADVENTURE_ARTIFACTS || process.env.STORY_ARTIFACTS || 'artifacts/adventure-compat';
const saveKey = 'stupa.save.v2';
const suite = process.env.ADVENTURE_SUITE || 'all';
assert(['all', 'adventure', 'save', 'party'].includes(suite), 'Unknown ADVENTURE_SUITE');
const polling = { polling: 100, timeout: 60000 };
const chapterMaps = ['pharping', 'mangyul', 'yarlung', 'samye', 'chimphu'];
const chapterOneRecords = ['pharping', 'yangleshoCave', 'asuraCave', 'vajrakilaya', 'phurba', 'droughtLegend'];
const startingQuests = {
  active: {},
  done: ['prologue.vow', 'prologue.north'],
  flags: { 'prologue.done': true, 'prologue.north.done': true, 'ch1.unlocked': true },
};
const unknownSection = { version: 48, nested: { marker: [1, 'preserve'] } };
const sections = {
  quests: startingQuests,
  waypoints: { unlocked: ['stupa', 'pharping'] },
  inventory: { bag: [], equipped: {}, turquoise: 321 },
  settings: { lang: 'en', muted: true },
  futureCompatibilityFixture: unknownSection,
};

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL && { channel: process.env.BROWSER_CHANNEL }),
  args: ['--enable-unsafe-swiftshader'],
});
const report = { browser: browser.version(), suite, scenarios: [], errors: [] };

async function contextWith(save) {
  const context = await browser.newContext({
    viewport: process.env.CI ? { width: 800, height: 600 } : { width: 1000, height: 720 },
    ...adventureCIOptions,
    reducedMotion: 'reduce',
  });
  await context.addInitScript(({ save, saveKey }) => {
    // Keep the read-only observation surfaces available across launcher links.
    sessionStorage.setItem('stupa.debug.unlocked', '1');
    if (save && localStorage.getItem(saveKey) === null) {
      localStorage.setItem(saveKey, JSON.stringify(save));
    }
  }, { save, saveKey });
  return context;
}

function observe(page, name) {
  console.log(`Starting ${name}`);
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push({ name, error: error.message }));
  return page;
}

async function saved(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
}

async function startAdventure(page) {
  await startAdventureWithInput(page);
  assert.equal(await page.evaluate(() => Boolean(window.__stupa.story)), false);
}

async function openStory(page) {
  await page.locator('.story-phone[open]').waitFor();
  if (process.env.CI) await page.evaluate(() => window.__stupa.storyArt.setQuality('low'));
  assert.equal(await page.evaluate(() => Boolean(window.__stupa.skills)), false);
}

async function reply(page, count) {
  await page.locator('.story-phone__actions button').first().click();
  assert.equal(await page.locator('.story-phone__message--outgoing').count(), count);
  await page.waitForFunction(({ key, count }) => {
    const choices = JSON.parse(localStorage.getItem(key))?.sections?.story?.choices || {};
    return Object.keys(choices).length === count;
  }, { key: saveKey, count }, polling);
}

async function equipWeapon(page, baseId) {
  const result = await page.evaluate(baseId => {
    const { inventory, vitals } = window.__stupa;
    const before = vitals.stats().atk;
    // An attack implicit is guaranteed for a normal mainhand; other drops are random.
    const item = inventory.give({ rarity: 'normal', baseId, ilvl: 8 });
    const equipped = inventory.equip(item?.uid);
    return { uid: item?.uid, equipped, equippedUid: inventory.getEquipped().mainhand?.uid, before, after: vitals.stats().atk };
  }, baseId);
  assert(result.uid, 'loot generator produces a mainhand weapon');
  assert.equal(result.equipped, true);
  assert.equal(result.equippedUid, result.uid);
  assert(result.after > result.before, 'equipping the weapon raises effective attack');
  return result;
}

async function combat(page) {
  // Read the immediate result in one browser task, before the animation loop
  // advances projectiles, regenerates MP or decrements cooldown.
  const cast = await page.evaluate(() => {
    const { bus, projectiles, skills, vitals } = window.__stupa;
    const events = [];
    const off = bus.on('skill:cast', ({ id }) => events.push(id));
    try {
      const before = { mp: vitals.stats().mp, projectiles: projectiles.count() };
      const succeeded = skills.cast('humBolt');
      const after = { mp: vitals.stats().mp, projectiles: projectiles.count() };
      const bolt = skills.getSkillState('humBolt');
      const repeated = skills.cast('humBolt');
      const mantraBefore = vitals.stats().mp;
      const mantra = skills.cast('mantra');
      return {
        before, after, bolt, succeeded, repeated, events,
        mantra, mantraSpent: mantraBefore - vitals.stats().mp,
        mantraCost: skills.getSkillState('mantra').mpCost,
      };
    } finally {
      off();
    }
  });
  assert.equal(cast.succeeded, true);
  assert.equal(cast.after.projectiles, cast.before.projectiles + 1);
  assert(cast.bolt.cooldownRemaining > 0);
  assert.equal(cast.repeated, false);
  assert.equal(cast.bolt.mpCost, 0, 'the basic bolt is free to cast');
  assert.equal(cast.after.mp, cast.before.mp);
  assert.equal(cast.mantra, true, 'combat-zone mantra casts with sufficient MP');
  assert(cast.mantraCost > 0);
  assert.equal(cast.mantraSpent, cast.mantraCost);
  assert.deepEqual(cast.events, ['humBolt', 'mantra']);
  return cast;
}

async function historicalAdventure() {
  // Returning campaign profile with earned waypoints and quest-reward entries.
  // Exercise the normal waypoint and Codex readers against that saved profile.
  const records = [...chapterOneRecords, 'mangyul', 'yarlungValley', 'samye', 'chimphu'];
  const context = await contextWith({
    version: 2,
    sections: {
      ...sections,
      quests: {
        active: {},
        done: [...startingQuests.done, 'ch1.drought', 'ch1.lamps', 'ch1.scrolls', 'ch1.kilaya',
          'ch2.envoy', 'ch2.tibet', 'ch3.valley', 'ch3.shampo', 'ch4.foundation', 'ch4.samye', 'ch5.tsogyal'],
        flags: { ...startingQuests.flags, 'ch1.done': true, 'ch2.unlocked': true, 'ch2.done': true,
          'ch3.unlocked': true, 'ch3.done': true, 'ch4.unlocked': true, 'ch4.done': true, 'ch5.unlocked': true },
      },
      codex: { unlocked: records, seen: [] },
      waypoints: { unlocked: ['stupa', ...chapterMaps] },
    },
  });
  const page = observe(await context.newPage(), 'historical-adventure');
  await page.goto(`${base}/?mode=adventure`);
  await startAdventure(page);
  const mapCount = await page.evaluate(() => window.__stupa.zones.list().length);
  assert(mapCount >= 9, 'the Adventure map catalog remains available');
  const gear = await equipWeapon(page, 'bronzeVajra');
  for (const id of chapterMaps) {
    console.log(`Traveling to ${id}`);
    const result = await page.evaluate(async id => {
      const { state, waypoints } = window.__stupa;
      const unlocked = waypoints.isUnlocked(id);
      const arrived = await waypoints.teleportTo(id);
      return { unlocked, arrived, zone: state.zone };
    }, id);
    assert.deepEqual(result, { unlocked: true, arrived: true, zone: id });
    if (id === 'pharping') report.combat = await combat(page);
  }
  for (const id of records) {
    const entry = await page.evaluate(id => window.__stupa.codex.getEntry(id), id);
    assert.equal(entry?.unlocked, true, id);
    assert(entry.body.length > 60 && entry.body !== entry.bodyKey, id);
    assert(entry.sources.length > 0 && entry.sources.every(source => source.url.startsWith('https://')), id);
  }
  await page.evaluate(() => window.__stupa.worldmap.open('codex', { codexId: 'pharping' }));
  await page.locator('.codex-reader__body').waitFor();
  assert.match(await page.locator('.codex-reader__title').innerText(), /Pharping/i);
  assert((await page.locator('.codex-source-link').count()) > 0);
  report.scenarios.push({ name: 'adventure-combat-equipment-historical-maps-codex', maps: chapterMaps, mapCount, records, gear });
  await context.close();
}

async function roundTrip() {
  const context = await contextWith({
    version: 2,
    sections: {
      ...sections,
      story: { version: 1, beat: 'prologue', evidence: [], choices: {}, flags: {}, clipsSeen: [], elapsedSeconds: 5 },
    },
  });
  const story = observe(await context.newPage(), 'mode-roundtrip');
  await story.goto(`${base}/?mode=story`);
  await openStory(story);
  await reply(story, 1);
  const firstStory = (await saved(story)).sections.story;
  await story.locator('.story-phone__close').click();
  await story.locator('.story-wordmark').click();
  await story.locator('a[href="?mode=adventure"]').click();
  await startAdventure(story);
  const gear = await equipWeapon(story, 'bronzeVajra');
  const locked = await story.evaluate(async ids => {
    const { state, waypoints } = window.__stupa;
    const origin = state.zone;
    const attempts = [];
    for (const id of ids) attempts.push({ id, unlocked: waypoints.isUnlocked(id), arrived: await waypoints.teleportTo(id) });
    return { origin, zone: state.zone, attempts };
  }, chapterMaps.slice(1));
  assert.equal(locked.origin, locked.zone);
  assert.deepEqual(locked.attempts, chapterMaps.slice(1).map(id => ({ id, unlocked: false, arrived: false })));

  // Adventure has no launcher link, so return to the launcher by document navigation.
  await story.goto(base);
  await story.locator('a[href="?mode=story"]').click();
  await openStory(story);
  assert.equal(await story.locator('.story-phone__message--outgoing').count(), 1);
  const afterRoundtrip = (await saved(story)).sections;
  assert.equal(afterRoundtrip.inventory.equipped.mainhand.uid, gear.uid);
  assert.equal(afterRoundtrip.inventory.turquoise, 321);
  assert.deepEqual(afterRoundtrip.quests, startingQuests);
  assert.deepEqual(afterRoundtrip.story.choices, firstStory.choices);
  assert.deepEqual(afterRoundtrip.futureCompatibilityFixture, unknownSection);
  report.scenarios.push({ name: 'same-origin-document-mode-roundtrip', locked: locked.attempts.map(attempt => attempt.id) });

  // Load the Adventure tab before the next story update. A stale serializer
  // overwriting the whole save would revert the other tab's phone history.
  const adventure = observe(await context.newPage(), 'concurrent-story-adventure');
  await adventure.goto(`${base}/?mode=adventure`);
  await startAdventure(adventure);
  const restored = await adventure.evaluate(() => ({
    weapon: window.__stupa.inventory.getEquipped().mainhand?.uid,
    quest: window.__stupa.quests.isDone('prologue.north'),
  }));
  assert.deepEqual(restored, { weapon: gear.uid, quest: true });
  await story.bringToFront();
  await reply(story, 2);
  const updatedStory = (await saved(story)).sections.story;
  await adventure.bringToFront();
  // A background Story animation tick must not repair a reverted save before
  // we can inspect Adventure's write.
  const storySession = await context.newCDPSession(story);
  await storySession.send('Page.setWebLifecycleState', { state: 'frozen' });
  const replacement = await equipWeapon(adventure, 'ironPhurba');
  await adventure.waitForFunction(({ key, uid }) =>
    JSON.parse(localStorage.getItem(key))?.sections?.inventory?.equipped?.mainhand?.uid === uid,
  { key: saveKey, uid: replacement.uid }, polling);
  const concurrent = (await saved(adventure)).sections;
  assert.deepEqual(concurrent.story.choices, updatedStory.choices, 'stale Adventure tab preserves newer phone replies');
  assert.deepEqual(concurrent.quests, startingQuests);
  assert.deepEqual(concurrent.futureCompatibilityFixture, unknownSection);
  await adventure.close();

  // The existing Story tab now has the stale Adventure snapshot.
  await storySession.send('Page.setWebLifecycleState', { state: 'active' });
  await storySession.detach();
  await story.bringToFront();
  await reply(story, 3);
  assert.equal((await saved(story)).sections.inventory.equipped.mainhand.uid, replacement.uid);
  await story.reload();
  await openStory(story);
  assert.equal(await story.locator('.story-phone__message--outgoing').count(), 3);
  const final = (await saved(story)).sections;
  assert.equal(final.inventory.equipped.mainhand.uid, replacement.uid);
  assert.deepEqual(final.quests, startingQuests);
  assert.deepEqual(final.futureCompatibilityFixture, unknownSection);
  report.scenarios.push({ name: 'two-tabs-story-and-adventure-preserve-both-writes', phoneReplies: 3 });
  assert.equal(firstStory.version, 2, 'v1 story inside the v2 root migrates');
  await context.close();
}

async function legacyRoot() {
  const context = await contextWith({ version: 1, vitals: { level: 8, exp: 17 }, settings: sections.settings });
  const page = observe(await context.newPage(), 'legacy-root');
  await page.goto(`${base}/?mode=adventure`);
  await startAdventure(page);
  assert.equal(await page.evaluate(() => window.__stupa.vitals.stats().level), 8);
  const migrated = await saved(page);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.sections.vitals.exp, 17);
  report.scenarios.push({ name: 'legacy-adventure-root-v1-migrates-to-v2' });
  await context.close();
}

async function localParty() {
  const context = await contextWith({ version: 2, sections });
  // Guarantee that seeing the other party member requires the actual
  // same-origin BroadcastChannel path rather than HTTP polling.
  await context.route('**/api/coop', route => route.fulfill({ status: 503, body: '' }));
  const host = observe(await context.newPage(), 'local-party-host');
  await host.goto(`${base}/?mode=adventure`);
  await startAdventure(host);
  const guest = observe(await context.newPage(), 'local-party-guest');
  await guest.goto(`${base}/?mode=adventure`);
  await startAdventure(guest);
  await host.bringToFront();
  await host.evaluate(() => window.__stupa.coopLobby.open());
  await host.locator('#btn-coop-create-room').click();
  const code = await host.evaluate(() => window.__stupa.coop.getState().roomCode);
  assert(code);
  await guest.bringToFront();
  // Use the room API here to isolate BroadcastChannel compatibility from the
  // lobby's synchronous name update, which rerenders and clears its input.
  assert.equal(await guest.evaluate(code => window.__stupa.coop.joinRoom(code), code), true);
  const hostId = await host.evaluate(() => window.__stupa.coop.getState().peerId);
  const guestId = await guest.evaluate(() => window.__stupa.coop.getState().peerId);
  // The host must send a fresh snapshot after the guest opens its channel.
  // Bring it to the foreground so the real game loop keeps ticking.
  await host.bringToFront();
  for (const [page, otherId] of [[host, guestId], [guest, hostId]]) {
    console.log(`Waiting for ${page === host ? 'host' : 'guest'} to see the other pilgrim`);
    await page.waitForFunction(id => {
      const party = window.__stupa.coop.getState();
      return party.partySize === 2 && party.members.some(member => member.id === id);
    }, otherId, polling);
  }
  await guest.bringToFront();
  await guest.evaluate(() => window.__stupa.coopLobby.open());
  await guest.locator('#btn-coop-leave-room').click();
  await host.waitForFunction(() => window.__stupa.coop.getPartySize() === 1, null, polling);
  report.scenarios.push({ name: 'local-broadcast-channel-party-join-and-leave', transport: 'same-origin tabs; HTTP disabled' });
  await context.close();
}

try {
  if (suite === 'all' || suite === 'adventure') await historicalAdventure();
  if (suite === 'all' || suite === 'party') await localParty();
  if (suite === 'all' || suite === 'save') {
    await legacyRoot();
    await roundTrip();
  }
  assert.deepEqual(report.errors, [], 'No uncaught browser errors');
  report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL';
  report.failure = error.stack;
  const pages = browser.contexts().flatMap(context => context.pages());
  report.failurePages = pages.map(page => page.url());
  await Promise.allSettled(pages.map((page, index) =>
    page.screenshot({ path: `${output}/failure-${index + 1}.png`, timeout: 5000 })));
  throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ result: report.result, scenarios: report.scenarios.map(scenario => scenario.name) }));
