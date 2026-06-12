// =====================================================
// [MODULE: POPCYCLE_PARSER]
// Reads popcycle.dat schedules and preserves source line
// indexes so only edited rows are rewritten on export.
// =====================================================

function parsePopcycleRow(line) {
  const tokens = String(line || "")
    .trim()
    .split(/\s+/);

  if (tokens.length < 12) return null;

  const numericTokens = tokens.slice(0, 10);
  const numericValues = numericTokens.map(value =>
    Number.parseInt(value, 10)
  );

  if (numericValues.some(value => !Number.isFinite(value))) {
    return null;
  }

  if (tokens[10].toLowerCase() !== "peds") {
    return null;
  }

  let index = 11;
  const pedGroups = [];

  while (
    index < tokens.length &&
    tokens[index].toLowerCase() !== "cars"
  ) {
    if (index + 1 >= tokens.length) return null;

    const weight =
      Number.parseInt(tokens[index + 1], 10);

    if (!Number.isFinite(weight)) return null;

    pedGroups.push({
      name: tokens[index],
      weight
    });

    index += 2;
  }

  if (
    index >= tokens.length ||
    tokens[index].toLowerCase() !== "cars"
  ) {
    return null;
  }

  index += 1;
  const carGroups = [];

  while (index + 1 < tokens.length) {
    const weight =
      Number.parseInt(tokens[index + 1], 10);

    if (!Number.isFinite(weight)) return null;

    carGroups.push({
      name: tokens[index],
      weight
    });

    index += 2;
  }

  const values = {};

  POPCYCLE_FIELDS.forEach((field, fieldIndex) => {
    values[field.key] = numericValues[fieldIndex];
  });

  return {
    values,
    pedGroups,
    carGroups
  };
}

function parsePopcycleText(
  text,
  sourceName = "popcycle.dat"
) {
  const normalizedText =
    String(text || "").replace(/\r\n/g, "\n");

  const lines = normalizedText.split("\n");
  const order = [];
  const schedules = {};
  const parserErrors = [];
  const malformedTerminators = [];
  const duplicateNames = [];

  let index = 0;

  while (index < lines.length) {
    if (lines[index].trim() !== "POP_SCHEDULE:") {
      index++;
      continue;
    }

    if (index + 1 >= lines.length) {
      parserErrors.push(
        `Schedule marker at line ${index + 1} has no name.`
      );
      break;
    }

    const scheduleName = lines[index + 1].trim();

    if (!scheduleName) {
      parserErrors.push(
        `Schedule marker at line ${index + 1} has a blank name.`
      );
    }

    if (schedules[scheduleName]) {
      duplicateNames.push(scheduleName);
    }

    const schedule = {
      name: scheduleName,
      sourceStartLineIndex: index,
      sourceEndLineIndex: null,
      rows: []
    };

    let rowIndex = index + 2;

    while (rowIndex < lines.length) {
      const stripped = lines[rowIndex].trim();

      if (stripped.startsWith("END_POP_SCHEDULE")) {
        schedule.sourceEndLineIndex = rowIndex;

        if (stripped !== "END_POP_SCHEDULE") {
          malformedTerminators.push({
            scheduleName,
            lineNumber: rowIndex + 1,
            text: lines[rowIndex]
          });
        }

        break;
      }

      if (stripped === "POP_SCHEDULE:") {
        parserErrors.push(
          `${scheduleName} is missing END_POP_SCHEDULE before line ${rowIndex + 1}.`
        );
        break;
      }

      const parsedRow =
        parsePopcycleRow(lines[rowIndex]);

      if (parsedRow) {
        schedule.rows.push({
          ...parsedRow,
          sourceLineIndex: rowIndex,
          sourceRaw: lines[rowIndex],
          modified: false
        });
      }

      rowIndex++;
    }

    if (schedule.rows.length !== 12) {
      parserErrors.push(
        `${scheduleName} contains ${schedule.rows.length} data rows instead of 12.`
      );
    }

    order.push(scheduleName);
    schedules[scheduleName] = schedule;
    index = Math.max(rowIndex + 1, index + 1);
  }

  return {
    sourceName,
    rawText: normalizedText,
    sourceLines: lines,
    order,
    schedules,
    parserErrors,
    malformedTerminators,
    duplicateNames
  };
}

function clonePopcycleModel(model) {
  return JSON.parse(JSON.stringify(model));
}

// [END MODULE: POPCYCLE_PARSER]
