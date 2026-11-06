import '../i18n/settings.js';
import { DIFFICULTIES, getDifficulty, resolveDifficulty } from '../data/combatSettings.js';

export function createSettingsUi(ctx) {
  const { state, i18n } = ctx;
  const dialog = document.createElement('dialog');
  dialog.id = 'game-settings';
  dialog.className = 'game-settings glass-panel';
  dialog.setAttribute('aria-labelledby', 'game-settings-title');
  dialog.innerHTML = `
    <h2 id="game-settings-title" data-i18n="settings.title"></h2>
    <fieldset>
      <legend data-i18n="settings.difficulty"></legend>
      <div class="difficulty-options">
        ${DIFFICULTIES.map(({ id }) => `<label>
          <input type="radio" name="difficulty" value="${id}" aria-describedby="difficulty-hint">
          <span data-i18n="settings.difficulty.${id}"></span>
        </label>`).join('')}
      </div>
    </fieldset>
    <p id="difficulty-hint" aria-live="polite"></p>
    <p class="settings-note" data-i18n="settings.difficulty.note"></p>
    <button type="button" class="btn-primary" data-settings-close data-i18n="settings.close"></button>
  `;
  document.body.appendChild(dialog);

  const buttons = [];
  for (const parent of [document.querySelector('.title-actions'), document.querySelector('#top-controls .utility-bar')]) {
    if (!parent) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = parent.classList.contains('utility-bar') ? 'icon-btn' : 'btn-title-settings';
    button.setAttribute('data-settings-open', '');
    button.addEventListener('click', open);
    if (parent.classList.contains('utility-bar')) parent.prepend(button);
    else parent.appendChild(button);
    buttons.push(button);
  }

  let previousUiOpen = false;
  function render() {
    for (const el of dialog.querySelectorAll('[data-i18n]')) el.textContent = i18n.t(el.dataset.i18n);
    const preset = getDifficulty(ctx);
    for (const input of dialog.querySelectorAll('input')) input.checked = input.value === preset.id;
    dialog.querySelector('#difficulty-hint').textContent = i18n.t(`settings.difficulty.${preset.id}Hint`);
    for (const button of buttons) {
      button.textContent = button.classList.contains('icon-btn') ? '⚙' : i18n.t('settings.title');
      button.title = i18n.t('settings.title');
      button.setAttribute('aria-label', i18n.t('settings.title'));
    }
  }
  function open() {
    if (dialog.open) return;
    render();
    previousUiOpen = Boolean(state.uiOpen);
    state.uiOpen = true;
    dialog.showModal();
    dialog.querySelector('input:checked').focus();
  }
  function close() {
    if (!dialog.open) return;
    dialog.close();
    state.uiOpen = previousUiOpen;
  }
  dialog.addEventListener('change', event => {
    if (event.target.name !== 'difficulty') return;
    const settings = ctx.save.get('settings', {});
    ctx.save.set('settings', { ...settings, difficulty: resolveDifficulty(event.target.value).id });
    ctx.save.flush();
    render();
  });
  // Native modal focus/inert handling; keep gameplay hotkeys from stealing radio arrows/Tab.
  dialog.addEventListener('keydown', event => event.stopPropagation());
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.querySelector('[data-settings-close]').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
  });
  i18n.onChange(render);
  render();
  const api = { open, close, isOpen: () => dialog.open };
  ctx.settingsUi = api;
  return api;
}
