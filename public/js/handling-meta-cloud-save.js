// =====================================================
// handling-meta-cloud-save.js
// Cloud Project save / open for the Handling.meta editor.
// Depends on: projectscloud.js, handlingmetaeditor.js
// =====================================================
(function () {
  const PROJECT_TYPE = "handling-meta";
  const SLOT_ID      = "hmCloudProjectPanelSlot";

  // ── Helpers ────────────────────────────────────────

  function $(id) { return document.getElementById(id); }

  function setStatus(msg, tone = "") {
    const el = document.querySelector("[data-hm-cloud-project-status]");
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
    if (window.GTATrafficActiveHMCloudProject?.id) {
      return window.GTATrafficActiveHMCloudProject.id;
    }
    return new URLSearchParams(window.location.search).get("projectId") || "";
  }

  function escapeHtml(s) {
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  // ── Save ───────────────────────────────────────────

  async function saveProject(btn) {
    if (!window.GTATrafficProjects) {
      setStatus("Cloud project client is not loaded.", "error"); return;
    }
    if (!window.handlingMetaEditor?.hasContent?.()) {
      setStatus("Load a handling.meta file before saving.", "warning"); return;
    }

    const name = (document.querySelector("[data-hm-cloud-project-name]")?.value.trim()) ||
      ("Handling.meta – " + new Date().toLocaleString());
    const desc = document.querySelector("[data-hm-cloud-project-description]")?.value.trim() || "";

    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
    setStatus("Saving cloud project…", "busy");

    try {
      const payload = window.handlingMetaEditor.getCloudPayload();
      const summary = {
        source: PROJECT_TYPE,
        fileName: payload.fileName,
        dlcName: payload.dlcName,
        profileCount: payload.profileCount
      };
      const activeId = getActiveProjectId();

      if (activeId) {
        const ver = await window.GTATrafficProjects.createProjectVersion(activeId, {
          label: getVersionLabel(), payload, summary
        });
        await window.GTATrafficProjects.updateProject(activeId, {
          name, description: desc, projectType: PROJECT_TYPE, status: "active"
        });
        window.GTATrafficActiveHMCloudProject = { id: activeId, name, savedAt: new Date().toISOString() };
        setStatus("Saved version " + ver.version.versionNumber + " — " + name, "success");
      } else {
        const result = await window.GTATrafficProjects.createProject({
          projectType: PROJECT_TYPE, name, description: desc, payload, summary
        });
        window.GTATrafficActiveHMCloudProject = {
          id: result.project.id, name: result.project.name, savedAt: new Date().toISOString()
        };
        setStatus("Saved cloud project: " + result.project.name, "success");
      }
      showSaveSuccessModal(name, payload);
    } catch (err) {
      setStatus(err.message || "Cloud save failed.", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Save to Cloud Project"; }
    }
  }

  // ── Success modal ──────────────────────────────────

  function showSaveSuccessModal(name, payload) {
    let overlay = document.querySelector("[data-hm-cloud-success-modal]");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "cloud-save-modal-overlay";
      overlay.setAttribute("data-hm-cloud-success-modal", "");
      overlay.innerHTML = `
        <div class="cloud-save-modal" role="dialog" aria-modal="true">
          <div class="cloud-save-modal-kicker">Cloud Save Complete</div>
          <h2>handling.meta project saved</h2>
          <div class="cloud-save-modal-details">
            <div><span>Project name</span><strong data-hm-modal-name></strong></div>
            <div><span>File</span><strong data-hm-modal-file></strong></div>
            <div><span>Profiles</span><strong data-hm-modal-count></strong></div>
            <div><span>Saved</span><strong data-hm-modal-time></strong></div>
          </div>
          <div class="cloud-save-modal-actions">
            <a class="button ghost" href="/dashboard.html">View Dashboard</a>
            <button type="button" class="button" data-hm-modal-close>OK</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", e => {
        if (e.target.matches("[data-hm-cloud-success-modal]") || e.target.matches("[data-hm-modal-close]")) {
          overlay.classList.remove("is-visible");
        }
      });
    }
    overlay.querySelector("[data-hm-modal-name]").textContent  = name;
    overlay.querySelector("[data-hm-modal-file]").textContent  = payload.fileName || "handling.meta";
    overlay.querySelector("[data-hm-modal-count]").textContent = String(payload.profileCount || 0);
    overlay.querySelector("[data-hm-modal-time]").textContent  = new Date().toLocaleString();
    overlay.classList.add("is-visible");
  }

  // ── Browse & Load modal ────────────────────────────

  async function openBrowseModal() {
    if (!window.GTATrafficProjects) {
      setStatus("Cloud project client is not loaded.", "error"); return;
    }

    let overlay = document.querySelector("[data-hm-cloud-browse-modal]");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "cloud-save-modal-overlay";
      overlay.setAttribute("data-hm-cloud-browse-modal", "");
      overlay.innerHTML = `
        <div class="cloud-save-modal" style="width:min(640px,100%)" role="dialog" aria-modal="true">
          <div class="cloud-save-modal-kicker">Cloud Projects</div>
          <h2>Load handling.meta project</h2>
          <div data-hm-browse-list style="max-height:340px;overflow-y:auto;margin-bottom:18px">
            <p style="color:rgba(203,213,225,.7)">Loading…</p>
          </div>
          <div class="cloud-save-modal-actions">
            <button type="button" class="button ghost" data-hm-browse-close>Cancel</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", e => {
        if (e.target.matches("[data-hm-cloud-browse-modal]") || e.target.matches("[data-hm-browse-close]")) {
          overlay.classList.remove("is-visible");
        }
      });
      overlay.addEventListener("click", async e => {
        const btn = e.target.closest("[data-hm-load-project-id]");
        if (!btn) return;
        await loadProjectById(btn.dataset.hmLoadProjectId, overlay);
      });
    }

    overlay.classList.add("is-visible");
    const list = overlay.querySelector("[data-hm-browse-list]");
    list.innerHTML = "<p style='color:rgba(203,213,225,.7)'>Loading…</p>";

    try {
      const result = await window.GTATrafficProjects.listProjects({ type: PROJECT_TYPE, status: "active", limit: 50 });
      const projects = result.projects || [];
      if (!projects.length) {
        list.innerHTML = "<p style='color:rgba(203,213,225,.7)'>No saved handling.meta projects yet.</p>";
        return;
      }
      list.innerHTML = projects.map(p => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid rgba(148,163,184,.16);border-radius:10px;margin-bottom:8px;background:rgba(2,6,10,.46)">
          <div>
            <strong style="color:#f8fafc;display:block">${escapeHtml(p.name)}</strong>
            <span style="color:rgba(203,213,225,.6);font-size:.8rem">${p.description ? escapeHtml(p.description) + " · " : ""}Updated ${new Date(p.updatedAt).toLocaleDateString()}</span>
          </div>
          <button type="button" class="button" data-hm-load-project-id="${escapeHtml(p.id)}" style="white-space:nowrap;margin-left:12px">Load</button>
        </div>`).join("");
    } catch (err) {
      list.innerHTML = "<p style='color:#fca5a5'>" + escapeHtml(err.message || "Failed to load projects.") + "</p>";
    }
  }

  async function loadProjectById(projectId, modalOverlay) {
    if (!projectId || !window.GTATrafficProjects) return;
    setStatus("Loading cloud project…", "busy");
    try {
      const detail = await window.GTATrafficProjects.getProject(projectId);
      applyCloudProject(detail);
      if (modalOverlay) modalOverlay.classList.remove("is-visible");
    } catch (err) {
      setStatus(err.message || "Could not load cloud project.", "error");
    }
  }

  function applyCloudProject(detail) {
    const version = detail?.versions?.[0];
    const payload = version?.payload || {};

    if (!payload.xmlText) throw new Error("This cloud project does not contain handling.meta XML.");

    window.handlingMetaEditor.applyCloudProject({
      xmlText:  payload.xmlText,
      fileName: payload.fileName || "handling.meta",
      dlcName:  payload.dlcName  || ""
    });

    window.GTATrafficActiveHMCloudProject = {
      id:   detail.project?.id   || "",
      name: detail.project?.name || payload.fileName || "handling.meta",
      openedAt: new Date().toISOString()
    };

    const nameInput = document.querySelector("[data-hm-cloud-project-name]");
    if (nameInput && detail.project?.name) nameInput.value = detail.project.name;

    const descInput = document.querySelector("[data-hm-cloud-project-description]");
    if (descInput && detail.project?.description) descInput.value = detail.project.description;

    setStatus("Opened: " + (detail.project?.name || payload.fileName), "success");
  }

  // ── Panel UI ───────────────────────────────────────

  function createPanel() {
    if (document.querySelector("[data-hm-cloud-project-panel]")) return;

    const panel = document.createElement("section");
    panel.className = "panel cloud-save-panel";
    panel.setAttribute("data-hm-cloud-project-panel", "");
    panel.innerHTML = `
      <div class="cloud-save-header">
        <div>
          <h2>Cloud Project Save</h2>
          <p>Save this handling.meta as a versioned cloud project linked to your dashboard. You can reload it here at any time.</p>
        </div>
      </div>
      <div class="cloud-save-grid">
        <label class="cloud-save-field">
          <span>Project Name</span>
          <input type="text" data-hm-cloud-project-name placeholder="e.g. Police handling pack">
        </label>
        <label class="cloud-save-field">
          <span>Description</span>
          <input type="text" data-hm-cloud-project-description placeholder="Optional note">
        </label>
      </div>
      <div class="cloud-save-actions">
        <button type="button" data-hm-cloud-save-btn>Save to Cloud Project</button>
        <button type="button" class="secondary" data-hm-cloud-browse-btn>Browse Saved Projects</button>
        <a class="button ghost" href="/dashboard.html">Dashboard</a>
      </div>
      <div class="cloud-save-status" data-hm-cloud-project-status>Cloud save is ready.</div>
    `;

    const slot = $(SLOT_ID) || document.querySelector("main") || document.body;
    if ($(SLOT_ID)) {
      slot.appendChild(panel);
    } else {
      slot.insertBefore(panel, slot.firstChild);
    }
  }

  // ── Auto-load from URL ─────────────────────────────

  async function autoLoadFromUrl() {
    const projectId = new URLSearchParams(window.location.search).get("projectId");
    if (!projectId || !window.GTATrafficProjects) return;
    setStatus("Opening cloud project…", "busy");
    try {
      const detail = await window.GTATrafficProjects.getProject(projectId);
      applyCloudProject(detail);
    } catch (err) {
      setStatus(err.message || "Could not open cloud project.", "error");
    }
  }

  // ── Wire events ────────────────────────────────────

  document.addEventListener("click", e => {
    if (e.target.closest("[data-hm-cloud-save-btn]"))   saveProject(e.target.closest("[data-hm-cloud-save-btn]"));
    if (e.target.closest("[data-hm-cloud-browse-btn]")) openBrowseModal();
  });

  document.addEventListener("DOMContentLoaded", () => {
    createPanel();
    window.setTimeout(autoLoadFromUrl, 500);
  });
})();
