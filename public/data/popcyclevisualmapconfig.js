// =====================================================
// [DATA: POPCYCLE_VISUAL_MAP_CONFIG]
// Map layer used by the Popcycle Visual Map Editor.
//
// 2026-07-06: Simplified to a single shared reference map
// (the community GTA V neighborhood map) instead of the old
// multi-layer system with per-layer transform matrices. Area
// pin positions in popcycleareamapdata.js are plain pixel
// coordinates on this one image - no matrix math needed.
// Positions are approximate (hand-drawn community art, not an
// official Rockstar coordinate render). Use "Edit Positions"
// on the map toolbar to drag any marker into a better spot;
// "Export Positions" downloads the adjusted coordinates as
// JSON so they can be folded back into the site permanently.
// =====================================================

window.GTATrafficVisualMapConfig = {
  defaultLayer: "full",

  layers: [
    {
      id: "full",
      title: "GTA V Neighborhood Map",
      shortTitle: "Map",
      description:
        "Community neighborhood/jurisdiction reference map (TreeFitty/igta). Approximate positions - drag markers in Edit Positions mode to fine-tune.",
      source: "assets/area-maps/gta5map2-1600.jpg",
      width: 1600,
      height: 1600,
      markerMode: "all"
    }
  ]
};

// [END DATA: POPCYCLE_VISUAL_MAP_CONFIG]
