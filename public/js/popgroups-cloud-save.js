(function () {
  const DEFAULT_PROJECT_TYPE = "popgroups";

  let cloudSaveToastTimer = null;

  function getCloudSavePanel(button = null) {
    return (
      button?.closest("[data-popgroups-cloud-save]") ||
      document.querySelector("[data-popgroups-cloud-save]")
    );
  }

  function getCloudSavePanelStatus(button = null) {
    const panel = getCloudSavePanel(button);

    if (!panel) {
      return null;
    }

    let status = panel.querySelector("[data-cloud-save-status]");

    if (!status) {
      status = document.createElement("div");
      status.className = "cloud-save-status";
      status.setAttribute("data-cloud-save-status", "");

      const actions = panel.querySelector(".cloud-save-actions");

      if (actions) {
        actions.insertAdjacentElement("afterend", status);
      } else {
        panel.appendChild(status);
      }
    }

    return status;
  }

  function ensureCloudSaveModalStyles() {
    if (document.getElementById("cloudSaveModalStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "cloudSaveModalStyles";
    style.textContent = `
      .cloud-save-modal-overlay {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483000 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        background: rgba(0, 0, 0, .68) !important;
        backdrop-filter: blur(6px) !important;
      }

      .cloud-save-modal-overlay.is-visible {
        display: flex !important;
      }

      .cloud-save-modal {
        width: min(560px, 100%) !important;
        padding: 26px !important;
        border: 1px solid rgba(255, 207, 47, .34) !important;
        border-radius: 22px !important;
        background: linear-gradient(135deg, rgba(255, 138, 0, .14), rgba(255, 46, 138, .12)), rgba(7, 12, 22, .98) !important;
        color: #f8fafc !important;
        box-shadow: 0 28px 90px rgba(0, 0, 0, .65) !important;
      }

      .cloud-save-modal-kicker {
        color: #ffdf75 !important;
        font-size: .78rem !important;
        font-weight: 950 !important;
        letter-spacing: .12em !important;
        text-transform: uppercase !important;
        margin-bottom: 8px !important;
      }

      .cloud-save-modal h2 {
        margin: 0 0 16px !important;
        color: #f8fafc !important;
      }

      .cloud-save-modal-message {
        margin: 0 0 18px !important;
        color: rgba(226, 232, 240, .9) !important;
        line-height: 1.5 !important;
        font-weight: 800 !important;
      }

      .cloud-save-modal-details {
        display: grid !important;
        gap: 10px !important;
        margin-bottom: 22px !important;
      }

      .cloud-save-modal-details div {
        display: flex !important;
        justify-content: space-between !important;
        gap: 14px !important;
        padding: 10px 12px !important;
        border: 1px solid rgba(148, 163, 184, .16) !important;
        border-radius: 12px !important;
        background: rgba(2, 6, 10, .46) !important;
      }

      .cloud-save-modal-details span {
        color: rgba(203, 213, 225, .72) !important;
      }

      .cloud-save-modal-details strong {
        color: #f8fafc !important;
        text-align: right !important;
      }

      .cloud-save-modal-actions {
        display: flex !important;
        justify-content: flex-end !important;
        gap: 10px !important;
        flex-wrap: wrap !important;
      }
    `;

    document.head.appendChild(style);
  }

  function showCloudSaveStatusModal(message) {
    ensureCloudSaveModalStyles();

    let overlay = document.querySelector("[data-cloud-save-modal]");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "cloud-save-modal-overlay";
      overlay.setAttribute("data-cloud-save-modal", "");

      overlay.innerHTML = `
        <div class="cloud-save-modal" role="dialog" aria-modal="true">
          <div class="cloud-save-modal-kicker">Cloud Save Complete</div>
          <h2>Project saved</h2>
          <p class="cloud-save-modal-message" data-cloud-save-modal-message></p>

          <div class="cloud-save-modal-details">
            <div>
              <span>Loaded file</span>
              <strong data-cloud-save-modal-file></strong>
            </div>

            <div>
              <span>Vehicle groups</span>
              <strong data-cloud-save-modal-vehicle-groups></strong>
            </div>

            <div>
              <span>Vehicles in PopGroups</span>
              <strong data-cloud-save-modal-vehicle-models></strong>
            </div>

            <div>
              <span>Saved</span>
              <strong data-cloud-save-modal-time></strong>
            </div>
          </div>

          <div class="cloud-save-modal-actions">
            <a class="button ghost" href="/dashboard.html">View Dashboard</a>
            <button type="button" class="button" data-cloud-save-modal-close>OK</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.addEventListener("click", event => {
        if (
          event.target.matches("[data-cloud-save-modal]") ||
          event.target.matches("[data-cloud-save-modal-close]")
        ) {
          overlay.classList.remove("is-visible");
        }
      });
    }

    const vehicleGroups =
      Array.isArray(parsedData?.vehicles)
        ? parsedData.vehicles.length
        : 0;

    const vehicleModels =
      Array.isArray(parsedData?.vehicles)
        ? parsedData.vehicles.reduce((total, group) => {
            return total + (Array.isArray(group.models) ? group.models.length : 0);
          }, 0)
        : 0;

    overlay.querySelector("[data-cloud-save-modal-message]").textContent =
      message || "Cloud project saved.";

    overlay.querySelector("[data-cloud-save-modal-file]").textContent =
      typeof loadedFileName !== "undefined" && loadedFileName
        ? loadedFileName
        : "popgroups";

    overlay.querySelector("[data-cloud-save-modal-vehicle-groups]").textContent =
      String(vehicleGroups);

    overlay.querySelector("[data-cloud-save-modal-vehicle-models]").textContent =
      String(vehicleModels);

    overlay.querySelector("[data-cloud-save-modal-time]").textContent =
      new Date().toLocaleString();

    overlay.classList.add("is-visible");
  }

  function setCloudSaveStatus(message, tone = "", button = null) {
    const status =
      getCloudSavePanelStatus(button) ||
      document.querySelector("[data-popgroups-cloud-save] [data-cloud-save-status]");

    if (status) {
      status.textContent = message;
      status.classList.remove("is-busy", "is-success", "is-warning", "is-error");

      if (tone) {
        status.classList.add("is-" + tone);
      }
    }

    if (tone === "success") {
      showCloudSaveStatusModal(message);
    }
  }

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

  function getActiveCloudProjectId() {
    if (window.GTATrafficActiveCloudProject?.id) {
      return window.GTATrafficActiveCloudProject.id;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get("projectId") || params.get("project") || "";
  }

  function buildCloudProjectSummary(payload) {
    return {
      source: "popgroups",
      loadedFileName: payload.loadedFileName,
      vehicleGroups: payload.summary.vehicleGroups,
      pedGroups: payload.summary.pedGroups,
      vehicleModels: payload.summary.vehicleModels,
      pedModels: payload.summary.pedModels,
      editedXmlBytes: payload.summary.editedXmlBytes
    };
  }

  function getCloudVersionLabel() {
    return "Saved " + new Date().toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
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

  function setCloudSaveInlineFeedback(button, message, tone = "") {
    const panel = getCloudSavePanel(button);
    const actions = panel?.querySelector(".cloud-save-actions");

    if (!actions) {
      return;
    }

    let inline =
      panel.querySelector("[data-cloud-save-inline-status]") ||
      actions.querySelector("[data-cloud-save-inline-status]");

    if (!inline) {
      inline = document.createElement("span");
      inline.className = "cloud-save-inline-status";
      inline.setAttribute("data-cloud-save-inline-status", "");
      actions.insertAdjacentElement("afterend", inline);
    }

    inline.textContent = message;
    inline.classList.remove("is-busy", "is-success", "is-warning", "is-error");

    if (tone) {
      inline.classList.add("is-" + tone);
    }
  }

  function setCloudSaveButtonState(button, message, disabled = false) {
    if (!button) {
      return;
    }

    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent.trim();
    }

    button.textContent = message;
    button.disabled = disabled;
    button.classList.toggle("is-saving", disabled);
  }

  function resetCloudSaveButton(button, delay = 4200) {
    if (!button || !button.dataset.originalText) {
      return;
    }

    window.setTimeout(() => {
      button.textContent = button.dataset.originalText;
      button.disabled = false;
      button.classList.remove("is-saving");
    }, delay);
  }

  async function savePopGroupsCloudProject(triggerButton = null) {
    const status = getCloudSavePanelStatus();
    const nameInput = document.querySelector("[data-cloud-project-name]");
    const descriptionInput = document.querySelector("[data-cloud-project-description]");

    if (!window.GTATrafficProjects) {
      setCloudSaveInlineFeedback(
        triggerButton,
        "Cloud project client is not loaded.",
        "error"
      );
      setCloudSaveStatus("Cloud project client is not loaded.", "error", triggerButton);
      return;
    }

    const name = nameInput.value.trim() || getDefaultProjectName();
    const description = descriptionInput.value.trim();

    setCloudSaveStatus("Saving cloud project...", "busy", triggerButton);

    try {
      const payload = collectPopGroupsCloudPayload();

      if (!payload) {
        setCloudSaveInlineFeedback(
          triggerButton,
          "Load a PopGroups XML file before saving.",
          "warning"
        );
        setCloudSaveStatus("Load a PopGroups XML file before saving a cloud project.", "warning", triggerButton);
        return;
      }

      const summary = buildCloudProjectSummary(payload);
      const activeProjectId = getActiveCloudProjectId();

      if (activeProjectId) {
        const versionResult =
          await window.GTATrafficProjects.createProjectVersion(
            activeProjectId,
            {
              label: getCloudVersionLabel(),
              payload,
              summary
            }
          );

        await window.GTATrafficProjects.updateProject(
          activeProjectId,
          {
            name,
            description,
            projectType: DEFAULT_PROJECT_TYPE,
            status: "active"
          }
        );

        window.GTATrafficActiveCloudProject = {
          id: activeProjectId,
          name,
          projectType: DEFAULT_PROJECT_TYPE,
          savedAt: new Date().toISOString()
        };

        setCloudSaveStatus(
          "Saved new cloud version " +
          versionResult.version.versionNumber +
          " for: " +
          name,
          "success"
        );

        return;
      }

      const result = await window.GTATrafficProjects.createProject({
        projectType: DEFAULT_PROJECT_TYPE,
        name,
        description,
        payload,
        summary
      });

      window.GTATrafficActiveCloudProject = {
        id: result.project.id,
        name: result.project.name,
        projectType: result.project.projectType,
        savedAt: new Date().toISOString()
      };

      setCloudSaveStatus("Saved cloud project: " + result.project.name, "success", triggerButton);
    } catch (error) {
      setCloudSaveStatus(error.message || "Unable to save cloud project.", "error", triggerButton);
    }
  }

  document.addEventListener("click", event => {
    const saveButton = event.target.closest("[data-save-popgroups-cloud]");

    if (saveButton) {
      savePopGroupsCloudProject(saveButton);
    }
  });

  document.addEventListener("DOMContentLoaded", createCloudSavePanel);
})();
