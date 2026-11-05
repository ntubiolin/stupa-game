/**
 * Inventory & Equipment system — 30-slot bag, 8 equipment slots,
 * equipment stat aggregation, turquoise currency, crafting materials,
 * and persistence via ctx.save.
 */
import * as THREE from 'three';
import { EQUIPMENT_SLOTS, ITEM_BASES_BY_ID } from '../data/itemBases.js';

export const BAG_CAPACITY = 30;

export const STAT_KEYS = [
  'atk',
  'atkPct',
  'def',
  'maxHp',
  'maxMp',
  'mpRegen',
  'critChance',
  'critDamage',
  'moveSpeed',
  'cdr',
  'mantraRadius',
  'skillDamage',
  'magicRes',
  'hpOnLiberate',
  'expBonus',
  'findBonus',
];

export function createEmptyEquipStats() {
  return {
    atk: 0,
    atkPct: 0,
    def: 0,
    maxHp: 0,
    maxMp: 0,
    mpRegen: 0,
    critChance: 0,
    critDamage: 0,
    moveSpeed: 0,
    cdr: 0,
    mantraRadius: 0,
    skillDamage: 0,
    magicRes: 0,
    hpOnLiberate: 0,
    expBonus: 0,
    findBonus: 0,
  };
}

export function sumSingleItemStats(item) {
  const totals = createEmptyEquipStats();
  if (!item) return totals;

  if (item.implicit) {
    const { stat, value, extraStat, extraValue } = item.implicit;
    if (stat && stat in totals && typeof value === 'number') {
      totals[stat] += value;
    }
    if (extraStat && extraStat in totals && typeof extraValue === 'number') {
      totals[extraStat] += extraValue;
    }
  }

  if (Array.isArray(item.affixes)) {
    for (let i = 0; i < item.affixes.length; i++) {
      const af = item.affixes[i];
      if (af && af.stat && af.stat in totals && typeof af.value === 'number') {
        totals[af.stat] += af.value;
      }
    }
  }

  totals.mpRegen = Math.round(totals.mpRegen * 10) / 10;
  return totals;
}

