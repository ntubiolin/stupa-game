// ============================================================================
// Chapter 3 — Yarlung Valley · Yarlha Shampo i18n (`src/i18n/ch3.js`)
// ============================================================================
import { i18n } from '../i18n.js';

export const CH3_I18N = {
  zh: {
    // Map & Pure Vision Intro Card
    'map.yarlung': '雅隆河谷・雅拉香波',
    'toast.enterYarlung': '踏入吐蕃發源地雅隆河谷 —— 青稞翻浪，北望雅拉香波雪山',
    'ch3.intro.title': '第三章：雅隆河谷・雅拉香波',
    'ch3.intro.location': '吐蕃・雅隆河谷（Yarlung Valley · Mount Yarlha Shampo）',
    'ch3.intro.era': '約公元八世紀',
    'ch3.intro.narration':
      '雅隆河水自雪山奔流而下，兩岸青稞如碧金波浪，山脊上的雍布拉康見證著吐蕃王室的起源。\n然而北方主峰雅拉香波山神震怒，化現山岳般的狂暴白犛牛，口吐暴雪冰雹席捲牧場。\n蓮花生大士於雪線草甸結金剛鉤印，待汝平息失控犛牛群、共赴香波雪山調伏山神。',
    'ch3.intro.hint': '按任意鍵或點擊繼續',

    // Chapter Completion Banner
    'ch3.banner.complete.kicker': '第三章 完成',
    'ch3.banner.complete.title': '「第三章 完成：白犛牛立誓護法」',
    'ch3.banner.complete.sub': '已解鎖新技能「蓮華護盾」、護法「白犛牛」與第四章傳送點「桑耶寺」',

    // Interactive Prompts & Toasts
    'prompt.rotateCrystalPillar': '按 [E] 旋轉協扎水晶柱（45°）',
    'toast.sheldrak.pillarRotated': '水晶柱轉動 45° —— 日光折射軌跡隨之改變（已對齊 {hits}/4）',
    'toast.sheldrak.solved': '四座水晶柱共鳴齊明！光束貫穿岩洞，開啟了古老的伏藏匣！',
    'toast.yakCalmed': '狂暴野犛牛眼中的白光消退，溫順地低頭啃食青草。',
    'toast.nyenAwaken': '覆滿青苔的巨石驟然震動 —— 山林「年」神從偽裝中甦醒！',
    'toast.boss.hookCast': '蓮花生大士淨相於壇城邊緣顯現，拋出「金剛鉤索」縛住白犛牛！快擊碎四周 4 顆冰雹核心！',
    'toast.boss.hailCoreBroken': '擊碎了一顆冰雹核心！（剩餘：{n}/4）',
    'toast.boss.allHailCoresBroken': '四顆冰雹核心盡數崩裂！金剛鉤索猛然收緊，重創雅拉香波白犛牛！',

    // Enemies
    'enemy.nyen': '年（山林岩木神）',
    'enemy.wildYak': '狂暴野犛牛',
    'enemy.hailCore': '冰雹核心',

    // Boss: Yarlha Shampo White Yak
    'boss.yarlhaShampo.name': '雅拉香波白犛牛',
    'boss.yarlhaShampo.title': '雅隆雪山之主・白衣童子',
    'dlg.boss.yarlhaShampo.oath.1':
      '「哞——！金剛鉤索鎖我鼻角，蓮華大印鎮我風雪，連我引以為傲的千年冰雹亦化為微塵……」',
    'dlg.boss.yarlhaShampo.oath.2':
      '（如山岳般的白犛牛雙膝跪入雪地，周身寒霧散去，化現為一名身披潔白藏袍、雙鬢垂著白辮的俊秀白衣童子，合掌頂禮。）',
    'dlg.boss.yarlhaShampo.oath.3':
      '「烏仗那大士與具慧行者啊！吾乃[[codex:yarlhaShampo|雅拉香波]]山神，往昔受慢心障蔽而興暴雪。今蒙慈悲威光調伏，願獻出生命心咒，立下不壞金剛誓言！」',
    'dlg.boss.yarlhaShampo.oath.4':
      '「自今爾後，吾當護持雅隆河谷風調雨順、五穀豐登，並化現『白犛牛』護法隨侍行者左右，為正法衝鋒陷陣！」',
    'dlg.boss.yarlhaShampo.oath.accept': '「善哉白衣童子，願汝謹守誓言，護持雪域蒼生與正法。」',

    // Quest Items
    'quest.item.termaScrollShard': '協扎伏藏經卷殘片',

    // NPCs
    'npc.palaceKeeper': '雍布拉康守殿老僧',
    'npc.herder': '雅隆牧人達瓦',
    'npc.yarlungVillager1': '雅隆農婦央金',
    'npc.yarlungVillager2': '水磨坊匠人諾布',
    'npc.guruVision.yarlung': '蓮花生大士（淨相）',

    // Quests
    'quest.chapter.3': '第三章：雅隆河谷・雅拉香波',
    'quest.chapter.ch3': '第三章：雅隆河谷・雅拉香波',

    'quest.ch3.valley.title': '雍布拉康',
    'quest.ch3.valley.desc':
      '踏入吐蕃文明的搖籃雅隆河谷。沿西側山脊步道登上古老的宮殿雍布拉康，向守殿老僧請教雅隆王朝與山神的淵源。',
    'quest.ch3.valley.step.reach_palace': '登上西側山脊的雍布拉康宮殿',
    'quest.ch3.valley.step.talk_keeper': '與雍布拉康守殿老僧交談，了解雅隆河谷與山神傳說',

    'quest.ch3.sheldrak.title': '水晶崖的伏藏（支線）',
    'quest.ch3.sheldrak.desc':
      '守殿老僧提及東側山崖的協扎水晶洞中藏有蓮師封存的伏藏。前往協扎水晶洞，轉動洞中四座水晶柱使日光折射聚焦於伏藏匣，取出伏藏經卷殘片。',
    'quest.ch3.sheldrak.step.reach_cave': '前往東側山崖的協扎水晶洞',
    'quest.ch3.sheldrak.step.collect_shard': '解開四柱日光折射機關，自伏藏匣取得「協扎伏藏經卷殘片」',

    'quest.ch3.yaks.title': '犛牛群暴走',
    'quest.ch3.yaks.desc':
      '雅拉香波雪山的暴風雪令河谷中的野犛牛狂暴失控。以咒力使 15 頭狂暴野犛牛平靜下來（牠們是受驚的生靈，平靜後會低頭吃草而非化虹光消散），再向雅隆村牧人了解山神異變。',
    'quest.ch3.yaks.step.calm_yaks': '安撫並平息河谷中狂暴失控的野犛牛（15 頭）',
    'quest.ch3.yaks.step.talk_herder': '前往雅隆村與牧人達瓦交談，詢問雅拉香波山神震怒之因',

    'quest.ch3.shampo.title': '白犛牛',
    'quest.ch3.shampo.desc':
      '北方雅拉香波雪山下的高山牧場風雪交加。前往高山牧場壇城，與蓮花生大士淨相協力以金剛鉤索調伏化現為巨型白犛牛的雅拉香波山神。',
    'quest.ch3.shampo.step.reach_pasture': '前往北側高山牧場，直面雅拉香波雪山',
    'quest.ch3.shampo.step.subdue_boss': '調伏化現為巨型白犛牛的雅拉香波山神',
    'quest.ch3.shampo.step.talk_vision': '與高山牧場南緣的蓮花生大士淨相交談，領受「蓮華護盾」教授',

    // Dialogues
    // 1. Palace Keeper (`palaceKeeper`)
    'dlg.ch3.keeper.intro.1':
      '「吉祥如意，遠道而來的行者。你如今登臨的這座[[codex:yumbulagang|雍布拉康]]，自第一代贊普聶赤贊普降臨[[codex:yarlungValley|雅隆河谷]]以來，便世代俯瞰著這片青稞良田與奔流河水。」',
    'dlg.ch3.keeper.intro.2':
      '「然而近日北方主峰[[codex:yarlhaShampo|雅拉香波]]山神震怒，山頂黑雲翻湧、寒風呼嘯，不僅山林間偽裝成古木青石的[[codex:nyen|年]]神紛紛躁動，連河谷牧場裡的野犛牛群也雙目泛白、四處衝撞。」',
    'dlg.ch3.keeper.intro.3':
      '「另外，東側峭壁上的[[codex:sheldrak|協扎]]水晶洞近日有奇異虹光透出，洞中四座水晶柱似乎守護著一處古老伏藏匣。你若前往河谷安撫受驚的犛牛群，不妨也順道探訪協扎水晶洞。」',
    'dlg.ch3.keeper.intro.choice.accept': '「多謝老僧指引，我先去安撫河谷中的狂暴犛牛，並探訪協扎水晶洞。」',
    'dlg.ch3.keeper.intro.choice.ask': '「請問雍布拉康與雅隆河谷有何歷史淵源？」',
    'dlg.ch3.keeper.intro.askReply':
      '「[[codex:yarlungValley|雅隆河谷]]是吐蕃農耕與王統的搖籃，而[[codex:yumbulagang|雍布拉康]]則是歷代贊普最初的宮室。山巔的雅拉香波山神自古受王室祭祀，如今蓮師入藏弘揚佛法，舊日山神與[[codex:eightClasses|八部鬼神]]正經歷一場大調伏與大轉化啊。」',

    'dlg.ch3.keeper.afterValley.1':
      '「東側山崖便是[[codex:sheldrak|協扎]]水晶洞，洞口日光只要經四座水晶柱依次折射，便能開啟洞底的伏藏匣。而河谷中的狂暴野犛牛本是無辜生靈，切記只需平息其狂性，莫要傷其性命。」',
    'dlg.ch3.keeper.afterValley.choice.ok': '「謹記老僧教誨。」',

    'dlg.ch3.keeper.done.1':
      '「看那北方[[codex:yarlhaShampo|雅拉香波]]雪山雲開霧散，白雪映照金陽！山神既已皈依護法，雅隆河谷的青稞必將年年豐收。」',
    'dlg.ch3.keeper.done.choice.ok': '「願正法久住，山河安泰。」',

    // 2. Herder (`herder`)
    'dlg.ch3.herder.beforeYaks.1':
      '「唉！行者小心啊！河谷草甸上的野犛牛原本性情溫厚，卻被北方[[codex:yarlhaShampo|雅拉香波]]雪山吹來的刺骨妖風驚得發了狂，雙眼發白、見人就撞！請你以咒力讓 15 頭狂暴野犛牛平靜下來吧！」',
    'dlg.ch3.herder.beforeYaks.choice.ok': '「別擔心，我這就去讓受驚的犛牛群安靜下來。」',

    'dlg.ch3.herder.yaksReport.1':
      '「太好了！你看那些野犛牛眼中的白芒退去，又乖乖低頭吃草了！牠們並非妖魔，只是被山神的暴風雪嚇壞的畜生道生靈，多虧你以慈悲心安撫了牠們。」',
    'dlg.ch3.herder.yaksReport.2':
      '「不過真正的源頭在北方的雪線高山牧場——[[codex:yarlhaShampo|雅拉香波]]山神已化現為一頭如山岳般高大的純白巨犛牛，鼻孔噴出的寒霧能凍結整片牧場！我方才望見蓮花生大士的金色淨相已在高山牧場邊緣顯現，請快北上助陣吧！」',
    'dlg.ch3.herder.yaksReport.choice.accept': '「我即刻前往北側高山牧場，調伏雅拉香波白犛牛！」',

    'dlg.ch3.herder.done.1':
      '「白犛牛山神已經化為白衣童子立誓護法了！如今牧場風清日朗，犛牛群安然吃草，真是多虧了蓮師與你！」',
    'dlg.ch3.herder.done.choice.ok': '「願牧場平安吉祥。」',

    // 3. Villagers
    'dlg.ch3.villager1.talk':
      '「[[codex:yarlungValley|雅隆河谷]]的青稞今年長得格外飽滿，只盼北方的[[codex:yarlhaShampo|雅拉香波]]山神莫再降下冰雹才好。山林間還有偽裝成青苔石塊的[[codex:nyen|年]]神，路過時可得留神！」',
    'dlg.ch3.villager2.talk':
      '「雅隆河水推動著水磨坊日夜不停地磨出青稞糌粑。聽說東邊[[codex:sheldrak|協扎]]水晶崖的岩洞裡有四根會折射日光的奇異水晶柱，還沒人能把四道光完全對準呢！」',

    // 4. Guru Vision (`guruVision.yarlung`)
    'dlg.ch3.vision.beforeBoss.1':
      '「具信的行者，[[codex:yarlhaShampo|雅拉香波]]乃吐蕃最古老的大力山神，統攝山間諸多[[codex:nyen|年]]神與[[codex:eightClasses|八部鬼神]]。當牠狂暴衝撞時，我將以『金剛鉤索』縛其身形；屆時你須擊碎四周升起的四顆冰雹核心，方能破其傲慢堅冰！」',
    'dlg.ch3.vision.beforeBoss.choice.ok': '「謹遵上師教言，我這便步入牧場調伏山神！」',

    'dlg.ch3.vision.complete.1':
      '「善哉，行者！連吐蕃最尊貴傲慢的[[codex:yarlhaShampo|雅拉香波]]白犛牛，亦已在金剛鉤索與空性悲心前折服，化為白衣童子獻出心命、立誓護持佛法。」',
    'dlg.ch3.vision.complete.2':
      '「當知世間[[codex:eightClasses|八部鬼神]]與山岳[[codex:nyen|年]]神，本性皆非離心之外的實有魔敵。若以瞋心相抗，風雪愈烈；若安住如蓮華出污泥而不染之空性定慧，則狂暴山神亦轉為最堅固的護法資糧。」',
    'dlg.ch3.vision.complete.3':
      '「今傳授汝『蓮華護盾』密印，並賜白犛牛護法隨侍。吐蕃贊普赤松德贊已在雅魯藏布江北岸籌建第一座佛法僧三寶具足的寺院——前往第四章『桑耶寺』，成就奠基大業吧！」',
    'dlg.ch3.vision.complete.choice.accept': '「頂禮蓮花生大士！弟子領受『蓮華護盾』與白犛牛護法，啟程前往桑耶寺！」',

    'dlg.ch3.vision.done.1':
      '「雅拉香波山神已歸入三昧耶誓言，[[codex:yarlungValley|雅隆河谷]]與[[codex:sheldrak|協扎]]水晶崖的加持將長存雪域。前往桑耶寺吧！」',
    'dlg.ch3.vision.done.choice.ok': '「頂禮上師。」',

    // 6 Chapter 3 Codex Entries (150-300 chars in zh-Hant) + Terma entry
    'codex.yarlungValley.title': '雅隆河谷（Yarlung Valley）',
    'codex.yarlungValley.body':
      '〔史實〕雅隆河谷位於西藏南部山南地區（今乃東一帶），為雅魯藏布江支流雅隆河沖積而成的肥沃河谷，海拔約三千六百公尺。此地氣候溫和、水源豐沛，盛產青稞與豌豆，被譽為藏族農耕文明的搖籃與吐蕃王朝的發源地。早期雅隆部落由此興起，歷代贊普在此築宮立業、繁衍生息，逐步統一青藏高原諸部，奠定吐蕃帝國深厚的歷史與文化根基。',

    'codex.yumbulagang.title': '雍布拉康（Yumbulagang Palace）',
    'codex.yumbulagang.body':
      '〔傳說＋史實〕雍布拉康矗立於雅隆河谷東側的扎西次日山脊上，「雍布」意為母鹿，「拉康」意為神殿。傳統傳說尊其為西藏歷史上第一座宮殿，由吐蕃首代贊普聶赤贊普於公元前二世紀所建，至松贊干布遷都邏些前皆為歷代贊普冬宮。近現代建築史跡經二十世紀損毀後，於一九八〇年代依傳統規制大規模重建，今為供奉三世佛與歷代贊普像的重要寺院殿堂。',

    'codex.sheldrak.title': '雅隆協扎水晶洞（Yarlung Sheldrak）',
    'codex.sheldrak.body':
      '〔史實〕雅隆協扎（意為「水晶崖」）位於雅隆河谷群山峻嶺之中，為蓮花生大士入藏弘法期間極為重要的閉關修行岩洞，亦列為山南三大修行聖地之一。山崖岩壁富含天然石英水晶，日光映照時晶瑩璀璨。蓮師曾於此修持八大法行並埋藏諸多甚深伏藏法要，後世多位掘藏師相繼於協扎水晶洞取出伏藏經卷，至今仍是寧瑪派行者朝禮與閉關之聖境。',

    'codex.yarlhaShampo.title': '雅拉香波山神（Yarlha Shampo）',
    'codex.yarlhaShampo.body':
      '〔傳說〕雅拉香波雪山矗立於雅隆河谷北方，海拔逾六千六百公尺，為吐蕃古老山神之首與四大神山之一，象徵雅隆王室的守護神祇。據蓮師傳記記載，蓮花生大士行經雅隆時，雅拉香波山神化現為如山岳般巨大的狂暴白犛牛，口噴暴雪冰雹阻撓正法。蓮師安住空性定境，以金剛鉤索縛其鼻角、金剛威光催破冰雹，山神遂化為白衣童子跪伏立誓，永護佛法。',

    'codex.nyen.title': '年神（Nyen）',
    'codex.nyen.body':
      '〔史實〕「年」（Nyen）為藏地古老民間信仰與苯教傳統中的重要山林自然神祇類別，常棲止於高山岩崖、冰川、古木與草甸之間，性格剛烈善變，易因人類砍伐山林、挖掘土地或染污泉源而震怒，降下冰雹、雷電或疫病。在蓮花生大士入藏調伏本土鬼神的歷史敘事中，眾多山岳與林木之「年」神受金剛乘三昧耶戒約束，轉化為護持山川生態與修行道場的護法。',

    'codex.eightClasses.title': '八部鬼神（Eight Classes of Gods and Spirits）',
    'codex.eightClasses.body':
      '〔史實〕八部鬼神（藏語 Lha Srin Sde Brgyad，音譯「拉森德傑」）為藏地傳統宇宙觀中對世間超自然神靈的分類體系，源於印度天龍八部觀念與藏地本土天（lha）、龍（lu）、年（nyen）、贊（tsen）、魔（dü）、曜（za）、地主（sadag）等信仰的深度融合。蓮花生大士入藏時，並未消滅此等本土神祇，而是以慈悲威神力將八部鬼神納入三昧耶誓言，令其由違緣障礙轉為護法善神。',

    'codex.terma.title': '伏藏（Terma）',
    'codex.terma.body':
      '〔史實〕伏藏（藏語 Gter-ma，意為「珍寶庫藏」）是藏傳佛教寧瑪派與苯教特有的教法傳承方式。相傳八世紀蓮花生大士與耶喜措嘉佛母預見後世眾生根器與因緣，將諸多密續經卷、法器與聖物封存於山岩、水晶洞、湖泊乃至弟子光明心續之中。待時節因緣成熟，由授記化現的掘藏師（Terton）開啟取出，令教法歷久彌新、利益相應世代之行者。',
  },

  en: {
    // Map & Pure Vision Intro Card
    'map.yarlung': 'Yarlung Valley · Yarlha Shampo',
    'toast.enterYarlung': 'Entered Yarlung Valley — Cradle of Tibet beneath Mount Yarlha Shampo',
    'ch3.intro.title': 'Chapter III: Yarlung Valley · Yarlha Shampo',
    'ch3.intro.location': 'Yarlung Valley & Mount Yarlha Shampo, Tibet',
    'ch3.intro.era': 'Circa 8th Century CE',
    'ch3.intro.narration':
      'Glacial waters of the Yarlung River nourish golden-green barley fields below Yumbulagang Palace, cradle of the Tibetan kings.\nYet to the north, the ancient mountain god Yarlha Shampo rages in the form of a colossal White Yak, hurling blizzards and hail across the pastures.\nCalm the panicked yak herds and ascend to the snowline pasture to aid Guru Rinpoche in binding the mountain god under oath.',
    'ch3.intro.hint': 'Press any key or click to continue',

    // Chapter Completion Banner
    'ch3.banner.complete.kicker': 'Chapter III Complete',
    'ch3.banner.complete.title': '"Chapter III Complete: Oath of the Sacred White Yak"',
    'ch3.banner.complete.sub': 'Unlocked Skill "Lotus Shield", Protector "Sacred White Yak" & Chapter IV Waypoint "Samye Monastery"',

    // Interactive Prompts & Toasts
    'prompt.rotateCrystalPillar': 'Press [E] to rotate Sheldrak Crystal Pillar (45°)',
    'toast.sheldrak.pillarRotated': 'Crystal pillar rotated 45° — sunlight beam redirected ({hits}/4 aligned)',
    'toast.sheldrak.solved': 'All four crystal pillars resonate in harmony! The beam unlocks the ancient Terma Casket!',
    'toast.yakCalmed': 'The white glare fades from the wild yak\'s eyes as it lowers its head to graze peacefully.',
    'toast.nyenAwaken': 'A moss-covered boulder shudders — a mountain Nyen spirit awakens from disguise!',
    'toast.boss.hookCast': 'Guru Rinpoche\'s Pure Vision casts the golden Vajra Hook & Lasso! Shatter the 4 Hail Cores around the arena!',
    'toast.boss.hailCoreBroken': 'Shattered a Hail Core! (Remaining: {n}/4)',
    'toast.boss.allHailCoresBroken': 'All four Hail Cores shattered! The golden Vajra Hook & Lasso tightens, dealing heavy damage to Yarlha Shampo!',

    // Enemies
    'enemy.nyen': 'Nyen (Rock & Tree Spirit)',
    'enemy.wildYak': 'Rampaging Wild Yak',
    'enemy.hailCore': 'Hail Core',

    // Boss: Yarlha Shampo White Yak
    'boss.yarlhaShampo.name': 'Yarlha Shampo White Yak',
    'boss.yarlhaShampo.title': 'Lord of Mount Yarlha Shampo · White-Robed Youth',
    'dlg.boss.yarlhaShampo.oath.1':
      '"Mooo—! The golden Vajra Hook & Lasso binds my horns, the Lotus mudrā stills my blizzards, and even my ancient hail cores lie shattered..."',
    'dlg.boss.yarlhaShampo.oath.2':
      '(The mountain-sized White Yak sinks to its knees in the snow; as the frost mist parts, it transforms into a noble youth in white robes with white braided hair, palms joined in reverence.)',
    'dlg.boss.yarlhaShampo.oath.3':
      '"Great Master of Oddiyana and wise practitioner! I am [[codex:yarlhaShampo|Yarlha Shampo]], sovereign spirit of Yarlung. Blinded by pride, I unleashed hail and storm—now humbled by your compassionate majesty, I offer my life-essence mantra and swear an unbreakable Vajra Oath!"',
    'dlg.boss.yarlhaShampo.oath.4':
      '"Henceforth I shall guard Yarlung Valley\'s harvests and ride beside you as the Sacred White Yak protector to defend the Dharma!"',
    'dlg.boss.yarlhaShampo.oath.accept': '"Well spoken, White-Robed Youth. Keep your samaya oath and protect all beings of the Snow Land."',

    // Quest Items
    'quest.item.termaScrollShard': 'Sheldrak Terma Scroll Shard',

    // NPCs
    'npc.palaceKeeper': 'Yumbulagang Palace Keeper',
    'npc.herder': 'Yarlung Herder Dawa',
    'npc.yarlungVillager1': 'Farmer Yangchen',
    'npc.yarlungVillager2': 'Miller Norbu',
    'npc.guruVision.yarlung': 'Guru Rinpoche (Pure Vision)',

    // Quests
    'quest.chapter.3': 'Chapter III: Yarlung Valley · Yarlha Shampo',
    'quest.chapter.ch3': 'Chapter III: Yarlung Valley · Yarlha Shampo',

    'quest.ch3.valley.title': 'Yumbulagang',
    'quest.ch3.valley.desc':
      'Enter the fertile Yarlung Valley, cradle of Tibetan civilization. Ascend the western ridge trail to Yumbulagang Palace and speak with the Palace Keeper about the valley\'s history and the mountain god\'s wrath.',
    'quest.ch3.valley.step.reach_palace': 'Ascend the western ridge to Yumbulagang Palace',
    'quest.ch3.valley.step.talk_keeper': 'Speak with the Yumbulagang Palace Keeper',

    'quest.ch3.sheldrak.title': 'Terma of the Crystal Cliff (Side Quest)',
    'quest.ch3.sheldrak.desc':
      'The Palace Keeper spoke of a hidden Terma inside Sheldrak Crystal Cave on the eastern cliff. Rotate the four crystal pillars inside the cave to reflect sunlight onto the Terma Casket and retrieve the scroll shard.',
    'quest.ch3.sheldrak.step.reach_cave': 'Enter Sheldrak Crystal Cave on the eastern cliff',
    'quest.ch3.sheldrak.step.collect_shard': 'Align the 4 crystal pillars to open the Terma Casket and collect the Terma Scroll Shard',

    'quest.ch3.yaks.title': 'Stampede of the Yak Herd',
    'quest.ch3.yaks.desc':
      'Fierce gales from Mount Yarlha Shampo have driven the valley\'s wild yaks into a frenzy. Calm 15 rampaging wild yaks (as ordinary animals, they lower their heads to graze peacefully rather than dissolving in rainbow light), then speak with Herder Dawa in Yarlung Village.',
    'quest.ch3.yaks.step.calm_yaks': 'Calm 15 rampaging wild yaks in the valley',
    'quest.ch3.yaks.step.talk_herder': 'Speak with Herder Dawa in Yarlung Village',

    'quest.ch3.shampo.title': 'The Great White Yak',
    'quest.ch3.shampo.desc':
      'Ascend to the northern Alpine Pasture facing Mount Yarlha Shampo, subdue the mountain god in his colossal White Yak form alongside Guru Rinpoche\'s golden Hook & Lasso, and receive the Lotus Shield empowerment.',
    'quest.ch3.shampo.step.reach_pasture': 'Reach the northern Alpine Pasture facing Mount Yarlha Shampo',
    'quest.ch3.shampo.step.subdue_boss': 'Subdue the Yarlha Shampo White Yak',
    'quest.ch3.shampo.step.talk_vision': 'Speak with the Pure Vision of Guru Rinpoche to receive the Lotus Shield teaching',

    // Dialogues
    'dlg.ch3.keeper.intro.1':
      '"Tashi Delek, traveler. From this ridge of [[codex:yumbulagang|Yumbulagang Palace]], the early Tibetan kings have watched over the fertile [[codex:yarlungValley|Yarlung Valley]] since the days of Nyatri Tsenpo."',
    'dlg.ch3.keeper.intro.2':
      '"Yet dark storm clouds now crown Mount [[codex:yarlhaShampo|Yarlha Shampo]] to the north. The mountain god\'s fury has awakened disguised [[codex:nyen|Nyen]] spirits among the rocks and driven the valley\'s wild yaks into a white-eyed frenzy."',
    'dlg.ch3.keeper.intro.3':
      '"Meanwhile, a beam of sunlight now shines into [[codex:sheldrak|Sheldrak Crystal Cave]] on the eastern cliff, where four rotatable crystal pillars guard an ancient Terma casket. As you calm the yaks in the valley, you may wish to explore Sheldrak Cave as well."',
    'dlg.ch3.keeper.intro.choice.accept': '"Thank you, venerable keeper. I will calm the yak herd and visit Sheldrak Crystal Cave."',
    'dlg.ch3.keeper.intro.choice.ask': '"Tell me more about Yumbulagang and the Yarlung dynasty."',
    'dlg.ch3.keeper.intro.askReply':
      '"[[codex:yarlungValley|Yarlung Valley]] is the birthplace of Tibetan agriculture and kingship, and [[codex:yumbulagang|Yumbulagang]] was the royal winter palace before the capital moved to Lhasa. Now that Guru Rinpoche has entered Tibet, the ancient mountain gods and [[codex:eightClasses|Eight Classes]] of spirits are being bound under oath as Dharma protectors."',

    'dlg.ch3.keeper.afterValley.1':
      '"[[codex:sheldrak|Sheldrak Crystal Cave]] lies on the eastern cliff—align its four crystal pillars so the sunbeam strikes the Terma casket. And remember: the rampaging wild yaks are frightened animals, so calm their fury rather than harming their lives."',
    'dlg.ch3.keeper.afterValley.choice.ok': '"I will keep your counsel in mind."',

    'dlg.ch3.keeper.done.1':
      '"Look northward—the storm clouds around [[codex:yarlhaShampo|Yarlha Shampo]] have parted into radiant sunlight! With the mountain god bound to the Dharma, Yarlung Valley\'s barley fields will flourish."',
    'dlg.ch3.keeper.done.choice.ok': '"May peace and the Dharma endure."',

    'dlg.ch3.herder.beforeYaks.1':
      '"Watch out, traveler! Our wild yaks are gentle beasts by nature, but icy gales from Mount [[codex:yarlhaShampo|Yarlha Shampo]] have driven them berserk! Please use your mantra to calm 15 rampaging wild yaks so they return to grazing!"',
    'dlg.ch3.herder.beforeYaks.choice.ok': '"Rest assured, I will calm the frightened yaks."',

    'dlg.ch3.herder.yaksReport.1':
      '"Wonderful! Look how the white glare fades from their eyes as they lower their heads to graze the grass again! They are ordinary animals, not demons—your compassionate mantra restored their peace."',
    'dlg.ch3.herder.yaksReport.2':
      '"Yet the source of the storm awaits at the northern Alpine Pasture! [[codex:yarlhaShampo|Yarlha Shampo]] himself has manifested as a mountain-sized White Yak breathing freezing mist! I saw the golden Pure Vision of Guru Rinpoche appear at the pasture\'s edge—hurry north!"',
    'dlg.ch3.herder.yaksReport.choice.accept': '"I will head to the Alpine Pasture at once and subdue the White Yak!"',

    'dlg.ch3.herder.done.1':
      '"The Great White Yak transformed into a white-robed youth and swore an oath to Guru Rinpoche! The pasture is calm once more—thank you!"',
    'dlg.ch3.herder.done.choice.ok': '"May your herds prosper in peace."',

    'dlg.ch3.villager1.talk':
      '"The barley in [[codex:yarlungValley|Yarlung Valley]] grows tall by the river, though we pray [[codex:yarlhaShampo|Yarlha Shampo]] spares us from hail. Watch out for [[codex:nyen|Nyen]] spirits disguised as mossy boulders along the slopes!"',
    'dlg.ch3.villager2.talk':
      '"The Yarlung River turns our watermill wheel day and night to grind tsampa. Up in [[codex:sheldrak|Sheldrak Crystal Cave]] on the eastern cliff, four crystal pillars catch the sunbeam—if someone aligns them all, the Terma casket at the back may open!"',

    'dlg.ch3.vision.beforeBoss.1':
      '"Faithful practitioner, [[codex:yarlhaShampo|Yarlha Shampo]] is the chief mountain deity of Yarlung and lord over many [[codex:nyen|Nyen]] and [[codex:eightClasses|Eight Classes]] of spirits. When its fury peaks, I shall bind it at the center of the pasture with the golden Vajra Hook & Lasso—shatter the 4 Hail Cores around the rim to break its icy pride!"',
    'dlg.ch3.vision.beforeBoss.choice.ok': '"I understand, Guru. I will step into the pasture and subdue the White Yak!"',

    'dlg.ch3.vision.complete.1':
      '"Well done! Even proud [[codex:yarlhaShampo|Yarlha Shampo]], the Great White Yak of Yarlung, has bowed before the Vajra Hook & Lasso, assuming the form of a white-robed youth to offer his life-vein and guard the Dharma."',
    'dlg.ch3.vision.complete.2':
      '"Know that the [[codex:eightClasses|Eight Classes of spirits]] and mountain [[codex:nyen|Nyen]] are not external enemies separate from mind. Met with anger, their blizzards only grow fiercer; met with the unstained emptiness and compassion of the lotus, even the fiercest mountain god becomes a steadfast protector."',
    'dlg.ch3.vision.complete.3':
      '"I bestow upon you the empowerment of the \'Lotus Shield\' and the Sacred White Yak protector. North of the Tsangpo River, King Trisong Detsen is laying the foundation of Tibet\'s first monastery—journey onward to Chapter IV: Samye Monastery!"',
    'dlg.ch3.vision.complete.choice.accept': '"Homage to Guru Rinpoche! I receive the Lotus Shield and set forth for Samye Monastery!"',

    'dlg.ch3.vision.done.1':
      '"Yarlha Shampo abides within his samaya oath, and the blessings of [[codex:yarlungValley|Yarlung Valley]] and [[codex:sheldrak|Sheldrak]] endure. Proceed to Samye Monastery!"',
    'dlg.ch3.vision.done.choice.ok': '"Homage to the Guru."',

    // 6 Chapter 3 Codex Entries + Terma
    'codex.yarlungValley.title': 'Yarlung Valley',
    'codex.yarlungValley.body':
      '[History] Located in Lhokha (Shannan) south of the Yarlung Tsangpo River at roughly 3,600 meters elevation, the fertile Yarlung Valley is celebrated as the cradle of Tibetan agriculture and the birthplace of the Yarlung Dynasty. Nourished by glacial meltwater and broad barley fields, the early Tibetan kings (Tsenpos) rose from this valley to unify the Tibetan Plateau and establish the Tibetan Empire.',

    'codex.yumbulagang.title': 'Yumbulagang Palace',
    'codex.yumbulagang.body':
      '[Legend & History] Towering atop Mount Tashi Tserig on the eastern ridge of the Yarlung Valley, Yumbulagang ("Palace of Mother and Son" or "Hind\'s Palace") is revered in Tibetan tradition as Tibet\'s first building, erected in the 2nd century BCE for the first king, Nyatri Tsenpo. Severely damaged in the 20th century and extensively reconstructed in the 1980s, it remains a landmark monastery overlooking the valley.',

    'codex.sheldrak.title': 'Yarlung Sheldrak Crystal Cave',
    'codex.sheldrak.body':
      '[History] Yarlung Sheldrak ("Crystal Cliff") is a renowned high-cliff meditation cavern in the mountains above the Yarlung Valley and one of Lhokha\'s three great sacred sites associated with Padmasambhava. Named for the natural quartz crystal veins glittering along its rock walls, it was here that Guru Rinpoche practiced the Eight Herukas and concealed numerous Terma treasures later revealed by tertöns.',

    'codex.yarlhaShampo.title': 'Yarlha Shampo',
    'codex.yarlhaShampo.body':
      '[Legend] Rising over 6,600 meters at the head of the Yarlung Valley, Mount Yarlha Shampo is one of Tibet\'s four great nyen-chen mountain gods and the ancestral patron deity of the Yarlung kings. In Padmasambhava\'s biographies, the god manifested as a mountain-sized White Yak breathing blizzards and hail; bound by Guru Rinpoche\'s Vajra Hook & Lasso, he transformed into a white-robed youth and swore an oath to protect Buddhism.',

    'codex.nyen.title': 'Nyen (Mountain & Tree Spirits)',
    'codex.nyen.body':
      '[History] In indigenous Tibetan cosmology and Bon tradition, the Nyen are volatile nature spirits inhabiting mountain crags, glaciers, ancient trees, and alpine pastures. Easily provoked when humans disturb forests, dig the earth, or pollute springs, they were believed to send hailstorms or illness. Through Padmasambhava\'s subjugation narratives, the Nyen were bound by samaya vows as guardians of sacred landscapes.',

    'codex.eightClasses.title': 'Eight Classes of Gods and Spirits',
    'codex.eightClasses.body':
      '[History] The Eight Classes of Gods and Spirits (Tib. Lha Srin Sde Brgyad) is the traditional Tibetan taxonomy of worldly supernatural beings, blending the Indian Eightfold Pantheon with indigenous spirits including Lha (sky deities), Lu (nāgas), Nyen (mountain/tree spirits), Tsen (crimson warrior spirits), Dü, Za, and Sadag. Rather than destroying them, Padmasambhava bound these forces under oath as Dharma protectors.',

    'codex.terma.title': 'Terma (Hidden Treasures)',
    'codex.terma.body':
      '[History] Terma ("hidden treasures") are sacred texts, ritual implements, and teachings concealed in the 8th century by Padmasambhava and Yeshe Tsogyal within rock cliffs, crystal caves, lakes, and the mind-streams of disciples. Revealed in later centuries by prophesied treasure-revealers (tertöns) when karmic conditions ripen, the Terma tradition continually renews Nyingma Vajrayāna practice.',
  },
};

i18n.register(CH3_I18N);
export default CH3_I18N;
