// =====================================================
// [MODULE: POPCYCLE_RENDER]
// Renders schedule navigation, time rows, comparisons,
// presets, validation, change summaries, and status.
// =====================================================

function renderAllPopcycleSections() {
  renderPopcycleScheduleList();
  renderPopcycleEditor();
  renderPopcycleValidation();
  renderPopcycleOverview();
  renderPopcycleToolbarState();

  if (typeof renderPopcycleWorkspaceStatus === "function") {
    renderPopcycleWorkspaceStatus();
  }
}

function renderPopcycleScheduleList() {
  const host =
    document.getElementById(
      "popcycleScheduleList"
    );

  if (!host || !popcycleState.current) {
    return;
  }

  const search =
    popcycleState.search;

  const filter =
    popcycleState.filter;

  const scheduleNames =
    popcycleState.current.order.filter(
      scheduleName => {
        const matchesSearch =
          !search ||
          scheduleName
            .toLowerCase()
            .includes(search);

        if (!matchesSearch) return false;

        if (filter === "modified") {
          return isScheduleModified(
            scheduleName
          );
        }

        if (filter === "warnings") {
          return scheduleHasWarnings(
            scheduleName
          );
        }

        if (filter === "redline") {
          return scheduleHasBeyondRedline(
            scheduleName
          );
        }

        return true;
      }
    );

  if (!scheduleNames.length) {
    host.innerHTML = `
      <div class="pc-empty-state">
        No schedules match this filter.
      </div>
    `;
    return;
  }

  host.innerHTML =
    scheduleNames.map(scheduleName => {
      const schedule =
        popcycleState.current
          .schedules[scheduleName];

      const modifiedRows =
        schedule.rows.filter(
          row => row.modified
        ).length;

      const warningCount =
        getScheduleWarningCount(
          scheduleName
        );

      return `
        <button
          class="pc-schedule-item ${
            scheduleName ===
            popcycleState.selectedScheduleName
              ? "active"
              : ""
          }"
          type="button"
          onclick="selectPopcycleSchedule(
            '${escapePopcycleAttribute(scheduleName)}'
          )"
        >
          <span class="pc-schedule-name">
            ${escapePopcycleHTML(scheduleName)}
          </span>

          <span class="pc-schedule-meta">
            ${
              modifiedRows
                ? `${modifiedRows} modified`
                : "Stock"
            }

            ${
              warningCount
                ? ` · ${warningCount} warning${
                    warningCount === 1
                      ? ""
                      : "s"
                  }`
                : ""
            }
          </span>
        </button>
      `;
    }).join("");
}

function renderPopcycleEditor() {
  const title =
    document.getElementById(
      "selectedScheduleTitle"
    );

  const status =
    document.getElementById(
      "selectedScheduleStatus"
    );

  const tableBody =
    document.getElementById(
      "popcycleTableBody"
    );

  const groupSummary =
    document.getElementById(
      "popcycleGroupSummary"
    );

  const schedule =
    getSelectedPopcycleSchedule();

  if (
    !title ||
    !status ||
    !tableBody ||
    !groupSummary
  ) {
    return;
  }

  if (!schedule) {
    title.textContent =
      "No schedule selected";

    tableBody.innerHTML = "";
    groupSummary.innerHTML = "";
    return;
  }

  title.textContent =
    schedule.name;

  const modifiedRows =
    schedule.rows.filter(
      row => row.modified
    ).length;

  status.innerHTML = modifiedRows
    ? `<span class="pc-status-modified">${modifiedRows} modified row(s)</span>`
    : `<span class="pc-status-stock">Matches loaded source</span>`;

  tableBody.innerHTML =
    schedule.rows.map(
      (row, rowIndex) =>
        renderPopcycleTimeRow(
          schedule,
          row,
          rowIndex
        )
    ).join("");

  groupSummary.innerHTML =
    renderGroupSummary(schedule);

  renderPopcycleAreaMap();

  if (typeof renderPopcycleBatchEditor === "function") {
    renderPopcycleBatchEditor();
  }
}

