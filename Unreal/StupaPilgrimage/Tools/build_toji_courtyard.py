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


def stone(mesh, rng, x, y, width, length, bottom, top, uv_scale=1, style=0):
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
                            for u, v, z in points], style)


def tube(mesh, joints, radii, offset, sides=8):
    rings = []
    axis = Vector((1, 0, 0))
    for i, (joint, radius) in enumerate(zip(joints, radii)):
        tangent = (joints[min(i + 1, len(joints) - 1)] - joints[max(0, i - 1)]).normalized()
        axis = axis - tangent * axis.dot(tangent)
        if axis.length < 0.01:
            axis = Vector((0, 1, 0)).cross(tangent)
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


def masked_material(name, rgb, alpha, fill=0):
    mat = material(name, (0.5, 0.5, 0.5), 0.88)
    mat.use_backface_culling = False
    image = bpy.data.images.new(name + "_Mask", alpha.shape[1], alpha.shape[0], alpha=True)
    image.pixels.foreach_set(np.dstack((rgb, alpha)).astype(np.float32).ravel())
    image.pack()
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.extension = "EXTEND"
    cutoff = nodes.new("ShaderNodeMath")
    cutoff.operation = "GREATER_THAN"
    cutoff.inputs[1].default_value = 0.45
    surface = nodes["Principled BSDF"].inputs
    links.new(texture.outputs["Color"], surface["Base Color"])
    if fill:
        # Equalize lighting between distant crossed cards. A restrained
        # luminance contribution complements the normal-based direct light.
        links.new(texture.outputs["Color"], surface["Emission Color"])
        surface["Emission Strength"].default_value = fill
    links.new(texture.outputs["Alpha"], cutoff.inputs[0])
    links.new(cutoff.outputs[0], nodes["Principled BSDF"].inputs["Alpha"])
    return mat


def blossom_atlas():
    """Paint four original corymbs, each with five notched petals per flower."""
    rng = random.Random(SEED + 1)
    n = 256
    x, y = np.meshgrid(np.linspace(-1, 1, n), np.linspace(-1, 1, n))
    rgba = np.zeros((2 * n, 2 * n, 4))
    for tile in range(4):
        row, col = divmod(tile, 2)
        layer = rgba[row*n:(row+1)*n, col*n:(col+1)*n]
        layer[..., :3] = (0.78, 0.43, 0.49)
        rng.seed(SEED + 30 + tile)
        for i in range(9):
            angle = i * 2.39996 + rng.uniform(-0.16, 0.16)
            r = (i / 8) ** 0.55 * rng.uniform(0.53, 0.70)
            cx, cy = math.cos(angle) * r, math.sin(angle) * r
            size = rng.uniform(0.16, 0.24)
            if i:
                along = (cx*x + cy*y) / r
                across = (cy*x - cx*y) / r
                pedicel = (abs(across - 0.015*np.sin(along*9)) < 0.017 - along*0.013)
                layer[pedicel & (along >= -0.025) & (along < r)] = (0.19, 0.063, 0.042, 1)
            for petal in range(5):
                theta = petal * math.tau / 5 + angle
                u = ((x - cx) * math.cos(theta) + (y - cy) * math.sin(theta)) / size
                v = ((y - cy) * math.cos(theta) - (x - cx) * math.sin(theta)) / size
                contour = ((u - 0.56) / 0.49)**2 + (v / 0.42)**2
                notch = (u > 1 - 0.10 * np.exp(-30 * v*v))
                shape = (contour < 1) & ~notch
                vein = np.exp(-abs(v + 0.10 * np.sin(12*u)) * 55)
                glow = np.clip(u * 0.95 + 0.12 - vein * 0.11, 0, 1)
                layer[shape, :3] = np.stack((0.53 + glow*0.42, 0.19 + glow*0.67, 0.29 + glow*0.57), -1)[shape]
                layer[shape, 3] = 1
            center = (x - cx)**2 + (y - cy)**2 < (size * 0.18)**2
            layer[center] = (0.65, 0.32, 0.16, 1)
            for j in range(11):
                a = j * 2.39996
                d = size * rng.uniform(0.07, 0.23)
                pollen = (x - cx - math.cos(a)*d)**2 + (y - cy - math.sin(a)*d)**2 < (size * 0.027)**2
                layer[pollen] = (0.80, 0.61, 0.25, 1)
    return masked_material("Fuji_zakura_Petals_and_Pedicels", rgba[..., :3], rgba[..., 3])


