(function () {
  const PROJECT_TYPE_LABELS = {
    "popgroups": "PopGroups",
    "popcycle": "PopCycle",
    "vehicle-meta": "Vehicle Meta",
    "handling-meta": "Handling Meta",
    "pack-database": "Pack Database",
    "vehicle-library": "Vehicle Library",
    "general": "General"
  };

  function formatDate(value) {
    if (!value) {
      return "Never";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function getProjectTypeLabel(type) {
    return PROJECT_TYPE_LABELS[type] || "Project";
  }

  function createProjectsSection() {
    const existing = document.querySelector("[data-saved-projects-section]");

    if (existing) {
      return existing;
    }

    const section = document.createElement("section");
    section.className = "dashboard-panel saved-projects-panel";
    section.setAttribute("data-saved-projects-section", "");

    section.innerHTML = `
      <div class="section-heading saved-projects-heading">
        <div>
          <p class="section-kicker">Cloud Workspace</p>
          <h2>Saved Projects</h2>
          <p class="section-description">
            Cloud-saved traffic projects connected to your workspace.
          </p>
        </div>

        <div class="saved-projects-actions">
          <button type="button" class="button ghost" data-refresh-projects>
            Refresh
          </button>
        </div>
      </div>

      <div class="saved-projects-status" data-saved-projects-status>
        Loading saved projects...
      </div>

      <div class="saved-projects-grid" data-saved-projects-grid></div>
    `;

    const dashboardMain =
      document.querySelector(".dashboard-main") ||
      document.querySelector("main") ||
      document.body;

    dashboardMain.appendChild(section);

    return section;
  }

  function renderEmptyState(grid) {
    grid.innerHTML = `
      <article class="saved-project-card empty-project-card">
        <div class="saved-project-card-body">
          <p class="project-type-badge">No saved projects yet</p>
          <h3>Your cloud project shelf is ready.</h3>
          <p>
            Once the editors are connected, saved PopGroups, PopCycle,
            vehicle meta, and handling projects will appear here.
          </p>
          <div class="saved-project-card-actions">
            <a class="button" href="/">Open PopGroups Tool</a>
            <a class="button ghost" href="/vehicle-library.html">Vehicle Library</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderProjects(grid, projects) {
    if (!projects.length) {
      renderEmptyState(grid);
      return;
    }

    grid.innerHTML = projects.map(project => {
      const typeLabel = getProjectTypeLabel(project.projectType);
      const updated = formatDate(project.updatedAt || project.createdAt);
      const description = project.description || "No description saved yet.";
      const pinned = project.pinned ? `<span class="project-pin">Pinned</span>` : "";

      return `
        <article class="saved-project-card" data-project-id="${project.id}">
          <div class="saved-project-card-top">
            <span class="project-type-badge">${typeLabel}</span>
            ${pinned}
          </div>

          <div class="saved-project-card-body">
            <h3>${project.name}</h3>
            <p>${description}</p>
          </div>

          <div class="saved-project-meta">
            <span>Status: ${project.status}</span>
            <span>Updated: ${updated}</span>
          </div>

          <div class="saved-project-card-actions">
            <a class="button" href="/?projectId=${encodeURIComponent(project.id)}">
              Open
            </a>

            <button type="button" class="button ghost" data-project-details="${project.id}">
              Details
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  async function loadSavedProjects() {
    const section = createProjectsSection();
    const status = section.querySelector("[data-saved-projects-status]");
    const grid = section.querySelector("[data-saved-projects-grid]");

    status.textContent = "Loading saved projects...";

    try {
      const response = await fetch("/api/projects", {
        credentials: "same-origin"
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.message || "Unable to load saved projects");
      }

      const projects = Array.isArray(payload.projects) ? payload.projects : [];

      status.textContent = projects.length
        ? `${projects.length} saved project${projects.length === 1 ? "" : "s"} found.`
        : "No active saved projects yet.";

      renderProjects(grid, projects);
    } catch (error) {
      status.textContent = error.message || "Unable to load saved projects.";

      grid.innerHTML = `
        <article class="saved-project-card empty-project-card">
          <div class="saved-project-card-body">
            <p class="project-type-badge">Connection issue</p>
            <h3>Saved projects could not load.</h3>
            <p>
              Confirm you are logged in, then refresh this dashboard.
            </p>
          </div>
        </article>
      `;
    }
  }

  function escapeProjectModalHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getProjectVersionSummary(version) {
    const summary = version?.payload?.summary || version?.summary || {};

    return {
      vehicleGroups: summary.vehicleGroups ?? "�",
      pedGroups: summary.pedGroups ?? "�",
      vehicleModels: summary.vehicleModels ?? "�",
      pedModels: summary.pedModels ?? "�",
      hasEditedXml: Boolean(version?.payload?.editedXml)
    };
  }

  function getProjectOpenUrl(projectId, versionId = "") {
    const params = new URLSearchParams();

    params.set("projectId", projectId);

    if (versionId) {
      params.set("versionId", versionId);
    }

    return "/?" + params.toString();
  }

  function closeProjectVersionsModal() {
    const modal = document.querySelector("[data-project-versions-modal]");

    if (modal) {
      modal.classList.remove("is-visible");
    }
  }

  function renderProjectVersionsModal(detail) {
    let modal = document.querySelector("[data-project-versions-modal]");

    if (!modal) {
      modal = document.createElement("div");
      modal.className = "project-versions-modal-overlay";
      modal.setAttribute("data-project-versions-modal", "");

      modal.innerHTML = `
        <div class="project-versions-modal" role="dialog" aria-modal="true">
          <div class="project-versions-modal-head">
            <div>
              <p class="section-kicker">Cloud Project</p>
              <h2 data-project-versions-title>Project versions</h2>
              <p data-project-versions-subtitle></p>
            </div>

            <button type="button" class="project-versions-close" data-project-versions-close>
              �
            </button>
          </div>

          <div class="project-versions-actions" data-project-versions-actions></div>

          <div class="project-versions-list" data-project-versions-list></div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.addEventListener("click", event => {
        if (
          event.target.matches("[data-project-versions-modal]") ||
          event.target.matches("[data-project-versions-close]")
        ) {
          closeProjectVersionsModal();
        }
      });
    }

    const project = detail.project || {};
    const versions = Array.isArray(detail.versions) ? detail.versions : [];
    const sortedVersions = versions.slice().sort((a, b) => {
      return Number(b.versionNumber || 0) - Number(a.versionNumber || 0);
    });

    modal.querySelector("[data-project-versions-title]").textContent =
      project.name || "Cloud project";

    modal.querySelector("[data-project-versions-subtitle]").textContent =
      getProjectTypeLabel(project.projectType) +
      " � " +
      sortedVersions.length +
      " saved version" +
      (sortedVersions.length === 1 ? "" : "s");

    modal.querySelector("[data-project-versions-actions]").innerHTML = `
      <a class="button" href="${escapeProjectModalHTML(getProjectOpenUrl(project.id))}">
        Open Latest
      </a>

      <a class="button ghost" href="/dashboard.html">
        Back to Dashboard
      </a>
    `;

    if (!sortedVersions.length) {
      modal.querySelector("[data-project-versions-list]").innerHTML = `
        <div class="project-version-empty">
          No saved versions were found for this project.
        </div>
      `;

      modal.classList.add("is-visible");
      return;
    }

    modal.querySelector("[data-project-versions-list]").innerHTML =
      sortedVersions.map(version => {
        const summary = getProjectVersionSummary(version);
        const versionLabel =
          version.label ||
          "Version " + version.versionNumber;

        return `
          <article class="project-version-card">
            <div class="project-version-card-main">
              <div>
                <span class="project-version-badge">
                  Version ${escapeProjectModalHTML(version.versionNumber)}
                </span>

                <h3>${escapeProjectModalHTML(versionLabel)}</h3>

                <p>
                  Saved ${escapeProjectModalHTML(formatDate(version.createdAt))}
                </p>
              </div>

              <a
                class="button"
                href="${escapeProjectModalHTML(getProjectOpenUrl(project.id, version.id))}"
              >
                Open This Version
              </a>
            </div>

            <div class="project-version-stats">
              <span>Vehicle Groups: <strong>${escapeProjectModalHTML(summary.vehicleGroups)}</strong></span>
              <span>Vehicles: <strong>${escapeProjectModalHTML(summary.vehicleModels)}</strong></span>
              <span>Ped Groups: <strong>${escapeProjectModalHTML(summary.pedGroups)}</strong></span>
              <span>Peds: <strong>${escapeProjectModalHTML(summary.pedModels)}</strong></span>
              <span>Edited XML: <strong>${summary.hasEditedXml ? "Yes" : "No"}</strong></span>
            </div>
          </article>
        `;
      }).join("");

    modal.classList.add("is-visible");
  }

  async function showProjectDetails(projectId) {
    try {
      const response = await fetch("/api/projects/" + encodeURIComponent(projectId), {
        credentials: "same-origin"
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.message || "Unable to load project details");
      }

      renderProjectVersionsModal(payload);
    } catch (error) {
      alert(error.message || "Unable to load project details.");
    }
  }

  document.addEventListener("click", event => {
    const refreshButton = event.target.closest("[data-refresh-projects]");
    const detailsButton = event.target.closest("[data-project-details]");

    if (refreshButton) {
      loadSavedProjects();
    }

    if (detailsButton) {
      showProjectDetails(detailsButton.getAttribute("data-project-details"));
    }
  });

  document.addEventListener("DOMContentLoaded", loadSavedProjects);
})();
