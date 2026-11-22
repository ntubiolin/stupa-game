"""Build the playable Ngakpa householder yogin and the residents used by the native quest cast."""
from math import cos, pi, sin, tau
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_figures import (
    JOINTS, box_part, bpy, combine, cord, export, head, horn, loft, mesh, oval, surface, vajra_scepter
)


def mantle(name, material, bottom, top, width=.218, stripe=None):
    """A continuous asymmetrical woven shawl/zen over the left shoulder, visible from front and back."""
    pieces, faces, row_ids = [], [], []
    count = 72
    for j in range(11):
        t = min(j, 8) / 8
        for i in range(count):
            angle = tau * i / count
            left = (1 - cos(angle)) / 2
            high = top[0] + (top[1] - top[0]) * left
            low = bottom[0] + (bottom[1] - bottom[0]) * left
            z = low + t * (high - low)
            hem = (1 - t) * .014
            fold = .012 * sin(11 * angle + 2.2 * t) + .004 * sin(21 * angle - t)
            shoulder = 1 - .28 * max(0, (z - 1.34) / .13)
            if j > 8:
                shoulder *= 1 - .16 * (j - 8)
                z -= .006 * (j - 8)
            pieces.append(((width * shoulder + fold + hem) * cos(angle),
                           (.158 * shoulder + fold + hem) * sin(angle) - .007, z))
            if j < 10:
                a, b = j * count + i, j * count + (i + 1) % count
                faces.append((a, b, b + count, a + count))
                row_ids.append(j)
    obj = mesh(name, pieces, faces, material)
    if stripe:
        stripe_mat, r0, r1 = stripe
        obj.data.materials.append(stripe_mat)
        for poly, r in zip(obj.data.polygons, row_ids):
            if r0 <= r < r1:
                poly.material_index = 1
    return obj


def tied_hair(dark, high=False, cord_mat=None):
    hair = [
        oval("Crown hair", (0, -.016, 1.656), (.101, .103, .068), dark),
        oval("Nape hair", (0, -.068, 1.608), (.078, .056, .062), dark),
    ]
    if high:
        # Authentic Himalayan Ngakpa yogin coiled ralpa topknot bound with crimson/turquoise cord
        hair.append(oval("Yogin topknot base", (0, -.042, 1.716), (.058, .058, .042), dark))
        hair.append(oval("Yogin topknot crown", (0, -.045, 1.752), (.044, .045, .036), dark))
        if cord_mat:
            hair.append(loft("Topknot cord", [
                (1.706, .056, .056, 0, -.042), (1.720, .058, .058, 0, -.042)
            ], cord_mat, 24))
        for i in range(5):
            x = (i - 2) * .022
            hair.append(cord("Swept lock", [
                (x * .62, .054, 1.668), (x, .022, 1.702),
                (x * 1.12, -.028, 1.718), (x * .72, -.065, 1.696)
            ], .004, dark))
    return hair


def face(skin, dark, brow_mat=None):
    pieces = head(skin, dark)
    if brow_mat:
        for side in (-1, 1):
            pieces.append(cord("Aged brow", [(x * side, y, z) for x, y, z in
                [(.016, .091, 1.630), (.036, .095, 1.635), (.060, .082, 1.628)]], .0036, brow_mat))
    pieces.append(loft("Neck", [
        (1.402, .058, .054, 0, -.003), (1.462, .054, .051, 0, -.001),
        (1.518, .050, .049, 0, .002)
    ], skin, 32))
    return pieces


