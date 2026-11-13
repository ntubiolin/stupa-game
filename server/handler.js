/**
 * Unified HTTP API Middleware & Serverless Handler (`server/handler.js`) — Issue #173
 *
 * Mountable in:
 *  - Vite dev & preview servers (`vite.config.js`)
 *  - Standalone Node HTTP + WebSocket server (`server/index.js`)
 *  - Vercel / Serverless Functions (`api/community.js`, `api/coop.js`, `api/presence.js`)
 */
import { getDefaultStore } from './store.js';

export const MAX_HTTP_BODY_BYTES = 64 * 1024;
export const MAX_SAVE_HTTP_BODY_BYTES = 96 * 1024;
export const COMMUNITY_RATE_WINDOW_MS = 10000;
export const COMMUNITY_RATE_MAX_REQ = 40;
export const SAVE_RATE_WINDOW_MS = 10000;
export const SAVE_RATE_MAX_REQ = 60;

export function readJsonBody(req, maxBytes = MAX_HTTP_BODY_BYTES) {
  if (req.body && typeof req.body === 'object') {
    const rawLen = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
    if (rawLen > maxBytes) return Promise.resolve({ __tooLarge: true });
    return Promise.resolve(req.body);
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    if (Buffer.byteLength(req.body, 'utf8') > maxBytes) {
      return Promise.resolve({ __tooLarge: true });
    }
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.resolve({});
    }
  }
  return new Promise((resolve) => {
    let body = '';
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        body = '';
      } else if (!tooLarge) {
        body += chunk.toString('utf8');
      }
    });
    req.on('end', () => {
      if (tooLarge) {
        resolve({ __tooLarge: true });
        return;
      }
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, X-Stupa-Session',
  );
}

