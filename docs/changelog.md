# Changelog

## 1.6.0 — Vehicle Library V1.0 — 2026-06-10

- Added a dedicated Vehicle Library page matching the GTA Traffic dark/orange site design.
- Added persistent browser storage for merged Popgroups, vehicles.meta, and handling.meta information.
- Added a separate detail URL for each vehicle with parsed metadata, handling summaries, Popgroups memberships, and source filenames.
- Added saved fields for Rockstar DLC/update, source pack, install type, replacement slot, RPF/DLC folder, YFT/YFT_hi/YTD locations, meta locations, download URL, tags, notes, favorite status, and custom screenshots.
- Added filtering, categories, AI sorting/filtering, grid/list views, pagination, random vehicle selection, and full JSON backup/import.

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

## 1.2.0 — 2026-06-07

- Integrated the GTA V San Andreas Area Explorer into the Popcycle page.
- Extracted the three embedded map images into editable asset files.
- Added 43 structured area records with Popcycle aliases, approximate map bounds, landmarks, reference groups, and notes.
- Added automatic schedule-to-area matching.
- Added manual per-schedule area overrides saved in the local draft.
- Added a focused local map and clickable San Andreas overview map.
- Added one-click area reference ped-group suggestions.
- Made hourly pedestrian group weights editable.
- Made hourly vehicle group weights editable.
- Added group add and remove controls.
- Added optional weight normalization.
- Added hourly mix copy controls for previous, next, and all time rows.
- Added direct Police Peds % and Police Cars % controls.
- Added Quiet, Routine, Visible, Heavy, and Crackdown police presets.
- Added validation for police percentages over 100%.
- Preserved all group and police edits during DAT export.

## 1.1.0 — 2026-06-07

- Added the **Night Shift** preset.
- Night Shift restores daytime rows to Stock Traffic and reduces the 10 PM, midnight, 2 AM, 4 AM, and 6 AM population rows.
- Added selectable AM/PM time rows.
- Added a selected-hour Population Mix panel.
- Added plain-English descriptions derived from the actual loaded pedestrian and vehicle group names.
- Added normalized group percentages and visual weight bars.
- Added selected-hour police-ped and police-car percentages.
- Removed the fixed Midday-only group preview.
- Preserved all group names and weights as read-only data during export.

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
- Added persistent Saved Files storage with automatic restore of the most recent vehicle.meta project.
- Added autosave after imports and edits.
- Added a DLC / Meta Name field and organized export filenames.
- Blank names export as `vehicles.meta`; named exports use `<DLC_NAME>_vehicles.meta`.
## Handling.meta Editor V1.1 — June 10, 2026
- Added an alphabetically grouped Handling Name selector above the table for quickly choosing any profile in the loaded file.
- Added an Open Per-Vehicle Editor action that drills directly into the selected handling profile.
- Added minus and plus adjustment buttons to numeric values in both the handling table and complete per-vehicle editor.
- Added field-aware adjustment increments while preserving the original number of decimal places.
- Replaced AIHandling text cells with dropdown selectors using the AI handling values found in the file plus the standard AVERAGE, SPORTS_CAR, TRUCK, and CRAP options.
- Added AI Handling A–Z and Z–A sorting while retaining the existing AI filter.
- Added a fixed maximum table height with vertical and horizontal scrollbars and sticky column headers for large handling files.

