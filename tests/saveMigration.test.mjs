import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave } from '../src/systems/save.js';
import { createStoryDirector } from '../src/story/storyDirector.js';
import { createBus } from '../src/core/events.js';

test('v1 migration retains adventure progress when a narrative journey starts and resets', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map([
    ['stupa.vitals.v1', JSON.stringify({ level: 14, exp: 123, hp: 80, mp: 40, permanent: { atk: 8, def: 6 } })],
    ['stupa.merit.v1', JSON.stringify({ kora: 8, points: 456, achievements: ['firstKora'] })],
    ['stupa.items.v1', JSON.stringify({ pityCount: 9 })], ['stupa.lang', 'en'],
  ]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } });
  try {
    const ctx = { bus: createBus(), state: {} };
    createSave(ctx);
    const migrated = ctx.save.dump().sections;
    assert.equal(migrated.vitals.level, 14); assert.equal(migrated.merit.points, 456); assert.equal(migrated.items.pityCount, 9); assert.equal(migrated.settings.lang, 'en');
    const story = createStoryDirector(ctx); story.start(); story.signal('prologue:complete'); story.reset(); ctx.save.flush();
    const stored = JSON.parse(storage.get('stupa.save.v2'));
    assert.equal(stored.version, 2);
    for (const [section, value] of Object.entries(migrated)) assert.deepEqual(stored.sections[section], value);
    assert.equal(stored.sections.story.beat, 'prologue');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
  }
});

test('scoped story flush preserves newer adventure writes from another tab', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let raw = JSON.stringify({ version: 2, sections: { vitals: { level: 5 }, inventory: { gold: 4 }, story: { version: 1 } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => raw, setItem: (_, value) => { raw = value; } } });
  try {
    const ctx = {}; createSave(ctx, { writableSections: ['story'] });
    // Simulate a different tab progressing after story loaded its snapshot.
    raw = JSON.stringify({ version: 2, sections: { vitals: { level: 9 }, inventory: { gold: 99 }, story: { version: 1 }, future: { keep: true } } });
    ctx.save.set('story', { version: 1, beat: 'arrival' });
    ctx.save.set('inventory', { gold: -1 }); // scoped callers cannot write this section
    ctx.save.flush();
    const stored = JSON.parse(raw).sections;
    assert.equal(stored.vitals.level, 9); assert.equal(stored.inventory.gold, 99); assert.deepEqual(stored.future, { keep: true }); assert.equal(stored.story.beat, 'arrival');
    ctx.save.reset();
    assert.equal(JSON.parse(raw).sections.story, undefined);
    assert.equal(JSON.parse(raw).sections.vitals.level, 9);
    raw = '{corrupt';
    ctx.save.set('story', { version: 1, beat: 'photography' }); ctx.save.flush();
    assert.equal(JSON.parse(raw).sections.story.beat, 'photography');
    assert.equal(JSON.parse(raw).sections.vitals.level, 9);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
  }
});

function mockSaveStorage(t, doc) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let raw = JSON.stringify(doc);
  let error;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => {
        if (error === 'SecurityError') throw new DOMException('test read failure', error);
        return raw;
      },
      setItem: (_, value) => {
        if (error) throw new DOMException('test write failure', error);
        raw = value;
      },
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });
  return {
    read: () => JSON.parse(raw),
    replace: value => { raw = JSON.stringify(value); },
    fail: value => { error = value; },
  };
}

test('opposite mode writes preserve newly added and removed sections and opaque story fields', t => {
  const originalStory = { version: 1, beat: 'complete' };
  const { read, replace } = mockSaveStorage(t, {
    version: 2,
    sections: { story: originalStory, vitals: { level: 7 }, waypoints: { reached: ['plaza'] }, obsolete: { remove: true } },
  });
  const adventure = createSave({});
  const story = createSave({}, { writableSections: ['story'] });
  const waypoints = adventure.get('waypoints');
  adventure.register('waypoints', () => waypoints);

  const opaque = { version: 2, beat: 'complete', journey: { chapters: {} }, future: { nested: ['keep'] } };
  assert.deepEqual(story.commitSection('story', opaque), { ok: true });
  const fresh = read();
  delete fresh.sections.obsolete;
  fresh.sections.waypoints.reached.push('pharping');
  fresh.sections.futureSection = ['arbitrary', 'payload'];
  replace(fresh);

  adventure.set('vitals', { level: 8 });
  assert.equal(adventure.flush(), true);
  assert.deepEqual(read().sections, {
    story: opaque, vitals: { level: 8 }, waypoints: { reached: ['plaza', 'pharping'] },
    futureSection: ['arbitrary', 'payload'],
  });

  const advanced = { ...opaque, journey: { activeChapterId: 'pharping' } };
  assert.equal(story.commitSection('story', advanced).ok, true);
  assert.equal(read().sections.vitals.level, 8);
  assert.equal(read().sections.waypoints.reached.length, 2);
  assert.deepEqual(createSave({}).get('story', null), advanced);
  assert.equal(adventure.importString(createSave({}).exportString(), { reload: false }), true);
  assert.deepEqual(read().sections.story, advanced);
  assert.deepEqual(read().sections.futureSection, ['arbitrary', 'payload']);
});

