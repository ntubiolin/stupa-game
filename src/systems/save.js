/**
 * Unified versioned save system (`stupa.save.v2`).
 *
 * Manages all persistent sections (`vitals`, `merit`, `items`, `tutorial`, `settings`, etc.)
 * with automatic v1 -> v2 migration, per-section schema validation & fault tolerance,
 * 1-second throttled writes, and immediate flush on `visibilitychange` / `pagehide`.
 */
export const SAVE_STORAGE_KEY = 'stupa.save.v2';
const SAVE_VERSION = 2;
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
  // Narrative sessions may only persist their own section. Refresh unrelated
  // sections at flush time so another open adventure tab is not rolled back.
  const allowedSections = writableSections ? new Set(writableSections) : null;
  let store = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    sections: {},
  };

  let isDirty = false;
  let dirtyTimer = 0;
  let writeCount = 0;
  const registeredSections = new Map();

  function syncRegisteredToStore() {
    for (const [sec, { serializer }] of registeredSections.entries()) {
      if (typeof serializer === 'function') {
        try {
          store.sections[sec] = deepClone(serializer());
        } catch (err) {
          console.warn(`[save] Failed to serialize registered section "${sec}":`, err);
        }
      }
    }
  }

  function writeToStorage() {
    syncRegisteredToStore();
    store.version = SAVE_VERSION;
    store.savedAt = Date.now();
    try {
      if (allowedSections) {
        const latestRaw = localStorage.getItem(SAVE_STORAGE_KEY);
        const latest = latestRaw ? safeParseJson(latestRaw, 'scoped flush') : null;
        if (latest?.version > SAVE_VERSION) return;
        if (latest?.version === SAVE_VERSION && latest.sections && !Array.isArray(latest.sections) && typeof latest.sections === 'object') {
          const merged = deepClone(latest.sections);
          for (const section of allowedSections) {
            if (Object.hasOwn(store.sections, section)) merged[section] = deepClone(store.sections[section]);
            else delete merged[section];
          }
          store.sections = merged;
        }
      }
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(store));
      writeCount += 1;
    } catch (err) {
      console.warn('[save] Failed to write save to localStorage:', err);
    }
    isDirty = false;
    dirtyTimer = 0;
  }

  function loadInitialStore() {
    let rawV2 = null;
    try {
      rawV2 = localStorage.getItem(SAVE_STORAGE_KEY);
    } catch { /* ignore */ }

    if (rawV2 !== null) {
      const parsed = safeParseJson(rawV2, SAVE_STORAGE_KEY);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.warn('[save] Corrupted v2 save root JSON; resetting to default store.');
        store = { version: SAVE_VERSION, savedAt: Date.now(), sections: {} };
        writeToStorage();
        return;
      }

      const ver = typeof parsed.version === 'number' ? parsed.version : 1;
      if (ver < SAVE_VERSION) {
        store = runMigrations(parsed, ver);
        writeToStorage();
        return;
      }

      if (!parsed.sections || typeof parsed.sections !== 'object' || Array.isArray(parsed.sections)) {
        console.warn('[save] Corrupted "sections" in v2 save; resetting sections to empty.');
        store = { version: SAVE_VERSION, savedAt: Date.now(), sections: {} };
        writeToStorage();
        return;
      }

      // Sanitize each section entry: if any section is not an object, log warning and drop it so get() uses fallback
      const cleanSections = {};
      for (const [secKey, secVal] of Object.entries(parsed.sections)) {
        if (!secVal || typeof secVal !== 'object' || Array.isArray(secVal)) {
          console.warn(`[save] Corrupted section "${secKey}" in stored v2 save (expected object, got ${typeof secVal}); resetting section to default.`);
          continue;
        }
        cleanSections[secKey] = secVal;
      }

      store = {
        version: SAVE_VERSION,
        savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
        sections: cleanSections,
      };
      return;
    }

    // No v2 save found — check legacy v1 keys and migrate once
    const legacyV1 = readLegacyV1FromStorage();
    if (legacyV1) {
      store = runMigrations(legacyV1, 1);
      writeToStorage();
    } else {
      store = { version: SAVE_VERSION, savedAt: Date.now(), sections: {} };
    }
  }

  loadInitialStore();

  function get(section, fallback = {}) {
    if (!section) return deepClone(fallback);
    const existing = store.sections[section];
    if (existing === undefined) {
      return deepClone(fallback);
    }
    const validated = validateSectionValue(section, existing, fallback);
    store.sections[section] = deepClone(validated);
    return deepClone(validated);
  }

  function set(section, data) {
    if (!section || (allowedSections && !allowedSections.has(section))) return;
    store.sections[section] = deepClone(data);
    isDirty = true;
  }

  function markDirty(section) {
    isDirty = true;
  }

  function flush() {
    if (!isDirty) return;
    writeToStorage();
  }

  function reset() {
    if (allowedSections) {
      for (const section of allowedSections) delete store.sections[section];
      writeToStorage();
      return;
    }
    const preservedSettings = store.sections.settings
      ? deepClone(store.sections.settings)
      : undefined;
    store.sections = {};
    if (preservedSettings !== undefined) {
      store.sections.settings = preservedSettings;
    }
    writeToStorage();
  }

  function exportString() {
    flush();
    return JSON.stringify(store);
  }

  function importString(str, options = {}) {
    if (typeof str !== 'string' || !str.trim()) {
      console.warn('[save] importString: empty or non-string input');
      return false;
    }
    const parsed = safeParseJson(str, 'importString');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn('[save] importString: invalid JSON root');
      return false;
    }
    const ver = typeof parsed.version === 'number' ? parsed.version : 1;
    const migrated = ver < SAVE_VERSION ? runMigrations(parsed, ver) : parsed;
    if (!migrated.sections || typeof migrated.sections !== 'object' || Array.isArray(migrated.sections)) {
      console.warn('[save] importString: missing sections object');
      return false;
    }
    store = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      sections: deepClone(migrated.sections),
    };
    writeToStorage();
    if (options.reload !== false && typeof window !== 'undefined' && window.location?.reload) {
      window.location.reload();
    }
    return true;
  }

  function register(section, serializer, deserializer) {
    if (!section) return;
    registeredSections.set(section, { serializer, deserializer });
    if (typeof deserializer === 'function') {
      const existing = store.sections[section];
      if (existing !== undefined) {
        try {
          deserializer(deepClone(existing));
        } catch (err) {
          console.warn(`[save] Failed to deserialize registered section "${section}":`, err);
        }
      }
    }
  }

  function dump() {
    syncRegisteredToStore();
    return deepClone(store);
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
    if (!isDirty) return;
    dirtyTimer += dt;
    if (dirtyTimer >= THROTTLE_SEC) {
      writeToStorage();
    }
  }

  const api = {
    version: SAVE_VERSION,
    get,
    set,
    register,
    markDirty,
    flush,
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
