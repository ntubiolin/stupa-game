"""Build the playable householder and the residents used by the native quest cast."""
from math import cos, pi, sin, tau
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_figures import JOINTS, bpy, combine, cord, export, head, loft, mesh, oval, surface


def mantle(name, material, bottom, top, width=.239):
    """A continuous asymmetrical sheet over the left shoulder, visible from front and back."""
    pieces, faces = [], []
    count = 72
    for j in range(11):
        t = min(j,8) / 8
        for i in range(count):
            angle = tau * i / count
            left = (1 - cos(angle)) / 2
            high = top[0] + (top[1] - top[0]) * left
            low = bottom[0] + (bottom[1] - bottom[0]) * left
            z = low + t * (high - low)
            hem = (1 - t) * .014
            fold = .011 * sin(10 * angle + 2 * t) + .003 * sin(21 * angle - t)
            shoulder = 1 - .26 * max(0, (z - 1.35) / .13)
            if j > 8:
                # The fabric turns inward across the shoulder to sit against the neckline.
                shoulder *= 1 - .16*(j-8)
                z -= .006*(j-8)
            pieces.append(((width * shoulder + fold + hem) * cos(angle),
                           (.174 * shoulder + fold + hem) * sin(angle) - .009, z))
            if j < 10:
                a, b = j * count + i, j * count + (i + 1) % count
                faces.append((a, b, b + count, a + count))
    return mesh(name, pieces, faces, material)


def tied_hair(dark, high=False):
    hair = [oval("Parted hair", (0, -.031, 1.661), (.090,.076,.048), dark)]
    if high:
        hair.append(oval("Tied hair at nape", (0,-.079,1.661), (.063,.051,.061),dark))
        hair.append(oval("Yogin's coil", (.004,-.066,1.708), (.055,.055,.048),dark))
        for i in range(5):
            x = (i-2)*.020
            hair.append(cord("Swept lock",[(x*.60,.047,1.666),(x,.025,1.693),
                (x*1.18,-.027,1.708),(x*.78,-.068,1.694)],.0035,dark))
    return hair


def face(skin, dark):
    pieces = head(skin,dark)
    pieces.append(loft("Neck",[(1.388,.057,.052,0,-.004),(1.459,.053,.050,0,-.002),
        (1.517,.047,.047,0,.001)],skin,32))
    for side in (-1,1):
        pieces.append(oval("Dark iris",(side*.033,.064,1.605),(.008,.005,.0048),dark))
    return pieces


def clothes(body, facing, sash, long=False):
    skirt = [(.10,.262,.173,0,-.004),(.15,.268,.178,0,-.004),(.48,.238,.156,0,-.005),
             (.76,.229,.151,0,-.006)] if long else [
             (.62,.264,.170,0,-.005),(.66,.262,.170,0,-.006),(.79,.242,.167,0,-.008)]
    pieces = [loft("Woven body and folded hem",skirt+[(.979,.187,.131,0,-.006),
        (1.032,.188,.135,0,-.007),(1.13,.198,.140,0,-.010),(1.265,.214,.14,0,-.006),
        (1.352,.198,.121,0,-.004),(1.397,.112,.080,0,.003),(1.418,.055,.052,0,.004)],body,56,.011)]
    if not long:
        pieces.append(band("Cloth girdle",.96,.204,.149,.074,sash))
    # A single overlapping placket follows the front of the shirt to the right waist.
    points = [(-.043,.052,1.419),(-.045,.099,1.383),(-.013,.130,1.343),
              (.036,.143,1.291),(.088,.134,1.248),(.133,.112,1.188)]
    pieces.append(cord("Overlap seam",points,.007,facing))
    return pieces


def legs(x, trousers, leather):
    return [loft("Tapered trouser",[(.25,.050,.061,x,0),(.306,.052,.061,x,0),(.322,.066,.076,x,0),(.42,.074,.081,x,0),
        (.53,.087,.087,x,-.004),(.67,.097,.099,x,-.004),(.86,.095,.093,x,0)],trousers,36,.005),
        loft("Worn leather shoe",[(.014,.065,.125,x,.046),(.035,.073,.134,x,.042),
        (.065,.074,.129,x,.038),(.088,.064,.104,x,.024),(.138,.058,.073,x,.006),
        (.265,.065,.073,x,0),(.296,.073,.080,x,0),(.310,.072,.080,x,0)],leather,36,.002)]


