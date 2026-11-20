"""Build the two-sided outdoor cloud material and its shared shadow mask."""
from pathlib import Path

import unreal

DIRECTORY = "/Game/Figures/Materials"


def generate():
    graph = unreal.MaterialEditingLibrary
    assets = unreal.EditorAssetLibrary
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    assets.make_directory(DIRECTORY)
    task = unreal.AssetImportTask()
    task.filename = str(Path(__file__).resolve().parents[1] / "Assets/Weather/CloudDensity.png")
    task.destination_path = DIRECTORY
    task.automated = task.replace_existing = task.save = True
    tools.import_asset_tasks([task])
    density = assets.load_asset(f"{DIRECTORY}/CloudDensity")
    density.set_editor_property("compression_settings", unreal.TextureCompressionSettings.TC_GRAYSCALE)
    density.set_editor_property("srgb", False)
    assets.save_loaded_asset(density, only_if_is_dirty=False)

    name = "M_CloudLayer"
    path = f"{DIRECTORY}/{name}"
    material = (assets.load_asset(path) if assets.does_asset_exist(path)
                else tools.create_asset(name, DIRECTORY, unreal.Material, unreal.MaterialFactoryNew()))
    graph.delete_all_material_expressions(material)
    material.set_editor_property("blend_mode", unreal.BlendMode.BLEND_TRANSLUCENT)
    material.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    material.set_editor_property("two_sided", True)
    material.set_editor_property("cast_dynamic_shadow_as_masked", True)
    material.set_editor_property("opacity_mask_clip_value", .57)

    def node(cls):
        return graph.create_material_expression(material, cls)

    def wire(source, target, pin):
        if not graph.connect_material_expressions(source, "", target, pin):
            raise RuntimeError(f"Could not connect cloud material input {pin}")

    def scalar(name, default):
        param = node(unreal.MaterialExpressionScalarParameter)
        param.set_editor_property("parameter_name", name)
        param.set_editor_property("default_value", default)
        return param

    # A single filtered sample supplies both painted cloud bodies and their cast
    # silhouette. The texture's UVs use world metres so coverage stays anchored
    # over the map when the camera turns. The normal shadow pass projects it.
    texture = node(unreal.MaterialExpressionTextureObject)
    texture.set_editor_property("texture", density)
    texture.set_editor_property("sampler_type", unreal.MaterialSamplerType.SAMPLERTYPE_LINEAR_GRAYSCALE)
    inputs = {
        "Field": texture,
        "P": node(unreal.MaterialExpressionWorldPosition),
        "T": node(unreal.MaterialExpressionTime),
        "WeatherStart": scalar("WeatherStart", 0.),
        "FixedTime": scalar("FixedTime", -1.),
        "Day": scalar("Daylight", 1.),
    }
    shape = node(unreal.MaterialExpressionCustom)
    pins = []
    for key in inputs:
        pin = unreal.CustomInput()
        pin.set_editor_property("input_name", key)
        pins.append(pin)
    shape.set_editor_property("inputs", pins)
    shape.set_editor_property("output_type", unreal.CustomMaterialOutputType.CMOT_FLOAT4)
    shape.set_editor_property("code", """
float seconds = FixedTime >= 0.0 ? FixedTime : T + WeatherStart;
float cloudiness = .5 + .5 * cos((seconds - 60.0) * (6.2831853 / 180.0));
float threshold = lerp(.84, .29, cloudiness);
float2 uv = P.xy / 38000.0 + float2(.32, .51) - seconds * float2(.0027, .00085);
float density = Texture2DSample(Field, FieldSampler, uv).r;
float opacity = smoothstep(threshold - .08, threshold + .10, density);
float billow = smoothstep(threshold - .03, threshold + .32, density);
float3 daylightColor = lerp(float3(.40,.47,.60), float3(1.75,1.67,1.55), billow);
daylightColor *= lerp(float3(1,.65,.48), float3(1,1,1), Day);
float3 moonlitColor = lerp(float3(.014,.023,.044), float3(.065,.09,.15), billow);
return float4(lerp(moonlitColor, daylightColor, Day), opacity * .90);
""")
    for key, source in inputs.items():
        wire(source, shape, key)

    def channels(*names):
        mask = node(unreal.MaterialExpressionComponentMask)
        for channel in ("r", "g", "b", "a"):
            mask.set_editor_property(channel, channel in names)
        wire(shape, mask, "")
        return mask

    luminance = node(unreal.MaterialExpressionEyeAdaptationInverse)
    wire(channels("r", "g", "b"), luminance, str(graph.get_material_expression_input_names(luminance)[0]))
    opacity = channels("a")
    daylight_shadow = node(unreal.MaterialExpressionMultiply)
    wire(opacity, daylight_shadow, "A")
    wire(inputs["Day"], daylight_shadow, "B")
    shadow_switch = node(unreal.MaterialExpressionShadowReplace)
    wire(opacity, shadow_switch, "Default")
    wire(daylight_shadow, shadow_switch, "Shadow")
    if not (graph.connect_material_property(luminance, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
            and graph.connect_material_property(shadow_switch, "", unreal.MaterialProperty.MP_OPACITY)):
        raise RuntimeError("Could not connect cloud color or opacity")
    graph.recompile_material(material)
    if not assets.save_loaded_asset(material, only_if_is_dirty=False):
        raise RuntimeError("Could not save the outdoor cloud layer")
    unreal.log(f"TIBET_CLOUD_LAYER_READY {path}")


if __name__ == "__main__":
    generate()
