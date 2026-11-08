import { MuralScrollCanvas, getChapterMural } from '../mural/scroll.js';

/** Optional approved 16:9 chapter card illustrations (#114). No gameplay or save effects. */
export const CHAPTER_STILLS = Object.freeze({
  'chapter.yarlung.calm.body': Object.freeze({
    id: '01-yarlung-yak-held',
    src: '/story/chapters/01-yarlung-yak-held.webp',
    width: 1920,
    height: 1080,
    key: 'chapter.still.yarlungHeld',
  }),
  'chapter.yarlung.release.body': Object.freeze({
    id: '02-yarlung-yak-released',
    src: '/story/chapters/02-yarlung-yak-released.webp',
    width: 1920,
    height: 1080,
    key: 'chapter.still.yarlungReleased',
  }),
  'chapter.chimphu.cave.body': Object.freeze({
    id: '03-chimphu-cave',
    src: '/story/chapters/03-chimphu-cave.webp',
    width: 1920,
    height: 1080,
    key: 'chapter.still.chimphuCave',
  }),
  'chapter.chimphu.records.body': Object.freeze({
    id: '04-chimphu-custody',
    src: '/story/chapters/04-chimphu-custody.webp',
    width: 1920,
    height: 1080,
    key: 'chapter.still.chimphuCustody',
  }),
  'chapter.mangyul.crossing.body': Object.freeze({
    id: '05-mangyul-twelve-altars',
    src: '/story/chapters/05-mangyul-twelve-altars.webp',
    width: 1920,
    height: 1080,
    key: 'chapter.still.mangyulAltars',
  }),
  'chapter.samye.intro': Object.freeze({
    id: '06-samye-unfinished',
    src: '/story/chapters/06-samye-unfinished.webp',
    width: 1920,
    height: 1080,
    key: 'chapter.still.samyeUnfinished',
  }),
  'chapter.samye.rebuild.body': Object.freeze({
    id: '07-samye-night-disassembled',
    src: '/story/chapters/07-samye-night-disassembled.webp',
    width: 1920,
    height: 1080,
    key: 'chapter.still.samyeNight',
  }),
  'chapter.samye.hepori.body': Object.freeze({
    id: '08-samye-morning-restored',
    src: '/story/chapters/08-samye-morning-restored.webp',
    width: 1920,
    height: 1080,
    key: 'chapter.still.samyeMorning',
  }),
  'chapter.finale.lampPrayer.body': Object.freeze({
    id: '09-finale-butter-lamp',
    src: '/story/chapters/09-finale-butter-lamp.webp',
    width: 1920,
    height: 1080,
    key: 'chapter.still.finaleLamp',
  }),
});

export function getChapterStill(bodyKey) {
  return Object.hasOwn(CHAPTER_STILLS, bodyKey) ? CHAPTER_STILLS[bodyKey] : null;
}

