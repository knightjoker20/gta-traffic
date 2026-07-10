'use strict';
/* =====================================================
   dispatch-vehicle-picker.js
   Autocomplete for dispatch.meta vehicle model inputs.
   Pulls from the site's Vehicle Library (IndexedDB) +
   a baked-in list of vanilla GTA 5 vehicles.
   ===================================================== */

/* ─── Vanilla vehicles always available even with empty library ─── */
const VANILLA_DISPATCH_VEHICLES = [
  // Police cars
  { model: 'police',      label: 'Police Cruiser (LSPD)',        class: 'Law',       tag: 'police' },
  { model: 'police2',     label: 'Police Cruiser 2 (LSPD)',      class: 'Law',       tag: 'police' },
  { model: 'police3',     label: 'Police Cruiser 3 (LSPD)',      class: 'Law',       tag: 'police' },
  { model: 'police4',     label: 'Police Ranger (LSPD 4x4)',     class: 'Law',       tag: 'police' },
  { model: 'sheriff',     label: 'Sheriff Cruiser (LSSD)',        class: 'Law',       tag: 'sheriff' },
  { model: 'sheriff2',    label: 'Sheriff SUV (LSSD)',            class: 'Law',       tag: 'sheriff' },
  { model: 'policet',     label: 'Police Transporter (LSPD)',     class: 'Law',       tag: 'police' },
  // Motorcycles
  { model: 'policeb',     label: 'Police Bike (LSPD)',            class: 'Law',       tag: 'motorcycle' },
  // SWAT / FBI
  { model: 'fbi',         label: 'FBI Car',                       class: 'Law',       tag: 'swat' },
  { model: 'fbi2',        label: 'FBI Truck (SUV)',               class: 'Law',       tag: 'swat' },
  { model: 'riot',        label: 'Police Riot Van',               class: 'Law',       tag: 'swat' },
  // Helicopters
  { model: 'polmav',      label: 'Police Maverick (helicopter)',  class: 'Helicopter',tag: 'heli' },
  { model: 'annihilator', label: 'Annihilator (SWAT heli)',       class: 'Helicopter',tag: 'heli' },
  { model: 'buzzard2',    label: 'Buzzard Attack Chopper',        class: 'Helicopter',tag: 'heli' },
  // Boats
  { model: 'predator',    label: 'Police Predator (boat)',        class: 'Boat',      tag: 'boat' },
  // Emergency services
  { model: 'ambulance',   label: 'Ambulance (EMS)',               class: 'Emergency', tag: 'emergency' },
  { model: 'firetruk',    label: 'Fire Truck',                    class: 'Emergency', tag: 'emergency' },
  // Military
  { model: 'crusader',    label: 'Crusader (military Humvee)',    class: 'Military',  tag: 'military' },
  { model: 'mesa3',       label: 'Mesa (military off-road)',      class: 'Military',  tag: 'military' },
  { model: 'barracks',    label: 'Barracks (military truck)',     class: 'Military',  tag: 'military' },
  { model: 'barracks3',   label: 'Barracks Semi (military)',      class: 'Military',  tag: 'military' },
  { model: 'rhino',       label: 'Rhino Tank',                    class: 'Military',  tag: 'military' },
  { model: 'apc',         label: 'APC (armored personnel)',       class: 'Military',  tag: 'military' },
  { model: 'insurgent',   label: 'Insurgent (armored)',           class: 'Military',  tag: 'military' },
  // Gang / civilian (used in GANGS / ASSASSINS / BIKER sets)
  { model: 'cavalcade',   label: 'Cavalcade (gang SUV)',          class: 'SUV',       tag: 'gang' },
  { model: 'cavalcade2',  label: 'Cavalcade 2 (gang SUV)',        class: 'SUV',       tag: 'gang' },
  { model: 'cog55',       label: 'Cognoscenti 55 (assassins)',    class: 'Sedan',     tag: 'gang' },
  { model: 'cog552',      label: 'Cognoscenti 55 Armored',        class: 'Sedan',     tag: 'gang' },
  { model: 'gburrito2',   label: 'Gang Burrito (biker van)',      class: 'Van',       tag: 'gang' },
  { model: 'bagger',      label: 'Bagger (biker motorcycle)',     class: 'Motorcycle',tag: 'gang' },
];

