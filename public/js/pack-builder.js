// =====================================================
// pack-builder.js
// Premium OIV Pack Builder — project setup, vehicle
// management, meta file upload and validation.
// =====================================================

(function () {
  "use strict";

  // ── State ──────────────────────────────────────────
  let currentUser   = null;
  let packs         = [];
  let activePack    = null;
  let packVehicles  = [];
  let activeMetaVehicleId = null;
  let metaStatusCache     = {};   // vehicleId → { vehicles, handling, carcols, carvariations }
  const vehicleImageCache = {};   // vehicleId → dataUrl | null (null = use static fallback)
  let modalSelected       = new Set();
  // Per-modal-session parsed files: { vehicles, handling, carcols, carvariations }
  // Each entry: { xml: string, kitName?: string, warnings: string[] }
  let parsedMeta     = {};
  // Carcols queued waiting for carvariations kit name — module-level so it persists
  // across multiple separate drag-and-drop events within the same modal session.
  let pendingCarcols = null;

  const META_TYPES = ["vehicles", "handling", "carcols", "carvariations"];

  // ── DOM refs ───────────────────────────────────────
  const $ = id => document.getElementById(id);

  const el = {
    authGate:        $("pbAuthGate"),
    main:            $("pbMain"),
    packList:        $("pbPackList"),
    editor:          $("pbEditor"),
    newPackPanel:    $("pbNewPackPanel"),
    packName:        $("pbPackName"),
    dlcTag:          $("pbDlcTag"),
    statusBadge:     $("pbStatusBadge"),
    vehicleCount:    $("pbVehicleCount"),
    vehicleList:     $("pbVehicleList"),
    exportBtn:       $("pbExportBtn"),
    validateBtn:     $("pbValidateBtn"),
    exportStatus:    $("pbExportStatus"),
    exportReadiness: $("pbExportReadiness"),

    // New pack form
    createForm:      $("pbCreateForm"),
    createName:      $("pbCreateName"),
    createDlcName:   $("pbCreateDlcName"),
    createVersion:   $("pbCreateVersion"),
    createAuthor:    $("pbCreateAuthor"),
    createDesc:      $("pbCreateDescription"),
    createStatus:    $("pbCreateStatus"),
    dlcPreview:      $("pbDlcPreview"),

    // Edit meta form
    metaForm:        $("pbMetaForm"),
    fieldName:       $("pbFieldName"),
    fieldDlcName:    $("pbFieldDlcName"),
    fieldVersion:    $("pbFieldVersion"),
    fieldAuthor:     $("pbFieldAuthor"),
    fieldDesc:       $("pbFieldDescription"),

    // Add vehicle modal
    addModal:        $("pbAddVehicleModal"),
    vehicleSearch:   $("pbVehicleSearch"),
    searchResults:   $("pbVehicleSearchResults"),
    modalSelCount:   $("pbModalSelCount"),
    modalAddBtn:     $("pbModalAddBtn"),

    // Meta upload modal
    metaModal:        $("pbMetaModal"),
    metaVehicleName:  $("pbMetaVehicleName"),
    metaHowName:      $("pbMetaHowName"),
    metaDropZone:     $("pbMetaDropZone"),
    metaFileInput:    $("pbMetaFileInput"),
    metaBrowseBtn:    $("pbMetaBrowseBtn"),
    metaTypeGrid:     $("pbMetaTypeGrid"),
    metaParseErrors:  $("pbMetaParseErrors"),
    metaUploadStatus: $("pbMetaUploadStatus"),
    metaReadyCount:   $("pbMetaReadyCount"),
    uploadMetaBtn:    $("pbUploadMetaBtn"),
    loadFromLibraryBtn: $("pbLoadFromLibraryBtn"),
  };

  // ── Init ───────────────────────────────────────────
  async function init() {
    await checkAuth();
    bindEvents();
  }

  async function checkAuth() {
    try {
      const res  = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (!data.ok || !data.user) { showAuthGate(); return; }

      const plan = data.user.plan || "free";
      const role = data.user.role || "free_user";
      const isPremium = ["premium", "admin"].includes(plan) ||
                        ["admin", "owner", "moderator"].includes(role);
      if (!isPremium) { showAuthGate("premium"); return; }

      currentUser = data.user;
      el.authGate.hidden = true;
      el.main.hidden     = false;
      await loadPacks();
    } catch {
      showAuthGate();
    }
  }

  function showAuthGate(reason) {
    el.authGate.hidden = false;
    el.main.hidden     = true;
    if (reason === "premium") {
      el.authGate.querySelector("p").textContent =
        "The Pack Builder is a premium feature. Upgrade your account to access it.";
    }
  }

  // ── Events ─────────────────────────────────────────
  function bindEvents() {
    $("pbNewPackBtn").addEventListener("click", showNewPackPanel);
    $("pbCancelCreateBtn").addEventListener("click", hideNewPackPanel);
    el.createForm.addEventListener("submit", onCreatePack);

    // Auto-slug DLC name from pack name (stops if user manually edits the DLC field)
    el.createName.addEventListener("input", () => {
      if (el.createDlcName.dataset.manual) return;
      const slug = slugify(el.createName.value);
      el.createDlcName.value = slug;
      el.dlcPreview.textContent = slug || "mytrafficpack";
    });
    el.createDlcName.addEventListener("input", () => {
      const cleaned = el.createDlcName.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
      el.createDlcName.value = cleaned;
      el.dlcPreview.textContent = cleaned || "mytrafficpack";
      el.createDlcName.dataset.manual = "1"; // user has customized — stop auto-generating
    });

    $("pbEditMetaBtn").addEventListener("click",   showMetaForm);
    $("pbCancelMetaBtn").addEventListener("click", hideMetaForm);
    $("pbSaveMetaBtn").closest("form").addEventListener("submit", onSaveMeta);
    $("pbDeletePackBtn").addEventListener("click", onDeletePack);

    $("pbAddVehicleBtn").addEventListener("click", openAddModal);
    $("pbModalClose").addEventListener("click",    closeAddModal);
    $("pbModalAddBtn").addEventListener("click",   onAddSelectedVehicles);
    el.vehicleSearch.addEventListener("input",     debounce(onSearchVehicles, 280));

    $("pbMetaModalClose").addEventListener("click", closeMetaModal);
    el.uploadMetaBtn.addEventListener("click", uploadAllParsedMeta);
    el.loadFromLibraryBtn.addEventListener("click", onLoadFromLibrary);

    // Meta file drop zone
    el.metaBrowseBtn.addEventListener("click", () => el.metaFileInput.click());
    el.metaFileInput.addEventListener("change", () => {
      const files = el.metaFileInput.files;
      el.metaFileInput.value = "";
      eagerReadFiles(files).then(snaps => handleMetaSnapshots(snaps));
    });
    el.metaDropZone.addEventListener("dragover",  e => { e.preventDefault(); el.metaDropZone.classList.add("drag-over"); });
    el.metaDropZone.addEventListener("dragleave", () => el.metaDropZone.classList.remove("drag-over"));
    el.metaDropZone.addEventListener("drop", e => {
      e.preventDefault();
      el.metaDropZone.classList.remove("drag-over");
      // Eagerly snapshot all file contents synchronously inside the drop event
      // before the drag session ends and external-app file handles become stale
      eagerReadFiles(e.dataTransfer.files).then(snaps => handleMetaSnapshots(snaps));
    });

    el.validateBtn.addEventListener("click", onValidatePack);
    el.exportBtn.addEventListener("click",   onExportOiv);

    // Close modals on backdrop click
    el.addModal.addEventListener("click",  e => { if (e.target === el.addModal)  closeAddModal(); });
    el.metaModal.addEventListener("click", e => { if (e.target === el.metaModal) closeMetaModal(); });
  }

  // ── Packs ──────────────────────────────────────────
  async function loadPacks() {
    try {
      const res  = await fetch("/api/builder/packs", { credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      packs = data.packs || [];
      renderPackList();
    } catch (e) {
      el.packList.innerHTML = `<div class="pb-error">Failed to load packs: ${e.message}</div>`;
    }
  }

  function renderPackList() {
    if (!packs.length) {
      el.packList.innerHTML = `<div class="pb-empty-state">No packs yet. Create one to get started.</div>`;
      return;
    }
    el.packList.innerHTML = packs.map(p => `
      <div class="pb-pack-item ${activePack?.id === p.id ? "active" : ""}"
           data-pack-id="${p.id}" role="button" tabindex="0">
        <div class="pb-pack-item-name">${escHtml(p.name)}</div>
        <div class="pb-pack-item-meta">
          <span class="pb-dlc-tag-sm">${escHtml(p.dlc_name)}</span>
          <span class="pb-status-dot pb-status-dot--${p.status}">${p.status}</span>
          <span class="pb-pack-item-count">${p.vehicle_count || 0} vehicles</span>
        </div>
      </div>
    `).join("");

    el.packList.querySelectorAll(".pb-pack-item").forEach(item => {
      item.addEventListener("click", () => selectPack(item.dataset.packId));
      item.addEventListener("keydown", e => { if (e.key === "Enter") selectPack(item.dataset.packId); });
    });
  }

  async function selectPack(packId) {
    try {
      const res  = await fetch(`/api/builder/packs/${packId}`, { credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      activePack   = data.pack;
      packVehicles = data.vehicles || [];
      hideNewPackPanel();
      renderEditor();
      // Pre-load meta status for all vehicles
      await refreshAllMetaStatus();
      // Async image preload — re-render list if any user-uploaded photos found
      preloadImages(packVehicles.map(v => v.vehicle_id)).then(() => {
        if (packVehicles.some(v => vehicleImageCache[v.vehicle_id])) renderVehicleList();
      });
    } catch (e) {
      alert("Could not load pack: " + e.message);
    }
  }

  function renderEditor() {
    el.editor.hidden = false;
    el.packName.textContent   = activePack.name;
    el.dlcTag.textContent     = `dlcpacks:/${activePack.dlc_name}/`;
    el.statusBadge.textContent  = activePack.status;
    el.statusBadge.className    = `pb-status-badge pb-status-badge--${activePack.status}`;
    el.fieldName.value          = activePack.name;
    el.fieldDlcName.value       = activePack.dlc_name;
    el.fieldVersion.value       = activePack.version || "1.0";
    el.fieldAuthor.value        = activePack.author_name || "";
    el.fieldDesc.value          = activePack.description || "";
    renderVehicleList();
    updateExportReadiness();
    renderPackList(); // refresh sidebar selection
  }

  // ── New Pack ───────────────────────────────────────
  function showNewPackPanel() {
    el.newPackPanel.hidden = false;
    el.editor.hidden       = true;
    // Reset create form
    el.createForm.reset();
    delete el.createDlcName.dataset.manual;
    el.dlcPreview.textContent = "mytrafficpack";
    el.createName.focus();
  }

  function hideNewPackPanel() {
    el.newPackPanel.hidden = true;
    if (activePack) el.editor.hidden = false;
  }

  async function onCreatePack(e) {
    e.preventDefault();
    const name    = el.createName.value.trim();
    const dlcName = el.createDlcName.value.trim();
    if (!name || !dlcName) return;

    el.createStatus.textContent = "Creating…";
    el.createStatus.className   = "pb-form-status";

    try {
      const res  = await fetch("/api/builder/packs", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, dlc_name: dlcName,
          version:     el.createVersion.value.trim() || "1.0",
          author_name: el.createAuthor.value.trim()  || null,
          description: el.createDesc.value.trim()    || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      el.createForm.reset();
      el.createStatus.textContent = "";
      packs.unshift({ ...data.pack, vehicle_count: 0 });
      renderPackList();
      await selectPack(data.pack.id);
      hideNewPackPanel();
    } catch (e) {
      el.createStatus.textContent = "Error: " + e.message;
      el.createStatus.className   = "pb-form-status pb-form-status--error";
    }
  }

  // ── Edit Pack Meta ─────────────────────────────────
  function showMetaForm() { el.metaForm.hidden = false; }
  function hideMetaForm()  { el.metaForm.hidden = true; }

  async function onSaveMeta(e) {
    e.preventDefault();
    const name = el.fieldName.value.trim();
    if (!name) return;
    try {
      const res  = await fetch(`/api/builder/packs/${activePack.id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          version:     el.fieldVersion.value.trim(),
          author_name: el.fieldAuthor.value.trim()  || null,
          description: el.fieldDesc.value.trim()    || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      activePack = data.pack;
      const packIdx = packs.findIndex(p => p.id === activePack.id);
      if (packIdx >= 0) packs[packIdx] = { ...packs[packIdx], ...data.pack };
      hideMetaForm();
      renderEditor();
    } catch (e) {
      alert("Save failed: " + e.message);
    }
  }

  async function onDeletePack() {
    if (!activePack) return;
    if (!confirm(`Delete pack "${activePack.name}"? This cannot be undone.`)) return;
    try {
      const res  = await fetch(`/api/builder/packs/${activePack.id}`, {
        method: "DELETE", credentials: "include"
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      packs = packs.filter(p => p.id !== activePack.id);
      activePack   = null;
      packVehicles = [];
      el.editor.hidden = true;
      renderPackList();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  }

  // ── Vehicle thumbnails ─────────────────────────────
  // Looks up images from local IndexedDB; caches results so renders stay sync.
  async function preloadImages(vids) {
    const store = window.vehicleLibraryStore;
    if (!store) return;
    const toLoad = vids.filter(id => id && !(id in vehicleImageCache));
    if (!toLoad.length) return;
    await Promise.all(toLoad.map(async id => {
      try {
        const v = await store.getVehicle(id);
        vehicleImageCache[id] = v?.custom?.imageDataUrl || null;
      } catch { vehicleImageCache[id] = null; }
    }));
  }

  // Returns img HTML with a .jpg → .png → .webp → initials fallback chain.
  // If the user has uploaded a photo in Vehicle Library it shows that instead.
  function thumbHtml(vid, wrapClass) {
    const url  = vehicleImageCache[vid] || null;
    const init = (vid || '??').slice(0, 2).toUpperCase();
    const src  = url || `images/${encodeURIComponent(vid)}.jpg`;
    const err  = url ? '' : ' onerror="pbThumbErr(this)"';
    return `<div class="${wrapClass || 'pb-vehicle-thumb'}">` +
      `<img class="pb-thumb-img" src="${escHtml(src)}"` +
      ` data-pb-thumb="${escHtml(vid)}" data-pb-init="${escHtml(init)}" alt="${escHtml(vid)}"${err}>` +
      `</div>`;
  }

  window.pbThumbErr = function(img) {
    const vid  = img.dataset.pbThumb || '';
    const init = img.dataset.pbInit  || (vid.slice(0, 2).toUpperCase());
    if (img.src.includes('.jpg'))  { img.src = `images/${encodeURIComponent(vid)}.png`;  return; }
    if (img.src.includes('.png'))  { img.src = `images/${encodeURIComponent(vid)}.webp`; return; }
    const ph = document.createElement('div');
    ph.className   = 'pb-thumb-placeholder';
    ph.textContent = init;
    img.replaceWith(ph);
  };

  // ── Vehicle List ───────────────────────────────────
  function renderVehicleList() {
    el.vehicleCount.textContent = packVehicles.length;

    if (!packVehicles.length) {
      el.vehicleList.innerHTML = `<div class="pb-empty-state">No vehicles yet. Add from your library.</div>`;
      return;
    }

    el.vehicleList.innerHTML = packVehicles.map(v => {
      const meta   = metaStatusCache[v.vehicle_id] || {};
      const types  = (v.meta_types || "").split(",").filter(Boolean);
      const allMeta = META_TYPES.every(t => types.includes(t));
      const allModels = v.has_yft && v.has_ytd;
      const ready = allMeta && allModels;

      return `
        <div class="pb-vehicle-row ${ready ? "pb-vehicle-row--ready" : ""}" data-vid="${escHtml(v.vehicle_id)}">
          ${thumbHtml(v.vehicle_id)}
          <div class="pb-vehicle-row-main">
            <span class="pb-vehicle-model">${escHtml(v.vehicle_id)}</span>
            ${v.display_name ? `<span class="pb-vehicle-display">${escHtml(v.display_name)}</span>` : ""}
            ${v.category     ? `<span class="pb-vehicle-class">${escHtml(v.category)}</span>`     : ""}
          </div>
          <div class="pb-vehicle-row-status">
            ${META_TYPES.map(t => {
              const has = types.includes(t);
              const warn = meta[t]?.warnings?.length > 0;
              return `<span class="pb-meta-pip pb-meta-pip--${has ? (warn ? "warn" : "ok") : "miss"}"
                           title="${t}.meta: ${has ? (warn ? "uploaded (warnings)" : "ok") : "not uploaded"}">${t[0].toUpperCase()}</span>`;
            }).join("")}
            <span class="pb-model-pip pb-model-pip--${v.has_yft ? "ok" : "miss"}" title=".yft ${v.has_yft ? "ready" : "missing"}">YFT</span>
            <span class="pb-model-pip pb-model-pip--${v.has_ytd ? "ok" : "miss"}" title=".ytd ${v.has_ytd ? "ready" : "missing"}">YTD</span>
          </div>
          <div class="pb-vehicle-row-actions">
            <button class="secondary pb-meta-upload-btn" data-vid="${escHtml(v.vehicle_id)}" type="button">Meta Files</button>
            <button class="danger pb-remove-btn" data-vid="${escHtml(v.vehicle_id)}" type="button">✕</button>
          </div>
        </div>
      `;
    }).join("");

    el.vehicleList.querySelectorAll(".pb-meta-upload-btn").forEach(btn => {
      btn.addEventListener("click", () => openMetaModal(btn.dataset.vid));
    });
    el.vehicleList.querySelectorAll(".pb-remove-btn").forEach(btn => {
      btn.addEventListener("click", () => removeVehicle(btn.dataset.vid));
    });
  }

  async function removeVehicle(vehicleId) {
    if (!confirm(`Remove ${vehicleId} from this pack?`)) return;
    try {
      const res  = await fetch(`/api/builder/packs/${activePack.id}/vehicles/${vehicleId}`, {
        method: "DELETE", credentials: "include"
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      packVehicles = packVehicles.filter(v => v.vehicle_id !== vehicleId);
      renderVehicleList();
      updateExportReadiness();
    } catch (e) {
      alert("Remove failed: " + e.message);
    }
  }

  // ── Add Vehicle Modal ──────────────────────────────
  function openAddModal() {
    modalSelected.clear();
    el.addModal.hidden = false;
    el.vehicleSearch.value = "";
    el.vehicleSearch.focus();
    el.searchResults.innerHTML = `<div class="pb-empty-state">Start typing to search your vehicle library.</div>`;
    updateModalSelCount();
  }

  function closeAddModal() {
    el.addModal.hidden = true;
  }

  async function onSearchVehicles() {
    const q = el.vehicleSearch.value.trim();
    if (q.length < 1) {
      el.searchResults.innerHTML = `<div class="pb-empty-state">Start typing to search your vehicle library.</div>`;
      return;
    }
    try {
      const res  = await fetch(`/api/vehicles?search=${encodeURIComponent(q)}&limit=40`, { credentials: "include" });
      const data = await res.json();
      const vehicles = data.vehicles || data.results || [];
      if (!vehicles.length) {
        el.searchResults.innerHTML = `<div class="pb-empty-state">No vehicles found for "${escHtml(q)}".</div>`;
        return;
      }
      const inPack = new Set(packVehicles.map(v => v.vehicle_id));
      const searchVids = vehicles.map(v => (v.modelName || v.model_name || "").toLowerCase()).filter(Boolean);
      await preloadImages(searchVids);
      el.searchResults.innerHTML = vehicles.map(v => {
        // API returns camelCase via normalizeVehicle(); fall back to snake_case just in case
        const vid     = (v.modelName || v.model_name || "").toLowerCase();
        if (!vid) return ""; // skip rows with no usable model name
        const already = inPack.has(vid);
        const sel     = modalSelected.has(vid);
        return `
          <label class="pb-search-result ${already ? "pb-search-result--in-pack" : ""} ${sel ? "pb-search-result--selected" : ""}">
            <input type="checkbox" value="${escHtml(vid)}" ${already ? "disabled checked" : (sel ? "checked" : "")}
                   class="pb-search-check">
            ${thumbHtml(vid, 'pb-search-thumb')}
            <span class="pb-search-model">${escHtml(vid)}</span>
            ${v.displayName  || v.display_name ? `<span class="pb-search-display">${escHtml(v.displayName || v.display_name)}</span>` : ""}
            ${v.vehicleClass || v.category     ? `<span class="pb-search-class">${escHtml(v.vehicleClass || v.category)}</span>`      : ""}
            ${already ? `<span class="pb-in-pack-badge">In pack</span>` : ""}
          </label>
        `;
      }).join("");

      el.searchResults.querySelectorAll(".pb-search-check").forEach(cb => {
        cb.addEventListener("change", () => {
          if (cb.checked) modalSelected.add(cb.value);
          else            modalSelected.delete(cb.value);
          updateModalSelCount();
          // Update row styling
          cb.closest(".pb-search-result").classList.toggle("pb-search-result--selected", cb.checked);
        });
      });
    } catch (e) {
      el.searchResults.innerHTML = `<div class="pb-error">Search failed: ${e.message}</div>`;
    }
  }

  function updateModalSelCount() {
    const n = modalSelected.size;
    el.modalSelCount.textContent = n ? `${n} selected` : "";
    el.modalAddBtn.disabled = n === 0;
  }

  async function onAddSelectedVehicles() {
    if (!modalSelected.size) return;
    el.modalAddBtn.disabled  = true;
    el.modalAddBtn.textContent = "Adding…";
    const toAdd = [...modalSelected];
    let added = 0;

    for (const vid of toAdd) {
      try {
        const res  = await fetch(`/api/builder/packs/${activePack.id}/vehicles`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicle_id: vid }),
        });
        const data = await res.json();
        if (data.ok) added++;
      } catch { /* swallow individual failures */ }
    }

    closeAddModal();
    // Reload the full pack to get updated vehicle list
    await selectPack(activePack.id);
    el.modalAddBtn.disabled   = false;
    el.modalAddBtn.textContent = "Add Selected";
  }

  // ── Meta Upload Modal ──────────────────────────────

  async function openMetaModal(vehicleId) {
    // Guard: vehicle was added before the model-name fix and has a bad ID in DB.
    // Tell the user to remove and re-add it so the correct spawn name is stored.
    if (!vehicleId || /^\d+$/.test(vehicleId)) {
      alert(
        "This vehicle has an outdated ID in the database (stored as a numeric row ID instead of model name).\n\n" +
        "To fix: remove this vehicle from the pack and add it again using the \"+ Add Vehicle\" button."
      );
      return;
    }
    activeMetaVehicleId = vehicleId;
    parsedMeta     = {};
    pendingCarcols = null;
    el.metaVehicleName.textContent  = vehicleId;
    el.metaHowName.textContent      = vehicleId;
    el.metaParseErrors.hidden       = true;
    el.metaParseErrors.innerHTML    = "";
    el.metaUploadStatus.textContent = "";
    el.uploadMetaBtn.disabled       = true;
    el.metaReadyCount.textContent   = "0 / 4 parsed";
    // Reset all status rows to "waiting"
    META_TYPES.forEach(t => setTypeStatus(t, "miss", "waiting"));
    el.metaModal.hidden = false;
    // Show any already-uploaded status from server
    await refreshMetaStatus(vehicleId);
  }

  function closeMetaModal() {
    el.metaModal.hidden     = true;
    activeMetaVehicleId     = null;
    parsedMeta              = {};
    pendingCarcols          = null;
  }

  // ── XML parsing ────────────────────────────────────

  function detectMetaType(xmlText, filename) {
    const f = filename.toLowerCase();
    if (f.includes("vehicles")      && !f.includes("variation")) return "vehicles";
    if (f.includes("handling"))                                   return "handling";
    if (f.includes("carvariations") || f.includes("carvariation")) return "carvariations";
    if (f.includes("carcols"))                                    return "carcols";
    // Fall back to peeking at the root element
    if (xmlText.includes("CVehicleModelInfo__InitDataList"))  return "vehicles";
    if (xmlText.includes("CHandlingDataMgr"))                 return "handling";
    if (xmlText.includes("CVehicleModelInfoVariation"))       return "carvariations";
    if (xmlText.includes("CVehicleModelInfoVarGlobal"))       return "carcols";
    return null;
  }

  function xmlSerialize(node) {
    // Strip any xmlns declarations the serializer may inject
    return new XMLSerializer().serializeToString(node)
      .replace(/ xmlns(:\w+)?="[^"]*"/g, "");
  }

  // Broad item search: tries <Parent > Item>, then any child of <Parent> that has the key child,
  // then a document-wide search for the key element and walks up to its parent.
  function findMetaItems(doc, parentSelector, keyChildTag) {
    let items = [...doc.querySelectorAll(`${parentSelector} > Item`)];
    if (!items.length) {
      const parent = doc.querySelector(parentSelector);
      if (parent) items = [...parent.children].filter(el => el.querySelector(keyChildTag));
    }
    if (!items.length) {
      items = [...new Set([...doc.querySelectorAll(keyChildTag)].map(el => el.parentElement).filter(Boolean))];
    }
    return items;
  }

  function parseVehiclesItem(xmlText, vehicleId) {
    if (!vehicleId) throw new Error("No vehicle ID set — open the modal from a vehicle row first.");
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("Invalid XML");
    const items = findMetaItems(doc, "InitDatas", "modelName");
    for (const item of items) {
      if (item.querySelector("modelName")?.textContent?.trim().toLowerCase() === vehicleId.toLowerCase())
        return { xml: xmlSerialize(item), warnings: [] };
    }
    throw new Error(`No entry found where <modelName> = "${vehicleId}" — check the spawn name matches exactly`);
  }

  function parseHandlingItem(xmlText, vehicleId) {
    if (!vehicleId) throw new Error("No vehicle ID set.");
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("Invalid XML");
    const items = findMetaItems(doc, "HandlingData", "handlingName");
    for (const item of items) {
      if (item.querySelector("handlingName")?.textContent?.trim().toLowerCase() === vehicleId.toLowerCase())
        return { xml: xmlSerialize(item), warnings: [] };
    }
    throw new Error(`No entry found where <handlingName> = "${vehicleId}" — check the spawn name matches exactly`);
  }

  function parseCarvariationsItem(xmlText, vehicleId) {
    if (!vehicleId) throw new Error("No vehicle ID set.");
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("Invalid XML");
    const items = findMetaItems(doc, "variationData", "modelName");
    for (const item of items) {
      if (item.querySelector("modelName")?.textContent?.trim().toLowerCase() === vehicleId.toLowerCase()) {
        let kitName = item.querySelector("kits > Item")?.textContent?.trim() || null;
        let warnings = [];
        if (!kitName) {
          // No explicit <kits> reference — infer conventional GTA V modkit name
          kitName = `${vehicleId}_modkit`;
        }
        return { xml: xmlSerialize(item), kitName, warnings };
      }
    }
    throw new Error(`No entry found where <modelName> = "${vehicleId}"`);
  }

  // GTA V carcols.meta uses several formats for kit identifiers:
  //   Attribute:   <Item id="0_default_modkit">
  //   <kitName>:   <Item><kitName>1262_a45_modkit</kitName>...</Item>  ← most common for mods
  //   <id> text:   <Item><id>some_name</id>...</Item>
  // NOTE: <kitType> (e.g. "MKT_SPECIAL") describes the TYPE of kit, NOT the name — ignored here.
  // NOTE: <id value="1262"> uses a value= attribute with a numeric, not the kit name — also ignored.
  function getKitId(kitItem) {
    return kitItem.getAttribute("id")
      || kitItem.querySelector(":scope > kitName")?.textContent?.trim()
      || kitItem.querySelector(":scope > id")?.textContent?.trim()
      || null;
  }

  function parseCarcolsItem(xmlText, kitName) {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("Invalid XML");
    const items = doc.querySelectorAll("Kits > Item");

    if (kitName) {
      for (const item of items) {
        const id = getKitId(item);
        if (id && id.toLowerCase() === kitName.toLowerCase())
          return { xml: xmlSerialize(item), kitName: id, warnings: [] };
      }
    }
    // Fallback: single kit in file (common for individual vehicle exports)
    if (items.length === 1) {
      const item = items[0];
      const foundKit = getKitId(item);
      const warnings = kitName && foundKit !== kitName
        ? [`Kit name mismatch — found "${foundKit}", carvariations references "${kitName}". The merge engine will reconcile this.`]
        : [];
      return { xml: xmlSerialize(item), kitName: foundKit, warnings };
    }
    if (items.length === 0) throw new Error("No <Kits> entries found in carcols.meta");

    // Multiple kits and no kit name to match against
    if (!kitName) throw new Error(
      `Multiple kits found in carcols.meta (${items.length}) but carvariations.meta has no modkit reference. ` +
      `Try dropping carvariations.meta first, or check if this vehicle uses modkits.`
    );

    // "0_default_modkit" means "vehicle uses no custom modkit" in GTA V convention.
    // If it's not in this carcols.meta, the user likely dropped a shared pack carcols
    // that belongs to other vehicles. That's OK — this vehicle just has no modkit.
    if (kitName === "0_default_modkit") {
      const found = [...items].map(i => getKitId(i) || "(no id)").join(", ");
      throw new Error(
        `This vehicle's carvariations.meta says it uses "0_default_modkit" (the GTA V default — no custom modkit). ` +
        `The carcols.meta you dropped contains kits for other vehicles (${found}). ` +
        `Either: (a) find this vehicle's own carcols.meta in OpenIV, or (b) skip carcols and save 3 files — ` +
        `a vehicle with no modkit doesn't need a carcols entry.`
      );
    }

    const found = [...items].map(i => getKitId(i) || "(no id)").join(", ");
    throw new Error(`Kit "${kitName}" not found in carcols.meta. Found: ${found}`);
  }

  // ── File drop handler ──────────────────────────────

  // Read all files immediately using FileReader (callback-based, not Promise-chained)
  // so the reads START before the drag session ends and the OS file handle is revoked.
  // Returns: [{ name, text } | { name, error }]
  function eagerReadFiles(fileList) {
    const promises = [...fileList].map(file =>
      new Promise(resolve => {
        const reader = new FileReader();
        reader.onload  = () => resolve({ name: file.name, text: reader.result });
        reader.onerror = () => resolve({
          name: file.name, text: null,
          error: 'Could not read file. If you dragged directly from OpenIV, use ' +
                 'right-click → Export to… → save to Desktop, then drop from Windows Explorer instead.'
        });
        reader.readAsText(file, 'utf-8');
      })
    );
    return Promise.all(promises);
  }

  // Process pre-read file snapshots (avoids re-reading stale file handles)
  async function handleMetaSnapshots(snapshots) {
    if (!activeMetaVehicleId) return;
    const errors = [];
    for (const snap of snapshots) {
      if (snap.error) {
        errors.push(`${snap.name}: ${snap.error}`);
        continue;
      }
      await processMetaText(snap.text, snap.name, errors);
    }
    el.metaParseErrors.hidden = errors.length === 0;
    el.metaParseErrors.innerHTML = errors.length
      ? `<strong>⚠ Parse issues:</strong><ul>${errors.map(e => `<li>${escHtml(e)}</li>`).join("")}</ul>`
      : "";
    updateMetaReadyCount();
  }

  // Core per-file meta parser — shared by handleMetaSnapshots and handleMetaFiles.
  // text: file contents as string; filename: for error messages; errors: caller array to push into.
  async function processMetaText(text, filename, errors) {
    try {
      const type = detectMetaType(text, filename);
      if (!type) { errors.push(`${filename}: unrecognised meta type`); return; }

      setTypeStatus(type, "ok", "parsing…");

      let result;
      if (type === "vehicles") {
        result = parseVehiclesItem(text, activeMetaVehicleId);
      } else if (type === "handling") {
        result = parseHandlingItem(text, activeMetaVehicleId);
      } else if (type === "carvariations") {
        result = parseCarvariationsItem(text, activeMetaVehicleId);
        parsedMeta.carvariations = result;
        if (pendingCarcols) {
          try {
            parsedMeta.carcols = parseCarcolsItem(pendingCarcols.text, result.kitName);
            setTypeStatus("carcols", "ok", "✓ parsed");
            pendingCarcols = null;
          } catch (err) {
            const skipMsg = result.kitName === "0_default_modkit"
              ? "No modkit — carcols not needed"
              : err.message;
            setTypeStatus("carcols", "warn", `⚠ optional — ${skipMsg}`);
            pendingCarcols = null;
          }
        }
      } else if (type === "carcols") {
        const kitName = parsedMeta.carvariations?.kitName || null;
        if (!kitName && !parsedMeta.carvariations) {
          pendingCarcols = { text };
          setTypeStatus("carcols", "miss", "waiting for carvariations…");
          return;
        }
        try {
          result = parseCarcolsItem(text, kitName);
        } catch (err) {
          const skipMsg = kitName === "0_default_modkit"
            ? "No modkit — carcols not needed"
            : err.message;
          setTypeStatus("carcols", "warn", `⚠ optional — ${skipMsg}`);
          return;
        }
      }

      if (result && type !== "carvariations") parsedMeta[type] = result;

      if (result) {
        const warnLabel = result.warnings?.length
          ? `✓ parsed (${result.warnings.length} warning${result.warnings.length !== 1 ? "s" : ""})`
          : "✓ parsed";
        setTypeStatus(type, result.warnings?.length ? "warn" : "ok", warnLabel);
      }
    } catch (err) {
      const type = detectMetaType("", filename) || filename;
      setTypeStatus(type, "err", err.message);
      errors.push(`${filename}: ${err.message}`);
    }
  }

  async function handleMetaFiles(fileList) {
    if (!activeMetaVehicleId) return;
    const errors = [];
    for (const file of fileList) {
      let text;
      try { text = await file.text(); }
      catch (err) { errors.push(`${file.name}: ${err.message}`); continue; }
      await processMetaText(text, file.name, errors);
    }
    el.metaParseErrors.hidden = errors.length === 0;
    el.metaParseErrors.innerHTML = errors.length
      ? `<strong>⚠ Parse issues:</strong><ul>${errors.map(e => `<li>${escHtml(e)}</li>`).join("")}</ul>`
      : "";
    updateMetaReadyCount();
  }

  function setTypeStatus(type, state, label) {
    const el = document.getElementById(`pbmts-${type}`);
    if (!el) return;
    el.textContent = label;
    el.className = `pb-meta-type-status pb-meta-type-status--${state}`;
  }

  function updateMetaReadyCount() {
    const ready = META_TYPES.filter(t => parsedMeta[t]?.xml).length;
    el.metaReadyCount.textContent   = `${ready} / 4 parsed`;
    el.uploadMetaBtn.disabled       = ready === 0;
    el.uploadMetaBtn.textContent    = ready === 4 ? "Save All to Pack" : `Save ${ready} to Pack`;
  }

  // ── Upload parsed meta to server ───────────────────

  async function uploadAllParsedMeta() {
    const types = META_TYPES.filter(t => parsedMeta[t]?.xml);
    if (!types.length) return;

    el.uploadMetaBtn.disabled       = true;
    el.metaUploadStatus.textContent = `Uploading ${types.length} file${types.length !== 1 ? "s" : ""}…`;

    let saved = 0, errored = 0;
    const allWarnings = [];

    for (const type of types) {
      setTypeStatus(type, "ok", "uploading…");
      try {
        const res  = await fetch("/api/builder/vehicle-meta", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicle_id: activeMetaVehicleId,
            meta_type:  type,
            raw_xml:    parsedMeta[type].xml,
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        const w = [...(parsedMeta[type].warnings || []), ...(data.warnings || [])];
        if (w.length) {
          allWarnings.push(...w.map(msg => `[${type}] ${msg}`));
          setTypeStatus(type, "warn", `✓ saved (${w.length} warning${w.length !== 1 ? "s" : ""})`);
        } else {
          setTypeStatus(type, "ok", "✓ saved");
        }
        saved++;
      } catch (err) {
        setTypeStatus(type, "err", `✗ ${err.message}`);
        errored++;
      }
    }

    if (allWarnings.length) {
      el.metaParseErrors.hidden = false;
      el.metaParseErrors.innerHTML =
        `<strong>⚠ ${allWarnings.length} warning${allWarnings.length !== 1 ? "s" : ""}:</strong>` +
        `<ul>${allWarnings.map(w => `<li>${escHtml(w)}</li>`).join("")}</ul>`;
    }

    el.metaUploadStatus.textContent = errored
      ? `${saved} saved, ${errored} failed`
      : `✓ ${saved} file${saved !== 1 ? "s" : ""} saved`;

    if (saved > 0) {
      await refreshMetaStatus(activeMetaVehicleId);
      const v = packVehicles.find(pv => pv.vehicle_id === activeMetaVehicleId);
      if (v) {
        const types = Object.keys(metaStatusCache[activeMetaVehicleId] || {});
        v.meta_types = types.join(",");
      }
      renderVehicleList();
      updateExportReadiness();
    }

    el.uploadMetaBtn.disabled = false;
  }

  // Load previously-uploaded meta for this vehicle from the server database.
  // Fetches raw_xml for each meta type and pipes it through processMetaText
  // so parsedMeta is populated and Save to Pack becomes available.
  async function onLoadFromLibrary() {
    if (!activeMetaVehicleId) return;
    const btn = el.loadFromLibraryBtn;
    btn.disabled = true;
    btn.textContent = "Loading…";
    el.metaParseErrors.hidden = true;

    try {
      const res  = await fetch(`/api/builder/vehicle-meta/${activeMetaVehicleId}`, { credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Server error");

      const available = META_TYPES.filter(t => data.meta?.[t]?.raw_xml);
      if (!available.length) {
        el.metaParseErrors.hidden = false;
        el.metaParseErrors.innerHTML =
          `<strong>Nothing stored yet for <em>${escHtml(activeMetaVehicleId)}</em>.</strong>` +
          ` Drop .meta files above to upload them.`;
        return;
      }

      const errors = [];
      for (const type of META_TYPES) {
        const entry = data.meta?.[type];
        if (!entry?.raw_xml) continue;
        await processMetaText(entry.raw_xml, `${type}.meta`, errors);
      }

      el.metaParseErrors.hidden = errors.length === 0;
      el.metaParseErrors.innerHTML = errors.length
        ? `<strong>⚠ Issues:</strong><ul>${errors.map(e => `<li>${escHtml(e)}</li>`).join("")}</ul>`
        : "";

      updateMetaReadyCount();
    } catch (err) {
      el.metaParseErrors.hidden = false;
      el.metaParseErrors.innerHTML = `<span class="pb-val-error">Load failed: ${escHtml(err.message)}</span>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "📥 Load from Library";
    }
  }

    async function refreshMetaStatus(vehicleId) {
    try {
      const res  = await fetch(`/api/builder/vehicle-meta/${vehicleId}`, { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        metaStatusCache[vehicleId] = data.meta || {};
        // Update type grid to reflect already-uploaded files
        const meta = data.meta || {};
        META_TYPES.forEach(t => {
          const entry = meta[t];
          if (!entry || parsedMeta[t]) return; // don't overwrite local parse state
          const state = entry.status === "error" ? "err" : entry.status === "warning" ? "warn" : "ok";
          const label = entry.status === "error" ? "⚠ error on server" : entry.status === "warning" ? "✓ uploaded (warnings)" : "✓ uploaded";
          setTypeStatus(t, state, label);
        });
      }
    } catch { /* ignore */ }
  }

  async function refreshAllMetaStatus() {
    for (const v of packVehicles) {
      await refreshMetaStatus(v.vehicle_id);
    }
    renderVehicleList();
    updateExportReadiness();
  }

  // ── Validation + Export Readiness ──────────────────
  function updateExportReadiness() {
    if (!packVehicles.length) {
      el.exportReadiness.innerHTML = `<span class="pb-ready-chip pb-ready-chip--miss">No vehicles</span>`;
      el.exportBtn.disabled = true;
      return;
    }

    const REQUIRED_META = ["vehicles", "handling", "carvariations"]; // carcols optional
    const issues = [];
    for (const v of packVehicles) {
      const types = (v.meta_types || "").split(",").filter(Boolean);
      const missingMeta = REQUIRED_META.filter(t => !types.includes(t));
      if (missingMeta.length) issues.push(`${v.vehicle_id}: missing ${missingMeta.join(", ")} meta`);
    }

    const ready = issues.length === 0;
    el.exportBtn.disabled = !ready;
    el.exportReadiness.innerHTML = ready
      ? `<span class="pb-ready-chip pb-ready-chip--ok">✓ ${packVehicles.length} vehicles ready</span>`
      : `<span class="pb-ready-chip pb-ready-chip--miss">${issues.length} issue${issues.length !== 1 ? "s" : ""} — run Validate</span>`;
  }

  async function onValidatePack() {
    el.exportStatus.innerHTML = "<em>Validating…</em>";
    const lines = [];
    let errCount = 0, warnCount = 0;

    const REQUIRED_META = ["vehicles", "handling", "carvariations"]; // carcols optional
    for (const v of packVehicles) {
      const meta  = metaStatusCache[v.vehicle_id] || {};
      const validTypes = META_TYPES.filter(t => meta[t] && meta[t].status !== "error");
      const missing = REQUIRED_META.filter(t => !validTypes.includes(t));

      if (missing.length) {
        lines.push(`<li class="pb-val-error">⛔ ${v.vehicle_id}: missing ${missing.join(", ")} meta</li>`);
        errCount++;
      } else {
        META_TYPES.forEach(t => {
          const w = (meta[t]?.warnings || []);
          if (w.length) {
            lines.push(`<li class="pb-val-warn">⚠ ${v.vehicle_id} / ${t}.meta: ${w.join("; ")}</li>`);
            warnCount++;
          }
        });
        if (!meta.carcols?.raw_xml) {
          lines.push(`<li class="pb-val-warn">⚠ ${v.vehicle_id}: no carcols meta (OK for vehicles without modkits)</li>`);
          warnCount++;
        }
        if (!v.has_yft || !v.has_ytd) {
          lines.push(`<li class="pb-val-warn">⚠ ${v.vehicle_id}: model files (.yft/.ytd) not marked ready — will need to be provided at export time</li>`);
          warnCount++;
        }
      }
    }

    if (!lines.length) {
      el.exportStatus.innerHTML = `<span class="pb-val-ok">✓ Pack looks good — ${packVehicles.length} vehicle${packVehicles.length !== 1 ? 's' : ''}, all meta uploaded.</span>`;
    } else {
      const summary = [
        errCount ? `${errCount} error${errCount !== 1 ? 's' : ''}` : '',
        warnCount ? `${warnCount} warning${warnCount !== 1 ? 's' : ''}` : '',
      ].filter(Boolean).join(', ');
      el.exportStatus.innerHTML = `<strong>${summary}</strong><ul class="pb-val-list">${lines.join('')}</ul>`;
    }
  }


  // ── Export ─────────────────────────────────────
  function onExportOiv() {
    if (!activePack) return;
    if (typeof window.pbExport === 'function') {
      window.pbExport(activePack, packVehicles, metaStatusCache);
      return;
    }
    el.exportStatus.innerHTML = '<em>Loading export module…</em>';
    el.exportBtn.disabled = true;
    const s = document.createElement('script');
    s.src = 'js/pack-builder-export.js';
    s.onload = () => {
      el.exportStatus.innerHTML = '';
      el.exportBtn.disabled = false;
      if (typeof window.pbExport === 'function') {
        window.pbExport(activePack, packVehicles, metaStatusCache);
      } else {
        el.exportStatus.innerHTML = '<span class="pb-val-error">Export module failed to load.</span>';
      }
    };
    s.onerror = () => {
      el.exportStatus.innerHTML = '<span class="pb-val-error">Could not load export module.</span>';
      el.exportBtn.disabled = false;
    };
    document.head.appendChild(s);
  }

  // ── Utilities ─────────────────────────────────────
  function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
