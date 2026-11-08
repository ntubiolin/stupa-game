/** Optional illustration for the final, fixed Losang dialogue line. No gameplay effects. */
export const LOSANG_STILL = Object.freeze({
  src: '/story/losang-map-handoff.webp',
  width: 1664,
  height: 936,
});

export function createLosangStill(t, { src = LOSANG_STILL.src } = {}) {
  const figure = document.createElement('figure');
  figure.className = 'story-losang-still';
  const image = document.createElement('img');
  image.width = LOSANG_STILL.width;
  image.height = LOSANG_STILL.height;
  image.alt = t('losang.still.alt');
  image.decoding = 'async';
  const fallback = document.createElement('p');
  fallback.className = 'story-losang-still-fallback';
  fallback.textContent = t('losang.still.fallback');
  const caption = document.createElement('figcaption');
  caption.textContent = t('losang.still.caption');
  figure.append(image, fallback, caption);
  let disposed = false;
  function fail() {
    if (disposed) return;
    image.hidden = true;
    fallback.hidden = false;
  }
  image.addEventListener('error', fail);
  fallback.hidden = Boolean(src);
  image.hidden = !src;
  // Create/request the image only when its dialogue card is actually rendered.
  if (src) image.src = src;
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
