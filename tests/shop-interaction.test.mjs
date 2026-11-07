import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { i18n } from '../src/i18n.js';
import '../src/i18n/prologue.js';
import { createInventory } from '../src/systems/inventory.js';
import { createShop } from '../src/ui/shop.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createBus() {
  const map = new Map();
  return {
    on(event, fn) {
      if (!map.has(event)) map.set(event, []);
      map.get(event).push(fn);
    },
    emit(event, payload) {
      for (const fn of map.get(event) || []) {
        fn(payload);
      }
    },
  };
}

class MockClassList {
  constructor(el) {
    this.el = el;
  }
  _set() {
    return new Set(
      String(this.el.className || '')
        .split(/\s+/)
        .filter(Boolean)
    );
  }
  _sync(set) {
    this.el.className = [...set].join(' ');
  }
  add(...tokens) {
    const set = this._set();
    for (const t of tokens) if (t) set.add(t);
    this._sync(set);
  }
  remove(...tokens) {
    const set = this._set();
    for (const t of tokens) set.delete(t);
    this._sync(set);
  }
  toggle(token, force) {
    const set = this._set();
    const shouldAdd = force !== undefined ? Boolean(force) : !set.has(token);
    if (shouldAdd) set.add(token);
    else set.delete(token);
    this._sync(set);
    return shouldAdd;
  }
  contains(token) {
    return this._set().has(token);
  }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = String(tagName).toUpperCase();
    this.id = '';
    this.className = '';
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.textContent = '';
    this._innerHTML = '';
    this.tabIndex = -1;
    this.disabled = false;
    this.classList = new MockClassList(this);
  }

  setAttribute(name, value) {
    const str = String(value);
    this.attributes.set(name, str);
    if (name === 'id') this.id = str;
    if (name === 'class') this.className = str;
  }

  getAttribute(name) {
    if (name === 'id') return this.id || null;
    if (name === 'class') return this.className || null;
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(html) {
    this._innerHTML = String(html || '');
    this.children = [];
    const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>/g;
    let match;
    while ((match = tagRegex.exec(this._innerHTML)) !== null) {
      const [, tag, attrChunk] = match;
      if (tag.startsWith('/')) continue;
      const child = new MockElement(tag);
      const attrRegex = /([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrChunk)) !== null) {
        const [, attrName, attrVal] = attrMatch;
        if (!attrName) continue;
        if (attrVal !== undefined) {
          child.setAttribute(attrName, attrVal);
        } else if (attrName === 'disabled') {
          child.disabled = true;
          child.setAttribute('disabled', '');
        }
      }
      this.children.push(child);
    }
  }

  _allDescendants() {
    const out = [];
    for (const child of this.children) {
      out.push(child);
      out.push(...child._allDescendants());
    }
    return out;
  }

  _matches(selector) {
    if (selector.startsWith('#')) {
      return this.id === selector.slice(1);
    }
    if (selector.startsWith('.')) {
      return this.classList.contains(selector.slice(1));
    }
    if (selector === '[data-i18n]') {
      return this.attributes.has('data-i18n');
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelector(selector) {
    return this._allDescendants().find((el) => el._matches(selector)) || null;
  }

  querySelectorAll(selector) {
    return this._allDescendants().filter((el) => el._matches(selector));
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(handler);
  }

  dispatchEvent(event) {
    const evt = {
      target: this,
      stopPropagation() {
        this._stopped = true;
      },
      preventDefault() {
        this._defaultPrevented = true;
      },
      ...event,
    };
    const handlers = this.listeners.get(evt.type) || [];
    for (const fn of handlers) {
      fn(evt);
    }
    return !evt._defaultPrevented;
  }

  click() {
    if (this.disabled) return;
    this.dispatchEvent({ type: 'click', target: this });
  }
}

function installMockDom() {
  const uiRoot = new MockElement('div');
  uiRoot.id = 'ui';
  const body = new MockElement('body');
  body.appendChild(uiRoot);

  globalThis.document = {
    body,
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          width: 64,
          height: 64,
          getContext: () => null,
          toDataURL: () => 'data:image/png;base64,mock',
        };
      }
      return new MockElement(tag);
    },
    getElementById(id) {
      if (id === 'ui') return uiRoot;
      return body.querySelector(`#${id}`);
    },
  };

  return { uiRoot, body };
}

