(() => {
  "use strict";

  const PAGE_LIMIT = 500;

  function textOrEmpty(value) {
    return typeof value === "string" ? value : "";
  }

  function cloudVehicleToLocal(vehicle) {
    const modelName = textOrEmpty(vehicle.modelName);

    return {
      id: modelName.toLowerCase(),
      modelName,

      vehiclesMeta: {
        modelName,
        txdName: modelName,
        handlingId: textOrEmpty(vehicle.handlingId),
        gameName: textOrEmpty(vehicle.gameName),
        vehicleMakeName: textOrEmpty(vehicle.makeName),
        vehicleClass: textOrEmpty(vehicle.vehicleClass),
        vehicleType: textOrEmpty(vehicle.vehicleType),
        audioNameHash: textOrEmpty(vehicle.audioName),
        layout: textOrEmpty(vehicle.layoutName),
        plateType: "",
        wheelType: "",
        frequency:
          vehicle.frequency === null
            ? ""
            : String(vehicle.frequency),
        swankness: textOrEmpty(vehicle.swankness),
        maxNum:
          vehicle.maxNum === null
            ? ""
            : String(vehicle.maxNum),
        maxNumOfSameColor:
          vehicle.maxNumOfSameColor === null
            ? ""
            : String(vehicle.maxNumOfSameColor),
        identicalModelSpawnDistance:
          vehicle.identicalModelSpawnDistance === null
            ? ""
            : String(vehicle.identicalModelSpawnDistance)
      },

      popgroups: [],

      custom: {
        displayName: textOrEmpty(vehicle.displayName),
        rockstarDlc: textOrEmpty(vehicle.rockstarDlc),
        sourcePack: textOrEmpty(vehicle.sourcePack),
        installType: textOrEmpty(vehicle.installationType),
        replacementFor: textOrEmpty(vehicle.replacementSlot),
        dlcFolderPath: textOrEmpty(vehicle.installedDlcFolder),
        yftPath: textOrEmpty(vehicle.yftPath),
        yftHiPath: textOrEmpty(vehicle.hiYftPath),
        ytdPath: textOrEmpty(vehicle.ytdPath),
        vehiclesMetaPath:
          textOrEmpty(vehicle.vehiclesMetaPath),
        handlingMetaPath:
          textOrEmpty(vehicle.handlingMetaPath),
        downloadUrl: textOrEmpty(vehicle.downloadUrl),
        tags: Array.isArray(vehicle.tags)
          ? vehicle.tags.join(", ")
          : "",
        notes: textOrEmpty(vehicle.notes),
        imageDataUrl: "",
        favorite: vehicle.favorite === true,
        installed: vehicle.installed === true,
        gameVersion: textOrEmpty(vehicle.gameVersion),
        installDate: textOrEmpty(vehicle.installDate)
      },

      sources: {
        vehiclesMeta: vehicle.vehiclesMetaPath
          ? [vehicle.vehiclesMetaPath]
          : [],
        popgroups: []
      },

      createdAt: vehicle.createdAt || "",
      updatedAt: vehicle.updatedAt || ""
    };
  }

  function mergeLocalOnlyData(cloudVehicle, localVehicle) {
    if (!localVehicle) {
      return cloudVehicle;
    }

    return {
      ...cloudVehicle,

      popgroups: Array.isArray(localVehicle.popgroups)
        ? localVehicle.popgroups
        : [],

      custom: {
        ...(localVehicle.custom || {}),
        ...cloudVehicle.custom,

        imageDataUrl:
          localVehicle.custom?.imageDataUrl || "",

        lastInstallScanFiles:
          localVehicle.custom?.lastInstallScanFiles || [],

        lastInstallScanAt:
          localVehicle.custom?.lastInstallScanAt || ""
      },

      sources: {
        vehiclesMeta:
          cloudVehicle.sources?.vehiclesMeta?.length
            ? cloudVehicle.sources.vehiclesMeta
            : localVehicle.sources?.vehiclesMeta || [],

        popgroups:
          localVehicle.sources?.popgroups || []
      }
    };
  }

  async function fetchVehiclePage(offset) {
    const response = await fetch(
      `/api/vehicles?limit=${PAGE_LIMIT}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `Cloud vehicle request failed with status ${response.status}.`
      );
    }

    const result = await response.json();

    if (!result.ok || !Array.isArray(result.vehicles)) {
      throw new Error("Cloud vehicle response was invalid.");
    }

    return result;
  }

  async function getVehicles(localVehicles = []) {
    const cloudVehicles = [];
    let offset = 0;
    let total = null;

    do {
      const page = await fetchVehiclePage(offset);

      if (total === null) {
        total = Number(page.total || 0);
      }

      cloudVehicles.push(...page.vehicles);
      offset += page.vehicles.length;

      if (page.vehicles.length === 0) {
        break;
      }
    } while (offset < total);

    const localMap = new Map(
      localVehicles.map(vehicle => [
        String(vehicle.id || vehicle.modelName || "")
          .toLowerCase(),
        vehicle
      ])
    );

    return cloudVehicles.map(vehicle => {
      const converted = cloudVehicleToLocal(vehicle);
      const localVehicle = localMap.get(converted.id);

      return mergeLocalOnlyData(converted, localVehicle);
    });
  }
async function fetchCloudJson(path, description) {
  const response = await fetch(path, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `${description} request failed with status ${response.status}.`
    );
  }

  const result = await response.json();

  if (!result.ok) {
    throw new Error(
      `${description} response reported an error.`
    );
  }

  return result;
}

async function getHandlingProfiles() {
  const result = await fetchCloudJson(
    "/api/handling-profiles",
    "Cloud handling profile"
  );

  if (!Array.isArray(result.handlingProfiles)) {
    throw new Error(
      "Cloud handling profile response was invalid."
    );
  }

  return result.handlingProfiles;
}

async function getVehiclePopgroups() {
  const result = await fetchCloudJson(
    "/api/vehicle-popgroups",
    "Cloud popgroup"
  );

  if (!Array.isArray(result.relationships)) {
    throw new Error(
      "Cloud popgroup response was invalid."
    );
  }

  return result.relationships;
}

function attachPopgroupsToVehicles(
  vehicles,
  relationships
) {
  const groupsByModel = new Map();

  relationships.forEach(relationship => {
    const modelId = String(
      relationship.modelName || ""
    ).toLowerCase();

    if (!modelId) {
      return;
    }

    if (!groupsByModel.has(modelId)) {
      groupsByModel.set(modelId, []);
    }

    groupsByModel.get(modelId).push({
      groupName: relationship.groupName || "",
      sourceFile: relationship.sourceFile || ""
    });
  });

  return vehicles.map(vehicle => {
    const modelId = String(
      vehicle.id || vehicle.modelName || ""
    ).toLowerCase();

    const popgroups = groupsByModel.get(modelId) || [];

    return {
      ...vehicle,
      popgroups,

      sources: {
        ...(vehicle.sources || {}),
        popgroups: [
          ...new Set(
            popgroups
              .map(group => group.sourceFile)
              .filter(Boolean)
          )
        ]
      }
    };
  });
}

async function getLibraryData(localVehicles = []) {
  const [
    vehicles,
    handlingProfiles,
    relationships
  ] = await Promise.all([
    getVehicles(localVehicles),
    getHandlingProfiles(),
    getVehiclePopgroups()
  ]);

  return {
    vehicles: attachPopgroupsToVehicles(
      vehicles,
      relationships
    ),
    handlingProfiles,
    popgroupRelationships: relationships
  };
}
  window.vehicleCloud = {
  getVehicles,
  getHandlingProfiles,
  getVehiclePopgroups,
  getLibraryData
};
})();