// =====================================================
// combattasksapp.js
// Editor for combattasks.ymt / combattasks.ymt.xml
// Controls global cop / ped AI combat aggressiveness.
// =====================================================

'use strict';

let tasksState = {
  data:    null,
  vanilla: null,
  file:    null,
  rawXml:  null,
};
window.tasksState = tasksState;

// ─── Field definitions ────────────────────────────────────────────────────────

const MANAGER_FIELDS = [
  { key: 'fTimeBetweenUpdates',   label: 'Update Interval (s)',    type: 'float', help: 'How often the combat task manager updates. Lower = cops react faster. Vanilla: 1.12 | RDE: 0.50' },
  { key: 'iMaxPedsInCombatTask',  label: 'Max Peds in Combat',     type: 'int',   help: 'Maximum peds that can be in a combat task at once. Vanilla: 12 | RDE: 50' },
];

const ADDITIONAL_FIELDS = [
  { key: 'fChanceOfDynamicRun',                label: 'Dynamic Run Chance (0–1)',        type: 'float', help: 'Probability a cop does a flanking/dynamic run. 1.0 = always. Vanilla: 0.70 | RDE: 1.00' },
  { key: 'fBlockedLosAimTime',                 label: 'Blocked LOS Aim Time (s)',        type: 'float', help: 'How long cops hold aim when their line of sight is blocked. Vanilla: 3.50 | RDE: 30.00' },
  { key: 'fStartAimingDistance',               label: 'Start Aiming Distance (m)',        type: 'float', help: 'Distance at which cops begin aiming. Vanilla: 17.50 | RDE: 50.00' },
  { key: 'fStopAimingDistance',                label: 'Stop Aiming Distance (m)',         type: 'float', help: 'Distance beyond which cops stop aiming. Vanilla: 22.50 | RDE: 100.00' },
  { key: 'fMaxTimeStrafing',                   label: 'Max Strafe Time (s)',              type: 'float', help: 'Max time a cop strafes sideways in combat. Vanilla: 4.75 | RDE: 3.00' },
  { key: 'fMinTimeRunning',                    label: 'Min Run Time (s)',                 type: 'float', help: 'Minimum time a cop runs before stopping. Vanilla: 3.50 | RDE: 1.00' },
  { key: 'fForceStrafeDistance',               label: 'Force Strafe Distance (m)',        type: 'float', help: 'Within this distance cops are forced to strafe. Vanilla: 17.50 | RDE: 25.00' },
  { key: 'fMaxLosBlockedTimeToForceClearLos',  label: 'Force Clear LOS After (s)',        type: 'float', help: 'Max blocked-LOS time before cop moves to clear it. Vanilla: 5.00 | RDE: 30.00' },
];

const FLANK_FIELDS = [
  { key: 'fInfluenceSphereRequestRadius',    label: 'Flank Request Radius (m)',        type: 'float', help: 'How far away cops request flanking positions. Vanilla: 20 | RDE: 60' },
  { key: 'fInfluenceSphereCheckRouteRadius', label: 'Route Check Radius (m)',           type: 'float', help: 'Radius for checking if a route intersects the influence sphere. Vanilla: 15 | RDE: 30' },
  { key: 'fAbsoluteMinDistanceToTarget',     label: 'Min Flank Distance to Target (m)', type: 'float', help: 'Minimum distance a flanking cop must keep from the target. Vanilla: 7 | RDE: 5' },
  { key: 'fCoverPointScoreMultiplier',       label: 'Cover Point Score Multiplier',     type: 'float', help: 'Weight of cover quality when choosing flanking positions. Vanilla: 1.35 | RDE: 1.50' },
];

const HELI_FIELDS = [
  { key: 'FlightHeightAboveTarget',               label: 'Flight Height Above Target (m)',     type: 'int',   help: 'How high the helicopter flies above the target. Vanilla: 20 | RDE: 30' },
  { key: 'MinHeightAboveTerrain',                 label: 'Min Height Above Terrain (m)',       type: 'int',   help: 'Minimum altitude above terrain during strafe. Vanilla: 20 | RDE: 50' },
  { key: 'TargetMinSpeedToIgnore',                label: 'Min Target Speed to Ignore (m/s)',   type: 'float', help: 'Helicopter tracks targets slower than this. Vanilla: 5.0 | RDE: 5.56' },
  { key: 'TargetMaxSpeedToStrafe',                label: 'Max Target Speed to Strafe (m/s)',   type: 'float', help: 'Helicopter won\'t strafe targets faster than this. Vanilla: 10.0 | RDE: 11.11' },
  { key: 'MinTimeBetweenStrafeDirectionChanges',  label: 'Min Time Between Strafe Passes (s)', type: 'float', help: 'Minimum time between strafe direction changes. Vanilla: 5 | RDE: 30' },
];

