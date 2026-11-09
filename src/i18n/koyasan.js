/**
 * Mount Kōya (`koyasan`) — i18n Strings (`src/i18n/koyasan.js`) — Issue #249
 *
 * Registers Traditional Chinese (`zh-Hant`) and English (`en`) translations for:
 *   - Map names, subtitles, waypoints, and world map node descriptions
 *   - Entry toast and gate prompts (`prompt.koyasan.toToji`)
 *   - 6 sacred precinct interaction prompts & rich historical/esoteric lore toasts:
 *       1. Danjō Garan · Konpon Daitō (`壇上伽藍・根本大塔`)
 *       2. Danjō Garan · Kondō (`壇上伽藍・金堂`)
 *       3. Danjō Garan · Miedō & Sanko-no-Matsu (`御影堂與三鈷松`)
 *       4. Kongōbu-ji Main Hall & Banryūtei (`金剛峯寺主殿與蟠龍庭`)
 *       5. Okunoin · Tōrōdō (`奧之院・萬燈籠堂`)
 *       6. Okunoin · Kōbō Daishi Gobyō (`奧之院・弘法大師御廟`)
 */
import { i18n } from '../i18n.js';

export const KOYASAN_STRINGS = {
  'zh-Hant': {
    'map.koyasan': '高野山・金剛峯',
    'map.koyasan.subtitle': '弘法大師空海開創之八葉蓮華真言密教總本山',
    'waypoint.koyasan.name': '高野山大門參道',
    'waypoint.koyasan.region': '紀伊國・高野山八葉峰',
    'worldNode.koyasan.name': '高野山・金剛峯寺',
    'worldNode.koyasan.level': '空海大師篇・聖域',
    'worldNode.koyasan.desc': '八葉蓮華峰上的真言密教總本山：匯聚壇上伽藍根本大塔、金剛峯寺蟠龍庭與奧之院萬燈御廟。',
    'toast.enterKoyasan': '踏入高野山 — 八葉蓮華開敷之密嚴淨土，同行二人',

    'prompt.koyasan.toToji': '前往京都東寺（教王護國寺）',
    'prompt.koyasan.konponDaito': '禮拜壇上伽藍・根本大塔（立體兩界曼荼羅）',
    'prompt.koyasan.kondo': '參拜壇上伽藍・金堂（高野山總本堂）',
    'prompt.koyasan.miedoSanko': '瞻仰御影堂與三鈷松（東投三鈷杵瑞相）',
    'prompt.koyasan.kongobuji': '參訪金剛峯寺主殿與蟠龍庭（雲海雙龍石庭）',
    'prompt.koyasan.torodo': '於奧之院・萬燈籠堂供養不滅法燈（消えずの火）',
    'prompt.koyasan.gobyo': '於奧之院・弘法大師御廟頂禮（入定留身・同行二人）',

    'toast.koyasan.konponDaito': '【根本大塔】空海大師依毘盧遮那法界體性所建之多寶塔：中央奉胎藏界大日如來，四隅環繞金剛界四佛與十六大菩薩堂柱，化現不二之「立體兩界曼荼羅」（氣血/真氣 +30）',
    'toast.koyasan.kondo': '【壇上伽藍・金堂】高野山一山總本堂，奉祀秘佛藥師如來（阿閦如來），古樸檜皮葺入母屋大殿鎮護真言密教根本道場（氣血/真氣 +30）',
    'toast.koyasan.miedoSanko': '【御影堂與三鈷松】昔年空海自大唐明州海濱東投三鈷杵，祈願「願此杵止於有緣勝地」，歸國後尋至高野山，果見金杵懸掛於此三葉古松枝頭！（氣血/真氣 +30）',
    'toast.koyasan.kongobuji': '【金剛峯寺・蟠龍庭】檜皮葺大屋根頂立成對天水桶，庭園以白川砂鋪展雲海，百餘顆四國青石砌成雌雄雙龍騰雲守護奧殿，象徵動靜一如之金剛三昧（氣血/真氣 +30）',
    'toast.koyasan.torodo': '【萬燈籠堂・消えずの火】逾萬盞金色供養燈籠映照千載：堂內「祈親上人之火」與「貧女一燈」自平安時代燃燒至今，千年未曾熄滅（氣血/真氣 +30）',
    'toast.koyasan.gobyo': '【弘法大師御廟】承和二年（835）三月廿一日，空海大師於奧之院結跏趺坐、手結大日劍印永遠入定，「虛空盡、眾生盡、涅槃盡，我願乃盡」——同行二人，慈光常隨（氣血/真氣 +30）',
  },

  en: {
    'map.koyasan': 'Mount Kōya · Kongōbu',
    'map.koyasan.subtitle': 'Eight-Petaled Lotus Sanctuary Founded by Kōbō Daishi Kūkai',
    'waypoint.koyasan.name': 'Mount Kōya Daimon Approach',
    'waypoint.koyasan.region': 'Kii Province · Mount Kōya',
    'worldNode.koyasan.name': 'Mount Kōya · Kongōbu-ji',
    'worldNode.koyasan.level': 'Kūkai Epic · Sanctuary',
    'worldNode.koyasan.desc': 'Head temple of Shingon Buddhism atop the Eight-Petaled Lotus Peak: Danjō Garan, Kongōbu-ji Banryūtei, and Okunoin Mausoleum.',
    'toast.enterKoyasan': 'Entered Mount Kōya — Eight-Petaled Lotus Pure Land, Walking Together with the Master',

    'prompt.koyasan.toToji': 'Travel to Kyoto Tō-ji Temple',
    'prompt.koyasan.konponDaito': 'Venerate Konpon Daitō (Three-Dimensional Two-Realm Mandala)',
    'prompt.koyasan.kondo': 'Pay Homage at Danjō Garan Kondō (Main Hall)',
    'prompt.koyasan.miedoSanko': 'Inspect Miedō & Sanko-no-Matsu (Three-Pronged Vajra Pine)',
    'prompt.koyasan.kongobuji': 'Contemplate Kongōbu-ji & Banryūtei (Coiling Dragon Rock Garden)',
    'prompt.koyasan.torodo': 'Offer Light at Okunoin Tōrōdō (Hall of Ten Thousand Lanterns)',
    'prompt.koyasan.gobyo': 'Prostrate at Kōbō Daishi Gobyō Mausoleum (Eternal Samādhi)',

    'toast.koyasan.konponDaito': '[Konpon Daitō] Monumental Tahōtō stupa designed by Kūkai: Womb-Realm Mahāvairocana sits at the center surrounded by the Four Diamond-Realm Buddhas and 16 Bodhisattva pillars as a living Three-Dimensional Two-Realm Mandala (HP/MP +30)',
    'toast.koyasan.kondo': '[Danjō Garan Kondō] The Grand Main Hall of Mount Kōya enshrining Yakushi Nyorai (Akṣobhya), anchoring the ceremonial heart of the sacred mountain beneath a sweeping cypress-bark roof (HP/MP +30)',
    'toast.koyasan.miedoSanko': '[Miedō & Sanko-no-Matsu] Before sailing back from Tang China, Kūkai cast his three-pronged vajra across the sea; years later he discovered it gleaming in the branches of this three-needle pine! (HP/MP +30)',
    'toast.koyasan.kongobuji': '[Kongōbu-ji & Banryūtei] Beneath the cypress-bark roof crowned with fire-prevention water tubs, 140 blue shikoku stones coil as male and female dragons rising from raked Shirakawa gravel clouds (HP/MP +30)',
    'toast.koyasan.torodo': '[Okunoin Tōrōdō] Over ten thousand golden votive lanterns glow beside the two Eternal Flames — the Flame of Kishin Shōnin and the Poor Woman’s Single Lamp — burning unbroken for a millennium (HP/MP +30)',
    'toast.koyasan.gobyo': '[Kōbō Daishi Gobyō] Here in 835 CE, Kōbō Daishi Kūkai entered eternal meditation (Nyūjō) in Mahāvairocana mudrā, vowing to walk alongside all sentient beings until space itself is exhausted — Dōgyō Ninin (HP/MP +30)',
  },
};

i18n.register(KOYASAN_STRINGS);
export default KOYASAN_STRINGS;
