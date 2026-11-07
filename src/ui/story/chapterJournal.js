import '../../i18n/storyChapters.js';
import './chapterJournal.css';
import { CODEX_BY_ID } from '../../data/codex.js';
import { CHAPTERS } from '../../data/story/chapters.js';

export function createChapterJournal(ctx) {
  const t=k=>ctx.i18n.t('mirror.chapter.'+k);
  const dialog=document.createElement('dialog');dialog.className='chapter-journal';
  dialog.setAttribute('aria-labelledby','chapter-journal-title');document.getElementById('ui').append(dialog);
  let tab='journey',previousFocus;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function button(text,action,id){const b=node('button',text);b.type='button';if(id)b.dataset.chapterAction=id;b.onclick=action;return b;}
  function close(){if(!dialog.open)return;dialog.close();ctx.state.uiOpen=false;previousFocus?.focus?.();}
  function render(){
    dialog.replaceChildren();
    const header=node('header');header.append(node('h2',t('menu')));header.firstChild.id='chapter-journal-title';header.append(button(t('close'),close,'close'));dialog.append(header);
    const nav=node('nav');for(const id of ['journey','sites','diary','letter']){const b=button(t(id),()=>{tab=id;render();},id);b.setAttribute('aria-pressed',String(tab===id));nav.append(b);}dialog.append(nav);
    const content=node('section',undefined,'chapter-journal-content');dialog.append(content);
    const state=ctx.chapters.getState();
    if(state.readOnly)content.append(node('p',t('readOnly'),'chapter-warning'));
    if(tab==='journey'){
      for(const def of CHAPTERS){
        const entry=state.chapters[def.id];const card=node('article');card.append(node('p',t('fiction'),'chapter-tag'),node('h3',t(def.id+'.title')),node('p',t(def.id+'.summary')));
        const can=ctx.chapters.canStart(def.id);const b=button(t(entry?.completed?'complete':entry?'resume':'continue'),()=>{close();ctx.requestChapter(def.id);},'start-'+def.id);b.disabled=!can||entry?.completed;card.append(b);
        if(entry?.completed&&!state.activeChapterId)card.append(button(t('replay'),()=>{close();ctx.requestChapter(def.id,true);},'replay-'+def.id));
        if(!can&&!entry)card.append(node('small',t('locked')));
        content.append(card);
      }
      if(state.activeChapterId)content.append(button(t('leave'),()=>{if(ctx.chapters.exit())close();else content.append(node('p',t('saveError'),'chapter-warning'));},'exit'));
    }else if(tab==='sites'){
      content.append(node('p',t('siteNote')));
      const ids = [...new Set(CHAPTERS.filter(c=>state.chapters[c.id]).flatMap(c=>c.siteIds))];
      if(!ids.length)content.append(node('p',t('siteLocked')));
      for(const id of ids){
        const entry=CODEX_BY_ID[id]; if(!entry)continue;
        const details=node('details');details.dataset.siteId=entry.id;
        details.append(node('summary',ctx.i18n.t(entry.titleKey)),node('p',t(entry.tag==='legend'?'legend':'history'),'chapter-tag'),node('p',ctx.i18n.t(entry.bodyKey)),node('h4',t('sources')));
        for(const source of entry.sources){const a=node('a',source.label);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';details.append(a);}
        content.append(details);
      }
    }else if(tab==='letter'){
      const def=CHAPTERS.find(c=>c.id==='finale');const entry=state.chapters.finale;
      if(!entry||!def)content.append(node('p',t('letterLocked')));
      else {
        const pageIndex=def.checkpoints.findIndex(c=>c.id===entry.checkpointId);
        for(const checkpoint of def.checkpoints.slice(0,pageIndex+1).filter(c=>c.id.startsWith('letter'))){
          const details=node('details');details.append(node('summary',t('finale.'+checkpoint.id+'.title')),node('p',t('finale.'+checkpoint.id+'.body'),'chapter-diary'));content.append(details);
        }
      }
    }else{
      const unlocked=CHAPTERS.filter(def=>['diary','complete'].includes(state.chapters[def.id]?.checkpointId));
      if(!unlocked.length)content.append(node('p',t('diaryLocked')));
      for(const def of unlocked){
        const entry=state.chapters[def.id];
        const article=node('article');article.append(node('h3',t(def.id+'.diary.title')),node('p',t(def.id+'.diary.body'),'chapter-diary'));content.append(article);
        if(state.activeChapterId===def.id&&entry.checkpointId==='diary')article.append(button(t(def.id+'.diary.finish'),()=>{if(ctx.chapters.signal('diary:read',{checkpointId:'diary'}))close();else content.append(node('p',t('saveError'),'chapter-warning'));},'read-diary'));
      }
    }
  }
  function open(nextTab='journey') {if(dialog.open)return;previousFocus=document.activeElement;tab=['journey','sites','diary','letter'].includes(nextTab)?nextTab:'journey';render();ctx.state.uiOpen=true;dialog.showModal();dialog.querySelector('button')?.focus();}
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  const off=ctx.i18n.onChange(()=>{if(dialog.open)render();});
  return {open,close,isOpen:()=>dialog.open,dispose(){close();off();dialog.remove();}};
}
