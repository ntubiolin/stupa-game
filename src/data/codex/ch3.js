/**
 * Chapter 3 Codex Entries (`src/data/codex/ch3.js`) — Yarlung Valley · Yarlha Shampo.
 *
 * 6 entries (`yarlungValley`, `yumbulagang`, `sheldrak`, `yarlhaShampo`, `nyen`, `eightClasses`),
 * each 150–300 chars in zh-Hant with historical/legend tags and verified https:// sources.
 */
import '../../i18n/ch3.js';
import { CODEX_BY_ID, registerCodexEntries } from '../codex.js';

export const CH3_CODEX_ENTRIES = [
  {
    id: 'yarlungValley',
    category: 'place',
    tag: 'history',
    chapter: 3,
    titleKey: 'codex.yarlungValley.title',
    bodyKey: 'codex.yarlungValley.body',
    glyph: 'ཡར་ལུང་།',
    sources: [
      { label: 'Wikipedia: Yarlung Valley', url: 'https://en.wikipedia.org/wiki/Yarlung_Valley' },
      { label: 'Rigpa Wiki: Yarlung Valley', url: 'https://www.rigpawiki.org/index.php?title=Yarlung_Valley' },
    ],
  },
  {
    id: 'yumbulagang',
    category: 'place',
    tag: 'legend',
    chapter: 3,
    titleKey: 'codex.yumbulagang.title',
    bodyKey: 'codex.yumbulagang.body',
    glyph: 'ཕོ་བྲང་ཡུམ་བུ་བླ་མཁར།',
    sources: [
      { label: 'Wikipedia: Yumbulagang', url: 'https://en.wikipedia.org/wiki/Yumbulagang' },
      { label: 'Rigpa Wiki: Yumbu Lakhar', url: 'https://www.rigpawiki.org/index.php?title=Yumbu_Lakhar' },
    ],
  },
  {
    id: 'sheldrak',
    category: 'place',
    tag: 'history',
    chapter: 3,
    titleKey: 'codex.sheldrak.title',
    bodyKey: 'codex.sheldrak.body',
    glyph: 'ཡར་ལུང་ཤེལ་བྲག',
    sources: [
      { label: 'Rigpa Wiki: Yarlung Sheldrak', url: 'https://www.rigpawiki.org/index.php?title=Yarlung_Sheldrak' },
      { label: 'Treasury of Lives: Padmasambhava', url: 'https://treasuryoflives.org/biographies/view/Padmasambhava/4114' },
    ],
  },
  {
    id: 'yarlhaShampo',
    category: 'deity',
    tag: 'legend',
    chapter: 3,
    titleKey: 'codex.yarlhaShampo.title',
    bodyKey: 'codex.yarlhaShampo.body',
    glyph: 'ཡར་ལྷ་ཤམ་པོ།',
    sources: [
      { label: 'Wikipedia: Yarlha Shampo', url: 'https://en.wikipedia.org/wiki/Yarlha_Shampo' },
      { label: 'Rigpa Wiki: Yarlha Shampo', url: 'https://www.rigpawiki.org/index.php?title=Yarlha_Shampo' },
    ],
  },
  {
    id: 'nyen',
    category: 'deity',
    tag: 'history',
    chapter: 3,
    titleKey: 'codex.nyen.title',
    bodyKey: 'codex.nyen.body',
    glyph: 'གཉན།',
    sources: [
      { label: 'Rigpa Wiki: Nyen', url: 'https://www.rigpawiki.org/index.php?title=Nyen' },
      { label: 'Wikipedia: Tibetan folk religion', url: 'https://en.wikipedia.org/wiki/Tibetan_folk_religion' },
    ],
  },
  {
    id: 'eightClasses',
    category: 'concept',
    tag: 'history',
    chapter: 3,
    titleKey: 'codex.eightClasses.title',
    bodyKey: 'codex.eightClasses.body',
    glyph: 'ལྷ་སྲིན་སྡེ་བརྒྱད།',
    sources: [
      { label: 'Rigpa Wiki: Eight Classes of Gods and Demons', url: 'https://www.rigpawiki.org/index.php?title=Eight_classes_of_gods_and_demons' },
      { label: 'Wikipedia: Dharmapala', url: 'https://en.wikipedia.org/wiki/Dharmapala' },
    ],
  },
];

// Ensure 'terma' is also registered so Sheldrak Crystal Cave & C3-2 quest rewards can unlock it cleanly
if (CODEX_BY_ID && !CODEX_BY_ID.terma) {
  registerCodexEntries([
    {
      id: 'terma',
      category: 'practice',
      tag: 'history',
      chapter: 3,
      titleKey: 'codex.terma.title',
      bodyKey: 'codex.terma.body',
      glyph: 'གཏེར་མ།',
      sources: [
        { label: 'Wikipedia: Terma (religion)', url: 'https://en.wikipedia.org/wiki/Terma_(religion)' },
        { label: 'Rigpa Wiki: Terma', url: 'https://www.rigpawiki.org/index.php?title=Terma' },
      ],
    },
  ]);
}

export default CH3_CODEX_ENTRIES;
