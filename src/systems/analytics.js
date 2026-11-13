/** Gameplay-entry analytics client — Issue #322. */
import { resolveApiUrl } from './community.js';

const RETRY_INTERVAL_SEC = 30;

export function createAnalytics(ctx, options = {}) {
  const mode = options.mode === 'story' ? 'story' : 'adventure';
  const endpoint = resolveApiUrl('/api/analytics/play', options.apiBase);
  let entered = false;
  let retryTimer = 0;
  let inFlight = false;
  let lastReceipt = null;
  let lastSessionToken = null;

  function currentTaipeiDay() {
    return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  async function report({ force = false } = {}) {
    if (!entered || inFlight || typeof fetch !== 'function') return false;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
    inFlight = true;
    let timeout = null;
    try {
      const sessionToken = ctx.cloudSave?.getSessionToken?.() || '';
      if (!force && lastReceipt?.day === currentTaipeiDay()
        && lastSessionToken === sessionToken) return true;
      const visitorId = ctx.save?.getInstallationIdAsync
        ? await ctx.save.getInstallationIdAsync()
        : ctx.save?.getInstallationId?.();
      if (!visitorId) return false;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (controller) timeout = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ visitorId, mode }),
        keepalive: true,
        ...(controller ? { signal: controller.signal } : {}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) return false;
      lastReceipt = { day: data.day, signedIn: Boolean(sessionToken) };
      lastSessionToken = sessionToken;
      retryTimer = 0;
      return true;
    } catch {
      return false;
    } finally {
      if (timeout) clearTimeout(timeout);
      inFlight = false;
    }
  }

  function enterGame() {
    entered = true;
    void report({ force: true });
  }

  function update(dt) {
    if (!entered || inFlight) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    retryTimer += Number(dt) || 0;
    if (retryTimer >= RETRY_INTERVAL_SEC) {
      retryTimer = 0;
      void report();
    }
  }

  ctx.bus?.on?.('cloudSave:signedIn', () => { if (entered) void report({ force: true }); });
  ctx.bus?.on?.('game:start', enterGame);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { if (entered) void report(); });
    document?.addEventListener?.('visibilitychange', () => {
      if (entered && document.visibilityState === 'visible') void report();
    });
  }

  const api = { enterGame, report, update, getState: () => ({ entered, inFlight, lastReceipt }) };
  ctx.analytics = api;
  return api;
}
