// =====================================================
// [MODULE: POPCYCLE_VISUAL_AREA_MAP]
// Interactive visual map system for the Popcycle Editor.
//
// 2026-07-06: Simplified to a single shared reference map
// (assets/area-maps/gta5map2-1600.jpg) instead of the old
// multi-layer transform-matrix system. Area pins are plain
// pixel coordinates on that one image. Added "Edit Positions"
// mode so a marker can be dragged into a better spot by hand
// (auto-calibrated positions from real popcycle coordinates
// are a close starting point, not pixel-perfect against a
// hand-drawn community map). Adjusted positions save to this
// browser's local storage immediately and can be exported as
// JSON to fold back into popcycleareamapdata.js permanently.
//
// Features:
// - Mouse-wheel and button zoom, click-and-drag panning
// - Schedule markers that select the matching left-column item
// - Manual schedule-to-area overrides through the dropdown
// - Edit Positions: drag any marker to correct its spot, or click
//   empty map space to add a brand new custom-named dot
// - Draw Outline: trace a highlight shape over a neighborhood's
//   visible border for the selected schedule
// - Export Positions: download adjusted coordinates, custom dots,
//   and outlines as JSON
// - Saved zoom/pan, marker-position, and outline state
// =====================================================

const POPCYCLE_AREA_KEY_OVERRIDES = {
  MORNING_WOOD: "MORNINGWOOD",
  PORT_OF_LOS_SANTOS: "PORT",
  TERMINAL: "PORT",
  VESPUCCI_BEACH_PROM: "VESPUCCI",
  VESPUCCI_PIER: "VESPUCCI",
  VESPUCCI_BEACH_BEACH: "VESPUCCI",
  ROCKFORD_HILLS_SHOPPING: "ROCKFORD_HILLS",
  ROCKFORD_HILLS_RESIDENTIAL: "ROCKFORD_HILLS",
  RICH_MAN: "RICHMAN",
  RICHMAN_GLEN: "RICHMAN",
  VINE_WOOD: "VINEWOOD",
  WEST_VINEWOOD: "VINEWOOD",
  LOS_SANTOS_INTERNATIONAL: "LSIA",
  LOS_PUERTA: "LA_PUERTA",
  DEL_PERRO_BEACH: "DEL_PERRO",
  DEL_PERRO_PROM: "DEL_PERRO",
  DOWNTOWN_VINEWOOD: "VINEWOOD",
  EAST_LOS_SANTOS: "LA_MESA",
  CHUMASH: "NORTH_CHUMASH"
};

const POPCYCLE_MARKER_OVERRIDES_KEY = "gtaTrafficPopcycleMarkerOverrides_v1";
const POPCYCLE_CUSTOM_MARKERS_KEY = "gtaTrafficPopcycleCustomMarkers_v1";
const POPCYCLE_AREA_OUTLINES_KEY = "gtaTrafficPopcycleAreaOutlines_v1";
const POPCYCLE_MAP_STYLE_KEY = "gtaTrafficPopcycleMapStyle_v1";

const popcycleAreaMapState = {
  areas: [],
  layers: [],
  layersById: {},
  images: {},
  imageReady: {},
  markerOverrides: {},
  areaOutlines: {},
  editMode: false,
  outlineDraft: null,
  selectedAreaId: "",
  lastAutoFocusedAreaId: "",
  currentMatchType: "none",
  actualLayerId: "full",
  lastRender: null,
  drag: {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    moved: false,
    marker: null,
    markerMoved: false
  },
  drawRequest: null,
  workspaceSaveTimer: null
};

// =====================================================
// [SECTION: VISUAL_MAP_INITIALIZATION]
// Loads map configuration, images, dropdown options, and
// pointer/wheel/fullscreen listeners.
// =====================================================

function initializePopcycleAreaMap() {
  const areaData =
    window.GTATrafficAreaMapData || {};

  const visualConfig =
    window.GTATrafficVisualMapConfig || {};

  popcycleAreaMapState.areas =
    Array.isArray(areaData.areas)
      ? areaData.areas
      : [];

  popcycleAreaMapState.layers =
    Array.isArray(visualConfig.layers)
      ? visualConfig.layers
      : [];

  popcycleAreaMapState.layersById =
    Object.fromEntries(
      popcycleAreaMapState.layers.map(layer => [
        layer.id,
        layer
      ])
    );

  loadMarkerOverridesFromStorage();
  loadCustomMarkersFromStorage();
  loadAreaOutlinesFromStorage();
  loadMapStyleFromStorage();
  ensurePopcycleMapState();
  populatePopcycleAreaSelect();
  renderPopcycleMapToolButtons();
  renderPopcycleMapStyleButtons();
  bindPopcycleMapEvents();
  loadPopcycleMapImages();
}

function ensurePopcycleMapState() {
  if (!popcycleState.mapLayer) {
    popcycleState.mapLayer =
      window.GTATrafficVisualMapConfig
        ?.defaultLayer || "full";
  }

  if (!popcycleState.mapViews) {
    popcycleState.mapViews = {};
  }

  popcycleAreaMapState.layers.forEach(layer => {
    if (!popcycleState.mapViews[layer.id]) {
      popcycleState.mapViews[layer.id] = {
        zoom: 1,
        panX: 0,
        panY: 0
      };
    }
  });
}

function loadPopcycleMapImages() {
  popcycleAreaMapState.layers.forEach(layer => {
    if (!layer.source) return;

    const image = new Image();

    image.onload = () => {
      // Trust the real loaded image size over the config's guess, so
      // pins/outlines scale correctly onto this layer even if its
      // actual pixel dimensions differ from what's in the config.
      layer.width = image.naturalWidth || layer.width;
      layer.height = image.naturalHeight || layer.height;

      popcycleAreaMapState.images[layer.id] = image;
      popcycleAreaMapState.imageReady[layer.id] = true;
      requestPopcycleMapDraw();
    };

    image.onerror = () => {
      popcycleAreaMapState.imageReady[layer.id] = false;
      console.error(
        `Could not load Popcycle map layer: ${layer.source}`
      );
      requestPopcycleMapDraw();
    };

    image.src = layer.source;
  });
}

// =====================================================
// [SECTION: MAP_STYLE_SWITCHER]
// Lets the user swap the map's background image between the
// configured layers (Atlas / Road Map / Satellite, etc.) without
// touching any schedule pin, custom dot, or outline data - all of
// that lives in one shared reference coordinate space (see
// popcyclevisualmapconfig.js) and is simply rescaled onto
// whichever image is currently showing.
// =====================================================

function getPopcycleReferenceDims() {
  const config = window.GTATrafficVisualMapConfig || {};
  return {
    width: config.referenceWidth || 1600,
    height: config.referenceHeight || 1600
  };
}

function getLayerScale(layer) {
  if (!layer) return { x: 1, y: 1 };

  const ref = getPopcycleReferenceDims();

  return {
    x: (layer.width || ref.width) / ref.width,
    y: (layer.height || ref.height) / ref.height
  };
}

function loadMapStyleFromStorage() {
  let savedId = "";

  try {
    savedId = localStorage.getItem(POPCYCLE_MAP_STYLE_KEY) || "";
  } catch (error) {
    savedId = "";
  }

  const validId =
    savedId &&
    popcycleAreaMapState.layers.some(layer => layer.id === savedId)
      ? savedId
      : (window.GTATrafficVisualMapConfig?.defaultLayer ||
          popcycleAreaMapState.layers[0]?.id ||
          "full");

  popcycleAreaMapState.actualLayerId = validId;

  if (popcycleState) {
    popcycleState.mapLayer = validId;
  }
}

