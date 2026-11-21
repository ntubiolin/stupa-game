"""Reference-informed landmarks, ridge surfaces and walkable landscapes for the eleven stages."""

import math
import random
import struct
from pathlib import Path

from boudha_plaza import south_approach, window_spill_map
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
FLAG_COLORS = ("indigoCloth", "whiteCloth", "redCloth", "greenCloth", "yellowCloth")
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
        s.face(FLAG_COLORS[i % 5], [p, end, fold, (p[0] + 0.08, p[1] + 0.24, p[2] - length)],
               uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])


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


def gyeltsen(s, x, y, z, h=1.15):
    """Traditional Tibetan cylindrical gilded victory banner ('gyeltsen') on monastery roof corners."""
    s.rings("bronze", x, y, z, [(0, 0.14), (0.10, 0.16), (0.14, 0.11)], 12)
    for tier in range(3):
        zh = z + 0.14 + tier * (h * 0.24)
        col = "gold" if tier != 1 else "cinnabar"
        s.rings(col, x, y, zh, [(0, 0.13 - tier * 0.015), (h * 0.21, 0.15 - tier * 0.015)], 14)
    s.rings("gold", x, y, z + 0.14 + h * 0.72, [(0, 0.16), (0.12, 0.05), (0.28, 0)], 14)


def dharma_wheel_deer(s, x, y, z):
    """Iconic Golden Dharma Wheel flanked by Twin Kneeling Deer ('Chökhor', crowning Samye & major temples)."""
    s.box("gold", x, y, z, 2.2, 0.42, 0.18)
    # Upright 8-spoked Dharma wheel in XZ plane facing south (-Y)
    cz = z + 0.88
    for i in range(16):
        a0, a1 = i * TAU / 16, (i + 1) * TAU / 16
        s.beam("gold", (x + 0.62 * math.cos(a0), y, cz + 0.62 * math.sin(a0)),
               (x + 0.62 * math.cos(a1), y, cz + 0.62 * math.sin(a1)), 0.055, 6)
        if i % 2 == 0:
            s.beam("gold", (x, y, cz), (x + 0.60 * math.cos(a0), y, cz + 0.60 * math.sin(a0)), 0.028, 5)
    s.rings("gold", x, y, z + 0.18, [(0, 0.24), (0.14, 0.18)], 12)
    for side in (-1, 1):
        dx = x + side * 0.92
        s.box("gold", dx, y, z + 0.18, 0.46, 0.22, 0.24)
        s.beam("gold", (dx - side * 0.16, y, z + 0.38), (dx - side * 0.26, y, z + 0.72), 0.065, 6)
        s.box("gold", dx - side * 0.28, y, z + 0.68, 0.18, 0.12, 0.12)


