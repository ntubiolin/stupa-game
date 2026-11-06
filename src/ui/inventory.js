/**
 * Inventory & Character UI panel — toggle with `I` (Inventory) or `C` (Character),
 * close with `Esc`.
 * Features:
 *   - Left: Practitioner silhouette + 8 equipment slots.
 *   - Center/Right: 6×5 (30-slot) bag grid with canvas-drawn slot icons & rarity borders.
 *   - Inspector / Tooltip card with stat-by-stat comparison (green ▲ / red ▼)
 *     against the currently equipped item in the same slot.
 *   - Character Attributes tab / drawer showing all derived combat & exploration stats.
 *   - Right-click context menu & mobile bottom action bar (Equip / Unequip / Discard).
 */
import { EQUIPMENT_SLOTS } from '../data/itemBases.js';
import { LEGENDARIES_BY_ID } from '../data/legendaries.js';
import { BAG_CAPACITY, STAT_KEYS, sumSingleItemStats } from '../systems/inventory.js';

export const RARITY_COLOR = {
  normal: '#e5e7eb',
  common: '#e5e7eb',
  blessed: '#5b8cff',
  rare: '#ffd84a',
  terma: '#ff8a1f',
};

const SLOT_GLYPH = {
  mainhand: 'ཧཱུྃ',
  offhand: 'ཨོཾ',
  head: 'ཏྲཱཾ',
  body: 'ཧྲཱིཿ',
  hands: 'ཨཱཿ',
  feet: 'རླུང',
  neck: 'མ་ཎི',
  ring: 'པདྨ',
};

const PCT_STATS = new Set([
  'atkPct',
  'critChance',
  'critDamage',
  'moveSpeed',
  'cdr',
  'mantraRadius',
  'skillDamage',
  'magicRes',
  'expBonus',
  'findBonus',
]);

// Cache canvas data URLs per (slot, rarity) so we don't redraw every render
const iconCache = new Map();

