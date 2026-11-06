import '../i18n/murals.js';

/**
 * Declarative Tibetan Temple Mural Compositions (`src/data/murals.js`).
 *
 * Virtual canvas coordinate system: 1600 × 900 (16:9 horizontal mural scroll).
 * Following traditional Tibetan narrative mural grammar:
 *   - Simultaneous narrative (異時同圖): each quest in a chapter is an episode cell
 *   - Divided by mountain ridges (山脊分鏡), scroll clouds (祥雲), and rivers (魚鱗水波)
 *   - Hierarchical scale (主從比例): Guru Rinpoche (淨相) & sacred landmarks are larger
 *   - Cartouche captions (題記印章) in Traditional Chinese / English + Tibetan script
 */
export const CHAPTER_MURALS = {
  prologue: {
    id: 'prologue',
    mapId: 'stupa',
    titleKey: 'mural.prologue.title',
    locationKey: 'mural.prologue.location',
    eraKey: 'mural.prologue.era',
    narrationKey: 'mural.prologue.narration',
    hintKey: 'ch1.intro.hint',
    theme: {
      skyTop: '#1f3a72',
      skyBot: '#6f93c6',
      groundTop: '#3e7c6e',
      groundBot: '#4e9384',
      snowPeaks: true,
    },
    ridges: [
      { yBase: 265, peaks: [[120, 115, 190, true], [410, 95, 220, true], [780, 125, 210, true], [1140, 88, 240, true], [1460, 110, 190, true]] },
      { yBase: 560, peaks: [[220, 445, 210, false], [840, 465, 220, false], [1340, 425, 240, true]] },
    ],
    clouds: [
      { x: 110, y: 82, w: 190, lobes: 6, scale: 1.0 },
      { x: 560, y: 72, w: 220, lobes: 7, scale: 1.05 },
      { x: 1140, y: 78, w: 230, lobes: 7, scale: 1.1 },
      { x: 850, y: 445, w: 160, lobes: 5, scale: 0.85 },
    ],
    rivers: [
      { x0: 760, y0: 900, x1: 1600, y1: 590, width: 62 },
    ],
    paths: [
      { points: [[460, 740], [690, 650], [920, 520], [1160, 430]], width: 16 },
    ],
    inscriptions: [
      { x: 140, y: 845, w: 280, text: 'ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ། བྱ་རུང་ཁ་ཤོར།' },
      { x: 1020, y: 540, w: 260, text: 'གངས་ཅན་བྱང་ཐང་། དམ་ཅན་སྲུང་མ།' },
    ],
    episodes: [
      {
        num: '①',
        questId: 'prologue.vow',
        titleKey: 'mural.prologue.ep1.title',
        tibetan: 'བྱ་རུང་ཁ་ཤོར་མཆོད་རྟེན།',
        focus: { x: 430, y: 520, zoom: 1.38 },
        region: { x: 430, y: 520, rx: 410, ry: 330 },
        cartouche: { x: 80, y: 770 },
        decor: [
          { type: 'goldenAura', x: 420, y: 430, r: 220 },
          { type: 'butterLamps', x: 250, y: 690, count: 7, spacing: 34 },
        ],
        sprites: [
          { id: 'boudha_stupa', x: 420, y: 435, h: 420 },
          { id: 'lamp_bearers', x: 195, y: 615, h: 175 },
          { id: 'prostrators', x: 655, y: 655, h: 155, flipX: true },
          { id: 'elder', x: 645, y: 475, h: 175, flipX: true },
          { id: 'pilgrim', x: 285, y: 745, h: 170, flipX: true },
        ],
      },
      {
        num: '②',
        questId: 'prologue.north',
        titleKey: 'mural.prologue.ep2.title',
        tibetan: 'གངས་རིའི་མི་རྒོད་རྒྱལ་པོ།',
        focus: { x: 1185, y: 420, zoom: 1.42 },
        region: { x: 1185, y: 420, rx: 410, ry: 340 },
        cartouche: { x: 960, y: 785 },
        decor: [
          { type: 'prayerFlags', x0: 880, y0: 360, x1: 1490, y1: 320 },
          { type: 'liberationRays', x: 1230, y: 365, r: 190 },
        ],
        sprites: [
          { id: 'migoi_king', x: 1230, y: 375, h: 370 },
          { id: 'pilgrim', x: 985, y: 500, h: 195, flipX: true },
          { id: 'villagers', x: 1060, y: 695, h: 175 },
        ],
      },
    ],
  },

  ch1: {
    id: 'ch1',
    mapId: 'pharping',
    titleKey: 'ch1.intro.title',
    locationKey: 'ch1.intro.location',
    eraKey: 'ch1.intro.era',
    narrationKey: 'ch1.intro.narration',
    hintKey: 'ch1.intro.hint',
    theme: {
      skyTop: '#1f3a72',
      skyBot: '#6f93c6',
      groundTop: '#3d7e70',
      groundBot: '#4e9384',
      snowPeaks: false,
    },
    ridges: [
      { yBase: 250, peaks: [[50, 125, 160], [260, 95, 190], [490, 138, 175], [710, 155, 170], [950, 148, 175], [1160, 108, 195], [1380, 88, 195], [1575, 128, 160]] },
      { yBase: 555, peaks: [[110, 435, 185], [390, 472, 170], [1255, 455, 195], [1525, 422, 175]] },
    ],
    clouds: [
      { x: 95, y: 68, w: 155, lobes: 6, scale: 1.0 },
      { x: 380, y: 142, w: 125, lobes: 5, scale: 0.82 },
      { x: 705, y: 152, w: 225, lobes: 7, scale: 0.95 },
      { x: 1185, y: 66, w: 220, lobes: 7, scale: 1.08 },
      { x: 1235, y: 118, w: 250, lobes: 8, scale: 1.0 },
    ],
    rivers: [
      { x0: 980, y0: 900, x1: 1600, y1: 595, width: 72 },
    ],
    paths: [
      { points: [[0, 350], [180, 342], [355, 392], [585, 425]], width: 18 },
    ],
    inscriptions: [
      { x: 865, y: 588, w: 295, text: 'ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ།' },
      { x: 245, y: 608, w: 225, text: 'ཨོཾ་བཛྲ་ཀཱི་ལི་ཀཱི་ལ་ཡ་སརྦ་བིགྷྣཱན་བཾ་ཧཱུྃ་ཕཊ།' },
    ],
    episodes: [
      {
        num: '①',
        questId: 'ch1.drought',
        titleKey: 'mural.ch1.ep1.title',
        tibetan: 'ཐང་སྐམ་པོ། ཆུ་མིག་སྐམས།',
        focus: { x: 430, y: 705, zoom: 1.48 },
        region: { x: 430, y: 715, rx: 380, ry: 210 },
        cartouche: { x: 48, y: 824 },
        decor: [
          { type: 'crackedEarth', x: 465, y: 735, rx: 315, ry: 102 },
          { type: 'springs', points: [[330, 725], [525, 772], [625, 702]] },
          { type: 'liberationRays', x: 415, y: 710, r: 135 },
        ],
        sprites: [
          { id: 'elder', x: 195, y: 665, h: 170 },
          { id: 'villagers', x: 92, y: 650, h: 165 },
          { id: 'sprite', x: 415, y: 720, h: 125 },
          { id: 'sprite', x: 585, y: 745, h: 115, flipX: true },
          { id: 'pilgrim', x: 715, y: 735, h: 180 },
        ],
      },
      {
        num: '②',
        questId: 'ch1.lamps',
        titleKey: 'mural.ch1.ep2.title',
        tibetan: 'ཡང་ལེ་ཤོད་ཀྱི་མར་མེ།',
        focus: { x: 1215, y: 405, zoom: 1.52 },
        region: { x: 1225, y: 410, rx: 310, ry: 185 },
        cartouche: { x: 1190, y: 295 },
        decor: [
          { type: 'butterLamps', x: 1030, y: 495, count: 7, spacing: 32 },
        ],
        sprites: [
          { id: 'lamp_bearers', x: 1155, y: 390, h: 195, flipX: true },
          { id: 'pilgrim', x: 1355, y: 410, h: 175 },
        ],
      },
      {
        num: '③',
        questId: 'ch1.scrolls',
        titleKey: 'mural.ch1.ep3.title',
        tibetan: 'རྒྱ་གར་ནས་དཔེ་ཆ།',
        focus: { x: 255, y: 355, zoom: 1.52 },
        region: { x: 265, y: 355, rx: 285, ry: 175 },
        cartouche: { x: 48, y: 445 },
        decor: [],
        sprites: [
          { id: 'panditas', x: 215, y: 332, h: 210 },
          { id: 'pilgrim', x: 395, y: 358, h: 170, flipX: true },
        ],
      },
      {
        num: '④',
        questId: 'ch1.kilaya',
        titleKey: 'mural.ch1.ep4.title',
        tibetan: 'པདྨ་འབྱུང་གནས། རྡོ་རྗེ་གཞོན་ནུ།',
        focus: { x: 825, y: 365, zoom: 1.32 },
        region: { x: 890, y: 430, rx: 460, ry: 380 },
        cartouche: { x: 590, y: 508 },
        decor: [
          { type: 'goldenAura', x: 815, y: 355, r: 195 },
          { type: 'rain', x: 1060, y: 120, w: 460, h: 520 },
          { type: 'springs', points: [[1135, 695]], alwaysFlowing: true },
        ],
        sprites: [
          { id: 'kilaya', x: 815, y: 98, h: 155 },
          { id: 'cave', x: 815, y: 342, h: 330 },
          { id: 'guru_seated', x: 815, y: 365, h: 265, isVision: true },
          { id: 'prostrators', x: 965, y: 710, h: 150, flipX: true },
          { id: 'villagers', x: 1275, y: 645, h: 165, flipX: true },
        ],
      },
    ],
  },

  ch2: {
    id: 'ch2',
    mapId: 'mangyul',
    titleKey: 'ch2.intro.title',
    locationKey: 'ch2.intro.location',
    eraKey: 'ch2.intro.era',
    narrationKey: 'ch2.intro.narration',
    hintKey: 'ch2.intro.hint',
    theme: {
      skyTop: '#182f63',
      skyBot: '#6b92c8',
      groundTop: '#366f66',
      groundBot: '#49897c',
      snowPeaks: true,
    },
    ridges: [
      { yBase: 280, peaks: [[90, 95, 195, true], [340, 72, 230, true], [640, 105, 220, true], [940, 68, 250, true], [1260, 82, 235, true], [1520, 105, 190, true]] },
      { yBase: 575, peaks: [[180, 430, 210, true], [560, 455, 200, false], [1080, 440, 225, true], [1440, 415, 210, true]] },
    ],
    clouds: [
      { x: 120, y: 95, w: 210, lobes: 7, scale: 1.05 },
      { x: 540, y: 115, w: 260, lobes: 8, scale: 1.15 },
      { x: 1040, y: 92, w: 250, lobes: 8, scale: 1.12 },
      { x: 680, y: 395, w: 210, lobes: 6, scale: 0.95 },
    ],
    rivers: [
      { x0: 0, y0: 820, x1: 640, y1: 900, width: 58 },
    ],
    paths: [
      { points: [[80, 740], [380, 665], [740, 540], [1120, 390], [1480, 285]], width: 20 },
    ],
    inscriptions: [
      { x: 620, y: 845, w: 310, text: 'མང་ཡུལ་གུང་ཐང་ལ། བསྟན་མ་བཅུ་གཉིས།' },
    ],
    episodes: [
      {
        num: '①',
        questId: 'ch2.envoy',
        titleKey: 'mural.ch2.ep1.title',
        tibetan: 'བོད་ཀྱི་ཕོ་ཉ། གདན་འདྲེན།',
        focus: { x: 310, y: 680, zoom: 1.45 },
        region: { x: 310, y: 680, rx: 320, ry: 220 },
        cartouche: { x: 55, y: 820 },
        decor: [],
        sprites: [
          { id: 'tibetan_envoy', x: 255, y: 665, h: 255 },
          { id: 'pilgrim', x: 475, y: 685, h: 180 },
        ],
      },
      {
        num: '②',
        questId: 'ch2.tenma',
        titleKey: 'mural.ch2.ep2.title',
        tibetan: 'བསྟན་མ་བཅུ་གཉིས་ཀྱི་ཚོད་ལྟ།',
        focus: { x: 375, y: 295, zoom: 1.45 },
        region: { x: 375, y: 295, rx: 320, ry: 210 },
        cartouche: { x: 60, y: 425 },
        decor: [
          { type: 'butterLamps', x: 260, y: 390, count: 4, spacing: 46 },
        ],
        sprites: [
          { id: 'tenma_goddess', x: 375, y: 265, h: 255 },
        ],
      },
      {
        num: '③',
        questId: 'ch2.storm',
        titleKey: 'mural.ch2.ep3.title',
        tibetan: 'གངས་རླུང་འཚུབ་མ་ཞི་བ།',
        focus: { x: 835, y: 350, zoom: 1.38 },
        region: { x: 835, y: 350, rx: 340, ry: 250 },
        cartouche: { x: 640, y: 505 },
        decor: [
          { type: 'goldenAura', x: 825, y: 335, r: 185 },
          { type: 'liberationRays', x: 825, y: 335, r: 210 },
        ],
        sprites: [
          { id: 'guru_seated', x: 825, y: 340, h: 270, isVision: true },
          { id: 'pilgrim', x: 645, y: 410, h: 175, flipX: true },
        ],
      },
      {
        num: '④',
        questId: 'ch2.tibet',
        titleKey: 'mural.ch2.ep4.title',
        tibetan: 'རླུང་རྟ་དར་ལྕོག བོད་དུ་ཕེབས།',
        focus: { x: 1295, y: 420, zoom: 1.42 },
        region: { x: 1295, y: 420, rx: 330, ry: 270 },
        cartouche: { x: 1120, y: 780 },
        decor: [
          { type: 'prayerFlags', x0: 990, y0: 250, x1: 1540, y1: 210 },
          { type: 'prayerFlags', x0: 1030, y0: 310, x1: 1560, y1: 275 },
        ],
        sprites: [
          { id: 'tenma_goddess', x: 1290, y: 245, h: 225, flipX: true },
          { id: 'prostrators', x: 1215, y: 555, h: 150 },
          { id: 'tibetan_envoy', x: 1365, y: 660, h: 215 },
        ],
      },
    ],
  },

  ch3: {
    id: 'ch3',
    mapId: 'yarlung',
    titleKey: 'ch3.intro.title',
    locationKey: 'ch3.intro.location',
    eraKey: 'ch3.intro.era',
    narrationKey: 'ch3.intro.narration',
    hintKey: 'ch3.intro.hint',
    theme: {
      skyTop: '#1d3b75',
      skyBot: '#7398ca',
      groundTop: '#458775',
      groundBot: '#569c86',
      snowPeaks: true,
    },
    ridges: [
      { yBase: 260, peaks: [[110, 110, 180], [380, 95, 210], [690, 120, 200, true], [1020, 75, 240, true], [1360, 62, 260, true]] },
      { yBase: 560, peaks: [[210, 420, 220], [640, 455, 195], [1290, 415, 240, true]] },
    ],
    clouds: [
      { x: 140, y: 78, w: 180, lobes: 6, scale: 0.95 },
      { x: 640, y: 85, w: 210, lobes: 7, scale: 1.0 },
      { x: 1120, y: 72, w: 260, lobes: 8, scale: 1.15 },
    ],
    rivers: [
      { x0: 0, y0: 615, x1: 1180, y1: 900, width: 68 },
    ],
    paths: [
      { points: [[220, 520], [560, 590], [920, 535], [1240, 445]], width: 16 },
    ],
    inscriptions: [
      { x: 520, y: 855, w: 320, text: 'ཕོ་བྲང་ཡུམ་བུ་བླ་སྒང་། ཡར་ལྷ་ཤམ་པོ།' },
    ],
    episodes: [
      {
        num: '①',
        questId: 'ch3.valley',
        titleKey: 'mural.ch3.ep1.title',
        tibetan: 'ཕོ་བྲང་ཡུམ་བུ་བླ་སྒང་།',
        focus: { x: 255, y: 365, zoom: 1.42 },
        region: { x: 255, y: 365, rx: 280, ry: 250 },
        cartouche: { x: 48, y: 545 },
        decor: [],
        sprites: [
          { id: 'yumbulagang', x: 235, y: 335, h: 355 },
          { id: 'elder', x: 415, y: 455, h: 165, flipX: true },
          { id: 'pilgrim', x: 345, y: 470, h: 165, flipX: true },
        ],
      },
      {
        num: '②',
        questId: 'ch3.sheldrak',
        titleKey: 'mural.ch3.ep2.title',
        tibetan: 'ཤེལ་བྲག་གཏེར་མ།',
        focus: { x: 655, y: 295, zoom: 1.48 },
        region: { x: 655, y: 295, rx: 265, ry: 210 },
        cartouche: { x: 495, y: 440 },
        decor: [
          { type: 'liberationRays', x: 655, y: 285, r: 160 },
        ],
        sprites: [
          { id: 'cave', x: 655, y: 280, h: 270 },
          { id: 'yeshe_tsogyal', x: 655, y: 300, h: 195 },
        ],
      },
      {
        num: '③',
        questId: 'ch3.yaks',
        titleKey: 'mural.ch3.ep3.title',
        tibetan: 'གཡག་ཁྱུ་ཞི་བ།',
        focus: { x: 485, y: 720, zoom: 1.46 },
        region: { x: 485, y: 720, rx: 320, ry: 195 },
        cartouche: { x: 60, y: 820 },
        decor: [],
        sprites: [
          { id: 'villagers', x: 335, y: 705, h: 170 },
          { id: 'pilgrim', x: 485, y: 720, h: 175, flipX: true },
          { id: 'white_yak', x: 655, y: 700, h: 185 },
        ],
      },
      {
        num: '④',
        questId: 'ch3.shampo',
        titleKey: 'mural.ch3.ep4.title',
        tibetan: 'ཡར་ལྷ་ཤམ་པོ་དམ་ལ་བཏགས།',
        focus: { x: 1195, y: 445, zoom: 1.35 },
        region: { x: 1195, y: 445, rx: 390, ry: 350 },
        cartouche: { x: 1065, y: 790 },
        decor: [
          { type: 'goldenAura', x: 985, y: 395, r: 165 },
          { type: 'vajraCord', x0: 1025, y0: 385, x1: 1225, y1: 355 },
        ],
        sprites: [
          { id: 'guru_seated', x: 985, y: 405, h: 245, isVision: true },
          { id: 'white_yak', x: 1295, y: 425, h: 360 },
        ],
      },
    ],
  },

  ch4: {
    id: 'ch4',
    mapId: 'samye',
    titleKey: 'ch4.intro.title',
    locationKey: 'ch4.intro.location',
    eraKey: 'ch4.intro.era',
    narrationKey: 'ch4.intro.narration',
    hintKey: 'ch1.intro.hint',
    theme: {
      skyTop: '#162856',
      skyBot: '#537bb4',
      groundTop: '#3c7a6c',
      groundBot: '#4c8e7e',
      dayNightSplit: true,
    },
    ridges: [
      { yBase: 255, peaks: [[120, 115, 185], [420, 100, 210], [810, 72, 250], [1190, 105, 210], [1490, 115, 185]] },
      { yBase: 550, peaks: [[160, 435, 195], [1420, 430, 205]] },
    ],
    clouds: [
      { x: 130, y: 75, w: 185, lobes: 6, scale: 0.95 },
      { x: 695, y: 68, w: 230, lobes: 7, scale: 1.05 },
      { x: 1210, y: 82, w: 195, lobes: 6, scale: 0.95 },
    ],
    rivers: [
      { x0: 0, y0: 840, x1: 680, y1: 900, width: 56 },
    ],
    paths: [],
    inscriptions: [
      { x: 645, y: 865, w: 320, text: 'དཔལ་བསམ་ཡས་མི་འགྱུར་ལྷུན་གྱིས་གྲུབ་པའི་གཙུག་ལག་ཁང་།' },
    ],
    episodes: [
      {
        num: '①',
        questId: 'ch4.foundation',
        titleKey: 'mural.ch4.ep1.title',
        tibetan: 'མཁན་སློབ་ཆོས་གསུམ།',
        focus: { x: 255, y: 665, zoom: 1.48 },
        region: { x: 255, y: 665, rx: 260, ry: 210 },
        cartouche: { x: 48, y: 818 },
        decor: [],
        sprites: [
          { id: 'king_shantarakshita', x: 245, y: 645, h: 255 },
        ],
      },
      {
        num: '②',
        questId: 'ch4.dayNight',
        titleKey: 'mural.ch4.ep2.title',
        tibetan: 'ཉིན་བཞེངས་མཚན་བཤིག',
        focus: { x: 265, y: 345, zoom: 1.48 },
        region: { x: 265, y: 345, rx: 260, ry: 190 },
        cartouche: { x: 48, y: 455 },
        decor: [
          { type: 'butterLamps', x: 165, y: 420, count: 5, spacing: 36 },
        ],
        sprites: [
          { id: 'lamp_bearers', x: 220, y: 335, h: 175 },
          { id: 'sprite', x: 375, y: 350, h: 125, flipX: true },
        ],
      },
      {
        num: '③',
        questId: 'ch4.hepori',
        titleKey: 'mural.ch4.ep3.title',
        tibetan: 'ཧས་པོ་རིར་ལྷ་སྲིན་དམ་ལ་བཏགས།',
        focus: { x: 810, y: 235, zoom: 1.45 },
        region: { x: 810, y: 235, rx: 290, ry: 210 },
        cartouche: { x: 615, y: 365 },
        decor: [
          { type: 'goldenAura', x: 810, y: 215, r: 165 },
        ],
        sprites: [
          { id: 'guru_seated', x: 810, y: 220, h: 235, isVision: true },
          { id: 'pilgrim', x: 650, y: 275, h: 155, flipX: true },
        ],
      },
      {
        num: '④',
        questId: 'ch4.pehar',
        titleKey: 'mural.ch4.ep4.title',
        tibetan: 'پེ་ཧར་རྒྱལ་པོ་དམ་ལ་བཏགས།',
        focus: { x: 1335, y: 335, zoom: 1.45 },
        region: { x: 1335, y: 335, rx: 280, ry: 230 },
        cartouche: { x: 1140, y: 495 },
        decor: [],
        sprites: [
          { id: 'pehar_protector', x: 1335, y: 315, h: 295 },
        ],
      },
      {
        num: '⑤',
        questId: 'ch4.samye',
        titleKey: 'mural.ch4.ep5.title',
        tibetan: 'བསམ་ཡས་ལྷུན་གྱིས་གྲུབ།',
        focus: { x: 825, y: 645, zoom: 1.36 },
        region: { x: 825, y: 645, rx: 420, ry: 245 },
        cartouche: { x: 1120, y: 818 },
        decor: [
          { type: 'goldenAura', x: 815, y: 625, r: 225 },
        ],
        sprites: [
          { id: 'samye_mandala', x: 815, y: 625, h: 350 },
          { id: 'prostrators', x: 1165, y: 705, h: 145, flipX: true },
        ],
      },
    ],
  },

  ch5: {
    id: 'ch5',
    mapId: 'chimphu',
    titleKey: 'mural.ch5.title',
    locationKey: 'mural.ch5.location',
    eraKey: 'mural.ch5.era',
    narrationKey: 'mural.ch5.narration',
    hintKey: 'ch1.intro.hint',
    theme: {
      skyTop: '#1c3468',
      skyBot: '#6a8fc2',
      groundTop: '#3c7b6d',
      groundBot: '#4e9384',
      snowPeaks: true,
    },
    ridges: [
      { yBase: 265, peaks: [[110, 95, 195, true], [430, 82, 230, true], [810, 68, 250, true], [1190, 88, 225, true], [1490, 105, 190, true]] },
      { yBase: 565, peaks: [[240, 430, 220], [810, 445, 230], [1360, 430, 220]] },
    ],
    clouds: [
      { x: 130, y: 82, w: 200, lobes: 6, scale: 1.0 },
      { x: 685, y: 74, w: 240, lobes: 8, scale: 1.1 },
      { x: 1190, y: 84, w: 210, lobes: 7, scale: 1.0 },
    ],
    rivers: [
      { x0: 0, y0: 840, x1: 680, y1: 900, width: 60 },
    ],
    paths: [
      { points: [[260, 660], [620, 520], [980, 540], [1260, 650]], width: 16 },
    ],
    inscriptions: [
      { x: 590, y: 855, w: 330, text: 'མཆིམས་ཕུ་དབེན་གནས། ཟབ་མོ་གཏེར་གྱི་བཀའ་བབས།' },
    ],
    episodes: [
      {
        num: '①',
        questId: 'ch5.tsogyal',
        titleKey: 'mural.ch5.ep1.title',
        tibetan: 'མཁའ་འགྲོ་ཡེ་ཤེས་མཚོ་རྒྱལ།',
        focus: { x: 350, y: 420, zoom: 1.42 },
        region: { x: 350, y: 420, rx: 320, ry: 260 },
        cartouche: { x: 55, y: 785 },
        decor: [
          { type: 'liberationRays', x: 350, y: 395, r: 210 },
        ],
        sprites: [
          { id: 'cave', x: 350, y: 375, h: 330 },
          { id: 'yeshe_tsogyal', x: 350, y: 405, h: 255 },
          { id: 'pilgrim', x: 555, y: 485, h: 175 },
        ],
      },
      {
        num: '②',
        questId: 'ch5.firstTerma',
        titleKey: 'mural.ch5.ep2.title',
        tibetan: 'ཟབ་གཏེར་སྒོ་འབྱེད།',
        focus: { x: 820, y: 330, zoom: 1.42 },
        region: { x: 820, y: 330, rx: 290, ry: 240 },
        cartouche: { x: 635, y: 505 },
        decor: [
          { type: 'goldenAura', x: 820, y: 315, r: 185 },
        ],
        sprites: [
          { id: 'guru_seated', x: 820, y: 320, h: 260, isVision: true },
          { id: 'panditas', x: 1020, y: 365, h: 175, flipX: true },
        ],
      },
      {
        num: '③',
        questId: 'ch5.epilogue',
        titleKey: 'mural.ch5.ep3.title',
        tibetan: 'བསྔོ་བ་སྨོན་ལམ། བྱ་རུང་ཁ་ཤོར།',
        focus: { x: 1275, y: 555, zoom: 1.38 },
        region: { x: 1275, y: 555, rx: 330, ry: 290 },
        cartouche: { x: 1085, y: 805 },
        decor: [
          { type: 'goldenAura', x: 1295, y: 520, r: 200 },
        ],
        sprites: [
          { id: 'boudha_stupa', x: 1295, y: 520, h: 365 },
          { id: 'prostrators', x: 1045, y: 695, h: 145 },
        ],
      },
    ],
  },
};

