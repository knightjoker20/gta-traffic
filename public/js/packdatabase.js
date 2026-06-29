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
window.manualSyncPackDatabaseToCloud = manualSyncPackDatabaseToCloud;
window.resetPackCloudToken = resetPackCloudToken;
window.refreshPackCloudSummary = refreshPackCloudSummary;

setTimeout(() => refreshPackCloudSummary({ quiet: true }), 0);

function getPackCloudStatusHost() {
  return document.getElementById("packCloudStatus") || els?.packStatus || null;
}

function setPackCloudStatus(message, tone = "") {
  const host = getPackCloudStatusHost();

  if (!host) {
    return;
  }

  const className = tone || "saved";

  host.innerHTML =
    '<span class="' +
    className +
    '">' +
    escapeHTML(message) +
    "</span>";
}

function getCloudPackAssignmentCount(pack) {
  return Number(
    pack.vehicleCount ||
    pack.membershipCount ||
    pack.vehicle_count ||
    0
  ) || 0;
}

async function refreshPackCloudSummary(options = {}) {
  const quiet = options.quiet === true;
  const host = getPackCloudStatusHost();

  if (!host) {
    return {
      ok: false,
      skipped: true,
      reason: "missing-status-host"
    };
  }

  if (!window.vehicleCloud?.getPacks) {
    setPackCloudStatus(
      "Cloud pack summary is not available in this build.",
      "warning"
    );

    return {
      ok: false,
      skipped: true,
      reason: "cloud-pack-summary-unavailable"
    };
  }

  if (!quiet) {
    setPackCloudStatus("Checking cloud Pack Tracker status...");
  }

  try {
    const packs =
      await window.vehicleCloud.getPacks({
        workspaceId: "default"
      });

    const assignmentCount =
      packs.reduce(
        (total, pack) =>
          total + getCloudPackAssignmentCount(pack),
        0
      );

    setPackCloudStatus(
      "Cloud Pack Tracker: " +
      packs.length +
      " pack(s), " +
      assignmentCount +
      " vehicle assignment(s)."
    );

    return {
      ok: true,
      packs,
      assignmentCount
    };
  } catch (error) {
    console.warn("Cloud Pack Tracker summary failed.", error);

    setPackCloudStatus(
      "Cloud Pack Tracker summary failed: " +
      (error.message || "Unknown error"),
      "warning"
    );

    return {
      ok: false,
      error
    };
  }
}

async function manualSyncPackDatabaseToCloud() {
  const localPackCount =
    Object.keys(packDatabase.packs || {}).length;

  const localAssignmentCount =
    Object.keys(packDatabase.vehiclePackMap || {}).length;

  if (!localPackCount) {
    setPackCloudStatus(
      "No local Pack Tracker records to sync yet. Create/import a pack first, then sync to cloud.",
      "warning"
    );

    await refreshPackCloudSummary({
      quiet: true
    });

    return {
      ok: false,
      skipped: true,
      reason: "no-local-packs"
    };
  }

  setPackCloudStatus(
    "Syncing " +
    localPackCount +
    " local pack(s) and " +
    localAssignmentCount +
    " vehicle assignment(s) to cloud..."
  );

  const result =
    await syncPackDatabaseToCloud({
      force: true,
      quiet: false
    });

  if (result?.ok) {
    await refreshPackCloudSummary({
      quiet: true
    });
  } else if (result?.reason === "missing-library-token") {
    setPackCloudStatus(
      "Cloud sync needs your library write token before it can upload.",
      "warning"
    );
  } else if (result?.reason === "no-packs") {
    setPackCloudStatus(
      "No local Pack Tracker records to sync yet. Create/import a pack first, then sync to cloud.",
      "warning"
    );
  }

  return result;
}

function resetPackCloudToken() {
  try {
    localStorage.removeItem("gtaTrafficLibraryWriteToken");
  } catch {
    // Ignore localStorage errors.
  }

  window.vehicleCloud?.clearLibraryWriteToken?.();

  setPackCloudStatus(
    "Library write token cleared. Click Sync Pack DB to Cloud to enter it again.",
    "warning"
  );
}




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


function packBuilderEscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPackBuilderValueFromJson(packJson, keys, fallback = "") {
  for (const key of keys) {
    const value = packJson?.[key];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return fallback;
}

function getPackBuilderVehiclesFromJson(packJson) {
  const possibleLists = [
    packJson?.vehicles,
    packJson?.vehicleModels,
    packJson?.models,
    packJson?.entries,
    packJson?.items,
    packJson?.pack?.vehicles,
    packJson?.pack?.vehicleModels
  ];

  const list = possibleLists.find(value => Array.isArray(value)) || [];

  return Array.from(
    new Set(
      list
        .map(vehicle => {
          if (typeof vehicle === "string") {
            return vehicle.trim();
          }

          return (
            vehicle?.modelName ||
            vehicle?.model_name ||
            vehicle?.model ||
            vehicle?.name ||
            vehicle?.vehicle ||
            ""
          )
            .toString()
            .trim();
        })
        .filter(Boolean)
    )
  );
}

function packBuilderVehicleModelsToFileList(models) {
  return models
    .map(model => {
      const cleanModel = String(model || "").trim();

      if (!cleanModel) {
        return "";
      }

      return [
        cleanModel + ".yft",
        cleanModel + "_hi.yft",
        cleanModel + ".ytd"
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

async function uploadBuiltPackJsonFromFile(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  const status = document.getElementById("packBuilderStatus");

  if (!file) {
    return;
  }

  try {
    const rawText = await file.text();
    const packJson = JSON.parse(rawText);

    const packName = getPackBuilderValueFromJson(packJson, [
      "packName",
      "name",
      "title",
      "pack_name"
    ], file.name.replace(/\.json$/i, ""));

    const creator = getPackBuilderValueFromJson(packJson, [
      "creator",
      "author",
      "createdBy"
    ]);

    const dlcName = getPackBuilderValueFromJson(packJson, [
      "dlcName",
      "dlc",
      "dlcFolder",
      "dlcpack",
      "dlcPack",
      "folder"
    ]);

    const version = getPackBuilderValueFromJson(packJson, [
      "version",
      "packVersion"
    ]);

    const website = getPackBuilderValueFromJson(packJson, [
      "website",
      "url",
      "downloadUrl",
      "downloadURL",
      "sourceUrl",
      "sourceURL"
    ]);

    const notes = getPackBuilderValueFromJson(packJson, [
      "notes",
      "description",
      "summary"
    ]);

    const vehicles = getPackBuilderVehiclesFromJson(packJson);

    document.getElementById("builderPackNameInput").value = packName;
    document.getElementById("builderCreatorInput").value = creator;
    document.getElementById("builderDlcInput").value = dlcName;
    document.getElementById("builderVersionInput").value = version;
    document.getElementById("builderWebsiteInput").value = website;
    document.getElementById("builderNotesInput").value = notes;
    document.getElementById("builderFileListInput").value =
      packBuilderVehicleModelsToFileList(vehicles);

    if (typeof buildPackJsonFromFileList === "function") {
      buildPackJsonFromFileList();
    }

    if (status) {
      status.innerHTML =
        '<div class="success">Uploaded JSON pack: <strong>' +
        packBuilderEscapeHtml(packName) +
        '</strong> � ' +
        vehicles.length +
        ' vehicle' +
        (vehicles.length === 1 ? "" : "s") +
        ' loaded into the builder.</div>';
    }
  } catch (error) {
    console.error(error);

    if (status) {
      status.innerHTML =
        '<div class="error">Could not upload JSON pack: ' +
        packBuilderEscapeHtml(error.message || String(error)) +
        '</div>';
    }
  } finally {
    if (input) {
      input.value = "";
    }
  }
}




function getPackBuilderMetaStatus() {
  return document.getElementById("packBuilderStatus");
}

function setPackBuilderMetaStatus(message, type = "success") {
  const status = getPackBuilderMetaStatus();

  if (!status) {
    return;
  }

  status.innerHTML =
    '<div class="' + type + '">' + message + '</div>';
}

function parseVehicleModelsFromVehiclesMeta(metaText) {
  const rawText = String(metaText || "");
  const models = [];
  const seen = new Set();

  const modelRegex = /<modelName>\s*([^<]+?)\s*<\/modelName>/gi;
  let match;

  while ((match = modelRegex.exec(rawText))) {
    const modelName = String(match[1] || "")
      .trim()
      .replace(/\s+/g, "");

    if (
      !modelName ||
      modelName.toLowerCase() === "null" ||
      modelName.toLowerCase() === "none" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(modelName)
    ) {
      continue;
    }

    const key = modelName.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      models.push(modelName);
    }
  }

  return models;
}

function vehicleMetaModelsToBuilderFileList(models) {
  return models
    .map(modelName => {
      const cleanModel = String(modelName || "").trim();

      if (!cleanModel) {
        return "";
      }

      return [
        cleanModel + ".yft",
        cleanModel + "_hi.yft",
        cleanModel + ".ytd"
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

function buildPackJsonFromVehicleMeta() {
  const metaInput = document.getElementById("builderVehicleMetaInput");
  const fileListInput = document.getElementById("builderFileListInput");

  if (!metaInput || !fileListInput) {
    setPackBuilderMetaStatus("vehicles.meta builder inputs were not found.", "error");
    return;
  }

  const metaText = metaInput.value || "";
  const models = parseVehicleModelsFromVehiclesMeta(metaText);

  if (!models.length) {
    setPackBuilderMetaStatus(
      "No vehicle modelName entries were found in the pasted vehicles.meta.",
      "error"
    );
    return;
  }

  fileListInput.value = vehicleMetaModelsToBuilderFileList(models);

  if (typeof buildPackJsonFromFileList === "function") {
    buildPackJsonFromFileList();
  }

  setPackBuilderMetaStatus(
    "Built pack preview from vehicles.meta � " +
      models.length +
      " vehicle" +
      (models.length === 1 ? "" : "s") +
      " detected.",
    "success"
  );
}

async function saveBuiltPackToTrackerAndCloud() {
  const status = getPackBuilderMetaStatus();

  try {
    if (typeof importBuiltPackJson !== "function") {
      throw new Error("Import Into Tracker function is not available.");
    }

    const importResult = importBuiltPackJson();

    if (importResult && typeof importResult.then === "function") {
      await importResult;
    }

    const cloudSyncFunction =
      window.syncPackDatabaseToCloud ||
      window.importPackDatabaseToCloud ||
      window.syncPackDbToCloud;

    if (typeof cloudSyncFunction !== "function") {
      setPackBuilderMetaStatus(
        "Pack imported into tracker. Cloud sync function was not found on this page.",
        "warning"
      );
      return;
    }

    const syncResult = cloudSyncFunction();

    if (syncResult && typeof syncResult.then === "function") {
      await syncResult;
    }

    setPackBuilderMetaStatus(
      "Pack imported into tracker and cloud sync was triggered.",
      "success"
    );
  } catch (error) {
    console.error(error);

    if (status) {
      status.innerHTML =
        '<div class="error">Could not save pack to cloud: ' +
        String(error.message || error) +
        '</div>';
    }
  }
}
