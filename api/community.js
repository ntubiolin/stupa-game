/**
 * Vercel Serverless Function — `/api/community` (`api/community.js`)
 */
import { createApiMiddleware } from '../server/handler.js';

const handler = createApiMiddleware();

export default async function communityHandler(req, res) {
  req.url = req.url?.startsWith('/api/community') ? req.url : '/api/community';
  return handler(req, res);
}
