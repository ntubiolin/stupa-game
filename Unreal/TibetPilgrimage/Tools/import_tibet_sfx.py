"""Import procedural Tibetan combat, ritual & loot sound effects into /Game/SFX."""
from pathlib import Path
import sys
import unreal

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_sfx import SFX_NAMES, generate_all


def import_sfx():
    source = Path(__file__).resolve().parents[1] / "Assets" / "SFX"
    if not all((source / f"{name}.wav").is_file() for name in SFX_NAMES):
        generate_all(source)
    unreal.EditorAssetLibrary.make_directory("/Game/SFX")
    tasks = []
    for name in SFX_NAMES:
        task = unreal.AssetImportTask()
        task.filename = str(source / f"{name}.wav")
        task.destination_path = "/Game/SFX"
        task.destination_name = name
        task.automated = True
        task.replace_existing = True
        task.save = True
        tasks.append(task)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
    for name in SFX_NAMES:
        wave = unreal.load_asset(f"/Game/SFX/{name}")
        if not isinstance(wave, unreal.SoundWave) or wave.duration <= 0.05:
            raise RuntimeError(f"Failed to import Tibetan SFX cue: {name}")
        wave.set_editor_property("looping", False)
        wave.set_editor_property("sound_group", unreal.SoundGroup.SOUNDGROUP_EFFECTS)
        if not unreal.EditorAssetLibrary.save_loaded_asset(wave, only_if_is_dirty=False):
            raise RuntimeError(f"Failed to save Tibetan SFX cue: {name}")
    unreal.log(f"TIBET_SFX_READY {len(SFX_NAMES)}")


if __name__ == "__main__":
    import_sfx()
