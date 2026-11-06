/**
 * Chapter 5 Dungeon Boss: The Terma Guardian (`守藏者`, `termaGuardian`)
 * (`src/gameplay/bosses/termaGuardian.js`) — Issue #36
 *
 * Implements:
 *   - Huge ancient stone guardian statue (`巨大的石像，身上嵌著發光的伏藏晶石`) with glowing
 *     turquoise & gold Terma crystals embedded in its chest, shoulders, brow, and gauntlets.
 *   - Strictly zero PointLights (uses emissive MeshStandardMaterial + AdditiveBlending).
 *   - Tier Scaling:
 *       level = 30 + tier
 *       HP scaled by (1 + 0.20 * (level - 1)) * (1 + 0.1 * tier)
 *   - Random 4 Patterns per run:
 *       Deterministically picks 4 distinct patterns from the 8 pattern primitives in `patterns.js`
 *       (`ringWave`, `lineCharge`, `coneSlam`, `projectileVolley`, `groundHazard`, `summonAdds`,
 *        `beam`, `weatherZone`) using the run's seed, distributed across 3 phases.
 *   - Tier Affixes:
 *       Gains `Math.floor(tier / 3)` affixes from `['frozen', 'shielding', 'swift', 'vortex']`.
 *   - Subdual & Terma Chest (`伏藏匣`):
 *       Kneels in recognition of a worthy Tertön, notifies `ctx.dungeon.onBossSubdued()`,
 *       awards 4–6 tier-scaled items + `termaEssence` + 10-minute speed-clear bonus (2 extra items),
 *       updates `highestClearedTier`, and emits `terma:cleared`.
 */
import '../../i18n/ch5.js';

const ALL_PATTERN_KEYS = [
  'ringWave',
  'lineCharge',
  'coneSlam',
  'projectileVolley',
  'groundHazard',
  'summonAdds',
  'beam',
  'weatherZone',
];

const BOSS_AFFIX_POOL = ['frozen', 'shielding', 'swift', 'vortex'];

