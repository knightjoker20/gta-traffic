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

  async function showProjectDetails(projectId) {
    try {
      const response = await fetch("/api/projects/" + encodeURIComponent(projectId), {
        credentials: "same-origin"
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.message || "Unable to load project details");
      }

      const versionCount = Array.isArray(payload.versions) ? payload.versions.length : 0;
      const project = payload.project;

      alert(
        project.name +
        "\n\nType: " + getProjectTypeLabel(project.projectType) +
        "\nStatus: " + project.status +
        "\nVersions loaded: " + versionCount +
        "\nLast opened: " + formatDate(project.lastOpenedAt)
      );
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
