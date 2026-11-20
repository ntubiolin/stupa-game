"""Cook the web macaque rig and animate the imported woven flag prints."""
from pathlib import Path
import json
import struct
import unreal
from tibet_mesh import SURFACES, linear

LIB = unreal.MaterialEditingLibrary
ASSETS = unreal.EditorAssetLibrary
COLORS = ("indigoCloth", "whiteCloth", "redCloth", "greenCloth", "yellowCloth")


def fur_materials(directory):
    name = "M_MacaquePaint"
    path = directory + "/" + name
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    mat = ASSETS.load_asset(path) if ASSETS.does_asset_exist(path) else tools.create_asset(
        name, directory, unreal.Material, unreal.MaterialFactoryNew())
    LIB.delete_all_material_expressions(mat)
    # Interchange's engine glTF parent does not have the ISM permutation.
    # Keep all five real web paints on one cooked, lit instancing master.
    mat.set_editor_property("used_with_instanced_static_meshes", True)
    for param, kind, prop in (("FurColor", unreal.MaterialExpressionVectorParameter, "MP_BASE_COLOR"),
                              ("Roughness", unreal.MaterialExpressionScalarParameter, "MP_ROUGHNESS"),
                              ("Metallic", unreal.MaterialExpressionScalarParameter, "MP_METALLIC")):
        node = LIB.create_material_expression(mat, kind)
        node.set_editor_property("parameter_name", param)
        LIB.connect_material_property(node, "", getattr(unreal.MaterialProperty, prop))
    LIB.recompile_material(mat)
    ASSETS.save_loaded_asset(mat, only_if_is_dirty=False)
    return mat


