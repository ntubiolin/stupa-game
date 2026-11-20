"""Reference-informed landmarks, ridge surfaces and walkable landscapes for the eleven stages."""

import math
import random

from tibet_mesh import Scene, noise, normal


MAPS = (
    "stupa",
    "grove",
    "wild",
    "pharping",
    "mangyul",
    "yarlung",
    "samye",
    "chimphu",
    "terma1",
    "terma2",
    "terma3",
)
FLAG_COLORS = ("blue", "lime", "red", "green", "yellow")
TAU = 2 * math.pi


def flags(s, a, b, count, sag):
    def location(t):
        return tuple(
            a[k] * (1 - t) + b[k] * t - (sag * 4 * t * (1 - t) if k == 2 else 0) for k in range(3)
        )

    for i in range(count):
        p, q = location(i / count), location((i + 1) / count)
        s.beam("dark", p, q, 0.018, 4)
        end = location((i + 0.85) / count)
        length = min(0.88, math.dist(p, q) * 1.25)
        fold = (end[0] + 0.12, end[1] + 0.17, end[2] - length * 0.85)
        s.face(FLAG_COLORS[i % 5], [p, end, fold, (p[0] + 0.08, p[1] + 0.24, p[2] - length)])


def slope_roof(s, x, y, z, w, d, h):
    # Slight sweep at each corner and a projecting ridge with end ornaments.
    for facing in (-1, 1):
        for i in range(12):
            edges = []
            for k in (i, i + 1):
                u = k / 12 * 2 - 1
                eave = (x + u * w / 2, y + facing * d / 2, z + 0.65 * abs(u) ** 6)
                middle = (x + u * w * 0.42, y + facing * d * 0.26, z + 0.31 * h + 0.25 * abs(u) ** 4)
                ridge = (x + u * w * 0.29, y, z + h)
                edges.append((eave, middle, ridge))
            for j in (0, 1):
                quad = [edges[0][j], edges[1][j], edges[1][j + 1], edges[0][j + 1]]
                s.face("gold", quad if facing < 0 else quad[::-1])
            s.beam("bronze", edges[0][0], edges[0][1], 0.048, 5)
            s.beam("bronze", edges[0][1], edges[0][2], 0.048, 5)
            s.beam("maroon", edges[0][0], edges[1][0], 0.13, 6)
    for sign in (-1, 1):
        apex = (x + sign * w * 0.29, y, z + h)
        corners = [(x + sign * w * 0.5, y + j * d * 0.5, z + 0.65) for j in (-1, 1)]
        s.face("gold", [apex, *corners] if sign < 0 else [apex, *reversed(corners)])
        for q in corners:
            s.beam("gold", apex, q, 0.095)
        s.rings("gold", *apex, [(0, 0.08), (0.25, 0.22), (0.52, 0)], 12)
    s.beam("bronze", (x - w * 0.29, y, z + h), (x + w * 0.29, y, z + h), 0.15)


def house(s, x, y, z, w, d, h, body="lime", temple=False):
    s.box("stone", x, y, z, w + 0.25, d + 0.25, 0.4)
    s.box(body, x, y, z + 0.4, w, d, h - 0.4)
    for a, b, t, m in (
        (0.03, 0.22, 0.21, "dark"),
        (0.24, 0.50, 0.19, "maroon"),
        (0.43, 0.30, 0.13, "ochre"),
    ):
        s.box(m, x, y, z + h + a, w + b, d + b, t)
    # Each opening has a deep black surround, clay sill, painted lintel and a fine cross mullion.
    levels = max(1, int(h / 3.0))
    for floor in range(levels):
        hei = z + 0.9 + floor * 2.8
        for front in (-1, 1):
            fy = y + front * (d / 2 + 0.03)
            for i in range(max(1, int(w / 2.7))):
                n = max(1, int(w / 2.7))
                fx = x + ((i + 0.5) / n - 0.5) * w
                s.box("dark", fx, fy, hei, 1.02, 0.15, 1.38)
                s.box("glass", fx, fy + front * 0.09, hei + 0.13, 0.78, 0.04, 1.13)
                s.box("wood", fx, fy + front * 0.15, hei + 0.12, 0.06, 0.05, 1.16)
                s.box("wood", fx, fy + front * 0.15, hei + 0.79, 0.78, 0.05, 0.065)
                s.box("maroon", fx, fy, hei + 1.36, 1.30, 0.36, 0.14)
                s.box("ochre", fx, fy, hei - 0.08, 1.16, 0.22, 0.11)
    s.box("dark", x, y - d / 2 - 0.11, z + 0.04, 1.30, 0.24, 2.02)
    s.box("wood", x, y - d / 2 - 0.25, z + 0.08, 1.04, 0.07, 1.86)
    if temple:
        slope_roof(s, x, y, z + h + 0.55, w + 1.4, d + 1.4, max(1.2, min(3.2, w * 0.17)))


