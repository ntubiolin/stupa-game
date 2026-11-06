/**
 * Chapter 4 (Samye Monastery & Mount Hepo Ri) — NPC Definitions (`src/data/npcs/ch4.js`) — Issue #35
 *
 * Defines Chapter 4 NPCs in `samye` (origin `(5000, 0)`):
 *   1. `shantarakshita` — Abbot Śāntarakṣita at Construction Camp `(4970, 55)`
 *   2. `trisongDetsen` — King Trisong Detsen at Construction Camp `(4973.5, 55)`
 *   3. `samyeArtisan` — Master Artisan at Construction Camp `(4966.5, 52.5)`
 *   4. `guruVision.samye` — Pure Vision of Guru Rinpoche at Mount Hepo Ri Summit `(5075, -10)`
 *   5. `sevenTestedMen` — Representative of the Seven Tested Men (Ba Salnang) near South Gate `(5004, 46)`
 */
import '../../i18n/ch4.js';

export const CH4_NPCS = [
  {
    id: 'shantarakshita',
    map: 'samye',
    x: 4970,
    z: 55,
    heading: Math.PI * 0.15,
    look: 'abbot',
    nameKey: 'npc.shantarakshita.name',
    titleKey: 'npc.shantarakshita.title',
    dialogueId: 'ch4.shantarakshita',
    interactRadius: 2.8,
  },
  {
    id: 'trisongDetsen',
    map: 'samye',
    x: 4973.5,
    z: 55,
    heading: -Math.PI * 0.15,
    look: 'noble',
    nameKey: 'npc.trisongDetsen.name',
    titleKey: 'npc.trisongDetsen.title',
    dialogueId: 'ch4.trisongDetsen',
    interactRadius: 2.8,
  },
  {
    id: 'samyeArtisan',
    map: 'samye',
    x: 4966.5,
    z: 52.5,
    heading: Math.PI * 0.25,
    look: 'artisan',
    nameKey: 'npc.samyeArtisan.name',
    titleKey: 'npc.samyeArtisan.title',
    dialogueId: 'ch4.samyeArtisan',
    interactRadius: 2.8,
  },
  {
    id: 'guruVision.samye',
    map: 'samye',
    x: 5075,
    z: -10,
    heading: Math.PI * 0.5,
    look: 'vision',
    nameKey: 'npc.guruVision.samye.name',
    titleKey: 'npc.guruVision.samye.title',
    dialogueId: 'ch4.guruVision',
    interactRadius: 3.0,
  },
  {
    id: 'sevenTestedMen',
    map: 'samye',
    x: 5004,
    z: 46,
    heading: 0,
    look: 'monk',
    nameKey: 'npc.sevenTestedMen.name',
    titleKey: 'npc.sevenTestedMen.title',
    dialogueId: 'ch4.sevenTestedMen',
    interactRadius: 2.6,
    visibleWhenFlag: 'ch4.pehar.done',
  },
];

export default CH4_NPCS;
