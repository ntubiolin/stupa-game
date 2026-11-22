"""Validate the wild encounter meshes and optionally exercise a real Mac package."""
import argparse
import json
from functools import lru_cache
from itertools import product
import math
from pathlib import Path
import re
import sys
import tempfile
import unittest

from capture_passages import bitmap
from test_package import capture, package_record, shot_data, temporary_root

PROJECT = Path(__file__).resolve().parents[1]
SPECIES = {"Preta", "TsenRider", "SnowMigoi"}
MODELS = {name.casefold(): name for name in SPECIES | {"SnowKing"}}


def model_name(raw):
    # Cooked FNames are case-insensitive. A pre-existing actor tag can supply
    # their display spelling, even when the mesh came from Preta.fbx.
    return MODELS.get(raw.casefold(), raw)


def validate_hits(log):
    hits = re.findall(r"TIBET_WILD_HIT model=(\w+) before=(\d+) after=(\d+) loss=(\d+)", log)
    defeated = []
    for model, before, after, loss in hits:
        model = model_name(model)
        before, after, loss = map(int, (before, after, loss))
        if model not in SPECIES or loss <= 0 or before-after != loss or after < 0:
            raise ValueError(f"Inconsistent hit on {model}: {before}, {after}, {loss}")
        if after == 0: defeated.append(model)
    return defeated


def match_rim(w, h, pixel, points):
    if len(points) < 12:
        raise ValueError("Too few projected halo samples")
    cx = sum(x for x, _ in points) / len(points)
    cy = sum(y for _, y in points) / len(points)
    offsets = [(x-cx, y-cy) for x,y in points]

    @lru_cache(maxsize=None)
    def orange(x, y):
        if not (0 <= x < w and 0 <= y < h):
            return False
        r, g, b = pixel(x, y)
        return r > 160 and r > 1.32*g and g > 1.20*b

    def ink(x, y):
        x, y = round(x), round(y)
        return any(orange(x+dx,y+dy) for dx,dy in ((0,0),(-2,0),(2,0),(0,-2),(0,2)))

    # UE projects during the game tick. The async screenshot contains the next
    # rendered camera pose. Fit one common offset/scale, never individual dots.
    best = 0
    for dx,dy in product((0,-8,8,-16,16,-24,24), repeat=2):
        for scale in (1.,.94,1.06,.88,1.12,1.18):
            hits = 0
            quarters = set()
            for i,(x,y) in enumerate(offsets):
                if (ink(cx+dx+x*scale, cy+dy+y*scale) and
                        not ink(cx+dx+x*scale*1.30, cy+dy+y*scale*1.30)):
                    hits += 1
                    quarters.add(4*i//len(offsets))
            if len(quarters)>=3:
                best = max(best,hits)
    if best < len(points)*.50:
        raise ValueError(f"No distinct boss foot halo near its projected rim ({best}/{len(points)})")
    return best,len(points)


def visible_rim(frame, rows):
    w,h,pixel = bitmap(frame)
    points = [(float(row[1]),float(row[2])) for row in rows if row[0]=="rim"]
    return match_rim(w,h,pixel,points)


class WildernessTests(unittest.TestCase):
    def test_halo_must_form_an_outline_near_the_boss(self):
        points = [(280+100*math.cos(i*math.tau/32),160+30*math.sin(i*math.tau/32)) for i in range(32)]
        def painted(x,y):
            radius = ((x-296)/106)**2 + ((y-152)/32)**2
            return (241,100,26) if .87 < radius < 1.13 else (86,90,82)
        self.assertGreaterEqual(match_rim(560,320,painted,points)[0],26)
        for background in ((86,90,82),(241,100,26)):
            with self.assertRaises(ValueError): match_rim(560,320,lambda x,y:background,points)

    def test_assets_available_to_import(self):
        figures = PROJECT / "Assets/Figures"
        counts = json.loads((figures/"triangle-counts.json").read_text())
        models = SPECIES | {"SnowKing"}
        self.assertEqual(len({(figures/(model+".fbx")).read_bytes() for model in models}), 4)
        for model in models: self.assertGreater(counts[model],1000)
        self.assertGreater(counts["SnowKing"],counts["SnowMigoi"])

    def test_damage_ledger(self):
        self.assertEqual(validate_hits("TIBET_WILD_HIT model=TsenRider before=1 after=0 loss=1"),["TsenRider"])
        self.assertEqual(validate_hits("TIBET_WILD_HIT model=preta before=1 after=0 loss=1"), ["Preta"])
        with self.assertRaises(ValueError): validate_hits("TIBET_WILD_HIT model=Yak before=1 after=0 loss=1")
        with self.assertRaises(ValueError): validate_hits("TIBET_WILD_HIT model=Preta before=3 after=3 loss=1")


def play(exe, output):
    output.mkdir(parents=True)
    package_record(exe,output)
    with tempfile.TemporaryDirectory(prefix="tibet-wild-",dir=temporary_root(exe)) as temp:
        stage=Path(temp)
        (stage/"user").mkdir()
        slot="QA-"+stage.name
        first = capture(exe,stage,output,"first","Play","wild",
                        ["-TibetQAEncounters","-TibetQAStopStep=0","-TibetQAStopProgress=1"],slot)
        if ["pack","0","3","3"] not in first: raise ValueError("First wilderness must contain all three models")
        rows = capture(exe,stage,output,"resume","Play","wild",["-TibetQAEncounters"],slot)
        if ["pack","1","3","3"] not in rows or rows[-1] != ["pass","transition","pharping"]:
            raise ValueError("Failed to rebuild the partial encounter from the saved quest")
        for scenario, events in (("first",first), ("resume",rows)):
            for phase in ("enemy-windup", "enemy-strike"):
                if [phase] not in events: raise ValueError(f"Missing ordinary enemy {phase}")
                shot_data(output/scenario/(phase+".png"))
        captures = {model_name(row[1]): row[1] for row in rows if row[0]=="opponent"}
        if set(captures) != SPECIES|{"SnowKing"}:
            raise ValueError("Missing playable monster or boss")
        defeated=[]
        for scenario in ("first","resume"):
            defeated += validate_hits((output/scenario/"game.log").read_text())
        if len(defeated)!=10 or set(defeated)!=SPECIES: raise ValueError(f"Unexpected defeats: {defeated}")
        for spelling in captures.values(): shot_data(output/"resume"/(spelling+".png"))
        print("Liberated",defeated,"Boss rim samples",visible_rim(output/"resume"/(captures["SnowKing"]+".png"),rows))


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exe",type=Path)
    parser.add_argument("--output",type=Path)
    args=parser.parse_args()
    if args.exe or args.output:
        if not args.exe or not args.output: parser.error("--exe and --output go together")
        play(args.exe.resolve(strict=True),args.output.resolve())
    else: unittest.main(argv=[sys.argv[0]])
