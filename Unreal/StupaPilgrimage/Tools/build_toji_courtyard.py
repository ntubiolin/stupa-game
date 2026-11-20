"""Original, deterministic environment art. Run with Blender's bundled Python."""

import argparse
import math
from pathlib import Path
import random
import sys

import bpy
from mathutils import Vector
import numpy as np


PROJECT = Path(__file__).resolve().parents[1]
SEED = 325
RESOLUTION = 512


def material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    if not mat.use_nodes:
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def texture_material(name, colors, frequency, relief, roughness, seed, resolution=RESOLUTION):
    # Interpolated periodic grids avoid directional banding on planar stone.
    # Bark uses the same noise with a frequency stretched along the trunk.
    rng = np.random.default_rng(seed)
    x, y = np.meshgrid(*(np.arange(resolution) / resolution,) * 2)
    height = np.zeros_like(x)
    grain = rng.uniform(-1, 1, size=x.shape)
    for octave, amplitude in enumerate((0.43, 0.29, 0.19, 0.145, 0.095)):
        fx, fy = (max(2, base * 2 ** octave) for base in frequency)
        grid = rng.uniform(-1, 1, size=(fy, fx))
        base_x, base_y = np.floor(x * fx).astype(int), np.floor(y * fy).astype(int)
        tx, ty = x * fx - base_x, y * fy - base_y
        tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        next_x, next_y = (base_x + 1) % fx, (base_y + 1) % fy
        a = grid[base_y, base_x] * (1 - tx) + grid[base_y, next_x] * tx
        b = grid[next_y, base_x] * (1 - tx) + grid[next_y, next_x] * tx
        height += amplitude * (a * (1 - ty) + b * ty)
    height = np.clip(0.5 + height * 0.68 + grain * 0.085, 0, 1)
    tone = np.clip(height * 1.25 - 0.125, 0, 1)[..., None]
    base = np.array(colors[0]) * (1 - tone) + np.array(colors[1]) * tone
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * relief
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * relief
    normal = np.stack((-dx, -dy, np.ones_like(dx)), axis=-1)
    normal = normal / np.linalg.norm(normal, axis=-1, keepdims=True) * 0.5 + 0.5

    mat = material(name, colors[0], roughness)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    for suffix, pixels, color_space in (("BaseColor", base, "sRGB"), ("Normal", normal, "Non-Color")):
        image = bpy.data.images.new(f"{name}_{suffix}", resolution, resolution, alpha=False)
        image.colorspace_settings.name = color_space
        rgba = np.concatenate((pixels, np.ones_like(x)[..., None]), axis=-1)
        image.pixels.foreach_set(rgba.astype(np.float32).ravel())
        image.pack()
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = image
        if suffix == "BaseColor":
            links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        else:
            bump = nodes.new("ShaderNodeNormalMap")
            links.new(tex.outputs["Color"], bump.inputs["Color"])
            links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


class Mesh:
    def __init__(self, name):
        self.name = name
        self.vertices = []
        self.faces = []
        self.uvs = []
        self.styles = []

    def add(self, points, faces, uvs, style=0, smooth=False):
        start = len(self.vertices)
        self.vertices.extend(points)
        for face in faces:
            self.faces.append(tuple(start + i for i in face))
            self.uvs.append([uvs[i] for i in face])
            self.styles.append((style, smooth))

    def create(self, materials):
        data = bpy.data.meshes.new(self.name)
        data.from_pydata(self.vertices, (), self.faces)
        obj = bpy.data.objects.new(self.name, data)
        bpy.context.collection.objects.link(obj)
        for mat in materials:
            data.materials.append(mat)
        uv = data.uv_layers.new(name="UVMap")
        for polygon, (style, smooth), coords in zip(data.polygons, self.styles, self.uvs):
            polygon.material_index = style
            polygon.use_smooth = smooth
            for loop_index, coord in zip(polygon.loop_indices, coords):
                uv.data[loop_index].uv = coord
        return obj


def rectangle(mesh, x0, y0, x1, y1, z, uv_scale):
    points = ((x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z))
    mesh.add(points, ((0, 1, 2, 3),), [(x / uv_scale, y / uv_scale) for x, y, _ in points])


