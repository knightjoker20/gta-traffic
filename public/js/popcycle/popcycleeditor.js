// =====================================================
// [MODULE: POPCYCLE_EDITOR]
// Handles edits, history, local draft storage, schedule
// selection, search, filters, and file loading.
// =====================================================

function getSelectedPopcycleSchedule() {
  return popcycleState.current
    ?.schedules
    ?.[popcycleState.selectedScheduleName] || null;
}

function selectPopcycleSchedule(scheduleName) {
  if (
    !popcycleState.current
    ?.schedules
    ?.[scheduleName]
  ) {
    return;
  }

  popcycleState.selectedScheduleName =
    scheduleName;

  popcycleState.selectedRowIndex =
    Math.min(
      popcycleState.selectedRowIndex,
      11
    );

  renderPopcycleScheduleList();
  renderPopcycleEditor();

  if (typeof schedulePopcycleWorkspaceSave === "function") {
    schedulePopcycleWorkspaceSave();
  }
}


function selectPopcycleTimeRow(rowIndex) {
  const schedule =
    getSelectedPopcycleSchedule();

  if (
    !schedule ||
    !schedule.rows[rowIndex]
  ) {
    return;
  }

  const previousRowIndex =
    popcycleState.selectedRowIndex;

  popcycleState.selectedRowIndex =
    rowIndex;

  if (
    Array.isArray(popcycleState.selectedRowIndexes) &&
    popcycleState.selectedRowIndexes.length <= 1 &&
    (
      popcycleState.selectedRowIndexes.length === 0 ||
      popcycleState.selectedRowIndexes.includes(previousRowIndex)
    )
  ) {
    popcycleState.selectedRowIndexes = [rowIndex];
  }

  renderPopcycleEditor();

  if (typeof schedulePopcycleWorkspaceSave === "function") {
    schedulePopcycleWorkspaceSave();
  }
}

function updatePopcycleValue(
  scheduleName,
  rowIndex,
  fieldKey,
  rawValue
) {
  const schedule =
    popcycleState.current
    ?.schedules
    ?.[scheduleName];

  const row = schedule?.rows?.[rowIndex];

  if (!row) return;

  const parsedValue =
    Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue)) {
    return;
  }

  recordPopcycleHistory(
    `Edited ${scheduleName} ${getTimeSlotLabel(rowIndex)} ${fieldKey}`
  );

  row.values[fieldKey] =
    Math.max(0, parsedValue);

  updateRowModifiedState(
    scheduleName,
    rowIndex
  );

  markPopcycleDirty();
  renderPopcycleEditor();
}

function updateRowModifiedState(
  scheduleName,
  rowIndex
) {
  const row =
    popcycleState.current
    ?.schedules
    ?.[scheduleName]
    ?.rows
    ?.[rowIndex];

  const originalRow =
    popcycleState.current
    ?.originalSnapshot
    ?.schedules
    ?.[scheduleName]
    ?.rows
    ?.[rowIndex];

  if (!row || !originalRow) {
    if (row) row.modified = true;
    return;
  }

  row.modified =
    JSON.stringify(row.values) !==
      JSON.stringify(originalRow.values) ||
    JSON.stringify(row.pedGroups) !==
      JSON.stringify(originalRow.pedGroups) ||
    JSON.stringify(row.carGroups) !==
      JSON.stringify(originalRow.carGroups);
}

function resetSelectedScheduleToOriginal() {
  const schedule =
    getSelectedPopcycleSchedule();

  const originalSchedule =
    popcycleState.current
    ?.originalSnapshot
    ?.schedules
    ?.[popcycleState.selectedScheduleName];

  if (!schedule || !originalSchedule) return;

  recordPopcycleHistory(
    `Reset ${schedule.name} to loaded values`
  );

  schedule.rows =
    clonePopcycleModel(
      originalSchedule.rows
    );

  schedule.rows.forEach(row => {
    row.modified = false;
  });

  markPopcycleDirty();
  renderPopcycleEditor();
}

function recordPopcycleHistory(description) {
  if (!popcycleState.current) return;

  const snapshot = {
    description,
    selectedScheduleName:
      popcycleState.selectedScheduleName,
    selectedRowIndex:
      popcycleState.selectedRowIndex,
    current:
      createEditablePopcycleSnapshot(
        popcycleState.current
      )
  };

  popcycleState.history.push(snapshot);

  if (
    popcycleState.history.length >
    popcycleState.maxHistory
  ) {
    popcycleState.history.shift();
  }

  popcycleState.future = [];
}

