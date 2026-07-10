'use strict';

// ─── Carriage visual meta ─────────────────────────────────────────────────────
const CAR_COLORS = {
  freight:'#f97316', freight2:'#ea580c',
  freightcar:'#64748b', freightcar2:'#475569', freightcar3:'#334155',
  freightcont1:'#3b82f6', freightcont2:'#1d4ed8',
  freightgrain:'#b45309', tankercar:'#8b8fa8', metrotrain:'#0ea5e9'
};
const CAR_LABELS = {
  freight:'Engine', freight2:'Engine 2',
  freightcar:'Flat', freightcar2:'Flat 2', freightcar3:'Flat 3',
  freightcont1:'Cont A', freightcont2:'Cont B',
  freightgrain:'Grain', tankercar:'Tanker', metrotrain:'Metro'
};

// ─── Vanilla track data ───────────────────────────────────────────────────────
// [filename, group, pingPong, stopsAtStations, MPstopsAtStations, speed, brakingDist]
const VTR = [
  ['trains1.dat','freight_group',false,false,true,15,20],
  ['trains2.dat','freight_group',false,false,true,8,10],
  ['trains3.dat','freight_group',false,false,true,8,10],
  ['trains4.dat','metro_group',false,true,true,8,10],
  ['trains5.dat','freight_group',false,false,true,8,10],
  ['trains6.dat','freight_group',false,false,true,8,10],
  ['trains7.dat','freight_group',false,false,true,8,10],
  ['trains8.dat','freight_group',false,false,true,8,10],
  ['trains9.dat','freight_group',false,false,true,8,10],
  ['trains10.dat','freight_group',false,false,true,8,10],
  ['trains11.dat','freight_group',false,false,true,8,10],
  ['trains12.dat','freight_group',false,false,true,15,20],
];
function makeVanillaTracks() {
  return VTR.map(r => ({
    filename:r[0], trainConfigName:r[1], isPingPongTrack:r[2],
    stopsAtStations:r[3], MPstopsAtStations:r[4], speed:r[5], brakingDist:r[6]
  }));
}