def stone(mesh, rng, x, y, width, length, bottom, top, uv_scale=1):
    """Straight split edges with irregular clipped corners and rounded shoulders."""
    w, l = width / 2, length / 2
    a, b, c, d = [rng.uniform(0.06, 0.19) for _ in range(4)]
    rim = [(-w + a * w, -l), (w - b * w, -l), (w, -l + b * l), (w, l - c * l),
           (w - c * w, l), (-w + d * w, l), (-w, l - d * l), (-w, -l + a * l)]
    angle = rng.uniform(-0.013, 0.013)
    cosine, sine = math.cos(angle), math.sin(angle)
    points = []
    for inset, z in ((0.96, bottom), (1, top - (top - bottom) * 0.18), (0.94, top)):
        for u, v in rim:
            points.append((x + inset * (u * cosine - v * sine), y + inset * (u * sine + v * cosine),
                           z + (rng.uniform(-0.007, 0.007) if inset == 0.94 else 0)))
    faces = [(i + j, (i + 1) % 8 + j, (i + 1) % 8 + j + 8, i + j + 8)
             for j in (0, 8) for i in range(8)]
    faces.append(tuple(range(16, 24)))
    mesh.add(points, faces, [((u + 0.48 * z) / uv_scale, (v + 0.73 * z) / uv_scale)
                            for u, v, z in points])


def tube(mesh, joints, radii, offset):
    sides = 8
    rings = []
    for i, (joint, radius) in enumerate(zip(joints, radii)):
        tangent = (joints[min(i + 1, len(joints) - 1)] - joints[max(0, i - 1)]).normalized()
        axis = Vector((0, 0, 1)).cross(tangent)
        if axis.length < 0.01:
            axis = Vector((1, 0, 0)).cross(tangent)
        axis.normalize()
        other = tangent.cross(axis)
        ring = []
        for k in range(sides + 1):
            angle = 2 * math.pi * (k % sides) / sides
            edge = (1 + 0.10 * math.cos(3 * angle + i * 0.18)) * radius
            ring.append(joint + edge * (math.cos(angle) * axis + math.sin(angle) * other))
        rings.append(ring)
    stride = sides + 1
    faces = [(i + j * stride, i + 1 + j * stride, i + 1 + (j + 1) * stride, i + (j + 1) * stride)
             for j in range(len(rings) - 1) for i in range(sides)]
    mesh.add([p for ring in rings for p in ring], faces,
             [(k / sides + offset, (joint - joints[0]).length / 1.8)
              for joint in joints for k in range(stride)], smooth=True)


def leaf(mesh, rng, location, size, style):
    angle = rng.uniform(0, math.tau)
    axis = Vector((math.cos(angle), math.sin(angle), rng.uniform(-1, 1))).normalized()
    tangent = Vector((-math.sin(angle), math.cos(angle), rng.uniform(-0.6, 0.6))) * size
    direction = axis * size
    points = [location - direction, location + direction * 0.12 + tangent * 0.52,
              location + direction, location + direction * 0.12 - tangent * 0.52,
              location + Vector((0, 0, 0.20 * size))]
    mesh.add(points, [(4, (j + 1) % 4, j) for j in range(4)],
             [(0, 0.5), (0.55, 1), (1, 0.5), (0.55, 0), (0.50, 0.5)], style, True)


def tree(rng, wood, leaves, x, y, h, is_cherry, palette_first):
    root = Vector((x, y, -0.05))
    crown = root + Vector((rng.uniform(-0.6, 0.6), rng.uniform(-0.5, 0.5), h))
    trunk = [root, root.lerp(crown, 0.26) + Vector((0.10, -0.12, 0)),
             root.lerp(crown, 0.56) + Vector((-0.16, 0.07, 0)), crown]
    tube(wood, trunk, [h * 0.055, h * 0.037, h * 0.024, 0.022], rng.random())
    twist = rng.uniform(0, math.tau)
    for i in range(8):
        angle = twist + i * 2.39996
        outward = Vector((math.cos(angle), math.sin(angle), 0))
        sideways = Vector((-outward.y, outward.x, 0))
        start = trunk[1].lerp(trunk[2], rng.uniform(0.5, 1.5) + i * 0.07)
        end = crown + outward * h * rng.uniform(0.25, 0.48) + Vector((0, 0, h * rng.uniform(-0.23, 0.05)))
        middle = start.lerp(end, 0.56) + sideways * rng.uniform(-0.35, 0.35)
        tube(wood, [start, middle, end], [h * 0.019, h * 0.010, 0.011], rng.random())
        for j in range(7):
            origin = middle.lerp(end, 0.08 + j / 8)
            radial = sideways * rng.uniform(-1.1, 1.1) + outward * rng.uniform(0.3, 0.9)
            # Weeping cherries curve down at the tips. Maples keep a flatter
            # tier of sideward sprays.
            bend = origin + radial * 0.74 + Vector((0, 0, rng.uniform(0.16, 0.48)))
            tip = bend + radial * 0.53 + Vector((0, 0, rng.uniform(-2.2, -0.55) if is_cherry else rng.uniform(-0.25, 0.2)))
            tube(wood, [origin, bend, tip], [0.029, 0.015, 0.003], rng.random())
            for _ in range(28):
                center = bend.lerp(tip, rng.random())
                center += Vector(tuple(rng.gauss(0, sigma) for sigma in (0.27, 0.27, 0.19)))
                style = palette_first + rng.randrange(3)
                size = rng.uniform(0.09, 0.24) if is_cherry else rng.uniform(0.10, 0.22)
                leaf(leaves, rng, center, size, style)


