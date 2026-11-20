"""Reference-informed landmarks, ridge surfaces and walkable landscapes for the eleven stages."""

import math
import random
import struct
from pathlib import Path

from boudha_plaza import south_approach
from tibet_passages import build_passages
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


def whitewashed_dome(s, x, y, base, radius, height):
    def shell(a, lat, offset=0):
        c, sn = math.cos(lat), math.sin(lat)
        ca, sa = math.cos(a), math.sin(a)
        n = (c * ca / radius, c * sa / radius, sn / height)
        length = math.sqrt(sum(v * v for v in n))
        n = tuple(v / length for v in n)
        pos = (x + radius * c * ca, y + radius * c * sa, base + height * sn)
        return tuple(p + v * offset for p, v in zip(pos, n)), n

    for row in range(24):
        for side in range(120):
            coords = ((side, row), (side + 1, row), (side + 1, row + 1), (side, row + 1))
            if row == 23:
                coords = coords[:3]
            points, normals = zip(*(shell(a * TAU / 120, b * math.pi / 48) for a, b in coords))
            s.face("whitewash", points, normals)

    # Each throw begins under the harmika, sweeps around a pointed petal,
    # then tapers into a short drip. The white field stays open below the crown.
    for petal in range(16):
        center = (petal + 0.25) * TAU / 16
        tip = 0.57 + 0.14 * noise(petal, 12)
        for side in (-1, 1):
            last = None
            for step in range(23):
                t = step / 22
                lat = 1.25 + (tip - 1.25) * t
                sweep = (0.24 + 0.86 * math.sin(math.pi * t) ** 0.9) * (1 - t**3)
                a = center + side * 0.157 * sweep + 0.013 * math.sin(5 * t + petal)
                width = (0.006 + 0.022 * (1 - t) + 0.006 * math.sin(math.pi * t)) * (
                    0.86 + 0.28 * noise(petal * 3 + side, step)
                )
                pair = (shell(a - width, lat, 0.034), shell(a + width, lat, 0.034))
                if last:
                    pts, norms = zip(last[0], pair[0], pair[1], last[1])
                    s.face("turmeric", pts, norms, 0.91 + 0.09 * noise(step, petal))
                last = pair
        a = center + 0.013 * math.sin(5 + petal)
        stroke = [
            shell(a - 0.007, tip, 0.036),
            shell(a + 0.002, tip - 0.035 - 0.068 * noise(8, petal), 0.036),
            shell(a + 0.007, tip, 0.036),
        ]
        pts, norms = zip(*stroke)
        s.face("turmeric", pts, norms)


def mandala_terrace(s, x, y, z, half, height):
    # One stepped outline avoids coincident top faces where cross-shaped slabs meet.
    edge = (
        (-0.72, -0.72),
        (-0.37, -0.72),
        (-0.37, -0.87),
        (-0.23, -0.87),
        (-0.23, -1),
        (0.23, -1),
        (0.23, -0.87),
        (0.37, -0.87),
        (0.37, -0.72),
    )
    outline = []
    for turn in range(4):
        for a, b in edge:
            for _ in range(turn):
                a, b = -b, a
            outline.append((a, b))

    profile = [
        (0, 1),
        (0.12, 0.995),
        (height - 0.23, 0.99),
        (height - 0.15, 1.005),
        (height - 0.06, 1.006),
        (height, 0.996),
    ]
    rows = [
        [(x + a * half * scale, y + b * half * scale, z + dz) for a, b in outline]
        for dz, scale in profile
    ]
    for mat, lower, upper in zip(
        ("ochre", "whitewash", "turmeric", "giltpaint", "whitewash"), rows, rows[1:]
    ):
        for i in range(len(outline)):
            j = (i + 1) % len(outline)
            s.face(mat, [lower[i], lower[j], upper[j], upper[i]])
    for i, p in enumerate(rows[-1]):
        s.face("whitewash", [(x, y, z + height), p, rows[-1][(i + 1) % len(outline)]])


