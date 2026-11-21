"""Northern Wilderness & regional obstacle cast: Preta Spirit, Crimson Tsen Rider, Snow Migoi & Migoi King."""
from math import cos, pi, sin, tau
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_figures import beast, box_part, bpy, combine, cord, export, horn, loft, oval, ribbon, surface


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mist = surface("PretaJade", (.09, .58, .52), .28, emit=.45)
    wisp = surface("PretaIndigo", (.14, .18, .38), .45, emit=.20)
    gold = surface("TsenGilt", (.84, .52, .11), .30, metal=.78)
    ember = surface("KarmicEmber", (.98, .44, .08), .22, emit=1.35)
    coal = surface("TsenEbony", (.04, .026, .030), .68)
    rust = surface("TsenSteed", (.34, .062, .036), .62, weave=.05)
    red = surface("TsenLacquer", (.66, .055, .048), .36, metal=.25)
    banner_red = surface("TsenBanner", (.78, .09, .06), .75, weave=.08)
    ice = surface("MigoiIce", (.38, .82, .98), .20, metal=.22, emit=.55)

    # 1. Preta / Karmic Obstacle Spirit:
    # Swirling ghostly vortex tail, hollow rib-cage revealing a blazing karmic ember heart,
    # floating skeletal claws, horned spirit mask & orbiting golden mantra rings!
    pieces = [
        loft("Spectral swirling shroud", [
            (.06, .04, .04, 0, -.06), (.26, .16, .15, .03, -.03),
            (.54, .34, .30, -.02, 0), (.84, .42, .36, 0, .02),
            (1.12, .32, .28, 0, 0), (1.30, .14, .14, 0, -.02)
        ], wisp, 36, .045),
        oval("Ghostly jade upper aura", (0, .02, .96), (.38, .34, .38), mist),
        oval("Blazing karmic heart", (0, .32, .78), (.12, .08, .14), ember),
    ]
    for ring_i, tilt in enumerate((.24, -.28)):
        orbit = [(.48 * cos(i * tau / 36), .42 * sin(i * tau / 36),
                  .98 + .16 * sin(i * tau / 36 + ring_i) * (1 if tilt > 0 else -1)) for i in range(37)]
        pieces.append(cord("Orbiting karmic shackle", orbit, .020, gold if ring_i == 0 else mist, 3))
    for side in (-1, 1):
        pieces += [
            oval("Hollow socket", (side * .15, .33, 1.04), (.082, .045, .095), coal),
            oval("Burning spirit eye", (side * .15, .365, 1.04), (.042, .022, .048), ember),
            horn("Spectral flame horn", [
                (side * .22, .04, 1.12), (side * .38, -.04, 1.38), (side * .30, -.08, 1.64)
            ], [.095, .058, .004], mist, 10),
            # Floating spectral clawed arm
            horn("Spectral claw arm", [
                (side * .36, .08, .88), (side * .52, .24, .76), (side * .46, .38, .84)
            ], [.068, .048, .016], mist, 8),
        ]
    export(combine("Preta", pieces))

    # 2. Tsen Crimson Spirit Rider (Ch.0 Wild, Ch.4 Hepo Ri Wave 1):
    # Armored crimson Tibetan warhorse with gilt chamfron, lamellar-armored Tsen warrior,
    # horned gilt helm, twin red ru-dar war pennants on back, shield & barbed spirit lance!
    horse = [
        oval("Horse barrel", (0, 0, 1.04), (.35, .65, .34), rust),
        oval("Horse chest", (0, .38, 1.08), (.31, .32, .34), rust),
        horn("Arched warhorse neck", [(0, .36, 1.12), (0, .56, 1.45), (0, .58, 1.70)], [.23, .19, .13], rust),
        oval("Horse skull", (0, .61, 1.70), (.145, .23, .165), rust),
        oval("Horse muzzle", (0, .82, 1.62), (.115, .18, .11), coal),
        # Gilt armored chamfron face-plate & saddle armor
        box_part("Gilt chamfron", (0, .76, 1.71), (.14, .26, .04), gold, (.42, 0, 0)),
        oval("Armored saddle", (0, -.04, 1.28), (.36, .42, .10), gold),
        horn("Flowing horse tail", [(0, -.52, 1.16), (0, -.76, .98), (0, -.86, .54)], [.075, .105, .022], coal),
        # Armored Tsen warrior torso & horned war-helmet
        loft("Crimson lamellar cuirass", [
            (1.26, .24, .18, 0, -.05), (1.58, .22, .17, 0, -.05),
            (1.82, .30, .19, 0, -.03), (1.90, .13, .12, 0, -.03)
        ], red, 36, .012),
        band_ring := loft("Gilt breastplate belt", [(1.52, .235, .182, 0, -.05), (1.59, .24, .185, 0, -.05)], gold, 32),
        oval("Rider head", (0, -.02, 2.01), (.135, .135, .145), coal),
        oval("Lacquer war helmet", (0, -.025, 2.06), (.158, .155, .155), red),
        oval("Gilt wrathful visor", (0, .118, 2.04), (.125, .042, .055), gold),
        horn("Crimson yak-hair plume", [(0, -.03, 2.18), (0, -.14, 2.38), (0, -.32, 2.42)], [.078, .062, .008], banner_red),
    ]
    for side in (-1, 1):
        x = side * .23
        for fore in (-.38, .37):
            horse += [
                horn("Horse leg", [(x, fore, .98), (x, fore - .04, .52), (x, fore + .02, .14)], [.115, .072, .052], rust),
                oval("Iron hoof", (x, fore + .035, .085), (.085, .11, .076), coal),
            ]
        horse += [
            horn("Horse ear", [(side * .09, .54, 1.79), (side * .11, .54, 1.98)], [.052, .004], rust, 8),
            oval("Blazing horse eye", (side * .125, .70, 1.73), (.026, .026, .026), ember),
            horn("Helmet horn", [(side * .13, -.01, 2.10), (side * .28, .02, 2.24), (side * .24, .06, 2.38)], [.036, .024, .003], gold, 8),
            oval("Lamellar pauldron", (side * .27, -.03, 1.79), (.145, .155, .105), gold),
            horn("Armored gauntlet", [(side * .26, -.03, 1.74), (side * .40, .12, 1.50), (side * .36, .26, 1.56)], [.092, .078, .062], red),
            horn("Riding boot", [(side * .24, -.07, 1.38), (side * .35, .06, 1.12), (side * .35, 0, .86)], [.11, .09, .072], coal),
        ]
        # Twin Tibetan "ru-dar" war banners rising from the rider's back
        bx = side * .16
        horse.append(cord("Back banner pole", [(bx, -.18, 1.55), (bx * 1.35, -.28, 2.52)], .012, gold))
        horse.append(ribbon("Crimson war pennant",
            [(bx * 1.15, -.22, 2.12), (bx * 1.34, -.28, 2.48)],
            [(bx * 1.25, -.48, 2.04), (bx * 1.44, -.56, 2.40)], banner_red))
    # Left shield + Right barbed crimson-gold lance
    horse.append(oval("Round gilt buckler", (-.42, .22, 1.56), (.04, .22, .22), gold))
    horse += [
        cord("Spirit lance shaft", [(.37, .12, .62), (.37, .34, 2.35)], .024, coal),
        ribbon("Lance silk streamer", [(.37, .31, 2.12), (.37, .33, 2.28)], [(.48, .12, 1.98), (.52, .16, 2.18)], banner_red),
        horn("Barbed gilt lance tip", [(.37, .33, 2.32), (.37, .35, 2.44), (.37, .38, 2.72)], [.028, .078, .003], gold, 8),
    ]
    export(combine("TsenRider", horse))

    # 3. Himalayan Snow Migoi & 4. Glacial Crowned Snow Migoi King (Wilderness Boss)
    fur = surface("MigoiWhiteFur", (.84, .88, .92), .78, weave=.07)
    mane = surface("MigoiSlateMane", (.34, .42, .52), .82, weave=.08)

    def migoi():
        return beast(False, fur, mane, coal, ice, ember)

    export(combine("SnowMigoi", migoi()))

    king = migoi()
    # Towering glacial crystal shoulder spires, 9-point hoarfrost crown & mani-chain wraps
    for side in (-1, 1):
        for j in range(3):
            king.append(horn("Glacial shoulder crystal", [
                (side * (.34 + j * .06), -.04 + j * .04, 1.56),
                (side * (.52 + j * .09), -.06 + j * .05, 1.88 + j * .08),
            ], [.068, .004], ice, 6))
    for i in range(9):
        a = tau * i / 9
        x, y = .175 * cos(a), .155 * sin(a) + .05
        king.append(horn("Hoarfrost sovereign crown", [
            (x, y, 1.92), (x * 1.18, y * 1.08, 2.08), (x * 1.34, y * 1.12, 2.26 + .09 * (i % 2))
        ], [.055, .042, .003], ice if i % 2 == 0 else gold, 6))
    export(combine("SnowKing", king))


if __name__ == "__main__":
    build()
