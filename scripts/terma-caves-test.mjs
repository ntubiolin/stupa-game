import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { createBus } from '../src/core/events.js';
import { i18n } from '../src/i18n.js';
import '../src/i18n/items.js';
import '../src/i18n/termaCaves.js';
import { LEGENDARIES } from '../src/data/legendaries.js';
import { createVitals } from '../src/systems/vitals.js';
import { createSkills } from '../src/systems/skills.js';
import { createPowers } from '../src/systems/powers.js';
import { createTermaCaves, TERMA_CAVE_DEFS } from '../src/gameplay/termaCaves.js';
import { createDungeon } from '../src/gameplay/dungeon.js';

function createTestFixture(initialSections = {}) {
  const sections = structuredClone(initialSections);
  const bus = createBus();
  const scene = new THREE.Scene();
  const zoneGroups = {
    stupa: new THREE.Group(),
    wild: new THREE.Group(),
    pharping: new THREE.Group(),
    mangyul: new THREE.Group(),
    yarlung: new THREE.Group(),
    samye: new THREE.Group(),
    chimphu: new THREE.Group(),
    terma: new THREE.Group(),
  };
  for (const grp of Object.values(zoneGroups)) {
    scene.add(grp);
  }

  const activeEnemies = [];
  let nextEnemyId = 1;
  const droppedLoot = [];
  const equippedPowerSet = new Set();
  const materials = { termaEssence: 0 };
  const unlockedCodex = new Set();
  let meritAdded = 0;
  let turquoiseAdded = 0;

  const ctx = {
    THREE,
    config: CONFIG,
    bus,
    i18n,
    scene,
    zoneGroups,
    colliders: [],
    interactables: [],
    state: {
      mode: 'play',
      zone: 'pharping',
      zoneType: 'combat',
      uiOpen: false,
      elapsed: 10,
      player: {
        position: new THREE.Vector3(2000, 0, 0),
        velocity: new THREE.Vector3(),
        heading: 0,
      },
    },
    save: {
      get: (section, fallback) => structuredClone(sections[section] ?? fallback),
      set: (section, value) => {
        sections[section] = structuredClone(value);
      },
      markDirty: () => {},
    },
    inventory: {
      getEquipmentStats: () => ({
        atk: 0,
        def: 0,
        maxHp: 0,
        maxMp: 0,
        crit: 0,
        subdue: 0,
        cdr: 0,
        find: 0,
        powers: [...equippedPowerSet],
      }),
      getEquippedPowers: () => new Set(equippedPowerSet),
      getEquipped: () => {
        const map = {};
        let idx = 0;
        for (const pid of equippedPowerSet) {
          map[`slot_${idx++}`] = { legendaryId: pid, powerId: pid };
        }
        return map;
      },
      addMaterial: (key, count = 1) => {
        materials[key] = (materials[key] || 0) + count;
      },
    },
    enemies: {
      clear: () => {
        activeEnemies.length = 0;
      },
      spawn: (kind, opts = {}) => {
        const id = `enemy_${nextEnemyId++}`;
        const enemy = {
          id,
          kind,
          x: opts.x ?? 0,
          z: opts.z ?? 0,
          position: new THREE.Vector3(opts.x ?? 0, 0, opts.z ?? 0),
          level: opts.level ?? 10,
          rank: opts.rank ?? 'normal',
          maxHp: 200,
          hp: 200,
          state: 'active',
          tags: opts.tags || [],
          statuses: [],
        };
        activeEnemies.push(enemy);
        return id;
      },
      getActiveEnemies: () => activeEnemies,
      queryCircle: (origin, radius) =>
        activeEnemies.filter(
          (e) =>
            e.hp > 0 &&
            Math.hypot((e.x ?? 0) - (origin.x ?? 0), (e.z ?? 0) - (origin.z ?? 0)) <= radius,
        ),
      damage: (enemyOrId, amount, meta = {}) => {
        const target =
          typeof enemyOrId === 'object'
            ? enemyOrId
            : activeEnemies.find((e) => e.id === enemyOrId);
        if (!target) return 0;
        target.hp = Math.max(0, target.hp - amount);
        target.lastDamageMeta = meta;
        return amount;
      },
      damageEnemy: (enemyOrId, amount, meta = {}) => {
        const target =
          typeof enemyOrId === 'object'
            ? enemyOrId
            : activeEnemies.find((e) => e.id === enemyOrId);
        if (!target) return 0;
        target.hp = Math.max(0, target.hp - amount);
        target.lastDamageMeta = meta;
        return amount;
      },
      applyStatus: (enemyOrId, status) => {
        const target =
          typeof enemyOrId === 'object'
            ? enemyOrId
            : activeEnemies.find((e) => e.id === enemyOrId);
        if (target) target.statuses.push(status);
      },
    },
    loot: {
      dropLegendary: (id, opts = {}) => {
        const item = { id, rarity: 'terma', legendary: true, opts };
        droppedLoot.push(item);
        return item;
      },
      drop: (opts = {}) => {
        const item = { rarity: opts.rarity || 'rare', opts };
        droppedLoot.push(item);
        return item;
      },
      addTurquoise: (n = 0) => {
        turquoiseAdded += n;
      },
    },
    codex: {
      unlock: (id) => unlockedCodex.add(id),
    },
    merit: {
      add: (_kind, pts = 0) => {
        meritAdded += pts;
      },
    },
  };

  const vitals = createVitals(ctx);
  const powers = createPowers(ctx);
  const skills = createSkills(ctx);
  const termaCaves = createTermaCaves(ctx);
  const dungeon = createDungeon(ctx);

  return {
    ctx,
    sections,
    vitals,
    powers,
    skills,
    termaCaves,
    dungeon,
    activeEnemies,
    droppedLoot,
    equippedPowerSet,
    materials,
    unlockedCodex,
    getMeritAdded: () => meritAdded,
    getTurquoiseAdded: () => turquoiseAdded,
  };
}

