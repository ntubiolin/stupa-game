import { getChapter } from '../data/story/chapters.js';

export function createChapterDirector(ctx) {
  const { bus, story } = ctx;
  let token = 0;
  let readyChapterId = null;
  let replay = null;
  let transitioning = false;
  let disposed = false;

  function getState() {
    const journey = story.getJourney();
    const chapters = Object.fromEntries(Object.entries(journey.chapters).map(([id, record]) =>
      [id, { checkpointId: record.checkpointId, completed: record.completed }]));
    if (replay) {
      const { chapterId, checkpointId, completed } = replay;
      chapters[chapterId] = { checkpointId, completed };
    }
    return {
      activeChapterId: replay?.chapterId ?? journey.activeChapterId,
      chapters,
      replaying: replay !== null,
      readOnly: story.isReadOnly(),
    };
  }

  function canStart(id) {
    const chapter = getChapter(id);
    if (!chapter || disposed || story.isReadOnly() || story.getState().beat !== 'complete') return false;
    const { activeChapterId, chapters } = story.getJourney();
    return (!activeChapterId || activeChapterId === id)
      && (!chapter.previousId || chapters[chapter.previousId]?.completed === true);
  }

  function transition(callback) {
    transitioning = true;
    try {
      return callback();
    } finally {
      transitioning = false;
    }
  }

  function publishChange(chapterId, checkpointId) {
    readyChapterId = chapterId;
    bus.emit('story:chapter-change', { chapterId, checkpointId, replaying: replay !== null });
  }

  async function prepare(chapterId, checkpointId, onReady) {
    const requestToken = ++token;
    try {
      const prepared = await transition(() => ctx.prepareChapter(chapterId, checkpointId));
      if (prepared !== true || requestToken !== token || disposed) return false;
    } catch {
      return false;
    }
    return transition(onReady);
  }

  async function start(id, { replay: replayRequested = false } = {}) {
    if (transitioning || replay || !canStart(id)) return false;
    const journey = story.getJourney();
    const record = journey.chapters[id];
    if (replayRequested && (!record?.completed || journey.activeChapterId)) return false;
    const chapter = getChapter(id);
    const checkpointId = (!replayRequested && record?.checkpointId) || chapter.entryCheckpoint;

    return prepare(id, checkpointId, () => {
      if (!canStart(id)) return false;
      const latest = story.getJourney();
      if (latest.activeChapterId !== journey.activeChapterId
        || latest.chapters[id]?.checkpointId !== record?.checkpointId) return false;
      if (replayRequested) {
        replay = { chapterId: id, checkpointId, completed: false };
      } else {
        latest.activeChapterId = id;
        latest.chapters[id] ??= { checkpointId, completed: false, choices: {}, flags: {} };
        if (!story.commitJourney(latest)) return false;
      }
      publishChange(id, checkpointId);
      return true;
    });
  }

  async function resume() {
    if (disposed || transitioning || replay || story.isReadOnly()) return false;
    const { activeChapterId, chapters } = story.getJourney();
    if (!activeChapterId || !canStart(activeChapterId)) return false;
    const { checkpointId } = chapters[activeChapterId];

    return prepare(activeChapterId, checkpointId, () => {
      const latest = story.getJourney();
      if (!canStart(activeChapterId) || latest.activeChapterId !== activeChapterId
        || latest.chapters[activeChapterId]?.checkpointId !== checkpointId) return false;
      publishChange(activeChapterId, checkpointId);
      return true;
    });
  }

  function signal(name, payload) {
    if (disposed || transitioning || story.isReadOnly()) return false;
    const journey = story.getJourney();
    const chapterId = replay?.chapterId ?? journey.activeChapterId;
    if (!chapterId || readyChapterId !== chapterId) return false;
    const checkpointId = replay?.checkpointId ?? journey.chapters[chapterId].checkpointId;
    if (checkpointId !== payload?.checkpointId) return false;
    const { checkpoints } = getChapter(chapterId);
    const index = checkpoints.findIndex(checkpoint => checkpoint.id === checkpointId);
    if (!checkpoints[index]?.signal || checkpoints[index].signal !== name) return false;
    const next = checkpoints[index + 1];

    return transition(() => {
      if (replay) {
        replay.checkpointId = next.id;
        replay.completed = next.signal === null;
      } else {
        const record = journey.chapters[chapterId];
        record.checkpointId = next.id;
        record.completed = next.signal === null;
        if (!story.commitJourney(journey)) return false;
      }
      token += 1;
      publishChange(chapterId, next.id);
      return true;
    });
  }

  function exit() {
    if (disposed || transitioning) return false;
    token += 1;
    const journey = story.getJourney();
    const chapterId = replay?.chapterId ?? journey.activeChapterId;
    if (!chapterId) return false;
    return transition(() => {
      if (replay) {
        replay = null;
      } else {
        journey.activeChapterId = null;
        if (!story.commitJourney(journey)) return false;
      }
      readyChapterId = null;
      bus.emit('story:chapter-exit', { chapterId });
      return true;
    });
  }

  function dispose() {
    disposed = true;
    token += 1;
    readyChapterId = null;
    replay = null;
  }

  const api = { getState, canStart, start, resume, signal, exit, dispose };
  ctx.chapters = api;
  return api;
}
