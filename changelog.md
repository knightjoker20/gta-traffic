## Vehicle Library V1.3

- Added an Installed File Scanner to the Vehicle Library.
- Drag or browse large batches of `.yft` and `.ytd` files to toggle matching vehicles installed/uninstalled.
- `_hi.yft` files resolve to their base model and duplicate files in the same batch only toggle a vehicle once.
- Added scan summaries for installed, uninstalled, unmatched, and total files.
- Records the last matched filenames and scan timestamp without attempting to read protected local file paths.

## Vehicle Library V1.2.1
- Added a prominent Install Vehicle / Installed toggle next to Favorite on vehicle detail pages.
- Kept the Library Details installed checkbox synchronized with the new button.
- Installed date is automatically populated when first marked installed.

# Vehicle Library V1.2 / Vehicle.meta V1.6

- Added `identicalModelSpawnDistance` to the Vehicle.meta table, Quick Edit, analyzer, search, import/export, and Vehicle Library details.
- Popgroups vehicle cards now open the matching Vehicle Library detail page in a new tab.
- Existing card buttons and drag-and-drop behavior remain active.

# GTA Traffic Studio Changelog

## Vehicle Library V1.0
- Added a dedicated visual Vehicle Library page matching the existing GTA Traffic design.
- Imports and merges Popgroups, vehicles.meta, and handling.meta data in a persistent browser database.
- Added searchable cards, category and AI filters, favorites, sorting, pagination, grid/list views, and random vehicle selection.
- Added a separate saved detail page for every vehicle.
- Vehicle detail pages show parsed vehicle metadata, Popgroups membership, linked handling summaries, and import-source filenames.
- Added saved custom fields for Rockstar DLC/update, source pack, install type, replacement slot, DLC/RPF path, YFT/YFT_hi/YTD locations, meta locations, URL, tags, notes, and a custom screenshot.
- Added JSON backup/import for the complete Vehicle Library database.

# Changelog

## 1.3.0 — Popcycle Visual Map Editor — 2026-06-07

- Added a unified Visual Popcycle Map Editor with four selectable map modes: Auto, Full San Andreas, Los Santos Districts, Regional Sections, and Patrol Districts.
- Added the uploaded high-resolution full-island, city-district, regional-section, and patrol-district reference maps as separate editable assets.
- Added mouse-wheel zoom, zoom buttons, click-and-drag panning, Fit Map, Focus Selected, Reset View, and fullscreen controls.
- Preserved marker-click schedule selection: clicking a mapped area selects the best matching Popcycle schedule, clears filters when required, and scrolls the active schedule into view.
- Kept manual schedule-to-area overrides restricted to the override dropdown.
- Added time-slot checkboxes with All, None, Night, Day, and Evening selection shortcuts.
- Added batch vehicle-group actions for selected hours: Add/Update, Remove, and Apply to All 12 Hours.
- Added optional rebalancing that reduces the largest normal traffic group when a new group is added so the row's total vehicle weight stays stable.
- Updated police presets so they change both police percentages and the `VEH_COPCAR` group weight for the checked hours.
- Added IndexedDB autosave for the Popcycle DAT, edited schedules, group weights, police settings, selected hours, map layer, zoom/pan state, area overrides, and current UI state.
- Added Save Workspace Now, Export Workspace, Import Workspace, Refresh Popgroups Groups, and Clear Saved Workspace controls.
- Connected the Popcycle editor to the installed Popgroups workspace so saved pedestrian and vehicle group names can be reused as suggestions.
- Added the Popcycle workspace to the main site's full workspace backup and restore process.
- Kept DAT and XML installation safe: the website saves browser workspaces but does not silently overwrite files in the GTA installation.
- Added stable section/module markers and updated the file map and editing documentation.

## Saved Workspace Update — 2026-06-08

- Added IndexedDB storage for parsed `vehicles.meta` data.
- Added automatic restoration of imported meta filenames and metadata records.
- Added automatic saving and restoration of the most recent Popgroups project.
- Saved edited group contents, current Vehicles/Peds section, open groups, and search text.
- Added active pack, image mode, and search-state restoration.
- Added Save Now, portable workspace backup export/import, and clear-cache controls.
- Preserved the existing Pack DB and Vehicle Asset DB storage systems.
- Added status cards showing cached metadata count, recent project, last save, and storage mode.

## 1.0.0 — 2026-06-07

