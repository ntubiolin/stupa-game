import assert from 'node:assert/strict';
import test from 'node:test';
import { YARLUNG_CHAPTER } from '../src/data/story/chapters/yarlung.js';
import { i18n } from '../src/i18n.js';
import { phoneThreads } from '../src/data/story/phoneThreads.js';

test('Yarlung retains saved checkpoint IDs and separates rescue from the evening phone exchange', () => {
  assert.deepEqual(YARLUNG_CHAPTER.checkpoints.map(({ id }) => id), [
    'observe', 'calm', 'stone1', 'pause', 'stone2', 'release', 'guardian',
    'memory', 'boundary', 'diary', 'complete',
  ]);
  const thread = phoneThreads.find(({ id }) => id === 'yarlung');
  assert.equal(thread.chapterId, 'yarlung');
  assert.equal(thread.checkpointId, 'boundary');
  assert.ok(thread.turns.length > 0);
});

test('Yarlung evening memory remains readable without invented recordings in both languages', () => {
  const { zh, en } = i18n.getStrings();
  for (const strings of [zh, en]) {
    for (const id of ['calm', 'pause', 'guardian', 'memory', 'boundary', 'diary']) {
      assert.ok(strings[`mirror.chapter.yarlung.${id}.body`]);
    }
  }
  assert.match(zh['mirror.chapter.yarlung.intro'], /墨跡.*野草.*名字/);
  assert.match(zh['mirror.chapter.yarlung.calm.body'], /半步.*呼吸/);
  assert.match(zh['mirror.chapter.yarlung.memory.body'], /十七秒.*大學宿舍.*短髮/);
  assert.match(zh['mirror.chapter.yarlung.memory.body'], /未提供原始影音/);
  assert.match(en['mirror.chapter.yarlung.memory.body'], /No original audiovisual recording/);
  assert.match(zh['mirror.chapter.yarlung.boundary.body'], /思念與愧疚/);
  assert.match(en['mirror.chapter.yarlung.boundary.body'], /longing and guilt/);
});
