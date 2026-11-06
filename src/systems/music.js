/**
 * Procedural adaptive music engine — 蓮師朝聖配樂引擎.
 *
 * Zero audio files: every instrument is synthesized with the Web Audio API.
 *  - Tibetan / Himalayan instrument voices: lingbu bamboo flute, dranyen lute
 *    (Karplus-Strong), tanpura, singing bowl, tingsha, yak bell, nga frame drum,
 *    damaru, tabla, rolmo / silnyen cymbals, dungchen long horn, gyaling shawm,
 *    gyuke deep monastic chant, ice chimes, rain drops, thunder.
 *  - Bar-based look-ahead sequencer driven by score data (`src/data/music.js`).
 *  - Crossfading track instances, live variables (night / boss phase), stingers
 *    with ducking, and a shared algorithmic reverb.
 *
 * The engine is context-agnostic so it can run inside the game (`audio.js`), in
 * the standalone `music-lab.html` audition page, or in an OfflineAudioContext.
 */

const DEFAULTS = {
  tuningA4: 432,
  volume: 0.5,
  crossfade: 3.0,
  lookahead: 0.9,
  tickMs: 60,
  reverbSeconds: 3.6,
  reverbWet: 0.32,
  duckLevel: 0.28,
};

export function createMusicEngine({ ac, destination, noiseBuffer = null, tracks = {}, stingers = {}, config = {} }) {
  const cfg = { ...DEFAULTS, ...config };
  const mtof = (m) => cfg.tuningA4 * 2 ** ((m - 69) / 12);
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------- shared noise
  const noise = noiseBuffer || makeNoiseBuffer(ac, 3);

  // ---------------------------------------------------------------- master chain
  const out = ac.createGain();
  out.gain.value = cfg.volume;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.01;
  comp.release.value = 0.35;
  out.connect(comp);
  comp.connect(destination);

  const convolver = ac.createConvolver();
  convolver.buffer = makeImpulse(ac, cfg.reverbSeconds);
  const reverbOut = ac.createGain();
  reverbOut.gain.value = cfg.reverbWet;
  convolver.connect(reverbOut);
  reverbOut.connect(out);

  // Tracks pass through a duck stage; stingers bypass it.
  const trackDry = ac.createGain();
  const trackWet = ac.createGain();
  trackDry.connect(out);
  trackWet.connect(convolver);
  const stingDry = ac.createGain();
  const stingWet = ac.createGain();
  stingDry.connect(out);
  stingWet.connect(convolver);

  // ---------------------------------------------------------------- utilities
  function route(bus, node, send = 0.4) {
    node.connect(bus.dry);
    if (send > 0) {
      const s = ac.createGain();
      s.gain.value = send;
      node.connect(s);
      s.connect(bus.wet);
    }
  }

  function osc(type, freq, t) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    return o;
  }

  function gainNode(v = 0) {
    const g = ac.createGain();
    g.gain.value = v;
    return g;
  }

  function noiseSrc(t, dur) {
    const s = ac.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    s.start(t, Math.random() * Math.max(0.01, noise.duration - 0.5));
    s.stop(t + dur);
    return s;
  }

  function biquad(type, freq, q = 1) {
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  // Percussive envelope: fast attack then exponential decay.
  function percEnv(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  // Sustained envelope: attack → sustain → release (starting at t + dur).
  function susEnv(g, t, dur, peak, attack, release, sustain = 0.85) {
    const a = Math.min(attack, dur * 0.6);
    const relStart = t + Math.max(dur, a + 0.01);
    const p = Math.max(0.0002, peak);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(p, t + a);
    if (dur > a + 0.05) g.gain.linearRampToValueAtTime(Math.max(0.0002, peak * sustain), t + dur);
    else g.gain.setValueAtTime(p, relStart); // explicit anchor before the release curve
    g.gain.setTargetAtTime(0.0001, relStart, release / 3);
  }

  /** Pitch articulation: grace note from above/below, legato glide, or scoop. */
  function applyPitch(param, t, f, o) {
    if (o.grace) {
      param.setValueAtTime(f * 2 ** (o.grace / 12), t);
      param.setValueAtTime(f, t + (o.graceTime ?? 0.06));
    } else if (o.glideFrom != null) {
      // Scale the glide origin by the partial multiplier (f / fundamental) so overtones glide too.
      const gf = mtof(o.glideFrom) * (o.m != null ? f / mtof(o.m) : 1);
      param.setValueAtTime(gf, t);
      param.exponentialRampToValueAtTime(f, t + (o.glideTime ?? 0.09));
    } else if (o.scoop) {
      param.setValueAtTime(f * 2 ** (-o.scoop / 12), t);
      param.exponentialRampToValueAtTime(f, t + (o.scoopTime ?? 0.12));
    } else {
      param.setValueAtTime(f, t);
    }
  }

  // ---------------------------------------------------------------- Karplus-Strong cache
  const ksCache = new Map();
  function ksBuffer(m, seconds, damp, bright) {
    const key = `${m}|${seconds}|${damp}|${bright}`;
    const hit = ksCache.get(key);
    if (hit) return hit;
    const sr = ac.sampleRate;
    const f = mtof(m);
    const N = Math.max(2, Math.round(sr / f - 0.5));
    const len = Math.floor(sr * seconds);
    const buf = ac.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < N; i++) {
      last += bright * ((Math.random() * 2 - 1) - last);
      d[i] = last * 0.9;
    }
    for (let i = N; i < len; i++) {
      d[i] = damp * 0.5 * (d[i - N] + d[i - N - 1 < 0 ? 0 : i - N - 1]);
    }
    // Averaging filter adds half a sample of delay → correct pitch via playbackRate.
    const entry = { buf, rate: f / (sr / (N + 0.5)) };
    ksCache.set(key, entry);
    return entry;
  }

  // ================================================================ INSTRUMENTS
  // Every instrument: (bus, t, ...) — `bus` = { dry, wet }.

  /** 林布竹笛 Lingbu bamboo flute — breathy sine voice with delayed vibrato & ornaments. */
  function flute(bus, t, m, dur, vel = 0.8, o = {}) {
    const f = mtof(m);
    const rel = o.release ?? 0.25;
    const end = t + dur + rel + 0.15;
    const env = gainNode();
    susEnv(env, t, dur, vel * 0.15, o.attack ?? 0.07, rel, 0.82);

    const o1 = osc('sine', f, t);
    const o2 = osc('triangle', f * 2, t);
    const o3 = osc('sine', f * 3, t);
    applyPitch(o1.frequency, t, f, { ...o, m });
    applyPitch(o2.frequency, t, f * 2, { ...o, m });
    const g2 = gainNode(0.09);
    const g3 = gainNode(0.035);
    o1.connect(env);
    o2.connect(g2); g2.connect(env);
    o3.connect(g3); g3.connect(env);

    // Delayed vibrato
    const lfo = osc('sine', (o.vibRate ?? 5.0) + rand(-0.3, 0.3), t);
    const vib = gainNode(0);
    vib.gain.setValueAtTime(0, t);
    vib.gain.linearRampToValueAtTime(f * (o.vib ?? 0.009), t + Math.min(0.5, dur * 0.7) + 0.01);
    const vib2 = gainNode(2);
    lfo.connect(vib);
    vib.connect(o1.frequency);
    vib.connect(vib2); vib2.connect(o2.frequency);

    // Breath noise
    const breath = o.breath ?? 1;
    if (breath > 0) {
      const ns = noiseSrc(t, dur + rel + 0.1);
      const bp = biquad('bandpass', Math.min(9000, f * 1.6), 0.8);
      const bg = gainNode();
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.linearRampToValueAtTime(vel * 0.11 * breath, t + 0.03);
      bg.gain.linearRampToValueAtTime(vel * 0.025 * breath, t + 0.12);
      bg.gain.setValueAtTime(vel * 0.025 * breath, t + Math.max(dur, 0.13)); // anchor before release
      bg.gain.setTargetAtTime(0.0001, t + Math.max(dur, 0.13), rel / 3);
      ns.connect(bp); bp.connect(bg); bg.connect(env);
    }

    route(bus, env, o.send ?? 0.6);
    for (const node of [o1, o2, o3, lfo]) { node.start(t); node.stop(end); }
  }

  /** 札木聶 Dranyen lute pluck (Karplus-Strong). */
  function pluck(bus, t, m, dur, vel = 0.7, o = {}) {
    const seconds = o.seconds ?? 1.6;
    const { buf, rate } = ksBuffer(m, seconds, o.damp ?? 0.9965, o.bright ?? 0.55);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const lp = biquad('lowpass', o.cutoff ?? 3400, 0.7);
    const g = gainNode(vel * (o.gain ?? 0.55));
    if (o.mute && dur) g.gain.setTargetAtTime(0.0001, t + dur, 0.06);
    src.connect(lp); lp.connect(g);
    route(bus, g, o.send ?? 0.35);
    src.start(t);
    src.stop(t + seconds / rate);
  }

  /** 坦普拉 Tanpura — long, buzzy Karplus-Strong string. */
  function tanpura(bus, t, m, vel = 0.5) {
    pluck(bus, t, m, 0, vel, { seconds: 3.2, damp: 0.9988, bright: 0.85, cutoff: 2200, gain: 0.5, send: 0.45 });
  }

  /** 頌缽 Singing bowl — inharmonic beating partials. */
  function bowl(bus, t, m, vel = 0.6, o = {}) {
    const f = mtof(m);
    const partials = [
      [1, 0.2, 6.5, 0.7], [2.756, 0.11, 4.6, 1.5], [5.18, 0.05, 3.0, 2.4],
    ];
    const g = gainNode(vel);
    const k0 = o.decay ?? 1;
    for (const [ratio, amp, decay, beat] of partials) {
      for (let k = 0; k < 2; k++) {
        const o1 = osc('sine', f * ratio + (k ? beat : 0), t);
        const e = gainNode();
        percEnv(e, t, amp * 0.5, 0.03, decay * k0);
        o1.connect(e); e.connect(g);
        o1.start(t); o1.stop(t + decay * k0 + 0.1);
      }
    }
    route(bus, g, o.send ?? 0.5);
  }

  /** 叮夏 Tingsha — bright high beating cymbal pair. */
  function tingsha(bus, t, m, vel = 0.5) {
    const f = mtof(m);
    const g = gainNode(vel);
    const spec = [[f, 0.1, 3.2], [f * 1.0045, 0.08, 3.0], [f * 2.71, 0.03, 1.4]];
    for (const [fr, amp, decay] of spec) {
      const o1 = osc('sine', fr, t);
      const e = gainNode();
      percEnv(e, t, amp, 0.004, decay);
      o1.connect(e); e.connect(g);
      o1.start(t); o1.stop(t + decay + 0.05);
    }
    route(bus, g, 0.55);
  }

  /** 冰晶風鈴 Ice chime — glassy sine + inharmonic glint. */
  function chime(bus, t, m, vel = 0.4) {
    const f = mtof(m);
    const g = gainNode(vel);
    const spec = [[f, 0.07, 2.4, 'sine'], [f * 4.07, 0.018, 0.6, 'sine'], [f * 2.0, 0.02, 1.2, 'triangle']];
    for (const [fr, amp, decay, type] of spec) {
      const o1 = osc(type, fr, t);
      const e = gainNode();
      percEnv(e, t, amp, 0.003, decay);
      o1.connect(e); e.connect(g);
      o1.start(t); o1.stop(t + decay + 0.05);
    }
    route(bus, g, 0.7);
  }

  /** 犛牛鈴 Yak bell — hollow, clanky inharmonic metal. */
  function yakBell(bus, t, m, vel = 0.4) {
    const f = mtof(m);
    const g = gainNode(vel);
    const spec = [[1, 0.06, 0.7], [1.51, 0.035, 0.45], [2.47, 0.025, 0.3], [3.93, 0.012, 0.18]];
    for (const [ratio, amp, decay] of spec) {
      const o1 = osc('sine', f * ratio * rand(0.997, 1.003), t);
      const e = gainNode();
      percEnv(e, t, amp, 0.002, decay);
      o1.connect(e); e.connect(g);
      o1.start(t); o1.stop(t + decay + 0.05);
    }
    const ns = noiseSrc(t, 0.05);
    const bp = biquad('bandpass', f * 3, 3);
    const ng = gainNode();
    percEnv(ng, t, 0.05, 0.001, 0.03);
    ns.connect(bp); bp.connect(ng); ng.connect(g);
    route(bus, g, 0.3);
  }

  /** 鼓 Nga — large Tibetan frame drum. */
  function nga(bus, t, vel = 0.7, o = {}) {
    const p = o.pitch ?? 64;
    const decay = o.decay ?? 0.75;
    const g = gainNode(1);
    const o1 = osc('sine', p * 2.3, t);
    o1.frequency.exponentialRampToValueAtTime(p, t + 0.07);
    const e1 = gainNode();
    percEnv(e1, t, vel * 0.55, 0.005, decay);
    o1.connect(e1); e1.connect(g);
    const o2 = osc('triangle', p * 1.52, t);
    const e2 = gainNode();
    percEnv(e2, t, vel * 0.12, 0.004, decay * 0.4);
    o2.connect(e2); e2.connect(g);
    const ns = noiseSrc(t, 0.15);
    const lp = biquad('lowpass', o.skin ?? 1100, 0.8);
    const ng = gainNode();
    percEnv(ng, t, vel * 0.22, 0.002, 0.07);
    ns.connect(lp); lp.connect(ng); ng.connect(g);
    route(bus, g, o.send ?? 0.25);
    o1.start(t); o1.stop(t + decay + 0.1);
    o2.start(t); o2.stop(t + decay + 0.1);
  }

  /** 達瑪如 Damaru — small hourglass drum (double strike). */
  function damaru(bus, t, vel = 0.5) {
    for (let k = 0; k < 2; k++) {
      const tk = t + k * 0.065;
      const v = vel * (k ? 0.75 : 1);
      const o1 = osc('sine', 300, tk);
      o1.frequency.exponentialRampToValueAtTime(190, tk + 0.05);
      const e = gainNode();
      percEnv(e, tk, v * 0.28, 0.002, 0.13);
      const ns = noiseSrc(tk, 0.06);
      const bp = biquad('bandpass', 1900, 1.4);
      const ng = gainNode();
      percEnv(ng, tk, v * 0.16, 0.001, 0.045);
      o1.connect(e); ns.connect(bp); bp.connect(ng);
      route(bus, e, 0.25);
      route(bus, ng, 0.25);
      o1.start(tk); o1.stop(tk + 0.16);
    }
  }

  /** 塔布拉 Tabla — 'na' | 'tin' | 'ge' | 'dha' | 'ke'. */
  function tabla(bus, t, stroke = 'na', vel = 0.6, o = {}) {
    const p = o.pitch ?? 560;
    const g = gainNode(1);
    const dayan = (amp, decay) => {
      const o1 = osc('sine', p, t);
      const o2 = osc('sine', p * 2.02, t);
      const e1 = gainNode(); percEnv(e1, t, vel * amp, 0.002, decay);
      const e2 = gainNode(); percEnv(e2, t, vel * amp * 0.3, 0.002, decay * 0.5);
      o1.connect(e1); e1.connect(g); o2.connect(e2); e2.connect(g);
      o1.start(t); o1.stop(t + decay + 0.05);
      o2.start(t); o2.stop(t + decay + 0.05);
      const ns = noiseSrc(t, 0.03);
      const bp = biquad('bandpass', 3200, 1.5);
      const ng = gainNode(); percEnv(ng, t, vel * 0.09, 0.001, 0.02);
      ns.connect(bp); bp.connect(ng); ng.connect(g);
    };
    const bayan = (amp) => {
      // Characteristic upward "ge" pitch bend of the bass drum.
      const o1 = osc('sine', 82, t);
      o1.frequency.exponentialRampToValueAtTime(118, t + 0.2);
      const e = gainNode(); percEnv(e, t, vel * amp, 0.004, 0.55);
      o1.connect(e); e.connect(g);
      o1.start(t); o1.stop(t + 0.62);
    };
    if (stroke === 'na') dayan(0.2, 0.45);
    else if (stroke === 'tin') dayan(0.12, 0.25);
    else if (stroke === 'ge') bayan(0.42);
    else if (stroke === 'dha') { dayan(0.18, 0.45); bayan(0.38); }
    else if (stroke === 'ke') {
      const ns = noiseSrc(t, 0.08);
      const lp = biquad('lowpass', 700, 0.7);
      const ng = gainNode(); percEnv(ng, t, vel * 0.25, 0.001, 0.05);
      ns.connect(lp); lp.connect(ng); ng.connect(g);
    }
    route(bus, g, 0.22);
  }

  /** 鈸 Rolmo (crash) / Silnyen (ringing) / tick cymbals. */
  function cymbal(bus, t, vel = 0.5, kind = 'rolmo') {
    const decay = kind === 'silnyen' ? 4.2 : kind === 'tick' ? 0.14 : 2.2;
    const attack = kind === 'silnyen' ? 0.05 : 0.003;
    const g = gainNode(1);
    const ns = noiseSrc(t, decay + 0.1);
    const hp = biquad('highpass', kind === 'silnyen' ? 3800 : 2400, 0.7);
    const bp = biquad('bandpass', kind === 'silnyen' ? 6800 : 5200, 0.6);
    const ng = gainNode();
    percEnv(ng, t, vel * (kind === 'silnyen' ? 0.1 : 0.2), attack, decay);
    ns.connect(hp); hp.connect(bp); bp.connect(ng); ng.connect(g);
    if (kind !== 'tick') {
      const mhp = biquad('highpass', 1800, 0.7);
      const mg = gainNode();
      percEnv(mg, t, vel * 0.035, attack, decay * 0.8);
      for (const fr of [523, 789, 1173]) {
        const o1 = osc('square', fr * (kind === 'silnyen' ? 1.5 : 1), t);
        o1.connect(mhp);
        o1.start(t); o1.stop(t + decay + 0.1);
      }
      mhp.connect(mg); mg.connect(g);
    }
    route(bus, g, 0.45);
  }

  /** 銅欽 Dungchen — pair of 3 m long horns: deep brassy drone with growl. */
  function dungchen(bus, t, m, dur, vel = 0.7, o = {}) {
    const f = mtof(m);
    const end = t + dur + 1.2;
    const env = gainNode();
    susEnv(env, t, dur, vel * 0.3, o.attack ?? 0.35, 0.9, 0.9);
    const bright = o.bright ?? 720;
    const lp = biquad('lowpass', 160, 3.5);
    lp.frequency.setValueAtTime(160, t);
    lp.frequency.linearRampToValueAtTime(bright, t + 0.5);
    lp.frequency.linearRampToValueAtTime(bright * 0.7, t + Math.max(0.6, dur));
    const fm = biquad('bandpass', 430, 2.5);
    const fmg = gainNode(0.6);
    for (const det of [1, 1.0045]) {
      const o1 = osc('sawtooth', f * det * 0.9, t);
      o1.frequency.exponentialRampToValueAtTime(f * det, t + 0.28);
      o1.connect(lp); o1.connect(fm);
      o1.start(t); o1.stop(end);
    }
    lp.connect(env); fm.connect(fmg); fmg.connect(env);
    // Growl (amplitude roughness)
    const lfo = osc('sine', o.growl ?? 23, t);
    const lg = gainNode(vel * 0.06);
    lfo.connect(lg); lg.connect(env.gain);
    lfo.start(t); lfo.stop(end);
    route(bus, env, o.send ?? 0.4);
  }

  /** 甲林 Gyaling — nasal double-reed shawm with heavy ornamentation. */
  function gyaling(bus, t, m, dur, vel = 0.6, o = {}) {
    const f = mtof(m);
    const end = t + dur + 0.3;
    const env = gainNode();
    susEnv(env, t, dur, vel * 0.075, 0.03, 0.09, 0.9);
    const bp = biquad('bandpass', o.formant ?? 1500, 1.0);
    const pk = biquad('peaking', 2700, 2);
    pk.gain.value = 6;
    const lp = biquad('lowpass', 4600, 0.7);
    const o1 = osc('sawtooth', f, t);
    const o2 = osc('square', f, t);
    applyPitch(o1.frequency, t, f, { ...o, m });
    applyPitch(o2.frequency, t, f, { ...o, m });
    const g2 = gainNode(0.4);
    o1.connect(bp); o2.connect(g2); g2.connect(bp);
    bp.connect(pk); pk.connect(lp); lp.connect(env);
    const dry = gainNode(0.25);
    o1.connect(dry); dry.connect(lp);
    const lfo = osc('sine', o.vibRate ?? 6.3, t);
    const vib = gainNode(0);
    vib.gain.setValueAtTime(0, t);
    vib.gain.linearRampToValueAtTime(f * (o.vib ?? 0.016), t + Math.min(0.35, dur * 0.6) + 0.01);
    lfo.connect(vib); vib.connect(o1.frequency); vib.connect(o2.frequency);
    route(bus, env, o.send ?? 0.45);
    for (const node of [o1, o2, lfo]) { node.start(t); node.stop(end); }
  }

  const VOWELS = {
    o: [430, 820, 2400], a: [720, 1150, 2600], u: [330, 700, 2300], m: [260, 520, 2200],
  };
  /** 低音誦經 Gyuke chant — deep monastic voice with formant filters. Vowel 'om' closes o→m. */
  function chant(bus, t, m, dur, vel = 0.6, vowel = 'om') {
    const f = mtof(m);
    const end = t + dur + 0.9;
    const env = gainNode();
    susEnv(env, t, dur, vel * 0.5, 0.28, 0.6, 0.9);
    const start = VOWELS[vowel === 'om' ? 'o' : vowel] || VOWELS.o;
    const target = vowel === 'om' ? VOWELS.m : start;
    const src = gainNode(1);
    for (const [ratio, type, amp] of [[1, 'sawtooth', 0.5], [1.003, 'sawtooth', 0.4], [0.5, 'sine', 0.5]]) {
      const o1 = osc(type, f * ratio, t);
      const g = gainNode(amp);
      o1.connect(g); g.connect(src);
      o1.start(t); o1.stop(end);
    }
    const q = [7, 9, 10];
    const amps = [1, 0.55, 0.18];
    for (let i = 0; i < 3; i++) {
      const bp = biquad('bandpass', start[i], q[i]);
      if (target !== start) {
        bp.frequency.setValueAtTime(start[i], t + dur * 0.55);
        bp.frequency.linearRampToValueAtTime(target[i], t + dur * 0.8);
      }
      const g = gainNode(amps[i]);
      src.connect(bp); bp.connect(g); g.connect(env);
    }
    route(bus, env, 0.55);
  }

  /**
   * 12-syllable Vajra Guru Mantra formant table:
   * ཨོཾ (om) · ཨཱཿ (ah) · ཧཱུྃ (hum) · བཛྲ (ben-za) · གུ་རུ (gu-ru) · པདྨ (pe-ma) · སིདྡྷི (sid-dhi) · ཧཱུྃ (hum)
   */
  const MANTRA_SYLLABLES = {
    om:  { f0: [420, 780, 2400], f1: [260, 520, 2150], split: 0.55, attack: 0.14 },
    ah:  { f0: [730, 1180, 2600], f1: [690, 1140, 2550], split: 0.7, attack: 0.1, breath: 0.04 },
    hum: { f0: [330, 690, 2300], f1: [255, 530, 2150], split: 0.58, attack: 0.11, onset: 'h' },
    ben: { f0: [490, 1680, 2500], f1: [290, 1420, 2380], split: 0.65, attack: 0.045, scoop: 1.5 },
    za:  { f0: [690, 1160, 2560], f1: [680, 1140, 2540], split: 0.7, attack: 0.04, onset: 'z' },
    gu:  { f0: [330, 720, 2320], f1: [320, 700, 2300], split: 0.7, attack: 0.05, scoop: 1.2 },
    ru:  { f0: [380, 1120, 1950], f1: [340, 750, 2320], split: 0.22, attack: 0.045 },
    pe:  { f0: [510, 1740, 2520], f1: [490, 1680, 2500], split: 0.7, attack: 0.035, onset: 'p' },
    ma:  { f0: [270, 560, 2180], f1: [720, 1180, 2600], split: 0.22, attack: 0.05 },
    sid: { f0: [310, 2080, 2860], f1: [295, 1960, 2780], split: 0.7, attack: 0.04, onset: 's' },
    dhi: { f0: [315, 2140, 2900], f1: [310, 2100, 2860], split: 0.7, attack: 0.045, onset: 'h' },
  };

  /**
   * 蓮師心咒十二音節梵音合成 — Articulates a mantra syllable ('om'|'ah'|'hum'|'ben'|'za'|'gu'|'ru'|'pe'|'ma'|'sid'|'dhi')
   * in one of three vocal styles (`o.voice`: 'umdze' | 'choir' | 'dakini').
   */
  function mantraVoice(bus, t, m, dur, vel = 0.65, o = {}) {
    const syl = MANTRA_SYLLABLES[o.syllable || 'om'] || MANTRA_SYLLABLES.om;
    const voice = o.voice || 'choir'; // 'umdze' (deep overtone) | 'choir' (monastic unison) | 'dakini' (female devotional)
    const f = mtof(m);
    const rel = o.release ?? (voice === 'dakini' ? 0.32 : 0.45);
    const end = t + dur + rel + 0.2;
    const env = gainNode();
    const peakScale = voice === 'dakini' ? 0.34 : voice === 'umdze' ? 0.48 : 0.42;
    susEnv(env, t, dur, vel * peakScale, o.attack ?? syl.attack ?? 0.08, rel, 0.86);

    // Glottal oscillator bank tailored to vocal timbre
    const src = gainNode(1);
    const oscSpecs =
      voice === 'dakini'
        ? [[1, 'sawtooth', 0.36], [1.0025, 'triangle', 0.48], [2, 'sine', 0.22]]
        : voice === 'umdze'
          ? [[1, 'sawtooth', 0.52], [1.003, 'sawtooth', 0.38], [0.5, 'sawtooth', 0.42], [0.5, 'sine', 0.35]]
          : [[1, 'sawtooth', 0.42], [0.9965, 'sawtooth', 0.34], [1.0035, 'sawtooth', 0.34], [0.5, 'triangle', 0.3]];

    // Subtle vocal vibrato
    const lfo = osc('sine', (voice === 'dakini' ? 5.4 : 4.6) + rand(-0.2, 0.2), t);
    const vib = gainNode(0);
    const vibDelay = Math.min(0.28, dur * 0.5);
    vib.gain.setValueAtTime(0, t);
    vib.gain.linearRampToValueAtTime(f * (voice === 'dakini' ? 0.011 : 0.006), t + vibDelay + 0.02);
    lfo.connect(vib);
    lfo.start(t); lfo.stop(end);

    for (const [ratio, type, amp] of oscSpecs) {
      const o1 = osc(type, f * ratio, t);
      applyPitch(o1.frequency, t, f * ratio, { ...o, scoop: o.scoop ?? syl.scoop, m });
      if (ratio === 1 || ratio === 1.0025) vib.connect(o1.frequency);
      const g = gainNode(amp);
      o1.connect(g); g.connect(src);
      o1.start(t); o1.stop(end);
    }

    // Formant filter bank (scaled slightly higher for the female 'dakini' vocal tract)
    const tractScale = voice === 'dakini' ? 1.13 : 1.0;
    const qs = voice === 'dakini' ? [5.5, 7.5, 8.5] : [6.5, 8.5, 9.5];
    const amps = voice === 'dakini' ? [1.0, 0.68, 0.26] : [1.0, 0.58, 0.2];
    const tSplit = t + dur * (syl.split ?? 0.6);
    const tGlideEnd = t + dur * Math.min(0.92, (syl.split ?? 0.6) + 0.24);

    for (let i = 0; i < 3; i++) {
      const fStart = syl.f0[i] * tractScale;
      const fEnd = syl.f1[i] * tractScale;
      const bp = biquad('bandpass', fStart, qs[i]);
      bp.frequency.setValueAtTime(fStart, t);
      if (Math.abs(fEnd - fStart) > 1) {
        bp.frequency.setValueAtTime(fStart, tSplit);
        bp.frequency.linearRampToValueAtTime(fEnd, Math.max(tSplit + 0.02, tGlideEnd));
      }
      const g = gainNode(amps[i]);
      src.connect(bp); bp.connect(g); g.connect(env);
    }

    // Consonant / aspirate onset transient ('s', 'z', 'h', 'p')
    const onset = syl.onset;
    if (onset) {
      const ns = noiseSrc(t, 0.09);
      const freq = onset === 's' ? 5200 : onset === 'z' ? 3600 : onset === 'p' ? 900 : 1800;
      const durOn = onset === 's' ? 0.042 : onset === 'z' ? 0.032 : onset === 'p' ? 0.018 : 0.05;
      const ampOn = onset === 'p' ? 0.05 : 0.065;
      const bp = biquad('bandpass', freq, 2.0);
      const ng = gainNode();
      percEnv(ng, t, vel * ampOn, 0.004, durOn);
      ns.connect(bp); bp.connect(ng); ng.connect(env);
    }

    route(bus, env, o.send ?? 0.62);
  }

  /** 雨滴 Rain drop blip. */
  function rainDrop(bus, t, vel = 0.3) {
    const f = rand(1500, 3400);
    const o1 = osc('sine', f, t);
    o1.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.06);
    const e = gainNode();
    percEnv(e, t, vel * 0.07, 0.002, 0.08);
    o1.connect(e);
    route(bus, e, 0.5);
    o1.start(t); o1.stop(t + 0.1);
  }

  /** 遠雷 Distant thunder rumble. */
  function thunder(bus, t, vel = 0.5) {
    const ns = noiseSrc(t, 4.2);
    const lp = biquad('lowpass', 140, 1.2);
    lp.frequency.setValueAtTime(320, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 3.5);
    const e = gainNode();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.linearRampToValueAtTime(vel * 0.7, t + 0.25);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    ns.connect(lp); lp.connect(e);
    route(bus, e, 0.4);
  }

  /** Sustained pad (drone). Returns a handle with `stop(t, fade)`. */
  function pad(bus, t, spec) {
    const fade = spec.attack ?? 3;
    const level = spec.gain ?? 0.05;
    const g = gainNode();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + fade);
    const cutoff = spec.cutoff ?? 600;
    const lp = biquad('lowpass', cutoff, spec.q ?? 0.8);
    const lfo = osc('sine', spec.lfoRate ?? 0.07, t);
    const lg = gainNode(cutoff * (spec.lfoDepth ?? 0.3));
    lfo.connect(lg); lg.connect(lp.frequency);
    const oscs = [lfo];
    for (const note of spec.notes) {
      const f = mtof(note);
      for (const det of [-(spec.detune ?? 6), spec.detune ?? 6]) {
        const o1 = osc(spec.type ?? 'sawtooth', f, t);
        o1.detune.value = det;
        o1.connect(lp);
        oscs.push(o1);
      }
    }
    if (spec.sub) {
      const o1 = osc('sine', mtof(spec.notes[0] - 12), t);
      const sg = gainNode(spec.sub);
      o1.connect(sg); sg.connect(g);
      oscs.push(o1);
    }
    lp.connect(g);
    route(bus, g, spec.send ?? 0.5);
    for (const o1 of oscs) o1.start(t);
    return {
      stop(t2, f2 = 2) {
        g.gain.cancelScheduledValues(t2);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t2);
        g.gain.setTargetAtTime(0.0001, t2, f2 / 4);
        for (const o1 of oscs) o1.stop(t2 + f2 + 0.5);
      },
    };
  }

  const INSTRUMENTS = {
    flute, pluck, tanpura, bowl, tingsha, chime, yakBell, nga, damaru, tabla, cymbal,
    dungchen, gyaling, chant, mantraVoice, rainDrop, thunder,
  };

  // ================================================================ SCHEDULER API
  /**
   * Builds the per-bar (or per-stinger) helper API handed to score functions.
   * Beats are relative to `t0`. `line()` plays the slice of a multi-bar phrase
   * that falls inside the current bar window (stingers: the whole phrase).
   */
  function makeApi(inst, t0, spb, barInLoop, windowBeats) {
    const bus = inst.bus;
    const at = (beat) => t0 + beat * spb;
    return {
      t0, spb, bar: barInLoop, vars: inst.vars, loop: inst.loop,
      rand,
      chance: (p) => Math.random() < p,
      pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
      flute: (b, m, d, v, o) => flute(bus, at(b), m, d * spb, v, o),
      pluck: (b, m, d, v, o) => pluck(bus, at(b), m, d * spb, v, o),
      tanpura: (b, m, v) => tanpura(bus, at(b), m, v),
      bowl: (b, m, v, o) => bowl(bus, at(b), m, v, o),
      tingsha: (b, m, v) => tingsha(bus, at(b), m, v),
      chime: (b, m, v) => chime(bus, at(b), m, v),
      yakBell: (b, m, v) => yakBell(bus, at(b), m, v),
      nga: (b, v, o) => nga(bus, at(b), v, o),
      damaru: (b, v) => damaru(bus, at(b), v),
      tabla: (b, s, v, o) => tabla(bus, at(b), s, v, o),
      cymbal: (b, v, k) => cymbal(bus, at(b), v, k),
      dungchen: (b, m, d, v, o) => dungchen(bus, at(b), m, d * spb, v, o),
      gyaling: (b, m, d, v, o) => gyaling(bus, at(b), m, d * spb, v, o),
      chant: (b, m, d, v, vowel) => chant(bus, at(b), m, d * spb, v, vowel),
      mantraVoice: (b, m, d, v, o) => mantraVoice(bus, at(b), m, d * spb, v, o),
      rainDrop: (b, v) => rainDrop(bus, at(b), v),
      thunder: (b, v) => thunder(bus, at(b), v),
      /**
       * Play a parsed phrase on an instrument.
       * @param {Array} ph        parsed phrase ({ m, b, d, a, o })
       * @param {number} startBar bar (within loop) where the phrase begins (ignored for stingers)
       * @param {string} instName instrument key ('flute' | 'gyaling' | 'pluck' | 'chant' ...)
       * @param {number} vel
       * @param {object} o        { tr, scale, legato, at (stinger beat offset), vowel, ...voice opts }
       */
      line(ph, startBar, instName, vel = 0.7, o = {}) {
        const fn = INSTRUMENTS[instName];
        if (!fn) return;
        const scale = o.scale ?? 1;
        const tr = o.tr ?? 0;
        const whole = windowBeats === Infinity;
        const off = whole ? -(o.at ?? 0) : (barInLoop - startBar) * windowBeats;
        const end = whole ? Infinity : off + windowBeats;
        for (let k = 0; k < ph.length; k++) {
          const note = ph[k];
          if (note.m == null) continue;
          const b = note.b * scale;
          if (b < off || b >= end) continue;
          const prev = ph[k - 1];
          const opts = { ...o, ...(note.o || {}) };
          if (o.legato && !opts.grace && prev && prev.m != null && Math.abs(prev.b + prev.d - note.b) < 1e-6) {
            opts.glideFrom = prev.m + tr;
          }
          if (Array.isArray(o.syllables) && o.syllables.length > 0 && !opts.syllable) {
            opts.syllable = o.syllables[k % o.syllables.length];
          }
          const d = note.d * scale * spb * (o.legato ? 1.0 : 0.94);
          const v = vel * (note.a ?? 1);
          if (instName === 'chant') fn(bus, at(b - off), note.m + tr, d, v, o.vowel);
          else fn(bus, at(b - off), note.m + tr, d, v, opts);
        }
      },
    };
  }

  // ================================================================ TRACK INSTANCES
  const instances = [];
  let current = null;

  function makeBus(dryDest, wetDest) {
    const dry = gainNode(0.0001);
    const wet = gainNode(0.0001);
    dry.connect(dryDest);
    wet.connect(wetDest);
    return { dry, wet };
  }

  function fadeBus(bus, t, target, seconds) {
    for (const g of [bus.dry, bus.wet]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
      g.gain.linearRampToValueAtTime(Math.max(0.0001, target), t + Math.max(0.05, seconds));
    }
  }

  function startInstance(id, vars, fade) {
    const def = tracks[id];
    if (!def) return null;
    const now = ac.currentTime;
    const inst = {
      id, def, vars: { ...(vars || {}) },
      bus: makeBus(trackDry, trackWet),
      barIndex: 0, loop: 0,
      nextBarTime: now + 0.08,
      pads: [], stopped: false, stopAt: Infinity,
    };
    fadeBus(inst.bus, now, 1, fade);
    const pads = typeof def.pads === 'function' ? def.pads(inst.vars) : (def.pads || []);
    for (const spec of pads) inst.pads.push(pad(inst.bus, now, spec));
    instances.push(inst);
    return inst;
  }

  function stopInstance(inst, fade) {
    if (!inst || inst.stopped) return;
    const now = ac.currentTime;
    inst.stopped = true;
    inst.stopAt = now + fade + 7;
    fadeBus(inst.bus, now, 0.0001, fade);
    for (const p of inst.pads) p.stop(now, fade);
  }

  function scheduleBar(inst) {
    const def = inst.def;
    const bpm = typeof def.bpm === 'function' ? def.bpm(inst.vars) : def.bpm;
    const spb = 60 / bpm;
    const bpb = def.beatsPerBar ?? 4;
    const loopBars = def.loopBars ?? 16;
    const barInLoop = inst.barIndex % loopBars;
    inst.loop = Math.floor(inst.barIndex / loopBars);
    const api = makeApi(inst, inst.nextBarTime, spb, barInLoop, bpb);
    try {
      def.bar(api, inst.vars);
    } catch (err) {
      // Never let a score bug kill the scheduler.
      console.warn('[music] bar error', inst.id, err);
    }
    inst.barIndex++;
    inst.nextBarTime += bpb * spb;
  }

  function tick() {
    const now = ac.currentTime;
    for (let i = instances.length - 1; i >= 0; i--) {
      const inst = instances[i];
      if (inst.stopped) {
        if (now > inst.stopAt) {
          inst.bus.dry.disconnect();
          inst.bus.wet.disconnect();
          instances.splice(i, 1);
        }
        continue;
      }
      // Recover from long stalls (background tab) instead of bursting notes.
      if (inst.nextBarTime < now - 0.25) inst.nextBarTime = now + 0.05;
      let guard = 0;
      while (inst.nextBarTime < now + cfg.lookahead && guard++ < 4) scheduleBar(inst);
    }
  }

  let timer = null;
  function ensureTimer() {
    if (timer == null && typeof setInterval === 'function') timer = setInterval(tick, cfg.tickMs);
  }

  // ================================================================ DUCKING & STINGERS
  function duck(level, seconds, release = 1.6) {
    const now = ac.currentTime;
    const hold = Math.max(0.4, seconds);
    for (const g of [trackDry, trackWet]) {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(level, now + 0.35);
      g.gain.setValueAtTime(level, now + hold);
      g.gain.linearRampToValueAtTime(1, now + hold + release);
    }
  }

  function stinger(id, opts = {}) {
    const def = stingers[id];
    if (!def) return false;
    const now = ac.currentTime;
    const t0 = now + 0.06;
    const inst = { id, vars: { ...opts }, bus: makeBus(stingDry, stingWet), loop: 0 };
    fadeBus(inst.bus, now, 1, 0.02);
    const spb = 60 / (def.bpm ?? 60);
    const api = makeApi(inst, t0, spb, 0, Infinity);
    try {
      def.play(api, inst.vars);
    } catch (err) {
      console.warn('[music] stinger error', id, err);
    }
    const dur = typeof def.duration === 'function' ? def.duration(inst.vars) : (def.duration ?? 6);
    if (def.duck !== false) duck(def.duckLevel ?? cfg.duckLevel, dur);
    if (typeof setTimeout === 'function') {
      setTimeout(() => { inst.bus.dry.disconnect(); inst.bus.wet.disconnect(); }, (dur + 8) * 1000);
    }
    return true;
  }

  // ================================================================ PUBLIC API
  /** Switch to (or update vars of) a track. Same id → vars merged live, no restart. */
  function play(id, vars = {}, opts = {}) {
    ensureTimer();
    if (current && current.id === id && !current.stopped) {
      Object.assign(current.vars, vars);
      return current;
    }
    if (!tracks[id]) return null;
    const fade = opts.fade ?? cfg.crossfade;
    if (current) stopInstance(current, opts.fadeOut ?? fade);
    current = startInstance(id, vars, fade);
    tick();
    return current;
  }

  function stop(fade = cfg.crossfade) {
    if (current) stopInstance(current, fade);
    current = null;
  }

  function setVolume(v, seconds = 0.4) {
    const now = ac.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.linearRampToValueAtTime(Math.max(0, v), now + seconds);
  }

  function dispose() {
    if (timer != null) clearInterval(timer);
    timer = null;
    for (const inst of instances) stopInstance(inst, 0.3);
    current = null;
  }

  return {
    play,
    stop,
    stinger,
    duck,
    setVolume,
    dispose,
    tick,
    getCurrent: () => (current ? { id: current.id, vars: { ...current.vars }, root: current.def.root } : null),
    getTrackIds: () => Object.keys(tracks),
    getStingerIds: () => Object.keys(stingers),
    instruments: INSTRUMENTS,
    mtof,
  };
}

// ---------------------------------------------------------------- buffers
function makeNoiseBuffer(ac, seconds) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Stereo exponential-decay impulse response, progressively darkened (stone hall / valley). */
function makeImpulse(ac, seconds) {
  const sr = ac.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ac.createBuffer(2, len, sr);
  const pre = Math.floor(sr * 0.025);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const x = (i - pre) / (len - pre);
      const coef = 0.75 - 0.6 * x; // brighter early, darker tail
      lp += coef * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.exp(-x * 5.2) * 0.9;
    }
  }
  return buf;
}
