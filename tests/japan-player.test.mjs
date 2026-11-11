import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { createBus } from '../src/core/events.js';
import { JAPAN_MAP_IDS } from '../src/data/japan.js';
import { createMantra } from '../src/gameplay/mantra.js';
import { createProjectiles } from '../src/gameplay/projectiles.js';
import { i18n } from '../src/i18n.js';
import { createPlayer } from '../src/player/player.js';
import { createSkills } from '../src/systems/skills.js';
import { createVitals } from '../src/systems/vitals.js';

function makeGame(saved = {}) {
  const data = structuredClone(saved);
  const ctx = {
    THREE,
    config: CONFIG,
    scene: new THREE.Group(),
    bus: createBus(),
    colliders: [],
    state: {
      mode: 'play', zone: 'stupa', elapsed: 1, flags: {},
      player: { action: 'idle', position: new THREE.Vector3(), velocity: new THREE.Vector3() },
    },
    world: {
      getHeight: () => 0,
      getMap: () => ({ origin: { x: 0, z: 0 }, walkRadius: 90 }),
      isCombatZone: () => ctx.state.zone === 'kii' || ctx.state.zone === 'wild',
    },
    save: {
      get: (key, fallback) => data[key] ?? fallback,
      set: (key, value) => { data[key] = structuredClone(value); },
    },
  };
  createPlayer(ctx);
  createVitals(ctx);
  createSkills(ctx);

  function go(to) {
    const { zone: from, player } = ctx.state;
    ctx.state.zone = to;
    player.position.set(0, 0, 0);
    player.heading = 0;
    ctx.bus.emit('zone:change', { from, to });
  }

  function tick(dt) {
    ctx.state.elapsed += dt;
    ctx.vitals.update(dt);
    ctx.skills.update(dt);
    ctx.projectiles?.update(dt);
    ctx.mantra?.update(dt);
  }

  return { ctx, go, tick, data };
}

test('Shingon form swaps model and all seven skills by map, preserving older upgrades and appearance', () => {
  const { ctx, go, data } = makeGame({
    appearance: { name: 'Nima', hatType: 'pandita' },
    skills: {
      points: 2, spentPoints: 3, ultCharge: 17,
      skills: { lotusWard: { unlocked: true, rank: 4, enh: 'b' } },
    },
    protectors: { unlocked: ['whiteYak'], active: 'whiteYak' },
  });
  const originalAppearance = ctx.player.getAppearance();
  const originalSave = structuredClone(data);
  const originalNames = ctx.skills.list().map((skill) => skill.name);
  const expected = ['sankosho', 'komyoShingon', 'fudoSword', 'gorinResonance', 'ajikanWard', 'dogyoNinin', 'diamondRealm'];

  assert.equal(ctx.player.mesh.userData.pilgrimStyle, 'himalayan');
  assert.equal(ctx.player.mesh.getObjectByName('Sugegasa').visible, false);
  assert.equal(ctx.skills.cast('skill4'), true);
  assert.equal(ctx.protectors.getActiveSummons().length, 1);

  for (const zone of JAPAN_MAP_IDS) {
    go(zone);
    assert.equal(ctx.player.mesh.userData.pilgrimStyle, 'shingon');
    assert.equal(ctx.player.mesh.getObjectByName('Sugegasa').visible, true);
    assert.deepEqual(ctx.skills.list().map((skill) => skill.abilityId), expected);
    assert.ok(ctx.skills.list().every((skill) => skill.unlocked));
    assert.equal(ctx.protectors.getActiveSummons().length, 0);
  }

  const currentLang = i18n.lang;
  i18n.setLang('en');
  assert.equal(ctx.skills.getSkillState('dogyoNinin').name, 'Dōgyō Ninin');
  i18n.setLang('zh');
  assert.equal(ctx.skills.getSkillState('dogyoNinin').name, '同行二人');
  i18n.setLang(currentLang);
  assert.equal(ctx.skills.getSkillState('ajikanWard').rank, 4);
  assert.equal(ctx.skills.getSkillState('ajikanWard').enh, 'b');
  assert.equal(ctx.skills.getPoints(), 2);
  assert.equal(ctx.skills.getUltCharge(), 17);

  go('wild');
  assert.equal(ctx.player.mesh.userData.pilgrimStyle, 'himalayan');
  assert.equal(ctx.player.mesh.getObjectByName('Sugegasa').visible, false);
  assert.deepEqual(ctx.player.getAppearance(), originalAppearance);
  assert.deepEqual(ctx.skills.list().map((skill) => skill.name), originalNames);
  assert.equal(ctx.protectors.getActive(), 'whiteYak');
  assert.equal(ctx.skills.getSkillState('skill4').cooldownRemaining, 30);
  assert.equal(ctx.skills.getSkillState('dogyoNinin'), null);
  assert.deepEqual(data.skills, originalSave.skills);
  assert.deepEqual(data.protectors, originalSave.protectors);
});