const BUDDY_SHOT_FIELDS = [
  { key: 'Enabled',             label: 'Enabled',               type: 'bool',  help: 'Whether cops react when a nearby ally is shot.' },
  { key: 'MinTimeBeforeReact',  label: 'Min React Delay (s)',    type: 'float', help: 'Minimum delay before reacting to ally being shot.' },
  { key: 'MaxTimeBeforeReact',  label: 'Max React Delay (s)',    type: 'float', help: 'Maximum delay before reacting to ally being shot.' },
  { key: 'MaxTimeSinceShot',    label: 'Max Time Since Shot (s)',type: 'float', help: 'Only react if the ally was shot within this window.' },
  { key: 'MaxDistance',         label: 'Max React Distance (m)', type: 'float', help: 'Only react if the shot ally is within this distance.' },
];

const ACCURACY_FIELDS = [
  { key: 'iMinNumEnemiesForScaling',    label: 'Min Enemies for Scaling',        type: 'int',   help: 'Minimum enemy count before accuracy reduction kicks in.' },
  { key: 'fAccuracyReductionPerEnemy',  label: 'Accuracy Reduction Per Enemy',   type: 'float', help: 'Accuracy reduced by this amount per additional enemy.' },
  { key: 'fAccuracyReductionFloor',     label: 'Accuracy Reduction Floor',       type: 'float', help: 'Minimum total accuracy reduction (floor value).' },
];

const CHARGE_FIELDS = [
  { key: 'bChargeTargetEnabled',                   label: 'Charging Enabled',                  type: 'bool',  help: 'Whether cops can charge directly at the player.' },
  { key: 'uMaxNumActiveChargers',                  label: 'Max Active Chargers',               type: 'int',   help: 'Max cops charging at once. 255 = unlimited. Vanilla: 1 | RDE: 255' },
  { key: 'uMinTimeBetweenChargesAtSameTargetMS',   label: 'Cooldown Per Target (ms)',           type: 'int',   help: 'Min time before the same target can be charged again. Vanilla: 4000 | RDE: 0' },
  { key: 'uMinTimeForSamePedToChargeAgainMS',      label: 'Same Cop Recharge Time (ms)',        type: 'int',   help: 'Min time before the same cop can charge again. Vanilla: 30000 | RDE: 0' },
  { key: 'fMinTimeInCombatSeconds',                label: 'Min Combat Time Before Charge (s)',  type: 'float', help: 'Cop must be in combat this long before they can charge. Vanilla: 5 | RDE: 0' },
  { key: 'fMaxDistanceToTarget',                   label: 'Max Charge Distance (m)',            type: 'float', help: 'Maximum distance from which cops will charge. Vanilla: 30 | RDE: 50' },
];

const SMOKE_FIELDS = [
  { key: 'bThrowSmokeGrenadeEnabled',  label: 'Smoke Grenades Enabled', type: 'bool',  help: 'Whether cops can throw smoke grenades.' },
  { key: 'uMaxNumActiveThrowers',      label: 'Max Active Throwers',    type: 'int',   help: 'Max cops throwing smoke at once. 255 = unlimited. Vanilla: 1 | RDE: 255' },
  { key: 'fMaxDistanceToTarget',       label: 'Max Throw Distance (m)', type: 'float', help: 'Max distance from which cops throw smoke. Vanilla: 40 | RDE: 100' },
];