function undoPopcycleEdit() {
  const previous =
    popcycleState.history.pop();

  if (!previous) return;

  popcycleState.future.push({
    description: "Redo",
    selectedScheduleName:
      popcycleState.selectedScheduleName,
    selectedRowIndex:
      popcycleState.selectedRowIndex,
    current:
      createEditablePopcycleSnapshot(
        popcycleState.current
      )
  });

  restoreEditablePopcycleSnapshot(
    previous.current
  );

  popcycleState.selectedScheduleName =
    previous.selectedScheduleName;

  popcycleState.selectedRowIndex =
    previous.selectedRowIndex ?? 0;

  markPopcycleDirty();
  renderAllPopcycleSections();
}

function redoPopcycleEdit() {
  const next =
    popcycleState.future.pop();

  if (!next) return;

  popcycleState.history.push({
    description: "Undo",
    selectedScheduleName:
      popcycleState.selectedScheduleName,
    selectedRowIndex:
      popcycleState.selectedRowIndex,
    current:
      createEditablePopcycleSnapshot(
        popcycleState.current
      )
  });

  restoreEditablePopcycleSnapshot(
    next.current
  );

  popcycleState.selectedScheduleName =
    next.selectedScheduleName;

  popcycleState.selectedRowIndex =
    next.selectedRowIndex ?? 0;

  markPopcycleDirty();
  renderAllPopcycleSections();
}

function createEditablePopcycleSnapshot(model) {
  return {
    order: clonePopcycleModel(model.order),
    schedules: clonePopcycleModel(model.schedules)
  };
}

function restoreEditablePopcycleSnapshot(snapshot) {
  popcycleState.current.order =
    clonePopcycleModel(snapshot.order);

  popcycleState.current.schedules =
    clonePopcycleModel(snapshot.schedules);
}

function markPopcycleDirty() {
  savePopcycleDraft();
  runPopcycleValidation();

  if (typeof schedulePopcycleWorkspaceSave === "function") {
    schedulePopcycleWorkspaceSave();
  }
}

function savePopcycleDraft() {
  if (!popcycleState.current) return;

  if (
    typeof popcycleWorkspaceAvailable !== "undefined" &&
    popcycleWorkspaceAvailable
  ) {
    renderDraftStatus(
      "IndexedDB autosave active."
    );
    return;
  }

  const draft = {
    savedAt: new Date().toISOString(),
    originalFileName:
      popcycleState.originalFileName,
    selectedScheduleName:
      popcycleState.selectedScheduleName,
    selectedRowIndex:
      popcycleState.selectedRowIndex,
    selectedRowIndexes:
      Array.from(popcycleState.selectedRowIndexes || []),
    areaOverrides:
      clonePopcycleModel(
        popcycleState.areaOverrides || {}
      ),
    mapLayer:
      popcycleState.mapLayer || "auto",
    mapViews:
      clonePopcycleModel(popcycleState.mapViews || {}),
    originalText:
      popcycleState.originalText,
    current:
      createEditablePopcycleSnapshot(
        popcycleState.current
      )
  };

  try {
    localStorage.setItem(
      POPCYCLE_DRAFT_KEY,
      JSON.stringify(draft)
    );

    renderDraftStatus(
      `Autosaved ${new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      })}`
    );
  } catch (error) {
    console.error(error);

    renderDraftStatus(
      "Autosave failed. Download a change report backup.",
      true
    );
  }
}

function hasSavedPopcycleDraft() {
  return Boolean(
    localStorage.getItem(
      POPCYCLE_DRAFT_KEY
    )
  );
}

