# 第三人稱鏡頭

## 四款遊戲的操作

| 遊戲與平台 | 官方文件描述的行為 |
| --- | --- |
| 《Final Fantasy XIV》Windows／Mac 鍵鼠 | 左鍵拖曳可環顧四周並保留角色朝向。右鍵拖曳會讓角色一起轉向。玩家也能選擇以鏡頭方向為基準的移動方式。[Square Enix 操作手冊](https://na.finalfantasyxiv.com/game_manual/operation/) |
| 《Guild Wars 2》PC 鍵鼠 | 一般操作可以按住右鍵轉動視角。玩家另行開啟動作鏡頭後，移動滑鼠就會轉向，對話與選單會暫停該模式。[ArenaNet 操作說明](https://www.guildwars2.com/en/news/introducing-the-action-camera/) |
| 《The Last of Us Part I》PS5 手把 | 跟隨移動方向的鏡頭輔助可以關閉，也能只輔助水平或垂直方向。玩家可分別調整視野、鏡頭距離及晃動強度。[Naughty Dog 無障礙說明](https://blog.playstation.com/2022/08/26/the-last-of-us-part-i-full-list-of-accessibility-features/) |
| 《Horizon Forbidden West》PS4／PS5 手把 | 玩家可以反轉 X 或 Y 軸，調整類比搖桿的靈敏度和死區。[Guerrilla 控制器說明](https://blog.playstation.com/2022/02/10/accessibility-features-in-horizon-forbidden-west/) |

## 蓮師巡禮的選擇

繞塔時，玩家可以一直看著佛塔，用 A、D 橫移。只有按住右鍵拖曳才會轉動桌面視角，鬆開後停在原來的朝向。方向與距離需要由玩家掌握，尤其是在塔前抬頭看佛眼，或在門廊下側身通過時。

| 操作情境 | 本作設定與原因 |
| --- | --- |
| 滑鼠拖曳 | 預設向右拖就向右看，往上拖就抬頭。每 100 個原始輸入單位水平轉 10°、垂直轉 8.5°，以便繞塔時細調高度。讀取滑鼠位移後立即轉向，同一段拖曳在不同幀率下轉過相同角度。 |
| 個人手感 | 鏡頭靈敏度可設為 0.5 至 2 倍，預設 1 倍。垂直反轉只改變上下方向。兩項偏好保存在裝置上，所有旅程共用。 |
| 近看建築 | 可向上看 72°、向下看 62°。抬頭超過 9° 時，鏡頭可以繼續仰望，但攝影機支臂維持高度，讓近處的塔剎也能入鏡。 |
| 通過牆角 | 攝影機以半徑 16 公分探測障礙，遇牆立即收近。離牆後約 0.37 秒拉回可用距離的九成，保留原本觀看方向。 |
| 手機橫向 | 右側手指拖曳才會轉向，左側拇指控制移動。按照螢幕高度換算拖曳，使用相同的靈敏度與反轉偏好。 |

以上角度與速度依本作塔院尺度設定。可在 UE Automation 中執行 `Tibet.Camera` 核對上下方向、反轉、幀率和牆角距離，再以實際封裝的 `arrival` 試玩核對滑鼠輸入至鏡頭的完整路徑。
