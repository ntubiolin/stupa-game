import { i18n } from '../i18n.js';

const prefix = 'mirror.chapter.mangyul.';
const entries = {
  'title': ['風雪中的十二位女神', 'Twelve Goddesses in the Snow'],
  'summary': ['循著山脊走過十二座祭壇，在芒域山口繫上一條經幡。', 'Follow the ridge past twelve altars and tie a prayer flag at Mangyul Pass.'],
  'intro': ['吉普車沿著山路攀升，越過芒域吉隆的山口時，風雪突然猛烈起來。車隊停在山腳等待。林澈望著車窗外無邊的白色，手機訊號忽明忽暗。', 'The jeep climbs the mountain road toward Kyirong. A sudden snowstorm stops the convoy at the foot of the pass. Lin Che watches the endless white beyond the window as his phone signal flickers.'],
  'message.title': ['微弱的訊號', 'A weak signal'],
  'message.body': [
    'AI：「你還好嗎？」\n林澈：「還活著。」\nAI：「她以前也很常這樣回答。」\n林澈：「你能不能不要每句話都提她？」\nAI：「可以。」',
    'AI: “Are you all right?”\nLin Che: “Still alive.”\nAI: “She used to say that a lot, too.”\nLin Che: “Could you stop bringing her up in every sentence?”\nAI: “Yes.”',
  ],
  'message.action': ['閱讀下一則訊息', 'Read the next message'],
  'memory.title': ['一整個下午', 'An entire afternoon'],
  'memory.body': [
    '林澈：「你知道她為什麼喜歡我嗎？」\nAI：「她曾經寫過，你是少數願意陪她在一個地方待上一整個下午，也不急著找下一個景點的人。」\n林澈：「她還說過別的嗎？」\nAI：「她說，你有時候太害怕浪費時間，所以反而忘了怎麼享受時間。」',
    'Lin Che: “Do you know why she liked me?”\nAI: “She wrote that you were one of the few people willing to spend a whole afternoon in one place with her, without rushing to the next sight.”\nLin Che: “Did she say anything else?”\nAI: “She said you were sometimes so afraid of wasting time that you forgot how to enjoy it.”',
  ],
  'memory.action': ['放下手機', 'Put down the phone'],
  'crossing.title': ['沒有出發的旅行', 'The trip that never began'],
  'crossing.body': [
    '兩年前，映真曾把去尼泊爾的機票放到他面前。兩人原本都已買好機票，卻因研究計畫延期而取消。那張機票終究沒有用上。三個月後，車禍奪走了她。\n\n他總以為還有下一次。當夜，古地圖發出微光，十二座祭壇沿著風雪中的山脊排開。',
    'Two years earlier, Yingzhen had placed tickets to Nepal before him. They had bought both tickets, but postponed the trip when the research project was delayed. They never used those tickets. Three months later, a car accident took her life.\n\nHe had always assumed there would be another chance. That night, the old map lights up, revealing twelve altars along the snowy ridge.',
  ],
  'crossing.action': ['踏上山道', 'Step onto the trail'],
  'question1.title': ['風中的第一個問題', 'The first question in the wind'],
  'question1.body': ['十二位丹瑪女神的身影在雪霧中顯現。風裡傳來聲音。\n「你為什麼還在走？」\n林澈握緊地圖。他原以為自己只是來替映真完成一趟旅行。', 'The twelve Tenma appear in the snow. A voice rides the wind.\n“Why are you still walking?”\nLin Che grips the map. He had thought he was only finishing a journey for Yingzhen.'],
  'question1.action': ['繼續往前', 'Keep walking'],
  'question2.title': ['走到終點以後', 'At the end of the road'],
  'question2.body': ['「你以為走到終點，就能找回失去的人嗎？」\n他沒有回答。手機裡仍保存著她的聲音，可是山道上，只有自己的腳步。', '“Do you think reaching the end will bring back the person you lost?”\nHe gives no answer. Her voice remains in his phone, but only his footsteps sound on the trail.'],
  'question2.action': ['聽見自己的腳步', 'Listen to your footsteps'],
  'question3.title': ['螢幕另一端', 'Beyond the screen'],
  'question3.body': ['「如果那只是機器呢？」\n林澈想起螢幕上的訊息。它知道她留下的文字，也帶他走到了這裡。這些陪伴，不能替她重新活一次。', '“What if it is only a machine?”\nLin Che remembers the messages. It knows the words she left and has guided him this far. Its companionship cannot live her life again.'],
  'question3.action': ['望向風雪盡頭', 'Look beyond the snow'],
  'answer.title': ['最後一個問題', 'The last question'],
  'answer.body': ['「如果她已經不在了，你還會繼續走嗎？」\n林澈站在風雪裡，想了很久。這次，他必須親自回答。', '“If she is already gone, will you keep walking?”\nLin Che stands in the storm for a long time. This time he must answer for himself.'],
  'answer.action': ['會', 'Yes'],
  'answer.yes': ['會', 'Yes'],
  'response.body.yes': ['「會。」風忽然停了一瞬。林澈抬起頭，向山口再走一步。', '“Yes.” The wind falls still for a moment. Lin Che lifts his head and takes another step toward the pass.'],
  'flags.title': ['山口的木柱', 'The post at the pass'],
  'flags.body': ['「會。」他的回答落在風裡，雪勢開始平息。洛桑站在木柱旁，陪他展開折好的經幡。', '“Yes.” His answer carries into the wind, and the snow begins to ease. Losang waits by the post and helps him unfold a prayer flag.'],
  'flags.action': ['繫上經幡', 'Tie the prayer flag'],
  'clearing.title': ['風雪漸歇', 'The storm lifts'],
  'clearing.body': ['洛桑把五色經幡繫在山口石堆上。\n「有些願望不是為了留住過去。」\n「而是為了讓風把祝福帶向未來。」\n五色經幡展開。林澈拿出手機，想把眼前的雪傳出去。', 'Losang ties the five-colored flags to the cairn at the pass.\n“Some wishes are not meant to hold onto the past.”\n“They let the wind carry blessings into the future.”\nThe five colors unfold. Lin Che takes out his phone to send a message about the snow.'],
  'clearing.action': ['回到車裡', 'Return to the vehicle'],
  'phone.title': ['把雪傳出去', 'Send the snow'],
  'phone.body': ['山口短暫恢復訊號。林澈打開聊天視窗。', 'A signal returns briefly at the pass. Lin Che opens the conversation.'],
  'phone.action': ['打開手機', 'Open the phone'],
  'diary.title': ['日記 · 願意出發', 'Diary · Willing to set out'],
  'diary.body': [
    '在車隊重新出發以前，我又想起那個「等一下」。有些時間等不回來。山口的經幡被風吹起時，我沒有求誰告訴我未來，只希望下一次，我願意出發。',
    'Before the convoy moved again, I thought about all the times I said, “Just a little longer.” Some time never comes back. When the flag lifted at the pass, I asked no one to tell me the future. I only hoped that, next time, I would be willing to set out.',
  ],
  'diary.finish': ['讀完日記', 'Finish reading'],
  'diary.action': ['讀完日記', 'Finish reading'],
};

