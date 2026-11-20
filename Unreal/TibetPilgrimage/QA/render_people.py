"""Render the actual FBX files and check their garment materials with Blender."""
from pathlib import Path
import argparse
import json
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
FIGURES = ROOT / "Assets/Figures"
JOINTS = {"Pilgrim": (0,0,0), "PilgrimLeftLeg": (-.12,0,.84), "PilgrimRightLeg": (.12,0,.84),
          "PilgrimLeftSleeve": (-.23,0,1.35), "PilgrimRightSleeve": (.23,0,1.35)}
EXPECTED = {"Pilgrim": {"PilgrimChalkShawl", "PilgrimUndyedCotton", "PilgrimWovenBrick", "PeopleHair"},
            "Guide": {"LamaWineDrape", "LamaLowerMaroon", "LamaOchreVest"},
            "VillageElder": {"VillageSilverHair"}, "ScriptureBearer": {"PilgrimUndyedCotton", "PeopleWovenOchre"},
            "GuruVision": {"LamaOchreVest"}, "Tsogyal": {"Turquoise"}}


def render_view(label, model, rear, output, counts):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    scene.world = bpy.data.worlds.new('Studio')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.28,.32,.36,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .6
    for pos,power,size in [((-3,4,4.5),450,4),((2,-4,3.5),560,3),((2,3,2),110,3)]:
        lamp = bpy.data.lights.new('Softbox',type='AREA')
        lamp.energy, lamp.shape, lamp.size = power, 'DISK', size
        light = bpy.data.objects.new('Softbox',lamp)
        scene.collection.objects.link(light)
        light.location=pos
        light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_x = 420
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    observed = set()
    bounds = []
    for part, pivot in (JOINTS if model == 'Pilgrim' else {model: (0,0,0)}).items():
        bpy.ops.import_scene.fbx(filepath=str(FIGURES / (part+'.fbx')))
        meshes = [o for o in bpy.context.selected_objects if o.type == 'MESH']
        assert len(meshes) == 1, part
        obj = meshes[0]
        obj.location += Vector(pivot)
        obj.data.calc_loop_triangles()
        assert len(obj.data.loop_triangles) == counts[part], part
        observed.update(m.name.split('.')[0] for m in obj.data.materials)
        bpy.context.view_layer.update()
        bounds += [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    assert EXPECTED.get(model, set()) <= observed, (model, observed)
    if model == 'Guide':
        assert 'PeopleHair' in observed   # Brows and eyelids
        assert 'PilgrimChalkShawl' not in observed
    low,high = min(v.z for v in bounds), max(v.z for v in bounds)
    assert -.04 < low < .08 and 1.60 < high < 2.0, (model,low,high)
    camera_data = bpy.data.cameras.new('Portrait')
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 1.98
    camera = bpy.data.objects.new('Portrait', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (2.9, -7.3 if rear else 7.3, 2.4)
    camera.rotation_euler = (Vector((0,0,.91))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera = camera
    scene.render.filepath = str(output / (label+'.png'))
    bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('output',type=Path)
    dest = parser.parse_args(sys.argv[sys.argv.index('--')+1:]).output.resolve()
    dest.mkdir(parents=True,exist_ok=True)
    manifest = json.loads((FIGURES/'triangle-counts.json').read_text())
    for label,model,rear in [('pilgrim-front','Pilgrim',False),('pilgrim-back','Pilgrim',True),
        ('lama','Guide',False),('elder','VillageElder',False),('bearer','ScriptureBearer',True),
        ('herder','Herder',False),('envoy','Envoy',False),('king','King',False),
        ('guru','GuruVision',False),('tsogyal','Tsogyal',False)]:
        render_view(label,model,rear,dest,manifest)
