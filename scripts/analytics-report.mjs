#!/usr/bin/env node
import path from 'node:path';
import { createRequire } from 'node:module';
import { taipeiDay } from '../server/analyticsStore.js';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
const configuredSavePath = process.env.STUPA_SAVE_DB_PATH || path.resolve(process.cwd(), '.data/stupa-saves.sqlite');
const dbPath = process.env.STUPA_ANALYTICS_DB_PATH
  || (configuredSavePath.endsWith('.json')
    ? path.join(path.dirname(configuredSavePath), 'stupa-analytics.sqlite')
    : configuredSavePath);
const requestedDay = process.argv[2] || taipeiDay();
if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDay)) {
  throw new Error('Usage: npm run analytics:report -- YYYY-MM-DD');
}

const db = new DatabaseSync(dbPath, { readOnly: true });
try {
  const collectionSince = db.prepare("SELECT value FROM analytics_metadata WHERE key = 'collection_since'").get()?.value || null;
  const googleUsers = Number(db.prepare('SELECT COUNT(*) AS count FROM analytics_google_users').get()?.count) || 0;
  const dau = Number(db.prepare('SELECT COUNT(*) AS count FROM analytics_daily_players WHERE day = ?').get(requestedDay)?.count) || 0;
  process.stdout.write(`${JSON.stringify({ collectionSince, day: requestedDay, googleUsers, dau }, null, 2)}\n`);
} finally {
  db.close();
}
