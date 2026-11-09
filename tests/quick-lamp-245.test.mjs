import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { i18n } from '../src/i18n.js';
import { createLamps } from '../src/gameplay/lamps.js';
import { createLampOfferingUi } from '../src/ui/lampOffering.js';
import { createInteraction } from '../src/systems/interaction.js';

function installDomStub() {
  const elementsById = new Map();

  function make2dContext() {
    return {
      createRadialGradient() {
        return { addColorStop() {} };
      },
      createLinearGradient() {
        return { addColorStop() {} };
      },
      fillRect() {},
      clearRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      quadraticCurveTo() {},
      closePath() {},
      fill() {},
      stroke() {},
      fillText() {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textBaseline: 'top',
    };
  }

  function makeElement(tag = 'div') {
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      value: '',
      placeholder: '',
      title: '',
      _innerHTML: '',
      children: [],
      attributes: new Map(),
      listeners: new Map(),
      width: 64,
      height: 64,
      firstChild: null,
      classList: {
        classes: new Set(),
        add(...tokens) {
          for (const t of tokens) if (t) this.classes.add(t);
        },
        remove(...tokens) {
          for (const t of tokens) this.classes.delete(t);
        },
        toggle(token, force) {
          const shouldAdd = force === undefined ? !this.classes.has(token) : Boolean(force);
          if (shouldAdd) this.classes.add(token);
          else this.classes.delete(token);
          return shouldAdd;
        },
        contains(token) {
          return this.classes.has(token);
        },
      },
      setAttribute(k, v) {
        this.attributes.set(k, String(v));
      },
      getAttribute(k) {
        return this.attributes.get(k) ?? null;
      },
      addEventListener(type, fn) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(fn);
      },
      appendChild(child) {
        this.children.push(child);
        if (!this.firstChild) this.firstChild = child;
        if (child.id) elementsById.set(child.id, child);
        return child;
      },
      insertBefore(child) {
        this.children.unshift(child);
        this.firstChild = child;
        if (child.id) elementsById.set(child.id, child);
        return child;
      },
      focus() {},
      select() {},
      querySelector(sel) {
        if (sel.startsWith('#')) {
          const id = sel.slice(1);
          if (!elementsById.has(id)) {
            const sub = makeElement('div');
            sub.id = id;
            elementsById.set(id, sub);
          }
          return elementsById.get(id);
        }
        return makeElement('div');
      },
      querySelectorAll(sel) {
        if (sel === '[data-lamp-tab]') {
          return ['offer', 'wall', 'share'].map((tab) => {
            const btn = makeElement('button');
            btn.setAttribute('data-lamp-tab', tab);
            return btn;
          });
        }
        return [];
      },
      getContext(type) {
        if (type === '2d') return make2dContext();
        return null;
      },
    };
    Object.defineProperty(el, 'innerHTML', {
      get() {
        return this._innerHTML;
      },
      set(val) {
        this._innerHTML = String(val);
      },
    });
    return el;
  }

  const head = makeElement('head');
  const body = makeElement('body');
  const uiRoot = makeElement('div');
  uiRoot.id = 'ui';
  elementsById.set('ui', uiRoot);

  globalThis.document = {
    head,
    body,
    activeElement: null,
    documentElement: { lang: 'zh-Hant' },
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    querySelector(sel) {
      if (sel === '.utility-bar') return makeElement('div');
      if (sel.startsWith('#')) return elementsById.get(sel.slice(1)) || null;
      return null;
    },
    createElement(tag) {
      return makeElement(tag);
    },
  };

  globalThis.window = {
    addEventListener() {},
  };

  return { elementsById };
}

function createBus() {
  const handlers = new Map();
  return {
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(fn);
      return () => {
        const list = handlers.get(event) || [];
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      };
    },
    emit(event, payload) {
      for (const fn of handlers.get(event) || []) {
        fn(payload);
      }
    },
  };
}

