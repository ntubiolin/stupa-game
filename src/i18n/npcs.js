import { i18n } from '../i18n.js';
import { PROLOGUE_STRINGS } from './prologue.js';

// Extend the mentor's existing quest instructions without changing quest flow.
const advice = {
  'zh-Hant': '北門外原野的南側草坡有溫和的餓鬼靈球，適合 Lv.1–3 修習。受傷時按 R 持六字大明咒恢復氣血，站定靜心持咒效果更好；踏入金色神龕或瑪尼石結界可恢復氣血與心力，簡單／普通模式下還能避開敵人（神龕旁按 E 可額外祈請加持）。先升至 Lv.3–5 並裝備法器，再挑戰北方的贊、雪人與精英魔障。',
  en: 'The southern meadow just beyond the North Gate has gentle Karmic Spirit Orbs for Lv.1–3 training. Press R to chant the Six-Syllable Mantra and heal; standing still strengthens meditation healing. Golden shrine and Mani stone wards restore HP and MP and protect you from enemies on Easy/Normal (press E beside a shrine for an extra blessing). Reach Lv.3–5 and equip gear before challenging northern Tsen, Migoi, or Elites.',
};

export const NPC_STRINGS = Object.fromEntries(Object.entries(advice).map(([lang, hint]) => [lang, {
  'dlg.prologue.northIntro.2': `${PROLOGUE_STRINGS[lang]['dlg.prologue.northIntro.2']}\n\n${hint}`,
  'dlg.prologue.northActive.1': `${PROLOGUE_STRINGS[lang]['dlg.prologue.northActive.1']}\n\n${hint}`,
}]));
i18n.register(NPC_STRINGS);
