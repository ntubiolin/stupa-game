"""Refresh compact Nepal and Tibet heightfields. Requires Pillow and network access."""
from functools import lru_cache
from io import BytesIO
import math
from pathlib import Path
import struct
from urllib.request import urlopen

from PIL import Image

OUTPUT = Path(__file__).resolve().parents[1] / "Assets/Relief"
# Latitude and longitude of the regional reference, not a survey of the playable plaza.
SITES = {
    "stupa": (27.7214, 85.3620),
    "pharping": (27.6175, 85.2665),
    "mangyul": (28.3933, 85.3292),
    "yarlung": (29.1426, 91.8027),
    "samye": (29.3265, 91.5025),
    "chimphu": (29.350, 91.556),
}
ZOOM = 10
WIDTH = 89
SPACING = 250  # metres per sample
EARTH = 6378137


@lru_cache(maxsize=32)
def tile(x, y):
    url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{x}/{y}.png"
    with urlopen(url, timeout=30) as response:
        return Image.open(BytesIO(response.read())).convert("RGB")


def sample(lat, lon):
    scale = 256 * (2**ZOOM)
    x = int((lon + 180) / 360 * scale)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) * scale / 2)
    r, g, b = tile(x // 256, y // 256).getpixel((x % 256, y % 256))
    return round(r * 256 + g + b / 256 - 32768)


def main():
    for key, (lat, lon) in SITES.items():
        values = []
        for north in range(-(WIDTH // 2), WIDTH // 2 + 1):
            for east in range(-(WIDTH // 2), WIDTH // 2 + 1):
                y = lat + math.degrees(north * SPACING / EARTH)
                x = lon + math.degrees(east * SPACING / (EARTH * math.cos(math.radians(lat))))
                values.append(sample(y, x))
        (OUTPUT / f"{key}.i16").write_bytes(struct.pack(f"<{len(values)}h", *values))
        print(key, min(values), max(values), flush=True)


if __name__ == "__main__":
    main()
