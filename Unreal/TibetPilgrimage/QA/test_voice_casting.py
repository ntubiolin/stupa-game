"""Unit tests for Gemini 3.8 TTS voice casting manifest and role-matched Apple voice fallback."""
import base64
import io
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
import wave

QA = Path(__file__).resolve().parent
PROJECT = QA.parent
TOOLS = PROJECT / "Tools"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

import generate_npc_voices as voice_gen  # noqa: E402
import test_dialogue as dialogue_qa  # noqa: E402

EXPECTED_STUDIO_VOICES = {
    "oldLama": ("Algenib", "male"),
    "villageElder": ("Gacrux", "male"),
    "messenger": ("Achird", "male"),
    "envoyLeader": ("Orus", "male"),
    "palaceKeeper": ("Sadaltager", "male"),
    "herder": ("Zubenelgenubi", "male"),
    "shantarakshita": ("Rasalgethi", "male"),
    "trisongDetsen": ("Alnilam", "male"),
    "guruVision.pharping": ("Charon", "male"),
    "guruVision.mangyul": ("Charon", "male"),
    "guruVision.yarlung": ("Charon", "male"),
    "skyGuru": ("Charon", "male"),
    "yesheTsogyal": ("Vindemiatrix", "female"),
}


class VoiceCastingTests(unittest.TestCase):
    def test_voice_cast_json_covers_all_46_bilingual_cues(self):
        self.assertTrue(voice_gen.VOICE_CAST_JSON.is_file(), "Missing Assets/Voices/voice_cast.json")
        manifest = json.loads(voice_gen.VOICE_CAST_JSON.read_text(encoding="utf-8"))
        self.assertEqual(manifest["model"], "gemini-3.8-flash-tts")
        self.assertEqual(manifest["endpoint"], "https://generativelanguage.googleapis.com/v1beta/interactions")
        self.assertEqual(manifest["total_cues"], 46)

        live_cues = voice_gen.build_voice_cues()
        self.assertEqual(len(live_cues), 46)
        self.assertEqual(manifest["cues"], live_cues)

        cue_ids = [c["cue_id"] for c in live_cues]
        self.assertEqual(len(cue_ids), len(set(cue_ids)))
        for cid in cue_ids:
            self.assertRegex(cid, r"^[A-Za-z0-9_]+$", f"Invalid UE asset identifier: {cid}")

        self.assertIn("stupa_0_oldLama_zh", cue_ids)
        self.assertIn("stupa_0_oldLama_en", cue_ids)
        self.assertIn("chimphu_0_yesheTsogyal_zh", cue_ids)
        self.assertIn("chimphu_0_yesheTsogyal_en", cue_ids)
        self.assertIn("ending_skyguru_zh", cue_ids)
        self.assertIn("ending_skyguru_en", cue_ids)

    def test_gemini_studio_voice_gender_and_character_mapping(self):
        talks = voice_gen.parse_talk_objectives()
        self.assertEqual(len(talks), 22)
        residents_in_game = {t["resident"] for t in talks} | {"skyGuru"}
        self.assertEqual(residents_in_game, set(EXPECTED_STUDIO_VOICES))

        female_residents = [r for r, cfg in voice_gen.VOICE_CAST.items() if cfg["gender"] == "female"]
        self.assertEqual(female_residents, ["yesheTsogyal"])

        for resident, (expected_voice, expected_gender) in EXPECTED_STUDIO_VOICES.items():
            cfg = voice_gen.VOICE_CAST[resident]
            self.assertEqual(cfg["voice"], expected_voice, resident)
            self.assertEqual(cfg["gender"], expected_gender, resident)
            self.assertTrue(cfg["style"].strip(), resident)
            if resident != "yesheTsogyal":
                self.assertNotEqual(cfg["voice"], "Vindemiatrix", resident)

    @unittest.skipUnless(sys.platform == "darwin", "Apple AVSpeechSynthesisVoice probe requires macOS")
    def test_apple_native_voice_casting_male_vs_female(self):
        with tempfile.TemporaryDirectory() as tmp:
            binary = dialogue_qa.compile_voice_probe(Path(tmp))
            tsogyal_ids = {}
            for lang in ("zh", "en"):
                out = subprocess.check_output(
                    [binary, "--inspect", lang, "yesheTsogyal"], text=True, timeout=10
                ).strip()
                self.assertIn("gender=female ", out)
                pitch = float(re.search(r"pitch=([0-9.]+)", out).group(1))
                self.assertGreater(pitch, 1.0)
                tsogyal_ids[lang] = re.search(r"id=(\S+)", out).group(1)

            male_roles = sorted(r for r in EXPECTED_STUDIO_VOICES if r != "yesheTsogyal")
            self.assertEqual(len(male_roles), 12)
            for role in male_roles:
                for lang in ("zh", "en"):
                    out = subprocess.check_output(
                        [binary, "--inspect", lang, role], text=True, timeout=10
                    ).strip()
                    self.assertIn("gender=male ", out, f"{role} ({lang}) did not resolve to male voice: {out}")
                    voice_id = re.search(r"id=(\S+)", out).group(1)
                    self.assertNotEqual(
                        voice_id,
                        tsogyal_ids[lang],
                        f"Male role {role} ({lang}) collided with female voice {voice_id}",
                    )
                    pitch = float(re.search(r"pitch=([0-9.]+)", out).group(1))
                    self.assertLess(pitch, 1.0, out)

    def test_audio_payload_extraction_and_deprecated_model_guard(self):
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(b"\x10\x00" * 6000)
        wav_bytes = buf.getvalue()
        b64 = base64.b64encode(wav_bytes).decode("ascii")

        rest_response = {
            "steps": [
                {
                    "type": "model_output",
                    "content": [{"type": "audio", "mime_type": "audio/wav", "data": b64}],
                }
            ]
        }
        raw, mime = voice_gen.extract_audio_payload(rest_response)
        checked_bytes, meta = voice_gen.ensure_riff_wav(raw, mime)
        self.assertEqual(checked_bytes[:4], b"RIFF")
        self.assertEqual(meta["sample_rate"], 24000)
        self.assertEqual(meta["channels"], 1)
        self.assertAlmostEqual(meta["duration_sec"], 0.25, places=2)

        with self.assertRaises(ValueError):
            voice_gen.synthesize_cue(voice_gen.build_voice_cues()[0], api_key="dummy", model="gemini-2.5-flash-preview-tts")


if __name__ == "__main__":
    unittest.main()
