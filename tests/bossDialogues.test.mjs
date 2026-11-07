import test from 'node:test';
import assert from 'node:assert/strict';
import { i18n } from '../src/i18n.js';
import '../src/i18n/bosses.js';
import '../src/i18n/npcs.js';
import '../src/i18n/quests.js';
import '../src/i18n/prologue.js';
import '../src/i18n/ch1.js';
import '../src/i18n/ch2.js';
import '../src/i18n/ch3.js';
import '../src/i18n/ch4.js';
import '../src/i18n/ch5.js';

import { createDialogue, parseDialogueTokens } from '../src/ui/dialogue.js';
import { MIGOI_KING_DEF, registerMigoiKingDialogue } from '../src/gameplay/bosses/migoiKing.js';
import { DROUGHT_LORD_DEF, registerDroughtLordDialogue } from '../src/gameplay/bosses/droughtLord.js';
import { TENMA_STORM_BOSS, registerTenmaStormDialogue } from '../src/gameplay/bosses/tenmaStorm.js';
import { YARLHA_SHAMPO_DEF, registerYarlhaShampoDialogue } from '../src/gameplay/bosses/yarlhaShampo.js';
import { PEHAR_BOSS, registerPeharDialogue } from '../src/gameplay/bosses/pehar.js';

import { PROLOGUE_DIALOGUES } from '../src/data/dialogues/prologue.js';
import { CH1_DIALOGUES } from '../src/data/dialogues/ch1.js';
import { CH2_DIALOGUES } from '../src/data/dialogues/ch2.js';
import { CH3_DIALOGUES } from '../src/data/dialogues/ch3.js';
import { CH4_DIALOGUES } from '../src/data/dialogues/ch4.js';
import { CH5_DIALOGUES } from '../src/data/dialogues/ch5.js';

