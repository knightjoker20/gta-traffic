// =====================================================
// [MODULE: RENDERING]
// Renders Popgroups, vehicle cards, the vehicle library,
// pack tracking, LOD information, traffic values, and stats.
// =====================================================

function renderSection(section) {
  els.results.innerHTML = "";

  const query = els.searchBox.value
    .toLowerCase()
    .trim();

  const data = parsedData[section];

  const allModels = data.flatMap(
    group => group.models
  );

  const duplicates = allModels.filter(
    (item, index) =>
      allModels.indexOf(item) !== index
  );

  data.forEach((group, groupIndex) => {
    const groupMatches = group.name
      .toLowerCase()
      .includes(query);

    const modelMatches = group.models.some(
      model => {
        const meta =
          vehicleMeta[model.toLowerCase()];

        const pack =
          getPackForModel(model);

        const loadInfo =
          getVehicleLoadInfo(model);

        return (
          model.toLowerCase().includes(query) ||
          (
            meta &&
            Object.values(meta).some(value =>
              String(value)
                .toLowerCase()
                .includes(query)
            )
          ) ||
          (
            pack &&
            Object.values(pack).some(value =>
              String(value)
                .toLowerCase()
                .includes(query)
            )
          ) ||
          loadInfo.tier.label
            .toLowerCase()
            .includes(query)
        );
      }
    );

    if (
      query &&
      !groupMatches &&
      !modelMatches
    ) {
      return;
    }

    const duplicateCount =
      group.models.filter(model =>
        duplicates.includes(model)
      ).length;

    const groupDiv =
      document.createElement("div");

    groupDiv.className = "group";

    groupDiv.innerHTML = `
      <div class="group-header">
        <strong>${escapeHTML(group.name)}</strong>

        <span class="count">
          — ${group.models.length} entries
        </span>

        ${
          group.models.length === 0
            ? '<span class="warning"> Empty group</span>'
            : ""
        }

        ${
          duplicateCount > 0
            ? `<span class="warning"> ${duplicateCount} duplicates</span>`
            : ""
        }

        ${
          section === "vehicles"
            ? renderGroupLoadSummary(group.models)
            : ""
        }
      </div>

      <div>
        <input
          id="add-${section}-${groupIndex}"
          placeholder="Add new entry..."
        >

        <button
          onclick="addEntry('${section}', ${groupIndex})"
        >
          Add
        </button>
      </div>

      <div
        class="entries"
        ondragover="allowDrop(event)"
        ondragleave="dragLeave(event)"
        ondrop="dropCard(event, '${section}', ${groupIndex})"
      >
        ${
          imageMode && section === "vehicles"
            ? renderVehicleCards(
                section,
                group,
                groupIndex,
                duplicates
              )
            : renderTextCards(
                section,
                group,
                groupIndex,
                duplicates
              )
        }
      </div>
    `;

    const entriesDiv =
      groupDiv.querySelector(".entries");

    if (
      openGroups[section].has(groupIndex)
    ) {
      entriesDiv.style.display = "block";
    }

    groupDiv
      .querySelector(".group-header")
      .addEventListener("click", () => {
        const isOpen =
          entriesDiv.style.display === "block";

        if (isOpen) {
          entriesDiv.style.display = "none";
          openGroups[section].delete(groupIndex);
        } else {
          entriesDiv.style.display = "block";
          openGroups[section].add(groupIndex);
        }

        if (typeof schedulePopgroupsProjectSave === "function") {
          schedulePopgroupsProjectSave();
        }
      });

    els.results.appendChild(groupDiv);
  });

  updateStats();
}

// [END MODULE: RENDERING]


function openVehicleLibraryDetails(event, modelName) {
  if (event?.target?.closest?.("button, input, select, textarea, a")) return;
  const card = event?.currentTarget;
  if (card?.dataset?.dragging === "true") return;
  window.open(
    `vehicle-details.html?model=${encodeURIComponent(modelName)}`,
    "_blank",
    "noopener"
  );
}

