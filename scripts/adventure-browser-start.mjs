import { setTimeout as delay } from 'node:timers/promises';

// Keep the real WebGL renderer and CSS viewport. Pin the software backend on
// Linux CI so Chrome's automatic GPU selection cannot vary across runners.
const linuxCI = Boolean(process.env.CI && process.platform === 'linux');
export const adventureCIOptions = process.env.CI ? { deviceScaleFactor: 0.25 } : {};
export const adventureBrowserArgs = [
  '--enable-unsafe-swiftshader',
  ...(linuxCI ? ['--use-gl=angle', '--use-angle=swiftshader'] : []),
];
const startupTimeout = linuxCI ? 120000 : 60000;

export async function waitForBrowserStartup(page, read, argument, description) {
  let observed;
  const controller = new AbortController();
  // Use a Node timer so a busy renderer cannot delay or starve the polling loop.
  const expired = delay(startupTimeout, null, { signal: controller.signal }).then(() => {
    throw new Error(`${description} timed out after ${startupTimeout} ms at ${page.url()}. Last state: ${JSON.stringify(observed)}`);
  });
  try {
    while (true) {
      observed = await Promise.race([page.evaluate(read, argument), expired]);
      if (observed.ready) return;
      await Promise.race([delay(150), expired]);
    }
  } finally {
    controller.abort();
  }
}

export async function startAdventureWithInput(page, { mobile = false } = {}) {
  await waitForBrowserStartup(page, () => {
    const quests = Boolean(window.__stupa?.quests);
    const save = Boolean(window.__stupa?.save);
    const button = Boolean(document.getElementById('btn-begin'));
    return { ready: quests && save && button, quests, save, button, document: document.readyState };
  }, null, 'Adventure title');
  const start = page.locator('#btn-begin');
  if (mobile) await start.tap();
  else await start.click();
  const studioStart = page.locator('#appearance-studio:not(.is-hidden) .app-footer__btn--primary');
  if (await studioStart.isVisible()) {
    if (mobile) await studioStart.tap();
    else await studioStart.click();
  }
  await waitForBrowserStartup(page, () => {
    const mode = window.__stupa?.state?.mode;
    return { ready: mode === 'play', mode };
  }, null, 'Adventure play state');
}
