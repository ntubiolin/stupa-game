import { getChapter } from '../data/story/chapters.js';

export function createChapterDirector(ctx) {
  const { bus, story } = ctx;
  let token = 0;
  let readyChapterId = null;
  let transient = null;
  let pendingPreview = null;
  let transitioning = false;
  let disposed = false;

  function getState() {
    const journey = story.getJourney();
    const chapters = Object.fromEntries(Object.entries(journey.chapters).map(([id, record]) =>
      [id, { checkpointId: record.checkpointId, completed: record.completed }]));
    if (transient) {
      const { chapterId, checkpointId, completed } = transient;
      chapters[chapterId] = { checkpointId, completed };
    }
    return {
      activeChapterId: transient?.chapterId ?? journey.activeChapterId,
      chapters,
      replaying: Boolean(transient && !transient.testing),
      ...(transient?.testing && { testing: true }),
      readOnly: story.isReadOnly(),
    };
  }

  function canStart(id) {
    const chapter = getChapter(id);
    if (!chapter || disposed || transient?.testing || pendingPreview || story.isReadOnly() || story.getState().beat !== 'complete') return false;
    const { activeChapterId, chapters } = story.getJourney();
    return (!activeChapterId || activeChapterId === id || chapters[activeChapterId]?.completed)
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
    bus.emit('story:chapter-change', {
      chapterId, checkpointId,
      replaying: Boolean(transient && !transient.testing),
      ...(transient?.testing && { testing: true }),
    });
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
    if (transitioning || transient || !canStart(id)) return false;
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
        transient = { chapterId: id, checkpointId, completed: false, choices: {} };
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
    if (disposed || transitioning || transient || pendingPreview || story.isReadOnly()) return false;
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

  async function preview(id, checkpointId, { choice } = {}) {
    if (disposed || transitioning || !ctx.debug?.unlockedByPassword) return false;
    const chapter = getChapter(id);
    const index = chapter?.checkpoints.findIndex(step => step.id === checkpointId) ?? -1;
    if (index < 0) return false;
    const choiceStep = chapter.checkpoints.slice(0, index).find(step => step.choices);
    if (choiceStep ? !choiceStep.choices.includes(choice) : choice !== undefined) return false;

    const request = Symbol();
    pendingPreview = request;
    try {
      return await prepare(id, checkpointId, () => {
        if (pendingPreview !== request || !ctx.debug?.unlockedByPassword) return false;
        pendingPreview = null;
        transient = {
          chapterId: id,
          checkpointId,
          completed: chapter.checkpoints[index].signal === null,
          choices: choiceStep ? { [choiceStep.id]: choice } : {},
          testing: true,
        };
        publishChange(id, checkpointId);
        return true;
      });
    } finally {
      if (pendingPreview === request) pendingPreview = null;
    }
  }

  function signal(name, payload) {
    if (disposed || transitioning || pendingPreview || (!transient?.testing && story.isReadOnly())) return false;
    const journey = story.getJourney();
    const chapterId = transient?.chapterId ?? journey.activeChapterId;
    if (!chapterId || readyChapterId !== chapterId) return false;
    const checkpointId = transient?.checkpointId ?? journey.chapters[chapterId].checkpointId;
    if (checkpointId !== payload?.checkpointId) return false;
    const { checkpoints } = getChapter(chapterId);
    const index = checkpoints.findIndex(checkpoint => checkpoint.id === checkpointId);
    if (!checkpoints[index]?.signal || checkpoints[index].signal !== name) return false;
    const choices = checkpoints[index].choices;
    if (choices && !choices.includes(payload.choice)) return false;
    if (!choices && payload.choice !== undefined) return false;
    const next = checkpoints[index + 1];

    return transition(() => {
      if (transient) {
        if (choices) transient.choices[checkpointId] = payload.choice;
        transient.checkpointId = next.id;
        transient.completed = next.signal === null;
      } else {
        const record = journey.chapters[chapterId];
        if (choices) record.choices[checkpointId] = payload.choice;
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
    const cancellingPreview = Boolean(pendingPreview);
    pendingPreview = null;
    if (cancellingPreview && !transient?.testing) return true;
    const journey = story.getJourney();
    const chapterId = transient?.chapterId ?? journey.activeChapterId;
    if (!chapterId) return false;
    return transition(() => {
      const testing = transient?.testing;
      if (transient) {
        transient = null;
      } else {
        journey.activeChapterId = null;
        if (!story.commitJourney(journey)) return false;
      }
      readyChapterId = null;
      bus.emit('story:chapter-exit', { chapterId, ...(testing && { testing: true }) });
      return true;
    });
  }

  function dispose() {
    disposed = true;
    token += 1;
    readyChapterId = null;
    transient = null;
    pendingPreview = null;
  }

  function getChoices(id) {
    return { ...(transient?.chapterId === id ? transient.choices : story.getJourney().chapters[id]?.choices) };
  }

  const api = { getChoices, getState, canStart, start, resume, preview, signal, exit, dispose };
  ctx.chapters = api;
  return api;
}
