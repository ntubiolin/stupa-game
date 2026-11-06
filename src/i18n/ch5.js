/**
 * Chapter 5 (Chimphu Hermitage & Terma Realm) — i18n Strings (`src/i18n/ch5.js`) — Issue #36
 *
 * Registers Traditional Chinese (`zh-Hant` / `zh`) and English (`en`) translations for:
 *   - Map names, subtitles, waypoints, and Chapter 5 intro card (`ch5.intro.*`)
 *   - Chimphu hub interactables (Amrita Spring, Terma Stone Gate, Scenic Overlook)
 *   - Terma Procedural Dungeon UI (Tier Selector, HUD, Room templates, Crystals, Gate of Descent)
 *   - Boss `termaGuardian` (`守藏者`) & Terma Chest (`伏藏匣`) rewards
 *   - NPCs (`yesheTsogyal`, `chimphuRetreatant1`, `chimphuRetreatant2`, `guruVision.chimphu`)
 *   - Quests (`ch5.tsogyal`, `ch5.firstTerma`, `ch5.epilogue`)
 *   - Dialogues (`dlg.ch5.*` including `oldLama` epilogue at Boudhanath Stupa)
 *   - 4 Codex entries (`chimphu`, `yesheTsogyal`, `terma`, `terton`)
 *   - Ending Credits overlay (`credits.*`)
 */
import { i18n } from '../i18n.js';

