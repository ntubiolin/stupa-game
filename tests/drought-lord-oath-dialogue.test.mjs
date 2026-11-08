import assert from 'node:assert/strict';
import test from 'node:test';
import { i18n } from '../src/i18n.js';
import '../src/i18n/bosses.js';
import '../src/i18n/ch1.js';
import '../src/i18n/ch2.js';
import '../src/i18n/ch3.js';
import '../src/i18n/ch4.js';
import { registerDroughtLordDialogue } from '../src/gameplay/bosses/droughtLord.js';
import { registerMigoiKingDialogue } from '../src/gameplay/bosses/migoiKing.js';
import { registerTenmaStormDialogue } from '../src/gameplay/bosses/tenmaStorm.js';
import { registerYarlhaShampoDialogue } from '../src/gameplay/bosses/yarlhaShampo.js';
import { registerPeharDialogue } from '../src/gameplay/bosses/pehar.js';
import { createDialogue } from '../src/ui/dialogue.js';

function installDomStub() {
  const elementsById = new Map();

  function makeElement(tag = 'div') {
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      _innerHTML: '',
      children: [],
      attributes: new Map(),
      listeners: new Map(),
      width: 144,
      height: 144,
      classList: {
        classes: new Set(),
        add(...tokens) {
          for (const t of tokens) this.classes.add(t);
        },
        remove(...tokens) {
          for (const t of tokens) this.classes.delete(t);
        },
        contains(token) {
          return this.classes.has(token);
        },
      },
      setAttribute(k, v) {
        this.attributes.set(k, String(v));
      },
      getAttribute(k) {
        return this.attributes.get(k) ?? null;
      },
      addEventListener(type, fn) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(fn);
      },
      appendChild(child) {
        this.children.push(child);
        if (child.id) elementsById.set(child.id, child);
        return child;
      },
      querySelector(sel) {
        if (sel.startsWith('#')) {
          const id = sel.slice(1);
          if (!elementsById.has(id)) {
            const sub = makeElement(id === 'dialogue-portrait' ? 'canvas' : 'div');
            sub.id = id;
            elementsById.set(id, sub);
          }
          return elementsById.get(id);
        }
        return makeElement('div');
      },
      getContext() {
        return null;
      },
    };
    Object.defineProperty(el, 'innerHTML', {
      get() {
        return this._innerHTML;
      },
      set(val) {
        this._innerHTML = String(val);
      },
    });
    return el;
  }

  const body = makeElement('body');
  const uiRoot = makeElement('div');
  uiRoot.id = 'ui';
  elementsById.set('ui', uiRoot);

  globalThis.document = {
    body,
    documentElement: { lang: 'zh-Hant' },
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    createElement(tag) {
      return makeElement(tag);
    },
  };

  globalThis.window = {
    addEventListener() {},
  };

  return { elementsById };
}

test('Drought Lord oath i18n keys resolve to localized text in both zh and en', () => {
  const keys = [
    'boss.droughtLord.name',
    'dlg.boss.droughtLord.oath.1',
    'dlg.boss.droughtLord.oath.2',
    'dlg.boss.droughtLord.oath.3',
    'dlg.boss.droughtLord.oath.4',
    'dlg.boss.droughtLord.oath.accept',
  ];

  for (const lang of ['zh', 'en']) {
    i18n.setLang(lang);
    for (const key of keys) {
      assert.equal(i18n.has(key), true, `Expected i18n.has('${key}') in ${lang}`);
      const translated = i18n.t(key);
      assert.notEqual(translated, key, `Expected '${key}' to translate in ${lang}`);
      assert.ok(translated.length > 0, `Expected non-empty translation for '${key}' in ${lang}`);
    }
  }
  i18n.setLang('zh');
});

