import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startAdventureWithInput, adventureBrowserArgs } from './adventure-browser-start.mjs';
const browser = await chromium.launch({...(process.env.BROWSER_CHANNEL && {channel:process.env.BROWSER_CHANNEL}),headless:true,args:adventureBrowserArgs});
const errors=[];
try {
for (const mobile of [false,true]) {
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
 await context.addInitScript(()=>sessionStorage.setItem('stupa.debug.unlocked','1'));
 const page=await context.newPage(); page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.STORY_BASE_URL || 'http://127.0.0.1:4173'}/?mode=adventure&debug`);
 await startAdventureWithInput(page,{mobile});
 await page.evaluate(()=>{
  const m=__stupa.scene.getObjectByName('Monkeys').children[0];
  const p=m.position; const r=Math.hypot(p.x,p.z);
  __stupa.state.player.position.set(p.x*(r+2)/r,0,p.z*(r+2)/r);
  __stupa.state.player.velocity.set(0,0,0);
  __stupa.state.player.heading=Math.atan2(p.x,p.z);
  window.feedEvents=0; __stupa.bus.on('monkey:fed',()=>feedEvents++);
 });
 await page.waitForFunction(()=>__stupa.state.interactionTargetsByAction?.feed?.kind==='monkey');
 if(mobile) await page.locator('.prompt-pill').filter({hasText:'餵猴'}).tap(); else await page.keyboard.press('f');
 const modal=page.locator('.monkey-game:not(.is-hidden)');
 await modal.waitFor();
 await modal.locator('[data-action="close"]').click();
 assert.equal(await page.evaluate(()=>__stupa.state.uiOpen),false,'cancel releases input');
 if(mobile) await page.locator('.prompt-pill').filter({hasText:'餵猴'}).tap(); else await page.keyboard.press('f'); await modal.waitFor();
 const click=async locator=>mobile?locator.tap():locator.click();
 await click(modal.locator('[data-action="start"]'));
 await page.screenshot({path:`${process.env.MONKEY_ARTIFACTS || '/private/tmp'}/monkey-${mobile?'mobile':'desktop'}.png`});
 for(let i=0;i<5;i++){
  const request=await page.locator('.monkey-game__request').evaluate(el=>Object.entries({banana:'香蕉',apple:'蘋果',peach:'桃子'}).find(([,name])=>el.textContent.includes(name))[0]);
  if(!mobile) await page.keyboard.press(String(['banana','apple','peach'].indexOf(request)+1));
  else await click(modal.locator(`[data-fruit="${request}"]`));
 }
 await modal.locator('[data-action="start"]').waitFor();
 assert.equal(await page.evaluate(()=>feedEvents),1,'one reward');
 assert.equal(await page.evaluate(()=>__stupa.save.dump().sections.monkeyGame.bestScore),5);
 await click(modal.locator('[data-action="start"]'));
 for(let i=0;i<5;i++){
  const request=await page.locator('.monkey-game__request').evaluate(el=>Object.entries({banana:'香蕉',apple:'蘋果',peach:'桃子'}).find(([,name])=>el.textContent.includes(name))[0]);
  await click(modal.locator(`[data-fruit="${request}"]`));
 }
 assert.equal(await page.evaluate(()=>feedEvents),1,'replay no repeat reward');
 await click(modal.locator('[data-action="close"]'));
 assert.equal(await page.evaluate(()=>__stupa.state.uiOpen),false,'completion releases input');
 await page.evaluate(()=>__stupa.save.flush());
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('stupa.save.v2')).sections.monkeyGame.bestScore),5);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 assert.equal(overflow,false,'mobile fits viewport');
 console.log(JSON.stringify({mobile,result:'pass',best:5,feedEvents:1}));
 await context.close();
}
assert.deepEqual(errors,[]); console.log('Monkey browser acceptance passed');
} finally {await browser.close();}
