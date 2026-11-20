"""Build, generate, play or archive the Tibet campaign on an Apple Silicon Mac."""
import argparse
import re
import subprocess
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
    if missing or not LOG.exists() or "TIBET_MAPS_READY" not in LOG.read_text(errors="replace"):
        raise SystemExit(f"Generate the campaign first. Missing maps: {missing}. See {LOG}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("build-editor", "generate", "play", "package"))
    parser.add_argument("--ue-root", type=Path, default=Path("/Users/Shared/Epic Games/UE_5.8"))
    parser.add_argument("--platform", choices=("Mac", "IOS"), default="Mac")
    parser.add_argument("--archive", type=Path, default=ROOT / "Builds")
    args = parser.parse_args()
    engine = args.ue_root.resolve() / "Engine"
    batch = engine / "Build/BatchFiles"
    editor = engine / "Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor"
    maps = maps_to_cook()

    def run(*argv):
        subprocess.run(argv, cwd=ROOT, check=True)

    if args.command == "build-editor":
        run(batch / "Mac/Build.sh", "TibetPilgrimageEditor", "Mac", "Development",
            f"-Project={PROJECT}", "-WaitMutex")
    elif args.command == "generate":
        LOG.parent.mkdir(parents=True, exist_ok=True)
        LOG.unlink(missing_ok=True)
        run(editor, PROJECT, "-unattended", "-nosplash", "-nop4",
            f"-abslog={LOG}", f"-ExecutePythonScript={ROOT / 'Tools/generate_tibet.py'}")
        check_maps(maps)
    elif args.command == "play":
        check_maps(maps)
        run(editor, PROJECT, maps[0], "-game", "-windowed", "-ResX=1600", "-ResY=900")
    else:
        if args.platform == "IOS" and not (engine / "Binaries/IOS/UnrealGame.target").is_file():
            raise SystemExit("Install the iOS platform for this Launcher engine before packaging.")
        check_maps(maps)
        archive = args.archive.resolve()
        run(batch / "RunUAT.sh", "BuildCookRun", f"-project={PROJECT}", f"-platform={args.platform}",
            "-clientconfig=Development", "-unattended", "-nop4", "-build", "-cook", "-stage",
            "-pak", "-package", "-archive", f"-archivedirectory={archive}")
        if args.platform == "Mac" and not any((archive / "Mac/TibetPilgrimage.app").rglob("*.pak")):
            raise SystemExit(f"Missing cooked content in {archive}")
        if args.platform == "IOS" and not list(archive.rglob("*.ipa")):
            raise SystemExit(f"Missing installable IPA in {archive}")


if __name__ == "__main__":
    main()