def band(name, z, width, depth, height, material):
    return loft(name, [(z,width,depth,0,-.006), (z+height,width+.001,depth+.001,0,-.006)],material,48)


def travel_sleeve(side, cloth, cuff, skin):
    x = side * .23
    parts = [loft("Sleeve with elbow and gathered wrist",[(.899,.049,.052,x+side*.054,.029),
        (.929,.059,.059,x+side*.055,.021),(1.03,.063,.071,x+side*.057,.003),
        (1.14,.073,.071,x+side*.048,-.018),(1.27,.080,.078,x+side*.021,-.012),
        (1.351,.072,.077,x-side*.007,0),(1.393,.042,.048,x-side*.021,-.011)],cloth,36,.006),
        loft("Folded cuff",[(.868,.050,.054,x+side*.053,.032),
        (.908,.055,.057,x+side*.054,.028)],cuff,36),
        oval("Resting hand",(x+side*.053,.032,.841),(.030,.024,.054),skin),
        oval("Thumb",(x+side*.033,.048,.852),(.012,.012,.028),skin)]
    return parts


def forearm(side, skin, vest):
    x = side * .23
    return [loft("Capped shoulder", [(1.23,.066,.068,x+side*.018,0),
        (1.29,.084,.084,x,0), (1.36,.069,.069,x-side*.01,-.006),
        (1.40,.036,.041,x-side*.024,-.009)],vest,28,.004),
        loft("Exposed arm", [(.85,.032,.035,x+side*.048,.027),(.99,.049,.051,x+side*.055,.008),
        (1.11,.051,.058,x+side*.049,-.013),(1.245,.060,.064,x+side*.019,0)], skin,28),
        oval("Hand", (x+side*.047,.029,.818),(.032,.028,.058),skin),
        oval("Thumb",(x+side*.025,.048,.831),(.013,.014,.031),skin)]


