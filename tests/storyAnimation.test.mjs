import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createBus } from '../src/core/events.js';
import { createChapterStill, createStoryMuralScroll } from '../src/ui/story/chapterStills.js';

const cssHook = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { createDocumentary } = await import('../src/ui/story/documentary.js');
cssHook.deregister();

function createMock2DContext(calls) {
  const grad = { addColorStop() {} };
  return {
    save() { calls.push('save'); },
    restore() { calls.push('restore'); },
    scale() {},
    translate() {},
    rotate() {},
    beginPath() { calls.push('beginPath'); },
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() { calls.push('quadraticCurveTo'); },
    arc() { calls.push('arc'); },
    ellipse() {},
    fill() { calls.push('fill'); },
    stroke() { calls.push('stroke'); },
    clip() {},
    fillRect() { calls.push('fillRect'); },
    strokeRect() { calls.push('strokeRect'); },
    fillText(text) { calls.push(`fillText:${text}`); },
    measureText(text) { return { width: String(text).length * 8 }; },
    setLineDash() {},
    drawImage() {},
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
  };
}

class MockElement extends EventTarget {
  constructor(tag, drawCalls) {
    super();
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this._drawCalls = drawCalls;
  }

  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  removeAttribute(key) { delete this.attributes[key]; }
  showModal() { this.open = true; }
  close() { this.open = false; }

  getContext(type) {
    if (type === '2d' && this._drawCalls) {
      return createMock2DContext(this._drawCalls);
    }
    return null;
  }

  append(...children) {
    for (const child of children) child.parent = this;
    this.children.push(...children);
  }

  prepend(child) {
    child.parent = this;
    this.children.unshift(child);
  }

  remove() {
    this.removed = true;
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter(child => child !== this);
    this.parent = null;
  }
}

test('documentary mounts story-documentary-canvas for dorm-memory, draws frames, and cleans up on destroy', t => {
  const drawCalls = [];
  const body = new MockElement('body', drawCalls);
  globalThis.window = {
    matchMedia: () => ({ matches: false }),
    navigator: {},
  };
  globalThis.document = {
    body,
    createElement: tag => new MockElement(tag, drawCalls),
  };
  const state = { uiOpen: false };
  const bus = createBus();
  const ctx = {
    state,
    bus,
    i18n: {
      t: key => key,
      onChange: () => () => {},
    },
  };
  const player = createDocumentary(ctx);
  t.after(() => {
    player.destroy();
    delete globalThis.document;
    delete globalThis.window;
  });

  assert.equal(player.play('dorm-memory'), true);
  const dialog = body.children[0];
  const [, still] = dialog.children;
  const canvas = still.children.find(node => node.dataset.testid === 'story-documentary-canvas');
  assert.ok(canvas, 'expected story-documentary-canvas to be mounted for dorm-memory');
  assert.equal(canvas.className, 'story-documentary__canvas');
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
  assert.ok(drawCalls.some(c => c.startsWith('fillText:REC ● 00:00 / 00:17')));

  drawCalls.length = 0;
  player.update(6);
  assert.ok(drawCalls.some(c => c.startsWith('fillText:REC ● 00:06 / 00:17')));

  player.destroy();
  assert.equal(canvas.removed, true);
  assert.equal(body.children.length, 0);
});

test('chapterStills renders animated story-still-canvas for mirror.chapter.samye.photo.body and cleans up', t => {
  const drawCalls = [];
  globalThis.window = {
    matchMedia: () => ({ matches: false }),
  };
  globalThis.document = {
    createElement: tag => new MockElement(tag, drawCalls),
  };
  t.after(() => {
    delete globalThis.document;
    delete globalThis.window;
  });

  const still = createChapterStill('mirror.chapter.samye.photo.body', key => `mirror.${key}`);
  assert.ok(still, 'expected still for mirror.chapter.samye.photo.body');
  const canvas = still.element.children.find(node => node.dataset.testid === 'story-still-canvas');
  assert.ok(canvas, 'expected story-still-canvas inside figure');
  assert.equal(canvas.className, 'story-still__canvas');
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
  assert.ok(drawCalls.includes('fillRect'));
  assert.ok(drawCalls.includes('quadraticCurveTo'));

  drawCalls.length = 0;
  still.update(0.5);
  assert.ok(drawCalls.includes('fillRect'));

  still.dispose();
  assert.equal(still.element.removed, true);
});

test('createStoryMuralScroll mounts story-mural-scroll banner for chapters 1-5 and supports sketch tour and completion reveal', t => {
  const drawCalls = [];
  globalThis.window = {
    matchMedia: () => ({ matches: true }),
  };
  globalThis.document = {
    createElement: tag => new MockElement(tag, drawCalls),
  };
  t.after(() => {
    delete globalThis.document;
    delete globalThis.window;
  });

  assert.equal(createStoryMuralScroll('finale', 'intro'), null);

  const banner = createStoryMuralScroll('samye', 'intro', { i18n: { t: k => k } });
  assert.ok(banner, 'expected mural scroll banner for samye');
  assert.equal(banner.canvas.dataset.testid, 'story-mural-scroll');
  assert.equal(banner.scroll.tour.active, true);
  assert.ok(drawCalls.length > 0);

  banner.playCompletionReveal();
  assert.ok(banner.scroll.reveal, 'expected active coloring reveal on completion');
  assert.equal(banner.scroll.getEpisodeState(0), 'painted');

  banner.dispose();
  assert.equal(banner.element.removed, true);
});

test('cold mural sprites repaint each static canvas once per frame after repeated real draws', async t => {
  const { MuralScrollCanvas } = await import('../src/ui/mural/scroll.js?cold-sprite-test');
  const images = [], frames = new Map(), calls = [];
  let frameId = 0;
  globalThis.Image = class { constructor() { images.push(this); } };
  globalThis.document = { createElement: tag => new MockElement(tag, calls) };
  globalThis.requestAnimationFrame = fn => { frames.set(++frameId, fn); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  t.after(() => {
    delete globalThis.Image;
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  });
  const murals = [0, 1].map(() => new MuralScrollCanvas(new MockElement('canvas', calls), { chapterId: 'pharping' }));
  const draws = murals.map(scroll => t.mock.method(scroll, 'draw'));
  for (let frame = 0; frame < 4; frame++) {
    for (const scroll of murals) {
      scroll.areAllSpritesReady();
      scroll.draw();
    }
  }
  assert.ok(images.length > 3);
  for (const draw of draws) draw.mock.resetCalls();
  // Several images finish before the next paint, while other sprites are still downloading.
  for (const img of images.slice(0, 3)) img.onload();
  assert.deepEqual(draws.map(draw => draw.mock.callCount()), [0, 0]);
  assert.equal(frames.size, 2);
  const flush = () => {
    const batch = [...frames.values()];
    frames.clear();
    for (const fn of batch) fn();
  };
  flush();
  assert.deepEqual(draws.map(draw => draw.mock.callCount()), [1, 1]);
  for (const img of images.slice(3)) img.onload();
  murals[0].stop();
  flush();
  assert.deepEqual(draws.map(draw => draw.mock.callCount()), [1, 2]);
  assert.ok(murals.every(scroll => scroll.areAllSpritesReady()));
});
