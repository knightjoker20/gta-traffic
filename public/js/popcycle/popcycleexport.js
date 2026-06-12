// =====================================================
// [MODULE: POPCYCLE_EXPORT]
// Rewrites only edited data rows when a source file exists.
// Untouched comments, spacing, and schedules remain intact.
// =====================================================

function formatPopcycleRow(row) {
  const numericWidths = [
    2, 3, 3, 3, 3,
    2, 2, 3, 3, 3
  ];

  const numericPart =
    POPCYCLE_FIELDS.map(
      (field, index) =>
        String(
          Math.max(
            0,
            Number.parseInt(
              row.values[field.key],
              10
            ) || 0
          )
        ).padStart(
          numericWidths[index],
          " "
        )
    ).join("     ");

  const pedPart =
    row.pedGroups
      .map(group =>
        `${group.name} ${String(group.weight).padStart(2, "0")}`
      )
      .join("  ");

  const carPart =
    row.carGroups
      .map(group =>
        `${group.name} ${String(group.weight).padStart(2, "0")}`
      )
      .join("  ");

  return (
    `      ${numericPart}` +
    `           peds  ${pedPart}` +
    `  cars  ${carPart}`
  );
}

function buildEditedPopcycleText() {
  const model =
    popcycleState.current;

  if (!model) return "";

  const lines =
    popcycleState.originalText
      .replace(/\r\n/g, "\n")
      .split("\n");

  model.order.forEach(scheduleName => {
    const schedule =
      model.schedules[scheduleName];

    schedule.rows.forEach(row => {
      if (
        row.modified &&
        Number.isInteger(row.sourceLineIndex)
      ) {
        lines[row.sourceLineIndex] =
          formatPopcycleRow(row);
      }
    });
  });

  return lines.join("\r\n");
}

function exportEditedPopcycle() {
  const validation =
    runPopcycleValidation();

  if (validation.errors.length) {
    alert(
      `Export blocked: ${validation.errors.length} error(s) must be fixed first.`
    );
    return;
  }

  const output =
    buildEditedPopcycleText();

  downloadTextFile(
    output,
    "popcycle_edited.dat",
    "text/plain"
  );
}

function downloadOriginalPopcycleBackup() {
  downloadTextFile(
    popcycleState.originalText,
    `${stripFileExtension(
      popcycleState.originalFileName
    )}_original_backup.dat`,
    "text/plain"
  );
}

function downloadPopcycleChangeReport() {
  const changes = [];

  popcycleState.current.order.forEach(
    scheduleName => {
      const schedule =
        popcycleState.current
          .schedules[scheduleName];

      const originalSchedule =
        popcycleState.current
          .originalSnapshot
          .schedules[scheduleName];

      schedule.rows.forEach(
        (row, rowIndex) => {
          if (!row.modified) return;

          const changedFields = {};

          POPCYCLE_FIELDS.forEach(field => {
            const before =
              originalSchedule
                ?.rows
                ?.[rowIndex]
                ?.values
                ?.[field.key];

            const after =
              row.values[field.key];

            if (before !== after) {
              changedFields[field.key] = {
                before,
                after
              };
            }
          });

          changes.push({
            schedule: scheduleName,
            time:
              POPCYCLE_TIME_SLOTS[rowIndex],
            changedFields
          });
        }
      );
    }
  );

  const report = {
    tool: "GTA Traffic Popcycle Editor",
    version: "1.0.0",
    exportedAt:
      new Date().toISOString(),
    sourceFile:
      popcycleState.originalFileName,
    modifiedSchedules:
      getModifiedScheduleNames(),
    changes,
    validation:
      popcycleState.validation
  };

  downloadTextFile(
    JSON.stringify(report, null, 2),
    "popcycle_change_report.json",
    "application/json"
  );
}

function downloadTextFile(
  content,
  fileName,
  mimeType
) {
  const blob = new Blob(
    [content],
    { type: mimeType }
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
}

function stripFileExtension(fileName) {
  return String(fileName || "popcycle")
    .replace(/\.[^/.]+$/, "");
}

// [END MODULE: POPCYCLE_EXPORT]