def clothes(body, facing, sash, long=False):
    skirt = [(.08, .248, .168, 0, -.004), (.15, .254, .172, 0, -.004), (.48, .226, .152, 0, -.005),
             (.76, .212, .144, 0, -.005)] if long else [
             (.60, .238, .162, 0, -.005), (.66, .234, .160, 0, -.006), (.79, .218, .152, 0, -.007)]
    pieces = [loft("Woven body and pleated hem", skirt + [
        (.965, .176, .126, 0, -.005),
        (1.028, .178, .130, 0, -.006),
        (1.135, .186, .135, 0, -.008),
        (1.265, .198, .134, 0, -.005),
        (1.355, .176, .112, 0, -.002),
        (1.405, .102, .076, 0, .003),
        (1.430, .058, .054, 0, .004),
    ], body, 56, .013)]
    if not long:
        pieces.append(band("Cloth kera girdle", .952, .188, .138, .076, sash))
    points = [(-.045, .056, 1.422), (-.046, .104, 1.385), (-.010, .134, 1.340),
              (.042, .142, 1.285), (.095, .132, 1.238), (.138, .110, 1.175)]
    pieces.append(cord("Overlap lapel trim", points, .009, facing))
    return pieces


def legs(x, trousers, leather, garter=None):
    felt = garter or trousers
    return [
        loft("Tapered trouser", [
            (.25, .048, .056, x, 0), (.31, .052, .058, x, 0), (.34, .064, .072, x, 0),
            (.44, .070, .076, x, 0), (.56, .074, .078, x, -.003),
            (.68, .068, .072, x, -.003), (.84, .054, .058, x, 0)
        ], trousers, 36, .004),
        loft("Traditional lham boot", [
            (.012, .062, .122, x, .044), (.036, .069, .132, x, .042),
            (.068, .069, .124, x, .036), (.095, .060, .098, x, .022),
            (.145, .055, .069, x, .006), (.275, .061, .069, x, 0),
            (.312, .068, .075, x, 0), (.328, .067, .075, x, 0)
        ], leather, 36, .002),
        loft("Woven boot garter", [
            (.278, .064, .072, x, 0), (.305, .070, .077, x, 0)
        ], felt, 32),
    ]


def pilgrim_thigh(x, trousers):
    """Upper leg from hip (z=.84) to knee pivot (z=.47) with a smooth rounded patella cap."""
    return [
        loft("Upper thigh trouser", [
            (.468, .068, .074, x, 0), (.53, .071, .076, x, -.002),
            (.62, .066, .069, x, -.002), (.73, .054, .056, x, -.001),
            (.84, .044, .046, x, 0)
        ], trousers, 36, .003),
        oval("Knee joint", (x, 0, .47), (.068, .074, .068), trousers),
    ]


def pilgrim_calf(x, trousers, leather, garter=None):
    """Lower leg from knee pivot (z=.47) down through tapered trouser, woven garter, and traditional lham boot."""
    felt = garter or trousers
    return [
        loft("Lower calf trouser", [
            (.25, .048, .056, x, 0), (.31, .052, .058, x, 0), (.34, .064, .072, x, 0),
            (.42, .069, .075, x, 0), (.47, .0675, .0735, x, 0), (.492, .060, .065, x, 0)
        ], trousers, 36, .003),
        loft("Traditional lham boot", [
            (.012, .062, .122, x, .044), (.036, .069, .132, x, .042),
            (.068, .069, .124, x, .036), (.095, .060, .098, x, .022),
            (.145, .055, .069, x, .006), (.275, .061, .069, x, 0),
            (.312, .068, .075, x, 0), (.328, .067, .075, x, 0)
        ], leather, 36, .002),
        loft("Woven boot garter", [
            (.278, .064, .072, x, 0), (.305, .070, .077, x, 0)
        ], felt, 32),
    ]


def band(name, z, width, depth, height, material):
    return loft(name, [(z, width, depth, 0, -.005), (z + height, width + .001, depth + .001, 0, -.005)], material, 48)


