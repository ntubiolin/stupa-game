import { i18n } from '../i18n.js';

// Yingzhen's fixed Chapter 9 letter. Chinese preserves the original wording.
// English is a translation of the same pages. The response below is the proxy's.
const zhLetter = [
  `親愛的林澈：

如果你真的來到了青朴，我想，你應該已經走了很遠。

我不知道你會在什麼時候讀到這封信。也不知道那個時候，世界會變成什麼樣子。

你還記得我第一次去尼泊爾嗎？

那時候我說，我想去幫忙修復佛塔。你還問我，又不是建築系，去了能做什麼。

其實你說得沒錯。

我什麼也不會。

只能幫忙整理資料、搬東西、做一些很小的事。

可是我真的很喜歡那裡。

地震後，佛塔的上半部受損，很多人都很難過。可是每天早上，大家還是會來繞塔。有人拿著轉經筒，有人拿著花，也有人只是安靜地走著。

我那時候一直想不明白，為什麼一座受損的佛塔，還能給人這麼大的安慰。

後來有位師父告訴我，因為我們知道它會壞，還是願意把它建好。

我一直記得那句話。`,
  `後來，我發現了那塊石板。

你一定會覺得很好笑。我花了好多時間研究它，卻到現在還是不知道它到底有多古老。

那些關於鐵鳥、鐵馬和鏡子的預言，有可能是很久以前流傳下來的，也可能是在後來的傳承裡被重新解釋。石板上的文字是否屬於同一個時代，我也沒有答案。

但我很喜歡其中關於鏡子的故事。

你想想看，如果很久以前的人真的看見我們現在的生活，會不會覺得很不可思議？

每天坐在螢幕前，就能看見世界另一頭發生的事情。可以跟遠方的人說話，可以留下照片、聲音，甚至可以把過去的事情重新放在眼前。

我一直覺得很神奇。`,
  `可是後來生病，我才發現，原來我們知道那麼多事情，卻還是有很多事情無法決定。

我可以查到幾乎所有疾病的資料。

可以閱讀最新的研究。

可以知道每一種治療的機率。

但這些都不能告訴我，我究竟還能活多久。

我真的很想好起來。

我還想跟你旅行。

想去京都看櫻花，想去印度，想去那些我們在地圖上畫了圈，卻還沒去過的地方。

所以我又回來朝聖了。

不是因為我不相信醫生。

只是因為我想在努力治療之外，也給自己一個可以祈願的地方。

在青朴的時候，我常常想，如果我真的好起來，第一件事要做什麼？

想來想去，好像也沒有什麼偉大的願望。

只是想跟你一起散步、吃飯、旅行。

最好還可以在咖啡廳坐一整個下午，什麼也不做。

後來我的狀況漸漸穩定了。

我以為自己又有很多時間。

所以我決定回去繼續研究。

當時我把石板留在這裡，因為它的來歷還沒弄清楚。我跟師父約好，有一天會再回來處理。`,
  `我也留下了這封信。

不是因為我認為自己一定會死。

而是因為生病以後，我開始明白，有些話應該在還來得及的時候說。

我不知道未來的科技會發展到什麼程度。

你以前常常跟我講 AI、模型、機器學習。我有時候其實聽不太懂，只知道你講得很開心。

也許有一天，真的會有能夠學會一個人說話方式的電腦。

也許它能保存我寫過的每一句話，甚至能像我一樣跟你聊天。

如果有人依照我的託付，用這些資料讓你找到這封信，我很感謝。

可是我希望，你不要因為它還能跟你說話，就覺得我還在某個地方等你。

我不希望自己變成一個讓你永遠無法離開的影子。`,
  `我喜歡你，是因為你會認真思考很多事情，也會為自己在乎的事付出努力。

可是你常常太擔心未來。

擔心自己是不是做得不夠好，擔心工作，擔心浪費時間。

你記不記得，我們以前去日本旅行，有一次搭錯火車？

你很緊張，一直查怎麼回原本的車站。

可是我覺得窗外的風景很好看。

後來，我們就在一個完全沒計畫的小站下車。

那天下午沒有看什麼著名景點，只找到一間很舊的咖啡廳。

我到現在還記得，那是我最喜歡的一次旅行。

所以啊，如果有一天你真的不知道未來該怎麼走，也不要太害怕。

你可以先走一小段。

有時候，走錯路也沒有關係。`,
  `至於石板，如果它終究不屬於這裡，希望你能依照保管者的安排，幫我把它送回博達哈。

那是我第一次發願的地方。

我希望，這塊石板可以回到那裡。

也希望你能親眼看看，那座曾經被地震破壞，又被很多人一起修復的佛塔。

它也許不會永遠存在。

但是我相信，那些人曾經為它付出的心意，不會因為石頭有一天損壞，就變得沒有意義。

就像我們曾經一起度過的日子。

即使有一天，你不再記得所有細節，它們也不會因此變得不重要。

如果你真的替我完成了這趟旅程，我希望你不要再覺得自己欠我什麼。

你已經陪我走過很多地方了。

剩下的路，請好好為自己走。

祝你平安。

映真`,
];

