"""Build the drifting outdoor clouds and their sunlight transmission from one density field."""
from pathlib import Path

import unreal

DIRECTORY = "/Game/Figures/Materials"

# The sky and its projected shadows share world XY coordinates and a continuous weather clock.
# At 380 metres per texture repeat, this wind moves about 27 cm/s.
WEATHER = """
float seconds = FixedTime >= 0.0 ? FixedTime : T + WeatherStart;
float cloudiness = .5 + .5 * cos((seconds - 60.0) * (6.2831853 / 600.0));
float threshold = lerp(.84, .29, cloudiness);
float2 uv = deckXY / 38000.0 + float2(.32, .51) - seconds * float2(.00068, .00021);
float density = Texture2DSample(Field, FieldSampler, uv).r;
float opacity = smoothstep(threshold - .08, threshold + .10, density);
"""


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

    def make_material(name):
        path = f"{DIRECTORY}/{name}"
        result = (assets.load_asset(path) if assets.does_asset_exist(path)
                  else tools.create_asset(name, DIRECTORY, unreal.Material, unreal.MaterialFactoryNew()))
        graph.delete_all_material_expressions(result)
        return result

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

    def weather_inputs():
        texture = node(unreal.MaterialExpressionTextureObject)
        texture.set_editor_property("texture", density)
        texture.set_editor_property("sampler_type", unreal.MaterialSamplerType.SAMPLERTYPE_LINEAR_GRAYSCALE)
        return {
            "Field": texture,
            "T": node(unreal.MaterialExpressionTime),
            "WeatherStart": scalar("WeatherStart", 0.),
            "FixedTime": scalar("FixedTime", -1.),
        }

    def shader(inputs, code, output_type):
        expression = node(unreal.MaterialExpressionCustom)
        pins = []
        for key in inputs:
            pin = unreal.CustomInput()
            pin.set_editor_property("input_name", key)
            pins.append(pin)
        expression.set_editor_property("inputs", pins)
        expression.set_editor_property("output_type", output_type)
        expression.set_editor_property("code", code)
        for key, source in inputs.items():
            wire(source, expression, key)
        return expression

    def channels(source, *names):
        mask = node(unreal.MaterialExpressionComponentMask)
        for channel in ("r", "g", "b", "a"):
            mask.set_editor_property(channel, channel in names)
        wire(source, mask, "")
        return mask

    def save_material():
        graph.recompile_material(material)
        if not assets.save_loaded_asset(material, only_if_is_dirty=False):
            raise RuntimeError(f"Could not save {material.get_name()}")

    material = make_material("M_CloudLayer")
    material.set_editor_property("blend_mode", unreal.BlendMode.BLEND_TRANSLUCENT)
    material.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    material.set_editor_property("two_sided", True)
    material.set_editor_property("cast_dynamic_shadow_as_masked", False)
    inputs = weather_inputs()
    inputs.update(Deck=node(unreal.MaterialExpressionWorldPosition), Day=scalar("Daylight", 1.))
    shape = shader(inputs, "float2 deckXY = LWCToFloat(Deck).xy;\n" + WEATHER + """
float billow = smoothstep(threshold - .03, threshold + .32, density);
float3 daylightColor = lerp(float3(.40,.47,.60), float3(1.75,1.67,1.55), billow);
daylightColor *= lerp(float3(1,.65,.48), float3(1,1,1), Day);
float3 moonlitColor = lerp(float3(.014,.023,.044), float3(.065,.09,.15), billow);
return float4(lerp(moonlitColor, daylightColor, Day), opacity * lerp(.56, .90, Day));
""", unreal.CustomMaterialOutputType.CMOT_FLOAT4)
    luminance = node(unreal.MaterialExpressionEyeAdaptationInverse)
    wire(channels(shape, "r", "g", "b"), luminance, str(graph.get_material_expression_input_names(luminance)[0]))
    if not (graph.connect_material_property(luminance, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
            and graph.connect_material_property(channels(shape, "a"), "", unreal.MaterialProperty.MP_OPACITY)):
        raise RuntimeError("Could not connect cloud color or opacity")
    save_material()

    # The desktop light function attenuates direct sunlight. Forward mobile
    # uses a translucent decal on the same receivers, with the same soft mask.
    for mobile in (False, True):
        material = make_material("M_CloudShadeDecal" if mobile else "M_CloudShadow")
        if mobile:
            material.set_editor_property("blend_mode", unreal.BlendMode.BLEND_TRANSLUCENT)
            material.set_editor_property("material_domain", unreal.MaterialDomain.MD_DEFERRED_DECAL)
        else:
            material.set_editor_property("material_domain", unreal.MaterialDomain.MD_LIGHT_FUNCTION)
        inputs = weather_inputs()
        projection = node(unreal.MaterialExpressionVectorParameter)
        projection.set_editor_property("parameter_name", "Projection")
        projection.set_editor_property("default_value", unreal.LinearColor(0, 0, 8200, 1))
        inputs.update(Position=node(unreal.MaterialExpressionWorldPosition), Projection=projection,
                      Strength=scalar("ShadowStrength", 0.))
        amount = shader(inputs, """
float3 receiver = LWCToFloat(Position);
float2 deckXY = receiver.xy + max(0.0, Projection.z - receiver.z) * Projection.xy;
""" + WEATHER + """
return .34 * opacity * Strength * step(receiver.z, Projection.z);
""", unreal.CustomMaterialOutputType.CMOT_FLOAT1)
        if mobile:
            color = node(unreal.MaterialExpressionConstant3Vector)
            color.set_editor_property("constant", unreal.LinearColor(0, 0, 0))
            connected = (graph.connect_material_property(color, "", unreal.MaterialProperty.MP_BASE_COLOR)
                         and graph.connect_material_property(amount, "", unreal.MaterialProperty.MP_OPACITY))
        else:
            transmission = node(unreal.MaterialExpressionOneMinus)
            wire(amount, transmission, "")
            connected = graph.connect_material_property(transmission, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
        if not connected:
            raise RuntimeError(f"Could not connect cloud shade for {material.get_name()}")
        save_material()
    unreal.log("TIBET_CLOUD_LAYER_READY")


if __name__ == "__main__":
    generate()
