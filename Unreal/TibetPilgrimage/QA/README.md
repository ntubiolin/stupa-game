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
python3 "$qa/test_package.py" arrival --exe "$app" --output "$result/arrival"
python3 "$qa/test_package.py" camera --exe "$app" --output "$result/camera"
python3 "$qa/test_package.py" play --exe "$app" --output "$result/play"
python3 "$qa/test_package.py" skills --exe "$app" --output "$result/skills"
python3 "$qa/test_package.py" feedback --exe "$app" --output "$result/feedback"

python3 "$qa/capture_passages.py" --exe "$app" --output "$result/passages"
python3 "$qa/test_package.py" learned --exe "$app" --output "$result/learned"
python3 "$qa/test_package.py" pack --exe "$app" --output "$result/pack"
python3 "$qa/test_package.py" journal --exe "$app" --output "$result/journal"
python3 "$qa/test_package.py" compare --web "$result/web" --mac "$result/mac" --output "$result/comparison"
```

arrival 使用新存檔和預設開場鏡頭，確認塔座、塔尖與洛桑都在畫面內，並保存玩家進場原圖。接著透過遊戲輸入實測游標移動、右鍵拖曳，以及放開右鍵後邊走邊移動游標時的鏡頭朝向。

camera 先執行 arrival，再以每秒 30 與 60 幀上限實測側移路徑、鏡頭跟隨、按住 Q／E 與放開後的回正、選單輸入隔離，以及洛桑面前的 E 輕按互動。events.tsv 記錄鏡頭、角色和移動基準的角度。

capture_passages.py 從青浦走上洞口階梯，再穿越伏藏三層。每一層都擷取一般玩家鏡頭下傳送門明暗兩相、量測可見門柱像素與實際進門高度，並在固定機位檢查燭光能照見地面、拱頂保留暗部。關卡產生前可執行 `python3 Unreal/TibetPilgrimage/QA/test_cave_passages.py` 檢查六張地圖的階面、洞頂淨空及互動位置。

learned 從伏藏第三層走回青浦與博達哈，重開後實際施放上師心咒，另用新存檔核對鎖定狀態及法力。

feedback 在桌面與窄版進入虛空寶庫，穿過第一個任務目標並讓守護者接觸主角。它依序核對任務提示、蓮盾期間生命維持 100、護盾到期後生命降至 84、角色受擊動作以及效果消退，也會比較三張畫面兩側的受擊提示。

play 在第一盞酥油燈點亮後重啟遊戲，核對存檔進度與燈芯上的可見火焰，再繼續走完主線及塔林支線。

攝影與報告產生時均會檢查畫面下方的橫向邊緣，擋下僅有天空、地平線的畫面。每個鏡位最多拍攝三次，缺景圖保留在 rejected 目錄。比對時仍須目視確認每張圖的主建築或關卡地標。

在 comparison/index.html 檢視每關原圖與畫質差異。固定 55° 垂直視角，同地標分別取景；機位記錄於 views.json，PNG 的雜湊與原始參數記錄於 comparison/report.json。UE 每張攝影取樣 60 個渲染幀的中位數與第 95 百分位幀間隔，僅描述當下靜態鏡位。

macOS 驗證採用與 Finder 相同的 LaunchServices 開啟 app，逐次核對遊戲寫出的完成事件及畫面。play 會啟動打包版，用獨立存檔進行鍵盤遊玩，確認第一個目標在重新啟動後仍能讀取，再依遊戲提示完成五章主線，從伏藏回到青樸及博達哈。另以新存檔從南門進入塔林，完成裝藏後返回大塔。遊戲中每次切換目標留下 HUD 截圖，events.tsv 記錄角色位置、目標及轉場。skills 會在七份獨立存檔中走到第三層守藏者，逐一按鍵施法並拍攝。每份 events.tsv 記錄實際施法前後的敵方血量、扣血值、延遲血條及命中特效數。額外一次從射程外施放六字真言，驗證血量維持及零命中提示。上師心咒場次接著以護法收尾，驗證剩下 3 點生命時只顯示 3 點傷害。iPhone 實機的觸控、效能與簽名安裝須分別在配對裝置執行。

pack 用獨立存檔在北郊實際受擊、服用甘露丸、調伏靈障取得銅鈴並裝備。找回古圖後由行囊設為快捷道具，重開遊戲，以快捷鍵展開地圖並選擇桑耶寺。繁中桌面與英文窄版各產出行囊與地圖實拍；桌面和窄版的互動檢查均經 Slate 按鈕命中測試。Editor Automation 的 `Tibet.Journal.PrePackSave` 另讀取 #356 已對洛桑完成首次交談的原始檢查點，核對新增欄位預設值。[桌面唐卡地圖](Evidence/painted-pilgrimage-atlas.jpg) · [窄版行囊](Evidence/pack-touch.jpg)

journal 分別在繁中、英文桌面及 884 × 420 英文觸控預覽擷取技能列、地圖、技能與操作設定。測試會透過遊戲輸入開關選單，確認暫停期間的移動、滑鼠轉向與施法不會影響遊戲，並於返回後實際移動角色。

## iPhone 17 Pro Max 裝置封裝

在 Mac 安裝 UE 5.8 的 iOS 平台元件、iPhoneOS SDK 與 Metal 編譯器。從 `Unreal/TibetPilgrimage` 執行下列命令。若工作區尚無產生的關卡，先依專案 README 完成 `build-editor` 和 `generate`。

```sh
python3 Tools/tibet.py package --platform IOS --unsigned \
  --archive "$PWD/Builds/IOS/TibetPilgrimage.xcarchive"
```

此命令以 iPhoneOS 為目標編譯，cook 所有列在 DefaultGame.ini 的關卡，並把未簽署的裝置用執行檔和遊戲內容寫進 Xcode archive。若 `--archive` 指向一般目錄，輸出位於其下的 `IOS/TibetPilgrimage.xcarchive`。檢查 archive 根層的 Info.plist，以及 Products/Applications/TibetPilgrimage.app 內的執行檔、裝置平台和 cooked 資料。

裝置安裝需要與 Bundle ID 相符的開發團隊、簽章及佈建描述檔。簽署者可在具備簽署資源的 Mac 上用下列命令建立 Development 套件，並用 Xcode 安裝到啟用開發者模式、已配對的 iPhone。

```sh
python3 Tools/tibet.py package --platform IOS --archive "$PWD/Builds/Signed"
```

UE 5.8 的通常輸出為 Builds/Signed/IOS/TibetPilgrimage.app。將連接裝置的啟動、橫向觸控、讀檔及關卡轉場結果另行記錄。

[西藏 UE 模組移植驗收](Module-audit.md) 逐項對照網頁客戶端、伺服器與原生遊戲。執行 `python3 -m unittest discover -s QA` 可核對每個原始模組都有且只有一個盤點項目。
