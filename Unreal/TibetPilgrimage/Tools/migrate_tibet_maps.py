"""Strip desktop scene-import metadata from native Tibet maps without rebuilding their geometry."""

from pathlib import Path
import sys

import unreal

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tibet_landscapes import MAPS


IMPORT_METADATA = {
    "/Script/InterchangeImport.InterchangeAssetUserData",
    "/Script/InterchangeImport.InterchangeLevelAssetUserData",
}


def strip_import_metadata(levels, actors):
    world = levels.get_current_level().get_outer()
    settings = unreal.GameplayStatics.get_actor_of_class(world, unreal.WorldSettings)
    if not settings:
        raise RuntimeError(f"Missing WorldSettings in {world.get_path_name()}")
    holders = [settings]
    helpers = []
    for actor in actors.get_all_level_actors():
        # The glTF scene root is an ordinary runtime Actor. Its transform orients all
        # terrain meshes, so it and its attachment hierarchy must remain in the map.
        actor_class = actor.get_class().get_path_name()
        if actor_class.startswith("/Script/Interchange") and actor.is_editor_only_actor:
            if actor.get_attached_actors():
                raise RuntimeError(f"Unexpected attached actors on {actor.get_path_name()}")
            helpers.append(actor)
        else:
            holders.extend(actor.get_components_by_class(unreal.ActorComponent))
    removed = 0
    for obj in holders:
        for prop in ("asset_user_data", "asset_user_data_editor_only"):
            data = obj.get_editor_property(prop)
            keep = [x for x in data if not x or x.get_class().get_path_name() not in IMPORT_METADATA]
            if len(data) != len(keep):
                removed += len(data) - len(keep)
                obj.modify()
                obj.set_editor_property(prop, keep)
    if helpers and not actors.destroy_actors(helpers):
        raise RuntimeError(f"Could not remove editor-only scene helpers in {world.get_path_name()}")
    return removed + len(helpers)


def migrate():
    levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    total = 0
    for stage in MAPS:
        path = f"/Game/Maps/Tibet/{stage}"
        if not levels.load_level(path):
            raise RuntimeError(f"Could not load {path}")
        changes = strip_import_metadata(levels, actors)
        if changes and not levels.save_current_level():
            raise RuntimeError(f"Could not save {path}")
        unreal.log(f"TIBET_MIGRATED {path} removed={changes}")
        total += changes
    unreal.log(f"TIBET_MOBILE_MAPS_READY maps={len(MAPS)} removed={total}")


if __name__ == "__main__":
    migrate()
