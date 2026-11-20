"""Trace the built UE levels with a player-size capsule. Run with -ExecutePythonScript in the editor."""

import json
import math
from pathlib import Path
import traceback
import sys

import unreal

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "Tools"))
from tibet_passages import lanterns, passages, route_sockets


# Points are the UE coordinates of a vertical feature at each photographed landmark.
LANDMARKS = {
    "stupa": (3400, 0),
    "grove": (1600, 0),
    "wild": (900, -900),
    "pharping": (2500, -1000),
    "mangyul": (1700, 1300),
    "yarlung": (3500, 250),
    "samye": (3800, 0),
    "chimphu": (2000, -1400),
    "terma1": (2400, 0),
    "terma2": (2400, 0),
    "terma3": (2400, 0),
}
LEVELS = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
CHANNEL = unreal.TraceTypeQuery.TRACE_TYPE_QUERY1
DRAW = unreal.DrawDebugTrace.NONE
OUTPUT = (
    Path(unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_saved_dir()))
    / "QA/WorldSurvey.json"
)


def survey(stage):
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
    start = next(a.get_actor_location() for a in actors if isinstance(a, unreal.PlayerStart))

    def floor_at(x, y, top):
        hit = unreal.SystemLibrary.line_trace_single(
            world, unreal.Vector(x, y, top), unreal.Vector(x, y, -350), CHANNEL, False, [], DRAW, True
        )
        fields = hit.to_tuple() if hit else ()
        return fields[5].z if fields and fields[0] else None

    def clear(a, b):
        # The runtime capsule is 36 cm in radius. Keep 1 cm additional lateral clearance and
        # lift the probe's feet clear of minor paving transitions on the flat approach.
        hit = unreal.SystemLibrary.capsule_trace_single(
            world, unreal.Vector(*a), unreal.Vector(*b), 37, 78, CHANNEL, False, [], DRAW, True
        )
        return not (hit and hit.to_tuple()[0])

    points = {"NPC": (-1320, 230), "Gate": (700, 0), "Grove gate": (-1860, -480), "Escort": (520, -250)}
    for i in range(5):
        points[f"Interact {i}"] = (-1100 + 200 * i, (-1 if i % 2 else 1) * 340)
    for i in range(12):
        points[f"Combat {i}"] = (-50 + 110 * (i % 3), -350 + 150 * (i % 4))
    for sign in (-1, 1):
        points[f"Reach {sign}"] = (380, sign * 370)

    legs = {
        "entrance → NPC": ((-2000, 0), points["NPC"]),
        "NPC → combat": (points["NPC"], points["Combat 0"]),
        "combat → gate": (points["Combat 0"], points["Gate"]),
        "entrance → grove": ((-2000, 0), points["Grove gate"]),
    }
    if stage in ("stupa", "samye"):
        cx, rx, ry = (3400, 2300, 2300) if stage == "stupa" else (3800, 2700, 3250)
        orbit = [
            (cx + rx * math.cos((i + 4) * math.pi / 4), ry * math.sin((i + 4) * math.pi / 4))
            for i in range(8)
        ]
        for i, point in enumerate(orbit):
            points[f"Kora {i}"] = point
            legs[f"Kora {i} → {(i + 1) % 8}"] = (point, orbit[(i + 1) % 8])
        legs["NPC → Kora"] = (points["NPC"], orbit[0])
        legs["Kora → NPC"] = (orbit[-1], points["NPC"])

    objectives = {}
    for name, (x, y) in points.items():
        z = floor_at(x, y, 178)
        objectives[name] = {
            "floor_cm": z,
            "clear": z is not None and clear((x, y, z + 95), (x, y, z + 96)),
        }
    paths = {name: clear((*a, 96), (*b, 96)) for name, (a, b) in legs.items()}
    # Sample the imported collision at both edges of a capsule-width route,
    # with clearance above each successive tread and across its leading lip.
    for p in passages(stage):
        samples = [(p.start + (i+.5)*p.depth, p.base+(i+1)*p.rise) for i in range(p.steps)]
        samples += [(p.front + d, p.floor) for d in (.3, 1.4, p.landing-.55)]
        for side in (-.52, .52):
            last = None
            for north, authored in samples:
                x, y, expected = north*100, (p.east+side)*100, authored*100
                z = floor_at(x,y,expected+42)
                key = f"Stair {x:.0f},{y:.0f}"
                objectives[key] = {"floor_cm": z, "expected_cm": expected, "clear": z is not None
                    and abs(z-expected) < 3 and clear((x,y,z+95), (x,y,z+96))}
                if last is not None:
                    probe_z = max(expected, last[2]) + 98
                    paths[key] = clear((last[0],last[1],probe_z), (x,y,probe_z))
                last = (x,y,expected)

    sockets = {str(a.tags[1]): a.get_actor_location().to_tuple() for a in actors
               if "TibetPassage" in [str(t) for t in a.tags]}
    authored = route_sockets(stage)
    sockets_match = len(sockets) == len(authored) and all(
        key in sockets and math.dist(sockets[key], (north*100,east*100,z*100)) < 1
        for key, (east,north,z) in authored.items())
    lamps = [a for a in actors if isinstance(a, unreal.SpotLight) and a.get_actor_label().startswith("Butter lamp ")]
    sources_match = len(lamps) == len(lanterns(stage)) and all(any(
        math.dist(l.get_actor_location().to_tuple(),(y*100,x*100,(z+1.40)*100)) < 1
        and l.get_component_by_class(unreal.SpotLightComponent).get_editor_property("use_temperature")
        for l in lamps) for (x,y,z),_,_ in lanterns(stage))
    vault_lighting = not stage.startswith("terma") or (not any(isinstance(a, (
        unreal.DirectionalLight, unreal.SkyLight, unreal.SkyAtmosphere)) for a in actors)
        and any(isinstance(a, unreal.PostProcessVolume) and a.get_editor_property("unbound") for a in actors))
    # Trace below the vault ceiling when locating the three dungeon centrepieces.
    top = 1000 if stage.startswith("terma") else 7000
    height = floor_at(*LANDMARKS[stage], top)
    return {
        "start_cm": start.to_tuple(),
        "landmark_height_cm": height,
        "objective_positions": objectives,
        "capsule_paths": paths,
        "passage_sockets": sockets,
        "butter_lamp_count": len(lamps),
        "sources_match": sources_match,
        "vault_lighting": vault_lighting,
        "passed": list(start.to_tuple()) == [-2000, 0, 100]
        and height is not None
        and height > 200
        and all(item["clear"] for item in objectives.values())
        and all(paths.values()) and sockets_match and sources_match and vault_lighting,
    }


