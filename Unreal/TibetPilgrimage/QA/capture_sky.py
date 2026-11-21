"""Check crescent visibility and moving cloud shade in a Development Mac package (Pillow, NumPy)."""
import argparse
import json
from pathlib import Path
import tempfile

import numpy as np
from PIL import Image

from test_package import capture, package_record, temporary_root, vector


def audit(output):
    def frame(name):
        with Image.open(output / name / "capture.png") as image:
            return np.array(image.convert("L"), dtype=float)

    # These coordinates aim the camera at the physical moon. Night and day share
    # the same clear weather, focal length and position, including the sky horizon.
    night = frame("night")[280:360, 465:550]
    day = frame("day")[280:360, 465:550]
    lit = night > 170
    y, x = np.nonzero(lit)
    if len(x) < 120:
        raise ValueError("Missing visible crescent in the clear night sky")
    area = len(x) / ((np.ptp(x) + 1) * (np.ptp(y) + 1))
    if not .15 < area < .52:
        raise ValueError(f"Night moon silhouette lacks a cutout: {area:.2f} of its bounds are lit")
    if np.median(day[lit]) - np.median(day[~lit]) > 30:
        raise ValueError("Bright moon silhouette remains in the daytime sky")

    # Flat paving west of the buildings has no moving flags, NPCs or day/night
    # change. Only the fixed weather timestamp changes between the three photos.
    def ground(name):
        return frame(name)[64:512, 45:145]

    reference = ground("shade60")
    short = np.abs(ground("shade64") - reference)
    long = np.abs(ground("shade92") - reference)
    if not 1 < long.mean() < 20 or short.mean() > max(2., .60 * long.mean()):
        raise ValueError(f"Unexpected cloud drift over 4 s / 32 s: {short.mean():.2f} / {long.mean():.2f}")
    if np.percentile(long, 95) > 40:
        raise ValueError("Cloud shadows remove too much daylight from the paving")
    return {"moonLitFractionOfBounds": float(area), "groundLumaChange4s": float(short.mean()),
            "groundLumaChange32s": float(long.mean()), "groundLumaChange32sP95": float(np.percentile(long, 95))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exe", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    exe = args.exe.resolve(strict=True)
    output = args.output.resolve()
    output.mkdir(parents=True)
    package_record(exe, output)
    with tempfile.TemporaryDirectory(prefix="tibet-sky-", dir=temporary_root(exe)) as tmp:
        stage = Path(tmp)
        (stage / "user").mkdir()
        for name, phase, seconds in (("night", 0, 360), ("day", .5, 360),
                                     ("shade60", .5, 60), ("shade64", .5, 64), ("shade92", .5, 92)):
            if name in ("night", "day"):
                eye, look = (0, 0, 600), (-12161, -7599, 12634)
            else:
                eye, look = (3400, 0, 6850), (3400, 0, 0)
            options = [f"-TibetQASolarPhase={phase}", f"-TibetWeatherTime={seconds}",
                       f"-TibetQAEye={vector(eye)}", f"-TibetQALook={vector(look)}"]
            capture(exe, stage, output, name, "Photo", "stupa", options, f"QA-{stage.name}-{name}",
                    size=(1000, 640), max_fps=60)
    (output / "sky.json").write_text(json.dumps(audit(output), indent=2))


if __name__ == "__main__":
    main()
