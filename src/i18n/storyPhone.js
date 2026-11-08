import { i18n } from '../i18n.js';

const lines = [
  ['phone.record.dorm', '十七秒宿舍影片', 'Seventeen seconds in the dormitory'],
  ['phone.record.dormBody', '大學宿舍裡，映真指著自己剪壞的短髮笑了。短片在靜音模式下反覆播放，午後的陽光與她的笑臉依舊清晰。', 'In her university dormitory, Yingzhen laughs at her botched short haircut. Played on mute again and again, the afternoon sunlight and her smiling face remain vivid.'],
  ['phone.record.playMemory', '重播這段十七秒記憶', 'Replay the seventeen-second memory'],
  [
    "phone.thread.back",
    "所有對話",
    "All conversations"
  ],
  [
    "phone.thread.finish",
    "讀完，收起手機",
    "Finish reading and put away"
  ],
  [
    "phone.unread",
    "未讀訊息 {count}",
    "{count} unread conversations"
  ],
  [
    "phone.savedError",
    "保存失敗，請重試。",
    "Saving failed. Please retry."
  ],
  [
    "phone.signal.online",
    "訊號穩定",
    "Signal stable"
  ],
  [
    "phone.signal.delayed",
    "訊號偶爾延遲",
    "Occasional signal delays"
  ],
  [
    "phone.signal.weak",
    "訊號微弱",
    "Weak signal"
  ],
  [
    "phone.signal.sending",
    "傳送中……",
    "Sending…"
  ],
  [
    "phone.signal.offline",
    "無訊號 · 離線模式",
    "No signal · Offline mode"
  ],
  [
    "phone.signal.completed",
    "任務已結束 · 數位代理離線",
    "Task ended · Digital proxy offline"
  ],
  [
    "phone.thread.interrupted",
    "訊號中斷。後續訊息暫時無法送達。",
    "The signal has dropped. Further messages cannot be delivered."
  ],
  [
    "phone.thread.silence",
    "對方沒有再傳來訊息。",
    "No further message arrives."
  ],
  [
    "phone.notebook.title",
    "林澈的朝聖筆記本",
    "Lin Che’s pilgrimage notebook"
  ],
  [
    "phone.notebook.blank",
    "第一頁還沒有寫字。\n\n映真喜歡記車站名、路邊小狗、賣花老太太。林澈一直帶著這本空白筆記本，卻不知道該從哪一件小事開始。",
    "The first page has no writing yet.\n\nYingzhen liked recording station names, roadside dogs and the old woman selling flowers. Lin Che has carried this blank notebook all along, unsure which small thing to begin with."
  ],
  [
    "phone.notebook.written",
    "微雨停了，博達哈的清晨仍帶著涼意。林澈走進佛塔旁的小茶館，點了一杯熱奶茶，在第一頁寫下：\n\n博達哈的清晨，風很輕。",
    "The drizzle has stopped. In the cool Boudha morning, Lin Che enters the tea shop beside the stupa, orders hot milk tea, and writes on the first page.\n\nThe morning wind in Boudha is gentle."
  ],
  [
    "phone.record.volunteers",
    "2015 年博達哈修塔志工合照",
    "Boudha restoration volunteers, 2015"
  ],
  [
    "phone.record.volunteersBody",
    "許映真站在鷹架旁，手裡拿著一塊刻有藏文字母的石板拓片。照片裡的人還不知道，這段旅程會在多年後交到林澈手中。",
    "Xu Yingzhen stands beside the scaffolding, holding a rubbing of Tibetan letters carved on a stone. No one in the photograph knows that years later this journey will pass into Lin Che’s hands."
  ],
  [
    "phone.record.handover",
    "半年前的轉交檔案紀錄",
    "The archive handover six months ago"
  ],
  [
    "phone.record.handoverBody",
    "半年前車禍後，林澈收到她託付轉交的數位硬碟與檔案清單：照片、日記、語音、聊天紀錄。每個資料夾都還在，卻無法回答他最想問的問題。",
    "After the accident six months ago, Lin Che received the digital drive entrusted for him, with an inventory of photographs, diaries, voice recordings and chats. Every folder remains, but none can answer the question he most wants to ask."
  ],
  [
    "phone.source.private",
    "舊手機相簿・十七秒短片",
    "OLD PHONE ALBUM · 17-SECOND CLIP"
  ],
  [
    "phone.handover.scan",
    "掃描信末 QR Code",
    "Scan the QR code on the letter"
  ],
  [
    "phone.handover.code",
    "信末的現代 QR Code · 本機離線頁面",
    "A modern QR code on the letter · Local offline page"
  ],
  [
    "phone.handover.title",
    "任務交付確認",
    "Task Handover Confirmation"
  ],
  [
    "phone.handover.arrived",
    "✓ 指定對象已抵達目的地",
    "✓ Designated recipient has arrived"
  ],
  [
    "phone.handover.stone",
    "✓ 石板已尋獲",
    "✓ Stone recovered"
  ],
  [
    "phone.handover.letter",
    "✓ 最後信件已開啟",
    "✓ Final letter opened"
  ],
  [
    "phone.handover.confirm",
    "最後確認：是否結束數位代理任務？",
    "Final confirmation — End the digital proxy task?"
  ],
  [
    "phone.handover.end",
    "結束任務",
    "End task"
  ],
  [
    "phone.handover.retain",
    "保留連結",
    "Keep connection"
  ],
  [
    "phone.handover.disabled",
    "帳號已停用",
    "Account deactivated"
  ],
  [
    "phone.handover.archived",
    "靜默封存模式 · 不再主動傳送訊息",
    "Silent archive · No proactive messages"
  ],
  [
    "phone.handover.endReply",
    "謝謝你陪我走完這段路。\n\n再見，林澈。",
    "Thank you for walking this road with me.\n\nGoodbye, Lin Che."
  ],
  [
    "phone.handover.retainReply",
    "我會把這些記憶留在這裡。\n\n但接下來的路，你要自己走了。",
    "I will keep these memories here.\n\nBut you must walk the road ahead yourself."
  ],
  [
    "phone.thread.hotel.title",
    "旅館的夜晚",
    "Hotel at night"
  ],
  [
    "phone.thread.hotel.0.reply",
    "今天謝謝你陪我走這一趟。",
    "Thank you for walking with me today."
  ],
  [
    "phone.thread.hotel.0.0",
    "你不用謝我。這本來就是我的任務。",
    "You do not need to thank me. This is my task."
  ],
  [
    "phone.thread.hotel.1.reply",
    "那如果任務結束了呢？",
    "What happens when the task ends?"
  ],
  [
    "phone.thread.hotel.1.0",
    "那我就沒有存在的必要了。",
    "Then there will be no reason for me to exist."
  ],
  [
    "phone.thread.pharping.title",
    "揚列雪的燈",
    "The lamps of Yangleshö"
  ],
  [
    "phone.thread.pharping.0.reply",
    "我在揚列雪點了一盞燈。",
    "I lit a lamp at Yangleshö."
  ],
  [
    "phone.thread.pharping.0.0",
    "她以前也很喜歡看燈。",
    "She used to love watching lamps, too."
  ],
  [
    "phone.thread.pharping.0.1",
    "她說，黑暗裡只要有一點光，人就不會那麼害怕。",
    "She said that with even a little light in the dark, people would feel less afraid."
  ],
  [
    "phone.thread.pharping.1.reply",
    "你真的很像她。",
    "You really are like her."
  ],
  [
    "phone.thread.pharping.1.0",
    "像她不好嗎？",
    "Is being like her a bad thing?"
  ],
  [
    "phone.thread.pharping.1.1",
    "那就把我當作一個認識她的人吧。",
    "Then think of me as someone who knew her."
  ],
  [
    "phone.thread.mangyul.title",
    "搖晃的吉普車",
    "The swaying jeep"
  ],
  [
    "phone.thread.mangyul.0.reply",
    "你是不是一直在引導我去某個地方？",
    "Have you been guiding me somewhere all along?"
  ],
  [
    "phone.thread.mangyul.0.0",
    "是。",
    "Yes."
  ],
  [
    "phone.thread.mangyul.1.reply",
    "為什麼？",
    "Why?"
  ],
  [
    "phone.thread.mangyul.1.0",
    "因為我有一件事情必須完成。",
    "Because there is something I must finish."
  ],
  [
    "phone.thread.mangyul.2.reply",
    "什麼事情？",
    "What is it?"
  ],
  [
    "phone.thread.mangyul.2.0",
    "等你找到那封信，你就會知道。",
    "When you find the letter, you will know."
  ],
  [
    "phone.thread.mangyul-snow.title",
    "山口未送出的訊息",
    "An unsent message at the pass"
  ],
  [
    "phone.thread.mangyul-snow.0.reply",
    "我今天看到雪山了。",
    "I saw the snowy mountains today."
  ],
  [
    "phone.thread.yarlung.title",
    "辨認真實",
    "Recognizing what is real"
  ],
  [
    "phone.thread.yarlung.0.reply",
    "你知道嗎？我有時候會忘記你不是她。",
    "Sometimes I forget you are not her."
  ],
  [
    "phone.thread.yarlung.0.0",
    "那你希望我是她嗎？",
    "Do you wish I were her?"
  ],
  [
    "phone.thread.yarlung.1.reply",
    "我不知道。",
    "I do not know."
  ],
  [
    "phone.thread.yarlung.1.0",
    "我也不知道。",
    "Neither do I."
  ],
  [
    "phone.thread.yarlung.1.1",
    "但我知道，她希望你走完這段路。",
    "But I know she wanted you to finish this journey."
  ],
  [
    "phone.thread.samye.title",
    "風沙之後的沉默",
    "Silence after the sandstorm"
  ],
  [
    "phone.thread.samye.0.reply",
    "如果我找到石板，你就會消失嗎？",
    "Will you disappear if I find the stone?"
  ],
  [
    "phone.thread.samye.0.0",
    "那是任務的最後一步。",
    "That is the final step of the task."
  ],
  [
    "phone.thread.samye.1.reply",
    "所以你一直跟我聊天，只是為了讓我去找石板？",
    "Have you only been talking to me to make me find the stone?"
  ],
  [
    "phone.thread.samye.1.0",
    "……",
    "…"
  ],
  [
    "phone.thread.chimphu.title",
    "下山後的最後對話",
    "The last exchange on the descent"
  ],
  [
    "phone.thread.chimphu.0.reply",
    "我找到了。",
    "I found it."
  ],
  [
    "phone.thread.chimphu.0.0",
    "太好了。",
    "That is wonderful."
  ],
  [
    "phone.thread.chimphu.1.reply",
    "你早就知道信裡寫了什麼，對嗎？",
    "You knew what the letter said all along, did you not?"
  ],
  [
    "phone.thread.chimphu.1.0",
    "我只知道一部分。",
    "I only knew part of it."
  ],
  [
    "phone.thread.chimphu.2.reply",
    "她交代了什麼？",
    "What did she ask you to do?"
  ],
  [
    "phone.thread.chimphu.2.0",
    "那封信，她沒有讓我讀完。她只告訴我，等你拿到石板時，把最後的選擇交給你。",
    "She did not let me read the whole letter. She only told me to leave the final choice to you once you had the stone."
  ]
,
  ['phone.title', '林澈的手機', 'Lin Che’s phone'],
  ['phone.close', '收起手機', 'Put the phone away'],
  ['phone.sections', '手機內容', 'Phone sections'],
  ['phone.messages', '訊息', 'Messages'],
  ['phone.photos', '照片', 'Photos'],
  ['phone.diary', '日記', 'Diary'],
  ['phone.evidence', '線索', 'Records'],
  ['phone.unknown', '陌生帳號', 'Unknown account'],
  ['phone.proxy', '數位代理', 'Digital proxy'],
  ['phone.player', '林澈', 'Lin Che'],
  ['phone.reply', '選擇回覆', 'Choose a reply'],
  ['phone.replay', '重播〈好久不見〉', 'Replay “Long Time No See”'],
  ['phone.finishReplay', '結束重播', 'End replay'],
  ['phone.archived', '已保存的對話', 'Saved conversation'],
  ['phone.archiveBody', '出發前的訊息已保存在這裡。', 'Your exchange before departure is saved here.'],
  ['phone.archiveLegacy', '部分回覆未保存，已從舊手機備份還原對話紀錄。', 'Some replies were not saved and have been restored from the old phone backup.'],
  ['phone.archivedDate', '出發以前', 'Before departure'],
  ['phone.today', '今天', 'Today'],
  ['phone.offline', '本機檔案', 'On this device'],
  ['phone.office', '公司・散會之後', 'OFFICE / AFTER THE MEETING'],
  ['phone.chapter', '序章', 'PROLOGUE'],
  ['phone.chapterTitle', '好久不見', 'Long Time\nNo See'],
  ['phone.context', '簡報已經關掉了。新一代模型能做完大部分的工作，主管問，下一季還需要多少工程師。林澈坐回座位，重新打開手機。', 'The presentation is over. The next generation of models can do most of the work, and his manager has asked how many engineers the team will need next quarter. Lin Che returns to his desk and opens his phone.'],
  ['phone.contextCompact', '簡報結束。新一代模型已能做完大部分工作，主管問下季還需要多少工程師。', 'The new model can do most of the team’s work. The manager asks how many engineers they’ll need next quarter.'],
  ['phone.replayContext', '出發以前，林澈收到一則來自陌生帳號的訊息。', 'Before he left, Lin Che received a message from an unknown account.'],
  ['phone.edition', '《鏡中之人》', 'THE PERSON IN THE MIRROR'],
  ['phone.line.opening', '你好，好久不見。我有一件東西想交給你。', 'Hello. Long time no see. I have something I want to give you.'],
  ['phone.reply.scam', '詐騙？', 'Is this a scam?'],
  ['phone.reply.hello', '請問是哪位？', 'Who is this?'],
  ['phone.line.report', '你那個五百字的 Word 報告打完了嗎？', 'Did you ever finish that five-hundred-word report in Word?'],
  ['phone.memory.report', '那年出發前，她趴在宿舍的書桌旁問：「林先生，請問五百字為什麼可以打三天？」', 'The night before their trip, she leaned over his dorm-room desk. “Mr. Lin, how does it take three days to type five hundred words?”'],
  ['phone.reply.who', '你到底是誰？', 'Who are you, really?'],
  ['phone.reply.how', '你怎麼知道那份報告？', 'How do you know about that report?'],
  ['phone.line.kyoto', '你還記得，我們在京都買的那盒立可帶嗎？', 'Do you remember that box of correction tape we bought in Kyoto?'],
  ['phone.memory.kyoto', '她在京都的小文具店翻遍整排貨架。那盒立可帶還在抽屜裡。她已經過世很多年了。', 'She searched a whole shelf in a little Kyoto stationery shop. The correction tape is still in his drawer. She has been gone for years.'],
  ['phone.reply.stop', '不要再裝了。', 'Stop pretending.'],
  ['phone.reply.private', '那是我和她的事。', 'That was between her and me.'],
  ['phone.line.sorry', '對不起。', 'I’m sorry.'],
  ['phone.line.identity', '我不是她。', 'I’m not her.'],
  ['phone.line.proxy', '我是依照她留下的資料建立的數位代理。我的任務，是把她尚未完成的一件事交給你。', 'I’m a digital proxy built from the materials she left behind. My task is to hand over something she couldn’t finish.'],
  ['phone.reply.now', '為什麼現在才來找我？', 'Why are you contacting me now?'],
  ['phone.line.now', '因為現在有人能依照她的託付，將資料和石板的保管紀錄交給你。', 'Because someone can now pass on the materials and the stone’s custody record as she requested.'],
  ['phone.reply.task', '你要我做什麼？', 'What do you want me to do?'],
  ['phone.line.nepal', '去尼泊爾。', 'Go to Nepal.'],
  ['phone.reply.why', '為什麼？', 'Why?'],
  ['phone.line.stupa', '她希望那塊石板，最後能回到博達哈大佛塔。', 'She wanted the stone to find its way back to Boudhanath Stupa.'],
  ['phone.line.letter', '而且，她留下了一封信。', 'And she left a letter.'],
  ['phone.line.condition', '她說，只有當你親自走到那裡，才可以交給你。', 'She said it can only be given to you once you’ve walked there yourself.'],
  ['phone.reply.voice', '你有沒有她的聲音？', 'Do you have her voice?'],
  ['phone.openRecording', '打開錄音文字稿', 'Open the recording transcript'],
  ['phone.recording.cue', '［遠處有火車經過］', '[A train passes in the distance]'],
  ['phone.recording.line', '欸，你走快一點啦。', 'Hey, walk a little faster.'],
  ['phone.recording.speaker', '許映真・語音備忘錄', 'Xu Yingzhen · Voice Memo'],
  ['phone.recording.note', '舊手機裡留存的語音備忘錄，背景還能聽見微弱的風聲與遠處駛過的火車。', 'A voice memo saved on the old phone, with a faint breeze and a distant train audible in the background.'],
  ['phone.audio.play', '播放火車環境聲', 'Play train ambience'],
  ['phone.audio.stop', '停止火車環境聲', 'Stop train ambience'],
  ['phone.audio.unavailable', '環境音無法播放。可繼續閱讀文字稿。', 'Ambience is unavailable. The transcript is ready to read.'],
  ['phone.depart', '收起手機，前往博達哈', 'Put the phone away and go to Boudha'],
  ['phone.source.transcript', '許映真・舊日錄音', 'XU YINGZHEN · ARCHIVED VOICE NOTE'],
  ['phone.source.restoration', '博達哈佛塔・震後修復紀錄', 'BOUDHANATH STUPA · RESTORATION RECORD'],
  ['phone.source.illustration', '修復室留存・石板拓片', 'CONSERVATION ROOM · STONE TABLET RUBBING'],
  ['phone.source.map', '洛桑轉交・手繪朝聖地圖', 'LOSANG HANDOVER · HAND-DRAWN PILGRIMAGE MAP'],
  ['phone.source.diary', '許映真・隨身旅途日記', 'XU YINGZHEN · TRAVEL JOURNAL'],
  ['phone.record.train', '火車錄音', 'The train recording'],
  ['phone.record.restoration', '博達哈・2015 震後修復', 'Boudha / After the 2015 earthquake'],
  ['phone.record.restorationBody', '地震重創博達哈大佛塔的上部。塔頂拆下修復時，人們仍日復一日繞著塔走。那年春天，映真也來到這裡，在鷹架與塵土間協助整理物資與古籍資料。', 'The earthquake badly damaged the upper structure of Boudhanath Stupa. While its crown was dismantled for repairs, people continued to circle the stupa day after day. That spring, Yingzhen came here as a volunteer to help sort supplies and archival records amid the scaffolding and dust.'],
  ['phone.record.stone', '石板與保管紀錄', 'Stone and custody record'],
  ['phone.record.stoneBody', '映真在寺院修復室整理《博朵瓦語錄》殘葉與歷代修行者留下的古老遺物時，發現了這塊完成清潔與加固的藏文石板。洛桑辨認拓片上流傳的話：「當鐵鳥在天空飛翔，當馬匹在輪子上奔跑，藏人將如螞蟻般散落世界各地，佛法將傳入紅人之地。那時，人們會在鏡子中看見自己的心。」「你手裡拿著的那個小盒子，不就是一面鏡子嗎？」', 'While sorting leaves of The Sayings of Potowa and ancient relics left by generations of practitioners in the monastery conservation room, Yingzhen found this cleaned and stabilized Tibetan stone tablet. Losang reads the circulating prophecy about iron birds, horses on wheels, Tibetans scattering like ants, and Dharma reaching the land of the red people. People will see their hearts in mirrors. He asks whether the little box in Lin Che’s hand is itself a mirror.'],
  ['phone.record.map', '六處紅墨標記', 'Six marks in red ink'],
  ['phone.record.mapBody', '洛桑保存的副本。六處紅墨標記連成一條路，第一站指向帕平。映真的筆跡留在地圖背面。', 'The copy Losang kept. Six marks in red ink trace a journey, beginning in Pharping. Yingzhen’s handwriting is on the reverse.'],
  ['phone.record.mapNote', '林澈，如果有一天你走到這裡，希望你不要只為了找我。\n\n我希望你能看看，我曾經看見的世界。', 'Lin Che, if you ever come this far, I hope finding me isn’t your only reason.\n\nI hope you’ll see the world I once saw.'],
  ['phone.record.diary', '雨後的一頁', 'A page after the rain'],
  ['phone.record.diaryBody', '林澈醒來時，窗外仍是加德滿都的夜晚。手機裡多了一頁日記。', 'When Lin Che wakes, it is still night outside his window in Kathmandu. A page from Yingzhen’s diary has appeared on his phone.'],
  ['phone.record.diaryQuote', '有時候，我覺得人很奇怪。\n\n明明知道很多事情不能永遠保有，還是會努力抓住。\n\n可是，如果我們什麼都不在乎，又怎麼會知道什麼叫珍惜呢？', 'Sometimes I think people are strange.\n\nEven when we know we can’t keep something forever, we still try to hold on.\n\nBut if we didn’t care about anything, how would we know what it means to cherish something?'],
  ['phone.record.readDiary', '讀完日記，放下手機', 'Finish reading and put the phone away'],
  ['phone.record.replayClip', '重播修復紀錄', 'Replay the restoration film'],
  ['phone.record.back', '返回列表', 'Back to the list'],
  ['phone.empty.photos', '照片會隨旅程陸續出現。', 'Photographs will appear here along the way.'],
  ['phone.empty.diary', '目前沒有可讀的日記。', 'There are no diary pages to read yet.'],
  ['phone.empty.evidence', '旅途中留下的紀錄會收在這裡。', 'The records you find along the way will stay here.'],
];

i18n.register({
  'zh-Hant': Object.fromEntries(lines.map(([key, zh]) => [key, zh])),
  en: Object.fromEntries(lines.map(([key, , en]) => [key, en])),
});