def build():
    rng = random.Random(SEED)
    gravel = texture_material("Courtyard_Shallow_Granite_Gravel", ((0.13, 0.112, 0.094), (0.32, 0.30, 0.27)),
                              (17, 17), 2.4, 0.92, 1)
    granite = texture_material("Sando_Dressed_Granite", ((0.16, 0.139, 0.116), (0.43, 0.39, 0.35)),
                               (4, 4), 2.0, 0.78, 2)
    moss = texture_material("Courtyard_Moss_and_Root_Soil", ((0.039, 0.045, 0.024), (0.125, 0.148, 0.066)),
                             (3, 3), 1.5, 0.96, 3)
    bark = texture_material("Tree_Fissured_Bark", ((0.036, 0.021, 0.015), (0.14, 0.095, 0.068)),
                             (10, 1), 2.6, 0.9, 4)
    ground = Mesh("Toji_Precinct_Ground")
    rectangle(ground, -240, -240, 240, 240, -0.034, 2)
    ground.create([moss])
    court = Mesh("Toji_Gravel_Court")
    rectangle(court, -21, -45, 21, 42, -0.022, 1.1)
    rectangle(court, -4.22, -83, 4.22, -45, -0.022, 1.1)
    rectangle(court, 21, -28.8, 38.4, -23.2, -0.022, 1.1)
    court.create([gravel])
    paving = Mesh("Toji_Sando_Stonework")
    for row in range(107):
        y = -82 + row * 1.24
        shift = rng.uniform(-0.17, 0.17)
        edges = [-4.2, -2.73 + shift, -1.26 - shift, 0.15 + shift,
                 1.49 - shift, 2.84 + shift, 4.2]
        for a, b in zip(edges, edges[1:]):
            if -17 < y < 2.7:
                continue
            stone(paving, rng, (a + b) / 2, y, b - a - rng.uniform(0.017, 0.035), 1.215,
                  -0.085, rng.uniform(0.002, 0.020))
    for row in range(4):
        for col in range(25):
            stone(paving, rng, 4.83 + col * 1.36, -28.07 + row * 1.38,
                  1.334, 1.353, -0.085, rng.uniform(0.002, 0.020))
    for i in range(100):
        side = rng.choice((-1, 1))
        x = rng.uniform(20.94, 21.03) * side
        y = rng.uniform(-42, 40)
        stone(paving, rng, x, y, rng.uniform(0.10, 0.24), rng.uniform(0.14, 0.47), -0.06,
              rng.uniform(0.014, 0.051), 0.8)
    paving.create([granite])
    trees = (
        (24, 6, 8.9, True), (25.5, -8, 7.1, True), (-22, 24, 7.3, True),
        (-24, -18, 7.0, True), (22, -42, 7.3, True), (-18, 54, 6.0, True),
        (26.5, -18.5, 6.0, False), (44.5, -18, 7.0, False), (48, 8, 7.0, False),
        (-25, 4, 6.8, False), (-22, -44, 6.3, False), (18, 56, 6.6, False),
        (46, 28, 7.0, True), (-36, -12, 9, False), (38, -40, 8, False),
    )
    colors = ((0.66, 0.38, 0.41), (0.79, 0.53, 0.55), (0.48, 0.24, 0.26),
              (0.12, 0.14, 0.04), (0.19, 0.22, 0.065), (0.24, 0.26, 0.075))
    leaf_materials = [material(f"Toji_{'Cherry' if i < 3 else 'Maple'}_{i % 3}", rgb, 0.84)
                      for i, rgb in enumerate(colors)]
    for mat in leaf_materials:
        mat.use_backface_culling = False
    for group_start in range(0, len(trees), 3):
        wood = Mesh(f"Toji_Tree_Branches_{group_start // 3}")
        sprigs = Mesh(f"Toji_Tree_Foliage_{group_start // 3}")
        for x, south, h, is_cherry in trees[group_start:group_start + 3]:
            tree(rng, wood, sprigs, x, -south, h, is_cherry, 0 if is_cherry else 3)
        wood.create([bark])
        sprigs.create(leaf_materials)


    ridges = Mesh("Toji_Grove_Understory")
    for i in range(90):
        azimuth = i * math.tau / 90
        distance = rng.uniform(89, 123)
        foliage_mound(ridges, rng, math.cos(azimuth) * distance, math.sin(azimuth) * distance,
                      -0.24, rng.uniform(6, 12), rng.uniform(1.9, 4.2), 0)
    ridges.create([moss])
    backdrop = Mesh("Toji_Distant_Kyoto_Grove")
    # Compound lumpy silhouettes in two depth bands beyond the playable court.
    # Angular and vertical jitter break straight lines across the horizon.
    for ring in range(2):
        for i in range(76):
            angle = i * math.tau / 76 + rng.uniform(-0.044, 0.044)
            distance = rng.uniform(77, 92) + ring * 39
            # Keep the approach open around the gate axis.
            if math.sin(angle) < -0.93 and abs(math.cos(angle)) < 0.13:
                continue
            x = math.cos(angle) * distance
            y = math.sin(angle) * distance
            height = rng.uniform(4.3, 10) + 2 * ring
            radius = rng.uniform(1.6, 3.2)
            foliage_mound(backdrop, rng, x, y, height * 0.19, radius * 1.36, height * 0.33,
                          ring * 3 + rng.randrange(3))
            for _ in range(rng.randint(5, 8)):
                foliage_mound(backdrop, rng, x + rng.uniform(-radius, radius),
                              y + rng.uniform(-radius, radius), height * rng.uniform(0.35, 0.80),
                              radius * rng.uniform(0.35, 0.89), height * rng.uniform(0.24, 0.37),
                              ring * 3 + rng.randrange(3))
    distant_colors = ((0.036, 0.057, 0.021), (0.047, 0.068, 0.029), (0.057, 0.081, 0.032),
                      (0.041, 0.065, 0.038), (0.053, 0.072, 0.043), (0.048, 0.078, 0.053))
    backdrop.create([texture_material(f"Toji_Grove_{i}",
                                      (tuple(v * 0.55 for v in c), tuple(v * 1.30 for v in c)),
                                      (8, 9), 1.1, 0.95, i + 12, resolution=128)
                     for i, c in enumerate(distant_colors)])


