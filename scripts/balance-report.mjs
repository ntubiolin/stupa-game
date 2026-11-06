#!/usr/bin/env node
/**
 * Balance & Progression Report (`scripts/balance-report.mjs`) — Issue #37
 *
 * Directly imports `src/config.js` and `src/data/*` to compute:
 *   1. Player expected stats (ATK, HP, DEF, SkillDmg%, Crit) at Lv 5 / 10 / 16 / 23 / 30 / 35
 *      wearing same-level Rare equipment across all 8 slots (using analytical expected affix values).
 *   2. Monster combat table per chapter:
 *      - Scaled Monster HP, DEF, EXP, and Attack Damage
 *      - Hits to liberate with Six-Syllable Mantra (`mantra`) and Hung Orb (`humBolt`) (Target: 2–4 Mantra hits)
 *      - Monster single-attack damage as % of Player HP (Target: <= 15%)
 *      - Monster liberations required to level up (`getMaxExp(L) / monsterExp`)
 *   3. Elite & Chapter Boss TTK and Boss heavy skill % of Player HP (Target: Elites 15–30s, Bosses 90–180s, Boss Heavy <= 40% HP).
 *   4. Story & Terma Dungeon XP progression curve (Prologue -> Ch4 -> Lv30 -> Terma Tier 1-10 -> Lv40).
 *   5. Loot & Turquoise Economy (Expected Terma drops per 10 min, Turquoise income vs Shop & Crafting costs).
 */

import { CONFIG } from '../src/config.js';
import { EQUIPMENT_SLOTS, getBasesForSlot } from '../src/data/itemBases.js';
import { AFFIXES } from '../src/data/affixes.js';
import { SKILL_BY_ID } from '../src/data/skills.js';
import { PHARPING_ENEMIES } from '../src/data/enemies/pharping.js';
import { MANGYUL_ENEMIES } from '../src/data/enemies/mangyul.js';
import { YARLUNG_ENEMIES } from '../src/data/enemies/yarlung.js';
import { SAMYE_ENEMIES } from '../src/data/enemies/samye.js';
import { PROLOGUE_QUESTS } from '../src/data/quests/prologue.js';
import { CH1_QUESTS } from '../src/data/quests/ch1.js';
import { CH2_QUESTS } from '../src/data/quests/ch2.js';
import { CH3_QUESTS } from '../src/data/quests/ch3.js';
import { CH4_QUESTS } from '../src/data/quests/ch4.js';
import { CH5_QUESTS } from '../src/data/quests/ch5.js';

const V = CONFIG.VITALS;
const ALL_ENEMY_KINDS = {
  ...CONFIG.ENEMIES.kinds,
  ...PHARPING_ENEMIES,
  ...MANGYUL_ENEMIES,
  ...YARLUNG_ENEMIES,
  ...SAMYE_ENEMIES,
};

function computeExpectedRareGearStats(ilvl) {
  const totals = {
    atk: 0,
    atkPct: 0,
    def: 0,
    maxHp: 0,
    maxMp: 0,
    skillDamage: 0,
    critChance: 0,
    critDamage: 0,
    cdr: 0,
    magicRes: 0,
    expBonus: 0,
    findBonus: 0,
  };

  for (const slot of EQUIPMENT_SLOTS) {
    const bases = getBasesForSlot(slot, ilvl);
    const sortedBases = [...bases].sort((a, b) => (b.minIlvl || 1) - (a.minIlvl || 1));
    const bestBase = sortedBases[0];
    if (bestBase) {
      const scale = 1 + 0.04 * Math.max(0, ilvl - (bestBase.minIlvl || 1));
      const midImp = ((bestBase.implicit.min + bestBase.implicit.max) / 2) * scale;
      const impVal = bestBase.implicit.float ? midImp : Math.round(midImp);
      totals[bestBase.implicit.stat] = (totals[bestBase.implicit.stat] || 0) + impVal;
      if (bestBase.extraImplicit) {
        const midExtra = (bestBase.extraImplicit.min + bestBase.extraImplicit.max) / 2;
        const extraVal = bestBase.extraImplicit.noScale ? midExtra : Math.round(midExtra * scale);
        totals[bestBase.extraImplicit.stat] = (totals[bestBase.extraImplicit.stat] || 0) + extraVal;
      }
    }

    const eligibleAffixes = AFFIXES.filter(
      (a) => a.slots.includes(slot) && a.tiers.some((t) => t.minIlvl <= ilvl)
    );
    const totalWeight = eligibleAffixes.reduce((sum, a) => sum + (a.weight || 100), 0);
    if (totalWeight <= 0) continue;

    const expectedAffixCount = 3.5;
    for (const affix of eligibleAffixes) {
      const prob = Math.min(1, (expectedAffixCount * (affix.weight || 100)) / totalWeight);
      const validTiers = affix.tiers.filter((t) => t.minIlvl <= ilvl);
      const avgTierVal =
        validTiers.reduce((s, t) => s + (t.min + t.max) / 2, 0) / Math.max(1, validTiers.length);
      totals[affix.stat] = (totals[affix.stat] || 0) + prob * avgTierVal;
    }
  }

  return totals;
}

