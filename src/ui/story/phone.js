import './phone.css';
import '../../i18n/storyPhone.js';
import {
  identityStep, openingMessage, prologueRecordingReadFlag, prologueTurns,
  readPrologueReplies, selectPrologueReply,
} from '../../data/story/phonePrologue.js';
import { HANDOVER_QR_SVG, phoneThreads, visiblePhoneThreads, unreadPhoneThreads, readThreadReplies, phoneSignal, phoneReplyKey } from '../../data/story/phoneThreads.js';
import { canReadReturnDiary, visiblePhoneRecords } from '../../data/story/phoneRecords.js';

const TAB_ICONS = {
  messages: 'M4 5h16v11H9l-5 3V5Z',
  photos: 'M3 4h18v16H3z M3 16l5-5 4 4 4-5 5 6 M8 8h.01',
  diary: 'M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5',
  evidence: 'M3 8V5h7l2 3h9v12H3z M7 13h10 M7 16h7',
  close: 'M6 6l12 12 M18 6 6 18',
  next: 'M4 12h15 M13 6l6 6-6 6',
  back: 'M20 12H5 M11 6l-6 6 6 6',
};

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function icon(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', TAB_ICONS[id]);
  svg.append(path);
  return svg;
}

function restorationStill() {
  const art = artwork('stupa');
  const still = element('img', 'story-phone__still');
  still.alt = '';
  still.loading = 'lazy';
  still.addEventListener('error', () => still.remove(), { once: true });
  still.src = `${import.meta.env.BASE_URL}story/restoration-memory.jpg`;
  art.append(still);
  return art;
}

function artwork(id) {
  const art = element('div', `story-phone__art story-phone__art--${id}`);
  art.setAttribute('aria-hidden', 'true');
  const shapes = { train: 21, stupa: 5, stone: 3, map: 7, diary: 4 }[id];
  for (let i = 0; i < shapes; i++) {
    const shape = element('span');
    shape.style.setProperty('--i', i);
    art.append(shape);
  }
  return art;
}

