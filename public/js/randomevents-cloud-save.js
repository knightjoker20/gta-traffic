// =====================================================
// randomevents-cloud-save.js
// Cloud Project save / open for the Random Events Editor.
// Depends on: projectscloud.js, randomeventsapp.js
// =====================================================
(function () {
  const PROJECT_TYPE = "randomevents";
  const SLOT_ID      = "reCloudSavePanelSlot";

  function $(id) { return document.getElementById(id); }

  function setStatus(msg, tone) {
    const el = document.querySelector("[data-re-cloud-status]");
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
    if (window.GTATrafficActiveRandomEventsProject?.id) return window.GTATrafficActiveRandomEventsProject.id;
    return new URLSearchParams(window.location.search).get("projectId") || "";
  }

  function hasContent() {
    return Boolean(window.eventsState?.data);
  }

  function getPayload() {
    const s = window.eventsState || {};
    return {
      projectType: PROJECT_TYPE,
      data:   s.data   ? JSON.parse(JSON.stringify(s.data)) : null,
      file:   s.file   || null,
      rawXml: s.rawXml || null,
    };
  }

  async function saveProject(btn) {
    if (!window.GTATrafficProjects) { setStatus("Cloud project client not loaded.", "error"); return; }
    if (!hasContent()) { setStatus("Load a randomevents.ymt.xml file before saving.", "warning"); return; }

    const name = document.querySelector("[data-re-cloud-name]")?.value.trim()
      || ("Random Events – " + new Date().toLocaleString());
    const desc = document.querySelector("[data-re-cloud-desc]")?.value.trim() || "";

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
        window.GTATrafficActiveRandomEventsProject = { id: activeId, name, savedAt: new Date().toISOString() };
        setStatus("Saved version " + ver.version.versionNumber + " — " + name, "success");
      } else {
        const result = await window.GTATrafficProjects.createProject({
          projectType: PROJECT_TYPE, name, description: desc, payload, summary
        });
        window.GTATrafficActiveRandomEventsProject = {
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
    let overlay = document.querySelector("[data-re-cloud-browse-modal]");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "cloud-save-modal-overlay";
      overlay.setAttribute("data-re-cloud-browse-modal", "");
      overlay.innerHTML = `
        <div class="cloud-save-modal" role="dialog" aria-modal="true">
          <div class="cloud-save-modal-kicker">Cloud Projects</div>
          <h2 style="margin:0 0 6px">Open Random Events Project</h2>
          <p style="margin:0 0 18px;opacity:.7">Select a saved project to restore your configuration.</p>
          <div data-re-browse-list style="display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto"></div>
          <div style="margin-top:18px;display:flex;justify-content:flex-end">
            <button type="button" class="button ghost" data-re-browse-close>Close</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", e => {
        if (e.target.matches("[data-re-cloud-browse-modal]") || e.target.matches("[data-re-browse-close]"))
          overlay.classList.remove("is-visible");
      });
    }

    const list = overlay.querySelector("[data-re-browse-list]");
    if (!projects.length) {
      list.innerHTML = `<p style="opacity:.6">No saved Random Events projects found.</p>`;
    } else {
      list.innerHTML = projects.map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,.06);border-radius:10px;border:1px solid rgba(255,255,255,.1)">
          <div>
            <strong>${p.name}</strong>
            <div style="font-size:.78rem;opacity:.6">${p.description || "No description"}</div>
          </div>
          <button type="button" class="button" data-re-browse-open="${p.id}">Open</button>
        </div>`).join("");

      list.querySelectorAll("[data-re-browse-open]").forEach(btn => {
        btn.addEventListener("click", async () => {
          await openProject(btn.getAttribute("data-re-browse-open"));
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
      const s = window.eventsState;

      if (p.data) {
        s.data    = JSON.parse(JSON.stringify(p.data));
        s.vanilla = JSON.parse(JSON.stringify(p.data));
        s.file    = p.file || "randomevents.ymt.xml";
        s.rawXml  = p.rawXml || null;

        document.getElementById("reExportBtn").disabled = false;
        document.getElementById("reResetBtn").disabled  = false;

        const zone = document.getElementById("reDropZone");
        if (zone) {
          zone.classList.add("is-loaded");
          const st = zone.querySelector(".re-drop-state-text");
          if (st) st.textContent = "✓ Loaded from cloud: " + s.file;
        }

        if (typeof renderEditor === "function") renderEditor();
        else if (window.eventsState) {
          // renderEditor is scoped inside the IIFE — trigger via CustomEvent
          document.dispatchEvent(new CustomEvent("re-render"));
        }
      }

      window.GTATrafficActiveRandomEventsProject = {
        id: projectId, name: payload.project.name, savedAt: new Date().toISOString()
      };

      const nameEl = document.querySelector("[data-re-cloud-name]");
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
      <section class="cloud-save-panel" data-re-cloud-save>
        <div class="cloud-save-panel-head">
          <span class="cloud-save-panel-kicker">Cloud Workspace</span>
          <h3>Random Events Project</h3>
        </div>
        <div class="cloud-save-fields">
          <input type="text" data-re-cloud-name placeholder="Project name…" class="cloud-save-input">
          <textarea data-re-cloud-desc placeholder="Description (optional)" class="cloud-save-textarea" rows="2"></textarea>
        </div>
        <div class="cloud-save-actions">
          <button type="button" class="button" data-re-save-btn>Save to Cloud</button>
          <button type="button" class="secondary" data-re-cloud-browse-btn>Browse Saved Projects</button>
        </div>
        <div class="cloud-save-status" data-re-cloud-status></div>
      </section>`;

    slot.querySelector("[data-re-save-btn]").addEventListener("click", function () {
      saveProject(this);
    });
    slot.querySelector("[data-re-cloud-browse-btn]").addEventListener("click", browseProjects);

    const projectId = new URLSearchParams(window.location.search).get("projectId");
    if (projectId) openProject(projectId);
  }

  document.addEventListener("DOMContentLoaded", createPanel);
})();