// ─── Vanilla config data ──────────────────────────────────────────────────────
// [name, noRandomSpawn, carriageGap, [[model, vertOffset, maxPeds, flipDir, repeat], ...]]
const VCR = [
  ['freight_config0',true,0.1,[['freight',1.65,0,false,1],['freightcar',0.70,0,false,2]]],
  ['freight_config1',false,0.1,[['freight',1.65,0,false,1],['freightcar',0.70,0,false,8]]],
  ['freight_config2',true,0.1,[['freight',1.65,0,false,1],['freightcont2',0.70,0,false,1],['freightcont1',0.70,0,false,1],['freightgrain',0.99,0,false,1],['tankercar',0.99,0,false,1],['freightcar',0.70,0,false,1]]],
  ['freight_config3',false,0.1,[['freight',1.65,0,false,1],['freightcar',0.70,0,false,1],['tankercar',0.99,0,false,3],['freightcar',0.70,0,false,2],['tankercar',0.99,0,false,2]]],
  ['freight_config4',false,0.1,[['freight',1.65,0,false,1],['freightgrain',0.99,0,false,2],['freightcar',0.70,0,false,1],['freightgrain',0.99,0,false,1],['freightcar',0.70,0,false,3],['freightgrain',0.99,0,false,2]]],
  ['freight_config5',false,0.1,[['freight',1.65,0,false,1],['freightcar',0.70,0,false,4],['freightgrain',0.99,0,false,1],['freightcar',0.70,0,false,1]]],
  ['freight_config6',true,0.1,[['freight',1.65,0,false,1],['freightcont1',0.70,0,false,2],['freightcar',0.70,0,false,1],['tankercar',0.99,0,false,1]]],
  ['freight_config7',false,0.1,[['freight',1.65,0,false,1],['freightcar',0.70,0,false,3],['freightcont2',0.70,0,false,3],['freightcar',0.70,0,false,2]]],
  ['freight_config8',false,0.1,[['freight',1.65,0,false,1],['freightcont2',0.70,0,false,2],['freightcar',0.70,0,false,1],['freightcont2',0.70,0,false,2],['freightcar',0.70,0,false,1],['tankercar',0.99,0,false,1]]],
  ['freight_config9',false,0.1,[['freight',1.65,0,false,1],['freightcar',0.70,0,false,1],['freightgrain',0.99,0,false,2],['freightcar',0.70,0,false,2],['freightgrain',0.99,0,false,1]]],
  ['freight_config10',false,0.1,[['freight',1.65,0,false,1],['freightcont1',0.70,0,false,3],['freightcont2',0.70,0,false,2],['freightcar',0.70,0,false,3]]],
  ['freight_config11',false,0.1,[['freight',1.65,0,false,1],['freightcont1',0.70,0,false,1],['freightcar',0.70,0,false,1],['freightcont1',0.70,0,false,5]]],
  ['freight_config12',false,0.1,[['freight',1.65,0,false,1],['freightgrain',0.99,0,false,3],['freightcar',0.70,0,false,1],['freightgrain',0.99,0,false,2]]],
  ['freight_config13',false,0.1,[['freight',1.65,0,false,1],['freightcar',0.70,0,false,2],['tankercar',0.99,0,false,3],['freightcar',0.70,0,false,3]]],
  ['freight_config14',false,0.1,[['freight',1.65,0,false,1],['freightcont1',0.70,0,false,1],['freightcar',0.70,0,false,2],['freightcont1',0.70,0,false,3],['freightcar',0.70,0,false,1],['freightcont1',0.70,0,false,1]]],
  ['freight_config15',false,0.1,[['freight',1.65,0,false,1],['freightgrain',0.99,0,false,3],['freightcar',0.70,0,false,1],['freightcont1',0.70,0,false,2],['freightgrain',0.99,0,false,1],['freightcar',0.70,0,false,1]]],
  ['freight_config16',false,0.1,[['freight',1.65,0,false,1],['freightcar',0.70,0,false,1],['tankercar',0.99,0,false,3],['freightcar',0.70,0,false,1],['tankercar',0.99,0,false,2]]],
  ['freight_config17',true,0.0,[['freight',1.65,0,false,1],['freightcont2',0.70,0,false,40]]],
  ['freight_config18',true,0.0,[['freight',1.65,0,false,1]]],
  ['freight_config19',true,0.1,[['freight',1.65,0,false,1],['tankercar',0.99,0,false,2]]],
  ['freight_config20',true,0.1,[['freight',1.65,0,false,1],['freightcont2',0.70,0,false,3]]],
  ['freight_config21',true,0.1,[['metrotrain',0.4,0,false,1]]],
  ['freight_config22',true,0.1,[['freight',1.65,0,false,1],['freightcar',0.70,0,false,12]]],
  ['freight_config23',true,0.1,[['freight',1.65,0,false,1],['freightcar',0.70,0,false,1],['freightcont1',0.70,0,false,1],['freightcar',0.70,0,false,1],['freightcont1',0.70,0,false,1],['freightcar',0.70,0,false,1],['freightcont1',0.70,0,false,1],['freightcar',0.70,0,false,1],['freightcont1',0.70,0,false,1],['freightcar',0.70,0,false,1],['freightcont1',0.70,0,false,1],['freightcar',0.70,0,false,1],['freightcont1',0.70,0,false,1],['freightcar',0.70,0,false,1]]],
  ['freight_config24',true,0.1,[['freight',1.65,0,false,1],['freightcar2',0.70,0,false,4],['freightgrain',0.99,0,false,1],['freightcar2',0.70,0,false,1]]],
  ['freight_config25',true,0.1,[['freight',1.65,0,false,1],['freightgrain',0.99,0,false,1],['freightcar2',0.70,0,false,1],['tankercar',0.99,0,false,1],['freightgrain',0.99,0,false,1],['tankercar',0.99,0,false,1],['freightcar2',0.70,0,false,1],['freightgrain',0.99,0,false,1],['freightcar2',0.70,0,false,1],['tankercar',0.99,0,false,2],['freightcar2',0.70,0,false,1],['tankercar',0.99,0,false,1],['freightcar2',0.70,0,false,1],['freightgrain',0.99,0,false,1],['tankercar',0.99,0,false,2]]],
  ['freight_config26',true,0.1,[['freight2',1.65,0,false,1],['freightcar2',0.70,0,false,5]]],
  ['freight_config27',true,0.1,[['freight',1.65,0,false,1],['freightcar3',0.70,0,false,6]]],
  ['metro_config0',false,-0.5,[['metrotrain',0.4,4,false,1],['metrotrain',0.4,4,true,1]]],
];

