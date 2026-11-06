/**
 * Web Audio procedural soundscape — synthesized Tibetan singing bowl, prayer bell,
 * butter-lamp ignition whoosh, rhesus macaque FM chirps, prayer-wheel clicks,
 * soft stone footsteps, wind-modulated bandpass noise, subtle "Om" harmonic pad,
 * and nocturnal crickets. Zero external audio files.
 *
 * Also hosts the adaptive procedural score (`music.js` engine + `data/music.js`):
 * picks the map / chapter-variant / boss track from game state and fires stingers
 * on chapter intros, chapter completion, boss subjugation and Guru Rinpoche visions.
 */
import { CONFIG } from '../config.js';
import { createMusicEngine } from './music.js';
import { MUSIC_TRACKS, MUSIC_STINGERS, keyOffset } from '../data/music.js';

const MUTE_STORAGE_KEY = 'stupa.audio.muted';
const VOL_STORAGE_KEY = 'stupa.audio.volume';

export function createAudio(ctx) {
  const { bus, state } = ctx;

  let ac = null;
  let masterGain = null;
  let windFilter = null;
  let windGain = null;
  let droneGain = null;
  let cricketGain = null;
  let noiseBuffer = null;

  let muted = false;
  let volume = 0.75;
  let started = false;
  let cricketTimer = 0;

  // Adaptive score
  const MUSIC_CFG = CONFIG.MUSIC;
  let music = null;
  let musicEnabled = true;
  let musicVolume = MUSIC_CFG.defaultMusicVolume;
  let musicRefreshTimer = 0;
  let musicForced = null; // debug override: { id, vars }
  const bossMusic = { active: false, id: null, phase: 1 };
  let samyeSiege = false; // Ch.4 night-defense phase (`samye:nightStarted` → `samye:nightSurvived`)
  let creditsOpen = false; // Finale credits overlay (`credits:opened` → `credits:closed`)

  if (ctx.save) {
    const settings = ctx.save.get('settings', { muted: false, volume: 0.75 });
    muted = Boolean(settings.muted);
    if (typeof settings.volume === 'number' && !Number.isNaN(settings.volume)) {
      volume = Math.max(0, Math.min(1, settings.volume));
    }
    if (settings.music === false) musicEnabled = false;
    if (typeof settings.musicVolume === 'number' && !Number.isNaN(settings.musicVolume)) {
      musicVolume = Math.max(0, Math.min(1, settings.musicVolume));
    }
  } else {
    try {
      muted = localStorage.getItem(MUTE_STORAGE_KEY) === '1';
      const savedVol = parseFloat(localStorage.getItem(VOL_STORAGE_KEY));
      if (!Number.isNaN(savedVol)) volume = Math.max(0, Math.min(1, savedVol));
    } catch { /* ignore */ }
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
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // Tiny 1-sample silent WAV data URI to switch iOS WebKit audio session from 'ambient' (muted by silent switch) to 'playback'
  const SILENT_WAV_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
  let htmlAudioUnlocked = false;
  let webAudioUnlocked = false;

  function unlockMobileAudioSession() {
    try {
      if (typeof navigator !== 'undefined' && navigator.audioSession && navigator.audioSession.type !== 'playback') {
        navigator.audioSession.type = 'playback';
      }
    } catch { /* ignore */ }

    if (!htmlAudioUnlocked && typeof Audio !== 'undefined') {
      try {
        const a = new Audio(SILENT_WAV_URI);
        a.setAttribute('playsinline', '');
        a.volume = 0.01;
        const p = a.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            htmlAudioUnlocked = true;
            a.pause();
          }).catch(() => {});
        } else {
          htmlAudioUnlocked = true;
        }
      } catch { /* ignore */ }
    }
  }

  function playSilentUnlockBuffer(context) {
    if (!context || webAudioUnlocked) return;
    try {
      const buf = context.createBuffer(1, 1, 22050);
      const src = context.createBufferSource();
      src.buffer = buf;
      src.connect(context.destination);
      src.start(0);
      if (context.state === 'running') webAudioUnlocked = true;
    } catch { /* ignore */ }
  }

  function ensureContext() {
    unlockMobileAudioSession();

    if (ac) {
      if (ac.state !== 'running') {
        ac.resume().catch(() => {});
        playSilentUnlockBuffer(ac);
      } else {
        webAudioUnlocked = true;
      }
      return ac;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    ac = new AudioCtx();
    if (ac.state !== 'running') {
      ac.resume().catch(() => {});
    }
    playSilentUnlockBuffer(ac);

    masterGain = ac.createGain();
    masterGain.gain.value = muted ? 0 : volume;
    masterGain.connect(ac.destination);

    noiseBuffer = createPinkNoiseBuffer(ac, 4);

    // 1. Ambient Himalayan wind (looping pink noise -> resonant bandpass filter)
    const windSource = ac.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    windFilter = ac.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 2.8;

    windGain = ac.createGain();
    windGain.gain.value = 0.001;

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windSource.start();

    // 2. Subtle warm "Om" harmonic drone pad (108 Hz fundamental + fifth + octaves for mobile speaker audibility)
    droneGain = ac.createGain();
    droneGain.gain.value = 0.048;

    const droneFilter = ac.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 580;
    droneFilter.connect(droneGain);
    droneGain.connect(masterGain);

    const droneFreqs = [108, 162, 216, 108.4, 324, 432];
    const droneAmps = [0.42, 0.25, 0.22, 0.24, 0.16, 0.10];
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

    // 3. Night cricket bus
    cricketGain = ac.createGain();
    cricketGain.gain.value = 0;
    cricketGain.connect(masterGain);

    // 4. Adaptive procedural score (shares the master volume / mute)
    try {
      music = createMusicEngine({
        ac,
        destination: masterGain,
        tracks: MUSIC_TRACKS,
        stingers: MUSIC_STINGERS,
        config: { ...MUSIC_CFG, volume: musicEnabled ? MUSIC_CFG.volume * musicVolume : 0 },
      });
    } catch (err) {
      console.warn('[audio] music engine unavailable', err);
      music = null;
    }

    started = true;
    return ac;
  }

  function applyMasterGain() {
    if (!ac || !masterGain) return;
    const target = muted ? 0 : volume;
    masterGain.gain.setTargetAtTime(target, ac.currentTime, 0.06);
  }

  // ---------------------------------------------------------------- synthesized SFX
  function playSingingBowl(pitchScale = 1.0) {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Tibetan singing bowl inharmonic partials (f0 = 216 Hz, 2.76x, 5.18x, 8.13x)
    const partials = [
      { ratio: 1.0, amp: 0.22, decay: 6.5, beat: 0.6 },
      { ratio: 2.756, amp: 0.14, decay: 4.8, beat: 1.4 },
      { ratio: 5.18, amp: 0.065, decay: 3.1, beat: 2.3 },
      { ratio: 8.13, amp: 0.025, decay: 1.8, beat: 3.2 },
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
        gain.gain.linearRampToValueAtTime(peak, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + p.decay + 0.05);
      }
    }
  }

  function playBell() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Bright bronze temple bell / tingsha cymbal
    const freqs = [1188, 1782, 2640, 3520];
    const amps = [0.16, 0.09, 0.05, 0.03];
    const decays = [3.2, 2.4, 1.6, 1.1];

    for (let i = 0; i < freqs.length; i++) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = freqs[i] * (0.995 + Math.random() * 0.01);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(amps[i], now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decays[i]);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + decays[i] + 0.05);
    }
  }

  function playLampIgnite() {
    const context = ensureContext();
    if (!context || muted || !noiseBuffer) return;
    const now = context.currentTime;

    // Warm flame whoosh + gentle spark chime
    const src = context.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.exponentialRampToValueAtTime(920, now + 0.14);
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.45);
    filter.Q.value = 1.8;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now, Math.random() * 2);
    src.stop(now + 0.5);

    // Gentle warm shimmer tone
    const osc = context.createOscillator();
    const tGain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.35);
    tGain.gain.setValueAtTime(0.0001, now);
    tGain.gain.linearRampToValueAtTime(0.055, now + 0.04);
    tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc.connect(tGain);
    tGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  function playMonkeyChatter() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // 3 short playful FM chirps
    for (let i = 0; i < 3; i++) {
      const t0 = now + i * 0.11;
      const dur = 0.085;
      const carrier = context.createOscillator();
      const mod = context.createOscillator();
      const modGain = context.createGain();
      const gain = context.createGain();

      const baseF = 680 + i * 110 + Math.random() * 80;
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(baseF, t0);
      carrier.frequency.exponentialRampToValueAtTime(baseF * 1.45, t0 + dur * 0.6);
      carrier.frequency.exponentialRampToValueAtTime(baseF * 0.9, t0 + dur);

      mod.type = 'sine';
      mod.frequency.value = 32;
      modGain.gain.value = 95;

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.09, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(gain);
      gain.connect(masterGain);

      mod.start(t0);
      carrier.start(t0);
      mod.stop(t0 + dur + 0.01);
      carrier.stop(t0 + dur + 0.01);
    }
  }

  function playWheelSpin() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Wooden spindle creak/click + faint brass chime
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.07);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.075, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  function playFootstep() {
    const context = ensureContext();
    if (!context || muted || !noiseBuffer) return;
    const now = context.currentTime;

    const src = context.createBufferSource();
    src.buffer = noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240 + Math.random() * 70;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(now, Math.random() * 2.5);
    src.stop(now + 0.095);
  }

  function playItemPickup() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Crisp, bright Tibetan crystal chime chord (E5, B5, E6, G#6)
    const notes = [659.25, 987.77, 1318.51, 1661.22];
    for (let i = 0; i < notes.length; i++) {
      const t0 = now + i * 0.032;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = notes[i];

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.12 / (i + 1), t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + 1.25);
    }
  }

  function playCricketChirp(nightFactor) {
    if (!ac || muted || nightFactor < 0.25) return;
    const now = ac.currentTime;
    const pulses = 3 + Math.floor(Math.random() * 2);
    const freq = 4150 + Math.random() * 280;

    for (let i = 0; i < pulses; i++) {
      const t0 = now + i * 0.042;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const peak = 0.018 * nightFactor;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.032);
      osc.connect(g);
      g.connect(cricketGain);
      osc.start(t0);
      osc.stop(t0 + 0.036);
    }
  }

  const CHANT_STEP_NOTES = [
    { syl: 'om',  m: 50, d: 0.85 },
    { syl: 'ah',  m: 52, d: 0.85 },
    { syl: 'hum', m: 54, d: 0.95 },
    { syl: 'ben', m: 57, d: 0.62 },
    { syl: 'za',  m: 57, d: 0.62 },
    { syl: 'gu',  m: 59, d: 0.62 },
    { syl: 'ru',  m: 57, d: 0.62 },
    { syl: 'pe',  m: 54, d: 0.62 },
    { syl: 'ma',  m: 52, d: 0.62 },
    { syl: 'sid', m: 54, d: 0.62 },
    { syl: 'dhi', m: 52, d: 0.62 },
    { syl: 'hum', m: 50, d: 1.05 },
  ];
  let chantStepIdx = 0;

  function playMantraChant() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Sing the next syllable of the 12-syllable Vajra Guru Mantra with the real human vocal choir
    if (music?.instruments?.mantraVoice) {
      const step = CHANT_STEP_NOTES[chantStepIdx % CHANT_STEP_NOTES.length];
      chantStepIdx = (chantStepIdx + 1) % CHANT_STEP_NOTES.length;
      const tr = currentKeyOffset();
      const bus = { dry: masterGain, wet: masterGain };
      music.instruments.mantraVoice(bus, now + 0.01, step.m + tr, step.d, 0.82, {
        syllable: step.syl,
        voice: 'choir',
        send: 0,
      });
    }

    // Soft singing-bowl harmonic shimmer
    const shimmerGain = context.createGain();
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.linearRampToValueAtTime(0.06, now + 0.04);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

    const shimmerFreqs = [432, 648, 864];
    for (const f of shimmerFreqs) {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(shimmerGain);
      osc.start(now);
      osc.stop(now + 0.75);
    }
    shimmerGain.connect(masterGain);
  }

  function playHit() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Snappy impact punch
    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.24, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.14);

    // Resonant mantra crystal chime
    const freqs = [880, 1320];
    for (const f of freqs) {
      const chime = context.createOscillator();
      const chimeG = context.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(f, now);
      chimeG.gain.setValueAtTime(0.0001, now);
      chimeG.gain.linearRampToValueAtTime(0.12, now + 0.01);
      chimeG.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      chime.connect(chimeG);
      chimeG.connect(masterGain);
      chime.start(now);
      chime.stop(now + 0.4);
    }
  }

  function playHurt() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Low thud punch
    const thud = context.createOscillator();
    const thudG = context.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(130, now);
    thud.frequency.exponentialRampToValueAtTime(48, now + 0.14);
    thudG.gain.setValueAtTime(0.0001, now);
    thudG.gain.linearRampToValueAtTime(0.36, now + 0.008);
    thudG.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    thud.connect(thudG);
    thudG.connect(masterGain);
    thud.start(now);
    thud.stop(now + 0.24);

    // Grunt-like filtered noise pulse
    if (noiseBuffer) {
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer;
      const flt = context.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(240, now);
      flt.Q.value = 2.2;
      const nGain = context.createGain();
      nGain.gain.setValueAtTime(0.0001, now);
      nGain.gain.linearRampToValueAtTime(0.18, now + 0.01);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      noise.connect(flt);
      flt.connect(nGain);
      nGain.connect(masterGain);
      noise.start(now, Math.random() * 2);
      noise.stop(now + 0.18);
    }
  }

  function playLiberate() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // High pure Tibetan singing bowl / tingsha bell shimmer
    const partials = [
      { f: 1760, a: 0.16, decay: 1.8 },
      { f: 2640, a: 0.10, decay: 2.1 },
      { f: 3520, a: 0.06, decay: 1.4 },
      { f: 5280, a: 0.03, decay: 1.0 },
    ];

    for (const p of partials) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.f, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(p.a, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    }
  }

  function playArrow() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.24, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.15);

    if (noiseBuffer) {
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer;
      const flt = context.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(1800, now);
      flt.frequency.exponentialRampToValueAtTime(450, now + 0.16);
      flt.Q.value = 3.5;
      const ng = context.createGain();
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.linearRampToValueAtTime(0.18, now + 0.01);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      noise.connect(flt);
      flt.connect(ng);
      ng.connect(masterGain);
      noise.start(now, Math.random() * 2);
      noise.stop(now + 0.18);
    }
  }

  function playFireball() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.4);

    if (noiseBuffer) {
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer;
      const flt = context.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(320, now);
      flt.frequency.linearRampToValueAtTime(680, now + 0.15);
      flt.frequency.exponentialRampToValueAtTime(180, now + 0.36);
      flt.Q.value = 2.0;
      const ng = context.createGain();
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.linearRampToValueAtTime(0.2, now + 0.02);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      noise.connect(flt);
      flt.connect(ng);
      ng.connect(masterGain);
      noise.start(now, Math.random() * 2);
      noise.stop(now + 0.38);
    }
  }

  function playBoulder() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.45, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.38);

    if (noiseBuffer) {
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer;
      const flt = context.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(140, now);
      flt.frequency.exponentialRampToValueAtTime(50, now + 0.32);
      const ng = context.createGain();
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.linearRampToValueAtTime(0.35, now + 0.015);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      noise.connect(flt);
      flt.connect(ng);
      ng.connect(masterGain);
      noise.start(now, Math.random() * 2);
      noise.stop(now + 0.38);
    }
  }

  function playFrost() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const freqs = [880, 1174, 1568];
    for (const f of freqs) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.95, now + 0.45);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.08, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.48);
    }

    if (noiseBuffer) {
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer;
      const flt = context.createBiquadFilter();
      flt.type = 'highpass';
      flt.frequency.setValueAtTime(1200, now);
      const ng = context.createGain();
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.linearRampToValueAtTime(0.12, now + 0.04);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      noise.connect(flt);
      flt.connect(ng);
      ng.connect(masterGain);
      noise.start(now, Math.random() * 2);
      noise.stop(now + 0.42);
    }
  }

  function playDispel() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const freqs = [1320, 1980, 2640];
    for (let i = 0; i < freqs.length; i++) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], now);
      osc.frequency.exponentialRampToValueAtTime(freqs[i] * 1.08, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(freqs[i], now + 0.55);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.12 / (i + 1), now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.65);
    }
  }

  function playLevelUp() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Ascending major 9th singing bowl chord: C4, E4, G4, B4, D5
    const freqs = [261.63, 329.63, 392.00, 493.88, 587.33];
    freqs.forEach((f0, idx) => {
      const startTime = now + idx * 0.12;
      const partials = [
        { ratio: 1.0, amp: 0.18, decay: 4.5 },
        { ratio: 2.756, amp: 0.09, decay: 3.2 },
        { ratio: 5.18, amp: 0.04, decay: 2.0 },
      ];

      for (const p of partials) {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f0 * p.ratio, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(p.amp * 0.6, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + p.decay);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + p.decay + 0.1);
      }
    });

    // Shimmering overtone chime (C6, E6, G6)
    const chimeFreqs = [1046.5, 1318.5, 1567.98];
    chimeFreqs.forEach((cf, i) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(cf, now + 0.35 + i * 0.05);

      gain.gain.setValueAtTime(0.0001, now + 0.35 + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.45 + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + 0.35 + i * 0.05);
      osc.stop(now + 2.9);
    });
  }

  function playFaint() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // 1. Descending low resonant drone (95 Hz -> 42 Hz)
    const droneOsc = context.createOscillator();
    const droneFilter = context.createBiquadFilter();
    const droneGain = context.createGain();

    droneOsc.type = 'sawtooth';
    droneOsc.frequency.setValueAtTime(95, now);
    droneOsc.frequency.exponentialRampToValueAtTime(42, now + 1.6);

    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(220, now);
    droneFilter.frequency.exponentialRampToValueAtTime(60, now + 1.6);

    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.linearRampToValueAtTime(0.18, now + 0.15);
    droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);

    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(masterGain);
    droneOsc.start(now);
    droneOsc.stop(now + 1.8);

    // 2. Muffled heartbeat pulses ("lub-dub", then a softer fade)
    const heartbeats = [
      { t: 0.15, amp: 0.22 },
      { t: 0.42, amp: 0.18 },
      { t: 0.95, amp: 0.10 },
    ];

    heartbeats.forEach((hb) => {
      const hbOsc = context.createOscillator();
      const hbGain = context.createGain();
      const hbFilter = context.createBiquadFilter();

      hbOsc.type = 'sine';
      hbOsc.frequency.setValueAtTime(75, now + hb.t);
      hbOsc.frequency.exponentialRampToValueAtTime(36, now + hb.t + 0.18);

      hbFilter.type = 'lowpass';
      hbFilter.frequency.setValueAtTime(110, now + hb.t);

      hbGain.gain.setValueAtTime(0.0001, now + hb.t);
      hbGain.gain.linearRampToValueAtTime(hb.amp, now + hb.t + 0.02);
      hbGain.gain.exponentialRampToValueAtTime(0.0001, now + hb.t + 0.22);

      hbOsc.connect(hbFilter);
      hbFilter.connect(hbGain);
      hbGain.connect(masterGain);
      hbOsc.start(now + hb.t);
      hbOsc.stop(now + hb.t + 0.25);
    });
  }

  // Himalayan eagle / raptor high sweeping cry with FM warble + distant cliff echo
  function playEagleCry() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Main sweeping cry (sawtooth carrier modulated by 32Hz warble)
    const osc = context.createOscillator();
    const oscGain = context.createGain();
    const filter = context.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.frequency.exponentialRampToValueAtTime(1550, now + 0.72);
    filter.Q.value = 4.2;

    osc.frequency.setValueAtTime(2650, now);
    osc.frequency.linearRampToValueAtTime(3180, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(1450, now + 0.78);

    const mod = context.createOscillator();
    const modGain = context.createGain();
    mod.frequency.value = 32;
    modGain.gain.setValueAtTime(125, now);
    modGain.gain.exponentialRampToValueAtTime(15, now + 0.72);
    mod.connect(osc.frequency);

    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(0.042, now + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.92);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(masterGain);

    mod.start(now);
    osc.start(now);
    mod.stop(now + 0.95);
    osc.stop(now + 0.95);

    // Distant mountain echo
    const echoNow = now + 0.28;
    const echoOsc = context.createOscillator();
    const echoGain = context.createGain();
    const echoFilter = context.createBiquadFilter();

    echoOsc.type = 'sawtooth';
    echoFilter.type = 'bandpass';
    echoFilter.frequency.setValueAtTime(2350, echoNow);
    echoFilter.frequency.exponentialRampToValueAtTime(1380, echoNow + 0.55);
    echoFilter.Q.value = 3.6;

    echoOsc.frequency.setValueAtTime(2450, echoNow);
    echoOsc.frequency.exponentialRampToValueAtTime(1350, echoNow + 0.6);

    echoGain.gain.setValueAtTime(0.0001, echoNow);
    echoGain.gain.linearRampToValueAtTime(0.016, echoNow + 0.08);
    echoGain.gain.exponentialRampToValueAtTime(0.0001, echoNow + 0.75);

    echoOsc.connect(echoFilter);
    echoFilter.connect(echoGain);
    echoGain.connect(masterGain);

    echoOsc.start(echoNow);
    echoOsc.stop(echoNow + 0.8);
  }

  // Distant serene temple bell / chime in stupa plaza
  function playDistantBell() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const osc = context.createOscillator();
    const g = context.createGain();
    const filter = context.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 1400; // muffled by plaza distance

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now); // soft bell tone

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.022, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

    osc.connect(filter);
    filter.connect(g);
    g.connect(masterGain);

    osc.start(now);
    osc.stop(now + 4.3);
  }

  // Terma (legendary) drop — deep Tibetan dungchen horn resonance + bright ritual bell
  function playTermaDrop() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // 1. Deep dungchen horn (low brassy sawtooth/triangle through resonant lowpass)
    const hornFreqs = [81.0, 162.0, 243.0];
    const hornFilter = context.createBiquadFilter();
    hornFilter.type = 'lowpass';
    hornFilter.frequency.setValueAtTime(260, now);
    hornFilter.frequency.exponentialRampToValueAtTime(520, now + 0.35);
    hornFilter.frequency.exponentialRampToValueAtTime(210, now + 1.8);
    hornFilter.Q.value = 3.2;

    const hornGain = context.createGain();
    hornGain.gain.setValueAtTime(0.0001, now);
    hornGain.gain.linearRampToValueAtTime(0.18, now + 0.14);
    hornGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

    hornFilter.connect(hornGain);
    hornGain.connect(masterGain);

    for (let i = 0; i < hornFreqs.length; i++) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = i === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(hornFreqs[i] * 0.97, now);
      osc.frequency.exponentialRampToValueAtTime(hornFreqs[i], now + 0.18);
      g.gain.value = i === 0 ? 0.55 : i === 1 ? 0.3 : 0.18;
      osc.connect(g);
      g.connect(hornFilter);
      osc.start(now);
      osc.stop(now + 1.95);
    }

    // 2. Shimmering ritual drilbu bell overtone
    const bellFreqs = [864, 1296, 1728];
    for (let i = 0; i < bellFreqs.length; i++) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(bellFreqs[i], now + 0.08);
      g.gain.setValueAtTime(0.0001, now + 0.08);
      g.gain.linearRampToValueAtTime(0.09 / (i + 1), now + 0.11);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + 0.08);
      osc.stop(now + 1.55);
    }
  }

  // Equipment pickup — crisp metallic / ritual chime
  function playPickupGear() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const notes = [540, 810];
    for (let i = 0; i < notes.length; i++) {
      const start = now + i * 0.055;
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[i], start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.09, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(start);
      osc.stop(start + 0.3);
    }
  }

  // Amrita potion — crisp water drop + pure bell chime
  function playPotion() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // 1. Crisp water droplet (upward pitch-bent sine)
    const drop = context.createOscillator();
    const dropG = context.createGain();
    drop.type = 'sine';
    drop.frequency.setValueAtTime(420, now);
    drop.frequency.exponentialRampToValueAtTime(1180, now + 0.09);
    dropG.gain.setValueAtTime(0.0001, now);
    dropG.gain.linearRampToValueAtTime(0.18, now + 0.015);
    dropG.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    drop.connect(dropG);
    dropG.connect(masterGain);
    drop.start(now);
    drop.stop(now + 0.16);

    // 2. Warm crystalline bell chime (A5, E6, A6)
    const chimes = [880, 1318.5, 1760];
    for (let i = 0; i < chimes.length; i++) {
      const t0 = now + 0.05 + i * 0.035;
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = i === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(chimes[i], t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.12 / (i + 1), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.9);
    }
  }

  // Hum Bolt (ཧཱུྃ) cast — crisp golden vajra pulse + resonant 216Hz -> 432Hz harmonic whoosh
  function playHumBolt() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(324, now);
    osc.frequency.exponentialRampToValueAtTime(648, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(216, now + 0.19);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.16, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.22);

    const chime = context.createOscillator();
    const cg = context.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(864, now);
    cg.gain.setValueAtTime(0.0001, now);
    cg.gain.linearRampToValueAtTime(0.06, now + 0.01);
    cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    chime.connect(cg);
    cg.connect(masterGain);
    chime.start(now);
    chime.stop(now + 0.25);
  }

  // Phurba (普巴橛) — metallic wind-piercing blade + iron chime
  function playPhurba() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1120, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.16);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.19);

    if (noiseBuffer) {
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer;
      const flt = context.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(2200, now);
      flt.frequency.exponentialRampToValueAtTime(600, now + 0.18);
      flt.Q.value = 4.0;
      const ng = context.createGain();
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.linearRampToValueAtTime(0.2, now + 0.01);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
      noise.connect(flt);
      flt.connect(ng);
      ng.connect(masterGain);
      noise.start(now, Math.random() * 2);
      noise.stop(now + 0.2);
    }
  }

  // Vajra Bell (金剛鈴) — high crystalline ritual drilbu bell resonance
  function playVajraBell() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const freqs = [1296, 1944, 2592, 3888];
    const amps = [0.18, 0.12, 0.07, 0.04];
    for (let i = 0; i < freqs.length; i++) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(amps[i], now + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 - i * 0.25);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.85);
    }
  }

  // Lotus Shield (蓮花結界) — warm sliding singing-bowl harmonic
  function playLotusShield() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    const freqs = [324, 486, 648];
    for (let i = 0; i < freqs.length; i++) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i] * 0.92, now);
      osc.frequency.exponentialRampToValueAtTime(freqs[i] * 1.08, now + 0.45);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.14 / (i + 1), now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.0);
    }
  }

  // Dharma Protector Summon (護法召喚) — deep horn + ritual chime
  function playSummon() {
    playTermaDrop();
  }

  // Vajra Guru Mantra (蓮師心咒) — deep Tibetan overtone choir chord (2.5s)
  function playVajraGuru() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;
    const dur = 2.5;

    const chord = [108, 162, 216, 324, 432, 648];
    for (let i = 0; i < chord.length; i++) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = i < 2 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(chord[i], now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.12 / (1 + i * 0.35), now + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    }

    // Intone the 12-syllable Vajra Guru Mantra chant over the harmonic ring
    playMusicStinger('vajraGuruChant');
  }

  // ---------------------------------------------------------------- mobile / gesture audio unlock
  if (typeof window !== 'undefined') {
    const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown', 'click'];
    const onUserGesture = () => {
      if (muted) return;
      if (state.mode === 'play' || ac) {
        ensureContext();
      } else {
        // Pre-warm and unlock AudioContext on first touch (e.g., tapping Begin button on mobile)
        ensureContext();
      }
    };
    for (const evt of unlockEvents) {
      window.addEventListener(evt, onUserGesture, { passive: true, capture: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && started && !muted && ac && ac.state !== 'running') {
        ac.resume().catch(() => {});
      }
    });
    window.addEventListener('pageshow', () => {
      if (started && !muted && ac && ac.state !== 'running') {
        ac.resume().catch(() => {});
      }
    });
  }

  // ---------------------------------------------------------------- adaptive score glue
  const hasQuestFlag = (flag) => Boolean(ctx.quests?.hasFlag?.(flag));

  /** Map game state → { id, vars } of the score track that should be playing. */
  function resolveMusicTrack() {
    if (musicForced) return musicForced;
    if (creditsOpen) return { id: 'credits', vars: {} };
    if (bossMusic.active && bossMusic.id) {
      const id = MUSIC_TRACKS[`boss.${bossMusic.id}`] ? `boss.${bossMusic.id}` : 'boss.default';
      return { id, vars: { phase: bossMusic.phase } };
    }
    const zone = state.zone || 'stupa';
    switch (zone) {
      case 'stupa':
        return { id: 'stupa', vars: { night: (state.time?.nightFactor ?? 0) > MUSIC_CFG.nightThreshold } };
      case 'pharping':
        return { id: hasQuestFlag('ch1.rain') ? 'pharping.rain' : 'pharping.drought', vars: {} };
      case 'mangyul':
        return { id: hasQuestFlag('ch2.storm.done') ? 'mangyul.calm' : 'mangyul.storm', vars: {} };
      case 'yarlung':
        return { id: hasQuestFlag('ch3.yaks.done') ? 'yarlung.calm' : 'yarlung.unrest', vars: {} };
      case 'samye':
        if (hasQuestFlag('ch4.pehar.done')) return { id: 'samye.complete', vars: {} };
        return { id: samyeSiege ? 'samye.night' : 'samye.day', vars: {} };
      case 'chimphu':
        return { id: 'chimphu', vars: {} };
      case 'terma':
        return { id: 'terma', vars: {} };
      default:
        return { id: 'wild', vars: {} };
    }
  }

  function canPlayMusic() {
    return Boolean(music) && musicEnabled && !muted && state.mode === 'play';
  }

  function refreshMusic(fade) {
    if (!music) return;
    if (!canPlayMusic()) {
      if (music.getCurrent()) music.stop(1.0);
      return;
    }
    const { id, vars } = resolveMusicTrack();
    music.play(id, vars, fade != null ? { fade } : {});
  }

  /** Key offset (semitones from D) of the current track, so stingers sit in key. */
  function currentKeyOffset() {
    const cur = music?.getCurrent();
    return cur?.root != null ? keyOffset(cur.root) : 0;
  }

  function playMusicStinger(id, extra = {}) {
    if (!music || !canPlayMusic()) return;
    music.stinger(id, { tr: currentKeyOffset(), ...extra });
  }

  function applyMusicVolume() {
    if (!music) return;
    music.setVolume(musicEnabled ? MUSIC_CFG.volume * musicVolume : 0, 0.5);
  }

  // ---------------------------------------------------------------- bus listeners
  bus.on('game:start', () => {
    const context = ensureContext();
    if (context && context.state !== 'running') {
      context.resume().then(() => {
        playSingingBowl(1.0);
      }).catch(() => {});
    } else {
      playSingingBowl(1.0);
    }
    // state.mode flips to 'play' in a sibling listener — resolve on the next tick.
    setTimeout(() => refreshMusic(), 0);
  });

  bus.on('sfx', (payload) => {
    if (!started) return;
    const name = payload?.name;
    switch (name) {
      case 'bowl':
        playSingingBowl(1.0);
        break;
      case 'bell':
        playBell();
        break;
      case 'light':
        playLampIgnite();
        break;
      case 'monkey':
        playMonkeyChatter();
        break;
      case 'wheel':
        playWheelSpin();
        break;
      case 'step':
        playFootstep();
        break;
      case 'pickup':
        playItemPickup();
        break;
      case 'chant':
        playMantraChant();
        break;
      case 'hit':
        playHit();
        break;
      case 'hurt':
        playHurt();
        break;
      case 'liberate':
        playLiberate();
        break;
      case 'arrow':
        playArrow();
        break;
      case 'fireball':
        playFireball();
        break;
      case 'boulder':
        playBoulder();
        break;
      case 'frost':
        playFrost();
        break;
      case 'dispel':
        playDispel();
        break;
      case 'levelup':
        playLevelUp();
        break;
      case 'faint':
        playFaint();
        break;
      case 'eagle':
        playEagleCry();
        break;
      case 'terma':
        playTermaDrop();
        break;
      case 'pickupGear':
        playPickupGear();
        break;
      case 'potion':
        playPotion();
        break;
      case 'humBolt':
        playHumBolt();
        break;
      case 'phurba':
        playPhurba();
        break;
      case 'vajraBell':
        playVajraBell();
        break;
      case 'lotus':
      case 'lotusShield':
        playLotusShield();
        break;
      case 'summon':
        playSummon();
        break;
      case 'vajraGuru':
      case 'guruMantra':
        playVajraGuru();
        break;
      default:
        break;
    }
  });

  bus.on('achievement', () => {
    if (!started) return;
    playSingingBowl(1.25);
    playBell();
  });

  // ---------------------------------------------------------------- Boss Combat Ritual Drum & Subjugation Chord
  let bossCombatActive = false;
  let bossCurrentPhase = 1;
  let bossDrumTimer = 0;

  function playBossDrum(intense = false) {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Deep Tibetan Nga ritual frame drum thump + subtle low bronze resonance
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    const startFreq = intense ? 112 : 92;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.28);

    const peak = intense ? 0.22 : 0.16;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.45);

    if (noiseBuffer) {
      const src = context.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = intense ? 240 : 170;
      filter.Q.value = 2.4;

      const nGain = context.createGain();
      nGain.gain.setValueAtTime(0.0001, now);
      nGain.gain.linearRampToValueAtTime(intense ? 0.075 : 0.045, now + 0.008);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(masterGain);
      src.start(now, Math.random() * 1.5);
      src.stop(now + 0.14);
    }
  }

  function playBossSubduedChord() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;

    // Long, sacred resonant Tibetan singing bowl harmonic chord
    const freqs = [136.1, 204.15, 272.2, 408.3, 544.4];
    for (let i = 0; i < freqs.length; i++) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freqs[i], now);

      const amp = 0.16 / (i + 1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.08 + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 4.3);
    }
  }

  bus.on('boss:start', ({ id, phase } = {}) => {
    bossCombatActive = true;
    bossCurrentPhase = phase || 1;
    bossDrumTimer = 0.05;
    if (started) playBossDrum(false);
    bossMusic.active = true;
    bossMusic.id = id || null;
    bossMusic.phase = bossCurrentPhase;
    refreshMusic(MUSIC_CFG.bossCrossfade);
  });

  bus.on('boss:phase', ({ phase } = {}) => {
    bossCurrentPhase = phase || 2;
    if (started) playBossDrum(bossCurrentPhase >= 3);
    bossMusic.phase = bossCurrentPhase;
    refreshMusic();
    playMusicStinger('phaseShift');
  });

  bus.on('boss:end', () => {
    bossCombatActive = false;
    bossCurrentPhase = 1;
    bossMusic.active = false;
    refreshMusic(MUSIC_CFG.bossCrossfade);
  });

  bus.on('boss:reset', () => {
    bossCombatActive = false;
    bossCurrentPhase = 1;
    bossMusic.active = false;
    refreshMusic(MUSIC_CFG.bossCrossfade);
  });

  bus.on('boss:subdued', () => {
    // Stinger first, in the boss track's key, before the map theme fades back in.
    playMusicStinger('subdued');
    bossCombatActive = false;
    bossCurrentPhase = 1;
    bossMusic.active = false;
    if (started) playBossSubduedChord();
    refreshMusic(MUSIC_CFG.bossCrossfade * 2);
  });

  // Chapter "Pure Vision" intro card, chapter completion banner, quest flags
  bus.on('chapter:intro', () => {
    setTimeout(() => playMusicStinger('vision'), 0);
  });
  bus.on('chapter:banner', () => playMusicStinger('chapterComplete'));
  bus.on('flag:set', () => refreshMusic());
  bus.on('quest:complete', () => refreshMusic());

  // Talking with Guru Rinpoche's pure-vision NPCs → Vajra Guru leitmotif
  bus.on('dialogue:open', ({ npcId } = {}) => {
    if (typeof npcId === 'string' && npcId.startsWith('guruVision')) playMusicStinger('guru');
  });

  bus.on('player:faint', () => {
    if (music && canPlayMusic()) music.duck(MUSIC_CFG.faintDuck, MUSIC_CFG.faintDuckSeconds, 2.5);
  });

  // Ch.4 Samye: "built by day, torn down by night"
  bus.on('samye:nightStarted', () => { samyeSiege = true; refreshMusic(MUSIC_CFG.bossCrossfade * 2); });
  bus.on('samye:nightSurvived', () => { samyeSiege = false; refreshMusic(); });

  // Ch.5 Finale credits overlay
  bus.on('credits:opened', () => { creditsOpen = true; refreshMusic(1.5); });
  bus.on('credits:closed', () => { creditsOpen = false; refreshMusic(2.0); });

  function getAmbienceProfile(mapId = state.zone) {
    const mapDef = ctx.world?.getMap(mapId);
    const amb = mapDef?.ambience || (mapId === 'stupa' ? 'stupa' : 'wild');
    return amb === 'stupa' ? 'stupa' : 'wild';
  }

  // Crossfade between Stupa and Wilderness ambient profiles on zone change (~0.8s transition)
  bus.on('zone:change', ({ to }) => {
    if (to !== 'samye') samyeSiege = false;
    if (!ac || !started) return;
    const now = ac.currentTime;
    const isWildAmbience = (getAmbienceProfile(to) !== 'stupa');

    // Crossfade warm Om harmonic drone pad (diminishes in deep wilderness)
    const targetDrone = isWildAmbience ? 0.004 : 0.048;
    droneGain.gain.setTargetAtTime(targetDrone, now, 0.28);

    // Highland wind resonant filter Q modulation
    const targetQ = isWildAmbience ? 3.6 : 2.8;
    windFilter.Q.setTargetAtTime(targetQ, now, 0.28);

    // Crossfade the score to the new map's theme
    refreshMusic();
  });

  // ---------------------------------------------------------------- update
  let eagleTimer = 14 + Math.random() * 6;   // ~12–20s in wilderness
  let stupaBellTimer = 10 + Math.random() * 10; // ~10–20s initial chime in stupa plaza

  function update(dt) {
    if (!ac || !started) return;

    // Periodically re-resolve the score track (day/night, quest-flag variants)
    musicRefreshTimer -= dt;
    if (musicRefreshTimer <= 0) {
      musicRefreshTimer = MUSIC_CFG.refreshInterval;
      refreshMusic();
    }

    const windStrength = state.wind?.strength ?? 0.5;
    const nightFactor = state.time?.nightFactor ?? 0;
    const isWildAmbience = (getAmbienceProfile(state.zone) !== 'stupa');

    // Modulate ambient wind filter & gain by zone profile and wind strength
    const now = ac.currentTime;
    const targetWindFreq = isWildAmbience ? (340 + windStrength * 520) : (220 + windStrength * 340);
    const targetWindGain = isWildAmbience ? (0.13 + windStrength * 0.24) : (0.06 + windStrength * 0.14);
    windFilter.frequency.setTargetAtTime(targetWindFreq, now, 0.2);
    windGain.gain.setTargetAtTime(targetWindGain, now, 0.2);

    // Periodic Himalayan eagle / hawk cry in wilderness (~12–20s)
    if (isWildAmbience && state.mode === 'play') {
      eagleTimer -= dt;
      if (eagleTimer <= 0) {
        eagleTimer = 12 + Math.random() * 8;
        playEagleCry();
      }
    } else {
      eagleTimer = 12 + Math.random() * 6;
    }

    // Periodic serene distant temple bell in Stupa plaza
    if (!isWildAmbience && state.mode === 'play') {
      stupaBellTimer -= dt;
      if (stupaBellTimer <= 0) {
        stupaBellTimer = 25 + Math.random() * 20;
        playDistantBell();
      }
    }

    // Subtle night cricket chirps
    cricketGain.gain.setTargetAtTime(nightFactor, now, 0.25);
    if (nightFactor > 0.25) {
      cricketTimer -= dt;
      if (cricketTimer <= 0) {
        cricketTimer = 0.55 + Math.random() * 1.6;
        playCricketChirp(nightFactor);
      }
    }

    // Layered ritual drum pulse during Boss combat (speeds up in Phase 3).
    // When the adaptive score is playing, its cham-dance boss track replaces this loop.
    if (bossCombatActive && state.mode === 'play' && !canPlayMusic()) {
      bossDrumTimer -= dt;
      if (bossDrumTimer <= 0) {
        const isPhase3 = bossCurrentPhase >= 3;
        bossDrumTimer = isPhase3 ? 0.58 : 1.05;
        playBossDrum(isPhase3);
      }
    }
  }

  function saveAudioSettings() {
    if (ctx.save) {
      const settings = ctx.save.get('settings', {});
      settings.muted = muted;
      settings.volume = volume;
      settings.music = musicEnabled;
      settings.musicVolume = musicVolume;
      ctx.save.set('settings', settings);
    } else {
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
        localStorage.setItem(VOL_STORAGE_KEY, String(volume));
      } catch { /* ignore */ }
    }
  }

  function emitAudioChange() {
    bus.emit('audio:change', { muted, volume, music: musicEnabled, musicVolume });
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    saveAudioSettings();
    if (!muted && state.mode === 'play') ensureContext();
    applyMasterGain();
    refreshMusic();
    emitAudioChange();
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, Number(v) || 0));
    saveAudioSettings();
    applyMasterGain();
    emitAudioChange();
  }

  function setMusicEnabled(next) {
    musicEnabled = Boolean(next);
    saveAudioSettings();
    if (musicEnabled && state.mode === 'play') ensureContext();
    applyMusicVolume();
    refreshMusic(1.5);
    emitAudioChange();
  }

  function setMusicVolume(v) {
    musicVolume = Math.max(0, Math.min(1, Number(v) || 0));
    saveAudioSettings();
    applyMusicVolume();
    emitAudioChange();
  }

  const api = {
    update,
    isMuted() { return muted; },
    setMuted,
    toggleMute,
    getVolume() { return volume; },
    setVolume,
    isMusicEnabled() { return musicEnabled; },
    setMusicEnabled,
    toggleMusic() { setMusicEnabled(!musicEnabled); return musicEnabled; },
    getMusicVolume() { return musicVolume; },
    setMusicVolume,
    /** Current score track `{ id, vars, root }` or null. */
    getMusicTrack() { return music?.getCurrent() ?? null; },
    /** Debug: force a score track (`null` restores automatic selection). */
    forceMusic(id, vars = {}) {
      musicForced = id ? { id, vars } : null;
      refreshMusic(1.0);
    },
    /** Debug: fire a score stinger ('vision' | 'chapterComplete' | 'subdued' | 'guru' | 'phaseShift'). */
    playMusicStinger,
    playEagleCry,
    playDistantBell,
    playBossDrum,
    playBossSubduedChord,
  };

  ctx.audio = api;
  return api;
}
