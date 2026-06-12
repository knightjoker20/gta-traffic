// =====================================================
// [MODULE: POPCYCLE_VISUAL_AREA_MAP]
// Interactive visual map system for the Popcycle Editor.
//
// Features:
// - Automatic city/county map selection
// - Full San Andreas, city district, regional, and patrol maps
// - Mouse-wheel and button zoom
// - Click-and-drag panning
// - Reset, fit, focus-selected, and fullscreen controls
// - Schedule markers that select the matching left-column item
// - Manual schedule-to-area overrides through the dropdown
// - Saved map layer, zoom, and pan state
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

const popcycleAreaMapState = {
  areas: [],
  layers: [],
  layersById: {},
  images: {},
  imageReady: {},
  areaImages: {},
  areaImageReady: {},
  selectedAreaId: "",
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
    moved: false
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

  ensurePopcycleMapState();
  populatePopcycleAreaSelect();
  renderPopcycleMapLayerButtons();
  bindPopcycleMapEvents();
  loadPopcycleMapImages();
  loadFocusedAreaMapImages(areaData.imagePaths || {});
}

function ensurePopcycleMapState() {
  if (!popcycleState.mapLayer) {
    popcycleState.mapLayer =
      window.GTATrafficVisualMapConfig
        ?.defaultLayer || "auto";
  }

  if (!popcycleState.mapViews) {
    popcycleState.mapViews = {};
  }

  popcycleAreaMapState.layers.forEach(layer => {
    if (layer.dynamic) return;

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


function loadFocusedAreaMapImages(imagePaths) {
  ["city", "county"].forEach(key => {
    const source = imagePaths[key];
    if (!source) return;
    const image = new Image();
    image.onload = () => { popcycleAreaMapState.areaImages[key] = image; popcycleAreaMapState.areaImageReady[key] = true; requestPopcycleMapDraw(); };
    image.onerror = () => { popcycleAreaMapState.areaImageReady[key] = false; console.error(`Could not load focused Popcycle map image: ${source}`); requestPopcycleMapDraw(); };
    image.src = source;
  });
}

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
// Layer selection, zoom buttons, reset, focus, and fullscreen.
// =====================================================

function renderPopcycleMapLayerButtons() {
  const host =
    document.getElementById(
      "popcycleMapLayerButtons"
    );

  if (!host) return;

  host.innerHTML =
    popcycleAreaMapState.layers
      .map(layer => `
        <button
          type="button"
          class="pc-map-layer-button ${
            popcycleState.mapLayer === layer.id
              ? "active"
              : ""
          }"
          onclick="setPopcycleMapLayer('${layer.id}')"
          title="${escapePopcycleAttribute(layer.description || layer.title)}"
        >
          ${escapePopcycleHTML(layer.shortTitle || layer.title)}
        </button>
      `)
      .join("");
}

function setPopcycleMapLayer(layerId) {
  if (!popcycleAreaMapState.layersById[layerId]) {
    return;
  }

  popcycleState.mapLayer = layerId;
  renderPopcycleMapLayerButtons();
  renderPopcycleAreaMap();
  schedulePopcycleWorkspaceSave?.();
}

function getActualPopcycleMapLayer(area = null) {
  const requested =
    popcycleState.mapLayer || "auto";

  if (requested !== "auto") {
    return popcycleAreaMapState.layersById[
      requested
    ] ||
      popcycleAreaMapState.layersById.full;
  }

  const selectedArea =
    area || getSelectedPopcycleArea();

  const automaticId =
    selectedArea?.map === "city"
      ? "districts"
      : "full";

  return popcycleAreaMapState.layersById[
    automaticId
  ] ||
    popcycleAreaMapState.layersById.full;
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

  if (!layer || layer.dynamic) return;

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

  if (!layer || layer.dynamic) return;

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
    getActualPopcycleMapLayer(area);

  if (!area || !layer || layer.dynamic) {
    return;
  }

  const marker =
    getAreaMarkerForLayer(
      area,
      layer
    );

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

  view.zoom =
    layer.id === "districts"
      ? 1.8
      : 2.25;

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
    marker.x * scale -
    centeredX;

  view.panY =
    rect.height / 2 -
    marker.y * scale -
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
// Renders map details, the selected layer, and schedule markers.
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
    getActualPopcycleMapLayer(area);

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

  renderPopcycleMapLayerButtons();
  requestPopcycleMapDraw();
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

  if (zoomLabel && layer && !layer.dynamic) {
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

  if (!host) return;

  if (!scheduleName) {
    host.innerHTML = `
      <div class="pc-empty-state">
        Select a schedule to view its map reference.
      </div>
    `;
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
    return;
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
      drawPopcycleFocusedMap();
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

  const area =
    getSelectedPopcycleArea();

  const layer =
    getActualPopcycleMapLayer(area);

  if (!layer || layer.dynamic) {
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

  popcycleAreaMapState.lastRender = {
    layerId: layer.id,
    canvasWidth: cssWidth,
    canvasHeight: cssHeight,
    fitScale,
    scale,
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
  if (layer.markerMode === "none") {
    return [];
  }

  const selectedAreaId =
    popcycleAreaMapState.selectedAreaId;

  return popcycleAreaMapState.areas
    .filter(area => {
      if (layer.markerMode === "city") {
        return area.map === "city";
      }

      return true;
    })
    .map(area => {
      const position =
        getAreaMarkerForLayer(
          area,
          layer
        );

      if (!position) return null;

      if (
        position.x < 0 ||
        position.y < 0 ||
        position.x > layer.width ||
        position.y > layer.height
      ) {
        return null;
      }

      return {
        area,
        imageX: position.x,
        imageY: position.y,
        canvasX:
          drawX + position.x * scale,
        canvasY:
          drawY + position.y * scale,
        selected:
          area.id === selectedAreaId
      };
    })
    .filter(Boolean);
}

function getAreaMarkerForLayer(
  area,
  layer
) {
  const override =
    layer.markerOverrides
      ?.[area.id];

  if (
    Array.isArray(override) &&
    override.length >= 2
  ) {
    return {
      x: Number(override[0]),
      y: Number(override[1])
    };
  }

  const matrix =
    layer.transforms
      ?.[area.map];

  if (!matrix || !area.pin) {
    return null;
  }

  return applyPopcycleMapMatrix(
    matrix,
    area.pin[0],
    area.pin[1]
  );
}

function applyPopcycleMapMatrix(
  matrix,
  sourceX,
  sourceY
) {
  const denominator =
    matrix[2][0] * sourceX +
    matrix[2][1] * sourceY +
    matrix[2][2];

  if (!denominator) return null;

  return {
    x:
      (
        matrix[0][0] * sourceX +
        matrix[0][1] * sourceY +
        matrix[0][2]
      ) / denominator,

    y:
      (
        matrix[1][0] * sourceX +
        matrix[1][1] * sourceY +
        matrix[1][2]
      ) / denominator
  };
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
        : marker.area.map === "city"
          ? "#38bdf8"
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
// Wheel zoom, drag pan, and marker click schedule selection.
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

function handlePopcycleMapPointerDown(event) {
  const layer =
    getActualPopcycleMapLayer();

  if (!layer || layer.dynamic) return;

  const view =
    getPopcycleMapView(layer.id);

  popcycleAreaMapState.drag = {
    active: true,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startPanX: view.panX || 0,
    startPanY: view.panY || 0,
    moved: false
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

  if (!layer || layer.dynamic) return;

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

  const moved = drag.moved;

  popcycleAreaMapState.drag.active = false;
  popcycleAreaMapState.drag.pointerId = null;

  if (!moved) {
    handlePopcycleMapClick(event);
  } else {
    schedulePopcycleWorkspaceSave?.();
  }
}

function handlePopcycleMapClick(event) {
  const canvas =
    event.currentTarget;

  const render =
    popcycleAreaMapState.lastRender;

  if (!render?.markers?.length) {
    return;
  }

  const rect =
    canvas.getBoundingClientRect();

  const clickX =
    event.clientX - rect.left;

  const clickY =
    event.clientY - rect.top;

  let nearest = null;
  let nearestDistance =
    Number.POSITIVE_INFINITY;

  render.markers.forEach(marker => {
    const distance = Math.hypot(
      clickX - marker.canvasX,
      clickY - marker.canvasY
    );

    if (distance < nearestDistance) {
      nearest = marker;
      nearestDistance = distance;
    }
  });

  if (
    nearest &&
    nearestDistance <= 22
  ) {
    selectPopcycleScheduleFromArea(
      nearest.area
    );
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



// =====================================================
// [SECTION: FOCUSED_AREA_MAP_RENDERING]
// Draws the selected city/county area with outline-only emphasis.
// =====================================================
function drawPopcycleFocusedMap(){
  const canvas=document.getElementById("popcycleFocusedMapCanvas");
  const caption=document.getElementById("popcycleFocusedMapCaption");
  if(!canvas)return;
  const context=canvas.getContext("2d");
  const rect=canvas.getBoundingClientRect();
  const cssWidth=Math.max(300,rect.width||520),cssHeight=Math.max(360,rect.height||430),dpr=Math.min(2,window.devicePixelRatio||1);
  const targetWidth=Math.round(cssWidth*dpr),targetHeight=Math.round(cssHeight*dpr);
  if(canvas.width!==targetWidth||canvas.height!==targetHeight){canvas.width=targetWidth;canvas.height=targetHeight}
  context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,cssWidth,cssHeight);context.fillStyle="#06111d";context.fillRect(0,0,cssWidth,cssHeight);
  const scheduleName=popcycleState.selectedScheduleName,area=getSelectedPopcycleArea();
  if(!area){drawPopcycleMapMessage(context,cssWidth,"Select or map a schedule to view its local area.");if(caption)caption.textContent="No focused area is currently assigned.";return}
  const image=popcycleAreaMapState.areaImages[area.map];
  if(!image){drawPopcycleMapMessage(context,cssWidth,popcycleAreaMapState.areaImageReady[area.map]===false?"Focused map image could not be loaded.":"Loading focused area map...");return}
  const focus=Array.isArray(area.focus)&&area.focus.length>=4?area.focus:[0,0,image.naturalWidth||image.width,image.naturalHeight||image.height];
  const [sourceX,sourceY,sourceWidth,sourceHeight]=focus,padding=12,scale=Math.min((cssWidth-padding*2)/sourceWidth,(cssHeight-padding*2)/sourceHeight),drawWidth=sourceWidth*scale,drawHeight=sourceHeight*scale,drawX=(cssWidth-drawWidth)/2,drawY=(cssHeight-drawHeight)/2;
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality="high";context.drawImage(image,sourceX,sourceY,sourceWidth,sourceHeight,drawX,drawY,drawWidth,drawHeight);
  if(Array.isArray(area.box)&&area.box.length>=4){const [boxX,boxY,boxWidth,boxHeight]=area.box,outlineX=drawX+(boxX-sourceX)*scale,outlineY=drawY+(boxY-sourceY)*scale,outlineWidth=boxWidth*scale,outlineHeight=boxHeight*scale;context.save();context.fillStyle="rgba(249,115,22,.055)";context.strokeStyle="#f97316";context.lineWidth=4;context.setLineDash([13,7]);context.fillRect(outlineX,outlineY,outlineWidth,outlineHeight);context.strokeRect(outlineX,outlineY,outlineWidth,outlineHeight);context.restore();const markerX=outlineX+outlineWidth/2,markerY=outlineY+outlineHeight/2;context.beginPath();context.arc(markerX,markerY,8,0,Math.PI*2);context.fillStyle="#ef4444";context.fill();context.lineWidth=3;context.strokeStyle="#fff";context.stroke()}
  drawFocusedMapTitle(context,area,scheduleName,cssWidth);
  if(caption)caption.textContent=`${area.name} · ${area.county} · ${area.map==="city"?"Los Santos street map":"County reference map"}`;
}
function drawFocusedMapTitle(context,area,scheduleName,canvasWidth){const title=scheduleName||area.name,subtitle=area.name===title?`${area.county} · ${area.category}`:`${area.name} · ${area.county}`,boxWidth=Math.min(420,canvasWidth-24);context.fillStyle="rgba(2,6,23,.88)";context.fillRect(12,12,boxWidth,58);context.strokeStyle="rgba(56,189,248,.65)";context.lineWidth=1.5;context.strokeRect(12,12,boxWidth,58);context.fillStyle="#f8fafc";context.font="800 18px Segoe UI, Arial";context.fillText(title,25,38);context.fillStyle="#cbd5e1";context.font="600 11px Segoe UI, Arial";context.fillText(subtitle,25,58)}
// [END SECTION: FOCUSED_AREA_MAP_RENDERING]

// [END MODULE: POPCYCLE_VISUAL_AREA_MAP]
