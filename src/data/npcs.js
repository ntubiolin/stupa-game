import '../i18n/quests.js';

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

export function getNpcDef(id) {
  return NPCS.find((n) => n.id === id) || null;
}
