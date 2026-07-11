/* POPGROUPS_LEGACY_LIBRARY_BRIDGE_V2 */

(() => {
  // Claim ownership of the #vehicleLibrary sidebar as soon as this script
  // runs (synchronously, before DOMContentLoaded fires) so the legacy
  // renderVehicleLibrary() in render.js -- which several other shared
  // scripts still call (maincloudsync.js, workspacestorage.js, packdatabase.js,
  // imagemanager.js, lodtracker.js, vehiclemeta.js, and app.js's library
  // search box listener) -- never paints its flat/expanded vehicle-meta card
  // layout into this container, even for a single frame. This is what used
  // to cause the sidebar to flash the old ungrouped card view while the
  // page/cloud vehicle list was loading before snapping to the collapsible
  // category list rendered by renderSidebar() below.
  document.getElementById("vehicleLibrary")?.setAttribute("data-library-owner", "cloud-workspace");

  const cloudVehicles = new Map();
  const imageMap = new Map();
  const installedIds = new Set();

  // Sidebar view: 'class' | 'pack'
  let sidebarView = 'class';

  // "Installed" status lives in the browser's local Vehicle Library database
  // (window.vehicleLibraryStore, IndexedDB) - the same place vehicle-library.html
  // and vehicle-details.html read/write it. It is intentionally per-browser/per-PC,
  // not part of the cloud vehicle records this sidebar otherwise renders from.
  async function loadInstalledIds() {
    const store = window.vehicleLibraryStore;
    if (!store) return;

    try {
      const vehicles = await store.getVehicles();
      installedIds.clear();
      vehicles.forEach((vehicle) => {
        const id = vehicle.id || String(vehicle.modelName || "").toLowerCase();
        if (vehicle?.custom?.installed === true || window.GTAVanillaModels?.has(id)) {
          installedIds.add(id);
        }
      });
    } catch (error) {
      console.warn("Could not load installed vehicle status from the local library.", error);
    }
  }

  async function toggleInstalledFromSidebar(checkbox) {
    const store = window.vehicleLibraryStore;
    const model = checkbox.dataset.model || "";
    if (!store || !model) return;

    const id = store.normalizeId(model);
    const wantInstalled = checkbox.checked;
    checkbox.disabled = true;

    try {
      const vehicles = await store.getVehicles();
      let vehicle = vehicles.find((item) => item.id === id);

      if (!vehicle) {
        // Not yet in the local Vehicle Library (it hasn't been imported there) -
        // create a minimal local record so the installed toggle still works.
        const cloudRecord = cloudVehicles.get(model) || {};
        vehicle = {
          id,
          modelName: model,
          gameName: cloudRecord.gameName || model,
          custom: {},
          createdAt: new Date().toISOString()
        };
      }

      vehicle.custom = vehicle.custom || {};
      vehicle.custom.installed = wantInstalled;
      vehicle.custom.installDate = wantInstalled
        ? (vehicle.custom.installDate || new Date().toISOString().slice(0, 10))
        : "";
      vehicle.updatedAt = new Date().toISOString();

      await store.putVehicles([vehicle]);

      if (wantInstalled) installedIds.add(id);
      else installedIds.delete(id);
    } catch (error) {
      console.error("Could not update installed status.", error);
      checkbox.checked = !wantInstalled;
    } finally {
      checkbox.disabled = false;
    }
  }

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
      "vehicle",
      "vehiclesMeta",
      "vehicles_meta"
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

    const resolvedCat = getCategory({ ...existing, ...flat });

    const merged = {
      ...existing,
      ...flat,
      modelName: model,
      displayName: getDisplayName(flat) || getDisplayName(existing) || model,
      vehicleName: getDisplayName(flat) || getDisplayName(existing) || model,
      gameName: flat.gameName || flat.game_name || existing.gameName || model,
      imageUrl,
      image: imageUrl,
      // Normalise pack name — vehicles.meta importer stores it as sourcePack
      // on the custom sub-object which flattenRecord spreads up to the top level.
      sourcePack: flat.sourcePack || flat.packName || existing.sourcePack || existing.packName || '',
      packName:   flat.sourcePack || flat.packName || existing.sourcePack || existing.packName || '',
    };

    // Only stamp category fields when we resolved a real class.
    // Setting them to "Uncategorized" makes every placeholder pass the sidebar
    // filter (truthy string), causing 400+ vehicles to flood the Uncategorized bucket.
    if (resolvedCat !== "Uncategorized") {
      merged.category    = resolvedCat;
      merged.class       = resolvedCat;
      merged.vehicleClass = resolvedCat;
    } else {
      // Scrub any stale "Uncategorized" string left by a previous merge pass
      // so the sidebar filter correctly excludes unimported records.
      if (merged.category    === "Uncategorized") delete merged.category;
      if (merged.class       === "Uncategorized") delete merged.class;
      if (merged.vehicleClass === "Uncategorized") delete merged.vehicleClass;
    }

    cloudVehicles.set(model, merged);

    if (imageUrl) {
      imageMap.set(model, imageUrl);
    }

    window.vehicleMeta = window.vehicleMeta || {};

    // Prefer existing non-null traffic values over null D1 values.
    // D1 may return null for these fields if the vehicle was never synced
    // from a local meta drop — we should never let that null clobber a
    // valid value the user already has in memory from a file drop.
    const TRAFFIC_FIELDS = ["frequency", "maxNum", "identicalModelSpawnDistance", "maxNumOfSameColor"];
    const prevMeta = window.vehicleMeta[model] || {};

    window.vehicleMeta[model] = {
      ...prevMeta,
      ...merged,
      // Restore any traffic field where local had a real value and D1 has null/undefined
      ...Object.fromEntries(
        TRAFFIC_FIELDS
          .filter(f => prevMeta[f] !== null && prevMeta[f] !== undefined)
          .map(f => [f, prevMeta[f]])
      ),
      custom: {
        ...(prevMeta.custom || {}),
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

    console.log(`[PopGroups] Cloud vehicle library loaded: ${cloudVehicles.size} vehicles`);

    renderSidebar();

    // Re-render main vehicle cards so they pick up vehicleMeta values (traffic
    // fields, meta match status) that weren't available when the workspace was
    // first restored from localStorage. refreshLegacyMainCards() only injects
    // images into already-rendered cards, so we need a full renderSection() pass.
    if (typeof renderSection === "function" && typeof currentSection !== "undefined") {
      renderSection(currentSection);
    }

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
      vehicle.packName,
      vehicle.sourcePack
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function buildVehicleCard(vehicle) {
    const imageUrl = getImageUrl(vehicle);
    const model = normalizeModelName(vehicle.modelName);
    const modelId = model.toLowerCase();
    const installed = installedIds.has(modelId) || installedIds.has(model) || window.GTAVanillaModels?.has(modelId);
    return `
      <article class="pg-sidebar-vehicle-card" draggable="true" data-model="${escapeHtml(model)}">
        ${imageUrl
          ? `<img class="pg-sidebar-vehicle-img" src="${escapeHtml(imageUrl)}" alt="">`
          : `<div class="pg-sidebar-vehicle-img pg-sidebar-no-image">No image</div>`}
        <div class="pg-sidebar-vehicle-body">
          <h4>${escapeHtml(model)}</h4>
          <p>${escapeHtml(getDisplayName(vehicle))}</p>
          <p>${escapeHtml(getCategory(vehicle))}</p>
          <span class="pg-sidebar-installed-badge${installed ? " active" : ""}">Installed</span>
          <a href="vehicle-details.html?model=${encodeURIComponent(model)}">Details</a>
        </div>
      </article>`;
  }

  function renderSidebar() {
    const target = document.getElementById("vehicleLibrary");
    if (!target) return;

    const query = String(document.getElementById("librarySearchBox")?.value || "").toLowerCase();
    const vehicles = Array.from(cloudVehicles.values())
      // Show vehicles that have class data from a vehicles.meta import OR that
      // have been assigned to a pack via Bulk Assign — pack-assigned vehicles are
      // legitimately imported even if their vehicleClass wasn't captured.
      .filter((vehicle) =>
        vehicle.vehicleClass || vehicle.className || vehicle.class ||
        vehicle.category    || vehicle.vehicleCategory ||
        vehicle.vehicleType || vehicle.type ||
        vehicle.sourcePack  || vehicle.packName
      )
      .filter((vehicle) => !query || vehicleSearchText(vehicle).includes(query));

    if (!vehicles.length) {
      target.innerHTML = `<div class="pg-empty-state">No cloud vehicles loaded yet.</div>`;
      return;
    }

    // ── By Pack view ────────────────────────────────────────────────────────
    if (sidebarView === 'pack') {
      const packVehicles = vehicles.filter(v => v.sourcePack || v.packName);
      if (!packVehicles.length) {
        target.innerHTML = `<div class="pg-empty-state">No packs assigned yet.<br><small>Use <strong>Bulk Assign Pack</strong> in the Vehicle Library to tag vehicles with a pack name.</small></div>`;
        return;
      }
      const packGroups = new Map();
      packVehicles.forEach(v => {
        const pack = v.sourcePack || v.packName;
        if (!packGroups.has(pack)) packGroups.set(pack, []);
        packGroups.get(pack).push(v);
      });
      target.innerHTML = Array.from(packGroups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([pack, items]) => {
          const cards = items
            .sort((a, b) => String(a.modelName).localeCompare(String(b.modelName)))
            .map(vehicle => buildVehicleCard(vehicle))
            .join('');
          return `
            <details class="pg-sidebar-category" open>
              <summary>
                <strong>📦 ${escapeHtml(pack)}</strong>
                <span>${items.length}</span>
              </summary>
              <div class="pg-sidebar-vehicle-grid">${cards}</div>
            </details>`;
        })
        .join('');
      bindSidebarDrag();
      return;
    }

    // ── By Class view (default) ─────────────────────────────────────────────
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
          .map((vehicle) => buildVehicleCard(vehicle))
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

  function initLibraryViewToggle() {
    const byClass = document.getElementById('libViewByClass');
    const byPack  = document.getElementById('libViewByPack');
    if (!byClass || !byPack) return;
    byClass.addEventListener('click', () => {
      sidebarView = 'class';
      byClass.classList.add('active');
      byPack.classList.remove('active');
      renderSidebar();
    });
    byPack.addEventListener('click', () => {
      sidebarView = 'pack';
      byPack.classList.add('active');
      byClass.classList.remove('active');
      renderSidebar();
    });
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

    document.querySelectorAll(".pg-installed-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", () => toggleInstalledFromSidebar(checkbox));
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

    const placeholder = card.querySelector(".pg-sidebar-no-image, .no-image, [class*='no-image']");
    if (placeholder) {
      const img = document.createElement("img");
      img.className = placeholder.className.replace(/no-image[^ ]*/g, "").trim() || "pg-sidebar-vehicle-img";
      img.src = imageUrl;
      img.alt = "";
      placeholder.replaceWith(img);
    }
  }

  function removeUnwantedButtons(root) {
    const blocked = new Set(["edit", "delete", "remove"]);
    root.querySelectorAll("button, a").forEach((button) => {
      const label = String(button.textContent || "").trim().toLowerCase();
      if (blocked.has(label)) button.remove();
    });
  }

  function refreshLegacyMainCards() {
    document
      .querySelectorAll("#results .vehicle-card, #results [class*='vehicle-card']")
      .forEach(injectImage);
    removeUnwantedButtons(document.getElementById("results") || document);
  }

  function observeMainRender() {
    const target = document.getElementById("results");
    if (!target) return;
    const observer = new MutationObserver(() => { refreshLegacyMainCards(); });
    observer.observe(target, { childList: true, subtree: true });
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
    initLibraryViewToggle();
    observeMainRender();
    loadCloudLibrary();
    loadInstalledIds().then(renderSidebar);
    setTimeout(refreshLegacyMainCards, 500);
    setTimeout(refreshLegacyMainCards, 1500);
  });
})();
