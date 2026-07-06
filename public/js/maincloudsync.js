/* =====================================================
   MAIN PAGE CLOUD SYNC BRIDGE
   Connects the original Popgroups page tools to the
   cloud-backed Vehicle Library import system.
   ===================================================== */

const MAIN_CLOUD_BATCH_SIZE = 50;

let mainCloudVehicleImageMap = new Map();
let mainCloudVehicleLibraryFlagMap = new Map();
let mainCloudVehicleLibraryFlagsLoading = false;

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

function getMainCloudVehicleLibraryFlags(model) {
  const key = mainCloudNormalizeModel(model);
  return mainCloudVehicleLibraryFlagMap.get(key) || null;
}

async function loadMainCloudVehicleLibraryFlags(options = {}) {
  if (mainCloudVehicleLibraryFlagsLoading) {
    return { ok: false, skipped: true, reason: "already-loading" };
  }

  if (!window.vehicleCloud?.getVehicles) {
    return { ok: false, skipped: true, reason: "cloud-service-unavailable" };
  }

  const localVehicles =
    typeof vehicleMeta === "undefined"
      ? []
      : Object.values(vehicleMeta || {});

  mainCloudVehicleLibraryFlagsLoading = true;

  try {
    const cloudVehicles =
      await window.vehicleCloud.getVehicles(localVehicles);

    mainCloudVehicleLibraryFlagMap = new Map(
      (cloudVehicles || [])
        .map(vehicle => {
          const modelName =
            vehicle?.modelName ||
            vehicle?.id ||
            vehicle?.vehiclesMeta?.modelName ||
            "";

          const key = mainCloudNormalizeModel(modelName);

          if (!key) {
            return null;
          }

          return [
            key,
            {
              installed: vehicle?.custom?.installed === true,
              favorite: vehicle?.custom?.favorite === true
            }
          ];
        })
        .filter(Boolean)
    );

    if (options.silent !== true && typeof renderVehicleLibrary === "function") {
      renderVehicleLibrary();
    }

    return { ok: true, records: mainCloudVehicleLibraryFlagMap.size };
  } catch (error) {
    console.warn("Cloud vehicle library flags could not be loaded.", error);
    return { ok: false, error };
  } finally {
    mainCloudVehicleLibraryFlagsLoading = false;
  }
}

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
    sourceFile: fileName,
    originalFileName: fileName,
    sourceType
  };
}

function mainCloudGetActivePackForImport() {
  if (
    typeof activePackId === "undefined" ||
    !activePackId ||
    typeof packDatabase === "undefined" ||
    !packDatabase?.packs
  ) {
    return null;
  }

  return packDatabase.packs[activePackId] || null;
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

function mainCloudBuildVehiclesMetaRecords(records, sourceFile) {
  const importSource = mainCloudBuildImportSource(
    "vehicles.meta",
    sourceFile
  );

  const activePack = mainCloudGetActivePackForImport();

  return (Array.isArray(records) ? records : [])
    .map(meta => {
      const modelName = mainCloudNormalizeModel(meta?.modelName);

      if (!modelName) {
        return null;
      }

      return {
        modelName,

        vehiclesMeta: {
          modelName,
          txdName: meta.txdName || "",
          handlingId: meta.handlingId || "",
          gameName: meta.gameName || "",
          vehicleMakeName: meta.vehicleMakeName || "",
          vehicleClass: meta.vehicleClass || "",
          vehicleType: meta.vehicleType || "",
          audioNameHash: meta.audioNameHash || "",
          layout: meta.layout || "",
          plateType: meta.plateType || "",
          wheelType: meta.wheelType || "",
          frequency: meta.frequency || "",
          swankness: meta.swankness || "",
          maxNum: meta.maxNum || "",
          maxNumOfSameColor: meta.maxNumOfSameColor || "",
          identicalModelSpawnDistance:
            meta.identicalModelSpawnDistance || ""
        },

        custom: {
          rockstarDlc: activePack?.dlcFolder || "",
          sourcePack: activePack?.name || importSource.sourceLabel,
          vehiclesMetaPath: importSource.sourcePath
        },

        sources: {
          vehiclesMeta: [
            importSource.sourcePath
          ],
          popgroups: []
        },

        importSource
      };
    })
    .filter(Boolean);
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

async function syncMainPageVehiclesMetaToCloud(records, sourceFile) {
  if (!mainCloudCanSync()) {
    console.warn("Cloud sync skipped: vehicleCloud.importLibraryBatch is not available.");

    return {
      ok: false,
      skipped: true,
      reason: "cloud-service-unavailable"
    };
  }

  const cloudRecords = mainCloudBuildVehiclesMetaRecords(
    records,
    sourceFile
  );

  if (!cloudRecords.length) {
    console.warn("Cloud sync skipped: no vehicles.meta records were found.");

    return {
      ok: false,
      skipped: true,
      reason: "no-records"
    };
  }

  const importSource = mainCloudBuildImportSource(
    "vehicles.meta",
    sourceFile
  );

  const importSessionId = mainCloudCreateImportSessionId(
    "vehicles-meta",
    sourceFile
  );

  const batches = mainCloudSplitIntoBatches(cloudRecords);
  let imported = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    const result = await window.vehicleCloud.importLibraryBatch({
      importMode: "vehicles-meta",
      importSessionId,
      importSource,
      sourceFile,
      vehicles: batch,
      handlingProfiles: []
    });

    imported += Number(
      result.vehiclesImported ??
      batch.length
    );
  }

  return {
    ok: true,
    records: cloudRecords.length,
    imported,
    batches: batches.length
  };
}

document.addEventListener("DOMContentLoaded", () => {
  loadMainCloudVehicleImages({ silent: true });
  loadMainCloudVehicleLibraryFlags({ silent: false });
});

window.getMainCloudVehicleImageUrl =
  getMainCloudVehicleImageUrl;

window.loadMainCloudVehicleImages =
  loadMainCloudVehicleImages;

window.syncMainPagePopgroupsToCloud =
  syncMainPagePopgroupsToCloud;

window.syncMainPageVehiclesMetaToCloud =
  syncMainPageVehiclesMetaToCloud;