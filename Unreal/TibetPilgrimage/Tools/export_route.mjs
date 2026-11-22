// Generate the native objective table from the same bilingual quest definitions as the web game.
import {writeFileSync} from 'node:fs';
import {i18n} from '../../../src/i18n.js';
const custom = (kind, en, zh, count = 1) => ({kind, en, zh, count});
const maps = new Map();
const dialogue = {
  'prologue': [
    ['prologue.vowIntro.1', 'prologue.vowIntro.2'],
    ['prologue.vowLegend.1', 'prologue.vowLegend.2', 'prologue.vowLegend.3', 'prologue.vowLegend.4', 'prologue.vowLegend.5'],
    ['prologue.northIntro.1', 'prologue.northIntro.2'],
    ['prologue.northReport.1', 'prologue.northReport.2', 'prologue.northReport.3'],
  ],
  'ch1': [
    ['ch1.elder.droughtIntro.1', 'ch1.elder.droughtIntro.2'],
    ['ch1.elder.droughtReport.1', 'ch1.elder.droughtReport.2'],
    ['ch1.vision.lampsTalk.1', 'ch1.vision.lampsTalk.2', 'ch1.vision.lampsTalk.3'],
    ['ch1.messenger.start.1', 'ch1.messenger.start.2'],
    ['ch1.vision.scrollsDeliver.1', 'ch1.vision.scrollsDeliver.2', 'ch1.vision.scrollsDeliver.3'],
    ['ch1.vision.kilayaComplete.1', 'ch1.vision.kilayaComplete.2', 'ch1.vision.kilayaComplete.3'],
  ],
  'ch2': [
    ['ch2.envoy.n1', 'ch2.envoy.n2', 'ch2.envoy.n3', 'ch2.envoy.n4'],
    ['ch2.vision.n1', 'ch2.vision.n2', 'ch2.vision.n3'],
  ],
  'ch3': [
    ['ch3.keeper.valleyIntro.1', 'ch3.keeper.valleyIntro.2', 'ch3.keeper.valleyIntro.3'],
    ['ch3.herder.yaksReport.1', 'ch3.herder.yaksReport.2'],
    ['ch3.vision.shampoComplete.1', 'ch3.vision.shampoComplete.2', 'ch3.vision.shampoComplete.3'],
  ],
  'ch4': [
    ['ch4.shanta.foundation.1', 'ch4.shanta.foundation.2', 'ch4.shanta.foundation.3'],
    ['ch4.king.foundation.1', 'ch4.king.foundation.2'],
    ['ch4.vision.samye', 'ch4.shanta.samyeComplete.1'],
    ['ch4.shanta.samyeComplete.2'],
  ],
  'ch5': [
    ['ch5.tsogyal.intro.1', 'ch5.tsogyal.intro.2', 'ch5.tsogyal.intro.3'],
    ['ch5.tsogyal.report.1', 'ch5.tsogyal.report.2', 'ch5.tsogyal.report.3'],
    ['ch5.oldLama.epilogue.1', 'ch5.oldLama.epilogue.2', 'ch5.oldLama.epilogue.3'],
  ],
};
const glossary = {
  trisongDetsen: ['Trisong Detsen', '赤松德贊'],
  samye: ['Samye', '桑耶寺'],
  samyeName: ['Samye', '桑耶寺'],
  samyeMandala: ['mandala', '壇城'],
  sevenTestedMen: ['Seven Tested Men', '桑耶七覺士'],
  terma: ['Terma', '伏藏'],
  terton: ['Tertön', '伏藏師'],
};
function cleanCodexTitle(title, lang) {
  if (lang === 1) return title.replace(/\s*[（(][^）)]*[）)]/g, '').trim();
  return title.replace(/\s*\([^)]*[\u0F00-\u0FFF][^)]*\)/g, '').trim();
}
function speechLine(dict, key, lang) {
  const raw = dict['dlg.' + key];
  if (!raw) throw Error('Missing dialogue key: dlg.' + key);
  return raw
    .replace(/\[\[codex:\w+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[codex:(\w+)\]\]/g, (_, id) => {
      if (glossary[id]?.[lang]) return glossary[id][lang];
      const title = dict['codex.' + id + '.title'] || dict['codex.entry.' + id + '.title'];
      return title ? cleanCodexTitle(title, lang) : id;
    });
}
function speech(dict, keys, lang) {
  const list = Array.isArray(keys) ? keys : [keys];
  return list.map(key => speechLine(dict, key, lang)).join(lang === 1 ? '' : ' ');
}
function append(map, step) { if (!maps.has(map)) maps.set(map, []); maps.get(map).push(step); }
for (const file of ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5']) {
  await import('../../../src/i18n/' + file + '.js');
  const quests = Object.values(await import('../../../src/data/quests/' + file + '.js')).find(Array.isArray);
  let talk = 0;
  for (const quest of quests) for (const step of quest.steps) {
    let map = step.map;
    if (quest.id === 'ch5.epilogue') map = 'ending';
    if (step.id === 'report_tsogyal') map = 'return';
    if (quest.id === 'prologue.north' && step.id === 'talk_report') map = 'wild';
    const kinds = {talk:'Talk', light:'Interact', interact:'Interact', kora:'Kora', collect:'Reach', reach:'Reach',
      liberate:'Combat', boss:'Boss', escort_messenger:'Escort', complete_altars:'Interact',
      survive_nights:'Combat', clear_gauntlet:'Combat', ending:'Talk', clear_terma_1:'Reach'};
    const kind = step.id === 'collect_shard' ? 'Interact' : kinds[step.id] ?? kinds[step.type];
    const {en, zh} = i18n.getStrings();
    const simplify = text => text.replace(/\{\w+\}/g, '').replace(/\s*[（(]\s*\/\d*[）)]/g, '').trim();
    const e = en[step.textKey] ?? en[step.labelKey], z = zh[step.textKey] ?? zh[step.labelKey];
    if (!kind || !e || !z) throw Error(JSON.stringify(step));
    const count = step.id==='collect_shard' || step.id==='clear_gauntlet' ? 4 : step.type==='kora' ? 9 : step.count ?? 1;
    const entry = custom(kind,simplify(e),simplify(z),count);
    // The Samye ceremony is narrated by the abbot. The escort follows its conversation.
    entry.resident=step.npc ?? ({ending:'shantarakshita', escort_messenger:'messenger'})[step.id];
    if ((kind==='Talk' || kind==='Escort') && !entry.resident) throw Error('Missing resident: '+step.id);
    if (kind==='Talk') {
      const key=dialogue[file][talk++];
      entry.enSpeech=speech(en,key,0);
      entry.zhSpeech=speech(zh,key,1);
      const speaker = 'npc.' + entry.resident;
      entry.speakerEn = en[speaker] ?? en[speaker + '.name'];
      entry.speakerZh = zh[speaker] ?? zh[speaker + '.name'];
      if (!entry.speakerEn || !entry.speakerZh) throw Error('Missing speaker: ' + speaker);
    }
    if(step.id==='clear_terma_1') {
      entry.en='Enter the Terma Realm beneath the hermitage';
      entry.zh='前往青朴北崖石門進入伏藏秘境';
    }
    append(map,entry);
  }
}
append('grove',custom('Interact','Consecrate the votive stupa','為小佛塔裝藏開光'));
for (let floor=1;floor<=3;floor++) {
  append('terma'+floor,custom('Reach',['Find the earth seal','Trace the crystal vein','Enter the sky vault'][floor-1],
    ['尋找地藏印','沿著水晶脈前行','踏入虛空寶庫'][floor-1]));
  append('terma'+floor,custom(floor===3?'Boss':'Combat',['Quiet the cave sentinels','Release the crystal spirits','Pacify the final guardian'][floor-1],
    ['調伏岩窟守衛','度脫水晶精靈','降伏寶庫守護者'][floor-1],floor===3?1:3));
  append('terma'+floor,custom('Interact','Receive the concealed teaching','領受伏藏教法'));
}
const lit = text => 'TEXT('+JSON.stringify(text)+')';
const rows = Array.from(maps, ([map,steps]) => `    {${lit(map)}, {\n`+steps.map(s =>
  `        {EObjective::${s.kind}, ${lit(s.en)}, ${lit(s.zh)}, ${s.count}, ${lit(s.enSpeech ?? '')}, ${lit(s.zhSpeech ?? '')}${s.resident ? ', '+lit(s.resident) : ''}${s.speakerEn ? ', '+lit(s.speakerEn)+', '+lit(s.speakerZh) : ''}},`).join('\n')+'\n    }},').join('\n');
writeFileSync(new URL('../Source/TibetPilgrimage/TibetRoute.inl',import.meta.url), '// Generated by Tools/export_route.mjs\n'+rows+'\n');
