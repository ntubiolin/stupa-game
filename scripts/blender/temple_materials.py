"""Bounded original PBR recipes for the three expanded temple landmarks.

Reuse the reviewed Kondō mapping/packing code but keep its shipped recipe
unchanged. Architectural maps are 256px with 128px normals; only a principal
statue's baked face/cloth uses 512px. Each GLB is independently loadable.
"""
import importlib.util
from pathlib import Path

import bpy
import numpy as np

spec = importlib.util.spec_from_file_location('temple_surface_base', Path(__file__).with_name('toji_materials.py'))
surface = importlib.util.module_from_spec(spec)
spec.loader.exec_module(surface)


def painted_timber(size, bright=False):
    colors, ao, rough, metal, height = surface.timber(size)
    grain = (colors[0][:, :, 0] - .342)
    base = (.73, .225, .12) if bright else (.52, .255, .17)
    pigment = surface.shade(base, grain * .70, (1, .75, .53))
    return (pigment,), ao, np.clip(rough - .13, .35, .9), .0, height * .45


def ochre_timber(size):
    colors, ao, rough, metal, height = surface.timber(size)
    return (colors[1] * np.array((1.12, .91, .77)),), ao, rough, metal, height


def bronze(size):
    rng = np.random.default_rng(312)
    patches = surface.noise(size, 9, 11, rng) * .7 + surface.noise(size, 47, 51, rng) * .3
    patina = surface.ramp(patches, -.18, .37)
    color = np.array((.34, .27, .16)) + patina[:, :, None] * np.array((-.13, .14, .17))
    return (color,), 1 - .05 * patina, .39 + .33 * patina, .78 - .35 * patina, None


def apply_materials(scene, palette, asset):
    daito = asset == 'daito'
    recipes = [
        ('timber', ('hinoki_dark', 'hinoki_warm') if daito else ('timber_dark', 'timber_mid'), surface.timber, (.84, 2.45), .00145),
        ('tile', ('kawara_tile',) if daito else ('kawara_dark', 'kawara_ridge'), surface.smoked_tile, (1.87, 1.87), .0048),
        ('granite', ('stone_base', 'stone_paving') if daito else ('granite_light', 'granite_dark'), surface.granite, (.93, .93), .0029),
        ('plaster', ('plaster_white',) if daito else ('shikkui_white',), surface.lime_plaster, (1.56, 1.56), .0014),
        ('gilt', ('gold',) if daito else ('gold_sacred',), surface.lacquer_gilt, (.76, .76), 0),
        ('timber', ('vermilion',) if daito else ('kodo_vermilion',), lambda n: painted_timber(n, daito), (.84, 2.45), .0006),
        ('timber', ('koran_ochre',), ochre_timber, (.84, 2.45), .00145),
        ('bronze', ('bronze_patina',) if daito else ('bronze_verdigris',), bronze, (.67, .67), 0),
    ]
    used = {slot.material for obj in scene.objects if obj.type == 'MESH' for slot in obj.material_slots}
    replacements = {}
    for family, keys, recipe, period, relief in recipes:
        entries = [(i, key, palette[key]) for i, key in enumerate(keys) if palette.get(key) in used]
        if not entries:
            continue
        colors, ao, rough, metal, height = recipe(256)
        prefix = asset + '_' + keys[0]
        orm = surface.packed_image(prefix + '_ORM', np.stack((ao, rough, np.broadcast_to(metal, ao.shape)), axis=-1), True)
        normal = surface.packed_image(prefix + '_Normal', surface.normal_map(height, 128, period, relief), True) if relief else None
        for i, key, source in entries:
            color = surface.packed_image(asset + '_' + key + '_Color', colors[min(i, len(colors)-1)])
            material = surface.pbr_material(source, color, orm, normal)
            material.name = source.name + '_TemplePBR'
            material.use_backface_culling = True
            bsdf = material.node_tree.nodes.get('Principled BSDF')
            bsdf.inputs['Emission Strength'].default_value = 0
            replacements[source] = (material, family, period)
            palette[key] = material
    for obj in scene.objects:
        if obj.type != 'MESH':
            continue
        slots = {i: replacements[slot.material] for i, slot in enumerate(obj.material_slots) if slot.material in replacements}
        if slots:
            surface.uv_projection(obj, {i: (family, period) for i, (_, family, period) in slots.items()})
            for i, (material, _, _) in slots.items():
                obj.material_slots[i].material = material
