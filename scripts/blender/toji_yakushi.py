"""Original Kondō hero sculpture, authored in Blender coordinates (front = -Y).

The principal image keeps the game's scale, pose and iconography. Continuous
surfaces replace primitive joints and raised dark stripes. Higher-resolution
cloth/face surfaces are retained only while baking the game mesh normal atlas.
This is an interpretation from the cited temple photographs, not a scan.
"""
import math
from pathlib import Path
import bpy
from mathutils import Vector

TAU = math.tau


def make_sculptor(base, fallback):
    def sculpt(collection, name, pos, scale, body_mat, halo_mat, **kwargs):
        if name != 'Kondo_YakushiNyorai':
            return fallback(collection, name, pos, scale, body_mat, halo_mat, **kwargs)
        make_yakushi(base, collection, name, pos, scale, body_mat)
    return sculpt


def make_yakushi(base, collection, name, pos, scale, gold):
    origin = Vector(pos)
    s = scale
    bronze = base.make_mat('Toji_YakushiAntique', (.24, .115, .035), roughness=.60, metallic=.72)
    edge = base.make_mat('Toji_YakushiEdge', (.53, .30, .085), roughness=.44, metallic=.80)
    hair = base.make_mat('Toji_YakushiHair', (.048, .056, .044), roughness=.68, metallic=.32)
    crevice = base.make_mat('Toji_YakushiCrevice', (.11, .060, .025), roughness=.72, metallic=.46)

    def mesh(label, verts, faces, mat=gold, smooth=True, high=False):
        obj, data = base.new_mesh_obj(name + '_' + label, collection, mat)
        data.from_pydata([origin + Vector(v)*s for v in verts], [], faces)
        data.update()
        for face in data.polygons:
            face.use_smooth = smooth
        obj['yakushi_high' if high else 'yakushi_part'] = True
        return obj

    def grid(label, fn, nu, nv, mat=gold, wrap=False, high=False):
        columns=nu if wrap else nu+1
        verts = [fn(i/nu, j/nv) for j in range(nv+1) for i in range(columns)]
        faces = []
        for j in range(nv):
            for i in range(nu):
                a=j*columns+i;b=j*columns+(i+1)%columns
                faces.append((a,b,b+columns,a+columns))
        if wrap:
            faces.extend([tuple(reversed(range(nu))),tuple(range(nv*nu,(nv+1)*nu))])
        return mesh(label, verts, faces, mat, high=high)

    def sphere(label, center, radii, mat=gold, nu=20, nv=12):
        verts=[(center[0],center[1],center[2]+radii[2])]
        for j in range(1,nv):
            p=math.pi*j/nv
            for i in range(nu):
                t=TAU*i/nu
                verts.append((center[0]+radii[0]*math.sin(p)*math.cos(t),
                              center[1]+radii[1]*math.sin(p)*math.sin(t),
                              center[2]+radii[2]*math.cos(p)))
        bottom=len(verts);verts.append((center[0],center[1],center[2]-radii[2]))
        faces=[(0,1+i,1+(i+1)%nu) for i in range(nu)]
        for j in range(nv-2):
            for i in range(nu):
                a=1+j*nu+i;b=1+j*nu+(i+1)%nu
                faces.append((a,a+nu,b+nu,b))
        last=1+(nv-2)*nu
        faces.extend((bottom,last+(i+1)%nu,last+i) for i in range(nu))
        return mesh(label,verts,faces,mat)

    def tube(label, points, radii, mat=gold, sides=8, samples=24):
        """Catmull-Rom swept surface: continuous wrists/elbows and rounded scrolls."""
        controls=[Vector(p) for p in points]
        def sample(t):
            f=t*(len(controls)-1);i=min(len(controls)-2,int(f));u=f-i
            a=controls[max(0,i-1)];b=controls[i];c=controls[i+1];d=controls[min(len(controls)-1,i+2)]
            p=.5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
            r=radii[i]*(1-u)+radii[i+1]*u
            return p,r
        verts=[];previous_axis=None
        for j in range(samples+1):
            t=j/samples;p,r=sample(t)
            tangent=(sample(min(1,t+.001))[0]-sample(max(0,t-.001))[0]).normalized()
            axis=(previous_axis-tangent*previous_axis.dot(tangent)) if previous_axis is not None else tangent.cross(Vector((0,1,0)))
            if axis.length<.05:axis=tangent.cross(Vector((1,0,0)))
            axis.normalize();other=tangent.cross(axis).normalized()
            previous_axis=axis.copy()
            for i in range(sides):
                angle=TAU*i/sides
                verts.append(p+r*(math.cos(angle)*axis+math.sin(angle)*other))
        faces=[]
        for j in range(samples):
            for i in range(sides):
                a=j*sides+i;b=j*sides+(i+1)%sides
                faces.append((a,b,b+sides,a+sides))
        if (controls[0]-controls[-1]).length>1e-6:
            faces.extend([tuple(reversed(range(sides))),tuple(range(samples*sides,(samples+1)*sides))])
        return mesh(label,verts,faces,mat)

    def lathe(label,rings,mat=gold,n=32):
        verts=[]
        for z,r in rings:
            verts.extend((r*math.cos(TAU*i/n),r*math.sin(TAU*i/n),z) for i in range(n))
        faces=[]
        for j in range(len(rings)-1):
            for i in range(n):
                a=j*n+i;b=j*n+(i+1)%n
                faces.append((a,b,b+n,a+n))
        faces.extend([tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))])
        return mesh(label,verts,faces,mat)

    # Turned mouldings, convex overlapping petals and a restrained antique base.
    lathe('Pedestal',[(0,.58),(.04,.62),(.09,.62),(.13,.57),(.18,.53),(.23,.51),
                      (.26,.55),(.29,.55),(.32,.43),(.42,.40),(.48,.47),(.53,.57),(.59,.57)],bronze)
    for z,r in ((.09,.62),(.255,.55),(.30,.49),(.51,.54)):
        lathe('Moulding_'+str(z),[(z-.012,r-.01),(z,r+.008),(z+.012,r-.01)],edge)
    for tier in range(2):
        for i in range(16):
            angle=TAU*(i+.5*tier)/16
            def petal(u,v,angle=angle,tier=tier):
                across=(u*2-1)*.125*max(.001,math.sin(math.pi*v))**.65
                radial=.365+.205*math.sin(v*math.pi*.62)+.035*(1-(2*u-1)**2)*math.sin(math.pi*v)
                zz=.31+tier*.115+v*.265+.024*math.sin(math.pi*u)*math.sin(math.pi*v)
                return (radial*math.sin(angle)+across*math.cos(angle),
                        radial*math.cos(angle)-across*math.sin(angle),zz)
            obj=grid(f'LotusPetal_{tier}_{i}',petal,4,6,edge)
            for polygon in obj.data.polygons:polygon.flip()
    lathe('Cushion',[(.53,.48),(.58,.57),(.62,.59),(.66,.56),(.69,.48)],gold)

    def interp(z, rings):
        for j in range(len(rings)-1):
            if z<=rings[j+1][0]:
                a,b=rings[j],rings[j+1];t=max(0,min(1,(z-a[0])/(b[0]-a[0])))
                t=t*t*(3-2*t)
                return tuple(a[k]*(1-t)+b[k]*t for k in range(1,len(a)))
        return rings[-1][1:]

    def gauss(x,z,cx,cz,wx,wz):return math.exp(-((x-cx)/wx)**2-((z-cz)/wz)**2)

    def torso(u,v,detail):
        z=.82+v*.88;t=TAU*u
        rx,ry,dy=interp(z,[(.82,.39,.25,.035),(1.03,.31,.235,.025),(1.24,.335,.215,.02),
                           (1.43,.405,.205,.035),(1.50,.36,.18,.04),(1.57,.20,.13,.015),
                           (1.62,.105,.10,0),(1.70,.09,.08,0)])
        x=rx*math.cos(t);y=dy+ry*math.sin(t)
        front=max(0,-math.sin(t))**6
        # Cloth folds flow diagonally from the covered shoulder. Fine creases
        # exist only on the baking source, rather than separate raised tubes.
        phase=z+.50*x*x+.20*x
        amplitude=.003+(.0015 if detail else 0)
        fold=amplitude*math.sin(phase*35)*math.sin(math.pi*v)**.7
        if detail:fold+=.0015*math.sin(phase*91+.4)*math.sin(math.pi*v)
        y-=front*fold
        return x,y,z

    def lap(u,v,detail):
        z=.65+v*.39;t=TAU*u
        rx,ry,dy=interp(z,[(.65,.30,.20,0),(.71,.60,.32,-.025),(.80,.665,.345,-.025),
                           (.90,.55,.30,-.015),(1.00,.34,.245,.01),(1.04,.30,.22,.025)])
        x=rx*math.cos(t);y=dy+ry*math.sin(t)
        f=max(0,-math.sin(t))**4
        y-=f*(.005*math.sin(z*62+.6*math.cos(t)*math.pi)+
              (.0015*math.sin(z*130+x*8) if detail else 0))*math.sin(math.pi*v)
        return x,y,z

    def head(u,v,detail):
        z=1.62+v*.48;t=TAU*u
        rx,ry,dy=interp(z,[(1.62,.065,.075,-.015),(1.66,.12,.11,-.012),(1.72,.158,.131,-.005),
                           (1.81,.182,.15,0),(1.91,.18,.152,.005),(2.01,.15,.125,.01),(2.10,.025,.025,.01)])
        x=rx*math.cos(t);y=dy+ry*math.sin(t)
        f=max(0,-math.sin(t))**12
        # Brow, cheekbone, nose and lips are one smooth surface with the face.
        d=.036*gauss(x,z,0,1.82,.025,.085)+.048*gauss(x,z,0,1.775,.035,.023)
        d+=.009*(gauss(x,z,.09,1.78,.06,.055)+gauss(x,z,-.09,1.78,.06,.055))
        d-=.012*(gauss(x,z,.078,1.857,.045,.020)+gauss(x,z,-.078,1.857,.045,.020))
        d+=.012*gauss(x,z,0,1.711,.065,.012)+.013*gauss(x,z,0,1.691,.057,.013)
        if detail:d+=.004*(gauss(x,z,.029,1.765,.012,.009)+gauss(x,z,-.029,1.765,.012,.009))
        return x,y-f*d,z

    # Welded back seams and closed end caps avoid degenerate pole faces and
    # discontinuous smoothing. The UV atlas introduces its own texture seams.
    for label,fn,nu,nv in [('Body',torso,32,24),('Lap',lap,32,16),('Face',head,40,28)]:
        low=grid(label,lambda u,v,fn=fn:fn(u,v,False),nu,nv,wrap=True)
        low['yakushi_bake_low']=True
        high=grid(label+'_SculptSource',lambda u,v,fn=fn:fn(u,v,True),nu*3,nv*3,wrap=True,high=True)
        high['yakushi_bake_high']=True
        high.hide_render=True;high.hide_set(True)

    # Soft transition at the robe neckline and two engraved neck creases.
    for i in range(2):
        pts=[(.105*math.sin(-1.3+2.6*j/16),-.104*math.cos(-1.3+2.6*j/16),1.57+i*.036) for j in range(17)]
        tube('NeckCrease'+str(i),pts,[.0035]*len(pts),bronze,5,20)
    for side in (-1,1):
        sphere('Ear'+str(side),(side*.183,.002,1.79),(.043,.063,.135),gold,16,14)
        pts=[(side*(.19+.022*math.sin(math.pi*j/12)), -.05,1.89-.20*j/12) for j in range(13)]
        tube('EarCarving'+str(side),pts,[.006]*13,bronze,5,16)
        # Half-closed almond lids, subtle lower edge, no white eyeball.
        for upper in (False,True):
            pts=[]
            for j in range(13):
                a=j/12;x=side*(.028+.109*a)
                zz=1.85+(.013 if upper else -.003)*math.sin(math.pi*a)+.006*a
                yy=-.145+(.030*a*a)
                pts.append((x,yy-.006,zz))
            tube(f'Eyelid_{side}_{upper}',pts,[.0045]*13,gold if upper else crevice,5,16)
        brow=[(side*(.028+.111*j/14),-.153+.030*(j/14)**2,1.901+.012*math.sin(math.pi*j/14)) for j in range(15)]
        tube('Brow'+str(side),brow,[.0045]*15,edge,5,18)
    mouth=[(-.060+.12*j/16,-.133-.011*math.sin(math.pi*j/16),1.702+.004*math.cos(TAU*j/16)) for j in range(17)]
    tube('MouthLine',mouth,[.003]*17,crevice,5,20)
    sphere('Urna',(0,-.154,1.935),(.012,.008,.012),edge,12,8)

    sphere('HairCap',(0,.01,2.015),(.164,.142,.091),hair,20,10)
    sphere('Ushnisha',(0,.016,2.105),(.073,.07,.073),hair,16,10)
    for j in range(5):
        n=16 if j<3 else 12
        radius=.161*math.sqrt(max(.1,1-((j*.025)/.16)**2))
        for i in range(n):
            t=TAU*(i+.5*(j%2))/n
            sphere(f'HairCurl_{j}_{i}',(radius*math.cos(t),.01+radius*.86*math.sin(t),1.985+j*.025),
                   (.020,.020,.017),hair,6,4)

    # Covered upper arms blend into one curved forearm. Individual tapered
    # fingers and thumb retain the open right palm and empty upturned left hand.
    tube('RaisedArm',[(-.22,.025,1.43),(-.35,.012,1.43),(-.43,-.02,1.32),(-.47,-.10,1.15),(-.435,-.21,1.27),(-.405,-.28,1.46)],
         [.11,.11,.115,.11,.075,.05],gold,10,28)
    tube('RestingArm',[(.22,.025,1.43),(.35,.012,1.43),(.43,-.015,1.31),(.47,-.09,1.13),(.38,-.27,1.065),(.20,-.36,1.065)],
         [.11,.11,.115,.105,.072,.05],gold,10,26)
    sphere('RaisedPalm',(-.402,-.286,1.50),(.073,.037,.10),gold,16,10)
    for i in range(4):
        xx=-.402+(i-1.5)*.033;length=(.142,.168,.158,.126)[i]
        tube('RaisedFinger'+str(i),[(xx,-.286,1.555),(xx-.003,-.289,1.60),(xx-.008,-.283,1.555+length)],
             [.0165,.016,.011],gold,8,10)
    tube('RaisedThumb',[(-.341,-.285,1.47),(-.31,-.30,1.51),(-.31,-.309,1.555)], [.023,.02,.014],gold,8,12)
    sphere('RestingPalm',(.14,-.355,1.069),(.115,.069,.033),gold,16,10)
    for i in range(4):
        yy=-.355+(i-1.5)*.029
        tube('RestingFinger'+str(i),[(.095,yy,1.075),(.028,yy-.006,1.075),(-.012,yy-.003,1.094)],
             [.014,.013,.010],gold,7,10)
    tube('RestingThumb',[(.175,-.405,1.074),(.119,-.432,1.088),(.076,-.421,1.102)],[.020,.016,.011],gold,8,12)
    # One exposed folded foot, with toes that follow the curvature of the lap.
    sphere('FoldedFoot',(.24,-.25,.937),(.23,.083,.062),gold,20,10)
    for i in range(4):
        sphere('Toe'+str(i),(.08+i*.029,-.306,.952),(.022,.027,.021),gold,10,6)

    # Openwork mandorla: light passes through the ornament. The frame follows
    # the former silhouette, so the existing sanctum fit remains unchanged.
    cz=1.49;hh=.88
    def outline(t):return (.68*math.sin(t)*(1-.23*math.cos(t)),.32,cz+hh*math.cos(t))
    rim=[outline(TAU*i/64) for i in range(65)]
    tube('MandorlaFrame',rim,[.024]*65,edge,6,80)
    inner=[(p[0]*.89,.335,cz+(p[2]-cz)*.93) for p in rim]
    tube('MandorlaInner',inner,[.011]*65,bronze,5,72)
    # Small curled vines sit on the frame; they do not form a solid gold plate.
    for i in range(18):
        t=TAU*(i+.5)/18;cx,cy,zz=outline(t)
        pts=[]
        for j in range(18):
            a=j/17;rr=.073*(1-a)+.008;theta=TAU*1.25*a+t
            pts.append((cx*.83+rr*math.cos(theta),.325,cz+(zz-cz)*.89+rr*math.sin(theta)))
        tube('HaloScroll'+str(i),pts,[.010]*18,gold,5,18)
    for r in (.275,.298,.34):
        pts=[(r*math.sin(TAU*i/48),.285,1.835+r*math.cos(TAU*i/48)) for i in range(49)]
        tube('HeadNimbus'+str(r),pts,[.011 if r==.298 else .006]*49,edge,5,48)
    for i in range(7):
        t=(i-3)*.39;xx=.49*math.sin(t);zz=1.82+.53*math.cos(t)
        sphere('KebutsuHead'+str(i),(xx,.27,zz),(.028,.027,.035),edge,8,6)
        sphere('KebutsuBody'+str(i),(xx,.27,zz-.061),(.035,.023,.043),gold,8,6)
        sphere('KebutsuLap'+str(i),(xx,.25,zz-.097),(.055,.027,.018),edge,8,4)


