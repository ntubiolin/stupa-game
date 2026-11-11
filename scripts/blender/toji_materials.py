"""Original tileable PBR maps for the Kondō. Runs in Blender with bundled NumPy.

Textures are authored in meters. Images are packed into the editable Blender
file and exported as standard glTF textures, including the shared ORM image.
"""

import math
import struct
import tempfile
import zlib
from pathlib import Path

import bpy
import numpy as np


def noise(size, cells_x, cells_y, rng):
    """Seamless interpolated noise, with independently controlled grain axes."""
    grid = rng.random((cells_y, cells_x), dtype=np.float32) * 2 - 1
    x = (np.arange(size, dtype=np.float32) + .5) * (cells_x / size)
    y = (np.arange(size, dtype=np.float32) + .5) * (cells_y / size)
    i, j = x.astype(int), y.astype(int)
    s, t = x - i, y - j
    s, t = s * s * (3 - 2 * s), t * t * (3 - 2 * t)
    right, below = (i + 1) % cells_x, (j + 1) % cells_y
    upper = grid[j[:, None], i] * (1 - s) + grid[j[:, None], right] * s
    lower = grid[below[:, None], i] * (1 - s) + grid[below[:, None], right] * s
    return upper * (1 - t[:, None]) + lower * t[:, None]


def ramp(field, low, high):
    fraction = np.clip((field - low) / (high - low), 0, 1)
    return fraction * fraction * (3 - 2 * fraction)


def shade(base, value, tint=(1, 1, 1)):
    return np.array(base) + value[:, :, None] * np.array(tint)


def timber(size):
    rng = np.random.default_rng(440)
    flow = .034 * noise(size, 5, 4, rng) + .012 * noise(size, 14, 7, rng)
    x, y = np.meshgrid((np.arange(size) + .5) / size, (np.arange(size) + .5) / size)
    knots = np.zeros_like(x)
    for cx, cy, width in ((.16, .24, .026), (.60, .68, .019), (.88, .39, .014)):
        dx = (x - cx + .5) % 1 - .5
        dy = (y - cy + .5) % 1 - .5
        distance = (dx / width) ** 2 + (dy / .12) ** 2
        flow += .048 * np.tanh(dx / width) * np.exp(-distance * .19)
        knots += np.exp(-distance * 2.8)
    # Grain is warped before the earlywood bands and fine vessels are sampled.
    rings = np.cos(math.tau * (39 * (x + flow) + .19 * noise(size, 17, 7, rng)))
    latewood = ramp(rings, .15, .98)
    vessels = ramp(noise(size, 123, 32, rng), .31, .91)
    faded = noise(size, 9, 6, rng) * .51 + noise(size, 27, 12, rng) * .18
    color = .062 * faded - .034 * latewood - .026 * vessels - .094 * knots
    dark = shade((.342, .263, .203), color, (1, .87, .74))
    mid = shade((.424, .328, .248), color * 1.14, (1, .88, .76))
    height = .20 * faded - .32 * latewood - .42 * vessels - .30 * knots
    ao = 1 - .08 * vessels - .12 * knots
    return (dark, mid), ao, .68 + .14 * faded + .10 * vessels, .0, height


def smoked_tile(size):
    rng = np.random.default_rng(1762)
    broad = noise(size, 4, 5, rng)
    cloud = .53 * broad + .29 * noise(size, 11, 11, rng) + .18 * noise(size, 37, 29, rng)
    runoff = noise(size, 48, 8, rng) * ramp(noise(size, 9, 6, rng), -.47, .54)
    deposits = ramp(.70 * noise(size, 22, 23, rng) + .30 * noise(size, 71, 66, rng), .27, .67)
    pits = ramp(noise(size, 137, 121, rng), .47, .96)
    color = .106 * cloud + .026 * runoff + .049 * deposits - .043 * pits
    dark = shade((.328, .346, .359), color, (1, .99, .97))
    ridge = shade((.379, .396, .403), color * .83)
    dark += deposits[:, :, None] * np.array((.017, .011, .002))
    height = .21 * cloud + .31 * deposits - .52 * pits
    return (dark, ridge), 1 - .13 * pits, .56 + .11 * cloud + .21 * deposits, .04, height


def granite(size):
    rng = np.random.default_rng(730)
    cloud = .55 * noise(size, 5, 6, rng) + .31 * noise(size, 15, 13, rng)
    minerals = noise(size, 61, 57, rng) * .63 + noise(size, 119, 127, rng) * .37
    quartz = ramp(minerals, .16, .70)
    mica = ramp(-minerals, .18, .66)
    color = .115 * cloud + .16 * quartz - .18 * mica
    stone = shade((.623, .601, .563), color)
    stone += quartz[:, :, None] * np.array((.024, .011, .0))
    aged = stone * np.array((.75, .76, .79))
    height = .20 * cloud + .26 * quartz - .39 * mica
    return (stone, aged), 1 - .14 * mica, .79 + .09 * mica - .08 * quartz, .0, height


