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

  renderHiddenGroupsBar(section, data);

  data.forEach((group, groupIndex) => {
    const isHidden =
      hiddenGroups[section].has(group.name);

    if (isHidden && !showHiddenGroups[section]) {
      return;
    }

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

    const isMultiplayerGroup =
      /_MP$/i.test(group.name.trim());

    const mpGroupName  = group.name.trim() + "_MP";
    const hasMpPartner = !isMultiplayerGroup &&
      parsedData[section].some(g => g.name === mpGroupName);

    const groupDiv =
      document.createElement("div");

    groupDiv.className = [
      "group",
      isMultiplayerGroup ? "group-mp" : "group-vanilla",
      isHidden ? "group-hidden-visible" : ""
    ].filter(Boolean).join(" ");

    groupDiv.innerHTML = `
      <div class="group-header">
        <strong>${escapeHTML(group.name)}</strong>

        ${
          isMultiplayerGroup
            ? '<span class="pg-mp-badge">Multiplayer</span>'
            : '<span class="pg-sp-badge">Singleplayer</span>'
        }

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
            ? renderVanillaCountBadge(group.name, group.models.length)
            : ""
        }

        <button
          type="button"
          class="group-expand-cards-button"
          onclick="event.stopPropagation(); expandGroupCards('${escapeAttribute(section)}', ${groupIndex})"
          title="Expand all vehicle cards in this group"
        >Expand All</button>

        <button
          type="button"
          class="group-expand-cards-button"
          onclick="event.stopPropagation(); collapseGroupCards('${escapeAttribute(section)}', ${groupIndex})"
          title="Collapse all vehicle cards in this group"
        >Collapse All</button>

        <button
          type="button"
          class="group-quick-clear-button"
          onclick="event.stopPropagation(); if(typeof window.quickClearPopgroupsGroup === 'function') window.quickClearPopgroupsGroup('${escapeHTML(section)}', ${groupIndex});"
          title="Remove all vehicle entries from this group"
        >Clear All</button>

        ${hasMpPartner ? `
        <button
          type="button"
          class="group-copy-mp-button"
          onclick="event.stopPropagation(); copyGroupToMP('${escapeAttribute(section)}', ${groupIndex})"
          title="Copy all entries from this group into ${escapeAttribute(mpGroupName)}, replacing its current list"
        >Copy to MP</button>
        ` : ""}
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

    const hideButton =
      groupDiv.querySelector("[data-hide-group]");

    if (hideButton) {
      hideButton.addEventListener("click", event => {
        // Don't let this also trigger the group-header's open/close toggle.
        event.stopPropagation();

        if (hiddenGroups[section].has(group.name)) {
          hiddenGroups[section].delete(group.name);
        } else {
          hiddenGroups[section].add(group.name);
        }

        if (typeof schedulePopgroupsProjectSave === "function") {
          schedulePopgroupsProjectSave();
        }

        renderSection(section);
      });
    }

    els.results.appendChild(groupDiv);
  });

  updateStats();
}

function renderHiddenGroupsBar(section, data) {
  const bar = document.getElementById("hiddenGroupsBar");
  if (!bar) return;

  const mpGroups = data.filter(group => /_MP$/i.test(group.name.trim()));
  const hiddenCount = data.filter(group => hiddenGroups[section].has(group.name)).length;
  const visibleMpCount = mpGroups.filter(group => !hiddenGroups[section].has(group.name)).length;

  if (!hiddenCount && !visibleMpCount) {
    bar.hidden = true;
    bar.innerHTML = "";
    return;
  }

  bar.hidden = false;

  bar.innerHTML = `
    ${visibleMpCount > 0 ? `
      <button type="button" id="pgHideAllMp" class="secondary">
        Hide all ${visibleMpCount} Multiplayer group${visibleMpCount === 1 ? "" : "s"}
      </button>
    ` : ""}
    ${hiddenCount > 0 ? `
      <span>${hiddenCount} multiplayer group${hiddenCount === 1 ? "" : "s"} hidden</span>
      <button type="button" id="pgToggleHiddenGroups" class="secondary">
        ${showHiddenGroups[section] ? "Hide the hidden groups again" : "Show hidden groups"}
      </button>
    ` : ""}
  `;

  document.getElementById("pgHideAllMp")?.addEventListener("click", () => {
    mpGroups.forEach(group => hiddenGroups[section].add(group.name));
    if (typeof schedulePopgroupsProjectSave === "function") schedulePopgroupsProjectSave();
    renderSection(section);
  });

  document.getElementById("pgToggleHiddenGroups")?.addEventListener("click", () => {
    showHiddenGroups[section] = !showHiddenGroups[section];
    renderSection(section);
  });
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

function toggleVehicleCardDetails(event) {
  event.stopPropagation();
  const btn = event.currentTarget;
  const card = btn?.closest?.(".vehicle-card");
  if (!card) return;
  const expanded = card.classList.toggle("vehicle-card-open");
  btn.setAttribute("aria-expanded", expanded ? "true" : "false");

  // Persist so re-renders (from delete/add) restore this card's open state
  const key = `${card.dataset.section}-${card.dataset.groupindex}-${card.dataset.model}`;
  try {
    if (expanded) openVehicleCards.add(key);
    else openVehicleCards.delete(key);
  } catch {}
}

function expandGroupCards(section, groupIndex) {
  const group = parsedData?.[section]?.[groupIndex];
  if (!group?.models) return;
  group.models.forEach(m => {
    openVehicleCards.add(`${section}-${groupIndex}-${String(m).toLowerCase()}`);
  });
  // Apply directly — no full re-render needed
  document.querySelectorAll(
    `.vehicle-card[data-section="${section}"][data-groupindex="${groupIndex}"]`
  ).forEach(card => {
    card.classList.add("vehicle-card-open");
    card.querySelector(".vehicle-card-toggle")?.setAttribute("aria-expanded", "true");
  });
}

function collapseGroupCards(section, groupIndex) {
  const group = parsedData?.[section]?.[groupIndex];
  if (!group?.models) return;
  group.models.forEach(m => {
    openVehicleCards.delete(`${section}-${groupIndex}-${String(m).toLowerCase()}`);
  });
  document.querySelectorAll(
    `.vehicle-card[data-section="${section}"][data-groupindex="${groupIndex}"]`
  ).forEach(card => {
    card.classList.remove("vehicle-card-open");
    card.querySelector(".vehicle-card-toggle")?.setAttribute("aria-expanded", "false");
  });
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

          const category =
            meta?.vehicleClass || meta?.vehicleType || "";

          const cardKey = `${section}-${groupIndex}-${String(model).toLowerCase()}`;
          const isCardOpen = openVehicleCards.has(cardKey);

          const modelLower = String(model).toLowerCase();
          const modelInstalled =
            installedModels.has(modelLower) ||
            (window.GTAVanillaModels?.has(modelLower) ?? false);

          return `
            <div
              class="vehicle-card${isCardOpen ? ' vehicle-card-open' : ''}${modelInstalled ? ' is-installed' : ''}"
              draggable="true"
              data-model="${modelLower}"
              data-section="${escapeAttribute(section)}"
              data-groupindex="${groupIndex}"
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
              <button
                type="button"
                class="vehicle-card-remove-btn"
                onclick="event.stopPropagation(); removeEntry('${section}', ${groupIndex}, ${modelIndex})"
                title="Remove from group"
                aria-label="Remove ${escapeAttribute(model)}"
              >✕</button>

              ${modelInstalled ? '<span class="vehicle-card-installed-badge" title="Installed">✓</span>' : ''}

              ${renderVehicleImage(
                model,
                "vehicle-img"
              )}

              <div class="vehicle-name">
                ${escapeHTML(model)}
              </div>

              ${
                category
                  ? `<div class="vehicle-category">${escapeHTML(category)}</div>`
                  : ""
              }

              <button
                type="button"
                class="vehicle-card-toggle"
                onclick="toggleVehicleCardDetails(event)"
                aria-expanded="${isCardOpen ? 'true' : 'false'}"
              >
                <span class="vehicle-card-toggle-arrow">&#9662;</span> Details
              </button>

              <div class="vehicle-card-details">
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

                ${renderVehicleTrafficFields(meta, model, section, groupIndex)}

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
                </div>
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

          const category =
            meta?.vehicleClass || meta?.vehicleType || "";

          const cardKeyT = `${section}-${groupIndex}-${String(model).toLowerCase()}`;
          const isCardOpenT = openVehicleCards.has(cardKeyT);

          const modelLowerT = String(model).toLowerCase();
          const modelInstalledT =
            installedModels.has(modelLowerT) ||
            (window.GTAVanillaModels?.has(modelLowerT) ?? false);

          return `
            <div
              class="vehicle-card${isCardOpenT ? ' vehicle-card-open' : ''}${modelInstalledT ? ' is-installed' : ''}"
              draggable="true"
              data-model="${modelLowerT}"
              data-section="${escapeAttribute(section)}"
              data-groupindex="${groupIndex}"
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
              <button
                type="button"
                class="vehicle-card-remove-btn"
                onclick="event.stopPropagation(); removeEntry('${section}', ${groupIndex}, ${modelIndex})"
                title="Remove from group"
                aria-label="Remove ${escapeAttribute(model)}"
              >✕</button>

              ${modelInstalledT ? '<span class="vehicle-card-installed-badge" title="Installed">✓</span>' : ''}

              <div class="vehicle-name">
                ${escapeHTML(model)}
              </div>

              ${
                category
                  ? `<div class="vehicle-category">${escapeHTML(category)}</div>`
                  : ""
              }

              <button
                type="button"
                class="vehicle-card-toggle"
                onclick="toggleVehicleCardDetails(event)"
                aria-expanded="${isCardOpenT ? 'true' : 'false'}"
              >
                <span class="vehicle-card-toggle-arrow">&#9662;</span> Details
              </button>

              <div class="vehicle-card-details">
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
                  section === "vehicles"
                    ? renderVehicleTrafficFields(meta, model, section, groupIndex)
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
                </div>
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

window.mainLibraryInstalledOnly =
  window.mainLibraryInstalledOnly === true;

window.mainLibraryFavoritesOnly =
  window.mainLibraryFavoritesOnly === true;

function getMainLibraryVehicleFlags(meta) {
  const model = meta?.modelName || "";

  const cloudFlags =
    typeof window.getMainCloudVehicleLibraryFlags === "function"
      ? window.getMainCloudVehicleLibraryFlags(model)
      : null;

  return {
    installed:
      cloudFlags?.installed === true ||
      meta?.custom?.installed === true,

    favorite:
      cloudFlags?.favorite === true ||
      meta?.custom?.favorite === true
  };
}

function syncMainLibraryFilterButtons() {
  const installedButton =
    document.getElementById("mainLibraryInstalledFilter");

  const favoritesButton =
    document.getElementById("mainLibraryFavoritesFilter");

  if (installedButton) {
    installedButton.classList.toggle(
      "active",
      window.mainLibraryInstalledOnly === true
    );

    installedButton.setAttribute(
      "aria-pressed",
      String(window.mainLibraryInstalledOnly === true)
    );
  }

  if (favoritesButton) {
    favoritesButton.classList.toggle(
      "active",
      window.mainLibraryFavoritesOnly === true
    );

    favoritesButton.setAttribute(
      "aria-pressed",
      String(window.mainLibraryFavoritesOnly === true)
    );
  }
}

function toggleMainLibraryFilter(filterName) {
  if (filterName === "installed") {
    window.mainLibraryInstalledOnly =
      window.mainLibraryInstalledOnly !== true;
  }

  if (filterName === "favorites") {
    window.mainLibraryFavoritesOnly =
      window.mainLibraryFavoritesOnly !== true;
  }

  renderVehicleLibrary();

  if (typeof scheduleWorkspaceUiSave === "function") {
    scheduleWorkspaceUiSave();
  }

  if (typeof window.loadMainCloudVehicleLibraryFlags === "function") {
    window.loadMainCloudVehicleLibraryFlags({ silent: false });
  }
}

window.toggleMainLibraryFilter = toggleMainLibraryFilter;

// POPGROUPS_VEHICLE_LIBRARY_CATEGORY_GROUPS_V1
function renderVehicleLibrary() {
  const container = document.getElementById("vehicleLibrary");
  if (!container) return;

  // popgroups-workspace.js claims this container on script load and renders
  // it from the cloud vehicle list as a collapsible category list. Skip this
  // legacy renderer entirely when that's the case, instead of racing it --
  // this used to cause a visible flash (and could even revert the sidebar
  // back to this flat card layout later, e.g. after saving a pack) whenever
  // anything called renderVehicleLibrary() on the PopGroups page.
  if (container.dataset.libraryOwner === "cloud-workspace") return;

  const source =
    typeof vehicleMeta !== "undefined"
      ? vehicleMeta
      : window.vehicleMeta || {};

  const searchInput =
    document.getElementById("librarySearchBox") ||
    document.getElementById("searchBox");

  const query = (searchInput?.value || "").trim().toLowerCase();

  const vehicles = Object.entries(source || {})
    .map(([key, value]) => {
      const meta = value || {};
      return {
        ...meta,
        modelName: meta.modelName || meta.model || key
      };
    })
    .filter((meta) => meta.modelName)
    .filter((meta) => {
      if (!query) return true;

      const haystack = [
        meta.modelName,
        meta.displayName,
        meta.name,
        meta.vehicleName,
        meta.gameName,
        meta.make,
        meta.manufacturer,
        meta.model,
        meta.class,
        meta.vehicleClass,
        meta.className,
        meta.category,
        meta.packName,
        meta.dlcName,
        meta.handlingId,
        meta.handlingName
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

  if (!vehicles.length) {
    container.innerHTML = '<div class="library-empty">No vehicles match the current library filter.</div>';
    return;
  }

  const categoryOrder = [
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

  function cleanCategory(value) {
    const raw = String(value || "").trim();
    if (!raw) return "Uncategorized";

    const normalized = raw
      .replace(/^vehicle[_\s-]*/i, "")
      .replace(/^class[_\s-]*/i, "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const lower = normalized.toLowerCase();

    const known = categoryOrder.find((item) => item.toLowerCase() === lower);
    if (known) return known;

    return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getCategory(meta) {
    return cleanCategory(
      meta.vehicleClass ||
      meta.className ||
      meta.class ||
      meta.category ||
      meta.vehicleCategory ||
      meta.vehicleType ||
      meta.type
    );
  }

  const groups = new Map();

  vehicles.forEach((meta) => {
    const category = getCategory(meta);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(meta);
  });

  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);

    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;

    return a.localeCompare(b);
  });

  container.innerHTML = sortedGroups
    .map(([category, items]) => {
      const cards = items
        .sort((a, b) => String(a.modelName || "").localeCompare(String(b.modelName || "")))
        .map((meta) => renderLibraryCard(meta))
        .join("");

      return `
        <section class="library-category-group">
          <button class="library-category-header" type="button">
            <span>${escapeHTML(category)}</span>
            <strong>${items.length}</strong>
          </button>
          <div class="library-category-cards">
            ${cards}
          </div>
        </section>
      `;
    })
    .join("");
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
// [MODULE: SPAWN_PROBABILITY]
// Live spawn probability calculator for popgroups groups.
// Calculates each vehicle's effective share of traffic as:
//   frequency / sum(all frequencies in the group)
// Cars with no meta default to frequency=1 for the pool sum.
// =====================================================

function calcSpawnProbability(model, section, groupIndex) {
  if (typeof parsedData === "undefined" || typeof vehicleMeta === "undefined") return null;
  const group = parsedData?.[section]?.[groupIndex];
  if (!group?.models?.length) return null;

  let totalFreq = 0;
  let myFreq = null;
  const modelLower = String(model).toLowerCase();

  group.models.forEach(m => {
    const meta = vehicleMeta[String(m).toLowerCase()];
    const f = (meta?.frequency !== null && meta?.frequency !== undefined && !isNaN(Number(meta.frequency)))
      ? Math.max(1, Number(meta.frequency))
      : 1;
    totalFreq += f;
    if (String(m).toLowerCase() === modelLower) myFreq = f;
  });

  if (totalFreq === 0 || myFreq === null) return null;
  return (myFreq / totalFreq) * 100;
}

const _spawnSaveTimers = {};

function updateSpawnField(model, field, value, section, groupIndex) {
  const key = String(model).toLowerCase();
  window.vehicleMeta = window.vehicleMeta || {};
  window.vehicleMeta[key] = window.vehicleMeta[key] || { modelName: model };

  const numVal = (value === "" || value === null) ? null : Number(value);
  window.vehicleMeta[key][field] = numVal;

  try {
    if (typeof vehicleMeta !== "undefined") {
      vehicleMeta[key] = vehicleMeta[key] || { modelName: model };
      vehicleMeta[key][field] = numVal;
    }
  } catch {}

  refreshGroupProbabilities(section, groupIndex);

  // Debounce DB write — saves all 4 spawn fields 1s after last keystroke
  clearTimeout(_spawnSaveTimers[key]);
  _spawnSaveTimers[key] = setTimeout(() => {
    const meta = (window.vehicleMeta || {})[key] || {};
    const payload = {};
    ["frequency", "maxNum", "identicalModelSpawnDistance", "maxNumOfSameColor"].forEach(f => {
      if (meta[f] !== null && meta[f] !== undefined) payload[f] = meta[f];
    });
    if (Object.keys(payload).length && window.vehicleCloud?.updateVehicle) {
      window.vehicleCloud.updateVehicle(key, payload).catch(() => {});
    }
  }, 1000);
}

function showSpawnXmlSnippet(model) {
  const key  = String(model).toLowerCase();
  // vehicleMeta is a `let` global (state.js) — not on window.
  // _rawXml lives there; spawn field edits also mirror to window.vehicleMeta.
  const _vm  = (typeof vehicleMeta !== "undefined" ? vehicleMeta : null)
               || window.vehicleMeta || {};
  const meta = _vm[key] || {};

  let xml = null;
  let noRawMsg = null;

  if (meta._rawXml) {
    // Patch spawn values into the complete captured Item XML
    xml = meta._rawXml
      .replace(/\s+xmlns(?::[a-zA-Z0-9_]+)?="[^"]*"/g, ""); // strip xmlns=""

    const patch = (field, value) => {
      if (value === null || value === undefined || String(value).trim() === "") return;
      const v = String(value);
      const attrRx = new RegExp(`(<${field}\\s+value=")[^"]*(")`, "i");
      const txtRx  = new RegExp(`(<${field}>)[^<]*(</[^>]+>)`, "i");
      if (attrRx.test(xml)) xml = xml.replace(attrRx, `$1${v}$2`);
      else if (txtRx.test(xml)) xml = xml.replace(txtRx, `$1${v}$2`);
    };

    patch("frequency",                 meta.frequency);
    patch("maxNum",                    meta.maxNum);
    patch("identicalModelSpawnDistance", meta.identicalModelSpawnDistance);
    patch("maxNumOfSameColor",         meta.maxNumOfSameColor);
  } else {
    noRawMsg = `No vehicles.meta file has been dropped for "${model}".\n\nDrop the vehicles.meta that contains this vehicle onto the popgroups page — the full <Item> XML will appear here with your spawn values patched in, ready to copy.`;
  }

  // Reuse or create dialog
  let dlg = document.getElementById("spawnXmlDialog");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "spawnXmlDialog";
    dlg.innerHTML = `
      <div class="spawn-xml-dialog-inner">
        <div class="spawn-xml-dialog-header">
          <strong id="spawnXmlTitle"></strong>
          <button type="button" onclick="document.getElementById('spawnXmlDialog').close()">✕</button>
        </div>
        <pre id="spawnXmlCode"></pre>
        <div id="spawnXmlNoRaw" class="spawn-xml-no-raw" hidden></div>
        <div class="spawn-xml-dialog-footer">
          <button type="button" id="spawnXmlCopyBtn" onclick="spawnXmlCopy()">Copy XML</button>
          <span id="spawnXmlCopyMsg" style="font-size:12px;opacity:0;transition:opacity .4s"></span>
        </div>
      </div>`;
    document.body.appendChild(dlg);
  }

  const codeEl  = document.getElementById("spawnXmlCode");
  const noRawEl = document.getElementById("spawnXmlNoRaw");
  const copyBtn = document.getElementById("spawnXmlCopyBtn");

  document.getElementById("spawnXmlTitle").textContent = model + " — vehicles.meta Item";
  document.getElementById("spawnXmlCopyMsg").style.opacity = "0";

  if (xml) {
    codeEl.textContent   = xml;
    codeEl.hidden        = false;
    noRawEl.hidden       = true;
    noRawEl.textContent  = "";
    copyBtn.hidden       = false;
  } else {
    codeEl.textContent   = "";
    codeEl.hidden        = true;
    noRawEl.textContent  = noRawMsg;
    noRawEl.hidden       = false;
    copyBtn.hidden       = true;
  }

  dlg.showModal();
}

