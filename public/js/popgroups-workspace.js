/* POPGROUPS_VISUAL_BUILDER_V4 */

(() => {
  const state = {
    vehicleGroups: [],
    pedGroups: [],
    metaVehicles: new Map(),
    cloudVehicles: new Map(),
    installedModels: new Set(),
    groupMode: "vehicles",
    libraryFilter: null
  };

  const CATEGORY_ORDER = [
    "Super",
    "Sports",
    "Sports Classics",
    "Muscle",
    "Sedans",
    "Coupes",
    "Compacts",
    "SUVs",
    "Off-Road",
    "Vans",
    "Motorcycles",
    "Commercial",
    "Industrial",
    "Utility",
    "Service",
    "Emergency",
    "Military",
    "Open Wheel",
    "Boats",
    "Planes",
    "Helicopters",
    "Cycles",
    "Trains",
    "Uncategorized"
  ];

  const CLASS_ALIASES = new Map([
    ["vc_super", "Super"],
    ["super", "Super"],
    ["veh_class_super", "Super"],

    ["vc_sport", "Sports"],
    ["vc_sports", "Sports"],
    ["sport", "Sports"],
    ["sports", "Sports"],
    ["veh_class_sport", "Sports"],
    ["veh_class_sports", "Sports"],

    ["vc_sport_classic", "Sports Classics"],
    ["vc_sports_classic", "Sports Classics"],
    ["vc_sportsclassics", "Sports Classics"],
    ["sport classic", "Sports Classics"],
    ["sports classic", "Sports Classics"],
    ["sports classics", "Sports Classics"],
    ["veh_class_sport_classic", "Sports Classics"],

    ["vc_muscle", "Muscle"],
    ["muscle", "Muscle"],
    ["veh_class_muscle", "Muscle"],

    ["vc_sedan", "Sedans"],
    ["vc_sedans", "Sedans"],
    ["sedan", "Sedans"],
    ["sedans", "Sedans"],
    ["veh_class_sedan", "Sedans"],

    ["vc_coupe", "Coupes"],
    ["vc_coupes", "Coupes"],
    ["coupe", "Coupes"],
    ["coupes", "Coupes"],
    ["veh_class_coupe", "Coupes"],

    ["vc_compact", "Compacts"],
    ["vc_compacts", "Compacts"],
    ["compact", "Compacts"],
    ["compacts", "Compacts"],
    ["veh_class_compact", "Compacts"],

    ["vc_suv", "SUVs"],
    ["vc_suvs", "SUVs"],
    ["suv", "SUVs"],
    ["suvs", "SUVs"],
    ["veh_class_suv", "SUVs"],

    ["vc_offroad", "Off-Road"],
    ["vc_off_road", "Off-Road"],
    ["offroad", "Off-Road"],
    ["off road", "Off-Road"],
    ["off-road", "Off-Road"],
    ["veh_class_offroad", "Off-Road"],

    ["vc_van", "Vans"],
    ["vc_vans", "Vans"],
    ["van", "Vans"],
    ["vans", "Vans"],
    ["veh_class_van", "Vans"],

    ["vc_motorcycle", "Motorcycles"],
    ["vc_motorcycles", "Motorcycles"],
    ["motorcycle", "Motorcycles"],
    ["motorcycles", "Motorcycles"],
    ["bike", "Motorcycles"],
    ["bikes", "Motorcycles"],
    ["veh_class_motorcycle", "Motorcycles"],

    ["vc_commercial", "Commercial"],
    ["commercial", "Commercial"],
    ["veh_class_commercial", "Commercial"],

    ["vc_industrial", "Industrial"],
    ["industrial", "Industrial"],
    ["veh_class_industrial", "Industrial"],

    ["vc_utility", "Utility"],
    ["utility", "Utility"],
    ["veh_class_utility", "Utility"],

    ["vc_service", "Service"],
    ["service", "Service"],
    ["veh_class_service", "Service"],

    ["vc_emergency", "Emergency"],
    ["emergency", "Emergency"],
    ["veh_class_emergency", "Emergency"],

    ["vc_military", "Military"],
    ["military", "Military"],
    ["veh_class_military", "Military"],

    ["vc_openwheel", "Open Wheel"],
    ["vc_open_wheel", "Open Wheel"],
    ["openwheel", "Open Wheel"],
    ["open wheel", "Open Wheel"],

    ["vc_boat", "Boats"],
    ["vc_boats", "Boats"],
    ["boat", "Boats"],
    ["boats", "Boats"],

    ["vc_plane", "Planes"],
    ["vc_planes", "Planes"],
    ["plane", "Planes"],
    ["planes", "Planes"],

    ["vc_helicopter", "Helicopters"],
    ["vc_helicopters", "Helicopters"],
    ["helicopter", "Helicopters"],
    ["helicopters", "Helicopters"],
    ["heli", "Helicopters"],

    ["vc_cycle", "Cycles"],
    ["vc_cycles", "Cycles"],
    ["cycle", "Cycles"],
    ["cycles", "Cycles"],

    ["vc_train", "Trains"],
    ["vc_trains", "Trains"],
    ["train", "Trains"],
    ["trains", "Trains"]
  ]);

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function localName(node) {
    return String(node?.localName || node?.tagName || "").toLowerCase();
  }

  function directChildren(parent, name) {
    const wanted = String(name || "").toLowerCase();
    return Array.from(parent?.children || []).filter((child) => localName(child) === wanted);
  }

  function directChild(parent, names) {
    const list = Array.isArray(names) ? names : [names];
    const normalized = list.map((name) => String(name).toLowerCase());
    return Array.from(parent?.children || []).find((child) => normalized.includes(localName(child)));
  }

  function directText(parent, names) {
    const child = directChild(parent, names);
    return child ? child.textContent.trim() : "";
  }

  function setStatus(id, message, mode = "") {
    const target = $(id);
    if (!target) return;
    target.textContent = message;
    target.classList.remove("success", "error");
    if (mode) target.classList.add(mode);
  }

  function normalizeModelName(value) {
    return String(value || "")
      .trim()
      .replace(/\.(yft|ytd)$/i, "")
      .replace(/(\+hi|_hi)$/i, "")
      .toLowerCase();
  }

  function normalizeCategory(value) {
    const raw = String(value || "").trim();
    if (!raw) return "Uncategorized";

    const key = raw
      .replace(/^vehicle[_\s-]*/i, "")
      .replace(/^class[_\s-]*/i, "")
      .replace(/^veh[_\s-]class[_\s-]*/i, "")
      .replace(/-/g, " ")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    const aliasKey = raw
      .replace(/-/g, "_")
      .replace(/\s+/g, "_")
      .toLowerCase();

    if (CLASS_ALIASES.has(aliasKey)) return CLASS_ALIASES.get(aliasKey);
    if (CLASS_ALIASES.has(key)) return CLASS_ALIASES.get(key);

    const known = CATEGORY_ORDER.find((item) => item.toLowerCase() === key);
    if (known) return known;

    if (key === "sport classics") return "Sports Classics";
    if (key === "suv") return "SUVs";

    return key.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function findDeepValueByKeys(source, keys, depth = 0) {
    if (!source || typeof source !== "object" || depth > 5) return "";

    const wanted = new Set(keys.map((key) => key.toLowerCase()));

    for (const [key, value] of Object.entries(source)) {
      if (!wanted.has(String(key).toLowerCase())) continue;
      if (value === null || value === undefined) continue;
      if (typeof value !== "object") return String(value);
    }

    for (const value of Object.values(source)) {
      if (value && typeof value === "object") {
        const found = findDeepValueByKeys(value, keys, depth + 1);
        if (found) return found;
      }
    }

    return "";
  }

  function inferVehicleCategory(record) {
    const direct = findDeepValueByKeys(record, [
      "vehicleClass",
      "vehicleClassName",
      "className",
      "class",
      "category",
      "vehicleCategory",
      "vehicleType",
      "type",
      "displayClass",
      "classDisplayName",
      "vehicle_class",
      "vehicle_class_name",
      "vehicle_type"
    ]);

    const directCategory = normalizeCategory(direct);
    if (directCategory && directCategory !== "Uncategorized") return directCategory;

    const text = [
      record?.modelName,
      record?.model,
      record?.spawnName,
      record?.handlingId,
      record?.handlingName,
      record?.packName,
      record?.dlcName,
      record?.sourcePack,
      record?.displayName,
      record?.vehicleName
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/police|sheriff|fbi|riot|ambulance|fire|ems|lguard|pranger/.test(text)) return "Emergency";
    if (/bus|coach|taxi|trash|mule|pounder|benson|packer|phantom|hauler|stockade/.test(text)) return "Commercial";
    if (/barracks|crusader|rhino|khanjali|apc|chernobog|halftrack/.test(text)) return "Military";
    if (/dinghy|jetmax|speeder|squalo|suntrap|toro|tropic|marquis|seashark|boat/.test(text)) return "Boats";
    if (/maverick|frogger|buzzard|annihilator|havok|swift|volatus|heli/.test(text)) return "Helicopters";
    if (/luxor|shamal|cuban|dodo|mammatus|velum|vestra|plane|jet/.test(text)) return "Planes";
    if (/bati|akuma|daemon|double|hexer|nemesis|pcj|ruffian|sanchez|vader|wolfsbane|zombie|bike/.test(text)) return "Motorcycles";
    if (/rebel|sandking|mesa|dubsta|everon|freecrawler|hellion|kamacho|riata|outlaw|offroad/.test(text)) return "Off-Road";
    if (/issi|panto|brioso|blista|rhapsody/.test(text)) return "Compacts";
    if (/baller|cavalcade|gresley|huntley|landstalker|patriot|radi|rocoto|seminole|xls/.test(text)) return "SUVs";
    if (/dominator|dukes|gauntlet|ruiner|sabregt|stalion|tampa|vigero|vamos|ellie/.test(text)) return "Muscle";
    if (/adder|zentorno|osiris|entity|cheetah|turismo|vacca|infernus|reaper|nero|tyrus|xa21/.test(text)) return "Super";
    if (/ninef|alpha|banshee|buffalo|carbonizzare|comet|coquette|elegy|feltzer|furore|jester|khamelion|kuruma|lynx|massacro|omnis|pariah|rapidgt|schafter|sultan|surano|verlierer/.test(text)) return "Sports";
    if (/asea|asterope|emperor|fugitive|glendale|ingot|intruder|premier|primo|regina|stanier|stratum|stretch|superd|surge|tailgater|warrener|washington/.test(text)) return "Sedans";
    if (/cogcabrio|exemplar|f620|felon|jackal|oracle|sentinel|windsor|zion/.test(text)) return "Coupes";

    return "Uncategorized";
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Could not read file"));
      reader.readAsText(file);
    });
  }

  function parseXml(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) throw new Error("XML parser error");
    return doc;
  }

  function bindDropZone(zoneId, inputId, onFiles) {
    const zone = $(zoneId);
    const input = $(inputId);
    if (!zone || !input) return;

    zone.addEventListener("click", () => input.click());

    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("is-dragover");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("is-dragover");
    });

    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("is-dragover");
      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length) onFiles(files);
    });

    input.addEventListener("change", () => {
      const files = Array.from(input.files || []);
      if (files.length) onFiles(files);
      input.value = "";
    });
  }

  function collectItemText(container) {
    if (!container) return [];

    return Array.from(container.getElementsByTagName("*"))
      .filter((node) => localName(node) === "item")
      .map((item) => item.textContent.trim())
      .filter(Boolean)
      .filter((value) => !value.includes("\n"))
      .filter((value) => value.length < 90)
      .filter((value, index, array) => array.indexOf(value) === index);
  }

  function parseGroupItems(container) {
    if (!container) return [];

    return directChildren(container, "item").map((item, index) => {
      const name =
        directText(item, ["name", "Name"]) ||
        item.getAttribute("name") ||
        "Group " + (index + 1);

      const modelsContainer =
        directChild(item, ["models", "Models", "peds", "Peds", "items", "Items"]) ||
        item;

      const entries = collectItemText(modelsContainer)
        .filter((entry) => entry !== name);

      return {
        id: crypto.randomUUID(),
        name,
        type: inferGroupType(name),
        entries
      };
    });
  }

  function inferGroupType(groupName) {
    const name = String(groupName || "").toLowerCase();

    if (/super/.test(name)) return "Super";
    if (/sport.*classic|classic.*sport/.test(name)) return "Sports Classics";
    if (/sport/.test(name)) return "Sports";
    if (/muscle/.test(name)) return "Muscle";
    if (/sedan/.test(name)) return "Sedans";
    if (/coupe/.test(name)) return "Coupes";
    if (/compact/.test(name)) return "Compacts";
    if (/suv/.test(name)) return "SUVs";
    if (/off|dirt|country|rural|desert|mountain/.test(name)) return "Off-Road";
    if (/van/.test(name)) return "Vans";
    if (/bike|moto/.test(name)) return "Motorcycles";
    if (/commercial|truck/.test(name)) return "Commercial";
    if (/emergency|police|sheriff|fire|ambulance/.test(name)) return "Emergency";
    if (/military/.test(name)) return "Military";
    if (/boat/.test(name)) return "Boats";
    if (/plane|air/.test(name)) return "Planes";
    if (/heli/.test(name)) return "Helicopters";

    return "Uncategorized";
  }

  function parseVehicleMetaItem(item) {
    const modelName = directText(item, "modelName");
    if (!modelName) return null;

    const record = {
      modelName,
      displayName:
        directText(item, ["gameName", "vehicleName", "displayName"]) ||
        modelName,
      handlingId: directText(item, "handlingId"),
      rawClass:
        directText(item, ["vehicleClass", "class", "className", "category", "type"]),
      make: directText(item, ["vehicleMakeName", "make", "manufacturer"]),
      source: "meta"
    };

    record.category = inferVehicleCategory(record);
    return record;
  }

  function upsertVehicle(record, source) {
    const modelName =
      record?.modelName ||
      record?.model ||
      record?.spawnName ||
      record?.name ||
      record?.vehicleName;

    const normalized = normalizeModelName(modelName);
    if (!normalized) return;

    const existing =
      state.cloudVehicles.get(normalized) ||
      state.metaVehicles.get(normalized) ||
      {};

    const merged = {
      ...existing,
      ...record,
      modelName: normalized,
      displayName:
        record.displayName ||
        record.custom?.displayName ||
        existing.displayName ||
        existing.custom?.displayName ||
        normalized,
      category: inferVehicleCategory({ ...existing, ...record }),
      source: existing.source || source,
      sources: Array.from(new Set([...(existing.sources || []), source].filter(Boolean)))
    };

    if (source === "meta") {
      state.metaVehicles.set(normalized, merged);
    } else {
      state.cloudVehicles.set(normalized, merged);
    }
  }

  async function handlePopgroupsFiles(files) {
    const file = files[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const doc = parseXml(text);

      const vehContainer =
        doc.querySelector("vehGroups") ||
        Array.from(doc.getElementsByTagName("*")).find((node) => localName(node) === "vehgroups");

      const pedContainer =
        doc.querySelector("pedGroups") ||
        Array.from(doc.getElementsByTagName("*")).find((node) => localName(node) === "pedgroups");

      state.vehicleGroups = parseGroupItems(vehContainer);
      state.pedGroups = parseGroupItems(pedContainer);

      setStatus(
        "pgPopgroupsStatus",
        `Loaded ${file.name}: ${state.vehicleGroups.length} vehicle group(s), ${state.pedGroups.length} ped group(s).`,
        "success"
      );

      renderAll();
    } catch (error) {
      console.error(error);
      setStatus("pgPopgroupsStatus", "Could not parse PopGroups XML.", "error");
    }
  }

  async function handleMetaFiles(files) {
    let total = 0;

    for (const file of files) {
      try {
        const text = await readFileAsText(file);
        total += parseVehiclesMetaText(text);
      } catch (error) {
        console.error(error);
      }
    }

    setStatus("pgMetaStatus", `Loaded ${total} vehicle record(s) from vehicles.meta.`, total ? "success" : "error");
    renderAll();
  }

  function parseVehiclesMetaText(text) {
    const doc = parseXml(text);
    const items = Array.from(doc.getElementsByTagName("*"))
      .filter((node) => localName(node) === "item");

    let count = 0;

    items.forEach((item) => {
      const vehicle = parseVehicleMetaItem(item);
      if (!vehicle) return;
      upsertVehicle(vehicle, "meta");
      count++;
    });

    return count;
  }

  function collectCloudVehicleCandidates(data) {
    const output = [];
    const seen = new Set();

    function visit(value, depth = 0) {
      if (!value || depth > 5) return;

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, depth + 1));
        return;
      }

      if (typeof value !== "object") return;

      const modelName =
        value.modelName ||
        value.model ||
        value.spawnName ||
        value.vehicleName ||
        value.name;

      if (modelName) {
        const key = normalizeModelName(modelName);
        if (key && !seen.has(key)) {
          seen.add(key);
          output.push(value);
        }
      }

      [
        "vehicles",
        "vehicleMeta",
        "vehicleMetadata",
        "records",
        "items",
        "library",
        "data",
        "metadata",
        "meta"
      ].forEach((key) => {
        if (value[key]) visit(value[key], depth + 1);
      });
    }

    visit(data);
    return output;
  }

  function normalizeCloudVehicle(record) {
    const custom = record.custom || {};
    const meta = record.meta || {};

    const merged = {
      ...record,
      ...meta,
      modelName:
        record.modelName ||
        record.model ||
        record.spawnName ||
        record.name,
      displayName:
        custom.displayName ||
        record.displayName ||
        record.vehicleName ||
        record.name ||
        record.gameName ||
        record.modelName ||
        record.model,
      handlingId:
        record.handlingId ||
        record.handlingName ||
        record.handling_id ||
        meta.handlingId,
      packName:
        record.packName ||
        record.dlcName ||
        record.sourcePack ||
        record.pack_name ||
        meta.packName,
      imageUrl:
        record.imageUrl ||
        record.image_url ||
        record.thumbnailUrl ||
        custom.imageUrl
    };

    merged.category = inferVehicleCategory(merged);
    return merged;
  }

  async function loadCloudLibrary() {
    if (!window.vehicleCloud || typeof window.vehicleCloud.getLibraryData !== "function") {
      setStatus("pgCloudStatus", "Cloud library module not available on this page.", "error");
      return;
    }

    try {
      const data = await window.vehicleCloud.getLibraryData([]);
      const vehicles = collectCloudVehicleCandidates(data).map(normalizeCloudVehicle);

      vehicles.forEach((vehicle) => upsertVehicle(vehicle, "cloud"));

      setStatus(
        "pgCloudStatus",
        `Cloud Vehicles ${state.cloudVehicles.size}`,
        state.cloudVehicles.size ? "success" : ""
      );
    } catch (error) {
      console.error(error);
      setStatus("pgCloudStatus", "Cloud vehicle metadata could not be loaded.", "error");
    }

    await loadSavedRawMetaFiles();
    renderAll();
  }

  async function loadSavedRawMetaFiles() {
    if (!window.metaFileCloud || typeof window.metaFileCloud.listFiles !== "function") {
      return;
    }

    try {
      const listResult = await window.metaFileCloud.listFiles();
      const files = Array.isArray(listResult)
        ? listResult
        : listResult.files || listResult.items || listResult.data || [];

      const vehiclesMetaFiles = files.filter((file) => {
        const name = String(file.fileName || file.name || file.key || file.path || "").toLowerCase();
        const type = String(file.fileType || file.type || "").toLowerCase();
        return name.includes("vehicles.meta") || type.includes("vehicle");
      });

      let loaded = 0;

      for (const file of vehiclesMetaFiles.slice(0, 3)) {
        if (typeof window.metaFileCloud.getFile !== "function") continue;

        const id =
          file.id ||
          file.fileId ||
          file.key ||
          file.path ||
          file.fileName ||
          file.name;

        const result = await window.metaFileCloud.getFile(id);
        const content =
          result.content ||
          result.text ||
          result.raw ||
          result.fileContent ||
          result.body ||
          "";

        if (!content) continue;

        loaded += parseVehiclesMetaText(content);
      }

      if (loaded) {
        setStatus("pgMetaStatus", `Auto-loaded ${loaded} vehicle record(s) from saved vehicles.meta cloud files.`, "success");
      }
    } catch (error) {
      console.warn("Saved raw meta auto-load skipped:", error);
    }
  }

  function extractInstalledModels(text) {
    const found = new Set();
    const matches = String(text || "").match(/[A-Za-z0-9_+\-]+?\.(?:yft|ytd)\b/gi) || [];

    matches.forEach((match) => {
      const model = normalizeModelName(match);
      if (!model || model.includes("vehshare")) return;
      found.add(model);
    });

    return Array.from(found).sort();
  }

  async function handleScannerFiles(files) {
    const chunks = [];

    for (const file of files) {
      try {
        chunks.push(await readFileAsText(file));
      } catch (error) {
        console.error(error);
      }
    }

    const input = $("pgScannerInput");
    if (input) {
      input.value = [input.value, ...chunks].filter(Boolean).join("\n");
    }

    runInstalledScanner();
  }

  function runInstalledScanner() {
    const text = $("pgScannerInput")?.value || "";
    const models = extractInstalledModels(text);

    state.installedModels = new Set(models);

    models.forEach((modelName) => {
      const existing = state.cloudVehicles.get(modelName) || state.metaVehicles.get(modelName) || {};
      const updated = {
        ...existing,
        modelName,
        installed: true,
        displayName: existing.displayName || modelName,
        category: inferVehicleCategory(existing)
      };

      if (state.cloudVehicles.has(modelName)) {
        state.cloudVehicles.set(modelName, updated);
      } else {
        state.metaVehicles.set(modelName, updated);
      }
    });

    setStatus(
      "pgScannerStatus",
      models.length ? `Detected ${models.length} installed add-on vehicle model(s).` : "No installed vehicle models detected.",
      models.length ? "success" : "error"
    );

    renderAll();
  }

  async function markInstalledInCloud() {
    const models = Array.from(state.installedModels);

    if (!models.length) {
      setStatus("pgScannerStatus", "Run the installed scanner before marking vehicles installed.", "error");
      return;
    }

    if (!window.vehicleCloud || typeof window.vehicleCloud.updateVehicle !== "function") {
      setStatus("pgScannerStatus", "Cloud update function is not available.", "error");
      return;
    }

    let saved = 0;

    for (const modelName of models) {
      try {
        await window.vehicleCloud.updateVehicle(modelName, {
          installed: true,
          installSource: "installed-addon-scan"
        });
        saved++;
      } catch (error) {
        console.error(error);
      }
    }

    setStatus("pgScannerStatus", `Marked ${saved} installed vehicle(s) in cloud.`, saved ? "success" : "error");
  }

  async function copyInstalledModels() {
    const models = Array.from(state.installedModels);

    if (!models.length) {
      setStatus("pgScannerStatus", "No installed vehicle models to copy.", "error");
      return;
    }

    await navigator.clipboard.writeText(models.join("\n"));
    setStatus("pgScannerStatus", `Copied ${models.length} installed model name(s).`, "success");
  }

  function clearScanner() {
    state.installedModels.clear();
    const input = $("pgScannerInput");
    if (input) input.value = "";
    setStatus("pgScannerStatus", "Installed scanner cleared.");
    renderAll();
  }

  function getAllVehicles() {
    const merged = new Map();

    state.cloudVehicles.forEach((value, key) => merged.set(key, value));

    state.metaVehicles.forEach((value, key) => {
      merged.set(key, {
        ...(merged.get(key) || {}),
        ...value,
        modelName: key
      });
    });

    state.installedModels.forEach((modelName) => {
      merged.set(modelName, {
        ...(merged.get(modelName) || {}),
        modelName,
        installed: true,
        displayName: merged.get(modelName)?.displayName || modelName,
        category: inferVehicleCategory(merged.get(modelName) || { modelName })
      });
    });

    return Array.from(merged.values()).map((vehicle) => ({
      ...vehicle,
      category: inferVehicleCategory(vehicle)
    }));
  }

  function vehicleTitle(vehicle) {
    return (
      vehicle.displayName ||
      vehicle.vehicleName ||
      vehicle.gameName ||
      vehicle.name ||
      vehicle.modelName ||
      "Unknown Vehicle"
    );
  }

  function matchesQuery(values, query) {
    if (!query) return true;

    return values
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
  }

  function renderStats() {
    const target = $("pgStats");
    if (!target) return;

    target.innerHTML = `
      <div><strong>${state.vehicleGroups.length}</strong><span>Vehicle Groups</span></div>
      <div><strong>${state.pedGroups.length}</strong><span>Ped Groups</span></div>
      <div><strong>${state.metaVehicles.size}</strong><span>Meta Vehicles</span></div>
      <div><strong>${state.installedModels.size}</strong><span>Installed</span></div>
    `;
  }

  function categoryOptions(selected) {
    return CATEGORY_ORDER.map((category) => `
      <option value="${escapeHtml(category)}" ${category === selected ? "selected" : ""}>${escapeHtml(category)}</option>
    `).join("");
  }

  function renderGroups() {
    const target = $("pgGroupList");
    if (!target) return;

    const query = $("pgGroupSearch")?.value || "";
    const groups = state.groupMode === "peds" ? state.pedGroups : state.vehicleGroups;

    const filtered = groups.filter((group) =>
      matchesQuery([group.name, group.type, ...(group.entries || [])], query)
    );

    if (!filtered.length) {
      target.innerHTML = `
        <div class="pg-empty-state">
          ${groups.length ? "No groups match the current search." : "Import a PopGroups XML file or add a group to begin."}
        </div>
      `;
      return;
    }

    target.innerHTML = filtered
      .map((group) => {
        const realIndex = groups.indexOf(group);
        const entries = group.entries || [];

        return `
          <article class="pg-group-card pg-drop-target" data-group-index="${realIndex}">
            <div class="pg-group-card-header">
              <div>
                <input class="pg-group-name-input" data-group-action="rename" data-group-index="${realIndex}" value="${escapeHtml(group.name)}">
                <select class="pg-group-type-select" data-group-action="type" data-group-index="${realIndex}">
                  ${categoryOptions(group.type || "Uncategorized")}
                </select>
              </div>
              <span class="pg-count-pill">${entries.length} entries</span>
            </div>

            <div class="pg-group-drop-hint">Drag vehicles from the library sidebar into this group</div>

            <div class="pg-model-pill-grid">
              ${entries.map((entry, entryIndex) => {
                const model = normalizeModelName(entry);
                const installed = state.installedModels.has(model);
                const hasMeta = state.metaVehicles.has(model) || state.cloudVehicles.has(model);

                return `
                  <span class="pg-model-pill ${installed ? "is-installed" : ""} ${hasMeta ? "is-meta" : ""}">
                    <a href="vehicle-details.html?model=${encodeURIComponent(model)}">${escapeHtml(entry)}</a>
                    <button type="button" data-group-action="remove-entry" data-group-index="${realIndex}" data-entry-index="${entryIndex}">x</button>
                  </span>
                `;
              }).join("")}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderLibrary() {
    const target = $("pgLibraryList");
    if (!target) return;

    const query = $("pgLibrarySearch")?.value || "";
    let vehicles = getAllVehicles();

    if (state.libraryFilter === "installed") {
      vehicles = vehicles.filter((vehicle) => state.installedModels.has(normalizeModelName(vehicle.modelName)));
    }

    if (state.libraryFilter === "meta") {
      vehicles = vehicles.filter((vehicle) => state.metaVehicles.has(normalizeModelName(vehicle.modelName)));
    }

    if (state.libraryFilter === "cloud") {
      vehicles = vehicles.filter((vehicle) => state.cloudVehicles.has(normalizeModelName(vehicle.modelName)));
    }

    vehicles = vehicles.filter((vehicle) =>
      matchesQuery(
        [
          vehicle.modelName,
          vehicleTitle(vehicle),
          vehicle.category,
          vehicle.handlingId,
          vehicle.packName,
          vehicle.make
        ],
        query
      )
    );

    if (!vehicles.length) {
      target.innerHTML = '<div class="pg-empty-state">No vehicles match the current library filter.</div>';
      return;
    }

    const groups = new Map();

    vehicles.forEach((vehicle) => {
      const category = inferVehicleCategory(vehicle);
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(vehicle);
    });

    const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);

      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });

    target.innerHTML = sortedGroups
      .map(([category, items]) => {
        const cards = items
          .sort((a, b) => vehicleTitle(a).localeCompare(vehicleTitle(b)))
          .map((vehicle) => {
            const model = normalizeModelName(vehicle.modelName);
            const installed = state.installedModels.has(model) || vehicle.installed;
            const hasMeta = state.metaVehicles.has(model);
            const hasCloud = state.cloudVehicles.has(model);

            return `
              <article class="pg-vehicle-card" draggable="true" data-model="${escapeHtml(model)}">
                ${vehicle.imageUrl
                  ? `<img class="pg-vehicle-thumb" src="${escapeHtml(vehicle.imageUrl)}" alt="">`
                  : `<div class="pg-vehicle-thumb" aria-hidden="true"></div>`}
                <div>
                  <h4>${escapeHtml(vehicleTitle(vehicle))}</h4>
                  <p>${escapeHtml(model)}</p>
                  <div class="pg-card-badges">
                    ${installed ? '<span class="pg-badge is-installed">Installed</span>' : ""}
                    ${hasMeta ? '<span class="pg-badge is-meta">Meta</span>' : ""}
                    ${hasCloud ? '<span class="pg-badge is-cloud">Cloud</span>' : ""}
                  </div>
                  <a class="pg-details-link" href="vehicle-details.html?model=${encodeURIComponent(model)}">Details</a>
                </div>
              </article>
            `;
          })
          .join("");

        return `
          <details class="pg-library-category" open>
            <summary class="pg-library-category-header">
              <strong>${escapeHtml(category)}</strong>
              <span>${items.length}</span>
            </summary>
            ${cards}
          </details>
        `;
      })
      .join("");
  }

  function renderAll() {
    renderStats();
    renderGroups();
    renderLibrary();

    $("pgShowVehicles")?.classList.toggle("is-active", state.groupMode === "vehicles");
    $("pgShowPeds")?.classList.toggle("is-active", state.groupMode === "peds");

    ["Installed", "Meta", "Cloud"].forEach((name) => {
      const id = "pgFilter" + name;
      const value = name.toLowerCase();
      $(id)?.setAttribute("aria-pressed", state.libraryFilter === value ? "true" : "false");
    });
  }

  function addModelToGroup(groupIndex, modelName) {
    const groups = state.groupMode === "peds" ? state.pedGroups : state.vehicleGroups;
    const group = groups[groupIndex];
    const model = normalizeModelName(modelName);

    if (!group || !model) return;

    group.entries = group.entries || [];

    if (!group.entries.some((entry) => normalizeModelName(entry) === model)) {
      group.entries.push(model);
    }

    renderAll();
  }

  function addGroup() {
    const groups = state.groupMode === "peds" ? state.pedGroups : state.vehicleGroups;
    groups.push({
      id: crypto.randomUUID(),
      name: state.groupMode === "peds" ? "NEW_PED_GROUP" : "NEW_VEHICLE_GROUP",
      type: "Uncategorized",
      entries: []
    });

    renderAll();
  }

  function exportRebuiltXml() {
    const vehicleGroups = state.vehicleGroups
      .map((group) => `
    <Item>
      <Name>${escapeXml(group.name)}</Name>
      <models>
${(group.entries || []).map((entry) => `        <Item>${escapeXml(entry)}</Item>`).join("\n")}
      </models>
    </Item>`)
      .join("");

    const pedGroups = state.pedGroups
      .map((group) => `
    <Item>
      <Name>${escapeXml(group.name)}</Name>
      <models>
${(group.entries || []).map((entry) => `        <Item>${escapeXml(entry)}</Item>`).join("\n")}
      </models>
    </Item>`)
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<popgroups>
  <vehGroups>${vehicleGroups}
  </vehGroups>
  <pedGroups>${pedGroups}
  </pedGroups>
</popgroups>
`;

    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "popgroups.rebuilt.xml";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function clearWorkspace() {
    state.vehicleGroups = [];
    state.pedGroups = [];
    setStatus("pgPopgroupsStatus", "Workspace cleared.");
    renderAll();
  }

  function buildCloudProjectPayload() {
    return {
      version: 4,
      tool: "popgroups",
      savedAt: new Date().toISOString(),
      vehicleGroups: state.vehicleGroups,
      pedGroups: state.pedGroups,
      metaVehicles: Array.from(state.metaVehicles.values()),
      cloudVehicleCount: state.cloudVehicles.size,
      installedModels: Array.from(state.installedModels),
      summary: {
        vehicleGroups: state.vehicleGroups.length,
        pedGroups: state.pedGroups.length,
        metaVehicles: state.metaVehicles.size,
        installedModels: state.installedModels.size
      }
    };
  }

  async function saveCloudProject() {
    const name = $("pgCloudProjectName")?.value?.trim() || "PopGroups traffic setup";
    const description = $("pgCloudProjectDescription")?.value?.trim() || "";
    const payload = buildCloudProjectPayload();

    setStatus("pgCloudProjectStatus", "Saving PopGroups workspace to cloud...");

    try {
      const response = await fetch("/api/saved-projects", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          title: name,
          description,
          projectType: "popgroups",
          type: "popgroups",
          payload,
          summary: payload.summary,
          files: []
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok === false) {
        throw new Error(result.error || "Cloud project save failed");
      }

      setStatus("pgCloudProjectStatus", "Saved to cloud project dashboard.", "success");
    } catch (error) {
      console.error(error);
      localStorage.setItem(
        "gtaTraffic.popgroups.lastCloudProjectDraft",
        JSON.stringify({ name, description, payload })
      );
      setStatus("pgCloudProjectStatus", "Cloud save failed. Local draft backup saved in this browser.", "error");
    }
  }

  function bindBuilderEvents() {
    const groupList = $("pgGroupList");
    const libraryList = $("pgLibraryList");

    libraryList?.addEventListener("dragstart", (event) => {
      const card = event.target.closest(".pg-vehicle-card");
      if (!card) return;

      event.dataTransfer.setData("text/plain", card.dataset.model || "");
      event.dataTransfer.effectAllowed = "copy";
    });

    groupList?.addEventListener("dragover", (event) => {
      const card = event.target.closest(".pg-group-card");
      if (!card) return;

      event.preventDefault();
      card.classList.add("is-dragover");
      event.dataTransfer.dropEffect = "copy";
    });

    groupList?.addEventListener("dragleave", (event) => {
      const card = event.target.closest(".pg-group-card");
      if (card) card.classList.remove("is-dragover");
    });

    groupList?.addEventListener("drop", (event) => {
      const card = event.target.closest(".pg-group-card");
      if (!card) return;

      event.preventDefault();
      card.classList.remove("is-dragover");

      const model = event.dataTransfer.getData("text/plain");
      addModelToGroup(Number(card.dataset.groupIndex), model);
    });

    groupList?.addEventListener("input", (event) => {
      const action = event.target.dataset.groupAction;
      const index = Number(event.target.dataset.groupIndex);
      const groups = state.groupMode === "peds" ? state.pedGroups : state.vehicleGroups;
      const group = groups[index];

      if (!group) return;

      if (action === "rename") {
        group.name = event.target.value;
      }

      if (action === "type") {
        group.type = event.target.value;
      }
    });

    groupList?.addEventListener("click", (event) => {
      const action = event.target.dataset.groupAction;
      if (action !== "remove-entry") return;

      const index = Number(event.target.dataset.groupIndex);
      const entryIndex = Number(event.target.dataset.entryIndex);
      const groups = state.groupMode === "peds" ? state.pedGroups : state.vehicleGroups;
      const group = groups[index];

      if (!group) return;

      group.entries.splice(entryIndex, 1);
      renderAll();
    });
  }

  function bindEvents() {
    bindDropZone("pgPopgroupsDropZone", "pgPopgroupsFile", handlePopgroupsFiles);
    bindDropZone("pgMetaDropZone", "pgMetaFile", handleMetaFiles);
    bindDropZone("pgScannerDropZone", "pgScannerFiles", handleScannerFiles);

    $("pgRunScanner")?.addEventListener("click", runInstalledScanner);
    $("pgMarkInstalled")?.addEventListener("click", markInstalledInCloud);
    $("pgCopyInstalled")?.addEventListener("click", copyInstalledModels);
    $("pgClearScanner")?.addEventListener("click", clearScanner);

    $("pgShowVehicles")?.addEventListener("click", () => {
      state.groupMode = "vehicles";
      renderAll();
    });

    $("pgShowPeds")?.addEventListener("click", () => {
      state.groupMode = "peds";
      renderAll();
    });

    $("pgGroupSearch")?.addEventListener("input", renderGroups);
    $("pgLibrarySearch")?.addEventListener("input", renderLibrary);

    $("pgFilterInstalled")?.addEventListener("click", () => {
      state.libraryFilter = state.libraryFilter === "installed" ? null : "installed";
      renderAll();
    });

    $("pgFilterMeta")?.addEventListener("click", () => {
      state.libraryFilter = state.libraryFilter === "meta" ? null : "meta";
      renderAll();
    });

    $("pgFilterCloud")?.addEventListener("click", () => {
      state.libraryFilter = state.libraryFilter === "cloud" ? null : "cloud";
      renderAll();
    });

    $("pgAddGroup")?.addEventListener("click", addGroup);
    $("pgExportXml")?.addEventListener("click", exportRebuiltXml);
    $("pgClearWorkspace")?.addEventListener("click", clearWorkspace);
    $("pgSaveCloudProject")?.addEventListener("click", saveCloudProject);

    bindBuilderEvents();
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    renderAll();
    loadCloudLibrary();
  });
})();
