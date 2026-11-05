/**
 * Chapter 1 Codex Entries (`src/data/codex/ch1.js`) — Pharping · Yangleshö.
 *
 * 6 entries (`pharping`, `yangleshoCave`, `asuraCave`, `vajrakilaya`, `phurba`, `droughtLegend`),
 * each 150–300 chars in zh-Hant with historical/legend tags and verified https:// sources.
 */
import '../../i18n/ch1.js';

export const CH1_CODEX_ENTRIES = [
  {
    id: 'pharping',
    category: 'place',
    tag: 'history',
    chapter: 1,
    titleKey: 'codex.pharping.title',
    bodyKey: 'codex.pharping.body',
    glyph: 'ཕར་ปིང་།',
    sources: [
      { label: 'Wikipedia: Pharping', url: 'https://en.wikipedia.org/wiki/Pharping' },
      { label: 'Rigpa Wiki: Pharping', url: 'https://www.rigpawiki.org/index.php?title=Pharping' },
    ],
  },
  {
    id: 'yangleshoCave',
    category: 'place',
    tag: 'history',
    chapter: 1,
    titleKey: 'codex.yangleshoCave.title',
    bodyKey: 'codex.yangleshoCave.body',
    glyph: 'ཡང་ལེ་ཤོད།',
    sources: [
      { label: 'Rigpa Wiki: Yangleshö', url: 'https://www.rigpawiki.org/index.php?title=Yanglesh%C3%B6' },
      { label: 'Wikipedia: Pharping (Yangleshö)', url: 'https://en.wikipedia.org/wiki/Pharping' },
    ],
  },
  {
    id: 'asuraCave',
    category: 'place',
    tag: 'history',
    chapter: 1,
    titleKey: 'codex.asuraCave.title',
    bodyKey: 'codex.asuraCave.body',
    glyph: 'ཨ་སུ་རའི་བྲག་ཕུག',
    sources: [
      { label: 'Rigpa Wiki: Asura Cave', url: 'https://www.rigpawiki.org/index.php?title=Asura_Cave' },
      { label: 'Wikipedia: Asura Cave', url: 'https://en.wikipedia.org/wiki/Pharping' },
    ],
  },
  {
    id: 'vajrakilaya',
    category: 'deity',
    tag: 'history',
    chapter: 1,
    titleKey: 'codex.vajrakilaya.title',
    bodyKey: 'codex.vajrakilaya.body',
    glyph: 'རྡོ་རྗེ་ཕུར་པ།',
    sources: [
      { label: 'Wikipedia: Vajrakilaya', url: 'https://en.wikipedia.org/wiki/Vajrakilaya' },
      { label: 'Rigpa Wiki: Vajrakilaya', url: 'https://www.rigpawiki.org/index.php?title=Vajrakilaya' },
    ],
  },
  {
    id: 'phurba',
    category: 'practice',
    tag: 'history',
    chapter: 1,
    titleKey: 'codex.phurba.title',
    bodyKey: 'codex.phurba.body',
    glyph: 'ཕུར་པ།',
    sources: [
      { label: 'Wikipedia: Phurba', url: 'https://en.wikipedia.org/wiki/Phurba' },
      { label: 'Rigpa Wiki: Phurba', url: 'https://www.rigpawiki.org/index.php?title=Phurba' },
    ],
  },
  {
    id: 'droughtLegend',
    category: 'concept',
    tag: 'legend',
    chapter: 1,
    titleKey: 'codex.droughtLegend.title',
    bodyKey: 'codex.droughtLegend.body',
    glyph: 'ཆར་འབེབས།',
    sources: [
      { label: 'Treasury of Lives: Padmasambhava', url: 'https://treasuryoflives.org/biographies/view/Padmasambhava/4114' },
      { label: 'Rigpa Wiki: Yangleshö', url: 'https://www.rigpawiki.org/index.php?title=Yanglesh%C3%B6' },
    ],
  },
];

export default CH1_CODEX_ENTRIES;
