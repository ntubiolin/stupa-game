/**
 * SQLite WAL + In-Memory/JSON Fallback Cloud Save Store (`server/saveStore.js`) — Issue #224
 *
 * Provides:
 *  1. Node 22 built-in `node:sqlite` (`DatabaseSync`) persistence in WAL mode
 *     (`.data/stupa-saves.sqlite`), with automatic fallback to in-memory `Map`
 *     (or JSON file when `.json` path is configured).
 *  2. 64 KB payload cap (`MAX_SAVE_BYTES`), schema v2 validation, and recursive
 *     prototype pollution sanitization.
 *  3. Orthogonal section merging (`mode: 'merge'` & `writableSections`) so
 *     `?mode=story` (`['story']`) and Adventure (`vitals`, `inventory`, `quests`, etc.)
 *     never clobber each other.
 *  4. Cross-device conflict detection (`409 save-conflict`) via `baseSavedAt` vs.
 *     per-domain `adventureUpdatedAt` / `storyUpdatedAt` timestamps, with `force: true` override.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { sanitizeUid, sanitizeEmail, sanitizeDisplayName, sanitizePhotoUrl } from './auth.js';

export const MAX_SAVE_BYTES = 64 * 1024; // 64 KB
export const MAX_SAVE_SECTIONS = 24;
export const MAX_SANITIZE_DEPTH = 12;

const FORBIDDEN_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
]);

export function clampSaveTimestamp(ts, now = Date.now()) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return now;
  return Math.max(1700000000000, Math.min(now + 60000, Math.round(n)));
}

export function sanitizeSaveValue(value, depth = 0) {
  if (depth > MAX_SANITIZE_DEPTH) return null;
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSaveValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      if (!k || FORBIDDEN_KEYS.has(k)) continue;
      if (v === undefined || typeof v === 'function' || typeof v === 'symbol') continue;
      clean[k] = sanitizeSaveValue(v, depth + 1);
    }
    return clean;
  }
  return null;
}

export function validateAndSanitizeSaveData(rawSaveData, now = Date.now()) {
  if (!rawSaveData || typeof rawSaveData !== 'object' || Array.isArray(rawSaveData)) {
    return { ok: false, status: 400, error: 'invalid-save-payload' };
  }

  let serializedLength = 0;
  try {
    serializedLength = Buffer.byteLength(JSON.stringify(rawSaveData), 'utf8');
  } catch {
    return { ok: false, status: 400, error: 'invalid-save-json' };
  }

  if (serializedLength > MAX_SAVE_BYTES) {
    return { ok: false, status: 413, error: 'save-too-large' };
  }

  const rawVersion = rawSaveData.version !== undefined ? Number(rawSaveData.version) : 2;
  if (rawVersion !== 1 && rawVersion !== 2) {
    return { ok: false, status: 400, error: 'invalid-save-version' };
  }

  const rawSections = rawSaveData.sections;
  if (!rawSections || typeof rawSections !== 'object' || Array.isArray(rawSections)) {
    return { ok: false, status: 400, error: 'invalid-save-sections' };
  }

  const cleanSections = {};
  let sectionCount = 0;
  for (const [rawKey, rawVal] of Object.entries(rawSections)) {
    if (!rawKey || FORBIDDEN_KEYS.has(rawKey)) continue;
    const sectionKey = String(rawKey).replace(/[^a-zA-Z0-9_.-]/g, '').trim().slice(0, 32);
    if (!sectionKey || FORBIDDEN_KEYS.has(sectionKey)) continue;
    sectionCount += 1;
    if (sectionCount > MAX_SAVE_SECTIONS) {
      return { ok: false, status: 400, error: 'too-many-sections' };
    }
    cleanSections[sectionKey] = sanitizeSaveValue(rawVal, 1);
  }

  const savedAt = clampSaveTimestamp(rawSaveData.savedAt, now);

  return {
    ok: true,
    saveData: {
      version: 2,
      savedAt,
      sections: cleanSections,
    },
  };
}

export function extractSaveSummary(
  saveData,
  prevSummary = null,
  updatedDomains = { adventure: true, story: true },
  now = Date.now(),
) {
  const sections =
    saveData && typeof saveData.sections === 'object' && saveData.sections
      ? saveData.sections
      : {};

  const vitals = sections.vitals && typeof sections.vitals === 'object' ? sections.vitals : {};
  const merit = sections.merit && typeof sections.merit === 'object' ? sections.merit : {};
  const quests = sections.quests && typeof sections.quests === 'object' ? sections.quests : {};
  const story = sections.story && typeof sections.story === 'object' ? sections.story : {};

  const level = Math.max(1, Math.min(99, Math.floor(Number(vitals.level) || 1)));
  const exp = Math.max(0, Math.floor(Number(vitals.exp) || 0));
  const points = Math.max(0, Math.floor(Number(merit.points) || 0));
  const kora = Math.max(0, Math.floor(Number(merit.kora) || 0));
  const questsDone = Array.isArray(quests.done) ? quests.done.length : 0;

  let activeChapterId = null;
  if (
    story.journey &&
    typeof story.journey === 'object' &&
    typeof story.journey.activeChapterId === 'string' &&
    story.journey.activeChapterId.trim()
  ) {
    activeChapterId = story.journey.activeChapterId.trim().slice(0, 48);
  } else if (typeof story.beat === 'string' && story.beat.trim()) {
    activeChapterId = story.beat.trim().slice(0, 48);
  }

  const savedAt = clampSaveTimestamp(saveData?.savedAt, now);
  const prevAdvTs = Number(prevSummary?.adventureUpdatedAt) || 0;
  const prevStoryTs = Number(prevSummary?.storyUpdatedAt) || 0;

  const isSet = updatedDomains instanceof Set;
  const advChanged = isSet
    ? updatedDomains.has('adventure')
    : Boolean(updatedDomains?.adventure);
  const storyChanged = isSet
    ? updatedDomains.has('story')
    : Boolean(updatedDomains?.story);

  const adventureUpdatedAt = advChanged ? savedAt : prevAdvTs;
  const storyUpdatedAt = storyChanged ? savedAt : prevStoryTs;

  return {
    level,
    exp,
    points,
    kora,
    questsDone,
    activeChapterId,
    savedAt,
    adventureUpdatedAt,
    storyUpdatedAt,
  };
}

function normalizeProfile(uid, profile = null, prevProfile = null) {
  const p = profile && typeof profile === 'object' ? profile : {};
  const prev = prevProfile && typeof prevProfile === 'object' ? prevProfile : {};
  return {
    uid,
    email: sanitizeEmail(p.email || prev.email, ''),
    displayName: sanitizeDisplayName(p.displayName || prev.displayName, '朝聖行者'),
    photoURL: sanitizePhotoUrl(p.photoURL || prev.photoURL, ''),
  };
}

function tryOpenSqliteDatabase(saveDbPath) {
  try {
    const require = createRequire(import.meta.url);
    const sqlite = require('node:sqlite');
    if (!sqlite || typeof sqlite.DatabaseSync !== 'function') {
      return null;
    }
    const dir = path.dirname(saveDbPath);
    fs.mkdirSync(dir, { recursive: true });
    const db = new sqlite.DatabaseSync(saveDbPath);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS user_saves (
        uid TEXT PRIMARY KEY,
        email TEXT NOT NULL DEFAULT '',
        display_name TEXT NOT NULL DEFAULT '',
        photo_url TEXT NOT NULL DEFAULT '',
        version INTEGER NOT NULL DEFAULT 2,
        saved_at INTEGER NOT NULL DEFAULT 0,
        adventure_updated_at INTEGER NOT NULL DEFAULT 0,
        story_updated_at INTEGER NOT NULL DEFAULT 0,
        summary_json TEXT NOT NULL DEFAULT '{}',
        save_json TEXT NOT NULL DEFAULT '{}',
        updated_at INTEGER NOT NULL DEFAULT 0
      );
    `);
    return db;
  } catch {
    return null;
  }
}

export function createSaveStore(options = {}) {
  const saveDbPath =
    options.saveDbPath ||
    process.env.STUPA_SAVE_DB_PATH ||
    path.resolve(process.cwd(), '.data/stupa-saves.sqlite');
  const inMemoryOnly =
    options.inMemoryOnly !== undefined
      ? Boolean(options.inMemoryOnly)
      : Boolean(process.env.STUPA_IN_MEMORY);

  const useJsonFallbackFile =
    !inMemoryOnly && typeof saveDbPath === 'string' && saveDbPath.endsWith('.json');

  let sqliteDb = null;
  let stmtGet = null;
  let stmtUpsert = null;
  let stmtDelete = null;

  if (!inMemoryOnly && !useJsonFallbackFile) {
    sqliteDb = tryOpenSqliteDatabase(saveDbPath);
    if (sqliteDb) {
      stmtGet = sqliteDb.prepare(`
        SELECT
          uid,
          email,
          display_name,
          photo_url,
          version,
          saved_at,
          adventure_updated_at,
          story_updated_at,
          summary_json,
          save_json,
          updated_at
        FROM user_saves
        WHERE uid = ?
      `);
      stmtUpsert = sqliteDb.prepare(`
        INSERT INTO user_saves (
          uid,
          email,
          display_name,
          photo_url,
          version,
          saved_at,
          adventure_updated_at,
          story_updated_at,
          summary_json,
          save_json,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(uid) DO UPDATE SET
          email = excluded.email,
          display_name = excluded.display_name,
          photo_url = excluded.photo_url,
          version = excluded.version,
          saved_at = excluded.saved_at,
          adventure_updated_at = excluded.adventure_updated_at,
          story_updated_at = excluded.story_updated_at,
          summary_json = excluded.summary_json,
          save_json = excluded.save_json,
          updated_at = excluded.updated_at
      `);
      stmtDelete = sqliteDb.prepare(`DELETE FROM user_saves WHERE uid = ?`);
    }
  }

  const memoryMap = new Map();

  function loadJsonFallback() {
    if (!useJsonFallbackFile) return;
    try {
      if (!fs.existsSync(saveDbPath)) return;
      const raw = fs.readFileSync(saveDbPath, 'utf8');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.records === 'object') {
        for (const [uid, rec] of Object.entries(parsed.records)) {
          const cleanUid = sanitizeUid(uid, '');
          if (cleanUid && rec && typeof rec === 'object') {
            memoryMap.set(cleanUid, rec);
          }
        }
      }
    } catch {
      // Ignore missing or corrupted JSON fallback file
    }
  }

  function flushJsonFallback() {
    if (!useJsonFallbackFile) return;
    try {
      const records = {};
      for (const [uid, rec] of memoryMap.entries()) {
        records[uid] = rec;
      }
      const dir = path.dirname(saveDbPath);
      fs.mkdirSync(dir, { recursive: true });
      const tmpPath = `${saveDbPath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify({ version: 2, records }, null, 2), 'utf8');
      fs.renameSync(tmpPath, saveDbPath);
    } catch {
      // Ignore write failures in read-only environments
    }
  }

  loadJsonFallback();

  function readRawRecord(uid) {
    if (sqliteDb && stmtGet) {
      const row = stmtGet.get(uid);
      if (!row) return null;
      let summary = {};
      let saveData = { version: 2, savedAt: Number(row.saved_at) || 0, sections: {} };
      try {
        summary = JSON.parse(row.summary_json || '{}');
      } catch {
        summary = {};
      }
      try {
        saveData = JSON.parse(row.save_json || '{}');
      } catch {
        saveData = { version: 2, savedAt: Number(row.saved_at) || 0, sections: {} };
      }
      summary.adventureUpdatedAt =
        Number(row.adventure_updated_at) || Number(summary.adventureUpdatedAt) || 0;
      summary.storyUpdatedAt =
        Number(row.story_updated_at) || Number(summary.storyUpdatedAt) || 0;
      summary.savedAt = Number(row.saved_at) || Number(summary.savedAt) || 0;

      return {
        uid: row.uid,
        profile: {
          uid: row.uid,
          email: row.email || '',
          displayName: row.display_name || '朝聖行者',
          photoURL: row.photo_url || '',
        },
        summary,
        saveData,
        updatedAt: Number(row.updated_at) || Number(row.saved_at) || 0,
      };
    }

    const rec = memoryMap.get(uid);
    if (!rec) return null;
    return JSON.parse(JSON.stringify(rec));
  }

  function writeRawRecord(record) {
    if (sqliteDb && stmtUpsert) {
      stmtUpsert.run(
        record.uid,
        record.profile.email || '',
        record.profile.displayName || '朝聖行者',
        record.profile.photoURL || '',
        2,
        Number(record.saveData.savedAt) || 0,
        Number(record.summary.adventureUpdatedAt) || 0,
        Number(record.summary.storyUpdatedAt) || 0,
        JSON.stringify(record.summary),
        JSON.stringify(record.saveData),
        Number(record.updatedAt) || 0,
      );
      return;
    }

    memoryMap.set(record.uid, JSON.parse(JSON.stringify(record)));
    flushJsonFallback();
  }

  function getSave(uid, profileFallback = null) {
    const cleanUid = sanitizeUid(uid, '');
    if (!cleanUid) {
      return { ok: false, status: 400, error: 'missing-uid' };
    }

    const existing = readRawRecord(cleanUid);
    if (!existing) {
      return {
        ok: true,
        exists: false,
        uid: cleanUid,
        profile: normalizeProfile(cleanUid, profileFallback, null),
        summary: null,
        saveData: null,
        updatedAt: 0,
      };
    }

    return {
      ok: true,
      exists: true,
      uid: cleanUid,
      profile: normalizeProfile(cleanUid, existing.profile, profileFallback),
      summary: existing.summary,
      saveData: existing.saveData,
      updatedAt: existing.updatedAt,
    };
  }

  function putSave({
    uid,
    profile = null,
    saveData,
    mode = 'merge',
    writableSections = null,
    baseSavedAt = null,
    force = false,
    now = Date.now(),
  } = {}) {
    const cleanUid = sanitizeUid(uid || profile?.uid, '');
    if (!cleanUid) {
      return { ok: false, status: 400, error: 'missing-uid' };
    }

    const nowMs = Number(now) || Date.now();
    const validation = validateAndSanitizeSaveData(saveData, nowMs);
    if (!validation.ok) {
      return validation;
    }

    const incomingSave = validation.saveData;
    const incomingSections = incomingSave.sections;
    const existing = readRawRecord(cleanUid);
    const existingSections =
      existing?.saveData?.sections && typeof existing.saveData.sections === 'object'
        ? existing.saveData.sections
        : {};

    // Resolve writableSections & mode
    let effectiveMode = mode === 'overwrite' ? 'overwrite' : 'merge';
    let writableSet = null;

    if (Array.isArray(writableSections) && writableSections.length > 0) {
      const cleanList = writableSections
        .map((k) => String(k || '').replace(/[^a-zA-Z0-9_.-]/g, '').trim())
        .filter((k) => k && !FORBIDDEN_KEYS.has(k));
      writableSet = new Set(cleanList);
    } else if (mode === 'story') {
      effectiveMode = 'merge';
      writableSet = new Set(['story']);
    } else if (mode === 'adventure') {
      effectiveMode = 'merge';
      const advKeys = Object.keys(incomingSections).filter((k) => k !== 'story');
      writableSet = new Set(advKeys);
    }

    // Candidate keys that this request intends to update
    const candidateKeys = writableSet
      ? Array.from(writableSet).filter((k) =>
          Object.prototype.hasOwnProperty.call(incomingSections, k),
        )
      : Object.keys(incomingSections);

    const writesStory = writableSet
      ? writableSet.has('story')
      : Object.prototype.hasOwnProperty.call(incomingSections, 'story');
    const writesAdventure = writableSet
      ? Array.from(writableSet).some((k) => k !== 'story')
      : Object.keys(incomingSections).some((k) => k !== 'story');

    // Determine which domains actually differ between incoming candidate sections and existing cloud sections
    let incomingAdvDiffers = false;
    let incomingStoryDiffers = false;
    for (const k of candidateKeys) {
      const prevJson = JSON.stringify(existingSections[k] ?? null);
      const nextJson = JSON.stringify(incomingSections[k] ?? null);
      if (prevJson !== nextJson) {
        if (k === 'story') {
          incomingStoryDiffers = true;
        } else {
          incomingAdvDiffers = true;
        }
      }
    }

    // Conflict Detection when `baseSavedAt` is provided and `!force`
    const baseTs =
      baseSavedAt !== null && baseSavedAt !== undefined ? Number(baseSavedAt) : NaN;
    if (existing && !force && Number.isFinite(baseTs) && baseTs > 0) {
      const cloudAdvTs = Number(existing.summary?.adventureUpdatedAt) || 0;
      const cloudStoryTs = Number(existing.summary?.storyUpdatedAt) || 0;

      const advConflict =
        writesAdventure && cloudAdvTs > baseTs && incomingAdvDiffers;
      const storyConflict =
        writesStory && cloudStoryTs > baseTs && incomingStoryDiffers;

      if (advConflict || storyConflict) {
        return {
          ok: false,
          status: 409,
          error: 'save-conflict',
          cloud: {
            exists: true,
            uid: cleanUid,
            profile: existing.profile,
            summary: existing.summary,
            saveData: existing.saveData,
            updatedAt: existing.updatedAt,
          },
        };
      }
    }

    // Merge sections
    let mergedSections = {};
    if (effectiveMode === 'overwrite' && !writableSet) {
      mergedSections = { ...incomingSections };
    } else {
      mergedSections = { ...existingSections };
      for (const k of candidateKeys) {
        mergedSections[k] = incomingSections[k];
      }
    }

    if (Object.keys(mergedSections).length > MAX_SAVE_SECTIONS) {
      return { ok: false, status: 400, error: 'too-many-sections' };
    }

    // Determine whether adventure or story changed relative to existing record
    let advChanged = !existing && writesAdventure;
    let storyChanged = !existing && writesStory;
    if (existing) {
      const allKeys = new Set([
        ...Object.keys(existingSections),
        ...Object.keys(mergedSections),
      ]);
      for (const k of allKeys) {
        if (
          JSON.stringify(existingSections[k] ?? null) !==
          JSON.stringify(mergedSections[k] ?? null)
        ) {
          if (k === 'story') {
            storyChanged = true;
          } else {
            advChanged = true;
          }
        }
      }
    }

    // Compute monotonic timestamp so rapid consecutive writes in the same ms are strictly ordered
    let effectiveSavedAt = incomingSave.savedAt;
    if (existing && (advChanged || storyChanged)) {
      const prevMaxTs = Math.max(
        Number(existing.updatedAt) || 0,
        Number(existing.saveData?.savedAt) || 0,
      );
      if (effectiveSavedAt <= prevMaxTs) {
        effectiveSavedAt = prevMaxTs + 1;
      }
    }

    const mergedSaveData = {
      version: 2,
      savedAt: effectiveSavedAt,
      sections: mergedSections,
    };

    const mergedBytes = Buffer.byteLength(JSON.stringify(mergedSaveData), 'utf8');
    if (mergedBytes > MAX_SAVE_BYTES) {
      return { ok: false, status: 413, error: 'save-too-large' };
    }

    const summary = extractSaveSummary(
      mergedSaveData,
      existing?.summary || null,
      { adventure: advChanged, story: storyChanged },
      effectiveSavedAt,
    );

    const mergedProfile = normalizeProfile(cleanUid, profile, existing?.profile);
    const record = {
      uid: cleanUid,
      profile: mergedProfile,
      summary,
      saveData: mergedSaveData,
      updatedAt: effectiveSavedAt,
    };

    writeRawRecord(record);

    return {
      ok: true,
      exists: true,
      uid: cleanUid,
      profile: mergedProfile,
      summary,
      saveData: mergedSaveData,
      updatedAt: effectiveSavedAt,
    };
  }

  function deleteSave(uid) {
    const cleanUid = sanitizeUid(uid, '');
    if (!cleanUid) {
      return { ok: false, status: 400, error: 'missing-uid' };
    }

    let deleted = false;
    if (sqliteDb && stmtDelete) {
      const res = stmtDelete.run(cleanUid);
      deleted = Number(res?.changes) > 0;
    } else {
      deleted = memoryMap.delete(cleanUid);
      if (deleted) {
        flushJsonFallback();
      }
    }

    return {
      ok: true,
      uid: cleanUid,
      deleted,
    };
  }

  function close() {
    if (sqliteDb) {
      try {
        sqliteDb.close();
      } catch {
        // Ignore already closed
      }
      sqliteDb = null;
    }
  }

  return {
    engine: sqliteDb ? 'sqlite' : useJsonFallbackFile ? 'json' : 'memory',
    saveDbPath,
    inMemoryOnly,
    getSave,
    putSave,
    deleteSave,
    close,
  };
}