function drawSamyeNightPhotoFrame(canvas, time = 0) {
  const g = canvas?.getContext?.('2d');
  if (!g) return;
  const w = canvas.width || 640;
  const h = canvas.height || 360;

  g.save?.();
  // 1. Deep late-night studio backdrop
  const bg = g.createLinearGradient?.(0, 0, 0, h);
  if (bg) {
    bg.addColorStop(0, '#0b1420');
    bg.addColorStop(0.65, '#162332');
    bg.addColorStop(1, '#1c1815');
    g.fillStyle = bg;
  } else {
    g.fillStyle = '#111b27';
  }
  g.fillRect?.(0, 0, w, h);

  // Night window with stars in upper right
  g.fillStyle = '#08101c';
  g.fillRect?.(440, 22, 160, 118);
  g.strokeStyle = '#2c3d4f';
  g.lineWidth = 3;
  g.strokeRect?.(440, 22, 160, 118);
  g.fillStyle = 'rgba(255, 241, 196, 0.75)';
  for (let i = 0; i < 12; i++) {
    const sx = 454 + ((i * 37) % 134);
    const sy = 34 + ((i * 29) % 92);
    g.beginPath?.();
    g.arc?.(sx, sy, (i % 3 === 0 ? 1.6 : 1.0), 0, Math.PI * 2);
    g.fill?.();
  }

  // 2. Desk surface
  g.fillStyle = '#2d2118';
  g.fillRect?.(0, 256, w, h - 256);

  // 3. Warm architect desk lamp on left casting amber cone of light
  const lampX = 104, lampY = 112;
  const cone = g.createRadialGradient?.(lampX + 26, lampY + 14, 10, lampX + 90, 250, 240);
  if (cone) {
    cone.addColorStop(0, 'rgba(255, 219, 138, 0.46)');
    cone.addColorStop(0.55, 'rgba(238, 169, 78, 0.18)');
    cone.addColorStop(1, 'rgba(238, 169, 78, 0)');
    g.fillStyle = cone;
    g.beginPath?.();
    g.moveTo?.(lampX + 18, lampY + 8);
    g.lineTo?.(36, 265);
    g.lineTo?.(360, 265);
    g.closePath?.();
    g.fill?.();
  }
  g.strokeStyle = '#736557';
  g.lineWidth = 4;
  g.beginPath?.();
  g.moveTo?.(68, 256);
  g.lineTo?.(54, 168);
  g.lineTo?.(lampX, lampY);
  g.stroke?.();
  g.fillStyle = '#d49b4b';
  g.beginPath?.();
  g.arc?.(lampX + 10, lampY + 4, 18, Math.PI * 0.85, Math.PI * 1.95);
  g.fill?.();

  // 4. Glowing monitor with scrolling code lines (bug fixed before dawn)
  const monX = 168, monY = 116, monW = 196, monH = 118;
  g.fillStyle = '#1b2631';
  g.fillRect?.(monX - 6, monY - 6, monW + 12, monH + 12);
  g.fillStyle = '#0e1c26';
  g.fillRect?.(monX, monY, monW, monH);
  g.fillRect?.(monX + 82, monY + monH + 6, 32, 18);
  g.fillRect?.(monX + 58, 252, 80, 6);

  const scrollOffset = Math.floor(time * 2.5);
  for (let row = 0; row < 8; row++) {
    const lineIdx = (row + scrollOffset) % 10;
    const indent = (lineIdx % 3) * 12;
    const len = 42 + ((lineIdx * 29) % 96);
    g.fillStyle = row === 6 ? '#6bcf97' : row % 3 === 0 ? '#7fb4e8' : '#e6c17a';
    g.fillRect?.(monX + 14 + indent, monY + 14 + row * 12, Math.min(len, monW - 28 - indent), 5);
  }

  // 5. Warm mug of tea on desk with rising steam wisps
  const mugX = 118, mugY = 232;
  g.fillStyle = '#d9cbb8';
  g.fillRect?.(mugX, mugY, 22, 24);
  g.strokeStyle = 'rgba(255, 244, 224, 0.45)';
  g.lineWidth = 1.6;
  for (let s = 0; s < 2; s++) {
    const drift = Math.sin(time * 2.1 + s * 1.6) * 4;
    g.beginPath?.();
    g.moveTo?.(mugX + 7 + s * 8, mugY - 3);
    g.quadraticCurveTo?.(mugX + 5 + s * 8 + drift, mugY - 14, mugX + 9 + s * 8 - drift * 0.5, mugY - 25);
    g.stroke?.();
  }

  // 6. Yingzhen's silhouette sleeping peacefully against chair back with a coat over her shoulders
  const breath = Math.sin(time * 1.6) * 1.8;
  const chairX = 446, chairY = 148;
  // High chair back
  g.fillStyle = '#1c2430';
  g.beginPath?.();
  g.moveTo?.(chairX + 18, 340);
  g.lineTo?.(chairX + 38, chairY - 10);
  g.lineTo?.(chairX + 86, chairY - 4);
  g.lineTo?.(chairX + 72, 340);
  g.closePath?.();
  g.fill?.();

  // Sleeping head tilted gently back/sideways
  g.fillStyle = '#251a14';
  g.beginPath?.();
  g.arc?.(chairX + 16, chairY + 18 + breath * 0.4, 26, 0, Math.PI * 2);
  g.fill?.();

  // Warm rim light on forehead/short hair from monitor & lamp
  g.strokeStyle = 'rgba(246, 200, 122, 0.7)';
  g.lineWidth = 2.2;
  g.beginPath?.();
  g.arc?.(chairX + 14, chairY + 18 + breath * 0.4, 26, Math.PI * 0.75, Math.PI * 1.48);
  g.stroke?.();

  // Coat draped warmly over her shoulders
  g.fillStyle = '#3b2b20';
  g.beginPath?.();
  g.moveTo?.(chairX - 42, 340);
  g.quadraticCurveTo?.(chairX - 30, chairY + 46 + breath, chairX + 18, chairY + 42 + breath);
  g.quadraticCurveTo?.(chairX + 64, chairY + 48 + breath, chairX + 58, 340);
  g.closePath?.();
  g.fill?.();

  // Coat collar highlight
  g.strokeStyle = 'rgba(242, 193, 118, 0.42)';
  g.lineWidth = 1.8;
  g.beginPath?.();
  g.moveTo?.(chairX - 24, chairY + 62 + breath);
  g.quadraticCurveTo?.(chairX + 4, chairY + 44 + breath, chairX + 32, chairY + 68 + breath);
  g.stroke?.();

  g.restore?.();
}

