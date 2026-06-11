// =====================================================
// [MODULE: POPCYCLE_WORKSPACE]
// IndexedDB persistence for the Popcycle Visual Map Editor.
//
// Saves:
// - Original and edited Popcycle data
// - Selected schedule, hour, and batch time-slot checkboxes
// - Area overrides
// - Map layer, zoom, and pan
// - Search and filter state
// - Loaded Popgroups group-name reference from the main page
//
// The original Windows/GTA file is never overwritten silently.
// Use Export Edited DAT to create the installable file.
// =====================================================

const POPCYCLE_WORKSPACE_DB_NAME =
  "gtaTrafficStudioDB";

const POPCYCLE_WORKSPACE_DB_VERSION = 1;
const POPCYCLE_WORKSPACE_STORE_NAME = "workspace";

const POPCYCLE_WORKSPACE_RECORD_KEY =
  "popcycleVisualWorkspace";

const POPCYCLE_MAIN_POPGROUPS_RECORD_KEY =
  "recentPopgroupsProject";

let popcycleWorkspaceDatabase = null;
let popcycleWorkspaceAvailable = false;
let popcycleWorkspacePersistent = false;
let popcycleWorkspaceLastSavedAt = null;
let popcycleWorkspaceSaveTimer = null;

// =====================================================
// [SECTION: POPCYCLE_INDEXEDDB_CORE]
// Opens and accesses the shared GTA Traffic workspace store.
// =====================================================

function openPopcycleWorkspaceDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(
        new Error(
          "IndexedDB is not supported by this browser."
        )
      );
      return;
    }

    const request = indexedDB.open(
      POPCYCLE_WORKSPACE_DB_NAME,
      POPCYCLE_WORKSPACE_DB_VERSION
    );

    request.onupgradeneeded = event => {
      const database =
        event.target.result;

      if (
        !database.objectStoreNames.contains(
          POPCYCLE_WORKSPACE_STORE_NAME
        )
      ) {
        database.createObjectStore(
          POPCYCLE_WORKSPACE_STORE_NAME,
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
        new Error(
          "Could not open the Popcycle workspace database."
        )
      );
    };

    request.onblocked = () => {
      reject(
        new Error(
          "Workspace storage is blocked by another open GTA Traffic tab."
        )
      );
    };
  });
}

function getPopcycleWorkspaceStore(
  mode = "readonly"
) {
  if (!popcycleWorkspaceDatabase) {
    throw new Error(
      "Popcycle workspace database is not open."
    );
  }

  return popcycleWorkspaceDatabase
    .transaction(
      POPCYCLE_WORKSPACE_STORE_NAME,
      mode
    )
    .objectStore(
      POPCYCLE_WORKSPACE_STORE_NAME
    );
}