def chorten(s, x, y, z, h=3):
    r = h * 0.22
    for i in range(3):
        s.box("lime", x, y, z + h * 0.065 * i, r * (2.8 - 0.23 * i), r * (2.8 - 0.23 * i), h * 0.065)
    s.rings(
        "lime",
        x,
        y,
        z + h * 0.19,
        [
            (0, r * 0.98),
            (0.06 * h, r * 0.81),
            (0.19 * h, r * 1.03),
            (0.28 * h, r * 0.96),
            (0.35 * h, r * 0.55),
        ],
        24,
    )
    s.box("red", x, y, z + h * 0.54, r * 1.1, r * 1.1, 0.08 * h)
    for i in range(7):
        rr = r * (0.55 - 0.057 * i)
        s.rings("bronze", x, y, z + h * (0.62 + i * 0.044), [(0, rr), (0.044 * h, rr * 0.75)], 16)
    s.rings(
        "gold",
        x,
        y,
        z + h * 0.92,
        [(0, r * 0.47), (0.02 * h, r * 0.52), (0.05 * h, r * 0.08), (0.10 * h, 0)],
        20,
    )


def boudha(s):
    x, y = 0, 34
    # The east/west and north/south cross terraces leave a circular ambulatory at the base.
    for i in range(3):
        span = 33 - i * 3.2
        for w, d in ((span, span * 0.69), (span * 0.69, span)):
            s.box("lime", x, y, 0.68 * i, w, d, 0.67)
            s.box("ochre", x, y, 0.68 * i + 0.04, w + 0.05, d + 0.05, 0.09)
    R = 11.9
    profile = [(R * math.sin(t * math.pi / 36), R * math.cos(t * math.pi / 36)) for t in range(19)]
    s.rings("lime", x, y, 2.02, profile, 96)
    for i in range(64):
        a = i * TAU / 64
        u, v = x + 16.6 * math.sin(a), y + 16.6 * math.cos(a)
        s.box("stone", u, v, 0, 1.65, 0.55, 0.24, -a)
        s.box("red", u, v, 0.24, 1.66, 0.40, 0.89, -a)
        s.box("lime", u, v, 1.13, 1.7, 0.55, 0.20, -a)
        for j in (-0.51, 0, 0.51):
            s.rings(
                "bronze",
                u + 0.23 * math.sin(a) + j * math.cos(a),
                v + 0.23 * math.cos(a) - j * math.sin(a),
                0.39,
                [(0, 0.14), (0.06, 0.19), (0.51, 0.19), (0.58, 0.14)],
                12,
            )
    # Harmika, eyes and thirteen stepped spire rings.
    h = 13.48
    s.box("lime", x, y, h, 4.7, 4.7, 3.15)
    for base in (h, h + 2.99):
        s.box("gold", x, y, base, 5.11, 5.11, 0.20)
    for face in range(4):
        angle = face * math.pi / 2

        def pt(t, u, layer=0):
            return (
                x + t * math.cos(angle) + (2.36 + layer) * math.sin(angle),
                y + t * math.sin(angle) - (2.36 + layer) * math.cos(angle),
                h + u,
            )

        for sign in (-1, 1):
            for offset, thickness, style in ((0, 0.063, "blue"), (0.47, 0.078, "dark")):
                for j in range(9):
                    t1 = j / 9
                    t2 = (j + 1) / 9

                    def arc(t):
                        return pt(
                            sign * (0.17 + t * 1.84),
                            1.71 + offset + 0.26 * math.sin(math.pi * t) + 0.08 * t,
                            0.04,
                        )

                    s.beam(style, arc(t1), arc(t2), thickness, 6)
            for j in range(7):
                s.beam(
                    "blue",
                    pt(sign * (0.17 + j / 7 * 1.84), 1.71 - 0.18 * math.sin(j / 7 * math.pi), 0.04),
                    pt(
                        sign * (0.17 + (j + 1) / 7 * 1.84),
                        1.71 - 0.18 * math.sin((j + 1) / 7 * math.pi),
                        0.04,
                    ),
                    0.043,
                    5,
                )
            s.beam("glass", pt(sign * 1.02, 1.74, 0), pt(sign * 1.02, 1.74, 0.13), 0.20, 16)
        pts = [
            pt(0.24, 0.45, 0.05),
            pt(-0.18, 0.68, 0.05),
            pt(-0.22, 1.02, 0.05),
            pt(0.12, 1.11, 0.05),
            pt(0.19, 1.31, 0.05),
        ]
        for a, b in zip(pts, pts[1:]):
            s.beam("ochre", a, b, 0.054, 6)
    for i in range(13):
        r = 2.5 - i * 0.151
        s.rings(
            "gold",
            x,
            y,
            h + 3.19 + i * 0.53,
            [(0, r), (0.12, r), (0.48, r * 0.84), (0.53, r * 0.82)],
            48,
        )
    z = h + 10.08
    s.rings(
        "gold",
        x,
        y,
        z,
        [(0, 0.48), (0.25, 1.48), (0.47, 1.74), (0.59, 1.59), (0.81, 0.52), (1.22, 0.25), (1.7, 0)],
        48,
    )
    for i in range(12):
        a = TAU * i / 12
        flags(
            s,
            (x + 0.25 * math.cos(a), y + 0.25 * math.sin(a), z + 0.2),
            (x + 17.8 * math.cos(a), y + 17.8 * math.sin(a), 2),
            22,
            1.0,
        )
    for i in range(17):
        a = i * TAU / 17
        u, v = x + 30 * math.cos(a), y + 30 * math.sin(a)
        if abs(u) < 14 and v < y:
            continue
        house(s, u, v, 0, 6.2, 5.4, 4.4 + (i % 3) * 0.8, ("lime", "ochre", "red")[i % 3])


