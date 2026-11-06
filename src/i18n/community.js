import { i18n } from '../i18n.js';

export const COMMUNITY_STRINGS = {
  'zh-Hant': {
    // Utility & Prompts
    'hud.lampWall': '十方酥油燈海 (L)',
    'prompt.lightAndDedicate': '點燈祈福・共感燈海',
    'prompt.viewLampWall': '查看十方祈願燈海',

    // Modal Header & Tabs
    'lamp.modal.kicker': '博達哈大佛塔 ・ 朝聖共感燈海',
    'lamp.modal.title': '酥油燈祈福與十方回向',
    'lamp.modal.subtitle': '一燈能除千年闇，一智能滅萬年愚。點亮酥油燈，與十方行者共聚光明。',
    'lamp.tab.offer': '🪔 點燈祈願',
    'lamp.tab.wall': '✨ 十方燈海',
    'lamp.tab.share': '📜 祈願分享碼',
    'lamp.modal.closeHint': '按 L 或 Esc 關閉視窗 · 點燈與隨喜可獲功德與真氣加成',

    // Pilgrim Name & Station Info
    'lamp.form.pilgrimLabel': '行者法號／署名',
    'lamp.form.pilgrimPlaceholder': '朝聖行者',
    'lamp.form.defaultPilgrim': '朝聖行者',
    'lamp.form.stationLabel': '供燈方位',
    'lamp.station.all': '全部燈台',
    'lamp.station.0': '第一燈台（東北・智慧門）',
    'lamp.station.1': '第二燈台（西南・慈悲門）',
    'lamp.station.2': '第三燈台（西北・伏藏門）',

    // Prayer Category Tags (both short `tag.*` and namespaced `lamp.tag.*`)
    'lamp.form.tagLabel': '祈願類別',
    'lamp.tag.all': '全部祈願',
    'tag.peace': '平安順遂',
    'tag.wisdom': '智慧增長',
    'tag.obstacle': '障難消除',
    'tag.beings': '四生六道',
    'tag.bodhicitta': '菩提心堅固',
    'lamp.tag.peace': '平安順遂',
    'lamp.tag.wisdom': '智慧增長',
    'lamp.tag.obstacle': '障難消除',
    'lamp.tag.beings': '四生六道',
    'lamp.tag.bodhicitta': '菩提心堅固',

    // Preset Dedication Templates
    'lamp.form.presetLabel': '傳統回向偈頌（點擊帶入）',
    'lamp.preset.1.label': '《供燈發願文》阿底峽尊者',
    'lamp.preset.1.text': '願燈碗化為三千大千世界，願燈芯化為須彌山王，願酥油化為無邊大海，以此光明照徹法界一切有情。',
    'lamp.preset.2.label': '《普賢行願品》回向偈',
    'lamp.preset.2.text': '文殊師利勇猛智，普賢慧行亦復然，我今迴向諸善根，隨彼一切常修學。',
    'lamp.preset.3.label': '《入菩薩行論》寂天菩薩',
    'lamp.preset.3.text': '乃至有虛空，以及眾生住，願吾住世間，盡除眾生苦。',
    'lamp.preset.4.label': '《蓮師心咒祈請》雪域吉祥',
    'lamp.preset.4.text': '願一切刀兵疾疫悉皆平息，風調雨順，身心安泰，蓮師加持晝夜恆吉祥。',
    'lamp.preset.5.label': '《慈悲回向》闔家安康',
    'lamp.preset.5.text': '願以此燈光明，回向累世父母冤親，離苦得樂，福慧雙增，所求善願悉皆圓滿。',

    // Custom Message & Submit
    'lamp.form.messageLabel': '祈願與回向祝禱（最多 120 字）',
    'lamp.form.messagePlaceholder': '寫下你心中的祈願，或點擊上方傳統偈頌…',
    'lamp.form.submitBtn': '🪔 供燈祈願・銘刻回向',
    'lamp.form.rewardHint': '供燈可得：功德 +18 · 真氣 +15 · 點亮大佛塔燈台並同步至十方燈海',

    // Pilgrim Lamp Wall
    'lamp.wall.stats': '目前燈海共 {total} 盞祈願明燈 · 累計隨喜 {rejoices} 次',
    'lamp.wall.filterStation': '燈台篩選',
    'lamp.wall.filterTag': '祈願類別',
    'lamp.wall.empty': '此篩選下尚無祈願酥油燈，成為第一位點燈的行者吧！',
    'lamp.wall.rejoiceBtn': '🙏 隨喜添油 (+120s)',
    'lamp.wall.rejoicedBtn': '✨ 已隨喜共鳴 ({count})',
    'lamp.wall.rejoiceCount': '隨喜 {count}',
    'lamp.wall.burnTime': '長明餘時 {time}',
    'lamp.wall.ownBadge': '我的祈願',
    'lamp.wall.plaquePrefix': '🪔 [{tag}] {name}：「{msg}」',

    // Share Code Tab
    'lamp.share.title': '跨時空祈願分享碼（離線／靜態部署共感）',
    'lamp.share.desc': '即使在不同網路或靜態網頁環境，也能複製你的「祈願分享碼」傳給朋友，將彼此的酥油燈與祈願塔銘匯入同一個佛塔世界。',
    'lamp.share.exportLabel': '我的祈願分享碼',
    'lamp.share.copyBtn': '📋 複製分享碼',
    'lamp.share.importLabel': '匯入行者分享碼',
    'lamp.share.importPlaceholder': '貼上 STUPA-V1:... 開頭的祈願分享碼',
    'lamp.share.importBtn': '✨ 匯入祈願共鳴',

    // Toasts
    'toast.lampOffered': '🪔 已供奉祈願酥油燈，願光明遍照十方',
    'toast.lampRejoiced': '🙏 隨喜添油圓滿！燈火延續 +120 秒（功德 +18 · 真氣 +10）',
    'toast.stupaRejoiced': '🙏 隨喜禮讚功德塔！（功德 +27）',
    'toast.shareCodeCopied': '📋 已複製祈願分享碼，可傳送給同行善友',
    'toast.shareCodeImported': '✨ 成功匯入同行者的祈願酥油燈與功德塔！',
    'toast.shareCodeInvalid': '分享碼格式有誤，請確認以 STUPA-V1: 開頭',
  },

  en: {
    // Utility & Prompts
    'hud.lampWall': 'Pilgrim Lamp Wall (L)',
    'prompt.lightAndDedicate': 'Light Lamp & Dedicate Prayer',
    'prompt.viewLampWall': 'View Pilgrim Lamp Wall',

    // Modal Header & Tabs
    'lamp.modal.kicker': 'BOUDHANATH STUPA · PILGRIM COMMUNION OF LIGHT',
    'lamp.modal.title': 'Butter Lamp Offering & Dedication',
    'lamp.modal.subtitle': 'One lamp dispels a thousand years of darkness; one spark of wisdom ends ten thousand ages of ignorance.',
    'lamp.tab.offer': '🪔 Offer a Lamp',
    'lamp.tab.wall': '✨ Pilgrim Lamp Wall',
    'lamp.tab.share': '📜 Share Code',
    'lamp.modal.closeHint': 'Press L or Esc to close · Offering & rejoicing grant Merit and MP',

    // Pilgrim Name & Station Info
    'lamp.form.pilgrimLabel': 'Pilgrim Name / Dharma Title',
    'lamp.form.pilgrimPlaceholder': 'Pilgrim',
    'lamp.form.defaultPilgrim': 'Pilgrim',
    'lamp.form.stationLabel': 'Offering Shrine',
    'lamp.station.all': 'All Shrines',
    'lamp.station.0': 'Shrine I (Northeast · Gate of Wisdom)',
    'lamp.station.1': 'Shrine II (Southwest · Gate of Compassion)',
    'lamp.station.2': 'Shrine III (Northwest · Gate of Terma)',

    // Prayer Category Tags (both short `tag.*` and namespaced `lamp.tag.*`)
    'lamp.form.tagLabel': 'Prayer Intention',
    'lamp.tag.all': 'All Intentions',
    'tag.peace': 'Peace & Harmony',
    'tag.wisdom': 'Wisdom & Clarity',
    'tag.obstacle': 'Clear Obstacles',
    'tag.beings': 'All Sentient Beings',
    'tag.bodhicitta': 'Steadfast Bodhicitta',
    'lamp.tag.peace': 'Peace & Harmony',
    'lamp.tag.wisdom': 'Wisdom & Clarity',
    'lamp.tag.obstacle': 'Clear Obstacles',
    'lamp.tag.beings': 'All Sentient Beings',
    'lamp.tag.bodhicitta': 'Steadfast Bodhicitta',

    // Preset Dedication Templates
    'lamp.form.presetLabel': 'Classical Dedication Verses (Click to insert)',
    'lamp.preset.1.label': 'Lamp Aspiration Prayer · Atiśa',
    'lamp.preset.1.text': 'May the bowl become the vast three-thousandfold universe, the wick Mount Meru, and the ghee an boundless ocean — illuminating all beings throughout space.',
    'lamp.preset.2.label': 'Samantabhadra King of Prayers',
    'lamp.preset.2.text': 'Just as fearless Mañjuśrī and Samantabhadra know how to dedicate, so too do I dedicate all these roots of virtue to train in their footsteps.',
    'lamp.preset.3.label': 'Way of the Bodhisattva · Śāntideva',
    'lamp.preset.3.text': 'For as long as space endures and for as long as living beings remain, until then may I too abide to dispel the misery of the world.',
    'lamp.preset.4.label': 'Guru Rinpoche Blessing of Auspiciousness',
    'lamp.preset.4.text': 'May conflict and illness be pacified across the lands; may harmony, peace, and Padmasambhava’s blessing shine day and night.',
    'lamp.preset.5.label': 'Dedication of Loving-Kindness',
    'lamp.preset.5.text': 'By the radiance of this butter lamp, may parents and beings of all lifetimes be free from suffering and swiftly awaken to wisdom and joy.',

    // Custom Message & Submit
    'lamp.form.messageLabel': 'Your Dedication Prayer (up to 120 chars)',
    'lamp.form.messagePlaceholder': 'Write your heartfelt aspiration or select a traditional verse above…',
    'lamp.form.submitBtn': '🪔 Offer Lamp & Inscribe Dedication',
    'lamp.form.rewardHint': 'Offering grants: Merit +18 · MP +15 · Lights a shrine lamp & syncs to the Pilgrim Wall',

    // Pilgrim Lamp Wall
    'lamp.wall.stats': '{total} Pilgrim Lamps glowing · {rejoices} Total Rejoices',
    'lamp.wall.filterStation': 'Filter by Shrine',
    'lamp.wall.filterTag': 'Filter by Intention',
    'lamp.wall.empty': 'No butter lamps match this filter yet — be the first pilgrim to offer light!',
    'lamp.wall.rejoiceBtn': '🙏 Rejoice & Add Ghee (+120s)',
    'lamp.wall.rejoicedBtn': '✨ Rejoiced ({count})',
    'lamp.wall.rejoiceCount': 'Rejoiced {count}',
    'lamp.wall.burnTime': 'Burns {time}',
    'lamp.wall.ownBadge': 'Yours',
    'lamp.wall.plaquePrefix': '🪔 [{tag}] {name}: “{msg}”',

    // Share Code Tab
    'lamp.share.title': 'Pilgrim Prayer Share Code (Offline / Static Sync)',
    'lamp.share.desc': 'Copy your Prayer Share Code to exchange your butter-lamp dedications and votive stupas with fellow pilgrims anywhere.',
    'lamp.share.exportLabel': 'Your Prayer Share Code',
    'lamp.share.copyBtn': '📋 Copy Share Code',
    'lamp.share.importLabel': 'Import Fellow Pilgrim Code',
    'lamp.share.importPlaceholder': 'Paste a code starting with STUPA-V1:...',
    'lamp.share.importBtn': '✨ Import & Resonate',

    // Toasts
    'toast.lampOffered': '🪔 Butter lamp offered! May its radiance illuminate all directions.',
    'toast.lampRejoiced': '🙏 Rejoiced & added ghee! Flame extended +120s (Merit +18 · MP +10)',
    'toast.stupaRejoiced': '🙏 Rejoiced at the Votive Stupa! (Merit +27)',
    'toast.shareCodeCopied': '📋 Prayer Share Code copied to clipboard',
    'toast.shareCodeImported': '✨ Fellow pilgrim’s lamp & votive stupa imported!',
    'toast.shareCodeInvalid': 'Invalid share code — please check that it starts with STUPA-V1:',
  },
};

i18n.register(COMMUNITY_STRINGS);
