// =====================================================
// [MODULE: POPCYCLE_REFERENCES]
// Loads Stock Traffic and Traffic Redline references,
// calculates comparison levels, and applies presets.
// =====================================================

function initializePopcycleReferences() {
  const data = window.GTATrafficData || {};

  popcycleState.stock = parsePopcycleText(
    data.stockTrafficRaw || "",
    "Stock Traffic"
  );

  popcycleState.redline =
    clonePopcycleModel(data.trafficRedline || {
      order: [],
      schedules: {}
    });
}

function getReferenceRow(
  reference,
  scheduleName,
  rowIndex
) {
  return reference
    ?.schedules
    ?.[scheduleName]
    ?.rows
    ?.[rowIndex] || null;
}

function getStockRow(scheduleName, rowIndex) {
  return getReferenceRow(
    popcycleState.stock,
    scheduleName,
    rowIndex
  );
}

function getRedlineRow(scheduleName, rowIndex) {
  return getReferenceRow(
    popcycleState.redline,
    scheduleName,
    rowIndex
  );
}

function getComparisonLevel(
  currentValue,
  stockValue,
  redlineValue
) {
  if (
    !Number.isFinite(currentValue) ||
    !Number.isFinite(stockValue)
  ) {
    return "unknown";
  }

  if (currentValue === stockValue) {
    return "stock";
  }

  if (
    !Number.isFinite(redlineValue) ||
    redlineValue <= stockValue
  ) {
    return currentValue > stockValue
      ? "increased"
      : "below-stock";
  }

  if (currentValue > redlineValue) {
    return "beyond-redline";
  }

  const ratio =
    (currentValue - stockValue) /
    (redlineValue - stockValue);

  if (ratio <= 0.20) return "street-plus";
  if (ratio <= 0.45) return "city-pulse";
  if (ratio <= 0.75) return "rush-hour";
  return "redline";
}

function blendReferenceValue(
  stockValue,
  redlineValue,
  blend
) {
  if (!Number.isFinite(stockValue)) return 0;

  if (!Number.isFinite(redlineValue)) {
    return stockValue;
  }

  return Math.max(
    0,
    Math.round(
      stockValue +
      ((redlineValue - stockValue) * blend)
    )
  );
}

function applyPresetToSelectedSchedule(presetId) {
  const preset = POPCYCLE_PRESETS.find(
    item => item.id === presetId
  );

  const schedule =
    getSelectedPopcycleSchedule();

  if (!preset || !schedule) return;

  recordPopcycleHistory(
    `Applied ${preset.label} to ${schedule.name}`
  );

  if (preset.mode === "nightProfile") {
    applyNightShiftProfile(schedule);
  } else {
    schedule.rows.forEach((row, rowIndex) => {
      const stockRow =
        getStockRow(schedule.name, rowIndex);

      const redlineRow =
        getRedlineRow(schedule.name, rowIndex);

      POPCYCLE_FIELDS.forEach(field => {
        const stockValue =
          stockRow?.values?.[field.key];

        const redlineValue =
          redlineRow?.values?.[field.key];

        row.values[field.key] =
          blendReferenceValue(
            stockValue,
            redlineValue,
            preset.blend
          );
      });

      updateRowModifiedState(
        schedule.name,
        rowIndex
      );
    });
  }

  markPopcycleDirty();
  renderPopcycleEditor();
}

function applyNightShiftProfile(schedule) {
  const nightMultipliers = {
    0: {
      peds: 0.55,
      scenario: 0.65,
      cars: 0.65,
      parkedCars: 0.90,
      lowPriorityParked: 0.85
    },
    1: {
      peds: 0.40,
      scenario: 0.50,
      cars: 0.50,
      parkedCars: 0.85,
      lowPriorityParked: 0.80
    },
    2: {
      peds: 0.45,
      scenario: 0.55,
      cars: 0.55,
      parkedCars: 0.85,
      lowPriorityParked: 0.80
    },
    3: {
      peds: 0.75,
      scenario: 0.80,
      cars: 0.75,
      parkedCars: 0.95,
      lowPriorityParked: 0.90
    },
    11: {
      peds: 0.75,
      scenario: 0.80,
      cars: 0.80,
      parkedCars: 0.95,
      lowPriorityParked: 0.90
    }
  };

  schedule.rows.forEach((row, rowIndex) => {
    const stockRow =
      getStockRow(schedule.name, rowIndex);

    if (!stockRow) return;

    POPCYCLE_FIELDS.forEach(field => {
      row.values[field.key] =
        stockRow.values[field.key];
    });

    const multipliers =
      nightMultipliers[rowIndex];

    if (multipliers) {
      Object.entries(multipliers).forEach(
        ([fieldKey, multiplier]) => {
          row.values[fieldKey] =
            Math.max(
              0,
              Math.round(
                stockRow.values[fieldKey] *
                multiplier
              )
            );
        }
      );
    }

    updateRowModifiedState(
      schedule.name,
      rowIndex
    );
  });
}

// [END MODULE: POPCYCLE_REFERENCES]
