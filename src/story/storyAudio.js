/**
 * Chapter Mode Adaptive Music & Procedural Soundscape (`src/story/storyAudio.js`) — Issue #135
 *
 * Bridges Narrative / Chapter Mode (`src/story/runtime.js`) with the 432 Hz procedural
 * music engine (`src/systems/music.js` + `src/data/music.js`), adding:
 *   - Three-thread leitmotif score switching across Prologue beats and all 6 Chapters
 *   - Checkpoint-reactive dynamic transitions (Drought -> Rain, Blizzard -> Windhorse,
 *     Yak Unrest -> Guardian Calm, Samye Day -> Night -> Mandala, Chimphu -> Starlight Terma,
 *     Finale Intimate Letter -> Morning Kora & Single Lamp)
 *   - Multi-partial Tibetan singing bowl, phone crystalline chimes, stone/water/flag/lamp
 *     physical interaction cues, and automatic ducking during documentary clips.
 */
import { CONFIG } from '../config.js';
import { createMusicEngine } from '../systems/music.js';
import { MUSIC_TRACKS, MUSIC_STINGERS, keyOffset } from '../data/music.js';

const BEAT_AUDIO_MAP = Object.freeze({
  prologue: Object.freeze({ trackId: 'story.mirror', vars: Object.freeze({ night: true }), wind: 0.035, windFreq: 280, stinger: null }),
  arrival: Object.freeze({ trackId: 'stupa', vars: Object.freeze({ night: false }), wind: 0.11, windFreq: 340, stinger: null }),
  photography: Object.freeze({ trackId: 'story.memory', vars: Object.freeze({ night: false }), wind: 0.08, windFreq: 320, stinger: null }),
  restoration: Object.freeze({ trackId: 'story.memory', vars: Object.freeze({ night: true }), wind: 0.06, windFreq: 300, stinger: null }),
  losang: Object.freeze({ trackId: 'stupa', vars: Object.freeze({ night: false }), wind: 0.09, windFreq: 330, stinger: 'guru' }),
  map: Object.freeze({ trackId: 'story.mirror', vars: Object.freeze({ night: true }), wind: 0.07, windFreq: 290, stinger: null }),
  vision: Object.freeze({ trackId: 'pharping.drought', vars: Object.freeze({}), wind: 0.18, windFreq: 410, stinger: 'vision' }),
  return: Object.freeze({ trackId: 'story.memory', vars: Object.freeze({ night: true }), wind: 0.05, windFreq: 280, stinger: null }),
  complete: Object.freeze({ trackId: 'stupa', vars: Object.freeze({ night: true }), wind: 0.09, windFreq: 310, stinger: 'subdued' }),
});

/**
 * Pure resolver for Demo beat audio state.
 */
export function resolveBeatAudio(beat) {
  return BEAT_AUDIO_MAP[beat] || BEAT_AUDIO_MAP.prologue;
}

/**
 * Pure resolver for Chapter checkpoint audio state.
 */