def house(s, x, y, z, w, d, h, body="lime", temple=False):
    s.box("stone", x, y, z, w + 0.34, d + 0.34, 0.42)
    s.box(body, x, y, z + 0.42, w, d, max(0.4, h - 0.82))
    # Authentic Tibetan 'penma' dark-crimson tamarisk frieze crowned with golden brass 'melong' mirrors
    frieze_h = min(0.58, max(0.32, h * 0.14))
    s.box("penma", x, y, z + h - frieze_h, w + 0.10, d + 0.10, frieze_h)
    medallions = max(2, int(w / 2.6))
    for front in (-1, 1):
        fy = y + front * (d / 2 + 0.07)
        for m_idx in range(medallions):
            mx = x + ((m_idx + 0.5) / medallions - 0.5) * (w * 0.86)
            s.box("gold", mx, fy, z + h - frieze_h * 0.68, 0.24, 0.05, 0.24)
    for a, b, t, m in (
        (0.02, 0.26, 0.18, "dark"),
        (0.20, 0.54, 0.19, "maroon"),
        (0.39, 0.38, 0.13, "gold" if temple else "ochre"),
        (0.52, 0.24, 0.08, "whitewash"),
    ):
        s.box(m, x, y, z + h + a, w + b, d + b, t)
    # Corner gilded gyeltsen victory banners on temples and shrines
    for sx in (-1, 1):
        for sy in (-1, 1):
            if temple or sy < 0:
                gyeltsen(s, x + sx * (w * 0.48), y + sy * (d * 0.48), z + h + 0.60, 0.95 if temple else 0.72)
    # Each opening has a deep black trapezoidal Tibetan 'baka' surround, silk 'shambu' valance and cross mullion.
    levels = max(1, int(h / 3.0))
    for floor in range(levels):
        hei = z + 0.86 + floor * 2.75
        if hei + 1.45 > z + h - frieze_h:
            continue
        for front in (-1, 1):
            fy = y + front * (d / 2 + 0.03)
            n = max(1, int(w / 2.7))
            for i in range(n):
                fx = x + ((i + 0.5) / n - 0.5) * w
                s.box("dark", fx, fy, hei, 1.08, 0.15, 1.42)
                s.box("litglass" if (i + floor) % 3 == 0 else "glass", fx, fy + front * 0.09, hei + 0.13, 0.78, 0.04, 1.13)
                s.box("wood", fx, fy + front * 0.15, hei + 0.12, 0.06, 0.05, 1.16)
                s.box("wood", fx, fy + front * 0.15, hei + 0.79, 0.78, 0.05, 0.065)
                s.box("yellowCloth" if temple else "redCloth", fx, fy + front * 0.17, hei + 1.16, 0.84, 0.07, 0.18)
                s.box("maroon", fx, fy, hei + 1.38, 1.34, 0.38, 0.14)
                s.box("ochre", fx, fy, hei - 0.08, 1.18, 0.22, 0.11)
    # Ornate Tibetan portico entrance facing south (-Y)
    s.box("dark", x, y - d / 2 - 0.11, z + 0.04, 1.54, 0.24, 2.12)
    s.box("cinnabar", x, y - d / 2 - 0.22, z + 0.08, 1.16, 0.09, 1.94)
    s.box("gold", x, y - d / 2 - 0.24, z + 2.02, 1.68, 0.34, 0.18)
    if temple:
        slope_roof(s, x, y, z + h + 0.60, w + 1.5, d + 1.5, max(1.25, min(3.2, w * 0.18)))


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

    s.face("whitewash", [shell(side * TAU / 120, 0)[0] for side in reversed(range(120))])
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
    lit_windows = []
    for level in range(1, storeys):
        z = level * floor_height
        box("wood", 0, front, z, width, 0.25, 0.13)
        for j in (-1, 0, 1):
            tx = j * bay
            w = min(1.75, bay - 0.40) * (1 if j else 1.14)
            offset = -0.22 if j == 0 else -0.08
            fy = front + offset
            box("wood", tx, fy, z + 0.43, w, 0.36, 1.47)
            occupied = (index + j + level) % 4 < 2
            box("litglass" if occupied else "glass", tx, fy - 0.19, z + 0.57, w - 0.24, 0.055, 1.16)
            if occupied and level == 1:
                lit_windows.append((x + tx * ca - (fy - 0.19) * sa,
                                    y + tx * sa + (fy - 0.19) * ca, sa, -ca, z + 1.15))
            for post in (-0.21, 0.21):
                box("wood", tx + w * post, fy - 0.24, z + 0.55, 0.065, 0.07, 1.20)
            box("wood", tx, fy - 0.24, z + 1.36, w - 0.14, 0.075, 0.07)
            box("dark", tx, fy, z + 0.39, w + 0.18, 0.46, 0.10)
            box("maroon", tx, fy, z + 1.87, w + 0.28, 0.52, 0.12)
    # Upper roof cap, rooftop Tibetan dharma-wheel shrine parapet & timber shopfront canopies.
    box("penma", 0, 0, height - 0.36, width + 0.04, depth + 0.04, 0.26)
    box("wood", 0, 0, height - 0.10, width + 0.16, depth + 0.16, 0.15)
    box("ochre", 0, 0, height + 0.04, width + 0.32, depth + 0.34, 0.16)
    box(body, 0, front + 0.13, height + 0.18, width, 0.24, 0.44)
    box("giltpaint", 0, front + 0.13, height + 0.60, width + 0.12, 0.32, 0.09)
    if index % 2 == 0:
        box("gold", 0, front + 0.08, height + 0.69, 0.52, 0.16, 0.42)
    if index % 3 != 1:
        box(
            ("maroon", "green", "ochre")[index % 3], 0, front - 0.34, 2.14, width - 0.22, 0.74, 0.14
        )
        box("yellowCloth" if index % 2 == 0 else "redCloth", 0, front - 0.68, 2.00, width - 0.30, 0.08, 0.16)
        for tx in (-0.45 * width, 0.45 * width):
            box("wood", tx, front - 0.51, 0.30, 0.12, 0.12, 1.84)

    return lit_windows


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
    s.rings("whitewash", x, y, z, [(0, 10.67), (0.14, 10.72), (0.40, 10.50)], 96, cap_bottom=True)
    s.rings("giltpaint", x, y, z + 0.40, [(0, 10.53), (0.13, 10.52), (0.18, 10.36)], 96, cap_bottom=True)
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
            cap_bottom=True,
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
        cap_bottom=True,
    )
    s.rings("giltpaint", x, y, z + 0.40, [(0, 1.68), (0.07, 1.82), (0.11, 1.80)], 48, cap_bottom=True)
    s.rings(
        "gold", x, y, z + 1, [(0, 0.27), (0.18, 0.33), (0.35, 0.12), (0.53, 0.24), (0.94, 0)], 32, cap_bottom=True
    )
    for i in range(32):
        a = i * TAU / 32
        end = (x + 1.71 * math.cos(a), y + 1.71 * math.sin(a), z + 0.48)
        tip = (end[0], end[1], end[2] - 0.22 - 0.055 * math.cos(a * 4))
        s.beam("bronze", end, tip, 0.024, 5)
        s.rings("gold", *tip, [(-0.105, 0.058), (0, 0.028)], 8, cap_bottom=True)
    boudha_flags(s, x, y, spire, z)

    windows = []
    for i in range(17):
        a = i * TAU / 17
        u, v = x + 30 * math.cos(a), y + 30 * math.sin(a)
        if abs(u) < 14 and v < y:
            continue
        # Keep the flanking parcels clear of the original southern entry.
        width = 6.2 if v < y and abs(u) < 20 else 9.4 + 0.40 * (i % 2)
        windows.extend(boudha_townhouse(s, u, v, a, i, width))
    s.emission_maps["paving"] = window_spill_map(windows)


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


