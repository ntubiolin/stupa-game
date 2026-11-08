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
export const COMMUNITY_RATE_WINDOW_MS = 10000;
export const COMMUNITY_RATE_MAX_REQ = 40;

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
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

  function checkCommunityRateLimit(req) {
    const now = Date.now();
    const xff = req.headers?.['x-forwarded-for'];
    const ip =
      (typeof xff === 'string' && xff.split(',')[0].trim()) ||
      req.socket?.remoteAddress ||
      'unknown';

    if (communityRateBuckets.size > 2000) {
      communityRateBuckets.clear();
    }

    const prev = communityRateBuckets.get(ip) || [];
    const recent = prev.filter((ts) => now - ts < COMMUNITY_RATE_WINDOW_MS);
    if (recent.length >= COMMUNITY_RATE_MAX_REQ) {
      communityRateBuckets.set(ip, recent);
      return false;
    }
    recent.push(now);
    communityRateBuckets.set(ip, recent);
    return true;
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
        const action = body?.action || (Array.isArray(body?.actions) ? 'batch' : '');
        const payload =
          action === 'batch' && Array.isArray(body?.actions)
            ? { actions: body.actions }
            : body?.payload;

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
