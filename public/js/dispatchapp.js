/* =====================================================
   GTA-Traffic.com — Dispatch Editor
   dispatchapp.js  v1.0
   Edits GTA 5 dispatch.meta: vehicle swaps, ped counts,
   wanted level settings, and spawn timing.
   ===================================================== */

// ── Display labels ────────────────────────────────────
const DISPATCH_TYPE_LABELS = {
  DT_PoliceAutomobile:    'Police Car',
  DT_PoliceHelicopter:    'Police Helicopter',
  DT_SwatHelicopter:      'SWAT Helicopter',
  DT_FireDepartment:      'Fire Department',
  DT_SwatAutomobile:      'SWAT Vehicle',
  DT_AmbulanceDepartment: 'Ambulance',
  DT_Gangs:               'Gang Backup',
  DT_PoliceRiders:        'Police Motorcycle',
  DT_PoliceVehicleRequest:'Police Vehicle Request',
  DT_PoliceRoadBlock:     'Police Roadblock',
  DT_PoliceBoat:          'Police Boat',
  DT_ArmyVehicle:         'Army Vehicle',
  DT_BikerBackup:         'Biker Backup',
  DT_Assassins:           'Assassins',
};

const VSET_LABELS = {
  POLICE_CAR:                  'Police Car',
  POLICE_MOTORCYCLE:           'Police Motorcycle',
  SWAT_JEEP:                   'SWAT Vehicle',
  POLICE_HELI_1:               'Police Helicopter',
  POLICE_HELI_2:               'SWAT Helicopter',
  AMBULANCE:                   'Ambulance',
  FIRE_TRUCK:                  'Fire Truck',
  POLICE_ROAD_BLOCK_CARS:      'Roadblock: Cars',
  POLICE_ROAD_BLOCK_RIOT:      'Roadblock: Riot',
  POLICE_ROAD_BLOCK_SPIKE_STRIP:'Roadblock: Spike Strip',
  GANGS:                       'Gang Vehicle',
  POLICE_BOAT:                 'Police Boat',
  ARMY:                        'Army Vehicle',
  BIKER:                       'Biker Backup',
  ASSASSINS:                   'Assassins',
};

const ZONE_INFO = {
  VEHICLE_RESPONSE_ARMY_BASE:  { label: '⚔ Army Base',  cls: 'army'    },
  VEHICLE_RESPONSE_COUNTRYSIDE:{ label: '🌾 Countryside', cls: 'country' },
  null:                        { label: '🏙 City (Default)', cls: 'city' },
};

