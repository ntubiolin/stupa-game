# 遠景地形

六個現實地點各取以場址附近為中心的 22 × 22 公里高程。89 × 89 個樣本由西向東、由南向北排列，格距約 250 公尺。地圖建置時水平及垂直均壓縮為 1/50，中央保留可行走的前景，向外平滑接至取樣地形。小塔林、北郊原野及三層伏藏保留原創地貌。這些資料描述區域地形，建築由美術建模。

| 場址附近取樣中心 | 地圖 |
| --- | --- |
| 博達哈 | [27.7214 N, 85.3620 E](https://www.openstreetmap.org/?mlat=27.7214&mlon=85.3620#map=16/27.7214/85.3620) |
| 帕平 | [27.6175 N, 85.2665 E](https://www.openstreetmap.org/?mlat=27.6175&mlon=85.2665#map=15/27.6175/85.2665) |
| 吉隆河谷 | [28.3933 N, 85.3292 E](https://www.openstreetmap.org/?mlat=28.3933&mlon=85.3292#map=13/28.3933/85.3292) |
| 雅礱・雍布拉康 | [29.1426 N, 91.8027 E](https://www.openstreetmap.org/?mlat=29.1426&mlon=91.8027#map=15/29.1426/91.8027) |
| 桑耶 | [29.3265 N, 91.5025 E](https://www.openstreetmap.org/?mlat=29.3265&mlon=91.5025#map=15/29.3265/91.5025) |
| 青普 | [29.350 N, 91.556 E](https://www.openstreetmap.org/?mlat=29.350&mlon=91.556#map=14/29.350/91.556) |

資料來自 Mapzen / AWS Terrain Tiles (Terrarium, z10)。SRTM and GMTED2010 terrain data courtesy of the U.S. Geological Survey. Global ETOPO1 data courtesy of NOAA. [資料目錄](https://registry.opendata.aws/terrain-tiles/) · [原始資料與授權](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)。重製取樣可執行 `Tools/sample_relief.py`，需 Python 與 Pillow。引擎直接讀取版本庫內的格網。
