// ============================================================================
// Chapter 2 — Mangyul Pass (芒域山口) NPC Definitions
// Auto-discovered by src/data/npcs.js via import.meta.glob('./npcs/*.js')
// ============================================================================

export const CH2_NPCS = [
  {
    id: 'envoyLeader',
    nameKey: 'npc.envoyLeader',
    look: 'noble',
    map: 'mangyul',
    x: 3010,
    z: 50,
    facing: 0.2,
    dialogueId: 'ch2.envoyLeader',
  },
  {
    id: 'envoyRetinue1',
    nameKey: 'npc.envoyRetinue1',
    look: 'villager',
    map: 'mangyul',
    x: 3006,
    z: 53,
    facing: 0.8,
    dialogueId: 'ch2.envoyRetinue1',
  },
  {
    id: 'envoyRetinue2',
    nameKey: 'npc.envoyRetinue2',
    look: 'villager',
    map: 'mangyul',
    x: 3014,
    z: 52,
    facing: -0.7,
    dialogueId: 'ch2.envoyRetinue2',
  },
  {
    id: 'envoyPorter',
    nameKey: 'npc.envoyPorter',
    look: 'villager',
    map: 'mangyul',
    x: 3012,
    z: 46,
    facing: -2.4,
    dialogueId: 'ch2.envoyPorter',
  },
  {
    id: 'guruVision.mangyul',
    nameKey: 'npc.guruVision.mangyul',
    look: 'vision',
    map: 'mangyul',
    x: 3000,
    z: -60,
    facing: 0,
    dialogueId: 'ch2.guruVision',
  },
];

export default CH2_NPCS;
