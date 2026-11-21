"""Pair the six Mac landmark photographs with their regional elevation grids."""
import argparse
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT / "Tools"))
from sample_relief import SITES, WIDTH

NAMES = {
    "stupa": "Boudhanath", "pharping": "Pharping", "mangyul": "Gyirong Valley",
    "yarlung": "Yumbulagang", "samye": "Samye Monastery", "chimphu": "Chimpu Hermitage",
}


def relief_map(key, heading):
    data = np.fromfile(PROJECT / f"Assets/Relief/{key}.i16", dtype="<i2").reshape(WIDTH, WIDTH)
    field = np.flipud(data).astype(float)
    dy, dx = np.gradient(field / 250)
    intensity = np.clip((1.1 + dx * .65 + dy * .52) / np.sqrt(1 + dx*dx + dy*dy), .38, 1.4)
    t = (field - field.min()) / max(1, field.max() - field.min())
    rgb = np.stack([np.interp(t, [0, .45, .8, 1], palette) for palette in
                    [[87, 138, 177, 209], [118, 145, 156, 193], [107, 116, 136, 181]]], axis=-1)
    img = Image.fromarray(np.uint8(np.clip(rgb*intensity[:, :, None], 0, 255))).resize((310,310), Image.Resampling.BICUBIC)
    pen = ImageDraw.Draw(img)
    c = 155
    v = np.array(heading, dtype=float)
    v /= np.linalg.norm(v)
    pen.line((c, c, c + 45*v[1], c - 45*v[0]), fill="black", width=6)
    pen.line((c, c, c + 45*v[1], c - 45*v[0]), fill="white", width=3)
    pen.ellipse((c-5,c-5,c+5,c+5), fill="white", outline="black")
    pen.rectangle((8,8,29,30), fill="#142021")
    pen.text((14,10), "N", fill="white", font=ImageFont.load_default(size=14))
    pen.rectangle((8,278,91,306), fill="#142021")
    pen.line((14,301,84,301),fill="white",width=2)
    pen.text((18,279),"5 km",fill="white",font=ImageFont.load_default(size=14))
    return img


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mac", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    views = {v["id"]: v for v in json.loads((PROJECT/"QA/views.json").read_text())}
    sheet = Image.new("RGB", (1700, 1190), "#152224")
    draw = ImageDraw.Draw(sheet)
    def label(x, y, text, size, color="white"):
        draw.text((x, y), text, font=ImageFont.load_default(size=size), fill=color)
    label(24, 16, "Nepal to Tibet  /  Six regional landscapes", 32)
    label(24, 61, "Mac gameplay captures and 22 km elevation maps. Centre marks the reference site. Line shows the view direction.", 18, "#b8cbc7")
    for i,(key,(lat,lon)) in enumerate(SITES.items()):
        x, y = 24+842*(i%2), 112+346*(i//2)
        label(x,y, NAMES[key], 20)
        label(x+490,y, f"{lat:.4f} N    {lon:.4f} E", 16, "#b8cbc7")
        view = views[key]
        heading = np.subtract(view["ueLook"][:2], view["ueEye"][:2])
        shot = Image.open(args.mac / key / "capture.png").convert("RGB").resize((496,310), Image.Resampling.LANCZOS)
        sheet.paste(shot,(x,y+28))
        sheet.paste(relief_map(key,heading),(x+502,y+28))
    label(24,1160,"Terrain: Mapzen Terrain Tiles, USGS SRTM / GMTED2010. Regional relief compressed 1:50. Foreground sites are hand-modelled.", 16, "#b8cbc7")
    sheet.save(args.output, quality=93)


if __name__ == "__main__":
    main()
