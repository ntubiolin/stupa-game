/**
 * Dharma Instrument Merchant Shop UI (`src/ui/shop.js`) — Issue #31
 * Features:
 *   - 8 pieces of normal (common) / blessed equipment scaled to player level (`ilvl = player.level`).
 *   - Auto-refreshes when returning to `stupa` from a combat/dungeon zone (`zone:change`) or every 10 minutes (600s).
 *   - Buy price = `item.sellValue * 4` Turquoise; Sell price = `item.sellValue` Turquoise.
 *   - Left panel: Merchant stock (8 items) with Buy button (`購買`).
 *   - Right panel: Player bag items with Sell button (`販售`) + "Sell All Common Items" (`批次販售普通物品`) button.
 *   - Center/Bottom Inspector: Reuses #24 item comparison tooltip (`renderItemComparisonCardHtml`).
 *   - Refills Amrita pills (`ctx.potions?.refill?.()`) with a friendly reminder when visiting the merchant.
 *   - Debug API: `__stupa.shop.{open,close,refresh,getStock,buy,sell,sellAllCommon}`.
 */
import '../i18n/prologue.js';
import { EQUIPMENT_SLOTS } from '../data/itemBases.js';
import {
  RARITY_COLOR,
  getSlotIconDataUrl,
  renderItemComparisonCardHtml,
} from './inventory.js';

export const SHOP_STOCK_SIZE = 8;
export const SHOP_REFRESH_INTERVAL_SEC = 600; // 10 minutes

