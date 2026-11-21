"""Generate the native tintable material shared by Tibet spells and route markers."""
import unreal

DIRECTORY = "/Game/Figures/Materials"
NAME = "M_RitualColor"


def generate():
    assets = unreal.EditorAssetLibrary
    path = f"{DIRECTORY}/{NAME}"
    material = assets.load_asset(path) if assets.does_asset_exist(path) else None
    if material is None:
        factory = unreal.MaterialFactoryNew()
        material = unreal.AssetToolsHelpers.get_asset_tools().create_asset(NAME, DIRECTORY, unreal.Material, factory)
    if not isinstance(material, unreal.Material):
        raise RuntimeError(f"Expected a material at {path}")

    graph = unreal.MaterialEditingLibrary
    graph.delete_all_material_expressions(material)
    # Two-sided unlit translucent material with EyeAdaptationInverse so Tibetan sacred mandalas,
    # lotus shields and mantras glow luminously under both 35,000-lux snow glare and dark terma vaults.
    material.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    material.set_editor_property("blend_mode", unreal.BlendMode.BLEND_TRANSLUCENT)
    material.set_editor_property("two_sided", True)

    tint = graph.create_material_expression(material, unreal.MaterialExpressionVectorParameter, -520, 0)
    tint.set_editor_property("parameter_name", "Color")
    tint.set_editor_property("default_value", unreal.LinearColor(0.95, 0.52, 0.12, 0.88))

    glow = graph.create_material_expression(material, unreal.MaterialExpressionMultiply, -300, 0)
    glow.set_editor_property("const_b", 1.35)
    adapt = graph.create_material_expression(material, unreal.MaterialExpressionEyeAdaptationInverse, -120, 0)
    adapt_in = str(graph.get_material_expression_input_names(adapt)[0])

    connected = (
        graph.connect_material_expressions(tint, "RGB", glow, "A"),
        graph.connect_material_expressions(glow, "", adapt, adapt_in),
        graph.connect_material_property(adapt, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR),
        graph.connect_material_property(tint, "A", unreal.MaterialProperty.MP_OPACITY),
    )
    if not all(connected):
        raise RuntimeError(f"Could not connect the Color parameter in {path}")
    graph.recompile_material(material)
    names = graph.get_vector_parameter_names(material)
    if "Color" not in [str(n) for n in names] or not assets.save_loaded_asset(material, only_if_is_dirty=False):
        raise RuntimeError(f"Could not verify and save {path}")
    unreal.log(f"TIBET_EFFECT_MATERIAL_READY {path} Color")


if __name__ == "__main__":
    generate()