function markVehicleCardDragging(event) {
  if (event?.currentTarget) event.currentTarget.dataset.dragging = "true";
}

function clearVehicleCardDragging(event) {
  const card = event?.currentTarget;
  if (!card) return;
  setTimeout(() => { card.dataset.dragging = "false"; }, 0);
}

// =====================================================
// [MODULE: VEHICLE_CARD_RENDERING]
// Renders full image cards and text-only cards inside
// Popgroups vehicle groups.
// =====================================================

function renderVehicleCards(
  section,
  group,
  groupIndex,
  duplicates
) {
  return `
    <div class="card-grid">
      ${group.models
        .map((model, modelIndex) => {
          const meta =
            vehicleMeta[model.toLowerCase()];

          const pack =
            getPackForModel(model);

          return `
            <div
              class="vehicle-card"
              draggable="true"
              onclick="openVehicleLibraryDetails(event, '${escapeAttribute(model)}')"
              ondragstart="markVehicleCardDragging(event); dragStartFromGroup(
                event,
                '${section}',
                ${groupIndex},
                ${modelIndex}
              )"
              ondragend="clearVehicleCardDragging(event)"
              title="Open ${escapeAttribute(model)} in the Vehicle Library"
            >
              ${renderVehicleImage(
                model,
                "vehicle-img"
              )}

              <div class="vehicle-name">
                ${escapeHTML(model)}
              </div>

              ${
                duplicates.includes(model)
                  ? '<div class="warning">duplicate</div>'
                  : ""
              }

              ${
                pack
                  ? renderPackBox(pack)
                  : '<div class="meta-missing">No pack assigned</div>'
              }

              ${
                meta
                  ? renderMetaBox(meta, group.name)
                  : '<div class="meta-missing">No vehicles.meta match</div>'
              }

              ${
                meta
                  ? renderVehicleTrafficValues(meta)
                  : ""
              }

              ${renderLodBox(model)}

              <div class="vehicle-actions">
                <button
                  onclick="assignVehicleToActivePack(
                    '${escapeAttribute(model)}'
                  )"
                >
                  Assign Active Pack
                </button>

                <button
                  class="secondary"
                  onclick="unassignVehiclePack(
                    '${escapeAttribute(model)}'
                  )"
                >
                  Clear Pack
                </button>

                <button
                  onclick="openImageSearch(
                    '${escapeAttribute(model)}'
                  )"
                >
                  Find Image
                </button>

                <button
                  class="danger"
                  onclick="removeEntry(
                    '${section}',
                    ${groupIndex},
                    ${modelIndex}
                  )"
                >
                  Remove
                </button>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTextCards(
  section,
  group,
  groupIndex,
  duplicates
) {
  return `
    <div class="card-grid">
      ${group.models
        .map((model, modelIndex) => {
          const meta =
            vehicleMeta[model.toLowerCase()];

          const pack =
            getPackForModel(model);

          return `
            <div
              class="vehicle-card"
              draggable="true"
              onclick="openVehicleLibraryDetails(event, '${escapeAttribute(model)}')"
              ondragstart="markVehicleCardDragging(event); dragStartFromGroup(
                event,
                '${section}',
                ${groupIndex},
                ${modelIndex}
              )"
              ondragend="clearVehicleCardDragging(event)"
              title="Open ${escapeAttribute(model)} in the Vehicle Library"
            >
              <div class="vehicle-name">
                ${escapeHTML(model)}
              </div>

              ${
                duplicates.includes(model)
                  ? '<div class="warning">duplicate</div>'
                  : ""
              }

              ${
                pack
                  ? renderPackBox(pack)
                  : ""
              }

              ${
                section === "vehicles" && meta
                  ? renderMetaBox(meta, group.name)
                  : ""
              }

              ${
                section === "vehicles" && meta
                  ? renderVehicleTrafficValues(meta)
                  : ""
              }

              ${
                section === "vehicles"
                  ? renderLodBox(model)
                  : ""
              }

              <div class="vehicle-actions">
                <button
                  onclick="assignVehicleToActivePack(
                    '${escapeAttribute(model)}'
                  )"
                >
                  Assign Active Pack
                </button>

                <button
                  class="secondary"
                  onclick="unassignVehiclePack(
                    '${escapeAttribute(model)}'
                  )"
                >
                  Clear Pack
                </button>

                <button
                  onclick="openImageSearch(
                    '${escapeAttribute(model)}'
                  )"
                >
                  Find Image
                </button>

                <button
                  class="danger"
                  onclick="removeEntry(
                    '${section}',
                    ${groupIndex},
                    ${modelIndex}
                  )"
                >
                  Remove
                </button>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

