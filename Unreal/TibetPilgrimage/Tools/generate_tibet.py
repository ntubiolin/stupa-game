"""Editor entry point for the eleven cooked Tibet pilgrimage levels."""

import json
from pathlib import Path
import struct
import sys

import unreal

TOOLS = Path(__file__).resolve().parent
PROJECT = TOOLS.parent
sys.path.insert(0, str(TOOLS))

from import_tibet_figures import import_meshes
from import_tibet_atlas import import_atlas
from migrate_tibet_maps import strip_import_metadata
from tibet_cave_lighting import dress_passages, wick_material
from tibet_landscapes import MAPS, landscape
from tibet_surfaces import make_surfaces


def place(levels, actors, cls, name, xyz=(0, 0, 0), rot=None):
    pos = unreal.Vector(*xyz)
    actor = (
        actors.spawn_actor_from_class(cls, pos, rot) if rot else actors.spawn_actor_from_class(cls, pos)
    )
    if not actor:
        raise RuntimeError(f"Could not place {name} in {levels.get_current_level()}")
    actor.set_actor_label(name)
    return actor


def lighting(levels, actors, stage):
    dress_passages(levels, actors, place, stage)
    if stage.startswith("terma"):
        return
    courtyard = stage == "stupa"
    place(levels, actors, unreal.SkyAtmosphere, "Himalayan sky")
    sun = place(
        levels,
        actors,
        unreal.DirectionalLight,
        "Pilgrimage sunlight",
        rot=unreal.Rotator(pitch=-41, yaw=24 if courtyard else 53),
    )
    light = sun.get_component_by_class(unreal.DirectionalLightComponent)
    light.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
    light.set_editor_property("intensity", 35000)
    light.set_editor_property("use_temperature", True)
    light.set_editor_property("temperature", 5700 if courtyard else 5150)
    if courtyard:
        # Broader daylight softens the cloth shadows across the curved whitewash.
        light.set_editor_property("light_source_angle", 2.2)
    light.set_editor_property("atmosphere_sun_light", True)
    sky = place(levels, actors, unreal.SkyLight, "Skylight")
    fill = sky.get_component_by_class(unreal.SkyLightComponent)
    fill.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
    fill.set_editor_property("intensity", 1.45 if courtyard else 1)
    fill.set_editor_property("real_time_capture", True)
    fog = place(levels, actors, unreal.ExponentialHeightFog, "Valley haze")
    layer = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
    layer.set_editor_property("fog_density", 0.007)
    layer.set_editor_property("fog_height_falloff", 0.19)
    dome = place(levels, actors, unreal.StaticMeshActor, "Atmosphere sky dome")
    dome.set_actor_scale3d(unreal.Vector(800, 800, 800))
    sky_mesh = dome.static_mesh_component
    sky_mesh.set_static_mesh(unreal.load_asset("/Engine/EngineSky/SM_SkySphere"))
    sky_mesh.set_material(0, unreal.load_asset("/Engine/EngineSky/M_SimpleSkyDome"))
    sky_mesh.set_collision_profile_name("NoCollision")
    sky_mesh.set_cast_shadow(False)


def open_generated_level(levels, actors, assets, stage):
    path = f"/Game/Maps/Tibet/{stage}"
    if assets.does_asset_exist(path):
        if not levels.load_level(path):
            raise RuntimeError(f"Could not open {path}")
        existing = [a for a in actors.get_all_level_actors() if not isinstance(a, unreal.WorldSettings)]
        if existing and not actors.destroy_actors(existing):
            raise RuntimeError(f"Could not clear {path}")
    elif not levels.new_level(path):
        raise RuntimeError(f"Could not create {path}")


