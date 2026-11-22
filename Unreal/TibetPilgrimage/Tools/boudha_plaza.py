"""Paving, a timber resting place and offering bowls on the south approach."""

import math

from tibet_mesh import png


def window_spill_map(windows):
    # Bake onto the paving's second UV set. Both the shop panes and their pools of
    # warm light can then dim together without a movable light per room on mobile.
    size, span = 512, 136.0
    energy = [0.0] * (size * size)
    scale = size / span
    for east, north, nx, ny, height in windows:
        u = (east + 68) * scale
        v = (72 - north) * scale
        radius = math.ceil(3 * height * scale)
        for row in range(max(0, int(v) - radius), min(size, int(v) + radius + 1)):
            for col in range(max(0, int(u) - radius), min(size, int(u) + radius + 1)):
                dx, dy = (col + .5 - u) / scale, (v - row - .5) / scale
                reach = dx * nx + dy * ny
                if not 0 < reach < 3 * height:
                    continue
                across = (dx * ny - dy * nx) / (.78 + .32 * reach)
                # Window emission faces the street. Incidence on the ground and
                # inverse-square falloff put the brightest patch outside the sill.
                distance_sq = dx * dx + dy * dy + height * height
                incidence = 3.6 * height ** 3 * reach / distance_sq ** 2
                feather = min(1, (3 * height - reach) / height)
                energy[row * size + col] += incidence * feather * math.exp(-.5 * across * across)

    # glTF emissive textures are sRGB. Encode linear illuminance before packing.
    rgb = bytearray()
    for value in energy:
        linear = min(1, value)
        encoded = 12.92 * linear if linear <= .0031308 else 1.055 * linear ** (1 / 2.4) - .055
        rgb.extend([round(255 * encoded)] * 3)

    def uv(gltf_position):
        east, _, south = gltf_position
        return ((east + 68) / span, (south + 72) / span)

    return png(rgb, size), uv


