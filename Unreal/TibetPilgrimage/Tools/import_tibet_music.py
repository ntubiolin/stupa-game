"""Import complete stereo loops rendered by export_music.mjs from the web score."""
import json
from pathlib import Path

import unreal


def import_music():
    source = Path(__file__).resolve().parents[1] / "Saved/TibetMusic"
    names = json.loads((source / "cues.json").read_text())
    tasks = []
    for name in names:
        task = unreal.AssetImportTask()
        task.filename = str(source / (name + ".wav"))
        task.destination_path = "/Game/Music"
        task.automated = True
        task.replace_existing = True
        tasks.append(task)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
    for name in names:
        wave = unreal.load_asset("/Game/Music/" + name)
        if not isinstance(wave, unreal.SoundWave) or wave.duration <= 1:
            raise RuntimeError("Failed to import full music loop: " + name)
        wave.set_editor_property("looping", True)
        wave.set_editor_property("sound_group", unreal.SoundGroup.SOUNDGROUP_MUSIC)
        if not unreal.EditorAssetLibrary.save_loaded_asset(wave, only_if_is_dirty=False):
            raise RuntimeError("Failed to save music loop: " + name)
    unreal.log(f"TIBET_MUSIC_READY {len(names)}")


if __name__ == "__main__":
    import_music()
