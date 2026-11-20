# Tō-ji in Unreal Engine 5.8

This native prototype uses the repository’s original [Kondō GLB](../../public/models/kukai/toji_kondo.glb), courtyard art, and a C++ game module. The web game remains available separately from the repository root.

## 第一次在 Mac 安裝

1. 安裝並開啟 [Epic Games Launcher](https://www.unrealengine.com/download)，登入你的 Epic 帳號。進入左側 **Unreal Engine → Library → Engine Versions**，按 **＋**，在版本下拉選單選擇正式的 **5.8.x**，自行閱讀授權條款，按 Install，記下安裝位置。完成後可以用 **Launch** 開啟編輯器。[Epic 安裝圖解](https://dev.epicgames.com/documentation/en-us/unreal-engine/install-unreal-engine)
2. 到 [Apple Developer 下載頁](https://developer.apple.com/download/all/?q=Xcode%2026.1.1) 登入，以 Apple Silicon Mac 選取 **Xcode 26.1.1 Apple silicon** 的完整 `.xip`。雙擊解壓，將 `Xcode.app` 拖入「應用程式」並開啟，按提示閱讀條款、安裝初始元件。Epic 為 UE 5.8 推薦 Xcode 26.1.1，Apple 列出它支援 macOS Tahoe 26.x。[UE 與 Xcode 相容表](https://dev.epicgames.com/documentation/en-us/unreal-engine/macos-development-requirements-for-unreal-engine) · [Apple 系統需求](https://developer.apple.com/xcode/system-requirements)
3. 打開「終端機」，逐行執行下列指令，選取編譯器並下載 Metal 工具。若 `sudo` 詢問密碼，在終端機輸入自己的 Mac 登入密碼，輸入時畫面不會顯示字元。[Apple 元件安裝說明](https://developer.apple.com/documentation/xcode/downloading-and-installing-additional-xcode-components)

```sh
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
xcodebuild -downloadComponent MetalToolchain
xcodebuild -version
xcrun metal --version
```

最後兩行應各自顯示版本。完成後即可建置下方的專案；本機打包、試玩與畫質擷取的步驟另見[試玩說明](Tests/Gameplay.md)和[七鏡位畫質比較](../QA/README.md)。

## Build and open the prototype

Use a stable Unreal Engine 5.8 installation with desktop C++ tooling and Python 3.10 or newer available on the host. Windows targets Win64 and DirectX 12 with Shader Model 6. On macOS, use an Apple Silicon Mac with a Metal SM6-capable GPU and an Epic-supported Xcode installation. Follow Epic’s version-specific requirements for [Windows](https://dev.epicgames.com/documentation/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.8) and [macOS](https://dev.epicgames.com/documentation/unreal-engine/macos-development-requirements-for-unreal-engine?application_version=5.8).

Run the following from the repository root. Set `--ue-root` to the versioned installation directory containing `Engine/`. For the default Mac Launcher location, `/Users/Shared/Epic Games` is the parent folder and `/Users/Shared/Epic Games/UE_5.8` is the versioned path.

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

The Kōdō at `(3600, 0, 0)` uses the web scale of 1.25. The five-story pagoda at `(-1800, 3600, 0)` uses the web scale of 1.05. Both use their original GLBs and the same orientation correction as the Kondō. Each has a simple collider for its podium. The mandala interaction remains on the approach south of the Kōdō.
