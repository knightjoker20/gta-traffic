// =====================================================
// combatapp.js — NPC Combat Editor
// Handles: pedhealth.meta · pedbrawlingstyle.meta
//          combatbehaviour.meta · agitatedtriggers.meta
// =====================================================

// ── State ─────────────────────────────────────────────────────────────────
let combatState = {
  healthData: null,    healthVanilla: null,    healthFile: null,
  brawlingData: null,  brawlingVanilla: null,  brawlingFile: null,
  behaviourData: null, behaviourVanilla: null, behaviourFile: null,
  triggersData: null,  triggersVanilla: null,  triggersFile: null,
  activeBrawlingIdx: 0,
  activeBehaviourIdx: 0,
};
window.combatState = combatState;

// ── Helpers ───────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

function getAttrVal(item, tag) {
  const el = item.querySelector(tag);
  return el ? el.getAttribute('value') : null;
}
function getText(item, tag) {
  const el = item.querySelector(tag);
  return el ? el.textContent.trim() : null;
}
function getMinMax(item, tag) {
  const el = item.querySelector(tag);
  if (!el) return null;
  return {
    min: el.querySelector('Min') ? el.querySelector('Min').getAttribute('value') : null,
    max: el.querySelector('Max') ? el.querySelector('Max').getAttribute('value') : null,
  };
}

function fmtFloat(v, d = 6) {
  if (v === null || v === undefined || v === '') return '';
  const n = parseFloat(v);
  return isNaN(n) ? String(v) : n.toFixed(d);
}
function fmtInt(v) {
  if (v === null || v === undefined || v === '') return '';
  return String(parseInt(v));
}

function escXml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function setDropState(zoneId, text) {
  const el = qs('.combat-drop-state-text', $(zoneId));
  if (el) el.textContent = text;
}

function enableTabButtons(prefix) {
  const exp = $(prefix + 'ExportBtn'), rst = $(prefix + 'ResetBtn');
  if (exp) exp.disabled = false;
  if (rst) rst.disabled = false;
}

function updateModCount() {
  const check = (data, vanilla, id) => {
    const el = $(id);
    if (!el) return;
    if (!data || !vanilla) { el.textContent = ''; return; }
    el.textContent = JSON.stringify(data) !== JSON.stringify(vanilla) ? '● Modified' : '';
  };
  check(combatState.healthData, combatState.healthVanilla, 'healthModCount');
  check(combatState.brawlingData, combatState.brawlingVanilla, 'brawlingModCount');
  check(combatState.behaviourData, combatState.behaviourVanilla, 'behaviourModCount');
  check(combatState.triggersData, combatState.triggersVanilla, 'triggersModCount');
  const modFiles = ['health','brawling','behaviour','triggers'].filter(k => {
    return combatState[k + 'Data'] && combatState[k + 'Vanilla'] &&
      JSON.stringify(combatState[k + 'Data']) !== JSON.stringify(combatState[k + 'Vanilla']);
  });
  const el = $('combatModCount');
  if (el) el.textContent = modFiles.length ? modFiles.length + ' file(s) modified' : '';
}

// ── Drop Zone Init ────────────────────────────────────────────────────────
function initDropZone(zoneId, fileInputId, handler) {
  const zone = $(zoneId), input = $(fileInputId);
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('is-over');
    const file = e.dataTransfer.files[0];
    if (file) handler(file, zone);
  });
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) { handler(file, zone); input.value = ''; }
  });
}

function readXmlFile(file, zone, onSuccess) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      onSuccess(e.target.result, file.name);
      zone.classList.add('is-loaded');
      setDropState(zone.id, '✓ Loaded: ' + file.name);
    } catch (err) {
      setDropState(zone.id, '✗ Error: ' + (err.message || 'Parse failed'));
    }
  };
  reader.readAsText(file);
}

