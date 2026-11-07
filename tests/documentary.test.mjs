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
  removeAttribute(key) { delete this.attributes[key]; }
  play() {
    this.playCount = (this.playCount ?? 0) + 1;
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.pauseCount = (this.pauseCount ?? 0) + 1;
    this.paused = true;
  }
  load() { this.released = true; }
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

function harness(t, { media = false, reducedMotion = false, saveData = false } = {}) {
  const original = DOCUMENTARY_CLIPS.restoration;
  const legacyImage = '/story/restoration-memory.jpg';
  DOCUMENTARY_CLIPS.restoration = {
    ...original,
    cues: original.cues.map(({ video, ...cue }, index) => ({
      ...cue,
      frame: ['square', 'work', 'spire', 'slate'][index],
      image: index < 3 ? legacyImage : undefined,
      ...(media && index < 3 && { video: {
        src: `/story/video/V${index + 1}.mp4`,
        poster: `/story/video/V${index + 1}.jpg`,
      } }),
    })),
  };
  globalThis.window = {
    matchMedia: () => ({ matches: reducedMotion }),
    navigator: { connection: { saveData } },
  };
  const body = new Element('body');
  globalThis.document = { body, createElement: tag => new Element(tag) };
  t.after(() => {
    player.dispose();
    DOCUMENTARY_CLIPS.restoration = original;
    delete globalThis.document;
    delete globalThis.window;
  });
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
    motion: findControl('motion'), seek: controls.children.find(node => node.tag === 'input'),
    video: () => still.children.find(node => node.tag === 'video'),
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

test('optional motion loads one cue, plays silently and follows pause, seek, replay and skip', t => {
  const { player, caption, still, events, video, seek, next, replay } = harness(t, { media: true });
  assert.equal(video(), undefined);
  player.play('restoration');
  const initial = video();
  assert.equal(initial.getAttribute('src'), '/story/video/V1.mp4');
  assert.equal(initial.preload, 'none');
  assert.equal(initial.muted, true);
  assert.equal(initial.playsInline, true);
  assert.equal(initial.playCount, 1);
  assert.equal(still.children[0].getAttribute('src'), '/story/restoration-memory.jpg');

  initial.duration = 8;
  initial.currentTime = 0.8;
  initial.dispatchEvent(new Event('playing'));
  assert.equal(still.dataset.playing, 'true');
  assert.equal(seek.hidden, false);
  assert.equal(seek.max, '8');
  assert.equal(seek.value, '0.8');
  seek.value = '3.5';
  seek.dispatchEvent(new Event('input'));
  assert.equal(initial.currentTime, 3.5);

  player.pause();
  assert.equal(initial.paused, true);
  player.update(11);
  assert.match(caption.textContent, /earthquake$/);
  next.dispatchEvent(new Event('click'));
  assert.equal(initial.released, true);
  assert.equal(initial.getAttribute('src'), null);
  assert.equal(video(), undefined);
  player.resume();
  assert.equal(video().getAttribute('src'), '/story/video/V2.mp4');
  replay.dispatchEvent(new Event('click'));
  assert.equal(video().getAttribute('src'), '/story/video/V1.mp4');
  const restarted = video();
  restarted.dispatchEvent(new Event('ended'));
  assert.match(caption.textContent, /earthquake$/);
  player.skip();
  assert.equal(restarted.released, true);
  assert.deepEqual(events, [{ id: 'restoration', reason: 'skip' }]);
});

test('media stalls, blocked playback and image errors preserve captions and cue timing', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { player, caption, still, video, events } = harness(t, { media: true });
  player.play('restoration');
  const motion = video();
  motion.currentTime = 0;
  motion.dispatchEvent(new Event('timeupdate')); // Initial metadata must not cancel startup timeout.
  motion.dispatchEvent(new Event('stalled'));
  assert.equal(video(), motion);
  t.mock.timers.tick(2500);
  assert.equal(video(), motion); // Startup allows the decoder longer than a mid-play buffer.
  t.mock.timers.tick(5500);
  assert.equal(video(), undefined);
  assert.equal(still.dataset.playing, 'false');
  assert.equal(still.children[0].getAttribute('src'), '/story/restoration-memory.jpg');
  const [poster, fallback] = still.children;
  poster.dispatchEvent(new Event('error'));
  assert.equal(poster.getAttribute('src'), '/story/video/V1.jpg');
  assert.notEqual(fallback.hidden, false);
  poster.dispatchEvent(new Event('error'));
  assert.equal(fallback.hidden, false);
  assert.match(caption.textContent, /earthquake$/);

  player.update(9);
  const blocked = video();
  blocked.play = () => Promise.reject(new Error('autoplay unavailable'));
  player.pause();
  player.resume();
  await Promise.resolve();
  assert.equal(video(), undefined);
  assert.match(caption.textContent, /volunteer$/);
  player.update(11);
  const waiting = video();
  waiting.dispatchEvent(new Event('waiting')); // Normal startup has no playing frame yet.
  assert.equal(video(), waiting);
  waiting.dispatchEvent(new Event('playing'));
  waiting.dispatchEvent(new Event('waiting'));
  t.mock.timers.tick(1500);
  assert.equal(video(), waiting);
  waiting.currentTime = 1;
  waiting.dispatchEvent(new Event('timeupdate')); // Recovery cancels the buffer deadline.
  t.mock.timers.tick(2000);
  assert.equal(video(), waiting);
  player.pause();
  waiting.dispatchEvent(new Event('stalled'));
  t.mock.timers.tick(3000);
  assert.equal(video(), waiting); // A paused clip must not be discarded.
  player.resume();
  waiting.dispatchEvent(new Event('playing'));
  waiting.dispatchEvent(new Event('waiting'));
  t.mock.timers.tick(2500);
  assert.equal(video(), undefined);
  assert.match(caption.textContent, /reply$/);
  player.update(22);
  assert.deepEqual(events, [{ id: 'restoration', reason: 'complete' }]);
});

for (const preference of ['reducedMotion', 'saveData']) {
  test(`${preference} displays a still until an explicit playback gesture`, t => {
    const { player, motion, video, next } = harness(t, { media: true, [preference]: true });
    player.play('restoration');
    assert.equal(video(), undefined);
    assert.equal(motion.hidden, false);
    motion.dispatchEvent(new Event('click'));
    assert.equal(video().getAttribute('src'), '/story/video/V1.mp4');
    next.dispatchEvent(new Event('click'));
    assert.equal(video(), undefined);
    assert.equal(motion.hidden, false);
  });
}
