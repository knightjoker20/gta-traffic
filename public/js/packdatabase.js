// =====================================================
// MOD PACK DATABASE
// Local pack tracking using browser localStorage.
// Stores packs and maps vehicle spawn names to pack IDs.
// =====================================================

function makePackId(name, dlc) {
  const base = `${name || "pack"}_${dlc || ""}`;

  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || `pack_${Date.now()}`;
}

function createOrUpdatePack() {
  const name = els.packNameInput.value.trim();
  const creator = els.packCreatorInput.value.trim();
  const dlcFolder = els.packDlcInput.value.trim();
  const version = els.packVersionInput.value.trim();
  const website = els.packWebsiteInput.value.trim();
  const notes = els.packNotesInput.value.trim();

  if (!name) {
    alert("Pack name is required.");
    return;
  }

  const id = activePackId || makePackId(name, dlcFolder);

  packDatabase.packs[id] = {
    id,
    name,
    creator,
    dlcFolder,
    version,
    website,
    notes,
    updatedAt: new Date().toISOString()
  };

  activePackId = id;

  savePackDatabase();
  updateActivePackBox();
  renderPackList();
  renderSection(currentSection);
  renderVehicleLibrary();

  els.packStatus.innerHTML = `<span class="saved">Saved and selected pack: ${escapeHTML(name)}</span>`;

  if (typeof scheduleWorkspaceUiSave === "function") {
    scheduleWorkspaceUiSave();
  }
}

function selectPack(id) {
  const pack = packDatabase.packs[id];
  if (!pack) return;

  activePackId = id;

  els.packNameInput.value = pack.name || "";
  els.packCreatorInput.value = pack.creator || "";
  els.packDlcInput.value = pack.dlcFolder || "";
  els.packVersionInput.value = pack.version || "";
  els.packWebsiteInput.value = pack.website || "";
  els.packNotesInput.value = pack.notes || "";

  updateActivePackBox();
  renderPackList();

  if (typeof scheduleWorkspaceUiSave === "function") {
    scheduleWorkspaceUiSave();
  }
}

function clearActivePack() {
  activePackId = null;

  els.packNameInput.value = "";
  els.packCreatorInput.value = "";
  els.packDlcInput.value = "";
  els.packVersionInput.value = "";
  els.packWebsiteInput.value = "";
  els.packNotesInput.value = "";

  updateActivePackBox();
  renderPackList();

  els.packStatus.innerHTML = `<span class="saved">No active pack selected.</span>`;

  if (typeof scheduleWorkspaceUiSave === "function") {
    scheduleWorkspaceUiSave();
  }
}

function deletePack(id) {
  const pack = packDatabase.packs[id];
  if (!pack) return;

  if (!confirm(`Delete pack "${pack.name}"? Vehicle assignments to this pack will be removed.`)) return;

  delete packDatabase.packs[id];

  Object.keys(packDatabase.vehiclePackMap).forEach(model => {
    if (packDatabase.vehiclePackMap[model] === id) {
      delete packDatabase.vehiclePackMap[model];
    }
  });

  if (activePackId === id) activePackId = null;

  savePackDatabase();
  updateActivePackBox();
  renderPackList();
  renderSection(currentSection);
  renderVehicleLibrary();
}

function assignVehicleToActivePack(model) {
  if (!activePackId) {
    alert("Select or create an active pack first.");
    return;
  }

  packDatabase.vehiclePackMap[model.toLowerCase()] = activePackId;

  savePackDatabase();
  renderSection(currentSection);
  renderVehicleLibrary();
  renderPackList();
}

function unassignVehiclePack(model) {
  delete packDatabase.vehiclePackMap[model.toLowerCase()];

  savePackDatabase();
  renderSection(currentSection);
  renderVehicleLibrary();
  renderPackList();
}

function getPackForModel(model) {
  const packId = packDatabase.vehiclePackMap[model.toLowerCase()];
  if (!packId) return null;

  return packDatabase.packs[packId] || null;
}

function getVehiclesForPack(packId) {
  return Object.keys(packDatabase.vehiclePackMap)
    .filter(model => packDatabase.vehiclePackMap[model] === packId)
    .sort();
}

