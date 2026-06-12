// =====================================================
// PACK DB BUILDER
// Builds a Pack Tracker JSON from a pasted DLC file list.
// Keeps only base .yft files as vehicle spawn names.
// Ignores .ytd, +hi.ytd, and _hi.yft support files.
// =====================================================

let builtPackJson = null;

function getBuilderEls() {
  return {
    packName: document.getElementById("builderPackNameInput"),
    creator: document.getElementById("builderCreatorInput"),
    dlc: document.getElementById("builderDlcInput"),
    version: document.getElementById("builderVersionInput"),
    website: document.getElementById("builderWebsiteInput"),
    notes: document.getElementById("builderNotesInput"),
    fileList: document.getElementById("builderFileListInput"),
    status: document.getElementById("packBuilderStatus"),
    vehicleList: document.getElementById("packBuilderVehicleList")
  };
}

function buildPackJsonFromFileList() {
  const b = getBuilderEls();

  const packName = b.packName.value.trim();
  const creator = b.creator.value.trim();
  const dlcFolder = b.dlc.value.trim();
  const version = b.version.value.trim();
  const website = b.website.value.trim();
  const notes = b.notes.value.trim();

  if (!packName) {
    alert("Pack name is required.");
    return;
  }

  const rawList = b.fileList.value.trim();

  if (!rawList) {
    alert("Paste a file list first.");
    return;
  }

  const packId = makePackId(packName, dlcFolder);
  const vehicles = parseVehicleFileList(rawList);

  if (!vehicles.length) {
    b.status.innerHTML = `<span class="warning">No base .yft vehicle files found.</span>`;
    b.vehicleList.textContent = "No vehicles detected.";
    builtPackJson = null;
    return;
  }

  builtPackJson = {
    packs: {
      [packId]: {
        id: packId,
        name: packName,
        creator,
        dlcFolder,
        version,
        website,
        notes: notes || "Built from pasted DLC file list.",
        updatedAt: new Date().toISOString()
      }
    },
    vehiclePackMap: {}
  };

  vehicles.forEach(vehicle => {
    builtPackJson.vehiclePackMap[vehicle] = packId;
  });

  b.status.innerHTML = `<span class="saved">
    Built pack JSON for ${escapeHTML(packName)} with ${vehicles.length} vehicles.
  </span>`;

  b.vehicleList.innerHTML = vehicles
    .map(vehicle => `<div>${escapeHTML(vehicle)}</div>`)
    .join("");
}

function parseVehicleFileList(rawList) {
  const vehicleSet = new Set();

  rawList
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .forEach(fileName => {
      const clean = fileName
        .replace(/^.*[\\/]/, "")
        .trim();

      const lower = clean.toLowerCase();

      if (!lower.endsWith(".yft")) return;
      if (lower.endsWith("_hi.yft")) return;

      const stem = clean.slice(0, -4).toLowerCase();

      if (!stem) return;
      if (stem.includes("+hi")) return;
      if (stem.startsWith("vehicles_")) return;

      vehicleSet.add(stem);
    });

  return Array.from(vehicleSet).sort();
}

function downloadBuiltPackJson() {
  if (!builtPackJson) {
    alert("Build a pack JSON first.");
    return;
  }

  const pack = Object.values(builtPackJson.packs)[0];
  const fileName = `${pack.id || "vehicle_pack"}_pack_database.json`;

  const blob = new Blob([JSON.stringify(builtPackJson, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();

  URL.revokeObjectURL(url);
}

function importBuiltPackJson() {
  if (!builtPackJson) {
    alert("Build a pack JSON first.");
    return;
  }

  mergePackDatabase(builtPackJson);

  savePackDatabase();
  updateActivePackBox();
  renderPackList();
  renderSection(currentSection);
  renderVehicleLibrary();

  const pack = Object.values(builtPackJson.packs)[0];

  const b = getBuilderEls();
  b.status.innerHTML = `<span class="saved">
    Imported ${escapeHTML(pack.name)} into the Pack Tracker.
  </span>`;
}

function mergePackDatabase(importData) {
  Object.entries(importData.packs || {}).forEach(([id, pack]) => {
    packDatabase.packs[id] = pack;
  });

  Object.entries(importData.vehiclePackMap || {}).forEach(([model, packId]) => {
    packDatabase.vehiclePackMap[model.toLowerCase()] = packId;
  });
}

function clearPackBuilder() {
  const b = getBuilderEls();

  b.packName.value = "";
  b.creator.value = "";
  b.dlc.value = "";
  b.version.value = "";
  b.website.value = "";
  b.notes.value = "";
  b.fileList.value = "";
  b.status.innerHTML = "";
  b.vehicleList.textContent = "No pack built yet.";

  builtPackJson = null;
}
