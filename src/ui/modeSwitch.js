import '../i18n/storyChapters.js';
import './modeSwitch.css';
export function createModeSwitch(ctx,mode,mount,options={}){
  const t=k=>ctx.i18n.t('mirror.chapter.'+k);
  const button=document.createElement('button');button.className='mode-switch-button';button.dataset.modeMenu='';button.type='button';button.setAttribute('aria-haspopup','dialog');
  (mount||document.getElementById('ui')).append(button);if(!mount)button.classList.add('mode-switch-floating');
  const dialog=document.createElement('dialog');dialog.className='mode-switch-dialog';document.getElementById('ui').append(dialog);dialog.setAttribute('aria-labelledby','mode-switch-title');
  function close(){if(!dialog.open)return;dialog.close();ctx.state.uiOpen=false;if(button.isConnected)button.focus();}
  function render(){button.textContent=t(mode==='adventure'?'mode.enterStory':'mode.menu');dialog.replaceChildren();const h=document.createElement('h2');h.id='mode-switch-title';h.textContent=t('mode.title');const p=document.createElement('p');p.textContent=t('mode.note');dialog.append(h,p);
    for(const [id,key,url] of [['story','mode.story','?mode=story'],['adventure','mode.adventure','?mode=adventure'],['home','mode.home','?mode=home']]){const b=document.createElement('button');b.textContent=t(key);b.dataset.modeTarget=id;b.disabled=id===mode;b.onclick=()=>{if(ctx.save.flush()===false){p.textContent=t('saveError');return;}location.assign(url);};dialog.append(b);}
    const b=document.createElement('button');b.textContent=t('mode.stay');b.onclick=close;dialog.append(b);
  }
  function open(){
    if(ctx.settingsUi?.isOpen?.())ctx.settingsUi.close();
    options.onBeforeOpen?.();
    if(ctx.state.uiOpen)return;
    render();ctx.state.uiOpen=true;dialog.showModal();dialog.querySelector('button:not(:disabled)')?.focus();
  }
  button.onclick=open;
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});render();const off=ctx.i18n.onChange(render);
  return {open,button,isOpen:()=>dialog.open,close,dispose(){off();dialog.remove();button.remove();}};
}
