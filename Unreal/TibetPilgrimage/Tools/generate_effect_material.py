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
    tint = graph.create_material_expression(material, unreal.MaterialExpressionVectorParameter, -480, 0)
    tint.set_editor_property("parameter_name", "Color")
    tint.set_editor_property("default_value", unreal.LinearColor(0.87, 0.43, 0.065, 1.0))
    glow = graph.create_material_expression(material, unreal.MaterialExpressionMultiply, -210, 150)
    glow.set_editor_property("const_b", 0.40)
    connected = (
        graph.connect_material_property(tint, "", unreal.MaterialProperty.MP_BASE_COLOR),
        graph.connect_material_expressions(tint, "", glow, "A"),
        graph.connect_material_property(glow, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR),
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
