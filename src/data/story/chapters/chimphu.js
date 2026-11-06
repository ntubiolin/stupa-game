import '../../../i18n/storyChimphu.js';

export const CHIMPHU_CHAPTER = Object.freeze({
  id: 'chimphu',
  mapId: 'chimphu',
  previousId: 'samye',
  entryCheckpoint: 'road',
  siteIds: Object.freeze(['chimphu', 'yesheTsogyal', 'terma', 'terton']),
  checkpoints: Object.freeze([
    ['road', 'road:arrive'],
    ['message', 'message:read', 'card'],
    ['custody', 'custody:inspect'],
    ['records', 'records:verify', 'card'],
    ['bundle', 'bundle:take'],
    ['cave', 'cave:observe'],
    ['light', 'light:touch'],
    ['diary', 'diary:read', 'card'],
    ['complete', null],
  ].map(([id, signal, presentation]) => Object.freeze(
    presentation ? { id, signal, presentation } : { id, signal },
  ))),
});