const enLetter = [
  `Dear Lin Che,

If you really made it to Chimphu, I think you must have come a long way. I don't know when you'll read this letter, or what the world will be like then.

Do you remember my first trip to Nepal? I told you I wanted to help restore the stupa. You asked what I could do when I hadn't studied architecture. You were right, really. I didn't have any skills for it. I could only sort records, carry things, and do a few small jobs. But I really loved it there.

After the earthquake, the upper part of the stupa was damaged, and many people were heartbroken. Yet every morning they still came to walk around it. Some carried prayer wheels, some brought flowers, and some simply walked in silence. I couldn't understand how a damaged stupa could bring people so much comfort. A teacher told me later that it was because we knew it would break and still wanted to put it right. I've always remembered that.`,
  `Later I found the stone tablet. You'll probably laugh. I spent so much time studying it, and I still don't know how old it is. The prophecies about iron birds, iron horses and mirrors might have come down from long ago, or they might have been reinterpreted in later traditions. I don't know whether the writing on the tablet all dates from the same time, either.

But I love the story about mirrors. Imagine someone long ago seeing how we live now. Wouldn't it seem astonishing? We can sit at a screen and see what's happening on the other side of the world. We can talk to people far away, keep photos and voices, even bring something from the past back before our eyes. I've always thought that was extraordinary.`,
  `Then I got sick, and I realized that with everything we know, there is still so much we can't decide. I could look up almost anything about an illness. I could read the latest research. I could learn the odds for every treatment. None of it could tell me how much longer I would live.

I wanted so badly to get better. I still wanted to travel with you. I wanted to see the cherry blossoms in Kyoto, go to India, visit all those places we circled on the map and hadn't reached yet. So I came back on pilgrimage. I trusted my doctors. Alongside doing what I could for my treatment, I wanted somewhere I could come to pray.

In Chimphu I often wondered what I'd do first if I got better. I could never think of any grand ambition. I just wanted to walk, eat and travel with you. And, if we could, sit in a café all afternoon doing nothing at all.

My condition gradually stabilized. I thought I had plenty of time again, so I decided to go back to my research. I left the tablet here because I still hadn't established where it came from. I agreed with the teacher that I'd return to deal with it someday.`,
  `I left this letter here as well. I didn't think I was certain to die. After being ill, I began to understand that there are things you should say while you still can.

I don't know how far technology will go. You used to tell me about AI and models and machine learning. Sometimes I barely understood a word, but I could tell how much you loved talking about it. Maybe one day there really will be a computer that can learn the way a person talks. It might keep every sentence I've ever written, and even chat with you the way I did.

If someone follows my instructions and uses those records to help you find this letter, I'm grateful. I hope that if it can still talk to you, you won't take that to mean I'm somewhere waiting for you. I don't want to become a shadow you can never leave behind.`,
  `I love you because you think things through and put real effort into what matters to you. But you worry so much about the future. You worry about doing well enough, about work, about wasting time.

Do you remember when we took the wrong train in Japan? You were anxious and kept looking up how to get back to the original station. I thought the view from the window was beautiful. We ended up getting off at a little station we'd never planned to visit. We didn't see any famous sights that afternoon. We just found an old café. I still remember it as my favorite trip.

So if one day you really don't know where to go, try not to be too afraid. You can walk a little way first. Taking a wrong turn sometimes is all right.`,
  `As for the tablet, if it doesn't belong here after all, I hope you'll follow the custodians' arrangements and help me return it to Boudhanath. That's where I first made a vow. I want the tablet to go back there. And I hope you get to see for yourself the stupa the earthquake damaged and so many people came together to restore.

It may not stand forever. I believe the care those people put into it will still mean something when the stones are damaged again. The same is true of the days we spent together. They'll still matter, even if someday you can't remember every detail.

If you really have finished this journey for me, I hope you won't feel you owe me anything anymore. You've already been with me to so many places. Walk the rest of the way for yourself.

May you be safe.
Yingzhen`,
];

