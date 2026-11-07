/**
 * Pilgrim Appearance & Face/Outfit Customization Registry (`src/data/appearance.js`)
 *
 * Defines all unlocked face, hair, robe, headwear, accessory, and aura options,
 * default appearance schema, validation/normalization, and random Tibetan Dharma Name generator.
 */
import '../i18n/appearance.js';

export const SKIN_TONES = [
  { id: 'warm', hex: 0xd9a17c, css: '#d9a17c', labelKey: 'appearance.skin.warm' },
  { id: 'fair', hex: 0xf0ccb0, css: '#f0ccb0', labelKey: 'appearance.skin.fair' },
  { id: 'bronze', hex: 0xb87a52, css: '#b87a52', labelKey: 'appearance.skin.bronze' },
  { id: 'khampa', hex: 0x8d5838, css: '#8d5838', labelKey: 'appearance.skin.khampa' },
  { id: 'sandal', hex: 0xe2b478, css: '#e2b478', labelKey: 'appearance.skin.sandal' },
  { id: 'moon', hex: 0xdce4ec, css: '#dce4ec', labelKey: 'appearance.skin.moon' },
];

export const EYE_STYLES = [
  { id: 'serene', labelKey: 'appearance.eye.serene' },
  { id: 'bright', labelKey: 'appearance.eye.bright' },
  { id: 'resolute', labelKey: 'appearance.eye.resolute' },
  { id: 'vajra', labelKey: 'appearance.eye.vajra' },
  { id: 'joyful', labelKey: 'appearance.eye.joyful' },
];

export const EYE_COLORS = [
  { id: 'obsidian', hex: 0x1a1412, css: '#1a1412', labelKey: 'appearance.eyeColor.obsidian' },
  { id: 'amber', hex: 0x78350f, css: '#92400e', labelKey: 'appearance.eyeColor.amber' },
  { id: 'gold', hex: 0xd97706, css: '#f59e0b', labelKey: 'appearance.eyeColor.gold' },
  { id: 'turquoise', hex: 0x0d9488, css: '#14b8a6', labelKey: 'appearance.eyeColor.turquoise' },
  { id: 'lotus', hex: 0x7e22ce, css: '#a855f7', labelKey: 'appearance.eyeColor.lotus' },
];

export const BROW_STYLES = [
  { id: 'gentle', labelKey: 'appearance.brow.gentle' },
  { id: 'bold', labelKey: 'appearance.brow.bold' },
  { id: 'sword', labelKey: 'appearance.brow.sword' },
  { id: 'soft', labelKey: 'appearance.brow.soft' },
];

export const MOUTH_STYLES = [
  { id: 'calm', labelKey: 'appearance.mouth.calm' },
  { id: 'peaceful', labelKey: 'appearance.mouth.peaceful' },
  { id: 'chant', labelKey: 'appearance.mouth.chant' },
  { id: 'cheerful', labelKey: 'appearance.mouth.cheerful' },
];

export const MARK_TYPES = [
  { id: 'none', labelKey: 'appearance.mark.none' },
  { id: 'urna', labelKey: 'appearance.mark.urna' },
  { id: 'sindoor', labelKey: 'appearance.mark.sindoor' },
  { id: 'wisdomEye', labelKey: 'appearance.mark.wisdomEye' },
  { id: 'blush', labelKey: 'appearance.mark.blush' },
];

export const HAIR_STYLES = [
  { id: 'short', labelKey: 'appearance.hair.short' },
  { id: 'shaved', labelKey: 'appearance.hair.shaved' },
  { id: 'khampa', labelKey: 'appearance.hair.khampa' },
  { id: 'ngakpa', labelKey: 'appearance.hair.ngakpa' },
  { id: 'braids', labelKey: 'appearance.hair.braids' },
  { id: 'flowing', labelKey: 'appearance.hair.flowing' },
];

