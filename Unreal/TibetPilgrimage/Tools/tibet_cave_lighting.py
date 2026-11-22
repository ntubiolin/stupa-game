"""Native level lights and runtime sockets for the authored passage meshes."""
import unreal

from tibet_passages import lanterns, route_sockets


def ue(point):
    east, north, up = point
    return north * 100, east * 100, up * 100


def dress_passages(levels, actors, place, stage):
    for name, at in route_sockets(stage).items():
        marker = place(levels, actors, unreal.TargetPoint, f"Cave socket {name}", ue(at))
        marker.set_editor_property("tags", [unreal.Name("TibetPassage"), unreal.Name(name)])

    def lamp_beam(label, wick, yaw, pitch, reach, intensity, temperature):
        actor = place(levels, actors, unreal.SpotLight, label, ue(wick), unreal.Rotator(pitch=pitch, yaw=yaw))
        light = actor.get_component_by_class(unreal.SpotLightComponent)
        light.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
        light.set_editor_property("intensity_units", unreal.LightUnits.CANDELAS)
        light.set_editor_property("intensity", intensity)
        light.set_editor_property("use_temperature", True)
        light.set_editor_property("temperature", temperature)
        light.set_editor_property("attenuation_radius", reach * 100)
        light.set_editor_property("inner_cone_angle", 30)
        light.set_editor_property("outer_cone_angle", 80)
        light.set_editor_property("cast_shadows", False)

    for i, ((x, y, z), yaw, reach) in enumerate(lanterns(stage)):
        wick = (x, y, z + 1.40)
        temperature = 2750 if i % 2 else 2450
        lamp_beam(f"Butter lamp {i + 1}", wick, yaw, 2, reach,
                  990 if stage.startswith("terma") else 1900, temperature)
        # Three spaced lamps also throw a dimmer lobe up their own rock wall.
        # The small radius keeps this out of the opposite aisle and the vault crown.
        if stage.startswith("terma") and i in (1, 4, 6):
            lamp_beam(f"Wick spill {i + 1}", wick, yaw + 180, 29, 10.5, 210, temperature)

    if stage.startswith("terma"):
        volume = place(levels, actors, unreal.PostProcessVolume, "Candlelit vault exposure")
        volume.set_editor_property("unbound", True)
        settings = volume.get_editor_property("settings")
        for name, value in (("auto_exposure_min_brightness", 2.0),
                            ("auto_exposure_max_brightness", 4.0),
                            ("auto_exposure_bias", 0.0)):
            settings.set_editor_property("override_" + name, True)
            settings.set_editor_property(name, value)
        volume.set_editor_property("settings", settings)


def wick_material():
    # An unlit emissive stays visible against both snow and dark rock. Eye
    # adaptation compensation bounds its final luminance in both environments.
    directory = "/Game/Figures/Materials"
    name = "M_TravelGlow"
    path = f"{directory}/{name}"
    assets = unreal.EditorAssetLibrary
    material = assets.load_asset(path) if assets.does_asset_exist(path) else None
    if material is None:
        material = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            name, directory, unreal.Material, unreal.MaterialFactoryNew())
    graph = unreal.MaterialEditingLibrary
    graph.delete_all_material_expressions(material)
    material.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    material.set_editor_property("two_sided", True)
    tint = graph.create_material_expression(material, unreal.MaterialExpressionVectorParameter, -360, 0)
    tint.set_editor_property("parameter_name", "Color")
    tint.set_editor_property("default_value", unreal.LinearColor(.18, 1.5, 1.1, 1))
    adapt = graph.create_material_expression(material, unreal.MaterialExpressionEyeAdaptationInverse, -150, 0)
    input_name = str(graph.get_material_expression_input_names(adapt)[0])
    if not (graph.connect_material_expressions(tint, "", adapt, input_name)
            and graph.connect_material_property(adapt, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)):
        raise RuntimeError("Could not connect the travel gate emission")
    graph.recompile_material(material)
    if not assets.save_loaded_asset(material, only_if_is_dirty=False):
        raise RuntimeError(f"Could not save {path}")
    wick_path = f"{directory}/MI_ButterWick"
    wick = assets.load_asset(wick_path) if assets.does_asset_exist(wick_path) else None
    if wick is None:
        wick = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            "MI_ButterWick", directory, unreal.MaterialInstanceConstant, unreal.MaterialInstanceConstantFactoryNew())
    graph.set_material_instance_parent(wick, material)
    graph.set_material_instance_vector_parameter_value(wick, "Color", unreal.LinearColor(4.1, 1.20, .14, 1))
    graph.update_material_instance(wick)
    if not assets.save_loaded_asset(wick, only_if_is_dirty=False):
        raise RuntimeError(f"Could not save {wick_path}")
    return wick