def boudha_eyes(s, x, y, h):
    for face in range(4):
        ca, sa = math.cos(face * math.pi / 2), math.sin(face * math.pi / 2)

        def paint(mat, coords, depth):
            area = sum(a * d - b * c for (a, b), (c, d) in zip(coords, coords[1:] + coords[:1]))
            pts = [
                (x + t * ca + (2.64 + depth) * sa, y + t * sa - (2.64 + depth) * ca, h + u)
                for t, u in coords
            ]
            s.face(mat, pts if area > 0 else pts[::-1])

        def dot(mat, tx, ty, rx, ry, depth):
            paint(
                mat,
                [
                    (tx + rx * math.cos(i * TAU / 24), ty + ry * math.sin(i * TAU / 24))
                    for i in range(24)
                ],
                depth,
            )

        for sign in (-1, 1):
            for j in range(24):
                top, base, brow = [], [], []
                for t in (j / 24, (j + 1) / 24):
                    arc = math.sin(math.pi * t)
                    tx = sign * (0.23 + 2.06 * t)
                    mid = 1.73 + 0.20 * t + 0.04 * arc
                    base.append((tx, mid - 0.25 * arc - 0.02))
                    top.append((tx, mid + 0.28 * arc + 0.02))
                    brow.append((tx, mid + 0.50 + 0.28 * math.sin(math.pi * (t**0.72))))
                paint("whitewash", [*base, *top[::-1]], 0.015)
                paint("lapis", [*base, *((a, b - 0.073) for a, b in base[::-1])], 0.022)
                paint("vermillion", [*top, *((a, b + 0.127) for a, b in top[::-1])], 0.022)
                paint("dark", [*top, *((a, b + 0.055) for a, b in top[::-1])], 0.026)
                paint(
                    "lapis",
                    [
                        *brow,
                        *(
                            (a, b + 0.055 + 0.09 * math.sin(math.pi * t))
                            for (a, b), t in zip(brow[::-1], ((j + 1) / 24, j / 24))
                        ),
                    ],
                    0.024,
                )
            dot("giltpaint", sign * 1.15, 1.89, 0.235, 0.243, 0.030)
            dot("dark", sign * 1.15, 1.89, 0.170, 0.191, 0.037)
            dot("whitewash", sign * 1.15 - 0.056, 1.96, 0.045, 0.046, 0.043)

        # Painted curl of the Nepali 'one', tapered at the foot.
        curl = [
            (0.07, 1.40),
            (0.21, 1.43),
            (0.26, 1.54),
            (0.18, 1.63),
            (0.02, 1.60),
            (-0.08, 1.46),
            (-0.04, 1.32),
            (0.10, 1.20),
            (0.02, 1.09),
            (-0.18, 0.96),
            (-0.23, 0.77),
            (-0.13, 0.61),
            (0.15, 0.47),
        ]
        for i, (p, q) in enumerate(zip(curl, curl[1:])):
            width = 0.041 + 0.022 * math.sin(math.pi * i / (len(curl) - 1))
            paint(
                "lapis",
                [
                    (p[0] - width, p[1]),
                    (q[0] - width, q[1]),
                    (q[0] + width, q[1]),
                    (p[0] + width, p[1]),
                ],
                0.030,
            )
        dot("vermillion", 0, 2.89, 0.17, 0.19, 0.022)
        dot("giltpaint", 0, 2.90, 0.071, 0.082, 0.027)


def boudha_flags(s, x, y, harmika_top, canopy):
    colors = ("indigoCloth", "whiteCloth", "redCloth", "greenCloth", "yellowCloth")
    for line in range(24):
        upper = line % 2 == 0
        corner, strand = divmod(line, 6)
        # Garlands divide into four corner fans. The entrance to the south
        # remains open all the way from the outer wheel walk to the painted eyes.
        corner_angle = math.radians((-135, -45, 45, 135)[corner])
        fan_center = (-150, -13, 50, 135)[corner]
        a = math.radians(fan_center + (-17, -10, -3, 3, 10, 17)[strand])
        ca, sa = math.cos(a), math.sin(a)
        anchor_radius = 0.88 if upper else 3.94
        start_x = x + anchor_radius * math.cos(corner_angle)
        start_y = y + anchor_radius * math.sin(corner_angle)
        z0 = canopy + 0.30 if upper else harmika_top + 0.04
        end_height = 2.65 + 0.24 * (line % 3)
        count = 31 if upper else 23

        def position(t):
            sag = (1.70 if upper else 1.15) * 4 * t * (1 - t)
            return (
                start_x + (x + 17.55 * ca - start_x) * t,
                start_y + (y + 17.55 * sa - start_y) * t,
                z0 + (end_height - z0) * t - sag,
            )

        # Faceted cord with a continuous curve, alternating upper and lower festoons.
        for k in range(8):
            s.beam("bronze", position(k / 8), position((k + 1) / 8), 0.013, 4)
        end = position(1)
        s.beam("wood", (end[0], end[1], 0.05), end, 0.049, 7)
        # Leave a bare leader at each knot where the six cords gather.
        for k in range(3 if upper else 2, count):
            length = 0.36 + 0.24 * noise(line, k)
            curl = 0.11 * math.sin(1.3 * k + line)
            start = (k + 0.08) / count
            width = (0.62 + 0.11 * noise(k, line + 49)) / count
            top = [position(start + f * width) for f in (0, 0.5, 1)]
            bottom = []
            for j, p in enumerate(top):
                # A breeze billows the centre of the cloth away from its tether.
                wind = (0.21, 0.34, 0.24)[j] + curl
                bottom.append(
                    (
                        p[0] + wind - sa * curl,
                        p[1] + 0.13 + ca * curl,
                        p[2] - length + 0.038 * math.cos(k + j),
                    )
                )
            for j in range(2):
                s.face(
                    colors[(line + k) % 5],
                    [top[j], top[j + 1], bottom[j + 1], bottom[j]],
                    uvs=[(j / 2, 0), ((j + 1) / 2, 0), ((j + 1) / 2, 1), (j / 2, 1)],
                )