const COMBAT_MAIN_FIELDS = [
  { key: 'fFireContinuouslyDistMin',                label: 'Continuous Fire Min Distance (m)',       type: 'float', help: 'Minimum range for suppression fire. Vanilla: 6 | RDE: 15' },
  { key: 'fFireContinuouslyDistMax',                label: 'Continuous Fire Max Distance (m)',       type: 'float', help: 'Maximum range for suppression fire. Vanilla: 12 | RDE: 30' },
  { key: 'fLostTargetTime',                         label: 'Lost Target Search Time (s)',            type: 'float', help: 'How long cops search after losing the player. Vanilla: 30 | RDE: 60' },
  { key: 'fRetreatTime',                            label: 'Retreat Time (s)',                       type: 'float', help: 'How long cops retreat under heavy fire. 0 = never retreat. Vanilla: 5 | RDE: 0' },
  { key: 'MaxNumPedsChasingOnFoot',                 label: 'Max Foot Chasers',                       type: 'int',   help: 'Max cops chasing on foot. 255 = unlimited. Vanilla: 3 | RDE: 255' },
  { key: 'MaxDistanceToHoldFireForArrest',          label: 'Hold Fire for Arrest Distance (m)',      type: 'float', help: 'Within this range cops may try to arrest instead of shoot. Vanilla: 7.5 | RDE: 8000' },
  { key: 'MinDistanceForLawToFleeFromCombat',       label: 'Law Flee Combat Threshold (m)',          type: 'float', help: 'Player must be this far for law to flee combat. Vanilla: 80 | RDE: 1000' },
  { key: 'MaxDistanceForLawToReturnToCombatFromFlee', label: 'Law Return to Combat Range (m)',       type: 'float', help: 'Fleeing cops resume chase when player is within this range. Vanilla: 35 | RDE: 900' },
  { key: 'fMaxAttemptMoveToCoverDelay',             label: 'Max Cover-Move Delay (s)',               type: 'float', help: 'Max delay before cops attempt to move to cover. 0 = instant. Vanilla: 18.5 | RDE: 0' },
  { key: 'fMinAttemptMoveToCoverDelay',             label: 'Min Cover-Move Delay (s)',               type: 'float', help: 'Min delay before cops attempt to move to cover. Vanilla: 16.5 | RDE: 0' },
  { key: 'fMinTimeStandingAtCover',                 label: 'Min Time at Cover (s)',                  type: 'float', help: 'Minimum time a cop stays at cover before repositioning. 0 = move immediately. Vanilla: 8 | RDE: 0' },
  { key: 'SafeTimeBeforeLeavingCover',              label: 'Safe Time Before Leaving Cover (ms)',    type: 'int',   help: 'Time cops wait before leaving cover (ms). Vanilla: 2000 | RDE: 1000' },
  { key: 'fTimeBetweenCombatDirectorUpdates',       label: 'Combat Director Update Interval (s)',    type: 'float', help: 'How often the combat director coordinates cop tactics. Vanilla: 2 | RDE: 1' },
];

const REACT_AIM_FIELDS = [
  { key: 'Rate',                  label: 'Global Reaction Rate',         type: 'float', help: 'Overall reaction animation speed multiplier. Vanilla: 1.30 | RDE: 1.00' },
  { key: 'MaxRateVariance',       label: 'Max Rate Variance',            type: 'float', help: 'Random variance added to the global rate.' },
  { key: 'professionalFlinchRate',   label: 'Professional Flinch Rate',  type: 'float', help: 'How fast trained peds flinch when shot near. 999 = near-instant. Vanilla: 1.0 | RDE: 999' },
  { key: 'professionalSurprisedRate',label: 'Professional Surprised Rate',type: 'float', help: 'How fast trained peds react when surprised. Vanilla: 1.0 | RDE: 999' },
  { key: 'professionalNoneRate',     label: 'Professional Turn Rate',    type: 'float', help: 'How fast trained peds turn to face a threat. Vanilla: 1.0 | RDE: 999' },
  { key: 'notProfFlinchRate',        label: 'Civilian Flinch Rate',      type: 'float', help: 'How fast civilians/untrained peds flinch. Vanilla: 1.0 | RDE: 1.25' },
  { key: 'notProfSurprisedRate',     label: 'Civilian Surprised Rate',   type: 'float', help: 'How fast civilians react when surprised. Vanilla: 1.0 | RDE: 1.25' },
];

// ─── XML Parsing ─────────────────────────────────────────────────────────────

