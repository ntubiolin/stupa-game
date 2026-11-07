/**
 * Dialogue UI & Flow Engine (`src/ui/dialogue.js`).
 *
 * Features:
 *  - Bottom glassmorphic dialogue box with speaker name & procedural 2D canvas portrait
 *    (silhouette + theme aura per look: lama, merchant, artisan, villager, noble, abbot, yogini, vision)
 *  - Typewriter text effect (~50 chars/sec)
 *  - Inline codex link parser `[[codex:samye|桑耶寺]]` -> gold-underlined clickable `<span class="codex-link">`
 *    that emits `bus.emit('codex:open', { id })`
 *  - Choice filtering via `requires: { flag, notFlag, questStep, questActive, questDone }`
 *  - Full support for all 11 dialogue node/choice actions:
 *    `startQuest`, `completeStep`, `setFlag`, `unlockCodex`, `giveItem`, `giveTurquoise`,
 *    `giveExp`, `openShop`, `openCrafting`, `teleport`, `emit`
 *  - Controls: E / Space / click -> skip typewriter if typing, else advance to `next`;
 *    keys 1–3 or click -> select choice; Esc -> close. Sets `state.uiOpen = true` while open.
 */
import { DEBUG_DIALOGUES } from '../data/dialogues/debug.js';
import { PROLOGUE_DIALOGUES } from '../data/dialogues/prologue.js';
import '../i18n/quests.js';
import '../i18n/prologue.js';

const TYPEWRITER_SPEED = 52; // chars per second

