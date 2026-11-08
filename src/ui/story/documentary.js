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
  let memoryCanvas = null;
  let memoryRaf = null;
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

  function clearCanvas() {
    if (memoryRaf && typeof globalThis.window?.cancelAnimationFrame === 'function') {
      globalThis.window.cancelAnimationFrame(memoryRaf);
    }
    memoryRaf = null;
    memoryCanvas?.remove();
    memoryCanvas = null;
  }

  function getClipElapsed() {
    if (!session) return 0;
    let total = session.elapsed || 0;
    for (let i = 0; i < session.index; i++) {
      total += session.clip.cues[i]?.duration || 0;
    }
    return total;
  }

  function drawMemoryFrame() {
    if (!memoryCanvas || !session) return;
    const g = memoryCanvas.getContext?.('2d');
    if (!g) return;
    const w = memoryCanvas.width || 640;
    const h = memoryCanvas.height || 360;
    const time = getClipElapsed();
    const cueIndex = session.index;

    g.save();
    // 1. Warm afternoon dormitory room backdrop
    const roomGrad = g.createLinearGradient?.(0, 0, w, h);
    if (roomGrad) {
      roomGrad.addColorStop(0, '#462c1c');
      roomGrad.addColorStop(0.55, '#6b4226');
      roomGrad.addColorStop(1, '#2b1b12');
      g.fillStyle = roomGrad;
    } else {
      g.fillStyle = '#462c1c';
    }
    g.fillRect?.(0, 0, w, h);

    // 2. Dormitory window frame on left with golden afternoon sky
    const winX = 56, winY = 28, winW = 210, winH = 235;
    const skyGrad = g.createLinearGradient?.(winX, winY, winX, winY + winH);
    if (skyGrad) {
      skyGrad.addColorStop(0, '#fff7dc');
      skyGrad.addColorStop(0.6, '#f7c873');
      skyGrad.addColorStop(1, '#e5954b');
      g.fillStyle = skyGrad;
    } else {
      g.fillStyle = '#f7c873';
    }
    g.fillRect?.(winX, winY, winW, winH);

    // Window muntins (panes)
    g.strokeStyle = '#3d2517';
    g.lineWidth = 5;
    g.strokeRect?.(winX, winY, winW, winH);
    g.beginPath?.();
    g.moveTo?.(winX + winW * 0.5, winY);
    g.lineTo?.(winX + winW * 0.5, winY + winH);
    g.moveTo?.(winX, winY + winH * 0.52);
    g.lineTo?.(winX + winW, winY + winH * 0.52);
    g.stroke?.();

    // 3. Golden afternoon sunbeams streaming diagonally across the dorm
    const beamGrad = g.createLinearGradient?.(winX + 40, winY + 20, w * 0.88, h);
    if (beamGrad) {
      beamGrad.addColorStop(0, 'rgba(255, 240, 190, 0.42)');
      beamGrad.addColorStop(0.55, 'rgba(247, 198, 112, 0.22)');
      beamGrad.addColorStop(1, 'rgba(247, 198, 112, 0)');
      g.fillStyle = beamGrad;
    } else {
      g.fillStyle = 'rgba(255, 240, 190, 0.28)';
    }
    g.beginPath?.();
    g.moveTo?.(winX + 12, winY + 10);
    g.lineTo?.(winX + winW, winY + 6);
    g.lineTo?.(w - 20, h);
    g.lineTo?.(160, h);
    g.closePath?.();
    g.fill?.();

    // 4. Gently swaying translucent curtains
    const sway = Math.sin(time * 1.45) * 14;
    g.fillStyle = 'rgba(255, 246, 224, 0.34)';
    g.beginPath?.();
    g.moveTo?.(winX - 8, winY);
    g.quadraticCurveTo?.(winX + 34 + sway, winY + winH * 0.5, winX + 18 + sway * 1.2, winY + winH + 18);
    g.lineTo?.(winX - 12, winY + winH + 18);
    g.closePath?.();
    g.fill?.();

    g.beginPath?.();
    g.moveTo?.(winX + winW + 8, winY);
    g.quadraticCurveTo?.(winX + winW - 28 + sway * 0.8, winY + winH * 0.5, winX + winW - 10 + sway, winY + winH + 18);
    g.lineTo?.(winX + winW + 12, winY + winH + 18);
    g.closePath?.();
    g.fill?.();

    // 5. Silhouette of Yingzhen with freshly cut short hair, turning & laughing
    const turnProgress = Math.min(1, Math.max(0, (time - 1.2) / 5.5));
    const laughBob = cueIndex >= 1 ? Math.sin(time * 5.2) * 2.2 : Math.sin(time * 2.1) * 1.0;
    const cx = 415 - turnProgress * 12;
    const cy = 172 + laughBob;

    // Warm golden rim-light halo around her short hair
    const haloGrad = g.createRadialGradient?.(cx - 8, cy - 18, 12, cx, cy, 88);
    if (haloGrad) {
      haloGrad.addColorStop(0, 'rgba(255, 232, 168, 0.55)');
      haloGrad.addColorStop(0.6, 'rgba(243, 182, 92, 0.18)');
      haloGrad.addColorStop(1, 'rgba(243, 182, 92, 0)');
      g.fillStyle = haloGrad;
      g.beginPath?.();
      g.arc?.(cx, cy - 10, 88, 0, Math.PI * 2);
      g.fill?.();
    }

    // Shoulders & dormitory cardigan silhouette
    g.fillStyle = '#2d1a11';
    g.beginPath?.();
    g.moveTo?.(cx - 64, h);
    g.quadraticCurveTo?.(cx - 58, cy + 52, cx - 22, cy + 44);
    g.lineTo?.(cx + 26, cy + 44);
    g.quadraticCurveTo?.(cx + 62, cy + 54, cx + 68, h);
    g.closePath?.();
    g.fill?.();

    // Neck & head with freshly cut short bob hair
    g.fillRect?.(cx - 10, cy + 20, 20, 28);
    g.beginPath?.();
    g.arc?.(cx, cy - 4, 34, 0, Math.PI * 2);
    g.fill?.();

    // Short cropped hair tips catching golden afternoon light
    g.strokeStyle = '#f5c77e';
    g.lineWidth = 2.6;
    g.beginPath?.();
    g.arc?.(cx - 2, cy - 6, 35, Math.PI * 0.72, Math.PI * 1.75);
    g.stroke?.();

    // Raised hand touching her freshly cut short hair near her ear (Cue 1 & 2)
    const handLift = Math.min(1, Math.max(0.15, (time - 2.0) / 4.0));
    const handX = cx - 30 - (1 - handLift) * 14;
    const handY = cy + 12 + (1 - handLift) * 42;
    g.strokeStyle = '#3a2216';
    g.lineWidth = 13;
    g.lineCap = 'round';
    g.beginPath?.();
    g.moveTo?.(cx - 44, cy + 78);
    g.quadraticCurveTo?.(cx - 56, cy + 44, handX, handY);
    g.stroke?.();

    // Bright warm smile line when she turns toward the camera
    if (turnProgress > 0.35) {
      g.strokeStyle = '#f7d8a8';
      g.lineWidth = 2.0;
      g.beginPath?.();
      g.arc?.(cx - 8, cy + 4, 9, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke?.();
    }

    // 6. Floating warm dust motes in the sunbeams
    g.fillStyle = 'rgba(255, 243, 198, 0.72)';
    for (let i = 0; i < 26; i++) {
      const mx = (90 + i * 21 + Math.sin(time * 0.7 + i * 1.3) * 18) % (w - 40);
      const my = (36 + ((i * 37 - time * 11) % (h - 60)) + (h - 60)) % (h - 60);
      const r = 1.2 + (i % 3) * 0.85;
      g.beginPath?.();
      g.arc?.(mx, my, r, 0, Math.PI * 2);
      g.fill?.();
    }

    // 7. Subtle 17-second handheld camera frame counter & warm vignette
    g.strokeStyle = 'rgba(255, 238, 205, 0.42)';
    g.lineWidth = 1.5;
    g.strokeRect?.(18, 16, w - 36, h - 32);

    g.fillStyle = 'rgba(255, 238, 205, 0.78)';
    g.font = '600 12px monospace';
    const sec = Math.min(17, Math.max(0, Math.floor(time)));
    const tc = `REC ● 00:${String(sec).padStart(2, '0')} / 00:17`;
    g.fillText?.(tc, 30, 36);

    g.restore();
  }

  function startMemoryCanvas() {
    if (memoryCanvas || !session) return;
    const cue = session.clip.cues[session.index];
    const isDormMemory = session.id === 'dorm-memory' || cue?.id === 'dorm-memory';
    const isFallbackCue = !cue?.image && !cue?.video?.src && Boolean(cue?.fallbackKey);
    if (!isDormMemory && !isFallbackCue) return;
    const node = element('canvas', 'story-documentary__canvas');
    node.width = 640;
    node.height = 360;
    node.dataset.testid = 'story-documentary-canvas';
    node.setAttribute('data-testid', 'story-documentary-canvas');
    node.setAttribute('aria-hidden', 'true');
    still.append(node);
    memoryCanvas = node;
    drawMemoryFrame();

    if (typeof globalThis.window?.requestAnimationFrame === 'function' && !session.staticDefault) {
      const tick = () => {
        if (!memoryCanvas || !session || disposed) return;
        if (!session.paused) drawMemoryFrame();
        memoryRaf = globalThis.window.requestAnimationFrame(tick);
      };
      memoryRaf = globalThis.window.requestAnimationFrame(tick);
    }
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
    clearCanvas();
    session.videoFailed = false;
    session.staticDefault = Boolean(preferStill());
    still.dataset.frame = cue.frame;
    still.dataset.video = String(Boolean(cue.video?.src));
    showStill(cue.image, cue.video?.poster);
    if ((cue.video?.src || cue.fallbackKey) && !image) fallback.hidden = false;
    startMemoryCanvas();
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
    clearCanvas();
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
    if (memoryCanvas) drawMemoryFrame();
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
    clearCanvas();
    dialog.remove();
  }

  const api = { play, pause, resume, skip, close, stop: close, isOpen: () => Boolean(session), update, dispose, destroy: dispose };
  ctx.documentary = api;
  return api;
}
