import { DOCUMENTARY_CLIPS } from '../../data/story/documentary.js';
import '../../i18n/storyDocumentary.js';
import '../../i18n/storyVideo.js';
import { createCueVideo } from './cueVideo.js';
import './documentary.css';

function element(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function controlButton(action) {
  const button = element('button');
  button.type = 'button';
  button.dataset.action = action;
  return button;
}

export function createDocumentary(ctx) {
  const { bus, i18n, state } = ctx;
  const t = (key, params) => i18n.t(`story.documentary.${key}`, params);
  let session = null;
  let image = null;
  let video = null;
  let disposed = false;

  const dialog = element('dialog', 'story-documentary');
  dialog.setAttribute('aria-labelledby', 'story-documentary-title');
  const title = element('h2');
  title.id = 'story-documentary-title';
  const still = element('div', 'story-documentary-still');
  const fallback = element('p', 'story-documentary-fallback');
  fallback.hidden = true;
  still.append(fallback);
  const provenance = element('p', 'story-documentary-provenance');
  const captions = element('div', 'story-documentary-captions');
  captions.setAttribute('aria-live', 'polite');
  captions.setAttribute('aria-atomic', 'true');
  const source = element('p', 'story-documentary-source');
  const caption = element('p', 'story-documentary-caption');
  captions.append(source, caption);
  const progress = element('p', 'story-documentary-progress');
  const controls = element('div', 'story-documentary-controls');
  const toggleButton = controlButton('toggle');
  toggleButton.autofocus = true;
  const replayButton = controlButton('replay');
  const skipButton = controlButton('skip');
  const closeButton = controlButton('close');
  const nextButton = controlButton('next');
  const motionButton = controlButton('motion');
  motionButton.hidden = true;
  const seek = element('input', 'story-documentary-seek');
  seek.type = 'range';
  seek.min = '0';
  seek.step = '0.1';
  seek.hidden = true;
  controls.append(toggleButton, replayButton, skipButton, closeButton, nextButton, motionButton, seek);
  dialog.append(title, still, provenance, captions, progress, controls);
  document.body.append(dialog);

  function preferStill() {
    const browser = globalThis.window;
    return browser?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      browser?.navigator?.connection?.saveData ||
      browser?.navigator?.mozConnection?.saveData ||
      browser?.navigator?.webkitConnection?.saveData;
  }

  function refreshLabels() {
    if (!session) return;
    const { clip, index, paused } = session;
    dialog.dataset.paused = String(paused);
    const cue = clip.cues[index];
    title.textContent = i18n.t(clip.titleKey);
    const nextSource = i18n.t(cue.sourceKey);
    const nextCaption = i18n.t(cue.subtitleKey);
    if (source.textContent !== nextSource) source.textContent = nextSource;
    if (caption.textContent !== nextCaption) caption.textContent = nextCaption;
    provenance.textContent = cue.provenanceKey ? i18n.t(cue.provenanceKey) : t(still.dataset.playing === 'true' ? 'visual.video'
      : cue.image || cue.video?.poster ? 'visual.generated' : 'visual.diagram');
    fallback.textContent = cue.fallbackKey ? i18n.t(cue.fallbackKey) : t('visual.missing');
    progress.textContent = t('progress', { current: index + 1, total: clip.cues.length });
    toggleButton.textContent = t(paused ? 'resume' : 'pause');
    replayButton.textContent = t('replay');
    skipButton.textContent = t('skip');
    closeButton.textContent = t('close');
    nextButton.textContent = t(index === clip.cues.length - 1 ? 'finish' : clip.cues.some(c => c.video) ? 'nextCue' : 'next');
    motionButton.hidden = !cue.video?.src || !session.staticDefault || Boolean(video) || session.videoFailed;
    motionButton.textContent = t('playMotion');
    seek.setAttribute('aria-label', t('seek'));
  }

  function clearImage() {
    image?.remove();
    image = null;
    fallback.hidden = true;
  }

  function showStill(src, poster) {
    if (image && image.dataset.primary === (src || '') && image.dataset.poster === (poster || '')) return;
    clearImage();
    if (!src && !poster) return;
    const nextImage = element('img');
    nextImage.alt = '';
    nextImage.decoding = 'async';
    nextImage.dataset.primary = src || '';
    nextImage.dataset.poster = poster || '';
    nextImage.addEventListener('error', () => {
      if (nextImage !== image) return;
      if (poster && nextImage.getAttribute('src') !== poster) {
        nextImage.src = poster;
        return;
      }
      nextImage.hidden = true;
      fallback.hidden = still.dataset.playing === 'true';
    });
    image = nextImage;
    still.prepend(image);
    image.src = src || poster;
  }

  function clearVideo() {
    video?.dispose();
    video = null;
    still.dataset.playing = 'false';
    seek.hidden = true;
  }

  function startVideo() {
    const cue = session?.clip.cues[session.index];
    if (!cue?.video?.src || session.videoFailed || video) return;
    const node = element('video');
    still.append(node);
    video = createCueVideo(node, cue.video.src, {
      onReady() {
        still.dataset.playing = 'true';
        fallback.hidden = true;
        refreshLabels();
      },
      onProgress(seconds, duration) {
        seek.max = String(duration);
        seek.value = String(seconds);
        seek.hidden = still.dataset.playing !== 'true';
      },
      onFailure() {
        session.videoFailed = true;
        clearVideo();
        fallback.hidden = Boolean(image && !image.hidden);
        refreshLabels();
      },
    });
    video.play();
    refreshLabels();
  }

  function renderCue() {
    const cue = session.clip.cues[session.index];
    clearVideo();
    session.videoFailed = false;
    session.staticDefault = Boolean(preferStill());
    still.dataset.frame = cue.frame;
    still.dataset.video = String(Boolean(cue.video?.src));
    showStill(cue.image, cue.video?.poster);
    if ((cue.video?.src || cue.fallbackKey) && !image) fallback.hidden = false;
    if (dialog.open && !session.paused && !session.staticDefault) startVideo();
    refreshLabels();
  }

  function play(id) {
    if (disposed || session || state.uiOpen || !Object.hasOwn(DOCUMENTARY_CLIPS, id)) return false;
    session = { id, clip: DOCUMENTARY_CLIPS[id], index: 0, elapsed: 0, paused: false };
    state.uiOpen = true;
    renderCue();
    dialog.showModal();
    if (!session.staticDefault) startVideo();
    return true;
  }

  function pause() {
    if (!session || session.paused) return false;
    session.paused = true;
    video?.pause();
    refreshLabels();
    return true;
  }

  function resume() {
    if (!session?.paused) return false;
    session.paused = false;
    if (video) video.play();
    else if (!session.staticDefault) startVideo();
    refreshLabels();
    return true;
  }

  function replay() {
    if (!session) return;
    Object.assign(session, { index: 0, elapsed: 0, paused: false });
    clearImage();
    renderCue();
  }

  function finish(reason) {
    if (!session) return false;
    const { id } = session;
    session = null;
    clearVideo();
    clearImage();
    state.uiOpen = false;
    dialog.close();
    bus.emit('story:clip-end', { id, reason });
    return true;
  }

  const skip = () => finish('skip');
  const close = () => finish('cancel');

  function advance(elapsed = 0) {
    if (!session) return;
    const { cues } = session.clip;
    let index = session.index + 1;
    while (index < cues.length && elapsed >= cues[index].duration) {
      elapsed -= cues[index].duration;
      index += 1;
    }
    if (index === cues.length) {
      finish('complete');
      return;
    }
    session.index = index;
    session.elapsed = elapsed;
    renderCue();
  }

  function update(dt) {
    if (!session || session.paused || !Number.isFinite(dt) || dt <= 0) return;
    session.elapsed += dt;
    const { duration } = session.clip.cues[session.index];
    if (session.elapsed >= duration) advance(session.elapsed - duration);
  }

  toggleButton.addEventListener('click', () => (session?.paused ? resume() : pause()));
  replayButton.addEventListener('click', replay);
  skipButton.addEventListener('click', skip);
  closeButton.addEventListener('click', close);
  nextButton.addEventListener('click', () => advance());
  motionButton.addEventListener('click', () => {
    if (!session || motionButton.hidden) return;
    session.paused = false;
    startVideo();
  });
  seek.addEventListener('input', () => video?.seek(Number(seek.value)));
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  const offClip = bus.on('story:clip-play', payload => {
    const id = payload?.id;
    if (!play(id) && !session && Object.hasOwn(DOCUMENTARY_CLIPS, id)) {
      bus.emit('story:clip-end', { id, reason: 'cancel' });
    }
  });
  const offLang = i18n.onChange(refreshLabels);

  function dispose() {
    if (disposed) return;
    disposed = true;
    offClip();
    offLang();
    close();
    dialog.remove();
  }

  const api = { play, pause, resume, skip, close, isOpen: () => Boolean(session), update, dispose };
  ctx.documentary = api;
  return api;
}
