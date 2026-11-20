"""Walk the four cave gates in a cooked app; verify both pulse phases and three vault exposures."""
import argparse
import json
from pathlib import Path
from statistics import median
import struct
import subprocess
import tempfile

from test_package import VIEWS, capture, capture_landmark, package_record, shot_data, temporary_root


def bitmap(path, size=None):
    with tempfile.TemporaryDirectory() as tmp:
        dest = Path(tmp) / "sample.bmp"
        scale = ["-z", str(size[1]), str(size[0])] if size else []
        subprocess.run(["sips", "-s", "format", "bmp", *scale, str(path), "--out", str(dest)],
                       check=True, stdout=subprocess.DEVNULL)
        data = dest.read_bytes()
    start = struct.unpack_from("<I", data, 10)[0]
    width, height, _, bits = struct.unpack_from("<iiHH", data, 18)
    assert data[:2] == b"BM" and bits in (24,32)
    stride = ((width * bits + 31) // 32) * 4
    def pixel(x,y):
        row = abs(height)-1-y if height > 0 else y
        i = start + row * stride + x * (bits//8)
        return data[i+2],data[i+1],data[i]
    return width,abs(height),pixel


def candlelight(path):
    w,h,pixel = bitmap(path, (192,120))
    floor = [pixel(x,y) for x in range(w//4,3*w//4) for y in range(2*h//3,h-5)]
    luma = sorted(.2126*r+.7152*g+.0722*b for r,g,b in floor)
    warm = sum(r > g*1.09 and r > b*1.25 and r>36 for r,g,b in floor) / len(floor)
    illumination = median(luma)
    ceiling = sorted(.2126*r+.7152*g+.0722*b for x in range(10,w-10) for y in range(8,45)
                     for r,g,b in [pixel(x,y)])
    ceiling95 = ceiling[int(len(ceiling)*.95)]
    if not (ceiling95 < 160 and 8 <= illumination <= 170 and luma[-len(floor)//10] >= 22 and warm > .035):
        raise ValueError(f"{path}: floor median {illumination:.1f}, warm fraction {warm:.3f}, ceiling P95 {ceiling95:.1f}")
    return {"floorMedian":illumination,"warmFloorFraction":warm,"ceilingP95":ceiling95}


def gate_pixels(path, x, y):
    shot_data(path)
    w,h,pixel = bitmap(path)
    if not (12 <= x < w-12 and 12 <= y < h-12):
        raise ValueError(f"Gate projects outside {path}")
    # Sample the material on its projected right-hand jamb. Keep adjacent
    # antialiased edges and exclude the surrounding warm stone.
    sample = [pixel(i,j) for i in range(int(x)-10,int(x)+11) for j in range(int(y)-9,int(y)+10)]
    jamb = sorted(g for r,g,b in sample if g-r>=18 and b-r>=8)
    if len(jamb)<4:
        raise ValueError(f"No visible turquoise gate at ({x:.1f}, {y:.1f}) in {path}")
    return median(jamb[-min(12,len(jamb)):])


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--exe", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    output, exe = a.output.resolve(), a.exe.resolve(strict=True)
    output.mkdir(parents=True)
    package_record(exe, output)
    report = {}
    with tempfile.TemporaryDirectory(prefix="tibet-passages-",dir=temporary_root(exe)) as tmp:
        stage = Path(tmp)
        (stage / "user").mkdir()
        slot = "QA-"+stage.name
        for level,destination in (("chimphu","terma1"),("terma1","terma2"),("terma2","terma3"),("terma3","chimphu")):
            name = "walk-"+level
            events = capture(exe,stage,output,name,"Play",level,["-TibetQAGateEvidence"],slot)
            if events[-1] != ["pass","transition",destination]:
                raise ValueError(f"Wrong destination at {level}")
            pulses = {}
            for row in events:
                if row[0] != "glow":
                    continue
                phase, amount, distance, x, y = row[1], *map(float,row[2:])
                if distance < 850:
                    raise ValueError(f"{level} beacon was only sampled from {distance} cm")
                pulses[phase] = gate_pixels(output/name/(phase+".png"),x,y)
            if set(pulses) != {"gate-low","gate-high"} or pulses["gate-high"] < pulses["gate-low"]+2:
                raise ValueError(f"{level} pulse not visible in the rendered jamb: {pulses}")
            feet, floor, distance = map(float,next(r[1:] for r in events if r[0]=="enter"))
            if floor < 100 or abs(feet-floor)>29 or distance>225:
                raise ValueError(f"{level} entered from incorrect floor: {feet}, {floor}, {distance}")
            report[level] = {"pulseGreen":pulses,"standingFeetCm":feet,"gateFloorCm":floor}
        for view in VIEWS:
            if view["id"].startswith("terma"):
                capture_landmark(exe,stage,output,view,slot+"-photo")
                path = output / view["id"] / "capture.png"
                report[view["id"]].update(candlelight(path), screenshot=shot_data(path))
    (output/"passages.json").write_text(json.dumps(report,indent=2))


if __name__ == "__main__":
    main()
