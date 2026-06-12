// =====================================================
// [MODULE: POPCYCLE_AREA_MAP]
// Matches Popcycle schedules to Area Explorer records,
// loads map images, renders focused and overview maps,
// and supports manual schedule-to-area overrides.
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
  images: {},
  imageReady: false,
  selectedAreaId: "",
  currentMatchType: "none"
};

function initializePopcycleAreaMap() {
  const data =
    window.GTATrafficAreaMapData || {};

  popcycleAreaMapState.areas =
    Array.isArray(data.areas)
      ? data.areas
      : [];

  populatePopcycleAreaSelect();

  const imageEntries =
    Object.entries(
      data.imagePaths || {}
    );

  Promise.all(
    imageEntries.map(
      ([key, source]) =>
        new Promise(resolve => {
          const image = new Image();

          image.onload = () => {
            popcycleAreaMapState.images[key] =
              image;

            resolve();
          };

          image.onerror = () => {
            console.error(
              `Could not load area map image: ${source}`
            );

            resolve();
          };

          image.src = source;
        })
    )
  ).then(() => {
    popcycleAreaMapState.imageReady =
      true;

    renderPopcycleAreaMap();
  });

const overviewCanvas =
  document.getElementById(
    "popcycleOverviewCanvas"
  );

const focusCanvas =
  document.getElementById(
    "popcycleFocusCanvas"
  );

function handlePopcycleOverviewClick(
  event
) {
  const canvas =
    event.currentTarget;

  const image =
    popcycleAreaMapState.images
      .overview;

  if (!image) return;

  const rectangle =
    canvas.getBoundingClientRect();

  const clickX =
    (event.clientX - rectangle.left) *
    (canvas.width / rectangle.width);

  const clickY =
    (event.clientY - rectangle.top) *
    (canvas.height / rectangle.height);

  const transform =
    getPopcycleImageCoverPosition(
      image,
      canvas.width,
      canvas.height
    );

  let nearestArea = null;

  let nearestDistance =
    Number.POSITIVE_INFINITY;

  popcycleAreaMapState.areas.forEach(
    area => {
      const x =
        (
          (area.pin[0] -
            transform.sourceX) /
          transform.sourceW
        ) *
        transform.drawW;

      const y =
        (
          (area.pin[1] -
            transform.sourceY) /
          transform.sourceH
        ) *
        transform.drawH;

      const distance =
        Math.hypot(
          clickX - x,
          clickY - y
        );

      if (
        distance <
        nearestDistance
      ) {
        nearestArea = area;
        nearestDistance = distance;
      }
    }
  );

  if (
    nearestArea &&
    nearestDistance <= 22
  ) {
    selectPopcycleScheduleFromArea(
      nearestArea
    );
  }
}

focusCanvas?.addEventListener(
  "click",
  handlePopcycleFocusClick
);
}

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

function findPopcycleAreaMatch(
  scheduleName
) {
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
        aliasLength:
          aliasKey.length
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
      area:
        prefixMatches[0].area,
      type: "related"
    };
  }

  return {
    area: null,
    type: "none"
  };
}

function populatePopcycleAreaSelect() {
  const select =
    document.getElementById(
      "popcycleAreaOverrideSelect"
    );

  if (!select) return;

  const grouped =
    new Map();

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
        option.textContent =
          area.name;

        group.appendChild(option);
      });

      select.appendChild(group);
    }
  );
}

function setPopcycleAreaOverride(
  areaId
) {
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

  savePopcycleDraft();
  renderPopcycleAreaMap();
}

function resetPopcycleAreaOverride() {
  setPopcycleAreaOverride("");
}

