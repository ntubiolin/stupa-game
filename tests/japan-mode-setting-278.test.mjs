import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { i18n } from '../src/i18n.js';
import '../src/i18n/settings.js';
import {
  JAPAN_MODES,
  normalizeJapanMode,
  isJapanModeEnabled,
} from '../src/ui/settings.js';
import { WORLD_ROUTE_NODES } from '../src/ui/worldmap.js';

test('1. normalizeJapanMode and isJapanModeEnabled default to off and enable on "on" (#278)', () => {
  assert.deepEqual(JAPAN_MODES, ['off', 'on']);
  assert.equal(normalizeJapanMode(undefined), 'off');
  assert.equal(normalizeJapanMode(null), 'off');
  assert.equal(normalizeJapanMode('off'), 'off');
  assert.equal(normalizeJapanMode(false), 'off');
  assert.equal(normalizeJapanMode('on'), 'on');
  assert.equal(normalizeJapanMode(true), 'on');

  const ctxOff = {
    state: { zone: 'stupa' },
    save: { get: () => ({}) },
  };
  assert.equal(isJapanModeEnabled(ctxOff), false);

  const ctxOn = {
    state: { zone: 'stupa' },
    save: { get: () => ({ japanMode: 'on' }) },
  };
  assert.equal(isJapanModeEnabled(ctxOn), true);

  const ctxInToji = {
    state: { zone: 'toji' },
    save: { get: () => ({ japanMode: 'off' }) },
  };
  assert.equal(isJapanModeEnabled(ctxInToji), true);
});

test('2. WORLD_ROUTE_NODES marks toji and koyasan as japanOnly (#278)', () => {
  const tojiNode = WORLD_ROUTE_NODES.find((n) => n.id === 'toji');
  const koyasanNode = WORLD_ROUTE_NODES.find((n) => n.id === 'koyasan');
  assert.ok(tojiNode, 'toji node exists in WORLD_ROUTE_NODES');
  assert.ok(koyasanNode, 'koyasan node exists in WORLD_ROUTE_NODES');
  assert.equal(tojiNode.japanOnly, true);
  assert.equal(koyasanNode.japanOnly, true);
});

test('3. Bilingual i18n keys for settings.japanMode are registered (#278)', () => {
  const keys = [
    'settings.japanMode',
    'settings.japanMode.off',
    'settings.japanMode.on',
    'settings.japanMode.offHint',
    'settings.japanMode.onHint',
    'settings.japanMode.tryToji',
    'settings.japanMode.tryKoyasan',
  ];
  for (const lang of ['zh-Hant', 'en']) {
    i18n.setLang(lang);
    for (const key of keys) {
      const val = i18n.t(key);
      assert.ok(val && val !== key, `Missing i18n translation for ${key} in ${lang}`);
    }
  }
});

test('4. settings.js and worldmap.js wire japanMode toggle and visibility (#278)', () => {
  const settingsJs = fs.readFileSync(path.resolve('src/ui/settings.js'), 'utf8');
  const worldmapJs = fs.readFileSync(path.resolve('src/ui/worldmap.js'), 'utf8');
  const styleCss = fs.readFileSync(path.resolve('src/style.css'), 'utf8');

  assert.match(settingsJs, /id="settings-japan-mode"/);
  assert.match(settingsJs, /name="japanMode"/);
  assert.match(worldmapJs, /kukai-quick-travel-bar is-hidden/);
  assert.match(worldmapJs, /if \(n\.japanOnly && !jpEnabled\) return false;/);
  assert.match(styleCss, /\.kukai-quick-travel-bar\.is-hidden\s*\{\s*display:\s*none\s*!important;\s*\}/);
});