def foliage_card(mesh, rng, center, radius, style, tile=None, upright=False):
    phi = rng.uniform(0, math.tau)
    along = Vector((math.cos(phi), math.sin(phi), rng.uniform(-0.65, 0.65))).normalized()
    tilt = rng.uniform(-0.85, 0.85)
    if upright:
        tilt = math.copysign(0.56 + 0.90 * abs(tilt), tilt)
    across = Vector((-math.sin(phi), math.cos(phi), tilt)).normalized()
    if tile is not None:
        row, col = divmod(tile, 2)
        points = [center + radius*(u*along + v*across) for u,v in ((-1,-1), (1,-1), (1,1), (-1,1))]
        points.append(center + radius * Vector((0, 0, 0.12)))
        uvs = [((col+u)/2, (row+v)/2) for u,v in ((0.01,0.01),(0.99,0.01),(0.99,0.99),(0.01,0.99),(0.50,0.50))]
        mesh.add(points, [(4, j, (j+1)%4) for j in range(4)], uvs, style, True)
    else:
        points = [center + radius*(u*along + v*across) for u,v in
                  ((0,0),(.26,-.29),(.54,-.32),(1,0),(.61,.25),(.26,.30))]
        points.append(center + radius*(.53*along + Vector((0, 0, 0.13))))
        mesh.add(points, [(6,j,(j+1)%6) for j in range(6)], [(0,0)]*7, style, True)


