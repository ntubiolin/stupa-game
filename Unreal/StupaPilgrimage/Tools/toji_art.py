"""Editor-only art setup for the generated Tō-ji level."""

from pathlib import Path


ASSET = Path(__file__).resolve().parents[1] / "Assets/Toji/TojiCourtyard.glb"


def world(unreal, coordinates):
    east, up, south = coordinates
    return unreal.Vector(-100 * south, 100 * east, 100 * up)


def actor(actors, actor_class, label, position, rotation=None, tag=None):
    if rotation is None:
        instance = actors.spawn_actor_from_class(actor_class, position)
    else:
        instance = actors.spawn_actor_from_class(actor_class, position, rotation)
    if instance is None:
        raise RuntimeError(f"Could not spawn {label}")
    instance.set_actor_label(label)
    if tag is not None:
        instance.set_editor_property("tags", [tag])
    return instance


def set_settings(component, **properties):
    for name, value in properties.items():
        component.set_editor_property(name, value)


def add_lighting(unreal, actors):
    origin = unreal.Vector()
    actor(actors, unreal.SkyAtmosphere, "Toji atmosphere", origin)
    sun = actor(actors, unreal.DirectionalLight, "Toji solar key", origin,
                unreal.Rotator(pitch=-41.56, yaw=-54.07), "Toji.Sun")
    sunlight = sun.get_component_by_class(unreal.DirectionalLightComponent)
    set_settings(sunlight, mobility=unreal.ComponentMobility.MOVABLE, intensity=35000,
                 use_temperature=True, temperature=5700, atmosphere_sun_light=True,
                 light_source_angle=0.535, light_source_soft_angle=0.8)
    sky = actor(actors, unreal.SkyLight, "Toji atmospheric fill", origin, tag="Toji.SkyLight")
    skylight = sky.get_component_by_class(unreal.SkyLightComponent)
    set_settings(skylight, mobility=unreal.ComponentMobility.MOVABLE, intensity=1,
                 real_time_capture=True)
    fog = actor(actors, unreal.ExponentialHeightFog, "Toji distance haze", origin)
    fog_component = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
    set_settings(fog_component, fog_density=0.009, fog_height_falloff=0.17)

    # Warm localized fill across the gilded altar. It reaches the statue from
    # inside the hall and does not change the exterior shadow direction.
    altar_position = world(unreal, (0, 5.8, 11.7))
    altar_aim = unreal.MathLibrary.find_look_at_rotation(altar_position, world(unreal, (0, 4.15, 6.8)))
    altar = actor(actors, unreal.RectLight, "Toji warm altar fill", altar_position, altar_aim,
                  "Toji.AltarFill")
    fill = altar.get_component_by_class(unreal.RectLightComponent)
    set_settings(fill, mobility=unreal.ComponentMobility.MOVABLE, intensity_units=unreal.LightUnits.LUMENS,
                 intensity=5800, use_temperature=True, temperature=3000, attenuation_radius=780,
                 source_width=170, source_height=70)


def populate(unreal, import_courtyard):
    """Place art into the current level after Kondō, using foundation's glTF importer."""
    if not ASSET.is_file():
        raise FileNotFoundError(ASSET)
    import_courtyard(ASSET)
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    add_lighting(unreal, actors)
