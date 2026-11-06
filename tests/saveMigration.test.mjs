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
