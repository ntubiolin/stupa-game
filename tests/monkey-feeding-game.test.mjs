import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MONKEY_FRUITS,
  createMonkeyFeedingGame,
  createMonkeyFeedingSession,
  updateMonkeyGameProgress,
} from '../src/gameplay/monkeyFeedingGame.js';
import { createBus } from '../src/core/events.js';

function installDom(t) {
  const opener = { focusCalls: 0, isConnected: true, focus() { this.focusCalls += 1; } };
  class Element {
    constructor() {
      this.dataset = {};
      this.disabled = false;
      this.offsetParent = {};
      this.listeners = new Map();
      this.classList = { add() {}, remove() {} };
    }
    setAttribute() {}
    appendChild() {}
    addEventListener(type, fn) { this.listeners.set(type, fn); }
    querySelector() { return { focus() {}, isConnected: true }; }
    querySelectorAll() { return []; }
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      activeElement: opener,
      body: new Element(),
      head: new Element(),
      createElement: () => new Element(),
      getElementById: () => null,
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  });
  return opener;
}

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

test('modal lifecycle rewards once, releases UI ownership, and cancels on zone/import changes', t => {
  const opener = installDom(t);
  const bus = createBus();
  const state = { uiOpen: false };
  const sections = { monkeyGame: { bestScore: 0, plays: 0 } };
  const save = {
    get: (key, fallback) => sections[key] || fallback,
    set: (key, value) => { sections[key] = value; },
  };
  let feeds = 0;
  const game = createMonkeyFeedingGame({
    state,
    bus,
    save,
    i18n: { t: key => key, onChange() {} },
    input: { pressed: () => false },
  }, { onFeed: () => { feeds += 1; return true; }, random: () => 0 });

  assert.equal(game.open({ id: 'monkey-0' }), true);
  assert.equal(state.uiOpen, true);
  game.start();
  for (let i = 0; i < 5; i++) game.choose(game.getState().request);
  assert.equal(feeds, 1);
  assert.deepEqual(sections.monkeyGame, { bestScore: 5, plays: 1 });

  game.start();
  for (let i = 0; i < 5; i++) game.choose(game.getState().request);
  assert.equal(feeds, 1, 'replay cannot award a second feed in the same modal');
  assert.deepEqual(sections.monkeyGame, { bestScore: 5, plays: 2 });
  bus.emit('zone:change', { from: 'stupa', to: 'wild' });
  assert.equal(game.isOpen(), false);
  assert.equal(state.uiOpen, false);
  assert.equal(opener.focusCalls, 1);

  assert.equal(game.open({ id: 'monkey-1' }), true);
  game.start();
  bus.emit('save:imported');
  assert.equal(game.isOpen(), false);
  assert.equal(state.uiOpen, false);
  assert.equal(feeds, 1, 'an imported save cancels an unfinished reward');
});
