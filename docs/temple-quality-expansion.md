# Japan temples and Tibetan scene quality (#312)

This extends the [Kondō reference](toji-quality-reference.md) to Tō-ji Kōdō,
the five-story pagoda, Kōyasan Konpon Daitō and the five existing Tibetan
adventure chapter maps. It keeps the game's stylized proportions. No scan or
photographic/AAA equivalence is claimed.

## Authored assets

`scripts/blender/temple_materials.py` reuses the reviewed Kondō UV/PNG packing
helpers with smaller 256px original base-color and packed ORM recipes, plus
128px architectural normals. Timber follows the beam direction; plaster,
granite, smoked tiles, aged gilt, vermilion paint and patinated bronze have
separate surface response. The established Kondō recipe and GLB are unchanged.

Kōdō and Daitō each receive one detailed principal Dainichi: continuous face,
torso and lap, bent arms, individual fingers, five-leaf crown, robe hems,
convex lotus petals and openwork aureole. Kōdō uses the wisdom-fist gesture;
Daitō uses the meditation gesture with right palm above left. The sculptor
shares the facial/cloth authoring primitives with Yakushi, while preserving
the different crown and hand forms and excluding Yakushi's seven miniatures.
The other mandala figures and their placement remain intact.

Each principal figure has a 512px normal/AO bake on `TEXCOORD_1`, separate from
the repeatable gilt material on `TEXCOORD_0`. High-resolution baking meshes
never enter the exported GLBs. Gold has zero emissive fill. Kōdō's flame
aureoles retain orange color with restrained emission so bloom no longer
washes out the adjacent principal image.

Daitō's solid lower-core block is replaced by perimeter walls and an open
central doorway, retaining the exterior footprint. The entrance has real
frame/lattice bars, and the interior has a timber floor and ceiling coffers.
Added tile rolls and open upper railings clarify the roof and tower silhouette;
the lower bracket slab is fitted below the curved roof instead of piercing it.
The pagoda roof slope now starts outside its central roof table, keeping the
existing plaster friezes and brackets below the tiles. Roof-beam winding is
normalized before single-sided export. Neither fix adds pagoda triangles.

## Runtime and mobile

`japanLandmarkLighting.js` adds bounded eave/interior attenuation and a soft
entrance reflection using the existing direct/indirect light calculations.
The live sky night factor drives the transition. This is an artistic lighting
approximation, not baked global illumination. Existing ground materials share
small gravel/paving tiles and local contact shading; no extra ground draw is
added. Intrusive transparent beam overlays are removed from Kōyasan.

Mobile/low-spec omits `_TemplePBR` architectural normal maps while preserving
base color, ORM and both principal figures' UV1 normal/AO bakes. Loader-owned
unused normals are still correctly disposed. The GLB download remains shared
between tiers. Existing mobile DPR/shadow/post-processing policy is unchanged.
No new PointLight, post-processing pass or per-frame texture allocation is added.

| GLB | Before triangles → after | Primitives | Bytes | Embedded RGBA8+mips |
| --- | ---: | ---: | ---: | ---: |
| Kōdō | 63,764 → 87,770 | 16 → 21 | 2,189,412 → 4,736,616 | 8.75 MiB |
| Five-story pagoda | 62,904 → 62,904 | 13 → 13 | 2,070,596 → 3,740,076 | 6.08 MiB |
| Konpon Daitō | 24,060 → 60,618 | 12 → 18 | 788,112 → 3,747,460 | 8.08 MiB |

These are one-pass geometry and decoded texture estimates, not total GPU
memory or frame cost. New detail has a real cost. Unit checks cap each asset's
geometry, primitives, download size, embedded PNG dimensions and decoded maps.

## Tibetan chapter maps

`tibetanSurfaces.js` supplies original small textures for weathered plaster,
masonry, layered rock, timber, roof seams, paving and woven cloth. Existing
material colors still control chapter/weather grades. Pharping, Mangyul,
Yarlung, Samye and Chimphu reuse existing meshes and instancing; no extra scene
geometry or PointLight is added. Gilded roofs retain their existing emission
settings and receive the new surface maps.

Desktop uses 128px color/roughness tiles with bump shading; mobile/software
rendering uses 64px tiles without bump. Every map owns its textures. Story
wrappers propagate the rendering tier and dispose their own texture set,
including Pharping's rain/reset rebuild. Samye's construction stages and its
instanced surrounding stupas remain intact. The intentionally faceless Guru
vision character is not replaced with a Japanese sculpture.

## References and reproduction

Official photographs were inspected for shape, palette and iconography only;
none are embedded as textures:

- [Tō-ji Kōdō](https://toji.or.jp/guide/kodo/) and its
  [principal Dainichi](https://toji.or.jp/mandala/).
- [Tō-ji five-story pagoda](https://toji.or.jp/guide/gojunoto/).
- [Kongōbu-ji's Konpon Daitō guide](https://www.koyasan.or.jp/meguru/).
- [MIHO Museum's distinction between Dainichi hand gestures](https://www.miho.jp/booth/html/artcon/00000099.htm).

The dedicated Blender MCP authoring session uses the same setup as #301.
Reproduce the exported models without MCP:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python scripts/blender/build_japan_temple_art.py -- \
  --assets kodo gojunoto daito --output /tmp/temple-models --source /tmp/temple-source
```

A fresh headless process reproduced all three MCP outputs byte for byte; it
also reproduced the unchanged Kondō SHA recorded in the original reference.

## Matched browser evidence

`scripts/temple-expansion-browser-test.mjs` uses the shared
`scripts/lib/quality-browser-capture.mjs` actual-game pipeline harness.
The existing Kondō entry point retains its original cameras and behavior.
The new entry point captures 13 locked views, each by day/night in desktop and
mobile modes: 52 images per revision. It records served GLB and screenshot
hashes, renderer configuration, texture allocation estimates, draw/triangle
counts, frame intervals and available GPU timer queries. Baseline is master
`c59c51192529bd2ef85dc761e8ce99f8d5486f75`.

Use separate frozen production builds; do not share a live Vite dependency
cache. Hide HUD/enemies, protect the idle player, suppress first-entry chapter
cards and use Samye stage 4 identically in both runs. Blender should be stopped
before measuring. Reproduce with the desired served revision:

```sh
STORY_BASE_URL=http://127.0.0.1:4235 BROWSER_CHANNEL=chrome \
  TEMPLE_EXPANSION_SOURCE=<baseline> TEMPLE_EXPANSION_LABEL=before \
  node scripts/temple-expansion-browser-test.mjs
STORY_BASE_URL=http://127.0.0.1:4232 BROWSER_CHANNEL=chrome \
  TEMPLE_EXPANSION_SOURCE=<candidate> TEMPLE_EXPANSION_LABEL=after \
  node scripts/temple-expansion-browser-test.mjs
node scripts/temple-expansion-browser-test.mjs --compare
```

Ignored `artifacts/temple-expansion` contains full-size paired HTML/JSON,
screenshots, source `.blend` files and rebuild evidence. Mobile emulation checks
the mobile rendering path and relative resource cost on the same desktop GPU;
it does not establish physical-phone FPS, temperature or battery use.
