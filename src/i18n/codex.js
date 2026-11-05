import { i18n } from '../i18n.js';

export function registerCodexStrings() {
  i18n.register({
    'zh-Hant': {
      // Toasts & Prompts
      'toast.codexUnlock': '📜 新圖鑑：{title}',
      'toast.waypointUnlock': '✨ 已啟用經幡傳送點：{name}',
      'toast.waypointTeleport': '🌀 已傳送至：{name}',
      'toast.waypointNeedStand': '需站在已啟用的經幡傳送點旁，方可傳送至其他聖地',
      'toast.recallInterrupted': '⚠️ 回塔引導中斷',
      'toast.recallComplete': '🪷 已藉回塔符返回博達哈大佛塔（歸途之門已開啟）',
      'toast.recallReturn': '🌀 已穿過歸途之門，返回原處',
      'toast.recallInHub': '目前已在大佛塔聖域內，無須使用回塔符',
      'toast.recallInBoss': '首領交戰中無法引導回塔符',

      'prompt.waypoint': '經幡傳送點（開啟世界地圖傳送）',
      'prompt.returnPortal': '穿過歸途之門（返回 {map}）',
      'hud.recalling': '回塔引導中… ({sec}s)',
      'hud.minimapHint': 'M 地圖/圖鑑 · Tab 縮放 ({zoom}m) · B 回塔',
      'hud.openMapCodex': '地圖與圖鑑 (M)',

      // Modal & Tabs
      'mapModal.title': '聖境輿圖與法教圖鑑',
      'mapModal.tab.map': '🗺️ 區域地圖',
      'mapModal.tab.world': '🏔️ 世界輿圖',
      'mapModal.tab.codex': '📜 法教圖鑑',
      'mapModal.close': '關閉 (Esc / M)',

      // Zone Map Tab
      'mapModal.zone.current': '當前區域：{name}',
      'mapModal.zone.zoom': '視野半徑：{radius}m',
      'mapModal.legend.title': '圖例說明',
      'mapModal.legend.player': '行者（自身位置與朝向）',
      'mapModal.legend.waypoint': '經幡傳送點',
      'mapModal.legend.gate': '區域界門 / 歸途之門',
      'mapModal.legend.shrine': '加持聖龕 / 瑪尼石堆',
      'mapModal.legend.npc': '大德 / 善知識 (NPC)',
      'mapModal.legend.quest': '追蹤任務目標',
      'mapModal.legend.enemyNormal': '尋常魔障（普通）',
      'mapModal.legend.enemyChampion': '精銳魔障（勇士）',
      'mapModal.legend.enemyRare': '稀有魔障（頭目）',
      'mapModal.legend.enemyBoss': '大魔首領（Boss）',

      // World Map Tab
      'mapModal.world.subtitle': '蓮師入藏古道・聖地經幡網路',
      'mapModal.world.canTeleport': '✨ 你正站在經幡傳送點旁 — 點擊任一已解鎖聖地即可傳送',
      'mapModal.world.cannotTeleport': '💡 提示：前往各區域的「經幡傳送點」互動（按 E），即可於此輿圖直接傳送',
      'mapModal.world.status.current': '當前所在',
      'mapModal.world.status.unlocked': '經幡已啟用（點擊傳送）',
      'mapModal.world.status.unlockedView': '經幡已啟用',
      'mapModal.world.status.locked': '經幡未啟用',
      'mapModal.world.status.unreached': '章節尚未開放',
      'mapModal.world.teleportBtn': '🌀 傳送至此聖地',

      // World Map Route Nodes
      'worldNode.stupa.name': '博達哈大佛塔',
      'worldNode.stupa.level': 'Lv.1 聖域樞紐',
      'worldNode.stupa.desc': '加德滿都谷地滿願大佛塔，夏絨卡秀大願之始。',
      'worldNode.wild.name': '北郊原野',
      'worldNode.wild.level': 'Lv.1–5 試煉郊野',
      'worldNode.wild.desc': '佛塔北門外的荒原與古白塔遺蹟，無明怨念徘徊之地。',
      'worldNode.pharping.name': '帕平・揚列雪',
      'worldNode.pharping.level': 'Lv.1–8 序章／第一章',
      'worldNode.pharping.desc': '阿修羅岩洞與揚列雪聖地，蓮師修持金剛橛降伏魔障之處。',
      'worldNode.mangyul.name': '芒域山口',
      'worldNode.mangyul.level': 'Lv.8–15 第二章',
      'worldNode.mangyul.desc': '尼藏邊境喜馬拉雅風雪隘口，吐蕃信使迎請蓮師入藏古道。',
      'worldNode.yarlung.name': '雅隆河谷',
      'worldNode.yarlung.level': 'Lv.15–22 第三章',
      'worldNode.yarlung.desc': '吐蕃王朝發源河谷，山神與十二丹瑪女神受調伏立誓護法之地。',
      'worldNode.samye.name': '海波日山・桑耶寺',
      'worldNode.samye.level': 'Lv.22–32 第四章',
      'worldNode.samye.desc': '紅山之麓、雅魯藏布江畔，佛法僧三寶具足的第一座寺院。',
      'worldNode.chimpu.name': '青朴修行地',
      'worldNode.chimpu.level': 'Lv.32–40 第五章',
      'worldNode.chimpu.desc': '桑耶寺東北群山岩洞，蓮師向王臣二十五弟子傳授大圓滿密法之聖地。',
      'worldNode.zangdokPalri.name': '伏藏界・銅色吉祥山',
      'worldNode.zangdokPalri.level': 'Lv.35–40 終章秘境',
      'worldNode.zangdokPalri.desc': '蓮師伏藏心要顯化之淨土幻境，超越時空的覺性試煉。',
      'worldNode.sandbox.name': '試煉沙盒',
      'worldNode.sandbox.level': 'Lv.1 測試場',
      'worldNode.sandbox.desc': '系統驗證與修持演練之沙盒庭園。',

      // Codex Tab
      'codex.filter.all': '全部',
      'codex.filter.place': '聖地',
      'codex.filter.person': '人物',
      'codex.filter.deity': '本尊護法',
      'codex.filter.concept': '義理',
      'codex.filter.practice': '修持',
      'codex.tag.history': '〔史實〕',
      'codex.tag.legend': '〔傳說〕',
      'codex.collected': '已收錄：{unlocked} / {total}',
      'codex.locked.title': '？？？',
      'codex.locked.hint': '於聖境探索、修持功德或推進法脈傳記後解鎖此條目。',
      'codex.sources.title': '考據與延伸閱讀',
      'codex.chapter.label': '第 {ch} 章',
      'codex.chapter.prologue': '序章・聖境源流',

      // 1. boudhanath
      'codex.boudhanath.title': '博達哈大佛塔',
      'codex.boudhanath.body':
        '博達哈大佛塔（Boudhanath，藏語稱「夏絨卡秀」）坐落於尼泊爾加德滿都谷地東側，是喜馬拉雅地區規模最宏偉的覆鉢式佛塔之一，亦為藏尼古商道上的信仰核心。據歷史考證，佛塔基座約始建於西元五至六世紀李查維王朝時期，歷代多次修繕。整座建築呈立體曼荼羅結構：底層三級白色折角基台象徵地大，渾圓覆鉢象徵水大，方形塔頸四面繪有遍知佛眼，十三層相輪代表十三地菩薩階位，頂端華蓋與寶瓶直指空性。數百年來信眾每日順時針繞塔持咒，並於1979年列入聯合國世界文化遺產。',

      // 2. kora
      'codex.kora.title': '繞塔（轉經）',
      'codex.kora.body':
        '繞塔（梵語 Pradakṣiṇa，藏語稱「廓拉」Kora）是佛教與印度古老宗教傳統中極具代表性的身業修持。自古印度時期起，信眾便以右肩朝向佛陀、佛塔、聖山或寺院，依順時針方向緩步繞行，以此表達至誠恭敬。在藏傳佛教實踐中，佛塔被視為諸佛法身與宇宙壇城的象徵；行者以清淨心順時針繞行時，步伐如日月星辰循軌道運轉，象徵隨順正法、調伏散亂心念。繞塔時通常配合口誦六字大明咒、蓮師心咒，手撥念珠或轉動轉經輪，使身、語、意三門同時安住於善法之中。在博達哈大佛塔或拉薩八廓街，每日皆可見成千上萬信眾絡繹不絕地順時針繞行，將日常步伐化為利益眾生的修行。',

      // 3. prostration
      'codex.prostration.title': '大禮拜（五體投地）',
      'codex.prostration.body':
        '大禮拜（藏語稱「恰擦」Chagtsal）即五體投地禮，是藏傳佛教四加行（前行修法）與日常朝聖的核心修持之一。行者首先雙手合十如蓮花苞，依序觸及頭頂（身）、喉間（語）、心間（意），象徵清淨自身三門罪障並領受諸佛身語意加持；隨後雙手觸地、雙膝跪下，乃至全身俯伏貼地、雙臂前伸合掌過頂，再迅速起身。在佛教義理中，大禮拜並非對外在權威的屈從，而是藉由放低身段來破除五毒中最難調伏的「我慢」（傲慢與我執）。朝聖者甚至會以三步一磕的方式，從家鄉歷時數月乃至數年長途跋涉至聖塔與聖山，在每一次俯身與站起之間錘鍊菩提心與堅毅不拔的願力。',

      // 4. butterLamp
      'codex.butterLamp.title': '酥油燈（供燈）',
      'codex.butterLamp.body':
        '酥油燈（藏語稱「卓瑪」Chöme）是以犛牛或黃牛提煉的純淨酥油為燃料、棉線為燈芯所點燃的供佛明燈，廣泛見於喜馬拉雅與藏地各寺院及佛塔四周。在佛教供養儀軌中，「燈」居於塗香、花、燒香、飲食等供品之核心，象徵以般若智慧之光破除無明愚癡的黑暗。《華嚴經》與《施燈功德經》皆記載，以清淨心於佛塔或佛前燃燈供養，能令心眼清明、知見端正。在高原寒冷缺氧的環境中，酥油燈溫暖而穩定的金色火焰不僅照亮了幽暗的殿堂與經堂，更提醒行者：如同燈芯燃燒酥油化為光明，修行亦當以慈悲與智慧轉化煩惱，照亮自他解脫之道。',

      // 5. prayerWheel
      'codex.prayerWheel.title': '轉經輪（瑪尼輪）',
      'codex.prayerWheel.body':
        '轉經輪（藏語稱「瑪尼廓洛」Mani Khorlo）是藏傳佛教獨具特色的法器與修持設施，小至手持搖轉的木柄銅輪，大至排列於佛塔與寺院迴廊四周、需雙手推轉的巨型經筒。轉經輪內部緊密捲藏著成千上萬遍印製或手寫的《六字大明咒》等經咒，並嚴格依循順時針方向（從上方俯視）轉動。其歷史淵源可追溯至大乘佛教「轉法輪」（Dharmacakra）之象徵，並在藏地發展出結合風、水、火、土四大元素的轉經傳統。從修行心要而言，推動轉經輪並非機械式的替代誦經，而是藉由手觸法輪、耳聞軸樞輕響、心觀咒字放光利益六道有情，讓每一次轉動都成為慈悲願力的具體展現。',

      // 6. maniStone
      'codex.maniStone.title': '瑪尼石堆（瑪尼堆）',
      'codex.maniStone.body':
        '瑪尼石（Mani Stone）是鐫刻有六字大明咒「嗡瑪尼唄美吽」、諸佛菩薩聖號、經文或佛眼圖騰的石板與卵石；由無數瑪尼石日積月累疊砌而成的石堆或長牆，即稱為「瑪尼堆」或「瑪尼牆」。這一傳統融合了古老喜馬拉雅高原本土的壘石祭祀習俗與佛教刻經傳播的願力，廣泛分布於山口隘道、河畔橋頭、寺院周邊與朝聖古道。每當行旅者與朝聖者經過瑪尼石堆時，皆會依順時針方向從左側繞行而過，並親手添上一塊潔淨石頭或虔誠持咒。歷經數百年風霜雨雪，石面上的藏文咒語在自然風化中與山川大地融為一體，成為高原上靜默卻恆常不息的祝福座標。',

      // 7. omManiPadmeHum
      'codex.omManiPadmeHum.title': '六字大明咒（嗡瑪尼唄美吽）',
      'codex.omManiPadmeHum.body':
        '「嗡瑪尼唄美吽」（梵語 Oṃ Maṇi Padme Hūṃ）是觀世音菩薩（藏語稱「四臂觀音」Chenrezig）的心咒，最早見於大乘經典《佛說大乘莊嚴寶王經》。咒語核心「瑪尼唄美」意為「蓮花中的摩尼寶珠」：蓮花出淤泥而不染，象徵照見五蘊皆空的清淨智慧；摩尼寶珠能滿眾生願，象徵廣大無礙的方便與慈悲；首尾的「嗡」與「吽」則總攝諸佛身語意與圓滿成就。在藏傳佛教義理中，六個音節亦對應淨化天、阿修羅、人、畜生、餓鬼、地獄六道眾生的傲慢、嫉妒、貪欲、愚癡、慳吝與瞋恚六種根本煩惱。',

      // 8. padmasambhava
      'codex.padmasambhava.title': '蓮花生大士（咕嚕仁波切）',
      'codex.padmasambhava.body':
        '蓮花生大士（梵語 Padmasambhava，藏人尊稱「咕嚕仁波切」，意為珍貴上師）是西元八世紀將金剛乘佛教完整傳入西藏的關鍵歷史人物。據古藏文史料《拔協》記載，吐蕃贊普赤松德贊與大堪布寂護在興建桑耶寺受阻時，迎請這位來自烏仗那國（今斯瓦特河谷一帶）的密教大師入藏。他以深邃學養與密續威德調和西藏本土信仰與佛教的衝突，促成桑耶寺落成與首批藏人僧團出家。而在後世伏藏傳記中，蓮師更被奉為蓮花化生的「第二佛陀」，於雪域群山岩洞留下無數伏藏法教（Terma），史實與神聖傳說交織成寧瑪派的教法源頭。',

      // 9. jarungKhashor
      'codex.jarungKhashor.title': '夏絨卡秀的傳說',
      'codex.jarungKhashor.body':
        '《夏絨卡秀大佛塔傳》是流傳於藏尼地區最動人的建塔伏藏傳說。相傳久遠劫前，觀音菩薩悲憫眾生而落淚，淚珠化生為加德滿都谷地的養雞婦人「德昭瑪」。她發願傾盡畢生積蓄興建大佛塔，向國王懇求「一張牛皮大小」的土地；獲准後她將牛皮裁成細長皮繩圍出廣闊塔基，國王感佩其願力而親口說出「夏絨卡秀」（意為「既已許諾，便照此行」）。德昭瑪攜四名兒子背負磚石，臨終前囑咐四子圓滿建塔。塔成之時四子於塔前發願，據傳在西元八世紀轉世為赤松德贊王、寂護堪布、蓮花生大士與巴・賽囊，共同成就佛法在西藏的興盛。',

      // 10. liberation
      'codex.liberation.title': '超度（度脫無明怨念）',
      'codex.liberation.body':
        '在佛教義理中，世間與非人界的暴戾魔障並非天生邪惡的絕對敵人，而是被貪、瞋、癡、慢、疑五毒與深重執念所困的苦難有情。因此，藏傳佛教金剛乘的「降伏法」與「超度」（藏語稱「強瓦」Jangwa）並非出於仇恨的毀滅，而是以大悲心為根本、般若空性為利刃，斬斷束縛眾生的無明業習。當行者以持咒、觀想與正念瓦解怨念的外層武裝時，實則是將其狂亂散逸的心識導歸法界本初的清淨光明，令其從痛苦的執著迴圈中甦醒解脫。在本作旅途中，每一場交鋒皆非殺戮，而是悲智雙運度脫迷失心識的實踐。',

      // 11. samye
      'codex.samye.title': '桑耶寺（不變任運成就寺）',
      'codex.samye.body':
        '桑耶寺位於西藏山南扎囊縣雅魯藏布江北岸、海波日神山南麓，是藏傳佛教歷史上第一座「佛、法、僧」三寶具足的寺院。西元八世紀下半葉（約775至779年間），由吐蕃贊普赤松德贊發起，大堪布寂護設計規畫，並由蓮花生大士主持奠基與鎮伏儀式而建成。全寺建築嚴格依照佛教宇宙觀布局：中央烏策大殿象徵須彌山，底層藏式、中層漢式、頂層印度的「三樣寺」風格見證了多元文化交融。桑耶寺落成後，「七覺士」在此受具足戒出家，並設立譯經院將大量梵漢佛典譯為藏文，奠定藏傳佛教千年根基。',

      // Debug dialogue for E2E test (__stupa.dialogue.open('debug.codexLink'))
      'dialogue.debug.codexLink.speaker': '法脈考據學者',
      'dialogue.debug.codexLink.line1':
        '行者吉祥！這卷古籍記載了[[codex:boudhanath|博達哈大佛塔]]與吐蕃第一座三寶道場[[codex:samye|桑耶寺]]的歷史淵源，點擊藍金色的詞條即可直接翻閱圖鑑考據。',
      'dialogue.debug.codexLink.close': '合十致謝',
    },

    en: {
      // Toasts & Prompts
      'toast.codexUnlock': '📜 New Codex Entry: {title}',
      'toast.waypointUnlock': '✨ Prayer-Flag Waypoint Activated: {name}',
      'toast.waypointTeleport': '🌀 Teleported to: {name}',
      'toast.waypointNeedStand': 'Stand near an activated Prayer-Flag Waypoint to teleport',
      'toast.recallInterrupted': '⚠️ Recall channel interrupted',
      'toast.recallComplete': '🪷 Recalled to Boudhanath Stupa (Return Portal opened)',
      'toast.recallReturn': '🌀 Stepped through the Return Portal back to origin',
      'toast.recallInHub': 'Already inside the Stupa sanctuary',
      'toast.recallInBoss': 'Cannot channel Recall Talisman during a Boss encounter',

      'prompt.waypoint': 'Prayer-Flag Waypoint (Open World Map to Teleport)',
      'prompt.returnPortal': 'Enter Return Portal (Back to {map})',
      'hud.recalling': 'Channeling Recall… ({sec}s)',
      'hud.minimapHint': 'M Map/Codex · Tab Zoom ({zoom}m) · B Recall',
      'hud.openMapCodex': 'Map & Codex (M)',

      // Modal & Tabs
      'mapModal.title': 'Sacred Atlas & Dharma Codex',
      'mapModal.tab.map': '🗺️ Zone Map',
      'mapModal.tab.world': '🏔️ World Map',
      'mapModal.tab.codex': '📜 Dharma Codex',
      'mapModal.close': 'Close (Esc / M)',

      // Zone Map Tab
      'mapModal.zone.current': 'Current Zone: {name}',
      'mapModal.zone.zoom': 'View Radius: {radius}m',
      'mapModal.legend.title': 'Map Legend',
      'mapModal.legend.player': 'Practitioner (Position & Heading)',
      'mapModal.legend.waypoint': 'Prayer-Flag Waypoint',
      'mapModal.legend.gate': 'Zone Gate / Return Portal',
      'mapModal.legend.shrine': 'Blessing Shrine / Mani Stones',
      'mapModal.legend.npc': 'Dharma Master / NPC',
      'mapModal.legend.quest': 'Tracked Quest Target',
      'mapModal.legend.enemyNormal': 'Afflicted Spirit (Normal)',
      'mapModal.legend.enemyChampion': 'Afflicted Spirit (Champion)',
      'mapModal.legend.enemyRare': 'Afflicted Spirit (Rare)',
      'mapModal.legend.enemyBoss': 'Mara Lord (Boss)',

      // World Map Tab
      'mapModal.world.subtitle': "Guru Rinpoche's Himalayan Trail & Waypoint Network",
      'mapModal.world.canTeleport': '✨ Standing near an active Waypoint — click any unlocked node to teleport',
      'mapModal.world.cannotTeleport': '💡 Tip: Interact (E) with a Prayer-Flag Waypoint in the world to fast-travel between unlocked sites',
      'mapModal.world.status.current': 'Current Location',
      'mapModal.world.status.unlocked': 'Waypoint Active (Click to Teleport)',
      'mapModal.world.status.unlockedView': 'Waypoint Active',
      'mapModal.world.status.locked': 'Waypoint Locked',
      'mapModal.world.status.unreached': 'Chapter Not Yet Reached',
      'mapModal.world.teleportBtn': '🌀 Teleport Here',

      // World Map Route Nodes
      'worldNode.stupa.name': 'Boudhanath Stupa',
      'worldNode.stupa.level': 'Lv.1 Sanctuary Hub',
      'worldNode.stupa.desc': 'The Great Stupa of the Kathmandu Valley, where the vow of Jarung Khashor began.',
      'worldNode.wild.name': 'Northern Outskirts',
      'worldNode.wild.level': 'Lv.1–5 Outskirts',
      'worldNode.wild.desc': 'Untamed plains and ancient chorten ruins north of the Stupa.',
      'worldNode.pharping.name': 'Pharping · Yangleshö',
      'worldNode.pharping.level': 'Lv.1–8 Prologue / Ch.1',
      'worldNode.pharping.desc': 'The Asura Cave where Padmasambhava practiced Vajrakilaya and subdued obstacles.',
      'worldNode.mangyul.name': 'Mangyul Pass',
      'worldNode.mangyul.level': 'Lv.8–15 Chapter 2',
      'worldNode.mangyul.desc': 'Snow-swept Himalayan border pass along the ancient route into Tibet.',
      'worldNode.yarlung.name': 'Yarlung Valley',
      'worldNode.yarlung.level': 'Lv.15–22 Chapter 3',
      'worldNode.yarlung.desc': 'Cradle of the Tibetan Empire where local deities were bound by oath as Dharma protectors.',
      'worldNode.samye.name': 'Hepori · Samye Monastery',
      'worldNode.samye.level': 'Lv.22–32 Chapter 4',
      'worldNode.samye.desc': 'Beneath Mount Hepori by the Brahmaputra, the first monastery of the Three Jewels in Tibet.',
      'worldNode.chimpu.name': 'Chimpu Hermitage',
      'worldNode.chimpu.level': 'Lv.32–40 Chapter 5',
      'worldNode.chimpu.desc': 'High mountain caves northeast of Samye where the Guru transmitted Dzogchen to his 25 disciples.',
      'worldNode.zangdokPalri.name': 'Terma Realm · Zangdok Palri',
      'worldNode.zangdokPalri.level': 'Lv.35–40 Endgame Realm',
      'worldNode.zangdokPalri.desc': 'The Copper-Colored Mountain Pure Land manifested from hidden treasure teachings.',
      'worldNode.sandbox.name': 'Trial Sandbox',
      'worldNode.sandbox.level': 'Lv.1 Test Grounds',
      'worldNode.sandbox.desc': 'Verification courtyard for practicing movement, mantras, and interactions.',

      // Codex Tab
      'codex.filter.all': 'All',
      'codex.filter.place': 'Places',
      'codex.filter.person': 'Persons',
      'codex.filter.deity': 'Deities',
      'codex.filter.concept': 'Concepts',
      'codex.filter.practice': 'Practices',
      'codex.tag.history': '[History]',
      'codex.tag.legend': '[Legend]',
      'codex.collected': 'Collected: {unlocked} / {total}',
      'codex.locked.title': '???',
      'codex.locked.hint': 'Explore sacred sites, perform merit practices, or advance the story to unlock this entry.',
      'codex.sources.title': 'Historical Sources & Further Reading',
      'codex.chapter.label': 'Chapter {ch}',
      'codex.chapter.prologue': 'Prologue · Sacred Origins',

      // 1. boudhanath
      'codex.boudhanath.title': 'Boudhanath Stupa',
      'codex.boudhanath.body':
        'Boudhanath (known in Tibetan as Jarung Khashor) stands in the eastern Kathmandu Valley of Nepal as one of the largest hemispherical stupas in the Himalayan world and a vital hub along the ancient trans-Himalayan trade and pilgrimage route. Historical evidence dates its earliest foundations to the Licchavi period (5th–6th centuries CE). Built as a vast three-dimensional mandala, its three terraced plinths represent earth, the hemispherical dome represents water, the square harmika painted with all-seeing Buddha eyes represents fire, the thirteen-stepped spire symbolizes the thirteen bodhisattva grounds, and the pinnacle parasol points to boundless space. Listed as a UNESCO World Heritage Site in 1979, it remains a living center of daily kora and devotion for Newar and Tibetan Buddhists alike.',

      // 2. kora
      'codex.kora.title': 'Kora (Circumambulation)',
      'codex.kora.body':
        'Kora (Sanskrit: Pradakṣiṇa) is the ancient Buddhist practice of walking clockwise around a sacred object—such as a stupa, temple, or holy mountain—while keeping one’s right shoulder turned respectfully toward the center. In Tibetan Buddhist tradition, a stupa embodies the enlightened mind (Dharmakāya) and the cosmic mandala; walking clockwise aligns the practitioner’s body and mind with the natural harmony of the Dharma. Practitioners typically combine steady footsteps with reciting mantras, counting mala beads, or spinning prayer wheels, uniting body, speech, and mind in mindful devotion.',

      // 3. prostration
      'codex.prostration.title': 'Full Prostration (Chagtsal)',
      'codex.prostration.body':
        'Full-body prostration (Tibetan: Chagtsal) is a foundational physical and spiritual practice in Tibetan Buddhism. The practitioner brings palms together in a lotus mudra touching the crown, throat, and heart—purifying actions of body, speech, and mind—before kneeling and extending the entire body flat along the ground with arms stretched overhead. Philosophically, prostration is not submission to worldly authority, but a direct antidote to pride and ego-clinging (one of the five root poisons). Pilgrims often perform prostrations around sacred stupas or across thousands of kilometers along Himalayan pilgrimage trails to cultivate humility and bodhicitta.',

      // 4. butterLamp
      'codex.butterLamp.title': 'Butter Lamp Offering (Chöme)',
      'codex.butterLamp.body':
        'Butter lamps (Tibetan: Chöme), fueled by clarified yak or cow butter and lit with a cotton wick, burn continuously in shrines and around stupas across the Himalayas. Among traditional Buddhist offerings, light occupies a central place as the symbol of prajñā (transcendent wisdom) dispelling the darkness of avidyā (fundamental ignorance). Classical sutras state that offering light with a pure aspiration clarifies perception and awakens inner insight—just as the wick transforms butter into warm golden radiance, practice transforms affliction into wisdom and compassion.',

      // 5. prayerWheel
      'codex.prayerWheel.title': 'Prayer Wheel (Mani Khorlo)',
      'codex.prayerWheel.body':
        'The prayer wheel (Tibetan: Mani Khorlo) is a cylindrical wheel mounted on a spindle and tightly packed with thousands of printed or handwritten mantras, most commonly Om Mani Padme Hum. Ranging from small hand-turned cylinders to rows of large bronze drums lining stupa corridors, they are always spun clockwise. Rooted in the metaphor of "turning the Wheel of Dharma," spinning a prayer wheel with mindfulness combines physical motion with mental visualization—imagining the syllables radiating compassion to beings throughout the six realms.',

      // 6. maniStone
      'codex.maniStone.title': 'Mani Stone Mound',
      'codex.maniStone.body':
        'Mani stones are slate plates or river cobbles inscribed in Tibetan script with the six-syllable mantra Om Mani Padme Hum, sacred seed syllables, or deity motifs. Stacked over centuries along mountain passes, river crossings, and pilgrimage paths into cairns and long "Mani walls," they blend indigenous Himalayan stone-stacking customs with Buddhist devotion. Travelers traditionally pass Mani mounds on the left (clockwise) and add a stone with a silent prayer, leaving an enduring landscape of carved blessings across the plateau.',

      // 7. omManiPadmeHum
      'codex.omManiPadmeHum.title': 'Om Mani Padme Hum',
      'codex.omManiPadmeHum.body':
        'Oṃ Maṇi Padme Hūṃ (Tibetan: ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ) is the six-syllable heart mantra of Avalokiteśvara (Chenrezig), the Bodhisattva of Compassion, first attested in the Mahāyāna Kāraṇḍavyūha Sūtra. Literally meaning "Praise to the Jewel in the Lotus," the lotus symbolizes wisdom untainted by delusion, while the wish-fulfilling jewel represents skilful means and boundless compassion. In Tibetan commentary, the six syllables purify the six root afflictions—pride, jealousy, desire, ignorance, greed, and anger—across the six realms of cyclic existence.',

      // 8. padmasambhava
      'codex.padmasambhava.title': 'Padmasambhava (Guru Rinpoche)',
      'codex.padmasambhava.body':
        'Padmasambhava ("Lotus-Born," revered in Tibet as Guru Rinpoche, the "Precious Master") was an 8th-century tantric master from Oddiyana (commonly identified with the Swat Valley region) who played a decisive historical role in establishing Buddhism in Tibet. Early historical chronicles such as the Testament of Ba (Bahed) record that King Trisong Detsen and Abbot Śāntarakṣita invited him to Tibet around the 770s to pacify obstacles hindering the construction of Samye Monastery. Beyond this historical core, sacred hagiographies (Namthar) revere him as a "Second Buddha" miraculously born on a lotus in Lake Dhanakosha who concealed spiritual treasures (Terma) across the Himalayas for future generations.',

      // 9. jarungKhashor
      'codex.jarungKhashor.title': 'The Legend of Jarung Khashor',
      'codex.jarungKhashor.body':
        'The Legend of Jarung Khashor is a celebrated Tibetan treasure text (Terma) recounting the mythical origin of the Boudhanath Stupa. In a past age, a humble poultry-keeper named Jadzima asked the local king for as much land as could be covered by a single oxhide; cutting the hide into a thin continuous strip, she enclosed the grand footprint of the Stupa, and the king honored his word ("Jarung Khashor" — "Once promised, let it be done"). Assisted by her four sons, she laid the foundations before passing away. Upon completing the great stupa, her four sons made sacred vows in front of it—reincarnating in the 8th century as King Trisong Detsen, Abbot Śāntarakṣita, Padmasambhava, and the minister Ba Salnang to establish the Dharma in Tibet.',

      // 10. liberation
      'codex.liberation.title': 'Liberation of Afflicted Spirits',
      'codex.liberation.body':
        'In Buddhist philosophy, hostile spirits and inner obstacles are not inherently evil enemies to be hated, but sentient beings trapped in knots of karmic delusion, fear, and attachment. Wrathful compassion and liberation rituals (Jangwa) in the Vajrayāna tradition aim not at malice or destruction, but at cutting through ignorance with wisdom and guiding bewildered consciousness back toward luminous clarity. In this journey, every encounter in the wilderness is an act of liberating afflicted mindstreams rather than slaughter.',

      // 11. samye
      'codex.samye.title': 'Samye Monastery',
      'codex.samye.body':
        'Samye Monastery (Glorious Unchanging Spontaneously Accomplished Vihara), situated at the foot of Mount Hepori on the northern bank of the Yarlung Tsangpo River in Dranang, is the first monastery in Tibetan history to unite the Three Jewels of Buddha, Dharma, and Sangha. Founded in the late 8th century (c. 775–779 CE) under the patronage of Emperor Trisong Detsen, designed by Abbot Śāntarakṣita, and consecrated by Padmasambhava, its layout forms a vast cosmic mandala centered on the three-story Ütse main hall representing Mount Meru (built in Tibetan, Chinese, and Indian architectural styles). Here the first seven Tibetan monks ("the Seven Men Tested") were ordained and great Sanskrit scriptures were translated into Tibetan.',

      // Debug dialogue
      'dialogue.debug.codexLink.speaker': 'Dharma Historian',
      'dialogue.debug.codexLink.line1':
        'Greetings, traveler! This scroll chronicles the sacred bond between [[codex:boudhanath|Boudhanath Stupa]] and Tibet’s first monastery, [[codex:samye|Samye Monastery]]. Click either highlighted term to open its Codex card directly.',
      'dialogue.debug.codexLink.close': 'Thank you',
    },
  });
}

registerCodexStrings();