export function getSlotIconDataUrl(slot, rarity = 'normal') {
  const key = `${slot}:${rarity}`;
  if (iconCache.has(key)) return iconCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  if (c) {
    const color = RARITY_COLOR[rarity] || RARITY_COLOR.normal;
    c.clearRect(0, 0, 64, 64);

    // Subtle radial glow
    const grad = c.createRadialGradient(32, 32, 4, 32, 32, 28);
    grad.addColorStop(0, `${color}44`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);

    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Draw simple ritual silhouette by slot
    c.save();
    c.translate(32, 26);
    if (slot === 'mainhand') {
      // Vajra / Phurba
      c.beginPath();
      c.moveTo(0, -14);
      c.lineTo(0, 14);
      c.moveTo(-7, -8);
      c.quadraticCurveTo(0, -16, 7, -8);
      c.moveTo(-7, 8);
      c.quadraticCurveTo(0, 16, 7, 8);
      c.stroke();
      c.beginPath();
      c.arc(0, 0, 3.2, 0, Math.PI * 2);
      c.fill();
    } else if (slot === 'offhand') {
      // Ritual Bell
      c.beginPath();
      c.moveTo(-9, 10);
      c.lineTo(-5, -4);
      c.quadraticCurveTo(0, -10, 5, -4);
      c.lineTo(9, 10);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(0, -9);
      c.lineTo(0, -15);
      c.stroke();
    } else if (slot === 'head') {
      // Lotus hat
      c.beginPath();
      c.moveTo(-12, 8);
      c.lineTo(-8, -6);
      c.lineTo(0, -13);
      c.lineTo(8, -6);
      c.lineTo(12, 8);
      c.closePath();
      c.stroke();
    } else if (slot === 'body') {
      // Monastic robe
      c.beginPath();
      c.moveTo(-7, -11);
      c.lineTo(7, -11);
      c.lineTo(13, -3);
      c.lineTo(9, 12);
      c.lineTo(-9, 12);
      c.lineTo(-13, -3);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(-6, -11);
      c.lineTo(7, 4);
      c.stroke();
    } else if (slot === 'hands') {
      // Bracers
      c.strokeRect(-10, -8, 7, 16);
      c.strokeRect(3, -8, 7, 16);
    } else if (slot === 'feet') {
      // Tibetan boots
      c.beginPath();
      c.moveTo(-6, -10);
      c.lineTo(-6, 8);
      c.lineTo(9, 8);
      c.quadraticCurveTo(12, 4, 6, 2);
      c.lineTo(1, 2);
      c.lineTo(1, -10);
      c.closePath();
      c.stroke();
    } else if (slot === 'neck') {
      // Mala beads
      c.beginPath();
      c.arc(0, 0, 10, 0, Math.PI * 2);
      c.setLineDash([2.5, 3.5]);
      c.stroke();
      c.setLineDash([]);
      c.beginPath();
      c.arc(0, 11, 2.8, 0, Math.PI * 2);
      c.fill();
    } else if (slot === 'ring') {
      // Ring with gem
      c.beginPath();
      c.arc(0, 2, 8, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(0, -10);
      c.lineTo(4, -6);
      c.lineTo(0, -2);
      c.lineTo(-4, -6);
      c.closePath();
      c.fill();
    }
    c.restore();

    // Tibetan syllable watermark at bottom
    c.font = 'bold 13px "Noto Sans Tibetan", serif';
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    c.fillStyle = `${color}cc`;
    c.fillText(SLOT_GLYPH[slot] || 'ཨོཾ', 32, 61);
  }

  const url = canvas.toDataURL();
  iconCache.set(key, url);
  return url;
}

export function formatStatLineForCtx(i18n, stat, value) {
  const valStr =
    stat === 'mpRegen' ? Number(value).toFixed(1) : String(Math.round(value));
  return i18n.t(`stat.${stat}`, { v: valStr });
}

export function formatDeltaBadgeForCtx(stat, diff) {
  if (Math.abs(diff) < 1e-4) return '';
  const isUp = diff > 0;
  const sign = isUp ? '+' : '';
  const numStr =
    stat === 'mpRegen' ? diff.toFixed(1) : String(Math.round(diff));
  const unit = PCT_STATS.has(stat) ? '%' : '';
  const arrow = isUp ? '▲' : '▼';
  const cls = isUp ? 'inv-diff inv-diff--up' : 'inv-diff inv-diff--down';
  return `<span class="${cls}">${arrow} ${sign}${numStr}${unit}</span>`;
}

/**
 * Shared item comparison tooltip card renderer for Inventory (#24), Shop (#31), and Crafting (#31).
 */
export function renderItemComparisonCardHtml(ctx, item, opts = {}) {
  const { i18n } = ctx;
  if (!item) return '';
  const normRarity = item.rarity === 'common' ? 'normal' : item.rarity;
  const color = RARITY_COLOR[normRarity] || RARITY_COLOR.normal;
  const rarityLabel = i18n.t(`rarity.${normRarity}`);
  const slotLabel = i18n.t(`slot.${item.slot}`);
  const ilvlLabel = i18n.t('inv.ilvl', { ilvl: item.ilvl });

  const impLines = [];
  if (item.implicit) {
    impLines.push(formatStatLineForCtx(i18n, item.implicit.stat, item.implicit.value));
    if (item.implicit.extraStat) {
      impLines.push(
        formatStatLineForCtx(i18n, item.implicit.extraStat, item.implicit.extraValue)
      );
    }
  }

  const lockedIdx =
    item.lockedAffixIndex != null
      ? item.lockedAffixIndex
      : item.reforgeSlot != null
        ? item.reforgeSlot
        : null;

  const affixLines = (item.affixes || []).map((af, idx) => {
    const line = formatStatLineForCtx(i18n, af.stat, af.value);
    const lockTag = lockedIdx === idx ? ' 🔒' : '';
    return `${line}${lockTag}`;
  });

  let termaHtml = '';
  if (item.legendaryId || item.powerId) {
    const legId = item.legendaryId || item.powerId;
    const legDef = LEGENDARIES_BY_ID[legId];
    const powerDesc = legDef
      ? i18n.t(legDef.powerKey)
      : i18n.t(`legendary.${legId}.power`);
    termaHtml = `
      <div class="inv-tooltip__terma">
        ✦ ${i18n.t('inv.termaPower', { power: powerDesc })}
      </div>
    `;
  }

  let compareHtml = '';
  const isEquippedSelf = opts.isEquipped === true;
  if (!isEquippedSelf && opts.compareWithEquipped !== false) {
    const equippedItem = ctx.inventory?.getEquipped?.()?.[item.slot] || null;
    const candStats = sumSingleItemStats(item);
    const eqStats = sumSingleItemStats(equippedItem);
    const diffRows = [];
    for (const stKey of STAT_KEYS) {
      const diff = +(candStats[stKey] - eqStats[stKey]).toFixed(1);
      if (Math.abs(diff) >= 0.05) {
        const statLabel = formatStatLineForCtx(i18n, stKey, Math.abs(diff))
          .replace(/\+[0-9.]+%?/, '')
          .trim();
        diffRows.push(`
          <div class="inv-compare-row">
            <span class="inv-compare-row__stat">${statLabel}</span>
            ${formatDeltaBadgeForCtx(stKey, diff)}
          </div>
        `);
      }
    }
    if (diffRows.length > 0) {
      compareHtml = `
        <div class="inv-tooltip__compare">
          <div class="inv-tooltip__sec-label">${i18n.t('inv.compareEquipped')}</div>
          ${diffRows.join('')}
        </div>
      `;
    }
  }

  const equippedBadge = isEquippedSelf
    ? `<span class="inv-tooltip__badge">${i18n.t('inv.equippedBadge')}</span>`
    : '';

  const priceLine =
    opts.priceHtml ||
    `<span>💎 ${i18n.t('inv.sellValue', { v: item.sellValue || 1 })}</span>`;

  return `
    <div class="inv-tooltip__card rarity-${normRarity}">
      <div class="inv-tooltip__head">
        <div class="inv-tooltip__name" style="color: ${color}">${item.name}</div>
        ${equippedBadge}
      </div>
      <div class="inv-tooltip__meta">
        <span>${rarityLabel} · ${slotLabel}</span>
        <span>${ilvlLabel}</span>
      </div>
      <div class="inv-tooltip__section">
        <div class="inv-tooltip__sec-label">${i18n.t('inv.implicit')}</div>
        ${impLines.map((l) => `<div class="inv-tooltip__line inv-tooltip__line--imp">${l}</div>`).join('')}
      </div>
      ${
        affixLines.length > 0
          ? `<div class="inv-tooltip__section">
              <div class="inv-tooltip__sec-label">${i18n.t('inv.affixes')}</div>
              ${affixLines.map((l) => `<div class="inv-tooltip__line inv-tooltip__line--affix">• ${l}</div>`).join('')}
            </div>`
          : ''
      }
      ${termaHtml}
      ${compareHtml}
      <div class="inv-tooltip__footer">
        ${priceLine}
      </div>
    </div>
  `;
}

export function createInventoryUi(ctx) {
  const { state, bus, i18n } = ctx;

  let isOpen = false;
  let activeTab = 'bag'; // 'bag' | 'char'
  let selectedSource = null; // { type: 'bag' | 'equipped', uid, slot }

  // ---------------------------------------------------------------- DOM Construction
  const overlay = document.createElement('div');
  overlay.id = 'inventory-modal';
  overlay.className = 'inv-modal is-hidden';
  overlay.innerHTML = `
    <div class="inv-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="inv-modal-title">
      <header class="inv-header">
        <div class="inv-header__left">
          <h2 id="inv-modal-title" class="inv-title" data-i18n="inv.title">行囊與法相</h2>
          <div class="inv-tabs" role="tablist">
            <button id="inv-tab-bag" type="button" class="inv-tab is-active" data-tab="bag" data-i18n="inv.tabBag">行囊背包 (I)</button>
            <button id="inv-tab-char" type="button" class="inv-tab" data-tab="char" data-i18n="inv.tabChar">修行法相 (C)</button>
          </div>
        </div>
        <div class="inv-header__right">
          <div class="inv-mat-pill" title="碎綠松石 / Turquoise Shard">
            <span class="inv-mat-pill__icon" aria-hidden="true">🔹</span>
            <span id="inv-mat-shard-label" data-i18n="crafting.mat.turquoiseShard">碎綠松石</span>
            <span id="inv-mat-shard-val" class="inv-mat-pill__val">0</span>
          </div>
          <div class="inv-mat-pill" title="金粉 / Gold Dust">
            <span class="inv-mat-pill__icon" aria-hidden="true">✨</span>
            <span id="inv-mat-gold-label" data-i18n="crafting.mat.goldDust">金粉</span>
            <span id="inv-mat-gold-val" class="inv-mat-pill__val">0</span>
          </div>
          <div class="inv-mat-pill" title="伏藏精華 / Terma Essence">
            <span class="inv-mat-pill__icon" aria-hidden="true">🔥</span>
            <span id="inv-mat-terma-label" data-i18n="crafting.mat.termaEssence">伏藏精華</span>
            <span id="inv-mat-terma-val" class="inv-mat-pill__val">0</span>
          </div>
          <div class="inv-currency-pill" title="Turquoise">
            <span class="inv-currency-pill__icon" aria-hidden="true">💎</span>
            <span id="inv-turquoise-val" class="inv-currency-pill__val">0</span>
          </div>
          <button id="inv-btn-close" type="button" class="inv-close-btn" aria-label="Close">✕</button>
        </div>
      </header>

      <div class="inv-body">
        <!-- Pane 1: Equipment + 30-Slot Bag + Inspector -->
        <div id="inv-bag-pane" class="inv-pane inv-pane--bag is-active">
          <!-- Left: Practitioner Silhouette + 8 Equipment Slots -->
          <section class="inv-equip-col">
            <h3 class="inv-sec-title" data-i18n="inv.equippedTitle">護身法器與法衣</h3>
            <div class="inv-paperdoll">
              <svg class="inv-silhouette" viewBox="0 0 120 220" aria-hidden="true">
                <circle cx="60" cy="34" r="16" fill="none" stroke="rgba(251,191,36,0.22)" stroke-width="2"/>
                <path d="M36 62 C36 54, 84 54, 84 62 L92 126 L78 126 L74 82 L72 198 L48 198 L46 82 L42 126 L28 126 Z"
                  fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.22)" stroke-width="1.8"/>
              </svg>
              <div id="inv-equip-slots" class="inv-equip-slots"></div>
            </div>
          </section>

          <!-- Center: 6x5 Bag Grid (30 Slots) -->
          <section class="inv-bag-col">
            <h3 id="inv-bag-heading" class="inv-sec-title">行囊（0 / 30）</h3>
            <div id="inv-bag-grid" class="inv-bag-grid"></div>
          </section>

          <!-- Right / Bottom: Item Tooltip & Comparison Inspector -->
          <section class="inv-inspect-col">
            <div id="inv-tooltip" class="inv-tooltip"></div>
            <div id="inv-action-bar" class="inv-action-bar is-hidden">
              <button id="inv-btn-equip" type="button" class="inv-act-btn inv-act-btn--primary" data-i18n="inv.btnEquip">裝備</button>
              <button id="inv-btn-unequip" type="button" class="inv-act-btn inv-act-btn--secondary" data-i18n="inv.btnUnequip">卸下</button>
              <button id="inv-btn-offer" type="button" class="inv-act-btn inv-act-btn--secondary" data-i18n="inv.btnOffer">供養</button>
              <button id="inv-btn-salvage" type="button" class="inv-act-btn inv-act-btn--secondary" data-i18n="inv.btnSalvage">拆解</button>
              <button id="inv-btn-discard" type="button" class="inv-act-btn inv-act-btn--danger" data-i18n="inv.btnDiscard">丟棄</button>
              <button id="inv-btn-cancel" type="button" class="inv-act-btn inv-act-btn--secondary" data-i18n="inv.btnCloseMenu">關閉</button>
            </div>
          </section>
        </div>

        <!-- Pane 2: Character Attributes -->
        <div id="inv-char-pane" class="inv-pane inv-pane--char">
          <section class="inv-char-section">
            <h3 class="inv-sec-title" data-i18n="inv.charTitle">修行者屬性</h3>
            <div id="inv-char-stats-grid" class="inv-char-stats-grid"></div>
          </section>
        </div>
      </div>

      <!-- Right-Click Context Menu -->
      <div id="inv-context-menu" class="inv-context-menu is-hidden">
        <button id="inv-ctx-equip" type="button" class="inv-ctx-item" data-i18n="inv.btnEquip">裝備</button>
        <button id="inv-ctx-unequip" type="button" class="inv-ctx-item" data-i18n="inv.btnUnequip">卸下</button>
        <button id="inv-ctx-offer" type="button" class="inv-ctx-item" data-i18n="inv.btnOffer">供養</button>
        <button id="inv-ctx-salvage" type="button" class="inv-ctx-item" data-i18n="inv.btnSalvage">拆解</button>
        <button id="inv-ctx-discard" type="button" class="inv-ctx-item inv-ctx-item--danger" data-i18n="inv.btnDiscard">丟棄</button>
        <button id="inv-ctx-cancel" type="button" class="inv-ctx-item" data-i18n="inv.btnCloseMenu">關閉</button>
      </div>
    </div>
  `;

  (document.getElementById('ui') || document.body).appendChild(overlay);

  const tabBagBtn = overlay.querySelector('#inv-tab-bag');
  const tabCharBtn = overlay.querySelector('#inv-tab-char');
  const closeBtn = overlay.querySelector('#inv-btn-close');
  const turquoiseValEl = overlay.querySelector('#inv-turquoise-val');
  const bagPane = overlay.querySelector('#inv-bag-pane');
  const charPane = overlay.querySelector('#inv-char-pane');
  const equipSlotsEl = overlay.querySelector('#inv-equip-slots');
  const bagHeadingEl = overlay.querySelector('#inv-bag-heading');
  const bagGridEl = overlay.querySelector('#inv-bag-grid');
  const tooltipEl = overlay.querySelector('#inv-tooltip');
  const actionBarEl = overlay.querySelector('#inv-action-bar');
  const btnEquip = overlay.querySelector('#inv-btn-equip');
  const btnUnequip = overlay.querySelector('#inv-btn-unequip');
  const btnOffer = overlay.querySelector('#inv-btn-offer');
  const btnSalvage = overlay.querySelector('#inv-btn-salvage');
  const btnDiscard = overlay.querySelector('#inv-btn-discard');
  const btnCancel = overlay.querySelector('#inv-btn-cancel');
  const charStatsGridEl = overlay.querySelector('#inv-char-stats-grid');
  const ctxMenuEl = overlay.querySelector('#inv-context-menu');
  const ctxEquipBtn = overlay.querySelector('#inv-ctx-equip');
  const ctxUnequipBtn = overlay.querySelector('#inv-ctx-unequip');
  const ctxOfferBtn = overlay.querySelector('#inv-ctx-offer');
  const ctxSalvageBtn = overlay.querySelector('#inv-ctx-salvage');
  const ctxDiscardBtn = overlay.querySelector('#inv-ctx-discard');
  const ctxCancelBtn = overlay.querySelector('#inv-ctx-cancel');

  // ---------------------------------------------------------------- Formatting Helpers
  function formatStatLine(stat, value) {
    const valStr =
      stat === 'mpRegen' ? Number(value).toFixed(1) : String(Math.round(value));
    return i18n.t(`stat.${stat}`, { v: valStr });
  }

  function formatDeltaBadge(stat, diff) {
    if (Math.abs(diff) < 1e-4) return '';
    const isUp = diff > 0;
    const sign = isUp ? '+' : '';
    const numStr =
      stat === 'mpRegen' ? diff.toFixed(1) : String(Math.round(diff));
    const unit = PCT_STATS.has(stat) ? '%' : '';
    const arrow = isUp ? '▲' : '▼';
    const cls = isUp ? 'inv-diff inv-diff--up' : 'inv-diff inv-diff--down';
    return `<span class="${cls}">${arrow} ${sign}${numStr}${unit}</span>`;
  }

  // ---------------------------------------------------------------- Render Functions
  function hideContextMenu() {
    ctxMenuEl.classList.add('is-hidden');
  }

  function resolveSelectedItem() {
    if (!selectedSource || !ctx.inventory) return null;
    if (selectedSource.type === 'equipped') {
      const eq = ctx.inventory.getEquipped();
      return eq[selectedSource.slot] || null;
    }
    return ctx.inventory.get(selectedSource.uid);
  }

  function renderEquipmentSlots() {
    if (!ctx.inventory) return;
    const equipped = ctx.inventory.getEquipped();
    equipSlotsEl.innerHTML = '';

    for (const slot of EQUIPMENT_SLOTS) {
      const item = equipped[slot];
      const cell = document.createElement('button');
      cell.type = 'button';
      const isSelected =
        selectedSource?.type === 'equipped' && selectedSource?.slot === slot;
      cell.className = `inv-slot inv-slot--equip inv-slot--${slot} rarity-${
        item ? item.rarity : 'empty'
      }${isSelected ? ' is-selected' : ''}`;
      cell.dataset.slot = slot;

      const slotLabel = i18n.t(`slot.${slot}`);
      if (item) {
        const iconUrl = getSlotIconDataUrl(slot, item.rarity);
        cell.innerHTML = `
          <img class="inv-slot__icon" src="${iconUrl}" alt="${slotLabel}" />
          <span class="inv-slot__ilvl">Lv${item.ilvl}</span>
          <span class="inv-slot__caption">${item.name}</span>
        `;
      } else {
        cell.innerHTML = `
          <span class="inv-slot__glyph" aria-hidden="true">${SLOT_GLYPH[slot] || '○'}</span>
          <span class="inv-slot__caption">${slotLabel}</span>
        `;
      }

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        hideContextMenu();
        if (item) {
          selectedSource = { type: 'equipped', slot, uid: item.uid };
        } else {
          selectedSource = null;
        }
        renderAll();
      });

      cell.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        hideContextMenu();
        if (item) {
          ctx.inventory.unequip(slot);
          selectedSource = null;
          renderAll();
        }
      });

      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!item) return;
        selectedSource = { type: 'equipped', slot, uid: item.uid };
        renderAll();
        openContextMenu(e.clientX, e.clientY, 'equipped');
      });

      equipSlotsEl.appendChild(cell);
    }
  }

  function renderBagGrid() {
    if (!ctx.inventory) return;
    const slots = ctx.inventory.getBagSlots();
    const count = slots.filter(Boolean).length;
    bagHeadingEl.textContent = i18n.t('inv.bagTitle', {
      count,
      max: BAG_CAPACITY,
    });
    bagGridEl.innerHTML = '';

    for (let i = 0; i < BAG_CAPACITY; i++) {
      const item = slots[i];
      const cell = document.createElement('button');
      cell.type = 'button';
      const isSelected =
        item &&
        selectedSource?.type === 'bag' &&
        selectedSource?.uid === item.uid;
      cell.className = `inv-slot inv-slot--bag rarity-${
        item ? item.rarity : 'empty'
      }${isSelected ? ' is-selected' : ''}`;
      cell.dataset.bagIndex = String(i);

      if (item) {
        const iconUrl = getSlotIconDataUrl(item.slot, item.rarity);
        cell.innerHTML = `
          <img class="inv-slot__icon" src="${iconUrl}" alt="${item.name}" />
          <span class="inv-slot__ilvl">Lv${item.ilvl}</span>
        `;
        cell.title = item.name;

        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          hideContextMenu();
          selectedSource = { type: 'bag', uid: item.uid, slot: item.slot };
          renderAll();
        });

        cell.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          hideContextMenu();
          ctx.inventory.equip(item.uid);
          selectedSource = { type: 'equipped', slot: item.slot, uid: item.uid };
          renderAll();
        });

        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectedSource = { type: 'bag', uid: item.uid, slot: item.slot };
          renderAll();
          openContextMenu(e.clientX, e.clientY, 'bag');
        });
      } else {
        cell.innerHTML = `<span class="inv-slot__empty-dot"></span>`;
        cell.addEventListener('click', () => {
          hideContextMenu();
          selectedSource = null;
          renderAll();
        });
      }

      bagGridEl.appendChild(cell);
    }
  }

  function renderTooltip() {
    const item = resolveSelectedItem();
    if (!item) {
      tooltipEl.innerHTML = `
        <div class="inv-tooltip__empty">
          <p>${i18n.t('inv.selectHint')}</p>
        </div>
      `;
      actionBarEl.classList.add('is-hidden');
      return;
    }

    tooltipEl.innerHTML = renderItemComparisonCardHtml(ctx, item, {
      isEquipped: selectedSource?.type === 'equipped',
    });

    actionBarEl.classList.remove('is-hidden');
    const isBag = selectedSource?.type === 'bag';
    btnEquip.style.display = isBag ? '' : 'none';
    btnUnequip.style.display = !isBag ? '' : 'none';
    if (btnOffer) btnOffer.style.display = isBag ? '' : 'none';
    if (btnSalvage) btnSalvage.style.display = isBag ? '' : 'none';
  }

  function renderCharacterStats() {
    if (!ctx.vitals?.getStats) return;
    const s = ctx.vitals.getStats();
    const mats = ctx.inventory?.getMaterials?.() || {};

    const rows = [
      [i18n.t('char.level'), `Lv ${s.level}`],
      [
        i18n.t('char.exp'),
        s.isMaxLevel ? i18n.t('hud.max') || 'MAX' : `${s.exp} / ${s.maxExp}`,
      ],
      [i18n.t('char.hp'), `${s.hp} / ${s.maxHp}`],
      [i18n.t('char.mp'), `${Math.round(s.mp)} / ${s.maxMp}`],
      [i18n.t('char.atk'), `${s.atk}`],
      [i18n.t('char.def'), `${s.def}`],
      [i18n.t('char.critChance'), `${Math.round((s.critChance || 0) * 100)}%`],
      [i18n.t('char.critDamage'), `${Math.round((s.critDamage || 1.5) * 100)}%`],
      [
        i18n.t('char.moveSpeed'),
        `+${Math.round(((s.moveSpeedMult || 1) - 1) * 100)}%`,
      ],
      [i18n.t('char.cdr'), `${Math.round((s.cdr || 0) * 100)}%`],
      [i18n.t('char.mpRegen'), `${(s.mpRegen || 0).toFixed(1)} / s`],
      [i18n.t('char.magicRes'), `${Math.round((s.magicRes || 0) * 100)}%`],
      [i18n.t('char.hpOnLiberate'), `+${s.hpOnLiberate || 0}`],
      [i18n.t('char.expBonus'), `+${s.expBonus || 0}%`],
      [i18n.t('char.findBonus'), `+${s.findBonus || 0}%`],
      [i18n.t('char.skillDamage'), `+${s.skillDamage || 0}%`],
      [i18n.t('char.mantraRadius'), `+${s.mantraRadiusBonus || 0}%`],
      [i18n.t('char.turquoise'), `💎 ${s.turquoise || 0}`],
      [i18n.t('char.mat.turquoiseShard'), `${mats.turquoiseShard || 0}`],
      [i18n.t('char.mat.goldDust'), `${mats.goldDust || 0}`],
      [i18n.t('char.mat.termaEssence'), `${mats.termaEssence || 0}`],
    ];

    charStatsGridEl.innerHTML = rows
      .map(
        ([label, val]) => `
        <div class="inv-stat-row">
          <span class="inv-stat-row__label">${label}</span>
          <span class="inv-stat-row__val">${val}</span>
        </div>
      `
      )
      .join('');
  }

  function applyStaticTranslations() {
    const nodes = overlay.querySelectorAll('[data-i18n]');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = i18n.t(key);
    }
  }

  function renderAll() {
    if (!isOpen) return;
    applyStaticTranslations();
    const tq = ctx.inventory?.getTurquoise?.() ?? 0;
    turquoiseValEl.textContent = String(tq);

    const mats = ctx.inventory?.getMaterials?.() || {};
    const shardEl = overlay.querySelector('#inv-mat-shard-val');
    const goldEl = overlay.querySelector('#inv-mat-gold-val');
    const termaEl = overlay.querySelector('#inv-mat-terma-val');
    if (shardEl) shardEl.textContent = String(mats.turquoiseShard || 0);
    if (goldEl) goldEl.textContent = String(mats.goldDust || 0);
    if (termaEl) termaEl.textContent = String(mats.termaEssence || 0);

    tabBagBtn.classList.toggle('is-active', activeTab === 'bag');
    tabCharBtn.classList.toggle('is-active', activeTab === 'char');
    bagPane.classList.toggle('is-active', activeTab === 'bag');
    charPane.classList.toggle('is-active', activeTab === 'char');

    renderEquipmentSlots();
    renderBagGrid();
    renderTooltip();
    renderCharacterStats();
  }

  // ---------------------------------------------------------------- Context Menu & Action Handlers
  function openContextMenu(clientX, clientY, mode) {
    ctxEquipBtn.style.display = mode === 'bag' ? '' : 'none';
    ctxUnequipBtn.style.display = mode === 'equipped' ? '' : 'none';
    if (ctxOfferBtn) ctxOfferBtn.style.display = mode === 'bag' ? '' : 'none';
    if (ctxSalvageBtn) ctxSalvageBtn.style.display = mode === 'bag' ? '' : 'none';
    ctxMenuEl.classList.remove('is-hidden');
    const rect = overlay.querySelector('.inv-dialog').getBoundingClientRect();
    const x = Math.min(rect.width - 140, Math.max(8, clientX - rect.left));
    const y = Math.min(rect.height - 180, Math.max(8, clientY - rect.top));
    ctxMenuEl.style.left = `${x}px`;
    ctxMenuEl.style.top = `${y}px`;
  }

  function handleEquipSelected() {
    hideContextMenu();
    if (selectedSource?.type === 'bag' && selectedSource.uid) {
      const slot = selectedSource.slot;
      const uid = selectedSource.uid;
      if (ctx.inventory?.equip(uid)) {
        selectedSource = { type: 'equipped', slot, uid };
        renderAll();
      }
    }
  }

  function handleUnequipSelected() {
    hideContextMenu();
    if (selectedSource?.type === 'equipped' && selectedSource.slot) {
      if (ctx.inventory?.unequip(selectedSource.slot)) {
        selectedSource = null;
        renderAll();
      }
    }
  }

  function handleOfferSelected() {
    hideContextMenu();
    if (selectedSource?.type !== 'bag' || !selectedSource.uid) return;
    const item = resolveSelectedItem();
    if (!item) return;
    if (ctx.shop?.sell) {
      if (ctx.shop.sell(item.uid)) {
        selectedSource = null;
        renderAll();
      }
    } else if (ctx.inventory?.discard(item.uid)) {
      ctx.inventory?.addTurquoise?.(Math.max(1, Number(item.sellValue) || 1));
      selectedSource = null;
      renderAll();
    }
  }

  function handleSalvageSelected() {
    hideContextMenu();
    if (selectedSource?.type !== 'bag' || !selectedSource.uid) return;
    const item = resolveSelectedItem();
    if (!item) return;
    if (ctx.crafting?.salvage) {
      if (ctx.crafting.salvage(item.uid)) {
        selectedSource = null;
        renderAll();
      }
    }
  }

  function handleDiscardSelected() {
    hideContextMenu();
    const item = resolveSelectedItem();
    if (!item) return;
    if (ctx.inventory?.discard(item.uid)) {
      selectedSource = null;
      renderAll();
    }
  }

  function handleCancelSelected() {
    hideContextMenu();
    selectedSource = null;
    renderAll();
  }

  btnEquip.addEventListener('click', handleEquipSelected);
  btnUnequip.addEventListener('click', handleUnequipSelected);
  if (btnOffer) btnOffer.addEventListener('click', handleOfferSelected);
  if (btnSalvage) btnSalvage.addEventListener('click', handleSalvageSelected);
  btnDiscard.addEventListener('click', handleDiscardSelected);
  if (btnCancel) btnCancel.addEventListener('click', handleCancelSelected);
  ctxEquipBtn.addEventListener('click', handleEquipSelected);
  ctxUnequipBtn.addEventListener('click', handleUnequipSelected);
  if (ctxOfferBtn) ctxOfferBtn.addEventListener('click', handleOfferSelected);
  if (ctxSalvageBtn) ctxSalvageBtn.addEventListener('click', handleSalvageSelected);
  ctxDiscardBtn.addEventListener('click', handleDiscardSelected);
  if (ctxCancelBtn) ctxCancelBtn.addEventListener('click', handleCancelSelected);

  tabBagBtn.addEventListener('click', () => {
    activeTab = 'bag';
    renderAll();
  });
  tabCharBtn.addEventListener('click', () => {
    activeTab = 'char';
    renderAll();
  });
  closeBtn.addEventListener('click', () => close());
  overlay.addEventListener('click', (e) => {
    hideContextMenu();
    if (e.target === overlay) close();
  });

  // ---------------------------------------------------------------- Open / Close / Toggle
  function open(tab = 'bag') {
    isOpen = true;
    activeTab = tab === 'char' ? 'char' : 'bag';
    state.uiOpen = true;
    overlay.classList.remove('is-hidden');
    renderAll();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    hideContextMenu();
    state.uiOpen = false;
    overlay.classList.add('is-hidden');
  }

  function toggle(tab = 'bag') {
    if (!isOpen) {
      open(tab);
    } else if (activeTab !== tab) {
      activeTab = tab;
      renderAll();
    } else {
      close();
    }
    return isOpen;
  }

  bus.on('inventory:changed', () => {
    if (isOpen) renderAll();
  });
  bus.on('equipment:changed', () => {
    if (isOpen) renderAll();
  });
  bus.on('vitals:changed', () => {
    if (isOpen) renderCharacterStats();
  });
  bus.on('currency:changed', () => {
    if (isOpen) renderAll();
  });
  i18n.onChange(() => {
    if (isOpen) renderAll();
  });

  function update() {
    if (state.mode !== 'play') return;
    const input = ctx.input;
    if (!input) return;

    if (input.pressed('inventory')) {
      toggle('bag');
    } else if (input.pressed('character')) {
      toggle('char');
    } else if (isOpen && input.pressed('closeUi')) {
      close();
    }
  }

  const api = {
    update,
    open,
    close,
    toggle,
    isOpen: () => isOpen,
    select: (uidOrSlot) => {
      if (!ctx.inventory) return null;
      const inBag = ctx.inventory.getBag().find((i) => i.uid === uidOrSlot);
      if (inBag) {
        selectedSource = { type: 'bag', uid: inBag.uid, slot: inBag.slot };
        renderAll();
        return inBag;
      }
      const eq = ctx.inventory.getEquipped();
      if (eq[uidOrSlot]) {
        selectedSource = {
          type: 'equipped',
          slot: uidOrSlot,
          uid: eq[uidOrSlot].uid,
        };
        renderAll();
        return eq[uidOrSlot];
      }
      return null;
    },
  };

  ctx.inventoryUi = api;
  ctx.debug?.register('inventoryUi', api);

  return api;
}