function getMaxExp(level) {
  return Math.floor(V.expBase * Math.pow(Math.max(1, level), V.expExponent));
}

function computePlayerStatsAtLevel(level) {
  const gear = computeExpectedRareGearStats(level);
  const baseHp = V.baseHp + V.hpPerLevel * (level - 1);
  const baseMp = V.baseMp + V.mpPerLevel * (level - 1);
  const baseAtk = V.baseAtk + V.atkPerLevel * (level - 1);
  const permBonus = Math.min(12, Math.floor(level * 0.35));

  const maxHp = Math.round(baseHp + gear.maxHp);
  const maxMp = Math.round(baseMp + gear.maxMp);
  const atk = Math.round((baseAtk + permBonus + gear.atk) * (1 + gear.atkPct / 100));
  const def = Math.round((V.baseDef || 0) + permBonus + gear.def);
  const skillDamagePct = Math.round(gear.skillDamage * 10) / 10;
  const critChance = Math.min(0.6, 0.05 + gear.critChance / 100);
  const critDamage = 1.5 + gear.critDamage / 100;
  const critExpectedMult = 1 + critChance * (critDamage - 1);
  const cdr = Math.min(0.4, gear.cdr / 100);
  const magicRes = Math.min(0.6, gear.magicRes / 100);
  const maxExp = getMaxExp(level);
  const expBonusPct = Math.round(gear.expBonus * 10) / 10;
  const findBonusPct = Math.round(gear.findBonus * 10) / 10;

  const skillRank = level >= 30 ? 5 : level >= 23 ? 4 : level >= 16 ? 3 : level >= 10 ? 2 : 1;
  const mantraMult = SKILL_BY_ID.mantra.rankScaling.damageMult[skillRank - 1];
  const humBoltMult = SKILL_BY_ID.humBolt.rankScaling.damageMult[skillRank - 1];

  const skillDmgFactor = 1 + skillDamagePct / 100;
  const avgMantraHit = atk * mantraMult * skillDmgFactor * critExpectedMult;
  const avgHumBoltHit = atk * humBoltMult * skillDmgFactor * critExpectedMult;

  return {
    level,
    skillRank,
    maxHp,
    maxMp,
    atk,
    def,
    skillDamagePct,
    critChancePct: +(critChance * 100).toFixed(1),
    critDamagePct: +(critDamage * 100).toFixed(0),
    cdrPct: +(cdr * 100).toFixed(1),
    magicResPct: +(magicRes * 100).toFixed(1),
    expBonusPct,
    findBonusPct,
    maxExp,
    avgMantraHit: Math.round(avgMantraHit),
    avgHumBoltHit: Math.round(avgHumBoltHit),
  };
}

