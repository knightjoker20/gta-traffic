// =====================================================
// [MODULE: POPCYCLE_BATCH_EDITOR]
// Batch editing for vehicle groups and police presence across
// selected Popcycle time slots.
//
// Features:
// - Table-row and toolbar time-slot checkboxes
// - Select All / None / Night / Day / Evening shortcuts
// - Add or update one VEH group across selected hours
// - Remove one VEH group across selected hours
// - Apply one VEH group to all 12 hours
// - Optional preservation of total vehicle-group weight
// - Police presets update BOTH PercentCopCars and VEH_COPCAR
// =====================================================

const POPCYCLE_BATCH_TIME_PRESETS = {
  all: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  none: [],
  night: [0, 1, 2, 3],
  day: [3, 4, 5, 6, 7, 8],
  evening: [9, 10, 11]
};

function ensurePopcycleBatchState() {
  if (!Array.isArray(popcycleState.selectedRowIndexes)) {
    popcycleState.selectedRowIndexes = [
      Number.isInteger(popcycleState.selectedRowIndex)
        ? popcycleState.selectedRowIndex
        : 0
    ];
  }

  popcycleState.selectedRowIndexes =
    Array.from(
      new Set(
        popcycleState.selectedRowIndexes
          .map(Number)
          .filter(index =>
            Number.isInteger(index) &&
            index >= 0 &&
            index < 12
          )
      )
    ).sort((a, b) => a - b);
}

function getPopcycleSelectedTimeIndexes() {
  ensurePopcycleBatchState();

  return [
    ...popcycleState.selectedRowIndexes
  ];
}

function isPopcycleTimeRowChecked(rowIndex) {
  ensurePopcycleBatchState();

  return popcycleState.selectedRowIndexes.includes(
    rowIndex
  );
}

function togglePopcycleBatchTimeRow(
  rowIndex,
  checked
) {
  ensurePopcycleBatchState();

  const selected = new Set(
    popcycleState.selectedRowIndexes
  );

  if (checked) {
    selected.add(rowIndex);
  } else {
    selected.delete(rowIndex);
  }

  popcycleState.selectedRowIndexes =
    Array.from(selected)
      .sort((a, b) => a - b);

  renderPopcycleBatchEditor();
  renderPopcycleBatchTableCheckboxes();
  schedulePopcycleWorkspaceSave?.();
}

function selectPopcycleBatchTimePreset(
  presetName
) {
  const indexes =
    POPCYCLE_BATCH_TIME_PRESETS[
      presetName
    ];

  if (!indexes) return;

  popcycleState.selectedRowIndexes = [
    ...indexes
  ];

  renderPopcycleBatchEditor();
  renderPopcycleBatchTableCheckboxes();
  schedulePopcycleWorkspaceSave?.();
}

function renderPopcycleBatchTableCheckboxes() {
  document
    .querySelectorAll(
      "[data-popcycle-time-checkbox]"
    )
    .forEach(input => {
      const rowIndex =
        Number.parseInt(
          input.dataset.popcycleTimeCheckbox,
          10
        );

      input.checked =
        isPopcycleTimeRowChecked(
          rowIndex
        );
    });
}

