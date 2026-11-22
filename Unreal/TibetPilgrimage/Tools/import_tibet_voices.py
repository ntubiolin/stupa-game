"""Import pre-recorded Gemini TTS WAV lines from Assets/Voices into /Game/Voices as USoundWave."""

from pathlib import Path

import unreal


def import_voices():
    source = Path(__file__).resolve().parents[1] / "Assets/Voices"
    wavs = sorted(source.glob("*.wav")) if source.is_dir() else []
    if not wavs:
        unreal.log("TIBET_VOICES_READY 0 (no pre-recorded WAVs in Assets/Voices; runtime uses role-matched native voice fallback)")
        return 0

    tasks = []
    for wav_file in wavs:
        task = unreal.AssetImportTask()
        task.filename = str(wav_file)
        task.destination_path = "/Game/Voices"
        task.destination_name = wav_file.stem
        task.automated = True
        task.save = True
        task.replace_existing = True
        tasks.append(task)

    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)

    for wav_file in wavs:
        name = wav_file.stem
        wave = unreal.load_asset("/Game/Voices/" + name)
        if not isinstance(wave, unreal.SoundWave) or wave.duration <= 0.1:
            raise RuntimeError("Failed to import NPC voice cue: " + name)
        wave.set_editor_property("looping", False)
        wave.set_editor_property("sound_group", unreal.SoundGroup.SOUNDGROUP_VOICE)
        if not unreal.EditorAssetLibrary.save_loaded_asset(wave, only_if_is_dirty=False):
            raise RuntimeError("Failed to save NPC voice cue: " + name)

    unreal.log(f"TIBET_VOICES_READY {len(wavs)}")
    return len(wavs)


if __name__ == "__main__":
    import_voices()