async function spawnXmlCopy() {
  const code = document.getElementById("spawnXmlCode")?.textContent || "";
  try {
    await navigator.clipboard.writeText(code);
    const msg = document.getElementById("spawnXmlCopyMsg");
    if (msg) { msg.textContent = "Copied!"; msg.style.opacity = "1"; setTimeout(() => { msg.style.opacity = "0"; }, 1800); }
  } catch {
    prompt("Copy this:", code);
  }
}

function refreshGroupProbabilities(section, groupIndex) {
  if (typeof parsedData === "undefined") return;
  const group = parsedData?.[section]?.[groupIndex];
  if (!group?.models) return;

  group.models.forEach(m => {
    const prob = calcSpawnProbability(m, section, groupIndex);
    const selector = `.spawn-prob-badge[data-model="${CSS.escape(String(m).toLowerCase())}"][data-section="${CSS.escape(section)}"][data-gidx="${groupIndex}"]`;
    document.querySelectorAll(selector).forEach(el => {
      if (prob === null) {
        el.textContent = "—";
        el.className = "spawn-prob-badge";
      } else {
        el.textContent = prob.toFixed(1) + "% of group";
        el.className = "spawn-prob-badge" +
          (prob > 8 ? " prob-high" : prob > 3 ? " prob-mid" : " prob-low");
      }
    });
  });
}