export function createInventory(ctx) {
  const { state, bus } = ctx;

  function defaultEquipped() {
    const eq = {};
    for (const s of EQUIPMENT_SLOTS) eq[s] = null;
    return eq;
  }

  function defaultMaterials() {
    return {
      turquoiseShard: 0,
      goldDust: 0,
      termaEssence: 0,
    };
  }

  function hydrateItem(raw) {
    if (!raw || typeof raw !== 'object' || !raw.baseId) return null;
    const item = {
      ...raw,
      implicit: raw.implicit ? { ...raw.implicit } : { stat: 'atk', value: 1 },
      affixes: Array.isArray(raw.affixes)
        ? raw.affixes.map((a) => ({ ...a }))
        : [],
    };
    Object.defineProperty(item, 'name', {
      enumerable: true,
      configurable: true,
      get() {
        return (
          ctx.loot?.formatItemName?.(item) ||
          ITEM_BASES_BY_ID[item.baseId]?.id ||
          item.baseId
        );
      },
    });
    return item;
  }

  let bag = new Array(BAG_CAPACITY).fill(null);
  let equipped = defaultEquipped();
  let turquoise = 0;
  let materials = defaultMaterials();

  function syncState() {
    state.equipment = { ...equipped };
    state.inventory = {
      turquoise,
      materials: { ...materials },
      bagCount: bag.filter(Boolean).length,
      bagCapacity: BAG_CAPACITY,
    };
  }

  function load() {
    if (!ctx.save) return;
    const saved = ctx.save.get('inventory', null);
    if (!saved || typeof saved !== 'object') {
      syncState();
      return;
    }

    const nextBag = new Array(BAG_CAPACITY).fill(null);
    if (Array.isArray(saved.bag)) {
      for (let i = 0; i < Math.min(BAG_CAPACITY, saved.bag.length); i++) {
        nextBag[i] = hydrateItem(saved.bag[i]);
      }
    }
    bag = nextBag;

    const nextEq = defaultEquipped();
    if (saved.equipped && typeof saved.equipped === 'object') {
      for (const slot of EQUIPMENT_SLOTS) {
        nextEq[slot] = hydrateItem(saved.equipped[slot]);
      }
    }
    equipped = nextEq;

    turquoise = Math.max(0, Math.floor(Number(saved.turquoise) || 0));
    materials = {
      ...defaultMaterials(),
      ...(saved.materials && typeof saved.materials === 'object'
        ? saved.materials
        : {}),
    };
    syncState();
  }

  function save() {
    syncState();
    if (!ctx.save) return;
    ctx.save.set('inventory', {
      bag: bag.map((it) => (it ? { ...it } : null)),
      equipped: Object.fromEntries(
        EQUIPMENT_SLOTS.map((s) => [s, equipped[s] ? { ...equipped[s] } : null])
      ),
      turquoise,
      materials: { ...materials },
    });
  }

  load();

  // ---------------------------------------------------------------- Bag & Equipment Operations
  function getFreeSlotIndex() {
    return bag.findIndex((it) => it === null);
  }

  function add(item) {
    const hydrated = hydrateItem(item);
    if (!hydrated) return false;

    const freeIdx = getFreeSlotIndex();
    if (freeIdx === -1) {
      bus.emit('toast', {
        key: 'toast.inventoryFull',
        kind: 'warning',
      });
      return false;
    }

    bag[freeIdx] = hydrated;
    save();
    bus.emit('inventory:changed', { reason: 'add', item: hydrated, slotIndex: freeIdx });
    return true;
  }

  function remove(uid) {
    if (!uid) return null;
    const bagIdx = bag.findIndex((it) => it && it.uid === uid);
    if (bagIdx !== -1) {
      const removed = bag[bagIdx];
      bag[bagIdx] = null;
      save();
      bus.emit('inventory:changed', { reason: 'remove', uid, item: removed });
      return removed;
    }

    for (const slot of EQUIPMENT_SLOTS) {
      if (equipped[slot] && equipped[slot].uid === uid) {
        const removed = equipped[slot];
        equipped[slot] = null;
        save();
        bus.emit('equipment:changed', { slot, item: null, previous: removed });
        bus.emit('inventory:changed', { reason: 'remove', uid, item: removed });
        return removed;
      }
    }
    return null;
  }

  function get(uid) {
    if (!uid) return null;
    const inBag = bag.find((it) => it && it.uid === uid);
    if (inBag) return inBag;
    for (const slot of EQUIPMENT_SLOTS) {
      if (equipped[slot] && equipped[slot].uid === uid) return equipped[slot];
    }
    return null;
  }

  function equip(uid) {
    if (!uid) return false;
    const bagIdx = bag.findIndex((it) => it && it.uid === uid);
    if (bagIdx === -1) return false;

    const item = bag[bagIdx];
    const slot = item.slot;
    if (!EQUIPMENT_SLOTS.includes(slot)) return false;

    const previous = equipped[slot] || null;
    // Place old equipped item into the exact bag slot of the new item
    bag[bagIdx] = previous;
    equipped[slot] = item;

    save();
    bus.emit('equipment:changed', { slot, item, previous });
    bus.emit('inventory:changed', { reason: 'equip', slot, item, previous });
    bus.emit('sfx', { name: 'pickupGear' });
    return true;
  }

  function unequip(slot) {
    if (!EQUIPMENT_SLOTS.includes(slot)) return false;
    const current = equipped[slot];
    if (!current) return false;

    const freeIdx = getFreeSlotIndex();
    if (freeIdx === -1) {
      bus.emit('toast', {
        key: 'toast.inventoryFull',
        kind: 'warning',
      });
      return false;
    }

    equipped[slot] = null;
    bag[freeIdx] = current;

    save();
    bus.emit('equipment:changed', { slot, item: null, previous: current });
    bus.emit('inventory:changed', { reason: 'unequip', slot, item: current });
    bus.emit('sfx', { name: 'pickupGear' });
    return true;
  }

  function discard(uid) {
    const item = remove(uid);
    if (!item) return false;
    const p = state.player;
    const heading = p.heading || 0;
    const targetX = p.position.x - Math.sin(heading) * 1.8;
    const targetZ = p.position.z - Math.cos(heading) * 1.8;
    const groundY = ctx.world ? ctx.world.getHeight(targetX, targetZ) : p.position.y;
    bus.emit('loot:drop', {
      item,
      position: new THREE.Vector3(targetX, groundY, targetZ),
      startPos: new THREE.Vector3(p.position.x, p.position.y + 0.5, p.position.z),
    });
    return true;
  }

  function getEquipped() {
    return { ...equipped };
  }

  function getBag() {
    return bag.filter(Boolean);
  }

  function getBagSlots() {
    return [...bag];
  }

  function getEquipStats() {
    const totals = createEmptyEquipStats();
    for (const slot of EQUIPMENT_SLOTS) {
      const item = equipped[slot];
      if (!item) continue;
      const single = sumSingleItemStats(item);
      for (const k of STAT_KEYS) {
        totals[k] += single[k];
      }
    }
    totals.mpRegen = Math.round(totals.mpRegen * 10) / 10;
    return totals;
  }

  // ---------------------------------------------------------------- Currency & Materials
  function addTurquoise(n) {
    const delta = Math.max(0, Math.floor(Number(n) || 0));
    if (delta <= 0) return turquoise;
    turquoise += delta;
    save();
    bus.emit('currency:changed', { turquoise, delta });
    bus.emit('inventory:changed', { reason: 'currency', turquoise, delta });
    return turquoise;
  }

  function spendTurquoise(n) {
    const cost = Math.max(0, Math.floor(Number(n) || 0));
    if (cost <= 0) return true;
    if (turquoise < cost) return false;
    turquoise -= cost;
    save();
    bus.emit('currency:changed', { turquoise, delta: -cost });
    bus.emit('inventory:changed', { reason: 'currency', turquoise, delta: -cost });
    return true;
  }

  function addMaterial(id, n = 1) {
    if (!id) return 0;
    const delta = Math.max(0, Math.floor(Number(n) || 0));
    materials[id] = (materials[id] || 0) + delta;
    save();
    bus.emit('inventory:changed', { reason: 'material', id, count: materials[id] });
    return materials[id];
  }

  function spendMaterials(costs = {}) {
    if (!costs || typeof costs !== 'object') return true;
    for (const [id, req] of Object.entries(costs)) {
      const needed = Math.max(0, Math.floor(Number(req) || 0));
      if ((materials[id] || 0) < needed) return false;
    }
    for (const [id, req] of Object.entries(costs)) {
      const needed = Math.max(0, Math.floor(Number(req) || 0));
      materials[id] = (materials[id] || 0) - needed;
    }
    save();
    bus.emit('inventory:changed', { reason: 'material', materials: { ...materials } });
    return true;
  }

  // ---------------------------------------------------------------- Debug Helpers
  function give(rarityOrOpts, maybeOpts = {}) {
    let opts = {};
    if (typeof rarityOrOpts === 'string') {
      if (typeof maybeOpts === 'string') {
        opts = { rarity: rarityOrOpts, legendaryId: maybeOpts };
      } else if (
        rarityOrOpts !== 'normal' &&
        rarityOrOpts !== 'blessed' &&
        rarityOrOpts !== 'rare' &&
        rarityOrOpts !== 'terma'
      ) {
        opts = { ...(maybeOpts || {}), rarity: 'terma', legendaryId: rarityOrOpts };
      } else {
        opts = { ...(maybeOpts || {}), rarity: rarityOrOpts };
      }
    } else if (rarityOrOpts && typeof rarityOrOpts === 'object') {
      opts = { ...rarityOrOpts };
    }
    const item = ctx.loot?.generate ? ctx.loot.generate(opts) : null;
    if (!item) return null;
    const ok = add(item);
    return ok ? item : null;
  }

  function scoreItemForEquipBest(item) {
    if (!item) return -1;
    const st = sumSingleItemStats(item);
    const termaBonus = item.rarity === 'terma' ? 10000 : 0;
    return (
      termaBonus +
      st.atk * 100 +
      st.atkPct * 50 +
      st.critChance * 40 +
      st.critDamage * 20 +
      st.def * 30 +
      st.maxHp * 5 +
      (item.ilvl || 1)
    );
  }

  function equipBest() {
    for (const slot of EQUIPMENT_SLOTS) {
      let bestUid = null;
      let bestScore = scoreItemForEquipBest(equipped[slot]);
      for (let i = 0; i < bag.length; i++) {
        const it = bag[i];
        if (!it || it.slot !== slot) continue;
        const s = scoreItemForEquipBest(it);
        if (s > bestScore) {
          bestScore = s;
          bestUid = it.uid;
        }
      }
      if (bestUid) {
        equip(bestUid);
      }
    }
    return getEquipped();
  }

  function clear() {
    bag = new Array(BAG_CAPACITY).fill(null);
    equipped = defaultEquipped();
    save();
    for (const slot of EQUIPMENT_SLOTS) {
      bus.emit('equipment:changed', { slot, item: null, previous: null });
    }
    bus.emit('inventory:changed', { reason: 'clear' });
  }

  bus.on('merit:reset', () => {
    bag = new Array(BAG_CAPACITY).fill(null);
    equipped = defaultEquipped();
    turquoise = 0;
    materials = defaultMaterials();
    save();
    for (const slot of EQUIPMENT_SLOTS) {
      bus.emit('equipment:changed', { slot, item: null, previous: null });
    }
    bus.emit('currency:changed', { turquoise: 0, delta: 0 });
    bus.emit('inventory:changed', { reason: 'reset' });
  });

  const api = {
    update() {},
    add,
    remove,
    get,
    equip,
    unequip,
    discard,
    getEquipped,
    getEquipment: getEquipped,
    getBag,
    getBagSlots,
    getEquipStats,
    addTurquoise,
    spendTurquoise,
    getTurquoise: () => turquoise,
    addMaterial,
    spendMaterials,
    getMaterials: () => ({ ...materials }),
    give,
    equipBest,
    clear,
  };

  ctx.inventory = api;

  ctx.debug?.register('inventory', {
    give: (rarity, opts) => api.give(rarity, opts),
    equip: (uid) => api.equip(uid),
    unequip: (slot) => api.unequip(slot),
    equipBest: () => api.equipBest(),
    clear: () => api.clear(),
    addTurquoise: (n) => api.addTurquoise(n),
    addMaterial: (id, n) => api.addMaterial(id, n),
    getBag: () => api.getBag(),
    getEquipped: () => api.getEquipped(),
    getEquipment: () => api.getEquipped(),
    getEquipStats: () => api.getEquipStats(),
  });

  return api;
}
