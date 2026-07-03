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

        // If either local (RPF scanner) or cloud says installed, keep it installed.
        // Local uninstall (drop zone) sets local to false; cloud false + local false = false.
        installed:
          cloudVehicle.custom?.installed === true ||
          localVehicle.custom?.installed === true,

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
async function getVehicleImages() {
  const result = await fetchCloudJson(
    "/api/vehicle-images",
    "Cloud vehicle image"
  );

  if (!Array.isArray(result.images)) {
    throw new Error(
      "Cloud vehicle image response was invalid."
    );
  }

  return result.images;
}

function attachImagesToVehicles(
  vehicles,
  images
) {
  const imageMap = new Map(
    images.map(image => [
      String(
        image.modelName || ""
      ).toLowerCase(),
      image.imageUrl
    ])
  );

  return vehicles.map(vehicle => {
    const modelId = String(
      vehicle.id ||
      vehicle.modelName ||
      ""
    ).toLowerCase();

    const cloudImageUrl =
      imageMap.get(modelId);

    if (!cloudImageUrl) {
      return vehicle;
    }

    return {
      ...vehicle,

      custom: {
        ...(vehicle.custom || {}),
        imageDataUrl: cloudImageUrl
      }
    };
  });
}
async function getSourceHistory(options = {}) {
  const params = new URLSearchParams();

  if (options.type) {
    params.set("type", options.type);
  }

  if (options.search) {
    params.set("search", options.search);
  }

  params.set(
    "limit",
    String(options.limit || 6)
  );

  const query = params.toString();

  const result = await fetchCloudJson(
    `/api/source-history${query ? `?${query}` : ""}`,
    "Source history"
  );

  if (!Array.isArray(result.sourceHistory)) {
    throw new Error(
      "Source history response was invalid."
    );
  }

  return result.sourceHistory;
}


async function getPacks(options = {}) {
  const params = new URLSearchParams();

  if (options.workspaceId) {
    params.set("workspaceId", options.workspaceId);
  }

  const query = params.toString();

  const result = await fetchCloudJson(
    `/api/packs${query ? `?${query}` : ""}`,
    "Cloud pack database"
  );

  if (!Array.isArray(result.packs)) {
    throw new Error("Cloud pack response was invalid.");
  }

  return result.packs;
}

async function getVehiclePacks(modelName, options = {}) {
  const normalizedModelName =
    String(modelName || "").trim();

  if (!normalizedModelName) {
    return [];
  }

  const params = new URLSearchParams();
  params.set("modelName", normalizedModelName);

  if (options.workspaceId) {
    params.set("workspaceId", options.workspaceId);
  }

  const result = await fetchCloudJson(
    `/api/vehicle-packs?${params.toString()}`,
    "Vehicle pack memberships"
  );

  if (!Array.isArray(result.memberships)) {
    throw new Error("Vehicle pack membership response was invalid.");
  }

  return result.memberships;
}

async function importPackDatabaseToCloud(packData, options = {}) {
  const payload = {
    workspaceId: options.workspaceId || "default",
    sourceType: options.sourceType || "pack-database",
    sourceLabel: options.sourceLabel || "Pack Tracker",
    packs: packData?.packs || {},
    vehiclePackMap: packData?.vehiclePackMap || {}
  };

  const response = await fetchLibraryWrite("/api/packs/import", "POST", payload);

  let result;

  try {
    result = await response.json();
  } catch {
    result = {
      ok: false,
      error: "Pack import returned a non-JSON response."
    };
  }

  if (!response.ok || result.ok === false) {
    throw new Error(
      result.error ||
      result.message ||
      "Pack database could not be imported."
    );
  }

  return result;
}

async function getLibraryData(
  localVehicles = []
) {
  const [
    vehicles,
    handlingProfiles,
    relationships,
    vehicleImages
  ] = await Promise.all([
    getVehicles(localVehicles),
    getHandlingProfiles(),
    getVehiclePopgroups(),
    getVehicleImages()
  ]);

  const vehiclesWithPopgroups =
    attachPopgroupsToVehicles(
      vehicles,
      relationships
    );

  const vehiclesWithImages =
    attachImagesToVehicles(
      vehiclesWithPopgroups,
      vehicleImages
    );

  return {
    vehicles: vehiclesWithImages,
    handlingProfiles,
    popgroupRelationships:
      relationships,
    vehicleImages
  };
}
const LIBRARY_WRITE_TOKEN_KEY =
  "gtaTrafficLibraryWriteToken";

function getLibraryWriteToken() {
  let token = sessionStorage.getItem(LIBRARY_WRITE_TOKEN_KEY);
  if (!token) {
    token = String(window.prompt("Enter the GTA Traffic library write token:") || "").trim();
    if (token) sessionStorage.setItem(LIBRARY_WRITE_TOKEN_KEY, token);
  }
  return token;
}

