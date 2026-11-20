# 東寺金堂畫質驗證

在同一台機器分別開啟網頁版和 UE Development 打包版。七個場景使用 [同一份鏡位](toji-views.json)，畫面為 1920 × 1080，垂直視角 55°。三維座標以東寺本地公尺為單位。UE 工具會轉成公分及水平視角。記錄實際的畫質設定和測試機器；先結束其他 GPU 工作，再做效能比較。

先在儲存庫執行 `npm run build`，啟動 `npm run preview -- --host 127.0.0.1 --port 4173`，再於另一個終端機執行：

```sh
BROWSER_CHANNEL=chrome STORY_BASE_URL=http://127.0.0.1:4173 node scripts/toji-unreal-baseline.mjs
```

依 [原生專案說明](../StupaPilgrimage/README.md) 產生關卡並打包。進入遊戲，由南側走到金堂，完成對話、供燈、三次結界試煉，重開遊戲核對進度。保留遊玩過程錄影與使用的設定，將操作結果和相機截圖分開記錄。

以下命令會啟動七次打包版，用各自的暫存使用者目錄拍攝。傳入 Mac app 的真正可執行檔、網頁報告目錄及新的輸出路徑：

```sh
python3 Unreal/QA/compare_toji.py \
  --executable '/path/to/StupaPilgrimage.app/Contents/MacOS/StupaPilgrimage' \
  --web artifacts/unreal-toji/web/after \
  --output artifacts/unreal-toji/comparison
```

完成後開啟輸出的 `index.html`。每張圖可點選放大，JSON 包含圖片 SHA-256、建置／GPU 資訊、投影與幀間隔。腳本會檢查原始 PNG 尺寸、雜湊和相機設定，將缺失的拍攝結果視為錯誤。每個固定鏡位的短取樣與 15 分鐘遊玩效能驗收屬於不同的量測。
