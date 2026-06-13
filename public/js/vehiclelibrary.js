// =====================================================
// GTA Traffic Vehicle Library V1.3
// Imports and merges Popgroups, vehicles.meta, and
// handling.meta into the shared local vehicle database.
// =====================================================

(() => {
  "use strict";

  const store = window.vehicleLibraryStore;
  const PAGE_SIZE = 24;

  const state = {
    vehicles: [],
    handlingMap: new Map(),
    category: "ALL",
    page: 1,
    view: "grid",
    filters: {
      search: "",
      type: "",
      ai: "",
      install: "",
      installed: "",
      favoritesOnly: false,
      sort: "name-asc"
    }
  };

  const el = id => document.getElementById(id);

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(message, type = "good") {
    const host = el("vlStatus");
    host.className = `vl-status ${type}`;
    host.textContent = message;
  }

  function directChildren(element, tagName = "") {
    return [...(element?.children || [])].filter(child => !tagName || child.tagName === tagName);
  }

  function directChild(element, tagName) {
    return directChildren(element, tagName)[0] || null;
  }

  function textValue(item, tagName) {
    return directChild(item, tagName)?.textContent.trim() || "";
  }

  function attrValue(item, tagName, attribute = "value") {
    return directChild(item, tagName)?.getAttribute(attribute) ?? "";
  }

  function parseXml(text, fileName) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) {
      throw new Error(`${fileName} contains invalid XML.`);
    }
    return doc;
  }

  function inferInstallType(vehicle) {
    const customType = vehicle.custom?.installType;
    if (customType) return customType;
    if (vehicle.vehiclesMeta?.modelName && vehicle.sources?.vehiclesMeta?.length) return "Unknown";
    return "Unknown";
  }

  function displayTitle(vehicle) {
    return vehicle.custom?.displayName || vehicle.vehiclesMeta?.gameName || vehicle.modelName || "Unnamed Vehicle";
  }

  function cleanClassName(value) {
    const raw = String(value || "UNKNOWN").replace(/^VC_/, "").replaceAll("_", " ").trim();
    return raw ? raw.replace(/\b\w/g, match => match.toUpperCase()) : "Unknown";
  }

  function initials(value) {
    const words = String(value || "??").replace(/[^a-z0-9]+/gi, " ").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "??";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  function parseVehiclesMeta(text, fileName) {
    const doc = parseXml(text, fileName);
    const items = [...doc.querySelectorAll("InitDatas > Item, CVehicleModelInfo__InitDataList > InitDatas > Item")];
    const records = [];

    items.forEach(item => {
      const modelName = textValue(item, "modelName");
      if (!modelName) return;

      records.push({
        modelName,
        vehiclesMeta: {
          modelName,
          txdName: textValue(item, "txdName"),
          handlingId: textValue(item, "handlingId"),
          gameName: textValue(item, "gameName"),
          vehicleMakeName: textValue(item, "vehicleMakeName"),
          vehicleClass: textValue(item, "vehicleClass"),
          vehicleType: textValue(item, "type"),
          audioNameHash: textValue(item, "audioNameHash"),
          layout: textValue(item, "layout"),
          plateType: textValue(item, "plateType"),
          wheelType: textValue(item, "wheelType"),
          frequency: attrValue(item, "frequency"),
          swankness: textValue(item, "swankness"),
          maxNum: attrValue(item, "maxNum"),
          maxNumOfSameColor: attrValue(item, "maxNumOfSameColor"),
          identicalModelSpawnDistance: attrValue(item, "identicalModelSpawnDistance")
        },
        sources: { vehiclesMeta: [fileName] }
      });
    });

    return records;
  }

  const HANDLING_FIELDS = [
    "fMass", "fInitialDragCoeff", "fDownForceModifier", "fPercentSubmerged",
    "fDriveBiasFront", "nInitialDriveGears", "fInitialDriveForce", "fDriveInertia",
    "fClutchChangeRateScaleUpShift", "fClutchChangeRateScaleDownShift", "fInitialDriveMaxFlatVel",
    "fBrakeForce", "fBrakeBiasFront", "fHandBrakeForce", "fSteeringLock",
    "fTractionCurveMax", "fTractionCurveMin", "fTractionCurveLateral",
    "fLowSpeedTractionLossMult", "fTractionBiasFront", "fTractionLossMult",
    "fSuspensionForce", "fSuspensionCompDamp", "fSuspensionReboundDamp",
    "fSuspensionUpperLimit", "fSuspensionLowerLimit", "fSuspensionRaise",
    "fSuspensionBiasFront", "fAntiRollBarForce", "fAntiRollBarBiasFront",
    "fRollCentreHeightFront", "fRollCentreHeightRear", "fCollisionDamageMult",
    "fWeaponDamageMult", "fDeformationDamageMult", "fEngineDamageMult"
  ];

  function parseHandlingMeta(text, fileName) {
    const doc = parseXml(text, fileName);
    const handlingData = [...doc.getElementsByTagName("HandlingData")][0];
    if (!handlingData) return [];

    return directChildren(handlingData, "Item")
      .filter(item => item.getAttribute("type") === "CHandlingData" || directChild(item, "handlingName"))
      .map(item => {
        const handlingName = textValue(item, "handlingName");
        if (!handlingName) return null;
        const profile = {
          id: store.normalizeId(handlingName),
          handlingName,
          AIHandling: textValue(item, "AIHandling"),
          sourceFile: fileName,
          subHandlingTypes: directChildren(directChild(item, "SubHandlingData"), "Item")
            .map(sub => sub.getAttribute("type") || "UNKNOWN")
            .filter(Boolean),
          updatedAt: new Date().toISOString()
        };
        HANDLING_FIELDS.forEach(field => {
          profile[field] = attrValue(item, field);
        });
        return profile;
      })
      .filter(Boolean);
  }

  function parsePopgroups(text, fileName) {
    const doc = parseXml(text, fileName);
    const section = [...doc.getElementsByTagName("vehGroups")][0];
    if (!section) throw new Error(`${fileName} does not contain a vehGroups section.`);

    const memberships = new Map();
    directChildren(section, "Item").forEach(group => {
      const groupName = textValue(group, "Name");
      const modelsNode = directChild(group, "models");
      if (!groupName || !modelsNode) return;

      directChildren(modelsNode).forEach(item => {
        const modelName = textValue(item, "Name") || item.textContent.trim();
        if (!modelName) return;
        const id = store.normalizeId(modelName);
        if (!memberships.has(id)) memberships.set(id, { modelName, groups: [] });
        memberships.get(id).groups.push({ groupName, sourceFile: fileName });
      });
    });

    return memberships;
  }

  async function importVehicleFiles(files) {
    let imported = 0;
    for (const file of files) {
      const text = await file.text();
      const parsed = parseVehiclesMeta(text, file.name);
      const existingMap = new Map((await store.getVehicles()).map(vehicle => [vehicle.id, vehicle]));
      const merged = parsed.map(record => store.mergeVehicle(existingMap.get(store.normalizeId(record.modelName)), record));
      await store.putVehicles(merged);
      await store.putSource({
        id: `vehicles:${file.name.toLowerCase()}`,
        type: "vehicles.meta",
        fileName: file.name,
        recordCount: parsed.length,
        importedAt: new Date().toISOString()
      });
      imported += parsed.length;
    }
    setStatus(`Imported or updated ${imported.toLocaleString()} vehicle records from vehicles.meta.`, "good");
  }

  async function importHandlingFiles(files) {
    let imported = 0;
    for (const file of files) {
      const text = await file.text();
      const profiles = parseHandlingMeta(text, file.name);
      if (!profiles.length) throw new Error(`No handling profiles were found in ${file.name}.`);
      await store.putHandlingProfiles(profiles);
      await store.putSource({
        id: `handling:${file.name.toLowerCase()}`,
        type: "handling.meta",
        fileName: file.name,
        recordCount: profiles.length,
        importedAt: new Date().toISOString()
      });
      imported += profiles.length;
    }
    setStatus(`Imported or updated ${imported.toLocaleString()} handling profiles.`, "good");
  }

  async function importPopgroupsFiles(files) {
    let membershipCount = 0;
    for (const file of files) {
      const text = await file.text();
      const memberships = parsePopgroups(text, file.name);
      let fileMembershipCount = 0;
      const current = await store.getVehicles();
      const currentMap = new Map(current.map(vehicle => [vehicle.id, vehicle]));

      currentMap.forEach(vehicle => {
        vehicle.popgroups = (vehicle.popgroups || []).filter(group => group.sourceFile !== file.name);
        vehicle.sources = vehicle.sources || { vehiclesMeta: [], popgroups: [] };
        vehicle.sources.popgroups = (vehicle.sources.popgroups || []).filter(name => name !== file.name);
      });

      memberships.forEach((entry, id) => {
        const vehicle = currentMap.get(id) || store.createVehicleSkeleton(entry.modelName);
        const combinedGroups = [...(vehicle.popgroups || []), ...entry.groups];
        vehicle.popgroups = combinedGroups.filter((group, index, list) =>
          list.findIndex(candidate => candidate.groupName === group.groupName && candidate.sourceFile === group.sourceFile) === index
        );
        vehicle.sources = vehicle.sources || { vehiclesMeta: [], popgroups: [] };
        vehicle.sources.popgroups = store.unique([...(vehicle.sources.popgroups || []), file.name]);
        vehicle.updatedAt = new Date().toISOString();
        currentMap.set(id, vehicle);
        membershipCount += entry.groups.length;
        fileMembershipCount += entry.groups.length;
      });

      await store.putVehicles([...currentMap.values()]);
      await store.putSource({
        id: `popgroups:${file.name.toLowerCase()}`,
        type: "Popgroups",
        fileName: file.name,
        recordCount: fileMembershipCount,
        importedAt: new Date().toISOString()
      });
    }
    setStatus(`Imported ${membershipCount.toLocaleString()} vehicle-to-group memberships from Popgroups.`, "good");
  }

  function vehicleIdFromAssetFile(fileName) {
    const name = String(fileName || "").trim();
    const match = name.match(/^(.*)\.(yft|ytd)$/i);
    if (!match) return "";
    return store.normalizeId(match[1].replace(/_hi$/i, ""));
  }

  async function toggleInstalledFromAssetFiles(fileList) {
    const files = [...(fileList || [])].filter(file => /\.(yft|ytd)$/i.test(file.name));
    const resultHost = el("vlInstallScanResult");

    if (!files.length) {
      resultHost.innerHTML = `<div class="vl-scan-warning">No .yft or .ytd files were detected.</div>`;
      setStatus("No supported vehicle files were detected.", "warn");
      return;
    }

    const fileNamesById = new Map();
    files.forEach(file => {
      const id = vehicleIdFromAssetFile(file.name);
      if (!id) return;
      if (!fileNamesById.has(id)) fileNamesById.set(id, []);
      fileNamesById.get(id).push(file.name);
    });

    const currentMap = new Map((await store.getVehicles()).map(vehicle => [vehicle.id, vehicle]));
    const updated = [];
    const installed = [];
    const uninstalled = [];
    const unmatched = [];
    const today = new Date().toISOString().slice(0, 10);

    fileNamesById.forEach((names, id) => {
      const vehicle = currentMap.get(id);
      if (!vehicle) {
        unmatched.push({ id, names });
        return;
      }

      vehicle.custom = vehicle.custom || {};
      const nextInstalled = vehicle.custom.installed !== true;
      vehicle.custom.installed = nextInstalled;
      vehicle.custom.installDate = nextInstalled ? (vehicle.custom.installDate || today) : "";
      vehicle.custom.lastInstallScanFiles = names;
      vehicle.custom.lastInstallScanAt = new Date().toISOString();
      vehicle.updatedAt = new Date().toISOString();
      updated.push(vehicle);
      (nextInstalled ? installed : uninstalled).push(vehicle.modelName);
    });

    if (updated.length) await store.putVehicles(updated);
    await reloadData();

    const unmatchedPreview = unmatched.slice(0, 12).map(item => `<code>${escapeHTML(item.id)}</code>`).join(", ");
    resultHost.innerHTML = `
      <div class="vl-scan-summary">
        <div><strong>${installed.length}</strong><span>Marked installed</span></div>
        <div><strong>${uninstalled.length}</strong><span>Marked uninstalled</span></div>
        <div><strong>${unmatched.length}</strong><span>Not found in library</span></div>
        <div><strong>${files.length}</strong><span>Files scanned</span></div>
      </div>
      ${unmatched.length ? `<div class="vl-scan-warning"><strong>Unmatched models:</strong> ${unmatchedPreview}${unmatched.length > 12 ? ` and ${unmatched.length - 12} more` : ""}</div>` : ""}
    `;

    const actionText = [
      installed.length ? `${installed.length} installed` : "",
      uninstalled.length ? `${uninstalled.length} uninstalled` : "",
      unmatched.length ? `${unmatched.length} unmatched` : ""
    ].filter(Boolean).join(", ");
    setStatus(`Vehicle file scan complete: ${actionText || "no matching vehicles changed"}.`, unmatched.length ? "warn" : "good");
  }

  async function handleImport(input, importer) {
    const files = [...input.files];
    if (!files.length) return;
    input.value = "";
    setStatus(`Importing ${files.length} file${files.length === 1 ? "" : "s"}...`, "warn");
    try {
      await importer(files);
      await reloadData();
    } catch (error) {
      console.error(error);
      setStatus(error.message || "The files could not be imported.", "bad");
    }
  }

 async function reloadData() {
  const [localVehicles, handlingProfiles] =
    await Promise.all([
      store.getVehicles(),
      store.getHandlingProfiles()
    ]);

  let vehicles = localVehicles;
  let source = "local";

  if (window.vehicleCloud) {
    try {
      const cloudVehicles =
        await window.vehicleCloud.getVehicles(
          localVehicles
        );

      if (cloudVehicles.length > 0) {
        vehicles = cloudVehicles;
        source = "cloud";

        await store.putVehicles(cloudVehicles);
      }
    } catch (error) {
      console.warn(
        "Cloud library unavailable. Using IndexedDB.",
        error
      );
    }
  }

  state.vehicles = vehicles;

  state.handlingMap = new Map(
    handlingProfiles.map(profile => [
      profile.id,
      profile
    ])
  );

  populateFilters();
  renderAll();

  if (source === "cloud") {
    setStatus(
      `Loaded ${vehicles.length.toLocaleString()} vehicles from the cloud database.`,
      "good"
    );
  } else {
    setStatus(
      `Cloud database unavailable. Loaded ${vehicles.length.toLocaleString()} vehicles from this browser.`,
      vehicles.length ? "warn" : "bad"
    );
  }
}

  function linkedHandling(vehicle) {
    return state.handlingMap.get(store.normalizeId(vehicle.vehiclesMeta?.handlingId || "")) || null;
  }

  function populateFilters() {
    const types = [...new Set(state.vehicles.map(v => v.vehiclesMeta?.vehicleType).filter(Boolean))].sort();
    const aiValues = [...new Set(state.vehicles.map(v => linkedHandling(v)?.AIHandling).filter(Boolean))].sort();
    const typeFilter = el("vlTypeFilter");
    const aiFilter = el("vlAiFilter");
    const currentType = typeFilter.value;
    const currentAi = aiFilter.value;
    typeFilter.innerHTML = `<option value="">All types</option>${types.map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("")}`;
    aiFilter.innerHTML = `<option value="">All AI profiles</option>${aiValues.map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("")}`;
    if (types.includes(currentType)) typeFilter.value = currentType;
    if (aiValues.includes(currentAi)) aiFilter.value = currentAi;
  }

  function categoryCounts() {
    const counts = new Map([
      ["ALL", state.vehicles.length],
      ["INSTALLED", state.vehicles.filter(vehicle => vehicle.custom?.installed === true).length]
    ]);
    state.vehicles.forEach(vehicle => {
      const raw = vehicle.vehiclesMeta?.vehicleClass || "UNKNOWN";
      counts.set(raw, (counts.get(raw) || 0) + 1);
    });
    return counts;
  }

  function renderCategories() {
    const counts = categoryCounts();
    const entries = [...counts.entries()].sort((a, b) => {
      if (a[0] === "ALL") return -1;
      if (b[0] === "ALL") return 1;
      if (a[0] === "INSTALLED") return -1;
      if (b[0] === "INSTALLED") return 1;
      return cleanClassName(a[0]).localeCompare(cleanClassName(b[0]));
    });
    el("vlCategoryList").innerHTML = entries.map(([key, count]) => `
      <button class="vl-category-button ${state.category === key ? "active" : ""}" type="button" data-category="${escapeHTML(key)}">
        <span>${key === "ALL" ? "All Vehicles" : key === "INSTALLED" ? "Installed Vehicles" : cleanClassName(key)}</span><strong>${count.toLocaleString()}</strong>
      </button>
    `).join("");
    el("vlCategoryList").querySelectorAll("[data-category]").forEach(button => {
      button.addEventListener("click", () => {
        state.category = button.dataset.category;
        state.page = 1;
        renderAll();
      });
    });
  }

  function searchableText(vehicle, handling) {
    return [
      vehicle.modelName,
      ...Object.values(vehicle.vehiclesMeta || {}),
      ...(vehicle.popgroups || []).flatMap(group => [group.groupName, group.sourceFile]),
      vehicle.custom?.displayName,
      vehicle.custom?.rockstarDlc,
      vehicle.custom?.sourcePack,
      vehicle.custom?.installType,
      vehicle.custom?.replacementFor,
      vehicle.custom?.dlcFolderPath,
      vehicle.custom?.yftPath,
      vehicle.custom?.yftHiPath,
      vehicle.custom?.ytdPath,
      vehicle.custom?.vehiclesMetaPath,
      vehicle.custom?.handlingMetaPath,
      vehicle.custom?.downloadUrl,
      vehicle.custom?.tags,
      vehicle.custom?.notes,
      handling?.handlingName,
      handling?.AIHandling,
      ...(handling?.subHandlingTypes || [])
    ].join(" ").toLowerCase();
  }

  function getFilteredVehicles() {
    const query = state.filters.search.toLowerCase().trim();
    const filtered = state.vehicles.filter(vehicle => {
      const handling = linkedHandling(vehicle);
      if (state.category === "INSTALLED" && vehicle.custom?.installed !== true) return false;
      if (state.category !== "ALL" && state.category !== "INSTALLED" && (vehicle.vehiclesMeta?.vehicleClass || "UNKNOWN") !== state.category) return false;
      if (state.filters.type && vehicle.vehiclesMeta?.vehicleType !== state.filters.type) return false;
      if (state.filters.ai && handling?.AIHandling !== state.filters.ai) return false;
      if (state.filters.install && inferInstallType(vehicle) !== state.filters.install) return false;
      if (state.filters.installed === "installed" && vehicle.custom?.installed !== true) return false;
      if (state.filters.installed === "not-installed" && vehicle.custom?.installed === true) return false;
      if (state.filters.favoritesOnly && !vehicle.custom?.favorite) return false;
      if (query && !searchableText(vehicle, handling).includes(query)) return false;
      return true;
    });

    const sorters = {
      "name-asc": (a, b) => displayTitle(a).localeCompare(displayTitle(b)),
      "name-desc": (a, b) => displayTitle(b).localeCompare(displayTitle(a)),
      "make-asc": (a, b) => (a.vehiclesMeta?.vehicleMakeName || "").localeCompare(b.vehiclesMeta?.vehicleMakeName || "") || displayTitle(a).localeCompare(displayTitle(b)),
      "class-asc": (a, b) => (a.vehiclesMeta?.vehicleClass || "").localeCompare(b.vehiclesMeta?.vehicleClass || "") || displayTitle(a).localeCompare(displayTitle(b)),
      "ai-asc": (a, b) => (linkedHandling(a)?.AIHandling || "").localeCompare(linkedHandling(b)?.AIHandling || "") || displayTitle(a).localeCompare(displayTitle(b)),
      "installed-first": (a, b) => Number(b.custom?.installed === true) - Number(a.custom?.installed === true) || displayTitle(a).localeCompare(displayTitle(b)),
      "not-installed-first": (a, b) => Number(a.custom?.installed === true) - Number(b.custom?.installed === true) || displayTitle(a).localeCompare(displayTitle(b)),
      "updated-desc": (a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
    };
    filtered.sort(sorters[state.filters.sort] || sorters["name-asc"]);
    return filtered;
  }

  function renderStats() {
    const withImages = state.vehicles.filter(v => v.custom?.imageDataUrl).length;
    const withHandling = state.vehicles.filter(v => linkedHandling(v)).length;
    const inGroups = state.vehicles.filter(v => (v.popgroups || []).length).length;
    const installed = state.vehicles.filter(v => v.custom?.installed === true).length;
    el("vlStats").innerHTML = `
      <div><strong>${state.vehicles.length.toLocaleString()}</strong><span>Vehicles</span></div>
      <div><strong>${withImages.toLocaleString()}</strong><span>With Images</span></div>
      <div><strong>${withHandling.toLocaleString()}</strong><span>Handling Linked</span></div>
      <div><strong>${inGroups.toLocaleString()}</strong><span>In Popgroups</span></div>
      <div><strong>${installed.toLocaleString()}</strong><span>Installed</span></div>
    `;
  }


  function setupStaticImageFallbacks(host) {
    host.querySelectorAll("img[data-vl-static-model]").forEach(image => {
      let step = 0;
      const model = image.dataset.vlStaticModel;
      const label = image.dataset.vlInitials || "??";
      image.addEventListener("error", function tryNext() {
        step += 1;
        if (step === 1) { image.src = `images/${encodeURIComponent(model)}.png`; return; }
        if (step === 2) { image.src = `images/${encodeURIComponent(model)}.webp`; return; }
        const placeholder = document.createElement("div");
        placeholder.className = "vl-card-placeholder";
        placeholder.textContent = label;
        image.replaceWith(placeholder);
      });
    });
  }

  function cardHtml(vehicle) {
    const handling = linkedHandling(vehicle);
    const title = displayTitle(vehicle);
    const image = vehicle.custom?.imageDataUrl;
    const classLabel = cleanClassName(vehicle.vehiclesMeta?.vehicleClass);
    const installType = inferInstallType(vehicle);
    const detailsUrl = `vehicle-details.html?model=${encodeURIComponent(vehicle.modelName)}`;

    return `
      <article class="vl-vehicle-card" data-model="${escapeHTML(vehicle.modelName)}">
        <div class="vl-vehicle-card-image">
          ${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(title)}">` : `<img data-vl-static-model="${escapeHTML(vehicle.modelName.toLowerCase())}" data-vl-initials="${escapeHTML(initials(title))}" src="images/${encodeURIComponent(vehicle.modelName.toLowerCase())}.jpg" alt="${escapeHTML(title)}">`}
          <button class="vl-favorite-button ${vehicle.custom?.favorite ? "active" : ""}" type="button" data-favorite="${escapeHTML(vehicle.modelName)}" title="Toggle favorite">${vehicle.custom?.favorite ? "★" : "☆"}</button>
          <button class="vl-installed-button ${vehicle.custom?.installed === true ? "active" : ""}" type="button" data-installed="${escapeHTML(vehicle.modelName)}" title="${vehicle.custom?.installed === true ? "Mark not installed" : "Mark installed"}">${vehicle.custom?.installed === true ? "INSTALLED" : "+ INSTALL"}</button>
          <div class="vl-card-source-dots">
            <span class="vl-source-dot ${vehicle.vehiclesMeta?.modelName ? "ready" : ""}">META</span>
            <span class="vl-source-dot ${handling ? "ready" : ""}">HANDLING</span>
            <span class="vl-source-dot ${(vehicle.popgroups || []).length ? "ready" : ""}">GROUPS</span>
          </div>
        </div>
        <div class="vl-card-copy">
          <div class="vl-card-title-row"><h3 class="vl-card-title">${escapeHTML(title)}</h3></div>
          <div class="vl-card-model">${escapeHTML(vehicle.modelName)}</div>
          <div class="vl-card-make">${escapeHTML(vehicle.vehiclesMeta?.vehicleMakeName || "Make not listed")}</div>
          <div class="vl-card-badges">
            <span class="vl-badge">${escapeHTML(classLabel)}</span>
            ${handling?.AIHandling ? `<span class="vl-badge ai">${escapeHTML(handling.AIHandling)}</span>` : ""}
            ${vehicle.custom?.installed === true ? `<span class="vl-badge installed-status">INSTALLED</span>` : ""}
            ${installType !== "Unknown" ? `<span class="vl-badge install">${escapeHTML(installType)}</span>` : ""}
          </div>
          <div class="vl-card-actions"><a href="${detailsUrl}">Open Vehicle Details</a></div>
        </div>
      </article>
    `;
  }

  function renderGrid() {
    const filtered = getFilteredVehicles();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const visible = filtered.slice(start, start + PAGE_SIZE);

    el("vlResultCount").textContent = filtered.length
      ? `Showing ${start + 1}-${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length.toLocaleString()} vehicles`
      : "0 vehicles";

    const grid = el("vlVehicleGrid");
    grid.classList.toggle("list-view", state.view === "list");
    grid.innerHTML = visible.length ? visible.map(cardHtml).join("") : `
      <div class="vl-empty-state"><strong>No vehicles match these filters.</strong><span>Try another category, search, or import more source files.</span></div>
    `;

    setupStaticImageFallbacks(grid);

    grid.querySelectorAll("[data-favorite]").forEach(button => {
      button.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        const vehicle = await store.getVehicle(button.dataset.favorite);
        if (!vehicle) return;
        vehicle.custom = vehicle.custom || {};
        vehicle.custom.favorite = !vehicle.custom.favorite;
        vehicle.updatedAt = new Date().toISOString();
        await store.putVehicle(vehicle);
        await reloadData();
      });
    });

    grid.querySelectorAll("[data-installed]").forEach(button => {
      button.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        const vehicle = await store.getVehicle(button.dataset.installed);
        if (!vehicle) return;
        vehicle.custom = vehicle.custom || {};
        vehicle.custom.installed = vehicle.custom.installed !== true;
        if (vehicle.custom.installed && !vehicle.custom.installDate) {
          vehicle.custom.installDate = new Date().toISOString().slice(0, 10);
        }
        vehicle.updatedAt = new Date().toISOString();
        await store.putVehicle(vehicle);
        await reloadData();
        setStatus(`${vehicle.modelName} marked ${vehicle.custom.installed ? "installed" : "not installed"}.`, "good");
      });
    });

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    const host = el("vlPagination");
    if (totalPages <= 1) {
      host.innerHTML = "";
      return;
    }

    const pages = new Set([1, totalPages, state.page - 1, state.page, state.page + 1]);
    const validPages = [...pages].filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);
    const pieces = [];
    let previous = 0;
    validPages.forEach(page => {
      if (previous && page - previous > 1) pieces.push(`<span>…</span>`);
      pieces.push(`<button type="button" class="${page === state.page ? "active" : ""}" data-page="${page}">${page}</button>`);
      previous = page;
    });
    host.innerHTML = `<button type="button" data-page="${Math.max(1, state.page - 1)}">‹</button>${pieces.join("")}<button type="button" data-page="${Math.min(totalPages, state.page + 1)}">›</button>`;
    host.querySelectorAll("[data-page]").forEach(button => {
      button.addEventListener("click", () => {
        state.page = Number(button.dataset.page);
        renderGrid();
        window.scrollTo({ top: el("vlVehicleGrid").offsetTop - 120, behavior: "smooth" });
      });
    });
  }

  function renderAll() {
    renderStats();
    renderCategories();
    renderGrid();
  }

  function downloadJson(data, fileName) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    document.querySelectorAll("[data-pick]").forEach(button => {
      button.addEventListener("click", () => el(button.dataset.pick).click());
    });
    el("vlPopgroupsPicker").addEventListener("change", event => handleImport(event.target, importPopgroupsFiles));
    el("vlVehiclesPicker").addEventListener("change", event => handleImport(event.target, importVehicleFiles));
    el("vlHandlingPicker").addEventListener("change", event => handleImport(event.target, importHandlingFiles));

    const installDropZone = el("vlInstallDropZone");
    const installPicker = el("vlInstallFilesPicker");
    el("vlInstallBrowse").addEventListener("click", event => {
      event.stopPropagation();
      installPicker.click();
    });
    installDropZone.addEventListener("click", event => {
      if (event.target.closest("button")) return;
      installPicker.click();
    });
    installDropZone.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        installPicker.click();
      }
    });
    ["dragenter", "dragover"].forEach(name => installDropZone.addEventListener(name, event => {
      event.preventDefault();
      installDropZone.classList.add("drag-over");
    }));
    ["dragleave", "drop"].forEach(name => installDropZone.addEventListener(name, event => {
      event.preventDefault();
      installDropZone.classList.remove("drag-over");
    }));
    installDropZone.addEventListener("drop", event => toggleInstalledFromAssetFiles(event.dataTransfer.files));
    installPicker.addEventListener("change", event => {
      const files = event.target.files;
      event.target.value = "";
      toggleInstalledFromAssetFiles(files);
    });

    el("vlSearch").addEventListener("input", event => {
      state.filters.search = event.target.value;
      state.page = 1;
      renderGrid();
    });
    el("vlTypeFilter").addEventListener("change", event => {
      state.filters.type = event.target.value;
      state.page = 1;
      renderGrid();
    });
    el("vlAiFilter").addEventListener("change", event => {
      state.filters.ai = event.target.value;
      state.page = 1;
      renderGrid();
    });
    el("vlInstalledFilter").addEventListener("change", event => {
      state.filters.installed = event.target.value;
      state.page = 1;
      renderGrid();
    });
    el("vlInstallFilter").addEventListener("change", event => {
      state.filters.install = event.target.value;
      state.page = 1;
      renderGrid();
    });
    el("vlFavoritesOnly").addEventListener("change", event => {
      state.filters.favoritesOnly = event.target.checked;
      state.page = 1;
      renderGrid();
    });
    el("vlSort").addEventListener("change", event => {
      state.filters.sort = event.target.value;
      state.page = 1;
      renderGrid();
    });

    el("vlGridView").addEventListener("click", () => {
      state.view = "grid";
      el("vlGridView").classList.add("active");
      el("vlListView").classList.remove("active");
      renderGrid();
    });
    el("vlListView").addEventListener("click", () => {
      state.view = "list";
      el("vlListView").classList.add("active");
      el("vlGridView").classList.remove("active");
      renderGrid();
    });

    el("vlRandomVehicle").addEventListener("click", () => {
      const vehicles = getFilteredVehicles();
      if (!vehicles.length) {
        setStatus("There are no vehicles available for the current filters.", "warn");
        return;
      }
      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      location.href = `vehicle-details.html?model=${encodeURIComponent(vehicle.modelName)}`;
    });

    el("vlExportDatabase").addEventListener("click", async () => {
      const payload = await store.exportDatabase();
      downloadJson(payload, "gta-traffic-vehicle-library.json");
      setStatus("Vehicle Library backup exported.", "good");
    });

    el("vlImportDatabase").addEventListener("click", () => el("vlDatabasePicker").click());
    el("vlDatabasePicker").addEventListener("change", async event => {
      const file = event.target.files[0];
      event.target.value = "";
      if (!file) return;
      try {
        const payload = JSON.parse(await file.text());
        await store.importDatabase(payload);
        await reloadData();
        setStatus(`Imported Vehicle Library backup ${file.name}.`, "good");
      } catch (error) {
        console.error(error);
        setStatus(error.message || "The library backup could not be imported.", "bad");
      }
    });

    el("vlClearDatabase").addEventListener("click", async () => {
      if (!confirm("Clear every vehicle, handling profile, image, path, and note from this browser library?")) return;
      await store.clearAll();
      await reloadData();
      setStatus("The Vehicle Library database has been cleared.", "warn");
    });
  }

  async function initialize() {
    bindEvents();
    try {
      await store.openDatabase();
      if (navigator.storage?.persist) navigator.storage.persist().catch(() => false);
      await reloadData();
      setStatus(state.vehicles.length
        ? `Loaded ${state.vehicles.length.toLocaleString()} saved vehicle records from this browser.`
        : "Local database is ready. Import vehicles.meta to begin building the library.", "good");
    } catch (error) {
      console.error(error);
      setStatus("The browser database could not be opened. Use a normal browser window rather than private browsing.", "bad");
    }
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