function popcycleWorkspacePut(
  key,
  data
) {
  return new Promise((resolve, reject) => {
    try {
      const request =
        getPopcycleWorkspaceStore(
          "readwrite"
        ).put({
          key,
          data,
          savedAt:
            new Date().toISOString()
        });

      request.onsuccess = () =>
        resolve(request.result);

      request.onerror = () =>
        reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function popcycleWorkspaceGet(key) {
  return new Promise((resolve, reject) => {
    try {
      const request =
        getPopcycleWorkspaceStore(
          "readonly"
        ).get(key);

      request.onsuccess = () =>
        resolve(request.result || null);

      request.onerror = () =>
        reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function popcycleWorkspaceDelete(key) {
  return new Promise((resolve, reject) => {
    try {
      const request =
        getPopcycleWorkspaceStore(
          "readwrite"
        ).delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

async function initializePopcycleWorkspaceStorage() {
  try {
    popcycleWorkspaceDatabase =
      await openPopcycleWorkspaceDatabase();

    popcycleWorkspaceAvailable = true;

    if (navigator.storage?.persist) {
      try {
        popcycleWorkspacePersistent =
          await navigator.storage.persist();
      } catch (error) {
        console.info(
          "Persistent storage request was unavailable.",
          error
        );
      }
    }

    await loadInstalledPopgroupsReference();
    renderPopcycleWorkspaceStatus();
    return true;
  } catch (error) {
    popcycleWorkspaceAvailable = false;

    console.error(
      "Popcycle workspace storage unavailable.",
      error
    );

    renderPopcycleWorkspaceStatus(
      "Automatic saving is unavailable. Open the site through localhost or check browser storage permissions.",
      true
    );

    return false;
  }
}

// [END SECTION: POPCYCLE_INDEXEDDB_CORE]

// =====================================================
// [SECTION: POPCYCLE_WORKSPACE_SNAPSHOT]
// Builds a serializable snapshot from the current editor state.
// =====================================================

function buildPopcycleWorkspaceSnapshot() {
  if (!popcycleState.current) {
    return null;
  }

  ensurePopcycleBatchState?.();
  ensurePopcycleMapState?.();

  return {
    format: "gta-traffic-popcycle-workspace",
    version: 2,
    originalFileName:
      popcycleState.originalFileName,
    originalText:
      popcycleState.originalText,
    selectedScheduleName:
      popcycleState.selectedScheduleName,
    selectedRowIndex:
      popcycleState.selectedRowIndex,
    selectedRowIndexes:
      Array.from(
        popcycleState.selectedRowIndexes || []
      ),
    batchVehicleGroupName:
      popcycleState.batchVehicleGroupName || "VEH_COPCAR",
    batchVehicleGroupWeight:
      Number(popcycleState.batchVehicleGroupWeight) || 0,
    batchPreserveTotal:
      popcycleState.batchPreserveTotal !== false,
    areaOverrides:
      clonePopcycleModel(
        popcycleState.areaOverrides || {}
      ),
    search:
      popcycleState.search || "",
    filter:
      popcycleState.filter || "all",
    mapLayer:
      popcycleState.mapLayer || "auto",
    mapViews:
      clonePopcycleModel(
        popcycleState.mapViews || {}
      ),
    installedPopgroupsReference:
      clonePopcycleModel(
        popcycleState.installedPopgroupsReference || {
          vehicles: [],
          peds: [],
          loadedFileName: ""
        }
      ),
    current:
      createEditablePopcycleSnapshot(
        popcycleState.current
      )
  };
}

// [END SECTION: POPCYCLE_WORKSPACE_SNAPSHOT]

// =====================================================
// [SECTION: POPCYCLE_WORKSPACE_SAVE]
// Manual save and debounced autosave.
// =====================================================

async function savePopcycleWorkspaceNow(
  options = {}
) {
  if (!popcycleWorkspaceAvailable) {
    renderPopcycleWorkspaceStatus(
      "Browser workspace storage is unavailable.",
      true
    );
    return false;
  }

  const snapshot =
    buildPopcycleWorkspaceSnapshot();

  if (!snapshot) return false;

  try {
    await popcycleWorkspacePut(
      POPCYCLE_WORKSPACE_RECORD_KEY,
      snapshot
    );

    popcycleWorkspaceLastSavedAt =
      new Date();

    if (!options.silent) {
      renderPopcycleWorkspaceStatus(
        "Popcycle workspace saved now."
      );
    } else {
      renderPopcycleWorkspaceStatus();
    }

    return true;
  } catch (error) {
    console.error(
      "Could not save Popcycle workspace.",
      error
    );

    renderPopcycleWorkspaceStatus(
      "Popcycle autosave failed. Export a workspace backup.",
      true
    );

    return false;
  }
}

function schedulePopcycleWorkspaceSave(
  delay = 600
) {
  clearTimeout(
    popcycleWorkspaceSaveTimer
  );

  popcycleWorkspaceSaveTimer =
    setTimeout(() => {
      savePopcycleWorkspaceNow({
        silent: true
      });
    }, delay);
}

// [END SECTION: POPCYCLE_WORKSPACE_SAVE]

// =====================================================
// [SECTION: POPCYCLE_WORKSPACE_RESTORE]
// Restores the latest saved editor session automatically.
// =====================================================

async function restorePopcycleWorkspace() {
  if (!popcycleWorkspaceAvailable) {
    return false;
  }

  try {
    const record =
      await popcycleWorkspaceGet(
        POPCYCLE_WORKSPACE_RECORD_KEY
      );

    if (!record?.data) {
      return migrateLegacyPopcycleDraft();
    }

    const workspace = record.data;

    if (
      !workspace.originalText ||
      !workspace.current
    ) {
      return false;
    }

    const parsedOriginal =
      parsePopcycleText(
        workspace.originalText,
        workspace.originalFileName ||
          "popcycle.dat"
      );

    parsedOriginal.originalSnapshot =
      clonePopcycleModel(
        parsedOriginal
      );

    popcycleState.current =
      parsedOriginal;

    restoreEditablePopcycleSnapshot(
      workspace.current
    );

    popcycleState.originalText =
      workspace.originalText;

    popcycleState.originalFileName =
      workspace.originalFileName ||
      "popcycle.dat";

    popcycleState.selectedScheduleName =
      workspace.selectedScheduleName ||
      popcycleState.current.order[0] ||
      "";

    popcycleState.selectedRowIndex =
      Number.isInteger(
        workspace.selectedRowIndex
      )
        ? workspace.selectedRowIndex
        : 0;

    popcycleState.selectedRowIndexes =
      Array.isArray(
        workspace.selectedRowIndexes
      )
        ? workspace.selectedRowIndexes
        : [popcycleState.selectedRowIndex];

    popcycleState.batchVehicleGroupName =
      workspace.batchVehicleGroupName || "VEH_COPCAR";

    popcycleState.batchVehicleGroupWeight =
      Number.isFinite(Number(workspace.batchVehicleGroupWeight))
        ? Number(workspace.batchVehicleGroupWeight)
        : 5;

    popcycleState.batchPreserveTotal =
      workspace.batchPreserveTotal !== false;

    popcycleState.areaOverrides =
      clonePopcycleModel(
        workspace.areaOverrides || {}
      );

    popcycleState.search =
      workspace.search || "";

    popcycleState.filter =
      workspace.filter || "all";

    popcycleState.mapLayer =
      workspace.mapLayer || "auto";

    popcycleState.mapViews =
      clonePopcycleModel(
        workspace.mapViews || {}
      );

    if (
      workspace.installedPopgroupsReference &&
      !popcycleState.installedPopgroupsReference
        ?.vehicles?.length
    ) {
      popcycleState.installedPopgroupsReference =
        clonePopcycleModel(
          workspace.installedPopgroupsReference
        );
    }

    popcycleState.history = [];
    popcycleState.future = [];

    const searchInput =
      document.getElementById(
        "popcycleScheduleSearch"
      );

    const filterSelect =
      document.getElementById(
        "popcycleScheduleFilter"
      );

    if (searchInput) {
      searchInput.value =
        popcycleState.search;
    }

    if (filterSelect) {
      filterSelect.value =
        popcycleState.filter;
    }

    popcycleWorkspaceLastSavedAt =
      record.savedAt
        ? new Date(record.savedAt)
        : new Date();

    runPopcycleValidation();
    renderAllPopcycleSections();
    renderPopcycleMapLayerButtons?.();

    renderPopcycleFileStatus(
      `Restored ${popcycleState.originalFileName}: ${popcycleState.current.order.length} schedules.`
    );

    renderPopcycleWorkspaceStatus(
      "Saved Popcycle workspace restored automatically."
    );

    return true;
  } catch (error) {
    console.error(
      "Could not restore Popcycle workspace.",
      error
    );

    renderPopcycleWorkspaceStatus(
      "Saved Popcycle workspace could not be restored.",
      true
    );

    return false;
  }
}

function migrateLegacyPopcycleDraft() {
  const raw =
    localStorage.getItem(
      POPCYCLE_DRAFT_KEY
    );

  if (!raw) return false;

  try {
    const draft = JSON.parse(raw);

    const parsedOriginal =
      parsePopcycleText(
        draft.originalText,
        draft.originalFileName
      );

    parsedOriginal.originalSnapshot =
      clonePopcycleModel(
        parsedOriginal
      );

    popcycleState.current =
      parsedOriginal;

    restoreEditablePopcycleSnapshot(
      draft.current
    );

    popcycleState.originalText =
      draft.originalText;

    popcycleState.originalFileName =
      draft.originalFileName;

    popcycleState.selectedScheduleName =
      draft.selectedScheduleName ||
      parsedOriginal.order[0] ||
      "";

    popcycleState.selectedRowIndex =
      draft.selectedRowIndex ?? 0;

    popcycleState.selectedRowIndexes = [
      popcycleState.selectedRowIndex
    ];

    popcycleState.areaOverrides =
      clonePopcycleModel(
        draft.areaOverrides || {}
      );

    popcycleState.history = [];
    popcycleState.future = [];

    runPopcycleValidation();
    renderAllPopcycleSections();
    schedulePopcycleWorkspaceSave(50);

    renderPopcycleWorkspaceStatus(
      "Older local draft restored and migrated to IndexedDB."
    );

    return true;
  } catch (error) {
    console.warn(
      "Could not migrate old Popcycle draft.",
      error
    );

    return false;
  }
}

// [END SECTION: POPCYCLE_WORKSPACE_RESTORE]

// =====================================================
// [SECTION: INSTALLED_POPGROUPS_REFERENCE]
// Reads the most recently saved Popgroups project from the
// main page so group datalists include installed group names.
// =====================================================

async function loadInstalledPopgroupsReference() {
  popcycleState.installedPopgroupsReference = {
    vehicles: [],
    peds: [],
    loadedFileName: ""
  };

  if (!popcycleWorkspaceAvailable) {
    return;
  }

  try {
    const record =
      await popcycleWorkspaceGet(
        POPCYCLE_MAIN_POPGROUPS_RECORD_KEY
      );

    const project = record?.data;

    if (!project?.parsedData) {
      return;
    }

    popcycleState.installedPopgroupsReference = {
      vehicles:
        (project.parsedData.vehicles || [])
          .map(group => group.name)
          .filter(Boolean)
          .sort((a, b) =>
            a.localeCompare(b)
          ),

      peds:
        (project.parsedData.peds || [])
          .map(group => group.name)
          .filter(Boolean)
          .sort((a, b) =>
            a.localeCompare(b)
          ),

      loadedFileName:
        project.loadedFileName ||
        "Saved Popgroups"
    };
  } catch (error) {
    console.warn(
      "Could not load saved Popgroups group references.",
      error
    );
  }
}

async function refreshInstalledPopgroupsReference() {
  await loadInstalledPopgroupsReference();
  renderPopcycleBatchEditor?.();
  renderPopcycleEditor?.();
  renderPopcycleWorkspaceStatus(
    "Installed Popgroups group reference refreshed."
  );
  schedulePopcycleWorkspaceSave();
}

// [END SECTION: INSTALLED_POPGROUPS_REFERENCE]

// =====================================================
// [SECTION: POPCYCLE_WORKSPACE_BACKUP]
// Portable JSON export/import for Popcycle work.
// =====================================================

async function exportPopcycleWorkspaceBackup() {
  await savePopcycleWorkspaceNow({
    silent: true
  });

  const snapshot =
    buildPopcycleWorkspaceSnapshot();

  if (!snapshot) return;

  const backup = {
    ...snapshot,
    exportedAt:
      new Date().toISOString()
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download =
    `gta_traffic_popcycle_workspace_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

  anchor.click();
  URL.revokeObjectURL(url);

  renderPopcycleWorkspaceStatus(
    "Popcycle workspace backup exported."
  );
}

function openPopcycleWorkspaceImportPicker() {
  document
    .getElementById(
      "popcycleWorkspaceImportPicker"
    )
    ?.click();
}

function importPopcycleWorkspaceBackup(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async event => {
    try {
      const backup =
        JSON.parse(
          event.target.result
        );

      if (
        backup.format !==
          "gta-traffic-popcycle-workspace" ||
        !backup.originalText ||
        !backup.current
      ) {
        alert(
          "This is not a valid GTA Traffic Popcycle workspace backup."
        );
        return;
      }

      await popcycleWorkspacePut(
        POPCYCLE_WORKSPACE_RECORD_KEY,
        backup
      );

      await restorePopcycleWorkspace();

      renderPopcycleWorkspaceStatus(
        "Popcycle workspace backup imported and restored."
      );
    } catch (error) {
      console.error(
        "Could not import Popcycle workspace.",
        error
      );

      alert(
        "Could not import the Popcycle workspace JSON."
      );
    }
  };

  reader.onerror = () => {
    alert(
      "Could not read the Popcycle workspace file."
    );
  };

  reader.readAsText(file);
}

async function clearSavedPopcycleWorkspace() {
  if (
    !confirm(
      "Clear the saved Popcycle workspace? The current page will return to Stock Traffic. Export a workspace backup first if these edits matter."
    )
  ) {
    return;
  }

  if (popcycleWorkspaceAvailable) {
    await popcycleWorkspaceDelete(
      POPCYCLE_WORKSPACE_RECORD_KEY
    );
  }

  localStorage.removeItem(
    POPCYCLE_DRAFT_KEY
  );

  popcycleWorkspaceLastSavedAt = null;
  loadStockTrafficBase();

  renderPopcycleWorkspaceStatus(
    "Saved Popcycle workspace cleared."
  );
}

// [END SECTION: POPCYCLE_WORKSPACE_BACKUP]

// =====================================================
// [SECTION: POPCYCLE_WORKSPACE_STATUS]
// Displays autosave, file, group reference, and storage state.
// =====================================================

function formatPopcycleWorkspaceTime(value) {
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

function renderPopcycleWorkspaceStatus(
  message = "",
  isWarning = false
) {
  const host =
    document.getElementById(
      "popcycleWorkspaceStatus"
    );

  if (!host) return;

  const reference =
    popcycleState.installedPopgroupsReference || {
      vehicles: [],
      peds: []
    };

  host.innerHTML = `
    <div class="pc-workspace-status-grid">
      <div>
        <small>Current DAT</small>
        <strong>${escapePopcycleHTML(popcycleState.originalFileName || "None")}</strong>
      </div>

      <div>
        <small>Last autosave</small>
        <strong>${escapePopcycleHTML(formatPopcycleWorkspaceTime(popcycleWorkspaceLastSavedAt))}</strong>
      </div>

      <div>
        <small>Installed VEH groups</small>
        <strong>${reference.vehicles.length.toLocaleString()}</strong>
      </div>

      <div>
        <small>Storage</small>
        <strong class="${popcycleWorkspaceAvailable ? "saved" : "warning"}">
          ${
            popcycleWorkspaceAvailable
              ? popcycleWorkspacePersistent
                ? "Persistent"
                : "Browser local"
              : "Unavailable"
          }
        </strong>
      </div>
    </div>

    ${
      message
        ? `<div class="pc-workspace-message ${isWarning ? "warning" : "saved"}">${escapePopcycleHTML(message)}</div>`
        : ""
    }
  `;
}

// [END SECTION: POPCYCLE_WORKSPACE_STATUS]

// [END MODULE: POPCYCLE_WORKSPACE]
