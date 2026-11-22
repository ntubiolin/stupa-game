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
  const desktopAuthTickets = new Map();

  function pruneDesktopTickets() {
    const now = Date.now();
    for (const [key, entry] of desktopAuthTickets.entries()) {
      if (now - entry.createdAt > 5 * 60 * 1000) desktopAuthTickets.delete(key);
    }
  }

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
      let analyticsRecorded = null;
      if (authResult.user?.authType === 'google') {
        try {
          store.analytics.recordGoogleSignIn(authResult.user.uid);
          analyticsRecorded = true;
        } catch (error) {
          analyticsRecorded = false;
          console.error('[analytics] Failed to record verified Google sign-in:', error?.message || error);
        }
      }
      sendJson(res, {
        ok: true,
        sessionToken: authResult.sessionToken,
        expiresAt: authResult.expiresAt,
        user: authResult.user,
        ...(analyticsRecorded !== null ? { analyticsRecorded } : {}),
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
      } catch (error) {
        const unavailable = error?.code === 'ANALYTICS_UNAVAILABLE';
        sendJson(
          res,
          { ok: false, error: unavailable ? 'analytics-unavailable' : 'analytics-persistence-failed' },
          unavailable ? 503 : 500,
        );
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

    // Desktop / Unreal Engine Google Sign-In browser handoff (`/api/auth/desktop-*`)
    if (pathname === '/api/auth/desktop-start' && req.method === 'GET') {
      pruneDesktopTickets();
      const ticket = (url.searchParams.get('ticket') || '').trim();
      if (!/^[A-Za-z0-9_-]{12,96}$/.test(ticket)) {
        sendJson(res, { ok: false, error: 'invalid-ticket' }, 400);
        return true;
      }
      if (desktopAuthTickets.size < 500 && !desktopAuthTickets.has(ticket)) {
        desktopAuthTickets.set(ticket, { createdAt: Date.now(), status: 'pending' });
      }
      const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
      setCorsHeaders(res);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html><head><meta charset="utf-8"><title>蓮師足跡 · Google 雲端存檔登入</title>
<style>body{background:#101520;color:#f8efda;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#1e2636;border:1.5px solid #dab65c;padding:28px 32px;max-width:420px;text-align:center}
h1{color:#eebd62;font-size:20px;margin:0 0 12px}p{color:#c2bca8;font-size:14px;line-height:1.6}
button{background:#661c1a;color:#f8efda;border:1px solid #eebd62;padding:10px 18px;font-size:14px;cursor:pointer;margin-top:12px}
input{width:100%;box-sizing:border-box;padding:8px;margin-top:8px;background:#101520;color:#f8efda;border:1px solid #556}</style>
${clientId ? '<script src="https://accounts.google.com/gsi/client" async defer></script>' : ''}</head>
<body><div class="card"><h1>◆ 蓮師足跡 · Google 雲端登入</h1><p id="msg">登入後將自動把雲端存檔憑證傳回桌面版遊戲。</p>
${clientId ? `<div id="g_id_onload" data-client_id="${clientId.replace(/"/g, '&quot;')}" data-callback="onGoogleCredential"></div><div class="g_id_signin" data-type="standard"></div>` : `<input id="email" type="email" placeholder="pilgrim@gmail.com" value="pilgrim@gmail.com"/><input id="name" type="text" placeholder="行者法號 / 顯示名稱" value="蓮師行者"/><button onclick="devLogin()">於本機開發伺服器登入並連結遊戲</button>`}
</div><script>
const ticket = ${JSON.stringify(ticket)};
async function finishAuth(payload) {
  const r = await fetch('/api/auth/google', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const d = await r.json();
  if (!d.ok) { document.getElementById('msg').textContent = '登入失敗：' + (d.error || 'unknown'); return; }
  await fetch('/api/auth/desktop-complete', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket, sessionToken:d.sessionToken, user:d.user})});
  document.getElementById('msg').textContent = '✅ 已成功連結桌面版《蓮師足跡》！您現在可以關閉此分頁返回遊戲。';
}
window.onGoogleCredential = (resp) => finishAuth({credential: resp.credential});
window.devLogin = () => finishAuth({devProfile:{email:document.getElementById('email').value, name:document.getElementById('name').value}});
</script></body></html>`);
      return true;
    }

    if (pathname === '/api/auth/desktop-complete' && req.method === 'POST') {
      pruneDesktopTickets();
      const body = await readJsonBody(req);
      const ticket = typeof body?.ticket === 'string' ? body.ticket.trim() : '';
      const entry = desktopAuthTickets.get(ticket);
      if (!entry || typeof body?.sessionToken !== 'string' || !body.sessionToken) {
        sendJson(res, { ok: false, error: 'invalid-or-expired-ticket' }, 400);
        return true;
      }
      desktopAuthTickets.set(ticket, {
        createdAt: entry.createdAt,
        status: 'complete',
        sessionToken: body.sessionToken,
        user: body.user || null,
      });
      sendJson(res, { ok: true });
      return true;
    }

    if (pathname === '/api/auth/desktop-poll' && req.method === 'GET') {
      pruneDesktopTickets();
      const ticket = (url.searchParams.get('ticket') || '').trim();
      const entry = desktopAuthTickets.get(ticket);
      if (!entry) {
        sendJson(res, { ok: false, status: 'expired' }, 404);
        return true;
      }
      if (entry.status !== 'complete') {
        sendJson(res, { ok: true, status: 'pending' });
        return true;
      }
      desktopAuthTickets.delete(ticket);
      sendJson(res, { ok: true, status: 'complete', sessionToken: entry.sessionToken, user: entry.user });
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