// [END MODULE: VEHICLE_CARD_RENDERING]

// =====================================================
// [MODULE: VEHICLE_LIBRARY_RENDERING]
// Builds the searchable vehicle library and compact cards.
// =====================================================

function renderVehicleLibrary() {
  els.vehicleLibrary.innerHTML = "";

  const query = els.librarySearchBox.value
    .toLowerCase()
    .trim();

  const vehicles =
    Object.values(vehicleMeta);

  if (!vehicles.length) {
    els.vehicleLibrary.innerHTML = `
      <p class="small">
        Drop vehicles.meta files to build the library.
      </p>
    `;

    return;
  }

  const filtered = vehicles.filter(meta => {
    if (!query) return true;

    const pack =
      getPackForModel(meta.modelName);

    const asset =
      getVehicleAsset(meta.modelName);

    const tier =
      getLoadTier(asset?.totalBytes || 0);

    const blob = [
      ...Object.values(meta),
      ...(pack ? Object.values(pack) : []),
      tier.label,
      asset?.baseYft?.name || "",
      asset?.hiYft?.name || "",
      asset?.baseYtd?.name || ""
    ]
      .join(" ")
      .toLowerCase();

    return blob.includes(query);
  });

  const grouped = {};

  filtered.forEach(meta => {
    const pack =
      getPackForModel(meta.modelName);

    const className = pack
      ? `PACK: ${pack.name}`
      : (
          meta.vehicleClass ||
          "UNKNOWN_CLASS"
        );

    if (!grouped[className]) {
      grouped[className] = [];
    }

    grouped[className].push(meta);
  });

  Object.keys(grouped)
    .sort()
    .forEach(className => {
      grouped[className].sort(
        (a, b) =>
          a.modelName.localeCompare(
            b.modelName
          )
      );

      const classDiv =
        document.createElement("div");

      classDiv.className = "library-class";

      classDiv.innerHTML = `
        <div class="library-class-header">
          ${escapeHTML(className)}

          <span class="count">
            — ${grouped[className].length}
          </span>
        </div>

        <div class="library-class-body">
          <div class="library-grid">
            ${grouped[className]
              .map(meta =>
                renderLibraryCard(meta)
              )
              .join("")}
          </div>
        </div>
      `;

      const body =
        classDiv.querySelector(
          ".library-class-body"
        );

      if (
        openLibraryClasses.has(className) ||
        query
      ) {
        body.style.display = "block";
      }

      classDiv
        .querySelector(
          ".library-class-header"
        )
        .addEventListener("click", () => {
          const isOpen =
            body.style.display === "block";

          if (isOpen) {
            body.style.display = "none";
            openLibraryClasses.delete(className);
          } else {
            body.style.display = "block";
            openLibraryClasses.add(className);
          }
        });

      els.vehicleLibrary.appendChild(
        classDiv
      );
    });
}

