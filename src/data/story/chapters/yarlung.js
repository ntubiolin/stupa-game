import '../../../i18n/storyYarlung.js';

export const YARLUNG_CHAPTER = Object.freeze({
  id: 'yarlung',
  mapId: 'yarlung',
  previousId: 'mangyul',
  entryCheckpoint: 'observe',
  siteIds: Object.freeze(['yarlungValley', 'yumbulagang', 'sheldrak', 'yarlhaShampo']),
  checkpoints: Object.freeze([
    ['observe', 'yak:observe'],
    ['calm', 'yak:calm'],
    ['stone1', 'yak:clear'],
    ['pause', 'yak:pause'],
    ['stone2', 'yak:clear'],
    ['release', 'yak:release'],
    ['guardian', 'yak:touch'],
    ['memory', 'memory:read', 'card'],
    ['boundary', 'boundary:read', 'card'],
    ['diary', 'diary:read', 'card'],
    ['complete', null],
  ].map(([id, signal, presentation]) => Object.freeze(
    presentation ? { id, signal, presentation } : { id, signal },
  ))),
});