def boudha_townhouse(s, x, y, angle, index, width):
    # The street facade faces the kora, with taller brick houses behind an open shop gallery.
    yaw = angle - math.pi / 2
    ca, sa = math.cos(yaw), math.sin(yaw)
    depth = 4.50
    front = -depth / 2
    storeys = (3, 2, 3, 3, 2, 4, 2)[index % 7]
    floor_height = 2.48 + 0.12 * (index % 3)
    height = storeys * floor_height
    body = ("red", "lime", "ochre", "red", "giltpaint", "lime")[index % 6]

    def box(mat, tx, ty, z, w, d, h):
        s.box(mat, x + tx * ca - ty * sa, y + tx * sa + ty * ca, z, w, d, h, yaw)

    box("stone", 0, 0, 0, width, depth, 0.36)
    box(body, 0, 0, 0.36, width - 0.10, depth - 0.06, height - 0.36)
    bay = (width - 0.64) / 3
    for j in range(3):
        tx = (j - 1) * bay
        box("dark", tx, front, 0.28, bay - 0.36, 0.14, 1.83)
        box("wood", tx, front - 0.08, 0.30, bay - 0.56, 0.10, 1.68)
        box("bronze", tx, front - 0.14, 0.30, 0.055, 0.05, 1.64)
    for level in range(1, storeys):
        z = level * floor_height
        box("wood", 0, front, z, width, 0.25, 0.13)
        for j in (-1, 0, 1):
            tx = j * bay
            w = min(1.75, bay - 0.40) * (1 if j else 1.14)
            offset = -0.22 if j == 0 else -0.08
            fy = front + offset
            box("wood", tx, fy, z + 0.43, w, 0.36, 1.47)
            box("glass", tx, fy - 0.19, z + 0.57, w - 0.24, 0.055, 1.16)
            for post in (-0.21, 0.21):
                box("wood", tx + w * post, fy - 0.24, z + 0.55, 0.065, 0.07, 1.20)
            box("wood", tx, fy - 0.24, z + 1.36, w - 0.14, 0.075, 0.07)
            box("dark", tx, fy, z + 0.39, w + 0.18, 0.46, 0.10)
            box("maroon", tx, fy, z + 1.87, w + 0.28, 0.52, 0.12)
    # Upper roof cap and a few timber galleries under shallow canvas canopies.
    box("wood", 0, 0, height - 0.12, width + 0.12, depth + 0.12, 0.15)
    box("ochre", 0, 0, height, width + 0.30, depth + 0.32, 0.16)
    box(body, 0, front + 0.13, height + 0.14, width, 0.24, 0.41)
    box("giltpaint", 0, front + 0.13, height + 0.52, width + 0.09, 0.31, 0.08)
    if index % 3 != 1:
        box(
            ("maroon", "green", "ochre")[index % 3], 0, front - 0.30, 2.12, width - 0.28, 0.67, 0.14
        )
        for tx in (-0.45 * width, 0.45 * width):
            box("wood", tx, front - 0.51, 0.30, 0.12, 0.12, 1.83)