function renderLibraryCard(meta) {
  const model = meta.modelName;

  const pack =
    getPackForModel(model);

  const swanknessRaw =
    meta.swankness || "UNKNOWN";

  const swanknessLevel =
    getSwanknessLevel(swanknessRaw);

  const swanknessLabel =
    swanknessLevel !== null
      ? getSwanknessLabel(swanknessLevel)
      : "Unknown";

  const swanknessClass =
    swanknessLevel !== null
      ? `swankness-${swanknessLevel}`
      : "swankness-unknown";

  return `
    <div
      class="library-card"
      draggable="true"
      ondragstart="dragStartFromLibrary(
        event,
        '${escapeAttribute(model)}'
      )"
    >
      ${renderVehicleImage(
        model,
        "library-img"
      )}

      <div class="library-name">
        ${escapeHTML(model)}
      </div>

      ${
        pack
          ? `
            <div class="library-meta">
              <strong>Pack:</strong>
              ${escapeHTML(pack.name)}
            </div>
          `
          : `
            <div class="library-meta warning">
              No pack assigned
            </div>
          `
      }

      <div class="library-meta">
        ${
          meta.gameName
            ? `
              <div>
                <strong>Game name:</strong>
                ${escapeHTML(meta.gameName)}
              </div>
            `
            : ""
        }

        ${
          meta.vehicleMakeName
            ? `
              <div>
                <strong>Make:</strong>
                ${escapeHTML(
                  meta.vehicleMakeName
                )}
              </div>
            `
            : ""
        }

        ${
          meta.vehicleClass
            ? `
              <div>
                <strong>Class:</strong>
                ${escapeHTML(meta.vehicleClass)}
              </div>
            `
            : ""
        }

        ${
          meta.handlingId
            ? `
              <div>
                <strong>Handling:</strong>
                ${escapeHTML(meta.handlingId)}
              </div>
            `
            : ""
        }
      </div>

      <div class="swankness-row">
        <strong>Swankness:</strong>

        <span class="swankness-badge ${swanknessClass}">
          ${escapeHTML(swanknessRaw)}
        </span>

        <span class="swankness-label">
          ${escapeHTML(swanknessLabel)}
        </span>
      </div>

      ${renderVehicleTrafficValues(
        meta,
        true
      )}

      ${
        meta.lodDistances?.length
          ? `
            <div class="library-meta">
              <strong>LOD distances:</strong>
              ${escapeHTML(
                formatLodDistances(
                  meta.lodDistances
                )
              )}
            </div>
          `
          : `
            <div class="library-meta warning">
              LOD distance values unavailable
            </div>
          `
      }

      ${renderCompactLodBox(model)}

      <div class="library-actions">
        <button
          onclick="assignVehicleToActivePack(
            '${escapeAttribute(model)}'
          )"
        >
          Assign Active Pack
        </button>

        ${
          pack
            ? `
              <button
                class="secondary"
                onclick="unassignVehiclePack(
                  '${escapeAttribute(model)}'
                )"
              >
                Clear Pack
              </button>
            `
            : ""
        }

        <button
          onclick="openImageSearch(
            '${escapeAttribute(model)}'
          )"
        >
          Find Image
        </button>
      </div>
    </div>
  `;
}

// [END MODULE: VEHICLE_LIBRARY_RENDERING]

// =====================================================
// [MODULE: VEHICLE_TRAFFIC_VALUES]
// Displays the four approved vehicles.meta traffic values:
// Spawn weight, Model cap, Duplicate spacing, Same-color cap.
// =====================================================

function renderVehicleTrafficValues(
  meta,
  compact = false
) {
  if (!meta) return "";

  const containerClass = compact
    ? "library-meta"
    : "meta-box";

  return `
    <div class="${containerClass}">
      <div>
        <strong>Traffic values</strong>
      </div>

      <div>
        <strong>Spawn weight:</strong>
        ${escapeHTML(
          formatTrafficValue(meta.frequency)
        )}
      </div>

      <div>
        <strong>Model cap:</strong>
        ${escapeHTML(
          formatTrafficValue(meta.maxNum)
        )}
      </div>

      <div>
        <strong>Duplicate spacing:</strong>
        ${escapeHTML(
          formatTrafficValue(
            meta.identicalModelSpawnDistance
          )
        )}
      </div>

      <div>
        <strong>Same-color cap:</strong>
        ${escapeHTML(
          formatTrafficValue(
            meta.maxNumOfSameColor
          )
        )}
      </div>
    </div>
  `;
}