export const HAIR_COLORS = [
  { id: 'ebony', hex: 0x1e1815, css: '#1e1815', labelKey: 'appearance.hairColor.ebony' },
  { id: 'chestnut', hex: 0x4a2c1d, css: '#4a2c1d', labelKey: 'appearance.hairColor.chestnut' },
  { id: 'snow', hex: 0xd8dee9, css: '#d8dee9', labelKey: 'appearance.hairColor.snow' },
  { id: 'crimson', hex: 0x7f1d1d, css: '#7f1d1d', labelKey: 'appearance.hairColor.crimson' },
  { id: 'ochre', hex: 0x92622a, css: '#92622a', labelKey: 'appearance.hairColor.ochre' },
  { id: 'indigo', hex: 0x1e293b, css: '#1e293b', labelKey: 'appearance.hairColor.indigo' },
];

export const ROBE_COLORS = [
  { id: 'maroon', hex: 0x7a1c24, css: '#7a1c24', labelKey: 'appearance.robe.maroon' },
  { id: 'indigo', hex: 0x1e3a5f, css: '#1e3a5f', labelKey: 'appearance.robe.indigo' },
  { id: 'ochre', hex: 0x8e4c24, css: '#8e4c24', labelKey: 'appearance.robe.ochre' },
  { id: 'white', hex: 0xede8df, css: '#ede8df', labelKey: 'appearance.robe.white' },
  { id: 'obsidian', hex: 0x221f26, css: '#221f26', labelKey: 'appearance.robe.obsidian' },
  { id: 'pine', hex: 0x1f473e, css: '#1f473e', labelKey: 'appearance.robe.pine' },
  { id: 'plum', hex: 0x4a1942, css: '#4a1942', labelKey: 'appearance.robe.plum' },
];

export const SHAWL_COLORS = [
  { id: 'saffron', hex: 0xe08a1e, css: '#e08a1e', labelKey: 'appearance.shawl.saffron' },
  { id: 'turquoise', hex: 0x2dd4bf, css: '#2dd4bf', labelKey: 'appearance.shawl.turquoise' },
  { id: 'lotus', hex: 0xe879a0, css: '#e879a0', labelKey: 'appearance.shawl.lotus' },
  { id: 'gold', hex: 0xfacc15, css: '#facc15', labelKey: 'appearance.shawl.gold' },
  { id: 'snow', hex: 0xe2e8f0, css: '#e2e8f0', labelKey: 'appearance.shawl.snow' },
  { id: 'coral', hex: 0xdc2626, css: '#dc2626', labelKey: 'appearance.shawl.coral' },
];

export const TRIM_COLORS = [
  { id: 'gold', hex: 0xd8a648, css: '#d8a648', labelKey: 'appearance.trim.gold' },
  { id: 'silver', hex: 0xcbd5e1, css: '#cbd5e1', labelKey: 'appearance.trim.silver' },
  { id: 'bronze', hex: 0xb45309, css: '#b45309', labelKey: 'appearance.trim.bronze' },
  { id: 'turquoise', hex: 0x14b8a6, css: '#14b8a6', labelKey: 'appearance.trim.turquoise' },
];

export const HAT_TYPES = [
  { id: 'none', labelKey: 'appearance.hat.none' },
  { id: 'lotus', labelKey: 'appearance.hat.lotus' },
  { id: 'pandita', labelKey: 'appearance.hat.pandita' },
  { id: 'straw', labelKey: 'appearance.hat.straw' },
  { id: 'headband', labelKey: 'appearance.hat.headband' },
  { id: 'tiara', labelKey: 'appearance.hat.tiara' },
];

export const NECK_TYPES = [
  { id: 'none', labelKey: 'appearance.neck.none' },
  { id: 'bodhi', labelKey: 'appearance.neck.bodhi' },
  { id: 'turquoise', labelKey: 'appearance.neck.turquoise' },
  { id: 'goldCollar', labelKey: 'appearance.neck.goldCollar' },
];

export const CHEST_TYPES = [
  { id: 'none', labelKey: 'appearance.chest.none' },
  { id: 'mirror', labelKey: 'appearance.chest.mirror' },
  { id: 'gau', labelKey: 'appearance.chest.gau' },
];

