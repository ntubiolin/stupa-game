import assert from 'node:assert/strict';
import test from 'node:test';
import { Group, Vector3 } from 'three';
import { createBus } from '../src/core/events.js';
import { JAPAN_MAP_IDS } from '../src/data/japan.js';
import { i18n } from '../src/i18n.js';
import { createInteraction } from '../src/systems/interaction.js';
import { createJapanCampaign } from '../src/systems/japanCampaign.js';
import { createSave, SAVE_STORAGE_KEY } from '../src/systems/save.js';
import { createDialogue } from '../src/ui/dialogue.js';

function installEnvironment(t, sections) {
  const elements = new Map();
  function element() {
    return {
      classList: { add() {}, remove() {} },
      appendChild() {},
      setAttribute() {},
      addEventListener() {},
      getContext: () => null,
      querySelector(selector) {
        if (!elements.has(selector)) elements.set(selector, element());
        return elements.get(selector);
      },
    };
  }
  let saved = JSON.stringify({ version: 2, sections });
  const environment = {
    localStorage: {
      getItem: key => key === SAVE_STORAGE_KEY ? saved : null,
      setItem: (key, value) => {
        if (key === SAVE_STORAGE_KEY) saved = value;
      },
    },
    document: { addEventListener() {}, body: element(), getElementById: () => null, createElement: element },
    window: { addEventListener() {} },
  };
  for (const [name, value] of Object.entries(environment)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }
  return () => JSON.parse(saved).sections;
}

function boot() {
  const bus = createBus();
  const state = { mode: 'play', zone: 'stupa', elapsed: 0, player: { position: new Vector3() } };
  const events = [];
  let pressed = false;
  let tracker;
  bus.on('japan:progress', event => events.push(event));
  const ctx = {
    bus, state, i18n, interactables: [],
    zoneGroups: Object.fromEntries(JAPAN_MAP_IDS.map(mapId => [mapId, new Group()])),
    world: { getHeight: () => 0 },
    input: { pressed: action => pressed && action === 'interact' },
  };
  const save = createSave(ctx);
  const dialogue = createDialogue(ctx);
  const campaign = createJapanCampaign(ctx, { renderTracker: value => { tracker = value; } });
  const interaction = createInteraction(ctx);

  function update(seconds = 0.05) {
    const frames = Math.ceil(seconds / 0.05);
    for (let frame = 0; frame < frames; frame++) {
      state.elapsed += seconds / frames;
      campaign.update(seconds / frames);
      dialogue.update(seconds / frames);
      interaction.update();
    }
  }

  function move({ x, y = 0, z }, mapId = state.zone) {
    if (mapId !== state.zone) {
      const from = state.zone;
      state.zone = mapId;
      bus.emit('zone:change', { from, to: mapId });
    }
    state.player.position.set(x, y, z);
    update();
  }

  function interact() {
    pressed = true;
    update();
    pressed = false;
  }

  function getObjective(id) {
    return campaign.getObjectives().find(step => step.id === id);
  }

  return {
    bus, state, save, campaign, dialogue, interaction, zoneGroups: ctx.zoneGroups, events,
    update, move, interact, getObjective, tracker: () => tracker,
  };
}