function mulberry32(seed) {
  let a = (Number(seed) || 1) >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickGuardianPatterns(seed = 108) {
  const rng = mulberry32((Number(seed) || 108) + 777);
  const pool = [...ALL_PATTERN_KEYS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, 4);
}

export function pickGuardianAffixes(tier = 1, seed = 108) {
  const count = Math.min(3, Math.max(0, Math.floor((Number(tier) || 1) / 3)));
  if (count <= 0) return [];
  const rng = mulberry32((Number(seed) || 108) + 1337 + (Number(tier) || 1) * 31);
  const pool = [...BOSS_AFFIX_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, count);
}

export function buildTermaGuardianModel(THREE) {
  const outerGroup = new THREE.Group();
  outerGroup.name = 'TermaGuardianRoot';

  const bodyGroup = new THREE.Group();
  bodyGroup.scale.setScalar(1.95);
  outerGroup.add(bodyGroup);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.85,
    metalness: 0.18,
    emissive: new THREE.Color(0x0f172a),
    emissiveIntensity: 0.3,
  });

  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.78,
    metalness: 0.25,
  });

  const goldArmorMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.28,
    metalness: 0.78,
    emissive: new THREE.Color(0xb45309),
    emissiveIntensity: 0.65,
  });

  const turquoiseCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    roughness: 0.16,
    metalness: 0.45,
    emissive: new THREE.Color(0x14b8a6),
    emissiveIntensity: 1.65,
    toneMapped: false,
  });

  const goldCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.2,
    metalness: 0.55,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 1.55,
    toneMapped: false,
  });

  // Torso & Carved Armor Chestplate
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.32, 0.86), stoneMat);
  torso.position.set(0, 1.42, 0);
  torso.castShadow = true;
  bodyGroup.add(torso);

  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.68, 0.92), darkStoneMat);
  chestPlate.position.set(0, 1.56, 0);
  bodyGroup.add(chestPlate);

  // Glowing Heart Terma Seal Crystal (Octahedron + Halo Ring)
  const heartCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.26, 0),
    turquoiseCrystalMat,
  );
  heartCrystal.scale.set(0.9, 1.35, 0.65);
  heartCrystal.position.set(0, 1.56, -0.46);
  bodyGroup.add(heartCrystal);

  const chestMandala = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.38, 24),
    goldCrystalMat,
  );
  chestMandala.position.set(0, 1.56, -0.47);
  bodyGroup.add(chestMandala);

  // Head & Five-Lobe Vajra Crown
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.34, 0);
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.56), stoneMat);
  headGroup.add(head);

  // Three Wisdom Eyes (turquoise-gold glowing eyes)
  const eyeGeo = new THREE.SphereGeometry(0.052, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, goldCrystalMat);
  eyeL.position.set(-0.13, 0.04, -0.29);
  const eyeR = new THREE.Mesh(eyeGeo, goldCrystalMat);
  eyeR.position.set(0.13, 0.04, -0.29);
  const eyeThird = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), turquoiseCrystalMat);
  eyeThird.position.set(0, 0.16, -0.29);
  headGroup.add(eyeL, eyeR, eyeThird);

  // Crown of 5 Terma Spires
  for (let i = -2; i <= 2; i++) {
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.34 - Math.abs(i) * 0.04, 5),
      i === 0 ? turquoiseCrystalMat : goldArmorMat,
    );
    spire.position.set(i * 0.12, 0.42 - Math.abs(i) * 0.02, -0.06);
    spire.rotation.z = -i * 0.14;
    headGroup.add(spire);
  }

  // Massive Stone Shoulders with Embedded Terma Crystal Clusters
  const armLGroup = new THREE.Group();
  armLGroup.position.set(-0.78, 1.88, 0);
  const armRGroup = new THREE.Group();
  armRGroup.position.set(0.78, 1.88, 0);
  bodyGroup.add(armLGroup, armRGroup);

  for (const [side, grp] of [
    [-1, armLGroup],
    [1, armRGroup],
  ]) {
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.56), goldArmorMat);
    pauldron.position.set(side * 0.06, 0.08, 0);
    grp.add(pauldron);

    // 3 glowing crystal shards sprouting from each shoulder
    for (let k = 0; k < 3; k++) {
      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        k === 1 ? goldCrystalMat : turquoiseCrystalMat,
      );
      shard.scale.set(0.7, 1.9, 0.7);
      shard.position.set(side * (0.12 + k * 0.06), 0.34 + (k === 1 ? 0.08 : 0), (k - 1) * 0.12);
      shard.rotation.z = side * (-0.35 - k * 0.12);
      grp.add(shard);
    }

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 1.18, 8), stoneMat);
    forearm.position.set(side * 0.06, -0.56, 0);
    grp.add(forearm);

    const gauntletCrys = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      turquoiseCrystalMat,
    );
    gauntletCrys.scale.set(0.7, 1.6, 0.7);
    gauntletCrys.position.set(side * 0.18, -0.62, -0.14);
    grp.add(gauntletCrys);
  }

  // Right hand holds a giant Stone Vajra Club
  const vajraClub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.45, 8), goldArmorMat);
  vajraClub.rotation.x = Math.PI / 2;
  vajraClub.position.set(0.06, -1.05, -0.45);
  const vajraTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), turquoiseCrystalMat);
  vajraTip.position.set(0.06, -1.05, -1.15);
  armRGroup.add(vajraClub, vajraTip);

  // Pillar-like Stone Legs
  const legGeo = new THREE.BoxGeometry(0.42, 0.92, 0.48);
  const legL = new THREE.Mesh(legGeo, darkStoneMat);
  legL.position.set(-0.34, 0.46, 0);
  const legR = new THREE.Mesh(legGeo, darkStoneMat);
  legR.position.set(0.34, 0.46, 0);
  bodyGroup.add(legL, legR);

  let animTime = 0;

  function anim(dt, bossState) {
    animTime += dt;
    const pulse = 0.5 + 0.5 * Math.sin(animTime * 3.8);

    if (bossState?.enraged) {
      turquoiseCrystalMat.emissiveIntensity = 2.1 + pulse * 0.6;
      goldCrystalMat.emissiveIntensity = 1.9 + pulse * 0.5;
    } else if (bossState?.subdued) {
      turquoiseCrystalMat.emissiveIntensity = 1.2;
      goldCrystalMat.emissiveIntensity = 1.4;
    } else {
      turquoiseCrystalMat.emissiveIntensity = 1.45 + pulse * 0.35;
      goldCrystalMat.emissiveIntensity = 1.35 + pulse * 0.3;
    }

    chestMandala.rotation.z = animTime * 1.1;

    const mode = bossState?.animState || 'idle';
    if (mode === 'kneel') {
      bodyGroup.position.y = -0.62;
      bodyGroup.rotation.x = 0.34;
      armLGroup.rotation.x = -0.55;
      armRGroup.rotation.x = -0.55;
      headGroup.rotation.x = 0.28;
      return;
    }

    bodyGroup.position.y = 0;
    bodyGroup.rotation.x = 0;

    if (mode === 'windup') {
      armLGroup.rotation.x = -2.1;
      armRGroup.rotation.x = -2.35;
      headGroup.rotation.x = -0.18;
    } else if (mode === 'roar' || mode === 'enrage') {
      const p = Math.sin(animTime * 15);
      armLGroup.rotation.x = -1.5 + p * 0.4;
      armRGroup.rotation.x = -1.5 - p * 0.4;
      headGroup.rotation.x = -0.32;
    } else if (mode === 'attack') {
      armLGroup.rotation.x = -0.85;
      armRGroup.rotation.x = -1.1;
      headGroup.rotation.x = 0;
    } else if (mode === 'walk') {
      const stride = Math.sin(animTime * 5.8);
      legL.rotation.x = stride * 0.42;
      legR.rotation.x = -stride * 0.42;
      armLGroup.rotation.x = -stride * 0.32;
      armRGroup.rotation.x = stride * 0.32;
      headGroup.rotation.x = 0;
    } else {
      const breath = Math.sin(animTime * 2.2);
      armLGroup.rotation.x = breath * 0.06;
      armRGroup.rotation.x = -breath * 0.06;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      headGroup.rotation.x = breath * 0.03;
    }
  }

  return {
    group: outerGroup,
    root: outerGroup,
    materials: [stoneMat, darkStoneMat, goldArmorMat, turquoiseCrystalMat, goldCrystalMat],
    anim,
    animate: anim,
  };
}

