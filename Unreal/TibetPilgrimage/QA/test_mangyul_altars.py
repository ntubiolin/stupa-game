"""Verify 1:1 coordinate parity & walkable clearance between Mangyul's 12 Tenma altars and ATibetGameMode."""

import math
from pathlib import Path
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "Tools"))

from tibet_landscapes import landscape  # noqa: E402


def authored_tenma_altars_ue():
    """Return the 12 Tenma altar bases in UE centimetres from Tools/tibet_landscapes.py camp()."""
    altars = []
    for idx in range(6):
        for side in (-1, 1):
            east = side * (8.2 + (idx % 2) * 2.4)
            north = -9.0 + idx * 4.2
            # Scene (east, north, up) metres -> UE (north*100, east*100, up*100) cm via Rotator(yaw=90).
            altars.append((north * 100.0, east * 100.0, 0.0))
    return altars


def cpp_mangyul_altar_location(index: int):
    """Mirror ATibetGameMode::MangyulAltarLocation(Index) after verifying its source formula."""
    clamped = max(0, min(11, index))
    row = clamped // 2
    side = 1.0 if (clamped % 2) else -1.0
    x = -900.0 + row * 420.0
    y = side * (820.0 + (row % 2) * 240.0)
    return (x, y, 0.0)


class MangyulAltarParityTests(unittest.TestCase):
    def test_cpp_formula_matches_authored_scene_coordinates(self):
        cpp_src = (ROOT / "Source/TibetPilgrimage/TibetMangyulAltars.cpp").read_text(encoding="utf-8")
        gm_src = (ROOT / "Source/TibetPilgrimage/TibetGameMode.cpp").read_text(encoding="utf-8")

        self.assertIn("MangyulAltarLocation(Count)", gm_src)
        self.assertRegex(cpp_src, r"const\s+double\s+X\s*=\s*-900\.0\s*\+\s*Row\s*\*\s*420\.0\s*;")
        self.assertRegex(
            cpp_src,
            r"const\s+double\s+Y\s*=\s*Side\s*\*\s*\(\s*820\.0\s*\+\s*\(\s*Row\s*%\s*2\s*\)\s*\*\s*240\.0\s*\)\s*;",
        )
        uncommented = re.sub(r"//.*", "", cpp_src)
        self.assertNotIn("PointLight", uncommented, "Tenma Oath Stones and beacons must add zero PointLights")

        authored = authored_tenma_altars_ue()
        self.assertEqual(len(authored), 12)
        for index, expected in enumerate(authored):
            actual = cpp_mangyul_altar_location(index)
            for axis, (a, e) in enumerate(zip(actual, expected)):
                self.assertAlmostEqual(a, e, places=6, msg=f"Altar {index} axis {axis}: {actual} != {expected}")

    def test_all_twelve_altar_meshes_and_trail_approaches_exist_in_mangyul_glb(self):
        scene = landscape("mangyul")
        landmarks = scene.meshes["Landmarks"]

        def ue_vertices(mat_name):
            # glTF vertex is axis(east, north, up) = (east, up, -north) -> UE = (north*100, east*100, up*100)
            return [(-v[0][2] * 100.0, v[0][0] * 100.0, v[0][1] * 100.0) for v in landmarks[mat_name]]

        stone_verts = ue_vertices("stone")
        ice_verts = ue_vertices("ice")

        solid_tris = []
        for group, mats in scene.meshes.items():
            if group == "Vegetation":
                continue
            for stream in mats.values():
                for i in range(0, len(stream), 3):
                    pts = [(-v[0][2] * 100.0, v[0][0] * 100.0, v[0][1] * 100.0) for v in stream[i : i + 3]]
                    if max(p[2] for p in pts) > 8.0 and min(p[2] for p in pts) < 180.0:
                        if min(p[0] for p in pts) < 1600.0 and max(p[0] for p in pts) > -1400.0 and min(abs(p[1]) for p in pts) < 1500.0:
                            solid_tris.append(pts)

        def capsule_clear_2d(cx, cy, radius=38.0):
            for pts in solid_tris:
                for a, b in zip(pts, pts[1:] + pts[:1]):
                    dx, dy = b[0] - a[0], b[1] - a[1]
                    t = max(0.0, min(1.0, ((cx - a[0]) * dx + (cy - a[1]) * dy) / max(1e-9, dx * dx + dy * dy)))
                    if math.hypot(a[0] + t * dx - cx, a[1] + t * dy - cy) < radius:
                        return False
            return True

        for index in range(12):
            ux, uy, _ = cpp_mangyul_altar_location(index)
            side = 1.0 if (index % 2) else -1.0
            with self.subTest(altar=index, x=ux, y=uy):
                # 1. Confirm stone altar rock (~115 cm) and ice spire (~190 cm) sit right at (ux, uy).
                local_stone_z = [p[2] for p in stone_verts if math.hypot(p[0] - ux, p[1] - uy) < 95.0]
                local_ice_z = [p[2] for p in ice_verts if math.hypot(p[0] - ux, p[1] - uy) < 40.0]
                self.assertTrue(local_stone_z and max(local_stone_z) > 105.0, f"Missing stone rock at altar {index}")
                self.assertTrue(local_ice_z and max(local_ice_z) > 185.0, f"Missing crystal spire at altar {index}")

                # 2. Confirm Pilgrim (38 cm QA probe) can stand on the trailward side within QA Reach (170 cm) & InteractionAt (225 cm).
                inward_clear = [d for d in range(105, 170, 2) if capsule_clear_2d(ux, uy - side * d)]
                self.assertTrue(
                    inward_clear,
                    f"Altar {index} at ({ux}, {uy}) lacks walkable clearance within 170 cm on trail side",
                )


if __name__ == "__main__":
    unittest.main()
