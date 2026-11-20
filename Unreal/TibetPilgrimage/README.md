# 蓮師巡禮 · Tibet Pilgrimage

UE 5.8 原生 Apple Silicon Mac 與 iOS 專案。從本目錄執行下列指令，以 UE Editor 產生關卡及原創美術，再封裝同一組關卡。

```sh
python3 Tools/tibet.py build-editor
python3 Tools/tibet.py generate
python3 Tools/tibet.py play
python3 Tools/tibet.py package --platform Mac
python3 Tools/tibet.py package --platform IOS --unsigned
python3 Tools/tibet.py package --platform IOS
```

預設 UE 安裝於 `/Users/Shared/Epic Games/UE_5.8`，可加 `--ue-root` 指定其他位置。封裝輸出至 `Builds`，可用 `--archive` 指定目錄。iPhone 版需安裝 UE iOS 平台元件。`--unsigned` 產出待簽署的 Xcode Archive。安裝到手機前須使用與專案 Bundle ID 相符的 Apple 開發團隊、憑證及描述檔。團隊設定由簽署者在本機提供。

地圖清單位於 `Config/DefaultGame.ini`。伏藏三層各自 cook。座標以公分為單位，+X 朝北、+Y 朝東、+Z 向上。

## 遊玩

從博達哈南廣場找洛桑交談，跟著畫面菱形和距離提示繞塔、點燈，再往北郊原野。南側出口通往可回訪的行者塔林。五章走到青普後進入三層伏藏，回到青普與博達哈完成尾聲。進度與語言選擇存在本機。網頁版的裝備庫、雲端帳號與程序地城另有資料格式，此版使用獨立的原生進度和三座手製洞室。

| 操作 | Mac |
| --- | --- |
| 移動、轉動視角 | WASD、移動滑鼠 |
| 交談、點燈、操作祭壇與出口 | E |
| 吽字光彈、六字真言 | 空白鍵、R |
| 金剛橛、金剛鈴、蓮盾、護法、上師心咒 | 1、2、3、4、T |
| 跳躍、切換中英文、離開 | 左 Shift、L、Esc |

iOS 橫向操作以左半側拖曳移動、右半側拖曳視角，右下按鈕施法或互動。機身與瀏海保留區交由 Slate safe zone 配置。

逐關實景資料見 [建築與場景](ArtDirection.md)、[角色與護法館藏](FigureReferences.md) 和 [實際高程與地圖中心](Assets/Relief/README.md)。封裝後可按 [試玩與攝影](QA/README.md) 重現驗收。另可執行 `python3 QA/relief_atlas.py <mac 截圖目錄> <輸出.jpg>` 產生六個實景地點的地形對照，需 NumPy 與 Pillow。
