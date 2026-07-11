// =====================================================
// events-cloud-save.js
// Cloud Project save / open for the Events Editor.
// Depends on: projectscloud.js, eventsapp.js
// =====================================================
(function () {
  const PROJECT_TYPE = "events";
  const SLOT_ID      = "eventsCloudSavePanelSlot";

  function $(id) { return document.getElementById(id); }

  function setStatus(msg, tone) {
    const el = document.querySelector("[data-events-cloud-status]");
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
    if (window.GTATrafficActiveEventsProject?.id) return window.GTATrafficActiveEventsProject.id;
    return new URLSearchParams(window.location.search).get("projectId") || "";
  }

  function hasContent() {
    return Boolean(window.state?.fileLoaded || Object.keys(window.state?.rulesData || {}).length);
  }

  function getPayload() {
    const s = window.state || {};
    return {
      projectType:   PROJECT_TYPE,
      rulesData:     JSON.parse(JSON.stringify(s.rulesData    || {})),
      modifications: JSON.parse(JSON.stringify(s.modifications || {})),
      taskTypes:     JSON.parse(JSON.stringify(s.taskTypes    || []))
    };
  }

  async function saveProject(btn) {
    if (!window.GTATrafficProjects) { setStatus("Cloud project client not loaded.", "error"); return; }
    if (!hasContent()) { setStatus("Load an events.meta file before saving.", "warning"); return; }

    const name = document.querySelector("[data-events-cloud-name]")?.value.trim()
      || ("Events – " + new Date().toLocaleString());
    const desc = document.querySelector("[data-events-cloud-desc]")?.value.trim() || "";

    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
    setStatus("Saving cloud project…", "busy");

    try {
      const payload = getPayload();
      const summary = { source: PROJECT_TYPE, ruleCount: Object.keys(payload.rulesData).length };
      const activeId = getActiveProjectId();

      if (activeId) {
        const ver = await window.GTATrafficProjects.createProjectVersion(activeId, {
          label: getVersionLabel(), payload, summary
        });
        await window.GTATrafficProjects.updateProject(activeId, {
          name, description: desc, projectType: PROJECT_TYPE, status: "active"
        });
        window.GTATrafficActiveEventsProject = { id: activeId, name, savedAt: new Date().toISOString() };
        setStatus("Saved version " + ver.version.versionNumber + " — " + name, "success");
      } else {
        const result = await window.GTATrafficProjects.createProject({
          projectType: PROJECT_TYPE, name, description: desc, payload, summary
        });
        window.GTATrafficActiveEventsProject = {
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
    let overlay = document.querySelector("[data-events-cloud-browse-modal]");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "cloud-save-modal-overlay";
      overlay.setAttribute("data-events-cloud-browse-modal", "");
      overlay.innerHTML = `
        <div class="cloud-save-modal" role="dialog" aria-modal="true">
          <div class="cloud-save-modal-kicker">Cloud Projects</div>
          <h2 style="margin:0 0 6px">Open Events Project</h2>
          <p style="margin:0 0 18px;opacity:.7">Select a saved project to restore.</p>
          <div data-events-browse-list style="display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto"></div>
          <div style="margin-top:18px;display:flex;justify-content:flex-end">
            <button type="button" class="button ghost" data-events-browse-close>Close</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", e => {
        if (e.target.matches("[data-events-cloud-browse-modal]") || e.target.matches("[data-events-browse-close]"))
          overlay.classList.remove("is-visible");
      });
    }

    const list = overlay.querySelector("[data-events-browse-list]");
    if (!projects.length) {
      list.innerHTML = `<p style="opacity:.6">No saved Events projects found.</p>`;
    } else {
      list.innerHTML = projects.map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,.06);border-radius:10px;border:1px solid rgba(255,255,255,.1)">
          <div>
            <strong>${p.name}</strong>
            <div style="font-size:.78rem;opacity:.6">${p.description || "No description"}</div>
          </div>
          <button type="button" class="button" data-events-browse-open="${p.id}">Open</button>
        </div>`).join("");

      list.querySelectorAll("[data-events-browse-open]").forEach(btn => {
        btn.addEventListener("click", async () => {
          await openProject(btn.getAttribute("data-events-browse-open"));
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
      if (!latest?.payload?.rulesData) throw new Error("No events data in this project");

      const p = latest.payload;
      window.state.rulesData     = JSON.parse(JSON.stringify(p.rulesData));
      window.state.modifications = JSON.parse(JSON.stringify(p.modifications || {}));
      window.state.taskTypes     = JSON.parse(JSON.stringify(p.taskTypes || []));
      window.state.fileLoaded    = true;
      window.GTATrafficActiveEventsProject = { id: projectId, name: payload.project.name, savedAt: new Date().toISOString() };

      // Trigger re-render using whichever functions eventsapp.js exposes
      if (typeof renderProfiles       === "function") renderProfiles();
      if (typeof renderRules          === "function") renderRules();
      if (typeof renderTaskTypes      === "function") renderTaskTypes();

      const nameEl = document.querySelector("[data-events-cloud-name]");
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
      <section class="cloud-save-panel" data-events-cloud-save>
        <div class="cloud-save-panel-head">
          <span class="cloud-save-panel-kicker">Cloud Workspace</span>
          <h3>Events Project</h3>
        </div>
        <div class="cloud-save-fields">
          <input type="text" data-events-cloud-name placeholder="Project name…" class="cloud-save-input">
          <textarea data-events-cloud-desc placeholder="Description (optional)" class="cloud-save-textarea" rows="2"></textarea>
        </div>
        <div class="cloud-save-actions">
          <button type="button" class="button" data-events-save-btn>Save to Cloud</button>
          <button type="button" class="secondary" data-events-cloud-browse-btn>Browse Saved Projects</button>
        </div>
        <div class="cloud-save-status" data-events-cloud-status></div>
      </section>`;

    slot.querySelector("[data-events-save-btn]").addEventListener("click", function () { saveProject(this); });
    slot.querySelector("[data-events-cloud-browse-btn]").addEventListener("click", browseProjects);

    const projectId = new URLSearchParams(window.location.search).get("projectId");
    if (projectId) openProject(projectId);
  }

  document.addEventListener("DOMContentLoaded", createPanel);
})();