export function sendJson(res, data, status = 200) {
  setCorsHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function createApiMiddleware(store = getDefaultStore(), wsHub = null) {
  let activeWsHub = wsHub;
  const communityRateBuckets = new Map();
  const saveRateBuckets = new Map();

  function getClientIp(req) {
    const xff = req.headers?.['x-forwarded-for'];
    return (
      (typeof xff === 'string' && xff.split(',')[0].trim()) ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  function checkRateBucket(bucketMap, key, windowMs, maxReq) {
    const now = Date.now();
    if (bucketMap.size > 2000) {
      bucketMap.clear();
    }
    const prev = bucketMap.get(key) || [];
    const recent = prev.filter((ts) => now - ts < windowMs);
    if (recent.length >= maxReq) {
      bucketMap.set(key, recent);
      return false;
    }
    recent.push(now);
    bucketMap.set(key, recent);
    return true;
  }

  function checkCommunityRateLimit(req) {
    return checkRateBucket(
      communityRateBuckets,
      getClientIp(req),
      COMMUNITY_RATE_WINDOW_MS,
      COMMUNITY_RATE_MAX_REQ,
    );
  }

  function checkSaveRateLimit(req, uid = null) {
    const key = uid ? `uid:${uid}` : `ip:${getClientIp(req)}`;
    return checkRateBucket(
      saveRateBuckets,
      key,
      SAVE_RATE_WINDOW_MS,
      SAVE_RATE_MAX_REQ,
    );
  }

  const middleware = async function apiMiddleware(req, res, next) {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    if (!pathname.startsWith('/api/')) {
      if (typeof next === 'function') return next();
      return false;
    }

    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.statusCode = 204;
      res.end();
      return true;
    }

    // 1. Health Endpoint
    if (pathname === '/api/health') {
      const { zoneCounts, totalOnline } = store.computeZoneCounts();
      sendJson(res, {
        ok: true,
        status: 'healthy',
        totalOnline,
        zoneCounts,
        uptime: process.uptime(),
      });
      return true;
    }

    // 2. Community Persistence & Dedication Sync
    if (pathname === '/api/community') {
      if (req.method === 'GET') {
        const state = store.getCommunityState();
        sendJson(res, { ok: true, ...state, data: state });
        return true;
      }
      if (req.method === 'POST') {
        if (!checkCommunityRateLimit(req)) {
          sendJson(res, { ok: false, error: 'Too many requests' }, 429);
          return true;
        }
        const body = await readJsonBody(req);
        if (body?.__tooLarge) {
          sendJson(res, { ok: false, error: 'Payload too large' }, 413);
          return true;
        }
        const authUser = store.auth?.extractAuthUser?.(req) || null;
        const action = body?.action || (Array.isArray(body?.actions) ? 'batch' : '');
        let payload =
          action === 'batch' && Array.isArray(body?.actions)
            ? { actions: body.actions }
            : body?.payload;

        if (action === 'batch' && Array.isArray(payload?.actions)) {
          payload = {
            actions: payload.actions.map((item) => {
              if (!item || typeof item !== 'object') return item;
              const itemPayload =
                item.payload && typeof item.payload === 'object'
                  ? { ...item.payload }
                  : {};
              if (authUser?.uid) {
                itemPayload.ownerUid = authUser.uid;
              } else {
                delete itemPayload.ownerUid;
              }
              return { ...item, payload: itemPayload };
            }),
          };
        } else if (payload && typeof payload === 'object') {
          payload = { ...payload };
          if (authUser?.uid) {
            payload.ownerUid = authUser.uid;
          } else {
            delete payload.ownerUid;
          }
        }

        const state = store.applyCommunityAction(action, payload);
        if (action) {
          activeWsHub?.broadcastCommunity?.(action, payload, state);
        }
        sendJson(res, { ok: true, ...state, data: state });
        return true;
      }
      sendJson(res, { ok: false, error: 'Method not allowed' }, 405);
      return true;
    }

    // 2b. Google Authentication & Session Verification (`/api/auth/google`, `/api/auth/session`)
    if (pathname === '/api/auth/google') {
      if (req.method !== 'POST') {
        sendJson(res, { ok: false, error: 'Method not allowed' }, 405);
        return true;
      }
      if (!checkSaveRateLimit(req)) {
        sendJson(res, { ok: false, error: 'Too many requests' }, 429);
        return true;
      }
      const body = await readJsonBody(req);
      if (body?.__tooLarge) {
        sendJson(res, { ok: false, error: 'Payload too large' }, 413);
        return true;
      }
      const idToken = body?.idToken || body?.credential || null;
      const devProfile = body?.devProfile || null;
      const authResult = await store.auth.authenticateGoogle({
        idToken,
        devProfile,
      });
      if (!authResult.ok) {
        sendJson(
          res,
          { ok: false, error: authResult.error || 'Unauthorized' },
          authResult.status || 401,
        );
        return true;
      }
      if (authResult.user?.authType === 'google') {
        try {
          store.analytics.recordGoogleSignIn(authResult.user.uid);
        } catch {
          sendJson(res, { ok: false, error: 'analytics-persistence-failed' }, 500);
          return true;
        }
      }
      sendJson(res, {
        ok: true,
        sessionToken: authResult.sessionToken,
        expiresAt: authResult.expiresAt,
        user: authResult.user,
      });
      return true;
    }

    // A player becomes active only after a runtime confirms actual game entry.
    if (pathname === '/api/analytics/play') {
      if (req.method !== 'POST') {
        sendJson(res, { ok: false, error: 'Method not allowed' }, 405);
        return true;
      }
      if (!checkSaveRateLimit(req)) {
        sendJson(res, { ok: false, error: 'Too many requests' }, 429);
        return true;
      }
      const body = await readJsonBody(req);
      if (body?.__tooLarge) {
        sendJson(res, { ok: false, error: 'Payload too large' }, 413);
        return true;
      }
      const user = store.auth?.extractAuthUser?.(req) || null;
      try {
        const result = store.analytics.recordGameplay({
          visitorId: body?.visitorId,
          mode: body?.mode,
          uid: user?.uid,
          authenticated: Boolean(user && user.authType !== 'dev'),
        });
        sendJson(res, result, result.status || (result.ok ? 200 : 400));
      } catch {
        sendJson(res, { ok: false, error: 'analytics-persistence-failed' }, 500);
      }
      return true;
    }

    if (pathname === '/api/auth/session') {
      if (req.method !== 'GET') {
        sendJson(res, { ok: false, error: 'Method not allowed' }, 405);
        return true;
      }
      const user = store.auth?.extractAuthUser?.(req) || null;
      sendJson(res, {
        ok: true,
        authenticated: Boolean(user),
        user,
      });
      return true;
    }

    // 2c. Authenticated Cloud Save Persistence (`/api/save`)
    if (pathname === '/api/save') {
      const user = store.auth?.extractAuthUser?.(req) || null;
      if (!user) {
        sendJson(res, { ok: false, error: 'Unauthorized' }, 401);
        return true;
      }
      if (!checkSaveRateLimit(req, user.uid)) {
        sendJson(res, { ok: false, error: 'Too many requests' }, 429);
        return true;
      }

      if (req.method === 'GET') {
        const result = store.saves.getSave(user.uid, user);
        sendJson(res, result, result.status || (result.ok ? 200 : 400));
        return true;
      }

      if (req.method === 'POST') {
        const body = await readJsonBody(req, MAX_SAVE_HTTP_BODY_BYTES);
        if (body?.__tooLarge) {
          sendJson(res, { ok: false, error: 'save-too-large' }, 413);
          return true;
        }
        const queryMode = url.searchParams.get('mode') || '';
        const saveData =
          body?.saveData && typeof body.saveData === 'object'
            ? body.saveData
            : body?.sections && typeof body.sections === 'object'
              ? {
                  version: body.version ?? 2,
                  savedAt: body.savedAt,
                  sections: body.sections,
                }
              : body?.saveData;

        const mode = body?.mode || queryMode || 'merge';
        let writableSections = Array.isArray(body?.writableSections)
          ? body.writableSections
          : null;
        if (!writableSections && (queryMode === 'story' || body?.gameMode === 'story')) {
          writableSections = ['story'];
        } else if (
          !writableSections &&
          (queryMode === 'adventure' || body?.gameMode === 'adventure')
        ) {
          writableSections = Object.keys(saveData?.sections || {}).filter(
            (k) => k !== 'story',
          );
        }

        const result = store.saves.putSave({
          uid: user.uid,
          profile: user,
          saveData,
          mode,
          writableSections,
          baseSavedAt: body?.baseSavedAt ?? null,
          force: Boolean(body?.force),
        });
        sendJson(res, result, result.status || (result.ok ? 200 : 400));
        return true;
      }

      if (req.method === 'DELETE') {
        const result = store.saves.deleteSave(user.uid);
        sendJson(res, result, result.status || (result.ok ? 200 : 400));
        return true;
      }

      sendJson(res, { ok: false, error: 'Method not allowed' }, 405);
      return true;
    }

    // 3. Co-op Party Rooms & Public Matchmaking
    if (pathname === '/api/coop') {
      if (req.method === 'GET') {
        if (url.searchParams.get('list') === 'public') {
          const rooms = store.listPublicRooms();
          sendJson(res, { ok: true, rooms, publicRooms: rooms });
          return true;
        }
        const room = url.searchParams.get('room') || '';
        const since = Number(url.searchParams.get('since')) || 0;
        const result = store.getCoopRoom({ room, since });
        sendJson(res, result);
        return true;
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        if (body?.__tooLarge) {
          sendJson(res, { ok: false, error: 'Payload too large' }, 413);
          return true;
        }
        const result = store.syncCoopRoom(body || {});
        if (!result.ok) {
          sendJson(res, result, 400);
          return true;
        }
        activeWsHub?.broadcastCoop?.(result.room, result, body);
        sendJson(res, result);
        return true;
      }
      sendJson(res, { ok: false, error: 'Method not allowed' }, 405);
      return true;
    }

    // 4. Zone Sharding & Ambient Pilgrim Presence
    if (pathname === '/api/presence') {
      if (req.method === 'GET') {
        const zone = url.searchParams.get('zone') || 'stupa';
        const shardId = url.searchParams.get('shardId') || null;
        const peerId = url.searchParams.get('peerId') || null;
        const since = Number(url.searchParams.get('since')) || 0;
        const result = store.getZonePresence({ zone, shardId, peerId, since });
        sendJson(res, result);
        return true;
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        if (body?.__tooLarge) {
          sendJson(res, { ok: false, error: 'Payload too large' }, 413);
          return true;
        }
        if (body?.action === 'leave') {
          const result = store.leavePresence({ peerId: body.peerId });
          if (result.shardId) {
            activeWsHub?.broadcastPresence?.(result.shardId, body, result);
          }
          sendJson(res, result);
          return true;
        }
        const result = store.updatePresence(body || {});
        if (!result.ok) {
          sendJson(res, result, 400);
          return true;
        }
        activeWsHub?.broadcastPresence?.(result.shardId, body, result);
        sendJson(res, result);
        return true;
      }
      sendJson(res, { ok: false, error: 'Method not allowed' }, 405);
      return true;
    }

    if (typeof next === 'function') {
      return next();
    }
    sendJson(res, { ok: false, error: 'Not found' }, 404);
    return true;
  };

  middleware.setWsHub = (hub) => {
    activeWsHub = hub;
  };

  return middleware;
}
