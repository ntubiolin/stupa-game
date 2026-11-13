/** Durable, privacy-minimizing gameplay analytics — Issue #322. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const VISITOR_ID_RE = /^[a-zA-Z0-9_-]{16,96}$/;

export function taipeiDay(now = Date.now()) {
  return new Date(Number(now) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function digest(kind, value) {
  return `${kind}:${crypto.createHash('sha256').update(String(value)).digest('hex')}`;
}

function openDatabase(dbPath) {
  try {
    const require = createRequire(import.meta.url);
    const { DatabaseSync } = require('node:sqlite');
    if (typeof DatabaseSync !== 'function') return null;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS analytics_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT OR IGNORE INTO analytics_metadata (key, value)
        VALUES ('collection_since', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
      CREATE TABLE IF NOT EXISTS analytics_google_users (
        player_key TEXT PRIMARY KEY,
        first_signed_in_at INTEGER NOT NULL,
        last_signed_in_at INTEGER NOT NULL,
        sign_in_count INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS analytics_daily_players (
        day TEXT NOT NULL,
        player_key TEXT NOT NULL,
        first_played_at INTEGER NOT NULL,
        last_played_at INTEGER NOT NULL,
        mode TEXT NOT NULL,
        PRIMARY KEY (day, player_key)
      );
      CREATE INDEX IF NOT EXISTS analytics_daily_players_day
        ON analytics_daily_players(day);
      CREATE TABLE IF NOT EXISTS analytics_daily_aliases (
        day TEXT NOT NULL,
        guest_key TEXT NOT NULL,
        player_key TEXT NOT NULL,
        PRIMARY KEY (day, guest_key)
      );
    `);
    return db;
  } catch {
    return null;
  }
}

export function createAnalyticsStore(options = {}) {
  const dbPath = options.dbPath || process.env.STUPA_SAVE_DB_PATH || path.resolve(process.cwd(), '.data/stupa-saves.sqlite');
  const inMemoryOnly = options.inMemoryOnly !== undefined ? Boolean(options.inMemoryOnly) : Boolean(process.env.STUPA_IN_MEMORY);
  const startedAt = new Date().toISOString();
  let db = inMemoryOnly ? null : openDatabase(dbPath);
  const unavailable = !inMemoryOnly && !db;
  const googleUsers = new Map();
  const dailyPlayers = new Map();
  const dailyAliases = new Map();

  const upsertGoogle = db?.prepare(`
    INSERT INTO analytics_google_users (player_key, first_signed_in_at, last_signed_in_at, sign_in_count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(player_key) DO UPDATE SET
      last_signed_in_at = excluded.last_signed_in_at,
      sign_in_count = analytics_google_users.sign_in_count + 1
  `);
  const upsertDaily = db?.prepare(`
    INSERT INTO analytics_daily_players (day, player_key, first_played_at, last_played_at, mode)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(day, player_key) DO UPDATE SET
      last_played_at = excluded.last_played_at,
      mode = CASE WHEN instr(analytics_daily_players.mode, excluded.mode) > 0
        THEN analytics_daily_players.mode ELSE analytics_daily_players.mode || ',' || excluded.mode END
  `);
  const deleteDaily = db?.prepare('DELETE FROM analytics_daily_players WHERE day = ? AND player_key = ?');
  const getAlias = db?.prepare('SELECT player_key FROM analytics_daily_aliases WHERE day = ? AND guest_key = ?');
  const upsertAlias = db?.prepare(`
    INSERT INTO analytics_daily_aliases (day, guest_key, player_key) VALUES (?, ?, ?)
    ON CONFLICT(day, guest_key) DO UPDATE SET player_key = excluded.player_key
  `);
  const countGoogle = db?.prepare('SELECT COUNT(*) AS count FROM analytics_google_users');
  const countDay = db?.prepare('SELECT COUNT(*) AS count FROM analytics_daily_players WHERE day = ?');
  const getCollectionSince = db?.prepare("SELECT value FROM analytics_metadata WHERE key = 'collection_since'");

  function assertAvailable() {
    if (!unavailable) return;
    const error = new Error(`Analytics persistence unavailable: ${dbPath}`);
    error.code = 'ANALYTICS_UNAVAILABLE';
    throw error;
  }

  function recordGoogleSignIn(uid, now = Date.now()) {
    assertAvailable();
    if (!uid) return false;
    const playerKey = digest('google', uid);
    if (upsertGoogle) upsertGoogle.run(playerKey, now, now);
    else {
      const previous = googleUsers.get(playerKey);
      googleUsers.set(playerKey, {
        firstSignedInAt: previous?.firstSignedInAt || now,
        lastSignedInAt: now,
        signInCount: (previous?.signInCount || 0) + 1,
      });
    }
    return true;
  }

  function recordGameplay({ visitorId, uid = '', authenticated = false, mode = 'adventure', now = Date.now() } = {}) {
    assertAvailable();
    const cleanVisitorId = typeof visitorId === 'string' && VISITOR_ID_RE.test(visitorId) ? visitorId : '';
    if (!cleanVisitorId) return { ok: false, status: 400, error: 'invalid-visitor-id' };
    const day = taipeiDay(now);
    const cleanMode = mode === 'story' ? 'story' : 'adventure';
    const guestKey = digest('guest', cleanVisitorId);
    const accountKey = authenticated && uid ? digest('google', uid) : '';
    let playerKey = accountKey || guestKey;

    if (db) {
      db.exec('BEGIN IMMEDIATE');
      try {
        if (accountKey) {
          upsertAlias.run(day, guestKey, accountKey);
          deleteDaily.run(day, guestKey);
        } else {
          playerKey = getAlias.get(day, guestKey)?.player_key || guestKey;
        }
        upsertDaily.run(day, playerKey, now, now, cleanMode);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    } else {
      const aliasKey = `${day}|${guestKey}`;
      if (accountKey) {
        dailyAliases.set(aliasKey, accountKey);
        dailyPlayers.delete(aliasKey);
      } else {
        playerKey = dailyAliases.get(aliasKey) || guestKey;
      }
      const mapKey = `${day}|${playerKey}`;
      const previous = dailyPlayers.get(mapKey);
      dailyPlayers.set(mapKey, {
        firstPlayedAt: previous?.firstPlayedAt || now,
        lastPlayedAt: now,
        modes: new Set([...(previous?.modes || []), cleanMode]),
      });
    }
    return { ok: true, day };
  }

  function getSummary(day = taipeiDay()) {
    assertAvailable();
    const cleanDay = /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : taipeiDay();
    const googleUserCount = countGoogle ? Number(countGoogle.get()?.count) || 0 : googleUsers.size;
    const dau = countDay
      ? Number(countDay.get(cleanDay)?.count) || 0
      : Array.from(dailyPlayers.keys()).filter((key) => key.startsWith(`${cleanDay}|`)).length;
    return {
      collectionSince: getCollectionSince?.get()?.value || startedAt,
      day: cleanDay,
      googleUsers: googleUserCount,
      dau,
    };
  }

  function close() {
    if (!db) return;
    try { db.close(); } catch { /* already closed */ }
    db = null;
  }

  return {
    engine: unavailable ? 'unavailable' : db ? 'sqlite' : 'memory',
    available: !unavailable,
    dbPath,
    recordGoogleSignIn,
    recordGameplay,
    getSummary,
    close,
  };
}
