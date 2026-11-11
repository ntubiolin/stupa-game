import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { adventureBrowserArgs, adventureCIOptions, startAdventureWithInput } from './adventure-browser-start.mjs';
import { JAPAN_CAMPAIGN_CHAPTERS } from '../src/data/japanCampaign.js';

const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.JAPAN_ARTIFACTS || 'artifacts/japan';
const saveKey = 'stupa.save.v2';
const route = ['qinglong', 'toji', 'kii', 'koyasan', 'kongobuji', 'okunoin'];
assert.deepEqual(JAPAN_CAMPAIGN_CHAPTERS.map(chapter => chapter.mapId), route);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: adventureBrowserArgs,
  ...(process.env.BROWSER_CHANNEL && { channel: process.env.BROWSER_CHANNEL }) });
const report = { browser: browser.version(), errors: [], screenshots: [], objectives: [], scenarios: [] };
let activePage;

async function contextFor({ mobile = false, saved = null } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1,
    ...adventureCIOptions, reducedMotion: 'reduce',
  });
  await context.addInitScript(({ saved, saveKey }) => {
    sessionStorage.setItem('stupa.debug.unlocked', '1');
    if (saved && localStorage.getItem(saveKey) === null) localStorage.setItem(saveKey, JSON.stringify(saved));
  }, { saved, saveKey });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push({ mobile, message: error.message }));
  await page.goto(`${base}/?mode=adventure&debug`);
  await startAdventureWithInput(page, { mobile });
  return { context, page };
}

async function shot(page, name) {
  const path = `${output}/${name}.png`;
  await page.screenshot({ path });
  const scene = await page.evaluate(() => {
    let lights = 0;
    __stupa.scene.traverse(object => { if (object.isPointLight) lights++; });
    return { map: __stupa.state.zone, lights, draws: __stupa.renderer.info.render.calls,
      triangles: __stupa.renderer.info.render.triangles };
  });
  assert(scene.lights <= 3, `${name}: Japan must add zero PointLights`);
  report.screenshots.push({ name, path, ...scene });
}

async function completed(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key))?.sections?.japanCampaign?.completedSteps || [], saveKey);
}

async function waitCompleted(page, id) {
  await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key))?.sections?.japanCampaign?.completedSteps?.includes(id), { key: saveKey, id }, { timeout: 60000 });
}

// Software WebGL may render only a few frames per wall-clock second. Physics
// uses capped dt, so input/settling checks must wait for actual simulation time.
async function waitGameTime(page, seconds) {
  const until = await page.evaluate(seconds => __stupa.state.elapsed + seconds, seconds);
  await page.waitForFunction(until => __stupa.state.elapsed >= until, until, { timeout: 60000 });
}

async function travel(page, mapId, mobile = false) {
  if (mobile) await page.locator('.minimap-ring-frame').tap();
  else await page.keyboard.press('m');
  await page.locator('#worldmap-modal:not(.is-hidden)').waitFor();
  const worldTab = page.locator('#worldmap-modal [data-tab="world"]');
  if (mobile) await worldTab.tap(); else await worldTab.click();
  const quick = page.locator(`[data-quick-tp="${mapId}"]`);
  if (!await quick.count()) {
    const routeButton = page.locator('[data-world-route="japan"]');
    if (mobile) await routeButton.tap(); else await routeButton.click();
    const node = page.locator(`[data-node-id="${mapId}"]`);
    if (mobile) await node.tap(); else await node.click();
  }
  const destination = await quick.count() ? quick : page.locator(`[data-tp-node="${mapId}"]`);
  if (mobile) await destination.tap(); else await destination.click();
  await page.waitForFunction(id => __stupa.state.zone === id && !__stupa.state.uiOpen, mapId);
  await page.waitForTimeout(1000);
}

// Fixture positioning avoids long commutes. The final approach uses real movement
// and all objectives use real keyboard/touch/dialogue controls, never progress APIs.
async function approach(page, step, { walk = false } = {}) {
  await page.evaluate(({ position, walk }) => {
    const { state, world, cameraRig } = __stupa;
    const z = position.z + (walk ? 4 : 1.5);
    state.player.position.set(position.x, world.getHeight(position.x, z), z);
    state.player.velocity.set(0, 0, 0);
    state.player.heading = 0;
    if (cameraRig.getAutoFollowMode() !== 'off') cameraRig.setAutoFollowMode('off');
    cameraRig.setYaw(0);
  }, { position: step.position, walk });
  await waitGameTime(page, 0.65);
  if (walk) {
    await page.keyboard.down('w');
    try {
      await page.waitForFunction(position => Math.hypot(__stupa.state.player.position.x - position.x, __stupa.state.player.position.z - position.z) < 2, step.position, { timeout: 60000 });
    } finally { await page.keyboard.up('w'); }
  }
}

