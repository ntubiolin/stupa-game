/**
 * Loot generation & drop system — Diablo-style item generator with item level (ilvl),
 * 4 rarities (normal, blessed, rare, terma), 16 affix stats across 4 tiers,
 * 6 Terma legendaries with unique powerIds, monster drop tables, and debug tools.
 */
import * as THREE from 'three';
import {
  EQUIPMENT_SLOTS,
  ITEM_BASES,
  ITEM_BASES_BY_ID,
  getBasesForSlot,
} from '../data/itemBases.js';
import { AFFIXES, AFFIXES_BY_ID } from '../data/affixes.js';
import { LEGENDARIES, LEGENDARIES_BY_ID } from '../data/legendaries.js';
import { RARE_NAME_COUNT, ITEMS_STRINGS } from '../i18n/items.js';

const RARITY_WEIGHTS = {
  normal: 60,
  blessed: 28,
  rare: 10,
  terma: 2,
};

const RARITY_SELL_MULT = {
  normal: 0.5,
  blessed: 1.0,
  rare: 1.5,
  terma: 2.5,
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return min + Math.random() * (max - min);
}

let uidCounter = 0;
function nextUid(prefix = 'i_') {
  uidCounter += 1;
  const rand = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `${prefix}${ rand.slice(0, 4) }${ (uidCounter % 100).toString(16).padStart(2, '0') }`;
}

