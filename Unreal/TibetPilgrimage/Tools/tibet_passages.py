"""Authored cave thresholds, level sockets and butter lamps. Coordinates are east, north, up in metres."""

from dataclasses import dataclass
import math


@dataclass(frozen=True)
class Passage:
    east: float
    start: float
    steps: int
    depth: float
    rise: float
    landing: float
    width: float
    base: float = 0

    @property
    def front(self):
        return self.start + self.steps * self.depth

    @property
    def floor(self):
        return self.base + self.steps * self.rise

    def at(self, offset=1.5, side=0):
        return self.east + side, self.front + offset, self.floor


CHIMPHU = Passage(-2.8, 14, 16, .55, .17, 4.8, 4.6)
YANGLESHO = Passage(-.5, 15, 12, .52, .16, 6.6, 6.2)
ASURA = Passage(-.5, YANGLESHO.front + YANGLESHO.landing, 7, .48, .16, 3.9, 4.9, YANGLESHO.floor)
SHELDRAK = Passage(6.8, 13.6, 7, .52, .16, 5.6, 5.6)
VAULT = Passage(4.4, 12.4, 8, .52, .16, 3.7, 3.9)


def passages(stage):
    if stage.startswith("terma"):
        return (VAULT,)
    return {"chimphu": (CHIMPHU,), "pharping": (YANGLESHO, ASURA), "yarlung": (SHELDRAK,)}.get(stage, ())


def offering_sockets():
    for i in range(7):
        yield YANGLESHO.at(.85 + .76 * i, 2.28 if i % 2 else -2.28)


def crystal_sockets():
    for i in range(4):
        yield SHELDRAK.at(1.65 + 2.1 * (i // 2), -1.48 if i % 2 == 0 else 1.48)


def route_sockets(stage):
    if stage == "chimphu":
        return {"Step1": CHIMPHU.at(), "Gate": CHIMPHU.at()}
    if stage.startswith("terma"):
        return {"Gate": VAULT.at()}
    if stage == "pharping":
        sockets = {"Step4": YANGLESHO.at(), "Step10": ASURA.at(), "Step11": ASURA.at(1.9)}
        sockets.update({f"Step{i}": YANGLESHO.at(3.5) for i in (6, 9, 12)})
        sockets.update({f"Step5_{i}": p for i, p in enumerate(offering_sockets())})
        return sockets
    if stage == "yarlung":
        return {"Step2": SHELDRAK.at(), **{f"Step3_{i}": p for i, p in enumerate(crystal_sockets())}}
    return {}


def lanterns(stage):
    """Position of the bronze stand, azimuth (UE yaw) and finite reach in metres."""
    if stage.startswith("terma"):
        return [((side * 4.7, north, 0), -side * 90 + 13, 15)
                for side, north in [(-1, -23), (1, -15), (-1, -7), (1, 1), (-1, 9), (1, 12), (-1, 21), (1, 29)]]
    return [(p.at(p.landing - 1, -p.width / 2 + .67), 94, 7.5) for p in passages(stage)]


def oil_lamp(s, point, lit=True):
    x, y, z = point
    s.rings("stone", x, y, z, [(0, .43), (.12, .45), (.18, .33), (.84, .22), (.92, .37)], 10)
    s.rings("bronze", x, y, z + .92, [(0, .18), (.10, .32), (.19, .40), (.24, .39)], 24)
    s.rings("gold", x, y, z + 1.16, [(0, .35), (.03, .34)], 24)
    if lit:
        for dx, dy in [(-.13, -.07), (.11, -.05), (.02, .12)]:
            s.rings("lampFlame", x + dx, y + dy, z + 1.19,
                    [(0, .048), (.075, .076), (.15, .048), (.26, 0)], 9)


def threshold(s, p, open_back):
    # Solid overlapping treads have the same top surface as their landing.
    for i in range(p.steps):
        s.box("stone", p.east, p.start + (i + .5) * p.depth, 0,
              p.width, p.depth + .008, p.base + (i + 1) * p.rise)
    s.box("shale", p.east, p.front + p.landing / 2, 0, p.width, p.landing, p.floor)
    for side in (-1, 1):
        s.box("shale", p.east + side * p.width / 2, p.front + p.landing / 2,
              p.floor, .56, p.landing + .32, 3.9)
    # Rough voussoirs stand proud of the mouth. The soffit leaves a full-height walk-through.
    for i in range(9):
        a = i * math.pi / 9
        b = (i + 1) * math.pi / 9
        outer = p.width / 2 + .30
        inner = p.width / 2 - .27
        def corner(r, angle, y):
            return p.east + r * math.cos(angle), y, p.floor + 2.25 + r * .59 * math.sin(angle)
        v = [corner(r, a0, y) for y in (p.front - .18, p.front + .45)
             for r, a0 in ((inner, a), (outer, a), (outer, b), (inner, b))]
        for f in [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (3, 2, 6, 7), (3, 7, 4, 0), (1, 5, 6, 2)]:
            s.face("stone", [v[j] for j in f])
    s.box("shale", p.east, p.front + p.landing / 2, p.floor + 3.87,
          p.width + .95, p.landing + .52, .85)
    if not open_back:
        s.box("shale", p.east, p.front + p.landing, p.floor, p.width + .55, .55, 4.0)


def build_passages(s, stage):
    if not passages(stage):
        return
    s.group = "CavePassages"
    for p in passages(stage):
        threshold(s, p, p is YANGLESHO)
    for point, _, _ in lanterns(stage):
        oil_lamp(s, point)
    if stage == "pharping":
        for point in offering_sockets():
            oil_lamp(s, point, lit=False)
    if stage == "yarlung":
        for x, y, z in crystal_sockets():
            s.rings("ice", x, y, z, [(0, .31), (.13, .37), (1.32, .24), (1.8, 0)], 6)