function renderPopcycleTimeRow(
  schedule,
  row,
  rowIndex
) {
  const slot =
    POPCYCLE_TIME_SLOTS[rowIndex];

  const stockRow =
    getStockRow(
      schedule.name,
      rowIndex
    );

  const redlineRow =
    getRedlineRow(
      schedule.name,
      rowIndex
    );

  return `
    <tr
      class="${
        row.modified
          ? "pc-row-modified"
          : ""
      } ${
        rowIndex ===
        popcycleState.selectedRowIndex
          ? "pc-row-selected"
          : ""
      }"
      onclick="selectPopcycleTimeRow(${rowIndex})"
    >
      <td class="pc-time-select-cell">
        <input
          type="checkbox"
          data-popcycle-time-checkbox="${rowIndex}"
          ${
            typeof isPopcycleTimeRowChecked === "function" &&
            isPopcycleTimeRowChecked(rowIndex)
              ? "checked"
              : ""
          }
          aria-label="Select ${escapePopcycleAttribute(slot?.time || `row ${rowIndex + 1}`)} for batch editing"
          onclick="event.stopPropagation()"
          onchange="togglePopcycleBatchTimeRow(${rowIndex}, this.checked)"
        >
      </td>

      <th scope="row">
        <div
          class="pc-time-badge pc-period-${slot?.period || "day"}"
        >
          <strong>
            ${escapePopcycleHTML(
              slot?.time || `Row ${rowIndex + 1}`
            )}
          </strong>

          <span>
            ${escapePopcycleHTML(
              slot?.label || ""
            )}
          </span>
        </div>
      </th>

      ${POPCYCLE_FIELDS.map(field =>
        renderPopcycleValueCell(
          schedule.name,
          row,
          rowIndex,
          field,
          stockRow,
          redlineRow
        )
      ).join("")}

      <td class="pc-groups-cell">
        <div>
          <strong>
            ${row.pedGroups.length}
          </strong>
          ped groups
        </div>

        <div>
          <strong>
            ${row.carGroups.length}
          </strong>
          vehicle groups
        </div>

        <small>
          Peds weight:
          ${sumGroupWeights(row.pedGroups)}
          · Cars weight:
          ${sumGroupWeights(row.carGroups)}
        </small>
      </td>
    </tr>
  `;
}

function renderPopcycleValueCell(
  scheduleName,
  row,
  rowIndex,
  field,
  stockRow,
  redlineRow
) {
  const currentValue =
    row.values[field.key];

  const stockValue =
    stockRow?.values?.[field.key];

  const redlineValue =
    redlineRow?.values?.[field.key];

  const level =
    getComparisonLevel(
      currentValue,
      stockValue,
      redlineValue
    );

  return `
    <td class="pc-value-cell pc-level-${level}">
      <input
        class="pc-number-input"
        type="number"
        min="0"
        step="1"
        value="${currentValue}"
        aria-label="${
          escapePopcycleAttribute(
            `${scheduleName} ${getTimeSlotLabel(rowIndex)} ${field.label}`
          )
        }"
        onchange="updatePopcycleValue(
          '${escapePopcycleAttribute(scheduleName)}',
          ${rowIndex},
          '${field.key}',
          this.value
        )"
      >

      <div class="pc-reference-values">
        <span title="Stock Traffic">
          S: ${Number.isFinite(stockValue) ? stockValue : "—"}
        </span>

        <span title="Traffic Redline">
          R: ${Number.isFinite(redlineValue) ? redlineValue : "—"}
        </span>
      </div>
    </td>
  `;
}

