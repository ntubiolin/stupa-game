"""Measure the actual scene triangles along both edges of the pilgrim's stair lane."""
from collections import defaultdict
from math import floor
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "Tools"))
from tibet_landscapes import landscape
from tibet_passages import passages, lanterns, route_sockets


class VerticalTraces:
    def __init__(self, scene):
        self.bins = defaultdict(list)
        for material in scene.meshes.values():
            for stream in material.values():
                for i in range(0, len(stream), 3):
                    a, b, c = [(v[0][0], -v[0][2], v[0][1]) for v in stream[i:i + 3]]
                    determinant = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1])
                    if abs(determinant) < 1.e-6:
                        continue
                    for x in range(max(-9, floor(min(a[0],b[0],c[0]))), min(10, floor(max(a[0],b[0],c[0])))+1):
                        for y in range(max(10,floor(min(a[1],b[1],c[1]))), min(37,floor(max(a[1],b[1],c[1])))+1):
                            self.bins[x,y].append((a,b,c,determinant))

    def hits(self, x, y):
        hits = []
        for a,b,c,det in self.bins[floor(x),floor(y)]:
            u = ((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1])) / det
            v = ((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1])) / det
            if min(u,v,1-u-v) >= -1.e-7:
                hits.append(u*a[2]+v*b[2]+(1-u-v)*c[2])
        return hits


class PassageGeometry(unittest.TestCase):
    def test_walkable_floors_and_shelter(self):
        for stage in ("chimphu", "pharping", "yarlung", "terma1", "terma2", "terma3"):
            scene = landscape(stage)
            traces = VerticalTraces(scene)
            for p in passages(stage):
                sections = [(p.start+(i+.5)*p.depth,p.base+(i+1)*p.rise) for i in range(p.steps)]
                sections += [(p.front+u,p.floor) for u in (.3,1.35,2.1,p.landing-.48)]
                for y,z in sections:
                    for dx in (-.62,0,.62):
                        with self.subTest(stage=stage, east=p.east+dx, north=y, floor=z):
                            hits = traces.hits(p.east+dx,y)
                            self.assertTrue(any(abs(h-z) < .025 for h in hits), hits)
                            self.assertFalse(any(z+.04 < h < z+1.9 for h in hits), hits)
                            if y > p.front+.5:
                                self.assertTrue(any(z+2 < h < z+6 for h in hits), hits)
            for name,(x,y,z) in route_sockets(stage).items():
                with self.subTest(stage=stage,socket=name):
                    self.assertTrue(any(abs(h-z)<.025 for h in traces.hits(x,y)))
                    self.assertGreater(z,1)
            for (x,y,z), _, _ in lanterns(stage):
                wick = scene.meshes["CavePassages"]["lampFlame"]
                self.assertTrue(any(abs(a[0][0]-x)<.25 and abs(a[0][2]+y)<.25
                                    and z+1.18 <= a[0][1] <= z+1.46 for a in wick))


if __name__ == "__main__":
    unittest.main()