const ZH_HANT = {
  // ---------------------------------------------------------------- Map & Waypoint & Intro
  'map.chimphu': '青朴修行地',
  'map.chimphu.subtitle': '桑耶東北山谷・蓮師與措嘉閉關巖洞群',
  'map.terma': '伏藏秘境',
  'map.terma.subtitle': '深巖手印石窟・蓮師埋藏之法寶試煉',
  'waypoint.chimphu.name': '青朴山',
  'waypoint.chimphu.region': '終章・青朴閉關巖',
  'waypoint.terma.name': '伏藏秘境',
  'waypoint.terma.region': '終章・青朴深處',

  'ch5.intro.title': '終章：青朴修行地・伏藏秘境',
  'ch5.intro.location': '桑耶寺東北・納瑞山腰青朴巖洞群',
  'ch5.intro.era': '吐蕃赤松德贊時期（西元八世紀末）',
  'ch5.intro.narration':
    '桑耶大寺既成，蓮花生大士與空行主尊益西措嘉退隱青朴深谷，將無數伏藏深埋於巖石、湖泊與虛空，靜待未來有緣之伏藏師開啟。',

  'ch5.banner.complete': '終章 完成',
  'ch5.banner.complete.kicker': '終章 完成',
  'ch5.banner.complete.title': '「終章 完成：伏藏仍在等待有緣人」',
  'ch5.banner.complete.sub': '四子發願之緣起已圓滿，伏藏秘境（Tier 1–10+）將持續開放挑戰',

  // ---------------------------------------------------------------- Chimphu Hub & Dungeon Prompts / Toasts
  'prompt.amritaSpring': '按 [E] 飲用青朴甘露泉（補滿氣血、真氣與甘露丸）',
  'prompt.chimphuOverlook': '按 [E] 遠眺雅魯藏布江與桑耶大寺全景',
  'prompt.termaGate': '按 [E] 開啟伏藏秘境石門（選擇秘境層級 Tier）',
  'prompt.termaCrystal': '按 [E] 或施法破開伏藏晶石',
  'prompt.gateOfDescent': '按 [E] 踏入下降之門（前往第 {nextFloor} 層）',
  'prompt.gateOfDescentLocked': '下降之門尚未開啟（需超度本層 70% 魔障：{pct}%）',
  'prompt.termaAltar': '按 [E] 喚醒伏藏守藏者（第 3 層試煉）',
  'prompt.termaChest': '按 [E] 開啟伏藏匣領取傳承法寶',
  'prompt.termaReturnGate': '按 [E] 經由回返之門返回青朴修行地',

  'toast.amritaSpringRefilled': '青朴甘露泉清涼入心：氣血、真氣與甘露丸已完全恢復！',
  'toast.chimphuOverlook': '俯瞰山下：雅魯藏布江水蜿蜒如哈達，桑耶大寺三層金頂在雲海間熠熠生輝。',
  'toast.termaCrystalBroken': '破開伏藏晶石！獲得綠松石 +{turquoise}',
  'toast.tertonFindProc': '【伏藏師之戒】感應巖藏密印，額外掘出高階法器！',
  'toast.gateOfDescentUnlocked': '本層魔障已淨化七成，下降之門綻放金青光芒！',
  'toast.gateOfDescentLocked': '本層尚有執念未化（已淨化 {pct}% / 70%），下降之門緊閉。',
  'toast.termaFloorEntered': '進入伏藏秘境 Tier {tier}・第 {floor}/3 層（Seed: {seed}）',
  'toast.termaCleared': '通過守藏者考驗！伏藏匣已開啟（已解鎖 Tier {nextTier}）',
  'toast.termaSpeedBonus': '【神速掘藏】10 分鐘內通關！額外獲得 2 件伏藏獎勵與綠松石！',
  'toast.termaEssenceGained': '獲得「伏藏精華」×{count}！',
  'toast.termaFainted': '於伏藏秘境力竭昏迷，由空行護法送返青朴修行地（已拾取之法器皆妥善保留）。',

  // ---------------------------------------------------------------- Terma Tier Selector Modal & HUD
  'dungeon.ui.title': '伏藏秘境・層級選擇',
  'dungeon.ui.subtitle': '選擇欲進入之伏藏秘境難度（Tier 1 – {maxTier}）。每層級皆為 3 層隨機相連石窟。',
  'dungeon.ui.highestCleared': '最高已通關層級：Tier {tier}',
  'dungeon.ui.tierLabel': '第 {tier} 階（Tier {tier}）',
  'dungeon.ui.monsterLevel': '魔障等級 Lv.{level}',
  'dungeon.ui.hpScale': '生命倍率 ×{mult}',
  'dungeon.ui.eliteCount': '每層精英 {elites} 組（最多 {affixes} 詞綴）',
  'dungeon.ui.termaRate': '伏藏掉率權重 +{bonus}%',
  'dungeon.ui.bossAffixes': '守藏者詞綴：{count} 個',
  'dungeon.ui.seedLabel': '秘境種子（選填，留空則隨機生成）',
  'dungeon.ui.seedPlaceholder': '例如：123',
  'dungeon.ui.enterBtn': '踏入秘境',
  'dungeon.ui.closeBtn': '取消 [Esc]',
  'dungeon.hud.header': '伏藏秘境 T{tier} · 第 {floor}/3 層',
  'dungeon.hud.progress': '淨化進度：{liberated}/{total}（{pct}%）',
  'dungeon.hud.gateUnlocked': '下降之門已開啟',
  'dungeon.hud.bossFloor': '守藏者聖殿',
  'dungeon.hud.elapsed': '耗時 {time}',

  // Room templates
  'dungeon.room.start': '入口石室',
  'dungeon.room.hall': '大廳',
  'dungeon.room.colonnade': '柱廊',
  'dungeon.room.pool': '甘露水池',
  'dungeon.room.corridor': '窄道',
  'dungeon.room.mandala': '壇城室',
  'dungeon.room.vein': '伏藏礦脈',
  'dungeon.room.exit': '下降之門石室',
  'dungeon.room.boss': '守藏者大殿',

  // ---------------------------------------------------------------- Boss: Terma Guardian (`守藏者`)
  'boss.termaGuardian.name': '守藏者',
  'boss.termaGuardian.title': '蓮師伏藏石像護法・試煉伏藏師之金剛衛',
  'boss.termaGuardian.oath':
    '「善哉！汝心具足悲智與金剛定力，實乃蓮師授記之伏藏師（Tertön）。此巖藏法寶，今付囑於汝！」',

  // ---------------------------------------------------------------- NPCs
  'npc.yesheTsogyal': '益西措嘉',
  'npc.yesheTsogyal.name': '益西措嘉',
  'npc.yesheTsogyal.title': '卡千公主・伏藏之母・智慧空行主尊',
  'npc.chimphuRetreatant1': '青朴閉關行者・洛桑',
  'npc.chimphuRetreatant1.name': '青朴閉關行者・洛桑',
  'npc.chimphuRetreatant1.title': '巖洞禪修僧',
  'npc.chimphuRetreatant2': '青朴閉關行者・曲吉',
  'npc.chimphuRetreatant2.name': '青朴閉關行者・曲吉',
  'npc.chimphuRetreatant2.title': '持明瑜伽行者',
  'npc.guruVision.chimphu': '蓮師淨相',
  'npc.guruVision.chimphu.name': '蓮師淨相',
  'npc.guruVision.chimphu.title': '烏金第二佛・青朴巖洞傳法尊',

  // ---------------------------------------------------------------- Quests
  // C5-1: ch5.tsogyal
  'quest.ch5.tsogyal.title': '益西措嘉',
  'quest.ch5.tsogyal.desc':
    '踏入桑耶東北群山環抱的青朴修行地，拜見正在巖洞前整理黃紙伏藏經卷的空行主尊益西措嘉。',
  'quest.ch5.tsogyal.step.talk_tsogyal': '在青朴修行地與益西措嘉交談',

  // C5-2: ch5.firstTerma
  'quest.ch5.firstTerma.title': '第一部伏藏',
  'quest.ch5.firstTerma.desc':
    '益西措嘉指引你前往北崖的伏藏秘境石門。進入第一層級（Tier 1）的伏藏秘境，突破三層石窟試煉並通過守藏者的考驗，取回第一部伏藏。',
  'quest.ch5.firstTerma.step.clear_terma_1': '通過伏藏秘境 Tier 1 第三層守藏者考驗',
  'quest.ch5.firstTerma.step.report_tsogyal': '返回青朴修行地向益西措嘉回報',

  // C5-3: ch5.epilogue
  'quest.ch5.epilogue.title': '回到起點',
  'quest.ch5.epilogue.desc':
    '青朴巖洞的蓮師淨相漸漸融入虛空，你的意識自跨越數百里與千年的大圓滿禪觀中甦醒，回到尼泊爾博達哈大佛塔下。向老喇嘛訴說這場朝聖之旅。',
  'quest.ch5.epilogue.step.talk_old_lama': '返回博達哈大佛塔與老喇嘛交談',

  // ---------------------------------------------------------------- Dialogues
  // Yeshe Tsogyal — C5-1 Intro (`ch5.yesheTsogyal.intro`)
  'dlg.ch5.tsogyal.intro.1':
    '遠道而來的行者，歡迎來到[[codex:chimphu]]。山下桑耶大寺的鐘鼓聲雖已遠去，但此處松風與巖泉皆在演說妙法。',
  'dlg.ch5.tsogyal.intro.2':
    '我是[[codex:yesheTsogyal]]。上師蓮花生大士深知末法眾生福報淺薄，故命我以空行符號將無數教法抄錄於黃紙卷上，作為[[codex:terma]]深埋於青朴的巖壁、湖泊與虛空之中。',
  'dlg.ch5.tsogyal.intro.3':
    '唯有具足清淨發心與宿世願力的[[codex:terton]]，方能穿過北崖石門後的重重試煉，在守藏者面前開啟伏藏匣。你願意踏入石門，接受第一場伏藏試煉嗎？',
  'dlg.ch5.tsogyal.intro.choice.accept': '「我願踏入伏藏秘境，領受守藏者的考驗。」',
  'dlg.ch5.tsogyal.intro.choice.ask': '「請問何謂伏藏（Terma）與伏藏師（Tertön）？」',
  'dlg.ch5.tsogyal.intro.askReply':
    '[[codex:terma]]分為地伏藏、水伏藏與心意伏藏。大士以大神變將法寶封存，並指派護法守藏者看守；當時機成熟，授記的[[codex:terton]]便會循著因緣前來掘藏，令教法歷久彌新。',

  // Yeshe Tsogyal — C5-2 Active (`ch5.yesheTsogyal.active`)
  'dlg.ch5.tsogyal.active.1':
    '北崖深處的「伏藏秘境石門」已經為你敞開。若氣血或甘露丸不足，可先在西側的青朴甘露泉飲水調息，再進入 Tier 1 秘境完成三層試煉。',
  'dlg.ch5.tsogyal.active.choice.openTier': '「請為我開啟伏藏秘境層級選擇。」',
  'dlg.ch5.tsogyal.active.choice.ok': '「我這就前往北崖石門。」',

  // Yeshe Tsogyal — C5-2 Report (`ch5.yesheTsogyal.report`)
  'dlg.ch5.tsogyal.report.1':
    '你身上的伏藏晶光澄澈而溫暖……守藏者已經向你屈膝致敬，將第一部伏藏法寶交託予你了！',
  'dlg.ch5.tsogyal.report.2':
    '從尼泊爾博達哈大佛塔下養雞女四子的發願，到帕平楊列雪的甘露之雨、芒域貢塘山口的十二丹瑪、雅魯藏布江畔的雅拉香波，乃至桑耶大寺的建立——你已親歷了上師入藏弘法的完整足跡。',
  'dlg.ch5.tsogyal.report.3':
    '聽，遠方博達哈大佛塔的風鈴聲正在呼喚你。當你準備好時，不妨回到最初的起點，向那位引導你入定觀修的老喇嘛道一聲平安。而青朴的伏藏秘境（Tier 1–10+）將永遠為你敞開。',
  'dlg.ch5.tsogyal.report.choice.returnStupa': '「隨順因緣，立即返回博達哈大佛塔。」',
  'dlg.ch5.tsogyal.report.choice.stay': '「我會先在青朴流連片刻，再返回佛塔。」',

  // Yeshe Tsogyal — Post-epilogue / Endgame (`ch5.yesheTsogyal.after`)
  'dlg.ch5.tsogyal.after.1':
    '伏藏之門無有窮盡。每一次踏入石門，巖窟的格局與守藏者的法相皆隨因緣流轉。願你在無盡的修持中利益一切有情。',
  'dlg.ch5.tsogyal.after.choice.openTier': '「開啟伏藏秘境（選擇 Tier 層級）」',
  'dlg.ch5.tsogyal.after.choice.leave': '「頂禮空行母，後會有期。」',

  // Guru Vision in Chimphu (`ch5.guruVision`)
  'dlg.ch5.guruVision.1':
    '「奇哉！過去、現在、未來三世諸佛之密意，盡皆攝於自心光明之中。山河大地即是壇城，行住坐臥無非禪定。」',
  'dlg.ch5.guruVision.2':
    '「吾雖將離吐蕃前往西南羅剎洲調伏剛強，然於每月初十，必乘日光與彩虹重返人間。凡具信祈請者，蓮花生從未遠離。」',
  'dlg.ch5.guruVision.choice.bow': '「頂禮烏金第二佛（領受蓮師加持）」',

  // Retreatant 1 & 2 (`ch5.retreatant1`, `ch5.retreatant2`)
  'dlg.ch5.retreatant1.1':
    '在青朴山閉關三年，每日清晨都能聽見上方巖洞傳來空行母誦持金剛歌的梵音，令人煩惱頓消。',
  'dlg.ch5.retreatant1.choice.ok': '「隨喜行者精進。」',
  'dlg.ch5.retreatant2.1':
    '從南側的景觀台向下望去，可以看見整座桑耶大寺與雅魯藏布江。動靜一如，世間與出世間本無二致。',
  'dlg.ch5.retreatant2.choice.ok': '「合十致禮。」',

  // Old Lama at Boudhanath — C5-3 Epilogue (`ch5.oldLama.epilogue`)
  'dlg.ch5.oldLama.epilogue.1':
    '（你緩緩睜開雙眼，博達哈大佛塔洁白巨大的覆鉢與智慧眼在陽光下靜靜注視著眾生，酥油燈的暖香依舊縈繞鼻端。）',
  'dlg.ch5.oldLama.epilogue.2':
    '呵呵，行者，你從甚深禪觀中醒來了。看你眉宇間湛然寂靜，必是在定中走過了大士自尼泊爾入吐蕃的漫漫長路，亦見證了夏絨卡秀大佛塔下四子發願的宿世因果。',
  'dlg.ch5.oldLama.epilogue.3':
    '建寺之王赤松德贊、大堪布寂護、蓮花生大士與送信使者——昔日於佛塔前立下的宏願，化作了雪域千年的法炬。而大士與益西措嘉埋藏的無數伏藏，至今仍在山水與心識深處，伏藏仍在等待有緣人。',
  'dlg.ch5.oldLama.epilogue.choice.complete': '「感恩老喇嘛慈悲指引，願以此功德迴向一切有情。」',

  // Old Lama at Boudhanath — Post-Game (`ch5.oldLama.done`)
  'dlg.ch5.oldLama.done.1':
    '佛塔常在，微風常吹。你可以隨時透過傳送網路重返青朴修行地挑戰更高層級的伏藏秘境，或在佛塔下安靜繞塔、點燈、翻閱圖鑑。',
  'dlg.ch5.oldLama.done.choice.credits': '「重溫結尾致謝與文獻名錄（Ending Credits）」',
  'dlg.ch5.oldLama.done.choice.close': '「合十頂禮。」',

  // ---------------------------------------------------------------- Codex Entries (4)
  'codex.chimphu.title': '青朴修行地（Chimphu Hermitage）',
  'codex.chimphu.body': `<p><strong>【史實】</strong>青朴修行地（藏文：མཆིམས་ཕུ་，Wylie：<em>mchims phu</em>）位於西藏山南地區桑耶寺東北方約十餘公里的納瑞山（Mount Nari）半山腰，海拔約四千三百公尺。山谷三面環山，面向寬闊的雅魯藏布江谷地，氣候較藏北溫潤，松柏與杜鵑叢生，自吐蕃時期起便是西藏最核心的實修閉關聖地。</p>
<p>據歷史與藏傳文獻記載，西元八世紀桑耶寺落成後，蓮花生大士、益西措嘉、赤松德贊與桑耶七覺士曾在此處的巖洞群（相傳有百餘座修行洞，核心為「哲古洞」Drakmar Keutsang）中閉關修持並傳授大圓滿與八大法行。後世無數高僧大德如龍欽巴（Longchenpa）、吉美林巴（Jigme Lingpa）亦皆在青朴長期閉關證悟。</p>`,

  'codex.yesheTsogyal.title': '益西措嘉（Yeshe Tsogyal）',
  'codex.yesheTsogyal.body': `<p><strong>【史實人物，生平細節多為傳說】</strong>益西措嘉（藏文：ཡེ་ཤེས་མཚོ་རྒྱལ་，Wylie：<em>ye shes mtsho rgyal</em>，約西元八世紀），出身吐蕃卡千（Kharchen）貴族，又稱卡千公主，被藏傳佛教寧瑪派尊為「智慧空行母」與「伏藏之母」。</p>
<p>根據傳記文獻，她原為吐蕃贊普赤松德贊之妃，後由贊普供養予蓮花生大士作為法侶與主要弟子。她在帕平阿修羅洞、青朴巖洞及門莫扎西雪山等地苦修證果，具備過目不忘的總持記憶力，將蓮師在藏地宣說的無數密續、口訣與伏藏教法以空行文字（Dakini script）記錄整理，並協助埋藏於全藏各地的山巖、湖泊與寺廟中，是蓮師教法得以流傳後世的最重要集結者。</p>`,

  'codex.terma.title': '伏藏傳統（Terma Tradition）',
  'codex.terma.body': `<p><strong>【史實：宗教傳統的存在；內容的來歷屬信仰】</strong>伏藏（藏文：གཏེར་མ་，Wylie：<em>gter ma</em>，意為「珍寶」或「埋藏的法寶」）是藏傳佛教（特別是寧瑪派與苯教）極具特色的經典傳承制度。作為一種歷史與宗教現象，伏藏文獻自西元十至十一世紀起在西藏大量出現，並持續發展至今。</p>
<p>在傳統信仰敘事中，蓮花生大士與益西措嘉預見未來不同時代眾生的根器與劫難，遂將特定法門、佛像、法器與黃紙經卷（Shogser）封存於山巖、聖湖、虛空（地伏藏 <em>sa gter</em>）或大弟子之光明心識深處（意伏藏 <em>dgongs gter</em>），並交由伏藏護法（Terbdag / 守藏者）守護，待因緣成熟時由授記之伏藏師取出弘揚。</p>`,

  'codex.terton.title': '伏藏師（Tertön）',
  'codex.terton.body': `<p><strong>【史實與傳統】</strong>伏藏師（藏文：གཏེར་སྟོན་，Wylie：<em>gter ston</em>，意為「揭示伏藏寶藏之人」）是指在藏傳佛教歷史上發掘、破譯並傳播伏藏教法的修行者。在信仰傳統中，伏藏師多被視為蓮師二十五王臣弟子的轉世。</p>
<p>歷史上著名的伏藏師超過百位，其中最受尊崇者為「五王伏藏師」（如娘・尼瑪沃瑟 Nyangral Nyima Özer、古汝確旺 Guru Chöwang、多傑林巴 Dorje Lingpa、貝瑪林巴 Pema Lingpa、蔣揚欽哲旺波 Jamyang Khyentse Wangpo）與「林巴」（Lingpa）稱號持有者。他們發掘的文獻（如《西藏度亡經／中陰聞教得度》、《蓮師遺教》等）對西藏宗教、文學、醫學與藝術史產生了深遠影響。</p>`,

  // ---------------------------------------------------------------- Ending Credits Overlay
  'credits.mantra': 'ཨོཾ་ཨཱཿ་ཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ',
  'credits.title': '博達哈大佛塔・蓮師入藏朝聖行紀',
  'credits.subtitle': 'The Great Stupa of Jarung Khashor & The Footsteps of Padmasambhava',
  'credits.epigraph': '「過去諸佛已說，未來諸佛當說，現在諸佛今說——諸惡莫作，眾善奉行，自淨其意，是諸佛教。」',
  'credits.section.journey': '朝聖篇章與聖地巡禮',
  'credits.ch0': '序章・尼泊爾加德滿都：博達哈大佛塔（夏絨卡秀）・養雞女母子建塔與四子發願',
  'credits.ch1': '第一章・尼泊爾帕平：楊列雪與阿修羅洞・普巴金剛調伏龍族大旱',
  'credits.ch2': '第二章・藏尼邊境：芒域貢塘山口・雪山折伏十二丹瑪護法女神',
  'credits.ch3': '第三章・雅魯藏布江谷地：雅隆香波雪山・金剛手威光調伏白犛山神',
  'credits.ch4': '第四章・山南紅山：海波日山與桑耶大寺・三面六臂白哈爾與須彌曼荼羅落成',
  'credits.ch5': '終章・納瑞山腰：青朴修行地與伏藏秘境・益西措嘉埋藏萬世法炬',
  'credits.section.figures': '主要歷史與傳承人物',
  'credits.figures.list':
    '蓮花生大士（Padmasambhava / Guru Rinpoche） · 益西措嘉（Yeshe Tsogyal） · 寂護大師（Śāntarakṣita） · 赤松德贊（King Trisong Detsen） · 桑耶七覺士（Seven Tested Men） · 博達哈老喇嘛',
  'credits.section.stats': '行者修行紀錄',
  'credits.stats.codex': '圖鑑收集進度：{unlocked} / {total}（{pct}%）',
  'credits.stats.termaTier': '伏藏秘境最高通關：Tier {tier}',
  'credits.stats.level': '修行者境界：Lv.{level}',
  'credits.section.disclaimer': '史實與傳說聲明（Historical & Legendary Note）',
  'credits.disclaimer.body':
    '本作的故事取材自蓮師傳記（如《蓮花生大士本生傳・銅殿》、《夏絨卡秀大佛塔史》）與藏傳佛教歷史文獻，部分神變與降伏情節屬宗教傳說與信仰敘事。遊戲內所有圖鑑條目皆明確標註【史實】與【傳說】，並附上外部學術與文獻參考連結，祈願玩家在遊歷山河之餘，亦能體會喜馬拉雅文化之深厚底蘊。',
  'credits.section.sources': '主要文獻與數位典藏參考（Primary Reference Sources）',
  'credits.closeBtn': '返回佛塔繼續修行 [Esc / 關閉]',
};