function saveMapStyleToStorage(layerId) {
  try {
    localStorage.setItem(POPCYCLE_MAP_STYLE_KEY, layerId);
  } catch (error) {
    console.warn("Could not save map style choice.", error);
  }
}

function switchPopcycleMapLayer(layerId) {
  if (!popcycleAreaMapState.layersById[layerId]) return;
  if (popcycleAreaMapState.actualLayerId === layerId) return;

  popcycleAreaMapState.actualLayerId = layerId;
  popcycleState.mapLayer = layerId;

  saveMapStyleToStorage(layerId);
  ensurePopcycleMapState();
  renderPopcycleMapStyleButtons();
  requestPopcycleMapDraw();
  schedulePopcycleWorkspaceSave?.();
}

function renderPopcycleMapStyleButtons() {
  const host = document.getElementById("popcycleMapStyleButtons");
  if (!host) return;

  host.innerHTML = popcycleAreaMapState.layers
    .map(layer => `
      <button
        type="button"
        class="pc-map-layer-button ${layer.id === popcycleAreaMapState.actualLayerId ? "active" : ""}"
        onclick="switchPopcycleMapLayer('${layer.id}')"
        title="${layer.description ? layer.description.replace(/"/g, "&quot;") : ""}"
      >
        ${layer.shortTitle || layer.title || layer.id}
      </button>
    `)
    .join("");
}

// [END SECTION: MAP_STYLE_SWITCHER]

function bindPopcycleMapEvents() {
  const canvas =
    document.getElementById(
      "popcycleVisualMapCanvas"
    );

  const shell =
    document.getElementById(
      "popcycleVisualMapShell"
    );

  if (!canvas) return;

  canvas.addEventListener(
    "wheel",
    handlePopcycleMapWheel,
    { passive: false }
  );

  canvas.addEventListener(
    "pointerdown",
    handlePopcycleMapPointerDown
  );

  canvas.addEventListener(
    "pointermove",
    handlePopcycleMapPointerMove
  );

  canvas.addEventListener(
    "pointerup",
    handlePopcycleMapPointerUp
  );

  canvas.addEventListener(
    "pointercancel",
    handlePopcycleMapPointerUp
  );

  canvas.addEventListener(
    "dblclick",
    event => {
      event.preventDefault();
      zoomPopcycleMap(1.35, event);
    }
  );

  window.addEventListener(
    "resize",
    requestPopcycleMapDraw
  );

  document.addEventListener(
    "fullscreenchange",
    () => {
      shell?.classList.toggle(
        "is-fullscreen",
        document.fullscreenElement === shell
      );

      requestPopcycleMapDraw();
    }
  );
}

// [END SECTION: VISUAL_MAP_INITIALIZATION]

// =====================================================
// [SECTION: MARKER_POSITION_OVERRIDES]
// Lets a marker be dragged to a better spot by hand. Saved to
// this browser's local storage immediately, and exportable as
// JSON so the adjusted positions can be committed permanently.
// =====================================================

function loadMarkerOverridesFromStorage() {
  try {
    const raw = localStorage.getItem(POPCYCLE_MARKER_OVERRIDES_KEY);
    popcycleAreaMapState.markerOverrides = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Could not load saved marker positions.", error);
    popcycleAreaMapState.markerOverrides = {};
  }
}

function saveMarkerOverridesToStorage() {
  try {
    localStorage.setItem(
      POPCYCLE_MARKER_OVERRIDES_KEY,
      JSON.stringify(popcycleAreaMapState.markerOverrides)
    );
  } catch (error) {
    console.warn("Could not save marker positions.", error);
  }
}

function toggleMapEditPositions() {
  popcycleAreaMapState.editMode = !popcycleAreaMapState.editMode;

  if (!popcycleAreaMapState.editMode) {
    cancelOutlineDraft();
  }

  renderPopcycleMapToolButtons();
  requestPopcycleMapDraw();

  const canvas = document.getElementById("popcycleVisualMapCanvas");
  if (canvas) {
    canvas.style.cursor = popcycleAreaMapState.editMode ? "grab" : "";
  }
}

function resetAllMarkerPositions() {
  if (!confirm("Reset every marker back to its calculated default position? This clears all manual adjustments saved in this browser.")) {
    return;
  }
  popcycleAreaMapState.markerOverrides = {};
  saveMarkerOverridesToStorage();
  requestPopcycleMapDraw();
  renderPopcycleWorkspaceStatus?.("All marker positions reset to defaults.");
}

