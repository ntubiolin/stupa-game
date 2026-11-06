# 後續章節路線／ADR-002（規劃，尚未實作）

追蹤：#89 → Epic #68 Story 7–8。基準：PR #80，`1a817fe`。使用者於 2026-11-06 明確選擇「保留獨立 ARPG，故事章節以探索為主」。所有 PR 交由使用者驗收與合併，禁止自動合併 master。

## 產品決策與交付範圍

《鏡中之人》繼續以第一人稱探索、環境操作、固定手機劇本與記憶資料推進。原《蓮師足跡》的戰鬥、技能、裝備、掉寶、Boss、多人共鬥、歷史地圖與存檔保留在冒險模式。故事不要求刷裝、練級或擊敗 Boss；這不是刪除戰鬥，也不把兩套玩家進度混在一起。

本輪交付章節工作圖與可執行契約，並另票改善洛桑；沒有宣稱全章可玩。第一個新增可玩章節是帕平試作，通過完整操作、讀檔、藝術/節奏與文化檢查後才擴充其餘章。章節時長是設計假設，以真人試玩校準；不靠鎖定下一頁或延長走路來湊時數。

## 原作與企劃核對

本次透過 Google Drive 讀取完整最新版（2026-11-06），不是從 Epic 猜測後續劇情：

