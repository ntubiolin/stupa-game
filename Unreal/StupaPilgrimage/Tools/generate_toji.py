"""Generate the playable Tō-ji level in a full Unreal Editor process."""
import itertools
import json
from pathlib import Path
import struct
import sys

import unreal

TOOLS = Path(__file__).resolve().parent
PROJECT = TOOLS.parent
KONDO = PROJECT.parents[1] / "public/models/kukai/toji_kondo.glb"
MAP = "/Game/Maps/Toji"
MAP_FILE = PROJECT / "Content/Maps/Toji.umap"
IMPORT_ROOT = "/Game/Generated/Toji"
KONDO_OFFSET = (-800, 0, 0)
KONDO_SCALE = 1.25
BOUNDS_TOLERANCE_CM = 2


def kondo_source_bounds():
    """Read all primitive bounds in the current, translation-only source scene."""
    with KONDO.open("rb") as stream:
        magic, version, _, json_size, chunk_type = struct.unpack("<4sIII4s", stream.read(20))
        if (magic, version, chunk_type) != (b"glTF", 2, b"JSON"):
            raise RuntimeError(f"Expected a glTF 2.0 binary scene: {KONDO}")
        gltf = json.loads(stream.read(json_size))
    points = []
    for index in gltf["scenes"][gltf["scene"]]["nodes"]:
        node = gltf["nodes"][index]
        if {"matrix", "scale", "rotation", "children"}.intersection(node):
            raise RuntimeError("Update the Kondō bounds check for the new node transforms")
        origin = node.get("translation", (0, 0, 0))
        for primitive in gltf["meshes"][node["mesh"]]["primitives"]:
            bounds = gltf["accessors"][primitive["attributes"]["POSITION"]]
            for point in (bounds["min"], bounds["max"]):
                east, height, south = (p + t for p, t in zip(point, origin))
                points.append((-100 * south, 100 * east, 100 * height))
    return bounds_of(points)


def bounds_of(points):
    axes = tuple(zip(*points))
    return tuple(map(min, axes)), tuple(map(max, axes))


def actor_bounds(actors):
    points = []
    for actor in actors:
        center, radius = actor.get_actor_bounds(False, False)
        points.extend([
            (center.x - radius.x, center.y - radius.y, center.z - radius.z),
            (center.x + radius.x, center.y + radius.y, center.z + radius.z),
        ])
    return bounds_of(points)


def bounds_match(actual, expected):
    return all(
        abs(a - b) <= BOUNDS_TOLERANCE_CM
        for actual_corner, expected_corner in zip(actual, expected)
        for a, b in zip(actual_corner, expected_corner)
    )


def determine_yaw(actual, expected):
    # Kondō is wider east/west than deep and has a projecting south stair.
    # Together these distinguish all four quarter turns in the imported frame.
    rotations = ((1, 0), (0, 1), (-1, 0), (0, -1))
    corners = list(itertools.product(*zip(*actual)))
    matches = [
        turn * 90
        for turn, (cosine, sine) in enumerate(rotations)
        if bounds_match(bounds_of([
            (x * cosine - y * sine, x * sine + y * cosine, z)
            for x, y, z in corners
        ]), expected)
    ]
    if len(matches) != 1:
        raise RuntimeError(f"Cannot verify Kondō import orientation: {actual}; expected {expected}")
    return matches[0]


def import_scene(source, destination, level, actor_editor):
    source = Path(source).resolve(strict=True)
    existing = {actor.get_path_name() for actor in actor_editor.get_all_level_actors()}
    manager = unreal.InterchangeManager.get_interchange_manager_scripted()
    data = manager.create_source_data(str(source))
    params = unreal.ImportAssetParameters(is_automated=True, replace_existing=True, import_level=level)
    if not manager.import_scene(destination, data, params):
        raise RuntimeError(f"Interchange scene import failed for {source}")
    actors = [
        actor for actor in actor_editor.get_all_level_actors()
        if actor.get_path_name() not in existing
    ]
    components = [
        component for actor in actors
        for component in actor.get_components_by_class(unreal.StaticMeshComponent)
        if component.get_editor_property("static_mesh")
    ]
    if not components or any(not component.get_material(0) for component in components):
        raise RuntimeError(f"Scene import did not produce material-bearing meshes: {source}")
    return actors, components


