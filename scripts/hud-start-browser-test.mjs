import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const output=process.env.STORY_ARTIFACTS||'artifacts/hud-start';
await mkdir(output,{recursive:true});
const base=process.env.STORY_BASE_URL||'http://127.0.0.1:4183';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
try {
 for(const width of [320,390,1280]) {
  const mobile=width<600;
  const ctx=await browser.newContext({viewport:{width,height:mobile?760:800},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
  await ctx.addInitScript(()=>sessionStorage.setItem('stupa.debug.unlocked','1'));
  const p=await ctx.newPage();p.setDefaultTimeout(60000);
  await p.goto(base+'/');
  await p.locator('#btn-begin').waitFor();
  assert.equal(await p.locator('#play-hud').evaluate(el=>el.inert),true);
  const activate=async selector=>mobile?p.locator(selector).tap():p.locator(selector).click();
  // No force or off-center input: invisible HUD must not intercept the normal target.
  await activate('#btn-begin');
  await p.waitForFunction(()=>window.__stupa?.state?.mode==='play');
  assert.equal(await p.locator('#play-hud').evaluate(el=>el.inert),false);
  await activate('#btn-hud-hide');
  assert.equal(await p.locator('#play-hud').evaluate(el=>el.inert),true);
  await activate('#btn-hud-restore');
  assert.equal(await p.locator('#play-hud').evaluate(el=>el.inert),false);
  await p.screenshot({path:`${output}/hud-${width}.png`});
  await activate('#top-controls [data-settings-open]');
  await p.locator('#game-settings[open]').waitFor();
  await activate('[data-mode-menu]');await activate('[data-mode-target="story"]');
  await p.locator('.story-phone[open]').waitFor();
  console.log(JSON.stringify({width,centerStart:'PASS',hudRestore:'PASS',chapterSwitch:'PASS'}));
  await ctx.close();
 }
}finally{await browser.close()}
