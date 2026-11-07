import { i18n } from '../i18n.js';

const zh = {
  'settings.title': '遊戲設定',
  'settings.close': '完成',
  'settings.difficulty': '冒險難度',
  'settings.difficulty.easy': '易',
  'settings.difficulty.normal': '中',
  'settings.difficulty.hard': '難',
  'settings.difficulty.easyHint': '受到傷害為原本的 60%，適合輕鬆探索與熟悉戰鬥。',
  'settings.difficulty.normalHint': '受到傷害為原本的 100%，保留原有戰鬥難度。',
  'settings.difficulty.hardHint': '受到傷害為原本的 140%，適合想挑戰閃躲與防禦的行者。',
  'settings.difficulty.note': '切換立即生效並自動儲存。影響敵人、首領與危險區域造成的傷害；經驗、掉落與任務進度不變。',
};
const en = {
  'settings.title': 'Game settings',
  'settings.close': 'Done',
  'settings.difficulty': 'Adventure difficulty',
  'settings.difficulty.easy': 'Easy',
  'settings.difficulty.normal': 'Normal',
  'settings.difficulty.hard': 'Hard',
  'settings.difficulty.easyHint': 'Take 60% of the original damage. Explore at ease and learn combat.',
  'settings.difficulty.normalHint': 'Take 100% of the original damage. The original combat difficulty.',
  'settings.difficulty.hardHint': 'Take 140% of the original damage. A challenge for dodging and defense.',
  'settings.difficulty.note': 'Changes apply immediately and save automatically. Affects damage from enemies, bosses and hazards; experience, loot and quest progress stay the same.',
};
i18n.register({ 'zh-Hant': zh, zh, en });
