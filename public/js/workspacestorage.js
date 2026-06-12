// =====================================================
// [MODULE: WORKSPACE_STORAGE]
// Persistent browser storage for GTA Traffic Studio.
//
// IndexedDB stores:
// - Parsed vehicles.meta data and imported meta filenames
// - The most recently loaded/edited Popgroups project
// - Current UI state such as selected section and searches
//
// Existing Pack DB and LOD Asset DB localStorage systems are
// preserved. Full workspace backup includes all of them.
// =====================================================

const WORKSPACE_DB_NAME = "gtaTrafficStudioDB";
const WORKSPACE_DB_VERSION = 1;
const WORKSPACE_STORE_NAME = "workspace";

const WORKSPACE_RECORD_KEYS = {
  vehicleMeta: "vehicleMetaCache",
  popgroups: "recentPopgroupsProject",
  popcycle: "popcycleVisualWorkspace",
  ui: "mainPageUiState"
};

let workspaceDatabase = null;
let workspaceStorageAvailable = false;
let workspaceStoragePersistent = false;
let workspaceLastSavedAt = null;

const workspaceAutosaveTimers = {
  vehicleMeta: null,
  popgroups: null,
  ui: null
};

// =====================================================
// [SECTION: INDEXEDDB_CORE]
// Low-level database open/read/write/delete operations.
// =====================================================

function openWorkspaceDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported by this browser."));
      return;
    }

    const request = indexedDB.open(
      WORKSPACE_DB_NAME,
      WORKSPACE_DB_VERSION
    );

    request.onupgradeneeded = event => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(WORKSPACE_STORE_NAME)) {
        database.createObjectStore(
          WORKSPACE_STORE_NAME,
          { keyPath: "key" }
        );
      }
    };

    request.onsuccess = event => {
      resolve(event.target.result);
    };

    request.onerror = () => {
      reject(
        request.error ||
        new Error("Could not open the GTA Traffic workspace database.")
      );
    };

    request.onblocked = () => {
      reject(
        new Error(
          "The workspace database is blocked by another open GTA Traffic tab."
        )
      );
    };
  });
}

function getWorkspaceStore(mode = "readonly") {
  if (!workspaceDatabase) {
    throw new Error("Workspace database is not open.");
  }

  return workspaceDatabase
    .transaction(WORKSPACE_STORE_NAME, mode)
    .objectStore(WORKSPACE_STORE_NAME);
}

