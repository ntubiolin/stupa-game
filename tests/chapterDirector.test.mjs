import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBus } from '../src/core/events.js';
import { createDebug } from '../src/core/debug.js';
import { createChapterDirector } from '../src/story/chapterDirector.js';
import { createStoryDirector } from '../src/story/storyDirector.js';
import { createSave, SAVE_STORAGE_KEY } from '../src/systems/save.js';

const legacy = {
  version: 1, beat: 'complete', evidence: ['new-diary'], choices: { opening: 'hello' },
  flags: { read: true }, clipsSeen: ['restoration'], elapsedSeconds: 240,
};

const flow = [
  ['backup', 'backup:read'],
  ['spring1', 'spring:clear'], ['spring2', 'spring:clear'], ['settle', 'spring:settle'],
  ['channel1', 'channel:clear'], ['channel2', 'channel:clear'], ['wait', 'water:observe'],
  ['manuscript', 'manuscript:take'], ['cave', 'manuscript:return'],
  ['shadow', 'shadow:observe'], ['release', 'shadow:release'], ['rain', 'rain:return'],
  ['lamp', 'lamp:light'], ['phone', 'phone:read'], ['diary', 'diary:read'], ['complete', null],
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
    createDebug(ctx);
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

    if (checkpointId === 'phone') {
      assert.equal(current.story.recordPhoneReply('pharping', '0'), true);
      assert.equal(current.story.recordPhoneReply('pharping', '1'), true);
      assert.equal(current.story.acknowledgePhoneThread('pharping'), true);
    }
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
  for (const [checkpointId, signal] of flow) {
    assert.deepEqual(replay.chapters.getState().chapters.pharping, {
      checkpointId, completed: checkpointId === 'complete',
    });
    assert.equal(replay.story.getJourney().chapters.pharping.checkpointId, 'complete');
    assert.equal(raw(), final);
    if (signal) assert.equal(replay.chapters.signal(signal, { checkpointId }), true);
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
  assert.equal(ctx.chapters.signal('backup:read', { checkpointId: 'backup' }), true);
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

  assert.equal(ctx.chapters.signal('backup:read', { checkpointId: 'backup' }), true);
  const committed = raw();
  fail('SecurityError');
  assert.equal(ctx.chapters.signal('spring:clear', { checkpointId: 'spring1' }), false);
  assert.equal(ctx.chapters.exit(), false);
  assert.equal(ctx.chapters.getState().chapters.pharping.checkpointId, 'spring1');
  assert.equal(ctx.chapters.getState().activeChapterId, 'pharping');
  assert.equal(ctx.events.length, 2);
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
  assert.equal(first.chapters.signal('backup:read', { checkpointId: 'backup' }), true);
  assert.equal(first.chapters.signal('spring:clear', { checkpointId: 'spring1' }), true);
  const saved = raw();
  assert.equal(await stale.chapters.start('pharping'), false);
  assert.equal(stale.save.flush(), false);
  assert.equal(raw(), saved);
});