function parseCombatTasks(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('XML parse error: ' + err.textContent.slice(0, 120));

  function getItem(type) {
    return doc.querySelector(`Item[type="${type}"]`);
  }
  function q(parent, sel) {
    return parent ? parent.querySelector(sel) : null;
  }
  function fv(el) {
    if (!el) return null;
    const v = el.getAttribute('value');
    return v !== null ? parseFloat(v) : null;
  }
  function iv(el) {
    if (!el) return null;
    const v = el.getAttribute('value');
    return v !== null ? parseInt(v, 10) : null;
  }
  function bv(el) {
    if (!el) return null;
    return el.getAttribute('value') === 'true';
  }
  function directChild(parent, tag) {
    if (!parent) return null;
    for (const c of parent.children) {
      if (c.tagName === tag) return c;
    }
    return null;
  }

  // CCombatTaskManager
  const mgrItem = getItem('CCombatTaskManager__Tunables');
  const manager = {
    fTimeBetweenUpdates:  fv(q(mgrItem, 'fTimeBetweenUpdates')),
    iMaxPedsInCombatTask: iv(q(mgrItem, 'iMaxPedsInCombatTask')),
  };

  // CTaskCombatAdditionalTask
  const addItem = getItem('CTaskCombatAdditionalTask__Tunables');
  const additional = {};
  ADDITIONAL_FIELDS.forEach(f => {
    const el = q(addItem, f.key);
    additional[f.key] = f.type === 'float' ? fv(el) : iv(el);
  });

  // CTaskCombatFlank
  const flankItem = getItem('CTaskCombatFlank__Tunables');
  const flank = {};
  FLANK_FIELDS.forEach(f => {
    flank[f.key] = fv(q(flankItem, f.key));
  });

  // CTaskHelicopterStrafe
  const heliItem = getItem('CTaskHelicopterStrafe__Tunables');
  const heliStrafe = {};
  HELI_FIELDS.forEach(f => {
    const el = q(heliItem, f.key);
    heliStrafe[f.key] = f.type === 'int' ? iv(el) : fv(el);
  });

  // CTaskCombat (big nested section)
  const combatItem = getItem('CTaskCombat__Tunables');

  // BuddyShot
  const bsEl = q(combatItem, 'BuddyShot');
  const buddyShot = {
    Enabled:            bv(q(bsEl, 'Enabled')),
    MinTimeBeforeReact: fv(q(bsEl, 'MinTimeBeforeReact')),
    MaxTimeBeforeReact: fv(q(bsEl, 'MaxTimeBeforeReact')),
    MaxTimeSinceShot:   fv(q(bsEl, 'MaxTimeSinceShot')),
    MaxDistance:        fv(q(bsEl, 'MaxDistance')),
  };

  // LackOfHostility
  const lohEl = q(combatItem, 'LackOfHostility');
  const lackOfHostility = {
    MaxSpeedForVehicle: fv(q(lohEl, 'MaxSpeedForVehicle')),
  };
  [1, 2, 3, 4, 5].forEach(n => {
    const wl = q(lohEl, `WantedLevel${n}`);
    lackOfHostility[`wl${n}`] = {
      Enabled: bv(q(wl, 'Enabled')),
      MinTimeSinceLastHostileAction: fv(q(wl, 'MinTimeSinceLastHostileAction')),
    };
  });

  // EnemyAccuracyScaling
  const easEl = q(combatItem, 'EnemyAccuracyScaling');
  const accuracy = {};
  ACCURACY_FIELDS.forEach(f => {
    const el = q(easEl, f.key);
    accuracy[f.key] = f.type === 'int' ? iv(el) : fv(el);
  });

  // ChargeTuning
  const chargeEl = q(combatItem, 'ChargeTuning');
  const charge = {};
  CHARGE_FIELDS.forEach(f => {
    const el = q(chargeEl, f.key);
    if (f.type === 'bool') charge[f.key] = bv(el);
    else if (f.type === 'int') charge[f.key] = iv(el);
    else charge[f.key] = fv(el);
  });

  // ThrowSmokeGrenadeTuning
  const smokeEl = q(combatItem, 'ThrowSmokeGrenadeTuning');
  const smoke = {};
  SMOKE_FIELDS.forEach(f => {
    const el = q(smokeEl, f.key);
    if (f.type === 'bool') smoke[f.key] = bv(el);
    else if (f.type === 'int') smoke[f.key] = iv(el);
    else smoke[f.key] = fv(el);
  });

  // Main CTaskCombat standalone fields
  const combatMain = {};
  COMBAT_MAIN_FIELDS.forEach(f => {
    const el = q(combatItem, f.key);
    if (f.type === 'float') combatMain[f.key] = fv(el);
    else combatMain[f.key] = iv(el);
  });

  // CTaskReactAimWeapon
  const reactItem = getItem('CTaskReactAimWeapon__Tunables');
  const professional = q(reactItem, 'Professional');
  const notProf = q(reactItem, 'NotProfessional');

  function getRateForReaction(section, reactionTag) {
    const rEl = q(q(section, reactionTag), 'Pistol');
    return fv(directChild(rEl, 'Rate'));
  }

  const reactAim = {
    Rate:                   fv(directChild(reactItem, 'Rate')),
    MaxRateVariance:        fv(directChild(reactItem, 'MaxRateVariance')),
    professionalFlinchRate:    getRateForReaction(professional, 'Flinch'),
    professionalSurprisedRate: getRateForReaction(professional, 'Surprised'),
    professionalNoneRate:      getRateForReaction(professional, 'None'),
    notProfFlinchRate:         getRateForReaction(notProf, 'Flinch'),
    notProfSurprisedRate:      getRateForReaction(notProf, 'Surprised'),
  };

  return { manager, additional, flank, heliStrafe, buddyShot, lackOfHostility, accuracy, charge, smoke, combatMain, reactAim };
}