def tree(s, x, y, z, h, seed, conifer):
    rng = random.Random(seed)
    s.rings("wood", x, y, z, [(0, h * 0.039), (h * 0.62, h * 0.026), (h * 0.97, 0.025)], 9)
    if conifer:
        for j in range(6):
            zz = z + h * (0.16 + j * 0.12)
            r = h * (0.205 - j * 0.025)
            s.rings(
                "pine" if j < 4 else "leaf",
                x,
                y,
                zz,
                [(0, r * 0.37), (0.11 * r, r), (0.43 * r, r * 0.86), (0.35 * h, r * 0.06)],
                13,
                1,
                0.36,
                j * 0.62,
            )
    else:
        for j in range(7):
            a = j * 2.4 + rng.uniform(-0.4, 0.4)
            r = h * (0.16 if j != 0 else 0.02)
            vx, vy = x + r * math.cos(a), y + r * math.sin(a)
            zz = z + h * (0.49 + 0.32 * rng.random())
            s.beam("wood", (x, y, z + h * 0.31), (vx, vy, zz), h * 0.021, 6)
            rr = h * (0.13 + 0.06 * rng.random())
            s.rings(
                "leaf" if j % 3 else "pine",
                vx,
                vy,
                zz,
                [(0, rr * 0.65), (0.63 * rr, rr), (1.2 * rr, 0.77 * rr), (1.6 * rr, 0.11 * rr)],
                12,
                0.87,
                0.38,
                a,
            )


