// =====================================================
// [MODULE: POPCYCLE_APP]
// Initializes references, visual maps, controls, IndexedDB
// workspace saving, and automatic workspace restoration.
// =====================================================

const PC_SIDEBAR_COLLAPSE_STORAGE_KEY = "pcSchedulesSidebarExpanded";

function setPcSidebarCollapsed(collapsed) {
  const sidebar = document.querySelector(".pc-sidebar");
  const workspace = document.querySelector(".pc-workspace");
  const toggle = document.getElementById("pcSidebarCollapseToggle");

  sidebar?.classList.toggle("pc-sidebar-collapsed", collapsed);
  workspace?.classList.toggle("pc-sidebar-collapsed", collapsed);

  if (toggle) {
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.title = collapsed ? "Expand schedules panel" : "Collapse schedules panel";
  }
}

function initPcSidebarCollapse() {
  const toggle = document.getElementById("pcSidebarCollapseToggle");
  if (!toggle) return;

  // Collapsed by default; remembers the user's choice after that -
  // same behavior as the Vehicle Library panel on popgroups.html.
  const savedExpanded = localStorage.getItem(PC_SIDEBAR_COLLAPSE_STORAGE_KEY);
  setPcSidebarCollapsed(savedExpanded !== "true");

  toggle.addEventListener("click", () => {
    const isCollapsed = document.querySelector(".pc-sidebar")?.classList.contains("pc-sidebar-collapsed");
    setPcSidebarCollapsed(!isCollapsed);
    localStorage.setItem(PC_SIDEBAR_COLLAPSE_STORAGE_KEY, String(isCollapsed));
  });
}

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initializePopcycleReferences();
    initializePopcycleAreaMap();
    renderPopcyclePresets();

    bindPopcyclePageControls();
    initPcSidebarCollapse();

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
