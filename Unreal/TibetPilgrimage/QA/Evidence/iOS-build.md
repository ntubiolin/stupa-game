# iPhone 待簽署裝置版

2026 年 11 月 20 日，Unreal 5.8.4 和 Xcode 26.1.1 以 Development 組態完成 iPhone 裝置 Archive。原生 Xcode Archive 內含遊戲、啟動畫面、框架及 dSYM。發行目錄另提供由同一個 `.app` 封裝的待簽署 IPA。

| 驗收項目 | 結果 |
| --- | --- |
| 執行檔 | Mach-O arm64，目標 `iPhoneOS`，使用 iOS SDK 26.1。Bundle ID 為 `org.stupagame.tibetpilgrimage`。支援左右橫向。 |
| 手機遊戲內容 | 從 Archive 內的 IoStore 索引逐一確認 11 張 `.umap`、行動版 Metal 著色器及 `M_RitualColor` 技能材質。 |
| 地圖相容性 | 關卡生成時移除桌面匯入器留下的 38 筆註記。處理前後逐項比對 107 個 Actor、38 組網格的座標、階層、材質及碰撞設定，結果一致。 |
| 裝置安裝 | 本次交付未使用開發者身分簽署或嵌入佈建描述檔。iPhone 17 Pro Max 實機安裝、雙指操作與幀率留待簽署後驗證。 |

可在專案目錄執行 `python3 Tools/tibet.py package --platform IOS --unsigned` 重建。iPhone 簽署及開發版封裝步驟見 [打包操作](../README.md)。

本機 Xcode 26.1.1 的 iPhoneOS SDK build 為 `23B77`。Xcode 的對照表指定相容平台元件 `23B86`，安裝後 `Any iOS Device` 才能作為 Archive 目的地。在相同 SDK 與症狀下，可使用 `xcodebuild -downloadPlatform iOS -buildVersion 23B86 -architectureVariant arm64` 取得對應元件。
