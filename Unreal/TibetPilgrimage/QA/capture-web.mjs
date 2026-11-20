// Capture the original web game at fixed local camera positions with the real scene renderer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startAdventureWithInput, adventureBrowserArgs } from '../../../scripts/adventure-browser-start.mjs';

const [base, dest] = process.argv.slice(2);
if (!base || !dest) throw Error('Usage: node capture-web.mjs <local-game-url> <fresh-output-directory>');
const out = resolve(dest);
await mkdir(out);
const views = JSON.parse(await readFile(new URL('views.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'chrome', args: adventureBrowserArgs});
const report = {source:execFileSync('git', ['rev-parse','HEAD'], {encoding:'utf8'}).trim(), engine:'Web · Three.js', sourceURL:base, browser:browser.version(), views:[]};
try {
  const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.fulfill({status:200,body:''}));
  await page.goto(base + '/?mode=adventure&debug');
  await startAdventureWithInput(page);
  await page.addStyleTag({content:'#ui {visibility:hidden!important}'});
  for (const view of views) {
    const map = view.floor ? 'terma' : view.id;
    const result = await page.evaluate(async ({map,view}) => {
      const {cameraRig,camera,world,sky,vitals,quests,zones,scene,state,renderer} = window.__stupa;
      vitals.god(true);
      const flag = world.getMap(map).chapterIntro?.flag;
      if (flag) quests.setFlag(flag);
      if (map === 'samye') quests.setFlag('ch4.stage.4');
      await zones.teleport(map, {skipFade:true,silent:true});
      if (view.floor === 1) __stupa.dungeon.enter(1,20261120);
      if (view.floor) __stupa.dungeon.loadFloor(view.floor);
      const center = view.floor ? state.player.position : world.getMap(map).origin;
      const locate = ([x,y,z]) => [x+center.x,y,z+center.z];
      const eye = locate(view.webEye), look = locate(view.webLook);
      sky.setSeason('spring');
      sky.setTimeOverride({t:0.39,speed:0});
      const update = cameraRig.update;
      cameraRig.update = (dt) => {
        update(dt);
        camera.position.set(...eye);
        camera.lookAt(...look);
        camera.updateMatrixWorld();
      };
      window.restoreTibetView = () => { cameraRig.update = update; };
      for (let frame=0;frame<30;frame++) await new Promise(requestAnimationFrame);
      const gl=renderer.getContext();
      const debug=gl.getExtension('WEBGL_debug_renderer_info');
      return {map:state.zone,mode:state.mode, floor:view.floor ? __stupa.dungeon.getState().floor : undefined,
        eye:camera.position.toArray(),look,fov:camera.fov,size:[gl.drawingBufferWidth,gl.drawingBufferHeight],
        triangles:renderer.info.render.triangles,renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER)};
    },{map,view});
    assert.equal(result.map,map);
    assert.equal(result.mode,'play');
    assert(result.triangles>0,'Game renderer did not draw scene');
    if (view.floor) assert.equal(result.floor,view.floor);
    const png = await page.locator('#app canvas').screenshot({path:resolve(out,view.id+'.png')});
    await page.evaluate(()=>window.restoreTibetView());
    report.views.push({id:view.id,...result,sha256:createHash('sha256').update(png).digest('hex')});
    console.log(view.id,result.triangles);
  }
  assert.deepEqual(errors,[]);
  await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
} finally { await browser.close(); }