function renderPopcycleAreaMap() {
  const host =
    document.getElementById(
      "popcycleAreaDetails"
    );

  const label =
    document.getElementById(
      "popcycleAreaSummaryLabel"
    );

  const select =
    document.getElementById(
      "popcycleAreaOverrideSelect"
    );

  const scheduleName =
    popcycleState.selectedScheduleName;

  if (
    !host ||
    !label ||
    !select
  ) {
    return;
  }

  if (!scheduleName) {
    label.textContent =
      "No schedule selected";

    host.innerHTML =
      '<div class="pc-empty-state">Select a schedule to view its map reference.</div>';

    clearPopcycleAreaCanvases();
    return;
  }

  const match =
    findPopcycleAreaMatch(
      scheduleName
    );

  const area =
    match.area;

  popcycleAreaMapState.selectedAreaId =
    area?.id || "";

  popcycleAreaMapState.currentMatchType =
    match.type;

  select.value =
    popcycleState.areaOverrides
      ?.[scheduleName] || "";

  if (!area) {
    label.textContent =
      `${scheduleName} — map reference not assigned`;

    host.innerHTML = `
      <div class="pc-area-unmatched">
        <strong>
          No automatic map match was found.
        </strong>

        <p>
          Choose the closest Area Explorer location from the
          dropdown. That choice is saved locally for this
          schedule.
        </p>
      </div>
    `;

    clearPopcycleAreaCanvases();
    return;
  }

  const matchLabel = {
    exact: "Exact Popcycle alias",
    related: "Related area reference",
    manual: "Manual area override"
  }[match.type] || "Area reference";

  label.textContent =
    `${area.name} · ${matchLabel}`;

  host.innerHTML = `
    <div class="pc-area-heading">
      <div>
        <h3>
          ${escapePopcycleHTML(area.name)}
        </h3>

        <div class="pc-area-badges">
          <span>
            ${escapePopcycleHTML(area.county)}
          </span>

          <span>
            ${escapePopcycleHTML(area.category)}
          </span>

          <span class="pc-area-match-${match.type}">
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
            .join(" · ")}
        </p>
      </div>
    </div>

    <div class="pc-area-reference-groups">
      <strong>
        Area Explorer Ped-Group References
      </strong>

      <p class="small">
        These are reference suggestions from the mapped area.
        Click one to add it to the currently selected hour.
      </p>

      <div class="pc-area-group-chips">
        ${(area.popgroups || [])
          .map(groupName => `
            <button
              type="button"
              onclick="addAreaReferencePedGroup(
                '${escapePopcycleAttribute(groupName)}'
              )"
            >
              + ${escapePopcycleHTML(groupName)}
            </button>
          `)
          .join("")}
      </div>
    </div>
  `;

  drawPopcycleAreaMaps(area);
}

function clearPopcycleAreaCanvases() {
  [
    "popcycleFocusCanvas",
    "popcycleOverviewCanvas"
  ].forEach(id => {
    const canvas =
      document.getElementById(id);

    const context =
      canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.fillStyle = "#08111b";
    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.fillStyle = "#94a3b8";
    context.font =
      "16px Segoe UI, Arial";

    context.fillText(
      "No map reference selected",
      24,
      42
    );
  });
}

function drawPopcycleAreaMaps(area) {
  if (!popcycleAreaMapState.imageReady) {
    return;
  }

  drawPopcycleFocusedArea(area);
  drawPopcycleOverview(area);
}

