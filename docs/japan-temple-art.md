# Japanese temple art (#290)

The playable maps are stylized interpretations. Photographs informed proportions,
construction details and iconography; none of these photographs or third-party
meshes/textures are redistributed in the game. All new geometry and gravel/foliage
textures are authored in this repository.

## References

- [Tō-ji official Kondō guide](https://toji.or.jp/guide/kondo/): layered eaves and
  raised central opening; Yakushi with raised right hand, no medicine jar, seven
  miniature Buddhas in the aureole, and twelve guardians around the pedestal.
- [Kondō frontal photograph](https://inariage.com/term/toji/kondo.html): tile courses,
  timber lattice, plaster panels and the deep shadow beneath the eaves.
- [Kongōbu-ji official temple guide](https://www.koyasan.or.jp/en/jinai.html): cypress
  bark roof, timber galleries and Banryūtei stone/gravel composition.
- [Banryūtei photographs](https://oniwa.garden/kongobuji-temple-%E9%87%91%E5%89%9B%E5%B3%AF%E5%AF%BA%E8%9F%A0%E9%BE%8D%E5%BA%AD/): irregular
  fractured rocks, moss at the base, raked pale gravel and framed gallery views.

## Blender source and rebuilding

`build_japan_temple_art.py` extends the original generators with closed curved
roof surfaces, tile rolls, rafters, timber joinery and the sculpted figures in
`japan_sculpture.py`. The lead agent built and inspected Kondō first, before
parallel garden/vegetation implementation. Authoring and exports were executed
through [MCP for Blender](https://github.com/ahujasid/mcp-for-blender), package
2.2.7, addon protocol 15, Blender 5.2.3. The addon loaded into a dedicated factory
startup session on loopback port 9877; no permanent preferences were changed.
Telemetry was disabled. Addon source SHA-256 used for this authoring session:
`a7b3873aed8405bd2785292ab9b916a4392129f82a02a336b62ac14aa121828b`.

Rebuild all four shipped assets with Blender (no MCP connection needed for batch
reproduction):

```sh
blender --background --python scripts/blender/build_japan_temple_art.py -- \
  --source artifacts/japan-art/source
```

Use `--assets kondo` for a single hall, and `--output /path/to/models` for an
alternate export directory. In a dedicated live Blender MCP scene, import the
script using `importlib.util.spec_from_file_location` and call
`module.main(['kondo'], source='/absolute/path/to/artifacts/japan-art/source')`.
The build replaces objects in that authoring scene; use a dedicated scene/session.
Editable, unmerged `.blend` files go to the source directory. The committed Python
source is authoritative; GLBs are merged by material and contain no lights,
external image downloads or texture dependencies.

## Geometry and draw budgets

Counts below are GLB geometry for one pass, not frame-rate promises; shadow passes
add work. Budget regression checks are in `tests/japan-model-assets.test.mjs`.

| GLB | Original triangles / primitives | Updated triangles / primitives |
| --- | ---: | ---: |
| Kondō | 15,072 / 12 | 54,756 / 16 |
| Kōdō | 13,696 / 12 | 63,764 / 16 |
| Five-storey pagoda | 70,000 / 21 | 62,904 / 13 |
| Konpon Daitō | 13,396 / 331 | 24,060 / 12 |

Close-view anatomy and architectural detail increase triangle count in the halls.
Material merging reduces the four assets from 376 to 57 primitive submissions.
The pagoda no longer bundles a duplicate pond and tree set; each map owns its own
vegetation and seasonal palette. No new PointLights are introduced.

`japanLandmarkLoader.js` replaces a complete procedural fallback only when every
model in the set succeeds. Failed loads retain the fallback; disposal frees
geometry, materials and textures, including responses arriving after teardown.

## Verification

```sh
npm run build
npm run check:i18n
npm test
# With a local preview server on 4173:
npm run test:japan
node scripts/japan-art-browser-test.mjs
```

The art script captures fixed daylight and camera views of the real game at
1440×1000 and records renderer counts under `artifacts/japan-art/`. Set
`STORY_BASE_URL`, `JAPAN_ART_LABEL`, `JAPAN_ARTIFACTS`, or `BROWSER_CHANNEL` as needed.
The Japan acceptance suite separately checks actual desktop/mobile controls,
all campaign objectives and route/collision access. Sanctums remain viewed from
the existing approach; these art changes do not introduce walkable interiors.