def finish_bake(scene, cache_dir):
    """Bake the high-resolution surfaces into two bounded 512² textures.

    All exported microdetail uses a normal map; the high model never ships.
    AO has a short radius so it captures local creases rather than freezing the
    building's daylight into the statue. The maps use a dedicated second UV.
    """
    cache_dir=Path(cache_dir);cache_dir.mkdir(parents=True,exist_ok=True)
    lows=[o for o in scene.objects if o.get('yakushi_bake_low')]
    highs=[o for o in scene.objects if o.get('yakushi_bake_high')]
    if not lows:return
    def join(objects,label):
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.hide_set(False);obj.hide_render=False;obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        obj=objects[0];obj.name=label
        return obj
    low=join(lows,'Kondo_Yakushi_SculptedSurface')
    high=join(highs,'Kondo_Yakushi_HighSource')
    bpy.ops.object.select_all(action='DESELECT');low.select_set(True)
    bpy.context.view_layer.objects.active=low
    if not low.data.uv_layers.get('UVMap'):low.data.uv_layers.new(name='UVMap')
    uv=low.data.uv_layers.get('SculptureUV') or low.data.uv_layers.new(name='SculptureUV')
    low.data.uv_layers.active=uv
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(70),island_margin=.018)
    bpy.ops.object.mode_set(mode='OBJECT')
    material=low.data.materials[0].copy();material.name='Toji_YakushiBakedGilt'
    material.use_backface_culling=True
    low.data.materials.clear();low.data.materials.append(material)
    for face in low.data.polygons:face.material_index=0
    nodes=material.node_tree.nodes;links=material.node_tree.links
    bsdf=nodes.get('Principled BSDF');output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
    target=nodes.new('ShaderNodeTexImage');target.name='SculptureBakeTarget';nodes.active=target
    normal=bpy.data.images.new('Toji_Yakushi_Normal',512,512,alpha=False)
    normal.colorspace_settings.name='Non-Color';target.image=normal
    old_engine=scene.render.engine
    scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.device='CPU'
    scene.render.bake.margin=8;scene.render.bake.use_clear=True
    bpy.ops.object.select_all(action='DESELECT');high.select_set(True);low.select_set(True)
    bpy.context.view_layer.objects.active=low
    bpy.ops.object.bake(type='NORMAL',use_selected_to_active=True,cage_extrusion=.04,max_ray_distance=.14,uv_layer='SculptureUV')
    normal.filepath_raw=str(cache_dir/'yakushi-normal.png');normal.file_format='PNG';normal.save();normal.pack()
    high.hide_render=True;high.hide_set(True)
    bpy.ops.object.select_all(action='DESELECT');low.select_set(True)
    ao=bpy.data.images.new('Toji_Yakushi_AO',512,512,alpha=False)
    ao.colorspace_settings.name='Non-Color';target.image=ao
    ao_node=nodes.new('ShaderNodeAmbientOcclusion');ao_node.inputs['Distance'].default_value=.26
    emission=nodes.new('ShaderNodeEmission');links.new(ao_node.outputs['AO'],emission.inputs['Color'])
    links.new(emission.outputs[0],output.inputs['Surface'])
    bpy.ops.object.bake(type='EMIT',use_selected_to_active=False,uv_layer='SculptureUV')
    ao.filepath_raw=str(cache_dir/'yakushi-ao.png');ao.file_format='PNG';ao.save();ao.pack()
    nodes.remove(emission);nodes.remove(ao_node);nodes.remove(target)
    links.new(bsdf.outputs['BSDF'],output.inputs['Surface'])
    uv_node=nodes.new('ShaderNodeUVMap');uv_node.uv_map='SculptureUV'
    normal_tex=nodes.new('ShaderNodeTexImage');normal_tex.image=normal
    links.new(uv_node.outputs['UV'],normal_tex.inputs['Vector'])
    normal_node=nodes.new('ShaderNodeNormalMap');normal_node.uv_map='SculptureUV';normal_node.inputs['Strength'].default_value=.85
    links.new(normal_tex.outputs['Color'],normal_node.inputs['Color']);links.new(normal_node.outputs['Normal'],bsdf.inputs['Normal'])
    ao_tex=nodes.new('ShaderNodeTexImage');ao_tex.image=ao
    links.new(uv_node.outputs['UV'],ao_tex.inputs['Vector'])
    group=bpy.data.node_groups.get('glTF Material Output')
    if group is None:
        group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
        group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
    existing=next((n for n in nodes if n.type=='GROUP' and n.node_tree==group),None)
    occlusion=existing or nodes.new('ShaderNodeGroup');occlusion.node_tree=group
    ao_strength=nodes.new('ShaderNodeMix');ao_strength.data_type='RGBA'
    ao_strength.inputs[0].default_value=.65
    ao_strength.inputs[6].default_value=(1,1,1,1)
    links.new(ao_tex.outputs['Color'],ao_strength.inputs[7])
    links.new(ao_strength.outputs[2],occlusion.inputs['Occlusion'])
    low.data.uv_layers.active=low.data.uv_layers['UVMap']
    scene.render.engine=old_engine
    bpy.data.objects.remove(high,do_unlink=True)
    # Source scene contains low geometry plus packed baked maps, ready to edit.
    print('YAKUSHI_BAKED',len(low.data.polygons),'faces; 512px normal + AO')
