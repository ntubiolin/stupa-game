# 西藏朝聖試玩與攝影

在 Mac 開啟本機正式網頁建置並執行以下命令。網頁測試使用桌面 Chrome、實際遊戲 canvas、1440 × 900 視窗與固定春季光照。伏藏使用 seed 20261120，在各層的起點攝影。

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4477
```

在另一個終端從儲存庫根目錄執行，將 app 指向此次打包的 Development 建置。每次試玩與比較使用新的輸出目錄。可用 photos --only 重拍單一關卡至空目錄。

```sh
qa=Unreal/TibetPilgrimage/QA
result=artifacts/tibet-comparison
app="/path/to/TibetPilgrimage.app/Contents/MacOS/TibetPilgrimage"
mkdir -p "$result"
node "$qa/capture-web.mjs" http://127.0.0.1:4477 "$result/web"
python3 "$qa/test_package.py" photos --exe "$app" --output "$result/mac"
python3 "$qa/test_package.py" play --exe "$app" --output "$result/play"
python3 "$qa/test_package.py" skills --exe "$app" --output "$result/skills"
python3 "$qa/test_package.py" compare --web "$result/web" --mac "$result/mac" --output "$result/comparison"
```

在 comparison/index.html 檢視每關原圖與畫質差異。固定 55° 垂直視角，同地標分別取景；機位記錄於 views.json，PNG 的雜湊與原始參數記錄於 comparison/report.json。UE 每張攝影取樣 60 個渲染幀的中位數與第 95 百分位幀間隔，僅描述當下靜態鏡位。

play 會啟動打包版，用獨立存檔進行鍵盤遊玩，確認第一個目標在重新啟動後仍能讀取，再依遊戲提示完成五章主線，從伏藏回到青樸及博達哈。另以新存檔從南門進入塔林，完成裝藏後返回大塔。遊戲中每次切換目標留下 HUD 截圖，events.tsv 記錄角色位置、目標及轉場。skills 會在第三層守藏者戰鬥逐一輸入七種法術，核對執行中的遊戲記錄與施法畫面。iPhone 實機的觸控、效能與簽名安裝須分別在配對裝置執行。