def boudha(s):
    x, y = 0, 34
    z = 0
    for half, height in ((15.1, 1.50), (13.32, 1.40), (11.55, 1.24)):
        mandala_terrace(s, x, y, z, half, height)
        z += height
    for dx in (-1, 1):
        for dy in (-1, 1):
            chorten(s, x + 10.28 * dx, y + 10.28 * dy, 1.50, 2.65)
    for face in range(4):
        a = face * math.pi / 2
        ca, sa = math.cos(a), math.sin(a)
        for half, zbase, height in ((15.1, 0, 1.5), (13.32, 1.5, 1.40), (11.55, 2.90, 1.24)):
            for step in range(6):
                run = 1.44 * (1 - step / 6)
                r = half + run / 2 - 0.015
                s.box(
                    "whitewash",
                    x + sa * r,
                    y - ca * r,
                    zbase,
                    2.02,
                    run,
                    height * (step + 1) / 6,
                    a,
                )
            for offset in (-0.53, 0.53):
                t, r = half * offset, half * 0.718
                s.box(
                    "vermillion",
                    x + t * ca + r * sa,
                    y + t * sa - r * ca,
                    zbase + height * 0.28,
                    0.60,
                    0.10,
                    height * 0.43,
                    a,
                )
    s.rings("whitewash", x, y, z, [(0, 10.67), (0.14, 10.72), (0.40, 10.50)], 96)
    s.rings("giltpaint", x, y, z + 0.40, [(0, 10.53), (0.13, 10.52), (0.18, 10.36)], 96)
    whitewashed_dome(s, x, y, z + 0.56, 10.36, 8.15)

    # Recessed wheel bays follow the existing circular ambulatory.
    for i in range(64):
        a = i * TAU / 64
        sa, ca = math.sin(a), math.cos(a)
        u, v = x + 16.6 * sa, y + 16.6 * ca
        s.box("stone", u, v, 0, 1.65, 0.55, 0.28, -a)
        s.box("maroon", u, v, 0.27, 1.66, 0.34, 0.92, -a)
        s.box("whitewash", u, v, 1.14, 1.70, 0.60, 0.20, -a)
        s.box("giltpaint", u, v, 1.34, 1.70, 0.64, 0.065, -a)
        for offset in (-0.51, 0, 0.51):
            wx, wy = u + 0.30 * sa + offset * ca, v + 0.30 * ca - offset * sa
            s.rings(
                "bronze",
                wx,
                wy,
                0.35,
                [
                    (0, 0.065),
                    (0.08, 0.065),
                    (0.13, 0.18),
                    (0.17, 0.205),
                    (0.65, 0.205),
                    (0.70, 0.18),
                    (0.74, 0.065),
                ],
                10,
            )
            for h in (0.57, 0.91):
                s.rings("giltpaint", wx, wy, h, [(0, 0.211), (0.045, 0.211)], 10)

    h = 12.18
    s.box("whitewash", x, y, h - 0.18, 5.85, 5.85, 0.37)
    s.box("vermillion", x, y, h + 0.16, 5.54, 5.54, 0.11)
    s.box("giltpaint", x, y, h + 0.24, 5.28, 5.28, 3.49)
    boudha_eyes(s, x, y, h)
    s.box("gold", x, y, h + 3.51, 5.47, 5.47, 0.12)
    s.box("vermillion", x, y, h + 3.63, 5.61, 5.61, 0.14)
    s.box("gold", x, y, h + 3.77, 5.84, 5.84, 0.16)
    spire = h + 3.93
    for i in range(13):
        r = (2.60 - i * 0.158) * math.sqrt(2)
        s.rings(
            "gold",
            x,
            y,
            spire + i * 0.65,
            [(0, r), (0.09, r * 1.01), (0.20, r * 0.985), (0.61, r * 0.87), (0.65, r * 0.86)],
            4,
            angle=math.pi / 4,
        )
    z = spire + 13 * 0.65
    s.rings(
        "gold",
        x,
        y,
        z,
        [
            (0, 0.48),
            (0.21, 0.51),
            (0.37, 1.45),
            (0.48, 1.79),
            (0.61, 1.78),
            (0.68, 1.58),
            (0.88, 0.65),
            (1.01, 0.38),
        ],
        48,
    )
    s.rings("giltpaint", x, y, z + 0.40, [(0, 1.68), (0.07, 1.82), (0.11, 1.80)], 48)
    s.rings(
        "gold", x, y, z + 1, [(0, 0.27), (0.18, 0.33), (0.35, 0.12), (0.53, 0.24), (0.94, 0)], 32
    )
    for i in range(32):
        a = i * TAU / 32
        end = (x + 1.71 * math.cos(a), y + 1.71 * math.sin(a), z + 0.48)
        tip = (end[0], end[1], end[2] - 0.22 - 0.055 * math.cos(a * 4))
        s.beam("bronze", end, tip, 0.024, 5)
        s.rings("gold", *tip, [(-0.105, 0.058), (0, 0.028)], 8)
    boudha_flags(s, x, y, spire, z)

    for i in range(17):
        a = i * TAU / 17
        u, v = x + 30 * math.cos(a), y + 30 * math.sin(a)
        if abs(u) < 14 and v < y:
            continue
        # Keep the flanking parcels clear of the original southern entry.
        width = 6.2 if v < y and abs(u) < 20 else 9.4 + 0.40 * (i % 2)
        boudha_townhouse(s, u, v, a, i, width)


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
        if -9 < x < 3:
            y = max(y, 32.5)  # Leave a continuous floor right up to the inner cave wall.
        h = (y - 20) * 0.7 + rng.uniform(2, 7)
        rock(s, x, y, 0, 5.5, h, i, "stone" if i % 4 else "shale")
    for i, (x, y, z) in enumerate(
        ((-14, 20, 0), (12, 21, 0), (-9, 27, 3.6), (9, 30, 6.2), (3, 36, 9.7), (-17, 36, 9))
    ):
        house(s, x, y, z, 5, 3.8, 2.7, "lime", i == 4)
        chorten(s, x + 3, y - 2, z, 2.05)
    flags(s, (-16, 24, 7), (15, 30, 10), 30, 3)


