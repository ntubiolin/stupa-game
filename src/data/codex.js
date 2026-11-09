/**
 * Codex (法教圖鑑) Data Definitions.
 *
 * Categories:
 *   - 'place'    : 聖地 (Sacred Places)
 *   - 'person'   : 人物 (Historical Figures & Masters)
 *   - 'deity'    : 本尊護法 (Deities & Protectors)
 *   - 'concept'  : 義理 (Dharma Concepts)
 *   - 'practice' : 修持 (Practices & Ritual Implements)
 *
 * Tags:
 *   - 'history'  : 〔史實〕 (Historically attested site, person, or practice)
 *   - 'legend'   : 〔傳說〕 (Sacred legend / Terma hagiography)
 */

export const CODEX_CATEGORIES = [
  { id: 'all', labelKey: 'codex.filter.all' },
  { id: 'place', labelKey: 'codex.filter.place' },
  { id: 'person', labelKey: 'codex.filter.person' },
  { id: 'deity', labelKey: 'codex.filter.deity' },
  { id: 'concept', labelKey: 'codex.filter.concept' },
  { id: 'practice', labelKey: 'codex.filter.practice' },
];

export const CODEX_ENTRIES = [
  {
    id: 'boudhanath',
    category: 'place',
    tag: 'history',
    chapter: 0,
    defaultUnlocked: true,
    titleKey: 'codex.boudhanath.title',
    bodyKey: 'codex.boudhanath.body',
    glyph: 'བྱ་རུང་ཁ་ཤོར།',
    sources: [
      { label: 'UNESCO: Kathmandu Valley', url: 'https://whc.unesco.org/en/list/121/' },
      { label: 'Wikipedia: Boudhanath', url: 'https://en.wikipedia.org/wiki/Boudhanath' },
    ],
  },
  {
    id: 'kora',
    category: 'practice',
    tag: 'history',
    chapter: 0,
    titleKey: 'codex.kora.title',
    bodyKey: 'codex.kora.body',
    glyph: 'སྐོར་བ།',
    sources: [
      { label: 'Wikipedia: Kora (pilgrimage)', url: 'https://en.wikipedia.org/wiki/Kora_(pilgrimage)' },
      { label: 'Wikipedia: Pradakshina', url: 'https://en.wikipedia.org/wiki/Pradakshina' },
    ],
  },
  {
    id: 'prostration',
    category: 'practice',
    tag: 'history',
    chapter: 0,
    titleKey: 'codex.prostration.title',
    bodyKey: 'codex.prostration.body',
    glyph: 'ཕྱག་འཚལ།',
    sources: [
      { label: 'Wikipedia: Prostration (Buddhism)', url: 'https://en.wikipedia.org/wiki/Prostration_(Buddhism)' },
    ],
  },
  {
    id: 'butterLamp',
    category: 'practice',
    tag: 'history',
    chapter: 0,
    titleKey: 'codex.butterLamp.title',
    bodyKey: 'codex.butterLamp.body',
    glyph: 'མཆོད་མེ།',
    sources: [
      { label: 'Wikipedia: Butter lamp', url: 'https://en.wikipedia.org/wiki/Butter_lamp' },
    ],
  },
  {
    id: 'prayerWheel',
    category: 'practice',
    tag: 'history',
    chapter: 0,
    titleKey: 'codex.prayerWheel.title',
    bodyKey: 'codex.prayerWheel.body',
    glyph: 'མ་ཎི་འཁོར་ལོ།',
    sources: [
      { label: 'Wikipedia: Prayer wheel', url: 'https://en.wikipedia.org/wiki/Prayer_wheel' },
    ],
  },
  {
    id: 'maniStone',
    category: 'practice',
    tag: 'history',
    chapter: 0,
    titleKey: 'codex.maniStone.title',
    bodyKey: 'codex.maniStone.body',
    glyph: 'རྡོ་མ་ཎི།',
    sources: [
      { label: 'Wikipedia: Mani stone', url: 'https://en.wikipedia.org/wiki/Mani_stone' },
    ],
  },
  {
    id: 'omManiPadmeHum',
    category: 'practice',
    tag: 'history',
    chapter: 0,
    titleKey: 'codex.omManiPadmeHum.title',
    bodyKey: 'codex.omManiPadmeHum.body',
    glyph: 'ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ།',
    sources: [
      { label: 'Wikipedia: Om mani padme hum', url: 'https://en.wikipedia.org/wiki/Om_mani_padme_hum' },
    ],
  },
  {
    id: 'padmasambhava',
    category: 'person',
    tag: 'history',
    chapter: 1,
    titleKey: 'codex.padmasambhava.title',
    bodyKey: 'codex.padmasambhava.body',
    glyph: 'པདྨ་འབྱུང་གནས།',
    sources: [
      { label: 'Wikipedia: Padmasambhava', url: 'https://en.wikipedia.org/wiki/Padmasambhava' },
      { label: 'Treasury of Lives: Padmasambhava', url: 'https://treasuryoflives.org/biographies/view/Padmasambhava/4114' },
    ],
  },
  {
    id: 'jarungKhashor',
    category: 'place',
    tag: 'legend',
    chapter: 1,
    titleKey: 'codex.jarungKhashor.title',
    bodyKey: 'codex.jarungKhashor.body',
    glyph: 'བྱ་རུང་ཁ་ཤོར་གྱི་ལོ་རྒྱུས།',
    sources: [
      { label: 'Rigpa Wiki: Legend of Jarung Khashor', url: 'https://www.rigpawiki.org/index.php?title=Legend_of_Jarung_Khashor' },
    ],
  },
  {
    id: 'liberation',
    category: 'concept',
    tag: 'history',
    chapter: 1,
    titleKey: 'codex.liberation.title',
    bodyKey: 'codex.liberation.body',
    glyph: 'སྒྲོལ་བ།',
    sources: [
      { label: 'Wikipedia: Karuṇā (Compassion in Buddhism)', url: 'https://en.wikipedia.org/wiki/Karu%E1%B9%87%C4%81' },
    ],
  },
  {
    id: 'samye',
    category: 'place',
    tag: 'history',
    chapter: 4,
    titleKey: 'codex.samye.title',
    bodyKey: 'codex.samye.body',
    glyph: 'བསམ་ཡས།',
    sources: [
      { label: 'Wikipedia: Samye', url: 'https://en.wikipedia.org/wiki/Samye' },
    ],
  },
];

