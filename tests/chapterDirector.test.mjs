import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBus } from '../src/core/events.js';
import { createChapterDirector } from '../src/story/chapterDirector.js';
import { createStoryDirector } from '../src/story/storyDirector.js';
import { createSave, SAVE_STORAGE_KEY } from '../src/systems/save.js';

const legacy = {
  version: 1, beat: 'complete', evidence: ['new-diary'], choices: { opening: 'hello' },
  flags: { read: true }, clipsSeen: ['restoration'], elapsedSeconds: 240,
};

const flow = [
  ['spring1', 'spring:clear'], ['spring2', 'spring:clear'], ['channel1', 'channel:clear'],
  ['channel2', 'channel:clear'], ['manuscript', 'manuscript:take'], ['cave', 'manuscript:return'],
  ['shadow', 'shadow:observe'], ['release', 'shadow:release'], ['rain', 'rain:return'],
  ['diary', 'diary:read'], ['complete', null],
];

function harness(t, story = legacy) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let raw = JSON.stringify({ version: 2, sections: { story, vitals: { level: 7 } } });
  let error = null;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => raw,
      setItem: (_, value) => {
        if (error) throw new DOMException('test save failure', error);
        raw = value;
      },
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });

  function load(prepareChapter = async () => true) {
    const ctx = { bus: createBus(), prepareChapter };
    createSave(ctx, { writableSections: ['story'] });
    createStoryDirector(ctx);
    createChapterDirector(ctx);
    const events = [];
    ctx.bus.on('story:chapter-change', event => events.push(['change', event]));
    ctx.bus.on('story:chapter-exit', event => events.push(['exit', event]));
    ctx.story.start();
    return { ...ctx, events };
  }

  return { load, raw: () => raw, saved: () => JSON.parse(raw).sections.story, fail: value => { error = value; } };
}

test('migrates terminal Demo on explicit Continue, reloads every checkpoint and replays without writes', async t => {
  const { load, raw, saved } = harness(t);
  const first = load();
  assert.deepEqual(first.chapters.getState(), { activeChapterId: null, chapters: {}, replaying: false, readOnly: false });
  assert.equal(await first.chapters.resume(), false);
  assert.equal(first.chapters.canStart('mangyul'), false);
  assert.equal(await first.chapters.start('pharping', { replay: true }), false);
  assert.equal(await first.chapters.start('pharping'), true);
  assert.equal(saved().version, 2);
  assert.equal(saved().beat, legacy.beat);
  for (const field of ['choices', 'flags', 'clipsSeen', 'elapsedSeconds']) assert.deepEqual(saved()[field], legacy[field]);
  assert.ok(saved().evidence.includes('new-diary'));

  let current;
  for (const [index, [checkpointId, signal]] of flow.entries()) {
    const beforeResume = raw();
    current = load(async (id, checkpoint) => {
      assert.equal(id, 'pharping');
      assert.equal(checkpoint, checkpointId);
      return true;
    });
    const { chapters, events, bus } = current;
    assert.equal(chapters.signal(signal, { checkpointId }), false, 'scene is not ready before resume');
    assert.equal(await chapters.resume(), true);
    assert.equal(raw(), beforeResume);
    assert.deepEqual(events, [['change', { chapterId: 'pharping', checkpointId, replaying: false }]]);
    assert.equal(chapters.getState().chapters.pharping.completed, checkpointId === 'complete');
    const snapshot = chapters.getState();
    snapshot.chapters.pharping.checkpointId = 'invalid';
    assert.equal(chapters.getState().chapters.pharping.checkpointId, checkpointId);
    assert.equal(chapters.signal(signal, { checkpointId: 'invalid' }), false);
    assert.equal(chapters.signal('unregistered', { checkpointId }), false);
    if (!signal) break;

    const [nextId, nextSignal] = flow[index + 1];
    bus.on('story:chapter-change', ({ checkpointId }) => {
      assert.equal(saved().journey.chapters.pharping.checkpointId, checkpointId);
      assert.equal(chapters.signal(nextSignal, { checkpointId }), false, 'synchronous reentry');
      assert.equal(chapters.exit(), false);
    });
    assert.equal(chapters.signal(signal, { checkpointId }), true);
    assert.equal(chapters.signal(signal, { checkpointId }), false, 'stale duplicate');
    assert.equal(saved().journey.chapters.pharping.checkpointId, nextId);
  }

  assert.equal(current.chapters.exit(), true);
  assert.deepEqual(current.events.at(-1), ['exit', { chapterId: 'pharping' }]);
  assert.equal(saved().journey.activeChapterId, null);
  assert.deepEqual(saved().journey.chapters.pharping, {
    checkpointId: 'complete', completed: true, choices: {}, flags: {},
  });
  const final = raw();
  const replay = load();
  assert.equal(await replay.chapters.start('pharping', { replay: true }), true);
  for (const [checkpointId, signal] of flow.slice(0, -1)) {
    assert.equal(replay.chapters.signal(signal, { checkpointId }), true);
    assert.equal(replay.chapters.getState().chapters.pharping.checkpointId, 'complete');
    assert.equal(raw(), final);
  }
  assert.equal(replay.chapters.exit(), true);
  assert.equal(replay.chapters.getState().activeChapterId, null);
  assert.equal(raw(), final);
});