function formatTrafficValue(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "—";
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? String(numericValue)
    : "—";
}

// [END MODULE: VEHICLE_TRAFFIC_VALUES]

// =====================================================
// [MODULE: SWANKNESS_DISPLAY]
// Displays traffic-prestige information and warns about
// obvious Popgroup-to-swankness mismatches.
// =====================================================

function getSwanknessLevel(value) {
  const match = String(value || "")
    .match(/SWANKNESS_(\d+)/i);

  return match
    ? Number(match[1])
    : null;
}

function getSwanknessLabel(level) {
  const labels = {
    1: "Budget / Basic",
    2: "Low-cost / Common",
    3: "Middle-class",
    4: "Upscale",
    5: "Luxury / Exotic"
  };

  return labels[level] || "Unknown";
}

function getExpectedSwanknessForGroup(
  groupName
) {
  const name = String(groupName || "")
    .toUpperCase();

  if (
    /(POOR|BUDGET|BEATER|LOW)/.test(name)
  ) {
    return {
      min: 1,
      max: 2,
      label: "Poor / Budget"
    };
  }

  if (
    /(MID|MIDDLE|NORMAL|COMMON)/.test(name)
  ) {
    return {
      min: 2,
      max: 4,
      label: "Middle / Normal"
    };
  }

  if (
    /(RICH|LUXURY|EXOTIC|SUPER|HIGHEND|HIGH_END)/.test(name)
  ) {
    return {
      min: 4,
      max: 5,
      label: "Rich / Luxury"
    };
  }

  return null;
}

function renderSwanknessBlock(
  meta,
  groupName = ""
) {
  const rawValue =
    meta.swankness || "UNKNOWN";

  const level =
    getSwanknessLevel(rawValue);

  const target =
    getExpectedSwanknessForGroup(
      groupName
    );

  let warningHTML = "";

  if (
    target &&
    level !== null &&
    (
      level < target.min ||
      level > target.max
    )
  ) {
    warningHTML = `
      <div class="swankness-warning">
        Metadata mismatch:
        ${escapeHTML(rawValue)} may not fit
        ${escapeHTML(target.label)} traffic.
      </div>
    `;
  }

  return `
    <div class="swankness-row">
      <strong>Swankness:</strong>

      <span class="swankness-badge swankness-${
        level || "unknown"
      }">
        ${escapeHTML(rawValue)}
      </span>

      ${
        level !== null
          ? `
            <span class="swankness-label">
              ${escapeHTML(
                getSwanknessLabel(level)
              )}
            </span>
          `
          : ""
      }
    </div>

    ${warningHTML}
  `;
}

function renderMetaBox(
  meta,
  groupName = ""
) {
  return `
    <div class="meta-box">
      ${
        meta.gameName
          ? `
            <div>
              <strong>Game:</strong>
              ${escapeHTML(meta.gameName)}
            </div>
          `
          : ""
      }

      ${
        meta.vehicleMakeName
          ? `
            <div>
              <strong>Make:</strong>
              ${escapeHTML(
                meta.vehicleMakeName
              )}
            </div>
          `
          : ""
      }

      ${
        meta.vehicleClass
          ? `
            <div>
              <strong>Class:</strong>
              ${escapeHTML(meta.vehicleClass)}
            </div>
          `
          : ""
      }

      ${
        meta.handlingId
          ? `
            <div>
              <strong>Handling:</strong>
              ${escapeHTML(meta.handlingId)}
            </div>
          `
          : ""
      }

      ${
        meta.vehicleType
          ? `
            <div>
              <strong>Type:</strong>
              ${escapeHTML(meta.vehicleType)}
            </div>
          `
          : ""
      }

      ${renderSwanknessBlock(
        meta,
        groupName
      )}

      ${
        meta.lodDistances?.length
          ? `
            <div>
              <strong>LOD values:</strong>
              ${escapeHTML(
                formatLodDistances(
                  meta.lodDistances
                )
              )}
            </div>
          `
          : ""
      }

      ${
        meta.sourceFile
          ? `
            <div>
              <strong>Meta:</strong>
              ${escapeHTML(meta.sourceFile)}
            </div>
          `
          : ""
      }
    </div>
  `;
}