function renderGroupSummary(schedule) {
  const rowIndex =
    popcycleState.selectedRowIndex || 0;

  const selectedRow =
    schedule.rows[rowIndex] ||
    schedule.rows[0];

  const slot =
    POPCYCLE_TIME_SLOTS[rowIndex];

  if (!selectedRow) {
    return "";
  }

  const pedItems =
    buildPopulationMixItems(
      selectedRow.pedGroups,
      "ped"
    );

  const vehicleItems =
    buildPopulationMixItems(
      selectedRow.carGroups,
      "vehicle"
    );

  const knownPedGroups =
    getKnownPopulationGroupNames(
      "ped"
    );

  const knownVehicleGroups =
    getKnownPopulationGroupNames(
      "vehicle"
    );

  return `
    <div class="pc-group-summary-card">
      <div class="pc-mix-header">
        <div>
          <h3>
            Hourly Population Mix:
            ${escapePopcycleHTML(slot?.time || "")}
          </h3>

          <div class="pc-mix-period">
            ${escapePopcycleHTML(slot?.label || "")}
          </div>
        </div>

        <div class="pc-hour-copy-actions">
          <button
            type="button"
            class="secondary"
            onclick="copySelectedHourlyMix('previous')"
            ${
              rowIndex === 0
                ? "disabled"
                : ""
            }
          >
            Copy to Previous
          </button>

          <button
            type="button"
            class="secondary"
            onclick="copySelectedHourlyMix('next')"
            ${
              rowIndex ===
              schedule.rows.length - 1
                ? "disabled"
                : ""
            }
          >
            Copy to Next
          </button>

          <button
            type="button"
            class="secondary"
            onclick="copySelectedHourlyMix('all')"
          >
            Copy Mix to All Hours
          </button>
        </div>
      </div>

      <p class="small">
        Adjust pedestrian and vehicle group weights for this
        specific two-hour period. GTA treats these as relative
        weights, so they do not have to total 100. Normalize is
        an optional convenience.
      </p>

      <div class="pc-mix-narrative">
        <p>
          ${escapePopcycleHTML(
            buildPopulationMixSentence(
              pedItems,
              "ped"
            )
          )}
        </p>

        <p>
          ${escapePopcycleHTML(
            buildPopulationMixSentence(
              vehicleItems,
              "vehicle"
            )
          )}
        </p>
      </div>

      ${renderPoliceMixEditor(
        selectedRow
      )}

      <div class="pc-group-columns pc-editable-group-columns">
        <div class="pc-group-editor-column">
          <div class="pc-group-editor-heading">
            <div>
              <h4>Pedestrian Groups</h4>
              <span>
                Total weight:
                ${sumGroupWeights(
                  selectedRow.pedGroups
                )}
              </span>
            </div>

            <button
              type="button"
              class="secondary"
              onclick="normalizeSelectedPopulationGroups('ped')"
            >
              Normalize to 100
            </button>
          </div>

          ${renderEditablePopulationMixList(
            pedItems,
            "ped"
          )}

          ${renderGroupAddForm(
            "ped",
            knownPedGroups
          )}
        </div>

        <div class="pc-group-editor-column">
          <div class="pc-group-editor-heading">
            <div>
              <h4>Vehicle Groups</h4>
              <span>
                Total weight:
                ${sumGroupWeights(
                  selectedRow.carGroups
                )}
              </span>
            </div>

            <button
              type="button"
              class="secondary"
              onclick="normalizeSelectedPopulationGroups('vehicle')"
            >
              Normalize to 100
            </button>
          </div>

          ${renderEditablePopulationMixList(
            vehicleItems,
            "vehicle"
          )}

          ${renderGroupAddForm(
            "vehicle",
            knownVehicleGroups
          )}
        </div>
      </div>
    </div>
  `;
}

function renderPoliceMixEditor(row) {
  return `
    <div class="pc-police-editor">
      <div>
        <h4>Police Presence</h4>

        <p class="small">
          Manual percentage fields edit the current hour. The
          preset buttons apply to all checked hours and update
          both the police percentages and VEH_COPCAR weight.
        </p>
      </div>

      <div class="pc-police-inputs">
        <label>
          Police Peds %

          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value="${row.values.percentCopPeds}"
            onchange="updateSelectedPolicePercentage(
              'percentCopPeds',
              this.value
            )"
          >
        </label>

        <label>
          Police Cars %

          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value="${row.values.percentCopCars}"
            onchange="updateSelectedPolicePercentage(
              'percentCopCars',
              this.value
            )"
          >
        </label>
      </div>

      <div class="pc-police-selection-note">
        Presets apply to
        <strong>
          ${
            typeof getPopcycleSelectedTimeIndexes === "function"
              ? getPopcycleSelectedTimeIndexes().length
              : 1
          } checked hour(s)
        </strong>
      </div>

      <div class="pc-police-presets">
        <button
          type="button"
          onclick="setSelectedPolicePresence(0, 0)"
        >
          Quiet · 0%
        </button>

        <button
          type="button"
          onclick="setSelectedPolicePresence(2, 2)"
        >
          Routine · 2%
        </button>

        <button
          type="button"
          onclick="setSelectedPolicePresence(5, 5)"
        >
          Visible · 5%
        </button>

        <button
          type="button"
          onclick="setSelectedPolicePresence(10, 10)"
        >
          Heavy · 10%
        </button>

        <button
          type="button"
          class="danger"
          onclick="setSelectedPolicePresence(20, 20)"
        >
          Crackdown · 20%
        </button>
      </div>
    </div>
  `;
}

