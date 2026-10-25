/**
 * Debug harness & console inspection API.
 * Attaches `window.__stupa` when enabled (in dev mode or with `?debug` query parameter).
 */
export function createDebug(ctx) {
  const isDev = Boolean(import.meta.env?.DEV);
  const hasQuery =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('debug');
  const enabled = isDev || hasQuery;

  if (enabled && typeof window !== 'undefined') {
    if (!window.__stupa) {
      window.__stupa = {
        state: ctx.state,
        bus: ctx.bus,
        renderer: ctx.renderer,
        register(name, api) {
          window.__stupa[name] = api;
        },
      };
    }
  }

  const debugApi = {
    enabled,
    register(name, api) {
      if (enabled && typeof window !== 'undefined' && window.__stupa) {
        window.__stupa[name] = api;
      }
    },
    update(dt) {},
  };

  ctx.debug = debugApi;
  return debugApi;
}
