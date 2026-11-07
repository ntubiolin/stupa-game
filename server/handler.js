/**
 * Unified HTTP API Middleware & Serverless Handler (`server/handler.js`) — Issue #173
 *
 * Mountable in:
 *  - Vite dev & preview servers (`vite.config.js`)
 *  - Standalone Node HTTP + WebSocket server (`server/index.js`)
 *  - Vercel / Serverless Functions (`api/community.js`, `api/coop.js`, `api/presence.js`)
 */
import { getDefaultStore } from './store.js';

export function readJsonBody(req, maxBytes = 256 * 1024) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.resolve({});
    }
  }
  return new Promise((resolve) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= maxBytes) {
        body += chunk.toString('utf8');
      }
    });
    req.on('end', () => {
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
        const body = await readJsonBody(req);
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
