(function () {
  const DEFAULT_PROJECT_TYPE = "popgroups";

  function getTimestampName() {
    const now = new Date();

    return "PopGroups Project " + now.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function cloneCloudValue(value) {
    if (value === undefined) {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
  }

  function countCloudModels(groups) {
    if (!Array.isArray(groups)) {
      return 0;
    }

    return groups.reduce((total, group) => {
      return total + (
        Array.isArray(group.models)
          ? group.models.length
          : 0
      );
    }, 0);
  }

  function getDefaultProjectName() {
    if (
      typeof loadedFileName !== "undefined" &&
      loadedFileName &&
      loadedFileName !== "popgroups"
    ) {
      return "PopGroups - " + loadedFileName;
    }

    return getTimestampName();
  }

  function readLocalStorageSnapshot() {
    const snapshot = {};

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);

      if (!key) {
        continue;
      }

      if (
        key.toLowerCase().includes("gta") ||
        key.toLowerCase().includes("traffic") ||
        key.toLowerCase().includes("workspace") ||
        key.toLowerCase().includes("pop") ||
        key.toLowerCase().includes("vehicle") ||
        key.toLowerCase().includes("pack")
      ) {
        snapshot[key] = localStorage.getItem(key);
      }
    }

    return snapshot;
  }

  function collectPopGroupsCloudPayload() {
    const popgroupsProject =
      typeof buildPopgroupsProjectSnapshot === "function"
        ? buildPopgroupsProjectSnapshot()
        : null;

    if (!popgroupsProject) {
      return null;
    }

    const vehicles =
      Array.isArray(popgroupsProject.parsedData?.vehicles)
        ? popgroupsProject.parsedData.vehicles
        : [];

    const peds =
      Array.isArray(popgroupsProject.parsedData?.peds)
        ? popgroupsProject.parsedData.peds
        : [];

    const editedXml =
      typeof buildPopgroupsXML === "function"
        ? buildPopgroupsXML()
        : "";

    const vehicleMetaCache =
      typeof buildVehicleMetaCacheSnapshot === "function"
        ? buildVehicleMetaCacheSnapshot()
        : null;

    const uiState =
      typeof buildMainPageUiSnapshot === "function"
        ? buildMainPageUiSnapshot()
        : null;

    const packContext = {
      activePackId:
        typeof activePackId !== "undefined"
          ? activePackId
          : null,

      activePack:
        typeof packDatabase !== "undefined" &&
        activePackId &&
        packDatabase?.packs?.[activePackId]
          ? cloneCloudValue(packDatabase.packs[activePackId])
          : null,

      packCount:
        typeof packDatabase !== "undefined" &&
        packDatabase?.packs
          ? Object.keys(packDatabase.packs).length
          : 0
    };

    return {
      format: "gta-traffic-popgroups-cloud-project",
      version: 1,
      savedAt: new Date().toISOString(),
      page: "popgroups",
      source: "gta-traffic-popgroups-editor",

      loadedFileName: popgroupsProject.loadedFileName || "popgroups",

      popgroupsProject,
      editedXml,
      vehicleMetaCache,
      uiState,
      packContext,

      summary: {
        vehicleGroups: vehicles.length,
        pedGroups: peds.length,
        vehicleModels: countCloudModels(vehicles),
        pedModels: countCloudModels(peds),
        hasUnsavedChanges: Boolean(popgroupsProject.hasUnsavedChanges),
        editedXmlBytes: editedXml.length
      }
    };
  }

  function createCloudSavePanel() {
    if (document.querySelector("[data-popgroups-cloud-save]")) {
      return;
    }

    const panel = document.createElement("section");
    panel.className = "panel cloud-save-panel";
    panel.setAttribute("data-popgroups-cloud-save", "");

    panel.innerHTML = `
      <div class="cloud-save-header">
        <div>
          <h2>Cloud Project Save</h2>
          <p>
            Save the current PopGroups workspace as a cloud project connected
            to your account dashboard.
          </p>
        </div>
      </div>

      <div class="cloud-save-grid">
        <label class="cloud-save-field">
          <span>Project Name</span>
          <input
            type="text"
            data-cloud-project-name
            placeholder="PopGroups traffic setup"
          >
        </label>

        <label class="cloud-save-field">
          <span>Description</span>
          <input
            type="text"
            data-cloud-project-description
            placeholder="Optional note about this setup"
          >
        </label>
      </div>

      <div class="cloud-save-actions">
        <button type="button" data-save-popgroups-cloud>
          Save to Cloud Project
        </button>

        <a class="button ghost" href="/dashboard.html">
          View Dashboard
        </a>
      </div>

      <div class="cloud-save-status" data-cloud-save-status>
        Cloud save is ready.
      </div>
    `;

    const target =
      document.querySelector("main") ||
      document.querySelector(".workspace-section") ||
      document.body;

    target.insertBefore(panel, target.firstChild);
  }

  async function savePopGroupsCloudProject() {
    const status = document.querySelector("[data-cloud-save-status]");
    const nameInput = document.querySelector("[data-cloud-project-name]");
    const descriptionInput = document.querySelector("[data-cloud-project-description]");

    if (!window.GTATrafficProjects) {
      status.textContent = "Cloud project client is not loaded.";
      return;
    }

    const name = nameInput.value.trim() || getDefaultProjectName();
    const description = descriptionInput.value.trim();

    status.textContent = "Saving cloud project...";

    try {
      const payload = collectPopGroupsCloudPayload();

      if (!payload) {
        status.textContent = "Load a PopGroups XML file before saving a cloud project.";
        return;
      }

      const result = await window.GTATrafficProjects.createProject({
        projectType: DEFAULT_PROJECT_TYPE,
        name,
        description,
        payload,
        summary: {
          source: "popgroups",
          loadedFileName: payload.loadedFileName,
          vehicleGroups: payload.summary.vehicleGroups,
          pedGroups: payload.summary.pedGroups,
          vehicleModels: payload.summary.vehicleModels,
          pedModels: payload.summary.pedModels,
          editedXmlBytes: payload.summary.editedXmlBytes
        }
      });

      status.textContent = "Saved cloud project: " + result.project.name;
    } catch (error) {
      status.textContent = error.message || "Unable to save cloud project.";
    }
  }

  document.addEventListener("click", event => {
    const saveButton = event.target.closest("[data-save-popgroups-cloud]");

    if (saveButton) {
      savePopGroupsCloudProject();
    }
  });

  document.addEventListener("DOMContentLoaded", createCloudSavePanel);
})();