def place_scene(actors, actor_editor, yaw, offset, scale):
    placement = unreal.MathLibrary.make_transform(
        unreal.Vector(*offset), unreal.Rotator(yaw=yaw), unreal.Vector(scale, scale, scale)
    )
    imported_paths = {actor.get_path_name() for actor in actors}
    for actor in actors:
        parent = actor.get_attach_parent_actor()
        if parent and parent.get_path_name() in imported_paths:
            continue
        transform = unreal.MathLibrary.compose_transforms(actor.get_actor_transform(), placement)
        if not actor_editor.set_actor_transform(actor, transform):
            raise RuntimeError(f"Could not place {actor.get_actor_label()}")


def make_kondo_walkable(components):
    for component in components:
        mesh = component.get_editor_property("static_mesh")
        setup = mesh.get_editor_property("body_setup")
        if setup is None:
            raise RuntimeError(f"Missing collision body for {mesh.get_name()}")
        mesh.modify()
        setup.set_editor_property("collision_trace_flag", unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
        component.set_collision_profile_name("BlockAll")


def generate():
    # The art module is adjacent to this entry point in the source tree.
    sys.path.insert(0, str(TOOLS))
    import toji_art

    levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    assets = unreal.get_editor_subsystem(unreal.EditorAssetSubsystem)
    actor_editor = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    if MAP_FILE.is_file():
        if not levels.load_level(MAP):
            raise RuntimeError(f"Could not open {MAP}")
        actors = [
            actor for actor in actor_editor.get_all_level_actors()
            if not isinstance(actor, unreal.WorldSettings)
        ]
        if actors and not actor_editor.destroy_actors(actors):
            raise RuntimeError(f"Could not clear generated actors from {MAP}")
    elif not levels.new_level(MAP):
        raise RuntimeError(f"Could not create {MAP}")
    level = levels.get_current_level()

    kondo_actors, kondo_components = import_scene(KONDO, f"{IMPORT_ROOT}/Kondo", level, actor_editor)
    mesh_actors = {component.get_owner() for component in kondo_components}
    source_bounds = kondo_source_bounds()
    yaw = determine_yaw(actor_bounds(mesh_actors), source_bounds)
    place_scene(kondo_actors, actor_editor, yaw, KONDO_OFFSET, KONDO_SCALE)
    expected_placement = tuple(
        tuple(value * KONDO_SCALE + offset for value, offset in zip(corner, KONDO_OFFSET))
        for corner in source_bounds
    )
    if not bounds_match(actor_bounds(mesh_actors), expected_placement):
        raise RuntimeError("Placed Kondō is outside the expected Tō-ji dimensions")
    make_kondo_walkable(kondo_components)

    def import_courtyard(path):
        actors, components = import_scene(path, f"{IMPORT_ROOT}/Courtyard", level, actor_editor)
        place_scene(actors, actor_editor, yaw, (0, 0, 0), 1)
        for component in components:
            component.set_collision_profile_name("NoCollision")

    toji_art.populate(unreal, import_courtyard)
    floor = actor_editor.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, -52))
    floor.set_actor_label("Toji ground collision")
    floor.set_actor_scale3d(unreal.Vector(210, 210, 1))
    floor.static_mesh_component.set_static_mesh(unreal.load_asset("/Engine/BasicShapes/Cube"))
    floor.static_mesh_component.set_collision_profile_name("BlockAll")
    floor.set_actor_hidden_in_game(True)
    floor.set_is_temporarily_hidden_in_editor(True)

    start = actor_editor.spawn_actor_from_class(unreal.PlayerStart, unreal.Vector(-4400, 0, 102))
    start.set_actor_label("Toji south approach")
    if not assets.save_directory(IMPORT_ROOT, only_if_is_dirty=False, recursive=True):
        raise RuntimeError("Could not save generated mesh and material assets")
    if not levels.save_current_level():
        raise RuntimeError(f"Could not save {MAP}")
    unreal.log(f"TOJI_GENERATION_COMPLETE map={MAP} yaw={yaw} bounds_cm={expected_placement}")


if __name__ == "__main__":
    generate()
