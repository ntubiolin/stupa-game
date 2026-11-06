/**
 * Unified versioned save system (`stupa.save.v2`).
 *
 * Manages all persistent sections (`vitals`, `merit`, `items`, `tutorial`, `settings`, etc.)
 * with automatic v1 -> v2 migration, per-section schema validation & fault tolerance,
 * 1-second throttled writes, and immediate flush on `visibilitychange` / `pagehide`.
 */
export const SAVE_STORAGE_KEY = 'stupa.save.v2';
const SAVE_VERSION = 2;
export const STORY_SAVE_VERSION = 2;
const THROTTLE_SEC = 1.0;

const LEGACY_KEYS = {
  merit: 'stupa.merit.v1',
  vitals: 'stupa.vitals.v1',
  items: 'stupa.items.v1',
  tutorialWild: 'stupa_wild_tutorial_v1',
  lang: 'stupa.lang',
  muted: 'stupa.audio.muted',
  volume: 'stupa.audio.volume',
};

function deepClone(val) {
  if (val === null || typeof val !== 'object') return val;
  try {
    return JSON.parse(JSON.stringify(val));
  } catch {
    return val;
  }
}

function safeParseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[save] Failed to parse JSON for ${label}:`, err);
    return null;
  }
}

/**
 * Migration chain: `migrations[fromVersion](raw) -> nextVersionState`.
 */
export const migrations = {
  1: (rawV1 = {}) => {
    const sections = {};

    // 1. Vitals
    if (rawV1.vitals && typeof rawV1.vitals === 'object') {
      const v = rawV1.vitals;
      sections.vitals = {
        level: typeof v.level === 'number' && v.level >= 1 ? Math.floor(v.level) : 1,
        exp: typeof v.exp === 'number' && v.exp >= 0 ? Math.floor(v.exp) : 0,
        hp: typeof v.hp === 'number' ? v.hp : null,
        mp: typeof v.mp === 'number' ? v.mp : null,
        permanent: {
          atk: typeof v.permanent?.atk === 'number' ? v.permanent.atk : 0,
          def: typeof v.permanent?.def === 'number' ? v.permanent.def : 0,
        },
      };
    }

    // 2. Merit
    if (rawV1.merit && typeof rawV1.merit === 'object') {
      const m = rawV1.merit;
      sections.merit = {
        kora: Number(m.kora) || 0,
        prostration: Number(m.prostration) || 0,
        lamp: Number(m.lamp) || 0,
        monkey: Number(m.monkey) || 0,
        wheel: Number(m.wheel) || 0,
        preta: Number(m.preta) || 0,
        tsen: Number(m.tsen) || 0,
        migoi: Number(m.migoi) || 0,
        totalLiberated: Number(m.totalLiberated) || 0,
        mantraCasts: Number(m.mantraCasts) || 0,
        points: Number(m.points) || 0,
        achievements: Array.isArray(m.achievements) ? [...m.achievements] : [],
      };
    }

    // 3. Items (pityCount)
    if (rawV1.items && typeof rawV1.items === 'object') {
      sections.items = {
        pityCount: typeof rawV1.items.pityCount === 'number' ? rawV1.items.pityCount : 0,
      };
    }

    // 4. Tutorial flags
    if (rawV1.tutorial && typeof rawV1.tutorial === 'object') {
      sections.tutorial = { ...rawV1.tutorial };
    }

    // 5. Settings
    if (rawV1.settings && typeof rawV1.settings === 'object') {
      sections.settings = { ...rawV1.settings };
    }

    return {
      version: 2,
      savedAt: Date.now(),
      sections,
    };
  },
};

function readLegacyV1FromStorage() {
  let hasAnyLegacy = false;
  const rawV1 = {
    tutorial: {},
    settings: {},
  };

  try {
    const rawVitals = localStorage.getItem(LEGACY_KEYS.vitals);
    if (rawVitals !== null) {
      hasAnyLegacy = true;
      const parsed = safeParseJson(rawVitals, LEGACY_KEYS.vitals);
      if (parsed && typeof parsed === 'object') rawV1.vitals = parsed;
    }

    const rawMerit = localStorage.getItem(LEGACY_KEYS.merit);
    if (rawMerit !== null) {
      hasAnyLegacy = true;
      const parsed = safeParseJson(rawMerit, LEGACY_KEYS.merit);
      if (parsed && typeof parsed === 'object') rawV1.merit = parsed;
    }

    const rawItems = localStorage.getItem(LEGACY_KEYS.items);
    if (rawItems !== null) {
      hasAnyLegacy = true;
      const parsed = safeParseJson(rawItems, LEGACY_KEYS.items);
      if (parsed && typeof parsed === 'object') rawV1.items = parsed;
    }

    const rawTut = localStorage.getItem(LEGACY_KEYS.tutorialWild);
    if (rawTut !== null) {
      hasAnyLegacy = true;
      rawV1.tutorial[LEGACY_KEYS.tutorialWild] = rawTut === '1';
    }

    const rawLang = localStorage.getItem(LEGACY_KEYS.lang);
    if (rawLang === 'zh' || rawLang === 'en') {
      hasAnyLegacy = true;
      rawV1.settings.lang = rawLang;
    }

    const rawMuted = localStorage.getItem(LEGACY_KEYS.muted);
    if (rawMuted !== null) {
      hasAnyLegacy = true;
      rawV1.settings.muted = rawMuted === '1';
    }

    const rawVol = localStorage.getItem(LEGACY_KEYS.volume);
    if (rawVol !== null) {
      const vol = parseFloat(rawVol);
      if (!Number.isNaN(vol)) {
        hasAnyLegacy = true;
        rawV1.settings.volume = Math.max(0, Math.min(1, vol));
      }
    }
  } catch (err) {
    console.warn('[save] Failed reading legacy v1 keys:', err);
  }

  return hasAnyLegacy ? rawV1 : null;
}

function runMigrations(doc, fromVersion) {
  let cur = doc;
  let v = fromVersion;
  while (v < SAVE_VERSION && typeof migrations[v] === 'function') {
    cur = migrations[v](cur);
    v = cur.version || (v + 1);
  }
  return cur;
}

function validateSectionValue(sectionName, val, fallback) {
  if (val === undefined || val === null) {
    return deepClone(fallback);
  }
  // If fallback is an object (non-array), section value must also be a plain object
  if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
    if (typeof val !== 'object' || Array.isArray(val)) {
      console.warn(`[save] Corrupted section "${sectionName}" (expected object, got ${typeof val}); falling back to default.`);
      return deepClone(fallback);
    }
    const merged = deepClone(fallback);
    for (const [k, defVal] of Object.entries(fallback)) {
      const incoming = val[k];
      if (incoming === undefined) continue;
      if (defVal !== null && typeof defVal === 'number') {
        if (typeof incoming === 'number' && !Number.isNaN(incoming)) {
          merged[k] = incoming;
        } else {
          console.warn(`[save] Corrupted field "${sectionName}.${k}" (expected number); using default.`);
        }
      } else if (typeof defVal === 'boolean') {
        if (typeof incoming === 'boolean') {
          merged[k] = incoming;
        } else {
          console.warn(`[save] Corrupted field "${sectionName}.${k}" (expected boolean); using default.`);
        }
      } else if (Array.isArray(defVal)) {
        if (Array.isArray(incoming)) {
          merged[k] = deepClone(incoming);
        } else {
          console.warn(`[save] Corrupted field "${sectionName}.${k}" (expected array); using default.`);
        }
      } else if (defVal && typeof defVal === 'object') {
        if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
          merged[k] = { ...deepClone(defVal), ...deepClone(incoming) };
        } else {
          console.warn(`[save] Corrupted field "${sectionName}.${k}" (expected object); using default.`);
        }
      } else {
        merged[k] = deepClone(incoming);
      }
    }
    // Preserve extra keys that aren't in fallback (e.g. dynamic tutorial flags)
    for (const [k, incoming] of Object.entries(val)) {
      if (!(k in fallback)) {
        merged[k] = deepClone(incoming);
      }
    }
    return merged;
  }
  return deepClone(val);
}

export function createSave(ctx, { writableSections = null } = {}) {
  const allowedSections = writableSections ? new Set(writableSections) : null;
  let store = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    sections: {},
  };

  const pendingSections = new Map();
  const registeredSections = new Map();
  let sampleRegistered = false;
  let dirtyTimer = 0;
  let writeCount = 0;
  let status = { ok: true };
  let unsupportedRoot = false;

  function canWrite(section) {
    return typeof section === 'string' && section !== ''
      && !Object.hasOwn(Object.prototype, section)
      && (!allowedSections || allowedSections.has(section));
  }

  function isReadOnly() {
    return unsupportedRoot;
  }

  function fail(error) {
    status = { ok: false, error };
    return { ...status };
  }

  function parseDocument(raw) {
    if (raw === null) return null;
    const parsed = safeParseJson(raw, SAVE_STORAGE_KEY);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  }

  function migrateDocument(parsed) {
    const version = typeof parsed?.version === 'number' ? parsed.version : 1;
    return parsed && version < SAVE_VERSION ? runMigrations(parsed, version) : parsed;
  }

  function hasSections(doc) {
    return doc?.sections && typeof doc.sections === 'object' && !Array.isArray(doc.sections);
  }

  function writeToStorage(updates, replacement = null) {
    if (isReadOnly()) return fail('unsupported-version');
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      const latest = migrateDocument(parseDocument(raw));
      if (latest?.version > SAVE_VERSION) {
        unsupportedRoot = true;
        return fail('unsupported-version');
      }
      // An explicitly removed root stays empty. A damaged root can be repaired
      // from our last known good snapshot.
      const base = hasSections(latest) ? latest : raw === null ? { sections: {} } : store;
      const sections = replacement === null ? { ...base.sections } : replacement(base.sections);
      for (const [section, data] of updates) {
        if (section === 'story' && data !== undefined) {
          if (base.sections.story?.version > STORY_SAVE_VERSION || data?.version > STORY_SAVE_VERSION) {
            return fail('unsupported-story-version');
          }
          // This mode owns a complete story snapshot. Refuse to roll back
          // progress if another story session changed it after we loaded it.
          if (JSON.stringify(base.sections.story) !== JSON.stringify(store.sections.story)) {
            return fail('story-conflict');
          }
        }
        if (data === undefined) delete sections[section];
        else sections[section] = data;
      }
      const next = { ...base, version: SAVE_VERSION, savedAt: Date.now(), sections };
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(next));
      store = deepClone(next);
      writeCount += 1;
      status = { ok: true };
      return { ...status };
    } catch (err) {
      console.warn('[save] Failed to write save to localStorage:', err);
      return fail('storage-unavailable');
    }
  }

  function loadInitialStore() {
    let raw = null;
    try {
      raw = localStorage.getItem(SAVE_STORAGE_KEY);
    } catch {
      fail('storage-unavailable');
      return;
    }

    const parsed = parseDocument(raw);
    if (parsed?.version > SAVE_VERSION) {
      store = parsed;
      unsupportedRoot = true;
      fail('unsupported-version');
      return;
    }
    const migrated = migrateDocument(parsed);
    if (hasSections(migrated)) {
      store = migrated;
      if (parsed !== migrated) writeToStorage(new Map());
      return;
    }
    if (raw !== null) {
      console.warn('[save] Corrupted v2 save root; resetting to default store.');
      writeToStorage(new Map());
      return;
    }

    const legacy = readLegacyV1FromStorage();
    if (legacy) {
      const migrated = runMigrations(legacy, 1);
      store = migrated;
      writeToStorage(new Map(), () => migrated.sections);
    }
  }

  loadInitialStore();

  function get(section, fallback = {}) {
    if (!section) return deepClone(fallback);
    const existing = pendingSections.has(section) ? pendingSections.get(section) : store.sections?.[section];
    return validateSectionValue(section, existing, fallback);
  }

  function set(section, data) {
    if (!canWrite(section) || isReadOnly()) return;
    pendingSections.set(section, deepClone(data));
  }

  function markDirty(section) {
    if (isReadOnly()) return;
    if (section === undefined || canWrite(section)) sampleRegistered = true;
  }

  function collectRegisteredChanges(updates) {
    const sampled = new Map();
    for (const [section, entry] of registeredSections) {
      if (typeof entry.serializer !== 'function') continue;
      try {
        const data = deepClone(entry.serializer());
        const snapshot = JSON.stringify(data);
        if (snapshot !== entry.snapshot && !updates.has(section)) updates.set(section, data);
        sampled.set(section, snapshot);
      } catch (err) {
        console.warn(`[save] Failed to serialize registered section "${section}":`, err);
        return null;
      }
    }
    return sampled;
  }

  function flush() {
    if (!pendingSections.size && !sampleRegistered) return status.ok;
    const updates = new Map(pendingSections);
    const sampled = collectRegisteredChanges(updates);
    if (sampled === null) return fail('serialization-failed').ok;
    const result = updates.size ? writeToStorage(updates) : status;
    if (result.ok) {
      for (const [section, snapshot] of sampled) registeredSections.get(section).snapshot = snapshot;
      pendingSections.clear();
      sampleRegistered = false;
      dirtyTimer = 0;
    }
    return result.ok;
  }

  function commitSection(section, data) {
    if (!canWrite(section) || data === undefined) return fail('invalid-section');
    const result = writeToStorage(new Map([[section, deepClone(data)]]));
    if (result.ok) pendingSections.delete(section);
    return result;
  }

  function replaceSections(replacement) {
    const result = writeToStorage(new Map(), replacement);
    if (!result.ok) return false;
    const sampled = collectRegisteredChanges(new Map());
    if (sampled) {
      for (const [section, snapshot] of sampled) registeredSections.get(section).snapshot = snapshot;
    }
    pendingSections.clear();
    sampleRegistered = false;
    dirtyTimer = 0;
    return true;
  }

  function reset() {
    return replaceSections(latest => {
      if (allowedSections) {
        return Object.fromEntries(Object.entries(latest).filter(([section]) => !allowedSections.has(section)));
      }
      const settings = pendingSections.has('settings') ? pendingSections.get('settings') : latest.settings;
      return settings === undefined ? {} : { settings };
    });
  }

  function exportString() {
    flush();
    return JSON.stringify(store);
  }

  function importString(str, options = {}) {
    if (typeof str !== 'string' || !str.trim()) return false;
    const imported = migrateDocument(parseDocument(str));
    if (!hasSections(imported) || imported.version > SAVE_VERSION) return false;
    const ok = replaceSections(latest => {
      if (!allowedSections) return imported.sections;
      const sections = { ...latest };
      for (const section of allowedSections) {
        if (Object.hasOwn(imported.sections, section)) sections[section] = imported.sections[section];
        else delete sections[section];
      }
      return sections;
    });
    if (ok && options.reload !== false && typeof window !== 'undefined' && window.location?.reload) {
      window.location.reload();
    }
    return ok;
  }

  function register(section, serializer, deserializer) {
    if (!canWrite(section)) return;
    const existing = pendingSections.has(section) ? pendingSections.get(section) : store.sections?.[section];
    if (typeof deserializer === 'function' && existing !== undefined) {
      try {
        deserializer(deepClone(existing));
      } catch (err) {
        console.warn(`[save] Failed to deserialize registered section "${section}":`, err);
      }
    }
    const entry = { serializer, snapshot: undefined };
    registeredSections.set(section, entry);
    try {
      if (typeof serializer === 'function') entry.snapshot = JSON.stringify(serializer());
    } catch (err) {
      console.warn(`[save] Failed to serialize registered section "${section}":`, err);
    }
  }

  function dump() {
    if (isReadOnly()) return deepClone(store);
    const updates = new Map(pendingSections);
    collectRegisteredChanges(updates);
    const sections = { ...store.sections };
    for (const [section, data] of updates) sections[section] = data;
    return deepClone({ ...store, sections });
  }

  // Flush immediately when tab hides or page unloads
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    });
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
      flush();
    });
  }

  function update(dt) {
    if (!pendingSections.size && !sampleRegistered) return;
    dirtyTimer += dt;
    if (dirtyTimer >= THROTTLE_SEC) {
      dirtyTimer = 0;
      flush();
    }
  }

  const api = {
    version: SAVE_VERSION,
    get,
    set,
    register,
    markDirty,
    flush,
    commitSection,
    getStatus: () => ({ ...status }),
    isReadOnly,
    reset,
    exportString,
    importString,
    dump,
    update,
    getWriteCount() { return writeCount; },
  };

  if (ctx) {
    ctx.save = api;
    ctx.debug?.register('save', {
      dump: () => api.dump(),
      export: () => api.exportString(),
      import: (str, opts) => api.importString(str, opts),
      reset: () => api.reset(),
      flush: () => api.flush(),
      writeCount: () => api.getWriteCount(),
    });
  }

  return api;
}
