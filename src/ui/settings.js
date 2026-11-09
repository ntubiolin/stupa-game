import '../i18n/settings.js';
import '../i18n/muralPrototype.js';
import { DIFFICULTIES, getDifficulty, resolveDifficulty } from '../data/combatSettings.js';
import { MURAL_PROTO_MODES, MURAL_PROTO_PASSCODE, normalizeMuralProtoMode } from './muralPrototype.js';

export { MURAL_PROTO_MODES, MURAL_PROTO_PASSCODE, normalizeMuralProtoMode };

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

    <section id="settings-mural-proto" class="settings-group settings-mural-proto" aria-labelledby="settings-mural-proto-heading">
      <h3 id="settings-mural-proto-heading" class="settings-backup__title" data-i18n="settings.muralProto.title"></h3>
      <p class="settings-note" data-i18n="settings.muralProto.desc"></p>

      <div id="mural-proto-locked-box" class="settings-mural-proto__locked">
        <div class="settings-mural-proto__pass-row">
          <input
            type="text"
            id="input-mural-passcode"
            class="settings-mural-proto__input"
            data-mural-passcode
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" id="btn-mural-unlock" class="settings-backup__btn" style="flex:0 0 auto" data-mural-unlock data-i18n="settings.muralProto.unlockBtn"></button>
        </div>
        <p id="mural-proto-pass-status" class="settings-backup__status is-hidden" aria-live="polite"></p>
      </div>

      <div id="mural-proto-unlocked-box" class="settings-mural-proto__unlocked is-hidden">
        <div class="settings-mural-proto__badge" data-i18n="settings.muralProto.unlockedBadge"></div>
        <div class="difficulty-options" style="margin-top:10px">
          ${MURAL_PROTO_MODES.map((id) => `<label>
            <input type="radio" name="muralProtoMode" value="${id}" aria-describedby="mural-proto-hint">
            <span data-i18n="settings.muralProto.mode.${id}"></span>
          </label>`).join('')}
        </div>
        <p id="mural-proto-hint" class="settings-hint" aria-live="polite"></p>
        <div class="settings-mural-proto__try-actions">
          <button type="button" class="settings-mural-proto__try-btn" data-mural-try="optionA" data-i18n="settings.muralProto.tryA"></button>
        </div>
      </div>
    </section>

    <section id="settings-cloud" class="settings-group settings-cloud" aria-labelledby="settings-cloud-heading">
      <h3 id="settings-cloud-heading" class="settings-backup__title" data-i18n="settings.cloud.title"></h3>
      <p class="settings-note" data-i18n="settings.cloud.desc"></p>

      <div id="cloud-signed-out" class="settings-cloud__signed-out">
        <button type="button" id="btn-google-signin" class="settings-cloud__google-btn" data-cloud-signin>
          <span class="settings-cloud__google-icon" aria-hidden="true">G</span>
          <span data-i18n="settings.cloud.signInBtn"></span>
        </button>

        <div id="cloud-dev-signin-form" class="settings-cloud__dev-form is-hidden">
          <p class="settings-note" data-i18n="settings.cloud.devFormHint"></p>
          <div class="settings-cloud__dev-fields">
            <label class="settings-cloud__field">
              <span data-i18n="settings.cloud.devEmailLabel"></span>
              <input type="email" id="input-cloud-dev-email" data-cloud-dev-email value="pilgrim@gmail.com" autocomplete="email" />
            </label>
            <label class="settings-cloud__field">
              <span data-i18n="settings.cloud.devNameLabel"></span>
              <input type="text" id="input-cloud-dev-name" data-cloud-dev-name value="丹增行者" autocomplete="name" />
            </label>
          </div>
          <div class="settings-backup__actions">
            <button type="button" id="btn-cloud-dev-submit" class="settings-backup__btn" data-cloud-dev-submit data-i18n="settings.cloud.devSubmitBtn"></button>
            <button type="button" id="btn-cloud-dev-cancel" class="settings-backup__btn settings-cloud__btn--subtle" data-cloud-dev-cancel data-i18n="settings.cloud.devCancelBtn"></button>
          </div>
        </div>
      </div>

      <div id="cloud-signed-in" class="settings-cloud__signed-in is-hidden">
        <div class="settings-cloud__account-row">
          <div class="settings-cloud__user">
            <span id="cloud-user-avatar" class="settings-cloud__avatar" aria-hidden="true">G</span>
            <div class="settings-cloud__user-meta">
              <strong id="cloud-user-name" class="settings-cloud__user-name"></strong>
              <span id="cloud-user-email" class="settings-cloud__user-email"></span>
            </div>
          </div>
          <span id="cloud-sync-badge" class="settings-cloud__badge"></span>
        </div>

        <p id="settings-cloud-summary" class="settings-backup__summary"></p>

        <div id="cloud-conflict-box" class="settings-cloud__conflict is-hidden" role="region" aria-labelledby="cloud-conflict-heading">
          <h4 id="cloud-conflict-heading" class="settings-cloud__conflict-title" data-i18n="settings.cloud.conflict.title"></h4>
          <p class="settings-note" data-i18n="settings.cloud.conflict.desc"></p>
          <div class="settings-cloud__conflict-grid">
            <div class="settings-cloud__conflict-card">
              <div class="settings-cloud__conflict-card-head" data-i18n="settings.cloud.conflict.cloudTitle"></div>
              <p id="cloud-conflict-cloud-summary" class="settings-cloud__conflict-card-meta"></p>
              <button type="button" id="btn-conflict-use-cloud" class="settings-backup__btn settings-backup__btn--import" data-conflict-resolve="cloud" data-i18n="settings.cloud.conflict.useCloudBtn"></button>
            </div>
            <div class="settings-cloud__conflict-card">
              <div class="settings-cloud__conflict-card-head" data-i18n="settings.cloud.conflict.localTitle"></div>
              <p id="cloud-conflict-local-summary" class="settings-cloud__conflict-card-meta"></p>
              <button type="button" id="btn-conflict-use-local" class="settings-backup__btn" data-conflict-resolve="local" data-i18n="settings.cloud.conflict.useLocalBtn"></button>
            </div>
          </div>
        </div>

        <div class="settings-backup__actions">
          <button type="button" id="btn-cloud-sync" class="settings-backup__btn" data-cloud-sync data-i18n="settings.cloud.syncNowBtn"></button>
          <button type="button" id="btn-cloud-pull" class="settings-backup__btn settings-backup__btn--import" data-cloud-pull data-i18n="settings.cloud.pullBtn"></button>
          <button type="button" id="btn-cloud-signout" class="settings-backup__btn settings-cloud__btn--subtle" data-cloud-signout data-i18n="settings.cloud.signOutBtn"></button>
        </div>
      </div>

      <p id="settings-cloud-status" class="settings-backup__status is-hidden" aria-live="polite"></p>
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
  let titleCloudBtn = null;
  const titleActions = document.querySelector('.title-actions');
  if (titleActions) {
    titleCloudBtn = document.createElement('button');
    titleCloudBtn.type = 'button';
    titleCloudBtn.id = 'btn-title-cloud';
    titleCloudBtn.className = 'btn-title-settings btn-title-cloud';
    titleCloudBtn.setAttribute('data-cloud-title-open', '');
    titleCloudBtn.addEventListener('click', () => {
      open();
      const cloudSec = dialog.querySelector('#settings-cloud');
      cloudSec?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    });
    titleActions.appendChild(titleCloudBtn);
  }

  for (const parent of [titleActions, document.querySelector('#top-controls .utility-bar')]) {
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

  // Cloud Save UI elements
  const cloudSignedOutEl = dialog.querySelector('#cloud-signed-out');
  const cloudSignedInEl = dialog.querySelector('#cloud-signed-in');
  const btnGoogleSignIn = dialog.querySelector('[data-cloud-signin]');
  const devFormEl = dialog.querySelector('#cloud-dev-signin-form');
  const inputDevEmail = dialog.querySelector('[data-cloud-dev-email]');
  const inputDevName = dialog.querySelector('[data-cloud-dev-name]');
  const btnDevSubmit = dialog.querySelector('[data-cloud-dev-submit]');
  const btnDevCancel = dialog.querySelector('[data-cloud-dev-cancel]');
  const userAvatarEl = dialog.querySelector('#cloud-user-avatar');
  const userNameEl = dialog.querySelector('#cloud-user-name');
  const userEmailEl = dialog.querySelector('#cloud-user-email');
  const syncBadgeEl = dialog.querySelector('#cloud-sync-badge');
  const cloudSummaryEl = dialog.querySelector('#settings-cloud-summary');
  const conflictBoxEl = dialog.querySelector('#cloud-conflict-box');
  const conflictCloudSummaryEl = dialog.querySelector('#cloud-conflict-cloud-summary');
  const conflictLocalSummaryEl = dialog.querySelector('#cloud-conflict-local-summary');
  const btnConflictCloud = dialog.querySelector('[data-conflict-resolve="cloud"]');
  const btnConflictLocal = dialog.querySelector('[data-conflict-resolve="local"]');
  const btnCloudSync = dialog.querySelector('[data-cloud-sync]');
  const btnCloudPull = dialog.querySelector('[data-cloud-pull]');
  const btnCloudSignOut = dialog.querySelector('[data-cloud-signout]');
  const cloudStatusEl = dialog.querySelector('#settings-cloud-status');

  // Mural Prototype UI elements (#256)
  const muralLockedBoxEl = dialog.querySelector('#mural-proto-locked-box');
  const muralUnlockedBoxEl = dialog.querySelector('#mural-proto-unlocked-box');
  const inputMuralPass = dialog.querySelector('[data-mural-passcode]');
  const btnMuralUnlock = dialog.querySelector('[data-mural-unlock]');
  const muralPassStatusEl = dialog.querySelector('#mural-proto-pass-status');
  const muralHintEl = dialog.querySelector('#mural-proto-hint');

  let devFormOpen = false;

  function showMuralPassStatus(text, isError = false) {
    if (!muralPassStatusEl) return;
    muralPassStatusEl.textContent = text;
    muralPassStatusEl.classList.remove('is-hidden', 'is-error', 'is-ok');
    muralPassStatusEl.classList.add(isError ? 'is-error' : 'is-ok');
  }

  function showBackupStatus(text, isError = false) {
    if (!backupStatusEl) return;
    backupStatusEl.textContent = text;
    backupStatusEl.classList.remove('is-hidden', 'is-error', 'is-ok');
    backupStatusEl.classList.add(isError ? 'is-error' : 'is-ok');
  }

  function showCloudStatus(text, isError = false) {
    if (!cloudStatusEl) return;
    cloudStatusEl.textContent = text;
    cloudStatusEl.classList.remove('is-hidden', 'is-error', 'is-ok');
    cloudStatusEl.classList.add(isError ? 'is-error' : 'is-ok');
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
    if (inputDevEmail) inputDevEmail.placeholder = i18n.t('settings.cloud.devEmailPlaceholder');
    if (inputDevName) inputDevName.placeholder = i18n.t('settings.cloud.devNamePlaceholder');
    if (inputMuralPass) inputMuralPass.placeholder = i18n.t('settings.muralProto.passPlaceholder');

    const savedSettings = ctx.save?.get?.('settings', {}) || {};
    const preset = getDifficulty(ctx);
    const camMode = normalizeCameraMode(savedSettings.cameraAutoFollow);
    const voiceStyle = normalizeVoiceStyle(savedSettings.mantraVoiceStyle);
    const muralUnlocked = Boolean(
      ctx.muralPrototype?.isUnlocked?.() ?? savedSettings.muralProtoUnlocked ?? state.muralProtoUnlocked
    );
    const muralMode = normalizeMuralProtoMode(
      ctx.muralPrototype?.getMode?.() ?? savedSettings.muralProtoMode ?? state.muralProtoMode
    );

    if (muralLockedBoxEl && muralUnlockedBoxEl) {
      muralLockedBoxEl.classList.toggle('is-hidden', muralUnlocked);
      muralUnlockedBoxEl.classList.toggle('is-hidden', !muralUnlocked);
    }
    for (const input of dialog.querySelectorAll('input[name="muralProtoMode"]')) {
      input.checked = input.value === muralMode;
    }
    if (muralHintEl) {
      muralHintEl.textContent = i18n.t(`settings.muralProto.hint.${muralMode}`);
    }

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

    // Cloud Save section render
    const cloudState = ctx.cloudSave?.getState?.() || {
      signedIn: false,
      status: 'signed-out',
      user: null,
      cloudSummary: null,
      conflict: null,
    };

    if (cloudSignedOutEl && cloudSignedInEl) {
      cloudSignedOutEl.classList.toggle('is-hidden', Boolean(cloudState.signedIn));
      cloudSignedInEl.classList.toggle('is-hidden', !cloudState.signedIn);
    }

    if (btnGoogleSignIn) {
      btnGoogleSignIn.classList.toggle('is-hidden', Boolean(cloudState.signedIn) || devFormOpen);
    }

    if (devFormEl) {
      devFormEl.classList.toggle('is-hidden', Boolean(cloudState.signedIn) || !devFormOpen);
    }

    if (cloudState.signedIn && cloudState.user) {
      const displayName = cloudState.user.displayName || cloudState.user.email || 'Pilgrim';
      const initial = displayName.trim().charAt(0).toUpperCase() || 'G';
      if (userAvatarEl) userAvatarEl.textContent = initial;
      if (userNameEl) userNameEl.textContent = displayName;
      if (userEmailEl) userEmailEl.textContent = cloudState.user.email || '';

      if (syncBadgeEl) {
        const st = cloudState.status || 'synced';
        const statusKey = `settings.cloud.status.${st}`;
        syncBadgeEl.textContent = i18n.t(statusKey);
        syncBadgeEl.dataset.status = st;
      }

      if (cloudSummaryEl) {
        const cs = cloudState.cloudSummary;
        if (cs) {
          cloudSummaryEl.textContent = i18n.t('settings.cloud.summary', {
            level: cs.level || 1,
            points: cs.points || 0,
            kora: cs.kora || 0,
            time: formatSavedTime(cs.savedAt || cloudState.lastSyncedSavedAt),
          });
        } else {
          cloudSummaryEl.textContent = i18n.t('settings.cloud.summaryEmpty');
        }
      }

      const hasConflict = cloudState.status === 'conflict' && Boolean(cloudState.conflict);
      if (conflictBoxEl) {
        conflictBoxEl.classList.toggle('is-hidden', !hasConflict);
      }
      if (hasConflict && cloudState.conflict) {
        const cSum = cloudState.conflict.cloudSummary || {};
        const lSum = cloudState.conflict.localSummary || {};
        if (conflictCloudSummaryEl) {
          conflictCloudSummaryEl.textContent = i18n.t('settings.cloud.conflict.cardSummary', {
            level: cSum.level || 1,
            points: cSum.points || 0,
            kora: cSum.kora || 0,
            time: formatSavedTime(cSum.savedAt),
          });
        }
        if (conflictLocalSummaryEl) {
          conflictLocalSummaryEl.textContent = i18n.t('settings.cloud.conflict.cardSummary', {
            level: lSum.level || 1,
            points: lSum.points || 0,
            kora: lSum.kora || 0,
            time: formatSavedTime(lSum.savedAt),
          });
        }
      }
    }

    if (titleCloudBtn) {
      if (cloudState.signedIn && cloudState.user) {
        const name = cloudState.user.displayName || cloudState.user.email || 'Pilgrim';
        titleCloudBtn.textContent = i18n.t('settings.cloud.titleBtnSignedIn', { name });
        titleCloudBtn.classList.add('is-signed-in');
      } else {
        titleCloudBtn.textContent = i18n.t('settings.cloud.titleBtnSignedOut');
        titleCloudBtn.classList.remove('is-signed-in');
      }
      titleCloudBtn.title = i18n.t('settings.cloud.title');
      titleCloudBtn.setAttribute('aria-label', i18n.t('settings.cloud.title'));
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
    if (cloudStatusEl) cloudStatusEl.classList.add('is-hidden');
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
    if (!['difficulty', 'cameraAutoFollow', 'mantraVoiceStyle', 'muralProtoMode'].includes(name)) return;
    if (name === 'muralProtoMode') {
      if (ctx.muralPrototype?.setMode) {
        ctx.muralPrototype.setMode(value, { playUnfurl: value !== 'off' });
      } else {
        const settings = ctx.save.get('settings', {});
        const norm = normalizeMuralProtoMode(value);
        state.muralProtoMode = norm;
        ctx.save.set('settings', { ...settings, muralProtoMode: norm });
        ctx.save.flush();
      }
      render();
      return;
    }
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

  // Mural Prototype passcode unlock & 1-click Try Now handlers (#256)
  function submitMuralUnlock() {
    const raw = inputMuralPass?.value || '';
    const ok = ctx.muralPrototype?.unlockWithPasscode
      ? ctx.muralPrototype.unlockWithPasscode(raw)
      : raw.trim().toLowerCase() === MURAL_PROTO_PASSCODE;
    if (ok) {
      if (!ctx.muralPrototype && ctx.save) {
        const cur = ctx.save.get('settings', {});
        state.muralProtoUnlocked = true;
        state.muralProtoMode = 'optionA';
        ctx.save.set('settings', { ...cur, muralProtoUnlocked: true, muralProtoMode: 'optionA' });
        ctx.save.flush();
      }
      if (muralPassStatusEl) muralPassStatusEl.classList.add('is-hidden');
      render();
    } else {
      showMuralPassStatus(i18n.t('settings.muralProto.wrongPass'), true);
    }
  }

  if (btnMuralUnlock) {
    btnMuralUnlock.addEventListener('click', submitMuralUnlock);
  }
  if (inputMuralPass) {
    inputMuralPass.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        submitMuralUnlock();
      }
    });
  }
  for (const tryBtn of dialog.querySelectorAll('[data-mural-try]')) {
    tryBtn.addEventListener('click', () => {
      const targetMode = tryBtn.dataset.muralTry;
      if (ctx.muralPrototype?.launchDemo) {
        ctx.muralPrototype.launchDemo(targetMode);
      } else {
        close();
      }
    });
  }
  ctx.bus?.on?.('muralProto:changed', () => render());

  // Cloud Save button handlers
  if (btnGoogleSignIn) {
    btnGoogleSignIn.addEventListener('click', async () => {
      if (!ctx.cloudSave) return;
      const res = await ctx.cloudSave.signInWithGoogle();
      if (res?.needsDevPrompt) {
        devFormOpen = true;
        render();
        inputDevEmail?.focus?.();
      } else if (res?.ok) {
        devFormOpen = false;
        showCloudStatus(i18n.t('settings.cloud.toastSynced'), false);
        render();
      }
    });
  }

  async function submitDevSignIn() {
    if (!ctx.cloudSave) return;
    const email = inputDevEmail?.value?.trim() || 'pilgrim@gmail.com';
    const displayName = inputDevName?.value?.trim() || email.split('@')[0] || 'Pilgrim';
    const res = await ctx.cloudSave.signInWithGoogle({
      devProfile: { email, displayName },
    });
    if (res?.ok) {
      devFormOpen = false;
      showCloudStatus(i18n.t('settings.cloud.toastSynced'), false);
      render();
    } else {
      showCloudStatus(i18n.t('settings.cloud.statusError'), true);
      render();
    }
  }

  if (btnDevSubmit) {
    btnDevSubmit.addEventListener('click', submitDevSignIn);
  }

  for (const inp of [inputDevEmail, inputDevName]) {
    if (!inp) continue;
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        submitDevSignIn();
      }
    });
  }

  if (btnDevCancel) {
    btnDevCancel.addEventListener('click', () => {
      devFormOpen = false;
      render();
    });
  }

  if (btnCloudSync) {
    btnCloudSync.addEventListener('click', async () => {
      if (!ctx.cloudSave) return;
      const res = await ctx.cloudSave.syncNow({ silentToast: false });
      if (res?.ok) {
        showCloudStatus(i18n.t('settings.cloud.toastSynced'), false);
      } else if (res?.error !== 'save-conflict') {
        showCloudStatus(i18n.t('settings.cloud.statusError'), true);
      }
      render();
    });
  }

  if (btnCloudPull) {
    btnCloudPull.addEventListener('click', async () => {
      if (!ctx.cloudSave) return;
      const res = await ctx.cloudSave.pullFromCloud({ reload: false });
      if (res?.ok) {
        showCloudStatus(i18n.t('settings.cloud.toastLoaded'), false);
      } else {
        showCloudStatus(i18n.t('settings.cloud.statusError'), true);
      }
      render();
    });
  }

  if (btnCloudSignOut) {
    btnCloudSignOut.addEventListener('click', () => {
      if (!ctx.cloudSave) return;
      ctx.cloudSave.signOut();
      devFormOpen = false;
      showCloudStatus(i18n.t('settings.cloud.toastSignedOut'), false);
      render();
    });
  }

  if (btnConflictCloud) {
    btnConflictCloud.addEventListener('click', async () => {
      if (!ctx.cloudSave) return;
      const res = await ctx.cloudSave.resolveConflict('cloud', { reload: false });
      if (res?.ok) {
        showCloudStatus(i18n.t('settings.cloud.toastConflictCloud'), false);
      }
      render();
    });
  }

  if (btnConflictLocal) {
    btnConflictLocal.addEventListener('click', async () => {
      if (!ctx.cloudSave) return;
      const res = await ctx.cloudSave.resolveConflict('local', { reload: false });
      if (res?.ok) {
        showCloudStatus(i18n.t('settings.cloud.toastConflictLocal'), false);
      }
      render();
    });
  }

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

  ctx.bus?.on?.('cloudSave:changed', () => render());
  ctx.bus?.on?.('cloudSave:conflict', () => {
    render();
    if (!dialog.open) open();
  });
  ctx.bus?.on?.('cloudSave:requestDevPrompt', () => {
    devFormOpen = true;
    render();
    if (!dialog.open) open();
  });
  ctx.bus?.on?.('save:imported', () => render());
  ctx.bus?.on?.('save:flushed', () => render());

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
  const api = { open, close, render, isOpen: () => dialog.open };
  ctx.settingsUi = api;
  return api;
}
