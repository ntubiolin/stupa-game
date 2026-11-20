"""Import the painted route chart into the cooked UI texture group."""
from pathlib import Path

import unreal


def import_atlas():
    task = unreal.AssetImportTask()
    task.filename = str(Path(__file__).resolve().parents[1] / 'Assets/Journal/PilgrimageAtlas.jpg')
    task.destination_path = '/Game/Journal'
    task.destination_name = 'PilgrimageAtlas'
    task.automated = True
    task.replace_existing = True
    task.save = True
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    texture = unreal.load_asset('/Game/Journal/PilgrimageAtlas')
    if not isinstance(texture, unreal.Texture2D):
        raise RuntimeError('Route chart texture import failed')
    texture.set_editor_property('lod_group', unreal.TextureGroup.TEXTUREGROUP_UI)
    texture.set_editor_property('never_stream', True)
    unreal.EditorAssetLibrary.save_loaded_asset(texture)
    unreal.log('TIBET_ATLAS_READY')


if __name__ == '__main__':
    import_atlas()
