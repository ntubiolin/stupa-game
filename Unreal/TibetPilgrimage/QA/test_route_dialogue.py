"""Regression checks for exported bilingual story dialogues and LaunchServices QA relaunch retry."""
import json
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import patch

import test_dialogue as dialogue_qa
import test_package as package_qa

ROUTE_INL = Path(__file__).resolve().parent.parent / "Source/TibetPilgrimage/TibetRoute.inl"


def parse_routes():
    routes = {}
    current = None
    for line in ROUTE_INL.read_text(encoding="utf-8").splitlines():
        header = re.match(r'\s*\{TEXT\("([^"]+)"\),\s*\{', line)
        if header:
            current = header.group(1)
            routes[current] = []
            continue
        if current is None or "{EObjective::" not in line:
            continue
        kind = re.search(r"\{EObjective::(\w+),", line).group(1)
        fields = [json.loads(s) for s in re.findall(r'TEXT\(("(?:[^"\\]|\\.)*")\)', line)]
        routes[current].append((kind, fields))
    return routes


class RouteDialogueTests(unittest.TestCase):
    def test_all_22_speaking_objectives_are_non_empty_and_distinct(self):
        routes = parse_routes()
        talks = []
        for route, steps in routes.items():
            prev_en = prev_zh = None
            for kind, fields in steps:
                if kind != "Talk":
                    continue
                self.assertEqual(len(fields), 7, f"{route}: unexpected Talk fields {fields}")
                _, _, en, zh, resident, speaker_en, speaker_zh = fields
                for value in (en, zh, resident, speaker_en, speaker_zh):
                    self.assertTrue(value.strip(), f"{route}: empty Talk field")
                self.assertNotIn("[[", en + zh)
                self.assertNotEqual(en, prev_en, f"{route}: duplicate consecutive English speech")
                self.assertNotEqual(zh, prev_zh, f"{route}: duplicate consecutive Chinese speech")
                prev_en, prev_zh = en, zh
                talks.append((route, en, zh))

        self.assertEqual(len(talks), 22)
        self.assertEqual(len({en for _, en, _ in talks}), 22)
        self.assertEqual(len({zh for _, _, zh in talks}), 22)
        self.assertEqual(len(dialogue_qa.speeches()), 22)

    def test_samye_ending_and_empowerment_have_distinct_speeches(self):
        samye_talks = [fields for kind, fields in parse_routes()["samye"] if kind == "Talk"]
        self.assertEqual(len(samye_talks), 4)
        palm_en, palm_zh = samye_talks[2][2], samye_talks[2][3]
        empower_en, empower_zh = samye_talks[3][2], samye_talks[3][3]
        self.assertNotEqual(palm_en, empower_en)
        self.assertNotEqual(palm_zh, empower_zh)
        self.assertIn("palm", palm_en)
        self.assertIn("掌心", palm_zh)
        self.assertIn("Seven Tested Men", empower_en)
        self.assertIn("Vajra Guru Mantra", empower_en)
        self.assertIn("桑耶七覺士", empower_zh)
        self.assertIn("十二字金剛上師心咒", empower_zh)

    def test_multi_node_story_beats_are_not_truncated(self):
        routes = parse_routes()
        stupa_talks = [fields for kind, fields in routes["stupa"] if kind == "Talk"]
        legend_en, legend_zh = stupa_talks[1][2], stupa_talks[1][3]
        self.assertIn("ox-hide", legend_en)
        self.assertIn("four sons", legend_en)
        self.assertIn("牛皮", legend_zh)
        self.assertIn("赤松德贊", legend_zh)

        chimphu_talk = [fields for kind, fields in routes["chimphu"] if kind == "Talk"][0]
        self.assertIn("Yeshe Tsogyal", chimphu_talk[2])
        self.assertIn("Terma", chimphu_talk[2])
        self.assertIn("Tertön", chimphu_talk[2])
        self.assertIn("益西措嘉", chimphu_talk[3])
        self.assertIn("伏藏師", chimphu_talk[3])

        ending_talk = [fields for kind, fields in routes["ending"] if kind == "Talk"][0]
        self.assertIn("karmic affinity", ending_talk[2])
        self.assertIn("伏藏仍在等待有緣人", ending_talk[3])

    def test_clean_tts_codex_expansion_and_chimphu_naming(self):
        text = ROUTE_INL.read_text(encoding="utf-8")
        self.assertNotIn("青浦", text)
        self.assertIn("前往青朴北崖石門進入伏藏秘境", text)
        for en, zh in dialogue_qa.speeches():
            self.assertNotIn("(Chimphu Hermitage)", zh)
            self.assertNotIn("（Chimphu Hermitage）", zh)
            self.assertNotIn("(Yeshe Tsogyal)", zh)
            self.assertNotIn("（Yeshe Tsogyal）", zh)
            self.assertIsNone(re.search(r"[\u0f00-\u0fff]", en), f"Tibetan script in EN speech: {en}")
            self.assertIsNone(re.search(r"[\u0f00-\u0fff]", zh), f"Tibetan script in ZH speech: {zh}")


