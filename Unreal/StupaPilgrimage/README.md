# Tō-ji in Unreal Engine 5.8

This native prototype uses the repository’s original [Kondō GLB](../../public/models/kukai/toji_kondo.glb), courtyard art, and a C++ game module. The web game remains available separately from the repository root.

## Build and open the prototype

Use a stable Unreal Engine 5.8 installation with desktop C++ tooling and Python 3.10 or newer available on the host. Windows targets Win64 and DirectX 12 with Shader Model 6. On macOS, use an Apple Silicon Mac with a Metal SM6-capable GPU and an Epic-supported Xcode installation. Follow Epic’s version-specific requirements for [Windows](https://dev.epicgames.com/documentation/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.8) and [macOS](https://dev.epicgames.com/documentation/unreal-engine/macos-development-requirements-for-unreal-engine?application_version=5.8).

Run the following from the repository root. Set the Unreal installation path to the directory containing the engine’s `Engine/` subdirectory.

**macOS (zsh)**

```sh
ue_root="/Users/Shared/Epic Games/UE_5.8"
python3 Unreal/StupaPilgrimage/Tools/toji.py --ue-root "$ue_root" build-editor
python3 Unreal/StupaPilgrimage/Tools/toji.py --ue-root "$ue_root" generate
python3 Unreal/StupaPilgrimage/Tools/toji.py --ue-root "$ue_root" play
```

**Windows (PowerShell)**

```powershell
$ueRoot = "C:\Program Files\Epic Games\UE_5.8"
py -3 Unreal/StupaPilgrimage/Tools/toji.py --ue-root $ueRoot build-editor
py -3 Unreal/StupaPilgrimage/Tools/toji.py --ue-root $ueRoot generate
py -3 Unreal/StupaPilgrimage/Tools/toji.py --ue-root $ueRoot play
```

`generate` opens a full Editor process in unattended mode, imports the GLBs through Interchange, creates `/Game/Maps/Toji`, and invokes the courtyard art hook before saving. First-run import and shader compilation can take several minutes. Generation writes `Saved/Logs/TojiGeneration.log` and confirms success with `TOJI_GENERATION_COMPLETE`. After generation, you can also open [StupaPilgrimage.uproject](StupaPilgrimage.uproject) normally and use Play In Editor with `Toji` as the startup map.

The map and imported assets under `Content/` are generated locally. Each generation replaces the actors on the Toji map and reimports its source art. Close other Editor sessions before generating, and save hand-edited maps under a different name.

## Package

After generation, run the same tool with `package`. It calls Unreal Automation Tool’s `BuildCookRun` for the host platform, builds the Development target, cooks the Toji map, and writes the archive to `Unreal/StupaPilgrimage/Builds`. Launch the packaged `StupaPilgrimage` app or executable to verify it starts on the south approach.

## Map coordinates

Unreal uses centimeters with +X north, +Y east, and +Z up. A Three.js world point `(x, y, z)` maps to Unreal `(-100*z, 100*(x-7500), 100*y)`. The Kondō is centered at `(-800, 0, 0)`, faces south, and uses the same 1.25 scale as the web map. The generator verifies the imported and placed bounds against the GLB node transforms and uses the depth asymmetry of the south stair to resolve the importer’s horizontal orientation. It reuses that orientation for the courtyard. The PlayerStart is at `(-4400, 0, 102)`, facing north.
