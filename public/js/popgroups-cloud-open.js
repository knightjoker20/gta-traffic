(function () {
  function setCloudOpenStatus(message, isWarning = false) {
    const cloudStatus = document.querySelector("[data-cloud-save-status]");

    if (cloudStatus) {
      cloudStatus.textContent = message;
    }

    if (typeof renderWorkspaceStatus === "function") {
      renderWorkspaceStatus(message, isWarning);
    }

    if (typeof updateStatus === "function") {
      updateStatus(message);
    }
  }

  function cloneCloudOpenValue(value, fallback = null) {
    if (value === undefined || value === null) {
      return fallback;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }

  function getCloudVersionIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("versionId") || params.get("version") || "";
  }

  function getCloudProjectIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("projectId") || params.get("project");
  }

  function applyCloudPopgroupsProject(detail) {
    const requestedVersionId = getCloudVersionIdFromUrl();

    const version = requestedVersionId
      ? detail?.versions?.find(candidate => candidate.id === requestedVersionId) ||
        detail?.versions?.[0]
      : detail?.versions?.[0];
    const payload = version?.payload || {};
    const project = payload.popgroupsProject || null;

    if (!project) {
      throw new Error("This cloud project does not contain a PopGroups editor snapshot.");
    }

    const xmlText = payload.editedXml || project.originalText || "";

    if (!xmlText) {
      throw new Error("This cloud project does not contain editable XML text.");
    }

    const parsedProjectData = cloneCloudOpenValue(project.parsedData, {
      vehicles: [],
      peds: []
    });

    originalText = xmlText;
    loadedFileName =
      payload.loadedFileName ||
      project.loadedFileName ||
      detail.project?.name ||
      "popgroups";

    parsedData = {
      vehicles: Array.isArray(parsedProjectData.vehicles)
        ? parsedProjectData.vehicles
        : [],
      peds: Array.isArray(parsedProjectData.peds)
        ? parsedProjectData.peds
        : []
    };

    currentSection =
      project.currentSection === "peds"
        ? "peds"
        : "vehicles";

    hasUnsavedChanges = false;

    openGroups = {
      vehicles: new Set(project.openGroups?.vehicles || []),
      peds: new Set(project.openGroups?.peds || [])
    };

    hiddenGroups = {
      vehicles: new Set(project.hiddenGroups?.vehicles || []),
      peds: new Set(project.hiddenGroups?.peds || [])
    };

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");

    originalXMLDoc = xml.querySelector("parsererror")
      ? null
      : xml;

    if (els?.searchBox) {
      els.searchBox.value = project.searchText || "";
    }

    if (payload.vehicleMetaCache?.vehicleMeta) {
      vehicleMeta = cloneCloudOpenValue(
        payload.vehicleMetaCache.vehicleMeta,
        {}
      );

      loadedMetaFiles =
        payload.vehicleMetaCache.loadedMetaFiles || [];

      overwrittenMetaEntries =
        Number(payload.vehicleMetaCache.overwrittenMetaEntries) || 0;
    }

    if (payload.uiState) {
      imageMode = payload.uiState.imageMode !== false;

      if (
        payload.uiState.activePackId &&
        packDatabase?.packs?.[payload.uiState.activePackId]
      ) {
        activePackId = payload.uiState.activePackId;
      }
    }

    if (typeof refreshMainPageAfterWorkspaceRestore === "function") {
      refreshMainPageAfterWorkspaceRestore();
    } else if (typeof renderSection === "function") {
      renderSection(currentSection);
    }

    if (typeof saveCurrentPopgroupsProject === "function") {
      saveCurrentPopgroupsProject({ silent: true });
    }

    if (typeof saveVehicleMetaCache === "function") {
      saveVehicleMetaCache({ silent: true });
    }

    if (typeof saveMainPageUiState === "function") {
      saveMainPageUiState({ silent: true });
    }

    window.GTATrafficActiveCloudProject = {
      id: detail.project?.id || getCloudProjectIdFromUrl(),
      name: detail.project?.name || loadedFileName,
      projectType: detail.project?.projectType || "popgroups",
      openedAt: new Date().toISOString()
    };

    const openedVersionLabel =
      version?.versionNumber
        ? " version " + version.versionNumber
        : "";

    setCloudOpenStatus(
      "Opened cloud project" +
      openedVersionLabel +
      ": " +
      (detail.project?.name || loadedFileName)
    );
  }

  async function openCloudProjectFromUrl() {
    const projectId = getCloudProjectIdFromUrl();

    if (!projectId) {
      return;
    }

    if (!window.GTATrafficProjects?.getProject) {
      setCloudOpenStatus("Cloud project client is not loaded.", true);
      return;
    }

    setCloudOpenStatus("Opening cloud project...");

    try {
      const detail = await window.GTATrafficProjects.getProject(projectId);
      applyCloudPopgroupsProject(detail);
    } catch (error) {
      console.warn("Cloud project open failed.", error);
      setCloudOpenStatus(
        error.message || "Could not open the cloud project.",
        true
      );
    }
  }

  window.addEventListener("load", () => {
    window.setTimeout(openCloudProjectFromUrl, 450);
  });
})();