// 1. Verify 12 Terma Legendaries & 3 new Terma Passive Powers
{
  assert.equal(LEGENDARIES.length, 12, '12 Terma legendary items registered');
  for (const id of ['thokchaVajra', 'dakiniMirror', 'uddiyanaLotusHat']) {
    const leg = LEGENDARIES.find((l) => l.id === id);
    assert.ok(leg, `Legendary ${id} exists`);
    assert.equal(leg.powerId, id, `Legendary ${id} maps to powerId ${id}`);
  }

  const fx = createTestFixture();
  const { ctx, vitals, skills, activeEnemies, equippedPowerSet } = fx;

  // Test `thokchaVajra`: 6.5m thunderbolt ring on Mantra cast (110% ATK magic + 1.5s stun)
  equippedPowerSet.add('thokchaVajra');
  vitals.recalcDerived();
  const eid = ctx.enemies.spawn('tsen', { x: 2003, z: 0 });
  const baseAtk = ctx.state.player.atk;
  ctx.bus.emit('skill:cast', { id: 'mantra', origin: { x: 2000, y: 0, z: 0 }, radius: 6 });
  const hitEnemy = activeEnemies.find((e) => e.id === eid);
  assert.equal(hitEnemy.hp, 200 - Math.round(baseAtk * 1.1), 'thokchaVajra deals 110% ATK magic damage');
  assert.equal(hitEnemy.statuses[0]?.type, 'stun', 'thokchaVajra applies stun');
  assert.equal(hitEnemy.statuses[0]?.duration, 1.5, 'thokchaVajra stun lasts 1.5s');

  // Test `dakiniMirror`: below 30% HP restores 40% maxHp + 2.5s rainbow invuln buff (60s CD)
  equippedPowerSet.add('dakiniMirror');
  vitals.recalcDerived();
  const maxHp = ctx.state.player.maxHp;
  vitals.set({ hp: Math.floor(maxHp * 0.45) });
  ctx.state.player.def = 0;
  let dakiniProcCount = 0;
  ctx.bus.on('power:dakiniMirror', () => {
    dakiniProcCount += 1;
  });
  vitals.damage(Math.floor(maxHp * 0.25), 'physical', { ignoreInvuln: true });
  assert.equal(dakiniProcCount, 1, 'dakiniMirror triggered once below 30% HP');
  assert.ok(ctx.state.player.hp > Math.floor(maxHp * 0.5), 'dakiniMirror emergency heal restored 40% maxHp');
  assert.ok(
    ctx.state.player.buffs?.some((b) => b.id === 'dakiniMirrorRainbow'),
    'dakiniMirror grants dakiniMirrorRainbow buff',
  );
  // Cooldown prevents immediate second trigger
  vitals.set({ hp: Math.floor(maxHp * 0.45) });
  ctx.state.player.def = 0;
  vitals.damage(Math.floor(maxHp * 0.25), 'physical', { ignoreInvuln: true });
  assert.equal(dakiniProcCount, 1, 'dakiniMirror respects 60s internal cooldown');

  // Test `uddiyanaLotusHat`: +10% CDR and -5 ultimate charge requirement (25 instead of 30)
  skills.addUltCharge(25);
  assert.ok(skills.getCooldownFraction('vajraGuru') > 0, 'at 25 charge, ultimate is not ready without hat');
  const baseMantraCd = skills.getEffectiveCooldown('mantra');
  equippedPowerSet.add('uddiyanaLotusHat');
  vitals.recalcDerived();
  assert.equal(skills.getCooldownFraction('vajraGuru'), 0, 'uddiyanaLotusHat reduces ultimate charge requirement to 25');
  assert.ok(skills.getEffectiveCooldown('mantra') < baseMantraCd, 'uddiyanaLotusHat grants +10% CDR');
}