def travel_sleeve(side, cloth, cuff, skin):
    x = side * .21
    parts = [
        loft("Draped chuba sleeve", [
            (.895, .046, .050, x + side * .048, .028),
            (.930, .056, .058, x + side * .049, .020),
            (1.035, .062, .068, x + side * .048, .004),
            (1.145, .068, .068, x + side * .038, -.014),
            (1.270, .071, .070, x + side * .018, -.010),
            (1.352, .062, .066, x - side * .006, 0),
            (1.396, .040, .045, x - side * .018, -.009),
        ], cloth, 36, .007),
        loft("Turned cuff", [
            (.865, .048, .052, x + side * .048, .031),
            (.906, .053, .056, x + side * .049, .027),
        ], cuff, 36),
        oval("Resting hand", (x + side * .048, .031, .838), (.028, .022, .050), skin),
        oval("Thumb", (x + side * .030, .045, .850), (.011, .011, .026), skin),
    ]
    return parts


def forearm(side, skin, vest, trim=None):
    x = side * .205
    wing = trim or vest
    return [
        # Authentic Tibetan monastic dhonka winged shoulder lapel
        loft("Monastic dhonka shoulder wing", [
            (1.235, .062, .064, x + side * .016, 0),
            (1.305, .082, .080, x + side * .010, 0),
            (1.368, .074, .072, x - side * .006, -.004),
            (1.408, .038, .042, x - side * .022, -.008),
        ], vest, 28, .005),
        loft("Dhonka wing piping", [
            (1.298, .085, .083, x + side * .010, 0),
            (1.318, .086, .084, x + side * .010, 0),
        ], wing, 28),
        loft("Exposed monastic arm", [
            (.855, .031, .034, x + side * .044, .026),
            (.995, .046, .048, x + side * .048, .008),
            (1.115, .049, .054, x + side * .042, -.011),
            (1.245, .056, .060, x + side * .016, 0),
        ], skin, 28),
        oval("Hand", (x + side * .044, .028, .820), (.029, .025, .054), skin),
        oval("Thumb", (x + side * .024, .045, .833), (.012, .012, .028), skin),
    ]


