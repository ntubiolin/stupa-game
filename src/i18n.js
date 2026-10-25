/**
 * i18n — Traditional Chinese (default) + English.
 * API: { lang, t(key, params?), setLang('zh'|'en'), onChange(fn) → unsubscribe }
 *
 * Params are substituted into `{name}` placeholders. A param value may itself be
 * `{ key: 'some.key' }`, which is translated at render time (useful for toasts
 * that must re-localize when the language changes).
 */
const STORAGE_KEY = 'stupa.lang';

const STRINGS = {
  zh: {
    'title.eyebrow': '尼泊爾 ・ 加德滿都',
    'title.name': '博達哈大佛塔',
    'title.sub': '繞塔・禮拜・點燈的朝聖之旅',
    'title.desc': '在喜馬拉雅山谷最大的佛塔下，順時針繞塔、行大禮拜、點亮酥油燈、餵食調皮的獼猴，看經幡在風中飄揚，日光漸漸沉入星夜。',
    'title.begin': '開始朝聖',
    'title.soundHint': '開始後將啟用合成音效 · 建議戴上耳機',
    'title.langLabel': '語言',

    'controls.move': '移動',
    'controls.run': '奔跑',
    'controls.look': '轉動視角',
    'controls.zoom': '縮放',
    'controls.interact': '互動・點燈',
    'controls.feed': '餵猴子',
    'controls.prostrate': '大禮拜',
    'controls.chant': '六字大明咒',
    'controls.hud': '隱藏介面',
    'controls.pause': '暫停時間',
    'keys.drag': '拖曳',
    'keys.wheel': '滾輪',
    'keys.joystick': '左側搖桿',
    'keys.swipe': '右側滑動',

    'hud.merit': '功德',
    'hud.kora': '繞塔',
    'hud.laps': '圈',
    'hud.koraProgress': '本圈進度 {pct}%',
    'hud.prostrations': '大禮拜',
    'hud.lamps': '酥油燈',
    'hud.monkeys': '餵猴',
    'hud.wheels': '轉經輪',
    'hud.hp': '氣血',
    'hud.mp': '真氣',
    'hud.exp': '修為',
    'hud.level': '等級',
    'hud.atk': '攻擊',
    'hud.def': '防禦',
    'hud.time': '時間',
    'hud.timeSlider': '一天中的時間',
    'hud.speedPause': '暫停時間',
    'hud.speed1': '正常速度',
    'hud.speed4': '四倍速度',
    'hud.lang': '切換語言',
    'hud.mute': '靜音',
    'hud.unmute': '開啟聲音',
    'hud.help': '朝聖指南',
    'hud.hide': '隱藏介面 (H)',
    'hud.day': '白晝',
    'hud.night': '夜晚',
    'hud.dawn': '黎明',
    'hud.dusk': '黃昏',

    'help.title': '朝聖指南',
    'help.controls': '操作方式',
    'help.practices': '修持',
    'help.achievements': '成就',
    'help.kora.title': '繞塔 Kora',
    'help.kora.desc': '沿著佛塔順時針行走，讓佛塔始終在你的右手邊。每完成一圈即累積功德。',
    'help.prostration.title': '大禮拜',
    'help.prostration.desc': '雙手合十於頭頂、額頭、喉嚨與心口，象徵身、語、意的清淨，然後全身伏地。',
    'help.lamp.title': '點酥油燈',
    'help.lamp.desc': '燈火象徵驅散無明的智慧之光。走近燈台按 E 點亮一盞。',
    'help.monkey.title': '餵猴子',
    'help.monkey.desc': '佛塔周圍住著獼猴。靠近後按 F 拋出香蕉，布施給牠們。',
    'help.wheel.title': '轉經輪',
    'help.wheel.desc': '塔牆外側排列 108 個轉經輪，貼著塔牆走過即可轉動。',
    'help.mantra.title': '六字大明咒',
    'help.mantra.desc': '誦念「唵嘛呢叭咪吽」在周圍綻放金色蓮花咒輪，消耗真氣（原野中施放可淨化魔障，佛塔中可寧靜收攝）。',
    'help.reset': '重設進度',
    'help.resetConfirm': '確定要清除所有功德與成就嗎？',
    'help.close': '關閉',
    'help.locked': '尚未解鎖',

    'prompt.lightLamp': '點亮酥油燈',
    'prompt.feedMonkey': '餵猴子',
    'prompt.spinWheel': '轉動經輪',
    'prompt.enterWild': '前往原野',
    'prompt.returnStupa': '返回大佛塔',
    'prompt.interact': '互動',

    'mobile.prostrate': '禮拜',
    'mobile.interact': '互動',
    'mobile.feed': '餵食',
    'mobile.chant': '誦咒',

    'toast.welcome': '歡迎來到博達哈。請順時針繞塔，讓佛塔在你的右手邊。',
    'toast.koraLap': '完成第 {n} 圈繞塔',
    'toast.prostration': '第 {n} 次大禮拜',
    'toast.lamp': '點亮了一盞酥油燈',
    'toast.monkey': '小猴子吃得好開心',
    'toast.points': '功德 +{points}',
    'toast.wrongWay': '傳統上繞塔是順時針方向 —— 讓佛塔在你的右手邊。',
    'toast.achievement': '成就解鎖：{name}',
    'toast.allLit': '這座燈台的酥油燈已全部點亮',
    'toast.burnedOut': '酥油燈漸漸燃盡了，可以再次點亮',
    'toast.timePaused': '時間已暫停',
    'toast.timeResumed': '時間繼續流動',
    'toast.hudHidden': '介面已隱藏 · 按 H 顯示',
    'toast.reset': '進度已重設',
    'toast.enterWild': '踏入蒼茫的高原原野',
    'toast.returnStupa': '回到博達哈大佛塔廣場',
    'toast.noProstrateWild': '原野危機四伏，請回佛塔廣場行大禮拜',
    'toast.noMp': '真氣不足，無法誦念六字大明咒',
    'toast.levelUp': '修為提升至等級 {level}',
    'toast.itemPickup': '獲得 {name}：{effect}',

    'item.sungdu': '加持繩',
    'item.sungdu.effect': '防禦力 +15（持續 120 秒）',
    'item.dungkar': '法螺',
    'item.dungkar.effect': '攻擊力 ×1.5（持續 90 秒）',
    'item.gau': '嘎烏護身盒',
    'item.gau.effect': '防禦力永久 +2',
    'item.dorje': '金剛杵',
    'item.dorje.effect': '攻擊力永久 +2',

    'ach.firstKora': '初次繞塔',
    'ach.firstKora.desc': '完成第一圈繞塔',
    'ach.threeKora': '三匝圓滿',
    'ach.threeKora.desc': '完成三圈繞塔',
    'ach.sevenProstrations': '七支供養',
    'ach.sevenProstrations.desc': '完成 7 次大禮拜',
    'ach.prostrations108': '百八禮拜',
    'ach.prostrations108.desc': '完成 108 次大禮拜',
    'ach.firstLamp': '第一盞燈',
    'ach.firstLamp.desc': '點亮第一盞酥油燈',
    'ach.lamps21': '二十一度母之光',
    'ach.lamps21.desc': '點亮 21 盞酥油燈',
    'ach.feed5': '猴群之友',
    'ach.feed5.desc': '餵食猴子 5 次',
    'ach.wheels108': '法輪常轉',
    'ach.wheels108.desc': '轉動 108 次經輪',
    'ach.sunset': '金色黃昏',
    'ach.sunset.desc': '在日落時分朝聖',
    'ach.night': '星空下的佛塔',
    'ach.night.desc': '在夜晚朝聖',
    'ach.allPractices': '圓滿修持',
    'ach.allPractices.desc': '繞塔、禮拜、點燈、餵猴各完成一次',
  },

  en: {
    'title.eyebrow': 'KATHMANDU · NEPAL',
    'title.name': 'Boudhanath Stupa',
    'title.sub': 'A pilgrimage of kora, prostration and light',
    'title.desc': 'Beneath the greatest stupa of the Himalayan valley, walk the kora clockwise, offer full prostrations, light butter lamps and feed the mischievous macaques — as prayer flags dance in the wind and daylight melts into a starry night.',
    'title.begin': 'Begin pilgrimage',
    'title.soundHint': 'Synthesized sound starts when you begin · headphones recommended',
    'title.langLabel': 'Language',

    'controls.move': 'Move',
    'controls.run': 'Run',
    'controls.look': 'Look around',
    'controls.zoom': 'Zoom',
    'controls.interact': 'Interact · light lamp',
    'controls.feed': 'Feed monkey',
    'controls.prostrate': 'Prostrate',
    'controls.chant': 'Six-Syllable Mantra',
    'controls.hud': 'Hide interface',
    'controls.pause': 'Pause time',
    'keys.drag': 'Drag',
    'keys.wheel': 'Wheel',
    'keys.joystick': 'Left stick',
    'keys.swipe': 'Swipe right side',

    'hud.merit': 'Merit',
    'hud.kora': 'Kora',
    'hud.laps': 'laps',
    'hud.koraProgress': 'Lap progress {pct}%',
    'hud.prostrations': 'Prostrations',
    'hud.lamps': 'Butter lamps',
    'hud.monkeys': 'Monkeys fed',
    'hud.wheels': 'Prayer wheels',
    'hud.hp': 'HP',
    'hud.mp': 'MP',
    'hud.exp': 'EXP',
    'hud.level': 'Lv',
    'hud.atk': 'ATK',
    'hud.def': 'DEF',
    'hud.time': 'Time',
    'hud.timeSlider': 'Time of day',
    'hud.speedPause': 'Pause time',
    'hud.speed1': 'Normal speed',
    'hud.speed4': 'Four times speed',
    'hud.lang': 'Switch language',
    'hud.mute': 'Mute',
    'hud.unmute': 'Unmute',
    'hud.help': "Pilgrim's guide",
    'hud.hide': 'Hide interface (H)',
    'hud.day': 'Day',
    'hud.night': 'Night',
    'hud.dawn': 'Dawn',
    'hud.dusk': 'Dusk',

    'help.title': "Pilgrim's guide",
    'help.controls': 'Controls',
    'help.practices': 'Practices',
    'help.achievements': 'Achievements',
    'help.kora.title': 'Kora',
    'help.kora.desc': 'Walk clockwise around the stupa, keeping it on your right shoulder. Each full circle gathers merit.',
    'help.prostration.title': 'Full prostration',
    'help.prostration.desc': 'Join your palms above the head, at the forehead, throat and heart — purifying body, speech and mind — then lie fully on the ground.',
    'help.lamp.title': 'Butter lamps',
    'help.lamp.desc': 'A flame is the light of wisdom dispelling ignorance. Approach a lamp table and press E.',
    'help.monkey.title': 'Feeding monkeys',
    'help.monkey.desc': 'Rhesus macaques live around the stupa. Get close and press F to toss them a banana.',
    'help.wheel.title': 'Prayer wheels',
    'help.wheel.desc': '108 prayer wheels line the outer wall. Brush past them as you walk to set them spinning.',
    'help.mantra.title': 'Six-Syllable Mantra',
    'help.mantra.desc': 'Chant "Om Mani Padme Hum" to unfold an expanding golden mantra mandala, consuming MP (cleanses evils in the wilderness, peaceful halo at the stupa).',
    'help.reset': 'Reset progress',
    'help.resetConfirm': 'Clear all merit and achievements?',
    'help.close': 'Close',
    'help.locked': 'Locked',

    'prompt.lightLamp': 'Light a butter lamp',
    'prompt.feedMonkey': 'Feed the monkey',
    'prompt.spinWheel': 'Spin the prayer wheel',
    'prompt.enterWild': 'Enter the Wilderness',
    'prompt.returnStupa': 'Return to the Great Stupa',
    'prompt.interact': 'Interact',

    'mobile.prostrate': 'Bow',
    'mobile.interact': 'Use',
    'mobile.feed': 'Feed',
    'mobile.chant': 'Chant',

    'toast.welcome': 'Welcome to Boudha. Walk clockwise, keeping the stupa on your right.',
    'toast.koraLap': 'Kora lap {n} complete',
    'toast.prostration': 'Prostration #{n}',
    'toast.lamp': 'A butter lamp now glows',
    'toast.monkey': 'The monkey munches happily',
    'toast.points': 'Merit +{points}',
    'toast.wrongWay': 'Kora is traditionally walked clockwise — keep the stupa on your right.',
    'toast.achievement': 'Achievement unlocked: {name}',
    'toast.allLit': 'Every lamp on this table is lit',
    'toast.burnedOut': 'The butter lamps have burnt down — light them again',
    'toast.timePaused': 'Time paused',
    'toast.timeResumed': 'Time flows again',
    'toast.hudHidden': 'Interface hidden · press H to show',
    'toast.reset': 'Progress reset',
    'toast.enterWild': 'Entered the vast highland wilderness',
    'toast.returnStupa': 'Returned to Boudhanath Stupa plaza',
    'toast.noProstrateWild': 'Too dangerous here — return to the Stupa plaza to prostrate',
    'toast.noMp': 'Not enough MP to chant the Great Six-Syllable Mantra',
    'toast.levelUp': 'Reached Level {level}',
    'toast.itemPickup': 'Obtained {name}: {effect}',

    'item.sungdu': 'Protection Cord',
    'item.sungdu.effect': 'DEF +15 (120s)',
    'item.dungkar': 'Conch Shell',
    'item.dungkar.effect': 'ATK ×1.5 (90s)',
    'item.gau': 'Gau Amulet Box',
    'item.gau.effect': 'Permanent DEF +2',
    'item.dorje': 'Golden Vajra',
    'item.dorje.effect': 'Permanent ATK +2',

    'ach.firstKora': 'First Circle',
    'ach.firstKora.desc': 'Complete your first kora',
    'ach.threeKora': 'Threefold Circle',
    'ach.threeKora.desc': 'Complete three kora laps',
    'ach.sevenProstrations': 'Sevenfold Offering',
    'ach.sevenProstrations.desc': 'Perform 7 prostrations',
    'ach.prostrations108': 'One Hundred Eight',
    'ach.prostrations108.desc': 'Perform 108 prostrations',
    'ach.firstLamp': 'First Light',
    'ach.firstLamp.desc': 'Light your first butter lamp',
    'ach.lamps21': 'Light of the 21 Taras',
    'ach.lamps21.desc': 'Light 21 butter lamps',
    'ach.feed5': 'Friend of Monkeys',
    'ach.feed5.desc': 'Feed monkeys 5 times',
    'ach.wheels108': 'Ever-turning Wheel',
    'ach.wheels108.desc': 'Spin prayer wheels 108 times',
    'ach.sunset': 'Golden Hour',
    'ach.sunset.desc': 'Make your pilgrimage at sunset',
    'ach.night': 'Stupa Under Stars',
    'ach.night.desc': 'Make your pilgrimage at night',
    'ach.allPractices': 'Complete Practice',
    'ach.allPractices.desc': 'Kora, prostrate, light a lamp and feed a monkey',
  },
};

function loadLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'zh' || v === 'en') return v;
  } catch { /* storage unavailable */ }
  return 'zh';
}

const listeners = new Set();
let current = loadLang();

function applyDocumentLang() {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current === 'zh' ? 'zh-Hant' : 'en';
  }
}
applyDocumentLang();

function format(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, name) => {
    let v = params[name];
    if (v === undefined || v === null) return m;
    if (typeof v === 'object' && v.key) v = i18n.t(v.key, v.params);
    return String(v);
  });
}

export const i18n = {
  get lang() { return current; },
  /** Translate `key`; falls back to English, then to the key itself. */
  t(key, params) {
    const s = STRINGS[current][key] ?? STRINGS.en[key] ?? key;
    return format(s, params);
  },
  has(key) { return key in STRINGS[current] || key in STRINGS.en; },
  setLang(lang) {
    if (lang !== 'zh' && lang !== 'en') return;
    if (lang === current) return;
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    applyDocumentLang();
    for (const fn of [...listeners]) fn(lang);
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
