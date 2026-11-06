/**
 * Debug harness & console inspection API.
 * Attaches `window.__stupa` when enabled (in dev mode, with `?debug` query parameter,
 * or unlocked via the in-game GUI password `amitabha`).
 */
const DEBUG_UNLOCK_STORAGE_KEY = 'stupa.debug.unlocked';
export const DEBUG_PASSWORD = 'amitabha';

export function createDebug(ctx) {
  const isDev = Boolean(import.meta.env?.DEV);
  const hasQuery =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('debug');
  let hasSessionUnlock = false;
  try {
    hasSessionUnlock =
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(DEBUG_UNLOCK_STORAGE_KEY) === '1';
  } catch (_) {}

  const registeredApis = new Map();

  function attachWindowStupa() {
    if (typeof window === 'undefined') return;
    if (!window.__stupa) {
      window.__stupa = {};
    }
    window.__stupa.state = ctx.state;
    window.__stupa.bus = ctx.bus;
    window.__stupa.renderer = ctx.renderer;
    window.__stupa.scene = ctx.scene;
    window.__stupa.camera = ctx.camera;
    window.__stupa.register = (name, api) => {
      registeredApis.set(name, api);
      window.__stupa[name] = api;
    };
    for (const [name, api] of registeredApis.entries()) {
      window.__stupa[name] = api;
    }
  }

  const debugApi = {
    enabled: Boolean(isDev || hasQuery || hasSessionUnlock),
    unlockedByPassword: Boolean(hasQuery || hasSessionUnlock),
    enable() {
      debugApi.enabled = true;
      debugApi.unlockedByPassword = true;
      try {
        sessionStorage.setItem(DEBUG_UNLOCK_STORAGE_KEY, '1');
      } catch (_) {}
      attachWindowStupa();
      ctx.bus?.emit?.('debug:enabled', { enabled: true });
      return true;
    },
    unlock(password) {
      if (String(password || '').trim().toLowerCase() === DEBUG_PASSWORD) {
        return debugApi.enable();
      }
      return false;
    },
    register(name, api) {
      registeredApis.set(name, api);
      if (debugApi.enabled && typeof window !== 'undefined') {
        attachWindowStupa();
        window.__stupa[name] = api;
      }
    },
    update(dt) {},
  };

  if (debugApi.enabled) {
    attachWindowStupa();
  }

  ctx.debug = debugApi;
  return debugApi;
}
