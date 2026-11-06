/**
 * Character Appearance & Front-Camera i18n Strings (`src/i18n/appearance.js`)
 *
 * Registers Traditional Chinese (`zh-Hant` / `zh`) and English (`en`) strings for:
 *   - Title Screen & HUD "塑造法相 / Customize Pilgrim" button
 *   - Character Customization Studio drawer (`#appearance-drawer`)
 *   - Face (Skin tone, Eye style, Eye color, Brow style, Mouth style, Sacred mark)
 *   - Hair (Hairstyle, Hair color)
 *   - Outfit & Accessories (Robe, Shawl, Trim, Hat, Neck Mala, Chest Emblem, Back Gear, Aura)
 *   - Front-Camera shortcut (`V`) pill & toast notifications
 */
import { i18n } from '../i18n.js';

const ZH_HANT = {
  // ---------------------------------------------------------------- Entry Buttons & Controls
  'appearance.btn.titleCustomize': '✨ 塑造法相・自定義角色',
  'appearance.btn.hudTitle': '塑造法相 / 正面視角 (V)',
  'appearance.btn.invCustomize': '✨ 塑造法相與改名',
  'controls.frontCam': '正面視角',

  // ---------------------------------------------------------------- Studio Header & Footer
  'appearance.studio.eyebrow': '☸ 行者法相・捏臉與莊嚴具',
  'appearance.studio.title': '塑造行者法相',
  'appearance.studio.subtitle': '自由調配五官神韻、髮型、僧袍披單與隨身莊嚴法器（滑鼠拖曳角色可 360° 旋轉）',
  'appearance.name.label': '行者法號（姓名）',
  'appearance.name.placeholder': '輸入你的行者法號…',
  'appearance.name.randomBtn': '🎲 隨機法號',
  'appearance.name.showTag': '頭頂顯示法號名牌',

  // ---------------------------------------------------------------- Tabs
  'appearance.tab.face': '🙂 五官與髮型',
  'appearance.tab.outfit': '👘 法衣與配色',
  'appearance.tab.gear': '👑 法帽與莊嚴具',

  // ---------------------------------------------------------------- Camera & Pose Preview Bar
  'appearance.cam.face': '🔍 臉部近景',
  'appearance.cam.body': '🧍 全身檢視',
  'appearance.pose.idle': '站立',
  'appearance.pose.chant': '合十持咒',
  'appearance.pose.prostrate': '大禮拜',
  'appearance.btn.randomAll': '🎲 隨機全身造型',
  'appearance.btn.resetDefault': '↺ 還原初始',
  'appearance.btn.saveBackTitle': '✓ 儲存並返回標題',
  'appearance.btn.saveStartGame': '☸ 確認法相・開始朝聖',
  'appearance.btn.saveClosePlay': '✓ 儲存法相 [Esc]',

  // ---------------------------------------------------------------- Front Camera HUD Pill
  'appearance.frontCam.pill': '📷 正面平視視角（按 V 返回跟隨 · 滾輪拉近）',
  'appearance.frontCam.openStudioBtn': '✨ 塑造法相',
  'toast.frontCamOn': '📷 已切換至角色正面視角（按 V 返回背後跟隨，滾輪可拉近看五官）',
  'toast.frontCamOff': '已返回背後跟隨視角',
  'toast.appearanceSaved': '✨ 行者法相與法號「{name}」已銘刻存檔',

  // ---------------------------------------------------------------- Section Labels
  'appearance.sec.skinTone': '高原膚色',
  'appearance.sec.eyeStyle': '雙眼神韻',
  'appearance.sec.eyeColor': '眼瞳色澤',
  'appearance.sec.browStyle': '眉型',
  'appearance.sec.mouthStyle': '唇型與神態',
  'appearance.sec.markType': '額間印記與面飾',
  'appearance.sec.hairStyle': '修行髮型',
  'appearance.sec.hairColor': '髮色',
  'appearance.sec.robeColor': '下裙與主袍色',
  'appearance.sec.shawlColor': '披單（禪衣）配色',
  'appearance.sec.trimColor': '腰帶與滾邊色',
  'appearance.sec.hatType': '頭飾與法帽（戴帽時可搭配髮型）',
  'appearance.sec.neckType': '頸部念珠與領飾',
  'appearance.sec.chestType': '胸前護身法器',
  'appearance.sec.backType': '背部行囊與披帛',
  'appearance.sec.auraColor': '大禮拜與持咒光環',

  // ---------------------------------------------------------------- Options: Skin Tone
  'appearance.skin.warm': '高原暖膚',
  'appearance.skin.fair': '雪域白皙',
  'appearance.skin.bronze': '古銅日曬',
  'appearance.skin.khampa': '康巴深膚',
  'appearance.skin.sandal': '檀香暖金',
  'appearance.skin.moon': '月光琉璃',

  // ---------------------------------------------------------------- Options: Eye Style
  'appearance.eye.serene': '慈悲垂目',
  'appearance.eye.bright': '清澈杏眼',
  'appearance.eye.resolute': '堅毅明眸',
  'appearance.eye.vajra': '金剛威嚴',
  'appearance.eye.joyful': '溫和笑眼',

  // ---------------------------------------------------------------- Options: Eye Color
  'appearance.eyeColor.obsidian': '墨玉黑',
  'appearance.eyeColor.amber': '琥珀褐',
  'appearance.eyeColor.gold': '琉璃金',
  'appearance.eyeColor.turquoise': '綠松石',
  'appearance.eyeColor.lotus': '蓮華紫',

  // ---------------------------------------------------------------- Options: Brow Style
  'appearance.brow.gentle': '柳葉細眉',
  'appearance.brow.bold': '高原濃眉',
  'appearance.brow.sword': '剛毅劍眉',
  'appearance.brow.soft': '慈和短眉',

  // ---------------------------------------------------------------- Options: Mouth Style
  'appearance.mouth.calm': '溫和微笑',
  'appearance.mouth.peaceful': '禪定平唇',
  'appearance.mouth.chant': '持咒微啟',
  'appearance.mouth.cheerful': '喜悅開朗',

  // ---------------------------------------------------------------- Options: Sacred Marks
  'appearance.mark.none': '無印記',
  'appearance.mark.urna': '眉心白毫（金點）',
  'appearance.mark.sindoor': '朱砂吉祥點',
  'appearance.mark.wisdomEye': '智慧第三眼紋',
  'appearance.mark.blush': '高原風霜腮紅',

  // ---------------------------------------------------------------- Options: Hairstyle
  'appearance.hair.short': '傳統短髮',
  'appearance.hair.shaved': '剃度頂相（光頭）',
  'appearance.hair.khampa': '康巴紅繩盤髮',
  'appearance.hair.ngakpa': '密咒士高髻',
  'appearance.hair.braids': '高原雙長辮',
  'appearance.hair.flowing': '空行披肩長髮',

  // ---------------------------------------------------------------- Options: Hair Color
  'appearance.hairColor.ebony': '烏木黑',
  'appearance.hairColor.chestnut': '深栗褐',
  'appearance.hairColor.snow': '雪山銀白',
  'appearance.hairColor.crimson': '藏紅挑染',
  'appearance.hairColor.ochre': '泥金褐',
  'appearance.hairColor.indigo': '靛青黑',

  // ---------------------------------------------------------------- Options: Robe Color
  'appearance.robe.maroon': '僧院絳紅',
  'appearance.robe.indigo': '密乘靛藍',
  'appearance.robe.ochre': '閉關赭石',
  'appearance.robe.white': '雪山素白（密咒士）',
  'appearance.robe.obsidian': '黑金護法',
  'appearance.robe.pine': '松石深綠',
  'appearance.robe.plum': '貴族紫檀',

  // ---------------------------------------------------------------- Options: Shawl Color
  'appearance.shawl.saffron': '藏紅花黃',
  'appearance.shawl.turquoise': '綠松石青',
  'appearance.shawl.lotus': '蓮華粉紅',
  'appearance.shawl.gold': '皇家明黃',
  'appearance.shawl.snow': '雪域銀白',
  'appearance.shawl.coral': '珊瑚朱紅',

  // ---------------------------------------------------------------- Options: Trim Color
  'appearance.trim.gold': '鎏金鑲邊',
  'appearance.trim.silver': '雪銀鑲邊',
  'appearance.trim.bronze': '古銅鑲邊',
  'appearance.trim.turquoise': '綠松石邊',

  // ---------------------------------------------------------------- Options: Hat Type
  'appearance.hat.none': '無頭飾（露髮型）',
  'appearance.hat.lotus': '蓮師法帽',
  'appearance.hat.pandita': '班智達長耳尖帽',
  'appearance.hat.straw': '朝聖竹斗笠',
  'appearance.hat.headband': '綠松石珊瑚額帶',
  'appearance.hat.tiara': '五佛寶冠',

  // ---------------------------------------------------------------- Options: Neck Type
  'appearance.neck.none': '無頸飾',
  'appearance.neck.bodhi': '108 菩提子念珠',
  'appearance.neck.turquoise': '綠松石珊瑚念珠',
  'appearance.neck.goldCollar': '鎏金護法領環',

  // ---------------------------------------------------------------- Options: Chest Type
  'appearance.chest.none': '無胸飾',
  'appearance.chest.mirror': '鎏金八吉祥護心鏡',
  'appearance.chest.gau': '綠松石噶烏盒',

  // ---------------------------------------------------------------- Options: Back Type
  'appearance.back.none': '無背飾',
  'appearance.back.pack': '朝聖木背架與布卷',
  'appearance.back.scroll': '伏藏經書木篋',
  'appearance.back.scarf': '空行天衣飄帶',

  // ---------------------------------------------------------------- Options: Aura Color
  'appearance.aura.gold': '蓮華金光',
  'appearance.aura.turquoise': '綠松石光',
  'appearance.aura.lapis': '藥師琉璃藍',
  'appearance.aura.emerald': '度母翡翠綠',
  'appearance.aura.rose': '蓮師蓮華紅',
};

