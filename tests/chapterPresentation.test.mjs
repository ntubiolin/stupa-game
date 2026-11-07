import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS } from '../src/data/story/chapters.js';
import { CODEX_BY_ID } from '../src/data/codex.js';
import { i18n } from '../src/i18n.js';
import '../src/i18n/storyChapters.js';

test('chapter journal and scripted cards have both dynamic translations and existing records', () => {
 const strings=i18n.getStrings();
 for(const chapter of CHAPTERS){
  for(const id of chapter.siteIds)assert(CODEX_BY_ID[id],id);
  const suffixes=['title','summary','diary.title','diary.body','diary.finish'];
  for(const step of chapter.checkpoints.filter(s=>s.signal)){
   suffixes.push(step.id+'.title',step.id+'.action');
   if(step.presentation==='card')suffixes.push(step.id+'.body');
   for(const choice of step.choices||[])suffixes.push(step.id+'.'+choice,'response.body.'+choice);
  }
  for(const lang of ['zh','en'])for(const suffix of suffixes){const key=`mirror.chapter.${chapter.id}.${suffix}`;assert.equal(typeof strings[lang][key],'string',lang+': '+key);assert(strings[lang][key].trim());}
 }
});