function drawPopcycleFocusedArea(area) {
  const canvas =
    document.getElementById(
      "popcycleFocusCanvas"
    );

  const context =
    canvas?.getContext("2d");

  const image =
    popcycleAreaMapState.images[
      area.map
    ];

  if (
    !canvas ||
    !context ||
    !image
  ) {
    return;
  }

  const [cropX, cropY, cropW, cropH] =
    area.focus;

  const [boxX, boxY, boxW, boxH] =
    area.box;

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.fillStyle = "#08111b";
  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const padding = 16;

  const scale = Math.min(
    (canvas.width - padding * 2) /
      cropW,
    (canvas.height - padding * 2) /
      cropH
  );

  const drawW =
    cropW * scale;

  const drawH =
    cropH * scale;

  const drawX =
    (canvas.width - drawW) / 2;

  const drawY =
    (canvas.height - drawH) / 2;

  context.drawImage(
    image,
    cropX,
    cropY,
    cropW,
    cropH,
    drawX,
    drawY,
    drawW,
    drawH
  );

  const rectX =
    drawX +
    (boxX - cropX) * scale;

  const rectY =
    drawY +
    (boxY - cropY) * scale;

  const rectW =
    boxW * scale;

  const rectH =
    boxH * scale;

  context.fillStyle =
    "rgba(255, 209, 102, 0.27)";

  context.strokeStyle =
    "#ffd166";

  context.lineWidth = 4;

  context.fillRect(
    rectX,
    rectY,
    rectW,
    rectH
  );

  context.strokeRect(
    rectX,
    rectY,
    rectW,
    rectH
  );

  const markerX =
    rectX + rectW / 2;

  const markerY =
    rectY + rectH / 2;

  context.beginPath();
  context.arc(
    markerX,
    markerY,
    9,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    "#ff5c5c";

  context.fill();

  context.lineWidth = 3;
  context.strokeStyle = "#fff";
  context.stroke();

  context.fillStyle =
    "rgba(5, 12, 20, 0.86)";

  context.fillRect(
    18,
    18,
    Math.min(
      560,
      canvas.width - 36
    ),
    58
  );

  context.strokeStyle =
    "#5bc0ff";

  context.strokeRect(
    18,
    18,
    Math.min(
      560,
      canvas.width - 36
    ),
    58
  );

  context.fillStyle =
    "#e9f4ff";

  context.font =
    "bold 23px Segoe UI, Arial";

  context.fillText(
    area.name,
    34,
    48
  );

  context.fillStyle =
    "#9eb4ce";

  context.font =
    "13px Segoe UI, Arial";

  context.fillText(
    area.popcycle.join(", "),
    34,
    68
  );
}

function drawPopcycleOverview(
  selectedArea
) {
  const canvas =
    document.getElementById(
      "popcycleOverviewCanvas"
    );

  const context =
    canvas?.getContext("2d");

  const image =
    popcycleAreaMapState.images
      .overview;

  if (
    !canvas ||
    !context ||
    !image
  ) {
    return;
  }

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const transform =
    drawPopcycleImageCover(
      context,
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

  popcycleAreaMapState.areas.forEach(
    area => {
      const x =
        (
          (area.pin[0] -
            transform.sourceX) /
          transform.sourceW
        ) *
        transform.drawW +
        transform.drawX;

      const y =
        (
          (area.pin[1] -
            transform.sourceY) /
          transform.sourceH
        ) *
        transform.drawH +
        transform.drawY;

      if (
        x < 0 ||
        x > canvas.width ||
        y < 0 ||
        y > canvas.height
      ) {
        return;
      }

      const isSelected =
        area.id === selectedArea.id;

      context.beginPath();

      context.arc(
        x,
        y,
        isSelected ? 8 : 4,
        0,
        Math.PI * 2
      );

      context.fillStyle =
        isSelected
          ? "#ff5c5c"
          : (
              area.county ===
              "Los Santos County"
                ? "#5bc0ff"
                : "#78d381"
            );

      context.fill();

      context.lineWidth =
        isSelected ? 3 : 1;

      context.strokeStyle = "#fff";
      context.stroke();

      if (isSelected) {
        context.font =
          "bold 13px Segoe UI, Arial";

        const textWidth =
          context.measureText(
            area.name
          ).width + 16;

        const labelX =
          Math.max(
            5,
            x - textWidth / 2
          );

        const labelY =
          Math.max(
            5,
            y - 38
          );

        context.fillStyle =
          "rgba(5, 12, 20, 0.88)";

        context.fillRect(
          labelX,
          labelY,
          textWidth,
          25
        );

        context.strokeStyle =
          "#ffd166";

        context.strokeRect(
          labelX,
          labelY,
          textWidth,
          25
        );

        context.fillStyle = "#fff";

        context.fillText(
          area.name,
          labelX + 8,
          labelY + 17
        );
      }
    }
  );
}

function drawPopcycleImageCover(
  context,
  image,
  drawX,
  drawY,
  drawW,
  drawH
) {
  const imageRatio =
    image.width / image.height;

  const canvasRatio =
    drawW / drawH;

  let sourceX = 0;
  let sourceY = 0;
  let sourceW = image.width;
  let sourceH = image.height;

  if (imageRatio > canvasRatio) {
    sourceW =
      image.height * canvasRatio;

    sourceX =
      (image.width - sourceW) / 2;
  } else {
    sourceH =
      image.width / canvasRatio;

    sourceY =
      (image.height - sourceH) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    drawX,
    drawY,
    drawW,
    drawH
  );

  return {
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    drawX,
    drawY,
    drawW,
    drawH
  };
}

function handlePopcycleFocusClick() {
  const selectedArea =
    popcycleAreaMapState.areas.find(
      area =>
        area.id ===
        popcycleAreaMapState.selectedAreaId
    );

  if (!selectedArea) return;

  selectPopcycleScheduleFromArea(
    selectedArea
  );
}

function selectPopcycleScheduleFromArea(
  area
) {
  const scheduleName =
    findBestScheduleForArea(
      area
    );

  if (!scheduleName) {
    alert(
      `No Popcycle schedule is currently mapped to ${area.name}. Use the map override dropdown or add an alias to the Area Map data.`
    );

    return;
  }

  clearPopcycleScheduleFilters();

  selectPopcycleSchedule(
    scheduleName
  );

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

function findBestScheduleForArea(
  area
) {
  const scheduleNames =
    popcycleState.current?.order ||
    [];

  if (!scheduleNames.length) {
    return null;
  }

  const currentSchedule =
    popcycleState.selectedScheduleName;

  /*
   * Keep the current schedule if it already belongs
   * to the clicked area.
   */
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

  /*
   * First look for an exact schedule-name match.
   */
  for (
    const alias of areaAliases
  ) {
    const normalizedAlias =
      normalizePopcycleAreaKey(
        alias
      );

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

  /*
   * Then look for related schedules such as:
   *
   * VESPUCCI
   * VESPUCCI_PIER
   * VESPUCCI_BEACH_PROM
   */
  const relatedMatches = [];

  scheduleNames.forEach(
    scheduleName => {
      const scheduleKey =
        normalizePopcycleAreaKey(
          scheduleName
        );

      areaAliases.forEach(alias => {
        const aliasKey =
          normalizePopcycleAreaKey(
            alias
          );

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
    }
  );

  relatedMatches.sort(
    (a, b) =>
      a.score - b.score
  );

  return (
    relatedMatches[0]
      ?.scheduleName ||
    null
  );
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
} {
  const canvas =
    event.currentTarget;

  const image =
    popcycleAreaMapState.images
      .overview;

  if (!image) return;

  const rectangle =
    canvas.getBoundingClientRect();

  const clickX =
    (event.clientX - rectangle.left) *
    (canvas.width / rectangle.width);

  const clickY =
    (event.clientY - rectangle.top) *
    (canvas.height / rectangle.height);

  const transform =
    getPopcycleImageCoverPosition(
      image,
      canvas.width,
      canvas.height
    );

  let nearestArea = null;
  let nearestDistance =
    Number.POSITIVE_INFINITY;

  popcycleAreaMapState.areas.forEach(
    area => {
      const x =
        (
          (area.pin[0] -
            transform.sourceX) /
          transform.sourceW
        ) *
        transform.drawW;

      const y =
        (
          (area.pin[1] -
            transform.sourceY) /
          transform.sourceH
        ) *
        transform.drawH;

      const distance =
        Math.hypot(
          clickX - x,
          clickY - y
        );

      if (distance < nearestDistance) {
        nearestArea = area;
        nearestDistance = distance;
      }
    }
  );

  if (
    nearestArea &&
    nearestDistance <= 22
  ) {
    setPopcycleAreaOverride(
      nearestArea.id
    );
  }
}

function getPopcycleImageCoverPosition(
  image,
  drawW,
  drawH
) {
  const imageRatio =
    image.width / image.height;

  const canvasRatio =
    drawW / drawH;

  let sourceX = 0;
  let sourceY = 0;
  let sourceW = image.width;
  let sourceH = image.height;

  if (imageRatio > canvasRatio) {
    sourceW =
      image.height * canvasRatio;

    sourceX =
      (image.width - sourceW) / 2;
  } else {
    sourceH =
      image.width / canvasRatio;

    sourceY =
      (image.height - sourceH) / 2;
  }

  return {
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    drawW,
    drawH
  };
}

function getSelectedPopcycleArea() {
  return findPopcycleAreaMatch(
    popcycleState.selectedScheduleName
  ).area;
}

// [END MODULE: POPCYCLE_AREA_MAP]
