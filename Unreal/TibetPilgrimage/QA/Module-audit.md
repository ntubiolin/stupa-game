# 西藏 UE 移植驗收（#350）

基線對照使用 #345 的 `f59bb49`。核對範圍包含西藏網頁冒險入口、原生遊戲流程、HUD、存檔欄位、關卡生成及既有封裝紀錄。文末將 `src`、`api`、`server` 的 274 個 JavaScript 與 CSS 檔案各列一次。逐檔檢查可以發現清單遺漏，玩法是否相符仍須看各列的操作和證據。[盤點測試](test_module_inventory.py)

[第二次試玩的十項驗收與原作測試對照](Playtest-366.md) 記錄 #366 的新增行為與覆蓋範圍。

## 基線驗證

| 驗證對象 | 已觀察到的結果與範圍 |
| --- | --- |
| Web | #346 的 GitHub 檢查 18/18 通過。本機建置成功，雙語字典各有 3,221 個鍵，268 項 Web 單元測試通過。以下 UE 封裝證據另有版本與平台紀錄。[基線 PR 檢查](https://github.com/ntubiolin/stupa-game/actions/runs/44729623841) |
| UE 建置與工具 | Mac Development 封裝可啟動。7 項 Python 工具測試涵蓋封裝與圖片檢查。初版 `58902052.0.7` 的 Editor 檢查了 11 張關卡、269 個目標位置及 64 段膠囊碰撞路線。[Mac 驗收](Evidence/Mac-playtest.md) |
| Mac 實際遊玩 | `play` 用獨立存檔驗證洛桑交談、繞塔、供燈中途重開、十張主線地圖及結局，另以支線存檔驗證塔林往返。導覽會轉向目標。#345 的 `arrival` 另測正常開場、單純移動游標、按住右鍵拖曳及放開後側行。初版七招施法各有事件與截圖，未逐招核對傷害、防護或 HUD 可讀性。[Mac 紀錄](Evidence/Mac-playtest.md) · [重現步驟](README.md) |
| iPhone | 初版留有未簽署的 arm64 裝置 Archive 與 cook 索引。尚缺對應版本的簽署真機遊玩，包括安全區、兩指施法、鏡頭、幀率與續玩。[iOS 封裝紀錄](Evidence/iOS-build.md) |

## 整合版玩家實測

這次原生包取自 `1a39eec`。五組 Mac 驗收輸出的執行檔與 Cook 資料雜湊相同。在 Apple Silicon Mac 的北郊原野，我們用一般鍵盤打開 M 地圖、用 K 切到法術、用 Esc 回到角色，接著向前走、用空白鍵與 R 擊中目標。第一隻怪被調伏時任務從 0/10 變成 1/10。下一隻的紅色血條從三格縮到兩格，頭頂同時出現 −1。法力與冷卻顯示在角色下方的技能列。

| 操作 | 可重跑的驗收與結果 |
| --- | --- |
| 鏡頭 | `arrival` 在同一個玩家視角測得開場仰角 5.00°、水平 0.00°。按住右鍵拖曳後為 6.70° 與 6.00°；放開、側行並移動游標後仍是 6.70° 與 6.00°。另跑 `Tibet.Camera` 的方向／幀率與靠牆恢復兩項測試，均通過。[官方案例與本作設定](../Camera.md) |
| 命中與擊倒 | `skills` 在七場獨立遭遇中對照施法、特效和敵人血量。守藏者初始 9 HP，各招依序實扣 1、2、3、3、0、4、6。蓮盾當下啟動防護，施放超出射程的六字真言保持 9 HP；最後一擊從 3 HP 歸零時顯示 −3。[玩家畫面](Evidence/native-phurba.jpg) |
| 技能列與地圖 | 桌面從 HUD 開啟 M 地圖、K 技能及 Esc 操作設定，繁中及英文均驗證分頁切換、暫停、返回後移動。884 × 420 Mac 觸控預覽用真正的 Slate 點按開啟與關閉地圖、恢復移動；離屏視窗首輪失敗，改在可見前景視窗重測通過。地圖涵蓋十一關與到訪狀態，原作的地區雷達、快速旅行、裝備與圖鑑面板仍未移植。[世界地圖畫面](Evidence/native-worldmap.jpg) |
| 完整路線 | `play` 的六段均通過。交談後重開讀回第一步，第一盞燈點亮後重開恢復 1/3，走完十張主線地圖並經青浦回到博達哈結局。另以新存檔經南門進入塔林，裝藏後返回。主線共保存 69 張玩家 HUD 實拍。 |
| 技能與舊存檔 | `learned` 以玩家操作走過伏藏第三層出口、青浦與博達哈，再關閉重開。回程存檔的七招全數保留，上師心咒可施放；新存檔只有光彈、真言，按 T 不扣法力。|
| iPhoneOS 封裝 | 同一份程式碼已產生未簽署的 arm64 裝置 archive。IoStore 檢查含 11 關、287 個分區場景素材、14 個角色／儀式素材以及全域與專案的 iOS Metal 著色器。此機未連接可用 iPhone，亦無可用簽署身分與描述檔。 |

