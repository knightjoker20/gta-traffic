// mod-catalog.js — GTA5-mods.com vehicle catalog

(function () {
  'use strict';

  const SHEET_CSV_URL =
    'https://docs.google.com/spreadsheets/d/1lcd0QRzt9kpl_LcmXPtPHUQ4i4cHUKi7AjIFbVbv8bs/gviz/tq?tqx=out:csv';

  const LS_KEY = 'gta-catalog-status-overrides';

  // ── CSV columns ──────────────────────────────────────
  const COL = {
    STATUS: 0, YEAR: 1, MAKE: 2, TYPE: 3, MODEL: 4, TRIM: 5,
    URL: 6, GROUP1: 7, GROUP2: 8, GROUP3: 9, AUTHOR: 10,
    DLC: 11, SPAWN: 12, NOTES: 13, DATE: 14
  };

  // ── VEHgroup config ──────────────────────────────────
  const VEH_MAP = {
    'VEH_POOR':               { label: 'POOR',     cls: 'mc-veh-poor'    },
    'VEH_MID':                { label: 'MID',      cls: 'mc-veh-mid'     },
    'VEH_RICH':               { label: 'RICH',     cls: 'mc-veh-rich'    },
    'VEH_RARE':               { label: 'RARE',     cls: 'mc-veh-rare'    },
    'VEH_SUPER':              { label: 'SUPER',    cls: 'mc-veh-super'   },
    'VEH_COUNTRYSIDE_ONROAD': { label: 'COUNTRY',  cls: 'mc-veh-country' },
    'VEH_COUNTRYSIDE_OFFROAD':{ label: 'OFFROAD',  cls: 'mc-veh-offroad' },
    'VEH_FREEWAY':            { label: 'FREEWAY',  cls: 'mc-veh-freeway' },
    'VEH_LARGE_CITY':         { label: 'CITY',     cls: 'mc-veh-city'    },
    'VEH_TAXI':               { label: 'TAXI',     cls: 'mc-veh-taxi'    },
    'VEH_COPCAR':             { label: 'COP',      cls: 'mc-veh-cop'     },
    'VEH_COPMIX':             { label: 'COPMIX',   cls: 'mc-veh-cop'     },
    'VEH_COPRURAL':           { label: 'RURAL',    cls: 'mc-veh-cop'     },
    'VEH_WORKERS':            { label: 'WORKERS',  cls: 'mc-veh-workers' },
    'VEH_UTILITY':            { label: 'UTILITY',  cls: 'mc-veh-utility' },
    'VEH_BOATS_FREEWAY':      { label: 'BOATS',    cls: 'mc-veh-boats'   },
    'VEH_PRISON':             { label: 'PRISON',   cls: 'mc-veh-prison'  },
  };

  // ── Tag styling ──────────────────────────────────────
  const TAG_CLASS = {
    'add-on':    'mc-tag-addon',
    'replace':   'mc-tag-replace',
    'els':       'mc-tag-els',
    'fivem':     'mc-tag-fivem',
    'legacy':    'mc-tag-legacy',
    'enhanced':  'mc-tag-enhanced',
    'extras':    'mc-tag-extras',
    'vehfuncs':  'mc-tag-vehfuncs',
    'vehfuncs v':'mc-tag-vehfuncs',
  };

  function tagClass(tag) {
    return TAG_CLASS[tag.toLowerCase()] || 'mc-tag-default';
  }

  // ── Tag parser ───────────────────────────────────────
  function parseTags(trim) {
    if (!trim) return [];
    const seen = new Set();
    const tags = [];
    const pipeParts = trim.split(/\s*\|\s*/);
    for (let part of pipeParts) {
      const colonIdx = part.lastIndexOf(': ');
      if (colonIdx >= 0) part = part.slice(colonIdx + 2);
      part.split(/\s*\/\s*/).forEach(raw => {
        const tag = raw.trim();
        if (tag && tag.length <= 24 && !seen.has(tag.toLowerCase())) {
          seen.add(tag.toLowerCase());
          tags.push(tag);
        }
      });
    }
    return tags;
  }

  // ── Status overrides (localStorage) ─────────────────
  function loadOverrides() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveOverride(key, status) {
    const overrides = loadOverrides();
    if (status) overrides[key] = status;
    else delete overrides[key];
    try { localStorage.setItem(LS_KEY, JSON.stringify(overrides)); } catch {}
  }

  // ── Custom tags (cloud) ──────────────────────────────
  // customTagMap: { [vehicleKey]: Set<string> }
  let customTagMap = {};
  let loggedIn = false;

  async function loadCustomTags() {
    try {
      const resp = await fetch('/api/catalog-tags');
      if (resp.status === 401) { loggedIn = false; return; }
      const data = await resp.json();
      if (data.ok) {
        loggedIn = true;
        customTagMap = {};
        for (const [k, tags] of Object.entries(data.tags || {})) {
          customTagMap[k] = new Set(tags);
        }
      }
    } catch { /* not logged in or network error — silent fail */ }
  }

  async function addCustomTag(vehicleKey, tag) {
    try {
      const resp = await fetch('/api/catalog-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleKey, tag })
      });
      const data = await resp.json();
      if (data.ok) {
        if (!customTagMap[vehicleKey]) customTagMap[vehicleKey] = new Set();
        customTagMap[vehicleKey].add(tag);
        return true;
      }
      if (resp.status === 401) showLoginNudge();
    } catch {}
    return false;
  }

  async function removeCustomTag(vehicleKey, tag) {
    try {
      const resp = await fetch('/api/catalog-tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleKey, tag })
      });
      const data = await resp.json();
      if (data.ok) {
        customTagMap[vehicleKey]?.delete(tag);
        return true;
      }
    } catch {}
    return false;
  }

  function getCustomTags(vehicleKey) {
    return customTagMap[vehicleKey] ? [...customTagMap[vehicleKey]] : [];
  }

  function showLoginNudge() {
    const existing = document.getElementById('mcLoginNudge');
    if (existing) return;
    const nudge = document.createElement('div');
    nudge.id = 'mcLoginNudge';
    nudge.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#060c1a;border:1px solid rgba(249,115,22,.4);color:#fb923c;padding:12px 16px;border-radius:10px;font-size:13px;z-index:9999;';
    nudge.innerHTML = '⚠ <a href="/login.html" style="color:#fdba74;text-decoration:underline">Log in</a> to save custom tags across devices.';
    document.body.appendChild(nudge);
    setTimeout(() => nudge.remove(), 5000);
  }

  // ── State ────────────────────────────────────────────
  let allRows = [];
  let filtered = [];
  let sortCol = 'year';
  let sortDir = 'asc';
  let activeStatus = 'all';
  let filters = { make:'', type:'', group:'', yearFrom:'', yearTo:'', search:'', tag:'' };

  // ── DOM refs ─────────────────────────────────────────
  const $ = id => document.getElementById(id);
  let tbody, resultCount, makeSelect, typeSelect, groupSelect,
      yearFrom, yearTo, searchInput, tagCloud;

  // ── Preview card ─────────────────────────────────────
  const previewCache = new Map();
  let previewTimer = null;
  let previewCard = null;
  let currentAnchor = null;

  // ── CSV parser ────────────────────────────────────────
  function parseCsv(text) {
    const rows = [];
    let i = 0;
    while (i < text.length) {
      const row = [];
      while (i < text.length && text[i] !== '\n') {
        if (text[i] === '"') {
          let val = ''; i++;
          while (i < text.length) {
            if (text[i] === '"' && text[i + 1] === '"') { val += '"'; i += 2; }
            else if (text[i] === '"') { i++; break; }
            else { val += text[i++]; }
          }
          row.push(val.trim());
          if (text[i] === ',') i++;
        } else {
          let val = '';
          while (i < text.length && text[i] !== ',' && text[i] !== '\n') val += text[i++];
          row.push(val.trim());
          if (text[i] === ',') i++;
        }
      }
      if (text[i] === '\n') i++;
      if (row.length > 1) rows.push(row);
    }
    return rows;
  }

  function rowToObj(r, overrides) {
    const trim   = (r[COL.TRIM]   || '').trim();
    const url    = (r[COL.URL]    || '').trim();
    const make   = (r[COL.MAKE]   || '').trim();
    const model  = (r[COL.MODEL]  || '').trim();
    const year   = parseInt(r[COL.YEAR]) || 0;
    const sheetStatus = (r[COL.STATUS] || '').trim();
    const key    = url || `${make}|${model}|${year}|${trim}`;
    const status = overrides[key] || sheetStatus;
    return {
      status, year, make, model, trim, url, key,
      type:   (r[COL.TYPE]   || '').trim(),
      g1:     (r[COL.GROUP1] || '').trim(),
      g2:     (r[COL.GROUP2] || '').trim(),
      g3:     (r[COL.GROUP3] || '').trim(),
      author: (r[COL.AUTHOR] || '').trim(),
      notes:  (r[COL.NOTES]  || '').trim(),
      tags:   parseTags(trim),
    };
  }

  // Merged auto + custom tags for a row
  function allTagsFor(v) {
    const custom = getCustomTags(v.key);
    const autoSet = new Set(v.tags.map(t => t.toLowerCase()));
    const extras = custom.filter(t => !autoSet.has(t.toLowerCase()));
    return { auto: v.tags, custom: extras };
  }

  // ── Filter + sort ─────────────────────────────────────
  function applyFilters() {
    const search = filters.search.toLowerCase();
    filtered = allRows.filter(v => {
      if (activeStatus === 'dl'   && v.status !== 'Downloaded') return false;
      if (activeStatus === 'want' && v.status !== 'Wanted')     return false;
      if (filters.make  && v.make.toLowerCase() !== filters.make.toLowerCase())  return false;
      if (filters.type  && v.type.toLowerCase() !== filters.type.toLowerCase())  return false;
      if (filters.group && ![v.g1, v.g2, v.g3].some(g => g === filters.group))  return false;
      if (filters.tag) {
        const { auto, custom } = allTagsFor(v);
        const all = [...auto, ...custom];
        if (!all.some(t => t.toLowerCase() === filters.tag.toLowerCase())) return false;
      }
      if (filters.yearFrom && v.year < parseInt(filters.yearFrom)) return false;
      if (filters.yearTo   && v.year > parseInt(filters.yearTo))   return false;
      if (search) {
        const { auto, custom } = allTagsFor(v);
        const haystack = `${v.make} ${v.model} ${v.trim} ${v.author} ${v.g1} ${v.g2} ${v.g3} ${[...auto,...custom].join(' ')}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      let va, vb;
      if      (sortCol === 'year')   { va = a.year;   vb = b.year; }
      else if (sortCol === 'make')   { va = a.make.toLowerCase(); vb = b.make.toLowerCase(); }
      else if (sortCol === 'model')  { va = a.model.toLowerCase(); vb = b.model.toLowerCase(); }
      else if (sortCol === 'type')   { va = a.type.toLowerCase(); vb = b.type.toLowerCase(); }
      else if (sortCol === 'status') { va = a.status; vb = b.status; }
      else { va = a.year; vb = b.year; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      if (sortCol !== 'year') return a.year - b.year;
      return 0;
    });

    renderTable();
    updateResultCount();
    updateTagCloud();
  }

  // ── Render ────────────────────────────────────────────
  function vehBadge(g) {
    if (!g) return '';
    const cfg = VEH_MAP[g] || { label: g.replace('VEH_',''), cls: 'mc-veh-default' };
    return `<span class="mc-veh ${cfg.cls}" title="${g}">${cfg.label}</span>`;
  }

  function typeClass(t) {
    switch ((t || '').toLowerCase()) {
      case 'car':       return 'mc-type-car';
      case 'truck':     return 'mc-type-truck';
      case 'suv':       return 'mc-type-suv';
      case 'emergency': return 'mc-type-emergency';
      case 'taxi':      return 'mc-type-taxi';
      default:          return 'mc-type-other';
    }
  }

  function statusSelectClass(s) {
    if (s === 'Downloaded') return 's-dl';
    if (s === 'Wanted')     return 's-want';
    return 's-none';
  }

  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderTagsCell(v) {
    const { auto, custom } = allTagsFor(v);
    const autoHtml = auto.map(t =>
      `<span class="mc-tag ${tagClass(t)}">${esc(t)}</span>`
    ).join('');
    const customHtml = custom.map(t =>
      `<span class="mc-tag mc-tag-custom" data-key="${esc(v.key)}" data-tag="${esc(t)}">
        ${esc(t)}<i class="mc-tag-remove" title="Remove tag">×</i>
       </span>`
    ).join('');
    const addBtn = `<button class="mc-tag-add-btn" data-key="${esc(v.key)}" title="Add custom tag">+ tag</button>`;
    return `<div class="mc-tags">${autoHtml}${customHtml}${addBtn}</div>`;
  }

  function renderTable() {
    if (!tbody) return;
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="mc-empty"><strong>No vehicles match</strong>Adjust the filters or search term.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(v => {
      const sClass = statusSelectClass(v.status);
      const statusCell = `
        <select class="mc-status-select ${sClass}" data-key="${esc(v.key)}" aria-label="Status">
          <option value=""           ${!v.status || (v.status !== 'Downloaded' && v.status !== 'Wanted') ? 'selected' : ''}>— None</option>
          <option value="Wanted"     ${v.status === 'Wanted'     ? 'selected' : ''}>⭐ Wanted</option>
          <option value="Downloaded" ${v.status === 'Downloaded' ? 'selected' : ''}>✓ Downloaded</option>
        </select>`;

      const groups = [v.g1, v.g2, v.g3].filter(Boolean);
      const groupHtml = groups.length
        ? `<div class="mc-groups">${groups.map(vehBadge).join('')}</div>`
        : '<span style="color:#374151">—</span>';

      const dlBtn = v.url
        ? `<a class="mc-dl-btn" href="${esc(v.url)}" target="_blank" rel="noopener"
              data-preview-url="${esc(v.url)}" data-author="${esc(v.author)}">↗ Mod</a>`
        : '—';

      return `<tr>
        <td>${statusCell}</td>
        <td class="mc-year">${v.year || '—'}</td>
        <td style="white-space:nowrap;font-weight:600;color:#e2e8f0">${esc(v.make)}</td>
        <td>
          <div class="mc-model">${esc(v.model)}</div>
          ${v.trim ? `<div class="mc-trim">${esc(v.trim)}</div>` : ''}
        </td>
        <td><span class="mc-type ${typeClass(v.type)}">${esc(v.type || '—')}</span></td>
        <td>${groupHtml}</td>
        <td>${renderTagsCell(v)}</td>
        <td class="mc-author">${esc(v.author) || '—'}</td>
        <td>${dlBtn}</td>
      </tr>`;
    }).join('');

    bindTableEvents();
  }

  function bindTableEvents() {
    // Status select
    tbody.querySelectorAll('.mc-status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const key = sel.dataset.key;
        const status = sel.value;
        const row = allRows.find(v => v.key === key);
        if (row) row.status = status;
        saveOverride(key, status);
        sel.className = `mc-status-select ${statusSelectClass(status)}`;
        updateResultCount();
        updateStatPills();
      });
    });

    // Custom tag remove
    tbody.querySelectorAll('.mc-tag-remove').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const chip = btn.closest('.mc-tag-custom');
        const key = chip.dataset.key;
        const tag = chip.dataset.tag;
        const ok = await removeCustomTag(key, tag);
        if (ok) { refreshRow(key); populateTagCloud(); }
      });
    });

    // Add tag button
    tbody.querySelectorAll('.mc-tag-add-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (btn.dataset.open) return;
        btn.dataset.open = '1';

        const wrap = document.createElement('span');
        wrap.className = 'mc-tag-input-wrap';
        const input = document.createElement('input');
        input.className = 'mc-tag-input';
        input.placeholder = 'tag name…';
        input.maxLength = 64;
        const confirmFn = async () => {
          const tag = input.value.trim();
          if (!tag) { cancelFn(); return; }
          const key = btn.dataset.key;
          const ok = await addCustomTag(key, tag);
          if (ok) { refreshRow(key); populateTagCloud(); }
          else cancelFn();
        };
        const cancelFn = () => { wrap.remove(); btn.style.display = ''; delete btn.dataset.open; };

        input.addEventListener('keydown', e => {
          if (e.key === 'Enter')  { e.preventDefault(); confirmFn(); }
          if (e.key === 'Escape') { cancelFn(); }
        });
        input.addEventListener('blur', () => setTimeout(cancelFn, 150));

        wrap.appendChild(input);
        btn.style.display = 'none';
        btn.parentNode.insertBefore(wrap, btn.nextSibling);
        input.focus();
      });
    });

    // Preview hover
    tbody.querySelectorAll('.mc-dl-btn[data-preview-url]').forEach(a => {
      a.addEventListener('mouseenter', onPreviewEnter);
      a.addEventListener('mouseleave', onPreviewLeave);
    });
  }

  // Re-render just the tags cell for a specific vehicle key
  function refreshRow(key) {
    const v = allRows.find(r => r.key === key);
    if (!v) return;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(tr => {
      const sel = tr.querySelector(`.mc-status-select[data-key="${CSS.escape(key)}"]`);
      if (!sel) return;
      const tagsTd = tr.querySelectorAll('td')[6]; // Tags column index
      if (tagsTd) tagsTd.innerHTML = renderTagsCell(v);
      // Re-bind events for that cell
      tagsTd?.querySelectorAll('.mc-tag-remove').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          const chip = btn.closest('.mc-tag-custom');
          const ok = await removeCustomTag(chip.dataset.key, chip.dataset.tag);
          if (ok) { refreshRow(chip.dataset.key); populateTagCloud(); }
        });
      });
      tagsTd?.querySelectorAll('.mc-tag-add-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (btn.dataset.open) return;
          btn.dataset.open = '1';
          const wrap = document.createElement('span');
          wrap.className = 'mc-tag-input-wrap';
          const input = document.createElement('input');
          input.className = 'mc-tag-input';
          input.placeholder = 'tag name…';
          input.maxLength = 64;
          const confirmFn = async () => {
            const tag = input.value.trim();
            if (!tag) { cancelFn(); return; }
            const ok = await addCustomTag(btn.dataset.key, tag);
            if (ok) { refreshRow(btn.dataset.key); populateTagCloud(); }
            else cancelFn();
          };
          const cancelFn = () => { wrap.remove(); btn.style.display = ''; delete btn.dataset.open; };
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter')  { e.preventDefault(); confirmFn(); }
            if (e.key === 'Escape') { cancelFn(); }
          });
          input.addEventListener('blur', () => setTimeout(cancelFn, 150));
          wrap.appendChild(input);
          btn.style.display = 'none';
          btn.parentNode.insertBefore(wrap, btn.nextSibling);
          input.focus();
        });
      });
    });
  }

  // ── Result count + stat pills ─────────────────────────
  function updateResultCount() {
    if (!resultCount) return;
    const dl   = filtered.filter(v => v.status === 'Downloaded').length;
    const want = filtered.filter(v => v.status === 'Wanted').length;
    resultCount.innerHTML = `<strong>${filtered.length}</strong> of ${allRows.length} vehicles
      &nbsp;·&nbsp; <span style="color:#4ade80">${dl} downloaded</span>
      &nbsp;·&nbsp; <span style="color:#fb923c">${want} wanted</span>`;
  }

  function updateStatPills() {
    const dl   = allRows.filter(v => v.status === 'Downloaded').length;
    const want = allRows.filter(v => v.status === 'Wanted').length;
    const sdl  = $('mcStatDl'), swant = $('mcStatWant');
    if (sdl)   sdl.querySelector('strong').textContent   = dl;
    if (swant) swant.querySelector('strong').textContent = want;
  }

  // ── Tag cloud ─────────────────────────────────────────
  function populateTagCloud() {
    const freq = new Map();
    const labelMap = new Map();

    allRows.forEach(v => {
      const { auto, custom } = allTagsFor(v);
      [...auto, ...custom].forEach(t => {
        const k = t.toLowerCase();
        freq.set(k, (freq.get(k) || 0) + 1);
        if (!labelMap.has(k)) labelMap.set(k, t);
      });
    });

    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);

    tagCloud.innerHTML = sorted.map(([key, count]) => {
      const label = labelMap.get(key) || key;
      const cls   = TAG_CLASS[key] ? tagClass(label) : (customTagMap && Object.values(customTagMap).some(s => s.has(label)) ? 'mc-tag-custom' : 'mc-tag-default');
      return `<span class="mc-tag ${cls}" data-tag="${esc(label)}" title="${count} vehicles">${esc(label)}</span>`;
    }).join('');

    tagCloud.querySelectorAll('.mc-tag').forEach(chip => {
      chip.addEventListener('click', () => {
        const clicked = chip.dataset.tag;
        if (filters.tag === clicked) {
          filters.tag = '';
          tagCloud.querySelectorAll('.mc-tag').forEach(c => c.classList.remove('active'));
        } else {
          filters.tag = clicked;
          tagCloud.querySelectorAll('.mc-tag').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
        }
        applyFilters();
      });
    });

    updateTagCloud();
  }

  function updateTagCloud() {
    if (!tagCloud) return;
    tagCloud.querySelectorAll('.mc-tag').forEach(c => {
      c.classList.toggle('active', c.dataset.tag === filters.tag);
    });
  }

  // ── Sort headers ──────────────────────────────────────
  function initSortHeaders() {
    document.querySelectorAll('.mc-table thead th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortCol = col; sortDir = 'asc'; }
        document.querySelectorAll('.mc-table thead th').forEach(h => h.classList.remove('sorted-asc','sorted-desc'));
        th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
        applyFilters();
      });
    });
    const initTh = document.querySelector(`.mc-table thead th[data-sort="${sortCol}"]`);
    if (initTh) initTh.classList.add('sorted-asc');
  }

  // ── Dropdowns ─────────────────────────────────────────
  function populateFilters() {
    const makes  = [...new Set(allRows.map(v => v.make).filter(Boolean))].sort();
    const types  = [...new Set(allRows.map(v => v.type).filter(Boolean))].sort();
    const groups = [...new Set(allRows.flatMap(v => [v.g1, v.g2, v.g3]).filter(Boolean))].sort();

    makeSelect.innerHTML  = `<option value="">All makes</option>` +
      makes.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
    typeSelect.innerHTML  = `<option value="">All types</option>` +
      types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    groupSelect.innerHTML = `<option value="">Any group</option>` +
      groups.map(g => {
        const cfg = VEH_MAP[g] || { label: g };
        return `<option value="${esc(g)}">${cfg.label} (${g})</option>`;
      }).join('');

    updateStatPills();
    populateTagCloud();
  }

  // ── Filter bindings ───────────────────────────────────
  function bindFilters() {
    makeSelect.addEventListener('change',  () => { filters.make  = makeSelect.value;  applyFilters(); });
    typeSelect.addEventListener('change',  () => { filters.type  = typeSelect.value;  applyFilters(); });
    groupSelect.addEventListener('change', () => { filters.group = groupSelect.value; applyFilters(); });
    yearFrom.addEventListener('change',    () => { filters.yearFrom = yearFrom.value; applyFilters(); });
    yearTo.addEventListener('change',      () => { filters.yearTo   = yearTo.value;   applyFilters(); });

    let searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { filters.search = searchInput.value; applyFilters(); }, 250);
    });

    document.querySelectorAll('.mc-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mc-status-btn').forEach(b => b.className = 'mc-status-btn');
        activeStatus = btn.dataset.status;
        btn.classList.add(`active-${activeStatus}`);
        applyFilters();
      });
    });

    $('mcClearBtn')?.addEventListener('click', () => {
      filters = { make:'', type:'', group:'', yearFrom:'', yearTo:'', search:'', tag:'' };
      activeStatus = 'all';
      makeSelect.value = ''; typeSelect.value = ''; groupSelect.value = '';
      yearFrom.value = ''; yearTo.value = ''; searchInput.value = '';
      document.querySelectorAll('.mc-status-btn').forEach(b => b.className = 'mc-status-btn');
      $('mcBtnAll')?.classList.add('active-all');
      tagCloud?.querySelectorAll('.mc-tag').forEach(c => c.classList.remove('active'));
      applyFilters();
    });
  }

  // ── Preview card ──────────────────────────────────────
  function createPreviewCard() {
    previewCard = document.createElement('div');
    previewCard.className = 'mc-preview-card';
    document.body.appendChild(previewCard);
  }

  function positionCard(anchor) {
    const r = anchor.getBoundingClientRect();
    const cardW = 300, cardH = 240;
    const above = (window.innerHeight - r.bottom) < cardH + 12;
    previewCard.classList.toggle('above', above);
    let left = r.left;
    if (left + cardW > window.innerWidth - 12) left = window.innerWidth - cardW - 12;
    if (left < 8) left = 8;
    previewCard.style.left = left + 'px';
    previewCard.style.top  = (above ? r.top - cardH - 10 : r.bottom + 8) + 'px';
  }

  function showPreviewFor(anchor) {
    const url    = anchor.dataset.previewUrl;
    const author = anchor.dataset.author;
    positionCard(anchor);
    previewCard.classList.add('visible');
    if (previewCache.has(url)) { renderPreview(previewCache.get(url), author); return; }
    previewCard.innerHTML = `<div class="mc-preview-loading">Loading preview</div>`;
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => { previewCache.set(url, data); if (currentAnchor === anchor) renderPreview(data, author); })
      .catch(() => {
        if (currentAnchor === anchor)
          previewCard.innerHTML = `<div class="mc-preview-img-placeholder">🚗</div>
            <div class="mc-preview-body"><div class="mc-preview-source">GTA5-MODS.COM</div>
            <div class="mc-preview-title" style="color:#64748b">Preview unavailable</div></div>`;
      });
  }

  function renderPreview(data, author) {
    if (!previewCard) return;
    const imgHtml = data.image
      ? `<img class="mc-preview-img" src="${esc(data.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="mc-preview-img-placeholder">🚗</div>`;
    previewCard.innerHTML = `${imgHtml}
      <div class="mc-preview-body">
        <div class="mc-preview-source">GTA5-MODS.COM${author ? ' · ' + esc(author) : ''}</div>
        <div class="mc-preview-title">${esc(data.title || 'Vehicle Mod')}</div>
        ${data.description ? `<div class="mc-preview-desc">${esc(data.description)}</div>` : ''}
      </div>`;
  }

  function onPreviewEnter(e) {
    clearTimeout(previewTimer);
    currentAnchor = e.currentTarget;
    previewTimer = setTimeout(() => showPreviewFor(currentAnchor), 380);
  }
  function onPreviewLeave() {
    clearTimeout(previewTimer);
    currentAnchor = null;
    if (previewCard) previewCard.classList.remove('visible');
  }

  // ── Boot ──────────────────────────────────────────────
  async function init() {
    tbody       = $('mcTbody');
    resultCount = $('mcResultCount');
    makeSelect  = $('mcMakeFilter');
    typeSelect  = $('mcTypeFilter');
    groupSelect = $('mcGroupFilter');
    yearFrom    = $('mcYearFrom');
    yearTo      = $('mcYearTo');
    searchInput = $('mcSearch');
    tagCloud    = $('mcTagCloud');

    createPreviewCard();
    tbody.innerHTML = `<tr><td colspan="9" class="mc-loading">Loading vehicle catalog</td></tr>`;

    // Load sheet data and custom tags in parallel
    const [csvResp] = await Promise.allSettled([
      fetch(SHEET_CSV_URL),
      loadCustomTags()
    ]);

    try {
      if (csvResp.status === 'rejected') throw new Error('Network error');
      const resp = csvResp.value;
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const rows = parseCsv(text);
      const overrides = loadOverrides();

      allRows = rows.slice(1)
        .map(r => rowToObj(r, overrides))
        .filter(v => v.make && v.model);

      populateFilters();
      bindFilters();
      initSortHeaders();
      $('mcBtnAll')?.classList.add('active-all');
      applyFilters();

    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="9" class="mc-empty">
        <strong>Could not load catalog</strong>
        ${esc(e.message)} — make sure the Google Sheet is publicly shared.
      </td></tr>`;
      console.error('Catalog load failed:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