const MAP_TO_CHAPTER = {
  stupa: 'prologue',
  wild: 'prologue',
  pharping: 'ch1',
  mangyul: 'ch2',
  yarlung: 'ch3',
  samye: 'ch4',
  chimphu: 'ch5',
  terma: 'ch5',
};

export function normalizeMuralChapterId(raw) {
  if (!raw && raw !== 0) return 'ch1';
  const s = String(raw).toLowerCase();
  if (s === '0' || s === 'prologue' || s.startsWith('prologue')) return 'prologue';
  if (s === '1' || s === 'ch1' || s.startsWith('ch1') || s === 'pharping') return 'ch1';
  if (s === '2' || s === 'ch2' || s.startsWith('ch2') || s === 'mangyul') return 'ch2';
  if (s === '3' || s === 'ch3' || s.startsWith('ch3') || s === 'yarlung') return 'ch3';
  if (s === '4' || s === 'ch4' || s.startsWith('ch4') || s === 'samye') return 'ch4';
  if (s === '5' || s === 'ch5' || s.startsWith('ch5') || s === 'chimphu' || s === 'terma') return 'ch5';
  if (MAP_TO_CHAPTER[s]) return MAP_TO_CHAPTER[s];
  return 'ch1';
}

export function getChapterMural(chapterOrMap) {
  const id = normalizeMuralChapterId(chapterOrMap);
  return CHAPTER_MURALS[id] || CHAPTER_MURALS.ch1;
}

export function getMuralEpisodeByQuest(questId) {
  if (!questId) return null;
  for (const mural of Object.values(CHAPTER_MURALS)) {
    const idx = mural.episodes.findIndex((ep) => ep.questId === questId);
    if (idx !== -1) {
      return { mural, episode: mural.episodes[idx], index: idx };
    }
  }
  return null;
}
