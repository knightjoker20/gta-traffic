// =====================================================
// STATE
// Central variables used by the whole app.
// =====================================================

const STORAGE_KEY = "gtaTrafficStudioPackDB_v1";
const ASSET_STORAGE_KEY = "gtaTrafficStudioVehicleAssetDB_v1";

let originalXMLDoc = null;
let originalText = "";
let loadedFileName = "popgroups";

let parsedData = {
  vehicles: [],
  peds: []
};

let vehicleMeta = {};
let loadedMetaFiles = [];
let overwrittenMetaEntries = 0;

let packDatabase = {
  packs: {},
  vehiclePackMap: {}
};

// Vehicle file-size records created by lodTracker.js.
let vehicleAssets = {};
let sharedAssetFiles = [];

let activePackId = null;

let currentSection = "vehicles";
let hasUnsavedChanges = false;
let imageMode = true;
let draggedItem = null;
let imageRefreshVersion = Date.now();

let openGroups = {
  vehicles: new Set(),
  peds: new Set()
};

// Group names (not indices -- names stay stable across re-imports/edits,
// indices don't) that the user has hidden from the editor list, e.g. _MP
// popgroups that don't need editing for the singleplayer game.
let hiddenGroups = {
  vehicles: new Set(),
  peds: new Set()
};

// When true for a section, hidden groups are still rendered (dimmed, with
// an "Unhide" button) instead of being skipped entirely -- lets the user
// manage/undo hides without digging through devtools.
let showHiddenGroups = {
  vehicles: false,
  peds: false
};

let openLibraryClasses = new Set();
let openPackItems = new Set();

// DOM references are assigned in app.js.
let els = {};