// [END MODULE: SWANKNESS_DISPLAY]

// =====================================================
// [MODULE: PACK_RENDERING]
// Renders compact pack information and the Mod Pack list.
// =====================================================

function renderPackBox(pack) {
  return `
    <div class="pack-box">
      <div>
        <strong>Pack:</strong>
        ${escapeHTML(pack.name)}
      </div>

      ${
        pack.creator
          ? `
            <div>
              <strong>Creator:</strong>
              ${escapeHTML(pack.creator)}
            </div>
          `
          : ""
      }

      ${
        pack.dlcFolder
          ? `
            <div>
              <strong>DLC:</strong>
              ${escapeHTML(pack.dlcFolder)}
            </div>
          `
          : ""
      }

      ${
        pack.website
          ? `
            <div>
              <strong>Site:</strong>

              <a
                href="${escapeAttribute(pack.website)}"
                target="_blank"
                rel="noopener noreferrer"
                style="color:#7dd3fc"
              >
                Open
              </a>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderPackList() {
  els.packList.innerHTML = "";

  const query = els.packSearchBox.value
    .toLowerCase()
    .trim();

  const packs =
    Object.values(packDatabase.packs)
      .sort((a, b) =>
        (a.name || "").localeCompare(
          b.name || ""
        )
      );

  if (!packs.length) {
    els.packList.innerHTML = `
      <p class="small">
        No packs saved yet. Create a pack, select it,
        then import that pack's vehicles.meta.
      </p>
    `;

    return;
  }

  packs.forEach(pack => {
    const vehicles =
      getVehiclesForPack(pack.id);

    const searchBlob = [
      pack.name,
      pack.creator,
      pack.dlcFolder,
      pack.version,
      pack.website,
      pack.notes,
      ...vehicles
    ]
      .join(" ")
      .toLowerCase();

    if (
      query &&
      !searchBlob.includes(query)
    ) {
      return;
    }

    const item =
      document.createElement("div");

    item.className = "pack-item";

    const isActive =
      pack.id === activePackId;

    const open =
      openPackItems.has(pack.id) || query;

    item.innerHTML = `
      <div class="pack-header">
        ${isActive ? "⭐ " : ""}
        ${escapeHTML(pack.name)}

        <span class="count">
          — ${vehicles.length} vehicles
        </span>
      </div>

      <div
        class="pack-body"
        style="display:${open ? "block" : "none"}"
      >
        <div class="small">
          ${
            pack.creator
              ? `
                <div>
                  <strong>Creator:</strong>
                  ${escapeHTML(pack.creator)}
                </div>
              `
              : ""
          }

          ${
            pack.dlcFolder
              ? `
                <div>
                  <strong>DLC:</strong>
                  ${escapeHTML(pack.dlcFolder)}
                </div>
              `
              : ""
          }

          ${
            pack.version
              ? `
                <div>
                  <strong>Version:</strong>
                  ${escapeHTML(pack.version)}
                </div>
              `
              : ""
          }

          ${
            pack.website
              ? `
                <div>
                  <strong>Website:</strong>

                  <a
                    href="${escapeAttribute(pack.website)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="color:#7dd3fc"
                  >
                    Open
                  </a>
                </div>
              `
              : ""
          }

          ${
            pack.notes
              ? `
                <div>
                  <strong>Notes:</strong>
                  ${escapeHTML(pack.notes)}
                </div>
              `
              : ""
          }
        </div>

        <div class="pack-controls">
          <button
            onclick="selectPack(
              '${escapeAttribute(pack.id)}'
            )"
          >
            Select/Edit
          </button>

          <button
            class="danger"
            onclick="deletePack(
              '${escapeAttribute(pack.id)}'
            )"
          >
            Delete
          </button>
        </div>

        <h4>Vehicles</h4>

        <div class="pack-vehicle-list">
          ${
            vehicles.length
              ? vehicles
                  .map(vehicle => `
                    <div>
                      ${escapeHTML(vehicle)}
                    </div>
                  `)
                  .join("")
              : `
                <div class="small">
                  No vehicles assigned yet.
                </div>
              `
          }
        </div>
      </div>
    `;

    const body =
      item.querySelector(".pack-body");

    item
      .querySelector(".pack-header")
      .addEventListener("click", () => {
        const isOpen =
          body.style.display === "block";

        body.style.display =
          isOpen ? "none" : "block";

        if (isOpen) {
          openPackItems.delete(pack.id);
        } else {
          openPackItems.add(pack.id);
        }
      });

    els.packList.appendChild(item);
  });
}

// [END MODULE: PACK_RENDERING]

// =====================================================
// [MODULE: STATISTICS_RENDERING]
// Updates the summary beneath the import controls.
// =====================================================

function updateStats() {
  const vehicleCount =
    parsedData.vehicles.flatMap(
      group => group.models
    ).length;

  const pedCount =
    parsedData.peds.flatMap(
      group => group.models
    ).length;

  const allVehicles =
    parsedData.vehicles.flatMap(
      group => group.models
    );

  const duplicates =
    allVehicles.filter(
      (item, index) =>
        allModelsFirstIndex(
          item,
          allVehicles
        ) !== index
    );

  const metaMatches =
    allVehicles.filter(vehicle =>
      vehicleMeta[vehicle.toLowerCase()]
    ).length;

  const metaMissing =
    vehicleCount - metaMatches;

  const assigned =
    allVehicles.filter(vehicle =>
      getPackForModel(vehicle)
    ).length;

  const unassigned =
    vehicleCount - assigned;

  const scannedInPopgroups =
    allVehicles.filter(vehicle =>
      getVehicleAsset(vehicle)
    ).length;

  const highRiskInPopgroups =
    allVehicles.filter(vehicle => {
      const label = getLoadTier(
        getVehicleAsset(vehicle)
          ?.totalBytes || 0
      ).label;

      return (
        label === "Extreme" ||
        label === "Critical"
      );
    }).length;

  els.stats.innerHTML = `
    <p class="small">
      Vehicle Groups:
      ${parsedData.vehicles.length} |

      Vehicles in Popgroups:
      ${vehicleCount} |

      Vehicle Library:
      ${Object.keys(vehicleMeta).length} |

      Asset Records:
      ${Object.keys(vehicleAssets).length} |

      Scanned in Popgroups:
      ${scannedInPopgroups} |

      Extreme/Critical Uses:
      ${highRiskInPopgroups} |

      Saved Packs:
      ${Object.keys(packDatabase.packs).length} |

      Pack Assigned:
      ${assigned} |

      Unassigned:
      ${unassigned} |

      Ped Groups:
      ${parsedData.peds.length} |

      Peds:
      ${pedCount} |

      Duplicate Vehicles:
      ${new Set(duplicates).size} |

      Meta Files:
      ${loadedMetaFiles.length} |

      Meta Matches:
      ${metaMatches} |

      Missing Meta:
      ${metaMissing}
    </p>
  `;
}

function allModelsFirstIndex(
  item,
  models
) {
  return models.indexOf(item);
}

// [END MODULE: STATISTICS_RENDERING]