export function createShop(ctx) {
  if (ctx.shop) return ctx.shop;
  const { state, bus, i18n } = ctx;

  let isOpen = false;
  let stock = [];
  let refreshTimer = SHOP_REFRESH_INTERVAL_SEC;
  let inspectedItem = null;
  let inspectedSource = 'stock'; // 'stock' | 'bag'

  function getBuyPrice(item) {
    if (!item) return 0;
    return Math.max(4, Math.floor((Number(item.sellValue) || 1) * 4));
  }

  function getSellPrice(item) {
    if (!item) return 0;
    return Math.max(1, Math.floor(Number(item.sellValue) || 1));
  }

  function generateStockItems() {
    const ilvl = Math.max(1, Math.floor(Number(state.player?.level) || 1));
    const nextStock = [];
    for (let i = 0; i < SHOP_STOCK_SIZE; i++) {
      const slot = EQUIPMENT_SLOTS[i % EQUIPMENT_SLOTS.length];
      // Guarantee a clean mix of common ('normal') and 'blessed' items
      const rarity = i % 2 === 1 ? 'blessed' : 'normal';
      const item = ctx.loot?.generate
        ? ctx.loot.generate({ ilvl, rarity, slot })
        : null;
      if (item) {
        item.buyPrice = getBuyPrice(item);
        nextStock.push(item);
      }
    }
    stock = nextStock;
    refreshTimer = SHOP_REFRESH_INTERVAL_SEC;
    if (inspectedSource === 'stock') {
      inspectedItem = stock[0] || null;
    }
    return stock;
  }

  // ---------------------------------------------------------------- DOM Construction
  const overlay = document.createElement('div');
  overlay.id = 'shop-modal';
  overlay.className = 'shop-modal is-hidden';
  overlay.innerHTML = `
    <div class="shop-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="shop-modal-title">
      <header class="shop-header">
        <div class="shop-header__left">
          <span class="shop-header__badge" aria-hidden="true">☸</span>
          <div>
            <h2 id="shop-modal-title" class="shop-title" data-i18n="shop.title">法器商人・諾布</h2>
            <p class="shop-subtitle" data-i18n="shop.subtitle">隨緣結緣護身法器 · 返城或每 10 分鐘更新庫存</p>
          </div>
        </div>
        <div class="shop-header__right">
          <span id="shop-refresh-timer" class="shop-timer-pill">10:00</span>
          <button id="shop-btn-refresh" type="button" class="shop-refresh-btn" data-i18n="shop.refreshBtn">更新庫存</button>
          <div class="inv-currency-pill" title="Turquoise">
            <span class="inv-currency-pill__icon" aria-hidden="true">💎</span>
            <span id="shop-turquoise-val" class="inv-currency-pill__val">0</span>
          </div>
          <button id="shop-btn-close" type="button" class="inv-close-btn" aria-label="Close">✕</button>
        </div>
      </header>

      <div class="shop-body">
        <!-- Left Panel: Merchant Stock (8 items) -->
        <section class="shop-col shop-col--stock">
          <div class="shop-col__head">
            <h3 id="shop-stock-heading" class="inv-sec-title" data-i18n="shop.stockTitle">商鋪法器庫存 (8)</h3>
          </div>
          <div id="shop-stock-list" class="shop-list"></div>
        </section>

        <!-- Center/Bottom Inspector: Item Comparison Tooltip (#24 shared) -->
        <section class="shop-col shop-col--inspect">
          <div class="shop-col__head">
            <h3 class="inv-sec-title" data-i18n="shop.compareTitle">法器檢視與穿戴比對</h3>
          </div>
          <div id="shop-inspector" class="shop-inspector"></div>
        </section>

        <!-- Right Panel: Player Bag + Sell All Common Items -->
        <section class="shop-col shop-col--bag">
          <div class="shop-col__head shop-col__head--split">
            <h3 id="shop-bag-heading" class="inv-sec-title" data-i18n="shop.bagTitle">行囊背袋</h3>
            <button id="shop-btn-sell-common" type="button" class="shop-batch-btn" data-i18n="shop.sellAllCommonBtn">批次販售普通物品</button>
          </div>
          <div id="shop-bag-list" class="shop-list"></div>
        </section>
      </div>

      <footer class="shop-footer">
        <span class="shop-footer__amrita" data-i18n="shop.amritaRefilled">諾布笑著遞上甘露丸：「朝聖路遠，甘露丸已為你免費補滿！」</span>
        <span class="shop-footer__hint" data-i18n="shop.closeHint">按 Esc 關閉商鋪</span>
      </footer>
    </div>
  `;

  (document.getElementById('ui') || document.body).appendChild(overlay);

  const closeBtn = overlay.querySelector('#shop-btn-close');
  const refreshBtn = overlay.querySelector('#shop-btn-refresh');
  const refreshTimerEl = overlay.querySelector('#shop-refresh-timer');
  const turquoiseValEl = overlay.querySelector('#shop-turquoise-val');
  const stockListEl = overlay.querySelector('#shop-stock-list');
  const bagListEl = overlay.querySelector('#shop-bag-list');
  const inspectorEl = overlay.querySelector('#shop-inspector');
  const sellCommonBtn = overlay.querySelector('#shop-btn-sell-common');

  // ---------------------------------------------------------------- Operations
  function ensureStock() {
    if (!stock || stock.length === 0) {
      generateStockItems();
    }
  }

  function refresh(opts = {}) {
    generateStockItems();
    if (opts.toast) {
      bus.emit('toast', {
        text: i18n.t('shop.toast.refreshed'),
        kind: 'info',
      });
    }
    if (isOpen) renderAll();
    return getStock();
  }

  function getStock() {
    ensureStock();
    return [...stock];
  }

  function buy(indexOrId) {
    ensureStock();
    let idx = -1;
    if (typeof indexOrId === 'number') {
      idx = indexOrId;
    } else if (typeof indexOrId === 'string') {
      idx = stock.findIndex((it) => it && it.uid === indexOrId);
      if (idx === -1 && /^\d+$/.test(indexOrId)) {
        idx = Number(indexOrId);
      }
    }

    const item = stock[idx];
    if (!item) return false;

    const cost = getBuyPrice(item);
    const currentTq = ctx.inventory?.getTurquoise?.() ?? 0;
    if (currentTq < cost) {
      bus.emit('toast', {
        text: i18n.t('shop.toast.noTurquoise', { cost }),
        kind: 'warning',
      });
      return false;
    }

    // Check bag capacity before deducting currency
    const slots = ctx.inventory?.getBagSlots?.() || [];
    if (slots.length > 0 && !slots.some((s) => s === null)) {
      bus.emit('toast', {
        text: i18n.t('shop.toast.bagFull'),
        kind: 'warning',
      });
      return false;
    }

    if (!ctx.inventory?.spendTurquoise(cost)) {
      return false;
    }

    const added = ctx.inventory?.add(item);
    if (!added) {
      // Refund if bag add failed unexpectedly
      ctx.inventory?.addTurquoise(cost);
      return false;
    }

    stock.splice(idx, 1);
    if (inspectedItem && inspectedItem.uid === item.uid) {
      inspectedItem = stock[0] || null;
    }

    bus.emit('sfx', { name: 'pickupGear' });
    bus.emit('toast', {
      text: i18n.t('shop.toast.bought', { name: item.name, cost }),
      kind: 'Reward',
    });

    if (isOpen) renderAll();
    return item;
  }

  function sell(itemId) {
    if (!ctx.inventory || itemId == null) return false;
    const bagItems = ctx.inventory.getBag();
    let target = null;
    if (typeof itemId === 'number') {
      target = bagItems[itemId] || null;
    } else {
      target = bagItems.find((it) => it && it.uid === itemId) || null;
    }
    if (!target) return false;

    const gain = getSellPrice(target);
    const removed = ctx.inventory.remove(target.uid);
    if (!removed) return false;

    ctx.inventory.addTurquoise(gain);
    if (inspectedItem && inspectedItem.uid === target.uid) {
      inspectedItem = ctx.inventory.getBag()[0] || stock[0] || null;
    }

    bus.emit('sfx', { name: 'pickupTurquoise' });
    bus.emit('toast', {
      text: i18n.t('shop.toast.sold', { name: removed.name, gain }),
      kind: 'info',
    });

    if (isOpen) renderAll();
    return removed;
  }

  function sellAllCommon() {
    if (!ctx.inventory) return { count: 0, gain: 0 };
    const bagItems = ctx.inventory.getBag();
    const commons = bagItems.filter(
      (it) => it && (it.rarity === 'normal' || it.rarity === 'common')
    );

    if (commons.length === 0) {
      bus.emit('toast', {
        text: i18n.t('shop.toast.noCommonToSell'),
        kind: 'info',
      });
      return { count: 0, gain: 0 };
    }

    let totalGain = 0;
    let soldCount = 0;
    for (const item of commons) {
      const gain = getSellPrice(item);
      if (ctx.inventory.remove(item.uid)) {
        totalGain += gain;
        soldCount += 1;
      }
    }

    if (totalGain > 0) {
      ctx.inventory.addTurquoise(totalGain);
    }

    if (
      inspectedItem &&
      (inspectedItem.rarity === 'normal' || inspectedItem.rarity === 'common') &&
      inspectedSource === 'bag'
    ) {
      inspectedItem = ctx.inventory.getBag()[0] || stock[0] || null;
    }

    bus.emit('sfx', { name: 'pickupTurquoise' });
    bus.emit('toast', {
      text: i18n.t('shop.toast.soldAllCommon', {
        count: soldCount,
        gain: totalGain,
      }),
      kind: 'Reward',
    });

    if (isOpen) renderAll();
    return { count: soldCount, gain: totalGain };
  }

  // ---------------------------------------------------------------- Rendering
  function formatRefreshTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  function applyStaticTranslations() {
    const nodes = overlay.querySelectorAll('[data-i18n]');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = i18n.t(key);
    }
  }

  function renderInspector() {
    if (!inspectedItem) {
      inspectorEl.innerHTML = `
        <div class="inv-tooltip__empty">
          <p>${i18n.t('shop.compareHint')}</p>
        </div>
      `;
      return;
    }

    const priceHtml =
      inspectedSource === 'stock'
        ? `<span>💎 ${i18n.t('shop.price.buy', { n: getBuyPrice(inspectedItem) })}</span>`
        : `<span>💎 ${i18n.t('shop.price.sell', { n: getSellPrice(inspectedItem) })}</span>`;

    inspectorEl.innerHTML = renderItemComparisonCardHtml(ctx, inspectedItem, {
      isEquipped: false,
      compareWithEquipped: true,
      priceHtml,
    });
  }

  function renderStockList() {
    ensureStock();
    stockListEl.innerHTML = '';

    if (stock.length === 0) {
      stockListEl.innerHTML = `<div class="shop-empty">${i18n.t('shop.stockEmpty')}</div>`;
      return;
    }

    const currentTq = ctx.inventory?.getTurquoise?.() ?? 0;

    stock.forEach((item, index) => {
      const normRarity = item.rarity === 'common' ? 'normal' : item.rarity;
      const color = RARITY_COLOR[normRarity] || RARITY_COLOR.normal;
      const iconUrl = getSlotIconDataUrl(item.slot, normRarity);
      const cost = getBuyPrice(item);
      const canAfford = currentTq >= cost;
      const isSelected =
        inspectedSource === 'stock' && inspectedItem?.uid === item.uid;

      const row = document.createElement('div');
      row.className = `shop-item-row rarity-${normRarity}${isSelected ? ' is-selected' : ''}`;
      row.dataset.uid = item.uid;
      row.dataset.index = String(index);
      row.innerHTML = `
        <div class="shop-item-row__left">
          <img class="shop-item-row__icon" src="${iconUrl}" alt="${item.name}" />
          <div class="shop-item-row__info">
            <div class="shop-item-row__name" style="color:${color}">${item.name}</div>
            <div class="shop-item-row__meta">
              <span>${i18n.t(`rarity.${normRarity}`)} · ${i18n.t(`slot.${item.slot}`)} · Lv${item.ilvl}</span>
            </div>
          </div>
        </div>
        <div class="shop-item-row__right">
          <span class="shop-price-tag ${canAfford ? '' : 'is-insufficient'}">💎 ${cost}</span>
          <button type="button" class="shop-action-btn shop-action-btn--buy" ${canAfford ? '' : 'disabled'}>
            ${i18n.t('shop.buyBtn')}
          </button>
        </div>
      `;

      row.addEventListener('mouseenter', () => {
        inspectedSource = 'stock';
        inspectedItem = item;
        renderInspector();
      });
      row.addEventListener('click', () => {
        inspectedSource = 'stock';
        inspectedItem = item;
        renderAll();
      });

      const buyBtn = row.querySelector('.shop-action-btn--buy');
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        buy(item.uid);
      });

      stockListEl.appendChild(row);
    });
  }

  function renderBagList() {
    bagListEl.innerHTML = '';
    const bagItems = ctx.inventory?.getBag?.() || [];

    const hasCommons = bagItems.some(
      (it) => it && (it.rarity === 'normal' || it.rarity === 'common')
    );
    sellCommonBtn.disabled = !hasCommons;

    if (bagItems.length === 0) {
      bagListEl.innerHTML = `<div class="shop-empty">${i18n.t('shop.bagEmpty')}</div>`;
      return;
    }

    bagItems.forEach((item) => {
      const normRarity = item.rarity === 'common' ? 'normal' : item.rarity;
      const color = RARITY_COLOR[normRarity] || RARITY_COLOR.normal;
      const iconUrl = getSlotIconDataUrl(item.slot, normRarity);
      const sellVal = getSellPrice(item);
      const isSelected =
        inspectedSource === 'bag' && inspectedItem?.uid === item.uid;

      const row = document.createElement('div');
      row.className = `shop-item-row rarity-${normRarity}${isSelected ? ' is-selected' : ''}`;
      row.dataset.uid = item.uid;
      row.innerHTML = `
        <div class="shop-item-row__left">
          <img class="shop-item-row__icon" src="${iconUrl}" alt="${item.name}" />
          <div class="shop-item-row__info">
            <div class="shop-item-row__name" style="color:${color}">${item.name}</div>
            <div class="shop-item-row__meta">
              <span>${i18n.t(`rarity.${normRarity}`)} · ${i18n.t(`slot.${item.slot}`)} · Lv${item.ilvl}</span>
            </div>
          </div>
        </div>
        <div class="shop-item-row__right">
          <span class="shop-price-tag">+💎 ${sellVal}</span>
          <button type="button" class="shop-action-btn shop-action-btn--sell">
            ${i18n.t('shop.sellBtn')}
          </button>
        </div>
      `;

      row.addEventListener('mouseenter', () => {
        inspectedSource = 'bag';
        inspectedItem = item;
        renderInspector();
      });
      row.addEventListener('click', () => {
        inspectedSource = 'bag';
        inspectedItem = item;
        renderAll();
      });

      const sellBtn = row.querySelector('.shop-action-btn--sell');
      sellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sell(item.uid);
      });

      bagListEl.appendChild(row);
    });
  }

  function renderAll() {
    if (!isOpen) return;
    applyStaticTranslations();
    const tq = ctx.inventory?.getTurquoise?.() ?? 0;
    turquoiseValEl.textContent = String(tq);
    refreshTimerEl.textContent = i18n.t('shop.refreshIn', {
      time: formatRefreshTime(refreshTimer),
    });

    if (!inspectedItem) {
      inspectedItem = stock[0] || ctx.inventory?.getBag?.()?.[0] || null;
      inspectedSource = stock[0] ? 'stock' : 'bag';
    }

    renderStockList();
    renderBagList();
    renderInspector();
  }

  // ---------------------------------------------------------------- Open / Close / Events
  function open() {
    ensureStock();
    // Refill Amrita pills with friendly reminder when visiting the merchant
    if (ctx.potions?.refill) {
      ctx.potions.refill();
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

  closeBtn.addEventListener('click', () => close());
  refreshBtn.addEventListener('click', () => refresh({ toast: true }));
  sellCommonBtn.addEventListener('click', () => sellAllCommon());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  bus.on('shop:open', () => {
    open();
  });

  bus.on('npc:talk', ({ npcId }) => {
    if (npcId === 'merchant') {
      if (ctx.potions?.refill) {
        ctx.potions.refill();
      }
      bus.emit('toast', {
        text: i18n.t('shop.amritaRefilled'),
        kind: 'Heal',
      });
    }
  });

  // Auto-refresh when returning to stupa from a combat/dungeon zone
  bus.on('zone:change', ({ from, to }) => {
    if (to === 'stupa' && from && from !== 'stupa') {
      refresh();
    }
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

  function update(dt = 0) {
    if (dt > 0) {
      const prevCeil = Math.ceil(refreshTimer);
      refreshTimer -= dt;
      if (refreshTimer <= 0) {
        refresh();
      } else if (isOpen && Math.ceil(refreshTimer) !== prevCeil) {
        refreshTimerEl.textContent = i18n.t('shop.refreshIn', {
          time: formatRefreshTime(refreshTimer),
        });
      }
    }

    if (isOpen && ctx.input?.pressed?.('closeUi')) {
      close();
    }
  }

  const api = {
    update,
    open,
    close,
    isOpen: () => isOpen,
    refresh,
    getStock,
    buy,
    sell,
    sellAllCommon,
  };

  ctx.shop = api;
  ctx.debug?.register('shop', {
    open: () => api.open(),
    close: () => api.close(),
    refresh: () => api.refresh(),
    getStock: () => api.getStock(),
    buy: (indexOrId) => api.buy(indexOrId),
    sell: (itemId) => api.sell(itemId),
    sellAllCommon: () => api.sellAllCommon(),
  });

  return api;
}
