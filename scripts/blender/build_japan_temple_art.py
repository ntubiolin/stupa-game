"""Reference-informed game assets. Run in Blender, or main() via Blender MCP.

Photographs are visual references only: docs/japan-temple-art.md.
The original temple generator supplies layout; this pass replaces roof surfaces
and adds readable timber joinery. All export meshes are merged by material.
"""
import argparse
import importlib.util
import math
from pathlib import Path
import sys
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('toji_source', Path(__file__).with_name('build_toji_masterpiece.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
sculpt_spec = importlib.util.spec_from_file_location('japan_sculpture', Path(__file__).with_name('japan_sculpture.py'))
sculpt = importlib.util.module_from_spec(sculpt_spec)
sculpt_spec.loader.exec_module(sculpt)


def mesh_object(collection, name, vertices, faces, material, smooth=False):
    obj, mesh = base.new_mesh_obj(name, collection, material)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for face in mesh.polygons:
        face.use_smooth = smooth
    return obj


def ribbon(collection, name, points, width, thickness, material):
    """A closed square-section beam following a sampled eave; no curve tessellation."""
    vertices, faces = [], []
    for p in points:
        for dx, dz in [(-width/2, -thickness/2), (width/2, -thickness/2),
                       (width/2, thickness/2), (-width/2, thickness/2)]:
            vertices.append((p[0] + dx, p[1], p[2] + dz))
    for i in range(len(points) - 1):
        for k in range(4):
            a, b = 4*i+k, 4*i+(k+1)%4
            faces.append((a, b, b+4, a+4))
    faces.extend([(3, 2, 1, 0), tuple(range(len(vertices)-4, len(vertices)))])
    return mesh_object(collection, name, vertices, faces, material)


def roof(collection, name, cx, cy, z_base, width_x, depth_y, height,
         sori_lift, pal, has_kiriage=False, has_chigomune=True):
    """Curved hipped roof with closed fascia, tile rolls and a raised central eave."""
    hx, hy = width_x/2, depth_y/2
    def point(u, v):
        hip = max(0, (abs(u)-.53)/.47)
        d = max(hip, abs(v))
        y = z_base + height * (1-d)**1.48
        y += sori_lift * (abs(u)*abs(v))**3
        if has_kiriage and v < -.35:
            # Smooth shoulder, unlike the old vertical plate discontinuity.
            shoulder = max(0, min(1, (.24-abs(u))/.09))
            shoulder = shoulder*shoulder*(3-2*shoulder)
            y += height*.53*shoulder*min(1, (-v-.35)/.45)
        return (cx+u*hx, cy+v*hy, y)
    nx, ny = 40, 20
    vertices = [point(2*i/nx-1, 2*j/ny-1) for j in range(ny+1) for i in range(nx+1)]
    faces = []
    for j in range(ny):
        for i in range(nx):
            a = j*(nx+1)+i
            faces.append((a, a+1, a+nx+2, a+nx+1))
    # Solid underside and closed eave edge eliminates thin floating sheets.
    perimeter = list(range(nx+1)) + [j*(nx+1)+nx for j in range(1,ny+1)]
    perimeter += [ny*(nx+1)+i for i in range(nx-1,-1,-1)]
    perimeter += [j*(nx+1) for j in range(ny-1,0,-1)]
    top_count = len(vertices)
    vertices += [(p[0], p[1], p[2]-.22) for p in list(vertices)]
    faces += [tuple(top_count+a for a in reversed(face)) for face in list(faces)]
    for i,a in enumerate(perimeter):
        b=perimeter[(i+1)%len(perimeter)]
        faces.append((a, a+top_count, b+top_count, b))
    mesh_object(collection, name, vertices, faces, pal['kawara_dark'], True)
    # Thin raised tile rolls follow the roof in six intervals; material batching
    # keeps all courses in one draw regardless of tile count.
    courses = round(width_x/.36)
    for i in range(courses+1):
        u = -1 + 2*i/courses
        for side in (-1,1):
            pts=[]
            for j in range(5):
                p=point(u, side*j/4);pts.append((p[0],p[1],p[2]+.055))
            ribbon(collection, f'{name}_TileRoll_{i}_{side}', pts, .075, .075, pal['kawara_ridge'])
    # Dark fascia forms an unbroken silhouette along both broad eaves.
    for side in (-1,1):
        for i in range(40):
            p1=Vector(point(2*i/40-1,side));p2=Vector(point(2*(i+1)/40-1,side))
            p1.z-=.13;p2.z-=.13
            base.add_segment_cylinder(collection, f'{name}_Fascia_{side}_{i}',p1,p2,.12,.12,6,pal['timber_dark'])
        # Exposed rafters are geometry only where they change the close silhouette.
        for i in range(courses):
            u=-.97+1.94*(i+.5)/courses
            p1=Vector(point(u,side*.73));p2=Vector(point(u,side*.99));p1.z-=.25;p2.z-=.25
            base.add_segment_cylinder(collection, f'{name}_Rafter_{side}_{i}',p1,p2,.055,.055,4,pal['timber_mid'])
    for tier in range(3):
        base.add_box(collection, f'{name}_Ridge_{tier}', (cx,cy,z_base+height+.08+tier*.10),
                     (width_x*.56,.42-tier*.07,.12),pal['kawara_ridge'])
    for sx in (-1,1):
        base.add_icosphere(collection,f'{name}_Oni_{sx}',(cx+sx*hx*.56,cy,z_base+height+.33),.20,1,pal['kawara_ridge'],(1,.65,1.5))
        for sy in (-1,1):
            points=[point(sx*(.53+.47*j/8),sy*j/8) for j in range(9)]
            for j in range(8):
                a=Vector(points[j]);b=Vector(points[j+1]);a.z+=.12;b.z+=.12
                base.add_segment_cylinder(collection,f'{name}_Hip_{sx}_{sy}_{j}',a,b,.11,.11,6,pal['kawara_ridge'])


def timber_details(collection, pal, kondo=True):
    """Columns, bracket arms, open bays and inset lattice readable at game distance."""
    wood=pal['timber_dark'] if kondo else pal['kodo_vermilion']
    half=7.6 if kondo else 9
    front=-4.62 if kondo else -4.4
    xs=(-7.6,-5,-2.5,2.5,5,7.6) if kondo else (-9,-6.4,-3.8,-1.3,1.3,3.8,6.4,9)
    for x in xs:
        for side in (-1,1):
            y=front*side
            base.add_cylinder(collection,f'ColumnFoot_{x}_{side}',(x,y,1.23),.32,.31,.16,10,pal['granite_dark'])
            for tier in range(3):
                z=4.48+tier*.21
                base.add_box(collection,f'BracketAlong_{x}_{side}_{tier}',(x,y-side*tier*.12,z),(.72+tier*.20,.20,.15),wood)
                base.add_box(collection,f'BracketOut_{x}_{side}_{tier}',(x,y-side*tier*.15,z+.10),(.18,.80+tier*.18,.14),wood)
                for dx in (-.27,.27):
                    base.add_box(collection,f'Bearing_{x}_{side}_{tier}_{dx}',(x+dx,y,z+.13),(.17,.22,.18),wood)
    for z in (1.42,1.80,3.88,4.22):
        for side in (-1,1):
            base.add_box(collection,f'WallRail_{z}_{side}',(side*(half+2.6)/2,front-.08,z),(half-2.6,.17,.12),wood)
    if kondo:
        for x in (-6.3,-3.7,3.7,6.3):
            for bar in range(10):
                base.add_box(collection,f'Lattice_{x}_{bar}',(x-.82+bar*.182,front-.13,2.8),(.055,.10,1.75),pal['timber_mid'])
            for z in (1.93,2.80,3.67):
                base.add_box(collection,f'LatticeRail_{x}_{z}',(x,front-.15,z),(1.86,.11,.07),pal['timber_mid'])
        # The upper plaster clerestory is divided by a real post-and-beam rhythm.
        for x in (-6.3,-4.2,-2.1,0,2.1,4.2,6.3):
            for side in (-1,1):
                base.add_box(collection,f'UpperPost_{x}_{side}',(x,side*3.77,7.15),(.22,.18,1.75),wood)
        for side in (-1,1):
            for z in (6.5,7.3,7.8):
                base.add_box(collection,f'UpperRail_{side}_{z}',(0,side*3.79,z),(13.1,.20,.16),wood)
        # Five broad treads lead to the existing threshold without altering collider footprint.
        for i in range(5):
            base.add_box(collection,f'ApproachTread_{i}',(0,-6.65+i*.26,.11+i*.22),(4.85,.42,.22),pal['granite_light'])
    # Coffers and floor boards add interior scale at almost no fragment cost.
    for x in range(-7,8):
        base.add_box(collection,f'CeilingJoist_{x}',(x,0,6.08 if kondo else 5.12),(.10,8.5,.16),wood)
    for y in (-3,-1,1,3):
        base.add_box(collection,f'CeilingCross_{y}',(0,y,6.06 if kondo else 5.10),(15,.12,.18),wood)
    for i in range(30):
        base.add_box(collection,f'VerandaBoard_{i}',(-7.25+i*.5,-4.85,1.18),(.475,1.0,.05),pal['timber_mid'])


def build_asset(asset, output, source):
    # Remove only objects in this dedicated authoring scene. Never reset Blender
    # preferences or reload factory settings while the MCP server is attached.
    for obj in list(bpy.context.scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    scene=bpy.context.scene
    pal=base.create_toji_palette()
    base.build_detailed_irimoya_roof=roof
    base.add_deity_statue=sculpt.make_sculptor(base)
    gold=pal['gold_sacred'].node_tree.nodes.get('Principled BSDF')
    gold.inputs['Base Color'].default_value=(.68,.43,.13,1)
    gold.inputs['Metallic'].default_value=.52
    gold.inputs['Roughness'].default_value=.42
    gold.inputs['Emission Strength'].default_value=.035
    if asset=='kondo':
        base.build_toji_kondo_only(scene.collection,pal)
        for name in ['Kondo_FrontSteps','Kondo_LowerWhiteFrieze']:
            bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
        # The original solid plaster box crossed the sanctum and cut through
        # the principal image. Plaster belongs to the perimeter timber bays.
        for side in (-1,1):
            base.add_box(scene.collection,f'Kondo_Plasterside_{side}',(side*7.5,0,4.85),(.22,8.8,.85),pal['shikkui_white'])
            base.add_box(scene.collection,f'Kondo_Plasterfront_{side}',(side*5,-4.4,4.85),(4.8,.22,.85),pal['shikkui_white'])
        base.add_box(scene.collection,'Kondo_Plasterback',(0,4.4,4.85),(15.1,.22,.85),pal['shikkui_white'])
        timber_details(scene.collection,pal,True)
    elif asset=='kodo':
        base.build_toji_kodo_only(scene.collection,pal)
        timber_details(scene.collection,pal,False)
    elif asset=='gojunoto':
        # Runtime garden owns vegetation/seasons. Do not embed a second pond and
        # unculled tree set in the pagoda landmark.
        base.build_toji_pagoda_masterpiece(scene.collection,pal)
    elif asset=='daito':
        other_spec=importlib.util.spec_from_file_location('kukai_source',Path(__file__).with_name('build_kukai_landmarks.py'))
        other=importlib.util.module_from_spec(other_spec)
        other_spec.loader.exec_module(other)
        other.add_deity_statue=sculpt.make_sculptor(base)
        other.build_konpon_daito(scene.collection,other.create_palette())
    else:
        raise ValueError(asset)
    if source:
        source.mkdir(parents=True,exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(source/f'toji_{asset}.blend'))
    base.join_meshes_by_material(scene)
    bpy.ops.object.select_all(action='SELECT')
    output.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output/('konpon_daito.glb' if asset=='daito' else f'toji_{asset}.glb')),export_format='GLB',
        use_selection=True,export_apply=True,export_yup=True,export_texcoords=False,
        export_cameras=False,export_lights=False)
    print('EXPORTED',asset,'meshes',sum(o.type=='MESH' for o in scene.objects))


def main(assets=('kondo','kodo','gojunoto','daito'),output=None,source=None):
    for asset in assets:
        build_asset(asset,Path(output or ROOT/'public/models/kukai'),Path(source) if source else None)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--assets',nargs='+',choices=['kondo','kodo','gojunoto','daito'],default=['kondo','kodo','gojunoto','daito'])
    parser.add_argument('--output',type=Path)
    parser.add_argument('--source',type=Path)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    main(args.assets,args.output,args.source)