export const CODEX_BY_ID = Object.fromEntries(CODEX_ENTRIES.map((e) => [e.id, e]));

import CH1_CODEX_ENTRIES from './codex/ch1.js';
import CH2_CODEX_ENTRIES from './codex/ch2.js';
import CH3_CODEX_ENTRIES from './codex/ch3.js';
import CH4_CODEX_ENTRIES from './codex/ch4.js';
import CH5_CODEX from './codex/ch5.js';

export function registerCodexEntries(entries) {
  const list = Array.isArray(entries) ? entries : [];
  for (const entry of list) {
    if (!entry || typeof entry.id !== 'string') continue;
    const idx = CODEX_ENTRIES.findIndex((e) => e.id === entry.id);
    if (idx !== -1) {
      CODEX_ENTRIES[idx] = entry;
    } else {
      CODEX_ENTRIES.push(entry);
    }
    CODEX_BY_ID[entry.id] = entry;
  }
}

// Auto-discover chapter codex entries (`src/data/codex/*.js`) with Node.js fallback
const fallbackCodexModules = {
  ch1: { CH1_CODEX_ENTRIES },
  ch2: { CH2_CODEX_ENTRIES },
  ch3: { CH3_CODEX_ENTRIES },
  ch4: { CH4_CODEX_ENTRIES },
  ch5: { CH5_CODEX },
};
let chapterCodexModules = fallbackCodexModules;
try {
  chapterCodexModules = {
    ...fallbackCodexModules,
    ...(import.meta.glob('./codex/*.js', { eager: true }) || {}),
  };
} catch {
  chapterCodexModules = fallbackCodexModules;
}
for (const mod of Object.values(chapterCodexModules)) {
  if (!mod || typeof mod !== 'object') continue;
  for (const val of Object.values(mod)) {
    if (Array.isArray(val)) {
      registerCodexEntries(val);
    }
  }
}