/* ─── Class color tokens ─── */
const CLASS_COLORS = {
  'Law':       '#60a5fa',
  'Emergency': '#fb923c',
  'Military':  '#4ade80',
  'Helicopter':'#c4b5fd',
  'Boat':      '#38bdf8',
  'SUV':       '#94a3b8',
  'Sedan':     '#94a3b8',
  'Van':       '#94a3b8',
  'Motorcycle':'#94a3b8',
  'default':   '#64748b',
};

function classColor(cls) {
  return CLASS_COLORS[cls] || CLASS_COLORS.default;
}

/* ─── Library vehicle cache ─── */
let libraryVehicles = [];   // { model, label, class }
let libraryLoaded   = false;

async function loadLibrary() {
  if (libraryLoaded) return;
  try {
    const store = window.vehicleLibraryStore;
    if (!store) return;
    const all = await store.getVehicles();
    libraryVehicles = all
      .filter(v => v.modelName)
      .map(v => ({
        model: v.modelName,
        label: v.custom?.displayName || v.modelName,
        class: normalizeClass(v.vehiclesMeta?.vehicleClass || ''),
        pack:  v.custom?.sourcePack || v.custom?.rockstarDlc || '',
        fromLibrary: true
      }));
    libraryLoaded = true;
  } catch (_) {
    libraryLoaded = true; // don't retry on error
  }
}

function normalizeClass(raw) {
  if (!raw) return '';
  // Strip VC_ prefix and capitalise: VC_EMERGENCY → Emergency
  const s = raw.replace(/^VC_/, '').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ─── Search ─── */
function search(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results = [];
  const seen = new Set();

  // Library first (user's own vehicles)
  for (const v of libraryVehicles) {
    if (v.model.toLowerCase().includes(q) || v.label.toLowerCase().includes(q)) {
      if (!seen.has(v.model.toLowerCase())) {
        results.push({ ...v, source: 'library' });
        seen.add(v.model.toLowerCase());
      }
    }
    if (results.length >= 40) break;
  }

  // Then vanilla vehicles not already in results
  for (const v of VANILLA_DISPATCH_VEHICLES) {
    if (v.model.toLowerCase().includes(q) || v.label.toLowerCase().includes(q)) {
      if (!seen.has(v.model.toLowerCase())) {
        results.push({ ...v, source: 'vanilla' });
        seen.add(v.model.toLowerCase());
      }
    }
  }

  return results.slice(0, 50);
}

/* ─── Picker DOM ─── */
let activeDropdown = null;
let activeInput    = null;
let selectedIdx    = -1;

function createDropdown() {
  const el = document.createElement('div');
  el.className = 'dvp-dropdown';
  el.setAttribute('role', 'listbox');
  document.body.appendChild(el);
  return el;
}

function positionDropdown(dropdown, input) {
  const rect = input.getBoundingClientRect();
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;
  dropdown.style.top  = `${rect.bottom + scrollY + 4}px`;
  dropdown.style.left = `${rect.left + scrollX}px`;
  dropdown.style.width = `${Math.max(rect.width, 300)}px`;
}

function showDropdown(input, results) {
  closeDropdown();
  if (!results.length) return;

  activeInput   = input;
  selectedIdx   = -1;
  activeDropdown = createDropdown();

  positionDropdown(activeDropdown, input);

  // Group by source
  const libItems = results.filter(r => r.source === 'library');
  const vanItems = results.filter(r => r.source === 'vanilla');

  let html = '';
  if (libItems.length) {
    html += `<div class="dvp-section">Your Library <span class="dvp-section-count">${libItems.length}</span></div>`;
    html += libItems.map((r, i) => itemHtml(r, i)).join('');
  }
  if (vanItems.length) {
    const offset = libItems.length;
    html += `<div class="dvp-section">Vanilla GTA 5</div>`;
    html += vanItems.map((r, i) => itemHtml(r, i + offset)).join('');
  }

  activeDropdown.innerHTML = html;

  // Click handlers
  activeDropdown.querySelectorAll('.dvp-item').forEach(item => {
    item.addEventListener('mousedown', e => {
      e.preventDefault(); // prevent blur before click
      selectItem(item.dataset.model);
    });
  });
}

function itemHtml(v, i) {
  const cls   = v.class || '';
  const color = classColor(cls);
  const badge = cls ? `<span class="dvp-class" style="color:${color}">${cls}</span>` : '';
  const pack  = v.pack ? `<span class="dvp-pack">${v.pack}</span>` : '';
  const label = v.label !== v.model ? `<span class="dvp-label">${v.label}</span>` : '';

  return `
    <div class="dvp-item" data-model="${v.model}" data-idx="${i}" role="option">
      <span class="dvp-model">${v.model}</span>
      ${label}
      ${badge}
      ${pack}
    </div>`;
}

function closeDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }
  activeInput  = null;
  selectedIdx  = -1;
}

