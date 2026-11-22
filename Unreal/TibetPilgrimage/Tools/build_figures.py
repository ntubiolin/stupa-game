"""Model original figures for the Nepal–Tibet pilgrimage. Blender units are meters."""
from array import array
import json
from math import cos, exp, pi, sin, tau
from pathlib import Path
import sys

import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parent.parent / "Assets/Figures"
JOINTS = {
    "PilgrimLeftLeg": (-.12, 0, .84), "PilgrimRightLeg": (.12, 0, .84),
    "PilgrimLeftCalf": (-.12, 0, .47), "PilgrimRightCalf": (.12, 0, .47),
    "PilgrimLeftSleeve": (-.23, 0, 1.35), "PilgrimRightSleeve": (.23, 0, 1.35),
}


def surface(name, rgb, rough=.84, weave=0, metal=0.0, emit=0.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    shader = nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Roughness"].default_value = rough
    if "Metallic" in shader.inputs:
        shader.inputs["Metallic"].default_value = metal
    if emit > 0:
        if "Emission Color" in shader.inputs:
            shader.inputs["Emission Color"].default_value = (*rgb, 1)
        elif "Emission" in shader.inputs:
            shader.inputs["Emission"].default_value = (*rgb, 1)
        if "Emission Strength" in shader.inputs:
            shader.inputs["Emission Strength"].default_value = emit
    # Note: UE FBX import disables texture import (import_textures=False) and FBX does not embed
    # packed procedural images by default, which otherwise causes missing-texture magenta in Cycles.
    if False and weave:
        width = 96
        img_name = name + "_weave"
        image = bpy.data.images.get(img_name) or bpy.data.images.new(img_name, width, width)
        pixels = array("f")
        for row in range(width):
            for col in range(width):
                pattern = .29 * sin(col * pi / 2) + .25 * sin(row * pi / 2) + .11 * cos((col + row) * pi / 4)
                linear = tuple(max(0.0, min(1.0, color * (1 + weave * pattern))) for color in rgb)
                srgb = tuple(12.92 * c if c <= .0031308 else 1.055 * (c ** (1 / 2.4)) - .055 for c in linear)
                pixels.extend((*srgb, 1))
        image.pixels.foreach_set(pixels)
        image.pack()
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = image
        mat.node_tree.links.new(tex.outputs["Color"], shader.inputs["Base Color"])
    return mat


def mesh(name, vertices, faces, mat, uv=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    layer = data.uv_layers.new(name="UVMap") if uv else None
    for poly in data.polygons:
        poly.use_smooth = True
        if layer:
            indices = poly.loop_indices
            values = [uv[data.loops[i].vertex_index][0] for i in indices]
            wraps = max(values) - min(values) > .5
            for index in indices:
                u, v = uv[data.loops[index].vertex_index]
                layer.data[index].uv = ((u + (wraps and u < .5)) * 3, v * 4)
    return obj


def profiles(rows):
    rows = [(Vector(r[:3]), Vector(r[3:])) for r in rows]
    points = []
    for i in range(len(rows) - 1):
        for n in range(2):
            t = n / 2
            row = []
            for col in range(2):
                a, b, c, d = (rows[j][col] for j in (max(0, i - 1), i, i + 1, min(i + 2, len(rows) - 1)))
                row += list(.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t))
            points.append(row)
    return points + [[*rows[-1][0], *rows[-1][1]]]


def loft(name, rows, mat, rings=24, folds=0, sculpt=None):
    # Rows: height, transverse radius, forward radius, transverse center, forward center.
    vertices, uv = [], []
    rows = profiles(rows)
    for j, (z, width, depth, x, y) in enumerate(rows):
        t = j / (len(rows) - 1)
        for i in range(rings):
            a = i * tau / rings
            crease = (.68 * sin(a * 9 + 1.3 * sin(t * 6)) + .22 * sin(a * 17 - 1.8 * t) + .1 * sin(a * 4 + t * 15))
            ridge = (sin(pi * t) ** .65) * folds * crease
            v = (x + (max(.001, width) + ridge) * cos(a), y + (max(.001, depth) + ridge) * sin(a), z)
            vertices.append(sculpt(v, a) if sculpt else v)
            uv.append((i / rings, t))
    faces = []
    for row in range(len(rows) - 1):
        for i in range(rings):
            a, b = row * rings + i, row * rings + (i + 1) % rings
            faces.append((a, b, b + rings, a + rings))
    faces.extend((tuple(reversed(range(rings))), tuple(range(len(vertices) - rings, len(vertices)))))
    return mesh(name, vertices, faces, mat, uv)


def oval(name, position, scale, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=position, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def box_part(name, position, scale, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=position, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    return obj


def cord(name, points, radius, mat, detail=2):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    data.bevel_resolution = detail
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for pt, v in zip(spline.points, points):
        pt.co = (*v, 1)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    return obj


def horn(name, route, radii, mat, sides=14):
    verts, faces = [], []
    for i, pt in enumerate(route):
        axis = (Vector(route[min(i + 1, len(route) - 1)]) - Vector(route[max(0, i - 1)])).normalized()
        if axis.length < 1e-6:
            axis = Vector((0, 0, 1))
        up_ref = Vector((0, 1, 0)) if abs(axis.y) < .9 else Vector((1, 0, 0))
        right = axis.cross(up_ref).normalized()
        across = axis.cross(right).normalized()
        for j in range(sides):
            a = tau * j / sides
            verts.append(Vector(pt) + radii[i] * (right * cos(a) + across * sin(a)))
            if i:
                k = (i - 1) * sides + j
                n = (i - 1) * sides + (j + 1) % sides
                faces.append((k, n, n + sides, k + sides))
    return mesh(name, verts, faces, mat)


def ribbon(name, spine_a, spine_b, mat):
    verts, faces = [], []
    for i, (pa, pb) in enumerate(zip(spine_a, spine_b)):
        verts.extend((pa, pb))
        if i:
            k = (i - 1) * 2
            faces.append((k, k + 1, k + 3, k + 2))
            faces.append((k + 2, k + 3, k + 1, k))
    return mesh(name, verts, faces, mat)


def head(skin, dark):
    """Balanced 1:7.2 human head with sculpted Himalayan facial planes, brows, eyes and ears."""
    def anatomy(vertex, a):
        x, y, z = vertex
        front = max(0, sin(a)) ** 4
        nose = .034 * exp(-((x / .021) ** 2 + ((z - 1.576) / .019) ** 2))
        bridge = .016 * exp(-((x / .015) ** 2 + ((z - 1.606) / .024) ** 2))
        brow = .010 * exp(-((x / .058) ** 2 + ((z - 1.630) / .012) ** 2))
        socket = -.013 * exp(-(((abs(x) - .038) / .022) ** 2 + ((z - 1.610) / .014) ** 2))
        cheek = .012 * exp(-(((abs(x) - .053) / .029) ** 2 + ((z - 1.578) / .020) ** 2))
        chin = .011 * exp(-((x / .028) ** 2 + ((z - 1.518) / .015) ** 2))
        mouth = .009 * exp(-((x / .030) ** 2 + ((z - 1.545) / .009) ** 2))
        return x, y + front * (nose + bridge + brow + socket + cheek + chin + mouth), z

    rows = [
        (1.455, .054, .053, 0, .002),
        (1.498, .058, .058, 0, .005),
        (1.522, .072, .080, 0, .012),
        (1.555, .089, .092, 0, .004),
        (1.592, .097, .099, 0, -.004),
        (1.632, .098, .101, 0, -.011),
        (1.670, .086, .091, 0, -.016),
        (1.700, .055, .058, 0, -.016),
        (1.716, .008, .008, 0, -.014),
    ]
    sclera = surface("EyeSclera", (.88, .85, .80), .45)
    lip_tint = surface("LipWarm", (.32, .13, .10), .72)
    result = [loft("Sculpted face", rows, skin, 48, sculpt=anatomy)]
    for side in (-1, 1):
        result.append(oval("Ear", (.095 * side, -.006, 1.590), (.015, .020, .031), skin, (0, side * -.12, 0)))
        result.append(oval("Sclera", (side * .036, .082, 1.606), (.014, .007, .0075), sclera))
        result.append(oval("Iris", (side * .036, .087, 1.606), (.008, .0045, .0065), dark))
        result.append(cord("Upper eyelid", [(x * side, y, z) for x, y, z in
            [(.020, .086, 1.608), (.035, .090, 1.612), (.051, .083, 1.607)]], .0018, dark))
        result.append(cord("Eyebrow", [(x * side, y, z) for x, y, z in
            [(.016, .089, 1.628), (.036, .092, 1.633), (.058, .080, 1.626)]], .0026, dark))
    result.append(cord("Upper lip", [(-.024, .088, 1.545), (-.009, .096, 1.547),
        (.009, .096, 1.547), (.024, .088, 1.545)], .0022, lip_tint))
    return result


def torso(outer, collar, waist, pilgrim):
    """Natural sloped-shoulder chuba/robe torso with pleated skirt drape."""
    skirt = [(.755, .212, .142, 0, 0), (.860, .198, .136, 0, 0)] if pilgrim else [
        (.055, .268, .192, 0, -.006), (.115, .282, .202, 0, 0), (.420, .248, .174, 0, 0),
        (.750, .212, .154, 0, -.006)]
    rows = skirt + [
        (.985, .178, .128, 0, -.006),
        (1.105, .188, .134, 0, -.010),
        (1.255, .204, .136, 0, -.005),
        (1.355, .182, .112, 0, .002),
        (1.425, .086, .072, 0, .008),
        (1.472, .058, .056, 0, .004),
    ]
    result = [loft("Gathered robes", rows, outer, 48, .022)]
    result.append(loft("Bound sash", [(.945, .184, .132, 0, 0), (.975, .194, .140, 0, -.004),
        (1.028, .194, .140, 0, -.005), (1.052, .183, .131, 0, -.005)], waist, 36, .005))
    for side in (-1, 1):
        route = [(side * .062, .062, 1.448), (side * .090, .102, 1.406), (side * .088, .132, 1.360),
                 (side * .064, .144, 1.312), (0, .150, 1.262), (-side * .076, .146, 1.198), (-side * .128, .122, 1.132)]
        vertices = [(x + width, y + .003 + .010 * (1 - abs(width) / .024), z + width * .32)
                    for x, y, z in route for width in (-.024, 0, .024)]
        result.append(mesh("Folded overlapping collar", vertices,
            [(a, a + 1, a + 4, a + 3) for r in range(len(route) - 1)
             for c in range(2) for a in [r * 3 + c]], collar,
            [(j / 2, r / (len(route) - 1)) for r in range(len(route)) for j in range(3)]))
    return result


def arm(side, cloth, cuff, skin):
    x = side * .205
    rows = [
        (.880, .048, .054, x + side * .052, .024),
        (.915, .058, .063, x + side * .050, .020),
        (1.005, .066, .070, x + side * .044, .012),
        (1.135, .071, .072, x + side * .032, -.010),
        (1.255, .068, .068, x + side * .018, -.009),
        (1.352, .058, .060, x - side * .005, -.008),
        (1.398, .038, .046, x - side * .018, -.010),
    ]
    result = [loft("Hanging sleeve", rows, cloth, 32, .011)]
    result.append(loft("Sleeve hem", [(.872, .049, .055, x + side * .052, .024),
        (.892, .055, .060, x + side * .051, .022), (.906, .057, .062, x + side * .050, .020)], cuff, 32))
    result.append(oval("Resting hand", (x + side * .052, .030, .845), (.026, .021, .052), skin))
    result.append(oval("Thumb", (x + side * .034, .044, .858), (.010, .010, .028), skin))
    return result


def combine(name, pieces, pivot=(0, 0, 0)):
    bpy.ops.object.select_all(action="DESELECT")
    for piece in pieces:
        piece.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = obj.data.name = name
    bpy.context.view_layer.update()
    obj.data.transform(obj.matrix_world.copy())
    obj.location = obj.rotation_euler = (0, 0, 0)
    obj.scale = (1, 1, 1)
    for vertex in obj.data.vertices:
        vertex.co -= Vector(pivot)
    return obj


def tall_boot(x, wool, leather, trim=None):
    felt = trim or wool
    shaft = [(0.05, .062, .074, x, 0), (.22, .059, .067, x, 0), (.37, .072, .078, x, 0),
             (.41, .074, .080, x, 0)]
    parts = [
        loft("Soft boot shaft", shaft, leather, 32, .005),
        oval("Stitched sole", (x, .046, .048), (.072, .142, .048), leather),
        oval("Upturned Tibetan toe", (x, .165, .058), (.042, .045, .036), leather, (.35, 0, 0)),
        loft("Boot garter band", [(.355, .074, .080, x, 0), (.385, .076, .082, x, 0)], felt, 32),
        loft("Wool trouser", [(.38, .068, .075, x, 0), (.49, .076, .078, x, -.004),
             (.68, .066, .070, x, -.005), (.84, .054, .058, x, 0)], wool, 32, .005),
    ]
    return parts


def vajra_scepter(center, scale, gold_mat):
    cx, cy, cz = center
    parts = [oval("Vajra hub", center, (.032 * scale, .032 * scale, .042 * scale), gold_mat)]
    for sign in (-1, 1):
        parts.append(loft("Vajra lotus base", [
            (cz + sign * .035 * scale, .028 * scale, .028 * scale, cx, cy),
            (cz + sign * .075 * scale, .044 * scale, .044 * scale, cx, cy),
            (cz + sign * .095 * scale, .022 * scale, .022 * scale, cx, cy),
        ], gold_mat, 16))
        parts.append(horn("Vajra central prong", [
            (cx, cy, cz + sign * .085 * scale),
            (cx, cy, cz + sign * .225 * scale),
        ], [.018 * scale, .003 * scale], gold_mat, 8))
        for k in range(4):
            a = k * tau / 4 + pi / 4
            dx, dy = cos(a), sin(a)
            parts.append(horn("Vajra outer prong", [
                (cx + dx * .022 * scale, cy + dy * .022 * scale, cz + sign * .088 * scale),
                (cx + dx * .068 * scale, cy + dy * .068 * scale, cz + sign * .158 * scale),
                (cx + dx * .010 * scale, cy + dy * .010 * scale, cz + sign * .222 * scale),
            ], [.012 * scale, .011 * scale, .003 * scale], gold_mat, 8))
    return parts


def beast(yak, fur, mane, face_mat, ivory, eye, gold_trim=None):
    parts = []
    def ell(name, p, s, m, rot=(0, 0, 0)):
        parts.append(oval(name, p, s, m, rot))

    if yak:
        # Majestic Sacred White Yak of Mount Yarlha Shampo (Ch.3):
        # Towering snow-white shoulder hump, swept gilded-ivory horns, long shaggy white skirt fringes, turquoise/gold spirit eyes.
        gilt = gold_trim or ivory
        ell("Rib cage", (0, -.14, 1.08), (.48, .90, .56), fur)
        ell("Sacred withers hump", (0, .32, 1.38), (.45, .55, .49), mane)
        ell("Neck dewlap", (0, .60, .98), (.28, .36, .34), mane)
        ell("Noble brow", (0, .74, 1.18), (.26, .34, .36), fur)
        ell("Muzzle", (0, 1.00, .96), (.19, .22, .16), face_mat)
        # Sacred golden forehead sun-disc & horn rings
        ell("Sacred brow jewel", (0, .96, 1.24), (.055, .028, .062), gilt)
        parts.append(cord("Golden nose ring", [(-.075, 1.17, .91), (-.095, 1.21, .84),
            (0, 1.23, .81), (.095, 1.21, .84), (.075, 1.17, .91)], .014, gilt))
        for side in (-1, 1):
            for fore in (-.64, .42):
                x = side * .295
                ell("Muscular leg", (x, fore, .55), (.145, .17, .42), fur)
                ell("Fetlock tuft", (x, fore - .02, .28), (.13, .15, .18), mane)
                ell("Cloven hoof", (x, fore + .03, .11), (.102, .142, .115), face_mat)
            # Sweeping curved horns with golden base bands
            parts.append(horn("Swept sacred horn", [
                (side * .16, .74, 1.32),
                (side * .44, .72, 1.36),
                (side * .66, .65, 1.58),
                (side * .62, .70, 1.84),
                (side * .50, .74, 1.96),
            ], [.105, .086, .056, .028, .004], ivory))
            parts.append(horn("Gilt horn band", [
                (side * .17, .74, 1.32), (side * .28, .73, 1.34)
            ], [.112, .102], gilt))
            ell("Spirit eye", (side * .195, .92, 1.22), (.032, .030, .032), eye)
            ell("Shaggy ear", (side * .25, .64, 1.22), (.09, .05, .045), fur, (0, 0, side * .3))
            # Rich layered Tibetan yak flank skirt fringes ("bal")
            for j in range(20):
                y = -.88 + j * .078
                parts.append(horn("Yak flank curtain", [
                    (side * .36, y, 1.02),
                    (side * .47, y - .015, .70),
                    (side * (.43 + .03 * cos(j)), y - .06, .26 + .05 * sin(j)),
                ], [.105, .085, .008], mane))
        # Lush upturned yak tail plume
        parts.append(horn("Bushy white tail", [
            (0, -.86, 1.20), (0, -1.12, 1.04), (.04, -1.24, .68), (0, -1.18, .38)
        ], [.085, .135, .145, .025], mane))
    else:
        # Hulking Himalayan Migoi / Yeti with layered frost fur, fanged jaw & clawed fists
        ell("Massive hunched shoulders", (0, -.03, 1.42), (.50, .34, .40), mane)
        ell("Broad rib cage", (0, 0, 1.10), (.38, .29, .46), fur)
        ell("Pelvis", (0, -.02, .78), (.31, .24, .24), mane)
        ell("Craggy skull", (0, .06, 1.78), (.23, .22, .24), fur)
        ell("Fanged muzzle", (0, .22, 1.68), (.145, .105, .10), face_mat)
        ell("Broad nose", (0, .29, 1.73), (.065, .035, .038), face_mat)
        for side in (-1, 1):
            ell("Heavy ice brow", (side * .095, .21, 1.84), (.108, .062, .042), mane, (0, side * -.18, 0))
            ell("Glowing eye", (side * .088, .245, 1.80), (.028, .024, .024), eye)
            parts.append(horn("Lower tusk", [
                (side * .068, .28, 1.62), (side * .078, .33, 1.72)
            ], [.024, .003], ivory, 8))
            for k in range(10):
                a = -pi * .82 + k * pi * 1.64 / 9
                rx, ry = .42 * cos(a), .28 * sin(a)
                parts.append(horn("Shoulder fur tuft", [
                    (rx, ry, 1.54), (rx * 1.28, ry * 1.24, 1.34), (rx * 1.24, ry * 1.20, 1.12 + .06 * cos(k))
                ], [.095, .072, .008], mane))
            # Long powerful simian-alpine arms & claws
            parts.append(horn("Muscular arm", [
                (side * .38, -.02, 1.38), (side * .52, .06, 1.10), (side * .49, .16, .82)
            ], [.142, .132, .118], fur))
            ell("Knuckle fist", (side * .50, .18, .76), (.135, .135, .125), face_mat)
            for c in (-1, 0, 1):
                parts.append(horn("Ice claw", [
                    (side * .50 + c * .04, .27, .75), (side * .50 + c * .045, .35, .66)
                ], [.022, .003], ivory, 8))
            ell("Thigh", (side * .19, 0, .64), (.168, .178, .29), fur)
            ell("Calf", (side * .20, -.02, .32), (.125, .138, .25), mane)
            ell("Foot", (side * .20, .07, .095), (.138, .215, .092), face_mat)
    return parts


def build_terma_guardian():
    """Wrathful Bronze-and-Gold Terma Dharmapala Sentinel (Ch.5 Vault Boss)."""
    basalt = surface("GuardianBasalt", (.11, .11, .13), .52, metal=.38)
    gold = surface("GuardianGold", (.76, .49, .11), .30, metal=.82)
    cinnabar = surface("GuardianCinnabar", (.52, .065, .042), .68, weave=.06)
    turquoise = surface("GuardianTurquoise", (.05, .44, .40), .34, metal=.15, emit=.25)
    flame = surface("GuardianFlame", (.88, .26, .03), .45, emit=.65)
    ivory = surface("GuardianSkull", (.82, .76, .64), .62)
    amber_eye = surface("GuardianEye", (1.0, .62, .08), .20, emit=1.4)

    parts = []
    # Lotus stone plinth & wrathful armored stance
    parts.append(loft("Armored dhoti skirt", [
        (.04, .34, .25, 0, 0), (.18, .36, .26, 0, 0), (.52, .31, .22, 0, 0),
        (.88, .26, .19, 0, 0), (1.02, .25, .18, 0, 0),
    ], cinnabar, 40, .028))
    # Armored basalt-and-gold chest cuirass
    parts.append(loft("Wrathful cuirass", [
        (.96, .25, .18, 0, 0), (1.14, .29, .21, 0, .01),
        (1.36, .34, .23, 0, .015), (1.50, .26, .18, 0, 0), (1.56, .11, .10, 0, 0),
    ], basalt, 40, .008))
    # Gilded mirror breastplate & crossed-vajra emblem + waist belt
    parts.append(loft("Gilt waist girdle", [
        (.93, .268, .195, 0, 0), (1.03, .272, .198, 0, 0)
    ], gold, 36, .006))
    parts.append(oval("Breastplate melong", (0, .215, 1.28), (.135, .035, .135), gold))
    parts.append(oval("Turquoise heart gem", (0, .242, 1.28), (.048, .022, .048), turquoise))
    for k in range(4):
        a = k * tau / 4
        parts.append(horn("Crossed vajra spoke", [
            (0, .235, 1.28), (.115 * cos(a), .238, 1.28 + .115 * sin(a))
        ], [.018, .005], gold, 8))

    # Gilded tasset plates around hips
    for k in range(6):
        a = k * tau / 6 + pi / 6
        px, py = .27 * cos(a), .20 * sin(a)
        parts.append(box_part("Gilt tasset", (px, py, .76), (.13, .03, .26), gold, (0, 0, a - pi / 2)))

    # Wrathful head, 3 blazing eyes, Five-Skull Tiara & Flaming Wisdom Hair
    parts.append(oval("Wrathful head", (0, .01, 1.69), (.145, .148, .158), basalt))
    parts.append(oval("Snarling jaw", (0, .11, 1.61), (.105, .085, .068), basalt))
    for side in (-1, 1):
        parts.append(oval("Wrathful eye", (side * .058, .138, 1.705), (.028, .018, .020), amber_eye))
        parts.append(horn("Wrathful fang", [(side * .045, .165, 1.60), (side * .048, .175, 1.635)], [.011, .002], ivory, 6))
        parts.append(oval("Gilt ear hoop", (side * .152, 0, 1.66), (.018, .042, .042), gold))
    parts.append(oval("Wisdom third eye", (0, .145, 1.755), (.018, .015, .028), amber_eye))

    # Five-Skull Crown + Blazing Hair Crest
    parts.append(loft("Crown circlet", [(1.77, .152, .152, 0, .01), (1.81, .158, .158, 0, .01)], gold, 32))
    for k in range(5):
        a = (k - 2) * .42
        sx, sy = .158 * sin(a), .158 * cos(a) + .01
        parts.append(oval("Crown skull", (sx, sy, 1.825), (.030, .026, .036), ivory))
        parts.append(horn("Crown jewel tip", [(sx, sy, 1.855), (sx * 1.06, sy * 1.04, 1.91)], [.018, .002], gold, 8))
    for k in range(9):
        a = k * tau / 9
        rx, ry = .085 * cos(a), .085 * sin(a) - .01
        parts.append(horn("Blazing wisdom hair", [
            (rx, ry, 1.81), (rx * 1.35, ry * 1.25 - .02, 1.96), (rx * .55, ry * .55 - .04, 2.14 + .04 * (k % 2))
        ], [.052, .038, .004], flame, 10))

    # Lion-shoulder pauldrons, powerful arms, Golden Vajra Mace (right) & Terma Treasure Casket (left)
    for side in (-1, 1):
        parts.append(oval("Gilt pauldron", (side * .36, .01, 1.44), (.135, .145, .105), gold, (0, side * .25, 0)))
        parts += tall_boot(side * .15, basalt, gold, cinnabar)
    # Right arm (+X) raised wielding a giant Golden Five-Pronged Vajra
    parts.append(horn("Right armored arm", [(.34, .02, 1.41), (.48, .14, 1.24), (.44, .30, 1.36)], [.092, .082, .072], basalt))
    parts.append(oval("Right gauntlet", (.44, .32, 1.38), (.062, .062, .062), gold))
    parts += vajra_scepter((.44, .34, 1.48), 1.45, gold)
    # Left arm (-X) holding the Sealed Golden Terma Casket ("伏藏匣")
    parts.append(horn("Left armored arm", [(-.34, .02, 1.41), (-.46, .14, 1.18), (-.34, .28, 1.14)], [.092, .082, .072], basalt))
    parts.append(oval("Left gauntlet", (-.32, .30, 1.14), (.060, .060, .060), gold))
    parts.append(box_part("Terma treasure casket", (-.28, .34, 1.22), (.22, .16, .14), gold, (0, 0, .2)))
    parts.append(box_part("Terma turquoise seal", (-.28, .425, 1.22), (.08, .02, .08), turquoise, (0, 0, .2)))

    # Billowing celestial silk scarf ("天衣飄帶") arching behind the sentinel
    arch_pts = []
    for k in range(25):
        t = k / 24
        a = pi * (.08 + .84 * t)
        arch_pts.append((-.54 * cos(a), -.14 - .06 * sin(pi * t), 1.05 + .88 * sin(a)))
    parts.append(cord("Celestial khata arch", arch_pts, .036, turquoise, 4))
    return parts


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    OUT.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from build_people import build_people
    build_people()

    export(combine("Guardian", build_terma_guardian()))

    # Sacred White Yak of Yarlha Shampo: pure glacial snow-white fur, silver-frost mane, gilt horns, luminous turquoise eyes!
    yak_white = surface("YakSnowFur", (.89, .91, .95), .76, weave=.06)
    yak_silver = surface("YakFrostMane", (.72, .79, .88), .80, weave=.08)
    yak_slate = surface("YakSlateHoof", (.13, .15, .19), .65)
    yak_ivory = surface("YakGiltHorn", (.84, .73, .46), .36, metal=.45)
    yak_gold = surface("YakSacredGold", (.82, .56, .14), .30, metal=.78)
    yak_eye = surface("YakTurquoiseEye", (.12, .85, .82), .22, emit=1.1)
    export(combine("RiverYak", beast(True, yak_white, yak_silver, yak_slate, yak_ivory, yak_eye, yak_gold)))

    from build_wilderness import build as build_wilderness
    build_wilderness()


def export(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    obj.data.calc_loop_triangles()
    counts_file = OUT / "triangle-counts.json"
    counts = json.loads(counts_file.read_text()) if counts_file.exists() else {}
    counts[obj.name] = len(obj.data.loop_triangles)
    counts_file.write_text(json.dumps(counts, indent=2, sort_keys=True) + "\n")
    bpy.ops.export_scene.fbx(filepath=str(OUT / (obj.name + ".fbx")), use_selection=True,
        object_types={"MESH"}, axis_forward="-Y", axis_up="Z", apply_unit_scale=True,
        bake_space_transform=True, add_leaf_bones=False, mesh_smooth_type="FACE")


if __name__ == "__main__":
    build()