function renderEditablePopulationMixList(
  items,
  type
) {
  if (!items?.length) {
    return `
      <div class="pc-empty-state">
        No groups assigned to this hour.
      </div>
    `;
  }

  return `
    <div class="pc-mix-list">
      ${items.map(item => `
        <div class="pc-mix-item pc-mix-item-editable">
          <div class="pc-mix-item-heading">
            <div>
              <strong>
                ${escapePopcycleHTML(item.label)}
              </strong>

              <small>
                ${escapePopcycleHTML(item.sourceName)}
              </small>
            </div>

            <span>
              ${item.percentage.toFixed(1)}%
            </span>
          </div>

          <div class="pc-mix-edit-row">
            <label>
              Weight

              <input
                type="number"
                min="0"
                step="1"
                value="${item.weight}"
                onchange="updateSelectedPopulationGroupWeight(
                  '${type}',
                  ${item.sourceIndex},
                  this.value
                )"
              >
            </label>

            <button
              type="button"
              class="danger"
              onclick="removeSelectedPopulationGroup(
                '${type}',
                ${item.sourceIndex}
              )"
            >
              Remove
            </button>
          </div>

          <div class="pc-mix-bar">
            <span
              style="width:${Math.min(
                100,
                Math.max(
                  0,
                  item.percentage
                )
              )}%"
            ></span>
          </div>

          <p>
            ${escapePopcycleHTML(item.detail)}
          </p>
        </div>
      `).join("")}
    </div>
  `;
}

function renderGroupAddForm(
  type,
  knownGroups
) {
  const isPed =
    type === "ped";

  const nameInputId =
    isPed
      ? "pcPedGroupNameInput"
      : "pcVehicleGroupNameInput";

  const weightInputId =
    isPed
      ? "pcPedGroupWeightInput"
      : "pcVehicleGroupWeightInput";

  const datalistId =
    isPed
      ? "pcKnownPedGroups"
      : "pcKnownVehicleGroups";

  return `
    <div class="pc-group-add-form">
      <h5>
        Add ${isPed
          ? "Pedestrian"
          : "Vehicle"} Group
      </h5>

      <div class="pc-group-add-grid">
        <input
          id="${nameInputId}"
          list="${datalistId}"
          placeholder="${
            isPed
              ? "Example: Alta_Tramps"
              : "Example: VEH_MID"
          }"
        >

        <input
          id="${weightInputId}"
          type="number"
          min="0"
          step="1"
          value="10"
          aria-label="New group weight"
        >

        <button
          type="button"
          onclick="addSelectedPopulationGroup('${type}')"
        >
          Add Group
        </button>
      </div>

      <datalist id="${datalistId}">
        ${knownGroups
          .map(groupName => `
            <option value="${escapePopcycleAttribute(groupName)}">
          `)
          .join("")}
      </datalist>
    </div>
  `;
}

function renderPopcyclePresets() {
  const host =
    document.getElementById(
      "popcyclePresetButtons"
    );

  if (!host) return;

  host.innerHTML =
    POPCYCLE_PRESETS.map(preset => `
      <button
        type="button"
        class="pc-preset-button pc-preset-${preset.id}"
        title="${escapePopcycleAttribute(preset.description)}"
        onclick="applyPresetToSelectedSchedule('${preset.id}')"
      >
        ${escapePopcycleHTML(preset.label)}
      </button>
    `).join("");
}

function renderPopcycleValidation() {
  const host =
    document.getElementById(
      "popcycleValidation"
    );

  if (!host) return;

  const validation =
    popcycleState.validation;

  const errors =
    validation.errors || [];

  const warnings =
    validation.warnings || [];

  host.innerHTML = `
    <div class="pc-validation-summary">
      <span class="${
        errors.length
          ? "pc-validation-error"
          : "pc-validation-ok"
      }">
        ${errors.length} error(s)
      </span>

      <span class="${
        warnings.length
          ? "pc-validation-warning"
          : "pc-validation-ok"
      }">
        ${warnings.length} warning(s)
      </span>
    </div>

    ${
      errors.length
        ? `
          <details open>
            <summary>Export-blocking errors</summary>
            <ul>
              ${errors
                .slice(0, 50)
                .map(error =>
                  `<li>${escapePopcycleHTML(error)}</li>`
                )
                .join("")}
            </ul>
          </details>
        `
        : ""
    }

    ${
      warnings.length
        ? `
          <details>
            <summary>Warnings and review items</summary>
            <ul>
              ${warnings
                .slice(0, 100)
                .map(warning =>
                  `<li>${escapePopcycleHTML(warning)}</li>`
                )
                .join("")}
            </ul>
          </details>
        `
        : ""
    }
  `;
}