const CHAPTER_CHECKPOINTS = [
  {
    chapter: '序章・高原原野 (Wild)',
    mapId: 'wild',
    level: 5,
    enemies: ['preta', 'tsen', 'migoi'],
    boss: { id: 'migoiKing', name: '雪山巨魔 (Migoi King)', bossLevel: 6, hp: 1660, def: 12, baseHeavyDmg: 24 },
  },
  {
    chapter: '第一章・帕平 (Pharping)',
    mapId: 'pharping',
    level: 10,
    enemies: ['dustDevil', 'thirstyPreta', 'droughtSprite'],
    boss: { id: 'droughtLord', name: '旱災龍王 (Drought Naga)', bossLevel: 10, hp: 2800, def: 16, baseHeavyDmg: 25 },
  },
  {
    chapter: '第二章・芒域山口 (Mangyul)',
    mapId: 'mangyul',
    level: 16,
    enemies: ['snowSprite', 'hailGhost', 'avalancheBrute'],
    boss: { id: 'tenmaStorm', name: '十二丹瑪之首 (Tenma Storm)', bossLevel: 16, hp: 4600, def: 24, baseHeavyDmg: 26 },
  },
  {
    chapter: '第三章・雅隆谷地 (Yarlung)',
    mapId: 'yarlung',
    level: 23,
    enemies: ['nyen', 'wildYak'],
    boss: { id: 'yarlhaShampo', name: '雅拉香波白犛 (Yarlha Shampo)', bossLevel: 23, hp: 7200, def: 32, baseHeavyDmg: 32 },
  },
  {
    chapter: '第四章・桑耶紅山 (Samye)',
    mapId: 'samye',
    level: 30,
    enemies: ['wallBreaker', 'du', 'gyalpo'],
    boss: { id: 'pehar', name: '三面六臂白哈爾 (Pehar)', bossLevel: 30, hp: 11000, def: 40, baseHeavyDmg: 44 },
  },
  {
    chapter: '終章・伏藏秘境 T5 (Terma T5)',
    mapId: 'terma',
    level: 35,
    tier: 5,
    enemies: ['snowSprite', 'droughtSprite', 'nyen', 'du'],
    boss: {
      id: 'termaGuardian',
      name: '守藏者 T5 (Terma Guardian)',
      bossLevel: 35,
      hp: Math.round(1200 * (1 + 0.2 * 34) * 1.5),
      def: 40,
      baseHeavyDmg: 26 + 5 * 2,
    },
  },
];

function computeMonsterStatsAtLevel(kindId, level, tier = 0) {
  const k = ALL_ENEMY_KINDS[kindId];
  if (!k) throw new Error(`Unknown enemy kind: ${kindId}`);
  const tierHpMult = tier > 0 ? 1 + 0.1 * tier : 1.0;
  const hpScale = (1 + 0.20 * (level - 1)) * tierHpMult;
  const dmgScale = 1 + 0.12 * (level - 1);
  const expScale = 1 + 0.18 * (level - 1);

  const hp = Math.max(1, Math.round(k.hp * hpScale));
  const exp = Math.max(1, Math.round(k.exp * expScale));
  const def = k.def || 0;

  const attacks = Array.isArray(k.attacks) ? k.attacks : [];
  let maxRawDmg = 8;
  let primaryType = 'physical';
  for (const atk of attacks) {
    if ((atk.damage || 0) >= maxRawDmg) {
      maxRawDmg = atk.damage;
      primaryType = atk.magic || atk.type === 'magic' ? 'magic' : 'physical';
    }
  }
  const scaledRawDmg = maxRawDmg * dmgScale;
  return {
    id: kindId,
    hp,
    def,
    exp,
    scaledRawDmg,
    primaryType,
  };
}

function mitigatePlayerDamage(rawDmg, type, playerStats) {
  const defConst = V.defConstant ?? 50;
  const magicFactor = V.magicDefFactor ?? 0.5;
  if (type === 'magic') {
    const defMit = (rawDmg * defConst) / (defConst + playerStats.def * magicFactor);
    return Math.max(1, Math.round(defMit * (1 - playerStats.magicResPct / 100)));
  }
  return Math.max(1, Math.round((rawDmg * defConst) / (defConst + playerStats.def)));
}

console.log('# 《蓮師足跡》數值平衡報表 (Balance Report — Issue #37)\n');

