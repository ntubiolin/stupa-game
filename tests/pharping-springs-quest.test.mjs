import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createBus } from '../src/core/events.js';
import { createQuests } from '../src/systems/quests.js';
import { createMap as createPharpingMap } from '../src/world/maps/pharping.js';

function createTestContext() {
  const bus = createBus();
  const state = {
    mode: 'play',
    zone: 'pharping',
    uiOpen: false,
    player: {
      position: new THREE.Vector3(2000, 0, 0),
    },
  };
  const ctx = {
    bus,
    state,
    scene: new THREE.Scene(),
    zoneGroups: { pharping: new THREE.Group() },
    interactables: [],
    colliders: [],
    enemies: {
      getActiveEnemies: () => [],
    },
    hud: {
      toast: () => {},
    },
  };
  createQuests(ctx);
  return ctx;
}

function advanceToInteractSprings(ctx) {
  assert.equal(ctx.quests.start('ch1.drought'), true);
  assert.equal(ctx.quests.isAtStep('ch1.drought', 'talk_elder'), true);

  ctx.bus.emit('npc:talk', { npcId: 'villageElder' });
  assert.equal(ctx.quests.isAtStep('ch1.drought', 'liberate_sprites'), true);

  for (let i = 0; i < 6; i++) {
    ctx.bus.emit('enemy:liberated', {
      mapId: 'pharping',
      kind: 'droughtSprite',
    });
  }
  assert.equal(ctx.quests.isAtStep('ch1.drought', 'interact_springs'), true);
  const active = ctx.quests.getActiveQuestsDetailed().find((q) => q.id === 'ch1.drought');
  assert.equal(active.progress, 0);
  assert.equal(active.goal, 3);
}

test('ch1.drought interact_springs counts each spring once and deduplicates repeated/alias events', () => {
  const ctx = createTestContext();
  advanceToInteractSprings(ctx);

  const getQuest = () =>
    ctx.quests.getActiveQuestsDetailed().find((q) => q.id === 'ch1.drought');

  // 1. Interact with spring1 -> progress becomes 1/3 (not 2/3)
  ctx.bus.emit('quest:interact', { target: 'spring1', uniqueId: 'spring1', count: 1 });
  assert.equal(getQuest().step.id, 'interact_springs');
  assert.equal(getQuest().progress, 1);

  // 2. Repeat interaction with spring1 and alias event with uniqueId: 'spring1' -> remains 1/3
  ctx.bus.emit('quest:interact', { target: 'spring1', count: 1 });
  ctx.bus.emit('quest:interact', { target: 'pharpingSpring', uniqueId: 'spring1', count: 1 });
  assert.equal(getQuest().step.id, 'interact_springs');
  assert.equal(getQuest().progress, 1);

  // 3. Interact with spring2 -> progress becomes 2/3, step is still interact_springs
  ctx.bus.emit('quest:interact', { target: 'spring2', uniqueId: 'spring2', count: 1 });
  assert.equal(getQuest().step.id, 'interact_springs');
  assert.equal(getQuest().progress, 2);

  // 4. Interact with spring3 -> reaches 3/3 and advances to report_elder
  ctx.bus.emit('quest:interact', { target: 'spring3', uniqueId: 'spring3', count: 1 });
  assert.equal(getQuest().step.id, 'report_elder');
  assert.equal(getQuest().progress, 0);
});

test('createPharpingMap spring interactables advance ch1.drought 0/3 -> 1/3 -> 2/3 -> 3/3 across all 3 springs', () => {
  const ctx = createTestContext();
  createPharpingMap(ctx);
  advanceToInteractSprings(ctx);

  const getQuest = () =>
    ctx.quests.getActiveQuestsDetailed().find((q) => q.id === 'ch1.drought');

  const spring1 = ctx.interactables.find((it) => it.id === 'pharping-spring1');
  const spring2 = ctx.interactables.find((it) => it.id === 'pharping-spring2');
  const spring3 = ctx.interactables.find((it) => it.id === 'pharping-spring3');
  assert.ok(spring1, 'pharping-spring1 interactable should exist');
  assert.ok(spring2, 'pharping-spring2 interactable should exist');
  assert.ok(spring3, 'pharping-spring3 interactable should exist');

  // Clear spring 1 -> 1/3
  assert.equal(spring1.isAvailable(), true);
  spring1.onInteract();
  assert.equal(spring1.isAvailable(), false);
  assert.equal(getQuest().step.id, 'interact_springs');
  assert.equal(getQuest().progress, 1);

  // Calling onInteract again on already-inspected spring 1 should be a no-op
  spring1.onInteract();
  assert.equal(getQuest().step.id, 'interact_springs');
  assert.equal(getQuest().progress, 1);

  // Clear spring 2 -> 2/3 (must NOT complete the step with only 2 springs!)
  assert.equal(spring2.isAvailable(), true);
  spring2.onInteract();
  assert.equal(spring2.isAvailable(), false);
  assert.equal(getQuest().step.id, 'interact_springs');
  assert.equal(getQuest().progress, 2);

  // Clear spring 3 -> 3/3 -> advances to report_elder
  assert.equal(spring3.isAvailable(), true);
  spring3.onInteract();
  assert.equal(spring3.isAvailable(), false);
  assert.equal(getQuest().step.id, 'report_elder');
});
