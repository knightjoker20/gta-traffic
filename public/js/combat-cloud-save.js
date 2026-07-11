// =====================================================
// combat-cloud-save.js
// Cloud Project save / open for the NPC Combat Editor.
// Depends on: projectscloud.js, combatapp.js
// =====================================================
(function () {
  const PROJECT_TYPE = "combat";
  const SLOT_ID      = "combatCloudSavePanelSlot";

  function $(id) { return document.getElementById(id); }

  function setStatus(msg, tone) {
    const el = document.querySelector("[data-combat-cloud-status]");
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
    if (window.GTATrafficActiveCombatProject?.id) return window.GTATrafficActiveCombatProject.id;
    return new URLSearchParams(window.location.search).get("projectId") || "";
  }

  function hasContent() {
    const s = window.combatState;
    return Boolean(s?.healthData || s?.brawlingData || s?.behaviourData || s?.triggersData);
  }

  function getPayload() {
    const s = window.combatState || {};
    return {
      projectType: PROJECT_TYPE,
      healthData:    s.healthData    ? JSON.parse(JSON.stringify(s.healthData))    : null,
      healthFile:    s.healthFile    || null,
      brawlingData:  s.brawlingData  ? JSON.parse(JSON.stringify(s.brawlingData))  : null,
      brawlingFile:  s.brawlingFile  || null,
      behaviourData: s.behaviourData ? JSON.parse(JSON.stringify(s.behaviourData)) : null,
      behaviourFile: s.behaviourFile || null,
      triggersData:  s.triggersData  ? JSON.parse(JSON.stringify(s.triggersData))  : null,
      triggersFile:  s.triggersFile  || null,
    };
  }

  async function saveProject(btn) {
    if (!window.GTATrafficProjects) { setStatus("Cloud project client not loaded.", "error"); return; }
    if (!hasContent()) { setStatus("Load at least one combat meta file before saving.", "warning"); return; }

    const name = document.querySelector("[data-combat-cloud-name]")?.value.trim()
      || ("NPC Combat – " + new Date().toLocaleString());
    const desc = document.querySelector("[data-combat-cloud-desc]")?.value.trim() || "";

    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
    setStatus("Saving cloud project…", "busy");

    try {
      const payload = getPayload();
      const loadedFiles = [
        payload.healthFile, payload.brawlingFile,
        payload.behaviourFile, payload.triggersFile
      ].filter(Boolean);
      const summary = { source: PROJECT_TYPE, files: loadedFiles };
      const activeId = getActiveProjectId();

      if (activeId) {
        const ver = await window.GTATrafficProjects.createProjectVersion(activeId, {
          label: getVersionLabel(), payload, summary
        });
        await window.GTATrafficProjects.updateProject(activeId, {
          name, description: desc, projectType: PROJECT_TYPE, status: "active"
        });
        window.GTATrafficActiveCombatProject = { id: activeId, name, savedAt: new Date().toISOString() };
        setStatus("Saved version " + ver.version.versionNumber + " — " + name, "success");
      } else {
        const result = await window.GTATrafficProjects.createProject({
          projectType: PROJECT_TYPE, name, description: desc, payload, summary
        });
        window.GTATrafficActiveCombatProject = {
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
    let overlay = document.querySelector("[data-combat-cloud-browse-modal]");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "cloud-save-modal-overlay";
      overlay.setAttribute("data-combat-cloud-browse-modal", "");
      overlay.innerHTML = `
        <div class="cloud-save-modal" role="dialog" aria-modal="true">
          <div class="cloud-save-modal-kicker">Cloud Projects</div>
          <h2 style="margin:0 0 6px">Open NPC Combat Project</h2>
          <p style="margin:0 0 18px;opacity:.7">Select a saved project to restore all loaded files.</p>
          <div data-combat-browse-list style="display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto"></div>
          <div style="margin-top:18px;display:flex;justify-content:flex-end">
            <button type="button" class="button ghost" data-combat-browse-close>Close</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", e => {
        if (e.target.matches("[data-combat-cloud-browse-modal]") || e.target.matches("[data-combat-browse-close]"))
          overlay.classList.remove("is-visible");
      });
    }

    const list = overlay.querySelector("[data-combat-browse-list]");
    if (!projects.length) {
      list.innerHTML = `<p style="opacity:.6">No saved NPC Combat projects found.</p>`;
    } else {
      list.innerHTML = projects.map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,.06);border-radius:10px;border:1px solid rgba(255,255,255,.1)">
          <div>
            <strong>${p.name}</strong>
            <div style="font-size:.78rem;opacity:.6">${p.description || "No description"}</div>
          </div>
          <button type="button" class="button" data-combat-browse-open="${p.id}">Open</button>
        </div>`).join("");

      list.querySelectorAll("[data-combat-browse-open]").forEach(btn => {
        btn.addEventListener("click", async () => {
          await openProject(btn.getAttribute("data-combat-browse-open"));
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
      const s = window.combatState;

      if (p.healthData) {
        s.healthData    = JSON.parse(JSON.stringify(p.healthData));
        s.healthVanilla = JSON.parse(JSON.stringify(p.healthData));
        s.healthFile    = p.healthFile || "pedhealth.meta";
        const exp = document.getElementById("healthExportBtn"), rst = document.getElementById("healthResetBtn");
        if (exp) exp.disabled = false;
        if (rst) rst.disabled = false;
        const zone = document.getElementById("healthDropZone");
        if (zone) {
          zone.classList.add("is-loaded");
          const st = zone.querySelector(".combat-drop-state-text");
          if (st) st.textContent = "✓ Loaded from cloud: " + s.healthFile;
        }
        if (typeof renderHealth === "function") renderHealth();
      }

      if (p.brawlingData) {
        s.brawlingData    = JSON.parse(JSON.stringify(p.brawlingData));
        s.brawlingVanilla = JSON.parse(JSON.stringify(p.brawlingData));
        s.brawlingFile    = p.brawlingFile || "pedbrawlingstyle.meta";
        s.activeBrawlingIdx = 0;
        const exp = document.getElementById("brawlingExportBtn"), rst = document.getElementById("brawlingResetBtn");
        if (exp) exp.disabled = false;
        if (rst) rst.disabled = false;
        const zone = document.getElementById("brawlingDropZone");
        if (zone) {
          zone.classList.add("is-loaded");
          const st = zone.querySelector(".combat-drop-state-text");
          if (st) st.textContent = "✓ Loaded from cloud: " + s.brawlingFile;
        }
        if (typeof renderBrawling === "function") renderBrawling();
      }

      if (p.behaviourData) {
        s.behaviourData    = JSON.parse(JSON.stringify(p.behaviourData));
        s.behaviourVanilla = JSON.parse(JSON.stringify(p.behaviourData));
        s.behaviourFile    = p.behaviourFile || "combatbehaviour.meta";
        s.activeBehaviourIdx = 0;
        const exp = document.getElementById("behaviourExportBtn"), rst = document.getElementById("behaviourResetBtn");
        if (exp) exp.disabled = false;
        if (rst) rst.disabled = false;
        const zone = document.getElementById("behaviourDropZone");
        if (zone) {
          zone.classList.add("is-loaded");
          const st = zone.querySelector(".combat-drop-state-text");
          if (st) st.textContent = "✓ Loaded from cloud: " + s.behaviourFile;
        }
        if (typeof renderBehaviour === "function") renderBehaviour();
      }

      if (p.triggersData) {
        s.triggersData    = JSON.parse(JSON.stringify(p.triggersData));
        s.triggersVanilla = JSON.parse(JSON.stringify(p.triggersData));
        s.triggersFile    = p.triggersFile || "agitatedtriggers.meta";
        const exp = document.getElementById("triggersExportBtn"), rst = document.getElementById("triggersResetBtn");
        if (exp) exp.disabled = false;
        if (rst) rst.disabled = false;
        const zone = document.getElementById("triggersDropZone");
        if (zone) {
          zone.classList.add("is-loaded");
          const st = zone.querySelector(".combat-drop-state-text");
          if (st) st.textContent = "✓ Loaded from cloud: " + s.triggersFile;
        }
        if (typeof renderTriggers === "function") renderTriggers();
      }

      window.GTATrafficActiveCombatProject = {
        id: projectId, name: payload.project.name, savedAt: new Date().toISOString()
      };

      const nameEl = document.querySelector("[data-combat-cloud-name]");
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
      <section class="cloud-save-panel" data-combat-cloud-save>
        <div class="cloud-save-panel-head">
          <span class="cloud-save-panel-kicker">Cloud Workspace</span>
          <h3>NPC Combat Project</h3>
        </div>
        <div class="cloud-save-fields">
          <input type="text" data-combat-cloud-name placeholder="Project name…" class="cloud-save-input">
          <textarea data-combat-cloud-desc placeholder="Description (optional)" class="cloud-save-textarea" rows="2"></textarea>
        </div>
        <div class="cloud-save-actions">
          <button type="button" class="button" data-combat-save-btn>Save to Cloud</button>
          <button type="button" class="secondary" data-combat-cloud-browse-btn>Browse Saved Projects</button>
        </div>
        <div class="cloud-save-status" data-combat-cloud-status></div>
      </section>`;

    slot.querySelector("[data-combat-save-btn]").addEventListener("click", function () {
      saveProject(this);
    });
    slot.querySelector("[data-combat-cloud-browse-btn]").addEventListener("click", browseProjects);

    // Auto-load if projectId in URL
    const projectId = new URLSearchParams(window.location.search).get("projectId");
    if (projectId) openProject(projectId);
  }

  document.addEventListener("DOMContentLoaded", createPanel);
})();
