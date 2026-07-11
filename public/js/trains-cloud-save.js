// =====================================================
// trains-cloud-save.js
// Cloud Project save / open for the Trains Editor.
// Depends on: projectscloud.js, trainsapp.js
// =====================================================
(function () {
  const PROJECT_TYPE = "trains";
  const SLOT_ID      = "trainsCloudSavePanelSlot";

  function $(id) { return document.getElementById(id); }

  function setStatus(msg, tone) {
    const el = document.querySelector("[data-trains-cloud-status]");
    if (!el) return;
    el.textContent = msg;
    el.className = "cloud-save-status" + (tone ? " is-" + tone : "");
  }

  function getVersionLabel() {
    return "Saved " + new Date().toLocaleString([], {
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit"
    });
  }

  function getActiveProjectId() {
    if (window.GTATrafficActiveTrainsProject?.id) return window.GTATrafficActiveTrainsProject.id;
    return new URLSearchParams(window.location.search).get("projectId") || "";
  }

  function hasContent() {
    return Boolean(window.trackState?.data || window.consistState?.data);
  }

  function getPayload() {
    return {
      projectType: PROJECT_TYPE,
      trackData:   window.trackState?.data   ? JSON.parse(JSON.stringify(window.trackState.data))   : null,
      consistData: window.consistState?.data ? JSON.parse(JSON.stringify(window.consistState.data)) : null,
      consistGroups: window.consistState?.groups ? JSON.parse(JSON.stringify(window.consistState.groups)) : null
    };
  }

  async function saveProject(btn) {
    if (!window.GTATrafficProjects) { setStatus("Cloud project client not loaded.", "error"); return; }
    if (!hasContent()) { setStatus("Load traintracks.xml or trains.xml before saving.", "warning"); return; }

    const name = document.querySelector("[data-trains-cloud-name]")?.value.trim()
      || ("Trains – " + new Date().toLocaleString());
    const desc = document.querySelector("[data-trains-cloud-desc]")?.value.trim() || "";

    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
    setStatus("Saving cloud project…", "busy");

    try {
      const payload = getPayload();
      const summary = { source: PROJECT_TYPE, hasTracks: Boolean(payload.trackData), hasConsists: Boolean(payload.consistData) };
      const activeId = getActiveProjectId();

      if (activeId) {
        const ver = await window.GTATrafficProjects.createProjectVersion(activeId, {
          label: getVersionLabel(), payload, summary
        });
        await window.GTATrafficProjects.updateProject(activeId, {
          name, description: desc, projectType: PROJECT_TYPE, status: "active"
        });
        window.GTATrafficActiveTrainsProject = { id: activeId, name, savedAt: new Date().toISOString() };
        setStatus("Saved version " + ver.version.versionNumber + " — " + name, "success");
      } else {
        const result = await window.GTATrafficProjects.createProject({
          projectType: PROJECT_TYPE, name, description: desc, payload, summary
        });
        window.GTATrafficActiveTrainsProject = {
          id: result.project.id, name: result.project.name, savedAt: new Date().toISOString()
        };
        setStatus("Saved: " + result.project.name, "success");
      }
    } catch (err) {
      setStatus(err.message || "Cloud save failed.", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Save to Cloud"; }
    }
  }

  async function browseProjects() {
    if (!window.GTATrafficProjects) { setStatus("Cloud project client not loaded.", "error"); return; }
    setStatus("Loading saved projects…", "busy");
    try {
      const res = await fetch("/api/projects?status=active", { credentials: "same-origin" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) throw new Error(payload.error || "Could not load projects");
      renderBrowseModal((payload.projects || []).filter(p => p.projectType === PROJECT_TYPE));
      setStatus("", "");
    } catch (err) {
      setStatus(err.message || "Could not load projects.", "error");
    }
  }

  function renderBrowseModal(projects) {
    let overlay = document.querySelector("[data-trains-cloud-browse-modal]");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "cloud-save-modal-overlay";
      overlay.setAttribute("data-trains-cloud-browse-modal", "");
      overlay.innerHTML = `
        <div class="cloud-save-modal" role="dialog" aria-modal="true">
          <div class="cloud-save-modal-kicker">Cloud Projects</div>
          <h2 style="margin:0 0 6px">Open Trains Project</h2>
          <p style="margin:0 0 18px;opacity:.7">Select a saved project to restore.</p>
          <div data-trains-browse-list style="display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto"></div>
          <div style="margin-top:18px;display:flex;justify-content:flex-end">
            <button type="button" class="button ghost" data-trains-browse-close>Close</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", e => {
        if (e.target.matches("[data-trains-cloud-browse-modal]") || e.target.matches("[data-trains-browse-close]"))
          overlay.classList.remove("is-visible");
      });
    }

    const list = overlay.querySelector("[data-trains-browse-list]");
    if (!projects.length) {
      list.innerHTML = `<p style="opacity:.6">No saved Trains projects found.</p>`;
    } else {
      list.innerHTML = projects.map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,.06);border-radius:10px;border:1px solid rgba(255,255,255,.1)">
          <div>
            <strong>${p.name}</strong>
            <div style="font-size:.78rem;opacity:.6">${p.description || "No description"}</div>
          </div>
          <button type="button" class="button" data-trains-browse-open="${p.id}">Open</button>
        </div>`).join("");

      list.querySelectorAll("[data-trains-browse-open]").forEach(btn => {
        btn.addEventListener("click", async () => {
          await openProject(btn.getAttribute("data-trains-browse-open"));
          overlay.classList.remove("is-visible");
        });
      });
    }
    overlay.classList.add("is-visible");
  }

  async function openProject(projectId) {
    setStatus("Loading project…", "busy");
    try {
      const res = await fetch("/api/projects/" + encodeURIComponent(projectId), { credentials: "same-origin" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) throw new Error(payload.error || "Could not load project");

      const versions = payload.versions || [];
      const latest = versions.sort((a, b) => Number(b.versionNumber) - Number(a.versionNumber))[0];
      if (!latest?.payload) throw new Error("No trains data in this project");

      const p = latest.payload;
      if (p.trackData)    { window.trackState.data = JSON.parse(JSON.stringify(p.trackData)); if (typeof renderTracks   === "function") renderTracks(); }
      if (p.consistData)  { window.consistState.data = JSON.parse(JSON.stringify(p.consistData)); if (typeof renderConsists === "function") renderConsists(); }
      if (p.consistGroups){ window.consistState.groups = JSON.parse(JSON.stringify(p.consistGroups)); }

      window.GTATrafficActiveTrainsProject = { id: projectId, name: payload.project.name, savedAt: new Date().toISOString() };

      const nameEl = document.querySelector("[data-trains-cloud-name]");
      if (nameEl) nameEl.value = payload.project.name;
      setStatus("Opened: " + payload.project.name, "success");
    } catch (err) {
      setStatus(err.message || "Could not open project.", "error");
    }
  }

  function createPanel() {
    const slot = $(SLOT_ID);
    if (!slot) return;

    slot.innerHTML = `
      <section class="cloud-save-panel" data-trains-cloud-save>
        <div class="cloud-save-panel-head">
          <span class="cloud-save-panel-kicker">Cloud Workspace</span>
          <h3>Trains Project</h3>
        </div>
        <div class="cloud-save-fields">
          <input type="text" data-trains-cloud-name placeholder="Project name…" class="cloud-save-input">
          <textarea data-trains-cloud-desc placeholder="Description (optional)" class="cloud-save-textarea" rows="2"></textarea>
        </div>
        <div class="cloud-save-actions">
          <button type="button" class="button" data-trains-save-btn>Save to Cloud</button>
          <button type="button" class="secondary" data-trains-cloud-browse-btn>Browse Saved Projects</button>
        </div>
        <div class="cloud-save-status" data-trains-cloud-status></div>
      </section>`;

    slot.querySelector("[data-trains-save-btn]").addEventListener("click", function () { saveProject(this); });
    slot.querySelector("[data-trains-cloud-browse-btn]").addEventListener("click", browseProjects);

    const projectId = new URLSearchParams(window.location.search).get("projectId");
    if (projectId) openProject(projectId);
  }

  document.addEventListener("DOMContentLoaded", createPanel);
})();
