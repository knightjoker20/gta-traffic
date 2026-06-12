// =====================================================
// [MODULE: POPCYCLE_VALIDATION]
// Errors block export. Warnings do not block export.
// =====================================================

function validatePopcycleModel(model) {
  const errors = [];
  const warnings = [];

  if (!model) {
    errors.push("No popcycle data is loaded.");

    return {
      errors,
      warnings
    };
  }

  model.parserErrors?.forEach(error =>
    errors.push(error)
  );

  model.duplicateNames?.forEach(name =>
    errors.push(`Duplicate schedule name: ${name}.`)
  );

  model.malformedTerminators?.forEach(issue =>
    errors.push(
      `${issue.scheduleName} has a malformed END_POP_SCHEDULE at line ${issue.lineNumber}.`
    )
  );

  model.order.forEach(scheduleName => {
    const schedule = model.schedules[scheduleName];

    if (!schedule) {
      errors.push(
        `Schedule ${scheduleName} is missing from the schedule map.`
      );
      return;
    }

    if (schedule.rows.length !== 12) {
      errors.push(
        `${scheduleName} has ${schedule.rows.length} rows instead of 12.`
      );
    }

    schedule.rows.forEach((row, rowIndex) => {
      POPCYCLE_FIELDS.forEach(field => {
        const value = row.values[field.key];

        if (!Number.isFinite(value)) {
          errors.push(
            `${scheduleName}, ${getTimeSlotLabel(rowIndex)}, ${field.label} is not numeric.`
          );
          return;
        }

        if (value < 0) {
          errors.push(
            `${scheduleName}, ${getTimeSlotLabel(rowIndex)}, ${field.label} is negative.`
          );
        }

        if (
          [
            "percentCopCars",
            "percentCopPeds"
          ].includes(field.key) &&
          value > 100
        ) {
          errors.push(
            `${scheduleName}, ${getTimeSlotLabel(rowIndex)}, ${field.label} exceeds 100%.`
          );
        }

        if (value > 500) {
          warnings.push(
            `${scheduleName}, ${getTimeSlotLabel(rowIndex)}, ${field.label} is unusually high (${value}).`
          );
        }

        const redlineValue =
          getRedlineRow(
            scheduleName,
            rowIndex
          )?.values?.[field.key];

        if (
          Number.isFinite(redlineValue) &&
          value > redlineValue
        ) {
          warnings.push(
            `${scheduleName}, ${getTimeSlotLabel(rowIndex)}, ${field.label} exceeds Traffic Redline (${value} > ${redlineValue}).`
          );
        }
      });

      validateGroupCollection(
        scheduleName,
        rowIndex,
        "pedestrian",
        row.pedGroups,
        warnings
      );

      validateGroupCollection(
        scheduleName,
        rowIndex,
        "vehicle",
        row.carGroups,
        warnings
      );
    });

    validateScheduleSpikes(
      schedule,
      warnings
    );
  });

  return {
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings))
  };
}

function validateGroupCollection(
  scheduleName,
  rowIndex,
  type,
  groups,
  warnings
) {
  if (!Array.isArray(groups) || !groups.length) {
    warnings.push(
      `${scheduleName}, ${getTimeSlotLabel(rowIndex)} has no ${type} groups.`
    );
    return;
  }

  const seen = new Set();

  groups.forEach(group => {
    if (
      !/^[A-Za-z0-9_]+$/.test(
        group.name || ""
      )
    ) {
      warnings.push(
        `${scheduleName}, ${getTimeSlotLabel(rowIndex)} contains an unusual ${type} group name: ${group.name || "(blank)"}.`
      );
    }

    if (seen.has(group.name)) {
      warnings.push(
        `${scheduleName}, ${getTimeSlotLabel(rowIndex)} repeats ${type} group ${group.name}.`
      );
    }

    seen.add(group.name);

    if (group.weight < 0) {
      warnings.push(
        `${scheduleName}, ${getTimeSlotLabel(rowIndex)} has a negative weight for ${group.name}.`
      );
    }
  });
}

function validateScheduleSpikes(
  schedule,
  warnings
) {
  ["peds", "scenario", "cars", "parkedCars"]
    .forEach(fieldKey => {
      schedule.rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return;

        const previousValue =
          schedule.rows[rowIndex - 1]
            .values[fieldKey];

        const currentValue =
          row.values[fieldKey];

        if (
          previousValue > 0 &&
          currentValue >= previousValue * 3 &&
          currentValue - previousValue >= 30
        ) {
          const field = POPCYCLE_FIELDS.find(
            item => item.key === fieldKey
          );

          warnings.push(
            `${schedule.name} has a sharp ${field.label} spike from ${getTimeSlotLabel(rowIndex - 1)} to ${getTimeSlotLabel(rowIndex)}.`
          );
        }
      });
    });
}

function runPopcycleValidation() {
  popcycleState.validation =
    validatePopcycleModel(
      popcycleState.current
    );

  renderPopcycleValidation();
  renderPopcycleScheduleList();

  return popcycleState.validation;
}

function getTimeSlotLabel(rowIndex) {
  const slot = POPCYCLE_TIME_SLOTS[rowIndex];

  return slot
    ? `${slot.time} (${slot.label})`
    : `row ${rowIndex + 1}`;
}

// [END MODULE: POPCYCLE_VALIDATION]