def rock(s, x, y, z, r, h, seed, mat="shale"):
    s.rings(
        mat,
        x,
        y,
        z,
        [(0, r * 0.75), (0.16 * h, r), (0.64 * h, r * 0.91), (0.9 * h, r * 0.61), (h, r * 0.26)],
        9,
        0.72,
        0.52,
        seed * 0.91,
    )


def hermitage(s, rng):
    for i in range(25):
        x = (i % 7 - 3) * 7 + rng.uniform(-2, 2)
        y = 31 + (i // 7) * 6 + rng.uniform(-2, 2)
        h = (y - 20) * 0.7 + rng.uniform(2, 7)
        rock(s, x, y, 0, 5.5, h, i, "stone" if i % 4 else "shale")
    for i, (x, y, z) in enumerate(
        ((-14, 20, 0), (12, 21, 0), (-9, 27, 3.6), (9, 30, 6.2), (3, 36, 9.7), (-17, 36, 9))
    ):
        house(s, x, y, z, 5, 3.8, 2.7, "lime", i == 4)
        chorten(s, x + 3, y - 2, z, 2.05)
    for j in range(35):
        x = -3 + 5.6 * math.sin(j / 9)
        s.box("stone", x, 15 + j * 0.52, j * 0.16, 2.3, 0.66, 0.19)
    flags(s, (-16, 24, 7), (15, 30, 10), 30, 3)


def pharping(s):
    for j in range(17):
        x = (j - 8) * 3.2
        rock(s, x, 39 + math.sin(j * 0.9) * 2, 0, 5, 12 + 4 * math.cos(j * 0.66), j)
    house(s, -10, 25, 0, 10, 6, 6.4, "ochre", True)
    house(s, 8, 30, 0, 7, 4.8, 4.65, "red", True)
    # Rock lintel and a genuine doorway between retaining walls.
    s.box("dark", -0.5, 35, 0, 4, 0.6, 4.9)
    for j in (-1, 1):
        s.box("lime", -0.5 + j * 2, 32.6, 0, 1.5, 4.9, 4.8)
        s.box("red", -0.5 + j * 2, 32.55, 4.75, 1.8, 4.85, 0.39)
    s.box("stone", -0.5, 33.8, 5, 5.9, 4.4, 1.1)
    for k in range(13):
        s.box("stone", -0.5, 15 + k * 0.68, 0, 3.9, 0.75, 0.13 * (k + 1))
    s.rings("water", -10, 13, 0.045, [(0, 3.2), (0.02, 3.2)], 40, 0.67)
    flags(s, (-15, 25, 9), (11, 30, 8), 25, 2)


def peak_palace(s):
    # Palace has a long low hall adjoining a taller narrow watchtower on one ridge spur.
    for i, (r, h) in enumerate(((14, 3.4), (10.8, 4.5), (8.4, 3.1))):
        z = (0, 3.4, 7.9)[i]
        s.rings("stone", -2, 35, z, [(0, r), (h * 0.63, r * 0.84), (h, r * 0.70)], 19, 0.67, 0.22, 0.36)
    house(s, -3.5, 35, 10.8, 8.3, 5.8, 4.5, "lime", True)
    house(s, 2.5, 35, 10.6, 4.8, 4.6, 10.7, "lime", True)
    for j in range(29):
        t = j / 28
        s.box("stone", -11 + 5 * t, 17 + t * 14, t * 5.7, 1.9, 0.68, 0.21)
    for i in range(6):
        s.box("grass", -19 - i * 1.7, 11 + i * 3, 0.04, 9, 2.4, 0.04)
    for j in range(9):
        s.box("wood", 13, 1 + j * 0.91, 0.9, 2.65, 0.88, 0.18)
    for x in (11.7, 14.3):
        s.beam("wood", (x, 0.6, 1.75), (x, 9, 1.75), 0.078)
        for j in range(5):
            s.box("wood", x, 0.7 + j * 2, 0.4, 0.13, 0.13, 1.4)
    s.box("water", 13, 4, 0.02, 17, 3, 0.02)


def samye(s):
    x, y = 0, 38
    house(s, x, y, 0, 15.6, 13.4, 4.3, "lime")
    house(s, x, y, 4.85, 12.4, 10.5, 3.35, "red")
    house(s, x, y, 8.75, 9, 7.5, 2.85, "ochre", True)
    for dx, dy, col in ((-14, -7, "lime"), (14, -7, "red"), (-14, 8, "shale"), (14, 8, "green")):
        s.rings(
            col, x + dx, y + dy, 0, [(0, 1.45), (0.65, 1.35), (1.4, 0.94), (2.17, 1.2), (2.8, 0.71)], 28
        )
        chorten(s, x + dx, y + dy, 2.74, 2.6)
    for i in range(55):
        a = TAU * i / 55
        u, v = x + 27 * math.sin(a), y + 22 * math.cos(a)
        if v < y and abs(u) < 3.7:
            continue
        s.box("lime", u, v, 0, 3.3, 0.62, 1.5, -a)
        s.box("maroon", u, v, 1.5, 3.3, 0.76, 0.20, -a)
        if i % 2 == 0:
            chorten(s, u, v, 1.7, 0.93)
    for u, v in ((-19, 31), (19, 31), (-17, 45), (17, 45)):
        house(s, u, v, 0, 6.4, 5.7, 3.0, "lime", True)


def camp(s):
    for x in (-13, 13):
        s.beam("wood", (x, 17, 0), (x, 17, 6.6), 0.17, 10)
        for i in range(5):
            r = 1.55 - i * 0.24
            rock(s, x, 17, i * 0.43, r, 0.64, i)
    flags(s, (-13, 17, 6.3), (13, 17, 6.3), 28, 1.68)
    for i in range(3):
        x = 15 + i * 5
        y = 24 - i * 3
        for v in (-1, 1):
            s.face(
                "ochre",
                [
                    (x + v * 2.3, y - 2.2, 0),
                    (x + v * 2.3, y + 2.2, 0),
                    (x, y + 2.2, 3),
                    (x, y - 2.2, 3),
                ],
            )
        for v in (-1, 1):
            s.beam("wood", (x, y + v * 2.3, 0), (x, y + v * 2.3, 3.16), 0.065)
        s.beam("wood", (x, y - 2.4, 3.08), (x, y + 2.4, 3.08), 0.078)
    chorten(s, -15, 27, 0, 4.1)


def grove(s):
    s.rings("paving", 0, 16, 0.01, [(0, 8.9), (0.06, 8.9)], 56)
    for i in range(8):
        x, y = 7.5 * math.cos(TAU * i / 8), 16 + 7.5 * math.sin(TAU * i / 8)
        chorten(s, x, y, 0.065, 2.2 + 0.5 * (i % 3))
    s.rings("bronze", 0, 16, 0.06, [(0, 2.2), (0.19, 2.24), (0.23, 1.93)], 40)
    chorten(s, 0, 16, 0.3, 5.7)
    flags(s, (-11, 21, 5), (11, 21, 5), 24, 1.45)
    for x in (-11, 11):
        s.beam("wood", (x, 21, 0), (x, 21, 5.18), 0.10)


def cave(s, floor):
    style = ("quartz", "ice", "amber")[floor - 1]
    wall = ("shale", "shale", "stone")[floor - 1]
    for side in (-1, 1):
        for j in range(15):
            x = side * (11 + 2 * noise(j, floor))
            y = -29 + j * 4
            rock(s, x, y, -0.25, 3.0 + noise(j, 3), 7.3 + noise(j, 4) * 3, j, wall)
            if j % 2 == 0:
                for i in range(3):
                    r = 0.4 + noise(i, j) * 0.65
                    s.rings(
                        style,
                        x - side * (2 + i * 0.5),
                        y + i * 0.43,
                        0,
                        [(0, r * 0.65), (0.25, r), (2.1 + i * 0.65, r * 0.8), (3.1 + i * 0.73, 0)],
                        6,
                    )
    for k in range(5):
        y = -13 + k * 9
        for side in (-1, 1):
            x = side * 8.8
            s.box(wall, x, y, 0, 1.7, 2.1, 6.4)
            s.box(style, x, y, 5.8, 1.95, 2.34, 0.25)
            for j in range(7):
                a = (j / 7) * math.pi / 2
                b = ((j + 1) / 7) * math.pi / 2
                s.beam(
                    wall,
                    (side * 8.8 * math.cos(a), y, 6.4 + 3.9 * math.sin(a)),
                    (side * 8.8 * math.cos(b), y, 6.4 + 3.9 * math.sin(b)),
                    0.76,
                    8,
                )
        if floor == 3:
            for side in (-1, 1):
                chorten(s, side * 7.5, y + 2, 0, 2)
    if floor == 3:
        for j in range(4):
            s.box("bronze", 0, 24, j * 0.35, 9 - j * 1.3, 9 - j * 1.3, 0.34)
        chorten(s, 0, 24, 1.4, 7.8)
    else:
        for j in range(9):
            x = (j % 3 - 1) * 1.7
            y = 23 + j // 3 * 1.7
            s.rings(
                style,
                x,
                y,
                0,
                [(0, 1), (0.6, 1.27), (4 + noise(j, 0) * 2, 0.93), (5.8 + noise(j, 0) * 2, 0)],
                6,
                1,
                0.17,
                j,
            )
    for j in range(7):
        rock(s, -10 + j * 3.25, 34, 0, 3.9, 10 + math.sin(j), j, wall)


def terrain(s, stage, rng):
    alpine = stage in ("mangyul", "wild", "yarlung", "chimphu")
    cave_map = stage.startswith("terma")
    soil = (
        "shale"
        if cave_map
        else "paving"
        if stage in ("stupa", "samye")
        else "grass"
        if stage in ("grove", "yarlung", "pharping")
        else "earth"
    )
    s.box(soil, 0, 4, -0.56, 132, 136, 0.55)
    if cave_map:
        return
    # A continuous height field keeps the foreground flat around navigation while the mid-ground
    # and the two distant ridgelines catch raking sunlight. Snow follows elevation on alpine maps.
    s.group = "Ridgelines"
    seed = MAPS.index(stage) * 1.9

    def height(x, y):
        radius = math.hypot(x, y - 5)
        blend = min(1, max(0, (radius - 55) / 28))
        if blend == 0:
            return -0.65
        angle = math.atan2(y - 5, x)
        wav = 7 * math.sin(3 * angle + seed) + 5 * math.cos(6 * angle + seed)
        middle = math.exp(-(((radius - 99 - wav) / 28) ** 2))
        far = math.exp(-(((radius - 178 - wav * 1.8) / 31) ** 2))
        variation = (
            0.66
            + 0.22 * math.sin(angle * 5 + seed)
            + 0.17 * math.sin(angle * 11 - 0.2)
            + 0.085 * math.cos(angle * 23 + seed)
            + 0.048 * math.sin(angle * 47)
        )
        return (
            blend * ((53 if alpine else 24) * middle + (101 if alpine else 53) * far) * variation - 0.64
        )

    coords = list(range(-220, 225, 5))
    pts = {(x, y): (x, y, height(x, y)) for x in coords for y in coords}
    norm = {
        (x, y): normal(
            (x - 1, y, height(x - 1, y)), (x + 1, y, height(x + 1, y)), (x, y + 1, height(x, y + 1))
        )
        for x, y in pts
    }
    for x in coords[:-1]:
        for y in coords[:-1]:
            keys = [(x, y), (x + 5, y), (x + 5, y + 5), (x, y + 5)]
            face = [pts[k] for k in keys]
            avg = sum(p[2] for p in face) / 4
            if avg < -0.58:
                continue
            surface = (
                "snow"
                if alpine and avg > 45 + 3 * math.sin(x * 0.16)
                else "shale"
                if avg > 24
                else "grass"
                if stage in ("grove", "pharping", "chimphu")
                else "stone"
            )
            s.face(surface, face, [norm[k] for k in keys], 0.72 + 0.24 * noise(x // 5, y // 5))
    s.group = "Vegetation"
    n = {
        "stupa": 12,
        "grove": 65,
        "wild": 32,
        "pharping": 46,
        "mangyul": 39,
        "yarlung": 21,
        "samye": 15,
        "chimphu": 30,
    }[stage]
    for j in range(n):
        side = -1 if j % 2 else 1
        x = side * rng.uniform(19, 66)
        y = rng.uniform(-40, 57)
        if stage in ("stupa", "samye") and y > 8 and abs(x) < 32:
            continue
        tree(
            s,
            x,
            y,
            max(0, height(x, y)),
            rng.uniform(4.3, 10),
            j,
            stage in ("wild", "mangyul", "chimphu"),
        )
    if stage not in ("stupa", "samye"):
        for j in range(70):
            x = rng.choice((-1, 1)) * rng.uniform(8, 47)
            y = rng.uniform(-32, 41)
            r = rng.uniform(0.24, 1.55)
            rock(s, x, y, -0.06, r, r * 0.63, j, "stone" if j % 3 else "shale")
        for j in range(600):
            x = rng.choice((-1, 1)) * rng.uniform(5.5, 48)
            y = rng.uniform(-30, 42)
            h = rng.uniform(0.22, 0.64)
            for i in range(3):
                dx, dy = rng.uniform(-0.12, 0.12), rng.uniform(-0.12, 0.12)
                s.face(
                    "leaf",
                    [
                        (x + dx, y + dy, 0.01),
                        (x + dx + 0.064, y + dy, 0.01),
                        (x + dx + 0.086, y + dy + 0.063, h),
                    ],
                )
    s.group = "Landmarks"


def landscape(stage):
    s = Scene()
    rng = random.Random(330 + MAPS.index(stage))
    terrain(s, stage, rng)
    if stage == "stupa":
        boudha(s)
    elif stage == "grove":
        grove(s)
    elif stage == "pharping":
        pharping(s)
    elif stage == "samye":
        samye(s)
    elif stage == "yarlung":
        peak_palace(s)
    elif stage == "chimphu":
        hermitage(s, rng)
    elif stage == "mangyul":
        camp(s)
    elif stage == "wild":
        chorten(s, -9, 9, 0, 3.6)
        for j in range(20):
            r = 2.6 + 1.4 * rng.random()
            rock(
                s,
                (-1 if j % 2 else 1) * (6 + j * 0.55),
                21 + j * 0.76,
                0,
                r,
                2.6 + rng.random() * 5.3,
                j,
            )
        for j in range(3):
            chorten(s, 11 + j * 3, 23 + j * 2, 0, 2.5 + j * 0.32)
    else:
        cave(s, int(stage[-1]))
    return s


if __name__ == "__main__":
    import argparse
    from pathlib import Path

    p = argparse.ArgumentParser()
    p.add_argument("output", type=Path)
    p.add_argument("maps", nargs="*")
    args = p.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    cache = {}
    for stage in args.maps or MAPS:
        dest = args.output / (stage + ".glb")
        landscape(stage).write(dest, cache)
        print(f"{stage}: {dest.stat().st_size:,} bytes", flush=True)