export function resolveChapterAudio(chapterId, checkpointId) {
  switch (chapterId) {
    case 'pharping': {
      if (checkpointId === 'release') {
        return { trackId: 'pharping.rain', vars: {}, wind: 0.11, windFreq: 320, stinger: 'subdued', sfx: 'water' };
      }
      if (checkpointId === 'rain') {
        return { trackId: 'pharping.rain', vars: {}, wind: 0.09, windFreq: 300, stinger: 'chapterComplete', sfx: 'water' };
      }
      if (checkpointId === 'lamp') {
        return { trackId: 'pharping.rain', vars: {}, wind: 0.07, windFreq: 290, stinger: null, sfx: 'lamp' };
      }
      if (checkpointId === 'phone') {
        return { trackId: 'story.mirror', vars: { night: true }, wind: 0.06, windFreq: 280, stinger: null, sfx: 'phone' };
      }
      if (checkpointId === 'diary') {
        return { trackId: 'story.memory', vars: {}, wind: 0.05, windFreq: 280, stinger: null, sfx: 'page' };
      }
      if (checkpointId === 'complete') {
        return { trackId: 'stupa', vars: { night: true }, wind: 0.08, windFreq: 310, stinger: null, sfx: 'bowl' };
      }
      const isChannel = checkpointId === 'channel1' || checkpointId === 'channel2';
      const isStone = checkpointId === 'spring1' || checkpointId === 'spring2';
      return {
        trackId: 'pharping.drought',
        vars: {},
        wind: 0.16,
        windFreq: 390,
        stinger: checkpointId === 'spring1' ? 'vision' : null,
        sfx: isStone ? 'stone' : isChannel ? 'water' : 'page',
      };
    }

    case 'mangyul': {
      if (checkpointId === 'message' || checkpointId === 'memory') {
        return {
          trackId: 'story.mirror',
          vars: { night: true },
          wind: 0.18,
          windFreq: 420,
          stinger: checkpointId === 'message' ? 'vision' : null,
          sfx: 'phone',
        };
      }
      if (checkpointId === 'answer') {
        return { trackId: 'mangyul.calm', vars: {}, wind: 0.14, windFreq: 350, stinger: 'subdued', sfx: 'bowl' };
      }
      if (checkpointId === 'flags' || checkpointId === 'clearing') {
        return {
          trackId: 'mangyul.calm',
          vars: {},
          wind: 0.11,
          windFreq: 320,
          stinger: checkpointId === 'flags' ? 'chapterComplete' : null,
          sfx: 'windhorse',
        };
      }
      if (checkpointId === 'phone') {
        return { trackId: 'story.mirror', vars: { night: true }, wind: 0.09, windFreq: 310, stinger: null, sfx: 'phone' };
      }
      if (checkpointId === 'diary') {
        return { trackId: 'story.memory', vars: {}, wind: 0.06, windFreq: 290, stinger: null, sfx: 'page' };
      }
      if (checkpointId === 'complete') {
        return { trackId: 'stupa', vars: { night: true }, wind: 0.08, windFreq: 310, stinger: null, sfx: 'bowl' };
      }
      return {
        trackId: 'mangyul.storm',
        vars: {},
        wind: 0.28,
        windFreq: 480,
        stinger: null,
        sfx: checkpointId === 'altar12' ? 'bowl' : 'windhorse',
      };
    }

    case 'yarlung': {
      if (checkpointId === 'release' || checkpointId === 'guardian') {
        return {
          trackId: 'yarlung.calm',
          vars: {},
          wind: 0.10,
          windFreq: 320,
          stinger: checkpointId === 'guardian' ? 'subdued' : null,
          sfx: 'bowl',
        };
      }
      if (checkpointId === 'memory' || checkpointId === 'boundary') {
        return {
          trackId: 'story.memory',
          vars: {},
          wind: 0.05,
          windFreq: 280,
          stinger: null,
          sfx: 'phone',
        };
      }
      if (checkpointId === 'diary') {
        return { trackId: 'yarlung.calm', vars: {}, wind: 0.07, windFreq: 300, stinger: null, sfx: 'page' };
      }
      if (checkpointId === 'complete') {
        return { trackId: 'stupa', vars: { night: true }, wind: 0.08, windFreq: 310, stinger: 'chapterComplete', sfx: 'bowl' };
      }
      const isStone = checkpointId === 'stone1' || checkpointId === 'stone2';
      return {
        trackId: 'yarlung.unrest',
        vars: {},
        wind: 0.16,
        windFreq: 380,
        stinger: checkpointId === 'observe' ? 'vision' : null,
        sfx: isStone ? 'stone' : 'page',
      };
    }

    case 'samye': {
      if (checkpointId === 'photo') {
        return { trackId: 'story.memory', vars: {}, wind: 0.07, windFreq: 290, stinger: null, sfx: 'page' };
      }
      if (checkpointId === 'night') {
        return { trackId: 'samye.night', vars: {}, wind: 0.24, windFreq: 440, stinger: 'phaseShift', sfx: 'stone' };
      }
      if (checkpointId === 'rebuild') {
        return { trackId: 'samye.day', vars: {}, wind: 0.12, windFreq: 330, stinger: null, sfx: 'phone' };
      }
      if (checkpointId === 'hepori') {
        return { trackId: 'samye.complete', vars: {}, wind: 0.11, windFreq: 320, stinger: 'vajraGuruChant', sfx: 'bowl' };
      }
      if (checkpointId === 'memory' || checkpointId === 'diary') {
        return { trackId: 'story.memory', vars: {}, wind: 0.06, windFreq: 290, stinger: null, sfx: 'page' };
      }
      if (checkpointId === 'complete') {
        return { trackId: 'samye.complete', vars: {}, wind: 0.08, windFreq: 310, stinger: 'chapterComplete', sfx: 'bowl' };
      }
      return {
        trackId: 'samye.day',
        vars: {},
        wind: 0.11,
        windFreq: 330,
        stinger: checkpointId === 'stone' ? 'vision' : null,
        sfx: 'stone',
      };
    }

    case 'chimphu': {
      if (checkpointId === 'road' || checkpointId === 'message') {
        return {
          trackId: 'story.mirror',
          vars: { night: true },
          wind: 0.14,
          windFreq: 360,
          stinger: checkpointId === 'road' ? 'vision' : null,
          sfx: 'phone',
        };
      }
      if (checkpointId === 'cave' || checkpointId === 'light' || (checkpointId && checkpointId.startsWith('starlight'))) {
        return {
          trackId: 'story.terma',
          vars: {},
          wind: 0.06,
          windFreq: 270,
          stinger: checkpointId === 'light' ? 'guru' : checkpointId === 'starlight3' ? 'subdued' : null,
          sfx: 'starlight',
        };
      }
      if (checkpointId === 'descent') {
        return {
          trackId: 'story.mirror',
          vars: { night: true },
          wind: 0.09,
          windFreq: 310,
          stinger: null,
          sfx: 'phone',
        };
      }
      if (checkpointId === 'diary') {
        return { trackId: 'story.memory', vars: {}, wind: 0.05, windFreq: 280, stinger: null, sfx: 'page' };
      }
      if (checkpointId === 'complete') {
        return { trackId: 'chimphu', vars: {}, wind: 0.08, windFreq: 300, stinger: 'chapterComplete', sfx: 'bowl' };
      }
      return {
        trackId: 'chimphu',
        vars: {},
        wind: 0.10,
        windFreq: 310,
        stinger: null,
        sfx: 'page',
      };
    }

    case 'finale': {
      if (checkpointId && checkpointId.startsWith('letter')) {
        return {
          trackId: 'story.finale',
          vars: { intimate: true },
          wind: 0.05,
          windFreq: 270,
          stinger: checkpointId === 'letter1' ? 'vision' : null,
          sfx: 'page',
        };
      }
      if (checkpointId === 'decision' || checkpointId === 'response') {
        return {
          trackId: 'story.mirror',
          vars: { night: true },
          wind: 0.04,
          windFreq: 260,
          stinger: checkpointId === 'response' ? 'subdued' : null,
          sfx: 'phone',
        };
      }
      if (checkpointId === 'lamp' || checkpointId === 'lampPrayer') {
        return {
          trackId: 'story.finale',
          vars: { intimate: false },
          wind: 0.07,
          windFreq: 300,
          stinger: checkpointId === 'lamp' ? 'vajraGuruChant' : null,
          sfx: checkpointId === 'lamp' ? 'lamp' : 'bowl',
        };
      }
      if (checkpointId === 'diary' || checkpointId === 'complete') {
        return {
          trackId: 'credits',
          vars: {},
          wind: 0.06,
          windFreq: 290,
          stinger: checkpointId === 'complete' ? 'chapterComplete' : null,
          sfx: checkpointId === 'diary' ? 'page' : 'bowl',
        };
      }
      return {
        trackId: 'story.finale',
        vars: { intimate: false },
        wind: 0.09,
        windFreq: 320,
        stinger: null,
        sfx: checkpointId === 'custody' ? 'stone' : 'kora',
      };
    }

    default:
      return { trackId: 'stupa', vars: {}, wind: 0.10, windFreq: 320, stinger: null, sfx: 'bowl' };
  }
}

