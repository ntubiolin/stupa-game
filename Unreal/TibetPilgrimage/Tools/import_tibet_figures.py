"""Import original Blender figures before cooking the pilgrimage maps, with GPU limb-stride WPO & hit flash."""
import json
import sys
from pathlib import Path
import unreal

LIB = unreal.MaterialEditingLibrary
ASSETS = unreal.EditorAssetLibrary
MASTER_DIR = "/Game/Figures/Materials"
MASTER_NAME = "M_FigureStride"

STRIDE_HLSL = """
if (Amp <= 0.0001) return float3(0.0, 0.0, 0.0);
float lx = LP.x;
float ly = LP.y;
float lz = LP.z;
if (Gait >= 1.5)
{
    float wave = sin(Phase + lz * 0.045) * 14.0 * Amp;
    float coil = cos(Phase * 2.0 + lz * 0.03) * 3.5 * Amp;
    return float3(wave, 0.0, coil);
}
float w = saturate((86.0 - lz) / 76.0);
float side = (abs(lx) < 3.0) ? 0.0 : (lx >= 0.0 ? 1.0 : -1.0);
float fore = (Gait > 0.5) ? (ly >= 0.0 ? 1.0 : -1.0) : 1.0;
float dirSign = side * fore;
float swing = -sin(Phase) * dirSign * w * 24.0 * Amp;
float lift = max(0.0, cos(Phase) * dirSign) * w * 14.0 * Amp;
float sway = saturate((lz - 86.0) / 80.0) * sin(Phase) * 4.0 * Amp;
return float3(sway, swing, lift);
"""

ROUGHNESS_HLSL = """
return clamp(1.0 - sqrt(saturate(Shininess * 0.01)), 0.12, 0.96);
"""


def _make_cpd_scalar(mat, name, index, pos_x, pos_y):
    node = LIB.create_material_expression(mat, unreal.MaterialExpressionScalarParameter, pos_x, pos_y)
    node.set_editor_property("parameter_name", name)
    node.set_editor_property("default_value", 0.0)
    node.set_editor_property("use_custom_primitive_data", True)
    node.set_editor_property("primitive_data_index", index)
    return node


