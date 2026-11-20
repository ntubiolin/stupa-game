"""Model original figures for the Nepal–Tibet pilgrimage. Blender units are meters."""
from array import array
from math import cos, exp, pi, sin, tau
from pathlib import Path
import sys

import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parent.parent / "Assets/Figures"
JOINTS = {
    "PilgrimLeftLeg": (-.12, 0, .84), "PilgrimRightLeg": (.12, 0, .84),
    "PilgrimLeftSleeve": (-.23, 0, 1.35), "PilgrimRightSleeve": (.23, 0, 1.35),
}


def surface(name, rgb, rough=.83, weave=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    shader = nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Roughness"].default_value = rough
    if weave:
        width = 96
        image = bpy.data.images.new(name + "_weave", width, width)
        pixels = array("f")
        for row in range(width):
            for col in range(width):
                pattern = .29*sin(col*pi/2) + .25*sin(row*pi/2) + .11*cos((col+row)*pi/4)
                linear = tuple(color * (1 + weave*pattern) for color in rgb)
                # The packed byte texture is sRGB, while base swatch values are linear.
                pixels.extend((*(1.055 * color**(1/2.4) - .055 for color in linear), 1))
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
                layer.data[index].uv = ((u + (wraps and u < .5))*3, v*4)
    return obj


def profiles(rows):
    # Interpolate authored ring shapes rather than smoothing away narrow hems.
    rows = [(Vector(r[:3]), Vector(r[3:])) for r in rows]
    points = []
    for i in range(len(rows)-1):
        for n in range(2):
            t = n/2
            row = []
            for col in range(2):
                a,b,c,d = (rows[j][col] for j in (max(0,i-1),i,i+1,min(i+2,len(rows)-1)))
                row += list(.5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
            points.append(row)
    return points + [[*rows[-1][0], *rows[-1][1]]]


def loft(name, rows, mat, rings=24, folds=0, sculpt=None):
    # Rows: height, transverse radius, forward radius, transverse center, forward center.
    vertices, uv = [], []
    rows = profiles(rows)
    for j, (z, width, depth, x, y) in enumerate(rows):
        t = j/(len(rows)-1)
        for i in range(rings):
            a = i*tau/rings
            crease = (.68*sin(a*9+1.3*sin(t*6))+.22*sin(a*17-1.8*t)+.1*sin(a*4+t*15))
            ridge = (sin(pi*t)**.65)*folds*crease
            v = (x+(max(.001,width)+ridge)*cos(a), y+(max(.001,depth)+ridge)*sin(a), z)
            vertices.append(sculpt(v,a) if sculpt else v)
            uv.append((i/rings,t))
    faces = []
    for row in range(len(rows)-1):
        for i in range(rings):
            a, b = row*rings+i, row*rings+(i+1)%rings
            faces.append((a,b,b+rings,a+rings))
    faces.extend((tuple(reversed(range(rings))), tuple(range(len(vertices)-rings,len(vertices)))))
    return mesh(name, vertices, faces, mat, uv)


def oval(name, position, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def cord(name, points, radius, mat, detail=2):
    data = bpy.data.curves.new(name,"CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    data.bevel_resolution = detail
    spline = data.splines.new("POLY")
    spline.points.add(len(points)-1)
    for pt, v in zip(spline.points, points):
        pt.co = (*v,1)
    obj = bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    return obj


def head(skin, dark):
    def anatomy(vertex, a):
        x,y,z = vertex
        front = max(0,sin(a))**5
        nose = .039*exp(-((x/.022)**2+((z-1.574)/.017)**2))
        bridge = .014*exp(-((x/.014)**2+((z-1.601)/.025)**2))
        socket = -.014*exp(-(((abs(x)-.035)/.020)**2+((z-1.611)/.013)**2))
        cheek = .009*exp(-(((abs(x)-.047)/.026)**2+((z-1.580)/.017)**2))
        mouth = .010*exp(-((x/.030)**2+((z-1.547)/.008)**2))
        return x, y+front*(nose+bridge+socket+cheek+mouth), z
    rows = [(1.459,.048,.047,0,.002),(1.502,.050,.048,0,.002),(1.522,.059,.063,0,.007),
            (1.550,.077,.073,0,0),(1.588,.086,.078,0,-.007),(1.629,.087,.079,0,-.016),
            (1.665,.075,.071,0,-.021),(1.693,.046,.040,0,-.020),(1.705,.006,.006,0,-.017)]
    result = [loft("Sculpted face",rows,skin,48,sculpt=anatomy)]
    for side in (-1,1):
        result.append(oval("Ear",(.083*side,-.008,1.591),(.013,.014,.026),skin))
        result.append(cord("Upper eyelid",[(x*side,y,z) for x,y,z in
            [(.017,.064,1.608),(.028,.061,1.611),(.042,.056,1.610),(.054,.048,1.607)]],.00155,dark))
        result.append(cord("Eyebrow",[(x*side,y,z) for x,y,z in
            [(.017,.065,1.629),(.034,.061,1.632),(.053,.051,1.627)]],.0020,dark))
    result.append(cord("Lip seam",[(-.024,.068,1.546),(-.009,.076,1.545),
        (.009,.076,1.545),(.024,.068,1.546)],.0013,dark))
    return result


def torso(outer, collar, waist, pilgrim):
    skirt = [(.768,.226,.148,0,0),(.864,.213,.144,0,0)] if pilgrim else [
        (.071,.280,.202,0,-.008),(.114,.325,.221,0,0),(.439,.275,.184,0,0),
        (.752,.231,.169,0,-.009)]
    rows = skirt + [(.995,.193,.136,0,-.008),(1.105,.202,.140,0,-.014),
                    (1.268,.230,.144,0,-.007),(1.358,.218,.115,0,.003),
                    (1.438,.081,.067,0,.013),(1.486,.056,.054,0,.004)]
    result = [loft("Gathered robes",rows,outer,44,.025)]
    result.append(loft("Bound sash",[(.96,.194,.137,0,0),(.982,.204,.145,0,-.004),
        (1.025,.202,.145,0,-.006),(1.046,.192,.135,0,-.006)],waist,32,.004))
    for side in (-1,1):
        route = [(side*.062,.058,1.451),(side*.092,.096,1.410),(side*.090,.129,1.366),
                 (side*.068,.146,1.321),(0,.158,1.27),(-side*.077,.154,1.208),(-side*.13,.127,1.142)]
        vertices = [(x + width, y+.002 + .010*(1-abs(width)/.024), z+width*.35)
                    for x,y,z in route for width in (-.024,0,.024)]
        result.append(mesh("Folded overlapping collar",vertices,
            [(a,a+1,a+4,a+3) for r in range(len(route)-1)
             for c in range(2) for a in [r*3+c]],collar,
            [(j/2,r/(len(route)-1)) for r in range(len(route)) for j in range(3)]))
    return result


def arm(side, cloth, cuff, skin):
    x = side*.23
    rows = [(.88,.054,.060,x+side*.063,.021),
            (.915,.064,.069,x+side*.058,.018),(.994,.078,.079,x+side*.050,.013),
            (1.132,.086,.084,x+side*.038,-.012),(1.247,.080,.074,x+side*.024,-.011),
            (1.355,.070,.069,x-side*.007,-.010),(1.400,.041,.053,x-side*.018,-.013)]
    result = [loft("Hanging sleeve", rows, cloth, 32,.013)]
    result.append(loft("Sleeve hem",[(.880,.054,.060,x+side*.063,.021),
        (.892,.060,.065,x+side*.061,.020),(.902,.063,.068,x+side*.060,.019)],cuff))
    result.append(oval("Resting hand",(x+side*.062,.027,.848),(.027,.022,.056),skin))
    result.append(oval("Thumb",(x+side*.043,.042,.862),(.010,.010,.030),skin))
    return result


def combine(name, pieces, pivot=(0,0,0)):
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
    obj.location = obj.rotation_euler = (0,0,0)
    obj.scale = (1,1,1)
    for vertex in obj.data.vertices:
        vertex.co -= Vector(pivot)
    return obj


def tall_boot(x, wool, leather):
    shaft = [(0.05,.068,.081,x,0),(.23,.064,.071,x,0),(.39,.080,.086,x,0),
             (.42,.082,.089,x,0)]
    return [loft("Soft boot shaft", shaft, leather, 32,.006),
            oval("Stitched sole", (x,.047,.055),(.078,.148,.054),leather),
            loft("Wool trouser",[(.38,.073,.080,x,0),(.47,.095,.088,x,-.005),
                 (.67,.104,.111,x,-.006),(.86,.101,.098,x,0)],wool,32,.008)]


def horn(name, route, radii, mat):
    verts,faces=[],[]
    for i,pt in enumerate(route):
        axis = (Vector(route[min(i+1,len(route)-1)]) - Vector(route[max(0,i-1)])).normalized()
        right = axis.cross(Vector((0,1,0))).normalized()
        across = axis.cross(right)
        for j in range(14):
            a = tau*j/14
            verts.append(Vector(pt) + radii[i]*(right*cos(a)+across*sin(a)))
            if i:
                k=(i-1)*14+j; n=(i-1)*14+(j+1)%14
                faces.append((k,n,n+14,k+14))
    return mesh(name,verts,faces,mat)


def beast(yak, fur, mane, face, ivory, eye):
    parts = []
    def ell(name,p,s,m):
        parts.append(oval(name,p,s,m))
    if yak:
        ell("Rib cage",(0,-.12,1.04),(.46,.86,.54),fur)
        ell("Withers",(0,.30,1.29),(.43,.52,.45),mane)
        ell("Brow",(0,.68,1.12),(.24,.33,.35),fur)
        ell("Muzzle",(0,.92,.92),(.18,.20,.15),face)
        for side in (-1,1):
            for fore in (-.62,.40):
                x = side*.285
                ell("Shaggy fetlock",(x,fore,.53),(.135,.16,.41),fur)
                ell("Dark hoof",(x,fore+.027,.128),(.096,.137,.124),face)
            parts.append(horn("Swept horn",[(side*.16,.69,1.28),(side*.39,.67,1.30),
                (side*.58,.60,1.48),(side*.56,.62,1.68)], [.096,.081,.048,.002],ivory))
            ell("Amber eye",(side*.182,.88,1.20),(.026,.025,.027),eye)
            for j in range(16):
                y=-.80+j*.08
                parts.append(horn("Guard hair",[(side*.33,y,.99),(side*.42,y-.015,.74),
                    (side*(.38+.03*cos(j)),y-.075,.37+.07*sin(j))],[.10,.085,.005],mane))
        parts.append(horn("Tail",[(0,-.80,1.17),(0,-1.0,.94),(0,-1.04,.51)],[.081,.065,.088],mane))
    else:
        ell("Shaggy shoulders",(0,0,1.37),(.44,.25,.37),mane)
        ell("Rib cage",(0,0,1.1),(.33,.25,.45),fur)
        ell("Heavy skull",(0,.02,1.78),(.22,.192,.245),fur)
        ell("Heavy muzzle",(0,.171,1.70),(.125,.071,.085),face)
        ell("Nose",(0,.227,1.74),(.062,.027,.034),face)
        for side in (-1,1):
            ell("Brow",(side*.088,.162,1.84),(.096,.046,.034),mane)
            ell("Eye",(side*.084,.19,1.81),(.023,.022,.022),eye)
            for k in range(6):
                x=side*(.085+k*.053)
                parts.append(horn("Fur locks",[(x,.15,1.55),(x,.225,1.36),(x,.205,1.20+.09*cos(k))],
                    [.067,.054,.003],mane))
            ell("Arm",(side*.394,0,1.20),(.142,.143,.361),fur)
            ell("Fist",(side*.433,.03,.862),(.133,.135,.156),face)
            ell("Thigh",(side*.166,0,.66),(.159,.168,.286),fur)
            ell("Calf",(side*.18,0,.32),(.105,.124,.244),fur)
            ell("Foot",(side*.18,.07,.104),(.130,.206,.090),face)
    return parts


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    OUT.mkdir(parents=True, exist_ok=True)
    red=surface("Madder",(.29,.040,.026))
    umber=surface("Wool",(.088,.056,.037))
    yellow=surface("Saffron",(.58,.29,.041))
    dark=surface("DarkHair",(.033,.02,.015))
    skin=surface("Skin",(.335,.172,.096),.65)
    leather=surface("Leather",(.069,.036,.023),.67)
    teal=surface("Turquoise",(.034,.23,.219))
    pearl=surface("Horn",(.59,.48,.33))
    snow=surface("SnowFur",(.58,.55,.49))
    slate=surface("Slate",(.12,.12,.115))
    amber=surface("Amber",(.72,.38,.04),.3)
    def person(name,body,sash,hood,split):
        pieces=torso(body,red,sash,True)+head(skin,dark)
        pieces.extend([oval("Felt crown",(0,-.018,1.66),(.102,.091,.078),hood),
                       loft("Hat band",[(1.636,.101,.090,0,-.014),(1.656,.107,.095,0,-.014),
                            (1.669,.101,.093,0,-.014)],sash,36)])
        for j in range(23):
            a=j*pi/22
            pieces.append(oval("Prayer bead",(.083*cos(a),.088+.057*sin(a),1.416-.143*sin(a)),
                (.006,.006,.006),leather))
        if split:
            pieces.append(oval("Satchel",(-.13,-.139,1.04),(.113,.061,.11),leather))
            pieces.append(cord("Leather sling",[(.129,-.08,1.36),(.112,.065,1.388),
                  (.05,.144,1.28),(-.138,.124,1.03),(-.179,-.09,1.0)],.015,leather))
        for label,side in (("Left",-1),("Right",1)):
            for suffix,parts in [("Leg",tall_boot(.12*side,umber,leather)),("Sleeve",arm(side,body,sash,skin))]:
                if split:
                    export(combine(name+label+suffix,parts,JOINTS["Pilgrim"+label+suffix]))
                else: pieces.extend(parts)
        export(combine(name,pieces))
    person("Pilgrim",umber,teal,dark,True)
    person("Guide",red,yellow,red,False)
    person("Guardian",slate,amber,pearl,False)
    export(combine("SnowKing",beast(False,snow,slate,leather,pearl,amber)))
    export(combine("RiverYak",beast(True,umber,dark,leather,pearl,amber)))


def export(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.export_scene.fbx(filepath=str(OUT/(obj.name+".fbx")),use_selection=True,
        object_types={"MESH"},axis_forward="-Y",axis_up="Z",apply_unit_scale=True,
        bake_space_transform=True,add_leaf_bones=False,mesh_smooth_type="FACE")


if __name__ == "__main__":
    build()
