import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBus } from '../src/core/events.js';
import { createSave, SAVE_STORAGE_KEY } from '../src/systems/save.js';
import { createStoryDirector } from '../src/story/storyDirector.js';
import { prologueRecordingReadFlag, readPrologueReplies } from '../src/data/story/phonePrologue.js';

const freshState = {
  version: 2,
  beat: 'prologue',
  evidence: [],
  choices: {},
  flags: {},
  clipsSeen: [],
  elapsedSeconds: 0,
  journey: { activeChapterId: null, chapters: {} },
};

function harness(t, sections = {}) {
  const oldStorage = globalThis.localStorage;
  const storage = new Map([[SAVE_STORAGE_KEY, JSON.stringify({ version: 2, sections })]]);
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  t.after(() => {
    if (oldStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldStorage;
  });

  return function load() {
    const registered = new Map();
    const ctx = { bus: createBus(), debug: { register: (name, api) => registered.set(name, api) } };
    createSave(ctx);
    const director = createStoryDirector(ctx);
    assert.equal(ctx.story, director);
    return { bus: ctx.bus, save: ctx.save, director, debug: registered.get('story') };
  };
}

const flow = [
  ['prologue', 'prologue:complete', ['train-recording']],
  ['arrival', 'arrival:explored', []],
  ['photography', 'photo:matched', ['restoration-record', 'stone-record']],
  ['restoration', 'documentary:complete', []],
  ['losang', 'losang:complete', ['old-map']],
  ['map', 'map:opened', []],
  ['vision', 'vision:restored', ['new-diary']],
  ['return', 'return:read', []],
  ['complete', null, []],
];

test('cold start and reload every beat with ordered lifecycle events and stable evidence', t => {
  const load = harness(t);
  const evidence = [];
  for (const [index, [beat, signal, newEvidence]] of flow.entries()) {
    const { director, bus, save } = load();
    const events = [];
    bus.on('story:beat-start', ({ beat }) => events.push(['start', beat]));
    bus.on('story:beat-complete', ({ beat }) => events.push(['complete', beat]));
    bus.on('story:evidence', ({ id }) => events.push(['evidence', id]));
    bus.on('story:clip-play', ({ id }) => events.push(['clip', id]));

    assert.equal(director.getState().beat, beat);
    assert.deepEqual(director.getState().evidence, evidence);
    assert.equal(director.start(), true);
    assert.equal(director.start(), false);
    assert.deepEqual(events, [['start', beat]]);
    if (!signal) {
      assert.deepEqual(director.getState().clipsSeen, ['restoration']);
      director.update(20);
      assert.equal(director.getState().elapsedSeconds, 0);
      continue;
    }

    if (beat === 'restoration') {
      assert.equal(director.playClip('restoration'), true);
      bus.emit('story:clip-end', { id: 'restoration', reason: 'complete' });
    } else {
      assert.equal(director.signal(signal), true);
    }
    evidence.push(...newEvidence);
    assert.equal(director.signal(signal, { clipId: 'restoration' }), false);
    assert.deepEqual(events, [
      ['start', beat],
      ...(beat === 'restoration' ? [['clip', 'restoration']] : []),
      ...newEvidence.map(id => ['evidence', id]),
      ['complete', beat],
      ['start', flow[index + 1][0]],
    ]);
    save.flush();
  }
});

test('rejects out-of-order signals and reentrant transitions without changing the save', t => {
  const { director, bus, save } = harness(t)();
  assert.equal(director.signal('prologue:complete'), false);
  director.start();
  save.flush();
  assert.equal(director.signal('map:opened', { flags: { injected: true } }), false);
  assert.equal(director.signal(null), false);
  save.flush();
  assert.equal(save.getWriteCount(), 1);

  bus.on('story:beat-complete', () => {
    assert.equal(director.getState().beat, 'arrival');
    assert.equal(director.signal('arrival:explored'), false);
    assert.equal(director.skipTo('map'), false);
    assert.equal(director.reset(), false);
  });
  assert.equal(director.signal('prologue:complete', {
    choices: { opening: 'ask', invalid: ['ask'] },
    flags: { playedRecording: true, invalid: 1 },
  }), true);
  assert.deepEqual(director.getState(), {
    ...freshState,
    beat: 'arrival',
    evidence: ['train-recording'],
    choices: { opening: 'ask' },
    flags: { playedRecording: true },
  });
  const snapshot = director.getState();
  snapshot.choices.opening = 'overwrite';
  snapshot.flags.playedRecording = false;
  snapshot.evidence.push('unknown');
  snapshot.clipsSeen.push('unknown');
  assert.equal(director.getState().choices.opening, 'ask');
  assert.deepEqual(director.getState().flags, { playedRecording: true });
  assert.deepEqual(director.getState().evidence, ['train-recording']);
  assert.deepEqual(director.getState().clipsSeen, []);
});

test('prologue saves each accepted reply and the opened transcript without emitting beat events', t => {
  const load = harness(t, { settings: { lang: 'en', muted: true } });
  const first = load();
  const events = [];
  for (const type of ['story:beat-start', 'story:beat-complete', 'story:evidence']) {
    first.bus.on(type, payload => events.push([type, payload]));
  }
  assert.equal(first.director.recordPrologueReply('hello'), false);
  first.director.start();
  assert.equal(first.director.recordPrologueReply('voice'), false);
  assert.equal(first.director.recordPrologueReply('hello'), true);
  assert.equal(first.director.recordPrologueReply('hello'), false);
  assert.equal(first.director.acknowledgePrologueRecording(), false);
  assert.deepEqual(events, [['story:beat-start', { beat: 'prologue' }]]);
  first.save.flush();

  const second = load();
  second.director.start();
  assert.deepEqual(second.director.getState().choices, { 'prologue.opening': 'hello' });
  for (const reply of ['how', 'private', 'now', 'task', 'why', 'voice']) {
    assert.equal(second.director.recordPrologueReply(reply), true);
  }
  assert.equal(second.director.acknowledgePrologueRecording(), true);
  assert.equal(second.director.acknowledgePrologueRecording(), false);
  second.save.flush();

  const third = load();
  third.director.start();
  const previous = third.director.getState();
  assert.equal(previous.beat, 'prologue');
  assert.deepEqual(previous.evidence, []);
  assert.equal(previous.flags[prologueRecordingReadFlag], true);
  assert.deepEqual(readPrologueReplies(previous.choices).map(reply => reply.id),
    ['hello', 'how', 'private', 'now', 'task', 'why', 'voice']);
  for (const [, signal] of flow.slice(0, -1)) {
    assert.equal(third.director.signal(signal, { clipId: 'restoration' }), true);
    assert.equal(third.director.recordPrologueReply('scam'), false);
    assert.equal(third.director.acknowledgePrologueRecording(), false);
    assert.deepEqual(third.director.getState().choices, previous.choices);
    assert.deepEqual(third.director.getState().flags, previous.flags);
  }
  third.save.flush();

  const completed = load();
  completed.director.start();
  assert.deepEqual(completed.director.getState().choices, previous.choices);
  assert.deepEqual(completed.director.getState().flags, previous.flags);
  assert.equal(completed.director.reset(), true);
  completed.save.flush();
  assert.deepEqual(load().save.dump().sections, {
    story: freshState, settings: { lang: 'en', muted: true },
  });
});

test('recovers a partial prologue with orphaned choices and preserves unrelated story fields', t => {
  const { director } = harness(t, { story: {
    ...freshState,
    choices: { 'prologue.opening': 'hello', 'prologue.report': 'invalid', 'prologue.kyoto': 'private', other: 'kept' },
    flags: { [prologueRecordingReadFlag]: true, other: true },
  } })();
  director.start();
  assert.equal(director.recordPrologueReply('how'), true);
  assert.equal(director.acknowledgePrologueRecording(), false);
  assert.deepEqual(director.getState().choices, {
    'prologue.opening': 'hello', 'prologue.report': 'how', other: 'kept',
  });
  assert.deepEqual(director.getState().flags, { other: true });
  assert.equal(director.recordPrologueReply('stop'), true);
});

test('clips reject invalid ends, allow cancel and retry, and stay local to their beat run', t => {
  const { director, bus, debug } = harness(t)();
  const play = [];
  bus.on('story:clip-play', event => play.push(event));
  director.start();
  assert.equal(debug.playClip('unknown'), false);
  assert.equal(debug.playClip('restoration'), true);
  assert.equal(debug.playClip('restoration'), false);
  assert.equal(debug.skipTo('restoration'), true);
  bus.emit('story:clip-end', { id: 'restoration', reason: 'complete' });
  assert.equal(director.getState().beat, 'restoration');
  assert.deepEqual(director.getState().clipsSeen, []);

  assert.equal(director.signal('documentary:complete'), false);
  assert.equal(director.signal('documentary:complete', { clipId: 'unknown' }), false);
  bus.emit('story:clip-end', { id: 'restoration', reason: 'skip' });
  assert.equal(director.getState().beat, 'restoration');
  assert.equal(debug.playClip('restoration'), true);
  bus.emit('story:clip-end', null);
  bus.emit('story:clip-end', { id: 'unknown', reason: 'complete' });
  bus.emit('story:clip-end', { id: 'restoration', reason: 'error' });
  assert.equal(debug.playClip('restoration'), false);
  bus.emit('story:clip-end', { id: 'restoration', reason: 'cancel' });
  assert.equal(director.getState().beat, 'restoration');
  assert.deepEqual(director.getState().clipsSeen, []);

  assert.equal(debug.playClip('restoration'), true);
  bus.emit('story:clip-end', { id: 'restoration', reason: 'skip' });
  assert.equal(director.getState().beat, 'losang');
  assert.equal(debug.playClip('restoration'), true);
  bus.emit('story:clip-end', { id: 'restoration', reason: 'complete' });
  assert.equal(director.getState().beat, 'losang');
  assert.deepEqual(director.getState().clipsSeen, ['restoration']);
  assert.deepEqual(play, Array.from({ length: 4 }, () => ({ id: 'restoration' })));
});

test('reload in the middle of a clip starts the same beat with playback available again', t => {
  const load = harness(t, { story: { ...freshState, beat: 'restoration' } });
  const first = load();
  first.director.start();
  first.director.playClip('restoration');
  first.save.flush();

  const { director, bus, save } = load();
  let start;
  let clip;
  bus.on('story:beat-start', event => { start = event; });
  bus.on('story:clip-play', event => { clip = event; });
  director.start();
  assert.deepEqual(start, { beat: 'restoration' });
  assert.equal(clip, undefined);
  assert.equal(director.playClip('restoration'), true);
  assert.deepEqual(clip, { id: 'restoration' });
  assert.deepEqual(Object.keys(save.get('story')), Object.keys(freshState));
});

test('recovers corrupt story fields and reconstructs evidence required to resume', t => {
  const load = harness(t, { story: JSON.parse(`{
    "version":1, "beat":"return",
    "evidence":["unknown","old-map","old-map",null],
    "choices":{"opening":"ask","bad":4,"__proto__":"bad"},
    "flags":{"playedRecording":true,"bad":"true","constructor":false},
    "clipsSeen":["restoration","restoration",0], "elapsedSeconds":-1,
    "activeClip":"restoration"
  }`) });
  const { director, save } = load();
  director.start();
  assert.deepEqual(director.getState(), {
    ...freshState,
    beat: 'return',
    evidence: ['old-map', 'train-recording', 'restoration-record', 'stone-record', 'new-diary'],
    choices: { opening: 'ask' },
    flags: { playedRecording: true },
    clipsSeen: ['restoration'],
  });
  assert.deepEqual(save.get('story'), director.getState());
  assert.equal(director.signal('return:read'), true);
});

test('an unrecognized beat falls back to a fresh prologue', t => {
  const { director, save } = harness(t, {
    story: { ...freshState, beat: 'missing-beat', evidence: ['new-diary'] },
  })();
  director.start();
  assert.deepEqual(director.getState(), freshState);
  assert.deepEqual(save.get('story'), freshState);
});

test('a future save stays intact while playing and rejects story reset', t => {
  const future = { ...freshState, version: 3, beat: 'future-beat', futureField: { detail: 4 } };
  const { director, save } = harness(t, { story: future })();
  director.start();
  assert.deepEqual(director.getState(), freshState);
  director.signal('prologue:complete');
  director.update(1.25);
  assert.deepEqual(save.get('story'), future);
  assert.equal(director.reset(), false);
  assert.deepEqual(save.get('story'), future);
});

test('elapsed time, debug evidence and reset preserve pre-story adventure sections', t => {
  const adventure = {
    vitals: { level: 12, exp: 420, hp: 48, permanent: { atk: 3, def: 2 } },
    quests: { active: { 'p1': { kora: 1, lamps: 2 } }, completed: ['p0'] },
    inventory: { bag: [{ id: 'vajra', quantity: 1 }], equipment: {} },
    settings: { lang: 'zh', muted: true },
  };
  const load = harness(t, adventure);
  const first = load();
  const { director, debug, bus, save } = first;
  const evidence = [];
  bus.on('story:evidence', ({ id }) => evidence.push(id));
  director.start();
  for (const dt of [0, -1, Infinity, NaN, '3']) director.update(dt);
  assert.equal(director.getState().elapsedSeconds, 0);
  director.update(0.75);
  director.update(0.5);
  assert.equal(debug.grantEvidence('stone-record'), true);
  assert.equal(debug.grantEvidence('stone-record'), false);
  assert.equal(debug.grantEvidence('unknown'), false);
  assert.deepEqual(evidence, ['stone-record']);
  assert.equal(debug.skipTo('unknown'), false);
  save.flush();

  const reloaded = load();
  assert.deepEqual(reloaded.save.dump().sections, {
    ...adventure,
    story: { ...freshState, evidence: ['stone-record'], elapsedSeconds: 1.25 },
  });
  reloaded.director.start();
  assert.equal(reloaded.debug.reset(), true);
  reloaded.save.flush();
  assert.deepEqual(load().save.dump().sections, { ...adventure, story: freshState });
});
