/**
 * Bilingual strings (zh-Hant & en) for Skills Framework, Advanced Active Skills,
 * Dharma Protectors, Ultimate Charge, and Terma Powers (#26, #27).
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
    'skills.chargeCost': '充能 {max}',
    'skills.ultChargeMeta': '充能 {charge} / {max}',
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
    'skills.effectDamageStun': '傷害 {mult}% 攻擊力 · 暈眩 {stun}s',
    'skills.effectStun': '傷害 {mult}% 攻擊力 · 暈眩 {stun}s',
    'skills.effectShield': '護盾 {pct}% 最大氣血 · 爆裂 80% 攻擊力',
    'skills.effectProtector': '持續 {dur} 秒 · 護法傷害 {mult}%',
    'skills.effectDuration': '持續 {dur} 秒',
    'skills.potionLabel': '甘露',
    'skills.protectorSelectTitle': '契印護法選擇',
    'skills.protectorActive': '出戰中',
    'skills.protectorSelect': '選擇護法',
    'skills.protectorLocked': '未解鎖',
    'protector.selectTitle': '契印護法選擇',
    'protector.active': '出戰中',
    'protector.select': '選擇護法',
    'protector.locked': '未解鎖',

    // Toasts
    'toast.respecHubOnly': '需回到佛塔聖域方可重置技能點',
    'toast.respecDone': '技能點已全部重置歸還',
    'toast.skillLocked': '此法門尚未解鎖',
    'toast.ultNotReady': '蓮師心咒充能尚未圓滿',
    'toast.skillPointSpent': '法門精進：{name} 升至等級 {rank}',
    'toast.skillEnhChosen': '已領悟專精：{name}',
    'toast.protectorUnlocked': '已締結護法契印：{name}',
    'toast.protectorSelected': '已切換出戰護法：{name}',
    'toast.tenmaOathTriggered': '丹瑪護法天衣發動：丹瑪女神顯現護持！',
    'toast.tenmaOathProc': '丹瑪護法天衣發動：丹瑪女神顯現護持！',
    'toast.bellResetProc': '靜命論師金剛鈴共鳴：六字真言冷卻重置，回復 15 MP！',

    // Buff names for HUD
    'item.vajraGuru_channel': '蓮師虹身加持',
    'item.vajraGuruChannel': '蓮師虹身加持',
    'item.vajraGuru_blessing': '蓮師無盡加持',
    'item.guruBlessing': '蓮師無盡加持',
    'item.protector_oath': '護法誓約',
    'item.protectorOath': '護法誓約',
    'item.samatha': '止觀定境',
    'item.chimphuStill': '止觀定境',

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
    'skill.phurba.name': '普巴橛',
    'skill.phurba.desc': '向前投擲三稜金剛普巴橛（12m 直線貫穿），對路徑上所有敵人造成 140% 攻擊力傷害並定身（root）2.0 秒。',
    'skill.phurba.unlockHint': '完成腐化林地伏藏任務解鎖',
    'skill.phurba.enhA.name': '甲・三橛',
    'skill.phurba.enhA.desc': '同時扇形投出 3 支金剛橛（±18°），每支造成 70% 傷害並定身。',
    'skill.phurba.enhB.name': '乙・釘地',
    'skill.phurba.enhB.desc': '定身改為暈眩 1.2 秒，且金剛橛釘入地面 1.0 秒後引爆 4m 範圍（60% 攻擊力）。',

    // 4. Vajra Bell (skill2 or skill3)
    'skill.vajraBell.name': '金剛鈴',
    'skill.vajraBell.desc': '搖動般若金剛鈴，向前方 90° 扇形（7m）釋放梵音震波，造成 100% 傷害、暈眩 1.0 秒、擊退 3.0m，並震碎範圍內敵方法術投射物。',
    'skill.vajraBell.unlockHint': '完成風雪山口主線任務解鎖',
    'skill.vajraBell.enhA.name': '甲・周遍',
    'skill.vajraBell.enhA.desc': '改為以自身為中心 360° 全方位（5m 半徑）梵音震波。',
    'skill.vajraBell.enhB.name': '乙・覺醒',
    'skill.vajraBell.enhB.desc': '受金剛鈴震懾的敵人陷入易傷狀態，4.0 秒內所受傷害 +25%。',

    // 5. Lotus Shield / Lotus Ward (skill3 or skill2)
    'skill.lotusShield.name': '蓮花結界',
    'skill.lotusShield.desc': '凝聚八葉金蓮環繞護體，獲得 30% 最大氣血護盾（持續 6.0 秒）；護盾破裂或結束時蓮瓣綻放爆裂，對 4.0m 內敵人造成 80% 攻擊力傷害。',
    'skill.lotusShield.unlockHint': '完成腐化林地淨化任務解鎖',
    'skill.lotusShield.enhA.name': '甲・蓮鏡',
    'skill.lotusShield.enhA.desc': '護盾存續期間，將靠近的敵方法術投射物反射回敵陣。',
    'skill.lotusShield.enhB.name': '乙・甘露',
    'skill.lotusShield.enhB.desc': '護盾結束或破裂時，將已吸收傷害量的 20% 轉化為自身氣血回復。',

    'skill.lotusWard.name': '蓮花結界',
    'skill.lotusWard.desc': '凝聚八葉金蓮環繞護體，獲得 30% 最大氣血護盾（持續 6.0 秒）；護盾破裂或結束時蓮瓣綻放爆裂，對 4.0m 內敵人造成 80% 攻擊力傷害。',
    'skill.lotusWard.unlockHint': '完成腐化林地淨化任務解鎖',
    'skill.lotusWard.enhA.name': '甲・蓮鏡',
    'skill.lotusWard.enhA.desc': '護盾存續期間，將靠近的敵方法術投射物反射回敵陣。',
    'skill.lotusWard.enhB.name': '乙・甘露',
    'skill.lotusWard.enhB.desc': '護盾結束或破裂時，將已吸收傷害量的 20% 轉化為自身氣血回復。',

    // 6. Dharma Protector (skill4 / 4)
    'skill.protector.name': '護法召喚',
    'skill.protector.desc': '祈請已締結契印的智慧護法化現助陣 12.0 秒，跟隨行者協同作戰，期滿化為金光消散。',
    'skill.protector.unlockHint': '解鎖任一護法後開啟',
    'skill.protector.enhA.name': '甲・眷屬',
    'skill.protector.enhA.desc': '額外召喚 2 尊護法化現眷屬（60% 體型與傷害）協同作戰。',
    'skill.protector.enhB.name': '乙・誓約',
    'skill.protector.enhB.desc': '護法在場期間，行者受到的所有傷害降低 15%。',

    // 7. Vajra Guru Mantra (ultimate / T)
    'skill.vajraGuru.name': '蓮師心咒',
    'skill.vajraGuru.desc': '集滿 30 點充能後引導 2.5 秒（期間無敵），十二金剛句「ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ」化為金色大法輪擴散至 16m，造成 500% 傷害並直接超度氣血低於 25% 的普通魔障。',
    'skill.vajraGuru.unlockHint': '迎請蓮花生大士聖像安座後解鎖',
    'skill.vajraGuru.enhA.name': '甲・普照',
    'skill.vajraGuru.enhA.desc': '蓮師心咒金色大法輪波及半徑擴大至 22m。',
    'skill.vajraGuru.enhB.name': '乙・加持',
    'skill.vajraGuru.enhB.desc': '施放後 10.0 秒內，所有技能消耗 0 點法力。',

    'skill.guruMantra.name': '蓮師心咒',
    'skill.guruMantra.desc': '集滿 30 點充能後引導 2.5 秒（期間無敵），十二金剛句「ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ」化為金色大法輪擴散至 16m，造成 500% 傷害並直接超度氣血低於 25% 的普通魔障。',
    'skill.guruMantra.unlockHint': '迎請蓮花生大士聖像安座後解鎖',
    'skill.guruMantra.enhA.name': '甲・普照',
    'skill.guruMantra.enhA.desc': '蓮師心咒金色大法輪波及半徑擴大至 22m。',
    'skill.guruMantra.enhB.name': '乙・加持',
    'skill.guruMantra.enhB.desc': '施放後 10.0 秒內，所有技能消耗 0 點法力。',

    // Dharma Protectors (3)
    'protector.tenma.name': '丹瑪女神',
    'protector.tenma.title': '遠程・冰雹光球',
    'protector.tenma.desc': '飄浮於空中的雪域護法女神，每 1.2 秒投射冰雹光球，造成 50% 攻擊力傷害並附加寒霜緩速。',
    'protector.tenma.unlockHint': '完成帕平或雪山支線任務解鎖',

    'protector.whiteYak.name': '白犛牛',
    'protector.whiteYak.title': '坦克・衝撞嘲諷',
    'protector.whiteYak.desc': '頭頂金角的雪山神獸，衝撞敵人造成 80% 攻擊力傷害與擊退，每 5.0 秒咆哮嘲諷並震懾周遭魔障。',
    'protector.whiteYak.unlockHint': '完成風雪山口護法任務解鎖',

    'protector.pehar.name': '白哈爾',
    'protector.pehar.title': '範圍・金剛法輪',
    'protector.pehar.desc': '三頭冠冕的桑耶鎮寺護法王，每 3.0 秒降下金色法輪轟擊 4.0m 範圍，造成 100% 攻擊力法術傷害。',
    'protector.pehar.unlockHint': '完成桑耶寺護法傳承任務解鎖',
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
    'skills.chargeCost': 'Charge {max}',
    'skills.ultChargeMeta': 'Charge {charge} / {max}',
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
    'skills.effectDamageStun': '{mult}% ATK Damage · {stun}s Stun',
    'skills.effectStun': '{mult}% ATK Damage · {stun}s Stun',
    'skills.effectShield': 'Shield {pct}% Max HP · Burst 80% ATK',
    'skills.effectProtector': '{dur}s Duration · {mult}% Protector DMG',
    'skills.effectDuration': '{dur}s Duration',
    'skills.potionLabel': 'Amrita',
    'skills.protectorSelectTitle': 'Active Dharma Protector',
    'skills.protectorActive': 'Selected',
    'skills.protectorSelect': 'Select',
    'skills.protectorLocked': 'Locked',
    'protector.selectTitle': 'Active Dharma Protector',
    'protector.active': 'Selected',
    'protector.select': 'Select',
    'protector.locked': 'Locked',

    // Toasts
    'toast.respecHubOnly': 'Return to the Stupa Sanctuary to respec Skill Points',
    'toast.respecDone': 'All Skill Points have been refunded',
    'toast.skillLocked': 'This skill is not yet unlocked',
    'toast.ultNotReady': 'Vajra Guru Mantra charge incomplete',
    'toast.skillPointSpent': '{name} upgraded to Rank {rank}',
    'toast.skillEnhChosen': 'Mastery selected: {name}',
    'toast.protectorUnlocked': 'Dharma Protector unlocked: {name}',
    'toast.protectorSelected': 'Active Protector set to: {name}',
    'toast.tenmaOathTriggered': 'Tenma Celestial Robe triggered: Goddess Tenma summoned!',
    'toast.tenmaOathProc': 'Tenma Celestial Robe triggered: Goddess Tenma summoned!',
    'toast.bellResetProc': 'Vajra Bell of Santaraksita: Mantra cooldown reset and +15 MP restored!',

    // Buff names for HUD
    'item.vajraGuru_channel': 'Vajra Rainbow Body',
    'item.vajraGuruChannel': 'Vajra Rainbow Body',
    'item.vajraGuru_blessing': 'Siddhi Free-Mana Blessing',
    'item.guruBlessing': 'Siddhi Free-Mana Blessing',
    'item.protector_oath': 'Protector Oath',
    'item.protectorOath': 'Protector Oath',
    'item.samatha': 'Samatha Stillness',
    'item.chimphuStill': 'Samatha Stillness',

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
    'skill.phurba.desc': 'Throw a 3-sided ritual dagger forward (12m piercing line), dealing 140% ATK damage to all enemies in path and rooting them for 2.0s.',
    'skill.phurba.unlockHint': 'Complete the Corrupted Grove Terma quest to unlock',
    'skill.phurba.enhA.name': 'A · Triple Kilaya',
    'skill.phurba.enhA.desc': 'Throws a fan of 3 daggers (±18°), each dealing 70% damage and rooting targets.',
    'skill.phurba.enhB.name': 'B · Earth-Pinning',
    'skill.phurba.enhB.desc': 'Replaces root with a 1.2s stun; dagger plants in the ground and explodes after 1.0s in a 4m AoE (60% ATK).',

    // 4. Vajra Bell (skill2 or skill3)
    'skill.vajraBell.name': 'Vajra Bell',
    'skill.vajraBell.desc': 'Unleash a forward 90° sonic cone (7m) dealing 100% ATK damage, stunning for 1.0s, knocking back 3.0m, and dispelling enemy magic projectiles.',
    'skill.vajraBell.unlockHint': 'Complete the Snow Pass main quest to unlock',
    'skill.vajraBell.enhA.name': 'A · Omnipresent Peal',
    'skill.vajraBell.enhA.desc': 'Becomes a full 360° sonic wave (5m radius) around the practitioner.',
    'skill.vajraBell.enhB.name': 'B · Awakening Resonance',
    'skill.vajraBell.enhB.desc': 'Stunned enemies become vulnerable, taking +25% damage for 4.0s.',

    // 5. Lotus Shield / Lotus Ward (skill3 or skill2)
    'skill.lotusShield.name': 'Lotus Shield',
    'skill.lotusShield.desc': 'Grants a shield equal to 30% Max HP for 6.0s wreathed in orbiting lotus petals; when broken or expired, bursts in a 4.0m radius for 80% ATK damage.',
    'skill.lotusShield.unlockHint': 'Complete the Grove Purification quest to unlock',
    'skill.lotusShield.enhA.name': 'A · Lotus Mirror',
    'skill.lotusShield.enhA.desc': 'While the shield holds, reflects incoming enemy magic projectiles back at foes.',
    'skill.lotusShield.enhB.name': 'B · Amrita Dew',
    'skill.lotusShield.enhB.desc': 'When the shield ends or breaks, heals the player for 20% of damage absorbed.',

    'skill.lotusWard.name': 'Lotus Shield',
    'skill.lotusWard.desc': 'Grants a shield equal to 30% Max HP for 6.0s wreathed in orbiting lotus petals; when broken or expired, bursts in a 4.0m radius for 80% ATK damage.',
    'skill.lotusWard.unlockHint': 'Complete the Grove Purification quest to unlock',
    'skill.lotusWard.enhA.name': 'A · Lotus Mirror',
    'skill.lotusWard.enhA.desc': 'While the shield holds, reflects incoming enemy magic projectiles back at foes.',
    'skill.lotusWard.enhB.name': 'B · Amrita Dew',
    'skill.lotusWard.enhB.desc': 'When the shield ends or breaks, heals the player for 20% of damage absorbed.',

    // 6. Dharma Protector (skill4 / 4)
    'skill.protector.name': 'Dharma Protector',
    'skill.protector.desc': 'Summon the active Dharma Protector for 12.0s to follow you and strike nearby foes before dissolving into golden light.',
    'skill.protector.unlockHint': 'Unlock any Dharma Protector to use',
    'skill.protector.enhA.name': 'A · Retinue Avatars',
    'skill.protector.enhA.desc': 'Summons 2 additional smaller avatar clones (60% scale & damage each).',
    'skill.protector.enhB.name': 'B · Dharma Oath',
    'skill.protector.enhB.desc': 'While a protector is active, you take 15% reduced damage.',

    // 7. Vajra Guru Mantra (ultimate / T)
    'skill.vajraGuru.name': 'Vajra Guru Mantra',
    'skill.vajraGuru.desc': 'Requires 30 Charge. Channel for 2.5s (invulnerable while channeling) as the 12 Tibetan syllables expand to 16m, dealing 500% ATK damage and instantly liberating normal foes below 25% HP.',
    'skill.vajraGuru.unlockHint': 'Enshrine the Statue of Guru Rinpoche to unlock',
    'skill.vajraGuru.enhA.name': 'A · Universal Radiance',
    'skill.vajraGuru.enhA.desc': 'Expands the golden mantra ring radius to 22m.',
    'skill.vajraGuru.enhB.name': 'B · Siddhi Blessing',
    'skill.vajraGuru.enhB.desc': 'For 10.0s after casting, all skills cost 0 MP.',

    'skill.guruMantra.name': 'Vajra Guru Mantra',
    'skill.guruMantra.desc': 'Requires 30 Charge. Channel for 2.5s (invulnerable while channeling) as the 12 Tibetan syllables expand to 16m, dealing 500% ATK damage and instantly liberating normal foes below 25% HP.',
    'skill.guruMantra.unlockHint': 'Enshrine the Statue of Guru Rinpoche to unlock',
    'skill.guruMantra.enhA.name': 'A · Universal Radiance',
    'skill.guruMantra.enhA.desc': 'Expands the golden mantra ring radius to 22m.',
    'skill.guruMantra.enhB.name': 'B · Siddhi Blessing',
    'skill.guruMantra.enhB.desc': 'For 10.0s after casting, all skills cost 0 MP.',

    // Dharma Protectors (3)
    'protector.tenma.name': 'Goddess Tenma',
    'protector.tenma.title': 'Ranged · Hailstone Orbs',
    'protector.tenma.desc': 'Floats gracefully in celestial robes, firing hailstone light orbs every 1.2s for 50% ATK damage and chilling foes.',
    'protector.tenma.unlockHint': 'Complete the Pharping or Snowland side quest to unlock',

    'protector.whiteYak.name': 'Sacred White Yak',
    'protector.whiteYak.title': 'Tank · Charge & Taunt',
    'protector.whiteYak.desc': 'Golden-horned highland guardian that charges foes for 80% ATK + knockback and taunts nearby enemies every 5.0s.',
    'protector.whiteYak.unlockHint': 'Complete the Snow Pass guardian quest to unlock',

    'protector.pehar.name': 'Dharmapala Pehar',
    'protector.pehar.title': 'AoE · Dharma Wheel',
    'protector.pehar.desc': 'Three-headed guardian king of Samye who drops a golden Dharma wheel every 3.0s in a 4.0m AoE for 100% ATK damage.',
    'protector.pehar.unlockHint': 'Complete the Samye Protector lineage quest to unlock',
  },
};

export function registerSkillStrings() {
  i18n.register(SKILL_STRINGS);
}

registerSkillStrings();
