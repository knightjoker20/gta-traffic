// =====================================================
// [MODULE: POPCYCLE_APP]
// Initializes references, visual maps, controls, IndexedDB
// workspace saving, and automatic workspace restoration.
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initializePopcycleReferences();
    initializePopcycleAreaMap();
    renderPopcyclePresets();

    bindPopcyclePageControls();

    const storageReady =
      await initializePopcycleWorkspaceStorage();

    let restored = false;

    if (storageReady) {
      restored =
        await restorePopcycleWorkspace();
    }

    if (!restored) {
      loadStockTrafficBase();
      renderPopcycleWorkspaceStatus(
        storageReady
          ? "Stock Traffic loaded. Changes will autosave locally."
          : "Stock Traffic loaded without automatic workspace storage.",
        !storageReady
      );
    }

    renderPopcycleToolbarState();
    renderPopcycleBatchEditor();
    renderPopcycleAreaMap();
  }
);

function bindPopcyclePageControls() {
  const filePicker =
    document.getElementById(
      "popcycleFilePicker"
    );

  const scheduleSearch =
    document.getElementById(
      "popcycleScheduleSearch"
    );

  const scheduleFilter =
    document.getElementById(
      "popcycleScheduleFilter"
    );

  filePicker?.addEventListener(
    "change",
    event => {
      const file =
        event.target.files[0];

      if (file) {
        loadPopcycleFile(file);
      }

      filePicker.value = "";
    }
  );

  scheduleSearch?.addEventListener(
    "input",
    event => {
      setPopcycleSearch(
        event.target.value
      );
    }
  );

  scheduleFilter?.addEventListener(
    "change",
    event => {
      setPopcycleFilter(
        event.target.value
      );
    }
  );
}

// [END MODULE: POPCYCLE_APP]
