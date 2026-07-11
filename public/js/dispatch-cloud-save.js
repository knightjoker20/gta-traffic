// =====================================================
// dispatch-cloud-save.js
// Cloud Project save / open for the Dispatch Editor.
// Depends on: projectscloud.js, dispatchapp.js
// =====================================================
(function () {
  const PROJECT_TYPE = "dispatch";
  const SLOT_ID      = "dispatchCloudSavePanelSlot";

  function $(id) { return document.getElementById(id); }

  function setStatus(msg, tone) {
    const el = document.querySelector("[data-dispatch-cloud-status]");
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
    if (window.GTATrafficActiveDispatchProject?.id) return window.GTATrafficActiveDispatchProject.id;
    return new URLSearchParams(window.location.search).get("projectId") || "";
  }

  function hasContent() {
    return Boolean(window.dispatchState?.data);
  }

  function getPayload() {
    return {
      projectType: PROJECT_TYPE,
      dispatchData: JSON.parse(JSON.stringify(window.dispatchState?.data || {})),
      fileName: window.dispatchState?.loadedFile || "dispatch.meta"
    };
  }

  async function saveProject(btn) {
    if (!window.GTATrafficProjects) { setStatus("Cloud project client not loaded.", "error"); return; }
    if (!hasContent()) { setStatus("Load a dispatch.meta file before saving.", "warning"); return; }

    const name = document.querySelector("[data-dispatch-cloud-name]")?.value.trim()
      || ("Dispatch – " + new Date().toLocaleString());
    const desc = document.querySelector("[data-dispatch-cloud-desc]")?.value.trim() || "";

    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
    setStatus("Saving cloud project…", "busy");

    try {
      const payload = getPayload();
      const summary = { source: PROJECT_TYPE, fileName: payload.fileName };
      const activeId = getActiveProjectId();

      if (activeId) {
        const ver = await window.GTATrafficProjects.createProjectVersion(activeId, {
          label: getVersionLabel(), payload, summary
        });
        await window.GTATrafficProjects.updateProject(activeId, {
          name, description: desc, projectType: PROJECT_TYPE, status: "active"
        });
        window.GTATrafficActiveDispatchProject = { id: activeId, name, savedAt: new Date().toISOString() };
        setStatus("Saved version " + ver.version.versionNumber + " — " + name, "success");
      } else {
        const result = await window.GTATrafficProjects.createProject({
          projectType: PROJECT_TYPE, name, description: desc, payload, summary
        });
        window.GTATrafficActiveDispatchProject = {
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
    let overlay = document.querySelector("[data-dispatch-cloud-browse-modal]");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "cloud-save-modal-overlay";
      overlay.setAttribute("data-dispatch-cloud-browse-modal", "");
      overlay.innerHTML = `
        <div class="cloud-save-modal" role="dialog" aria-modal="true">
          <div class="cloud-save-modal-kicker">Cloud Projects</div>
          <h2 style="margin:0 0 6px">Open Dispatch Project</h2>
          <p style="margin:0 0 18px;opacity:.7">Select a saved version to restore.</p>
          <div data-dispatch-browse-list style="display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto"></div>
          <div style="margin-top:18px;display:flex;justify-content:flex-end">
            <button type="button" class="button ghost" data-dispatch-browse-close>Close</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", e => {
        if (e.target.matches("[data-dispatch-cloud-browse-modal]") || e.target.matches("[data-dispatch-browse-close]"))
          overlay.classList.remove("is-visible");
      });
    }

    const list = overlay.querySelector("[data-dispatch-browse-list]");
    if (!projects.length) {
      list.innerHTML = `<p style="opacity:.6">No saved Dispatch projects found.</p>`;
    } else {
      list.innerHTML = projects.map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,.06);border-radius:10px;border:1px solid rgba(255,255,255,.1)">
          <div>
            <strong>${p.name}</strong>
            <div style="font-size:.78rem;opacity:.6">${p.description || "No description"}</div>
          </div>
          <button type="button" class="button" data-dispatch-browse-open="${p.id}">Open</button>
        </div>`).join("");

      list.querySelectorAll("[data-dispatch-browse-open]").forEach(btn => {
        btn.addEventListener("click", async () => {
          await openProject(btn.getAttribute("data-dispatch-browse-open"));
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
      if (!latest?.payload?.dispatchData) throw new Error("No dispatch data in this project");

      window.dispatchState.data = JSON.parse(JSON.stringify(latest.payload.dispatchData));
      window.dispatchState.loadedFile = latest.payload.fileName || "dispatch.meta";
      window.GTATrafficActiveDispatchProject = { id: projectId, name: payload.project.name, savedAt: new Date().toISOString() };

      if (typeof renderAll === "function") renderAll();

      const nameEl = document.querySelector("[data-dispatch-cloud-name]");
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
      <section class="cloud-save-panel" data-dispatch-cloud-save>
        <div class="cloud-save-panel-head">
          <span class="cloud-save-panel-kicker">Cloud Workspace</span>
          <h3>Dispatch Project</h3>
        </div>
        <div class="cloud-save-fields">
          <input type="text" data-dispatch-cloud-name placeholder="Project name…" class="cloud-save-input">
          <textarea data-dispatch-cloud-desc placeholder="Description (optional)" class="cloud-save-textarea" rows="2"></textarea>
        </div>
        <div class="cloud-save-actions">
          <button type="button" class="button" data-dispatch-save-btn>Save to Cloud</button>
          <button type="button" class="secondary" data-dispatch-cloud-browse-btn>Browse Saved Projects</button>
        </div>
        <div class="cloud-save-status" data-dispatch-cloud-status></div>
      </section>`;

    slot.querySelector("[data-dispatch-save-btn]").addEventListener("click", function () {
      saveProject(this);
    });
    slot.querySelector("[data-dispatch-cloud-browse-btn]").addEventListener("click", browseProjects);

    // Auto-load if projectId in URL
    const projectId = new URLSearchParams(window.location.search).get("projectId");
    if (projectId) openProject(projectId);
  }

  document.addEventListener("DOMContentLoaded", createPanel);
})();
