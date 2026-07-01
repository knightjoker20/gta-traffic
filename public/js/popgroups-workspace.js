/* POPGROUPS_LEGACY_LIBRARY_BRIDGE_V2 */

(() => {
  const cloudVehicles = new Map();
  const imageMap = new Map();

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

  function normalizeModelName(value) {
    return String(value || "")
      .trim()
      .replace(/\.(yft|ytd)$/i, "")
      .replace(/(\+hi|_hi)$/i, "")
      .toLowerCase();
  }

  function parseMaybeJson(value) {
    if (!value || typeof value !== "string") return null;

    const trimmed = value.trim();

    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  function flattenRecord(record) {
    const output = { ...(record || {}) };

    [
      "custom_json",
      "meta_json",
      "metadata_json",
      "vehicle_json",
      "payload_json",
      "raw_json",
      "custom",
      "meta",
      "metadata",
      "vehicle"
    ].forEach((key) => {
      const value = record?.[key];

      if (!value) return;

      if (typeof value === "object" && !Array.isArray(value)) {
        Object.assign(output, value);
      }

      const parsed = parseMaybeJson(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.assign(output, parsed);
      }
    });

    return output;
  }

  function getModel(record) {
    const flat = flattenRecord(record);

    return normalizeModelName(
      flat.modelName ||
      flat.model_name ||
      flat.model ||
      flat.spawnName ||
      flat.spawn_name ||
      flat.vehicleName ||
      flat.vehicle_name ||
      flat.name
    );
  }

  function getImageUrl(record) {
    const flat = flattenRecord(record);
    const custom = record?.custom || {};
    const meta = record?.meta || {};

    return (
      // Canonical field set by vehicleCloud's attachImagesToVehicles() /
      // used everywhere else in the app (vehiclelibrary.js, vehicledetails.js).
      custom.imageDataUrl ||
      flat.imageDataUrl ||
      flat.imageUrl ||
      flat.image_url ||
      flat.thumbnailUrl ||
      flat.thumbnail_url ||
      flat.photoUrl ||
      flat.photo_url ||
      flat.pictureUrl ||
      flat.picture_url ||
      flat.primaryImageUrl ||
      flat.primary_image_url ||
      flat.vehicleImageUrl ||
      flat.vehicle_image_url ||
      flat.image ||
      flat.thumbnail ||
      custom.imageUrl ||
      custom.image_url ||
      meta.imageUrl ||
      meta.image_url ||
      ""
    );
  }

  function getDisplayName(record) {
    const flat = flattenRecord(record);
    const model = getModel(record);

    return (
      flat.displayName ||
      flat.display_name ||
      flat.customDisplayName ||
      flat.custom_display_name ||
      flat.vehicleName ||
      flat.vehicle_name ||
      flat.gameName ||
      flat.game_name ||
      flat.name ||
      model
    );
  }

  function normalizeCategory(value) {
    const raw = String(value || "").trim();
    if (!raw) return "Uncategorized";

    const key = raw
      .replace(/^vehicle[_\s-]*/i, "")
      .replace(/^veh[_\s-]*/i, "")
      .replace(/^class[_\s-]*/i, "")
      .replace(/-/g, " ")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    const aliases = {
      "vc super": "Super",
      "super": "Super",
      "vc sports": "Sports",
      "vc sport": "Sports",
      "sports": "Sports",
      "sport": "Sports",
      "vc sports classic": "Sports Classics",
      "vc sport classic": "Sports Classics",
      "vc sportsclassics": "Sports Classics",
      "sports classics": "Sports Classics",
      "sports classic": "Sports Classics",
      "vc muscle": "Muscle",
      "muscle": "Muscle",
      "vc sedan": "Sedans",
      "vc sedans": "Sedans",
      "sedan": "Sedans",
      "sedans": "Sedans",
      "vc coupe": "Coupes",
      "vc coupes": "Coupes",
      "coupe": "Coupes",
      "coupes": "Coupes",
      "vc compact": "Compacts",
      "vc compacts": "Compacts",
      "compact": "Compacts",
      "compacts": "Compacts",
      "vc suv": "SUVs",
      "vc suvs": "SUVs",
      "suv": "SUVs",
      "suvs": "SUVs",
      "vc offroad": "Off-Road",
      "vc off road": "Off-Road",
      "offroad": "Off-Road",
      "off road": "Off-Road",
      "off-road": "Off-Road",
      "vc van": "Vans",
      "vc vans": "Vans",
      "van": "Vans",
      "vans": "Vans",
      "vc motorcycle": "Motorcycles",
      "vc motorcycles": "Motorcycles",
      "motorcycle": "Motorcycles",
      "motorcycles": "Motorcycles",
      "bike": "Motorcycles",
      "bikes": "Motorcycles",
      "vc commercial": "Commercial",
      "commercial": "Commercial",
      "vc industrial": "Industrial",
      "industrial": "Industrial",
      "vc utility": "Utility",
      "utility": "Utility",
      "vc service": "Service",
      "service": "Service",
      "vc emergency": "Emergency",
      "emergency": "Emergency",
      "vc military": "Military",
      "military": "Military",
      "vc openwheel": "Open Wheel",
      "vc open wheel": "Open Wheel",
      "open wheel": "Open Wheel",
      "openwheel": "Open Wheel",
      "vc boat": "Boats",
      "vc boats": "Boats",
      "boat": "Boats",
      "boats": "Boats",
      "vc plane": "Planes",
      "vc planes": "Planes",
      "plane": "Planes",
      "planes": "Planes",
      "vc helicopter": "Helicopters",
      "vc helicopters": "Helicopters",
      "helicopter": "Helicopters",
      "helicopters": "Helicopters",
      "heli": "Helicopters",
      "vc cycle": "Cycles",
      "vc cycles": "Cycles",
      "cycle": "Cycles",
      "cycles": "Cycles",
      "vc train": "Trains",
      "vc trains": "Trains",
      "train": "Trains",
      "trains": "Trains"
    };

    return aliases[key] || CATEGORY_ORDER.find((item) => item.toLowerCase() === key) || "Uncategorized";
  }

  function getCategory(record) {
    const flat = flattenRecord(record);

    const direct = normalizeCategory(
      flat.vehicleClass ||
      flat.vehicle_class ||
      flat.vehicleClassName ||
      flat.vehicle_class_name ||
      flat.className ||
      flat.class_name ||
      flat.class ||
      flat.category ||
      flat.vehicleCategory ||
      flat.vehicle_category ||
      flat.vehicleType ||
      flat.vehicle_type ||
      flat.type
    );

    if (direct !== "Uncategorized") return direct;

    const text = [
      flat.modelName,
      flat.model_name,
      flat.model,
      flat.spawnName,
      flat.spawn_name,
      flat.handlingId,
      flat.handling_id,
      flat.handlingName,
      flat.handling_name,
      flat.displayName,
      flat.display_name,
      flat.vehicleName,
      flat.vehicle_name
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
    if (/bati|akuma|daemon|double|hexer|nemesis|pcj|ruffian|sanchez|vader|wolfsbane|zombie/.test(text)) return "Motorcycles";
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

  function collectRecords(data) {
    const records = [];
    const seen = new Set();

    function visit(value, depth = 0) {
      if (!value || depth > 7) return;

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, depth + 1));
        return;
      }

      if (typeof value !== "object") return;

      const model = getModel(value);

      if (model && !seen.has(model)) {
        seen.add(model);
        records.push(value);
      }

      Object.values(value).forEach((child) => {
        if (child && typeof child === "object") {
          visit(child, depth + 1);
        }
      });
    }

    visit(data);
    return records;
  }

  async function tryFetchJson(url) {
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function loadVehiclePayloads() {
    const payloads = [];

    if (window.vehicleCloud) {
      for (const fn of ["getLibraryData", "getVehicles", "listVehicles", "getAllVehicles"]) {
        if (typeof window.vehicleCloud[fn] !== "function") continue;

        try {
          const result = await window.vehicleCloud[fn]([]);
          if (result) payloads.push(result);
        } catch (error) {
          console.warn("vehicleCloud." + fn + " failed", error);
        }
      }
    }

    for (const url of [
      "/api/vehicles?workspaceId=default",
      "/api/vehicles",
      "/api/vehicle-library?workspaceId=default",
      "/api/vehicle-library",
      "/api/vehicle-metadata?workspaceId=default",
      "/api/vehicle-metadata"
    ]) {
      const result = await tryFetchJson(url);
      if (result) payloads.push(result);
    }

    return payloads;
  }

  function mergeRecord(record) {
    const flat = flattenRecord(record);
    const model = getModel(flat);
    if (!model) return;

    const existing = cloudVehicles.get(model) || {};
    const imageUrl = getImageUrl(flat) || getImageUrl(existing);

    const merged = {
      ...existing,
      ...flat,
      modelName: model,
      displayName: getDisplayName(flat) || getDisplayName(existing) || model,
      vehicleName: getDisplayName(flat) || getDisplayName(existing) || model,
      gameName: flat.gameName || flat.game_name || existing.gameName || model,
      imageUrl,
      image: imageUrl,
      category: getCategory({ ...existing, ...flat }),
      class: getCategory({ ...existing, ...flat }),
      vehicleClass: getCategory({ ...existing, ...flat })
    };

    cloudVehicles.set(model, merged);

    if (imageUrl) {
      imageMap.set(model, imageUrl);
    }

    window.vehicleMeta = window.vehicleMeta || {};

    window.vehicleMeta[model] = {
      ...(window.vehicleMeta[model] || {}),
      ...merged,
      custom: {
        ...(window.vehicleMeta[model]?.custom || {}),
        imageUrl
      }
    };

    try {
      if (typeof vehicleMeta !== "undefined") {
        vehicleMeta[model] = {
          ...(vehicleMeta[model] || {}),
          ...window.vehicleMeta[model]
        };
      }
    } catch {}
  }

  async function loadCloudLibrary() {
    const payloads = await loadVehiclePayloads();

    payloads
      .flatMap(collectRecords)
      .forEach(mergeRecord);

    const status = document.getElementById("metaStatus");
    if (status) {
      status.innerHTML = `<span style="color:#5ee38a">Cloud vehicle library loaded into PopGroups: ${cloudVehicles.size} vehicles</span>`;
    }

    renderSidebar();
    refreshLegacyMainCards();

    setTimeout(refreshLegacyMainCards, 300);
    setTimeout(refreshLegacyMainCards, 1200);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function vehicleSearchText(vehicle) {
    return [
      vehicle.modelName,
      vehicle.displayName,
      vehicle.vehicleName,
      vehicle.gameName,
      vehicle.category,
      vehicle.class,
      vehicle.vehicleClass,
      vehicle.make,
      vehicle.manufacturer,
      vehicle.handlingId,
      vehicle.handlingName,
      vehicle.packName
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function renderSidebar() {
    const target = document.getElementById("vehicleLibrary");
    if (!target) return;

    const query = String(document.getElementById("librarySearchBox")?.value || "").toLowerCase();
    const vehicles = Array.from(cloudVehicles.values())
      .filter((vehicle) => !query || vehicleSearchText(vehicle).includes(query));

    if (!vehicles.length) {
      target.innerHTML = `<div class="pg-empty-state">No cloud vehicles loaded yet.</div>`;
      return;
    }

    const groups = new Map();

    vehicles.forEach((vehicle) => {
      const category = getCategory(vehicle);
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
          .sort((a, b) => String(a.modelName).localeCompare(String(b.modelName)))
          .map((vehicle) => {
            const imageUrl = getImageUrl(vehicle);
            const model = normalizeModelName(vehicle.modelName);

            return `
              <article class="pg-sidebar-vehicle-card" draggable="true" data-model="${escapeHtml(model)}">
                ${imageUrl
                  ? `<img class="pg-sidebar-vehicle-img" src="${escapeHtml(imageUrl)}" alt="">`
                  : `<div class="pg-sidebar-vehicle-img pg-sidebar-no-image">No image</div>`}
                <div class="pg-sidebar-vehicle-body">
                  <h4>${escapeHtml(model)}</h4>
                  <p>${escapeHtml(getDisplayName(vehicle))}</p>
                  <p>${escapeHtml(getCategory(vehicle))}</p>
                  <a href="vehicle-details.html?model=${encodeURIComponent(model)}">Details</a>
                </div>
              </article>
            `;
          })
          .join("");

        return `
          <details class="pg-sidebar-category">
            <summary>
              <strong>${escapeHtml(category)}</strong>
              <span>${items.length}</span>
            </summary>
            <div class="pg-sidebar-vehicle-grid">${cards}</div>
          </details>
        `;
      })
      .join("");

    bindSidebarDrag();
  }

  function bindSidebarDrag() {
    document.querySelectorAll(".pg-sidebar-vehicle-card").forEach((card) => {
      card.addEventListener("dragstart", (event) => {
        const model = card.dataset.model || "";

        // popgroups.js's dropCard() reads the module-level `draggedItem`
        // global (declared in state.js), not dataTransfer — dragStartFromLibrary()
        // is the function it expects every library drag to go through.
        if (typeof window.dragStartFromLibrary === "function") {
          window.dragStartFromLibrary(event, model);
        } else {
          try {
            draggedItem = { source: "library", section: "vehicles", modelName: model };
          } catch {}
          event.dataTransfer.effectAllowed = "copy";
        }

        event.dataTransfer.setData("text/plain", model);
        event.dataTransfer.setData("modelName", model);
      });
    });
  }

  function modelFromCard(card) {
    const direct = card.dataset.model || card.dataset.modelName || card.dataset.spawnName || "";
    if (direct) return normalizeModelName(direct);

    const title =
      card.querySelector("h3, h4, .vehicle-title, .library-title")?.textContent ||
      "";

    return normalizeModelName(title);
  }

  function injectImage(card) {
    const model = modelFromCard(card);
    if (!model) return;

    const imageUrl =
      imageMap.get(model) ||
      getImageUrl(cloudVehicles.get(model)) ||
      getImageUrl(window.vehicleMeta?.[model]);

    if (!imageUrl) return;

    const existingImg = card.querySelector("img");
    if (existingImg) {
      existingImg.src = imageUrl;
      return;
    }

    const noImageBox =
      Array.from(card.querySelectorAll("div")).find((node) =>
        /^no image$/i.test(String(node.textContent || "").trim())
      ) ||
      card.querySelector("[class*='image'], [class*='thumb'], [class*='photo']");

    if (noImageBox) {
      noImageBox.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
      noImageBox.classList.add("has-cloud-image");
    }
  }

  function removeUnwantedButtons(root = document) {
    const blocked = new Set([
      "assign active pack",
      "clear pack",
      "find image"
    ]);

    root.querySelectorAll("button, a").forEach((button) => {
      const label = String(button.textContent || "").trim().toLowerCase();

      if (blocked.has(label)) {
        button.remove();
      }
    });
  }

  function addQuickClearButtons() {
    const containers = Array.from(
      document.querySelectorAll("#results details, #results section, #results .group-card, #results .popgroup-card, #results .group")
    ).filter((container) => container.querySelectorAll(".vehicle-card, [class*='vehicle-card']").length > 0);

    containers.forEach((container) => {
      if (container.querySelector(".pg-quick-clear-group")) return;

      const heading =
        container.querySelector("summary, h2, h3, .group-header, .card-header") ||
        container.firstElementChild;

      if (!heading) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "pg-quick-clear-group";
      button.textContent = "Quick Clear";

      button.addEventListener("click", () => {
        const removeButtons = Array.from(container.querySelectorAll("button"))
          .filter((item) => String(item.textContent || "").trim().toLowerCase() === "remove");

        removeButtons.reverse().forEach((item) => item.click());

        setTimeout(refreshLegacyMainCards, 150);
      });

      heading.appendChild(button);
    });
  }

  function refreshLegacyMainCards() {
    document
      .querySelectorAll("#results .vehicle-card, #results [class*='vehicle-card']")
      .forEach(injectImage);

    removeUnwantedButtons(document.getElementById("results") || document);
    addQuickClearButtons();
  }

  function observeMainRender() {
    const target = document.getElementById("results");
    if (!target) return;

    const observer = new MutationObserver(() => {
      refreshLegacyMainCards();
    });

    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }

  const LIBRARY_COLLAPSE_STORAGE_KEY = "pgLibraryPanelExpanded";

  function setLibraryCollapsed(collapsed) {
    const panel = document.getElementById("libraryPanel");
    const layout = document.getElementById("mainLayout");
    const toggle = document.getElementById("libraryCollapseToggle");

    panel?.classList.toggle("pg-library-collapsed", collapsed);
    layout?.classList.toggle("pg-library-collapsed", collapsed);

    if (toggle) {
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.title = collapsed ? "Expand vehicle library" : "Collapse vehicle library";
    }
  }

  function initLibraryCollapse() {
    const toggle = document.getElementById("libraryCollapseToggle");
    if (!toggle) return;

    // Collapsed by default; remembers the user's choice after that.
    const savedExpanded = localStorage.getItem(LIBRARY_COLLAPSE_STORAGE_KEY);
    setLibraryCollapsed(savedExpanded !== "true");

    toggle.addEventListener("click", () => {
      const isCollapsed = document.getElementById("libraryPanel")?.classList.contains("pg-library-collapsed");
      setLibraryCollapsed(!isCollapsed);
      localStorage.setItem(LIBRARY_COLLAPSE_STORAGE_KEY, String(isCollapsed));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("librarySearchBox")?.addEventListener("input", renderSidebar);

    initLibraryCollapse();
    observeMainRender();
    loadCloudLibrary();

    setTimeout(refreshLegacyMainCards, 500);
    setTimeout(refreshLegacyMainCards, 1500);
  });
})();
