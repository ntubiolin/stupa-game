"""
Blender 5.2 LTS — Dedicated Kyoto Tō-ji (教王護國寺・東寺) Masterpiece Generator
Personally hand-crafted by Antigravity from 7 multi-angle Wikimedia Commons reference photographs:
  - Angle 1 (`ref_toji_sakura.jpg`): Fuji-zakura (不二櫻) 13m weeping cherry with wooden crutch poles (添え木) + Gojū-no-tō
  - Angle 2 (`toji_angle2_pagode06.jpg` & `toji_angle4_nt062.jpg`): Low-angle close-up of the dark weathered hinoki/keyaki
    Gojū-no-tō (黒茶素木造), 3-bay paneled core (桟唐戸・連子窓), white inter-bracket soffit frieze (白漆喰小壁),
    stepped Mitesaki Tokyō (三手先斗栱), 3-rail overhanging Kumi-Kōran balconies (組高欄), stepped Sumimune hip ridges (隅棟)
    with crested Onigawara (鬼瓦), hanging bronze Fūtaku wind bells (風鐸), vertical corner chains (鎖), and stone Tamagaki fence (石玉垣)
  - Angle 3 (`toji_angle1_pond.jpg`): View from the Lotus Pond (瓢箪池・蓮池) with 3D lotus leaves (蓮の葉), lotus seed pods (花托),
    sculpted pine (黒松), weeping willow/sakura, and crimson autumn maples (紅葉)
  - Angle 4 (`toji_angle5_kodo_ext.jpg` & `ref_toji_kondo.jpg` & `ref_toji_kodo.jpg`): Kōdō (講堂: vermilion pillars & tie-beams
    framing crisp white plaster panels, Chigomune gable horns, red Hōmōsen tea benches & 21-Deity Mandala) +
    Kondō (金堂: double-roofed Momoyama dark timber hall with front elevated Kiriage 切り上げ central eave & 5-colored Goshikimaku curtain)
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector

ARTIFACT_DIR = "/Users/linyusheng/.gemini/antigravity/brain/cbab4513-8817-4e76-9d7c-e3fb52f208a8"
GLB_OUT_DIR = "/Users/linyusheng/.gemini/antigravity/worktrees/stupa_game/japan_kukai_epic_locations/public/models/kukai"
os.makedirs(ARTIFACT_DIR, exist_ok=True)
os.makedirs(GLB_OUT_DIR, exist_ok=True)


def make_mat(name, base_color, roughness=0.5, metallic=0.0, emission_color=None, emission_strength=0.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission_color and emission_strength > 0:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission_color, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def create_toji_palette():
    return {
        # Authentic Edo/Momoyama dark weathered timber (黒茶色の素木 — seen in toji_angle2_pagode06.jpg & toji_angle4_nt062.jpg)
        "timber_dark": make_mat("Toji_TimberDark", (0.11, 0.075, 0.052), roughness=0.68, metallic=0.02),
        "timber_mid": make_mat("Toji_TimberMid", (0.20, 0.125, 0.080), roughness=0.62, metallic=0.03),
        # Warm weathered reddish-ochre timber on the pagoda's 3-rail balconies (組高欄 — seen in toji_angle3_pagode09.jpg)
        "koran_ochre": make_mat("Toji_KoranOchre", (0.42, 0.21, 0.11), roughness=0.54, metallic=0.04),
        # Heian vermilion on Kōdō pillars, tie-beams & Tokyō brackets (朱塗 — seen in toji_angle5_kodo_ext.jpg)
        "kodo_vermilion": make_mat("Toji_KodoVermilion", (0.76, 0.14, 0.08), roughness=0.38, metallic=0.05),
        # Crisp lime plaster (白漆喰 — Kōdō walls, Kondō upper core & inter-bracket Kokabe friezes)
        "shikkui_white": make_mat("Toji_ShikkuiWhite", (0.95, 0.94, 0.90), roughness=0.64, metallic=0.0),
        # Hon-gawara roof tiles (本瓦葺・いぶし銀黒瓦 — metallic smoked silver-charcoal)
        "kawara_dark": make_mat("Toji_KawaraDark", (0.13, 0.145, 0.165), roughness=0.34, metallic=0.32),
        "kawara_ridge": make_mat("Toji_KawaraRidge", (0.22, 0.24, 0.27), roughness=0.38, metallic=0.28),
        # Verdigris patinated bronze (青銅・緑青 — Sōrin finial, Fūtaku wind bells & lightning chains)
        "bronze_verdigris": make_mat("Toji_BronzeVerdigris", (0.23, 0.45, 0.37), roughness=0.32, metallic=0.80),
        "gold_sacred": make_mat("Toji_SacredGold", (0.96, 0.76, 0.22), roughness=0.18, metallic=0.94, emission_color=(0.90, 0.62, 0.12), emission_strength=0.35),
        # Granite stone podium & Tamagaki fence (花崗岩・石玉垣)
        "granite_light": make_mat("Toji_GraniteLight", (0.58, 0.56, 0.53), roughness=0.78, metallic=0.03),
        "granite_dark": make_mat("Toji_GraniteDark", (0.38, 0.37, 0.35), roughness=0.84, metallic=0.02),
        "gravel_courtyard": make_mat("Toji_CourtyardGravel", (0.64, 0.62, 0.58), roughness=0.88, metallic=0.0),
        # Foliage & seasonal accents
        "sakura_blossom": make_mat("Toji_SakuraBlossom", (0.99, 0.78, 0.86), roughness=0.45, metallic=0.0, emission_color=(0.98, 0.72, 0.82), emission_strength=0.22),
        "sakura_snow": make_mat("Toji_SakuraSnow", (1.0, 0.90, 0.94), roughness=0.42, metallic=0.0, emission_color=(1.0, 0.86, 0.92), emission_strength=0.18),
        "bamboo_pole": make_mat("Toji_WoodPole", (0.52, 0.38, 0.22), roughness=0.58, metallic=0.02),
        "lotus_green": make_mat("Toji_LotusGreen", (0.18, 0.46, 0.20), roughness=0.55, metallic=0.02),
        "lotus_light": make_mat("Toji_LotusLight", (0.32, 0.60, 0.26), roughness=0.55, metallic=0.02),
        "seedpod_brown": make_mat("Toji_SeedPodBrown", (0.30, 0.16, 0.10), roughness=0.72, metallic=0.02),
        "pine_green": make_mat("Toji_PineGreen", (0.11, 0.30, 0.13), roughness=0.70, metallic=0.0),
        "willow_green": make_mat("Toji_WillowGreen", (0.28, 0.48, 0.22), roughness=0.65, metallic=0.0),
        "momiji_crimson": make_mat("Toji_MomijiCrimson", (0.84, 0.11, 0.09), roughness=0.48, metallic=0.0, emission_color=(0.80, 0.10, 0.06), emission_strength=0.18),
        "momiji_orange": make_mat("Toji_MomijiOrange", (0.94, 0.38, 0.08), roughness=0.46, metallic=0.0, emission_color=(0.90, 0.32, 0.05), emission_strength=0.16),
        "momiji_gold": make_mat("Toji_MomijiGold", (0.96, 0.64, 0.12), roughness=0.46, metallic=0.0, emission_color=(0.92, 0.56, 0.08), emission_strength=0.15),
        "pond_water": make_mat("Toji_PondWater", (0.08, 0.22, 0.24), roughness=0.05, metallic=0.22),
        # Goshikimaku (五色幕) & Hōmōsen red tea bench cloth (緋毛氈)
        "maku_green": make_mat("Toji_MakuGreen", (0.12, 0.50, 0.26), roughness=0.68),
        "maku_yellow": make_mat("Toji_MakuYellow", (0.90, 0.72, 0.14), roughness=0.68),
        "maku_red": make_mat("Toji_MakuRed", (0.82, 0.14, 0.10), roughness=0.68),
        "maku_purple": make_mat("Toji_MakuPurple", (0.34, 0.15, 0.52), roughness=0.68),
        "homosen_red": make_mat("Toji_HomosenRed", (0.78, 0.09, 0.12), roughness=0.62),
        "fudo_indigo": make_mat("Toji_FudoIndigo", (0.09, 0.15, 0.36), roughness=0.38, metallic=0.28),
        "flame_halo": make_mat("Toji_GarudaFlame", (0.98, 0.22, 0.04), roughness=0.24, metallic=0.1, emission_color=(1.0, 0.28, 0.04), emission_strength=2.8),
    }


def new_mesh_obj(name, collection, mat=None):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    return obj, mesh


def add_box(collection, name, center, size, mat, rot_euler=(0, 0, 0)):
    obj, mesh = new_mesh_obj(name, collection, mat)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    bm.to_mesh(mesh)
    bm.free()
    obj.location = center
    obj.rotation_euler = rot_euler
    return obj


def add_cylinder(collection, name, center, radius_bottom, radius_top, height, segs, mat, rot_euler=(0, 0, 0), smooth=True):
    obj, mesh = new_mesh_obj(name, collection, mat)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segs,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=height,
    )
    if smooth:
        for f in bm.faces:
            if abs(f.normal.z) < 0.85:
                f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    obj.location = center
    obj.rotation_euler = rot_euler
    return obj


def add_icosphere(collection, name, center, radius, subdivisions, mat, scale_xyz=(1.0, 1.0, 1.0), rot_euler=(0, 0, 0)):
    obj, mesh = new_mesh_obj(name, collection, mat)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
    for v in bm.verts:
        v.co.x *= scale_xyz[0]
        v.co.y *= scale_xyz[1]
        v.co.z *= scale_xyz[2]
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    obj.location = center
    obj.rotation_euler = rot_euler
    return obj


def add_segment_cylinder(collection, name, p1, p2, r1, r2, segs, mat):
    v1 = Vector(p1)
    v2 = Vector(p2)
    diff = v2 - v1
    length = diff.length
    if length < 1e-4:
        return None
    mid = (v1 + v2) * 0.5
    quat = diff.to_track_quat("Z", "Y")
    return add_cylinder(collection, name, tuple(mid), r1, r2, length, segs, mat, rot_euler=quat.to_euler())


def add_deity_statue(
    collection,
    name,
    pos,
    scale,
    body_mat,
    halo_mat,
    is_seated=True,
    is_wrathful=False,
    mount_kind=None,
    weapon_mat=None,
):
    x, y, z = pos
    base_offset_z = 0.0
    if mount_kind == "geese" and weapon_mat:
        for gx, gy in ((-0.32 * scale, -0.25 * scale), (0.32 * scale, -0.25 * scale), (-0.32 * scale, 0.25 * scale), (0.32 * scale, 0.25 * scale)):
            add_cylinder(collection, f"{name}_GooseBody_{gx}_{gy}", (x + gx, y + gy, z + 0.18 * scale), 0.16 * scale, 0.12 * scale, 0.28 * scale, 10, weapon_mat)
            add_cylinder(collection, f"{name}_GooseNeck_{gx}_{gy}", (x + gx, y + gy - 0.12 * scale, z + 0.36 * scale), 0.05 * scale, 0.04 * scale, 0.24 * scale, 8, weapon_mat)
        base_offset_z = 0.26 * scale
    elif mount_kind == "elephant" and weapon_mat:
        add_box(collection, f"{name}_ElephantBody", (x, y, z + 0.26 * scale), (0.56 * scale, 0.78 * scale, 0.42 * scale), weapon_mat)
        add_cylinder(collection, f"{name}_ElephantTrunk", (x, y - 0.44 * scale, z + 0.22 * scale), 0.08 * scale, 0.05 * scale, 0.36 * scale, 10, weapon_mat, rot_euler=(0.4, 0, 0))
        base_offset_z = 0.32 * scale
    elif mount_kind == "jaki" and weapon_mat:
        add_box(collection, f"{name}_JakiDemon", (x, y - 0.06 * scale, z + 0.16 * scale), (0.68 * scale, 0.48 * scale, 0.28 * scale), weapon_mat, rot_euler=(0.1, 0.15, 0.2))
        base_offset_z = 0.18 * scale

    pz = z + base_offset_z
    add_cylinder(collection, f"{name}_PedestalBase", (x, y, pz + 0.22 * scale), 0.56 * scale, 0.42 * scale, 0.44 * scale, 16, body_mat)
    add_cylinder(collection, f"{name}_LotusSeat", (x, y, pz + 0.52 * scale), 0.44 * scale, 0.60 * scale, 0.26 * scale, 18, halo_mat)
    body_h = (0.88 if is_seated else 1.38) * scale
    body_z = pz + 0.64 * scale + body_h * 0.5
    add_cylinder(collection, f"{name}_Torso", (x, y, body_z), 0.38 * scale, 0.24 * scale, body_h, 16, body_mat)
    head_z = pz + 0.64 * scale + body_h + 0.22 * scale
    add_cylinder(collection, f"{name}_Head", (x, y, head_z), 0.19 * scale, 0.16 * scale, 0.36 * scale, 16, body_mat)
    add_cylinder(collection, f"{name}_Crown", (x, y, head_z + 0.22 * scale), 0.14 * scale, 0.05 * scale, 0.24 * scale, 12, halo_mat)

    halo_w = (1.36 if is_wrathful else 1.16) * scale
    halo_h = (1.95 if is_wrathful else 1.75) * scale
    add_box(
        collection,
        f"{name}_BoatMandorla",
        (x, y + 0.30 * scale, body_z + 0.22 * scale),
        (halo_w, 0.07 * scale, halo_h),
        halo_mat,
    )
    if mount_kind == "jaki":
        add_cylinder(collection, f"{name}_Halberd", (x + 0.42 * scale, y - 0.18 * scale, body_z + 0.25 * scale), 0.03 * scale, 0.025 * scale, 2.2 * scale, 8, halo_mat)


# ---------------------------------------------------------------------------
# High-Detail Pagoda Roof with Hongawara Tile Fluting, Sumimune Hip Ridges,
# Crested Onigawara, Double-Tier Rafters (二軒繁垂木) & Bronze Fūtaku Bells
# ---------------------------------------------------------------------------
def build_pagoda_story_roof(
    collection,
    name,
    cx,
    cy,
    z_base,
    span_bottom,
    span_top,
    height,
    sori_lift,
    pal,
    grid_n=36,
):
    obj, mesh = new_mesh_obj(name, collection, pal["kawara_dark"])
    bm = bmesh.new()

    half_b = span_bottom * 0.5
    half_t = span_top * 0.5
    thickness = 0.20

    top_verts = []
    bot_verts = []

    for iy in range(grid_n + 1):
        v_frac = (iy / grid_n) * 2.0 - 1.0
        row_t = []
        row_b = []
        for ix in range(grid_n + 1):
            u_frac = (ix / grid_n) * 2.0 - 1.0
            chebyshev = max(abs(u_frac), abs(v_frac))
            cur_half = half_t + (half_b - half_t) * chebyshev
            if chebyshev > 1e-5:
                x = cx + (u_frac / chebyshev) * cur_half * chebyshev
                y = cy + (v_frac / chebyshev) * cur_half * chebyshev
            else:
                x = cx
                y = cy

            slope_profile = (1.0 - chebyshev) ** 1.48
            corner_factor = (abs(u_frac) * abs(v_frac)) * (chebyshev ** 1.45)
            # Authentic Hongawara (本瓦葺) radial tile fluting along the 4 slopes
            if abs(u_frac) >= abs(v_frac):
                tile_wave = math.cos(v_frac * cur_half * 14.0) * 0.022 * chebyshev
            else:
                tile_wave = math.cos(u_frac * cur_half * 14.0) * 0.022 * chebyshev

            z = z_base + height * slope_profile + sori_lift * corner_factor + tile_wave
            row_t.append(bm.verts.new((x, y, z + thickness * 0.5)))
            row_b.append(bm.verts.new((x, y, z - thickness * 0.5)))
        top_verts.append(row_t)
        bot_verts.append(row_b)

    for iy in range(grid_n):
        for ix in range(grid_n):
            f1 = bm.faces.new((top_verts[iy][ix], top_verts[iy][ix + 1], top_verts[iy + 1][ix + 1], top_verts[iy + 1][ix]))
            f1.smooth = True
            f2 = bm.faces.new((bot_verts[iy][ix], bot_verts[iy + 1][ix], bot_verts[iy + 1][ix + 1], bot_verts[iy][ix + 1]))
            f2.smooth = True

    for i in range(grid_n):
        bm.faces.new((bot_verts[0][i], bot_verts[0][i + 1], top_verts[0][i + 1], top_verts[0][i]))
        bm.faces.new((top_verts[grid_n][i], top_verts[grid_n][i + 1], bot_verts[grid_n][i + 1], bot_verts[grid_n][i]))
        bm.faces.new((top_verts[i][0], top_verts[i + 1][0], bot_verts[i + 1][0], bot_verts[i][0]))
        bm.faces.new((bot_verts[i][grid_n], bot_verts[i + 1][grid_n], top_verts[i + 1][grid_n], top_verts[i][grid_n]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    # 1. Four Stepped Diagonal Hip Ridges (隅棟 Sumimune) + Crested Onigawara (紋入り鬼瓦 — seen in toji_angle2_pagode06.jpg!)
    corner_tips = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            p_inner = Vector((cx + sx * half_t * 0.98, cy + sy * half_t * 0.98, z_base + height + 0.14))
            p_outer = Vector((cx + sx * half_b * 0.98, cy + sy * half_b * 0.98, z_base + sori_lift + 0.16))
            corner_tips.append((sx, sy, p_outer))
            for step_i in range(8):
                u0 = step_i / 8.0
                u1 = (step_i + 0.92) / 8.0
                pa = p_inner.lerp(p_outer, u0)
                pb = p_inner.lerp(p_outer, u1)
                # Curve the hip ridge slightly to follow the catenary roof
                sag = math.sin(u0 * math.pi) * (-0.18 * height)
                pa.z += sag
                pb.z += math.sin(u1 * math.pi) * (-0.18 * height)
                add_segment_cylinder(
                    collection,
                    f"{name}_Sumimune_{sx}_{sy}_{step_i}",
                    pa,
                    pb,
                    0.13 - u0 * 0.03,
                    0.12 - u0 * 0.03,
                    8,
                    pal["kawara_ridge"],
                )
            # Onigawara (鬼瓦) with white crest at the outer hip ridge end
            oni_pos = p_inner.lerp(p_outer, 0.93)
            add_box(
                collection,
                f"{name}_Onigawara_{sx}_{sy}",
                tuple(oni_pos + Vector((0, 0, 0.14))),
                (0.28, 0.28, 0.34),
                pal["kawara_ridge"],
                rot_euler=(0, 0, math.atan2(sy, sx)),
            )
            add_cylinder(
                collection,
                f"{name}_OniCrest_{sx}_{sy}",
                tuple(oni_pos + Vector((sx * 0.12, sy * 0.12, 0.18))),
                0.08,
                0.08,
                0.06,
                12,
                pal["shikkui_white"],
                rot_euler=(math.pi * 0.5, 0, math.atan2(sy, sx)),
            )

            # Hanging Bronze Fūtaku Wind Bell (風鐸) + Clapper Tongue (舌) under each corner eave
            bell_pos = Vector((cx + sx * half_b * 0.90, cy + sy * half_b * 0.90, z_base + sori_lift * 0.78 - 0.34))
            add_cylinder(collection, f"{name}_FutakuBody_{sx}_{sy}", tuple(bell_pos), 0.11, 0.08, 0.34, 12, pal["bronze_verdigris"])
            add_box(collection, f"{name}_FutakuFin_{sx}_{sy}", tuple(bell_pos + Vector((0, 0, -0.22))), (0.14, 0.02, 0.18), pal["gold_sacred"])

    # 2. Exposed Double-Tier Under-Eave Rafters (二軒繁垂木: 地垂木 + 飛檐垂木) with white-painted end tips (木口白塗)
    add_under_eave_rafter_tiers(collection, f"{name}_Taruki", cx, cy, z_base - 0.06, span_bottom * 0.95, span_bottom * 0.74, 18, pal)
    return corner_tips


def add_under_eave_rafter_tiers(collection, name, cx, cy, z_eave, span_outer, span_inner, count_per_side, pal):
    half_o = span_outer * 0.5
    half_i = span_inner * 0.5
    rafter_len = max(0.35, half_o - half_i)
    mid_d = (half_o + half_i) * 0.5
    for i in range(count_per_side):
        u = -half_o * 0.88 + (i / max(1, count_per_side - 1)) * (half_o * 1.76)
        for sy in (-1, 1):
            add_box(
                collection,
                f"{name}_Y_{sy}_{i}",
                (cx + u, cy + sy * mid_d, z_eave),
                (0.075, rafter_len, 0.075),
                pal["timber_dark"],
                rot_euler=(sy * 0.12, 0, 0),
            )
            add_box(
                collection,
                f"{name}_TipY_{sy}_{i}",
                (cx + u, cy + sy * (half_o + 0.02), z_eave - 0.03),
                (0.08, 0.04, 0.08),
                pal["shikkui_white"],
            )
        for sx in (-1, 1):
            add_box(
                collection,
                f"{name}_X_{sx}_{i}",
                (cx + sx * mid_d, cy + u, z_eave),
                (rafter_len, 0.075, 0.075),
                pal["timber_dark"],
                rot_euler=(0, -sx * 0.12, 0),
            )
            add_box(
                collection,
                f"{name}_TipX_{sx}_{i}",
                (cx + sx * (half_o + 0.02), cy + u, z_eave - 0.03),
                (0.04, 0.08, 0.08),
                pal["shikkui_white"],
            )


# ---------------------------------------------------------------------------
# Authentic 3-Rail Overhanging Balcony (組高欄 Kumi-Kōran) + Koshigumi Brackets
# (Matches `toji_angle3_pagode09.jpg` & `toji_angle4_nt062.jpg`)
# ---------------------------------------------------------------------------
def build_kumi_koran_balcony(collection, name, cx, cy, z_floor, core_w, pal):
    balcony_w = core_w + 1.18
    half_b = balcony_w * 0.5
    overhang_ext = 0.42  # Characteristic Japanese Kumi-Kōran rails projecting past the 4 corners!
    rail_len = balcony_w + overhang_ext * 2.0

    # Balcony floor deck (縁板・縁葛)
    add_box(collection, f"{name}_Deck", (cx, cy, z_floor), (balcony_w, balcony_w, 0.14), pal["timber_dark"])

    # 3 horizontal rails per side: Jifuku (地覆), Hiraketa (平桁), Hoko (架木)
    for idx, rz_off in enumerate((0.12, 0.34, 0.56)):
        thick = 0.075 if idx < 2 else 0.095
        for sy in (-1, 1):
            add_box(
                collection,
                f"{name}_RailY_{sy}_{idx}",
                (cx, cy + sy * half_b, z_floor + rz_off),
                (rail_len if idx == 2 else balcony_w + 0.18, thick, thick),
                pal["koran_ochre"],
            )
        for sx in (-1, 1):
            add_box(
                collection,
                f"{name}_RailX_{sx}_{idx}",
                (cx + sx * half_b, cy, z_floor + rz_off),
                (thick, rail_len if idx == 2 else balcony_w + 0.18, thick),
                pal["koran_ochre"],
            )

    # Vertical balusters (束 Tsuka) & supporting Koshigumi bracket arms (腰組) under the balcony
    for i in range(5):
        u = -half_b * 0.82 + (i / 4.0) * (half_b * 1.64)
        for sy in (-1, 1):
            add_box(collection, f"{name}_PostY_{sy}_{i}", (cx + u, cy + sy * half_b, z_floor + 0.34), (0.08, 0.08, 0.46), pal["koran_ochre"])
            add_box(collection, f"{name}_KoshigumiY_{sy}_{i}", (cx + u, cy + sy * (half_b - 0.25), z_floor - 0.16), (0.14, 0.56, 0.18), pal["timber_dark"])
        for sx in (-1, 1):
            add_box(collection, f"{name}_PostX_{sx}_{i}", (cx + sx * half_b, cy + u, z_floor + 0.34), (0.08, 0.08, 0.46), pal["koran_ochre"])
            add_box(collection, f"{name}_KoshigumiX_{sx}_{i}", (cx + sx * (half_b - 0.25), cy + u, z_floor - 0.16), (0.56, 0.14, 0.18), pal["timber_dark"])


# ---------------------------------------------------------------------------
# 3-Bay Dark Timber Pagoda Story Core + Karado Doors + Renjimado Windows +
# White Shikkui Inter-Bracket Frieze (白漆喰小壁) + Stepped Mitesaki Tokyō (三手先斗栱)
# ---------------------------------------------------------------------------
def build_pagoda_story_core(collection, name, cx, cy, z_bot, core_w, story_h, pal, is_ground_story=False):
    half_c = core_w * 0.5
    wall_h = story_h * 0.72
    frieze_h = story_h * 0.28

    # 1. Dark weathered timber core wall (黒茶素木壁 — NOT white plaster!)
    add_box(collection, f"{name}_DarkTimberCore", (cx, cy, z_bot + wall_h * 0.5), (core_w, core_w, wall_h), pal["timber_mid"])

    # 2. White Shikkui plaster inter-bracket frieze ONLY at the top 28% under the eaves (白漆喰支輪・小壁 — matches toji_angle2_pagode06.jpg!)
    add_box(
        collection,
        f"{name}_WhiteKokabeFrieze",
        (cx, cy, z_bot + wall_h + frieze_h * 0.5),
        (core_w - 0.06, core_w - 0.06, frieze_h),
        pal["shikkui_white"],
    )

    # 3. Four 3-Bay Pillars per face (三間四方円柱) + Horizontal Nageshi/Nuki tie-beams (長押・頭貫)
    bay_offsets = (-half_c, -half_c * 0.34, half_c * 0.34, half_c)
    col_r = 0.19 if is_ground_story else 0.15
    for bx in bay_offsets:
        for by in bay_offsets:
            if abs(abs(bx) - half_c) < 0.02 or abs(abs(by) - half_c) < 0.02:
                add_cylinder(
                    collection,
                    f"{name}_Col_{bx:.2f}_{by:.2f}",
                    (cx + bx, cy + by, z_bot + story_h * 0.5),
                    col_r,
                    col_r * 0.94,
                    story_h,
                    12,
                    pal["timber_dark"],
                )

    # Horizontal tie-beams (地覆・腰長押・内法長押・頭貫)
    for tz_frac in (0.06, 0.32, 0.68, 0.74):
        add_box(
            collection,
            f"{name}_Nageshi_{tz_frac}",
            (cx, cy, z_bot + story_h * tz_frac),
            (core_w + 0.12, core_w + 0.12, 0.11),
            pal["timber_dark"],
        )

    # 4. Central Paneled Karado Door (桟唐戸) & Left/Right Slatted Renjimado Lattice Windows (連子窓) on all 4 faces
    door_w = core_w * 0.28
    door_h = wall_h * 0.82
    win_w = core_w * 0.24
    win_h = wall_h * 0.52
    side_off = core_w * 0.33
    for sy in (-1, 1):
        face_y = cy + sy * (half_c + 0.02)
        add_box(collection, f"{name}_KaradoY_{sy}", (cx, face_y, z_bot + door_h * 0.52), (door_w, 0.08, door_h), pal["timber_dark"])
        for wx_s in (-1, 1):
            add_box(collection, f"{name}_RenjiY_{sy}_{wx_s}", (cx + wx_s * side_off, face_y, z_bot + wall_h * 0.52), (win_w, 0.07, win_h), pal["timber_dark"])
    for sx in (-1, 1):
        face_x = cx + sx * (half_c + 0.02)
        add_box(collection, f"{name}_KaradoX_{sx}", (face_x, cy, z_bot + door_h * 0.52), (0.08, door_w, door_h), pal["timber_dark"])
        for wy_s in (-1, 1):
            add_box(collection, f"{name}_RenjiX_{sx}_{wy_s}", (face_x, cy + wy_s * side_off, z_bot + wall_h * 0.52), (0.07, win_w, win_h), pal["timber_dark"])

    # 5. Multi-Stepped Mitesaki Tokyō Bracket Complexes (三手先斗栱) projecting out across the white frieze
    for step_idx in range(3):
        proj = 0.28 + step_idx * 0.32
        z_br = z_bot + wall_h + (step_idx + 0.5) * (frieze_h / 3.0)
        span_br = core_w + proj * 2.0
        add_box(collection, f"{name}_TokyoRing_{step_idx}", (cx, cy, z_br), (span_br, span_br, 0.13), pal["timber_dark"])
        for u_pos in bay_offsets:
            for sy in (-1, 1):
                add_box(
                    collection,
                    f"{name}_MasuY_{step_idx}_{sy}_{u_pos:.1f}",
                    (cx + u_pos, cy + sy * (half_c + proj * 0.5), z_br),
                    (0.24, proj, 0.22),
                    pal["timber_dark"],
                )
            for sx in (-1, 1):
                add_box(
                    collection,
                    f"{name}_MasuX_{step_idx}_{sx}_{u_pos:.1f}",
                    (cx + sx * (half_c + proj * 0.5), cy + u_pos, z_br),
                    (proj, 0.24, 0.22),
                    pal["timber_dark"],
                )


# ---------------------------------------------------------------------------
# Build Complete Photo-Accurate Tō-ji Five-Story Pagoda (五重塔) + Stone Tamagaki Fence
# ---------------------------------------------------------------------------
def build_toji_pagoda_masterpiece(collection, pal, offset=(0.0, 0.0, 0.0)):
    ox, oy, oz = offset

    # 1. Carved Granite Podium (石積基壇) + 4 Cardinal Stairs
    podium_w = 12.2
    podium_h = 1.35
    add_box(collection, "Pagoda_GranitePodium", (ox, oy, oz + podium_h * 0.5), (podium_w, podium_w, podium_h), pal["granite_light"])
    add_box(collection, "Pagoda_PodiumCap", (ox, oy, oz + podium_h + 0.06), (podium_w + 0.3, podium_w + 0.3, 0.12), pal["granite_dark"])
    for sx, sy, w, d in ((0, -6.6, 3.0, 1.5), (0, 6.6, 3.0, 1.5), (-6.6, 0, 1.5, 3.0), (6.6, 0, 1.5, 3.0)):
        for st in range(4):
            sh = (4 - st) * 0.26
            add_box(
                collection,
                f"Pagoda_Step_{sx}_{sy}_{st}",
                (ox + sx * (1.0 + st * 0.06), oy + sy * (1.0 + st * 0.06), oz + sh * 0.5),
                (w, d, sh),
                pal["granite_light"],
            )

    # 2. Ground-Level Square Carved Stone Tamagaki Fence (石玉垣 — seen in toji_angle4_nt062.jpg!)
    fence_half = 7.4
    for i in range(11):
        u = -fence_half + (i / 10.0) * (fence_half * 2.0)
        if abs(u) < 1.3:
            continue  # Leave central stair opening
        for sy in (-1, 1):
            add_box(collection, f"Tamagaki_PostY_{sy}_{i}", (ox + u, oy + sy * fence_half, oz + 0.55), (0.18, 0.18, 1.10), pal["granite_light"])
        for sx in (-1, 1):
            add_box(collection, f"Tamagaki_PostX_{sx}_{i}", (ox + sx * fence_half, oy + u, oz + 0.55), (0.18, 0.18, 1.10), pal["granite_light"])
    for rz in (0.32, 0.82):
        for sy in (-1, 1):
            for side_s in (-1, 1):
                add_box(collection, f"Tamagaki_RailY_{sy}_{side_s}_{rz}", (ox + side_s * 4.4, oy + sy * fence_half, oz + rz), (5.8, 0.10, 0.10), pal["granite_light"])
        for sx in (-1, 1):
            for side_s in (-1, 1):
                add_box(collection, f"Tamagaki_RailX_{sx}_{side_s}_{rz}", (ox + sx * fence_half, oy + side_s * 4.4, oz + rz), (0.10, 5.8, 0.10), pal["granite_light"])

    # 3. Five Stories (初層〜五層) with Progressive Tapering (逓減率)
    cur_z = oz + podium_h
    all_story_corners = []

    for story in range(5):
        t = story / 4.0
        core_w = 6.85 - t * 2.05
        story_h = 3.35 - t * 0.36
        roof_span = 12.6 - t * 3.10
        roof_h = 1.78 - t * 0.18
        sori = 0.84 - t * 0.12

        build_pagoda_story_core(
            collection,
            f"Pagoda_Story{story+1}",
            ox,
            oy,
            cur_z,
            core_w,
            story_h,
            pal,
            is_ground_story=(story == 0),
        )

        if story > 0:
            build_kumi_koran_balcony(
                collection,
                f"Pagoda_Balcony{story+1}",
                ox,
                oy,
                cur_z + 0.18,
                core_w,
                pal,
            )

        roof_z = cur_z + story_h * 0.76
        corners = build_pagoda_story_roof(
            collection,
            f"Pagoda_Roof{story+1}",
            ox,
            oy,
            roof_z,
            roof_span,
            max(1.15, core_w - 0.45),
            roof_h,
            sori,
            pal,
        )
        all_story_corners.append(corners)
        cur_z += story_h + roof_h * 0.56

    # 4. Bronze Sōrin Finial (相輪) + Continuous Corner Lightning/Wind Wires (避雷導線・鎖 from Sōrin -> Story 5 -> 4 -> 3 -> 2 -> 1!)
    sorin_base_z = cur_z + 0.22
    sorin_h = 8.2
    add_box(collection, "Pagoda_Roban", (ox, oy, sorin_base_z + 0.30), (1.52, 1.52, 0.60), pal["bronze_verdigris"])
    add_cylinder(collection, "Pagoda_Fukubachi", (ox, oy, sorin_base_z + 0.84), 0.70, 0.48, 0.52, 24, pal["bronze_verdigris"])
    add_cylinder(collection, "Pagoda_Ukebana", (ox, oy, sorin_base_z + 1.24), 0.42, 0.62, 0.32, 20, pal["bronze_verdigris"])
    add_cylinder(collection, "Pagoda_SorinShaft", (ox, oy, sorin_base_z + sorin_h * 0.5), 0.22, 0.12, sorin_h, 20, pal["bronze_verdigris"])
    for i in range(9):
        rz = sorin_base_z + 1.62 + (i / 8.0) * (sorin_h * 0.48)
        rr = 0.58 - i * 0.018
        add_cylinder(collection, f"Pagoda_Kurin_{i}", (ox, oy, rz), rr, rr, 0.11, 24, pal["bronze_verdigris"])
    suien_z = sorin_base_z + sorin_h * 0.79
    for ang_deg in (0, 45, 90, 135):
        add_box(
            collection,
            f"Pagoda_Suien_{ang_deg}",
            (ox, oy, suien_z),
            (1.12, 0.05, sorin_h * 0.18),
            pal["bronze_verdigris"],
            rot_euler=(0, 0, math.radians(ang_deg)),
        )
    sorin_top_z = sorin_base_z + sorin_h * 0.96
    add_cylinder(collection, "Pagoda_Hoju", (ox, oy, sorin_top_z), 0.34, 0.04, 0.68, 20, pal["gold_sacred"])

    # Connect Sōrin top to 5th-story corners, and connect each story corner vertically down to Story 1 (as seen in toji_angle2_pagode06.jpg!)
    p_sorin_top = Vector((ox, oy, sorin_top_z - 0.25))
    for c_idx in range(4):
        _, _, p_s5 = all_story_corners[4][c_idx]
        add_segment_cylinder(collection, f"Pagoda_TopChain_{c_idx}", p_sorin_top, p_s5, 0.024, 0.024, 8, pal["bronze_verdigris"])
        for st in range(4, 0, -1):
            _, _, p_upper = all_story_corners[st][c_idx]
            _, _, p_lower = all_story_corners[st - 1][c_idx]
            add_segment_cylinder(collection, f"Pagoda_VertWire_{st}_{c_idx}", p_upper, p_lower, 0.018, 0.018, 6, pal["bronze_verdigris"])


# ---------------------------------------------------------------------------
# High-Detail Irimoya Roof with Fluted Tiles, Sumimune Ridges, Chigomune Gable Horns
# (稚児棟), Onigawara & Optional Kiriage (切り上げ) Elevated Front Eave
# ---------------------------------------------------------------------------
def build_detailed_irimoya_roof(
    collection,
    name,
    cx,
    cy,
    z_base,
    width_x,
    depth_y,
    height,
    sori_lift,
    pal,
    has_kiriage=False,
    has_chigomune=True,
):
    obj, mesh = new_mesh_obj(name, collection, pal["kawara_dark"])
    bm = bmesh.new()

    nx, ny = 40, 28
    hx = width_x * 0.5
    hy = depth_y * 0.5
    ridge_half_x = hx * 0.52
    thickness = 0.26

    verts_top = []
    verts_bot = []

    for iy in range(ny + 1):
        vy_norm = (iy / ny) * 2.0 - 1.0
        row_t = []
        row_b = []
        for ix in range(nx + 1):
            vx_norm = (ix / nx) * 2.0 - 1.0
            x = cx + vx_norm * hx
            y = cy + vy_norm * hy

            dx_ridge = max(0.0, (abs(vx_norm) * hx - ridge_half_x) / max(0.01, hx - ridge_half_x))
            dy_ridge = abs(vy_norm)
            dist = max(dx_ridge * 0.88, dy_ridge)

            slope = (1.0 - dist) ** 1.38
            corner_sori = (abs(vx_norm) * abs(vy_norm)) ** 1.48 * sori_lift
            tile_flute = math.cos(x * 13.0) * 0.022 * dist

            kiriage_lift = 0.0
            if has_kiriage and vy_norm < -0.30 and abs(vx_norm) < 0.23:
                front_edge = min(1.0, (abs(vy_norm) - 0.30) / 0.45)
                plateau = 1.0 if abs(vx_norm) < 0.17 else max(0.0, (0.23 - abs(vx_norm)) / 0.06)
                kiriage_lift = plateau * front_edge * (height * 0.55)

            z = z_base + height * slope + corner_sori + kiriage_lift + tile_flute
            row_t.append(bm.verts.new((x, y, z + thickness * 0.5)))
            row_b.append(bm.verts.new((x, y, z - thickness * 0.5)))
        verts_top.append(row_t)
        verts_bot.append(row_b)

    for iy in range(ny):
        for ix in range(nx):
            f1 = bm.faces.new((verts_top[iy][ix], verts_top[iy][ix + 1], verts_top[iy + 1][ix + 1], verts_top[iy + 1][ix]))
            f1.smooth = True
            f2 = bm.faces.new((verts_bot[iy][ix], verts_bot[iy + 1][ix], verts_bot[iy + 1][ix + 1], verts_bot[iy][ix + 1]))
            f2.smooth = True

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    # Main Ridge (大棟 Ōmune) + End Onigawara (鬼瓦)
    ridge_z = z_base + height + 0.24
    add_box(collection, f"{name}_Omune", (cx, cy, ridge_z), (ridge_half_x * 2.04, 0.54, 0.48), pal["kawara_ridge"])
    for sx in (-1, 1):
        add_box(collection, f"{name}_MainOni_{sx}", (cx + sx * ridge_half_x * 1.03, cy, ridge_z + 0.32), (0.44, 0.64, 0.72), pal["kawara_ridge"])
        # Descending ridges (降棟 Kudarimune) & Corner Hip Ridges (隅棟) + Chigomune Gable Horns (稚児棟 — seen in toji_angle5_kodo_ext.jpg!)
        for sy in (-1, 1):
            p_gable = Vector((cx + sx * ridge_half_x, cy, ridge_z - 0.1))
            p_corner = Vector((cx + sx * hx * 0.98, cy + sy * hy * 0.98, z_base + sori_lift + 0.15))
            add_segment_cylinder(collection, f"{name}_Sumimune_{sx}_{sy}", p_gable, p_corner, 0.15, 0.12, 8, pal["kawara_ridge"])
            if has_chigomune:
                # Upturned silver-grey Chigomune ridge horn jutting above the corner ridge
                p_horn_base = p_gable.lerp(p_corner, 0.48)
                p_horn_tip = p_horn_base + Vector((sx * 0.95, sy * 0.65, 0.52))
                add_segment_cylinder(collection, f"{name}_Chigomune_{sx}_{sy}", p_horn_base, p_horn_tip, 0.13, 0.09, 8, pal["shikkui_white"])
            # Verdigris bronze Fūtaku wind bell under each corner
            add_cylinder(
                collection,
                f"{name}_Futaku_{sx}_{sy}",
                (cx + sx * hx * 0.92, cy + sy * hy * 0.92, z_base + sori_lift * 0.8 - 0.32),
                0.12,
                0.09,
                0.36,
                12,
                pal["bronze_verdigris"],
            )


# ---------------------------------------------------------------------------
# Build Tō-ji Kondō (金堂) & Kōdō (講堂) along the Authentic Temple Axis
# (Matches `ref_toji_kondo.jpg`, `toji_angle5_kodo_ext.jpg`, `ref_toji_kodo.jpg`)
# ---------------------------------------------------------------------------
def build_toji_kondo_and_kodo_masterpiece(collection, pal, offset=(0.0, 0.0, 0.0)):
    ox, oy, oz = offset

    # =========================================================================
    # A. Kōdō (講堂 — Foreground right/north in `toji_angle5_kodo_ext.jpg`:
    #    Heian-style Vermilion Pillars & Tie-Beams framing White Shikkui Plaster Walls!)
    # =========================================================================
    mx, my, mz = ox + 11.5, oy - 1.0, oz
    add_box(collection, "Kodo_StonePodium", (mx, my, mz + 0.48), (19.6, 10.6, 0.96), pal["granite_light"])
    add_box(collection, "Kodo_PodiumCap", (mx, my, mz + 0.98), (19.9, 10.9, 0.10), pal["granite_dark"])

    # White Shikkui side & back walls + Vermilion structural grid (朱塗柱・長押・貫・斗栱 + 白漆喰壁)
    wall_h = 4.5
    add_box(collection, "Kodo_BackWall", (mx, my + 4.4, mz + 1.0 + wall_h * 0.5), (18.2, 0.45, wall_h), pal["shikkui_white"])
    for sx in (-1, 1):
        add_box(collection, f"Kodo_SideWall_{sx}", (mx + sx * 9.0, my, mz + 1.0 + wall_h * 0.5), (0.45, 8.8, wall_h), pal["shikkui_white"])
        # Vermilion horizontal tie-beams (地覆・腰長押・内法長押・頭貫) along the white side walls (exact match to toji_angle5_kodo_ext.jpg!)
        for hz in (1.12, 2.25, 4.15, 4.75, 5.35):
            add_box(collection, f"Kodo_SideNageshi_{sx}_{hz}", (mx + sx * 9.02, my, mz + hz), (0.52, 9.0, 0.14), pal["kodo_vermilion"])

    # Front & Side Vermilion Round Pillars (朱塗円柱) + Vermilion Frieze & Tokyō Brackets
    for px in (-9.0, -6.4, -3.8, -1.3, 1.3, 3.8, 6.4, 9.0):
        for py in (-4.4, 4.4):
            add_cylinder(collection, f"Kodo_Pillar_{px}_{py}", (mx + px, my + py, mz + 1.0 + wall_h * 0.5), 0.24, 0.22, wall_h, 16, pal["kodo_vermilion"])
            add_box(collection, f"Kodo_Tokyo_{px}_{py}", (mx + px, my + py, mz + 1.0 + wall_h - 0.25), (0.68, 0.68, 0.42), pal["kodo_vermilion"])
    for py in (-2.2, 0.0, 2.2):
        for sx in (-1, 1):
            add_cylinder(collection, f"Kodo_SidePillar_{sx}_{py}", (mx + sx * 9.0, my + py, mz + 1.0 + wall_h * 0.5), 0.24, 0.22, wall_h, 16, pal["kodo_vermilion"])

    # Upper White Shikkui Kokabe frieze & Vermilion lintels across the front so the 21-Deity Mandala inside is clearly visible!
    add_box(collection, "Kodo_FrontUpperWhiteFrieze", (mx, my - 4.4, mz + 4.95), (18.2, 0.32, 0.95), pal["shikkui_white"])
    add_box(collection, "Kodo_FrontBeamA", (mx, my - 4.4, mz + 4.45), (18.4, 0.42, 0.18), pal["kodo_vermilion"])
    add_box(collection, "Kodo_FrontBeamB", (mx, my - 4.4, mz + 5.42), (18.6, 0.52, 0.22), pal["kodo_vermilion"])

    # Interior 21-Deity Karmic Mandala (立體曼荼羅二十一尊) on the White & Vermilion Sumeru Altar
    add_box(collection, "Kodo_SumeruAltar", (mx, my + 0.3, mz + 1.45), (15.4, 5.6, 0.90), pal["shikkui_white"])
    add_box(collection, "Kodo_AltarTrim", (mx, my + 0.3, mz + 1.92), (15.7, 5.9, 0.14), pal["kodo_vermilion"])

    # Five Wisdom Buddhas (五智如来) + Five Bodhisattvas (五菩薩) + Five Wisdom Kings (五大明王) + Bonten/Taishakuten/Shitennō
    add_deity_statue(collection, "Kodo_Dainichi", (mx, my + 0.3, mz + 1.98), 1.38, pal["gold_sacred"], pal["gold_sacred"], is_seated=True)
    for i, (dx, dy) in enumerate(((-1.45, -1.0), (1.45, -1.0), (-1.45, 1.0), (1.45, 1.0))):
        add_deity_statue(collection, f"Kodo_Buddha_{i}", (mx + dx, my + 0.3 + dy, mz + 1.98), 0.88, pal["gold_sacred"], pal["gold_sacred"], is_seated=True)
    for i, (dx, dy) in enumerate(((3.9, 0.0), (2.9, -1.0), (4.9, -1.0), (2.9, 1.0), (4.9, 1.0))):
        add_deity_statue(collection, f"Kodo_Bosatsu_{i}", (mx + dx, my + 0.3 + dy, mz + 1.98), 0.85 if i > 0 else 1.08, pal["gold_sacred"], pal["gold_sacred"], is_seated=(i == 0))
    for i, (dx, dy) in enumerate(((-3.9, 0.0), (-2.9, -1.0), (-4.9, -1.0), (-2.9, 1.0), (-4.9, 1.0))):
        add_deity_statue(collection, f"Kodo_Myoo_{i}", (mx + dx, my + 0.3 + dy, mz + 1.98), 0.88 if i > 0 else 1.15, pal["fudo_indigo"], pal["flame_halo"], is_seated=(i == 0), is_wrathful=True)
    add_deity_statue(collection, "Kodo_Bonten", (mx + 6.4, my + 0.3, mz + 1.98), 0.98, pal["gold_sacred"], pal["gold_sacred"], is_seated=True, mount_kind="geese", weapon_mat=pal["shikkui_white"])
    add_deity_statue(collection, "Kodo_Taishaku", (mx - 6.4, my + 0.3, mz + 1.98), 0.98, pal["gold_sacred"], pal["gold_sacred"], is_seated=True, mount_kind="elephant", weapon_mat=pal["shikkui_white"])
    for i, (dx, dy) in enumerate(((-6.9, -1.8), (6.9, -1.8), (-6.9, 1.8), (6.9, 1.8))):
        add_deity_statue(collection, f"Kodo_Shiteno_{i}", (mx + dx, my + 0.3 + dy, mz + 1.98), 0.96, pal["bronze_verdigris"], pal["gold_sacred"], is_seated=False, mount_kind="jaki", weapon_mat=pal["granite_dark"])

    build_detailed_irimoya_roof(
        collection,
        "Kodo_IrimoyaRoof",
        mx,
        my,
        mz + 5.3,
        width_x=22.4,
        depth_y=13.4,
        height=3.45,
        sori_lift=0.76,
        pal=pal,
        has_kiriage=False,
        has_chigomune=True,
    )

    # Red-cloth Hōmōsen Tea Benches (緋毛氈の床几 — seen in foreground of toji_angle5_kodo_ext.jpg!)
    for b_idx, bx in enumerate((mx - 4.2, mx + 0.2, mx + 4.6)):
        add_box(collection, f"Kodo_RedBenchCloth_{b_idx}", (bx, my - 7.4, mz + 0.44), (2.8, 1.1, 0.12), pal["homosen_red"])
        for lx in (-1.2, 1.2):
            for ly in (-0.45, 0.45):
                add_box(collection, f"Kodo_BenchLeg_{b_idx}_{lx}_{ly}", (bx + lx, my - 7.4 + ly, mz + 0.20), (0.10, 0.10, 0.40), pal["timber_dark"])

    # =========================================================================
    # B. Kondō (金堂 — Double-Roofed Momoyama Hall with Front Kiriage 切り上げ Eave & 5-Colored Curtain)
    # =========================================================================
    kx, ky, kz = ox - 11.8, oy + 1.2, oz
    add_box(collection, "Kondo_StonePodium", (kx, ky, kz + 0.58), (18.2, 11.8, 1.16), pal["granite_light"])
    add_box(collection, "Kondo_FrontSteps", (kx, ky - 6.4, kz + 0.38), (4.8, 1.5, 0.76), pal["granite_light"])

    # Lower story dark timber walls + Slatted Renjimado windows + Paneled Karado doors
    add_box(collection, "Kondo_LowerTimberWall", (kx, ky, kz + 2.85), (15.4, 9.2, 3.4), pal["timber_mid"])
    add_box(collection, "Kondo_LowerWhiteFrieze", (kx, ky, kz + 4.85), (15.3, 9.1, 0.95), pal["shikkui_white"])
    for px in (-7.6, -5.0, -2.5, 0.0, 2.5, 5.0, 7.6):
        if abs(px) > 0.1:
            add_cylinder(collection, f"Kondo_FrontCol_{px}", (kx + px, ky - 4.62, kz + 3.2), 0.24, 0.22, 4.2, 14, pal["timber_dark"])
            add_box(collection, f"Kondo_LowerTokyo_{px}", (kx + px, ky - 4.72, kz + 4.85), (0.72, 0.58, 0.65), pal["timber_dark"])
    # Central elevated clerestory window under the Kiriage roof (切り上げ下の連子窓 — ref_toji_kondo.jpg!)
    add_box(collection, "Kondo_KiriageWindow", (kx, ky - 4.65, kz + 5.15), (2.4, 0.18, 1.05), pal["timber_mid"])
    for wx in (-6.3, -3.7, 3.7, 6.3):
        add_box(collection, f"Kondo_RenjiWin_{wx}", (kx + wx, ky - 4.64, kz + 2.8), (1.9, 0.14, 1.85), pal["timber_dark"])

    build_detailed_irimoya_roof(
        collection,
        "Kondo_LowerRoof",
        kx,
        ky,
        kz + 4.9,
        width_x=19.6,
        depth_y=13.2,
        height=1.95,
        sori_lift=0.68,
        pal=pal,
        has_kiriage=True,
        has_chigomune=False,
    )

    # Upper story white Shikkui frieze + dark timber brackets + Main Irimoya Roof
    add_box(collection, "Kondo_UpperWhiteCore", (kx, ky, kz + 7.35), (13.0, 7.4, 2.4), pal["shikkui_white"])
    add_box(collection, "Kondo_UpperTimberBands", (kx, ky, kz + 7.95), (13.3, 7.7, 0.55), pal["timber_dark"])
    build_detailed_irimoya_roof(
        collection,
        "Kondo_MainRoof",
        kx,
        ky,
        kz + 8.15,
        width_x=17.8,
        depth_y=11.4,
        height=3.35,
        sori_lift=0.86,
        pal=pal,
        has_kiriage=False,
        has_chigomune=True,
    )

    # Five-Colored Buddhist Curtain (五色幕 Goshikimaku) in front of Kondō (ref_toji_kondo.jpg!)
    maku_mats = (pal["maku_green"], pal["maku_yellow"], pal["maku_red"], pal["shikkui_white"], pal["maku_purple"])
    for side_x in (-1, 1):
        for s_idx in range(12):
            sx_pos = kx + side_x * (2.6 + s_idx * 0.48)
            add_box(
                collection,
                f"Kondo_Goshikimaku_{side_x}_{s_idx}",
                (sx_pos, ky - 7.5, kz + 0.55),
                (0.46, 0.06, 0.96),
                maku_mats[s_idx % 5],
            )


# ---------------------------------------------------------------------------
# Lotus Pond (瓢箪池・蓮池 with 3D Lotus Pads & Seed Pods) + Fuji-zakura (不二櫻) +
# Autumn Crimson Maples (紅葉) + Sculpted Pine & Weeping Willow
# (Matches `toji_angle1_pond.jpg` & `ref_toji_sakura.jpg`)
# ---------------------------------------------------------------------------
def build_toji_garden_and_pond(collection, pal, pagoda_offset=(0.0, 0.0, 0.0)):
    px, py, pz = pagoda_offset

    # 1. Iconic 13m Fuji-zakura Weeping Cherry (不二櫻) at West-Northwest of Pagoda (`ref_toji_sakura.jpg`)
    #    Sculpted with airy filigree dark branches, wooden crutch poles (添え木), and hundreds of delicate
    #    weeping blossom clusters so you can see the branches & pagoda through the blossoms!
    sx, sy, sz = px - 10.8, py - 5.5, pz
    p_trunk_base = Vector((sx, sy, sz))
    p_trunk_fork = Vector((sx + 0.25, sy - 0.15, sz + 4.2))
    add_segment_cylinder(collection, "Fujizakura_MainTrunk", p_trunk_base, p_trunk_fork, 0.44, 0.28, 12, pal["timber_dark"])

    bough_targets = [
        (sx - 2.4, sy - 1.8, sz + 7.2),
        (sx - 0.8, sy - 2.6, sz + 7.8),
        (sx + 1.9, sy - 2.2, sz + 7.5),
        (sx + 2.6, sy - 0.4, sz + 7.4),
        (sx + 1.5, sy + 2.0, sz + 7.9),
        (sx - 1.6, sy + 2.1, sz + 7.6),
        (sx - 0.2, sy + 0.2, sz + 9.2),
    ]
    for b_i, bt in enumerate(bough_targets):
        p_bt = Vector(bt)
        p_mid = p_trunk_fork.lerp(p_bt, 0.55) + Vector((0, 0, 0.5))
        add_segment_cylinder(collection, f"Fujizakura_BoughA_{b_i}", p_trunk_fork, p_mid, 0.20, 0.13, 8, pal["timber_dark"])
        add_segment_cylinder(collection, f"Fujizakura_BoughB_{b_i}", p_mid, p_bt, 0.13, 0.07, 8, pal["timber_dark"])

        # Wooden crutch support pole (添え木・支柱 — prominent in ref_toji_sakura.jpg!) under the outer boughs
        if b_i < 5:
            pole_top = p_mid.lerp(p_bt, 0.65)
            pole_bot = Vector((pole_top.x, pole_top.y, sz))
            add_segment_cylinder(collection, f"Fujizakura_SupportPole_{b_i}", pole_bot, pole_top, 0.065, 0.055, 8, pal["bamboo_pole"])
            add_box(collection, f"Fujizakura_SupportCrutch_{b_i}", tuple(pole_top + Vector((0, 0, 0.04))), (0.34, 0.10, 0.08), pal["bamboo_pole"])

        # Sub-branches & airy weeping sakura blossom strands (枝垂れ花房)
        for sub_i in range(6):
            ang = (sub_i / 6.0) * math.pi * 2.0 + b_i * 0.7
            rad = 0.65 + (sub_i % 3) * 0.48
            tip_x = p_bt.x + math.cos(ang) * rad
            tip_y = p_bt.y + math.sin(ang) * rad
            tip_z = p_bt.z + 0.35 - (sub_i % 2) * 0.25
            p_sub = Vector((tip_x, tip_y, tip_z))
            add_segment_cylinder(collection, f"Fujizakura_Twig_{b_i}_{sub_i}", p_bt, p_sub, 0.05, 0.025, 6, pal["timber_dark"])

            # Hanging weeping thread of small delicate sakura clusters (r = 0.18 ~ 0.28m)
            strand_len = 2.4 + ((b_i + sub_i) % 3) * 0.65
            p_strand_end = p_sub - Vector((0, 0, strand_len))
            add_segment_cylinder(collection, f"Fujizakura_WeepVine_{b_i}_{sub_i}", p_sub, p_strand_end, 0.018, 0.010, 5, pal["timber_dark"])
            for bead in range(6):
                u_b = bead / 5.0
                bz_pos = p_sub.lerp(p_strand_end, u_b)
                bz_pos.x += math.sin(bead * 1.4 + sub_i) * 0.08
                bz_pos.y += math.cos(bead * 1.7 + b_i) * 0.08
                b_rad = 0.26 - u_b * 0.08
                mat = pal["sakura_blossom"] if (bead + sub_i) % 2 == 0 else pal["sakura_snow"]
                add_icosphere(
                    collection,
                    f"Fujizakura_Blossom_{b_i}_{sub_i}_{bead}",
                    tuple(bz_pos),
                    b_rad,
                    1,
                    mat,
                    scale_xyz=(1.15, 1.15, 0.88),
                )

    # 2. Lotus Pond (瓢箪池・蓮池 at Southeast of Pagoda — matching `toji_angle1_pond.jpg`!)
    lx, ly, lz = px + 6.0, py - 15.0, pz
    add_box(collection, "LotusPond_Water", (lx, ly, lz + 0.03), (15.0, 11.5, 0.06), pal["pond_water"])
    # 56 Sculpted 3D Lotus Pads (蓮の葉) & Brown Seed Pods (蓮の花托) rising on stems in the foreground!
    for l_idx in range(56):
        row = l_idx // 8
        col = l_idx % 8
        pad_x = lx - 5.2 + col * 1.50 + math.sin(l_idx * 1.7) * 0.38
        pad_y = ly - 4.8 + row * 1.35 + math.cos(l_idx * 2.3) * 0.35
        stem_h = 0.38 + (l_idx % 4) * 0.16
        pad_r = 0.46 + (l_idx % 3) * 0.12
        pad_mat = pal["lotus_green"] if l_idx % 3 != 0 else pal["lotus_light"]
        add_cylinder(collection, f"Lotus_Stem_{l_idx}", (pad_x, pad_y, lz + stem_h * 0.5), 0.022, 0.018, stem_h, 6, pal["lotus_green"])
        add_cylinder(
            collection,
            f"Lotus_Leaf_{l_idx}",
            (pad_x, pad_y, lz + stem_h),
            pad_r * 0.32,
            pad_r,
            0.12,
            14,
            pad_mat,
            rot_euler=(math.sin(l_idx) * 0.14, math.cos(l_idx) * 0.14, 0),
        )
        if l_idx % 3 == 0:
            pod_h = stem_h + 0.28
            add_cylinder(collection, f"Lotus_PodStem_{l_idx}", (pad_x + 0.15, pad_y - 0.10, lz + pod_h * 0.5), 0.016, 0.014, pod_h, 6, pal["lotus_green"])
            add_cylinder(
                collection,
                f"Lotus_SeedPod_{l_idx}",
                (pad_x + 0.15, pad_y - 0.10, lz + pod_h),
                0.035,
                0.11,
                0.14,
                10,
                pal["seedpod_brown"],
                rot_euler=(0.22, -0.15, 0),
            )

    # 3. Airy Multi-Branch Japanese Maples (紅葉 Momiji) & Sculpted Pine flanking the Lotus Pond
    #    Positioned on the left/right edges of the pond so the center view to the Pagoda is open!
    maple_specs = (
        (lx - 5.8, ly + 4.5, 1.15),
        (lx + 6.4, ly + 3.8, 1.20),
    )
    for m_idx, (mx_pos, my_pos, sc) in enumerate(maple_specs):
        p_mbase = Vector((mx_pos, my_pos, lz))
        p_mfork = Vector((mx_pos, my_pos, lz + 2.4 * sc))
        add_segment_cylinder(collection, f"Momiji_Trunk_{m_idx}", p_mbase, p_mfork, 0.24 * sc, 0.15 * sc, 10, pal["timber_dark"])
        for mb_i in range(5):
            ang = (mb_i / 5.0) * math.pi * 2.0 + 0.4
            p_mbranch = p_mfork + Vector((math.cos(ang) * 1.4 * sc, math.sin(ang) * 1.4 * sc, (1.4 + (mb_i % 2) * 0.5) * sc))
            add_segment_cylinder(collection, f"Momiji_Branch_{m_idx}_{mb_i}", p_mfork, p_mbranch, 0.11 * sc, 0.05 * sc, 7, pal["timber_dark"])
            for leaf_i in range(7):
                lang = (leaf_i / 7.0) * math.pi * 2.0
                lrad = (0.45 + (leaf_i % 2) * 0.35) * sc
                lpos = p_mbranch + Vector((math.cos(lang) * lrad, math.sin(lang) * lrad, (leaf_i % 3) * 0.18 * sc))
                mat = (pal["momiji_crimson"], pal["momiji_orange"], pal["momiji_gold"])[(mb_i + leaf_i) % 3]
                add_icosphere(
                    collection,
                    f"Momiji_Foliage_{m_idx}_{mb_i}_{leaf_i}",
                    tuple(lpos),
                    0.38 * sc,
                    1,
                    mat,
                    scale_xyz=(1.35, 1.35, 0.48),
                )

    # Sculpted Pine (黒松) on right edge of pond (`toji_angle1_pond.jpg`)
    pnx, pny = lx + 4.8, ly - 2.6
    add_cylinder(collection, "Pine_Trunk", (pnx, pny, lz + 1.1), 0.22, 0.14, 2.2, 10, pal["timber_dark"], rot_euler=(0.15, -0.25, 0))
    for p_i, (dx, dy, dz, pr) in enumerate(((0, 0, 2.1, 0.85), (-0.6, 0.4, 1.8, 0.72), (0.6, -0.3, 2.4, 0.75))):
        add_icosphere(collection, f"Pine_Pad_{p_i}", (pnx + dx, pny + dy, lz + dz), pr, 1, pal["pine_green"], scale_xyz=(1.4, 1.4, 0.42))


def setup_daylight_sky(scene):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 44
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.image_settings.file_format = "PNG"

    world = bpy.data.worlds.get("TojiSky") or bpy.data.worlds.new("TojiSky")
    scene.world = world
    bg = world.node_tree.nodes.get("Background")
    if bg:
        # Clear Kyoto spring/autumn daylight blue sky matching `ref_toji_sakura.jpg` & `toji_angle2_pagode06.jpg`
        bg.inputs[0].default_value = (0.42, 0.58, 0.78, 1.0)
        bg.inputs[1].default_value = 1.35

    pal = create_toji_palette()
    add_box(scene.collection, "TojiCourtyardGround", (0, 0, -0.15), (180.0, 180.0, 0.30), pal["gravel_courtyard"])

    sun_data = bpy.data.lights.new(name="TojiSun", type="SUN")
    sun_data.energy = 4.8
    sun_data.color = (1.0, 0.95, 0.86)
    sun_obj = bpy.data.objects.new(name="TojiSun", object_data=sun_data)
    scene.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(48), math.radians(18), math.radians(-38))

    fill_data = bpy.data.lights.new(name="TojiSkyFill", type="SUN")
    fill_data.energy = 2.1
    fill_data.color = (0.78, 0.88, 1.0)
    fill_obj = bpy.data.objects.new(name="TojiSkyFill", object_data=fill_data)
    scene.collection.objects.link(fill_obj)
    fill_obj.rotation_euler = (math.radians(68), math.radians(-24), math.radians(142))
    return sun_obj


def point_camera_at(cam_obj, cam_pos, target_pos, lens=32.0):
    cam_obj.location = Vector(cam_pos)
    cam_obj.data.lens = lens
    direction = Vector(target_pos) - Vector(cam_pos)
    rot_quat = direction.to_track_quat("-Z", "Y")
    cam_obj.rotation_euler = rot_quat.to_euler()


def clear_meshes():
    for obj in list(bpy.data.objects):
        if obj.type == "MESH" and obj.name != "TojiCourtyardGround":
            bpy.data.objects.remove(obj, do_unlink=True)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    pal = create_toji_palette()
    sun_obj = setup_daylight_sky(scene)

    cam_data = bpy.data.cameras.new("TojiCam")
    cam_obj = bpy.data.objects.new("TojiCam", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    # Build the complete Tō-ji Pagoda + Fuji-zakura + Lotus Pond + Autumn Momiji scene
    clear_meshes()
    build_toji_pagoda_masterpiece(scene.collection, pal, offset=(0.0, 0.0, 0.0))
    build_toji_garden_and_pond(scene.collection, pal, pagoda_offset=(0.0, 0.0, 0.0))

    # Export updated high-detail `toji_gojunoto.glb`
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        if obj.type == "MESH" and obj.name != "TojiCourtyardGround":
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(GLB_OUT_DIR, "toji_gojunoto.glb"),
        use_selection=True,
        export_format="GLB",
        export_apply=True,
    )

    # -----------------------------------------------------------------------
    # Render Angle 1: Spring Fuji-zakura (不二櫻) + Five-Story Pagoda (matches `ref_toji_sakura.jpg`)
    # Camera placed so Fuji-zakura's weeping sakura branches & wooden crutch poles frame the left,
    # and the full 5-story pagoda + 9-ring Sōrin rises on the right!
    # -----------------------------------------------------------------------
    point_camera_at(cam_obj, (-9.5, -24.5, 3.2), (-3.8, -1.0, 12.2), lens=24.0)
    scene.render.filepath = os.path.join(ARTIFACT_DIR, "blender_toji_angle1_sakura.png")
    bpy.ops.render.render(write_still=True)

    # -----------------------------------------------------------------------
    # Render Angle 2: Unobstructed Low-Angle Upward Architectural Close-Up of Dark-Timber Pagoda,
    # 3-Rail Kumi-Kōran Balconies, White Inter-Bracket Frieze, Sumimune & Tamagaki Fence
    # (matches `toji_angle2_pagode06.jpg` & `toji_angle4_nt062.jpg`)
    # -----------------------------------------------------------------------
    point_camera_at(cam_obj, (-13.5, 17.5, 2.8), (0.0, 0.0, 13.8), lens=23.0)
    scene.render.filepath = os.path.join(ARTIFACT_DIR, "blender_toji_angle2_closeup_eaves.png")
    bpy.ops.render.render(write_still=True)

    # Full-complex overview for `blender_toji_gojunoto.png` (with full Sōrin spire headroom!)
    point_camera_at(cam_obj, (-2.5, -40.5, 11.8), (0.0, -2.0, 12.2), lens=22.0)
    scene.render.filepath = os.path.join(ARTIFACT_DIR, "blender_toji_gojunoto.png")
    bpy.ops.render.render(write_still=True)

    # -----------------------------------------------------------------------
    # Render Angle 3: View across the Lotus Pond (蓮池) with 3D Lotus Leaves, Seed Pods,
    # Autumn Crimson Maples & Five-Story Pagoda (matches `toji_angle1_pond.jpg`)
    # -----------------------------------------------------------------------
    sun_obj.rotation_euler = (math.radians(62), math.radians(24), math.radians(-48))  # Golden autumn low sun angle!
    point_camera_at(cam_obj, (6.0, -24.8, 2.35), (2.2, -7.5, 6.2), lens=20.0)
    scene.render.filepath = os.path.join(ARTIFACT_DIR, "blender_toji_angle3_lotus_pond_autumn.png")
    bpy.ops.render.render(write_still=True)

    # -----------------------------------------------------------------------
    # Render Angle 4: Kōdō (講堂 Vermilion & White + Red Benches + 21-Deity Mandala) &
    # Kondō (金堂 Double Roof + Kiriage Central Eave + 5-Colored Curtain)
    # (matches `toji_angle5_kodo_ext.jpg` & `ref_toji_kondo.jpg`)
    # -----------------------------------------------------------------------
    clear_meshes()
    sun_obj.rotation_euler = (math.radians(50), math.radians(16), math.radians(-34))
    build_toji_kondo_and_kodo_masterpiece(scene.collection, pal, offset=(0.0, 0.0, 0.0))
    point_camera_at(cam_obj, (0.0, -27.5, 9.8), (0.0, 0.0, 4.2), lens=24.0)
    scene.render.filepath = os.path.join(ARTIFACT_DIR, "blender_toji_kondo_mandala.png")
    bpy.ops.render.render(write_still=True)

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ARTIFACT_DIR, "toji_masterpiece.blend"))
    print("TOJI_MASTERPIECE_BLENDER_SUCCESS")


if __name__ == "__main__":
    main()