test('finale choice survives reload and opposite replay cannot rewrite it', async t => {
  const { CHAPTERS } = await import('../src/data/story/chapters.js');
  const prerequisiteRecords = Object.fromEntries(CHAPTERS.filter(c=>c.id!=='finale').map(c=>[c.id,{checkpointId:'complete',completed:true,choices:{},flags:{}}]));
  const {load,raw,saved,fail}=harness(t,{...legacy,version:2,journey:{activeChapterId:'finale',chapters:{...prerequisiteRecords,finale:{checkpointId:'decision',completed:false,choices:{},flags:{}}}}});
  let ctx=load();assert(await ctx.chapters.resume());
  assert.equal(ctx.chapters.signal('proxy:decide',{checkpointId:'decision',choice:'invented'}),false);
  const before=raw();fail('QuotaExceededError');
  assert.equal(ctx.chapters.signal('proxy:decide',{checkpointId:'decision',choice:'end'}),false);assert.equal(raw(),before);assert.deepEqual(ctx.chapters.getChoices('finale'),{});
  fail(null);assert(ctx.chapters.signal('proxy:decide',{checkpointId:'decision',choice:'end'}));
  ctx=load();assert(await ctx.chapters.resume());assert.equal(ctx.chapters.getChoices('finale').decision,'end');
  const def=CHAPTERS.find(c=>c.id==='finale');
  for(const checkpoint of def.checkpoints.slice(def.checkpoints.findIndex(c=>c.id==='response')).filter(c=>c.signal))assert(ctx.chapters.signal(checkpoint.signal,{checkpointId:checkpoint.id}));
  assert(ctx.chapters.exit());const complete=raw();assert(saved().journey.chapters.finale.completed);
  assert(await ctx.chapters.start('finale',{replay:true}));
  for(const checkpoint of def.checkpoints.filter(c=>c.signal))assert(ctx.chapters.signal(checkpoint.signal,{checkpointId:checkpoint.id,...(checkpoint.choices?{choice:'retain'}:{})}));
  assert.equal(ctx.chapters.getChoices('finale').decision,'retain');assert.equal(raw(),complete);
  assert(ctx.chapters.exit());assert.equal(ctx.chapters.getChoices('finale').decision,'end');assert.equal(raw(),complete);
});

test('a finale checkpoint cannot imply an unmade agent decision', async t => {
  const {CHAPTERS}=await import('../src/data/story/chapters.js');
  const records=Object.fromEntries(CHAPTERS.filter(c=>c.id!=='finale').map(c=>[c.id,{checkpointId:'complete',completed:true,choices:{},flags:{}}]));
  records.finale={checkpointId:'response',completed:false,choices:{}};
  const {load}=harness(t,{...legacy,version:2,journey:{activeChapterId:'finale',chapters:records}});
  const ctx=load();assert.equal(ctx.chapters.getState().activeChapterId,null);assert.equal(ctx.chapters.getState().chapters.finale,undefined);
});

test('password-gated preview jumps from prologue without committing progress', async t => {
  const { load, raw } = harness(t, { ...legacy, beat: 'prologue' });
  const prepared = [];
  const ctx = load(async (...args) => { prepared.push(args); return true; });
  const before = raw();
  ctx.debug.enabled = true;
  assert.equal(await ctx.chapters.preview('chimphu', 'light'), false);
  assert.equal(ctx.debug.unlock('wrong password'), false);
  assert.equal(await ctx.chapters.preview('chimphu', 'light'), false);
  assert.deepEqual(prepared, []);
  assert.equal(ctx.debug.unlock('amitabha'), true);
  assert.equal(await ctx.chapters.preview('missing', 'light'), false);
  assert.equal(await ctx.chapters.preview('chimphu', 'missing'), false);
  assert.equal(await ctx.chapters.preview('chimphu', 'light'), true);
  assert.deepEqual(prepared, [['chimphu', 'light']]);
  assert.equal(ctx.story.getState().beat, 'prologue');
  assert.equal(ctx.chapters.getState().testing, true);
  assert.equal(ctx.chapters.canStart('pharping'), false);
  assert.deepEqual(ctx.events.at(-1), ['change', {
    chapterId: 'chimphu', checkpointId: 'light', replaying: false, testing: true,
  }]);
  assert.equal(ctx.chapters.signal('light:touch', { checkpointId: 'light' }), true);
  for (const id of ['starlight1', 'starlight2', 'starlight3']) assert.equal(ctx.chapters.signal('starlight:read', { checkpointId: id }), true);
  assert.equal(ctx.chapters.signal('descent:read', { checkpointId: 'descent' }), true);
  assert.equal(ctx.chapters.signal('diary:read', { checkpointId: 'diary' }), true);
  assert.equal(ctx.chapters.getState().chapters.chimphu.completed, true);
  assert.equal(raw(), before);
  assert.equal(ctx.chapters.exit(), true);
  assert.deepEqual(ctx.events.at(-1), ['exit', { chapterId: 'chimphu', testing: true }]);
  assert.equal(ctx.chapters.getState().testing, undefined);
  assert.deepEqual(ctx.story.getJourney(), { activeChapterId: null, chapters: {} });
  assert.equal(raw(), before);
});