function renderPopcycleBatchEditor() {
  const host =
    document.getElementById(
      "popcycleBatchEditor"
    );

  if (!host) return;

  ensurePopcycleBatchState();

  const knownVehicleGroups =
    getKnownPopulationGroupNames(
      "vehicle"
    );

  const selectedIndexes =
    getPopcycleSelectedTimeIndexes();

  const installedReference =
    popcycleState.installedPopgroupsReference || {
      vehicles: [],
      peds: []
    };

  host.innerHTML = `
    <section class="pc-batch-editor-panel">
      <div class="pc-batch-heading">
        <div>
          <h3>Apply VEH Groups Across Time Slots</h3>

          <p class="small">
            Check the hours you want to change, then add, update,
            or remove a vehicle group across those rows at once.
          </p>
        </div>

        <div class="pc-batch-count">
          <strong>${selectedIndexes.length}</strong>
          selected hour${selectedIndexes.length === 1 ? "" : "s"}
        </div>
      </div>

      <div class="pc-batch-time-shortcuts">
        <button type="button" onclick="selectPopcycleBatchTimePreset('all')">
          Select All
        </button>

        <button type="button" class="secondary" onclick="selectPopcycleBatchTimePreset('none')">
          Clear Selection
        </button>

        <button type="button" class="secondary" onclick="selectPopcycleBatchTimePreset('night')">
          Night · 12 AM–6 AM
        </button>

        <button type="button" class="secondary" onclick="selectPopcycleBatchTimePreset('day')">
          Day · 6 AM–6 PM
        </button>

        <button type="button" class="secondary" onclick="selectPopcycleBatchTimePreset('evening')">
          Evening · 6 PM–12 AM
        </button>
      </div>

      <div class="pc-batch-time-grid">
        ${POPCYCLE_TIME_SLOTS.map((slot, rowIndex) => `
          <label class="pc-batch-time-option ${
            selectedIndexes.includes(rowIndex)
              ? "selected"
              : ""
          }">
            <input
              type="checkbox"
              ${selectedIndexes.includes(rowIndex) ? "checked" : ""}
              onchange="togglePopcycleBatchTimeRow(${rowIndex}, this.checked)"
            >

            <span>
              <strong>${escapePopcycleHTML(slot.time)}</strong>
              <small>${escapePopcycleHTML(slot.label)}</small>
            </span>
          </label>
        `).join("")}
      </div>

      <div class="pc-batch-vehicle-grid">
        <label>
          Vehicle Group

          <input
            id="pcBatchVehicleGroupName"
            list="pcBatchKnownVehicleGroups"
            value="${escapePopcycleAttribute(popcycleState.batchVehicleGroupName || "VEH_COPCAR")}"
            placeholder="Example: VEH_COPCAR"
            oninput="updatePopcycleBatchFormState('groupName', this.value)"
          >
        </label>

        <label>
          Weight

          <input
            id="pcBatchVehicleGroupWeight"
            type="number"
            min="0"
            step="1"
            value="${Number.isFinite(Number(popcycleState.batchVehicleGroupWeight)) ? Number(popcycleState.batchVehicleGroupWeight) : 5}"
            oninput="updatePopcycleBatchFormState('weight', this.value)"
          >
        </label>

        <label class="pc-batch-preserve-total">
          <input
            id="pcBatchPreserveTotal"
            type="checkbox"
            ${popcycleState.batchPreserveTotal !== false ? "checked" : ""}
            onchange="updatePopcycleBatchFormState('preserveTotal', this.checked)"
          >

          <span>
            Reduce or increase the largest normal group to
            preserve the row's current total weight
          </span>
        </label>
      </div>

      <datalist id="pcBatchKnownVehicleGroups">
        ${knownVehicleGroups
          .map(groupName => `
            <option value="${escapePopcycleAttribute(groupName)}">
          `)
          .join("")}
      </datalist>

      <div class="pc-batch-actions">
        <button
          type="button"
          class="btn-green"
          onclick="applyBatchVehicleGroup('upsert', 'selected')"
        >
          Add / Update Selected Hours
        </button>

        <button
          type="button"
          class="danger"
          onclick="applyBatchVehicleGroup('remove', 'selected')"
        >
          Remove from Selected Hours
        </button>

        <button
          type="button"
          class="btn-purple"
          onclick="applyBatchVehicleGroup('upsert', 'all')"
        >
          Apply to All 12 Hours
        </button>
      </div>

      <div class="pc-installed-popgroups-status">
        <strong>Installed Popgroups reference:</strong>
        ${installedReference.vehicles.length.toLocaleString()}
        vehicle groups ·
        ${installedReference.peds.length.toLocaleString()}
        ped groups

        ${
          installedReference.loadedFileName
            ? ` · ${escapePopcycleHTML(installedReference.loadedFileName)}`
            : " · Load and save Popgroups on the main page to expand suggestions."
        }
      </div>
    </section>
  `;
}