test('Japan campaign advances through normal interaction, dialogue, walking, ward, meditation and bow paths', t => {
  const originalQuests = { flags: { 'chapter1.unlocked': true }, quests: { prologue: { step: 2 } } };
  const originalStory = { version: 2, beat: 'arrival' };
  const saved = installEnvironment(t, { quests: originalQuests, story: originalStory });
  const game = boot();
  const { campaign, dialogue, state, interaction, getObjective, move, interact, update, bus } = game;
  update();
  assert.equal(game.tracker().chapter, null);
  assert.equal(campaign.isChapterUnlocked('qinglong'), true);
  assert.equal(campaign.isChapterUnlocked('toji'), false);
  const later = getObjective('kukaiToji');
  move(later.position, later.mapId);
  interact();
  assert.equal(dialogue.isOpen(), false);
  assert.equal(campaign.getProgress().nextStep, 'initiation');

  const objectives = campaign.getObjectives();
  for (const [index, step] of objectives.entries()) {
    assert.equal(campaign.isChapterUnlocked(step.mapId), true);
    if (step.action === 'cross') {
      move(step.position, step.mapId);
      assert.equal(campaign.getProgress().nextStep, step.id, 'arriving at the exit alone cannot finish the crossing');
      move(getObjective('bridgeApproach').position, step.mapId);
      for (const checkpoint of step.checkpoints) move(checkpoint, step.mapId);
      move(step.position, step.mapId);
    } else {
      move(step.position, step.mapId);
    }
    if (step.interactableId) {
      assert.equal(interaction.getCurrentTarget().id, step.interactableId);
      interact();
    }
    if (step.action === 'talk') {
      assert.equal(dialogue.state().npcId, step.interactableId);
      assert.equal(campaign.getProgress().nextStep, step.id);
      if (step.id === 'initiation') {
        dialogue.close();
        assert.equal(campaign.getProgress().nextStep, step.id);
        interact();
      }
      dialogue.skip();
      dialogue.selectChoice(0);
    } else if (step.action === 'ward') {
      update(step.trial.duration + 0.5);
      assert.equal(campaign.getProgress().nextStep, step.id, 'standing in danger leaves the ward active');
      interact();
      move({ ...step.position, x: step.position.x + step.trial.dangerRadius + 1 });
      update(step.trial.duration + 0.5);
    } else if (step.action === 'meditate') {
      update(0.4);
      state.player.isMoving = true;
      update();
      assert.equal(campaign.getProgress().nextStep, step.id);
      state.player.isMoving = false;
      interact();
      update(step.trial.duration + 0.05);
    } else if (step.action === 'bow') {
      assert.equal(campaign.getProstrationHeading(), 0);
      move({ ...step.position, x: step.position.x + 8 });
      bus.emit('merit', { type: 'prostration' });
      assert.equal(campaign.getProgress().nextStep, step.id);
      move(step.position);
      bus.emit('merit', { type: 'prostration' });
    }
    update();
    assert.deepEqual(campaign.getProgress().completedSteps, objectives.slice(0, index + 1).map(item => item.id));
    assert.equal(saved().japanCampaign.completedSteps.at(-1), step.id);
  }

  assert.equal(campaign.getProgress().complete, true);
  assert.deepEqual(campaign.getProgress().completedChapters, JAPAN_MAP_IDS);
  assert.deepEqual(game.events.filter(event => event.chapterComplete).map(event => event.mapId), JAPAN_MAP_IDS);
  const lamp = game.zoneGroups.okunoin.getObjectByName('japan-campaign-personalLamp');
  assert.equal(lamp.userData.flame.visible, true);
  move(getObjective('personalLamp').position);
  interact();
  assert.equal(game.events.length, objectives.length);
  assert.deepEqual(saved().quests, originalQuests);
  assert.deepEqual(saved().story, originalStory);

  const reloaded = boot();
  assert.equal(reloaded.campaign.getProgress().complete, true);
  reloaded.move(getObjective('personalLamp').position, 'okunoin');
  assert.equal(reloaded.zoneGroups.okunoin.getObjectByName('japan-campaign-personalLamp').userData.flame.visible, true);
  for (const scene of Object.values(game.zoneGroups)) {
    scene.traverse(object => assert.equal(Boolean(object.isPointLight), false));
  }
});

test('Japan campaign resumes the canonical prefix on import and clears stale interaction on reset', t => {
  const saved = installEnvironment(t, {});
  const game = boot();
  const { getObjective, save, campaign, dialogue, move, interact } = game;
  const progress = { version: 1, completedSteps: ['initiation', 'sankosho', 'eastwardVow', 'not-a-step', 'kukaiToji'] };
  assert.equal(save.importString(JSON.stringify({ version: 2, sections: { japanCampaign: progress } }), { reload: false }), true);
  assert.deepEqual(campaign.getProgress().completedChapters, ['qinglong']);
  assert.equal(campaign.getProgress().nextStep, 'kukaiToji');
  const next = getObjective('kukaiToji');
  move(next.position, next.mapId);
  interact();
  assert.equal(dialogue.isOpen(), true);
  assert.equal(save.reset(), true);
  assert.equal(dialogue.isOpen(), false);
  assert.equal(campaign.getProgress().nextStep, 'initiation');
  assert.equal(saved().japanCampaign, undefined);
  assert.equal(save.importString(JSON.stringify({ version: 2, sections: { japanCampaign: { version: 2, marker: 'preserve' } } }), { reload: false }), true);
  const start = getObjective('initiation');
  move(start.position, start.mapId);
  interact();
  assert.equal(dialogue.isOpen(), false);
  assert.deepEqual(saved().japanCampaign, { version: 2, marker: 'preserve' });
});

test('a stale adventure tab cannot overwrite a later campaign checkpoint', t => {
  const saved = installEnvironment(t, { quests: { progress: 12 } });
  const first = boot();
  const stale = boot();
  const initiation = first.getObjective('initiation');
  const sankosho = first.getObjective('sankosho');
  first.move(initiation.position, initiation.mapId);
  first.interact();
  first.dialogue.selectChoice(0);
  first.move(sankosho.position);
  first.interact();
  assert.deepEqual(saved().japanCampaign.completedSteps, ['initiation', 'sankosho']);

  stale.save.set('settings', { lang: 'en' });
  assert.equal(stale.save.flush(), true);
  assert.equal(stale.campaign.getProgress().nextStep, 'initiation');
  stale.move(initiation.position, initiation.mapId);
  stale.interact();
  stale.dialogue.selectChoice(0);
  assert.equal(stale.dialogue.isOpen(), false);
  assert.equal(stale.events.length, 0);
  assert.equal(stale.campaign.getProgress().nextStep, 'eastwardVow');
  assert.deepEqual(saved().japanCampaign.completedSteps, ['initiation', 'sankosho']);
  const vow = stale.getObjective('eastwardVow');
  stale.move(vow.position);
  stale.interact();
  assert.equal(saved().japanCampaign.completedSteps.at(-1), 'eastwardVow');
  assert.deepEqual(saved().quests, { progress: 12 });
  assert.deepEqual(saved().settings, { lang: 'en' });
});
