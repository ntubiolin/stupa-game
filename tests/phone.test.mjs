import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  identityStep, prologueChoices, prologueTurns, selectPrologueReply,
} from '../src/data/story/phonePrologue.js';
import { canReadReturnDiary, visiblePhoneRecords } from '../src/data/story/phoneRecords.js';
import { i18n } from '../src/i18n.js';
import '../src/i18n/storyPhone.js';

test('the fixed conversation rejects out-of-sequence replies and exposes no completion early', () => {
  let replies = [];
  assert.equal(selectPrologueReply(replies, 'voice'), replies);
  assert.equal(prologueChoices(replies), null);
  for (const turn of prologueTurns) {
    assert.equal(prologueChoices(replies), null);
    const selected = turn.replies.at(-1);
    replies = selectPrologueReply(replies, selected.id);
    assert.equal(replies.at(-1), selected);
  }
  assert.deepEqual(prologueChoices(replies), {
    'prologue.opening': 'hello',
    'prologue.report': 'how',
    'prologue.kyoto': 'private',
    'prologue.identity': 'now',
    'prologue.handover': 'task',
    'prologue.journey': 'why',
    'prologue.recording': 'voice',
  });
});

test('the first exchange preserves the original sequence and separates the proxy from Yingzhen', () => {
  const zh = i18n.getStrings().zh;
  assert.equal(zh[prologueTurns[0].messages[0]], '你那個五百字的 Word 報告打完了嗎？');
  assert.equal(zh[prologueTurns[1].messages[0]], '你還記得，我們在京都買的那盒立可帶嗎？');
  const disclosure = prologueTurns[identityStep - 1].messages.map(key => zh[key]);
  assert.equal(disclosure[1], '我不是她。');
  assert.match(disclosure[2], /數位代理/);
  assert.equal(zh['phone.recording.line'], '欸，你走快一點啦。');
});

test('the library follows director evidence across tabs, and only return permits diary acknowledgment', () => {
  const story = { beat: 'prologue', evidence: [] };
  for (const tab of ['photos', 'diary', 'evidence']) {
    assert.deepEqual(visiblePhoneRecords(story, tab), []);
  }
  story.beat = 'restoration';
  story.evidence.push('train-recording', 'restoration-record', 'stone-record');
  const ids = (tab) => visiblePhoneRecords(story, tab).map(({ id }) => id);
  assert.deepEqual(ids('photos'), ['restoration-record', 'stone-record']);
  assert.deepEqual(ids('diary'), []);
  assert.deepEqual(ids('evidence'), ['train-recording', 'restoration-record', 'stone-record']);
  story.beat = 'return';
  assert.equal(canReadReturnDiary(story, 'new-diary'), false);
  story.evidence.push('old-map', 'new-diary');
  assert.deepEqual(ids('diary'), ['new-diary']);
  assert.equal(canReadReturnDiary(story, 'old-map'), false);
  assert.equal(canReadReturnDiary(story, 'new-diary'), true);
  story.beat = 'complete';
  assert.deepEqual(ids('diary'), ['new-diary']);
  assert.equal(canReadReturnDiary(story, 'new-diary'), false);
});
