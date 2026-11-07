import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createBus } from '../src/core/events.js';
import { createInteraction } from '../src/systems/interaction.js';
import { createGroundLoot } from '../src/gameplay/groundLoot.js';
import { createBoss } from '../src/gameplay/bosses/bossBase.js';
import { DROUGHT_LORD_DEF } from '../src/gameplay/bosses/droughtLord.js';

function createDomStubs(t) {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;

  function makeElement(tag = 'div') {
    return {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      style: {},
      children: [],
      parentNode: null,
      appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) this.children.splice(idx, 1);
        child.parentNode = null;
        return child;
      },
    };
  }

  const body = makeElement('body');
  const head = makeElement('head');

  globalThis.document = {
    body,
    head,
    createElement: (tag) => makeElement(tag),
    getElementById: (id) => {
      const all = [...body.children, ...head.children];
      return all.find((el) => el.id === id) || null;
    },
  };

  globalThis.window = {
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener() {},
    removeEventListener() {},
  };

  t.after(() => {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
    if (prevWin === undefined) delete globalThis.window;
    else globalThis.window = prevWin;
  });
}

test('boss ground loot has higher interaction priority than oathStone rematch (#171)', (t) => {
  createDomStubs(t);

  const bus = createBus();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  const arena = DROUGHT_LORD_DEF.arena;

  const flags = {};
  const saveStore = {};
  const storedItems = [];
  let uidCounter = 1;
  let interactPressed = false;
  let latestPrompt = null;

  bus.on('prompt', (payload) => {
    latestPrompt = payload;
  });

  const state = {
    mode: 'play',
    uiOpen: false,
    dialogueOpen: false,
    zone: arena.map,
    elapsed: 10,
    player: {
      position: new THREE.Vector3(arena.x, 0, arena.z),
      velocity: new THREE.Vector3(),
      heading: 0,
      action: 'idle',
      hp: 100,
    },
  };

  const ctx = {
    scene,
    camera,
    state,
    bus,
    config: { PLAYER: { radius: 0.4 } },
    interactables: [],
    i18n: {
      t: (key, params) => (params?.name ? `${key}:${params.name}` : key),
    },
    world: {
      getHeight: () => 0,
    },
    quests: {
      setFlag(k, v) {
        flags[k] = v;
      },
      getFlag(k) {
        return Boolean(flags[k]);
      },
    },
    save: {
      get(section, fallback) {
        return saveStore[section] ?? fallback;
      },
      set(section, val) {
        saveStore[section] = val;
      },
    },
    loot: {
      generate(spec = {}) {
        const uid = `gear_${uidCounter++}`;
        return {
          uid,
          id: spec.id || uid,
          kind: 'gear',
          slot: 'mainhand',
          rarity: spec.rarity || 'rare',
          name: spec.id === 'phurbaSplit' ? '揚列雪之橛' : `戰利法器_${uid}`,
        };
      },
      storeItem(item) {
        storedItems.push(item);
        return true;
      },
      formatItemName(item) {
        return item?.name || item?.id || '';
      },
    },
    dialogue: {
      open(id) {
        state.dialogueOpen = true;
        state.lastDialogueId = id;
      },
    },
    input: {
      pressed(action) {
        if (action === 'interact' && interactPressed) {
          interactPressed = false;
          return true;
        }
        return false;
      },
      isDown() {
        return false;
      },
    },
  };

  const interaction = createInteraction(ctx);
  const groundLoot = createGroundLoot(ctx);
  const boss = createBoss(ctx, DROUGHT_LORD_DEF);

  // Start and subdue Drought Lord on first kill
  boss.start();
  assert.equal(boss.isActive(), true);
  boss.subdue();

  assert.equal(boss.isActive(), false);
  assert.equal(boss.getState().subdued, true);
  assert.equal(flags['boss.droughtLord'], true);
  assert.equal(flags['ch1.rain'], true);

  // Simulate closing the oath dialogue -> oathStone must remain visible & registered without flip-flopping
  state.dialogueOpen = false;
  bus.emit('dialogue:close', { id: DROUGHT_LORD_DEF.oath.dialogue });

  assert.equal(boss.getInternalState().oathCeremonyTimer, 0);
  assert.equal(boss.getState().oathStoneVisible, true);

  const droppedLoot = groundLoot.list();
  assert.ok(droppedLoot.length >= 4, `expected at least 4 dropped boss items, got ${droppedLoot.length}`);

  const oathStoneInteractable = ctx.interactables.find((it) => it.id === 'oathStone_droughtLord');
  assert.ok(oathStoneInteractable, 'expected oathStone_droughtLord to be registered');
  assert.equal(oathStoneInteractable.priority, -25);
  assert.equal(oathStoneInteractable.radius, 2.4);

  // Move player to the first dropped item's position (which is 1.2m..2.5m from arena center, inside oathStone radius)
  const firstDrop = groundLoot.groundItems[0];
  state.player.position.set(firstDrop.endPos.x, 0, firstDrop.endPos.z);

  // Place all dropped items within player pickup range near arena center so both loot and oathStone overlap
  for (let i = 0; i < groundLoot.groundItems.length; i++) {
    const g = groundLoot.groundItems[i];
    g.endPos.set(arena.x + 0.4 * (i + 1) * 0.25, 0, arena.z + 0.3);
  }
  state.player.position.set(arena.x + 0.5, 0, arena.z + 0.3);

  // Verify both loot and oathStone are within their respective radii of the player
  const distToStone = Math.hypot(state.player.position.x - arena.x, state.player.position.z - arena.z);
  assert.ok(distToStone < oathStoneInteractable.radius, 'player should be inside oathStone radius');

  // Update interaction -> prompt MUST be pickupLoot, NOT oathStone
  interaction.update();
  assert.ok(latestPrompt, 'expected an interaction prompt');
  assert.equal(latestPrompt.labelKey, 'prompt.pickupLoot');
  assert.ok(latestPrompt.id.startsWith('loot_'), `expected loot target, got ${latestPrompt.id}`);

  // Repeatedly press E to pick up every piece of ground loot in range; none of these presses may start a rematch
  const totalDrops = groundLoot.groundItems.length;
  for (let i = 0; i < totalDrops; i++) {
    interaction.update();
    assert.equal(
      latestPrompt?.labelKey,
      'prompt.pickupLoot',
      `press #${i + 1} should target ground loot before oathStone`
    );
    interactPressed = true;
    interaction.update();
    assert.equal(boss.isActive(), false, `press #${i + 1} must not trigger boss rematch`);
    assert.equal(boss.getState().subdued, true);
  }

  assert.equal(groundLoot.groundItems.length, 0, 'all boss ground loot should be picked up');
  assert.equal(storedItems.length, totalDrops, 'all picked up boss loot should be stored');

  // Now that all ground loot in range is picked up, interaction prompt transitions to oathStone
  interaction.update();
  assert.ok(latestPrompt, 'expected oathStone prompt after all loot is picked up');
  assert.equal(latestPrompt.labelKey, 'prompt.oathStone');
  assert.equal(latestPrompt.id, 'oathStone_droughtLord');

  // Pressing E now intentionally triggers the Boss rematch
  interactPressed = true;
  interaction.update();
  assert.equal(boss.isActive(), true, 'pressing E on oathStone after loot is cleared should start rematch');
  assert.equal(boss.getInternalState().isRematch, true);

  // Verify that if player faints/resets during a rematch, subdued state and quest flags are preserved
  bus.emit('player:faint');
  assert.equal(boss.isActive(), false);
  assert.equal(boss.getState().subdued, true);
  assert.equal(ctx.state.bossSubdued, true);
  assert.equal(flags['boss.droughtLord'], true);
  assert.equal(flags['ch1.rain'], true);
  assert.equal(boss.getState().oathStoneVisible, true);
});
