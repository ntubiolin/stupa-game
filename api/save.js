/**
 * Vercel Serverless Function — `/api/save` & `/api/auth/*` (`api/save.js`) — Issue #224
 */
import { createApiMiddleware } from '../server/handler.js';

const handler = createApiMiddleware();

export default async function saveHandler(req, res) {
  if (
    !req.url ||
    (!req.url.startsWith('/api/save') && !req.url.startsWith('/api/auth/'))
  ) {
    const qIdx = (req.url || '').indexOf('?');
    const query = qIdx >= 0 ? req.url.slice(qIdx) : '';
    req.url = `/api/save${query}`;
  }
  return handler(req, res);
}
