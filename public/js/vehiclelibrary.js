// =====================================================
// GTA Traffic Vehicle Library V1.3
// Imports and merges Popgroups, vehicles.meta, and
// handling.meta into the shared local vehicle database.
// =====================================================

(() => {
  "use strict";

 const store = window.vehicleLibraryStore;
 const PAGE_SIZE_STORAGE_KEY = "gtaTraffic.vehicleLibrary.pageSize";
 const DEFAULT_PAGE_SIZE = 50;
 const PAGE_SIZE_OPTIONS = new Set([25, 50, 100]);
 const MAX_COMPARE = 3;

function getSavedPageSize() {
  try {
    const saved = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    return PAGE_SIZE_OPTIONS.has(saved) ? saved : DEFAULT_PAGE_SIZE;
  } catch (error) {
    return DEFAULT_PAGE_SIZE;
  }
}

function savePageSize(value) {
  try {
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(value));
  } catch (error) {
    console.warn("Page size could not be saved.", error);
  }
}

  const state = {
    vehicles: [],
    handlingMap: new Map(),
	sourceHistory: [],
    category: "ALL",
    compare: [],
    page: 1,
	pageSize: getSavedPageSize(),
    view: "grid",
    filters: {
      search: "",
      type: "",
      ai: "",
      install: "",
      installed: "",
      favoritesOnly: false,
      sort: "name-asc"
    }
  };

  const el = id => document.getElementById(id);

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(message, type = "good") {
    const host = el("vlStatus");
    host.className = `vl-status ${type}`;
    host.textContent = message;
  }

  function directChildren(element, tagName = "") {
    return [...(element?.children || [])].filter(child => !tagName || child.tagName === tagName);
  }

  function directChild(element, tagName) {
    return directChildren(element, tagName)[0] || null;
  }

  function textValue(item, tagName) {
    return directChild(item, tagName)?.textContent.trim() || "";
  }

  function attrValue(item, tagName, attribute = "value") {
    return directChild(item, tagName)?.getAttribute(attribute) ?? "";
  }

  function parseXml(text, fileName) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) {
      throw new Error(`${fileName} contains invalid XML.`);
    }
    return doc;
  }

  function normalizeInstallType(value) {
    const raw = String(value || "").trim();
    const key = raw.toLowerCase();

    if (!key) {
      return "";
    }

    if (key === "stock" || key === "vanilla") {
      return "Vanilla";
    }

    if (key === "add-on" || key === "addon" || key === "add on") {
      return "Add-On";
    }

    if (key === "replacement") {
      return "Replacement";
    }

    return raw;
  }

  function installTypeClass(value) {
    const normalized = normalizeInstallType(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown";

    return `install-${normalized}`;
  }

  function installTypeTagLabel(value) {
    const normalized = normalizeInstallType(value);

    if (normalized === "Replacement") {
      return "REPLACE";
    }

    return normalized.toUpperCase();
  }

  function inferInstallType(vehicle) {
    const customType = normalizeInstallType(
      vehicle.custom?.installType
    );

    if (customType) {
      return customType;
    }

    if (
      vehicle.vehiclesMeta?.modelName &&
      vehicle.sources?.vehiclesMeta?.length
    ) {
      return "Unknown";
    }

    return "Unknown";
  }

  function displayTitle(vehicle) {
    return vehicle.custom?.displayName || vehicle.vehiclesMeta?.gameName || vehicle.modelName || "Unnamed Vehicle";
  }

  function cleanClassName(value) {
    const raw = String(value || "UNKNOWN").replace(/^VC_/, "").replaceAll("_", " ").trim();
    return raw ? raw.replace(/\b\w/g, match => match.toUpperCase()) : "Unknown";
  }

  function initials(value) {
    const words = String(value || "??").replace(/[^a-z0-9]+/gi, " ").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "??";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  function parseVehiclesMeta(text, fileName) {
    const doc = parseXml(text, fileName);
    const items = [...doc.querySelectorAll("InitDatas > Item, CVehicleModelInfo__InitDataList > InitDatas > Item")];
    const records = [];

    items.forEach(item => {
      const modelName = textValue(item, "modelName");
      if (!modelName) return;

      records.push({
        modelName,
        vehiclesMeta: {
          modelName,
          txdName: textValue(item, "txdName"),
          handlingId: textValue(item, "handlingId"),
          gameName: textValue(item, "gameName"),
          vehicleMakeName: textValue(item, "vehicleMakeName"),
          vehicleClass: textValue(item, "vehicleClass"),
          vehicleType: textValue(item, "type"),
          audioNameHash: textValue(item, "audioNameHash"),
          layout: textValue(item, "layout"),
          plateType: textValue(item, "plateType"),
          wheelType: textValue(item, "wheelType"),
          frequency: attrValue(item, "frequency"),
          swankness: textValue(item, "swankness"),
          maxNum: attrValue(item, "maxNum"),
          maxNumOfSameColor: attrValue(item, "maxNumOfSameColor"),
          identicalModelSpawnDistance: attrValue(item, "identicalModelSpawnDistance")
        },
        sources: { vehiclesMeta: [fileName] }
      });
    });

    return records;
  }

  const HANDLING_FIELDS = [
    "fMass", "fInitialDragCoeff", "fDownForceModifier", "fPercentSubmerged",
    "fDriveBiasFront", "nInitialDriveGears", "fInitialDriveForce", "fDriveInertia",
    "fClutchChangeRateScaleUpShift", "fClutchChangeRateScaleDownShift", "fInitialDriveMaxFlatVel",
    "fBrakeForce", "fBrakeBiasFront", "fHandBrakeForce", "fSteeringLock",
    "fTractionCurveMax", "fTractionCurveMin", "fTractionCurveLateral",
    "fLowSpeedTractionLossMult", "fTractionBiasFront", "fTractionLossMult",
    "fSuspensionForce", "fSuspensionCompDamp", "fSuspensionReboundDamp",
    "fSuspensionUpperLimit", "fSuspensionLowerLimit", "fSuspensionRaise",
    "fSuspensionBiasFront", "fAntiRollBarForce", "fAntiRollBarBiasFront",
    "fRollCentreHeightFront", "fRollCentreHeightRear", "fCollisionDamageMult",
    "fWeaponDamageMult", "fDeformationDamageMult", "fEngineDamageMult"
  ];

  function parseHandlingMeta(text, fileName) {
    const doc = parseXml(text, fileName);
    const handlingData = [...doc.getElementsByTagName("HandlingData")][0];
    if (!handlingData) return [];

    return directChildren(handlingData, "Item")
      .filter(item => item.getAttribute("type") === "CHandlingData" || directChild(item, "handlingName"))
      .map(item => {
        const handlingName = textValue(item, "handlingName");
        if (!handlingName) return null;
        const profile = {
          id: store.normalizeId(handlingName),
          handlingName,
          AIHandling: textValue(item, "AIHandling"),
          sourceFile: fileName,
          subHandlingTypes: directChildren(directChild(item, "SubHandlingData"), "Item")
            .map(sub => sub.getAttribute("type") || "UNKNOWN")
            .filter(Boolean),
          updatedAt: new Date().toISOString()
        };
        HANDLING_FIELDS.forEach(field => {
          profile[field] = attrValue(item, field);
        });
        return profile;
      })
      .filter(Boolean);
  }

  function parsePopgroups(text, fileName) {
    const doc = parseXml(text, fileName);
    const section = [...doc.getElementsByTagName("vehGroups")][0];
    if (!section) throw new Error(`${fileName} does not contain a vehGroups section.`);

    const memberships = new Map();
    directChildren(section, "Item").forEach(group => {
      const groupName = textValue(group, "Name");
      const modelsNode = directChild(group, "models");
      if (!groupName || !modelsNode) return;

      directChildren(modelsNode).forEach(item => {
        const modelName = textValue(item, "Name") || item.textContent.trim();
        if (!modelName) return;
        const id = store.normalizeId(modelName);
        if (!memberships.has(id)) memberships.set(id, { modelName, groups: [] });
        memberships.get(id).groups.push({ groupName, sourceFile: fileName });
      });
    });

    return memberships;
  }
function getImportSourceDetails(file) {
  const sourceLabel =
    el("vlImportSourceLabel").value.trim();

  const dlcFolder =
    el("vlImportDlcFolder").value.trim();

  const sourceDirectory =
    el("vlImportSourcePath").value
      .trim()
      .replaceAll("\\", "/")
      .replace(/^\/+|\/+$/g, "");

  if (!sourceLabel) {
    throw new Error(
      "Enter a Source Label before importing files."
    );
  }

  const sourcePath = sourceDirectory
    ? `${sourceDirectory}/${file.name}`
    : file.name;

  return {
    sourceLabel,
    dlcFolder,
    sourceDirectory,
    sourcePath,
    sourceFile: sourcePath,
    originalFileName: file.name
  };
}

function splitIntoBatches(records, batchSize = 50) {
  const batches = [];

  for (
    let index = 0;
    index < records.length;
    index += batchSize
  ) {
    batches.push(
      records.slice(index, index + batchSize)
    );
  }

  return batches;
}
function createImportSessionId(type, source) {
  const randomId =
    crypto?.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  return [
    type,
    source.sourcePath,
    randomId
  ].join(":");
}

function buildImportSourcePayload(source) {
  return {
    sourceLabel:
      source.sourceLabel,

    dlcFolder:
      source.dlcFolder,

    sourceDirectory:
      source.sourceDirectory,

    sourcePath:
      source.sourcePath,

    originalFileName:
      source.originalFileName
  };
}


async function importVehicleFiles(files) {
  if (!window.vehicleCloud?.importLibraryBatch) {
    throw new Error(
      "The cloud import service did not load."
    );
  }

  let imported = 0;
  let completedBatches = 0;
  let completedFiles = 0;

  for (const file of files) {
    const source =
      getImportSourceDetails(file);

    const text = await file.text();

    const parsed = parseVehiclesMeta(
      text,
      source.sourceFile
    );

    if (!parsed.length) {
      throw new Error(
        `No vehicle records were found in ${file.name}.`
      );
    }

    /*
     * These records are sent to D1.
     * Source information is included without changing
     * the vehicle's model identity.
     */
    const cloudRecords = parsed.map(record => ({
      ...record,

      custom: {
        ...(record.custom || {}),

        rockstarDlc:
          source.dlcFolder,

        sourcePack:
          source.sourceLabel,

        vehiclesMetaPath:
          source.sourcePath
      },

      sources: {
        ...(record.sources || {}),

        vehiclesMeta: [
          source.sourcePath
        ],

        popgroups:
          record.sources?.popgroups || []
      },

      importSource: {
        sourceLabel:
          source.sourceLabel,

        dlcFolder:
          source.dlcFolder,

        sourceDirectory:
          source.sourceDirectory,

        sourcePath:
          source.sourcePath,

        originalFileName:
          source.originalFileName
      }
    }));

    const batches =
      splitIntoBatches(
        cloudRecords,
        50
      );
	  
	const importSessionId =
	createImportSessionId(
    "vehicles.meta",
    source
  );

	const importSource =
	buildImportSourcePayload(source);
    for (
      let batchIndex = 0;
      batchIndex < batches.length;
      batchIndex++
    ) {
      const batch =
        batches[batchIndex];

      setStatus(
        `Uploading ${file.name}: batch ${
          batchIndex + 1
        } of ${batches.length}...`,
        "warn"
      );

      const result =
  await window.vehicleCloud.importLibraryBatch({
    importMode: "vehicles-meta",
    importSessionId,
    importSource,
    sourceFile:
      source.sourceFile,
    vehicles: batch,
    handlingProfiles: []
  });
      imported += Number(
        result.vehiclesImported ??
        batch.length
      );

      completedBatches++;
    }

    /*
     * Update IndexedDB as a local fallback.
     * Do not pass the cloud custom fields here because
     * mergeVehicle would overwrite saved local details.
     */
    const existingMap = new Map(
      (await store.getVehicles()).map(
        vehicle => [
          vehicle.id,
          vehicle
        ]
      )
    );

    const localRecords =
      parsed.map(record => {
        const localRecord = {
          ...record,

          sources: {
            ...(record.sources || {}),

            vehiclesMeta: [
              source.sourcePath
            ],

            popgroups:
              record.sources?.popgroups || []
          },

          importSource: {
            sourceLabel:
              source.sourceLabel,

            dlcFolder:
              source.dlcFolder,

            sourceDirectory:
              source.sourceDirectory,

            sourcePath:
              source.sourcePath,

            originalFileName:
              source.originalFileName
          }
        };

        return store.mergeVehicle(
          existingMap.get(
            store.normalizeId(
              record.modelName
            )
          ),
          localRecord
        );
      });

    await store.putVehicles(
      localRecords
    );

    await store.putSource({
      id:
        `vehicles:` +
        [
          source.sourceLabel,
          source.dlcFolder,
          source.sourcePath
        ]
          .join("|")
          .toLowerCase(),

      type: "vehicles.meta",
      fileName: file.name,
      sourceLabel:
        source.sourceLabel,
      dlcFolder:
        source.dlcFolder,
      sourceDirectory:
        source.sourceDirectory,
      sourcePath:
        source.sourcePath,
      recordCount:
        parsed.length,
      importedAt:
        new Date().toISOString()
    });

    completedFiles++;
  }

  setStatus(
    `Imported or updated ${imported.toLocaleString()} ` +
    `vehicle records from ${completedFiles.toLocaleString()} ` +
    `file${completedFiles === 1 ? "" : "s"} in ` +
    `${completedBatches.toLocaleString()} cloud ` +
    `batch${completedBatches === 1 ? "" : "es"}.`,
    "good"
  );
}

async function importHandlingFiles(files) {
  if (!window.vehicleCloud?.importLibraryBatch) {
    throw new Error(
      "The cloud import service did not load."
    );
  }

  let imported = 0;
  let completedBatches = 0;

  for (const file of files) {
    const source =
      getImportSourceDetails(file);

    const text = await file.text();

    const profiles = parseHandlingMeta(
      text,
      source.sourceFile
    ).map(profile => ({
      ...profile,

      sourceFile: source.sourceFile,
      sourceLabel: source.sourceLabel,
      dlcFolder: source.dlcFolder,
      sourceDirectory: source.sourceDirectory,
      sourcePath: source.sourcePath,
      originalFileName:
        source.originalFileName,

      updatedAt: new Date().toISOString()
    }));

    if (!profiles.length) {
      throw new Error(
        `No handling profiles were found in ${file.name}.`
      );
    }

    const batches =
      splitIntoBatches(profiles, 50);
	  
const importSessionId =
  createImportSessionId(
    "handling.meta",
    source
  );

const importSource =
  buildImportSourcePayload(source);
  
    for (
      let batchIndex = 0;
      batchIndex < batches.length;
      batchIndex++
    ) {
      const batch = batches[batchIndex];

      setStatus(
        `Uploading ${file.name}: batch ${
          batchIndex + 1
        } of ${batches.length}...`,
        "warn"
      );

      const result =
  await window.vehicleCloud.importLibraryBatch({
    importMode: "handling-meta",
    importSessionId,
    importSource,
    sourceFile:
      source.sourceFile,
    vehicles: [],
    handlingProfiles: batch
  });

      imported += Number(
        result.handlingProfilesImported ??
        batch.length
      );

      completedBatches++;
    }

    await store.putHandlingProfiles(
      profiles
    );

    await store.putSource({
      id:
        `handling:` +
        [
          source.sourceLabel,
          source.dlcFolder,
          source.sourcePath
        ]
          .join("|")
          .toLowerCase(),

      type: "handling.meta",
      fileName: file.name,
      sourceLabel: source.sourceLabel,
      dlcFolder: source.dlcFolder,
      sourceDirectory:
        source.sourceDirectory,
      sourcePath: source.sourcePath,
      recordCount: profiles.length,
      importedAt: new Date().toISOString()
    });
  }

  setStatus(
    `Imported or updated ${imported.toLocaleString()} ` +
    `handling profiles in ${completedBatches.toLocaleString()} ` +
    `cloud batch${completedBatches === 1 ? "" : "es"}.`,
    "good"
  );
}

async function importPopgroupsFiles(files) {
  if (!window.vehicleCloud?.importLibraryBatch) {
    throw new Error(
      "The cloud import service did not load."
    );
  }

  let membershipCount = 0;
  let completedBatches = 0;
  let completedFiles = 0;

  for (const file of files) {
    const source =
      getImportSourceDetails(file);

    const text = await file.text();

    const memberships =
      parsePopgroups(
        text,
        source.sourceFile
      );

    const records = [
      ...memberships.values()
    ].map(entry => ({
      modelName: entry.modelName,

      popgroups: entry.groups.map(group => ({
        groupName: group.groupName,
        sourceFile: source.sourceFile
      })),

      sources: {
        vehiclesMeta: [],
        popgroups: [
          source.sourceFile
        ]
      },

      importSource: {
        sourceLabel:
          source.sourceLabel,

        dlcFolder:
          source.dlcFolder,

        sourceDirectory:
          source.sourceDirectory,

        sourcePath:
          source.sourcePath,

        originalFileName:
          source.originalFileName
      }
    }));

    if (!records.length) {
      throw new Error(
        `No Popgroups vehicle memberships were found in ${file.name}.`
      );
    }

    const batches =
      splitIntoBatches(
        records,
        50
      );
const importSessionId =
  createImportSessionId(
    "popgroups",
    source
  );

const importSource =
  buildImportSourcePayload(source);
    for (
      let batchIndex = 0;
      batchIndex < batches.length;
      batchIndex++
    ) {
      const batch =
        batches[batchIndex];

      setStatus(
        `Uploading ${file.name}: batch ${
          batchIndex + 1
        } of ${batches.length}...`,
        "warn"
      );

      const result =
  await window.vehicleCloud.importLibraryBatch({
    importMode: "popgroups",
    importSessionId,
    importSource,
    sourceFile:
      source.sourceFile,
    replaceSource:
      batchIndex === 0,
    vehicles: batch,
    handlingProfiles: []
  });

      membershipCount += Number(
        result.popgroupsImported ??
        batch.reduce(
          (total, record) =>
            total + record.popgroups.length,
          0
        )
      );

      completedBatches++;
    }

    const current =
      await store.getVehicles();

    const currentMap =
      new Map(
        current.map(vehicle => [
          vehicle.id,
          vehicle
        ])
      );

    currentMap.forEach(vehicle => {
      vehicle.popgroups =
        (vehicle.popgroups || []).filter(
          group =>
            group.sourceFile !== source.sourceFile
        );

      vehicle.sources =
        vehicle.sources || {
          vehiclesMeta: [],
          popgroups: []
        };

      vehicle.sources.popgroups =
        (vehicle.sources.popgroups || []).filter(
          name => name !== source.sourceFile
        );
    });

    records.forEach(record => {
      const id =
        store.normalizeId(
          record.modelName
        );

      const vehicle =
        currentMap.get(id) ||
        store.createVehicleSkeleton(
          record.modelName
        );

      vehicle.popgroups = [
        ...(vehicle.popgroups || []),
        ...record.popgroups
      ].filter(
        (group, index, list) =>
          list.findIndex(candidate =>
            candidate.groupName === group.groupName &&
            candidate.sourceFile === group.sourceFile
          ) === index
      );

      vehicle.sources =
        vehicle.sources || {
          vehiclesMeta: [],
          popgroups: []
        };

      vehicle.sources.popgroups =
        store.unique([
          ...(vehicle.sources.popgroups || []),
          source.sourceFile
        ]);

      vehicle.updatedAt =
        new Date().toISOString();

      currentMap.set(id, vehicle);
    });

    await store.putVehicles([
      ...currentMap.values()
    ]);

    await store.putSource({
      id:
        `popgroups:` +
        [
          source.sourceLabel,
          source.dlcFolder,
          source.sourcePath
        ]
          .join("|")
          .toLowerCase(),

      type: "Popgroups",
      fileName: file.name,
      sourceLabel:
        source.sourceLabel,
      dlcFolder:
        source.dlcFolder,
      sourceDirectory:
        source.sourceDirectory,
      sourcePath:
        source.sourcePath,
      recordCount:
        records.reduce(
          (total, record) =>
            total + record.popgroups.length,
          0
        ),
      importedAt:
        new Date().toISOString()
    });

    completedFiles++;
  }

  setStatus(
    `Imported ${membershipCount.toLocaleString()} ` +
    `vehicle-to-group memberships from ` +
    `${completedFiles.toLocaleString()} ` +
    `Popgroups file${completedFiles === 1 ? "" : "s"} ` +
    `in ${completedBatches.toLocaleString()} cloud ` +
    `batch${completedBatches === 1 ? "" : "es"}.`,
    "good"
  );
}

  function vehicleIdFromAssetFile(fileName) {
    const name = String(fileName || "").trim();
    const match = name.match(/^(.*)\.(yft|ytd)$/i);
    if (!match) return "";
    return store.normalizeId(match[1].replace(/_hi$/i, ""));
  }

  async function toggleInstalledFromAssetFiles(fileList) {
    const files = [...(fileList || [])].filter(file => /\.(yft|ytd)$/i.test(file.name));
    const resultHost = el("vlInstallScanResult");

    if (!files.length) {
      resultHost.innerHTML = `<div class="vl-scan-warning">No .yft or .ytd files were detected.</div>`;
      setStatus("No supported vehicle files were detected.", "warn");
      return;
    }

    const fileNamesById = new Map();
    files.forEach(file => {
      const id = vehicleIdFromAssetFile(file.name);
      if (!id) return;
      if (!fileNamesById.has(id)) fileNamesById.set(id, []);
      fileNamesById.get(id).push(file.name);
    });

    const currentMap = new Map((await store.getVehicles()).map(vehicle => [vehicle.id, vehicle]));
    const updated = [];
    const installed = [];
    const uninstalled = [];
    const unmatched = [];
    const today = new Date().toISOString().slice(0, 10);

    fileNamesById.forEach((names, id) => {
      const vehicle = currentMap.get(id);
      if (!vehicle) {
        unmatched.push({ id, names });
        return;
      }

      vehicle.custom = vehicle.custom || {};
      const nextInstalled = vehicle.custom.installed !== true;
      vehicle.custom.installed = nextInstalled;
      vehicle.custom.installDate = nextInstalled ? (vehicle.custom.installDate || today) : "";
      vehicle.custom.lastInstallScanFiles = names;
      vehicle.custom.lastInstallScanAt = new Date().toISOString();
      vehicle.updatedAt = new Date().toISOString();
      updated.push(vehicle);
      (nextInstalled ? installed : uninstalled).push(vehicle.modelName);
    });

    if (updated.length) await store.putVehicles(updated);
    await reloadData();

    const unmatchedPreview = unmatched.slice(0, 12).map(item => `<code>${escapeHTML(item.id)}</code>`).join(", ");
    resultHost.innerHTML = `
      <div class="vl-scan-summary">
        <div><strong>${installed.length}</strong><span>Marked installed</span></div>
        <div><strong>${uninstalled.length}</strong><span>Marked uninstalled</span></div>
        <div><strong>${unmatched.length}</strong><span>Not found in library</span></div>
        <div><strong>${files.length}</strong><span>Files scanned</span></div>
      </div>
      ${unmatched.length ? `<div class="vl-scan-warning"><strong>Unmatched models:</strong> ${unmatchedPreview}${unmatched.length > 12 ? ` and ${unmatched.length - 12} more` : ""}</div>` : ""}
    `;

    const actionText = [
      installed.length ? `${installed.length} installed` : "",
      uninstalled.length ? `${uninstalled.length} uninstalled` : "",
      unmatched.length ? `${unmatched.length} unmatched` : ""
    ].filter(Boolean).join(", ");
    setStatus(`Vehicle file scan complete: ${actionText || "no matching vehicles changed"}.`, unmatched.length ? "warn" : "good");
  }

  async function handleImport(input, importer) {
    const files = [...input.files];
    if (!files.length) return;
    input.value = "";
    setStatus(`Importing ${files.length} file${files.length === 1 ? "" : "s"}...`, "warn");
    try {
      await importer(files);
      await reloadData();
    } catch (error) {
      console.error(error);
      setStatus(error.message || "The files could not be imported.", "bad");
    }
  }

 async function reloadData() {
  const [localVehicles, localHandlingProfiles] =
    await Promise.all([
      store.getVehicles(),
      store.getHandlingProfiles()
    ]);

  let vehicles = localVehicles;
  let handlingProfiles = localHandlingProfiles;
  let source = "local";

  if (window.vehicleCloud) {
    try {
      const cloudData =
        await window.vehicleCloud.getLibraryData(
          localVehicles
        );

      if (cloudData.vehicles.length > 0) {
        vehicles = cloudData.vehicles;
        handlingProfiles =
          cloudData.handlingProfiles;
        source = "cloud";

        await Promise.all([
          store.putVehicles(vehicles),
          store.putHandlingProfiles(
            handlingProfiles
          )
        ]);
      }
    } catch (error) {
      console.warn(
        "Cloud library unavailable. Using IndexedDB.",
        error
      );
    }
  }

  state.vehicles = vehicles;

  state.handlingMap = new Map(
    handlingProfiles.map(profile => [
      store.normalizeId(
        profile.handlingName || profile.id || ""
      ),
      profile
    ])
  );

  populateFilters();
  renderAll();
  refreshSourceHistory(false).catch(error => {
  console.warn(
    "Source history refresh failed.",
    error
  );
});

  if (source === "cloud") {
    setStatus(
      `Loaded ${vehicles.length.toLocaleString()} vehicles, ` +
      `${handlingProfiles.length.toLocaleString()} handling profiles, ` +
      `and cloud popgroups.`,
      "good"
    );
  } else {
    setStatus(
      `Cloud database unavailable. Loaded ` +
      `${vehicles.length.toLocaleString()} vehicles from this browser.`,
      vehicles.length ? "warn" : "bad"
    );
  }
}

  function linkedHandling(vehicle) {
    return state.handlingMap.get(store.normalizeId(vehicle.vehiclesMeta?.handlingId || "")) || null;
  }

  function populateFilters() {
    const types = [...new Set(state.vehicles.map(v => v.vehiclesMeta?.vehicleType).filter(Boolean))].sort();
    const aiValues = [...new Set(state.vehicles.map(v => linkedHandling(v)?.AIHandling).filter(Boolean))].sort();
    const typeFilter = el("vlTypeFilter");
    const aiFilter = el("vlAiFilter");
    const currentType = typeFilter.value;
    const currentAi = aiFilter.value;
    typeFilter.innerHTML = `<option value="">All types</option>${types.map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("")}`;
    aiFilter.innerHTML = `<option value="">All AI profiles</option>${aiValues.map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("")}`;
    if (types.includes(currentType)) typeFilter.value = currentType;
    if (aiValues.includes(currentAi)) aiFilter.value = currentAi;
  }

  function categoryCounts() {
    const counts = new Map([
      ["ALL", state.vehicles.length],
      ["INSTALLED", state.vehicles.filter(vehicle => vehicle.custom?.installed === true).length]
    ]);
    state.vehicles.forEach(vehicle => {
      const raw = vehicle.vehiclesMeta?.vehicleClass || "UNKNOWN";
      counts.set(raw, (counts.get(raw) || 0) + 1);
    });
    return counts;
  }

  function renderCategories() {
    const counts = categoryCounts();
    const entries = [...counts.entries()].sort((a, b) => {
      if (a[0] === "ALL") return -1;
      if (b[0] === "ALL") return 1;
      if (a[0] === "INSTALLED") return -1;
      if (b[0] === "INSTALLED") return 1;
      return cleanClassName(a[0]).localeCompare(cleanClassName(b[0]));
    });
    el("vlCategoryList").innerHTML = entries.map(([key, count]) => `
      <button class="vl-category-button ${state.category === key ? "active" : ""}" type="button" data-category="${escapeHTML(key)}">
        <span>${key === "ALL" ? "All Vehicles" : key === "INSTALLED" ? "Installed Vehicles" : cleanClassName(key)}</span><strong>${count.toLocaleString()}</strong>
      </button>
    `).join("");
    el("vlCategoryList").querySelectorAll("[data-category]").forEach(button => {
      button.addEventListener("click", () => {
        state.category = button.dataset.category;
        state.page = 1;
        renderAll();
      });
    });
  }

  function searchableText(vehicle, handling) {
    return [
      vehicle.modelName,
      ...Object.values(vehicle.vehiclesMeta || {}),
      ...(vehicle.popgroups || []).flatMap(group => [group.groupName, group.sourceFile]),
      vehicle.custom?.displayName,
      vehicle.custom?.rockstarDlc,
      vehicle.custom?.sourcePack,
      vehicle.custom?.installType,
      vehicle.custom?.replacementFor,
      vehicle.custom?.dlcFolderPath,
      vehicle.custom?.yftPath,
      vehicle.custom?.yftHiPath,
      vehicle.custom?.ytdPath,
      vehicle.custom?.vehiclesMetaPath,
      vehicle.custom?.handlingMetaPath,
      vehicle.custom?.downloadUrl,
      vehicle.custom?.tags,
      vehicle.custom?.notes,
      handling?.handlingName,
      handling?.AIHandling,
      ...(handling?.subHandlingTypes || [])
    ].join(" ").toLowerCase();
  }

  function getFilteredVehicles() {
    const query = state.filters.search.toLowerCase().trim();
    const filtered = state.vehicles.filter(vehicle => {
      const handling = linkedHandling(vehicle);
      if (state.category === "INSTALLED" && vehicle.custom?.installed !== true) return false;
      if (state.category !== "ALL" && state.category !== "INSTALLED" && (vehicle.vehiclesMeta?.vehicleClass || "UNKNOWN") !== state.category) return false;
      if (state.filters.type && vehicle.vehiclesMeta?.vehicleType !== state.filters.type) return false;
      if (state.filters.ai && handling?.AIHandling !== state.filters.ai) return false;
      if (state.filters.install && inferInstallType(vehicle) !== state.filters.install) return false;
      if (state.filters.installed === "installed" && vehicle.custom?.installed !== true) return false;
      if (state.filters.installed === "not-installed" && vehicle.custom?.installed === true) return false;
      if (state.filters.favoritesOnly && !vehicle.custom?.favorite) return false;
      if (query && !searchableText(vehicle, handling).includes(query)) return false;
      return true;
    });

    const sorters = {
      "name-asc": (a, b) => displayTitle(a).localeCompare(displayTitle(b)),
      "name-desc": (a, b) => displayTitle(b).localeCompare(displayTitle(a)),
      "make-asc": (a, b) => (a.vehiclesMeta?.vehicleMakeName || "").localeCompare(b.vehiclesMeta?.vehicleMakeName || "") || displayTitle(a).localeCompare(displayTitle(b)),
      "class-asc": (a, b) => (a.vehiclesMeta?.vehicleClass || "").localeCompare(b.vehiclesMeta?.vehicleClass || "") || displayTitle(a).localeCompare(displayTitle(b)),
      "ai-asc": (a, b) => (linkedHandling(a)?.AIHandling || "").localeCompare(linkedHandling(b)?.AIHandling || "") || displayTitle(a).localeCompare(displayTitle(b)),
      "installed-first": (a, b) => Number(b.custom?.installed === true) - Number(a.custom?.installed === true) || displayTitle(a).localeCompare(displayTitle(b)),
      "not-installed-first": (a, b) => Number(a.custom?.installed === true) - Number(b.custom?.installed === true) || displayTitle(a).localeCompare(displayTitle(b)),
      "updated-desc": (a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
    };
    filtered.sort(sorters[state.filters.sort] || sorters["name-asc"]);
    return filtered;
  }

  function renderStats() {
    const withImages = state.vehicles.filter(v => v.custom?.imageDataUrl).length;
    const withHandling = state.vehicles.filter(v => linkedHandling(v)).length;
    const inGroups = state.vehicles.filter(v => (v.popgroups || []).length).length;
    const installed = state.vehicles.filter(v => v.custom?.installed === true).length;
    el("vlStats").innerHTML = `
      <div><strong>${state.vehicles.length.toLocaleString()}</strong><span>Vehicles</span></div>
      <div><strong>${withImages.toLocaleString()}</strong><span>With Images</span></div>
      <div><strong>${withHandling.toLocaleString()}</strong><span>Handling Linked</span></div>
      <div><strong>${inGroups.toLocaleString()}</strong><span>In Popgroups</span></div>
      <div><strong>${installed.toLocaleString()}</strong><span>Installed</span></div>
    `;
  }
function formatSourceHistoryDate(value) {
  if (!value) {
    return "No date";
  }

  const normalized =
    String(value).includes("T")
      ? String(value)
      : String(value).replace(" ", "T") + "Z";

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function renderSourceHistory() {
  const host = el("vlSourceHistoryList");

  if (!host) {
    return;
  }

  if (!state.sourceHistory.length) {
    host.innerHTML = `
      <div class="vl-source-history-empty">
        No source history records found.
      </div>
    `;
    return;
  }

  host.innerHTML = state.sourceHistory
    .slice(0, 6)
    .map(entry => {
      const title =
        entry.sourceLabel ||
        entry.originalFileName ||
        entry.sourcePath ||
        "Unknown source";

      const sourceType =
        entry.sourceType ||
        "unknown";

      const recordCount =
        Number(entry.recordCount || 0);

      return `
        <article class="vl-source-history-item">
          <div class="vl-source-history-topline">
            <strong>${escapeHTML(title)}</strong>
            <span>${escapeHTML(sourceType)}</span>
          </div>

          <div class="vl-source-history-path" title="${escapeHTML(entry.sourcePath || "")}">
            ${escapeHTML(entry.sourcePath || "No source path")}
          </div>

          <div class="vl-source-history-meta">
            <span>${recordCount.toLocaleString()} records</span>
            <span>${escapeHTML(formatSourceHistoryDate(entry.importedAt))}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function refreshSourceHistory(showStatus = false) {
  const host = el("vlSourceHistoryList");

  if (!window.vehicleCloud?.getSourceHistory) {
    if (host) {
      host.innerHTML = `
        <div class="vl-source-history-empty">
          Source history is not available in this build.
        </div>
      `;
    }

    return;
  }

  if (host) {
    host.innerHTML = `
      <div class="vl-source-history-empty">
        Loading recent imports...
      </div>
    `;
  }

  try {
    state.sourceHistory =
      await window.vehicleCloud.getSourceHistory({
        limit: 6
      });

    renderSourceHistory();

    if (showStatus) {
      setStatus(
        "Source History refreshed.",
        "good"
      );
    }
  } catch (error) {
    console.warn(
      "Source history could not be loaded.",
      error
    );

    if (host) {
      host.innerHTML = `
        <div class="vl-source-history-empty">
          Source history could not be loaded.
        </div>
      `;
    }

    if (showStatus) {
      setStatus(
        error.message ||
        "Source history could not be loaded.",
        "warn"
      );
    }
  }
}

  function setupStaticImageFallbacks(host) {
    host.querySelectorAll("img[data-vl-static-model]").forEach(image => {
      let step = 0;
      const model = image.dataset.vlStaticModel;
      const label = image.dataset.vlInitials || "??";
      image.addEventListener("error", function tryNext() {
        step += 1;
        if (step === 1) { image.src = `images/${encodeURIComponent(model)}.png`; return; }
        if (step === 2) { image.src = `images/${encodeURIComponent(model)}.webp`; return; }
        const placeholder = document.createElement("div");
        placeholder.className = "vl-card-placeholder";
        placeholder.textContent = label;
        image.replaceWith(placeholder);
      });
    });
  }

function cardHtml(vehicle) {
  const handling = linkedHandling(vehicle);
  const title = displayTitle(vehicle);
  const image = vehicle.custom?.imageDataUrl;
  const classLabel = cleanClassName(vehicle.vehiclesMeta?.vehicleClass);
  const installType = inferInstallType(vehicle);
  const installTypeTag =
    installType !== "Unknown"
      ? `<span class="vl-image-install-tag ${escapeHTML(installTypeClass(installType))}">${escapeHTML(installTypeTagLabel(installType))}</span>`
      : "";
  const detailsUrl = `vehicle-details.html?model=${encodeURIComponent(vehicle.modelName)}`;

  const imageHtml = image
    ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(title)}">`
    : `<img data-vl-static-model="${escapeHTML(vehicle.modelName.toLowerCase())}" data-vl-initials="${escapeHTML(initials(title))}" src="images/${encodeURIComponent(vehicle.modelName.toLowerCase())}.jpg" alt="${escapeHTML(title)}">`;

  return `
    <article class="vl-vehicle-card" data-model="${escapeHTML(vehicle.modelName)}">
      <div class="vl-vehicle-card-image">
        <a class="vl-vehicle-photo-link" href="${escapeHTML(detailsUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHTML(title)} details in a new tab">
          ${imageHtml}
        </a>

        ${installTypeTag}

        <button class="vl-favorite-button ${vehicle.custom?.favorite ? "active" : ""}" type="button" data-favorite="${escapeHTML(vehicle.modelName)}" title="Toggle favorite">${vehicle.custom?.favorite ? "★" : "☆"}</button>

        <div class="vl-card-source-dots">
          <span class="vl-source-dot ${vehicle.vehiclesMeta?.modelName ? "ready" : ""}">META</span>
          <span class="vl-source-dot ${handling ? "ready" : ""}">HANDLING</span>
          <span class="vl-source-dot ${(vehicle.popgroups || []).length ? "ready" : ""}">GROUPS</span>
        </div>
      </div>

      <div class="vl-card-copy">
        <div class="vl-card-title-row">
          <h3 class="vl-card-title">${escapeHTML(title)}</h3>
        </div>

        <p class="vl-card-model">${escapeHTML(vehicle.modelName)}</p>

        <div class="vl-card-badges">
          <span class="vl-badge">${escapeHTML(classLabel)}</span>
          ${handling?.AIHandling ? `<span class="vl-badge ai">${escapeHTML(handling.AIHandling)}</span>` : ""}
          ${vehicle.custom?.installed === true ? `<span class="vl-badge installed-status">INSTALLED</span>` : ""}
          ${installType !== "Unknown" ? `<span class="vl-badge install">${escapeHTML(installType)}</span>` : ""}
        </div>

        <div class="vl-card-actions">
          <a href="${escapeHTML(detailsUrl)}">Open Vehicle Details</a>
          <button
            type="button"
            class="vl-compare-toggle ${isComparing(vehicle.modelName) ? "active" : ""}"
            data-compare-toggle="${escapeHTML(vehicle.modelName)}"
          >${isComparing(vehicle.modelName) ? "Remove Compare" : "Compare"}</button>
        </div>
      </div>
    </article>
  `;
}

  // ── Compare Vehicles ──────────────────────────────────────────────

  function isComparing(modelName) {
    return state.compare.includes(store.normalizeId(modelName));
  }

  function toggleCompare(modelName) {
    const id = store.normalizeId(modelName);
    const index = state.compare.indexOf(id);

    if (index >= 0) {
      state.compare.splice(index, 1);
    } else {
      if (state.compare.length >= MAX_COMPARE) {
        setStatus(`You can compare up to ${MAX_COMPARE} vehicles at a time. Remove one first.`, "warn");
        return;
      }
      state.compare.push(id);
    }

    renderGrid();
  }

  function getCompareVehicles() {
    return state.compare
      .map(id => state.vehicles.find(vehicle => store.normalizeId(vehicle.modelName) === id))
      .filter(Boolean);
  }

  function compareThumbHtml(vehicle) {
    const image = vehicle.custom?.imageDataUrl;
    const title = displayTitle(vehicle);
    if (image) {
      return `<img src="${escapeHTML(image)}" alt="${escapeHTML(title)}">`;
    }
    return `<img data-vl-static-model="${escapeHTML(vehicle.modelName.toLowerCase())}" data-vl-initials="${escapeHTML(initials(title))}" src="images/${encodeURIComponent(vehicle.modelName.toLowerCase())}.jpg" alt="${escapeHTML(title)}">`;
  }

  function renderCompareTray() {
    const tray = el("vlCompareTray");
    const chips = el("vlCompareChips");
    const openButton = el("vlCompareOpen");

    if (!tray || !chips || !openButton) {
      return;
    }

    const vehicles = getCompareVehicles();

    if (!vehicles.length) {
      tray.classList.add("vl-hidden");
      return;
    }

    tray.classList.remove("vl-hidden");

    chips.innerHTML = vehicles.map(vehicle => `
      <span class="vl-compare-chip">
        ${escapeHTML(displayTitle(vehicle))}
        <button type="button" data-compare-remove="${escapeHTML(vehicle.modelName)}" aria-label="Remove ${escapeHTML(displayTitle(vehicle))} from compare">&times;</button>
      </span>
    `).join("") + (vehicles.length < MAX_COMPARE
      ? `<span class="vl-compare-chip-empty">${MAX_COMPARE - vehicles.length} slot${MAX_COMPARE - vehicles.length === 1 ? "" : "s"} open</span>`
      : "");

    chips.querySelectorAll("[data-compare-remove]").forEach(button => {
      button.addEventListener("click", () => toggleCompare(button.dataset.compareRemove));
    });

    openButton.textContent = `Compare (${vehicles.length})`;
    openButton.disabled = vehicles.length < 2;
  }

  function numericHandlingValue(handling, field) {
    if (!handling) return null;
    const raw = Number.parseFloat(handling[field]);
    return Number.isFinite(raw) ? raw : null;
  }

  function compareStatRow(label, vehicles, getValue, { bar = false, decimals = 0 } = {}) {
    const values = vehicles.map(getValue);
    const numeric = values.filter(value => value !== null && value !== undefined && !Number.isNaN(value));
    const max = numeric.length ? Math.max(...numeric) : 0;

    const cells = values.map(value => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return `<td>—</td>`;
      }

      const isBest = numeric.length > 1 && value === max;
      const formatted = decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString();

      if (!bar) {
        return `<td><span class="vl-compare-stat-value ${isBest ? "best" : ""}">${escapeHTML(formatted)}</span></td>`;
      }

      const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;

      return `
        <td>
          <div class="vl-compare-stat-cell">
            <div class="vl-compare-bar-track"><div class="vl-compare-bar-fill" style="width:${width}%"></div></div>
            <span class="vl-compare-stat-value ${isBest ? "best" : ""}">${escapeHTML(formatted)}</span>
          </div>
        </td>
      `;
    });

    return `<tr><th>${escapeHTML(label)}</th>${cells.join("")}</tr>`;
  }

  function compareTextRow(label, vehicles, getValue) {
    const cells = vehicles.map(vehicle => `<td>${escapeHTML(getValue(vehicle) || "—")}</td>`);
    return `<tr><th>${escapeHTML(label)}</th>${cells.join("")}</tr>`;
  }

  function renderCompareModalBody() {
    const body = el("vlCompareModalBody");

    if (!body) {
      return;
    }

    const vehicles = getCompareVehicles();

    if (vehicles.length < 2) {
      body.innerHTML = `<div class="vl-empty-state"><strong>Pick at least two vehicles.</strong><span>Use the Compare button on any vehicle card in the library.</span></div>`;
      return;
    }

    const slots = vehicles.map(vehicle => {
      const classLabel = cleanClassName(vehicle.vehiclesMeta?.vehicleClass);
      return `
        <div class="vl-compare-slot">
          <div class="vl-compare-slot-image">${compareThumbHtml(vehicle)}</div>
          <button type="button" class="vl-compare-slot-remove" data-compare-remove="${escapeHTML(vehicle.modelName)}" aria-label="Remove ${escapeHTML(displayTitle(vehicle))}">&times;</button>
          <div class="vl-compare-slot-body">
            <p class="vl-compare-slot-title">${escapeHTML(displayTitle(vehicle))}</p>
            <p class="vl-compare-slot-model">${escapeHTML(vehicle.modelName)}</p>
            <span class="vl-badge">${escapeHTML(classLabel)}</span>
          </div>
        </div>
      `;
    });

    for (let i = vehicles.length; i < MAX_COMPARE; i++) {
      slots.push(`
        <div class="vl-compare-slot empty">
          <span class="vl-compare-slot-empty-text">Add another vehicle from the library grid</span>
        </div>
      `);
    }

    const rows = [
      compareTextRow("Class", vehicles, v => cleanClassName(v.vehiclesMeta?.vehicleClass)),
      compareTextRow("Make", vehicles, v => v.vehiclesMeta?.vehicleMakeName),
      compareTextRow("Handling profile", vehicles, v => linkedHandling(v)?.handlingName || v.vehiclesMeta?.handlingId),
      compareTextRow("AI handling", vehicles, v => linkedHandling(v)?.AIHandling),
      compareStatRow("Top speed (flat vel)", vehicles, v => numericHandlingValue(linkedHandling(v), "fInitialDriveMaxFlatVel"), { bar: true, decimals: 1 }),
      compareStatRow("Drive force (accel)", vehicles, v => numericHandlingValue(linkedHandling(v), "fInitialDriveForce"), { bar: true, decimals: 2 }),
      compareStatRow("Brake force", vehicles, v => numericHandlingValue(linkedHandling(v), "fBrakeForce"), { bar: true, decimals: 1 }),
      compareStatRow("Traction (max)", vehicles, v => numericHandlingValue(linkedHandling(v), "fTractionCurveMax"), { bar: true, decimals: 2 }),
      compareTextRow("Popgroup membership", vehicles, v => [...new Set((v.popgroups || []).map(group => group.groupName))].join(", ")),
      compareTextRow("Install status", vehicles, v => v.custom?.installed === true ? "Installed" : "Not installed"),
      compareTextRow("Install type", vehicles, v => inferInstallType(v)),
      compareTextRow("Tags", vehicles, v => v.custom?.tags)
    ];

    body.innerHTML = `
      <div class="vl-compare-slots">${slots.join("")}</div>
      <div class="vl-compare-table-wrap">
        <table class="vl-compare-table">
          <thead>
            <tr>
              <th>Stat</th>
              ${vehicles.map(vehicle => `<th>${escapeHTML(displayTitle(vehicle))}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    `;

    setupStaticImageFallbacks(body);

    body.querySelectorAll("[data-compare-remove]").forEach(button => {
      button.addEventListener("click", () => {
        toggleCompare(button.dataset.compareRemove);
        renderCompareModalBody();
      });
    });
  }

  function openCompareModal() {
    if (getCompareVehicles().length < 2) {
      setStatus("Pick at least two vehicles to compare.", "warn");
      return;
    }
    renderCompareModalBody();
    el("vlCompareModalOverlay")?.classList.remove("vl-hidden");
  }

  function closeCompareModal() {
    el("vlCompareModalOverlay")?.classList.add("vl-hidden");
  }

  function renderGrid() {
    const filtered = getFilteredVehicles();
	const pageSize = state.pageSize || DEFAULT_PAGE_SIZE;
	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	state.page = Math.min(state.page, totalPages);
	const start = (state.page - 1) * pageSize;
	const visible = filtered.slice(start, start + pageSize);

	el("vlResultCount").textContent = filtered.length
  ? `Showing ${start + 1}-${Math.min(start + pageSize, filtered.length)} of ${filtered.length.toLocaleString()} vehicles`
  : "0 vehicles";

    const grid = el("vlVehicleGrid");
    grid.classList.toggle("list-view", state.view === "list");
    grid.innerHTML = visible.length ? visible.map(cardHtml).join("") : `
      <div class="vl-empty-state"><strong>No vehicles match these filters.</strong><span>Try another category, search, or import more source files.</span></div>
    `;

    setupStaticImageFallbacks(grid);

grid.querySelectorAll(
  "[data-favorite]"
).forEach(button => {
  button.addEventListener(
    "click",
    async event => {
      event.preventDefault();
      event.stopPropagation();

      const modelName =
        button.dataset.favorite;

      const vehicle = state.vehicles.find(
        candidate =>
          candidate.modelName.toLowerCase() ===
          modelName.toLowerCase()
      );

      if (!vehicle) {
        return;
      }

      const nextFavorite =
        !vehicle.custom?.favorite;

      button.disabled = true;

      try {
        await window.vehicleCloud.updateVehicle(
          vehicle.modelName,
          {
            favorite: nextFavorite
          }
        );

        await reloadData();

        setStatus(
          nextFavorite
            ? `${vehicle.modelName} added to favorites.`
            : `${vehicle.modelName} removed from favorites.`,
          "good"
        );
      } catch (error) {
        console.error(error);

        setStatus(
          error.message ||
          "Favorite status could not be saved.",
          "bad"
        );
      } finally {
        button.disabled = false;
      }
    }
  );
});

  grid.querySelectorAll(
  "[data-installed]"
).forEach(button => {
  button.addEventListener(
    "click",
    async event => {
      event.preventDefault();
      event.stopPropagation();

      const modelName =
        button.dataset.installed;

      const vehicle = state.vehicles.find(
        candidate =>
          candidate.modelName.toLowerCase() ===
          modelName.toLowerCase()
      );

      if (!vehicle) {
        return;
      }

      const nextInstalled =
        vehicle.custom?.installed !== true;

      const changes = {
        installed: nextInstalled
      };

      if (
        nextInstalled &&
        !vehicle.custom?.installDate
      ) {
        changes.installDate =
          new Date().toISOString().slice(0, 10);
      }

      button.disabled = true;

      try {
        await window.vehicleCloud.updateVehicle(
          vehicle.modelName,
          changes
        );

        await reloadData();

        setStatus(
          `${vehicle.modelName} marked ${
            nextInstalled
              ? "installed"
              : "not installed"
          }.`,
          "good"
        );
      } catch (error) {
        console.error(error);

        setStatus(
          error.message ||
          "Installed status could not be saved.",
          "bad"
        );
      } finally {
        button.disabled = false;
      }
    }
  );
});

grid.querySelectorAll(
  "[data-compare-toggle]"
).forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    toggleCompare(button.dataset.compareToggle);
  });
});

    renderPagination(totalPages);
    renderCompareTray();
  }

  function renderPagination(totalPages) {
    const host = el("vlPagination");
    if (totalPages <= 1) {
      host.innerHTML = "";
      return;
    }

    const pages = new Set([1, totalPages, state.page - 1, state.page, state.page + 1]);
    const validPages = [...pages].filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);
    const pieces = [];
    let previous = 0;
    validPages.forEach(page => {
      if (previous && page - previous > 1) pieces.push(`<span>…</span>`);
      pieces.push(`<button type="button" class="${page === state.page ? "active" : ""}" data-page="${page}">${page}</button>`);
      previous = page;
    });
    host.innerHTML = `<button type="button" data-page="${Math.max(1, state.page - 1)}">‹</button>${pieces.join("")}<button type="button" data-page="${Math.min(totalPages, state.page + 1)}">›</button>`;
    host.querySelectorAll("[data-page]").forEach(button => {
      button.addEventListener("click", () => {
        state.page = Number(button.dataset.page);
        renderGrid();
        window.scrollTo({ top: el("vlVehicleGrid").offsetTop - 120, behavior: "smooth" });
      });
    });
  }

  function renderAll() {
    renderStats();
    renderCategories();
    renderGrid();
  }

  function downloadJson(data, fileName) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    document.querySelectorAll("[data-pick]").forEach(button => {
      button.addEventListener("click", () => el(button.dataset.pick).click());
    });
    el("vlPopgroupsPicker").addEventListener("change", event => handleImport(event.target, importPopgroupsFiles));
    el("vlVehiclesPicker").addEventListener("change", event => handleImport(event.target, importVehicleFiles));
    el("vlHandlingPicker").addEventListener("change", event => handleImport(event.target, importHandlingFiles));
	el("vlRefreshSourceHistory").addEventListener("click",() => refreshSourceHistory(true));
	
    const installDropZone = el("vlInstallDropZone");
    const installPicker = el("vlInstallFilesPicker");
    el("vlInstallBrowse").addEventListener("click", event => {
      event.stopPropagation();
      installPicker.click();
    });
    installDropZone.addEventListener("click", event => {
      if (event.target.closest("button")) return;
      installPicker.click();
    });
    installDropZone.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        installPicker.click();
      }
    });
    ["dragenter", "dragover"].forEach(name => installDropZone.addEventListener(name, event => {
      event.preventDefault();
      installDropZone.classList.add("drag-over");
    }));
    ["dragleave", "drop"].forEach(name => installDropZone.addEventListener(name, event => {
      event.preventDefault();
      installDropZone.classList.remove("drag-over");
    }));
    installDropZone.addEventListener("drop", event => toggleInstalledFromAssetFiles(event.dataTransfer.files));
    installPicker.addEventListener("change", event => {
      const files = event.target.files;
      event.target.value = "";
      toggleInstalledFromAssetFiles(files);
    });

    el("vlSearch").addEventListener("input", event => {
      state.filters.search = event.target.value;
      state.page = 1;
      renderGrid();
    });
    el("vlTypeFilter").addEventListener("change", event => {
      state.filters.type = event.target.value;
      state.page = 1;
      renderGrid();
    });
    el("vlAiFilter").addEventListener("change", event => {
      state.filters.ai = event.target.value;
      state.page = 1;
      renderGrid();
    });
    el("vlInstalledFilter").addEventListener("change", event => {
      state.filters.installed = event.target.value;
      state.page = 1;
      renderGrid();
    });
    el("vlInstallFilter").addEventListener("change", event => {
      state.filters.install = event.target.value;
      state.page = 1;
      renderGrid();
    });
    el("vlFavoritesOnly").addEventListener("change", event => {
      state.filters.favoritesOnly = event.target.checked;
      state.page = 1;
      renderGrid();
    });
    el("vlSort").addEventListener("change", event => {
      state.filters.sort = event.target.value;
      state.page = 1;
      renderGrid();
    });
    const pageSizeSelect = el("vlPageSize");
if (pageSizeSelect) {
  pageSizeSelect.value = String(state.pageSize);
  pageSizeSelect.addEventListener("change", event => {
    const nextPageSize = Number(event.target.value);
    state.pageSize = PAGE_SIZE_OPTIONS.has(nextPageSize)
      ? nextPageSize
      : DEFAULT_PAGE_SIZE;
    savePageSize(state.pageSize);
    state.page = 1;
    renderGrid();
  });
}
    el("vlGridView").addEventListener("click", () => {
      state.view = "grid";
      el("vlGridView").classList.add("active");
      el("vlListView").classList.remove("active");
      renderGrid();
    });
    el("vlListView").addEventListener("click", () => {
      state.view = "list";
      el("vlListView").classList.add("active");
      el("vlGridView").classList.remove("active");
      renderGrid();
    });

    el("vlRandomVehicle").addEventListener("click", () => {
      const vehicles = getFilteredVehicles();
      if (!vehicles.length) {
        setStatus("There are no vehicles available for the current filters.", "warn");
        return;
      }
      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      location.href = `vehicle-details.html?model=${encodeURIComponent(vehicle.modelName)}`;
    });

    el("vlExportDatabase").addEventListener("click", async () => {
      const payload = await store.exportDatabase();
      downloadJson(payload, "gta-traffic-vehicle-library.json");
      setStatus("Vehicle Library backup exported.", "good");
    });

    el("vlImportDatabase").addEventListener("click", () => el("vlDatabasePicker").click());
    el("vlDatabasePicker").addEventListener("change", async event => {
      const file = event.target.files[0];
      event.target.value = "";
      if (!file) return;
      try {
        const payload = JSON.parse(await file.text());
        await store.importDatabase(payload);
        await reloadData();
        setStatus(`Imported Vehicle Library backup ${file.name}.`, "good");
      } catch (error) {
        console.error(error);
        setStatus(error.message || "The library backup could not be imported.", "bad");
      }
    });

    el("vlClearDatabase").addEventListener("click", async () => {
      if (!confirm("Clear every vehicle, handling profile, image, path, and note from this browser library?")) return;
      await store.clearAll();
      await reloadData();
      setStatus("The Vehicle Library database has been cleared.", "warn");
    });

    el("vlCompareClear")?.addEventListener("click", () => {
      state.compare = [];
      renderGrid();
      closeCompareModal();
    });
    el("vlCompareOpen")?.addEventListener("click", openCompareModal);
    el("vlCompareModalClose")?.addEventListener("click", closeCompareModal);
    el("vlCompareModalOverlay")?.addEventListener("click", event => {
      if (event.target === el("vlCompareModalOverlay")) closeCompareModal();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !el("vlCompareModalOverlay")?.classList.contains("vl-hidden")) {
        closeCompareModal();
      }
    });
  }

  async function initialize() {
    try {
      bindEvents();
      await store.openDatabase();
      if (navigator.storage?.persist) navigator.storage.persist().catch(() => false);
      await reloadData();
      setStatus(state.vehicles.length
        ? `Loaded ${state.vehicles.length.toLocaleString()} saved vehicle records from this browser.`
        : "Local database is ready. Import vehicles.meta to begin building the library.", "good");
    } catch (error) {
      console.error(error);
      setStatus("The browser database could not be opened. Use a normal browser window rather than private browsing.", "bad");
    }
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();

/* VEHICLE_APPEARANCE_IMPORT_UI_V2 */
(function () {
  const state = {
    carvariations: null,
    carcols: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function escapePreviewHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setVehicleAppearanceImportStatus(message, type) {
    if (typeof setStatus === "function") {
      setStatus(message, type || "good");
      return;
    }

    const statusHost =
      byId("vlStatus") ||
      byId("vehicleLibraryStatus") ||
      document.querySelector(".vl-status");

    if (statusHost) {
      statusHost.textContent = message;
    }
  }

  function parseMetaXml(text, label) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(text || ""), "application/xml");
    const parserError = doc.querySelector("parsererror");

    if (parserError) {
      throw new Error(label + " could not be parsed as XML/meta.");
    }

    return doc;
  }

  function childText(node, tagName) {
    if (!node) {
      return "";
    }

    const child = Array.from(node.children || []).find(item =>
      item.tagName === tagName
    );

    return child ? String(child.textContent || "").trim() : "";
  }

  function attrValue(node, attrName = "value") {
    if (!node) {
      return "";
    }

    return String(node.getAttribute(attrName) || "").trim();
  }

  function uniqueValues(values) {
    return Array.from(
      new Set(
        values
          .map(value => String(value || "").trim())
          .filter(Boolean)
      )
    );
  }

  function parseCarvariationsMeta(text, fileName) {
    const doc = parseMetaXml(text, "carvariations.meta");

    const variationNodes = Array.from(
      doc.querySelectorAll("variationData > Item")
    ).filter(node => childText(node, "modelName"));

    const vehicles = variationNodes.map(node => {
      const modelName = childText(node, "modelName");

      const colorValues = uniqueValues(
        Array.from(node.querySelectorAll("colors > Item > indices"))
          .flatMap(indices =>
            String(indices.textContent || "")
              .split(/\s+/)
              .map(value => value.trim())
          )
      );

      const kitValues = uniqueValues(
        Array.from(node.querySelectorAll("kits > Item"))
          .map(item => String(item.textContent || "").trim())
      );

      const liveryNodes = Array.from(
        node.querySelectorAll("colors > Item > liveries > Item")
      );

      const enabledLiveries = liveryNodes
        .map((item, index) => ({
          index,
          value:
            item.getAttribute("value") ||
            String(item.textContent || "").trim()
        }))
        .filter(item =>
          String(item.value || "").toLowerCase() === "true" ||
          String(item.value || "") === "1"
        );

      const plateProbabilities = Array.from(
        node.querySelectorAll("plateProbabilities Probabilities > Item")
      ).map(item => {
        const name =
          childText(item, "Name") ||
          childText(item, "name") ||
          childText(item, "plateType");

        const valueNode =
          Array.from(item.children || []).find(child =>
            child.tagName === "Value" ||
            child.tagName === "value"
          );

        const value =
          attrValue(valueNode, "value") ||
          childText(item, "Value") ||
          childText(item, "value") ||
          String(valueNode?.textContent || "").trim();

        return {
          name,
          value
        };
      }).filter(item => item.name || item.value);

      return {
        modelName,
        colors: colorValues,
        kits: kitValues,
        liveryCount: liveryNodes.length,
        enabledLiveries,
        plateProbabilities,
        lightSettings: childText(node, "lightSettings"),
        sirenSettings: childText(node, "sirenSettings")
      };
    }).filter(vehicle => vehicle.modelName);

    return {
      type: "carvariations.meta",
      fileName,
      vehicleCount: vehicles.length,
      vehicles
    };
  }

  function parseCarcolsMeta(text, fileName) {
    const doc = parseMetaXml(text, "carcols.meta");

    const kitNodes = Array.from(
      doc.querySelectorAll("Kits > Item")
    ).filter(node => childText(node, "kitName") || node.querySelector("id"));

    const lightNodes = Array.from(
      doc.querySelectorAll("Lights > Item")
    ).filter(node => node.querySelector("id") || childText(node, "name"));

    const kits = kitNodes.map(node => {
      const idNode = Array.from(node.children || []).find(item =>
        item.tagName === "id"
      );

      const statModItems = Array.from(node.querySelectorAll("statMods > Item"));
      const statModTypes = uniqueValues(
        statModItems.map(item => childText(item, "type"))
      );

      const visibleModCount = node.querySelectorAll("visibleMods > Item").length;
      const linkedModCount =
        node.querySelectorAll("linkMods > Item").length +
        node.querySelectorAll("linkedModels > Item").length;

      return {
        kitName: childText(node, "kitName"),
        id: attrValue(idNode) || childText(node, "id"),
        kitType: childText(node, "kitType"),
        statModCount: statModItems.length,
        statModTypes,
        visibleModCount,
        linkedModCount
      };
    }).filter(kit => kit.kitName || kit.id);

    function lightColor(node, sectionName) {
      const section = Array.from(node.children || []).find(item =>
        item.tagName === sectionName
      );

      if (!section) {
        return "";
      }

      const colorNode = Array.from(section.children || []).find(item =>
        item.tagName === "color"
      );

      return attrValue(colorNode, "value") || childText(section, "color");
    }

    function headlightTexture(node) {
      const headLight = Array.from(node.children || []).find(item =>
        item.tagName === "headLight"
      );

      return headLight ? childText(headLight, "textureName") : "";
    }

    const lights = lightNodes.map(node => {
      const idNode = Array.from(node.children || []).find(item =>
        item.tagName === "id"
      );

      return {
        id: attrValue(idNode) || childText(node, "id"),
        name: childText(node, "name"),
        headLightTexture: headlightTexture(node),
        headLightColor: lightColor(node, "headLight"),
        tailLightColor: lightColor(node, "tailLight"),
        indicatorColor: lightColor(node, "indicator")
      };
    }).filter(light => light.id || light.name);

    return {
      type: "carcols.meta",
      fileName,
      kitCount: kits.length,
      lightCount: lights.length,
      kits,
      lights
    };
  }

  function renderPreviewList(title, values) {
    const clean = values.filter(Boolean).slice(0, 12);

    if (!clean.length) {
      return "";
    }

    return (
      '<div class="vl-appearance-preview-row">' +
      '<strong>' + escapePreviewHTML(title) + '</strong>' +
      '<span>' + escapePreviewHTML(clean.join(", ")) + '</span>' +
      '</div>'
    );
  }

  function renderCarvariationsPreview(data) {
    const sampleVehicles = data.vehicles.slice(0, 12).map(vehicle => vehicle.modelName);
    const sampleKits = uniqueValues(
      data.vehicles.flatMap(vehicle => vehicle.kits || [])
    ).slice(0, 12);
    const sampleLights = uniqueValues(
      data.vehicles.map(vehicle => vehicle.lightSettings)
    ).slice(0, 12);
    const sampleSirens = uniqueValues(
      data.vehicles.map(vehicle => vehicle.sirenSettings)
    ).slice(0, 12);

    return [
      '<article class="vl-appearance-preview-card">',
      '<h3>carvariations.meta</h3>',
      '<p>' + escapePreviewHTML(data.fileName) + '</p>',
      renderPreviewList("Vehicles", sampleVehicles),
      renderPreviewList("Kits", sampleKits),
      renderPreviewList("Light Settings", sampleLights),
      renderPreviewList("Siren Settings", sampleSirens),
      '<div class="vl-appearance-preview-row"><strong>Total Vehicles</strong><span>' +
        escapePreviewHTML(data.vehicleCount) +
      '</span></div>',
      '</article>'
    ].join("");
  }

  function renderCarcolsPreview(data) {
    const sampleKits = data.kits.slice(0, 12).map(kit =>
      kit.kitName || kit.id
    );

    const sampleLights = data.lights.slice(0, 12).map(light =>
      [light.id, light.name].filter(Boolean).join(": ")
    );

    return [
      '<article class="vl-appearance-preview-card">',
      '<h3>carcols.meta</h3>',
      '<p>' + escapePreviewHTML(data.fileName) + '</p>',
      renderPreviewList("Mod Kits", sampleKits),
      renderPreviewList("Light Profiles", sampleLights),
      '<div class="vl-appearance-preview-row"><strong>Total Kits</strong><span>' +
        escapePreviewHTML(data.kitCount) +
      '</span></div>',
      '<div class="vl-appearance-preview-row"><strong>Total Light Settings</strong><span>' +
        escapePreviewHTML(data.lightCount) +
      '</span></div>',
      '</article>'
    ].join("");
  }

  function renderAppearancePreview() {
    const host = byId("vlAppearanceMetaPreview");

    if (!host) {
      return;
    }

    const parts = [];

    if (state.carvariations) {
      parts.push(renderCarvariationsPreview(state.carvariations));
    }

    if (state.carcols) {
      parts.push(renderCarcolsPreview(state.carcols));
    }

    if (!parts.length) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }

    host.hidden = false;
    host.innerHTML = [
      '<div class="vl-appearance-preview">',
      '<strong>Appearance Metadata Preview</strong>',
      parts.join(""),
      '<small>Preview only. Cloud save and Vehicle Details rendering come next.</small>',
      '</div>'
    ].join("");
  }

  function readSelectedMetaFile(file, label) {
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = function () {
      try {
        const text = String(reader.result || "");

        if (label === "carvariations.meta") {
          state.carvariations = parseCarvariationsMeta(text, file.name);
          window.vehicleAppearanceMetaPreview = {
            ...(window.vehicleAppearanceMetaPreview || {}),
            carvariations: state.carvariations
          };

          setVehicleAppearanceImportStatus(
            "Parsed carvariations.meta: " +
              state.carvariations.vehicleCount +
              " vehicle variation record(s).",
            "good"
          );
        }

        if (label === "carcols.meta") {
          state.carcols = parseCarcolsMeta(text, file.name);
          window.vehicleAppearanceMetaPreview = {
            ...(window.vehicleAppearanceMetaPreview || {}),
            carcols: state.carcols
          };

          setVehicleAppearanceImportStatus(
            "Parsed carcols.meta: " +
              state.carcols.kitCount +
              " mod kit(s), " +
              state.carcols.lightCount +
              " light setting(s).",
            "good"
          );
        }

        renderAppearancePreview();

        console.log("Vehicle appearance metadata preview", {
          carvariations: state.carvariations,
          carcols: state.carcols
        });
      } catch (error) {
        console.warn(label + " parse failed.", error);

        setVehicleAppearanceImportStatus(
          error.message || label + " could not be parsed.",
          "warn"
        );
      }
    };

    reader.onerror = function () {
      setVehicleAppearanceImportStatus(
        label + " could not be read.",
        "warn"
      );
    };

    reader.readAsText(file);
  }

  function bindAppearanceImportButton(inputId, label) {
    const input = byId(inputId);

    if (!input) {
      return;
    }

    input.addEventListener("change", function () {
      const file = input.files && input.files[0];
      readSelectedMetaFile(file, label);
      input.value = "";
    });
  }

  function bindVehicleAppearanceImportUi() {
    bindAppearanceImportButton(
      "vlCarvariationsMetaInput",
      "carvariations.meta"
    );

    bindAppearanceImportButton(
      "vlCarcolsMetaInput",
      "carcols.meta"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindVehicleAppearanceImportUi);
  } else {
    bindVehicleAppearanceImportUi();
  }
})();

/* VEHICLE_APPEARANCE_DIRECT_BUTTON_BIND_V1 */
(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function bindDirectAppearancePicker(buttonSelector, inputId) {
    const button = document.querySelector(buttonSelector);
    const input = byId(inputId);

    if (!button || !input) {
      return;
    }

    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      input.click();
    }, true);
  }

  function bindDirectAppearancePickers() {
    bindDirectAppearancePicker(
      '[data-pick="vlCarvariationsMetaInput"]',
      "vlCarvariationsMetaInput"
    );

    bindDirectAppearancePicker(
      '[data-pick="vlCarcolsMetaInput"]',
      "vlCarcolsMetaInput"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindDirectAppearancePickers);
  } else {
    bindDirectAppearancePickers();
  }
})();



/* VEHICLE_APPEARANCE_CLOUD_SAVE_V1 */
(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function setAppearanceCloudStatus(message, type) {
    if (typeof setStatus === "function") {
      setStatus(message, type || "good");
      return;
    }

    const statusHost = byId("vlStatus");

    if (statusHost) {
      statusHost.textContent = message;
    }
  }

  function getImportFieldValue(id) {
    const input = byId(id);

    return input ? String(input.value || "").trim() : "";
  }

  async function saveAppearanceMetadataToCloud() {
    const metadata = window.vehicleAppearanceMetaPreview || {};
    const hasCarvariations =
      metadata.carvariations &&
      Array.isArray(metadata.carvariations.vehicles) &&
      metadata.carvariations.vehicles.length;

    const hasCarcols =
      metadata.carcols &&
      (
        Array.isArray(metadata.carcols.kits) &&
        metadata.carcols.kits.length ||
        Array.isArray(metadata.carcols.lights) &&
        metadata.carcols.lights.length
      );

    if (!hasCarvariations && !hasCarcols) {
      setAppearanceCloudStatus(
        "Upload carvariations.meta or carcols.meta before saving appearance metadata.",
        "warn"
      );
      return;
    }

    if (!window.vehicleCloud?.importVehicleAppearanceMetadata) {
      setAppearanceCloudStatus(
        "Vehicle appearance cloud import is not available in this build.",
        "warn"
      );
      return;
    }

    const sourceLabel =
      getImportFieldValue("vlSourceLabelInput") ||
      getImportFieldValue("vlSourceLabel") ||
      "Appearance Metadata";

    const dlcFolder =
      getImportFieldValue("vlDlcFolderInput") ||
      getImportFieldValue("vlSourceDlcInput") ||
      getImportFieldValue("vlDlcFolder") ||
      "";

    setAppearanceCloudStatus(
      "Saving appearance metadata to cloud...",
      "good"
    );

    try {
      const result =
        await window.vehicleCloud.importVehicleAppearanceMetadata(
          metadata,
          {
            workspaceId: "default",
            sourceLabel,
            dlcFolder
          }
        );

      setAppearanceCloudStatus(
        "Appearance metadata saved to cloud: " +
          Number(result.variationsImported || 0) +
          " variation record(s), " +
          Number(result.modKitsImported || 0) +
          " mod kit(s), " +
          Number(result.lightSettingsImported || 0) +
          " light setting(s).",
        "good"
      );
    } catch (error) {
      console.warn("Appearance metadata cloud save failed.", error);

      setAppearanceCloudStatus(
        error.message ||
          "Appearance metadata cloud save failed.",
        "warn"
      );
    }
  }

  function bindAppearanceCloudSave() {
    const button = byId("vlSaveAppearanceMetaCloud");

    if (!button) {
      return;
    }

    button.addEventListener("click", function () {
      saveAppearanceMetadataToCloud();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAppearanceCloudSave);
  } else {
    bindAppearanceCloudSave();
  }
})();