function updatePopcycleBatchFormState(
  field,
  value
) {
  if (field === "groupName") {
    popcycleState.batchVehicleGroupName =
      String(value || "");
  }

  if (field === "weight") {
    const parsed =
      Number.parseInt(value, 10);

    if (Number.isFinite(parsed)) {
      popcycleState.batchVehicleGroupWeight =
        Math.max(0, parsed);
    }
  }

  if (field === "preserveTotal") {
    popcycleState.batchPreserveTotal =
      Boolean(value);
  }

  if (typeof schedulePopcycleWorkspaceSave === "function") {
    schedulePopcycleWorkspaceSave();
  }
}

function getBatchVehicleGroupFormValues() {
  const nameInput =
    document.getElementById(
      "pcBatchVehicleGroupName"
    );

  const weightInput =
    document.getElementById(
      "pcBatchVehicleGroupWeight"
    );

  const preserveInput =
    document.getElementById(
      "pcBatchPreserveTotal"
    );

  const groupName =
    String(nameInput?.value || "")
      .trim()
      .replace(/\s+/g, "_");

  const weight =
    Number.parseInt(
      weightInput?.value || "0",
      10
    );

  if (
    !groupName ||
    !/^[A-Za-z0-9_]+$/.test(
      groupName
    )
  ) {
    alert(
      "Enter a valid vehicle-group name using letters, numbers, and underscores."
    );
    return null;
  }

  if (!Number.isFinite(weight)) {
    alert("Enter a valid numeric vehicle-group weight.");
    return null;
  }

  popcycleState.batchVehicleGroupName = groupName;
  popcycleState.batchVehicleGroupWeight =
    Math.max(0, weight);
  popcycleState.batchPreserveTotal =
    preserveInput?.checked !== false;

  return {
    groupName,
    weight: Math.max(0, weight),
    preserveTotal:
      popcycleState.batchPreserveTotal
  };
}

function applyBatchVehicleGroup(
  mode,
  scope = "selected"
) {
  const schedule =
    getSelectedPopcycleSchedule();

  const values =
    getBatchVehicleGroupFormValues();

  if (!schedule || !values) return;

  const targetIndexes =
    scope === "all"
      ? [...POPCYCLE_BATCH_TIME_PRESETS.all]
      : getPopcycleSelectedTimeIndexes();

  if (!targetIndexes.length) {
    alert("Select at least one time slot first.");
    return;
  }

  recordPopcycleHistory(
    `${mode === "remove" ? "Removed" : "Applied"} ${values.groupName} across ${targetIndexes.length} time slot(s)`
  );

  targetIndexes.forEach(rowIndex => {
    const row = schedule.rows[rowIndex];

    if (!row) return;

    if (mode === "remove") {
      removeGroupFromRowPreservingTotal(
        row.carGroups,
        values.groupName,
        values.preserveTotal
      );
    } else {
      setGroupWeightPreservingTotal(
        row.carGroups,
        values.groupName,
        values.weight,
        values.preserveTotal
      );
    }

    updateRowModifiedState(
      schedule.name,
      rowIndex
    );
  });

  markPopcycleDirty();
  renderAllPopcycleSections();
}

function findGroupIndexByName(
  groups,
  groupName
) {
  const target =
    String(groupName || "")
      .toLowerCase();

  return groups.findIndex(group =>
    String(group.name || "")
      .toLowerCase() === target
  );
}

