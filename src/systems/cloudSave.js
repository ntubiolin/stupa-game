/**
 * Google Account Sign-In & Cloud Save Synchronization Engine (`src/systems/cloudSave.js`) — Issue #224
 *
 * Provides:
 *  - Guest-first local-to-cloud progression (`stupa.save.v2` <-> `/api/save`)
 *  - Google Identity Services (GIS) & local/dev Google account sign-in (`POST /api/auth/google`)
 *  - Two-tier throttled cloud sync:
 *      1. 45-second periodic dirty sync (`CLOUD_SYNC_INTERVAL_SEC = 45.0`)
 *      2. 3-second debounced milestone sync (`MILESTONE_DEBOUNCE_SEC = 3.0`) on key events
 *      3. Immediate keepalive flush on `visibilitychange` (hidden), `pagehide`, and `online`
 *  - Smart 4-way initial sync & divergence conflict detection (`resolveConflict('cloud' | 'local')`)
 *  - Adventure (`writableSections: null`) and Story (`writableSections: ['story']`) mode isolation
 */
import { resolveApiUrl } from './community.js';

export const AUTH_STORAGE_KEY = 'stupa.auth.v1';
export const CLOUD_SYNC_INTERVAL_SEC = 45.0;
export const MILESTONE_DEBOUNCE_SEC = 3.0;

const MILESTONE_EVENTS = [
  'quest:complete',
  'level:up',
  'boss:subdued',
  'terma:cleared',
  'story:chapter-change',
  'story:phone-change',
  'community:stupaBuilt',
  'community:samyeContributed',
];

function deepClone(val) {
  if (val === null || typeof val !== 'object') return val;
  try {
    return JSON.parse(JSON.stringify(val));
  } catch {
    return val;
  }
}

export function hasStoryProgress(doc) {
  const story = doc?.sections?.story;
  if (!story || typeof story !== 'object') return false;
  if (typeof story.beat === 'string' && story.beat !== 'prologue') return true;
  if (Array.isArray(story.evidence) && story.evidence.length > 0) return true;
  if (story.choices && typeof story.choices === 'object' && Object.keys(story.choices).length > 0) return true;
  if (story.journey?.activeChapterId) return true;
  if (story.journey?.chapters && typeof story.journey.chapters === 'object' && Object.keys(story.journey.chapters).length > 0) {
    return true;
  }
  return false;
}

export function extractSaveSummary(doc) {
  const sections = doc?.sections && typeof doc.sections === 'object' ? doc.sections : {};
  const vitals = sections.vitals && typeof sections.vitals === 'object' ? sections.vitals : {};
  const merit = sections.merit && typeof sections.merit === 'object' ? sections.merit : {};
  const quests = sections.quests && typeof sections.quests === 'object' ? sections.quests : {};
  const story = sections.story && typeof sections.story === 'object' ? sections.story : {};

  const questsDone = Array.isArray(quests.done)
    ? quests.done.length
    : Array.isArray(quests.completed)
      ? quests.completed.length
      : 0;

  return {
    level: typeof vitals.level === 'number' && vitals.level >= 1 ? Math.floor(vitals.level) : 1,
    exp: typeof vitals.exp === 'number' && vitals.exp >= 0 ? Math.floor(vitals.exp) : 0,
    points: Math.max(0, Number(merit.points) || 0),
    kora: Math.max(0, Number(merit.kora) || 0),
    questsDone,
    activeChapterId: story.journey?.activeChapterId || null,
    savedAt: typeof doc?.savedAt === 'number' ? doc.savedAt : 0,
  };
}

export function isFreshSave(doc) {
  if (!doc || typeof doc !== 'object') return true;
  const s = extractSaveSummary(doc);
  return (
    s.level <= 1
    && s.exp === 0
    && s.points === 0
    && s.kora === 0
    && s.questsDone === 0
    && !hasStoryProgress(doc)
  );
}

