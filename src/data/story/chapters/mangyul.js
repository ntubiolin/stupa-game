const altarCheckpoints = Array.from({ length: 12 }, (_, index) =>
  ({ id: `altar${index + 1}`, signal: 'altar:observe', presentation: 'action' }));

export const MANGYUL_CHAPTER = Object.freeze({
  id: 'mangyul',
  mapId: 'mangyul',
  previousId: 'pharping',
  entryCheckpoint: 'message',
  siteIds: Object.freeze(['mangyul', 'twelveTenma', 'windhorse', 'latse']),
  checkpoints: Object.freeze([
    { id: 'message', signal: 'message:read', presentation: 'card' },
    { id: 'memory', signal: 'memory:read', presentation: 'card' },
    { id: 'crossing', signal: 'crossing:begin', presentation: 'card' },
    ...altarCheckpoints,
    { id: 'answer', signal: 'answer:read', presentation: 'card' },
    { id: 'flags', signal: 'flags:tie', presentation: 'action' },
    { id: 'clearing', signal: 'clearing:observe', presentation: 'action' },
    { id: 'diary', signal: 'diary:read', presentation: 'card' },
    { id: 'complete', signal: null },
  ].map(checkpoint => Object.freeze(checkpoint))),
});