const VANILLA_GROUPS = {
  freight_group: VCR.slice(0,28).map(c => c[0]),
  metro_group: ['metro_config0']
};

function makeVanillaConfigs() {
  return VCR.map(r => ({
    name: r[0], noRandomSpawn: r[1], carriageGap: r[2],
    populateTrainDist: 40.0, announceStations: false, doorsBeep: false,
    carriagesHang: false, carriagesSwing: false, linkTracks: true,
    carriages: r[3].map(c => ({ model:c[0], vertOffset:c[1], maxPeds:c[2], flipDir:c[3], repeat:c[4] }))
  }));
}

// ─── State ────────────────────────────────────────────────────────────────────
const trackState = { data: null, vanilla: null };
const consistState = { data: null, vanilla: null, groups: null, expanded: new Set() };

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.trains-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.trains-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.trains-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// ─── Drop zone helper ─────────────────────────────────────────────────────────
function initDropZone(dzId, fiId, onFile) {
  const dz = document.getElementById(dzId);
  const fi = document.getElementById(fiId);
  if (!dz || !fi) return;
  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fi.click(); });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) onFile(f, dz); });
  fi.addEventListener('change', () => { if (fi.files[0]) onFile(fi.files[0], dz); fi.value = ''; });
}

function setDropZoneLoaded(dz, filename) {
  dz.classList.add('loaded');
  const st = dz.querySelector('.trains-drop-state-text');
  if (st) st.textContent = '✓ Loaded: ' + filename;
}

// ─── Track: modified check ────────────────────────────────────────────────────
function trackModified(idx) {
  const t = trackState.data[idx], v = trackState.vanilla[idx];
  return t.speed !== v.speed || t.brakingDist !== v.brakingDist ||
    t.trainConfigName !== v.trainConfigName || t.stopsAtStations !== v.stopsAtStations ||
    t.MPstopsAtStations !== v.MPstopsAtStations || t.isPingPongTrack !== v.isPingPongTrack;
}

function updateTrackModCount() {
  const n = trackState.data.filter((_,i) => trackModified(i)).length;
  const el = document.getElementById('trackModCount');
  if (el) el.textContent = n > 0 ? n + ' modified' : '';
}

// ─── Track: render ────────────────────────────────────────────────────────────
function renderTracks() {
  const tbody = document.getElementById('trackTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  trackState.data.forEach((t, i) => {
    const mod = trackModified(i);
    const kmh = Math.round(t.speed * 3.6);
    const row = document.createElement('tr');
    if (mod) row.classList.add('modified');
    row.innerHTML =
      '<td><span class="track-modified-dot ' + (mod ? 'visible' : '') + '"></span></td>' +
      '<td><span class="track-name">' + t.filename + '</span></td>' +
      '<td><select class="track-select" data-idx="' + i + '" data-field="trainConfigName">' +
        '<option value="freight_group"' + (t.trainConfigName === 'freight_group' ? ' selected' : '') + '>Freight</option>' +
        '<option value="metro_group"' + (t.trainConfigName === 'metro_group' ? ' selected' : '') + '>Metro</option>' +
      '</select></td>' +
      '<td><div class="track-speed-cell">' +
        '<input class="track-input" type="number" min="1" max="200" step="1" value="' + t.speed + '" data-idx="' + i + '" data-field="speed">' +
        '<span class="track-unit">m/s</span>' +
      '</div></td>' +
      '<td><span class="track-kmh" id="kmh-' + i + '">~' + kmh + ' km/h</span></td>' +
      '<td><div class="track-speed-cell">' +
        '<input class="track-input" type="number" min="1" max="500" step="1" value="' + t.brakingDist + '" data-idx="' + i + '" data-field="brakingDist">' +
        '<span class="track-unit">m</span>' +
      '</div></td>' +
      '<td><label class="track-toggle"><input type="checkbox" data-idx="' + i + '" data-field="stopsAtStations"' + (t.stopsAtStations ? ' checked' : '') + '></label></td>' +
      '<td><label class="track-toggle"><input type="checkbox" data-idx="' + i + '" data-field="MPstopsAtStations"' + (t.MPstopsAtStations ? ' checked' : '') + '></label></td>' +
      '<td><label class="track-toggle"><input type="checkbox" data-idx="' + i + '" data-field="isPingPongTrack"' + (t.isPingPongTrack ? ' checked' : '') + '></label></td>';
    tbody.appendChild(row);
  });

  tbody.querySelectorAll('input[type="number"]').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = +inp.dataset.idx, field = inp.dataset.field;
      trackState.data[idx][field] = +inp.value;
      if (field === 'speed') {
        const el = document.getElementById('kmh-' + idx);
        if (el) el.textContent = '~' + Math.round(+inp.value * 3.6) + ' km/h';
      }
      updateTrackRowMod(idx);
      updateTrackModCount();
    });
  });
  tbody.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      trackState.data[+cb.dataset.idx][cb.dataset.field] = cb.checked;
      updateTrackRowMod(+cb.dataset.idx);
      updateTrackModCount();
    });
  });
  tbody.querySelectorAll('select').forEach(sel => {
    sel.addEventListener('change', () => {
      trackState.data[+sel.dataset.idx][sel.dataset.field] = sel.value;
      updateTrackRowMod(+sel.dataset.idx);
      updateTrackModCount();
    });
  });
  updateTrackModCount();
}