console.log('## 1. 玩家各章節期望屬性（同等級全身稀有裝備 Rare 8 件）\n');
console.log('| 章節 / 等級 | 技能階級 | 期望 HP | 期望 MP | 期望 ATK | 期望 DEF | 技能傷害加成 | 暴擊率 / 暴傷 | 六字咒單發期望 | 吽字光彈單發期望 | 升級所需 EXP |');
console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

const playerByLevel = {};
for (const cp of CHAPTER_CHECKPOINTS) {
  const p = computePlayerStatsAtLevel(cp.level);
  playerByLevel[cp.level] = p;
  console.log(
    `| ${cp.chapter} (**Lv.${p.level}**) | Rank ${p.skillRank} | ${p.maxHp} | ${p.maxMp} | ${p.atk} | ${p.def} | +${p.skillDamagePct}% | ${p.critChancePct}% / ${p.critDamagePct}% | ${p.avgMantraHit} | ${p.avgHumBoltHit} | ${p.maxExp} |`
  );
}

console.log('\n## 2. 各章節怪物命中次數、傷害占比與升級超度數\n');
console.log('> **目標**：同等級一般怪 **2–4 次六字咒**超度；單次一般攻擊 **≤ 15% 玩家 HP**。\n');
console.log('| 章節 (Lv) | 怪物 ID | 怪物 HP (DEF) | 六字咒命中數 | 吽字光彈命中數 | 怪物單次傷害 (占 HP %) | 單隻 EXP | 升級所需超度數 |');
console.log('| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |');

for (const cp of CHAPTER_CHECKPOINTS) {
  const p = playerByLevel[cp.level];
  for (const kindId of cp.enemies) {
    const m = computeMonsterStatsAtLevel(kindId, cp.level, cp.tier || 0);
    const enemyDefMult = 50 / (50 + m.def);
    const mantraEffDmg = Math.max(1, Math.round(p.avgMantraHit * enemyDefMult));
    const humBoltEffDmg = Math.max(1, Math.round(p.avgHumBoltHit * enemyDefMult));
    const mantraHits = +(m.hp / mantraEffDmg).toFixed(1);
    const humBoltHits = +(m.hp / humBoltEffDmg).toFixed(1);
    const playerDmgTaken = mitigatePlayerDamage(m.scaledRawDmg, m.primaryType, p);
    const dmgPctHp = +((playerDmgTaken / p.maxHp) * 100).toFixed(1);
    const killsToLevel = +(p.maxExp / m.exp).toFixed(1);

    console.log(
      `| ${cp.chapter} (Lv.${cp.level}) | \`${m.id}\` | ${m.hp} (${m.def}) | **${mantraHits}** 次 | ${humBoltHits} 次 | ${playerDmgTaken} (**${dmgPctHp}%**) | ${m.exp} | ${killsToLevel} 隻 |`
    );
  }
}

console.log('\n## 3. 菁英怪與章節 Boss 戰鬥時間 (TTK) 與大招傷害占比\n');
console.log('> **目標**：菁英怪 **15–30 秒**；章節 Boss **90–180 秒**；Boss 大招 **≤ 40% 玩家 HP**。\n');
console.log('| 章節 (Lv) | 目標類型 | HP (DEF) | 玩家有效對敵 DPS (含減傷/走位) | 預估超度時間 (TTK) | 最大招式傷害 (占玩家 HP %) |');
console.log('| :--- | :--- | :---: | :---: | :---: | :---: |');

