// ── dispatch-crime-witness.js ─────────────────────────────────────────────────
// "Crime Triggers" and "Witness Rules" tabs for the Dispatch editor.
// Handles crimeinformation.meta and witnessinformation.meta.
// ─────────────────────────────────────────────────────────────────────────────

// ── Vanilla data ──────────────────────────────────────
function makeVanillaCrimes() {
  return [
    { key: 'CRIME_BLOCK_POLICE_CAR',           witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_CAR_SET_ON_FIRE',            witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_CAUSE_EXPLOSION',            witnessed: true,  hearDist: 50.0, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_COP_SET_ON_FIRE',            witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_DAMAGE_TO_PROPERTY',         witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_DESTROY_HELI',               witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_DESTROY_PLANE',              witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_DESTROY_VEHICLE',            witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_DRIVE_AGAINST_TRAFFIC',      witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_FIREARM_DISCHARGE',          witnessed: true,  hearDist: 50.0, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_HIT_COP',                    witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_HIT_PED',                    witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_KILL_COP',                   witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_MOLOTOV',                    witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_PED_SET_ON_FIRE',            witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_POSSESSION_GUN',             witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_RECKLESS_DRIVING',           witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_RESIST_ARREST',              witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_RIDING_BIKE_WITHOUT_HELMET', witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_RUN_REDLIGHT',               witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_RUNOVER_COP',                witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_RUNOVER_PED',                witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_SHOOT_AT_COP',               witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_SHOOT_COP',                  witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_SHOOT_NONLETHAL_COP',        witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_SHOOT_NONLETHAL_PED',        witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_SHOOT_PED',                  witnessed: true,  hearDist: 50.0, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_SHOOT_VEHICLE',              witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_SPEEDING',                   witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_STAB_COP',                   witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_STAB_PED',                   witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_STAND_ON_POLICE_CAR',        witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_STEAL_CAR',                  witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_STEAL_VEHICLE',              witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_JACK_DEAD_PED',              witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_TARGET_COP',                 witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_TERRORIST_ACTIVITY',         witnessed: false, hearDist: null, mustNotify: false, victimOnly: false },
    { key: 'CRIME_HASSLE',                     witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: true  },
    { key: 'CRIME_STEALTH_KILL_COP',           witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_STEALTH_KILL_PED',           witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_SHOOT_PED_SUPPRESSED',       witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
    { key: 'CRIME_KILL_PED',                   witnessed: true,  hearDist: null, mustNotify: true,  victimOnly: false },
  ];
}

function makeVanillaWitness() {
  return [
    { key: 'Default', canWitness: true,  willCall: true  },
    { key: 'Player',  canWitness: false, willCall: false },
    { key: 'Animal',  canWitness: false, willCall: false },
  ];
}

// ── State ─────────────────────────────────────────────
const crimeState = {
  data:      null,
  vanilla:   null,
  activeCat: 'all',
};
const witnessState = {
  data:    null,
  vanilla: null,
};

// ── Category data ─────────────────────────────────────
const CRIME_CATEGORIES = {
  cop:     ['CRIME_HIT_COP','CRIME_KILL_COP','CRIME_SHOOT_COP','CRIME_SHOOT_AT_COP',
            'CRIME_SHOOT_NONLETHAL_COP','CRIME_STAB_COP','CRIME_RUNOVER_COP',
            'CRIME_COP_SET_ON_FIRE','CRIME_STAND_ON_POLICE_CAR','CRIME_BLOCK_POLICE_CAR',
            'CRIME_RESIST_ARREST','CRIME_TARGET_COP','CRIME_STEALTH_KILL_COP'],
  ped:     ['CRIME_HIT_PED','CRIME_KILL_PED','CRIME_SHOOT_PED','CRIME_SHOOT_NONLETHAL_PED',
            'CRIME_SHOOT_PED_SUPPRESSED','CRIME_STAB_PED','CRIME_RUNOVER_PED',
            'CRIME_PED_SET_ON_FIRE','CRIME_STEALTH_KILL_PED','CRIME_HASSLE','CRIME_JACK_DEAD_PED'],
  vehicle: ['CRIME_STEAL_CAR','CRIME_STEAL_VEHICLE','CRIME_DESTROY_VEHICLE','CRIME_DESTROY_HELI',
            'CRIME_DESTROY_PLANE','CRIME_SHOOT_VEHICLE','CRIME_CAR_SET_ON_FIRE','CRIME_DAMAGE_TO_PROPERTY'],
  traffic: ['CRIME_SPEEDING','CRIME_RECKLESS_DRIVING','CRIME_DRIVE_AGAINST_TRAFFIC',
            'CRIME_RUN_REDLIGHT','CRIME_RIDING_BIKE_WITHOUT_HELMET'],
  weapon:  ['CRIME_FIREARM_DISCHARGE','CRIME_CAUSE_EXPLOSION','CRIME_MOLOTOV',
            'CRIME_POSSESSION_GUN','CRIME_TERRORIST_ACTIVITY'],
};

const CAT_META = {
  cop:     { label: 'Cop Crime',  color: '#ef4444', icon: '🚔' },
  ped:     { label: 'Ped Crime',  color: '#f97316', icon: '👤' },
  vehicle: { label: 'Vehicle',    color: '#3b82f6', icon: '🚗' },
  traffic: { label: 'Traffic',    color: '#14b8a6', icon: '🛣' },
  weapon:  { label: 'Weapon',     color: '#a855f7', icon: '💥' },
  other:   { label: 'Other',      color: 'var(--color-text-muted)', icon: '•' },
};

function getCrimeCat(key) {
  for (const [cat, keys] of Object.entries(CRIME_CATEGORIES)) {
    if (keys.includes(key)) return cat;
  }
  return 'other';
}

function crimeDisplayName(key) {
  return key
    .replace(/^CRIME_/, '')
    .split('_')
    .map(w => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function cwEsc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Parsers ───────────────────────────────────────────
function parseCrimeInfo(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML parse error');
  const crimes = [];
  doc.querySelectorAll('CrimeInformations > Item').forEach(item => {
    const key = item.getAttribute('key');
    if (!key) return;
    const wi = item.querySelector('WitnessInformation');
    if (!wi) {
      crimes.push({ key, witnessed: false, hearDist: null, mustNotify: false, victimOnly: false });
    } else {
      const flags   = wi.querySelector('Flags')?.textContent || '';
      const spFlags = wi.querySelector('AdditionalFlagsForSP')?.textContent || '';
      const hearEl  = wi.querySelector('MaxDistanceToHear');
      crimes.push({
        key,
        witnessed:  flags.includes('MustBeWitnessed'),
        hearDist:   hearEl ? parseFloat(hearEl.getAttribute('value') || hearEl.textContent) : null,
        mustNotify: spFlags.includes('MustNotifyLawEnforcement'),
        victimOnly: spFlags.includes('OnlyVictimCanNotifyLawEnforcement'),
      });
    }
  });
  return crimes;
}

function parseWitnessInfo(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML parse error');
  const personalities = [];
  doc.querySelectorAll('Personalities > Item').forEach(item => {
    const key   = item.getAttribute('key');
    const flags = item.querySelector('Flags')?.textContent || '';
    personalities.push({
      key,
      canWitness: flags.includes('CanWitnessCrimes'),
      willCall:   flags.includes('WillCallLawEnforcement'),
    });
  });
  return personalities;
}

// ── XML exporters ─────────────────────────────────────
function exportCrimeXml(crimes) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CCrimeInformations>\n\t<CrimeInformations>\n`;
  for (const c of crimes) {
    if (!c.witnessed && !c.hearDist && !c.mustNotify && !c.victimOnly) {
      xml += `\t\t<Item key="${c.key}" />\n`;
    } else {
      xml += `\t\t<Item key="${c.key}">\n\t\t\t<WitnessInformation>\n`;
      if (c.hearDist != null) xml += `\t\t\t\t<MaxDistanceToHear value="${c.hearDist}"/>\n`;
      if (c.witnessed) xml += `\t\t\t\t<Flags>MustBeWitnessed</Flags>\n`;
      const spFlags = [];
      if (c.mustNotify)  spFlags.push('MustNotifyLawEnforcement');
      if (c.victimOnly)  spFlags.push('OnlyVictimCanNotifyLawEnforcement');
      if (spFlags.length) xml += `\t\t\t\t<AdditionalFlagsForSP>${spFlags.join(' ')}</AdditionalFlagsForSP>\n`;
      xml += `\t\t\t</WitnessInformation>\n\t\t</Item>\n`;
    }
  }
  xml += `\t</CrimeInformations>\n</CCrimeInformations>\n`;
  return xml;
}

function exportWitnessXml(personalities) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CWitnessInformations>\n\t<Personalities>\n`;
  for (const p of personalities) {
    const flags = [];
    if (p.canWitness) flags.push('CanWitnessCrimes');
    if (p.willCall)   flags.push('WillCallLawEnforcement');
    xml += `\t\t<Item key="${p.key}">\n\t\t\t<Flags>${flags.join(' ')}</Flags>\n\t\t</Item>\n`;
  }
  xml += `\t</Personalities>\n</CWitnessInformations>\n`;
  return xml;
}

// ── Crime table renderer ──────────────────────────────
function renderCrimes() {
  const wrap = document.getElementById('crimeTableWrap');
  if (!wrap) return;
  const crimes    = crimeState.data;
  const vanilla   = crimeState.vanilla;
  const activeCat = crimeState.activeCat;

  const list = activeCat === 'all'
    ? crimes
    : crimes.filter(c => getCrimeCat(c.key) === activeCat);

  if (!list.length) {
    wrap.innerHTML = '<p style="padding:16px;color:var(--color-text-muted)">No crimes in this category.</p>';
    return;
  }

  let html = `<div class="crime-table-scroll"><table class="crime-table">
<thead><tr>
  <th>Crime</th><th>Category</th><th>Reporting Mode</th><th>Hear Distance</th><th>Notes</th>
</tr></thead><tbody>`;

  list.forEach(crime => {
    const globalIdx  = crimes.indexOf(crime);
    const cat        = getCrimeCat(crime.key);
    const cm         = CAT_META[cat];
    const van        = vanilla[globalIdx];
    const modified   = van && JSON.stringify(crime) !== JSON.stringify(van);
    const name       = crimeDisplayName(crime.key);
    const notes      = crime.victimOnly ? 'Victim only' : '';

    html += `<tr class="${modified ? 'crime-row-modified' : ''}">
  <td class="crime-name-cell">
    ${modified ? '<span class="crime-modified-dot" title="Modified from vanilla">●</span>' : ''}
    <span class="crime-display-name">${cwEsc(name)}</span>
    <div class="crime-key">${cwEsc(crime.key)}</div>
  </td>
  <td>
    <span class="crime-cat-badge" style="--cat-color:${cm.color}">${cm.icon} ${cm.label}</span>
  </td>
  <td>
    <button class="crime-mode-toggle ${crime.witnessed ? 'mode-witness' : 'mode-always'}"
            onclick="toggleCrimeWitnessed(${globalIdx})">
      ${crime.witnessed ? '👁 Witness Required' : '⚡ Always Reported'}
    </button>
  </td>
  <td class="crime-hear-cell">
    ${crime.witnessed
      ? `<div class="crime-hear-row">
           <input class="crime-hear-input" type="number" min="0" max="500" step="5"
                  value="${crime.hearDist ?? ''}" placeholder="LOS only"
                  oninput="setCrimeHearDist(${globalIdx},this.value)">
           <span class="crime-hear-unit">m</span>
         </div>`
      : '<span class="crime-hear-na">—</span>'
    }
  </td>
  <td class="crime-notes-cell">${notes ? `<span class="crime-note-badge">${cwEsc(notes)}</span>` : ''}</td>
</tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  // Update mod count badge
  const changed = crimes.filter((c, i) => JSON.stringify(c) !== JSON.stringify(vanilla[i])).length;
  const badge = document.getElementById('crimeModCount');
  if (badge) {
    badge.textContent = changed ? changed + ' change' + (changed !== 1 ? 's' : '') : '';
    badge.classList.toggle('visible', changed > 0);
  }
}

// ── Witness table renderer ────────────────────────────
function renderWitness() {
  const wrap = document.getElementById('witnessTableWrap');
  if (!wrap) return;

  const PERSONALITY_DESC = {
    Default: 'Regular NPCs — civilians, shopkeepers, bystanders',
    Player:  'The player character',
    Animal:  'Dogs, birds, and other animals',
  };

  let html = `<table class="witness-table">
<thead><tr>
  <th>Personality</th>
  <th>Who they are</th>
  <th class="witness-flag-th">Can Witness Crimes</th>
  <th class="witness-flag-th">Will Call Law Enforcement</th>
</tr></thead><tbody>`;

  witnessState.data.forEach((p, i) => {
    const van      = witnessState.vanilla[i];
    const modified = van && JSON.stringify(p) !== JSON.stringify(van);

    html += `<tr class="${modified ? 'crime-row-modified' : ''}">
  <td class="witness-name-cell">
    ${modified ? '<span class="crime-modified-dot">●</span>' : ''}
    <strong>${cwEsc(p.key)}</strong>
  </td>
  <td style="font-size:var(--text-xs);color:var(--color-text-secondary)">${cwEsc(PERSONALITY_DESC[p.key] || '')}</td>
  <td class="witness-flag-cell">
    <label class="witness-toggle">
      <input type="checkbox" ${p.canWitness ? 'checked' : ''}
             onchange="setWitnessFlag(${i},'canWitness',this.checked)">
      <span class="witness-toggle-label ${p.canWitness ? 'wt-yes' : 'wt-no'}">${p.canWitness ? '✓ Yes' : '✗ No'}</span>
    </label>
  </td>
  <td class="witness-flag-cell">
    <label class="witness-toggle">
      <input type="checkbox" ${p.willCall ? 'checked' : ''}
             onchange="setWitnessFlag(${i},'willCall',this.checked)">
      <span class="witness-toggle-label ${p.willCall ? 'wt-yes' : 'wt-no'}">${p.willCall ? '✓ Yes' : '✗ No'}</span>
    </label>
  </td>
</tr>`;
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
}

// ── Edit handlers ─────────────────────────────────────
function toggleCrimeWitnessed(idx) {
  const c = crimeState.data[idx];
  c.witnessed = !c.witnessed;
  if (!c.witnessed) {
    // Always reported — clear witness-only fields
    c.hearDist   = null;
    c.mustNotify = false;
    c.victimOnly = false;
  } else {
    // Witness required — default to notify law
    c.mustNotify = true;
  }
  renderCrimes();
}

function setCrimeHearDist(idx, value) {
  const v = parseFloat(value);
  crimeState.data[idx].hearDist = (value === '' || isNaN(v)) ? null : v;
  // Re-render mod count without full re-render to avoid losing focus
  const crimes  = crimeState.data;
  const vanilla = crimeState.vanilla;
  const changed = crimes.filter((c, i) => JSON.stringify(c) !== JSON.stringify(vanilla[i])).length;
  const badge = document.getElementById('crimeModCount');
  if (badge) {
    badge.textContent = changed ? changed + ' change' + (changed !== 1 ? 's' : '') : '';
    badge.classList.toggle('visible', changed > 0);
  }
}

function setWitnessFlag(idx, flag, value) {
  witnessState.data[idx][flag] = value;
  renderWitness();
}

// ── Category filter ───────────────────────────────────
function initCrimeCatFilter() {
  document.querySelectorAll('.crime-cat-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.crime-cat-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      crimeState.activeCat = btn.getAttribute('data-cat');
      renderCrimes();
    });
  });
}

// ── Drop zones ────────────────────────────────────────
function _initDropZone(dzId, fiId, loadFn) {
  const dz = document.getElementById(dzId);
  const fi = document.getElementById(fiId);
  if (!dz || !fi) return;
  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fi.click(); });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); loadFn(e.dataTransfer.files[0], dz); });
  fi.addEventListener('change', () => { if (fi.files[0]) loadFn(fi.files[0], dz); });
}

function loadCrimeFile(file, dz) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const crimes = parseCrimeInfo(e.target.result);
      crimeState.data    = crimes;
      crimeState.vanilla = JSON.parse(JSON.stringify(crimes));
      dz.setAttribute('data-state', 'success');
      dz.querySelector('.dispatch-drop-state-text').textContent = '✓ Loaded: ' + file.name;
      renderCrimes();
    } catch(err) {
      dz.setAttribute('data-state', 'error');
      dz.querySelector('.dispatch-drop-state-text').textContent = 'Error: ' + err.message;
    }
  };
  reader.readAsText(file);
}

function loadWitnessFile(file, dz) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const personalities = parseWitnessInfo(e.target.result);
      witnessState.data    = personalities;
      witnessState.vanilla = JSON.parse(JSON.stringify(personalities));
      dz.setAttribute('data-state', 'success');
      dz.querySelector('.dispatch-drop-state-text').textContent = '✓ Loaded: ' + file.name;
      renderWitness();
    } catch(err) {
      dz.setAttribute('data-state', 'error');
      dz.querySelector('.dispatch-drop-state-text').textContent = 'Error: ' + err.message;
    }
  };
  reader.readAsText(file);
}

// ── Export + Reset buttons ────────────────────────────
function _downloadXml(filename, content) {
  const blob = new Blob([content], { type: 'text/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function initCrimeExport() {
  document.getElementById('crimeExportBtn')?.addEventListener('click', () => {
    _downloadXml('crimeinformation.meta', exportCrimeXml(crimeState.data));
  });
  document.getElementById('crimeResetBtn')?.addEventListener('click', () => {
    crimeState.data = makeVanillaCrimes();
    renderCrimes();
    const dz = document.getElementById('crimeDropZone');
    if (dz) {
      dz.removeAttribute('data-state');
      dz.querySelector('.dispatch-drop-state-text').textContent = '';
    }
  });
}

function initWitnessExport() {
  document.getElementById('witnessExportBtn')?.addEventListener('click', () => {
    _downloadXml('witnessinformation.meta', exportWitnessXml(witnessState.data));
  });
  document.getElementById('witnessResetBtn')?.addEventListener('click', () => {
    witnessState.data = makeVanillaWitness();
    renderWitness();
    const dz = document.getElementById('witnessDropZone');
    if (dz) {
      dz.removeAttribute('data-state');
      dz.querySelector('.dispatch-drop-state-text').textContent = '';
    }
  });
}

// ── Init ──────────────────────────────────────────────
function initCrimeWitnessModule() {
  crimeState.vanilla   = makeVanillaCrimes();
  crimeState.data      = makeVanillaCrimes();
  witnessState.vanilla = makeVanillaWitness();
  witnessState.data    = makeVanillaWitness();

  _initDropZone('crimeDropZone',   'crimeFileInput',   loadCrimeFile);
  _initDropZone('witnessDropZone', 'witnessFileInput', loadWitnessFile);
  initCrimeCatFilter();
  initCrimeExport();
  initWitnessExport();
  renderCrimes();
  renderWitness();
}

document.addEventListener('DOMContentLoaded', initCrimeWitnessModule);