function createFixture() {
  installDomStub();
  const bus = createBus();
  const scene = new THREE.Scene();
  const communityOfferings = [];
  const restoredVitals = [];
  const state = {
    mode: 'play',
    zone: 'stupa',
    elapsed: 10,
    uiOpen: false,
    wind: { dir: new THREE.Vector2(1, 0), strength: 0.3 },
    time: { nightFactor: 0.5 },
    player: {
      position: new THREE.Vector3(0, 0, 0),
      heading: 0,
      mp: 40,
      maxMp: 100,
    },
  };

  bus.on('vitals:restore', (payload) => {
    restoredVitals.push(payload);
    if (typeof payload?.mp === 'number') {
      state.player.mp = Math.min(state.player.maxMp, state.player.mp + payload.mp);
    }
  });

  const pressedKeys = new Set();
  const ctx = {
    THREE,
    scene,
    state,
    config: CONFIG,
    bus,
    i18n,
    colliders: [],
    interactables: [],
    input: {
      pressed: (action) => pressedKeys.has(action),
    },
    community: {
      getLamps: () => communityOfferings,
      offerLamp: (entry) => {
        communityOfferings.push(entry);
        return entry;
      },
      getDefaultName: () => 'Pilgrim',
      exportShareCode: () => 'STUPA-V1:TEST',
    },
  };

  const lampOfferingUi = createLampOfferingUi(ctx);
  const lamps = createLamps(ctx);
  const interaction = createInteraction(ctx);

  return {
    ctx,
    bus,
    state,
    lamps,
    lampOfferingUi,
    interaction,
    pressedKeys,
    communityOfferings,
    restoredVitals,
  };
}

test('Quick lamp lighting ([F] / [R] in Stupa) lights a 3D butter lamp and restores +15 MP without opening #lamp-offering-modal or adding to prayer roster', () => {
  const { state, lamps, lampOfferingUi, interaction, pressedKeys, communityOfferings, restoredVitals } =
    createFixture();

  const station = lamps.stations[0];
  assert.ok(station, 'Expected lamp station 0 to exist');

  // Position player right next to station 0
  state.player.position.set(station.worldPos.x, 0, station.worldPos.z + 0.8);

  const beforeLit = station.countLit();
  const beforeMp = state.player.mp;
  const nextUnlit = station.findNextUnlit();
  assert.ok(nextUnlit, 'Expected an unlit lamp bowl on station 0');
  assert.equal(nextUnlit.lit, false);
  assert.equal(nextUnlit.flame.visible, false);
  assert.equal(nextUnlit.glow.visible, false);

  // Press [F] ('feed') near the lamp station
  pressedKeys.add('feed');
  interaction.update();
  pressedKeys.clear();

  assert.equal(station.countLit(), beforeLit + 1, 'Expected 3D station lit lamp count to increase by 1');
  assert.equal(nextUnlit.lit, true, 'Expected the 3D lamp bowl to be lit');
  assert.equal(nextUnlit.flame.visible, true, 'Expected 3D flame mesh to be visible');
  assert.equal(nextUnlit.glow.visible, true, 'Expected 3D glow sprite to be visible');
  assert.equal(state.player.mp, beforeMp + 15, 'Expected +15 MP restored');
  assert.equal(restoredVitals.length, 1);
  assert.equal(restoredVitals[0].mp, 15);
  assert.equal(restoredVitals[0].source, 'lampQuick');

  // Crucial assertions for Issue #245 / #277:
  assert.equal(lampOfferingUi.isOpen(), false, 'Quick lamp lighting must NOT open lampOfferingUi modal');
  assert.equal(state.uiOpen, false, 'Quick lamp lighting must keep state.uiOpen === false');
  assert.equal(communityOfferings.length, 0, 'Quick lamp lighting must NOT record anything in community prayer roster');

  // Press [R] ('chant') near the lamp station in Stupa hub -> should also trigger quick lamp lighting without modal
  const secondUnlit = station.findNextUnlit();
  assert.ok(secondUnlit, 'Expected another unlit lamp bowl on station 0');
  pressedKeys.add('chant');
  interaction.update();
  pressedKeys.clear();

  assert.equal(station.countLit(), beforeLit + 2, 'Expected [R] in Stupa near lamp station to light next 3D bowl');
  assert.equal(secondUnlit.lit, true);
  assert.equal(secondUnlit.flame.visible, true);
  assert.equal(state.player.mp, beforeMp + 30, 'Expected another +15 MP restored');
  assert.equal(lampOfferingUi.isOpen(), false, 'Pressing [R] near lamp station must NOT open lampOfferingUi modal');
  assert.equal(state.uiOpen, false);
  assert.equal(communityOfferings.length, 0);
});

test('Primary [E] lamp interaction still lights a lamp and opens the Prayer Dedication modal', () => {
  const { state, lamps, lampOfferingUi, interaction, pressedKeys } = createFixture();
  const station = lamps.stations[0];
  state.player.position.set(station.worldPos.x, 0, station.worldPos.z + 0.8);

  const beforeLit = station.countLit();
  pressedKeys.add('interact');
  interaction.update();
  pressedKeys.clear();

  assert.equal(station.countLit(), beforeLit + 1, 'Expected [E] to light a lamp bowl');
  assert.equal(lampOfferingUi.isOpen(), true, 'Expected [E] to open the Prayer Dedication modal');
  assert.equal(state.uiOpen, true);
});
