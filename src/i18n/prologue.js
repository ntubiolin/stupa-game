import { i18n } from '../i18n.js';

export const PROLOGUE_STRINGS = {
  'zh-Hant': {
    // Town NPC Names & Subtitles
    'npc.oldLama': '老喇嘛・洛桑',
    'npc.oldLama.role': '滿願大佛塔守塔上師',
    'npc.merchant': '法器商人・諾布',
    'npc.merchant.role': '尼泊爾法器與甘露商販',
    'npc.artisan': '蓮花工匠・白瑪',
    'npc.artisan.role': '密乘聖物分解與重鑄匠師',

    // Interaction Prompts
    'prompt.talkOldLama': '與老喇嘛・洛桑交談',
    'prompt.openShop': '與法器商人・諾布交易',
    'prompt.openCrafting': '請蓮花工匠・白瑪鍛造',

    // Dharma Merchant Shop UI (src/ui/shop.js)
    'shop.title': '法器商人・諾布',
    'shop.subtitle': '隨緣結緣護身法器 · 返城或每 10 分鐘更新庫存',
    'shop.stockTitle': '商鋪法器庫存 (8)',
    'shop.bagTitle': '行囊背袋',
    'shop.refreshIn': '下次更新：{time}',
    'shop.refreshBtn': '更新庫存',
    'shop.buyBtn': '購買',
    'shop.sellBtn': '販售',
    'shop.sellAllCommonBtn': '批次販售普通物品',
    'shop.price.buy': '售價：{n} 綠松石',
    'shop.price.sell': '回收：{n} 綠松石',
    'shop.stockEmpty': '目前庫存已售罄，稍後或自原野返城將補充新法器。',
    'shop.bagEmpty': '背袋內暫無可販售的法器。',
    'shop.compareTitle': '法器檢視與穿戴比對',
    'shop.compareHint': '懸停或點擊左側商品／右側背袋物品，即可比對目前已穿戴裝備',
    'shop.equippedLabel': '目前穿戴 ({slot})',
    'shop.equippedNone': '此欄位尚未穿戴裝備',
    'shop.amritaRefilled': '諾布笑著遞上甘露丸：「朝聖路遠，甘露丸已為你免費補滿！」',
    'shop.toast.bought': '已購得法器：{name}（-{cost} 綠松石）',
    'shop.toast.sold': '已販售法器：{name}（+{gain} 綠松石）',
    'shop.toast.soldAllCommon': '已批次販售 {count} 件普通物品（+{gain} 綠松石）',
    'shop.toast.noCommonToSell': '背袋中沒有可批次販售的普通物品',
    'shop.toast.noTurquoise': '綠松石不足（需要 {cost}）',
    'shop.toast.bagFull': '背袋已滿，請先販售或分解法器',
    'shop.toast.refreshed': '法器商人已進貨全新一批隨身聖物',
    'shop.closeHint': '按 Esc 關閉商鋪',

    // Lotus Artisan Crafting UI (src/ui/crafting.js)
    'crafting.title': '蓮花工匠・白瑪',
    'crafting.subtitle': '分解多餘法器化為靈材 · 重鑄加持詞綴淬鍊聖物',
    'crafting.tab.salvage': '分解法器',
    'crafting.tab.reforge': '重鑄詞綴',
    'crafting.mat.turquoiseShard': '碎綠松石',
    'crafting.mat.goldDust': '金粉',
    'crafting.mat.termaEssence': '伏藏精華',
    'crafting.salvage.bagTitle': '選擇要分解的背袋法器',
    'crafting.salvage.btn': '分解',
    'crafting.salvage.allCommonBtn': '批次分解普通物品',
    'crafting.salvage.yieldLabel': '分解可獲材料：',
    'crafting.salvage.rulesTitle': '分解靈材產出規則',
    'crafting.salvage.rule.normal': '普通 (白)：碎綠松石 ×1',
    'crafting.salvage.rule.blessed': '加持 (藍)：碎綠松石 ×2 + 金粉 ×1',
    'crafting.salvage.rule.rare': '稀有 (金)：金粉 ×3',
    'crafting.salvage.rule.terma': '伏藏 (橙)：伏藏精華 ×1',
    'crafting.salvage.empty': '背袋內暫無可分解的法器。',
    'crafting.reforge.listTitle': '選擇要重鑄的聖物（加持／稀有／伏藏）',
    'crafting.reforge.equippedTag': '已穿戴',
    'crafting.reforge.bagTag': '背袋',
    'crafting.reforge.emptyEligible': '尚無可重鑄的裝備（需為「加持」、「稀有」或「伏藏」品質）。',
    'crafting.reforge.selectPrompt': '請從左側選擇一件加持以上的法器以檢視詞綴',
    'crafting.reforge.affixTitle': '選擇要重鑄的詞綴槽',
    'crafting.reforge.lockRuleHint': '重鑄規則：首次重鑄後將「鎖定該詞綴槽」，後續僅能針對同一槽位再次重鑄。',
    'crafting.reforge.lockedBadge': '已鎖定槽位',
    'crafting.reforge.lockedOtherBadge': '已鎖定其他槽位',
    'crafting.reforge.unlockedBadge': '可選槽位',
    'crafting.reforge.countLabel': '已重鑄次數：{n} 次',
    'crafting.reforge.costLabel': '本次重鑄消耗：',
    'crafting.reforge.rollBtn': '重鑄詞綴',
    'crafting.reforge.choicesTitle': '蓮花爐火顯化三道新詞綴（三選一或保留原詞綴）',
    'crafting.reforge.choiceBadge': '新詞綴選項 #{n}',
    'crafting.reforge.applyChoiceBtn': '選用此詞綴',
    'crafting.reforge.keepOriginalBtn': '保留原詞綴：{text}',
    'crafting.toast.salvaged': '已分解 {name}，獲得：{yield}',
    'crafting.toast.salvagedAllCommon': '已批次分解 {count} 件普通物品，獲得：碎綠松石 ×{shards}',
    'crafting.toast.noCommonToSalvage': '背袋中沒有可批次分解的普通物品',
    'crafting.toast.cannotReforgeNormal': '普通品質物品無法重鑄，請選擇加持、稀有或伏藏聖物',
    'crafting.toast.affixLocked': '此聖物已鎖定第 {slot} 條詞綴槽，僅能重鑄該槽位',
    'crafting.toast.insufficientCost': '重鑄材料或綠松石不足',
    'crafting.toast.reforgeRolled': '蓮花工匠已淬鍊出 3 項候選詞綴，請擇一銘刻或保留原詞綴',
    'crafting.toast.reforgeApplied': '詞綴重鑄完成：{stat}',
    'crafting.toast.reforgeKept': '已保留原有詞綴：{stat}',
    'crafting.closeHint': '按 Esc 關閉工坊',

    // Prologue Collectibles
    'quest.item.oldPilgrimMap': '古老的朝聖地圖',

    // Prologue Quest P1: prologue.vow（「養禽婦的誓願」）
    'quest.prologue.vow.title': '養禽婦的誓願',
    'quest.prologue.vow.desc':
      '守塔老喇嘛洛桑在滿願大佛塔南側向你合十致意。用你的雙足順時針繞行大佛塔一圈、點亮三盞酥油燈，再聆聽這座「夏絨卡秀」大佛塔與吐蕃佛法源頭的古老誓願。',
    'quest.prologue.vow.step.talk_intro': '與南側廣場的老喇嘛・洛桑交談',
    'quest.prologue.vow.step.kora': '順時針繞行滿願大佛塔 1 圈（以腳步聆聽佛塔）',
    'quest.prologue.vow.step.light': '點亮佛塔周圍的 3 盞酥油燈',
    'quest.prologue.vow.step.talk_legend': '返回向老喇嘛・洛桑聆聽「夏絨卡秀」的建塔傳說',

    // Prologue Quest P2: prologue.north（「北門之外」）
    'quest.prologue.north.title': '北門之外',
    'quest.prologue.north.desc':
      '老喇嘛洛桑提及北郊原野近來障氣躁動。前往北郊原野超度 10 個障礙、在傾斜瑪尼堆旁尋回「古老的朝聖地圖」，並調伏盤踞北境的雪人王，最後回稟老喇嘛開啟前往帕平的淨相之路。',
    'quest.prologue.north.step.talk_intro': '向老喇嘛・洛桑詢問北郊原野的異狀',
    'quest.prologue.north.step.liberate': '在北郊原野超度 10 個障礙',
    'quest.prologue.north.step.collect_map': '在北郊原野中段傾斜瑪尼堆旁尋回「古老的朝聖地圖」',
    'quest.prologue.north.step.boss_migoi': '調伏北郊原野深處的「雪人王」',
    'quest.prologue.north.step.talk_report': '帶著古老的朝聖地圖返回向老喇嘛・洛桑回稟',

    // Chapter I Unlock Banner & World Map Toast
    'prologue.banner.chapter1.kicker': '聖地航線已開啟 · 進入蓮師淨相',
    'prologue.banner.chapter1.title': '「第一章：帕平・揚列雪」',
    'prologue.banner.chapter1.sub': '尼泊爾帕平岩洞 —— 蓮花生大士修持金剛橛與大手印之聖地',
    'prologue.toast.pharpingComingSoon': '第一章：帕平・揚列雪 即將開放',

    // Dialogues — Old Lama: Quest P1 Intro
    'dlg.prologue.vowIntro.1':
      '札西德勒，遠道而來的行者。你站在加德滿都谷地最古老的聖塔前——你知道這座[[codex:boudhanath|滿願大佛塔]]（藏人稱之為「[[codex:jarungKhashor|夏絨卡秀]]」）最初是由誰建造的嗎？',
    'dlg.prologue.vowIntro.2':
      '在聽我訴說這段傳奇之前，請先用你的雙足順時針繞行大佛塔一圈，親手點亮三盞酥油燈。當心念隨步伐沉澱，佛塔自會向你敞開它的記憶。',
    'dlg.prologue.vowIntro.choice.accept': '謹遵教誨，我這就繞塔並點亮酥油燈',
    'dlg.prologue.vowIntro.choice.askStupa': '請先告訴我什麼是「夏絨卡秀」？',
    'dlg.prologue.vowIntro.askReply':
      '「[[codex:jarungKhashor|夏絨卡秀]]」（bya rung kha shor）意為「既已應允，話已出口」。去吧，先繞塔一圈、點亮三盞酥油燈，回來後我再將養禽婦與四子的誓願娓娓道來。',

    // Dialogues — Old Lama: Quest P1 Active (waiting for kora & 3 lamps)
    'dlg.prologue.vowActive.1':
      '行者，請順著大佛塔外圍的轉經道順時針繞行一圈，並點亮三盞酥油燈。完成後再來聽我講述[[codex:jarungKhashor|夏絨卡秀]]的故事吧。',
    'dlg.prologue.vowActive.choice.ok': '我明白，這就前去完成',

    // Dialogues — Old Lama: Quest P1 Legend of Jarung Khashor (5 nodes)
    'dlg.prologue.vowLegend.1':
      '善哉！你的步伐穩健，酥油燈的光明已映照塔身。根據蓮師伏藏《大佛塔傳記》記載，久遠以前，此地有一位貧苦卻虔誠的養禽婦「夏瓦日」（Jadzimo），立誓要建造一座安奉諸佛舍利的大佛塔。',
    'dlg.prologue.vowLegend.2':
      '養禽婦向國王懇求賜予「一張牛皮大小」的土地建塔，國王隨口應允：「可以去做（Jarung）。」想不到她將整張牛皮細細裁成一條連綿不斷的細皮繩，圈出了一大片宏偉的塔基！',
    'dlg.prologue.vowLegend.3':
      '大臣們紛紛抗議，請求收回成命；國王卻莊嚴答道：「既已說出『可以去做』，君王的話已出口（Jarung Khashor），豈能反悔！」這便是大佛塔藏文名號「[[codex:jarungKhashor|夏絨卡秀]]」（bya rung kha shor）的由來。',
    'dlg.prologue.vowLegend.4':
      '養禽婦與她的四個兒子，帶著一頭驢與一頭象，日夜搬運磚石泥土，歷經數載終於築成這座宏偉大佛塔。竣工之日，四位兒子在佛塔前發下驚天動地的弘法大願——',
    'dlg.prologue.vowLegend.5':
      '一子發願轉世為雪域護法之王「赤松德贊」；一子發願轉世為大堪布「寂護大師」；一子發願化現為調伏一切魔障的密乘大士「[[codex:padmasambhava|蓮花生大士]]」；第四子則發願成為促成三人相會的「一位大臣」。因此，你腳下這座佛塔，正是佛法傳入西藏的起點！請收下這件受加持的法器。',
    'dlg.prologue.vowLegend.choice.complete': '頂禮大佛塔的誓願！請問上師，我接下來該往何處修持？',

    // Dialogues — Old Lama: Quest P2 Intro ("Beyond the North Gate")
    'dlg.prologue.northIntro.1':
      '近來佛塔北門之外的「北郊原野」障氣躁動，山風中夾雜著狂暴的氣息，連往來的朝聖者也在中段傾斜的瑪尼堆附近遺落了珍貴的「古老的朝聖地圖」。',
    'dlg.prologue.northIntro.2':
      '請你穿過北側光門前往北郊原野，超度 10 個徘徊的障礙，在傾斜瑪尼堆旁尋回那張「古老的朝聖地圖」，並調伏盤踞北境石圈的「雪人王」（Migoi King）。平安歸來後，我將為你解讀地圖上的祕密。',
    'dlg.prologue.northIntro.choice.accept': '領受法旨，我立即前往北郊原野',

    // Dialogues — Old Lama: Quest P2 Active
    'dlg.prologue.northActive.1':
      '北郊原野就在大佛塔正北方的光門之外。請超度 10 個障礙、在原野中段傾斜的瑪尼堆旁找回「古老的朝聖地圖」，並調伏深處的「雪人王」。願[[codex:padmasambhava|蓮花生大士]]的加持護佑你。',
    'dlg.prologue.northActive.choice.ok': '我會完成使命再回來回稟',

    // Dialogues — Old Lama: Quest P2 Report & Pure Vision Unlock
    'dlg.prologue.northReport.1':
      '你平安歸來了！連狂暴的雪人王也在你的慈悲與智慧下得獲調伏。讓我看看這張從瑪尼堆旁尋回的羊皮卷……',
    'dlg.prologue.northReport.2':
      '「這是[[codex:padmasambhava|蓮師]]當年的足跡——從尼泊爾的帕平（Pharping · Yangleshö），越過芒域進入吐蕃，一直到[[codex:samye|桑耶寺]]！」羊皮地圖上每一處朱砂印記，都凝聚著蓮花生大士修持與伏魔的壇城記憶。',
    'dlg.prologue.northReport.3':
      '當你在[[codex:boudhanath|滿願大佛塔]]前入定禪修，便能依循這張地圖進入超越時空的「淨相」（Pure Vision），親歷蓮師當年的聖蹟。去吧，按 M 開啟世界航線圖，「第一章：帕平・揚列雪」的聖地航點已為你點亮！',
    'dlg.prologue.northReport.choice.complete': '感恩上師指引，領受「帕平・揚列雪」淨相傳承！',

    // Dialogues — Old Lama: Post-Prologue Completed
    'dlg.prologue.completed.1':
      '願[[codex:jarungKhashor|夏絨卡秀]]大佛塔的誓願常駐你心。當你準備好時，可隨時透過傳送座或按 M 開啟世界地圖，進入「淨相」追尋[[codex:padmasambhava|蓮花生大士]]的足跡。',
    'dlg.prologue.completed.choice.reviewLegend': '我想再次聆聽「夏絨卡秀」建塔與四子發願的傳說',
    'dlg.prologue.completed.choice.close': '合十告退',

    // Dialogues — Dharma Merchant
    'dlg.prologue.merchant.1':
      '札西德勒！我是法器商人諾布。朝聖路途遙遠，我已先為你的甘露寶瓶免費補滿甘露丸！若需要護身金剛杵、唐卡護輪，或是想將原野尋獲的舊物換成綠松石，儘管看看我的攤位。',
    'dlg.prologue.merchant.choice.shop': '開啟法器商鋪（購買／販售法器）',
    'dlg.prologue.merchant.choice.close': '多謝補滿甘露丸，稍後再來光顧',

    // Dialogues — Lotus Artisan
    'dlg.prologue.artisan.1':
      '嗡嘛呢唄美吽。我是蓮花工匠白瑪。凡間的法器若經蓮花爐火分解，可化為碎綠松石、金粉與伏藏精華；若你有受加持以上的聖物，我也能為你重鑄其中的一條詞綴。',
    'dlg.prologue.artisan.choice.craft': '開啟蓮花工坊（分解靈材／重鑄詞綴）',
    'dlg.prologue.artisan.choice.close': '合十致謝，稍後再來鍛造',
  },
  'en': {
    // Town NPC Names & Subtitles
    'npc.oldLama': 'Old Lama Lobsang',
    'npc.oldLama.role': 'Keeper of the Great Stupa',
    'npc.merchant': 'Dharma Merchant Norbu',
    'npc.merchant.role': 'Purveyor of Ritual Implements & Amrita',
    'npc.artisan': 'Lotus Artisan Pema',
    'npc.artisan.role': 'Master of Relic Salvage & Affix Reforging',

    // Interaction Prompts
    'prompt.talkOldLama': 'Talk to Old Lama Lobsang',
    'prompt.openShop': 'Trade with Dharma Merchant Norbu',
    'prompt.openCrafting': 'Craft with Lotus Artisan Pema',

    // Dharma Merchant Shop UI (src/ui/shop.js)
    'shop.title': 'Dharma Merchant Norbu',
    'shop.subtitle': 'Consecrated Implements · Stock refreshes on town return or every 10m',
    'shop.stockTitle': 'Merchant Stock (8)',
    'shop.bagTitle': 'Pilgrim Bag',
    'shop.refreshIn': 'Next refresh: {time}',
    'shop.refreshBtn': 'Refresh Stock',
    'shop.buyBtn': 'Buy',
    'shop.sellBtn': 'Sell',
    'shop.sellAllCommonBtn': 'Sell All Common Items',
    'shop.price.buy': 'Cost: {n} Turquoise',
    'shop.price.sell': 'Value: {n} Turquoise',
    'shop.stockEmpty': 'All implements sold out. Stock refreshes shortly or upon returning from the wilds.',
    'shop.bagEmpty': 'No items in your bag to sell.',
    'shop.compareTitle': 'Item Inspector & Equipped Comparison',
    'shop.compareHint': 'Hover or click any stock or bag item to compare with your currently equipped gear',
    'shop.equippedLabel': 'Currently Equipped ({slot})',
    'shop.equippedNone': 'Nothing equipped in this slot',
    'shop.amritaRefilled': 'Norbu smiles and refills your gourd: "The road is long—your Amrita pills are refilled for free!"',
    'shop.toast.bought': 'Purchased {name} (-{cost} Turquoise)',
    'shop.toast.sold': 'Sold {name} (+{gain} Turquoise)',
    'shop.toast.soldAllCommon': 'Sold {count} common items (+{gain} Turquoise)',
    'shop.toast.noCommonToSell': 'No common items in bag to sell',
    'shop.toast.noTurquoise': 'Not enough Turquoise (Need {cost})',
    'shop.toast.bagFull': 'Bag is full! Sell or salvage items first',
    'shop.toast.refreshed': 'Dharma Merchant Norbu has restocked new ritual implements',
    'shop.closeHint': 'Press Esc to close shop',

    // Lotus Artisan Crafting UI (src/ui/crafting.js)
    'crafting.title': 'Lotus Artisan Pema',
    'crafting.subtitle': 'Salvage implements into sacred materials · Reforge affixes in the lotus flame',
    'crafting.tab.salvage': 'Salvage',
    'crafting.tab.reforge': 'Reforge Affix',
    'crafting.mat.turquoiseShard': 'Turquoise Shard',
    'crafting.mat.goldDust': 'Gold Dust',
    'crafting.mat.termaEssence': 'Terma Essence',
    'crafting.salvage.bagTitle': 'Select Bag Items to Salvage',
    'crafting.salvage.btn': 'Salvage',
    'crafting.salvage.allCommonBtn': 'Salvage All Common Items',
    'crafting.salvage.yieldLabel': 'Salvage Yield:',
    'crafting.salvage.rulesTitle': 'Material Yield by Rarity',
    'crafting.salvage.rule.normal': 'Common (White): Turquoise Shard ×1',
    'crafting.salvage.rule.blessed': 'Blessed (Blue): Turquoise Shard ×2 + Gold Dust ×1',
    'crafting.salvage.rule.rare': 'Rare (Gold): Gold Dust ×3',
    'crafting.salvage.rule.terma': 'Terma (Orange): Terma Essence ×1',
    'crafting.salvage.empty': 'No items in your bag to salvage.',
    'crafting.reforge.listTitle': 'Select Item to Reforge (Blessed / Rare / Terma)',
    'crafting.reforge.equippedTag': 'Equipped',
    'crafting.reforge.bagTag': 'In Bag',
    'crafting.reforge.emptyEligible': 'No eligible gear found (requires Blessed, Rare, or Terma rarity).',
    'crafting.reforge.selectPrompt': 'Select a Blessed, Rare, or Terma item on the left to inspect its affixes',
    'crafting.reforge.affixTitle': 'Select an Affix Slot to Reforge',
    'crafting.reforge.lockRuleHint': 'Lock Rule: After the first reforge, that affix slot becomes locked—future reforges on this item can only re-roll that same slot.',
    'crafting.reforge.lockedBadge': 'Locked Slot',
    'crafting.reforge.lockedOtherBadge': 'Other Slot Locked',
    'crafting.reforge.unlockedBadge': 'Available',
    'crafting.reforge.countLabel': 'Reforge Count: {n}',
    'crafting.reforge.costLabel': 'Reforge Cost:',
    'crafting.reforge.rollBtn': 'Reforge Affix',
    'crafting.reforge.choicesTitle': 'Choose 1 of 3 Lotus-Forged Affixes (or Keep Original)',
    'crafting.reforge.choiceBadge': 'Candidate #{n}',
    'crafting.reforge.applyChoiceBtn': 'Select This Affix',
    'crafting.reforge.keepOriginalBtn': 'Keep Original Affix: {text}',
    'crafting.toast.salvaged': 'Salvaged {name} → {yield}',
    'crafting.toast.salvagedAllCommon': 'Salvaged {count} common items → Turquoise Shard ×{shards}',
    'crafting.toast.noCommonToSalvage': 'No common items in bag to salvage',
    'crafting.toast.cannotReforgeNormal': 'Common items cannot be reforged. Select a Blessed, Rare, or Terma item',
    'crafting.toast.affixLocked': 'Affix slot #{slot} is locked on this item; only that slot may be reforged',
    'crafting.toast.insufficientCost': 'Insufficient Turquoise or crafting materials',
    'crafting.toast.reforgeRolled': '3 candidate affixes rolled! Pick one or keep the original affix',
    'crafting.toast.reforgeApplied': 'Affix reforged: {stat}',
    'crafting.toast.reforgeKept': 'Kept original affix: {stat}',
    'crafting.closeHint': 'Press Esc to close crafting',

    // Prologue Collectibles
    'quest.item.oldPilgrimMap': "Ancient Pilgrim's Map",

    // Prologue Quest P1: prologue.vow ("The Poultrykeeper's Vow")
    'quest.prologue.vow.title': "The Poultrykeeper's Vow",
    'quest.prologue.vow.desc':
      'Old Lama Lobsang greets you on the southern plaza of Boudhanath Stupa. Walk 1 clockwise Kora lap around the Stupa, light 3 butter lamps, and listen to the ancient legend of Jarung Khashor and the vow that brought the Dharma to Tibet.',
    'quest.prologue.vow.step.talk_intro': 'Talk to Old Lama Lobsang on the southern plaza',
    'quest.prologue.vow.step.kora': 'Walk 1 clockwise Kora lap around the Stupa ("Listen with your footsteps")',
    'quest.prologue.vow.step.light': 'Light 3 butter lamps around the Stupa',
    'quest.prologue.vow.step.talk_legend': 'Return to Old Lama Lobsang to hear the legend of Jarung Khashor',

    // Prologue Quest P2: prologue.north ("Beyond the North Gate")
    'quest.prologue.north.title': 'Beyond the North Gate',
    'quest.prologue.north.desc':
      "Old Lama Lobsang senses restless obstacles in the Northern Wilderness. Liberate 10 obstacles in the wilds, recover the Ancient Pilgrim's Map beside the tilted Mani stone cairn, subdue the Migoi King, and report back to unlock the Pure Vision path to Pharping.",
    'quest.prologue.north.step.talk_intro': 'Ask Old Lama Lobsang about the disturbance in the Northern Wilderness',
    'quest.prologue.north.step.liberate': 'Liberate 10 obstacles in the Northern Wilderness',
    'quest.prologue.north.step.collect_map': "Find the Ancient Pilgrim's Map beside the tilted Mani cairn in the mid-wilderness",
    'quest.prologue.north.step.boss_migoi': 'Subdue the Migoi King in the Northern Wilderness arena',
    'quest.prologue.north.step.talk_report': "Return the Ancient Pilgrim's Map to Old Lama Lobsang",

    // Chapter I Unlock Banner & World Map Toast
    'prologue.banner.chapter1.kicker': 'Sacred Route Unlocked · Enter the Pure Vision',
    'prologue.banner.chapter1.title': 'Chapter I: Pharping · Yangleshö',
    'prologue.banner.chapter1.sub': 'Asura Cave of Pharping — Sacred site where Guru Rinpoche attained Vajrakīlaya & Mahāmudrā',
    'prologue.toast.pharpingComingSoon': 'Chapter I: Pharping · Yangleshö — Coming Soon',

    // Dialogues — Old Lama: Quest P1 Intro
    'dlg.prologue.vowIntro.1':
      'Tashi Delek, pilgrim from afar. You stand before the oldest stupa in the Kathmandu Valley—do you know who first built this [[codex:boudhanath|Great Stupa]], known to Tibetans as [[codex:jarungKhashor|Jarung Khashor]]?',
    'dlg.prologue.vowIntro.2':
      'Before I tell you its story, listen to it with your footsteps: walk 1 clockwise Kora lap around the Great Stupa and light 3 butter lamps. When your mind settles into the rhythm of the circuit, the Stupa will speak.',
    'dlg.prologue.vowIntro.choice.accept': 'I will walk the Kora and light three butter lamps',
    'dlg.prologue.vowIntro.choice.askStupa': 'What does the name "Jarung Khashor" mean?',
    'dlg.prologue.vowIntro.askReply':
      '[[codex:jarungKhashor|Jarung Khashor]] (bya rung kha shor) means "the promise \'it may be done\' has slipped from the mouth." Go walk one clockwise lap and light three butter lamps first, then return to hear the full tale.',

    // Dialogues — Old Lama: Quest P1 Active
    'dlg.prologue.vowActive.1':
      'Walk 1 clockwise Kora lap around the Stupa and light 3 butter lamps. Return to me once your offerings are complete to hear the legend of [[codex:jarungKhashor|Jarung Khashor]].',
    'dlg.prologue.vowActive.choice.ok': 'I will complete the circuit and light the lamps',

    // Dialogues — Old Lama: Quest P1 Legend of Jarung Khashor (5 nodes)
    'dlg.prologue.vowLegend.1':
      'Well done, pilgrim! According to the terma chronicle The Legend of the Great Stupa, in ancient times a humble poultrywoman named Jadzimo (Shamvara) vowed to build a great reliquary stupa to house the relics of the Buddhas.',
    'dlg.prologue.vowLegend.2':
      'She petitioned the king for a plot of land the size of a single ox-hide. The king casually consented: "It may be done (Jarung)." She then cut the ox-hide into one razor-thin continuous strip and encircled a grand plot of land!',
    'dlg.prologue.vowLegend.3':
      'When the royal ministers protested, the king declared: "The permission \'it may be done\' has already slipped from my mouth (Jarung Khashor)—a king does not take back his word!" Thus the Great Stupa received its Tibetan name, [[codex:jarungKhashor|Jarung Khashor]] (bya rung kha shor).',
    'dlg.prologue.vowLegend.4':
      'The poultrywoman and her four sons, aided by a donkey and an elephant, labored for years carrying stone and earth until the stupa stood complete. Before the finished spire, the four sons made vast aspirations to spread the Dharma in the snowy land of Tibet—',
    'dlg.prologue.vowLegend.5':
      'One aspired to be reborn as the Dharma King Trisong Detsen; one as the great monastic scholar Śāntarakṣita; one as the tantric master who subdues all obstacles, [[codex:padmasambhava|Padmasambhava]]; and the fourth as a minister who brings the three together. Thus, the stupa beneath your feet is the very starting point from which the Dharma entered Tibet! Receive this blessed implement.',
    'dlg.prologue.vowLegend.choice.complete': 'Homage to the Great Stupa! Venerable Lama, where should I direct my practice next?',

    // Dialogues — Old Lama: Quest P2 Intro
    'dlg.prologue.northIntro.1':
      'Lately, the Northern Wilderness beyond the north gate has grown restless with karmic obstacles, and a traveler dropped an "Ancient Pilgrim\'s Map" beside a tilted Mani stone cairn in the mid-wilderness.',
    'dlg.prologue.northIntro.2':
      'Pass through the northern portal into the Northern Wilderness: liberate 10 obstacles, recover the "Ancient Pilgrim\'s Map" beside the tilted Mani cairn, and subdue the Migoi King in the northern stone arena. Return to me with the map.',
    'dlg.prologue.northIntro.choice.accept': 'I will investigate the Northern Wilderness at once',

    // Dialogues — Old Lama: Quest P2 Active
    'dlg.prologue.northActive.1':
      'Head through the northern gate into the Northern Wilderness: liberate 10 obstacles, find the "Ancient Pilgrim\'s Map" beside the tilted Mani stone cairn in the mid-section, and subdue the Migoi King. May [[codex:padmasambhava|Padmasambhava]] bless your steps.',
    'dlg.prologue.northActive.choice.ok': 'I will return once the wilderness is pacified',

    // Dialogues — Old Lama: Quest P2 Report & Pure Vision Unlock
    'dlg.prologue.northReport.1':
      'You have returned safely, and even the fierce Migoi King has been subdued through compassion and resolve! Let me examine this parchment you recovered beside the Mani cairn...',
    'dlg.prologue.northReport.2':
      '"These are the footsteps of [[codex:padmasambhava|Guru Rinpoche]]—from Pharping in Nepal, across Mangyul into Tibet, all the way to [[codex:samye|Samye]]!" Every vermilion seal on this map resonates with the Master\'s sacred mandalas.',
    'dlg.prologue.northReport.3':
      'When you meditate before [[codex:boudhanath|Boudhanath Stupa]], you can enter the timeless Pure Vision to walk Guru Rinpoche\'s path firsthand. Press M to open the World Route Map—"Chapter I: Pharping · Yangleshö" is now unlocked!',
    'dlg.prologue.northReport.choice.complete': 'Thank you, Lama! I am ready to enter the Pure Vision of Pharping · Yangleshö',

    // Dialogues — Old Lama: Post-Prologue Completed
    'dlg.prologue.completed.1':
      'May the vow of [[codex:jarungKhashor|Jarung Khashor]] abide in your heart. Whenever you are ready, use the Waypoint or press M to open the World Route Map and enter the Pure Vision along [[codex:padmasambhava|Guru Rinpoche]]\'s path.',
    'dlg.prologue.completed.choice.reviewLegend': 'Tell me the legend of Jarung Khashor and the four sons again',
    'dlg.prologue.completed.choice.close': 'Bow in gratitude and take leave',

    // Dialogues — Dharma Merchant
    'dlg.prologue.merchant.1':
      'Tashi Delek! I am Norbu, merchant of ritual implements. I have refilled your Amrita pills free of charge for the road ahead! Take a look at my vajras, bells, and amulets, or sell any gear you gathered in the wilds.',
    'dlg.prologue.merchant.choice.shop': 'Open Dharma Instrument Shop (Buy / Sell)',
    'dlg.prologue.merchant.choice.close': 'Thank you for the Amrita refill, I will browse later',

    // Dialogues — Lotus Artisan
    'dlg.prologue.artisan.1':
      'Om Mani Padme Hum. I am Pema, the Lotus Artisan. In my lotus brazier, spare implements can be salvaged into Turquoise Shards, Gold Dust, and Terma Essence—or I can reforge an affix on your Blessed, Rare, or Terma relics.',
    'dlg.prologue.artisan.choice.craft': 'Open Lotus Artisan Workshop (Salvage / Reforge)',
    'dlg.prologue.artisan.choice.close': 'Thank you, I will return when I have relics to temper',
  },
};

i18n.register(PROLOGUE_STRINGS);
