/**
 * i18n strings for Ticket #60 — Merit Materials, Personal Votive Stupa Builder,
 * and Samye 1,008 Stupas Global Co-op Construction.
 *
 * Registers both `'zh-Hant'` and `'en'` with 100% key parity.
 */
import { i18n } from '../i18n.js';

const ZH_HANT = {
  // Modal header & tabs
  'stupaBuild.title': '功德立塔 ＆ 桑耶千塔共建',
  'stupaBuild.subtitle': '以繞塔禮拜之清淨功德，莊嚴個人發願佛塔，共修圓滿桑耶圍牆千塔',
  'stupaBuild.tab.build': '🏛️ 建造個人發願塔',
  'stupaBuild.tab.samye': '☸ 全服共建桑耶・千塔圓滿',
  'stupaBuild.btn.openTooltip': '建造個人發願塔 ＆ 全服共建桑耶 (B)',
  'stupaBuild.closeHint': '按 Esc 關閉視窗',

  // Part Categories
  'stupaBuild.cat.plinth': '塔基座壇',
  'stupaBuild.cat.dome': '塔身形制',
  'stupaBuild.cat.spire': '十三相輪與寶頂',
  'stupaBuild.cat.ornament': '莊嚴飾件',

  // Plinth options (4)
  'stupaBuild.part.plinth.whiteStone.name': '河岸白石座',
  'stupaBuild.part.plinth.whiteStone.desc': '採自雅魯藏布江畔的潔白卵石，樸實堅固，象徵出離初心。',
  'stupaBuild.part.plinth.lapisStone.name': '雅隆青金石座',
  'stupaBuild.part.plinth.lapisStone.desc': '深邃如夜空的雅隆青金石砌築，蘊含藥師琉璃淨土之定力。',
  'stupaBuild.part.plinth.alabaster.name': '芒域雪花玉座',
  'stupaBuild.part.plinth.alabaster.desc': '芒域雪山孕育的溫潤白玉，微透天青寶光，象徵清淨戒體。',
  'stupaBuild.part.plinth.vajraLotus.name': '金剛蓮華寶座',
  'stupaBuild.part.plinth.vajraLotus.desc': '八葉金蓮托起須彌寶座，金剛不壞，萬德莊嚴。',

  // Dome options (5)
  'stupaBuild.part.dome.whitePeace.name': '慈悲白塔（息災）',
  'stupaBuild.part.dome.whitePeace.desc': '效法桑耶東南菩提白塔，觀音大悲加持，息滅眾生苦厄與病障。',
  'stupaBuild.part.dome.redWisdom.name': '般若紅塔（懷愛）',
  'stupaBuild.part.dome.redWisdom.desc': '效法桑耶西南法輪紅塔，文殊智慧光照，攝受善緣與正法。',
  'stupaBuild.part.dome.greenActivity.name': '事業綠塔（成辦）',
  'stupaBuild.part.dome.greenActivity.desc': '效法桑耶東北如意綠塔，度母迅疾加持，圓滿世出世間善業。',
  'stupaBuild.part.dome.blackWrathful.name': '護法黑塔（降伏）',
  'stupaBuild.part.dome.blackWrathful.desc': '效法桑耶西北金剛黑塔，威猛護法鎮守，摧伏內外魔障與無明。',
  'stupaBuild.part.dome.crystalMandala.name': '伏藏琉璃光塔',
  'stupaBuild.part.dome.crystalMandala.desc': '蓮師伏藏密意化現之澄明琉璃寶塔，內映金剛法界微光。',

  // Spire options (3)
  'stupaBuild.part.spire.timberSpire.name': '檀木相輪',
  'stupaBuild.part.spire.timberSpire.desc': '古樸沉香檀木雕琢之七重相輪，隨風散發清涼禪悅。',
  'stupaBuild.part.spire.copperWheels.name': '赤銅十三天輪',
  'stupaBuild.part.spire.copperWheels.desc': '尼泊爾匠人鍛造之赤銅十三相輪，象徵佛果十三地功德圓滿。',
  'stupaBuild.part.spire.goldSunMoon.name': '純金日月寶頂',
  'stupaBuild.part.spire.goldSunMoon.desc': '十三金輪頂戴新月、日輪與那達火焰寶珠，悲智雙運，光耀十方。',

  // Ornament options (4)
  'stupaBuild.part.ornament.none.name': '素淨法相',
  'stupaBuild.part.ornament.none.desc': '不加外飾，唯顯佛塔本然清淨幾何之美。',
  'stupaBuild.part.ornament.prayerFlags.name': '五色風馬經幡',
  'stupaBuild.part.ornament.prayerFlags.desc': '自寶頂垂掛藍白紅綠黃五色風馬，隨高原長風將祈願傳遍虛空。',
  'stupaBuild.part.ornament.butterLamps.name': '長明酥油燈環',
  'stupaBuild.part.ornament.butterLamps.desc': '塔基四周環繞不滅酥油金燈，晝夜照破無明闇室。',
  'stupaBuild.part.ornament.mantraHalo.name': '藏文六字真言金環',
  'stupaBuild.part.ornament.mantraHalo.desc': '懸浮於塔身周遭緩緩旋繞的「嗡嘛呢叭咪吽」金色咒輪。',

  // Unlock requirements & badges
  'stupaBuild.req.default': '初始解鎖',
  'stupaBuild.req.unlocked': '✓ 已解鎖',
  'stupaBuild.req.locked': '🔒 未解鎖',
  'stupaBuild.req.kora': '需繞塔 {n} 圈',
  'stupaBuild.req.prostration': '需大禮拜 {n} 下',
  'stupaBuild.req.lamp': '需點燈 {n} 盞',
  'stupaBuild.req.join': ' · ',
  'stupaBuild.tier': '第 {n} 階',

  // Player stats bar in Builder
  'stupaBuild.stats.kora': '繞塔圈數',
  'stupaBuild.stats.prostration': '大禮拜',
  'stupaBuild.stats.lamp': '點燈供養',
  'stupaBuild.stats.merit': '總功德',

  // Preview mode & part selection
  'stupaBuild.previewMode.label': '⚡ 淨相預覽模式（自由預覽未解鎖莊嚴部件）',
  'stupaBuild.previewMode.warning': '目前預覽包含未解鎖部件；立塔銘刻時將自動改用已解鎖部件，或請先圓滿修持條件。',
  'stupaBuild.previewCard.title': '法相預覽',

  // Inscription form
  'stupaBuild.form.sectionTitle': '塔銘 ＆ 回向碑文',
  'stupaBuild.form.pilgrimName': '立塔行者',
  'stupaBuild.form.pilgrimPlaceholder': '輸入您的朝聖行者名號…',
  'stupaBuild.form.stupaTitle': '塔銘（佛塔名號）',
  'stupaBuild.form.stupaTitlePlaceholder': '例：蓮華吉祥塔、雪域光明塔…',
  'stupaBuild.form.dedication': '回向碑文',
  'stupaBuild.form.dedicationPlaceholder': '寫下您的發願與回向文，將銘刻於佛塔功德碑上…',
  'stupaBuild.form.presetLabel': '快速填入古典回向文：',
  'stupaBuild.preset.1': '願消三障諸煩惱，願得智慧真明了',
  'stupaBuild.preset.2': '願以此功德，普及於一切，我等與眾生，皆共成佛道',
  'stupaBuild.preset.3': '祈願世界和平、風調雨順，一切有情離苦得樂',
  'stupaBuild.preset.4': '迴向累世父母師長、六道有情，同生極樂淨土',
  'stupaBuild.btn.build': '🏛️ 立塔銘刻・安奉於塔林',
  'stupaBuild.btn.rejoice': '🙏 隨喜頂禮',
  'stupaBuild.defaultPilgrim': '雪域行者',
  'stupaBuild.defaultTitle': '蓮華吉祥塔',
  'stupaBuild.defaultMessage': '願以此功德，普及於一切，我等與眾生，皆共成佛道。',

  // 3D Plaque & Grove labels
  'stupaBuild.plaque.pilgrimPrefix': '立塔行者：',
  'stupaBuild.plaque.stats': '繞塔 {kora} · 禮拜 {prostration}',
  'stupaBuild.plaque.rejoiceCount': '🙏 {n} 人隨喜',
  'stupaBuild.monument.boudhaTitle': '🏛️ 發願立塔台・桑耶共建碑',
  'stupaBuild.monument.boudhaSub': '銘刻個人發願佛塔 · 助建桑耶千塔',
  'stupaBuild.monument.samyeTitle': '☸ 桑耶千塔共建功德碑',
  'stupaBuild.monument.samyeSub': '已圓滿 {n} / 1,008 座圍牆佛塔',

  // Samye Global Co-op Construction UI
  'stupaBuild.samye.headerTitle': '全服共建桑耶・千塔圓滿',
  'stupaBuild.samye.headerDesc': '赤松德贊王與蓮花生大士於紅巖山麓興建桑耶寺，圓形圍牆頂端安奉 1,008 座舍利小佛塔以鎮護法界。十方行者每奉獻功德，圍牆金頂蓮冠即點亮一尊！',
  'stupaBuild.samye.progressLabel': '已圓滿圍牆佛塔',
  'stupaBuild.samye.progressValue': '已圓滿 {current} / {max} 座圍牆佛塔 ({pct}%)',
  'stupaBuild.samye.totalKora': '全服累計繞塔',
  'stupaBuild.samye.totalProstrations': '全服累計大禮拜',
  'stupaBuild.samye.activeBlessing': '全服共修加持',
  'stupaBuild.samye.noBlessing': '尚未達成初階共修里程碑（需 108 座）',
  'stupaBuild.samye.blessingFmt': '修為獲取 +{exp}% · 尋寶幸運 +{find}%',
  'stupaBuild.samye.tierUnlocked': '✦ 已圓滿達成',
  'stupaBuild.samye.tierLocked': '需圓滿 {n} 座圍牆佛塔',

  // Milestone tiers (4)
  'stupaBuild.milestone.1': '初轉法輪',
  'stupaBuild.milestone.2': '四洲莊嚴',
  'stupaBuild.milestone.3': '日月齊輝',
  'stupaBuild.milestone.4': '千塔大圓滿',

  // Samye Contribution Panel & Contributors List
  'stupaBuild.samye.contributeTitle': '🙏 奉獻繞塔與禮拜功德助建',
  'stupaBuild.samye.contributeDesc': '每奉獻 108 點功德（相當於 1 圈繞塔或 4 次大禮拜），即可為桑耶寺圍牆點亮並安奉 +1 座金頂小佛塔。',
  'stupaBuild.samye.availableMerit': '可奉獻功德：{merit} 點（可助建 +{stupas} 座圍牆佛塔）',
  'stupaBuild.samye.spentMerit': '您已累計助建：{stupas} 座（已奉獻 {merit} 功德）',
  'stupaBuild.samye.noteLabel': '助建回向祝禱：',
  'stupaBuild.samye.notePlaceholder': '寫下助建桑耶千塔的祈願留言…',
  'stupaBuild.samye.btnContribute1': '🏛️ 奉獻 108 功德（助建 +1 座圍牆佛塔）',
  'stupaBuild.samye.btnContributeAll': '☸ 奉獻全部可用功德（助建 +{n} 座）',
  'stupaBuild.samye.btnDevotional': '🙏 隨喜供養一磚一瓦（助建 +1 座）',
  'stupaBuild.samye.contributorsTitle': '📜 十方助建芳名錄',
  'stupaBuild.samye.contributorsEmpty': '尚無助建紀錄，成為第一位護持桑耶千塔的行者吧！',
  'stupaBuild.samye.contributorItem': '{name} 助建 +{stupas} 座（繞塔 {kora} · 禮拜 {prostrations}）',

  // Prompts & Toasts
  'prompt.openStupaBuilder': '發願立塔・桑耶共建碑',
  'prompt.openSamyeMonument': '桑耶千塔共建功德碑（已圓滿 {n}/1008）',
  'prompt.rejoiceStupa': '🙏 隨喜頂禮「{title}」（立塔：{name}）',
  'toast.stupaBuilt': '🏛️ 已立塔銘刻「{title}」！安奉於發願塔林',
  'toast.stupaLockedFallback': '部分預覽部件尚未解鎖，已自動以您已解鎖的莊嚴部件立塔銘刻！',
  'toast.stupaRejoiced': '🙏 隨喜頂禮 {name} 所立「{title}」：「{message}」（功德 +18）',
  'toast.samyeContributed': '☸ 隨喜讚嘆！為桑耶寺圍牆助建了 +{n} 座佛塔（目前 {total}/1,008 座）',
  'toast.samyeNoMerit': '可奉獻功德不足 108 點，已為您隨喜供養一磚一瓦助建 +1 座佛塔！',
  'stupaBuild.buffName': '桑耶千塔共修加持',
};