function setGroupWeightPreservingTotal(
  groups,
  groupName,
  newWeight,
  preserveTotal
) {
  if (!Array.isArray(groups)) return;

  const oldTotal =
    sumGroupWeights(groups);

  const existingIndex =
    findGroupIndexByName(
      groups,
      groupName
    );

  if (existingIndex >= 0) {
    groups[existingIndex].weight =
      Math.max(0, newWeight);
  } else {
    groups.push({
      name: groupName,
      weight: Math.max(0, newWeight)
    });
  }

  if (preserveTotal && groups.length > 1) {
    rebalanceOtherVehicleGroups(
      groups,
      groupName,
      oldTotal
    );
  }
}

function removeGroupFromRowPreservingTotal(
  groups,
  groupName,
  preserveTotal
) {
  if (!Array.isArray(groups)) return;

  const oldTotal =
    sumGroupWeights(groups);

  const index =
    findGroupIndexByName(
      groups,
      groupName
    );

  if (index < 0) return;

  groups.splice(index, 1);

  if (preserveTotal && groups.length) {
    rebalanceOtherVehicleGroups(
      groups,
      "",
      oldTotal
    );
  }
}

function rebalanceOtherVehicleGroups(
  groups,
  targetGroupName,
  desiredTotal
) {
  const targetKey =
    String(targetGroupName || "")
      .toLowerCase();

  let difference =
    sumGroupWeights(groups) -
    desiredTotal;

  const adjustable =
    groups
      .filter(group =>
        String(group.name || "")
          .toLowerCase() !== targetKey
      )
      .sort(
        (a, b) =>
          Number(b.weight || 0) -
          Number(a.weight || 0)
      );

  if (!adjustable.length) return;

  if (difference > 0) {
    for (const group of adjustable) {
      if (difference <= 0) break;

      const available =
        Math.max(
          0,
          Number(group.weight) || 0
        );

      const reduction =
        Math.min(
          available,
          difference
        );

      group.weight =
        available - reduction;

      difference -= reduction;
    }
  } else if (difference < 0) {
    adjustable[0].weight =
      Math.max(
        0,
        Number(adjustable[0].weight) || 0
      ) + Math.abs(difference);
  }
}

function applyPolicePresetToSelected(
  pedPercent,
  carPercent,
  vehicleGroupWeight = carPercent
) {
  const schedule =
    getSelectedPopcycleSchedule();

  if (!schedule) return;

  const targetIndexes =
    getPopcycleSelectedTimeIndexes();

  if (!targetIndexes.length) {
    alert("Select at least one time slot first.");
    return;
  }

  const preserveTotal =
    document.getElementById(
      "pcBatchPreserveTotal"
    )?.checked !== false;

  recordPopcycleHistory(
    `Applied police preset across ${targetIndexes.length} time slot(s)`
  );

  targetIndexes.forEach(rowIndex => {
    const row = schedule.rows[rowIndex];

    if (!row) return;

    row.values.percentCopPeds =
      clampPolicePercentage(
        pedPercent
      );

    row.values.percentCopCars =
      clampPolicePercentage(
        carPercent
      );

    if (vehicleGroupWeight > 0) {
      setGroupWeightPreservingTotal(
        row.carGroups,
        "VEH_COPCAR",
        vehicleGroupWeight,
        preserveTotal
      );
    } else {
      removeGroupFromRowPreservingTotal(
        row.carGroups,
        "VEH_COPCAR",
        preserveTotal
      );
    }

    updateRowModifiedState(
      schedule.name,
      rowIndex
    );
  });

  markPopcycleDirty();
  renderAllPopcycleSections();
}

// Existing police preset buttons call this function name.
// Override the older single-row behavior so police presets now
// apply to checked time slots and include VEH_COPCAR.
window.setSelectedPolicePresence = function(
  pedPercent,
  carPercent
) {
  applyPolicePresetToSelected(
    pedPercent,
    carPercent,
    carPercent
  );
};

// [END MODULE: POPCYCLE_BATCH_EDITOR]