// ── Vanilla dispatch.meta data ────────────────────────
function makeVanilla() {
  return {
    globals: {
      ParoleDuration:                    9000,
      InHeliRadiusMultiplier:            1.5,
      ImmediateDetectionRange:           25.0,
      OnScreenImmediateDetectionRange:   45.0,
      LawSpawnDelayMin:   { SLOW: 20.0, MEDIUM: 10.0, FAST: 10.0 },
      LawSpawnDelayMax:   { SLOW: 30.0, MEDIUM: 20.0, FAST: 20.0 },
      AmbulanceSpawnDelayMin: { SLOW: 45.0, MEDIUM: 20.0, FAST: 20.0 },
      AmbulanceSpawnDelayMax: { SLOW: 60.0, MEDIUM: 30.0, FAST: 30.0 },
      FireSpawnDelayMin:  { SLOW: 45.0, MEDIUM: 20.0, FAST: 20.0 },
      FireSpawnDelayMax:  { SLOW: 60.0, MEDIUM: 30.0, FAST: 30.0 },
    },
    wantedThresholds: { 0: 0, 1: 50, 2: 180, 3: 550, 4: 1200, 5: 3800 },
    spRadius:         { 0: 0.0,   1: 145.0,  2: 227.5, 3: 340.0, 4: 510.0,  5: 850.0  },
    mpRadius:         { 0: 0.0,   1: 217.5,  2: 341.25,3: 450.0, 4: 645.0,  5: 1275.0 },
    hiddenEvasionSP:  { 0: 0,     1: 30000,  2: 37500, 3: 45000, 4: 56250,  5: 82500  },
    hiddenEvasionMP:  { 0: 0,     1: 30000,  2: 37500, 3: 40500, 4: 50625,  5: 74250  },
    // Vehicle sets: name → array of conditional items
    vehicleSets: {
      POLICE_CAR: [
        { zone: 'VEHICLE_RESPONSE_ARMY_BASE',   vehicles: ['crusader'],        peds: ['S_M_M_Marine_01'],    objects: [] },
        { zone: 'VEHICLE_RESPONSE_COUNTRYSIDE', vehicles: ['SHERIFF'],         peds: ['S_M_Y_Sheriff_01'],   objects: [] },
        { zone: null,                           vehicles: ['police3'],          peds: ['S_M_Y_Cop_01'],       objects: [] },
      ],
      POLICE_MOTORCYCLE: [
        { zone: null, vehicles: ['policeb'], peds: ['S_M_Y_Cop_01'], objects: [] },
      ],
      SWAT_JEEP: [
        { zone: 'VEHICLE_RESPONSE_ARMY_BASE',   vehicles: ['crusader'],  peds: ['S_M_M_Marine_01'],  objects: [] },
        { zone: 'VEHICLE_RESPONSE_COUNTRYSIDE', vehicles: ['sheriff2'],  peds: ['S_M_Y_Swat_01'],    objects: [] },
        { zone: null,                           vehicles: ['fbi2'],      peds: ['S_M_Y_Swat_01'],    objects: [] },
      ],
      POLICE_HELI_1: [
        { zone: 'VEHICLE_RESPONSE_ARMY_BASE', vehicles: [], peds: [], objects: [] },
        { zone: null, vehicles: ['polmav'],   peds: ['S_M_Y_Swat_01'], objects: [] },
      ],
      POLICE_HELI_2: [
        { zone: 'VEHICLE_RESPONSE_ARMY_BASE', vehicles: [], peds: [], objects: [] },
        { zone: null, vehicles: ['annihilator'], peds: ['S_M_Y_Swat_01'], objects: [] },
      ],
      AMBULANCE: [
        { zone: null, vehicles: ['ambulance'], peds: ['S_M_M_Paramedic_01'], objects: [] },
      ],
      FIRE_TRUCK: [
        { zone: null, vehicles: ['firetruk'], peds: ['S_M_Y_Fireman_01'], objects: [] },
      ],
      POLICE_ROAD_BLOCK_CARS: [
        { zone: 'VEHICLE_RESPONSE_ARMY_BASE',   vehicles: [],         peds: [],                   objects: [] },
        { zone: 'VEHICLE_RESPONSE_COUNTRYSIDE', vehicles: ['SHERIFF'],peds: ['S_M_Y_Sheriff_01'], objects: ['prop_roadcone01a'] },
        { zone: null,                           vehicles: ['police3'],peds: ['S_M_Y_Cop_01'],     objects: ['prop_roadcone01a'] },
      ],
      POLICE_ROAD_BLOCK_RIOT: [
        { zone: 'VEHICLE_RESPONSE_ARMY_BASE', vehicles: [],      peds: [],             objects: [] },
        { zone: null, vehicles: ['riot'],     peds: ['S_M_Y_Cop_01'], objects: ['prop_roadcone01a'], mutuallyExclusive: true },
      ],
      POLICE_ROAD_BLOCK_SPIKE_STRIP: [
        { zone: 'VEHICLE_RESPONSE_ARMY_BASE', vehicles: [],        peds: [],               objects: [] },
        { zone: null, vehicles: ['policet'],  peds: ['S_M_Y_Cop_01'], objects: ['p_ld_stinger_s'], mutuallyExclusive: true },
      ],
      GANGS: [
        { zone: null, vehicles: ['cavalcade'], peds: ['G_M_Y_PoloGoon_01'], objects: [] },
      ],
      POLICE_BOAT: [
        { zone: null, vehicles: ['predator'], peds: ['S_M_Y_Cop_01'], objects: [] },
      ],
      ARMY: [
        { zone: null, vehicles: ['mesa3'], peds: ['S_M_Y_BlackOps_01'], objects: [] },
      ],
      BIKER: [
        { zone: null, vehicles: ['gburrito2'], peds: ['S_M_Y_XMech_02_MP'], objects: [] },
      ],
      ASSASSINS: [
        { zone: null, vehicles: ['cog55', 'cog552'], peds: ['S_M_M_HighSec_01'], objects: [] },
      ],
    },
    // Wanted responses: star → array of { type, numPeds, sets[] }
    wantedResponses: {
      1: [
        { type: 'DT_PoliceAutomobile', numPeds: 4, sets: ['POLICE_CAR'] },
        { type: 'DT_PoliceBoat',       numPeds: 3, sets: ['POLICE_BOAT'] },
      ],
      2: [
        { type: 'DT_PoliceAutomobile', numPeds: 6, sets: ['POLICE_CAR'] },
        { type: 'DT_PoliceBoat',       numPeds: 3, sets: ['POLICE_BOAT'] },
      ],
      3: [
        { type: 'DT_PoliceAutomobile', numPeds: 8,  sets: ['POLICE_CAR'] },
        { type: 'DT_PoliceHelicopter', numPeds: 3,  sets: ['POLICE_HELI_1'] },
        { type: 'DT_PoliceRoadBlock',  numPeds: 2,  sets: ['POLICE_ROAD_BLOCK_CARS', 'POLICE_ROAD_BLOCK_SPIKE_STRIP'] },
        { type: 'DT_PoliceBoat',       numPeds: 6,  sets: ['POLICE_BOAT'] },
      ],
      4: [
        { type: 'DT_PoliceAutomobile', numPeds: 6, sets: ['POLICE_CAR'] },
        { type: 'DT_SwatAutomobile',   numPeds: 6, sets: ['SWAT_JEEP'] },
        { type: 'DT_PoliceHelicopter', numPeds: 3, sets: ['POLICE_HELI_1'] },
        { type: 'DT_SwatHelicopter',   numPeds: 5, sets: ['POLICE_HELI_1'] },
        { type: 'DT_PoliceRoadBlock',  numPeds: 4, sets: ['POLICE_ROAD_BLOCK_CARS', 'POLICE_ROAD_BLOCK_RIOT', 'POLICE_ROAD_BLOCK_SPIKE_STRIP'] },
        { type: 'DT_PoliceBoat',       numPeds: 6, sets: ['POLICE_BOAT'] },
      ],
      5: [
        { type: 'DT_PoliceAutomobile', numPeds: 6, sets: ['POLICE_CAR'] },
        { type: 'DT_SwatAutomobile',   numPeds: 6, sets: ['SWAT_JEEP'] },
        { type: 'DT_PoliceHelicopter', numPeds: 3, sets: ['POLICE_HELI_1'] },
        { type: 'DT_SwatHelicopter',   numPeds: 5, sets: ['POLICE_HELI_1'] },
        { type: 'DT_PoliceRoadBlock',  numPeds: 4, sets: ['POLICE_ROAD_BLOCK_CARS', 'POLICE_ROAD_BLOCK_RIOT', 'POLICE_ROAD_BLOCK_SPIKE_STRIP'] },
        { type: 'DT_PoliceBoat',       numPeds: 9, sets: ['POLICE_BOAT'] },
      ],
    },
    // Emergency responses (non-wanted)
    emergencyResponses: [
      { type: 'DT_FireDepartment',      numPeds: 4, sets: ['FIRE_TRUCK'] },
      { type: 'DT_AmbulanceDepartment', numPeds: 2, sets: ['AMBULANCE'] },
      { type: 'DT_PoliceVehicleRequest',numPeds: 2, sets: ['POLICE_CAR'] },
      { type: 'DT_Gangs',               numPeds: 6, sets: ['GANGS'] },
      { type: 'DT_ArmyVehicle',         numPeds: 6, sets: ['ARMY'] },
      { type: 'DT_BikerBackup',         numPeds: 4, sets: ['BIKER'] },
      { type: 'DT_Assassins',           numPeds: 4, sets: ['ASSASSINS'] },
    ],
  };
}

