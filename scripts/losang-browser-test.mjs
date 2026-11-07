import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.LOSANG_ARTIFACTS || 'artifacts/losang';
const currentBase=process.env.STORY_BASE_URL || 'http://127.0.0.1:4175';
const baseline=process.env.LOSANG_BASELINE_URL; // Optional comparison server from pre-#90 build.
await mkdir(out,{recursive:true});
const browser=await chromium.launch({...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {}),headless:true,args:['--enable-unsafe-swiftshader']});
const results=[];
try {
for(const mobile of [false,true]) for(const before of (baseline ? [true,false] : [false])) {
 const name=`${mobile?'mobile':'desktop'}-${before?'before':'after'}`;
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
 await ctx.addInitScript(()=>{if(!localStorage.getItem('stupa.save.v2'))localStorage.setItem('stupa.save.v2',JSON.stringify({version:2,sections:{story:{version:1,beat:'losang',evidence:[],choices:{},flags:{},clipsSeen:[],elapsedSeconds:60},inventory:{sentinel:'preserve'},quests:{sentinel:'preserve'}}}));});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${before?baseline:currentBase}/?mode=story&debug=1`);
 await page.waitForFunction(()=>window.__stupa?.storyRuntime&&__stupa.story.getState().beat==='losang');
 // Same viewing pose in both builds, independent of changed accessible-guide framing.
 await page.evaluate(()=>__stupa.storyCamera.setPose({x:-26.5,y:1.68,z:13,yaw:Math.atan2(.5,3),pitch:-.14,fov:55}));
 for(const light of ['day','dusk']) {
  await page.evaluate(light=>__stupa.storyArt.setLighting(light),light);
  await page.waitForTimeout(350);
  await page.screenshot({path:`${out}/${name}-${light}.jpg`,type:'jpeg',quality:88});
 }
 const metric=await page.evaluate(()=>__stupa.storyRuntime.getMetrics());
 if(!before) {
   const hasLosangCollider=()=>__stupa.storyRuntime.ctx.colliders.some(c=>c.x===-27&&c.z===10&&c.r===.35);
   assert.equal(await page.evaluate(hasLosangCollider),true);
   await page.evaluate(()=>__stupa.story.skipTo('arrival'));
   await page.waitForFunction(()=>__stupa.storyRuntime.ctx.state.zone==='stupa'&&!__stupa.storyRuntime.ctx.colliders.some(c=>c.x===-27&&c.z===10&&c.r===.35));
   assert.equal(await page.evaluate(hasLosangCollider),false,'hidden Losang cannot block exploration');
   await page.evaluate(()=>__stupa.story.skipTo('losang'));
   await page.waitForFunction(hasLosangCollider);
   // Exercise actual guide control and ensure the returned pose faces the model.
   await page.locator('[data-action="guide"]').click();
   const pose=await page.evaluate(()=>__stupa.storyCamera.getPose());
   assert(Math.abs(pose.yaw-Math.atan2(.5,3))<.001);
   assert.equal(pose.pitch,-.14);
   // Walk towards the NPC to prove the new collision envelope prevents overlap.
   if(!mobile){
    await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');
    const p=await page.evaluate(()=>__stupa.storyCamera.getPose());
    assert(Math.hypot(p.x+27,p.z-10)>.35,'cannot walk through Losang');
    await page.locator('[data-action="guide"]').click();
   }
   await page.locator('.story-objective [data-action="interact"]').click();
   await page.screenshot({path:`${out}/${name}-dialogue.jpg`,type:'jpeg',quality:88});
   await page.keyboard.press('Escape');
   await page.locator('.story-objective [data-action="interact"]').click();
   for(let i=0;i<6;i++)await page.locator('[data-card="continue"]').click();
   await page.waitForFunction(()=>__stupa.story.getState().beat==='map');
   await page.reload();await page.waitForFunction(()=>window.__stupa?.storyRuntime&&__stupa.story.getState().beat==='map');
   const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('stupa.save.v2')).sections);
   assert.equal(save.inventory.sentinel,'preserve');assert.equal(save.quests.sentinel,'preserve');
   assert.equal(metric.pointLights,0);
 }
 assert.deepEqual(errors,[]);results.push({name,metric,result:'PASS'});console.log(name,'PASS',metric.drawCalls,metric.triangles);
 await ctx.close();
}
}finally{await writeFile(`${out}/report.json`,JSON.stringify(results,null,2));await browser.close();}
