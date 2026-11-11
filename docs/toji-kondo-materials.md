# Tō-ji Kondō materials (#303)

The Kondō uses original, seamless textures authored in
[`toji_materials.py`](../scripts/blender/toji_materials.py). Timber and roof
colors draw on the tonal range in the [Kondō façade photograph](https://inariage.com/term/toji/kondo.html).
The [temple's official guide](https://toji.or.jp/guide/kondo/) identifies the
roof as hon-gawara tile and the figure as gilt-lacquered wood. The generator
uses numerical patterns and does not sample either photograph.

| Surface | Detail | Repeat in Blender units |
| --- | --- | --- |
| Timber | Warped earlywood bands, knots, vessels and fading | 0.84 across the grain × 2.45 along it |
| Roof tile | Cool clay, fine pits, mineral deposits and rain streaks | 1.87 × 1.87 |
| Granite | Warm feldspar, light quartz and dark mica | 0.93 × 0.93 |
| Lime plaster | Trowel marks, pinholes and small tonal changes | 1.56 × 1.56 |
| Gilt | Gold leaf over darkened lacquer with varied roughness | 0.76 × 0.76 |

The generator projects UVs in each piece's local coordinates before Blender
joins objects by material. Posts and round rafters wrap the long grain around
their sides. Rectangular pieces follow their long axis, with vertical grain
on the wall panels. Seeded offsets vary the grain and wear between pieces.
The helper writes `UVMap` and preserves any separate sculpture UV layers.

The editable Blender source packs the generated images. The GLB embeds sRGB
base color, tangent-space normal maps for the architectural surfaces, and
non-color maps that pack micro-occlusion, roughness and metallic into RGB.
Dark and light variants share normal and ORM images. The architectural and
gilt materials use 17 unique images at 128–512 px, about 8.42 MiB as RGBA8
with mipmaps.

Follow the [temple art rebuild instructions](japan-temple-art.md#blender-source-and-rebuilding)
with `--assets kondo`. Blender's bundled Python and NumPy generate the images.