function renderVehicleTrafficFields(meta, model, section, groupIndex) {
  const prob    = calcSpawnProbability(model, section, groupIndex);
  const probTxt = prob !== null ? prob.toFixed(1) + "%" : "—";
  const probCls = prob === null ? "" : prob > 8 ? " prob-high" : prob > 3 ? " prob-mid" : " prob-low";
  const key     = String(model).toLowerCase();
  const safe    = meta || {};

  const val = (v) => (v !== null && v !== undefined && String(v).trim() !== "") ? String(v) : "";

  const stopClick = `onclick="event.stopPropagation()"`;

  return `
    <div class="meta-box spawn-tuning-box">
      <div class="spawn-tuning-header">
        <strong>Spawn Tuning</strong>
        <span class="spawn-prob-badge${escapeAttribute(probCls)}"
          data-model="${escapeAttribute(key)}"
          data-section="${escapeAttribute(section)}"
          data-gidx="${groupIndex}"
        >${escapeHTML(probTxt)} of group</span>
        <button type="button" class="spawn-xml-copy-btn"
          onclick="event.stopPropagation(); showSpawnXmlSnippet('${escapeAttribute(key)}')"
          title="View &amp; copy XML snippet for this vehicle"
        >⧉ XML</button>
      </div>
      <div class="spawn-tuning-fields">
        <label class="spawn-field-label">
          <span>Spawn weight</span>
          <input type="number" class="spawn-field-input" min="1" max="100"
            value="${escapeAttribute(val(safe.frequency))}"
            placeholder="1"
            ${stopClick}
            oninput="event.stopPropagation(); updateSpawnField('${escapeAttribute(key)}', 'frequency', this.value, '${escapeAttribute(section)}', ${groupIndex})"
          />
        </label>
        <label class="spawn-field-label">
          <span>Model cap</span>
          <input type="number" class="spawn-field-input" min="1" max="200"
            value="${escapeAttribute(val(safe.maxNum))}"
            placeholder="10"
            ${stopClick}
            oninput="event.stopPropagation(); updateSpawnField('${escapeAttribute(key)}', 'maxNum', this.value, '${escapeAttribute(section)}', ${groupIndex})"
          />
        </label>
        <label class="spawn-field-label">
          <span>Spacing (m)</span>
          <input type="number" class="spawn-field-input" min="50" max="2000"
            value="${escapeAttribute(val(safe.identicalModelSpawnDistance))}"
            placeholder="200"
            ${stopClick}
            oninput="event.stopPropagation(); updateSpawnField('${escapeAttribute(key)}', 'identicalModelSpawnDistance', this.value, '${escapeAttribute(section)}', ${groupIndex})"
          />
        </label>
        <label class="spawn-field-label">
          <span>Same-color cap</span>
          <input type="number" class="spawn-field-input" min="1" max="10"
            value="${escapeAttribute(val(safe.maxNumOfSameColor))}"
            placeholder="2"
            ${stopClick}
            oninput="event.stopPropagation(); updateSpawnField('${escapeAttribute(key)}', 'maxNumOfSameColor', this.value, '${escapeAttribute(section)}', ${groupIndex})"
          />
        </label>
      </div>
    </div>
  `;
}