function workspacePut(key, data) {
  return new Promise((resolve, reject) => {
    try {
      const request = getWorkspaceStore("readwrite").put({
        key,
        data,
        savedAt: new Date().toISOString()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function workspaceGet(key) {
  return new Promise((resolve, reject) => {
    try {
      const request = getWorkspaceStore("readonly").get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function workspaceDelete(key) {
  return new Promise((resolve, reject) => {
    try {
      const request = getWorkspaceStore("readwrite").delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

async function initializeWorkspaceStorage() {
  try {
    workspaceDatabase = await openWorkspaceDatabase();
    workspaceStorageAvailable = true;

    if (navigator.storage?.persist) {
      try {
        workspaceStoragePersistent =
          await navigator.storage.persist();
      } catch (error) {
        console.info(
          "Persistent-storage request was not available.",
          error
        );
      }
    }

    return true;
  } catch (error) {
    workspaceStorageAvailable = false;
    console.error("Workspace storage unavailable.", error);

    renderWorkspaceStatus(
      "Automatic workspace saving is unavailable. Open the site through localhost or check browser storage permissions.",
      true
    );

    return false;
  }
}

// [END SECTION: INDEXEDDB_CORE]

// =====================================================
// [SECTION: WORKSPACE_SNAPSHOTS]
// Converts current global app state into serializable data.
// =====================================================

function cloneWorkspaceData(value) {
  return value === undefined
    ? undefined
    : JSON.parse(JSON.stringify(value));
}

function buildVehicleMetaCacheSnapshot() {
  return {
    version: 1,
    vehicleMeta: cloneWorkspaceData(vehicleMeta || {}),
    loadedMetaFiles: Array.from(loadedMetaFiles || []),
    overwrittenMetaEntries:
      Number(overwrittenMetaEntries) || 0
  };
}

function buildPopgroupsProjectSnapshot() {
  if (!originalText) return null;

  return {
    version: 1,
    originalText,
    loadedFileName,
    parsedData: cloneWorkspaceData(parsedData),
    currentSection,
    hasUnsavedChanges,
    openGroups: {
      vehicles: Array.from(openGroups.vehicles || []),
      peds: Array.from(openGroups.peds || [])
    },
    searchText: els.searchBox?.value || ""
  };
}

function buildMainPageUiSnapshot() {
  return {
    version: 1,
    activePackId,
    currentSection,
    imageMode,
    searchText: els.searchBox?.value || "",
    librarySearchText:
      els.librarySearchBox?.value || "",
    packSearchText:
      els.packSearchBox?.value || ""
  };
}

// [END SECTION: WORKSPACE_SNAPSHOTS]

// =====================================================
// [SECTION: WORKSPACE_SAVE]
// Immediate save functions and debounced autosave wrappers.
// =====================================================

async function saveVehicleMetaCache(options = {}) {
  if (!workspaceStorageAvailable) return false;

  try {
    await workspacePut(
      WORKSPACE_RECORD_KEYS.vehicleMeta,
      buildVehicleMetaCacheSnapshot()
    );

    workspaceLastSavedAt = new Date();

    if (!options.silent) {
      renderWorkspaceStatus("Vehicle metadata saved locally.");
    }

    return true;
  } catch (error) {
    console.error("Could not save vehicle metadata.", error);

    renderWorkspaceStatus(
      "Vehicle metadata could not be saved. Export a workspace backup.",
      true
    );

    return false;
  }
}

async function saveCurrentPopgroupsProject(options = {}) {
  if (!workspaceStorageAvailable) return false;

  const snapshot = buildPopgroupsProjectSnapshot();
  if (!snapshot) return false;

  try {
    await workspacePut(
      WORKSPACE_RECORD_KEYS.popgroups,
      snapshot
    );

    workspaceLastSavedAt = new Date();

    if (!options.silent) {
      renderWorkspaceStatus("Current Popgroups project saved locally.");
    }

    return true;
  } catch (error) {
    console.error("Could not save the Popgroups project.", error);

    renderWorkspaceStatus(
      "The Popgroups project could not be autosaved. Export a workspace backup.",
      true
    );

    return false;
  }
}

async function saveMainPageUiState(options = {}) {
  if (!workspaceStorageAvailable) return false;

  try {
    await workspacePut(
      WORKSPACE_RECORD_KEYS.ui,
      buildMainPageUiSnapshot()
    );

    workspaceLastSavedAt = new Date();

    if (!options.silent) {
      renderWorkspaceStatus("Workspace view saved locally.");
    }

    return true;
  } catch (error) {
    console.error("Could not save workspace view.", error);
    return false;
  }
}

function debounceWorkspaceSave(timerName, callback, delay = 450) {
  clearTimeout(workspaceAutosaveTimers[timerName]);

  workspaceAutosaveTimers[timerName] = setTimeout(
    () => callback({ silent: true }),
    delay
  );
}

function scheduleVehicleMetaCacheSave() {
  debounceWorkspaceSave(
    "vehicleMeta",
    saveVehicleMetaCache,
    300
  );
}

function schedulePopgroupsProjectSave() {
  debounceWorkspaceSave(
    "popgroups",
    saveCurrentPopgroupsProject,
    450
  );
}

function scheduleWorkspaceUiSave() {
  debounceWorkspaceSave(
    "ui",
    saveMainPageUiState,
    350
  );
}

async function saveWorkspaceNow(options = {}) {
  if (!workspaceStorageAvailable) {
    renderWorkspaceStatus(
      "Browser workspace storage is unavailable.",
      true
    );
    return false;
  }

  const results = await Promise.all([
    saveVehicleMetaCache({ silent: true }),
    saveCurrentPopgroupsProject({ silent: true }),
    saveMainPageUiState({ silent: true })
  ]);

  // Keep the existing Pack DB and Asset DB systems current.
  try {
    savePackDatabase();
    saveVehicleAssetDatabase();
  } catch (error) {
    console.warn("Could not refresh legacy database storage.", error);
  }

  workspaceLastSavedAt = new Date();

  if (!options.silent) {
    renderWorkspaceStatus("Workspace saved now.");
  }

  return results.some(Boolean);
}

// [END SECTION: WORKSPACE_SAVE]

// =====================================================
// [SECTION: WORKSPACE_RESTORE]
// Restores cached metadata, the latest Popgroups project,
// selected section, searches, active pack, and image mode.
// =====================================================

async function restoreSavedWorkspace() {
  if (!workspaceStorageAvailable) {
    return {
      vehicleMetaRestored: false,
      popgroupsRestored: false
    };
  }

  try {
    const [metaRecord, popgroupsRecord, uiRecord] =
      await Promise.all([
        workspaceGet(WORKSPACE_RECORD_KEYS.vehicleMeta),
        workspaceGet(WORKSPACE_RECORD_KEYS.popgroups),
        workspaceGet(WORKSPACE_RECORD_KEYS.ui)
      ]);

    let vehicleMetaRestored = false;
    let popgroupsRestored = false;

    if (metaRecord?.data?.vehicleMeta) {
      vehicleMeta = metaRecord.data.vehicleMeta;
      loadedMetaFiles =
        metaRecord.data.loadedMetaFiles || [];
      overwrittenMetaEntries =
        Number(metaRecord.data.overwrittenMetaEntries) || 0;
      vehicleMetaRestored = true;
    }

    if (
      popgroupsRecord?.data?.originalText &&
      popgroupsRecord.data.parsedData
    ) {
      const project = popgroupsRecord.data;

      originalText = project.originalText;
      loadedFileName = project.loadedFileName || "popgroups";
      parsedData = project.parsedData;
      currentSection =
        project.currentSection === "peds"
          ? "peds"
          : "vehicles";
      hasUnsavedChanges = Boolean(project.hasUnsavedChanges);

      openGroups = {
        vehicles: new Set(
          project.openGroups?.vehicles || []
        ),
        peds: new Set(
          project.openGroups?.peds || []
        )
      };

      const parser = new DOMParser();
      const xml = parser.parseFromString(
        originalText,
        "text/xml"
      );

      originalXMLDoc = xml.querySelector("parsererror")
        ? null
        : xml;

      if (els.searchBox) {
        els.searchBox.value = project.searchText || "";
      }

      popgroupsRestored = true;
    }

    if (uiRecord?.data) {
      const ui = uiRecord.data;

      imageMode = ui.imageMode !== false;

      if (
        ui.activePackId &&
        packDatabase.packs?.[ui.activePackId]
      ) {
        activePackId = ui.activePackId;
      }

      if (!popgroupsRestored) {
        currentSection =
          ui.currentSection === "peds"
            ? "peds"
            : "vehicles";

        if (els.searchBox) {
          els.searchBox.value = ui.searchText || "";
        }
      }

      if (els.librarySearchBox) {
        els.librarySearchBox.value =
          ui.librarySearchText || "";
      }

      if (els.packSearchBox) {
        els.packSearchBox.value =
          ui.packSearchText || "";
      }
    }

    const savedTimes = [
      metaRecord?.savedAt,
      popgroupsRecord?.savedAt,
      uiRecord?.savedAt
    ]
      .filter(Boolean)
      .map(value => new Date(value))
      .filter(value => !Number.isNaN(value.getTime()));

    if (savedTimes.length) {
      workspaceLastSavedAt = new Date(
        Math.max(...savedTimes.map(value => value.getTime()))
      );
    }

    return {
      vehicleMetaRestored,
      popgroupsRestored
    };
  } catch (error) {
    console.error("Could not restore the saved workspace.", error);

    renderWorkspaceStatus(
      "Saved workspace data could not be restored.",
      true
    );

    return {
      vehicleMetaRestored: false,
      popgroupsRestored: false
    };
  }
}

function refreshMainPageAfterWorkspaceRestore() {
  updateActivePackBox();
  renderPackList();
  renderVehicleLibrary();
  renderAssetSummary();

  els.sectionTitle.textContent =
    currentSection === "vehicles"
      ? "Vehicles"
      : "Peds";

  if (originalText) {
    renderSection(currentSection);

    updateStatus(
      `Restored ${loadedFileName}: ` +
      `${parsedData.vehicles.length} vehicle groups, ` +
      `${parsedData.peds.length} ped groups`
    );
  } else {
    els.results.innerHTML = `
      <div class="workspace-empty-message">
        Load a Popgroups XML file to begin. The most recent project will be restored automatically next time.
      </div>
    `;
  }

  if (Object.keys(vehicleMeta).length) {
    els.metaStatus.innerHTML = `
      <span class="saved">
        Restored ${Object.keys(vehicleMeta).length.toLocaleString()}
        vehicle metadata entries from ${loadedMetaFiles.length}
        cached file${loadedMetaFiles.length === 1 ? "" : "s"}.
      </span>
    `;
  }
}

// [END SECTION: WORKSPACE_RESTORE]

// =====================================================
// [SECTION: WORKSPACE_BACKUP]
// Exports/imports one portable JSON backup containing the
// saved workspace, Pack DB, and LOD Asset DB.
// =====================================================

async function exportWorkspaceBackup() {
  await saveWorkspaceNow({ silent: true });

  const popcycleRecord =
    workspaceStorageAvailable
      ? await workspaceGet(
          WORKSPACE_RECORD_KEYS.popcycle
        )
      : null;

  const backup = {
    format: "gta-traffic-workspace-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    vehicleMetaCache: buildVehicleMetaCacheSnapshot(),
    popgroupsProject: buildPopgroupsProjectSnapshot(),
    popcycleWorkspace:
      cloneWorkspaceData(
        popcycleRecord?.data || null
      ),
    uiState: buildMainPageUiSnapshot(),
    packDatabase: cloneWorkspaceData(packDatabase),
    vehicleAssetDatabase: {
      vehicleAssets: cloneWorkspaceData(vehicleAssets),
      sharedAssetFiles: cloneWorkspaceData(sharedAssetFiles)
    }
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download =
    `gta_traffic_workspace_backup_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
  anchor.click();

  URL.revokeObjectURL(url);

  renderWorkspaceStatus("Workspace backup exported.");
}

function importWorkspaceBackup(file) {
  const reader = new FileReader();

  reader.onload = async event => {
    try {
      const backup = JSON.parse(event.target.result);

      if (
        backup.format !== "gta-traffic-workspace-backup" ||
        Number(backup.version) !== 1
      ) {
        alert("This is not a valid GTA Traffic workspace backup.");
        return;
      }

      if (!workspaceStorageAvailable) {
        alert(
          "Browser workspace storage is unavailable. Open the site through localhost and try again."
        );
        return;
      }

      if (backup.vehicleMetaCache) {
        await workspacePut(
          WORKSPACE_RECORD_KEYS.vehicleMeta,
          backup.vehicleMetaCache
        );
      }

      if (backup.popgroupsProject) {
        await workspacePut(
          WORKSPACE_RECORD_KEYS.popgroups,
          backup.popgroupsProject
        );
      }

      if (backup.popcycleWorkspace) {
        await workspacePut(
          WORKSPACE_RECORD_KEYS.popcycle,
          backup.popcycleWorkspace
        );
      }

      if (backup.uiState) {
        await workspacePut(
          WORKSPACE_RECORD_KEYS.ui,
          backup.uiState
        );
      }

      if (backup.packDatabase?.packs) {
        packDatabase = backup.packDatabase;
        savePackDatabase();
      }

      if (backup.vehicleAssetDatabase) {
        vehicleAssets =
          backup.vehicleAssetDatabase.vehicleAssets || {};
        sharedAssetFiles =
          backup.vehicleAssetDatabase.sharedAssetFiles || [];

        Object.values(vehicleAssets)
          .forEach(recalculateAssetRecord);

        saveVehicleAssetDatabase();
      }

      await restoreSavedWorkspace();
      refreshMainPageAfterWorkspaceRestore();

      renderWorkspaceStatus("Workspace backup imported and restored.");
    } catch (error) {
      console.error("Could not import workspace backup.", error);
      alert("Could not import the workspace backup JSON.");
    }
  };

  reader.onerror = () => {
    alert("Could not read the workspace backup file.");
  };

  reader.readAsText(file);
}

// [END SECTION: WORKSPACE_BACKUP]

// =====================================================
// [SECTION: WORKSPACE_CLEAR]
// Explicit clearing controls. These do not clear Pack DB or
// the LOD Asset DB unless those tools' own buttons are used.
// =====================================================

async function clearSavedVehicleMetadata() {
  if (
    !confirm(
      "Clear all cached vehicles.meta data? You will need to load the meta files again."
    )
  ) {
    return;
  }

  vehicleMeta = {};
  loadedMetaFiles = [];
  overwrittenMetaEntries = 0;

  if (workspaceStorageAvailable) {
    await workspaceDelete(WORKSPACE_RECORD_KEYS.vehicleMeta);
  }

  els.metaStatus.innerHTML = `
    <span class="saved">Vehicle metadata cache cleared.</span>
  `;

  renderSection(currentSection);
  renderVehicleLibrary();
  renderPackList();
  renderAssetSummary();
  renderWorkspaceStatus("Vehicle metadata cache cleared.");
}

async function clearSavedPopgroupsProject() {
  if (
    !confirm(
      "Clear the saved Popgroups project and the currently restored editor state?"
    )
  ) {
    return;
  }

  originalXMLDoc = null;
  originalText = "";
  loadedFileName = "popgroups";
  parsedData = {
    vehicles: [],
    peds: []
  };
  openGroups = {
    vehicles: new Set(),
    peds: new Set()
  };
  currentSection = "vehicles";
  hasUnsavedChanges = false;

  if (els.searchBox) {
    els.searchBox.value = "";
  }

  if (workspaceStorageAvailable) {
    await workspaceDelete(WORKSPACE_RECORD_KEYS.popgroups);
  }

  els.sectionTitle.textContent = "Vehicles";
  els.results.innerHTML = `
    <div class="workspace-empty-message">
      Saved Popgroups project cleared. Load a Popgroups XML file to begin again.
    </div>
  `;
  els.stats.innerHTML = "";

  updateStatus("Saved Popgroups project cleared.");
  renderWorkspaceStatus("Saved Popgroups project cleared.");
}

// [END SECTION: WORKSPACE_CLEAR]

// =====================================================
// [SECTION: WORKSPACE_STATUS]
// Displays current cache/project counts and the latest save.
// =====================================================

function formatWorkspaceTime(value) {
  if (!value) return "Not saved yet";

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function renderWorkspaceStatus(message = "", isWarning = false) {
  const host = document.getElementById("workspaceStorageStatus");
  if (!host) return;

  const metaCount = Object.keys(vehicleMeta || {}).length;
  const projectName = originalText
    ? `${loadedFileName}.xml`
    : "None";

  host.innerHTML = `
    <div class="workspace-status-grid">
      <div>
        <small>Vehicle metadata</small>
        <strong>${metaCount.toLocaleString()} entries</strong>
      </div>

      <div>
        <small>Recent Popgroups</small>
        <strong>${escapeHTML(projectName)}</strong>
      </div>

      <div>
        <small>Last local save</small>
        <strong>${escapeHTML(formatWorkspaceTime(workspaceLastSavedAt))}</strong>
      </div>

      <div>
        <small>Storage</small>
        <strong class="${workspaceStorageAvailable ? "saved" : "warning"}">
          ${
            workspaceStorageAvailable
              ? workspaceStoragePersistent
                ? "Persistent"
                : "Browser local"
              : "Unavailable"
          }
        </strong>
      </div>
    </div>

    ${
      message
        ? `<div class="workspace-message ${isWarning ? "warning" : "saved"}">${escapeHTML(message)}</div>`
        : ""
    }
  `;
}

// [END SECTION: WORKSPACE_STATUS]

// [END MODULE: WORKSPACE_STORAGE]
