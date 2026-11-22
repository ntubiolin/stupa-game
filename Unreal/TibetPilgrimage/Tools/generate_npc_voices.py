#!/usr/bin/env python3
"""Pre-record bilingual NPC character voiceovers using Gemini 3.8 Flash TTS.

Parses all 22 EObjective::Talk entries from Source/TibetPilgrimage/TibetRoute.inl
plus the finale SkyGuru blessing from Source/TibetPilgrimage/TibetGameMode.cpp
(46 cues total across Traditional Chinese and English), maps each character to a
distinct role-matched Gemini 3.8 TTS studio voice, and synthesizes 24 kHz 16-bit
mono WAV files via POST https://generativelanguage.googleapis.com/v1beta/interactions.
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request
import wave

TOOLS_DIR = Path(__file__).resolve().parent
PROJECT_DIR = TOOLS_DIR.parent
SOURCE_DIR = PROJECT_DIR / "Source/TibetPilgrimage"
ROUTE_INL = SOURCE_DIR / "TibetRoute.inl"
GAMEMODE_CPP = SOURCE_DIR / "TibetGameMode.cpp"
VOICES_DIR = PROJECT_DIR / "Assets/Voices"
VOICE_CAST_JSON = VOICES_DIR / "voice_cast.json"
MANIFEST_JSON = VOICES_DIR / "manifest.json"

DEFAULT_MODEL = "gemini-3.8-flash-tts"
INTERACTIONS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions"
DEPRECATED_MODEL_PREFIXES = ("gemini-2.5-", "gemini-2.0-", "gemini-1.5-", "gemini-3.1-flash-tts")

GURU_VISION_CAST = {
    "voice": "Charon",
    "gender": "male",
    "style": "majestic, deep, compassionate enlightened tantric master Guru Padmasambhava",
}

VOICE_CAST: dict[str, dict[str, str]] = {
    "oldLama": {
        "voice": "Algenib",
        "gender": "male",
        "style": "warm, aged Tibetan Buddhist lama speaking calmly with gentle grandfatherly wisdom",
    },
    "villageElder": {
        "voice": "Gacrux",
        "gender": "male",
        "style": "weathered elderly Himalayan village elder speaking earnestly with gravitas",
    },
    "messenger": {
        "voice": "Achird",
        "gender": "male",
        "style": "earnest young Indian Dharma messenger speaking briskly",
    },
    "envoyLeader": {
        "voice": "Orus",
        "gender": "male",
        "style": "dignified 8th-century Tibetan royal envoy speaking respectfully and clearly",
    },
    "palaceKeeper": {
        "voice": "Sadaltager",
        "gender": "male",
        "style": "contemplative senior monastery keeper recounting ancient royal history",
    },
    "herder": {
        "voice": "Zubenelgenubi",
        "gender": "male",
        "style": "warm, relieved Tibetan highland yak herder",
    },
    "shantarakshita": {
        "voice": "Rasalgethi",
        "gender": "male",
        "style": "serene, scholarly elderly Indian monastic abbot of Nalanda",
    },
    "trisongDetsen": {
        "voice": "Alnilam",
        "gender": "male",
        "style": "commanding, noble Tibetan Emperor Tsenpo speaking with regal authority",
    },
    "guruVision.pharping": dict(GURU_VISION_CAST),
    "guruVision.mangyul": dict(GURU_VISION_CAST),
    "guruVision.yarlung": dict(GURU_VISION_CAST),
    "skyGuru": dict(GURU_VISION_CAST),
    "yesheTsogyal": {
        "voice": "Vindemiatrix",
        "gender": "female",
        "style": "serene, luminous Tibetan wisdom dakini speaking with gentle poetic clarity",
    },
}


def sanitize_cue_token(value: str) -> str:
    """Convert resident/route tokens into valid UE USoundWave package identifiers."""
    return re.sub(r"[^A-Za-z0-9_]+", "_", value).strip("_")


def make_cue_id(route: str, step: int | None, resident: str, lang: str) -> str:
    if route == "ending" and step is None and resident == "skyGuru":
        return f"ending_skyguru_{lang}"
    assert step is not None
    return f"{sanitize_cue_token(route)}_{step}_{sanitize_cue_token(resident)}_{lang}"


def parse_talk_objectives(route_path: Path = ROUTE_INL) -> list[dict]:
    entries: list[dict] = []
    current_route: str | None = None
    step_index = 0

    for raw_line in route_path.read_text(encoding="utf-8").splitlines():
        header = re.match(r'\s*\{TEXT\("([^"]+)"\),\s*\{', raw_line)
        if header:
            current_route = header.group(1)
            step_index = 0
            continue
        if current_route is None or "{EObjective::" not in raw_line:
            continue

        kind_match = re.search(r"\{EObjective::(\w+),", raw_line)
        if not kind_match:
            continue
        kind = kind_match.group(1)
        if kind == "Talk":
            fields = [json.loads(s) for s in re.findall(r'TEXT\(("(?:[^"\\]|\\.)*")\)', raw_line)]
            if len(fields) != 7:
                raise ValueError(f"Unexpected Talk field count in {current_route} step {step_index}: {len(fields)}")
            _, _, speech_en, speech_zh, resident, speaker_en, speaker_zh = fields
            entries.append(
                {
                    "route": current_route,
                    "step": step_index,
                    "resident": resident,
                    "speaker_en": speaker_en,
                    "speaker_zh": speaker_zh,
                    "speech_en": speech_en,
                    "speech_zh": speech_zh,
                }
            )
        step_index += 1

    if len(entries) != 22:
        raise ValueError(f"Expected 22 Talk objectives in {route_path}, found {len(entries)}")
    return entries


def parse_skyguru_blessing(gamemode_path: Path = GAMEMODE_CPP) -> dict:
    source = gamemode_path.read_text(encoding="utf-8")
    match = re.search(
        r"void\s+ATibetGameMode::SpeakSkyGuruBlessing\s*\(\s*\)\s*\{(.*?)\n\}",
        source,
        flags=re.DOTALL,
    )
    if not match:
        raise ValueError(f"Could not find ATibetGameMode::SpeakSkyGuruBlessing() in {gamemode_path}")
    fields = [json.loads(s) for s in re.findall(r'TEXT\(("(?:[^"\\]|\\.)*")\)', match.group(1))]
    if len(fields) < 4:
        raise ValueError(f"Expected >= 4 TEXT literals in SpeakSkyGuruBlessing(), found {len(fields)}")
    speaker_en, speaker_zh, speech_en, speech_zh = fields[:4]
    return {
        "route": "ending",
        "step": None,
        "resident": "skyGuru",
        "speaker_en": speaker_en,
        "speaker_zh": speaker_zh,
        "speech_en": speech_en,
        "speech_zh": speech_zh,
    }


def build_voice_cues(route_path: Path = ROUTE_INL, gamemode_path: Path = GAMEMODE_CPP) -> list[dict]:
    dialogues = [*parse_talk_objectives(route_path), parse_skyguru_blessing(gamemode_path)]
    cues: list[dict] = []
    seen_ids: set[str] = set()

    for item in dialogues:
        resident = item["resident"]
        if resident not in VOICE_CAST:
            raise KeyError(f"Unmapped NPC resident '{resident}' in VOICE_CAST")
        cast = VOICE_CAST[resident]
        for lang, lang_code, speaker_key, text_key in (
            ("zh", "zh-TW", "speaker_zh", "speech_zh"),
            ("en", "en-US", "speaker_en", "speech_en"),
        ):
            cue_id = make_cue_id(item["route"], item["step"], resident, lang)
            if cue_id in seen_ids:
                raise ValueError(f"Duplicate cue_id generated: {cue_id}")
            seen_ids.add(cue_id)
            text = item[text_key].strip()
            if not text:
                raise ValueError(f"Empty dialogue text for {cue_id}")
            cues.append(
                {
                    "cue_id": cue_id,
                    "asset_path": f"/Game/Voices/{cue_id}.{cue_id}",
                    "route": item["route"],
                    "step": item["step"],
                    "resident": resident,
                    "lang": lang,
                    "language_code": lang_code,
                    "speaker_name": item[speaker_key],
                    "voice": cast["voice"],
                    "gender": cast["gender"],
                    "style": cast["style"],
                    "text": text,
                }
            )

    if len(cues) != 46:
        raise ValueError(f"Expected 46 total bilingual cues, built {len(cues)}")
    return cues


def resolve_api_key(explicit_key: str | None = None, config_path: Path | None = None) -> str | None:
    if explicit_key and explicit_key.strip():
        return explicit_key.strip()
    env_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if env_key:
        return env_key

    cfg_file = config_path or (Path.home() / ".config/gemini-api/config.yaml")
    if cfg_file.is_file():
        raw = cfg_file.read_text(encoding="utf-8", errors="replace")
        try:
            import yaml  # type: ignore

            loaded = yaml.safe_load(raw)
            if isinstance(loaded, dict):
                for key_name in ("api_key", "apiKey", "gemini_api_key"):
                    val = loaded.get(key_name)
                    if isinstance(val, str) and val.strip():
                        return val.strip()
        except ImportError:
            pass

        for line in raw.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            m = re.match(r'^(?:api_key|apiKey|gemini_api_key)\s*:\s*["\']?([^"\'#\s]+)["\']?', stripped)
            if m:
                return m.group(1).strip()

    return None


def extract_audio_payload(response_json: dict) -> tuple[bytes, str]:
    output_audio = response_json.get("output_audio")
    if isinstance(output_audio, dict) and output_audio.get("data"):
        return base64.b64decode(output_audio["data"]), output_audio.get("mime_type", "audio/wav")

    audio_blocks: list[tuple[str, str]] = []
    for step in response_json.get("steps", []):
        if not isinstance(step, dict) or step.get("type") != "model_output":
            continue
        for part in step.get("content", []):
            if isinstance(part, dict) and part.get("type") == "audio" and part.get("data"):
                audio_blocks.append((part["data"], part.get("mime_type", "audio/wav")))

    if not audio_blocks:
        raise RuntimeError(f"Interactions response contained no audio data: {json.dumps(response_json)[:400]}")
    b64_data, mime_type = audio_blocks[-1]
    return base64.b64decode(b64_data), mime_type


def ensure_riff_wav(audio_bytes: bytes, mime_type: str) -> tuple[bytes, dict]:
    """Ensure bytes form a valid 24 kHz 16-bit mono RIFF WAV and inspect audio metadata."""
    if len(audio_bytes) >= 12 and audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
        wav_bytes = audio_bytes
    elif "l16" in mime_type.lower() or "pcm" in mime_type.lower():
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(audio_bytes)
        wav_bytes = buf.getvalue()
    else:
        raise RuntimeError(f"Unexpected audio format (mime={mime_type}, header={audio_bytes[:12]!r})")

    with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
        channels = wf.getnchannels()
        sample_rate = wf.getframerate()
        sample_width = wf.getsampwidth()
        frames = wf.getnframes()
        duration_sec = frames / float(sample_rate) if sample_rate else 0.0

    if duration_sec <= 0.1:
        raise RuntimeError(f"Synthesized WAV is unexpectedly short ({duration_sec:.3f}s)")

    return wav_bytes, {
        "channels": channels,
        "sample_rate": sample_rate,
        "bits_per_sample": sample_width * 8,
        "duration_sec": round(duration_sec, 3),
        "size_bytes": len(wav_bytes),
    }


def synthesize_cue(cue: dict, api_key: str, model: str = DEFAULT_MODEL, retries: int = 3) -> tuple[bytes, dict]:
    if model.startswith(DEPRECATED_MODEL_PREFIXES):
        raise ValueError(f"Model '{model}' is deprecated; use '{DEFAULT_MODEL}'.")

    payload = {
        "model": model,
        "input": [
            {
                "type": "user_input",
                "content": [
                    {
                        "type": "text",
                        "text": cue["text"],
                        "annotations": [
                            {
                                "type": "speech_metadata",
                                "style": cue["style"],
                            }
                        ],
                    }
                ],
            }
        ],
        "response_format": {
            "type": "audio",
        },
        "generation_config": {
            "speech_config": [
                {"voice": cue["voice"]},
            ]
        },
        "store": False,
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(
            INTERACTIONS_ENDPOINT,
            data=body,
            headers={
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                response_json = json.loads(resp.read().decode("utf-8"))
            raw_audio, mime_type = extract_audio_payload(response_json)
            return ensure_riff_wav(raw_audio, mime_type)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            last_error = RuntimeError(f"HTTP {exc.code} for {cue['cue_id']}: {detail[:400]}")
            if exc.code in (429, 500, 502, 503, 504) and attempt < retries:
                time.sleep(2.0 * attempt)
                continue
            raise last_error from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(2.0 * attempt)
                continue
            raise RuntimeError(f"Network error synthesizing {cue['cue_id']}: {exc}") from exc

    assert last_error is not None
    raise last_error


def write_voice_cast_manifest(cues: list[dict], model: str = DEFAULT_MODEL, output_path: Path = VOICE_CAST_JSON) -> dict:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    document = {
        "schema_version": 1,
        "model": model,
        "endpoint": INTERACTIONS_ENDPOINT,
        "audio_format": {
            "container": "wav",
            "mime_type": "audio/wav",
            "sample_rate": 24000,
            "channels": 1,
            "bits_per_sample": 16,
        },
        "total_cues": len(cues),
        "characters": VOICE_CAST,
        "cues": cues,
    }
    output_path.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return document


def inspect_existing_wav(wav_path: Path) -> dict | None:
    if not wav_path.is_file() or wav_path.stat().st_size <= 44:
        return None
    try:
        _, meta = ensure_riff_wav(wav_path.read_bytes(), "audio/wav")
        return meta
    except Exception:
        return None


def print_cast_summary(cues: list[dict], model: str) -> None:
    print(f"Gemini TTS Model : {model}")
    print(f"Endpoint         : POST {INTERACTIONS_ENDPOINT}")
    print(f"Total Cues       : {len(cues)} ({len(cues) // 2} bilingual lines)")
    print("\nCharacter Voice Casting:")
    for resident, cast in VOICE_CAST.items():
        count = sum(1 for c in cues if c["resident"] == resident)
        print(f"  - {resident:<22} -> {cast['voice']:<15} ({cast['gender']:<6}, {count:2d} cues) | {cast['style']}")
    print("\nCue Manifest:")
    for cue in cues:
        preview = cue["text"][:42].replace("\n", " ")
        print(f"  [{cue['cue_id']:<34}] {cue['voice']:<14} ({cue['gender']:<6}) {cue['speaker_name']}: {preview}...")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Validate all 46 cues and write Assets/Voices/voice_cast.json offline")
    parser.add_argument("--api-key", help="Gemini API key (overrides GEMINI_API_KEY and ~/.config/gemini-api/config.yaml)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini TTS model (default: {DEFAULT_MODEL})")
    parser.add_argument("--force", action="store_true", help="Regenerate WAV files even if they already exist")
    parser.add_argument("--only", help="Optional substring filter matching cue_id or resident")
    args = parser.parse_args(argv)

    if args.model.startswith(DEPRECATED_MODEL_PREFIXES):
        parser.error(f"Deprecated Gemini model '{args.model}' is forbidden; use '{DEFAULT_MODEL}'.")

    cues = build_voice_cues()
    write_voice_cast_manifest(cues, model=args.model, output_path=VOICE_CAST_JSON)

    if args.dry_run:
        print_cast_summary(cues, args.model)
        print(f"\nWrote voice casting manifest to {VOICE_CAST_JSON}")
        return 0

    api_key = resolve_api_key(args.api_key)
    if not api_key:
        print(
            "Error: No Gemini API key found. Pass --api-key, export GEMINI_API_KEY, "
            "or configure ~/.config/gemini-api/config.yaml (or pass --dry-run).",
            file=sys.stderr,
        )
        return 2

    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    selected = [
        c for c in cues if not args.only or args.only in c["cue_id"] or args.only == c["resident"]
    ]
    if not selected:
        parser.error(f"--only={args.only!r} matched 0 cues")

    generated = 0
    skipped = 0
    for cue in selected:
        wav_path = VOICES_DIR / f"{cue['cue_id']}.wav"
        if not args.force and inspect_existing_wav(wav_path) is not None:
            print(f"[skip] {cue['cue_id']}.wav already exists")
            skipped += 1
            continue
        print(f"[tts ] {cue['cue_id']} ({cue['voice']} / {cue['gender']}) ...", flush=True)
        wav_bytes, meta = synthesize_cue(cue, api_key=api_key, model=args.model)
        wav_path.write_bytes(wav_bytes)
        print(f"       -> {wav_path.name} ({meta['duration_sec']:.2f}s, {meta['sample_rate']} Hz)")
        generated += 1

    manifest_entries = []
    for cue in cues:
        wav_path = VOICES_DIR / f"{cue['cue_id']}.wav"
        meta = inspect_existing_wav(wav_path)
        if meta is not None:
            manifest_entries.append(
                {
                    "cue_id": cue["cue_id"],
                    "file": wav_path.name,
                    "asset_path": cue["asset_path"],
                    "resident": cue["resident"],
                    "lang": cue["lang"],
                    "voice": cue["voice"],
                    "gender": cue["gender"],
                    **meta,
                }
            )

    MANIFEST_JSON.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "model": args.model,
                "generated_count": len(manifest_entries),
                "total_cues": len(cues),
                "files": manifest_entries,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"\nDone: generated={generated}, skipped={skipped}, available={len(manifest_entries)}/{len(cues)} -> {MANIFEST_JSON}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
