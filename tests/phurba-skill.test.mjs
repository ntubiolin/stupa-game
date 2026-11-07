import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBus } from '../src/core/events.js';
import { createActiveSkills } from '../src/gameplay/skills/activeSkills.js';

function createPhurbaFixture({ hasSplit = false, useInventorySpecialEffect = false } = {}) {
  const bus = createBus();
  const scene = new THREE.Scene();
  const enemies = [];
  const damageLog = [];
  const statusLog = [];

  const ctx = {
    scene,
    bus,
    state: {
      elapsed: 0,
      player: {
        position: new THREE.Vector3(0, 0, 0),
        heading: 0,
        atk: 100,
        skillDamage: 0,
      },
    },
    world: {
      getHeight: () => 0,
    },
    powers: {
      has: (id) => (!useInventorySpecialEffect && hasSplit && id === 'phurbaSplit'),
    },
    inventory: {
      hasSpecialEffect: (id) => (useInventorySpecialEffect && hasSplit && id === 'phurbaSplit'),
      getEquipped: () =>
        hasSplit
          ? { mainhand: { id: 'phurbaSplit', legendaryId: 'phurbaSplit', powerId: 'phurbaSplit' } }
          : {},
    },
    enemies: {
      queryLine: (origin, dirRad, length, halfWidth) => {
        const fx = -Math.sin(dirRad);
        const fz = -Math.cos(dirRad);
        return enemies.filter((e) => {
          if (e.hp <= 0) return false;
          const dx = e.pos.x - origin.x;
          const dz = e.pos.z - origin.z;
          const forward = dx * fx + dz * fz;
          const perp = Math.abs(dx * -fz + dz * fx);
          return forward >= 0 && forward <= length && perp <= halfWidth;
        });
      },
      queryCircle: (origin, radius) =>
        enemies.filter((e) => {
          if (e.hp <= 0) return false;
          return Math.hypot(e.pos.x - origin.x, e.pos.z - origin.z) <= radius;
        }),
      damageEnemy: (enemy, amount, meta = {}) => {
        enemy.hp = Math.max(0, enemy.hp - amount);
        damageLog.push({ id: enemy.id, amount, meta });
        return { dealt: amount };
      },
      applyStatus: (enemy, status) => {
        enemy.statuses = enemy.statuses || [];
        enemy.statuses.push(status);
        statusLog.push({ id: enemy.id, status });
        return true;
      },
    },
  };

  const activeSkills = createActiveSkills(ctx);

  function addPlainEnemy(id, x, z, y = 0) {
    // Plain { x, y, z } object without .clone() — matches src/gameplay/enemies.js
    const pos = Object.create(null);
    pos.x = x;
    pos.y = y;
    pos.z = z;
    assert.equal(typeof pos.clone, 'undefined');
    const enemy = { id, rank: 'normal', hp: 500, maxHp: 500, pos, statuses: [] };
    enemies.push(enemy);
    return enemy;
  }

  function addBossEnemy(id, x, z, y = 0) {
    // THREE.Vector3 pos — matches src/gameplay/bosses/bossBase.js
    const pos = new THREE.Vector3(x, y, z);
    assert.equal(typeof pos.clone, 'function');
    const enemy = { id, rank: 'boss', hp: 2000, maxHp: 2000, pos, statuses: [] };
    enemies.push(enemy);
    return enemy;
  }

  return {
    ctx,
    activeSkills,
    enemies,
    damageLog,
    statusLog,
    addPlainEnemy,
    addBossEnemy,
  };
}

test('castPhurba unenhanced and Enh A hit plain-pos enemies with and without phurbaSplit', () => {
  // 1. Unenhanced without phurbaSplit
  {
    const fx = createPhurbaFixture({ hasSplit: false });
    fx.addPlainEnemy('e1', 0, -5);
    fx.activeSkills.castPhurba({ rank: 1, enh: null, damageMult: 1.4 });
    assert.equal(fx.damageLog.length, 1);
    assert.equal(fx.damageLog[0].id, 'e1');
    assert.equal(fx.damageLog[0].amount, 140);
    assert.equal(fx.statusLog[0].status.type, 'root');
    assert.equal(fx.statusLog[0].status.duration, 2.0);
  }

  // 2. Enh A ('三橛') with phurbaSplit via ctx.inventory.hasSpecialEffect('phurbaSplit')
  {
    const fx = createPhurbaFixture({ hasSplit: true, useInventorySpecialEffect: true });
    fx.addPlainEnemy('e1', 0, -4);
    fx.addPlainEnemy('e2', 2.5, -5);
    fx.addPlainEnemy('e3', -2.5, -5);
    fx.activeSkills.castPhurba({ rank: 3, enh: 'a', damageMult: 1.68 });

    // Primary enemy hit + 2 secondary phurbaSplit bolts on nearby plain-pos enemies
    const splitHits = fx.damageLog.filter((d) => d.meta.source === 'phurbaSplit');
    assert.equal(splitHits.length, 2, 'phurbaSplit hits 2 nearby plain-pos enemies');
    for (const st of fx.statusLog) {
      assert.equal(st.status.type, 'root');
      assert.equal(st.status.duration, 3.0, 'phurbaSplit adds +1s root duration');
    }
    // Step update to clear flying daggers
    for (let i = 0; i < 6; i++) fx.activeSkills.update(0.05);
  }
});

