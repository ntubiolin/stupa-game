/**
 * Bilingual strings for Elite Monsters (Champion & Rare), Elite Affixes,
 * Amrita Potions (甘露丸), and Shrines (神龕).
 */
import { i18n } from '../i18n.js';

export const ELITE_NAME_COUNT = 16;

export const ELITE_STRINGS = {
  'zh-Hant': {
    // Short enemy kind names for elite nameplates
    'enemyShort.preta': '餓鬼',
    'enemyShort.tsen': '贊',
    'enemyShort.migoi': '雪人',

    // Elite Affixes (7)
    'eliteAffix.swift': '迅捷',
    'eliteAffix.armored': '堅甲',
    'eliteAffix.frozen': '冰縛',
    'eliteAffix.molten': '業火',
    'eliteAffix.vengeful': '怨念',
    'eliteAffix.shielding': '結界',
    'eliteAffix.teleporter': '遁形',

    // Champion nameplate template
    'elite.championName': '{affix}的{kind}',
    'elite.rareName': '{a}{b}・{kind}',

    // Rare monster name pool A (16 words)
    'eliteName.a.0': '黑風',
    'eliteName.a.1': '血煞',
    'eliteName.a.2': '寒淵',
    'eliteName.a.3': '噬魂',
    'eliteName.a.4': '赤焰',
    'eliteName.a.5': '鐵骨',
    'eliteName.a.6': '幽冥',
    'eliteName.a.7': '狂雷',
    'eliteName.a.8': '斷崖',
    'eliteName.a.9': '劫火',
    'eliteName.a.10': '霜牙',
    'eliteName.a.11': '穢跡',
    'eliteName.a.12': '夜叉',
    'eliteName.a.13': '荒原',
    'eliteName.a.14': '碎石',
    'eliteName.a.15': '逆風',

    // Rare monster name pool B (16 words)
    'eliteName.b.0': '羅剎',
    'eliteName.b.1': '怨靈',
    'eliteName.b.2': '魔君',
    'eliteName.b.3': '狂徒',
    'eliteName.b.4': '行者',
    'eliteName.b.5': '凶神',
    'eliteName.b.6': '夜行',
    'eliteName.b.7': '咆哮',
    'eliteName.b.8': '摧山',
    'eliteName.b.9': '蝕骨',
    'eliteName.b.10': '裂地',
    'eliteName.b.11': '巡狩',
    'eliteName.b.12': '統領',
    'eliteName.b.13': '悍將',
    'eliteName.b.14': '殘影',
    'eliteName.b.15': '霸主',

    // Potions (甘露丸)
    'hud.potion': '甘露丸',
    'mobile.potion': '甘露',
    'controls.potion': '服用甘露丸',
    'toast.potionFull': '氣血已滿，無需服用甘露丸',
    'toast.potionEmpty': '甘露丸已耗盡（回佛塔或超度魔障補充）',
    'toast.potionPickup': '拾取甘露丸 +1',
    'toast.potionRefill': '甘露丸已補滿',

    // Shrines (神龕)
    'prompt.shrine': '祈請{name}',
    'toast.shrineActivate': '祈請{name}：{effect}',
    'shrine.diligence': '精進神龕',
    'shrine.diligence.effect': '冷卻縮減 +25%（持續 20 秒）',
    'shrine.vajra': '金剛神龕',
    'shrine.vajra.effect': '金剛護體・免除傷害（持續 8 秒）',
    'shrine.wisdom': '智慧神龕',
    'shrine.wisdom.effect': '修為經驗 ×1.5（持續 60 秒）',
    'shrine.amrita': '甘露神龕',
    'shrine.amrita.effect': '誦咒與技能 0 真氣消耗（持續 10 秒）',
    'shrine.fortune': '福德神龕',
    'shrine.fortune.effect': '綠松石與掉寶率 ×2（持續 60 秒）',

    // Buff chip names (vitals / hud)
    'item.shrine_diligence': '精進神龕',
    'item.shrine_vajra': '金剛神龕',
    'item.shrine_wisdom': '智慧神龕',
    'item.shrine_amrita': '甘露神龕',
    'item.shrine_fortune': '福德神龕',
  },
  en: {
    // Short enemy kind names for elite nameplates
    'enemyShort.preta': 'Preta',
    'enemyShort.tsen': 'Tsen',
    'enemyShort.migoi': 'Migoi',

    // Elite Affixes (7)
    'eliteAffix.swift': 'Swift',
    'eliteAffix.armored': 'Armored',
    'eliteAffix.frozen': 'Frozen',
    'eliteAffix.molten': 'Molten',
    'eliteAffix.vengeful': 'Vengeful',
    'eliteAffix.shielding': 'Shielding',
    'eliteAffix.teleporter': 'Teleporter',

    // Champion nameplate template
    'elite.championName': '{affix} {kind}',
    'elite.rareName': '{a} {b} {kind}',

    // Rare monster name pool A (16 words)
    'eliteName.a.0': 'Blackwind',
    'eliteName.a.1': 'Bloodwrath',
    'eliteName.a.2': 'Frostdeep',
    'eliteName.a.3': 'Souleater',
    'eliteName.a.4': 'Crimson',
    'eliteName.a.5': 'Ironbone',
    'eliteName.a.6': 'Nether',
    'eliteName.a.7': 'Storm',
    'eliteName.a.8': 'Crag',
    'eliteName.a.9': 'Hellfire',
    'eliteName.a.10': 'Rimefang',
    'eliteName.a.11': 'Blight',
    'eliteName.a.12': 'Yaksha',
    'eliteName.a.13': 'Wasteland',
    'eliteName.a.14': 'Stonebreaker',
    'eliteName.a.15': 'Gale',

    // Rare monster name pool B (16 words)
    'eliteName.b.0': 'Rakshasa',
    'eliteName.b.1': 'Wraith',
    'eliteName.b.2': 'Overlord',
    'eliteName.b.3': 'Berserker',
    'eliteName.b.4': 'Stalker',
    'eliteName.b.5': 'Fiend',
    'eliteName.b.6': 'Nightwalker',
    'eliteName.b.7': 'Howler',
    'eliteName.b.8': 'Crusher',
    'eliteName.b.9': 'Gnawer',
    'eliteName.b.10': 'Earthshaker',
    'eliteName.b.11': 'Prowler',
    'eliteName.b.12': 'Chieftain',
    'eliteName.b.13': 'Warlord',
    'eliteName.b.14': 'Phantom',
    'eliteName.b.15': 'Tyrant',

    // Potions (甘露丸)
    'hud.potion': 'Amrita Pill',
    'mobile.potion': 'Amrita',
    'controls.potion': 'Use Amrita Pill',
    'toast.potionFull': 'HP is already full',
    'toast.potionEmpty': 'No Amrita Pills left (refill at Stupa or from monsters)',
    'toast.potionPickup': 'Amrita Pill +1',
    'toast.potionRefill': 'Amrita Pills refilled',

    // Shrines (神龕)
    'prompt.shrine': 'Pray at {name}',
    'toast.shrineActivate': '{name}: {effect}',
    'shrine.diligence': 'Shrine of Diligence',
    'shrine.diligence.effect': 'Cooldown Reduction +25% (20s)',
    'shrine.vajra': 'Vajra Shrine',
    'shrine.vajra.effect': 'Invulnerable to damage (8s)',
    'shrine.wisdom': 'Shrine of Wisdom',
    'shrine.wisdom.effect': 'EXP Gain ×1.5 (60s)',
    'shrine.amrita': 'Amrita Shrine',
    'shrine.amrita.effect': '0 MP cost for Mantra & Skills (10s)',
    'shrine.fortune': 'Shrine of Fortune',
    'shrine.fortune.effect': 'Turquoise & Item Find ×2 (60s)',

    // Buff chip names (vitals / hud)
    'item.shrine_diligence': 'Shrine of Diligence',
    'item.shrine_vajra': 'Vajra Shrine',
    'item.shrine_wisdom': 'Shrine of Wisdom',
    'item.shrine_amrita': 'Amrita Shrine',
    'item.shrine_fortune': 'Shrine of Fortune',
  },
};

i18n.register(ELITE_STRINGS);
