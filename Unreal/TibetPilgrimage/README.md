# 蓮師巡禮 · Tibet Pilgrimage

UE 5.8 原生 Apple Silicon Mac 與 iOS 專案。從本目錄執行下列指令，以 UE Editor 產生關卡及原創美術，再封裝同一組關卡。

```sh
python3 Tools/tibet.py build-editor
python3 Tools/tibet.py generate
python3 Tools/tibet.py play
python3 Tools/tibet.py package --platform Mac
python3 Tools/tibet.py package --platform IOS
```

預設 UE 安裝於 `/Users/Shared/Epic Games/UE_5.8`，可加 `--ue-root` 指定其他位置。封裝輸出至 `Builds`，可用 `--archive` 指定目錄。iPhone 版需安裝 UE iOS 平台元件，並使用與專案 Bundle ID 相符的 Apple 開發團隊、憑證及描述檔。團隊設定由簽署者在本機提供。

地圖清單位於 `Config/DefaultGame.ini`。伏藏三層各自 cook。座標以公分為單位，+X 朝北、+Y 朝東、+Z 向上。
