import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createLosangStill, LOSANG_STILL } from '../src/ui/story/losangStill.js';
import { i18n } from '../src/i18n.js';
import '../src/i18n/storyRuntime.js';

class Element extends EventTarget {
  constructor(tag) {
    super();
    this.tag = tag;
    this.children = [];
    this.attributes = {};
  }
  append(...children) { this.children.push(...children); }
  set src(value) { this.attributes.src = value; }
  removeAttribute(key) { delete this.attributes[key]; }
  remove() { this.removed = true; }
}

function harness(t, options) {
  const original = globalThis.document;
  globalThis.document = { createElement: tag => new Element(tag) };
  t.after(() => {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  });
  return createLosangStill(key => `mirror.${key}`, options);
}

test('still requests the local approved export only on construction, with captions after art', t => {
  const still = harness(t);
  const [image, fallback, caption] = still.element.children;
  assert.equal(image.attributes.src, LOSANG_STILL.src);
  assert.equal(image.width, 1664);
  assert.equal(image.height, 936);
  assert.equal(image.alt, 'mirror.losang.still.alt');
  assert.equal(image.hidden, false);
  assert.equal(fallback.hidden, true);
  assert.equal(caption.tag, 'figcaption');
  assert.equal(caption.textContent, 'mirror.losang.still.caption');
});

test('load failure and no source provide readable text without callbacks or state changes', t => {
  const failed = harness(t);
  const [image, fallback] = failed.element.children;
  image.dispatchEvent(new Event('error'));
  assert.equal(image.hidden, true);
  assert.equal(fallback.hidden, false);
  assert.equal(fallback.textContent, 'mirror.losang.still.fallback');
  const absent = createLosangStill(key => key, { src: null });
  assert.equal(absent.element.children[0].attributes.src, undefined);
  assert.equal(absent.element.children[0].hidden, true);
  assert.equal(absent.element.children[1].hidden, false);
  assert.deepEqual(Object.keys(absent), ['element', 'dispose']);
});

test('disposal is idempotent and releases source and error listener before reopening', t => {
  const still = harness(t);
  const [image, fallback] = still.element.children;
  still.dispose();
  still.dispose();
  assert.equal(still.element.removed, true);
  assert.equal(image.attributes.src, undefined);
  image.dispatchEvent(new Event('error'));
  assert.equal(fallback.hidden, true);
  const reopened = createLosangStill(key => key);
  assert.notEqual(reopened.element, still.element);
  assert.equal(reopened.element.children[0].attributes.src, LOSANG_STILL.src);
});

test('both languages provide alt, provenance and fallback strings', () => {
  const strings = i18n.getStrings();
  for (const lang of ['zh', 'en']) for (const suffix of ['alt', 'caption', 'fallback']) {
    const value = strings[lang][`mirror.losang.still.${suffix}`];
    assert.equal(typeof value, 'string');
    assert(value.trim());
  }
  assert.doesNotMatch(strings.en['mirror.losang.still.caption'], /not a historical photograph|AI-generated/i);
  assert.doesNotMatch(strings.zh['mirror.losang.still.caption'], /非歷史照片|AI 生成/);
});

test('game asset matches the approved bytes and sanitized provenance', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/story/manifest.json', import.meta.url)));
  const entry = manifest.assets.find(asset => asset.path === 'losang-map-handoff.webp');
  const bytes = await readFile(new URL(`../public/story/${entry.path}`, import.meta.url));
  assert.equal(bytes.length, entry.bytes);
  assert(bytes.length < manifest.budgets.imageBytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
  assert.equal(entry.notArchival, true);
  assert.equal(entry.lazy, true);
  const provenance = await readFile(new URL(`../${entry.review}`, import.meta.url), 'utf8');
  assert.doesNotMatch(JSON.stringify(entry) + provenance, /drive\.google\.com|\/file\/d\//);
  assert.match(provenance, /exact underlying model version was not exposed/);
});
