import assert from 'node:assert/strict';
import test from 'node:test';
import { i18n } from '../src/i18n.js';
import { createDialogue } from '../src/ui/dialogue.js';
import { NPCS, getNpcDef } from '../src/data/npcs.js';

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

test('createDialogue registers Pharping Ch1 NPC dialogues out-of-the-box without manual register()', () => {
  const { elementsById } = installDomStub();
  const ctx = {
    state: { uiOpen: false, zone: 'pharping' },
    bus: { emit() {} },
    i18n,
    quests: {
      hasFlag: () => false,
      setFlag() {},
      start() {},
      completeStep() {},
      isActive: () => false,
      isDone: () => false,
      isAtStep: () => false,
    },
    codex: { unlock() {} },
  };

  const dialogue = createDialogue(ctx);
  const speakerEl = elementsById.get('dialogue-speaker');
  const textEl = elementsById.get('dialogue-text');

  const requiredCh1Dialogues = [
    'ch1.villageElder.droughtIntro',
    'ch1.practitioner.intro',
    'ch1.practitioner.droughtActive',
    'ch1.villager1.dry',
    'ch1.villager2.dry',
    'ch1.messenger.start',
  ];

  i18n.setLang('zh');
  for (const id of requiredCh1Dialogues) {
    const opened = dialogue.open(id);
    assert.equal(opened, true, `Expected dialogue.open('${id}') to return true`);
    assert.equal(dialogue.isOpen(), true, `Expected dialogue to be open for '${id}'`);
    assert.equal(dialogue.state().id, id);
    dialogue.skip();
    assert.ok(speakerEl.textContent.length > 0, `Expected non-empty speaker for '${id}'`);
    assert.equal(speakerEl.textContent.startsWith('npc.'), false, `Speaker for '${id}' should be localized`);
    assert.ok(textEl.innerHTML.length > 0, `Expected non-empty text for '${id}'`);
    assert.equal(textEl.innerHTML.startsWith('dlg.'), false, `Text for '${id}' should be localized`);
    dialogue.close();
    assert.equal(dialogue.isOpen(), false);
  }
});

test('createDialogue registers Ch2-Ch5 chapter dialogues and Pharping NPC definitions resolve in registry', () => {
  installDomStub();
  const ctx = {
    state: { uiOpen: false, zone: 'pharping' },
    bus: { emit() {} },
    i18n,
    quests: {
      hasFlag: () => false,
      setFlag() {},
      start() {},
      completeStep() {},
      isActive: () => false,
      isDone: () => false,
      isAtStep: () => false,
    },
    codex: { unlock() {} },
  };

  const dialogue = createDialogue(ctx);
  const chapterDialogues = [
    'ch2.envoyLeader',
    'ch3.palaceKeeper.valleyIntro',
    'ch4.shantarakshita',
    'ch5.yesheTsogyal.intro',
  ];

  for (const id of chapterDialogues) {
    assert.equal(dialogue.open(id), true, `Expected dialogue.open('${id}') to return true`);
    dialogue.close();
  }

  for (const npcId of ['villageElder', 'pharpingPractitioner', 'pharpingVillager1', 'pharpingVillager2', 'messenger']) {
    const def = getNpcDef(npcId);
    assert.ok(def, `Expected NPC definition for '${npcId}' to be registered`);
    assert.equal(def.map, 'pharping');
  }
});

test('every NPC in NPCS across stupa and ch1-ch5 maps has all dialogue IDs registered out-of-the-box in createDialogue', () => {
  const { elementsById } = installDomStub();
  const ctx = {
    state: { uiOpen: false, zone: 'stupa' },
    bus: { emit() {} },
    i18n,
    quests: {
      hasFlag: () => false,
      setFlag() {},
      start() {},
      completeStep() {},
      isActive: () => false,
      isDone: () => false,
      isAtStep: () => false,
    },
    codex: { unlock() {} },
    inventory: { addTurquoise() {} },
    vitals: { addExp() {} },
    zones: { teleport() {} },
  };

  const dialogue = createDialogue(ctx);
  const speakerEl = elementsById.get('dialogue-speaker');
  const textEl = elementsById.get('dialogue-text');

  const mapsCovered = new Set();
  const checkedDialogueIds = new Set();

  for (const npc of NPCS) {
    mapsCovered.add(npc.map);
    const raw = npc.dialogue ?? npc.dialogueId;
    const dlgIds =
      typeof raw === 'string'
        ? [raw]
        : Array.isArray(raw)
          ? raw.map((branch) => branch?.id).filter(Boolean)
          : [];

    assert.ok(dlgIds.length > 0, `NPC '${npc.id}' (${npc.map}) should reference at least one dialogue ID`);

    for (const dlgId of dlgIds) {
      checkedDialogueIds.add(dlgId);
      const opened = dialogue.open(dlgId, {
        npcId: npc.id,
        speaker: npc.nameKey,
        look: npc.look === 'monk' ? 'lama' : (npc.look || 'lama'),
      });
      assert.equal(
        opened,
        true,
        `Expected dialogue.open('${dlgId}') for NPC '${npc.id}' (${npc.map}) to return true`
      );
      assert.equal(dialogue.isOpen(), true);
      dialogue.skip();
      assert.ok(speakerEl.textContent.length > 0, `Speaker for '${dlgId}' (${npc.id}) should be non-empty`);
      assert.ok(textEl.innerHTML.length > 0, `Text for '${dlgId}' (${npc.id}) should be non-empty`);
      dialogue.close();
      assert.equal(dialogue.isOpen(), false);
    }
  }

  for (const expectedMap of ['stupa', 'pharping', 'mangyul', 'yarlung', 'samye', 'chimphu']) {
    assert.equal(mapsCovered.has(expectedMap), true, `Expected NPCS to cover map '${expectedMap}'`);
  }
  assert.ok(checkedDialogueIds.size >= 40, `Expected at least 40 NPC dialogue branches verified, got ${checkedDialogueIds.size}`);
});
