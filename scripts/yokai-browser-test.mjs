import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startAdventureWithInput,adventureBrowserArgs} from './adventure-browser-start.mjs';
import {JAPAN_CAMPAIGN_STEPS} from '../src/data/japanCampaign.js';
const browser=await chromium.launch({...(process.env.BROWSER_CHANNEL && {channel:process.env.BROWSER_CHANNEL}),headless:true,args:adventureBrowserArgs});
const errors=[];
try{
const context=await browser.newContext({viewport:{width:1440,height:900}});
await context.addInitScript(steps=>{
 sessionStorage.setItem('stupa.debug.unlocked','1');
 localStorage.setItem('stupa.save.v2',JSON.stringify({version:2,sections:{settings:{japanMode:'on'},japanCampaign:{version:1,completedSteps:steps}}}));
},JAPAN_CAMPAIGN_STEPS.filter(s=>['qinglong','toji'].includes(s.mapId)).map(s=>s.id));
const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${process.env.STORY_BASE_URL || 'http://127.0.0.1:4173'}/?mode=adventure&debug`); await startAdventureWithInput(page);
await page.evaluate(async()=>{await __stupa.zones.teleport('kii');__stupa.vitals.god(true);});
for(const [id,kind] of [['kappaCreek','kappa'],['tenguForest','tengu'],['oniPass','akaOni']]){
 await page.evaluate(id=>{
  const g=__stupa.world.getMap('kii').gates.find(g=>g.to===id);
  __stupa.state.player.position.set(g.x,0,g.z+1);
  __stupa.state.player.velocity.set(0,0,0);
 },id);
 await page.waitForFunction(id=>__stupa.state.interactionTarget?.id.includes(id),id);
 await page.keyboard.press('e'); await page.waitForFunction(id=>__stupa.state.zone===id,id);
 await page.waitForFunction(kind=>__stupa.enemies.list().some(e=>e.kind===kind),kind);
 const stats=await page.evaluate(()=>({enemies:__stupa.enemies.list(),skills:__stupa.skills.list().map(s=>s.abilityId),map:__stupa.world.getMap().id}));
 assert(stats.enemies.every(e=>e.kind===kind),`${id} own enemy roster`);
 await page.evaluate(()=>{const e=__stupa.enemies.list().find(e=>!e.rank||e.rank==='normal')||__stupa.enemies.list()[0];__stupa.state.player.position.set(e.x,0,e.z+3);__stupa.state.player.heading=0;__stupa.state.player.velocity.set(0,0,0);});
 await page.waitForTimeout(1200);
 await page.screenshot({path:`/private/tmp/${id}.png`});
 const kill=await page.evaluate(()=>{const e=__stupa.enemies.list()[0];return __stupa.enemies.damage(e.id,100000,{type:'magic'});});
 assert.equal(kill.liberated,true,`${id} enemy damage/liberation`);
 await page.evaluate(()=>{const g=__stupa.world.getMap().gates[0];__stupa.state.player.position.set(g.x,0,g.z-1);__stupa.state.player.velocity.set(0,0,0);});
 await page.waitForFunction(()=>__stupa.state.interactionTarget?.kind==='gate');await page.keyboard.press('e');
 await page.waitForFunction(()=>__stupa.state.zone==='kii'); await page.waitForTimeout(900);
 console.log(JSON.stringify({id,enemies:stats.enemies.length,returned:true}));
}
await page.keyboard.press('m');await page.locator('#worldmap-modal:not(.is-hidden)').waitFor();
await page.locator('#worldmap-modal [data-tab="world"]').click();
await page.locator('[data-node-id="kappaCreek"]').click();await page.locator('[data-tp-node="kappaCreek"]').click();
await page.waitForFunction(()=>__stupa.state.zone==='kappaCreek'&&!__stupa.state.uiOpen);
assert.deepEqual(errors,[]);console.log('Yokai browser acceptance passed');
}finally{await browser.close();}
