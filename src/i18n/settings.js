import { i18n } from '../i18n.js';

const zh = {
  'settings.title': '遊戲設定',
  'settings.close': '完成',
  'settings.difficulty': '冒險難度',
  'settings.difficulty.easy': '易',
  'settings.difficulty.normal': '中',
  'settings.difficulty.hard': '難',
  'settings.difficulty.easyHint': '受到傷害為原本的 60%，新手區魔物保持和平不主動圍毆，適合輕鬆探索與熟悉戰鬥。',
  'settings.difficulty.normalHint': '受到傷害為原本的 100%，保留原有戰鬥難度。',
  'settings.difficulty.hardHint': '受到傷害為原本的 140%，適合想挑戰閃躲與防禦的行者。',
  'settings.difficulty.note': '切換立即生效並自動儲存。影響敵人、首領與危險區域造成的傷害；經驗、掉落與任務進度不變。',

  'settings.cameraAutoFollow': '自動跟隨運鏡',
  'settings.cameraAutoFollow.smart': '智慧穩定',
  'settings.cameraAutoFollow.off': '完全關閉',
  'settings.cameraAutoFollow.on': '傳統跟隨',
  'settings.cameraAutoFollow.smartHint': '日常行走與戰鬥時保持視角穩定不自轉；僅在順時針繞塔（Kora）時平緩輔助導引。',
  'settings.cameraAutoFollow.offHint': '完全鎖定鏡頭方位角，僅由滑鼠拖曳、方向鍵或 Q/E 旋轉視角，絕不自動轉動。',
  'settings.cameraAutoFollow.onHint': '傳統視角模式，於繞塔與探索時提供較明顯的路線跟隨。',

  'settings.mantraVoiceStyle': '六字大明咒音色',
  'settings.mantraVoiceStyle.natural': '自然梵唱',
  'settings.mantraVoiceStyle.instrumental': '純法器共鳴',
  'settings.mantraVoiceStyle.naturalHint': '去除電子合成諧波，保留清朗自然的人聲真言與寺院空間殘響。',
  'settings.mantraVoiceStyle.instrumentalHint': '關閉人聲取樣，改以純淨頌缽、泛音銅鐘與合唱共鳴演繹真言。',

  'settings.backup.title': '遊戲進度備份與還原',
  'settings.backup.desc': '遊戲會自動儲存於瀏覽器（stupa.save.v2）。您可隨時下載 .json 備份檔保存至電腦，或匯入備份檔還原完整進度（包含等級、功德、背包、任務、法相與敘事章節）。',
  'settings.backup.summary': '目前紀錄：Lv {level} · 功德 {points} · 轉繞 {kora} 圈 · 儲存於 {time}',
  'settings.backup.downloadBtn': '⬇ 下載進度備份 (.json)',
  'settings.backup.importBtn': '⬆ 匯入備份檔 (.json)',
  'settings.backup.downloadSuccess': '✓ 已下載備份檔：{filename}',
  'settings.backup.importSuccess': '✓ 備份匯入成功！正在重新載入遊戲進度…',
  'settings.backup.importError': '✕ 備份檔格式無效或版本不相容，請確認是否為有效的 stupa-save-backup (.json) 檔案。',
  'settings.backup.timeJustNow': '剛剛',
};

const en = {
  'settings.title': 'Game settings',
  'settings.close': 'Done',
  'settings.difficulty': 'Adventure difficulty',
  'settings.difficulty.easy': 'Easy',
  'settings.difficulty.normal': 'Normal',
  'settings.difficulty.hard': 'Hard',
  'settings.difficulty.easyHint': 'Take 60% of the original damage and beginner zone spirits remain peaceful. Explore at ease and learn combat.',
  'settings.difficulty.normalHint': 'Take 100% of the original damage. The original combat difficulty.',
  'settings.difficulty.hardHint': 'Take 140% of the original damage. A challenge for dodging and defense.',
  'settings.difficulty.note': 'Changes apply immediately and save automatically. Affects damage from enemies, bosses and hazards; experience, loot and quest progress stay the same.',

  'settings.cameraAutoFollow': 'Camera auto-follow',
  'settings.cameraAutoFollow.smart': 'Smart Steady',
  'settings.cameraAutoFollow.off': 'Fixed (Off)',
  'settings.cameraAutoFollow.on': 'Classic Follow',
  'settings.cameraAutoFollow.smartHint': 'Keeps camera steady during normal walking, plaza exploration, and combat; gently assists only while actively walking the Kora ring.',
  'settings.cameraAutoFollow.offHint': 'Locks camera angle completely. Camera only rotates when you drag with the mouse or press camera keys.',
  'settings.cameraAutoFollow.onHint': 'Classic camera follow behavior along the pilgrimage path.',

  'settings.mantraVoiceStyle': 'Mantra chant voice',
  'settings.mantraVoiceStyle.natural': 'Natural Chant',
  'settings.mantraVoiceStyle.instrumental': 'Singing Bowl Only',
  'settings.mantraVoiceStyle.naturalHint': 'Pure, natural human mantra vocal sample with warm temple reverb and clear diction.',
  'settings.mantraVoiceStyle.instrumentalHint': 'Replaces vocal samples with pure Tibetan singing bowls and harmonic overtone chimes.',

  'settings.backup.title': 'Save Progress Backup & Restore',
  'settings.backup.desc': 'Progress is auto-saved in your browser (stupa.save.v2). Download a .json backup file anytime to safekeep your pilgrimage, or import a backup file to restore your level, merit, inventory, quests, appearance, and story progress.',
  'settings.backup.summary': 'Current Save: Lv {level} · Merit {points} · Kora {kora} · Saved {time}',
  'settings.backup.downloadBtn': '⬇ Download Save Backup (.json)',
  'settings.backup.importBtn': '⬆ Import Backup File (.json)',
  'settings.backup.downloadSuccess': '✓ Backup downloaded: {filename}',
  'settings.backup.importSuccess': '✓ Backup imported! Reloading pilgrimage progress…',
  'settings.backup.importError': '✕ Invalid or incompatible backup file. Please select a valid stupa-save-backup (.json) file.',
  'settings.backup.timeJustNow': 'just now',
};

i18n.register({ 'zh-Hant': zh, zh, en });