async function finishDialogue(page, mobile = false) {
  for (let n = 0; n < 12; n++) {
    if (!await page.locator('#dialogue-overlay:not(.is-hidden)').isVisible()) return;
    const choice = page.locator('.dialogue-choice-btn').first();
    const next = page.locator('#dialogue-next-btn');
    if (await choice.isVisible()) { if (mobile) await choice.tap(); else await choice.click(); }
    else if (await next.isVisible()) { if (mobile) await next.tap(); else await next.click(); }
    await page.waitForTimeout(150);
  }
  assert.fail('Japan dialogue did not close after its choices');
}

async function runObjective(page, step) {
  console.log(`Japan objective: ${step.mapId}/${step.id} (${step.action})`);
  const before = await completed(page);
  if (step.action === 'cross') {
    await page.keyboard.down('w');
    try { await waitCompleted(page, step.id); }
    finally { await page.keyboard.up('w'); }
  } else await approach(page, step, { walk: step.action === 'walk' });
  if (!['walk', 'cross', 'bow'].includes(step.action)) {
    await page.waitForFunction(id => __stupa.state.interactionTarget?.id === `japan-campaign-${id}`, step.id, { timeout: 12000 });
    await page.keyboard.press('e');
  }
  if (step.action === 'talk') {
    await page.locator('#dialogue-overlay:not(.is-hidden)').waitFor();
    await finishDialogue(page);
  }
  if (step.action === 'ward') {
    const retreat = step.id === 'wardFire' ? 'a' : 's';
    await page.keyboard.down(retreat);
    try {
      await page.waitForFunction(position => Math.hypot(__stupa.state.player.position.x - position.x, __stupa.state.player.position.z - position.z) >= 6, step.position, { timeout: 60000 });
    } finally { await page.keyboard.up(retreat); }
  }
  if (step.action === 'bow') await page.keyboard.press('q');
  await waitCompleted(page, step.id);
  const after = await completed(page);
  assert.equal(after.length, before.length + 1, `${step.id}: exactly one objective completes`);
  report.objectives.push({ id: step.id, mapId: step.mapId, action: step.action });
}

async function checkObstacles(page) {
  await travel(page, 'kongobuji');
  await approach(page, { position: { x: 11000, z: -15.5 } });
  await page.keyboard.down('w');
  try { await waitGameTime(page, 1.3); }
  finally { await page.keyboard.up('w'); }
  const wallZ = await page.evaluate(() => __stupa.state.player.position.z);
  assert(wallZ >= -17 && wallZ < -14, `hall wall must block walking: z=${wallZ}`);
  await travel(page, 'okunoin');
  await approach(page, { position: { x: 11508, z: 6.5 } });
  await page.keyboard.down('w');
  try { await waitGameTime(page, 1.3); }
  finally { await page.keyboard.up('w'); }
  const bankZ = await page.evaluate(() => __stupa.state.player.position.z);
  assert(bankZ >= 5.5 && bankZ < 8, `river bank must block walking: z=${bankZ}`);
  await approach(page, { position: { x: 11500, z: 8 } });
  await page.keyboard.down('w');
  try {
    await page.waitForFunction(() => __stupa.state.player.position.z < -9, null, { timeout: 60000 });
  } finally { await page.keyboard.up('w'); }
  report.scenarios.push({ name: 'building and river collision; bridge passage', wallZ, bankZ });
}

async function enterJapan(page, mobile = false) {
  const settings = page.locator('#top-controls [data-settings-open]');
  if (mobile) {
    const more = page.locator('#btn-utility-more');
    if (!await settings.isVisible() && await more.isVisible()) await more.tap();
    await settings.tap();
  } else await settings.click();
  await page.locator('input[name="japanMode"][value="on"]').check();
  const entry = page.locator('[data-japan-tp="qinglong"]');
  if (mobile) await entry.tap(); else await entry.click();
  await page.waitForFunction(() => __stupa.state.zone === 'qinglong' && !__stupa.state.uiOpen);
  await page.waitForTimeout(800);
}

async function regionalSnapshot(page) {
  return page.evaluate(() => ({
    style: __stupa.scene.getObjectByName('Pilgrim').userData.pilgrimStyle,
    skills: __stupa.skills.list().map(({ id, abilityId, rank, enh, unlocked }) => ({ id, abilityId, rank, enh, unlocked })),
    appearance: __stupa.save.dump().sections.appearance,
    quests: __stupa.save.dump().sections.quests,
  }));
}