// ─── Mod count ────────────────────────────────────────────────────────────────

function updateModCount() {
  const el = document.getElementById('tasksModCount');
  if (!el) return;
  if (!tasksState.data || !tasksState.vanilla) { el.textContent = ''; return; }
  const a = JSON.stringify(tasksState.data);
  const b = JSON.stringify(tasksState.vanilla);
  const count = (a === b) ? 0 : [...a].filter((c, i) => c !== b[i]).length;
  // rough diff: count sections that differ
  let changed = 0;
  const keys = Object.keys(tasksState.data);
  keys.forEach(k => {
    if (JSON.stringify(tasksState.data[k]) !== JSON.stringify(tasksState.vanilla[k])) changed++;
  });
  if (changed === 0) {
    el.textContent = 'No modifications';
    el.className = 'ct-mod-count';
  } else {
    el.textContent = `${changed} section${changed !== 1 ? 's' : ''} modified`;
    el.className = 'ct-mod-count is-modified';
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function fmt(val, type) {
  if (val === null || val === undefined) return '';
  if (type === 'bool') return '';
  if (type === 'int') return String(val);
  return parseFloat(val).toFixed(8);
}

function renderFieldRow(field, value, path, sectionKey) {
  if (field.type === 'bool') {
    return `
      <tr>
        <td class="ct-field-label"><span class="ct-field-name">${field.label}</span><span class="ct-field-help">${field.help}</span></td>
        <td class="ct-field-input">
          <label class="ct-toggle">
            <input type="checkbox" data-section="${sectionKey}" data-key="${field.key}" ${value ? 'checked' : ''}>
            <span class="ct-toggle-track"></span>
          </label>
        </td>
      </tr>`;
  }
  const step = field.type === 'int' ? '1' : '0.00000001';
  return `
    <tr>
      <td class="ct-field-label"><span class="ct-field-name">${field.label}</span><span class="ct-field-help">${field.help}</span></td>
      <td class="ct-field-input">
        <input type="number" class="ct-input" step="${step}"
          data-section="${sectionKey}" data-key="${field.key}"
          value="${fmt(value, field.type)}">
      </td>
    </tr>`;
}

function renderSection(id, title, description, fieldDefs, sectionKey, dataObj) {
  const rows = fieldDefs.map(f => renderFieldRow(f, dataObj[f.key], f.key, sectionKey)).join('');
  return `
    <div class="ct-section" id="${id}">
      <div class="ct-section-head">
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
      <table class="ct-table">
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderLackOfHostility(loh) {
  const stars = ['★', '★★', '★★★', '★★★★', '★★★★★'];
  const wlRows = [1,2,3,4,5].map((n, i) => {
    const wl = loh[`wl${n}`] || {};
    return `
      <tr>
        <td class="ct-wl-stars">${stars[i]}</td>
        <td class="ct-wl-check">
          <label class="ct-toggle">
            <input type="checkbox" data-section="lackOfHostility" data-key="wl${n}.Enabled" ${wl.Enabled ? 'checked' : ''}>
            <span class="ct-toggle-track"></span>
          </label>
        </td>
        <td class="ct-wl-time">
          <input type="number" class="ct-input" step="0.00000001"
            data-section="lackOfHostility" data-key="wl${n}.MinTimeSinceLastHostileAction"
            value="${(wl.MinTimeSinceLastHostileAction ?? 0).toFixed(8)}">
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="ct-section" id="sectionLackOfHostility">
      <div class="ct-section-head">
        <h3>Lack of Hostility (per Wanted Level)</h3>
        <p>Controls when cops stop pursuing the player after hostility ends. Enable = cops will stand down at that wanted level. Min Time = how long since the last hostile action before they stand down.</p>
      </div>
      <table class="ct-table ct-wl-table">
        <thead>
          <tr>
            <th>Wanted Level</th>
            <th>Enabled</th>
            <th>Min Time Since Hostile Act (s)</th>
          </tr>
        </thead>
        <tbody>${wlRows}</tbody>
      </table>
      <div class="ct-sub-row">
        <label class="ct-field-name">Max Vehicle Speed for Stand-down (m/s)</label>
        <span class="ct-field-help">Vehicle must be slower than this for cops to consider standing down. Vanilla: 3.0 | RDE: 27.78</span>
        <input type="number" class="ct-input" step="0.00000001"
          data-section="lackOfHostility" data-key="MaxSpeedForVehicle"
          value="${(loh.MaxSpeedForVehicle ?? 3).toFixed(8)}">
      </div>
    </div>`;
}

function renderEditor() {
  const d = tasksState.data;
  if (!d) return;
  const container = document.getElementById('tasksContent');
  if (!container) return;

  container.innerHTML = [
    renderSection('sectionManager',  'Combat Task Manager',
      'Global limits on how many peds can simultaneously engage in combat and how often the combat system updates.',
      MANAGER_FIELDS, 'manager', d.manager),

    renderSection('sectionAdditional', 'Combat Movement & Aiming',
      'Controls how cops move, strafe, and aim during combat. Major factor in cop aggressiveness and flanking behaviour.',
      ADDITIONAL_FIELDS, 'additional', d.additional),

    renderSection('sectionFlank', 'Flanking Behaviour',
      'Controls how cops flank around the player to gain positional advantage.',
      FLANK_FIELDS, 'flank', d.flank),

    renderSection('sectionHeli', 'Helicopter Strafe',
      'Tuning for police helicopter strafing runs — altitude, target speed thresholds, and strafe timing.',
      HELI_FIELDS, 'heliStrafe', d.heliStrafe),

    renderSection('sectionBuddyShot', 'Buddy Shot Reaction',
      'Controls whether and how fast cops react when a nearby ally is shot.',
      BUDDY_SHOT_FIELDS, 'buddyShot', d.buddyShot),

    renderLackOfHostility(d.lackOfHostility),

    renderSection('sectionAccuracy', 'Enemy Accuracy Scaling',
      'Reduces cop accuracy when many enemies engage at once to prevent unfair overwhelming firepower.',
      ACCURACY_FIELDS, 'accuracy', d.accuracy),

    renderSection('sectionCharge', 'Charging Behaviour',
      'Controls whether cops charge directly at the player and how many can do so simultaneously. RDE sets this to unlimited.',
      CHARGE_FIELDS, 'charge', d.charge),

    renderSection('sectionSmoke', 'Smoke Grenade Tactics',
      'Controls cop use of smoke grenades. RDE allows unlimited simultaneous throwers with extended range.',
      SMOKE_FIELDS, 'smoke', d.smoke),

    renderSection('sectionCombatMain', 'Core Combat Settings',
      'The most impactful settings for overall cop aggressiveness: pursuit behaviour, retreat, cover usage, and fire ranges.',
      COMBAT_MAIN_FIELDS, 'combatMain', d.combatMain),

    renderSection('sectionReactAim', 'Weapon Reaction Speed',
      'Controls how fast peds react to weapon threats. A Rate of 999 makes professional peds react near-instantly to gunfire.',
      REACT_AIM_FIELDS, 'reactAim', d.reactAim),
  ].join('');

  container.classList.remove('is-hidden');
  wireInputs();
  updateModCount();
}

// ─── Input wiring ─────────────────────────────────────────────────────────────

function wireInputs() {
  const container = document.getElementById('tasksContent');
  if (!container) return;

  container.addEventListener('change', e => {
    const el = e.target;
    const section = el.dataset.section;
    const key = el.dataset.key;
    if (!section || !key) return;

    const d = tasksState.data;
    if (!d) return;

    // Handle nested keys like "wl1.Enabled"
    if (key.includes('.')) {
      const [sub, subKey] = key.split('.');
      if (!d[section]) return;
      if (!d[section][sub]) d[section][sub] = {};
      if (el.type === 'checkbox') {
        d[section][sub][subKey] = el.checked;
      } else {
        const num = parseFloat(el.value);
        d[section][sub][subKey] = isNaN(num) ? 0 : num;
      }
    } else {
      if (!d[section]) return;
      if (el.type === 'checkbox') {
        d[section][key] = el.checked;
      } else {
        const fieldDef = [...MANAGER_FIELDS, ...ADDITIONAL_FIELDS, ...FLANK_FIELDS,
          ...HELI_FIELDS, ...BUDDY_SHOT_FIELDS, ...ACCURACY_FIELDS, ...CHARGE_FIELDS,
          ...SMOKE_FIELDS, ...COMBAT_MAIN_FIELDS, ...REACT_AIM_FIELDS]
          .find(f => f.key === key);
        const num = fieldDef?.type === 'int' ? parseInt(el.value, 10) : parseFloat(el.value);
        d[section][key] = isNaN(num) ? 0 : num;
      }
    }
    updateModCount();
  });
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportCombatTasks() {
  if (!tasksState.rawXml) { alert('No file loaded.'); return; }
  const d = tasksState.data;

  const doc = new DOMParser().parseFromString(tasksState.rawXml, 'application/xml');

  function getItem(type) { return doc.querySelector(`Item[type="${type}"]`); }
  function q(parent, sel) { return parent ? parent.querySelector(sel) : null; }
  function setF(el, val) { if (el && val !== null && val !== undefined) el.setAttribute('value', parseFloat(val).toFixed(8)); }
  function setI(el, val) { if (el && val !== null && val !== undefined) el.setAttribute('value', String(Math.round(val))); }
  function setB(el, val) { if (el && val !== null && val !== undefined) el.setAttribute('value', val ? 'true' : 'false'); }
  function directChild(parent, tag) {
    if (!parent) return null;
    for (const c of parent.children) if (c.tagName === tag) return c;
    return null;
  }

  // Manager
  const mgrItem = getItem('CCombatTaskManager__Tunables');
  setF(q(mgrItem, 'fTimeBetweenUpdates'),  d.manager.fTimeBetweenUpdates);
  setI(q(mgrItem, 'iMaxPedsInCombatTask'), d.manager.iMaxPedsInCombatTask);

  // Additional
  const addItem = getItem('CTaskCombatAdditionalTask__Tunables');
  ADDITIONAL_FIELDS.forEach(f => {
    const el = q(addItem, f.key);
    if (f.type === 'float') setF(el, d.additional[f.key]);
    else setI(el, d.additional[f.key]);
  });

  // Flank
  const flankItem = getItem('CTaskCombatFlank__Tunables');
  FLANK_FIELDS.forEach(f => setF(q(flankItem, f.key), d.flank[f.key]));

  // Heli
  const heliItem = getItem('CTaskHelicopterStrafe__Tunables');
  HELI_FIELDS.forEach(f => {
    const el = q(heliItem, f.key);
    if (f.type === 'int') setI(el, d.heliStrafe[f.key]);
    else setF(el, d.heliStrafe[f.key]);
  });

  // CTaskCombat
  const combatItem = getItem('CTaskCombat__Tunables');

  // BuddyShot
  const bsEl = q(combatItem, 'BuddyShot');
  setB(q(bsEl, 'Enabled'),            d.buddyShot.Enabled);
  setF(q(bsEl, 'MinTimeBeforeReact'), d.buddyShot.MinTimeBeforeReact);
  setF(q(bsEl, 'MaxTimeBeforeReact'), d.buddyShot.MaxTimeBeforeReact);
  setF(q(bsEl, 'MaxTimeSinceShot'),   d.buddyShot.MaxTimeSinceShot);
  setF(q(bsEl, 'MaxDistance'),        d.buddyShot.MaxDistance);

  // LackOfHostility
  const lohEl = q(combatItem, 'LackOfHostility');
  setF(q(lohEl, 'MaxSpeedForVehicle'), d.lackOfHostility.MaxSpeedForVehicle);
  [1, 2, 3, 4, 5].forEach(n => {
    const wl = q(lohEl, `WantedLevel${n}`);
    const sd = d.lackOfHostility[`wl${n}`] || {};
    setB(q(wl, 'Enabled'),                     sd.Enabled);
    setF(q(wl, 'MinTimeSinceLastHostileAction'), sd.MinTimeSinceLastHostileAction);
  });

  // Accuracy
  const easEl = q(combatItem, 'EnemyAccuracyScaling');
  ACCURACY_FIELDS.forEach(f => {
    const el = q(easEl, f.key);
    if (f.type === 'int') setI(el, d.accuracy[f.key]);
    else setF(el, d.accuracy[f.key]);
  });

  // Charge
  const chargeEl = q(combatItem, 'ChargeTuning');
  CHARGE_FIELDS.forEach(f => {
    const el = q(chargeEl, f.key);
    if (f.type === 'bool') setB(el, d.charge[f.key]);
    else if (f.type === 'int') setI(el, d.charge[f.key]);
    else setF(el, d.charge[f.key]);
  });

  // Smoke
  const smokeEl = q(combatItem, 'ThrowSmokeGrenadeTuning');
  SMOKE_FIELDS.forEach(f => {
    const el = q(smokeEl, f.key);
    if (f.type === 'bool') setB(el, d.smoke[f.key]);
    else if (f.type === 'int') setI(el, d.smoke[f.key]);
    else setF(el, d.smoke[f.key]);
  });

  // Main combat fields
  COMBAT_MAIN_FIELDS.forEach(f => {
    const el = q(combatItem, f.key);
    if (f.type === 'int') setI(el, d.combatMain[f.key]);
    else setF(el, d.combatMain[f.key]);
  });

  // ReactAimWeapon
  const reactItem = getItem('CTaskReactAimWeapon__Tunables');
  setF(directChild(reactItem, 'Rate'),          d.reactAim.Rate);
  setF(directChild(reactItem, 'MaxRateVariance'), d.reactAim.MaxRateVariance);

  function setReactionRates(section, reactionTag, rate) {
    const rEl = q(q(section, reactionTag), 'Pistol');
    const rifleEl = q(q(section, reactionTag), 'Rifle');
    const smgEl   = q(q(section, reactionTag), 'MicroSMG');
    [rEl, rifleEl, smgEl].forEach(weapon => {
      const rNode = directChild(weapon, 'Rate');
      setF(rNode, rate);
    });
  }

  const prof    = q(reactItem, 'Professional');
  const notProf = q(reactItem, 'NotProfessional');
  setReactionRates(prof, 'Flinch',    d.reactAim.professionalFlinchRate);
  setReactionRates(prof, 'Surprised', d.reactAim.professionalSurprisedRate);
  setReactionRates(prof, 'None',      d.reactAim.professionalNoneRate);
  setReactionRates(notProf, 'Flinch',    d.reactAim.notProfFlinchRate);
  setReactionRates(notProf, 'Surprised', d.reactAim.notProfSurprisedRate);
  setReactionRates(notProf, 'None',      d.reactAim.notProfSurprisedRate); // use same rate for None

  // Serialize
  const s = new XMLSerializer();
  let xml = s.serializeToString(doc);
  xml = xml.replace(/ xmlns(?::\w+)?="[^"]*"/g, '');
  if (!xml.startsWith('<?xml')) {
    xml = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + xml;
  }

  const blob = new Blob([xml], { type: 'text/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = tasksState.file || 'combattasks.ymt.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetCombatTasks() {
  if (!tasksState.vanilla) return;
  tasksState.data = JSON.parse(JSON.stringify(tasksState.vanilla));
  renderEditor();
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function initDropZone(zoneId, inputId, onFile) {
  const zone  = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('is-drag');
    const file = e.dataTransfer?.files[0];
    if (file) readXmlFile(file, zone, onFile);
  });
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) readXmlFile(file, zone, onFile);
    input.value = '';
  });
}

function readXmlFile(file, zone, onSuccess) {
  const stateText = zone.querySelector('.ct-drop-state-text');
  if (stateText) stateText.textContent = 'Reading…';
  zone.classList.add('is-loading');

  const reader = new FileReader();
  reader.onload = () => {
    zone.classList.remove('is-loading');
    try {
      onSuccess(reader.result, file.name);
      zone.classList.add('is-loaded');
      if (stateText) stateText.textContent = '✓ Loaded: ' + file.name;
    } catch (err) {
      zone.classList.remove('is-loaded');
      if (stateText) stateText.textContent = '✗ Error: ' + err.message;
    }
  };
  reader.onerror = () => {
    zone.classList.remove('is-loading');
    if (stateText) stateText.textContent = '✗ Could not read file.';
  };
  reader.readAsText(file);
}

function handleTasksFile(xmlText, fileName) {
  const parsed = parseCombatTasks(xmlText);
  tasksState.data    = parsed;
  tasksState.vanilla = JSON.parse(JSON.stringify(parsed));
  tasksState.file    = fileName;
  tasksState.rawXml  = xmlText;

  const exportBtn = document.getElementById('tasksExportBtn');
  const resetBtn  = document.getElementById('tasksResetBtn');
  if (exportBtn) exportBtn.disabled = false;
  if (resetBtn)  resetBtn.disabled  = false;

  renderEditor();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function initCombatTasksApp() {
  initDropZone('tasksDropZone', 'tasksFileInput', handleTasksFile);

  document.getElementById('tasksExportBtn')?.addEventListener('click', exportCombatTasks);
  document.getElementById('tasksResetBtn')?.addEventListener('click', () => {
    if (confirm('Reset all values to what was in the loaded file?')) resetCombatTasks();
  });
}

document.addEventListener('DOMContentLoaded', initCombatTasksApp);