export function createCloudSave(ctx, options = {}) {
  const bus = ctx?.bus;

  function getAuthEndpoint() {
    return resolveApiUrl('/api/auth/google', options?.apiBase);
  }

  function getSaveEndpoint() {
    return resolveApiUrl('/api/save', options?.apiBase);
  }

  function getGoogleClientId() {
    if (typeof options?.googleClientId === 'string' && options.googleClientId.trim()) {
      return options.googleClientId.trim();
    }
    if (typeof globalThis !== 'undefined' && typeof globalThis.__STUPA_GOOGLE_CLIENT_ID__ === 'string') {
      const g = globalThis.__STUPA_GOOGLE_CLIENT_ID__.trim();
      if (g) return g;
    }
    if (typeof import.meta !== 'undefined' && typeof import.meta.env?.VITE_GOOGLE_CLIENT_ID === 'string') {
      const e = import.meta.env.VITE_GOOGLE_CLIENT_ID.trim();
      if (e) return e;
    }
    return '';
  }

  let session = null; // { sessionToken, expiresAt, user: { uid, email, displayName, photoURL }, lastSyncedSavedAt }
  let status = 'signed-out'; // 'signed-out' | 'syncing' | 'synced' | 'pending' | 'offline' | 'conflict'
  let cloudSummary = null;
  let cloudUpdatedAt = 0;
  let dirtySinceLastSync = false;
  let conflict = null;
  let periodicTimer = 0;
  let milestoneTimer = 0;
  let isApplyingRemote = false;
  let inFlightSync = null;

  function loadSessionFromStorage() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.sessionToken !== 'string' || !parsed.sessionToken) return null;
      if (typeof parsed.expiresAt === 'number' && parsed.expiresAt <= Date.now()) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      if (!parsed.user || typeof parsed.user !== 'object' || !parsed.user.uid) return null;
      return {
        sessionToken: parsed.sessionToken,
        expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : Date.now() + 30 * 86400 * 1000,
        user: {
          uid: String(parsed.user.uid),
          email: String(parsed.user.email || ''),
          displayName: String(parsed.user.displayName || parsed.user.email || 'Pilgrim'),
          photoURL: String(parsed.user.photoURL || ''),
        },
        lastSyncedSavedAt: typeof parsed.lastSyncedSavedAt === 'number' ? parsed.lastSyncedSavedAt : null,
      };
    } catch {
      return null;
    }
  }

  function saveSessionToStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      if (!session) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return;
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage errors
    }
  }

  function isSignedIn() {
    if (!session || !session.sessionToken) return false;
    if (typeof session.expiresAt === 'number' && session.expiresAt <= Date.now()) {
      return false;
    }
    return true;
  }

  function getSessionToken() {
    return isSignedIn() ? session.sessionToken : null;
  }

  function getUser() {
    return isSignedIn() && session?.user ? { ...session.user } : null;
  }

  function getState() {
    return {
      signedIn: isSignedIn(),
      status: isSignedIn() ? status : 'signed-out',
      user: getUser(),
      lastSyncedSavedAt: session?.lastSyncedSavedAt ?? null,
      cloudSummary: cloudSummary ? { ...cloudSummary } : null,
      cloudUpdatedAt,
      dirtySinceLastSync,
      conflict: conflict ? deepClone(conflict) : null,
      hasGoogleClientId: Boolean(getGoogleClientId()),
    };
  }

  function emitChanged() {
    bus?.emit?.('cloudSave:changed', getState());
  }

  function syncPilgrimNameFromUser(user) {
    if (!user?.displayName || !ctx?.community) return;
    try {
      const currentName = ctx.community.getPilgrimName?.() || '';
      const defaultZh = '朝聖行者';
      const defaultEn = 'Wandering Pilgrim';
      const i18nDefault = ctx.i18n?.t?.('lamp.form.defaultPilgrim') || '';
      if (!currentName || currentName === defaultZh || currentName === defaultEn || currentName === i18nDefault) {
        ctx.community.setPilgrimName?.(user.displayName);
      }
    } catch {
      // Ignore community name sync errors
    }
  }

  function applyCloudSaveToLocal(cloudSaveData, { reload = false, preserveUntouched = false } = {}) {
    if (!cloudSaveData || typeof cloudSaveData !== 'object') return false;
    isApplyingRemote = true;
    try {
      if (cloudSaveData.sections?.vitals && ctx?.vitals?.set) {
        ctx.vitals.set(cloudSaveData.sections.vitals);
      }
      const ok = ctx?.save?.importString?.(JSON.stringify(cloudSaveData), {
        reload: false,
        preserveUntouched,
        preserveSavedAt: true,
      });
      if (ok && reload && typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
        window.location.reload();
      }
      return Boolean(ok);
    } finally {
      isApplyingRemote = false;
    }
  }

  async function syncNow({ force = false, mode = 'merge', keepalive = false, silentToast = true } = {}) {
    if (!isSignedIn()) {
      return { ok: false, error: 'not-signed-in' };
    }
    if (status === 'conflict' && !force) {
      return { ok: false, error: 'conflict', conflict: deepClone(conflict) };
    }
    if (typeof fetch !== 'function') {
      dirtySinceLastSync = true;
      status = 'offline';
      emitChanged();
      return { ok: false, error: 'fetch-unavailable' };
    }

    if (inFlightSync && !force) {
      try {
        return await inFlightSync;
      } catch {
        // Proceed with fresh sync
      }
    }

    ctx?.save?.flush?.();
    const localDoc = ctx?.save?.dump?.() || { version: 2, savedAt: Date.now(), sections: {} };
    const writableSections = ctx?.save?.getWritableSections?.() ?? null;
    const effectiveMode = writableSections ? 'merge' : mode;

    status = 'syncing';
    emitChanged();

    const runSync = (async () => {
      try {
        const res = await fetch(getSaveEndpoint(), {
          method: 'POST',
          keepalive: Boolean(keepalive),
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${session.sessionToken}`,
          },
          body: JSON.stringify({
            saveData: localDoc,
            mode: effectiveMode,
            writableSections,
            baseSavedAt: session.lastSyncedSavedAt ?? null,
            force: Boolean(force),
          }),
        });

        if (!res) {
          dirtySinceLastSync = true;
          status = 'pending';
          emitChanged();
          return { ok: false, error: 'network-error' };
        }

        if (res.status === 401) {
          signOut({ silent: true });
          return { ok: false, error: 'unauthorized' };
        }

        if (res.status === 409) {
          let errPayload = null;
          try {
            errPayload = await res.json();
          } catch { /* ignore */ }
          const remoteSaveData = errPayload?.cloud?.saveData || null;
          const remoteSummary = errPayload?.cloud?.summary
            || (remoteSaveData ? extractSaveSummary(remoteSaveData) : null);
          conflict = {
            localSummary: extractSaveSummary(localDoc),
            cloudSummary: remoteSummary,
            localSaveData: deepClone(localDoc),
            cloudSaveData: deepClone(remoteSaveData),
          };
          cloudSummary = remoteSummary;
          status = 'conflict';
          bus?.emit?.('cloudSave:conflict', deepClone(conflict));
          emitChanged();
          return { ok: false, error: 'save-conflict', conflict: deepClone(conflict) };
        }

        if (!res.ok) {
          dirtySinceLastSync = true;
          status = 'pending';
          emitChanged();
          return { ok: false, error: 'sync-failed' };
        }

        const data = await res.json();
        const savedDoc = data?.saveData || localDoc;
        session.lastSyncedSavedAt = typeof savedDoc?.savedAt === 'number' ? savedDoc.savedAt : localDoc.savedAt;
        cloudSummary = data?.summary || extractSaveSummary(savedDoc);
        cloudUpdatedAt = typeof data?.updatedAt === 'number' ? data.updatedAt : Date.now();
        dirtySinceLastSync = false;
        conflict = null;
        periodicTimer = 0;
        milestoneTimer = 0;
        status = 'synced';
        saveSessionToStorage();

        if (!silentToast) {
          bus?.emit?.('toast', { key: 'settings.cloud.toastSynced' });
        }
        bus?.emit?.('cloudSave:synced', {
          summary: deepClone(cloudSummary),
          savedAt: session.lastSyncedSavedAt,
        });
        emitChanged();
        return {
          ok: true,
          summary: deepClone(cloudSummary),
          savedAt: session.lastSyncedSavedAt,
        };
      } catch {
        dirtySinceLastSync = true;
        status = 'pending';
        emitChanged();
        return { ok: false, error: 'network-error' };
      }
    })();

    inFlightSync = runSync;
    try {
      return await runSync;
    } finally {
      if (inFlightSync === runSync) {
        inFlightSync = null;
      }
    }
  }

  async function pullFromCloud({ reload = false, silentToast = false } = {}) {
    if (!isSignedIn()) {
      return { ok: false, error: 'not-signed-in' };
    }
    if (typeof fetch !== 'function') {
      status = 'offline';
      emitChanged();
      return { ok: false, error: 'fetch-unavailable' };
    }

    status = 'syncing';
    emitChanged();

    try {
      const res = await fetch(getSaveEndpoint(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.sessionToken}`,
        },
      });
      if (!res) {
        status = 'pending';
        emitChanged();
        return { ok: false, error: 'network-error' };
      }
      if (res.status === 401) {
        signOut({ silent: true });
        return { ok: false, error: 'unauthorized' };
      }
      if (!res.ok) {
        status = 'pending';
        emitChanged();
        return { ok: false, error: 'pull-failed' };
      }
      const data = await res.json();
      if (!data?.exists || !data?.saveData) {
        status = 'synced';
        emitChanged();
        return { ok: false, error: 'no-cloud-save' };
      }

      const applied = applyCloudSaveToLocal(data.saveData, { reload });
      if (!applied) {
        status = 'pending';
        emitChanged();
        return { ok: false, error: 'import-failed' };
      }

      session.lastSyncedSavedAt = typeof data.saveData.savedAt === 'number'
        ? data.saveData.savedAt
        : Date.now();
      cloudSummary = data.summary || extractSaveSummary(data.saveData);
      cloudUpdatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : session.lastSyncedSavedAt;
      dirtySinceLastSync = false;
      conflict = null;
      periodicTimer = 0;
      milestoneTimer = 0;
      status = 'synced';
      saveSessionToStorage();

      if (!silentToast) {
        bus?.emit?.('toast', { key: 'settings.cloud.toastLoaded' });
      }
      emitChanged();
      return {
        ok: true,
        summary: deepClone(cloudSummary),
        savedAt: session.lastSyncedSavedAt,
      };
    } catch {
      status = 'pending';
      emitChanged();
      return { ok: false, error: 'network-error' };
    }
  }

  async function performInitialSync() {
    if (!isSignedIn()) {
      return { ok: false, error: 'not-signed-in' };
    }
    if (typeof fetch !== 'function') {
      status = 'offline';
      emitChanged();
      return { ok: false, error: 'fetch-unavailable' };
    }

    status = 'syncing';
    emitChanged();

    try {
      const res = await fetch(getSaveEndpoint(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.sessionToken}`,
        },
      });
      if (!res) {
        status = 'pending';
        emitChanged();
        return { ok: false, error: 'network-error' };
      }
      if (res.status === 401) {
        signOut({ silent: true });
        return { ok: false, error: 'unauthorized' };
      }
      if (!res.ok) {
        status = 'pending';
        emitChanged();
        return { ok: false, error: 'initial-sync-failed' };
      }

      const cloud = await res.json();
      ctx?.save?.flush?.();
      const localDoc = ctx?.save?.dump?.() || { version: 2, savedAt: Date.now(), sections: {} };
      const writableSections = ctx?.save?.getWritableSections?.() ?? null;
      const isStoryModeOnly = Array.isArray(writableSections)
        && writableSections.length === 1
        && writableSections[0] === 'story';

      // Case 1: Cloud save does not exist yet -> upload local progress immediately
      if (!cloud?.exists || !cloud?.saveData) {
        const pushRes = await syncNow({ force: true, mode: 'overwrite', silentToast: true });
        if (pushRes.ok) {
          bus?.emit?.('toast', { key: 'settings.cloud.toastFirstSync' });
        }
        return pushRes;
      }

      const remoteDoc = cloud.saveData;
      const remoteSummary = cloud.summary || extractSaveSummary(remoteDoc);
      cloudSummary = remoteSummary;
      cloudUpdatedAt = typeof cloud.updatedAt === 'number' ? cloud.updatedAt : (remoteDoc.savedAt || Date.now());

      // Case 2: Local save is fresh and Cloud has a save -> automatically pull cloud save
      if (isFreshSave(localDoc)) {
        applyCloudSaveToLocal(remoteDoc, { reload: false });
        session.lastSyncedSavedAt = typeof remoteDoc.savedAt === 'number' ? remoteDoc.savedAt : Date.now();
        dirtySinceLastSync = false;
        conflict = null;
        status = 'synced';
        saveSessionToStorage();
        bus?.emit?.('toast', { key: 'settings.cloud.toastLoaded' });
        emitChanged();
        return { ok: true, action: 'pulled-fresh', summary: deepClone(cloudSummary) };
      }

      // Case 3a: Story mode with fresh local story & existing cloud story -> pull cloud story section
      if (isStoryModeOnly && !hasStoryProgress(localDoc) && hasStoryProgress(remoteDoc)) {
        applyCloudSaveToLocal(remoteDoc, { reload: false, preserveUntouched: true });
        session.lastSyncedSavedAt = typeof remoteDoc.savedAt === 'number' ? remoteDoc.savedAt : Date.now();
        dirtySinceLastSync = false;
        conflict = null;
        status = 'synced';
        saveSessionToStorage();
        bus?.emit?.('toast', { key: 'settings.cloud.toastLoaded' });
        emitChanged();
        return { ok: true, action: 'pulled-story', summary: deepClone(cloudSummary) };
      }

      // Case 3b: Identical sections -> mark synced
      if (JSON.stringify(localDoc.sections || {}) === JSON.stringify(remoteDoc.sections || {})) {
        session.lastSyncedSavedAt = typeof remoteDoc.savedAt === 'number' ? remoteDoc.savedAt : localDoc.savedAt;
        dirtySinceLastSync = false;
        conflict = null;
        status = 'synced';
        saveSessionToStorage();
        emitChanged();
        return { ok: true, action: 'identical', summary: deepClone(cloudSummary) };
      }

      // Case 3c: Local hasn't changed since last sync, and cloud is newer -> auto-pull
      if (
        session.lastSyncedSavedAt
        && localDoc.savedAt === session.lastSyncedSavedAt
        && typeof remoteDoc.savedAt === 'number'
        && remoteDoc.savedAt > localDoc.savedAt
      ) {
        applyCloudSaveToLocal(remoteDoc, { reload: false });
        session.lastSyncedSavedAt = remoteDoc.savedAt;
        dirtySinceLastSync = false;
        conflict = null;
        status = 'synced';
        saveSessionToStorage();
        bus?.emit?.('toast', { key: 'settings.cloud.toastLoaded' });
        emitChanged();
        return { ok: true, action: 'fast-forward-pull', summary: deepClone(cloudSummary) };
      }

      // Case 3d: Cloud hasn't changed since last sync, and local is newer -> auto-push
      if (
        session.lastSyncedSavedAt
        && remoteDoc.savedAt === session.lastSyncedSavedAt
        && typeof localDoc.savedAt === 'number'
        && localDoc.savedAt > session.lastSyncedSavedAt
      ) {
        return await syncNow({ force: false, silentToast: true });
      }

      // Case 4: Divergent progress on both sides -> Conflict!
      conflict = {
        localSummary: extractSaveSummary(localDoc),
        cloudSummary: remoteSummary,
        localSaveData: deepClone(localDoc),
        cloudSaveData: deepClone(remoteDoc),
      };
      status = 'conflict';
      bus?.emit?.('cloudSave:conflict', deepClone(conflict));
      emitChanged();
      return { ok: false, error: 'save-conflict', conflict: deepClone(conflict) };
    } catch {
      status = 'pending';
      emitChanged();
      return { ok: false, error: 'network-error' };
    }
  }

  async function resolveConflict(choice, { reload = false } = {}) {
    if (!conflict) {
      return { ok: false, error: 'no-conflict' };
    }
    if (choice === 'cloud') {
      const remoteDoc = conflict.cloudSaveData;
      if (!remoteDoc) {
        return await pullFromCloud({ reload });
      }
      const ok = applyCloudSaveToLocal(remoteDoc, { reload });
      if (!ok) {
        return { ok: false, error: 'import-failed' };
      }
      if (session) {
        session.lastSyncedSavedAt = typeof remoteDoc.savedAt === 'number' ? remoteDoc.savedAt : Date.now();
      }
      cloudSummary = conflict.cloudSummary || extractSaveSummary(remoteDoc);
      conflict = null;
      dirtySinceLastSync = false;
      periodicTimer = 0;
      milestoneTimer = 0;
      status = 'synced';
      saveSessionToStorage();
      bus?.emit?.('toast', { key: 'settings.cloud.toastConflictCloud' });
      emitChanged();
      return { ok: true, choice: 'cloud', summary: deepClone(cloudSummary) };
    }

    if (choice === 'local') {
      const res = await syncNow({ force: true, mode: 'overwrite', silentToast: true });
      if (res.ok) {
        bus?.emit?.('toast', { key: 'settings.cloud.toastConflictLocal' });
      }
      return { ...res, choice: 'local' };
    }

    return { ok: false, error: 'invalid-choice' };
  }

  let gisLoadPromise = null;
  function loadGoogleGisScript() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return Promise.resolve(false);
    }
    if (window.google?.accounts?.id) {
      return Promise.resolve(true);
    }
    if (gisLoadPromise) return gisLoadPromise;

    gisLoadPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(Boolean(window.google?.accounts?.id)), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(Boolean(window.google?.accounts?.id));
      script.onerror = () => resolve(false);
      document.head?.appendChild(script);
    });
    return gisLoadPromise;
  }

  async function exchangeAuthWithBackend(authPayload) {
    if (typeof fetch !== 'function') {
      return { ok: false, error: 'fetch-unavailable' };
    }
    try {
      const res = await fetch(getAuthEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(authPayload),
      });
      if (!res || !res.ok) {
        return { ok: false, error: 'auth-failed' };
      }
      const data = await res.json();
      if (!data?.ok || !data?.sessionToken || !data?.user?.uid) {
        return { ok: false, error: 'invalid-auth-response' };
      }
      session = {
        sessionToken: String(data.sessionToken),
        expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : Date.now() + 30 * 86400 * 1000,
        user: {
          uid: String(data.user.uid),
          email: String(data.user.email || ''),
          displayName: String(data.user.displayName || data.user.email || 'Pilgrim'),
          photoURL: String(data.user.photoURL || ''),
        },
        lastSyncedSavedAt: null,
      };
      status = 'syncing';
      saveSessionToStorage();
      syncPilgrimNameFromUser(session.user);
      bus?.emit?.('cloudSave:signedIn', { user: getUser() });
      emitChanged();

      const syncResult = await performInitialSync();
      return {
        ok: true,
        user: getUser(),
        syncResult,
        state: getState(),
      };
    } catch {
      return { ok: false, error: 'network-error' };
    }
  }

  async function signInWithGoogle(customCredentialOrProfile = null) {
    // 1. Direct credential or devProfile passed programmatically / from inline form
    if (customCredentialOrProfile && typeof customCredentialOrProfile === 'object') {
      if (typeof customCredentialOrProfile.idToken === 'string' && customCredentialOrProfile.idToken.trim()) {
        return await exchangeAuthWithBackend({ idToken: customCredentialOrProfile.idToken.trim() });
      }
      const profile = customCredentialOrProfile.devProfile || customCredentialOrProfile;
      if (profile && typeof profile === 'object' && (profile.email || profile.uid || profile.displayName)) {
        const email = String(profile.email || 'pilgrim@stupa.dev').trim().toLowerCase();
        const displayName = String(profile.displayName || email.split('@')[0] || 'Pilgrim').trim();
        return await exchangeAuthWithBackend({
          devProfile: {
            uid: profile.uid ? String(profile.uid) : undefined,
            email,
            displayName,
            photoURL: profile.photoURL ? String(profile.photoURL) : '',
          },
        });
      }
    }

    // 2. If Google Client ID is configured, attempt Google Identity Services (GIS)
    const clientId = getGoogleClientId();
    if (clientId) {
      const gisReady = await loadGoogleGisScript();
      if (gisReady && typeof window !== 'undefined' && window.google?.accounts?.id) {
        return await new Promise((resolve) => {
          let settled = false;
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              if (settled) return;
              settled = true;
              if (response?.credential) {
                const res = await exchangeAuthWithBackend({ idToken: response.credential });
                resolve(res);
              } else {
                resolve({ ok: false, error: 'missing-credential' });
              }
            },
          });
          window.google.accounts.id.prompt((notification) => {
            if (settled) return;
            if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
              settled = true;
              bus?.emit?.('cloudSave:requestDevPrompt', {});
              resolve({ ok: false, needsDevPrompt: true });
            }
          });
        });
      }
    }

    // 3. Fallback to built-in Google Account Sign-In Form in Settings UI
    bus?.emit?.('cloudSave:requestDevPrompt', {});
    return { ok: false, needsDevPrompt: true };
  }

  function signOut({ silent = false } = {}) {
    session = null;
    status = 'signed-out';
    cloudSummary = null;
    cloudUpdatedAt = 0;
    dirtySinceLastSync = false;
    conflict = null;
    periodicTimer = 0;
    milestoneTimer = 0;
    saveSessionToStorage();
    if (!silent) {
      bus?.emit?.('toast', { key: 'settings.cloud.toastSignedOut' });
    }
    bus?.emit?.('cloudSave:signedOut', {});
    emitChanged();
    return { ok: true };
  }

  async function deleteCloudSave() {
    if (!isSignedIn() || typeof fetch !== 'function') {
      return { ok: false, error: 'not-signed-in' };
    }
    try {
      const res = await fetch(getSaveEndpoint(), {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.sessionToken}`,
        },
      });
      if (!res || !res.ok) return { ok: false, error: 'delete-failed' };
      cloudSummary = null;
      cloudUpdatedAt = 0;
      if (session) {
        session.lastSyncedSavedAt = null;
        saveSessionToStorage();
      }
      emitChanged();
      return { ok: true, deleted: true };
    } catch {
      return { ok: false, error: 'network-error' };
    }
  }

  // ---------------------------------------------------------------- Hooks & Event Listeners
  const unsubFlush = ctx?.save?.onFlush?.((payload) => {
    if (isApplyingRemote || payload?.source === 'import') return;
    dirtySinceLastSync = true;
  });

  const unsubBusList = [];
  if (bus?.on) {
    for (const evName of MILESTONE_EVENTS) {
      const unsub = bus.on(evName, () => {
        dirtySinceLastSync = true;
        if (isSignedIn() && status !== 'conflict') {
          milestoneTimer = MILESTONE_DEBOUNCE_SEC;
        }
      });
      if (typeof unsub === 'function') unsubBusList.push(unsub);
    }
  }

  function handlePageHideOrHidden() {
    if (!isSignedIn() || status === 'conflict') return;
    if (dirtySinceLastSync || milestoneTimer > 0) {
      ctx?.save?.flush?.();
      syncNow({ keepalive: true, silentToast: true });
    }
  }

  function handleOnline() {
    if (!isSignedIn() || status === 'conflict') return;
    if (dirtySinceLastSync || status === 'pending' || status === 'offline') {
      syncNow({ silentToast: true });
    }
  }

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handlePageHideOrHidden();
      }
    });
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', handlePageHideOrHidden);
    window.addEventListener('online', handleOnline);
  }

  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (!isSignedIn() || status === 'conflict' || status === 'syncing') return;

    if (milestoneTimer > 0) {
      milestoneTimer -= dt;
      if (milestoneTimer <= 0) {
        milestoneTimer = 0;
        periodicTimer = 0;
        syncNow({ silentToast: true });
        return;
      }
    }

    if (dirtySinceLastSync) {
      periodicTimer += dt;
      if (periodicTimer >= CLOUD_SYNC_INTERVAL_SEC) {
        periodicTimer = 0;
        syncNow({ silentToast: true });
      }
    }
  }

  function dispose() {
    unsubFlush?.();
    for (const u of unsubBusList) u();
  }

  // Restore existing session on boot
  const initialSession = loadSessionFromStorage();
  if (initialSession) {
    session = initialSession;
    status = 'synced';
    syncPilgrimNameFromUser(session.user);
    if (options?.autoSync !== false) {
      performInitialSync();
    }
  }

  const api = {
    update,
    isSignedIn,
    getUser,
    getSessionToken,
    getStatus: () => (isSignedIn() ? status : 'signed-out'),
    getState,
    getConflict: () => (conflict ? deepClone(conflict) : null),
    signInWithGoogle,
    signOut,
    performInitialSync,
    syncNow,
    pullFromCloud,
    resolveConflict,
    deleteCloudSave,
    dispose,
  };

  if (ctx) {
    ctx.cloudSave = api;
    ctx.debug?.register('cloudSave', {
      state: () => api.getState(),
      signIn: (arg) => api.signInWithGoogle(arg),
      signOut: () => api.signOut(),
      syncNow: (opts) => api.syncNow(opts),
      pull: (opts) => api.pullFromCloud(opts),
      resolveConflict: (choice, opts) => api.resolveConflict(choice, opts),
      deleteCloudSave: () => api.deleteCloudSave(),
    });
  }

  return api;
}