function restorePopcycleDraft() {
  const raw =
    localStorage.getItem(
      POPCYCLE_DRAFT_KEY
    );

  if (!raw) return;

  try {
    const draft = JSON.parse(raw);

    const parsedOriginal =
      parsePopcycleText(
        draft.originalText,
        draft.originalFileName
      );

    parsedOriginal.originalSnapshot =
      clonePopcycleModel(parsedOriginal);

    popcycleState.current =
      parsedOriginal;

    restoreEditablePopcycleSnapshot(
      draft.current
    );

    popcycleState.originalText =
      draft.originalText;

    popcycleState.originalFileName =
      draft.originalFileName;

    popcycleState.selectedScheduleName =
      draft.selectedScheduleName ||
      popcycleState.current.order[0] ||
      "";

    popcycleState.selectedRowIndex =
      draft.selectedRowIndex ?? 0;

    popcycleState.selectedRowIndexes =
      Array.isArray(draft.selectedRowIndexes)
        ? draft.selectedRowIndexes
        : [popcycleState.selectedRowIndex];

    popcycleState.areaOverrides =
      clonePopcycleModel(
        draft.areaOverrides || {}
      );

    popcycleState.mapLayer =
      draft.mapLayer || popcycleState.mapLayer || "auto";

    popcycleState.mapViews =
      clonePopcycleModel(draft.mapViews || popcycleState.mapViews || {});

    popcycleState.history = [];
    popcycleState.future = [];

    renderAllPopcycleSections();
    renderDraftStatus(
      `Restored draft saved ${new Date(draft.savedAt).toLocaleString()}.`
    );
  } catch (error) {
    console.error(error);

    renderDraftStatus(
      "Saved draft could not be restored.",
      true
    );
  }
}

function clearPopcycleDraft() {
  localStorage.removeItem(
    POPCYCLE_DRAFT_KEY
  );

  renderDraftStatus(
    "Saved draft cleared."
  );
}

function loadStockTrafficBase() {
  loadPopcycleTextIntoEditor(
    window.GTATrafficData
      ?.stockTrafficRaw || "",
    "popcycle.dat"
  );
}

function loadPopcycleFile(file) {
  const reader = new FileReader();

  reader.onload = event => {
    loadPopcycleTextIntoEditor(
      event.target.result,
      file.name
    );
  };

  reader.onerror = () => {
    renderPopcycleFileStatus(
      `Could not read ${file.name}.`,
      true
    );
  };

  reader.readAsText(file);
}

function loadPopcycleTextIntoEditor(
  text,
  fileName
) {
  const parsed =
    parsePopcycleText(
      text,
      fileName
    );

  parsed.originalSnapshot =
    clonePopcycleModel(parsed);

  popcycleState.current = parsed;
  popcycleState.originalText =
    parsed.rawText;
  popcycleState.originalFileName =
    fileName;
  popcycleState.selectedScheduleName =
    parsed.order[0] || "";
  popcycleState.selectedRowIndex = 0;
  popcycleState.selectedRowIndexes = [0];
  popcycleState.areaOverrides = {};
  popcycleState.history = [];
  popcycleState.future = [];

  runPopcycleValidation();
  renderAllPopcycleSections();

  renderPopcycleFileStatus(
    `Loaded ${fileName}: ${parsed.order.length} schedules.`
  );

  if (typeof schedulePopcycleWorkspaceSave === "function") {
    schedulePopcycleWorkspaceSave(100);
  }
}

function setPopcycleSearch(value) {
  popcycleState.search =
    String(value || "")
      .toLowerCase()
      .trim();

  renderPopcycleScheduleList();

  if (typeof schedulePopcycleWorkspaceSave === "function") {
    schedulePopcycleWorkspaceSave();
  }
}

function setPopcycleFilter(filterName) {
  popcycleState.filter =
    filterName;

  renderPopcycleScheduleList();

  if (typeof schedulePopcycleWorkspaceSave === "function") {
    schedulePopcycleWorkspaceSave();
  }
}


// =====================================================
// [MODULE: POPCYCLE_GROUP_EDITOR]
// Edits pedestrian and vehicle group weights for the
// selected schedule and AM/PM time row.
// =====================================================

function getSelectedPopcycleRow() {
  return getSelectedPopcycleSchedule()
    ?.rows
    ?.[popcycleState.selectedRowIndex] ||
    null;
}

function getSelectedGroupCollection(
  type
) {
  const row =
    getSelectedPopcycleRow();

  if (!row) return null;

  return type === "ped"
    ? row.pedGroups
    : row.carGroups;
}

function updateSelectedPopulationGroupWeight(
  type,
  sourceIndex,
  rawValue
) {
  const schedule =
    getSelectedPopcycleSchedule();

  const groups =
    getSelectedGroupCollection(
      type
    );

  const group =
    groups?.[sourceIndex];

  const parsedValue =
    Number.parseInt(
      rawValue,
      10
    );

  if (
    !schedule ||
    !group ||
    !Number.isFinite(parsedValue)
  ) {
    return;
  }

  recordPopcycleHistory(
    `Changed ${group.name} weight at ${getTimeSlotLabel(popcycleState.selectedRowIndex)}`
  );

  group.weight =
    Math.max(0, parsedValue);

  updateRowModifiedState(
    schedule.name,
    popcycleState.selectedRowIndex
  );

  markPopcycleDirty();
  renderPopcycleEditor();
}

