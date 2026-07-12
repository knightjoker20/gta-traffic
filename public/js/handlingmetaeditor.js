// =====================================================
// GTA Traffic Handling.meta Editor V1.1
// Standalone handling profile editor with local autosave.
// =====================================================

// ── GTA V stock vehicle class lookup (handlingName → class) ──
const VEH_CLASS_MAP = {
  // Compacts
  BLISTA:"Compacts", BRIOSO:"Compacts", ISSI2:"Compacts", PANTO:"Compacts", PRAIRIE:"Compacts", RHEA:"Compacts", WEEVIL:"Compacts",
  // Sedans
  ASEA:"Sedans", ASEA2:"Sedans", ASTEROPE:"Sedans", FUGITIVE:"Sedans",
  GLENDALE:"Sedans", GLENDALE2:"Sedans", INGOT:"Sedans", INTRUDER:"Sedans",
  PREMIER:"Sedans", PRIMO:"Sedans", PRIMO2:"Sedans", ROMANCE:"Sedans",
  SCHAFTER2:"Sedans", STAFFORD:"Sedans", STANIER:"Sedans", STRATUM:"Sedans", STRETCH:"Sedans",
  SUPERD:"Sedans", SURGE:"Sedans", TAILGATER:"Sedans", TAILGATER2:"Sedans", WASHINGTON:"Sedans",
  // SUVs
  BALLER:"SUVs", BALLER2:"SUVs", BALLER3:"SUVs", BALLER4:"SUVs", BALLER5:"SUVs", BALLER6:"SUVs",
  CAVALCADE:"SUVs", CAVALCADE2:"SUVs", FQ2:"SUVs", GRANGER:"SUVs", GRANGER2:"SUVs",
  HABANERO:"SUVs", HUNTLEY:"SUVs", LANDSTALKER:"SUVs", LANDSTALKER2:"SUVs",
  MESA:"SUVs", MESA2:"SUVs", MESA3:"SUVs", NOVAK:"SUVs",
  PATRIOT:"SUVs", PATRIOT2:"SUVs", PATRIOT3:"SUVs",
  RADI:"SUVs", REBLA:"SUVs", SEMINOLE:"SUVs", SEMINOLE2:"SUVs", TOROS:"SUVs", GRESLEY:"SUVs",
  // Coupes
  BUFFALO:"Coupes", BUFFALO2:"Coupes", BUFFALO3:"Coupes", BUFFALO4:"Coupes",
  EXEMPLAR:"Coupes", FELON:"Coupes", FELON2:"Coupes", JACKAL:"Coupes",
  ORACLE:"Coupes", ORACLE2:"Coupes", ZION:"Coupes", ZION2:"Coupes", ZION3:"Coupes",
  // Sports
  ALPHA:"Sports", BANSHEE:"Sports", BANSHEE2:"Sports",
  CARBONIZZARE:"Sports", COMET2:"Sports", COMET3:"Sports", COMET4:"Sports", COMET5:"Sports", COMET6:"Sports",
  COQUETTE:"Sports", COQUETTE3:"Sports", ELEGY:"Sports", ELEGY2:"Sports",
  ENTITY2:"Sports", FELTZER2:"Sports", FUROREGT:"Sports", GT500:"Sports",
  HOTRING:"Sports", IMORGON:"Sports", ISSI3:"Sports", ISSI4:"Sports", ISSI5:"Sports", ISSI6:"Sports", ISSI7:"Sports",
  ITALIGTB2:"Sports", JESTER:"Sports", JESTER2:"Sports", JESTER3:"Sports", JESTER4:"Sports",
  KURUMA:"Sports", KURUMA2:"Sports", LYNX:"Sports",
  MASSACRO:"Sports", MASSACRO2:"Sports", NEON:"Sports", NINEF:"Sports", NINEF2:"Sports",
  OMNIS:"Sports", OMNIS2:"Sports", PANTHERE:"Sports", PARIAH:"Sports",
  PENUMBRA:"Sports", PENUMBRA2:"Sports", RAPIDGT:"Sports", RAPIDGT2:"Sports", RAPIDGT3:"Sports",
  REVOLTER:"Sports", SCHAFTER3:"Sports", SCHAFTER4:"Sports", SCHAFTER5:"Sports", SCHAFTER6:"Sports",
  SCHWARZER:"Sports", SENTINEL:"Sports", SENTINEL2:"Sports", SENTINEL3:"Sports",
  SPECTER:"Sports", SPECTER2:"Sports", SULTAN:"Sports", SULTAN2:"Sports", SULTAN3:"Sports",
  SURANO:"Sports", TAMPA:"Sports", TAMPA2:"Sports", TAMPA3:"Sports",
  TROPOS:"Sports", VECTRE:"Sports", VERLIERER:"Sports", VERLIERER2:"Sports", VSTR:"Sports",
  // Super
  ADDER:"Super", AUTARCH:"Super", BULLET:"Super", CHEETAH:"Super", CHEETAH2:"Super",
  CYCLONE:"Super", CYCLONE2:"Super", DEVESTE:"Super", EMERUS:"Super",
  ENTITY:"Super", ENTITY3:"Super", ETR1:"Super", FMJ:"Super", GP1:"Super",
  INFERNUS:"Super", INFERNUS2:"Super", ITALIGTB:"Super", KRIEGER:"Super",
  NERO:"Super", NERO2:"Super", OSIRIS:"Super", P996:"Super", P996B:"Super",
  PENETRATOR:"Super", RE7B:"Super", S80:"Super", SC1:"Super", SHEAVA:"Super",
  T20:"Super", TAIPAN:"Super", TEMPESTA:"Super", THRAX:"Super", TIGON:"Super",
  TURISMO2:"Super", TYRANT:"Super", TYRUS:"Super", VAGNER:"Super",
  VISIONE:"Super", VOLTIC:"Super", VOLTIC2:"Super", XA21:"Super", ZENTORNO:"Super", ZORRUSSO:"Super",
  // Sports Classics
  CASCO:"Sports Classics", DELUXO:"Sports Classics", FAGLIO01:"Sports Classics",
  FELTZER:"Sports Classics", JB700:"Sports Classics", JB7002:"Sports Classics",
  MAMBA:"Sports Classics", MANANA:"Sports Classics", MANANA2:"Sports Classics",
  MONROE:"Sports Classics", PEYOTE:"Sports Classics", PEYOTE2:"Sports Classics", PEYOTE3:"Sports Classics",
  PIGALLE:"Sports Classics", STINGER:"Sports Classics", STINGERGT:"Sports Classics",
  STIRLING:"Sports Classics", SWINGER:"Sports Classics",
  TORERO:"Sports Classics", TORERO2:"Sports Classics", TURISMO:"Sports Classics",
  VISERIS:"Sports Classics", Z190:"Sports Classics", ZTYPE:"Sports Classics",
  // Muscle
  BLADE:"Muscle", BUCCANEER:"Muscle", BUCCANEER2:"Muscle", CHINO:"Muscle", CHINO2:"Muscle",
  COQUETTE2:"Muscle", DEVIANT:"Muscle",
  DOMINATOR:"Muscle", DOMINATOR2:"Muscle", DOMINATOR3:"Muscle", DOMINATOR4:"Muscle",
  DOMINATOR5:"Muscle", DOMINATOR6:"Muscle", DOMINATOR7:"Muscle", DOMINATOR8:"Muscle",
  DUKES:"Muscle", DUKES2:"Muscle", FACTION:"Muscle", FACTION2:"Muscle", FACTION3:"Muscle",
  GAUNTLET:"Muscle", GAUNTLET2:"Muscle", GAUNTLET3:"Muscle", GAUNTLET4:"Muscle", GAUNTLET5:"Muscle",
  GREENWOOD:"Muscle", HERMES:"Muscle",
  IMPALER:"Muscle", IMPALER2:"Muscle", IMPALER3:"Muscle", IMPALER4:"Muscle",
  IMPERATOR:"Muscle", IMPERATOR2:"Muscle", IMPERATOR3:"Muscle",
  LURCHER:"Muscle", MOONBEAM:"Muscle", MOONBEAM2:"Muscle", NIGHTSHADE:"Muscle",
  ORLANDO:"Muscle", PHOENIX:"Muscle", PICADOR:"Muscle",
  RUINER:"Muscle", RUINER2:"Muscle", RUINER3:"Muscle",
  SABRE2:"Muscle", SLAMVAN:"Muscle", SLAMVAN2:"Muscle", SLAMVAN3:"Muscle",
  SLAMVAN4:"Muscle", SLAMVAN5:"Muscle", SLAMVAN6:"Muscle",
  STALLION:"Muscle", TAHOMA:"Muscle", TULIP:"Muscle", TULIP2:"Muscle",
  VAMOS:"Muscle", VIGERO:"Muscle", VIGERO2:"Muscle",
  VIRGO:"Muscle", VIRGO2:"Muscle", VIRGO3:"Muscle", VOODOO:"Muscle", VOODOO2:"Muscle",
  // Motorcycles
  AKUMA:"Motorcycles", AVARUS:"Motorcycles", BAGGER:"Motorcycles", BATI:"Motorcycles", BATI2:"Motorcycles",
  CARBONRS:"Motorcycles", CHIMERA:"Motorcycles", CLIFFHANGER:"Motorcycles",
  DAEMON:"Motorcycles", DAEMON2:"Motorcycles", DEFILER:"Motorcycles",
  DIABOLUS:"Motorcycles", DIABOLUS2:"Motorcycles", DOUBLE:"Motorcycles",
  ENDURO:"Motorcycles", ESSKEY:"Motorcycles",
  FAGGIO:"Motorcycles", FAGGIO2:"Motorcycles", FAGGIO3:"Motorcycles", FCR:"Motorcycles", FCR2:"Motorcycles",
  GARGOYLE:"Motorcycles", HAKUCHOU:"Motorcycles", HAKUCHOU2:"Motorcycles", HEXER:"Motorcycles",
  INNOVATION:"Motorcycles", LECTRO:"Motorcycles",
  MANCHEZ:"Motorcycles", MANCHEZ2:"Motorcycles", NAGASAKI:"Motorcycles", NEMESIS:"Motorcycles",
  NIGHTBLADE:"Motorcycles", OPPRESSOR:"Motorcycles", OPPRESSOR2:"Motorcycles",
  PCJ600:"Motorcycles", RATBIKE:"Motorcycles", RUFFIAN:"Motorcycles",
  SANCHEZ:"Motorcycles", SANCHEZ2:"Motorcycles", SANCTUS:"Motorcycles",
  SHOTARO:"Motorcycles", SOVEREIGN:"Motorcycles", STRYDER:"Motorcycles",
  THRUST:"Motorcycles", TYPHOON:"Motorcycles", VADER:"Motorcycles",
  VINDICATOR:"Motorcycles", VORTEX:"Motorcycles", WOLFSBANE:"Motorcycles",
  ZOMBIE:"Motorcycles", ZOMBIE2:"Motorcycles",
  // Vans
  BISON:"Vans", BISON2:"Vans", BISON3:"Vans", BOBCATXL:"Vans",
  BOXVILLE:"Vans", BOXVILLE2:"Vans", BOXVILLE3:"Vans", BOXVILLE4:"Vans", BOXVILLE5:"Vans",
  BRICKADE:"Vans", BRICKADE2:"Vans",
  BURRITO:"Vans", BURRITO2:"Vans", BURRITO3:"Vans", BURRITO4:"Vans", BURRITO5:"Vans",
  CAMPER:"Vans", GBURRITO:"Vans", GBURRITO2:"Vans", JOURNEY:"Vans",
  MINIVAN:"Vans", MINIVAN2:"Vans", PONY:"Vans", PONY2:"Vans",
  RUMPO:"Vans", RUMPO2:"Vans", RUMPO3:"Vans",
  SPEEDO:"Vans", SPEEDO2:"Vans", SPEEDO4:"Vans",
  SURFER:"Vans", SURFER2:"Vans", TACO:"Vans", YOUGA:"Vans", YOUGA2:"Vans", YOUGA3:"Vans",
  // Off-Road
  BIFTA:"Off-Road", BRAWLER:"Off-Road", CARACARA:"Off-Road", CARACARA2:"Off-Road",
  DLOADER:"Off-Road", DUBSTA2:"Off-Road",
  DUNE:"Off-Road", DUNE2:"Off-Road", DUNE3:"Off-Road", DUNE4:"Off-Road", DUNE5:"Off-Road",
  EVERON:"Off-Road", FREECRAWLER:"Off-Road",
  INJECTION:"Off-Road", INSURGENT:"Off-Road", INSURGENT2:"Off-Road", INSURGENT3:"Off-Road",
  KAMACHO:"Off-Road", KALAHARI:"Off-Road", LIBERATOR:"Off-Road",
  MARSHALL:"Off-Road", MONSTER:"Off-Road", MONSTER2:"Off-Road", MONSTER3:"Off-Road",
  MONSTER4:"Off-Road", MONSTER5:"Off-Road", OUTLAW:"Off-Road",
  RANCHERXL:"Off-Road", RANCHERXL2:"Off-Road", REBEL:"Off-Road", REBEL2:"Off-Road",
  SANDKING:"Off-Road", SANDKING2:"Off-Road", VAGRANT:"Off-Road",
  // Trucks
  BIFF:"Trucks", BIFF2:"Trucks", DOCKTUG:"Trucks", DUMP:"Trucks",
  FLATBED:"Trucks", HAULER:"Trucks", HAULER2:"Trucks",
  MIXER:"Trucks", MIXER2:"Trucks", PACKER:"Trucks",
  PHANTOM:"Trucks", PHANTOM2:"Trucks", PHANTOM3:"Trucks",
  POUNDER:"Trucks", POUNDER2:"Trucks", RUBBLE:"Trucks",
  STOCKADE:"Trucks", STOCKADE2:"Trucks", STOCKADE3:"Trucks",
  TANKER:"Trucks", TANKER2:"Trucks", TERBYTE:"Trucks",
  TOW2:"Trucks", TOWTRUCK:"Trucks", TOWTRUCK2:"Trucks",
  // Commercial
  BENSON:"Commercial", MULE:"Commercial", MULE2:"Commercial", MULE3:"Commercial", MULE4:"Commercial",
  // Emergency
  AMBULANCE:"Emergency", FBI:"Emergency", FBI2:"Emergency",
  FIRETRUK:"Emergency", LGUARD:"Emergency",
  POLICE:"Emergency", POLICE2:"Emergency", POLICE3:"Emergency", POLICE4:"Emergency",
  POLICEB:"Emergency", POLICEOLD1:"Emergency", POLICEOLD2:"Emergency", POLICET:"Emergency",
  PRANGER:"Emergency", RIOT:"Emergency", RIOT2:"Emergency",
  SHERIFF:"Emergency", SHERIFF2:"Emergency",
  // Military
  APC:"Military", BARRACKS:"Military", BARRACKS2:"Military", BARRACKS3:"Military",
  CRUSADER:"Military", HALFTRACK:"Military", KHANJALI:"Military",
  RHINO:"Military", SCARAB:"Military", SCARAB2:"Military", SCARAB3:"Military",
  // Utility
  AIRTUG:"Utility", CADDY:"Utility", CADDY2:"Utility", CADDY3:"Utility",
  FORKLIFT:"Utility", MOWER:"Utility", RIPLEY:"Utility",
  SADLER:"Utility", SADLER2:"Utility", SCRAP:"Utility",
  TRACTOR:"Utility", TRACTOR2:"Utility", TRACTOR3:"Utility",
  TRASH:"Utility", TRASH2:"Utility", TRASHMASTER:"Utility",
};