async function checkCompanion(page, mobile = false) {
  await page.evaluate(() => {
    __stupa.vitals.set({ hp: 50, mp: 80 });
    window.__japanCasts = [];
    __stupa.bus.on('skill:cast', event => window.__japanCasts.push(event.abilityId));
  });
  const button = page.locator(mobile ? '#btn-mobile-skill4' : '#skill-bar [data-slot="skill4"]');
  if (mobile) await button.tap(); else await button.click();
  await page.waitForFunction(() => Boolean(__stupa.skills.getJapanCompanion()));
  const first = await page.evaluate(() => ({
    companion: __stupa.skills.getJapanCompanion(),
    skill: __stupa.skills.getSkillState('skill4'),
    hp: __stupa.state.player.hp, mp: __stupa.state.player.mp,
    casts: window.__japanCasts.length,
  }));
  assert.equal(first.companion.id, 'kukai');
  assert(first.hp > 50, 'Kūkai restores health');
  assert(first.mp < 55, 'Dōgyō Ninin spends MP');
  assert(first.skill.cooldownRemaining > 20, 'companion has a real cooldown');
  if (mobile) await button.tap(); else await button.click();
  assert.equal(await page.evaluate(() => window.__japanCasts.length), first.casts, 'cooldown prevents duplicate summon');
  await page.waitForTimeout(300);
  await shot(page, mobile ? 'mobile-dogyo-ninin' : 'dogyo-ninin');
  if (!mobile) {
    const start = await page.evaluate(() => __stupa.state.player.position.toArray());
    await page.keyboard.down('w');
    try {
      await page.waitForFunction(start => Math.hypot(__stupa.state.player.position.x - start[0], __stupa.state.player.position.z - start[2]) >= 1.5, start, { timeout: 60000 });
    } finally { await page.keyboard.up('w'); }
    await page.waitForFunction(start => {
      const followed = __stupa.skills.getJapanCompanion();
      return followed && Math.hypot(followed.position[0] - start[0], followed.position[2] - start[2]) > 0.4;
    }, first.companion.position, { timeout: 60000 });
    const followed = await page.evaluate(() => __stupa.skills.getJapanCompanion());
    assert(Math.hypot(followed.position[0] - first.companion.position[0], followed.position[2] - first.companion.position[2]) > 0.4, 'Kūkai walks with the pilgrim');
  }
  report.scenarios.push({ name: mobile ? 'touch Dōgyō Ninin' : 'Dōgyō Ninin healing, MP, cooldown and follow', ...first });
}

async function checkSkillEffects(page) {
  const effects = [
    ['basic', 'SankoshoProjectile'], ['chant', 'KomyoShingonMandala'],
    ['skill1', 'FudoFlameSword'], ['skill2', 'GorinResonance'],
    ['skill3', 'AjikanMoonWard'], ['ultimate', 'DiamondRealmMandala'],
  ];
  for (const [slot, effect] of effects) {
    await page.evaluate(effect => {
      __stupa.vitals.set({ mp: 80 });
      __stupa.skills.fillUlt();
      window.__effectObserved = null;
      const off = __stupa.bus.on('skill:cast', event => {
        window.__effectObserved = { abilityId: event.abilityId,
          found: Boolean(__stupa.scene.getObjectByName(effect)) };
        off();
      });
    }, effect);
    await page.locator(`#skill-bar [data-slot="${slot}"]`).click();
    const observed = await page.evaluate(() => window.__effectObserved);
    assert(observed?.found, `${slot} creates its distinct ${effect} visual`);
    if (['skill1', 'skill3', 'ultimate'].includes(slot)) await shot(page, `skill-${slot}`);
    report.scenarios.push({ name: effect, ...observed });
    await page.waitForTimeout(500);
  }
}

async function nextGate(page, current, next) {
  const gate = await page.evaluate(({ current, next }) => __stupa.world.getMap(current).gates.find(gate => gate.to === next), { current, next });
  assert(gate, `${current} has a gate to ${next}`);
  await approach(page, { position: gate });
  await page.waitForFunction(id => __stupa.state.interactionTarget?.id === id, `gate-${current}-${gate.id}`);
  await page.keyboard.press('e');
  await page.waitForFunction(next => __stupa.state.zone === next, next);
  await page.waitForTimeout(800);
  report.scenarios.push({ name: 'normal forward gate', from: current, to: next });
}