function letterEntries(pages, title, next, decision) {
  return Object.fromEntries(pages.flatMap((body, index) => {
    const page = index + 1;
    const key = `mirror.chapter.finale.letter${page}`;
    return [
      [`${key}.title`, title(page, pages.length)],
      [`${key}.body`, body],
      [`${key}.action`, page < pages.length ? next : decision],
    ];
  }));
}

i18n.register({
  zh: {
    'mirror.chapter.finale.summary': '讀完映真的信，決定代理的任務，循保管程序交還石板並點一盞燈。',
    'mirror.chapter.finale.diary.finish': '讀完日記',
    ...letterEntries(zhLetter, (page, total) => `寫給未來的你 · ${page}／${total}`, '翻到下一頁', '查看信末的離線頁面'),
    'mirror.chapter.finale.title': '寫給未來的你／一盞燈',
    'mirror.chapter.finale.intro': '青朴石窟裡，林澈拆開了映真留下的信。信是她生前親手寫下的。',
    'mirror.chapter.finale.letterSource': '映真的手寫信 · 小說原文',
    'mirror.chapter.finale.decision.title': '數位代理 · 離線交付確認',
    'mirror.chapter.finale.decision.action': '查看交付選項',
    'mirror.chapter.finale.decision.body': '掃描信末的 QR Code 後，手機開啟預先下載的頁面。指定對象已抵達青朴，石板已尋獲，最後信件已開啟。\n\n結束任務後，代理將停止主動聯絡，也不再扮演映真。照片、日記、錄音與已保存的訊息都會留下。',
    'mirror.chapter.finale.decision.end': '結束任務',
    'mirror.chapter.finale.decision.retain': '保留連結',
    'mirror.chapter.finale.response.title': '離線交付回覆',
    'mirror.chapter.finale.response.action': '闔上手機',
    'mirror.chapter.finale.response.body': '離線頁面已記錄林澈的選擇。',
    'mirror.chapter.finale.response.body.end': '「謝謝你陪我走完這段路。」\n\n「再見，林澈。」\n\n任務結束，帳號已停用。照片、日記、錄音與聊天紀錄仍被保存。林澈收起手機，帶著信走出石窟。',
    'mirror.chapter.finale.response.body.retain': '「我會把這些記憶留在這裡。」\n\n「但接下來的路，你要自己走了。」\n\n連結成為安靜的資料庫，不再主動聯絡，也不再扮演映真。照片、日記、錄音與聊天紀錄仍被保存。林澈收起手機，帶著信走出石窟。',
    'mirror.chapter.finale.custody.title': '塔旁的小經堂',
    'mirror.chapter.finale.custody.action': '核對紀錄，交還石板',
    'mirror.chapter.finale.custody.body': '幾天後，林澈帶著石板與當年的保管紀錄回到博達哈。洛桑與寺方核對後，把這塊來源未明的石板安置在塔旁新設小經堂的石龕裡，並未嵌入古老的塔身。\n\n洛桑：「你找到想找的東西了嗎？」\n林澈：「我找到石板了。」\n洛桑：「還有呢？」\n林澈：「我不知道。」\n\n老人點頭，沒有追問。林澈想起映真拿著筆記本追問石板來歷的樣子，輕輕笑了。',
    'mirror.chapter.finale.kora1.title': '西側 · 開始繞塔',
    'mirror.chapter.finale.kora1.action': '沿西側慢慢走',
    'mirror.chapter.finale.kora1.body': '小雨剛停，博達哈的清晨仍有薄霧。林澈把佛塔留在右手邊，跟著清晨的人群往前走。',
    'mirror.chapter.finale.kora2.title': '北側 · 轉經筒',
    'mirror.chapter.finale.kora2.action': '沿北側繼續',
    'mirror.chapter.finale.kora2.body': '一位母親牽著孩子，慢慢推動轉經筒。',
    'mirror.chapter.finale.kora3.title': '東側 · 晨光',
    'mirror.chapter.finale.kora3.action': '走過東側',
    'mirror.chapter.finale.kora3.body': '晨光越過屋頂，照到修復後的白色塔身。',
    'mirror.chapter.finale.kora4.title': '南側 · 燈房',
    'mirror.chapter.finale.kora4.action': '繞回南側',
    'mirror.chapter.finale.kora4.body': '繞回來時，還有人正要出發。燈房在前方。',
    'mirror.chapter.finale.lamp.title': '一盞酥油燈',
    'mirror.chapter.finale.lamp.action': '點亮一盞燈',
    'mirror.chapter.finale.lamp.body': '我想，往後無論走到哪裡，都別忘了珍惜眼前的人。遇見正在受苦的人時，願意停下來，做一點自己能做的事。',
    'mirror.chapter.finale.diary.title': '筆記本的第一頁',
    'mirror.chapter.finale.diary.action': '讀完手寫日記',
    'mirror.chapter.finale.diary.body': '林澈把手機收回口袋，沒有照推薦行程走。他沿小路走進清晨的街道，在茶店點了一杯熱奶茶，坐到窗邊，拿出空白筆記本。\n\n博達哈的清晨，風很輕。\n\n今天，終於走完了我們約好的旅行。\n明天，想去一個沒去過的地方。',
    'mirror.chapter.finale.complete.title': '走進清晨的街道',
    'mirror.chapter.finale.complete.action': '查看旅程',
    'mirror.chapter.finale.complete.body': '有些人留下建築。\n有些人留下文字。\n有些人留下能夠思考的機器。\n而有些人，只是曾經認真地愛過另一個人。\n\n那些事物終有一天可能損壞、遺失，甚至被遺忘。\n但它們曾經帶來的改變，也許會繼續延伸——就像一座佛塔，一塊石板，一個跨越多年才被完成的願望。\n\n林澈喝了一口奶茶，起身走進陽光裡。\n\n他沒有忘記她。\n只是終於願意，帶著那份記憶繼續生活。',
    'mirror.chapter.finale.lampPrayer.title': '我到了',
    'mirror.chapter.finale.lampPrayer.body': '小雨後的晨光照進燈房。林澈望著剛點亮的酥油燈，雙手合十。\n\n「我到了。」\n\n「你可以放心了。」\n\n這一次，他沒有祈求映真回來。他只希望自己能珍惜眼前的人，遇見受苦的人時，願意停下來做一點自己能做的事。',
    'mirror.chapter.finale.lampPrayer.action': '離開燈房，走向茶店',
  },
  en: {
    'mirror.chapter.finale.summary': 'Read Yingzhen’s letter, decide the proxy’s task, return the tablet and light a lamp.',
    'mirror.chapter.finale.diary.finish': 'Finish reading',
    ...letterEntries(enLetter, (page, total) => `To You in the Future · ${page} of ${total}`, 'Turn the page', 'Open the offline page'),
    'mirror.chapter.finale.title': 'To You in the Future / A Single Lamp',
    'mirror.chapter.finale.intro': 'Inside the cave at Chimphu, Lin Che opens the letter Yingzhen wrote by hand during her lifetime.',
    'mirror.chapter.finale.letterSource': 'Yingzhen’s handwritten letter · Translated from the novel',
    'mirror.chapter.finale.decision.title': 'Digital Proxy · Offline Handoff',
    'mirror.chapter.finale.decision.action': 'Review handoff options',
    'mirror.chapter.finale.decision.body': 'Scanning the QR code at the end of the letter opens a page already on the phone. The intended recipient has reached Chimphu, found the tablet and opened the final letter.\n\nEnding the task stops the proxy from contacting you proactively or speaking as Yingzhen. Saved photos, diaries, recordings and messages will remain.',
    'mirror.chapter.finale.decision.end': 'End the task',
    'mirror.chapter.finale.decision.retain': 'Keep the link',
    'mirror.chapter.finale.response.title': 'Offline Handoff Response',
    'mirror.chapter.finale.response.action': 'Put the phone away',
    'mirror.chapter.finale.response.body': 'The offline page has recorded Lin Che’s choice.',
    'mirror.chapter.finale.response.body.end': '“Thank you for walking this road with me.”\n\n“Goodbye, Lin Che.”\n\nThe task ends and the account is disabled. Saved photographs, diaries, recordings and conversations remain. Lin Che pockets his phone and carries the letter out of the cave.',
    'mirror.chapter.finale.response.body.retain': '“I will keep these memories here.”\n\n“But you must walk the road ahead yourself.”\n\nThe link becomes a quiet archive. It no longer initiates contact or portrays Yingzhen. Saved photographs, diaries, recordings and conversations remain. Lin Che pockets his phone and carries the letter out of the cave.',
    'mirror.chapter.finale.custody.title': 'The Small Chapel by the Stupa',
    'mirror.chapter.finale.custody.action': 'Check the record and return the tablet',
    'mirror.chapter.finale.custody.body': 'A few days later, Lin Che returns to Boudhanath with the tablet and original custody records. Losang and the monastery verify them and place the tablet, its origin still uncertain, in a stone niche in a new chapel beside the stupa. It is not embedded in the ancient structure.\n\nLosang: “Did you find what you were looking for?”\nLin Che: “I found the tablet.”\nLosang: “And what else?”\nLin Che: “I don’t know.”\n\nThe elder nods without pressing him. Remembering Yingzhen with her notebook, eagerly asking about the tablet, Lin Che smiles.',
    'mirror.chapter.finale.kora1.title': 'West Side · Begin the Kora',
    'mirror.chapter.finale.kora1.action': 'Walk slowly along the west side',
    'mirror.chapter.finale.kora1.body': 'The drizzle has stopped. Mist lingers over Boudhanath at dawn. Lin Che keeps the stupa on his right and follows the morning visitors.',
    'mirror.chapter.finale.kora2.title': 'North Side · Prayer Wheels',
    'mirror.chapter.finale.kora2.action': 'Continue along the north side',
    'mirror.chapter.finale.kora2.body': 'A mother leads her child by the hand as they turn the prayer wheels.',
    'mirror.chapter.finale.kora3.title': 'East Side · Morning Light',
    'mirror.chapter.finale.kora3.action': 'Pass the east side',
    'mirror.chapter.finale.kora3.body': 'Morning light reaches past the rooftops to the restored white stupa.',
    'mirror.chapter.finale.kora4.title': 'South Side · The Lamp Room',
    'mirror.chapter.finale.kora4.action': 'Round the south side',
    'mirror.chapter.finale.kora4.body': 'As you come around, others are just setting out. The lamp room is ahead.',
    'mirror.chapter.finale.lamp.title': 'A Butter Lamp',
    'mirror.chapter.finale.lamp.action': 'Light one lamp',
    'mirror.chapter.finale.lamp.body': 'Wherever I go, I hope I remember to cherish the people in front of me. When I meet someone who is suffering, I hope I can stop and do some small thing within my means.',
    'mirror.chapter.finale.diary.title': 'The First Page of the Notebook',
    'mirror.chapter.finale.diary.action': 'Finish reading the handwritten diary',
    'mirror.chapter.finale.diary.body': 'Lin Che pockets his phone and leaves the suggested itineraries behind. He follows a lane into the morning streets, orders hot milk tea in a tea shop, sits by the window and opens a blank notebook.\n\nThe morning breeze in Boudhanath is gentle.\n\nToday I finally finished the journey we promised each other.\nTomorrow I want to go somewhere I’ve never been.',
    'mirror.chapter.finale.complete.title': 'Out Into the Morning',
    'mirror.chapter.finale.complete.action': 'View the journey',
    'mirror.chapter.finale.complete.body': 'Some leave buildings.\nSome leave words.\nSome leave machines that can think.\nAnd some have simply loved another person with all their heart.\n\nOne day those things may break, be lost, or even be forgotten.\nYet the changes they once brought may keep reaching outward—like a stupa, a stone tablet, a wish fulfilled only after many years.\n\nLin Che takes a sip of milk tea, rises and steps into the sunlight.\n\nHe has not forgotten her.\nHe is finally willing to carry that memory onward, and keep living.',
    'mirror.chapter.finale.lampPrayer.title': 'I Have Arrived',
    'mirror.chapter.finale.lampPrayer.body': 'Morning light after the drizzle enters the lamp room. Lin Che joins his palms before the butter lamp he has just lit.\n\n“I have arrived.”\n\n“You can rest easy now.”\n\nThis time he does not ask for Yingzhen to return. He hopes to cherish those before him, and to stop and do what he can when he meets someone suffering.',
    'mirror.chapter.finale.lampPrayer.action': 'Leave the lamp room for the tea shop',
  },
});
