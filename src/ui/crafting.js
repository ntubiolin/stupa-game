/**
 * Lotus Artisan Crafting UI (`src/ui/crafting.js`) — Issue #31
 * Features:
 *   - Material display bar (`turquoiseShard` 碎綠松石, `goldDust` 金粉, `termaEssence` 伏藏精華, plus Turquoise 綠松石).
 *   - Salvage (`分解`):
 *       normal / common -> turquoiseShard x1
 *       blessed         -> turquoiseShard x2 + goldDust x1
 *       rare            -> goldDust x3
 *       terma           -> termaEssence x1
 *     Includes single-item salvage and batch salvage for common items (`批次分解普通物品`).
 *   - Reforge / Enchant (`重鑄`, Diablo 4 style):
 *       Select a `blessed`, `rare`, or `terma` item (from bag or equipped) and choose one of its affixes (`affixIndex`).
 *       Affix Lock Rule: After first reforge, `item.lockedAffixIndex` (and `item.reforgeSlot`) is locked to that affix index.
 *       Cost: `10 * ((item.reforgeCount || 0) + 1)` Turquoise + 1 `turquoiseShard` + 1 `goldDust`.
 *       3-Choice Roll: Rolls 3 candidate affixes for the item's slot at `item.ilvl`, allowing the player to pick 1 of 3 or keep original (`保留原詞綴`).
 *       Recalculates derived stats if the reforged item is currently equipped.
 *   - Debug API: `__stupa.crafting.{open,close,salvage,salvageAllCommon,reforge,chooseReforge}`.
 */
import '../i18n/prologue.js';
import { EQUIPMENT_SLOTS } from '../data/itemBases.js';
import {
  RARITY_COLOR,
  getSlotIconDataUrl,
  formatStatLineForCtx,
  renderItemComparisonCardHtml,
} from './inventory.js';

export const SALVAGE_YIELD_BY_RARITY = {
  normal: { turquoiseShard: 1 },
  common: { turquoiseShard: 1 },
  blessed: { turquoiseShard: 2, goldDust: 1 },
  rare: { goldDust: 3 },
  terma: { termaEssence: 1 },
};

export function getSalvageYield(rarity) {
  const norm = rarity === 'common' ? 'normal' : rarity || 'normal';
  return { ...(SALVAGE_YIELD_BY_RARITY[norm] || SALVAGE_YIELD_BY_RARITY.normal) };
}

export function getReforgeCost(item) {
  const count = Math.max(0, Math.floor(Number(item?.reforgeCount) || 0));
  return {
    turquoise: 10 * (count + 1),
    turquoiseShard: 1,
    goldDust: 1,
  };
}

