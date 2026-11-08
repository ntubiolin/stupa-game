import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { CHAPTER_STILLS, createChapterStill, getChapterStill } from '../src/ui/story/chapterStills.js';
import { i18n } from '../src/i18n.js';
import '../src/i18n/storyChapters.js';

class Element extends EventTarget {
  constructor(tag) {
    super();
    this.tag = tag;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
  }
  append(...children) { this.children.push(...children); }
  set src(value) { this.attributes.src = value; }
  removeAttribute(key) { delete this.attributes[key]; }
  remove() { this.removed = true; }
}

function harness(t) {
  const original = globalThis.document;
  globalThis.document = { createElement: tag => new Element(tag) };
  t.after(() => {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  });
}

test('all nine chapter stills mount lazily only for their mapped card bodyKey, with captions below art', t => {
  harness(t);
  assert.equal(Object.keys(CHAPTER_STILLS).length, 9);
  assert.equal(getChapterStill('chapter.yarlung.pause.body'), null);
  assert.equal(createChapterStill('chapter.yarlung.pause.body', key => key), null);

  for (const [bodyKey, spec] of Object.entries(CHAPTER_STILLS)) {
    const still = createChapterStill(bodyKey, key => `mirror.${key}`);
    assert(still, `expected still for ${bodyKey}`);
    assert.equal(still.element.className, 'story-chapter-still');
    assert.equal(still.element.dataset.still, spec.id);
    const [image, fallback, caption] = still.element.children;
    assert.equal(image.attributes.src, spec.src);
    assert.equal(image.width, 1920);
    assert.equal(image.height, 1080);
    assert.equal(image.alt, `mirror.${spec.key}.alt`);
    assert.equal(image.hidden, false);
    assert.equal(fallback.hidden, true);
    assert.equal(caption.tag, 'figcaption');
    assert.equal(caption.textContent, `mirror.${spec.key}.caption`);
  }
});

test('load failure and absent source fall back cleanly without state callbacks', t => {
  harness(t);
  const failed = createChapterStill('chapter.yarlung.calm.body', key => `mirror.${key}`);
  const [image, fallback] = failed.element.children;
  image.dispatchEvent(new Event('error'));
  assert.equal(image.hidden, true);
  assert.equal(fallback.hidden, false);
  assert.equal(fallback.textContent, 'mirror.chapter.still.yarlungHeld.fallback');

  const absent = createChapterStill('chapter.finale.lampPrayer.body', key => key, { src: null });
  assert.equal(absent.element.children[0].attributes.src, undefined);
  assert.equal(absent.element.children[0].hidden, true);
  assert.equal(absent.element.children[1].hidden, false);
  assert.deepEqual(Object.keys(absent), ['element', 'dispose']);
});

test('disposal is idempotent and releases source and error listener before reopening', t => {
  harness(t);
  const still = createChapterStill('chapter.samye.hepori.body', key => key);
  const [image, fallback] = still.element.children;
  still.dispose();
  still.dispose();
  assert.equal(still.element.removed, true);
  assert.equal(image.attributes.src, undefined);
  image.dispatchEvent(new Event('error'));
  assert.equal(fallback.hidden, true);

  const reopened = createChapterStill('chapter.samye.hepori.body', key => key);
  assert.notEqual(reopened.element, still.element);
  assert.equal(reopened.element.children[0].attributes.src, CHAPTER_STILLS['chapter.samye.hepori.body'].src);
});

test('both languages provide alt, provenance caption and fallback strings for all nine stills', () => {
  const strings = i18n.getStrings();
  for (const spec of Object.values(CHAPTER_STILLS)) {
    for (const lang of ['zh', 'en']) {
      for (const suffix of ['alt', 'caption', 'fallback']) {
        const value = strings[lang][`mirror.${spec.key}.${suffix}`];
        assert.equal(typeof value, 'string', `missing ${lang} mirror.${spec.key}.${suffix}`);
        assert(value.trim(), `empty ${lang} mirror.${spec.key}.${suffix}`);
      }
    }
    assert.doesNotMatch(strings.en[`mirror.${spec.key}.caption`], /not a historical photograph|AI-generated/i);
    assert.doesNotMatch(strings.zh[`mirror.${spec.key}.caption`], /非歷史照片|AI 生成/);
  }
});

test('approved chapter exports match manifest bytes, hashes, budgets and sanitized provenance', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/story/manifest.json', import.meta.url), 'utf8'));
  const legacyBytes = (await readFile(new URL('../public/story/restoration-memory.jpg', import.meta.url))).length;
  const totalBytes = legacyBytes + manifest.assets.reduce((sum, asset) => sum + (asset.bytes || 0), 0);
  assert(totalBytes <= manifest.budgets.totalMediaBytes, `total media ${totalBytes} exceeds budget ${manifest.budgets.totalMediaBytes}`);

  const provenance = await readFile(new URL('../docs/story/chapter-stills-114.md', import.meta.url), 'utf8');
  assert.doesNotMatch(provenance, /drive\.google\.com|\/file\/d\//);
  assert.match(provenance, /exact underlying model version was not exposed/);
  assert.match(provenance, /1672 × 941/);

  for (const spec of Object.values(CHAPTER_STILLS)) {
    const relativePath = spec.src.replace(/^\/story\//, '');
    const entry = manifest.assets.find(asset => asset.path === relativePath);
    assert(entry, `missing manifest entry for ${relativePath}`);
    const bytes = await readFile(new URL(`../public/story/${entry.path}`, import.meta.url));
    assert.equal(bytes.length, entry.bytes);
    assert(bytes.length < manifest.budgets.imageBytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    assert.equal(entry.notArchival, true);
    assert.equal(entry.lazy, true);
    assert.equal(entry.review, 'docs/story/chapter-stills-114.md');
    assert.doesNotMatch(JSON.stringify(entry), /drive\.google\.com|\/file\/d\//);
    assert.match(provenance, new RegExp(entry.sha256));
  }
});
