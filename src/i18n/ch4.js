/**
 * Chapter 4 (Samye Monastery & Mount Hepo Ri) — i18n Strings (`src/i18n/ch4.js`) — Issue #35
 *
 * Registers Traditional Chinese (`zh`) and English (`en`) translations for:
 *   - Map names, subtitles, and Chapter 4 intro card (`ch4.intro.*`)
 *   - Day-Build / Night-Destroy HUD, quarry/timber gathering prompts & toasts
 *   - Mount Hepo Ri 4-Wave Gauntlet wave banners (linking to `[[codex:eightClasses]]`)
 *   - "Samye!" (`བསམ་ཡས`) palm-vision ending cutscene subtitles & skip button
 *   - Chapter 4 enemies (`wallBreaker`, `du`, `gyalpo`) & Boss (`pehar`)
 *   - NPCs (`shantarakshita`, `trisongDetsen`, `samyeArtisan`, `guruVision.samye`, `sevenTestedMen`)
 *   - Quests (`ch4.foundation`, `ch4.dayNight`, `ch4.hepori`, `ch4.pehar`, `ch4.samye`)
 *   - Dialogues & Boss Oath (`boss.pehar.oath`)
 *   - 9 Codex entries (`samye`, `shantarakshita`, `trisongDetsen`, `samyeMandala`, `hepori`,
 *     `eightClasses`, `pehar`, `samyeName`, `sevenTestedMen`)
 */
import { i18n } from '../i18n.js';

