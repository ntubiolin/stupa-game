import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.STORY_BASE_URL||'http://127.0.0.1:4176';
const out=process.env.STORY_ARTIFACTS||'artifacts/pharping';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{}),args:['--enable-unsafe-swiftshader']});
const report={scenarios:[],errors:[]};
try{
for(const mobile of [false,true]){
 const name=mobile?'mobile':'desktop';
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:process.env.CI ? .5 : mobile?2:1,isMobile:mobile,hasTouch:mobile});
 await context.addInitScript(()=>{if(!localStorage.getItem('stupa.save.v2'))localStorage.setItem('stupa.save.v2',JSON.stringify({version:2,sections:{story:{version:1,beat:'complete',evidence:[],choices:{'prologue.presence':'reply'},flags:{},clipsSeen:[],elapsedSeconds:100},inventory:{sentinel:'keep'},quests:{sentinel:'keep'},codex:{unlocked:['pharping']}}}));});
 const page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>report.errors.push(e.message));
 const click=async selector=>mobile? page.locator(selector).tap():page.locator(selector).click();
 const wait=checkpoint=>page.waitForFunction(id=>window.__stupa?.chapterScene?.getCheckpoint()===id,checkpoint);
 const shot=async id=>{console.log(name,id);await page.screenshot({path:out+'/'+name+'-'+id+'.jpg',type:'jpeg',quality:86});};
 await page.goto(base+'/?mode=story&debug=1');await page.waitForFunction(()=>window.__stupa?.chapters);
 await click('[data-card="continue"]');await click('[data-action="journal"]');
 await click('[data-chapter-action="start-pharping"]');await wait('backup');await click('[data-card="continue"]');
 await shot('spring1');
 const checkpoints=['backup','spring1','spring2','settle','channel1','channel2','wait','manuscript','cave','shadow','release','rain','lamp','phone','diary'];
 for(let i=0;i<checkpoints.length;i++){
  const id=checkpoints[i];await wait(id);
  if(id==='diary'){
   await click('.story-objective [data-action="interact"]');await shot('diary');await click('[data-chapter-action="read-diary"]');
  }else{
   if(await page.locator('[data-action="guide"]').isVisible())await click('[data-action="guide"]');
   const before=await page.evaluate(()=>__stupa.chapterScene.getSnapshot());
   await click('.story-objective [data-action="interact"]');
   if(['backup','settle','wait','shadow','release','lamp'].includes(id))await click('[data-card="continue"]');
   if(id==='phone')while(await page.locator('.story-phone[open]').isVisible())await click('.story-phone__actions .story-phone__action--primary');
   const next=checkpoints[i+1]||'complete';await wait(next);await page.waitForTimeout(1800);
   const after=await page.evaluate(()=>__stupa.chapterScene.getSnapshot());
   if(id.startsWith('spring'))assert(after.springStonesCleared>before.springStonesCleared);
   if(id.startsWith('channel'))assert(after.channelDebrisCleared>before.channelDebrisCleared);
   if(['spring2','channel2','release'].includes(id))await shot('after-'+id);
  }
  // Real saved checkpoint resume without debug transitions.
  await page.reload();await wait(checkpoints[i+1]||'complete');
 }
 await wait('complete');await click('[data-action="journal"]');await click('[data-chapter-action="sites"]');
 assert.equal(await page.locator('.chapter-journal details').count(),6);
 await click('[data-site-id="pharping"] summary');assert((await page.locator('[data-site-id="pharping"] a').count())>0);await shot('sites');
 await click('[data-chapter-action="journey"]');await click('[data-chapter-action="exit"]');await click('[data-card="continue"]');
 await click('[data-action="journal"]');await click('[data-chapter-action="replay-pharping"]');await wait('backup');await click('[data-card="continue"]');
 assert.equal((await page.evaluate(()=>__stupa.chapterScene.getSnapshot())).raining,false);
 await click('[data-action="journal"]');await click('[data-chapter-action="exit"]');await click('[data-card="continue"]');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('stupa.save.v2')).sections);
 assert.equal(stored.story.journey.chapters.pharping.completed,true);assert.equal(stored.story.journey.activeChapterId,null);
 assert.equal(stored.inventory.sentinel,'keep');assert.equal(stored.quests.sentinel,'keep');assert.deepEqual(stored.codex,{unlocked:['pharping']});
 report.scenarios.push({name,result:'PASS',checkpoints:16});await context.close();
}
assert.deepEqual(report.errors,[]);report.result='PASS';
}catch(error){report.result='FAIL';report.failure=error.stack;for(const ctx of browser.contexts())for(const p of ctx.pages()){report.body=await p.locator('body').innerText().catch(()=>null);await p.screenshot({path:out+'/failure.jpg'}).catch(()=>{});}throw error;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