def populate(levels, actors, stage, source, surfaces):
    destination = f"/Game/TibetWorld/{stage}"
    before = {a.get_path_name() for a in actors.get_all_level_actors()}
    manager = unreal.InterchangeManager.get_interchange_manager_scripted()
    src = manager.create_source_data(str(source))
    params = unreal.ImportAssetParameters(
        is_automated=True, replace_existing=True, import_level=levels.get_current_level()
    )
    if not manager.import_scene(destination, src, params):
        raise RuntimeError(f"Failed to import {source}")
    loaded = [a for a in actors.get_all_level_actors() if a.get_path_name() not in before]
    paths = {a.get_path_name() for a in loaded}
    # Interchange glTF east initially lies along Unreal +X. Rotate east into +Y, north into +X.
    placement = unreal.Transform(unreal.Vector(), unreal.Rotator(yaw=90), unreal.Vector(1, 1, 1))
    slot_hits = set()
    mesh_editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
    with source.open("rb") as glb:
        header = glb.read(20)
        manifest = json.loads(glb.read(struct.unpack_from("<I", header, 12)[0]))
    expected_triangles = {
        mesh["name"]: sum(manifest["accessors"][p["indices"]]["count"] // 3 for p in mesh["primitives"])
        for mesh in manifest["meshes"]
    }
    count = 0
    for a in loaded:
        parent = a.get_attach_parent_actor()
        if not parent or parent.get_path_name() not in paths:
            transform = unreal.MathLibrary.compose_transforms(a.get_actor_transform(), placement)
            if not actors.set_actor_transform(a, transform):
                raise RuntimeError(f"Could not orient {a.get_actor_label()}")
        for part in a.get_components_by_class(unreal.StaticMeshComponent):
            mesh = part.get_editor_property("static_mesh")
            if not mesh:
                continue
            count += 1
            # Interchange in UE 5.8 enables Nanite even in a non-Nanite project. Its
            # default fallback discarded most flags, window reveals and spire rings.
            settings = mesh_editor.get_nanite_settings(mesh)
            settings.set_editor_property("enabled", False)
            settings.set_editor_property("fallback_relative_error", 0.0)
            settings.set_editor_property("fallback_percent_triangles", 1.0)
            mesh_editor.set_nanite_settings(mesh, settings, True)
            rendered = mesh.get_num_triangles(0)
            authored = expected_triangles[mesh.get_name()]
            if rendered < authored * 0.95:
                raise RuntimeError(
                    f"{stage}/{mesh.get_name()} retained {rendered}/{authored} triangles"
                )
            unreal.log(f"TIBET_MESH_LOD0 {stage}/{mesh.get_name()} {rendered}/{authored}")
            if "vegetation" in mesh.get_name().lower():
                part.set_collision_profile_name("NoCollision")
            else:
                body = mesh.get_editor_property("body_setup")
                if not body:
                    raise RuntimeError(f"{mesh.get_name()} is missing a collision body")
                mesh.modify()
                body.set_editor_property(
                    "collision_trace_flag", unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE
                )
                part.set_collision_profile_name("BlockAll")
            for i, slot in enumerate(mesh.get_editor_property("static_materials")):
                name = str(slot.get_editor_property("imported_material_slot_name")).lower()
                mat = mesh.get_material(i)
                aliases = (
                    name,
                    str(slot.get_editor_property("material_slot_name")).lower(),
                    mat.get_name().lower() if mat else "",
                )
                for key, override in surfaces.items():
                    if any(v == key or v.endswith("_" + key) for v in aliases):
                        part.set_material(i, override)
                        slot_hits.add(key)
                        break
    if count == 0 or (not stage.startswith("terma") and not slot_hits):
        raise RuntimeError(
            f"Incomplete world import {stage}: {count} meshes, surface overrides {slot_hits}"
        )
    lighting(levels, actors, stage)
    place(levels, actors, unreal.PlayerStart, "South approach", (-2000, 0, 100))
    strip_import_metadata(levels, actors)
    if not unreal.EditorAssetLibrary.save_directory(
        destination, only_if_is_dirty=False, recursive=True
    ):
        raise RuntimeError(f"Could not save {destination}")
    if not levels.save_current_level():
        raise RuntimeError(f"Could not save {stage}")
    unreal.log(f"TIBET_LEVEL_READY {stage}: {count} meshes, material overrides {sorted(slot_hits)}")


def generate():
    levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    assets = unreal.get_editor_subsystem(unreal.EditorAssetSubsystem)
    import_atlas()
    import_meshes()
    surfaces = make_surfaces()
    surfaces["lampflame"] = wick_material()
    output = PROJECT / "Saved/TibetSource"
    output.mkdir(parents=True, exist_ok=True)
    tiles = {}
    for stage in MAPS:
        source = output / f"{stage}.glb"
        landscape(stage).write(source, tiles)
        open_generated_level(levels, actors, assets, stage)
        populate(levels, actors, stage, source, surfaces)
    unreal.log("TIBET_MAPS_READY " + ",".join(MAPS))


if __name__ == "__main__":
    generate()
