import '../../../i18n/storyFinale.js';

export const FINALE_CHAPTER = Object.freeze({
  id: 'finale',
  mapId: 'stupa',
  previousId: 'chimphu',
  entryCheckpoint: 'letter1',
  siteIds: Object.freeze(['chimphu', 'terma']),
  checkpoints: Object.freeze([
    ['letter1', 'letter:read', 'card'],
    ['letter2', 'letter:read', 'card'],
    ['letter3', 'letter:read', 'card'],
    ['letter4', 'letter:read', 'card'],
    ['letter5', 'letter:read', 'card'],
    ['letter6', 'letter:read', 'card'],
    ['decision', 'proxy:decide', 'card', Object.freeze(['end', 'retain'])],
    ['response', 'proxy:acknowledge', 'card'],
    ['custody', 'slate:return', 'card'],
    ['kora1', 'kora:walk', 'action'],
    ['kora2', 'kora:walk', 'action'],
    ['kora3', 'kora:walk', 'action'],
    ['kora4', 'kora:walk', 'action'],
    ['lamp', 'lamp:light', 'action'],
    ['diary', 'diary:read', 'card'],
    ['complete', null, 'card'],
  ].map(([id, signal, presentation, choices]) => Object.freeze({
    id, signal, presentation, ...(choices && { choices }),
  }))),
});
