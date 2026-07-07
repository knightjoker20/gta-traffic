// =====================================================
// [DATA: POPCYCLE_VISUAL_MAP_CONFIG]
// Map background styles for the Popcycle Visual Map Editor.
//
// 2026-07-07: Added a "Map Style" switcher - the same schedule
// pins/custom dots/outlines now render on top of 3 swappable
// background images (Atlas / Road Map / Satellite) instead of
// just one. All stored coordinates (pins, marker overrides,
// custom dots, outline points) live in one shared REFERENCE
// pixel space (referenceWidth x referenceHeight below, matching
// the original Atlas map). Each layer's own width/height is used
// to scale that reference space onto whatever the actual image's
// pixel dimensions turn out to be - so the road/satellite maps
// don't need to be recalibrated by hand, just proportionally
// close in framing to the Atlas map. loadPopcycleMapImages() in
// popcycleareamap.js overwrites width/height with the real
// loaded image size automatically, so the values below are only
// a best-guess placeholder used before the image finishes loading.
//
// 2026-07-07: Corrected filenames to match what was actually added
// to public/assets/area-maps/ - GTAV_ROADMAP_1920x1920.png (road
// map) and satellitemap-1920x1920.jpg (satellite - the pre-sized
// 1.1MB version, not the 15MB satellitemap.jpg full-res original,
// which is far too large to serve on every page load).
//
// 2026-07-06: Simplified to a single shared reference map
// (the community GTA V neighborhood map) instead of the old
// multi-layer system with per-layer transform matrices. Area
// pin positions in popcycleareamapdata.js are plain pixel
// coordinates in the reference space - no matrix math needed.
// Positions are approximate (hand-drawn community art, not an
// official Rockstar coordinate render). Use "Edit Positions"
// on the map toolbar to drag any marker into a better spot;
// "Export Positions" downloads the adjusted coordinates as
// JSON so they can be folded back into the site permanently.
// =====================================================

window.GTATrafficVisualMapConfig = {
  defaultLayer: "full",

  // Shared coordinate space that every pin/override/custom-dot/
  // outline point is stored in, regardless of which map style is
  // showing. Matches the Atlas map's real pixel size.
  referenceWidth: 1600,
  referenceHeight: 1600,

  layers: [
    {
      id: "full",
      title: "Atlas Map",
      shortTitle: "Atlas",
      description:
        "Community neighborhood/jurisdiction reference map (TreeFitty/igta). Approximate positions - drag markers in Edit Positions mode to fine-tune.",
      source: "assets/area-maps/gta5map2-1600.jpg",
      width: 1600,
      height: 1600,
      markerMode: "all"
    },
    {
      id: "roadmap",
      title: "Road Map",
      shortTitle: "Roads",
      description:
        "Dark road-network reference map. Same schedule pins as the Atlas map, scaled onto this image.",
      source: "assets/area-maps/GTAV_ROADMAP_1920x1920.png",
      width: 1920,
      height: 1920,
      markerMode: "all"
    },
    {
      id: "satellite",
      title: "Satellite Map",
      shortTitle: "Satellite",
      description:
        "Satellite-style reference map. Same schedule pins as the Atlas map, scaled onto this image.",
      source: "assets/area-maps/satellitemap-1920x1920.jpg",
      width: 1920,
      height: 1920,
      markerMode: "all"
    }
  ]
};

// [END DATA: POPCYCLE_VISUAL_MAP_CONFIG]
