// Adventure's post-processing runs on software WebGL in CI. Lower only
// framebuffer resolution so gameplay checks keep the real renderer and CSS viewport.
export const adventureCIOptions = process.env.CI ? { deviceScaleFactor: 0.25 } : {};

const polling = { polling: 100, timeout: 60000 };

export async function startAdventureWithInput(page, { mobile = false } = {}) {
  await page.waitForFunction(() => window.__stupa?.quests && window.__stupa?.save &&
    document.getElementById('btn-begin'), null, polling);
  const start = page.locator('#btn-begin');
  if (mobile) await start.tap();
  else await start.click();
  await page.waitForFunction(() => window.__stupa?.state?.mode === 'play', null, polling);
}