// ── Tab Switching ─────────────────────────────────────────────────────────
function initTabs() {
  qsa('.combat-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      combatState.activeTab = tab;
      qsa('.combat-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      const panelId = 'panel' + tab.charAt(0).toUpperCase() + tab.slice(1);
      qsa('.combat-tab-panel').forEach(p => p.classList.toggle('active', p.id === panelId));
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// TAB 1 — PED HEALTH
// ══════════════════════════════════════════════════════════════════════════

function parseHealth(xmlStr) {
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  return qsa('aHealthConfig > Item', doc).map(item => ({
    Name: getText(item, 'Name'),
    DefaultHealth:                  getAttrVal(item, 'DefaultHealth'),
    DefaultArmour:                  getAttrVal(item, 'DefaultArmour'),
    FatiguedHealthThreshold:        getAttrVal(item, 'FatiguedHealthThreshold'),
    InjuredHealthThreshold:         getAttrVal(item, 'InjuredHealthThreshold'),
    DyingHealthThreshold:           getAttrVal(item, 'DyingHealthThreshold'),
    HurtHealthThreshold:            getAttrVal(item, 'HurtHealthThreshold'),
    DogTakedownThreshold:           getAttrVal(item, 'DogTakedownThreshold'),
    WritheFromBulletDamageTheshold: getAttrVal(item, 'WritheFromBulletDamageTheshold'), // preserving original typo
    MeleeCardinalFatalAttackCheck:  getAttrVal(item, 'MeleeCardinalFatalAttackCheck'),
    Invincible:                     getAttrVal(item, 'Invincible'),
  }));
}

function renderHealth() {
  const data = combatState.healthData;
  if (!data) return;
  const el = $('healthEditor');

  const numCols = [
    { key: 'DefaultHealth',                  label: 'Max HP' },
    { key: 'DefaultArmour',                  label: 'Armour' },
    { key: 'FatiguedHealthThreshold',        label: 'Fatigued At' },
    { key: 'InjuredHealthThreshold',         label: 'Injured At' },
    { key: 'DyingHealthThreshold',           label: 'Dying At' },
    { key: 'HurtHealthThreshold',            label: 'Hurt At' },
    { key: 'DogTakedownThreshold',           label: 'Dog TKD' },
    { key: 'WritheFromBulletDamageTheshold', label: 'Writhe' },
  ];
  const boolCols = [
    { key: 'MeleeCardinalFatalAttackCheck', label: 'Fatal Melee' },
    { key: 'Invincible',                    label: 'Invincible' },
  ];

  const rows = data.map((p, ri) => {
    const nums = numCols.map(c => {
      const v = p[c.key];
      return `<td><input class="health-input" type="number" step="any"
        data-row="${ri}" data-key="${c.key}"
        value="${v !== null && v !== undefined ? v : ''}"
        ${v === null || v === undefined ? 'placeholder="—"' : ''}></td>`;
    }).join('');
    const bools = boolCols.map(c => {
      if (p[c.key] === null || p[c.key] === undefined)
        return `<td class="health-bool-cell"><span style="opacity:.3">—</span></td>`;
      return `<td class="health-bool-cell"><input type="checkbox"
        data-row="${ri}" data-key="${c.key}" ${p[c.key] === 'true' ? 'checked' : ''}></td>`;
    }).join('');
    return `<tr><td class="health-name-cell">${escXml(p.Name)}</td>${nums}${bools}</tr>`;
  }).join('');

  el.innerHTML = `
    <div class="health-table-wrap">
      <table class="health-table">
        <thead>
          <tr>
            <th>Profile</th>
            ${numCols.map(c => `<th>${c.label}</th>`).join('')}
            ${boolCols.map(c => `<th>${c.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="small" style="opacity:.5;margin-top:10px">
      Threshold values = HP level at which that state activates. Must be ≤ Max HP.<br>
      Fatal Melee = a single melee hit can instantly kill at any HP.
    </p>`;

  el.querySelectorAll('input[type=number]').forEach(inp => {
    inp.addEventListener('input', () => {
      combatState.healthData[+inp.dataset.row][inp.dataset.key] = inp.value;
      updateModCount();
    });
  });
  el.querySelectorAll('input[type=checkbox]').forEach(inp => {
    inp.addEventListener('change', () => {
      combatState.healthData[+inp.dataset.row][inp.dataset.key] = inp.checked ? 'true' : 'false';
      updateModCount();
    });
  });
}

function exportHealthXml() {
  const data = combatState.healthData;
  if (!data) return null;
  const numFields = [
    'DefaultHealth','DefaultArmour','FatiguedHealthThreshold',
    'InjuredHealthThreshold','DyingHealthThreshold','HurtHealthThreshold',
    'DogTakedownThreshold','WritheFromBulletDamageTheshold'
  ];
  const items = data.map(p => {
    let xml = `    <Item>\n      <Name>${escXml(p.Name)}</Name>\n`;
    numFields.forEach(f => {
      if (p[f] !== null && p[f] !== undefined && p[f] !== '')
        xml += `      <${f} value="${fmtFloat(p[f])}" />\n`;
    });
    if (p.MeleeCardinalFatalAttackCheck !== null && p.MeleeCardinalFatalAttackCheck !== undefined)
      xml += `\t  <MeleeCardinalFatalAttackCheck value="${p.MeleeCardinalFatalAttackCheck}" />\n`;
    if (p.Invincible === 'true')
      xml += `\t  <Invincible value="true" />\n`;
    xml += `    </Item>`;
    return xml;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<CHealthConfigInfoManager>\n  <aHealthConfig>\n${items}\n  </aHealthConfig>\n  <DefaultSet ref="Average" />\n</CHealthConfigInfoManager>`;
}

function exportHealth() {
  const xml = exportHealthXml();
  if (xml) downloadFile(combatState.healthFile || 'pedhealth.meta', xml);
}
function resetHealth() {
  if (!combatState.healthVanilla) return;
  combatState.healthData = JSON.parse(JSON.stringify(combatState.healthVanilla));
  renderHealth(); updateModCount();
}

// ══════════════════════════════════════════════════════════════════════════
// TAB 2 — BRAWLING STYLES
// ══════════════════════════════════════════════════════════════════════════

const BRAWLING_FIELDS = [
  { key: 'TargetRadius',                          type: 'float', label: 'Target Radius',            help: 'Distance considered "in melee range"' },
  { key: 'KeepMovingWhilePathingDistance',         type: 'float', label: 'Keep Moving Distance' },
  { key: 'MaxDistanceMayAdjustPathEndPosition',    type: 'float', label: 'Max Path Adjust Distance' },
  { key: 'SeekModeScanTimeMin',                    type: 'int',   label: null }, // handled as minmax pair
  { key: 'SeekModeScanTimeMax',                    type: 'int',   label: null },
  { key: 'MeleeMovementMBR',                       type: 'float', label: 'Melee Movement MBR' },
  { key: 'AttackFrequencyWorstFighterMinInMs',     type: 'int',   label: null },
  { key: 'AttackFrequencyWorstFighterMaxInMs',     type: 'int',   label: null },
  { key: 'AttackFrequencyBestFighterMinInMs',      type: 'int',   label: null },
  { key: 'AttackFrequencyBestFighterMaxInMs',      type: 'int',   label: null },
  { key: 'AttackRangeMax',                         type: 'float', label: 'Attack Range Max',        help: 'Max distance to attempt a melee attack' },
  { key: 'AttackProbabilityToComboMin',            type: 'float', label: null },
  { key: 'AttackProbabilityToComboMax',            type: 'float', label: null },
  { key: 'ProbabilityToBeDazedMin',                type: 'float', label: null },
  { key: 'ProbabilityToBeDazedMax',                type: 'float', label: null },
  { key: 'BlockProbabilityMin',                    type: 'float', label: null },
  { key: 'BlockProbabilityMax',                    type: 'float', label: null },
  { key: 'CounterProbabilityMin',                  type: 'float', label: null },
  { key: 'CounterProbabilityMax',                  type: 'float', label: null },
  { key: 'TauntFrequencyMinInMs',                  type: 'int',   label: null },
  { key: 'TauntFrequencyMaxInMs',                  type: 'int',   label: null },
  { key: 'TauntProbability',                       type: 'float', label: 'Taunt Probability',       help: '0.0–1.0' },
  { key: 'TauntFrequencyQueuedMinInMs',            type: 'int',   label: null },
  { key: 'TauntFrequencyQueuedMaxInMs',            type: 'int',   label: null },
  { key: 'TauntProbabilityQueued',                 type: 'float', label: 'Queued Taunt Probability', help: '0.0–1.0' },
  { key: 'PlayTauntBeforeAttacking',               type: 'bool',  label: 'Taunt Before Attacking' },
];

function parseBrawling(xmlStr) {
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  return qsa('aBrawlingData > Item', doc).map(item => {
    const obj = { Name: getText(item, 'Name') };
    BRAWLING_FIELDS.forEach(f => {
      obj[f.key] = getAttrVal(item, f.key);
    });
    return obj;
  });
}

function renderBrawling() {
  const data = combatState.brawlingData;
  if (!data) return;
  const el = $('brawlingEditor');
  const idx = combatState.activeBrawlingIdx;

  el.innerHTML = `
    <div class="combat-workspace">
      <div class="combat-sidebar">
        ${data.map((s, i) => `
          <div class="combat-sidebar-item ${i === idx ? 'active' : ''}" data-idx="${i}">${escXml(s.Name)}</div>
        `).join('')}
      </div>
      <div class="combat-editor" id="brawlingEditorPanel"></div>
    </div>`;

  el.querySelectorAll('.combat-sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      combatState.activeBrawlingIdx = +item.dataset.idx;
      renderBrawling();
    });
  });

  renderBrawlingEditor(data[idx]);
}

function renderBrawlingEditor(s) {
  const panel = $('brawlingEditorPanel');
  if (!s) { panel.innerHTML = '<p>Select a style.</p>'; return; }

  const field = (label, key, help = '') => {
    const fd = BRAWLING_FIELDS.find(f => f.key === key);
    const isInt = fd?.type === 'int';
    return `<div class="combat-field">
      <label class="combat-label">${label}</label>
      <input class="combat-input" type="number" step="${isInt ? '1' : 'any'}"
        data-key="${key}" value="${s[key] ?? ''}">
      ${help ? `<div class="combat-help">${help}</div>` : ''}
    </div>`;
  };

  const minmax = (label, minKey, maxKey, help = '') => {
    const fd = BRAWLING_FIELDS.find(f => f.key === minKey);
    const isInt = fd?.type === 'int';
    return `<div class="combat-field">
      <label class="combat-label">${label}</label>
      <div class="combat-minmax">
        <input class="combat-input" type="number" step="${isInt ? '1' : 'any'}"
          data-key="${minKey}" value="${s[minKey] ?? ''}" placeholder="Min">
        <span class="combat-minmax-sep">–</span>
        <input class="combat-input" type="number" step="${isInt ? '1' : 'any'}"
          data-key="${maxKey}" value="${s[maxKey] ?? ''}" placeholder="Max">
      </div>
      ${help ? `<div class="combat-help">${help}</div>` : ''}
    </div>`;
  };

  panel.innerHTML = `
    <h3 style="margin:0 0 16px">${escXml(s.Name)}</h3>

    <div class="combat-section-label">Movement &amp; Range</div>
    ${field('Target Radius', 'TargetRadius', 'Distance considered "in melee range"')}
    ${field('Keep Moving Distance', 'KeepMovingWhilePathingDistance')}
    ${field('Max Path Adjust Dist', 'MaxDistanceMayAdjustPathEndPosition')}
    ${field('Melee Movement MBR', 'MeleeMovementMBR')}
    ${field('Attack Range Max', 'AttackRangeMax', 'Max distance to initiate a melee attack')}

    <div class="combat-section-label">Scan / Seek Timing (ms)</div>
    ${minmax('Seek Scan Time', 'SeekModeScanTimeMin', 'SeekModeScanTimeMax')}

    <div class="combat-section-label">Attack Frequency — Worst Fighter (ms)</div>
    ${minmax('Attack Delay', 'AttackFrequencyWorstFighterMinInMs', 'AttackFrequencyWorstFighterMaxInMs', 'Lower = strikes faster. Worst fighters attack less often than best.')}

    <div class="combat-section-label">Attack Frequency — Best Fighter (ms)</div>
    ${minmax('Attack Delay', 'AttackFrequencyBestFighterMinInMs', 'AttackFrequencyBestFighterMaxInMs', 'Lower = strikes faster. Best fighters attack more often.')}

    <div class="combat-section-label">Combat Skills (0.0 – 1.0)</div>
    ${minmax('Combo Probability', 'AttackProbabilityToComboMin', 'AttackProbabilityToComboMax', 'How often they chain attacks into combos')}
    ${minmax('Dazed Probability', 'ProbabilityToBeDazedMin', 'ProbabilityToBeDazedMax', 'How often they get stunned when hit')}
    ${minmax('Block Probability', 'BlockProbabilityMin', 'BlockProbabilityMax', 'How often they block incoming attacks')}
    ${minmax('Counter Probability', 'CounterProbabilityMin', 'CounterProbabilityMax', 'How often they counter-attack after blocking')}

    <div class="combat-section-label">Taunting</div>
    ${minmax('Taunt Interval (ms)', 'TauntFrequencyMinInMs', 'TauntFrequencyMaxInMs')}
    ${field('Taunt Probability', 'TauntProbability', '0.0–1.0 chance to taunt at all')}
    ${minmax('Queued Taunt Interval (ms)', 'TauntFrequencyQueuedMinInMs', 'TauntFrequencyQueuedMaxInMs')}
    ${field('Queued Taunt Probability', 'TauntProbabilityQueued', '0.0–1.0')}
    <div class="combat-field">
      <label class="combat-label">Taunt Before Attacking</label>
      <select class="combat-select" data-key="PlayTauntBeforeAttacking">
        <option value="true"  ${s.PlayTauntBeforeAttacking === 'true'  ? 'selected' : ''}>true</option>
        <option value="false" ${s.PlayTauntBeforeAttacking !== 'true'  ? 'selected' : ''}>false</option>
      </select>
    </div>`;

  panel.querySelectorAll('[data-key]').forEach(inp => {
    const evt = inp.tagName === 'SELECT' ? 'change' : 'input';
    inp.addEventListener(evt, () => {
      combatState.brawlingData[combatState.activeBrawlingIdx][inp.dataset.key] = inp.value;
      updateModCount();
    });
  });
}

function exportBrawlingXml() {
  const data = combatState.brawlingData;
  if (!data) return null;
  const items = data.map(s => {
    let xml = `    <Item>\n      <Name>${escXml(s.Name)}</Name>\n`;
    BRAWLING_FIELDS.forEach(f => {
      const v = s[f.key];
      if (v === null || v === undefined || v === '') return;
      if (f.type === 'bool') {
        xml += `      <${f.key} value="${v}" />\n`;
      } else if (f.type === 'int') {
        xml += `      <${f.key} value="${fmtInt(v)}" />\n`;
      } else {
        xml += `      <${f.key} value="${fmtFloat(v)}" />\n`;
      }
    });
    xml += `    </Item>`;
    return xml;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<CBrawlingStyleManager>\n  <aBrawlingData>\n${items}\n  </aBrawlingData>\n</CBrawlingStyleManager>`;
}

function exportBrawling() {
  const xml = exportBrawlingXml();
  if (xml) downloadFile(combatState.brawlingFile || 'pedbrawlingstyle.meta', xml);
}
function resetBrawling() {
  if (!combatState.brawlingVanilla) return;
  combatState.brawlingData = JSON.parse(JSON.stringify(combatState.brawlingVanilla));
  renderBrawling(); updateModCount();
}

// ══════════════════════════════════════════════════════════════════════════
// TAB 3 — COMBAT BEHAVIOUR
// ══════════════════════════════════════════════════════════════════════════

const BEHAVIOUR_TEXT_FIELDS = [
  'CombatMovement','BehaviourFlags','CombatAbility','AttackRanges',
  'TargetLossResponse','TargetInjuredReaction','FiringPatternHash'
];
const BEHAVIOUR_NUM_FIELDS = [
  { key: 'BlindFireChance',                          label: 'Blind Fire Chance',           help: '0.0–1.0 probability of firing blind from cover' },
  { key: 'WeaponShootRateModifier',                  label: 'Shoot Rate Modifier',          help: '0.0–1.0 multiplier on weapon fire rate' },
  { key: 'TimeBetweenBurstsInCover',                 label: 'Time Between Bursts In Cover', help: 'Seconds between firing bursts while in cover' },
  { key: 'BurstDurationInCover',                     label: 'Burst Duration In Cover',      help: 'Seconds to fire during each burst' },
  { key: 'TimeBetweenPeeks',                         label: 'Time Between Peeks',           help: 'Seconds between peeking out of cover' },
  { key: 'WeaponAccuracy',                           label: 'Weapon Accuracy',              help: '0.0–1.0 (1.0 = perfect aim)' },
  { key: 'WeaponAccuracyModifierForEvasiveMovement', label: 'Accuracy (Evasive Move)',      help: 'Accuracy multiplier while moving evasively' },
  { key: 'WeaponAccuracyModifierForOffScreen',       label: 'Accuracy (Off Screen)',        help: 'Accuracy multiplier when player is not looking' },
  { key: 'WeaponAccuracyModifierForAimedAt',         label: 'Accuracy (Aimed At)',          help: 'Accuracy multiplier when aiming directly at target' },
  { key: 'FightProficiency',                         label: 'Fight Proficiency',            help: '0.0–1.0 overall combat skill level' },
  { key: 'StrafeWhenMovingChance',                   label: 'Strafe When Moving',           help: '0.0–1.0 chance to strafe while moving' },
  { key: 'WalkWhenStrafingChance',                   label: 'Walk When Strafing',           help: '0.0–1.0 chance to walk (vs run) while strafing' },
  { key: 'AttackWindowDistanceForCover',             label: 'Cover Attack Window Dist',     help: 'Max distance to attack from cover (metres)' },
  { key: 'TimeToInvalidateInjuredTarget',            label: 'Injured Target Timeout',       help: 'Seconds before giving up on injured target' },
];

function parseBehaviour(xmlStr) {
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  return qsa('CombatInfos > Item', doc).map(item => {
    const obj = { Name: getText(item, 'Name') };
    BEHAVIOUR_TEXT_FIELDS.forEach(k => { obj[k] = getText(item, k); });
    BEHAVIOUR_NUM_FIELDS.forEach(f => { obj[f.key] = getAttrVal(item, f.key); });
    return obj;
  });
}

function renderBehaviour() {
  const data = combatState.behaviourData;
  if (!data) return;
  const el = $('behaviourEditor');
  const idx = combatState.activeBehaviourIdx;

  el.innerHTML = `
    <div class="combat-workspace">
      <div class="combat-sidebar">
        ${data.map((p, i) => `
          <div class="combat-sidebar-item ${i === idx ? 'active' : ''}" data-idx="${i}">${escXml(p.Name)}</div>
        `).join('')}
      </div>
      <div class="combat-editor" id="behaviourEditorPanel"></div>
    </div>`;

  el.querySelectorAll('.combat-sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      combatState.activeBehaviourIdx = +item.dataset.idx;
      renderBehaviour();
    });
  });

  renderBehaviourEditor(data[idx]);
}

const COMBAT_MOVEMENT_OPTS = ['CM_WillAdvance','CM_WillRetreat','CM_WillStand','CM_WillFlank'];
const COMBAT_ABILITY_OPTS  = ['CA_Poor','CA_Average','CA_Professional'];
const ATTACK_RANGES_OPTS   = ['CR_Near','CR_Medium','CR_Far','CR_VeryFar'];
const TARGET_LOSS_OPTS     = ['TLR_SearchForTarget','TLR_Flee','TLR_NeverLose','TLR_WaitAndScanForTarget'];
const TARGET_INJ_OPTS      = ['TIR_TreatAsDead','TIR_TreatAsWounded'];
const FIRING_OPTS          = ['FIRING_PATTERN_BURST_FIRE','FIRING_PATTERN_FULL_AUTO','FIRING_PATTERN_SINGLE_SHOT','FIRING_PATTERN_DELAY_FIRE_BY_ONE_SEC'];

function makeSelect(key, value, opts) {
  const hasVal = opts.includes(value);
  const options = opts.map(o => `<option value="${o}"${o === value ? ' selected' : ''}>${o}</option>`).join('');
  const custom = !hasVal && value ? `<option value="${escXml(value)}" selected>${escXml(value)}</option>` : '';
  return `<select class="combat-select" data-key="${key}">${custom}${options}</select>`;
}

function renderBehaviourEditor(p) {
  const panel = $('behaviourEditorPanel');
  if (!p) { panel.innerHTML = '<p>Select a profile.</p>'; return; }

  const flagLines = (p.BehaviourFlags || '').split(' ').filter(Boolean).join('\n');

  panel.innerHTML = `
    <h3 style="margin:0 0 16px">${escXml(p.Name)}</h3>

    <div class="combat-section-label">Combat Profile</div>
    <div class="combat-field">
      <label class="combat-label">Combat Movement</label>
      ${makeSelect('CombatMovement', p.CombatMovement, COMBAT_MOVEMENT_OPTS)}
      <div class="combat-help">How this ped moves when fighting</div>
    </div>
    <div class="combat-field">
      <label class="combat-label">Combat Ability</label>
      ${makeSelect('CombatAbility', p.CombatAbility, COMBAT_ABILITY_OPTS)}
      <div class="combat-help">Overall skill level</div>
    </div>
    <div class="combat-field">
      <label class="combat-label">Attack Ranges</label>
      ${makeSelect('AttackRanges', p.AttackRanges, ATTACK_RANGES_OPTS)}
    </div>
    <div class="combat-field">
      <label class="combat-label">Target Loss Response</label>
      ${makeSelect('TargetLossResponse', p.TargetLossResponse, TARGET_LOSS_OPTS)}
      <div class="combat-help">What happens when they lose sight of the target</div>
    </div>
    <div class="combat-field">
      <label class="combat-label">Target Injured Reaction</label>
      ${makeSelect('TargetInjuredReaction', p.TargetInjuredReaction, TARGET_INJ_OPTS)}
    </div>
    <div class="combat-field">
      <label class="combat-label">Firing Pattern</label>
      ${makeSelect('FiringPatternHash', p.FiringPatternHash, FIRING_OPTS)}
    </div>

    <div class="combat-section-label">Weapon Performance</div>
    ${BEHAVIOUR_NUM_FIELDS.map(f => `
      <div class="combat-field">
        <label class="combat-label">${f.label}</label>
        <input class="combat-input" type="number" step="any"
          data-key="${f.key}" value="${p[f.key] ?? ''}">
        ${f.help ? `<div class="combat-help">${f.help}</div>` : ''}
      </div>`).join('')}

    <div class="combat-section-label">Behaviour Flags</div>
    <div class="combat-field">
      <label class="combat-label">Flags (one per line)</label>
      <textarea class="combat-flags-textarea" data-key="BehaviourFlags"
        rows="8" spellcheck="false">${escXml(flagLines)}</textarea>
      <div class="combat-help">
        Common flags: BF_CanUseCover · BF_CanUseVehicles · BF_CanDoDrivebys · BF_CanLeaveVehicle ·
        BF_UseProximityFiringRate · BF_CanChaseTargetOnFoot · BF_CanUsePeekingVariations ·
        BF_CanCommandeerVehicles · BF_MaintainMinDistanceToTarget · BF_CanUseDynamicStrafeDecisions ·
        BF_DisableSpinOutDuringVehicleChase · BF_CruiseAndBlockInVehicle · BF_DisableAllRandomsFlee
      </div>
    </div>`;

  panel.querySelectorAll('[data-key]').forEach(inp => {
    const evt = (inp.tagName === 'SELECT' || inp.tagName === 'TEXTAREA') ? 'change' : 'input';
    inp.addEventListener(evt, () => {
      let val = inp.value;
      if (inp.dataset.key === 'BehaviourFlags') {
        // textarea: lines → space-separated
        val = val.split('\n').map(s => s.trim()).filter(Boolean).join(' ');
      }
      combatState.behaviourData[combatState.activeBehaviourIdx][inp.dataset.key] = val;
      updateModCount();
    });
    // also wire input event for textarea
    if (inp.tagName === 'TEXTAREA') {
      inp.addEventListener('input', () => {
        const val = inp.value.split('\n').map(s => s.trim()).filter(Boolean).join(' ');
        combatState.behaviourData[combatState.activeBehaviourIdx][inp.dataset.key] = val;
        updateModCount();
      });
    }
  });
}

function exportBehaviourXml() {
  const data = combatState.behaviourData;
  if (!data) return null;
  const items = data.map(p => {
    let xml = `\t\t<Item type="CCombatInfo">\n\t\t\t<Name>${escXml(p.Name)}</Name>\n`;
    // Text fields (except BehaviourFlags and FiringPatternHash — those go in specific spots)
    xml += `\t\t\t<CombatMovement>${escXml(p.CombatMovement || '')}</CombatMovement>\n`;
    xml += `\t\t\t<BehaviourFlags>${escXml(p.BehaviourFlags || '')}</BehaviourFlags>\n`;
    xml += `\t\t\t<CombatAbility>${escXml(p.CombatAbility || '')}</CombatAbility>\n`;
    xml += `\t\t\t<AttackRanges>${escXml(p.AttackRanges || '')}</AttackRanges>\n`;
    xml += `\t\t\t<TargetLossResponse>${escXml(p.TargetLossResponse || '')}</TargetLossResponse>\n`;
    xml += `\t\t\t<TargetInjuredReaction>${escXml(p.TargetInjuredReaction || '')}</TargetInjuredReaction>\n`;
    BEHAVIOUR_NUM_FIELDS.forEach(f => {
      if (p[f.key] !== null && p[f.key] !== undefined && p[f.key] !== '')
        xml += `\t\t\t<${f.key} value="${fmtFloat(p[f.key])}"/>\n`;
    });
    if (p.FiringPatternHash)
      xml += `\t\t\t<FiringPatternHash>${escXml(p.FiringPatternHash)}</FiringPatternHash>\n`;
    xml += `\t\t</Item>`;
    return xml;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<CCombatInfoMgr>\n\t<CombatInfos>\n${items}\n\t</CombatInfos>\n</CCombatInfoMgr>`;
}

function exportBehaviour() {
  const xml = exportBehaviourXml();
  if (xml) downloadFile(combatState.behaviourFile || 'combatbehaviour.meta', xml);
}
function resetBehaviour() {
  if (!combatState.behaviourVanilla) return;
  combatState.behaviourData = JSON.parse(JSON.stringify(combatState.behaviourVanilla));
  renderBehaviour(); updateModCount();
}

// ══════════════════════════════════════════════════════════════════════════
// TAB 4 — AGITATION TRIGGERS
// ══════════════════════════════════════════════════════════════════════════

function parseTriggers(xmlStr) {
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');

  const reactions = qsa('Reactions > Item', doc).map(item => ({
    key: item.getAttribute('key'),
    Type: getText(item, 'Type'),
    TimeBeforeInitialReaction:       getMinMax(item, 'TimeBeforeInitialReaction'),
    TimeAfterLastSuccessfulReaction: getMinMax(item, 'TimeAfterLastSuccessfulReaction'),
    TimeAfterInitialReactionFailure: getMinMax(item, 'TimeAfterInitialReactionFailure'),
    TimeBetweenEscalatingReactions:  getMinMax(item, 'TimeBetweenEscalatingReactions'),
    MaxReactions:    getAttrVal(item, 'MaxReactions'),
    MaxTargetSpeed:  getAttrVal(item, 'MaxTargetSpeed'),
    MinDotToTarget:  getAttrVal(item, 'MinDotToTarget'),
    MaxDotToTarget:  getAttrVal(item, 'MaxDotToTarget'),
    Flags: getText(item, 'Flags'),
  }));

  const sets = qsa('Sets > Item', doc).map(item => ({
    key: item.getAttribute('key'),
    Parent: getText(item, 'Parent') || null,
    Flags: getText(item, 'Flags') || null,
    Triggers: qsa(':scope > Triggers > Item', item).map(trig => ({
      PedTypes: qsa('PedTypes > Item', trig).map(pt => pt.textContent.trim()),
      Chances:  getAttrVal(trig, 'Chances'),
      Distance: getAttrVal(trig, 'Distance'),
      Reaction: getText(trig, 'Reaction'),
    })),
  }));

  return { reactions, sets };
}

function renderTriggers() {
  const data = combatState.triggersData;
  if (!data) return;
  const el = $('triggersEditor');

  const reactionRows = data.reactions.map((r, ri) => {
    const mm = (minmax, ri2, side) => {
      if (!minmax) return '<td>—</td>';
      const key = `tri_r${ri2}_${side}`;
      return `<td><input class="health-input" type="number" step="any"
        style="width:60px" data-reaction="${ri2}" data-timingkey="${side === 'min' ? 'min' : 'max'}"
        value="${minmax[side] ?? ''}" placeholder="—"></td>`;
    };
    return `<tr>
      <td class="health-name-cell">${escXml(r.key)}</td>
      ${mm(r.TimeBeforeInitialReaction, ri, 'min')}
      ${mm(r.TimeBeforeInitialReaction, ri, 'max')}
      <td><input class="health-input" type="number" step="1" style="width:50px"
        data-reaction="${ri}" data-maxreactions="true"
        value="${r.MaxReactions ?? ''}"></td>
      <td class="small" style="opacity:.5;font-size:.75rem;max-width:180px;word-break:break-word">${escXml((r.Flags || '').replace(/ /g, ' · '))}</td>
    </tr>`;
  }).join('');

  const setCards = data.sets.map((set, si) => {
    const trigRows = set.Triggers.map((t, ti) => `
      <tr>
        <td style="font-size:.8rem">${escXml(t.Reaction)}</td>
        <td><input class="health-input" type="number" step="any" style="width:65px"
          data-set="${si}" data-trig="${ti}" data-trigkey="Distance"
          value="${t.Distance ?? ''}"></td>
        <td><input class="health-input" type="number" step="any" style="width:55px"
          data-set="${si}" data-trig="${ti}" data-trigkey="Chances"
          value="${t.Chances ?? ''}" placeholder="—"></td>
        <td style="font-size:.75rem;opacity:.6">${(t.PedTypes || []).join(', ')}</td>
      </tr>`).join('');

    const inherit = set.Parent
      ? `<span style="font-size:.78rem;opacity:.6;margin-left:8px">inherits from ${escXml(set.Parent)}</span>`
      : '';

    return `<div class="combat-triggers-card">
      <div class="combat-triggers-card-head">
        <strong>${escXml(set.key)}</strong>${inherit}
        ${set.Flags ? `<span class="combat-triggers-badge">${escXml(set.Flags)}</span>` : ''}
      </div>
      ${set.Triggers.length ? `
        <table class="health-table" style="margin-top:8px">
          <thead><tr>
            <th>Reaction</th><th>Distance (m)</th><th>Chance</th><th>Ped Types</th>
          </tr></thead>
          <tbody>${trigRows}</tbody>
        </table>` : '<p class="small" style="opacity:.5;margin:6px 0 0">No triggers defined (inherits from parent).</p>'}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="combat-section-label" style="margin-bottom:10px">Reaction Timing</div>
    <p class="small" style="opacity:.5;margin:0 0 12px">
      "Before Initial" = how long (seconds) the trigger condition must persist before the ped reacts.
    </p>
    <div class="health-table-wrap" style="margin-bottom:28px">
      <table class="health-table">
        <thead>
          <tr>
            <th>Reaction</th>
            <th>Before Initial Min</th>
            <th>Before Initial Max</th>
            <th>Max Reactions</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>${reactionRows}</tbody>
      </table>
    </div>
    <div class="combat-section-label" style="margin-bottom:10px">Trigger Sets</div>
    <p class="small" style="opacity:.5;margin:0 0 12px">
      Distance = how close the player must be to trigger the reaction.
      Chance = probability (0–1) of triggering (blank = always).
    </p>
    <div class="combat-triggers-sets">${setCards}</div>`;

  // Wire reaction timing inputs
  el.querySelectorAll('[data-reaction]').forEach(inp => {
    inp.addEventListener('input', () => {
      const ri = +inp.dataset.reaction;
      const r = combatState.triggersData.reactions[ri];
      if (inp.dataset.maxreactions) {
        r.MaxReactions = inp.value;
      } else {
        const side = inp.dataset.timingkey;
        if (!r.TimeBeforeInitialReaction) r.TimeBeforeInitialReaction = { min: null, max: null };
        r.TimeBeforeInitialReaction[side] = inp.value;
      }
      updateModCount();
    });
  });

  // Wire set trigger inputs
  el.querySelectorAll('[data-set][data-trig]').forEach(inp => {
    inp.addEventListener('input', () => {
      const si = +inp.dataset.set, ti = +inp.dataset.trig, k = inp.dataset.trigkey;
      combatState.triggersData.sets[si].Triggers[ti][k] = inp.value;
      updateModCount();
    });
  });
}

function buildMinMaxXml(indent, tag, mm) {
  if (!mm || (mm.min === null && mm.max === null)) return '';
  return `${indent}<${tag}>\n${indent}\t<Min value="${fmtFloat(mm.min, 1)}" />\n${indent}\t<Max value="${fmtFloat(mm.max, 1)}" />\n${indent}</${tag}>\n`;
}

function exportTriggersXml() {
  const data = combatState.triggersData;
  if (!data) return null;

  const reactionXml = data.reactions.map(r => {
    let xml = `\t\t<Item key="${escXml(r.key)}">\n`;
    xml += `\t\t\t<Type>${escXml(r.Type || '')}</Type>\n`;
    xml += buildMinMaxXml('\t\t\t', 'TimeBeforeInitialReaction', r.TimeBeforeInitialReaction);
    xml += buildMinMaxXml('\t\t\t', 'TimeAfterLastSuccessfulReaction', r.TimeAfterLastSuccessfulReaction);
    xml += buildMinMaxXml('\t\t\t', 'TimeAfterInitialReactionFailure', r.TimeAfterInitialReactionFailure);
    xml += buildMinMaxXml('\t\t\t', 'TimeBetweenEscalatingReactions', r.TimeBetweenEscalatingReactions);
    if (r.MaxReactions !== null && r.MaxReactions !== undefined)
      xml += `\t\t\t<MaxReactions value="${fmtInt(r.MaxReactions)}" />\n`;
    if (r.MaxTargetSpeed !== null && r.MaxTargetSpeed !== undefined)
      xml += `\t\t\t<MaxTargetSpeed value="${fmtFloat(r.MaxTargetSpeed, 3)}" />\n`;
    if (r.MinDotToTarget !== null && r.MinDotToTarget !== undefined)
      xml += `\t\t\t<MinDotToTarget value="${fmtFloat(r.MinDotToTarget, 3)}" />\n`;
    if (r.MaxDotToTarget !== null && r.MaxDotToTarget !== undefined)
      xml += `\t\t\t<MaxDotToTarget value="${fmtFloat(r.MaxDotToTarget, 3)}" />\n`;
    if (r.Flags) xml += `\t\t\t<Flags>${escXml(r.Flags)}</Flags>\n`;
    xml += `\t\t</Item>`;
    return xml;
  }).join('\n');

  const setXml = data.sets.map(set => {
    let xml = `\t\t<Item key="${escXml(set.key)}">\n`;
    if (set.Parent) xml += `\t\t\t<Parent>${escXml(set.Parent)}</Parent>\n`;
    if (set.Flags)  xml += `\t\t\t<Flags>${escXml(set.Flags)}</Flags>\n`;
    if (set.Triggers.length) {
      xml += `\t\t\t<Triggers>\n`;
      set.Triggers.forEach(t => {
        xml += `\t\t\t\t<Item>\n`;
        xml += `\t\t\t\t\t<PedTypes>\n`;
        (t.PedTypes || []).forEach(pt => { xml += `\t\t\t\t\t\t<Item>${escXml(pt)}</Item>\n`; });
        xml += `\t\t\t\t\t</PedTypes>\n`;
        if (t.Chances !== null && t.Chances !== undefined && t.Chances !== '')
          xml += `\t\t\t\t\t<Chances value="${fmtFloat(t.Chances, 2)}" />\n`;
        xml += `\t\t\t\t\t<Distance value="${fmtFloat(t.Distance)}" />\n`;
        xml += `\t\t\t\t\t<Reaction>${escXml(t.Reaction)}</Reaction>\n`;
        xml += `\t\t\t\t</Item>\n`;
      });
      xml += `\t\t\t</Triggers>\n`;
    } else {
      xml += `\t\t\t<Triggers />\n`;
    }
    xml += `\t\t</Item>`;
    return xml;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<CAgitatedTriggers>\n\t<Reactions>\n${reactionXml}\n\t</Reactions>\n\t<Sets>\n${setXml}\n\t</Sets>\n</CAgitatedTriggers>`;
}

function exportTriggers() {
  const xml = exportTriggersXml();
  if (xml) downloadFile(combatState.triggersFile || 'agitatedtriggers.meta', xml);
}
function resetTriggers() {
  if (!combatState.triggersVanilla) return;
  combatState.triggersData = JSON.parse(JSON.stringify(combatState.triggersVanilla));
  renderTriggers(); updateModCount();
}

// ══════════════════════════════════════════════════════════════════════════
// GLOBAL ACTIONS
// ══════════════════════════════════════════════════════════════════════════

function exportAll() {
  let exported = 0;
  if (combatState.healthData)    { exportHealth();    exported++; }
  if (combatState.brawlingData)  { exportBrawling();  exported++; }
  if (combatState.behaviourData) { exportBehaviour(); exported++; }
  if (combatState.triggersData)  { exportTriggers();  exported++; }
  if (!exported) alert('No files loaded yet. Load at least one file from the tabs below.');
}

function resetAll() {
  if (combatState.healthVanilla)    resetHealth();
  if (combatState.brawlingVanilla)  resetBrawling();
  if (combatState.behaviourVanilla) resetBehaviour();
  if (combatState.triggersVanilla)  resetTriggers();
}

// ══════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initTabs();

  // ── Health drop zone ──
  initDropZone('healthDropZone', 'healthFileInput', (file, zone) => {
    readXmlFile(file, zone, (xmlStr, name) => {
      const data = parseHealth(xmlStr);
      combatState.healthData    = data;
      combatState.healthVanilla = JSON.parse(JSON.stringify(data));
      combatState.healthFile    = name;
      enableTabButtons('health');
      renderHealth();
      updateModCount();
    });
  });

  // ── Brawling drop zone ──
  initDropZone('brawlingDropZone', 'brawlingFileInput', (file, zone) => {
    readXmlFile(file, zone, (xmlStr, name) => {
      const data = parseBrawling(xmlStr);
      combatState.brawlingData    = data;
      combatState.brawlingVanilla = JSON.parse(JSON.stringify(data));
      combatState.brawlingFile    = name;
      combatState.activeBrawlingIdx = 0;
      enableTabButtons('brawling');
      renderBrawling();
      updateModCount();
    });
  });

  // ── Behaviour drop zone ──
  initDropZone('behaviourDropZone', 'behaviourFileInput', (file, zone) => {
    readXmlFile(file, zone, (xmlStr, name) => {
      const data = parseBehaviour(xmlStr);
      combatState.behaviourData    = data;
      combatState.behaviourVanilla = JSON.parse(JSON.stringify(data));
      combatState.behaviourFile    = name;
      combatState.activeBehaviourIdx = 0;
      enableTabButtons('behaviour');
      renderBehaviour();
      updateModCount();
    });
  });

  // ── Triggers drop zone ──
  initDropZone('triggersDropZone', 'triggersFileInput', (file, zone) => {
    readXmlFile(file, zone, (xmlStr, name) => {
      const data = parseTriggers(xmlStr);
      combatState.triggersData    = data;
      combatState.triggersVanilla = JSON.parse(JSON.stringify(data));
      combatState.triggersFile    = name;
      enableTabButtons('triggers');
      renderTriggers();
      updateModCount();
    });
  });
});
