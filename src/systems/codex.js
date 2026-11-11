import '../i18n/codex.js';
import { i18n } from '../i18n.js';
import { CODEX_CATEGORIES, CODEX_ENTRIES, CODEX_BY_ID } from '../data/codex.js';
import { isJapanMap } from '../data/japan.js';

const DEFAULT_UNLOCKED = CODEX_ENTRIES.filter((e) => e.defaultUnlocked).map((e) => e.id);
if (!DEFAULT_UNLOCKED.includes('boudhanath')) {
  DEFAULT_UNLOCKED.unshift('boudhanath');
}

export function createCodex(ctx) {
  const { bus, save } = ctx;

  const unlockedSet = new Set(DEFAULT_UNLOCKED);
  const seenSet = new Set();

  if (save) {
    save.register(
      'codex',
      () => ({
        unlocked: Array.from(unlockedSet),
        seen: Array.from(seenSet),
      }),
      (data) => {
        unlockedSet.clear();
        for (const id of DEFAULT_UNLOCKED) unlockedSet.add(id);
        if (data && Array.isArray(data.unlocked)) {
          for (const id of data.unlocked) {
            if (CODEX_BY_ID[id]) unlockedSet.add(id);
          }
        }
        seenSet.clear();
        if (data && Array.isArray(data.seen)) {
          for (const id of data.seen) {
            if (CODEX_BY_ID[id]) seenSet.add(id);
          }
        }
      },
    );
  }

  function getTitle(id) {
    const entry = CODEX_BY_ID[id];
    if (!entry) return id;
    return i18n.t(entry.titleKey);
  }

  function unlock(id, opts = {}) {
    if (!id || !CODEX_BY_ID[id]) return false;
    if (unlockedSet.has(id)) return false;

    unlockedSet.add(id);
    save?.markDirty?.();

    const title = getTitle(id);
    if (!opts.silent) {
      bus.emit('toast', {
        text: i18n.t('toast.codexUnlock', { title }),
      });
      ctx.audio?.chime?.();
    }

    bus.emit('codex:unlock', { id, entry: CODEX_BY_ID[id] });
    bus.emit('codex:changed', { unlocked: Array.from(unlockedSet) });
    return true;
  }

  function unlockAll(opts = { silent: true }) {
    let count = 0;
    for (const entry of CODEX_ENTRIES) {
      if (!unlockedSet.has(entry.id)) {
        unlockedSet.add(entry.id);
        count += 1;
      }
    }
    if (count > 0) {
      save?.markDirty?.();
      if (!opts?.silent) {
        bus.emit('toast', {
          text: i18n.t('toast.codexUnlock', { title: `${count}` }),
        });
      }
      bus.emit('codex:changed', { unlocked: Array.from(unlockedSet) });
    }
    return list();
  }

  function markSeen(id) {
    if (!id || !CODEX_BY_ID[id]) return false;
    if (seenSet.has(id)) return false;
    seenSet.add(id);
    save?.markDirty?.();
    bus.emit('codex:seen', { id });
    return true;
  }

  function isUnlocked(id) {
    return unlockedSet.has(id);
  }

  function isSeen(id) {
    return seenSet.has(id);
  }

  function getEntry(id) {
    const entry = CODEX_BY_ID[id];
    if (!entry) return null;
    return {
      ...entry,
      unlocked: unlockedSet.has(entry.id),
      seen: seenSet.has(entry.id),
      title: i18n.t(entry.titleKey),
      body: i18n.t(entry.bodyKey),
    };
  }

  function getEntries(category = 'all') {
    const filtered =
      !category || category === 'all'
        ? CODEX_ENTRIES
        : CODEX_ENTRIES.filter((e) => e.category === category);
    return filtered.map((e) => getEntry(e.id));
  }

  function list() {
    return CODEX_ENTRIES.map((e) => ({
      id: e.id,
      category: e.category,
      tag: e.tag,
      chapter: e.chapter,
      glyph: e.glyph,
      unlocked: unlockedSet.has(e.id),
      seen: seenSet.has(e.id),
      title: i18n.t(e.titleKey),
    }));
  }

  function getUnlockedIds() {
    return Array.from(unlockedSet);
  }

  function reset() {
    unlockedSet.clear();
    seenSet.clear();
    for (const id of DEFAULT_UNLOCKED) {
      unlockedSet.add(id);
    }
    save?.markDirty?.();
    bus.emit('codex:changed', { unlocked: Array.from(unlockedSet) });
  }

  function open(id) {
    if (id && CODEX_BY_ID[id]) {
      unlock(id);
      markSeen(id);
    }
    bus.emit('codex:open', { id: id || 'boudhanath' });
  }

  // --- Event Hooks ---
  bus.on('game:start', () => {
    if (!unlockedSet.has('boudhanath')) {
      unlock('boudhanath', { silent: true });
    }
  });

  bus.on('merit', (payload = {}) => {
    const type = payload.type || payload.source;
    if (type === 'kora') unlock('kora');
    else if (type === 'prostration') unlock('prostration');
    else if (type === 'lamp') unlock('butterLamp');
    else if (type === 'wheel') unlock('prayerWheel');
  });

  bus.on('kora:lap', () => unlock('kora'));
  bus.on('prostration:complete', () => unlock('prostration'));
  bus.on('lamp:lit', () => unlock('butterLamp'));
  bus.on('wheel:spin', () => unlock('prayerWheel'));

  // Mani stone restoration / interaction
  bus.on('vitals:mani', () => unlock('maniStone'));
  bus.on('vitals:restore', (payload = {}) => {
    if (payload.source === 'mani') unlock('maniStone');
  });
  bus.on('vitals:changed', (payload = {}) => {
    if (payload.source === 'mani') unlock('maniStone');
  });
  bus.on('quest:interact', (payload = {}) => {
    if (typeof payload.target === 'string' && payload.target.includes('mani')) {
      unlock('maniStone');
    }
  });

  function unlockMantraLore() {
    if (!isJapanMap(ctx.state?.zone)) unlock('omManiPadmeHum');
  }

  bus.on('mantra:cast', unlockMantraLore);
  bus.on('player:chant', unlockMantraLore);
  bus.on('skill:cast', unlockMantraLore);

  // Enemy liberation
  bus.on('enemy:liberated', () => unlock('liberation'));

  // External unlock event (e.g. from dialogue or quest reward)
  bus.on('codex:unlock', (payload = {}) => {
    if (payload.id && !unlockedSet.has(payload.id)) {
      unlock(payload.id);
    }
  });

  // Clicking a [[codex:id|label]] link in dialogue emits codex:open { id }
  bus.on('codex:open', (payload = {}) => {
    if (payload.id && CODEX_BY_ID[payload.id]) {
      unlock(payload.id);
      markSeen(payload.id);
    }
  });

  // Reset on merit:reset
  bus.on('merit:reset', () => {
    reset();
  });

  const api = {
    update() {},
    categories: CODEX_CATEGORIES,
    entries: CODEX_ENTRIES,
    getAllEntries: () => CODEX_ENTRIES,
    unlock,
    unlockAll,
    isUnlocked,
    isSeen,
    markSeen,
    getEntry,
    getEntries,
    getUnlockedIds,
    list,
    open,
    reset,
    count: () => ({
      unlocked: unlockedSet.size,
      total: CODEX_ENTRIES.length,
    }),
  };

  ctx.codex = api;
  ctx.debug?.register?.('codex', {
    unlock: (id) => unlock(id),
    unlockAll: () => unlockAll({ silent: false }),
    isUnlocked: (id) => isUnlocked(id),
    getEntry: (id) => getEntry(id),
    getEntries: (cat) => getEntries(cat),
    getAllEntries: () => CODEX_ENTRIES,
    list: () => list(),
    getUnlockedIds: () => getUnlockedIds(),
    open: (id) => open(id),
    reset: () => reset(),
  });

  return api;
}