// [END MODULE: SPAWN_PROBABILITY]

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

// =====================================================
// [MODULE: VANILLA COUNT BADGE]
// Compares a vehicle group's current entry count against
// the unmodified Rockstar baseline from vanillaPopgroupCounts.js.
// Green  = exact match
// Amber  = ±1–3 vehicles
// Red    = more than 3 off (or unknown group)
// =====================================================

function renderVanillaCountBadge(groupName, currentCount) {
  const counts = window.vanillaPopgroupCounts;
  if (!counts) return "";

  const vanillaCount = counts[groupName];
  if (vanillaCount === undefined) {
    // Non-vanilla group (add-on) — show neutral "Custom" badge
    return '<span class="pg-vanilla-badge pg-vanilla-badge--custom" title="Not a vanilla group">Custom</span>';
  }

  const diff = currentCount - vanillaCount;
  const absDiff = Math.abs(diff);

  if (absDiff === 0) {
    return `<span class="pg-vanilla-badge pg-vanilla-badge--ok" title="Matches vanilla (${vanillaCount})">✓ Vanilla</span>`;
  }

  const sign = diff > 0 ? "+" : "";
  const label = `${sign}${diff} vs vanilla`;

  if (absDiff <= 3) {
    return `<span class="pg-vanilla-badge pg-vanilla-badge--warn" title="Vanilla baseline: ${vanillaCount} vehicles">${label}</span>`;
  }

  return `<span class="pg-vanilla-badge pg-vanilla-badge--danger" title="Vanilla baseline: ${vanillaCount} vehicles">${label}</span>`;
}