function exportPopcycleMapPositions() {
  const overrides = popcycleAreaMapState.markerOverrides || {};
  const overrideCount = Object.keys(overrides).length;
  const customCount = popcycleAreaMapState.areas.filter(a => a.custom).length;
  const outlineCount = Object.keys(popcycleAreaMapState.areaOutlines || {}).length;

  if (!overrideCount && !customCount && !outlineCount) {
    alert("Nothing to export yet. Drag a marker, add a custom dot, or draw an outline in Edit Positions mode first.");
    return;
  }

  const areasWithPositions = popcycleAreaMapState.areas.map(area => ({
    id: area.id,
    name: area.name,
    custom: Boolean(area.custom),
    popcycle: area.popcycle || [],
    pin: overrides[area.id]
      ? [Math.round(overrides[area.id][0] * 100) / 100, Math.round(overrides[area.id][1] * 100) / 100]
      : area.pin,
    adjusted: Boolean(overrides[area.id]),
    outline: popcycleAreaMapState.areaOutlines[area.id] || null
  }));

  const payload = {
    format: "gta-traffic-popcycle-map-positions",
    exportedAt: new Date().toISOString(),
    referenceImage: popcycleAreaMapState.layers[0]?.source || "",
    adjustedCount: overrideCount,
    customDotCount: customCount,
    outlineCount,
    areas: areasWithPositions
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `popcycle_map_positions_${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);

  renderPopcycleWorkspaceStatus?.(
    `Exported ${overrideCount} adjusted position${overrideCount === 1 ? "" : "s"}, ${customCount} custom dot${customCount === 1 ? "" : "s"}, ${outlineCount} outline${outlineCount === 1 ? "" : "s"}.`
  );
}

// Opens a file picker and applies a previously exported positions JSON
// (from exportPopcycleMapPositions above) onto this browser's map data.
// NOTE: this is a plain client-side import for now - anyone with the map
// open can use it. Planned: gate this behind an admin-only check before
// it's exposed on the public site.
function importPopcycleMapPositions() {
  let input = document.getElementById("popcyclePositionsImportInput");

  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.id = "popcyclePositionsImportInput";
    input.style.display = "none";
    input.addEventListener("change", handlePopcycleImportFileChosen);
    document.body.appendChild(input);
  }

  input.value = "";
  input.click();
}

function handlePopcycleImportFileChosen(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      applyImportedPopcycleMapPositions(
        JSON.parse(reader.result)
      );
    } catch (error) {
      console.warn("Could not import map positions.", error);
      alert("That file couldn't be read as a map positions export. Make sure it's an unmodified JSON file from the Export Positions button.");
    }
  };

  reader.onerror = () => {
    alert("Could not read that file.");
  };

  reader.readAsText(file);
}

function applyImportedPopcycleMapPositions(payload) {
  if (!payload || payload.format !== "gta-traffic-popcycle-map-positions" || !Array.isArray(payload.areas)) {
    alert("That file doesn't look like a Popcycle map positions export.");
    return;
  }

  let appliedOverrides = 0;
  let appliedCustom = 0;
  let appliedOutlines = 0;

  payload.areas.forEach(entry => {
    if (!entry || !entry.id) return;

    const existing = popcycleAreaMapState.areas.find(a => a.id === entry.id);

    if (entry.custom && !existing) {
      popcycleAreaMapState.areas.push({
        id: entry.id,
        name: entry.name || entry.id,
        county: "Custom",
        category: "Custom Marker",
        map: "full",
        custom: true,
        pin: Array.isArray(entry.pin) ? entry.pin : [0, 0],
        popcycle: entry.popcycle || [],
        popgroups: [],
        landmarks: [],
        notes: "Custom marker imported from a positions export file."
      });
      appliedCustom++;
    } else if (entry.custom && existing) {
      if (Array.isArray(entry.pin)) existing.pin = entry.pin;
      appliedCustom++;
    } else if (entry.adjusted && Array.isArray(entry.pin) && existing) {
      popcycleAreaMapState.markerOverrides[entry.id] = entry.pin;
      appliedOverrides++;
    }

    if (Array.isArray(entry.outline) && entry.outline.length >= 3) {
      popcycleAreaMapState.areaOutlines[entry.id] = entry.outline;
      appliedOutlines++;
    }
  });

  saveMarkerOverridesToStorage();
  saveCustomMarkersToStorage();
  saveAreaOutlinesToStorage();
  populatePopcycleAreaSelect();
  renderPopcycleMapToolButtons();
  requestPopcycleMapDraw();

  renderPopcycleWorkspaceStatus?.(
    `Imported ${appliedOverrides} adjusted position${appliedOverrides === 1 ? "" : "s"}, ${appliedCustom} custom dot${appliedCustom === 1 ? "" : "s"}, ${appliedOutlines} outline${appliedOutlines === 1 ? "" : "s"}.`
  );

  alert(`Import complete: ${appliedOverrides} position(s), ${appliedCustom} custom dot(s), ${appliedOutlines} outline(s) applied.`);
}

// [END SECTION: MARKER_POSITION_OVERRIDES]

// =====================================================
// [SECTION: CUSTOM_MARKERS]
// Lets a brand new labeled dot be dropped anywhere on the map
// in Edit Positions mode (click empty space, away from any
// existing marker). Custom dots behave exactly like the
// computed ones - draggable, clickable, and they'll select a
// schedule automatically if their label matches one.
// =====================================================

function loadCustomMarkersFromStorage() {
  let customAreas = [];
  try {
    const raw = localStorage.getItem(POPCYCLE_CUSTOM_MARKERS_KEY);
    customAreas = raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Could not load saved custom markers.", error);
    customAreas = [];
  }

  // Remove any custom areas from a previous load (e.g. hot reload) before re-adding.
  popcycleAreaMapState.areas = popcycleAreaMapState.areas.filter(a => !a.custom);
  popcycleAreaMapState.areas.push(...customAreas);
}

function saveCustomMarkersToStorage() {
  const customAreas = popcycleAreaMapState.areas.filter(a => a.custom);
  try {
    localStorage.setItem(POPCYCLE_CUSTOM_MARKERS_KEY, JSON.stringify(customAreas));
  } catch (error) {
    console.warn("Could not save custom markers.", error);
  }
}

function slugifyPopcycleCustomId(label) {
  const base = normalizePopcycleAreaKey(label) || "CUSTOM";
  let id = `CUSTOM_${base}`;
  let suffix = 2;
  const existingIds = new Set(popcycleAreaMapState.areas.map(a => a.id));
  while (existingIds.has(id)) {
    id = `CUSTOM_${base}_${suffix++}`;
  }
  return id;
}

function addCustomMarkerAt(x, y) {
  const label = prompt("Name for this new marker (matches a schedule name if it lines up):");
  if (!label || !label.trim()) return;

  const trimmed = label.trim();

  const newArea = {
    id: slugifyPopcycleCustomId(trimmed),
    name: trimmed,
    county: "Custom",
    category: "Custom Marker",
    map: "full",
    custom: true,
    pin: [Math.round(x * 100) / 100, Math.round(y * 100) / 100],
    popcycle: [trimmed],
    popgroups: [],
    landmarks: [],
    notes: "Custom marker added from the map's Edit Positions mode."
  };

  popcycleAreaMapState.areas.push(newArea);
  saveCustomMarkersToStorage();
  populatePopcycleAreaSelect();
  renderPopcycleMapToolButtons();
  requestPopcycleMapDraw();
  renderPopcycleWorkspaceStatus?.(`Added custom marker "${trimmed}".`);
}

function removeCustomMarker(areaId) {
  popcycleAreaMapState.areas = popcycleAreaMapState.areas.filter(a => a.id !== areaId);
  delete popcycleAreaMapState.markerOverrides[areaId];
  delete popcycleAreaMapState.areaOutlines[areaId];
  saveCustomMarkersToStorage();
  saveMarkerOverridesToStorage();
  saveAreaOutlinesToStorage();
  populatePopcycleAreaSelect();
  requestPopcycleMapDraw();
}

// [END SECTION: CUSTOM_MARKERS]

// =====================================================
// [SECTION: AREA_OUTLINES]
// Lets the user trace a polygon over a neighborhood's visible
// border on the map for the currently selected schedule. Shown
// as a highlighted overlay whenever that schedule is selected.
// =====================================================

function loadAreaOutlinesFromStorage() {
  try {
    const raw = localStorage.getItem(POPCYCLE_AREA_OUTLINES_KEY);
    popcycleAreaMapState.areaOutlines = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Could not load saved area outlines.", error);
    popcycleAreaMapState.areaOutlines = {};
  }
}

function saveAreaOutlinesToStorage() {
  try {
    localStorage.setItem(
      POPCYCLE_AREA_OUTLINES_KEY,
      JSON.stringify(popcycleAreaMapState.areaOutlines)
    );
  } catch (error) {
    console.warn("Could not save area outlines.", error);
  }
}

function toggleOutlineDrawing() {
  if (popcycleAreaMapState.outlineDraft) {
    cancelOutlineDraft();
    return;
  }

  const area = getSelectedPopcycleArea();
  if (!area) {
    alert("Select a schedule with a mapped area first, then draw its outline.");
    return;
  }

  popcycleAreaMapState.outlineDraft = { areaId: area.id, points: [] };
  renderPopcycleMapToolButtons();
  requestPopcycleMapDraw();
}

function cancelOutlineDraft() {
  if (!popcycleAreaMapState.outlineDraft) return;
  popcycleAreaMapState.outlineDraft = null;
  renderPopcycleMapToolButtons();
  requestPopcycleMapDraw();
}

function finishOutlineDraft() {
  const draft = popcycleAreaMapState.outlineDraft;
  if (!draft) return;

  if (draft.points.length < 3) {
    alert("Click at least 3 points along the border before finishing the outline.");
    return;
  }

  popcycleAreaMapState.areaOutlines[draft.areaId] = draft.points;
  popcycleAreaMapState.outlineDraft = null;
  saveAreaOutlinesToStorage();
  renderPopcycleMapToolButtons();
  requestPopcycleMapDraw();
  renderPopcycleWorkspaceStatus?.("Outline saved for the selected area.");
}

function clearSelectedAreaOutline() {
  const area = getSelectedPopcycleArea();
  if (!area) return;
  delete popcycleAreaMapState.areaOutlines[area.id];
  saveAreaOutlinesToStorage();
  renderPopcycleMapToolButtons();
  requestPopcycleMapDraw();
}

// [END SECTION: AREA_OUTLINES]

// =====================================================
// [SECTION: AREA_NAME_MATCHING]
// Matches Popcycle schedule names to Area Explorer records.
// =====================================================

function normalizePopcycleAreaKey(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/^NET_/, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function getPopcycleAreaAliasIndex() {
  const index = new Map();

  popcycleAreaMapState.areas.forEach(area => {
    const aliases = [
      area.id,
      ...(area.popcycle || [])
    ];

    aliases.forEach(alias => {
      index.set(
        normalizePopcycleAreaKey(alias),
        area
      );
    });
  });

  return index;
}

function findPopcycleAreaMatch(scheduleName) {
  const overrideId =
    popcycleState.areaOverrides
      ?.[scheduleName];

  if (overrideId) {
    const overrideArea =
      popcycleAreaMapState.areas.find(
        area => area.id === overrideId
      );

    if (overrideArea) {
      return {
        area: overrideArea,
        type: "manual"
      };
    }
  }

  const aliasIndex =
    getPopcycleAreaAliasIndex();

  const originalKey =
    normalizePopcycleAreaKey(
      scheduleName
    );

  const mappedKey =
    POPCYCLE_AREA_KEY_OVERRIDES[
      originalKey
    ] || originalKey;

  const exact =
    aliasIndex.get(mappedKey);

  if (exact) {
    return {
      area: exact,
      type:
        mappedKey === originalKey
          ? "exact"
          : "related"
    };
  }

  const prefixMatches = [];

  aliasIndex.forEach((area, aliasKey) => {
    if (
      aliasKey.length >= 5 &&
      (
        mappedKey.startsWith(
          `${aliasKey}_`
        ) ||
        aliasKey.startsWith(
          `${mappedKey}_`
        )
      )
    ) {
      prefixMatches.push({
        area,
        aliasLength: aliasKey.length
      });
    }
  });

  prefixMatches.sort(
    (a, b) =>
      b.aliasLength -
      a.aliasLength
  );

  if (prefixMatches.length) {
    return {
      area: prefixMatches[0].area,
      type: "related"
    };
  }

  return {
    area: null,
    type: "none"
  };
}

function getSelectedPopcycleArea() {
  return findPopcycleAreaMatch(
    popcycleState.selectedScheduleName
  ).area;
}

// [END SECTION: AREA_NAME_MATCHING]

// =====================================================
// [SECTION: AREA_OVERRIDE_CONTROLS]
// The dropdown remains the only way to manually attach an
// Area Explorer location to a schedule.
// =====================================================

function populatePopcycleAreaSelect() {
  const select =
    document.getElementById(
      "popcycleAreaOverrideSelect"
    );

  if (!select) return;

  const grouped = new Map();

  popcycleAreaMapState.areas
    .slice()
    .sort((a, b) => {
      const categoryCompare =
        a.category.localeCompare(
          b.category
        );

      return categoryCompare ||
        a.name.localeCompare(
          b.name
        );
    })
    .forEach(area => {
      if (!grouped.has(area.category)) {
        grouped.set(
          area.category,
          []
        );
      }

      grouped.get(
        area.category
      ).push(area);
    });

  select.innerHTML =
    '<option value="">Auto-match selected schedule</option>';

  grouped.forEach(
    (categoryAreas, category) => {
      const group =
        document.createElement(
          "optgroup"
        );

      group.label = category;

      categoryAreas.forEach(area => {
        const option =
          document.createElement(
            "option"
          );

        option.value = area.id;
        option.textContent = area.name;
        group.appendChild(option);
      });

      select.appendChild(group);
    }
  );
}

function setPopcycleAreaOverride(areaId) {
  const scheduleName =
    popcycleState.selectedScheduleName;

  if (!scheduleName) return;

  if (!popcycleState.areaOverrides) {
    popcycleState.areaOverrides = {};
  }

  if (areaId) {
    popcycleState.areaOverrides[
      scheduleName
    ] = areaId;
  } else {
    delete popcycleState.areaOverrides[
      scheduleName
    ];
  }

  schedulePopcycleWorkspaceSave?.();
  renderPopcycleAreaMap();
}

function resetPopcycleAreaOverride() {
  setPopcycleAreaOverride("");
}

// [END SECTION: AREA_OVERRIDE_CONTROLS]

// =====================================================
// [SECTION: MAP_LAYER_CONTROLS]
// One shared reference map, plus Edit/Export/Reset tools and
// zoom/pan/fullscreen controls.
// =====================================================

function renderPopcycleMapToolButtons() {
  const host =
    document.getElementById(
      "popcycleMapLayerButtons"
    );

  if (!host) return;

  const overrideCount = Object.keys(popcycleAreaMapState.markerOverrides || {}).length;
  const outlineCount = Object.keys(popcycleAreaMapState.areaOutlines || {}).length;
  const draft = popcycleAreaMapState.outlineDraft;
  const selectedArea = getSelectedPopcycleArea();
  const selectedHasOutline = Boolean(selectedArea && popcycleAreaMapState.areaOutlines[selectedArea.id]);

  host.innerHTML = `
    <button
      type="button"
      class="pc-map-layer-button ${popcycleAreaMapState.editMode ? "active" : ""}"
      onclick="toggleMapEditPositions()"
      title="Drag a marker to correct its position, or click empty map space to add a new labeled dot"
    >
      ${popcycleAreaMapState.editMode ? "✓ Editing Positions" : "✏ Edit Positions"}
    </button>

    ${popcycleAreaMapState.editMode ? `
      <button
        type="button"
        class="pc-map-layer-button ${draft ? "active" : ""}"
        onclick="${draft ? "cancelOutlineDraft" : "toggleOutlineDrawing"}()"
        title="${selectedArea ? "Click points along the neighborhood's border, then Finish Outline" : "Select a mapped schedule first"}"
        ${selectedArea ? "" : "disabled"}
      >
        ${draft ? "✕ Cancel Outline" : "🖉 Draw Outline"}
      </button>

      ${draft ? `
        <button
          type="button"
          class="pc-map-layer-button"
          onclick="finishOutlineDraft()"
          title="Close the shape and save it (need at least 3 points)"
        >
          ✓ Finish Outline (${draft.points.length} pt${draft.points.length === 1 ? "" : "s"})
        </button>
      ` : ""}

      ${!draft && selectedHasOutline ? `
        <button
          type="button"
          class="pc-map-layer-button"
          onclick="clearSelectedAreaOutline()"
          title="Remove the saved outline for the selected schedule"
        >
          🗑 Clear Outline
        </button>
      ` : ""}
    ` : ""}

    <button
      type="button"
      class="pc-map-layer-button"
      onclick="exportPopcycleMapPositions()"
      title="Download adjusted positions, custom dots, and outlines as JSON"
    >
      ⬇ Export Positions${overrideCount || outlineCount ? ` (${overrideCount + outlineCount})` : ""}
    </button>

    <button
      type="button"
      class="pc-map-layer-button"
      onclick="importPopcycleMapPositions()"
      title="Load a previously exported positions JSON file into this map (temporary - admin-only gating planned)"
    >
      ⬆ Import Positions
    </button>

    ${overrideCount ? `
      <button
        type="button"
        class="pc-map-layer-button"
        onclick="resetAllMarkerPositions()"
        title="Clear all manually adjusted marker positions"
      >
        ↺ Reset Adjustments
      </button>
    ` : ""}
  `;
}

function getActualPopcycleMapLayer() {
  return (
    popcycleAreaMapState.layersById[popcycleAreaMapState.actualLayerId] ||
    popcycleAreaMapState.layers[0] ||
    null
  );
}

function getPopcycleMapView(layerId) {
  ensurePopcycleMapState();

  if (!popcycleState.mapViews[layerId]) {
    popcycleState.mapViews[layerId] = {
      zoom: 1,
      panX: 0,
      panY: 0
    };
  }

  return popcycleState.mapViews[layerId];
}

function zoomPopcycleMap(factor, sourceEvent = null) {
  const layer =
    getActualPopcycleMapLayer();

  if (!layer) return;

  const view =
    getPopcycleMapView(layer.id);

  const oldZoom = view.zoom || 1;
  const newZoom = Math.min(
    6,
    Math.max(
      0.65,
      oldZoom * factor
    )
  );

  const canvas =
    document.getElementById(
      "popcycleVisualMapCanvas"
    );

  if (
    sourceEvent &&
    canvas &&
    popcycleAreaMapState.lastRender
  ) {
    const rect =
      canvas.getBoundingClientRect();

    const pointerX =
      sourceEvent.clientX - rect.left;

    const pointerY =
      sourceEvent.clientY - rect.top;

    const render =
      popcycleAreaMapState.lastRender;

    const imageX =
      (pointerX - render.drawX) /
      render.scale;

    const imageY =
      (pointerY - render.drawY) /
      render.scale;

    const fitScale =
      render.fitScale;

    const newScale =
      fitScale * newZoom;

    const centeredX =
      (render.canvasWidth -
        layer.width * newScale) / 2;

    const centeredY =
      (render.canvasHeight -
        layer.height * newScale) / 2;

    view.panX =
      pointerX -
      imageX * newScale -
      centeredX;

    view.panY =
      pointerY -
      imageY * newScale -
      centeredY;
  }

  view.zoom = newZoom;
  requestPopcycleMapDraw();
  schedulePopcycleMapWorkspaceSave();
}

function resetPopcycleMapView() {
  const layer =
    getActualPopcycleMapLayer();

  if (!layer) return;

  popcycleState.mapViews[layer.id] = {
    zoom: 1,
    panX: 0,
    panY: 0
  };

  requestPopcycleMapDraw();
  schedulePopcycleWorkspaceSave?.();
}

function fitPopcycleMap() {
  resetPopcycleMapView();
}

function focusPopcycleMapOnSelected() {
  const area =
    getSelectedPopcycleArea();

  const layer =
    getActualPopcycleMapLayer();

  if (!area || !layer) {
    return;
  }

  const marker =
    getAreaMarkerPosition(area);

  if (!marker) return;

  const canvas =
    document.getElementById(
      "popcycleVisualMapCanvas"
    );

  if (!canvas) return;

  const rect =
    canvas.getBoundingClientRect();

  const view =
    getPopcycleMapView(layer.id);

  const layerScale = getLayerScale(layer);

  view.zoom = 2.25;

  const fitScale = Math.min(
    rect.width / layer.width,
    rect.height / layer.height
  );

  const scale =
    fitScale * view.zoom;

  const centeredX =
    (rect.width -
      layer.width * scale) / 2;

  const centeredY =
    (rect.height -
      layer.height * scale) / 2;

  view.panX =
    rect.width / 2 -
    marker.x * layerScale.x * scale -
    centeredX;

  view.panY =
    rect.height / 2 -
    marker.y * layerScale.y * scale -
    centeredY;

  requestPopcycleMapDraw();
  schedulePopcycleWorkspaceSave?.();
}

async function togglePopcycleMapFullscreen() {
  const shell =
    document.getElementById(
      "popcycleVisualMapShell"
    );

  if (!shell) return;

  try {
    if (document.fullscreenElement === shell) {
      await document.exitFullscreen();
    } else {
      await shell.requestFullscreen();
    }
  } catch (error) {
    console.error(
      "Could not toggle map fullscreen.",
      error
    );
  }
}

function schedulePopcycleMapWorkspaceSave() {
  clearTimeout(
    popcycleAreaMapState.workspaceSaveTimer
  );

  popcycleAreaMapState.workspaceSaveTimer =
    setTimeout(() => {
      schedulePopcycleWorkspaceSave?.();
    }, 300);
}

// [END SECTION: MAP_LAYER_CONTROLS]

// =====================================================
// [SECTION: MAP_RENDERING]
// Renders the map, the selected layer, and schedule markers.
// =====================================================

function renderPopcycleAreaMap() {
  const scheduleName =
    popcycleState.selectedScheduleName;

  const match =
    findPopcycleAreaMatch(
      scheduleName
    );

  const area = match.area;

  popcycleAreaMapState.selectedAreaId =
    area?.id || "";

  popcycleAreaMapState.currentMatchType =
    match.type;

  const layer =
    getActualPopcycleMapLayer();

  popcycleAreaMapState.actualLayerId =
    layer?.id || "full";

  updatePopcycleMapSummary(
    scheduleName,
    area,
    match.type,
    layer
  );

  updatePopcycleAreaOverrideControl(
    scheduleName
  );

  renderPopcycleAreaDetails(
    scheduleName,
    area,
    match.type,
    layer
  );

  renderPopcycleMapToolButtons();
  requestPopcycleMapDraw();
  maybeAutoFocusSelectedArea(area);
}

// Jumps the map to the selected schedule's marker whenever the
// selection actually changes (not on every redraw - e.g. while
// dragging a marker in Edit Positions mode). Uses whatever
// position is current for that area, including manual
// Edit Positions adjustments.
function maybeAutoFocusSelectedArea(area) {
  const areaId = area?.id || "";

  if (areaId === popcycleAreaMapState.lastAutoFocusedAreaId) {
    return;
  }

  popcycleAreaMapState.lastAutoFocusedAreaId = areaId;

  if (!areaId) {
    return;
  }

  requestAnimationFrame(() => focusPopcycleMapOnSelected());
}

function updatePopcycleMapSummary(
  scheduleName,
  area,
  matchType,
  layer
) {
  const summary =
    document.getElementById(
      "popcycleAreaSummaryLabel"
    );

  const selection =
    document.getElementById(
      "popcycleMapSelectionSummary"
    );

  const zoomLabel =
    document.getElementById(
      "popcycleMapZoomLabel"
    );

  const matchLabels = {
    exact: "Exact alias",
    related: "Related area",
    manual: "Manual override",
    none: "Unmapped"
  };

  if (summary) {
    summary.textContent = area
      ? `${area.name} · ${matchLabels[matchType] || "Area reference"}`
      : `${scheduleName || "No schedule"} · map reference not assigned`;
  }

  if (selection) {
    selection.innerHTML = `
      <div>
        <small>Selected Schedule</small>
        <strong>${escapePopcycleHTML(scheduleName || "None")}</strong>
      </div>

      <div>
        <small>Mapped District</small>
        <strong>${escapePopcycleHTML(area?.name || "Not assigned")}</strong>
      </div>

      <div>
        <small>Map View</small>
        <strong>${escapePopcycleHTML(layer?.title || "Unavailable")}</strong>
      </div>

      <div>
        <small>Population Slots</small>
        <strong>12</strong>
      </div>
    `;
  }

  if (zoomLabel && layer) {
    const view =
      getPopcycleMapView(layer.id);

    zoomLabel.textContent =
      `${Math.round((view.zoom || 1) * 100)}%`;
  }
}

function updatePopcycleAreaOverrideControl(
  scheduleName
) {
  const select =
    document.getElementById(
      "popcycleAreaOverrideSelect"
    );

  if (!select) return;

  select.value =
    popcycleState.areaOverrides
      ?.[scheduleName] || "";
}

function renderPopcycleAreaDetails(
  scheduleName,
  area,
  matchType,
  layer
) {
  const host =
    document.getElementById(
      "popcycleAreaDetails"
    );

  const caption =
    document.getElementById(
      "popcycleFocusedMapCaption"
    );

  if (!host) return;

  if (!scheduleName) {
    host.innerHTML = `
      <div class="pc-empty-state">
        Select a schedule to view its map reference.
      </div>
    `;
    if (caption) caption.textContent = "Select a mapped schedule to view its details.";
    return;
  }

  if (!area) {
    host.innerHTML = `
      <div class="pc-area-unmatched">
        <strong>No automatic map match was found.</strong>

        <p>
          Choose the closest Area Explorer location from the
          dropdown. The manual choice is stored with this
          Popcycle workspace.
        </p>
      </div>
    `;
    if (caption) caption.textContent = `${scheduleName} · no area reference assigned.`;
    return;
  }

  if (caption) {
    caption.textContent = `${area.name} · ${area.county}`;
  }

  const matchLabel = {
    exact: "Exact Popcycle alias",
    related: "Related area reference",
    manual: "Manual area override"
  }[matchType] || "Area reference";

  host.innerHTML = `
    <div class="pc-area-heading">
      <div>
        <h3>${escapePopcycleHTML(area.name)}</h3>

        <div class="pc-area-badges">
          <span>${escapePopcycleHTML(area.county)}</span>
          <span>${escapePopcycleHTML(area.category)}</span>
          <span class="pc-area-match-${matchType}">
            ${escapePopcycleHTML(matchLabel)}
          </span>
        </div>
      </div>
    </div>

    <p class="pc-area-description">
      ${escapePopcycleHTML(area.notes)}
    </p>

    <div class="pc-area-detail-grid">
      <div>
        <strong>Popcycle aliases</strong>
        <p>
          ${(area.popcycle || [])
            .map(alias =>
              `<code>${escapePopcycleHTML(alias)}</code>`
            )
            .join(" ")}
        </p>
      </div>

      <div>
        <strong>Landmarks</strong>
        <p>
          ${(area.landmarks || [])
            .map(item =>
              escapePopcycleHTML(item)
            )
            .join(" · ") || "None listed"}
        </p>
      </div>
    </div>

    <div class="pc-area-layer-note">
      <strong>${escapePopcycleHTML(layer?.title || "Map")}</strong>
      <p>${escapePopcycleHTML(layer?.description || "")}</p>
    </div>

    <div class="pc-area-reference-groups">
      <strong>Area Explorer Ped-Group References</strong>

      <p class="small">
        These are visual-reference suggestions. Click one to
        add it to the currently selected hour.
      </p>

      <div class="pc-area-group-chips">
        ${(area.popgroups || [])
          .map(groupName => `
            <button
              type="button"
              onclick="addAreaReferencePedGroup('${escapePopcycleAttribute(groupName)}')"
            >
              + ${escapePopcycleHTML(groupName)}
            </button>
          `)
          .join("")}
      </div>
    </div>

    ${area.custom ? `
      <div class="pc-area-custom-actions">
        <button
          type="button"
          class="pc-area-remove-custom"
          onclick="if(confirm('Remove this custom marker?')) removeCustomMarker('${escapePopcycleAttribute(area.id)}')"
        >
          🗑 Remove This Custom Marker
        </button>
      </div>
    ` : ""}
  `;
}

function requestPopcycleMapDraw() {
  if (popcycleAreaMapState.drawRequest) {
    cancelAnimationFrame(
      popcycleAreaMapState.drawRequest
    );
  }

  popcycleAreaMapState.drawRequest =
    requestAnimationFrame(() => {
      popcycleAreaMapState.drawRequest = null;
      drawPopcycleVisualMap();
    });
}

function drawPopcycleVisualMap() {
  const canvas =
    document.getElementById(
      "popcycleVisualMapCanvas"
    );

  if (!canvas) return;

  const context =
    canvas.getContext("2d");

  const rect =
    canvas.getBoundingClientRect();

  const cssWidth =
    Math.max(320, rect.width || 1100);

  const cssHeight =
    Math.max(420, rect.height || 720);

  const dpr =
    Math.min(
      2,
      window.devicePixelRatio || 1
    );

  const targetWidth =
    Math.round(cssWidth * dpr);

  const targetHeight =
    Math.round(cssHeight * dpr);

  if (
    canvas.width !== targetWidth ||
    canvas.height !== targetHeight
  ) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  context.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  context.clearRect(
    0,
    0,
    cssWidth,
    cssHeight
  );

  context.fillStyle = "#06111d";
  context.fillRect(
    0,
    0,
    cssWidth,
    cssHeight
  );

  const layer =
    getActualPopcycleMapLayer();

  if (!layer) {
    drawPopcycleMapMessage(
      context,
      cssWidth,
      "Map layer is unavailable."
    );
    return;
  }

  const image =
    popcycleAreaMapState.images[
      layer.id
    ];

  if (!image) {
    drawPopcycleMapMessage(
      context,
      cssWidth,
      popcycleAreaMapState.imageReady[layer.id] === false
        ? "This map image could not be loaded."
        : "Loading map image..."
    );
    return;
  }

  const view =
    getPopcycleMapView(layer.id);

  const fitScale = Math.min(
    cssWidth / layer.width,
    cssHeight / layer.height
  );

  const scale =
    fitScale * (view.zoom || 1);

  const drawWidth =
    layer.width * scale;

  const drawHeight =
    layer.height * scale;

  const drawX =
    (cssWidth - drawWidth) / 2 +
    (view.panX || 0);

  const drawY =
    (cssHeight - drawHeight) / 2 +
    (view.panY || 0);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    image,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );

  const layerScale = getLayerScale(layer);

  drawPopcycleAreaOutlines(context, drawX, drawY, scale, layerScale);

  const markers =
    buildPopcycleMapMarkers(
      layer,
      drawX,
      drawY,
      scale
    );

  drawPopcycleMapMarkers(
    context,
    markers,
    view.zoom || 1
  );

  if (popcycleAreaMapState.editMode) {
    context.save();
    context.fillStyle = "rgba(249,115,22,.92)";
    context.font = "700 12px Segoe UI, Arial";
    context.fillText("Edit Positions: drag any marker to correct it", 14, cssHeight - 14);
    context.restore();
  }

  popcycleAreaMapState.lastRender = {
    layerId: layer.id,
    canvasWidth: cssWidth,
    canvasHeight: cssHeight,
    fitScale,
    scale,
    layerScale,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
    markers
  };

  updatePopcycleMapZoomLabel(
    layer.id
  );
}

function outlinePointToCanvas(point, drawX, drawY, scale, layerScale = { x: 1, y: 1 }) {
  return {
    x: drawX + point[0] * layerScale.x * scale,
    y: drawY + point[1] * layerScale.y * scale
  };
}

function drawPopcycleAreaOutlines(context, drawX, drawY, scale, layerScale = { x: 1, y: 1 }) {
  const selectedArea = getSelectedPopcycleArea();
  const savedOutline = selectedArea
    ? popcycleAreaMapState.areaOutlines[selectedArea.id]
    : null;

  if (savedOutline && savedOutline.length >= 3) {
    context.save();
    context.beginPath();
    savedOutline.forEach((point, index) => {
      const p = outlinePointToCanvas(point, drawX, drawY, scale, layerScale);
      if (index === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    });
    context.closePath();
    context.fillStyle = "rgba(249,115,22,.22)";
    context.fill();
    context.strokeStyle = "#f97316";
    context.lineWidth = 3;
    context.stroke();
    context.restore();
  }

  const draft = popcycleAreaMapState.outlineDraft;
  if (draft && draft.points.length) {
    context.save();
    context.beginPath();
    draft.points.forEach((point, index) => {
      const p = outlinePointToCanvas(point, drawX, drawY, scale, layerScale);
      if (index === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    });
    context.strokeStyle = "#38bdf8";
    context.lineWidth = 2;
    context.setLineDash([6, 4]);
    context.stroke();
    context.setLineDash([]);

    draft.points.forEach(point => {
      const p = outlinePointToCanvas(point, drawX, drawY, scale, layerScale);
      context.beginPath();
      context.arc(p.x, p.y, 4, 0, Math.PI * 2);
      context.fillStyle = "#38bdf8";
      context.fill();
      context.strokeStyle = "#fff";
      context.lineWidth = 1;
      context.stroke();
    });
    context.restore();
  }
}

function drawPopcycleMapMessage(
  context,
  width,
  message
) {
  context.fillStyle = "#cbd5e1";
  context.font =
    "600 16px Segoe UI, Arial";

  context.fillText(
    message,
    Math.max(20, width / 2 - 120),
    54
  );
}

function updatePopcycleMapZoomLabel(
  layerId
) {
  const label =
    document.getElementById(
      "popcycleMapZoomLabel"
    );

  if (!label) return;

  const view =
    getPopcycleMapView(layerId);

  label.textContent =
    `${Math.round((view.zoom || 1) * 100)}%`;
}

function buildPopcycleMapMarkers(
  layer,
  drawX,
  drawY,
  scale
) {
  const selectedAreaId =
    popcycleAreaMapState.selectedAreaId;

  const layerScale = getLayerScale(layer);
  const ref = getPopcycleReferenceDims();

  return popcycleAreaMapState.areas
    .map(area => {
      const position =
        getAreaMarkerPosition(area);

      if (!position) return null;

      if (
        position.x < 0 ||
        position.y < 0 ||
        position.x > ref.width ||
        position.y > ref.height
      ) {
        return null;
      }

      return {
        area,
        imageX: position.x,
        imageY: position.y,
        canvasX:
          drawX + position.x * layerScale.x * scale,
        canvasY:
          drawY + position.y * layerScale.y * scale,
        selected:
          area.id === selectedAreaId
      };
    })
    .filter(Boolean);
}

function getAreaMarkerPosition(area) {
  const override =
    popcycleAreaMapState.markerOverrides?.[area.id];

  if (Array.isArray(override) && override.length >= 2) {
    return { x: Number(override[0]), y: Number(override[1]) };
  }

  if (Array.isArray(area.pin) && area.pin.length >= 2) {
    return { x: Number(area.pin[0]), y: Number(area.pin[1]) };
  }

  return null;
}

function drawPopcycleMapMarkers(
  context,
  markers,
  zoom
) {
  markers.forEach(marker => {
    const radius =
      marker.selected
        ? 9
        : 5;

    if (popcycleAreaMapState.editMode) {
      context.beginPath();
      context.arc(marker.canvasX, marker.canvasY, radius + 6, 0, Math.PI * 2);
      context.strokeStyle = "rgba(249,115,22,.75)";
      context.lineWidth = 1.5;
      context.setLineDash([3, 3]);
      context.stroke();
      context.setLineDash([]);
    }

    context.beginPath();
    context.arc(
      marker.canvasX,
      marker.canvasY,
      radius,
      0,
      Math.PI * 2
    );

    context.fillStyle =
      marker.selected
        ? "#ef4444"
        : "#4ade80";

    context.fill();

    context.lineWidth =
      marker.selected ? 3 : 1.5;

    context.strokeStyle = "#ffffff";
    context.stroke();

    if (
      marker.selected ||
      zoom >= 1.7
    ) {
      drawPopcycleMarkerLabel(
        context,
        marker
      );
    }
  });
}

function drawPopcycleMarkerLabel(
  context,
  marker
) {
  const text = marker.area.name;

  context.font =
    marker.selected
      ? "800 13px Segoe UI, Arial"
      : "700 10px Segoe UI, Arial";

  const textWidth =
    context.measureText(text).width;

  const width =
    textWidth + 14;

  const height =
    marker.selected ? 25 : 20;

  const x =
    marker.canvasX - width / 2;

  const y =
    marker.canvasY -
    (marker.selected ? 42 : 31);

  context.fillStyle =
    "rgba(3, 7, 18, 0.88)";

  context.fillRect(
    x,
    y,
    width,
    height
  );

  context.strokeStyle =
    marker.selected
      ? "#fb923c"
      : "rgba(148, 163, 184, 0.72)";

  context.lineWidth = 1;
  context.strokeRect(
    x,
    y,
    width,
    height
  );

  context.fillStyle = "#ffffff";

  context.fillText(
    text,
    x + 7,
    y + (marker.selected ? 17 : 14)
  );
}

// [END SECTION: MAP_RENDERING]

// =====================================================
// [SECTION: MAP_POINTER_INTERACTIONS]
// Wheel zoom, drag pan, marker-drag repositioning (Edit
// Positions mode), and marker click schedule selection.
// =====================================================

function handlePopcycleMapWheel(event) {
  event.preventDefault();

  zoomPopcycleMap(
    event.deltaY < 0
      ? 1.16
      : 1 / 1.16,
    event
  );
}

function findMarkerNearPoint(clickX, clickY, maxDistance = 22) {
  const render = popcycleAreaMapState.lastRender;
  if (!render?.markers?.length) return null;

  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  render.markers.forEach(marker => {
    const distance = Math.hypot(clickX - marker.canvasX, clickY - marker.canvasY);
    if (distance < nearestDistance) {
      nearest = marker;
      nearestDistance = distance;
    }
  });

  return nearest && nearestDistance <= maxDistance ? nearest : null;
}

function handlePopcycleMapPointerDown(event) {
  const layer =
    getActualPopcycleMapLayer();

  if (!layer) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  if (popcycleAreaMapState.editMode && !popcycleAreaMapState.outlineDraft) {
    const marker = findMarkerNearPoint(clickX, clickY);

    if (marker) {
      popcycleAreaMapState.drag = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPanX: 0,
        startPanY: 0,
        moved: false,
        marker,
        markerMoved: false
      };

      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add("is-dragging");
      return;
    }
  }

  const view =
    getPopcycleMapView(layer.id);

  popcycleAreaMapState.drag = {
    active: true,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startPanX: view.panX || 0,
    startPanY: view.panY || 0,
    moved: false,
    marker: null,
    markerMoved: false
  };

  event.currentTarget.setPointerCapture(
    event.pointerId
  );

  event.currentTarget.classList.add(
    "is-dragging"
  );
}

function handlePopcycleMapPointerMove(event) {
  const drag =
    popcycleAreaMapState.drag;

  if (
    !drag.active ||
    drag.pointerId !== event.pointerId
  ) {
    return;
  }

  const layer =
    getActualPopcycleMapLayer();

  if (!layer) return;

  const deltaX =
    event.clientX - drag.startX;

  const deltaY =
    event.clientY - drag.startY;

  if (
    Math.abs(deltaX) > 3 ||
    Math.abs(deltaY) > 3
  ) {
    drag.moved = true;
  }

  if (drag.marker) {
    if (!drag.moved) return;
    drag.markerMoved = true;

    const render = popcycleAreaMapState.lastRender;
    if (!render) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    const layerScale = render.layerScale || getLayerScale(layer);
    const imageX = (canvasX - render.drawX) / render.scale / layerScale.x;
    const imageY = (canvasY - render.drawY) / render.scale / layerScale.y;

    popcycleAreaMapState.markerOverrides[drag.marker.area.id] = [
      Math.round(imageX * 100) / 100,
      Math.round(imageY * 100) / 100
    ];

    requestPopcycleMapDraw();
    return;
  }

  const view =
    getPopcycleMapView(layer.id);

  view.panX =
    drag.startPanX + deltaX;

  view.panY =
    drag.startPanY + deltaY;

  requestPopcycleMapDraw();
}

function handlePopcycleMapPointerUp(event) {
  const drag =
    popcycleAreaMapState.drag;

  if (
    !drag.active ||
    drag.pointerId !== event.pointerId
  ) {
    return;
  }

  event.currentTarget.classList.remove(
    "is-dragging"
  );

  try {
    event.currentTarget.releasePointerCapture(
      event.pointerId
    );
  } catch (error) {
    // Pointer capture may already have been released.
  }

  const wasMarkerDrag = Boolean(drag.marker);
  const markerMoved = drag.markerMoved;
  const moved = drag.moved;

  popcycleAreaMapState.drag.active = false;
  popcycleAreaMapState.drag.pointerId = null;
  popcycleAreaMapState.drag.marker = null;

  if (wasMarkerDrag) {
    if (markerMoved) {
      saveMarkerOverridesToStorage();
      renderPopcycleMapToolButtons();
    } else {
      // A click on a marker while in Edit mode with no drag - still select it.
      handlePopcycleMapClick(event);
    }
    return;
  }

  if (!moved) {
    handlePopcycleMapClick(event);
  } else {
    schedulePopcycleWorkspaceSave?.();
  }
}

function handlePopcycleMapClick(event) {
  const canvas =
    event.currentTarget;

  const rect =
    canvas.getBoundingClientRect();

  const clickX =
    event.clientX - rect.left;

  const clickY =
    event.clientY - rect.top;

  const render = popcycleAreaMapState.lastRender;
  const layerScale = render?.layerScale || getLayerScale(getActualPopcycleMapLayer());

  if (popcycleAreaMapState.outlineDraft && render) {
    const imageX = (clickX - render.drawX) / render.scale / layerScale.x;
    const imageY = (clickY - render.drawY) / render.scale / layerScale.y;
    popcycleAreaMapState.outlineDraft.points.push([
      Math.round(imageX * 100) / 100,
      Math.round(imageY * 100) / 100
    ]);
    renderPopcycleMapToolButtons();
    requestPopcycleMapDraw();
    return;
  }

  const nearest = findMarkerNearPoint(clickX, clickY);

  if (nearest) {
    selectPopcycleScheduleFromArea(
      nearest.area
    );
    return;
  }

  if (popcycleAreaMapState.editMode && render) {
    const imageX = (clickX - render.drawX) / render.scale / layerScale.x;
    const imageY = (clickY - render.drawY) / render.scale / layerScale.y;
    addCustomMarkerAt(imageX, imageY);
  }
}

// [END SECTION: MAP_POINTER_INTERACTIONS]

// =====================================================
// [SECTION: MAP_SCHEDULE_SELECTION]
// Map marker clicks select the best matching schedule, clear
// filters that hide it, and scroll the left schedule list.
// =====================================================

function selectPopcycleScheduleFromArea(area) {
  const scheduleName =
    findBestScheduleForArea(area);

  if (!scheduleName) {
    alert(
      `No Popcycle schedule is currently mapped to ${area.name}. Use the map override dropdown or add an alias to the map data.`
    );
    return;
  }

  clearPopcycleScheduleFilters();
  selectPopcycleSchedule(scheduleName);

  requestAnimationFrame(() => {
    const selectedButton =
      document.querySelector(
        ".pc-schedule-item.active"
      );

    selectedButton?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  });
}

function findBestScheduleForArea(area) {
  const scheduleNames =
    popcycleState.current
      ?.order || [];

  if (!scheduleNames.length) {
    return null;
  }

  const currentSchedule =
    popcycleState.selectedScheduleName;

  if (currentSchedule) {
    const currentMatch =
      findPopcycleAreaMatch(
        currentSchedule
      );

    if (
      currentMatch.area?.id ===
      area.id
    ) {
      return currentSchedule;
    }
  }

  const areaAliases = [
    ...(area.popcycle || []),
    area.id
  ];

  for (const alias of areaAliases) {
    const normalizedAlias =
      normalizePopcycleAreaKey(alias);

    const exactMatch =
      scheduleNames.find(
        scheduleName =>
          normalizePopcycleAreaKey(
            scheduleName
          ) === normalizedAlias
      );

    if (exactMatch) {
      return exactMatch;
    }
  }

  const overrideMatches =
    scheduleNames.filter(
      scheduleName => {
        const scheduleKey =
          normalizePopcycleAreaKey(
            scheduleName
          );

        const mappedKey =
          POPCYCLE_AREA_KEY_OVERRIDES[
            scheduleKey
          ];

        return (
          mappedKey &&
          areaAliases.some(alias =>
            normalizePopcycleAreaKey(
              alias
            ) === mappedKey
          )
        );
      }
    );

  if (overrideMatches.length) {
    return overrideMatches[0];
  }

  const relatedMatches = [];

  scheduleNames.forEach(scheduleName => {
    const scheduleKey =
      normalizePopcycleAreaKey(
        scheduleName
      );

    areaAliases.forEach(alias => {
      const aliasKey =
        normalizePopcycleAreaKey(alias);

      if (
        scheduleKey.startsWith(
          `${aliasKey}_`
        ) ||
        aliasKey.startsWith(
          `${scheduleKey}_`
        )
      ) {
        relatedMatches.push({
          scheduleName,
          score:
            Math.abs(
              scheduleKey.length -
              aliasKey.length
            )
        });
      }
    });
  });

  relatedMatches.sort(
    (a, b) => a.score - b.score
  );

  return relatedMatches[0]
    ?.scheduleName || null;
}

function clearPopcycleScheduleFilters() {
  popcycleState.search = "";
  popcycleState.filter = "all";

  const searchInput =
    document.getElementById(
      "popcycleScheduleSearch"
    );

  const filterSelect =
    document.getElementById(
      "popcycleScheduleFilter"
    );

  if (searchInput) {
    searchInput.value = "";
  }

  if (filterSelect) {
    filterSelect.value = "all";
  }

  schedulePopcycleWorkspaceSave?.();
}

// [END SECTION: MAP_SCHEDULE_SELECTION]

// [END MODULE: POPCYCLE_VISUAL_AREA_MAP]
