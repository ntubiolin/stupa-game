// Fixed daylight/cameras in the actual game, without HUD, for repeatable art QA.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startAdventureWithInput, adventureBrowserArgs } from './adventure-browser-start.mjs';
const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
const label = process.env.JAPAN_ART_LABEL || 'after';
const output = process.env.JAPAN_ARTIFACTS || 'artifacts/japan-art';
const views = [
  ['toji', 'kondo', [23, 12, 42], [0, 6, 8]],
  ['toji', 'triad', [0, 4.8, 19.5], [0, 4.7, 7.3]],
  ['toji', 'kodo', [14, 7, -14], [0, 4.5, -36]],
  ['toji', 'pond', [53, 8, 5], [33, 3, -17]],
  ['koyasan', 'daito', [-43, 13, 34], [-62, 10, 6]],
  ['koyasan', 'garden', [22, 8, 5], [0, 1, -15]],
  ['kongobuji', 'garden', [16, 9, 17], [-2, 1, -12]],
  ['kongobuji', 'gallery', [15, 2.25, 7.1], [-4.5, 1.05, -10]],
  ['kongobuji', 'hall', [19, 3, -10], [-3, 3.45, -24]],
  ['kii', 'cedars', [10, 4, 20], [-8, 6, -16]],
  ['okunoin', 'avenue', [0, 3, 47], [0, 7, 3]],
  ['qinglong', 'precinct', [17, 8, 30], [0, 4, -12]],
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: adventureBrowserArgs,
  ...(process.env.BROWSER_CHANNEL && { channel: process.env.BROWSER_CHANNEL }) });
const report = { label, errors: [], views: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('stupa.debug.unlocked', '1'));
  await page.goto(`${base}/?mode=adventure&debug`);
  await startAdventureWithInput(page);
  for (const [map, view, from, at] of views) {
    await page.evaluate(map => __stupa.zones.teleport(map, { skipFade: true }), map);
    if (map === 'toji') await page.waitForFunction(() => __stupa.scene.getObjectByName('TojiProceduralLandmarksFallback')?.visible === false);
    if (map === 'koyasan') await page.waitForFunction(() => __stupa.scene.getObjectByName('DanjoGaran_KonponDaito_Fallback')?.visible === false);
    await page.evaluate(() => __stupa.sky.setTimeOverride({ t: 0.39 }));
    await page.waitForTimeout(400);
    const data = await page.evaluate(({ map, from, at }) => {
      const { camera, renderer, scene, world } = __stupa;
      const { x, z } = world.getMap(map).origin;
      camera.position.set(x + from[0], from[1], z + from[2]);
      camera.lookAt(x + at[0], at[1], z + at[2]);
      renderer.render(scene, camera);
      let pointLights = 0; scene.traverse(o => { if (o.isPointLight) pointLights++; });
      return { png: renderer.domElement.toDataURL('image/png').split(',')[1],
        render: { ...renderer.info.render }, memory: { ...renderer.info.memory }, pointLights };
    }, { map, from, at });
    const { png, ...metrics } = data;
    assert(data.pointLights <= 3, `${map}: no new PointLights`);
    const file = `${output}/${label}-${map}-${view}.png`;
    await writeFile(file, Buffer.from(png, 'base64'));
    report.views.push({ map, view, file, ...metrics });
    console.log(map, view, metrics.render.calls, metrics.render.triangles);
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(`${output}/${label}-scene-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