test('a new save summons Kūkai with MP, healing, protection, movement, cooldown, and travel cleanup', () => {
  const { ctx, go, tick, data } = makeGame();
  const { player } = ctx.state;
  assert.equal(ctx.skills.isUnlocked('skill4'), false);
  go('toji');
  const mana = player.mp;
  ctx.vitals.set({ hp: 55 });
  assert.equal(ctx.skills.cast('dogyoNinin'), true);
  assert.equal(player.mp, mana - 30);
  assert.equal(player.hp, 57);
  assert.equal(ctx.skills.getSkillState('skill4').cooldownRemaining, 30);
  assert.equal(ctx.skills.cast('skill4'), false);
  assert.equal(ctx.protectors.hasAny(), false);
  assert.ok(ctx.scene.getObjectByName('KukaiCompanion'));

  const initial = ctx.activeSkills.getJapanCompanion();
  assert.equal(initial.id, 'kukai');
  assert.equal(initial.duration, 12);
  const damage = ctx.vitals.damage(20, 'physical', { ignoreInvuln: true });
  assert.equal(damage, 18);
  player.position.x = 9;
  tick(2);
  assert.ok(ctx.activeSkills.getJapanCompanion().position[0] > initial.position[0] + 4);
  assert.equal(player.hp, 57 - damage + 2);

  go('kii');
  assert.equal(ctx.activeSkills.getJapanCompanion(), null);
  assert.equal(ctx.scene.getObjectByName('KukaiCompanion'), undefined);
  assert.equal(player.dmgTakenMult, 1);
  assert.equal(ctx.skills.getSkillState('skill4').cooldownRemaining, 28);
  tick(28);
  ctx.vitals.set({ mp: 0 });
  assert.equal(ctx.skills.cast('dogyoNinin'), false);
  ctx.vitals.set({ mp: mana });
  assert.equal(ctx.skills.cast('dogyoNinin'), true);
  tick(12);
  assert.equal(ctx.activeSkills.getJapanCompanion(), null);
  assert.equal(player.dmgTakenMult, 1);

  go('stupa');
  assert.equal(ctx.skills.isUnlocked('skill4'), false);
  assert.equal(ctx.protectors.hasAny(), false);
  assert.equal(data.skills?.skills?.protector?.unlocked ?? false, false);
});

test('Shingon attacks apply the shared combat rules and distinct effects, with cleanup on exit', () => {
  const { ctx, go, tick } = makeGame();
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  try {
    createMantra(ctx);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
  createProjectiles(ctx);
  const enemy = { id: 'target', pos: new THREE.Vector3(0, 0, -3), hp: 500, maxHp: 500 };
  ctx.enemies = {
    getActiveEnemies: () => [enemy],
    queryCircle: () => [enemy],
    queryCone: () => [enemy],
    queryLine: () => [enemy],
    damage: (_id, amount) => { enemy.hp -= amount; },
    damageEnemy: (_enemy, amount) => { enemy.hp -= amount; },
  };

  go('kii');
  const { player } = ctx.state;
  ctx.vitals.set({ mp: 40 });
  assert.equal(ctx.skills.cast('basic'), true);
  assert.ok(ctx.scene.getObjectByName('SankoshoProjectile'));
  tick(3 / 22);
  assert.ok(enemy.hp < 500);
  assert.equal(player.mp, 42);

  assert.equal(ctx.skills.cast('chant'), true);
  assert.equal(player.mp, 27);
  assert.ok(ctx.scene.getObjectByName('KomyoShingonMandala').visible);
  const beforeFudo = enemy.hp;
  assert.equal(ctx.skills.cast('fudoSword'), true);
  assert.equal(player.mp, 13);
  assert.ok(enemy.hp < beforeFudo);
  assert.ok(ctx.scene.getObjectByName('FudoFlameSword'));
  assert.equal(ctx.skills.cast('fudoSword'), false);

  ctx.vitals.set({ mp: 60 });
  assert.equal(ctx.skills.cast('gorinResonance'), true);
  assert.ok(ctx.scene.getObjectByName('GorinResonance'));
  assert.equal(ctx.skills.cast('ajikanWard'), true);
  assert.ok(ctx.scene.getObjectByName('AjikanMoonWard'));
  assert.equal(player.shield, Math.round(player.maxHp * 0.3));
  assert.equal(ctx.skills.cast('diamondRealm'), false);
  ctx.skills.fillUlt();
  assert.equal(ctx.skills.cast('diamondRealm'), true);
  assert.equal(ctx.skills.getUltCharge(), 0);
  assert.ok(ctx.scene.getObjectByName('DiamondRealmMandala'));

  const hpOnTravel = enemy.hp;
  go('wild');
  assert.equal(player.shield, 0);
  assert.equal(player.shrineInvuln, false);
  assert.equal(enemy.hp, hpOnTravel);
  assert.equal(ctx.scene.getObjectByName('KomyoShingonMandala').parent.visible, false);
  for (const name of ['FudoFlameSword', 'GorinResonance', 'AjikanMoonWard', 'DiamondRealmMandala']) {
    assert.equal(ctx.scene.getObjectByName(name), undefined);
  }
  ctx.scene.traverse((object) => assert.equal(Boolean(object.isPointLight), false));
});
