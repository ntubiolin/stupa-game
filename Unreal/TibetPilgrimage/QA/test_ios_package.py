"""Exercise the packaging CLI contract without launching Unreal, Xcode or a device."""
import contextlib
import io
from pathlib import Path
import plistlib
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "Tools"))
import tibet


class IOSPackageTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name).resolve()
        self.target = self.root / "Engine/Binaries/IOS/UnrealGame.target"
        self.target.parent.mkdir(parents=True)
        self.target.touch()
        self.archive = self.root / "TibetPilgrimage.xcarchive"

    def invoke(self, *commands, emulate=None):
        argv = ["tibet.py", *commands, "--ue-root", str(self.root), "--archive", str(self.archive)]
        with patch.object(sys, "argv", argv), patch.object(tibet, "check_maps"), \
                patch.object(tibet.subprocess, "run", side_effect=emulate) as run, \
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            tibet.main()
        return run

    @staticmethod
    def write_app(app, signed=False, platform="iPhoneOS"):
        app.mkdir(parents=True)
        info = {"CFBundleExecutable": "TibetPilgrimage", "CFBundleSupportedPlatforms": [platform]}
        (app / "Info.plist").write_bytes(plistlib.dumps(info))
        (app / "TibetPilgrimage").write_bytes(b"fixture runtime")
        paks = app / "cookeddata/TibetPilgrimage/Content/Paks"
        paks.mkdir(parents=True)
        for ext in ("pak", "utoc", "ucas"):
            (paks / ("TibetPilgrimage-IOS." + ext)).write_bytes(b"fixture package")
        if signed:
            (app / "_CodeSignature").mkdir()
            (app / "_CodeSignature/CodeResources").write_bytes(b"fixture signature")
            (app / "embedded.mobileprovision").write_bytes(b"fixture profile")

    def unsigned_build(self, argv, *, cwd, check, env):
        self.assertEqual(argv[1], "BuildCookRun")
        self.assertIn("-platform=IOS", argv)
        self.assertIn("-distribution", argv)
        self.assertNotIn("-archive", argv)
        self.assertTrue({"-cook", "-build", "-stage", "-pak", "-package"}.issubset(argv))
        self.assertIn("-archivedirectory=" + str(self.archive), argv)
        self.assertIn("CODE_SIGNING_ALLOWED = NO", Path(env["XCODE_XCCONFIG_FILE"]).read_text())
        self.assertTrue(check)
        self.assertEqual(cwd, tibet.ROOT)
        self.write_app(self.archive / "Products/Applications/TibetPilgrimage.app")
        (self.archive / "Info.plist").write_bytes(plistlib.dumps({"ArchiveVersion": 2}))

    def test_unsigned_archive(self):
        self.invoke("package", "--platform", "IOS", "--unsigned", emulate=self.unsigned_build).assert_called_once()

    def test_unsigned_requires_ios_package_command(self):
        for options in [("package", "--platform", "Mac"), ("generate", "--platform", "IOS")]:
            with self.subTest(options=options), self.assertRaises(SystemExit) as error:
                self.invoke(*options, "--unsigned")
            self.assertEqual(error.exception.code, 2)

    def test_uninstalled_platform_or_missing_archive_fails(self):
        with self.assertRaisesRegex(SystemExit, "archive metadata"):
            self.invoke("package", "--platform", "IOS", "--unsigned")
        self.target.unlink()
        with self.assertRaisesRegex(SystemExit, "iOS platform"):
            self.invoke("package", "--platform", "IOS", "--unsigned")

    def test_signed_development_app_and_ipa(self):
        self.archive = self.root / "Signed"
        app = self.archive / "IOS/TibetPilgrimage.app"
        self.write_app(app, signed=True)
        run = self.invoke("package", "--platform", "IOS")
        self.assertIn("-archive", run.call_args.args[0])
        self.assertNotIn("-distribution", run.call_args.args[0])
        self.assertIsNone(run.call_args.kwargs["env"])
        moved = app.rename(self.root / "TibetPilgrimage.app")
        with zipfile.ZipFile(self.archive / "IOS/TibetPilgrimage.ipa", "w") as ipa:
            for file in moved.rglob("*"):
                if file.is_file():
                    ipa.write(file, "Payload/TibetPilgrimage.app/" + file.relative_to(moved).as_posix())
        self.invoke("package", "--platform", "IOS")

    def test_device_content_and_signing_checks(self):
        app = self.root / "test.app"
        self.write_app(app, platform="iPhoneSimulator")
        with self.assertRaisesRegex(SystemExit, "iPhone device"):
            tibet.check_ios_app(app, unsigned=True)
        meta = plistlib.loads((app / "Info.plist").read_bytes())
        meta["CFBundleSupportedPlatforms"] = ["iPhoneOS"]
        (app / "Info.plist").write_bytes(plistlib.dumps(meta))
        with self.assertRaisesRegex(SystemExit, "signing or provisioning"):
            tibet.check_ios_app(app, unsigned=False)
        (app / "embedded.mobileprovision").write_bytes(b"unexpected")
        with self.assertRaisesRegex(SystemExit, "unsigned archive"):
            tibet.check_ios_app(app, unsigned=True)
        next(app.rglob("*.ucas")).unlink()
        with self.assertRaisesRegex(SystemExit, "IoStore"):
            tibet.check_ios_app(app, unsigned=True)
        next(app.rglob("*.pak")).unlink()
        with self.assertRaisesRegex(SystemExit, "cooked game"):
            tibet.check_ios_app(app, unsigned=True)


if __name__ == "__main__":
    unittest.main()
