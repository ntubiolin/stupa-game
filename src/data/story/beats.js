/** Beat completion unlocks evidence for the following beat. */
export const STORY_BEATS = Object.freeze([
  {
    id: 'prologue',
    signal: 'prologue:complete',
    evidence: Object.freeze(['train-recording']),
    titleKey: 'story.beat.prologue.title',
    hintKey: 'story.beat.prologue.hint',
  },
  {
    id: 'arrival',
    signal: 'arrival:explored',
    titleKey: 'story.beat.arrival.title',
    hintKey: 'story.beat.arrival.hint',
  },
  {
    id: 'photography',
    signal: 'photo:matched',
    evidence: Object.freeze(['restoration-record', 'stone-record']),
    titleKey: 'story.beat.photography.title',
    hintKey: 'story.beat.photography.hint',
  },
  {
    id: 'restoration',
    signal: 'documentary:complete',
    clipId: 'restoration',
    titleKey: 'story.beat.restoration.title',
    hintKey: 'story.beat.restoration.hint',
  },
  {
    id: 'losang',
    signal: 'losang:complete',
    evidence: Object.freeze(['old-map']),
    titleKey: 'story.beat.losang.title',
    hintKey: 'story.beat.losang.hint',
  },
  {
    id: 'map',
    phoneThreadId: 'hotel',
    signal: 'map:opened',
    titleKey: 'story.beat.map.title',
    hintKey: 'story.beat.map.hint',
  },
  {
    id: 'vision',
    signal: 'vision:restored',
    evidence: Object.freeze(['new-diary']),
    titleKey: 'story.beat.vision.title',
    hintKey: 'story.beat.vision.hint',
  },
  {
    id: 'return',
    signal: 'return:read',
    titleKey: 'story.beat.return.title',
    hintKey: 'story.beat.return.hint',
  },
  {
    id: 'complete',
    titleKey: 'story.beat.complete.title',
    hintKey: 'story.beat.complete.hint',
  },
].map(beat => Object.freeze(beat)));