function updateTrackRowMod(idx) {
  const mod = trackModified(idx);
  const tbody = document.getElementById('trackTableBody');
  if (!tbody) return;
  const row = tbody.rows[idx];
  if (!row) return;
  row.classList.toggle('modified', mod);
  const dot = row.querySelector('.track-modified-dot');
  if (dot) dot.classList.toggle('visible', mod);
}

// ─── Track: parse ─────────────────────────────────────────────────────────────
function parseTracksXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) return null;
  const tracks = [...doc.querySelectorAll('train_track')].map(el => ({
    filename: (el.getAttribute('filename') || '').replace('common:/data/levels/gta5/', ''),
    trainConfigName: el.getAttribute('trainConfigName') || 'freight_group',
    isPingPongTrack: el.getAttribute('isPingPongTrack') === 'true',
    stopsAtStations: el.getAttribute('stopsAtStations') === 'true',
    MPstopsAtStations: el.getAttribute('MPstopsAtStations') !== 'false',
    speed: parseFloat(el.getAttribute('speed')) || 8,
    brakingDist: parseFloat(el.getAttribute('brakingDist')) || 10,
  }));
  return tracks.length ? tracks : null;
}

// ─── Track: export ────────────────────────────────────────────────────────────
function exportTracksXml(tracks) {
  const lines = ['<?xml version = "1.0" encoding = "UTF-8"?>', '', '<train_tracks version = "1">'];
  tracks.forEach(t => {
    lines.push('\t<train_track');
    lines.push('\t\tfilename="common:/data/levels/gta5/' + t.filename + '"');
    lines.push('\t\ttrainConfigName="' + t.trainConfigName + '"');
    lines.push('\t\tisPingPongTrack="' + t.isPingPongTrack + '"');
    lines.push('\t\tstopsAtStations="' + t.stopsAtStations + '"');
    lines.push('\t\tMPstopsAtStations="' + t.MPstopsAtStations + '"');
    lines.push('\t\tspeed="' + t.speed + '"');
    lines.push('\t\tbrakingDist="' + t.brakingDist + '"/>');
  });
  lines.push('</train_tracks>');
  return lines.join('\n');
}

// ─── Consist: modified check ──────────────────────────────────────────────────
function consistModified(idx) {
  const c = consistState.data[idx];
  const v = consistState.vanilla[idx];
  if (!v) return true;
  if (c.noRandomSpawn !== v.noRandomSpawn || c.carriageGap !== v.carriageGap) return true;
  if (c.carriages.length !== v.carriages.length) return true;
  return c.carriages.some((car, i) => {
    const vc = v.carriages[i];
    return car.model !== vc.model || car.repeat !== vc.repeat;
  });
}

function updateConsistModCount() {
  const n = consistState.data.filter((_,i) => consistModified(i)).length;
  const el = document.getElementById('consistModCount');
  if (el) el.textContent = n > 0 ? n + ' modified' : '';
}

function carChip(model, repeat) {
  const color = CAR_COLORS[model] || '#555';
  const label = CAR_LABELS[model] || model;
  const txt = repeat > 1 ? repeat + '\xd7 ' + label : label;
  return '<div class="consist-car" style="background:' + color + '" title="' + model + ' \xd7 ' + repeat + '">' + txt + '</div>';
}