const EN = {
  // ---------------------------------------------------------------- Entry Buttons & Controls
  'appearance.btn.titleCustomize': '✨ Customize Pilgrim & Name',
  'appearance.btn.hudTitle': 'Customize Pilgrim / Front Cam (V)',
  'appearance.btn.invCustomize': '✨ Customize Look & Name',
  'controls.frontCam': 'Front View',

  // ---------------------------------------------------------------- Studio Header & Footer
  'appearance.studio.eyebrow': '☸ Pilgrim Visage · Face & Vestments',
  'appearance.studio.title': 'Pilgrim Appearance Studio',
  'appearance.studio.subtitle': 'Customize facial features, hairstyle, monastic robes, and sacred ornaments (drag character to rotate 360°)',
  'appearance.name.label': 'Pilgrim Dharma Name',
  'appearance.name.placeholder': 'Enter your Dharma name…',
  'appearance.name.randomBtn': '🎲 Random Name',
  'appearance.name.showTag': 'Show Nameplate Overhead',

  // ---------------------------------------------------------------- Tabs
  'appearance.tab.face': '🙂 Face & Hair',
  'appearance.tab.outfit': '👘 Robes & Colors',
  'appearance.tab.gear': '👑 Hats & Relics',

  // ---------------------------------------------------------------- Camera & Pose Preview Bar
  'appearance.cam.face': '🔍 Face Close-up',
  'appearance.cam.body': '🧍 Full Body',
  'appearance.pose.idle': 'Stand',
  'appearance.pose.chant': 'Chant',
  'appearance.pose.prostrate': 'Prostrate',
  'appearance.btn.randomAll': '🎲 Randomize All',
  'appearance.btn.resetDefault': '↺ Reset',
  'appearance.btn.saveBackTitle': '✓ Save & Back to Title',
  'appearance.btn.saveStartGame': '☸ Confirm & Begin Pilgrimage',
  'appearance.btn.saveClosePlay': '✓ Save Appearance [Esc]',

  // ---------------------------------------------------------------- Front Camera HUD Pill
  'appearance.frontCam.pill': '📷 Front Portrait View (Press V to return · Scroll to zoom)',
  'appearance.frontCam.openStudioBtn': '✨ Customize Look',
  'toast.frontCamOn': '📷 Front Camera View enabled (Press V to return to follow camera, scroll to zoom)',
  'toast.frontCamOff': 'Returned to third-person follow camera',
  'toast.appearanceSaved': '✨ Pilgrim appearance & Dharma name "{name}" saved',

  // ---------------------------------------------------------------- Section Labels
  'appearance.sec.skinTone': 'Skin Tone',
  'appearance.sec.eyeStyle': 'Eye Expression',
  'appearance.sec.eyeColor': 'Iris Color',
  'appearance.sec.browStyle': 'Eyebrows',
  'appearance.sec.mouthStyle': 'Mouth Expression',
  'appearance.sec.markType': 'Forehead & Sacred Marks',
  'appearance.sec.hairStyle': 'Hairstyle',
  'appearance.sec.hairColor': 'Hair Color',
  'appearance.sec.robeColor': 'Main Robe Color',
  'appearance.sec.shawlColor': 'Shawl (Zen) Color',
  'appearance.sec.trimColor': 'Sash & Hem Trim',
  'appearance.sec.hatType': 'Headwear & Crowns',
  'appearance.sec.neckType': 'Neck Mala & Collar',
  'appearance.sec.chestType': 'Chest Amulet',
  'appearance.sec.backType': 'Back Pack & Celestial Scarf',
  'appearance.sec.auraColor': 'Prostration & Mantra Aura',

  // ---------------------------------------------------------------- Options: Skin Tone
  'appearance.skin.warm': 'Highland Warm',
  'appearance.skin.fair': 'Snowland Fair',
  'appearance.skin.bronze': 'Sun-Kissed Bronze',
  'appearance.skin.khampa': 'Khampa Deep',
  'appearance.skin.sandal': 'Sandalwood Gold',
  'appearance.skin.moon': 'Moonlit Glaze',

  // ---------------------------------------------------------------- Options: Eye Style
  'appearance.eye.serene': 'Serene Meditation',
  'appearance.eye.bright': 'Clear Almond',
  'appearance.eye.resolute': 'Resolute Gaze',
  'appearance.eye.vajra': 'Vajra Fierce',
  'appearance.eye.joyful': 'Gentle Smile',

  // ---------------------------------------------------------------- Options: Eye Color
  'appearance.eyeColor.obsidian': 'Obsidian Black',
  'appearance.eyeColor.amber': 'Amber Brown',
  'appearance.eyeColor.gold': 'Luminous Gold',
  'appearance.eyeColor.turquoise': 'Turquoise',
  'appearance.eyeColor.lotus': 'Lotus Violet',

  // ---------------------------------------------------------------- Options: Brow Style
  'appearance.brow.gentle': 'Willow Arch',
  'appearance.brow.bold': 'Highland Bold',
  'appearance.brow.sword': 'Sword Brow',
  'appearance.brow.soft': 'Soft Short',

  // ---------------------------------------------------------------- Options: Mouth Style
  'appearance.mouth.calm': 'Gentle Smile',
  'appearance.mouth.peaceful': 'Serene Calm',
  'appearance.mouth.chant': 'Chanting Parted',
  'appearance.mouth.cheerful': 'Joyful Grin',

  // ---------------------------------------------------------------- Options: Sacred Marks
  'appearance.mark.none': 'None',
  'appearance.mark.urna': 'Golden Urna Dot',
  'appearance.mark.sindoor': 'Vermilion Tikka',
  'appearance.mark.wisdomEye': 'Third Wisdom Eye',
  'appearance.mark.blush': 'Highland Rosy Cheeks',

  // ---------------------------------------------------------------- Options: Hairstyle
  'appearance.hair.short': 'Monastic Crop',
  'appearance.hair.shaved': 'Ordained Shaved',
  'appearance.hair.khampa': 'Khampa Red-Cord Crown',
  'appearance.hair.ngakpa': 'Ngakpa Yogi Topknot',
  'appearance.hair.braids': 'Highland Twin Braids',
  'appearance.hair.flowing': 'Dakini Flowing Locks',

  // ---------------------------------------------------------------- Options: Hair Color
  'appearance.hairColor.ebony': 'Ebony Black',
  'appearance.hairColor.chestnut': 'Deep Chestnut',
  'appearance.hairColor.snow': 'Snow Peak Silver',
  'appearance.hairColor.crimson': 'Saffron Crimson',
  'appearance.hairColor.ochre': 'Golden Ochre',
  'appearance.hairColor.indigo': 'Midnight Indigo',

  // ---------------------------------------------------------------- Options: Robe Color
  'appearance.robe.maroon': 'Monastic Maroon',
  'appearance.robe.indigo': 'Tantric Indigo',
  'appearance.robe.ochre': 'Retreat Ochre',
  'appearance.robe.white': 'Ngakpa Snow White',
  'appearance.robe.obsidian': 'Obsidian Protector',
  'appearance.robe.pine': 'Highland Pine',
  'appearance.robe.plum': 'Royal Rosewood',

  // ---------------------------------------------------------------- Options: Shawl Color
  'appearance.shawl.saffron': 'Saffron Gold',
  'appearance.shawl.turquoise': 'Turquoise Cyan',
  'appearance.shawl.lotus': 'Lotus Pink',
  'appearance.shawl.gold': 'Imperial Yellow',
  'appearance.shawl.snow': 'Silver White',
  'appearance.shawl.coral': 'Coral Vermilion',

  // ---------------------------------------------------------------- Options: Trim Color
  'appearance.trim.gold': 'Gilded Gold',
  'appearance.trim.silver': 'Snow Silver',
  'appearance.trim.bronze': 'Aged Bronze',
  'appearance.trim.turquoise': 'Turquoise Inlay',

  // ---------------------------------------------------------------- Options: Hat Type
  'appearance.hat.none': 'No Hat (Show Hair)',
  'appearance.hat.lotus': 'Padma Lotus Crown',
  'appearance.hat.pandita': 'Pandita Scholar Hat',
  'appearance.hat.straw': 'Pilgrim Bamboo Hat',
  'appearance.hat.headband': 'Turquoise Coral Band',
  'appearance.hat.tiara': 'Five-Buddha Tiara',

  // ---------------------------------------------------------------- Options: Neck Type
  'appearance.neck.none': 'None',
  'appearance.neck.bodhi': '108 Bodhi Seed Mala',
  'appearance.neck.turquoise': 'Turquoise & Coral Mala',
  'appearance.neck.goldCollar': 'Gilded Noble Torc',

  // ---------------------------------------------------------------- Options: Chest Type
  'appearance.chest.none': 'None',
  'appearance.chest.mirror': 'Golden Dharma Mirror (Melong)',
  'appearance.chest.gau': 'Turquoise Reliquary Box (Gau)',

  // ---------------------------------------------------------------- Options: Back Type
  'appearance.back.none': 'None',
  'appearance.back.pack': 'Pilgrim Wooden Pack',
  'appearance.back.scroll': 'Terma Scripture Chest',
  'appearance.back.scarf': 'Celestial Silk Scarf',

  // ---------------------------------------------------------------- Options: Aura Color
  'appearance.aura.gold': 'Lotus Gold',
  'appearance.aura.turquoise': 'Turquoise Glow',
  'appearance.aura.lapis': 'Medicine Lapis Blue',
  'appearance.aura.emerald': 'Tara Emerald Green',
  'appearance.aura.rose': 'Padma Rose Red',
};

i18n.register({
  'zh-Hant': ZH_HANT,
  zh: ZH_HANT,
  en: EN,
});

export { ZH_HANT, EN };
