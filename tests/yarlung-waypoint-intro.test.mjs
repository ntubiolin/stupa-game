import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { MAPS } from '../src/data/maps.js';
import { YARLUNG_MAP } from '../src/data/maps/yarlung.js';
import {
  createWaypoints,
  resolveWaypointCoords,
  resolveWaypointLandingPos,
} from '../src/gameplay/waypoints.js';
import { createInput } from '../src/core/input.js';
import { createQuestUi } from '../src/ui/quests.js';
import { i18n } from '../src/i18n.js';

function createEventBus() {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
      return () => {
        const arr = listeners.get(event);
        if (!arr) return;
        const idx = arr.indexOf(fn);
        if (idx >= 0) arr.splice(idx, 1);
      };
    },
    emit(event, payload) {
      const arr = listeners.get(event);
      if (!arr) return;
      for (const fn of [...arr]) fn(payload);
    },
  };
}

function createDomEnv() {
  let activeElement = null;

  function makeClassList(initial = '') {
    const set = new Set(String(initial || '').split(/\s+/).filter(Boolean));
    return {
      add(...tokens) {
        for (const t of tokens) if (t) set.add(t);
      },
      remove(...tokens) {
        for (const t of tokens) set.delete(t);
      },
      toggle(token, force) {
        const next = force !== undefined ? Boolean(force) : !set.has(token);
        if (next) set.add(token);
        else set.delete(token);
        return next;
      },
      contains(token) {
        return set.has(token);
      },
    };
  }

  function makeElement(tagName = 'DIV', attrs = {}) {
    const listeners = new Map();
    const children = [];
    const attrMap = new Map(Object.entries(attrs));
    let html = '';

    const el = {
      tagName: String(tagName).toUpperCase(),
      id: attrs.id || '',
      className: attrs.class || '',
      classList: makeClassList(attrs.class || ''),
      style: {},
      dataset: {},
      textContent: '',
      children,
      parentNode: null,
      isConnected: true,
      offsetParent: null,
      width: Number(attrs.width) || 300,
      height: Number(attrs.height) || 150,
      get innerHTML() {
        return html;
      },
      set innerHTML(val) {
        html = String(val || '');
        children.length = 0;
        const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>/g;
        let match;
        while ((match = tagRegex.exec(html)) !== null) {
          const tag = match[1];
          if (tag.startsWith('/')) continue;
          const rawAttrs = match[2] || '';
          const parsedAttrs = {};
          const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
          let am;
          while ((am = attrRegex.exec(rawAttrs)) !== null) {
            parsedAttrs[am[1]] = am[2];
          }
          const child = makeElement(tag, parsedAttrs);
          child.parentNode = el;
          children.push(child);
        }
      },
      appendChild(child) {
        child.parentNode = el;
        children.push(child);
        return child;
      },
      getAttribute(name) {
        if (name === 'id') return el.id || null;
        if (name === 'class') return el.className || null;
        return attrMap.has(name) ? attrMap.get(name) : null;
      },
      setAttribute(name, val) {
        attrMap.set(name, String(val));
        if (name === 'id') el.id = String(val);
        if (name === 'class') {
          el.className = String(val);
          el.classList = makeClassList(String(val));
        }
      },
      matches(selector) {
        if (!selector) return false;
        const parts = selector.split(',').map((s) => s.trim());
        for (const part of parts) {
          if (part.startsWith('#') && el.id === part.slice(1)) return true;
          if (part.startsWith('.') && el.classList.contains(part.slice(1))) return true;
          const attrMatch = part.match(/^\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]$/);
          if (attrMatch) {
            const [, k, v] = attrMatch;
            if (v !== undefined ? el.getAttribute(k) === v : el.getAttribute(k) !== null) {
              return true;
            }
          }
          if (el.tagName.toLowerCase() === part.toLowerCase()) return true;
        }
        return false;
      },
      closest(selector) {
        let cur = el;
        while (cur) {
          if (cur.matches?.(selector)) return cur;
          cur = cur.parentNode;
        }
        return null;
      },
      querySelector(selector) {
        return el.querySelectorAll(selector)[0] || null;
      },
      querySelectorAll(selector) {
        const out = [];
        for (const ch of children) {
          if (ch.matches(selector)) out.push(ch);
          out.push(...ch.querySelectorAll(selector));
        }
        return out;
      },
      addEventListener(type, fn, opts) {
        const capture = typeof opts === 'boolean' ? opts : Boolean(opts?.capture);
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push({ fn, capture });
      },
      dispatchEvent(evt) {
        const list = listeners.get(evt.type) || [];
        for (const entry of [...list]) {
          if (evt._immediateStopped) break;
          entry.fn(evt);
        }
      },
      click() {
        const evt = createDomEvent('click', { target: el });
        el.dispatchEvent(evt);
      },
      focus() {
        activeElement = el;
      },
      blur() {
        if (activeElement === el) activeElement = null;
      },
      getContext() {
        return null;
      },
    };
    return el;
  }

  function createDomEvent(type, props = {}) {
    const evt = {
      type,
      defaultPrevented: false,
      _stopped: false,
      _immediateStopped: false,
      target: props.target || activeElement || body,
      ...props,
      preventDefault() {
        evt.defaultPrevented = true;
      },
      stopPropagation() {
        evt._stopped = true;
      },
      stopImmediatePropagation() {
        evt._stopped = true;
        evt._immediateStopped = true;
      },
    };
    return evt;
  }

  const body = makeElement('BODY', { id: 'body' });
  const uiRoot = makeElement('DIV', { id: 'ui' });
  const canvas = makeElement('CANVAS', { id: 'game-canvas' });
  body.appendChild(uiRoot);
  body.appendChild(canvas);

  const winListeners = new Map();
  const docListeners = new Map();

  const windowMock = {
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener(type, fn, opts) {
      const capture = typeof opts === 'boolean' ? opts : Boolean(opts?.capture);
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push({ fn, capture });
    },
    dispatchEvent(evt) {
      const list = winListeners.get(evt.type) || [];
      const captureList = list.filter((e) => e.capture);
      const bubbleList = list.filter((e) => !e.capture);
      for (const entry of captureList) {
        if (evt._immediateStopped) return;
        entry.fn(evt);
      }
      if (evt._stopped) return;
      for (const entry of bubbleList) {
        if (evt._immediateStopped) return;
        entry.fn(evt);
      }
    },
  };

  const documentMock = {
    body,
    hidden: false,
    get activeElement() {
      return activeElement || body;
    },
    createElement(tag) {
      return makeElement(tag);
    },
    getElementById(id) {
      if (id === 'ui') return uiRoot;
      return body.querySelector(`#${id}`);
    },
    querySelector(sel) {
      return body.querySelector(sel);
    },
    querySelectorAll(sel) {
      return body.querySelectorAll(sel);
    },
    addEventListener(type, fn, opts) {
      const capture = typeof opts === 'boolean' ? opts : Boolean(opts?.capture);
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push({ fn, capture });
    },
  };

  return { windowMock, documentMock, uiRoot, canvas, createDomEvent };
}

