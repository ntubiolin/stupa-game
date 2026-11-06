import '../../../i18n/storySamye.js';

export const SAMYE_CHAPTER = Object.freeze({
  id: 'samye',
  mapId: 'samye',
  previousId: 'yarlung',
  entryCheckpoint: 'stone',
  siteIds: Object.freeze(['samye', 'samyeMandala', 'hepori', 'pehar']),
  checkpoints: Object.freeze([
    ['stone', 'samye:place-stone', 'action'],
    ['wood', 'samye:place-wood', 'action'],
    ['night', 'samye:witness-night', 'action'],
    ['rebuild', 'samye:rebuild', 'action'],
    ['hepori', 'samye:read-hepori', 'card'],
    ['memory', 'samye:read-memory', 'card'],
    ['diary', 'diary:read', 'card'],
    ['complete', null, 'card'],
  ].map(([id, signal, presentation]) => Object.freeze({ id, signal, presentation }))),
});
