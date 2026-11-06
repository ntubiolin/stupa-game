/**
 * Chapter 4 (Samye Monastery & Mount Hepo Ri) — Codex Entries (`src/data/codex/ch4.js`) — Issue #35
 *
 * Defines 9 codex entries unlocked during Chapter 4:
 *   1. `samye` — Samye Monastery (`བསམ་ཡས`)
 *   2. `shantarakshita` — Abbot Śāntarakṣita (`ཞི་བ་འཚོ`)
 *   3. `trisongDetsen` — King Trisong Detsen (`ཁྲི་སྲོང་ལྡེ་བཙན`)
 *   4. `samyeMandala` — 3D Mandala Architecture of Samye (`བསམ་ཡས་དཀྱིལ་འཁོར`)
 *   5. `hepori` — Mount Hepo Ri (`ཧས་པོ་རི`)
 *   6. `eightClasses` — The Eight Classes of Spirits (`ལྷ་སྲིན་སྡེ་བརྒྱད`)
 *   7. `pehar` — Pehar Gyalpo (`པེ་ཧར་རྒྱལ་པོ`)
 *   8. `samyeName` — Origin of the Name "Samye!" (`བསམ་ཡས་ཞེས་པའི་མཚན`)
 *   9. `sevenTestedMen` — The Seven Tested Men (`སད་མི་མི་བདུན`)
 */
import '../../i18n/ch4.js';

export const CH4_CODEX_ENTRIES = [
  {
    id: 'samye',
    category: 'places',
    glyph: 'བསམ་ཡས',
    titleKey: 'codex.entry.samye.title',
    summaryKey: 'codex.entry.samye.summary',
    bodyKey: 'codex.entry.samye.body',
    tags: ['history', 'legend'],
    sources: [
      { label: 'Wikipedia — Samye', url: 'https://en.wikipedia.org/wiki/Samye' },
      { label: 'Treasury of Lives — Samye Monastery', url: 'https://treasuryoflives.org/Place/Samye' },
    ],
  },
  {
    id: 'shantarakshita',
    category: 'figures',
    glyph: 'ཞི་བ་འཚོ',
    titleKey: 'codex.entry.shantarakshita.title',
    summaryKey: 'codex.entry.shantarakshita.summary',
    bodyKey: 'codex.entry.shantarakshita.body',
    tags: ['history', 'legend'],
    sources: [
      { label: 'Wikipedia — Śāntarakṣita', url: 'https://en.wikipedia.org/wiki/%C5%9A%C4%81ntarak%E1%B9%A3ita' },
      { label: 'Stanford Encyclopedia of Philosophy — Śāntarakṣita', url: 'https://plato.stanford.edu/entries/saantarak-sita/' },
    ],
  },
  {
    id: 'trisongDetsen',
    category: 'figures',
    glyph: 'ཁྲི་སྲོང་ལྡེ་བཙན',
    titleKey: 'codex.entry.trisongDetsen.title',
    summaryKey: 'codex.entry.trisongDetsen.summary',
    bodyKey: 'codex.entry.trisongDetsen.body',
    tags: ['history', 'legend'],
    sources: [
      { label: 'Wikipedia — Trisong Detsen', url: 'https://en.wikipedia.org/wiki/Trisong_Detsen' },
      { label: 'Rigpa Wiki — King Trisong Detsen', url: 'https://www.rigpawiki.org/index.php?title=King_Trisong_Detsen' },
    ],
  },
  {
    id: 'samyeMandala',
    category: 'dharma',
    glyph: 'དཀྱིལ་འཁོར',
    titleKey: 'codex.entry.samyeMandala.title',
    summaryKey: 'codex.entry.samyeMandala.summary',
    bodyKey: 'codex.entry.samyeMandala.body',
    tags: ['history', 'legend'],
    sources: [
      { label: 'Wikipedia — Samye Architecture', url: 'https://en.wikipedia.org/wiki/Samye' },
      { label: 'Rigpa Wiki — Samye', url: 'https://www.rigpawiki.org/index.php?title=Samye' },
    ],
  },
  {
    id: 'hepori',
    category: 'places',
    glyph: 'ཧས་པོ་རི',
    titleKey: 'codex.entry.hepori.title',
    summaryKey: 'codex.entry.hepori.summary',
    bodyKey: 'codex.entry.hepori.body',
    tags: ['history', 'legend'],
    sources: [
      { label: 'Rigpa Wiki — Hepori', url: 'https://www.rigpawiki.org/index.php?title=Hepori' },
      { label: 'Wikipedia — Samye', url: 'https://en.wikipedia.org/wiki/Samye' },
    ],
  },
  {
    id: 'eightClasses',
    category: 'beings',
    glyph: 'སྡེ་བརྒྱད',
    titleKey: 'codex.entry.eightClasses.title',
    summaryKey: 'codex.entry.eightClasses.summary',
    bodyKey: 'codex.entry.eightClasses.body',
    tags: ['history', 'legend'],
    sources: [
      { label: 'Rigpa Wiki — Eight Classes of Gods and Demons', url: 'https://www.rigpawiki.org/index.php?title=Eight_classes_of_gods_and_demons' },
      { label: 'Himalayan Art Resources — Eight Classes', url: 'https://www.himalayanart.org/' },
    ],
  },
  {
    id: 'pehar',
    category: 'beings',
    glyph: 'པེ་ཧར',
    titleKey: 'codex.entry.pehar.title',
    summaryKey: 'codex.entry.pehar.summary',
    bodyKey: 'codex.entry.pehar.body',
    tags: ['history', 'legend'],
    sources: [
      { label: 'Wikipedia — Pehar', url: 'https://en.wikipedia.org/wiki/Pehar' },
      { label: 'Himalayan Art Resources — Pehar', url: 'https://www.himalayanart.org/search/set.cfm?setID=248' },
    ],
  },
  {
    id: 'samyeName',
    category: 'dharma',
    glyph: 'བསམ་ཡས',
    titleKey: 'codex.entry.samyeName.title',
    summaryKey: 'codex.entry.samyeName.summary',
    bodyKey: 'codex.entry.samyeName.body',
    tags: ['history', 'legend'],
    sources: [
      { label: 'Wikipedia — Testament of Ba', url: 'https://en.wikipedia.org/wiki/Testament_of_Ba' },
      { label: 'Rigpa Wiki — Samye', url: 'https://www.rigpawiki.org/index.php?title=Samye' },
    ],
  },
  {
    id: 'sevenTestedMen',
    category: 'figures',
    glyph: 'སད་མི་བདུན',
    titleKey: 'codex.entry.sevenTestedMen.title',
    summaryKey: 'codex.entry.sevenTestedMen.summary',
    bodyKey: 'codex.entry.sevenTestedMen.body',
    tags: ['history', 'legend'],
    sources: [
      { label: 'Rigpa Wiki — Seven Men who were Tested', url: 'https://www.rigpawiki.org/index.php?title=Seven_men_who_were_tested' },
      { label: 'Wikipedia — Samye', url: 'https://en.wikipedia.org/wiki/Samye' },
    ],
  },
];

export default CH4_CODEX_ENTRIES;