export const BACK_TYPES = [
  { id: 'none', labelKey: 'appearance.back.none' },
  { id: 'pack', labelKey: 'appearance.back.pack' },
  { id: 'scroll', labelKey: 'appearance.back.scroll' },
  { id: 'scarf', labelKey: 'appearance.back.scarf' },
];

export const AURA_COLORS = [
  { id: 'gold', hex: 0xffcf70, css: '#ffcf70', labelKey: 'appearance.aura.gold' },
  { id: 'turquoise', hex: 0x2dd4bf, css: '#2dd4bf', labelKey: 'appearance.aura.turquoise' },
  { id: 'lapis', hex: 0x60a5fa, css: '#60a5fa', labelKey: 'appearance.aura.lapis' },
  { id: 'emerald', hex: 0x34d399, css: '#34d399', labelKey: 'appearance.aura.emerald' },
  { id: 'rose', hex: 0xfb7185, css: '#fb7185', labelKey: 'appearance.aura.rose' },
];

export const DHARMA_NAME_POOL = {
  zhPrefixes: ['蓮華', '雪域', '金剛', '般若', '雲遊', '青朴', '菩提', '持明', '吉祥', '無畏'],
  zhRoots: ['扎西', '卓瑪', '洛桑', '央金', '平措', '次仁', '白瑪', '貢噶', '多吉', '曲珍', '丹增', '索南'],
  enPrefixes: ['Padma', 'Vajra', 'Snowland', 'Lotus', 'Prajna', 'Wandering', 'Chimphu', 'Bodhi', 'Kora', 'Mani'],
  enRoots: ['Tashi', 'Dolma', 'Lobsang', 'Yangchen', 'Phuntsok', 'Tsering', 'Pema', 'Kunga', 'Dorje', 'Choden', 'Tenzin', 'Sonam'],
};

export const DEFAULT_APPEARANCE = {
  name: '',
  customizedOnce: false,
  showNameplate: true,
  skinTone: 'warm',
  eyeStyle: 'bright',
  eyeColor: 'obsidian',
  browStyle: 'gentle',
  mouthStyle: 'calm',
  markType: 'urna',
  hairStyle: 'short',
  hairColor: 'ebony',
  robeColor: 'maroon',
  shawlColor: 'saffron',
  trimColor: 'gold',
  hatType: 'none',
  neckType: 'bodhi',
  chestType: 'none',
  backType: 'none',
  auraColor: 'gold',
};

function pickValidId(list, candidate, fallback) {
  if (list.some((item) => item.id === candidate)) return candidate;
  return fallback;
}

export function findOptionById(list, id) {
  return list.find((item) => item.id === id) || list[0];
}

export function normalizeAppearance(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    name: typeof src.name === 'string' ? src.name.trim().slice(0, 20) : '',
    customizedOnce: Boolean(src.customizedOnce),
    showNameplate: typeof src.showNameplate === 'boolean' ? src.showNameplate : true,
    skinTone: pickValidId(SKIN_TONES, src.skinTone, DEFAULT_APPEARANCE.skinTone),
    eyeStyle: pickValidId(EYE_STYLES, src.eyeStyle, DEFAULT_APPEARANCE.eyeStyle),
    eyeColor: pickValidId(EYE_COLORS, src.eyeColor, DEFAULT_APPEARANCE.eyeColor),
    browStyle: pickValidId(BROW_STYLES, src.browStyle, DEFAULT_APPEARANCE.browStyle),
    mouthStyle: pickValidId(MOUTH_STYLES, src.mouthStyle, DEFAULT_APPEARANCE.mouthStyle),
    markType: pickValidId(MARK_TYPES, src.markType, DEFAULT_APPEARANCE.markType),
    hairStyle: pickValidId(HAIR_STYLES, src.hairStyle, DEFAULT_APPEARANCE.hairStyle),
    hairColor: pickValidId(HAIR_COLORS, src.hairColor, DEFAULT_APPEARANCE.hairColor),
    robeColor: pickValidId(ROBE_COLORS, src.robeColor, DEFAULT_APPEARANCE.robeColor),
    shawlColor: pickValidId(SHAWL_COLORS, src.shawlColor, DEFAULT_APPEARANCE.shawlColor),
    trimColor: pickValidId(TRIM_COLORS, src.trimColor, DEFAULT_APPEARANCE.trimColor),
    hatType: pickValidId(HAT_TYPES, src.hatType, DEFAULT_APPEARANCE.hatType),
    neckType: pickValidId(NECK_TYPES, src.neckType, DEFAULT_APPEARANCE.neckType),
    chestType: pickValidId(CHEST_TYPES, src.chestType, DEFAULT_APPEARANCE.chestType),
    backType: pickValidId(BACK_TYPES, src.backType, DEFAULT_APPEARANCE.backType),
    auraColor: pickValidId(AURA_COLORS, src.auraColor, DEFAULT_APPEARANCE.auraColor),
  };
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)].id;
}