test('waypoints.teleportTo("yarlung") lands clear of the south return gate and within waypoint radius', async () => {
  const bus = createEventBus();
  const state = {
    mode: 'play',
    zone: 'stupa',
    uiOpen: false,
    player: {
      position: new THREE.Vector3(10, 0, -24),
      heading: 0,
    },
  };

  const ctx = {
    state,
    bus,
    i18n,
    scene: new THREE.Group(),
    zoneGroups: {},
    colliders: [],
    interactables: [],
    world: {
      getHeight: () => 0,
      isHub: (z) => z === 'stupa',
    },
    zones: {
      teleport(mapId, opts = {}) {
        const target = MAPS[mapId];
        state.zone = mapId;
        const sp = target.spawns?.[opts.spawn] || target.spawns?.default || target.origin;
        state.player.position.set(sp.x, 0, sp.z);
        state.player.heading = sp.heading ?? 0;
        bus.emit('zone:change', { from: 'stupa', to: mapId });
        return Promise.resolve(true);
      },
    },
  };

  const waypoints = createWaypoints(ctx);
  waypoints.unlock('yarlung', { silent: true });

  const ok = await waypoints.teleportTo('yarlung');
  assert.equal(ok, true);
  assert.equal(state.zone, 'yarlung');

  const wpCoords = resolveWaypointCoords(YARLUNG_MAP);
  const southGate = YARLUNG_MAP.gates.find((g) => g.id === 'south');
  assert.ok(wpCoords);
  assert.ok(southGate);

  const distToWaypoint = Math.hypot(
    state.player.position.x - wpCoords.x,
    state.player.position.z - wpCoords.z
  );
  const distToSouthGate = Math.hypot(
    state.player.position.x - southGate.x,
    state.player.position.z - southGate.z
  );

  assert.ok(
    distToWaypoint <= 3.5,
    `Expected Yarlung landing within 3.5m of waypoint, got ${distToWaypoint}m`
  );
  assert.ok(
    distToSouthGate > (southGate.radius || 3.5) + 1.5,
    `Expected Yarlung landing > 5.0m from south return gate, got ${distToSouthGate}m`
  );
  assert.equal(YARLUNG_MAP.spawns.waypoint.z, 82);
  assert.equal(YARLUNG_MAP.spawns.south.z, 82);
});

