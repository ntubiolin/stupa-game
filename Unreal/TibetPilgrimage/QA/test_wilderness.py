"""Validate the wild encounter meshes and optionally exercise a real Mac package."""
import argparse
import json
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


def visible_rim(frame, rows):
    w,h,pixel = bitmap(frame)
    detected = total = 0
    for tag, *point in rows:
        if tag != "rim": continue
        x,y = [int(float(v)) for v in point]
        if not (5 <= x < w-5 and 5 <= y < h-5): continue
        total += 1
        colors = [pixel(i,j) for i in range(x-3,x+4) for j in range(y-3,y+4)]
        if any(r>160 and r>1.32*g and g>1.20*b for r,g,b in colors): detected += 1
    if total < 12 or detected < total*.35:
        raise ValueError(f"Boss foot halo was not visible at the projected rim ({detected}/{total})")
    return detected, total


class WildernessTests(unittest.TestCase):
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