def mani_wall(s, x, y, z, length, yaw=0):
    """Carved Tibetan Mani stone wall ('瑪尼牆') stacked with polychrome Om Mani Padme Hum slate tablets."""
    s.box("stone", x, y, z, length, 0.92, 0.78, yaw)
    s.box("shale", x, y, z + 0.78, length + 0.14, 1.04, 0.14, yaw)
    ca, sa = math.cos(yaw), math.sin(yaw)
    slabs = max(3, int(length / 0.75))
    colors = ("lapis", "vermillion", "whitewash", "giltpaint", "turquoise")
    for i in range(slabs):
        t = ((i + 0.5) / slabs - 0.5) * (length * 0.88)
        sx, sy = x + t * ca, y + t * sa
        s.box(colors[i % 5], sx, sy, z + 0.92, 0.56, 0.18, 0.46, yaw + 0.08 * math.sin(i))


def hermitage(s, rng):
    # Ch.5 Chimphu Hermitage ("青朴聖地"): Steep red-ochre Mount Nari cliffs ("Drakmar"),
    # cliffside meditation huts on timber stilts, Sacred Turquoise Amrita Spring ("青朴甘露泉"), and Dakini lungta.
    for i in range(28):
        x = (i % 7 - 3) * 7 + rng.uniform(-1.8, 1.8)
        y = 31 + (i // 7) * 6 + rng.uniform(-1.6, 1.6)
        if -9.5 < x < 3.5:
            y = max(y, 32.8)  # Leave a continuous floor right up to the inner CHIMPHU cave wall.
        h = (y - 19) * 0.76 + rng.uniform(3, 8.5)
        cliff_mat = ("ochre", "red", "stone", "shale")[i % 4]
        rock(s, x, y, 0, 5.8, h, i, cliff_mat)
    # Keep (-14, 20) landmark height > 2m for verify_world.py!
    for i, (x, y, z) in enumerate(
        ((-14, 20, 0), (12.5, 21, 0), (-9.5, 27, 3.6), (9.5, 30, 6.2), (3, 36, 9.7), (-17, 36, 9))
    ):
        if z > 0.5:
            # Cliffside timber retreat deck & wooden access ladder
            s.box("wood", x, y - 2.3, z - 0.18, 5.6, 1.4, 0.18)
            for lx in (-2.2, 0, 2.2):
                s.beam("wood", (x + lx, y - 2.8, max(0, z - 3.8)), (x + lx, y - 2.8, z), 0.09, 6)
        house(s, x, y, z, 5.2, 3.9, 2.85, "lime" if i % 2 == 0 else "ochre", i in (1, 4))
        chorten(s, x + (3.4 if x > 0 else -3.4), y - 2.0, z, 2.25)
    # Sacred Chimphu Turquoise Amrita Spring ("青朴甘露泉") on the west terrace (outside central nav lane!)
    sx, sy = -10.8, 8.2
    s.rings("stone", sx, sy, -0.02, [(0, 3.1), (0.28, 2.95), (0.34, 2.55)], 24)
    s.rings("turquoise", sx, sy, 0.20, [(0, 2.48), (0.04, 2.48)], 24)
    rock(s, sx - 2.4, sy + 1.4, 0, 1.9, 3.4, 71, "red")
    s.beam("wood", (sx - 1.5, sy + 0.9, 1.35), (sx - 0.5, sy + 0.3, 1.05), 0.08, 8)
    s.beam("turquoise", (sx - 0.5, sy + 0.3, 1.02), (sx - 0.4, sy + 0.2, 0.22), 0.06, 8)
    mani_wall(s, 10.5, 9.5, 0, 5.2, 0.35)
    flags(s, (-16, 20, 8.4), (14, 22, 8.8), 28, 1.3)
    flags(s, (-16, 26, 9.2), (15, 31, 11.2), 32, 2.2)


def pharping(s):
    # Ch.1 Pharping & Yanglesho/Asura Sacred Caves ("帕平與楊烈雪雙聖洞"):
    # Stratified Himalayan limestone crags, Vajrayogini & Ralo monasteries, and Three Ancient Naga Springs ("三處古泉眼")!
    for j in range(19):
        x = (j - 9) * 3.1
        rock(s, x, 39.5 + math.sin(j * 0.9) * 2, 0, 5.4, 13.5 + 4.5 * math.cos(j * 0.66), j,
             "stone" if j % 3 == 0 else "shale")
    # Flanking cliff buttresses framing YANGLESHO (east=-0.5, start=15, width=6.2 -> clear [-3.6, +2.6])
    for side, cx in ((-1, -6.2), (1, 5.4)):
        rock(s, cx, 21.5, 0, 2.4, 8.5, 40 + side, "shale")
    # Vajrayogini Temple at (-10, 25) (preserves LANDMARKS["pharping"] = (2500, -1000)!) & Ralo Shrine at (8.5, 29.5)
    house(s, -10, 25, 0, 10.2, 6.2, 6.6, "cinnabar", True)
    dharma_wheel_deer(s, -10, 21.8, 7.2)
    house(s, 8.5, 29.5, 0, 7.4, 5.0, 4.85, "ochre", True)
    chorten(s, -16.5, 19.5, 0, 3.4)
    chorten(s, 14.5, 21.5, 0, 3.1)
    # Three Ancient Naga Spring Cisterns ("三處古泉眼") rescued from the Naga Drought Spirit!
    for idx, (wx, wy, wr) in enumerate(((-10.2, 13.0, 2.85), (-12.8, 5.2, 2.15), (10.6, 11.8, 2.35))):
        s.rings("stone", wx, wy, -0.02, [(0, wr + 0.45), (0.32, wr + 0.38), (0.38, wr)], 24)
        s.rings("giltpaint", wx, wy, 0.36, [(0, wr + 0.16), (0.06, wr + 0.14)], 24)
        s.rings("turquoise", wx, wy, 0.22, [(0, wr - 0.04), (0.04, wr - 0.04)], 24)
        # Carved stone Naga serpent-hood water spout on north rim
        s.rings("stone", wx, wy + wr, 0.36, [(0, 0.34), (0.65, 0.28), (1.05, 0.42), (1.28, 0.12)], 10)
        s.rings("gold", wx, wy + wr - 0.15, 0.92, [(0, 0.12), (0.14, 0.08)], 10)
    mani_wall(s, -9.8, -4.5, 0, 4.6, 0.18)
    flags(s, (-15.5, 24.5, 9.2), (12.0, 29.5, 8.4), 28, 2.1)
    flags(s, (-6.0, 16.5, 6.8), (5.2, 16.5, 6.8), 16, 0.85)


def peak_palace(s):
    # Ch.3 Yarlung Valley & Yumbu Lagang ("雅隆河谷與吐蕃第一宮殿雍布拉康"):
    # Towering battered whitewashed fortress & watchtower on red-ochre Mount Tashi Tsering spur,
    # golden highland barley terraces ("青稞梯田"), turquoise Yarlung river, bridge & Sheldrak Crystal Cave!
    for i, (r, h, mat) in enumerate(((15.2, 3.6, "ochre"), (11.6, 4.6, "stone"), (8.8, 3.2, "ochre"))):
        z = (0, 3.5, 8.0)[i]
        s.rings(mat, -1.8, 35, z, [(0, r), (h * 0.63, r * 0.85), (h, r * 0.72)], 21, 0.68, 0.20, 0.36)
    # Fortress rampart curtain wall along the ridge crest
    s.box("whitewash", -1.2, 31.2, 8.2, 13.5, 0.85, 2.6)
    s.box("penma", -1.2, 31.2, 10.5, 13.6, 0.92, 0.38)
    # Main Palace Hall & Iconic Tall Watchtower at (2.5, 35) (preserves LANDMARKS["yarlung"] = (3500, 250)!)
    house(s, -3.6, 35, 10.8, 8.6, 6.0, 4.8, "whitewash", True)
    house(s, 2.5, 35, 10.6, 5.0, 4.8, 11.2, "whitewash", True)
    dharma_wheel_deer(s, -3.6, 31.9, 16.2)
    # Sweeping ceremonial zig-zag stone stair ascending the spur (west of SHELDRAK at east=6.8)
    for j in range(29):
        t = j / 28
        s.box("stone", -11.5 + 5.2 * t, 17 + t * 14, t * 5.9, 2.2, 0.74, 0.24)
        if j % 4 == 0:
            s.box("whitewash", -12.6 + 5.2 * t, 17 + t * 14, t * 5.9, 0.36, 0.74, 0.68)
    # Stepped Golden-Ripe Highland Barley Terraces ("青稞梯田") with stone retaining walls on west valley
    for i in range(7):
        tx, ty, tz = -18.5 - i * 1.8, 8 + i * 3.4, i * 0.42
        s.box("stone", tx, ty, -0.05, 10.5, 2.8, tz + 0.38)
        s.box("barley" if i % 2 == 0 else "grass", tx, ty, tz + 0.33, 10.2, 2.55, 0.12)
    chorten(s, -13.5, 10.5, 0, 3.8)
    # Shimmering Turquoise Yarlung River, Cantilevered Timber Bridge & Prayer-Wheel Pavilion on east valley
    s.box("turquoise", 14.5, 4.5, 0.015, 9.5, 38.0, 0.03)
    for side_r in (-4.9, 4.9):
        s.box("stone", 14.5 + side_r, 4.5, 0.01, 0.65, 38.0, 0.14)
    for j in range(11):
        s.box("wood", 14.5, -0.5 + j * 0.92, 0.92, 3.4, 0.88, 0.18)
    for x in (12.9, 16.1):
        s.beam("cinnabar", (x, -0.8, 1.82), (x, 9.2, 1.82), 0.085)
        for j in range(6):
            s.box("wood", x, -0.6 + j * 1.95, 0.35, 0.16, 0.16, 1.52)
    flags(s, (12.9, -0.6, 2.4), (16.1, 9.2, 2.4), 16, 0.55)
    # Prismatic Quartz Crystals flanking Sheldrak Crystal Cave ("謝札水晶洞", east=6.8, start=13.6, width=5.6)
    for side, cx in ((-1, 3.2), (1, 10.4)):
        for k in range(3):
            s.rings("quartz" if k % 2 == 0 else "ice", cx + side * k * 0.55, 14.2 + k * 1.1, 0,
                    [(0, 0.38), (0.35, 0.48), (1.8 + k * 0.45, 0.26), (2.5 + k * 0.5, 0)], 6)


def samye(s):
    # Ch.4 Samye Monastery ("桑耶寺 — 須彌山宇宙大壇城"):
    # Three-Story Three-Style Utse Central Cathedral (Tibetan, Tang Chinese, Indian) + Dharma Wheel & Deer,
    # Four Colored Directional Stupas (White SE, Red SW, Black NW, Green NE), Sun/Moon Chapels,
    # 1,008-Chorten Circular Chakri Wall, and Red Mount Hepo Ri on the east!
    x, y = 0, 38
    # Flush concentric Mandala stone courtyard rings (z <= 0.01m, 100% walkable across all Kora 0..7 legs!)
    for r_in, r_out, mat in ((11.5, 12.2, "giltpaint"), (19.5, 20.4, "ochre"), (26.2, 27.8, "stone")):
        for i in range(64):
            a0, a1 = i * TAU / 64, (i + 1) * TAU / 64
            s.face(mat, [
                (x + r_in * 1.18 * math.sin(a0), y + r_in * math.cos(a0), 0.006),
                (x + r_out * 1.18 * math.sin(a0), y + r_out * math.cos(a0), 0.006),
                (x + r_out * 1.18 * math.sin(a1), y + r_out * math.cos(a1), 0.006),
                (x + r_in * 1.18 * math.sin(a1), y + r_in * math.cos(a1), 0.006),
            ])
    # Story 1 (Tibetan Whitewashed Stone & Crimson Penma), Story 2 (Tang Cinnabar Pavilion), Story 3 (Indian Golden Roof)
    house(s, x, y, 0, 16.4, 14.0, 4.5, "whitewash")
    slope_roof(s, x, y, 4.85, 17.8, 15.2, 0.95)
    house(s, x, y, 5.15, 12.8, 10.8, 3.55, "cinnabar")
    slope_roof(s, x, y, 9.05, 14.2, 12.0, 0.92)
    house(s, x, y, 9.30, 9.2, 7.6, 3.05, "ochre", True)
    dharma_wheel_deer(s, x, y - 3.9, 13.0)
    # Twin gilded Doring edict pillars flanking the south portico of Utse (y=29.2, clear of Kora r=27)
    for sx in (-4.8, 4.8):
        s.box("stone", x + sx, y - 8.4, 0, 1.1, 1.1, 0.55)
        s.rings("cinnabar", x + sx, y - 8.4, 0.55, [(0, 0.34), (3.8, 0.28)], 16)
        s.rings("gold", x + sx, y - 8.4, 4.35, [(0, 0.42), (0.35, 0.48), (0.85, 0)], 16)

    # Four Iconic Colored Stupas of Samye (White SE, Red SW, Black NW, Green NE) inside the Kora ring
    four_stupas = (
        (13.8, -7.2, "whitewash", "gold"),     # SE White Stupa (Vairocana)
        (-13.8, -7.2, "vermillion", "gold"),   # SW Red Stupa (Amitabha)
        (-13.8, 8.2, "dark", "bronze"),        # NW Black Stupa (Akshobhya)
        (13.8, 8.2, "turquoise", "gold"),      # NE Green Stupa (Amoghasiddhi)
    )
    for dx, dy, col, spire_col in four_stupas:
        sx, sy = x + dx, y + dy
        for step in range(3):
            w_st = 4.2 - step * 0.55
            s.box(col, sx, sy, step * 0.48, w_st, w_st, 0.48)
        s.rings(col, sx, sy, 1.44, [(0, 1.48), (0.55, 1.32), (1.35, 1.52), (2.25, 1.18), (2.75, 0.68)], 28)
        s.box(spire_col, sx, sy, 4.19, 1.25, 1.25, 0.58)
        for ring_i in range(9):
            rr = 0.62 - ring_i * 0.048
            s.rings(spire_col, sx, sy, 4.77 + ring_i * 0.20, [(0, rr), (0.18, rr * 0.78)], 16)
        s.rings("gold", sx, sy, 6.57, [(0, 0.42), (0.18, 0.46), (0.65, 0)], 16)

    # Four Continent Ling Chapels (placed strictly inside Kora orbit rx=27, ry=32.5 -> |east| <= 20, 31 <= y <= 46)
    for u, v, c_body in ((-19.2, 31.2, "whitewash"), (19.2, 31.2, "whitewash"),
                         (-17.5, 45.2, "ochre"), (17.5, 45.2, "ochre")):
        house(s, u, v, 0, 6.2, 5.4, 3.2, c_body, True)
    # Circular Chakri Perimeter Wall crowned with miniature white chortens, placed strictly INSIDE outer Lingkhor Kora
    # (rx_east = 27.2 < 30.0, ry_north = 22.0 < 24.9) so Kora 0..7 walks cleanly around the outside of the Chakri wall!
    for i in range(60):
        a = TAU * i / 60
        u, v = x + 27.2 * math.sin(a), y + 22.0 * math.cos(a)
        if v < y and abs(u) < 4.5:
            continue
        s.box("whitewash", u, v, 0, 3.3, 0.64, 1.62, -a)
        s.box("penma", u, v, 1.62, 3.35, 0.76, 0.22, -a)
        chorten(s, u, v, 1.84, 0.94)
    # Sacred Red Mount Hepo Ri ("哈波日神山") rising on the east horizon with Lungta flags
    for k in range(5):
        rock(s, 45 + k * 2.5, 28 + k * 5.5, 0, 9.5 - k * 0.8, 18.0 - abs(k - 2) * 3.2, 90 + k, "ochre")
    flags(s, (13.8, 30.8, 6.4), (x, y - 6.8, 8.8), 18, 1.1)
    flags(s, (-13.8, 30.8, 6.4), (x, y - 6.8, 8.8), 18, 1.1)


def camp(s):
    # Ch.2 Mangyul Gungthang Pass ("芒域山口"):
    # Summit Latse Stone Cairns ("拉則神堆") with wooden arrows & 5-color Lungta canopy,
    # Tibetan Royal Envoy Pavilion & Black Yak-Hair Nomad Tents ("黑犛牛帳") with glowing hearth,
    # and Twelve Tenma Crystal Weather Altars ("十二丹瑪祭壇") flanking the windswept pass!
    # Keep (13, 17) landmark height > 2m for verify_world.py!
    for x in (-13, 13):
        s.beam("wood", (x, 17, 0), (x, 17, 7.2), 0.19, 10)
        s.rings("gold", x, 17, 7.2, [(0, 0.22), (0.35, 0.08), (0.65, 0)], 10)
        for i in range(6):
            r = 1.85 - i * 0.24
            rock(s, x, 17, i * 0.44, r, 0.68, i, "stone" if i % 2 == 0 else "shale")
        # Ritual wooden arrows ("mda'-dar") planted in the Latse cairn
        for k in range(6):
            ang = k * TAU / 6
            s.beam("cinnabar", (x + 0.5 * math.cos(ang), 17 + 0.5 * math.sin(ang), 1.8),
                   (x + 1.35 * math.cos(ang), 17 + 1.35 * math.sin(ang), 4.6), 0.035, 6)
    flags(s, (-13, 17, 6.8), (13, 17, 6.8), 32, 1.75)
    flags(s, (-13, 17, 6.6), (-18, 26, 3.8), 18, 1.1)
    flags(s, (13, 17, 6.6), (20, 25, 3.8), 18, 1.1)

    # Tibetan Royal Envoy Ba Salnang's Brocade Pavilion + Glowing Campfire Brazier
    rx, ry = 11.8, 24.5
    s.rings("cinnabar", rx, ry, 0, [(0, 3.2), (1.85, 3.1), (3.35, 0.45)], 8, angle=math.pi / 8)
    s.rings("gold", rx, ry, 1.82, [(0, 3.18), (0.14, 3.16)], 8, angle=math.pi / 8)
    s.rings("gold", rx, ry, 3.35, [(0, 0.46), (0.45, 0)], 8)
    # Stone hearth with glowing juniper/yak-dung embers & bronze tea kettle
    hx, hy = 8.8, 20.2
    s.rings("stone", hx, hy, 0, [(0, 0.92), (0.34, 0.86)], 12)
    s.rings("ember", hx, hy, 0.24, [(0, 0.64), (0.14, 0.38), (0.28, 0)], 10)
    for leg in range(3):
        la = leg * TAU / 3
        s.beam("dark", (hx + 0.68 * math.cos(la), hy + 0.68 * math.sin(la), 0), (hx, hy, 1.18), 0.035, 6)
    s.rings("bronze", hx, hy, 0.58, [(0, 0.24), (0.16, 0.32), (0.30, 0.22)], 12)

    # Authentic Black Yak-Hair Nomad Tents ("SBra-gur") pitched on the eastern leeward slope
    for i, (tx, ty) in enumerate(((17.5, 22.0), (22.5, 17.5), (-18.5, 21.5))):
        for v in (-1, 1):
            s.face("yakTent", [
                (tx + v * 2.6, ty - 2.4, 0), (tx + v * 2.6, ty + 2.4, 0),
                (tx + v * 0.35, ty + 2.1, 2.75), (tx + v * 0.35, ty - 2.1, 2.75),
            ])
            s.beam("dark", (tx + v * 2.6, ty, 0.8), (tx + v * 3.8, ty, 0), 0.024, 5)
        s.box("whiteCloth", tx, ty - 2.42, 0.2, 0.95, 0.08, 1.85)
        s.beam("wood", (tx, ty - 2.45, 0), (tx, ty - 2.45, 3.15), 0.07)
        s.beam("wood", (tx, ty + 2.45, 0), (tx, ty + 2.45, 3.15), 0.07)
        s.beam("wood", (tx, ty - 2.5, 2.95), (tx, ty + 2.5, 2.95), 0.08)

    # Twelve Tenma Snow-Goddess Crystal Oath Altars flanking the pass trail (|east| >= 7.8)
    for idx in range(6):
        for side in (-1, 1):
            ax = side * (8.2 + (idx % 2) * 2.4)
            ay = -9.0 + idx * 4.2
            rock(s, ax, ay, 0, 0.95, 1.15, 200 + idx * 2 + side, "stone")
            s.rings("ice", ax, ay, 0.95, [(0, 0.28), (0.55, 0.18), (0.95, 0)], 6)
    chorten(s, -15.5, 27.5, 0, 4.4)
    mani_wall(s, -9.2, 9.5, 0, 4.8, -0.25)


def grove(s):
    # Pilgrim's Stupa Grove ("行者塔林 — 八大善逝如來佛塔曼荼羅"):
    # Concentric stone-and-gold lotus mandala plaza, Central Jarung Vow Stupa + 8 Distinct Tathagata Stupas,
    # 4 carved stone butter-lamp offering pillars, Mani stone walls, and south Tibetan gateway!
    # Keep (0, 16) landmark height > 2m and central south approach clear!
    s.rings("paving", 0, 16, 0.01, [(0, 10.4), (0.05, 10.4)], 64)
    s.rings("ochre", 0, 16, 0.055, [(0, 9.6), (0.015, 9.6)], 64)
    s.rings("whitewash", 0, 16, 0.062, [(0, 5.2), (0.012, 5.2)], 48)
    for i in range(8):
        a0 = i * TAU / 8
        amid = a0 + TAU / 16
        a1 = (i + 1) * TAU / 8
        s.face("giltpaint" if i % 2 == 0 else "vermillion", [
            (0, 16, 0.078),
            (3.4 * math.cos(a0), 16 + 3.4 * math.sin(a0), 0.078),
            (4.8 * math.cos(amid), 16 + 4.8 * math.sin(amid), 0.078),
            (3.4 * math.cos(a1), 16 + 3.4 * math.sin(a1), 0.078),
        ])
    for i in range(8):
        ang = TAU * i / 8 + math.pi / 8
        x, y = 8.2 * math.cos(ang), 16 + 8.2 * math.sin(ang)
        s.rings("stone", x, y, 0.05, [(0, 1.35), (0.28, 1.25)], 16)
        chorten(s, x, y, 0.33, 2.8 + 0.35 * (i % 2))
    # Central Enlightenment Great Chorten at (0, 16)
    s.rings("stone", 0, 16, 0.06, [(0, 2.75), (0.26, 2.62)], 40)
    s.rings("gold", 0, 16, 0.32, [(0, 2.35), (0.18, 2.22)], 40)
    chorten(s, 0, 16, 0.50, 6.2)
    # Overhead 5-color Lungta garlands radiating from the central stupa spire (z = 5.2 -> 4.6m, full clearance!)
    for i in range(8):
        ang = TAU * i / 8 + math.pi / 8
        px, py = 11.2 * math.cos(ang), 16 + 11.2 * math.sin(ang)
        s.beam("cinnabar", (px, py, 0), (px, py, 4.8), 0.09, 8)
        s.rings("gold", px, py, 4.8, [(0, 0.16), (0.32, 0)], 10)
        flags(s, (0, 16, 5.6), (px, py, 4.6), 14, 0.55)
    # Four stone butter-lamp offering pillars outside the stupa ring
    for sx in (-1, 1):
        for sy in (-1, 1):
            lx, ly = sx * 9.8, 16 + sy * 9.8
            s.rings("stone", lx, ly, 0, [(0, 0.45), (1.15, 0.32), (1.30, 0.48)], 12)
            s.rings("bronze", lx, ly, 1.30, [(0, 0.38), (0.18, 0.42)], 16)
            s.rings("lampFlame", lx, ly, 1.48, [(0, 0.09), (0.14, 0.12), (0.32, 0)], 9)
    mani_wall(s, -13.2, 14.0, 0, 7.5, math.pi / 2)
    mani_wall(s, 13.2, 14.0, 0, 7.5, math.pi / 2)
    # Ceremonial Tibetan gateway flanking south approach at x = ±6.8, y = 2.5 (leaves 11m central lane clear!)
    for sx in (-6.8, 6.8):
        s.box("whitewash", sx, 2.5, 0, 1.6, 1.6, 3.6)
        s.box("penma", sx, 2.5, 3.6, 1.75, 1.75, 0.42)
        chorten(s, sx, 2.5, 4.02, 1.65)


def cave(s, floor):
    # Ch.5 Three Terma Sanctuaries:
    # Floor 1: Turquoise Dakini Grotto ("空行母松石窟")
    # Floor 2: Sapphire Vajra Crystal Sanctum ("金剛藍晶聖殿")
    # Floor 3: Zangdok Palri Copper-Colored Mountain Golden Vault ("銅色吉祥山黃金伏藏壇城")
    style = ("quartz", "ice", "amber")[floor - 1]
    wall = ("shale", "shale", "stone")[floor - 1]
    pillar_mat = ("cinnabar", "lapis", "cinnabar")[floor - 1]
    trim_mat = ("turquoise", "ice", "gold")[floor - 1]
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

    # Flush Sacred Floor Mandala & Nave Runner (z <= 0.015m — 100% clear for capsule_clear & VAULT stairs!)
    for seg in range(18):
        ny = -20.0 + seg * 1.65
        s.box("stone", 0, ny, 0.004, 3.4, 1.48, 0.008)
        s.box(trim_mat, 0, ny, 0.008, 0.42, 1.48, 0.006)
    for ring_r, r_mat in ((4.8, "stone"), (3.8, trim_mat), (2.9, pillar_mat)):
        s.rings(r_mat, 0, 2.0, 0.006, [(0, ring_r), (0.008, ring_r)], 32)
    for spoke in range(8):
        sa = spoke * TAU / 8
        s.beam(trim_mat, (0, 2.0, 0.012), (4.6 * math.cos(sa), 2.0 + 4.6 * math.sin(sa), 0.012), 0.08, 4)

    # Luminous ceiling stalactites & crystal chandeliers (high in vault crown z > 9m)
    for i in range(32):
        east = (-1 if i % 2 else 1) * (3.6 + 3.4 * noise(i, floor))
        north = -26 + i * 2.0
        top = 13.9 - abs(east) * 0.19 + 0.4 * math.sin(north * 0.22)
        length = 1.4 + noise(floor, i) * 2.5
        s.rings(
            style if i % 2 == 0 else wall,
            east,
            north,
            top - length,
            [(0, 0.024), (0.7 * length, 0.36), (length, 0.62)],
            7,
        )
    # Lateral cavern crags & glowing mineral crystal formations (|east| >= 8.5, clear of lanterns & VAULT!)
    for side in (-1, 1):
        for j in range(15):
            x = side * (11 + 2 * noise(j, floor))
            y = -29 + j * 4
            rock(s, x, y, -0.25, 3.0 + noise(j, 3), 7.3 + noise(j, 4) * 3, j, wall)
            for i in range(3):
                r = 0.42 + noise(i, j) * 0.68
                s.rings(
                    style,
                    x - side * (1.8 + i * 0.48),
                    y + i * 0.45,
                    0,
                    [(0, r * 0.65), (0.25, r), (2.3 + i * 0.68, r * 0.78), (3.4 + i * 0.75, 0)],
                    6,
                )
    # Carved Tibetan Temple Columns & Ribbed Vault Arches along the cavern nave
    for k in range(5):
        y = -13 + k * 9
        for side in (-1, 1):
            x = side * 8.8
            s.box("stone", x, y, 0, 2.05, 2.35, 0.55)
            s.box(pillar_mat, x, y, 0.55, 1.62, 1.95, 5.25)
            s.box("gold", x, y, 5.50, 1.88, 2.22, 0.30)
            s.box(style, x, y, 5.80, 2.05, 2.42, 0.28)
            for j in range(7):
                a = (j / 7) * math.pi / 2
                b = ((j + 1) / 7) * math.pi / 2
                s.beam(
                    "penma" if floor == 3 else wall,
                    (side * 8.8 * math.cos(a), y, 6.4 + 3.9 * math.sin(a)),
                    (side * 8.8 * math.cos(b), y, 6.4 + 3.9 * math.sin(b)),
                    0.72,
                    8,
                )
            if floor == 3 or k % 2 == 1:
                chorten(s, side * 7.5, y + 2, 0, 2.25)

    # Grand Sanctuary Centerpiece at (0, 24) (strictly 2.1m < height_at(0, 24) < 9.5m for verify_world.py!)
    if floor == 3:
        for j in range(4):
            s.box("gold" if j % 2 else "cinnabar", 0, 24, j * 0.36, 9.2 - j * 1.35, 9.2 - j * 1.35, 0.35)
        chorten(s, 0, 24, 1.44, 7.6)
        for ang_i in range(4):
            ca, sa = math.cos(ang_i * TAU / 4 + math.pi / 4), math.sin(ang_i * TAU / 4 + math.pi / 4)
            chorten(s, 3.6 * ca, 24 + 3.6 * sa, 0.36, 2.4)
    else:
        s.rings("stone", 0, 24, 0, [(0, 4.2), (0.45, 3.9)], 16)
        s.rings("gold", 0, 24, 0.45, [(0, 3.6), (0.22, 3.4)], 16)
        # Central sacred crystal mandala spire at exact (0, 24) reaching ~7.8m (< 10m trace ceiling!)
        s.rings(style, 0, 24, 0.67, [(0, 1.45), (0.8, 1.65), (4.8, 1.12), (7.1, 0)], 8, 1, 0.08, floor)
        for j in range(8):
            ang = j * TAU / 8
            cx, cy = 2.6 * math.cos(ang), 24 + 2.6 * math.sin(ang)
            s.rings(
                style if j % 2 == 0 else trim_mat,
                cx,
                cy,
                0.45,
                [(0, 0.72), (0.5, 0.92), (2.9 + noise(j, floor) * 1.4, 0.58), (4.4 + noise(j, floor) * 1.4, 0)],
                6,
                1,
                0.15,
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
        # Himalayan Trail ("喜馬拉雅古道 — 傾斜瑪尼堆與雪山巨石陣"):
        #Keep (-9, 9) landmark height > 2m for verify_world.py!
        chorten(s, -9, 9, 0, 4.1)
        # Flush mountain flagstone path winding northward (z <= 0.012m, 100% walkable)
        for step in range(28):
            py = -20.0 + step * 1.45
            px = 0.85 * math.sin(step * 0.32)
            s.box("stone" if step % 2 == 0 else "paving", px, py, 0.004, 2.35, 1.12, 0.008, 0.08 * math.cos(step))
        # Iconic Tilted Mani Stone Cairns ("傾斜瑪尼堆") & Pass Lungta Poles outside nav corridor
        mani_wall(s, -8.4, 1.5, 0, 4.8, 0.28)
        mani_wall(s, 8.6, 5.5, 0, 5.2, -0.22)
        for side in (-1, 1):
            s.beam("wood", (side * 10.5, 14.5, 0), (side * 10.5, 14.5, 6.4), 0.14, 8)
            rock(s, side * 10.5, 14.5, 0, 1.45, 1.25, 50 + side, "stone")
        flags(s, (-10.5, 14.5, 6.1), (10.5, 14.5, 6.1), 26, 1.45)
        # Glacial Megalith Boss Ring around (0, 24) framing the Snow Migoi King arena
        s.rings("stone", 0, 22, 0.005, [(0, 6.8), (0.008, 6.8)], 32)
        for k in range(8):
            ang = k * TAU / 8 + 0.2
            mx, my = 8.4 * math.cos(ang), 22.0 + 7.2 * math.sin(ang)
            if my < 14.5 and abs(mx) < 5.5:
                continue
            rock(s, mx, my, 0, 1.35, 3.8 + (k % 2) * 0.9, 80 + k, "shale")
            s.rings("ice", mx, my, 2.8, [(0, 0.42), (1.1, 0.18), (1.6, 0)], 6)
        for j in range(20):
            r = 2.6 + 1.4 * rng.random()
            rock(
                s,
                (-1 if j % 2 else 1) * (7.5 + j * 0.55),
                21 + j * 0.76,
                0,
                r,
                2.8 + rng.random() * 5.4,
                j,
                "snow" if j > 12 else "shale",
            )
        for j in range(3):
            chorten(s, 11 + j * 3, 23 + j * 2, 0, 2.6 + j * 0.35)
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