const EN = {
  // Modal header & tabs
  'stupaBuild.title': 'Votive Stupa Builder & Samye Co-op',
  'stupaBuild.subtitle': 'Consecrate your personal votive stupa with Kora & Prostration merit, and co-build Samye’s 1,008 perimeter stupas',
  'stupaBuild.tab.build': '🏛️ Build Personal Votive Stupa',
  'stupaBuild.tab.samye': '☸ Samye 1,008 Stupas Co-op',
  'stupaBuild.btn.openTooltip': 'Votive Stupa Builder & Samye Co-op (B)',
  'stupaBuild.closeHint': 'Press Esc to close',

  // Part Categories
  'stupaBuild.cat.plinth': 'Plinth Base',
  'stupaBuild.cat.dome': 'Bumpa Dome',
  'stupaBuild.cat.spire': '13-Wheel Spire & Finial',
  'stupaBuild.cat.ornament': 'Sacred Ornaments',

  // Plinth options (4)
  'stupaBuild.part.plinth.whiteStone.name': 'White River Stone Plinth',
  'stupaBuild.part.plinth.whiteStone.desc': 'Hewn from white river stones of the Yarlung Tsangpo, humble and steadfast.',
  'stupaBuild.part.plinth.lapisStone.name': 'Yarlung Lapis Plinth',
  'stupaBuild.part.plinth.lapisStone.desc': 'Deep night-blue lapis lazuli from Yarlung, radiating the serenity of the Medicine Buddha.',
  'stupaBuild.part.plinth.alabaster.name': 'Mangyul Alabaster Plinth',
  'stupaBuild.part.plinth.alabaster.desc': 'Lustrous snow-alabaster from Mangyul with a sky-blue glow, embodying pure discipline.',
  'stupaBuild.part.plinth.vajraLotus.name': 'Vajra Lotus Plinth',
  'stupaBuild.part.plinth.vajraLotus.desc': 'Eight-petaled golden lotus supporting a Sumeru throne, indestructible and resplendent.',

  // Dome options (5)
  'stupaBuild.part.dome.whitePeace.name': 'White Stupa of Compassion',
  'stupaBuild.part.dome.whitePeace.desc': 'Inspired by Samye’s SE White Stupa, blessed by Avalokiteshvara to pacify suffering.',
  'stupaBuild.part.dome.redWisdom.name': 'Red Stupa of Wisdom',
  'stupaBuild.part.dome.redWisdom.desc': 'Inspired by Samye’s SW Red Stupa, glowing with Manjushri’s wisdom to gather auspiciousness.',
  'stupaBuild.part.dome.greenActivity.name': 'Green Stupa of Activity',
  'stupaBuild.part.dome.greenActivity.desc': 'Inspired by Samye’s NE Green Stupa, carrying Green Tara’s swift blessings of accomplishment.',
  'stupaBuild.part.dome.blackWrathful.name': 'Black Stupa of Protection',
  'stupaBuild.part.dome.blackWrathful.desc': 'Inspired by Samye’s NW Black Stupa, guarded by wrathful protectors to subdue obstacles.',
  'stupaBuild.part.dome.crystalMandala.name': 'Terma Crystal Mandala Stupa',
  'stupaBuild.part.dome.crystalMandala.desc': 'Translucent aquamarine crystal stupa manifested from Padmasambhava’s hidden Terma treasury.',

  // Spire options (3)
  'stupaBuild.part.spire.timberSpire.name': 'Sandalwood Spire',
  'stupaBuild.part.spire.timberSpire.desc': 'Seven-tiered spire carved from fragrant sandalwood, wafting tranquil dharma scent.',
  'stupaBuild.part.spire.copperWheels.name': 'Copper 13-Wheel Spire',
  'stupaBuild.part.spire.copperWheels.desc': 'Hammered red copper 13-wheel spire crafted in Nepal, symbolizing the thirteen bhumis.',
  'stupaBuild.part.spire.goldSunMoon.name': 'Pure Gold Sun-Moon Finial',
  'stupaBuild.part.spire.goldSunMoon.desc': 'Thirteen golden wheels crowned with crescent moon, sun disc, and nadabindu flame.',

  // Ornament options (4)
  'stupaBuild.part.ornament.none.name': 'Simple Purity',
  'stupaBuild.part.ornament.none.desc': 'Unadorned geometric purity of the sacred stupa form.',
  'stupaBuild.part.ornament.prayerFlags.name': 'Five-Color Prayer Flags',
  'stupaBuild.part.ornament.prayerFlags.desc': 'Blue, white, red, green, and yellow lungta cords radiating from the spire on the highland wind.',
  'stupaBuild.part.ornament.butterLamps.name': 'Eternal Butter-Lamp Ring',
  'stupaBuild.part.ornament.butterLamps.desc': 'A ring of undying golden butter lamps encircling the plinth, dispelling darkness.',
  'stupaBuild.part.ornament.mantraHalo.name': 'Six-Syllable Golden Halo',
  'stupaBuild.part.ornament.mantraHalo.desc': 'A levitating golden mantra ring of Om Mani Padme Hum slowly orbiting the stupa dome.',

  // Unlock requirements & badges
  'stupaBuild.req.default': 'Default Unlocked',
  'stupaBuild.req.unlocked': '✓ Unlocked',
  'stupaBuild.req.locked': '🔒 Locked',
  'stupaBuild.req.kora': 'Requires {n} Kora',
  'stupaBuild.req.prostration': 'Requires {n} Prostrations',
  'stupaBuild.req.lamp': 'Requires {n} Lamps',
  'stupaBuild.req.join': ' · ',
  'stupaBuild.tier': 'Tier {n}',

  // Player stats bar in Builder
  'stupaBuild.stats.kora': 'Kora Laps',
  'stupaBuild.stats.prostration': 'Prostrations',
  'stupaBuild.stats.lamp': 'Butter Lamps',
  'stupaBuild.stats.merit': 'Total Merit',

  // Preview mode & part selection
  'stupaBuild.previewMode.label': '⚡ Pure-Vision Preview (Preview locked parts freely)',
  'stupaBuild.previewMode.warning': 'Preview includes locked parts — building will fallback to unlocked parts until requirements are met.',
  'stupaBuild.previewCard.title': 'Stupa Preview',

  // Inscription form
  'stupaBuild.form.sectionTitle': 'Stupa Inscription & Dedication',
  'stupaBuild.form.pilgrimName': 'Pilgrim Name',
  'stupaBuild.form.pilgrimPlaceholder': 'Enter your pilgrim name…',
  'stupaBuild.form.stupaTitle': 'Stupa Title',
  'stupaBuild.form.stupaTitlePlaceholder': 'e.g. Lotus Auspicious Stupa…',
  'stupaBuild.form.dedication': 'Dedication Inscription',
  'stupaBuild.form.dedicationPlaceholder': 'Write your prayer or dedication to be inscribed on the stupa stele…',
  'stupaBuild.form.presetLabel': 'Quick-fill Classical Dedications:',
  'stupaBuild.preset.1': 'May all three obstacles and afflictions be dispelled, and true wisdom dawn',
  'stupaBuild.preset.2': 'May this merit extend universally to all, that we and all beings together attain Buddhahood',
  'stupaBuild.preset.3': 'May peace prevail in the world, and may all sentient beings be free from suffering',
  'stupaBuild.preset.4': 'Dedicated to parents and teachers of all lives and all beings in the six realms',
  'stupaBuild.btn.build': '🏛️ Build & Inscribe in Stupa Grove',
  'stupaBuild.btn.rejoice': '🙏 Rejoice & Prostrate',
  'stupaBuild.defaultPilgrim': 'Highland Pilgrim',
  'stupaBuild.defaultTitle': 'Lotus Auspicious Stupa',
  'stupaBuild.defaultMessage': 'May this merit extend universally to all, that we and all beings together attain Buddhahood.',

  // 3D Plaque & Grove labels
  'stupaBuild.plaque.pilgrimPrefix': 'Built by: ',
  'stupaBuild.plaque.stats': 'Kora {kora} · Bow {prostration}',
  'stupaBuild.plaque.rejoiceCount': '🙏 {n} Rejoiced',
  'stupaBuild.monument.boudhaTitle': '🏛️ Votive Stupa Altar & Samye Stele',
  'stupaBuild.monument.boudhaSub': 'Inscribe Your Votive Stupa · Co-build Samye',
  'stupaBuild.monument.samyeTitle': '☸ Samye 1,008 Stupas Monument',
  'stupaBuild.monument.samyeSub': '{n} / 1,008 Perimeter Stupas Consecrated',

  // Samye Global Co-op Construction UI
  'stupaBuild.samye.headerTitle': 'Global Co-op: Samye 1,008 Perimeter Stupas',
  'stupaBuild.samye.headerDesc': 'King Trisong Detsen and Padmasambhava built Samye Monastery surrounded by a circular wall crowned with 1,008 mini-stupas. Every pilgrim contribution lights up another golden lotus crown atop Samye’s wall!',
  'stupaBuild.samye.progressLabel': 'Consecrated Perimeter Stupas',
  'stupaBuild.samye.progressValue': 'Consecrated {current} / {max} Perimeter Stupas ({pct}%)',
  'stupaBuild.samye.totalKora': 'Server Total Kora',
  'stupaBuild.samye.totalProstrations': 'Server Total Prostrations',
  'stupaBuild.samye.activeBlessing': 'Server Co-op Blessing',
  'stupaBuild.samye.noBlessing': 'Tier 1 milestone not yet reached (requires 108 stupas)',
  'stupaBuild.samye.blessingFmt': 'EXP Gain +{exp}% · Magic Find +{find}%',
  'stupaBuild.samye.tierUnlocked': '✦ Milestone Reached',
  'stupaBuild.samye.tierLocked': 'Requires {n} Perimeter Stupas',

  // Milestone tiers (4)
  'stupaBuild.milestone.1': 'First Turning of the Wheel',
  'stupaBuild.milestone.2': 'Four Continents Adorned',
  'stupaBuild.milestone.3': 'Sun & Moon Radiance',
  'stupaBuild.milestone.4': 'Great Perfection of 1,008 Stupas',

  // Samye Contribution Panel & Contributors List
  'stupaBuild.samye.contributeTitle': '🙏 Contribute Kora & Prostration Merit',
  'stupaBuild.samye.contributeDesc': 'Every 108 Merit Points offered (equivalent to 1 Kora lap or 4 Prostrations) consecrates +1 Golden Mini-Stupa atop Samye’s perimeter wall.',
  'stupaBuild.samye.availableMerit': 'Unspent Merit Available: {merit} pts (Can build +{stupas} Stupas)',
  'stupaBuild.samye.spentMerit': 'Your Contributions: {stupas} Stupas ({merit} Merit offered)',
  'stupaBuild.samye.noteLabel': 'Dedication Note:',
  'stupaBuild.samye.notePlaceholder': 'Write a prayer note for Samye’s 1,008 stupas…',
  'stupaBuild.samye.btnContribute1': '🏛️ Offer 108 Merit (+1 Perimeter Stupa)',
  'stupaBuild.samye.btnContributeAll': '☸ Offer All Available Merit (+{n} Stupas)',
  'stupaBuild.samye.btnDevotional': '🙏 Devotional Stone Offering (+1 Stupa)',
  'stupaBuild.samye.contributorsTitle': '📜 Roll of Pilgrim Contributors',
  'stupaBuild.samye.contributorsEmpty': 'No contributions recorded yet — be the first to consecrate a stupa!',
  'stupaBuild.samye.contributorItem': '{name} built +{stupas} stupa(s) (Kora {kora} · Prostrations {prostrations})',

  // Prompts & Toasts
  'prompt.openStupaBuilder': 'Votive Stupa Altar · Samye Monument',
  'prompt.openSamyeMonument': 'Samye 1,008 Stupas Monument ({n}/1008)',
  'prompt.rejoiceStupa': '🙏 Rejoice & Bow to "{title}" (by {name})',
  'toast.stupaBuilt': '🏛️ Inscribed "{title}" in the Pilgrim Stupa Grove!',
  'toast.stupaLockedFallback': 'Some previewed parts were locked — inscribed using your unlocked sacred parts!',
  'toast.stupaRejoiced': '🙏 Rejoiced in "{title}" by {name}: "{message}" (Merit +18)',
  'toast.samyeContributed': '☸ Sadhu! Consecrated +{n} perimeter stupa(s) at Samye ({total}/1,008)',
  'toast.samyeNoMerit': 'Offered a devotional stone to consecrate +1 perimeter stupa at Samye!',
  'stupaBuild.buffName': 'Samye 1,008 Stupas Blessing',
};

i18n.register({
  'zh-Hant': ZH_HANT,
  en: EN,
});

export { ZH_HANT as STUPA_BUILD_ZH, EN as STUPA_BUILD_EN };
