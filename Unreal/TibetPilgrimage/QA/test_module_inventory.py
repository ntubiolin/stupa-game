"""Require an explicit UE assessment for each web client and server module."""
from pathlib import Path
import re
import unittest

QA = Path(__file__).resolve().parent
ROOT = QA.parents[2]


class ModuleInventoryTests(unittest.TestCase):
    def test_assessed_sources_match_the_checkout(self):
        expected = {
            path.relative_to(ROOT).as_posix()
            for directory in ("src", "api", "server")
            for path in (ROOT / directory).rglob("*")
            if path.suffix in (".js", ".css")
        }
        report = (QA / "Module-audit.md").read_text(encoding="utf-8")
        sources = re.findall(r"^- \[([^\]]+)\]\(([^)]+)\)$", report, re.MULTILINE)
        self.assertCountEqual([name for name, _ in sources], sorted(expected))
        for name, relative_link in sources:
            self.assertEqual((QA / relative_link).resolve(), ROOT / name, name)


if __name__ == "__main__":
    unittest.main()
