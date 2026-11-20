# Tō-ji courtyard source art

`TojiCourtyard.glb` contains the granite sandō, gravel and moss grounds, spring branches, Fuji-zakura at map-local `(24, 6)`, and a distant wooded ridge. The weeping cherry's branched sprays use an original four-variant atlas of five-petal blossoms, veins and pedicels. The cryptomeria ridge uses lightweight original cutout foliage. Both use glTF
`MASK` with double-sided materials. Build it from the deterministic Blender source in `Tools/build_toji_courtyard.py`. The geometry and parameterized color and normal maps were created for this repository. The asset has no stock textures, photo textures, or extra third-party terms.

The UE scene reuses the repository's Kondō and Yakushi geometry and baked wood, stone and gilt materials. See [temple art provenance](../../../../docs/japan-temple-art.md) and [Kondō material authoring](../../../../docs/toji-kondo-materials.md) for the sources and recipes.

From the repository root, with Blender 5.2.3 installed:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python-exit-code 1 --python Unreal/StupaPilgrimage/Tools/build_toji_courtyard.py
```

Pass `-- --output /tmp/TojiCourtyard.glb` to write a comparison copy. Two clean builds produced SHA-256 `73993a80e1968ca6fec3ea988e29c5ffccdbafc091eb27464ff616ba08e9d2a3` with 17 meshes, 174,241 triangles, 12 embedded PNGs and no required glTF extensions. The checked-in GLB allows the UE level generator to run without Blender.

Blender scene coordinates use metres with +X east, +Y north and +Z up. The importer aligns the courtyard origin with the map-local Web origin. Pavement tops are within 3 cm of UE Z=0. Collision belongs to the UE level generator so the fine visual detail does not snag the player.

`Tools/toji_art.py` assembles the directional key, sky capture, distance haze and localized altar fill. Gameplay controls the tagged `Toji.Sun` and `Toji.SkyLight` actors for day, dusk and night. The QA manifest `Unreal/QA/toji-views.json` defines the comparison cameras and lighting states.

Independent Blender renders of the assembled temple and courtyard verified orientation, texture import and alpha-mask silhouettes, including the close blossom view from map-local `(22, 3, 18)` toward `(24, 3.2, 6)`. The procedural vegetation is an authored approximation. Appearance, exposure, cooked materials, capture framing and performance require verification in the packaged UE scene.
