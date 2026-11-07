import '../../../i18n/storyChimphu.js';

export const CHIMPHU_CHAPTER = Object.freeze({
  id: 'chimphu',
  mapId: 'chimphu',
  previousId: 'samye',
  entryCheckpoint: 'road',
  siteIds: Object.freeze(['chimphu', 'yesheTsogyal', 'terma', 'terton']),
  checkpoints: Object.freeze([
    ['road', 'road:arrive', 'card'],
    ['message', 'message:read', 'card'],
    ['custody', 'custody:inspect', 'card'],
    ['records', 'records:verify', 'card'],
    ['bundle', 'bundle:take', 'card'],
    ['cave', 'cave:observe'],
    ['light', 'light:touch'],
    ['starlight1', 'starlight:read', 'card'],
    ['starlight2', 'starlight:read', 'card'],
    ['starlight3', 'starlight:read', 'card'],
    ['descent', 'descent:read', 'card', 'chimphu'],
    ['diary', 'diary:read', 'card'],
    ['complete', null],
  ].map(([id, signal, presentation, phoneThreadId]) => Object.freeze(
    presentation ? { id, signal, presentation, ...(phoneThreadId && { phoneThreadId }) } : { id, signal },
  ))),
});
