// ============================================================================
// Chapter 2 — Mangyul Pass & Twelve Tenma (芒域山口・十二丹瑪) i18n Strings
// Auto-discovered by src/systems/quests.js via import.meta.glob('../i18n/*.js')
// ============================================================================

import { i18n } from '../i18n.js';

export const CH2_STRINGS = {
  zh: {
    // Map & Zone
    'map.mangyul': '芒域山口・吉隆',
    'toast.enterMangyul': '進入芒域山口 —— 尼泊爾與吐蕃交界的風雪邊境',

    // Pure Vision Chapter Intro
    'ch2.intro.location': '芒域・吉隆山口',
    'ch2.intro.era': '西元八世紀・吐蕃迎請使啟程之際',
    'ch2.intro.title': '第二章・芒域山口・十二丹瑪',
    'ch2.intro.narration': '穿過吉隆河谷的針葉密林，石砌山徑蜿蜒直入白雪皚皚的喜馬拉雅山口。吐蕃贊普赤松德贊遣使迎請蓮花生大士入藏，然而守護雪域邊境的十二丹瑪女神掀起狂暴風雪，將山口徹底封鎖……',
    'ch2.intro.hint': '按任意鍵踏入淨相',

    // Chapter Completion Banner
    'ch2.banner.complete.kicker': '第二章圓滿・雪域門戶洞開',
    'ch2.banner.complete.title': '芒域山口・十二丹瑪立誓',
    'ch2.banner.complete.sub': '暴雪平息，五色風馬旗隨風獵獵，通往雅礱河谷的入藏古道已然開啟',

    // Enemies
    'enemy.snowSprite': '雪暴精',
    'enemy.hailGhost': '冰雹鬼',
    'enemy.avalancheBrute': '雪崩魔',

    // Boss: Storm of the Twelve Tenma
    'boss.tenmaStorm.name': '十二丹瑪之風暴',
    'boss.tenmaStorm.title': '芒域山口・雪域邊境之障',
    'boss.tenmaStorm.phase2Toast': '用六字咒將光點送回漩渦',
    'boss.tenmaStorm.orbReturned': '丹瑪光點歸回風暴核心（剩餘 {n} 處氣候光點）',
    'boss.tenmaStorm.allOrbsReturned': '四方氣候光點盡數歸位，風暴防護已 ослаб！',
    'boss.tenmaStorm.oath.n1': '「嗡！持明蓮花生大士，祈請垂聽！」狂暴的風雪驟然止息，十二道晶瑩如冰的女神身影環繞山口拉則，依序俯首頂禮。',
    'boss.tenmaStorm.oath.n2': '「吾等乃守護藏地地脈與雪山的[[codex:twelveTenma|十二丹瑪]]。昔日不知大士受贊普迎請入藏弘法，故以冰雹、雪崩、迷霧與雷電試探大士威德。」',
    'boss.tenmaStorm.oath.n3': '「今見大士金剛定力不可動搖，吾等十二姊妹願獻上生命心咒，奉上甘露寶瓶，永為佛法與雪域行者之堅固護法，守護入藏正道！」',
    'boss.tenmaStorm.oath.accept': '「善哉。汝等守持誓言，護佑往來行者與正法久住。」（締結十二丹瑪誓言）',

    // Interactive Prompts & Tenma Trials
    'prompt.tenmaAltar': '按 E 開啟丹瑪祭壇試煉（{type}）',
    'prompt.tenmaOathStone': '按 E 安放誓言石（點亮五色經幡）',
    'prompt.tenmaCompleted': '丹瑪祭壇已立誓（經幡飄揚）',
    'prompt.passPrayerFlags': '按 E 在山口拉則掛起五色經幡',
    'tenma.type.hail': '冰雹之試',
    'tenma.type.avalanche': '雪崩之試',
    'tenma.type.fog': '迷霧之試',
    'tenma.type.lightning': '雷電之試',
    'toast.tenmaTrialStart.hail': '【丹瑪試煉：冰雹】漫天冰雹墜落，在試煉場內閃避並堅持 30 秒！',
    'toast.tenmaTrialStart.avalanche': '【丹瑪試煉：雪崩】巨型雪球自山坡滾落，留意地面預警並堅持 30 秒！',
    'toast.tenmaTrialStart.fog': '【丹瑪試煉：迷霧】濃霧籠罩山谷，度化霧中現身的 6 隻冰雹鬼！',
    'toast.tenmaTrialStart.lightning': '【丹瑪試煉：雷電】落雷交加，閃避雷擊並度化雪暴精，堅持 30 秒！',
    'toast.tenmaTrialPassed': '試煉通過！請與丹瑪祭壇互動（按 E）安放誓言石',
    'toast.tenmaTrialReset': '行者力竭昏厥，當前祭壇試煉已重置（已完成祭壇不受影響）',
    'toast.tenmaOathPlaced': '已安放誓言石，祭壇經幡重煥五色光芒！（{n}/12）',
    'toast.tenmaAllComplete': '十二座丹瑪祭壇盡數點亮！山口頂端的暴風雪核心已現身！',
    'toast.passFlagsHung': '五色風馬旗在芒域山口迎風獵獵，大士入藏之路正式開啟！',

    // NPCs
    'npc.envoyLeader': '吐蕃迎請使・巴・賽囊',
    'npc.envoyRetinue1': '迎請隨從・朗卡',
    'npc.envoyRetinue2': '迎請隨從・多吉',
    'npc.envoyPorter': '馱隊腳夫・扎西',
    'npc.guruVision.mangyul': '蓮師淨相・入藏法影',
    'npc.boss.tenmaStorm.name': '十二丹瑪女神',
    'npc.boss.tenmaStorm': '十二丹瑪女神',

    // Quests
    'quest.ch2.envoy.title': '藏王的使者',
    'quest.ch2.envoy.desc': '前往吉隆山谷的使者營地，與吐蕃贊普赤松德贊派來的迎請使交談，了解桑耶寺建寺受阻與迎請蓮花生大士入藏的因緣。',
    'quest.ch2.envoy.step1': '與使者營地的吐蕃迎請使巴・賽囊交談',

    'quest.ch2.tenma.title': '十二丹瑪',
    'quest.ch2.tenma.desc': '沿著通往芒域山口的之字形山道與側谷，完成十二座丹瑪祭壇的氣候試煉並安放誓言石，使褪色的經幡重現五色光芒。',
    'quest.ch2.tenma.step1': '通過試煉並在十二座丹瑪祭壇安放誓言石',

    'quest.ch2.storm.title': '山口的風暴',
    'quest.ch2.storm.desc': '十二座祭壇已然點亮，登上芒域山口頂端的拉則石堆，平息並調伏十二丹瑪共同化現的暴雪風暴。',
    'quest.ch2.storm.step1': '登上芒域山口頂端的拉則廣場',
    'quest.ch2.storm.step2': '調伏「十二丹瑪之風暴」並接受護法誓言',

    'quest.ch2.tibet.title': '入藏',
    'quest.ch2.tibet.desc': '風暴平息，在山口拉則旁觀想蓮師入藏淨相，並親手掛起一串五色經幡，開啟前往雅礱河谷的入藏道路。',
    'quest.ch2.tibet.step1': '在山口拉則旁與「蓮師淨相・入藏法影」交談',
    'quest.ch2.tibet.step2': '在山口拉則掛起一串五色經幡（按 E）',

    // Dialogues — C2-1 Envoy Leader
    'dlg.ch2.envoy.n1': '「頂禮遠道而來的行者！吾乃吐蕃贊普[[codex:trisongDetsen|赤松德贊]]座下迎請使巴・賽囊。我們奉贊普聖旨，特來[[codex:mangyul|芒域・吉隆山口]]迎請鄔金大士蓮花生入藏！」',
    'dlg.ch2.envoy.n2': '「贊普發願在紅山腳下興建桑耶寺，迎請那爛陀大堪布[[codex:shantarakshita|寂護大師]]主持建寺。誰知吐蕃本土鬼神晝夜作祟——白日築起的牆垣，到了夜晚便被狂風惡水盡數摧毀！」',
    'dlg.ch2.envoy.n3': '「寂護大師觀知因緣，向贊普建言：『吾乃講經論理之寂靜學者，難調此地剛強鬼神；唯今駐錫尼泊爾境內、具足金剛神通的蓮花生大士，方能降伏藏地一切非人障礙。』」',
    'dlg.ch2.envoy.n4': '「然而大士行至芒域山口，鎮守藏地邊境的[[codex:twelveTenma|十二丹瑪]]女神便降下冰雹、雪崩、濃霧與雷霆封鎖山道。唯有沿山徑走遍十二座丹瑪祭壇，通過試煉並安放誓言石，方能登上山口平息風暴！」',
    'dlg.ch2.envoy.choice1': '「我願沿山道前往十二座丹瑪祭壇，平息山口的障礙。」',
    'dlg.ch2.envoy.after': '「山道上的十二座丹瑪祭壇分別對應冰雹、雪崩、迷霧與雷電四種試煉。完成試煉後安放誓言石，祭壇上的[[codex:windhorse|五色風馬旗]]便會重新煥發光芒。你也可以與營地隨從聊聊藏地的風馬與[[codex:latse|拉則]]習俗。」',
    'dlg.ch2.envoy.choiceAfter': '「明白了，我這就動身。」',

    // Dialogues — Envoy Camp Retinue (Windhorse & Latse lore)
    'dlg.ch2.retinue1.n1': '「你看山道祭壇上那些褪色的布幡，那便是我們藏地世代懸掛的[[codex:windhorse|風馬旗]]（隆達）。藍、白、紅、綠、黃五色分別象徵天穹、白雲、火焰、綠水與大地五大元素。」',
    'dlg.ch2.retinue1.n2': '「每當山口狂風吹拂經幡一次，就如同將幡上的經咒與祈願傳誦十方。十二丹瑪祭壇被暴雪侵蝕而黯淡無光，若能安放誓言石令五色重現，必能調和山川五大！」',
    'dlg.ch2.retinue1.close': '「感謝指點，我會點亮沿途的五色經幡。」',

    'dlg.ch2.retinue2.n1': '「在芒域山口最高處，矗立著一座巨大的石堆，我們稱之為[[codex:latse|拉則]]（山口神石堆）。凡是翻越雪山險隘的旅人，都會在拉則添上一塊白石，高呼『拉嘉囉』（諸神勝利）！」',
    'dlg.ch2.retinue2.n2': '「拉則不僅是地理上跨越尼泊爾與吐蕃的分水嶺，更是山神與地方護法棲止的聖所。十二丹瑪化現的暴雪核心，就盤踞在山口頂端的拉則廣場上。」',
    'dlg.ch2.retinue2.close': '「待完成十二祭壇試煉，我便登上山口拉則。」',

    'dlg.ch2.porter.n1': '「嘶——吉隆河谷明明還看得見蒼翠的松林與溪流，一往上走便全是冰川與暴雪！我們帶著獻給大士的黃金與綠松石，全靠營火取暖呢。」',
    'dlg.ch2.porter.close': '「你們在營地安心守候，前路由我開闢。」',

    // Dialogues — C2-4 Guru Vision at Pass Latse
    'dlg.ch2.vision.n1': '在芒域山口的拉則巨石旁，金色蓮華光影凝聚成蓮花生大士威嚴的法相。大士手執金剛杵與清脆的嘎嗚金剛鈴，目光越過連綿雪峰，望向廣袤的吐蕃高原。',
    'dlg.ch2.vision.n2': '「善哉行者！[[codex:twelveTenma|十二丹瑪]]已受三昧耶戒，化暴雪為護法吉祥之風。自此芒域山口以北，山川地脈皆入正法壇城。」',
    'dlg.ch2.vision.n3': '「今授汝『金剛鈴音』之密法——鈴聲象徵般若空性智慧，能震懾諸魔、守護身心。且在山口[[codex:latse|拉則]]掛起[[codex:windhorse|五色風馬旗]]，隨風傳遍雅礱河谷，開啟入藏弘法之大道！」',
    'dlg.ch2.vision.choice1': '「頂禮蓮師！我這就在山口拉則掛起五色經幡。」',

    // Codex Entries (6 entries, 150-300 Traditional Chinese chars + English, tagged [史實]/[傳說])
    'codex.trisongDetsen.name': '赤松德贊',
    'codex.trisongDetsen.category': '人物與祖師',
    'codex.trisongDetsen.summary': '〔史實〕西元八世紀吐蕃帝國第三十八代贊普，「祖孫三法王」之一，迎請寂護與蓮花生大士入藏建立桑耶寺。',
    'codex.trisongDetsen.body': '〔史實〕赤松德贊（Khri Srong-lde-btsan，742—約797年），吐蕃帝國第三十八代贊普，與松贊干布、赤祖德贊並稱藏傳佛教「祖孫三法王」。赤松德贊在位期間吐蕃國力鼎盛，他矢志弘揚佛法，先迎請印度那爛陀寺大堪布寂護（Śāntarakṣita）入藏，後依寂護建言遣使迎請蓮花生大士入藏調伏本土反佛勢力與地方鬼神。在「師君三尊」（寂護、蓮師、赤松德贊）合力下，約於779年建成西藏第一座佛、法、僧三寶俱全的寺院——桑耶寺，並選拔「七覺士」剃度出家、組織大規模佛經翻譯，奠定藏傳佛教前弘期的核心根基。',

    'codex.shantarakshita.name': '寂護大師',
    'codex.shantarakshita.category': '人物與祖師',
    'codex.shantarakshita.summary': '〔史實〕八世紀印度那爛陀寺大堪布、中觀瑜伽行派祖師，藏地尊稱「菩提薩埵」，與蓮師共同開創桑耶寺。',
    'codex.shantarakshita.body': '〔史實〕寂護（Śāntarakṣita，生卒約725—788年），藏傳傳統尊稱為「堪布菩提薩埵」（Khenpo Bodhisattva），為八世紀印度那爛陀寺著名學者，融會中觀派與瑜伽行唯識學，創立「順瑜伽行中觀自續派」，著有《攝真實論》。他應赤松德贊之請入藏弘傳顯教戒律與哲學，然因吐蕃山川災異頻仍、崇信本土信仰的貴族趁機歸咎於建寺觸怒神靈，寂護遂建議贊普迎請深諳密續方便法門的蓮花生大士入藏。桑耶寺落成後，寂護擔任首任住持並為藏地首批比丘「七覺士」授具足戒，開創藏傳佛教顯密雙融的傳統。',

    'codex.mangyul.name': '芒域・吉隆山口',
    'codex.mangyul.category': '聖地與地理',
    'codex.mangyul.summary': '〔史實〕位於喜馬拉雅山脈中段、尼泊爾與西藏交界的古老通道，為唐代與吐蕃時期高僧使節往來印藏的核心要衝。',
    'codex.mangyul.body': '〔史實〕芒域（Mangyul，意為「眾多民眾之地」）與吉隆（Kyirong，意為「舒適之鄉」），位於今日西藏日喀則市吉隆縣與尼泊爾交界處的喜馬拉雅山脈南麓峽谷。吉隆河谷南接溫暖濕潤的針葉林帶，北連高聳入雲的雪山山口，自古即為連接尼泊爾加德滿都河谷與西藏腹地的「蕃尼古道」咽喉。西元七至八世紀間，松贊干布迎娶尼泊爾尺尊公主、唐代使節王玄策出使印度（今存大唐天竺使出銘摩崖石刻），乃至寂護大師與蓮花生大士應赤松德贊迎請入藏，皆經由芒域・吉隆古道翻越喜馬拉雅山口進入藏地。',

    'codex.twelveTenma.name': '十二丹瑪女神',
    'codex.twelveTenma.category': '護法與伏藏',
    'codex.twelveTenma.summary': '〔傳說〕鎮守西藏山川地脈與雪山山口的十二位本土女性地祇，於芒域邊境受蓮花生大士調伏並立誓護持佛法。',
    'codex.twelveTenma.body': '〔傳說〕十二丹瑪（Bstan-ma bcu-gnyis，又譯十二堅固母、十二地母），源於吐蕃古老山川信仰中鎮守雪域地脈、山口與氣象的十二位女性地祇（分為四大魔母、四大藥叉女與四大醫母三組，注意勿與「長壽五姊妹」混淆）。據《拔協》與《蓮花生大士本生傳》（Padma bka’ thang）記載，蓮師自尼泊爾經芒域山口入藏時，十二丹瑪曾掀起暴雪、冰雹、山崩與迷霧試圖阻攔；大士以深廣禪定與金剛威德令其折服，十二女神遂現前頂禮、獻上本命心咒並受三昧耶戒，轉化為守護雪域佛法與修行者的護法神群。',

    'codex.windhorse.name': '風馬旗（隆達）',
    'codex.windhorse.category': '器物與儀軌',
    'codex.windhorse.summary': '〔史實〕懸掛於藏地山口、寺院與佛塔的五色經幡，象徵藍天、白雲、紅火、綠水與黃土五大元素之和諧。',
    'codex.windhorse.body': '〔史實〕風馬旗（藏語 Lung-rta，音譯「隆達」，意為「風之駿馬」），為藏地山口、橋樑、寺院與民居廣泛懸掛的祈福經幡。經幡中央常印有背負摩尼寶珠的駿馬，四角環繞大鵬金翅鳥、龍、獅、虎「四瑞獸」，象徵行者內在氣運、福德與生命力的提振。經幡依固定次序由藍、白、紅、綠、黃五色布幅串聯而成，分別對應虛空（天）、氣（雲）、火、水、地五大元素。藏傳信仰認為，當山口清風吹動經幡一次，其上印製的經文與六字大明咒便隨風傳布十方，達到調和自然界五大失衡、平息風雪災障並利益一切有情的功德。',

    'codex.latse.name': '拉則（山口石堆）',
    'codex.latse.category': '器物與儀軌',
    'codex.latse.summary': '〔史實〕矗立於雪山山口與神山要道的祭祀石堆，插有木箭與五色經幡，為旅人祈求平安與禮敬山神的傳統地標。',
    'codex.latse.body': '〔史實〕拉則（藏語 La-btsas），意為「山口之神殿」或「山神居所」，是西藏與喜馬拉雅地區立於高海拔山口、神山分水嶺的重要祭祀建築。拉則以白石與片岩層層堆疊成圓台或錐體，中央插有象徵男神武勇的彩繪木箭、柏枝與長矛，四周拉起密集的五色風馬旗網。歷史上，拉則源自吐蕃先民對山川地祇（Yul-lha / Gzhi-bdag）的崇拜，佛教傳入並調伏地方山神後，拉則融合了煨桑（煙供）、拋灑隆達與持咒祈願的佛教儀軌。凡翻越險峻山口的商旅與朝聖者，皆會繞行拉則、添上一塊白石並高呼「拉嘉囉！」（Lha rgyal lo，意為「諸神勝利」）。',
  },

  en: {
    // Map & Zone
    'map.mangyul': 'Mangyul Pass · Kyirong',
    'toast.enterMangyul': 'Entering Mangyul Pass — the snow-swept frontier between Nepal and Tibet',

    // Pure Vision Chapter Intro
    'ch2.intro.location': 'Mangyul · Kyirong Pass',
    'ch2.intro.era': '8th Century CE · The Tibetan Royal Envoys’ Invitation',
    'ch2.intro.title': 'Chapter II · Mangyul Pass & The Twelve Tenma',
    'ch2.intro.narration': 'Beyond the conifer woods of Kyirong Valley, a switchback mountain trail climbs into the snow-crowned Himalayan pass. King Trisong Detsen has sent royal envoys to invite Guru Padmasambhava into Tibet—yet the Twelve Tenma goddesses guarding the snowy frontier have unleashed a raging blizzard to seal the pass...',
    'ch2.intro.hint': 'Press any key to enter the Pure Vision',

    // Chapter Completion Banner
    'ch2.banner.complete.kicker': 'Chapter II Complete · Gateway to the Land of Snows',
    'ch2.banner.complete.title': 'Mangyul Pass · Oath of the Twelve Tenma',
    'ch2.banner.complete.sub': 'The blizzard subsides, five-colored windhorse flags flutter in the gale, and the ancient road to Yarlung Valley lies open',

    // Enemies
    'enemy.snowSprite': 'Snow Sprite',
    'enemy.hailGhost': 'Hail Ghost',
    'enemy.avalancheBrute': 'Avalanche Brute',

    // Boss: Storm of the Twelve Tenma
    'boss.tenmaStorm.name': 'Storm of the Twelve Tenma',
    'boss.tenmaStorm.title': 'Blizzard Barrier of Mangyul Pass',
    'boss.tenmaStorm.phase2Toast': 'Cast the Six-Syllable Mantra (R) near each light orb to return it to the vortex!',
    'boss.tenmaStorm.orbReturned': 'Tenma light orb returned to the vortex ({n} weather orbs remaining)',
    'boss.tenmaStorm.allOrbsReturned': 'All four weather orbs have returned to the core—the storm weakens!',
    'boss.tenmaStorm.oath.n1': '"Om! Vidyādhara Padmasambhava, pray hear us!" The raging blizzard suddenly stills as twelve crystalline female silhouettes form a circle around the pass latse, bowing in sequence.',
    'boss.tenmaStorm.oath.n2': '"We are the [[codex:twelveTenma|Twelve Tenma]] who guard the earth-veins and snow peaks of Tibet. Testing your realization as you crossed the frontier, we unleashed hail, avalanche, fog, and lightning upon the pass."',
    'boss.tenmaStorm.oath.n3': '"Beholding your unshakable vajra samādhi, we twelve sisters offer our life-essence mantras and nectar vases, swearing an eternal oath to protect the Dharma and all travelers entering the Land of Snows!"',
    'boss.tenmaStorm.oath.accept': '"Excellent. Keep your samaya oath and guard the Dharma and all beings crossing this pass." (Bind the Twelve Tenma Oath)',

    // Interactive Prompts & Tenma Trials
    'prompt.tenmaAltar': 'Press E to start Tenma Altar Trial ({type})',
    'prompt.tenmaOathStone': 'Press E to place the Oath Stone (Restore 5-color flags)',
    'prompt.tenmaCompleted': 'Tenma Altar Oath Bound (Flags fluttering)',
    'prompt.passPrayerFlags': 'Press E to hang five-colored prayer flags at the Pass Latse',
    'tenma.type.hail': 'Trial of Hail',
    'tenma.type.avalanche': 'Trial of Avalanche',
    'tenma.type.fog': 'Trial of Fog',
    'tenma.type.lightning': 'Trial of Lightning',
    'toast.tenmaTrialStart.hail': '[Tenma Trial: Hail] Hailstones rain from the sky—dodge the impact circles and survive for 30s!',
    'toast.tenmaTrialStart.avalanche': '[Tenma Trial: Avalanche] Giant snowballs roll down the slope—watch the linear telegraphs and survive for 30s!',
    'toast.tenmaTrialStart.fog': '[Tenma Trial: Fog] Thick mist engulfs the trail—liberate the 6 Hail Ghosts emerging in the fog!',
    'toast.tenmaTrialStart.lightning': '[Tenma Trial: Lightning] Chain lightning strikes the pass—dodge the bolts, liberate the Snow Sprites, and survive for 30s!',
    'toast.tenmaTrialPassed': 'Trial passed! Interact with the Tenma Altar (Press E) to place the Oath Stone',
    'toast.tenmaTrialReset': 'You fainted—only the active altar trial was reset (completed altars remain intact)',
    'toast.tenmaOathPlaced': 'Oath Stone placed! Vibrant five-colored prayer flags restored! ({n}/12)',
    'toast.tenmaAllComplete': 'All 12 Tenma Altars are illuminated! The Storm Core has manifested at the summit pass!',
    'toast.passFlagsHung': 'Five-colored windhorse flags flutter atop Mangyul Pass—the road into Tibet is open!',

    // NPCs
    'npc.envoyLeader': 'Tibetan Envoy · Ba Salnang',
    'npc.envoyRetinue1': 'Envoy Retinue · Namkha',
    'npc.envoyRetinue2': 'Envoy Retinue · Dorje',
    'npc.envoyPorter': 'Caravan Porter · Tashi',
    'npc.guruVision.mangyul': 'Guru Vision · Gateway to Tibet',
    'npc.boss.tenmaStorm.name': 'The Twelve Tenma Goddesses',
    'npc.boss.tenmaStorm': 'The Twelve Tenma Goddesses',

    // Quests
    'quest.ch2.envoy.title': 'Envoys of the Tibetan King',
    'quest.ch2.envoy.desc': 'Speak with the royal envoy sent by King Trisong Detsen at the Kyirong Valley camp to learn why the construction of Samye Monastery is obstructed and why Guru Padmasambhava was invited to Tibet.',
    'quest.ch2.envoy.step1': 'Speak with Tibetan Envoy Ba Salnang at the Envoy Camp',

    'quest.ch2.tenma.title': 'The Twelve Tenma',
    'quest.ch2.tenma.desc': 'Follow the switchback mountain trail and side valleys to complete the weather trials at all twelve Tenma Altars and place their Oath Stones, restoring the faded prayer flags to vibrant five-colored splendour.',
    'quest.ch2.tenma.step1': 'Pass the trials and place Oath Stones at all 12 Tenma Altars',

    'quest.ch2.storm.title': 'Storm at the Pass',
    'quest.ch2.storm.desc': 'With all twelve altars illuminated, ascend to the Pass Latse cairn at the summit of Mangyul Pass and subdue the blizzard storm manifested by the Twelve Tenma.',
    'quest.ch2.storm.step1': 'Ascend to the Pass Latse arena at the summit of Mangyul Pass',
    'quest.ch2.storm.step2': 'Subdue the "Storm of the Twelve Tenma" and receive their oath',

    'quest.ch2.tibet.title': 'Entering Tibet',
    'quest.ch2.tibet.desc': 'With the blizzard calmed, commune with the Guru Vision beside the Pass Latse and hang a string of five-colored prayer flags to open the ancient road toward Yarlung Valley.',
    'quest.ch2.tibet.step1': 'Speak with "Guru Vision · Gateway to Tibet" beside the Pass Latse',
    'quest.ch2.tibet.step2': 'Hang a string of five-colored prayer flags at the Pass Latse (Press E)',

    // Dialogues — C2-1 Envoy Leader
    'dlg.ch2.envoy.n1': '"Homage to you, traveler! I am Ba Salnang, royal envoy of Tibetan Emperor [[codex:trisongDetsen|Trisong Detsen]]. By decree of the Tsenpo, we have come to [[codex:mangyul|Mangyul · Kyirong Pass]] to welcome the Great Master of Oddiyana, Padmasambhava, into Tibet!"',
    'dlg.ch2.envoy.n2': '"The Emperor vowed to build Samye Monastery at the foot of Red Hill under the guidance of Abbot [[codex:shantarakshita|Śāntarakṣita]] of Nālandā. Yet fierce local spirits of Tibet rebel day and night—every wall built by day is shattered by gales and floods at night!"',
    'dlg.ch2.envoy.n3': '"Knowing the karmic cause, Abbot Śāntarakṣita counselled the King: \'I am a peaceful scholar of sutra and logic, unable to tame these wrathful spirits; only the tantric master Padmasambhava, now dwelling near Nepal, possesses the vajra power to subdue them.\'"',
    'dlg.ch2.envoy.n4': '"Yet as the Guru approached Mangyul Pass, the [[codex:twelveTenma|Twelve Tenma]] goddesses guarding Tibet’s frontier sealed the trail with hail, avalanches, fog, and lightning. Only by visiting all twelve Tenma Altars along the pass, passing their weather trials, and placing Oath Stones can the summit storm be calmed!"',
    'dlg.ch2.envoy.choice1': '"I will ascend the trail, complete the twelve Tenma Altars, and clear the pass."',
    'dlg.ch2.envoy.after': '"The twelve Tenma Altars along the switchback trail test travelers with hail, avalanche, fog, and lightning. Once you place an Oath Stone, the faded [[codex:windhorse|windhorse prayer flags]] on the altar will shine in five colors again. Feel free to speak with my retinue about windhorse flags and [[codex:latse|latse]] cairns."',
    'dlg.ch2.envoy.choiceAfter': '"Understood. I set out now."',

    // Dialogues — Envoy Camp Retinue
    'dlg.ch2.retinue1.n1': '"Those faded banners on the mountain altars are [[codex:windhorse|windhorse prayer flags]] (lungta). Their five colors—blue, white, red, green, and yellow—embody sky, cloud, fire, water, and earth."',
    'dlg.ch2.retinue1.n2': '"Each time the mountain gale stirs the flags, their mantras and aspirations are carried across the ten directions. Restoring all twelve altars with Oath Stones will harmonize the five elements across the pass!"',
    'dlg.ch2.retinue1.close': '"Thank you. I will restore the five-colored flags along the trail."',

    'dlg.ch2.retinue2.n1': '"At the highest crest of Mangyul Pass stands a great stone cairn called a [[codex:latse|latse]]. Every traveler who crosses a snow pass adds a white stone to the latse and cries \'Lha gyal lo!\'—Victory to the Gods!"',
    'dlg.ch2.retinue2.n2': '"The latse marks the watershed between Nepal and Tibet and serves as the shrine of the mountain guardians. The vortex core of the Twelve Tenma’s storm awaits right at the Pass Latse."',
    'dlg.ch2.retinue2.close': '"Once the twelve altars are complete, I will ascend to the Pass Latse."',

    'dlg.ch2.porter.n1': '"Brrr! Down here in Kyirong Valley we still have pine trees and running water, but just up the trail it turns to glaciers and howling blizzards! We are keeping warm by the campfire with our gifts of gold and turquoise."',
    'dlg.ch2.porter.close': '"Rest well at camp; I will clear the road ahead."',

    // Dialogues — C2-4 Guru Vision
    'dlg.ch2.vision.n1': 'Beside the monumental stones of the Pass Latse, golden lotus light coalesces into the majestic form of Guru Padmasambhava. Holding a vajra scepter and a resonant ghanta bell, his gaze sweeps beyond the snow peaks toward the vast Tibetan plateau.',
    'dlg.ch2.vision.n2': '"Well done, practitioner! The [[codex:twelveTenma|Twelve Tenma]] have entered the samaya vow, turning their wrathful blizzard into an auspicious tailwind of the Dharma. North of Mangyul Pass, the earth-veins now open to the mandala."',
    'dlg.ch2.vision.n3': '"I bestow upon you the secret art of the Vajra Bell—whose chime proclaims the wisdom of emptiness, warding off obstacles and shielding body and mind. Now hang a string of [[codex:windhorse|five-colored prayer flags]] upon the [[codex:latse|Pass Latse]] to open the road into Yarlung Valley!"',
    'dlg.ch2.vision.choice1': '"Homage to the Guru! I will hang the prayer flags upon the Pass Latse."',

    // Codex Entries
    'codex.trisongDetsen.name': 'King Trisong Detsen',
    'codex.trisongDetsen.category': 'Figures & Masters',
    'codex.trisongDetsen.summary': '[History] The 38th Emperor (Tsenpo) of the Tibetan Empire in the 8th century and one of the Three Dharma Kings, who invited Śāntarakṣita and Padmasambhava to found Samye Monastery.',
    'codex.trisongDetsen.body': '[History] Trisong Detsen (Khri Srong-lde-btsan, 742–c. 797 CE) was the 38th Emperor of the Tibetan Empire and is revered alongside Songtsen Gampo and Ralpachen as one of Tibet’s "Three Ancestral Dharma Kings." Ruling at the height of imperial power, he resolved to establish Buddhism as Tibet’s state religion. He first invited the renowned Nālandā abbot Śāntarakṣita to Tibet, and on Śāntarakṣita’s advice sent royal envoys to invite the tantric master Padmasambhava to subdue hostile local deities and political opposition. Together as the " Abbot, Master, and King" triad, they founded Samye Monastery around 779 CE, ordained the first seven Tibetan monks, and sponsored vast translation bureaus.',

    'codex.shantarakshita.name': 'Abbot Śāntarakṣita',
    'codex.shantarakshita.category': 'Figures & Masters',
    'codex.shantarakshita.summary': '[History] Eighth-century Indian abbot of Nālandā and founder of the Yogācāra-Svātantrika-Mādhyamika school, revered in Tibet as Khenpo Bodhisattva.',
    'codex.shantarakshita.body': '[History] Śāntarakṣita (c. 725–788 CE), honored in Tibet as "Khenpo Bodhisattva," was a leading Indian philosopher and abbot of Nālandā University who synthesized Madhyamaka emptiness with Yogācāra epistemology in his Tattvasaṃgraha. Invited by King Trisong Detsen to introduce monastic vows and scholastic philosophy to Tibet, his initial efforts to build Samye Monastery were thwarted by natural disasters that anti-Buddhist ministers blamed on offended local spirits. Recognizing that wrathful obstacles required tantric skillful means, Śāntarakṣita advised the King to invite Guru Padmasambhava. After Samye’s completion, Śāntarakṣita served as its first abbot and ordained the first Tibetan monastics.',

    'codex.mangyul.name': 'Mangyul · Kyirong Pass',
    'codex.mangyul.category': 'Sacred Sites & Geography',
    'codex.mangyul.summary': '[History] The historic Himalayan corridor linking the Kathmandu Valley of Nepal with the Tibetan plateau, traversed by pilgrims, envoys, and Padmasambhava in the 8th century.',
    'codex.mangyul.body': '[History] Mangyul ("Land of Many Peoples") and Kyirong ("Valley of Comfort") lie along the southern Himalayan gorge straddling modern Kyirong County in Tibet and the Rasuwa border of Nepal. Rising dramatically from lush subtropic and conifer valleys to glacier-flanked mountain passes, this corridor served for centuries as the primary trans-Himalayan artery between Kathmandu and central Tibet. During the 7th and 8th centuries, Princess Bhrikuti’s bridal procession, Tang envoy Wang Xuance (whose cliff inscription still stands in Kyirong), Abbot Śāntarakṣita, and Guru Padmasambhava all ascended through Mangyul Pass on their historic journeys into Tibet.',

    'codex.twelveTenma.name': 'The Twelve Tenma Goddesses',
    'codex.twelveTenma.category': 'Protectors & Terma',
    'codex.twelveTenma.summary': '[Legend] A collective of twelve indigenous female earth-and-mountain deities of Tibet who tested Padmasambhava with blizzards at Mangyul before swearing an oath as Dharma protectors.',
    'codex.twelveTenma.body': '[Legend] The Twelve Tenma (Bstan-ma bcu-gnyis, the "Twelve Steadfast Mothers") are an ancient collective of twelve female landscape deities governing Tibet’s mountains, passes, and weather (grouped into four great demonesses, four yakṣiṇīs, and four medicine maidens—distinct from the Five Tseringma Sisters). According to the Testament of Ba (Dba’ bzhed) and the Padma bka’ thang, when Guru Padmasambhava crossed Mangyul toward Tibet, the Twelve Tenma hurled blizzards, hail, avalanches, and thunder to bar his way. Overwhelmed by the Guru’s vajra samādhi, they bowed before him, offered their life-essence mantras, and were bound under samaya oath as guardians of the Dharma.',

    'codex.windhorse.name': 'Windhorse Prayer Flags (Lungta)',
    'codex.windhorse.category': 'Ritual Objects & Practice',
    'codex.windhorse.summary': '[History] Five-colored Tibetan prayer flags strung across mountain passes and stupas, harmonizing the five elements of sky, cloud, fire, water, and earth.',
    'codex.windhorse.body': '[History] Windhorse flags (Tibetan: Lung-rta, literally "Wind Horse") are cloth banners printed with sacred mantras and auspicious symbols strung across Himalayan passes, bridges, and temples. At the center stands a galloping horse bearing the wish-fulfilling jewel, flanked at the four corners by the Garuda, Dragon, Snow Lion, and Tiger, representing vitality and auspicious fortune. Arranged in repeating sets of blue (space/sky), white (air/cloud), red (fire), green (water), and yellow (earth), the flags harmonize the five outer and inner elements. Every breeze that stirs the banners is believed to carry blessings and compassion across the world.',

    'codex.latse.name': 'Latse (Mountain Pass Cairn)',
    'codex.latse.category': 'Ritual Objects & Practice',
    'codex.latse.summary': '[History] Monumental stone cairns crowned with wooden arrows and prayer flags atop Himalayan passes, serving as shrines to mountain deities and watershed markers.',
    'codex.latse.body': '[History] A latse (Tibetan: La-btsas, "sanctuary of the pass") is a ritual stone cairn erected atop high mountain passes and sacred peaks throughout Tibet and the Himalayas. Built from stacked white quartz and slate stones and crowned with Symbolic wooden arrows, spears, juniper boughs, and dense arrays of five-colored prayer flags, the latse originated in pre-Buddhist veneration of territorial mountain deities (yullha / zhidak). Following the Buddhist conversion of Tibet’s landscape guardians, crossing a pass became a sacred pilgrimage act: travelers circumambulate the latse, add a stone to the cairn, toss paper windhorses, and cry "Lha gyal lo!" ("Victory to the Gods!").',
  },
};

i18n.register(CH2_STRINGS);

export default CH2_STRINGS;