const PORTRAIT_THEMES = {
  lama: { bg1: '#5c1620', bg2: '#1e0d18', ring: '#f0a830', sil: '#f7d794', accent: '#e08a1e' },
  merchant: { bg1: '#1d4650', bg2: '#0f1c24', ring: '#d99b4e', sil: '#e6ccb2', accent: '#c85a28' },
  artisan: { bg1: '#5e3419', bg2: '#1c110b', ring: '#d89a3c', sil: '#f0cfa0', accent: '#8e4c24' },
  villager: { bg1: '#463f36', bg2: '#171412', ring: '#c2b092', sil: '#e5dac8', accent: '#354b6e' },
  noble: { bg1: '#4a1852', bg2: '#180a20', ring: '#f2c659', sil: '#fae3a4', accent: '#38d9c8' },
  abbot: { bg1: '#7c3810', bg2: '#220f08', ring: '#f5b02e', sil: '#ffe0a3', accent: '#a61c24' },
  yogini: { bg1: '#1d4e70', bg2: '#0d1c2b', ring: '#5cd6cc', sil: '#f4f8fb', accent: '#38c6b8' },
  vision: { bg1: '#8c5a10', bg2: '#281805', ring: '#ffe066', sil: '#fff3b8', accent: '#ffba26' },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parse raw localized string containing `[[codex:id|label]]` into tokens:
 *   [{ type: 'text', text }, { type: 'codex', id, text }]
 */
export function parseDialogueTokens(rawText) {
  const str = String(rawText || '');
  const tokens = [];
  const regex = /\[\[codex:([^|\]]+)\|([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        text: str.slice(lastIndex, match.index),
      });
    }
    tokens.push({
      type: 'codex',
      id: match[1].trim(),
      text: match[2],
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    tokens.push({
      type: 'text',
      text: str.slice(lastIndex),
    });
  }

  return tokens;
}

/**
 * Render tokens up to `maxChars` characters into HTML.
 */
function renderTokensHtml(tokens, maxChars) {
  let remaining = Math.max(0, Math.floor(maxChars));
  let html = '';

  for (let i = 0; i < tokens.length; i++) {
    if (remaining <= 0) break;
    const tok = tokens[i];
    const slice = tok.text.slice(0, remaining);
    remaining -= slice.length;

    if (tok.type === 'codex') {
      html += `<span class="codex-link" role="button" tabindex="0" data-codex-id="${escapeHtml(tok.id)}">${escapeHtml(slice)}</span>`;
    } else {
      html += escapeHtml(slice);
    }
  }
  return html;
}

/**
 * Draw stylized 2D silhouette & aura portrait for the given NPC look.
 */
function drawSpeakerPortrait(canvas, look = 'lama') {
  if (!canvas) return;
  const c = canvas.getContext('2d');
  if (!c) return;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const theme = PORTRAIT_THEMES[look] || PORTRAIT_THEMES.lama;

  c.clearRect(0, 0, w, h);

  // Radial background gradient
  const grad = c.createRadialGradient(cx, cy * 0.85, w * 0.08, cx, cy, w * 0.5);
  grad.addColorStop(0, theme.bg1);
  grad.addColorStop(1, theme.bg2);
  c.fillStyle = grad;
  c.beginPath();
  c.arc(cx, cy, w * 0.47, 0, Math.PI * 2);
  c.fill();

  // Concentric halo rings for vision or subtle mandala ring for others
  c.save();
  c.strokeStyle = theme.ring;
  c.globalAlpha = look === 'vision' ? 0.55 : 0.22;
  c.lineWidth = look === 'vision' ? 2.5 : 1.5;
  c.beginPath();
  c.arc(cx, cy * 0.82, w * 0.28, 0, Math.PI * 2);
  c.stroke();
  if (look === 'vision') {
    c.globalAlpha = 0.35;
    c.beginPath();
    c.arc(cx, cy * 0.82, w * 0.36, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();

  // Clip to portrait circle for silhouette
  c.save();
  c.beginPath();
  c.arc(cx, cy, w * 0.46, 0, Math.PI * 2);
  c.clip();

  // Shoulders / Robe silhouette
  c.fillStyle = theme.sil;
  if (look === 'vision') {
    c.shadowColor = '#ffbe2e';
    c.shadowBlur = 16;
  }

  c.beginPath();
  c.moveTo(cx - w * 0.32, h * 0.96);
  c.quadraticCurveTo(cx - w * 0.28, h * 0.64, cx, h * 0.62);
  c.quadraticCurveTo(cx + w * 0.28, h * 0.64, cx + w * 0.32, h * 0.96);
  c.closePath();
  c.fill();

  // Shawl / Collar accent
  c.fillStyle = theme.accent;
  c.beginPath();
  c.moveTo(cx - w * 0.22, h * 0.96);
  c.lineTo(cx - w * 0.08, h * 0.63);
  c.lineTo(cx + w * 0.16, h * 0.96);
  c.closePath();
  c.fill();

  // Head silhouette (no facial details)
  c.fillStyle = theme.sil;
  c.beginPath();
  c.arc(cx, h * 0.45, w * 0.145, 0, Math.PI * 2);
  c.fill();

  // Look-specific headgear / prop silhouette
  if (look === 'lama') {
    // Curved yellow Pandita crest hat
    c.fillStyle = '#f2b632';
    c.beginPath();
    c.moveTo(cx - w * 0.15, h * 0.38);
    c.quadraticCurveTo(cx, h * 0.16, cx + w * 0.08, h * 0.18);
    c.quadraticCurveTo(cx + w * 0.14, h * 0.28, cx + w * 0.15, h * 0.38);
    c.closePath();
    c.fill();
  } else if (look === 'abbot') {
    // Pointed Pandita hat + long ear-flaps
    c.fillStyle = '#c92a2a';
    c.beginPath();
    c.moveTo(cx - w * 0.15, h * 0.38);
    c.lineTo(cx, h * 0.12);
    c.lineTo(cx + w * 0.15, h * 0.38);
    c.closePath();
    c.fill();
    c.fillRect(cx - w * 0.16, h * 0.38, w * 0.035, h * 0.26);
    c.fillRect(cx + w * 0.125, h * 0.38, w * 0.035, h * 0.26);
  } else if (look === 'merchant') {
    // Fur-brimmed dome hat + cargo pack edge
    c.fillStyle = '#5c3a21';
    c.beginPath();
    c.ellipse(cx, h * 0.35, w * 0.17, h * 0.045, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#d95b2b';
    c.beginPath();
    c.arc(cx, h * 0.34, w * 0.12, Math.PI, 0);
    c.fill();
  } else if (look === 'artisan') {
    // Headband + small hammer silhouette on right
    c.fillStyle = '#d89a3c';
    c.fillRect(cx - w * 0.145, h * 0.36, w * 0.29, h * 0.035);
    c.fillRect(cx + w * 0.22, h * 0.46, w * 0.03, h * 0.22);
    c.fillRect(cx + w * 0.17, h * 0.44, w * 0.13, h * 0.055);
  } else if (look === 'villager') {
    // Headscarf wrap
    c.fillStyle = '#d6c7ae';
    c.beginPath();
    c.arc(cx, h * 0.40, w * 0.16, Math.PI * 0.95, Math.PI * 0.05);
    c.fill();
  } else if (look === 'noble') {
    // Tall silk turban + turquoise gem
    c.fillStyle = '#b82538';
    c.beginPath();
    c.roundRect(cx - w * 0.155, h * 0.20, w * 0.31, h * 0.19, 8);
    c.fill();
    c.fillStyle = '#38d9c8';
    c.beginPath();
    c.arc(cx, h * 0.29, w * 0.035, 0, Math.PI * 2);
    c.fill();
  } else if (look === 'yogini') {
    // Long flowing hair + tiara + celestial scarf
    c.fillStyle = '#181420';
    c.fillRect(cx - w * 0.17, h * 0.42, w * 0.05, h * 0.34);
    c.fillRect(cx + w * 0.12, h * 0.42, w * 0.05, h * 0.34);
    c.strokeStyle = '#5cd6cc';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(cx, h * 0.56, w * 0.28, Math.PI * 1.1, Math.PI * 1.9);
    c.stroke();
  } else if (look === 'vision') {
    // Lotus crown + Khatvanga trident staff silhouette
    c.fillStyle = '#ffe57f';
    c.beginPath();
    c.moveTo(cx - w * 0.18, h * 0.36);
    c.lineTo(cx - w * 0.12, h * 0.22);
    c.lineTo(cx, h * 0.11);
    c.lineTo(cx + w * 0.12, h * 0.22);
    c.lineTo(cx + w * 0.18, h * 0.36);
    c.closePath();
    c.fill();

    // Khatvanga trident on left
    c.strokeStyle = '#fff3b8';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(cx - w * 0.24, h * 0.88);
    c.lineTo(cx - w * 0.24, h * 0.22);
    c.stroke();
    c.beginPath();
    c.arc(cx - w * 0.24, h * 0.22, w * 0.04, 0, Math.PI, true);
    c.stroke();
  }

  c.restore();

  // Outer golden border ring
  c.strokeStyle = theme.ring;
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(cx, cy, w * 0.46, 0, Math.PI * 2);
  c.stroke();
}

export function createDialogue(ctx) {
  const { state, bus, i18n } = ctx;
  const registry = new Map();
  const executedActionsLog = [];

  function register(defs, maybeDef) {
    if (typeof defs === 'string' && maybeDef && typeof maybeDef === 'object') {
      registry.set(defs, { id: defs, ...maybeDef });
      return;
    }
    if (!defs || typeof defs !== 'object') return;
    if (defs.id && defs.nodes) {
      registry.set(defs.id, defs);
      return;
    }
    for (const [id, def] of Object.entries(defs)) {
      if (def && typeof def === 'object') {
        registry.set(def.id || id, { id: def.id || id, ...def });
      }
    }
  }

  function resolveSpeakerKey(raw) {
    if (!raw || typeof raw !== 'string') return 'npc.oldLama';
    if (
      raw.startsWith('npc.') ||
      raw.startsWith('boss.') ||
      raw.startsWith('dlg.') ||
      i18n?.has?.(raw)
    ) {
      if (raw.startsWith('boss.') && !raw.endsWith('.name') && i18n?.has?.(`${raw}.name`)) {
        return `${raw}.name`;
      }
      return raw;
    }
    return `npc.${raw}`;
  }

  function normalizeActionItem(act) {
    if (!act || typeof act !== 'object') return null;
    if (act.type) return act;
    if (act.flag) {
      return { type: 'setFlag', flag: act.flag, value: act.value ?? true };
    }
    return null;
  }

  function collectActions(obj) {
    if (!obj || typeof obj !== 'object') return [];
    const list = [];
    if (Array.isArray(obj.actions)) {
      for (const a of obj.actions) {
        const norm = normalizeActionItem(a);
        if (norm) list.push(norm);
      }
    }
    if (obj.action && typeof obj.action === 'object') {
      const norm = normalizeActionItem(obj.action);
      if (norm) list.push(norm);
    }
    return list;
  }

  // Register debug & prologue dialogues + auto-discover chapter dialogues (`src/data/dialogues/*.js`)
  register(DEBUG_DIALOGUES);
  register(PROLOGUE_DIALOGUES);
  const chapterDialogueModules =
    (typeof import.meta.glob === 'function' &&
      import.meta.glob('../data/dialogues/*.js', { eager: true })) ||
    {};
  for (const mod of Object.values(chapterDialogueModules)) {
    if (!mod || typeof mod !== 'object') continue;
    for (const val of Object.values(mod)) {
      if (val && typeof val === 'object') {
        register(val);
      }
    }
  }

  // ---------------------------------------------------------------- DOM Construction
  const uiRoot = document.getElementById('ui') || document.body;
  const wrap = document.createElement('section');
  wrap.id = 'dialogue-overlay';
  wrap.className = 'dialogue-overlay is-hidden';
  wrap.setAttribute('aria-label', 'Dialogue');

  wrap.innerHTML = `
    <div id="dialogue-box" class="dialogue-box glass-panel">
      <div class="dialogue-portrait-wrap">
        <canvas id="dialogue-portrait" class="dialogue-portrait" width="144" height="144"></canvas>
      </div>
      <div class="dialogue-content">
        <div class="dialogue-header">
          <span id="dialogue-speaker" class="dialogue-speaker"></span>
          <button id="dialogue-close-btn" type="button" class="dialogue-close-btn" aria-label="Close">✕</button>
        </div>
        <div id="dialogue-text" class="dialogue-text"></div>
        <div id="dialogue-choices" class="dialogue-choices"></div>
        <div class="dialogue-footer">
          <span id="dialogue-hint" class="dialogue-hint"></span>
          <button id="dialogue-next-btn" type="button" class="dialogue-next-btn">
            <span id="dialogue-next-label"></span>
            <span aria-hidden="true">▸</span>
          </button>
        </div>
      </div>
    </div>
  `;
  uiRoot.appendChild(wrap);

  const boxEl = wrap.querySelector('#dialogue-box');
  const portraitCanvas = wrap.querySelector('#dialogue-portrait');
  const speakerEl = wrap.querySelector('#dialogue-speaker');
  const closeBtn = wrap.querySelector('#dialogue-close-btn');
  const textEl = wrap.querySelector('#dialogue-text');
  const choicesEl = wrap.querySelector('#dialogue-choices');
  const hintEl = wrap.querySelector('#dialogue-hint');
  const nextBtn = wrap.querySelector('#dialogue-next-btn');
  const nextLabelEl = wrap.querySelector('#dialogue-next-label');

  // ---------------------------------------------------------------- Runtime State
  let active = null;
  // active = { id, def, nodeId, node, npcId, speakerKey, look, tokens, totalChars, revealedChars, typing, visibleChoices, openedAtMs }

  function isChoiceAvailable(choice) {
    if (!choice) return false;
    const req = choice.requires;
    if (!req) return true;

    if (req.flag) {
      const flags = Array.isArray(req.flag) ? req.flag : [req.flag];
      for (const f of flags) {
        if (!ctx.quests?.hasFlag(f)) return false;
      }
    }
    if (req.notFlag) {
      const flags = Array.isArray(req.notFlag) ? req.notFlag : [req.notFlag];
      for (const f of flags) {
        if (ctx.quests?.hasFlag(f)) return false;
      }
    }
    if (req.questActive && !ctx.quests?.isActive(req.questActive)) {
      return false;
    }
    if (req.questDone && !ctx.quests?.isDone(req.questDone)) {
      return false;
    }
    if (req.questStep) {
      if (typeof req.questStep === 'string') {
        const [qId, stepId] = req.questStep.split(':');
        if (!ctx.quests?.isAtStep(qId, stepId)) return false;
      } else if (typeof req.questStep === 'object') {
        if (!ctx.quests?.isAtStep(req.questStep.id, req.questStep.step)) return false;
      }
    }
    return true;
  }

  function executeActions(actions) {
    if (!Array.isArray(actions) || actions.length === 0) return;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (!action || !action.type) continue;

      executedActionsLog.push({ ...action, at: Date.now() });

      switch (action.type) {
        case 'startQuest': {
          if (action.forceRestart) {
            ctx.quests?.reset?.(action.id);
          }
          ctx.quests?.start?.(action.id);
          break;
        }
        case 'completeStep': {
          ctx.quests?.completeStep?.(action.id, action.step);
          break;
        }
        case 'setFlag': {
          const flagName = action.flag || action.id;
          if (flagName) {
            ctx.quests?.setFlag?.(flagName, action.value ?? true);
          }
          break;
        }
        case 'unlockCodex':
        case 'codexUnlock':
        case 'codex': {
          const codexId = action.id || action.entryId || action.codexId;
          if (codexId) {
            ctx.codex?.unlock?.(codexId);
            bus.emit('codex:unlock', { id: codexId });
          }
          break;
        }
        case 'giveItem': {
          const item = ctx.loot?.rollItem
            ? ctx.loot.rollItem(action)
            : ctx.loot?.generate
              ? ctx.loot.generate(action)
              : {
                  uid: `item_${Date.now()}_${i}`,
                  baseId: action.baseId || 'bronze_vajra',
                  slot: action.slot || 'mainhand',
                  rarity: action.rarity || 'blessed',
                  ilvl: action.ilvl || 1,
                };
          const addFn = ctx.inventory?.addItem || ctx.inventory?.add;
          if (addFn) {
            addFn.call(ctx.inventory, item);
          } else {
            if (!Array.isArray(state.stubBag)) state.stubBag = [];
            state.stubBag.push(item);
          }
          bus.emit('loot:pickup', { item });
          break;
        }
        case 'giveTurquoise': {
          const amount = Number(action.amount ?? action.count ?? action.value ?? 0);
          if (amount > 0) {
            if (ctx.inventory?.addTurquoise) {
              ctx.inventory.addTurquoise(amount);
            } else {
              state.turquoise = (state.turquoise || 0) + amount;
              bus.emit('currency:changed', { turquoise: state.turquoise, delta: amount });
            }
          }
          break;
        }
        case 'giveExp': {
          const exp = Number(action.amount ?? action.exp ?? action.value ?? 0);
          if (exp > 0) {
            ctx.vitals?.addExp?.(exp);
          }
          break;
        }
        case 'openShop': {
          bus.emit('shop:open', { id: action.id || 'merchant' });
          break;
        }
        case 'openCrafting': {
          bus.emit('crafting:open', { id: action.id || 'artisan' });
          break;
        }
        case 'teleport': {
          const targetMap = (!action.map || action.map === 'current') ? (state.zone || 'stupa') : action.map;
          ctx.zones?.teleport?.(targetMap, {
            spawn: action.spawn,
            skipFade: action.skipFade ?? (targetMap === state.zone),
            silent: targetMap === state.zone,
          });
          break;
        }
        case 'emit': {
          const evName = action.event || action.name;
          if (evName) {
            bus.emit(evName, action.payload ?? {});
          }
          break;
        }
        default:
          break;
      }
    }
  }

  function renderCurrentNode() {
    if (!active) return;

    // Speaker & Portrait
    const speakerName = i18n.t(active.speakerKey);
    speakerEl.textContent = speakerName;
    drawSpeakerPortrait(portraitCanvas, active.look);

    // Text
    textEl.innerHTML = renderTokensHtml(active.tokens, active.revealedChars);

    // Choices
    const hasChoices = active.visibleChoices.length > 0;
    if (hasChoices) {
      choicesEl.innerHTML = active.visibleChoices
        .map((c, idx) => {
          const label = escapeHtml(i18n.t(c.textKey || c.labelKey || ''));
          return `
            <button type="button" class="dialogue-choice-btn" data-choice-index="${idx}">
              <kbd class="dialogue-choice-key">${idx + 1}</kbd>
              <span class="dialogue-choice-text">${label}</span>
            </button>
          `;
        })
        .join('');
      choicesEl.classList.remove('is-hidden');
    } else {
      choicesEl.innerHTML = '';
      choicesEl.classList.add('is-hidden');
    }

    updateFooterControls();
  }

  function updateFooterControls() {
    if (!active) return;
    const hasChoices = active.visibleChoices.length > 0;
    hintEl.textContent = i18n.t(hasChoices ? 'dlg.hint.choices' : 'dlg.hint.advance');

    if (active.typing) {
      nextBtn.classList.remove('is-hidden');
      nextLabelEl.textContent = i18n.t('dlg.skip');
    } else if (hasChoices) {
      nextBtn.classList.add('is-hidden');
    } else {
      nextBtn.classList.remove('is-hidden');
      nextLabelEl.textContent = i18n.t(active.node.next ? 'dlg.continue' : 'dlg.close');
    }
  }

  function matchesBranchCondition(when) {
    if (!when) return true;
    if (when.flag) {
      const flags = Array.isArray(when.flag) ? when.flag : [when.flag];
      for (const f of flags) {
        if (!ctx.quests?.hasFlag(f)) return false;
      }
    }
    if (when.notFlag) {
      const flags = Array.isArray(when.notFlag) ? when.notFlag : [when.notFlag];
      for (const f of flags) {
        if (ctx.quests?.hasFlag(f)) return false;
      }
    }
    if (when.quest) {
      if (when.step !== undefined) {
        if (!ctx.quests?.isAtStep(when.quest, when.step)) return false;
      } else {
        if (!ctx.quests?.isActive(when.quest)) return false;
      }
    }
    return true;
  }

  function enterNode(nodeId, depth = 0) {
    if (!active) return;
    const node = active.def.nodes?.[nodeId];
    if (!node) {
      close();
      return;
    }

    if (depth < 8 && Array.isArray(node.branches)) {
      for (const branch of node.branches) {
        if (branch?.goto && matchesBranchCondition(branch.when) && active.def.nodes?.[branch.goto]) {
          enterNode(branch.goto, depth + 1);
          return;
        }
      }
    }

    active.nodeId = nodeId;
    active.node = node;
    const nodeSpeaker = node.speakerKey || node.speaker;
    if (nodeSpeaker) {
      active.speakerKey = resolveSpeakerKey(nodeSpeaker);
    }
    if (node.look) {
      active.look = node.look;
    }

    // Execute node entry actions BEFORE evaluating choices so flags set by the node are available to choice `requires`
    const nodeActions = collectActions(node);
    if (nodeActions.length > 0) {
      executeActions(nodeActions);
    }

    const rawText = i18n.t(node.textKey || node.text || '');
    const tokens = parseDialogueTokens(rawText);
    const totalChars = tokens.reduce((sum, t) => sum + t.text.length, 0);

    active.tokens = tokens;
    active.totalChars = totalChars;
    active.revealedChars = 0;
    active.typing = totalChars > 0;
    active.visibleChoices = Array.isArray(node.choices)
      ? node.choices.filter(isChoiceAvailable)
      : [];

    renderCurrentNode();
  }

  function open(dialogueId, opts = {}) {
    const def = registry.get(dialogueId);
    if (!def) {
      console.warn(`[dialogue] Unknown dialogue id "${dialogueId}"`);
      return false;
    }

    let startNodeId = opts.nodeId || def.start || 'start';
    if (!def.nodes?.[startNodeId]) {
      startNodeId = Object.keys(def.nodes || {})[0] || 'start';
    }
    const firstNode = def.nodes?.[startNodeId];
    if (!firstNode) return false;

    const rawSpeaker =
      opts.speakerKey ||
      opts.speaker ||
      firstNode.speakerKey ||
      firstNode.speaker ||
      def.speakerKey ||
      def.speaker ||
      'npc.oldLama';
    const speakerKey = resolveSpeakerKey(rawSpeaker);
    const look = opts.look || firstNode.look || def.look || 'lama';

    active = {
      id: dialogueId,
      def,
      nodeId: startNodeId,
      node: firstNode,
      npcId: opts.npcId || null,
      speakerKey,
      look,
      tokens: [],
      totalChars: 0,
      revealedChars: 0,
      typing: false,
      visibleChoices: [],
      openedAtMs: performance.now(),
    };

    state.uiOpen = true;
    wrap.classList.remove('is-hidden');
    bus.emit('dialogue:open', { id: dialogueId, npcId: active.npcId });
    bus.emit('sfx', { name: 'step' });

    enterNode(startNodeId);
    return true;
  }

  function close() {
    if (!active) return;
    const closedId = active.id;
    const closedNpcId = active.npcId;
    active = null;
    wrap.classList.add('is-hidden');
    state.uiOpen = Boolean(
      ctx.questUi?.isOpen?.() ||
        ctx.shop?.isOpen?.() ||
        ctx.crafting?.isOpen?.() ||
        ctx.inventoryUi?.isOpen?.()
    );
    bus.emit('dialogue:close', { id: closedId, npcId: closedNpcId });
  }

  function skipTypewriter() {
    if (!active || !active.typing) return false;
    active.revealedChars = active.totalChars;
    active.typing = false;
    textEl.innerHTML = renderTokensHtml(active.tokens, active.totalChars);
    updateFooterControls();
    return true;
  }

  function advance() {
    if (!active) return;
    if (active.typing) {
      skipTypewriter();
      return;
    }
    // If there are choices, E/Space does not blindly pick a choice unless there are none
    if (active.visibleChoices.length > 0) {
      return;
    }
    const nextNodeId = active.node?.next;
    if (nextNodeId) {
      enterNode(nextNodeId);
    } else {
      close();
    }
  }

  function selectChoice(index) {
    if (!active) return false;
    const choice = active.visibleChoices[index];
    if (!choice) return false;

    const choiceActions = collectActions(choice);
    if (choiceActions.length > 0) {
      executeActions(choiceActions);
    }

    if (choice.next) {
      enterNode(choice.next);
    } else {
      close();
    }
    return true;
  }

  // ---------------------------------------------------------------- Event Listeners
  // 1. Click on Codex links inside dialogue text
  textEl.addEventListener('click', (e) => {
    const link = e.target.closest?.('.codex-link');
    if (link) {
      e.preventDefault();
      e.stopPropagation();
      const codexId = link.getAttribute('data-codex-id');
      if (codexId) {
        bus.emit('codex:open', { id: codexId });
        if (!ctx.codex) {
          bus.emit('toast', { key: 'quest.toast.codexLink', params: { id: codexId } });
        }
      }
    }
  });

  // 2. Click on Choice buttons
  choicesEl.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.dialogue-choice-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const idx = Number(btn.getAttribute('data-choice-index'));
    if (!Number.isNaN(idx)) {
      selectChoice(idx);
    }
  });

  // 3. Click on Close button
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  });

  // 4. Click on Next / Skip button or Dialogue box body
  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    advance();
  });

  boxEl.addEventListener('click', (e) => {
    if (e.target.closest?.('.codex-link, .dialogue-choice-btn, .dialogue-close-btn, .dialogue-next-btn')) {
      return;
    }
    advance();
  });

  // 5. Keyboard controls while dialogue is open
  window.addEventListener(
    'keydown',
    (e) => {
      if (!active) return;
      // Guard against the same E keypress that opened the dialogue
      if (performance.now() - active.openedAtMs < 65) return;

      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }

      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        if (active.visibleChoices.length >= 1) {
          e.preventDefault();
          e.stopPropagation();
          selectChoice(0);
        }
        return;
      }
      if (e.code === 'Digit2' || e.code === 'Numpad2') {
        if (active.visibleChoices.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          selectChoice(1);
        }
        return;
      }
      if (e.code === 'Digit3' || e.code === 'Numpad3') {
        if (active.visibleChoices.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          selectChoice(2);
        }
        return;
      }

      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        advance();
      }
    },
    true
  );

  // Re-localize if language is toggled while open
  i18n.onChange(() => {
    if (!active) return;
    const rawText = i18n.t(active.node.textKey || active.node.text || '');
    active.tokens = parseDialogueTokens(rawText);
    active.totalChars = active.tokens.reduce((sum, t) => sum + t.text.length, 0);
    if (!active.typing) {
      active.revealedChars = active.totalChars;
    }
    renderCurrentNode();
  });

  function update(dt) {
    if (!active || !active.typing) return;
    const prevChars = Math.floor(active.revealedChars);
    active.revealedChars = Math.min(active.totalChars, active.revealedChars + dt * TYPEWRITER_SPEED);
    const nextChars = Math.floor(active.revealedChars);

    if (nextChars !== prevChars || active.revealedChars >= active.totalChars) {
      textEl.innerHTML = renderTokensHtml(active.tokens, active.revealedChars);
    }

    if (active.revealedChars >= active.totalChars) {
      active.typing = false;
      updateFooterControls();
    }
  }

  const api = {
    update,
    open,
    close,
    advance,
    skip: skipTypewriter,
    selectChoice,
    choose: selectChoice,
    register,
    isOpen() {
      return Boolean(active);
    },
    getCurrent() {
      return active;
    },
    state() {
      return {
        open: Boolean(active),
        id: active?.id || null,
        nodeId: active?.nodeId || null,
        npcId: active?.npcId || null,
        speakerKey: active?.speakerKey || null,
        speaker: active?.speakerKey ? i18n.t(active.speakerKey) : null,
        typing: Boolean(active?.typing),
        choices:
          active?.visibleChoices?.map((c, i) => {
            const key = c.textKey || c.labelKey || '';
            return { index: i + 1, textKey: key, text: i18n.t(key) };
          }) || [],
        executedActions: [...executedActionsLog],
      };
    },
  };

  ctx.dialogue = api;
  ctx.debug?.register('dialogue', api);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.dialogue = api;
  }

  return api;
}
