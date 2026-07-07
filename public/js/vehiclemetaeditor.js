// =====================================================
// GTA Traffic Vehicle.meta Editor V1.6
// Standalone editor for vehicle metadata. This does not
// replace js/vehicleMeta.js, which is still used by the
// existing Popgroups workspace.
// =====================================================

const vehicleMetaEditor = (() => {
  const EDITABLE_FIELDS = [
    "modelName",
    "gameName",
    "vehicleMakeName",
    "frequency",
    "maxNum",
    "maxNumOfSameColor",
    "identicalModelSpawnDistance",
    "vehicleClass",
    "type",
    "handlingId",
    "audioNameHash",
    "layout",
    "swankness"
  ];

  const NUMBER_VALUE_FIELDS = new Set([
    "frequency",
    "maxNum",
    "maxNumOfSameColor",
    "identicalModelSpawnDistance"
  ]);

  // Fields that are game-breaking if changed — must match internal game file names
  const DANGEROUS_FIELDS = new Set(["modelName"]);

  // Fields that can cause issues (wrong handling/audio) but aren't catastrophic
  const RISKY_FIELDS = new Set(["handlingId", "audioNameHash"]);

  const FIELD_WARNINGS = {
    modelName:     "⚠ GAME-BREAKING — modelName must match your .yft/.ytd filenames and entries in popgroups, carcols, carmods, and trainer spawn lists. Changing it will break the vehicle in-game.",
    handlingId:    "⚠ Caution — handlingId must match an entry in handling.meta. A wrong value will cause broken or missing handling behavior.",
    audioNameHash: "⚠ Caution — audioNameHash links to an audio bank entry. A wrong value will silence the vehicle's engine and sound effects.",
  };

  const TEXT_NODE_FIELDS = new Set([
    "modelName",
    "txdName",
    "handlingId",
    "gameName",
    "vehicleMakeName",
    "vehicleClass",
    "type",
    "layout",
    "audioNameHash",
    "swankness"
  ]);

  const PROJECT_DB_NAME = "gtaTrafficVehicleMetaDB";
  const PROJECT_DB_VERSION = 1;
  const PROJECT_STORE_NAME = "projects";
  const LAST_ACTIVE_PROJECT_KEY = "gtaTrafficVehicleMetaLastActiveProject";
  const FALLBACK_PROJECTS_KEY = "gtaTrafficVehicleMetaProjectsFallback";
  const AUTOSAVE_DELAY = 450;

  let projectDatabase = null;
  let autosaveTimer = null;

  const state = {
    fileName: "vehicles.meta",
    dlcName: "",
    activeProjectId: "",
    projectCreatedAt: "",
    lastSavedAt: "",
    storageReady: false,
    storageMode: "none",
    xmlDoc: null,
    originalText: "",
    vehicles: [],
    filteredIndexes: [],
    selectedKeys: new Set(),
    warnings: [],
    targetModel: "",
    sourcePack: ""
  };

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function makeProjectId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `vehicle_meta_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function openProjectDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB is not supported by this browser."));
        return;
      }

      const request = indexedDB.open(PROJECT_DB_NAME, PROJECT_DB_VERSION);

      request.onupgradeneeded = event => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
          const store = database.createObjectStore(PROJECT_STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
        }
      };

      request.onsuccess = event => resolve(event.target.result);
      request.onerror = () => reject(request.error || new Error("Could not open the vehicle.meta database."));
      request.onblocked = () => reject(new Error("The vehicle.meta database is blocked by another open tab."));
    });
  }

  function getProjectStore(mode = "readonly") {
    if (!projectDatabase) throw new Error("Vehicle.meta database is not open.");
    return projectDatabase.transaction(PROJECT_STORE_NAME, mode).objectStore(PROJECT_STORE_NAME);
  }

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeStorageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Storage may be unavailable in a restricted browser context.
    }
  }

  function readFallbackProjects() {
    const raw = safeStorageGet(FALLBACK_PROJECTS_KEY);
    if (!raw) return [];
    try {
      const projects = JSON.parse(raw);
      return Array.isArray(projects) ? projects : [];
    } catch (error) {
      return [];
    }
  }

  function writeFallbackProjects(projects) {
    if (!safeStorageSet(FALLBACK_PROJECTS_KEY, JSON.stringify(projects))) {
      throw new Error("Browser fallback storage is full or unavailable.");
    }
  }

  function projectPut(record) {
    if (state.storageMode === "localstorage") {
      return new Promise((resolve, reject) => {
        try {
          const projects = readFallbackProjects();
          const index = projects.findIndex(project => project.id === record.id);
          if (index >= 0) projects[index] = record;
          else projects.push(record);
          writeFallbackProjects(projects);
          resolve(record.id);
        } catch (error) {
          reject(error);
        }
      });
    }

    return new Promise((resolve, reject) => {
      try {
        const request = getProjectStore("readwrite").put(record);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  function projectGet(id) {
    if (state.storageMode === "localstorage") {
      return Promise.resolve(readFallbackProjects().find(project => project.id === id) || null);
    }

    return new Promise((resolve, reject) => {
      try {
        const request = getProjectStore().get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  function projectGetAll() {
    if (state.storageMode === "localstorage") {
      return Promise.resolve(readFallbackProjects());
    }

    return new Promise((resolve, reject) => {
      try {
        const request = getProjectStore().getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  function projectDelete(id) {
    if (state.storageMode === "localstorage") {
      return new Promise((resolve, reject) => {
        try {
          writeFallbackProjects(readFallbackProjects().filter(project => project.id !== id));
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }

    return new Promise((resolve, reject) => {
      try {
        const request = getProjectStore("readwrite").delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  function setDatabaseStatus(message, tone = "warn") {
    const host = el("vmDatabaseStatus");
    if (!host) return;
    host.className = `vm-database-status ${tone}`;
    host.textContent = message;
  }

  function formatSavedTime(value) {
    if (!value) return "Not saved yet";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Saved";
    return date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }

  function sanitizeDlcName(value) {
    return String(value || "")
      .trim()
      .replace(/\.(meta|xml|txt)$/i, "")
      .replace(/[^a-z0-9_-]+/gi, "_")
      .replace(/^_+|_+$/g, "");
  }

  function getXmlExportFilename() {
    const dlc = sanitizeDlcName(state.dlcName);
    return dlc ? `${dlc}_vehicles.meta` : "vehicles.meta";
  }

  function getJsonExportFilename() {
    const dlc = sanitizeDlcName(state.dlcName);
    return dlc ? `${dlc}_vehicles-meta-backup.json` : "vehicles-meta-backup.json";
  }

  function updateExportFilenamePreview() {
    const filename = getXmlExportFilename();
    const preview = el("vmExportNamePreview");
    const button = el("vmExportXmlButton");
    if (preview) preview.textContent = filename;
    if (button) button.textContent = `Export ${filename}`;
  }

  async function initializeProjectDatabase() {
    try {
      projectDatabase = await openProjectDatabase();
      state.storageReady = true;
      state.storageMode = "indexeddb";

      if (navigator.storage?.persist) {
        navigator.storage.persist().catch(() => false);
      }

      setDatabaseStatus("Local autosave is ready.", "good");
      await renderSavedProjects();
      return true;
    } catch (error) {
      console.warn("IndexedDB unavailable; trying limited browser storage.", error);

      const storageTestKey = `${FALLBACK_PROJECTS_KEY}_test`;
      if (safeStorageSet(storageTestKey, "1")) {
        safeStorageRemove(storageTestKey);
        state.storageReady = true;
        state.storageMode = "localstorage";
        setDatabaseStatus("Local autosave is ready with limited browser storage.", "warn");
        await renderSavedProjects();
        return true;
      }

      state.storageReady = false;
      state.storageMode = "none";
      setDatabaseStatus("Local autosave is unavailable. Export files before leaving this page.", "bad");
      return false;
    }
  }

  function buildProjectSnapshot() {
    if (!state.xmlDoc) return null;

    const now = new Date().toISOString();
    if (!state.activeProjectId) state.activeProjectId = makeProjectId();
    if (!state.projectCreatedAt) state.projectCreatedAt = now;

    return {
      id: state.activeProjectId,
      dlcName: state.dlcName.trim(),
      sourceFileName: state.fileName || "vehicles.meta",
      xmlText: serializeXml(),
      vehicleCount: state.vehicles.length,
      createdAt: state.projectCreatedAt,
      updatedAt: now
    };
  }

  async function saveCurrentProject(options = {}) {
    const silent = options.silent === true;

    if (!state.xmlDoc) {
      if (!silent) setStatus("Load a vehicles.meta file before saving it to the database.", "warn");
      return false;
    }

    if (!state.storageReady) {
      const ready = await initializeProjectDatabase();
      if (!ready) return false;
    }

    const snapshot = buildProjectSnapshot();

    try {
      await projectPut(snapshot);
      state.lastSavedAt = snapshot.updatedAt;
      safeStorageSet(LAST_ACTIVE_PROJECT_KEY, snapshot.id);
      setDatabaseStatus(`Saved locally ${formatSavedTime(snapshot.updatedAt)}.`, "good");
      await renderSavedProjects();

      if (!silent) {
        setStatus(`Saved ${escapeHTML(state.dlcName || state.fileName)} to the local vehicle.meta database.`, "good");
      }
      return true;
    } catch (error) {
      console.error("Could not save vehicle.meta project.", error);
      setDatabaseStatus("Autosave failed. Export the file before leaving this page.", "bad");
      if (!silent) setStatus("The current file could not be saved locally.", "bad");
      return false;
    }
  }

  function scheduleAutosave(delay = AUTOSAVE_DELAY) {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => saveCurrentProject({ silent: true }), delay);
  }

  async function renderSavedProjects() {
    const host = el("vmSavedProjects");
    if (!host || !state.storageReady) return;

    try {
      const projects = (await projectGetAll())
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

      if (!projects.length) {
        host.innerHTML = `<div class="vm-saved-empty">No saved vehicle.meta files yet.</div>`;
        return;
      }

      host.innerHTML = projects.map(project => {
        const label = project.dlcName || project.sourceFileName || "vehicles.meta";
        const active = project.id === state.activeProjectId;
        return `
          <div class="vm-saved-project ${active ? "active" : ""}">
            <div class="vm-saved-project-copy">
              <strong title="${escapeHTML(label)}">${escapeHTML(label)}</strong>
              <small>${Number(project.vehicleCount || 0).toLocaleString()} vehicles · ${escapeHTML(formatSavedTime(project.updatedAt))}</small>
              <small>${escapeHTML(project.sourceFileName || "vehicles.meta")}${active ? " · Current" : ""}</small>
            </div>
            <div class="vm-saved-project-actions">
              <button type="button" data-load-project="${escapeHTML(project.id)}">Load</button>
              <button class="secondary" type="button" data-delete-project="${escapeHTML(project.id)}" data-project-label="${escapeHTML(label)}">Delete</button>
            </div>
          </div>
        `;
      }).join("");

      host.querySelectorAll("[data-load-project]").forEach(button => {
        button.addEventListener("click", () => loadProject(button.dataset.loadProject));
      });

      host.querySelectorAll("[data-delete-project]").forEach(button => {
        button.addEventListener("click", () => deleteSavedProject(button.dataset.deleteProject, button.dataset.projectLabel));
      });
    } catch (error) {
      console.error("Could not list saved vehicle.meta projects.", error);
      host.innerHTML = `<div class="vm-saved-empty">Saved files could not be listed.</div>`;
    }
  }

  async function loadProject(id, options = {}) {
    if (!state.storageReady || !id) return false;

    try {
      const project = await projectGet(id);
      if (!project?.xmlText) {
        setDatabaseStatus("That saved file could not be found.", "bad");
        return false;
      }

      parseVehicles(project.xmlText, project.sourceFileName || "vehicles.meta", {
        projectId: project.id,
        dlcName: project.dlcName || "",
        createdAt: project.createdAt || project.updatedAt,
        lastSavedAt: project.updatedAt,
        skipAutosave: true
      });

      safeStorageSet(LAST_ACTIVE_PROJECT_KEY, project.id);
      setDatabaseStatus(`Restored ${project.dlcName || project.sourceFileName || "vehicles.meta"}.`, "good");
      await renderSavedProjects();

      if (!options.silent) {
        setStatus(`Restored ${escapeHTML(project.dlcName || project.sourceFileName || "vehicles.meta")} from the local database.`, "good");
      }
      return true;
    } catch (error) {
      console.error("Could not load saved vehicle.meta project.", error);
      setDatabaseStatus("The saved file could not be restored.", "bad");
      return false;
    }
  }

  async function deleteSavedProject(id, label = "this saved file") {
    if (!id || !state.storageReady) return;
    if (!confirm(`Delete ${label} from the local vehicle.meta database?`)) return;

    try {
      await projectDelete(id);
      if (state.activeProjectId === id) {
        state.activeProjectId = "";
        state.projectCreatedAt = "";
        state.lastSavedAt = "";
        safeStorageRemove(LAST_ACTIVE_PROJECT_KEY);
      }
      setDatabaseStatus("Saved file deleted.", "good");
      await renderSavedProjects();
    } catch (error) {
      console.error("Could not delete saved vehicle.meta project.", error);
      setDatabaseStatus("The saved file could not be deleted.", "bad");
    }
  }

  async function restoreLastProject() {
    if (!state.storageReady) return;
    const id = safeStorageGet(LAST_ACTIVE_PROJECT_KEY);
    if (!id) return;

    const restored = await loadProject(id, { silent: true });
    if (restored) {
      setStatus("Restored the last vehicle.meta file automatically.", "good");
    } else {
      safeStorageRemove(LAST_ACTIVE_PROJECT_KEY);
    }
  }

  function getDirectChild(item, tagName) {
    for (const child of item.children) {
      if (child.tagName === tagName) return child;
    }
    return null;
  }

  function getText(item, tagName) {
    const node = getDirectChild(item, tagName);
    return node ? node.textContent.trim() : "";
  }

  function getValueAttr(item, tagName) {
    const node = getDirectChild(item, tagName);
    return node ? (node.getAttribute("value") ?? "") : "";
  }

  function ensureNode(item, tagName) {
    let node = getDirectChild(item, tagName);
    if (node) return node;

    node = state.xmlDoc.createElement(tagName);
    node.textContent = "";

    // Keep newly-created nodes near Rockstar's normal vehicles.meta order.
    // Existing nodes are never moved.
    const insertBeforeHints = {
      identicalModelSpawnDistance: ["maxNumOfSameColor", "defaultBodyHealth", "pretendOccupantsScale", "visibleSpawnDistScale", "trackerPathWidth", "weaponForceMult", "frequency", "swankness", "maxNum", "flags"],
      maxNumOfSameColor: ["defaultBodyHealth", "pretendOccupantsScale", "visibleSpawnDistScale", "trackerPathWidth", "weaponForceMult", "frequency", "swankness", "maxNum", "flags"],
      frequency: ["swankness", "maxNum", "flags"],
      swankness: ["maxNum", "flags"],
      maxNum: ["flags", "type"]
    };

    const candidates = insertBeforeHints[tagName] || ["flags"];
    const anchor = candidates.map(name => getDirectChild(item, name)).find(Boolean);

    if (anchor) item.insertBefore(node, anchor);
    else item.appendChild(node);

    return node;
  }

  function setFieldValue(vehicle, field, value) {
    if (!vehicle?.item) return;

    const cleanValue = String(value ?? "").trim();

    if (NUMBER_VALUE_FIELDS.has(field)) {
      const node = ensureNode(vehicle.item, field);
      node.setAttribute("value", cleanValue);
      vehicle[field] = cleanValue;
      return;
    }

    if (TEXT_NODE_FIELDS.has(field)) {
      const node = ensureNode(vehicle.item, field);
      node.textContent = cleanValue;
      vehicle[field === "type" ? "vehicleType" : field] = cleanValue;
    }
  }

  function parseVehicles(text, fileName, options = {}) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    if (xmlDoc.querySelector("parsererror")) {
      setStatus("Could not parse this file as XML. Check that the file is a clean XML export of vehicles.meta.", "bad");
      return;
    }

    const items = [...xmlDoc.querySelectorAll("InitDatas > Item, CVehicleModelInfo__InitDataList > InitDatas > Item")];
    const vehicles = [];

    items.forEach((item, index) => {
      const modelName = getText(item, "modelName");
      if (!modelName) return;

      vehicles.push({
        key: `${modelName.toLowerCase()}::${index}`,
        index,
        item,
        modelName,
        gameName: getText(item, "gameName"),
        vehicleMakeName: getText(item, "vehicleMakeName"),
        vehicleClass: getText(item, "vehicleClass"),
        vehicleType: getText(item, "type"),
        handlingId: getText(item, "handlingId"),
        audioNameHash: getText(item, "audioNameHash"),
        layout: getText(item, "layout"),
        frequency: getValueAttr(item, "frequency"),
        maxNum: getValueAttr(item, "maxNum"),
        maxNumOfSameColor: getValueAttr(item, "maxNumOfSameColor"),
        identicalModelSpawnDistance: getValueAttr(item, "identicalModelSpawnDistance"),
        swankness: getText(item, "swankness")
      });
    });

    state.fileName = fileName || "vehicles.meta";
    state.dlcName = String(options.dlcName || "");
    state.activeProjectId = options.projectId || makeProjectId();
    state.projectCreatedAt = options.createdAt || new Date().toISOString();
    state.lastSavedAt = options.lastSavedAt || "";
    state.xmlDoc = xmlDoc;
    state.originalText = text;
    state.vehicles = vehicles;
    state.selectedKeys.clear();

    el("vmDlcName").value = state.dlcName;
    updateExportFilenamePreview();

    populateFilters();
    applyFilters();
    runAnalyzer(false);

    const warningText = state.warnings.length
      ? ` Analyzer found ${state.warnings.length.toLocaleString()} warning group${state.warnings.length === 1 ? "" : "s"}.`
      : " Analyzer found no obvious problems.";
    setStatus(`Loaded ${vehicles.length.toLocaleString()} vehicle entries from ${escapeHTML(state.fileName)}.${warningText}`, state.warnings.length ? "warn" : "good");

    if (!options.skipAutosave) scheduleAutosave(0);
  }


  function populateFilters() {
    const classFilter = el("vmClassFilter");
    const typeFilter = el("vmTypeFilter");

    const classes = [...new Set(state.vehicles.map(v => v.vehicleClass).filter(Boolean))].sort();
    const types = [...new Set(state.vehicles.map(v => v.vehicleType).filter(Boolean))].sort();

    classFilter.innerHTML = `<option value="">All classes</option>` + classes.map(v => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");
    typeFilter.innerHTML = `<option value="">All types</option>` + types.map(v => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");
  }

  function applyFilters() {
    const search = el("vmSearch").value.trim().toLowerCase();
    const classValue = el("vmClassFilter").value;
    const typeValue = el("vmTypeFilter").value;

    state.filteredIndexes = state.vehicles
      .map((vehicle, i) => ({ vehicle, i }))
      .filter(({ vehicle }) => {
        if (classValue && vehicle.vehicleClass !== classValue) return false;
        if (typeValue && vehicle.vehicleType !== typeValue) return false;
        if (!search) return true;

        const haystack = [
          vehicle.modelName,
          vehicle.gameName,
          vehicle.vehicleMakeName,
          vehicle.vehicleClass,
          vehicle.vehicleType,
          vehicle.handlingId,
          vehicle.audioNameHash,
          vehicle.layout,
          vehicle.frequency,
          vehicle.maxNum,
          vehicle.maxNumOfSameColor,
          vehicle.identicalModelSpawnDistance
        ].join(" ").toLowerCase();

        return haystack.includes(search);
      })
      .map(entry => entry.i);

    renderTable();
    updateStats();
  }

  function renderTable() {
    const body = el("vmTableBody");

    if (!state.vehicles.length) {
      body.innerHTML = `<tr><td colspan="14" class="vm-muted">Load a vehicles.meta file to begin.</td></tr>`;
      return;
    }

    const rows = state.filteredIndexes.map(index => {
      const vehicle = state.vehicles[index];
      const selected = state.selectedKeys.has(vehicle.key);

      return `
        <tr class="${selected ? "selected-row" : ""}${state.targetModel && vehicle.modelName.toLowerCase() === state.targetModel.toLowerCase() ? " vm-target-row" : ""}" data-key="${escapeHTML(vehicle.key)}" data-model="${escapeHTML(vehicle.modelName)}">
          <td><input type="checkbox" class="vm-row-check" data-key="${escapeHTML(vehicle.key)}" ${selected ? "checked" : ""}></td>
          ${editableCell(vehicle, "modelName")}
          ${editableCell(vehicle, "gameName")}
          ${editableCell(vehicle, "vehicleMakeName")}
          ${editableCell(vehicle, "frequency")}
          ${editableCell(vehicle, "maxNum")}
          ${editableCell(vehicle, "maxNumOfSameColor")}
          ${editableCell(vehicle, "identicalModelSpawnDistance")}
          ${editableCell(vehicle, "vehicleClass")}
          ${editableCell(vehicle, "vehicleType")}
          ${editableCell(vehicle, "handlingId")}
          ${editableCell(vehicle, "audioNameHash")}
          ${editableCell(vehicle, "layout")}
          ${editableCell(vehicle, "swankness")}
        </tr>
      `;
    }).join("");

    body.innerHTML = rows || `<tr><td colspan="14" class="vm-muted">No vehicles match the current filters.</td></tr>`;
    scrollToTargetModel();

    const visibleKeys = state.filteredIndexes.map(index => state.vehicles[index].key);
    const selectedVisibleCount = visibleKeys.filter(key => state.selectedKeys.has(key)).length;
    const selectAll = el("vmSelectAllVisible");
    selectAll.checked = visibleKeys.length > 0 && selectedVisibleCount === visibleKeys.length;
    selectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleKeys.length;

    body.querySelectorAll(".vm-row-check").forEach(check => {
      check.addEventListener("change", event => {
        const key = event.target.dataset.key;
        if (event.target.checked) state.selectedKeys.add(key);
        else state.selectedKeys.delete(key);
        renderTable();
        updateStats();
      });
    });

    body.querySelectorAll(".vm-cell-input").forEach(input => {
      input.addEventListener("change", event => {
        const key = event.target.dataset.key;
        const field = event.target.dataset.field;
        const vehicle = state.vehicles.find(v => v.key === key);
        const xmlField = field === "vehicleType" ? "type" : field;
        setFieldValue(vehicle, xmlField, event.target.value);
        runAnalyzer(false);
        scheduleAutosave();
      });
    });
  }

  function editableCell(vehicle, field) {
    const isDanger = DANGEROUS_FIELDS.has(field);
    const isRisky  = !isDanger && RISKY_FIELDS.has(field);
    const warning  = FIELD_WARNINGS[field] ?? "";

    const tdClass  = isDanger ? " vm-danger-td" : isRisky ? " vm-risky-td" : "";
    const badge    = isDanger
      ? `<span class="vm-field-badge vm-field-danger" title="${warning}">⚠ Game-Breaking</span>`
      : isRisky
      ? `<span class="vm-field-badge vm-field-risky" title="${warning}">⚠ Caution</span>`
      : "";

    return `
      <td class="${tdClass.trim()}">
        ${badge}
        <input
          class="vm-cell-input${isDanger ? " vm-input-danger" : isRisky ? " vm-input-risky" : ""}"
          data-key="${escapeHTML(vehicle.key)}"
          data-field="${escapeHTML(field)}"
          value="${escapeHTML(vehicle[field] ?? "")}"
          title="${warning || escapeHTML(vehicle[field] ?? "")}"
          aria-label="${escapeHTML(field)} for ${escapeHTML(vehicle.modelName)}"
        >
      </td>
    `;
  }


  function setupQuickEditFields() {
    const options = EDITABLE_FIELDS.map(field => `<option value="${escapeHTML(field)}">${escapeHTML(field)}</option>`).join("");
    el("vmQuickEditField").innerHTML = options;
  }

  function getScopedVehicles(scope) {
    if (scope === "all") return [...state.vehicles];
    if (scope === "visible") return state.filteredIndexes.map(i => state.vehicles[i]);
    return state.vehicles.filter(v => state.selectedKeys.has(v.key));
  }

  function applyFieldToScope(field, value, scope) {
    const vehicles = getScopedVehicles(scope);

    if (!vehicles.length) {
      setStatus("No vehicles matched that quick-edit scope.", "warn");
      return;
    }

    if (scope === "all") {
      const confirmed = confirm(`Apply ${field} = ${value || "(blank)"} to all ${vehicles.length.toLocaleString()} vehicle rows?`);
      if (!confirmed) return;
    }

    vehicles.forEach(vehicle => setFieldValue(vehicle, field, value));
    populateFilters();
    applyFilters();
    runAnalyzer(false);
    scheduleAutosave();

    const scopeLabel = scope === "all" ? "all rows" : scope === "visible" ? "visible rows" : "selected rows";
    setStatus(`Updated ${vehicles.length.toLocaleString()} ${scopeLabel}: ${field} = ${escapeHTML(value)}.`, "good");
  }

  function applyQuickEdit(scope = "selected") {
    applyFieldToScope(el("vmQuickEditField").value, el("vmQuickEditValue").value, scope);
  }


  function runAnalyzer(showStatus = true) {
    if (!state.vehicles.length) {
      state.warnings = [];
      renderAnalysis([]);
      updateStats();
      if (showStatus) setStatus("Load a vehicles.meta file before running the analyzer.", "warn");
      return;
    }

    const issues = [];
    const modelCounts = new Map();

    state.vehicles.forEach(vehicle => {
      const model = vehicle.modelName.trim().toLowerCase();
      if (!model) return;
      modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
    });

    const duplicates = [...modelCounts.entries()].filter(([, count]) => count > 1);
    if (duplicates.length) {
      issues.push({
        level: "bad",
        title: "Duplicate modelName values",
        message: `${duplicates.length} model name${duplicates.length === 1 ? " is" : "s are"} duplicated. Examples: ${duplicates.slice(0, 8).map(([name]) => name).join(", ")}`
      });
    }

    const requiredChecks = [
      ["gameName", "Blank gameName", "warn"],
      ["handlingId", "Missing handlingId", "bad"],
      ["vehicleClass", "Missing vehicleClass", "warn"],
      ["vehicleType", "Missing vehicle type", "warn"]
    ];

    requiredChecks.forEach(([field, title, level]) => {
      const matches = state.vehicles.filter(vehicle => !String(vehicle[field] ?? "").trim());
      if (matches.length) {
        issues.push({
          level,
          title,
          message: `${matches.length} vehicle${matches.length === 1 ? "" : "s"} ${matches.length === 1 ? "has" : "have"} no ${field === "vehicleType" ? "type" : field}. Examples: ${matches.slice(0, 8).map(vehicle => vehicle.modelName || `(row ${vehicle.index + 1})`).join(", ")}`
        });
      }
    });

    const numericFields = ["frequency", "maxNum", "maxNumOfSameColor", "identicalModelSpawnDistance"];
    numericFields.forEach(field => {
      const blank = state.vehicles.filter(vehicle => String(vehicle[field] ?? "").trim() === "");
      if (blank.length) {
        issues.push({
          level: "warn",
          title: `Blank ${field} values`,
          message: `${blank.length} vehicle${blank.length === 1 ? "" : "s"} ${blank.length === 1 ? "has" : "have"} no ${field} value. Examples: ${blank.slice(0, 8).map(vehicle => vehicle.modelName).join(", ")}`
        });
      }

      const invalid = state.vehicles.filter(vehicle => {
        const raw = String(vehicle[field] ?? "").trim();
        if (!raw) return false;
        const value = Number(raw);
        return !Number.isFinite(value) || value < 0;
      });
      if (invalid.length) {
        issues.push({
          level: "bad",
          title: `Invalid ${field} values`,
          message: `${invalid.length} vehicle${invalid.length === 1 ? "" : "s"} ${invalid.length === 1 ? "contains" : "contain"} a non-numeric or negative ${field} value. Examples: ${invalid.slice(0, 8).map(vehicle => `${vehicle.modelName} (${vehicle[field]})`).join(", ")}`
        });
      }
    });

    if (!issues.length) {
      issues.push({
        level: "good",
        title: "No obvious problems found",
        message: `Checked ${state.vehicles.length.toLocaleString()} vehicle entries for duplicate model names, missing core fields, and invalid traffic values.`
      });
    }

    state.warnings = issues.filter(issue => issue.level !== "good");
    renderAnalysis(issues);
    updateStats();

    if (showStatus) {
      setStatus(
        `Analyzer checked ${state.vehicles.length.toLocaleString()} vehicles and found ${state.warnings.length.toLocaleString()} warning group${state.warnings.length === 1 ? "" : "s"}.`,
        state.warnings.length ? "warn" : "good"
      );
    }
  }

  function renderAnalysis(issues) {
    const host = el("vmAnalysis");
    if (!state.vehicles.length) {
      host.innerHTML = `<div class="vm-analysis-item warn">Load a vehicles.meta file, then run the analyzer.</div>`;
      return;
    }

    host.innerHTML = issues.map(issue => `
      <div class="vm-analysis-item ${escapeHTML(issue.level)}">
        <strong>${escapeHTML(issue.title)}</strong>
        <div>${escapeHTML(issue.message)}</div>
      </div>
    `).join("");
  }

  function selectVisible(checked) {
    state.filteredIndexes.forEach(index => {
      const key = state.vehicles[index].key;
      if (checked) state.selectedKeys.add(key);
      else state.selectedKeys.delete(key);
    });
    renderTable();
    updateStats();
  }

  function clearAllSelections() {
    state.selectedKeys.clear();
    renderTable();
    updateStats();
  }

  function serializeXml() {
    if (!state.xmlDoc) return "";
    return new XMLSerializer().serializeToString(state.xmlDoc);
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportXml() {
    if (!state.xmlDoc) return setStatus("Load a vehicles.meta file before exporting.", "warn");
    const filename = getXmlExportFilename();
    downloadText(filename, serializeXml(), "application/xml");
    setStatus(`Exported ${escapeHTML(filename)}.`, "good");
  }

  function exportJson() {
    if (!state.vehicles.length) return setStatus("Load a vehicles.meta file before exporting JSON.", "warn");
    const data = state.vehicles.map(({ item, ...vehicle }) => vehicle);
    const filename = getJsonExportFilename();
    downloadText(filename, JSON.stringify({
      fileName: state.fileName,
      dlcName: state.dlcName,
      xmlExportName: getXmlExportFilename(),
      exportedAt: new Date().toISOString(),
      vehicles: data
    }, null, 2), "application/json");
    setStatus(`Exported ${escapeHTML(filename)}.`, "good");
  }

  async function copyXml() {
    if (!state.xmlDoc) return setStatus("Load a vehicles.meta file before copying XML.", "warn");
    try {
      await navigator.clipboard.writeText(serializeXml());
      setStatus("Copied edited XML to clipboard.", "good");
    } catch (error) {
      setStatus("Clipboard copy failed. Use Export instead.", "bad");
    }
  }

  async function saveToCloud() {
    if (!state.xmlDoc) return setStatus("Load a vehicles.meta file before saving to cloud.", "warn");
    if (!window.metaFileCloud) return setStatus("Cloud module not loaded.", "bad");

    const btn = el("vmSaveCloudBtn");
    const statusEl = el("vmCloudSaveStatus");
    if (btn) btn.disabled = true;
    if (statusEl) { statusEl.hidden = false; statusEl.textContent = "Saving to cloud…"; statusEl.className = "vm-cloud-save-status loading"; }

    try {
      // Use sourcePack if set (came from vehicle details page), else use DLC name or file name
      const packName = state.sourcePack || state.dlcName || state.fileName;
      const entryNames = state.vehicles.map(v => v.modelName);
      await window.metaFileCloud.saveFile("vehicles-meta", packName, serializeXml(), {
        originalFilename: state.fileName,
        entryNames
      });
      const msg = "✓ Saved " + entryNames.length + " vehicle" + (entryNames.length !== 1 ? "s" : "") + " to cloud as pack \"" + window.metaFileCloud.sanitizePackName(packName) + "\".";
      if (statusEl) { statusEl.textContent = msg; statusEl.className = "vm-cloud-save-status success"; }
      setStatus(msg, "good");
    } catch (e) {
      const errMsg = "Cloud save failed: " + (e.message || "Unknown error");
      if (statusEl) { statusEl.textContent = errMsg; statusEl.className = "vm-cloud-save-status error"; }
      setStatus(errMsg, "bad");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function setStatus(message, tone = "warn") {
    const host = el("vmStatus");
    host.className = `vm-status ${tone}`;
    host.innerHTML = message;
  }

  function updateStats() {
    el("vmStats").innerHTML = `
      <div class="vm-stat"><strong>${state.vehicles.length.toLocaleString()}</strong><span>Vehicles</span></div>
      <div class="vm-stat"><strong>${state.selectedKeys.size.toLocaleString()}</strong><span>Selected</span></div>
      <div class="vm-stat"><strong>${state.filteredIndexes.length.toLocaleString()}</strong><span>Visible</span></div>
      <div class="vm-stat"><strong>${state.warnings.length.toLocaleString()}</strong><span>Warnings</span></div>
    `;
  }

  function openTab(tabName) {
    document.querySelectorAll(".vm-tab-panel").forEach(panel => panel.classList.remove("active"));
    document.querySelectorAll("[data-vm-tab]").forEach(button => {
      const isActive = button.dataset.vmTab === tabName;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    const target = el(`vmTab${tabName[0].toUpperCase()}${tabName.slice(1)}`);
    if (target) target.classList.add("active");
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => parseVehicles(event.target.result, file.name);
    reader.onerror = () => setStatus(`Could not read ${escapeHTML(file.name)}.`, "bad");
    reader.readAsText(file);
  }

  function setupEvents() {
    const dropZone = el("vmDropZone");
    const picker = el("vmFilePicker");

    dropZone.addEventListener("click", () => picker.click());
    dropZone.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") picker.click();
    });

    picker.addEventListener("change", event => handleFile(event.target.files?.[0]));

    ["dragenter", "dragover"].forEach(name => {
      dropZone.addEventListener(name, event => {
        event.preventDefault();
        dropZone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach(name => {
      dropZone.addEventListener(name, event => {
        event.preventDefault();
        dropZone.classList.remove("drag-over");
      });
    });

    dropZone.addEventListener("drop", event => handleFile(event.dataTransfer.files?.[0]));

    ["vmSearch", "vmClassFilter", "vmTypeFilter"].forEach(id => {
      el(id).addEventListener("input", applyFilters);
      el(id).addEventListener("change", applyFilters);
    });

    el("vmSelectAllVisible").addEventListener("change", event => selectVisible(event.target.checked));
    el("vmRunAnalyzer").addEventListener("click", () => runAnalyzer(true));

    el("vmDlcName").addEventListener("input", event => {
      state.dlcName = event.target.value;
      updateExportFilenamePreview();
      scheduleAutosave();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && state.xmlDoc) {
        saveCurrentProject({ silent: true });
      }
    });

    window.addEventListener("pagehide", () => {
      if (state.xmlDoc) saveCurrentProject({ silent: true });
    });

    document.querySelectorAll("[data-vm-tab]").forEach(button => {
      button.addEventListener("click", () => openTab(button.dataset.vmTab));
    });
  }

  // ── Build a minimal valid vehicles.meta XML from a cloud vehicle record ──
  function buildVehiclesMetaXml(vehicle) {
    function textTag(tag, value) {
      if (value == null || value === "") return "";
      return `    <${tag}>${String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</${tag}>`;
    }
    function valueTag(tag, value) {
      if (value == null || value === "") return "";
      return `    <${tag} value="${String(value).replace(/"/g,"&quot;")}"/>`;
    }

    const modelName = vehicle.modelName || "";
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<CVehicleModelInfo__InitDataList>',
      '  <InitDatas>',
      '    <Item>',
      textTag("modelName", modelName),
      textTag("txdName", vehicle.txdName || modelName),
      textTag("handlingId", vehicle.handlingId),
      textTag("gameName", vehicle.gameName),
      textTag("vehicleMakeName", vehicle.makeName || vehicle.vehicleMakeName),
      textTag("vehicleClass", vehicle.vehicleClass),
      textTag("type", vehicle.vehicleType),
      textTag("audioNameHash", vehicle.audioName || vehicle.audioNameHash),
      textTag("layout", vehicle.layoutName || vehicle.layout),
      valueTag("frequency", vehicle.frequency),
      valueTag("maxNum", vehicle.maxNum),
      valueTag("maxNumOfSameColor", vehicle.maxNumOfSameColor),
      valueTag("identicalModelSpawnDistance", vehicle.identicalModelSpawnDistance),
      textTag("swankness", vehicle.swankness),
      '    </Item>',
      '  </InitDatas>',
      '</CVehicleModelInfo__InitDataList>'
    ].filter(Boolean);

    return lines.join("\n");
  }

  // ── Scroll table to highlight the target model row ──
  function scrollToTargetModel() {
    if (!state.targetModel) return;
    const row = el("vmTableBody") && el("vmTableBody").querySelector(".vm-target-row");
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // ── Show pack warning banner when opening from Vehicle Details ──
  function showPackWarning(modelName, sourcePack) {
    const banner = el("vmCloudBanner");
    if (!banner) return;
    banner.hidden = false;
    const packText = sourcePack ? ` (Pack: <strong>${sourcePack}</strong>)` : "";
    banner.innerHTML =
      `⚠ <strong>${modelName}</strong> is part of a multi-vehicle pack${packText}. ` +
      `Drop the full <strong>vehicles.meta</strong> for that pack below — all vehicles will load and ` +
      `<strong>${modelName}</strong> will be highlighted in the table. ` +
      `<em>Do not export until the full pack is loaded.</em>`;
    setStatus(`Drop the pack's vehicles.meta to load all vehicles. Editing ${modelName} alone risks breaking the DLC.`, "warn");
  }

  // ── After any file loads, check if the target model is present ──
  function checkTargetAfterLoad() {
    if (!state.targetModel) return;
    const found = state.vehicles.find(
      v => v.modelName.toLowerCase() === state.targetModel.toLowerCase()
    );
    const banner = el("vmCloudBanner");
    if (found) {
      if (banner) {
        banner.hidden = false;
        banner.innerHTML =
          `✓ Found <strong>${found.modelName}</strong> in this file ` +
          `(${state.vehicles.length} vehicles total). ` +
          `Edit it below, then use <strong>Export Full vehicles.meta</strong> to export the complete pack.`;
      }
      // Filter table to highlight the row, then clear filter so all vehicles show
      el("vmSearch").value = found.modelName;
      applyFilters();
      setTimeout(() => {
        el("vmSearch").value = "";
        applyFilters();
      }, 1500);
    }
  }

  // ── Export just the currently visible/active single vehicle ──

  function exportSingleVehicleXml() {
    if (!state.vehicles.length) {
      return setStatus("No vehicle loaded to export.", "warn");
    }

    // Use first visible/filtered vehicle, or first vehicle overall
    const index = state.filteredIndexes.length > 0
      ? state.filteredIndexes[0]
      : 0;
    const vehicle = state.vehicles[index];
    if (!vehicle) return setStatus("No vehicle to export.", "warn");

    const serializer = new XMLSerializer();

    // Preserve residentTxd and residentAnims from the source document
    const residentTxdNode = state.xmlDoc && state.xmlDoc.querySelector("residentTxd");
    const residentTxd = residentTxdNode ? residentTxdNode.textContent.trim() : "vehshare";

    const residentAnimsNode = state.xmlDoc && state.xmlDoc.querySelector("residentAnims");
    const residentAnimsXml = residentAnimsNode
      ? "  " + serializer.serializeToString(residentAnimsNode)
      : "  <residentAnims />";

    // Collect txdRelationships entries for this vehicle
    const modelNameLower = (vehicle.modelName || "").toLowerCase();
    const txdItems = [];
    if (state.xmlDoc) {
      state.xmlDoc.querySelectorAll("txdRelationships > Item").forEach(item => {
        const child = item.querySelector("child");
        if (child && child.textContent.trim().toLowerCase() === modelNameLower) {
          txdItems.push("    " + serializer.serializeToString(item));
        }
      });
    }

    const txdSection = txdItems.length
      ? "  <txdRelationships>\n" + txdItems.join("\n") + "\n  </txdRelationships>"
      : "";

    const itemXml = "    " + serializer.serializeToString(vehicle.item);

    const parts = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<CVehicleModelInfo__InitDataList>',
      `  <residentTxd>${residentTxd}</residentTxd>`,
      residentAnimsXml,
      '  <InitDatas>',
      itemXml,
      '  </InitDatas>',
      txdSection,
      '</CVehicleModelInfo__InitDataList>'
    ].filter(Boolean);

    const filename = `${vehicle.modelName || "vehicle"}.meta`;
    downloadText(filename, parts.join("\n"), "application/xml");
    setStatus(`Exported ${filename} with all original fields preserved.`, "good");
  }


  async function init() {
    setupQuickEditFields();
    setupEvents();
    updateStats();
    updateExportFilenamePreview();

    const params = new URLSearchParams(window.location.search);
    const modelName = params.get("modelName");
    const sourcePack = params.get("sourcePack") || "";

    if (modelName) {
      state.targetModel = modelName;
      state.sourcePack = sourcePack;

      // Try to auto-load from cloud (R2) before showing the drop-zone warning
      if (window.metaFileCloud) {
        const banner = el("vmCloudBanner");
        try {
          if (banner) {
            banner.hidden = false;
            banner.innerHTML = `⏳ Looking for <strong>${modelName}</strong> in the cloud…`;
          }
          const lookupKey = sourcePack || modelName;
          const result = await window.metaFileCloud.getFile("vehicles-meta", lookupKey);
          if (result && result.ok && result.file && result.file.xml) {
            const f = result.file;
            const dateStr = f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : "";
            parseVehicles(f.xml, f.originalFilename || "vehicles.meta");
            if (banner) {
              banner.hidden = false;
              banner.innerHTML =
                "✓ Auto-loaded pack <strong>" + f.packName + "</strong> from cloud " +
                "(" + f.entryCount + " vehicles" + (dateStr ? ", saved " + dateStr : "") + "). " +
                "<strong>" + modelName + "</strong> is highlighted. " +
                "Edit then use <strong>Export Full vehicles.meta</strong>.";
            }
            setStatus("Loaded " + f.entryCount + " vehicles from cloud. " + modelName + " highlighted.", "good");
            return;
          }
        } catch (_e) {
          // Not found or network error - fall through to drop-zone warning
        }
      }

      showPackWarning(modelName, sourcePack);
    } else {
      const ready = await initializeProjectDatabase();
      if (ready) await restoreLastProject();
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    applyQuickEdit,
    selectVisible,
    clearAllSelections,
    runAnalyzer,
    saveCurrentProject,
    exportXml,
    exportSingleVehicleXml,
    exportJson,
    copyXml,
    saveToCloud,

    // Cloud Projects API (used by vehicle-meta-cloud-save.js)
    hasContent: () => Boolean(state.xmlDoc),
    getCloudPayload: () => {
      if (!state.xmlDoc) return null;
      return {
        format: "gta-traffic-vehicle-meta-cloud-project",
        version: 1,
        savedAt: new Date().toISOString(),
        projectType: "vehicle-meta",
        dlcName: state.dlcName || "",
        fileName: state.fileName || "vehicles.meta",
        xmlText: serializeXml(),
        vehicleCount: state.vehicles.length,
        vehicleNames: state.vehicles.map(v => v.modelName)
      };
    },
    applyCloudProject: (data) => {
      if (!data?.xmlText) throw new Error("Cloud project has no XML content.");
      parseVehicles(data.xmlText, data.fileName || "vehicles.meta", {
        dlcName: data.dlcName || "",
        projectId: data.projectId || "",
        createdAt: data.createdAt || ""
      });
    }
  };
})();