test('boss.droughtLord.oath displays Drought Lord speaker, translated nodes, and sets ch1.rain on choice', () => {
  const { elementsById } = installDomStub();
  const flags = new Map();
  const events = [];

  const ctx = {
    state: { uiOpen: false, zone: 'pharping' },
    bus: {
      emit(name, payload) {
        events.push({ name, payload });
      },
    },
    i18n,
    quests: {
      hasFlag(f) {
        return Boolean(flags.get(f));
      },
      setFlag(f, val = true) {
        flags.set(f, val);
      },
    },
  };

  const dialogue = createDialogue(ctx);
  registerDroughtLordDialogue(ctx);

  i18n.setLang('zh');
  const opened = dialogue.open('boss.droughtLord.oath', {
    speakerKey: 'boss.droughtLord.name',
  });
  assert.equal(opened, true);
  assert.equal(dialogue.isOpen(), true);

  const speakerEl = elementsById.get('dialogue-speaker');
  const textEl = elementsById.get('dialogue-text');
  const choicesEl = elementsById.get('dialogue-choices');

  // Verify speaker is 旱障魔主 (NOT 老喇嘛・洛桑)
  assert.equal(speakerEl.textContent, '旱障魔主');
  assert.notEqual(speakerEl.textContent, '老喇嘛・洛桑');

  // Step through n1 -> n2 -> n3 -> n4
  const expectedKeys = [
    'dlg.boss.droughtLord.oath.1',
    'dlg.boss.droughtLord.oath.2',
    'dlg.boss.droughtLord.oath.3',
    'dlg.boss.droughtLord.oath.4',
  ];

  for (let i = 0; i < expectedKeys.length; i++) {
    const key = expectedKeys[i];
    assert.equal(dialogue.state().nodeId, `n${i + 1}`);
    dialogue.skip();
    assert.equal(textEl.innerHTML, i18n.t(key));
    assert.equal(textEl.innerHTML.includes('dlg.boss.droughtLord'), false);

    if (i < expectedKeys.length - 1) {
      dialogue.advance();
    }
  }

  // At n4, verify choice button label is translated (not raw key)
  const st = dialogue.state();
  assert.equal(st.choices.length, 1);
  assert.equal(st.choices[0].text, '「願汝謹守金剛誓言，護持山谷蒼生。」');
  assert.equal(choicesEl.innerHTML.includes('dlg.boss.droughtLord.oath.accept'), false);
  assert.equal(choicesEl.innerHTML.includes('「願汝謹守金剛誓言，護持山谷蒼生。」'), true);

  // Verify switching language to English updates speaker, text, and choice label
  i18n.setLang('en');
  assert.equal(speakerEl.textContent, 'Drought Lord');
  assert.equal(dialogue.state().choices[0].text, '"Keep your Vajra oath and guard the beings of this valley."');

  // Select choice 0 -> sets ch1.rain flag and closes dialogue
  i18n.setLang('zh');
  assert.equal(flags.get('ch1.rain'), undefined);
  const chosen = dialogue.selectChoice(0);
  assert.equal(chosen, true);
  assert.equal(flags.get('ch1.rain'), true);
  assert.equal(dialogue.isOpen(), false);
});

test('All boss oath dialogues register and resolve their speaker and text without raw keys', () => {
  const { elementsById } = installDomStub();
  const ctx = {
    state: { uiOpen: false },
    bus: { emit() {} },
    i18n,
    quests: { hasFlag: () => false, setFlag() {} },
    codex: { unlock() {} },
  };

  const dialogue = createDialogue(ctx);
  registerMigoiKingDialogue(ctx);
  registerDroughtLordDialogue(ctx);
  registerTenmaStormDialogue(ctx);
  registerYarlhaShampoDialogue(ctx);
  registerPeharDialogue(ctx);

  const cases = [
    { id: 'boss.migoiKing.oath', speakerKey: 'boss.migoiKing.name', expectedZh: '雪人王・岡仁之怒' },
    { id: 'boss.droughtLord.oath', speakerKey: 'boss.droughtLord.name', expectedZh: '旱障魔主' },
    { id: 'boss.tenmaStorm.oath', speakerKey: 'boss.tenmaStorm.name', expectedZh: '十二丹瑪之風暴' },
    { id: 'boss.yarlhaShampo.oath', speakerKey: 'boss.yarlhaShampo.name', expectedZh: '雅拉香波白犛牛' },
    { id: 'boss.pehar.oath', speakerKey: 'boss.pehar.name', expectedZh: '白哈爾王' },
  ];

  i18n.setLang('zh');
  const speakerEl = elementsById.get('dialogue-speaker');
  const textEl = elementsById.get('dialogue-text');

  for (const lang of ['zh', 'en']) {
    i18n.setLang(lang);
    for (const c of cases) {
      assert.equal(dialogue.open(c.id, { speakerKey: c.speakerKey }), true, `Should open ${c.id} in ${lang}`);
      if (lang === 'zh') {
        assert.equal(speakerEl.textContent, c.expectedZh, `Speaker for ${c.id}`);
      } else {
        assert.equal(speakerEl.textContent.startsWith('boss.'), false, `Speaker for ${c.id} in en`);
        assert.equal(speakerEl.textContent.startsWith('npc.'), false, `Speaker for ${c.id} in en`);
      }

      let steps = 0;
      while (dialogue.isOpen() && steps < 10) {
        steps++;
        dialogue.skip();
        assert.equal(textEl.innerHTML.includes('dlg.boss.'), false, `No raw dlg.boss.* key in ${c.id} (${lang})`);
        assert.equal(textEl.innerHTML.includes('boss.'), false, `No raw boss.* key in ${c.id} (${lang})`);
        const st = dialogue.state();
        if (st.choices.length > 0) {
          for (const ch of st.choices) {
            assert.notEqual(ch.text, ch.textKey, `Choice in ${c.id} (${lang}) must be translated`);
            assert.equal(ch.text.includes('dlg.boss.'), false);
          }
          dialogue.selectChoice(0);
        } else {
          dialogue.advance();
        }
      }
      assert.equal(dialogue.isOpen(), false, `${c.id} should close after stepping through in ${lang}`);
    }
  }
  i18n.setLang('zh');
});
