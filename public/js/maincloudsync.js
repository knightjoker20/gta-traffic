/* =====================================================
   MAIN PAGE CLOUD SYNC BRIDGE
   Connects the original Popgroups page tools to the
   cloud-backed Vehicle Library import system.
   ===================================================== */

const MAIN_CLOUD_BATCH_SIZE = 50;
let mainCloudVehicleImageMap = new Map();

function getMainCloudVehicleImageUrl(model) {
  const key = String(model || "").trim().toLowerCase();

  if (!key) {
    return "";
  }

  return mainCloudVehicleImageMap.get(key) || "";
}

async function loadMainCloudVehicleImages(options = {}) {
  if (!window.vehicleCloud?.getVehicleImages) {
    console.warn("Cloud image sync skipped: vehicleCloud.getVehicleImages is not available.");
    return;
  }

  try {
    const images = await window.vehicleCloud.getVehicleImages();

    mainCloudVehicleImageMap = new Map(
      images
        .filter(image => image?.modelName && image?.imageUrl)
        .map(image => [
          String(image.modelName).toLowerCase(),
          image.imageUrl
        ])
    );

    if (!options.silent && typeof updateStatus === "function") {
      updateStatus(
        `Loaded ${mainCloudVehicleImageMap.size.toLocaleString()} cloud vehicle image references.`
      );
    }

    if (typeof renderSection === "function" && typeof currentSection !== "undefined") {
      renderSection(currentSection);
    }

    if (typeof renderVehicleLibrary === "function") {
      renderVehicleLibrary();
    }
  } catch (error) {
    console.warn("Cloud vehicle images could not be loaded.", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadMainCloudVehicleImages({ silent: true });
});

function mainCloudCanSync() {
  return Boolean(window.vehicleCloud?.importLibraryBatch);
}

function mainCloudNormalizeModel(model) {
  return String(model || "").trim().toLowerCase();
}

function mainCloudSplitIntoBatches(items, size = MAIN_CLOUD_BATCH_SIZE) {
  const batches = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

function mainCloudCreateImportSessionId(type, sourceFile) {
  return [
    "main-page",
    type,
    String(sourceFile || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    Date.now()
  ].join("-");
}

function mainCloudBuildImportSource(sourceType, sourceFile) {
  const fileName = String(sourceFile || "unknown");

  return {
    sourceLabel: fileName,
    dlcFolder: "",
    sourceDirectory: "",
    sourcePath: fileName,
    originalFileName: fileName,
    sourceType
  };
}

function mainCloudBuildPopgroupsRecords(sourceFile) {
  const memberships = new Map();

  const groups = Array.isArray(parsedData?.vehicles)
    ? parsedData.vehicles
    : [];

  groups.forEach(group => {
    const groupName = String(group.name || "").trim();

    if (!groupName || !Array.isArray(group.models)) {
      return;
    }

    group.models.forEach(model => {
      const modelName = mainCloudNormalizeModel(model);

      if (!modelName) {
        return;
      }

      if (!memberships.has(modelName)) {
        memberships.set(modelName, {
          modelName,
          popgroups: [],
          sources: {
            vehiclesMeta: [],
            popgroups: [sourceFile]
          }
        });
      }

      memberships.get(modelName).popgroups.push({
        groupName,
        sourceFile
      });
    });
  });

  return [...memberships.values()];
}

async function syncMainPagePopgroupsToCloud(sourceFile) {
  if (!mainCloudCanSync()) {
    console.warn("Cloud sync skipped: vehicleCloud.importLibraryBatch is not available.");
    return {
      ok: false,
      skipped: true,
      reason: "cloud-service-unavailable"
    };
  }

  const records = mainCloudBuildPopgroupsRecords(sourceFile);

  if (!records.length) {
    console.warn("Cloud sync skipped: no Popgroups vehicle records were found.");
    return {
      ok: false,
      skipped: true,
      reason: "no-records"
    };
  }

  const importSource = mainCloudBuildImportSource(
    "Popgroups",
    sourceFile
  );

  const importSessionId = mainCloudCreateImportSessionId(
    "popgroups",
    sourceFile
  );

  const batches = mainCloudSplitIntoBatches(records);
  let imported = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    const result = await window.vehicleCloud.importLibraryBatch({
      importMode: "popgroups",
      importSessionId,
      importSource,
      sourceFile,
      replaceSource: batchIndex === 0,
      vehicles: batch,
      handlingProfiles: []
    });

    imported += Number(
      result.popgroupsImported ??
      batch.reduce(
        (total, record) => total + record.popgroups.length,
        0
      )
    );
  }

  return {
    ok: true,
    records: records.length,
    imported,
    batches: batches.length
  };
}
