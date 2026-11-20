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


def visible_offering(path):
    # The fixed three-quarter camera puts the palm between the eyes and the
    # near edge of the silhouette. Sample the yellow peel in that region.
    width,height,pixel=bitmap(path,(480,300))
    peel=sum(1 for x in range(width//3,width//2) for y in range(height//4,height//2)
             for r,g,b in [pixel(x,y)] if min(r,g)-b>35 and abs(r-g)<30 and b<.51*g)
    if peel<35:
        raise ValueError(f"Offered banana is obscured: {peel} yellow samples beside the muzzle")
    return peel


def clock_contrast(directory, size):
    frames=[bitmap(directory/f"clock-{rate}x.png") for rate in (1,4)]
    if any((w,h)!=size for w,h,_ in frames):
        raise ValueError("Clock screenshots do not match the requested viewport")
    width,height=size
    one,four=[frame[2] for frame in frames]

    def gold(rgb):
        r,g,b=rgb
        return r>200 and 150<g<230 and 55<b<155 and r-g>25

    def cream(rgb):
        r,g,b=rgb
        return r>200 and g>180 and b>148

    def luma(rgb):
        channels=[((v/255+.055)/1.055)**2.4 if v>10 else v/3294.6 for v in rgb]
        return sum(c*k for c,k in zip(channels,(.2126,.7152,.0722)))

    boxes=[]
    ratios=[]
    for chosen,other in ((one,four),(four,one)):
        fill=[(x,y) for y in range(5,min(130,height//3)) for x in range(width-230,width-4)
              if gold(chosen(x,y)) and max(other(x,y))<98]
        if len(fill)<250:
            raise ValueError("Selected clock rate lacks a distinct gold control background")
        left,right=min(x for x,_ in fill),max(x for x,_ in fill)
        top,bottom=min(y for _,y in fill),max(y for _,y in fill)
        boxes.append((left,right,top,bottom))
        ink=[luma(chosen(x,y)) for y in range(top+3,bottom-2) for x in range(left+5,right-4)
             if max(chosen(x,y))<100 and cream(other(x,y))]
        if len(ink)<6:
            raise ValueError("The selected rate numeral is not visible on its button")
        ratio=(median(luma(chosen(x,y)) for x,y in fill)+.05)/(median(ink)+.05)
        if ratio<4.5:
            raise ValueError(f"Clock button contrast is {ratio:.2f}:1")
        ratios.append(round(ratio,2))
    l1,r1,top,bottom=boxes[0]
    l4,r4,_,_=boxes[1]
    stride=l4-l1
    if not (l1<r1<l4<r4):
        raise ValueError("Selected backgrounds do not follow 1× then 4×")
    panel_left=l1-stride
    # Across this fixed HUD, the complete period and time must occupy one line.
    title_rows=[y for y in range(10,top) if
                sum(cream(one(x,y)) for x in range(panel_left,r4+1))>=3]
    if not title_rows or title_rows[-1]-title_rows[0]+1>(bottom-top)*.78:
        raise ValueError("Clock time and day period do not fit on one line")
    pause=[x for x in range(panel_left,l1-1) for y in range(top+3,bottom-2) if cream(one(x,y))]
    if not pause or min(pause)-panel_left<3 or l1-1-max(pause)<3:
        raise ValueError("Pause glyph is missing or clipped")
    return {"selectedContrastRatios":ratios,"timeTextHeight":title_rows[-1]-title_rows[0]+1}


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
                ("macaque","feeding","offered","feeding-banana","dedication","flags-a","flags-b","night","butter-lamp")}
        peel=visible_offering(output/"play/feeding-banana.png")
        motion=compare_light_and_wind(*(output/"play"/(s+".png") for s in ("flags-a","flags-b","night")))
        capture(exe,root,output,"resume","CourtyardResume","stupa",[],slot)
        controls={}
        for label,size,options in (("wide",(1440,900),[]),("compact",(884,420),["-TibetTouch"])):
            name="clock-"+label
            capture(exe,root,output,name,"Courtyard","stupa",["-TibetQAClockOnly",*options],slot+label,size=size)
            controls[label]=clock_contrast(output/name,size)
        view=next(v for v in VIEWS if v["id"]=="terma1")
        options=["-TibetQAEye="+vector(view["ueEye"]),"-TibetQALook="+vector(view["ueLook"])]
        vault={}
        for phase,save in (("night",slot),("day",slot+"-new")):
            name="vault-"+phase
            capture(exe,root,output,name,"Photo","terma1",options,save)
            vault[phase]=candlelight(output/name/"capture.png")
        if abs(vault["day"]["floorMedian"]-vault["night"]["floorMedian"])>8:
            raise ValueError(f"Outdoor clock changed the underground illumination: {vault}")
        (output/"courtyard.json").write_text(json.dumps({"images":hashes,"motion":motion,"vault":vault,"bananaPixels":peel,"clockControls":controls},indent=2))


if __name__=="__main__":
    main()
