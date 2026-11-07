import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBus } from '../src/core/events.js';
import { createSave } from '../src/systems/save.js';
import { createStoryDirector } from '../src/story/storyDirector.js';
import { createChapterDirector } from '../src/story/chapterDirector.js';
import { CHAPTERS } from '../src/data/story/chapters.js';
import { phoneThreads, phoneReadFlag } from '../src/data/story/phoneThreads.js';

function harness(t, story) {
  const previous = globalThis.localStorage;
  let raw = JSON.stringify({ version: 2, sections: { story, adventureSentinel: { items: ['keep'] } } });
  globalThis.localStorage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  t.after(() => { globalThis.localStorage = previous; });
  function load() {
    const ctx = { bus: createBus(), prepareChapter: async () => true };
    createSave(ctx, { writableSections: ['story'] });
    createStoryDirector(ctx);
    createChapterDirector(ctx);
    ctx.story.start();
    return ctx;
  }
  return { load, saved: () => JSON.parse(raw).sections };
}

for (const ending of ['end', 'retain']) {
  test(`all six chapters resume every checkpoint with fixed phone exchanges and ${ending} ending`, async t => {
    const { load, saved } = harness(t, { version: 1, beat: 'complete', choices: {}, flags: {} });
    let ctx = load();
    for (const chapter of CHAPTERS) {
      assert.equal(await ctx.chapters.start(chapter.id), true);
      for (const step of chapter.checkpoints) {
        ctx = load();
        assert.equal(await ctx.chapters.resume(), true);
        assert.equal(ctx.chapters.getState().chapters[chapter.id].checkpointId, step.id);
        if (!step.signal) break;
        if (step.phoneThreadId) {
          const thread = phoneThreads.find(thread => thread.id === step.phoneThreadId);
          assert.equal(ctx.chapters.signal(step.signal, { checkpointId: step.id }), false, 'phone cannot be skipped');
          for (const turn of thread.turns) assert.equal(ctx.story.recordPhoneReply(thread.id, turn.id), true);
          assert.equal(ctx.story.acknowledgePhoneThread(thread.id), true);
          assert.equal(saved().story.flags[phoneReadFlag(thread.id)], true);
        }
        const choice = step.choices ? chapter.id === 'finale' ? ending : 'yes' : undefined;
        if (step.choices) {
          assert.equal(ctx.chapters.signal(step.signal, { checkpointId: step.id }), false);
          assert.equal(ctx.chapters.signal(step.signal, { checkpointId: step.id, choice: 'invalid' }), false);
        }
        assert.equal(ctx.chapters.signal(step.signal, { checkpointId: step.id, choice }), true);
      }
      assert.equal(ctx.chapters.getState().chapters[chapter.id].completed, true);
    }
    assert.equal(saved().story.journey.chapters.finale.choices.decision, ending);
    assert.equal(ctx.story.recordPhoneReply('hotel', '0'), false, 'proxy is silent after handover');
    assert.deepEqual(saved().adventureSentinel, { items: ['keep'] });
  });
}

test('older v2 advanced wind checkpoints remain intact while new wind records require the explicit answer', t => {
  const chapters = {
    pharping: { checkpointId: 'complete', completed: true, choices: {}, flags: {} },
    mangyul: { checkpointId: 'flags', completed: false, choices: {}, flags: {} },
  };
  const legacy = { version: 2, beat: 'complete', journey: { activeChapterId: 'mangyul', chapters } };
  const { load } = harness(t, legacy);
  assert.equal(load().story.getJourney().chapters.mangyul.checkpointId, 'flags');
  chapters.mangyul.flags.windAnswerRequired = true;
  const marked = harness(t, legacy);
  assert.equal(marked.load().story.getJourney().chapters.mangyul, undefined);
});
