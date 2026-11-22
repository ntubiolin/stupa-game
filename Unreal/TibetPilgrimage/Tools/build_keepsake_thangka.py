"""Render the 'Pilgrim & Guru Padmasambhava Together' Keepsake Thangka (1200x1600) in Blender Cycles."""
from math import cos, pi, sin, tau
from pathlib import Path
import bpy
from mathutils import Euler, Vector

ROOT = Path(__file__).resolve().parents[1]
FIGURES = ROOT / "Assets/Figures"
OUT_PNG = ROOT / "Assets/Journal/KeepsakeThangka.png"

PILGRIM_PARTS = {
    "Pilgrim": (0, 0, 0),
    "PilgrimLeftLeg": (-0.12, 0, 0.84),
    "PilgrimRightLeg": (0.12, 0, 0.84),
    "PilgrimLeftSleeve": (-0.23, 0, 1.35),
    "PilgrimRightSleeve": (0.23, 0, 1.35),
}


def make_mat(name, rgb, rough=0.65, metal=0.0, emit=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metal
    if emit > 0:
        for key in ("Emission Color", "Emission"):
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = (*rgb, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emit
    if alpha < 1.0 and "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha
    return mat


def add_sphere(name, loc, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return obj


def add_cylinder(name, loc, radius, depth, mat, rot=(0, 0, 0), vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return obj


def add_torus(name, major_r, minor_r, loc, rot, mat):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=64, minor_segments=16, major_radius=major_r, minor_radius=minor_r, location=loc, rotation=rot
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return obj


def add_box(name, loc, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    return obj


def import_fbx_group(parts_dict, parent_name, loc, rot_deg, scale_val):
    parent = bpy.data.objects.new(parent_name, None)
    bpy.context.scene.collection.objects.link(parent)
    parent.location = loc
    parent.rotation_euler = Euler(tuple(a * pi / 180.0 for a in rot_deg), "XYZ")
    parent.scale = (scale_val, scale_val, scale_val)
    for part, pivot in parts_dict.items():
        fbx = FIGURES / f"{part}.fbx"
        if not fbx.is_file():
            continue
        bpy.ops.import_scene.fbx(filepath=str(fbx))
        for obj in bpy.context.selected_objects:
            if obj.type == "MESH":
                obj.parent = parent
                obj.location += Vector(pivot)
    # Optional calf parts if present
    for calf_name, pivot in (("PilgrimLeftCalf", (-0.12, 0, 0.47)), ("PilgrimRightCalf", (0.12, 0, 0.47))):
        if parent_name == "PilgrimRoot" and (FIGURES / f"{calf_name}.fbx").is_file():
            bpy.ops.import_scene.fbx(filepath=str(FIGURES / f"{calf_name}.fbx"))
            for obj in bpy.context.selected_objects:
                if obj.type == "MESH":
                    obj.parent = parent
                    obj.location += Vector(pivot)
    return parent


def build_thangka():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 28
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 1600
    scene.render.resolution_percentage = 100

    # Deep Lapis Lazuli Thangka Sky World
    scene.world = bpy.data.worlds.new("ThangkaWorld")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.032, 0.058, 0.135, 1.0)
    bg.inputs[1].default_value = 0.85

    # Mineral Pigment Materials
    lapis_sky = make_mat("LapisBackdrop", (0.024, 0.052, 0.145), rough=0.92)
    indigo_horizon = make_mat("IndigoHorizon", (0.055, 0.135, 0.245), rough=0.88)
    meadow_jade = make_mat("MalachiteMeadow", (0.065, 0.245, 0.175), rough=0.86)
    snow_white = make_mat("GlacierSnow", (0.92, 0.94, 0.98), rough=0.55)
    stupa_lime = make_mat("StupaWhitewash", (0.95, 0.92, 0.86), rough=0.62)
    sacred_gold = make_mat("ThangkaGold", (0.92, 0.68, 0.20), rough=0.26, metal=0.85, emit=0.35)
    cinnabar = make_mat("ThangkaCinnabar", (0.58, 0.095, 0.075), rough=0.72)
    brocade_navy = make_mat("BrocadeNavy", (0.035, 0.055, 0.115), rough=0.78)
    saffron_silk = make_mat("SaffronSilk", (0.86, 0.56, 0.12), rough=0.58, metal=0.25)
    cloud_cream = make_mat("AuspiciousCloud", (0.96, 0.88, 0.72), rough=0.55, emit=0.22)
    cloud_rose = make_mat("LotusCloud", (0.88, 0.42, 0.46), rough=0.55, emit=0.18)
    sun_disc = make_mat("SunDisc", (0.98, 0.52, 0.16), rough=0.3, emit=1.6)
    moon_disc = make_mat("MoonDisc", (0.88, 0.93, 1.0), rough=0.3, emit=1.4)

    rainbow_cols = [
        make_mat("ThigleGold", (0.98, 0.80, 0.28), rough=0.25, emit=1.45),
        make_mat("ThigleRuby", (0.92, 0.24, 0.22), rough=0.25, emit=1.15),
        make_mat("ThigleJade", (0.18, 0.82, 0.58), rough=0.25, emit=1.15),
        make_mat("ThigleTurquoise", (0.16, 0.68, 0.92), rough=0.25, emit=1.15),
        make_mat("ThigleViolet", (0.68, 0.36, 0.92), rough=0.25, emit=1.05),
    ]

    # 1. Painted Lapis Sky & Malachite Valley Backdrop
    add_box("SkyCanvas", (0, -5.5, 2.4), (9.0, 0.1, 11.0), lapis_sky)
    add_sphere("HorizonGlow", (0, -5.1, 1.35), (4.4, 0.08, 2.2), indigo_horizon)
    add_sphere("ForegroundHillLeft", (-1.8, -2.2, -1.35), (3.4, 1.4, 1.35), meadow_jade)
    add_sphere("ForegroundHillRight", (1.9, -2.4, -1.45), (3.6, 1.4, 1.35), meadow_jade)
    add_cylinder("GoldenPlazaTerrace", (0, -1.2, -0.58), 2.55, 0.16, cinnabar, vertices=64)
    add_torus("PlazaGoldRim", 2.52, 0.035, (0, -1.2, -0.50), (0, 0, 0), sacred_gold)

    # 2. Distant Sacred Himalayan Snow Peaks
    for px, pz, sx, sz in [(-2.35, 0.65, 1.25, 1.45), (-1.15, 0.82, 1.05, 1.65),
                           (1.35, 0.78, 1.15, 1.55), (2.45, 0.62, 1.30, 1.40)]:
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=sx, radius2=0.04, depth=sz, location=(px, -4.4, pz))
        cone = bpy.context.active_object
        cone.scale = (1.0, 0.35, 1.0)
        cone.data.materials.append(snow_white)

    # 3. Boudhanath Great Stupa in Sacred Midground (White Dome, Wisdom-Eyes Harmika, 13-Tier Spire, Prayer Flags)
    add_box("StupaPlinth1", (-0.98, -3.25, -0.22), (1.72, 0.9, 0.24), stupa_lime)
    add_box("StupaPlinth2", (-0.98, -3.25, -0.02), (1.38, 0.8, 0.20), stupa_lime)
    add_torus("StupaLotusRing", 0.64, 0.045, (-0.98, -3.25, 0.12), (0, 0, 0), cinnabar)
    add_sphere("StupaAndaDome", (-0.98, -3.25, 0.22), (0.66, 0.52, 0.54), stupa_lime)
    add_box("StupaHarmika", (-0.98, -3.25, 0.82), (0.36, 0.32, 0.25), sacred_gold)
    # Iconic All-Seeing Wisdom Eyes on the front (+Y) face of the Harmika
    for ex in (-0.085, 0.085):
        add_sphere("WisdomEyeWhite", (-0.98 + ex, -3.08, 0.84), (0.055, 0.015, 0.028), snow_white)
        add_sphere("WisdomEyePupil", (-0.98 + ex, -3.065, 0.84), (0.024, 0.015, 0.024), brocade_navy)
    add_sphere("WisdomUrna", (-0.98, -3.07, 0.90), (0.022, 0.015, 0.022), cinnabar)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.22, radius2=0.04, depth=0.62, location=(-0.98, -3.25, 1.24))
    spire = bpy.context.active_object
    spire.data.materials.append(sacred_gold)
    add_cylinder("StupaParasol", (-0.98, -3.25, 1.60), 0.15, 0.035, sacred_gold)
    add_sphere("StupaJewelFinial", (-0.98, -3.25, 1.67), (0.045, 0.045, 0.065), rainbow_cols[0])
    # Five-colored Lungta prayer flags streaming from Stupa Harmika
    for side in (-1, 1):
        for f in range(5):
            t = (f + 1) / 6.0
            fx = -0.98 + side * (0.20 + t * 0.72)
            fz = 0.95 - t * 0.58 - 0.06 * sin(t * pi)
            add_box(f"PrayerFlag_{side}_{f}", (fx, -3.12, fz), (0.09, 0.015, 0.07), rainbow_cols[f % 5])

    # 4. Sun & Moon Cleanly Framed in Upper Lapis Sky (Wisdom & Compassion)
    add_sphere("CelestialSun", (1.36, -3.6, 3.92), (0.21, 0.05, 0.21), sun_disc)
    add_torus("SunGoldRing", 0.245, 0.016, (1.36, -3.56, 3.92), (pi / 2, 0, 0), sacred_gold)
    add_sphere("CelestialMoon", (-1.36, -3.6, 3.92), (0.20, 0.05, 0.20), moon_disc)
    add_torus("MoonCradle", 0.235, 0.016, (-1.36, -3.56, 3.92), (pi / 2, 0, 0), sacred_gold)

    # 5. Five-Colored Rainbow Thigle & Golden Dharma Wheel Behind Sky Guru Padmasambhava
    for idx, r_mat in enumerate(rainbow_cols):
        r = 1.08 + idx * 0.082
        add_torus(f"RainbowHalo{idx}", r, 0.036, (0, -1.85 - idx * 0.02, 2.58), (pi / 2, 0, 0), r_mat)
    # 12 Golden Dharma Spokes radiating behind Guru Rinpoche
    for k in range(12):
        ang = k * tau / 12.0
        cx = 0.88 * cos(ang)
        cz = 2.58 + 0.88 * sin(ang)
        add_cylinder(f"HaloRay{k}", (cx, -1.82, cz), 0.014, 1.68, sacred_gold, rot=(0, pi / 2 - ang, 0), vertices=12)

    # Auspicious Tibetan Clouds cradling Guru Rinpoche's Lotus Pedestal
    for side in (-1, 1):
        for dx, dz, rad, cmat in [
            (0.32, 1.38, 0.25, cloud_cream),
            (0.65, 1.44, 0.21, cloud_rose),
            (0.95, 1.54, 0.17, cloud_cream),
            (1.18, 2.85, 0.19, cloud_cream),
            (1.42, 2.95, 0.15, cloud_rose),
        ]:
            add_sphere("CloudScroll", (side * dx, -1.35, dz), (rad * 1.32, 0.14, rad * 0.80), cmat)
            add_torus("CloudGoldTrim", rad * 0.94, 0.014, (side * dx, -1.24, dz), (pi / 2, 0, 0), sacred_gold)

    # 6. Import Actual Sculpted Guru Padmasambhava (GuruVision) Enthroned in the Sky!
    import_fbx_group({"GuruVision": (0, 0, 0)}, "SkyGuruRoot", (0.0, -1.15, 1.48), (0, 0, 0), 1.30)

    # 7. Import Actual Sculpted White-Robed Ngakpa Pilgrim in Right Foreground, Turned 3/4 Looking Up!
    pilgrim_root = import_fbx_group(PILGRIM_PARTS, "PilgrimRoot", (0.92, -0.35, -0.50), (0, 0, 132), 1.04)
    for child in pilgrim_root.children:
        if "Sleeve" in child.name:
            child.rotation_euler.x = -0.45

    # Five Golden Butter Lamps on Crimson Altar Table at Center Bottom
    add_box("OfferingAltar", (-0.12, -0.55, -0.36), (1.02, 0.28, 0.22), cinnabar)
    add_box("OfferingAltarTop", (-0.12, -0.55, -0.24), (1.08, 0.32, 0.04), sacred_gold)
    for b in range(5):
        bx = -0.56 + b * 0.22
        add_cylinder(f"OfferingBowl{b}", (bx, -0.50, -0.18), 0.052, 0.07, sacred_gold, vertices=24)
        add_sphere(f"LampFlame{b}", (bx, -0.50, -0.11), (0.026, 0.026, 0.052), rainbow_cols[0])

    # 8. Full-Bleed Traditional Tibetan Silk Brocade & Rainbow ("Ja") Thangka Border Frame
    cx_half, cz_mid, cz_half = 2.08, 1.95, 2.76
    fy = 0.65
    border_w = 0.24
    add_box("BrocadeLeft", (-cx_half + border_w / 2, fy, cz_mid), (border_w, 0.04, cz_half * 2 + 0.1), brocade_navy)
    add_box("BrocadeRight", (cx_half - border_w / 2, fy, cz_mid), (border_w, 0.04, cz_half * 2 + 0.1), brocade_navy)
    add_box("BrocadeTop", (0, fy, cz_mid + cz_half - border_w / 2), (cx_half * 2 + 0.1, 0.04, border_w), brocade_navy)
    add_box("BrocadeBottom", (0, fy, cz_mid - cz_half + 0.30 / 2), (cx_half * 2 + 0.1, 0.04, 0.30), brocade_navy)
    # Inner crimson & saffron rainbow silk trim ("Ja" — red & yellow inner framing bands)
    for inset, thick, bmat in [
        (0.24, 0.030, sacred_gold),
        (0.270, 0.040, cinnabar),
        (0.310, 0.028, saffron_silk),
        (0.338, 0.018, sacred_gold),
    ]:
        iw = cx_half - inset
        ih_top = cz_mid + cz_half - inset
        ih_bot = cz_mid - cz_half + 0.30 + (inset - 0.24)
        mid_z = (ih_top + ih_bot) * 0.5
        span_z = ih_top - ih_bot
        add_box("TrimL", (-iw, fy + 0.02, mid_z), (thick, 0.04, span_z + thick), bmat)
        add_box("TrimR", (iw, fy + 0.02, mid_z), (thick, 0.04, span_z + thick), bmat)
        add_box("TrimT", (0, fy + 0.02, ih_top), (iw * 2 + thick, 0.04, thick), bmat)
        add_box("TrimB", (0, fy + 0.02, ih_bot), (iw * 2 + thick, 0.04, thick), bmat)
    # Four Gilded Lotus Corner Rosettes + Central Sacred Door ("Thangka Go") at bottom brocade
    for sx in (-1, 1):
        for sz in (cz_mid + cz_half - 0.12, cz_mid - cz_half + 0.15):
            add_torus("CornerRosette", 0.055, 0.012, (sx * (cx_half - 0.12), fy + 0.03, sz), (pi / 2, 0, 0), sacred_gold)
    add_box("ThangkaSacredDoor", (0, fy + 0.03, cz_mid - cz_half + 0.14), (0.68, 0.04, 0.16), saffron_silk)
    add_box("ThangkaDoorRim", (0, fy + 0.025, cz_mid - cz_half + 0.14), (0.74, 0.04, 0.20), cinnabar)

    # 9. Balanced Mineral-Pigment Studio Lighting (preserves rich deep maroon, gold & turquoise!)
    lights = [
        ("KeyLight", (2.6, 5.2, 4.0), 210, 4.0, (1.0, 0.94, 0.84)),
        ("FillLight", (-3.0, 4.8, 2.2), 115, 4.5, (0.82, 0.90, 1.0)),
        ("GuruRimLight", (0.0, -0.5, 3.6), 140, 2.2, (1.0, 0.86, 0.52)),
    ]
    for lname, lpos, power, lsize, col in lights:
        ldata = bpy.data.lights.new(lname, type="AREA")
        ldata.energy = power
        ldata.shape = "DISK"
        ldata.size = lsize
        ldata.color = col
        lobj = bpy.data.objects.new(lname, ldata)
        scene.collection.objects.link(lobj)
        lobj.location = lpos
        lobj.rotation_euler = (Vector((0, -1.2, 1.95)) - lobj.location).to_track_quat("-Z", "Y").to_euler()

    # Orthographic Thangka Scroll Camera (+Y looking straight toward -Y)
    cam_data = bpy.data.cameras.new("ThangkaCam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 5.4
    cam_obj = bpy.data.objects.new("ThangkaCam", cam_data)
    scene.collection.objects.link(cam_obj)
    cam_obj.location = (0.0, 6.0, 1.95)
    cam_obj.rotation_euler = Euler((pi / 2, 0.0, pi), "XYZ")
    scene.camera = cam_obj

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(OUT_PNG)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    bpy.ops.render.render(write_still=True)
    print(f"THANGKA_READY {OUT_PNG}")


if __name__ == "__main__":
    build_thangka()