// ── State ─────────────────────────────────────────────
let dispatchState = {
  data: null,
  vanilla: null,
  mods: 0,
  loadedFile: null,
  activeTab: 'vehicles',
};
window.dispatchState = dispatchState;

// ── Helpers ───────────────────────────────────────────
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function countMods(current, vanilla) {
  return JSON.stringify(current) !== JSON.stringify(vanilla) ? 1 : 0;
}

function markModified() {
  // Recount by comparing full state
  dispatchState.mods = JSON.stringify(dispatchState.data) !== JSON.stringify(dispatchState.vanilla) ? 1 : 0;
  const el = document.getElementById('dispatchModCount');
  if (el) {
    const changed = JSON.stringify(dispatchState.data) !== JSON.stringify(dispatchState.vanilla);
    el.textContent = changed ? 'Unsaved changes' : '';
    el.classList.toggle('visible', changed);
  }
}

// ── Toast ─────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('dispatchToast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 3200);
}

// ── Tab switching ─────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.dispatch-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.dispatch-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.dispatch-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('tab-' + tab);
      if (panel) panel.classList.add('active');
      dispatchState.activeTab = tab;
    });
  });
}

// ── Vehicle Sets Renderer ─────────────────────────────
function renderVehicleSets() {
  const grid = document.getElementById('dispatchVsetGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const sets = dispatchState.data.vehicleSets;
  const vanillaSets = dispatchState.vanilla.vehicleSets;

  for (const [setName, items] of Object.entries(sets)) {
    const label = VSET_LABELS[setName] || setName;
    const isModified = JSON.stringify(items) !== JSON.stringify(vanillaSets[setName]);

    const card = document.createElement('div');
    card.className = 'dispatch-vset-card' + (isModified ? ' modified' : '');
    card.setAttribute('data-set', setName);

    card.innerHTML = `
      <div class="dispatch-vset-header">
        <span class="dispatch-vset-name">${label}</span>
        <span class="dispatch-vset-badge" style="font-size:9px;opacity:.7">${setName}</span>
      </div>
      <div class="dispatch-vset-items" id="vset-items-${setName}"></div>
    `;

    const itemsContainer = card.querySelector(`#vset-items-${setName}`);

    items.forEach((item, idx) => {
      const zoneKey = item.zone || 'null';
      const zoneInfo = ZONE_INFO[item.zone] || ZONE_INFO[null];
      const hasContent = item.vehicles.length > 0 || item.peds.length > 0;

      const itemEl = document.createElement('div');
      itemEl.className = 'dispatch-vset-item';

      if (!hasContent) {
        itemEl.innerHTML = `
          <div class="dispatch-zone-label ${zoneInfo.cls}">
            <span class="dispatch-zone-dot"></span>
            ${zoneInfo.label}
          </div>
          <div class="dispatch-empty-zone">No response (suppressed for this zone)</div>
        `;
      } else {
        const vanillaItem = (vanillaSets[setName] || [])[idx] || {};
        const vehModified = JSON.stringify(item.vehicles) !== JSON.stringify(vanillaItem.vehicles);
        const pedModified = JSON.stringify(item.peds)     !== JSON.stringify(vanillaItem.peds);
        const objModified = JSON.stringify(item.objects)  !== JSON.stringify(vanillaItem.objects);

        itemEl.innerHTML = `
          <div class="dispatch-zone-label ${zoneInfo.cls}">
            <span class="dispatch-zone-dot"></span>
            ${zoneInfo.label}
          </div>
          <div class="dispatch-model-row">
            <span class="dispatch-model-label">Vehicle</span>
            <input class="dispatch-model-input${vehModified ? ' modified' : ''}"
              type="text"
              value="${item.vehicles.join(', ')}"
              placeholder="model name(s)"
              data-set="${setName}" data-idx="${idx}" data-field="vehicles"
              title="Enter one or more vehicle model names, comma-separated"
            >
          </div>
          <div class="dispatch-model-row">
            <span class="dispatch-model-label">Ped</span>
            <input class="dispatch-model-input${pedModified ? ' modified' : ''}"
              type="text"
              value="${item.peds.join(', ')}"
              placeholder="ped model name(s)"
              data-set="${setName}" data-idx="${idx}" data-field="peds"
              title="Enter one or more ped model names, comma-separated"
            >
          </div>
          ${item.objects.length > 0 || objModified ? `
          <div class="dispatch-model-row">
            <span class="dispatch-model-label">Props</span>
            <input class="dispatch-model-input${objModified ? ' modified' : ''}"
              type="text" data-type="objects"
              value="${item.objects.join(', ')}"
              placeholder="prop model name(s)"
              data-set="${setName}" data-idx="${idx}" data-field="objects"
              title="Prop/object models (cones, stingers, etc.)"
            >
          </div>` : ''}
        `;
      }

      itemsContainer.appendChild(itemEl);
    });

    grid.appendChild(card);
  }

  // Attach change listeners
  grid.querySelectorAll('.dispatch-model-input').forEach(input => {
    input.addEventListener('change', onModelInputChange);
  });
}

function onModelInputChange(e) {
  const input = e.target;
  const setName = input.getAttribute('data-set');
  const idx     = parseInt(input.getAttribute('data-idx'), 10);
  const field   = input.getAttribute('data-field');
  const values  = input.value.split(',').map(s => s.trim()).filter(Boolean);

  dispatchState.data.vehicleSets[setName][idx][field] = values;

  const vanillaVal = ((dispatchState.vanilla.vehicleSets[setName] || [])[idx] || {})[field] || [];
  const isModified = JSON.stringify(values) !== JSON.stringify(vanillaVal);
  input.classList.toggle('modified', isModified);

  // Update card border
  const card = input.closest('.dispatch-vset-card');
  if (card) {
    const setItems = dispatchState.data.vehicleSets[setName];
    const vanItems = dispatchState.vanilla.vehicleSets[setName];
    card.classList.toggle('modified', JSON.stringify(setItems) !== JSON.stringify(vanItems));
  }

  markModified();
}

// ── Escalation Table Renderer ─────────────────────────
function renderEscalation() {
  const wrap = document.getElementById('dispatchEscalationWrap');
  if (!wrap) return;

  // Collect all dispatch types that appear across wanted + emergency
  const dispatchTypes = [];
  const seen = new Set();
  for (let star = 1; star <= 5; star++) {
    for (const resp of (dispatchState.data.wantedResponses[star] || [])) {
      if (!seen.has(resp.type)) { seen.add(resp.type); dispatchTypes.push({ type: resp.type, section: 'wanted' }); }
    }
  }
  for (const resp of (dispatchState.data.emergencyResponses || [])) {
    if (!seen.has(resp.type)) { seen.add(resp.type); dispatchTypes.push({ type: resp.type, section: 'emergency' }); }
  }

  // Build lookup: type → star → numPeds
  function getPeds(type, star) {
    const resp = (dispatchState.data.wantedResponses[star] || []).find(r => r.type === type);
    return resp ? resp.numPeds : null;
  }
  function getEmergencyPeds(type) {
    const resp = (dispatchState.data.emergencyResponses || []).find(r => r.type === type);
    return resp ? resp.numPeds : null;
  }
  function getVanillaPeds(type, star) {
    const resp = (dispatchState.vanilla.wantedResponses[star] || []).find(r => r.type === type);
    return resp ? resp.numPeds : null;
  }
  function getVanillaEmergencyPeds(type) {
    const resp = (dispatchState.vanilla.emergencyResponses || []).find(r => r.type === type);
    return resp ? resp.numPeds : null;
  }

  let html = `
    <div class="dispatch-escalation-wrap">
      <table class="dispatch-escalation-table">
        <thead>
          <tr>
            <th style="min-width:200px">Dispatch Type</th>
            <th class="star-col"><span class="dispatch-star dispatch-star-1">★1</span></th>
            <th class="star-col"><span class="dispatch-star dispatch-star-2">★2</span></th>
            <th class="star-col"><span class="dispatch-star dispatch-star-3">★3</span></th>
            <th class="star-col"><span class="dispatch-star dispatch-star-4">★4</span></th>
            <th class="star-col"><span class="dispatch-star dispatch-star-5">★5</span></th>
            <th class="star-col" style="color:var(--color-text-muted);font-size:10px">EMRG</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const { type } of dispatchTypes) {
    const label = DISPATCH_TYPE_LABELS[type] || type;
    html += `<tr>
      <td>
        <div class="dispatch-dispatch-label">${label}</div>
        <div class="dispatch-dispatch-sub">${type}</div>
      </td>`;

    for (let star = 1; star <= 5; star++) {
      const val = getPeds(type, star);
      const vanVal = getVanillaPeds(type, star);
      const isModified = val !== null && val !== vanVal;
      if (val !== null) {
        html += `<td style="text-align:center">
          <input class="dispatch-ped-input${isModified ? ' modified' : ''}"
            type="number" min="0" max="50" step="1"
            value="${val}"
            data-type="wanted" data-dispatch="${type}" data-star="${star}"
          >
        </td>`;
      } else {
        html += `<td style="text-align:center"><span class="dispatch-ped-empty">—</span></td>`;
      }
    }

    // Emergency column
    const emVal = getEmergencyPeds(type);
    const emVanVal = getVanillaEmergencyPeds(type);
    if (emVal !== null) {
      const isModified = emVal !== emVanVal;
      html += `<td style="text-align:center">
        <input class="dispatch-ped-input${isModified ? ' modified' : ''}"
          type="number" min="0" max="50" step="1"
          value="${emVal}"
          data-type="emergency" data-dispatch="${type}"
        >
      </td>`;
    } else {
      html += `<td style="text-align:center"><span class="dispatch-ped-empty">—</span></td>`;
    }

    html += `</tr>`;
  }

  html += `</tbody></table></div>`;
  wrap.innerHTML = html;

  // Listeners
  wrap.querySelectorAll('.dispatch-ped-input').forEach(input => {
    input.addEventListener('change', onPedInputChange);
  });
}

function onPedInputChange(e) {
  const input = e.target;
  const type  = input.getAttribute('data-dispatch');
  const kind  = input.getAttribute('data-type');
  const val   = parseInt(input.value, 10) || 0;

  if (kind === 'wanted') {
    const star = parseInt(input.getAttribute('data-star'), 10);
    const resp = (dispatchState.data.wantedResponses[star] || []).find(r => r.type === type);
    if (resp) {
      resp.numPeds = val;
      const vanResp = (dispatchState.vanilla.wantedResponses[star] || []).find(r => r.type === type);
      input.classList.toggle('modified', !vanResp || vanResp.numPeds !== val);
    }
  } else {
    const resp = (dispatchState.data.emergencyResponses || []).find(r => r.type === type);
    if (resp) {
      resp.numPeds = val;
      const vanResp = (dispatchState.vanilla.emergencyResponses || []).find(r => r.type === type);
      input.classList.toggle('modified', !vanResp || vanResp.numPeds !== val);
    }
  }

  markModified();
}

// ── Settings Panel Renderer ───────────────────────────
function renderSettings() {
  const panel = document.getElementById('dispatchSettingsPanel');
  if (!panel) return;

  const g  = dispatchState.data.globals;
  const vg = dispatchState.vanilla.globals;
  const th  = dispatchState.data.wantedThresholds;
  const vth = dispatchState.vanilla.wantedThresholds;
  const sp  = dispatchState.data.spRadius;
  const vsp = dispatchState.vanilla.spRadius;
  const mp  = dispatchState.data.mpRadius;
  const vmp = dispatchState.vanilla.mpRadius;
  const he  = dispatchState.data.hiddenEvasionSP;
  const vhe = dispatchState.vanilla.hiddenEvasionSP;
  const hm  = dispatchState.data.hiddenEvasionMP;
  const vhm = dispatchState.vanilla.hiddenEvasionMP;

  function numInput(id, val, vanVal, settingPath, step = 1) {
    const mod = val !== vanVal ? ' modified' : '';
    return `<input class="dispatch-setting-input${mod}" type="number" step="${step}"
      id="${id}" value="${val}" data-path="${settingPath}">`;
  }

  function delayTable(key) {
    const minData = g[key + 'Min'];
    const maxData = g[key + 'Max'];
    const vMin = vg[key + 'Min'];
    const vMax = vg[key + 'Max'];
    const speeds = ['SLOW', 'MEDIUM', 'FAST'];
    let rows = '';
    for (const s of speeds) {
      const minMod = minData[s] !== vMin[s] ? ' modified' : '';
      const maxMod = maxData[s] !== vMax[s] ? ' modified' : '';
      rows += `<tr>
        <td class="row-label">${s}</td>
        <td><input class="dispatch-delay-input${minMod}" type="number" step="0.5"
          value="${minData[s]}" data-path="globals.${key}Min.${s}"></td>
        <td><input class="dispatch-delay-input${maxMod}" type="number" step="0.5"
          value="${maxData[s]}" data-path="globals.${key}Max.${s}"></td>
      </tr>`;
    }
    return `<table class="dispatch-delay-table">
      <tr><th></th><th>Min (s)</th><th>Max (s)</th></tr>
      ${rows}
    </table>`;
  }

  function starRows(obj, vanObj, pathPrefix) {
    const labels = ['Clean', '1 ★', '2 ★', '3 ★', '4 ★', '5 ★'];
    return [0,1,2,3,4,5].map(i => {
      const val = obj[i];
      const vanVal = vanObj[i];
      const mod = val !== vanVal ? ' modified' : '';
      return `<div class="dispatch-wanted-row">
        <span style="width:40px;font-size:var(--text-xs);color:var(--color-text-muted)">${labels[i]}</span>
        <input class="dispatch-setting-input${mod}" type="number" step="any"
          value="${val}" data-path="${pathPrefix}.${i}" style="width:90px">
      </div>`;
    }).join('');
  }

  panel.innerHTML = `
    <div class="dispatch-settings-grid">

      <!-- Global Detection -->
      <div class="dispatch-settings-card">
        <h3>Detection &amp; Misc</h3>
        <div class="dispatch-setting-row">
          <div><div class="dispatch-setting-label">Paroleduration</div><div class="dispatch-setting-unit">milliseconds</div></div>
          ${numInput('set-parole', g.ParoleDuration, vg.ParoleDuration, 'globals.ParoleDuration', 500)}
        </div>
        <div class="dispatch-setting-row">
          <div><div class="dispatch-setting-label">Heli Radius Multiplier</div><div class="dispatch-setting-unit">×</div></div>
          ${numInput('set-heli-mult', g.InHeliRadiusMultiplier, vg.InHeliRadiusMultiplier, 'globals.InHeliRadiusMultiplier', 0.1)}
        </div>
        <div class="dispatch-setting-row">
          <div><div class="dispatch-setting-label">Immediate Detection (on foot)</div><div class="dispatch-setting-unit">meters</div></div>
          ${numInput('set-det', g.ImmediateDetectionRange, vg.ImmediateDetectionRange, 'globals.ImmediateDetectionRange', 1)}
        </div>
        <div class="dispatch-setting-row">
          <div><div class="dispatch-setting-label">Immediate Detection (on screen)</div><div class="dispatch-setting-unit">meters</div></div>
          ${numInput('set-det-screen', g.OnScreenImmediateDetectionRange, vg.OnScreenImmediateDetectionRange, 'globals.OnScreenImmediateDetectionRange', 1)}
        </div>
      </div>

      <!-- Law Spawn Delays -->
      <div class="dispatch-settings-card">
        <h3>Police Spawn Delay</h3>
        ${delayTable('LawSpawnDelay')}
      </div>

      <!-- Ambulance Spawn Delays -->
      <div class="dispatch-settings-card">
        <h3>Ambulance Spawn Delay</h3>
        ${delayTable('AmbulanceSpawnDelay')}
      </div>

      <!-- Fire Spawn Delays -->
      <div class="dispatch-settings-card">
        <h3>Fire Spawn Delay</h3>
        ${delayTable('FireSpawnDelay')}
      </div>

      <!-- Wanted Thresholds -->
      <div class="dispatch-settings-card">
        <h3>Wanted Level Thresholds</h3>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin:0 0 10px">Score needed to reach each star level</p>
        ${starRows(th, vth, 'wantedThresholds')}
      </div>

      <!-- SP Wanted Radius -->
      <div class="dispatch-settings-card">
        <h3>SP Search Radius</h3>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin:0 0 10px">Singleplayer wanted search circle (meters)</p>
        ${starRows(sp, vsp, 'spRadius')}
      </div>

      <!-- MP Wanted Radius -->
      <div class="dispatch-settings-card">
        <h3>MP Search Radius</h3>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin:0 0 10px">Multiplayer wanted search circle (meters)</p>
        ${starRows(mp, vmp, 'mpRadius')}
      </div>

      <!-- Hidden Evasion SP -->
      <div class="dispatch-settings-card">
        <h3>Hidden Evasion Time (SP)</h3>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin:0 0 10px">Time hidden before losing wanted level (ms)</p>
        ${starRows(he, vhe, 'hiddenEvasionSP')}
      </div>

      <!-- Hidden Evasion MP -->
      <div class="dispatch-settings-card">
        <h3>Hidden Evasion Time (MP)</h3>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin:0 0 10px">Multiplayer version (ms)</p>
        ${starRows(hm, vhm, 'hiddenEvasionMP')}
      </div>

    </div>
  `;

  // Attach listeners
  panel.querySelectorAll('.dispatch-setting-input, .dispatch-delay-input').forEach(input => {
    input.addEventListener('change', onSettingChange);
  });
}

function onSettingChange(e) {
  const input = e.target;
  const path  = input.getAttribute('data-path');
  if (!path) return;
  const parts = path.split('.');
  let obj = dispatchState.data;
  for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
  const key = parts[parts.length - 1];
  const rawVal = input.value;
  obj[key] = rawVal.includes('.') ? parseFloat(rawVal) : parseInt(rawVal, 10);

  // Compare vs vanilla to mark modified
  let vanObj = dispatchState.vanilla;
  for (let i = 0; i < parts.length - 1; i++) vanObj = vanObj[parts[i]];
  const vanVal = vanObj[key];
  input.classList.toggle('modified', obj[key] !== vanVal);

  markModified();
}

// ── XML Parser ────────────────────────────────────────
function parseDispatchMeta(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML parse error');

  function numAttr(el, defaultVal = 0) {
    if (!el) return defaultVal;
    const v = el.getAttribute('value') || el.textContent;
    return parseFloat(v) || defaultVal;
  }
  function intAttr(el, defaultVal = 0) {
    if (!el) return defaultVal;
    const v = el.getAttribute('value') || el.textContent;
    return parseInt(v) || defaultVal;
  }
  function speedGroup(parentEl) {
    if (!parentEl) return { SLOW: 0, MEDIUM: 0, FAST: 0 };
    return {
      SLOW:   numAttr(parentEl.querySelector('SLOW')),
      MEDIUM: numAttr(parentEl.querySelector('MEDIUM')),
      FAST:   numAttr(parentEl.querySelector('FAST')),
    };
  }
  function starGroup(parentEl) {
    if (!parentEl) return {};
    const result = {};
    const keys = ['WantedLevelClean','WantedLevel1','WantedLevel2','WantedLevel3','WantedLevel4','WantedLevel5'];
    keys.forEach((k, i) => {
      const el = parentEl.querySelector(k);
      result[i] = numAttr(el);
    });
    return result;
  }

  const root = doc.querySelector('CDispatchData');

  // Globals
  const globals = {
    ParoleDuration:                  intAttr(root.querySelector('ParoleDuration')),
    InHeliRadiusMultiplier:          numAttr(root.querySelector('InHeliRadiusMultiplier')),
    ImmediateDetectionRange:         numAttr(root.querySelector('ImmediateDetectionRange')),
    OnScreenImmediateDetectionRange: numAttr(root.querySelector('OnScreenImmediateDetectionRange')),
    LawSpawnDelayMin:       speedGroup(root.querySelector('LawSpawnDelayMin')),
    LawSpawnDelayMax:       speedGroup(root.querySelector('LawSpawnDelayMax')),
    AmbulanceSpawnDelayMin: speedGroup(root.querySelector('AmbulanceSpawnDelayMin')),
    AmbulanceSpawnDelayMax: speedGroup(root.querySelector('AmbulanceSpawnDelayMax')),
    FireSpawnDelayMin:      speedGroup(root.querySelector('FireSpawnDelayMin')),
    FireSpawnDelayMax:      speedGroup(root.querySelector('FireSpawnDelayMax')),
  };

  const wantedThresholds = starGroup(root.querySelector('WantedLevelThresholds'));
  const spRadius         = starGroup(root.querySelector('SingleplayerWantedLevelRadius'));
  const mpRadius         = starGroup(root.querySelector('MultiplayerWantedLevelRadius'));
  const hiddenEvasionSP  = starGroup(root.querySelector('HiddenEvasionTimes'));
  const hiddenEvasionMP  = starGroup(root.querySelector('MultiplayerHiddenEvasionTimes'));

  // Vehicle Sets
  const vehicleSets = {};
  root.querySelectorAll('VehicleSets > Vehicle').forEach(vehEl => {
    const name = vehEl.querySelector('Name')?.textContent?.trim();
    if (!name) return;
    const items = [];
    vehEl.querySelectorAll('ConditionalVehicleSets > Item').forEach(item => {
      const zoneEl = item.querySelector('ZoneType');
      const zone = zoneEl ? zoneEl.textContent.trim() : null;
      const vehicles = Array.from(item.querySelectorAll('VehicleModels > Vehicle')).map(e => e.textContent.trim()).filter(Boolean);
      const peds     = Array.from(item.querySelectorAll('PedModels > Ped')).map(e => e.textContent.trim()).filter(Boolean);
      const objects  = Array.from(item.querySelectorAll('ObjectModels > Object')).map(e => e.textContent.trim()).filter(Boolean);
      const mutuallyExclusive = !!item.querySelector('IsMutuallyExclusive');
      items.push({ zone, vehicles, peds, objects, ...(mutuallyExclusive ? { mutuallyExclusive: true } : {}) });
    });
    vehicleSets[name] = items;
  });

  // Wanted Responses
  const wantedResponses = {};
  for (let star = 1; star <= 5; star++) {
    const lvlEl = root.querySelector(`WantedLevel${star}`);
    if (!lvlEl) continue;
    wantedResponses[star] = [];
    lvlEl.querySelectorAll('DispatchServices > Item').forEach(item => {
      const type    = item.querySelector('DispatchType')?.textContent?.trim();
      const numPeds = intAttr(item.querySelector('NumPedsToSpawn'));
      const sets    = Array.from(item.querySelectorAll('DispatchVehicleSets > Dispatch')).map(e => e.textContent.trim());
      if (type) wantedResponses[star].push({ type, numPeds, sets });
    });
  }

  // Emergency Responses
  const emergencyResponses = [];
  root.querySelectorAll('EmergencyResponses > Item').forEach(item => {
    const type    = item.querySelector('DispatchType')?.textContent?.trim();
    const numPeds = intAttr(item.querySelector('NumPedsToSpawn'));
    const sets    = Array.from(item.querySelectorAll('DispatchVehicleSets > Dispatch')).map(e => e.textContent.trim());
    if (type) emergencyResponses.push({ type, numPeds, sets });
  });

  return { globals, wantedThresholds, spRadius, mpRadius, hiddenEvasionSP, hiddenEvasionMP, vehicleSets, wantedResponses, emergencyResponses };
}

// ── XML Export ────────────────────────────────────────
function exportToXml() {
  const d  = dispatchState.data;
  const g  = d.globals;

  function speedBlock(tag, obj) {
    return `\t<${tag}>\n\t\t<SLOW value="${obj.SLOW}"/>\n\t\t<MEDIUM value="${obj.MEDIUM}"/>\n\t\t<FAST value="${obj.FAST}"/>\n\t</${tag}>`;
  }
  function starBlock(tag, obj) {
    const keys = ['WantedLevelClean','WantedLevel1','WantedLevel2','WantedLevel3','WantedLevel4','WantedLevel5'];
    const vals = keys.map((k,i) => `\t\t<${k} value="${obj[i]}"/>`).join('\n');
    return `\t<${tag}>\n${vals}\n\t</${tag}>`;
  }
  function vsetBlock() {
    let xml = '\t<VehicleSets>\n';
    for (const [name, items] of Object.entries(d.vehicleSets)) {
      xml += `\t\t<Vehicle>\n\t\t\t<Name>${name}</Name>\n\t\t\t<ConditionalVehicleSets>\n`;
      for (const item of items) {
        xml += '\t\t\t\t<Item>\n';
        if (item.zone) xml += `\t\t\t\t\t<ZoneType>${item.zone}</ZoneType>\n`;
        if (item.mutuallyExclusive) xml += `\t\t\t\t\t<IsMutuallyExclusive value="true" />\n`;
        if (item.vehicles.length > 0) {
          xml += '\t\t\t\t\t<VehicleModels>\n';
          for (const v of item.vehicles) xml += `\t\t\t\t\t\t<Vehicle>${v}</Vehicle>\n`;
          xml += '\t\t\t\t\t</VehicleModels>\n';
        }
        if (item.peds.length > 0) {
          xml += '\t\t\t\t\t<PedModels>\n';
          for (const p of item.peds) xml += `\t\t\t\t\t\t<Ped>${p}</Ped>\n`;
          xml += '\t\t\t\t\t</PedModels>\n';
        }
        if (item.objects.length > 0) {
          xml += '\t\t\t\t\t<ObjectModels>\n';
          for (const o of item.objects) xml += `\t\t\t\t\t\t<Object>${o}</Object>\n`;
          xml += '\t\t\t\t\t</ObjectModels>\n';
        }
        xml += '\t\t\t\t</Item>\n';
      }
      xml += '\t\t\t</ConditionalVehicleSets>\n\t\t</Vehicle>\n';
    }
    xml += '\t</VehicleSets>';
    return xml;
  }
  function wantedBlock() {
    let xml = '\t<WantedResponses>\n';
    for (let star = 1; star <= 5; star++) {
      xml += `\t\t<WantedLevel${star}>\n\t\t\t<DispatchServices>\n`;
      for (const resp of (d.wantedResponses[star] || [])) {
        xml += `\t\t\t\t<Item>\n\t\t\t\t\t<DispatchType>${resp.type}</DispatchType>\n\t\t\t\t\t<NumPedsToSpawn value="${resp.numPeds}"/>\n\t\t\t\t\t<DispatchVehicleSets>\n`;
        for (const s of resp.sets) xml += `\t\t\t\t\t\t<Dispatch>${s}</Dispatch>\n`;
        xml += `\t\t\t\t\t</DispatchVehicleSets>\n\t\t\t\t</Item>\n`;
      }
      xml += `\t\t\t</DispatchServices>\n\t\t</WantedLevel${star}>\n`;
    }
    xml += '\t</WantedResponses>';
    return xml;
  }
  function emergencyBlock() {
    let xml = '\t<EmergencyResponses>\n';
    for (const resp of (d.emergencyResponses || [])) {
      xml += `\t\t<Item>\n\t\t\t<DispatchType>${resp.type}</DispatchType>\n\t\t\t<NumPedsToSpawn value="${resp.numPeds}"/>\n\t\t\t<DispatchVehicleSets>\n`;
      for (const s of resp.sets) xml += `\t\t\t\t<Dispatch>${s}</Dispatch>\n`;
      xml += `\t\t\t</DispatchVehicleSets>\n\t\t</Item>\n`;
    }
    xml += '\t</EmergencyResponses>';
    return xml;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>

<CDispatchData>
\t<ParoleDuration value="${g.ParoleDuration}"/>
\t<InHeliRadiusMultiplier value="${g.InHeliRadiusMultiplier}"/>
\t<ImmediateDetectionRange value="${g.ImmediateDetectionRange}"/>
\t<OnScreenImmediateDetectionRange value="${g.OnScreenImmediateDetectionRange}"/>
${speedBlock('LawSpawnDelayMin',       g.LawSpawnDelayMin)}
${speedBlock('LawSpawnDelayMax',       g.LawSpawnDelayMax)}
${speedBlock('AmbulanceSpawnDelayMin', g.AmbulanceSpawnDelayMin)}
${speedBlock('AmbulanceSpawnDelayMax', g.AmbulanceSpawnDelayMax)}
${speedBlock('FireSpawnDelayMin',      g.FireSpawnDelayMin)}
${speedBlock('FireSpawnDelayMax',      g.FireSpawnDelayMax)}
${starBlock('WantedLevelThresholds',        d.wantedThresholds)}
${starBlock('SingleplayerWantedLevelRadius',d.spRadius)}
${starBlock('MultiplayerWantedLevelRadius', d.mpRadius)}
${starBlock('HiddenEvasionTimes',           d.hiddenEvasionSP)}
${starBlock('MultiplayerHiddenEvasionTimes',d.hiddenEvasionMP)}
${vsetBlock()}
${wantedBlock()}
${emergencyBlock()}
</CDispatchData>
`;
}

// ── Drop Zone ─────────────────────────────────────────
function initDropZone() {
  const zone  = document.getElementById('dispatchDropZone');
  const input = document.getElementById('dispatchFileInput');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) loadFile(input.files[0]);
    input.value = '';
  });
}