def tree(rng, wood, leaves, x, y, h, is_cherry, hero=False):
    root = Vector((x, y, -0.05))
    crown = root + Vector((rng.uniform(-0.6, 0.6), rng.uniform(-0.5, 0.5), h))
    trunk = [root, root.lerp(crown, 0.12) + Vector((0.16, -0.09, 0)),
             root.lerp(crown, 0.30) + Vector((0.24, 0.04, 0)),
             root.lerp(crown, 0.46) + Vector((-0.02, 0.09, 0)),
             root.lerp(crown, 0.61) + Vector((-0.17, 0.20, 0)),
             root.lerp(crown, 0.80) + Vector((0.10, 0.02, 0)), crown]
    tube(wood, trunk, [h*0.060, h*0.041, h*0.035, h*0.031, h*0.022, h*0.014, 0.013], rng.random())
    for i in range(5):
        angle = i * math.tau / 5 + rng.uniform(-0.21, 0.21)
        root_tip = root + Vector((math.cos(angle), math.sin(angle), -0.15)) * rng.uniform(0.65, 1.13)
        tube(wood, [root+Vector((0,0,0.31)), root.lerp(root_tip,0.66), root_tip], [0.125,0.07,0.018], rng.random())
    twist = rng.uniform(0, math.tau)
    branches = 8 if hero else 7
    sprays = 7 if hero else 5
    twigs = 7 if hero else 4
    spread = h * (1.4 if hero else 1)
    for i in range(branches):
        angle = twist + i * 2.39996
        outward = Vector((math.cos(angle), math.sin(angle), 0))
        sideways = Vector((-outward.y, outward.x, 0))
        start = trunk[2+i//2].lerp(trunk[3+i//2], rng.uniform(0.12, 0.88))
        end = crown + outward * spread * rng.uniform(0.25, 0.48) + Vector((0, 0, h * rng.uniform(-0.23, 0.05)))
        shoulder = start.lerp(end, 0.24) - outward * 0.22 + Vector((0, 0, 0.17))
        middle = start.lerp(end, 0.58) + sideways * rng.uniform(-0.46, 0.46)
        tube(wood, [start, shoulder, middle, end], [h * 0.021, h * 0.015, h * 0.009, 0.011], rng.random())
        for j in range(sprays):
            origin = middle.lerp(end, 0.08 + j / (sprays + 1))
            fan = (-1 if j % 2 else 1) * rng.uniform(0.69, 1.50)
            radial = sideways * fan + outward * rng.uniform(0.20, 0.75)
            # Weeping cherries curve down at the tips. Maples keep a flatter
            # tier of sideward sprays.
            bend = origin + radial * 0.74 + Vector((0, 0, rng.uniform(0.16, 0.48)))
            tip = bend + radial * 0.53 + Vector((0, 0, rng.uniform(-2.35, -0.72) if is_cherry else rng.uniform(-0.25, 0.2)))
            tube(wood, [origin, bend, tip], [0.029, 0.015, 0.003], rng.random())
            for k in range(twigs):
                origin = bend.lerp(tip, (k + 1) / (twigs + 1))
                reach = rng.uniform(0.19, 0.46)
                side = -1 if k % 2 else 1
                twig = origin + reach*(side*sideways + 0.44*outward) + Vector((0,0,-reach*0.84))
                tube(wood, [origin, origin.lerp(twig, 0.64), twig], [0.008, 0.004, 0.0017], rng.random(), sides=4)
                clusters = 3 if is_cherry else 4
                for m in range(clusters):
                    center = origin.lerp(twig, 0.56 + m * (0.40 / (clusters - 1)))
                    if is_cherry:
                        radius = rng.uniform(0.16, 0.24) * (1.55 if hero else 1)
                        foliage_card(leaves, rng, center, radius, 0, rng.randrange(4), upright=hero)
                    else:
                        foliage_card(leaves, rng, center, rng.uniform(0.15, 0.27), 1 + rng.randrange(3))


def build():
    rng = random.Random(SEED)
    gravel = texture_material("Courtyard_Shallow_Granite_Gravel", ((0.13, 0.112, 0.094), (0.32, 0.30, 0.27)),
                              (17, 17), 0.85, 0.92, 1)
    granite = texture_material("Sando_Dressed_Granite", ((0.16, 0.139, 0.116), (0.43, 0.39, 0.35)),
                               (4, 4), 0.65, 0.78, 2)
    moss = texture_material("Courtyard_Moss_and_Root_Soil", ((0.039, 0.045, 0.024), (0.125, 0.148, 0.066)),
                             (3, 3), 1.5, 0.96, 3)
    bark = texture_material("Tree_Fissured_Bark", ((0.036, 0.021, 0.015), (0.14, 0.095, 0.068)),
                             (10, 1), 2.6, 0.9, 4)
    ground = Mesh("Toji_Precinct_Ground")
    rectangle(ground, -240, -240, 240, 240, -0.034, 2)
    ground.create([moss])
    court = Mesh("Toji_Gravel_Court")
    for i in range(116):
        south, north = -45 + i*0.75, -45 + (i+1)*0.75
        left, right = court_edges(south)
        next_left, next_right = court_edges(north)
        points = [(left,south,-0.022),(right,south,-0.022),
                  (next_right,north,-0.022),(next_left,north,-0.022)]
        court.add(points, [(0,1,2,3)], [(x/1.1,y/1.1) for x,y,_ in points])
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
        y = rng.uniform(-42, 40)
        x = court_edges(y)[side == 1] + rng.uniform(-0.13, 0.11)
        stone(paving, rng, x, y, rng.uniform(0.10, 0.24), rng.uniform(0.14, 0.47), -0.06,
              rng.uniform(0.014, 0.051), 0.8)
    paving.create([granite])
    trees = (
        (24, 6, 7.1, True), (25.5, -8, 7.1, True), (-22, 24, 7.3, True),
        (-24, -18, 7.0, True), (22, -42, 7.3, True), (-18, 54, 6.0, True),
        (26.5, -18.5, 6.0, False), (44.5, -18, 7.0, False), (48, 8, 7.0, False),
        (-25, 4, 6.8, False), (-22, -44, 6.3, False), (18, 56, 6.6, False),
        (46, 28, 7.0, True), (-36, -12, 9, False), (38, -40, 8, False),
    )
    colors = ((0.12, 0.14, 0.04), (0.19, 0.22, 0.065), (0.24, 0.26, 0.075))
    leaf_materials = [blossom_atlas()] + [material(f"Toji_Maple_{i}", rgb, 0.84)
                                          for i, rgb in enumerate(colors)]
    for mat in leaf_materials:
        mat.use_backface_culling = False
    for group_start in range(0, len(trees), 3):
        wood = Mesh(f"Toji_Tree_Branches_{group_start // 3}")
        sprigs = Mesh(f"Toji_Tree_Foliage_{group_start // 3}")
        for x, south, h, is_cherry in trees[group_start:group_start + 3]:
            tree(rng, wood, sprigs, x, -south, h, is_cherry, hero=(x, south) == (24, 6))
        wood.create([bark])
        sprigs.create(leaf_materials)


    add_verge(rng, moss, gravel)
    add_wooded_ridge(rng, moss)


def court_edges(y):
    return (-21 + 0.58*math.sin(y*0.18) + 0.21*math.sin(y*0.97),
             21 + 0.52*math.sin(y*0.20) + 0.22*math.cos(y*0.91))


def add_verge(rng, moss, gravel):
    verge = Mesh("Toji_Field_Stone_and_Moss_Edges")
    soil = texture_material("Toji_Damp_Root_Soil", ((0.055,0.032,0.013), (0.18,0.115,0.059)),
                            (7,9), 2.1, 0.96, 9, resolution=256)
    grass = Mesh("Toji_Verge_Sedge_and_Moss")
    colors = ((0.08,0.12,0.024),(0.14,0.17,0.042),(0.19,0.19,0.060))
    grass_materials = [material(f"Toji_Sedge_{i}", c, 0.93) for i,c in enumerate(colors)]
    for m in grass_materials:
        m.use_backface_culling = False
    for _ in range(1100):
        side = rng.choice((-1,1))
        y = rng.uniform(-45,42)
        x = court_edges(y)[side == 1] + side * rng.gauss(0.18,1.13)
        radius = rng.uniform(0.045,0.42)
        # Keep dressed path and model access route bare.
        if x > 0 and -29.0 < y < -23.0:
            continue
        if rng.random() < 0.55:
            # Sparse embedded stones and shallower dark damp grit between them.
            stone(verge, rng, x, y, radius * 1.36, radius * 1.21, -0.044,
                  rng.uniform(-0.019, -0.008), 0.66, rng.randrange(3))
        else:
            for _ in range(rng.randint(6,12)):
                angle = rng.uniform(0, math.tau)
                lean = rng.uniform(0.023,0.12)
                wide = rng.uniform(0.006,0.022)
                height = rng.uniform(0.032,0.17)
                px, py = x+rng.gauss(0,radius*.26), y+rng.gauss(0,radius*.26)
                bend = (px+math.cos(angle)*lean,py+math.sin(angle)*lean,height)
                grass.add([(px-math.sin(angle)*wide,py+math.cos(angle)*wide,-0.018),
                           (px+math.sin(angle)*wide,py-math.cos(angle)*wide,-0.018),
                           bend],[(0,1,2)],[(0,0),(1,0),(.5,1)],rng.randrange(3))
    # Break larger stretches of lawn with irregular groups, especially where
    # the roots meet the ground on the visible approach.
    for x, y in [(24, -6), (25.5, 8), (-22, -24), (23, -19), (25, -18)]:
        for _ in range(38):
            px, py = x + rng.gauss(0, 0.88), y + rng.gauss(0, 1.08)
            radius = rng.uniform(0.03, 0.18)
            stone(verge, rng, px, py, radius * 1.7, radius, -0.053,
                  rng.uniform(-0.022, -0.009), 0.66, rng.choice((0, 0, 1)))
    verge.create([moss,soil,gravel])
    grass.create(grass_materials)


def add_wooded_ridge(rng, moss):
    ridge = Mesh("Toji_Rolling_Wooded_Ridge")
    forest = Mesh("Toji_Distant_Cryptomeria")
    count = 160
    bands = (83, 98, 111, 128, 147, 166, 181)
    profile = (0, 1.7, 5.1, 12.2, 8.4, 2.0, 0)
    points = []
    for r, h in zip(bands,profile):
        for i in range(count):
            theta = i * math.tau / count
            slope = .86 + .26*math.sin(theta*5) + .12*math.sin(theta*11+.7)
            points.append((r*math.cos(theta),r*math.sin(theta),h*slope-.035))
    faces = [(row*count+i,(row+1)*count+i,(row+1)*count+(i+1)%count,
              row*count+(i+1)%count) for row in range(len(bands)-1) for i in range(count)]
    ridge.add(points,faces,[(x/4,y/4) for x,y,_ in points],smooth=True)
    ridge.create([moss])
    # Contiguous, stratified canopies with tapering non-convex tiers.
    for row, trees_in_band in enumerate((151, 175, 168, 164)):
        for i in range(trees_in_band):
            theta = (i + rng.uniform(-0.72, 0.72)) * math.tau / trees_in_band
            radius = bands[row+1]+rng.uniform(-3.5,3.5)
            if math.sin(theta) < -0.96 and abs(math.cos(theta)) < 0.14:
                continue
            height = rng.uniform(4.8,9.4)
            base = (radius*math.cos(theta),radius*math.sin(theta),
                    profile[row+1]*(.86+.26*math.sin(theta*5)+.12*math.sin(theta*11+.7))-.4)
            distant_cedar(forest, rng, base, height, rng.uniform(2.7, 4.1), rng.randrange(4))
    forest.create([cedar_atlas()])


def cedar_atlas():
    """Needle sprays painted in fine irregular shelves for the wooded ridge."""
    rng = random.Random(SEED + 9)
    n = 256
    rgba = np.zeros((2*n, 2*n, 4))
    for tile in range(4):
        row, col = divmod(tile, 2)
        layer = rgba[row*n:(row+1)*n, col*n:(col+1)*n]
        layer[..., :3] = (0.052, 0.090, 0.043)
        trunk = rng.randint(123, 132)
        layer[5:230, trunk-1:trunk+2] = (0.048, 0.034, 0.019, 1)
        for tier in range(32):
            stem = 26 + tier * 6 + rng.randint(-3, 3)
            width = (1 - (stem - 24) / 228)**0.72 * rng.uniform(57, 107)
            for side in (-1, 1):
                span = width * rng.uniform(0.73, 1.05)
                tint = rng.uniform(0.62, 1.36)
                for twig in range(29):
                    progress = twig / 29
                    x = trunk + side * span * progress + rng.uniform(-4, 4)
                    y = stem + 11 * progress - 9 * progress**2 + rng.uniform(-4, 4)
                    for _ in range(8):
                        px = int(x + rng.gauss(0, 2.1))
                        py = int(y + rng.gauss(0, 2.8))
                        if 4 <= px < n-4 and 4 <= py < n-4:
                            color = tint * rng.uniform(0.76, 1.24)
                            layer[py-1:py+2, px:px+2] = (0.042*color, 0.091*color, 0.044*color, 1)
        for y in range(215, 248):
            width = max(1, (250-y) // 4)
            for x in range(trunk-width, trunk+width+1):
                if rng.random() > 0.17:
                    layer[y, x] = (0.053, 0.104, 0.049, 1)
    return masked_material("Toji_Cryptomeria_Needle_Shelves", rgba[..., :3], rgba[..., 3], fill=0.20)


def distant_cedar(mesh, rng, base, height, spread, tile):
    row, col = divmod(tile, 2)
    root = Vector(base)
    up = Vector((rng.uniform(-0.58, 0.58), rng.uniform(-0.58, 0.58), height))
    azimuth = rng.uniform(0, math.tau)
    for i in range(3):
        angle = azimuth + i * math.pi / 3
        across = Vector((math.cos(angle), math.sin(angle), 0)) * spread
        points = (root-across, root+across, root+up+across, root+up-across)
        uv = [((col+u)/2, (row+v)/2) for u,v in ((0.01,0.01),(0.99,0.01),(0.99,0.99),(0.01,0.99))]
        mesh.add(points, [(0,1,2,3)], uv)


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
