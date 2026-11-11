"""Original low-poly devotional sculptures; frontal axis -Y, Blender Z up.

Readable anatomy/drapery is prioritized over tiny ornament. These are stylized
interpretations, not scan replicas. Each asset is merged by material on export.
"""
import math
import bpy
from mathutils import Vector


def make_sculptor(base):
    def sculpture(collection, name, pos, scale, body_mat, halo_mat, is_seated=True,
                  is_wrathful=False, mount_kind=None, weapon_mat=None):
        x,y,z=pos
        # The twelve Yakushi guardians sit around the central pedestal, below the
        # triad; the old row of large cones obscured the principal image.
        general='Kondo_General_' in name
        if general:
            idx=int(name.rsplit('_',1)[1]); angle=2*math.pi*idx/12
            x=math.sin(angle)*.98; y=.6+math.cos(angle)*.67
            z=1.96;scale=.34
        s=scale
        hero=scale>1.1
        def loc(p):return (x+p[0]*s,y+p[1]*s,z+p[2]*s)
        def ball(label,p,radii,mat=body_mat,detail=2,rot=(0,0,0)):
            return base.add_icosphere(collection,name+'_'+label,loc(p),s,detail if hero else 1,mat,radii,rot)
        def rod(label,a,b,r1,r2=None,mat=body_mat,segs=8):
            return base.add_segment_cylinder(collection,name+'_'+label,loc(a),loc(b),r1*s,(r1 if r2 is None else r2)*s,segs if hero else min(segs,4),mat)
        def cylinder(label,p,r1,r2,h,mat=body_mat,n=16):
            return base.add_cylinder(collection,name+'_'+label,loc(p),r1*s,r2*s,h*s,n,mat)
        def mesh(label,vertices,faces,mat=body_mat,smooth=True):
            obj,data=base.new_mesh_obj(name+'_'+label,collection,mat)
            data.from_pydata([loc(p) for p in vertices],[],faces);data.update()
            for face in data.polygons:face.use_smooth=smooth
            return obj
        def profile(label,rings,mat=body_mat,n=16):
            n=n if hero else min(n,12)
            vertices=[];faces=[]
            for zz,rx,ry,dy in rings:
                for i in range(n):
                    t=2*math.pi*i/n;vertices.append((rx*math.cos(t),dy+ry*math.sin(t),zz))
            for j in range(len(rings)-1):
                for i in range(n):
                    a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
            faces += [tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))]
            return mesh(label,vertices,faces,mat)
        def trace(label,points,r=.012,mat=halo_mat):
            for i in range(len(points)-1):rod(f'{label}_{i}',points[i],points[i+1],r,mat=mat,segs=5)

        dark=base.make_mat('Sculpture_AgedGold',(0.29,.16,.055),roughness=.58,metallic=.48)
        hair=base.make_mat('Sculpture_HairPatina',(.08,.12,.11),roughness=.7,metallic=.18)
        trim=base.make_mat('Sculpture_GoldHighlight',(.68,.43,.12),roughness=.4,metallic=.58)
        # Keep mounts as recognizable volumes rather than boxes under a torso.
        mount=.0
        if mount_kind=='elephant':
            ball('ElephantBody',(0,0,.30),(.51,.68,.29),weapon_mat)
            ball('ElephantHead',(0,-.52,.39),(.28,.29,.28),weapon_mat)
            for sx in (-1,1):
                ball(f'ElephantEar{sx}',(sx*.27,-.48,.42),(.20,.07,.25),weapon_mat)
                for sy in (-1,1):rod(f'ElephantLeg{sx}{sy}',(sx*.32,sy*.4,.23),(sx*.32,sy*.4,.02),.10,mat=weapon_mat)
            trace('ElephantTrunk',[(0,-.70,.4),(0,-.80,.23),(0,-.86,.07),(0,-.95,.12)],.085,weapon_mat)
            mount=.48
        elif mount_kind=='geese':
            for i in range(4):
                dx=(-.30,.30,-.30,.30)[i];dy=(-.25,-.25,.25,.25)[i]
                ball(f'Goose{i}',(dx,dy,.19),(.22,.31,.15),weapon_mat)
                rod(f'GooseNeck{i}',(dx,dy-.18,.23),(dx,dy-.24,.48),.055,mat=weapon_mat)
                ball(f'GooseHead{i}',(dx,dy-.24,.48),(.075,.10,.075),weapon_mat,1)
            mount=.34
        elif mount_kind=='jaki':
            ball('SubduedJaki',(0,0,.16),(.5,.28,.14),weapon_mat)
            ball('JakiHead',(.34,-.18,.17),(.13,.13,.13),weapon_mat,1)
            mount=.18
        if mount:
            z+=mount*s

        cylinder('OctagonalFoot',(0,0,.12),.63,.59,.24,dark,12)
        cylinder('PedestalMoulding',(0,0,.27),.56,.47,.09,trim,16)
        cylinder('LotusWaist',(0,0,.38),.39,.41,.17,dark,16)
        cylinder('LotusSeat',(0,0,.54),.45,.64,.21,body_mat,20)
        for tier in range(0 if general else (2 if hero else 1)):
            for i in range(14):
                t=2*math.pi*(i+tier*.5)/14
                r=.54;zz=.47+tier*.12
                # Pointed, folded petal: six faces, shared export material.
                local=[(-.13,0,0),(0,-.06,-.12),(.13,0,0),(0,.08,.16),(0,-.06,.04)]
                vertices=[((r+p[1])*math.sin(t)+p[0]*math.cos(t),
                           (r+p[1])*math.cos(t)-p[0]*math.sin(t),zz+p[2]) for p in local]
                mesh(f'LotusPetal{tier}_{i}',vertices,[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(0,3,2,1)],trim,False)

        foot=.67
        shoulder=1.47 if is_seated else 1.99
        headz=shoulder+.31
        if is_seated:
            ball('LeftFoldedLeg',(-.27,-.07,.78),(.44,.32,.16))
            ball('RightFoldedLeg',(.27,-.12,.79),(.44,.31,.16))
            ball('LeftFoot',(.24,-.30,.86),(.24,.11,.09),body_mat,2,rot=(0,0,-.25))
            ball('RightFoot',(-.23,-.32,.84),(.22,.11,.09),body_mat,2,rot=(0,0,.23))
            profile('RobeBody',[(.76,.42,.27,.03),(1.0,.32,.22,0),(1.25,.34,.20,0),
                                (1.44,.42,.20,.01),(1.55,.30,.17,.01),(1.60,.11,.11,0)])
        else:
            profile('StandingRobe',[(foot,.32,.22,0),(.85,.33,.22,0),(1.15,.26,.18,0),
                                    (1.48,.25,.17,0),(1.76,.30,.18,0),(1.98,.36,.18,0),
                                    (2.08,.22,.14,0),(2.12,.1,.1,0)])
            for sx in (-1,1):ball(f'Foot{sx}',(sx*.16,-.16,.71),(.13,.23,.08))
        # Draped shoulder sash and curved folds stay in front of torso.
        for i in range(5 if hero else 3):
            zz=shoulder-.12-i*.11
            pts=[(-.27,-.145,zz+.18),(-.16,-.23,zz+.05),(0,-.245,zz),(.18,-.22,zz+.02),(.29,-.13,zz+.08)]
            trace(f'RobeFold{i}',pts,.015,dark)
        if is_seated:
            for i in range(3):trace(f'LapFold{i}',[(-.48+i*.04,-.20,.77+i*.055),(-.25,-.34,.76+i*.055),(.06,-.36,.78+i*.055),(.42,-.24,.79+i*.055)],.012,dark)
        else:
            for i in range(5):
                dx=(i-2)*.10;trace(f'SkirtFold{i}',[(dx*.6,-.17,1.51),(dx*.9,-.21,1.12),(dx,-.23,.78)],.012,dark)
        cylinder('Neck',(0,0,headz-.24),.11,.10,.20,body_mat,12)
        # Face mesh with tapered chin and softened brow, sculpted nose and eyelids.
        profile('Head',[(headz-.24,.065,.085,-.01),(headz-.19,.13,.12,-.015),
                        (headz-.09,.175,.14,-.01),(headz+.05,.185,.15,0),
                        (headz+.17,.15,.13,.01),(headz+.22,.08,.07,.01)],body_mat,20)
        for sx in (-1,1):
            ball(f'ElongatedEar{sx}',(sx*.185,0,headz-.075),(.045,.065,.15))
            trace(f'Eyelid{sx}',[(sx*.035,-.148,headz+.005),(sx*.08,-.148,headz-.008),(sx*.124,-.127,headz+.002)],.009,dark)
            trace(f'Brow{sx}',[(sx*.028,-.147,headz+.052),(sx*.075,-.155,headz+.066),(sx*.133,-.124,headz+.049)],.009,trim)
        ball('Nose',(0,-.163,headz-.045),(.034,.042,.067),body_mat,2)
        trace('Mouth',[(-.062,-.13,headz-.127),(0,-.153,headz-.135),(.062,-.13,headz-.127)],.009,dark)
        ball('Urna',(0,-.151,headz+.088),(.016,.012,.016),trim,1)
        bodhisattva=(not is_seated and not is_wrathful and not general) or 'Dainichi' in name
        ball('HairCap',(0,.012,headz+.15),(.18,.145,.105),hair)
        if bodhisattva:
            for i in range(5):
                t=(i-2)*.39
                px=.17*math.sin(t);py=-.11*math.cos(t)
                ball(f'CrownPetal{i}',(px,py,headz+.24),(.055,.035,.14 if i==2 else .105),trim,1)
        else:
            ball('Ushnisha',(0,.01,headz+.26),(.09,.085,.10),hair)
            if scale>1.1:
                for j in range(3):
                    for i in range(12):
                        t=2*math.pi*(i+.5*(j%2))/12
                        ball(f'HairCurl{j}_{i}',(.17*math.cos(t),.14*math.sin(t)+.01,headz+.12+j*.047),(.026,.026,.026),hair,1)
        # Bent forearms and palms. Yakushi: right hand raised, left open, no jar.
        if 'Yakushi' in name:
            hands=[(-1,(-.40,-.17,shoulder-.26),(-.39,-.30,shoulder+.02)),
                   (1,(.40,-.08,shoulder-.28),(.19,-.36,shoulder-.45))]
        elif 'Dainichi' in name:
            hands=[(-1,(-.40,-.11,shoulder-.27),(-.045,-.32,shoulder-.17)),
                   (1,(.40,-.11,shoulder-.27),(.035,-.35,shoulder-.12))]
        else:
            hands=[(-1,(-.40,-.09,shoulder-.27),(-.07,-.33,shoulder-.43)),
                   (1,(.40,-.09,shoulder-.27),(.07,-.35,shoulder-.43))]
        for side,elbow,hand in hands:
            rod(f'UpperArm{side}',(side*.32,0,shoulder-.01),elbow,.13,.105)
            ball(f'Elbow{side}',elbow,(.12,.12,.12))
            rod(f'Forearm{side}',elbow,hand,.10,.065)
            raised='Yakushi' in name and side==-1
            ball(f'Palm{side}',hand,(.07,.045,.115) if raised else (.11,.075,.045))
            if raised:
                for i in range(4):
                    a=(hand[0]+(i-1.5)*.030,hand[1],hand[2]+.04)
                    rod(f'Finger{i}',a,(a[0],a[1]-.005,a[2]+.10-abs(i-1.3)*.012),.016,segs=6)
        if is_wrathful or mount_kind=='jaki' or general:
            rod('VajraSword',(-.46,-.19,.85),(-.46,-.19,2.15),.018,mat=trim,segs=5)
            rod('SwordGuard',(-.58,-.19,1.15),(-.34,-.19,1.15),.027,mat=trim,segs=5)

        if general or mount_kind=='jaki':
            return

        # Pointed aureole; body is in front of it. Scalloped outer rim and a
        # circular nimbus replace the old solid rectangular panel.
        cz=(headz+.65)/2;hh=(headz+.55-.65)/2
        verts=[(0,.30,cz)];faces=[]
        n=40 if hero else 24
        outline=[]
        for i in range(n):
            t=2*math.pi*i/n
            zz=cz+hh*math.cos(t)
            xx=.69*math.sin(t)*(1-.24*math.cos(t))
            if is_wrathful:xx*=1+.09*math.sin(11*t)
            outline.append((xx,.31,zz));verts.append((xx,.32,zz))
        for i in range(n):faces.append((0,1+i,1+(i+1)%n))
        mesh('Mandorla',verts,faces,dark if not is_wrathful else halo_mat,False)
        trace('MandorlaRim',outline+[outline[0]],.026,trim if not is_wrathful else halo_mat)
        circle=[(.29*math.sin(2*math.pi*i/24),.275,headz+.29*math.cos(2*math.pi*i/24)) for i in range(25)]
        trace('HeadNimbus',circle,.017,trim)
        rays=17 if hero else 9
        for i in range(rays):
            t=2*math.pi*(i+.5)/rays
            a=(.49*math.sin(t),.29,cz+hh*.78*math.cos(t))
            b=(.62*math.sin(t),.29,cz+hh*.94*math.cos(t))
            rod(f'HaloRay{i}',a,b,.012,mat=trim,segs=4)
        if 'Yakushi' in name:
            for i in range(7):
                t=(i-3)*.40
                px=.59*math.sin(t);pz=headz-.05+.55*math.cos(t)
                ball(f'KebutsuHead{i}',(px,.22,pz),(.037,.035,.047),trim,1)
                ball(f'KebutsuBody{i}',(px,.22,pz-.085),(.045,.035,.06),trim,1)
                ball(f'KebutsuLegs{i}',(px,.20,pz-.13),(.065,.04,.025),trim,1)
    return sculpture
