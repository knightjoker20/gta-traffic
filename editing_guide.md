# GTA-Traffic.com Editing Guide — Popcycle Visual Editor 1.3.0

Use stable section and module markers instead of relying only on line numbers. Current line ranges are listed in `FILE_MAP.md`.

## Visual map layers and calibration

File:

```text
data/popcycleVisualMapConfig.js
```

Marker:

```text
[DATA: POPCYCLE_VISUAL_MAP_CONFIG]
```

This file controls map names, asset paths, dimensions, marker modes, coordinate transforms, and manual marker overrides. Keep the warning that Regional Sections and Patrol Districts are references rather than official Popcycle boundaries.

Map image files:

```text
assets/area-maps/san-andreas-full.png
assets/area-maps/los-santos-districts.png
assets/area-maps/regional-sections.png
assets/area-maps/patrol-districts.png
```

## Map interactions

File:

```text
js/popcycle/popcycleAreaMap.js
```

Important markers:

```text
[MODULE: POPCYCLE_AREA_MAP]
[SECTION: VISUAL_MAP_LAYER_CONTROLS]
[SECTION: VISUAL_MAP_INTERACTIONS]
[SECTION: MAP_CLICK_SCHEDULE_SELECTION]
```

This module controls automatic layer selection, image loading, zoom, pan, reset, fullscreen, marker rendering, marker hit testing, schedule selection, and the manual area override dropdown.

Map clicks must select schedules. They must not silently create manual area overrides.

## Batch time-slot and vehicle-group editing

File:

```text
js/popcycle/popcycleBatchEditor.js
```

Marker:

```text
[MODULE: POPCYCLE_BATCH_EDITOR]
```

This module controls checked time rows, Night/Day/Evening shortcuts, vehicle-group Add/Update/Remove actions, Apply to All 12 Hours, optional total-weight preservation, and police presets.

Police presets must update both:

```text
percentCopCars / percentCopPeds
VEH_COPCAR group weight
```

## Popcycle workspace autosave

File:

```text
js/popcycle/popcycleWorkspace.js
```

Marker:

```text
[MODULE: POPCYCLE_WORKSPACE]
```

Database:

```text
gtaTrafficStudioDB
```

Object store:

```text
workspace
```

Record keys:

```text
popcycleVisualWorkspace
recentPopgroupsProject
```

This module controls autosave, restore, JSON backup import/export, saved Popgroups group references, and clear-workspace behavior.

## Shared main-site backup

File:

```text
js/workspaceStorage.js
```

The main homepage workspace backup includes the optional `popcycleVisualWorkspace` record. Preserve backward compatibility with backups that do not contain Popcycle data.

## Popcycle page structure

File:

```text
popcycle.html
```

Important markers:

```text
[SECTION: POPCYCLE_FILE_CONTROLS]
[SECTION: POPCYCLE_VISUAL_MAP]
[SECTION: POPCYCLE_BATCH_EDITOR]
[SECTION: POPCYCLE_SCHEDULE_EDITOR]
```

Keep the centered hero and the shared tool menu.

## Styling

File:

```text
css/popcycle.css
```

Important markers:

```text
[SECTION: POPCYCLE_VISUAL_MAP]
[SECTION: POPCYCLE_BATCH_EDITOR]
[SECTION: POPCYCLE_WORKSPACE_STATUS]
```

## Update workflow

1. Start from the user's current site ZIP/RAR.
2. Inspect the current affected files before editing.
3. Change only the required modules or marked sections.
4. Preserve accepted styling and previous functionality.
5. Run `node --check` on every JavaScript file.
6. Check HTML script references and duplicate IDs.
7. Check CSS brace balance.
8. Update `CHANGELOG.md`, `INSTALLATION.md`, and `FILE_MAP.md`.
9. Return a clearly labeled update package and a separate recovery full-site package.