for (const cp of CHAPTER_CHECKPOINTS) {
  const p = playerByLevel[cp.level];
  const rawBurstDps = p.avgMantraHit / 0.85 + p.avgHumBoltHit / 0.7;

  // Representative normal monster of the chapter for Rare Elite (4.0x HP + minion/affix engagement 1.4x)
  const repId = cp.enemies[0];
  const baseMob = computeMonsterStatsAtLevel(repId, cp.level, cp.tier || 0);
  const eliteDefMult = 50 / (50 + baseMob.def);
  const eliteSustainedDps = Math.max(1, Math.round(rawBurstDps * 0.28 * eliteDefMult));
  const rareEliteEffectiveHp = Math.round(baseMob.hp * 4.0 * 1.4);
  const eliteTtk = +(rareEliteEffectiveHp / eliteSustainedDps).toFixed(1);

  const boss = cp.boss;
  const bossDefMult = 50 / (50 + boss.def);
  const bossSustainedDps = Math.max(1, Math.round(rawBurstDps * 0.25 * bossDefMult));
  const bossTtk = +(boss.hp / bossSustainedDps).toFixed(1);

  const scaledBossRawDmg = Math.round(boss.baseHeavyDmg * (1 + 0.12 * (boss.bossLevel - 1)) * 1.8);
  const bossHitPlayer = mitigatePlayerDamage(scaledBossRawDmg, 'physical', p);
  const bossHitPct = +((bossHitPlayer / p.maxHp) * 100).toFixed(1);

  console.log(
    `| ${cp.chapter} (Lv.${cp.level}) | 稀有菁英群 (\`${repId}\` Rare) | ${rareEliteEffectiveHp} (${baseMob.def}) | ~${eliteSustainedDps}/s | **${eliteTtk}s** | — |`
  );
  console.log(
    `| ${cp.chapter} (Lv.${cp.level}) | **${boss.name}** | ${boss.hp} (${boss.def}) | ~${bossSustainedDps}/s | **${bossTtk}s** | ${bossHitPlayer} (**${bossHitPct}%**) |`
  );
}

// ---------------------------------------------------------------- 4. Story & Terma XP Progression Curve
console.log('\n## 4. 主線與伏藏秘境成長曲線（Lv.1 → Lv.30 主線畢業 → Lv.40 秘境滿級）\n');
console.log('| 階段 | 等級區間 | 升級所需總 EXP | 任務獎勵 EXP | 沿途戰鬥與 Boss 期望 EXP | 階段總獲得 EXP（含詞綴加成） | 結束時達成等級 |');
console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: |');

function sumExpRange(fromLvl, toLvl) {
  let sum = 0;
  for (let l = fromLvl; l < toLvl; l++) sum += getMaxExp(l);
  return sum;
}

function sumQuestExp(quests) {
  return quests.reduce((s, q) => s + (q.rewards?.exp || 0), 0);
}

const PROGRESSION_STAGES = [
  {
    name: '序章・博達哈佛塔與高原原野',
    from: 1,
    to: 5,
    questExp: sumQuestExp(PROLOGUE_QUESTS),
    combatExp: 180,
    expBonusMult: 1.03,
  },
  {
    name: '第一章・帕平（楊列雪與阿修羅洞）',
    from: 5,
    to: 10,
    questExp: sumQuestExp(CH1_QUESTS),
    combatExp: 620,
    expBonusMult: 1.06,
  },
  {
    name: '第二章・芒域貢塘山口',
    from: 10,
    to: 16,
    questExp: sumQuestExp(CH2_QUESTS),
    combatExp: 1350,
    expBonusMult: 1.09,
  },
  {
    name: '第三章・雅隆谷地與雅拉香波',
    from: 16,
    to: 23,
    questExp: sumQuestExp(CH3_QUESTS),
    combatExp: 2600,
    expBonusMult: 1.12,
  },
  {
    name: '第四章・桑耶寺與海波日山（主線完成）',
    from: 23,
    to: 30,
    questExp: sumQuestExp(CH4_QUESTS),
    combatExp: 3400,
    expBonusMult: 1.15,
  },
  {
    name: '終章・青朴修行地與伏藏秘境 (Tier 1–10)',
    from: 30,
    to: 40,
    questExp: sumQuestExp(CH5_QUESTS),
    combatExp: 31500,
    expBonusMult: 1.18,
  },
];

for (const st of PROGRESSION_STAGES) {
  const needed = sumExpRange(st.from, st.to);
  const totalEarned = Math.round((st.questExp + st.combatExp) * st.expBonusMult);
  console.log(
    `| ${st.name} | Lv.${st.from} → Lv.${st.to} | ${needed} | ${st.questExp} | ${st.combatExp} | **${totalEarned}** | **Lv.${st.to}** |`
  );
}