class LaunchServicesRaceTests(unittest.TestCase):
    def test_capture_retries_when_launch_exits_without_engine_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            exe = root / "TibetPilgrimage.app/Contents/MacOS/TibetPilgrimage"
            exe.parent.mkdir(parents=True)
            exe.write_text("")
            stage = root / "stage"
            dest = root / "dest"
            stage.mkdir()
            dest.mkdir()

            calls = 0

            def fake_run(cmd, stdout=None, stderr=None, check=False, timeout=None):
                nonlocal calls
                calls += 1
                if calls == 2:
                    out_arg = next(a for a in cmd if str(a).startswith("-TibetQAOutput="))
                    out_dir = Path(out_arg.split("=", 1)[1])
                    (out_dir / "game.log").write_text("TIBET_CAST slot=6\n")
                    (out_dir / "events.tsv").write_text("combat\tboss\t9\t3\t6\npass\tskills\n")

            with patch.object(package_qa, "wait_for_prior_qa_exit") as wait_mock, \
                    patch.object(package_qa.subprocess, "run", side_effect=fake_run) as run_mock, \
                    patch.object(package_qa.time, "sleep") as sleep_mock:
                events = package_qa.capture(exe, stage, dest, "slot-6", "Skills", "terma3", [], "QA-slot-6")

            self.assertEqual(calls, 2)
            self.assertEqual(run_mock.call_count, 2)
            self.assertEqual(wait_mock.call_count, 2)
            sleep_mock.assert_called_once_with(0.5)
            self.assertEqual(events[-1], ["pass", "skills"])
            self.assertTrue((dest / "slot-6/game.log").is_file())

    def test_capture_fails_immediately_when_events_tsv_has_fail_status(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            exe = root / "TibetPilgrimage.app/Contents/MacOS/TibetPilgrimage"
            exe.parent.mkdir(parents=True)
            exe.write_text("")
            stage = root / "stage"
            dest = root / "dest"
            stage.mkdir()
            dest.mkdir()

            def fake_run(cmd, stdout=None, stderr=None, check=False, timeout=None):
                out_arg = next(a for a in cmd if str(a).startswith("-TibetQAOutput="))
                out_dir = Path(out_arg.split("=", 1)[1])
                (out_dir / "game.log").write_text("engine started\n")
                (out_dir / "events.tsv").write_text("fail\tmissing-hit\n")

            with patch.object(package_qa, "wait_for_prior_qa_exit"), \
                    patch.object(package_qa.subprocess, "run", side_effect=fake_run) as run_mock, \
                    patch.object(package_qa.time, "sleep") as sleep_mock:
                with self.assertRaises(ValueError):
                    package_qa.capture(exe, stage, dest, "slot-6", "Skills", "terma3", [], "QA-slot-6")

            self.assertEqual(run_mock.call_count, 1)
            sleep_mock.assert_not_called()

    def test_capture_raises_after_three_empty_launch_attempts(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            exe = root / "TibetPilgrimage.app/Contents/MacOS/TibetPilgrimage"
            exe.parent.mkdir(parents=True)
            exe.write_text("")
            stage = root / "stage"
            dest = root / "dest"
            stage.mkdir()
            dest.mkdir()

            with patch.object(package_qa, "wait_for_prior_qa_exit"), \
                    patch.object(package_qa.subprocess, "run") as run_mock, \
                    patch.object(package_qa.time, "sleep") as sleep_mock:
                with self.assertRaises(FileNotFoundError):
                    package_qa.capture(exe, stage, dest, "slot-6", "Skills", "terma3", [], "QA-slot-6")

            self.assertEqual(run_mock.call_count, 3)
            self.assertEqual(sleep_mock.call_count, 2)

    def test_wait_for_prior_qa_exit_polls_until_process_terminates(self):
        exe = Path("/tmp/TibetPilgrimage.app/Contents/MacOS/TibetPilgrimage")
        ps_outputs = [
            f"101 {exe} -windowed -TibetQA=Skills -TibetQAOutput=/tmp/slot-5\n",
            f"101 {exe} -windowed -TibetQA=Skills -TibetQAOutput=/tmp/slot-5\n",
            "202 /usr/bin/python3 test_package.py\n",
        ]
        with patch.object(package_qa.subprocess, "check_output", side_effect=ps_outputs) as ps_mock, \
                patch.object(package_qa.time, "sleep") as sleep_mock:
            package_qa.wait_for_prior_qa_exit(exe, timeout=3.0, interval=0.15)

        self.assertEqual(ps_mock.call_count, 3)
        self.assertEqual(sleep_mock.call_count, 2)


if __name__ == "__main__":
    unittest.main()