function createSamyePhotoCanvasStill(t = key => key) {
  const figure = document.createElement('figure');
  figure.className = 'story-chapter-still story-chapter-still--canvas';
  figure.dataset.still = 'samye-photo-memory';
  const canvas = document.createElement('canvas');
  canvas.className = 'story-still__canvas';
  canvas.width = 640;
  canvas.height = 360;
  canvas.dataset.testid = 'story-still-canvas';
  canvas.setAttribute?.('data-testid', 'story-still-canvas');
  const caption = document.createElement('figcaption');
  caption.textContent = typeof t === 'function' ? t('chapter.samye.photo.title') : '';
  figure.append(canvas, caption);

  let disposed = false;
  let elapsed = 0;
  let raf = null;
  drawSamyeNightPhotoFrame(canvas, elapsed);

  const reduced = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (!reduced && typeof globalThis.window?.requestAnimationFrame === 'function') {
    const tick = () => {
      if (disposed) return;
      elapsed += 0.016;
      drawSamyeNightPhotoFrame(canvas, elapsed);
      raf = globalThis.window.requestAnimationFrame(tick);
    };
    raf = globalThis.window.requestAnimationFrame(tick);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (raf && typeof globalThis.window?.cancelAnimationFrame === 'function') {
      globalThis.window.cancelAnimationFrame(raf);
    }
    raf = null;
    figure.remove();
  }

  const result = { element: figure, dispose };
  Object.defineProperty(result, 'canvas', { value: canvas });
  Object.defineProperty(result, 'destroy', { value: dispose });
  Object.defineProperty(result, 'update', {
    value(dt = 0.016) {
      if (disposed) return;
      elapsed += dt;
      drawSamyeNightPhotoFrame(canvas, elapsed);
    },
  });
  return result;
}

const MURAL_CHAPTER_IDS = new Set(['pharping', 'mangyul', 'yarlung', 'samye', 'chimphu', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5']);

export function createStoryMuralScroll(chapterId, kind = 'intro', ctx = null) {
  if (!chapterId || !MURAL_CHAPTER_IDS.has(String(chapterId).toLowerCase())) return null;
  const muralDef = getChapterMural(chapterId);
  if (!muralDef) return null;

  const figure = document.createElement('figure');
  figure.className = 'story-mural-banner';
  figure.dataset.chapter = String(chapterId);
  figure.dataset.kind = kind;

  const canvas = document.createElement('canvas');
  canvas.className = 'story-mural-scroll';
  canvas.width = 640;
  canvas.height = 200;
  canvas.dataset.testid = 'story-mural-scroll';
  canvas.setAttribute?.('data-testid', 'story-mural-scroll');
  if (typeof canvas.getContext !== 'function') {
    canvas.getContext = () => null;
  }
  figure.append(canvas);

  const scroll = new MuralScrollCanvas(canvas, { ctx, chapterId });
  let disposed = false;

  function playSketchTour() {
    if (disposed) return;
    const states = {};
    for (let i = 0; i < (muralDef.episodes?.length || 0); i++) {
      const qId = muralDef.episodes[i].questId;
      states[qId] = i === 0 ? 'active' : 'sketch';
    }
    scroll.setOverrideStates(states);
    scroll.startPanTour();
    scroll.draw();
  }

  function playCompletionReveal() {
    if (disposed) return;
    const states = {};
    const episodes = muralDef.episodes || [];
    for (const ep of episodes) {
      states[ep.questId] = 'painted';
    }
    scroll.setOverrideStates(states);
    const lastEp = episodes[episodes.length - 1];
    if (lastEp?.questId) {
      scroll.playColoringReveal(lastEp.questId, { duration: 2.2, immediateFocus: false });
    }
    scroll.draw();
  }

  if (kind === 'complete') playCompletionReveal();
  else playSketchTour();

  const reduced = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (!reduced && typeof globalThis.requestAnimationFrame === 'function') {
    scroll.start();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    scroll.stop();
    figure.remove();
  }

  return {
    element: figure,
    canvas,
    scroll,
    playSketchTour,
    playCompletionReveal,
    dispose,
    destroy: dispose,
  };
}

export function createChapterStill(bodyKey, t = key => key, { src } = {}) {
  const normalizedKey = typeof bodyKey === 'string' && bodyKey.startsWith('mirror.')
    ? bodyKey.slice('mirror.'.length)
    : bodyKey;
  if (normalizedKey === 'chapter.samye.photo.body') {
    return createSamyePhotoCanvasStill(t);
  }
  const spec = getChapterStill(normalizedKey) || getChapterStill(bodyKey);
  if (!spec) return null;
  const resolvedSrc = src === undefined ? spec.src : src;
  const figure = document.createElement('figure');
  figure.className = 'story-chapter-still';
  figure.dataset.still = spec.id;
  const image = document.createElement('img');
  image.width = spec.width;
  image.height = spec.height;
  image.alt = t(`${spec.key}.alt`);
  image.decoding = 'async';
  const fallback = document.createElement('p');
  fallback.className = 'story-chapter-still-fallback';
  fallback.textContent = t(`${spec.key}.fallback`);
  const caption = document.createElement('figcaption');
  caption.textContent = t(`${spec.key}.caption`);
  figure.append(image, fallback, caption);
  let disposed = false;
  function fail() {
    if (disposed) return;
    image.hidden = true;
    fallback.hidden = false;
  }
  image.addEventListener('error', fail);
  fallback.hidden = Boolean(resolvedSrc);
  image.hidden = !resolvedSrc;
  // Request the export only when its specific chapter card is actually rendered.
  if (resolvedSrc) image.src = resolvedSrc;
  const result = {
    element: figure,
    dispose() {
      if (disposed) return;
      disposed = true;
      image.removeEventListener('error', fail);
      image.removeAttribute('src');
      figure.remove();
    },
  };
  Object.defineProperty(result, 'destroy', { value: result.dispose });
  return result;
}
