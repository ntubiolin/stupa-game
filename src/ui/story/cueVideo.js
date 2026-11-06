// The documentary owns cue timing. This adapter only controls the active media.
export function createCueVideo(node, src, { onReady, onProgress, onFailure }) {
  const listeners = new AbortController();
  const { signal } = listeners;
  let pending;
  let request = 0;
  let playing = false;
  let hasPlayed = false;
  let seeking = false;
  let disposed = false;
  let lastProgress = -1;

  function clearStartup() {
    clearTimeout(pending);
    pending = undefined;
  }

  function fail() {
    if (!disposed) onFailure();
  }

  function updateProgress() {
    if (Number.isFinite(node.currentTime)) {
      if (playing && hasPlayed && !seeking && !node.seeking && node.currentTime > lastProgress) clearStartup();
      lastProgress = node.currentTime;
    }
    if (Number.isFinite(node.duration) && node.duration > 0) {
      onProgress(node.currentTime, node.duration);
    }
  }

  node.addEventListener('playing', () => {
    if (!playing) return;
    hasPlayed = true;
    clearStartup();
    onReady();
    updateProgress();
  }, { signal });
  node.addEventListener('timeupdate', updateProgress, { signal });
  node.addEventListener('ended', clearStartup, { signal });
  node.addEventListener('seeked', () => { seeking = false; }, { signal });
  node.addEventListener('error', fail, { signal });
  function waitForBuffer() {
    if (!playing || !hasPlayed || seeking || node.seeking || node.ended || pending !== undefined) return;
    // Brief buffer/renderer pressure is recoverable. Do not discard a paused clip.
    pending = setTimeout(fail, 2500);
  }
  for (const event of ['stalled', 'waiting']) node.addEventListener(event, waitForBuffer, { signal });

  node.preload = 'none';
  node.muted = true;
  node.defaultMuted = true;
  node.playsInline = true;
  node.disablePictureInPicture = true;
  node.setAttribute('aria-hidden', 'true');
  node.src = src;

  function play() {
    if (disposed || node.ended) return;
    const attempt = ++request;
    playing = true;
    clearStartup();
    pending = setTimeout(fail, 2500);
    try {
      Promise.resolve(node.play()).catch(() => {
        if (attempt === request) fail();
      });
    } catch {
      fail();
    }
  }

  function pause() {
    request++;
    playing = false;
    clearStartup();
    node.pause();
  }

  return {
    play, pause,
    seek(seconds) {
      if (disposed || !Number.isFinite(seconds) || !Number.isFinite(node.duration)) return;
      seeking = true;
      node.currentTime = Math.min(Math.max(0, seconds), node.duration);
      updateProgress();
      if (playing && node.paused) play();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.abort();
      pause();
      node.removeAttribute('src');
      node.load();
      node.remove();
    },
  };
}