function getVehicleClass(handlingName) {
  if (!handlingName) return "";
  return VEH_CLASS_MAP[handlingName.toUpperCase()] || "";
}

const handlingMetaEditor = window.handlingMetaEditor = (() => {
  const TABLE_FIELDS = [
    "handlingName",
    "fMass",
    "fDriveBiasFront",
    "nInitialDriveGears",
    "fInitialDriveForce",
    "fInitialDriveMaxFlatVel",
    "fBrakeForce",
    "fSteeringLock",
    "fTractionCurveMax",
    "fSuspensionForce",
    "fDeformationDamageMult",
    "AIHandling"
  ];

  const QUICK_FIELDS = [
    "fMass",
    "fInitialDragCoeff",
    "fPercentSubmerged",
    "fDriveBiasFront",
    "nInitialDriveGears",
    "fInitialDriveForce",
    "fDriveInertia",
    "fClutchChangeRateScaleUpShift",
    "fClutchChangeRateScaleDownShift",
    "fInitialDriveMaxFlatVel",
    "fBrakeForce",
    "fBrakeBiasFront",
    "fHandBrakeForce",
    "fSteeringLock",
    "fTractionCurveMax",
    "fTractionCurveMin",
    "fTractionCurveLateral",
    "fTractionSpringDeltaMax",
    "fLowSpeedTractionLossMult",
    "fCamberStiffnesss",
    "fTractionBiasFront",
    "fTractionLossMult",
    "fSuspensionForce",
    "fSuspensionCompDamp",
    "fSuspensionReboundDamp",
    "fSuspensionUpperLimit",
    "fSuspensionLowerLimit",
    "fSuspensionRaise",
    "fSuspensionBiasFront",
    "fAntiRollBarForce",
    "fAntiRollBarBiasFront",
    "fRollCentreHeightFront",
    "fRollCentreHeightRear",
    "fCollisionDamageMult",
    "fWeaponDamageMult",
    "fDeformationDamageMult",
    "fEngineDamageMult",
    "AIHandling"
  ];

  const TEXT_FIELDS = new Set([
    "handlingName",
    "strModelFlags",
    "strHandlingFlags",
    "strDamageFlags",
    "AIHandling"
  ]);

  const VECTOR_FIELDS = new Set([
    "vecCentreOfMassOffset",
    "vecInertiaMultiplier"
  ]);

  const COMMON_AI_HANDLING_VALUES = ["AVERAGE", "SPORTS_CAR", "TRUCK", "CRAP"];

  const FIELD_STEPS = {
    fMass: 10,
    nInitialDriveGears: 1,
    nMonetaryValue: 100,
    fInitialDriveMaxFlatVel: 1,
    fPetrolTankVolume: 1,
    fOilVolume: 0.5,
    fPercentSubmerged: 1,
    fSteeringLock: 1,
    fDriveBiasFront: 0.01,
    fBrakeBiasFront: 0.01,
    fTractionBiasFront: 0.01,
    fSuspensionBiasFront: 0.01,
    fAntiRollBarBiasFront: 0.01
  };

  const FIELD_TOOLTIPS = {
    // Identity & Power
    handlingName:                    "Internal ID linking this profile to a vehicle via its handlingId in vehicles.meta.",
    fMass:                           "Vehicle mass in kg. Heavier = more momentum, harder to push around, slower acceleration.",
    fInitialDragCoeff:               "Air resistance at top speed. Higher = more drag, lower top speed. Typical cars: 4–8.",
    fDriveBiasFront:                 "Drive wheel bias. 0.0 = pure RWD, 1.0 = pure FWD, 0.5 = equal AWD split.",
    nInitialDriveGears:              "Number of forward gears. More gears = smoother power delivery and higher top speed.",
    fInitialDriveForce:              "Engine torque multiplier. Higher = faster acceleration. Typical range: 0.15–0.45.",
    fDriveInertia:                   "How quickly engine RPM builds. Higher = snappier throttle response. Typical: 0.9–1.2.",
    fClutchChangeRateScaleUpShift:   "Clutch engagement speed when shifting up. Higher = faster upshift. Typical: 2.0–4.0.",
    fClutchChangeRateScaleDownShift: "Clutch engagement speed when shifting down. Higher = faster downshift.",
    fInitialDriveMaxFlatVel:         "Approximate top speed on flat ground in km/h. The actual cap also depends on gear ratios.",

    // Braking & Steering
    fBrakeForce:     "Braking power multiplier. Higher = shorter stopping distance. Typical: 0.6–1.1.",
    fBrakeBiasFront: "Brake force distribution. 1.0 = all front, 0.0 = all rear. Typical balanced: 0.55–0.7.",
    fHandBrakeForce: "Handbrake strength. Higher = more aggressive lockup for drifting. Typical: 0.6–1.5.",
    fSteeringLock:   "Maximum wheel steering angle in degrees. Higher = tighter turns but twitchier at speed. Typical: 30–50.",

    // Traction
    fTractionCurveMax:        "Peak grip at low tyre slip — acceleration and initial corner grip. Higher = more traction.",
    fTractionCurveMin:        "Grip at high tyre slip (sliding). Higher = car recovers grip more easily mid-slide.",
    fTractionCurveLateral:    "Lateral (side) grip for cornering. Higher = more cornering force. Typical: 18–28.",
    fTractionSpringDeltaMax:  "Slip angle at peak traction. Lower values sharpen the grip peak. Typical: 0.1–0.2.",
    fLowSpeedTractionLossMult:"Wheelspin tendency from a standstill. Higher = more burnout-style wheelspin.",
    fCamberStiffnesss:        "Camber effect on traction. Almost always 0 in vanilla — only useful for very custom setups.",
    fTractionBiasFront:       "Traction split front/rear. 0.5 = balanced, higher = more front-wheel traction.",
    fTractionLossMult:        "Overall traction loss on surfaces like gravel or mud. Higher = more slippery feeling.",

    // Suspension & Body Control
    fSuspensionForce:       "Spring stiffness. Higher = stiffer ride, less body roll, but harsher over bumps. Typical: 1.0–3.0.",
    fSuspensionCompDamp:    "Compression damping — how quickly suspension compresses over a bump. Higher = firmer.",
    fSuspensionReboundDamp: "Rebound damping — how quickly suspension extends after a bump. Higher = slower rebound.",
    fSuspensionUpperLimit:  "Maximum upward suspension travel distance (metres). Positive value.",
    fSuspensionLowerLimit:  "Maximum downward suspension droop distance (metres). Negative value.",
    fSuspensionRaise:       "Ride height offset in metres. Positive = raised, negative = lowered.",
    fSuspensionBiasFront:   "Suspension stiffness bias front/rear. 0.5 = balanced.",
    fAntiRollBarForce:      "Anti-roll bar strength. Higher = less body lean in corners, more responsive.",
    fAntiRollBarBiasFront:  "Anti-roll bar force split front/rear. Higher = more anti-roll at the front.",
    fRollCentreHeightFront: "Roll centre height at front axle. Affects weight transfer and balance in corners.",
    fRollCentreHeightRear:  "Roll centre height at rear axle. Works together with front to set handling balance.",

    // Damage & AI
    fCollisionDamageMult:    "Multiplier for damage taken in collisions. Higher = vehicle damages more easily in crashes.",
    fWeaponDamageMult:       "Multiplier for weapon damage. Higher = vehicle is more vulnerable to gunfire.",
    fDeformationDamageMult:  "How much the body visually deforms on impact. Higher = more crumple effect.",
    fEngineDamageMult:       "Engine vulnerability multiplier. Higher = engine fails sooner when the vehicle is damaged.",
    AIHandling:              "NPC driving behaviour profile. Controls how aggressively and capably AI drives this vehicle.",

    // Advanced
    fPercentSubmerged:    "What fraction of the vehicle must be underwater before it starts to sink. 0.85 = 85%.",
    vecCentreOfMassOffset:"X/Y/Z offset of the vehicle's centre of mass. Shifts balance point — affects oversteer/understeer.",
    vecInertiaMultiplier: "Rotational inertia per axis. Higher = harder to spin or change direction. Affects flip resistance.",
    fPetrolTankVolume:    "Fuel tank size. Larger tanks take longer to catch fire when shot. Typical: 45–65.",
    fOilVolume:           "Oil volume. Typically matches or is lower than petrol tank. Rarely needs changing.",
    fSeatOffsetDistX:     "Driver seat X position offset from vehicle centre.",
    fSeatOffsetDistY:     "Driver seat Y position offset (forward/back).",
    fSeatOffsetDistZ:     "Driver seat Z position offset (up/down).",
    nMonetaryValue:       "In-game monetary value displayed in menus. Does not affect gameplay physics.",
    strModelFlags:        "Hex/flag string controlling physics model behaviour (e.g. is_electric, has_livery).",
    strHandlingFlags:     "Hex/flag string for special handling overrides (e.g. smooth_jumping, no_handbrake).",
    strDamageFlags:       "Hex/flag string controlling special damage behaviour (e.g. invincible_engine)."
  };

  const SECTION_DEFINITIONS = [
    {
      title: "Identity & Power",
      fields: [
        "handlingName",
        "fMass",
        "fInitialDragCoeff",
        "fDriveBiasFront",
        "nInitialDriveGears",
        "fInitialDriveForce",
        "fDriveInertia",
        "fClutchChangeRateScaleUpShift",
        "fClutchChangeRateScaleDownShift",
        "fInitialDriveMaxFlatVel"
      ]
    },
    {
      title: "Braking & Steering",
      fields: [
        "fBrakeForce",
        "fBrakeBiasFront",
        "fHandBrakeForce",
        "fSteeringLock"
      ]
    },
    {
      title: "Traction",
      fields: [
        "fTractionCurveMax",
        "fTractionCurveMin",
        "fTractionCurveLateral",
        "fTractionSpringDeltaMax",
        "fLowSpeedTractionLossMult",
        "fCamberStiffnesss",
        "fTractionBiasFront",
        "fTractionLossMult"
      ]
    },
    {
      title: "Suspension & Body Control",
      fields: [
        "fSuspensionForce",
        "fSuspensionCompDamp",
        "fSuspensionReboundDamp",
        "fSuspensionUpperLimit",
        "fSuspensionLowerLimit",
        "fSuspensionRaise",
        "fSuspensionBiasFront",
        "fAntiRollBarForce",
        "fAntiRollBarBiasFront",
        "fRollCentreHeightFront",
        "fRollCentreHeightRear"
      ]
    },
    {
      title: "Damage & AI",
      fields: [
        "fCollisionDamageMult",
        "fWeaponDamageMult",
        "fDeformationDamageMult",
        "fEngineDamageMult",
        "AIHandling"
      ]
    },
    {
      title: "Advanced Vehicle Values",
      fields: [
        "fPercentSubmerged",
        "vecCentreOfMassOffset",
        "vecInertiaMultiplier",
        "fPetrolTankVolume",
        "fOilVolume",
        "fSeatOffsetDistX",
        "fSeatOffsetDistY",
        "fSeatOffsetDistZ",
        "nMonetaryValue",
        "strModelFlags",
        "strHandlingFlags",
        "strDamageFlags"
      ]
    }
  ];

  const KNOWN_TOP_LEVEL_FIELDS = new Set(
    SECTION_DEFINITIONS.flatMap(section => section.fields).concat("SubHandlingData")
  );

  const PROJECT_DB_NAME = "gtaTrafficHandlingMetaDB";
  const PROJECT_DB_VERSION = 1;
  const PROJECT_STORE_NAME = "projects";
  const LAST_ACTIVE_PROJECT_KEY = "gtaTrafficHandlingMetaLastActiveProject";
  const FALLBACK_PROJECTS_KEY = "gtaTrafficHandlingMetaProjectsFallback";
  const AUTOSAVE_DELAY = 450;

  let projectDatabase = null;
  let autosaveTimer = null;

  const state = {
    fileName: "handling.meta",
    dlcName: "",
    activeProjectId: "",
    projectCreatedAt: "",
    lastSavedAt: "",
    storageReady: false,
    storageMode: "none",
    xmlDoc: null,
    originalText: "",
    entries: [],
    filteredIndexes: [],
    selectedKeys: new Set(),
    activeProfileIndex: -1,
    warnings: []
  };

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function makeProjectId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `handling_meta_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function directChildren(element, tagName = "") {
    return [...element.children].filter(child => !tagName || child.tagName === tagName);
  }

  function directChild(element, tagName) {
    return directChildren(element, tagName)[0] || null;
  }

  function fieldMode(tagName, element = null) {
    if (VECTOR_FIELDS.has(tagName)) return "vector";
    if (TEXT_FIELDS.has(tagName)) return "text";
    if (element) {
      if (["x", "y", "z"].some(attribute => element.hasAttribute(attribute))) return "vector";
      if (element.hasAttribute("value")) return "value";
      return "text";
    }
    return "value";
  }

  function readTopField(item, tagName) {
    const child = directChild(item, tagName);
    if (!child) return "";
    if (child.hasAttribute("value")) return child.getAttribute("value") ?? "";
    return child.textContent.trim();
  }

  function ensureTopField(item, tagName, mode = fieldMode(tagName)) {
    let child = directChild(item, tagName);
    if (child) return child;

    child = state.xmlDoc.createElement(tagName);
    if (mode === "value") child.setAttribute("value", "");
    if (mode === "vector") {
      child.setAttribute("x", "0.000000");
      child.setAttribute("y", "0.000000");
      child.setAttribute("z", "0.000000");
    }

    const subHandling = directChild(item, "SubHandlingData");
    if (subHandling) item.insertBefore(child, subHandling);
    else item.appendChild(child);
    return child;
  }

  function writeTopField(item, tagName, value, mode = fieldMode(tagName)) {
    const child = ensureTopField(item, tagName, mode);
    if (mode === "text") child.textContent = value;
    else child.setAttribute("value", value);
  }

  function getSubTypes(item) {
    const container = directChild(item, "SubHandlingData");
    if (!container) return [];
    return directChildren(container, "Item")
      .map(sub => sub.getAttribute("type") || "UNKNOWN")
      .filter(Boolean);
  }

  function readEntry(item, index) {
    const entry = {
      index,
      key: `handling-${index}`,
      item,
      subTypes: getSubTypes(item)
    };

    TABLE_FIELDS.forEach(field => {
      entry[field] = readTopField(item, field);
    });

    entry.primarySubType = entry.subTypes.find(type => type !== "NULL") || "NULL";
    entry.searchText = [
      entry.handlingName,
      entry.AIHandling,
      ...entry.subTypes,
      ...TABLE_FIELDS.map(field => entry[field])
    ].join(" ").toLowerCase();

    return entry;
  }

  function refreshEntry(index) {
    const existing = state.entries[index];
    if (!existing) return;
    state.entries[index] = readEntry(existing.item, index);
  }

  function findHandlingItems(xmlDoc) {
    const handlingData = [...xmlDoc.getElementsByTagName("HandlingData")][0];
    if (!handlingData) return [];
    return directChildren(handlingData, "Item").filter(item => {
      return item.getAttribute("type") === "CHandlingData" || directChild(item, "handlingName");
    });
  }

  function inferDlcName(fileName) {
    const base = String(fileName || "")
      .replace(/\.meta$/i, "")
      .replace(/_handling$/i, "")
      .trim();
    return /^handling$/i.test(base) ? "" : base;
  }

  function parseHandling(text, fileName = "handling.meta", options = {}) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const parseError = xmlDoc.querySelector("parsererror");

    if (parseError) {
      setStatus(`Could not parse ${fileName}. The file contains invalid XML.`, "bad");
      return false;
    }

    const items = findHandlingItems(xmlDoc);
    if (!items.length) {
      setStatus(`No CHandlingData profiles were found in ${fileName}.`, "bad");
      return false;
    }

    state.xmlDoc = xmlDoc;
    state.originalText = text;
    state.fileName = fileName || "handling.meta";
    state.entries = items.map(readEntry);
    state.filteredIndexes = state.entries.map((_, index) => index);
    state.selectedKeys.clear();
    state.activeProfileIndex = 0;
    state.warnings = [];

    if (!options.keepProjectIdentity) {
      state.activeProjectId = makeProjectId();
      state.projectCreatedAt = new Date().toISOString();
      state.lastSavedAt = "";
    }

    if (typeof options.dlcName === "string") state.dlcName = options.dlcName;
    else state.dlcName = inferDlcName(fileName);

    el("hmDlcName").value = state.dlcName;
    updateExportFilenamePreview();
    populateFilters();
    populateProfileSelect();
    applyFilters();
    renderProfileEditor();
    runAnalyzer(false);
    updateStats();

    setStatus(`Loaded ${state.entries.length.toLocaleString()} handling profiles from ${fileName}.`, "good");

    if (!options.skipAutosave) scheduleAutosave(80);
    return true;
  }

  function humanizeField(field) {
    return field
      .replace(/^f(?=[A-Z])/, "")
      .replace(/^n(?=[A-Z])/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/s{2,}/g, "s")
      .trim();
  }

  function setupQuickEditFields() {
    el("hmQuickEditField").innerHTML = QUICK_FIELDS.map(field => (
      `<option value="${escapeHTML(field)}">${escapeHTML(field)} — ${escapeHTML(humanizeField(field))}</option>`
    )).join("");
  }

  function getAiHandlingValues(currentValue = "") {
    return [...new Set([
      ...COMMON_AI_HANDLING_VALUES,
      ...state.entries.map(entry => entry.AIHandling).filter(Boolean),
      currentValue
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function aiHandlingSelect(value, attributes = "") {
    const options = getAiHandlingValues(value).map(option => (
      `<option value="${escapeHTML(option)}" ${option === value ? "selected" : ""}>${escapeHTML(option)}</option>`
    )).join("");
    const blank = `<option value="" ${value ? "" : "selected"}>Blank</option>`;
    return `<select class="hm-cell-select" ${attributes}>${blank}${options}</select>`;
  }

  function getFieldStep(field, rawValue = "") {
    if (Object.prototype.hasOwnProperty.call(FIELD_STEPS, field)) return FIELD_STEPS[field];
    const numeric = Math.abs(Number(rawValue));
    if (Number.isFinite(numeric) && numeric >= 1000) return 10;
    if (Number.isFinite(numeric) && numeric >= 100) return 1;
    return 0.01;
  }

  function decimalPlaces(value) {
    const text = String(value ?? "");
    if (/e-/i.test(text)) return Number(text.split(/e-/i)[1]) || 0;
    const dot = text.indexOf(".");
    return dot < 0 ? 0 : text.length - dot - 1;
  }

  function numericControl(inputHtml, field, rawValue) {
    const step = getFieldStep(field, rawValue);
    return `
      <div class="hm-number-control" data-hm-number-field="${escapeHTML(field || "value")}">
        <button class="hm-step-button" type="button" data-hm-adjust="-1" title="Decrease by ${escapeHTML(step)}" aria-label="Decrease ${escapeHTML(field || "value")}">−</button>
        ${inputHtml.replace(">", ` data-hm-numeric="true" data-hm-step="${escapeHTML(step)}">`)}
        <button class="hm-step-button" type="button" data-hm-adjust="1" title="Increase by ${escapeHTML(step)}" aria-label="Increase ${escapeHTML(field || "value")}">+</button>
      </div>`;
  }

  function populateFilters() {
    const aiValues = [...new Set(state.entries.map(entry => entry.AIHandling).filter(Boolean))].sort();
    const subTypes = [...new Set(state.entries.flatMap(entry => entry.subTypes).filter(Boolean))].sort();
    const knownClasses = [...new Set(
      state.entries.map(entry => getVehicleClass(entry.handlingName)).filter(Boolean)
    )].sort();

    const currentAi  = el("hmAiFilter").value;
    const currentSub = el("hmSubTypeFilter").value;
    const currentCls = el("hmClassFilter")?.value || "";

    el("hmAiFilter").innerHTML = `<option value="">All AI types</option>${aiValues.map(value => (
      `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`
    )).join("")}`;

    el("hmSubTypeFilter").innerHTML = `<option value="">All subhandling types</option>${subTypes.map(value => (
      `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`
    )).join("")}`;

    const classEl = el("hmClassFilter");
    if (classEl) {
      classEl.innerHTML = `<option value="">All classes</option>${knownClasses.map(c => (
        `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`
      )).join("")}`;
      if (knownClasses.includes(currentCls)) classEl.value = currentCls;
    }

    if (aiValues.includes(currentAi)) el("hmAiFilter").value = currentAi;
    if (subTypes.includes(currentSub)) el("hmSubTypeFilter").value = currentSub;
  }

  function applyFilters() {
    const search  = el("hmSearch").value.trim().toLowerCase();
    const ai      = el("hmAiFilter").value;
    const aiSort  = el("hmAiSort")?.value || "original";
    const subType = el("hmSubTypeFilter").value;
    const cls     = el("hmClassFilter")?.value || "";

    const filtered = state.entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => {
        if (search && !entry.searchText.includes(search)) return false;
        if (ai && entry.AIHandling !== ai) return false;
        if (subType && !entry.subTypes.includes(subType)) return false;
        if (cls && getVehicleClass(entry.handlingName) !== cls) return false;
        return true;
      });

    if (aiSort !== "original") {
      filtered.sort((a, b) => {
        const aiCompare = (a.entry.AIHandling || "").localeCompare(b.entry.AIHandling || "");
        const nameCompare = (a.entry.handlingName || "").localeCompare(b.entry.handlingName || "");
        const result = aiCompare || nameCompare;
        return aiSort === "desc" ? -result : result;
      });
    }

    state.filteredIndexes = filtered.map(({ index }) => index);
    renderTable();
    updateStats();
  }

  function tableInput(entry, field) {
    const value = entry[field] ?? "";
    const input = `<input class="hm-cell-input" type="text" value="${escapeHTML(value)}" title="${escapeHTML(value)}" data-hm-table-index="${entry.index}" data-hm-table-field="${escapeHTML(field)}">`;
    return TEXT_FIELDS.has(field) ? input : numericControl(input, field, value);
  }

  function tableAiSelect(entry) {
    return aiHandlingSelect(
      entry.AIHandling,
      `data-hm-table-index="${entry.index}" data-hm-table-field="AIHandling"`
    );
  }

  function renderTable() {
    const body = el("hmTableBody");

    if (!state.entries.length) {
      body.innerHTML = `<tr><td colspan="17" class="hm-muted">Load a handling.meta file to begin.</td></tr>`;
      return;
    }

    if (!state.filteredIndexes.length) {
      body.innerHTML = `<tr><td colspan="17" class="hm-muted">No handling profiles match the current filters.</td></tr>`;
    } else {
      body.innerHTML = state.filteredIndexes.map(index => {
        const entry = state.entries[index];
        const selected = state.selectedKeys.has(entry.key);
        const active = index === state.activeProfileIndex;
        return `
          <tr data-hm-row-index="${index}" class="${selected ? "selected-row" : ""} ${active ? "active-profile-row" : ""}">
            <td><input type="checkbox" data-hm-select-index="${index}" ${selected ? "checked" : ""}></td>
            <td><button class="hm-edit-profile" type="button" data-hm-edit-index="${index}">Edit</button></td>
            <td>${tableInput(entry, "handlingName")}</td>
            <td>${tableAiSelect(entry)}</td>
            <td>${tableInput(entry, "fMass")}</td>
            <td>${tableInput(entry, "fDriveBiasFront")}</td>
            <td>${tableInput(entry, "nInitialDriveGears")}</td>
            <td>${tableInput(entry, "fInitialDriveForce")}</td>
            <td>${tableInput(entry, "fInitialDriveMaxFlatVel")}</td>
            <td>${tableInput(entry, "fBrakeForce")}</td>
            <td>${tableInput(entry, "fSteeringLock")}</td>
            <td>${tableInput(entry, "fTractionCurveMax")}</td>
            <td>${tableInput(entry, "fSuspensionForce")}</td>
            <td>${tableInput(entry, "fDeformationDamageMult")}</td>
            <td>${tableInput(entry, "fCollisionDamageMult")}</td>
            <td>${tableInput(entry, "fWeaponDamageMult")}</td>
            <td>${tableInput(entry, "fEngineDamageMult")}</td>
          </tr>`;
      }).join("");
    }

    const visibleKeys = state.filteredIndexes.map(index => state.entries[index].key);
    const selectedVisible = visibleKeys.filter(key => state.selectedKeys.has(key)).length;
    const selectAll = el("hmSelectAllVisible");
    selectAll.checked = visibleKeys.length > 0 && selectedVisible === visibleKeys.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleKeys.length;
  }

  function updateTableField(index, field, value) {
    const entry = state.entries[index];
    if (!entry) return;
    writeTopField(entry.item, field, value, fieldMode(field, directChild(entry.item, field)));
    refreshEntry(index);
    populateFilters();
    populateProfileSelect();
    applyFilters();
    if (index === state.activeProfileIndex) renderProfileEditor();
    runAnalyzer(false);
    scheduleAutosave();
  }

  function applyQuickEdit(scope) {
    if (!state.entries.length) return setStatus("Load a handling.meta file before using Quick Edit.", "warn");

    const field = el("hmQuickEditField").value;
    const value = el("hmQuickEditValue").value;
    let indexes = [];

    if (scope === "selected") {
      indexes = state.entries.filter(entry => state.selectedKeys.has(entry.key)).map(entry => entry.index);
      if (!indexes.length) return setStatus("Select at least one handling profile first.", "warn");
    } else if (scope === "visible") {
      indexes = [...state.filteredIndexes];
      if (!indexes.length) return setStatus("There are no visible profiles to edit.", "warn");
    } else {
      indexes = state.entries.map(entry => entry.index);
      if (!window.confirm(`Apply ${field} = ${value} to all ${indexes.length} handling profiles?`)) return;
    }

    indexes.forEach(index => {
      const entry = state.entries[index];
      writeTopField(entry.item, field, value, fieldMode(field, directChild(entry.item, field)));
      refreshEntry(index);
    });

    populateFilters();
    populateProfileSelect();
    applyFilters();
    renderProfileEditor();
    runAnalyzer(false);
    scheduleAutosave();
    setStatus(`Applied ${field} to ${indexes.length.toLocaleString()} handling profile${indexes.length === 1 ? "" : "s"}.`, "good");
  }

  function selectVisible(checked) {
    state.filteredIndexes.forEach(index => {
      const key = state.entries[index].key;
      if (checked) state.selectedKeys.add(key);
      else state.selectedKeys.delete(key);
    });
    renderTable();
    updateStats();
  }

  function clearAllSelections() {
    state.selectedKeys.clear();
    renderTable();
    updateStats();
  }

  function buildProfileSelectOptions(includePrompt = false) {
    if (!state.entries.length) return `<option value="">Load a file first</option>`;

    const sorted = [...state.entries].sort((a, b) => (
      (a.handlingName || `Profile ${a.index + 1}`).localeCompare(b.handlingName || `Profile ${b.index + 1}`)
    ));
    const groups = new Map();
    sorted.forEach(entry => {
      const displayName = entry.handlingName || `(Profile ${entry.index + 1})`;
      const first = /^[A-Z0-9]/i.test(displayName) ? displayName[0].toUpperCase() : "#";
      if (!groups.has(first)) groups.set(first, []);
      groups.get(first).push(entry);
    });

    const prompt = includePrompt ? `<option value="">Choose a handling name...</option>` : "";
    return prompt + [...groups.entries()].map(([letter, entries]) => `
      <optgroup label="${escapeHTML(letter)}">
        ${entries.map(entry => {
          const name = entry.handlingName || `(Profile ${entry.index + 1})`;
          const details = [entry.AIHandling, entry.primarySubType].filter(Boolean).join(" · ");
          return `<option value="${entry.index}">${escapeHTML(name)}${details ? ` — ${escapeHTML(details)}` : ""}</option>`;
        }).join("")}
      </optgroup>`).join("");
  }

  function populateProfileSelect() {
    const profileSelect = el("hmProfileSelect");
    const tableSelect = el("hmTableProfileSelect");

    profileSelect.innerHTML = buildProfileSelectOptions(false);
    tableSelect.innerHTML = buildProfileSelectOptions(true);

    if (state.activeProfileIndex >= 0) {
      profileSelect.value = String(state.activeProfileIndex);
      tableSelect.value = String(state.activeProfileIndex);
    }
  }

  function renderTopEditorField(item, tagName, index) {
    const child = directChild(item, tagName);
    const mode = fieldMode(tagName, child);

    const tipText = FIELD_TOOLTIPS[tagName] || "";
    const tipIcon = tipText
      ? `<span class="hm-field-tip" aria-label="${escapeHTML(tipText)}">ⓘ</span>`
      : "";

    if (mode === "vector") {
      return `
        <div class="hm-field hm-vector-field">
          <span>${escapeHTML(tagName)}${tipIcon}</span>
          <div class="hm-vector-inputs">
            ${["x", "y", "z"].map(attribute => {
              const value = child?.getAttribute(attribute) || "";
              const input = `<input type="text" value="${escapeHTML(value)}" data-hm-scope="top" data-hm-index="${index}" data-hm-tag="${escapeHTML(tagName)}" data-hm-mode="vector" data-hm-attr="${attribute}">`;
              return `<label>${attribute.toUpperCase()}${numericControl(input, tagName, value)}</label>`;
            }).join("")}
          </div>
        </div>`;
    }

    const value = child ? (mode === "text" ? child.textContent.trim() : child.getAttribute("value") || "") : "";

    if (tagName === "AIHandling") {
      return `
        <label class="hm-field">
          <span>${escapeHTML(tagName)}${tipIcon}</span>
          ${aiHandlingSelect(value, `data-hm-scope="top" data-hm-index="${index}" data-hm-tag="AIHandling" data-hm-mode="text"`)}
        </label>`;
    }

    const input = `<input type="text" value="${escapeHTML(value)}" title="${escapeHTML(value)}" data-hm-scope="top" data-hm-index="${index}" data-hm-tag="${escapeHTML(tagName)}" data-hm-mode="${mode}">`;
    return `
      <label class="hm-field">
        <span>${escapeHTML(tagName)}${tipIcon}</span>
        ${mode === "value" ? numericControl(input, tagName, value) : input}
      </label>`;
  }

  function elementAtChildPath(root, pathText) {
    if (!root) return null;
    const parts = String(pathText || "").split(".").filter(Boolean).map(Number);
    let current = root;
    for (const part of parts) {
      current = directChildren(current)[part];
      if (!current) return null;
    }
    return current;
  }

  function renderSubField(child, entryIndex, subIndex, path = []) {
    const tagName = child.tagName;
    const childElements = directChildren(child);
    const pathText = path.join(".");

    if (childElements.length) {
      return `
        <div class="hm-nested-field">
          <div class="hm-nested-field-title">${escapeHTML(tagName)}</div>
          <div class="hm-nested-field-grid">
            ${childElements.map((nestedChild, nestedIndex) => renderSubField(
              nestedChild,
              entryIndex,
              subIndex,
              [...path, nestedIndex]
            )).join("")}
          </div>
        </div>`;
    }

    if (["x", "y", "z"].some(attribute => child.hasAttribute(attribute))) {
      return `
        <div class="hm-field hm-vector-field">
          <span>${escapeHTML(tagName)}</span>
          <div class="hm-vector-inputs">
            ${["x", "y", "z"].map(attribute => {
              const value = child.getAttribute(attribute) || "";
              const input = `<input type="text" value="${escapeHTML(value)}" data-hm-scope="sub" data-hm-index="${entryIndex}" data-hm-sub-index="${subIndex}" data-hm-path="${pathText}" data-hm-mode="vector" data-hm-attr="${attribute}">`;
              return `<label>${attribute.toUpperCase()}${numericControl(input, tagName, value)}</label>`;
            }).join("")}
          </div>
        </div>`;
    }

    const mode = child.hasAttribute("value") ? "value" : "text";
    const value = mode === "value" ? child.getAttribute("value") || "" : child.textContent.trim();
    const itemLabel = tagName === "Item" ? `Item ${path[path.length - 1] + 1}` : tagName;
    const useTextarea = mode === "text" && (child.hasAttribute("content") || value.includes("\n") || value.length > 80);

    const input = `<input type="text" value="${escapeHTML(value)}" title="${escapeHTML(value)}" data-hm-scope="sub" data-hm-index="${entryIndex}" data-hm-sub-index="${subIndex}" data-hm-path="${pathText}" data-hm-mode="${mode}">`;
    return `
      <label class="hm-field ${useTextarea ? "hm-wide-field" : ""}">
        <span>${escapeHTML(itemLabel)}</span>
        ${useTextarea
          ? `<textarea rows="4" data-hm-scope="sub" data-hm-index="${entryIndex}" data-hm-sub-index="${subIndex}" data-hm-path="${pathText}" data-hm-mode="text">${escapeHTML(value)}</textarea>`
          : (mode === "value" ? numericControl(input, tagName, value) : input)}
      </label>`;
  }

  function renderSubHandling(item, entryIndex) {
    const container = directChild(item, "SubHandlingData");
    if (!container) {
      return `<section class="hm-editor-section"><h3>SubHandlingData</h3><div class="hm-null-subhandling">This profile has no SubHandlingData section.</div></section>`;
    }

    const subItems = directChildren(container, "Item");
    return `
      <section class="hm-editor-section">
        <h3>SubHandlingData</h3>
        <div class="hm-subhandling-list">
          ${subItems.map((subItem, subIndex) => {
            const type = subItem.getAttribute("type") || "UNKNOWN";
            const fields = directChildren(subItem);
            return `
              <article class="hm-subhandling-card">
                <header><strong>${escapeHTML(type)}</strong><span class="hm-muted">Subhandling slot ${subIndex + 1}</span></header>
                ${type === "NULL" || !fields.length
                  ? `<div class="hm-null-subhandling">No editable fields in this slot.</div>`
                  : `<div class="hm-editor-grid">${fields.map((child, childIndex) => renderSubField(child, entryIndex, subIndex, [childIndex])).join("")}</div>`}
              </article>`;
          }).join("")}
        </div>
      </section>`;
  }

  function renderProfileEditor() {
    const host = el("hmProfileEditor");
    if (!state.entries.length || state.activeProfileIndex < 0) {
      host.innerHTML = `<div class="hm-empty-editor">Load a handling.meta file and select a profile.</div>`;
      return;
    }

    const entry = state.entries[state.activeProfileIndex];
    if (!entry) return;
    const item = entry.item;

    const definedFields = new Set(SECTION_DEFINITIONS.flatMap(section => section.fields));
    const additionalFields = directChildren(item)
      .filter(child => child.tagName !== "SubHandlingData" && !definedFields.has(child.tagName))
      .map(child => child.tagName);

    host.innerHTML = `
      <div class="hm-profile-summary">
        <div>
          <h3>${escapeHTML(entry.handlingName || `(Profile ${entry.index + 1})`)}</h3>
          <small>Handling profile ${entry.index + 1} of ${state.entries.length}</small>
        </div>
        <div class="hm-profile-summary-tags">
          <span class="hm-profile-tag">AI: ${escapeHTML(entry.AIHandling || "Blank")}</span>
          ${entry.subTypes.map(type => `<span class="hm-profile-tag">${escapeHTML(type)}</span>`).join("")}
        </div>
      </div>

      ${SECTION_DEFINITIONS.map(section => `
        <section class="hm-editor-section">
          <h3>${escapeHTML(section.title)}</h3>
          <div class="hm-editor-grid">
            ${section.fields.map(field => renderTopEditorField(item, field, entry.index)).join("")}
          </div>
        </section>`).join("")}

      ${additionalFields.length ? `
        <section class="hm-editor-section">
          <h3>Additional Values Found in This File</h3>
          <div class="hm-editor-grid">
            ${additionalFields.map(field => renderTopEditorField(item, field, entry.index)).join("")}
          </div>
        </section>` : ""}

      ${renderSubHandling(item, entry.index)}
    `;
  }

  function writeProfileInputValue(input) {
    const entryIndex = Number(input.dataset.hmIndex);
    const entry = state.entries[entryIndex];
    if (!entry) return -1;

    const scope = input.dataset.hmScope;
    const tagName = input.dataset.hmTag;
    const mode = input.dataset.hmMode;
    const attribute = input.dataset.hmAttr;
    const value = input.value;

    if (scope === "top") {
      const child = ensureTopField(entry.item, tagName, mode);
      if (mode === "vector") child.setAttribute(attribute, value);
      else if (mode === "text") child.textContent = value;
      else child.setAttribute("value", value);
    } else if (scope === "sub") {
      const container = directChild(entry.item, "SubHandlingData");
      const subIndex = Number(input.dataset.hmSubIndex);
      const subItem = container ? directChildren(container, "Item")[subIndex] : null;
      if (!subItem) return -1;
      const child = elementAtChildPath(subItem, input.dataset.hmPath);
      if (!child) return -1;
      if (mode === "vector") child.setAttribute(attribute, value);
      else if (mode === "text") child.textContent = value;
      else child.setAttribute("value", value);
    }

    refreshEntry(entryIndex);
    return entryIndex;
  }

  function formatAdjustedNumber(rawValue, step, direction) {
    const current = Number(rawValue);
    const safeCurrent = Number.isFinite(current) ? current : 0;
    const next = safeCurrent + (step * direction);
    const places = Math.min(8, Math.max(decimalPlaces(rawValue), decimalPlaces(step)));
    const rounded = Number(next.toFixed(Math.max(places, 0)));
    if (places === 0) return String(Math.round(rounded));
    return rounded.toFixed(places);
  }

  function adjustNumericControl(button) {
    const control = button.closest(".hm-number-control");
    const input = control?.querySelector("input[data-hm-numeric]");
    if (!input) return;

    const direction = Number(button.dataset.hmAdjust) || 0;
    const step = Number(input.dataset.hmStep) || 0.01;
    input.value = formatAdjustedNumber(input.value, step, direction);
    input.title = input.value;

    if (input.dataset.hmTableField) {
      const index = Number(input.dataset.hmTableIndex);
      const field = input.dataset.hmTableField;
      const entry = state.entries[index];
      if (!entry) return;
      writeTopField(entry.item, field, input.value, fieldMode(field, directChild(entry.item, field)));
      refreshEntry(index);
    } else if (input.dataset.hmScope) {
      writeProfileInputValue(input);
    }

    runAnalyzer(false);
    updateStats();
    scheduleAutosave();
  }

  function focusTableProfile(index) {
    if (!state.entries[index]) return;
    state.activeProfileIndex = index;
    populateProfileSelect();
    renderTable();
    requestAnimationFrame(() => {
      const row = document.querySelector(`[data-hm-row-index="${index}"]`);
      if (row) row.scrollIntoView({ block: "center", inline: "nearest" });
    });
  }

  function updateProfileField(input) {
    const entryIndex = writeProfileInputValue(input);
    if (entryIndex < 0) return;

    populateFilters();
    populateProfileSelect();
    applyFilters();
    renderProfileEditor();
    runAnalyzer(false);
    scheduleAutosave();
  }

  function openProfile(index) {
    if (!state.entries[index]) return;
    state.activeProfileIndex = index;
    populateProfileSelect();
    renderTable();
    renderProfileEditor();
    openTab("profile");
  }

  function moveProfile(direction) {
    if (!state.entries.length) return;
    const next = Math.min(state.entries.length - 1, Math.max(0, state.activeProfileIndex + direction));
    state.activeProfileIndex = next;
    populateProfileSelect();
    renderTable();
    renderProfileEditor();
  }

  function analyzeNumericElements(root, entryName, issues) {
    const invalid = [];
    [...root.getElementsByTagName("*")].forEach(node => {
      [...node.attributes].forEach(attribute => {
        if (!["value", "x", "y", "z"].includes(attribute.name)) return;
        const raw = attribute.value.trim();
        if (raw === "" || !Number.isFinite(Number(raw))) {
          invalid.push(`${node.tagName}.${attribute.name}=${raw || "blank"}`);
        }
      });
    });
    if (invalid.length) issues.push({ entryName, invalid });
  }

  function runAnalyzer(showStatus = true) {
    if (!state.entries.length) {
      state.warnings = [];
      renderAnalysis([]);
      updateStats();
      if (showStatus) setStatus("Load a handling.meta file before running the analyzer.", "warn");
      return;
    }

    const issues = [];
    const nameCounts = new Map();
    state.entries.forEach(entry => {
      const name = entry.handlingName.trim().toLowerCase();
      if (name) nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    });

    const duplicateNames = [...nameCounts.entries()].filter(([, count]) => count > 1);
    if (duplicateNames.length) {
      issues.push({
        level: "bad",
        title: "Duplicate handlingName values",
        message: `${duplicateNames.length} handling name${duplicateNames.length === 1 ? " is" : "s are"} duplicated. Examples: ${duplicateNames.slice(0, 8).map(([name]) => name).join(", ")}`
      });
    }

    const blankNames = state.entries.filter(entry => !entry.handlingName.trim());
    if (blankNames.length) {
      issues.push({
        level: "bad",
        title: "Missing handlingName",
        message: `${blankNames.length} profile${blankNames.length === 1 ? " has" : "s have"} no handlingName.`
      });
    }

    const numericProblems = [];
    state.entries.forEach(entry => analyzeNumericElements(entry.item, entry.handlingName || `Profile ${entry.index + 1}`, numericProblems));
    if (numericProblems.length) {
      issues.push({
        level: "bad",
        title: "Invalid numeric values",
        message: `${numericProblems.length} profile${numericProblems.length === 1 ? " contains" : "s contain"} blank or non-numeric value attributes. Examples: ${numericProblems.slice(0, 5).map(problem => `${problem.entryName} (${problem.invalid[0]})`).join(", ")}`
      });
    }

    const invalidMass = state.entries.filter(entry => {
      const mass = Number(entry.fMass);
      return Number.isFinite(mass) && mass <= 0;
    });
    if (invalidMass.length) {
      issues.push({
        level: "bad",
        title: "Mass is zero or negative",
        message: `${invalidMass.length} profile${invalidMass.length === 1 ? " has" : "s have"} fMass at or below zero. Examples: ${invalidMass.slice(0, 8).map(entry => entry.handlingName).join(", ")}`
      });
    }

    const invalidGears = state.entries.filter(entry => {
      const gears = Number(entry.nInitialDriveGears);
      return Number.isFinite(gears) && (gears < 1 || !Number.isInteger(gears));
    });
    if (invalidGears.length) {
      issues.push({
        level: "bad",
        title: "Invalid gear counts",
        message: `${invalidGears.length} profile${invalidGears.length === 1 ? " has" : "s have"} a gear count below 1 or not expressed as a whole number. Examples: ${invalidGears.slice(0, 8).map(entry => `${entry.handlingName} (${entry.nInitialDriveGears})`).join(", ")}`
      });
    }

    const biasFields = [
      "fDriveBiasFront",
      "fBrakeBiasFront",
      "fTractionBiasFront",
      "fSuspensionBiasFront",
      "fAntiRollBarBiasFront"
    ];
    const biasProblems = [];
    state.entries.forEach(entry => {
      biasFields.forEach(field => {
        const raw = readTopField(entry.item, field);
        const value = Number(raw);
        if (raw !== "" && Number.isFinite(value) && (value < 0 || value > 1)) {
          biasProblems.push(`${entry.handlingName}.${field}=${raw}`);
        }
      });
    });
    if (biasProblems.length) {
      issues.push({
        level: "warn",
        title: "Bias values outside 0–1",
        message: `${biasProblems.length} front-bias value${biasProblems.length === 1 ? " is" : "s are"} outside the normal 0–1 range. Examples: ${biasProblems.slice(0, 8).join(", ")}`
      });
    }

    const tractionProblems = state.entries.filter(entry => {
      const maximum = Number(entry.fTractionCurveMax);
      const minimum = Number(readTopField(entry.item, "fTractionCurveMin"));
      return Number.isFinite(maximum) && Number.isFinite(minimum) && minimum > maximum;
    });
    if (tractionProblems.length) {
      issues.push({
        level: "warn",
        title: "Traction minimum exceeds maximum",
        message: `${tractionProblems.length} profile${tractionProblems.length === 1 ? " has" : "s have"} fTractionCurveMin above fTractionCurveMax. Examples: ${tractionProblems.slice(0, 8).map(entry => entry.handlingName).join(", ")}`
      });
    }

    if (!issues.length) {
      issues.push({
        level: "good",
        title: "No obvious problems found",
        message: `Checked ${state.entries.length.toLocaleString()} handling profiles, including their vector values and subhandling sections.`
      });
    }

    state.warnings = issues.filter(issue => issue.level !== "good");
    renderAnalysis(issues);
    updateStats();

    if (showStatus) {
      setStatus(
        `Analyzer checked ${state.entries.length.toLocaleString()} profiles and found ${state.warnings.length.toLocaleString()} warning group${state.warnings.length === 1 ? "" : "s"}.`,
        state.warnings.length ? "warn" : "good"
      );
    }
  }

  function renderAnalysis(issues) {
    const host = el("hmAnalysis");
    if (!state.entries.length) {
      host.innerHTML = `<div class="hm-analysis-item warn">Load a handling.meta file, then run the analyzer.</div>`;
      return;
    }

    host.innerHTML = issues.map(issue => `
      <div class="hm-analysis-item ${escapeHTML(issue.level)}">
        <strong>${escapeHTML(issue.title)}</strong>
        <div>${escapeHTML(issue.message)}</div>
      </div>`).join("");
  }

  function updateStats() {
    el("hmStats").innerHTML = `
      <div class="hm-stat"><strong>${state.entries.length.toLocaleString()}</strong><span>Profiles</span></div>
      <div class="hm-stat"><strong>${state.selectedKeys.size.toLocaleString()}</strong><span>Selected</span></div>
      <div class="hm-stat"><strong>${state.filteredIndexes.length.toLocaleString()}</strong><span>Visible</span></div>
      <div class="hm-stat"><strong>${state.warnings.length.toLocaleString()}</strong><span>Warnings</span></div>`;
  }

  function openTab(tabName) {
    document.querySelectorAll(".hm-tab-panel").forEach(panel => panel.classList.remove("active"));
    document.querySelectorAll("[data-hm-tab]").forEach(button => {
      const active = button.dataset.hmTab === tabName;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    const target = el(`hmTab${tabName[0].toUpperCase()}${tabName.slice(1)}`);
    if (target) target.classList.add("active");
  }

  function sanitizeDlcName(value) {
    return String(value || "")
      .trim()
      .replace(/\.(meta|xml|txt)$/i, "")
      .replace(/[^a-z0-9_-]+/gi, "_")
      .replace(/^_+|_+$/g, "");
  }

  function getXmlExportFilename() {
    const dlc = sanitizeDlcName(state.dlcName);
    return dlc ? `${dlc}_handling.meta` : "handling.meta";
  }

  function getJsonExportFilename() {
    const dlc = sanitizeDlcName(state.dlcName);
    return dlc ? `${dlc}_handling-meta-backup.json` : "handling-meta-backup.json";
  }

  function updateExportFilenamePreview() {
    const filename = getXmlExportFilename();
    el("hmExportNamePreview").textContent = filename;
    el("hmExportXmlButton").textContent = `Export ${filename}`;
  }

  function serializeXml() {
    if (!state.xmlDoc) return "";
    let xml = new XMLSerializer().serializeToString(state.xmlDoc);
    if (/^\s*<\?xml/i.test(state.originalText) && !/^\s*<\?xml/i.test(xml)) {
      xml = `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    }
    return xml;
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportXml() {
    if (!state.xmlDoc) return setStatus("Load a handling.meta file before exporting.", "warn");
    const filename = getXmlExportFilename();
    downloadText(filename, serializeXml(), "application/xml");
    setStatus(`Exported ${filename}.`, "good");
  }

  // -------------------------------------------------------
  // Cloud load helpers
  // -------------------------------------------------------

  function buildHandlingMetaXml(profile) {
    const STORED_TEXT = new Set(["handlingName", "AIHandling"]);
    const fields = [
      "handlingName",
      "fMass", "fInitialDragCoeff", "fDownForceModifier", "fPercentSubmerged",
      "fDriveBiasFront", "nInitialDriveGears", "fInitialDriveForce", "fDriveInertia",
      "fClutchChangeRateScaleUpShift", "fClutchChangeRateScaleDownShift", "fInitialDriveMaxFlatVel",
      "fBrakeForce", "fBrakeBiasFront", "fHandBrakeForce", "fSteeringLock",
      "fTractionCurveMax", "fTractionCurveMin", "fTractionCurveLateral",
      "fTractionSpringDeltaMax", "fLowSpeedTractionLossMult", "fCamberStiffnesss",
      "fTractionBiasFront", "fTractionLossMult",
      "fSuspensionForce", "fSuspensionCompDamp", "fSuspensionReboundDamp",
      "fSuspensionUpperLimit", "fSuspensionLowerLimit", "fSuspensionRaise",
      "fSuspensionBiasFront", "fAntiRollBarForce", "fAntiRollBarBiasFront",
      "fRollCentreHeightFront", "fRollCentreHeightRear",
      "fCollisionDamageMult", "fWeaponDamageMult", "fDeformationDamageMult", "fEngineDamageMult",
      "AIHandling"
    ];

    const esc = v => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const fieldLines = fields
      .map(f => {
        const val = profile[f];
        if (val === undefined || val === null || val === "") return null;
        return STORED_TEXT.has(f)
          ? `      <${f}>${esc(val)}</${f}>`
          : `      <${f} value="${esc(val)}" />`;
      })
      .filter(Boolean);

    const subTypes = Array.isArray(profile.subHandlingTypes) && profile.subHandlingTypes.length
      ? profile.subHandlingTypes
      : ["NULL"];
    const subItems = subTypes.map(t => `        <Item type="${esc(t)}" />`).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<CHandlingDataMgr>\n  <HandlingData>\n    <Item type="CHandlingData">\n${fieldLines.join("\n")}\n      <SubHandlingData>\n${subItems}\n      </SubHandlingData>\n    </Item>\n  </HandlingData>\n</CHandlingDataMgr>`;
  }

  async function loadFromCloud(handlingId) {
    setStatus(`Loading "${handlingId}" from cloud…`, "warn");
    try {
      const response = await fetch(
        `/api/handling-profiles/${encodeURIComponent(handlingId)}`,
        { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" }
      );
      if (!response.ok) {
        setStatus(`No cloud profile found for "${handlingId}". Drop a handling.meta file to load one.`, "warn");
        return;
      }
      const result = await response.json();
      if (!result.ok || !result.profile) {
        setStatus(`No cloud profile found for "${handlingId}". Drop a handling.meta file to load one.`, "warn");
        return;
      }
      const xml = buildHandlingMetaXml(result.profile);
      const loaded = parseHandling(xml, `${handlingId}.meta`, { dlcName: handlingId });
      if (loaded) {
        const banner = el("hmCloudBanner");
        if (banner) {
          banner.hidden = false;
          banner.textContent = `Loaded from cloud: ${handlingId}. Drop a handling.meta file to override with a full version.`;
        }
      }
    } catch (err) {
      console.warn("Cloud handling load failed:", err);
      setStatus(`Could not load cloud profile for "${handlingId}". Drop a handling.meta file to continue.`, "warn");
    }
  }

  function saveActiveProfile() {
    if (!state.entries.length || state.activeProfileIndex < 0) {
      setStatus("No profile is open — select a profile first.", "warn");
      return;
    }

    // Force-flush every input in the per-vehicle editor that may not
    // have fired its change event yet (user typed but didn't blur).
    const editor = document.getElementById("hmProfileEditor");
    if (editor) {
      editor.querySelectorAll("input, select, textarea").forEach(input => {
        // Only flush editor (non-table) inputs
        if (input.dataset.hmScope) writeProfileInputValue(input);
      });
    }

    // Refresh in-memory entry fields + table row
    refreshEntry(state.activeProfileIndex);
    populateFilters();
    populateProfileSelect();
    applyFilters();

    // Commit to local autosave immediately (no delay)
    scheduleAutosave(0);

    // Visual feedback on the button
    const btn = document.getElementById("hmSaveProfileBtn");
    const msg = document.getElementById("hmProfileSaveMsg");
    const name = state.entries[state.activeProfileIndex]?.handlingName || "Profile";

    if (btn) {
      btn.textContent = "Saved ✓";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = "Save Changes";
        btn.disabled = false;
      }, 2000);
    }
    if (msg) {
      msg.textContent = `${name} saved — included in next export.`;
      setTimeout(() => { msg.textContent = ""; }, 4000);
    }

    setStatus(`${name} changes saved. Export Full handling.meta to download the updated file.`, "good");
  }

  function exportSingleVehicleXml() {
    if (!state.entries.length || state.activeProfileIndex < 0) {
      return setStatus("Open a vehicle in the Per-Vehicle Editor first, then export.", "warn");
    }
    const entry = state.entries[state.activeProfileIndex];
    const name = entry.handlingName || "handling";
    const serializer = new XMLSerializer();
    const itemXml = serializer.serializeToString(entry.item);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<CHandlingDataMgr>\n  <HandlingData>\n    ${itemXml}\n  </HandlingData>\n</CHandlingDataMgr>`;
    downloadText(`${name}.meta`, xml, "application/xml");
    setStatus(`Exported ${name}.meta (single vehicle).`, "good");
  }

  function elementToObject(element) {
    const output = {
      tag: element.tagName,
      attributes: Object.fromEntries([...element.attributes].map(attribute => [attribute.name, attribute.value]))
    };
    const children = directChildren(element);
    if (children.length) output.children = children.map(elementToObject);
    else if (element.textContent.trim()) output.text = element.textContent.trim();
    return output;
  }

  function exportJson() {
    if (!state.entries.length) return setStatus("Load a handling.meta file before exporting JSON.", "warn");
    const filename = getJsonExportFilename();
    downloadText(filename, JSON.stringify({
      fileName: state.fileName,
      dlcName: state.dlcName,
      xmlExportName: getXmlExportFilename(),
      exportedAt: new Date().toISOString(),
      profiles: state.entries.map(entry => elementToObject(entry.item))
    }, null, 2), "application/json");
    setStatus(`Exported ${filename}.`, "good");
  }

  async function copyXml() {
    if (!state.xmlDoc) return setStatus("Load a handling.meta file before copying XML.", "warn");
    try {
      await navigator.clipboard.writeText(serializeXml());
      setStatus("Copied edited handling XML to the clipboard.", "good");
    } catch (error) {
      setStatus("Clipboard copy failed. Use Export instead.", "bad");
    }
  }

  function setStatus(message, tone = "warn") {
    const host = el("hmStatus");
    host.className = `hm-status ${tone}`;
    host.textContent = message;
  }

  function setDatabaseStatus(message, tone = "warn") {
    const host = el("hmDatabaseStatus");
    host.className = `hm-database-status ${tone}`;
    host.textContent = message;
  }

  function formatSavedTime(value) {
    if (!value) return "Not saved yet";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Saved";
    return date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function safeStorageSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (error) { return false; }
  }

  function safeStorageRemove(key) {
    try { localStorage.removeItem(key); } catch (error) { /* ignored */ }
  }

  function readFallbackProjects() {
    const raw = safeStorageGet(FALLBACK_PROJECTS_KEY);
    if (!raw) return [];
    try {
      const projects = JSON.parse(raw);
      return Array.isArray(projects) ? projects : [];
    } catch (error) {
      return [];
    }
  }

  function writeFallbackProjects(projects) {
    if (!safeStorageSet(FALLBACK_PROJECTS_KEY, JSON.stringify(projects))) {
      throw new Error("Browser fallback storage is full or unavailable.");
    }
  }

  function openProjectDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB is unavailable."));
      const request = indexedDB.open(PROJECT_DB_NAME, PROJECT_DB_VERSION);
      request.onupgradeneeded = event => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
          const store = database.createObjectStore(PROJECT_STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
        }
      };
      request.onsuccess = event => resolve(event.target.result);
      request.onerror = () => reject(request.error || new Error("Could not open the handling database."));
      request.onblocked = () => reject(new Error("The handling database is blocked by another tab."));
    });
  }

  function getProjectStore(mode = "readonly") {
    if (!projectDatabase) throw new Error("Handling database is not open.");
    return projectDatabase.transaction(PROJECT_STORE_NAME, mode).objectStore(PROJECT_STORE_NAME);
  }

  function projectPut(record) {
    if (state.storageMode === "localstorage") {
      const projects = readFallbackProjects();
      const index = projects.findIndex(project => project.id === record.id);
      if (index >= 0) projects[index] = record;
      else projects.push(record);
      writeFallbackProjects(projects);
      return Promise.resolve(record.id);
    }
    return new Promise((resolve, reject) => {
      const request = getProjectStore("readwrite").put(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function projectGet(id) {
    if (state.storageMode === "localstorage") {
      return Promise.resolve(readFallbackProjects().find(project => project.id === id) || null);
    }
    return new Promise((resolve, reject) => {
      const request = getProjectStore().get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  function projectGetAll() {
    if (state.storageMode === "localstorage") return Promise.resolve(readFallbackProjects());
    return new Promise((resolve, reject) => {
      const request = getProjectStore().getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function projectDelete(id) {
    if (state.storageMode === "localstorage") {
      writeFallbackProjects(readFallbackProjects().filter(project => project.id !== id));
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const request = getProjectStore("readwrite").delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function initializeProjectDatabase() {
    try {
      projectDatabase = await openProjectDatabase();
      state.storageReady = true;
      state.storageMode = "indexeddb";
      if (navigator.storage?.persist) navigator.storage.persist().catch(() => false);
      setDatabaseStatus("Local autosave is ready.", "good");
      await renderSavedProjects();
      return true;
    } catch (error) {
      console.warn("IndexedDB unavailable; using limited local storage.", error);
      const testKey = `${FALLBACK_PROJECTS_KEY}_test`;
      if (safeStorageSet(testKey, "1")) {
        safeStorageRemove(testKey);
        state.storageReady = true;
        state.storageMode = "localstorage";
        setDatabaseStatus("Local autosave is ready with limited browser storage.", "warn");
        await renderSavedProjects();
        return true;
      }
      state.storageReady = false;
      state.storageMode = "none";
      setDatabaseStatus("Local autosave is unavailable. Export before leaving this page.", "bad");
      return false;
    }
  }

  function buildProjectSnapshot() {
    if (!state.xmlDoc) return null;
    const now = new Date().toISOString();
    if (!state.activeProjectId) state.activeProjectId = makeProjectId();
    if (!state.projectCreatedAt) state.projectCreatedAt = now;
    return {
      id: state.activeProjectId,
      dlcName: state.dlcName.trim(),
      sourceFileName: state.fileName || "handling.meta",
      xmlText: serializeXml(),
      profileCount: state.entries.length,
      activeProfileIndex: state.activeProfileIndex,
      createdAt: state.projectCreatedAt,
      updatedAt: now
    };
  }

  async function saveCurrentProject(options = {}) {
    const silent = options.silent === true;
    if (!state.xmlDoc) {
      if (!silent) setStatus("Load a handling.meta file before saving it.", "warn");
      return false;
    }
    if (!state.storageReady && !(await initializeProjectDatabase())) return false;

    const snapshot = buildProjectSnapshot();
    try {
      await projectPut(snapshot);
      state.lastSavedAt = snapshot.updatedAt;
      safeStorageSet(LAST_ACTIVE_PROJECT_KEY, snapshot.id);
      setDatabaseStatus(`Saved locally ${formatSavedTime(snapshot.updatedAt)}.`, "good");
      await renderSavedProjects();
      if (!silent) setStatus(`Saved ${state.dlcName || state.fileName} to the local handling database.`, "good");
      return true;
    } catch (error) {
      console.error("Could not save handling project.", error);
      setDatabaseStatus("Autosave failed. Export before leaving this page.", "bad");
      if (!silent) setStatus("The current file could not be saved locally.", "bad");
      return false;
    }
  }

  function scheduleAutosave(delay = AUTOSAVE_DELAY) {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => saveCurrentProject({ silent: true }), delay);
  }

  async function renderSavedProjects() {
    const host = el("hmSavedProjects");
    if (!state.storageReady) {
      host.innerHTML = `<div class="hm-saved-empty">Local saved files are unavailable.</div>`;
      return;
    }
    try {
      const projects = (await projectGetAll()).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      if (!projects.length) {
        host.innerHTML = `<div class="hm-saved-empty">No saved handling.meta files yet.</div>`;
        return;
      }
      host.innerHTML = projects.map(project => {
        const name = project.dlcName || project.sourceFileName || "handling.meta";
        return `
          <div class="hm-saved-project ${project.id === state.activeProjectId ? "active" : ""}">
            <div class="hm-saved-project-copy">
              <strong title="${escapeHTML(name)}">${escapeHTML(name)}</strong>
              <small>${Number(project.profileCount || 0).toLocaleString()} profiles · ${escapeHTML(formatSavedTime(project.updatedAt))}</small>
            </div>
            <div class="hm-saved-project-actions">
              <button type="button" data-hm-load-project="${escapeHTML(project.id)}">Load</button>
              <button class="secondary" type="button" data-hm-delete-project="${escapeHTML(project.id)}">Delete</button>
            </div>
          </div>`;
      }).join("");
    } catch (error) {
      host.innerHTML = `<div class="hm-saved-empty">Saved files could not be listed.</div>`;
    }
  }

  async function loadSavedProject(id) {
    const project = await projectGet(id);
    if (!project) return setStatus("That saved handling file could not be found.", "bad");
    state.activeProjectId = project.id;
    state.projectCreatedAt = project.createdAt || new Date().toISOString();
    state.lastSavedAt = project.updatedAt || "";
    const loaded = parseHandling(project.xmlText, project.sourceFileName || "handling.meta", {
      keepProjectIdentity: true,
      dlcName: project.dlcName || "",
      skipAutosave: true
    });
    if (!loaded) return;
    state.activeProfileIndex = Math.min(state.entries.length - 1, Math.max(0, Number(project.activeProfileIndex) || 0));
    populateProfileSelect();
    renderProfileEditor();
    renderTable();
    safeStorageSet(LAST_ACTIVE_PROJECT_KEY, project.id);
    setDatabaseStatus(`Loaded saved file from ${formatSavedTime(project.updatedAt)}.`, "good");
    await renderSavedProjects();
  }

  async function deleteSavedProject(id) {
    const projects = await projectGetAll();
    const project = projects.find(item => item.id === id);
    const label = project?.dlcName || project?.sourceFileName || "this saved file";
    if (!window.confirm(`Delete ${label} from the local handling database?`)) return;
    await projectDelete(id);
    if (state.activeProjectId === id) {
      state.activeProjectId = makeProjectId();
      state.projectCreatedAt = new Date().toISOString();
      safeStorageRemove(LAST_ACTIVE_PROJECT_KEY);
      setDatabaseStatus("The saved copy was deleted. The open file remains available until you leave or save again.", "warn");
    }
    await renderSavedProjects();
  }

  async function restoreLastProject() {
    const id = safeStorageGet(LAST_ACTIVE_PROJECT_KEY);
    if (!id) return;
    try {
      const project = await projectGet(id);
      if (project) await loadSavedProject(id);
      else safeStorageRemove(LAST_ACTIVE_PROJECT_KEY);
    } catch (error) {
      console.warn("Could not restore last handling project.", error);
    }
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => parseHandling(event.target.result, file.name);
    reader.onerror = () => setStatus(`Could not read ${file.name}.`, "bad");
    reader.readAsText(file);
  }

  function setupEvents() {
    const dropZone = el("hmDropZone");
    const picker = el("hmFilePicker");

    dropZone.addEventListener("click", () => picker.click());
    dropZone.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") picker.click();
    });
    picker.addEventListener("change", event => handleFile(event.target.files?.[0]));

    ["dragenter", "dragover"].forEach(name => {
      dropZone.addEventListener(name, event => {
        event.preventDefault();
        dropZone.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach(name => {
      dropZone.addEventListener(name, event => {
        event.preventDefault();
        dropZone.classList.remove("drag-over");
      });
    });
    dropZone.addEventListener("drop", event => handleFile(event.dataTransfer.files?.[0]));

    ["hmSearch", "hmAiFilter", "hmAiSort", "hmSubTypeFilter", "hmClassFilter"].forEach(id => {
      el(id)?.addEventListener("input", applyFilters);
      el(id)?.addEventListener("change", applyFilters);
    });

    el("hmTableBody").addEventListener("click", event => {
      const adjust = event.target.closest("[data-hm-adjust]");
      if (adjust) {
        adjustNumericControl(adjust);
        return;
      }
      const edit = event.target.closest("[data-hm-edit-index]");
      if (edit) openProfile(Number(edit.dataset.hmEditIndex));
    });

    el("hmTableBody").addEventListener("change", event => {
      const selection = event.target.closest("[data-hm-select-index]");
      if (selection) {
        const entry = state.entries[Number(selection.dataset.hmSelectIndex)];
        if (selection.checked) state.selectedKeys.add(entry.key);
        else state.selectedKeys.delete(entry.key);
        renderTable();
        updateStats();
        return;
      }

      const input = event.target.closest("[data-hm-table-field]");
      if (input) updateTableField(Number(input.dataset.hmTableIndex), input.dataset.hmTableField, input.value);
    });

    el("hmSelectAllVisible").addEventListener("change", event => selectVisible(event.target.checked));
    el("hmRunAnalyzer").addEventListener("click", () => runAnalyzer(true));

    el("hmDlcName").addEventListener("input", event => {
      state.dlcName = event.target.value;
      updateExportFilenamePreview();
      scheduleAutosave();
    });

    el("hmProfileSelect").addEventListener("change", event => {
      state.activeProfileIndex = Number(event.target.value);
      populateProfileSelect();
      renderTable();
      renderProfileEditor();
    });

    el("hmTableProfileSelect").addEventListener("change", event => {
      if (event.target.value === "") return;
      focusTableProfile(Number(event.target.value));
    });

    el("hmOpenTableProfile").addEventListener("click", () => {
      const value = el("hmTableProfileSelect").value;
      if (value === "") return setStatus("Choose a handling name first.", "warn");
      openProfile(Number(value));
    });

    el("hmProfileEditor").addEventListener("click", event => {
      const adjust = event.target.closest("[data-hm-adjust]");
      if (adjust) adjustNumericControl(adjust);
    });

    el("hmProfileEditor").addEventListener("change", event => {
      const input = event.target.closest("[data-hm-scope]");
      if (input) updateProfileField(input);
    });

    el("hmPreviousProfile").addEventListener("click", () => moveProfile(-1));
    el("hmNextProfile").addEventListener("click", () => moveProfile(1));
    el("hmBackToTable").addEventListener("click", () => openTab("table"));

    el("hmSavedProjects").addEventListener("click", event => {
      const load = event.target.closest("[data-hm-load-project]");
      if (load) loadSavedProject(load.dataset.hmLoadProject);
      const remove = event.target.closest("[data-hm-delete-project]");
      if (remove) deleteSavedProject(remove.dataset.hmDeleteProject);
    });

    document.querySelectorAll("[data-hm-tab]").forEach(button => {
      button.addEventListener("click", () => openTab(button.dataset.hmTab));
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && state.xmlDoc) saveCurrentProject({ silent: true });
    });
    window.addEventListener("pagehide", () => {
      if (state.xmlDoc) saveCurrentProject({ silent: true });
    });
  }

  async function init() {
    setupQuickEditFields();
    setupEvents();
    updateStats();
    updateExportFilenamePreview();
    const ready = await initializeProjectDatabase();

    const params = new URLSearchParams(window.location.search);
    const handlingId = params.get("handlingId");
    if (handlingId) {
      await loadFromCloud(handlingId);
    } else if (ready) {
      await restoreLastProject();
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    applyQuickEdit,
    selectVisible,
    clearAllSelections,
    runAnalyzer,
    saveCurrentProject,
    exportXml,
    saveActiveProfile,
    exportSingleVehicleXml,
    exportJson,
    copyXml,
    openProfile,

    // Cloud Projects API (used by handling-meta-cloud-save.js)
    hasContent: () => Boolean(state.xmlDoc),
    getCloudPayload: () => {
      if (!state.xmlDoc) return null;
      return {
        format: "gta-traffic-handling-meta-cloud-project",
        version: 1,
        savedAt: new Date().toISOString(),
        projectType: "handling-meta",
        dlcName: state.dlcName || "",
        fileName: state.fileName || "handling.meta",
        xmlText: serializeXml(),
        profileCount: state.entries.length,
        profileNames: state.entries.map(e => e.key || e.handlingName || "")
      };
    },
    applyCloudProject: (data) => {
      if (!data?.xmlText) throw new Error("Cloud project has no XML content.");
      parseHandling(data.xmlText, data.fileName || "handling.meta", {
        dlcName: data.dlcName || ""
      });
    }
  };
})();