function selectItem(model) {
  if (!activeInput) return;

  // Multi-model support: replace only the last comma-segment
  const raw    = activeInput.value;
  const parts  = raw.split(',');
  parts[parts.length - 1] = model;
  activeInput.value = parts.map(s => s.trim()).join(', ');

  // Fire change event so dispatchapp.js updates state
  activeInput.dispatchEvent(new Event('change', { bubbles: true }));
  closeDropdown();
  activeInput.focus();
}

function highlightItem(idx) {
  if (!activeDropdown) return;
  const items = activeDropdown.querySelectorAll('.dvp-item');
  items.forEach(el => el.classList.remove('selected'));
  selectedIdx = Math.max(-1, Math.min(idx, items.length - 1));
  if (selectedIdx >= 0) {
    items[selectedIdx].classList.add('selected');
    items[selectedIdx].scrollIntoView({ block: 'nearest' });
  }
}

/* ─── Attach to an input ─── */
function attachPicker(input) {
  // Only for vehicle inputs (not peds or props)
  if (input.dataset.field !== 'vehicles') return;

  input.setAttribute('autocomplete', 'off');

  input.addEventListener('focus', () => {
    loadLibrary().then(() => {
      const q = getCurrentSegment(input.value);
      if (q.length >= 1) {
        showDropdown(input, search(q));
      }
    });
  });

  input.addEventListener('input', () => {
    const q = getCurrentSegment(input.value);
    if (q.length < 1) { closeDropdown(); return; }
    const results = search(q);
    if (results.length) showDropdown(input, results);
    else closeDropdown();
  });

  input.addEventListener('keydown', e => {
    if (!activeDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightItem(selectedIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightItem(selectedIdx - 1);
    } else if (e.key === 'Enter') {
      if (selectedIdx >= 0) {
        e.preventDefault();
        const item = activeDropdown.querySelectorAll('.dvp-item')[selectedIdx];
        if (item) selectItem(item.dataset.model);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  input.addEventListener('blur', () => {
    // Small delay so mousedown on dropdown item fires first
    setTimeout(closeDropdown, 150);
  });
}

/* Returns the segment currently being typed (after the last comma) */
function getCurrentSegment(value) {
  const parts = value.split(',');
  return (parts[parts.length - 1] || '').trim();
}

/* ─── Init: attach to all existing + future vehicle inputs ─── */
function initVehiclePicker() {
  // Reposition on scroll/resize
  window.addEventListener('scroll', () => {
    if (activeDropdown && activeInput) positionDropdown(activeDropdown, activeInput);
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (activeDropdown && activeInput) positionDropdown(activeDropdown, activeInput);
  }, { passive: true });

  // Close on outside click
  document.addEventListener('mousedown', e => {
    if (activeDropdown && !activeDropdown.contains(e.target) && e.target !== activeInput) {
      closeDropdown();
    }
  });

  // Attach to inputs already on the page
  function attachAll() {
    document.querySelectorAll('.dispatch-model-input[data-field="vehicles"]').forEach(attachPicker);
  }

  // Also observe DOM changes (renderVehicleSets rebuilds the grid)
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        node.querySelectorAll?.('.dispatch-model-input[data-field="vehicles"]').forEach(attachPicker);
        if (node.matches?.('.dispatch-model-input[data-field="vehicles"]')) attachPicker(node);
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Pre-load library in background
  loadLibrary();

  // Attach to any inputs already in DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachAll);
  } else {
    attachAll();
  }
}

initVehiclePicker();