def build_people():
    # Woven Himalayan textiles (preserving exact material names verified by QA/render_people.py)
    linen = surface("PilgrimUndyedCotton", (.62, .54, .39), .86, weave=.08)
    shawl = surface("PilgrimChalkShawl", (.93, .89, .79), .84, weave=.07)
    indigo = surface("PilgrimIndigo", (.048, .118, .185), .82, weave=.07)
    cinnabar = surface("PilgrimWovenBrick", (.48, .082, .048), .80, weave=.08)
    ochre = surface("PeopleWovenOchre", (.74, .44, .095), .76, weave=.07)
    skin = surface("PeopleSkin", (.44, .245, .152), .68)
    dark = surface("PeopleHair", (.036, .024, .020), .75)
    grey = surface("VillageSilverHair", (.52, .49, .44), .78)
    boot = surface("PilgrimBootLeather", (.11, .062, .036), .68)
    maroon = surface("LamaLowerMaroon", (.26, .028, .038), .84, weave=.08)
    burgundy = surface("LamaWineDrape", (.46, .042, .054), .80, weave=.08)
    under = surface("LamaOchreVest", (.76, .38, .052), .74, weave=.07)
    moss = surface("HerderWool", (.14, .22, .14), .88, weave=.09)
    blue = surface("EnvoyBlue", (.072, .23, .34), .74, weave=.07)
    clay = surface("VillageClay", (.44, .21, .105), .84, weave=.08)
    plum = surface("KingPlum", (.29, .072, .22), .68, weave=.07)
    turquoise = surface("SacredTurquoise", (.06, .52, .48), .34, metal=.15)
    gold = surface("SacredGold", (.82, .56, .14), .32, metal=.78)
    pure_halo = surface("PureVisionHalo", (.95, .68, .18), .25, metal=.55, emit=1.15)

    # 1. Playable Pilgrim: Himalayan Ngakpa White-Robed Yogin (red-white-red striped zen shawl, mala, waist phurba)
    pilgrim = clothes(linen, indigo, cinnabar) + face(skin, dark) + tied_hair(dark, True, cinnabar)
    # Ngakpa red-white-red meditation zen shawl: single woven mesh with crimson borders + central white band
    pilgrim.append(mantle("Ngakpa red-white-red zen", cinnabar, (.89, 1.26), (1.12, 1.43), .204, stripe=(shawl, 2, 7)))
    for z, mat in ((.965, ochre), (.986, turquoise), (1.012, ochre)):
        pilgrim.append(band("Woven kera stripe", z, .191, .141, .008, mat))
    # 108-bead bodhi mala with turquoise guru bead
    for i in range(25):
        a = i * pi / 24
        m_mat = turquoise if i in (0, 12, 24) else boot
        r_scale = 1.35 if i == 12 else 1.0
        pilgrim.append(oval("Mala bead", (.084 * cos(a), .118 + .068 * sin(a), 1.402 - .175 * sin(a)),
            (.0065 * r_scale, .007 * r_scale, .0075 * r_scale), m_mat))
    # Ceremonial bronze Phurba tucked into right waist kera + leather tinder/amrita pouch
    pilgrim.append(horn("Waist phurba blade", [(-.178, .065, 1.04), (-.192, .085, .86)], [.016, .003], gold, 6))
    pilgrim.append(oval("Waist phurba hilt", (-.172, .058, 1.075), (.020, .020, .036), gold))
    pilgrim.append(oval("Walking pouch", (.162, -.082, .915), (.072, .058, .090), boot))
    pilgrim.append(oval("Pouch brass clasp", (.168, -.035, .935), (.018, .016, .018), gold))
    for label, side in (("Left", -1), ("Right", 1)):
        for suffix, parts in (
            ("Leg", pilgrim_thigh(side * .12, indigo)),
            ("Calf", pilgrim_calf(side * .12, indigo, boot, cinnabar)),
            ("Sleeve", travel_sleeve(side, linen, indigo, skin)),
        ):
            name = "Pilgrim" + label + suffix
            export(combine(name, parts, JOINTS[name]))
    export(combine("Pilgrim", pilgrim))

    # 2. Venerable Monastic Guide (Old Lama Lobsang / Palace Keeper / Abbot Śāntarakṣita)
    monastic = clothes(maroon, under, maroon, long=True) + face(skin, dark, grey)
    monastic.append(mantle("Pleated monastic chogu zen", burgundy, (.70, 1.18), (1.105, 1.428), .204))
    for i in range(21):
        a = i * pi / 20
        monastic.append(oval("Monastic mala", (.078 * cos(a), .112 + .062 * sin(a), 1.405 - .155 * sin(a)),
            (.006, .0065, .0065), boot))
    for side in (-1, 1):
        monastic += forearm(side, skin, under, burgundy) + legs(side * .105, maroon, boot, under)
    # Handheld copper-and-gold Mani Prayer Wheel in right hand
    monastic.append(cord("Prayer wheel spindle", [(.252, .035, .74), (.252, .035, .96)], .008, boot))
    monastic.append(loft("Prayer wheel drum", [
        (.89, .038, .038, .252, .035), (.96, .038, .038, .252, .035)
    ], gold, 24))
    monastic.append(horn("Prayer wheel finial", [(.252, .035, .96), (.252, .035, 1.00)], [.016, .002], gold, 10))
    export(combine("Guide", monastic))

    def resident(coat, trim, hairstyle, trouser_mat=None):
        tr = trouser_mat or indigo
        parts = clothes(coat, trim, trim) + face(skin, dark) + hairstyle
        for side in (-1, 1):
            parts += travel_sleeve(side, coat, trim, skin) + legs(side * .12, tr, boot, trim)
        return parts

    # 3. Pharping Village Elder (Newar/Himalayan elder with Dhaka cap, silver beard, turquoise gau & staff)
    elder = resident(clay, ochre, tied_hair(grey))
    elder.append(loft("Traditional Dhaka cap", [
        (1.635, .098, .102, 0, -.010), (1.685, .096, .100, 0, -.012), (1.718, .082, .088, .012, -.012)
    ], cinnabar, 36, .004))
    elder.append(band("Cap woven band", 1.638, .100, .104, .016, ochre))
    elder.append(oval("Full silver beard", (0, .076, 1.508), (.058, .038, .062), grey))
    elder.append(cord("Silver mustache", [(-.036, .092, 1.548), (0, .102, 1.555), (.036, .092, 1.548)], .007, grey))
    elder.append(mantle("Woven wool shawl", linen, (1.02, 1.32), (1.12, 1.43), .202))
    elder.append(box_part("Silver gau amulet", (0, .152, 1.24), (.048, .022, .058), gold))
    elder.append(oval("Gau turquoise stone", (0, .164, 1.24), (.016, .008, .020), turquoise))
    elder.append(cord("Carved elder staff", [(-.30, .06, .015), (-.28, .04, .82), (-.29, .05, 1.46)], .016, boot))
    export(combine("VillageElder", elder))

    # 4. Indian Scripture Bearer (Vajrakilaya Pecha Sutra Bundle wrapped in saffron silk & carved boards)
    bearer = resident(indigo, cinnabar, tied_hair(dark))
    bearer.append(loft("Indian travel turban", [
        (1.628, .100, .104, 0, -.010), (1.672, .114, .112, 0, -.014),
        (1.725, .092, .094, 0, -.018), (1.755, .042, .048, 0, -.020)
    ], linen, 40, .008))
    bearer.append(oval("Turban ruby pin", (0, .106, 1.685), (.016, .012, .022), cinnabar))
    # Authentic Pecha Sutra Bundle on back (wooden cover boards + saffron silk wrap + brass straps)
    bearer.append(box_part("Lower pecha wood board", (0, -.148, 1.15), (.38, .11, .022), cinnabar, (.12, 0, 0)))
    bearer.append(box_part("Saffron silk sutra folios", (0, -.158, 1.20), (.36, .10, .085), ochre, (.12, 0, 0)))
    bearer.append(box_part("Upper pecha wood board", (0, -.168, 1.25), (.38, .11, .022), cinnabar, (.12, 0, 0)))
    for sx in (-.11, .11):
        bearer.append(box_part("Brass sutra strap", (sx, -.158, 1.20), (.024, .122, .135), gold, (.12, 0, 0)))
    bearer.append(cord("Crossed leather sling", [
        (-.16, -.15, 1.14), (-.18, -.04, 1.38), (-.06, .148, 1.28),
        (.14, .128, 1.06), (.17, -.09, 1.08), (.15, -.16, 1.15)
    ], .014, boot))
    export(combine("ScriptureBearer", bearer))

    # 5. Yarlung Herder Dawa (Highland nomad sheepskin-trimmed lokpa chuba, coral braid & herding staff)
    herder = resident(moss, cinnabar, tied_hair(dark), boot)
    herder.append(loft("Sheepskin collar", [
        (1.36, .145, .118, 0, .005), (1.42, .112, .096, 0, .008)
    ], shawl, 32, .012))
    herder.append(band("Sheepskin hem trim", .60, .242, .166, .042, shawl))
    herder.append(mantle("Nomad wool cape", clay, (.92, 1.20), (1.13, 1.42), .204))
    herder.append(oval("Turquoise neck bead", (0, .142, 1.34), (.020, .015, .020), turquoise))
    herder.append(cord("Nomad herding staff", [(.32, .055, .015), (.31, .035, .84), (.32, .042, 1.54)], .018, boot))
    export(combine("Herder", herder))

    # 6. Tibetan Royal Envoy Ba Salnang (Brocade coat, domed Bonzhu official hat & white ceremonial Khata)
    envoy = resident(blue, ochre, tied_hair(dark))
    envoy.append(loft("Official domed bonzhu hat", [
        (1.632, .106, .108, 0, -.010), (1.668, .128, .126, 0, -.012),
        (1.720, .092, .092, 0, -.016), (1.768, .036, .036, 0, -.018)
    ], cinnabar, 36, .004))
    envoy.append(band("Hat brocade brim", 1.635, .126, .124, .024, gold))
    envoy.append(horn("Hat gilt finial", [(0, -.018, 1.768), (0, -.018, 1.825)], [.020, .003], gold, 10))
    # Ceremonial white silk Khata scarf draped across shoulders & chest
    envoy.append(cord("Ceremonial white khata", [
        (-.21, .06, .88), (-.19, .09, 1.18), (-.11, .13, 1.39),
        (0, .08, 1.44), (.11, .13, 1.39), (.19, .09, 1.18), (.21, .06, .88)
    ], .024, shawl, 3))
    export(combine("Envoy", envoy))

    # 7. Emperor Trisong Detsen (38th Tsenpo: tall crimson silk La-Thod royal turban, brocade robe, turquoise Sok-Kyi)
    king = clothes(plum, gold, gold, long=True) + face(skin, dark) + tied_hair(dark)
    for side in (-1, 1):
        king += travel_sleeve(side, plum, gold, skin) + legs(side * .11, indigo, boot, gold)
    king.append(mantle("Imperial turquoise-brocade lapel mantle", blue, (.72, 1.16), (1.06, 1.425), .208))
    king.append(band("Imperial golden girdle", .96, .188, .138, .055, gold))
    # Authentic 8th-century Tsenpo wrapped crimson silk turban ("La-Thod")
    king.append(loft("Crimson silk Tsenpo turban", [
        (1.628, .102, .104, 0, -.010), (1.665, .128, .124, 0, -.014),
        (1.725, .118, .115, 0, -.016), (1.788, .102, .100, 0, -.014),
        (1.835, .058, .056, 0, -.012)
    ], cinnabar, 44, .009))
    king.append(band("Turban golden diadem band", 1.660, .130, .126, .018, gold))
    king.append(oval("Turban sun jewel", (0, .118, 1.725), (.028, .016, .036), gold))
    king.append(oval("Turban turquoise center", (0, .130, 1.725), (.014, .010, .018), turquoise))
    # Long royal Tibetan turquoise ear-pendant ("Sok-Kyi") on left ear
    king.append(cord("Royal sok-kyi pendant", [(-.098, 0, 1.575), (-.102, .01, 1.46)], .008, turquoise))
    export(combine("King", king))

    # 8. Guru Padmasambhava — Pure Vision Manifestation (docs/padmasambhava-sources.md Section 1.3):
    # Sacred Lotus Pedestal, Za-ok Golden Cloak, Padma Thongdrol Lotus Hat with Sun-Moon & Feather,
    # Right-hand Vajra, Left-hand Kapala, Shoulder Khatvanga Trident, and Double Golden Mandala Back-Halo!
    # Strictly bounded within z in [0.01, 1.97] for QA/render_people.py!
    guru = clothes(burgundy, under, gold, long=True) + face(skin, dark) + tied_hair(dark)
    for side in (-1, 1):
        guru += travel_sleeve(side, burgundy, gold, skin) + legs(side * .105, indigo, boot, gold)
    # Sacred Lotus Pedestal Base beneath his feet (z = 0.01 .. 0.11)
    guru.append(loft("Pure Vision lotus pedestal", [
        (.012, .34, .34, 0, -.01), (.055, .38, .38, 0, -.01), (.095, .31, .31, 0, -.01)
    ], gold, 32, .015))
    for k in range(12):
        a = k * tau / 12
        guru.append(oval("Pedestal lotus petal", (.35 * cos(a), -.01 + .35 * sin(a), .052),
            (.065, .038, .038), cinnabar, (0, 0, a)))
    # Layered golden-brocade Za-ok royal cloak with saffron inner lapel (keeps LamaOchreVest material, zero Z-overlap!)
    guru.append(mantle("Za-ok golden brocade cloak", gold, (.52, 1.08), (1.14, 1.432), .212, stripe=(under, 7, 10)))
    # Iconic Padma Thongdrol Five-Petaled Lotus Hat + Upturned Lappets + Sun-Moon + Vulture Feather
    guru.append(loft("Padma Zhu lotus hat", [
        (1.632, .106, .108, 0, -.008), (1.672, .134, .128, 0, -.012),
        (1.735, .112, .106, 0, -.012), (1.805, .052, .054, 0, -.016), (1.842, .018, .018, 0, -.018)
    ], cinnabar, 40, .006))
    guru.append(band("Lotus hat golden rim", 1.648, .128, .122, .022, gold))
    for side in (-1, 1):
        guru.append(oval("Upturned lotus hat lappet", (side * .118, -.005, 1.705),
            (.032, .098, .068), under, (0, side * -.32, 0)))
    guru.append(oval("Sun-moon hat emblem", (0, .124, 1.712), (.026, .012, .028), pure_halo))
    guru.append(horn("Vulture feather finial", [
        (0, -.018, 1.842), (0, -.026, 1.885), (0, -.038, 1.918)
    ], [.016, .012, .002], pure_halo, 8))
    # Right hand (+X) Golden Vajra & Left hand (-X) Kapala Skullcup
    guru += vajra_scepter((.255, .065, .92), .52, gold)
    guru.append(loft("Kapala skullcup", [
        (.82, .018, .018, -.255, .055), (.855, .048, .048, -.255, .055), (.875, .052, .052, -.255, .055)
    ], shawl, 20))
    guru.append(oval("Kapala golden rim & amrita", (-.255, .055, .875), (.048, .048, .012), pure_halo))
    # Iconic Khatvanga Trident Staff crooked along left shoulder (z = 0.28 .. 1.90)
    guru.append(cord("Khatvanga staff", [(-.18, .04, .28), (-.25, .01, 1.15), (-.31, -.02, 1.75)], .012, gold))
    guru.append(oval("Khatvanga amrita vase", (-.295, -.015, 1.60), (.030, .030, .036), gold))
    guru.append(oval("Khatvanga skull emblem", (-.303, -.018, 1.68), (.024, .024, .028), shawl))
    guru.append(horn("Khatvanga center prong", [(-.31, -.02, 1.75), (-.325, -.025, 1.905)], [.014, .002], pure_halo, 8))
    for side in (-1, 1):
        guru.append(horn("Khatvanga side prong", [
            (-.31, -.02, 1.76), (-.31 + side * .052, -.02, 1.83), (-.32 + side * .036, -.025, 1.895)
        ], [.010, .009, .002], pure_halo, 8))
    # Luminous Double-Ringed Golden Mandala Back-Halo (z max = 1.905, cleanly framed in studio & UE!)
    outer_halo = [(.38 * cos(i * tau / 48), -.155, 1.525 + .38 * sin(i * tau / 48)) for i in range(49)]
    inner_halo = [(.26 * cos(i * tau / 40), -.145, 1.575 + .26 * sin(i * tau / 40)) for i in range(41)]
    body_halo = [(.48 * cos(i * tau / 48), -.175, 1.04 + .58 * sin(i * tau / 48)) for i in range(49)]
    guru.append(cord("Head mandala outer halo", outer_halo, .016, pure_halo, 3))
    guru.append(cord("Head mandala inner halo", inner_halo, .010, gold, 3))
    guru.append(cord("Body pure-vision aureole", body_halo, .014, pure_halo, 3))
    export(combine("GuruVision", guru))


if __name__ == "__main__":
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build_people()