export const CH4_STRINGS = {
  zh: {
    // ---------------------------------------------------------------- Map & Intro
    'map.samye': '海波日山・桑耶寺',
    'map.samye.subtitle': '雅魯藏布江北岸・不共思議之剎',
    'waypoint.samye.name': '桑耶寺渡口',
    'waypoint.samye.region': '第四章・山南桑耶',
    'waypoint.chimphu.name': '青朴山',
    'waypoint.chimphu.region': '第五章・青朴閉關巖',
    'ch4.intro.title': '第四章：海波日山・桑耶寺',
    'ch4.intro.location': '雅魯藏布江北岸・紅山之麓',
    'ch4.intro.era': '吐蕃赤松德贊時期（西元八世紀後期）',
    'ch4.intro.narration': '白晝壘石立柱，入夜鬼神盡毀其基。唯有調伏八部傲慢之靈，須彌曼荼羅方能聳立於紅山之畔。',
    'ch4.banner.complete': '第四章 完成',
    'ch4.banner.complete.kicker': '第四章 完成',
    'ch4.banner.complete.title': '「第四章 完成：桑耶大寺圓滿落成」',
    'ch4.banner.complete.sub': '已解鎖終極法門「蓮師心咒」與第五章傳送點「青朴山」',

    // ---------------------------------------------------------------- Prompts & Toasts
    'prompt.samyeQuarry': '按 [E] 採集河畔石材',
    'prompt.samyeTimber': '按 [E] 搬運渡口木材',
    'prompt.samyeCarryFull': '背負已滿（上限 4 件）— 請先交予桑耶工匠總管',
    'prompt.samyeDeliver': '按 [E] 交付建材予工匠總管',
    'prompt.heporiAltar': '按 [E] 登上金剛舞壇城（海波日山頂）',
    'prompt.samyeEnding': '按 [E] 瞻禮掌中桑耶寺淨相',
    'toast.stonePicked': '採得石材 +1（背負 {carry}/4）',
    'toast.woodPicked': '搬得木材 +1（背負 {carry}/4）',
    'toast.carryFull': '背負建材已達上限（4 件），請先交回營地！',
    'toast.materialsDelivered': '已交付建材（石材 {stone}/{reqStone}・木材 {wood}/{reqWood}）',
    'toast.silenced': '遭王魔禁言咒波及，2 秒內無法施展法門！',

    // ---------------------------------------------------------------- Day-Build / Night-Destroy HUD
    'samye.hud.dayTitle': '白晝營建（第 {cycle}/3 日）',
    'samye.hud.nightTitle': '入夜護寺（第 {night}/3 夜）— 剩餘 {sec}s',
    'samye.hud.materials': '石材 {stone}/{reqStone} ｜ 木材 {wood}/{reqWood}',
    'samye.hud.carry': '背負：石 ×{cStone} 木 ×{cWood}（上限 4）',
    'samye.hud.repairExtra': '（含昨夜損毀牆段修補 +{extra}）',
    'samye.hud.wallN': '北垣',
    'samye.hud.wallE': '東垣',
    'samye.hud.wallS': '南垣',
    'samye.hud.wallW': '西垣',
    'samye.hud.wallBroken': '損毀（明日需補材）',
    'samye.hud.nightSurvived': '天光破曉！桑耶寺工程推進至階段 {stage}/4',

    // ---------------------------------------------------------------- Mount Hepo Ri 4-Wave Gauntlet
    'hepori.wave1.title': '第一波：贊神（Tsen・赤紅騎兵）',
    'hepori.wave1.desc': '棲止紅山巖壁之猛烈火騎，屬[[codex:eightClasses]]之贊部。',
    'hepori.wave2.title': '第二波：魔部（Dü・黑煙夜魅）',
    'hepori.wave2.desc': '伺機瞬步背刺之黑闇魔眾，屬[[codex:eightClasses]]之魔部。',
    'hepori.wave3.title': '第三波：王魔（Gyalpo・白袍咒靈）',
    'hepori.wave3.desc': '冠戴高頂白笠、善施禁言與咒珠之靈，屬[[codex:eightClasses]]之王魔部。',
    'hepori.wave4.title': '第四波：海波日八部合圍・精英首領',
    'hepori.wave4.desc': '蓮師金剛舞威光攝受[[codex:eightClasses]]，降伏紅山諸神化為護寺金光！',
    'hepori.cleared': '海波日山八部鬼神盡皆折伏，化作金光飛入桑耶寺工地！',

    // ---------------------------------------------------------------- "Samye!" Ending Cutscene
    'samye.ending.q1': '赤松德贊：「大士，此寺歷盡艱辛，建成之日究竟是何模樣？」',
    'samye.ending.q2': '蓮花生大士微笑舒掌，掌心赫然浮現一座金光璀璨之須彌曼荼羅全寺幻影。',
    'samye.ending.samyeExclaim': '赤松德贊驚嘆：「桑耶！（བསམ་ཡས — 出乎意料、不可思議！）」',
    'samye.ending.sub': '烏孜大殿三層三式、四方四色佛塔、千零八座小塔與七覺士齊聚落成',
    'samye.ending.skip': '跳過動畫 [Skip]',

    // ---------------------------------------------------------------- Enemies & Boss
    'enemy.wallBreaker': '夜拆鬼',
    'enemy.du': '黑煙魔（Dü）',
    'enemy.gyalpo': '白笠王魔（Gyalpo）',
    'boss.pehar.name': '白哈爾王',
    'boss.pehar.title': '三面六臂白獅王魔・桑耶寺護庫主',

    // ---------------------------------------------------------------- NPCs
    'npc.shantarakshita.name': '寂護大師',
    'npc.shantarakshita.title': '那爛陀堪布・中觀瑜伽行派大論師',
    'npc.trisongDetsen.name': '赤松德贊',
    'npc.trisongDetsen.title': '吐蕃第三十八代贊普',
    'npc.samyeArtisan.name': '桑耶工匠總管',
    'npc.samyeArtisan.title': '須彌曼荼羅督造匠師',
    'npc.guruVision.samye.name': '蓮師淨相',
    'npc.guruVision.samye.title': '海波日山金剛舞伏魔尊',
    'npc.sevenTestedMen.name': '桑耶七覺士代表（巴・賽囊）',
    'npc.sevenTestedMen.title': '吐蕃首批出家七覺士',

    // ---------------------------------------------------------------- Quests
    // C4-1: ch4.foundation
    'quest.ch4.foundation.title': '寂護與藏王',
    'quest.ch4.foundation.desc': '渡過雅魯藏布江抵達桑耶營地，向那爛陀大堪布寂護與吐蕃贊普赤松德贊請益建寺受阻之因。',
    'quest.ch4.foundation.step.talk_shanta': '在桑耶營地與寂護大師交談',
    'quest.ch4.foundation.step.talk_king': '與赤松德贊贊普交談，了解晝建夜毀之困',

    // C4-2: ch4.dayNight
    'quest.ch4.dayNight.title': '晝建夜毀',
    'quest.ch4.dayNight.desc': '白晝採集河畔石材與渡口木材交付工匠總管，入夜守護四方寺垣抵禦夜拆鬼與八部魔眾，完成三輪晝夜營建。',
    'quest.ch4.dayNight.step.survive_nights': '完成白晝備料並守住桑耶寺三個夜晚（{progress}/3）',

    // C4-3: ch4.hepori
    'quest.ch4.hepori.title': '海波日山之巔',
    'quest.ch4.hepori.desc': '登上東方海波日山頂，隨蓮花生大士之忿怒金剛舞連破四波八部鬼神，令彼等從拆寺者轉化為搬石建寺之護法。',
    'quest.ch4.hepori.step.reach_summit': '登上東方海波日山頂壇城',
    'quest.ch4.hepori.step.clear_gauntlet': '於海波日山頂擊退四波八部鬼神試煉',

    // C4-4: ch4.pehar
    'quest.ch4.pehar.title': '白哈爾王',
    'quest.ch4.pehar.desc': '前往桑耶寺北側試煉場，調伏乘白獅、具三面六臂之王魔首領白哈爾，令其立誓守護桑耶寶庫。',
    'quest.ch4.pehar.step.boss': '調伏三面六臂白獅王魔・白哈爾',

    // C4-5: ch4.samye
    'quest.ch4.samye.title': '桑耶',
    'quest.ch4.samye.desc': '見證蓮師掌中顯現桑耶全寺幻影與贊普「桑耶！」之嘆，順時針繞行圓滿落成之桑耶寺外垣一匝，再向寂護大師頂禮回向。',
    'quest.ch4.samye.step.ending': '見證「桑耶！」掌中顯相與全寺落成大典',
    'quest.ch4.samye.step.kora': '順時針繞行桑耶寺圓形外垣一圈（轉經一匝）',
    'quest.ch4.samye.step.talk_shanta': '向寂護大師回報圓滿，領受蓮師心咒灌頂',

    // ---------------------------------------------------------------- Dialogues
    // Shantarakshita
    'dlg.ch4.shanta.foundation.1': '遠道而來的行者，善來此間。老衲寂護（Śāntarakṣita），應贊普[[codex:trisongDetsen]]之請自那爛陀北來，欲於此雅魯藏布江北岸建立三寶常住之[[codex:samye]]。',
    'dlg.ch4.shanta.foundation.2': '然老衲以寂靜菩提心說法，本土山神與鬼神非但不服，每逢白晝匠人砌起石牆，入夜便狂風大作，將磚石木料盡數拆回江畔與山巔。',
    'dlg.ch4.shanta.foundation.3': '唯有大阿闍梨蓮花生大士悲威並運之金剛方便，方能折伏此間傲慢鬼神。請先向身旁的贊普稟明心意吧。',
    'dlg.ch4.shanta.dayNight': '白晝請協助工匠總管採集河畔石材與渡口木料；日落之後，夜拆鬼必自四方湧來毀牆。即便部分牆段受損亦莫氣餒，翌日補齊建材即可續建。',
    'dlg.ch4.shanta.hepori': '東側那座紅山便是[[codex:hepori]]，乃山南八部鬼神聚會之所。請登頂护持蓮師的金剛舞壇城！',
    'dlg.ch4.shanta.pehar': '八部雖已歸順，然北方仍有乘白獅之王魔首領[[codex:pehar]]蠢蠢欲動。若能將其調伏為護庫主，桑耶基業方得永固。',
    'dlg.ch4.shanta.samyeComplete.1': '「桑耶！不可思議！」誠如贊普所嘆，[[codex:samyeName]]已成，中央烏孜大殿三層兼具蕃、漢、印三地規制，外繞鐵圍山圓牆千零八座小塔。',
    'dlg.ch4.shanta.samyeComplete.2': '更有[[codex:sevenTestedMen]]於老衲座下受具足戒，吐蕃自此佛、法、僧三寶具足！此乃蓮師親傳之十二字金剛上師心咒，願伴汝前往北方青朴山閉關巖。',

    // King Trisong Detsen
    'dlg.ch4.king.foundation.1': '行者！朕乃吐蕃贊普[[codex:trisongDetsen]]。朕立誓於紅山之麓仿照古印度奧丹塔普里寺，建造一座具足須彌山、四大部洲與日月殿之[[codex:samyeMandala]]。',
    'dlg.ch4.king.foundation.2': '豈料此地鬼神頑強，白晝萬夫築牆，入夜群魔拆毀！請助工匠總管籌集石木、於夜間護持四方圍牆，撐過這三晝夜的考驗！',
    'dlg.ch4.king.progress': '只要守住這三輪晝夜營建，待大士於海波日山巔起舞伏魔，朕定能親眼見到這座不共思議之大寺！',
    'dlg.ch4.king.afterEnding': '「桑耶！」朕於蓮師掌中所見之金光寶剎，如今分毫不差地聳立於雅魯藏布江畔！快隨眾人繞行圓牆一匝，同霑法喜！',

    // Master Artisan
    'dlg.ch4.artisan.day': '行者，今日營建尚需石材與木材。請至左右河灘石場與南岸渡口木堆採集（每次最多背負 4 件），交予我即可動工，入夜後請務必守住四面圍牆！',
    'dlg.ch4.artisan.night': '夜拆鬼正自四方撲向寺院圍牆！快攔截牠們！若有牆段遭拆毀，明日我們還得額外多備石木修補！',
    'dlg.ch4.artisan.done': '不可思議！昨日還愁人手不足，自從蓮師降伏海波日山八部鬼神，夜裡竟有鬼神幫我們搬石運木，一日之功勝過往昔十日！',

    // Guru Vision & Seven Tested Men
    'dlg.ch4.vision.hepori': '「吽！諦聽，海波日山之贊、魔、王魔與八部傲慢鬼神！吾以大悲忿怒金剛步踏碎爾等我慢，速入曼荼羅受持三昧耶戒，護持桑耶正法道場！」',
    'dlg.ch4.vision.samye': '「大王且看吾掌心——須彌山居中，四大部洲、八小洲、日月二殿與四色佛塔環列，此即三界法界之桑耶曼荼羅！」',
    'dlg.ch4.seven.greeting': '頂禮行者！吾等[[codex:sevenTestedMen]]蒙寂護堪布親授具足戒，證實吐蕃人亦能持守清淨比丘戒律，自此譯經院日夜梵唄不絕！',

    // Boss Pehar Oath
    'dlg.boss.pehar.oath.1': '白哈爾王自白獅背上躍下，三面同時低垂頂禮，六臂合十獻上命咒：「嗚呼！蓮華生大阿闍梨，汝之金剛杵威光熾盛，摧破吾之三界傲慢！」',
    'dlg.boss.pehar.oath.2': '蓮師以金剛杵安立其頂：「白哈爾（[[codex:pehar]]），吾今封汝為桑耶大寺護庫主（གཙུག་ལག་ཁང་གི་དཀོར་བདག），掌管三寶資具與寺院財庫，護持正法行者，永不違越三昧耶！」',
    'dlg.boss.pehar.oath.3': '白哈爾王高聲立誓：「謹遵金剛敕令！凡持誦蓮師心咒之行者，吾必駕白獅隨侍護持，令三寶資糧無有匱乏！」',

    // ---------------------------------------------------------------- Codex Entries (9 entries, 150-300 chars each, [史實]/[傳說] labeled)
    'codex.entry.samye.title': '桑耶寺（བསམ་ཡས）',
    'codex.entry.samye.summary': '西藏歷史上第一座具足佛、法、僧三寶之寺院',
    'codex.entry.samye.body': '[史實] 桑耶寺（Samye，藏文 བསམ་ཡས，全稱「吉祥永固天成桑耶大伽藍」）位於今西藏山南扎囊縣雅魯藏布江北岸、海波日山麓。西元八世紀後期（約 775–779 年），由吐蕃贊普赤松德贊主持、那爛陀大論師寂護勘定規制、蓮花生大士調伏地基障礙而建成。隨「桑耶七覺士」於此剃度出家，桑耶寺成為西藏史上第一座真正具足佛、法、僧三寶之佛教道場。\n[傳說] 建寺之初白晝築牆、入夜盡為本土鬼神拆毀，直至蓮花生大士於海波日山跳金剛舞降伏八部鬼神，鬼神反於夜間協助搬運巨石木料，方令大寺奇蹟落成。',

    'codex.entry.shantarakshita.title': '寂護大師（Śāntarakṣita）',
    'codex.entry.shantarakshita.summary': '那爛陀大堪布、中觀瑜伽行派創始者與西藏比丘戒傳承初祖',
    'codex.entry.shantarakshita.body': '[史實] 寂護（Śāntarakṣita，藏譯「靜命」，藏人尊稱「堪布菩提薩埵」），八世紀古印度那爛陀寺大論師，融會中觀應成與唯識瑜伽行，創立「中觀瑜伽行派」，著有《攝真實論》。應赤松德贊迎請入藏弘法，規劃桑耶寺藍圖，並親授「七覺士」具足戒，開創藏傳佛教說一切有部比丘戒傳承。\n[傳說] 寂護初於拉薩與桑耶說法時，吐蕃本土山神因嫉生嗔，引發雷擊紅山與瘟疫水患；寂護遂向贊普舉薦神通廣大之蓮花生大士入藏伏魔，師徒二人一顯一密、被尊為「師君三尊」之二聖。',

    'codex.entry.trisongDetsen.title': '赤松德贊（Khri Srong lde brtsan）',
    'codex.entry.trisongDetsen.summary': '迎請寂護與蓮師、興建桑耶寺之吐蕃文殊化身贊普',
    'codex.entry.trisongDetsen.body': '[史實] 赤松德贊（742–797 在位），吐蕃第三十八代贊普，與松贊干布、赤祖德贊並稱「吐蕃三大法王」。在位期間國勢鼎盛，力排崇本教大臣反對，迎請寂護與蓮花生入藏，主持興建桑耶寺、組織譯場將大量梵文佛典譯為藏文，並頒布詔書確立佛教為吐蕃國教（見桑耶寺興佛證盟碑）。\n[傳說] 藏傳佛教視赤松德贊為文殊菩薩之化身，與寂護堪布、蓮花生大士合稱「師君三尊（མཁན་སློབ་ཆོས་གསུམ）」，於蓮師掌中親見寺院幻影而驚呼「桑耶！」。',

    'codex.entry.samyeMandala.title': '桑耶立體曼荼羅（須彌四洲規制）',
    'codex.entry.samyeMandala.summary': '三層三式烏孜大殿、四大部洲、日月殿與四色佛塔之佛教宇宙模型',
    'codex.entry.samyeMandala.body': '[史實] 桑耶寺整體布局仿照古印度摩揭陀國奧丹塔普里寺（Odantapurī），嚴格依《俱舍論》佛教宇宙觀設計為立體曼荼羅：中央「烏孜大殿」象徵須彌山，底層採藏式石砌、中層採漢式磚木飛簷、頂層採印式木構金頂，故稱「三樣寺」；四方建四大部洲殿與八小洲殿，南北配祀日殿與月殿，四角立白、紅、黑、綠四色大佛塔，外圍圓牆象徵鐵圍山，垣頂排列 1,008 座小舍利塔。\n[傳說] 四色佛塔分別鎮攝四方鬼神並表徵四種事業（息白、增黃紅、懷紅、誅黑綠），繞行鐵圍圓牆一匝即等同周遊三千大千世界。',

    'codex.entry.hepori.title': '海波日山（Hepo Ri・桑耶紅山）',
    'codex.entry.hepori.summary': '桑耶寺東側之神山，蓮師跳金剛舞降伏八部鬼神之聖地',
    'codex.entry.hepori.body': '[史實] 海波日山（Hepo Ri，藏文 ཧས་པོ་རི）位於桑耶寺東側，海拔約三千七百餘公尺，為俯瞰雅魯藏布江寬谷與桑耶寺全景之制高點。自古即為吐蕃山南地區祭祀山神與焚燒桑煙（煨桑）之神山，山頂至今設有佛塔與經幡陣。\n[傳說] 建寺受阻時，蓮花生大士登臨海波日山頂，現忿怒金剛舞姿，以期剋印與金剛杵鎮伏盤踞山中的贊、魔、王魔等八部鬼神，令眾神獻出命咒、於夜間化作役夫替工匠搬石築牆。',

    'codex.entry.eightClasses.title': '天龍八部（Lha Srin sDe Brgyad）',
    'codex.entry.eightClasses.summary': '藏地本土與印度佛典交融之八大世間鬼神部類',
    'codex.entry.eightClasses.body': '[史實] 藏傳佛教所稱「八部鬼神（ལྷ་སྲིན་སྡེ་བརྒྱད，Lha Srin sDe Brgyad）」，融合了印度大乘佛典之天龍八部與吐蕃本土精靈信仰，為藏地金剛舞（羌姆）與護法儀軌之核心對象。\n[傳說] 八部通常包含：白笠王魔（Gyalpo，多由破戒高僧或王族死後所化）、赤甲贊神（Tsen，棲居紅巖之凶猛騎兵）、黑煙魔眾（Dü，障道夜魅）、曜神（Za）、地母（Mamo）、龍族（Klu）、山神（Nyen）與地祇（Sadag）。經蓮師於海波日山調伏後，八部悉成護持佛法之誓願護法。',

    'codex.entry.pehar.title': '白哈爾王（Pehar Gyalpo）',
    'codex.entry.pehar.summary': '三面六臂乘白獅之五身王魔首領、桑耶寺護庫主',
    'codex.entry.pehar.body': '[史實] 白哈爾（Pehar Gyalpo，藏文 པེ་ཧར་རྒྱལ་པོ）為藏傳佛教極具代表性之世間護法神，原為北方霍爾（Hor）地區信仰之神祇，隨桑耶寺建立而納入佛教護法體系，後世更演變為乃瓊護法（Nechung）之本尊「五身王（Gyalpo Kunga）」。\n[傳說] 白哈爾具白、藍、紅三面六臂，頭戴藤編圓笠，手持弓箭、刀劍與金剛棍，騎乘威猛白雪獅。蓮師降伏白哈爾後，敕封其為桑耶寺「護庫主（དཀོར་བདག）」，專司守護寺院寶藏與行者資糧。',

    'codex.entry.samyeName.title': '「桑耶」名號由來（བསམ་ཡས）',
    'codex.entry.samyeName.summary': '蓮師掌中顯現全寺幻影，赤松德贊驚嘆「出乎意料、不可思議！」',
    'codex.entry.samyeName.body': '[史實] 「桑耶（བསམ་ཡས，bsam yas）」在藏語中意為「出乎意料」、「超乎想像」或「不可思議」。作為西藏第一座佛寺之簡稱，此名號見載於《拔協》（dBa\' bzhed）、《賢者喜宴》等早期藏文史籍，反映當時吐蕃人初見宏偉三層三式立體曼荼羅建築時之震撼。\n[傳說] 據《拔協》與《蓮師廣傳》記載，赤松德贊急欲知曉寺院落成後之景象，蓮花生大士遂於酥油燈盞或自己掌心中化現桑耶寺完整金光模型，贊普見之脫口驚呼：「桑耶！（不可思議！）」寺院遂以此得名。',

    'codex.entry.sevenTestedMen.title': '桑耶七覺士（Sad mi mi bdun）',
    'codex.entry.sevenTestedMen.summary': '吐蕃歷史上首批受具足戒出家之七位貴族青年比丘',
    'codex.entry.sevenTestedMen.body': '[史實] 「桑耶七覺士（སད་མི་མི་བདུན，Sad mi mi bdun，意為七位受考驗者）」指桑耶寺落成後，赤松德贊選拔七名聰慧吐蕃貴族子弟（巴・賽囊、毗盧遮那、瑪・仁欽卻、昆・魯益旺波、朗・卡布、拉松・堅贊、熱・欽波），由寂護大師親任親教師授具足戒，以檢驗藏人能否持守比丘戒律。\n[傳說] 七覺士不僅嚴持淨戒，更精通梵藏翻譯與密法修持，其中毗盧遮那（Vairotsana）與巴・賽囊（益西旺波）更成為蓮師二十五大弟子之重鎮，標誌著西藏「僧寶」正式誕生。',
  },

  en: {
    // ---------------------------------------------------------------- Map & Intro
    'map.samye': 'Mount Hepo Ri & Samye Monastery',
    'map.samye.subtitle': 'North Bank of Yarlung Tsangpo — The Inconceivable Mandala',
    'waypoint.samye.name': 'Samye Ferry Crossing',
    'waypoint.samye.region': 'Chapter 4 · Samye Valley',
    'waypoint.chimphu.name': 'Mount Chimphu',
    'waypoint.chimphu.region': 'Chapter 5 · Chimphu Retreat Caves',
    'ch4.intro.title': 'Chapter 4: Mount Hepo Ri & Samye Monastery',
    'ch4.intro.location': 'North Bank of the Yarlung Tsangpo · Foot of Mount Hepo Ri',
    'ch4.intro.era': 'Reign of King Trisong Detsen (Late 8th Century CE)',
    'ch4.intro.narration': 'What mortals build by day, spirits tear down by night. Only when the Eight Classes of arrogant spirits are bound by the Vajra Dance can the Mandala of Mount Meru rise upon the sands.',
    'ch4.banner.complete': 'Chapter 4 Complete',
    'ch4.banner.complete.kicker': 'Chapter 4 Complete',
    'ch4.banner.complete.title': '"Chapter 4 Complete: Samye Monastery Rises"',
    'ch4.banner.complete.sub': 'Unlocked Ultimate "Vajra Guru Mantra" & Chapter 5 Waypoint "Mount Chimphu"',

    // ---------------------------------------------------------------- Prompts & Toasts
    'prompt.samyeQuarry': 'Press [E] to quarry riverside stone',
    'prompt.samyeTimber': 'Press [E] to gather ferry timber',
    'prompt.samyeCarryFull': 'Carry limit reached (4 max) — deliver to the Master Artisan first',
    'prompt.samyeDeliver': 'Press [E] to deliver materials to the Master Artisan',
    'prompt.heporiAltar': 'Press [E] to ascend the Vajra Dance Altar (Hepo Ri Summit)',
    'prompt.samyeEnding': 'Press [E] to behold the Palm Vision of Samye',
    'toast.stonePicked': 'Quarried Stone +1 (Carrying {carry}/4)',
    'toast.woodPicked': 'Gathered Timber +1 (Carrying {carry}/4)',
    'toast.carryFull': 'Carrying capacity full (4 items) — deliver to camp first!',
    'toast.materialsDelivered': 'Materials delivered (Stone {stone}/{reqStone} · Wood {wood}/{reqWood})',
    'toast.silenced': 'Silenced by Gyalpo curse! Cannot cast skills for 2s!',

    // ---------------------------------------------------------------- Day-Build / Night-Destroy HUD
    'samye.hud.dayTitle': 'Day Construction (Day {cycle}/3)',
    'samye.hud.nightTitle': 'Night Defense (Night {night}/3) — {sec}s left',
    'samye.hud.materials': 'Stone {stone}/{reqStone} | Wood {wood}/{reqWood}',
    'samye.hud.carry': 'Carrying: Stone ×{cStone} Wood ×{cWood} (Max 4)',
    'samye.hud.repairExtra': '(+{extra} extra for broken wall repair)',
    'samye.hud.wallN': 'North Wall',
    'samye.hud.wallE': 'East Wall',
    'samye.hud.wallS': 'South Wall',
    'samye.hud.wallW': 'West Wall',
    'samye.hud.wallBroken': 'Breached (Extra repair tomorrow)',
    'samye.hud.nightSurvived': 'Dawn breaks! Samye Monastery advances to Stage {stage}/4',

    // ---------------------------------------------------------------- Mount Hepo Ri 4-Wave Gauntlet
    'hepori.wave1.title': 'Wave 1: Tsen Spirits (Crimson Riders)',
    'hepori.wave1.desc': 'Fierce red-armored riders of the red cliffs, one of the [[codex:eightClasses]].',
    'hepori.wave2.title': 'Wave 2: Dü Demons (Black Smoke Stalkers)',
    'hepori.wave2.desc': 'Shadow-stepping night demons of the [[codex:eightClasses]] who strike from behind.',
    'hepori.wave3.title': 'Wave 3: Gyalpo Spirits (White-Robed Sorcerers)',
    'hepori.wave3.desc': 'Cane-hatted spirits of the [[codex:eightClasses]] wielding curse orbs and silence seals.',
    'hepori.wave4.title': 'Wave 4: Combined Host of Hepo Ri & Rare Elite',
    'hepori.wave4.desc': 'Guru Rinpoche’s Vajra Dance subdues the [[codex:eightClasses]] into golden guardians!',
    'hepori.cleared': 'The Eight Classes of Mount Hepo Ri are subdued and stream as golden light into Samye!',

    // ---------------------------------------------------------------- "Samye!" Ending Cutscene
    'samye.ending.q1': 'King Trisong Detsen: "Great Master, what will our monastery look like when at last it stands complete?"',
    'samye.ending.q2': 'Guru Rinpoche extends his open palm — above it floats a radiant golden miniature of the entire Mount Meru Mandala.',
    'samye.ending.samyeExclaim': 'King Trisong Detsen exclaims: "Samye! (བསམ་ཡས — Inconceivable!)"',
    'samye.ending.sub': 'The three-story Utse Hall, Four Colored Stupas, 1,008 perimeter chortens, and the Seven Tested Men stand complete',
    'samye.ending.skip': 'Skip Cutscene [Skip]',

    // ---------------------------------------------------------------- Enemies & Boss
    'enemy.wallBreaker': 'Night Wall-Breaker',
    'enemy.du': 'Dü Demon',
    'enemy.gyalpo': 'Gyalpo Spirit',
    'boss.pehar.name': 'Pehar Gyalpo',
    'boss.pehar.title': 'Three-Faced Six-Armed Snow Lion King · Guardian of Samye’s Treasury',

    // ---------------------------------------------------------------- NPCs
    'npc.shantarakshita.name': 'Śāntarakṣita',
    'npc.shantarakshita.title': 'Abbot of Nālandā · Bodhisattva Khenpo',
    'npc.trisongDetsen.name': 'King Trisong Detsen',
    'npc.trisongDetsen.title': '38th Tsenpo of the Tibetan Empire',
    'npc.samyeArtisan.name': 'Samye Master Artisan',
    'npc.samyeArtisan.title': 'Chief Builder of the Meru Mandala',
    'npc.guruVision.samye.name': 'Pure Vision of Guru Rinpoche',
    'npc.guruVision.samye.title': 'Wrathful Vajra Dancer of Hepo Ri',
    'npc.sevenTestedMen.name': 'Ba Salnang (Seven Tested Men)',
    'npc.sevenTestedMen.title': 'First Ordained Monks of Tibet',

    // ---------------------------------------------------------------- Quests
    'quest.ch4.foundation.title': 'Śāntarakṣita and the King',
    'quest.ch4.foundation.desc': 'Cross the Yarlung Tsangpo to the Samye construction camp and speak with Abbot Śāntarakṣita and King Trisong Detsen.',
    'quest.ch4.foundation.step.talk_shanta': 'Speak with Abbot Śāntarakṣita at the construction camp',
    'quest.ch4.foundation.step.talk_king': 'Speak with King Trisong Detsen about the night destruction',

    'quest.ch4.dayNight.title': 'Built by Day, Torn Down by Night',
    'quest.ch4.dayNight.desc': 'Gather stone and timber by day for the Master Artisan, and defend the four temple walls across 3 nights.',
    'quest.ch4.dayNight.step.survive_nights': 'Complete 3 Day-Build / Night-Defense cycles ({progress}/3)',

    'quest.ch4.hepori.title': 'Summit of Mount Hepo Ri',
    'quest.ch4.hepori.desc': 'Climb Mount Hepo Ri to the east and clear the 4-wave gauntlet alongside Guru Rinpoche’s wrathful Vajra Dance.',
    'quest.ch4.hepori.step.reach_summit': 'Ascend to the summit of Mount Hepo Ri',
    'quest.ch4.hepori.step.clear_gauntlet': 'Clear the 4-wave spirit gauntlet atop Mount Hepo Ri',

    'quest.ch4.pehar.title': 'King Pehar',
    'quest.ch4.pehar.desc': 'Confront and subdue Pehar Gyalpo, the three-faced six-armed spirit king riding a white snow lion north of Samye.',
    'quest.ch4.pehar.step.boss': 'Subdue Pehar Gyalpo, the Snow Lion King',

    'quest.ch4.samye.title': 'Samye — Inconceivable!',
    'quest.ch4.samye.desc': 'Witness Guru Rinpoche’s palm vision and the King’s exclamation "Samye!", walk one clockwise kora around the outer wall, and report to Śāntarakṣita.',
    'quest.ch4.samye.step.ending': 'Witness the "Samye!" palm-vision ceremony',
    'quest.ch4.samye.step.kora': 'Walk 1 clockwise kora around Samye Monastery’s outer perimeter wall',
    'quest.ch4.samye.step.talk_shanta': 'Speak with Abbot Śāntarakṣita to receive the Vajra Guru empowerment',

    // ---------------------------------------------------------------- Dialogues
    'dlg.ch4.shanta.foundation.1': 'Welcome, pilgrim. I am Śāntarakṣita of Nālandā, invited by [[codex:trisongDetsen]] to lay the foundation of [[codex:samye]] on the north bank of the Yarlung Tsangpo.',
    'dlg.ch4.shanta.foundation.2': 'Yet gentle philosophical discourse alone cannot pacify the fierce spirits of this valley. Whatever walls our masons raise by day, unseen hosts tear down by night.',
    'dlg.ch4.shanta.foundation.3': 'Only Padmasambhava’s wrathful Vajra skillful means can bind these spirits under oath. Speak now with the King beside me.',
    'dlg.ch4.shanta.dayNight': 'By day, gather stone from the riverside quarries and timber from the ferry landing; by night, guard the four perimeter walls against the Night Wall-Breakers.',
    'dlg.ch4.shanta.hepori': 'To the east rises [[codex:hepori]], the red hill where the Eight Classes gather. Ascend its summit and guard the Guru’s Vajra Dance!',
    'dlg.ch4.shanta.pehar': 'Though the hill spirits now haul stone for us by night, their sovereign [[codex:pehar]] still prowls north of the monastery on his white snow lion.',
    'dlg.ch4.shanta.samyeComplete.1': '"Samye — Inconceivable!" Just as the King exclaimed, [[codex:samyeName]] stands complete with its three-styled Utse Great Hall and 1,008 perimeter stupas.',
    'dlg.ch4.shanta.samyeComplete.2': 'With the ordination of the [[codex:sevenTestedMen]], the Three Jewels — Buddha, Dharma, and Sangha — now shine in Tibet! Receive the Twelve-Syllable Vajra Guru Mantra, and journey onward to Chimphu.',

    'dlg.ch4.king.foundation.1': 'Pilgrim! I am [[codex:trisongDetsen]], Tsenpo of Tibet. I have vowed to raise a living [[codex:samyeMandala]] modeled after Mount Meru and the Four Continents.',
    'dlg.ch4.king.foundation.2': 'Yet every night, spirits undo our daytime labor! Aid the Master Artisan in gathering stone and wood, and help us hold the walls across three nights!',
    'dlg.ch4.king.progress': 'Hold fast through three cycles of day and night, and soon we shall behold the monastery in all its glory!',
    'dlg.ch4.king.afterEnding': '"Samye!" The golden vision I beheld in the Guru’s palm now stands in stone and timber before us! Walk a clockwise kora around the outer wall to celebrate!',

    'dlg.ch4.artisan.day': 'We need 6 Stone and 4 Wood for today’s construction (plus any extra for walls breached last night). You can carry up to 4 items at a time from the riverside quarries and ferry timber pile!',
    'dlg.ch4.artisan.night': 'Night Wall-Breakers are marching on the four walls! Strike them to draw their attention — any wall segment that falls will require extra stone and wood tomorrow!',
    'dlg.ch4.artisan.done': 'Miraculous! Ever since Guru Rinpoche subdued the spirits on Mount Hepo Ri, the spirits themselves haul stone and timber for us by night!',

    'dlg.ch4.vision.hepori': '"HUM! Hear me, Tsen, Dü, and Gyalpo of Mount Hepo Ri! By this wrathful Vajra Dance I shatter your pride — enter the mandala and vow to build and guard Samye!"',
    'dlg.ch4.vision.samye': '"Behold in my palm, Great King — Mount Meru at the center, surrounded by the Four Continents, Sun and Moon chapels, and Four Colored Stupas!"',
    'dlg.ch4.seven.greeting': 'Tashi delek, pilgrim! We [[codex:sevenTestedMen]] have received full monastic ordination from Abbot Śāntarakṣita — the Sangha jewel now takes root in Tibet!',

    // Boss Pehar Oath
    'dlg.boss.pehar.oath.1': 'Pehar Gyalpo dismounts from his white snow lion; all three faces bow in unison as his six arms join in homage: "Alas, Lotus-Born Master! Your Vajra splendor has shattered my pride!"',
    'dlg.boss.pehar.oath.2': 'Guru Rinpoche touches the Vajra to his crown: "Pehar ([[codex:pehar]]), I appoint you Guardian of Samye’s Treasury (གཙུག་ལག་ཁང་གི་དཀོར་བདག). Guard the Three Jewels and never transgress this Samaya oath!"',
    'dlg.boss.pehar.oath.3': 'Pehar proclaims: "By your Vajra command, I vow to guard the monastery treasury and accompany all practitioners who invoke the Lotus-Born Guru!"',

    // Codex Entries
    'codex.entry.samye.title': 'Samye Monastery (བསམ་ཡས)',
    'codex.entry.samye.summary': 'Tibet’s first monastery complete with the Three Jewels of Buddha, Dharma, and Sangha',
    'codex.entry.samye.body': '[History] Samye Monastery (བསམ་ཡས, founded c. 775–779 CE) stands on the north bank of the Yarlung Tsangpo River in Dranang, Lhokha, at the foot of Mount Hepo Ri. Patronized by King Trisong Detsen, designed by Abbot Śāntarakṣita, and consecrated by Padmasambhava, it became Tibet’s first monastery with an ordained monastic community.\n[Legend] Local spirits tore down each day’s construction by night until Padmasambhava performed a wrathful Vajra Dance on Mount Hepo Ri, binding the spirits under oath so they carried stone and timber by night to complete the temple.',

    'codex.entry.shantarakshita.title': 'Abbot Śāntarakṣita',
    'codex.entry.shantarakshita.summary': 'Great Nālandā philosopher-abbot who ordained the first Tibetan monks',
    'codex.entry.shantarakshita.body': '[History] Śāntarakṣita (8th century CE), revered in Tibet as Khenpo Bodhisattva, was a celebrated scholar of Nālandā University who synthesized Madhyamaka and Yogācāra in his Tattvasaṃgraha. Invited by King Trisong Detsen, he designed Samye Monastery and ordained the Seven Tested Men in the Mūlasarvāstivāda lineage.\n[Legend] When local spirits responded to his teachings with lightning strikes and floods, Śāntarakṣita advised the King to invite the tantric master Padmasambhava to subdue the unruly forces of the land.',

    'codex.entry.trisongDetsen.title': 'King Trisong Detsen',
    'codex.entry.trisongDetsen.summary': '38th Tsenpo of Tibet and Dharma King who established Buddhism as the state religion',
    'codex.entry.trisongDetsen.body': '[History] King Trisong Detsen (r. 755–797 CE) was the 38th ruler of the Tibetan Empire and one of the Three Dharma Kings of Tibet. He invited Śāntarakṣita and Padmasambhava, built Samye Monastery, sponsored vast translation bureaus, and issued the Samye Pillar Edict establishing Buddhism as Tibet’s state religion.\n[Legend] Revered as an emanation of Mañjuśrī, he forms the "Master, Abbot, and King" triad (Khen-Lob-Chö-Sum) alongside Śāntarakṣita and Padmasambhava.',

    'codex.entry.samyeMandala.title': 'The 3D Mandala of Samye',
    'codex.entry.samyeMandala.summary': 'Architectural cosmogram of Mount Meru, Four Continents, Sun & Moon, and Four Colored Stupas',
    'codex.entry.samyeMandala.body': '[History] Modeled on Odantapurī in India, Samye Monastery is laid out as a three-dimensional Buddhist mandala: the central three-story Utse Great Hall represents Mount Meru (combining Tibetan, Chinese, and Indian architectural stories), surrounded by the Four Continents and Eight Sub-continents temples, Sun and Moon chapels, Four Colored Stupas (White SE, Red SW, Black NW, Green NE), and a circular perimeter wall topped by 1,008 mini-stupas.\n[Legend] Walking a clockwise kora around the circular iron-mountain wall carries the merit of circumambulating the entire cosmos.',

    'codex.entry.hepori.title': 'Mount Hepo Ri (ཧས་པོ་རི)',
    'codex.entry.hepori.summary': 'Sacred hill east of Samye where Guru Rinpoche danced to subdue the Eight Classes',
    'codex.entry.hepori.body': '[History] Mount Hepo Ri rises immediately east of Samye Monastery overlooking the Yarlung Tsangpo plain. One of the four sacred mountains of Central Tibet, its summit remains an active site for sang smoke offerings and prayer flags.\n[Legend] Atop Hepo Ri, Padmasambhava performed the wrathful Vajra Dance, subjugating the Tsen, Dü, and Gyalpo spirits who had been demolishing Samye’s foundations each night.',

    'codex.entry.eightClasses.title': 'The Eight Classes of Spirits (Lha Srin sDe Brgyad)',
    'codex.entry.eightClasses.summary': 'Indigenous Tibetan and Buddhist spirit hosts bound under oath as Dharma protectors',
    'codex.entry.eightClasses.body': '[History] The Eight Classes of Gods and Spirits (ལྷ་སྲིན་སྡེ་བརྒྱད) classify the powerful worldly spirits of Tibetan cosmology and ritual dance (Cham).\n[Legend] They include the white-robed Gyalpo king-spirits, red-armored Tsen cliff-riders, black smoky Dü demons, Za planetary spirits, Mamo fierce goddesses, Klu nāgas, Nyen mountain spirits, and Sadag earth lords — all bound by Guru Rinpoche to protect the Dharma.',

    'codex.entry.pehar.title': 'Pehar Gyalpo (པེ་ཧར་རྒྱལ་པོ)',
    'codex.entry.pehar.summary': 'Three-faced six-armed spirit king on a white snow lion, Guardian of Samye’s Treasury',
    'codex.entry.pehar.body': '[History] Pehar Gyalpo is a major worldly protector in Tibetan Buddhism, originally associated with northern Hor traditions and installed at Samye Monastery as chief guardian of its treasury, later linked with the Nechung Oracle tradition.\n[Legend] Depicted in white robes with three faces and six arms, wearing a domed cane hat and riding a white snow lion, Pehar was bound under oath by Padmasambhava as Kor-dak (དཀོར་བདག), Guardian of Samye’s Treasury.',

    'codex.entry.samyeName.title': 'Origin of the Name "Samye" (བསམ་ཡས)',
    'codex.entry.samyeName.summary': '"Inconceivable!" — King Trisong Detsen’s exclamation upon seeing the Guru’s palm vision',
    'codex.entry.samyeName.body': '[History] The Tibetan name "Samye" (བསམ་ཡས, bsam yas) means "Beyond Thought" or "Inconceivable", recorded in early chronicles such as the Testament of Ba (dBa\' bzhed).\n[Legend] When King Trisong Detsen asked what the finished monastery would look like, Guru Rinpoche conjured a luminous miniature of the entire complex above his palm. Astonished, the King cried out "Samye!" ("Inconceivable!"), giving the monastery its enduring name.',

    'codex.entry.sevenTestedMen.title': 'The Seven Tested Men (Sad mi mi bdun)',
    'codex.entry.sevenTestedMen.summary': 'The first seven Tibetans ordained as Buddhist monks at Samye Monastery',
    'codex.entry.sevenTestedMen.body': '[History] The Seven Tested Men (སད་མི་མི་བདུན) — including Ba Salnang (Yeshe Wangpo), Vairotsana, and Pagor Vairotsana’s peers — were seven young Tibetan nobles ordained by Śāntarakṣita at Samye c. 779 CE to test whether Tibetans could uphold the full monastic Vinaya.\n[Legend] Their success established the Sangha Jewel in Tibet and produced great translators and tantric masters among Guru Rinpoche’s twenty-five heart disciples.',
  },
};

i18n.register(CH4_STRINGS);
export default CH4_STRINGS;
