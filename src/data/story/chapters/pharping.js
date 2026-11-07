import '../../../i18n/storyPharping.js';

export const PHARPING_CHAPTER = Object.freeze({
  id: 'pharping', mapId: 'pharping', previousId: null,
  entryCheckpoint: 'backup',
  siteIds: Object.freeze(['pharping', 'yangleshoCave', 'asuraCave', 'vajrakilaya', 'phurba', 'droughtLegend']),
  checkpoints: Object.freeze([
    ['backup', 'backup:read', 'card'],
    ['spring1', 'spring:clear'], ['spring2', 'spring:clear'],
    ['settle', 'spring:settle'],
    ['channel1', 'channel:clear'], ['channel2', 'channel:clear'],
    ['wait', 'water:observe'],
    ['manuscript', 'manuscript:take'], ['cave', 'manuscript:return'],
    ['shadow', 'shadow:observe'], ['release', 'shadow:release'],
    ['rain', 'rain:return'], ['lamp', 'lamp:light'],
    ['phone', 'phone:read', 'card', 'pharping'], ['diary', 'diary:read', 'card'],
    ['complete', null],
  ].map(([id, signal, presentation = 'action', phoneThreadId]) => Object.freeze({ id, signal, presentation, ...(phoneThreadId && { phoneThreadId }) }))),
});
