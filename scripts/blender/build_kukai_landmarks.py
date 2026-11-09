"""
Blender 5.2 LTS Architectural Generator v2 for Stupa Game — Kōbō Daishi Kūkai Edition (#248, #249, #250)
Generates high-detail procedural Japanese Buddhist temple architecture via BMesh:
  1. Konpon Daitō (高野山・壇上伽藍 根本大塔) — Two-tiered Vermilion Tahōtō with Kamebara, Tokyō brackets, 16 pillars & Sōrin
  2. Tō-ji Gojū-no-tō (京都東寺・五重塔) — Five-Story Wooden Pagoda with Nokizori curved eaves, 4-direction hip ridges (隅棟), Tokyō brackets, balconies & Heart Pillar
  3. Tō-ji Kondō & Kōdō 21-Deity Rittai Mandala (東寺・金堂軒唐破風與講堂二十一尊立體曼荼羅)
  4. Kōyasan Kongōbu-ji Banryūtei & Okunoin (高野山・金剛峯寺蟠龍庭與奧之院萬燈御廟)
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


def create_palette():
    return {
        "vermilion": make_mat("Kukai_Vermilion", (0.80, 0.13, 0.08), roughness=0.34, metallic=0.06),
        "hinoki_dark": make_mat("Kukai_HinokiDark", (0.17, 0.10, 0.06), roughness=0.62, metallic=0.03),
        "hinoki_warm": make_mat("Kukai_HinokiWarm", (0.46, 0.29, 0.16), roughness=0.52, metallic=0.03),
        "hiwada_roof": make_mat("Kukai_HiwadaBark", (0.20, 0.15, 0.12), roughness=0.78, metallic=0.04),
        "kawara_tile": make_mat("Kukai_KawaraTile", (0.15, 0.17, 0.20), roughness=0.38, metallic=0.28),
        "plaster_white": make_mat("Kukai_WhitePlaster", (0.95, 0.93, 0.88), roughness=0.68, metallic=0.0),
        "stone_base": make_mat("Kukai_GraniteStone", (0.50, 0.48, 0.45), roughness=0.80, metallic=0.04),
        "stone_paving": make_mat("Kukai_StonePaving", (0.36, 0.35, 0.33), roughness=0.85, metallic=0.02),
        "stone_moss": make_mat("Kukai_MossStone", (0.30, 0.43, 0.28), roughness=0.82, metallic=0.02),
        "schist_blue": make_mat("Kukai_BlueSchist", (0.22, 0.35, 0.38), roughness=0.58, metallic=0.14),
        "shirakawa_sand": make_mat("Kukai_ShirakawaSand", (0.88, 0.87, 0.84), roughness=0.85, metallic=0.0),
        "gold": make_mat("Kukai_SacredGold", (0.96, 0.76, 0.22), roughness=0.18, metallic=0.94, emission_color=(0.90, 0.62, 0.12), emission_strength=0.45),
        "bronze_patina": make_mat("Kukai_BronzeSorin", (0.26, 0.48, 0.39), roughness=0.32, metallic=0.82),
        "flame_halo": make_mat("Kukai_GarudaFlame", (0.98, 0.24, 0.05), roughness=0.25, metallic=0.1, emission_color=(1.0, 0.30, 0.04), emission_strength=2.8),
        "fudo_indigo": make_mat("Kukai_FudoIndigo", (0.09, 0.15, 0.36), roughness=0.38, metallic=0.28),
        "lantern_glow": make_mat("Kukai_LanternGlow", (1.0, 0.84, 0.38), roughness=0.18, metallic=0.0, emission_color=(1.0, 0.74, 0.22), emission_strength=3.6),
        "green_window": make_mat("Kukai_RenjiGreen", (0.14, 0.44, 0.29), roughness=0.50, metallic=0.08),
        "water": make_mat("Kukai_PondWater", (0.10, 0.30, 0.35), roughness=0.06, metallic=0.18),
        "cedar_foliage": make_mat("Kukai_CedarFoliage", (0.10, 0.27, 0.14), roughness=0.78, metallic=0.0),
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


def add_japanese_pagoda_roof(
    collection,
    name,
    center_xy,
    z_base,
    span_bottom,
    span_top,
    height,
    sori_lift,
    thickness,
    roof_mat,
    rafter_mat=None,
    gold_mat=None,
    grid_n=24,
):
    """
    Constructs a high-resolution curved Japanese pyramidal/hipped pagoda roof (宝形造 / 四注屋根)
    centered at `center_xy` with smooth catenary curves, upturned Nokizori eaves, corner hip ridges (隅棟),
    and bronze wind bells (風鐸).
    """
    cx, cy = center_xy
    obj, mesh = new_mesh_obj(name, collection, roof_mat)
    bm = bmesh.new()

    half_b = span_bottom * 0.5
    half_t = span_top * 0.5

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

            slope_profile = (1.0 - chebyshev) ** 1.42
            corner_factor = (abs(u_frac) * abs(v_frac)) * (chebyshev ** 1.55)
            # Subtle tile fluting rib along the roof
            tile_rib = math.sin(u_frac * 28.0) * math.sin(v_frac * 28.0) * 0.015 * chebyshev
            z = z_base + height * slope_profile + sori_lift * corner_factor + tile_rib

            vt = bm.verts.new((x, y, z + thickness * 0.5))
            vb = bm.verts.new((x, y, z - thickness * 0.5))
            row_t.append(vt)
            row_b.append(vb)
        top_verts.append(row_t)
        bot_verts.append(row_b)

    for iy in range(grid_n):
        for ix in range(grid_n):
            f1 = bm.faces.new((
                top_verts[iy][ix],
                top_verts[iy][ix + 1],
                top_verts[iy + 1][ix + 1],
                top_verts[iy + 1][ix],
            ))
            f1.smooth = True
            f2 = bm.faces.new((
                bot_verts[iy][ix],
                bot_verts[iy + 1][ix],
                bot_verts[iy + 1][ix + 1],
                bot_verts[iy][ix + 1],
            ))
            f2.smooth = True

    for i in range(grid_n):
        bm.faces.new((bot_verts[0][i], bot_verts[0][i + 1], top_verts[0][i + 1], top_verts[0][i]))
        bm.faces.new((top_verts[grid_n][i], top_verts[grid_n][i + 1], bot_verts[grid_n][i + 1], bot_verts[grid_n][i]))
        bm.faces.new((top_verts[i][0], top_verts[i + 1][0], bot_verts[i + 1][0], bot_verts[i][0]))
        bm.faces.new((bot_verts[i][grid_n], bot_verts[i + 1][grid_n], top_verts[i + 1][grid_n], top_verts[i][grid_n]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    # Add 4 corner hip ridge beams (隅棟 Sumimune) & hanging bronze wind bells (風鐸)
    if rafter_mat:
        for sx in (-1, 1):
            for sy in (-1, 1):
                bell_x = cx + sx * half_b * 0.94
                bell_y = cy + sy * half_b * 0.94
                bell_z = z_base + sori_lift * 0.85 - 0.24
                add_cylinder(
                    collection,
                    f"{name}_Futaku_{sx}_{sy}",
                    (bell_x, bell_y, bell_z),
                    0.11,
                    0.07,
                    0.36,
                    10,
                    rafter_mat,
                )
                if gold_mat:
                    add_box(
                        collection,
                        f"{name}_CornerOrn_{sx}_{sy}",
                        (cx + sx * half_b * 0.96, cy + sy * half_b * 0.96, z_base + sori_lift * 0.96 + 0.12),
                        (0.24, 0.24, 0.22),
                        gold_mat,
                    )
    return obj


def add_irimoya_roof(
    collection,
    name,
    center_xy,
    z_base,
    width_x,
    depth_y,
    height,
    sori_lift,
    roof_mat,
    gold_mat,
    has_karahafu=False,
):
    cx, cy = center_xy
    obj, mesh = new_mesh_obj(name, collection, roof_mat)
    bm = bmesh.new()

    nx, ny = 28, 20
    hx = width_x * 0.5
    hy = depth_y * 0.5
    ridge_half_x = hx * 0.50

    verts_top = []
    verts_bot = []
    thickness = 0.28

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

            slope = (1.0 - dist) ** 1.35
            corner_sori = (abs(vx_norm) * abs(vy_norm)) ** 1.5 * sori_lift
            karahafu_arch = 0.0
            if has_karahafu and vy_norm < -0.42 and abs(vx_norm) < 0.28:
                u_arch = abs(vx_norm) / 0.28
                front_edge = (abs(vy_norm) - 0.42) / 0.58
                karahafu_arch = (math.cos(u_arch * math.pi * 0.5) ** 1.6) * front_edge * (height * 0.40)

            z = z_base + height * slope + corner_sori + karahafu_arch
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

    ridge_z = z_base + height + 0.22
    add_box(collection, f"{name}_Omune", (cx, cy, ridge_z), (ridge_half_x * 2.04, 0.52, 0.44), roof_mat)
    for sx in (-1, 1):
        add_box(
            collection,
            f"{name}_Shibi_{sx}",
            (cx + sx * ridge_half_x * 1.02, cy, ridge_z + 0.42),
            (0.42, 0.60, 0.76),
            gold_mat,
        )
    return obj


def add_sorin_finial(collection, name, cx, cy, z_start, total_height, bronze_mat, gold_mat):
    add_box(collection, f"{name}_Roban", (cx, cy, z_start + 0.28), (1.42, 1.42, 0.56), bronze_mat)
    add_cylinder(collection, f"{name}_Fukubachi", (cx, cy, z_start + 0.78), 0.65, 0.44, 0.48, 20, bronze_mat)
    add_cylinder(collection, f"{name}_Ukebana", (cx, cy, z_start + 1.15), 0.38, 0.58, 0.28, 16, gold_mat)
    add_cylinder(
        collection,
        f"{name}_Shaft",
        (cx, cy, z_start + total_height * 0.5),
        0.19,
        0.11,
        total_height,
        16,
        bronze_mat,
    )
    ring_start = z_start + 1.45
    ring_span = total_height * 0.48
    for i in range(9):
        rz = ring_start + (i / 8.0) * ring_span
        rr = 0.55 - i * 0.018
        add_cylinder(collection, f"{name}_Kurin_{i}", (cx, cy, rz), rr, rr, 0.10, 24, gold_mat)
    suien_z = z_start + total_height * 0.78
    for ang_deg in (0, 45, 90, 135):
        add_box(
            collection,
            f"{name}_Suien_{ang_deg}",
            (cx, cy, suien_z),
            (1.05, 0.05, total_height * 0.19),
            gold_mat,
            rot_euler=(0, 0, math.radians(ang_deg)),
        )
    add_cylinder(
        collection,
        f"{name}_Hoju",
        (cx, cy, z_start + total_height * 0.96),
        0.32,
        0.04,
        0.62,
        20,
        gold_mat,
    )


def add_deity_statue(collection, name, pos, scale, body_mat, halo_mat, is_seated=True, is_wrathful=False):
    x, y, z = pos
    add_cylinder(collection, f"{name}_PedestalBase", (x, y, z + 0.22 * scale), 0.56 * scale, 0.44 * scale, 0.44 * scale, 16, body_mat)
    add_cylinder(collection, f"{name}_LotusSeat", (x, y, z + 0.52 * scale), 0.42 * scale, 0.56 * scale, 0.24 * scale, 16, halo_mat)
    body_h = (0.88 if is_seated else 1.38) * scale
    body_z = z + 0.62 * scale + body_h * 0.5
    add_cylinder(collection, f"{name}_Torso", (x, y, body_z), 0.37 * scale, 0.24 * scale, body_h, 16, body_mat)
    head_z = z + 0.62 * scale + body_h + 0.22 * scale
    add_cylinder(collection, f"{name}_Head", (x, y, head_z), 0.19 * scale, 0.16 * scale, 0.36 * scale, 16, body_mat)
    add_cylinder(collection, f"{name}_Crown", (x, y, head_z + 0.22 * scale), 0.14 * scale, 0.05 * scale, 0.22 * scale, 12, halo_mat)
    halo_w = (1.22 if is_wrathful else 0.98) * scale
    add_cylinder(
        collection,
        f"{name}_Halo",
        (x, y + 0.28 * scale, body_z + 0.15 * scale),
        halo_w * 0.5,
        halo_w * 0.16 if is_wrathful else halo_w * 0.46,
        0.08 * scale,
        20,
        halo_mat,
        rot_euler=(math.pi * 0.5, 0, 0),
    )


# ---------------------------------------------------------------------------
# 1. Build Konpon Daitō (高野山・壇上伽藍 根本大塔)
# ---------------------------------------------------------------------------
def build_konpon_daito(collection, pal, offset=(0.0, 0.0, 0.0)):
    ox, oy, oz = offset
    add_box(collection, "Konpon_StonePodium", (ox, oy, oz + 0.65), (14.2, 14.2, 1.3), pal["stone_base"])
    add_box(collection, "Konpon_PodiumTrim", (ox, oy, oz + 1.34), (14.5, 14.5, 0.16), pal["vermilion"])
    for sx, sy, w, d in ((0, -7.6, 3.4, 1.8), (0, 7.6, 3.4, 1.8), (-7.6, 0, 1.8, 3.4), (7.6, 0, 1.8, 3.4)):
        add_box(collection, f"Konpon_Step_{sx}_{sy}", (ox + sx, oy + sy, oz + 0.45), (w, d, 0.9), pal["stone_base"])

    # Lower square hall (white plaster walls + 16 vermilion columns + green lattice windows + open portals)
    add_box(collection, "Konpon_LowerCore", (ox, oy, oz + 3.9), (9.8, 9.8, 5.0), pal["plaster_white"])
    add_box(collection, "Konpon_FrontPortal", (ox, oy - 4.92, oz + 3.4), (3.2, 0.18, 3.8), pal["hinoki_dark"])
    for wx in (-3.2, 3.2):
        add_box(collection, f"Konpon_Renji_{wx}", (ox + wx, oy - 4.92, oz + 3.9), (1.4, 0.12, 1.8), pal["green_window"])

    for px in (-4.9, -2.4, 2.4, 4.9):
        for py in (-4.9, -2.4, 2.4, 4.9):
            if abs(px) == 4.9 or abs(py) == 4.9:
                add_cylinder(collection, f"Konpon_Pillar_{px}_{py}", (ox + px, oy + py, oz + 3.9), 0.25, 0.23, 5.1, 16, pal["vermilion"])

    # Vermilion Tokyō bracket frieze under lower roof
    add_box(collection, "Konpon_LowerTokyo", (ox, oy, oz + 6.1), (10.6, 10.6, 0.55), pal["vermilion"])
    add_japanese_pagoda_roof(
        collection,
        "Konpon_LowerRoof",
        center_xy=(ox, oy),
        z_base=oz + 5.8,
        span_bottom=16.2,
        span_top=8.4,
        height=2.5,
        sori_lift=0.82,
        thickness=0.30,
        roof_mat=pal["kawara_tile"],
        rafter_mat=pal["gold"],
        gold_mat=pal["gold"],
    )

    # White plaster Kamebara dome collar (龜腹)
    add_cylinder(collection, "Konpon_KamebaraBase", (ox, oy, oz + 8.3), 4.7, 4.15, 1.4, 32, pal["plaster_white"])
    add_cylinder(collection, "Konpon_KamebaraDome", (ox, oy, oz + 9.4), 4.15, 3.25, 1.25, 32, pal["plaster_white"])

    # Upper cylindrical core (上層圓堂) with vermilion railing & multi-tiered bracket ring
    add_cylinder(collection, "Konpon_UpperCore", (ox, oy, oz + 11.2), 3.28, 3.18, 2.8, 32, pal["vermilion"])
    add_cylinder(collection, "Konpon_UpperRailing", (ox, oy, oz + 10.2), 3.82, 3.82, 0.48, 32, pal["vermilion"])
    add_cylinder(collection, "Konpon_UpperBrackets", (ox, oy, oz + 12.2), 3.65, 3.95, 0.45, 32, pal["vermilion"])

    add_japanese_pagoda_roof(
        collection,
        "Konpon_UpperRoof",
        center_xy=(ox, oy),
        z_base=oz + 12.1,
        span_bottom=12.2,
        span_top=1.2,
        height=3.6,
        sori_lift=0.98,
        thickness=0.30,
        roof_mat=pal["kawara_tile"],
        rafter_mat=pal["gold"],
        gold_mat=pal["gold"],
    )

    add_sorin_finial(collection, "Konpon_Sorin", ox, oy, oz + 15.6, 6.8, pal["bronze_patina"], pal["gold"])

    # Interior Three-Dimensional Mandala (胎藏界大日如來 + 金剛界四佛)
    add_deity_statue(collection, "Konpon_Dainichi", (ox, oy, oz + 1.4), 1.5, pal["gold"], pal["gold"], is_seated=True)
    for idx, (dx, dy) in enumerate(((-2.2, -2.2), (2.2, -2.2), (-2.2, 2.2), (2.2, 2.2))):
        add_deity_statue(collection, f"Konpon_FourBuddha_{idx}", (ox + dx, oy + dy, oz + 1.4), 0.95, pal["gold"], pal["gold"], is_seated=True)


# ---------------------------------------------------------------------------
# 2. Build Tō-ji Gojū-no-tō (京都東寺・五重塔)
# ---------------------------------------------------------------------------
def build_toji_gojunoto(collection, pal, offset=(0.0, 0.0, 0.0)):
    ox, oy, oz = offset
    add_box(collection, "TojiPagoda_Podium", (ox, oy, oz + 0.65), (11.8, 11.8, 1.3), pal["stone_base"])
    for sx, sy, w, d in ((0, -6.4, 2.8, 1.4), (0, 6.4, 2.8, 1.4), (-6.4, 0, 1.4, 2.8), (6.4, 0, 1.4, 2.8)):
        add_box(collection, f"TojiPagoda_Step_{sx}_{sy}", (ox + sx, oy + sy, oz + 0.42), (w, d, 0.84), pal["stone_base"])

    # Central Heart Pillar (心柱即大日如來)
    add_cylinder(collection, "TojiPagoda_Shinbashira", (ox, oy, oz + 12.5), 0.44, 0.28, 23.5, 20, pal["gold"])
    for idx, (dx, dy) in enumerate(((0, -1.7), (0, 1.7), (-1.7, 0), (1.7, 0))):
        add_deity_statue(collection, f"TojiPagoda_Buddha_{idx}", (ox + dx, oy + dy, oz + 1.3), 0.88, pal["gold"], pal["gold"])

    cur_z = oz + 1.3
    for story in range(5):
        t = story / 4.0
        core_w = 6.9 - t * 2.2
        story_h = 3.15 - t * 0.42
        roof_span = 11.8 - t * 3.4
        roof_h = 1.68 - t * 0.18
        sori = 0.72 - t * 0.12

        # White plaster core & dark hinoki corner columns
        add_box(
            collection,
            f"TojiPagoda_Core_{story+1}",
            (ox, oy, cur_z + story_h * 0.5),
            (core_w, core_w, story_h),
            pal["plaster_white"],
        )
        half_c = core_w * 0.5
        for cx_s in (-1, 1):
            for cy_s in (-1, 1):
                add_cylinder(
                    collection,
                    f"TojiPagoda_CornerCol_{story+1}_{cx_s}_{cy_s}",
                    (ox + cx_s * half_c, oy + cy_s * half_c, cur_z + story_h * 0.5),
                    0.18,
                    0.17,
                    story_h,
                    12,
                    pal["hinoki_dark"],
                )

        # Multi-stepped Tokyō bracket complex (三手先斗栱)
        add_box(
            collection,
            f"TojiPagoda_BracketsA_{story+1}",
            (ox, oy, cur_z + story_h * 0.82),
            (core_w + 0.48, core_w + 0.48, 0.28),
            pal["vermilion"],
        )
        add_box(
            collection,
            f"TojiPagoda_BracketsB_{story+1}",
            (ox, oy, cur_z + story_h * 0.94),
            (core_w + 0.92, core_w + 0.92, 0.26),
            pal["hinoki_warm"],
        )
        if story > 0:
            add_box(
                collection,
                f"TojiPagoda_Balcony_{story+1}",
                (ox, oy, cur_z + 0.24),
                (core_w + 0.96, core_w + 0.96, 0.38),
                pal["hinoki_dark"],
            )

        add_japanese_pagoda_roof(
            collection,
            f"TojiPagoda_Roof_{story+1}",
            center_xy=(ox, oy),
            z_base=cur_z + story_h * 0.74,
            span_bottom=roof_span,
            span_top=max(1.1, core_w - 0.5),
            height=roof_h,
            sori_lift=sori,
            thickness=0.24,
            roof_mat=pal["kawara_tile"],
            rafter_mat=pal["bronze_patina"],
            gold_mat=pal["gold"],
        )
        cur_z += story_h + roof_h * 0.56

    add_sorin_finial(collection, "TojiPagoda_Sorin", ox, oy, cur_z + 0.25, 7.6, pal["bronze_patina"], pal["gold"])


# ---------------------------------------------------------------------------
# 3. Build Tō-ji Kondō & Kōdō 21-Deity Rittai Mandala (東寺・金堂與講堂立體曼荼羅)
# ---------------------------------------------------------------------------
def build_toji_kondo_and_kodo(collection, pal):
    # --- A. Kondō (金堂: Double-roofed Irimoya with Noki-Karahafu front gable) at left (-11, 0) ---
    kx, ky, kz = -11.5, 0.0, 0.0
    add_box(collection, "TojiKondo_Podium", (kx, ky, kz + 0.55), (17.2, 11.2, 1.1), pal["stone_base"])
    add_box(collection, "TojiKondo_Step", (kx, ky - 6.1, kz + 0.35), (4.6, 1.4, 0.7), pal["stone_base"])
    add_box(collection, "TojiKondo_LowerWall", (kx, ky, kz + 3.1), (14.8, 8.8, 4.0), pal["hinoki_dark"])
    add_box(collection, "TojiKondo_OpenSanctum", (kx, ky - 4.42, kz + 2.7), (5.8, 0.16, 3.0), pal["hinoki_warm"])
    for px in (-7.2, -4.8, -2.4, 2.4, 4.8, 7.2):
        add_cylinder(collection, f"TojiKondo_Col_{px}", (kx + px, ky - 4.42, kz + 3.1), 0.22, 0.20, 4.0, 14, pal["hinoki_dark"])

    add_irimoya_roof(
        collection,
        "TojiKondo_LowerRoof",
        (kx, ky),
        z_base=kz + 4.6,
        width_x=18.4,
        depth_y=12.2,
        height=1.85,
        sori_lift=0.58,
        roof_mat=pal["kawara_tile"],
        gold_mat=pal["gold"],
        has_karahafu=True,
    )
    add_box(collection, "TojiKondo_UpperCore", (kx, ky, kz + 7.0), (12.4, 6.8, 2.3), pal["plaster_white"])
    add_irimoya_roof(
        collection,
        "TojiKondo_MainRoof",
        (kx, ky),
        z_base=kz + 7.8,
        width_x=16.6,
        depth_y=10.4,
        height=3.0,
        sori_lift=0.75,
        roof_mat=pal["kawara_tile"],
        gold_mat=pal["gold"],
        has_karahafu=False,
    )
    add_deity_statue(collection, "TojiKondo_Yakushi", (kx, ky - 2.2, kz + 1.1), 1.35, pal["gold"], pal["gold"], is_seated=True)
    add_deity_statue(collection, "TojiKondo_Nikko", (kx + 2.2, ky - 2.2, kz + 1.1), 1.0, pal["gold"], pal["gold"], is_seated=False)
    add_deity_statue(collection, "TojiKondo_Gakko", (kx - 2.2, ky - 2.2, kz + 1.1), 1.0, pal["gold"], pal["gold"], is_seated=False)

    # --- B. Kōdō & Exposed 21-Deity 3D Mandala (講堂・二十一尊立體曼荼羅) at right (+10.5, 0) ---
    mx, my, mz = 10.5, 0.0, 0.0
    add_box(collection, "TojiKodo_SumeruAltar", (mx, my, mz + 0.55), (16.4, 6.6, 1.1), pal["plaster_white"])
    add_box(collection, "TojiKodo_AltarTrim", (mx, my, mz + 1.12), (16.8, 7.0, 0.16), pal["vermilion"])

    # 1) Center: 5 Wisdom Buddhas (五智如來 — 佛部)
    add_deity_statue(collection, "Mandala_Dainichi", (mx, my, mz + 1.15), 1.48, pal["gold"], pal["gold"], is_seated=True)
    for i, (dx, dy) in enumerate(((-1.55, -1.2), (1.55, -1.2), (-1.55, 1.2), (1.55, 1.2))):
        add_deity_statue(collection, f"Mandala_Buddha_{i}", (mx + dx, my + dy, mz + 1.15), 0.92, pal["gold"], pal["gold"], is_seated=True)

    # 2) East (+X): 5 Great Bodhisattvas (五菩薩 — 菩薩部)
    bx = mx + 4.3
    add_deity_statue(collection, "Mandala_Kongoharamitsu", (bx, my, mz + 1.15), 1.14, pal["gold"], pal["gold"], is_seated=True)
    for i, (dx, dy) in enumerate(((-1.15, -1.1), (1.15, -1.1), (-1.15, 1.1), (1.15, 1.1))):
        add_deity_statue(collection, f"Mandala_Bodhisattva_{i}", (bx + dx, my + dy, mz + 1.15), 0.85, pal["gold"], pal["gold"], is_seated=False)

    # 3) West (-X): 5 Wisdom Kings (五大明王 — 明王部 with blazing Garuda flame halos!)
    wx = mx - 4.3
    add_deity_statue(collection, "Mandala_FudoMyoo", (wx, my, mz + 1.15), 1.20, pal["fudo_indigo"], pal["flame_halo"], is_seated=True, is_wrathful=True)
    for i, (dx, dy) in enumerate(((-1.15, -1.1), (1.15, -1.1), (-1.15, 1.1), (1.15, 1.1))):
        add_deity_statue(collection, f"Mandala_Myoo_{i}", (wx + dx, my + dy, mz + 1.15), 0.90, pal["fudo_indigo"], pal["flame_halo"], is_seated=False, is_wrathful=True)

    # 4) Outer Ends & Four Corners: Bonten, Taishakuten & Four Heavenly Kings (梵天・帝釋天・四天王 — 天部)
    add_deity_statue(collection, "Mandala_Bonten", (mx + 7.1, my, mz + 1.15), 1.05, pal["gold"], pal["gold"], is_seated=False)
    add_deity_statue(collection, "Mandala_Taishakuten", (mx - 7.1, my, mz + 1.15), 1.05, pal["gold"], pal["gold"], is_seated=False)
    for i, (dx, dy) in enumerate(((-7.4, -2.3), (7.4, -2.3), (-7.4, 2.3), (7.4, 2.3))):
        add_deity_statue(collection, f"Mandala_Shiteno_{i}", (mx + dx, my + dy, mz + 1.15), 1.02, pal["bronze_patina"], pal["gold"], is_seated=False)

    # Kōdō Hall framing behind the 21-Deity Altar (講堂丹柱白壁大殿)
    add_box(collection, "TojiKodo_BackWall", (mx, my + 4.2, mz + 3.6), (19.2, 1.0, 5.2), pal["plaster_white"])
    for px in (-9.0, -6.0, -3.0, 0.0, 3.0, 6.0, 9.0):
        add_cylinder(collection, f"TojiKodo_Pillar_{px}", (mx + px, my - 3.6, mz + 3.6), 0.22, 0.20, 5.2, 14, pal["vermilion"])
    add_irimoya_roof(
        collection,
        "TojiKodo_Roof",
        (mx, my + 0.8),
        z_base=mz + 6.1,
        width_x=21.2,
        depth_y=11.0,
        height=3.1,
        sori_lift=0.68,
        roof_mat=pal["kawara_tile"],
        gold_mat=pal["gold"],
    )


# ---------------------------------------------------------------------------
# 4. Build Kongōbu-ji Banryūtei & Okunoin (高野山・金剛峯寺蟠龍庭與奧之院萬燈御廟)
# ---------------------------------------------------------------------------
def build_koyasan_kongobuji_and_okunoin(collection, pal):
    # --- A. Kongōbu-ji Main Hall & Banryūtei Rock Garden (金剛峯寺主殿與蟠龍庭) at left (-10.0) ---
    kx, ky, kz = -10.0, 0.0, 0.0
    add_box(collection, "Kongobuji_Base", (kx, ky + 4.8, kz + 0.45), (14.8, 9.2, 0.9), pal["stone_base"])
    add_box(collection, "Kongobuji_Hall", (kx, ky + 4.8, kz + 2.8), (13.4, 8.0, 3.8), pal["plaster_white"])
    for px in (-6.4, -3.2, 0.0, 3.2, 6.4):
        add_cylinder(collection, f"Kongobuji_Col_{px}", (kx + px, ky + 0.78, kz + 2.8), 0.18, 0.17, 3.8, 12, pal["hinoki_dark"])

    add_irimoya_roof(
        collection,
        "Kongobuji_HiwadaRoof",
        (kx, ky + 4.8),
        z_base=kz + 4.5,
        width_x=16.2,
        depth_y=10.6,
        height=2.9,
        sori_lift=0.58,
        roof_mat=pal["hiwada_roof"],
        gold_mat=pal["gold"],
        has_karahafu=True,
    )
    for bx in (-2.2, 2.2):
        add_cylinder(collection, f"Kongobuji_TensuiOke_{bx}", (kx + bx, ky + 4.8, kz + 7.85), 0.44, 0.50, 0.76, 16, pal["hinoki_warm"])

    # Banryūtei Coiling Dragon Dry-Landscape Garden (蟠龍庭枯山水石庭)
    add_box(collection, "Banryutei_SandBed", (kx, ky - 4.4, kz + 0.08), (14.4, 7.8, 0.16), pal["shirakawa_sand"])
    for r_idx in range(1, 7):
        add_box(
            collection,
            f"Banryutei_WaveGroove_{r_idx}",
            (kx, ky - 8.0 + r_idx * 1.05, kz + 0.17),
            (13.8, 0.12, 0.03),
            pal["plaster_white"],
        )
    for d_idx in range(28):
        angle = (d_idx / 28.0) * math.pi * 2.4
        rx = kx + math.cos(angle) * 4.8 + (1.1 if d_idx % 2 == 0 else -1.1)
        ry = (ky - 4.4) + math.sin(angle) * 2.4
        rz = kz + 0.36 + 0.18 * math.sin(d_idx * 0.7)
        add_box(
            collection,
            f"Banryutei_DragonStone_{d_idx}",
            (rx, ry, rz),
            (0.68, 0.44, 0.65 + (d_idx % 3) * 0.24),
            pal["schist_blue"],
            rot_euler=(0.15, -0.2, angle),
        )

    # --- B. Okunoin Tōrōdō, Gobyōbashi & Kōbō Daishi Gobyō (奧之院・御廟橋・萬燈籠堂・弘法大師御廟) at right (+10.0) ---
    ox, oy, oz = 10.0, 0.0, 0.0
    add_box(collection, "Okunoin_Stream", (ox, oy - 6.4, oz + 0.04), (13.0, 2.8, 0.08), pal["water"])
    add_box(collection, "Okunoin_Gobyobashi", (ox, oy - 6.4, oz + 0.42), (3.6, 3.8, 0.26), pal["hinoki_warm"])
    for sx in (-1.65, 1.65):
        for sy in (-1.6, 0.0, 1.6):
            add_cylinder(collection, f"Okunoin_Giboshi_{sx}_{sy}", (ox + sx, oy - 6.4 + sy, oz + 0.85), 0.13, 0.09, 0.68, 12, pal["bronze_patina"])

    add_box(collection, "Okunoin_TorodoPodium", (ox, oy - 0.6, oz + 0.45), (11.2, 5.6, 0.9), pal["stone_base"])
    for px in (-4.8, -2.4, 2.4, 4.8):
        add_cylinder(collection, f"Okunoin_TorodoCol_{px}", (ox + px, oy - 3.1, oz + 2.1), 0.18, 0.17, 2.6, 12, pal["hinoki_dark"])
    add_irimoya_roof(
        collection,
        "Okunoin_TorodoRoof",
        (ox, oy - 0.6),
        z_base=oz + 3.4,
        width_x=12.4,
        depth_y=6.8,
        height=2.2,
        sori_lift=0.48,
        roof_mat=pal["hiwada_roof"],
        gold_mat=pal["gold"],
    )
    for lx in range(-4, 5, 2):
        for ly in (-2, 0, 2):
            add_cylinder(
                collection,
                f"Okunoin_Lantern_{lx}_{ly}",
                (ox + lx * 0.98, oy - 0.6 + ly * 0.78, oz + 2.55),
                0.17,
                0.15,
                0.44,
                10,
                pal["lantern_glow"],
            )

    # Kōbō Daishi Gobyō Mausoleum (弘法大師御廟) — properly centered at (ox, oy + 6.4)
    add_box(collection, "Okunoin_GobyoBase", (ox, oy + 6.4, oz + 0.75), (6.6, 6.6, 1.5), pal["stone_base"])
    add_box(collection, "Okunoin_GobyoSanctum", (ox, oy + 6.4, oz + 2.6), (4.8, 4.8, 2.4), pal["hinoki_dark"])
    add_japanese_pagoda_roof(
        collection,
        "Okunoin_GobyoRoof",
        center_xy=(ox, oy + 6.4),
        z_base=oz + 3.6,
        span_bottom=7.8,
        span_top=0.6,
        height=2.5,
        sori_lift=0.58,
        thickness=0.24,
        roof_mat=pal["hiwada_roof"],
        rafter_mat=pal["gold"],
        gold_mat=pal["gold"],
    )
    add_sorin_finial(collection, "Okunoin_GobyoFinial", ox, oy + 6.4, oz + 6.0, 2.4, pal["bronze_patina"], pal["gold"])

    for gx, gy in ((ox - 5.4, oy - 3.4), (ox + 5.4, oy - 3.4), (ox - 5.0, oy + 3.4), (ox + 5.0, oy + 3.4)):
        add_box(collection, f"Gorinto_Earth_{gx}_{gy}", (gx, gy, oz + 0.45), (0.88, 0.88, 0.9), pal["stone_moss"])
        add_cylinder(collection, f"Gorinto_Water_{gx}_{gy}", (gx, gy, oz + 1.25), 0.45, 0.45, 0.68, 16, pal["stone_moss"])
        add_cylinder(collection, f"Gorinto_Fire_{gx}_{gy}", (gx, gy, oz + 1.85), 0.54, 0.18, 0.52, 4, pal["stone_moss"], smooth=False)
        add_cylinder(collection, f"Gorinto_Wind_{gx}_{gy}", (gx, gy, oz + 2.28), 0.33, 0.37, 0.34, 16, pal["stone_moss"])
        add_cylinder(collection, f"Gorinto_Void_{gx}_{gy}", (gx, gy, oz + 2.65), 0.27, 0.04, 0.44, 16, pal["stone_moss"])

    for cx_pos, cy_pos in ((ox - 6.6, oy + 7.6), (ox + 6.6, oy + 7.6), (ox - 6.8, oy - 1.5), (ox + 6.8, oy - 1.5)):
        add_cylinder(collection, f"Cedar_Trunk_{cx_pos}_{cy_pos}", (cx_pos, cy_pos, oz + 5.5), 0.58, 0.32, 11.0, 14, pal["hinoki_dark"])
        add_cylinder(collection, f"Cedar_Crown1_{cx_pos}_{cy_pos}", (cx_pos, cy_pos, oz + 8.5), 2.4, 0.6, 4.5, 14, pal["cedar_foliage"])
        add_cylinder(collection, f"Cedar_Crown2_{cx_pos}_{cy_pos}", (cx_pos, cy_pos, oz + 11.2), 1.8, 0.2, 4.0, 14, pal["cedar_foliage"])


def setup_studio_environment(scene):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 36
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.image_settings.file_format = "PNG"

    world = bpy.data.worlds.get("KukaiWorld") or bpy.data.worlds.new("KukaiWorld")
    scene.world = world
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.12, 0.15, 0.21, 1.0)
        bg.inputs[1].default_value = 1.25

    pal = create_palette()
    add_box(scene.collection, "StudioGround", (0, 0, -0.15), (140.0, 140.0, 0.3), pal["stone_paving"])

    key_data = bpy.data.lights.new(name="SunKey", type="SUN")
    key_data.energy = 4.5
    key_data.color = (1.0, 0.94, 0.84)
    key_obj = bpy.data.objects.new(name="SunKey", object_data=key_data)
    scene.collection.objects.link(key_obj)
    key_obj.rotation_euler = (math.radians(52), math.radians(16), math.radians(-32))

    fill_data = bpy.data.lights.new(name="SkyFill", type="SUN")
    fill_data.energy = 1.8
    fill_data.color = (0.74, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="SkyFill", object_data=fill_data)
    scene.collection.objects.link(fill_obj)
    fill_obj.rotation_euler = (math.radians(65), math.radians(-22), math.radians(148))


def point_camera_at(cam_obj, cam_pos, target_pos, lens=32.0):
    cam_obj.location = Vector(cam_pos)
    cam_obj.data.lens = lens
    direction = Vector(target_pos) - Vector(cam_pos)
    rot_quat = direction.to_track_quat("-Z", "Y")
    cam_obj.rotation_euler = rot_quat.to_euler()


def clear_all_meshes():
    for obj in list(bpy.data.objects):
        if obj.type == "MESH" and obj.name != "StudioGround":
            bpy.data.objects.remove(obj, do_unlink=True)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    pal = create_palette()
    setup_studio_environment(scene)

    cam_data = bpy.data.cameras.new("StudioCam")
    cam_obj = bpy.data.objects.new("StudioCam", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    # 1. Build & Export Konpon Daitō (高野山・根本大塔) — Full spire framed!
    clear_all_meshes()
    build_konpon_daito(scene.collection, pal)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        if obj.type == "MESH" and obj.name != "StudioGround":
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(GLB_OUT_DIR, "konpon_daito.glb"),
        use_selection=True,
        export_format="GLB",
        export_apply=True,
    )
    point_camera_at(cam_obj, (24.0, -28.0, 11.5), (0.0, 0.0, 10.8), lens=28.0)
    scene.render.filepath = os.path.join(ARTIFACT_DIR, "blender_konpon_daito.png")
    bpy.ops.render.render(write_still=True)

    # 2. Build & Export Tō-ji Gojū-no-tō (京都東寺・五重塔) — Full 5 stories + 9-ring Sōrin framed!
    clear_all_meshes()
    build_toji_gojunoto(scene.collection, pal)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        if obj.type == "MESH" and obj.name != "StudioGround":
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(GLB_OUT_DIR, "toji_gojunoto.glb"),
        use_selection=True,
        export_format="GLB",
        export_apply=True,
    )
    point_camera_at(cam_obj, (27.5, -31.5, 13.5), (0.0, 0.0, 13.2), lens=28.0)
    scene.render.filepath = os.path.join(ARTIFACT_DIR, "blender_toji_gojunoto.png")
    bpy.ops.render.render(write_still=True)

    # 3. Build & Render Tō-ji Kondō & Kōdō 21-Deity 3D Mandala side-by-side!
    clear_all_meshes()
    build_toji_kondo_and_kodo(scene.collection, pal)
    point_camera_at(cam_obj, (2.0, -25.5, 10.5), (0.5, 0.0, 3.6), lens=26.0)
    scene.render.filepath = os.path.join(ARTIFACT_DIR, "blender_toji_kondo_mandala.png")
    bpy.ops.render.render(write_still=True)

    # 4. Build & Render Kōyasan Kongōbu-ji Banryūtei & Okunoin (properly centered!)
    clear_all_meshes()
    build_koyasan_kongobuji_and_okunoin(scene.collection, pal)
    point_camera_at(cam_obj, (0.0, -25.0, 11.5), (0.0, 0.8, 3.4), lens=26.0)
    scene.render.filepath = os.path.join(ARTIFACT_DIR, "blender_koyasan_kongobuji_okunoin.png")
    bpy.ops.render.render(write_still=True)

    # 5. Save master .blend file
    clear_all_meshes()
    build_konpon_daito(scene.collection, pal, offset=(-28.0, 0.0, 0.0))
    build_toji_gojunoto(scene.collection, pal, offset=(28.0, 0.0, 0.0))
    build_toji_kondo_and_kodo(scene.collection, pal)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ARTIFACT_DIR, "kukai_epic_landmarks.blend"))
    print("BLENDER_V2_BUILD_SUCCESS")


if __name__ == "__main__":
    main()