function totalCars(carriages) { return carriages.reduce((s,c) => s + c.repeat, 0); }

// ─── Consist: render ──────────────────────────────────────────────────────────
function renderConsists() {
  const grid = document.getElementById('consistGrid');
  if (!grid) return;
  grid.innerHTML = '';
  consistState.data.forEach((cfg, i) => {
    const mod = consistModified(i);
    const expanded = consistState.expanded.has(i);
    const total = totalCars(cfg.carriages);
    const strip = cfg.carriages.map(c => carChip(c.model, c.repeat)).join('');

    let editRows = '';
    cfg.carriages.forEach((car, ci) => {
      editRows +=
        '<tr>' +
        '<td><div class="consist-car" style="background:' + (CAR_COLORS[car.model]||'#555') + ';font-size:10px;height:20px;padding:0 6px;display:inline-flex;align-items:center;color:#fff;border-radius:3px">' + (CAR_LABELS[car.model]||car.model) + '</div></td>' +
        '<td style="font-family:monospace;font-size:11px;color:var(--color-text-secondary)">' + car.model + '</td>' +
        '<td><input class="track-input" type="number" min="1" max="100" value="' + car.repeat + '" data-cfg="' + i + '" data-car="' + ci + '" style="width:54px"></td>' +
        '<td style="font-size:11px;color:var(--color-text-muted)">' + (car.flipDir ? '⇄ flipped' : '') + '</td>' +
        '</tr>';
    });

    const card = document.createElement('div');
    card.className = 'consist-card' + (mod ? ' modified' : '');
    card.dataset.idx = i;
    card.innerHTML =
      '<div class="consist-card-header">' +
        '<span class="consist-name">' + cfg.name + '</span>' +
        '<span class="consist-badges">' +
          '<span class="' + (cfg.noRandomSpawn ? 'badge-mission' : 'badge-world') + '">' + (cfg.noRandomSpawn ? '🎞 Mission' : '🌍 World') + '</span>' +
          '<span class="badge-gap">gap ' + cfg.carriageGap + '</span>' +
          (mod ? '<span class="track-modified-dot visible" style="display:inline-block"></span>' : '') +
        '</span>' +
      '</div>' +
      '<div class="consist-strip" id="strip-' + i + '">' + strip + '</div>' +
      '<div class="consist-footer">' +
        '<span id="total-' + i + '">' + total + ' car' + (total !== 1 ? 's' : '') + ' total</span>' +
        '<button class="consist-expand-btn btn btn-ghost" data-idx="' + i + '" type="button" style="font-size:11px;padding:3px 10px">' + (expanded ? '↑ Collapse' : '↓ Edit') + '</button>' +
      '</div>' +
      '<div class="consist-edit" style="display:' + (expanded ? 'block' : 'none') + '">' +
        '<div style="display:flex;gap:16px;margin-bottom:10px;flex-wrap:wrap;align-items:center">' +
          '<label class="track-toggle" style="font-size:12px"><input type="checkbox" data-cfg="' + i + '" data-field="noRandomSpawn"' + (cfg.noRandomSpawn ? ' checked' : '') + '> Mission Only (no random spawn)</label>' +
          '<label style="font-size:12px;display:flex;align-items:center;gap:6px">Gap: <input class="track-input" type="number" min="-1" max="2" step="0.1" value="' + cfg.carriageGap + '" data-cfg="' + i + '" data-field="carriageGap" style="width:60px"></label>' +
        '</div>' +
        '<table><thead><tr>' +
          '<th>Type</th><th>Model</th><th>Count</th><th></th>' +
        '</tr></thead><tbody>' + editRows + '</tbody></table>' +
      '</div>';
    grid.appendChild(card);
  });

  // Expand buttons
  grid.querySelectorAll('.consist-expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      if (consistState.expanded.has(idx)) consistState.expanded.delete(idx);
      else consistState.expanded.add(idx);
      renderConsists();
    });
  });

  // Repeat count inputs
  grid.querySelectorAll('input[data-car]').forEach(inp => {
    inp.addEventListener('input', () => {
      const ci = +inp.dataset.cfg, cj = +inp.dataset.car;
      consistState.data[ci].carriages[cj].repeat = Math.max(1, +inp.value || 1);
      const stripEl = document.getElementById('strip-' + ci);
      if (stripEl) stripEl.innerHTML = consistState.data[ci].carriages.map(c => carChip(c.model, c.repeat)).join('');
      const totalEl = document.getElementById('total-' + ci);
      const t = totalCars(consistState.data[ci].carriages);
      if (totalEl) totalEl.textContent = t + ' car' + (t !== 1 ? 's' : '') + ' total';
      const card = grid.querySelector('.consist-card[data-idx="' + ci + '"]');
      if (card) card.classList.toggle('modified', consistModified(ci));
      updateConsistModCount();
    });
  });

  // Config-level toggles (noRandomSpawn, carriageGap)
  grid.querySelectorAll('input[data-field]').forEach(inp => {
    inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', () => {
      const ci = +inp.dataset.cfg, field = inp.dataset.field;
      consistState.data[ci][field] = inp.type === 'checkbox' ? inp.checked : parseFloat(inp.value);
      const card = grid.querySelector('.consist-card[data-idx="' + ci + '"]');
      if (card) {
        card.classList.toggle('modified', consistModified(ci));
        if (field === 'noRandomSpawn') {
          const badge = card.querySelector('.consist-badges span:first-child');
          if (badge) { badge.className = inp.checked ? 'badge-mission' : 'badge-world'; badge.textContent = inp.checked ? '🎞 Mission' : '🌍 World'; }
        }
        if (field === 'carriageGap') {
          const gb = card.querySelector('.badge-gap');
          if (gb) gb.textContent = 'gap ' + inp.value;
        }
      }
      updateConsistModCount();
    });
  });

  updateConsistModCount();
}

