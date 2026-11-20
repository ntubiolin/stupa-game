"""Sculpt the two Tō-ji figures in Blender. +Y forward, +Z up, meters."""
from array import array
from math import cos, exp, pi, sin, tau
from pathlib import Path
import sys

import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parent.parent / "Assets/Toji/Figures"
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
        for n in range(4):
            t = n/4
            row = []
            for col in range(2):
                a,b,c,d = (rows[j][col] for j in (max(0,i-1),i,i+1,min(i+2,len(rows)-1)))
                row += list(.5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
            points.append(row)
    return points + [[*rows[-1][0], *rows[-1][1]]]


def loft(name, rows, mat, rings=64, folds=0, sculpt=None):
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
    result = [loft("Sculpted face",rows,skin,96,sculpt=anatomy)]
    for side in (-1,1):
        result.append(oval("Ear",(.083*side,-.008,1.591),(.013,.014,.026),skin))
        result.append(cord("Upper eyelid",[(x*side,y,z) for x,y,z in
            [(.017,.064,1.608),(.028,.061,1.611),(.042,.056,1.610),(.054,.048,1.607)]],.00155,dark))
        result.append(cord("Eyebrow",[(x*side,y,z) for x,y,z in
            [(.017,.065,1.629),(.034,.061,1.632),(.053,.051,1.627)]],.0020,dark))
    result.append(cord("Lip seam",[(-.024,.068,1.546),(-.009,.076,1.545),
        (.009,.076,1.545),(.024,.068,1.546)],.0013,dark))
    return result


def hat(straw, binding):
    profile = [(1.658,.326,.300,0,0),(1.664,.322,.296,0,0),(1.694,.241,.218,0,-.008),
               (1.729,.139,.127,0,-.019),(1.759,.063,.056,0,-.024),(1.777,.004,.004,0,-.026)]
    result = [loft("Sedge canopy",profile,straw,144,.002)]
    for i in range(72):
        a = i*tau/72
        result.append(cord("Radiating straw",[(x+r*cos(a),y+d*sin(a),z+.002) for z,r,d,x,y in profile],
            .0022 if i%3 else .0031,binding,1))
    for z,r,d,_,y in (profile[0],profile[1],profile[2],profile[3],profile[4]):
        result.append(cord("Woven circular binding",[(r*cos(i*tau/128),y+d*sin(i*tau/128),z+.002)
            for i in range(129)],.0025,binding))
    return result


def torso(outer, collar, waist, pilgrim):
    skirt = [(.768,.226,.148,0,0),(.864,.213,.144,0,0)] if pilgrim else [
        (.071,.280,.202,0,-.008),(.114,.325,.221,0,0),(.439,.275,.184,0,0),
        (.752,.231,.169,0,-.009)]
    rows = skirt + [(.995,.193,.136,0,-.008),(1.105,.202,.140,0,-.014),
                    (1.268,.230,.144,0,-.007),(1.358,.218,.115,0,.003),
                    (1.438,.081,.067,0,.013),(1.486,.056,.054,0,.004)]
    result = [loft("Gathered robes",rows,outer,80,.025)]
    result.append(loft("Bound sash",[(.96,.194,.137,0,0),(.982,.204,.145,0,-.004),
        (1.025,.202,.145,0,-.006),(1.046,.192,.135,0,-.006)],waist,64,.004))
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


def kasaya(silk, seam):
    rows, columns = 26, 13
    vertices = []
    for r in range(rows):
        t = r/(rows-1)
        for j in range(columns):
            q = j/(columns-1)-.5
            vertices.append((-.151+.223*t+q*(.102+.210*t),
                .034+.163*sin(t*pi*.72)-.055*q*q+.004*cos(q*5*tau),1.401-.48*t+.075*q))
    faces = [(a,a+1,a+columns+1,a+columns) for r in range(rows-1)
             for c in range(columns-1) for a in [r*columns+c]]
    result = [mesh("Pieced kasaya panel",vertices,faces,silk,
        [(j/(columns-1),r/(rows-1)) for r in range(rows) for j in range(columns)])]
    for column in (0,3,8,12):
        result.append(cord("Running textile seam",[(x,y+.002,z) for x,y,z in vertices[column::columns]],.0024,seam))
    for row in (0,8,17,rows-1):
        result.append(cord("Cross seam",[(x,y+.002,z) for x,y,z in
            vertices[row*columns:(row+1)*columns]],.0023,seam))
    result.append(cord("Kasaya shoulder wrap",[(-.148,.045,1.406),(-.170,-.076,1.371),
                  (-.160,-.135,1.306),(-.104,-.171,1.122),(.066,-.159,.959)],.038,silk,4))
    for i in range(15):
        a = pi*i/14
        result.append(oval("Wooden mala bead",(.070*cos(a),.088+.021*sin(a),1.429-.112*sin(a)),
                           (.006,.006,.006),seam))
    return result


def arm(side, cloth, cuff, skin):
    x = side*.23
    rows = [(.88,.054,.060,x+side*.063,.021),
            (.915,.064,.069,x+side*.058,.018),(.994,.078,.079,x+side*.050,.013),
            (1.132,.086,.084,x+side*.038,-.012),(1.247,.080,.074,x+side*.024,-.011),
            (1.355,.070,.069,x-side*.007,-.010),(1.400,.041,.053,x-side*.018,-.013)]
    result = [loft("Hanging sleeve", rows, cloth, 64,.013)]
    result.append(loft("Sleeve hem",[(.880,.054,.060,x+side*.063,.021),
        (.892,.060,.065,x+side*.061,.020),(.902,.063,.068,x+side*.060,.019)],cuff))
    result.append(oval("Resting hand",(x+side*.062,.027,.848),(.027,.022,.056),skin))
    result.append(oval("Thumb",(x+side*.043,.042,.862),(.010,.010,.030),skin))
    return result


def pilgrim_leg(side, cloth, cuff, leather, straw):
    x = side*.12
    rows = [(.102,.065,.066,x+side*.018,-.012),(.178,.068,.074,x+side*.017,-.015),
            (.304,.078,.080,x+side*.013,-.018),(.454,.095,.095,x+side*.009,-.014),
            (.612,.111,.110,x+side*.005,-.003),(.772,.126,.117,x,0),
            (.878,.116,.106,x,-.002)]
    result = [loft("Pleated hakama",rows,cloth,64,.018)]
    result.append(loft("Ankle binding",[(.043,.042,.046,x+side*.018,-.016),
        (.112,.058,.062,x+side*.018,-.011),(.158,.063,.066,x+side*.018,-.011)],cuff))
    result.extend(foot(x+side*.018, leather, straw))
    return result


def foot(x, upper, sole):
    return [
        oval("Tabi", (x,.048,.052),(.069,.128,.050),upper),
        loft("Woven sandal",[(.004,.060,.123,x,.050),(.011,.069,.129,x,.050),
            (.028,.070,.131,x,.048),(.036,.066,.124,x,.047)],sole),
        cord("Sandal thong",[(x-.055,.027,.053),(x-.027,.067,.092),
            (x+.019,.144,.079),(x+.060,.054,.057)],.006,sole),
    ]


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


def export(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=str(OUT / (obj.name + ".glb")), export_format="GLB",
        use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    OUT.mkdir(parents=True, exist_ok=True)
    indigo = surface("Indigo hemp",(.022,.033,.039),.89,.34)
    dusk = surface("Charcoal weave",(.028,.023,.020),.95,.26)
    clay = surface("Faded brown hemp",(.097,.047,.025),.95,.26)
    chestnut = surface("Kūkai robe",(.067,.036,.030),.9,.30)
    amber = surface("Pieced madder silk",(.173,.063,.025),.83,.25)
    brown = surface("Dark thread",(.083,.047,.022),.88,.20)
    straw = surface("Dried woven sedge",(.225,.132,.054),.88,.36)
    binding = surface("Braided straw",(.175,.099,.040),.92)
    leather = surface("Rain-darkened leather",(.064,.044,.028),.73,.2)
    skin = surface("Warm skin",(.269,.130,.081),.64)
    dark = surface("Dark eyes and lip creases",(.045,.021,.015),.78)
    objects = {}
    pilgrim = torso(indigo,clay,dusk,True)+head(skin,dark)+hat(straw,binding)
    pilgrim += [
        cord("Woven hat tie",[(-.192,.008,1.661),(-.085,.02,1.561),(-.029,.047,1.504),
            (.026,.048,1.503),(.081,.021,1.561),(.193,.008,1.662)],.0036,dusk),
        oval("Wrapped travel rucksack",(0,-.168,1.128),(.147,.083,.237),leather),
        loft("Bedroll core", [(1.305,.147,.039,0,-.165),(1.316,.154,.052,0,-.166),
            (1.349,.155,.053,0,-.167),(1.357,.140,.038,0,-.166)],clay,64,.004),
        cord("Rucksack tie",[(-.148,-.089,1.321),(-.104,-.115,1.399),(-.090,.018,1.394),
            (-.111,.108,1.278),(-.154,.129,1.136),(-.164,.030,1.029),
            (-.148,-.151,1.010)],.013,brown),
        cord("Rucksack tie",[(.145,-.092,1.321),(.108,-.110,1.389),(.097,.020,1.394),
            (.111,.105,1.276),(.149,.128,1.136),(.159,.032,1.029),
            (.141,-.149,1.016)],.013,brown),
    ]
    objects["PilgrimBody"] = combine("PilgrimBody",pilgrim)
    for label, side in (("Left",-1),("Right",1)):
        leg = "Pilgrim"+label+"Leg"
        sleeve = "Pilgrim"+label+"Sleeve"
        objects[leg] = combine(leg,pilgrim_leg(side,indigo,dusk,leather,binding),JOINTS[leg])
        objects[sleeve] = combine(sleeve,arm(side,indigo,clay,skin),JOINTS[sleeve])
    kukai = torso(chestnut,dusk,chestnut,False)+head(skin,dark)+kasaya(amber,brown)
    kukai += arm(-1,chestnut,clay,skin)+arm(1,chestnut,clay,skin)
    kukai += foot(-.10,leather,binding)+foot(.10,leather,binding)
    objects["Kukai"] = combine("Kukai",kukai)
    for obj in objects.values():
        export(obj)

    if "--blend" in sys.argv:
        for name, pivot in JOINTS.items():
            objects[name].location = pivot
        objects["Kukai"].location.x = 1
        argument = sys.argv.index("--blend")
        path = Path(sys.argv[argument+1]).resolve()
        bpy.ops.wm.save_as_mainfile(filepath=str(path))


if __name__ == "__main__":
    build()