def pharping(s):
    for j in range(17):
        x = (j - 8) * 3.2
        rock(s, x, 39 + math.sin(j * 0.9) * 2, 0, 5, 12 + 4 * math.cos(j * 0.66), j)
    house(s, -10, 25, 0, 10, 6, 6.4, "ochre", True)
    house(s, 8, 30, 0, 7, 4.8, 4.65, "red", True)
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
    # A continuous inward-facing vault closes the room behind the arched ribs.
    # The crown undulates with the strata and the side edges descend into the crags.
    sections = []
    for j in range(27):
        north = -35 + j * 2.8
        curve = []
        for k in range(17):
            t = k * math.pi / 16
            east = 13.5 * math.cos(t)
            height = 0.2 + 13.4 * math.sin(t) ** 0.68
            height += math.sin(t) * (1.5 * noise(k, j) - 0.85 + 0.65 * math.sin(north * 0.22))
            curve.append((east, north, height))
        sections.append(curve)
    for a, b in zip(sections, sections[1:]):
        for k in range(16):
            s.face(wall, [a[k], a[k + 1], b[k + 1], b[k]])
    s.face(wall, sections[0][::-1])
    s.face(wall, sections[-1])
    for i in range(30):
        east = (-1 if i % 2 else 1) * (4.0 + 3 * noise(i, floor))
        north = -26 + i * 2.0
        top = 13.9 - abs(east) * 0.19 + 0.4 * math.sin(north * 0.22)
        length = 1.2 + noise(floor, i) * 2.4
        s.rings(
            style if floor == 2 and i % 3 == 0 else wall,
            east,
            north,
            top - length,
            [(0, 0.024), (0.7 * length, 0.38), (length, 0.62)],
            7,
        )
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

    measured = stage in {"stupa", "pharping", "mangyul", "yarlung", "samye", "chimphu"}
    if measured:
        source = Path(__file__).resolve().parents[1] / "Assets/Relief" / f"{stage}.i16"
        samples = struct.unpack("<7921h", source.read_bytes())

    def elevation(x, y):
        # The grid runs west to east, then south to north. One world metre spans 50 survey metres.
        col = min(88., max(0., x / 5 + 44))
        row = min(88., max(0., y / 5 + 44))
        i, j = min(87, int(col)), min(87, int(row))
        u, v = col - i, row - j
        south = samples[89*j+i] * (1-u) + samples[89*j+i+1] * u
        north = samples[89*(j+1)+i] * (1-u) + samples[89*(j+1)+i+1] * u
        return south * (1-v) + north * v

    def height(x, y):
        radius = math.hypot(x, y - 5)
        blend = min(1, max(0, (radius - 55) / 28))
        if blend == 0:
            return -0.65
        if measured:
            return blend * (elevation(x, y) - samples[89*44+44]) / 50 - 0.64
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
            if avg < -0.58 and (not measured or max(abs(x), abs(y-5)) < 52):
                continue
            surface = (
                "snow"
                if (elevation(x, y) > 4950 if measured else alpine and avg > 45 + 3 * math.sin(x * 0.16))
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
        south_approach(s)
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
    build_passages(s, stage)
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