def build_stride_master():
    ASSETS.make_directory(MASTER_DIR)
    path = f"{MASTER_DIR}/{MASTER_NAME}"
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    mat = (
        ASSETS.load_asset(path)
        if ASSETS.does_asset_exist(path)
        else tools.create_asset(MASTER_NAME, MASTER_DIR, unreal.Material, unreal.MaterialFactoryNew())
    )
    if not isinstance(mat, unreal.Material):
        raise RuntimeError(f"Could not create figure master material at {path}")

    LIB.delete_all_material_expressions(mat)

    # Surface PBR parameters matching UE 5.8 Interchange FBX MaterialInstanceConstants
    diffuse = LIB.create_material_expression(mat, unreal.MaterialExpressionVectorParameter, -640, -180)
    diffuse.set_editor_property("parameter_name", "DiffuseColor")
    diffuse.set_editor_property("default_value", unreal.LinearColor(0.5, 0.5, 0.5, 1.0))

    shininess = LIB.create_material_expression(mat, unreal.MaterialExpressionScalarParameter, -640, -20)
    shininess.set_editor_property("parameter_name", "Shininess")
    shininess.set_editor_property("default_value", 25.0)

    rough_custom = LIB.create_material_expression(mat, unreal.MaterialExpressionCustom, -380, -20)
    rough_pin = unreal.CustomInput()
    rough_pin.set_editor_property("input_name", "Shininess")
    rough_custom.set_editor_property("inputs", [rough_pin])
    rough_custom.set_editor_property("output_type", unreal.CustomMaterialOutputType.CMOT_FLOAT1)
    rough_custom.set_editor_property("code", ROUGHNESS_HLSL)

    metallic = LIB.create_material_expression(mat, unreal.MaterialExpressionScalarParameter, -640, 80)
    metallic.set_editor_property("parameter_name", "Metallic")
    metallic.set_editor_property("default_value", 0.0)

    emissive = LIB.create_material_expression(mat, unreal.MaterialExpressionVectorParameter, -640, 200)
    emissive.set_editor_property("parameter_name", "EmissiveColor")
    emissive.set_editor_property("default_value", unreal.LinearColor(0.0, 0.0, 0.0, 1.0))

    # CustomPrimitiveData[0..3] (defaulting to 0.0 -> exact zero WPO & zero flash on NPCs/props!)
    cpd_phase = _make_cpd_scalar(mat, "TibetWalkPhase", 0, -760, 480)
    cpd_amp = _make_cpd_scalar(mat, "TibetStrideAmp", 1, -760, 580)
    cpd_gait = _make_cpd_scalar(mat, "TibetGaitMode", 2, -760, 680)
    cpd_flash = _make_cpd_scalar(mat, "TibetHitFlash", 3, -640, 340)

    flash_col = LIB.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -640, 410)
    flash_col.set_editor_property("constant", unreal.LinearColor(1.8, 1.35, 0.55, 1.0))

    flash_mul = LIB.create_material_expression(mat, unreal.MaterialExpressionMultiply, -380, 340)
    emissive_add = LIB.create_material_expression(mat, unreal.MaterialExpressionAdd, -160, 240)

    # Local-space limb-stride WPO -> World space
    local_pos = LIB.create_material_expression(mat, unreal.MaterialExpressionLocalPosition, -760, 790)
    local_pos.set_editor_property("included_offsets", unreal.PositionIncludedOffsets.EXCLUDE_OFFSETS)
    local_pos.set_editor_property("local_origin", unreal.LocalPositionOrigin.INSTANCE)

    stride = LIB.create_material_expression(mat, unreal.MaterialExpressionCustom, -440, 600)
    stride_inputs = {"LP": local_pos, "Phase": cpd_phase, "Amp": cpd_amp, "Gait": cpd_gait}
    pins = []
    for pin_name in stride_inputs:
        pin = unreal.CustomInput()
        pin.set_editor_property("input_name", pin_name)
        pins.append(pin)
    stride.set_editor_property("inputs", pins)
    stride.set_editor_property("output_type", unreal.CustomMaterialOutputType.CMOT_FLOAT3)
    stride.set_editor_property("code", STRIDE_HLSL)

    to_world = LIB.create_material_expression(mat, unreal.MaterialExpressionTransform, -160, 600)
    to_world.set_editor_property(
        "transform_source_type", unreal.MaterialVectorCoordTransformSource.TRANSFORMSOURCE_LOCAL
    )
    to_world.set_editor_property("transform_type", unreal.MaterialVectorCoordTransform.TRANSFORM_WORLD)
    to_world_in = str(LIB.get_material_expression_input_names(to_world)[0])

    ok = (
        LIB.connect_material_property(diffuse, "RGB", unreal.MaterialProperty.MP_BASE_COLOR)
        and LIB.connect_material_expressions(shininess, "", rough_custom, "Shininess")
        and LIB.connect_material_property(rough_custom, "", unreal.MaterialProperty.MP_ROUGHNESS)
        and LIB.connect_material_property(metallic, "", unreal.MaterialProperty.MP_METALLIC)
        and LIB.connect_material_expressions(cpd_flash, "", flash_mul, "A")
        and LIB.connect_material_expressions(flash_col, "", flash_mul, "B")
        and LIB.connect_material_expressions(emissive, "RGB", emissive_add, "A")
        and LIB.connect_material_expressions(flash_mul, "", emissive_add, "B")
        and LIB.connect_material_property(emissive_add, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
        and all(LIB.connect_material_expressions(expr, "", stride, key) for key, expr in stride_inputs.items())
        and LIB.connect_material_expressions(stride, "", to_world, to_world_in)
        and LIB.connect_material_property(to_world, "", unreal.MaterialProperty.MP_WORLD_POSITION_OFFSET)
    )
    if not ok:
        raise RuntimeError(f"Failed to connect expressions in {path}")

    errors = [str(e) for e in LIB.recompile_material(mat)]
    if errors:
        raise RuntimeError(f"Shader compile errors in {path}: {errors}")
    if not ASSETS.save_loaded_asset(mat, only_if_is_dirty=False):
        raise RuntimeError(f"Failed to save {path}")
    return mat


def bind_figure_instance(mi, master):
    if not isinstance(mi, unreal.MaterialInstanceConstant):
        return False
    path = mi.get_path_name().split(".")[0]
    if not path.startswith("/Game/Figures/"):
        return False

    vec_names = {str(x) for x in LIB.get_vector_parameter_names(mi)}
    sca_names = {str(x) for x in LIB.get_scalar_parameter_names(mi)}
    diffuse = (
        LIB.get_material_instance_vector_parameter_value(mi, "DiffuseColor")
        if "DiffuseColor" in vec_names
        else unreal.LinearColor(0.5, 0.5, 0.5, 1.0)
    )
    emissive = (
        LIB.get_material_instance_vector_parameter_value(mi, "EmissiveColor")
        if "EmissiveColor" in vec_names
        else unreal.LinearColor(0.0, 0.0, 0.0, 1.0)
    )
    shininess = (
        LIB.get_material_instance_scalar_parameter_value(mi, "Shininess")
        if "Shininess" in sca_names
        else 25.0
    )
    name_low = mi.get_name().lower()
    metallic_val = 0.78 if any(k in name_low for k in ("gold", "gilt", "saffron")) else (
        0.35 if any(k in name_low for k in ("basalt", "horn", "ice", "turquoise", "lacquer")) else 0.0
    )

    LIB.set_material_instance_parent(mi, master)
    LIB.set_material_instance_vector_parameter_value(mi, "DiffuseColor", diffuse)
    LIB.set_material_instance_vector_parameter_value(mi, "EmissiveColor", emissive)
    LIB.set_material_instance_scalar_parameter_value(mi, "Shininess", shininess)
    LIB.set_material_instance_scalar_parameter_value(mi, "Metallic", metallic_val)
    LIB.update_material_instance(mi)
    ASSETS.save_loaded_asset(mi, only_if_is_dirty=False)
    return True


def import_meshes():
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from generate_effect_material import generate
    generate()
    stride_master = build_stride_master()
    source = Path(__file__).resolve().parents[1] / "Assets" / "Figures"
    counts = json.loads((source / "triangle-counts.json").read_text())
    mesh_editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
    assets = unreal.AssetToolsHelpers.get_asset_tools()
    tasks = []
    for filename in sorted(source.glob("*.fbx")):
        task = unreal.AssetImportTask()
        task.filename = str(filename)
        task.destination_path = "/Game/Figures"
        task.destination_name = filename.stem
        task.automated = True
        task.replace_existing = True
        task.save = True
        options = unreal.FbxImportUI()
        options.import_as_skeletal = False
        options.import_materials = True
        options.import_textures = False
        options.static_mesh_import_data.combine_meshes = True
        options.static_mesh_import_data.auto_generate_collision = False
        task.options = options
        tasks.append(task)
    if {Path(task.filename).stem for task in tasks} != set(counts):
        raise RuntimeError(f"Figure mesh files do not match {source / 'triangle-counts.json'}")
    assets.import_asset_tasks(tasks)
    enhanced_materials = set()
    for task in tasks:
        stem = Path(task.filename).stem
        mesh = unreal.load_asset("/Game/Figures/" + stem)
        if not isinstance(mesh, unreal.StaticMesh):
            raise RuntimeError(f"Static mesh failed import: {task.filename}")
        before = mesh.get_num_triangles(0)
        settings = mesh_editor.get_nanite_settings(mesh)
        previous_nanite = settings.get_editor_property("enabled")
        settings.set_editor_property("enabled", False)
        settings.set_editor_property("fallback_relative_error", 0.0)
        settings.set_editor_property("fallback_percent_triangles", 1.0)
        mesh_editor.set_nanite_settings(mesh, settings, True)
        after = mesh.get_num_triangles(0)
        expected = counts[stem]
        unreal.log(f"TIBET_FIGURE {mesh.get_name()} Blender={expected} import={before} Nanite={previous_nanite} retained={after}")
        if after < expected * 0.95:
            raise RuntimeError(f"Figure {mesh.get_name()} lost detail: {after}/{expected}")
        if not stem.startswith("Pilgrim"):
            for slot_idx in range(len(mesh.get_editor_property("static_materials"))):
                mat = mesh.get_material(slot_idx)
                if isinstance(mat, unreal.MaterialInstanceConstant):
                    mat_path = mat.get_path_name().split(".")[0]
                    if mat_path not in enhanced_materials and bind_figure_instance(mat, stride_master):
                        enhanced_materials.add(mat_path)
    if not enhanced_materials:
        raise RuntimeError("No figure materials were bound to M_FigureStride")
    unreal.log(f"TIBET_FIGURE_WPO_READY {len(enhanced_materials)} materials -> {MASTER_DIR}/{MASTER_NAME}")
    ASSETS.save_directory("/Game/Figures")


if __name__ == "__main__":
    import_meshes()
