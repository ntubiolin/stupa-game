"""Build the editor target, generate the level, or package the native prototype."""
import argparse
from pathlib import Path
import subprocess
import sys

PROJECT_DIR = Path(__file__).resolve().parents[1]
PROJECT = PROJECT_DIR / "StupaPilgrimage.uproject"
MAP = "/Game/Maps/Toji"
MAP_FILE = PROJECT_DIR / "Content/Maps/Toji.umap"
GENERATION_LOG = PROJECT_DIR / "Saved/Logs/TojiGeneration.log"


def run(executable, *args):
    if not executable.is_file():
        raise SystemExit(f"Unreal tool missing: {executable}")
    subprocess.run([str(executable), *map(str, args)], cwd=PROJECT_DIR, check=True)


def generated_map_ready():
    return MAP_FILE.is_file() and GENERATION_LOG.is_file() and (
        "TOJI_GENERATION_COMPLETE" in GENERATION_LOG.read_text(encoding="utf-8", errors="replace")
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ue-root", type=Path, required=True, help="UE 5.8 installation containing Engine/")
    parser.add_argument("command", choices=["build-editor", "generate", "play", "package"])
    args = parser.parse_args()
    engine = args.ue_root.resolve() / "Engine"
    batch = engine / "Build/BatchFiles"
    if sys.platform == "darwin":
        platform = "Mac"
        editor = engine / "Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor"
        build = batch / "Mac/Build.sh"
        uat = batch / "RunUAT.sh"
    elif sys.platform == "win32":
        platform = "Win64"
        editor = engine / "Binaries/Win64/UnrealEditor.exe"
        build = batch / "Build.bat"
        uat = batch / "RunUAT.bat"
    else:
        raise SystemExit("This launcher targets macOS and Windows.")

    if args.command == "build-editor":
        run(build, "StupaPilgrimageEditor", platform, "Development", f"-Project={PROJECT}", "-WaitMutex")
    elif args.command == "generate":
        GENERATION_LOG.parent.mkdir(parents=True, exist_ok=True)
        GENERATION_LOG.unlink(missing_ok=True)
        run(
            editor, PROJECT, "-unattended", "-nosplash", "-nop4", "-stdout",
            f"-abslog={GENERATION_LOG}",
            f"-ExecutePythonScript={PROJECT_DIR / 'Tools/generate_toji.py'}",
        )
        if not generated_map_ready():
            raise SystemExit(f"Generation did not complete. Open {GENERATION_LOG}.")
    else:
        if not generated_map_ready():
            raise SystemExit("Run generate successfully before launching or packaging Toji.")
        if args.command == "play":
            run(editor, PROJECT, MAP, "-game", "-log", "-windowed", "-ResX=1600", "-ResY=900")
        else:
            run(
                uat, "BuildCookRun", f"-project={PROJECT}", f"-platform={platform}",
                "-clientconfig=Development", f"-map={MAP}", "-unattended", "-nop4",
                "-build", "-cook", "-stage", "-pak", "-package", "-archive",
                f"-archivedirectory={PROJECT_DIR / 'Builds'}",
            )
            if platform == "Mac":
                bundle = PROJECT_DIR / "Builds/Mac/StupaPilgrimage.app"
                if not any(bundle.rglob("*.pak")):
                    raise SystemExit(f"Unreal archive is missing cooked game content: {bundle}")


if __name__ == "__main__":
    main()
