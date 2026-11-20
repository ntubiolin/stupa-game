"""Build shared UE materials from the bundled Poly Haven surface scans."""
from pathlib import Path

import unreal

SOURCE = Path(__file__).resolve().parents[1] / "Assets/Surfaces"
DEST = "/Game/TibetSurfaces"
LIB = unreal.MaterialEditingLibrary


def build_surface(name, tiling):
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    path = f"{DEST}/M_{name}"
    material = unreal.load_asset(path) if unreal.EditorAssetLibrary.does_asset_exist(path) else None
    if not material:
        material = tools.create_asset(f"M_{name}", DEST, unreal.Material, unreal.MaterialFactoryNew())
    LIB.delete_all_material_expressions(material)
    coords = LIB.create_material_expression(material, unreal.MaterialExpressionTextureCoordinate)
    coords.set_editor_property("u_tiling", tiling)
    coords.set_editor_property("v_tiling", tiling)
    channels = {
        "Base": (unreal.MaterialSamplerType.SAMPLERTYPE_COLOR, [("RGB", "MP_BASE_COLOR")]),
        "Normal": (unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL, [("RGB", "MP_NORMAL")]),
        "ARM": (unreal.MaterialSamplerType.SAMPLERTYPE_MASKS, [
            ("R", "MP_AMBIENT_OCCLUSION"), ("G", "MP_ROUGHNESS"), ("B", "MP_METALLIC")
        ]),
    }
    for suffix, (sampler, properties) in channels.items():
        stem = f"{name}_{suffix}"
        task = unreal.AssetImportTask()
        task.filename = str(SOURCE / f"{stem}.jpg")
        task.destination_path = DEST
        task.automated = True
        task.replace_existing = True
        task.save = True
        tools.import_asset_tasks([task])
        texture = unreal.load_asset(f"{DEST}/{stem}")
        if suffix in ("Normal", "ARM"):
            compression = (unreal.TextureCompressionSettings.TC_NORMALMAP if suffix == "Normal"
                           else unreal.TextureCompressionSettings.TC_MASKS)
            texture.set_editor_property("compression_settings", compression)
            texture.set_editor_property("srgb", False)
        unreal.EditorAssetLibrary.save_loaded_asset(texture)
        sample = LIB.create_material_expression(material, unreal.MaterialExpressionTextureSample)
        sample.set_editor_property("texture", texture)
        sample.set_editor_property("sampler_type", sampler)
        LIB.connect_material_expressions(coords, "", sample, "Coordinates")
        for channel, target in properties:
            if not LIB.connect_material_property(sample, channel, getattr(unreal.MaterialProperty, target)):
                raise RuntimeError(f"Unable to connect {stem}.{channel} to {target}")
    LIB.recompile_material(material)
    unreal.EditorAssetLibrary.save_loaded_asset(material, only_if_is_dirty=False)
    return material


def make_surfaces():
    terrain = build_surface("Terrain", 0.20)
    return {"grass": terrain, "earth": terrain, "wood": build_surface("Timber", 1.5),
            "lime": build_surface("Plaster", 0.55)}