test('finale preview requires explicit prior choices and restores the canonical active chapter', async t => {
  const record = { checkpointId: 'spring2', completed: false, choices: {}, flags: {} };
  const { load, raw } = harness(t, { ...legacy, version: 2, journey: {
    activeChapterId: 'pharping', chapters: { pharping: record },
  } });
  const ctx = load();
  const before = raw();
  ctx.debug.unlock('amitabha');
  assert.equal(await ctx.chapters.resume(), true);
  assert.equal(await ctx.chapters.preview('finale', 'response'), false);
  assert.equal(await ctx.chapters.preview('finale', 'custody', { choice: 'bad' }), false);
  assert.equal(await ctx.chapters.preview('finale', 'decision', { choice: 'end' }), false);
  assert.equal(await ctx.chapters.preview('finale', 'response', { choice: 'retain' }), true);
  assert.deepEqual(ctx.chapters.getChoices('finale'), { decision: 'retain' });
  assert.equal(await ctx.chapters.preview('finale', 'lamp', { choice: 'end' }), true);
  assert.deepEqual(ctx.chapters.getChoices('finale'), { decision: 'end' });
  assert.equal(await ctx.chapters.preview('finale', 'decision'), true);
  assert.deepEqual(ctx.chapters.getChoices('finale'), {});
  assert.equal(ctx.chapters.signal('proxy:decide', { checkpointId: 'decision', choice: 'retain' }), true);
  assert.deepEqual(ctx.chapters.getChoices('finale'), { decision: 'retain' });
  assert.equal(ctx.chapters.exit(), true);
  assert.deepEqual(ctx.story.getJourney(), { activeChapterId: 'pharping', chapters: { pharping: record } });
  assert.deepEqual(ctx.chapters.getChoices('finale'), {});
  assert.equal(await ctx.chapters.resume(), true);
  assert.deepEqual(ctx.events.at(-1), ['change', {
    chapterId: 'pharping', checkpointId: 'spring2', replaying: false,
  }]);
  assert.equal(raw(), before);
});

test('preview supersedes pending work and rejected or cancelled loads keep canonical state', async t => {
  const { load, raw } = harness(t);
  const pending = [];
  const ctx = load((...args) => new Promise((resolve, reject) => pending.push({ args, resolve, reject })));
  ctx.debug.unlock('amitabha');
  const before = raw();

  const canonical = ctx.chapters.start('pharping');
  const preview = ctx.chapters.preview('mangyul', 'clearing', { choice: 'yes' });
  pending[0].resolve(true);
  assert.equal(await canonical, false);
  pending[1].resolve(true);
  assert.equal(await preview, true);

  const rejected = ctx.chapters.preview('yarlung', 'release');
  pending[2].reject(new Error('scene failed'));
  assert.equal(await rejected, false);
  assert.equal(ctx.chapters.getState().activeChapterId, 'mangyul');

  const superseded = ctx.chapters.preview('samye', 'night');
  const latest = ctx.chapters.preview('yarlung', 'calm');
  pending[4].resolve(true);
  assert.equal(await latest, true);
  pending[3].resolve(true);
  assert.equal(await superseded, false);
  assert.equal(ctx.chapters.getState().activeChapterId, 'yarlung');

  const cancelled = ctx.chapters.preview('chimphu', 'light');
  assert.equal(ctx.chapters.exit(), true);
  pending[5].resolve(true);
  assert.equal(await cancelled, false);
  assert.equal(ctx.chapters.getState().activeChapterId, null);

  const disposed = ctx.chapters.preview('chimphu', 'light');
  ctx.chapters.dispose();
  pending[6].resolve(true);
  assert.equal(await disposed, false);
  assert.equal(raw(), before);
});
