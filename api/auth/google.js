/**
 * Vercel Serverless Function — `/api/auth/google` (`api/auth/google.js`) — Issue #233
 */
import { createApiMiddleware } from '../../server/handler.js';

const handler = createApiMiddleware();

export default async function authGoogleHandler(req, res) {
  if (!req.url || !req.url.startsWith('/api/auth/')) {
    const qIdx = (req.url || '').indexOf('?');
    const query = qIdx >= 0 ? req.url.slice(qIdx) : '';
    req.url = `/api/auth/google${query}`;
  }
  return handler(req, res);
}