// ---------------------------------------------------------------- 5. Loot & Turquoise Economy Table
console.log('\n## 5. 掉寶頻率（每 10 分鐘伏藏期望值）與綠松石收支平衡\n');
console.log('| 階段 / 場景 | 10 分鐘超度規模（一般 / 菁英 / Boss） | 期望裝備總掉落數 | 10 分鐘「伏藏 (Terma)」期望數量 | 10 分鐘綠松石總收入（撿取 + 售賣白藍裝） | 商店購買單件加持裝價格 | 工匠首次重鑄價格 |');
console.log('| :--- | :--- | :---: | :---: | :---: | :---: | :---: |');

const ECONOMY_SCENARIOS = [
  { name: '第一章・帕平原野巡獵 (Lv.10)', level: 10, tier: 0, normals: 65, elites: 5, bosses: 1 },
  { name: '第三章・雅隆谷地巡獵 (Lv.23)', level: 23, tier: 0, normals: 75, elites: 6, bosses: 1 },
  { name: '第四章・桑耶紅山巡獵 (Lv.30)', level: 30, tier: 0, normals: 80, elites: 7, bosses: 1 },
  { name: '伏藏秘境 Tier 1 (Lv.31, 10m 1輪)', level: 31, tier: 1, normals: 42, elites: 6, bosses: 1, chestDrops: 5 },
  { name: '伏藏秘境 Tier 10 (Lv.40, 10m 1輪)', level: 40, tier: 10, normals: 48, elites: 18, bosses: 1, chestDrops: 6 },
];

for (const sc of ECONOMY_SCENARIOS) {
  const p = computePlayerStatsAtLevel(sc.level);
  const mfMult = 1 + p.findBonusPct / 100;
  const wNormal = 60;
  const wBlessed = 28 * mfMult;
  const wRare = 10 * mfMult;
  const wTerma = (2 + (sc.tier > 0 ? 0.3 * sc.tier : 0)) * mfMult;
  const wTotal = wNormal + wBlessed + wRare + wTerma;
  const termaProb = wTerma / wTotal;

  // Expected item drops: normal (0.18), elite avg (1.3), boss (4.0), plus Terma Chest + Crystals in dungeon
  const crystalDrops = sc.tier > 0 ? 6 : 0;
  const totalItems = +(
    sc.normals * 0.18 +
    sc.elites * 1.3 +
    sc.bosses * 4.0 +
    (sc.chestDrops || 0) +
    crystalDrops
  ).toFixed(1);

  // Terma chest at Tier >= 5 guarantees at least 1 Terma, plus natural rolls
  const guaranteedTerma = sc.tier >= 5 ? 1 : 0;
  const expectedTerma = +(totalItems * termaProb + guaranteedTerma * 0.65).toFixed(2);

  // Turquoise income: 35% drop rate * 2 * (1 + floor(L/5)) per mob + selling ~65% of normal/blessed drops + dungeon crystals
  const totalMobs = sc.normals + sc.elites + sc.bosses;
  const groundTurquoise = Math.round(totalMobs * 0.35 * 2 * (1 + Math.floor(sc.level / 5)));
  const avgSellVal = Math.round((4 + sc.level) * 0.75);
  const soldItemsTurquoise = Math.round(totalItems * 0.65 * avgSellVal);
  const crystalTurquoise = sc.tier > 0 ? 6 * (8 + sc.tier * 3) : 0;
  const totalTurquoiseIn = groundTurquoise + soldItemsTurquoise + crystalTurquoise;

  const shopBlessedBuyPrice = Math.round((4 + sc.level) * 1.0 * 4);
  const reforgeFirstCost = 10;

  console.log(
    `| ${sc.name} | ${sc.normals} 普 / ${sc.elites} 菁 / ${sc.bosses} 王 | ${totalItems} 件 | **${expectedTerma} 件** (${(termaProb * 100).toFixed(2)}%/件) | **+${totalTurquoiseIn} 💎** | ${shopBlessedBuyPrice} 💎 | ${reforgeFirstCost} 💎 (+20, +30…) |`
  );
}