function renderPopcycleOverview() {
  const host =
    document.getElementById(
      "popcycleOverview"
    );

  if (!host || !popcycleState.current) {
    return;
  }

  const modifiedSchedules =
    getModifiedScheduleNames();

  const modifiedRows =
    popcycleState.current.order.reduce(
      (total, scheduleName) =>
        total +
        popcycleState.current
          .schedules[scheduleName]
          .rows
          .filter(row => row.modified)
          .length,
      0
    );

  host.innerHTML = `
    <div class="pc-overview-stat">
      <small>Schedules</small>
      <strong>
        ${popcycleState.current.order.length}
      </strong>
    </div>

    <div class="pc-overview-stat">
      <small>Modified schedules</small>
      <strong>
        ${modifiedSchedules.length}
      </strong>
    </div>

    <div class="pc-overview-stat">
      <small>Modified rows</small>
      <strong>
        ${modifiedRows}
      </strong>
    </div>

    <div class="pc-overview-stat">
      <small>Errors</small>
      <strong>
        ${popcycleState.validation.errors.length}
      </strong>
    </div>

    <div class="pc-overview-stat">
      <small>Warnings</small>
      <strong>
        ${popcycleState.validation.warnings.length}
      </strong>
    </div>
  `;
}

function renderPopcycleToolbarState() {
  const undoButton =
    document.getElementById(
      "popcycleUndoButton"
    );

  const redoButton =
    document.getElementById(
      "popcycleRedoButton"
    );

  const restoreButton =
    document.getElementById(
      "restoreDraftButton"
    );

  if (undoButton) {
    undoButton.disabled =
      !popcycleState.history.length;
  }

  if (redoButton) {
    redoButton.disabled =
      !popcycleState.future.length;
  }

  if (restoreButton) {
    restoreButton.hidden =
      !hasSavedPopcycleDraft();
  }
}

function renderPopcycleFileStatus(
  message,
  isError = false
) {
  const host =
    document.getElementById(
      "popcycleFileStatus"
    );

  if (!host) return;

  host.innerHTML = `
    <span class="${
      isError
        ? "warning"
        : "saved"
    }">
      ${escapePopcycleHTML(message)}
    </span>
  `;
}

function renderDraftStatus(
  message,
  isError = false
) {
  const host =
    document.getElementById(
      "popcycleDraftStatus"
    );

  if (!host) return;

  host.innerHTML = `
    <span class="${
      isError
        ? "warning"
        : "saved"
    }">
      ${escapePopcycleHTML(message)}
    </span>
  `;

  renderPopcycleToolbarState();
}

function getModifiedScheduleNames() {
  if (!popcycleState.current) return [];

  return popcycleState.current.order.filter(
    scheduleName =>
      isScheduleModified(scheduleName)
  );
}

function isScheduleModified(scheduleName) {
  return Boolean(
    popcycleState.current
      ?.schedules
      ?.[scheduleName]
      ?.rows
      ?.some(row => row.modified)
  );
}

function scheduleHasWarnings(scheduleName) {
  return popcycleState.validation.warnings.some(
    warning =>
      warning.startsWith(
        `${scheduleName},`
      ) ||
      warning.startsWith(
        `${scheduleName} `
      )
  );
}

function scheduleHasBeyondRedline(scheduleName) {
  const schedule =
    popcycleState.current
      ?.schedules
      ?.[scheduleName];

  if (!schedule) return false;

  return schedule.rows.some(
    (row, rowIndex) =>
      POPCYCLE_FIELDS.some(field => {
        const redlineValue =
          getRedlineRow(
            scheduleName,
            rowIndex
          )?.values?.[field.key];

        return (
          Number.isFinite(redlineValue) &&
          row.values[field.key] >
            redlineValue
        );
      })
  );
}

function getScheduleWarningCount(scheduleName) {
  return popcycleState.validation.warnings.filter(
    warning =>
      warning.startsWith(
        `${scheduleName},`
      ) ||
      warning.startsWith(
        `${scheduleName} `
      )
  ).length;
}

function sumGroupWeights(groups) {
  return (groups || []).reduce(
    (total, group) =>
      total +
      (Number(group.weight) || 0),
    0
  );
}

function escapePopcycleHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapePopcycleAttribute(value) {
  return escapePopcycleHTML(value);
}

// [END MODULE: POPCYCLE_RENDER]