export function rollRandomAppearance(current = {}) {
  return normalizeAppearance({
    ...current,
    skinTone: pickRandom(SKIN_TONES),
    eyeStyle: pickRandom(EYE_STYLES),
    eyeColor: pickRandom(EYE_COLORS),
    browStyle: pickRandom(BROW_STYLES),
    mouthStyle: pickRandom(MOUTH_STYLES),
    markType: pickRandom(MARK_TYPES),
    hairStyle: pickRandom(HAIR_STYLES),
    hairColor: pickRandom(HAIR_COLORS),
    robeColor: pickRandom(ROBE_COLORS),
    shawlColor: pickRandom(SHAWL_COLORS),
    trimColor: pickRandom(TRIM_COLORS),
    hatType: pickRandom(HAT_TYPES),
    neckType: pickRandom(NECK_TYPES),
    chestType: pickRandom(CHEST_TYPES),
    backType: pickRandom(BACK_TYPES),
    auraColor: pickRandom(AURA_COLORS),
  });
}

export function rollRandomDharmaName(lang = 'zh') {
  const isEn = String(lang).startsWith('en');
  const prefixes = isEn ? DHARMA_NAME_POOL.enPrefixes : DHARMA_NAME_POOL.zhPrefixes;
  const roots = isEn ? DHARMA_NAME_POOL.enRoots : DHARMA_NAME_POOL.zhRoots;
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const r = roots[Math.floor(Math.random() * roots.length)];
  return isEn ? `${p} ${r}` : `${p}・${r}`;
}

export function resolveAppearanceColors(spec) {
  const norm = normalizeAppearance(spec);
  return {
    ...norm,
    skinHex: findOptionById(SKIN_TONES, norm.skinTone).hex,
    skinCss: findOptionById(SKIN_TONES, norm.skinTone).css,
    eyeHex: findOptionById(EYE_COLORS, norm.eyeColor).hex,
    eyeCss: findOptionById(EYE_COLORS, norm.eyeColor).css,
    hairHex: findOptionById(HAIR_COLORS, norm.hairColor).hex,
    hairCss: findOptionById(HAIR_COLORS, norm.hairColor).css,
    robeHex: findOptionById(ROBE_COLORS, norm.robeColor).hex,
    robeCss: findOptionById(ROBE_COLORS, norm.robeColor).css,
    shawlHex: findOptionById(SHAWL_COLORS, norm.shawlColor).hex,
    shawlCss: findOptionById(SHAWL_COLORS, norm.shawlColor).css,
    trimHex: findOptionById(TRIM_COLORS, norm.trimColor).hex,
    trimCss: findOptionById(TRIM_COLORS, norm.trimColor).css,
    auraHex: findOptionById(AURA_COLORS, norm.auraColor).hex,
    auraCss: findOptionById(AURA_COLORS, norm.auraColor).css,
  };
}
