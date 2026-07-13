// =====================================================
// randomeventsapp.js — Random Events Editor
// Parses / edits / exports randomevents.ymt.xml
// =====================================================

(function () {

  // ── State ────────────────────────────────────────────
  const eventsState = { data: null, vanilla: null, file: null, rawXml: null };
  window.eventsState = eventsState;

  // ── Human-readable labels ────────────────────────────
  const TYPE_LABELS = {
    Crime:              "Crime",
    JayWalkingLights:   "Jaywalking at Lights",
    CopPursuit:         "Cop Pursuit (existing)",
    SpawnedCopPursuit:  "Cop Pursuit (spawned)",
    AmbientCop:         "Ambient Cop",
    InterestingDriver:  "Interesting Driver",
    AggressiveDriver:   "Aggressive Driver",
  };

  // ET_ enum → type name (for grouping events by type)
  const ET_TO_TYPE = {
    ET_CRIME:              "Crime",
    ET_JAYWALKING:         "JayWalkingLights",
    ET_COP_PURSUIT:        "CopPursuit",
    ET_SPAWNED_COP_PURSUIT:"SpawnedCopPursuit",
    ET_AMBIENT_COP:        "AmbientCop",
    ET_INTERESTING_DRIVER: "InterestingDriver",
    ET_AGGRESSIVE_DRIVER:  "AggressiveDriver",
  };

  // ── Field definitions ────────────────────────────────
  const BOOL_FIELDS = [
    { key: "Enabled",               label: "Random Event System Enabled",
      help: "Master on/off switch. Disabling stops all random world events from firing." },
    { key: "ForceCrime",            label: "Force Crime Events",
      help: "Forces crime events to spawn regardless of the normal timing interval." },
    { key: "SpawningChasesEnabled", label: "Spawning Chases Enabled",
      help: "Whether cop pursuit events can be spawned near the player while driving." },
  ];

  const TIMING_FIELDS = [
    { key: "EventInterval",     label: "System Tick Rate", unit: "sec",
      help: "How often (seconds) the event manager checks what to spawn next. ↑ slower cycle | ↓ faster" },
    { key: "EventInitInterval", label: "Initial Spawn Delay", unit: "sec",
      help: "Delay before the very first event fires after game load. ↑ longer wait | ↓ events start sooner" },
  ];

  const CHASE_FIELDS = [
    { key: "MaxNumberCopVehiclesInChase",       label: "Max Cop Vehicles in Chase",         type: "int",
      help: "↑ more cars pursue the target | ↓ fewer cop cars" },
    { key: "ProbSpawnHeli",                     label: "Helicopter Spawn Probability",       type: "int", unit: "%",
      help: "Chance a helicopter appears. ↑ helis always come | ↓ rarer | 0 = never" },
    { key: "MaxAmbientVehiclesToSpawnChase",    label: "Max Ambient Vehicles to Trigger Chase", type: "int",
      help: "↑ more ambient cars can start a pursuit | ↓ fewer triggers" },
    { key: "MinPlayerMoveDistanceToSpawnChase", label: "Min Player Move Distance for Chase", type: "float", unit: "m",
      help: "Player must move this far before a chase can spawn. ↑ more movement needed | ↓ chases spawn sooner" },
  ];

  const HELI_FIELDS = [
    { key: "HeliVehicleModelId", label: "Helicopter Vehicle Model", type: "text",
      help: "The vehicle model used for the pursuit helicopter (e.g. polmav)." },
    { key: "HeliPedModelId",     label: "Helicopter Crew Ped Model", type: "text",
      help: "The ped model spawned as the helicopter crew (e.g. s_m_y_swat_01)." },
  ];

  // ── XML Helpers ──────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  function getText(parent, tag) {
    return parent.querySelector(tag)?.textContent?.trim() || "";
  }

  function getVal(parent, tag) {
    return parent.querySelector(tag)?.getAttribute("value") ?? "";
  }

  // ── Parse ────────────────────────────────────────────
  function parseRandomEvents(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("File contains invalid XML.");

    const mgr = doc.querySelector("Item[type='CRandomEventManager__Tunables']");
    if (!mgr) throw new Error("No CRandomEventManager__Tunables block found — is this the right file?");

    const data = {};

    // Boolean toggles
    [...BOOL_FIELDS, { key: "RenderDebug" }].forEach(f => {
      data[f.key] = mgr.querySelector(f.key)?.getAttribute("value") || "false";
    });

    // Numeric fields (value attribute)
    [...TIMING_FIELDS, ...CHASE_FIELDS].forEach(f => {
      data[f.key] = mgr.querySelector(f.key)?.getAttribute("value") ?? "";
    });

    // Text content fields
    HELI_FIELDS.forEach(f => {
      data[f.key] = mgr.querySelector(f.key)?.textContent?.trim() || "";
    });

    // Event type timing array
    data.eventTypes = [...mgr.querySelectorAll("RandomEventType > Item")].map(item => ({
      RandomEventTypeName:             getText(item, "RandomEventTypeName"),
      RandomEventTimeIntervalMin:      item.querySelector("RandomEventTimeIntervalMin")?.getAttribute("value") || "0",
      RandomEventTimeIntervalMax:      item.querySelector("RandomEventTimeIntervalMax")?.getAttribute("value") || "0",
      DeltaScaleWhenPlayerStationary:  item.querySelector("DeltaScaleWhenPlayerStationary")?.getAttribute("value") || "0",
    }));

    // Event data catalog (read-only reference)
    data.eventData = [...mgr.querySelectorAll("RandomEventData > Item")].map(item => ({
      RandomEventName: getText(item, "RandomEventName"),
      RandomEventType: getText(item, "RandomEventType"),
    }));

    return data;
  }

  // ── Render helpers ───────────────────────────────────
  function secToMin(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return "";
    return (n / 60).toFixed(1) + " min";
  }

  function numInput(key, value, step = "1", dataAttr = "") {
    return `<input class="re-input" type="number" step="${step}" value="${escHTML(value)}"
      data-re-key="${escHTML(key)}" ${dataAttr}>`;
  }

  function textInput(key, value, dataAttr = "") {
    return `<input class="re-input re-text" type="text" value="${escHTML(value)}"
      data-re-key="${escHTML(key)}" ${dataAttr}>`;
  }

  function toggle(key, value, dataAttr = "") {
    const checked = value === "true" ? "checked" : "";
    return `<label class="re-toggle">
      <input type="checkbox" ${checked} data-re-key="${escHTML(key)}" ${dataAttr}>
      <span class="re-toggle-track"></span>
    </label>`;
  }

  function escHTML(s) {
    return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  // ── Render editor ────────────────────────────────────
  function renderEditor() {
    const d = eventsState.data;
    if (!d) return;

    // Build event type → event names map
    const typeToEvents = {};
    (d.eventData || []).forEach(ev => {
      const typeName = ET_TO_TYPE[ev.RandomEventType] || ev.RandomEventType;
      if (!typeToEvents[typeName]) typeToEvents[typeName] = [];
      typeToEvents[typeName].push(ev.RandomEventName);
    });

    const html = `
      ${renderSection("System Switches", "Master controls for the random event system.",
        renderBoolRows(d))}

      ${renderSection("Tick & Delay Timings", "How often the system runs and how long before first events fire.",
        renderFieldRows(TIMING_FIELDS, d, "1"))}

      ${renderSection("Chase Settings", "Controls how police pursuits are spawned near the player.",
        renderFieldRows(CHASE_FIELDS, d, "1"))}

      ${renderSection("Helicopter", "Vehicle and crew model used when a helicopter joins a pursuit.",
        renderTextRows(HELI_FIELDS, d))}

      ${renderSection("Event Type Timings",
        "How often each category of event fires. Min/Max are in seconds. Idle Boost = % extra frequency when the player is stationary.",
        renderEventTypeTable(d.eventTypes, typeToEvents))}

      ${renderSection("Event Catalog", "Which specific events are registered to each type. Read-only reference.",
        renderEventCatalog(d.eventData), true)}
    `;

    const content = el("reContent");
    content.innerHTML = html;
    content.classList.remove("is-hidden");

    wireInputs();
    updateModCount();
  }

  function renderSection(title, desc, body, readOnly = false) {
    return `<div class="re-section">
      <div class="re-section-head">
        <h3>${escHTML(title)}${readOnly ? ' <span class="re-badge-ref">reference</span>' : ""}</h3>
        <p>${escHTML(desc)}</p>
      </div>
      ${body}
    </div>`;
  }

  function renderBoolRows(d) {
    const rows = BOOL_FIELDS.map(f => `
      <tr>
        <td class="re-field-label">
          <span class="re-field-name">${escHTML(f.label)}</span>
          <span class="re-field-help">${escHTML(f.help)}</span>
        </td>
        <td class="re-field-input">${toggle(f.key, d[f.key])}</td>
      </tr>`).join("");
    return `<table class="re-table"><tbody>${rows}</tbody></table>`;
  }

  function renderFieldRows(fields, d, step = "1") {
    const rows = fields.map(f => {
      const isFloat = f.type === "float" || (!f.type && String(d[f.key]).includes("."));
      const s = isFloat ? "0.01" : step;
      const unitLabel = f.unit ? `<span class="re-unit">${escHTML(f.unit)}</span>` : "";
      return `<tr>
        <td class="re-field-label">
          <span class="re-field-name">${escHTML(f.label)}</span>
          <span class="re-field-help">${escHTML(f.help)}</span>
        </td>
        <td class="re-field-input">
          <div class="re-input-wrap">
            ${numInput(f.key, d[f.key], s)}
            ${unitLabel}
          </div>
        </td>
      </tr>`;
    }).join("");
    return `<table class="re-table"><tbody>${rows}</tbody></table>`;
  }

  function renderTextRows(fields, d) {
    const rows = fields.map(f => `
      <tr>
        <td class="re-field-label">
          <span class="re-field-name">${escHTML(f.label)}</span>
          <span class="re-field-help">${escHTML(f.help)}</span>
        </td>
        <td class="re-field-input">${textInput(f.key, d[f.key])}</td>
      </tr>`).join("");
    return `<table class="re-table"><tbody>${rows}</tbody></table>`;
  }

  function renderEventTypeTable(eventTypes, typeToEvents) {
    if (!eventTypes?.length) return `<p class="re-muted">No event types found.</p>`;

    const rows = eventTypes.map((et, i) => {
      const label = TYPE_LABELS[et.RandomEventTypeName] || et.RandomEventTypeName;
      const events = typeToEvents[et.RandomEventTypeName] || [];
      const chips = events.map(e => `<span class="re-event-chip">${escHTML(e)}</span>`).join("");
      const minMin = secToMin(et.RandomEventTimeIntervalMin);
      const maxMin = secToMin(et.RandomEventTimeIntervalMax);
      const stationary = parseFloat(et.DeltaScaleWhenPlayerStationary);
      const stationaryLabel = stationary > 0
        ? `<span class="re-stationary-on">+${stationary}% idle</span>`
        : `<span class="re-stationary-off">no idle boost</span>`;

      return `<tr class="re-et-row">
        <td class="re-et-name">
          <span class="re-type-badge">${escHTML(label)}</span>
          <div class="re-et-chips">${chips}</div>
        </td>
        <td class="re-et-cell">
          <label class="re-et-label">Min (sec)</label>
          ${numInput(`et.${i}.RandomEventTimeIntervalMin`, et.RandomEventTimeIntervalMin, "1", `data-re-et-index="${i}"`)}
          <span class="re-min-label">${minMin}</span>
        </td>
        <td class="re-et-cell">
          <label class="re-et-label">Max (sec)</label>
          ${numInput(`et.${i}.RandomEventTimeIntervalMax`, et.RandomEventTimeIntervalMax, "1", `data-re-et-index="${i}"`)}
          <span class="re-min-label">${maxMin}</span>
        </td>
        <td class="re-et-cell">
          <label class="re-et-label">Idle Boost</label>
          ${numInput(`et.${i}.DeltaScaleWhenPlayerStationary`, et.DeltaScaleWhenPlayerStationary, "1", `data-re-et-index="${i}"`)}
          <span class="re-min-label">${stationaryLabel}</span>
        </td>
      </tr>`;
    }).join("");

    return `<table class="re-et-table">
      <thead>
        <tr>
          <th>Event Type &amp; Events</th>
          <th>Min Interval</th>
          <th>Max Interval</th>
          <th>Idle Boost (%)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function renderEventCatalog(eventData) {
    if (!eventData?.length) return `<p class="re-muted">No event catalog data found.</p>`;
    const rows = eventData.map(ev => `
      <tr>
        <td class="re-catalog-name">${escHTML(ev.RandomEventName)}</td>
        <td class="re-catalog-type">${escHTML(ev.RandomEventType)}</td>
      </tr>`).join("");
    return `<table class="re-table re-catalog-table">
      <thead><tr><th>Event Name</th><th>Event Type</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ── Wire inputs ──────────────────────────────────────
  function wireInputs() {
    el("reContent").addEventListener("change", function (e) {
      const input = e.target;
      const key = input.dataset.reKey;
      if (!key) return;

      const d = eventsState.data;

      if (key.startsWith("et.")) {
        // Event type field: et.{index}.{fieldName}
        const parts = key.split(".");
        const idx = parseInt(parts[1], 10);
        const field = parts[2];
        if (d.eventTypes[idx] && field) {
          d.eventTypes[idx][field] = input.type === "checkbox"
            ? String(input.checked)
            : input.value;
          // Update the min-label next to the input
          const minLabel = input.parentElement?.querySelector(".re-min-label");
          if (minLabel && field.includes("Interval")) {
            minLabel.textContent = secToMin(input.value);
          }
        }
      } else if (input.type === "checkbox") {
        d[key] = String(input.checked);
      } else {
        d[key] = input.value;
      }

      updateModCount();
    }, true);
  }

  // ── Mod count ────────────────────────────────────────
  function updateModCount() {
    window.updateModCount = updateModCount; // expose for cloud save
    const d = eventsState.data;
    const v = eventsState.vanilla;
    if (!d || !v) return;

    let mods = 0;

    // Compare top-level keys
    const allKeys = new Set([...Object.keys(d), ...Object.keys(v)]);
    allKeys.forEach(k => {
      if (k === "eventTypes" || k === "eventData") return;
      if (String(d[k]) !== String(v[k])) mods++;
    });

    // Compare event types
    (d.eventTypes || []).forEach((et, i) => {
      const vEt = v.eventTypes?.[i];
      if (!vEt) { mods++; return; }
      ["RandomEventTimeIntervalMin","RandomEventTimeIntervalMax","DeltaScaleWhenPlayerStationary"].forEach(f => {
        if (String(et[f]) !== String(vEt[f])) mods++;
      });
    });

    const countEl = el("reModCount");
    if (countEl) {
      countEl.textContent = mods > 0 ? `${mods} modification${mods === 1 ? "" : "s"}` : "";
      countEl.className = "re-mod-count" + (mods > 0 ? " is-modified" : "");
    }
  }

  // ── Export ───────────────────────────────────────────
  window.exportRandomEvents = function () {
    const d = eventsState.data;
    if (!d || !eventsState.rawXml) return;

    const doc = new DOMParser().parseFromString(eventsState.rawXml, "application/xml");
    const mgr = doc.querySelector("Item[type='CRandomEventManager__Tunables']");
    if (!mgr) return;

    // Boolean & numeric fields (value attribute)
    [...BOOL_FIELDS, { key: "RenderDebug" }, ...TIMING_FIELDS, ...CHASE_FIELDS].forEach(f => {
      const node = mgr.querySelector(f.key);
      if (node) node.setAttribute("value", d[f.key]);
    });

    // Text content fields
    HELI_FIELDS.forEach(f => {
      const node = mgr.querySelector(f.key);
      if (node) node.textContent = d[f.key];
    });

    // Event types
    const etItems = mgr.querySelectorAll("RandomEventType > Item");
    (d.eventTypes || []).forEach((et, i) => {
      const item = etItems[i];
      if (!item) return;
      const setAttr = (tag, val) => {
        const node = item.querySelector(tag);
        if (node) node.setAttribute("value", val);
      };
      setAttr("RandomEventTimeIntervalMin",     et.RandomEventTimeIntervalMin);
      setAttr("RandomEventTimeIntervalMax",     et.RandomEventTimeIntervalMax);
      setAttr("DeltaScaleWhenPlayerStationary", et.DeltaScaleWhenPlayerStationary);
    });

    let xml = new XMLSerializer().serializeToString(doc);
    xml = xml.replace(/ xmlns(?::\w+)?="[^"]*"/g, "");

    const blob = new Blob([xml], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = eventsState.file || "randomevents.ymt.xml";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Reset ────────────────────────────────────────────
  window.resetRandomEvents = function () {
    if (!eventsState.vanilla) return;
    eventsState.data = JSON.parse(JSON.stringify(eventsState.vanilla));
    renderEditor();
  };

  // ── File handling ────────────────────────────────────
  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target.result;
        const data = parseRandomEvents(text);

        eventsState.rawXml  = text;
        eventsState.file    = file.name;
        eventsState.data    = data;
        eventsState.vanilla = JSON.parse(JSON.stringify(data));

        const dropZone = el("reDropZone");
        if (dropZone) {
          dropZone.classList.add("is-loaded");
          const st = dropZone.querySelector(".re-drop-state-text");
          if (st) st.textContent = `✓ Loaded: ${file.name}`;
        }

        el("reExportBtn").disabled = false;
        el("reResetBtn").disabled  = false;

        renderEditor();
      } catch (err) {
        alert("Could not parse file: " + (err.message || err));
      }
    };
    reader.readAsText(file);
  }

  // ── Init ─────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    const dropZone  = el("reDropZone");
    const fileInput = el("reFileInput");

    if (dropZone) {
      dropZone.addEventListener("click", () => fileInput?.click());
      dropZone.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") fileInput?.click(); });
      dropZone.addEventListener("dragover",  e => { e.preventDefault(); dropZone.classList.add("is-drag"); });
      dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-drag"));
      dropZone.addEventListener("drop", e => {
        e.preventDefault();
        dropZone.classList.remove("is-drag");
        handleFile(e.dataTransfer.files?.[0]);
      });
    }

    if (fileInput) fileInput.addEventListener("change", () => handleFile(fileInput.files?.[0]));
  });

})();
