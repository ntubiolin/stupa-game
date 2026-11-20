"""Build, generate, play or archive the Tibet campaign on an Apple Silicon Mac."""
import argparse
import os
import plistlib
import re
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "TibetPilgrimage.uproject"
LOG = ROOT / "Saved/Logs/TibetGeneration.log"


def maps_to_cook():
    config = (ROOT / "Config/DefaultGame.ini").read_text()
    maps = re.findall(r'^\+MapsToCook=\(FilePath="(/Game/Maps/Tibet/\w+)"\)$', config, re.M)
    if not maps or len(set(maps)) != len(maps):
        raise SystemExit("Expected a unique Tibet map list in DefaultGame.ini")
    return maps


def check_maps(maps):
    missing = [m for m in maps if not (ROOT / "Content" / (m[6:] + ".umap")).is_file()]
    if missing:
        raise SystemExit(f"Generate the campaign first. Missing maps: {missing}")


def check_ios_app(app, unsigned):
    if app.suffix == ".ipa":
        prefix = "Payload/TibetPilgrimage.app/"
        with zipfile.ZipFile(app) as ipa:
            sizes = {entry.filename[len(prefix):]: entry.file_size for entry in ipa.infolist()
                     if entry.filename.startswith(prefix) and not entry.is_dir()}
            info = ipa.read(prefix + "Info.plist") if "Info.plist" in sizes else None
    else:
        sizes = {file.relative_to(app).as_posix(): file.stat().st_size for file in app.rglob("*") if file.is_file()}
        info = (app / "Info.plist").read_bytes() if "Info.plist" in sizes else None
    if not info:
        raise SystemExit(f"Missing iOS application metadata in {app}")
    metadata = plistlib.loads(info)
    if not sizes.get(metadata.get("CFBundleExecutable")):
        raise SystemExit(f"Missing iOS game binary in {app}")
    if "iPhoneOS" not in metadata.get("CFBundleSupportedPlatforms", []):
        raise SystemExit(f"Expected an iPhone device app in {app}")
    if not any(name.endswith(".pak") and size for name, size in sizes.items()):
        raise SystemExit(f"Missing cooked game content in {app}")
    for name in sizes:
        if name.endswith(".utoc") and Path(name).stem != "global" and not sizes.get(name[:-5] + ".ucas"):
            raise SystemExit(f"Missing cooked IoStore data for {name} in {app}")
    signature = sizes.get("_CodeSignature/CodeResources")
    provision = sizes.get("embedded.mobileprovision")
    if unsigned and (signature or provision):
        raise SystemExit(f"Unexpected signing or provisioning data in unsigned archive: {app}")
    if not unsigned and not (signature and provision):
        raise SystemExit(f"Development app lacks signing or provisioning data: {app}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("build-editor", "generate", "play", "package"))
    parser.add_argument("--ue-root", type=Path, default=Path("/Users/Shared/Epic Games/UE_5.8"))
    parser.add_argument("--platform", choices=("Mac", "IOS"), default="Mac")
    parser.add_argument("--archive", type=Path, default=ROOT / "Builds")
    parser.add_argument("--unsigned", action="store_true", help="Create an unsigned native iOS device .xcarchive")
    args = parser.parse_args()
    if args.unsigned and (args.command != "package" or args.platform != "IOS"):
        parser.error("--unsigned requires package --platform IOS")
    engine = args.ue_root.resolve() / "Engine"
    batch = engine / "Build/BatchFiles"
    editor = engine / "Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor"
    maps = maps_to_cook()

    def run(*argv, env=None):
        subprocess.run(argv, cwd=ROOT, check=True, env=env)

    if args.command == "build-editor":
        run(batch / "Mac/Build.sh", "TibetPilgrimageEditor", "Mac", "Development",
            f"-Project={PROJECT}", "-WaitMutex")
    elif args.command == "generate":
        LOG.parent.mkdir(parents=True, exist_ok=True)
        LOG.unlink(missing_ok=True)
        run(editor, PROJECT, "-unattended", "-nosplash", "-nop4",
            f"-abslog={LOG}", f"-ExecutePythonScript={ROOT / 'Tools/generate_tibet.py'}")
        if not LOG.exists() or "TIBET_MAPS_READY" not in LOG.read_text(errors="replace"):
            raise SystemExit(f"Map generation did not complete. See {LOG}")
        check_maps(maps)
    elif args.command == "play":
        check_maps(maps)
        run(editor, PROJECT, maps[0], "-game", "-windowed", "-ResX=1600", "-ResY=900")
    else:
        if args.platform == "IOS" and not (engine / "Binaries/IOS/UnrealGame.target").is_file():
            raise SystemExit("Install the iOS platform for this Launcher engine before packaging.")
        check_maps(maps)
        archive = args.archive.resolve()
        uat = [batch / "RunUAT.sh", "BuildCookRun", f"-project={PROJECT}", f"-platform={args.platform}",
               "-clientconfig=Development", "-unattended", "-nop4", "-build", "-cook", "-stage", "-pak", "-package"]
        if args.unsigned:
            if archive.suffix != ".xcarchive":
                archive = archive / "IOS/TibetPilgrimage.xcarchive"
            archive.parent.mkdir(parents=True, exist_ok=True)
            config = ROOT / "Tools/UnsignedIOS.xcconfig"
            # Xcode's global override also covers native build/stage actions before the archive action.
            run(*uat, "-distribution", f"-archivedirectory={archive}",
                env={**os.environ, "XCODE_XCCONFIG_FILE": str(config)})
            if not (archive / "Info.plist").is_file():
                raise SystemExit(f"Missing Xcode archive metadata in {archive}")
            check_ios_app(archive / "Products/Applications/TibetPilgrimage.app", unsigned=True)
            print(f"Unsigned iPhone device archive: {archive}")
        else:
            run(*uat, "-archive", f"-archivedirectory={archive}")
            if args.platform == "Mac" and not any((archive / "Mac/TibetPilgrimage.app").rglob("*.pak")):
                raise SystemExit(f"Missing cooked content in {archive}")
            if args.platform == "IOS":
                app = archive / "IOS/TibetPilgrimage.app"
                if not app.is_dir():
                    packages = list((archive / "IOS").glob("*.ipa"))
                    if len(packages) != 1:
                        raise SystemExit(f"Expected TibetPilgrimage.app or one signed IPA in {archive / 'IOS'}")
                    app = packages[0]
                check_ios_app(app, unsigned=False)
                print(f"Signed iPhone development package: {app}")



if __name__ == "__main__":
    main()
