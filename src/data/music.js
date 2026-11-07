/**
 * 蓮師朝聖配樂總譜 — Procedural score for the Guru Rinpoche pilgrimage.
 *
 * Tuning: A4 = 432 Hz so the score sits in tune with the existing 108 Hz "Om"
 * drone and 216 Hz singing bowl SFX in `audio.js`.
 *
 * Leitmotifs (主導動機):
 *  - 蓮師心咒動機 Vajra Guru motif — 12 syllables of
 *    ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ (Om Ah Hum Vajra Guru Pema Siddhi Hum),
 *    three long "Om Ah Hum" tones then eight quick syllables resolving to the tonic.
 *  - 誓願動機 Vow motif — the poultry-keeper Jadzimo's vow at Boudhanath; four rising
 *    notes (her four sons) ending unresolved on the 2nd degree. The vow is
 *    "answered" when the Vajra Guru motif resolves to the tonic.
 *
 * Phrase syntax: `"NOTE:beats[:accent][^grace]"`, `-` = rest. e.g. `"D5:1.5^2 E5:0.5"`.
 * Each track's `bar(api, vars)` is called once per bar; `api.line()` plays the slice
 * of a multi-bar phrase that falls inside the current bar.
 */

// ---------------------------------------------------------------- notation helpers
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^([A-Ga-g])([#b]?)(-?\d)$/;

export function n(name) {
  const m = NOTE_RE.exec(name);
  if (!m) throw new Error(`[music] bad note "${name}"`);
  return 12 * (Number(m[3]) + 1) + PC[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export function phrase(str) {
  let b = 0;
  const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    const [main, grace] = tok.split('^');
    const [name, dur = '1', acc] = main.split(':');
    const d = parseFloat(dur);
    out.push({
      m: name === '-' ? null : n(name),
      b,
      d,
      a: acc ? parseFloat(acc) : 1,
      o: grace ? { grace: parseFloat(grace) } : null,
    });
    b += d;
  }
  out.total = b;
  return out;
}

/** Wrap a key offset into [-6, +5] semitones relative to D. */
export function keyOffset(root, home = 62) {
  return ((((root - home + 6) % 12) + 12) % 12) - 6;
}

// ---------------------------------------------------------------- leitmotifs (in D)
/** 12 syllables of ཨོཾ་ཨཱཿ་ཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ (Om Ah Hum Benza Guru Pema Siddhi Hum). */
export const VAJRA_GURU_SYLLABLES = [
  'om', 'ah', 'hum', 'ben', 'za', 'gu', 'ru', 'pe', 'ma', 'sid', 'dhi', 'hum',
];

export const MOTIFS = {
  // Om(2) Ah(1) Hum(3) | Va-jra Gu-ru | Pe-ma Sid-dhi | Hum(1→1)
  vajraGuru: phrase('A4:2 B4:1 A4:3 F#4:0.5 A4:0.5 B4:0.5 A4:0.5 D5:0.5 B4:0.5 A4:0.5 F#4:0.5 E4:1 D4:1'),
  omAhHum: phrase('A4:2 B4:1 A4:3'),
  siddhiHum: phrase('A4:0.5 F#4:0.5 E4:1 D4:3'),
  // Four sons rising … the vow left open on E.
  vow: phrase('D4:1 E4:1 A4:1 B4:1 A4:3 F#4:1 E4:4'),
};

// 12-syllable Vajra Guru Mantra vocal melodies (each 12 notes = 16 beats = 4 bars in 4/4)
// 1) Traditional Samye / Nyingma assembly melodies (in D major pentatonic)
const VG_SAMYE_A = phrase('D4:2 E4:1 F#4:3 A4:1 A4:1 B4:1 A4:1 F#4:1 E4:1 F#4:1 E4:1 D4:4');
const VG_SAMYE_B = phrase('A4:2 B4:1 D5:3 B4:1 A4:1 F#4:1 A4:1 F#4:1 E4:1 D4:1 E4:1 D4:4');
const VG_SAMYE_C = phrase('D5:2 E5:1 F#5:3 E5:1 D5:1 B4:1 A4:1 B4:1 A4:1 F#4:1 E4:1 D4:4');
// 2) Yeshe Tsogyal's Dakini devotional melodies (in A major / F# minor pentatonic)
const VG_DAKINI_A = phrase('C#5:2 E5:1 F#5:3 A5:1 F#5:1 E5:1 C#5:1 E5:1 C#5:1 B4:1 A4:1 B4:4');
const VG_DAKINI_B = phrase('E5:2 F#5:1 A5:3 F#5:1 E5:1 C#5:1 B4:1 C#5:1 B4:1 A4:1 F#4:1 A4:4');
// 3) Wrathful Dorje Drolö / Vajrakīlaya obstacle-dispelling melodies (in D Dorian / minor)
const VG_WRATH_A = phrase('D3:2 F3:1 A3:3 C4:1 A3:1 G3:1 F3:1 G3:1 A3:1 F3:1 E3:1 D3:4');
const VG_WRATH_B = phrase('A3:2 C4:1 D4:3 F4:1 E4:1 D4:1 C4:1 A3:1 G3:1 A3:1 F3:1 D3:4');
// 4) Rainbow-Body Dzogchen contemplation melody (in G Lydian-pentatonic)
const VG_DZOGCHEN = phrase('D5:2 E5:1 G5:3 E5:1 D5:1 B4:1 A4:1 B4:1 D5:1 B4:1 A4:1 G4:4');

const STUPA_ANSWER = phrase('B4:1.5 A4:0.5 F#4:1 E4:1 D4:2 E4:1 F#4:1 A4:3 B4:0.5 A4:0.5 F#4:2 E4:1 D4:1');
// Quiet D-major-pentatonic lute answers leave space around the main melody.
const STUPA_ORNAMENT_A = phrase('-:1 D3:1 A3:0.5 B3:0.5 -:1 F#3:1 A3:1 -:2 E3:1 A3:1 D4:1 -:1');
const STUPA_ORNAMENT_B = phrase('-:1 B3:0.5 A3:0.5 F#3:1 -:1 D3:1 A3:1 E4:1 -:1 A3:1 B3:0.5 D4:0.5 -:2 F#3:1 E3:1 D3:1 -:1');
const STUPA_DESCANT = phrase('-:1 A5:1 B5:0.5 A5:0.5 F#5:1 E5:1 D5:2 -:1');
const WILD_A = phrase('A4:2 C5:1 D5:3^2 C5:1 A4:1 G4:2 F4:2 D4:4');
const WILD_B = phrase('D5:2 F5:1 D5:3 C5:0.5 A4:0.5 G4:0.5 A4:0.5 F4:2 D4:4 -:2');
// Alternate D-minor-pentatonic echoes and a sparse dranyen response (16/8 beats).
const WILD_ECHO_A = phrase('-:1 A4:1 C5:0.5 D5:1.5 F5:1 D5:1 -:2 C5:1 A4:1 G4:1 A4:1 F4:1 D4:2 -:1');
const WILD_ECHO_B = phrase('D5:2 -:1 C5:0.5 A4:0.5 G4:1 A4:1 C5:1 D5:1 F5:1 D5:1 C5:1 A4:1 G4:1 F4:1 D4:2');
const WILD_DRANYEN_ARP = phrase('-:1 D3:1 A3:0.5 C4:0.5 -:1 G3:1 F3:0.5 A3:0.5 D4:1 -:1');
// Pharping drought — Bhairav-like colour (D Eb F# G A Bb C#)
const PH_A = phrase('A4:1 Bb4:0.5 A4:0.5 F#4:2 G4:1 F#4:0.5 Eb4:0.5 D4:2 F#4:1 G4:1 A4:2^1 Bb4:0.5 A4:0.5 G4:1 F#4:2');
const PH_B = phrase('D5:2 C#5:1 D5:1 Eb5:1.5^-1 D5:0.5 C#5:1 Bb4:1 A4:3 G4:1 F#4:1 G4:1 A4:1 -:1');
const RAIN_C = phrase('F#5:0.5 A5:0.5 B5:1 A5:0.5 F#5:0.5 E5:1 D5:0.5 E5:0.5 F#5:1 A5:2 B5:0.5 D6:0.5 B5:0.5 A5:0.5 F#5:1 E5:1 D5:4');
// Mangyul — E minor pentatonic wind songs
const MG_A = phrase('B5:3 A5:0.5 G5:0.5 E5:4 D5:1 E5:1 G5:2^2 A5:1 G5:1 E5:2');
const MG_B = phrase('E6:2 D6:1 B5:1 A5:2 G5:2 E5:4 -:4');
const WINDHORSE = phrase('B5:1 C#6:1 E6:2 C#6:0.5 B5:0.5 G#5:1 F#5:1 E5:1 B5:4 G#5:1 F#5:1 E5:2');
// Yarlung — herder's "lu" song in 6/8 (durations in eighths)
const YL_A = phrase('D6:6 E6:1 D6:1 B5:4 A5:2 G5:2 A5:1 B5:1 D6:4 B5:2');
const YL_B = phrase('G5:3 A5:1 B5:2 A5:2 G5:2 E5:2 D5:6 E5:2 G5:4');
const YL_UNREST = phrase('E5:3 G5:1 A5:2 G5:2 E5:2 D5:2 E5:6 -:6');
const YL_GYALING = phrase('B4:3^2 D5:1 E5:2 D5:2 B4:2 A4:2 G4:3^2 A4:1 B4:2 E4:6');
// Boss cham — gyaling lines (in D, transposed per boss)
const BOSS_A = phrase('D5:1.5^2 Eb5:0.5 D5:1 C5:1 A4:2^2 G4:1 A4:1');
const BOSS_B = phrase('D5:1 F5:1 G5:1.5^2 F5:0.5 Eb5:1 D5:1 C5:1 D5:1');
// Samye — builders' tamping work-song: flute call, monks' answer
const SAMYE_CALL = phrase('D5:1 E5:1 F#5:1.5 E5:0.5 D5:2 B4:1 A4:1');
const SAMYE_ANSWER = phrase('A3:2 B3:1 A3:1 F#3:2 D3:2');
// Chimphu — Yeshe Tsogyal's Dakini Vajra Song (in A major pentatonic: A B C# E F#)
const TSOGYAL_A = phrase('E5:2 F#5:1 E5:1 C#5:2 B4:1 A4:1 B4:1.5 C#5:0.5 E5:2 C#5:1 B4:1 A4:2');
const TSOGYAL_B = phrase('A5:2 F#5:1 E5:1 C#5:2 B4:1 C#5:1 E5:3 C#5:0.5 B4:0.5 A4:4');
// Terma Realm — subterranean crystal cavern motif (in F# minor / Dorian: F# G# A B C# D# E)
const TERMA_A = phrase('C#5:2 D#5:1 C#5:1 A4:2 G#4:1 F#4:1 A4:1.5 B4:0.5 C#5:2 A4:1 G#4:1 F#4:2');
const TERMA_B = phrase('F#5:2 E5:1 C#5:1 B4:2 A4:1 G#4:1 F#4:4 -:4');
// 《鏡中之人》三線敘事主題動機 (Lin Che × Hsu Ying-Chen × Digital Proxy)
const MIRROR_YINGZHEN = phrase('F#4:2 A4:1 B4:1 D5:2 C#5:1 B4:1 A4:2 F#4:1 E4:1 F#4:4');
const MIRROR_MEMORY_A = phrase('B4:2 D5:1 E5:1 G5:2 F#5:1 D5:1 E5:2 D5:1 B4:1 A4:4');
const MIRROR_MEMORY_B = phrase('G5:2 F#5:1 E5:1 D5:2 B4:1 A4:1 B4:2 D5:1 B4:1 G4:4');
const MIRROR_FINALE_A = phrase('F#4:1.5 A4:0.5 B4:1 D5:1 A4:2 F#4:1 E4:1 F#4:1.5 A4:0.5 B4:1 A4:1 F#4:2 D4:2');

// ---------------------------------------------------------------- shared figures
function tanpuraCycle(a, root = 62, vel = 0.42) {
  // Pa – Sa – Sa – Sa(low)
  a.tanpura(0, root - 17, vel);
  a.tanpura(1, root - 12, vel * 0.85);
  a.tanpura(2, root - 12, vel * 0.8);
  a.tanpura(3, root - 24, vel * 1.1);
}

const LILT = [[0, 0, 1], [1, 1, 0.7], [1.5, 2, 0.8], [2.5, 1, 0.6], [3, 3, 0.75]];
function dranyenLilt(a, chord, vel = 0.4) {
  for (const [beat, idx, acc] of LILT) a.pluck(beat, chord[idx], 0, vel * acc);
}

function scatterChimes(a, notes, count, vel, beats = 4) {
  for (let i = 0; i < count; i++) {
    a.chime(Math.floor(a.rand(0, beats * 2)) / 2, a.pick(notes), vel * a.rand(0.6, 1));
  }
}

// ================================================================ TRACKS
export const MUSIC_TRACKS = {
  // ------------------------------------------------------------ Prologue hub
  stupa: {
    title: { zh: '序章・滿願大佛塔', en: 'Prologue · The Wish-Fulfilling Stupa' },
    desc: 'D 大調五聲。坦普拉持續音＋林布竹笛：先吹奏養禽婦「誓願動機」，再由「蓮師心咒動機」回應。夜晚轉為低八度、加入僧眾低音誦經。',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: (v) => (v.night ? 54 : 63),
    pads: [{ notes: [n('D2'), n('A2')], cutoff: 520, gain: 0.035, lfoRate: 0.06, lfoDepth: 0.35, sub: 0.3 }],
    bar(a, v) {
      const B = a.bar;
      const night = Boolean(v.night);
      const tr = night ? 0 : 12;
      const fv = night ? 0.55 : 0.72;
      const cycle = a.loop % 3;
      const ornamentVel = night ? 0.16 : 0.23;
      tanpuraCycle(a, 62, night ? 0.32 : 0.42);
      if (B % 8 === 0) a.bowl(0, n('A3'), 0.5);
      // Bar 0–2: Immediately intone the 12-syllable Vajra Guru Mantra upon entering the Stupa plaza
      if (B <= 2) {
        a.line(MOTIFS.vajraGuru, 0, 'mantraVoice', night ? 0.72 : 0.68, {
          tr: night ? -12 : 0,
          voice: night ? 'umdze' : 'choir',
          syllables: VAJRA_GURU_SYLLABLES,
        });
      }
      if (B >= 3 && B <= 5) {
        if (a.loop % 2 === 0) a.line(MOTIFS.vow, 3, 'flute', fv, { tr, legato: true });
        else a.line(MOTIFS.vow, 3, 'pluck', 0.45, { tr: 12 });
        a.line(STUPA_ORNAMENT_A, 3, 'pluck', ornamentVel, { tr: cycle === 2 ? 12 : 0, cutoff: 2200, send: 0.4 });
      }
      if (B >= 6 && B <= 8) {
        a.line(MOTIFS.vajraGuru, 6, 'mantraVoice', night ? 0.72 : 0.68, {
          tr: night ? -12 : 0,
          voice: night ? 'umdze' : 'dakini',
          syllables: VAJRA_GURU_SYLLABLES,
        });
        a.line(MOTIFS.vajraGuru, 6, 'flute', fv * 0.42, { tr, legato: true, glideTime: 0.06 });
      }
      if (B >= 10 && B <= 13) {
        a.line(STUPA_ANSWER, 10, 'flute', fv * 0.9, { tr, legato: true, glideTime: 0.06 });
        if (cycle !== 0) a.line(STUPA_ORNAMENT_B, 10, 'pluck', ornamentVel, { cutoff: 2200, send: 0.4 });
      }
      if (B >= 14 && a.loop % 2 === 1) {
        a.line(STUPA_DESCANT, 14, 'flute', fv * 0.32, { tr: night ? -12 : 0, legato: true, glideTime: 0.08 });
      }
      if (cycle === 1 && B === 9) a.bowl(2, n('D4'), night ? 0.16 : 0.22, { decay: 1.8 });
      if (cycle === 2 && B === 14) a.chime(2.5, n('A6'), 0.16);
      if (!night && B >= 8) {
        dranyenLilt(a, B % 2 === 0 ? [n('D3'), n('A3'), n('D4'), n('F#4')] : [n('E3'), n('B3'), n('E4'), n('A3')], 0.32);
      }
      if (night && B % 8 === 4) a.chant(0, n('D2'), 7, 0.4, 'om');
      if (B === 15) a.tingsha(2, n('A6'), 0.35);
    },
  },

  // ------------------------------------------------------------ Prologue wilderness
  wild: {
    title: { zh: '序章・北郊原野', en: 'Prologue · North Outskirts' },
    desc: 'D 小調五聲。低沉持續音、心跳般的鼓、遠方銅欽長號；竹笛以小調吹出心咒動機的影子 —— 未被調伏的荒野。',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 56,
    pads: [{ notes: [n('D2'), n('A2')], cutoff: 320, gain: 0.04, lfoRate: 0.045, lfoDepth: 0.4, sub: 0.35 }],
    bar(a) {
      const B = a.bar;
      const alternate = a.loop % 2 === 1;
      if (B % 2 === 0) { a.nga(0, 0.42, { pitch: 58 }); a.nga(0.33, 0.26, { pitch: 58 }); }
      if (B === 0 || B === 8) a.dungchen(0, n('D2'), 6, 0.5);
      if (B === 8) a.cymbal(0, 0.35, 'silnyen');
      if ((B >= 2 && B <= 3) || (B >= 8 && B <= 9)) {
        a.line(WILD_DRANYEN_ARP, B < 4 ? 2 : 8, 'pluck', alternate ? 0.24 : 0.19, {
          tr: alternate && B >= 8 ? 12 : 0, cutoff: 1900, send: 0.45,
        });
      }
      if (B >= 4 && B <= 7) a.line(alternate ? WILD_ECHO_A : WILD_A, 4, 'flute', 0.58, { legato: true, breath: 1.4 });
      if (B >= 12) a.line(alternate ? WILD_ECHO_B : WILD_B, 12, 'flute', 0.55, { legato: true, breath: 1.4 });
      if (B === (alternate ? 7 : 15)) a.chime(3, alternate ? n('C6') : n('A5'), 0.15);
      if (alternate && B === 11) a.bowl(2, n('D4'), 0.2, { decay: 1.7 });
      if (B === 10 || B === 11) for (let k = 0; k < 4; k++) a.damaru(k, 0.2);
    },
  },

  // ------------------------------------------------------------ Chapter 1 — drought
  'pharping.drought': {
    title: { zh: '第一章・帕平 —— 三年大旱', en: 'Ch.I · Pharping — Three Years of Drought' },
    desc: '拜拉夫（Bhairav）色彩的 D 調：降 E、升 C 帶來焦灼感。坦普拉嗡鳴＋高頻熱浪微光、稀疏的塔布拉鼓；竹笛以滑音吟唱乾渴的谷地。',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 60,
    pads: [
      { notes: [n('D2'), n('A2')], cutoff: 900, q: 6, gain: 0.022, lfoRate: 0.11, lfoDepth: 0.5 },
      { notes: [n('D6')], type: 'sine', detune: 4, cutoff: 5000, gain: 0.012, lfoDepth: 0 },
    ],
    bar(a) {
      const B = a.bar;
      tanpuraCycle(a, 62, 0.4);
      if (B === 0) a.bowl(0, n('A3'), 0.45);
      if (B % 2 === 1) {
        a.tabla(0, 'dha', 0.55); a.tabla(1.5, 'na', 0.4); a.tabla(2, 'tin', 0.35);
        a.tabla(2.5, 'ge', 0.4); a.tabla(3, 'na', 0.4);
      } else {
        a.tabla(0, 'dha', 0.5); a.tabla(2, 'ke', 0.35);
      }
      if (B >= 2 && B <= 5) a.line(PH_A, 2, 'flute', 0.68, { legato: true, glideTime: 0.14, vib: 0.011 });
      if (B >= 8 && B <= 11) a.line(PH_B, 8, 'flute', 0.65, { legato: true, glideTime: 0.14, vib: 0.011 });
      if (B === 12) a.dungchen(0, n('D2'), 6, 0.32);
    },
  },

  // ------------------------------------------------------------ Chapter 1 — rain returns
  'pharping.rain': {
    title: { zh: '第一章・帕平 —— 甘霖普降', en: 'Ch.I · Pharping — The Rains Return' },
    desc: '旱障調伏後轉入明亮的 D 大調：塔布拉輕快、札木聶琴撥弦、雨滴點點；竹笛完整吹出蓮師心咒動機與歡喜的谷地之歌。',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 72,
    pads: [{ notes: [n('D2'), n('A2'), n('D3')], cutoff: 1000, gain: 0.028, lfoRate: 0.08, sub: 0.25 }],
    bar(a) {
      const B = a.bar;
      tanpuraCycle(a, 62, 0.34);
      const strokes = [[0, 'dha'], [0.5, 'na'], [1, 'na'], [1.5, 'dha'], [2, 'dha'], [2.5, 'na'], [3, 'tin'], [3.5, 'na']];
      for (const [beat, s] of strokes) if (beat === 0 || a.chance(0.85)) a.tabla(beat, s, beat === 0 ? 0.5 : 0.32);
      dranyenLilt(a, B % 4 < 2 ? [n('D3'), n('A3'), n('D4'), n('F#4')] : [n('G3'), n('D4'), n('G4'), n('B4')], 0.28);
      for (let k = 0; k < 6; k++) a.rainDrop(a.rand(0, 4), 0.55);
      if (B % 8 === 0) a.bowl(0, n('A3'), 0.42);
      if (B >= 2 && B <= 4) {
        a.line(MOTIFS.vajraGuru, 2, 'mantraVoice', 0.68, { voice: 'choir', syllables: VAJRA_GURU_SYLLABLES });
        a.line(MOTIFS.vajraGuru, 2, 'flute', 0.48, { tr: 12, legato: true, glideTime: 0.06 });
      }
      if (B >= 6 && B <= 9) a.line(STUPA_ANSWER, 6, 'flute', 0.65, { tr: 12, legato: true, glideTime: 0.06 });
      if (B >= 10 && B <= 13) a.line(RAIN_C, 10, 'flute', 0.65, { legato: true, glideTime: 0.05 });
      if (B === 15) a.tingsha(2, n('A6'), 0.32);
    },
  },

  // ------------------------------------------------------------ Chapter 2 — blizzard
  'mangyul.storm': {
    title: { zh: '第二章・芒域山口 —— 十二丹瑪的風雪', en: 'Ch.II · Mangyul — Blizzard of the Twelve Tenma' },
    desc: 'E 小調五聲、極慢。冰晶風鈴隨機飄落、喉音誦經與銅欽在山谷迴盪；後半段加入迎請使馱隊的步鼓與馬鈴。竹笛帶強烈氣聲，如風穿山口。',
    root: 64,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 54,
    pads: [
      { notes: [n('E2'), n('B2')], cutoff: 380, gain: 0.04, lfoRate: 0.05, lfoDepth: 0.45, sub: 0.3 },
      { notes: [n('E6')], type: 'triangle', detune: 9, cutoff: 3000, gain: 0.006, lfoDepth: 0.2 },
    ],
    bar(a) {
      const B = a.bar;
      if (B === 0) a.dungchen(0, n('E2'), 7, 0.48);
      if (B === 8) a.chant(0, n('E2'), 8, 0.45, 'om');
      scatterChimes(a, [n('E6'), n('G6'), n('A6'), n('B6'), n('D7')], 1 + Math.floor(a.rand(0, 3)), 0.42);
      if (B >= 8) {
        a.nga(0, 0.32, { pitch: 60 });
        if (a.chance(0.7)) a.yakBell(1, n('A5'), 0.28);
        if (a.chance(0.7)) a.yakBell(3, n('E6'), 0.24);
      }
      if (B >= 4 && B <= 7) a.line(MG_A, 4, 'flute', 0.62, { legato: true, breath: 1.7, vib: 0.012 });
      if (B >= 12) a.line(MG_B, 12, 'flute', 0.55, { legato: true, breath: 1.8, vib: 0.012 });
    },
  },

  // ------------------------------------------------------------ Chapter 2 — windhorse
  'mangyul.calm': {
    title: { zh: '第二章・芒域山口 —— 風馬旗與入藏古道', en: 'Ch.II · Mangyul — Windhorse over the Pass' },
    desc: '丹瑪立誓、暴雪平息：E 大調五聲。札木聶琴輕快、叮夏清響、銅欽迎賓；心咒動機升到 E 調，序章那句未完成的「誓願動機」在此第一次被完整地應答。',
    root: 64,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 66,
    pads: [{ notes: [n('E2'), n('B2'), n('E3')], cutoff: 900, gain: 0.03, lfoRate: 0.07, sub: 0.25 }],
    bar(a) {
      const B = a.bar;
      dranyenLilt(a, B % 2 === 0 ? [n('E3'), n('B3'), n('E4'), n('G#4')] : [n('F#3'), n('C#4'), n('F#4'), n('B3')], 0.34);
      if (B % 8 === 0) a.tingsha(0, n('E7'), 0.3);
      if (B % 2 === 0) a.nga(0, 0.3, { pitch: 62 });
      if (a.chance(0.6)) a.yakBell(1, n('A5'), 0.2);
      if (a.chance(0.6)) a.yakBell(3, n('E6'), 0.18);
      if (B === 8) a.dungchen(0, n('E2'), 6, 0.38);
      if (B >= 2 && B <= 4) {
        a.line(MOTIFS.vajraGuru, 2, 'mantraVoice', 0.68, { tr: 2, voice: 'choir', syllables: VAJRA_GURU_SYLLABLES });
        a.line(MOTIFS.vajraGuru, 2, 'flute', 0.48, { tr: 14, legato: true, glideTime: 0.06 });
      }
      if (B >= 6 && B <= 9) a.line(WINDHORSE, 6, 'flute', 0.66, { legato: true, glideTime: 0.05 });
      if (B >= 10 && B <= 12) a.line(MOTIFS.vow, 10, 'flute', 0.62, { tr: 14, legato: true });
      if (B === 13) a.line(MOTIFS.siddhiHum, 13, 'flute', 0.6, { tr: 14, legato: true });
    },
  },

  // ------------------------------------------------------------ Chapter 3 — stampede
  'yarlung.unrest': {
    title: { zh: '第三章・雅隆河谷 —— 犛牛群暴走', en: 'Ch.III · Yarlung — The Stampede' },
    desc: '6/8 拍、E 小調。急促的鼓如蹄聲奔騰、凌亂的犛牛鈴、遠方雷鳴（雅拉香波山神震怒），甲林嗩吶吹出不安的旋律。',
    root: 64,
    beatsPerBar: 6,
    loopBars: 16,
    bpm: 198,
    pads: [{ notes: [n('E2'), n('B2')], cutoff: 450, gain: 0.034, lfoRate: 0.12, lfoDepth: 0.5, sub: 0.3 }],
    bar(a) {
      const B = a.bar;
      const ch = B % 2 === 0 ? [n('E2'), n('B2'), n('E3'), n('G3')] : [n('D3'), n('A3'), n('D4'), n('A3')];
      a.pluck(0, ch[0], 0, 0.5); a.pluck(2, ch[1], 0, 0.3);
      a.pluck(3, ch[2], 0, 0.42); a.pluck(3.1, ch[3], 0, 0.36); a.pluck(5, ch[1], 0, 0.28);
      a.nga(0, 0.5, { pitch: 62 }); a.nga(3, 0.42, { pitch: 66 });
      if (a.chance(0.5)) a.damaru(5, 0.25);
      for (let k = 0; k < 3; k++) a.yakBell(Math.floor(a.rand(0, 6)), a.pick([n('A5'), n('C6'), n('E6')]), 0.26);
      if (B === 0) a.dungchen(0, n('E2'), 10, 0.45);
      if (B % 8 === 4) a.thunder(0, 0.3);
      if (B >= 4 && B <= 7) a.line(YL_UNREST, 4, 'flute', 0.6, { legato: true, breath: 1.3 });
      if (B >= 12) a.line(YL_GYALING, 12, 'gyaling', 0.6, { legato: true });
    },
  },

  // ------------------------------------------------------------ Chapter 3 — pastoral
  'yarlung.calm': {
    title: { zh: '第三章・雅隆河谷 —— 青稞翻浪', en: 'Ch.III · Yarlung — Waves of Barley' },
    desc: '6/8 拍、G 大調五聲的藏地牧歌：札木聶琴搖曳的節奏、悠揚的犛牛鈴，竹笛吹出牧人長調「魯」，最後以 G 調心咒動機收束。',
    root: 67,
    beatsPerBar: 6,
    loopBars: 16,
    bpm: 186,
    pads: [{ notes: [n('G2'), n('D3')], cutoff: 800, gain: 0.03, lfoRate: 0.07, sub: 0.25 }],
    bar(a) {
      const B = a.bar;
      const CH = [
        [n('G2'), n('D3'), n('G3'), n('B3')],
        [n('E2'), n('B2'), n('E3'), n('G3')],
        [n('C3'), n('G3'), n('C4'), n('E4')],
        [n('D3'), n('A3'), n('D4'), n('A3')],
      ];
      const ch = CH[Math.floor(B / 2) % 4];
      a.pluck(0, ch[0], 0, 0.5); a.pluck(2, ch[1], 0, 0.3);
      a.pluck(3, ch[2], 0, 0.4); a.pluck(3.1, ch[3], 0, 0.34); a.pluck(5, ch[1], 0, 0.26);
      if (a.chance(0.5)) a.yakBell(0, n('A5'), 0.2);
      if (a.chance(0.4)) a.yakBell(3, n('C6'), 0.18);
      if (B >= 8) a.nga(0, 0.24, { pitch: 64 });
      if (B === 0) a.bowl(0, n('G3'), 0.42);
      if (B === 14) a.tingsha(0, n('D7'), 0.28);
      if (B >= 2 && B <= 5) a.line(YL_A, 2, 'flute', 0.66, { legato: true, glideTime: 0.07 });
      if (B >= 6 && B <= 9) a.line(YL_B, 6, 'flute', 0.64, { legato: true, glideTime: 0.07 });
      if (B >= 10 && B <= 13) {
        a.line(MOTIFS.vajraGuru, 10, 'mantraVoice', 0.68, { tr: 5, scale: 2, voice: 'choir', syllables: VAJRA_GURU_SYLLABLES });
        a.line(MOTIFS.vajraGuru, 10, 'flute', 0.46, { tr: 17, scale: 2, legato: true, glideTime: 0.06 });
      }
    },
  },

  // ------------------------------------------------------------ Chapter 4 — building by day
  'samye.day': {
    title: { zh: '第四章・桑耶 —— 晝間築寺', en: 'Ch.IV · Samye — Building by Day' },
    desc: '回到 D 大調（與序章佛塔同調 —— 養禽婦三子的誓願即將在桑耶實現）。夯土號子般的鼓與拍擊，竹笛領唱、僧眾低聲應和，最後誓願動機接上蓮師心咒動機。',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 76,
    pads: [{ notes: [n('D2'), n('A2')], cutoff: 650, gain: 0.03, lfoRate: 0.07, sub: 0.28 }],
    bar(a) {
      const B = a.bar;
      a.nga(0, 0.4, { pitch: 62 }); a.nga(2, 0.3, { pitch: 62 });
      a.tabla(1, 'ke', 0.4); a.tabla(3, 'ke', 0.4);
      if (B >= 2) dranyenLilt(a, B % 2 === 0 ? [n('D3'), n('A3'), n('D4'), n('F#4')] : [n('G3'), n('D4'), n('G4'), n('B3')], 0.28);
      if (B === 0) a.bowl(0, n('A3'), 0.42);
      if (B === 2 || B === 3) a.line(SAMYE_CALL, 2, 'flute', 0.68, { legato: true, glideTime: 0.05 });
      if (B === 4 || B === 5) a.line(SAMYE_ANSWER, 4, 'chant', 0.38, { vowel: 'a' });
      if (B === 6 || B === 7) a.line(SAMYE_CALL, 6, 'flute', 0.68, { legato: true, glideTime: 0.05 });
      if (B === 8 || B === 9) a.line(SAMYE_ANSWER, 8, 'chant', 0.38, { vowel: 'a' });
      if (B >= 10 && B <= 12) a.line(MOTIFS.vow, 10, 'flute', 0.66, { tr: 12, legato: true });
      if (B >= 13) {
        a.line(MOTIFS.vajraGuru, 13, 'mantraVoice', 0.68, { voice: 'choir', syllables: VAJRA_GURU_SYLLABLES });
        a.line(MOTIFS.vajraGuru, 13, 'flute', 0.45, { tr: 12, legato: true, glideTime: 0.06 });
      }
    },
  },

  // ------------------------------------------------------------ Chapter 4 — night siege
  'samye.night': {
    title: { zh: '第四章・桑耶 —— 入夜鬼神毀基', en: 'Ch.IV · Samye — Night of the Arrogant Spirits' },
    desc: '晝建夜毀：D 小調、急促的達瑪如與大鼓、銅欽低鳴、甲林吹出威嚇的旋律，八部傲慢之靈圍攻工地。',
    root: 62,
    beatsPerBar: 4,
    loopBars: 8,
    bpm: 92,
    pads: [{ notes: [n('D2'), n('A2')], cutoff: 350, gain: 0.036, lfoRate: 0.13, lfoDepth: 0.45, sub: 0.32 }],
    bar(a) {
      const B = a.bar;
      if (B === 0) a.cymbal(0, 0.32, 'silnyen');
      if (B % 4 === 0) a.dungchen(0, n('D2'), 7, 0.5);
      for (const [beat, vel] of [[0, 0.65], [1.5, 0.38], [2, 0.5], [3, 0.42]]) a.nga(beat, vel, { pitch: 58 });
      for (let k = 0; k < 4; k++) a.damaru(k + 0.5, 0.22);
      if (B === 4) a.chant(0, n('D2'), 6, 0.4, 'a');
      if (B === 2 || B === 3) a.line(BOSS_A, 2, 'gyaling', 0.5);
      if (B === 6 || B === 7) a.line(BOSS_B, 6, 'gyaling', 0.5);
    },
  },

  // ------------------------------------------------------------ Chapter 4 — consecration
  'samye.complete': {
    title: { zh: '第四章・桑耶 —— 須彌曼荼羅落成', en: 'Ch.IV · Samye — The Mandala Rises' },
    desc: '開光大典：一對銅欽、羅爾莫鈸、僧眾「嗡」聲；竹笛先吹誓願動機，甲林與竹笛以八度齊奏完整的蓮師心咒動機 —— 序章那句誓願在此圓滿。',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 60,
    pads: [{ notes: [n('D2'), n('A2'), n('D3')], cutoff: 700, gain: 0.034, lfoRate: 0.05, sub: 0.3 }],
    bar(a) {
      const B = a.bar;
      if (B % 8 === 0) { a.dungchen(0, n('D2'), 7, 0.55); a.cymbal(0, 0.42, 'rolmo'); a.bowl(0, n('A3'), 0.45); }
      if (B % 8 === 4) a.tingsha(0, n('A6'), 0.3);
      a.nga(0, 0.32, { pitch: 60 });
      if (B === 2 || B === 10) a.chant(0, n('D2'), 6, 0.36, 'om');
      if (B >= 2 && B <= 4) a.line(MOTIFS.vow, 2, 'flute', 0.66, { tr: 12, legato: true });
      if (B >= 6 && B <= 8) {
        a.line(MOTIFS.vajraGuru, 6, 'gyaling', 0.42, { legato: true });
        a.line(MOTIFS.vajraGuru, 6, 'mantraVoice', 0.64, {
          voice: 'choir',
          syllables: VAJRA_GURU_SYLLABLES,
        });
      }
      if (B >= 10 && B <= 13) {
        a.line(STUPA_ANSWER, 10, 'flute', 0.6, { tr: 12, legato: true, glideTime: 0.06 });
        dranyenLilt(a, B % 2 === 0 ? [n('D3'), n('A3'), n('D4'), n('F#4')] : [n('E3'), n('B3'), n('E4'), n('A3')], 0.26);
      }
      if (B === 14 || B === 15) a.line(MOTIFS.siddhiHum, 14, 'gyaling', 0.5, { legato: true });
    },
  },

  // ------------------------------------------------------------ Chapter 5 — Chimphu Hermitage
  chimphu: {
    title: { zh: '終章・青朴修行地 —— 空行金剛歌', en: 'Ch.V · Chimphu — Song of the Dakini' },
    desc: 'A 大調五聲、清幽空靈。青朴甘露泉水滴、松風竹笛吹奏益西措嘉的「空行金剛歌」，與札木聶琴、頌缽及 A 調蓮師心咒動機相應和。',
    root: 57,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 56,
    pads: [
      { notes: [n('A2'), n('E3'), n('A3')], cutoff: 680, gain: 0.032, lfoRate: 0.05, lfoDepth: 0.3, sub: 0.25 },
    ],
    bar(a) {
      const B = a.bar;
      tanpuraCycle(a, 57, 0.32);
      if (B % 8 === 0) a.bowl(0, n('A3'), 0.48);
      if (B % 8 === 4) a.tingsha(0, n('E7'), 0.28);
      if (a.chance(0.75)) a.rainDrop(a.rand(0, 4), 0.35);
      if (a.chance(0.45)) a.rainDrop(a.rand(0, 4), 0.25);
      if (B >= 2) {
        dranyenLilt(
          a,
          B % 2 === 0 ? [n('A2'), n('E3'), n('A3'), n('C#4')] : [n('F#2'), n('C#3'), n('F#3'), n('A3')],
          0.26
        );
      }
      if (B >= 2 && B <= 5) a.line(TSOGYAL_A, 2, 'flute', 0.66, { legato: true, glideTime: 0.07, breath: 1.2 });
      if (B >= 6 && B <= 9) a.line(TSOGYAL_B, 6, 'flute', 0.64, { legato: true, glideTime: 0.07, breath: 1.2 });
      if (B >= 10 && B <= 12) {
        a.line(MOTIFS.vajraGuru, 10, 'mantraVoice', 0.62, {
          tr: 7,
          voice: 'dakini',
          syllables: VAJRA_GURU_SYLLABLES,
        });
      }
      if (B === 14 || B === 15) a.chant(0, n('A2'), 6, 0.34, 'om');
    },
  },

  // ------------------------------------------------------------ Chapter 5 — Terma Realm Dungeon
  terma: {
    title: { zh: '終章・伏藏秘境 —— 深巖手印石窟', en: 'Ch.V · Terma Realm — Caverns of the Mudra' },
    desc: '升 F 小調／多利安調式。地底伏藏晶石的閃爍風鈴、深邃的銅欽與達瑪如脈動，竹笛在石窟殘響中吹出神祕的伏藏試煉旋律。',
    root: 54,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 68,
    pads: [
      { notes: [n('F#2'), n('C#3')], cutoff: 420, gain: 0.036, lfoRate: 0.06, lfoDepth: 0.4, sub: 0.32 },
      { notes: [n('C#6')], type: 'sine', detune: 6, cutoff: 3600, gain: 0.008, lfoDepth: 0.2 },
    ],
    bar(a) {
      const B = a.bar;
      scatterChimes(a, [n('F#6'), n('A6'), n('B6'), n('C#7'), n('E7')], 2, 0.36);
      a.nga(0, 0.38, { pitch: 55 });
      if (B % 2 === 1) a.nga(2.5, 0.28, { pitch: 55 });
      if (B >= 4) {
        if (a.chance(0.65)) a.damaru(1.5, 0.22);
        if (a.chance(0.65)) a.damaru(3.5, 0.2);
      }
      if (B === 0 || B === 8) a.dungchen(0, n('F#2'), 6.5, 0.44);
      if (B === 4 || B === 12) a.bowl(0, n('F#3'), 0.42);
      if (B >= 2 && B <= 5) a.line(TERMA_A, 2, 'flute', 0.62, { legato: true, breath: 1.5, vib: 0.012 });
      if (B >= 8 && B <= 11) a.line(TERMA_B, 8, 'flute', 0.58, { legato: true, breath: 1.5, vib: 0.012 });
      if (B >= 12 && B <= 14) a.line(MOTIFS.vajraGuru, 12, 'pluck', 0.42, { tr: 4 });
    },
  },

  // ------------------------------------------------------------ Finale — Ending Credits
  credits: {
    title: { zh: '終幕・圓滿迴向 —— 蓮師足跡', en: 'Finale · Dedication — Footsteps of the Lotus-Born' },
    desc: '朝聖圓滿迴向曲（D 大調）：從博達哈的誓願動機出發，札木聶琴與頌缽齊鳴，竹笛與甲林交織出完整的蓮師心咒與桑耶圓滿旋律。',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 64,
    pads: [{ notes: [n('D2'), n('A2'), n('D3')], cutoff: 780, gain: 0.036, lfoRate: 0.05, sub: 0.28 }],
    bar(a) {
      const B = a.bar;
      tanpuraCycle(a, 62, 0.36);
      dranyenLilt(
        a,
        B % 2 === 0 ? [n('D3'), n('A3'), n('D4'), n('F#4')] : [n('G3'), n('D4'), n('G4'), n('B4')],
        0.32
      );
      if (B % 8 === 0) {
        a.bowl(0, n('A3'), 0.52);
        a.tingsha(0, n('A6'), 0.32);
      }
      if (B % 2 === 0) a.nga(0, 0.28, { pitch: 62 });
      if (B === 0 || B === 8) a.chant(0, n('D2'), 6.5, 0.36, 'om');
      if (B >= 1 && B <= 3) a.line(MOTIFS.vow, 1, 'flute', 0.68, { tr: 12, legato: true });
      if (B >= 5 && B <= 7) {
        a.line(MOTIFS.vajraGuru, 5, 'mantraVoice', 0.72, { voice: 'choir', syllables: VAJRA_GURU_SYLLABLES });
        a.line(MOTIFS.vajraGuru, 5, 'mantraVoice', 0.64, { tr: 12, voice: 'dakini', syllables: VAJRA_GURU_SYLLABLES });
        a.line(MOTIFS.vajraGuru, 5, 'pluck', 0.34, { tr: 12 });
      }
      if (B >= 9 && B <= 12) a.line(STUPA_ANSWER, 9, 'flute', 0.68, { tr: 12, legato: true, glideTime: 0.06 });
      if (B >= 13 && B <= 15) {
        a.line(MOTIFS.vajraGuru, 13, 'mantraVoice', 0.72, { voice: 'umdze', syllables: VAJRA_GURU_SYLLABLES });
        a.line(MOTIFS.vajraGuru, 13, 'gyaling', 0.42, { legato: true });
      }
    },
  },

  // ============================================================ 《鏡中之人》 STORY MODE SUITE
  // 1) Digital Proxy & Unsent Words (Prologue / Phone Threads / Night Map)
  'story.mirror': {
    title: { zh: '鏡中之人・未知來訊與數位代理', en: 'The Person in the Mirror · Digital Proxy' },
    desc: 'B 小調／D 大調五聲（54 BPM）：溫潤的撫琴撥弦彈奏許映真記憶主題，高頻冰晶泛音如螢幕微光與 AI 訊號脈動，低音林布竹笛在靜夜裡回應林澈的思念。',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: (v) => (v.night ? 52 : 56),
    pads: [
      { notes: [n('B2'), n('F#3'), n('D4')], cutoff: 540, gain: 0.028, lfoRate: 0.05, lfoDepth: 0.32, sub: 0.24 },
      { notes: [n('F#5')], type: 'sine', detune: 5, cutoff: 3200, gain: 0.006, lfoDepth: 0.18 },
    ],
    bar(a) {
      const B = a.bar;
      const chords = [
        [n('B2'), n('F#3'), n('B3'), n('D4')],
        [n('G2'), n('D3'), n('G3'), n('B3')],
        [n('D3'), n('A3'), n('D4'), n('F#4')],
        [n('A2'), n('E3'), n('A3'), n('C#4')],
      ];
      dranyenLilt(a, chords[Math.floor(B / 2) % 4], 0.26);
      if (B % 4 === 0) a.bowl(0, n('F#3'), 0.36);
      // Crystalline AI signal pulse on off-beats
      if (B % 2 === 0) a.chime(1.5, a.pick([n('F#6'), n('A6'), n('C#7'), n('D7')]), 0.22);
      if (B % 4 === 3) a.chime(3.5, n('A6'), 0.2);
      // Bars 2–5: Yingzhen's motif on warm plucked strings
      if (B >= 2 && B <= 5) a.line(MIRROR_YINGZHEN, 2, 'pluck', 0.44);
      // Bars 6–9: Bamboo flute answers an octave higher with soft breath
      if (B >= 6 && B <= 9) a.line(MIRROR_YINGZHEN, 6, 'flute', 0.56, { tr: 12, legato: true, glideTime: 0.07, breath: 1.3 });
      // Bars 10–12: Vow motif left suspended like an unfinished promise
      if (B >= 10 && B <= 12) a.line(MOTIFS.vow, 10, 'flute', 0.5, { tr: 12, legato: true });
      if (B === 14) a.tingsha(2, n('F#6'), 0.22);
    },
  },

  // 2) The World She Once Saw (Photography / Restoration / Diaries / Dorm Video)
  'story.memory': {
    title: { zh: '鏡中之人・她曾看見的世界', en: 'The Person in the Mirror · The World She Once Saw' },
    desc: 'G 大調五聲抒情曲（58 BPM）：溫柔的札木聶琴分解和弦、雨滴與頌缽泛音，竹笛吹奏映真與林澈的回憶主題，尾段由遠方空行女聲輕吟心咒回應。',
    root: 67,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 58,
    pads: [{ notes: [n('G2'), n('D3'), n('B3')], cutoff: 660, gain: 0.028, lfoRate: 0.05, sub: 0.24 }],
    bar(a) {
      const B = a.bar;
      const chords = [
        [n('G2'), n('D3'), n('G3'), n('B3')],
        [n('E2'), n('B2'), n('E3'), n('G3')],
        [n('C3'), n('G3'), n('C4'), n('E4')],
        [n('D3'), n('A3'), n('D4'), n('F#4')],
      ];
      dranyenLilt(a, chords[Math.floor(B / 2) % 4], 0.28);
      if (B % 8 === 0) a.bowl(0, n('G3'), 0.4);
      if (a.chance(0.45)) a.rainDrop(a.rand(0, 4), 0.24);
      if (B >= 2 && B <= 5) a.line(MIRROR_MEMORY_A, 2, 'flute', 0.62, { legato: true, glideTime: 0.07, breath: 1.2 });
      if (B >= 6 && B <= 9) a.line(MIRROR_MEMORY_B, 6, 'flute', 0.6, { legato: true, glideTime: 0.07, breath: 1.2 });
      if (B >= 10 && B <= 12) {
        a.line(MOTIFS.vajraGuru, 10, 'mantraVoice', 0.56, {
          tr: 5,
          voice: 'dakini',
          syllables: VAJRA_GURU_SYLLABLES,
        });
      }
      if (B >= 13 && B <= 15) a.line(MIRROR_YINGZHEN, 13, 'pluck', 0.38, { tr: 5 });
      if (B === 15) a.tingsha(2, n('D7'), 0.24);
    },
  },

  // 3) Starlight Dakini Script in Chimphu Cave (Cave / Light / Terma Question)
  'story.terma': {
    title: { zh: '鏡中之人・青朴星光空行字', en: 'The Person in the Mirror · Starlight Dakini Script' },
    desc: 'A 大調／升 F 小調五聲（52 BPM）：石窟甘露水滴、星光般閃爍的冰晶風鈴與五口頌缽，空行女聲與竹笛在無訊號的洞窟中交織出超越文字的共鳴。',
    root: 57,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 52,
    pads: [
      { notes: [n('A2'), n('E3'), n('C#4')], cutoff: 620, gain: 0.03, lfoRate: 0.04, lfoDepth: 0.32, sub: 0.26 },
      { notes: [n('E6')], type: 'sine', detune: 4, cutoff: 3600, gain: 0.007, lfoDepth: 0.16 },
    ],
    bar(a) {
      const B = a.bar;
      tanpuraCycle(a, 57, 0.26);
      scatterChimes(a, [n('A6'), n('B6'), n('C#7'), n('E7'), n('F#7')], 2, 0.32);
      if (a.chance(0.65)) a.rainDrop(a.rand(0, 4), 0.3);
      if (B % 4 === 0) a.bowl(0, n('A3'), 0.44);
      if (B % 8 === 4) a.tingsha(0, n('E7'), 0.26);
      if (B >= 2 && B <= 5) a.line(TSOGYAL_A, 2, 'flute', 0.62, { legato: true, glideTime: 0.08, breath: 1.3 });
      if (B >= 6 && B <= 9) {
        a.line(VG_DAKINI_A, 6, 'mantraVoice', 0.68, { voice: 'dakini', syllables: VAJRA_GURU_SYLLABLES });
      }
      if (B >= 10 && B <= 13) a.line(TSOGYAL_B, 10, 'flute', 0.6, { legato: true, glideTime: 0.08, breath: 1.2 });
      if (B === 14 || B === 15) a.chant(0, n('A2'), 6, 0.32, 'om');
    },
  },

  // 4) To You in the Future & A Single Lamp (Finale Letter / Kora / Lamp / Tea Shop)
  'story.finale': {
    title: { zh: '鏡中之人・寫給未來的你／一盞燈', en: 'The Person in the Mirror · To You in the Future & A Single Lamp' },
    desc: 'D 大調（60 BPM）：讀信時為親密純淨的撥弦與輕柔竹笛；當回到博達哈交還石板、繞塔並點亮酥油燈時，綻放為溫暖澄明的晨光合奏。',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: (v) => (v.intimate ? 56 : 64),
    pads: [{ notes: [n('D2'), n('A2'), n('F#3')], cutoff: 720, gain: 0.03, lfoRate: 0.05, sub: 0.26 }],
    bar(a, v) {
      const B = a.bar;
      const intimate = Boolean(v.intimate);
      tanpuraCycle(a, 62, intimate ? 0.24 : 0.34);
      dranyenLilt(
        a,
        B % 2 === 0 ? [n('D3'), n('A3'), n('D4'), n('F#4')] : [n('G3'), n('D4'), n('G4'), n('B4')],
        intimate ? 0.24 : 0.32
      );
      if (B % 8 === 0) a.bowl(0, n('D4'), intimate ? 0.34 : 0.48);
      if (B >= 2 && B <= 5) {
        a.line(MIRROR_FINALE_A, 2, 'pluck', 0.42);
        if (!intimate) a.line(MIRROR_FINALE_A, 2, 'flute', 0.62, { tr: 12, legato: true, glideTime: 0.06 });
      }
      if (B >= 6 && B <= 9) {
        a.line(MIRROR_YINGZHEN, 6, 'flute', intimate ? 0.52 : 0.66, { tr: 12, legato: true, glideTime: 0.06 });
      }
      if (!intimate && B >= 10 && B <= 12) {
        a.line(MOTIFS.vajraGuru, 10, 'mantraVoice', 0.64, { voice: 'dakini', syllables: VAJRA_GURU_SYLLABLES });
        a.line(MOTIFS.vajraGuru, 10, 'mantraVoice', 0.56, { voice: 'choir', syllables: VAJRA_GURU_SYLLABLES });
      }
      if (B >= 13 && B <= 15) {
        a.line(STUPA_ANSWER, 13, 'flute', intimate ? 0.48 : 0.64, { tr: 12, legato: true, glideTime: 0.06 });
      }
      if (B === 15) a.tingsha(2, n('A6'), 0.28);
    },
  },

  // ============================================================ VAJRA GURU MANTRA SUITE
  // 1) Traditional Samye Monastery Assembly Chant
  'mantra.samye': {
    title: { zh: '蓮師心咒・桑耶大法會傳統調', en: 'Vajra Guru · Samye Monastic Assembly' },
    desc: 'D 大調五聲、十二音節真實母音合成（嗡・啊・吽・班・雜・咕・嚕・貝・瑪・悉・地・吽）：翁則領誦師低音喉唱起腔，僧眾齊誦、空行女聲與林布竹笛、札木聶琴層層應和。',
    category: 'mantra',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 60,
    pads: [{ notes: [n('D2'), n('A2'), n('D3')], cutoff: 640, gain: 0.032, lfoRate: 0.05, sub: 0.28 }],
    bar(a) {
      const B = a.bar;
      const syl = VAJRA_GURU_SYLLABLES;
      tanpuraCycle(a, 62, 0.34);
      if (B % 4 === 0) a.bowl(0, n('A3'), 0.48);
      if (B % 4 === 3) a.tingsha(2, n('A6'), 0.28);
      a.nga(0, 0.34, { pitch: 60 });
      if (B >= 4) {
        dranyenLilt(
          a,
          B % 2 === 0 ? [n('D3'), n('A3'), n('D4'), n('F#4')] : [n('G3'), n('D4'), n('G4'), n('B3')],
          0.28
        );
      }
      // Bars 0–3: Umdze chant + unison choir (pure vocals, no flute masking)
      if (B <= 3) {
        a.line(VG_SAMYE_A, 0, 'mantraVoice', 0.72, { tr: -12, voice: 'umdze', syllables: syl });
        a.line(VG_SAMYE_A, 0, 'mantraVoice', 0.68, { voice: 'choir', syllables: syl });
      }
      // Bars 4–7: Full monastic assembly + Dakini soaring to D5
      if (B >= 4 && B <= 7) {
        a.line(VG_SAMYE_B, 4, 'mantraVoice', 0.72, { tr: -12, voice: 'choir', syllables: syl });
        a.line(VG_SAMYE_B, 4, 'mantraVoice', 0.66, { voice: 'dakini', syllables: syl });
      }
      // Bars 8–11: High devotional ascent (Dakini + Choir in octaves, soft low flute fifth)
      if (B >= 8 && B <= 11) {
        if (B === 8) a.dungchen(0, n('D2'), 7, 0.45);
        a.line(VG_SAMYE_C, 8, 'mantraVoice', 0.74, { voice: 'dakini', syllables: syl });
        a.line(VG_SAMYE_C, 8, 'mantraVoice', 0.66, { tr: -12, voice: 'choir', syllables: syl });
      }
      // Bars 12–15: Benediction return to Phrase A with Umdze + Choir + soft flute echo
      if (B >= 12) {
        if (B === 12) a.cymbal(0, 0.32, 'silnyen');
        a.line(VG_SAMYE_A, 12, 'mantraVoice', 0.72, { tr: -12, voice: 'umdze', syllables: syl });
        a.line(VG_SAMYE_A, 12, 'mantraVoice', 0.68, { voice: 'choir', syllables: syl });
        a.line(VG_SAMYE_A, 12, 'flute', 0.32, { tr: 12, legato: true, glideTime: 0.06 });
      }
    },
  },

  // 2) Yeshe Tsogyal's Dakini Devotional Song
  'mantra.dakini': {
    title: { zh: '蓮師心咒・青朴空行祈請調', en: 'Vajra Guru · Song of the Dakini' },
    desc: 'A 大調／升 F 小調五聲、抒情虔敬的祈請曲調：空行女聲（Dakini）吟唱十二音節心咒，搭配札木聶琴分解和弦、青朴甘露水滴與竹笛對位。',
    category: 'mantra',
    root: 57,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 66,
    pads: [{ notes: [n('A2'), n('E3'), n('A3')], cutoff: 720, gain: 0.026, lfoRate: 0.06, sub: 0.22 }],
    bar(a) {
      const B = a.bar;
      const syl = VAJRA_GURU_SYLLABLES;
      tanpuraCycle(a, 57, 0.24);
      dranyenLilt(
        a,
        B % 2 === 0 ? [n('A2'), n('E3'), n('A3'), n('C#4')] : [n('F#2'), n('C#3'), n('F#3'), n('A3')],
        0.24
      );
      if (a.chance(0.7)) a.rainDrop(a.rand(0, 4), 0.28);
      if (B % 4 === 0) a.bowl(0, n('A3'), 0.38);
      if (B % 8 === 7) a.tingsha(2, n('E7'), 0.24);
      if (B >= 4) a.tabla(0, 'dha', 0.28);
      if (B >= 4) a.tabla(2, 'na', 0.2);
      // Bars 0–3: Dakini voice solo prayer (unmasked)
      if (B <= 3) {
        a.line(VG_DAKINI_A, 0, 'mantraVoice', 0.78, { voice: 'dakini', syllables: syl });
      }
      // Bars 4–7: Dakini voice leads Phrase B with soft lower choir harmony
      if (B >= 4 && B <= 7) {
        a.line(VG_DAKINI_B, 4, 'mantraVoice', 0.78, { voice: 'dakini', syllables: syl });
        a.line(VG_DAKINI_B, 4, 'mantraVoice', 0.48, { tr: -12, voice: 'choir', syllables: syl });
      }
      // Bars 8–11: Monastic choir chants Phrase A while flute plays high harmony
      if (B >= 8 && B <= 11) {
        a.line(VG_DAKINI_A, 8, 'mantraVoice', 0.72, { tr: -12, voice: 'choir', syllables: syl });
        a.line(VG_DAKINI_A, 8, 'flute', 0.38, { legato: true, glideTime: 0.06 });
      }
      // Bars 12–15: Full vocal duet (Dakini + Choir in octaves)
      if (B >= 12) {
        a.line(VG_DAKINI_B, 12, 'mantraVoice', 0.76, { voice: 'dakini', syllables: syl });
        a.line(VG_DAKINI_B, 12, 'mantraVoice', 0.64, { tr: -12, voice: 'choir', syllables: syl });
      }
    },
  },

  // 3) Wrathful Dorje Drolö / Vajrakīlaya Subjugation Chant
  'mantra.wrathful': {
    title: { zh: '蓮師心咒・忿怒金剛除障調', en: 'Vajra Guru · Wrathful Dorje Drolö Chant' },
    desc: 'D 多利安調式、88 BPM 威猛除障儀軌：翁則低音泛音喉唱誦出十二金剛句，伴隨急促的達瑪如手鼓、大鼓、羅爾莫鈸、銅欽長號與甲林嗩吶。',
    category: 'mantra',
    root: 62,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 88,
    pads: [{ notes: [n('D2'), n('A2')], cutoff: 360, gain: 0.032, lfoRate: 0.12, lfoDepth: 0.42, sub: 0.3 }],
    bar(a) {
      const B = a.bar;
      const syl = VAJRA_GURU_SYLLABLES;
      // Ritual drum & damaru pulse
      for (const [beat, vel] of [[0, 0.58], [1.5, 0.34], [2, 0.46], [3, 0.38]]) a.nga(beat, vel, { pitch: 58 });
      for (let k = 0; k < 4; k++) a.damaru(k + 0.5, 0.2);
      if (B % 4 === 0) {
        a.dungchen(0, n('D2'), 7, 0.45);
        a.cymbal(0, 0.34, 'rolmo');
      }
      if (B % 4 === 2) a.cymbal(0, 0.24, 'silnyen');
      // Bars 0–3: Deep Umdze throat chant on Wrathful Phrase A
      if (B <= 3) {
        a.line(VG_WRATH_A, 0, 'mantraVoice', 0.82, { voice: 'umdze', syllables: syl });
      }
      // Bars 4–7: Umdze + Choir on Wrathful Phrase B
      if (B >= 4 && B <= 7) {
        a.line(VG_WRATH_B, 4, 'mantraVoice', 0.68, { voice: 'umdze', syllables: syl });
        a.line(VG_WRATH_B, 4, 'mantraVoice', 0.58, { voice: 'choir', syllables: syl });
      }
      // Bars 8–11: Umdze + Choir octave chant with Gyaling response
      if (B >= 8 && B <= 11) {
        a.line(VG_WRATH_A, 8, 'mantraVoice', 0.68, { voice: 'umdze', syllables: syl });
        a.line(VG_WRATH_A, 8, 'mantraVoice', 0.58, { tr: 12, voice: 'choir', syllables: syl });
        a.line(VG_WRATH_A, 8, 'gyaling', 0.3, { tr: 12, legato: true });
      }
      // Bars 12–15: Full ritual climax (Umdze + Choir + fast Damaru)
      if (B >= 12) {
        for (let k = 0; k < 4; k++) a.damaru(k, 0.18);
        a.line(VG_WRATH_B, 12, 'mantraVoice', 0.68, { voice: 'umdze', syllables: syl });
        a.line(VG_WRATH_B, 12, 'mantraVoice', 0.6, { voice: 'choir', syllables: syl });
        a.line(VG_WRATH_B, 12, 'gyaling', 0.3, { tr: 12, legato: true });
      }
    },
  },

  // 4) Rainbow-Body Dzogchen Samadhi & Five Singing Bowls
  'mantra.dzogchen': {
    title: { zh: '蓮師心咒・虹光大圓滿禪觀', en: 'Vajra Guru · Rainbow Body Samadhi' },
    desc: 'G 大調五聲、48 BPM 寂靜禪修曲：五口西藏頌缽泛音交織、水晶風鈴輕響，空行梵音與低音喉唱在深谷殘響中緩緩唱誦十二音節心咒。',
    category: 'mantra',
    root: 67,
    beatsPerBar: 4,
    loopBars: 16,
    bpm: 48,
    pads: [
      { notes: [n('G2'), n('D3'), n('B3')], cutoff: 580, gain: 0.028, lfoRate: 0.04, lfoDepth: 0.35, sub: 0.24 },
      { notes: [n('D6')], type: 'sine', detune: 4, cutoff: 3800, gain: 0.006, lfoDepth: 0.15 },
    ],
    bar(a) {
      const B = a.bar;
      const syl = VAJRA_GURU_SYLLABLES;
      const bowls = [n('G3'), n('B3'), n('D4'), n('G4'), n('A4')];
      a.bowl(0, bowls[B % bowls.length], 0.38);
      if (B % 2 === 1) a.bowl(2, bowls[(B + 2) % bowls.length], 0.28);
      scatterChimes(a, [n('G6'), n('A6'), n('B6'), n('D7'), n('E7')], 1, 0.28);
      if (B % 8 === 0) a.tingsha(0, n('D7'), 0.24);
      // Bars 0–3: Dakini + soft Umdze sub-octave chanting the contemplative 12 syllables
      if (B <= 3) {
        a.line(VG_DZOGCHEN, 0, 'mantraVoice', 0.74, { voice: 'dakini', syllables: syl });
        a.line(VG_DZOGCHEN, 0, 'mantraVoice', 0.52, { tr: -12, voice: 'umdze', syllables: syl });
      }
      // Bars 4–7: Monastic choir chants in warm register with soft flute halo
      if (B >= 4 && B <= 7) {
        a.line(VG_DZOGCHEN, 4, 'mantraVoice', 0.68, { tr: -12, voice: 'choir', syllables: syl });
        a.line(VG_DZOGCHEN, 4, 'flute', 0.32, { legato: true, glideTime: 0.09, breath: 1.4 });
      }
      // Bars 8–11: Dakini + Choir harmony
      if (B >= 8 && B <= 11) {
        a.line(VG_DZOGCHEN, 8, 'mantraVoice', 0.72, { voice: 'dakini', syllables: syl });
        a.line(VG_DZOGCHEN, 8, 'mantraVoice', 0.62, { tr: -12, voice: 'choir', syllables: syl });
      }
      // Bars 12–15: Canonical Vajra Guru motif sung by Choir & Dakini
      if (B >= 12 && B <= 14) {
        a.line(MOTIFS.vajraGuru, 12, 'mantraVoice', 0.7, { tr: 17, voice: 'dakini', syllables: syl });
        a.line(MOTIFS.vajraGuru, 12, 'mantraVoice', 0.62, { tr: 5, voice: 'choir', syllables: syl });
      }
    },
  },
};

// ---------------------------------------------------------------- Boss cham-dance builder
/**
 * 羌姆金剛舞 Cham ritual battle music. Phase 1 → 2 adds damaru & fills,
 * phase 3 speeds up, doubles cymbals and lifts the gyaling an octave.
 */
function bossTrack({ title, desc, tr, bpm, color }) {
  const R = n('D2') + tr;
  return {
    title,
    desc,
    root: 62 + tr,
    beatsPerBar: 4,
    loopBars: 8,
    bpm: (v) => bpm * ((v.phase ?? 1) >= 3 ? 1.18 : (v.phase ?? 1) === 2 ? 1.08 : 1),
    pads: [{ notes: [R, R + 7], cutoff: 300, gain: 0.035, lfoRate: 0.15, lfoDepth: 0.4, sub: 0.35 }],
    bar(a, v) {
      const B = a.bar;
      const ph = v.phase ?? 1;
      if (B === 0 && a.loop === 0) a.cymbal(0, 0.4, 'silnyen');
      if (B % 4 === 0) a.dungchen(0, R, 7, 0.6);
      if (B % 4 === 2) a.dungchen(0, R + 12, 3.5, 0.32);
      const hits = [[0, 0.8], [1.5, 0.45], [2, 0.6], [3, 0.5], [3.5, 0.4]];
      if (ph >= 2) hits.push([2.5, 0.35]);
      if (ph >= 3) hits.push([3.25, 0.3], [3.75, 0.35], [0.5, 0.3]);
      for (const [beat, vel] of hits) a.nga(beat, vel, { pitch: 60 });
      if (ph >= 2) for (let k = 0; k < 4; k++) a.damaru(k + 0.5, 0.26);
      if (B % 2 === 0 || ph >= 3) a.cymbal(0, 0.42, 'rolmo');
      if (ph >= 3) a.cymbal(2, 0.3, 'tick');
      const gtr = tr + (ph >= 3 ? 12 : 0);
      if (ph >= 3) {
        if (B <= 1) a.line(BOSS_A, 0, 'gyaling', 0.62, { tr: gtr });
        if (B === 4 || B === 5) a.line(BOSS_A, 4, 'gyaling', 0.62, { tr: gtr });
      }
      if (B === 2 || B === 3) a.line(BOSS_A, 2, 'gyaling', 0.66, { tr: gtr });
      if (B === 6 || B === 7) a.line(BOSS_B, 6, 'gyaling', 0.66, { tr: gtr });

      if (color === 'migoi') {
        if (B % 8 === 0) a.chant(0, R, 6, 0.42, 'a');
        a.nga(0, 0.45, { pitch: 44, decay: 1.1 });
      } else if (color === 'drought') {
        a.tanpura(0, R + 12, 0.35);
        for (const [beat, s] of [[0, 'dha'], [1, 'na'], [1.5, 'na'], [2, 'ge'], [3, 'dha'], [3.5, 'tin']]) a.tabla(beat, s, 0.4);
      } else if (color === 'tenma') {
        scatterChimes(a, [64, 67, 69, 71, 74].map((m) => m + 24), 3, 0.42);
        if (B === 4) a.flute(0, n('E6'), 4, 0.3, { breath: 3, vib: 0.02 });
      } else if (color === 'shampo') {
        for (let k = 0; k < 3; k++) a.yakBell(Math.floor(a.rand(0, 8)) / 2, a.pick([n('A5'), n('C6'), n('E6')]), 0.26);
        if (B % 4 === 0) a.thunder(0, 0.35);
      } else if (color === 'pehar') {
        for (let k = 0; k < 4; k++) a.damaru(k, 0.24);
        if (B % 4 === 0) a.chant(0, R + 12, 4, 0.38, 'a');
        if (B % 4 === 2) a.cymbal(0, 0.28, 'silnyen');
      } else if (color === 'terma') {
        scatterChimes(a, [n('F#6'), n('A6'), n('C#7'), n('E7')], 3, 0.4);
        if (B % 4 === 0) a.bowl(0, n('F#3'), 0.48);
        for (let k = 0; k < 4; k++) if (k % 2 === 1) a.damaru(k, 0.24);
      }
    },
  };
}

MUSIC_TRACKS['boss.migoiKing'] = bossTrack({
  title: { zh: '頭目戰・雪人王', en: 'Boss · Migoi King' },
  desc: '羌姆金剛舞（D）：大鼓、羅爾莫鈸、銅欽長號與甲林嗩吶，配上低吼般的誦經。',
  tr: 0, bpm: 84, color: 'migoi',
});
MUSIC_TRACKS['boss.droughtLord'] = bossTrack({
  title: { zh: '頭目戰・旱障魔主', en: 'Boss · Drought Lord' },
  desc: '羌姆金剛舞（D）＋塔布拉與坦普拉：尼泊爾與藏地儀軌交會的普巴金剛之戰。',
  tr: 0, bpm: 90, color: 'drought',
});
MUSIC_TRACKS['boss.tenmaStorm'] = bossTrack({
  title: { zh: '頭目戰・十二丹瑪之風暴', en: 'Boss · Storm of the Twelve Tenma' },
  desc: '羌姆金剛舞（E）＋冰晶風鈴與呼嘯的風笛。',
  tr: 2, bpm: 96, color: 'tenma',
});
MUSIC_TRACKS['boss.yarlhaShampo'] = bossTrack({
  title: { zh: '頭目戰・雅拉香波白犛牛', en: 'Boss · Yarlha Shampo White Yak' },
  desc: '羌姆金剛舞（G）＋雷鳴與犛牛鈴：山神之怒。',
  tr: -7, bpm: 100, color: 'shampo',
});
MUSIC_TRACKS['boss.pehar'] = bossTrack({
  title: { zh: '頭目戰・白哈爾王', en: 'Boss · Pehar Gyalpo' },
  desc: '羌姆金剛舞（C）：戰鼓般連打的達瑪如、長鳴的絲年鈸與低吼誦經 —— 調伏八部鬼神之王。',
  tr: -2, bpm: 104, color: 'pehar',
});
MUSIC_TRACKS['boss.termaGuardian'] = bossTrack({
  title: { zh: '頭目戰・守藏者', en: 'Boss · Terma Guardian' },
  desc: '羌姆金剛舞（F#）：伏藏晶石風鈴、法缽共鳴與達瑪如 —— 考驗伏藏師定力的金剛護法。',
  tr: 4, bpm: 106, color: 'terma',
});
MUSIC_TRACKS['boss.default'] = MUSIC_TRACKS['boss.migoiKing'];

// ================================================================ STINGERS
export const MUSIC_STINGERS = {
  /** 淨相 Pure Vision — chapter intro card. */
  vision: {
    title: { zh: '淨相開啟（章節開場）', en: 'Pure Vision (chapter intro)' },
    bpm: 60,
    duration: 9,
    play(a, v) {
      const tr = v.tr ?? 0;
      a.bowl(0, n('A3') + tr, 0.65);
      a.tingsha(0.05, n('A6') + tr, 0.38);
      a.chant(0.5, n('D2') + tr, 7, 0.35, 'om');
      a.line(MOTIFS.omAhHum, 0, 'mantraVoice', 0.75, {
        tr,
        at: 1.5,
        voice: 'choir',
        syllables: ['om', 'ah', 'hum'],
      });
      a.tingsha(8.5, n('A6') + tr, 0.3);
    },
  },
  /** 章節圓滿 Chapter complete — dungchen, cymbal crash, full Vajra Guru motif. */
  chapterComplete: {
    title: { zh: '章節圓滿', en: 'Chapter Complete' },
    bpm: 72,
    duration: 15,
    duckLevel: 0.15,
    play(a, v) {
      const tr = v.tr ?? 0;
      a.dungchen(0, n('D2') + tr, 3.6, 0.65);
      a.cymbal(4, 0.5, 'rolmo');
      a.bowl(4, n('A3') + tr, 0.55);
      a.line(MOTIFS.vajraGuru, 0, 'mantraVoice', 0.76, {
        tr,
        at: 4,
        voice: 'choir',
        syllables: VAJRA_GURU_SYLLABLES,
      });
      a.line(MOTIFS.vajraGuru, 0, 'mantraVoice', 0.65, {
        tr: tr + 12,
        at: 4,
        voice: 'dakini',
        syllables: VAJRA_GURU_SYLLABLES,
      });
      const arp = [n('D3'), n('A3'), n('D4'), n('F#4')];
      for (let b = 4; b < 16; b++) {
        a.pluck(b, arp[b % 4] + tr, 0, 0.3);
        if (b % 2 === 1) a.pluck(b + 0.5, arp[(b + 2) % 4] + tr, 0, 0.22);
      }
      for (const b of [4, 8, 12]) a.nga(b, 0.38);
      a.bowl(16, n('D3') + tr, 0.55);
      a.tingsha(16, n('A6') + tr, 0.35);
    },
  },
  /** 調伏 Boss subdued — gentle cadence "Siddhi Hum". */
  subdued: {
    title: { zh: '魔障調伏', en: 'Subjugation' },
    bpm: 60,
    duration: 7,
    play(a, v) {
      const tr = v.tr ?? 0;
      a.tingsha(0, n('A6') + tr, 0.36);
      a.chant(0.5, n('D2') + tr, 4.5, 0.34, 'om');
      a.line(MOTIFS.siddhiHum, 0, 'mantraVoice', 0.75, {
        tr,
        at: 1,
        voice: 'choir',
        syllables: ['sid', 'dhi', 'hum'],
      });
    },
  },
  /** 蓮師淨相對話 Talking with Guru Rinpoche's vision. */
  guru: {
    title: { zh: '蓮師現身（對話）', en: 'Guru Rinpoche appears (dialogue)' },
    bpm: 60,
    duration: 9,
    duckLevel: 0.35,
    play(a, v) {
      const tr = v.tr ?? 0;
      a.tingsha(0, n('A6') + tr, 0.3);
      a.line(MOTIFS.vajraGuru, 0, 'mantraVoice', 0.72, {
        tr,
        at: 0.5,
        voice: 'choir',
        syllables: VAJRA_GURU_SYLLABLES,
      });
      a.line(MOTIFS.vajraGuru, 0, 'mantraVoice', 0.62, {
        tr: tr + 12,
        at: 0.5,
        voice: 'dakini',
        syllables: VAJRA_GURU_SYLLABLES,
      });
    },
  },
  /** 蓮師心咒十二音節唱誦 12-syllable Vajra Guru Mantra recitation (Ultimate T / shrine). */
  vajraGuruChant: {
    title: { zh: '蓮師心咒十二音節唱誦', en: 'Vajra Guru 12-Syllable Chant' },
    bpm: 72,
    duration: 14,
    duckLevel: 0.22,
    play(a, v) {
      const tr = v.tr ?? 0;
      a.bowl(0, n('A3') + tr, 0.58);
      a.tingsha(0.04, n('A6') + tr, 0.34);
      a.line(VG_SAMYE_A, 0, 'mantraVoice', 0.62, {
        tr: tr - 12,
        at: 0.3,
        voice: 'umdze',
        syllables: VAJRA_GURU_SYLLABLES,
        legato: true,
      });
      a.line(VG_SAMYE_A, 0, 'mantraVoice', 0.58, {
        tr,
        at: 0.3,
        voice: 'dakini',
        syllables: VAJRA_GURU_SYLLABLES,
        legato: true,
      });
      a.line(VG_SAMYE_A, 0, 'flute', 0.52, { tr: tr + 12, at: 0.3, legato: true, glideTime: 0.06 });
    },
  },
  /** 頭目轉階 Boss phase shift accent (no ducking). */
  phaseShift: {
    title: { zh: '頭目轉階', en: 'Boss Phase Shift' },
    bpm: 90,
    duration: 3,
    duck: false,
    play(a, v) {
      const tr = v.tr ?? 0;
      a.nga(0, 0.9, { pitch: 56, decay: 1.2 });
      a.cymbal(0, 0.55, 'rolmo');
      a.dungchen(0, n('D2') + tr, 3, 0.55);
    },
  },
};
