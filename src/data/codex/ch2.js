// ============================================================================
// Chapter 2 — Mangyul Pass & Twelve Tenma (芒域山口・十二丹瑪) Codex Entries
// Auto-discovered by src/data/codex.js via import.meta.glob('./codex/*.js')
// ============================================================================

export const CH2_CODEX_ENTRIES = [
  {
    id: 'trisongDetsen',
    category: 'figures',
    categoryKey: 'codex.trisongDetsen.category',
    tag: 'history',
    chapter: 2,
    glyph: '👑',
    nameKey: 'codex.trisongDetsen.name',
    summaryKey: 'codex.trisongDetsen.summary',
    bodyKey: 'codex.trisongDetsen.body',
    sources: [
      {
        title: 'Treasury of Lives — Trisong Detsen',
        url: 'https://treasuryoflives.org/biographies/view/Trisong-Detsen/P7787',
      },
      {
        title: 'Encyclopædia Britannica — Trisong Detsen',
        url: 'https://www.britannica.com/biography/Khri-srong-lde-btsan',
      },
    ],
    related: ['shantarakshita', 'mangyul', 'padmasambhava'],
  },
  {
    id: 'shantarakshita',
    category: 'figures',
    categoryKey: 'codex.shantarakshita.category',
    tag: 'history',
    chapter: 2,
    glyph: '📜',
    nameKey: 'codex.shantarakshita.name',
    summaryKey: 'codex.shantarakshita.summary',
    bodyKey: 'codex.shantarakshita.body',
    sources: [
      {
        title: 'Stanford Encyclopedia of Philosophy — Śāntarakṣita',
        url: 'https://plato.stanford.edu/entries/saantarak-sita/',
      },
      {
        title: 'Treasury of Lives — Śāntarakṣita',
        url: 'https://treasuryoflives.org/biographies/view/Shantarakshita/5664',
      },
    ],
    related: ['trisongDetsen', 'padmasambhava', 'mangyul'],
  },
  {
    id: 'mangyul',
    category: 'places',
    categoryKey: 'codex.mangyul.category',
    tag: 'history',
    chapter: 2,
    glyph: '🏔',
    nameKey: 'codex.mangyul.name',
    summaryKey: 'codex.mangyul.summary',
    bodyKey: 'codex.mangyul.body',
    sources: [
      {
        title: 'THL Place Dictionary — Mangyul / Kyirong Historical Geography',
        url: 'https://places.thlib.org/',
      },
      {
        title: 'Himalayan Art Resources — Kyirong & Mangyul Corridor',
        url: 'https://www.himalayanart.org/',
      },
    ],
    related: ['trisongDetsen', 'twelveTenma', 'latse'],
  },
  {
    id: 'twelveTenma',
    category: 'protectors',
    categoryKey: 'codex.twelveTenma.category',
    tag: 'legend',
    chapter: 2,
    glyph: '❄️',
    nameKey: 'codex.twelveTenma.name',
    summaryKey: 'codex.twelveTenma.summary',
    bodyKey: 'codex.twelveTenma.body',
    sources: [
      {
        title: 'Himalayan Art Resources — Twelve Tenma (Bstan ma bcu gnyis)',
        url: 'https://www.himalayanart.org/search/set.cfm?setID=2354',
      },
      {
        title: 'Rigpa Wiki — Twelve Tenma',
        url: 'https://www.rigpawiki.org/index.php?title=Twelve_Tenma',
      },
    ],
    related: ['mangyul', 'padmasambhava', 'latse'],
  },
  {
    id: 'windhorse',
    category: 'rituals',
    categoryKey: 'codex.windhorse.category',
    tag: 'history',
    chapter: 2,
    glyph: '🎏',
    nameKey: 'codex.windhorse.name',
    summaryKey: 'codex.windhorse.summary',
    bodyKey: 'codex.windhorse.body',
    sources: [
      {
        title: 'Himalayan Art Resources — Wind Horse (Lungta)',
        url: 'https://www.himalayanart.org/search/set.cfm?setID=2031',
      },
      {
        title: 'Encyclopædia Britannica — Prayer Flag',
        url: 'https://www.britannica.com/topic/prayer-flag',
      },
    ],
    related: ['latse', 'mangyul', 'twelveTenma'],
  },
  {
    id: 'latse',
    category: 'rituals',
    categoryKey: 'codex.latse.category',
    tag: 'history',
    chapter: 2,
    glyph: '🪨',
    nameKey: 'codex.latse.name',
    summaryKey: 'codex.latse.summary',
    bodyKey: 'codex.latse.body',
    sources: [
      {
        title: 'THL Tibetan Cultural Encyclopedia — La-btsas Ritual Cairns',
        url: 'https://www.thlib.org/',
      },
      {
        title: 'Rigpa Wiki — Lhatse / Mountain Deities',
        url: 'https://www.rigpawiki.org/',
      },
    ],
    related: ['windhorse', 'mangyul', 'twelveTenma'],
  },
];

export default CH2_CODEX_ENTRIES;
