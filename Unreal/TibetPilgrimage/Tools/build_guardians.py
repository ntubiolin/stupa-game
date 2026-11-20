"""Additional chapter-specific silhouettes, with museum references in FigureReferences.md."""
from math import sin,cos,tau,pi
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_figures import bpy, surface, oval, loft, head, torso, horn, arm, tall_boot, cord, combine, export

def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ivory=surface("Horn",(.59,.48,.33))
    white=surface("SnowFur",(.58,.55,.49))
    red=surface("Madder",(.29,.04,.026))
    gold=surface("Saffron",(.58,.29,.041))
    coal=surface("DarkHair",(.033,.02,.015))
    teal=surface("Turquoise",(.034,.23,.219))
    skin=surface("Skin",(.335,.172,.096),.65)
    slate=surface("Slate",(.12,.12,.115))
    amber=surface("Amber",(.72,.38,.04))
    wool=surface("Wool",(.088,.056,.037))

    # A four-legged white snow lion, lifted plume, whisker pads and curled turquoise mane.
    lion=[oval("Haunch",(0,-.42,.83),(.365,.51,.38),white),
          oval("Barrel",(0,.1,.93),(.385,.70,.445),white),
          oval("Chest",(0,.44,.99),(.36,.35,.46),white),
          oval("Skull",(0,.64,1.28),(.26,.30,.276),white),
          oval("Dark muzzle",(0,.904,1.188),(.12,.09,.063),coal),
          cord("Tail plume",[(0,-.83,.96),(-.15,-1.10,1.18),(-.22,-1.03,1.48),(-.15,-.90,1.51)],.047,teal)]
    for side in (-1,1):
        for y in (-.50,.43):
            x=side*.26
            lion.extend([oval("Muscular upper leg",(x,y,.65),(.134,.147,.29),white),
                         oval("Pastern",(x,y+.025,.29),(.091,.097,.246),white),
                         oval("Paw",(x,y+.08,.105),(.117,.162,.072),ivory)])
        lion.extend([oval("Whisker pad",(side*.085,.867,1.205),(.083,.084,.072),white),
                     oval("Eye",(side*.161,.85,1.319),(.032,.025,.024),amber),
                     oval("Ear",(side*.205,.582,1.518),(.058,.063,.078),white)])
        for j in range(13):
            a=j*pi/12
            x=side*(.06+.23*sin(a))
            z=1.28+.27*cos(a)
            lion.append(horn("Curl of mane",[(x,.65,z),(x*1.28,.54,z+.044),
                (x*1.32,.44,z-.007),(x*1.22,.42,z-.08)],
                [.071,.062,.038,.002],teal))
    # Lotus-shaped woven travel seat, flared sleeves, six palms and three faces under the rattan hat.
    lion.extend([oval("Saddle cloth",(0,-.10,1.24),(.34,.40,.105),gold),
                 loft("Gathered brocade",[(1.24,.32,.25,0,-.09),(1.35,.28,.21,0,-.09),
                    (1.50,.20,.16,0,-.09),(1.63,.25,.155,0,-.09),(1.79,.28,.15,0,-.09),
                    (1.86,.12,.11,0,-.09)],red,40,.02)])
    for i,col in [(-1,teal),(0,white),(1,red)]:
        x=i*.145;y=-.012-.045*abs(i)
        lion.append(oval("Protector face",(x,y,1.954),(.095,.10,.117),col))
        for hand in (-1,1):
            lion.append(oval("Alert eye",(x+hand*.04,y+.085,1.984),(.022,.014,.015),coal))
        lion.append(oval("Third eye",(x,y+.085,2.014),(.012,.009,.019),gold))
        lion.append(oval("Nose",(x,y+.10,1.959),(.020,.024,.029),col))
    lion.append(loft("Rattan hat",[(2.038,.34,.267,0,-.055),(2.064,.37,.29,0,-.055),
            (2.104,.254,.202,0,-.055),(2.188,.122,.105,0,-.055),(2.216,.018,.015,0,-.055)],gold,48,.006))
    for side in (-1,1):
        for j in range(3):
            z=1.68+j*.056
            wrist=(side*(.46+j*.028),-.055+j*.039,1.61+j*.171)
            lion.append(horn("Curved sleeve",[(side*.19,-.095,z),(side*.32,-.12,z+(.02*j-.06)),wrist],
                       [.085,.072,.047],slate))
            lion.append(oval("Palm",wrist,(.046,.033,.060),white))
    export(combine("Pehar",lion))

    # Invented drought spirit: an ochre sandstone body and a fan of cracked clay scales.
    spirit=[loft("Dust vortex",[(.04,.03,.04,0,0),(.23,.16,.14,0,0),(.52,.25,.21,.04,.01),
           (.77,.17,.16,.02,0),(.98,.24,.22,0,0),(1.16,.29,.19,0,0),(1.28,.13,.13,0,0)],wool,34,.041),
           oval("Clay mask",(0,.03,1.38),(.16,.123,.176),red)]
    for side in (-1,1):
        spirit.append(oval("Dry amber eye",(side*.069,.141,1.42),(.032,.016,.022),amber))
        for j in range(6):
            x=side*(.09+j*.041); z=1.39-.053*j
            spirit.append(horn("Cracked crest",[(x,.012,z),(x*1.19,-.045,z+.12),(x*1.65,-.084,z+.30)],
                   [.052,.034,.001],gold))
        spirit.append(horn("Wind-torn limb",[(side*.17,0,1.12),(side*.33,-.01,.968),
                  (side*.445,.044,.86),(side*.52,.14,.94)],[.084,.076,.05,.003],red))
    export(combine("DroughtSpirit",spirit))

    def woman(name,mantle,trim):
        pieces=torso(mantle,trim,red,False)+head(skin,coal)+arm(-1,mantle,trim,skin)+arm(1,mantle,trim,skin)
        pieces+=tall_boot(-.12,wool,coal)+tall_boot(.12,wool,coal)
        pieces.append(oval("Hair dressed high",(0,-.027,1.669),(.086,.084,.067),coal))
        for side in (-1,1):
            for i in range(11):
                z=1.61-i*.041
                pieces.append(oval("Braided lock",(side*(.074+.014*cos(i)),.014+.04*sin(i*.12),z),
                    (.020,.021,.035),coal))
                if i in (4,9):pieces.append(oval("Turquoise braid bead",(side*.078,.035,z),(.024,.023,.011),teal))
            pieces.append(oval("Gilt earring",(side*.091,-.005,1.55),(.012,.007,.030),gold))
        pieces.append(cord("Shoulder shawl",[(-.18,-.039,1.36),(-.14,.096,1.34),(-.05,.151,1.23),
            (.12,.14,1.07),(.17,.054,1.02)],.041,trim))
        if name=="Tenma":
            for j in range(7):
                a=(j-3)*.34
                pieces.append(horn("Oath diadem",[(.104*sin(a),.075*cos(a),1.651),
                     (.122*sin(a),.093*cos(a),1.69),(.132*sin(a),.086*cos(a),1.745+.013*cos(j))],
                     [.026,.019,.002],gold))
        export(combine(name,pieces))
    woman("Tsogyal",red,gold)
    woman("Tenma",slate,teal)

if __name__=="__main__":
    build()
