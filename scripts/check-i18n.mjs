#!/usr/bin/env node
/**
 * i18n Integrity Checker (`scripts/check-i18n.mjs`) — Issue #37
 *
 * Verifies:
 *   1. Every key registered in `zh-Hant` (`STRINGS.zh`) also exists in `en` (`STRINGS.en`), and vice versa.
 *   2. All i18n keys referenced in `src/config.js`, `src/data/**`, `index.html`, and `src/ui/**` (`*Key` fields,
 *      dialogue `speaker`/`text`/`label`, and `data-i18n` attributes) are defined in both `zh-Hant` and `en`.
 *   3. Exits with non-zero status (1) if any missing keys are found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { i18n } from '../src/i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function walkFiles(dir, ext = '.js') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

// 1. Load all i18n modules in src/i18n/*.js
const i18nDir = path.join(ROOT, 'src', 'i18n');
for (const file of walkFiles(i18nDir, '.js')) {
  await import(pathToFileURL(file).href);
}

const strings = i18n.getStrings();
const zhDict = strings.zh || {};
const enDict = strings.en || {};

const zhKeys = new Set(Object.keys(zhDict));
const enKeys = new Set(Object.keys(enDict));

const missingInEn = [];
const missingInZh = [];

for (const k of zhKeys) {
  if (!enKeys.has(k) || typeof enDict[k] !== 'string' || enDict[k].trim() === '') {
    missingInEn.push(k);
  }
}
for (const k of enKeys) {
  if (!zhKeys.has(k) || typeof zhDict[k] !== 'string' || zhDict[k].trim() === '') {
    missingInZh.push(k);
  }
}

// 2. Scan data files (`src/config.js`, `src/data/**`, `src/gameplay/bosses/**`) and HTML/UI `data-i18n`
const referencedKeys = new Map(); // key -> Set<sourceFile>
function recordRef(key, relFile) {
  if (!key || typeof key !== 'string') return;
  // Ignore template expressions or non-key strings
  if (key.includes('${') || key.includes(' ') || key.length < 3) return;
  if (!referencedKeys.has(key)) referencedKeys.set(key, new Set());
  referencedKeys.get(key).add(relFile);
}

const KEY_PROP_NAMES = new Set([
  'nameKey',
  'titleKey',
  'descKey',
  'textKey',
  'labelKey',
  'hintKey',
  'bodyKey',
  'subtitleKey',
  'regionKey',
  'powerDescKey',
  'loreKey',
  'kickerKey',
  'subKey',
  'oathKey',
  'speakerKey',
  'promptKey',
]);

function inspectValue(val, relFile, parentKey = '') {
  if (!val) return;
  if (Array.isArray(val)) {
    for (const item of val) inspectValue(item, relFile, parentKey);
    return;
  }
  if (typeof val === 'object') {
    for (const [k, v] of Object.entries(val)) {
      if (typeof v === 'string') {
        if (KEY_PROP_NAMES.has(k)) {
          recordRef(v, relFile);
        } else if (
          (k === 'text' || k === 'label' || k === 'speaker' || k === 'dialogue') &&
          /^(dlg\.|npc\.|boss\.|quest\.|codex\.|map\.|waypoint\.|skill\.|item)/.test(v)
        ) {
          recordRef(v, relFile);
        }
      } else if (v && typeof v === 'object') {
        inspectValue(v, relFile, k);
      }
    }
  }
}

const dataFiles = [
  path.join(ROOT, 'src', 'config.js'),
  ...walkFiles(path.join(ROOT, 'src', 'data'), '.js'),
];

for (const file of dataFiles) {
  const rel = path.relative(ROOT, file);
  // Skip untracked music.js if present
  if (rel.endsWith('music.js')) continue;
  const mod = await import(pathToFileURL(file).href);
  for (const expVal of Object.values(mod)) {
    inspectValue(expVal, rel);
  }
}

// Also scan `index.html` and `src/**/*.js` for `data-i18n="key"`, `i18n.t('key')`, and `*Key: 'key'`
const allSourceFiles = [
  path.join(ROOT, 'index.html'),
  ...walkFiles(path.join(ROOT, 'src'), '.js'),
];
const dataI18nRegex = /data-i18n=["']([a-zA-Z0-9_.-]+)["']/g;
const i18nCallRegex = /i18n(?:\?\.|\.)t(?:\?\.)?\(\s*["']([a-zA-Z0-9_.-]+)["']/g;
const keyPropRegex =
  /\b(?:nameKey|titleKey|descKey|textKey|labelKey|hintKey|bodyKey|subtitleKey|regionKey|powerDescKey|loreKey|kickerKey|subKey|oathKey|speakerKey|promptKey)\s*:\s*["']([a-zA-Z0-9_.-]+)["']/g;

for (const file of allSourceFiles) {
  if (!fs.existsSync(file)) continue;
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = dataI18nRegex.exec(content)) !== null) {
    recordRef(match[1], rel);
  }
  while ((match = i18nCallRegex.exec(content)) !== null) {
    if (!match[1].endsWith('.')) recordRef(match[1], rel);
  }
  while ((match = keyPropRegex.exec(content)) !== null) {
    if (!match[1].endsWith('.')) recordRef(match[1], rel);
  }
}

const undefinedRefs = [];
for (const [key, files] of referencedKeys.entries()) {
  const inZh = zhKeys.has(key);
  const inEn = enKeys.has(key);
  if (!inZh || !inEn) {
    undefinedRefs.push({
      key,
      inZh,
      inEn,
      files: Array.from(files).join(', '),
    });
  }
}

console.log(`[check:i18n] Registered keys: zh-Hant=${zhKeys.size}, en=${enKeys.size}`);
console.log(`[check:i18n] Data/UI referenced keys checked: ${referencedKeys.size}`);

let hasError = false;
if (missingInEn.length > 0) {
  hasError = true;
  console.error(`\n❌ Missing in 'en' (${missingInEn.length}):`);
  for (const k of missingInEn) console.error(`  - ${k}`);
}
if (missingInZh.length > 0) {
  hasError = true;
  console.error(`\n❌ Missing in 'zh-Hant' (${missingInZh.length}):`);
  for (const k of missingInZh) console.error(`  - ${k}`);
}
if (undefinedRefs.length > 0) {
  hasError = true;
  console.error(`\n❌ Referenced keys missing from i18n tables (${undefinedRefs.length}):`);
  for (const item of undefinedRefs) {
    console.error(`  - ${item.key} (zh:${item.inZh}, en:${item.inEn}) referenced in [${item.files}]`);
  }
}

if (hasError) {
  process.exit(1);
}

console.log('✅ [check:i18n] All i18n keys exist in both zh-Hant and en, and all data/UI references are defined!');