test('commit failure rolls back memory and dirty flush failures retry without replacing unrelated sections', t => {
  const { read, fail, replace } = mockSaveStorage(t, {
    version: 2, sections: { story: { version: 2, beat: 'complete' }, vitals: { level: 7 } },
  });
  const save = createSave({});
  save.set('vitals', { level: 9 });
  const oldStory = save.get('story');
  fail('QuotaExceededError');
  assert.equal(save.commitSection('story', { version: 2, beat: 'arrival' }).ok, false);
  assert.deepEqual(save.get('story'), oldStory);
  assert.equal(save.flush(), false);
  assert.equal(save.getWriteCount(), 0);
  assert.deepEqual(save.getStatus(), { ok: false, error: 'storage-unavailable' });
  assert.equal(read().sections.vitals.level, 7);

  fail('SecurityError');
  assert.equal(save.flush(), false);
  fail(null);
  const fresh = read();
  fresh.sections.unknown = { metadata: true };
  replace(fresh);
  save.update(1);
  assert.equal(save.getWriteCount(), 1);
  assert.equal(read().sections.vitals.level, 9);
  assert.deepEqual(read().sections.story, oldStory);
  assert.deepEqual(read().sections.unknown, { metadata: true });
  assert.deepEqual(save.getStatus(), { ok: true });
});

test('future story payloads are opaque in adventure and future roots reject all mutations', t => {
  const futureStory = { version: 3, beat: 'future', arbitrary: [{ id: 17 }] };
  const root = { version: 2, sections: { story: futureStory, vitals: { level: 7 } } };
  const { read, replace } = mockSaveStorage(t, root);
  const adventure = createSave({});
  const story = createSave({}, { writableSections: ['story'] });
  adventure.set('vitals', { level: 8 });
  assert.equal(adventure.flush(), true);
  assert.equal(story.commitSection('story', { version: 2, beat: 'prologue' }).ok, false);
  const olderBackup = JSON.stringify({ version: 2, sections: { story: { version: 2, beat: 'prologue' } } });
  for (const save of [adventure, story]) {
    assert.equal(save.reset(), false);
    assert.equal(save.importString(olderBackup, { reload: false }), false);
    assert.deepEqual(save.getStatus(), { ok: false, error: 'unsupported-story-version' });
  }
  assert.deepEqual(read().sections.story, futureStory);

  const futureRoot = { version: 3, data: ['unrecognized', 'shape'] };
  replace(futureRoot);
  adventure.set('vitals', { level: 9 });
  assert.equal(adventure.flush(), false);
  assert.equal(adventure.isReadOnly(), true);
  assert.equal(adventure.reset(), false);
  assert.equal(adventure.importString(JSON.stringify(root), { reload: false }), false);
  const reopened = createSave({});
  assert.equal(reopened.isReadOnly(), true);
  assert.equal(reopened.flush(), false);
  assert.equal(reopened.commitSection('story', { version: 2 }).ok, false);
  assert.deepEqual(JSON.parse(reopened.exportString()), futureRoot);
  assert.deepEqual(read(), futureRoot);
});

test('explicit reset and import replace their own sections without reviving removed data', t => {
  const { read } = mockSaveStorage(t, {
    version: 2, sections: { story: { version: 1 }, settings: { lang: 'en' }, dungeon: { depth: 1 } },
  });
  const adventure = createSave({});
  const story = createSave({}, { writableSections: ['story'] });
  let depth = 1;
  adventure.register('dungeon', () => ({ depth }));
  depth = 2;
  adventure.markDirty('dungeon');
  assert.equal(adventure.reset(), true);
  adventure.set('vitals', { level: 1 });
  assert.equal(adventure.flush(), true);
  assert.deepEqual(read().sections, { settings: { lang: 'en' }, vitals: { level: 1 } });
  assert.equal(story.importString(JSON.stringify({
    version: 2, sections: { story: { version: 1, beat: 'arrival' }, settings: { lang: 'zh' } },
  }), { reload: false }), true);
  assert.equal(read().sections.settings.lang, 'en');
  assert.equal(read().sections.story.beat, 'arrival');
  assert.equal(story.reset(), true);
  assert.deepEqual(read().sections, { settings: { lang: 'en' }, vitals: { level: 1 } });
});