test('style.css enables pointer-events on .shop-modal and .crafting-modal above #ui', () => {
  const cssPath = path.resolve(__dirname, '../src/style.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  const modalRuleMatch = css.match(
    /\.shop-modal,\s*\.crafting-modal\s*\{([^}]*)\}/m
  );
  assert.ok(modalRuleMatch, '.shop-modal, .crafting-modal rule must exist');
  assert.match(modalRuleMatch[1], /pointer-events:\s*auto\s*;/);
  assert.match(modalRuleMatch[1], /z-index:\s*660\s*;/);

  const hiddenRuleMatch = css.match(
    /\.shop-modal\.is-hidden,\s*\.crafting-modal\.is-hidden\s*\{([^}]*)\}/m
  );
  assert.ok(hiddenRuleMatch, '.shop-modal.is-hidden rule must exist');
  assert.match(hiddenRuleMatch[1], /pointer-events:\s*none\s*!important\s*;/);

  const dialogRuleMatch = css.match(
    /\.shop-dialog,\s*\.crafting-dialog\s*\{([^}]*)\}/m
  );
  assert.ok(dialogRuleMatch, '.shop-dialog, .crafting-dialog rule must exist');
  assert.match(dialogRuleMatch[1], /pointer-events:\s*auto\s*;/);
});