function updateActivePackBox() {
  if (!activePackId || !packDatabase.packs[activePackId]) {
    els.activePackBox.textContent = "Active pack: none. Meta imports will be unassigned.";
    return;
  }

  const pack = packDatabase.packs[activePackId];

  els.activePackBox.innerHTML =
    `Active pack: <strong>${escapeHTML(pack.name)}</strong>` +
    (pack.dlcFolder ? ` · DLC: ${escapeHTML(pack.dlcFolder)}` : "");
}

function savePackDatabase() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packDatabase));
  schedulePackCloudSync();
}

let packCloudSyncTimer = null;
let packCloudSyncInFlight = false;
let packCloudSyncQueued = false;

function hasStoredLibraryWriteToken() {
  try {
    return Boolean(
      localStorage.getItem("gtaTrafficLibraryWriteToken")
    );
  } catch {
    return false;
  }
}

function schedulePackCloudSync() {
  if (!hasStoredLibraryWriteToken()) {
    return;
  }

  clearTimeout(packCloudSyncTimer);

  packCloudSyncTimer = setTimeout(() => {
    syncPackDatabaseToCloud({ quiet: true });
  }, 800);
}

async function syncPackDatabaseToCloud(options = {}) {
  const quiet = options.quiet === true;
  const force = options.force === true;

  if (!window.vehicleCloud?.importPackDatabaseToCloud) {
    if (!quiet && els?.packStatus) {
      els.packStatus.innerHTML =
        '<span class="warning">Cloud pack sync is not available on this page.</span>';
    }

    return {
      ok: false,
      skipped: true,
      reason: "cloud-service-unavailable"
    };
  }

  if (!force && !hasStoredLibraryWriteToken()) {
    return {
      ok: false,
      skipped: true,
      reason: "missing-library-token"
    };
  }

  const packCount = Object.keys(packDatabase.packs || {}).length;

  if (packCount === 0) {
    return {
      ok: false,
      skipped: true,
      reason: "no-packs"
    };
  }

  if (packCloudSyncInFlight) {
    packCloudSyncQueued = true;

    return {
      ok: false,
      skipped: true,
      reason: "sync-in-flight"
    };
  }

  packCloudSyncInFlight = true;

  if (!quiet && els?.packStatus) {
    els.packStatus.innerHTML =
      '<span class="saved">Syncing Pack Tracker to cloud...</span>';
  }

  try {
    const result =
      await window.vehicleCloud.importPackDatabaseToCloud(
        packDatabase,
        {
          workspaceId: "default",
          sourceType: "pack-tracker",
          sourceLabel: "Pack Tracker"
        }
      );

    if (!quiet && els?.packStatus) {
      els.packStatus.innerHTML =
        '<span class="saved">Pack Tracker synced to cloud: ' +
        result.packsImported +
        ' pack(s), ' +
        result.membershipsImported +
        ' vehicle assignment(s).</span>';
    }

    return result;
  } catch (error) {
    console.warn("Pack Tracker cloud sync failed.", error);

    if (!quiet && els?.packStatus) {
      els.packStatus.innerHTML =
        '<span class="warning">Pack cloud sync failed: ' +
        escapeHTML(error.message || "Unknown error") +
        '</span>';
    }

    return {
      ok: false,
      error
    };
  } finally {
    packCloudSyncInFlight = false;

    if (packCloudSyncQueued) {
      packCloudSyncQueued = false;
      schedulePackCloudSync();
    }
  }
}

window.syncPackDatabaseToCloud = syncPackDatabaseToCloud;


function loadPackDatabase() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    if (data.packs && data.vehiclePackMap) {
      packDatabase = data;
    }
  } catch (err) {
    console.warn("Could not load pack database", err);
  }
}

function downloadPackDatabase() {
  const blob = new Blob([JSON.stringify(packDatabase, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "gta_traffic_studio_pack_database.json";
  a.click();

  URL.revokeObjectURL(url);
}

function importPackDatabase(file) {
  const reader = new FileReader();

  reader.onload = event => {
    try {
      const imported = JSON.parse(event.target.result);

      if (!imported.packs || !imported.vehiclePackMap) {
        alert("Invalid pack database JSON.");
        return;
      }

      packDatabase = imported;

      savePackDatabase();

      activePackId = null;

      updateActivePackBox();
      renderPackList();
      renderSection(currentSection);
      renderVehicleLibrary();

      els.packStatus.innerHTML = `<span class="saved">Pack database imported.</span>`;
    } catch (err) {
      alert("Could not import pack database JSON.");
      console.error(err);
    }
  };

  reader.readAsText(file);
}