function createPinkNoiseBuffer(context, seconds = 4) {
  const rate = context.sampleRate;
  const length = rate * seconds;
  const buffer = context.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.042;
    b6 = white * 0.115926;
  }
  return buffer;
}

export function createStoryAudio(ctx) {
  const { bus } = ctx;
  const musicCfg = CONFIG?.MUSIC || { volume: 0.55, defaultMusicVolume: 0.8 };

  let ac = null;
  let masterGain = null;
  let windFilter = null;
  let windGain = null;
  let droneGain = null;
  let noiseBuffer = null;
  let music = null;

  let enabled = true;
  let clipDucking = false;
  let disposed = false;
  let currentCue = resolveBeatAudio('prologue');

  function ensureContext() {
    if (disposed || !enabled) return null;
    if (ac) {
      if (ac.state === 'suspended') {
        ac.resume().catch(() => {});
      }
      return ac;
    }
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      ac = new AudioCtx();
      if (ac.state === 'suspended') {
        ac.resume().catch(() => {});
      }

      masterGain = ac.createGain();
      masterGain.gain.value = enabled ? 0.82 : 0;
      masterGain.connect(ac.destination);

      noiseBuffer = createPinkNoiseBuffer(ac, 4);

      // 1. Resonant Himalayan wind bed
      const windSource = ac.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      windFilter = ac.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = currentCue.windFreq || 320;
      windFilter.Q.value = 2.6;

      windGain = ac.createGain();
      windGain.gain.value = currentCue.wind || 0.08;

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(masterGain);
      windSource.start();

      // 2. Warm 108 Hz "Om" harmonic pad (108 Hz, 162 Hz fifth, 216 Hz octave, 324 Hz, 432 Hz)
      droneGain = ac.createGain();
      droneGain.gain.value = 0.028;

      const droneFilter = ac.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 520;
      droneFilter.connect(droneGain);
      droneGain.connect(masterGain);

      const droneFreqs = [108, 162, 216, 108.35, 324, 432];
      const droneAmps = [0.38, 0.22, 0.20, 0.20, 0.12, 0.08];
      for (let i = 0; i < droneFreqs.length; i++) {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = droneFreqs[i];
        g.gain.value = droneAmps[i];
        osc.connect(g);
        g.connect(droneFilter);
        osc.start();
      }

      // 3. 432 Hz Adaptive Procedural Music Engine
      music = createMusicEngine({
        ac,
        destination: masterGain,
        tracks: MUSIC_TRACKS,
        stingers: MUSIC_STINGERS,
        config: {
          ...musicCfg,
          volume: (musicCfg.volume ?? 0.55) * (musicCfg.defaultMusicVolume ?? 0.8),
        },
      });

      applyCue(currentCue, { playStinger: false });
    } catch {
      ac = null;
      music = null;
    }
    return ac;
  }

  function syncVolumes() {
    if (!ac || !masterGain) return;
    const now = ac.currentTime;
    const targetMaster = enabled ? (clipDucking ? 0.24 : 0.82) : 0;
    masterGain.gain.setTargetAtTime(targetMaster, now, 0.08);
    if (music) {
      const baseVol = (musicCfg.volume ?? 0.55) * (musicCfg.defaultMusicVolume ?? 0.8);
      music.setVolume(enabled ? (clipDucking ? baseVol * 0.22 : baseVol) : 0);
    }
  }

  function applyCue(cue, { playStinger = true } = {}) {
    currentCue = cue;
    if (!ac || !enabled) return;
    const now = ac.currentTime;
    if (windGain && typeof cue.wind === 'number') {
      windGain.gain.setTargetAtTime(cue.wind, now, 0.45);
    }
    if (windFilter && typeof cue.windFreq === 'number') {
      windFilter.frequency.setTargetAtTime(cue.windFreq, now, 0.45);
    }
    if (music && cue.trackId && MUSIC_TRACKS[cue.trackId]) {
      music.setTrack(cue.trackId, cue.vars || {});
      if (playStinger && cue.stinger && MUSIC_STINGERS[cue.stinger]) {
        const trackRoot = MUSIC_TRACKS[cue.trackId]?.root ?? 62;
        music.stinger(cue.stinger, { tr: keyOffset(trackRoot) });
      }
    }
  }

  // ---------------------------------------------------------------- Procedural SFX
  function bowl(pitchScale = 1.0) {
    const context = ensureContext();
    if (!context || !enabled) return;
    const now = context.currentTime;
    const partials = [
      { ratio: 1.0, amp: 0.16, decay: 5.2, beat: 0.55 },
      { ratio: 2.756, amp: 0.10, decay: 3.8, beat: 1.3 },
      { ratio: 5.18, amp: 0.045, decay: 2.6, beat: 2.1 },
      { ratio: 8.13, amp: 0.018, decay: 1.5, beat: 3.0 },
    ];
    const base = 216 * pitchScale;
    for (const p of partials) {
      for (let pair = 0; pair < 2; pair++) {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.value = base * p.ratio + (pair === 1 ? p.beat : 0);
        const peak = p.amp * 0.5;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(peak, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + p.decay + 0.05);
      }
    }
  }

  function phoneChime(kind = 'incoming') {
    const context = ensureContext();
    if (!context || !enabled) return;
    const now = context.currentTime;
    const notes = kind === 'reply'
      ? [576, 720]
      : kind === 'offline'
        ? [432, 324]
        : [648, 864];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.085;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(start);
      osc.stop(start + 0.7);
    });
  }

  function pageTurn() {
    const context = ensureContext();
    if (!context || !enabled || !noiseBuffer) return;
    const now = context.currentTime;
    const src = context.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.exponentialRampToValueAtTime(620, now + 0.14);
    filter.Q.value = 2.2;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
    src.stop(now + 0.18);
  }

  function stoneMove() {
    const context = ensureContext();
    if (!context || !enabled) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(118, now);
    osc.frequency.exponentialRampToValueAtTime(54, now + 0.28);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  function waterRipple() {
    const context = ensureContext();
    if (!context || !enabled) return;
    const now = context.currentTime;
    [540, 720, 960].forEach((freq, idx) => {
      const start = now + idx * 0.09;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.28, start + 0.11);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.05, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(start);
      osc.stop(start + 0.28);
    });
  }

  function starlightChime() {
    const context = ensureContext();
    if (!context || !enabled) return;
    const now = context.currentTime;
    [864, 1080, 1296, 1728].forEach((freq, idx) => {
      const start = now + idx * 0.07;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(start);
      osc.stop(start + 1.45);
    });
  }

  function lampIgnite() {
    const context = ensureContext();
    if (!context || !enabled || !noiseBuffer) return;
    const now = context.currentTime;
    const src = context.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(880, now + 0.14);
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.45);
    filter.Q.value = 1.8;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now);
    src.stop(now + 0.5);
    bowl(1.5);
  }

  function playSfx(kind) {
    switch (kind) {
      case 'stone': stoneMove(); break;
      case 'water': waterRipple(); break;
      case 'windhorse': pageTurn(); bowl(1.333); break;
      case 'starlight': starlightChime(); break;
      case 'lamp': lampIgnite(); break;
      case 'phone': phoneChime('incoming'); break;
      case 'kora': bowl(1.125); break;
      case 'page': pageTurn(); break;
      case 'bowl':
      default:
        bowl(1.0);
        break;
    }
  }

  // ---------------------------------------------------------------- State Hooks & Bus Listeners
  function enterBeat(beat) {
    const cue = resolveBeatAudio(beat);
    applyCue(cue, { playStinger: true });
    bowl(beat === 'vision' ? 1.333 : 1.0);
  }

  function enterChapter(chapterId, checkpointId) {
    const cue = resolveChapterAudio(chapterId, checkpointId);
    applyCue(cue, { playStinger: true });
    if (cue.sfx) playSfx(cue.sfx);
  }

  function begin() {
    ensureContext();
    syncVolumes();
  }

  function setEnabled(next) {
    enabled = Boolean(next);
    if (enabled) {
      ensureContext();
      syncVolumes();
    } else if (ac) {
      syncVolumes();
      ac.suspend?.().catch(() => {});
    }
  }

  const onClipPlay = () => {
    clipDucking = true;
    syncVolumes();
  };
  const onClipEnd = () => {
    clipDucking = false;
    syncVolumes();
  };
  const onChapterChange = ({ chapterId, checkpointId }) => {
    enterChapter(chapterId, checkpointId);
  };
  const onChapterExit = () => {
    const beat = ctx.story?.getState?.()?.beat || 'complete';
    enterBeat(beat);
  };
  const onPhoneOpen = () => {
    phoneChime('incoming');
  };

  bus?.on?.('story:clip-play', onClipPlay);
  bus?.on?.('story:clip-end', onClipEnd);
  bus?.on?.('story:chapter-change', onChapterChange);
  bus?.on?.('story:chapter-exit', onChapterExit);
  bus?.on?.('story:phone-open', onPhoneOpen);

  function dispose() {
    if (disposed) return;
    disposed = true;
    bus?.off?.('story:clip-play', onClipPlay);
    bus?.off?.('story:clip-end', onClipEnd);
    bus?.off?.('story:chapter-change', onChapterChange);
    bus?.off?.('story:chapter-exit', onChapterExit);
    bus?.off?.('story:phone-open', onPhoneOpen);
    music?.stop?.();
    if (ac && ac.state !== 'closed') {
      ac.close?.().catch(() => {});
    }
    ac = null;
    music = null;
  }

  const api = {
    begin,
    setEnabled,
    isEnabled: () => enabled,
    getCurrentCue: () => ({ ...currentCue }),
    enterBeat,
    enterChapter,
    bowl,
    phoneChime,
    pageTurn,
    playSfx,
    dispose,
  };
  ctx.storyAudio = api;
  ctx.debug?.register?.('storyAudio', api);
  return api;
}