try {
  const { page, context } = await contextFor();
  const original = await regionalSnapshot(page);
  await page.keyboard.press('m');
  await page.locator('#worldmap-modal [data-tab="world"]').click();
  assert.equal(await page.locator('.kukai-quick-travel-bar').isVisible(), false, 'Japan routes are opt-in');
  await page.keyboard.press('Escape');
  await enterJapan(page);
  const japan = await regionalSnapshot(page);
  assert.equal(japan.style, 'shingon');
  assert(japan.skills.every(skill => skill.unlocked && skill.abilityId !== skill.id), 'all Japan slots have their regional identity and temporary access');
  await checkCompanion(page);
  await page.locator('#btn-lang-toggle').click();
  await page.waitForFunction(() => document.getElementById('japan-emaki-title').textContent === 'Qinglong Temple');
  assert.match(await page.locator('#japan-campaign-tracker').innerText(), /Meet Huiguo/);
  assert.equal(await page.evaluate(() => __stupa.skills.getSkillState('skill4').name), 'Dōgyō Ninin');
  await page.locator('#btn-lang-toggle').click();
  await page.waitForFunction(() => document.getElementById('japan-emaki-title').textContent === '長安・青龍寺');
  report.scenarios.push({ name: 'live Chinese/English Japan labels', passed: true });
  await checkSkillEffects(page);
  await page.keyboard.press('m');
  await page.locator('#worldmap-modal [data-tab="world"]').click();
  await page.locator('[data-node-id="okunoin"]').click();
  assert.equal(await page.locator('[data-tp-node="okunoin"]').count(), 0, 'later chapters cannot be skipped through normal route travel');
  await shot(page, 'desktop-japan-route');
  await page.keyboard.press('Escape');

  for (const [index, chapter] of JAPAN_CAMPAIGN_CHAPTERS.entries()) {
    if (await page.evaluate(() => __stupa.state.zone) !== chapter.mapId) await travel(page, chapter.mapId);
    await page.evaluate(() => __stupa.sky.setTimeOverride({ t: 0.36 }));
    await shot(page, `desktop-${chapter.mapId}`);
    for (const step of chapter.steps) await runObjective(page, step);
    const next = route[index + 1];
    if (next) await nextGate(page, chapter.mapId, next);
    if (chapter.mapId === 'kii') {
      const progress = await completed(page);
      await page.reload();
      await startAdventureWithInput(page);
      assert.deepEqual(await completed(page), progress, 'campaign survives a real reload');
      report.scenarios.push({ name: 'reload after Kii', completedSteps: progress.length });
    }
  }
  assert.equal(await page.evaluate(() => __stupa.japanCampaign.getProgress().complete), true);
  await page.evaluate(() => __stupa.sky.setTimeOverride({ t: 0.04 }));
  await page.waitForFunction(() => __stupa.state.time.nightFactor > 0.9);
  await shot(page, 'okunoin-lantern-night');
  await checkObstacles(page);
  await page.evaluate(() => __stupa.vitals.set({ mp: 80 }));
  await page.locator('#skill-bar [data-slot="skill4"]').click();
  assert(await page.evaluate(() => Boolean(__stupa.skills.getJapanCompanion())));
  await travel(page, 'stupa');
  const returned = await regionalSnapshot(page);
  assert.equal(returned.style, 'himalayan');
  assert.deepEqual(returned.skills, original.skills, 'regional access never unlocks or rewrites original ranks');
  assert.deepEqual(returned.appearance, original.appearance, 'custom appearance restored');
  assert.deepEqual(returned.quests, original.quests, 'original quest progression preserved');
  assert.equal(await page.evaluate(() => __stupa.skills.getJapanCompanion()), null, 'companion cleaned on region exit');
  await shot(page, 'return-himalaya');
  const finishedSave = await page.evaluate(() => __stupa.save.dump());
  await context.close();

  const mobile = await contextFor({ mobile: true, saved: finishedSave });
  await enterJapan(mobile.page, true);
  assert.equal((await regionalSnapshot(mobile.page)).style, 'shingon');
  await checkCompanion(mobile.page, true);
  await travel(mobile.page, 'okunoin', true);
  await shot(mobile.page, 'mobile-okunoin');
  assert.equal(await mobile.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'mobile has no horizontal overflow');
  const tracker = await mobile.page.locator('#japan-campaign-tracker').boundingBox();
  assert(tracker && tracker.x >= 0 && tracker.x + tracker.width <= 391, 'mobile tracker remains in viewport');
  await mobile.context.close();
  assert.deepEqual(report.errors, [], 'no browser exceptions');
  report.scenarios.push({ name: 'six chapter campaign, all ordered actions, desktop/mobile and original save compatibility', passed: true });
  console.log(JSON.stringify({ objectives: report.objectives.length, screenshots: report.screenshots.length, errors: report.errors }, null, 2));
} catch (error) {
  report.failure = error.stack;
  if (activePage && !activePage.isClosed()) report.failureState = await activePage.evaluate(() => ({
    zone: __stupa.state.zone, position: __stupa.state.player.position.toArray(),
    action: __stupa.state.player.action, uiOpen: __stupa.state.uiOpen,
    progress: __stupa.japanCampaign?.getProgress(), target: __stupa.state.interactionTarget?.id,
  })).catch(() => null);
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
