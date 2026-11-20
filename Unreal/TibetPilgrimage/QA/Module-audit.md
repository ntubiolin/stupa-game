# 西藏 UE 移植驗收（#350）

盤點基準為包含 #345 的 `f59bb49`，網頁來源取自相同 checkout。以西藏冒險的玩家入口、`ARCHITECTURE.md`、UE 的 runtime、關卡產生器與實際封裝交叉核對。下表每個連結都是獨立來源；同一列的模組共用同一項驗收結論。檔案數只描述盤點範圍。遊戲功能的完成度以可操作的行為判定。

## 先驗證再修改

| 驗證對象 | 已觀察到的結果與範圍 |
| --- | --- |
| Web | `npm run build`、`npm run check:i18n` 兩種語言各 3,221 個鍵，以及 `npm test` 的 268 項通過。[基線 PR 的 GitHub 檢查](https://github.com/ntubiolin/stupa-game/pull/346/checks) |
| UE 建置與工具 | Mac Development 封裝可啟動。7 項 Python 工具測試涵蓋封裝與圖片檢查。Editor 掃過 11 張關卡、269 個目標位置及 64 段膠囊碰撞路線。[Mac 驗收](Evidence/Mac-playtest.md) |
| Mac 實際遊玩 | `play` 使用單獨的新存檔驗證洛桑、繞塔、點燈、關閉重開、十張主線地圖、結局及塔林往返。`arrival` 獨立核對玩家鏡頭；主線導覽本身會轉向目標。七技能基線僅驗接受施法與截圖，缺乏怪物受傷以及 HUD 可讀性的斷言。[重現步驟](README.md) |
| iPhone | 基線有未簽署的 arm64 裝置 Archive 與 cook 索引。瀏海、安全區、兩指施法、鏡頭、幀率以及真機續玩仍待簽署裝置實測。[iOS 封裝紀錄](Evidence/iOS-build.md) |

## 模組對照

部分表示有原生對應但仍有差異。未移植表示檢查過客戶端、封裝配置與入口後找不到對應行為。範圍外用於獨立遊戲模式或開發工具。具體已實測的行為與未驗項目列在同一行。

| 玩家功能 | 狀態 | 原生依據、實測與缺口 | 網頁與服務來源 |
| --- | --- | --- | --- |
| 入口、模式與渲染初始化 | 部分 | UE 啟動 TibetGameMode 並可進入博達哈。網頁還會載入模式選擇、整套冒險模組與個別畫質選項。驗收 `arrival`、`play`。 | [6 個來源](#module-1) |
| 事件、輸入與角色 | 部分 | UE 以角色、控制器與 GameMode 接收移動、互動和施法。網頁事件匯流排的訂閱者包含未移植的系統。驗收 `arrival`、`play`。 | [3 個來源](#module-2) |
| 探索鏡頭 | 部分 | ATibetCharacter 與 spring arm 控制第三人稱鏡頭。舊 `arrival` 覆蓋右鍵拖曳與鬆開穩定，垂直方向、不同幀率及設定另見 #348。 | [1 個來源](#module-3) |
| 關卡與跨區 | 部分 | UE cook 11 張地圖，含五章、原野、博達哈、塔林與三層伏藏。以 OpenLevel、固定目標、地形和場景生成器重建。驗收 `play`、`photos`、`verify_world.py`。 | [19 個來源](#module-4) |
| 佛塔與環境美術 | 部分 | tibet_landscapes.py、tibet_surfaces.py 和 generate_tibet.py 重建大佛塔、外圈民居、經幡、光照及場景。場景截圖、碰撞與首屏有實測，動態環境及所有 Web 物件未逐一對齊。 | [5 個來源](#module-5) |
| 繞塔、點燈與供養 | 部分 | 博達哈可依序繞塔、點三盞燈，重開能看見燈焰並續接同一個計數。個人／社群供養面板未移植。驗收 `play` 的 first-lamp 與 campaign。 | [2 個來源](#module-6) |
| 進度與本機存檔 | 部分 | UTibetSave 在跨圖、任務、語言更新時保存。主線、塔林與中途供燈皆有重開驗證。未提供 Web 的 stupa.save.v2 匯入或完整角色、裝備資料。 | [1 個來源](#module-7) |
| 主線任務與章節進度 | 部分 | export_route.mjs 讀取序章與五章的任務及雙語文本，再映射到八種原生目標。例如桑耶守夜簡化成 Combat。play 完成結局，原作特殊機制與完整任務日誌仍有缺口。 | [15 個來源](#module-8) |
| NPC、對話與互動 | 部分 | 靠近目標後按 E 交談、跟隨單一護送者或操作祭壇。路線表每次交談抽取一段台詞。對應多節點對話、獨立 NPC 同時活動與圖鑑超連結均有缺口。驗收 `play`。 | [16 個來源](#module-9) |
| 當地怪物與首領 | 部分 | GameMode 生成當前任務目標、追擊、造成傷害與重生。守衛模型由 build_guardians.py 等工具生成。通關有覆蓋，區域族群、每一種首領招式、菁英詞綴及多目標 AI 的原作行為沒有對等驗證。 | [19 個來源](#module-10) |
| 技能、法力、傷害與目標 | 部分 | 原生 CastSkill、Health、Mana、冷卻及章節解鎖。原 `skills` 僅依序施放七招、檢查日誌與截圖；命中、扣血與技能視效驗收追蹤於 #347。裝備加成、經驗及完整數值曲線未移植。 | [8 個來源](#module-11) |
| 護法與盟友 | 部分 | 原生有護法施法及護送目標。完整隊伍、各護法的持續 AI、裝備和進度未對應。 | [2 個來源](#module-12) |
| 遊戲 HUD、技能列與選單 | 部分 | 基線 HUD 只有生命、法力、文字互動與觸控按鈕，桌面缺少常駐技能列及可瀏覽的選單。#349 追蹤實際可見的介面與操作驗收。 | [5 個來源](#module-13) |
| 世界地圖、雷達與傳送點 | 部分 | 主線可按 E 跨圖，HUD 會給目標方位。基線無世界地圖視窗。#349 追蹤路線地圖，原作當區雷達縮放、傳送點系統仍有缺口。 | [3 個來源](#module-14) |
| 本地化 | 部分 | GameMode::Local 與路線表提供中英，存檔保存語言。check:i18n 驗證網頁字典；UE 的文字與排版須另以兩種語言在封裝檢查。 | [1 個來源](#module-15) |
| 伏藏洞室與地城 | 部分 | 原生三層手製洞室各有地標、戰鬥及取得教法的流程。play 走完三層；Web 的程序生成、探索採集與掉寶系統未移植。 | [3 個來源](#module-16) |
| 個人佛塔建造 | 部分 | play 可進入行者塔林、開光與返回。原版材料、塔型、自訂配置與建造面板未移植。 | [4 個來源](#module-17) |
| 難度、菁英與神壇 | 未移植 | 未找到原生難度配置、菁英詞綴組合、護佑神壇或相應儲存欄位。 | [4 個來源](#module-18) |
| 裝備、掉寶、製作、商店與成長 | 未移植 | UTibetSave 沒有物品、詞綴、裝備、消耗品、功德或傳奇能力欄位，HUD 沒有裝備與商店入口。 | [14 個來源](#module-19) |
| 角色外觀 | 未移植 | 原生使用固定行者模型，無捏角、染色、外觀保存或操作面板。 | [3 個來源](#module-20) |
| 文化圖鑑與壁畫 | 未移植 | UE 匯出對話時移除圖鑑連結。無圖鑑解鎖狀態、可翻閱的頁面或壁畫卷軸。 | [14 個來源](#module-21) |
| 餵猴小遊戲 | 未移植 | UE 無可餵食的猴群、食物收集及對應小遊戲入口。 | [3 個來源](#module-22) |
| 配樂、環境音與人聲 | 未移植 | 未找到接上冒險音樂、法音人聲庫或區域交叉淡化的原生音訊來源。 | [4 個來源](#module-23) |
| 雲端存檔、帳號、分析與伺服器 | 未移植 | 原生客戶端只寫入本機，沒有對接現有認證、保存、分析、presence 或遊戲服務。Web 服務的獨立測試與 UE 驗收分開。 | [10 個來源](#module-24) |
| 多人與社群 | 未移植 | 原生未連線至社群或 WebSocket，缺少大廳、遠端玩家、協作和線上供養資料。 | [11 個來源](#module-25) |
| 製作名單 | 未移植 | 原生返回佛塔即可完成結局，缺 Web 的製作名單介面。 | [1 個來源](#module-26) |
| 開發用練習場與預覽任務 | 範圍外 | Web 開發模式可進入 sandbox 及測試對話。UE 的命令列 QA 使用獨立存檔與正式西藏地圖。 | [4 個來源](#module-27) |
| 日本巡禮 | 範圍外 | 此 UE 專案與 cook 清單只有西藏線，沒有日本地圖、空海同伴、妖怪、建築及詞典。 | [35 個來源](#module-28) |
| 鏡像敘事、手機、影像與紀錄片 | 範圍外 | ARCHITECTURE 將此模式與西藏冒險分開。原生無獨立敘事啟動器、手機、攝影、回憶或紀錄片，亦未使用此模式的音訊與鏡頭。 | [58 個來源](#module-29) |

## 後續驗收順序

1. 優先重測玩家正在操作的技能與受擊、鏡頭方向和速度、可見技能列與地圖；分別見 [#347](https://github.com/ntubiolin/stupa-game/issues/347)、[#348](https://github.com/ntubiolin/stupa-game/issues/348)、[#349](https://github.com/ntubiolin/stupa-game/issues/349)。
2. 若要達到西藏冒險玩法對等，下一批應從背包與掉落、首領獨有攻擊、區域音訊和進度保存開始，分別驗證取得、使用及重開後的狀態。這些功能仍需實作。
3. 把完成的版本簽署安裝到 iPhone，在同一場遭遇同時移動、轉向、開選單、攻擊，測量畫面更新及觸控可讀性；Mac 觸控預覽僅驗配置。

[原生遊戲流程](../Source/TibetPilgrimage/TibetGameMode.cpp) · [章節轉換](../Tools/export_route.mjs) · [關卡生成](../Tools/generate_tibet.py) · [封裝關卡清單](../Config/DefaultGame.ini) · [專案架構](../../../ARCHITECTURE.md)

## 逐檔來源

<a id="module-1"></a>

<details><summary>入口、模式與渲染初始化（6）</summary>

- [src/adventure.js](../../../src/adventure.js)
- [src/config.js](../../../src/config.js)
- [src/main.js](../../../src/main.js)
- [src/style.css](../../../src/style.css)
- [src/ui/modeSwitch.css](../../../src/ui/modeSwitch.css)
- [src/ui/modeSwitch.js](../../../src/ui/modeSwitch.js)

</details>

<a id="module-2"></a>

<details><summary>事件、輸入與角色（3）</summary>

- [src/core/events.js](../../../src/core/events.js)
- [src/core/input.js](../../../src/core/input.js)
- [src/player/player.js](../../../src/player/player.js)

</details>

<a id="module-3"></a>

<details><summary>探索鏡頭（1）</summary>

- [src/player/cameraRig.js](../../../src/player/cameraRig.js)

</details>

<a id="module-4"></a>

<details><summary>關卡與跨區（19）</summary>

- [src/data/maps.js](../../../src/data/maps.js)
- [src/data/maps/chimphu.js](../../../src/data/maps/chimphu.js)
- [src/data/maps/grove.js](../../../src/data/maps/grove.js)
- [src/data/maps/mangyul.js](../../../src/data/maps/mangyul.js)
- [src/data/maps/pharping.js](../../../src/data/maps/pharping.js)
- [src/data/maps/samye.js](../../../src/data/maps/samye.js)
- [src/data/maps/terma.js](../../../src/data/maps/terma.js)
- [src/data/maps/yarlung.js](../../../src/data/maps/yarlung.js)
- [src/i18n/maps.js](../../../src/i18n/maps.js)
- [src/systems/zones.js](../../../src/systems/zones.js)
- [src/world/mapBase.js](../../../src/world/mapBase.js)
- [src/world/maps/chimphu.js](../../../src/world/maps/chimphu.js)
- [src/world/maps/grove.js](../../../src/world/maps/grove.js)
- [src/world/maps/mangyul.js](../../../src/world/maps/mangyul.js)
- [src/world/maps/pharping.js](../../../src/world/maps/pharping.js)
- [src/world/maps/samye.js](../../../src/world/maps/samye.js)
- [src/world/maps/terma.js](../../../src/world/maps/terma.js)
- [src/world/maps/yarlung.js](../../../src/world/maps/yarlung.js)
- [src/world/wilderness.js](../../../src/world/wilderness.js)

</details>

<a id="module-5"></a>

<details><summary>佛塔與環境美術（5）</summary>

- [src/world/environment.js](../../../src/world/environment.js)
- [src/world/prayerFlags.js](../../../src/world/prayerFlags.js)
- [src/world/sky.js](../../../src/world/sky.js)
- [src/world/stupa.js](../../../src/world/stupa.js)
- [src/world/tibetanSurfaces.js](../../../src/world/tibetanSurfaces.js)

</details>

<a id="module-6"></a>

<details><summary>繞塔、點燈與供養（2）</summary>

- [src/gameplay/lamps.js](../../../src/gameplay/lamps.js)
- [src/ui/lampOffering.js](../../../src/ui/lampOffering.js)

</details>

<a id="module-7"></a>

<details><summary>進度與本機存檔（1）</summary>

- [src/systems/save.js](../../../src/systems/save.js)

</details>

<a id="module-8"></a>

<details><summary>主線任務與章節進度（15）</summary>

- [src/data/quests/ch1.js](../../../src/data/quests/ch1.js)
- [src/data/quests/ch2.js](../../../src/data/quests/ch2.js)
- [src/data/quests/ch3.js](../../../src/data/quests/ch3.js)
- [src/data/quests/ch4.js](../../../src/data/quests/ch4.js)
- [src/data/quests/ch5.js](../../../src/data/quests/ch5.js)
- [src/data/quests/prologue.js](../../../src/data/quests/prologue.js)
- [src/i18n/ch1.js](../../../src/i18n/ch1.js)
- [src/i18n/ch2.js](../../../src/i18n/ch2.js)
- [src/i18n/ch3.js](../../../src/i18n/ch3.js)
- [src/i18n/ch4.js](../../../src/i18n/ch4.js)
- [src/i18n/ch5.js](../../../src/i18n/ch5.js)
- [src/i18n/prologue.js](../../../src/i18n/prologue.js)
- [src/i18n/quests.js](../../../src/i18n/quests.js)
- [src/systems/quests.js](../../../src/systems/quests.js)
- [src/ui/quests.js](../../../src/ui/quests.js)

</details>

<a id="module-9"></a>

<details><summary>NPC、對話與互動（16）</summary>

- [src/data/dialogues/ch1.js](../../../src/data/dialogues/ch1.js)
- [src/data/dialogues/ch2.js](../../../src/data/dialogues/ch2.js)
- [src/data/dialogues/ch3.js](../../../src/data/dialogues/ch3.js)
- [src/data/dialogues/ch4.js](../../../src/data/dialogues/ch4.js)
- [src/data/dialogues/ch5.js](../../../src/data/dialogues/ch5.js)
- [src/data/dialogues/prologue.js](../../../src/data/dialogues/prologue.js)
- [src/data/npcs.js](../../../src/data/npcs.js)
- [src/data/npcs/ch1.js](../../../src/data/npcs/ch1.js)
- [src/data/npcs/ch2.js](../../../src/data/npcs/ch2.js)
- [src/data/npcs/ch3.js](../../../src/data/npcs/ch3.js)
- [src/data/npcs/ch4.js](../../../src/data/npcs/ch4.js)
- [src/data/npcs/ch5.js](../../../src/data/npcs/ch5.js)
- [src/gameplay/npcs.js](../../../src/gameplay/npcs.js)
- [src/i18n/npcs.js](../../../src/i18n/npcs.js)
- [src/systems/interaction.js](../../../src/systems/interaction.js)
- [src/ui/dialogue.js](../../../src/ui/dialogue.js)

</details>

<a id="module-10"></a>

<details><summary>當地怪物與首領（19）</summary>

- [src/data/enemies/mangyul.js](../../../src/data/enemies/mangyul.js)
- [src/data/enemies/pharping.js](../../../src/data/enemies/pharping.js)
- [src/data/enemies/samye.js](../../../src/data/enemies/samye.js)
- [src/data/enemies/yarlung.js](../../../src/data/enemies/yarlung.js)
- [src/gameplay/bosses/bossBase.js](../../../src/gameplay/bosses/bossBase.js)
- [src/gameplay/bosses/droughtLord.js](../../../src/gameplay/bosses/droughtLord.js)
- [src/gameplay/bosses/index.js](../../../src/gameplay/bosses/index.js)
- [src/gameplay/bosses/migoiKing.js](../../../src/gameplay/bosses/migoiKing.js)
- [src/gameplay/bosses/patterns.js](../../../src/gameplay/bosses/patterns.js)
- [src/gameplay/bosses/pehar.js](../../../src/gameplay/bosses/pehar.js)
- [src/gameplay/bosses/tenmaStorm.js](../../../src/gameplay/bosses/tenmaStorm.js)
- [src/gameplay/bosses/termaGuardian.js](../../../src/gameplay/bosses/termaGuardian.js)
- [src/gameplay/bosses/yarlhaShampo.js](../../../src/gameplay/bosses/yarlhaShampo.js)
- [src/gameplay/enemies.js](../../../src/gameplay/enemies.js)
- [src/gameplay/enemyModels/mangyul.js](../../../src/gameplay/enemyModels/mangyul.js)
- [src/gameplay/enemyModels/pharping.js](../../../src/gameplay/enemyModels/pharping.js)
- [src/gameplay/enemyModels/samye.js](../../../src/gameplay/enemyModels/samye.js)
- [src/gameplay/enemyModels/yarlung.js](../../../src/gameplay/enemyModels/yarlung.js)
- [src/i18n/bosses.js](../../../src/i18n/bosses.js)

</details>

<a id="module-11"></a>

<details><summary>技能、法力、傷害與目標（8）</summary>

- [src/data/skills.js](../../../src/data/skills.js)
- [src/gameplay/mantra.js](../../../src/gameplay/mantra.js)
- [src/gameplay/projectiles.js](../../../src/gameplay/projectiles.js)
- [src/gameplay/skills/activeSkills.js](../../../src/gameplay/skills/activeSkills.js)
- [src/gameplay/targeting.js](../../../src/gameplay/targeting.js)
- [src/i18n/skills.js](../../../src/i18n/skills.js)
- [src/systems/skills.js](../../../src/systems/skills.js)
- [src/systems/vitals.js](../../../src/systems/vitals.js)

</details>

<a id="module-12"></a>

<details><summary>護法與盟友（2）</summary>

- [src/data/protectors.js](../../../src/data/protectors.js)
- [src/gameplay/allies.js](../../../src/gameplay/allies.js)

</details>

<a id="module-13"></a>

<details><summary>遊戲 HUD、技能列與選單（5）</summary>

- [src/i18n/settings.js](../../../src/i18n/settings.js)
- [src/ui/hud.js](../../../src/ui/hud.js)
- [src/ui/settings.js](../../../src/ui/settings.js)
- [src/ui/skillIcons.js](../../../src/ui/skillIcons.js)
- [src/ui/skillbar.js](../../../src/ui/skillbar.js)

</details>

<a id="module-14"></a>

<details><summary>世界地圖、雷達與傳送點（3）</summary>

- [src/gameplay/waypoints.js](../../../src/gameplay/waypoints.js)
- [src/ui/minimap.js](../../../src/ui/minimap.js)
- [src/ui/worldmap.js](../../../src/ui/worldmap.js)

</details>

<a id="module-15"></a>

<details><summary>本地化（1）</summary>

- [src/i18n.js](../../../src/i18n.js)

</details>

<a id="module-16"></a>

<details><summary>伏藏洞室與地城（3）</summary>

- [src/gameplay/dungeon.js](../../../src/gameplay/dungeon.js)
- [src/gameplay/termaCaves.js](../../../src/gameplay/termaCaves.js)
- [src/i18n/termaCaves.js](../../../src/i18n/termaCaves.js)

</details>

<a id="module-17"></a>

<details><summary>個人佛塔建造（4）</summary>

- [src/data/stupaMaterials.js](../../../src/data/stupaMaterials.js)
- [src/gameplay/personalStupa.js](../../../src/gameplay/personalStupa.js)
- [src/i18n/stupaBuild.js](../../../src/i18n/stupaBuild.js)
- [src/ui/stupaBuilder.js](../../../src/ui/stupaBuilder.js)

</details>

<a id="module-18"></a>

<details><summary>難度、菁英與神壇（4）</summary>

- [src/data/combatSettings.js](../../../src/data/combatSettings.js)
- [src/data/eliteAffixes.js](../../../src/data/eliteAffixes.js)
- [src/gameplay/shrines.js](../../../src/gameplay/shrines.js)
- [src/i18n/elites.js](../../../src/i18n/elites.js)

</details>

<a id="module-19"></a>

<details><summary>裝備、掉寶、製作、商店與成長（14）</summary>

- [src/data/affixes.js](../../../src/data/affixes.js)
- [src/data/itemBases.js](../../../src/data/itemBases.js)
- [src/data/legendaries.js](../../../src/data/legendaries.js)
- [src/gameplay/groundLoot.js](../../../src/gameplay/groundLoot.js)
- [src/gameplay/items.js](../../../src/gameplay/items.js)
- [src/gameplay/potions.js](../../../src/gameplay/potions.js)
- [src/i18n/items.js](../../../src/i18n/items.js)
- [src/systems/inventory.js](../../../src/systems/inventory.js)
- [src/systems/loot.js](../../../src/systems/loot.js)
- [src/systems/merit.js](../../../src/systems/merit.js)
- [src/systems/powers.js](../../../src/systems/powers.js)
- [src/ui/crafting.js](../../../src/ui/crafting.js)
- [src/ui/inventory.js](../../../src/ui/inventory.js)
- [src/ui/shop.js](../../../src/ui/shop.js)

</details>

<a id="module-20"></a>

<details><summary>角色外觀（3）</summary>

- [src/data/appearance.js](../../../src/data/appearance.js)
- [src/i18n/appearance.js](../../../src/i18n/appearance.js)
- [src/ui/appearance.js](../../../src/ui/appearance.js)

</details>

<a id="module-21"></a>

<details><summary>文化圖鑑與壁畫（14）</summary>

- [src/data/codex.js](../../../src/data/codex.js)
- [src/data/codex/ch1.js](../../../src/data/codex/ch1.js)
- [src/data/codex/ch2.js](../../../src/data/codex/ch2.js)
- [src/data/codex/ch3.js](../../../src/data/codex/ch3.js)
- [src/data/codex/ch4.js](../../../src/data/codex/ch4.js)
- [src/data/codex/ch5.js](../../../src/data/codex/ch5.js)
- [src/data/murals.js](../../../src/data/murals.js)
- [src/i18n/codex.js](../../../src/i18n/codex.js)
- [src/i18n/muralPrototype.js](../../../src/i18n/muralPrototype.js)
- [src/i18n/murals.js](../../../src/i18n/murals.js)
- [src/systems/codex.js](../../../src/systems/codex.js)
- [src/ui/mural/scroll.js](../../../src/ui/mural/scroll.js)
- [src/ui/muralPrototype.css](../../../src/ui/muralPrototype.css)
- [src/ui/muralPrototype.js](../../../src/ui/muralPrototype.js)

</details>

<a id="module-22"></a>

<details><summary>餵猴小遊戲（3）</summary>

- [src/gameplay/monkeyFeedingGame.js](../../../src/gameplay/monkeyFeedingGame.js)
- [src/gameplay/monkeys.js](../../../src/gameplay/monkeys.js)
- [src/i18n/monkeyGame.js](../../../src/i18n/monkeyGame.js)

</details>

<a id="module-23"></a>

<details><summary>配樂、環境音與人聲（4）</summary>

- [src/data/mantraVocalBank.js](../../../src/data/mantraVocalBank.js)
- [src/data/music.js](../../../src/data/music.js)
- [src/systems/audio.js](../../../src/systems/audio.js)
- [src/systems/music.js](../../../src/systems/music.js)

</details>

<a id="module-24"></a>

<details><summary>雲端存檔、帳號、分析與伺服器（10）</summary>

- [api/analytics/play.js](../../../api/analytics/play.js)
- [api/auth/google.js](../../../api/auth/google.js)
- [api/save.js](../../../api/save.js)
- [server/analyticsStore.js](../../../server/analyticsStore.js)
- [server/auth.js](../../../server/auth.js)
- [server/handler.js](../../../server/handler.js)
- [server/index.js](../../../server/index.js)
- [server/saveStore.js](../../../server/saveStore.js)
- [src/systems/analytics.js](../../../src/systems/analytics.js)
- [src/systems/cloudSave.js](../../../src/systems/cloudSave.js)

</details>

<a id="module-25"></a>

<details><summary>多人與社群（11）</summary>

- [api/community.js](../../../api/community.js)
- [api/coop.js](../../../api/coop.js)
- [api/presence.js](../../../api/presence.js)
- [server/store.js](../../../server/store.js)
- [server/ws.js](../../../server/ws.js)
- [src/gameplay/remotePilgrims.js](../../../src/gameplay/remotePilgrims.js)
- [src/i18n/community.js](../../../src/i18n/community.js)
- [src/i18n/coop.js](../../../src/i18n/coop.js)
- [src/systems/community.js](../../../src/systems/community.js)
- [src/systems/coop.js](../../../src/systems/coop.js)
- [src/ui/coopLobby.js](../../../src/ui/coopLobby.js)

</details>

<a id="module-26"></a>

<details><summary>製作名單（1）</summary>

- [src/ui/credits.js](../../../src/ui/credits.js)

</details>

<a id="module-27"></a>

<details><summary>開發用練習場與預覽任務（4）</summary>

- [src/core/debug.js](../../../src/core/debug.js)
- [src/data/dialogues/debug.js](../../../src/data/dialogues/debug.js)
- [src/data/quests/debug.js](../../../src/data/quests/debug.js)
- [src/world/maps/sandbox.js](../../../src/world/maps/sandbox.js)

</details>

<a id="module-28"></a>

<details><summary>日本巡禮（35）</summary>

- [src/data/enemies/japanYokai.js](../../../src/data/enemies/japanYokai.js)
- [src/data/japan.js](../../../src/data/japan.js)
- [src/data/japanCampaign.js](../../../src/data/japanCampaign.js)
- [src/data/japanSkills.js](../../../src/data/japanSkills.js)
- [src/data/maps/japanPilgrimage.js](../../../src/data/maps/japanPilgrimage.js)
- [src/data/maps/japanYokai.js](../../../src/data/maps/japanYokai.js)
- [src/data/maps/koyasan.js](../../../src/data/maps/koyasan.js)
- [src/data/maps/toji.js](../../../src/data/maps/toji.js)
- [src/gameplay/enemyModels/japanYokai.js](../../../src/gameplay/enemyModels/japanYokai.js)
- [src/gameplay/japanCampaignModels.js](../../../src/gameplay/japanCampaignModels.js)
- [src/gameplay/skills/japanSkillVisuals.js](../../../src/gameplay/skills/japanSkillVisuals.js)
- [src/gameplay/skills/kukaiCompanion.js](../../../src/gameplay/skills/kukaiCompanion.js)
- [src/i18n/japanCampaign.js](../../../src/i18n/japanCampaign.js)
- [src/i18n/japanMaps.js](../../../src/i18n/japanMaps.js)
- [src/i18n/japanSkills.js](../../../src/i18n/japanSkills.js)
- [src/i18n/japanYokai.js](../../../src/i18n/japanYokai.js)
- [src/i18n/koyasan.js](../../../src/i18n/koyasan.js)
- [src/i18n/toji.js](../../../src/i18n/toji.js)
- [src/player/japanPilgrim.js](../../../src/player/japanPilgrim.js)
- [src/systems/japanCampaign.js](../../../src/systems/japanCampaign.js)
- [src/ui/japanCampaign.css](../../../src/ui/japanCampaign.css)
- [src/ui/japanCampaign.js](../../../src/ui/japanCampaign.js)
- [src/world/japanArchitecture.js](../../../src/world/japanArchitecture.js)
- [src/world/japanGardenArchitecture.js](../../../src/world/japanGardenArchitecture.js)
- [src/world/japanLandmarkLighting.js](../../../src/world/japanLandmarkLighting.js)
- [src/world/japanLandmarkLoader.js](../../../src/world/japanLandmarkLoader.js)
- [src/world/japanSeasonalDrift.js](../../../src/world/japanSeasonalDrift.js)
- [src/world/japanTreeWind.js](../../../src/world/japanTreeWind.js)
- [src/world/japanUnderstory.js](../../../src/world/japanUnderstory.js)
- [src/world/japanVegetation.js](../../../src/world/japanVegetation.js)
- [src/world/maps/japanPilgrimage.js](../../../src/world/maps/japanPilgrimage.js)
- [src/world/maps/japanYokai.js](../../../src/world/maps/japanYokai.js)
- [src/world/maps/koyasan.js](../../../src/world/maps/koyasan.js)
- [src/world/maps/toji.js](../../../src/world/maps/toji.js)
- [src/world/tojiCourtyard.js](../../../src/world/tojiCourtyard.js)

</details>

<a id="module-29"></a>

<details><summary>鏡像敘事、手機、影像與紀錄片（58）</summary>

- [src/data/story/beats.js](../../../src/data/story/beats.js)
- [src/data/story/chapters.js](../../../src/data/story/chapters.js)
- [src/data/story/chapters/chimphu.js](../../../src/data/story/chapters/chimphu.js)
- [src/data/story/chapters/finale.js](../../../src/data/story/chapters/finale.js)
- [src/data/story/chapters/mangyul.js](../../../src/data/story/chapters/mangyul.js)
- [src/data/story/chapters/pharping.js](../../../src/data/story/chapters/pharping.js)
- [src/data/story/chapters/samye.js](../../../src/data/story/chapters/samye.js)
- [src/data/story/chapters/yarlung.js](../../../src/data/story/chapters/yarlung.js)
- [src/data/story/documentary.js](../../../src/data/story/documentary.js)
- [src/data/story/phonePrologue.js](../../../src/data/story/phonePrologue.js)
- [src/data/story/phoneRecords.js](../../../src/data/story/phoneRecords.js)
- [src/data/story/phoneThreads.js](../../../src/data/story/phoneThreads.js)
- [src/data/story/photography.js](../../../src/data/story/photography.js)
- [src/i18n/storyArt.js](../../../src/i18n/storyArt.js)
- [src/i18n/storyChapters.js](../../../src/i18n/storyChapters.js)
- [src/i18n/storyChimphu.js](../../../src/i18n/storyChimphu.js)
- [src/i18n/storyDebug.js](../../../src/i18n/storyDebug.js)
- [src/i18n/storyDirector.js](../../../src/i18n/storyDirector.js)
- [src/i18n/storyDocumentary.js](../../../src/i18n/storyDocumentary.js)
- [src/i18n/storyFinale.js](../../../src/i18n/storyFinale.js)
- [src/i18n/storyMangyul.js](../../../src/i18n/storyMangyul.js)
- [src/i18n/storyPharping.js](../../../src/i18n/storyPharping.js)
- [src/i18n/storyPhone.js](../../../src/i18n/storyPhone.js)
- [src/i18n/storyPhotography.js](../../../src/i18n/storyPhotography.js)
- [src/i18n/storyRuntime.js](../../../src/i18n/storyRuntime.js)
- [src/i18n/storySamye.js](../../../src/i18n/storySamye.js)
- [src/i18n/storyVideo.js](../../../src/i18n/storyVideo.js)
- [src/i18n/storyYarlung.js](../../../src/i18n/storyYarlung.js)
- [src/story/chapterDirector.js](../../../src/story/chapterDirector.js)
- [src/story/characters/losang.js](../../../src/story/characters/losang.js)
- [src/story/cinematicArt.js](../../../src/story/cinematicArt.js)
- [src/story/launcher.css](../../../src/story/launcher.css)
- [src/story/memorySystem.js](../../../src/story/memorySystem.js)
- [src/story/narrativeCamera.css](../../../src/story/narrativeCamera.css)
- [src/story/narrativeCamera.js](../../../src/story/narrativeCamera.js)
- [src/story/runtime.css](../../../src/story/runtime.css)
- [src/story/runtime.js](../../../src/story/runtime.js)
- [src/story/storyAudio.js](../../../src/story/storyAudio.js)
- [src/story/storyDirector.js](../../../src/story/storyDirector.js)
- [src/story/world/chimphuScene.js](../../../src/story/world/chimphuScene.js)
- [src/story/world/finaleScene.js](../../../src/story/world/finaleScene.js)
- [src/story/world/mangyulScene.js](../../../src/story/world/mangyulScene.js)
- [src/story/world/pharpingScene.js](../../../src/story/world/pharpingScene.js)
- [src/story/world/samyeScene.js](../../../src/story/world/samyeScene.js)
- [src/story/world/wellShadow.js](../../../src/story/world/wellShadow.js)
- [src/story/world/yarlungScene.js](../../../src/story/world/yarlungScene.js)
- [src/ui/story/chapterJournal.css](../../../src/ui/story/chapterJournal.css)
- [src/ui/story/chapterJournal.js](../../../src/ui/story/chapterJournal.js)
- [src/ui/story/chapterStills.js](../../../src/ui/story/chapterStills.js)
- [src/ui/story/cueVideo.js](../../../src/ui/story/cueVideo.js)
- [src/ui/story/debugPanel.css](../../../src/ui/story/debugPanel.css)
- [src/ui/story/debugPanel.js](../../../src/ui/story/debugPanel.js)
- [src/ui/story/documentary.css](../../../src/ui/story/documentary.css)
- [src/ui/story/documentary.js](../../../src/ui/story/documentary.js)
- [src/ui/story/losangStill.js](../../../src/ui/story/losangStill.js)
- [src/ui/story/phone.css](../../../src/ui/story/phone.css)
- [src/ui/story/phone.js](../../../src/ui/story/phone.js)
- [src/ui/story/photography.css](../../../src/ui/story/photography.css)

</details>