test('castPhurba Enh B (釘地) handles plain {x,y,z} enemy pos, Boss Vector3 pos, and misses without TypeError (#181)', () => {
  // 1. Hitting a normal enemy whose pos is a plain { x, y, z } object (regression for #181)
  {
    const fx = createPhurbaFixture({ hasSplit: true });
    const e1 = fx.addPlainEnemy('mangyul_wolf_1', 0, -5, 1.2);
    const e2 = fx.addPlainEnemy('mangyul_wolf_2', 3.0, -5, 1.2);

    assert.doesNotThrow(() => {
      fx.activeSkills.castPhurba({ rank: 3, enh: 'b', damageMult: 1.68 });
    }, 'castPhurba Enh B should not throw pos.clone TypeError on plain {x,y,z} enemy.pos');

    // Initial hit stuns e1 for 1.2s; secondary split bolt roots e2
    assert.ok(e1.statuses.some((s) => s.type === 'stun' && s.duration === 1.2));
    assert.ok(e2.statuses.some((s) => s.type === 'root' && s.duration === 3.0));

    // Step 1.1s (11 steps of 0.1s) so the planted dagger explodes after 1.0s for 4m AoE (ATK * 0.6 = 60)
    const beforeExplodeCount = fx.damageLog.filter((d) => d.meta.source === 'phurba:explode').length;
    assert.equal(beforeExplodeCount, 0);

    for (let step = 0; step < 11; step++) {
      assert.doesNotThrow(() => {
        fx.activeSkills.update(0.1);
      });
    }

    const explodeHits = fx.damageLog.filter((d) => d.meta.source === 'phurba:explode');
    assert.equal(explodeHits.length, 2, '4m AoE explosion hits both enemies near plantPos');
    for (const hit of explodeHits) {
      assert.equal(hit.amount, 60, 'AoE explosion deals ATK * 0.6 damage');
      assert.equal(hit.meta.type, 'magic');
    }
  }

  // 2. Hitting a Boss whose pos is a THREE.Vector3
  {
    const fx = createPhurbaFixture({ hasSplit: false });
    const boss = fx.addBossEnemy('tenmaStorm', 0, -6, 0);

    assert.doesNotThrow(() => {
      fx.activeSkills.castPhurba({ rank: 3, enh: 'b', damageMult: 1.68 });
      for (let step = 0; step < 11; step++) {
        fx.activeSkills.update(0.1);
      }
    });

    const explodeHits = fx.damageLog.filter((d) => d.meta.source === 'phurba:explode');
    assert.equal(explodeHits.length, 1);
    assert.equal(explodeHits[0].id, boss.id);
    assert.equal(explodeHits[0].amount, 60);
  }

  // 3. Missing all enemies (plants at 6m forward and explodes after 1.0s)
  {
    const fx = createPhurbaFixture({ hasSplit: false });
    // Place enemy near the 6m fallback plant position but outside the initial 0.65m line width
    fx.addPlainEnemy('side_enemy', 2.0, -6.0, 0);

    assert.doesNotThrow(() => {
      fx.activeSkills.castPhurba({ rank: 3, enh: 'b', damageMult: 1.68 });
    });
    assert.equal(fx.damageLog.length, 0, 'Initial line cast misses side enemy');

    for (let step = 0; step < 11; step++) {
      fx.activeSkills.update(0.1);
    }

    const explodeHits = fx.damageLog.filter((d) => d.meta.source === 'phurba:explode');
    assert.equal(explodeHits.length, 1, 'Fallback planted dagger at 6m explodes and hits enemy within 4m');
    assert.equal(explodeHits[0].id, 'side_enemy');
    assert.equal(explodeHits[0].amount, 60);
  }
});