// 2. Verify Ch1–Ch5 Terma Caves full lifecycle + Mendrup + Compass + Shogser Empowerment
{
  const fx = createTestFixture();
  const { ctx, sections, vitals, skills, termaCaves, activeEnemies, droppedLoot, materials, unlockedCodex } = fx;

  const basePerm = { ...ctx.state.player.permanent };
  const baseSp = skills.getPoints();

  for (const def of TERMA_CAVE_DEFS) {
    ctx.state.zone = def.map;
    ctx.bus.emit('zone:Ready', { id: def.map });

    const caveInteractable = ctx.interactables.find((it) => it.id === `terma-cave-${def.id}`);
    assert.ok(caveInteractable, `Interactable registered for ${def.id}`);
    assert.equal(termaCaves.getState().caves[def.id].status, 'DORMANT');

    // Step A: Interact with DORMANT cave -> awakens Cave Guardians (`GUARDED`)
    caveInteractable.onInteract();
    assert.equal(termaCaves.getState().caves[def.id].status, 'GUARDED', `${def.id} enters GUARDED state`);
    assert.ok(activeEnemies.length >= 3, `${def.id} spawns guardian pack`);
    if (def.map === 'chimphu') {
      assert.equal(termaCaves.isCombatActiveInZone('chimphu'), true, 'chimphu combat enabled during cave trial');
    }

    // Step B: Attempting to extract while GUARDED must be blocked
    const lootBeforeBlocked = droppedLoot.length;
    const blockedResult = caveInteractable.onInteract();
    assert.equal(blockedResult, false, `${def.id} blocks extraction while guardians live`);
    assert.equal(droppedLoot.length, lootBeforeBlocked, 'no loot dropped while guarded');

    // Step C: Liberate all Cave Guardians -> transitions to `UNSEALED`
    while (activeEnemies.length > 0) {
      const guard = activeEnemies.pop();
      ctx.bus.emit('enemy:liberated', { id: guard.id });
    }
    assert.equal(termaCaves.getState().caves[def.id].status, 'UNSEALED', `${def.id} unseals after guardians liberated`);
    if (def.map === 'chimphu') {
      assert.equal(termaCaves.isCombatActiveInZone('chimphu'), false, 'chimphu returns to peaceful hub after trial');
    }

    // Step D: Interact with UNSEALED casket -> extracts Terma relics (`EXTRACTED`)
    const extracted = caveInteractable.onInteract();
    assert.equal(extracted, true, `${def.id} interactive extraction succeeds`);
    assert.equal(termaCaves.getState().caves[def.id].status, 'EXTRACTED', `${def.id} marked EXTRACTED`);
    assert.equal(termaCaves.getState().caves[def.id].extractedOnce, true);
  }

  // Verify all 5 Shogser scrolls, 5 Mendrup pills, and Tertön's Compass unlocked
  const tcState = termaCaves.getState();
  assert.equal(tcState.compassUnlocked, true, 'Tertön Compass unlocked');
  assert.deepEqual(tcState.scrolls.sort(), ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'], 'All 5 Shogser scrolls collected');
  assert.equal(tcState.mendrup.length, 5, 'All 5 Mendrup pills consumed');
  assert.ok(unlockedCodex.has('terma') && unlockedCodex.has('terton'), 'Codex entries unlocked by Shogser scrolls');

  const afterCavePerm = { ...ctx.state.player.permanent };
  assert.equal((afterCavePerm.maxHp || 0) - (basePerm.maxHp || 0), 150, 'Mendrup pills grant +150 permanent maxHp');
  assert.equal((afterCavePerm.maxMp || 0) - (basePerm.maxMp || 0), 45, 'Mendrup pills grant +45 permanent maxMp');
  assert.equal((afterCavePerm.atk || 0) - (basePerm.atk || 0), 12, 'Mendrup pills grant +12 permanent ATK');
  assert.equal((afterCavePerm.def || 0) - (basePerm.def || 0), 9, 'Mendrup pills grant +9 permanent DEF');
  assert.equal(skills.getPoints() - baseSp, 1, 'Chimphu Mendrup pill grants +1 bonus skill point');

  // Verify re-challenging an already extracted cave does NOT duplicate permanent Mendrup stats
  ctx.state.zone = 'pharping';
  const asuraInteractable = ctx.interactables.find((it) => it.id === 'terma-cave-pharping');
  asuraInteractable.onInteract(); // Re-awaken guardians
  while (activeEnemies.length > 0) {
    const guard = activeEnemies.pop();
    ctx.bus.emit('enemy:liberated', { id: guard.id });
  }
  asuraInteractable.onInteract(); // Re-extract repeatable loot
  assert.equal(ctx.state.player.permanent.maxHp, afterCavePerm.maxHp, 'Repeatable cave trial does not duplicate Mendrup maxHp');

  // 3. Verify Yeshe Tsogyal's Scroll Table in Chimphu (`Grand Tertön Empowerment`)
  ctx.state.zone = 'chimphu';
  const tableInteractable = ctx.interactables.find((it) => it.id === 'chimphu-shogser-table');
  assert.ok(tableInteractable, 'Chimphu Shogser Scroll Table interactable exists');
  assert.equal(tableInteractable.isAvailable(), true);
  tableInteractable.onInteract();

  assert.equal(termaCaves.getState().shogserDeciphered, true, 'Shogser scrolls deciphered');
  assert.equal(ctx.state.player.permanent.atk, afterCavePerm.atk + 8, 'Grand Empowerment grants +8 ATK');
  assert.equal(ctx.state.player.permanent.def, afterCavePerm.def + 8, 'Grand Empowerment grants +8 DEF');
  assert.equal(ctx.state.player.permanent.maxHp, afterCavePerm.maxHp + 60, 'Grand Empowerment grants +60 maxHp');
  assert.equal(skills.getPoints(), baseSp + 3, 'Grand Empowerment grants +2 bonus skill points');
  assert.ok(materials.termaEssence >= 10, 'Terma Essence awarded from caves and Grand Empowerment');

  // Verify save persistence across reload
  const reloaded = createTestFixture(sections);
  assert.equal(reloaded.termaCaves.hasCompass(), true, 'Compass persists in stupa.save.v2');
  assert.equal(reloaded.termaCaves.getState().shogserDeciphered, true, 'Empowerment persists in stupa.save.v2');
  assert.deepEqual(reloaded.ctx.state.player.permanent, ctx.state.player.permanent, 'Permanent stats persist in stupa.save.v2');
}

// 4. Verify Chapter 5 Terma Dungeon Vault Room & Interactive Floor 3 Chest + 0 PointLight budget
{
  const fx = createTestFixture();
  const { ctx, dungeon, activeEnemies, droppedLoot } = fx;

  dungeon.enter(3, 54321);
  const f1State = dungeon.getState();
  assert.ok(f1State.vaultRoomWorld, 'Floor 1 generates a Terma Cave Vault Room');
  assert.equal(f1State.vaultUnsealed, false, 'Vault Reliquary starts sealed by guards');
  assert.ok(f1State.vaultGuardsRemaining > 0, 'Vault Room spawns dedicated guards');

  const vaultInteractable = ctx.interactables.find((it) => it.id === 'terma-vault-reliquary-f1');
  assert.ok(vaultInteractable, 'Vault Reliquary interactable registered');
  assert.equal(vaultInteractable.onInteract(), false, 'Vault Reliquary cannot be extracted while guarded');

  for (const e of [...activeEnemies]) {
    if (e.tags?.includes('termaVaultGuard')) {
      ctx.bus.emit('enemy:liberated', { id: e.id });
    }
  }
  assert.equal(dungeon.getState().vaultUnsealed, true, 'Vault Reliquary unseals when vault guards are liberated');
  assert.equal(vaultInteractable.onInteract(), true, 'Vault Reliquary interactive extraction succeeds');
  assert.equal(dungeon.getState().vaultExtracted, true, 'Vault Reliquary marked extracted');

  // Floor 3 Boss Subdue -> Interactive Grand Terma Chest
  dungeon.loadFloor(3);
  dungeon.onBossSubdued({ tier: 3, pos: { x: 8000, z: 0 } });
  assert.equal(dungeon.getState().chestOpened, false, 'Floor 3 Terma Chest waits for player interaction');
  const bossChestInteractable = ctx.interactables.find((it) => it.id === 'terma-boss-chest');
  assert.ok(bossChestInteractable, 'Floor 3 Terma Boss Chest interactable registered');
  const lootBeforeChest = droppedLoot.length;
  bossChestInteractable.onInteract();
  assert.equal(dungeon.getState().chestOpened, true, 'Floor 3 Terma Chest opens on player interaction');
  assert.ok(droppedLoot.length >= lootBeforeChest + 4, 'Floor 3 Terma Chest drops 4+ tier-scaled items');

  // Verify strict 0 PointLight budget across all scenes
  let pointLightCount = 0;
  ctx.scene.traverse((obj) => {
    if (obj.isPointLight) pointLightCount += 1;
  });
  assert.equal(pointLightCount, 0, 'Strict 0 PointLight budget maintained across all Terma Caves and Dungeon');
}

console.log('PASS: Ch1-Ch5 Terma Caves, 3 Terma Legendaries, Mendrup pills, Shogser Empowerment, Compass, Dungeon Vault Room & 0 PointLight budget');