export function createLoot(ctx) {
  const { state, bus, i18n } = ctx;

  // Stub inventory bag for #23 (replaced by full ctx.inventory in #24)
  const tempBag = [];
  let tempTurquoise = 0;
  const manualPowers = new Set();

  // Provide ctx.powers.has(id) fallback if full powers system (#27) is not yet initialized
  if (!ctx.powers) {
    ctx.powers = {
      has(powerId) {
        if (!powerId) return false;
        if (manualPowers.has(powerId)) return true;
        const equipped =
          ctx.inventory?.getEquipment?.() ||
          ctx.inventory?.getEquipped?.() ||
          state.equipment ||
          null;
        if (equipped && typeof equipped === 'object') {
          for (const item of Object.values(equipped)) {
            if (
              item &&
              (item.powerId === powerId || item.legendaryId === powerId)
            ) {
              return true;
            }
          }
        }
        return false;
      },
      listActive() {
        const active = new Set(manualPowers);
        const equipped =
          ctx.inventory?.getEquipment?.() ||
          ctx.inventory?.getEquipped?.() ||
          state.equipment ||
          null;
        if (equipped && typeof equipped === 'object') {
          for (const item of Object.values(equipped)) {
            if (item && (item.powerId || item.legendaryId)) {
              active.add(item.powerId || item.legendaryId);
            }
          }
        }
        return Array.from(active);
      },
      set(powerId, enabled = true) {
        if (enabled) manualPowers.add(powerId);
        else manualPowers.delete(powerId);
        return manualPowers.has(powerId);
      },
    };
  }

  // ---------------------------------------------------------------- Rarity Roll
  function rollRarity({ rank = 'normal', findBonus, tier } = {}) {
    const bonus =
      findBonus != null
        ? Number(findBonus) || 0
        : Number(state.player?.findBonus) || 0;
    const shrineMult = Number(state.player?.shrineFindMult) || 1;
    const mfMult = Math.max(0, 1 + bonus / 100) * shrineMult;
    const effTier =
      tier != null
        ? Number(tier) || 0
        : state.zone === 'terma'
          ? Number(state.dungeon?.tier) || 0
          : 0;

    const wNormal = RARITY_WEIGHTS.normal;
    const wBlessed = RARITY_WEIGHTS.blessed * mfMult;
    const wRare = RARITY_WEIGHTS.rare * mfMult;
    const wTerma =
      (RARITY_WEIGHTS.terma + (effTier > 0 ? 0.3 * effTier : 0)) * mfMult;

    const total = wNormal + wBlessed + wRare + wTerma;
    const r = Math.random() * total;
    if (r < wNormal) return 'normal';
    if (r < wNormal + wBlessed) return 'blessed';
    if (r < wNormal + wBlessed + wRare) return 'rare';
    return 'terma';
  }

  // ---------------------------------------------------------------- Weighted Affix Pick
  function pickWeightedAffix(candidates) {
    if (!candidates || candidates.length === 0) return null;
    let totalWeight = 0;
    for (let i = 0; i < candidates.length; i++) {
      totalWeight += candidates[i].weight || 100;
    }
    let r = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      r -= candidates[i].weight || 100;
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  function rollAffixesForItem(slot, ilvl, count, rarity) {
    if (count <= 0) return [];
    const usedStats = new Set();
    const result = [];

    const slotAffixes = AFFIXES.filter(
      (a) => a.slots.includes(slot) && a.tiers.some((t) => t.minIlvl <= ilvl)
    );

    for (let i = 0; i < count; i++) {
      let pool = slotAffixes.filter((a) => !usedStats.has(a.stat));
      if (pool.length === 0) break;

      // For blessed items with 2 affixes, prefer 1 prefix + 1 suffix for clean naming
      if (rarity === 'blessed' && count === 2 && i === 1 && result.length === 1) {
        const firstKind = result[0].kind;
        const oppositeKind = firstKind === 'prefix' ? 'suffix' : 'prefix';
        const oppositePool = pool.filter((a) => a.kind === oppositeKind);
        if (oppositePool.length > 0) {
          pool = oppositePool;
        }
      }

      const chosen = pickWeightedAffix(pool);
      if (!chosen) break;
      usedStats.add(chosen.stat);

      // Eligible tiers where minIlvl <= ilvl
      const eligibleIndices = [];
      for (let t = 0; t < chosen.tiers.length; t++) {
        if (chosen.tiers[t].minIlvl <= ilvl) {
          eligibleIndices.push(t);
        }
      }
      const tierIdx =
        eligibleIndices.length > 0
          ? eligibleIndices[randInt(0, eligibleIndices.length - 1)]
          : 0;
      const tierDef = chosen.tiers[tierIdx];

      const value = chosen.float
        ? Math.round(randFloat(tierDef.min, tierDef.max) * 10) / 10
        : randInt(tierDef.min, tierDef.max);

      result.push({
        id: chosen.id,
        kind: chosen.kind,
        stat: chosen.stat,
        value,
        tier: tierIdx + 1,
      });
    }

    return result;
  }

  function rollReforgeCandidates(item, affixIndex = 0, count = 3) {
    if (!item || !item.slot) return [];
    const slot = item.slot;
    const ilvl = Math.max(1, Math.floor(Number(item.ilvl || state.player?.level || 1)));
    const otherStats = new Set();
    if (Array.isArray(item.affixes)) {
      item.affixes.forEach((af, idx) => {
        if (idx !== affixIndex && af && af.stat) {
          otherStats.add(af.stat);
        }
      });
    }

    const basePool = AFFIXES.filter(
      (a) =>
        a.slots.includes(slot) &&
        a.tiers.some((t) => t.minIlvl <= ilvl) &&
        !otherStats.has(a.stat)
    );
    const fallbackPool = AFFIXES.filter(
      (a) => a.slots.includes(slot) && a.tiers.some((t) => t.minIlvl <= ilvl)
    );
    const poolSource = basePool.length > 0 ? basePool : fallbackPool;
    if (poolSource.length === 0) return [];

    const usedCandidateStats = new Set();
    const candidates = [];

    for (let i = 0; i < count; i++) {
      let pool = poolSource.filter((a) => !usedCandidateStats.has(a.stat));
      if (pool.length === 0) pool = poolSource;

      const chosen = pickWeightedAffix(pool);
      if (!chosen) break;
      usedCandidateStats.add(chosen.stat);

      const eligibleIndices = [];
      for (let t = 0; t < chosen.tiers.length; t++) {
        if (chosen.tiers[t].minIlvl <= ilvl) {
          eligibleIndices.push(t);
        }
      }
      const tierIdx =
        eligibleIndices.length > 0
          ? eligibleIndices[randInt(0, eligibleIndices.length - 1)]
          : 0;
      const tierDef = chosen.tiers[tierIdx];

      const value = chosen.float
        ? Math.round(randFloat(tierDef.min, tierDef.max) * 10) / 10
        : randInt(tierDef.min, tierDef.max);

      candidates.push({
        id: chosen.id,
        kind: chosen.kind,
        stat: chosen.stat,
        value,
        tier: tierIdx + 1,
      });
    }

    return candidates;
  }

  // ---------------------------------------------------------------- Name Formatting
  function tLang(key, lang) {
    if (!lang) return i18n.t(key);
    const table = ITEMS_STRINGS[lang] || ITEMS_STRINGS['zh-Hant'];
    return table[key] ?? i18n.t(key);
  }

  function formatItemName(item, lang) {
    if (!item) return '';
    const activeLang = lang || i18n.getLang?.() || 'zh-Hant';
    const isEn = activeLang === 'en';

    if (item.kind === 'turquoise') {
      const tmpl = tLang('item.turquoise', activeLang);
      return tmpl.replace('{n}', String(item.amount || 1));
    }

    const base = ITEM_BASES_BY_ID[item.baseId] || ITEM_BASES[0];
    const baseName = tLang(base.nameKey, activeLang);

    if (item.rarity === 'terma' && item.legendaryId) {
      const leg = LEGENDARIES_BY_ID[item.legendaryId];
      if (leg) return tLang(leg.nameKey, activeLang);
    }

    if (item.rarity === 'rare' && item.rareName) {
      const wordA = tLang(`rareName.a.${item.rareName.a ?? 0}`, activeLang);
      const wordB = tLang(`rareName.b.${item.rareName.b ?? 0}`, activeLang);
      return isEn ? `${wordA} ${wordB} ${baseName}` : `${wordA}・${wordB} ${baseName}`;
    }

    if (item.rarity === 'blessed' && Array.isArray(item.affixes) && item.affixes.length > 0) {
      const prefixObj = item.affixes.find((a) => {
        const def = AFFIXES_BY_ID[a.id];
        return (a.kind || def?.kind) === 'prefix';
      });
      const suffixObj = item.affixes.find((a) => {
        const def = AFFIXES_BY_ID[a.id];
        return (a.kind || def?.kind) === 'suffix';
      });

      const prefixStr = prefixObj ? tLang(`affix.${prefixObj.id}`, activeLang) : '';
      const suffixStr = suffixObj ? tLang(`affix.${suffixObj.id}`, activeLang) : '';

      if (isEn) {
        if (prefixStr && suffixStr) return `${prefixStr} ${baseName} of ${suffixStr}`;
        if (prefixStr) return `${prefixStr} ${baseName}`;
        if (suffixStr) return `${baseName} of ${suffixStr}`;
        return baseName;
      } else {
        if (prefixStr && suffixStr) return `${prefixStr}${baseName}・${suffixStr}`;
        if (prefixStr) return `${prefixStr}${baseName}`;
        if (suffixStr) return `${baseName}・${suffixStr}`;
        return baseName;
      }
    }

    return baseName;
  }

  // ---------------------------------------------------------------- Item Generation
  function generate(opts = {}) {
    const ilvl = Math.max(
      1,
      Math.floor(Number(opts.ilvl ?? state.player?.level ?? 1) || 1)
    );

    let rarity = opts.rarity === 'common' ? 'normal' : (opts.rarity || null);
    let legendaryDef = null;
    const reqLegId = opts.legendaryId || opts.id || opts.powerId;

    if (reqLegId && LEGENDARIES_BY_ID[reqLegId]) {
      legendaryDef = LEGENDARIES_BY_ID[reqLegId];
      rarity = 'terma';
    } else {
      if (!rarity) {
        rarity = rollRarity({
          rank: opts.rank,
          findBonus: opts.findBonus,
          tier: opts.tier,
        });
      }
      if (rarity === 'terma') {
        const inDungeon = Boolean(
          opts.inDungeon ||
            (opts.tier != null && Number(opts.tier) > 0) ||
            state.zone === 'terma'
        );
        const allowLeg = (l) => (!l.dungeonOnly || inDungeon);
        let legPool = LEGENDARIES.filter((l) => {
          if (!allowLeg(l)) return false;
          if (opts.slot && l.slot !== opts.slot) return false;
          if (opts.baseId && l.baseId !== opts.baseId) return false;
          return l.minIlvl <= ilvl;
        });
        if (legPool.length === 0) {
          legPool = LEGENDARIES.filter(
            (l) => allowLeg(l) && (!opts.slot || l.slot === opts.slot)
          );
        }
        if (legPool.length === 0) {
          legPool = LEGENDARIES.filter(allowLeg);
        }
        if (legPool.length === 0) legPool = LEGENDARIES;
        legendaryDef = legPool[randInt(0, legPool.length - 1)];
      }
    }

    let base = null;
    if (legendaryDef) {
      base = ITEM_BASES_BY_ID[legendaryDef.baseId];
    } else if (opts.baseId && ITEM_BASES_BY_ID[opts.baseId]) {
      base = ITEM_BASES_BY_ID[opts.baseId];
    } else {
      const targetSlot =
        opts.slot && EQUIPMENT_SLOTS.includes(opts.slot)
          ? opts.slot
          : EQUIPMENT_SLOTS[randInt(0, EQUIPMENT_SLOTS.length - 1)];
      const basePool = getBasesForSlot(targetSlot, ilvl);
      base = basePool[randInt(0, basePool.length - 1)];
    }

    const slot = base.slot;
    const scale = 1 + 0.04 * Math.max(0, ilvl - (base.minIlvl || 1));
    const rawImp = base.implicit.float
      ? randFloat(base.implicit.min, base.implicit.max)
      : randInt(base.implicit.min, base.implicit.max);
    const impVal = base.implicit.float
      ? Math.round(rawImp * scale * 10) / 10
      : Math.max(1, Math.round(rawImp * scale));

    const implicit = {
      stat: base.implicit.stat,
      value: impVal,
    };
    if (base.extraImplicit) {
      implicit.extraStat = base.extraImplicit.stat;
      const rawExtra = randInt(base.extraImplicit.min, base.extraImplicit.max);
      implicit.extraValue = base.extraImplicit.noScale
        ? rawExtra
        : Math.max(1, Math.round(rawExtra * scale));
    }

    let affixCount = 0;
    if (rarity === 'blessed') affixCount = randInt(1, 2);
    else if (rarity === 'rare') affixCount = randInt(3, 4);
    else if (rarity === 'terma') affixCount = 3;

    const affixes = rollAffixesForItem(slot, ilvl, affixCount, rarity);

    const rareName =
      rarity === 'rare'
        ? {
            a: randInt(0, RARE_NAME_COUNT - 1),
            b: randInt(0, RARE_NAME_COUNT - 1),
          }
        : null;

    const sellMult = RARITY_SELL_MULT[rarity] ?? 0.5;
    const sellValue = Math.max(1, Math.round((4 + ilvl) * sellMult));

    const item = {
      uid: nextUid('i_'),
      baseId: base.id,
      slot,
      rarity,
      ilvl,
      implicit,
      affixes,
      legendaryId: legendaryDef ? legendaryDef.id : null,
      powerId: legendaryDef ? legendaryDef.powerId : null,
      rareName,
      sellValue,
    };

    Object.defineProperty(item, 'name', {
      enumerable: true,
      get() {
        return formatItemName(item);
      },
    });

    return item;
  }

  // ---------------------------------------------------------------- Simulation
  function simulate(nOrOpts = 20000, maybeOpts = {}) {
    let n = 20000;
    let opts = maybeOpts || {};
    if (nOrOpts && typeof nOrOpts === 'object') {
      opts = nOrOpts;
      n = opts.n ?? opts.total ?? 20000;
    } else {
      n = nOrOpts;
    }
    const { rank = 'normal', ilvl = 10, findBonus = 0, tier } = opts;
    const effTier =
      tier != null
        ? Number(tier) || 0
        : state.zone === 'terma'
          ? Number(state.dungeon?.tier) || 0
          : 0;
    const total = Math.max(1, Math.floor(Number(n) || 20000));
    const counts = { normal: 0, blessed: 0, rare: 0, terma: 0 };
    for (let i = 0; i < total; i++) {
      const r = rollRarity({ rank, findBonus, tier: effTier });
      counts[r] = (counts[r] || 0) + 1;
    }
    const ratios = {
      normal: +((counts.normal / total) * 100).toFixed(2),
      blessed: +((counts.blessed / total) * 100).toFixed(2),
      rare: +((counts.rare / total) * 100).toFixed(2),
      terma: +((counts.terma / total) * 100).toFixed(2),
    };
    return {
      total,
      ilvl,
      rank,
      findBonus,
      tier: effTier,
      counts,
      ratios,
    };
  }

  // ---------------------------------------------------------------- Drop Helpers
  function scatterPosition(origin, index = 0) {
    const base = origin || state.player.position;
    if (index === 0) {
      return new THREE.Vector3(base.x, base.y || 0, base.z);
    }
    const angle = index * 2.15 + Math.random() * 0.6;
    const radius = 0.65 + Math.min(1.4, index * 0.25);
    return new THREE.Vector3(
      base.x + Math.cos(angle) * radius,
      base.y || 0,
      base.z + Math.sin(angle) * radius
    );
  }

  let dropScatterIdx = 0;

  function drop(rarityOrOpts, maybeOpts = {}) {
    let opts = {};
    if (typeof rarityOrOpts === 'string') {
      opts = { ...maybeOpts, rarity: rarityOrOpts };
    } else if (rarityOrOpts && typeof rarityOrOpts === 'object') {
      opts = { ...rarityOrOpts };
    }

    const item = generate(opts);
    const p = state.player;
    const heading = p.heading || 0;
    // Fan out consecutive drops in front of player so beams & labels don't overlap
    const slotIdx = dropScatterIdx % 8;
    const ringIdx = Math.floor(dropScatterIdx / 8) % 5;
    dropScatterIdx += 1;
    const spreadAngle = ((slotIdx - 3.5) / 3.5) * 0.85;
    const dist = 1.8 + ringIdx * 0.55;
    const targetX = p.position.x - Math.sin(heading + spreadAngle) * dist;
    const targetZ = p.position.z - Math.cos(heading + spreadAngle) * dist;
    const groundY = ctx.world ? ctx.world.getHeight(targetX, targetZ) : p.position.y;
    const position = new THREE.Vector3(targetX, groundY, targetZ);

    bus.emit('loot:drop', {
      item,
      position,
      startPos: new THREE.Vector3(p.position.x, p.position.y + 0.5, p.position.z),
    });
    return item;
  }

  // ---------------------------------------------------------------- Monster Drop Listener
  bus.on('enemy:liberated', (payload) => {
    const inCombat =
      state.zoneType === 'combat' ||
      state.zoneType === 'dungeon' ||
      (state.zone && state.zone !== 'stupa');
    if (!inCombat) return;

    const level = Math.max(1, Number(payload?.level) || 1);
    const rank = payload?.rank || 'normal';
    const origin = payload?.position
      ? new THREE.Vector3(
          payload.position.x,
          payload.position.y || 0,
          payload.position.z
        )
      : state.player.position.clone();

    // 1. Determine equipment drop count by rank
    let dropCount = 0;
    if (rank === 'normal') {
      if (Math.random() < 0.18) dropCount = 1;
    } else if (rank === 'champion') {
      if (Math.random() < 0.6) dropCount = 1;
    } else if (rank === 'rare') {
      dropCount = 2;
    } else if (rank === 'boss') {
      dropCount = randInt(3, 5);
    }

    let hasRareOrBetter = false;
    for (let i = 0; i < dropCount; i++) {
      let forcedRarity = null;
      if (rank === 'boss' && i === dropCount - 1 && !hasRareOrBetter) {
        forcedRarity = 'rare';
      }
      const item = generate({ ilvl: level, rarity: forcedRarity, rank });
      if (item.rarity === 'rare' || item.rarity === 'terma') {
        hasRareOrBetter = true;
      }
      const pos = scatterPosition(origin, i + 1);
      bus.emit('loot:drop', {
        item,
        position: pos,
        startPos: origin.clone().add(new THREE.Vector3(0, 0.5, 0)),
      });
    }

    // 2. Turquoise drop: 35% chance, amount = randInt(1,3) * (1 + floor(L/5))
    if (Math.random() < 0.35) {
      const shrineMult = Number(state.player?.shrineFindMult) || 1;
      const amount = Math.max(
        1,
        Math.round(randInt(1, 3) * (1 + Math.floor(level / 5)) * shrineMult)
      );
      const turqItem = {
        uid: nextUid('tq_'),
        kind: 'turquoise',
        rarity: 'turquoise',
        amount,
      };
      Object.defineProperty(turqItem, 'name', {
        enumerable: true,
        get() {
          return formatItemName(turqItem);
        },
      });
      const pos = scatterPosition(origin, dropCount + 1);
      bus.emit('loot:drop', {
        item: turqItem,
        position: pos,
        startPos: origin.clone().add(new THREE.Vector3(0, 0.5, 0)),
      });
    }
  });

  // ---------------------------------------------------------------- Stub Bag & Currency Helpers
  function storeItem(item) {
    if (ctx.inventory?.add) {
      return ctx.inventory.add(item);
    }
    tempBag.push(item);
    return true;
  }

  function addTurquoise(amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 0) return;
    if (ctx.inventory?.addTurquoise) {
      ctx.inventory.addTurquoise(n);
      return;
    }
    tempTurquoise += n;
    state.inventory = state.inventory || { turquoise: 0 };
    state.inventory.turquoise = tempTurquoise;
    bus.emit('currency:changed', { turquoise: tempTurquoise, delta: n });
  }

  function getBag() {
    if (ctx.inventory?.getBag) {
      return ctx.inventory.getBag();
    }
    return [...tempBag];
  }

  bus.on('merit:reset', () => {
    tempBag.length = 0;
    tempTurquoise = 0;
    manualPowers.clear();
  });

  const api = {
    update() {},
    generate,
    rollRarity,
    rollReforgeCandidates,
    simulate,
    drop,
    formatItemName,
    storeItem,
    addTurquoise,
    bag: getBag,
    getTurquoise: () =>
      ctx.inventory?.getTurquoise?.() ??
      state.inventory?.turquoise ??
      tempTurquoise,
  };

  ctx.loot = api;

  ctx.debug?.register('loot', {
    drop: (rarity, opts) => api.drop(rarity, opts),
    simulate: (n, opts) => api.simulate(n, opts),
    generate: (opts) => api.generate(opts),
    bag: () => api.bag(),
    formatName: (item, lang) => api.formatItemName(item, lang),
  });

  return api;
}
