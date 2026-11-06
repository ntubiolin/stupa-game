import '../i18n/quests.js';
import '../i18n/prologue.js';

export const NPC_LOOKS = [
  'lama',
  'merchant',
  'artisan',
  'villager',
  'noble',
  'abbot',
  'yogini',
  'vision',
];

/**
 * Data-driven NPC registry.
 * Format:
 *   {
 *     id, map, x, z, heading,
 *     look: 'lama'|'merchant'|'artisan'|'villager'|'noble'|'abbot'|'yogini'|'vision',
 *     nameKey,
 *     dialogue: string | Array<{ if?: { flag?, notFlag?, questActive?, questDone?, questStep? }, id: string }>,
 *     idle: 'pray'|'stand'|'work',
 *     showIf?: { flag?: string, notFlag?: string },
 *     quests?: string[],
 *     debugOnly?: boolean,
 *   }
 */
export const NPCS = [
  // Town NPCs at Boudhanath Stupa (outer plaza ring r ~ 32.2..32.6m; does not block Kora r=21..25m or lamps r~20.4m)
  {
    id: 'oldLama',
    map: 'stupa',
    x: -6,
    z: 32,
    heading: 0.25,
    look: 'lama',
    nameKey: 'npc.oldLama',
    idle: 'pray',
    quests: ['prologue.vow', 'prologue.north', 'ch5.epilogue'],
    dialogue: [
      { if: { questStep: 'ch5.epilogue:talk_old_lama' }, id: 'ch5.oldLama.epilogue' },
      { if: { questActive: 'ch5.epilogue' }, id: 'ch5.oldLama.epilogue' },
      { if: { flag: 'ch5.done' }, id: 'ch5.oldLama.done' },
      { if: { questStep: 'prologue.north:talk_report' }, id: 'prologue.oldLama.northReport' },
      { if: { questStep: 'prologue.north:talk_intro' }, id: 'prologue.oldLama.northIntro' },
      { if: { questActive: 'prologue.north' }, id: 'prologue.oldLama.northActive' },
      { if: { flag: 'prologue.north.done' }, id: 'prologue.oldLama.completed' },
      { if: { questStep: 'prologue.vow:talk_legend' }, id: 'prologue.oldLama.vowLegend' },
      { if: { questStep: 'prologue.vow:talk_intro' }, id: 'prologue.oldLama.vowIntro' },
      { if: { questActive: 'prologue.vow' }, id: 'prologue.oldLama.vowActive' },
      { if: { flag: 'prologue.vow.done' }, id: 'prologue.oldLama.northIntro' },
      { id: 'prologue.oldLama.vowIntro' },
    ],
  },
  {
    id: 'merchant',
    map: 'stupa',
    x: 32,
    z: 4,
    heading: -Math.PI / 2,
    look: 'merchant',
    nameKey: 'npc.merchant',
    idle: 'stand',
    dialogue: 'prologue.merchant.talk',
  },
  {
    id: 'artisan',
    map: 'stupa',
    x: -32,
    z: 4,
    heading: Math.PI / 2,
    look: 'artisan',
    nameKey: 'npc.artisan',
    idle: 'work',
    dialogue: 'prologue.artisan.talk',
  },
  {
    id: 'sandbox_lama',
    map: 'sandbox',
    x: 9000,
    z: 12,
    heading: 0,
    look: 'lama',
    nameKey: 'npc.sandbox_lama',
    idle: 'pray',
    quests: ['debug.sample'],
    dialogue: [
      { if: { questStep: 'debug.sample:report_lama' }, id: 'debug.sandboxLama.report' },
      { if: { questActive: 'debug.sample' }, id: 'debug.sandboxLama.active' },
      { if: { flag: 'debug.sample.completed' }, id: 'debug.sandboxLama.done' },
      { id: 'debug.sandboxLama.intro' },
    ],
    debugOnly: true,
  },
];

export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]));

export function registerNpcs(defs) {
  const list = Array.isArray(defs) ? defs : (defs && typeof defs === 'object' ? Object.values(defs) : []);
  for (const def of list) {
    if (!def || typeof def.id !== 'string') continue;
    const existingIdx = NPCS.findIndex((n) => n.id === def.id);
    if (existingIdx !== -1) {
      NPCS[existingIdx] = def;
    } else {
      NPCS.push(def);
    }
    NPC_BY_ID[def.id] = def;
  }
}

// Auto-discover chapter NPC modules (`src/data/npcs/*.js`)
const chapterNpcModules = import.meta.glob('./npcs/*.js', { eager: true });
for (const mod of Object.values(chapterNpcModules)) {
  if (!mod || typeof mod !== 'object') continue;
  for (const val of Object.values(mod)) {
    if (Array.isArray(val)) {
      registerNpcs(val);
    } else if (val && typeof val === 'object' && typeof val.id === 'string' && val.map) {
      registerNpcs([val]);
    }
  }
}

export function getNpcDef(id) {
  return NPC_BY_ID[id] || NPCS.find((n) => n.id === id) || null;
}
