/**
 * Vercel Serverless Function — `/api/coop` (`api/coop.js`)
 */
import { createApiMiddleware } from '../server/handler.js';

const handler = createApiMiddleware();

export default async function coopHandler(req, res) {
  if (!req.url || !req.url.startsWith('/api/coop')) {
    const qIdx = (req.url || '').indexOf('?');
    const query = qIdx >= 0 ? req.url.slice(qIdx) : '';
    req.url = `/api/coop${query}`;
  }
  return handler(req, res);
}