// ─── Consist: parse ───────────────────────────────────────────────────────────
function parseTrainsXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) return null;
  const configs = [...doc.querySelectorAll('train_config')].map(el => ({
    name: el.getAttribute('name'),
    noRandomSpawn: el.getAttribute('no_random_spawn') === 'true',
    carriageGap: parseFloat(el.getAttribute('carriage_gap')) || 0.1,
    populateTrainDist: parseFloat(el.getAttribute('populate_train_dist')) || 40,
    announceStations: el.getAttribute('announce_stations') === 'true',
    doorsBeep: el.getAttribute('doors_beep') === 'true',
    carriagesHang: el.getAttribute('carriages_hang') === 'true',
    carriagesSwing: el.getAttribute('carriages_swing') === 'true',
    linkTracks: el.getAttribute('link_tracks_with_adjacent_stations') !== 'false',
    carriages: [...el.querySelectorAll('carriage')].map(c => ({
      model: c.getAttribute('model_name'),
      maxPeds: parseInt(c.getAttribute('max_peds_per_carriage')) || 0,
      flipDir: c.getAttribute('flip_model_dir') === 'true',
      vertOffset: parseFloat(c.getAttribute('carriage_vert_offset')) || 0,
      repeat: parseInt(c.getAttribute('repeat_count')) || 1,
    }))
  }));
  const groups = {};
  doc.querySelectorAll('train_config_group').forEach(g => {
    groups[g.getAttribute('name')] = [...g.querySelectorAll('train_config_ref')].map(r => r.getAttribute('name'));
  });
  return configs.length ? { configs, groups: Object.keys(groups).length ? groups : null } : null;
}

