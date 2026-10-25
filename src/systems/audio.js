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