const EN = {
  // ---------------------------------------------------------------- Map & Waypoint & Intro
  'map.chimphu': 'Chimphu Hermitage',
  'map.chimphu.subtitle': 'Northeast of Samye · Meditation Caves of Guru Rinpoche & Yeshe Tsogyal',
  'map.terma': 'The Terma Realm',
  'map.terma.subtitle': 'Sealed Handprint Grottoes · Trial of the Hidden Treasures',
  'waypoint.chimphu.name': 'Chimphu Hermitage',
  'waypoint.chimphu.region': 'Finale · Chimphu Caves',
  'waypoint.terma.name': 'Terma Realm',
  'waypoint.terma.region': 'Finale · Inner Grottoes',

  'ch5.intro.title': 'Finale: Chimphu Hermitage · The Terma Realm',
  'ch5.intro.location': 'Mount Nari Slopes · Chimphu Cave Complex Northeast of Samye',
  'ch5.intro.era': 'Reign of King Trisong Detsen (Late 8th Century CE)',
  'ch5.intro.narration':
    'With glorious Samye Monastery complete, Padmasambhava and the Wisdom Dakini Yeshe Tsogyal withdrew to the high mountain caves of Chimphu, concealing countless Terma treasures in rock, lake, and mind-stream for future Tertöns to reveal.',

  'ch5.banner.complete': 'Finale Complete',
  'ch5.banner.complete.kicker': 'Finale Complete',
  'ch5.banner.complete.title': '“Finale Complete: The Terma Still Await Those With Affinity”',
  'ch5.banner.complete.sub': 'The aspirations of the four sons are fulfilled; the Terma Realm (Tier 1–10+) remains open forever',

  // ---------------------------------------------------------------- Chimphu Hub & Dungeon Prompts / Toasts
  'prompt.amritaSpring': 'Press [E] to drink from the Chimphu Amrita Spring (Restore HP, MP & Amrita Pills)',
  'prompt.chimphuOverlook': 'Press [E] to gaze out over the Yarlung Tsangpo & Samye Monastery',
  'prompt.termaGate': 'Press [E] to open the Terma Realm Stone Gate (Select Tier)',
  'prompt.termaCrystal': 'Press [E] or cast a skill to shatter the Terma Crystal',
  'prompt.gateOfDescent': 'Press [E] to enter the Gate of Descent (Proceed to Floor {nextFloor})',
  'prompt.gateOfDescentLocked': 'Gate of Descent Locked (Liberate 70% of floor enemies: {pct}%)',
  'prompt.termaAltar': 'Press [E] to awaken the Terma Guardian (Floor 3 Trial)',
  'prompt.termaChest': 'Press [E] to open the Terma Chest and claim the hidden treasures',
  'prompt.termaReturnGate': 'Press [E] to return to Chimphu Hermitage',

  'toast.amritaSpringRefilled': 'Pure waters of Chimphu restore your HP, MP, and Amrita Pills to full!',
  'toast.chimphuOverlook': 'Below the cliffs, the Yarlung Tsangpo winds like a silk khata around the golden roofs of Samye Monastery.',
  'toast.termaCrystalBroken': 'Terma Crystal shattered! Turquoise +{turquoise}',
  'toast.tertonFindProc': "[Tertön's Signet Ring] resonated with the rock seal—an extra high-tier relic emerged!",
  'toast.gateOfDescentUnlocked': '70% of floor obstacles liberated! The Gate of Descent blazes with golden-turquoise light!',
  'toast.gateOfDescentLocked': 'Obstacles remain on this floor ({pct}% / 70% liberated). The Gate of Descent stays sealed.',
  'toast.termaFloorEntered': 'Entered Terma Realm Tier {tier} · Floor {floor}/3 (Seed: {seed})',
  'toast.termaCleared': 'Trial of the Terma Guardian passed! Terma Chest unlocked (Tier {nextTier} unlocked)',
  'toast.termaSpeedBonus': '[Swift Revelation] Cleared within 10 minutes! +2 bonus relics and extra Turquoise!',
  'toast.termaEssenceGained': 'Obtained Terma Essence ×{count}!',
  'toast.termaFainted': 'Exhausted in the Terma Realm, you were carried back to Chimphu Hermitage (all collected items kept).',

  // ---------------------------------------------------------------- Terma Tier Selector Modal & HUD
  'dungeon.ui.title': 'The Terma Realm · Tier Selection',
  'dungeon.ui.subtitle': 'Choose a Terma Realm tier (Tier 1 – {maxTier}). Each run generates 3 connected grotto floors.',
  'dungeon.ui.highestCleared': 'Highest Cleared Tier: Tier {tier}',
  'dungeon.ui.tierLabel': 'Tier {tier}',
  'dungeon.ui.monsterLevel': 'Monster Level Lv.{level}',
  'dungeon.ui.hpScale': 'HP Multiplier ×{mult}',
  'dungeon.ui.eliteCount': '{elites} Elite Packs / Floor (up to {affixes} affixes)',
  'dungeon.ui.termaRate': 'Terma Drop Weight +{bonus}%',
  'dungeon.ui.bossAffixes': 'Guardian Affixes: {count}',
  'dungeon.ui.seedLabel': 'Run Seed (Optional — leave blank for random)',
  'dungeon.ui.seedPlaceholder': 'e.g. 123',
  'dungeon.ui.enterBtn': 'Enter Terma Realm',
  'dungeon.ui.closeBtn': 'Cancel [Esc]',
  'dungeon.hud.header': 'Terma Realm T{tier} · Floor {floor}/3',
  'dungeon.hud.progress': 'Liberated: {liberated}/{total} ({pct}%)',
  'dungeon.hud.gateUnlocked': 'Gate of Descent Unlocked',
  'dungeon.hud.bossFloor': 'Sanctum of the Terma Guardian',
  'dungeon.hud.elapsed': 'Time {time}',

  // Room templates
  'dungeon.room.start': 'Entry Sanctum',
  'dungeon.room.hall': 'Great Hall',
  'dungeon.room.colonnade': 'Colonnade',
  'dungeon.room.pool': 'Amrita Pool',
  'dungeon.room.corridor': 'Narrow Passage',
  'dungeon.room.mandala': 'Mandala Chamber',
  'dungeon.room.vein': 'Crystal Vein',
  'dungeon.room.exit': 'Gate of Descent Chamber',
  'dungeon.room.boss': 'Guardian Sanctum',

  // ---------------------------------------------------------------- Boss: Terma Guardian (`守藏者`)
  'boss.termaGuardian.name': 'The Terma Guardian',
  'boss.termaGuardian.title': 'Ancient Stone Sentinel of Padmasambhava’s Hidden Treasures',
  'boss.termaGuardian.oath':
    '“Well done! Your compassion, wisdom, and vajra samadhi prove you a true Tertön foretold by the Lotus-Born. Receive now the sealed treasure of this grotto!”',

  // ---------------------------------------------------------------- NPCs
  'npc.yesheTsogyal': 'Yeshe Tsogyal',
  'npc.yesheTsogyal.name': 'Yeshe Tsogyal',
  'npc.yesheTsogyal.title': 'Princess of Kharchen · Mother of Terma · Wisdom Dakini',
  'npc.chimphuRetreatant1': 'Chimphu Hermit Lobsang',
  'npc.chimphuRetreatant1.name': 'Chimphu Hermit Lobsang',
  'npc.chimphuRetreatant1.title': 'Cave Meditator',
  'npc.chimphuRetreatant2': 'Chimphu Hermit Chökyi',
  'npc.chimphuRetreatant2.name': 'Chimphu Hermit Chökyi',
  'npc.chimphuRetreatant2.title': 'Vidyadhara Yogi',
  'npc.guruVision.chimphu': 'Vision of Guru Rinpoche',
  'npc.guruVision.chimphu.name': 'Vision of Guru Rinpoche',
  'npc.guruVision.chimphu.title': 'Second Buddha of Oddiyana · Lord of Chimphu',

  // ---------------------------------------------------------------- Quests
  // C5-1: ch5.tsogyal
  'quest.ch5.tsogyal.title': 'Yeshe Tsogyal',
  'quest.ch5.tsogyal.desc':
    'Ascend to the mountain retreat of Chimphu northeast of Samye and speak with Wisdom Dakini Yeshe Tsogyal as she transcribes yellow-scroll Terma texts.',
  'quest.ch5.tsogyal.step.talk_tsogyal': 'Speak with Yeshe Tsogyal at Chimphu Hermitage',

  // C5-2: ch5.firstTerma
  'quest.ch5.firstTerma.title': 'The First Terma',
  'quest.ch5.firstTerma.desc':
    'Enter the Terma Realm Stone Gate on the northern cliff, clear all 3 floors of Tier 1, pass the trial of the Terma Guardian, and retrieve the first Terma treasure.',
  'quest.ch5.firstTerma.step.clear_terma_1': 'Clear Terma Realm Tier 1 and pass the Terma Guardian’s trial',
  'quest.ch5.firstTerma.step.report_tsogyal': 'Return to Yeshe Tsogyal at Chimphu Hermitage',

  // C5-3: ch5.epilogue
  'quest.ch5.epilogue.title': 'Return to the Beginning',
  'quest.ch5.epilogue.desc':
    'As the vision of Chimphu dissolves into luminous space, your awareness awakens beside the Great Stupa of Boudhanath in Nepal. Speak with the Old Lama to complete your pilgrimage.',
  'quest.ch5.epilogue.step.talk_old_lama': 'Return to Boudhanath Stupa and speak with the Old Lama',

  // ---------------------------------------------------------------- Dialogues
  'dlg.ch5.tsogyal.intro.1':
    'Welcome, pilgrim, to [[codex:chimphu]]. Though the temple bells of Samye echo far below in the valley, here the pine wind and mountain springs proclaim the Dharma.',
  'dlg.ch5.tsogyal.intro.2':
    'I am [[codex:yesheTsogyal]]. Knowing that beings of future ages will face heavy obstacles, Guru Rinpoche instructed me to transcribe his innermost teachings in dakini script upon yellow scrolls and conceal them as [[codex:terma]] within rocks, lakes, and sky.',
  'dlg.ch5.tsogyal.intro.3':
    'Only a destined [[codex:terton]] of pure vow and unshakeable samadhi can traverse the grottoes beyond the northern Stone Gate and prove worthy before the Terma Guardian. Will you step through the gate and face the first trial?',
  'dlg.ch5.tsogyal.intro.choice.accept': '“I am ready to enter the Terma Realm and face the Guardian’s trial.”',
  'dlg.ch5.tsogyal.intro.choice.ask': '“What are Terma treasures and who are the Tertöns?”',
  'dlg.ch5.tsogyal.intro.askReply':
    '[[codex:terma]] are concealed treasures of earth, water, and luminous mind. Sealed by the Master’s miraculous power and watched over by treasure guardians, they await the foretold [[codex:terton]] who will reveal them when the karmic time is ripe.',

  'dlg.ch5.tsogyal.active.1':
    'The Terma Realm Stone Gate on the northern cliff stands open for you. Refresh yourself at the Amrita Spring to the west if needed, then enter Tier 1 and complete its three floors.',
  'dlg.ch5.tsogyal.active.choice.openTier': '“Open the Terma Realm Tier Selection.”',
  'dlg.ch5.tsogyal.active.choice.ok': '“I will head to the northern Stone Gate.”',

  'dlg.ch5.tsogyal.report.1':
    'The warm turquoise-gold radiance upon you speaks clearly—the Terma Guardian has knelt in recognition and entrusted the first Terma treasure to your care!',
  'dlg.ch5.tsogyal.report.2':
    'From the vows of the poultry woman’s four sons at Boudhanath Stupa, to the rain of Yangleshö in Pharping, the Twelve Tenma at Gungthang Pass, Yarlha Shampo in Yarlung, and the raising of Samye Monastery—you have walked the entire path of the Lotus-Born.',
  'dlg.ch5.tsogyal.report.3':
    'Listen closely: the wind-bells of Boudhanath Stupa are calling you home. Return to the Old Lama where your meditation began—and know that the Terma Realm (Tier 1–10+) here in Chimphu will remain open whenever you wish to test your realization.',
  'dlg.ch5.tsogyal.report.choice.returnStupa': '“Return now to Boudhanath Stupa.”',
  'dlg.ch5.tsogyal.report.choice.stay': '“I will linger in Chimphu a moment longer before returning.”',

  'dlg.ch5.tsogyal.after.1':
    'The gates of Terma are inexhaustible. Each time you enter, the grottoes and the Guardian’s patterns shift with the currents of dependent origination.',
  'dlg.ch5.tsogyal.after.choice.openTier': '“Enter the Terma Realm (Select Tier)”',
  'dlg.ch5.tsogyal.after.choice.leave': '“Homage to the Wisdom Dakini.”',

  'dlg.ch5.guruVision.1':
    '“Emaho! The secret intent of the Buddhas of past, present, and future shines complete within the luminous nature of your own mind. Mountain and river are the mandala; every step and breath is meditation.”',
  'dlg.ch5.guruVision.2':
    '“Though I depart Tibet to tame the southwest continent of Chamara, on the tenth day of every lunar month I return upon sunbeams and rainbows. To all who call with devotion, Padmasambhava is never apart.”',
  'dlg.ch5.guruVision.choice.bow': '“Bow to the Second Buddha of Oddiyana (Receive Blessing)”',

  'dlg.ch5.retreatant1.1':
    'For three years in Chimphu, each dawn brings the sound of dakini vajra-songs echoing from the upper caves, dissolving everyworldly care.',
  'dlg.ch5.retreatant1.choice.ok': '“Rejoice in your practice.”',
  'dlg.ch5.retreatant2.1':
    'From the southern overlook you can see Samye Monastery and the Yarlung Tsangpo far below. Movement and stillness are one taste.',
  'dlg.ch5.retreatant2.choice.ok': '“Bow in respect.”',

  'dlg.ch5.oldLama.epilogue.1':
    '(You gently open your eyes. The vast white dome and all-seeing eyes of Boudhanath Stupa shine quietly in the Kathmandu sunlight, and the warm scent of butter lamps fills the air.)',
  'dlg.ch5.oldLama.epilogue.2':
    'Aha, pilgrim—you have awakened from deep samadhi. By the serene clarity in your eyes, you have walked the Master’s journey from Nepal into Tibet and witnessed how the ancient vows of the four sons at Jarung Khashor came to fruition.',
  'dlg.ch5.oldLama.epilogue.3':
    'King Trisong Detsen, Abbot Śāntarakṣita, Padmasambhava, and the royal messenger—their aspirations beside this Stupa lit a lamp across the Land of Snows. And the countless Terma hidden by the Master and Yeshe Tsogyal still rest within rock, water, and mind: the Terma still await those with karmic affinity.',
  'dlg.ch5.oldLama.epilogue.choice.complete': '“Thank you, Lama. May the merit of this journey benefit all beings.”',

  'dlg.ch5.oldLama.done.1':
    'The Stupa stands timeless, and the prayer flags dance in the breeze. You may return to Chimphu anytime via the waypoint network to challenge higher Terma Tiers, or walk kora and read your Codex in peace.',
  'dlg.ch5.oldLama.done.choice.credits': '“View Ending Credits & Historical Bibliography”',
  'dlg.ch5.oldLama.done.choice.close': '“Bow with folded palms.”',

  // ---------------------------------------------------------------- Codex Entries (4)
  'codex.chimphu.title': 'Chimphu Hermitage (མཆིམས་ཕུ་)',
  'codex.chimphu.body': `<p><strong>[Historical]</strong> Chimphu Hermitage (Tibetan: མཆིམས་ཕུ་, Wylie: <em>mchims phu</em>) lies at roughly 4,300 meters on the wooded slopes of Mount Nari, about 13 km northeast of Samye Monastery in central Tibet. Sheltered on three sides by rocky peaks and overlooking the broad Yarlung Tsangpo valley, its milder microclimate and over one hundred natural meditation caves made it Tibet’s premier retreat sanctuary from the imperial era onward.</p>
<p>Historical chronicles record that after the consecration of Samye in the late 8th century, Padmasambhava, Yeshe Tsogyal, King Trisong Detsen, and the Seven Tested Men retreated to Chimphu’s upper caves (centered around Drakmar Keutsang) where the Master transmitted the Eight Heruka Sadhanas (Kagyé) and Dzogchen pith instructions. Later luminaries such as Longchenpa and Jigme Lingpa also attained realization here.</p>`,

  'codex.yesheTsogyal.title': 'Yeshe Tsogyal (ཡེ་ཤེས་མཚོ་རྒྱལ་)',
  'codex.yesheTsogyal.body': `<p><strong>[Historical Figure; Biographical Details Largely Legendary]</strong> Yeshe Tsogyal (Tibetan: ཡེ་ཤེས་མཚོ་རྒྱལ་, Wylie: <em>ye shes mtsho rgyal</em>, 8th century CE), Princess of Kharchen, is revered in the Nyingma tradition as the foremost Tibetan disciple of Padmasambhava, the Wisdom Dakini, and the “Mother of Terma.”</p>
<p>According to traditional hagiographies, she practiced severe austerities in Pharping, Chimphu, and Tidro, attaining complete realization. Possessing unfailing retention, she compiled and transcribed Padmasambhava’s oral teachings into symbolic dakini script on yellow scrolls and concealed them across Tibet so they would endure for future generations.</p>`,

  'codex.terma.title': 'The Terma Tradition (གཏེར་མ་)',
  'codex.terma.body': `<p><strong>[Historical Tradition; Origin Narratives Belong to Faith]</strong> Terma (Tibetan: གཏེར་མ་, Wylie: <em>gter ma</em>, literally “hidden treasure”) is a major scriptural and ritual transmission system in Tibetan Buddhism (especially the Nyingma school) and Bön. Historically, Terma literature emerged prominently from the 10th–11th centuries onward and remains a living tradition today.</p>
<p>In traditional belief, Padmasambhava and Yeshe Tsogyal concealed texts, ritual implements, and teachings within rocks, lakes, pillars (Earth Terma, <em>sa gter</em>), and within the luminous mind-stream of disciples (Mind Terma, <em>dgongs gter</em>), entrusting them to treasure guardians (Terbdag) until the foretold time for their revelation.</p>`,

  'codex.terton.title': 'Tertön — Treasure Revealers (གཏེར་སྟོན་)',
  'codex.terton.body': `<p><strong>[Historical & Traditional]</strong> A Tertön (Tibetan: གཏེར་སྟོན་, Wylie: <em>gter ston</em>, “treasure revealer”) is a master recognized as discovering and decoding Terma teachings. Within the tradition, Tertöns are regarded as reincarnations of Padmasambhava’s twenty-five principal disciples.</p>
<p>Over a hundred historical Tertöns—including the Five Sovereign Tertöns (Nyangral Nyima Özer, Guru Chöwang, Dorje Lingpa, Pema Lingpa, and Jamyang Khyentse Wangpo) and Karma Lingpa (revealer of the <em>Bardo Thodol / Tibetan Book of the Dead</em>)—have profoundly shaped Tibetan literature, liturgy, medicine, and philosophy.</p>`,

  // ---------------------------------------------------------------- Ending Credits Overlay
  'credits.mantra': 'ཨོཾ་ཨཱཿ་ཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ',
  'credits.title': 'The Great Stupa of Jarung Khashor & The Footsteps of Padmasambhava',
  'credits.subtitle': '博達哈大佛塔・蓮師入藏朝聖行紀',
  'credits.epigraph': '“To forsake all evil, to cultivate all good, to purify one’s own mind—this is the teaching of all the Buddhas.”',
  'credits.section.journey': 'Chapters & Sacred Sites of the Pilgrimage',
  'credits.ch0': 'Prologue · Kathmandu, Nepal: Boudhanath Stupa (Jarung Khashor) — The Poultry Woman’s Four Sons',
  'credits.ch1': 'Chapter 1 · Pharping, Nepal: Yangleshö & Asura Cave — Vajrakilaya Tames the Drought Nagas',
  'credits.ch2': 'Chapter 2 · Nepal–Tibet Border: Mangyul Gungthang Pass — Subduing the Twelve Tenma Goddesses',
  'credits.ch3': 'Chapter 3 · Yarlung Valley: Mount Yarlha Shampo — The White Yak Mountain God Bound by Oath',
  'credits.ch4': 'Chapter 4 · Mount Hepo Ri & Samye Monastery — Three-Headed Pehar & The Sumeru Mandala',
  'credits.ch5': 'Finale · Mount Nari: Chimphu Hermitage & The Terma Realm — Yeshe Tsogyal Conceals the Treasures',
  'credits.section.figures': 'Historical & Traditional Figures',
  'credits.figures.list':
    'Padmasambhava (Guru Rinpoche) · Yeshe Tsogyal · Abbot Śāntarakṣita · King Trisong Detsen · The Seven Tested Men (Sadmi Mi-dun) · The Old Lama of Boudhanath',
  'credits.section.stats': 'Pilgrim’s Record',
  'credits.stats.codex': 'Codex Collection: {unlocked} / {total} ({pct}%)',
  'credits.stats.termaTier': 'Highest Terma Realm Cleared: Tier {tier}',
  'credits.stats.level': 'Practitioner Level: Lv.{level}',
  'credits.section.disclaimer': 'Historical & Legendary Note',
  'credits.disclaimer.body':
    'This game’s narrative draws from classical biographies of Padmasambhava (such as the Zanglingma and the Legend of the Great Stupa of Jarung Khashor) and Tibetan historical chronicles. While the places, rulers, and masters are grounded in history, miraculous subduals and prophetic accounts belong to religious legend and living faith. Every Codex entry distinguishes [Historical] from [Legendary] elements and provides external scholarly links.',
  'credits.section.sources': 'Primary Reference Sources',
  'credits.closeBtn': 'Return to the Stupa [Esc / Close]',
};

export const CH5_STRINGS = {
  'zh-Hant': ZH_HANT,
  zh: ZH_HANT,
  en: EN,
};

i18n.register(CH5_STRINGS);
export default CH5_STRINGS;
