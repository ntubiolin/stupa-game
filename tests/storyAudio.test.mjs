import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBus } from '../src/core/events.js';
import { MUSIC_TRACKS, MUSIC_STINGERS } from '../src/data/music.js';
import { STORY_BEATS } from '../src/data/story/beats.js';
import { CHAPTERS } from '../src/data/story/chapters.js';
import {
  createStoryAudio,
  resolveBeatAudio,
  resolveChapterAudio,
} from '../src/story/storyAudio.js';

function createMockBarApi(bar, loop = 0) {
  const calls = [];
  const noop = (name) => (...args) => calls.push([name, ...args]);
  return {
    bar,
    loop,
    calls,
    rand: (min = 0, max = 1) => (min + max) * 0.5,
    chance: () => true,
    pick: (arr) => arr[0],
    tanpura: noop('tanpura'),
    pluck: noop('pluck'),
    flute: noop('flute'),
    gyaling: noop('gyaling'),
    dungchen: noop('dungchen'),
    bowl: noop('bowl'),
    tingsha: noop('tingsha'),
    yakBell: noop('yakBell'),
    nga: noop('nga'),
    damaru: noop('damaru'),
    tabla: noop('tabla'),
    cymbal: noop('cymbal'),
    chant: noop('chant'),
    mantraVoice: noop('mantraVoice'),
    rainDrop: noop('rainDrop'),
    chime: noop('chime'),
    thunder: noop('thunder'),
    line: noop('line'),
  };
}

test('story suite tracks exist in MUSIC_TRACKS and execute 16 bars cleanly', () => {
  const storyTrackIds = ['story.mirror', 'story.memory', 'story.terma', 'story.finale'];
  for (const id of storyTrackIds) {
    const track = MUSIC_TRACKS[id];
    assert.ok(track, `missing track ${id}`);
    assert.equal(typeof track.title?.zh, 'string');
    assert.equal(typeof track.title?.en, 'string');
    assert.equal(track.loopBars, 16);
    for (let bar = 0; bar < track.loopBars; bar++) {
      const api = createMockBarApi(bar, 0);
      track.bar(api, { night: true, intimate: bar < 8 });
      assert.ok(api.calls.length > 0, `${id} bar ${bar} produced musical events`);
    }
  }
});

test('all STORY_BEATS and CHAPTERS checkpoints resolve to valid tracks and stingers', () => {
  for (const beat of STORY_BEATS) {
    const cue = resolveBeatAudio(beat.id);
    assert.ok(MUSIC_TRACKS[cue.trackId], `invalid track ${cue.trackId} for beat ${beat.id}`);
    if (cue.stinger) {
      assert.ok(MUSIC_STINGERS[cue.stinger], `invalid stinger ${cue.stinger} for beat ${beat.id}`);
    }
  }

  for (const chapter of CHAPTERS) {
    for (const checkpoint of chapter.checkpoints) {
      const cue = resolveChapterAudio(chapter.id, checkpoint.id);
      assert.ok(
        MUSIC_TRACKS[cue.trackId],
        `invalid track ${cue.trackId} for ${chapter.id}:${checkpoint.id}`,
      );
      if (cue.stinger) {
        assert.ok(
          MUSIC_STINGERS[cue.stinger],
          `invalid stinger ${cue.stinger} for ${chapter.id}:${checkpoint.id}`,
        );
      }
    }
  }

  // Verify key emotional transitions across the 6 chapters
  assert.equal(resolveChapterAudio('pharping', 'spring1').trackId, 'pharping.drought');
  assert.equal(resolveChapterAudio('pharping', 'release').trackId, 'pharping.rain');
  assert.equal(resolveChapterAudio('mangyul', 'message').trackId, 'story.mirror');
  assert.equal(resolveChapterAudio('mangyul', 'altar1').trackId, 'mangyul.storm');
  assert.equal(resolveChapterAudio('mangyul', 'answer').trackId, 'mangyul.calm');
  assert.equal(resolveChapterAudio('yarlung', 'observe').trackId, 'yarlung.unrest');
  assert.equal(resolveChapterAudio('yarlung', 'guardian').trackId, 'yarlung.calm');
  assert.equal(resolveChapterAudio('yarlung', 'memory').trackId, 'story.memory');
  assert.equal(resolveChapterAudio('samye', 'stone').trackId, 'samye.day');
  assert.equal(resolveChapterAudio('samye', 'night').trackId, 'samye.night');
  assert.equal(resolveChapterAudio('samye', 'hepori').trackId, 'samye.complete');
  assert.equal(resolveChapterAudio('chimphu', 'road').trackId, 'story.mirror');
  assert.equal(resolveChapterAudio('chimphu', 'light').trackId, 'story.terma');
  assert.equal(resolveChapterAudio('finale', 'letter1').trackId, 'story.finale');
  assert.equal(resolveChapterAudio('finale', 'letter1').vars.intimate, true);
  assert.equal(resolveChapterAudio('finale', 'decision').trackId, 'story.mirror');
  assert.equal(resolveChapterAudio('finale', 'lamp').trackId, 'story.finale');
  assert.equal(resolveChapterAudio('finale', 'lamp').vars.intimate, false);
  assert.equal(resolveChapterAudio('finale', 'complete').trackId, 'credits');
});

test('createStoryAudio transitions cleanly on bus events without AudioContext in Node', () => {
  const bus = createBus();
  const ctx = {
    bus,
    story: { getState: () => ({ beat: 'complete' }) },
  };
  const audio = createStoryAudio(ctx);
  assert.equal(ctx.storyAudio, audio);
  assert.equal(audio.isEnabled(), true);
  assert.equal(audio.getCurrentCue().trackId, 'story.mirror');

  bus.emit('story:chapter-change', { chapterId: 'chimphu', checkpointId: 'light' });
  assert.equal(audio.getCurrentCue().trackId, 'story.terma');

  bus.emit('story:chapter-exit', { chapterId: 'chimphu' });
  assert.equal(audio.getCurrentCue().trackId, 'stupa');

  audio.setEnabled(false);
  assert.equal(audio.isEnabled(), false);
  audio.bowl();
  audio.phoneChime('incoming');
  audio.pageTurn();
  audio.dispose();
});