def lime_plaster(size):
    rng = np.random.default_rng(159)
    blotches = .70 * noise(size, 5, 6, rng) + .30 * noise(size, 17, 18, rng)
    skim = noise(size, 23, 11, rng)
    pinholes = ramp(noise(size, 99, 107, rng), .44, .95)
    color = .051 * blotches + .023 * skim - .042 * pinholes
    base = shade((.842, .819, .762), color, (.95, 1, 1.12))
    height = .12 * skim - .46 * pinholes
    return (base,), 1 - .08 * pinholes, .83 + .05 * blotches, .0, height


def lacquer_gilt(size):
    rng = np.random.default_rng(9032)
    leaf = .60 * noise(size, 8, 9, rng) + .40 * noise(size, 30, 31, rng)
    fine = noise(size, 99, 107, rng)
    rubbed = ramp(leaf * .70 + fine * .30, .32, .74)
    flecks = ramp(-fine, .57, .95) * ramp(leaf, -.06, .36)
    wear = np.maximum(rubbed * .75, flecks * .48)
    gold = shade((.837, .650, .334), .092 * leaf + .023 * fine, (1, .83, .60))
    gold -= wear[:, :, None] * np.array((.26, .30, .19))
    return (gold,), 1 - .09 * wear, .43 + .095 * leaf + .20 * wear, .78 - .48 * wear, None


def reduce_map(pixels, size):
    factor = pixels.shape[0] // size
    if factor == 1:
        return pixels
    return pixels.reshape(size, factor, size, factor, -1).mean(axis=(1, 3))


def normal_map(height, size, period, relief):
    height = reduce_map(height[:, :, None], size)[:, :, 0]
    # PNG rows run from top to bottom; the normal's green channel points up.
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * (size * relief / (2 * period[0]))
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * (size * relief / (2 * period[1]))
    normal = np.stack((-dx, dy, np.ones_like(dx)), axis=-1)
    return .5 + .5 * normal / np.linalg.norm(normal, axis=-1, keepdims=True)


def packed_image(name, pixels, data=False):
    """Store exact 8-bit samples and pack the resulting PNG, without Pillow."""
    size = pixels.shape[0]
    rgb = np.rint(np.clip(pixels, 0, 1) * 255).astype(np.uint8).reshape(size, size * 3)
    rows = np.zeros((size, size * 3 + 1), dtype=np.uint8)
    rows[:, 0] = 1  # PNG Sub filter, applied independently to R, G, B.
    rows[:, 1:4] = rgb[:, :3]
    rows[:, 4:] = rgb[:, 3:] - rgb[:, :-3]

    def chunk(kind, payload):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload))

    with tempfile.TemporaryDirectory(prefix="kondo-pbr-") as directory:
        path = Path(directory) / f"{name}.png"
        path.write_bytes(
            b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows.tobytes(), level=9))
            + chunk(b"IEND", b"")
        )
        image = bpy.data.images.load(str(path))
        image.name = name
        image.colorspace_settings.name = "Non-Color" if data else "sRGB"
        image.pack()
        image.filepath = f"//{path.name}"
    return image


