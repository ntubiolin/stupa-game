/**
 * Bilingual strings (`zh-Hant` & `en`) for Adventure Mode Terma Caves,
 * Interactive Terma Extraction, Shogser Scrolls, Mendrup Relics, and Tertön's Compass (#137).
 */
import { i18n } from '../i18n.js';

export const TERMA_CAVES_STRINGS = {
  'zh-Hant': {
    // Power proc toast
    'toast.dakiniMirrorProc': '【空行母秘密明鏡】化現五色虹光護體，免疫傷害並回復 40% 氣血！',

    // Cave Names
    'termaCave.pharping.name': '阿修羅洞・普巴巖龕',
    'termaCave.mangyul.name': '芒域・雪獅冰窟',
    'termaCave.yarlung.name': '謝札・水晶秘窟',
    'termaCave.samye.name': '海波日・黑曜鎮魔窟',
    'termaCave.chimphu.name': '青朴・蓮師身印秘窟',

    // Shogser Scrolls (5 Yellow Parchment Scrolls)
    'termaScroll.ch1.name': '《揚列雪黃紙伏藏卷》',
    'termaScroll.ch2.name': '《芒域雪山黃紙伏藏卷》',
    'termaScroll.ch3.name': '《謝札水晶黃紙伏藏卷》',
    'termaScroll.ch4.name': '《海波日鎮魔黃紙伏藏卷》',
    'termaScroll.ch5.name': '《青朴甚深黃紙伏藏卷》',

    // Mendrup Sacred Pills (5 Permanent Blessing Relics)
    'termaMendrup.ch1.name': '【揚列雪長壽甘露丸】（永久氣血 +25、攻擊 +3）',
    'termaMendrup.ch2.name': '【雪山金剛甘露丸】（永久氣血 +35、防禦 +4）',
    'termaMendrup.ch3.name': '【雅隆般若甘露丸】（永久心力 +20、攻擊 +4）',
    'termaMendrup.ch4.name': '【桑耶鎮魔甘露丸】（永久氣血 +40、攻防 +5）',
    'termaMendrup.ch5.name': '【烏金大圓滿甘露丸】（永久氣血 +50、心力 +25、技能點 +1）',

    // Tertön's Compass
    'termaRelic.compass.name': '【掘藏師羅盤】',
    'termaRelic.compass.desc': '已開啟掘藏師慧眼：小地圖將標示所有未取出的伏藏山洞、秘境伏藏密室與晶石方位！',

    // Prompts for Chapter Terma Caves
    'prompt.termaCave.awaken': '探查{name}（觸發護藏守怪試煉）',
    'prompt.termaCave.sealed': '{name}受魔障封印（尚餘 {remaining} 名守怪）',
    'prompt.termaCave.extract': '破印取藏：取出{name}伏藏聖物',
    'prompt.termaCave.rechallenge': '重啟{name}護藏試煉（再次挑戰守怪取寶）',

    // Prompts for Yeshe Tsogyal's Shogser Scroll Table in Chimphu
    'prompt.shogserTable.progress': '黃紙伏藏法卷案几（已收集 {count}/5 部法卷）',
    'prompt.shogserTable.decipher': '破譯五部《黃紙伏藏法卷》（領受大掘藏師灌頂）',
    'prompt.shogserTable.done': '觀覽已破譯的五部《黃紙伏藏法卷》',

    // Prompts for Terma Dungeon Vault Room & Floor 3 Chest
    'prompt.dungeonVault.sealed': '古巖伏藏龕（需先度化密室護藏守衛，尚餘 {remaining}）',
    'prompt.dungeonVault.extract': '開啟古巖伏藏龕（取出密室伏藏物）',
    'prompt.termaBossChest': '開啟【伏藏寶匣】（取出蓮師甚深伏藏）',

    // Toasts
    'toast.termaCave.ambush': '踏入{name}！護藏結界甦醒，請先度化洞內 {count} 名守衛以解開伏藏封印！',
    'toast.termaCave.stillGuarded': '伏藏巖龕仍受魔障遮蔽，請先度化洞內剩餘的 {remaining} 名守怪！',
    'toast.termaCave.unsealed': '{name}的魔障已盡數度化！金剛種子字綻放虹光，可上前互動取出伏藏物！',
    'toast.termaCave.extracted': '伏藏開顯！從{name}取出：{relics}！',
    'toast.termaCave.repeatExtracted': '再次開啟{name}伏藏龕，獲得伏藏精華 ×{essence} 與綠松石 +{turquoise}！',
    'toast.shogserTable.incomplete': '目前已從各章節山洞取出 {count}/5 部《黃紙伏藏法卷》，集齊五部即可破譯密意。',
    'toast.shogserTable.deciphered': '五部《黃紙伏藏法卷》破譯圓滿！獲賜「大掘藏師灌頂」：技能點 +2、永久氣血 +60、攻防 +8、伏藏精華 ×3！',
    'toast.shogserTable.alreadyDone': '五部《黃紙伏藏法卷》於案几上綻放吉祥金光，蓮師密意已深植於心。',
    'toast.dungeonVault.unsealed': '密室護藏精銳已度化！【古巖伏藏龕】封印解開，請上前互動取出伏藏物！',
    'toast.dungeonVault.extracted': '從【古巖伏藏龕】取出秘境伏藏物，獲得伏藏精華 ×{essence} 與綠松石 +{turquoise}！',
    'toast.termaBossChest.ready': '守藏者已伏法！請上前與壇城中央的【伏藏寶匣】互動以取出伏藏聖物！',
    'toast.termaBossChest.opened': '【伏藏寶匣】虹光大作！已取出蓮師伏藏裝備與伏藏精華！',
  },
  en: {
    // Power proc toast
    'toast.dakiniMirrorProc': 'Secret Mirror of the Dakini radiates rainbow light: 2.5s invulnerability & +40% HP restored!',

    // Cave Names
    'termaCave.pharping.name': 'Asura Cave · Phurba Cliff Niche',
    'termaCave.mangyul.name': 'Mangyul · Snow-Lion Ice Grotto',
    'termaCave.yarlung.name': 'Sheldrak · Inner Crystal Cavern',
    'termaCave.samye.name': 'Hepo Ri · Obsidian Subjugation Grotto',
    'termaCave.chimphu.name': 'Chimphu · Guru Body-Print Grotto',

    // Shogser Scrolls
    'termaScroll.ch1.name': 'Yangleshö Shogser Scroll',
    'termaScroll.ch2.name': 'Mangyul Snowland Shogser Scroll',
    'termaScroll.ch3.name': 'Sheldrak Crystal Shogser Scroll',
    'termaScroll.ch4.name': 'Hepo Ri Subjugation Shogser Scroll',
    'termaScroll.ch5.name': 'Chimphu Profound Shogser Scroll',

    // Mendrup Sacred Pills
    'termaMendrup.ch1.name': 'Yangleshö Longevity Mendrup (Perm MaxHP +25, ATK +3)',
    'termaMendrup.ch2.name': 'Snowland Vajra Mendrup (Perm MaxHP +35, DEF +4)',
    'termaMendrup.ch3.name': 'Yarlung Prajna Mendrup (Perm MaxMP +20, ATK +4)',
    'termaMendrup.ch4.name': 'Samye Subjugation Mendrup (Perm MaxHP +40, ATK/DEF +5)',
    'termaMendrup.ch5.name': 'Oddiyana Dzogchen Mendrup (Perm MaxHP +50, MaxMP +25, Skill Pt +1)',

    // Tertön's Compass
    'termaRelic.compass.name': "Tertön's Compass",
    'termaRelic.compass.desc': "Tertön's Eye awakened: the minimap now marks all unextracted Terma Caves, Dungeon Vaults, and Terma Crystals!",

    // Prompts for Chapter Terma Caves
    'prompt.termaCave.awaken': 'Inspect {name} (Awaken Cave Guardians)',
    'prompt.termaCave.sealed': '{name} Sealed ({remaining} Guardians Remaining)',
    'prompt.termaCave.extract': 'Unseal & Extract Terma from {name}',
    'prompt.termaCave.rechallenge': 'Re-awaken {name} Trial (Fight Guardians for Terma Loot)',

    // Prompts for Yeshe Tsogyal's Shogser Scroll Table in Chimphu
    'prompt.shogserTable.progress': 'Shogser Scroll Table ({count}/5 Scrolls Collected)',
    'prompt.shogserTable.decipher': 'Decipher the Five Shogser Scrolls (Grand Tertön Empowerment)',
    'prompt.shogserTable.done': 'Inspect the Five Deciphered Shogser Scrolls',

    // Prompts for Terma Dungeon Vault Room & Floor 3 Chest
    'prompt.dungeonVault.sealed': 'Ancient Terma Reliquary (Defeat Vault Guardians: {remaining} left)',
    'prompt.dungeonVault.extract': 'Open Ancient Terma Reliquary (Extract Vault Terma)',
    'prompt.termaBossChest': 'Open Terma Treasure Chest (Extract Profound Terma)',

    // Toasts
    'toast.termaCave.ambush': 'Entered {name}! Cave guardians awaken — liberate all {count} guardians to unseal the Terma!',
    'toast.termaCave.stillGuarded': 'The Terma reliquary is still sealed by obstacles! Liberate the remaining {remaining} cave guardians first!',
    'toast.termaCave.unsealed': 'All guardians in {name} liberated! The golden seed syllable blazes with rainbow light — interact to extract the Terma!',
    'toast.termaCave.extracted': 'Terma Revealed! Extracted from {name}: {relics}!',
    'toast.termaCave.repeatExtracted': 'Extracted from {name}: Terma Essence ×{essence} & Turquoise +{turquoise}!',
    'toast.shogserTable.incomplete': 'Collected {count}/5 Shogser Scrolls from the chapter Terma caves. Gather all 5 to decipher their secret meaning.',
    'toast.shogserTable.deciphered': 'All Five Shogser Scrolls deciphered! Grand Tertön Empowerment granted: +2 Skill Points, Perm MaxHP +60, ATK/DEF +8, Terma Essence ×3!',
    'toast.shogserTable.alreadyDone': 'The Five Shogser Scrolls glow with auspicious golden light upon the table.',
    'toast.dungeonVault.unsealed': 'Vault Guardians liberated! The Ancient Terma Reliquary is unsealed — interact to extract the Terma item!',
    'toast.dungeonVault.extracted': 'Extracted from Ancient Terma Reliquary: Terma Essence ×{essence} & Turquoise +{turquoise}!',
    'toast.termaBossChest.ready': 'The Terma Guardian is subdued! Approach and interact with the Terma Treasure Chest to extract the sacred relics!',
    'toast.termaBossChest.opened': 'Rainbow light erupts from the Terma Treasure Chest! Extracted Guru Rinpoche Terma relics and essence!',
  },
};

i18n.register(TERMA_CAVES_STRINGS);
export default TERMA_CAVES_STRINGS;
