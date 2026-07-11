(function () {
  let dashboardProjectFilter = "active";
  let dashboardProjectSearch = "";
  let dashboardProjectTypeFilter = "all";
  let dashboardProjectSort = "pinned-newest";
  let dashboardProjectSearchTimer = null;

  const PROJECT_TYPE_LABELS = {
    "popgroups":       "PopGroups",
    "popcycle":        "PopCycle",
    "vehicle-meta":    "Vehicle Meta",
    "handling-meta":   "Handling Meta",
    "dispatch":        "Dispatch",
    "relationships":   "Relationships",
    "trains":          "Trains",
    "events":          "Events",
    "pack-database":   "Pack Database",
    "vehicle-library": "Vehicle Library",
    "general":         "General"
  };

  const PROJECT_TYPE_ORDER = [
    "popgroups", "popcycle", "vehicle-meta", "handling-meta",
    "dispatch", "relationships", "trains", "events",
    "pack-database", "vehicle-library", "general"
  ];

  // Where each saved project type's editor actually lives.
  const PROJECT_TYPE_PAGES = {
    "popgroups":       "/popgroups.html",
    "popcycle":        "/popcycle.html",
    "vehicle-meta":    "/vehicle-meta.html",
    "handling-meta":   "/handling-meta.html",
    "dispatch":        "/dispatch.html",
    "relationships":   "/relationships.html",
    "trains":          "/trains.html",
    "events":          "/events.html",
    "vehicle-library": "/vehicle-library.html"
  };

  function getProjectTypePage(projectType) {
    return PROJECT_TYPE_PAGES[projectType] || "/";
  }

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
          <button type="button" class="button ghost is-active" data-project-filter="active">
            Active
          </button>

          <button type="button" class="button ghost" data-project-filter="archived">
            Archived
          </button>

          <button type="button" class="button ghost" data-refresh-projects>
            Refresh
          </button>
        </div>
        <div class="saved-projects-view-controls" data-project-view-controls>
          <label>
            <span>Search</span>
            <input
              type="search"
              placeholder="Search projects..."
              data-project-search
            >
          </label>

          <label>
            <span>Type</span>
            <select data-project-type-filter>
              <option value="all">All Types</option>
              <option value="popgroups">PopGroups</option>
              <option value="popcycle">PopCycle</option>
              <option value="vehicle-meta">Vehicle Meta</option>
              <option value="handling-meta">Handling Meta</option>
              <option value="pack-database">Pack Database</option>
              <option value="dispatch">Dispatch</option>
              <option value="relationships">Relationships</option>
              <option value="trains">Trains</option>
              <option value="events">Events</option>
              <option value="vehicle-library">Vehicle Library</option>
              <option value="general">General</option>
            </select>
          </label>

          <label>
            <span>Sort</span>
            <select data-project-sort>
              <option value="pinned-newest">Pinned + Newest</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
            </select>
          </label>
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
    const archived = dashboardProjectFilter === "archived";

    grid.innerHTML = `
      <article class="saved-project-card empty-project-card">
        <div class="saved-project-card-body">
          <p class="project-type-badge">${archived ? "No archived projects" : "No saved projects yet"}</p>
          <h3>${archived ? "No archived cloud projects." : "Your cloud project shelf is ready."}</h3>
          <p>
            ${archived
              ? "Archived projects will appear here when you move active projects out of the main list."
              : "Once the editors are connected, saved PopGroups, PopCycle, vehicle meta, and handling projects will appear here."
            }
          </p>
          <div class="saved-project-card-actions">
            <a class="button" href="/popgroups.html">Open PopGroups Tool</a>
            <a class="button ghost" href="/vehicle-library.html">Vehicle Library</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderProjectCard(project) {
    const typeLabel = getProjectTypeLabel(project.projectType);
    const updated = formatDate(project.updatedAt || project.createdAt);
    const description = project.description || "No description saved yet.";
    const pinned = project.pinned ? `<span class="project-pin">Pinned</span>` : "";
    const cleanupButton =
      project.status === "archived"
        ? `<button type="button" class="button ghost" data-project-status="active" data-project-status-id="${project.id}">Restore</button>`
        : `<button type="button" class="button ghost danger-soft" data-project-status="archived" data-project-status-id="${project.id}">Archive</button>`;

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
          <a class="button" href="${getProjectTypePage(project.projectType)}?projectId=${encodeURIComponent(project.id)}">Open</a>
          <button type="button" class="button ghost" data-project-details="${project.id}">Details</button>
          <button type="button" class="button ghost" data-project-edit="${project.id}">Edit</button>
          ${cleanupButton}
        </div>
      </article>`;
  }

  function renderProjects(grid, projects) {
    if (!projects.length) {
      renderEmptyState(grid);
      return;
    }

    // Group by project type
    const grouped = new Map();
    projects.forEach(project => {
      const type = project.projectType || "general";
      if (!grouped.has(type)) grouped.set(type, []);
      grouped.get(type).push(project);
    });

    // Sort groups by canonical type order
    const sortedGroups = [...grouped.entries()].sort(([a], [b]) => {
      const ai = PROJECT_TYPE_ORDER.indexOf(a);
      const bi = PROJECT_TYPE_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    grid.innerHTML = sortedGroups.map(([type, typeProjects]) => {
      const label = getProjectTypeLabel(type);
      const cards = typeProjects.map(renderProjectCard).join("");
      return `
        <details class="saved-projects-type-group" open>
          <summary class="saved-projects-type-summary">
            <span class="project-type-badge">${label}</span>
            <span class="saved-projects-type-count">${typeProjects.length}</span>
          </summary>
          <div class="saved-projects-type-grid">${cards}</div>
        </details>`;
    }).join("");
  }

  function closeProjectEditModal() {
    const modal = document.querySelector("[data-project-edit-modal]");

    if (modal) {
      modal.classList.remove("is-visible");
    }
  }

  function renderProjectEditModal(project) {
    let modal = document.querySelector("[data-project-edit-modal]");

    if (!modal) {
      modal = document.createElement("div");
      modal.className = "project-edit-modal-overlay";
      modal.setAttribute("data-project-edit-modal", "");

      modal.innerHTML = `
        <div class="project-edit-modal" role="dialog" aria-modal="true">
          <div class="project-edit-modal-head">
            <div>
              <p class="section-kicker">Project Settings</p>
              <h2>Edit cloud project</h2>
              <p>Rename, describe, categorize, or pin this saved project.</p>
            </div>

            <button type="button" class="project-edit-close" data-project-edit-close>
              �
            </button>
          </div>

          <form data-project-edit-form>
            <input type="hidden" data-project-edit-id>

            <label class="project-edit-field">
              <span>Project name</span>
              <input type="text" data-project-edit-name required>
            </label>

            <label class="project-edit-field">
              <span>Description</span>
              <textarea data-project-edit-description rows="4"></textarea>
            </label>

            <label class="project-edit-field">
              <span>Project type</span>
              <select data-project-edit-type>
                <option value="popgroups">PopGroups</option>
                <option value="popcycle">PopCycle</option>
                <option value="vehicle-meta">Vehicle Meta</option>
                <option value="handling-meta">Handling Meta</option>
                <option value="dispatch">Dispatch</option>
                <option value="relationships">Relationships</option>
                <option value="trains">Trains</option>
                <option value="events">Events</option>
                <option value="pack-database">Pack Database</option>
                <option value="vehicle-library">Vehicle Library</option>
                <option value="general">General</option>
              </select>
            </label>

            <label class="project-edit-check">
              <input type="checkbox" data-project-edit-pinned>
              <span>Pin this project to the top of the list</span>
            </label>

            <div class="project-edit-status" data-project-edit-status></div>

            <div class="project-edit-actions">
              <button type="button" class="button ghost" data-project-edit-cancel>
                Cancel
              </button>

              <button type="submit" class="button">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modal);

      modal.addEventListener("click", event => {
        if (
          event.target.matches("[data-project-edit-modal]") ||
          event.target.matches("[data-project-edit-close]") ||
          event.target.matches("[data-project-edit-cancel]")
        ) {
          closeProjectEditModal();
        }
      });

      modal
        .querySelector("[data-project-edit-form]")
        .addEventListener("submit", event => {
          event.preventDefault();
          saveProjectEditModal();
        });
    }

    modal.querySelector("[data-project-edit-id]").value = project.id || "";
    modal.querySelector("[data-project-edit-name]").value = project.name || "";
    modal.querySelector("[data-project-edit-description]").value = project.description || "";
    modal.querySelector("[data-project-edit-type]").value = project.projectType || "general";
    modal.querySelector("[data-project-edit-pinned]").checked = Boolean(project.pinned);
    modal.querySelector("[data-project-edit-status]").textContent = "";

    modal.classList.add("is-visible");
  }

  async function openProjectEditModal(projectId) {
    if (!projectId) {
      return;
    }

    try {
      const response = await fetch("/api/projects/" + encodeURIComponent(projectId), {
        credentials: "same-origin"
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.message || "Unable to load project settings");
      }

      renderProjectEditModal(payload.project);
    } catch (error) {
      alert(error.message || "Unable to load project settings.");
    }
  }

  async function saveProjectEditModal() {
    const modal = document.querySelector("[data-project-edit-modal]");

    if (!modal) {
      return;
    }

    const projectId = modal.querySelector("[data-project-edit-id]").value;
    const status = modal.querySelector("[data-project-edit-status]");
    const name = modal.querySelector("[data-project-edit-name]").value.trim();
    const description = modal.querySelector("[data-project-edit-description]").value.trim();
    const projectType = modal.querySelector("[data-project-edit-type]").value;
    const pinned = modal.querySelector("[data-project-edit-pinned]").checked;

    if (!name) {
      status.textContent = "Project name is required.";
      status.className = "project-edit-status is-warning";
      return;
    }

    status.textContent = "Saving project settings...";
    status.className = "project-edit-status is-busy";

    try {
      const response = await fetch("/api/projects/" + encodeURIComponent(projectId), {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          description,
          projectType,
          pinned
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.message || "Unable to save project settings");
      }

      status.textContent = "Project settings saved.";
      status.className = "project-edit-status is-success";

      closeProjectEditModal();
      await loadSavedProjects();
    } catch (error) {
      status.textContent = error.message || "Unable to save project settings.";
      status.className = "project-edit-status is-error";
    }
  }

  function normalizeProjectSearchValue(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function getProjectSortTime(project) {
    return Date.parse(project.updatedAt || project.createdAt || "") || 0;
  }

  function getProjectSortName(project) {
    return String(project.name || "").toLowerCase();
  }

  function projectMatchesSearchAndType(project) {
    const search = normalizeProjectSearchValue(dashboardProjectSearch);
    const typeFilter = dashboardProjectTypeFilter || "all";

    if (typeFilter !== "all" && project.projectType !== typeFilter) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      project.name,
      project.description,
      project.projectType,
      getProjectTypeLabel(project.projectType),
      project.status
    ]
      .map(value => normalizeProjectSearchValue(value))
      .join(" ");

    return haystack.includes(search);
  }

  function sortDashboardProjects(projects) {
    return projects.slice().sort((a, b) => {
      if (dashboardProjectSort === "name") {
        return getProjectSortName(a).localeCompare(getProjectSortName(b));
      }

      if (dashboardProjectSort === "oldest") {
        return getProjectSortTime(a) - getProjectSortTime(b);
      }

      if (dashboardProjectSort === "newest") {
        return getProjectSortTime(b) - getProjectSortTime(a);
      }

      const pinnedDifference =
        Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));

      if (pinnedDifference !== 0) {
        return pinnedDifference;
      }

      return getProjectSortTime(b) - getProjectSortTime(a);
    });
  }

  function applyProjectSearchAndSort(projects) {
    return sortDashboardProjects(
      projects.filter(projectMatchesSearchAndType)
    );
  }

  function updateProjectViewControls() {
    const searchInput = document.querySelector("[data-project-search]");
    const typeSelect = document.querySelector("[data-project-type-filter]");
    const sortSelect = document.querySelector("[data-project-sort]");

    if (searchInput && searchInput.value !== dashboardProjectSearch) {
      searchInput.value = dashboardProjectSearch;
    }

    if (typeSelect && typeSelect.value !== dashboardProjectTypeFilter) {
      typeSelect.value = dashboardProjectTypeFilter;
    }

    if (sortSelect && sortSelect.value !== dashboardProjectSort) {
      sortSelect.value = dashboardProjectSort;
    }
  }

  function renderNoProjectMatches(grid, totalProjects) {
    grid.innerHTML = `
      <article class="saved-project-card empty-project-card">
        <div class="saved-project-card-body">
          <p class="project-type-badge">No matching projects</p>
          <h3>No projects match the current search/filter.</h3>
          <p>
            ${totalProjects} project${totalProjects === 1 ? "" : "s"} exist in this view,
            but none match the current search text or project type filter.
          </p>
          <div class="saved-project-card-actions">
            <button type="button" class="button ghost" data-clear-project-search>
              Clear Search / Filter
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function updateProjectFilterButtons() {
    document
      .querySelectorAll("[data-project-filter]")
      .forEach(button => {
        button.classList.toggle(
          "is-active",
          button.getAttribute("data-project-filter") === dashboardProjectFilter
        );
      });
  }

  async function updateProjectStatus(projectId, nextStatus) {
    if (!projectId || !nextStatus) {
      return;
    }

    const actionLabel = nextStatus === "archived" ? "archive" : "restore";

    const confirmed = window.confirm(
      "Are you sure you want to " + actionLabel + " this cloud project?"
    );

    if (!confirmed) {
      return;
    }

    const section = createProjectsSection();
    const status = section.querySelector("[data-saved-projects-status]");

    status.textContent =
      nextStatus === "archived"
        ? "Archiving project..."
        : "Restoring project...";

    try {
      const response = await fetch("/api/projects/" + encodeURIComponent(projectId), {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: nextStatus
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.message || "Unable to update project");
      }

      await loadSavedProjects();
    } catch (error) {
      status.textContent = error.message || "Unable to update project.";
    }
  }

  async function loadSavedProjects() {
    const section = createProjectsSection();
    const status = section.querySelector("[data-saved-projects-status]");
    const grid = section.querySelector("[data-saved-projects-grid]");

    updateProjectFilterButtons();
    updateProjectViewControls();

    status.textContent = "Loading saved projects...";

    try {
      const params = new URLSearchParams();
      params.set("status", dashboardProjectFilter);

      const response = await fetch("/api/projects?" + params.toString(), {
        credentials: "same-origin"
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.message || "Unable to load saved projects");
      }

      const projects = Array.isArray(payload.projects) ? payload.projects : [];
      const visibleProjects = applyProjectSearchAndSort(projects);

      const filterLabel =
        dashboardProjectFilter === "archived"
          ? "archived"
          : "active";

      const hasSearchOrTypeFilter =
        Boolean(dashboardProjectSearch.trim()) ||
        dashboardProjectTypeFilter !== "all";

      status.textContent = visibleProjects.length
        ? `${visibleProjects.length} ${filterLabel} saved project${visibleProjects.length === 1 ? "" : "s"} shown` +
          (hasSearchOrTypeFilter ? ` from ${projects.length} total.` : ".")
        : projects.length
          ? `No ${filterLabel} saved projects match the current search/filter.`
          : `No ${filterLabel} saved projects yet.`;

      if (visibleProjects.length) {
        renderProjects(grid, visibleProjects);
      } else if (projects.length) {
        renderNoProjectMatches(grid, projects.length);
      } else {
        renderEmptyState(grid);
      }
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

  function getProjectOpenUrl(projectId, versionId = "", projectType = "") {
    const params = new URLSearchParams();

    params.set("projectId", projectId);

    if (versionId) {
      params.set("versionId", versionId);
    }

    return getProjectTypePage(projectType) + "?" + params.toString();
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
      <a class="button" href="${escapeProjectModalHTML(getProjectOpenUrl(project.id, "", project.projectType))}">
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
                href="${escapeProjectModalHTML(getProjectOpenUrl(project.id, version.id, project.projectType))}"
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
    const filterButton = event.target.closest("[data-project-filter]");
    const statusButton = event.target.closest("[data-project-status]");
    const editButton = event.target.closest("[data-project-edit]");
    const clearSearchButton = event.target.closest("[data-clear-project-search]");

    if (refreshButton) {
      loadSavedProjects();
    }

    if (filterButton) {
      dashboardProjectFilter =
        filterButton.getAttribute("data-project-filter") || "active";

      loadSavedProjects();
    }

    if (detailsButton) {
      showProjectDetails(detailsButton.getAttribute("data-project-details"));
    }

    if (editButton) {
      openProjectEditModal(editButton.getAttribute("data-project-edit"));
    }

    if (statusButton) {
      updateProjectStatus(
        statusButton.getAttribute("data-project-status-id"),
        statusButton.getAttribute("data-project-status")
      );
    }

    if (clearSearchButton) {
      dashboardProjectSearch = "";
      dashboardProjectTypeFilter = "all";
      loadSavedProjects();
    }
  });

  // Registered once, not inside the click handler above — that was
  // re-registering a fresh copy of both listeners on every filter-button
  // click, so search/sort would fire loadSavedProjects() more and more
  // times per keystroke the longer the page stayed open.
  document.addEventListener("input", event => {
    const searchInput = event.target.closest("[data-project-search]");

    if (!searchInput) {
      return;
    }

    dashboardProjectSearch = searchInput.value || "";

    window.clearTimeout(dashboardProjectSearchTimer);

    dashboardProjectSearchTimer = window.setTimeout(() => {
      loadSavedProjects();
    }, 180);
  });

  document.addEventListener("change", event => {
    const typeSelect = event.target.closest("[data-project-type-filter]");
    const sortSelect = event.target.closest("[data-project-sort]");

    if (typeSelect) {
      dashboardProjectTypeFilter = typeSelect.value || "all";
      loadSavedProjects();
    }

    if (sortSelect) {
      dashboardProjectSort = sortSelect.value || "pinned-newest";
      loadSavedProjects();
    }
  });

  document.addEventListener("DOMContentLoaded", loadSavedProjects);
})();
