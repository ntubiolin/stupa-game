"""Write original architectural meshes as glTF. Authoring axes are east, north, up in metres."""

from collections import defaultdict
import json
import math
from pathlib import Path
import struct
import zlib


def normal(a, b, c):
    x, y, z = (b[i] - a[i] for i in range(3))
    u, v, w = (c[i] - a[i] for i in range(3))
    n = (y * w - z * v, z * u - x * w, x * v - y * u)
    length = max(1e-8, math.sqrt(sum(t * t for t in n)))
    return tuple(t / length for t in n)


# sRGB paint samples; texture roughness, metal, emission and nominal grain.
SURFACES = {
    "whitewash": ("faf8ef", 0.94, 0, 0, "chalk"),
    "turmeric": ("cb7d27", 0.90, 0, 0, "chalk"),
    "giltpaint": ("edbe66", 0.53, 0.22, 0, "chalk"),
    "lapis": ("263c63", 0.88, 0, 0, "chalk"),
    "vermillion": ("b24236", 0.88, 0, 0, "chalk"),
    "indigoCloth": ("426bc4", 0.93, 0, 0.06, "printed"),
    "whiteCloth": ("f3efdf", 0.93, 0, 0.06, "printed"),
    "redCloth": ("c14a48", 0.93, 0, 0.06, "printed"),
    "greenCloth": ("4f9072", 0.93, 0, 0.06, "printed"),
    "yellowCloth": ("efd366", 0.93, 0, 0.06, "printed"),
    "saffron": ("d5a653", 0.9, 0, 0, "plaster"),
    "lime": ("dfd7c4", 0.89, 0, 0, "plaster"),
    "ochre": ("bc7142", 0.83, 0, 0, "plaster"),
    "red": ("903d34", 0.85, 0, 0, "plaster"),
    "maroon": ("542931", 0.83, 0, 0, "wood"),
    "wood": ("795136", 0.80, 0, 0, "wood"),
    "dark": ("3d3531", 0.82, 0, 0, "wood"),
    "stone": ("a3927c", 0.91, 0, 0, "rock"),
    "shale": ("65645f", 0.88, 0, 0, "rock"),
    "paving": ("afa293", 0.86, 0, 0, "tile"),
    "earth": ("ab956d", 0.96, 0, 0, "rock"),
    "grass": ("89905d", 0.95, 0, 0, "rock"),
    "pine": ("405843", 0.90, 0, 0, "leaf"),
    "leaf": ("607649", 0.86, 0, 0, "leaf"),
    "snow": ("e5edf2", 0.76, 0, 0, "plaster"),
    "gold": ("c89c51", 0.37, 0.68, 0, "metal"),
    "bronze": ("9b7541", 0.49, 0.58, 0, "metal"),
    "glass": ("29464b", 0.28, 0.12, 0, "metal"),
    "litglass": ("29464b", 0.28, 0.12, 0.01, "metal"),
    "blue": ("315884", 0.84, 0, 0, "cloth"),
    "yellow": ("dcb856", 0.85, 0, 0, "cloth"),
    "green": ("52846c", 0.85, 0, 0, "cloth"),
    "water": ("389490", 0.18, 0.28, 0.08, "metal"),
    "turquoise": ("2bb0a2", 0.28, 0.22, 0.18, "metal"),
    "penma": ("6b2024", 0.86, 0, 0, "wood"),
    "cinnabar": ("a83228", 0.76, 0, 0, "plaster"),
    "barley": ("cfa848", 0.88, 0, 0, "leaf"),
    "yakTent": ("2c2421", 0.92, 0, 0, "cloth"),
    "ember": ("ff7a26", 0.62, 0, 0.95, "chalk"),
    "quartz": ("4cd4be", 0.24, 0.30, 0.42, "metal"),
    "ice": ("78d4ff", 0.18, 0.35, 0.46, "metal"),
    "lampFlame": ("ffb54d", .83, 0, 1, "chalk"),
    "amber": ("f2b949", 0.26, 0.58, 0.48, "metal"),
}