## 模組對照（修正前基線）

「部分」表示同列至少一項玩家操作有原生對應，缺項逐項列出。「未移植」表示基線的原生入口、實作與資料皆找不到該操作。「範圍外」指獨立模式或開發工具。「待驗」用於已有實作但欠缺特定平台或行為證據的項目。同一列可同時有已實測的行為、尚未移植的機制及待驗條件。

| 玩家功能 | 狀態 | 原生依據、實測與缺口 | 網頁與服務來源 |
| --- | --- | --- | --- |
| 入口、模式與渲染初始化 | 部分 | UE 直接開啟博達哈。Web 預設開冒險，`?mode=home` 顯示模式選擇，`?mode=story` 另啟敘事。Web 會依裝置調整渲染，設定頁提供難度、鏡頭跟隨及人聲選項。驗收 `arrival`、`play`。 | [6 個來源](#module-1) |
| 事件、輸入與角色 | 部分 | UE 的角色、控制器及 GameMode 接收移動、互動與施法。Web 的 Q 鍵大禮拜可獲功德及恢復，基線 UE 無此入口。驗收 `arrival`、`play`。 | [3 個來源](#module-2) |
| 探索鏡頭 | 部分 | 原生角色與彈簧臂控制視角。#345 的 `arrival` 確認右鍵拖曳使兩軸變動，放開後移動游標及側行可保持朝向。此紀錄未判定垂直方向、靈敏度或不同幀率的手感，見 #348。 | [1 個來源](#module-3) |
| 關卡與跨區 | 部分 | Web 西藏冒險登錄 9 個地圖 ID，UE 封裝 11 關。兩者的伏藏分層與地名見下表。原生用 OpenLevel 與當前任務目標串接主線，塔林有獨立入口。主線與支線通行有 `play` 紀錄，未逐條重現 Web 的閘門與傳送網。 | [19 個來源](#module-4) |
| 佛塔與環境美術 | 部分 | tibet_landscapes.py、tibet_surfaces.py 和 generate_tibet.py 重建大佛塔、外圈民居、經幡、光照及場景。場景截圖、碰撞與首屏有實測，動態環境及所有 Web 物件未逐一對齊。 | [5 個來源](#module-5) |
| 繞塔、點燈與供養 | 部分 | 博達哈可依序繞塔、點三盞燈，重開後首盞燈焰及進度均保留。Web 近身轉經輪可得功德，並有選擇供處、填寫迴向、查看剩餘燃燈時間、添酥油及分享燈碼的供養面板。原生經輪為場景物件，基線沒有這些操作。驗收 `play` 的 first-lamp 與 campaign。 | [2 個來源](#module-6) |
| 進度與本機存檔 | 部分 | UTibetSave 記錄關卡、任務步驟與計數、語言及結局等旗標。重開實測覆蓋洛桑交談及首盞供燈。塔林支線測試會指定塔林為新程序的起始圖，據此可確認裝藏與返回大塔。一般啟動自動續回塔林、後期章節續玩及語言重開保留待分別驗證。原生缺 Web 備份匯入／匯出及裝備資料。 | [1 個來源](#module-7) |
| 主線任務與章節進度 | 部分 | export_route.mjs 擷取序章與五章任務及雙語文本，映射到八種原生目標。例如桑耶守夜簡化成 Combat。`play` 已到達結局。基線缺 Web 的 J 任務日誌、進行／完成清單、最多三項追蹤切換及任務壁畫重播。 | [15 個來源](#module-8) |
| NPC、對話與互動 | 部分 | 靠近當前目標按 E 可交談、開始護送或操作祭壇。路線匯出每次交談保留一段台詞，缺原作的多節點對話、回應、圖鑑連結及多個獨立 NPC 同時互動。驗收 `play`。 | [16 個來源](#module-9) |
| 當地怪物與首領 | 部分 | 原生每次產生當前任務目標，敵方追擊並造成接觸傷害。玩家耗盡生命後回到起點再開遭遇。主線通關有紀錄，基線缺原作區域怪群、菁英詞綴及首領各自的攻擊模式。 | [19 個來源](#module-10) |
| 技能、法力、傷害與目標 | 部分 | 原生 CastSkill、生命、法力、冷卻及章節解鎖已有實作。初版 `skills` 驗證七招被接受及留下截圖，攻擊各自命中／扣血、蓮盾防護及視效辨識仍需行為驗證。技能點、Rank 3 分支、裝備加成及完整成長曲線未移植。見 #347。 | [8 個來源](#module-11) |
| 護法與盟友 | 部分 | 原生可召喚護法攻擊當前敵人，也有護送目標。Web 在 K 技能頁可選擇 tenma、whiteYak 或 pehar，召喚後各有盟友行為。基線 UE 缺護法選擇及各自的 AI。 | [2 個來源](#module-12) |
| 遊戲 HUD、技能列與選單 | 部分 | UE 顯示生命、法力、任務目標、距離、互動與操作提示，觸控模式有九個按鍵。桌面基線缺常駐七格技能列、K 技能點配置／重置、行者指南與功德重置、成就、H 隱藏 HUD、日夜／季節與聲音控制。Web 手機戰鬥有拇指弧形技能盤及藥水。見 #349。 | [5 個來源](#module-13) |
| 世界地圖、雷達與傳送點 | 部分 | UE 可按 E 進入下一關，有任務方向提示。基線缺 Web 的 M 四頁（當區地圖及圖例、世界路線、圖鑑、壁畫）、可縮放小地圖、解鎖傳送點選擇及回城後可循門返回的操作。#349 追蹤原生路線地圖。 | [3 個來源](#module-14) |
| 本地化 | 部分 | GameMode::Local 與路線表提供中英，存檔保存語言。check:i18n 驗證網頁字典；UE 的文字與排版須另以兩種語言在封裝檢查。 | [1 個來源](#module-15) |
| 伏藏洞室與地城 | 部分 | UE 的三張固定關卡有地標、戰鬥及傳承目標，`play` 已走完。Web 的 terma 地圖另有程序生成、階層及掉寶，五章野外的伏藏洞又有守護、取卷及解讀流程。基線 UE 缺這兩套完整玩法。 | [3 個來源](#module-16) |
| 個人佛塔建造 | 部分 | 原生可進塔林、裝藏及返回博達哈。基線缺 Web 建塔面板的四類塔身組件、預覽、銘文及安奉配置，也缺第二頁桑耶千零八塔的供獻與共同進度。 | [4 個來源](#module-17) |
| 難度、菁英與神壇 | 未移植 | 未找到原生難度配置、菁英詞綴組合、護佑神壇或相應儲存欄位。 | [4 個來源](#module-18) |
| 裝備、掉寶、製作、商店與成長 | 未移植 | UTibetSave 沒有物品、詞綴、裝備、消耗品、功德或傳奇能力欄位。沒有 Web 的 I／C 背包與屬性頁、裝備比較／穿脫、商店買賣及工匠拆解／重鑄面板。 | [14 個來源](#module-19) |
| 角色外觀 | 未移植 | 原生使用固定行者模型。缺 Web 的 V 正面人像、法號、五官／法衣／莊嚴具選擇、旋轉與姿勢預覽及外觀保存。 | [3 個來源](#module-20) |
| 文化圖鑑與壁畫 | 未移植 | UE 匯出對話時移除圖鑑連結。基線缺圖鑑解鎖、分類／閱讀及正篇章節壁畫卷軸／回放。Web 設定中需密碼的壁畫原型另屬開發預覽。 | [14 個來源](#module-21) |
| 餵猴小遊戲 | 未移植 | Web 可快速餵香蕉，也可玩五輪依猴子提示選香蕉、蘋果或桃子的遊戲，記錄最高分及遊玩次數。UE 基線缺猴群互動與餵食面板。 | [3 個來源](#module-22) |
| 配樂、環境音與人聲 | 未移植 | 未找到接上冒險音樂、法音人聲庫或區域交叉淡化的原生音訊來源。 | [4 個來源](#module-23) |
| 雲端存檔、帳號、分析與伺服器 | 未移植 | 原生只寫本機，缺 Web 的 Google 登入、雲端同步／衝突取捨、備份檔匯出／匯入、分析與服務端連線。 | [10 個來源](#module-24) |
| 多人與社群 | 未移植 | 原生未連線至社群或 WebSocket，缺大廳、遠端玩家、合作組隊、線上供燈及桑耶共同建造的貢獻紀錄。 | [11 個來源](#module-25) |
| 製作名單 | 未移植 | UE 返回博達哈可完成主線。基線缺 Web 結局名單、已收集圖鑑／最高伏藏層數統計及參考來源畫面。 | [1 個來源](#module-26) |
| 開發用練習場與預覽任務 | 範圍外 | Web 開發模式可進入 sandbox 及測試對話。UE 的命令列 QA 使用獨立存檔與正式西藏地圖。 | [4 個來源](#module-27) |
| 日本巡禮 | 範圍外 | 此 UE 專案與 cook 清單只有西藏線，沒有日本地圖、空海同伴、妖怪、建築及詞典。 | [35 個來源](#module-28) |
| 鏡像敘事、劇中手機、影像與紀錄片 | 範圍外 | ARCHITECTURE 將此模式與西藏冒險分開。原生無獨立敘事啟動器、手機、攝影、回憶或紀錄片，亦未使用此模式的音訊與鏡頭。 | [58 個來源](#module-29) |

### 西藏地圖名稱與關卡數

進入 UE 時顯示 GameMode 的關卡名稱。表中的 Web 名稱取自 `map.*` 繁中字典，有章節專用長名時一併列出。識別碼用來對照兩邊的場景與存檔。[Web 地圖登錄與字典](#module-4) · [章節字典](#module-8) · [原生名稱](../Source/TibetPilgrimage/TibetGameMode.cpp)

| Web 識別碼 | Web 地名（基本字典／章節長名） | UE 識別碼與地名 |
| --- | --- | --- |
| stupa | 博達哈大佛塔 | stupa 博達哈大佛塔 |
| grove | 祈願塔林 | grove 行者塔林 |
| wild | 北郊原野 | wild 北郊原野 |
| pharping | 帕平・揚列雪 | pharping 帕平・揚列雪 |
| mangyul | 芒域山口／芒域山口・吉隆 | mangyul 芒域・吉隆山口 |
| yarlung | 雅隆河谷／雅隆河谷・雅拉香波 | yarlung 雅礱河谷 |
| samye | 海波日山・桑耶／海波日山・桑耶寺 | samye 桑耶寺 |
| chimphu | 青朴修行地 | chimphu 青浦修行地 |
| terma | 伏藏秘境 | terma1 伏藏・地窟、terma2 伏藏・水晶、terma3 伏藏・虛空 |

## 後續驗收順序

1. 修改戰鬥或 HUD 時，重跑封裝的 `skills`、`learned`、`arrival` 和 `journal`，並從普通玩家鏡頭目視檢查施法軌跡、扣血與選單。追蹤見 [#347](https://github.com/ntubiolin/stupa-game/issues/347)、[#348](https://github.com/ntubiolin/stupa-game/issues/348)、[#349](https://github.com/ntubiolin/stupa-game/issues/349)。
2. 若要達到西藏冒險玩法對等，下一批可從背包與掉落、首領獨有攻擊、區域音訊和進度保存開始，分別驗證取得、使用及重開後的狀態。這些功能仍需實作。
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

<details><summary>鏡像敘事、劇中手機、影像與紀錄片（58）</summary>

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