test('all chapter waypoints land outside their map gates interaction radii', async () => {
  const chapterMapIds = ['pharping', 'mangyul', 'yarlung', 'samye', 'chimphu', 'grove', 'wild'];

  for (const mapId of chapterMapIds) {
    const mapDef = MAPS[mapId];
    assert.ok(mapDef, `Missing map definition for ${mapId}`);
    const coords = resolveWaypointCoords(mapDef);
    assert.ok(coords, `Missing waypoint coords for ${mapId}`);

    const landing = resolveWaypointLandingPos(mapDef, coords);
    const distToWp = Math.hypot(landing.x - coords.x, landing.z - coords.z);
    assert.ok(
      distToWp <= 3.5,
      `${mapId}: landing (${landing.x}, ${landing.z}) exceeds 3.5m from waypoint (${coords.x}, ${coords.z})`
    );

    for (const gate of mapDef.gates || []) {
      const gx = gate.x ?? gate.pos?.x ?? gate.from?.x;
      const gz = gate.z ?? gate.pos?.z ?? gate.from?.z;
      const gr = gate.radius ?? gate.r ?? gate.from?.r ?? 3.5;
      if (!Number.isFinite(gx) || !Number.isFinite(gz)) continue;
      const distToGate = Math.hypot(landing.x - gx, landing.z - gz);
      assert.ok(
        distToGate > gr + 1.5,
        `${mapId}: landing (${landing.x}, ${landing.z}) is too close (${distToGate}m) to gate (${gx}, ${gz}, r=${gr})`
      );
    }
  }
});