def foliage_mound(mesh, rng, x, y, z, radius, height, style):
    sides = 9
    points = [(x, y, z - height)]
    for row, latitude in enumerate((-0.9, -0.48, 0, 0.53, 0.94)):
        for i in range(sides):
            angle = (i + 0.4 * (row % 2)) * math.tau / sides
            r = math.cos(latitude) * radius * rng.uniform(0.81, 1.17)
            points.append((x + r * math.cos(angle), y + r * math.sin(angle),
                           z + height * math.sin(latitude) + rng.uniform(-0.18, 0.18) * height))
    points.append((x + rng.uniform(-0.32, 0.32) * radius, y, z + height))
    faces = [(0, 1 + (i + 1) % sides, 1 + i) for i in range(sides)]
    faces.extend((1 + row * sides + i, 1 + row * sides + (i + 1) % sides,
                  1 + (row + 1) * sides + (i + 1) % sides, 1 + (row + 1) * sides + i)
                 for row in range(4) for i in range(sides))
    faces.extend((1 + 4 * sides + i, 1 + 4 * sides + (i + 1) % sides, len(points) - 1)
                 for i in range(sides))
    mesh.add(points, faces, [(u / 3, v / 3) for u, v, _ in points], style, True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=PROJECT / "Assets/Toji/TojiCourtyard.glb")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(args.output), export_format="GLB", export_materials="EXPORT",
                              export_yup=True, export_apply=True, export_image_format="AUTO")


if __name__ == "__main__":
    main()