function removeSelectedPopulationGroup(
  type,
  sourceIndex
) {
  const schedule =
    getSelectedPopcycleSchedule();

  const groups =
    getSelectedGroupCollection(
      type
    );

  const group =
    groups?.[sourceIndex];

  if (
    !schedule ||
    !group
  ) {
    return;
  }

  recordPopcycleHistory(
    `Removed ${group.name} from ${getTimeSlotLabel(popcycleState.selectedRowIndex)}`
  );

  groups.splice(
    sourceIndex,
    1
  );

  updateRowModifiedState(
    schedule.name,
    popcycleState.selectedRowIndex
  );

  markPopcycleDirty();
  renderPopcycleEditor();
}

function addSelectedPopulationGroup(
  type,
  suppliedName = "",
  suppliedWeight = null
) {
  const schedule =
    getSelectedPopcycleSchedule();

  const groups =
    getSelectedGroupCollection(
      type
    );

  if (
    !schedule ||
    !groups
  ) {
    return;
  }

  const nameInput =
    document.getElementById(
      type === "ped"
        ? "pcPedGroupNameInput"
        : "pcVehicleGroupNameInput"
    );

  const weightInput =
    document.getElementById(
      type === "ped"
        ? "pcPedGroupWeightInput"
        : "pcVehicleGroupWeightInput"
    );

  const rawName =
    suppliedName ||
    nameInput?.value ||
    "";

  const groupName =
    String(rawName)
      .trim()
      .replace(/\s+/g, "_");

  const rawWeight =
    suppliedWeight ??
    weightInput?.value ??
    10;

  const weight =
    Number.parseInt(
      rawWeight,
      10
    );

  if (
    !groupName ||
    !/^[A-Za-z0-9_]+$/.test(
      groupName
    )
  ) {
    alert(
      "Group names may contain letters, numbers, and underscores only."
    );
    return;
  }

  if (!Number.isFinite(weight)) {
    alert(
      "Enter a valid numeric group weight."
    );
    return;
  }

  const existing =
    groups.find(group =>
      group.name.toLowerCase() ===
      groupName.toLowerCase()
    );

  if (existing) {
    alert(
      `${groupName} is already assigned to this hour. Edit its existing weight instead.`
    );
    return;
  }

  recordPopcycleHistory(
    `Added ${groupName} to ${getTimeSlotLabel(popcycleState.selectedRowIndex)}`
  );

  groups.push({
    name: groupName,
    weight:
      Math.max(0, weight)
  });

  updateRowModifiedState(
    schedule.name,
    popcycleState.selectedRowIndex
  );

  if (nameInput) {
    nameInput.value = "";
  }

  markPopcycleDirty();
  renderPopcycleEditor();
}

function addAreaReferencePedGroup(
  groupName
) {
  addSelectedPopulationGroup(
    "ped",
    groupName,
    10
  );
}

function normalizeSelectedPopulationGroups(
  type
) {
  const schedule =
    getSelectedPopcycleSchedule();

  const groups =
    getSelectedGroupCollection(
      type
    );

  if (
    !schedule ||
    !groups?.length
  ) {
    return;
  }

  const total =
    groups.reduce(
      (sum, group) =>
        sum +
        Math.max(
          0,
          Number(group.weight) || 0
        ),
      0
    );

  if (total <= 0) {
    alert(
      "At least one group must have a weight above zero before normalizing."
    );
    return;
  }

  recordPopcycleHistory(
    `Normalized ${type} weights at ${getTimeSlotLabel(popcycleState.selectedRowIndex)}`
  );

  const normalized =
    groups.map(group =>
      Math.round(
        (
          Math.max(
            0,
            Number(group.weight) || 0
          ) /
          total
        ) * 100
      )
    );

  const normalizedTotal =
    normalized.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  const difference =
    100 - normalizedTotal;

  const largestIndex =
    normalized.indexOf(
      Math.max(...normalized)
    );

  normalized[largestIndex] +=
    difference;

  groups.forEach(
    (group, index) => {
      group.weight =
        normalized[index];
    }
  );

  updateRowModifiedState(
    schedule.name,
    popcycleState.selectedRowIndex
  );

  markPopcycleDirty();
  renderPopcycleEditor();
}

