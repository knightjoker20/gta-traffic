// =====================================================
// [MODULE: VEHICLES_META_PARSER]
// Reads vehicle identity, classification, swankness,
// LOD distances, and four traffic behavior values.
//
// Traffic values added:
// - frequency                     = Spawn weight
// - maxNum                       = Model cap
// - identicalModelSpawnDistance  = Duplicate spacing
// - maxNumOfSameColor            = Same-color cap
//
// If an active pack is selected, imported vehicles are
// automatically tagged to that pack.
// =====================================================

function handleVehicleMetaFile(file) {
  const reader = new FileReader();

  reader.onload = event => {
    parseVehiclesMeta(
      event.target.result,
      file.name
    );
  };

  reader.onerror = () => {
    els.metaStatus.innerHTML = `
      <span class="warning">
        Error: Could not read
        ${escapeHTML(file.name)}.
      </span>
    `;
  };

  reader.readAsText(file);
}

function parseVehiclesMeta(
  text,
  filename
) {
  const parser = new DOMParser();

  const xml = parser.parseFromString(
    text,
    "text/xml"
  );

  if (xml.querySelector("parsererror")) {
    els.metaStatus.innerHTML = `
      <span class="warning">
        Error: Could not parse vehicles.meta.
      </span>
    `;

    return;
  }

  let addedFromThisFile = 0;
  let overwrittenFromThisFile = 0;
  let taggedToPack = 0;
  let lodArraysFound = 0;

  const items = xml.querySelectorAll(
    "InitDatas > Item, " +
    "CVehicleModelInfo__InitDataList > " +
    "InitDatas > Item"
  );

  const cloudVehiclesMetaRecords = [];

  items.forEach(item => {
    const modelName =
      getText(item, "modelName");

    if (!modelName) return;

    const key =
      modelName.toLowerCase();

    const lodDistances =
      parseLodDistances(item);

    if (lodDistances.length) {
      lodArraysFound++;
    }

    if (vehicleMeta[key]) {
      overwrittenFromThisFile++;
      overwrittenMetaEntries++;
    } else {
      addedFromThisFile++;
    }

    vehicleMeta[key] = {
      modelName,

      txdName:
        getText(item, "txdName"),

      handlingId:
        getText(item, "handlingId"),

      gameName:
        getText(item, "gameName"),

      vehicleMakeName:
        getText(
          item,
          "vehicleMakeName"
        ),

      vehicleClass:
        getText(
          item,
          "vehicleClass"
        ) || "UNKNOWN_CLASS",

      vehicleType:
        getText(item, "type"),

      swankness:
        getText(
          item,
          "swankness"
        ) || "UNKNOWN",

      layout:
        getText(item, "layout"),

      audioNameHash:
        getText(
          item,
          "audioNameHash"
        ),

      // -----------------------------------------------
      // Traffic behavior values from vehicles.meta
      // -----------------------------------------------

      frequency:
        parseMetaIntegerValue(
          item,
          "frequency"
        ),

      maxNum:
        parseMetaIntegerValue(
          item,
          "maxNum"
        ),

      identicalModelSpawnDistance:
        parseMetaIntegerValue(
          item,
          "identicalModelSpawnDistance"
        ),

      maxNumOfSameColor:
        parseMetaIntegerValue(
          item,
          "maxNumOfSameColor"
        ),

      // -----------------------------------------------
      // LOD and source information
      // -----------------------------------------------

            lodDistances,
      sourceFile: filename
    };

    cloudVehiclesMetaRecords.push(
      vehicleMeta[key]
    );

    if (activePackId) {
      packDatabase.vehiclePackMap[key] =
        activePackId;

      taggedToPack++;
    }
  });

  loadedMetaFiles.push(filename);

  if (activePackId) {
    savePackDatabase();
  }

  els.metaStatus.innerHTML = `
    <span class="saved">
      Loaded meta files:
      ${loadedMetaFiles.length} |

      Last file:
      ${escapeHTML(filename)} |

      Added:
      ${addedFromThisFile} |

      Overwritten:
      ${overwrittenFromThisFile} |

      LOD arrays:
      ${lodArraysFound} |

      Tagged to active pack:
      ${taggedToPack} |

      Total metadata entries:
      ${Object.keys(vehicleMeta).length}
    </span>
  `;

  renderSection(currentSection);
  renderVehicleLibrary();
  renderPackList();
  renderAssetSummary();

  if (typeof window.syncMainPageVehiclesMetaToCloud === "function") {
    window.syncMainPageVehiclesMetaToCloud(
      cloudVehiclesMetaRecords,
      filename
    )
      .then(result => {
        if (result?.ok) {
          els.metaStatus.innerHTML += `
            <br>
            <span class="saved">
              Cloud synced ${Number(result.imported || 0).toLocaleString()}
              vehicles.meta records.
            </span>
          `;
        }
      })
      .catch(error => {
        console.warn(
          "Main page vehicles.meta cloud sync failed.",
          error
        );

        els.metaStatus.innerHTML += `
          <br>
          <span class="warning">
            Cloud sync failed:
            ${escapeHTML(error.message || "Unknown error")}
          </span>
        `;
      });
  }
  if (typeof scheduleVehicleMetaCacheSave === "function") {
    scheduleVehicleMetaCacheSave();
  }

  if (typeof renderWorkspaceStatus === "function") {
    renderWorkspaceStatus(
      `Cached ${Object.keys(vehicleMeta).length.toLocaleString()} vehicle metadata entries.`
    );
  }
}

// =====================================================
// [MODULE: VEHICLES_META_VALUE_HELPERS]
// Reads numeric values stored in XML attributes such as:
//
// <frequency value="30" />
//
// Returns null when a value is missing or invalid so the
// vehicle card can display a dash instead of a false zero.
// =====================================================

function parseMetaIntegerValue(
  item,
  tagName
) {
  const node =
    item.querySelector(
      `:scope > ${tagName}`
    );

  if (!node) {
    return null;
  }

  const rawValue =
    node.getAttribute("value");

  if (
    rawValue === null ||
    rawValue.trim() === ""
  ) {
    return null;
  }

  const parsedValue =
    Number.parseInt(
      rawValue,
      10
    );

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

// [END MODULE: VEHICLES_META_VALUE_HELPERS]

// =====================================================
// [MODULE: VEHICLES_META_LOD_PARSER]
// Reads the whitespace-separated lodDistances float array.
// =====================================================

function parseLodDistances(item) {
  const node =
    item.querySelector(
      ":scope > lodDistances"
    );

  if (!node) return [];

  return node.textContent
    .trim()
    .split(/\s+/)
    .map(value =>
      Number.parseFloat(value)
    )
    .filter(Number.isFinite);
}

// [END MODULE: VEHICLES_META_LOD_PARSER]

// [END MODULE: VEHICLES_META_PARSER]
