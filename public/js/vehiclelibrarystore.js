// =====================================================
// GTA Traffic Vehicle Library - Shared Browser Database
// Stores merged vehicle records, handling profiles, and
// import-source summaries for the library/detail pages.
// =====================================================

window.vehicleLibraryStore = (() => {
  "use strict";

  const DB_NAME = "gtaTrafficVehicleLibraryDB";
  const DB_VERSION = 1;
  const STORES = {
    vehicles: "vehicles",
    handling: "handlingProfiles",
    sources: "sourceFiles"
  };

  let databasePromise = null;

  function normalizeId(value) {
    return String(value || "").trim().toLowerCase();
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB is unavailable in this browser."));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.vehicles)) {
          const store = db.createObjectStore(STORES.vehicles, { keyPath: "id" });
          store.createIndex("modelName", "modelName", { unique: false });
          store.createIndex("vehicleClass", "vehiclesMeta.vehicleClass", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.handling)) {
          db.createObjectStore(STORES.handling, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.sources)) {
          db.createObjectStore(STORES.sources, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open the vehicle library database."));
    });

    return databasePromise;
  }

  async function withStore(storeName, mode, operation) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let result;

      try {
        result = operation(store, transaction);
      } catch (error) {
        reject(error);
        return;
      }

      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error("Database operation failed."));
      transaction.onabort = () => reject(transaction.error || new Error("Database operation was aborted."));
    });
  }

  async function get(storeName, key) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAll(storeName) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function put(storeName, value) {
    return withStore(storeName, "readwrite", store => store.put(value));
  }

  async function putMany(storeName, values) {
    const cleanValues = (values || []).filter(Boolean);
    if (!cleanValues.length) return;
    return withStore(storeName, "readwrite", store => {
      cleanValues.forEach(value => store.put(value));
    });
  }

  async function remove(storeName, key) {
    return withStore(storeName, "readwrite", store => store.delete(key));
  }

  async function clear(storeName) {
    return withStore(storeName, "readwrite", store => store.clear());
  }

  async function clearAll() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(Object.values(STORES), "readwrite");
      Object.values(STORES).forEach(name => transaction.objectStore(name).clear());
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function createVehicleSkeleton(modelName) {
    const cleanName = String(modelName || "").trim();
    const now = new Date().toISOString();
    return {
      id: normalizeId(cleanName),
      modelName: cleanName,
      vehiclesMeta: {},
      popgroups: [],
      custom: {
        displayName: "",
        rockstarDlc: "",
        sourcePack: "",
        installType: "",
        replacementFor: "",
        dlcFolderPath: "",
        yftPath: "",
        yftHiPath: "",
        ytdPath: "",
        vehiclesMetaPath: "",
        handlingMetaPath: "",
        downloadUrl: "",
        tags: "",
        notes: "",
        imageDataUrl: "",
        favorite: false,
        installed: false,
        gameVersion: "",
        installDate: ""
      },
      sources: {
        vehiclesMeta: [],
        popgroups: []
      },
      createdAt: now,
      updatedAt: now
    };
  }

  function mergeVehicle(existing, incoming) {
    const base = existing || createVehicleSkeleton(incoming?.modelName || "");
    const now = new Date().toISOString();
    return {
      ...base,
      ...incoming,
      id: normalizeId(incoming?.modelName || base.modelName),
      modelName: incoming?.modelName || base.modelName,
      vehiclesMeta: {
        ...(base.vehiclesMeta || {}),
        ...(incoming?.vehiclesMeta || {})
      },
      custom: {
        ...(createVehicleSkeleton("temp").custom),
        ...(base.custom || {}),
        ...(incoming?.custom || {})
      },
      popgroups: incoming?.popgroups || base.popgroups || [],
      sources: {
        vehiclesMeta: unique([
          ...(base.sources?.vehiclesMeta || []),
          ...(incoming?.sources?.vehiclesMeta || [])
        ]),
        popgroups: unique([
          ...(base.sources?.popgroups || []),
          ...(incoming?.sources?.popgroups || [])
        ])
      },
      createdAt: base.createdAt || now,
      updatedAt: now
    };
  }

  async function saveVehicle(record) {
    if (!record?.modelName) throw new Error("Vehicle record requires a modelName.");
    const existing = await get(STORES.vehicles, normalizeId(record.modelName));
    const merged = mergeVehicle(existing, record);
    await put(STORES.vehicles, merged);
    return merged;
  }

  async function exportDatabase() {
    const [vehicles, handlingProfiles, sourceFiles] = await Promise.all([
      getAll(STORES.vehicles),
      getAll(STORES.handling),
      getAll(STORES.sources)
    ]);

    return {
      format: "gta-traffic-vehicle-library",
      version: 2,
      exportedAt: new Date().toISOString(),
      vehicles,
      handlingProfiles,
      sourceFiles
    };
  }

  async function importDatabase(payload, { replace = false } = {}) {
    if (!payload || payload.format !== "gta-traffic-vehicle-library") {
      throw new Error("This is not a GTA Traffic Vehicle Library backup.");
    }

    if (replace) await clearAll();

    const existingVehicles = new Map((await getAll(STORES.vehicles)).map(vehicle => [vehicle.id, vehicle]));
    const vehicles = (payload.vehicles || []).map(vehicle => mergeVehicle(existingVehicles.get(vehicle.id), vehicle));

    await Promise.all([
      putMany(STORES.vehicles, vehicles),
      putMany(STORES.handling, payload.handlingProfiles || []),
      putMany(STORES.sources, payload.sourceFiles || [])
    ]);
  }

  return {
    STORES,
    normalizeId,
    unique,
    openDatabase,
    getVehicle: id => get(STORES.vehicles, normalizeId(id)),
    getVehicles: () => getAll(STORES.vehicles),
    putVehicle: value => put(STORES.vehicles, value),
    putVehicles: values => putMany(STORES.vehicles, values),
    saveVehicle,
    deleteVehicle: id => remove(STORES.vehicles, normalizeId(id)),
    getHandlingProfile: id => get(STORES.handling, normalizeId(id)),
    getHandlingProfiles: () => getAll(STORES.handling),
    putHandlingProfiles: values => putMany(STORES.handling, values),
    getSources: () => getAll(STORES.sources),
    putSource: value => put(STORES.sources, value),
    clearAll,
    createVehicleSkeleton,
    mergeVehicle,
    exportDatabase,
    importDatabase
  };
})();
