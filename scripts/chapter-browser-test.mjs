import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { CHAPTERS } from '../src/data/story/chapters.js';
const base=process.env.STORY_BASE_URL||'http://127.0.0.1:4176';
const out=process.env.STORY_ARTIFACTS||'artifacts/chapters';
const selected=process.env.CHAPTER_SUITE?.split(',')||CHAPTERS.slice(1).map(c=>c.id);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{}),args:['--enable-unsafe-swiftshader']});
const report={scenarios:[],errors:[]};
try {
for(const mobile of [false,true])for(const id of selected){
 const def=CHAPTERS.find(c=>c.id===id);assert(def);
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},deviceScaleFactor:process.env.CI ? .5 : 1,isMobile:mobile,hasTouch:mobile});
 const previous=Object.fromEntries(CHAPTERS.slice(0,CHAPTERS.indexOf(def)).map(c=>[c.id,{checkpointId:'complete',completed:true,choices:{},flags:{}}]));
 await context.addInitScript(previous=>{sessionStorage.setItem('stupa.debug.unlocked','1');if(!localStorage.getItem('stupa.save.v2'))localStorage.setItem('stupa.save.v2',JSON.stringify({version:2,sections:{story:{version:2,beat:'complete',evidence:[],choices:{},flags:{},clipsSeen:[],journey:{activeChapterId:null,chapters:previous}},preserve:{value:93}}}));},previous);
 const page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',error=>report.errors.push({id,error:error.message}));
 const click=async selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
 const wait=checkpoint=>page.waitForFunction(checkpoint=>window.__stupa?.chapterScene?.getCheckpoint()===checkpoint,checkpoint);
 await page.goto(base+'/?mode=story&debug=1');await click('[data-card="continue"]');await click('[data-action="journal"]');await click('[data-chapter-action="start-'+id+'"]');
 for(const [index,step] of def.checkpoints.entries()){
  await wait(step.id);console.log(mobile?'mobile':'desktop',id,step.id);
  assert(!/mirror\.chapter\./.test(await page.locator('.story-objective').innerText()),'localized HUD');
  if(!step.signal)break;
  if(await page.locator('[data-action="guide"]').isVisible())await click('[data-action="guide"]');
  if(index===0||['release','rebuild','light','flags'].includes(step.id))await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-${id}-${step.id}.jpg`,quality:85});
  await click('.story-objective [data-action="interact"]');
  if(step.id==='diary')await click('[data-chapter-action="read-diary"]');
  else if(step.choices)await click('[data-card-choice="'+(mobile?'retain':'end')+'"]');
  else if(step.presentation==='card'||step.id.startsWith('altar'))await click('[data-card="continue"]');
  await wait(def.checkpoints[index+1].id);await page.waitForTimeout(1600);
  // Reload genuine checkpoint, without debug advancement.
  await page.reload();await wait(def.checkpoints[index+1].id);
 }
 await click('[data-action="journal"]');await click('[data-chapter-action="sites"]');
 for(const siteId of def.siteIds)assert.equal(await page.locator(`[data-site-id="${siteId}"]`).count(),1,siteId+' original record');
 await click(`[data-site-id="${def.siteIds[0]}"] summary`);assert(!/codex\.[a-zA-Z]+\.(body|title|name)/.test(await page.locator('.chapter-journal').innerText()));
 await click('[data-chapter-action="journey"]');await click('[data-chapter-action="exit"]');await click('[data-card="continue"]');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('stupa.save.v2')).sections);assert.equal(saved.preserve.value,93);assert.equal(saved.story.journey.chapters[id].completed,true);
 if(id==='finale')assert.equal(saved.story.journey.chapters.finale.choices.decision,mobile?'retain':'end');
 await click('[data-action="journal"]');await click('[data-chapter-action="replay-'+id+'"]');await wait(def.entryCheckpoint);
 await click('[data-action="journal"]');await click('[data-chapter-action="exit"]');await click('[data-card="continue"]');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('stupa.save.v2')).sections.story.journey),saved.story.journey);
 report.scenarios.push({id,mobile,checkpoints:def.checkpoints.length,result:'PASS'});await context.close();
}
assert.deepEqual(report.errors,[]);report.result='PASS';
}catch(error){report.result='FAIL';report.failure=error.stack;for(const ctx of browser.contexts())for(const page of ctx.pages()){await page.screenshot({path:out+'/failure.jpg'}).catch(()=>{});report.body=await page.locator('body').innerText().catch(()=>null);}throw error;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
