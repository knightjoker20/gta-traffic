# File Map

Line ranges are current for Version 1.3.0.
Use stable marker names because line numbers move after edits.

## `popcycle.html`

- `SECTION: POPCYCLE_STYLESHEETS` — lines 15–22
- `SECTION: SITE_HEADER` — lines 28–45
- `SECTION: SHARED_TOOL_MENU_HOST` — lines 48–52
- `SECTION: POPCYCLE_HERO` — lines 55–78
- `SECTION: POPCYCLE_FILE_CONTROLS` — lines 83–225
- `SECTION: POPCYCLE_SCHEDULE_BROWSER` — lines 234–270
- `SECTION: POPCYCLE_VISUAL_MAP_EDITOR` — lines 315–455
- `SECTION: POPCYCLE_BATCH_EDITOR_HOST` — lines 458–462
- `SECTION: POPCYCLE_SCHEDULE_EDITOR` — lines 273–524
- `SECTION: POPCYCLE_WORKSPACE` — lines 228–526
- `SECTION: POPCYCLE_VALIDATION_PANEL` — lines 529–536
- `SECTION: POPCYCLE_SCRIPTS` — lines 541–564

## `css/popcycle.css`

- `SECTION: POPCYCLE_PAGE_LAYOUT` — lines 2–86
- `SECTION: POPCYCLE_WORKSPACE` — lines 89–184
- `SECTION: POPCYCLE_PRESETS` — lines 187–262
- `SECTION: POPCYCLE_TABLE` — lines 265–477
- `SECTION: POPCYCLE_POPULATION_MIX` — lines 511–628
- `SECTION: POPCYCLE_GROUP_PREVIEW` — lines 480–630
- `SECTION: POPCYCLE_VALIDATION` — lines 633–685
- `SECTION: POPCYCLE_RESPONSIVE` — lines 688–732
- `SECTION: POPCYCLE_AREA_MAP` — lines 736–912
- `SECTION: POPCYCLE_GROUP_EDITOR` — lines 915–1037
- `SECTION: POPCYCLE_VISUAL_MAP_EDITOR_V13` — lines 1067–1315
- `SECTION: POPCYCLE_BATCH_EDITOR_V13` — lines 1318–1471
- `SECTION: POPCYCLE_WORKSPACE_STATUS_V13` — lines 1474–1523

## `data/popcycleVisualMapConfig.js`

- `DATA: POPCYCLE_VISUAL_MAP_CONFIG` — lines 2–112

## `data/popcycleAreaMapData.js`

- `DATA: POPCYCLE_AREA_MAP_DATA` — lines 2–1619

## `js/workspaceStorage.js`

- `SECTION: INDEXEDDB_CORE` — lines 37–169
- `SECTION: WORKSPACE_SNAPSHOTS` — lines 172–224
- `SECTION: WORKSPACE_SAVE` — lines 227–377
- `SECTION: WORKSPACE_RESTORE` — lines 380–560
- `SECTION: WORKSPACE_BACKUP` — lines 563–700
- `SECTION: WORKSPACE_CLEAR` — lines 703–779
- `SECTION: WORKSPACE_STATUS` — lines 782–854
- `MODULE: WORKSPACE_STORAGE` — lines 2–856

## `js/popcycle/popcycleApp.js`

- `MODULE: POPCYCLE_APP` — lines 2–91

## `js/popcycle/popcycleAreaMap.js`

- `SECTION: VISUAL_MAP_INITIALIZATION` — lines 62–212
- `SECTION: AREA_NAME_MATCHING` — lines 215–339
- `SECTION: AREA_OVERRIDE_CONTROLS` — lines 342–439
- `SECTION: MAP_LAYER_CONTROLS` — lines 442–721
- `SECTION: MAP_RENDERING` — lines 724–1402
- `SECTION: MAP_POINTER_INTERACTIONS` — lines 1405–1570
- `SECTION: MAP_SCHEDULE_SELECTION` — lines 1573–1746
- `MODULE: POPCYCLE_VISUAL_AREA_MAP` — lines 2–1748

## `js/popcycle/popcycleBatchEditor.js`

- `MODULE: POPCYCLE_BATCH_EDITOR` — lines 2–663

## `js/popcycle/popcycleEditor.js`

- `MODULE: POPCYCLE_GROUP_EDITOR` — lines 535–1104
- `MODULE: POPCYCLE_EDITOR` — lines 2–1106

## `js/popcycle/popcycleExport.js`

- `MODULE: POPCYCLE_EXPORT` — lines 2–210

## `js/popcycle/popcycleGroupDescriptions.js`

- `MODULE: POPCYCLE_GROUP_DESCRIPTIONS` — lines 2–287

## `js/popcycle/popcycleParser.js`

- `MODULE: POPCYCLE_PARSER` — lines 2–202

## `js/popcycle/popcycleReferences.js`

- `MODULE: POPCYCLE_REFERENCES` — lines 2–234

## `js/popcycle/popcycleRender.js`

- `MODULE: POPCYCLE_RENDER` — lines 2–1135

## `js/popcycle/popcycleState.js`

- `MODULE: POPCYCLE_STATE` — lines 2–157

## `js/popcycle/popcycleValidation.js`

- `MODULE: POPCYCLE_VALIDATION` — lines 2–225

## `js/popcycle/popcycleWorkspace.js`

- `SECTION: POPCYCLE_INDEXEDDB_CORE` — lines 36–216
- `SECTION: POPCYCLE_WORKSPACE_SNAPSHOT` — lines 219–281
- `SECTION: POPCYCLE_WORKSPACE_SAVE` — lines 284–352
- `SECTION: POPCYCLE_WORKSPACE_RESTORE` — lines 355–599
- `SECTION: INSTALLED_POPGROUPS_REFERENCE` — lines 602–669
- `SECTION: POPCYCLE_WORKSPACE_BACKUP` — lines 672–807
- `SECTION: POPCYCLE_WORKSPACE_STATUS` — lines 810–890
- `MODULE: POPCYCLE_WORKSPACE` — lines 2–892

### Handling.meta Editor
- `handling-meta.html` — Handling table, per-profile editor, analyzer, database, and export interface.
- `css/handling-meta.css` — Handling.meta editor layout and responsive styles.
- `js/handlingMetaEditor.js` — Handling XML parsing, editing, subhandling editor, persistence, analysis, and export.

## Vehicle Library V1.0 files

### `vehicle-library.html`
- Dedicated searchable Vehicle Library page.
- Imports Popgroups, vehicles.meta, and handling.meta sources.
- Includes category filters, AI filters, sorting, favorites, pagination, and library backup controls.

### `vehicle-details.html`
- Per-vehicle detail page selected by the `?model=` URL parameter.
- Shows parsed vehicle metadata, handling summary, Popgroups memberships, source files, custom images, paths, DLC information, tags, and notes.

### `css/vehicle-library.css`
- Shared Vehicle Library and Vehicle Details page styles.

### `js/vehicleLibraryStore.js`
- Shared IndexedDB database used by both Vehicle Library pages.

### `js/vehicleLibrary.js`
- Source-file parsers, record merging, filters, card rendering, backup/import, and library navigation.

### `js/vehicleDetails.js`
- Vehicle detail rendering, custom-field autosave, image storage, handling summaries, and previous/next navigation.
