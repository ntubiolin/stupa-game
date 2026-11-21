"""Verify that the Boudha plinth and finial cover their footprints when viewed from below."""
import math
from collections import defaultdict
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "Tools"))
from tibet_landscapes import boudha
from tibet_mesh import Scene, normal


class BoudhaUndersides(unittest.TestCase):
    def test_downward_faces_cover_each_footprint(self):
        scene = Scene()
        boudha(scene)
        areas = defaultdict(float)
        for mat, stream in scene.meshes["Landmarks"].items():
            for i in range(0, len(stream), 3):
                triangle = stream[i:i + 3]
                a, b, c = [v[0] for v in triangle]
                # In exported glTF, Y is up and the stupa is centred at (0, -34) in X/Z.
                if max(p[1] for p in (a, b, c)) - min(p[1] for p in (a, b, c)) > 1.e-6:
                    continue
                if any(math.hypot(p[0], p[2] + 34) > 10.8 for p in (a, b, c)):
                    continue
                if normal(a, b, c)[1] > -0.999 or any(v[1][1] > -0.999 for v in triangle):
                    continue
                area = ((b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2])) / 2
                areas[mat, round(a[1], 4)] += area

        spire = 16.11
        canopy = spire + 13 * .65
        footprints = [
            ("whitewash", 4.14, 10.67, 96), ("giltpaint", 4.54, 10.53, 96),
            ("whitewash", 4.70, 10.36, 120), ("gold", canopy, .48, 48),
            ("giltpaint", canopy + .40, 1.68, 48), ("gold", canopy + 1, .27, 32),
        ]
        footprints.extend(("gold", spire + i * .65, (2.60 - i * .158) * math.sqrt(2), 4)
                          for i in range(13))
        for mat, height, radius, sides in footprints:
            with self.subTest(material=mat, height=height):
                area = sides / 2 * radius ** 2 * math.sin(math.tau / sides)
                self.assertAlmostEqual(areas[mat, round(height, 4)], area, places=5)


if __name__ == "__main__":
    unittest.main()