function loadFile(file) {
  const zone = document.getElementById('dispatchDropZone');
  const stateText = zone && zone.querySelector('.dispatch-drop-state-text');

  if (!file.name.endsWith('.meta') && !file.name.endsWith('.xml')) {
    if (zone) zone.setAttribute('data-state', 'error');
    if (stateText) stateText.textContent = 'Invalid file — must be dispatch.meta';
    showToast('Invalid file type', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = parseDispatchMeta(e.target.result);
      dispatchState.data = parsed;
      dispatchState.loadedFile = file.name;
      if (zone) zone.setAttribute('data-state', 'success');
      if (stateText) stateText.textContent = `Loaded: ${file.name}`;
      renderAll();
      markModified();
      showToast(`Loaded ${file.name}`, 'success');
    } catch (err) {
      if (zone) zone.setAttribute('data-state', 'error');
      if (stateText) stateText.textContent = 'Parse error — check file format';
      showToast('Failed to parse dispatch.meta', 'error');
      console.error('[DispatchEditor]', err);
    }
  };
  reader.readAsText(file);
}

// ── Export ────────────────────────────────────────────
function downloadXml(content, filename) {
  const blob = new Blob([content], { type: 'text/xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function initExport() {
  const btnExport = document.getElementById('dispatchExportBtn');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const content  = exportToXml();
      const filename = dispatchState.loadedFile || 'dispatch.meta';
      downloadXml(content, filename);
      showToast(`Exported ${filename}`, 'success');
    });
  }

  const btnReset = document.getElementById('dispatchResetBtn');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (!confirm('Reset all changes to vanilla GTA 5 dispatch settings?')) return;
      dispatchState.data = makeVanilla();
      dispatchState.loadedFile = null;
      const zone = document.getElementById('dispatchDropZone');
      if (zone) { zone.removeAttribute('data-state'); zone.querySelector('.dispatch-drop-state-text').textContent = ''; }
      renderAll();
      markModified();
      showToast('Reset to vanilla dispatch.meta', 'success');
    });
  }
}

// ── Render all panels ─────────────────────────────────
function renderAll() {
  renderVehicleSets();
  renderEscalation();
  renderSettings();
}

// ── Init ──────────────────────────────────────────────
function initDispatchEditor() {
  dispatchState.vanilla = makeVanilla();
  dispatchState.data    = makeVanilla();

  initTabs();
  initDropZone();
  initExport();
  renderAll();
}

document.addEventListener('DOMContentLoaded', initDispatchEditor);
