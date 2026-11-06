import { DOCUMENTARY_CLIPS } from '../../data/story/documentary.js';
import '../../i18n/storyDocumentary.js';
import './documentary.css';

function element(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function createDocumentary(ctx) {
  const { bus, i18n, state } = ctx;
  const t = (key, params) => i18n.t(`story.documentary.${key}`, params);
  let session = null;
  let image = null;
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
  const toggleButton = element('button');
  toggleButton.autofocus = true;
  const replayButton = element('button');
  const skipButton = element('button');
  const closeButton = element('button');
  controls.append(toggleButton, replayButton, skipButton, closeButton);
  dialog.append(title, still, provenance, captions, progress, controls);
  document.body.append(dialog);

  function refreshLabels() {
    if (!session) return;
    const { clip, index, paused } = session;
    const cue = clip.cues[index];
    title.textContent = i18n.t(clip.titleKey);
    source.textContent = i18n.t(cue.sourceKey);
    caption.textContent = i18n.t(cue.subtitleKey);
    provenance.textContent = t(cue.image ? 'visual.generated' : 'visual.diagram');
    fallback.textContent = t('visual.missing');
    progress.textContent = t('progress', { current: index + 1, total: clip.cues.length });
    toggleButton.textContent = t(paused ? 'resume' : 'pause');
    replayButton.textContent = t('replay');
    skipButton.textContent = t('skip');
    closeButton.textContent = t('close');
  }

  function clearImage() {
    image?.remove();
    image = null;
    fallback.hidden = true;
  }

  function renderCue() {
    const cue = session.clip.cues[session.index];
    still.dataset.frame = cue.frame;
    refreshLabels();
    if (image?.getAttribute('src') === cue.image) return;
    clearImage();
    if (!cue.image) return;

    const nextImage = element('img');
    nextImage.alt = '';
    nextImage.decoding = 'async';
    nextImage.addEventListener('error', () => {
      if (nextImage !== image) return;
      nextImage.hidden = true;
      fallback.hidden = false;
    }, { once: true });
    image = nextImage;
    still.prepend(image);
    image.src = cue.image;
  }

  function play(id) {
    if (disposed || session || state.uiOpen || !Object.hasOwn(DOCUMENTARY_CLIPS, id)) return false;
    session = { id, clip: DOCUMENTARY_CLIPS[id], index: 0, elapsed: 0, paused: false };
    state.uiOpen = true;
    renderCue();
    dialog.showModal();
    return true;
  }

  function pause() {
    if (!session || session.paused) return false;
    session.paused = true;
    toggleButton.textContent = t('resume');
    return true;
  }

  function resume() {
    if (!session?.paused) return false;
    session.paused = false;
    toggleButton.textContent = t('pause');
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
    clearImage();
    state.uiOpen = false;
    dialog.close();
    bus.emit('story:clip-end', { id, reason });
    return true;
  }

  const skip = () => finish('skip');
  const close = () => finish('cancel');

  function update(dt) {
    if (!session || session.paused || !Number.isFinite(dt) || dt <= 0) return;
    session.elapsed += dt;
    const cues = session.clip.cues;
    const previousIndex = session.index;
    while (session.elapsed >= cues[session.index].duration) {
      session.elapsed -= cues[session.index].duration;
      session.index += 1;
      if (session.index === cues.length) {
        finish('complete');
        return;
      }
    }
    if (session.index !== previousIndex) renderCue();
  }

  toggleButton.addEventListener('click', () => (session?.paused ? resume() : pause()));
  replayButton.addEventListener('click', replay);
  skipButton.addEventListener('click', skip);
  closeButton.addEventListener('click', close);
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
