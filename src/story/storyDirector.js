import { STORY_BEATS } from '../data/story/beats.js';
import { CHAPTERS } from '../data/story/chapters.js';
import { STORY_SAVE_VERSION } from '../systems/save.js';
import {
  prologueChoiceKey, prologueRecordingReadFlag, prologueTurns,
  readPrologueReplies, selectPrologueReply,
} from '../data/story/phonePrologue.js';

import { phoneThreads, phoneReplyKey, phoneReadFlag, readThreadReplies, isThreadUnlocked } from '../data/story/phoneThreads.js';

const SAVE_SECTION = 'story';
const SAVE_VERSION = STORY_SAVE_VERSION;
const BEAT_INDEX = new Map(STORY_BEATS.map((beat, index) => [beat.id, index]));
const EVIDENCE_IDS = new Set(STORY_BEATS.flatMap(beat => beat.evidence ?? []));
const CLIP_IDS = new Set(STORY_BEATS.flatMap(beat => beat.clipId ? [beat.clipId] : []));

function freshState() {
  return {
    version: SAVE_VERSION,
    beat: STORY_BEATS[0].id,
    evidence: [],
    choices: {},
    flags: {},
    clipsSeen: [],
    elapsedSeconds: 0,
    journey: { activeChapterId: null, chapters: {} },
  };
}

function readRecord(value, type) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, entry]) =>
    key && !Object.hasOwn(Object.prototype, key) && typeof entry === type
  ));
}

function readIds(value, knownIds) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(id => knownIds.has(id)))];
}

function evidenceBefore(beat) {
  return STORY_BEATS.slice(0, BEAT_INDEX.get(beat)).flatMap(entry => entry.evidence ?? []);
}

function readChapterValues(value, type) {
  return Object.fromEntries(Object.entries(readRecord(value, type))
    .filter(([key, entry]) => key.length <= 64 && (type !== 'string' || entry.length <= 128))
    .slice(0, 64));
}

function readJourney(value) {
  const chapters = {};
  for (const chapter of CHAPTERS) {
    if (chapter.previousId && !chapters[chapter.previousId]?.completed) continue;
    const record = value?.chapters?.[chapter.id];
    const checkpoint = chapter.checkpoints.find(entry => entry.id === record?.checkpointId);
    if (!checkpoint || record.completed !== (checkpoint.signal === null)) continue;
    const checkpointIndex = chapter.checkpoints.indexOf(checkpoint);
    const invalidChoice = chapter.checkpoints.slice(0, checkpointIndex).some(step => {
      const legacyWindAnswer = chapter.id === 'mangyul' && step.id === 'answer'
        && !record.flags?.windAnswerRequired && record.choices?.[step.id] === undefined;
      return step.choices && !legacyWindAnswer && !step.choices.includes(record.choices?.[step.id]);
    });
    if (invalidChoice) continue;
    chapters[chapter.id] = {
      checkpointId: checkpoint.id,
      completed: record.completed,
      choices: readChapterValues(record.choices, 'string'),
      flags: readChapterValues(record.flags, 'boolean'),
    };
  }
  const active = value?.activeChapterId;
  const activeChapterId = typeof active === 'string' && Object.hasOwn(chapters, active) ? active : null;
  return { activeChapterId, chapters };
}

