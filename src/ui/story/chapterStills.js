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

export function createChapterStill(bodyKey, t, { src } = {}) {
  const spec = getChapterStill(bodyKey);
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
  return {
    element: figure,
    dispose() {
      if (disposed) return;
      disposed = true;
      image.removeEventListener('error', fail);
      image.removeAttribute('src');
      figure.remove();
    },
  };
}
