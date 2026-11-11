import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { adventureBrowserArgs, adventureCIOptions, startAdventureWithInput } from './adventure-browser-start.mjs';

const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.JAPAN_COLLISION_ARTIFACTS || 'artifacts/japan-collision';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: adventureBrowserArgs,
  ...(process.env.BROWSER_CHANNEL && { channel: process.env.BROWSER_CHANNEL }) });
const report = { scenarios: [], errors: [] };
let page;

async function simulation(seconds) {
  const until = await page.evaluate(seconds => __stupa.state.elapsed + seconds, seconds);
  await page.waitForFunction(until => __stupa.state.elapsed >= until, until, { timeout: 60000 });
}

async function approach(name, start, yaw, axis, expected) {
  await page.evaluate(({ start, yaw }) => {
    const { state, world, cameraRig } = __stupa;
    state.player.position.set(start[0], world.getHeight(...start), start[1]);
    state.player.velocity.set(0, 0, 0);
    cameraRig.setAutoFollowMode('off');
    cameraRig.setYaw(yaw);
    cameraRig.setDistance(8);
  }, { start, yaw });
  await simulation(1);
  await page.keyboard.down('w');
  try { await simulation(3); }
  finally { await page.keyboard.up('w'); }
  await simulation(0.3);
  const position = await page.evaluate(() => ({ x: __stupa.state.player.position.x, z: __stupa.state.player.position.z }));
  report.scenarios.push({ name, position, axis, expected });
  await page.screenshot({ path: `${output}/${name}.png` });
  // Both bounds matter: the player must reach the rendered obstacle, then stop.
  assert.ok(Math.abs(position[axis] - expected) < 0.08,
    `${name}: expected ${axis}=${expected} at visible surface, got ${position[axis]}`);
}

try {
  for (const fallback of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 850 }, ...adventureCIOptions });
    page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    let failedRequest = false;
    if (fallback) await page.route('**/models/kukai/toji_kondo.glb', async route => {
      failedRequest = true;
      await route.abort('failed');
    });
    await page.goto(`${base}/?mode=adventure&debug`);
    await startAdventureWithInput(page);
    await page.evaluate(() => __stupa.zones.teleport('toji', { skipFade: true, silent: true }));
    if (fallback) {
      await page.waitForFunction(() => __stupa.scene.getObjectByName('TojiProceduralLandmarksFallback')?.visible === true);
      await simulation(1);
      assert.ok(failedRequest, 'the actual Kondō GLB request must fail');
      await approach('fallback-kondo-front', [7500, 21], 0, 'z', 18.59);
      await approach('fallback-kondo-side', [7517, 8], Math.PI / 2, 'x', 7514.55);
    } else {
      await page.waitForFunction(() => __stupa.scene.getObjectByName('TojiProceduralLandmarksFallback')?.visible === false);
      await approach('loaded-kondo-front', [7500, 20], 0, 'z', 16.925);
      await approach('loaded-kondo-side', [7516, 8], Math.PI / 2, 'x', 7511.725);
      await approach('loaded-kodo-bench-gap', [7503, -24], 0, 'z', -28.8375);
      await approach('loaded-pagoda-fence', [7546, 22], Math.PI / 2, 'x', 7544.2145);
      await approach('loaded-pagoda-podium', [7543, 22], Math.PI / 2, 'x', 7542.9125);
      await page.evaluate(() => __stupa.zones.teleport('koyasan', { skipFade: true, silent: true }));
      await page.waitForFunction(() => __stupa.scene.getObjectByName('DanjoGaran_KonponDaito_Fallback')?.visible === false);
      await approach('loaded-daito-east-stair', [7950, 6], Math.PI / 2, 'x', 7947);
    }
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
