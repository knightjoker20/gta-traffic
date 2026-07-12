// =====================================================
// combattasks-cloud-save.js
// Cloud Project save / open for the Combat Tasks Editor.
// Depends on: projectscloud.js, combattasksapp.js
// =====================================================
(function () {
  const PROJECT_TYPE = "combattasks";
  const SLOT_ID      = "tasksCloudSavePanelSlot";

  function $(id) { return document.getElementById(id); }

  function setStatus(msg, tone) {
    const el = document.querySelector("[data-tasks-cloud-status]");
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
    if (window.GTATrafficActiveCombatTasksProject?.id) return window.GTATrafficActiveCombatTasksProject.id;
    return new URLSearchParams(window.location.search).get("projectId") || "";
  }

  function hasContent() {
    return Boolean(window.tasksState?.data);
  }

  function getPayload() {
    const s = window.tasksState || {};
    return {
      projectType: PROJECT_TYPE,
      data:    s.data    ? JSON.parse(JSON.stringify(s.data))  : null,
      file:    s.file    || null,
      rawXml:  s.rawXml  || null,
    };
  }

  async function saveProject(btn) {
    if (!window.GTATrafficProjects) { setStatus("Cloud project client not loaded.", "error"); return; }
    if (!hasContent()) { setStatus("Load a combattasks.ymt.xml file before saving.", "warning"); return; }

    const name = document.querySelector("[data-tasks-cloud-name]")?.value.trim()
      || ("Combat Tasks – " + new Date().toLocaleString());
    const desc = document.querySelector("[data-tasks-cloud-desc]")?.value.trim() || "";

    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
    setStatus("Saving cloud project…", "busy");

    try {
      const payload = getPayload();
      const summary = { source: PROJECT_TYPE, files: [payload.file].filter(Boolean) };
      const activeId = getActiveProjectId();

      if (activeId) {
        const ver = await window.GTATrafficProjects.createProjectVersion(activeId, {
          label: getVersionLabel(), payload, summary
        });
        await window.GTATrafficProjects.updateProject(activeId, {
          name, description: desc, projectType: PROJECT_TYPE, status: "active"
        });
        window.GTATrafficActiveCombatTasksProject = { id: activeId, name, savedAt: new Date().toISOString() };
        setStatus("Saved version " + ver.version.versionNumber + " — " + name, "success");
      } else {
        const result = await window.GTATrafficProjects.createProject({
          projectType: PROJECT_TYPE, name, description: desc, payload, summary
        });
        window.GTATrafficActiveCombatTasksProject = {
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
      const projects = (payload.projects || []).filter(p => p.projectType === PROJECT_TYPE);
      renderBrowseModal(projects);
      setStatus("", "");
    } catch (err) {
      setStatus(err.message || "Could not load projects.", "error");
    }
  }

  function renderBrowseModal(projects) {
    let overlay = document.querySelector("[data-tasks-cloud-browse-modal]");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "cloud-save-modal-overlay";
      overlay.setAttribute("data-tasks-cloud-browse-modal", "");
      overlay.innerHTML = `
        <div class="cloud-save-modal" role="dialog" aria-modal="true">
          <div class="cloud-save-modal-kicker">Cloud Projects</div>
          <h2 style="margin:0 0 6px">Open Combat Tasks Project</h2>
          <p style="margin:0 0 18px;opacity:.7">Select a saved project to restore your combat tasks configuration.</p>
          <div data-tasks-browse-list style="display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto"></div>
          <div style="margin-top:18px;display:flex;justify-content:flex-end">
            <button type="button" class="button ghost" data-tasks-browse-close>Close</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", e => {
        if (e.target.matches("[data-tasks-cloud-browse-modal]") || e.target.matches("[data-tasks-browse-close]"))
          overlay.classList.remove("is-visible");
      });
    }

    const list = overlay.querySelector("[data-tasks-browse-list]");
    if (!projects.length) {
      list.innerHTML = `<p style="opacity:.6">No saved Combat Tasks projects found.</p>`;
    } else {
      list.innerHTML = projects.map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,.06);border-radius:10px;border:1px solid rgba(255,255,255,.1)">
          <div>
            <strong>${p.name}</strong>
            <div style="font-size:.78rem;opacity:.6">${p.description || "No description"}</div>
          </div>
          <button type="button" class="button" data-tasks-browse-open="${p.id}">Open</button>
        </div>`).join("");

      list.querySelectorAll("[data-tasks-browse-open]").forEach(btn => {
        btn.addEventListener("click", async () => {
          await openProject(btn.getAttribute("data-tasks-browse-open"));
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
      if (!latest?.payload) throw new Error("No data in this project");

      const p = latest.payload;
      const s = window.tasksState;

      if (p.data) {
        s.data    = JSON.parse(JSON.stringify(p.data));
        s.vanilla = JSON.parse(JSON.stringify(p.data));
        s.file    = p.file || "combattasks.ymt.xml";
        s.rawXml  = p.rawXml || null;

        const exportBtn = document.getElementById("tasksExportBtn");
        const resetBtn  = document.getElementById("tasksResetBtn");
        if (exportBtn) exportBtn.disabled = false;
        if (resetBtn)  resetBtn.disabled  = false;

        const zone = document.getElementById("tasksDropZone");
        if (zone) {
          zone.classList.add("is-loaded");
          const st = zone.querySelector(".ct-drop-state-text");
          if (st) st.textContent = "✓ Loaded from cloud: " + s.file;
        }

        if (typeof renderEditor === "function") renderEditor();
      }

      window.GTATrafficActiveCombatTasksProject = {
        id: projectId, name: payload.project.name, savedAt: new Date().toISOString()
      };

      const nameEl = document.querySelector("[data-tasks-cloud-name]");
      if (nameEl) nameEl.value = payload.project.name;

      if (typeof updateModCount === "function") updateModCount();
      setStatus("Opened: " + payload.project.name, "success");
    } catch (err) {
      setStatus(err.message || "Could not open project.", "error");
    }
  }

  function createPanel() {
    const slot = $(SLOT_ID);
    if (!slot) return;

    slot.innerHTML = `
      <section class="cloud-save-panel" data-tasks-cloud-save>
        <div class="cloud-save-panel-head">
          <span class="cloud-save-panel-kicker">Cloud Workspace</span>
          <h3>Combat Tasks Project</h3>
        </div>
        <div class="cloud-save-fields">
          <input type="text" data-tasks-cloud-name placeholder="Project name…" class="cloud-save-input">
          <textarea data-tasks-cloud-desc placeholder="Description (optional)" class="cloud-save-textarea" rows="2"></textarea>
        </div>
        <div class="cloud-save-actions">
          <button type="button" class="button" data-tasks-save-btn>Save to Cloud</button>
          <button type="button" class="secondary" data-tasks-cloud-browse-btn>Browse Saved Projects</button>
        </div>
        <div class="cloud-save-status" data-tasks-cloud-status></div>
      </section>`;

    slot.querySelector("[data-tasks-save-btn]").addEventListener("click", function () {
      saveProject(this);
    });
    slot.querySelector("[data-tasks-cloud-browse-btn]").addEventListener("click", browseProjects);

    const projectId = new URLSearchParams(window.location.search).get("projectId");
    if (projectId) openProject(projectId);
  }

  document.addEventListener("DOMContentLoaded", createPanel);
})();
