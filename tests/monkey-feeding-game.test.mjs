import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MONKEY_FRUITS,
  createMonkeyFeedingSession,
  updateMonkeyGameProgress,
} from '../src/gameplay/monkeyFeedingGame.js';

test('fruit requests avoid immediate repeats and finish after five choices', () => {
  const session = createMonkeyFeedingSession({ rounds: 5, random: () => 0 });
  const seen = [];
  while (!session.getState().finished) {
    const state = session.getState();
    seen.push(state.request);
    session.choose(state.request);
  }
  assert.deepEqual(seen, ['banana', 'apple', 'banana', 'apple', 'banana']);
  assert.deepEqual(session.getState(), {
    round: 5, rounds: 5, correct: 5, affection: 10, finished: true, request: null,
  });
  assert.equal(session.choose('banana'), null);
});

test('wrong and invalid fruit choices cannot inflate affection', () => {
  const session = createMonkeyFeedingSession({ rounds: 2, random: () => 0 });
  assert.equal(session.choose('durian'), null);
  assert.equal(session.getState().round, 0);
  const wrong = session.choose('peach');
  assert.equal(wrong.accepted, false);
  assert.equal(wrong.affection, 0);
  assert.equal(session.choose('apple').accepted, true);
  assert.equal(session.getState().affection, 2);
});

test('fruit catalog exposes exactly the keyboard-selectable choices', () => {
  assert.deepEqual(MONKEY_FRUITS.map(fruit => fruit.id), ['banana', 'apple', 'peach']);
});

test('saved progress increments plays without lowering the best score', () => {
  assert.deepEqual(updateMonkeyGameProgress({ bestScore: 4, plays: 2 }, { correct: 3 }), {
    bestScore: 4,
    plays: 3,
  });
  assert.deepEqual(updateMonkeyGameProgress(null, { correct: 5 }), { bestScore: 5, plays: 1 });
});