// Shared fetch helper for write operations.
// Always sends the session cookie (credentials: "same-origin" is the default).
// If the server returns 401, falls back to prompting for the write token and retries once.
async function fetchLibraryWrite(url, method, body) {
  const baseHeaders = { Accept: "application/json" };
  if (body !== undefined) baseHeaders["Content-Type"] = "application/json";
  const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;

  let response = await fetch(url, { method, headers: { ...baseHeaders }, body: bodyStr });

  if (response.status === 401) {
    const token = getLibraryWriteToken();
    if (!token) throw new Error("The library write token was not entered.");
    response = await fetch(url, {
      method,
      headers: { ...baseHeaders, "X-Library-Token": token },
      body: bodyStr
    });
    if (response.status === 401) sessionStorage.removeItem(LIBRARY_WRITE_TOKEN_KEY);
  }

  return response;
}

async function updateVehicle(modelName, changes) {
  const response = await fetchLibraryWrite(
    `/api/vehicles/${encodeURIComponent(modelName)}`,
    "PATCH",
    changes
  );

  let result;
  try {
    result = await response.json();
  } catch {
    result = { ok: false, error: "The update response was not valid JSON." };
  }

  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Vehicle update failed with status ${response.status}.`);
  }

  return result.vehicle;
}

async function deleteVehicle(modelName) {
  const response = await fetchLibraryWrite(
    `/api/vehicles/${encodeURIComponent(modelName)}`,
    "DELETE"
  );

  let result;
  try {
    result = await response.json();
  } catch {
    result = { ok: false, error: "The delete response was not valid JSON." };
  }

  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Vehicle delete failed with status ${response.status}.`);
  }

  return result;
}
async function getVehicleAppearance(modelName, options = {}) {
  const normalizedModelName =
    String(modelName || "").trim();

  if (!normalizedModelName) {
    return null;
  }

  const params = new URLSearchParams();

  params.set("modelName", normalizedModelName);

  if (options.workspaceId) {
    params.set("workspaceId", options.workspaceId);
  }

  const result = await fetchCloudJson(
    `/api/vehicle-appearance?${params.toString()}`,
    "Vehicle appearance metadata"
  );

  return result.appearance || null;
}

async function importVehicleAppearanceMetadata(metadata, options = {}) {
  const payload = {
    workspaceId: options.workspaceId || "default",
    sourceLabel: options.sourceLabel || "Appearance Metadata",
    dlcFolder: options.dlcFolder || "",
    carvariations: metadata?.carvariations || null,
    carcols: metadata?.carcols || null
  };

  const response = await fetchLibraryWrite("/api/vehicle-appearance/import", "POST", payload);
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.ok === false) {
    throw new Error(result.error || "Vehicle appearance metadata could not be imported.");
  }

  return result;
}

async function importLibraryBatch(payload) {
  const response = await fetchLibraryWrite("/api/library/import-v2", "POST", payload);

  let result;
  try {
    result = await response.json();
  } catch {
    result = { ok: false, error: "The cloud import response was not valid JSON." };
  }

  if (!response.ok || !result.ok) {
    const details = Array.isArray(result.details) && result.details.length
      ? ` ${result.details.join(" ")}` : "";
    throw new Error((result.error || `Cloud import failed with status ${response.status}.`) + details);
  }

  return result;
}
function clearLibraryWriteToken() {
  sessionStorage.removeItem(
    LIBRARY_WRITE_TOKEN_KEY
  );
}
const IMAGE_UPLOAD_TOKEN_KEY =
  "gtaTrafficImageUploadToken";

function getImageUploadToken() {
  let token = sessionStorage.getItem(
    IMAGE_UPLOAD_TOKEN_KEY
  );

  if (!token) {
    token = window.prompt(
      "Enter the GTA Traffic image upload token:"
    );

    token = String(token || "").trim();

    if (token) {
      sessionStorage.setItem(
        IMAGE_UPLOAD_TOKEN_KEY,
        token
      );
    }
  }

  return token;
}

async function readImageApiResponse(response) {
  try {
    return await response.json();
  } catch {
    return {
      ok: false,
      error:
        "The vehicle image response was not valid JSON."
    };
  }
}

async function uploadVehicleImage(
  modelName,
  file
) {
  if (!(file instanceof Blob)) {
    throw new Error(
      "A valid image file was not supplied."
    );
  }

  const token = getImageUploadToken();

  if (!token) {
    throw new Error(
      "The image upload token was not entered."
    );
  }

  const response = await fetch(
    `/api/vehicle-images/${encodeURIComponent(modelName)}`,
    {
      method: "PUT",

      headers: {
        Accept: "application/json",
        "Content-Type":
          file.type || "application/octet-stream",
        "X-Upload-Token": token
      },

      body: file
    }
  );

  const result =
    await readImageApiResponse(response);

  if (!response.ok || !result.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem(
        IMAGE_UPLOAD_TOKEN_KEY
      );
    }

    throw new Error(
      result.error ||
      `Image upload failed with status ${response.status}.`
    );
  }

  return result.image;
}

