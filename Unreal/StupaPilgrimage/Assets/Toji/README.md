# Tō-ji courtyard source art

`TojiCourtyard.glb` contains the granite sandō, gravel and moss grounds, spring branches, Fuji-zakura at map-local `(24, 6)`, and a distant grove. Build it from the deterministic Blender source in `Tools/build_toji_courtyard.py`. The geometry and parameterized color and normal maps were created for this repository. The asset has no stock textures, photo textures, or extra third-party terms.

The UE scene reuses the repository's Kondō and Yakushi geometry and baked wood, stone and gilt materials. See [temple art provenance](../../../../docs/japan-temple-art.md) and [Kondō material authoring](../../../../docs/toji-kondo-materials.md) for the sources and recipes.

From the repository root, with Blender 5.2.3 installed:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python-exit-code 1 --python Unreal/StupaPilgrimage/Tools/build_toji_courtyard.py
```

Pass `-- --output /tmp/TojiCourtyard.glb` to write a comparison copy. Two clean builds produced SHA-256 `f7abf3115eb7a04f415804e75238ed09081412ee16cb9d5feffd42808bb19839` with 15 meshes, 260,346 triangles, 20 embedded PNGs and no required glTF extensions. The checked-in GLB allows the UE level generator to run without Blender.

Blender scene coordinates use metres with +X east, +Y north and +Z up. The importer aligns the courtyard origin with the map-local Web origin. Pavement tops are within 3 cm of UE Z=0. Collision belongs to the UE level generator so the fine visual detail does not snag the player.

`Tools/toji_art.py` assembles the directional key, sky capture, distance haze and localized altar fill. Gameplay controls the tagged `Toji.Sun` and `Toji.SkyLight` actors for day, dusk and night. The QA manifest `Unreal/QA/toji-views.json` defines the comparison cameras and lighting states.

Independent Blender renders of the assembled temple and courtyard verified orientation and texture import. The procedural vegetation is an authored approximation. Appearance, exposure, cooked materials, capture framing and performance require verification in the packaged UE scene.
