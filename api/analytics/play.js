/** Vercel Serverless Function — `/api/analytics/play` — Issue #322. */
import { createApiMiddleware } from '../../server/handler.js';

const handler = createApiMiddleware();

export default async function analyticsPlayHandler(req, res) {
  if (!req.url || !req.url.startsWith('/api/analytics/')) {
    req.url = '/api/analytics/play';
  }
  return handler(req, res);
}