function createMockDom() {
  const elementsById = new Map();

  function makeEl(tag = 'div', id = '') {
    const classSet = new Set();
    const el = {
      tagName: tag.toUpperCase(),
      id,
      textContent: '',
      _innerHTML: '',
      width: 144,
      height: 144,
      classList: {
        add: (...cls) => cls.forEach((c) => classSet.add(c)),
        remove: (...cls) => cls.forEach((c) => classSet.delete(c)),
        contains: (c) => classSet.has(c),
      },
      setAttribute: () => {},
      getAttribute: () => null,
      addEventListener: () => {},
      appendChild: (child) => child,
      getContext: () => ({
        clearRect: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        save: () => {},
        restore: () => {},
        stroke: () => {},
        clip: () => {},
        moveTo: () => {},
        quadraticCurveTo: () => {},
        closePath: () => {},
        lineTo: () => {},
        fillRect: () => {},
        ellipse: () => {},
        roundRect: () => {},
      }),
      querySelector: (sel) => {
        if (sel.startsWith('#')) {
          const targetId = sel.slice(1);
          if (!elementsById.has(targetId)) {
            elementsById.set(targetId, makeEl(targetId === 'dialogue-portrait' ? 'canvas' : 'div', targetId));
          }
          return elementsById.get(targetId);
        }
        return makeEl('div');
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
    if (id) elementsById.set(id, el);
    return el;
  }

  const body = makeEl('body', 'body');
  const ui = makeEl('div', 'ui');
  elementsById.set('ui', ui);

  const doc = {
    body,
    documentElement: { lang: 'zh-Hant' },
    getElementById: (id) => elementsById.get(id) || null,
    createElement: (tag) => makeEl(tag),
  };

  const win = {
    addEventListener: () => {},
    __stupa: {},
  };

  return { doc, win, elementsById };
}

function setupDialogueEnv(t) {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const { doc, win, elementsById } = createMockDom();
  globalThis.document = doc;
  globalThis.window = win;

  t.after(() => {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  });

  const flags = new Map();
  const ctx = {
    state: { uiOpen: false, zone: 'stupa' },
    bus: {
      emit: () => {},
      on: () => () => {},
    },
    i18n,
    quests: {
      hasFlag: (f) => Boolean(flags.get(f)),
      setFlag: (f, v = true) => flags.set(f, v),
      isActive: () => false,
      isDone: () => false,
      isAtStep: () => false,
      start: () => {},
      completeStep: () => {},
    },
    codex: {
      unlock: () => {},
    },
  };

  const dialogue = createDialogue(ctx);
  dialogue.register(CH1_DIALOGUES);
  dialogue.register(CH2_DIALOGUES);
  dialogue.register(CH3_DIALOGUES);
  dialogue.register(CH4_DIALOGUES);
  dialogue.register(CH5_DIALOGUES);

  registerMigoiKingDialogue(ctx);
  registerDroughtLordDialogue(ctx);
  registerTenmaStormDialogue(ctx);
  registerYarlhaShampoDialogue(ctx);
  registerPeharDialogue(ctx);

  return { ctx, dialogue, flags, elementsById };
}

const BOSS_CASES = [
  { def: MIGOI_KING_DEF, expectedFlag: 'boss.migoiKing' },
  { def: DROUGHT_LORD_DEF, expectedFlag: 'ch1.rain' },
  { def: TENMA_STORM_BOSS, expectedFlag: 'boss.tenmaStorm' },
  { def: YARLHA_SHAMPO_DEF, expectedFlag: 'boss.yarlhaShampo' },
  { def: PEHAR_BOSS, expectedFlag: null },
];

const RAW_KEY_PATTERN = /\b(?:dlg|boss|npc|quest|toast|prompt)\.[a-zA-Z0-9_.-]+/;

test('all boss oath dialogues resolve localized speaker names, node texts, choices, and actions in zh and en', (t) => {
  const { dialogue, flags, elementsById } = setupDialogueEnv(t);

  for (const lang of ['zh', 'en']) {
    i18n.setLang(lang);
    const oldLamaName = i18n.t('npc.oldLama');

    for (const { def, expectedFlag } of BOSS_CASES) {
      flags.clear();
      const oathId = def.oath?.dialogue;
      assert.ok(oathId, `Boss ${def.id} should define oath.dialogue`);

      const expectedBossName = i18n.t(def.nameKey);
      assert.notEqual(expectedBossName, def.nameKey, `Boss ${def.id} nameKey must be translated in ${lang}`);

      // Open dialogue the exact way bossBase.js does on first subjugation
      const opened = dialogue.open(oathId, { speakerKey: def.nameKey });
      assert.equal(opened, true, `Failed to open oath dialogue "${oathId}" for ${def.id}`);

      let steps = 0;
      while (dialogue.isOpen() && steps < 15) {
        steps++;
        dialogue.skip(); // finish typewriter to render full text

        const speakerRendered = elementsById.get('dialogue-speaker')?.textContent || '';
        const textHtml = elementsById.get('dialogue-text')?.innerHTML || '';
        const st = dialogue.state();

        // Speaker must never fall back to Old Lama Losang or raw key
        assert.notEqual(
          speakerRendered,
          oldLamaName,
          `[${lang}] ${oathId} node ${st.nodeId} speaker fell back to "${oldLamaName}" instead of Boss speaker`
        );
        assert.equal(
          RAW_KEY_PATTERN.test(speakerRendered),
          false,
          `[${lang}] ${oathId} node ${st.nodeId} rendered raw speaker key: "${speakerRendered}"`
        );

        // Node text must be non-empty, translated, and have no raw keys or unparsed [[codex:...]]
        assert.ok(textHtml.length > 0, `[${lang}] ${oathId} node ${st.nodeId} rendered empty text`);
        assert.equal(
          RAW_KEY_PATTERN.test(textHtml),
          false,
          `[${lang}] ${oathId} node ${st.nodeId} rendered raw i18n key in text: "${textHtml}"`
        );
        assert.equal(
          textHtml.includes('[[codex:'),
          false,
          `[${lang}] ${oathId} node ${st.nodeId} contains unparsed codex syntax: "${textHtml}"`
        );

        if (st.choices.length > 0) {
          for (const choice of st.choices) {
            assert.ok(choice.text && choice.text.length > 0, `[${lang}] ${oathId} choice has empty text`);
            assert.notEqual(
              choice.text,
              choice.textKey,
              `[${lang}] ${oathId} choice rendered raw key "${choice.textKey}"`
            );
            assert.equal(
              RAW_KEY_PATTERN.test(choice.text),
              false,
              `[${lang}] ${oathId} choice contains raw key: "${choice.text}"`
            );
          }
          dialogue.selectChoice(0);
        } else {
          dialogue.advance();
        }
      }

      assert.equal(dialogue.isOpen(), false, `[${lang}] ${oathId} should close after completing all nodes`);
      if (expectedFlag) {
        assert.equal(
          flags.get(expectedFlag),
          true,
          `[${lang}] ${oathId} accepting oath choice should set flag "${expectedFlag}"`
        );
      }
    }
  }
  i18n.setLang('zh');
});

test('all prologue and chapter dialogue trees have translated speakers, texts, choices, and valid codex links', () => {
  const allSets = [
    ['prologue', PROLOGUE_DIALOGUES],
    ['ch1', CH1_DIALOGUES],
    ['ch2', CH2_DIALOGUES],
    ['ch3', CH3_DIALOGUES],
    ['ch4', CH4_DIALOGUES],
    ['ch5', CH5_DIALOGUES],
  ];

  for (const lang of ['zh', 'en']) {
    i18n.setLang(lang);
    for (const [setName, dlgMap] of allSets) {
      for (const [dlgId, def] of Object.entries(dlgMap)) {
        assert.ok(def.nodes && Object.keys(def.nodes).length > 0, `[${setName}] ${dlgId} has no nodes`);
        for (const [nodeId, node] of Object.entries(def.nodes)) {
          if (node.textKey || node.text) {
            const key = node.textKey || node.text;
            const translated = i18n.t(key);
            assert.notEqual(
              translated,
              key,
              `[${lang}][${setName}] ${dlgId}.${nodeId} textKey "${key}" is missing translation`
            );
            const tokens = parseDialogueTokens(translated, (id) => i18n.t(`codex.${id}.title`));
            const rebuilt = tokens.map((tk) => tk.text).join('');
            assert.equal(
              rebuilt.includes('[[codex:'),
              false,
              `[${lang}][${setName}] ${dlgId}.${nodeId} has malformed [[codex:...]] link in: "${translated}"`
            );
          }

          for (const choice of node.choices || []) {
            const cKey = choice.textKey || choice.labelKey;
            assert.ok(cKey, `[${lang}][${setName}] ${dlgId}.${nodeId} choice missing textKey/labelKey`);
            const cTranslated = i18n.t(cKey);
            assert.notEqual(
              cTranslated,
              cKey,
              `[${lang}][${setName}] ${dlgId}.${nodeId} choice "${cKey}" is missing translation`
            );
          }
        }
      }
    }
  }
  i18n.setLang('zh');
});
