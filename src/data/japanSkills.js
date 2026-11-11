import { SKILLS, getSkillDef } from './skills.js';
import '../i18n/japanSkills.js';

const JAPAN_FORMS = {
  humBolt: { abilityId: 'sankosho', glyph: '杵' },
  mantra: { abilityId: 'komyoShingon', glyph: '光' },
  phurba: { abilityId: 'fudoSword', glyph: '焰' },
  vajraBell: { abilityId: 'gorinResonance', glyph: '五' },
  lotusShield: { abilityId: 'ajikanWard', glyph: '月' },
  protector: {
    abilityId: 'dogyoNinin',
    glyph: '伴',
    rankScaling: {
      duration: [12, 14, 16, 18, 20],
      healingPct: [0.02, 0.025, 0.03, 0.035, 0.04],
    },
  },
  vajraGuru: { abilityId: 'diamondRealm', glyph: '界' },
};

const BY_CANONICAL = new Map();
const BY_ABILITY = new Map();
for (const skill of SKILLS) {
  const form = JAPAN_FORMS[skill.id];
  const key = `skill.japan.${form.abilityId}`;
  const def = {
    ...skill,
    ...form,
    nameKey: `${key}.name`,
    descKey: `${key}.desc`,
    enhancements: {
      a: { id: 'a', nameKey: `${key}.enhA.name`, descKey: `${key}.enhA.desc` },
      b: { id: 'b', nameKey: `${key}.enhB.name`, descKey: `${key}.enhB.desc` },
    },
  };
  BY_CANONICAL.set(skill.id, def);
  BY_ABILITY.set(def.abilityId, def);
}

export function getJapanSkillDef(slotOrId) {
  return BY_ABILITY.get(slotOrId) || BY_CANONICAL.get(getSkillDef(slotOrId)?.id) || null;
}
