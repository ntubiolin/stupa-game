import '../../i18n/storyDebug.js';
import './debugPanel.css';
import { STORY_BEATS } from '../../data/story/beats.js';
import { CHAPTERS, getChapter } from '../../data/story/chapters.js';

export function createStoryDebugPanel(ctx) {
  const t = key => ctx.i18n.t(`mirror.debug.${key}`);
  const dialog = document.createElement('dialog');
  dialog.className = 'story-debug-panel';
  dialog.setAttribute('aria-labelledby', 'story-debug-title');
  document.getElementById('ui').append(dialog);
  let previousFocus;

  function node(tag, text) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function button(text, action, id) {
    const element = node('button', text);
    element.type = action ? 'button' : 'submit';
    if (action) element.onclick = action;
    element.dataset.storyDebug = id;
    return element;
  }

  function field(form, label, control, id) {
    const wrapper = node('label', label);
    control.dataset.storyDebug = id;
    wrapper.append(control);
    form.append(wrapper);
    return wrapper;
  }

  function option(value, label) {
    const element = node('option', label);
    element.value = value;
    return element;
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
    ctx.state.uiOpen = false;
    previousFocus?.focus?.();
  }

  function renderUnlock() {
    dialog.append(node('p', t('locked')));
    const form = node('form');
    const password = node('input');
    password.type = 'password';
    password.autocomplete = 'off';
    password.required = true;
    field(form, t('password'), password, 'password');
    const error = node('p');
    error.setAttribute('role', 'alert');
    form.append(error, button(t('unlock'), null, 'unlock'));
    form.onsubmit = event => {
      event.preventDefault();
      const unlocked = ctx.debug.unlock(password.value);
      password.value = '';
      if (unlocked) render().focus();
      else {
        error.textContent = t('badPassword');
        password.focus();
      }
    };
    dialog.append(form);
    return password;
  }

  function canJumpDemo() {
    const state = ctx.chapters.getState();
    return !state.activeChapterId && !state.readOnly && ctx.story.getState().beat !== 'complete'
      && Object.keys(ctx.story.getJourney().chapters).length === 0;
  }

  function renderDemoJump() {
    if (!canJumpDemo()) return;
    const form = node('form');
    form.className = 'story-debug-demo';
    const select = node('select');
    select.append(...STORY_BEATS.map(beat => option(beat.id, ctx.i18n.t(beat.titleKey))));
    select.value = ctx.story.getState().beat;
    field(form, t('demoBeat'), select, 'demo-beat');
    form.append(node('p', t('demoWarning')), button(t('demoJump'), null, 'demo-jump'));
    form.onsubmit = event => {
      event.preventDefault();
      if (!ctx.debug.unlockedByPassword || !canJumpDemo()
          || select.value === ctx.story.getState().beat || !window.confirm(t('demoConfirm'))) return;
      close();
      ctx.story.skipTo(select.value);
    };
    dialog.append(form);
  }

  function renderPreview() {
    const state = ctx.chapters.getState();
    const banner = node('p', t('banner'));
    banner.className = 'story-debug-warning';
    dialog.append(banner);
    if (state.testing) {
      dialog.append(button(t('exitPreview'), () => {
        close();
        ctx.chapters.exit();
      }, 'exit'));
    }

    const form = node('form');
    const chapter = node('select');
    chapter.append(...CHAPTERS.map(def => option(def.id, ctx.i18n.t(`mirror.chapter.${def.id}.title`))));
    if (state.activeChapterId) chapter.value = state.activeChapterId;
    const checkpoint = node('select');
    const choice = node('select');
    field(form, t('chapter'), chapter, 'chapter');
    field(form, t('checkpoint'), checkpoint, 'checkpoint');
    const choiceField = field(form, t('choice'), choice, 'choice');
    form.append(button(t('openPreview'), null, 'preview'));

    function renderChoices() {
      const def = getChapter(chapter.value);
      const index = def.checkpoints.findIndex(step => step.id === checkpoint.value);
      const choiceStep = def.checkpoints.slice(0, index).find(step => step.choices);
      choiceField.hidden = !choiceStep;
      choice.required = Boolean(choiceStep);
      choice.disabled = !choiceStep;
      choice.replaceChildren(option('', t('choose')));
      if (choiceStep) {
        choice.append(...choiceStep.choices.map(value =>
          option(value, ctx.i18n.t(`mirror.chapter.${def.id}.${choiceStep.id}.${value}`))));
      }
    }

    function renderCheckpoints(selected) {
      const def = getChapter(chapter.value);
      checkpoint.replaceChildren(...def.checkpoints.map(step => option(step.id, step.signal
        ? ctx.i18n.t(`mirror.chapter.${def.id}.${step.id}.title`) : t('complete'))));
      checkpoint.value = selected || def.entryCheckpoint;
      renderChoices();
    }

    chapter.onchange = () => renderCheckpoints();
    checkpoint.onchange = renderChoices;
    renderCheckpoints(state.activeChapterId && state.chapters[state.activeChapterId]?.checkpointId);
    form.onsubmit = event => {
      event.preventDefault();
      const options = choice.disabled ? {} : { choice: choice.value };
      close();
      ctx.requestChapterPreview(chapter.value, checkpoint.value, options);
    };
    dialog.append(form);
    renderDemoJump();
    return chapter;
  }

  function render() {
    const header = node('header');
    const heading = node('h2', t('title'));
    heading.id = 'story-debug-title';
    header.append(heading, button(t('close'), close, 'close'));
    dialog.replaceChildren(header);
    return ctx.debug.unlockedByPassword ? renderPreview() : renderUnlock();
  }

  function open() {
    if (dialog.open) return;
    previousFocus = document.activeElement;
    const focus = render();
    dialog.showModal();
    ctx.state.uiOpen = true;
    focus.focus();
  }

  function onCancel(event) {
    event.preventDefault();
    close();
  }

  dialog.addEventListener('cancel', onCancel);
  return {
    open, close,
    isOpen: () => dialog.open,
    dispose() {
      close();
      dialog.removeEventListener('cancel', onCancel);
      dialog.remove();
    },
  };
}