function readState(saved) {
  if ((saved?.version !== 1 && saved?.version !== SAVE_VERSION) || !BEAT_INDEX.has(saved.beat)) return freshState();
  const choices = readRecord(saved.choices, 'string');
  const flags = readRecord(saved.flags, 'boolean');
  if (saved.beat === 'prologue') {
    const replies = readPrologueReplies(choices);
    // Drop orphaned replies so recording a missing turn cannot skip the following one.
    for (const turn of prologueTurns.slice(replies.length)) delete choices[prologueChoiceKey(turn)];
    if (replies.length < prologueTurns.length) delete flags[prologueRecordingReadFlag];
  }
  // Phone choices share the v2 store while rejecting orphaned or unknown turns.
  const phoneKeys = new Set();
  for (const thread of phoneThreads) {
    const replies = readThreadReplies({ choices }, thread.id);
    for (const turn of replies) phoneKeys.add(phoneReplyKey(thread.id, turn.id));
    if (replies.length !== thread.turns.length) delete flags[phoneReadFlag(thread.id)];
  }
  for (const key of Object.keys(choices)) {
    if (key.startsWith('phone.') && !phoneKeys.has(key)) delete choices[key];
  }
  const readFlags = new Set(phoneThreads.map(thread => phoneReadFlag(thread.id)));
  for (const key of Object.keys(flags)) {
    if (key.startsWith('phone.') && !readFlags.has(key)) delete flags[key];
  }
  return {
    version: SAVE_VERSION,
    beat: saved.beat,
    // A valid beat implies its earlier evidence is available, even in a partial save.
    evidence: [...new Set([...readIds(saved.evidence, EVIDENCE_IDS), ...evidenceBefore(saved.beat)])],
    choices,
    flags,
    clipsSeen: readIds(saved.clipsSeen, CLIP_IDS),
    elapsedSeconds: Number.isFinite(saved.elapsedSeconds) && saved.elapsedSeconds >= 0
      ? saved.elapsedSeconds
      : 0,
    journey: saved.version === SAVE_VERSION && saved.beat === 'complete'
      ? readJourney(saved.journey) : freshState().journey,
  };
}

