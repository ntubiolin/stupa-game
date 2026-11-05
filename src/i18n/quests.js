import { i18n } from '../i18n.js';

export const QUEST_STRINGS = {
  'zh-Hant': {
    // Prompts
    'prompt.talk': '交談',
    'prompt.pickupQuestItem': '拾取任務道具',
    'prompt.inspectQuest': '調查聖物',

    // NPC Names
    'npc.sandbox_lama': '試煉上師・仁欽',
    'npc.oldLama': '老喇嘛・洛桑',
    'npc.merchant': '法器商人・諾布',
    'npc.artisan': '蓮花工匠・白瑪',
    'npc.villager': '朝聖村民・卓瑪',
    'npc.noble': '吐蕃貴族・尚囊',
    'npc.abbot': '寂護大師',
    'npc.yogini': '益西措嘉',
    'npc.vision': '蓮師淨相',

    // NPC Look Labels (for showcase / debug)
    'npc.look.lama': '喇嘛 (lama)',
    'npc.look.merchant': '商人 (merchant)',
    'npc.look.artisan': '工匠 (artisan)',
    'npc.look.villager': '村民 (villager)',
    'npc.look.noble': '貴族 (noble)',
    'npc.look.abbot': '寂護 (abbot)',
    'npc.look.yogini': '瑜伽女 (yogini)',
    'npc.look.vision': '蓮師淨相 (vision)',

    // Dialogue UI
    'dlg.continue': '繼續',
    'dlg.skip': '跳過',
    'dlg.close': '結束對話',
    'dlg.hint.advance': '按 E / Space 或點擊繼續 · Esc 關閉',
    'dlg.hint.choices': '按 1–3 或點擊選擇 · Esc 關閉',

    // Quest Tracker & Journal UI
    'quest.tracker.title': '任務追蹤',
    'quest.tracker.empty': '尚無追蹤任務 · 按 J 開啟日誌',
    'quest.tracker.toggle': '任務',
    'quest.journal.title': '任務日誌',
    'quest.journal.subtitle': '行者修持與聖地因緣紀錄',
    'quest.journal.tab.all': '全部',
    'quest.journal.tab.active': '進行中',
    'quest.journal.tab.done': '已完成',
    'quest.journal.track': '追蹤',
    'quest.journal.tracked': '追蹤中',
    'quest.journal.doneBadge': '已圓滿',
    'quest.journal.activeBadge': '進行中',
    'quest.journal.emptyActive': '目前沒有進行中的任務',
    'quest.journal.emptyDone': '尚無已完成的任務',
    'quest.journal.rewards': '圓滿獎勵',
    'quest.journal.steps': '修行步驟',
    'quest.journal.closeHint': '按 J 或 Esc 關閉',

    // Chapters
    'quest.chapter.0': '序章・博達哈大佛塔',
    'quest.chapter.1': '第一章・帕平・揚列雪',
    'quest.chapter.2': '第二章・芒域山口',
    'quest.chapter.3': '第三章・雅隆河谷',
    'quest.chapter.4': '第四章・海波日山・桑耶寺',
    'quest.chapter.5': '終章・青朴修行地',
    'quest.chapter.debug': '測試與試煉',

    // Banners & Toasts
    'quest.banner.complete': '任務完成：{title}',
    'quest.banner.rewards': '獲得獎勵：{rewards}',
    'quest.reward.exp': '+{n} EXP',
    'quest.reward.turquoise': '綠松石 ×{n}',
    'quest.reward.item': '加持法器 ×{n}',
    'quest.reward.codex': '圖鑑解鎖',
    'quest.toast.started': '新任務：{title}',
    'quest.toast.stepDone': '完成步驟：{text}',
    'quest.toast.itemPicked': '獲得任務道具：{name}',
    'quest.toast.codexLink': '開啟圖鑑：{id}',

    // Quest Collectibles & Props
    'quest.item.sacredLotus': '金蓮法物',
    'quest.prop.sandboxMani': '試煉瑪尼石堆',

    // Debug Quest: debug.sample (5 step types: reach, liberate, collect, interact, talk)
    'quest.debug.sample.title': '行者五支試煉',
    'quest.debug.sample.desc': '試煉上師仁欽請你在測試場依序完成抵達、超度、拾取、互動與回報五項基礎修持，以印證行者資糧。',
    'quest.debug.sample.step.reach': '前往東側試煉石陣',
    'quest.debug.sample.step.liberate': '在測試場超度魔障',
    'quest.debug.sample.step.collect': '拾取西側發光的金蓮法物',
    'quest.debug.sample.step.interact': '與中央試煉瑪尼石堆互動祈福',
    'quest.debug.sample.step.talk': '向試煉上師仁欽回報圓滿',

    // Debug Quest: debug.ritual (remaining 4 step types: kora, light, boss, event)
    'quest.debug.ritual.title': '四弘誓願儀軌（測試）',
    'quest.debug.ritual.desc': '測試繞塔、點燈、調伏首領與自訂事件四種任務步驟。',
    'quest.debug.ritual.step.kora': '完成順時針繞塔',
    'quest.debug.ritual.step.light': '點亮酥油燈',
    'quest.debug.ritual.step.boss': '調伏雪人王',
    'quest.debug.ritual.step.event': '觸發試煉共鳴事件',

    // Sandbox Lama Dialogues
    'dlg.sandbox.intro.1': '札西德勒，遠道而來的朝聖行者。這裡是遠離塵囂的試煉場，供行者磨練身語意三業。',
    'dlg.sandbox.intro.2': '相傳昔日蓮師與寂護大師在[[codex:samye|桑耶寺]]弘傳正法前，行者皆須歷經五支試煉。你願意接受試煉嗎？',
    'dlg.sandbox.choice.accept': '願意接受「行者五支試煉」',
    'dlg.sandbox.choice.codex': '請開示關於桑耶寺的因緣',
    'dlg.sandbox.choice.later': '我先在四周看看',
    'dlg.sandbox.intro.accepted': '善哉！請先前往東側的試煉石陣，再依序超度魔障、拾取金蓮、禮敬瑪尼石堆，最後回來向我回報。',
    'dlg.sandbox.intro.codexNote': '[[codex:samye|桑耶寺]]乃是吐蕃第一座佛法僧三寶具足的寺院，融合印、藏、漢三地建築形制。你可點擊金色底線文字查閱圖鑑。',
    'dlg.sandbox.active.1': '試煉仍在進行中。跟隨右側的任務追蹤欄與金色菱形標記，一步步完成五支修持吧。',
    'dlg.sandbox.report.1': '太好了！你已走過石陣、超度魔障、集齊金蓮並禮敬瑪尼堆，五支試煉圓滿無礙。請收下這份加持資糧！',
    'dlg.sandbox.done.1': '你已圓滿完成行者五支試煉。願你在往後的[[codex:boudhanath|博達哈大佛塔]]與雪域聖地旅途中，道心堅固。',
    'dlg.sandbox.choice.replay': '再次重溫五支試煉',

    // Debug All-Actions Dialogue (debug.allActions)
    'dlg.debug.allActions.1': '【測試對話】此節點已觸發全類型動作：startQuest、completeStep、setFlag、unlockCodex、giveItem、giveTurquoise、giveExp、openShop、openCrafting、teleport 與 emit。你也可以點擊[[codex:samye|桑耶寺]]或[[codex:padmasambhava|蓮花生大士]]測試圖鑑連結。',
    'dlg.debug.allActions.2': '所有 11 種對話動作皆已執行完畢，請透過選項或主控台確認旗標、修為、綠松石與事件狀態。',
    'dlg.debug.choice.next': '檢視動作執行結果',
    'dlg.debug.choice.flagOnly': '【條件選項】已偵測到 debug.flag.allActions 旗標',
    'dlg.debug.choice.close': '關閉測試對話',
  },

  en: {
    // Prompts
    'prompt.talk': 'Talk',
    'prompt.pickupQuestItem': 'Pick up quest item',
    'prompt.inspectQuest': 'Inspect sacred site',

    // NPC Names
    'npc.sandbox_lama': 'Trial Master Rinchen',
    'npc.oldLama': 'Old Lama Lobsang',
    'npc.merchant': 'Dharma Merchant Norbu',
    'npc.artisan': 'Lotus Artisan Pema',
    'npc.villager': 'Pilgrim Villager Drolma',
    'npc.noble': 'Tibetan Noble Zhang Nang',
    'npc.abbot': 'Abbot Śāntarakṣita',
    'npc.yogini': 'Yeshe Tsogyal',
    'npc.vision': 'Vision of Guru Rinpoche',

    // NPC Look Labels
    'npc.look.lama': 'Lama (lama)',
    'npc.look.merchant': 'Merchant (merchant)',
    'npc.look.artisan': 'Artisan (artisan)',
    'npc.look.villager': 'Villager (villager)',
    'npc.look.noble': 'Noble (noble)',
    'npc.look.abbot': 'Abbot (abbot)',
    'npc.look.yogini': 'Yogini (yogini)',
    'npc.look.vision': 'Pure Vision (vision)',

    // Dialogue UI
    'dlg.continue': 'Continue',
    'dlg.skip': 'Skip',
    'dlg.close': 'End Dialogue',
    'dlg.hint.advance': 'Press E / Space or click to continue · Esc to close',
    'dlg.hint.choices': 'Press 1–3 or click to choose · Esc to close',

    // Quest Tracker & Journal UI
    'quest.tracker.title': 'Quest Tracker',
    'quest.tracker.empty': 'No tracked quests · Press J for Journal',
    'quest.tracker.toggle': 'Quests',
    'quest.journal.title': 'Quest Journal',
    'quest.journal.subtitle': 'Chronicle of Pilgrimage & Sacred Deeds',
    'quest.journal.tab.all': 'All',
    'quest.journal.tab.active': 'Active',
    'quest.journal.tab.done': 'Completed',
    'quest.journal.track': 'Track',
    'quest.journal.tracked': 'Tracked',
    'quest.journal.doneBadge': 'Completed',
    'quest.journal.activeBadge': 'Active',
    'quest.journal.emptyActive': 'No active quests at the moment',
    'quest.journal.emptyDone': 'No completed quests yet',
    'quest.journal.rewards': 'Rewards',
    'quest.journal.steps': 'Objectives',
    'quest.journal.closeHint': 'Press J or Esc to close',

    // Chapters
    'quest.chapter.0': 'Prologue · Boudhanath Stupa',
    'quest.chapter.1': 'Chapter I · Pharping Yangleshö',
    'quest.chapter.2': 'Chapter II · Mangyul Pass',
    'quest.chapter.3': 'Chapter III · Yarlung Valley',
    'quest.chapter.4': 'Chapter IV · Hepori & Samye',
    'quest.chapter.5': 'Epilogue · Chimphu Hermitage',
    'quest.chapter.debug': 'Debug & Trials',

    // Banners & Toasts
    'quest.banner.complete': 'Quest Complete: {title}',
    'quest.banner.rewards': 'Rewards: {rewards}',
    'quest.reward.exp': '+{n} EXP',
    'quest.reward.turquoise': 'Turquoise ×{n}',
    'quest.reward.item': 'Blessed Gear ×{n}',
    'quest.reward.codex': 'Codex Unlocked',
    'quest.toast.started': 'Quest Started: {title}',
    'quest.toast.stepDone': 'Objective complete: {text}',
    'quest.toast.itemPicked': 'Obtained quest item: {name}',
    'quest.toast.codexLink': 'Opened Codex: {id}',

    // Quest Collectibles & Props
    'quest.item.sacredLotus': 'Sacred Golden Lotus',
    'quest.prop.sandboxMani': 'Trial Mani Stone Cairn',

    // Debug Quest: debug.sample
    'quest.debug.sample.title': 'Fivefold Pilgrim Trial',
    'quest.debug.sample.desc': 'Trial Master Rinchen asks you to complete five foundational objectives in the Sandbox Arena: reach, liberate, collect, interact, and report back.',
    'quest.debug.sample.step.reach': 'Reach the eastern trial stone circle',
    'quest.debug.sample.step.liberate': 'Liberate foes in the Sandbox Arena',
    'quest.debug.sample.step.collect': 'Collect glowing Golden Lotuses on the west side',
    'quest.debug.sample.step.interact': 'Interact with the central Mani stone cairn',
    'quest.debug.sample.step.talk': 'Report back to Trial Master Rinchen',

    // Debug Quest: debug.ritual
    'quest.debug.ritual.title': 'Fourfold Vow Ritual (Debug)',
    'quest.debug.ritual.desc': 'Tests kora, butter lamp lighting, boss subjugation, and custom event quest steps.',
    'quest.debug.ritual.step.kora': 'Complete clockwise kora laps',
    'quest.debug.ritual.step.light': 'Light butter lamps',
    'quest.debug.ritual.step.boss': 'Subdue the Migoi King',
    'quest.debug.ritual.step.event': 'Trigger trial resonance event',

    // Sandbox Lama Dialogues
    'dlg.sandbox.intro.1': 'Tashi Delek, pilgrim from afar. This Sandbox Arena is a quiet training ground to temper body, speech, and mind.',
    'dlg.sandbox.intro.2': 'Before the Dharma flourished at [[codex:samye|Samye Monastery]], practitioners underwent the Fivefold Trial. Will you undertake this trial?',
    'dlg.sandbox.choice.accept': 'Accept the "Fivefold Pilgrim Trial"',
    'dlg.sandbox.choice.codex': 'Tell me about Samye Monastery',
    'dlg.sandbox.choice.later': 'I will look around first',
    'dlg.sandbox.intro.accepted': 'Excellent! First walk to the eastern stone circle, then liberate the spirits, gather the Golden Lotuses, honor the central Mani cairn, and return to me.',
    'dlg.sandbox.intro.codexNote': '[[codex:samye|Samye Monastery]] was the first Buddhist monastery in Tibet, uniting Indian, Tibetan, and Chinese styles. Click the gold-underlined link to open the Codex.',
    'dlg.sandbox.active.1': 'Your trial is underway. Follow the Quest Tracker on the right and the golden diamond marker to complete each step.',
    'dlg.sandbox.report.1': 'Marvelous! You have walked the circle, liberated the spirits, gathered the Golden Lotuses, and honored the Mani cairn. Receive these blessings!',
    'dlg.sandbox.done.1': 'You have completed the Fivefold Trial. May your resolve remain steadfast at [[codex:boudhanath|Boudhanath Stupa]] and across the snowy peaks.',
    'dlg.sandbox.choice.replay': 'Undertake the Fivefold Trial again',

    // Debug All-Actions Dialogue
    'dlg.debug.allActions.1': '[Debug Dialogue] This node triggered all action types: startQuest, completeStep, setFlag, unlockCodex, giveItem, giveTurquoise, giveExp, openShop, openCrafting, teleport, and emit. Click [[codex:samye|Samye Monastery]] or [[codex:padmasambhava|Guru Rinpoche]] to test codex links.',
    'dlg.debug.allActions.2': 'All 11 dialogue action types have been executed. Verify flags, EXP, turquoise, and events via choices or console.',
    'dlg.debug.choice.next': 'Inspect action results',
    'dlg.debug.choice.flagOnly': '[Conditional Choice] Detected flag debug.flag.allActions',
    'dlg.debug.choice.close': 'Close debug dialogue',
  },
};

i18n.register(QUEST_STRINGS);
