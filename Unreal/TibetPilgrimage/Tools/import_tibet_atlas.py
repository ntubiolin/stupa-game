"""Import the painted route chart and keepsake Thangka into the cooked UI texture group."""
from pathlib import Path

import unreal


def _import_ui_texture(filename, asset_name, uncompressed=False):
    task = unreal.AssetImportTask()
    task.filename = str(Path(__file__).resolve().parents[1] / "Assets/Journal" / filename)
    task.destination_path = "/Game/Journal"
    task.destination_name = asset_name
    task.automated = True
    task.replace_existing = True
    task.save = True
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    texture = unreal.load_asset(f"/Game/Journal/{asset_name}")
    if not isinstance(texture, unreal.Texture2D):
        raise RuntimeError(f"Journal texture import failed: {asset_name}")
    if uncompressed:
        texture.set_editor_property("compression_settings", unreal.TextureCompressionSettings.TC_EDITOR_ICON)
    texture.set_editor_property("lod_group", unreal.TextureGroup.TEXTUREGROUP_UI)
    texture.set_editor_property("never_stream", True)
    unreal.EditorAssetLibrary.save_loaded_asset(texture)


def import_atlas():
    _import_ui_texture("PilgrimageAtlas.jpg", "PilgrimageAtlas")
    if (Path(__file__).resolve().parents[1] / "Assets/Journal/KeepsakeThangka.png").is_file():
        _import_ui_texture("KeepsakeThangka.png", "KeepsakeThangka", uncompressed=True)
    unreal.log("TIBET_ATLAS_READY")


if __name__ == "__main__":
    import_atlas()