def south_approach(s):
    # Flush terracotta headers and a narrow stone course widen into the square.
    # Leave a break on the west for the grove gate beside the spawn.
    def edge(y):
        return 4.65 + max(0, y + 4) ** 2 * 0.012

    for side in (-1, 1):
        for offset, width, length, material in ((0, 0.25, 1.04, "stone"), (0.27, 0.52, 0.29, "ochre")):
            for i in range(int(31 / length)):
                y = -22 + i * length
                if side < 0 and y < -15.5 and y + length > -21.5:
                    continue
                near, far = y + 0.012, y + length - 0.012
                corners = [(side * (edge(t) + offset + w), t, 0.007)
                           for t, w in ((near, 0), (near, width), (far, width), (far, 0))]
                s.face(material, corners if side > 0 else corners[::-1])

    # A low, open timber rest shelter faces across the path. The short posts
    # sit on stone feet, and angled brackets carry the projecting roof.
    x, y = -7.35, -7.4
    s.box("stone", x, y, -0.01, 2.35, 3.75, 0.30)
    s.box("wood", x, y, 0.29, 2.39, 3.80, 0.12)
    for dx in (-0.93, 0.93):
        for dy in (-1.57, 1.57):
            px, py = x + dx, y + dy
            s.box("stone", px, py, 0.41, 0.30, 0.30, 0.14)
            s.box("wood", px, py, 0.55, 0.17, 0.17, 1.77)
            s.box("maroon", px, py, 2.17, 0.32, 0.32, 0.15)
            s.beam("wood", (px, py, 1.87), (px, py - math.copysign(0.45, dy), 2.32), 0.071, 4)
        s.box("wood", x + dx, y, 2.32, 0.18, 4.08, 0.18)
    for dy in (-1.57, 1.57):
        s.box("wood", x, y + dy, 2.32, 2.34, 0.18, 0.18)
    for side in (-1, 1):
        eave = x + side * 1.53
        points = [(eave, y - 2.21, 2.44), (eave, y + 2.21, 2.44),
                  (x, y + 2.21, 2.93), (x, y - 2.21, 2.93)]
        s.face("ochre", points if side > 0 else points[::-1])
        s.face("wood", [(a, b, c - 0.065) for a, b, c in
                        (points[::-1] if side > 0 else points)])
        s.box("wood", eave, y, 2.36, 0.12, 4.45, 0.09)
        for dy in (-2.21, 2.21):
            s.beam("maroon", (eave, y + dy, 2.41), (x, y + dy, 2.90), 0.074, 4)
    s.beam("ochre", (x, y - 2.26, 2.92), (x, y + 2.26, 2.92), 0.11, 8)

    # Each bronze bowl starts with an unlit wick. The offering spawns its flame.
    x, y = 6.15, -10.8
    for dy in (-0.59, 0.59):
        s.box("stone", x, y + dy, -0.01, 0.52, 0.23, 0.65)
    s.box("shale", x, y, 0.64, 0.82, 1.90, 0.14)
    for dy in (-0.59, 0, 0.59):
        s.rings("bronze", x, y + dy, 0.78,
                [(0, 0.17), (0.04, 0.17), (0.09, 0.075), (0.16, 0.07),
                 (0.22, 0.15), (0.32, 0.22), (0.34, 0.22)], 12)
        s.rings("dark", x, y + dy, 1.12, [(0, 0.024), (0.045, 0.017)], 8)

    # Quest lamps, in authoring metres (east, north). StupaLampLocation in
    # TibetGameMode places each persistent flame directly on its cotton wick.
    for i in range(3):
        x, y = -3.60 + 3.20 * i, 14.30 + 0.70 * i
        s.rings("stone", x, y, -0.01, [(0, 0.47), (0.14, 0.47), (0.19, 0.36),
                (0.47, 0.32), (0.50, 0.38), (0.56, 0.38)], 8, angle=math.pi / 8)
        s.rings("bronze", x, y, 0.55, [(0, 0.30), (0.045, 0.31), (0.10, 0.17),
                (0.16, 0.095), (0.28, 0.095), (0.32, 0.15), (0.36, 0.14),
                (0.41, 0.23), (0.50, 0.34), (0.59, 0.39), (0.61, 0.39),
                (0.61, 0.36), (0.55, 0.33)], 24)
        s.rings("giltpaint", x, y, 1.10, [(0.006, 0.329), (0.01, 0.33)], 24)
        s.rings("dark", x, y, 1.11, [(0, 0.029), (0.055, 0.018)], 8)

    # Eight worn stone lozenges follow the lap. The ninth stop revisits the first.
    for i in range(8):
        angle = i * math.tau / 8
        x, y = 23 * math.sin(angle), 34 + 23 * math.cos(angle)
        radial = (math.sin(angle), math.cos(angle))
        tangent = (math.cos(angle), -math.sin(angle))
        outline = [(x + u*tangent[0] + v*radial[0], y + u*tangent[1] + v*radial[1], 0.008)
                   for u, v in ((0.52, 0), (0, 0.28), (-0.52, 0), (0, -0.28))]
        for j in range(4):
            s.face("stone" if j % 2 else "ochre",
                   [(x, y, 0.008), outline[j], outline[(j+1) % 4]])

    # Concentric inlaid kora stone path & south lotus compass rose (flush at z <= 0.009m, 100% walkable)
    for r_in, r_out, mat in ((21.8, 24.2, "stone"), (24.25, 24.55, "ochre"), (21.45, 21.75, "ochre")):
        for i in range(64):
            a0, a1 = i * math.tau / 64, (i + 1) * math.tau / 64
            p0 = (r_in * math.sin(a0), 34 + r_in * math.cos(a0), 0.005)
            p1 = (r_out * math.sin(a0), 34 + r_out * math.cos(a0), 0.005)
            p2 = (r_out * math.sin(a1), 34 + r_out * math.cos(a1), 0.005)
            p3 = (r_in * math.sin(a1), 34 + r_in * math.cos(a1), 0.005)
            s.face(mat, [p0, p1, p2, p3])
    for i in range(8):
        a0 = i * math.tau / 8
        a_mid = a0 + math.tau / 16
        a1 = (i + 1) * math.tau / 8
        s.face("giltpaint" if i % 2 == 0 else "vermillion", [
            (0, 4.0, 0.008),
            (2.1 * math.cos(a0), 4.0 + 2.1 * math.sin(a0), 0.008),
            (3.2 * math.cos(a_mid), 4.0 + 3.2 * math.sin(a_mid), 0.008),
            (2.1 * math.cos(a1), 4.0 + 2.1 * math.sin(a1), 0.008),
        ])

    # Pair of traditional Himalayan whitewashed Sang Juniper Incense Kilns ("煨桑爐") flanking outer plaza
    for side in (-1, 1):
        kx, ky = side * 12.8, 5.2
        s.rings("stone", kx, ky, -0.01, [(0, 1.15), (0.28, 1.12)], 12)
        s.rings("whitewash", kx, ky, 0.27, [
            (0, 0.98), (0.85, 0.92), (1.35, 0.68), (1.95, 0.42), (2.45, 0.26)
        ], 12)
        s.rings("penma", kx, ky, 1.12, [(0, 0.88), (0.18, 0.86)], 12)
        s.rings("gold", kx, ky, 2.45, [(0, 0.30), (0.12, 0.34), (0.36, 0.06)], 12)
        # Glowing juniper ember hearth facing the kora approach
        s.box("dark", kx - side * 0.72, ky, 0.62, 0.32, 0.56, 0.58)
        s.box("ember", kx - side * 0.65, ky, 0.68, 0.22, 0.42, 0.24)

    # Ornate Newar-Tibetan Ajima Protector Shrine Pavilion on the west courtyard edge (clear of kora & sightlines)
    ax, ay = -16.8, 13.5
    s.box("stone", ax, ay, -0.01, 3.2, 3.2, 0.42)
    s.box("cinnabar", ax, ay, 0.41, 2.4, 2.4, 2.25)
    s.box("gold", ax + 1.22, ay, 0.65, 0.12, 1.15, 1.65)
    for tier, (tw, th, tz) in enumerate(((3.6, 0.65, 2.66), (2.7, 0.58, 3.45))):
        s.rings("gold" if tier else "ochre", ax, ay, tz, [(0, tw * 0.68), (th, tw * 0.22)], 4, angle=math.pi / 4)
    s.rings("gold", ax, ay, 4.03, [(0, 0.18), (0.22, 0.24), (0.62, 0)], 12)