async function deleteVehicleImage(modelName) {
  const token = getImageUploadToken();

  if (!token) {
    throw new Error(
      "The image upload token was not entered."
    );
  }

  const response = await fetch(
    `/api/vehicle-images/${encodeURIComponent(modelName)}`,
    {
      method: "DELETE",

      headers: {
        Accept: "application/json",
        "X-Upload-Token": token
      }
    }
  );

  const result =
    await readImageApiResponse(response);

  if (!response.ok || !result.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem(
        IMAGE_UPLOAD_TOKEN_KEY
      );
    }

    throw new Error(
      result.error ||
      `Image deletion failed with status ${response.status}.`
    );
  }
  return result.image;
}

function clearImageUploadToken() {
  sessionStorage.removeItem(
    IMAGE_UPLOAD_TOKEN_KEY
  );
}

// ── Per-user vehicle field edits ──────────────────────────────────
// Session-cookie auth (same-origin), not the library write token — this is
// a regular logged-in-user feature, not an admin/library-wide edit.

async function readVehicleEditResponse(response) {
  let result;

  try {
    result = await response.json();
  } catch {
    result = { ok: false, error: "The response was not valid JSON." };
  }

  if (!response.ok || result.ok === false) {
    throw new Error(
      result.error ||
      `Vehicle edit request failed with status ${response.status}.`
    );
  }

  return result;
}

async function getVehicleFieldEdits(modelName) {
  const response = await fetch(
    `/api/vehicle-edits/${encodeURIComponent(modelName)}`,
    { credentials: "same-origin" }
  );

  return readVehicleEditResponse(response);
}

async function saveVehicleFieldEdit(modelName, field, value) {
  const response = await fetch(
    `/api/vehicle-edits/${encodeURIComponent(modelName)}`,
    {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value })
    }
  );

  return readVehicleEditResponse(response);
}

async function restoreVehicleField(modelName, field) {
  const response = await fetch(
    `/api/vehicle-edits/${encodeURIComponent(modelName)}/${encodeURIComponent(field)}`,
    { method: "DELETE", credentials: "same-origin" }
  );

  return readVehicleEditResponse(response);
}

async function restoreAllVehicleFieldEdits(modelName) {
  const response = await fetch(
    `/api/vehicle-edits/${encodeURIComponent(modelName)}`,
    { method: "DELETE", credentials: "same-origin" }
  );

  return readVehicleEditResponse(response);
}

// ── Per-user handling.meta field edits ─────────────────────────────
// handling.meta profiles are shared by handling_name across many vehicles,
// so these edits are keyed by handling name rather than model name — same
// vanilla+delta pattern and auth as the vehicle field edits above.

async function getHandlingFieldEdits(handlingName) {
  const response = await fetch(
    `/api/handling-edits/${encodeURIComponent(handlingName)}`,
    { credentials: "same-origin" }
  );

  return readVehicleEditResponse(response);
}

async function saveHandlingFieldEdit(handlingName, field, value) {
  const response = await fetch(
    `/api/handling-edits/${encodeURIComponent(handlingName)}`,
    {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value })
    }
  );

  return readVehicleEditResponse(response);
}

async function restoreHandlingField(handlingName, field) {
  const response = await fetch(
    `/api/handling-edits/${encodeURIComponent(handlingName)}/${encodeURIComponent(field)}`,
    { method: "DELETE", credentials: "same-origin" }
  );

  return readVehicleEditResponse(response);
}

async function restoreAllHandlingFieldEdits(handlingName) {
  const response = await fetch(
    `/api/handling-edits/${encodeURIComponent(handlingName)}`,
    { method: "DELETE", credentials: "same-origin" }
  );

  return readVehicleEditResponse(response);
}

window.vehicleCloud = {
   getVehicles,
  getHandlingProfiles,
  getVehiclePopgroups,
  getVehicleImages,
  getPacks,
  getVehiclePacks,
  getVehicleAppearance,
  getLibraryData,
  updateVehicle,
  importLibraryBatch,
  importPackDatabaseToCloud,
  importVehicleAppearanceMetadata,
  clearLibraryWriteToken,
  uploadVehicleImage,
  deleteVehicleImage,
  clearImageUploadToken,
  getSourceHistory,
  getVehicleFieldEdits,
  saveVehicleFieldEdit,
  restoreVehicleField,
  restoreAllVehicleFieldEdits,
  getHandlingFieldEdits,
  saveHandlingFieldEdit,
  restoreHandlingField,
  restoreAllHandlingFieldEdits,
  deleteVehicle
};
})();