test('Chapter 3 intro mural sets state.uiOpen, blocks Enter from leaking to interact/return gate, and keeps player in yarlung', async () => {
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCaf = globalThis.cancelAnimationFrame;

  const { windowMock, documentMock, uiRoot, canvas, createDomEvent } = createDomEnv();
  globalThis.window = windowMock;
  globalThis.document = documentMock;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};

  try {
    const bus = createEventBus();
    const flags = {};
    const state = {
      mode: 'play',
      zone: 'stupa',
      uiOpen: false,
      player: {
        position: new THREE.Vector3(10, 0, -24),
        heading: 0,
      },
    };

    const ctx = {
      state,
      bus,
      i18n,
      renderer: { domElement: canvas },
      camera: new THREE.PerspectiveCamera(),
      scene: new THREE.Group(),
      zoneGroups: {},
      colliders: [],
      interactables: [],
      quests: {
        getActiveQuestsDetailed: () => [],
        getCompletedQuestsDetailed: () => [],
        getTrackedTargets: () => [],
        setFlag: (k, v) => {
          flags[k] = v;
        },
        hasFlag: (k) => Boolean(flags[k]),
      },
      world: {
        getMap: (id) => MAPS[id],
        getHeight: () => 0,
        isHub: (z) => z === 'stupa',
      },
      zones: {
        teleport(mapId, opts = {}) {
          const target = MAPS[mapId];
          const from = state.zone;
          state.zone = mapId;
          const sp = target.spawns?.[opts.spawn] || target.spawns?.default || target.origin;
          state.player.position.set(sp.x, 0, sp.z);
          state.player.heading = sp.heading ?? 0;
          bus.emit('zone:change', { from, to: mapId });
          return Promise.resolve(true);
        },
      },
    };

    // Register Yarlung south return gate interactable just like zones.js + interaction.js
    const southGate = YARLUNG_MAP.gates[0];
    ctx.interactables.push({
      id: 'gate-yarlung-south',
      kind: 'gate',
      zone: 'yarlung',
      action: 'interact',
      radius: southGate.radius,
      getPosition: () => new THREE.Vector3(southGate.x, 0, southGate.z),
      isAvailable: () => state.zone === 'yarlung' && !state.uiOpen,
      onInteract: () => {
        state.zone = 'stupa';
      },
    });

    function runFrameInteractions() {
      ctx.input.update();
      if (state.uiOpen) return;
      if (ctx.input.pressed('interact')) {
        for (const it of ctx.interactables) {
          if (!it.isAvailable()) continue;
          const pos = it.getPosition();
          const d = Math.hypot(
            state.player.position.x - pos.x,
            state.player.position.z - pos.z
          );
          if (d <= it.radius) {
            it.onInteract();
            break;
          }
        }
      }
    }

    // Initialize input BEFORE questUi (matches adventure.js initialization order)
    ctx.input = createInput(ctx);
    const questUi = createQuestUi(ctx);
    const waypoints = createWaypoints(ctx);
    waypoints.unlock('yarlung', { silent: true });

    // Trigger chapter intro automatically when arriving in Yarlung (matches src/systems/quests.js)
    bus.on('zone:change', ({ to }) => {
      const intro = MAPS[to]?.chapterIntro;
      if (intro && !flags[intro.flag]) {
        bus.emit('chapter:intro', intro);
      }
    });

    // 1. Teleport to Yarlung -> Chapter 3 intro mural opens immediately
    await waypoints.teleportTo('yarlung');
    assert.equal(state.zone, 'yarlung');
    assert.equal(questUi.isOpen(), true);
    assert.equal(state.uiOpen, true);

    // 2. Pressing Enter BEFORE 180ms debounce is swallowed and does not queue interact
    const earlyEnter = createDomEvent('keydown', { code: 'Enter', key: 'Enter' });
    windowMock.dispatchEvent(earlyEnter);
    assert.equal(earlyEnter.defaultPrevented, true);
    assert.equal(questUi.isOpen(), true);
    assert.equal(state.uiOpen, true);
    runFrameInteractions();
    assert.equal(ctx.input.pressed('interact'), false);
    assert.equal(state.zone, 'yarlung');

    // 3. Wait past 180ms debounce and press Enter to dismiss the mural
    await new Promise((r) => setTimeout(r, 210));
    const dismissEnter = createDomEvent('keydown', { code: 'Enter', key: 'Enter' });
    windowMock.dispatchEvent(dismissEnter);
    assert.equal(dismissEnter.defaultPrevented, true);
    assert.equal(questUi.isOpen(), false);
    assert.equal(state.uiOpen, false);
    assert.equal(flags['ch3.introSeen'], true);

    // Next gameplay frame must NOT see a leaked 'interact' action or return to Stupa
    runFrameInteractions();
    assert.equal(ctx.input.pressed('interact'), false);
    assert.equal(state.zone, 'yarlung');

    // 4. Test dismissing with Space, Escape, and button click as well
    for (const mode of ['Space', 'Escape', 'click']) {
      questUi.showChapterIntro(YARLUNG_MAP.chapterIntro);
      assert.equal(questUi.isOpen(), true);
      assert.equal(state.uiOpen, true);
      await new Promise((r) => setTimeout(r, 210));

      if (mode === 'click') {
        const enterBtn = uiRoot.querySelector('#chapter-intro-enter-btn');
        assert.ok(enterBtn);
        enterBtn.click();
      } else {
        const ev = createDomEvent('keydown', { code: mode, key: mode });
        windowMock.dispatchEvent(ev);
        assert.equal(ev.defaultPrevented, true);
      }

      assert.equal(questUi.isOpen(), false);
      assert.equal(state.uiOpen, false);
      runFrameInteractions();
      assert.equal(ctx.input.pressed('interact'), false);
      assert.equal(ctx.input.pressed('basic'), false);
      assert.equal(state.zone, 'yarlung');
    }
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCaf;
  }
});