def build_people():
    linen = surface("PilgrimUndyedCotton", (.57,.50,.35))
    shawl = surface("PilgrimChalkShawl", (.91,.85,.70))
    indigo = surface("PilgrimIndigo", (.046,.105,.146))
    cinnabar = surface("PilgrimWovenBrick", (.39,.096,.052))
    ochre = surface("PeopleWovenOchre", (.66,.37,.092))
    skin = surface("PeopleSkin", (.40,.215,.13))
    dark = surface("PeopleHair", (.038,.025,.020))
    grey = surface("VillageSilverHair", (.28,.24,.19))
    boot = surface("PilgrimBootLeather", (.091,.052,.031))
    maroon = surface("LamaLowerMaroon", (.22,.026,.040))
    burgundy = surface("LamaWineDrape", (.41,.038,.055))
    under = surface("LamaOchreVest", (.66,.30,.056))
    moss = surface("HerderWool", (.13,.19,.125))
    blue = surface("EnvoyBlue", (.081,.20,.28))
    clay = surface("VillageClay", (.39,.205,.11))
    plum = surface("KingPlum", (.24,.084,.19))

    pilgrim = clothes(linen,indigo,cinnabar) + face(skin,dark) + tied_hair(dark,True)
    pilgrim.append(mantle("Folded cotton shoulder cloth",shawl,(.91,1.25),(1.13,1.425)))
    for z in (.969, .990, 1.023):
        pilgrim.append(band("Woven kera stripe",z,.206,.151,.006,ochre))
    for i in range(23):
        a = i*pi/22
        pilgrim.append(oval("Wooden mala bead",(.080*cos(a),.11+.073*sin(a),1.399-.167*sin(a)),
            (.0065,.007,.0075),boot))
    pilgrim.append(oval("Walking pouch",(.169,-.089,.915),(.078,.063,.097),boot))
    for label,side in (("Left",-1),("Right",1)):
        for suffix,parts in (("Leg",legs(side*.12,indigo,boot)),("Sleeve",travel_sleeve(side,linen,indigo,skin))):
            name = "Pilgrim" + label + suffix
            export(combine(name,parts,JOINTS[name]))
    export(combine("Pilgrim",pilgrim))

    monastic = clothes(maroon,under,maroon,long=True) + face(skin,dark)
    monastic.append(mantle("Everyday zen",burgundy,(.73,1.17),(1.115,1.424)))
    for side in (-1,1):
        monastic += forearm(side,skin,under) + legs(side*.105,maroon,boot)
    export(combine("Guide",monastic))

    def resident(coat, trim, hairstyle):
        parts = clothes(coat,trim,trim) + face(skin,dark) + hairstyle
        for side in (-1,1):
            parts += travel_sleeve(side,coat,trim,skin) + legs(side*.12,indigo,boot)
        return parts

    elder = resident(clay,linen,tied_hair(grey))
    elder.append(oval("Village elder beard",(0,.054,1.523),(.056,.030,.050),grey))
    elder.append(mantle("Folded shawl",linen,(1.05,1.32),(1.13,1.43)))
    export(combine("VillageElder",elder))

    bearer = resident(indigo,cinnabar,tied_hair(dark))
    bearer.append(loft("Cloth headwrap",[(1.629,.093,.090,0,-.012),
        (1.665,.105,.093,0,-.016),(1.72,.051,.066,0,-.023)],linen,36,.009))
    # A strapped palm-leaf scripture bundle across the back distinguishes the escort.
    for i in range(4):
        bearer.append(oval("Wrapped scripture folio",(0,-.147,1.16+.018*i),(.18,.064,.018),ochre))
    bearer.append(cord("Bearer sling",[(-.155,-.158,1.15),(-.195,-.056,1.33),(-.15,.071,1.39),
        (.12,.151,1.08),(.18,-.08,1.07),(.15,-.179,1.16)],.015,boot))
    export(combine("ScriptureBearer",bearer))

    herder = resident(moss,boot,tied_hair(dark))
    herder.append(mantle("Wool shoulder cloth",clay,(.93,1.18),(1.14,1.42)))
    herder.append(cord("Walking staff",[(.34,.055,.01),(.325,.033,.83),(.34,.039,1.40)],.017,boot))
    export(combine("Herder",herder))

    envoy = resident(blue,ochre,tied_hair(dark))
    envoy.append(loft("Envoy cap",[(1.634,.094,.088,0,-.015),(1.674,.106,.092,0,-.018),
        (1.73,.070,.066,0,-.031),(1.754,.031,.028,0,-.033)],indigo,32,.004))
    export(combine("Envoy",envoy))

    king = resident(plum,ochre,tied_hair(dark))
    king.append(mantle("Court mantle",blue,(.74,1.13),(1.045,1.422)))
    king.append(loft("Wrapped royal headdress",[(1.625,.094,.090,0,-.014),
        (1.656,.119,.113,0,-.018),(1.70,.098,.099,0,-.025),
        (1.764,.088,.085,0,-.02),(1.796,.044,.038,0,-.014)],linen,40,.005))
    king.append(band("Headdress trim",1.662,.119,.112,.011,ochre))
    export(combine("King",king))

    guru = resident(burgundy,ochre,tied_hair(dark))
    guru.append(mantle("Teacher's mantle",under,(.76,1.17),(1.115,1.423)))
    guru.append(loft("Lotus cap",[(1.635,.105,.099,0,-.008),(1.668,.14,.117,0,-.016),
        (1.72,.103,.086,0,-.01),(1.805,.034,.043,0,-.026),(1.822,.013,.020,0,-.036)],cinnabar,40,.005))
    for side in (-1,1):
        guru.append(oval("Lotus cap petal",(side*.096,.01,1.685),(.032,.102,.052),ochre))
    export(combine("GuruVision",guru))


if __name__ == "__main__":
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build_people()
