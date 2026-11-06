// Add enabled chapters here only after their runtime and scene are validated.
export const CHAPTERS = Object.freeze([
  Object.freeze({
    id: 'pharping',
    mapId: 'pharping',
    previousId: null,
    entryCheckpoint: 'spring1',
    siteIds: Object.freeze(['pharping', 'yangleshoCave', 'asuraCave', 'vajrakilaya', 'phurba', 'droughtLegend']),
    checkpoints: Object.freeze([
      ['spring1', 'spring:clear'],
      ['spring2', 'spring:clear'],
      ['channel1', 'channel:clear'],
      ['channel2', 'channel:clear'],
      ['manuscript', 'manuscript:take'],
      ['cave', 'manuscript:return'],
      ['shadow', 'shadow:observe'],
      ['release', 'shadow:release'],
      ['rain', 'rain:return'],
      ['diary', 'diary:read'],
      ['complete', null],
    ].map(([id, signal]) => Object.freeze({ id, signal }))),
  }),
]);

const chaptersById = new Map(CHAPTERS.map(chapter => [chapter.id, chapter]));

export function getChapter(id) {
  return chaptersById.get(id);
}
