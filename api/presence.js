/**
 * Vercel Serverless Function — `/api/presence` (`api/presence.js`)
 */
import { createApiMiddleware } from '../server/handler.js';

const handler = createApiMiddleware();

export default async function presenceHandler(req, res) {
  if (!req.url || !req.url.startsWith('/api/presence')) {
    const qIdx = (req.url || '').indexOf('?');
    const query = qIdx >= 0 ? req.url.slice(qIdx) : '';
    req.url = `/api/presence${query}`;
  }
  return handler(req, res);
}
