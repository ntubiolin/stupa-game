import { readFile } from 'node:fs/promises';
import { runQualityCapture } from './lib/quality-browser-capture.mjs';

const views = JSON.parse(await readFile(new URL('../Unreal/QA/toji-views.json', import.meta.url)));
await runQualityCapture({
  title: '東寺 UE 樣板的網頁對照', envPrefix: 'TOJI_CROSS',
  defaultOutput: 'artifacts/unreal-toji/web', defaultMap: 'toji', views,
  profiles: [['desktop', { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }]],
  mapAssets: { toji: { fallback: 'TojiProceduralLandmarksFallback', files: ['toji_gojunoto.glb', 'toji_kondo.glb', 'toji_kodo.glb'] } },
  async prepareView(page, view) {
    if (!view.player) return;
    await page.evaluate(([dx, dz]) => {
      const { state, world } = window.__stupa;
      const origin = world.getMap('toji').origin;
      const x = origin.x + dx, z = origin.z + dz;
      state.player.position.set(x, world.getHeight(x, z), z);
      state.player.heading = Math.PI;
      state.player.velocity.set(0, 0, 0);
    }, view.player);
  },
});
