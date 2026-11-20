"""Original Northern Wilderness cast, based on the silhouettes in src/gameplay/enemies.js."""
from math import cos, sin, tau
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_figures import beast, bpy, combine, cord, export, horn, loft, oval, surface


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mist = surface("PretaJade", (.11, .53, .46), .35)
    gold = surface("TsenGilt", (.80, .43, .085), .35)
    coal = surface("TsenEbony", (.037, .022, .027))
    rust = surface("TsenSteed", (.26, .045, .026))
    red = surface("TsenLacquer", (.55, .045, .042), .42)
    ice = surface("MigoiIce", (.22, .70, .88), .25)
    pieces = [oval("Spirit belly", (0,0,.74), (.46,.42,.47), mist),
              oval("Luminous heart", (0,.37,.63), (.11,.065,.12), gold)]
    orbit = [(.40*cos(i*tau/32), .34*sin(i*tau/32), 1.22+.073*cos(i*tau/32)) for i in range(33)]
    pieces.append(cord("Canted gold circlet", orbit, .023, gold))
    for side in (-1, 1):
        pieces += [oval("Amber eye", (side*.16,.37,.85), (.085,.055,.10), gold),
                   oval("Obsidian pupil", (side*.16,.416,.85), (.036,.017,.052), coal),
                   horn("Wispy ear", [(side*.27,0,.96),(side*.35,-.015,1.18),(side*.42,0,1.43)], [.12,.075,.002],mist),
                   oval("Trailing drop", (side*.18,-.06,.22), (.065,.07,.15), mist)]
    export(combine("Preta", pieces))

    horse = [oval("Horse barrel", (0,0,1.04), (.34,.63,.33), rust),
             horn("Arched neck", [(0,.34,1.10),(0,.53,1.42),(0,.54,1.68)], [.22,.19,.12],rust),
             oval("Horse forehead", (0,.57,1.68), (.14,.22,.16), rust),
             oval("Horse muzzle", (0,.78,1.61), (.12,.18,.11), coal),
             horn("Tail", [(0,-.48,1.17),(0,-.68,1.02),(0,-.78,.64)], [.07,.092,.026], coal),
             loft("Rider cuirass", [(1.27,.23,.16,0,-.05),(1.60,.205,.17,0,-.05),(1.81,.29,.17,0,-.03),
                                    (1.86,.13,.12,0,-.03)], red),
             oval("Rider helmet", (0,-.025,2.035),(.153,.145,.17),red),
             oval("Gilt visor", (0,.108,2.04), (.11,.035,.052),gold),
             horn("Helmet plume", [(0,-.03,2.14),(0,-.10,2.30),(0,-.26,2.36)], [.07,.05,.004], gold)]
    for side in (-1, 1):
        x=side*.22
        for fore in (-.37,.36):
            horse += [horn("Horse leg",[(x,fore,.98),(x,fore-.04,.53),(x,fore+.015,.15)], [.11,.07,.049],rust),
                      oval("Hoof",(x,fore+.035,.09),(.082,.105,.076),coal)]
        horse += [horn("Ear", [(side*.085,.51,1.77),(side*.105,.51,1.97)],[.055,.003],rust),
                  oval("Horse eye",(side*.116,.67,1.72),(.024,.025,.025),gold),
                  oval("Spaulder",(side*.23,-.03,1.76),(.14,.15,.105),gold),
                  horn("Gauntlet",[(side*.23,-.035,1.72),(side*.37,.10,1.48),(side*.35,.23,1.54)], [.095,.08,.065],red),
                  horn("Riding boot",[(side*.23,-.07,1.39),(side*.34,.06,1.12),(side*.35,-.005,.87)], [.11,.09,.073],coal)]
    horse += [cord("Lance staff",[(.35,.20,.58),(.35,.26,2.26)],.023,coal),
              horn("Gilt finial",[(.35,.26,2.25),(.35,.27,2.35),(.35,.29,2.60)],[.025,.071,.002],gold)]
    export(combine("TsenRider",horse))

    fur = surface("MigoiWhiteFur",(.68,.72,.73))
    mane = surface("MigoiSlateMane",(.24,.27,.29))
    def migoi():
        return beast(False,fur,mane,coal,ice,gold)
    export(combine("SnowMigoi",migoi()))
    king = migoi()
    for i in range(7):
        a = tau*i/7
        x,y=.163*cos(a),.13*sin(a)+.02
        king.append(horn("Hoarfrost crown",[(x,y,1.94),(x*1.14,y,2.04),(x*1.36,y,2.17+.08*cos(a))],
                         [.053,.044,.002],ice))
    export(combine("SnowKing",king))


if __name__ == "__main__":
    build()