test('failed preparation, stale async success and disposal preserve the durable checkpoint', async t => {
  const { load, raw, saved } = harness(t);
  let prepare;
  const ctx = load((...args) => prepare(...args));
  const initial = raw();
  prepare = async () => { throw new Error('scene failure'); };
  assert.equal(await ctx.chapters.start('pharping'), false);
  assert.equal(raw(), initial);
  assert.deepEqual(ctx.events, []);

  let resolve;
  prepare = () => new Promise(done => { resolve = done; });
  const stale = ctx.chapters.start('pharping');
  prepare = async () => false;
  assert.equal(await ctx.chapters.start('pharping'), false);
  resolve(true);
  assert.equal(await stale, false);
  assert.equal(raw(), initial);
  assert.equal(load().chapters.getState().activeChapterId, null);

  prepare = async () => true;
  assert.equal(await ctx.chapters.start('pharping'), true);
  assert.equal(ctx.chapters.signal('spring:clear', { checkpointId: 'spring1' }), true);
  const retry = load(() => prepare());
  prepare = async () => false;
  const beforeResume = raw();
  assert.equal(await retry.chapters.resume(), false);
  assert.equal(retry.chapters.getState().activeChapterId, 'pharping');
  assert.equal(retry.chapters.signal('spring:clear', { checkpointId: 'spring2' }), false);
  assert.equal(raw(), beforeResume);

  prepare = () => new Promise(done => { resolve = done; });
  const late = retry.chapters.resume();
  assert.equal(retry.chapters.exit(), true);
  resolve(true);
  assert.equal(await late, false);
  assert.equal(saved().journey.activeChapterId, null);
  assert.equal(saved().journey.chapters.pharping.checkpointId, 'spring2');

  const disposed = load(() => new Promise(done => { resolve = done; }));
  const pending = disposed.chapters.start('pharping');
  disposed.chapters.dispose();
  resolve(true);
  assert.equal(await pending, false);
  assert.deepEqual(disposed.events, []);
  assert.equal(saved().journey.activeChapterId, null);
});

test('start, checkpoint and exit publish only after acknowledged writes and allow retry', async t => {
  const { load, raw, fail } = harness(t);
  const ctx = load();
  const initial = raw();
  fail('QuotaExceededError');
  assert.equal(await ctx.chapters.start('pharping'), false);
  assert.equal(raw(), initial);
  assert.deepEqual(ctx.events, []);
  assert.equal(ctx.chapters.getState().activeChapterId, null);
  assert.deepEqual(ctx.save.getStatus(), { ok: false, error: 'storage-unavailable' });
  fail(null);
  assert.equal(await ctx.chapters.start('pharping'), true);
  assert.deepEqual(ctx.save.getStatus(), { ok: true });

  const committed = raw();
  fail('SecurityError');
  assert.equal(ctx.chapters.signal('spring:clear', { checkpointId: 'spring1' }), false);
  assert.equal(ctx.chapters.exit(), false);
  assert.equal(ctx.chapters.getState().chapters.pharping.checkpointId, 'spring1');
  assert.equal(ctx.chapters.getState().activeChapterId, 'pharping');
  assert.equal(ctx.events.length, 1);
  assert.equal(raw(), committed);
  fail(null);
  assert.equal(ctx.chapters.signal('spring:clear', { checkpointId: 'spring1' }), true);
  assert.equal(ctx.chapters.exit(), true);
  assert.equal(ctx.chapters.getState().chapters.pharping.checkpointId, 'spring2');
  assert.equal(ctx.chapters.getState().activeChapterId, null);
});

test('optional journey corruption is isolated and never awards a false completion', t => {
  const { load } = harness(t, {
    ...legacy,
    version: 2,
    journey: { activeChapterId: 'pharping', chapters: {
      pharping: { checkpointId: 'complete', completed: false, choices: [], flags: 'corrupt' },
      mangyul: { checkpointId: 'complete', completed: true },
    } },
  });
  const { story, chapters } = load();
  assert.deepEqual(story.getJourney(), { activeChapterId: null, chapters: {} });
  assert.equal(story.getState().beat, 'complete');
  assert.deepEqual(story.getState().choices, legacy.choices);
  assert.ok(story.getState().evidence.includes('new-diary'));
  assert.equal(chapters.canStart('mangyul'), false);
});

test('a stale story instance cannot overwrite another instance’s completed write', async t => {
  const { load, raw } = harness(t);
  const first = load();
  const stale = load();
  assert.equal(await first.chapters.start('pharping'), true);
  assert.equal(first.chapters.signal('spring:clear', { checkpointId: 'spring1' }), true);
  const saved = raw();
  assert.equal(await stale.chapters.start('pharping'), false);
  assert.equal(stale.save.flush(), false);
  assert.equal(raw(), saved);
});