function getKnownPopulationGroupNames(
  type
) {
  if (!popcycleState.current) {
    return [];
  }

  const names =
    new Set();

  popcycleState.current.order.forEach(
    scheduleName => {
      const schedule =
        popcycleState.current
          .schedules[scheduleName];

      schedule.rows.forEach(row => {
        const groups =
          type === "ped"
            ? row.pedGroups
            : row.carGroups;

        groups.forEach(group => {
          if (group.name) {
            names.add(group.name);
          }
        });
      });
    }
  );

  if (type === "ped") {
    const area =
      getSelectedPopcycleArea();

    area?.popgroups?.forEach(
      groupName =>
        names.add(groupName)
    );
  }

  const installedKey =
    type === "ped"
      ? "peds"
      : "vehicles";

  (
    popcycleState.installedPopgroupsReference
      ?.[installedKey] || []
  ).forEach(groupName =>
    names.add(groupName)
  );

  return Array.from(names)
    .sort((a, b) =>
      a.localeCompare(b)
    );
}

function setSelectedPolicePresence(
  pedPercent,
  carPercent
) {
  const schedule =
    getSelectedPopcycleSchedule();

  const row =
    getSelectedPopcycleRow();

  if (
    !schedule ||
    !row
  ) {
    return;
  }

  recordPopcycleHistory(
    `Changed police presence at ${getTimeSlotLabel(popcycleState.selectedRowIndex)}`
  );

  row.values.percentCopPeds =
    clampPolicePercentage(
      pedPercent
    );

  row.values.percentCopCars =
    clampPolicePercentage(
      carPercent
    );

  updateRowModifiedState(
    schedule.name,
    popcycleState.selectedRowIndex
  );

  markPopcycleDirty();
  renderPopcycleEditor();
}

function updateSelectedPolicePercentage(
  fieldKey,
  rawValue
) {
  const schedule =
    getSelectedPopcycleSchedule();

  const row =
    getSelectedPopcycleRow();

  if (
    !schedule ||
    !row ||
    ![
      "percentCopPeds",
      "percentCopCars"
    ].includes(fieldKey)
  ) {
    return;
  }

  const parsedValue =
    Number.parseInt(
      rawValue,
      10
    );

  if (!Number.isFinite(parsedValue)) {
    return;
  }

  recordPopcycleHistory(
    `Changed ${fieldKey} at ${getTimeSlotLabel(popcycleState.selectedRowIndex)}`
  );

  row.values[fieldKey] =
    clampPolicePercentage(
      parsedValue
    );

  updateRowModifiedState(
    schedule.name,
    popcycleState.selectedRowIndex
  );

  markPopcycleDirty();
  renderPopcycleEditor();
}

function clampPolicePercentage(value) {
  return Math.min(
    100,
    Math.max(
      0,
      Number.parseInt(
        value,
        10
      ) || 0
    )
  );
}

function copySelectedHourlyMix(
  target
) {
  const schedule =
    getSelectedPopcycleSchedule();

  const sourceRow =
    getSelectedPopcycleRow();

  if (
    !schedule ||
    !sourceRow
  ) {
    return;
  }

  const sourceIndex =
    popcycleState.selectedRowIndex;

  let targetIndexes = [];

  if (
    target === "previous" &&
    sourceIndex > 0
  ) {
    targetIndexes = [
      sourceIndex - 1
    ];
  }

  if (
    target === "next" &&
    sourceIndex <
      schedule.rows.length - 1
  ) {
    targetIndexes = [
      sourceIndex + 1
    ];
  }

  if (target === "all") {
    targetIndexes =
      schedule.rows
        .map((row, index) => index)
        .filter(
          index =>
            index !== sourceIndex
        );
  }

  if (!targetIndexes.length) {
    return;
  }

  recordPopcycleHistory(
    `Copied hourly group and police mix from ${getTimeSlotLabel(sourceIndex)}`
  );

  targetIndexes.forEach(
    targetIndex => {
      const targetRow =
        schedule.rows[targetIndex];

      targetRow.pedGroups =
        clonePopcycleModel(
          sourceRow.pedGroups
        );

      targetRow.carGroups =
        clonePopcycleModel(
          sourceRow.carGroups
        );

      targetRow.values.percentCopPeds =
        sourceRow.values.percentCopPeds;

      targetRow.values.percentCopCars =
        sourceRow.values.percentCopCars;

      updateRowModifiedState(
        schedule.name,
        targetIndex
      );
    }
  );

  markPopcycleDirty();
  renderPopcycleEditor();
}

// [END MODULE: POPCYCLE_GROUP_EDITOR]

// [END MODULE: POPCYCLE_EDITOR]
