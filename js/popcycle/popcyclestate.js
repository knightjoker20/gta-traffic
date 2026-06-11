// =====================================================
// [MODULE: POPCYCLE_STATE]
// Central definitions and state for the Popcycle Editor.
// =====================================================

const POPCYCLE_TIME_SLOTS = [
  { hour24: 0,  time: "12:00 AM", label: "Midnight", period: "night" },
  { hour24: 2,  time: "2:00 AM",  label: "Overnight", period: "night" },
  { hour24: 4,  time: "4:00 AM",  label: "Pre-Dawn", period: "predawn" },
  { hour24: 6,  time: "6:00 AM",  label: "Early Morning", period: "morning" },
  { hour24: 8,  time: "8:00 AM",  label: "Morning Rush", period: "rush" },
  { hour24: 10, time: "10:00 AM", label: "Late Morning", period: "day" },
  { hour24: 12, time: "12:00 PM", label: "Midday / Lunch", period: "midday" },
  { hour24: 14, time: "2:00 PM",  label: "Afternoon", period: "day" },
  { hour24: 16, time: "4:00 PM",  label: "Late Afternoon", period: "afternoon" },
  { hour24: 18, time: "6:00 PM",  label: "Evening Rush", period: "rush-evening" },
  { hour24: 20, time: "8:00 PM",  label: "Evening", period: "evening" },
  { hour24: 22, time: "10:00 PM", label: "Late Night", period: "night" }
];

const POPCYCLE_FIELDS = [
  {
    key: "peds",
    shortLabel: "Peds",
    label: "Ambient Peds",
    help: "Maximum ambient pedestrian population."
  },
  {
    key: "scenario",
    shortLabel: "Scenario",
    label: "Scenario Peds",
    help: "Maximum active scenario pedestrians."
  },
  {
    key: "cars",
    shortLabel: "Cars",
    label: "Ambient Cars",
    help: "Maximum ambient vehicle population."
  },
  {
    key: "parkedCars",
    shortLabel: "Parked",
    label: "Parked Cars",
    help: "Maximum parked vehicles."
  },
  {
    key: "lowPriorityParked",
    shortLabel: "Low Parked",
    label: "Low-Priority Parked",
    help: "Maximum low-priority parked vehicles."
  },
  {
    key: "percentCopCars",
    shortLabel: "Cop Cars %",
    label: "Police Car Percentage",
    help: "Percentage of ambient cars that may be police vehicles."
  },
  {
    key: "percentCopPeds",
    shortLabel: "Cop Peds %",
    label: "Police Ped Percentage",
    help: "Percentage of ambient pedestrians that may be police."
  },
  {
    key: "maxScenarioPedModels",
    shortLabel: "Ped Models",
    label: "Max Scenario Ped Models",
    help: "Maximum pedestrian models streamed for scenarios."
  },
  {
    key: "maxScenarioVehicleModels",
    shortLabel: "Vehicle Models",
    label: "Max Scenario Vehicle Models",
    help: "Maximum vehicle models streamed for scenarios."
  },
  {
    key: "maxPreAssignedParked",
    shortLabel: "Assigned Parked",
    label: "Max Preassigned Parked",
    help: "Maximum preassigned parked vehicles."
  }
];

const POPCYCLE_PRESETS = [
  {
    id: "stock",
    label: "Stock Traffic",
    description: "Exact vanilla values.",
    blend: 0
  },
  {
    id: "night-shift",
    label: "Night Shift",
    description: "Stock daytime levels with reduced late-night and overnight traffic.",
    mode: "nightProfile"
  },
  {
    id: "street-plus",
    label: "Street+",
    description: "Small controlled increase.",
    blend: 0.15
  },
  {
    id: "city-pulse",
    label: "City Pulse",
    description: "Balanced populated-world setting.",
    blend: 0.35
  },
  {
    id: "rush-hour",
    label: "Rush Hour",
    description: "High but controlled density.",
    blend: 0.60
  },
  {
    id: "redline",
    label: "Traffic Redline",
    description: "Aggressive modded reference.",
    blend: 1
  }
];

const POPCYCLE_DRAFT_KEY =
  "gtaTrafficPopcycleDraft_v1_2";

const popcycleState = {
  stock: null,
  redline: null,
  current: null,
  originalText: "",
  originalFileName: "popcycle.dat",
  selectedScheduleName: "",
  selectedRowIndex: 0,
  selectedRowIndexes: [0],
  batchVehicleGroupName: "VEH_COPCAR",
  batchVehicleGroupWeight: 5,
  batchPreserveTotal: true,
  areaOverrides: {},
  mapLayer: "auto",
  mapViews: {},
  installedPopgroupsReference: {
    vehicles: [],
    peds: [],
    loadedFileName: ""
  },
  filter: "all",
  search: "",
  history: [],
  future: [],
  maxHistory: 40,
  validation: {
    errors: [],
    warnings: []
  }
};

// [END MODULE: POPCYCLE_STATE]