export const TERMA_GUARDIAN_DEF = {
  id: 'termaGuardian',
  nameKey: 'boss.termaGuardian.name',
  titleKey: 'boss.termaGuardian.title',
  level: 31,
  hp: 9240,
  def: 36,
  ccResist: 0.75,
  radius: 1.45,
  height: 4.1,
  arena: { map: 'terma', x: 7000, z: 0, r: 13.5 },
  buildModel: buildTermaGuardianModel,

  canAutoStart(bossState, ctx) {
    const d = ctx.state?.dungeon;
    if (d && d.active && d.floor !== 3) {
      return false;
    }
    return true;
  },

  onBeforeStart(bossState, ctx, opts = {}) {
    const d = ctx.state?.dungeon || {};
    const tier = Math.max(1, Number(opts.tier ?? d.tier ?? ctx.dungeon?.getTier?.() ?? 1));
    const seed = Number(opts.seed ?? d.seed ?? ctx.dungeon?.getSeed?.() ?? 108);

    // If boss room coordinates are set by dungeon Floor 3, sync arena center
    if (d.bossRoomWorld) {
      bossState.arena.x = d.bossRoomWorld.x;
      bossState.arena.z = d.bossRoomWorld.z;
      bossState.arena.r = d.bossRoomWorld.r || 13.5;
    }

    // Scale Level & HP by Tier:
    // Monster level = 30 + tier; HP scaled by (1 + 0.20 * (level - 1)) * (1 + 0.1 * tier)
    const level = 30 + tier;
    const tierHpMult = Number((1 + 0.1 * tier).toFixed(2));
    const baseHp = 1200;
    const scaledHp = Math.round(baseHp * (1 + 0.20 * (level - 1)) * tierHpMult);

    bossState.tier = tier;
    bossState.seed = seed;
    bossState.level = level;
    bossState.tierHpMult = tierHpMult;
    bossState.maxHp = scaledHp;
    bossState.hp = scaledHp;
    bossState.def = 30 + tier * 2;
    bossState.subdued = false;

    // Pick 4 distinct patterns deterministically from the 8 pattern primitives in patterns.js
    const picked = pickGuardianPatterns(seed);
    bossState.selectedPatterns = picked;

    // Distribute the 4 chosen patterns across the 3 phases
    this.phases[0].attacks = [picked[0], picked[1]];
    this.phases[1].attacks = [picked[0], picked[1], picked[2]];
    this.phases[2].attacks = [picked[0], picked[1], picked[2], picked[3]];

    // Boss gains 1 affix per 3 tiers (Tier 3 -> 1, Tier 6 -> 2, Tier 9+ -> 3)
    bossState.affixes = pickGuardianAffixes(tier, seed);
    bossState.affixTimers = {
      shieldCd: 10,
      vortexCd: 7,
      frozenCd: 6,
    };
  },

  onStart(bossState) {
    if (Array.isArray(bossState.affixes) && bossState.affixes.includes('swift')) {
      this.phases[0].speed = 1.85;
      this.phases[1].speed = 2.05;
      this.phases[2].speed = 2.25;
    } else {
      this.phases[0].speed = 1.45;
      this.phases[1].speed = 1.6;
      this.phases[2].speed = 1.8;
    }
  },

  onUpdate(dt, bossState, ctx, patternRunner) {
    if (!bossState.active || !Array.isArray(bossState.affixes) || bossState.affixes.length === 0) {
      return;
    }
    const timers = bossState.affixTimers || (bossState.affixTimers = { shieldCd: 10, vortexCd: 7, frozenCd: 6 });

    // 'shielding': periodically grants 1.2s brief invulnerability crystal ward
    if (bossState.affixes.includes('shielding')) {
      timers.shieldCd -= dt;
      if (timers.shieldCd <= 0) {
        timers.shieldCd = 14.0;
        bossState.invulnTimer = Math.max(bossState.invulnTimer, 1.2);
      }
    }

    // 'vortex': periodically pulls player slightly toward guardian
    if (bossState.affixes.includes('vortex')) {
      timers.vortexCd -= dt;
      if (timers.vortexCd <= 0) {
        timers.vortexCd = 8.0;
        const pPos = ctx.state?.player?.position;
        if (pPos) {
          const dx = bossState.pos.x - pPos.x;
          const dz = bossState.pos.z - pPos.z;
          const d = Math.hypot(dx, dz);
          if (d > 2.2 && d < 12.0) {
            if (typeof ctx.player?.moveWithCollisions === 'function') {
              ctx.player.moveWithCollisions((dx / d) * 1.8, (dz / d) * 1.8);
            } else {
              pPos.x += (dx / d) * 1.8;
              pPos.z += (dz / d) * 1.8;
              ctx.player?.resolveCollisions?.(pPos, pPos.x, pPos.z);
            }
          }
        }
      }
    }

    // 'frozen': spawns a chilling ground hazard under player
    if (bossState.affixes.includes('frozen')) {
      timers.frozenCd -= dt;
      if (timers.frozenCd <= 0) {
        timers.frozenCd = 7.5;
        patternRunner.patterns.groundHazard(bossState, {
          radius: 2.6,
          duration: 3.5,
          tickDamage: 12 + (bossState.tier || 1),
          slowSec: 1.5,
          color: 0x38bdf8,
        });
      }
    }
  },

  onSubdue(bossState, ctx) {
    if (ctx.dungeon?.onBossSubdued) {
      ctx.dungeon.onBossSubdued(bossState);
    } else {
      // Fallback if subdued outside an active dungeon run
      const tier = bossState.tier || 1;
      ctx.inventory?.addMaterial?.('termaEssence', 1);
      ctx.bus?.emit('terma:cleared', { tier, elapsedSec: 0, timeBonus: true });
    }
  },

  getExtraState(bossState) {
    return {
      tier: bossState.tier || 1,
      level: bossState.level || 31,
      tierHpMult: bossState.tierHpMult || 1.1,
      selectedPatterns: bossState.selectedPatterns || [],
      affixes: bossState.affixes || [],
    };
  },

  phases: [
    {
      hpBelow: 1.0,
      attacks: ['coneSlam', 'ringWave'],
      speed: 1.45,
    },
    {
      hpBelow: 0.65,
      attacks: ['coneSlam', 'ringWave', 'projectileVolley'],
      onEnter: 'roar',
      speed: 1.6,
    },
    {
      hpBelow: 0.30,
      attacks: ['coneSlam', 'ringWave', 'projectileVolley', 'beam'],
      onEnter: 'enrage',
      speed: 1.8,
    },
  ],

  attacks: {
    ringWave(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      const tier = boss.tier || 1;
      patterns.ringWave(boss, {
        innerR: 1.8,
        outerR: 11.8,
        windup: fast ? 0.72 : 0.9,
        expandDuration: fast ? 1.05 : 1.3,
        damage: 22 + tier * 2,
        slowSec: 2.0,
      });
      return fast ? 2.4 : 3.1;
    },
    lineCharge(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      const tier = boss.tier || 1;
      patterns.lineCharge(boss, {
        width: 2.4,
        length: 11.0,
        windup: fast ? 0.7 : 0.9,
        chargeDuration: 0.45,
        damage: 26 + tier * 2,
        knockback: 5.5,
      });
      return fast ? 2.5 : 3.2;
    },
    coneSlam(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      const tier = boss.tier || 1;
      patterns.coneSlam(boss, {
        radius: 6.2,
        angleDeg: 95,
        windup: fast ? 0.7 : 0.92,
        damage: 25 + tier * 2,
        knockback: 6.0,
      });
      return fast ? 2.3 : 3.0;
    },
    projectileVolley(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      const tier = boss.tier || 1;
      patterns.projectileVolley(boss, {
        count: fast ? 5 : 3,
        spreadAngle: 0.62,
        windup: fast ? 0.62 : 0.78,
        speed: 12.5,
        range: 15.0,
        damage: 19 + tier * 2,
      });
      return fast ? 2.3 : 2.9;
    },
    groundHazard(boss, patterns) {
      const tier = boss.tier || 1;
      patterns.groundHazard(boss, {
        radius: 3.2,
        duration: 4.5,
        windup: 0.75,
        tickDamage: 14 + tier * 2,
        slowSec: 1.5,
      });
      return 2.8;
    },
    summonAdds(boss, patterns) {
      patterns.summonAdds(boss, {
        count: 2,
        kind: 'stoneSoldier',
        scale: 0.75,
        hpRatio: 0.5,
        radiusOffset: 3.8,
        windup: 0.85,
      });
      return 3.5;
    },
    beam(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      const tier = boss.tier || 1;
      patterns.beam(boss, {
        width: 1.8,
        length: 12.5,
        windup: fast ? 0.75 : 0.95,
        duration: 1.15,
        tickDamage: 16 + tier * 2,
      });
      return fast ? 2.6 : 3.3;
    },
    weatherZone(boss, patterns) {
      patterns.weatherZone(boss, {
        slowMult: 0.72,
        safeRadius: 2.8,
        safeCount: 3,
      });
      return 2.2;
    },
  },

  oath: {
    dialogue: null,
    protector: null,
    flag: 'boss.termaGuardian',
  },

  loot: {
    firstKill: { rarity: 'terma' },
    normal: { count: [3, 4], minRarity: 'rare' },
  },
};

export default TERMA_GUARDIAN_DEF;
