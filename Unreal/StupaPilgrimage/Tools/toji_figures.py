"""Place hidden source mesh references for the native Tō-ji character rig."""
import json
from pathlib import Path
import struct

OUT = Path(__file__).resolve().parent.parent / "Assets/Toji/Figures"
PARTS = ("PilgrimBody", "PilgrimLeftLeg", "PilgrimLeftSleeve", "PilgrimRightLeg",
         "PilgrimRightSleeve", "Kukai")
DESTINATION = "/Game/Generated/Toji/Figures"


def verify_bounds(path, owner, offset):
    with path.open("rb") as stream:
        magic, version, _, size, chunk = struct.unpack("<4sIII4s", stream.read(20))
        if (magic, version, chunk) != (b"glTF", 2, b"JSON"):
            raise RuntimeError(f"Could not read figure GLB bounds from {path}")
        source = json.loads(stream.read(size))
    primitives = source["meshes"][0]["primitives"]
    points = []
    for primitive in primitives:
        dimensions = source["accessors"][primitive["attributes"]["POSITION"]]
        for corner in ("min", "max"):
            east, up, south = dimensions[corner]
            points.append((-100*south, 100*east, 100*up))
    low = [min(axis) + translation for axis, translation in zip(zip(*points), offset)]
    high = [max(axis) + translation for axis, translation in zip(zip(*points), offset)]
    center, extent = owner.get_actor_bounds(False, False)
    for value, radius, lower, upper in zip((center.x,center.y,center.z), (extent.x,extent.y,extent.z), low, high):
        if abs(value-radius-lower) > 2 or abs(value+radius-upper) > 2:
            raise RuntimeError(f"Generated figure has unexpected scale, pivot or orientation: {path.stem}")


def populate(unreal, import_scene, actor_editor, yaw):
    # GLB inputs use the same east/up/south mapping as Kondō. Applying its
    # verified yaw gives everything a +X forward, +Z up gameplay frame.
    for index, part in enumerate(PARTS):
        path = OUT / f"{part}.glb"
        actors, components = import_scene(path, f"{DESTINATION}/{part}")
        if len(components) != 1:
            raise RuntimeError(f"Figure {part} must import as one assembled static mesh")
        component = components[0]
        owner = component.get_owner()
        mesh = component.get_editor_property("static_mesh")
        if not mesh or any(not component.get_material(i) for i in range(component.get_num_materials())):
            raise RuntimeError(f"Figure {part} did not import all material slots")
        offset = index*330, 0, -2000
        transform = unreal.MathLibrary.make_transform(
            unreal.Vector(*offset), unreal.Rotator(yaw=yaw), unreal.Vector(1, 1, 1)
        )
        if not actor_editor.set_actor_transform(
            owner, unreal.MathLibrary.compose_transforms(owner.get_actor_transform(), transform)
        ):
            raise RuntimeError(f"Could not place source reference for {part}")
        verify_bounds(path, owner, offset)
        owner.set_actor_label(f"Toji source mesh - {part}")
        owner.set_editor_property("tags", [*owner.get_editor_property("tags"), f"Toji.Figure.{part}"])
        component.set_collision_profile_name("NoCollision")
        component.set_visibility(False)
        owner.set_actor_hidden_in_game(True)
        for actor in actors:
            if actor != owner:
                actor.set_actor_hidden_in_game(True)
