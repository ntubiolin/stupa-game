import '../i18n/settings.js';
import { DIFFICULTIES, getDifficulty, resolveDifficulty } from '../data/combatSettings.js';

const CAMERA_MODES = ['smart', 'off', 'on'];
const VOICE_STYLES = ['natural', 'instrumental'];

function normalizeCameraMode(val) {
  return CAMERA_MODES.includes(val) ? val : 'smart';
}

function normalizeVoiceStyle(val) {
  return VOICE_STYLES.includes(val) ? val : 'natural';
}

export function createSettingsUi(ctx) {
  const { state, i18n } = ctx;
  const dialog = document.createElement('dialog');
  dialog.id = 'game-settings';
  dialog.className = 'game-settings glass-panel';
  dialog.setAttribute('aria-labelledby', 'game-settings-title');
  dialog.innerHTML = `
    <h2 id="game-settings-title" data-i18n="settings.title"></h2>

    <fieldset class="settings-group">
      <legend data-i18n="settings.difficulty"></legend>
      <div class="difficulty-options">
        ${DIFFICULTIES.map(({ id }) => `<label>
          <input type="radio" name="difficulty" value="${id}" aria-describedby="difficulty-hint">
          <span data-i18n="settings.difficulty.${id}"></span>
        </label>`).join('')}
      </div>
      <p id="difficulty-hint" class="settings-hint" aria-live="polite"></p>
      <p class="settings-note" data-i18n="settings.difficulty.note"></p>
    </fieldset>

    <fieldset class="settings-group">
      <legend data-i18n="settings.cameraAutoFollow"></legend>
      <div class="difficulty-options">
        ${CAMERA_MODES.map((id) => `<label>
          <input type="radio" name="cameraAutoFollow" value="${id}" aria-describedby="camera-follow-hint">
          <span data-i18n="settings.cameraAutoFollow.${id}"></span>
        </label>`).join('')}
      </div>
      <p id="camera-follow-hint" class="settings-hint" aria-live="polite"></p>
    </fieldset>

    <fieldset class="settings-group">
      <legend data-i18n="settings.mantraVoiceStyle"></legend>
      <div class="difficulty-options">
        ${VOICE_STYLES.map((id) => `<label>
          <input type="radio" name="mantraVoiceStyle" value="${id}" aria-describedby="mantra-voice-hint">
          <span data-i18n="settings.mantraVoiceStyle.${id}"></span>
        </label>`).join('')}
      </div>
      <p id="mantra-voice-hint" class="settings-hint" aria-live="polite"></p>
    </fieldset>

    <section class="settings-group settings-mode" aria-labelledby="settings-mode-heading">
      <h3 id="settings-mode-heading" class="settings-backup__title" data-i18n="mirror.chapter.mode.title"></h3>
      <p class="settings-note" data-i18n="mirror.chapter.mode.note"></p>
      <div id="settings-mode-mount" class="settings-mode__actions"></div>
    </section>

    <section class="settings-group settings-backup" aria-labelledby="settings-backup-heading">
      <h3 id="settings-backup-heading" class="settings-backup__title" data-i18n="settings.backup.title"></h3>
      <p class="settings-note" data-i18n="settings.backup.desc"></p>
      <p id="settings-backup-summary" class="settings-backup__summary"></p>
      <div class="settings-backup__actions">
        <button type="button" id="btn-save-download" class="settings-backup__btn settings-backup__btn--download" data-save-download data-i18n="settings.backup.downloadBtn"></button>
        <button type="button" id="btn-save-import" class="settings-backup__btn settings-backup__btn--import" data-save-import data-i18n="settings.backup.importBtn"></button>
        <input type="file" id="input-save-import-file" accept=".json,application/json" class="is-hidden" data-save-file-input />
      </div>
      <p id="settings-backup-status" class="settings-backup__status is-hidden" aria-live="polite"></p>
    </section>

    <div class="settings-footer">
      <button type="button" class="btn-primary" data-settings-close data-i18n="settings.close"></button>
    </div>
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

  const backupSummaryEl = dialog.querySelector('#settings-backup-summary');
  const backupStatusEl = dialog.querySelector('#settings-backup-status');
  const btnDownload = dialog.querySelector('[data-save-download]');
  const btnImport = dialog.querySelector('[data-save-import]');
  const fileInput = dialog.querySelector('[data-save-file-input]');

  function showBackupStatus(text, isError = false) {
    if (!backupStatusEl) return;
    backupStatusEl.textContent = text;
    backupStatusEl.classList.remove('is-hidden', 'is-error', 'is-ok');
    backupStatusEl.classList.add(isError ? 'is-error' : 'is-ok');
  }

  function formatSavedTime(savedAt) {
    if (!savedAt || typeof savedAt !== 'number') return i18n.t('settings.backup.timeJustNow');
    try {
      const d = new Date(savedAt);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return i18n.t('settings.backup.timeJustNow');
    }
  }

  let previousUiOpen = false;
  function render() {
    for (const el of dialog.querySelectorAll('[data-i18n]')) {
      el.textContent = i18n.t(el.dataset.i18n);
    }
    const savedSettings = ctx.save?.get?.('settings', {}) || {};
    const preset = getDifficulty(ctx);
    const camMode = normalizeCameraMode(savedSettings.cameraAutoFollow);
    const voiceStyle = normalizeVoiceStyle(savedSettings.mantraVoiceStyle);

    for (const input of dialog.querySelectorAll('input[name="difficulty"]')) {
      input.checked = input.value === preset.id;
    }
    for (const input of dialog.querySelectorAll('input[name="cameraAutoFollow"]')) {
      input.checked = input.value === camMode;
    }
    for (const input of dialog.querySelectorAll('input[name="mantraVoiceStyle"]')) {
      input.checked = input.value === voiceStyle;
    }

    dialog.querySelector('#difficulty-hint').textContent = i18n.t(`settings.difficulty.${preset.id}Hint`);
    dialog.querySelector('#camera-follow-hint').textContent = i18n.t(`settings.cameraAutoFollow.${camMode}Hint`);
    dialog.querySelector('#mantra-voice-hint').textContent = i18n.t(`settings.mantraVoiceStyle.${voiceStyle}Hint`);

    if (backupSummaryEl && ctx.save?.dump) {
      const snapshot = ctx.save.dump();
      const vitals = ctx.vitals?.getStats?.() || snapshot?.sections?.vitals || {};
      const merit = ctx.merit?.getStats?.() || snapshot?.sections?.merit || {};
      backupSummaryEl.textContent = i18n.t('settings.backup.summary', {
        level: vitals.level || 1,
        points: merit.points || 0,
        kora: merit.kora || 0,
        time: formatSavedTime(snapshot?.savedAt),
      });
    }

    for (const button of buttons) {
      button.textContent = button.classList.contains('icon-btn') ? '⚙' : i18n.t('settings.title');
      button.title = i18n.t('settings.title');
      button.setAttribute('aria-label', i18n.t('settings.title'));
    }
  }

  function open() {
    if (dialog.open) return;
    if (backupStatusEl) backupStatusEl.classList.add('is-hidden');
    render();
    previousUiOpen = Boolean(state.uiOpen);
    state.uiOpen = true;
    dialog.showModal();
    const checked = dialog.querySelector('input:checked');
    if (checked) checked.focus();
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
    state.uiOpen = previousUiOpen;
  }

  dialog.addEventListener('change', event => {
    const { name, value } = event.target;
    if (!['difficulty', 'cameraAutoFollow', 'mantraVoiceStyle'].includes(name)) return;
    const settings = ctx.save.get('settings', {});
    const nextSettings = { ...settings };

    if (name === 'difficulty') {
      nextSettings.difficulty = resolveDifficulty(value).id;
    } else if (name === 'cameraAutoFollow') {
      nextSettings.cameraAutoFollow = normalizeCameraMode(value);
      ctx.bus?.emit?.('camera:setAutoFollow', { mode: nextSettings.cameraAutoFollow });
    } else if (name === 'mantraVoiceStyle') {
      nextSettings.mantraVoiceStyle = normalizeVoiceStyle(value);
    }

    ctx.save.set('settings', nextSettings);
    ctx.save.flush();
    ctx.bus?.emit?.('settings:changed', nextSettings);
    render();
  });

  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!ctx.save?.downloadBackup) return;
      const res = ctx.save.downloadBackup();
      if (res?.ok) {
        showBackupStatus(i18n.t('settings.backup.downloadSuccess', { filename: res.filename }), false);
        render();
      }
    });
  }

  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => {
      fileInput.value = '';
      fileInput.click();
    });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file || !ctx.save?.importBackupFile) return;
      const res = await ctx.save.importBackupFile(file, { reload: true });
      if (res?.ok) {
        showBackupStatus(i18n.t('settings.backup.importSuccess'), false);
        render();
      } else {
        showBackupStatus(i18n.t('settings.backup.importError'), true);
      }
    });
  }

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