const altarLines = [
  ['第一座祭壇問林澈，他會不會失去工作。', 'the first altar asks whether Lin Che will lose his job.'],
  ['第二座祭壇問他，人工智慧是否終有一天會取代人類。', 'the second altar asks whether AI will one day replace humanity.'],
  ['第三座祭壇問他，自己是不是正在被世界拋下。', 'the third altar asks whether the world is leaving him behind.'],
  ['冰粒敲著柱腳，石板邊緣已積了一圈白霜。', 'sleet taps the posts, and white frost rims the stone slab.'],
  ['風拂過石面，剛留下的腳印正在變淺。', 'wind skims the stone, and the newest footprints begin to fade.'],
  ['山脊後的霧捲起又落下。停一步，等遠處的石輪廓浮現。', 'mist rises and falls behind the ridge. Pause until the outline of the distant stone returns.'],
  ['祭壇背面有一小片背風處，雪在那裡落得很慢。', 'in the lee of the altar, the snow falls slowly.'],
  ['兩根木柱之間，凍硬的布角突然鬆開，輕拍石面。', 'between two posts, the corner of a frozen cloth works loose and taps the stone.'],
  ['鞋底踩碎薄冰，聲音在一陣風過後才聽得清楚。', 'thin ice cracks underfoot, audible only when the gust passes.'],
  ['遠處已看不清來路，前方卻還有另一道低矮的石影。', 'the trail behind has disappeared, but another low silhouette stands ahead.'],
  ['風把雪吹成一道斜線，山口的木柱在白霧裡時隱時現。', 'wind slants the snow, and the pass posts come and go in the white.'],
  ['雪霧中，十二道身影逐漸顯現。風裡像有聲音，請他再往前一步。', 'Twelve figures emerge in the mist. A voice in the wind seems to ask him to take another step.'],
];

for (const [index, body] of altarLines.entries()) {
  const number = index + 1;
  entries[`altar${number}.title`] = [`祭壇 ${number}／12`, `Altar ${number} of 12`];
  entries[`altar${number}.body`] = body;
  entries[`altar${number}.action`] = ['停下觀察', 'Pause and observe'];
}

i18n.register(Object.fromEntries(['zh-Hant', 'en'].map((language, index) => [
  language,
  Object.fromEntries(Object.entries(entries).map(([key, values]) => [prefix + key, values[index]])),
])));