export function createStoryDirector(ctx) {
  const { bus, save } = ctx;
  const saved = save.get(SAVE_SECTION, null);
  const preserveNewerSave = saved?.version > SAVE_VERSION;
  let state = readState(saved);
  let started = false;
  let publishingBeat = false;
  let beatRun = 0;
  let activeClip = null;

  function getState() {
    return {
      ...state,
      evidence: [...state.evidence],
      choices: { ...state.choices },
      flags: { ...state.flags },
      clipsSeen: [...state.clipsSeen],
      journey: getJourney(),
    };
  }

  function isReadOnly() {
    return preserveNewerSave || save.isReadOnly?.() === true
      || save.getStatus?.().error === 'unsupported-story-version';
  }

  function getJourney() {
    return readJourney(state.journey);
  }

  function commitJourney(journey) {
    if (isReadOnly() || publishingBeat || state.beat !== 'complete') return false;
    const next = { ...getState(), journey: readJourney(journey) };
    if (!save.commitSection(SAVE_SECTION, next).ok) return false;
    state = next;
    return true;
  }

  function persist() {
    if (!isReadOnly()) save.set(SAVE_SECTION, getState());
  }

  function addEvidence(ids) {
    const added = ids.filter(id => !state.evidence.includes(id));
    state.evidence.push(...added);
    return added;
  }

  function publishEvidence(added) {
    for (const id of added) bus.emit('story:evidence', { id });
  }

  function publishBeat({ completed, added = [] } = {}) {
    // The bus is synchronous. Finish publishing this transition before accepting another.
    publishingBeat = true;
    try {
      publishEvidence(added);
      if (completed) bus.emit('story:beat-complete', { beat: completed });
      bus.emit('story:beat-start', { beat: state.beat });
    } finally {
      publishingBeat = false;
    }
  }

  function start() {
    if (started) return false;
    started = true;
    if (JSON.stringify(saved) !== JSON.stringify(getState())) persist();
    publishBeat();
    return true;
  }

  function recordPrologueReply(replyId) {
    if (!started || publishingBeat || state.beat !== 'prologue') return false;
    const replies = readPrologueReplies(state.choices);
    if (selectPrologueReply(replies, replyId) === replies) return false;
    state.choices[prologueChoiceKey(prologueTurns[replies.length])] = replyId;
    persist();
    return true;
  }

  function acknowledgePrologueRecording() {
    if (!started || publishingBeat || state.beat !== 'prologue' || state.flags[prologueRecordingReadFlag]) return false;
    if (readPrologueReplies(state.choices).length !== prologueTurns.length) return false;
    state.flags[prologueRecordingReadFlag] = true;
    persist();
    return true;
  }

  function commitPhoneChange(next, threadId) {
    if (!started || publishingBeat || isReadOnly()) return false;
    if (!save.commitSection(SAVE_SECTION, next).ok) return false;
    state = next;
    bus.emit('story:phone-change', { threadId });
    return true;
  }

  function recordPhoneReply(threadId, replyId) {
    const thread = phoneThreads.find(entry => entry.id === threadId);
    if (!thread || !isThreadUnlocked(state, thread)) return false;
    // Task completion silences the proxy and freezes all earlier exchanges.
    if (state.journey.chapters.finale?.choices?.decision) return false;
    const replies = readThreadReplies(state, threadId);
    const turn = thread.turns[replies.length];
    if (!turn || turn.id !== replyId) return false;
    const next = getState();
    next.choices[phoneReplyKey(threadId, turn.id)] = replyId;
    return commitPhoneChange(next, threadId);
  }

  function acknowledgePhoneThread(threadId) {
    const thread = phoneThreads.find(entry => entry.id === threadId);
    if (!thread || !isThreadUnlocked(state, thread) || state.flags[phoneReadFlag(threadId)]) return false;
    if (readThreadReplies(state, threadId).length !== thread.turns.length) return false;
    const next = getState();
    next.flags[phoneReadFlag(threadId)] = true;
    return commitPhoneChange(next, threadId);
  }

  function signal(name, payload = {}) {
    if (!started || publishingBeat) return false;
    const index = BEAT_INDEX.get(state.beat);
    const beat = STORY_BEATS[index];
    if (!beat.signal || beat.signal !== name) return false;
    if (beat.clipId && payload?.clipId !== beat.clipId) return false;

    const added = addEvidence(beat.evidence ?? []);
    if (beat.clipId && !state.clipsSeen.includes(beat.clipId)) state.clipsSeen.push(beat.clipId);
    Object.assign(state.choices, readRecord(payload?.choices, 'string'));
    Object.assign(state.flags, readRecord(payload?.flags, 'boolean'));
    state.beat = STORY_BEATS[index + 1].id;
    beatRun += 1;
    persist();
    publishBeat({ completed: beat.id, added });
    return true;
  }

  function grantEvidence(id) {
    if (publishingBeat || !EVIDENCE_IDS.has(id) || state.evidence.includes(id)) return false;
    state.evidence.push(id);
    persist();
    publishEvidence([id]);
    return true;
  }

  function reset() {
    if (publishingBeat || isReadOnly()) return false;
    const next = freshState();
    if (!save.commitSection(SAVE_SECTION, next).ok) return false;
    state = next;
    beatRun += 1;
    if (started) publishBeat();
    return true;
  }

  function skipTo(beatId) {
    if (publishingBeat || !BEAT_INDEX.has(beatId) || state.beat === beatId) return false;
    const added = addEvidence(evidenceBefore(beatId));
    state.beat = beatId;
    beatRun += 1;
    persist();
    if (started) publishBeat({ added });
    return true;
  }

  function playClip(id) {
    if (!started || activeClip || !CLIP_IDS.has(id)) return false;
    activeClip = { id, beatRun };
    bus.emit('story:clip-play', { id });
    return true;
  }

  bus.on('story:clip-end', payload => {
    const { id, reason } = payload ?? {};
    if (!activeClip || activeClip.id !== id) return;
    if (reason !== 'complete' && reason !== 'skip' && reason !== 'cancel') return;
    const clip = activeClip;
    activeClip = null;
    if (clip.beatRun !== beatRun || reason === 'cancel') return;

    if (signal('documentary:complete', { clipId: id })) return;
    if (!state.clipsSeen.includes(id)) {
      state.clipsSeen.push(id);
      persist();
    }
  });

  function update(dt) {
    if (!started || state.beat === 'complete' || !Number.isFinite(dt) || dt <= 0) return;
    const previous = state.elapsedSeconds;
    const elapsed = previous + dt;
    if (!Number.isFinite(elapsed)) return;
    state.elapsedSeconds = elapsed;
    if (Math.floor(elapsed) > Math.floor(previous)) persist();
  }

  const api = {
    start, signal, getState, recordPrologueReply, acknowledgePrologueRecording,
    recordPhoneReply, acknowledgePhoneThread,
    grantEvidence, reset, skipTo, playClip, update, getJourney, commitJourney, isReadOnly,
  };
  ctx.story = api;
  ctx.debug?.register('story', { getState, grantEvidence, reset, skipTo, playClip });
  return api;
}