test('Norbu shop supports inspecting, buying, insufficient/bag-full feedback, refreshing, selling, keyboard selection, and Esc close/reopen', () => {
  const { uiRoot } = installMockDom();
  const bus = createBus();
  const toasts = [];
  bus.on('toast', (payload) => toasts.push(payload));

  let closeUiPressed = false;
  let uidCounter = 1;
  const ctx = {
    bus,
    i18n,
    state: {
      uiOpen: false,
      player: { level: 3 },
    },
    input: {
      pressed: (action) => action === 'closeUi' && closeUiPressed,
    },
    loot: {
      generate({ ilvl = 1, rarity = 'normal', slot = 'mainhand' } = {}) {
        const id = uidCounter++;
        return {
          uid: `shop_test_item_${id}`,
          baseId: `test_${slot}`,
          name: `法器_${slot}_${id}`,
          slot,
          rarity,
          ilvl,
          sellValue: 5 + (id % 4),
          implicit: { stat: 'atk', value: 4 },
          affixes: rarity === 'blessed' ? [{ stat: 'hp', value: 12 }] : [],
        };
      },
    },
  };

  createInventory(ctx);
  const shop = createShop(ctx);

  const modal = uiRoot.querySelector('#shop-modal');
  assert.ok(modal, '#shop-modal should be mounted inside #ui');
  assert.equal(modal.classList.contains('is-hidden'), true);

  // 1. Open shop
  shop.open();
  assert.equal(shop.isOpen(), true);
  assert.equal(ctx.state.uiOpen, true);
  assert.equal(modal.classList.contains('is-hidden'), false);

  const stockListEl = modal.querySelector('#shop-stock-list');
  const inspectorEl = modal.querySelector('#shop-inspector');
  const refreshBtn = modal.querySelector('#shop-btn-refresh');
  const sellCommonBtn = modal.querySelector('#shop-btn-sell-common');
  const closeBtn = modal.querySelector('#shop-btn-close');

  assert.equal(stockListEl.children.length, 8);
  const initialStock = shop.getStock();
  assert.equal(initialStock.length, 8);

  // 2. Click second item row to select & inspect it
  const secondRow = stockListEl.children[1];
  const secondItem = initialStock[1];
  secondRow.click();
  assert.equal(stockListEl.children[1].classList.contains('is-selected'), true);
  assert.ok(
    inspectorEl.innerHTML.includes(secondItem.name),
    'Inspector should display the clicked item name'
  );

  // 3. Keyboard navigation (Enter / Space) on third item row selects & inspects it
  const thirdRow = stockListEl.children[2];
  const thirdItem = initialStock[2];
  assert.equal(thirdRow.tabIndex, 0);
  assert.equal(thirdRow.getAttribute('role'), 'button');
  thirdRow.dispatchEvent({
    type: 'keydown',
    key: 'Enter',
    target: thirdRow,
  });
  assert.equal(stockListEl.children[2].classList.contains('is-selected'), true);
  assert.ok(
    inspectorEl.innerHTML.includes(thirdItem.name),
    'Inspector should display the keyboard-selected item name'
  );

  // 4. Attempting to click Buy when Turquoise is 0 shows explicit warning toast
  toasts.length = 0;
  const firstRowBuyBtn = stockListEl.children[0].querySelector(
    '.shop-action-btn--buy'
  );
  assert.equal(firstRowBuyBtn.classList.contains('is-disabled'), true);
  firstRowBuyBtn.click();
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].kind, 'warning');
  assert.equal(stockListEl.children.length, 8);

  // 5. Grant enough Turquoise and click Buy on the first item
  const firstItem = initialStock[0];
  const buyCost = firstItem.buyPrice;
  ctx.inventory.addTurquoise(buyCost + 50);
  toasts.length = 0;

  const updatedFirstBuyBtn = stockListEl.children[0].querySelector(
    '.shop-action-btn--buy'
  );
  assert.equal(updatedFirstBuyBtn.classList.contains('is-disabled'), false);
  updatedFirstBuyBtn.click();

  assert.equal(shop.getStock().length, 7);
  assert.equal(ctx.inventory.getTurquoise(), 50);
  assert.equal(ctx.inventory.getBag().length, 1);
  assert.equal(ctx.inventory.getBag()[0].uid, firstItem.uid);
  assert.ok(toasts.some((t) => t.kind === 'Reward'));

  // 6. Attempting to buy when bag is full shows explicit bagFull toast
  while (ctx.inventory.getBag().length < 30) {
    ctx.inventory.add(
      ctx.loot.generate({ ilvl: 1, rarity: 'blessed', slot: 'ring' })
    );
  }
  ctx.inventory.addTurquoise(500);
  toasts.length = 0;
  const fullBagBuyBtn = stockListEl.children[0].querySelector(
    '.shop-action-btn--buy'
  );
  assert.equal(fullBagBuyBtn.classList.contains('is-disabled'), true);
  fullBagBuyBtn.click();
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].kind, 'warning');
  assert.equal(toasts[0].text, i18n.t('shop.toast.bagFull'));

  // 7. Refresh button updates stock back to 8 items and shows refresh toast
  toasts.length = 0;
  refreshBtn.click();
  assert.equal(shop.getStock().length, 8);
  assert.equal(stockListEl.children.length, 8);
  assert.ok(
    toasts.some((t) => t.text === i18n.t('shop.toast.refreshed')),
    'Refresh button should emit refreshed toast'
  );

  // 8. Selling an item from the bag list works via click
  const bagListEl = modal.querySelector('#shop-bag-list');
  const bagCountBeforeSell = ctx.inventory.getBag().length;
  const tqBeforeSell = ctx.inventory.getTurquoise();
  const firstBagSellBtn = bagListEl.children[0].querySelector(
    '.shop-action-btn--sell'
  );
  firstBagSellBtn.click();
  assert.equal(ctx.inventory.getBag().length, bagCountBeforeSell - 1);
  assert.ok(ctx.inventory.getTurquoise() > tqBeforeSell);

  // 9. Clicking "Sell All Common" when no common items remain shows info toast
  for (const item of [...ctx.inventory.getBag()]) {
    if (item.rarity === 'normal' || item.rarity === 'common') {
      ctx.inventory.remove(item.uid);
    }
  }
  toasts.length = 0;
  sellCommonBtn.click();
  assert.ok(
    toasts.some((t) => t.text === i18n.t('shop.toast.noCommonToSell')),
    'Sell All Common should emit noCommonToSell toast when no commons in bag'
  );

  // 10. Close via Esc (closeUi) and reopen via close button / open()
  closeUiPressed = true;
  shop.update(0.016);
  closeUiPressed = false;
  assert.equal(shop.isOpen(), false);
  assert.equal(ctx.state.uiOpen, false);
  assert.equal(modal.classList.contains('is-hidden'), true);

  shop.open();
  assert.equal(shop.isOpen(), true);
  closeBtn.click();
  assert.equal(shop.isOpen(), false);
});