- Added a separate `popcycle.html` page.
- Added shared site navigation with Popgroups first and Popcycle second.
- Embedded GTA V vanilla Popcycle as **Stock Traffic**.
- Added **Traffic Redline** as the aggressive modded comparison reference.
- Added twelve AM/PM time periods with friendly names.
- Added editing for all ten numeric Popcycle fields.
- Added Stock Traffic, Street+, City Pulse, Rush Hour, and Traffic Redline presets.
- Added schedule search and filters.
- Added undo and redo.
- Added browser-local draft autosave and restoration.
- Added validation that blocks export on structural errors.
- Added warnings for values beyond Traffic Redline and major time spikes.
- Added original-file backup and JSON change-report downloads.
- Added safe export that rewrites only modified source rows.
- Added stable section/module markers throughout all new files.
- Added installation and editing documentation.

## Planned for 1.1

- Direct pedestrian-group editing.
- Direct vehicle-group editing.
- Weight normalization.
- Popgroups group-name validation.
- Population curve graph.
- Streaming-risk integration with Vehicle Library and LOD data.

## Vehicle.meta Editor V1.1 — June 9, 2026
- Expanded the vehicle table to use readable, field-specific column widths.
- Added horizontal scrolling for the full vehicle row instead of compressing values.
- Added full-value hover titles to editable cells.
- Added Quick Bulk Edit controls directly above the vehicle table.
- Added explicit Apply to Selected, Apply to Visible, and Apply to All Rows buttons.
- Added confirmation before changing every vehicle row.
- Improved the select-all checkbox with checked and partial-selection states.

## Vehicle.meta Editor V1.3 — June 9, 2026
- Removed the flags column from the vehicle table.
- Removed the standalone Flag Editor and all flag-related analyzer warnings.
- Removed the separate Bulk Editor tab.
- Kept the compact Quick Edit controls above the table for selected, visible, or all-row changes.
- Reduced the table width now that the large flags column is gone.
- Existing `<flags>` values remain untouched in imported and exported XML.
## Vehicle.meta Editor V1.4 — June 9, 2026
- Removed the fixed 680-pixel table height so all loaded vehicle rows expand vertically on the page.
- Kept horizontal scrolling for the wide vehicle field set.
- Fixed the Vehicle Table and Analyzer controls so they behave as true tabs.
- Added active-tab styling and accessibility state updates.
- Connected the Run Analyzer button through the page event system.
- Expanded analyzer checks for duplicate model names, missing core fields, blank traffic values, and invalid negative or non-numeric traffic values.
- Analyzer results now refresh automatically after individual row edits and Quick Edit changes.
- Fixed direct editing of the `swankness` field.


## Vehicle.meta Editor V1.5 — June 9, 2026
- Added a browser-local Saved Files database for vehicle.meta projects.
- Imported files now autosave after loading, individual edits, Quick Edit changes, and DLC-name changes.
- The most recently active vehicle.meta file restores automatically when returning to the page.
- Added Load and Delete controls for saved vehicle.meta projects.
- Added a manual DLC / Meta Name field for organization.
- Named exports use the format `<DLC_NAME>_vehicles.meta`.
- Blank DLC names export as the standard `vehicles.meta` filename.
- Added a limited localStorage fallback when IndexedDB is unavailable.

## Handling.meta Editor V1.0
- Added a standalone Handling.meta tool linked from the shared Tools Menu.
- Added drag-and-drop import, local saved-file database, automatic restore, DLC naming, XML/JSON export, and analyzer.
- Added a compact handling table with quick editing for selected, visible, or all profiles.
- Added a per-vehicle/profile editor for every standard handling field, vector value, advanced value, and SubHandlingData entry.
- Handling profiles are selected by handlingName, which corresponds to handlingId in vehicles.meta.
## Handling.meta Editor V1.1 — June 10, 2026
- Added an alphabetically grouped Handling Name selector above the table for quickly choosing any profile in the loaded file.
- Added an Open Per-Vehicle Editor action that drills directly into the selected handling profile.
- Added minus and plus adjustment buttons to numeric values in both the handling table and complete per-vehicle editor.
- Added field-aware adjustment increments while preserving the original number of decimal places.
- Replaced AIHandling text cells with dropdown selectors using the AI handling values found in the file plus the standard AVERAGE, SPORTS_CAR, TRUCK, and CRAP options.
- Added AI Handling A–Z and Z–A sorting while retaining the existing AI filter.
- Added a fixed maximum table height with vertical and horizontal scrollbars and sticky column headers for large handling files.


## Vehicle Library V1.1
- Added per-vehicle Installed in Current GTA Game status.
- Added installed badge and quick toggle on each vehicle card.
- Added Installed Vehicles sidebar category with live count.
- Added Installed / Not Installed filtering and sorting.
- Added installed count to Library Stats.
- Added installed game version and install date fields to vehicle details.
- Installed status is retained in browser storage and library JSON backups.
