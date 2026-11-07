/**
 * Standalone Production / Self-Hosted Multiplayer Server (`server/index.js`) — Issue #173
 *
 * Serves:
 *  - REST APIs (`/api/community`, `/api/coop`, `/api/presence`, `/api/health`)
 *  - RFC 6455 WebSocket Hub (`/ws/multiplayer`)
 *  - Built static assets from `dist/` (with SPA `index.html` fallback)
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMultiplayerStore, getDefaultStore } from './store.js';
import { createApiMiddleware } from './handler.js';
import { attachWebSocketServer } from './ws.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function createMultiplayerServer(options = {}) {
  const store = options.store || (options.storeOptions ? createMultiplayerStore(options.storeOptions) : getDefaultStore());
  const distDir = options.distDir || path.resolve(process.cwd(), 'dist');

  const apiMiddleware = createApiMiddleware(store, null);

  const server = http.createServer(async (req, res) => {
    const handled = await apiMiddleware(req, res, () => {
      // Static file fallback from dist/
      const url = new URL(req.url || '/', 'http://localhost');
      const safeRelPath = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, '');
      let filePath = path.join(distDir, safeRelPath === '/' ? 'index.html' : safeRelPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        const spaFallback = path.join(distDir, 'index.html');
        if (fs.existsSync(spaFallback)) {
          filePath = spaFallback;
        } else {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'Not found' }));
          return;
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      res.statusCode = 200;
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
      fs.createReadStream(filePath).pipe(res);
    });
    return handled;
  });

  const wsHub = attachWebSocketServer(server, store, options.wsPath || '/ws/multiplayer');
  apiMiddleware.setWsHub(wsHub);

  return { server, store, wsHub, apiMiddleware };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const port = Number(process.env.PORT) || 8787;
  const host = process.env.HOST || '0.0.0.0';
  const { server, store } = createMultiplayerServer();

  server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[stupa-server] Listening on http://${host}:${port} (WS: /ws/multiplayer, DB: ${store.dbPath})`,
    );
  });
}
