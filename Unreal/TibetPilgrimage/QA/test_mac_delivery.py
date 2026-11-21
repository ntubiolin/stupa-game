"""Verify where the Mac packaging command publishes its playable bundle."""
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "Tools"))
import tibet


class MacDeliveryTests(unittest.TestCase):
    def test_default_and_explicit_archive(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp).resolve()
            for options, expected in (([], home / "Downloads/TibetPilgrimage"),
                                      (["--archive", str(home / "qa-build")], home / "qa-build")):
                with self.subTest(options=options):
                    def archive(argv, **kwargs):
                        self.assertIn("-archivedirectory=" + str(expected), argv)
                        self.assertIn("-platform=Mac", argv)
                        content = expected / "Mac/TibetPilgrimage.app/Contents/UE/TibetPilgrimage/Content/Paks"
                        content.mkdir(parents=True)
                        (content / "TibetPilgrimage-Mac.pak").write_bytes(b"fixture")

                    with patch.object(Path, "home", return_value=home), patch.object(tibet, "check_maps"), \
                            patch.object(sys, "argv", ["tibet.py", "package", *options]), \
                            patch.object(tibet.subprocess, "run", side_effect=archive) as run:
                        tibet.main()
                    run.assert_called_once()
