"""Generate procedural 32 kHz 16-bit PCM Tibetan ritual, combat & loot SFX (.wav) with zero external deps."""
import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 32000
TAU = 2.0 * math.pi
OUT_DIR = Path(__file__).resolve().parents[1] / "Assets" / "SFX"

SFX_NAMES = (
    "sfx_cast_bolt",
    "sfx_cast_mantra",
    "sfx_cast_heavy",
    "sfx_enemy_hit",
    "sfx_enemy_purify",
    "sfx_bow_shot",
    "sfx_loot_pickup",
)


def _noise_seq(length, seed):
    state = seed & 0xFFFFFFFF
    out = [0.0] * length
    prev = 0.0
    for i in range(length):
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        raw = ((state >> 8) / 8388607.5) - 1.0
        # Gentle low-pass smoothing for silky wind/whoosh texture
        prev = prev * 0.62 + raw * 0.38
        out[i] = prev
    return out


def _write_wav(path: Path, samples):
    n = len(samples)
    fade_in = min(int(0.0025 * SAMPLE_RATE), n // 8)
    fade_out = min(int(0.015 * SAMPLE_RATE), n // 4)
    pcm = bytearray(n * 2)
    for i, val in enumerate(samples):
        env = 1.0
        if i < fade_in:
            env = i / max(1, fade_in)
        elif i >= n - fade_out:
            env = (n - 1 - i) / max(1, fade_out)
        clamped = max(-0.98, min(0.98, math.tanh(val * env * 1.12)))
        struct.pack_into("<h", pcm, i * 2, int(round(clamped * 32767.0)))
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(bytes(pcm))


def _synth_cast_bolt():
    dur = 0.34
    n = int(dur * SAMPLE_RATE)
    nz = _noise_seq(n, 0x108A11)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # Crystalline 5-prong vajra chime + airy mantra whoosh
        chime = (
            0.44 * math.sin(TAU * 880.0 * t) * math.exp(-t * 11.5)
            + 0.28 * math.sin(TAU * 1318.5 * t) * math.exp(-t * 14.0)
            + 0.19 * math.sin(TAU * 2112.0 * t) * math.exp(-t * 18.5)
            + 0.12 * math.sin(TAU * 2860.0 * t) * math.exp(-t * 24.0)
        )
        sweep = math.sin(TAU * (420.0 + 960.0 * (1.0 - math.exp(-t * 9.0))) * t)
        whoosh_env = max(0.0, math.sin(math.pi * min(1.0, t / 0.26))) ** 1.4 * math.exp(-t * 4.5)
        out.append(chime + (0.24 * nz[i] + 0.14 * sweep) * whoosh_env)
    return out


def _synth_cast_mantra():
    dur = 0.64
    n = int(dur * SAMPLE_RATE)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        attack = 1.0 - math.exp(-t * 85.0)
        # Warm Tibetan singing-bowl harmonic chord with gentle shimmer beat
        beat = 1.0 + 0.14 * math.sin(TAU * 5.2 * t)
        bowl = (
            0.36 * math.sin(TAU * 293.66 * t) * math.exp(-t * 3.2)
            + 0.30 * math.sin(TAU * 440.00 * t) * math.exp(-t * 3.8)
            + 0.24 * math.sin(TAU * 587.33 * t + 0.4) * math.exp(-t * 4.5)
            + 0.16 * math.sin(TAU * 880.00 * t) * math.exp(-t * 5.8)
            + 0.10 * math.sin(TAU * 1318.5 * t) * math.exp(-t * 8.5)
        )
        out.append(attack * beat * bowl)
    return out


def _synth_cast_heavy():
    dur = 0.70
    n = int(dur * SAMPLE_RATE)
    nz = _noise_seq(n, 0x5A3E77)
    out = []
    phase_sub = 0.0
    for i in range(n):
        t = i / SAMPLE_RATE
        f_sub = 48.0 + 96.0 * math.exp(-t * 22.0)
        phase_sub += TAU * f_sub / SAMPLE_RATE
        sub = 0.52 * math.sin(phase_sub) * math.exp(-t * 7.5)
        # Bronze Prajna Ghanta bell + Phurba iron resonance
        bell = (
            0.34 * math.sin(TAU * 523.25 * t) * math.exp(-t * 4.6)
            + 0.25 * math.sin(TAU * 783.99 * t) * math.exp(-t * 5.8)
            + 0.20 * math.sin(TAU * 1418.0 * t) * math.exp(-t * 8.2)
            + 0.14 * math.sin(TAU * 2245.0 * t) * math.exp(-t * 12.5)
        )
        strike = 0.26 * nz[i] * math.exp(-t * 34.0)
        out.append(sub + bell + strike)
    return out


def _synth_enemy_hit():
    dur = 0.28
    n = int(dur * SAMPLE_RATE)
    nz = _noise_seq(n, 0x99C0DE)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SAMPLE_RATE
        # Punchy percussive body thud + bronze vajra spark crackle
        f_thud = 52.0 + 135.0 * math.exp(-t * 38.0)
        phase += TAU * f_thud / SAMPLE_RATE
        thud = 0.66 * math.sin(phase) * math.exp(-t * 14.5)
        spark = (
            0.28 * math.sin(TAU * 1680.0 * t) * math.exp(-t * 22.0)
            + 0.20 * math.sin(TAU * 2540.0 * t) * math.exp(-t * 28.0)
        )
        crunch = 0.36 * nz[i] * math.exp(-t * 36.0)
        out.append(thud + spark + crunch)
    return out


def _synth_enemy_purify():
    dur = 0.76
    n = int(dur * SAMPLE_RATE)
    notes = (
        (0.00, 587.33, 0.34),
        (0.08, 739.99, 0.30),
        (0.16, 880.00, 0.32),
        (0.25, 1174.66, 0.34),
        (0.35, 1760.00, 0.28),
    )
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        val = 0.18 * math.sin(TAU * 293.66 * t) * math.exp(-t * 3.4)
        for onset, freq, amp in notes:
            if t >= onset:
                dt = t - onset
                att = 1.0 - math.exp(-dt * 120.0)
                val += att * amp * (
                    math.sin(TAU * freq * dt) * math.exp(-dt * 5.2)
                    + 0.35 * math.sin(TAU * freq * 2.0 * dt) * math.exp(-dt * 8.5)
                )
        out.append(val)
    return out


def _synth_bow_shot():
    dur = 0.36
    n = int(dur * SAMPLE_RATE)
    nz = _noise_seq(n, 0xB07754)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SAMPLE_RATE
        # Plucked horn-bow string twang + fiery arrow air whoosh
        f_str = 162.0 + 46.0 * math.exp(-t * 18.0)
        phase += TAU * f_str / SAMPLE_RATE
        twang = (
            0.46 * math.sin(phase) * math.exp(-t * 10.5)
            + 0.26 * math.sin(2.0 * phase) * math.exp(-t * 15.0)
            + 0.16 * math.sin(3.0 * phase) * math.exp(-t * 21.0)
        )
        whoosh_t = max(0.0, t - 0.015)
        whoosh_env = max(0.0, math.sin(math.pi * min(1.0, whoosh_t / 0.28))) ** 1.3 * math.exp(-whoosh_t * 5.5)
        whoosh = (0.42 * nz[i] + 0.15 * math.sin(TAU * (980.0 - 460.0 * whoosh_t) * whoosh_t)) * whoosh_env
        out.append(twang + whoosh)
    return out


def _synth_loot_pickup():
    dur = 0.46
    n = int(dur * SAMPLE_RATE)
    chimes = (
        (0.00, 880.00, 0.38),
        (0.07, 1174.66, 0.36),
        (0.14, 1479.98, 0.34),
        (0.21, 1760.00, 0.38),
    )
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        val = 0.0
        for onset, freq, amp in chimes:
            if t >= onset:
                dt = t - onset
                att = 1.0 - math.exp(-dt * 150.0)
                val += att * amp * (
                    math.sin(TAU * freq * dt) * math.exp(-dt * 7.8)
                    + 0.30 * math.sin(TAU * freq * 2.0 * dt) * math.exp(-dt * 13.0)
                )
        out.append(val)
    return out


def generate_all(dest: Path = OUT_DIR):
    dest.mkdir(parents=True, exist_ok=True)
    builders = {
        "sfx_cast_bolt": _synth_cast_bolt,
        "sfx_cast_mantra": _synth_cast_mantra,
        "sfx_cast_heavy": _synth_cast_heavy,
        "sfx_enemy_hit": _synth_enemy_hit,
        "sfx_enemy_purify": _synth_enemy_purify,
        "sfx_bow_shot": _synth_bow_shot,
        "sfx_loot_pickup": _synth_loot_pickup,
    }
    written = []
    for name in SFX_NAMES:
        wav_path = dest / f"{name}.wav"
        samples = builders[name]()
        _write_wav(wav_path, samples)
        written.append(wav_path)
    return written


if __name__ == "__main__":
    files = generate_all()
    print(f"Generated {len(files)} Tibetan SFX files in {OUT_DIR}: {[p.name for p in files]}")