def macaques():
    dest = "/Game/Figures/Courtyard"
    ASSETS.make_directory(dest)
    paint_dir = dest + "/Paint"
    ASSETS.make_directory(paint_dir)
    master = fur_materials(paint_dir)
    paints = {}
    editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
    for file in sorted((Path(__file__).resolve().parents[1] / "Assets/Courtyard").glob("*.glb")):
        task = unreal.AssetImportTask()
        task.filename = str(file)
        task.destination_path = dest
        task.automated = task.replace_existing = task.save = True
        unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
        target = f"{dest}/{file.stem}/StaticMeshes/{file.stem}"
        objects = [o for o in task.get_objects() if isinstance(o, unreal.StaticMesh)]
        if not objects and ASSETS.does_asset_exist(target):
            objects = [ASSETS.load_asset(target)]
        if len(objects) != 1 or not isinstance(objects[0], unreal.StaticMesh):
            raise RuntimeError(f"Missing courtyard mesh {file.stem}: {task.imported_object_paths}")
        if objects[0].get_path_name().split(".")[0] != target:
            raise RuntimeError(f"Could not place {file.stem} at {target}")
        mesh = objects[0]
        raw = file.read_bytes()
        data = json.loads(raw[20:20+struct.unpack_from("<I",raw,12)[0]])
        for spec in data["materials"]:
            key = spec["name"]
            if key in paints:
                continue
            path = paint_dir + "/" + key
            paint = ASSETS.load_asset(path) if ASSETS.does_asset_exist(path) else unreal.AssetToolsHelpers.get_asset_tools().create_asset(
                key, paint_dir, unreal.MaterialInstanceConstant, unreal.MaterialInstanceConstantFactoryNew())
            LIB.set_material_instance_parent(paint, master)
            pbr = spec["pbrMetallicRoughness"]
            LIB.set_material_instance_vector_parameter_value(paint,"FurColor",unreal.LinearColor(*pbr["baseColorFactor"]))
            LIB.set_material_instance_scalar_parameter_value(paint,"Roughness",pbr["roughnessFactor"])
            LIB.set_material_instance_scalar_parameter_value(paint,"Metallic",pbr["metallicFactor"])
            LIB.update_material_instance(paint)
            ASSETS.save_loaded_asset(paint, only_if_is_dirty=False)
            paints[key] = paint
        settings = editor.get_nanite_settings(mesh)
        settings.set_editor_property("enabled",False)
        settings.set_editor_property("fallback_relative_error",0.)
        settings.set_editor_property("fallback_percent_triangles",1.)
        editor.set_nanite_settings(mesh,settings,True)
        expected = sum(data["accessors"][p["indices"]]["count"]//3 for p in data["meshes"][0]["primitives"])
        if mesh.get_num_triangles(0) < expected*.95:
            raise RuntimeError(f"{file.stem} lost source geometry at LOD0")
        for i,slot in enumerate(mesh.get_editor_property("static_materials")):
            key = str(slot.get_editor_property("imported_material_slot_name"))
            mesh.set_material(i,paints[key])
        ASSETS.save_loaded_asset(mesh, only_if_is_dirty=False)
    if not ASSETS.save_directory(dest):
        raise RuntimeError("Could not save courtyard models")


def wind_materials():
    dest = "/Game/TibetSurfaces"
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    name = "M_PrayerFlagWind"
    path = dest + "/" + name
    mat = ASSETS.load_asset(path) if ASSETS.does_asset_exist(path) else tools.create_asset(
        name, dest, unreal.Material, unreal.MaterialFactoryNew())
    LIB.delete_all_material_expressions(mat)
    mat.set_editor_property("two_sided", True)

    def expression(kind):
        return LIB.create_material_expression(mat, kind)

    tint = expression(unreal.MaterialExpressionVectorParameter)
    tint.set_editor_property("parameter_name", "Dye")
    paint = expression(unreal.MaterialExpressionTextureSample)
    relief = expression(unreal.MaterialExpressionTextureSample)
    for node, file in ((paint, "printedColor"), (relief, "printedRelief")):
        tex = ASSETS.load_asset(f"/Game/TibetWorld/stupa/stupa/Textures/{file}")
        if not tex:
            raise RuntimeError(f"Missing original woven texture {file}")
        node.set_editor_property("texture", tex)
    relief.set_editor_property("sampler_type", unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL)
    dyed = expression(unreal.MaterialExpressionMultiply)
    LIB.connect_material_expressions(tint, "", dyed, "A")
    LIB.connect_material_expressions(paint, "RGB", dyed, "B")
    LIB.connect_material_property(dyed, "", unreal.MaterialProperty.MP_BASE_COLOR)
    LIB.connect_material_property(relief, "RGB", unreal.MaterialProperty.MP_NORMAL)
    roughness = expression(unreal.MaterialExpressionConstant)
    roughness.set_editor_property("r", .92)
    LIB.connect_material_property(roughness, "", unreal.MaterialProperty.MP_ROUGHNESS)

    wind = expression(unreal.MaterialExpressionCustom)
    nodes = {"P": expression(unreal.MaterialExpressionWorldPosition),
             "UV": expression(unreal.MaterialExpressionTextureCoordinate),
             "T": expression(unreal.MaterialExpressionTime)}
    pins = []
    for key in nodes:
        pin = unreal.CustomInput()
        pin.set_editor_property("input_name", key)
        pins.append(pin)
    wind.set_editor_property("inputs", pins)
    wind.set_editor_property("output_type", unreal.CustomMaterialOutputType.CMOT_FLOAT3)
    # The authored upper seam is v=0, the free hem v=1. World position
    # introduces staggered gusts without a separate tick or draw per flag.
    wind.set_editor_property("code", """
float gust = sin(dot(P.xy,float2(.006,.009)) + T*2.35);
float ripple = sin(P.x*.018 - P.y*.012 + UV.x*3.7 + T*4.1);
float f = saturate(UV.y);
return f*f * float3(10*gust + 4*ripple, 5*gust + 6*ripple, 4*ripple);
""")
    for k,node in nodes.items():
        if not LIB.connect_material_expressions(node, "", wind, k):
            raise RuntimeError(f"Could not connect flag wind {k}")
    LIB.connect_material_property(wind,"",unreal.MaterialProperty.MP_WORLD_POSITION_OFFSET)
    LIB.recompile_material(mat)
    ASSETS.save_loaded_asset(mat, only_if_is_dirty=False)
    result = {}
    for key in COLORS:
        name = "MI_Wind_" + key
        path = dest + "/" + name
        instance = ASSETS.load_asset(path) if ASSETS.does_asset_exist(path) else tools.create_asset(
            name,dest,unreal.MaterialInstanceConstant,unreal.MaterialInstanceConstantFactoryNew())
        LIB.set_material_instance_parent(instance, mat)
        LIB.set_material_instance_vector_parameter_value(instance, "Dye", unreal.LinearColor(*linear(SURFACES[key][0]),1))
        LIB.update_material_instance(instance)
        ASSETS.save_loaded_asset(instance, only_if_is_dirty=False)
        result[key.lower()] = instance
    return result


def bind_window_spill():
    # Interchange preserves existing glTF material-instance overrides on reimport.
    # Explicitly enable the new lightmap on both fresh and previously generated plazas.
    directory = "/Game/TibetWorld/stupa/stupa"
    paving = ASSETS.load_asset(directory + "/Materials/paving")
    spill = ASSETS.load_asset(directory + "/Textures/pavingWindowSpill")
    if not paving or not spill:
        raise RuntimeError("Boudha paving or its window lightmap is missing")
    LIB.set_material_instance_static_switch_parameter_value(paving, "bHasEmissiveTexture", True)
    LIB.set_material_instance_scalar_parameter_value(paving, "EmissiveTexture_TexCoord", 1.)
    LIB.set_material_instance_texture_parameter_value(paving, "EmissiveTexture", spill)
    LIB.update_material_instance(paving)
    if (not LIB.get_material_instance_static_switch_parameter_value(paving, "bHasEmissiveTexture")
            or LIB.get_material_instance_scalar_parameter_value(paving, "EmissiveTexture_TexCoord") != 1.
            or LIB.get_material_instance_texture_parameter_value(paving, "EmissiveTexture") != spill):
        raise RuntimeError("Failed to bind the ground lightmap to the plaza's second UV channel")
    ASSETS.save_loaded_asset(paving, only_if_is_dirty=False)
