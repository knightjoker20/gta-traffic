// =====================================================
// [DATA: POPCYCLE_VISUAL_MAP_CONFIG]
// Map layers and coordinate transforms used by the
// Popcycle Visual Map Editor.
//
// Coordinate transforms were calibrated against the
// existing Area Explorer city/county maps so existing
// schedule markers remain useful on the new reference maps.
//
// The Regional Sections and Patrol Districts maps are
// reference artwork. Their colored boundaries are not
// official Rockstar Popcycle polygons.
// =====================================================

window.GTATrafficVisualMapConfig = {
  defaultLayer: "auto",

  layers: [
    {
      id: "auto",
      title: "Auto",
      shortTitle: "Auto",
      description:
        "Uses the full San Andreas overview on the left while the focused city or county map updates on the right.",
      dynamic: true
    },
    {
      id: "full",
      title: "Full San Andreas",
      shortTitle: "San Andreas",
      description:
        "Clean full-island navigation map used as the main interactive overview.",
      source: "assets/area-maps/overview.jpg",
      width: 1920,
      height: 1920,
      markerMode: "all",
      transforms: {
        city: [
          [0.985524831, -0.000041912, -239.237920],
          [-0.000075153, 0.983376494, 2.033220],
          [0.000000613, -0.000000164, 1]
        ],
        county: [
          [0.985524831, -0.000041912, -239.237920],
          [-0.000075153, 0.983376494, 2.033220],
          [0.000000613, -0.000000164, 1]
        ]
      }
    },
    {
      id: "districts",
      title: "Los Santos Districts",
      shortTitle: "City Districts",
      description:
        "Clean Los Santos street map without colored district fills. Used as an optional main-map layer and as the automatic focused city reference.",
      source: "assets/area-maps/city.png",
      width: 1450,
      height: 1799,
      markerMode: "city",
      markerOverrides: {
        CYPRESS_FLATS: [575, 520],
        EL_BURRO: [700, 438],
        LA_MESA: [575, 332],
        MIRROR_PARK: [680, 225]
      },
      transforms: {
        city: [
          [1.185891660, 0.000176853, -604.750006],
          [0.000087654, 1.185881610, -1417.933030],
          [0.000000077, 0.000000308, 1]
        ]
      }
    },
    {
      id: "regions",
      title: "Regional Sections",
      shortTitle: "Regions",
      description:
        "Broad 1000s–10000s regional reference. Useful for orientation, but not an official Popcycle boundary map.",
      source: "assets/area-maps/regional-sections.png",
      width: 1365,
      height: 2048,
      markerMode: "all",
      transforms: {
        city: [
          [0.985524831, -0.000041912, -239.237920],
          [-0.000075153, 0.983376494, 2.033220],
          [0.000000613, -0.000000164, 1]
        ],
        county: [
          [0.985524831, -0.000041912, -239.237920],
          [-0.000075153, 0.983376494, 2.033220],
          [0.000000613, -0.000000164, 1]
        ]
      }
    },
    {
      id: "patrol",
      title: "LSSD Patrol Districts",
      shortTitle: "Patrol Districts",
      description:
        "Law-enforcement patrol-district reference. District boxes do not directly equal Popcycle schedule boundaries.",
      source: "assets/area-maps/patrol-districts.png",
      width: 1475,
      height: 2047,
      markerMode: "none",
      transforms: {}
    }
  ]
};

// [END DATA: POPCYCLE_VISUAL_MAP_CONFIG]
