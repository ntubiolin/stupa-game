# 第二次試玩的 UE 回歸測試

Web 的 268 個單元測試執行 JavaScript。UE 使用另一份 C++ 角色、場景、HUD 和存檔實作。先前的 Mac 測試會確認十隻敵人可擊倒、主線能走完，但同一個雪人模型連續出場十次也能符合條件。這次分別檢查模型身分、存活數和實際畫面。完整原作範圍見[模組盤點](Module-audit.md)。

| 玩家觀察 | Three.js 的依據與已有測試 | UE 驗收 |
| --- | --- | --- |
| 沒有配音、對話框位置、E 顯示位置 | 原作冒險台詞在 src/data/dialogues，對話與指示測試含 bossDialogues、quest-indicators-audit。storyAudio 測的是影片故事模式。 | test_dialogue.py 讀取 22 個原生交談目標的雙語台詞。Mac 以 AVFoundation 產生中英語音，並在兩種畫面尺寸實際交談，記錄發音進度、字幕範圍及角色與傳送門的世界座標提示。 |
| 第一個戰鬥地區的敵種、首領光圈 | src/gameplay/enemies.js、bosses/bossBase.js。issue-210-feedback 測難度、首領場地和攻擊行為。 | test_wilderness.py 在北郊辨認三個同時存活的不同模型，第一次打到 1/10，重開後完成剩餘九隻與雪人王。核對逐次扣血、平常沒有王足圈、王移動時跟隨，並從截圖檢查光圈像素。 |
| 唐卡世界地圖、道具設定 | src/ui/worldmap.js、src/systems/inventory.js；adventure-compat、shop-interaction、boss-loot-interaction 涵蓋不同物品來源與存檔。 | test_atlas_parity.py 比對原作九個據點座標與連線。原生遊戲另驗證唐卡、章節詳情、裝卸、消耗、快捷欄與重開存檔。 |
| 大佛塔猴群、油燈、隨風飄動的經幡 | src/gameplay/monkeys.js、lamps.js、src/world/prayerFlags.js；monkey-feeding-game、quick-lamp-245 及瀏覽器猴子小遊戲有行為覆蓋。 | capture_courtyard.py 在大佛塔靠近猴子、操作餵食與供燈、重啟續玩；同一機位比較間隔兩幀的彩布及其後的固定建築。 |
| 晚上怎麼測、右上角 4× | 原作的環境、天空與操作來自 src/world/sky.js 與 src/ui/hud.js。 | 同一個庭院測試操作右上時間控制，量測 4× 的經過時間，比較白天與夜間的畫面亮度，並確認夜間仍能看清建物。 |

GitHub 的 Linux 檢查執行 Web 建置、雙語字典、Web 單元與瀏覽器測試，以及能跨平台運作的 UE 資料檢查。包含像素、原生輸入與系統語音的驗收須在有 UE 的 Mac 對當次封裝執行。證據含遊戲程式與 cook 雜湊、實際事件及玩家視角 PNG。iPhone 的語音輸出、螢幕安全區、多指操作和幀率須用已簽署的同版遊戲另驗。

在儲存庫根目錄可用同一條命令執行五組 Mac 驗收。各組會寫入獨立目錄，個別失敗也會繼續跑完其餘組別，最後核對五組程式和 cook 檔案的雜湊。

```sh
python3 Unreal/TibetPilgrimage/QA/playtest_366.py \
  --exe "$HOME/Downloads/TibetPilgrimage/Mac/TibetPilgrimage.app/Contents/MacOS/TibetPilgrimage" \
  --output "/tmp/tibet-qa-$(date +%Y%m%d-%H%M%S)"
```