- [企劃](https://docs.google.com/document/d/1j7xtbVYcviIUwD9j2QQT0Lfze_Mq3iRZLdo3K3M0sgA/edit)，revision `AHj4eMToKKWpChIqKv5rDEE6ziW6zvcSRvMz7ab3LU7pbcxb4lVWeAUyPGyZ1UZ49RU3u_biCgM0rFeLvLwJQ2jwMpVhxZrhW0IXpzuZUA8`。
- [小說](https://docs.google.com/document/d/1fUhMiSfSkdkKEUU63s2gojF5Br6rqfdXyeVjsIb3zJw/edit)，revision `AHj4eMQn4b8-Qf1FUNbjaBT5K8prRUxffeIUmEiwOVlSK_cW9NT05toT8RQgg2qGQ_sy55UiBN2KoOCGLhCEhcb_sB75hMDwbUk21YFFjLE`。

目前 Demo 濃縮序章、第一/二章及第三章的短篇淨相。正式第三章不能只把同樣三張卡再播一次；保留既有完成檔，明確提供「繼續旅程」並說明是完整探索。小說第二章的洛桑是老喇嘛，#84 已更正原本錯誤的修復工作者描述；#90 改善場景佔位人物。人物五官/具體服飾仍是待核准美術提案，不能當作原文事實。

## 章節與可操作內容

| 原文章節 | 既有地圖 | 玩家實際操作／可見回饋 | 帶回現實的內容 | ARPG 保留 |
|---|---|---|---|---|
| 3 乾涸的泉水 | `pharping` | 清理泉眼、疏通水道、歸還經函；觀察抱住枯井的影子，泉水恢復 | 新日記與對保存記憶的理解 | 旱災那伽王、普巴金剛橛、雨後地圖與原任務 |
| 4 風雪中的十二位女神 | `mangyul` | 沿山脊尋路/避風，十二祭壇的觀察與選擇，結經幡 | 出發太晚的遺憾；固定 AI 對話 | 暴風雪、護送、丹瑪 Boss、金剛鈴杵/護法 |
| 5 白犛牛 | `yarlung` | 觀察恐懼、停下、搬開碎石，白犛牛由緊張轉安靜 | 映真治療期記憶與「代理不是她」 | 雅拉香波 Boss、蓮花生護輪、白犛牛護法 |
| 6 晝建夜毀 | `samye` | 搬放一組石木、夜間損毀、再次修建；見證誓願 | 與 2015 修塔對照，付出不只為永久成果 | 五階段建寺、守城、白哈爾、蓮師心咒/護法 |
| 7–8 最後一段訊息／伏藏 | `chimphu` | 現代旅途，核對保管文件、領取布包/信、洞窟光點 | 原始信件、石板移交記錄 | 青朴與 Tier 1–10 伏藏秘境照常 |
| 9 寫給未來的你／終章 一盞燈 | `chimphu` → `stupa` | 翻信、離線交付選擇、交還石板、繞塔點燈、手寫日誌 | 保留的私人資料與開放尾聲 | 可回主選單繼續既有冒險 |

十二祭壇的未明述台詞、宗教圖像、服飾、現代交通轉場等，先列 cue sheet 與來源審核；不要自行宣稱為小說逐字內容。影子、白犛牛、歷史人物不在故事模式成為可攻擊目標。章節內容不以掉寶或戰力給情感選擇評分。

## 工程依據與邊界

- `src/main.js` 以文件導航選擇 `src/adventure.js` 或 `src/story/runtime.js`；保持各自 ctx、事件 bus、輸入與場景生命週期。切換前 `ctx.save.flush()`；只走既有模式入口，不把 adventure bootstrap 載入故事頁。
- 冒險戰鬥維持 `gameplay/skills/activeSkills.js`、`systems/skills.js`、`gameplay/enemies.js`、bosses、inventory、vitals、coop 的既有 API；故事不得呼叫 `quests.skipTo()` 批量授予等級/裝備/任務。
- 冒險旅程的章節解鎖仍經 quests → waypoints；`zones.teleport()` 不檢查關卡解鎖，不能拿來作故事跳往戰鬥章節的正式入口。
- 重用 `world/maps` 不代表可以直接啟動全部地圖系統：Samye 會讀寫冒險 `samye` 狀態及 quests；其他地圖可能訂閱任務/天氣事件。必須提供明確 presentation adapter，不能只隱藏敵人和 HUD。
- 目前 scoped story save 會在寫入前刷新非 story sections，但 adventure 預設 serializer 尚未證明能保留另一分頁的新 story 寫入。雙向跨分頁安全是待驗證項目，不是既有保證。

## 擬定介面契約（foundation 票實作前凍結）

以下均為設計，尚未新增公開 runtime API。既有 [ADR-001](contracts.md) 的 Demo API 保持相容。

1. `src/data/story/chapters.js`：靜態白名單章節。每筆 `{id, mapId, entryCheckpoint, checkpoints, nextChapterId, requiredEvidence}`；checkpoint 指定地圖/姿態/有效 signal/下一節/證據。僅容許 `pharping`, `mangyul`, `yarlung`, `samye`, `chimphu`, `stupa` 地圖；不用外部 URL 載入任意模組。
2. `createChapterDirector(ctx)` → `ctx.chapters`：`getState()` 回副本；`canStart(id)` 驗證前章完成及證據；`start(id)` 僅明確使用者操作；`signal(name,payload)` 只接受當前 checkpoint 的登錄事件；`replay(id)` 使用 transient session；`exit()` 回安全的現代停靠點並保存。日記閱讀用章節專屬 signal，不能沿用 Demo 的 `return:read` 自動完成後章。
3. 單一持久化擁有者：由 storyDirector/store 提供受控 chapter transaction，chapterDirector **不得另外註冊 story serializer 或持有另一份會覆寫 story 的快照**。持久化一個合法轉移後才發事件；重入與重複 signal 不重發證據。
4. 新事件使用 `story:chapter-start {chapterId,checkpointId}`、`story:checkpoint {chapterId,checkpointId}`、`story:chapter-complete {chapterId}`；不改原 `story:beat-start`/`story:clip-end`。以 session token 拒絕舊 map/media callback；cancel 不等於完成，replay 不完成新 checkpoint。
5. `createNarrativeWorld(ctx)` → `load(mapId,{checkpointId,signal})`, `restore(presentationState)`, `dispose()`：顯示已登錄 map factory、地形高度與碰撞，回 `{spawn,getHeight,dispose}`。以取消 token/AbortSignal 使過期載入無效；載入失敗保留上一個可恢復 checkpoint，提供重試/返回。所有 presentation listeners 必須可解除；無 dispose 的共享 factory 可先用文件重載達成乾淨 reset，不能留下重複場景。
6. map adapter 只能看到必要的 render/terrain/time 狀態及章節自己的 presentation flags；不把 adventure `save`, `quests`, `coop` 直接透傳。Samye 若需要 factory opt-in 參數，預設行為必須完全維持 adventure；每個 mode 各自建場景，不共享可變 singleton。
7. UI 維持鍵盤與觸控的顯式操作、暫停/跳過/重播與視覺焦點；互動不能都退化成閱讀卡片。手機證據採 chapter-specific IDs，固定劇本標記來源。影片尚未交付不阻塞章節，使用標記來源的靜圖/文字 fallback。

交易順序必須在 #91 明確實作：保留 `lastCommittedCheckpoint`，先 prepare 載入並驗證目的地 presentation；成功後才 commit 新 checkpoint，最後發布事件。若選擇先保存 pending destination，必須另存上一個可用 checkpoint 並讓重載能選擇重試/返回，不得把 pending 當作已完成。取消、載入錯誤與遲到 callback 不提交。現有 `ctx.save.set()` 僅排隊、`flush()` 無成功回傳；foundation 必須加入向後相容的寫入結果/錯誤事件或等效確認機制，由 UI 依確認結果顯示保存成功／失敗，不以呼叫 flush 代表寫入成功。必測 quota/security/storage failure 與 load/commit 間重新整理；這是待實作要求，非目前 API 能力。

資源所有權要區分 instance 與共享 module cache：不得以全 scene traverse 無差別 dispose 共享 geometry/material/texture；adapter 明列所擁有的資源與 listeners/audio/RAF cleanup。無法證明共享資源可安全釋放時，使用文件重載切換。0 新增 PointLight 以及切換前後 active lights 都須 assert，不能只測單張地圖首次載入。

### 擬定存檔遷移

根檔仍為 `stupa.save.v2`，且只寫 `story` section。建議故事內部 version 2：保留所有 version 1 的 `beat`, `choices`, `flags`, `evidence`, `clipsSeen`, `elapsedSeconds`，新增 `journey: {activeChapterId:null, chapters:{}}`。每章保存 `{checkpointId, completed, choices, flags}`，型別/ID/陣列上限皆驗證。具體 schema 由 foundation 實作與測試定稿。

- v1 的 `complete` 保持完成，`journey.activeChapterId=null`；不能把新 beats 接在 terminal complete 後讓舊存檔意外推進。`start('pharping')` 須使用者選擇並通過 canStart。
- v1 任一中途檔保持原 beat 與已讀手機，不因導入 chapter 系統重置序章。
- unsupported future version 只讀/回復提示，不覆寫；corrupt optional journey 可隔離處理但不能默默丟掉原證據。保存失敗不可顯示已保存。
- 重播隔離於 transient state；正式完成、證據與選擇只授予一次。章節重開與重置整段故事須分開，後者明確確認且不觸及冒險。
- 原有 `skipTo` 為 debug；不能授予合法下一章權限作為玩家通關邏輯。
- 舊版應用遇到新版 section 的行為也必須測試；在回退測試通過前，不讓同一使用者混用兩個已部署 schema 版本。保留匯出原始存檔的復原路徑。
- Adventure 的 load/normalize/import/flush 路徑須以 opaque passthrough 保存 `story` 中的新版/未知欄位；不能只有新版 storyDirector 會保留，卻在冒險寫入時丟失。#91/#92 必測 migration → adventure save → story reload 及 export/import round-trip。

## 最小帕平試作與工作分配

工作圖（皆為 PLANNED，非已完成）：

| Ticket | 交付 | 前置 |
|---|---|---|
| [#91](https://github.com/ntubiolin/stupa-game/issues/91) | 章節續玩/store/map adapter 基礎 | #89 契約 |
| [#92](https://github.com/ntubiolin/stupa-game/issues/92) | ARPG 舊檔/戰鬥驗證基準 | #89，可與 #91 平行 |
| [#93](https://github.com/ntubiolin/stupa-game/issues/93) | 帕平可玩試作 | #91、#92 |
| [#94](https://github.com/ntubiolin/stupa-game/issues/94) | 芒域十二祭壇 | #93 驗收 |
| [#95](https://github.com/ntubiolin/stupa-game/issues/95) | 雅隆白犛牛 | #94 |
| [#96](https://github.com/ntubiolin/stupa-game/issues/96) | 桑耶建造循環 | #95 |
| [#97](https://github.com/ntubiolin/stupa-game/issues/97) | 青朴訊息與交付 | #96 |
| [#98](https://github.com/ntubiolin/stupa-game/issues/98) | 信件與點燈尾聲 | #97 |

依賴代表整章玩家進度與驗收順序；後章可先準備經核准的素材與資料，但不能把未完成前章的進度當作已驗證。各票 acceptance 為詳細交付契約。洛桑 [#90](https://github.com/ntubiolin/stupa-game/issues/90) 可獨立改善現有 Demo，不依賴整個章節框架。

進入現代停靠點 → 主動看地圖 → 帕平泉眼三個實際操作 → 觀察守井影子/原文對話 → 水流/雨 → 回到現代讀新日記 → 可重讀/返回主選單。完成點必須可由 UI 到達，不用 debug 注入。首次 Demo 的簡版淨相仍可重播；不以原 `new-diary` 冒充新章已讀。

原生 GPT-6.1 Sol 工作者在各自 worktree：A 章節資料/遷移（不寫 runtime），B 帕平場景操作/材質（不寫 story store），C 固定手機/日記/字幕（不寫共享 i18n loader）。Lead 獨佔 main/adventure/runtime、註冊與合併；每票獨立 branch/PR。先定 API，後平行實作；AGY `gemini-4-argon-high --output-format json` 僅唯讀審查，結果由 lead 核對。

後章的角色/片段需求沿用 #84/#85 的格式，但另按章節列 asset ID；不要求 Dot 在目前四鏡之外自行擴拍。洛桑目前使用自製程序模型，最終人物圖另行審核。文化圖像與偽史料風險不能靠增加幾何細節解決。

## 驗證門檻

- 每個實作 PR：build、i18n、狀態/存檔 meaningful tests；章節完整 UI 操作桌機/觸控、checkpoint 恢復、錯序/重入、ESC/暫停/skip/replay、媒體失敗與離線 fallback。
- 保存非故事 sections 前後逐項比較；另測冒險在 story 更新前後保存，不宣稱單方向 refresh 就是跨分頁完整解決。
- ARPG 基準：施放 humBolt 明確 assert 成功與效果，裝備後屬性、技能/冷卻、玩家正式 waypoint 鎖定、歷史地圖、多人基本流程。現有測試僅檢查 coop API 存在，遠端聯機要單獨記錄環境/結果。
- 美術：同一距離/視角的桌機手機畫面，文字可讀、人物比例、0 新增 PointLight、draw calls/triangles；軟體 WebGL FPS 不當作實機效能結論。
- 節奏/原作與宗教表現人工驗收；總時數及低階手機 FPS 不在未實測時承諾。每個 checkpoint 在無影片情況仍應可操作完成。

## 合併與風險

PR #80 尚未合併。規劃與洛桑修正各自基於 `1a817fe`，PR 以 #80 分支為 base 以顯示乾淨差異；由使用者決定先接入 #80 或等待其合併後再 rebase 到 master，不能重複 cherry-pick。章節生產分支須基於人類核准的基礎版本，PR 描述寫出依賴與未合併狀態。

獨立 ARPG 的保留決策已確認，無需再次請求。尚未核准的是最終人物外觀、宗教視覺與大規模章節節奏；先在可玩的帕平和洛桑場景做具體驗收，避免先量產全章才發現方向不對。