export function createCrafting(ctx) {
  if (ctx.crafting) return ctx.crafting;
  const { state, bus, i18n } = ctx;

  let isOpen = false;
  let activeTab = 'salvage'; // 'salvage' | 'reforge'
  let inspectedSalvageUid = null;
  let selectedReforgeUid = null;
  let selectedAffixIndex = 0;
  let pendingReforge = null; // { itemUid, affixIndex, originalAffix, choices }

  // ---------------------------------------------------------------- DOM Construction
  const overlay = document.createElement('div');
  overlay.id = 'crafting-modal';
  overlay.className = 'crafting-modal is-hidden';
  overlay.innerHTML = `
    <div class="crafting-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="crafting-modal-title">
      <header class="crafting-header">
        <div class="crafting-header__left">
          <span class="crafting-header__badge" aria-hidden="true">🪷</span>
          <div>
            <h2 id="crafting-modal-title" class="crafting-title" data-i18n="crafting.title">蓮花工匠・白瑪</h2>
            <p class="crafting-subtitle" data-i18n="crafting.subtitle">分解多餘法器化為靈材 · 重鑄加持詞綴淬鍊聖物</p>
          </div>
          <div class="inv-tabs crafting-tabs" role="tablist">
            <button id="crafting-tab-salvage" type="button" class="inv-tab is-active" data-tab="salvage" data-i18n="crafting.tab.salvage">分解法器</button>
            <button id="crafting-tab-reforge" type="button" class="inv-tab" data-tab="reforge" data-i18n="crafting.tab.reforge">重鑄詞綴</button>
          </div>
        </div>
        <div class="crafting-header__right">
          <div class="inv-mat-pill" title="碎綠松石 / Turquoise Shard">
            <span class="inv-mat-pill__icon" aria-hidden="true">🔹</span>
            <span data-i18n="crafting.mat.turquoiseShard">碎綠松石</span>
            <span id="crafting-mat-shard" class="inv-mat-pill__val">0</span>
          </div>
          <div class="inv-mat-pill" title="金粉 / Gold Dust">
            <span class="inv-mat-pill__icon" aria-hidden="true">✨</span>
            <span data-i18n="crafting.mat.goldDust">金粉</span>
            <span id="crafting-mat-gold" class="inv-mat-pill__val">0</span>
          </div>
          <div class="inv-mat-pill" title="伏藏精華 / Terma Essence">
            <span class="inv-mat-pill__icon" aria-hidden="true">🔥</span>
            <span data-i18n="crafting.mat.termaEssence">伏藏精華</span>
            <span id="crafting-mat-terma" class="inv-mat-pill__val">0</span>
          </div>
          <div class="inv-currency-pill" title="Turquoise">
            <span class="inv-currency-pill__icon" aria-hidden="true">💎</span>
            <span id="crafting-turquoise-val" class="inv-currency-pill__val">0</span>
          </div>
          <button id="crafting-btn-close" type="button" class="inv-close-btn" aria-label="Close">✕</button>
        </div>
      </header>

      <div class="crafting-body">
        <!-- Tab 1: Salvage (分解) -->
        <div id="crafting-pane-salvage" class="crafting-pane is-active">
          <section class="crafting-col crafting-col--list">
            <div class="shop-col__head shop-col__head--split">
              <h3 class="inv-sec-title" data-i18n="crafting.salvage.bagTitle">選擇要分解的背袋法器</h3>
              <button id="crafting-btn-salvage-common" type="button" class="shop-batch-btn" data-i18n="crafting.salvage.allCommonBtn">批次分解普通物品</button>
            </div>
            <div id="crafting-salvage-list" class="shop-list"></div>
          </section>

          <section class="crafting-col crafting-col--detail">
            <div class="crafting-rules-card">
              <h3 class="inv-sec-title" data-i18n="crafting.salvage.rulesTitle">分解靈材產出規則</h3>
              <ul class="crafting-rules-list">
                <li data-i18n="crafting.salvage.rule.normal">普通 (白)：碎綠松石 ×1</li>
                <li data-i18n="crafting.salvage.rule.blessed">加持 (藍)：碎綠松石 ×2 + 金粉 ×1</li>
                <li data-i18n="crafting.salvage.rule.rare">稀有 (金)：金粉 ×3</li>
                <li data-i18n="crafting.salvage.rule.terma">伏藏 (橙)：伏藏精華 ×1</li>
              </ul>
            </div>
            <div id="crafting-salvage-inspector" class="shop-inspector"></div>
          </section>
        </div>

        <!-- Tab 2: Reforge (重鑄) -->
        <div id="crafting-pane-reforge" class="crafting-pane">
          <section class="crafting-col crafting-col--list">
            <div class="shop-col__head">
              <h3 class="inv-sec-title" data-i18n="crafting.reforge.listTitle">選擇要重鑄的聖物（加持／稀有／伏藏）</h3>
            </div>
            <div id="crafting-reforge-list" class="shop-list"></div>
          </section>

          <section class="crafting-col crafting-col--workbench">
            <div id="crafting-reforge-workbench" class="crafting-workbench"></div>
          </section>
        </div>
      </div>

      <footer class="shop-footer">
        <span class="shop-footer__amrita" data-i18n="crafting.reforge.lockRuleHint">重鑄規則：首次重鑄後將「鎖定該詞綴槽」，後續僅能針對同一槽位再次重鑄。</span>
        <span class="shop-footer__hint" data-i18n="crafting.closeHint">按 Esc 關閉工坊</span>
      </footer>
    </div>
  `;

  (document.getElementById('ui') || document.body).appendChild(overlay);

  const tabSalvageBtn = overlay.querySelector('#crafting-tab-salvage');
  const tabReforgeBtn = overlay.querySelector('#crafting-tab-reforge');
  const closeBtn = overlay.querySelector('#crafting-btn-close');
  const matShardEl = overlay.querySelector('#crafting-mat-shard');
  const matGoldEl = overlay.querySelector('#crafting-mat-gold');
  const matTermaEl = overlay.querySelector('#crafting-mat-terma');
  const turquoiseValEl = overlay.querySelector('#crafting-turquoise-val');
  const paneSalvage = overlay.querySelector('#crafting-pane-salvage');
  const paneReforge = overlay.querySelector('#crafting-pane-reforge');
  const salvageListEl = overlay.querySelector('#crafting-salvage-list');
  const salvageInspectorEl = overlay.querySelector('#crafting-salvage-inspector');
  const salvageCommonBtn = overlay.querySelector('#crafting-btn-salvage-common');
  const reforgeListEl = overlay.querySelector('#crafting-reforge-list');
  const reforgeWorkbenchEl = overlay.querySelector('#crafting-reforge-workbench');

  // ---------------------------------------------------------------- Helpers
  function formatYieldText(yieldMap) {
    const parts = [];
    if (yieldMap.turquoiseShard) {
      parts.push(`${i18n.t('crafting.mat.turquoiseShard')} ×${yieldMap.turquoiseShard}`);
    }
    if (yieldMap.goldDust) {
      parts.push(`${i18n.t('crafting.mat.goldDust')} ×${yieldMap.goldDust}`);
    }
    if (yieldMap.termaEssence) {
      parts.push(`${i18n.t('crafting.mat.termaEssence')} ×${yieldMap.termaEssence}`);
    }
    return parts.join(' + ');
  }

  function getLockedIndex(item) {
    if (!item) return null;
    if (typeof item.lockedAffixIndex === 'number') return item.lockedAffixIndex;
    if (typeof item.reforgeSlot === 'number') return item.reforgeSlot;
    return null;
  }

  function isReforgeableItem(item) {
    if (!item) return false;
    const r = item.rarity === 'common' ? 'normal' : item.rarity;
    return (
      (r === 'blessed' || r === 'rare' || r === 'terma') &&
      Array.isArray(item.affixes) &&
      item.affixes.length > 0
    );
  }

  function getEligibleReforgeItems() {
    if (!ctx.inventory) return [];
    const results = [];
    const equipped = ctx.inventory.getEquipped?.() || {};
    for (const slot of EQUIPMENT_SLOTS) {
      const it = equipped[slot];
      if (isReforgeableItem(it)) {
        results.push({ item: it, isEquipped: true });
      }
    }
    const bag = ctx.inventory.getBag?.() || [];
    for (const it of bag) {
      if (isReforgeableItem(it)) {
        results.push({ item: it, isEquipped: false });
      }
    }
    return results;
  }

  // ---------------------------------------------------------------- Core Operations
  function salvage(itemId) {
    if (!ctx.inventory || itemId == null) return false;
    const bagItems = ctx.inventory.getBag();
    let target = null;
    if (typeof itemId === 'number') {
      target = bagItems[itemId] || null;
    } else {
      target = bagItems.find((it) => it && it.uid === itemId) || null;
    }
    if (!target) return false;

    const yieldMap = getSalvageYield(target.rarity);
    const removed = ctx.inventory.remove(target.uid);
    if (!removed) return false;

    for (const [matId, count] of Object.entries(yieldMap)) {
      if (count > 0) {
        ctx.inventory.addMaterial(matId, count);
      }
    }

    if (inspectedSalvageUid === removed.uid) {
      inspectedSalvageUid = ctx.inventory.getBag()[0]?.uid || null;
    }
    if (selectedReforgeUid === removed.uid) {
      selectedReforgeUid = null;
      pendingReforge = null;
    }

    bus.emit('sfx', { name: 'pickupGear' });
    bus.emit('toast', {
      text: i18n.t('crafting.toast.salvaged', {
        name: removed.name,
        yield: formatYieldText(yieldMap),
      }),
      kind: 'Reward',
    });

    if (isOpen) renderAll();
    return yieldMap;
  }

  function salvageAllCommon() {
    if (!ctx.inventory) return { count: 0, turquoiseShard: 0 };
    const bagItems = ctx.inventory.getBag();
    const commons = bagItems.filter(
      (it) => it && (it.rarity === 'normal' || it.rarity === 'common')
    );

    if (commons.length === 0) {
      bus.emit('toast', {
        text: i18n.t('crafting.toast.noCommonToSalvage'),
        kind: 'info',
      });
      return { count: 0, turquoiseShard: 0 };
    }

    let count = 0;
    let shards = 0;
    for (const item of commons) {
      if (ctx.inventory.remove(item.uid)) {
        count += 1;
        shards += 1;
      }
    }

    if (shards > 0) {
      ctx.inventory.addMaterial('turquoiseShard', shards);
    }

    bus.emit('sfx', { name: 'pickupGear' });
    bus.emit('toast', {
      text: i18n.t('crafting.toast.salvagedAllCommon', { count, shards }),
      kind: 'Reward',
    });

    if (isOpen) renderAll();
    return { count, turquoiseShard: shards };
  }

  function reforge(itemId, affixIndex) {
    if (!ctx.inventory) return false;
    const targetId = itemId || selectedReforgeUid;
    if (!targetId) return false;

    const item = ctx.inventory.get(targetId);
    if (!item) return false;

    if (!isReforgeableItem(item)) {
      bus.emit('toast', {
        text: i18n.t('crafting.toast.cannotReforgeNormal'),
        kind: 'warning',
      });
      return false;
    }

    const lockedIdx = getLockedIndex(item);
    const targetAffixIdx =
      affixIndex != null
        ? Number(affixIndex)
        : lockedIdx != null
          ? lockedIdx
          : selectedAffixIndex;

    if (
      Number.isNaN(targetAffixIdx) ||
      targetAffixIdx < 0 ||
      targetAffixIdx >= item.affixes.length
    ) {
      return false;
    }

    // Affix Lock Rule: once locked, only the locked affix index may be reforged
    if (lockedIdx != null && targetAffixIdx !== lockedIdx) {
      bus.emit('toast', {
        text: i18n.t('crafting.toast.affixLocked', { slot: lockedIdx + 1 }),
        kind: 'warning',
      });
      return false;
    }

    const cost = getReforgeCost(item);
    const hasTurquoise = (ctx.inventory.getTurquoise?.() ?? 0) >= cost.turquoise;
    const hasShard =
      (ctx.inventory.getMaterial?.('turquoiseShard') ?? 0) >= cost.turquoiseShard;
    const hasGold =
      (ctx.inventory.getMaterial?.('goldDust') ?? 0) >= cost.goldDust;

    if (!hasTurquoise || !hasShard || !hasGold) {
      bus.emit('toast', {
        text: i18n.t('crafting.toast.insufficientCost'),
        kind: 'warning',
      });
      return false;
    }

    // Deduct Turquoise and crafting materials
    if (!ctx.inventory.spendTurquoise(cost.turquoise)) return false;
    if (
      !ctx.inventory.spendMaterials({
        turquoiseShard: cost.turquoiseShard,
        goldDust: cost.goldDust,
      })
    ) {
      ctx.inventory.addTurquoise(cost.turquoise);
      return false;
    }

    const originalAffix = { ...item.affixes[targetAffixIdx] };

    // Lock affix slot and increment reforge count
    item.lockedAffixIndex = targetAffixIdx;
    item.reforgeSlot = targetAffixIdx;
    item.reforgeCount = Math.max(0, Math.floor(Number(item.reforgeCount) || 0)) + 1;

    const candidates = ctx.loot?.rollReforgeCandidates
      ? ctx.loot.rollReforgeCandidates(item, targetAffixIdx, 3)
      : [];

    selectedReforgeUid = item.uid;
    selectedAffixIndex = targetAffixIdx;
    pendingReforge = {
      itemUid: item.uid,
      affixIndex: targetAffixIdx,
      originalAffix,
      choices: candidates,
    };

    ctx.inventory.notifyItemUpdated?.(item);
    bus.emit('sfx', { name: 'pickupGear' });
    bus.emit('toast', {
      text: i18n.t('crafting.toast.reforgeRolled'),
      kind: 'info',
    });

    if (isOpen) renderAll();

    // Return an array of 3 choices enhanced with metadata properties for maximum compatibility
    const result = [...candidates];
    result.choices = candidates;
    result.originalAffix = originalAffix;
    result.affixIndex = targetAffixIdx;
    result.item = item;
    return result;
  }

  function chooseReforge(choiceIndex) {
    if (!pendingReforge || !ctx.inventory) return false;
    const item = ctx.inventory.get(pendingReforge.itemUid);
    if (!item || !Array.isArray(item.affixes)) {
      pendingReforge = null;
      return false;
    }

    const { affixIndex, originalAffix, choices } = pendingReforge;
    let chosenAffix = null;
    let keptOriginal = false;

    if (
      choiceIndex === 'keep' ||
      choiceIndex === 'original' ||
      choiceIndex === -1 ||
      choiceIndex === 3 ||
      choiceIndex == null
    ) {
      chosenAffix = { ...originalAffix };
      keptOriginal = true;
    } else {
      const idx = Number(choiceIndex);
      if (!Number.isNaN(idx) && idx >= 0 && idx < choices.length) {
        chosenAffix = { ...choices[idx] };
      } else {
        return false;
      }
    }

    item.affixes[affixIndex] = chosenAffix;
    pendingReforge = null;

    // Persist item and recalculate derived stats if currently equipped
    ctx.inventory.notifyItemUpdated?.(item);
    ctx.vitals?.recalcDerived?.();

    const statText = formatStatLineForCtx(i18n, chosenAffix.stat, chosenAffix.value);
    bus.emit('sfx', { name: 'pickupGear' });
    bus.emit('toast', {
      text: i18n.t(
        keptOriginal ? 'crafting.toast.reforgeKept' : 'crafting.toast.reforgeApplied',
        { stat: statText }
      ),
      kind: keptOriginal ? 'info' : 'Reward',
    });

    if (isOpen) renderAll();
    return item;
  }

  // ---------------------------------------------------------------- Rendering
  function applyStaticTranslations() {
    const nodes = overlay.querySelectorAll('[data-i18n]');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = i18n.t(key);
    }
  }

  function renderMaterialsHeader() {
    const tq = ctx.inventory?.getTurquoise?.() ?? 0;
    const mats = ctx.inventory?.getMaterials?.() || {};
    turquoiseValEl.textContent = String(tq);
    matShardEl.textContent = String(mats.turquoiseShard || 0);
    matGoldEl.textContent = String(mats.goldDust || 0);
    matTermaEl.textContent = String(mats.termaEssence || 0);
  }

  function renderSalvagePane() {
    salvageListEl.innerHTML = '';
    const bagItems = ctx.inventory?.getBag?.() || [];

    const hasCommons = bagItems.some(
      (it) => it && (it.rarity === 'normal' || it.rarity === 'common')
    );
    salvageCommonBtn.disabled = !hasCommons;

    if (bagItems.length === 0) {
      salvageListEl.innerHTML = `<div class="shop-empty">${i18n.t('crafting.salvage.empty')}</div>`;
      salvageInspectorEl.innerHTML = `
        <div class="inv-tooltip__empty">
          <p>${i18n.t('crafting.salvage.empty')}</p>
        </div>
      `;
      return;
    }

    if (!inspectedSalvageUid || !bagItems.some((i) => i.uid === inspectedSalvageUid)) {
      inspectedSalvageUid = bagItems[0].uid;
    }

    bagItems.forEach((item) => {
      const normRarity = item.rarity === 'common' ? 'normal' : item.rarity;
      const color = RARITY_COLOR[normRarity] || RARITY_COLOR.normal;
      const iconUrl = getSlotIconDataUrl(item.slot, normRarity);
      const yieldMap = getSalvageYield(normRarity);
      const yieldStr = formatYieldText(yieldMap);
      const isSelected = inspectedSalvageUid === item.uid;

      const row = document.createElement('div');
      row.className = `shop-item-row rarity-${normRarity}${isSelected ? ' is-selected' : ''}`;
      row.dataset.uid = item.uid;
      row.innerHTML = `
        <div class="shop-item-row__left">
          <img class="shop-item-row__icon" src="${iconUrl}" alt="${item.name}" />
          <div class="shop-item-row__info">
            <div class="shop-item-row__name" style="color:${color}">${item.name}</div>
            <div class="shop-item-row__meta">
              <span>${i18n.t('crafting.salvage.yieldLabel')} ${yieldStr}</span>
            </div>
          </div>
        </div>
        <div class="shop-item-row__right">
          <button type="button" class="shop-action-btn shop-action-btn--salvage">
            ${i18n.t('crafting.salvage.btn')}
          </button>
        </div>
      `;

      row.addEventListener('mouseenter', () => {
        inspectedSalvageUid = item.uid;
        renderSalvageInspector();
      });
      row.addEventListener('click', () => {
        inspectedSalvageUid = item.uid;
        renderSalvagePane();
      });

      const btn = row.querySelector('.shop-action-btn--salvage');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        salvage(item.uid);
      });

      salvageListEl.appendChild(row);
    });

    renderSalvageInspector();
  }

  function renderSalvageInspector() {
    const item = inspectedSalvageUid ? ctx.inventory?.get?.(inspectedSalvageUid) : null;
    if (!item) {
      salvageInspectorEl.innerHTML = '';
      return;
    }
    const yieldStr = formatYieldText(getSalvageYield(item.rarity));
    salvageInspectorEl.innerHTML = renderItemComparisonCardHtml(ctx, item, {
      isEquipped: false,
      compareWithEquipped: true,
      priceHtml: `<span>🪷 ${i18n.t('crafting.salvage.yieldLabel')} ${yieldStr}</span>`,
    });
  }

  function renderReforgePane() {
    reforgeListEl.innerHTML = '';
    const eligible = getEligibleReforgeItems();

    if (eligible.length === 0) {
      reforgeListEl.innerHTML = `<div class="shop-empty">${i18n.t('crafting.reforge.emptyEligible')}</div>`;
      reforgeWorkbenchEl.innerHTML = `
        <div class="inv-tooltip__empty">
          <p>${i18n.t('crafting.reforge.emptyEligible')}</p>
        </div>
      `;
      return;
    }

    if (
      !selectedReforgeUid ||
      !eligible.some((entry) => entry.item.uid === selectedReforgeUid)
    ) {
      selectedReforgeUid = eligible[0].item.uid;
      const locked = getLockedIndex(eligible[0].item);
      selectedAffixIndex = locked != null ? locked : 0;
    }

    eligible.forEach(({ item, isEquipped }) => {
      const normRarity = item.rarity === 'common' ? 'normal' : item.rarity;
      const color = RARITY_COLOR[normRarity] || RARITY_COLOR.normal;
      const iconUrl = getSlotIconDataUrl(item.slot, normRarity);
      const isSelected = selectedReforgeUid === item.uid;
      const lockedIdx = getLockedIndex(item);
      const tagText = isEquipped
        ? i18n.t('crafting.reforge.equippedTag')
        : i18n.t('crafting.reforge.bagTag');

      const row = document.createElement('div');
      row.className = `shop-item-row rarity-${normRarity}${isSelected ? ' is-selected' : ''}`;
      row.dataset.uid = item.uid;
      row.innerHTML = `
        <div class="shop-item-row__left">
          <img class="shop-item-row__icon" src="${iconUrl}" alt="${item.name}" />
          <div class="shop-item-row__info">
            <div class="shop-item-row__name" style="color:${color}">${item.name}</div>
            <div class="shop-item-row__meta">
              <span class="crafting-source-tag ${isEquipped ? 'is-equipped' : ''}">${tagText}</span>
              <span>${i18n.t(`rarity.${normRarity}`)} · Lv${item.ilvl}</span>
              ${lockedIdx != null ? `<span class="crafting-lock-pill">🔒 #${lockedIdx + 1}</span>` : ''}
            </div>
          </div>
        </div>
      `;

      row.addEventListener('click', () => {
        if (pendingReforge && pendingReforge.itemUid !== item.uid) {
          // Keep original if switching items while a roll was open
          chooseReforge('keep');
        }
        selectedReforgeUid = item.uid;
        const locked = getLockedIndex(item);
        selectedAffixIndex = locked != null ? locked : 0;
        renderReforgePane();
      });

      reforgeListEl.appendChild(row);
    });

    renderReforgeWorkbench();
  }

  function renderReforgeWorkbench() {
    const item = selectedReforgeUid ? ctx.inventory?.get?.(selectedReforgeUid) : null;
    if (!item || !isReforgeableItem(item)) {
      reforgeWorkbenchEl.innerHTML = `
        <div class="inv-tooltip__empty">
          <p>${i18n.t('crafting.reforge.selectPrompt')}</p>
        </div>
      `;
      return;
    }

    const normRarity = item.rarity === 'common' ? 'normal' : item.rarity;
    const color = RARITY_COLOR[normRarity] || RARITY_COLOR.normal;
    const lockedIdx = getLockedIndex(item);
    if (lockedIdx != null) {
      selectedAffixIndex = lockedIdx;
    } else if (selectedAffixIndex >= item.affixes.length) {
      selectedAffixIndex = 0;
    }

    const cost = getReforgeCost(item);
    const curTq = ctx.inventory?.getTurquoise?.() ?? 0;
    const curShard = ctx.inventory?.getMaterial?.('turquoiseShard') ?? 0;
    const curGold = ctx.inventory?.getMaterial?.('goldDust') ?? 0;
    const canAfford =
      curTq >= cost.turquoise &&
      curShard >= cost.turquoiseShard &&
      curGold >= cost.goldDust;

    const affixRowsHtml = item.affixes
      .map((af, idx) => {
        const isLockedThis = lockedIdx === idx;
        const isLockedOther = lockedIdx != null && lockedIdx !== idx;
        const isSelected = selectedAffixIndex === idx;
        const statLine = formatStatLineForCtx(i18n, af.stat, af.value);
        const badgeText = isLockedThis
          ? `🔒 ${i18n.t('crafting.reforge.lockedBadge')}`
          : isLockedOther
            ? i18n.t('crafting.reforge.lockedOtherBadge')
            : i18n.t('crafting.reforge.unlockedBadge');

        return `
          <button
            type="button"
            class="crafting-affix-slot ${isSelected ? 'is-selected' : ''} ${isLockedThis ? 'is-locked' : ''} ${isLockedOther ? 'is-disabled' : ''}"
            data-affix-index="${idx}"
            ${isLockedOther ? 'disabled' : ''}
          >
            <span class="crafting-affix-slot__stat">• ${statLine}</span>
            <span class="crafting-affix-slot__badge">${badgeText}</span>
          </button>
        `;
      })
      .join('');

    let choicesPanelHtml = '';
    if (pendingReforge && pendingReforge.itemUid === item.uid) {
      const origLine = formatStatLineForCtx(
        i18n,
        pendingReforge.originalAffix.stat,
        pendingReforge.originalAffix.value
      );
      const cardsHtml = pendingReforge.choices
        .map((cand, cIdx) => {
          const candLine = formatStatLineForCtx(i18n, cand.stat, cand.value);
          return `
            <div class="crafting-choice-card">
              <div class="crafting-choice-card__badge">${i18n.t('crafting.reforge.choiceBadge', { n: cIdx + 1 })}</div>
              <div class="crafting-choice-card__stat">${candLine}</div>
              <button type="button" class="shop-action-btn crafting-choice-btn" data-choice-index="${cIdx}">
                ${i18n.t('crafting.reforge.applyChoiceBtn')}
              </button>
            </div>
          `;
        })
        .join('');

      choicesPanelHtml = `
        <div class="crafting-choices-box">
          <h4 class="crafting-choices-box__title">${i18n.t('crafting.reforge.choicesTitle')}</h4>
          <div class="crafting-choices-grid">
            ${cardsHtml}
          </div>
          <button type="button" id="crafting-btn-keep-orig" class="crafting-keep-btn">
            ${i18n.t('crafting.reforge.keepOriginalBtn', { text: origLine })}
          </button>
        </div>
      `;
    }

    reforgeWorkbenchEl.innerHTML = `
      <div class="crafting-workbench__card">
        <div class="crafting-workbench__head">
          <div>
            <div class="crafting-workbench__name" style="color:${color}">${item.name}</div>
            <div class="crafting-workbench__meta">
              <span>${i18n.t(`rarity.${normRarity}`)} · ${i18n.t(`slot.${item.slot}`)} · Lv${item.ilvl}</span>
              <span>${i18n.t('crafting.reforge.countLabel', { n: item.reforgeCount || 0 })}</span>
            </div>
          </div>
        </div>

        <div class="crafting-workbench__section">
          <div class="inv-tooltip__sec-label">${i18n.t('crafting.reforge.affixTitle')}</div>
          <div class="crafting-affix-list">
            ${affixRowsHtml}
          </div>
        </div>

        <div class="crafting-cost-bar">
          <span class="crafting-cost-bar__label">${i18n.t('crafting.reforge.costLabel')}</span>
          <div class="crafting-cost-pills">
            <span class="crafting-cost-pill ${curTq >= cost.turquoise ? '' : 'is-missing'}">💎 ${cost.turquoise}</span>
            <span class="crafting-cost-pill ${curShard >= cost.turquoiseShard ? '' : 'is-missing'}">🔹 ${i18n.t('crafting.mat.turquoiseShard')} ×${cost.turquoiseShard}</span>
            <span class="crafting-cost-pill ${curGold >= cost.goldDust ? '' : 'is-missing'}">✨ ${i18n.t('crafting.mat.goldDust')} ×${cost.goldDust}</span>
          </div>
          <button
            type="button"
            id="crafting-btn-roll"
            class="shop-action-btn shop-action-btn--buy"
            ${canAfford ? '' : 'disabled'}
          >
            🪷 ${i18n.t('crafting.reforge.rollBtn')}
          </button>
        </div>

        ${choicesPanelHtml}
      </div>
    `;

    const slotBtns = reforgeWorkbenchEl.querySelectorAll('.crafting-affix-slot');
    slotBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.affixIndex);
        if (lockedIdx != null && idx !== lockedIdx) return;
        selectedAffixIndex = idx;
        renderReforgeWorkbench();
      });
    });

    const rollBtn = reforgeWorkbenchEl.querySelector('#crafting-btn-roll');
    if (rollBtn) {
      rollBtn.addEventListener('click', () => {
        reforge(item.uid, selectedAffixIndex);
      });
    }

    const choiceBtns = reforgeWorkbenchEl.querySelectorAll('.crafting-choice-btn');
    choiceBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cIdx = Number(btn.dataset.choiceIndex);
        chooseReforge(cIdx);
      });
    });

    const keepBtn = reforgeWorkbenchEl.querySelector('#crafting-btn-keep-orig');
    if (keepBtn) {
      keepBtn.addEventListener('click', () => {
        chooseReforge('keep');
      });
    }
  }

  function renderAll() {
    if (!isOpen) return;
    applyStaticTranslations();
    renderMaterialsHeader();

    tabSalvageBtn.classList.toggle('is-active', activeTab === 'salvage');
    tabReforgeBtn.classList.toggle('is-active', activeTab === 'reforge');
    paneSalvage.classList.toggle('is-active', activeTab === 'salvage');
    paneReforge.classList.toggle('is-active', activeTab === 'reforge');

    if (activeTab === 'salvage') {
      renderSalvagePane();
    } else {
      renderReforgePane();
    }
  }

  // ---------------------------------------------------------------- Open / Close / Events
  function open(tab) {
    if (tab === 'salvage' || tab === 'reforge') {
      activeTab = tab;
    }
    isOpen = true;
    state.uiOpen = true;
    overlay.classList.remove('is-hidden');
    renderAll();
    return true;
  }

  function close() {
    if (!isOpen) return false;
    isOpen = false;
    state.uiOpen = false;
    overlay.classList.add('is-hidden');
    return true;
  }

  tabSalvageBtn.addEventListener('click', () => {
    activeTab = 'salvage';
    renderAll();
  });
  tabReforgeBtn.addEventListener('click', () => {
    activeTab = 'reforge';
    renderAll();
  });
  closeBtn.addEventListener('click', () => close());
  salvageCommonBtn.addEventListener('click', () => salvageAllCommon());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  bus.on('crafting:open', () => {
    open();
  });
  bus.on('inventory:changed', () => {
    if (isOpen) renderAll();
  });
  bus.on('currency:changed', () => {
    if (isOpen) renderAll();
  });
  i18n.onChange(() => {
    if (isOpen) renderAll();
  });

  function update() {
    if (isOpen && ctx.input?.pressed?.('closeUi')) {
      close();
    }
  }

  const api = {
    update,
    open,
    close,
    isOpen: () => isOpen,
    salvage,
    salvageAllCommon,
    reforge,
    chooseReforge,
    getPendingReforge: () => pendingReforge,
  };

  ctx.crafting = api;
  ctx.debug?.register('crafting', {
    open: (tab) => api.open(tab),
    close: () => api.close(),
    salvage: (itemId) => api.salvage(itemId),
    salvageAllCommon: () => api.salvageAllCommon(),
    reforge: (itemId, affixIndex) => api.reforge(itemId, affixIndex),
    chooseReforge: (choiceIndex) => api.chooseReforge(choiceIndex),
  });

  return api;
}
