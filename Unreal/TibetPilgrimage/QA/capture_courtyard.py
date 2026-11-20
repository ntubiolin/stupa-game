"""Verify the macaque offering, clock, courtyard flame and animated flag pixels in a packaged Mac game."""
import argparse
import json
from pathlib import Path
from statistics import median
import tempfile

from capture_passages import bitmap, candlelight
from test_package import VIEWS, capture, package_record, shot_data, temporary_root, vector


def compare_light_and_wind(day_a, day_b, night):
    frames = [bitmap(p,(704,440)) for p in (day_a,day_b,night)]
    colors, changed, stable, stationary = 0,0,0,0
    day_light,night_light=[],[]
    for y in range(65,403,2):
        for x in range(50,655,2):
            a,b,n=[read(x,y) for _,_,read in frames]
            chroma=max(a)-min(a)
            delta=max(abs(p-q) for p,q in zip(a,b))
            if chroma>38 and max(a)>80:
                colors+=1
                changed+=delta>15
            if chroma<18 and 45<sum(a)/3<230:
                stationary+=1
                stable+=delta<12
            if y>230:
                day_light.append(sum(a)/3)
                night_light.append(sum(n)/3)
    values={"coloredPixels":colors,"animatedPixels":changed,"stableArchitecture":stable/max(1,stationary),
            "dayLuma":median(day_light),"nightLuma":median(night_light)}
    if changed<18 or values["stableArchitecture"] < .85:
        raise ValueError(f"No independently moving fabric in a stationary scene: {values}")
    if values["nightLuma"] > values["dayLuma"]*.62 or values["nightLuma"]<8:
        raise ValueError(f"Night must differ from day while retaining visible architecture: {values}")
    return values


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exe",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    exe=args.exe.resolve(strict=True)
    output=args.output.resolve();output.mkdir(parents=True)
    package_record(exe,output)
    with tempfile.TemporaryDirectory(prefix="tibet-courtyard-",dir=temporary_root(exe)) as temp:
        root=Path(temp);(root/"user").mkdir()
        slot="QA-"+root.name
        events=capture(exe,root,output,"play","Courtyard","stupa",["-TibetTouch"],slot,size=(1440,900))
        if not any(row[0]=="clock" and 3.5<float(row[1])<4.5 for row in events):
            raise ValueError("No measured 4× world clock")
        game_log=(output/"play/game.log").read_text(errors="replace")
        if any("Courtyard/" in line and "missing usage flag" in line for line in game_log.splitlines()):
            raise ValueError("The macaque or banana rendered with Unreal's fallback material")
        hashes={s:shot_data(output/"play"/(s+".png")) for s in
                ("macaque","feeding","offered","feeding-banana","flags-a","flags-b","night","butter-lamp")}
        motion=compare_light_and_wind(*(output/"play"/(s+".png") for s in ("flags-a","flags-b","night")))
        capture(exe,root,output,"resume","CourtyardResume","stupa",[],slot)
        view=next(v for v in VIEWS if v["id"]=="terma1")
        options=["-TibetQAEye="+vector(view["ueEye"]),"-TibetQALook="+vector(view["ueLook"])]
        vault={}
        for phase,save in (("night",slot),("day",slot+"-new")):
            name="vault-"+phase
            capture(exe,root,output,name,"Photo","terma1",options,save)
            vault[phase]=candlelight(output/name/"capture.png")
        if abs(vault["day"]["floorMedian"]-vault["night"]["floorMedian"])>8:
            raise ValueError(f"Outdoor clock changed the underground illumination: {vault}")
        (output/"courtyard.json").write_text(json.dumps({"images":hashes,"motion":motion,"vault":vault},indent=2))


if __name__=="__main__":
    main()
