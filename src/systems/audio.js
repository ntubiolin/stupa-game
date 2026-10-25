/**
 * Web Audio procedural soundscape — synthesized Tibetan singing bowl, prayer bell,
 * butter-lamp ignition whoosh, rhesus macaque FM chirps, prayer-wheel clicks,
 * soft stone footsteps, wind-modulated bandpass noise, subtle "Om" harmonic pad,
 * and nocturnal crickets. Zero external audio files.
 */
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

  try {
    muted = localStorage.getItem(MUTE_STORAGE_KEY) === '1';
    const savedVol = parseFloat(localStorage.getItem(VOL_STORAGE_KEY));
    if (!Number.isNaN(savedVol)) volume = Math.max(0, Math.min(1, savedVol));
  } catch { /* ignore */ }

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

  function ensureContext() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      return ac;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    ac = new AudioCtx();
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

    // 2. Subtle warm "Om" harmonic drone pad (108 Hz fundamental + fifth + octave)
    droneGain = ac.createGain();
    droneGain.gain.value = 0.032;

    const droneFilter = ac.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 380;
    droneFilter.connect(droneGain);
    droneGain.connect(masterGain);

    const droneFreqs = [108, 162, 216, 108.4];
    const droneAmps = [0.45, 0.25, 0.15, 0.25];
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

  function playMantraChant() {
    const context = ensureContext();
    if (!context || muted) return;
    const now = context.currentTime;
    const dur = 0.62;

    // Resonant Tibetan throat-singing "Om" chant (~0.6s)
    // Low fundamental (~108 Hz sawtooth + 54 Hz sub-octave triangle + 162 Hz fifth)
    const voiceGain = context.createGain();
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(0.36, now + 0.08);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // Formant bandpass filters (~320 Hz and ~720 Hz for "O-M" resonance)
    const formant1 = context.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(320, now);
    formant1.frequency.linearRampToValueAtTime(260, now + dur);
    formant1.Q.value = 4.5;

    const formant2 = context.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(720, now);
    formant2.frequency.linearRampToValueAtTime(540, now + dur);
    formant2.Q.value = 5.0;

    const sources = [
      { type: 'sawtooth', freq: 108, gain: 0.28 },
      { type: 'triangle', freq: 54, gain: 0.35 },
      { type: 'sine', freq: 162, gain: 0.20 },
    ];

    for (const s of sources) {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = s.type;
      osc.frequency.setValueAtTime(s.freq, now);
      osc.frequency.linearRampToValueAtTime(s.freq * 0.98, now + dur);
      g.gain.value = s.gain;
      osc.connect(g);
      g.connect(formant1);
      g.connect(formant2);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    }

    formant1.connect(voiceGain);
    formant2.connect(voiceGain);
    voiceGain.connect(masterGain);

    // Soft singing-bowl harmonic shimmer
    const shimmerGain = context.createGain();
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.linearRampToValueAtTime(0.08, now + 0.04);
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

  // ---------------------------------------------------------------- bus listeners
  bus.on('game:start', () => {
    ensureContext();
    playSingingBowl(1.0);
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
      default:
        break;
    }
  });

  bus.on('achievement', () => {
    if (!started) return;
    playSingingBowl(1.25);
    playBell();
  });

  // ---------------------------------------------------------------- update
  function update(dt) {
    if (!ac || !started) return;

    const windStrength = state.wind?.strength ?? 0.5;
    const nightFactor = state.time?.nightFactor ?? 0;

    // Modulate ambient wind filter & gain by state.wind.strength
    const now = ac.currentTime;
    const targetWindFreq = 220 + windStrength * 340;
    const targetWindGain = 0.06 + windStrength * 0.14;
    windFilter.frequency.setTargetAtTime(targetWindFreq, now, 0.15);
    windGain.gain.setTargetAtTime(targetWindGain, now, 0.15);

    // Subtle night cricket chirps
    cricketGain.gain.setTargetAtTime(nightFactor, now, 0.25);
    if (nightFactor > 0.25) {
      cricketTimer -= dt;
      if (cricketTimer <= 0) {
        cricketTimer = 0.55 + Math.random() * 1.6;
        playCricketChirp(nightFactor);
      }
    }
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    try { localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
    if (!muted && state.mode === 'play') ensureContext();
    applyMasterGain();
    bus.emit('audio:change', { muted, volume });
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, Number(v) || 0));
    try { localStorage.setItem(VOL_STORAGE_KEY, String(volume)); } catch { /* ignore */ }
    applyMasterGain();
    bus.emit('audio:change', { muted, volume });
  }

  const api = {
    update,
    isMuted() { return muted; },
    setMuted,
    toggleMute,
    getVolume() { return volume; },
    setVolume,
  };

  ctx.audio = api;
  return api;
}