def png(rgb, width):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    rows = b"".join(b"\0" + rgb[i : i + width * 3] for i in range(0, len(rgb), width * 3))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">2I5B", width, width, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(rows, 7))
        + chunk(b"IEND", b"")
    )


def noise(ix, iy):
    n = (ix * 1327217885 + iy * 374761393 + 78317) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 65535) / 65535


def field(x, y, period_x, period_y):
    x, y = x * period_x, y * period_y
    i, j = math.floor(x), math.floor(y)
    x, y = x - i, y - j
    x, y = x * x * (3 - 2 * x), y * y * (3 - 2 * y)

    def sample(dx, dy):
        return noise((i + dx) % period_x, (j + dy) % period_y)

    return ((1 - x) * sample(0, 0) + x * sample(1, 0)) * (1 - y) + (
        (1 - x) * sample(0, 1) + x * sample(1, 1)
    ) * y


def tile(style, size=128):
    height = []
    for j in range(size):
        for i in range(size):
            x, y = i / size, j / size
            broad = field(x, y, 4, 4)
            mid = field(x, y, 14, 14)
            grain = noise(i, j)
            v = 0.4 * broad + 0.35 * mid + 0.25 * grain
            if style == "tile":
                row = int(y * 4)
                edge = min(((x * 3 + row * 0.5) % 1), (y * 4) % 1)
                v = (
                    0.06
                    if edge < 0.045
                    else 0.57 + 0.21 * v + 0.16 * noise(int(x * 3 + row * 0.5) % 3, row)
                )
            elif style == "rock":
                v = 0.34 * broad + 0.34 * field(x, y, 5, 25) + 0.22 * mid + 0.10 * grain
            elif style == "wood":
                v = 0.54 * field(x, y, 4, 41) + 0.18 * grain + 0.28 * broad
            elif style == "metal":
                v = 0.46 + 0.09 * field(x, y, 4, 24) + 0.04 * grain
            elif style == "cloth":
                v = 0.39 + 0.12 * ((i % 3) / 2) + 0.12 * ((j % 3) / 2) + 0.22 * mid
            height.append(v)
    color, normals = bytearray(), bytearray()
    for j in range(size):
        for i in range(size):
            index = j * size + i
            grey = int(173 + 82 * height[index])
            if style == "chalk":
                grey = int(226 + 27 * height[index])
            elif style == "printed":
                # Undyed hem and a woodblock rosette. UVs span one rectangle of fabric.
                x, y = (i + 0.5) / size, (j + 0.5) / size
                dx, dy = x - 0.5, (y - 0.47) * 1.22
                theta = math.atan2(dy, dx)
                petal = 0.13 + 0.066 * math.cos(8 * theta)
                edge = min(x, y, 1 - x, 1 - y)
                ink = (
                    0.041 < edge < 0.056
                    or 0.072 < edge < 0.080
                    or abs(math.hypot(dx, dy) - petal) < 0.012
                    or abs(math.hypot(dx, dy) - 0.071) < 0.014
                )
                grey = int((168 if ink else 219) + 24 * height[index])
            if style == "tile" and height[index] < 0.1:
                grey = 126
            color.extend((grey, grey, grey))
            dx = (height[j * size + (i + 1) % size] - height[j * size + (i - 1) % size]) * 0.8
            dy = (height[((j + 1) % size) * size + i] - height[((j - 1) % size) * size + i]) * 0.8
            denom = math.sqrt(dx * dx + dy * dy + 1)
            normals.extend(int(127.5 + 127.5 * c / denom) for c in (-dx, dy, 1))
    return png(bytes(color), size), png(bytes(normals), size)


def axis(point):
    return (point[0], point[2], -point[1])


def linear(hexcolor):
    return [((int(hexcolor[i : i + 2], 16) / 255 + 0.055) / 1.055) ** 2.4 for i in (0, 2, 4)]


