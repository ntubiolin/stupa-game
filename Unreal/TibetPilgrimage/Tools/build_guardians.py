"""Chapter bosses and Wisdom Dakini figures, sculpted after Himalayan iconography."""
from math import cos, pi, sin, tau
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_figures import (
    arm, box_part, bpy, combine, cord, export, head, horn, loft, oval, surface, tall_boot, torso
)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ivory = surface("Horn", (.86, .79, .66), .45)
    white = surface("SnowFur", (.91, .92, .95), .72, weave=.06)
    red = surface("Madder", (.54, .055, .042), .72, weave=.07)
    crimson = surface("DakiniCrimson", (.68, .085, .068), .68, weave=.07)
    gold = surface("Saffron", (.82, .55, .12), .30, metal=.78)
    coal = surface("DarkHair", (.033, .022, .018), .72)
    teal = surface("Turquoise", (.055, .54, .50), .32, metal=.16)
    frost_blue = surface("TenmaFrostSilk", (.48, .72, .88), .58, weave=.06)
    ice_glow = surface("TenmaIceCrystal", (.62, .88, .98), .22, metal=.25, emit=.45)
    skin = surface("Skin", (.44, .245, .152), .65)
    slate = surface("Slate", (.14, .15, .18), .68, weave=.05)
    obsidian = surface("ScorchedObsidian", (.09, .065, .055), .78)
    lava = surface("MoltenDrought", (.96, .34, .04), .28, emit=1.35)
    amber = surface("Amber", (.92, .52, .06), .25, emit=.85)
    wool = surface("Wool", (.18, .11, .07), .82)

    # 1. Pehar Gyalpo on White Snow Lion (Ch.4 Samye Boss):
    # Majestic white Snow Lion with lush turquoise curls, golden harness & lotus saddle;
    # Three-faced (turquoise, white, crimson), six-armed Pehar wearing wide rattan hat & wielding ritual weapons!
    lion = [
        oval("Haunch", (0, -.44, .84), (.38, .52, .39), white),
        oval("Barrel", (0, .10, .95), (.40, .72, .45), white),
        oval("Chest", (0, .48, 1.02), (.38, .38, .48), white),
        oval("Skull", (0, .68, 1.32), (.27, .31, .28), white),
        oval("Snout", (0, .94, 1.22), (.135, .11, .082), coal),
        # Gilded chest harness & collar bell
        cord("Snow lion gilt harness", [(-.36, .38, 1.08), (-.22, .78, .98), (0, .86, .94),
            (.22, .78, .98), (.36, .38, 1.08)], .022, gold),
        oval("Collar bell", (0, .88, .89), (.045, .045, .048), gold),
        cord("Turquoise tail plume", [(0, -.86, .98), (-.12, -1.16, 1.24), (-.18, -1.10, 1.56), (-.08, -.94, 1.62)], .058, teal),
    ]
    for side in (-1, 1):
        for y in (-.52, .44):
            x = side * .27
            lion.extend([
                oval("Muscular upper leg", (x, y, .66), (.14, .155, .30), white),
                oval("Pastern", (x, y + .025, .30), (.095, .102, .25), white),
                oval("Turquoise leg flame tuft", (x + side * .06, y - .08, .54), (.045, .085, .12), teal),
                oval("Clawed paw", (x, y + .085, .095), (.122, .168, .072), ivory),
            ])
        lion.extend([
            oval("Whisker pad", (side * .092, .91, 1.24), (.088, .088, .074), white),
            oval("Fierce golden eye", (side * .165, .88, 1.36), (.036, .028, .028), amber),
            oval("Turquoise brow flame", (side * .155, .86, 1.43), (.065, .035, .032), teal, (0, side * -.25, 0)),
            oval("Ear", (side * .215, .61, 1.55), (.062, .065, .085), teal),
        ])
        for j in range(15):
            a = j * pi / 14
            x = side * (.06 + .25 * sin(a))
            z = 1.31 + .29 * cos(a)
            lion.append(horn("Turquoise mane curl", [
                (x, .68, z), (x * 1.32, .56, z + .05), (x * 1.36, .45, z - .01), (x * 1.24, .42, z - .09)
            ], [.076, .065, .040, .004], teal))

    # Lotus saddle & Pehar's three faces, wide cane hat ("theb-zhu") & six armed implements
    lion.extend([
        oval("Brocade saddle cloth", (0, -.10, 1.26), (.38, .44, .11), gold),
        loft("Pehar royal brocade", [
            (1.26, .33, .26, 0, -.09), (1.38, .29, .22, 0, -.09),
            (1.54, .21, .17, 0, -.09), (1.68, .26, .165, 0, -.09),
            (1.82, .28, .16, 0, -.09), (1.90, .13, .12, 0, -.09)
        ], red, 40, .022),
        loft("Gilt mirror chestplate", [(1.60, .23, .175, 0, -.085), (1.72, .25, .175, 0, -.085)], gold, 32),
    ])
    for i, col in [(-1, teal), (0, white), (1, crimson)]:
        x = i * .152
        y = -.015 - .048 * abs(i)
        lion.append(oval("Protector face", (x, y, 1.98), (.098, .105, .122), col))
        for hand in (-1, 1):
            lion.append(oval("Wrathful eye", (x + hand * .042, y + .088, 2.01), (.022, .015, .016), amber))
        lion.append(oval("Third eye", (x, y + .090, 2.045), (.014, .010, .020), gold))
    # Wide woven bamboo/rattan lacquer hat crowned by crystal-gold vajra finial
    lion.append(loft("Woven rattan theb-zhu hat", [
        (2.065, .42, .34, 0, -.055), (2.095, .44, .36, 0, -.055),
        (2.145, .28, .23, 0, -.055), (2.225, .13, .11, 0, -.055), (2.265, .022, .020, 0, -.055)
    ], gold, 48, .008))
    lion.append(horn("Hat vajra finial", [(0, -.055, 2.265), (0, -.055, 2.38)], [.032, .004], teal, 10))
    for side in (-1, 1):
        for j in range(3):
            z = 1.70 + j * .06
            wrist = (side * (.48 + j * .04), -.04 + j * .05, 1.63 + j * .18)
            lion.append(horn("Six-arm brocade sleeve", [
                (side * .20, -.095, z), (side * .35, -.11, z + (.02 * j - .05)), wrist
            ], [.086, .072, .048], slate if j == 1 else red))
            lion.append(oval("Six-arm hand", wrist, (.045, .034, .056), white))
            # Ritual implements: upper sword / bow, middle arrow / club, lower razor / hook
            wx, wy, wz = wrist
            if j == 2 and side == 1:
                lion.append(horn("Wisdom sword blade", [(wx, wy, wz + .04), (wx + .06, wy + .04, wz + .48)], [.028, .003], ivory, 6))
            elif j == 2 and side == -1:
                bow_pts = [(wx - .08 * sin(t * pi), wy + .04, wz - .22 + .44 * t) for t in (0, .25, .5, .75, 1)]
                lion.append(cord("Ritual bow", bow_pts, .016, gold))
            elif j == 1:
                lion.append(cord("Ritual shaft", [(wx, wy, wz - .14), (wx + side * .04, wy + .08, wz + .26)], .014, gold))
    export(combine("Pehar", lion))

    # 2. Drought Spirit / Naga Scorched Colossus (Ch.1 Pharping Boss & Drought Sprites):
    # Coiled scorched-obsidian Naga serpent tail & torso with glowing molten cracks, spiny cobra hood & blazing horns!
    spirit = [
        # Coiled serpentine lower vortex + molten magma core cracks
        loft("Coiled scorched naga body", [
            (.03, .38, .36, 0, -.06), (.18, .34, .32, .03, -.03),
            (.42, .27, .24, -.02, 0), (.72, .22, .20, .02, .02),
            (1.02, .29, .23, 0, .02), (1.26, .34, .24, 0, .01), (1.42, .16, .15, 0, 0)
        ], obsidian, 40, .038),
        # Glowing molten drought core visible through cracked chest
        loft("Molten chest fissures", [
            (.82, .235, .212, 0, .025), (1.06, .302, .242, 0, .025), (1.22, .28, .22, 0, .02)
        ], lava, 24, .048),
        # Flared Naga cobra hood behind the scorched wrathful mask
        oval("Spiny Naga hood", (0, -.06, 1.56), (.42, .095, .36), crimson),
        oval("Charred drought mask", (0, .06, 1.54), (.165, .145, .185), obsidian),
    ]
    for side in (-1, 1):
        spirit.append(oval("Blazing drought eye", (side * .068, .185, 1.57), (.036, .020, .024), lava))
        spirit.append(horn("Scorched bull-naga horn", [
            (side * .11, .04, 1.68), (side * .26, -.02, 1.84), (side * .22, .06, 2.02)
        ], [.048, .034, .004], gold, 10))
        for j in range(6):
            a = .22 + j * .24
            spirit.append(horn("Hood flame spine", [
                (side * .34 * sin(a), -.06, 1.36 + .34 * cos(a)),
                (side * .52 * sin(a), -.10, 1.42 + .46 * cos(a)),
            ], [.036, .003], lava if j % 2 == 0 else gold, 8))
        # Four clawed drought arms with blazing molten talons
        for tier, z0 in enumerate((1.28, 1.06)):
            wx, wy, wz = side * (.48 + tier * .04), .22, z0 - .06
            spirit.append(horn("Clawed drought limb", [
                (side * .24, .02, z0), (side * (.42 + tier * .05), .08, z0 - .14),
                (wx, wy, wz)
            ], [.076, .058, .038], crimson if tier == 0 else obsidian, 10))
            spirit.append(oval("Molten claw palm", (wx, wy + .02, wz), (.045, .048, .038), obsidian))
            for c in (-1, 0, 1):
                spirit.append(horn("Ember talon", [
                    (wx + c * .022, wy + .05, wz), (wx + c * .028, wy + .14, wz - .04)
                ], [.014, .002], lava, 6))
    export(combine("DroughtSpirit", spirit))

    # 3. Wisdom Dakini Yeshe Tsogyal (Ch.5 Chimphu, z strictly in [0.01, 1.94])
    # & 4. Twelve Tenma Himalayan Snow Goddess (Ch.2 Mangyul Boss & Protector)
    def dakini_or_goddess(name, robe_mat, over_mat, trim_mat, is_tenma):
        pieces = (
            torso(robe_mat, trim_mat, gold, False)
            + head(skin, coal)
            + arm(-1, robe_mat, trim_mat, skin)
            + arm(1, robe_mat, trim_mat, skin)
            + tall_boot(-.11, slate, wool, trim_mat)
            + tall_boot(.11, slate, wool, trim_mat)
        )
        # Royal sleeveless Tibetan vest / pangden apron front
        pieces.append(loft("Brocade over-vest", [
            (.98, .184, .134, 0, -.004), (1.24, .208, .140, 0, -.003), (1.38, .165, .108, 0, .002)
        ], over_mat, 40, .010))
        pieces.append(oval("Hair dressed high", (0, -.022, 1.672), (.100, .102, .072), coal))
        # Twin raven braids studded with Turquoise & coral beads (preserving "Turquoise" material!)
        for side in (-1, 1):
            for i in range(11):
                z = 1.61 - i * .042
                pieces.append(oval("Braided lock", (side * (.082 + .012 * cos(i)), .020 + .035 * sin(i * .15), z),
                    (.020, .021, .034), coal))
                if i in (2, 5, 8):
                    pieces.append(oval("Turquoise braid bead", (side * .088, .042, z),
                        (.022, .020, .014), teal if i != 5 else crimson))
            pieces.append(oval("Gilt turquoise earring", (side * .098, -.004, 1.555), (.014, .010, .034), gold))
            pieces.append(oval("Earring drop", (side * .098, -.004, 1.522), (.012, .010, .016), teal))
        # Diagonal brocade shawl + Chest Melong mirror
        pieces.append(cord("Diagonal silk shawl", [
            (-.18, -.035, 1.37), (-.13, .105, 1.34), (-.04, .154, 1.23),
            (.12, .142, 1.07), (.17, .055, 1.01)
        ], .036, trim_mat, 3))
        pieces.append(oval("Chest melong mirror", (0, .154, 1.26), (.042, .014, .042), gold))
        pieces.append(oval("Chest turquoise gem", (0, .164, 1.26), (.022, .010, .022), teal))

        if is_tenma:
            # Seven-peak crystalline glacier & gold oath diadem + floating snow-wind khata arch + ice lotus scepter
            for j in range(7):
                a = (j - 3) * .32
                pieces.append(horn("Tenma ice-gold diadem", [
                    (.106 * sin(a), .082 * cos(a), 1.665),
                    (.128 * sin(a), .098 * cos(a), 1.735),
                    (.138 * sin(a), .092 * cos(a), 1.845 + .035 * cos(j)),
                ], [.028, .020, .003], ice_glow if j % 2 else gold, 8))
            khata = [(-.42 * cos(pi * t), -.10 - .05 * sin(pi * t), 1.02 + .84 * sin(pi * t))
                     for t in [k / 20 for k in range(21)]]
            pieces.append(cord("Tenma blizzard khata", khata, .032, ice_glow, 3))
            pieces.append(cord("Ice scepter", [(.26, .05, .72), (.27, .08, 1.38)], .012, gold))
            pieces.append(oval("Ice lotus orb", (.27, .08, 1.43), (.042, .042, .052), ice_glow))
        else:
            # Yeshe Tsogyal: Five-leaf gold-and-turquoise dakini tiara (max z ~ 1.86 < 2.0!),
            # graceful turquoise khata ribbon (max z ~ 1.88 < 2.0!), and golden yellow-paper Terma scroll!
            for j in range(5):
                a = (j - 2) * .36
                pieces.append(horn("Dakini tiara leaf", [
                    (.102 * sin(a), .084 * cos(a), 1.668),
                    (.115 * sin(a), .095 * cos(a), 1.748 + (2 - abs(j - 2)) * .018),
                ], [.024, .003], gold, 8))
                pieces.append(oval("Tiara turquoise", (.106 * sin(a), .092 * cos(a), 1.688),
                    (.014, .010, .016), teal))
            khata = [(-.36 * cos(pi * t), -.11 - .04 * sin(pi * t), 1.06 + .76 * sin(pi * t))
                     for t in [k / 20 for k in range(21)]]
            pieces.append(cord("Dakini turquoise khata", khata, .026, teal, 3))
            # Rolled Golden Shogser Terma Scroll in right hand
            pieces.append(cord("Golden Terma scroll", [(.21, .09, .86), (.31, .06, .89)], .022, gold, 3))
            pieces.append(oval("Terma scroll seal", (.26, .08, .875), (.016, .026, .026), crimson))
        export(combine(name, pieces))

    dakini_or_goddess("Tsogyal", crimson, red, gold, False)
    dakini_or_goddess("Tenma", frost_blue, white, teal, True)


if __name__ == "__main__":
    build()
