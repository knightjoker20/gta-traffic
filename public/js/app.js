// =====================================================
// [MODULE: APP_STARTUP]
// Wires DOM elements, events, existing databases, IndexedDB
// workspace restoration, and the initial page render.
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
  els = {
    popgroupsDropZone: document.getElementById("popgroupsDropZone"),
    popgroupsFilePicker: document.getElementById("popgroupsFilePicker"),
    metaDropZone: document.getElementById("metaDropZone"),
    metaFilePicker: document.getElementById("metaFilePicker"),
    packDbImport: document.getElementById("packDbImport"),

    assetDropZone: document.getElementById("assetDropZone"),
    assetFilePicker: document.getElementById("assetFilePicker"),
    assetFolderPicker: document.getElementById("assetFolderPicker"),
    assetDbImport: document.getElementById("assetDbImport"),
    assetStatus: document.getElementById("assetStatus"),
    assetSummary: document.getElementById("assetSummary"),

    workspaceBackupImport:
      document.getElementById("workspaceBackupImport"),

    status: document.getElementById("status"),
    metaStatus: document.getElementById("metaStatus"),
    packStatus: document.getElementById("packStatus"),
    stats: document.getElementById("stats"),

    results: document.getElementById("results"),
    searchBox: document.getElementById("searchBox"),
    librarySearchBox: document.getElementById("librarySearchBox"),
    packSearchBox: document.getElementById("packSearchBox"),
    sectionTitle: document.getElementById("sectionTitle"),
    vehicleLibrary: document.getElementById("vehicleLibrary"),
    packList: document.getElementById("packList"),
    activePackBox: document.getElementById("activePackBox"),

    packNameInput: document.getElementById("packNameInput"),
    packCreatorInput: document.getElementById("packCreatorInput"),
    packDlcInput: document.getElementById("packDlcInput"),
    packVersionInput: document.getElementById("packVersionInput"),
    packWebsiteInput: document.getElementById("packWebsiteInput"),
    packNotesInput: document.getElementById("packNotesInput")
  };

  setupDropZone(els.popgroupsDropZone, handlePopgroupsFile);

  if (els.popgroupsFilePicker) {
    els.popgroupsFilePicker.addEventListener("change", event => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      handlePopgroupsFile(file);
      els.popgroupsFilePicker.value = "";
    });
  }
  setupDropZone(els.metaDropZone, handleVehicleMetaFile);
  setupAssetDropZone(els.assetDropZone);

  els.searchBox.addEventListener("input", () => {
    renderSection(currentSection);
    schedulePopgroupsProjectSave();
    scheduleWorkspaceUiSave();
  });

  els.librarySearchBox.addEventListener("input", () => {
    renderVehicleLibrary();
    scheduleWorkspaceUiSave();
  });

  els.packSearchBox.addEventListener("input", () => {
    renderPackList();
    scheduleWorkspaceUiSave();
  });

  els.metaFilePicker.addEventListener("change", event => {
    Array.from(event.target.files)
      .forEach(file => handleVehicleMetaFile(file));

    els.metaFilePicker.value = "";
  });

  els.packDbImport.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    importPackDatabase(file);
    els.packDbImport.value = "";
  });

  els.assetFilePicker.addEventListener("change", event => {
    scanVehicleAssetFiles(Array.from(event.target.files));
    els.assetFilePicker.value = "";
  });

  els.assetFolderPicker.addEventListener("change", event => {
    scanVehicleAssetFiles(Array.from(event.target.files));
    els.assetFolderPicker.value = "";
  });

  els.assetDbImport.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    importVehicleAssetDatabase(file);
    els.assetDbImport.value = "";
  });

  els.workspaceBackupImport.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    importWorkspaceBackup(file);
    els.workspaceBackupImport.value = "";
  });

  // Existing databases are restored first because the workspace
  // UI state may reference an active pack.
  loadPackDatabase();
  loadVehicleAssetDatabase();

  await initializeWorkspaceStorage();
  const restored = await restoreSavedWorkspace();

  refreshMainPageAfterWorkspaceRestore();

  const restoredParts = [];

  if (restored.vehicleMetaRestored) {
    restoredParts.push(
      `${Object.keys(vehicleMeta).length.toLocaleString()} metadata entries`
    );
  }

  if (restored.popgroupsRestored) {
    restoredParts.push(`${loadedFileName}.xml`);
  }

  renderWorkspaceStatus(
    restoredParts.length
      ? `Restored ${restoredParts.join(" and ")}.`
      : "Workspace storage is ready. Load files once and they will restore automatically."
  );
});

// [END MODULE: APP_STARTUP]
