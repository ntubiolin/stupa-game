import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createBus } from '../src/core/events.js';
import { DOCUMENTARY_CLIPS } from '../src/data/story/documentary.js';
import { i18n } from '../src/i18n.js';

const cssHook = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { createDocumentary } = await import('../src/ui/story/documentary.js');
cssHook.deregister();

class Element extends EventTarget {
  constructor(tag) {
    super();
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
  }

  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  set src(value) { this.setAttribute('src', value); }
  showModal() { this.open = true; }
  close() { this.open = false; }

  append(...children) {
    for (const child of children) child.parent = this;
    this.children.push(...children);
  }

  prepend(child) {
    child.parent = this;
    this.children.unshift(child);
  }

  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter(child => child !== this);
    this.parent = null;
  }
}

function harness(t) {
  const body = new Element('body');
  globalThis.document = { body, createElement: tag => new Element(tag) };
  t.after(() => { delete globalThis.document; });
  const state = { uiOpen: false };
  const bus = createBus();
  const events = [];
  bus.on('story:clip-end', event => events.push(event));
  const ctx = { state, bus, i18n: {
    t: (key, params) => params ? `${key}:${params.current}/${params.total}` : key,
    onChange: () => () => {},
  } };
  const player = createDocumentary(ctx);
  assert.equal(ctx.documentary, player);
  const dialog = body.children[0];
  const [, still, , captions, progress, controls] = dialog.children;
  const [, caption] = captions.children;
  const findControl = action => controls.children.find(button => button.dataset.action === action);
  return {
    body, bus, state, player, events, dialog, still, caption, progress,
    replay: findControl('replay'), next: findControl('next'),
  };
}

test('cues distinguish historical context, fiction and the novel’s repair quote', () => {
  const { cues } = DOCUMENTARY_CLIPS.restoration;
  const strings = i18n.getStrings();
  assert.equal(cues.length, 4);
  assert.match(cues[0].sourceKey, /history$/);
  assert.ok(cues.slice(1).every(cue => cue.sourceKey.endsWith('.novel')));
  assert.equal(strings.zh[cues[2].subtitleKey], '「因為我們知道它會壞，還是願意把它建好。」');
  assert.match(strings.en[cues[3].subtitleKey], /age and origin were uncertain/);
});

test('lazy still failure leaves captions readable through pause, replay and completion', t => {
  const { bus, player, state, events, dialog, still, caption, replay, next } = harness(t);
  assert.equal(still.children.some(node => node.tag === 'img'), false);
  bus.emit('story:clip-play', { id: 'restoration' });
  assert.equal(state.uiOpen, true);
  assert.equal(dialog.open, true);
  const [image, fallback] = still.children;
  assert.equal(image.getAttribute('src'), '/story/restoration-memory.jpg');
  image.dispatchEvent(new Event('error'));
  assert.equal(image.hidden, true);
  assert.equal(fallback.hidden, false);
  assert.match(caption.textContent, /earthquake$/);
  assert.equal(player.pause(), true);
  player.update(30);
  assert.match(caption.textContent, /earthquake$/);
  assert.equal(player.resume(), true);
  player.update(9);
  assert.match(caption.textContent, /volunteer$/);
  player.update(11);
  assert.match(caption.textContent, /reply$/);
  replay.dispatchEvent(new Event('click'));
  assert.match(caption.textContent, /earthquake$/);
  assert.notEqual(still.children[0], image);
  player.update(29);
  assert.match(caption.textContent, /stone$/);
  assert.equal(still.children.some(node => node.tag === 'img'), false);
  player.update(13);
  next.dispatchEvent(new Event('click'));
  player.update(10);
  assert.equal(player.isOpen(), false);
  assert.equal(state.uiOpen, false);
  assert.deepEqual(events, [{ id: 'restoration', reason: 'complete' }]);
});

test('manual advance resets the timer and autoplay still advances the next cue', t => {
  const { player, caption, progress, still, next } = harness(t);
  player.play('restoration');
  player.update(8);
  next.dispatchEvent(new Event('click'));
  assert.equal(still.dataset.frame, 'work');
  assert.match(caption.textContent, /volunteer$/);
  assert.match(progress.textContent, /2\/4$/);
  player.update(10);
  assert.match(caption.textContent, /volunteer$/);
  player.update(1);
  assert.match(caption.textContent, /reply$/);
  assert.match(progress.textContent, /3\/4$/);
});

test('paused manual advance works through missing images and finishes only once', t => {
  const { player, state, events, dialog, still, caption, progress, next } = harness(t);
  player.play('restoration');
  player.pause();
  const [image, fallback] = still.children;
  image.dispatchEvent(new Event('error'));
  assert.match(next.textContent, /\.next$/);
  next.dispatchEvent(new Event('click'));
  assert.equal(fallback.hidden, false);
  assert.match(caption.textContent, /volunteer$/);
  player.update(60);
  assert.equal(dialog.dataset.paused, 'true');
  assert.match(caption.textContent, /volunteer$/);
  next.dispatchEvent(new Event('click'));
  assert.match(caption.textContent, /reply$/);
  next.dispatchEvent(new Event('click'));
  assert.match(caption.textContent, /stone$/);
  assert.match(progress.textContent, /4\/4$/);
  assert.equal(still.dataset.frame, 'slate');
  assert.equal(fallback.hidden, true);
  assert.match(next.textContent, /\.finish$/);
  assert.deepEqual(events, []);
  next.dispatchEvent(new Event('click'));
  next.dispatchEvent(new Event('click'));
  player.update(60);
  assert.equal(dialog.open, false);
  assert.equal(state.uiOpen, false);
  assert.deepEqual(events, [{ id: 'restoration', reason: 'complete' }]);
});

test('escape, skip and dispose emit once per session and release the modal', t => {
  const { body, bus, player, state, events, dialog } = harness(t);
  assert.equal(player.play('unknown'), false);
  assert.equal(player.play('restoration'), true);
  assert.equal(player.play('restoration'), false);
  const cancel = new Event('cancel', { cancelable: true });
  dialog.dispatchEvent(cancel);
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(player.close(), false);
  assert.equal(player.play('restoration'), true);
  assert.equal(player.skip(), true);
  assert.equal(player.skip(), false);
  assert.equal(player.play('restoration'), true);
  player.dispose();
  player.dispose();
  bus.emit('story:clip-play', { id: 'restoration' });
  assert.equal(body.children.length, 0);
  assert.equal(state.uiOpen, false);
  assert.deepEqual(events, ['cancel', 'skip', 'cancel'].map(reason => ({ id: 'restoration', reason })));
});

test('a playback request while another modal owns uiOpen cancels without releasing it', t => {
  const { bus, player, state, events } = harness(t);
  state.uiOpen = true;
  bus.emit('story:clip-play', { id: 'restoration' });
  assert.equal(player.isOpen(), false);
  assert.equal(state.uiOpen, true);
  assert.deepEqual(events, [{ id: 'restoration', reason: 'cancel' }]);
});
