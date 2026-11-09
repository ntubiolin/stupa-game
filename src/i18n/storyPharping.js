import { i18n } from '../i18n.js';

const entries = {
  intro: ['林澈踏進帕平。手機沒有訊號。他再次確認映真的資料仍在，才收起手機，沿著乾涸的水道前行。', 'Lin Che enters Pharping. His phone has no signal. He checks once more that Yingzhen’s files are still there, then follows the dry channel.'],
  'backup.title': ['三份備份', 'Three backups'],
  'backup.body': ['身為工程師，他很清楚任何資料都可能損壞，所以他把關於許映真的所有東西複製了三份。一份在電腦裡，一份在硬碟裡，另一份放在雲端。\n\n他很少打開，卻不敢刪除任何一個檔案。只要那些資料還在，她就還沒有真正消失。他一直這樣告訴自己。', 'After Yingzhen died, Lin Che made three copies of every photograph, message, email and recording. One on his computer, one on a hard drive, one in the cloud.\n\nHe rarely opened them, but dared not delete a single file. As long as the data remained, she had not entirely disappeared. He kept telling himself that.'],
  'backup.action': ['收起手機，走向泉眼', 'Put away the phone and approach the spring'],
  'spring1.body': ['泉眼被石塊壓住。林澈俯身搬開一塊，指間都是乾土。', 'Stones block the spring. Lin Che bends to move one, dry earth covering his fingers.'],
  'spring2.body': ['石縫底下有一點濕意。他急著伸手探入，反而攪起了沉在底下的泥沙。', 'Moisture glints beneath the stones. Reaching in too quickly, he stirs the silt settled below.'],
  'settle.title': ['被攪濁的水', 'Stirred silt'],
  'settle.body': ['泥水遮住了泉底。他越急著挖，水就越混濁。林澈停下手，讓泥沙慢慢沉下去。\n\n有些東西，抓得越緊，反而越看不清。', 'Muddy water hides the bottom. The faster he digs, the cloudier it becomes. Lin Che stills his hands and lets the silt settle.\n\nThe harder he grasps, the less clearly he can see.'],
  'settle.action': ['停手，讓泥沙沉下', 'Still your hands and let the silt settle'],
  'channel1.body': ['他沿水道搬開碎石，這次放慢了動作。', 'He follows the channel, moving loose stones more gently this time.'],
  'channel2.body': ['最後一處堵塞鬆開，淺水卻還帶著泥色。他沒有再伸手攪動。', 'The last blockage gives way, but the shallow water is still muddy. He leaves it undisturbed.'],
  'wait.title': ['等水清下來', 'Let the water clear'],
  'wait.body': ['林澈蹲在泉邊，看著泥沙緩緩落下。水面終於映出一小片天空。\n\n他想起反覆檢查的備份。留下她的聲音，和把她留在身邊，原來是兩件事。', 'Lin Che crouches beside the spring as the silt slowly sinks. A small patch of sky appears on the surface.\n\nHe thinks of the backups he checks again and again. Keeping her voice and keeping her beside him are two different things.'],
  'wait.action': ['靜看澄清的水面', 'Observe the clearing water'],
  'lamp.title': ['洞口的一盞燈', 'A lamp at the cave'],
  'lamp.body': ['雨聲漸遠。洞口的石階被磨得很光滑。林澈在燈前蹲下，替一盞酥油燈點起火。微小的光在風裡輕輕搖晃。', 'The rain recedes. Countless feet have worn the cave steps smooth. Lin Che crouches and lights a butter lamp. Its small flame trembles in the wind.'],
  'lamp.action': ['點亮酥油燈', 'Light the butter lamp'],
  'practitioner.title': ['揚列雪洞口的修行者', 'Practitioner at Yangleshö Cave'],
  'practitioner.action': ['與洞口修行者交談', 'Speak with the cave practitioner'],
  'practitioner.body': [
    '岩洞旁披著絳紅法衣的修行者緩緩睜開雙眼，合掌低語：\n\n「遠來的人，這座揚列雪岩洞，正是昔日蓮花生大士閉關修持大樂蓮師與普巴金剛、調伏山谷旱障魔眾的聖地。那時帕平三年不雨、三泉乾涸，大士自印度迎請《普巴金剛續》，以悲智金剛杵摧破無明與執著，甘霖才重新落回人間。\n\n你看洞口的酥油燈——水若急著掏挖便會混濁，心若死抓不放便看不清倒影。唯有讓泥沙靜靜沉下，燈火才能照見真正的願心。」',
    'The practitioner in crimson robes beside the cave slowly opens his eyes, palms joined in a quiet voice:\n\n"Traveler from afar, this Yangleshö Cave is the sacred ground where Guru Rinpoche once meditated on Yangdak Heruka and Vajrakīlaya to subdue the drought spirits of the valley. When Pharping suffered three rainless years and its three springs ran dry, the Master sent for the Vajrakīlaya tantras from India, piercing ignorance and clinging with compassionate resolve until rain fell once more.\n\nLook at the butter lamps by the cave mouth — water stirred in haste grows cloudy, and a heart that clutches too tightly cannot see its reflection. Only when the silt settles can the lampflame reveal the true vow."',
  ],
  'practitioner.close': ['合掌致意，繼續前行', 'Bow in gratitude and continue'],
  'phone.title': ['燈光與訊息', 'Lamplight and a message'],
  'phone.body': ['手機亮了起來。他望著眼前的燈，打開訊息。', 'His phone lights up. Watching the lamp, he opens the message.'],
  'phone.action': ['打開手機訊息', 'Open phone messages'],
  'diary.body': ['映真的日記\n\n那裡的石階被磨得很平，像是很多人的時間都留在上面。\n\n我在洞口看了很久的燈。我希望有一天，你也能看到那裡的光。\n\n林澈把那段文字讀了好幾遍。這一次，他抬起頭，看著仍在搖晃的火焰。', 'Yingzhen’s journal\n\nThe stone steps are worn smooth. A single day could not leave those marks. They hold the time of many people.\n\nI watched the lamps at the cave for a long time. Perhaps one day Lin Che will come here too, and see that light.\n\nLin Che reads the words several times, then looks up at the trembling flame.'],
};

i18n.register(Object.fromEntries(['zh-Hant', 'en'].map((language, index) => [language,
  Object.fromEntries(Object.entries(entries).map(([key, values]) => [`mirror.chapter.pharping.${key}`, values[index]])),
])));
