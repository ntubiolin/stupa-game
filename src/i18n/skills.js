/**
 * Bilingual strings (zh-Hant & en) for Skills Framework, Skill Bar, and Skills Modal Panel (#26).
 */
import { i18n } from '../i18n.js';

export const SKILL_STRINGS = {
  'zh-Hant': {
    // Panel & HUD labels
    'skills.title': '真言與伏藏法門',
    'skills.subtitle': '隨修行等級提升獲得技能點，第 3 級可抉擇法門專精',
    'skills.points': '技能點：{points}',
    'skills.respec': '重置技能點',
    'skills.respecHubHint': '僅可於佛塔聖域重置',
    'skills.rank': '等級 {rank} / {max}',
    'skills.locked': '未解鎖',
    'skills.unlockDefaultHint': '完成主線或伏藏任務解鎖',
    'skills.mpCost': '{mp} 法力',
    'skills.mpFree': '無消耗',
    'skills.cooldown': '冷卻 {cd} 秒',
    'skills.currentEffect': '當前效果：{effect}',
    'skills.nextEffect': '下一級：{effect}',
    'skills.maxRankReached': '已達最高圓滿等級',
    'skills.upgradeBtn': '升級 (+1)',
    'skills.enhTitle': '三階法門抉擇（Rank 3 解鎖）',
    'skills.enhLocked': '達等級 3 可擇一專精',
    'skills.enhChoose': '選擇專精',
    'skills.enhSelected': '已修持',
    'skills.effectDamage': '傷害 {mult}% 攻擊力',
    'skills.effectDamageRadius': '傷害 {mult}% 攻擊力 · 半徑 +{radius}m',
    'skills.effectDuration': '持續 {dur} 秒',
    'skills.potionLabel': '甘露',

    // Toasts
    'toast.respecHubOnly': '需回到佛塔聖域方可重置技能點',
    'toast.respecDone': '技能點已全部重置歸還',
    'toast.skillLocked': '此法門尚未解鎖',
    'toast.skillPointSpent': '法門精進：{name} 升至等級 {rank}',
    'toast.skillEnhChosen': '已領悟專精：{name}',

    // 1. Hum Bolt (basic / Space)
    'skill.humBolt.name': '吽字光彈',
    'skill.humBolt.desc': '凝結心間金剛種子字「ཧཱུྃ」化為金色光彈射向敵方，命中造成法術傷害並回復 2 點法力。施放時移動速度略降。',
    'skill.humBolt.enhA.name': '甲・金剛貫穿',
    'skill.humBolt.enhA.desc': '光彈可貫穿最多 2 名敵人（單發最多命中 3 名目標）。',
    'skill.humBolt.enhB.name': '乙・明咒迴響',
    'skill.humBolt.enhB.desc': '光彈命中敵人時，法力回復量由 2 點提升至 3 點。',

    // 2. Six-Syllable Mantra (chant / R)
    'skill.mantra.name': '六字大明咒',
    'skill.mantra.desc': '誦持「ཨོཾ་མ་ཎི་པ་དྨེ་ཧཱུྃ」，展開金色蓮華曼荼羅音浪，對周遭敵人造成範圍法術傷害並震退。',
    'skill.mantra.enhA.name': '甲・遍照十方',
    'skill.mantra.enhA.desc': '大明咒音浪波及半徑擴大 25%。',
    'skill.mantra.enhB.name': '乙・大悲調伏',
    'skill.mantra.enhB.desc': '受音浪波及之敵人陷入 40% 緩速，持續 2 秒。',

    // 3. Vajra Phurba (skill1 / 1)
    'skill.phurba.name': '普巴金剛橛',
    'skill.phurba.desc': '投擲三稜金剛橛貫穿前方路徑，破除魔障並釘住目標。',
    'skill.phurba.unlockHint': '完成腐化林地伏藏任務解鎖',
    'skill.phurba.enhA.name': '甲・破障裂印',
    'skill.phurba.enhA.desc': '金剛橛命中時額外附加破甲與流血印記。',
    'skill.phurba.enhB.name': '乙・定魔結界',
    'skill.phurba.enhB.desc': '金剛橛落點張開鎮伏法陣，延長定身時間。',

    // 4. Lotus Ward (skill2 / 2)
    'skill.lotusWard.name': '蓮華護輪',
    'skill.lotusWard.desc': '於周身綻放八葉金蓮護盾，吸收傷害並淨化負面狀態。',
    'skill.lotusWard.unlockHint': '完成腐化林地淨化任務解鎖',
    'skill.lotusWard.enhA.name': '甲・金剛不壞',
    'skill.lotusWard.enhA.desc': '護輪吸收量提升 35%，持續時間延長。',
    'skill.lotusWard.enhB.name': '乙・清淨甘露',
    'skill.lotusWard.enhB.desc': '護輪展開期間每秒回復生命值。',

    // 5. Vajra Bell (skill3 / 3)
    'skill.vajraBell.name': '金剛鈴音',
    'skill.vajraBell.desc': '搖動般若金剛鈴，以清越梵音震懾四周敵人並賦予自身迅捷。',
    'skill.vajraBell.unlockHint': '完成風雪山口主線任務解鎖',
    'skill.vajraBell.enhA.name': '甲・雷音震懾',
    'skill.vajraBell.enhA.desc': '鈴音使範圍內敵人陷入短暫暈眩。',
    'skill.vajraBell.enhB.name': '乙・般若輕安',
    'skill.vajraBell.enhB.desc': '施放後大幅提升移動速度與冷卻縮減。',

    // 6. Dharma Protector (skill4 / 4)
    'skill.protector.name': '護法祈請',
    'skill.protector.desc': '祈請智慧護法化現助陣，自動追擊附近魔障並分擔威脅。',
    'skill.protector.unlockHint': '完成雪山伏藏傳承任務解鎖',
    'skill.protector.enhA.name': '甲・忿怒金剛火',
    'skill.protector.enhA.desc': '護法攻擊附帶智慧烈焰範圍灼燒。',
    'skill.protector.enhB.name': '乙・金剛威懾',
    'skill.protector.enhB.desc': '護法登場時嘲諷周遭敵人並強化自身護甲。',

    // 7. Guru Rinpoche Sidhi Mantra (ultimate / T)
    'skill.guruMantra.name': '蓮師心咒・十二金剛句',
    'skill.guruMantra.desc': '唱誦「ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ」，顯化虹光大曼荼羅，持續降伏萬魔並賜予無上加持。',
    'skill.guruMantra.unlockHint': '迎請蓮花生大士聖像安座後解鎖',
    'skill.guruMantra.enhA.name': '甲・虹光大圓滿',
    'skill.guruMantra.enhA.desc': '曼荼羅範圍與持續傷害提升 30%。',
    'skill.guruMantra.enhB.name': '乙・悉地加持',
    'skill.guruMantra.enhB.desc': '施放期間回復大量生命與法力，並減免所受傷害。',
  },
  en: {
    // Panel & HUD labels
    'skills.title': 'Mantras & Terma Skills',
    'skills.subtitle': 'Earn Skill Points on level up; unlock Rank 3 Mastery specializations',
    'skills.points': 'Skill Points: {points}',
    'skills.respec': 'Respec',
    'skills.respecHubHint': 'Respec only available at the Stupa Sanctuary',
    'skills.rank': 'Rank {rank} / {max}',
    'skills.locked': 'Locked',
    'skills.unlockDefaultHint': 'Complete quest to unlock',
    'skills.mpCost': '{mp} MP',
    'skills.mpFree': '0 MP',
    'skills.cooldown': '{cd}s CD',
    'skills.currentEffect': 'Current: {effect}',
    'skills.nextEffect': 'Next Rank: {effect}',
    'skills.maxRankReached': 'Maximum Rank Reached',
    'skills.upgradeBtn': 'Upgrade (+1)',
    'skills.enhTitle': 'Rank 3 Mastery Specialization',
    'skills.enhLocked': 'Reach Rank 3 to choose a mastery',
    'skills.enhChoose': 'Select',
    'skills.enhSelected': 'Active',
    'skills.effectDamage': '{mult}% ATK Damage',
    'skills.effectDamageRadius': '{mult}% ATK Damage · +{radius}m Radius',
    'skills.effectDuration': '{dur}s Duration',
    'skills.potionLabel': 'Amrita',

    // Toasts
    'toast.respecHubOnly': 'Return to the Stupa Sanctuary to respec Skill Points',
    'toast.respecDone': 'All Skill Points have been refunded',
    'toast.skillLocked': 'This skill is not yet unlocked',
    'toast.skillPointSpent': '{name} upgraded to Rank {rank}',
    'toast.skillEnhChosen': 'Mastery selected: {name}',

    // 1. Hum Bolt (basic / Space)
    'skill.humBolt.name': 'Hum Seed Bolt',
    'skill.humBolt.desc': 'Project the golden seed syllable "ཧཱུྃ" forward, dealing magic damage and restoring 2 MP on hit. Slightly slows movement briefly while casting.',
    'skill.humBolt.enhA.name': 'A · Vajra Piercing',
    'skill.humBolt.enhA.desc': 'Pierces through up to 2 enemies (hitting up to 3 targets per bolt).',
    'skill.humBolt.enhB.name': 'B · Mantra Resonance',
    'skill.humBolt.enhB.desc': 'Restores 3 MP on hit instead of 2 MP.',

    // 2. Six-Syllable Mantra (chant / R)
    'skill.mantra.name': 'Six-Syllable Mantra',
    'skill.mantra.desc': 'Chant "Om Mani Padme Hum" to unleash an expanding golden lotus mandala wave that damages and knocks back nearby foes.',
    'skill.mantra.enhA.name': 'A · Boundless Radiance',
    'skill.mantra.enhA.desc': 'Increases mantra wave radius by 25%.',
    'skill.mantra.enhB.name': 'B · Great Compassion',
    'skill.mantra.enhB.desc': 'Enemies hit by the mantra wave are slowed by 40% for 2 seconds.',

    // 3. Vajra Phurba (skill1 / 1)
    'skill.phurba.name': 'Vajra Phurba',
    'skill.phurba.desc': 'Hurl a three-sided ritual dagger forward to pierce obstacles and pin dark spirits.',
    'skill.phurba.unlockHint': 'Complete the Corrupted Grove Terma quest to unlock',
    'skill.phurba.enhA.name': 'A · Sunder Seal',
    'skill.phurba.enhA.desc': 'Phurba strikes sunder armor and inflict bleeding.',
    'skill.phurba.enhB.name': 'B · Binding Kilaya',
    'skill.phurba.enhB.desc': 'Consecrates impact ground to extend root duration.',

    // 4. Lotus Ward (skill2 / 2)
    'skill.lotusWard.name': 'Lotus Ward',
    'skill.lotusWard.desc': 'Wreathe yourself in an eight-petaled golden lotus barrier that absorbs damage and cleanses afflictions.',
    'skill.lotusWard.unlockHint': 'Complete the Grove Purification quest to unlock',
    'skill.lotusWard.enhA.name': 'A · Indestructible Petal',
    'skill.lotusWard.enhA.desc': 'Increases barrier absorption by 35% and extends duration.',
    'skill.lotusWard.enhB.name': 'B · Nectar Dew',
    'skill.lotusWard.enhB.desc': 'Restores HP each second while the lotus ward holds.',

    // 5. Vajra Bell (skill3 / 3)
    'skill.vajraBell.name': 'Vajra Bell',
    'skill.vajraBell.desc': 'Ring the wisdom bell to stagger surrounding foes and grant swiftness.',
    'skill.vajraBell.unlockHint': 'Complete the Snow Pass main quest to unlock',
    'skill.vajraBell.enhA.name': 'A · Thunder Peal',
    'skill.vajraBell.enhA.desc': 'Bell resonance briefly stuns nearby enemies.',
    'skill.vajraBell.enhB.name': 'B · Prajna Swiftness',
    'skill.vajraBell.enhB.desc': 'Grants bonus move speed and cooldown reduction after ringing.',

    // 6. Dharma Protector (skill4 / 4)
    'skill.protector.name': 'Dharma Protector',
    'skill.protector.desc': 'Invoke a luminous guardian manifestation to pursue nearby foes and draw aggression.',
    'skill.protector.unlockHint': 'Complete the Mountain Lineage quest to unlock',
    'skill.protector.enhA.name': 'A · Wrathful Wisdom Fire',
    'skill.protector.enhA.desc': 'Protector strikes ignite enemies with area wisdom flames.',
    'skill.protector.enhB.name': 'B · Adamantine Presence',
    'skill.protector.enhB.desc': 'Taunts nearby foes on arrival and fortifies defense.',

    // 7. Guru Rinpoche Mantra (ultimate / T)
    'skill.guruMantra.name': 'Vajra Guru Mantra',
    'skill.guruMantra.desc': 'Invoke the Twelve-Syllable Mantra of Guru Rinpoche, manifesting a rainbow mandala that vanquishes darkness and bestows supreme blessing.',
    'skill.guruMantra.unlockHint': 'Enshrine the Statue of Guru Rinpoche to unlock',
    'skill.guruMantra.enhA.name': 'A · Rainbow Dzogchen',
    'skill.guruMantra.enhA.desc': 'Increases mandala radius and damage over time by 30%.',
    'skill.guruMantra.enhB.name': 'B · Siddhi Blessing',
    'skill.guruMantra.enhB.desc': 'Restores HP & MP continuously and reduces damage taken while active.',
  },
};

export function registerSkillStrings() {
  i18n.register(SKILL_STRINGS);
}

registerSkillStrings();