class Scene:
    def __init__(self):
        self.emission_maps = {}  # material -> (PNG, glTF-position-to-UV function)
        self.group = "Landmarks"
        self.meshes = defaultdict(lambda: defaultdict(list))

    def face(self, mat, points, normals=None, tint=1, uvs=None):
        n = normal(*points[:3])
        projection = max(range(3), key=lambda a: abs(n[a]))
        axes = ((1, 2), (0, 2), (0, 1))[projection]
        verts = []
        for i, p in enumerate(points):
            uv = uvs[i] if uvs is not None else (p[axes[0]] * 0.64, -p[axes[1]] * 0.64)
            verts.append((axis(p), axis(normals[i] if normals else n), uv, tint))
        for i in range(1, len(verts) - 1):
            self.meshes[self.group][mat].extend((verts[0], verts[i], verts[i + 1]))

    def box(self, mat, x, y, z, w, d, h, yaw=0):
        ca, sa = math.cos(yaw), math.sin(yaw)
        pts = [
            (x + a * ca - b * sa, y + a * sa + b * ca, z + c)
            for c in (0, h)
            for a, b in ((-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2))
        ]
        for face in (
            (3, 2, 1, 0),
            (4, 5, 6, 7),
            (0, 1, 5, 4),
            (1, 2, 6, 5),
            (2, 3, 7, 6),
            (3, 0, 4, 7),
        ):
            self.face(mat, [pts[i] for i in face])

    def rings(self, mat, x, y, z, profile, sides=32, ratio=1, jitter=0, angle=0, *, cap_bottom=False):
        """Lathed or faceted surface from a sequence of (height, radius) rings."""
        rows = []
        for row, (h, r) in enumerate(profile):
            pts = []
            for i in range(sides):
                a = 2 * math.pi * i / sides + angle
                radius = r * (1 + jitter * (noise(i, row // 2) - 0.5))
                pts.append((x + radius * math.cos(a), y + radius * math.sin(a) * ratio, z + h))
            rows.append(pts)
        for lo, hi in zip(rows, rows[1:]):
            for i in range(sides):
                j = (i + 1) % sides
                if lo[i] == lo[j]:
                    self.face(mat, [lo[i], hi[j], hi[i]])
                elif hi[i] == hi[j]:
                    self.face(mat, [lo[i], lo[j], hi[i]])
                else:
                    self.face(mat, [lo[i], lo[j], hi[j], hi[i]])
        if cap_bottom and profile[0][1] > 0:
            self.face(mat, rows[0][::-1])
        if profile[-1][1] > 0:
            self.face(mat, rows[-1])

    def beam(self, mat, start, end, radius, sides=8):
        v = [end[i] - start[i] for i in range(3)]
        l = math.sqrt(sum(t * t for t in v))
        if l < 1e-7:
            return
        v = [t / l for t in v]
        a = (1, 0, 0) if abs(v[0]) < 0.7 else (0, 1, 0)

        def cross(a, b):
            return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

        u = cross(v, a)
        u = [t / math.sqrt(sum(j * j for j in u)) for t in u]
        w = cross(v, u)
        rows = []
        for pos in (start, end):
            rows.append(
                [
                    tuple(
                        pos[j]
                        + radius
                        * (
                            u[j] * math.cos(i * 2 * math.pi / sides)
                            + w[j] * math.sin(i * 2 * math.pi / sides)
                        )
                        for j in range(3)
                    )
                    for i in range(sides)
                ]
            )
        for i in range(sides):
            k = (i + 1) % sides
            self.face(mat, [rows[0][i], rows[0][k], rows[1][k], rows[1][i]])
        self.face(mat, rows[1])

    def write(self, path, tiles):
        data = bytearray()
        views, accessors, materials, images, textures, meshes, nodes = [], [], [], [], [], [], []

        def view(raw, target=None):
            data.extend(b"\0" * (-len(data) % 4))
            entry = dict(buffer=0, byteOffset=len(data), byteLength=len(raw))
            if target:
                entry["target"] = target
            views.append(entry)
            data.extend(raw)
            return len(views) - 1

        def accessor(values, fmt, kind, component, target):
            pack = struct.Struct("<" + fmt)
            raw = bytearray(pack.size * len(values))
            for i, value in enumerate(values):
                pack.pack_into(raw, i * pack.size, *value)
            entry = dict(
                bufferView=view(raw, target), componentType=component, count=len(values), type=kind
            )
            if fmt == "3f":
                entry.update(min=list(map(min, zip(*values))), max=list(map(max, zip(*values))))
            accessors.append(entry)
            return len(accessors) - 1

        texture_ids = {}
        mat_ids = {}

        def material(name):
            if name in mat_ids:
                return mat_ids[name]
            color, rough, metal, emit, style = SURFACES[name]
            if style not in texture_ids:
                ids = []
                if style not in tiles:
                    tiles[style] = tile(style)
                for channel, img in zip(("Color", "Relief"), tiles[style]):
                    images.append(
                        dict(name=style + channel, bufferView=view(img), mimeType="image/png")
                    )
                    ids.append(len(textures))
                    textures.append(dict(source=len(images) - 1))
                texture_ids[style] = ids
            col, norm = texture_ids[style]
            m = dict(
                name=name,
                doubleSided=style == "printed"
                or name in ("blue", "red", "green", "yellow", "lime", "pine", "leaf"),
                pbrMetallicRoughness=dict(
                    baseColorFactor=linear(color) + [1.0],
                    baseColorTexture=dict(index=col),
                    roughnessFactor=rough,
                    metallicFactor=metal,
                ),
                normalTexture=dict(index=norm, scale=0.52),
            )
            if emit:
                m["emissiveFactor"] = [v * emit for v in linear(color)]
            if name in self.emission_maps:
                atlas, _ = self.emission_maps[name]
                images.append(dict(name=name + "WindowSpill", bufferView=view(atlas), mimeType="image/png"))
                m["emissiveTexture"] = dict(index=len(textures), texCoord=1)
                m["emissiveFactor"] = [0.01, 0.005, 0.002]
                textures.append(dict(source=len(images) - 1))
            mat_ids[name] = len(materials)
            materials.append(m)
            return mat_ids[name]

        for group, parts in self.meshes.items():
            prims = []
            # UE joins the glTF primitives into one mesh. Supply neutral vertex
            # colors on its other sections whenever any section uses tint.
            has_vertex_colors = any(v[3] != 1 for stream in parts.values() for v in stream)
            for mat, stream in parts.items():
                verts = list(dict.fromkeys(stream))
                indices = {v: i for i, v in enumerate(verts)}
                positions, normals, uvs, colors = zip(*verts)
                attrs = {
                    "POSITION": accessor(positions, "3f", "VEC3", 5126, 34962),
                    "NORMAL": accessor(normals, "3f", "VEC3", 5126, 34962),
                    "TEXCOORD_0": accessor(uvs, "2f", "VEC2", 5126, 34962),
                }
                if mat in self.emission_maps:
                    _, project = self.emission_maps[mat]
                    attrs["TEXCOORD_1"] = accessor([project(p) for p in positions], "2f", "VEC2", 5126, 34962)
                if has_vertex_colors:
                    attrs["COLOR_0"] = accessor([(c, c, c) for c in colors], "3f", "VEC3", 5126, 34962)
                idx = accessor([(indices[v],) for v in stream], "I", "SCALAR", 5125, 34963)
                prims.append(dict(attributes=attrs, indices=idx, material=material(mat)))
            nodes.append(dict(name=group, mesh=len(meshes)))
            meshes.append(dict(name=group, primitives=prims))
        root = dict(
            asset=dict(version="2.0", generator="TibetPilgrimage"),
            scene=0,
            scenes=[dict(nodes=list(range(len(nodes))))],
            nodes=nodes,
            meshes=meshes,
            materials=materials,
            images=images,
            textures=textures,
            buffers=[dict(byteLength=len(data))],
            bufferViews=views,
            accessors=accessors,
        )
        js = json.dumps(root, separators=(",", ":")).encode()
        js += b" " * (-len(js) % 4)
        data.extend(b"\0" * (-len(data) % 4))
        Path(path).write_bytes(
            struct.pack("<4s4I", b"glTF", 2, 28 + len(js) + len(data), len(js), 0x4E4F534A)
            + js
            + struct.pack("<II", len(data), 0x004E4942)
            + data
        )