def pbr_material(source, color, orm, normal):
    material = source.copy()
    material.name = f"{source.name}_KondoPBR"
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.location = (300, 200)
    nodes.get("Material Output").location = (640, 200)
    uv = nodes.new("ShaderNodeUVMap")
    uv.uv_map = "UVMap"
    uv.location = (-790, 220)

    def texture(image, location):
        node = nodes.new("ShaderNodeTexImage")
        node.image = image
        node.location = location
        links.new(uv.outputs["UV"], node.inputs["Vector"])
        return node.outputs["Color"]

    links.new(texture(color, (-580, 380)), bsdf.inputs["Base Color"])
    channels = nodes.new("ShaderNodeSeparateColor")
    channels.location = (-280, 0)
    links.new(texture(orm, (-580, 65)), channels.inputs["Color"])
    links.new(channels.outputs["Green"], bsdf.inputs["Roughness"])
    links.new(channels.outputs["Blue"], bsdf.inputs["Metallic"])
    # Blender's glTF exporter recognizes this group as the AO destination.
    settings = bpy.data.node_groups.get("glTF Material Output")
    if settings is None:
        settings = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        settings.interface.new_socket(name="Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    occlusion = nodes.new("ShaderNodeGroup")
    occlusion.node_tree = settings
    occlusion.location = (300, -460)
    links.new(channels.outputs["Red"], occlusion.inputs["Occlusion"])
    if normal is not None:
        tangent = nodes.new("ShaderNodeNormalMap")
        tangent.uv_map = "UVMap"
        tangent.location = (-280, -320)
        links.new(texture(normal, (-580, -275)), tangent.inputs["Color"])
        links.new(tangent.outputs["Normal"], bsdf.inputs["Normal"])
    return material


def uv_projection(obj, slots):
    """Project each face in local meters before objects are joined by material."""
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    mesh = obj.data
    coords = [vertex.co for vertex in mesh.vertices]
    if not coords:
        return
    layer = mesh.uv_layers.get("UVMap") or mesh.uv_layers.new(name="UVMap")
    mesh.uv_layers.active = layer
    layer.active_render = True
    extents = [max(p[axis] for p in coords) - min(p[axis] for p in coords) for axis in range(3)]
    grain_axis = max(range(3), key=extents.__getitem__)
    if "TimberWall" in obj.name or "FrontWingWall" in obj.name:
        grain_axis = 2
    round_wood = (
        grain_axis == 2 and 0 < min(extents[:2]) * 1.2 >= max(extents[:2])
        and (len(coords) > 8 or "Rafter" in obj.name or "Fascia" in obj.name)
    )
    circumference = math.pi * (extents[0] + extents[1]) * .5
    phase = zlib.crc32(obj.name.encode("utf-8"))
    offset_u, offset_v = (phase & 65535) / 65536, (phase >> 16) / 65536
    uvs = [0.] * (len(mesh.loops) * 2)

    for face in mesh.polygons:
        surface = slots.get(face.material_index)
        if surface is None:
            continue
        family, period = surface
        normal = face.normal
        indices = face.loop_indices
        points = [coords[mesh.loops[index].vertex_index] for index in indices]
        if family == "timber" and round_wood and abs(normal.z) < .78:
            turns = [math.atan2(p.x, -p.y) / math.tau for p in points]
            anchor = turns[0]
            coordinates = [(((t - anchor + .5) % 1 - .5 + anchor) * circumference, p.z)
                           for t, p in zip(turns, points)]
        else:
            axis = max(range(3), key=lambda i: abs(normal[i]))
            if family == "tile" and abs(normal.z) > .40:
                axis = 2
            if family == "gilt" and abs(normal.y) > .45:
                axis = 1
            v = grain_axis if family == "timber" and grain_axis != axis else (axis + 2) % 3
            u = 3 - axis - v
            flip = 1 if (v == (u + 1) % 3) == (normal[axis] > 0) else -1
            coordinates = [(flip * p[u], p[v]) for p in points]
        for index, (u, v) in zip(indices, coordinates):
            uvs[index * 2] = u / period[0] + offset_u
            uvs[index * 2 + 1] = v / period[1] + offset_v
    layer.uv.foreach_set("vector", uvs)


def apply_materials(scene, palette):
    """Texture Kondō objects while keeping the other landmark palettes intact."""
    recipes = (
        ("timber", ("timber_dark", "timber_mid"), timber, (.84, 2.45), (512, 256), 512, .00145),
        ("tile", ("kawara_dark", "kawara_ridge"), smoked_tile, (1.87, 1.87), (512, 256), 256, .0048),
        ("granite", ("granite_light", "granite_dark"), granite, (.93, .93), (256, 256), 256, .0029),
        ("plaster", ("shikkui_white",), lime_plaster, (1.56, 1.56), (256,), 128, .0014),
        ("gilt", ("gold_sacred",), lacquer_gilt, (.76, .76), (256,), 0, 0.),
    )
    used = {slot.material for obj in scene.objects if obj.type == "MESH"
            for slot in obj.material_slots}
    replacements = {}
    for family, keys, generate, period, color_sizes, normal_size, relief in recipes:
        if not any(palette.get(key) in used for key in keys):
            continue
        # A dedicated live MCP session can rebuild this asset multiple times.
        # Reuse the existing packed materials when the original palette returns.
        entries = [(key, color_size, palette[key]) for key, color_size in zip(keys, color_sizes)
                   if palette.get(key) in used]
        cached = {source: bpy.data.materials.get(f"{source.name}_KondoPBR")
                  for _, _, source in entries}
        if not all(cached.values()):
            colors, ao, roughness, metal, height = generate(max(color_sizes))
            orm_samples = np.stack((ao, roughness, np.broadcast_to(metal, ao.shape)), axis=-1)
            orm = bpy.data.images.get(f"Kondo_{family}_ORM")
            if orm is None:
                orm = packed_image(f"Kondo_{family}_ORM", reduce_map(orm_samples, 256), data=True)
            normal = bpy.data.images.get(f"Kondo_{family}_Normal")
            if normal_size and normal is None:
                normal = packed_image(f"Kondo_{family}_Normal",
                                      normal_map(height, normal_size, period, relief), data=True)
            color_samples = dict(zip(keys, colors))
            for key, size, source in entries:
                if cached[source] is None:
                    color = packed_image(f"Kondo_{key}_Color", reduce_map(color_samples[key], size))
                    cached[source] = pbr_material(source, color, orm, normal)
        for key, _, source in entries:
            material = cached[source]
            palette[key] = material
            replacements[source] = (material, family, period)

    for obj in scene.objects:
        if obj.type != "MESH":
            continue
        slots = {}
        for index, slot in enumerate(obj.material_slots):
            if slot.material in replacements:
                slots[index] = replacements[slot.material]
        if slots:
            uv_projection(obj, {index: (family, period) for index, (_, family, period) in slots.items()})
            for index, (material, _, _) in slots.items():
                obj.material_slots[index].material = material