def run():
    results = {}
    stages = iter(LANDMARKS)
    stage = None
    frames = 0
    unreal.EditorPythonScripting.set_keep_python_script_alive(True)

    def finish():
        unreal.unregister_slate_post_tick_callback(handle)
        unreal.EditorPythonScripting.set_keep_python_script_alive(False)
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(results, ensure_ascii=False, indent=2))

    def tick(_delta):
        nonlocal stage, frames
        try:
            if stage is None:
                stage = next(stages, None)
                if stage is None:
                    finish()
                    if all(v["passed"] for v in results.values()) and len(results) == len(LANDMARKS):
                        unreal.log(f"TIBET_WORLD_VERIFIED {OUTPUT}")
                    else:
                        unreal.log_error(f"TIBET_WORLD_FAILED {OUTPUT}")
                    return
                if not LEVELS.load_level(f"/Game/Maps/Tibet/{stage}"):
                    raise RuntimeError(f"Could not open {stage}")
                frames = 0
            frames += 1
            # Physics registration completes over editor ticks after a level transition.
            if frames >= 10:
                results[stage] = survey(stage)
                stage = None
        except Exception:
            unreal.log_error(traceback.format_exc())
            finish()

    handle = unreal.register_slate_post_tick_callback(tick)


if __name__ == "__main__":
    run()