// Original sound design: low rolling noise and a wheel rhythm. No recorded voice.
function createTrainSource(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 5, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let seed = 172;
  let rumble = 0;
  for (let i = 0; i < samples.length; i++) {
    const time = i / context.sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    rumble = rumble * 0.972 + noise * 0.028;
    const pass = Math.sin(Math.PI * i / samples.length) ** 2;
    const wheels = (1 - (time * 3.7) % 1) ** 8;
    samples[i] = pass * (rumble * 0.38 + noise * wheels * 0.024 + Math.sin(310 * time) * 0.02);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  return source;
}

export function createPhone(ctx) {
  const { bus, i18n, state } = ctx;
  const t = (key) => i18n.t(key);
  const modal = element('dialog', 'story-phone');
  const stage = element('div', 'story-phone__stage');
  const scene = element('aside', 'story-phone__scene');
  const handset = element('div', 'story-phone__handset');
  const header = element('header', 'story-phone__top');
  const status = element('span', 'story-phone__status');
  const title = element('h2', 'story-phone__title');
  title.id = 'story-phone-title';
  modal.setAttribute('aria-labelledby', title.id);
  const closeButton = element('button', 'story-phone__close');
  closeButton.type = 'button';
  closeButton.append(icon('close'));
  closeButton.addEventListener('click', close);
  const pane = element('div', 'story-phone__pane');
  pane.tabIndex = 0;
  const actions = element('footer', 'story-phone__actions');
  const nav = element('nav', 'story-phone__nav');
  const tabs = ['messages', 'photos', 'diary', 'evidence'];
  const tabButtons = new Map(tabs.map((id) => {
    const button = element('button', 'story-phone__tab');
    button.type = 'button';
    const label = element('span');
    button.append(icon(id), label);
    button.addEventListener('click', () => switchTab(id));
    nav.append(button);
    return [id, { button, label }];
  }));

  header.append(status, title, closeButton);
  handset.append(header, pane, actions, nav);
  stage.append(scene, handset);
  modal.append(stage);
  document.body.append(modal);

  let tab = 'messages';
  let selectedRecord = null;
  let selectedThread = null;
  let threadSession = null;
  let handover = false;
  let scanned = false;
  let replay = null;
  let opener = null;
  let audio = null;
  let disposed = false;
  const snapshot = () => ctx.story.getState();

  function action(label, onClick, style = '', glyph) {
    const button = element('button', `story-phone__action ${style}`, t(label));
    button.type = 'button';
    if (glyph) button.append(icon(glyph));
    button.addEventListener('click', onClick);
    return button;
  }

  function intro(isReplay, compact = false) {
    const copy = element('div', 'story-phone__intro');
    const context = compact ? 'phone.contextCompact' : 'phone.context';
    copy.append(
      element('p', 'story-phone__eyebrow', t('phone.office')),
      element('p', 'story-phone__chapter', t('phone.chapter')),
      element('h3', 'story-phone__chapter-title', t('phone.chapterTitle')),
      element('p', 'story-phone__context', t(isReplay ? 'phone.replayContext' : context)),
    );
    return copy;
  }

  function message(textKey, speaker, style) {
    const bubble = element('div', `story-phone__message story-phone__message--${style}`);
    bubble.append(
      element('p', 'story-phone__sender', t(speaker)),
      element('p', 'story-phone__line', t(textKey)),
    );
    return bubble;
  }

  function transcript(replies, dateKey = 'phone.today') {
    const thread = element('div', 'story-phone__thread');
    thread.append(
      element('p', 'story-phone__date', t(dateKey)),
      message(openingMessage, 'phone.unknown', 'incoming'),
    );
    replies.forEach((reply, index) => {
      const turn = prologueTurns[index];
      const group = element('section', 'story-phone__turn');
      group.append(message(reply.textKey, 'phone.player', 'outgoing'));
      for (const textKey of turn.messages) {
        const speaker = index + 1 >= identityStep ? 'phone.proxy' : 'phone.unknown';
        group.append(message(textKey, speaker, 'incoming'));
      }
      if (turn.memoryKey) group.append(element('p', 'story-phone__aside', t(turn.memoryKey)));
      thread.append(group);
    });
    return thread;
  }

  function stopAudio() {
    if (!audio) return;
    const { context, source, button } = audio;
    audio = null;
    source.onended = null;
    source.disconnect();
    if (context.state !== 'closed') void context.close().catch(() => {});
    button.textContent = t('phone.audio.play');
    button.setAttribute('aria-pressed', 'false');
  }

  async function playTrain(button, note) {
    if (audio) {
      stopAudio();
      return;
    }
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    let context;
    try {
      context = new AudioContext();
      const source = createTrainSource(context);
      audio = { context, source, button };
      await context.resume();
      if (audio?.context !== context) return;
      note.textContent = t('phone.recording.note');
      button.textContent = t('phone.audio.stop');
      button.setAttribute('aria-pressed', 'true');
      source.onended = stopAudio;
      source.start();
    } catch {
      if (audio?.context === context) stopAudio();
      else if (context && context.state !== 'closed') void context.close().catch(() => {});
      note.textContent = t('phone.audio.unavailable');
    }
  }

  function trainTranscript() {
    const block = element('div', 'story-phone__recording');
    const note = element('p', 'story-phone__note', t('phone.recording.note'));
    note.setAttribute('role', 'status');
    const sound = action('phone.audio.play', () => void playTrain(sound, note));
    sound.setAttribute('aria-pressed', 'false');
    block.append(
      artwork('train'),
      element('p', 'story-phone__source', t('phone.source.transcript')),
      element('p', 'story-phone__cue', t('phone.recording.cue')),
      element('blockquote', 'story-phone__quote', t('phone.recording.line')),
      element('p', 'story-phone__sender', t('phone.recording.speaker')),
      sound,
      note,
    );
    return block;
  }

  function focusLatest(node) {
    node.tabIndex = -1;
    node.focus({ preventScroll: true });
    pane.scrollTop += node.getBoundingClientRect().top - pane.getBoundingClientRect().top - 12;
  }

  function advanceReply(id) {
    if (replay) {
      const next = selectPrologueReply(replay.replies, id);
      if (next === replay.replies) return;
      replay.replies = next;
    } else if (!ctx.story.recordPrologueReply(id)) return;
    render(true);
  }

  function openRecording() {
    if (replay) replay.recordingRead = true;
    else if (!ctx.story.acknowledgePrologueRecording()) return;
    render(true);
  }

  function finishPrologue() {
    const story = snapshot();
    if (story.beat !== 'prologue' || !story.flags[prologueRecordingReadFlag]) return;
    close();
    ctx.story.signal('prologue:complete');
  }

  function endReplay() {
    replay = null;
    render(true);
  }

  function renderConversation(replies, recordingRead, moveFocus) {
    const thread = transcript(replies);
    pane.append(intro(Boolean(replay), true), thread);
    const turn = prologueTurns[replies.length];
    if (turn) {
      actions.append(element('p', 'story-phone__reply-label', t('phone.reply')));
      for (const reply of turn.replies) actions.append(action(reply.textKey, () => advanceReply(reply.id)));
    } else if (recordingRead) {
      thread.append(trainTranscript());
      if (!replay) actions.append(action('phone.depart', finishPrologue, 'story-phone__action--primary', 'next'));
    } else {
      actions.append(action('phone.openRecording', openRecording, 'story-phone__action--primary', 'next'));
    }
    if (replay) actions.append(action('phone.finishReplay', endReplay, 'story-phone__action--full'));
    const latest = thread.lastElementChild;
    const newMessage = latest.querySelector('.story-phone__message--incoming') ?? latest;
    if (moveFocus) focusLatest(newMessage);
    else if (replies.length) pane.scrollTop = pane.scrollHeight;
  }

  function renderArchive(story, replies, moveFocus) {
    const archive = element('section', 'story-phone__archive');
    const heading = element('h3', 'story-phone__section-title', t('phone.archived'));
    const fullHistory = replies.length === prologueTurns.length;
    archive.append(
      heading,
      element('p', 'story-phone__context', t(fullHistory ? 'phone.archiveBody' : 'phone.archiveLegacy')),
    );
    const savedReplies = fullHistory ? replies : readPrologueReplies(story.choices, { fallbackToScript: true });
    const thread = transcript(savedReplies, 'phone.archivedDate');
    if (story.evidence.includes('train-recording')) thread.append(trainTranscript());
    pane.append(archive, thread);
    actions.append(action('phone.replay', () => {
      replay = { replies: [], recordingRead: false };
      render(true);
    }, '', 'next'));
    if (moveFocus) focusLatest(heading);
  }

  function finishDiary() {
    if (!canReadReturnDiary(snapshot(), selectedRecord)) return;
    close();
    ctx.story.signal('return:read');
  }

  function renderRecord(record, story, moveFocus) {
    const article = element('article', 'story-phone__record');
    const heading = element('h3', 'story-phone__section-title', t(record.titleKey));
    const back = action('phone.record.back', () => {
      selectedRecord = null;
      render(true);
    }, 'story-phone__action--back', 'back');
    article.append(back, heading);
    if (record.art === 'train') {
      article.append(trainTranscript());
    } else {
      article.append(element('p', 'story-phone__source', t(record.sourceKey)));
      if (record.art === 'stupa') article.append(restorationStill());
      else if (record.art !== 'diary') article.append(artwork(record.art));
      article.append(element('p', 'story-phone__context', t(record.bodyKey)));
      if (record.textKey) article.append(element('blockquote', 'story-phone__paper', t(record.textKey)));
      if (record.clipId) article.append(action('phone.record.playMemory', () => {
        close();
        ctx.documentary.play(record.clipId);
      }));
      if (record.id === 'restoration-record' && story.clipsSeen.includes('restoration')
        && story.beat !== 'restoration') {
        article.append(action('phone.record.replayClip', () => {
          close();
          ctx.story.playClip('restoration');
        }, '', 'next'));
      }
      if (canReadReturnDiary(story, record.id)) {
        article.append(action('phone.record.readDiary', finishDiary, 'story-phone__action--primary', 'next'));
      }
    }
    pane.append(article);
    if (moveFocus) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }

  function renderLibrary(story, moveFocus) {
    const records = visiblePhoneRecords(story, tab);
    const selected = records.find(({ id }) => id === selectedRecord);
    if (selected) {
      renderRecord(selected, story, moveFocus);
      return;
    }

    const heading = element('h3', 'story-phone__section-title', t(`phone.${tab}`));
    pane.append(element('p', 'story-phone__eyebrow', t('phone.offline')), heading);
    if (!records.length) pane.append(element('p', 'story-phone__context', t(`phone.empty.${tab}`)));
    for (const record of records) {
      const card = action(record.titleKey, () => {
        selectedRecord = record.id;
        render(true);
      }, 'story-phone__record-link', 'next');
      const label = element('span', 'story-phone__record-label', t(record.titleKey));
      label.append(element('span', 'story-phone__source', t(record.sourceKey)));
      card.replaceChildren(artwork(record.art), label, icon('next'));
      pane.append(card);
    }
    if (moveFocus) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }

  function threadSnapshot() {
    return threadSession?.snapshot ?? snapshot();
  }

  function finishThread() {
    const callback = handover || threadSession?.threadId === selectedThread ? threadSession?.onComplete : undefined;
    close();
    callback?.();
  }

  function renderThread(moveFocus) {
    const thread = phoneThreads.find(entry => entry.id === selectedThread);
    if (!thread) return;
    const story = threadSnapshot();
    const replies = readThreadReplies(story, thread.id);
    const heading = element('h3', 'story-phone__section-title', t(thread.titleKey));
    pane.append(action('phone.thread.back', () => {
      selectedThread = null;
      render(true);
    }, 'story-phone__action--back'), heading);
    const content = element('div', 'story-phone__thread');
    for (const turn of replies) {
      content.append(message(turn.replyKey, 'phone.player', 'outgoing'));
      for (const key of turn.messages) content.append(message(key, 'phone.proxy', 'incoming'));
    }
    pane.append(content);
    const next = thread.turns[replies.length];
    const completed = Boolean(snapshot().journey?.chapters?.finale?.choices?.decision);
    if (next && (!completed || threadSession?.snapshot)) {
      actions.append(action(next.replyKey, () => {
        if (threadSession?.snapshot) {
          threadSession.snapshot.choices[phoneReplyKey(thread.id, next.id)] = next.id;
        } else if (!ctx.story.recordPhoneReply(thread.id, next.id)) {
          actions.append(element('p', 'story-phone__note', t('phone.savedError')));
          return;
        }
        render(true);
      }, 'story-phone__action--primary'));
    } else {
      if (thread.id === 'mangyul') pane.append(element('p', 'story-phone__note', t('phone.thread.interrupted')));
      if (thread.id === 'mangyul-snow') pane.append(element('p', 'story-phone__note', t('phone.signal.sending')));
      if (thread.id === 'samye') pane.append(element('p', 'story-phone__note', t('phone.thread.silence')));
      actions.append(action('phone.thread.finish', () => {
        if (!threadSession?.snapshot && replies.length === thread.turns.length
          && !snapshot().flags?.[`phone.read.${thread.id}`]
          && !ctx.story.acknowledgePhoneThread(thread.id)) {
          actions.append(element('p', 'story-phone__note', t('phone.savedError')));
          return;
        }
        finishThread();
      }, 'story-phone__action--primary'));
    }
    if (moveFocus) focusLatest(content.lastElementChild ?? heading);
  }

  function renderThreads(story, moveFocus) {
    const available = visiblePhoneThreads(story);
    const unread = new Set(unreadPhoneThreads(story).map(thread => thread.id));
    const heading = element('h3', 'story-phone__section-title', t('phone.messages'));
    pane.append(heading);
    for (const thread of available) {
      const button = action(thread.titleKey, () => {
        selectedThread = thread.id;
        render(true);
      }, 'story-phone__record-link');
      if (unread.has(thread.id)) {
        button.classList.add('story-phone__tab--unread');
        button.setAttribute('aria-label', `${t(thread.titleKey)} · ${i18n.t('phone.unread', { count: 1 })}`);
      }
      pane.append(button);
    }
    // The original prologue archive and its transient replay remain available.
    renderArchive(story, readPrologueReplies(story.choices), moveFocus);
  }

  function renderHandover() {
    const chapterState = ctx.chapters.getState();
    const checkpoint = chapterState.chapters.finale?.checkpointId;
    const decision = ctx.chapters.getChoices('finale').decision;
    const terminal = element('article', 'story-phone__terminal');
    terminal.append(element('h3', 'story-phone__section-title', t('phone.handover.title')));
    if (i18n.lang !== 'en') terminal.append(element('p', 'story-phone__note', i18n.getStrings().en['phone.handover.title']));
    if (!scanned && checkpoint === 'decision') {
      const code = element('div', 'story-phone__qr');
      code.innerHTML = HANDOVER_QR_SVG; // Fixed locally generated SVG, no user input.
      terminal.append(code, element('p', 'story-phone__context', t('phone.handover.code')));
      actions.append(action('phone.handover.scan', () => { scanned = true; render(true); }, 'story-phone__action--primary'));
    } else {
      for (const key of ['arrived', 'stone', 'letter']) terminal.append(element('p', 'story-phone__check', t(`phone.handover.${key}`)));
      if (checkpoint === 'decision') {
        terminal.append(element('p', 'story-phone__context', t('phone.handover.confirm')));
        for (const choice of ['end', 'retain']) actions.append(action(`phone.handover.${choice}`, () => {
          if (ctx.chapters.signal('proxy:decide', { checkpointId: 'decision', choice })) return;
          terminal.append(element('p', 'story-phone__note', t('phone.savedError')));
        }));
      } else if (decision) {
        terminal.append(element('p', 'story-phone__paper', t(`phone.handover.${decision}Reply`)),
          element('p', 'story-phone__account', t(decision === 'end' ? 'phone.handover.disabled' : 'phone.handover.archived')));
        actions.append(action('phone.thread.finish', finishThread, 'story-phone__action--primary'));
      }
    }
    pane.append(terminal);
  }

  function render(moveFocus = false) {
    stopAudio();
    const story = snapshot();
    const replies = replay?.replies ?? readPrologueReplies(story.choices);
    const conversation = story.beat === 'prologue' || replay;
    const showScene = conversation && tab === 'messages';
    stage.classList.toggle('story-phone__stage--prologue', showScene);
    scene.hidden = !showScene;
    scene.replaceChildren(intro(Boolean(replay)), element('p', 'story-phone__edition', t('phone.edition')));
    status.textContent = t(`phone.signal.${handover && ctx.chapters.getChoices('finale').decision ? 'completed' : phoneSignal(threadSnapshot(), selectedThread)}`);
    status.setAttribute('role', 'status');
    handset.classList.toggle('story-phone__handset--terminal', handover);
    title.textContent = t('phone.title');
    closeButton.setAttribute('aria-label', t('phone.close'));
    nav.setAttribute('aria-label', t('phone.sections'));
    pane.setAttribute('aria-label', t(`phone.${tab}`));
    for (const [id, { button, label }] of tabButtons) {
      label.textContent = t(`phone.${id}`);
      if (id === tab) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      button.classList.toggle('story-phone__tab--unread', id === 'diary' && canReadReturnDiary(story, 'new-diary')
        || id === 'messages' && unreadPhoneThreads(story).length > 0);
    }
    pane.replaceChildren();
    pane.scrollTop = 0;
    actions.replaceChildren();
    if (handover) renderHandover();
    else if (tab !== 'messages') renderLibrary(story, moveFocus);
    else if (selectedThread) renderThread(moveFocus);
    else if (conversation) {
      const recordingRead = replay?.recordingRead ?? story.flags[prologueRecordingReadFlag];
      renderConversation(replies, recordingRead, moveFocus);
    } else renderThreads(story, moveFocus);
  }

  function switchTab(requestedTab) {
    tab = tabs.includes(requestedTab) ? requestedTab : 'messages';
    const story = snapshot();
    selectedRecord = tab === 'diary' && canReadReturnDiary(story, 'new-diary') ? 'new-diary' : null;
    render();
  }

  function open(requestedTab = 'messages', options = {}) {
    if (disposed || (!modal.open && state.uiOpen)) return;
    selectedThread = options.threadId ?? null;
    handover = options.handover === true;
    scanned = options.scanned === true;
    threadSession = { threadId: selectedThread, onComplete: options.onComplete };
    if (options.transient) {
      threadSession.snapshot = snapshot();
      threadSession.snapshot.choices = {};
      const chapterState = ctx.chapters.getState();
      threadSession.snapshot.journey = {
        activeChapterId: chapterState.activeChapterId,
        chapters: { ...threadSession.snapshot.journey.chapters, ...chapterState.chapters },
      };
    }
    const opening = !modal.open;
    if (opening) {
      opener = document.activeElement;
      title.textContent = t('phone.title');
      closeButton.setAttribute('aria-label', t('phone.close'));
      modal.showModal();
      state.uiOpen = true;
    }
    switchTab(requestedTab);
    if (opening) closeButton.focus();
    bus.emit('story:phone-open', { tab });
  }

  function release() {
    stopAudio();
    replay = null;
    selectedThread = null;
    threadSession = null;
    handover = false;
    state.uiOpen = Boolean(ctx.documentary?.isOpen() || ctx.memory?.isOpen());
    const target = opener;
    opener = null;
    if (!state.uiOpen && target?.isConnected) target.focus();
  }

  function close() {
    if (!modal.open) return;
    modal.close();
    release();
  }

  modal.addEventListener('close', () => {
    if (opener && !modal.open) release();
  });
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  modal.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key !== 'Tab') return;
    const controls = [...modal.querySelectorAll('button, [tabindex="0"]')];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function refresh() {
    if (!modal.open) return;
    const active = document.activeElement;
    render();
    if (!active.isConnected) pane.focus({ preventScroll: true });
  }

  const unsubscribers = [
    bus.on('story:evidence', refresh),
    bus.on('story:chapter-change', refresh),
    bus.on('story:beat-start', () => {
      replay = null;
      refresh();
    }),
    i18n.onChange(refresh),
  ];

  return {
    open, close,
    isOpen: () => modal.open,
    update() {},
    dispose() {
      if (disposed) return;
      disposed = true;
      close();
      for (const unsubscribe of unsubscribers) unsubscribe();
      modal.remove();
    },
  };
}
