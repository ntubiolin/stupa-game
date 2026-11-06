/**
 * Chapter 5 — Chimphu Hermitage & Terma Realm Codex Entries (`src/data/codex/ch5.js`) — Issue #36
 *
 * 4 Entries:
 *   1. `chimphu`      — 青朴修行地 ([史實])
 *   2. `yesheTsogyal` — 益西措嘉 ([史實人物，生平細節多為傳說])
 *   3. `terma`        — 伏藏傳統 ([史實：宗教傳統的存在；內容的來歷屬信仰])
 *   4. `terton`       — 伏藏師 ([史實與傳統])
 */
import '../../i18n/ch5.js';

export const CH5_CODEX = [
  {
    id: 'chimphu',
    category: 'place',
    tag: 'history',
    chapter: 5,
    glyph: 'མཆིམས',
    titleKey: 'codex.chimphu.title',
    bodyKey: 'codex.chimphu.body',
    sources: [
      {
        label: 'Rigpa Wiki — Chimphu',
        url: 'https://www.rigpawiki.org/index.php?title=Chimphu',
      },
      {
        label: 'Treasury of Lives — Samye Chimphu Places',
        url: 'https://treasuryoflives.org/',
      },
    ],
  },
  {
    id: 'yesheTsogyal',
    category: 'person',
    tag: 'legend',
    chapter: 5,
    glyph: 'མཚོ',
    titleKey: 'codex.yesheTsogyal.title',
    bodyKey: 'codex.yesheTsogyal.body',
    sources: [
      {
        label: 'Wikipedia — Yeshe Tsogyal',
        url: 'https://en.wikipedia.org/wiki/Yeshe_Tsogyal',
      },
      {
        label: 'Treasury of Lives — Yeshe Tsogyel',
        url: 'https://treasuryoflives.org/biographies/view/Yeshe-Tsogyel/7247',
      },
    ],
  },
  {
    id: 'terma',
    category: 'practice',
    tag: 'history',
    chapter: 5,
    glyph: 'གཏེར',
    titleKey: 'codex.terma.title',
    bodyKey: 'codex.terma.body',
    sources: [
      {
        label: 'Wikipedia — Terma (religion)',
        url: 'https://en.wikipedia.org/wiki/Terma_(religion)',
      },
      {
        label: 'Encyclopædia Britannica — Gter-ma',
        url: 'https://www.britannica.com/topic/gter-ma',
      },
    ],
  },
  {
    id: 'terton',
    category: 'person',
    tag: 'history',
    chapter: 5,
    glyph: 'སྟོན',
    titleKey: 'codex.terton.title',
    bodyKey: 'codex.terton.body',
    sources: [
      {
        label: 'Wikipedia — Tertön',
        url: 'https://en.wikipedia.org/wiki/Tert%C3%B6n',
      },
      {
        label: 'Rigpa Wiki — Tertön',
        url: 'https://www.rigpawiki.org/index.php?title=Tert%C3%B6n',
      },
    ],
  },
];

export default CH5_CODEX;