// ─── Consist: export ──────────────────────────────────────────────────────────
function exportConfigsXml(configs, groups) {
  const b = v => v ? 'true' : 'false';
  const lines = ['<?xml version = "1.0" encoding = "UTF-8"?>', '', '<train_configs version = "1">'];
  configs.forEach(cfg => {
    lines.push('');
    lines.push('\t<train_config');
    lines.push('\t\tname = "' + cfg.name + '"');
    lines.push('\t\tpopulate_train_dist = "' + cfg.populateTrainDist.toFixed(1) + '"');
    lines.push('\t\tannounce_stations = "' + b(cfg.announceStations) + '"');
    lines.push('\t\tdoors_beep = "' + b(cfg.doorsBeep) + '"');
    lines.push('\t\tcarriages_hang = "' + b(cfg.carriagesHang) + '"');
    lines.push('\t\tcarriages_swing = "' + b(cfg.carriagesSwing) + '"');
    lines.push('\t\tlink_tracks_with_adjacent_stations = "' + b(cfg.linkTracks) + '"');
    if (cfg.noRandomSpawn) lines.push('\t\tno_random_spawn = "true"');
    lines.push('\t\tcarriage_gap = "' + cfg.carriageGap + '">');
    cfg.carriages.forEach(c => {
      lines.push('\t\t<carriage');
      lines.push('\t\t\t\tmodel_name = "' + c.model + '"');
      lines.push('\t\t\t\tmax_peds_per_carriage = "' + c.maxPeds + '"');
      lines.push('\t\t\t\tflip_model_dir = "' + b(c.flipDir) + '"');
      lines.push('\t\t\t\tdo_interior_lights = "true"');
      lines.push('\t\t\t\tcarriage_vert_offset = "' + c.vertOffset + '"');
      lines.push('\t\t\trepeat_count = "' + c.repeat + '" />');
    });
    lines.push('\t</train_config>');
  });
  lines.push('');
  Object.entries(groups).forEach(([gname, refs]) => {
    lines.push('\t<train_config_group name = "' + gname + '">');
    refs.forEach(r => lines.push('\t\t<train_config_ref name = "' + r + '" />'));
    lines.push('\t</train_config_group>');
  });
  lines.push('');
  lines.push('</train_configs>');
  return lines.join('\n');
}

// ─── Toast & download ─────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('trainsToast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'dispatch-toast show';
  setTimeout(() => { t.className = 'dispatch-toast'; }, 2500);
}

function dlXml(filename, content) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/xml' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function initTrainsApp() {
  trackState.vanilla = makeVanillaTracks();
  trackState.data    = makeVanillaTracks();
  consistState.vanilla = makeVanillaConfigs();
  consistState.data    = makeVanillaConfigs();
  consistState.groups  = JSON.parse(JSON.stringify(VANILLA_GROUPS));

  initTabs();
  renderTracks();
  renderConsists();

  // Track drop zone
  initDropZone('tracksDropZone', 'tracksFileInput', (file, dz) => {
    const reader = new FileReader();
    reader.onload = e => {
      const parsed = parseTracksXml(e.target.result);
      if (!parsed) { showToast('Could not parse traintracks.xml'); return; }
      trackState.data = parsed;
      renderTracks();
      setDropZoneLoaded(dz, file.name);
      showToast('Loaded ' + file.name);
    };
    reader.readAsText(file);
  });

  // Consists drop zone
  initDropZone('consistsDropZone', 'consistsFileInput', (file, dz) => {
    const reader = new FileReader();
    reader.onload = e => {
      const parsed = parseTrainsXml(e.target.result);
      if (!parsed) { showToast('Could not parse trains.xml'); return; }
      consistState.data = parsed.configs;
      if (parsed.groups) consistState.groups = parsed.groups;
      consistState.expanded.clear();
      renderConsists();
      setDropZoneLoaded(dz, file.name);
      showToast('Loaded ' + file.name);
    };
    reader.readAsText(file);
  });

  // Track export / reset
  document.getElementById('tracksExportBtn')?.addEventListener('click', () => {
    dlXml('traintracks.xml', exportTracksXml(trackState.data));
    showToast('Exported traintracks.xml');
  });
  document.getElementById('tracksResetBtn')?.addEventListener('click', () => {
    trackState.data = makeVanillaTracks();
    renderTracks();
    const dz = document.getElementById('tracksDropZone');
    if (dz) { dz.classList.remove('loaded'); const st = dz.querySelector('.trains-drop-state-text'); if (st) st.textContent = ''; }
    showToast('Reset to vanilla');
  });

  // Consist export / reset
  document.getElementById('consistsExportBtn')?.addEventListener('click', () => {
    dlXml('trains.xml', exportConfigsXml(consistState.data, consistState.groups || VANILLA_GROUPS));
    showToast('Exported trains.xml');
  });
  document.getElementById('consistsResetBtn')?.addEventListener('click', () => {
    consistState.data = makeVanillaConfigs();
    consistState.groups = JSON.parse(JSON.stringify(VANILLA_GROUPS));
    consistState.expanded.clear();
    renderConsists();
    const dz = document.getElementById('consistsDropZone');
    if (dz) { dz.classList.remove('loaded'); const st = dz.querySelector('.trains-drop-state-text'); if (st) st.textContent = ''; }
    showToast('Reset to vanilla');
  });
}

document.addEventListener('DOMContentLoaded', initTrainsApp);
