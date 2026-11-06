import { i18n } from '../i18n.js';

const prefix = 'mirror.chapter.mangyul.';
const entries = {
  'title': ['風雪中的十二位女神', 'Twelve Goddesses in the Snow'],
  'summary': ['循著山脊走過十二座祭壇，在芒域山口繫上一條經幡。', 'Follow the ridge past twelve altars and tie a prayer flag at Mangyul Pass.'],
  'intro': ['車隊在芒域吉隆山腳停下來等候。林澈坐在車裡，手機的訊號忽明忽暗。', 'The convoy waits at the foot of the Kyirong pass. Inside the vehicle, Lin Che watches the signal on his phone flicker.'],
  'message.title': ['微弱的訊號', 'A weak signal'],
  'message.body': [
    '原作小說對話\nAI：「你還好嗎？」\n林澈：「還活著。」\nAI：「她以前也很常這樣回答。」\n林澈：「你能不能不要每句話都提她？」\nAI：「可以。」',
    'Dialogue adapted from the novel\nAI: “Are you all right?”\nLin Che: “Still alive.”\nAI: “She used to say that a lot, too.”\nLin Che: “Could you stop bringing her up in every sentence?”\nAI: “Yes.”',
  ],
  'message.action': ['閱讀下一則訊息', 'Read the next message'],
  'memory.title': ['一整個下午', 'An entire afternoon'],
  'memory.body': [
    '原作小說對話節選\n林澈：「你知道她為什麼喜歡我嗎？」\nAI：「她曾經寫過，你是少數願意陪她在一個地方待上一整個下午，也不急著找下一個景點的人。」\n林澈：「她還說過別的嗎？」\nAI：「她說，你有時候太害怕浪費時間，所以反而忘了怎麼享受時間。」',
    'Selected dialogue adapted from the novel\nLin Che: “Do you know why she liked me?”\nAI: “She wrote that you were one of the few people willing to spend a whole afternoon in one place with her, without rushing to the next sight.”\nLin Che: “Did she say anything else?”\nAI: “She said you were sometimes so afraid of wasting time that you forgot how to enjoy it.”',
  ],
  'memory.action': ['放下手機', 'Put down the phone'],
  'crossing.title': ['沒有出發的旅行', 'The trip that never began'],
  'crossing.body': [
    '原作情節改編\n他曾答應映真，等專案結束就去尼泊爾。後來又來了新的專案，再後來，她生病了。那天夜裡，古地圖發出微光，十二座祭壇沿著風雪中的山脊排開。',
    'Adapted from the novel\nHe had promised Yingzhen they would go to Nepal after the project ended. Then came another project. Then she fell ill. That night, the old map lights up, revealing twelve altars along the snowbound ridge.',
  ],
  'crossing.action': ['踏上山道', 'Step onto the trail'],
  'answer.title': ['即使知道會失去', 'Even knowing what he would lose'],
  'answer.body': [
    '原作小說對話節選\n「如果你早知道她會死，還會愛她嗎？」\n林澈想了很久。「會。」\n「我還是會害怕，還是會難過。可是，如果因為害怕失去，就不願意開始，那我們什麼也不會留下。」',
    'Selected dialogue adapted from the novel\n“If you had known she would die, would you still have loved her?”\nLin Che thought for a long time. “Yes.”\n“I would still be afraid. I would still grieve. But if fear of loss kept us from beginning, we would leave nothing behind.”',
  ],
  'answer.action': ['望向山口', 'Look toward the pass'],
  'flags.title': ['山口的木柱', 'The post at the pass'],
  'flags.body': ['雲層露出一線亮光。靠近木柱，把折好的經幡繫到繩上。', 'A break opens in the clouds. Approach the wooden post and tie the folded flag to the line.'],
  'flags.action': ['繫上經幡', 'Tie the prayer flag'],
  'clearing.title': ['風雪漸歇', 'The storm lifts'],
  'clearing.body': ['雪粒逐漸稀落，五色經幡在木柱間展開。等風稍歇，再回到車裡。', 'The snowfall thins as the five colors unfold between the posts. When the wind eases, return to the vehicle.'],
  'clearing.action': ['回到車裡', 'Return to the vehicle'],
  'diary.title': ['日記 · 願意出發', 'Diary · Willing to set out'],
  'diary.body': [
    '章節日記（遊戲改編）\n在車隊重新出發以前，我又想起那個「等一下」。有些時間等不回來。山口的經幡被風吹起時，我沒有求誰告訴我未來，只希望下一次，我願意出發。',
    'Chapter diary (game adaptation)\nBefore the convoy moved again, I thought about all the times I said, “Just a little longer.” Some time never comes back. When the flag lifted at the pass, I asked no one to tell me the future. I only hoped that, next time, I would be willing to set out.',
  ],
  'diary.finish': ['讀完日記', 'Finish reading'],
  'diary.action': ['讀完日記', 'Finish reading'],
};

const altarLines = [
  ['原作情節：第一座祭壇問林澈，他會不會失去工作。', 'From the novel: the first altar asks whether Lin Che will lose his job.'],
  ['原作情節：第二座祭壇問他，人工智慧是否終有一天會取代人類。', 'From the novel: the second altar asks whether AI will one day replace humanity.'],
  ['原作情節：第三座祭壇問他，自己是不是正在被世界拋下。', 'From the novel: the third altar asks whether the world is leaving him behind.'],
  ['場景改編：冰粒敲著柱腳，石板邊緣已積了一圈白霜。', 'Scene adaptation: sleet taps the posts, and white frost rims the stone slab.'],
  ['場景改編：風拂過石面，剛留下的腳印正在變淺。', 'Scene adaptation: wind skims the stone, and the newest footprints begin to fade.'],
  ['場景改編：山脊後的霧捲起又落下。停一步，等遠處的石輪廓浮現。', 'Scene adaptation: mist rises and falls behind the ridge. Pause until the outline of the distant stone returns.'],
  ['場景改編：祭壇背面有一小片背風處，雪在那裡落得很慢。', 'Scene adaptation: in the lee of the altar, the snow falls slowly.'],
  ['場景改編：兩根木柱之間，凍硬的布角突然鬆開，輕拍石面。', 'Scene adaptation: between two posts, the corner of a frozen cloth works loose and taps the stone.'],
  ['場景改編：鞋底踩碎薄冰，聲音在一陣風過後才聽得清楚。', 'Scene adaptation: thin ice cracks underfoot, audible only when the gust passes.'],
  ['場景改編：遠處已看不清來路，前方卻還有另一道低矮的石影。', 'Scene adaptation: the trail behind has disappeared, but another low silhouette stands ahead.'],
  ['場景改編：風把雪吹成一道斜線，山口的木柱在白霧裡時隱時現。', 'Scene adaptation: wind slants the snow, and the pass posts come and go in the white.'],
  ['原作小說：「如果你早知道她會死，還會愛她嗎？」', 'From the novel: “If you had known she would die, would you still have loved her?”'],
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
