# GTA-Traffic.com Popcycle Visual Map Editor 1.3.0

## Which package to install

Because this build was made from the current site you uploaded, use:

```text
gta-traffic_popcycle_visual_editor_v1_3_UPDATE_EXISTING_SITE.zip
```

The full-site ZIP is a recovery copy only. Do not copy both packages into the site.

## Install the update

1. Close the GTA-Traffic.com pages in the browser.
2. Make a ZIP backup of the current website folder.
3. Extract the **UPDATE_EXISTING_SITE** package.
4. Open the extracted package folder.
5. Copy everything inside it into the root of the current GTA-Traffic.com website.
6. Allow Windows to replace matching files and merge the `assets`, `css`, `data`, `docs`, and `js` folders.
7. Open `popcycle.html`.
8. Press `Ctrl + F5` to bypass cached JavaScript and CSS.

No new edit to `index.html` is required for this update.

## First test

1. Open the Popcycle page.
2. Load your current `popcycle.dat` once if no saved workspace is restored.
3. Select a city schedule such as `ALTA` or `BACKLOT_CITY`.
4. Confirm the Visual Popcycle Map opens and the correct district is highlighted.
5. Use the mouse wheel over the map to zoom and drag the map to pan.
6. Select several time-slot checkboxes.
7. Apply `VEH_COPCAR` with a small weight or use a police preset.
8. Confirm only the checked hours are changed.
9. Click **Save Workspace Now**.
10. Refresh the page and confirm the DAT, selected schedule, selected hours, edits, and map position restore.
11. Validate and export a test `popcycle_edited.dat`.

## Saved data behavior

The editor saves a working copy in IndexedDB. It can restore:

- The loaded DAT filename and original source text
- Edited numeric values and population groups
- Selected schedule and selected AM/PM time row
- Checked batch-editing hours
- Police values and `VEH_COPCAR` weights
- Schedule search and filters
- Area overrides
- Selected map layer, zoom, and pan position
- Installed Popgroups pedestrian and vehicle group suggestions

The browser does not silently modify the original DAT or YMT/XML file on the computer. Continue using the export buttons when a file is ready for OpenIV.

## Workspace controls

- **Save Workspace Now** writes immediately to IndexedDB.
- **Export Workspace** creates a portable JSON backup.
- **Import Workspace** restores that JSON backup.
- **Refresh Popgroups Groups** reloads group-name suggestions from the saved Popgroups homepage workspace.
- **Clear Saved Workspace** removes the saved Popcycle workspace after confirmation.

Clearing browser/site data can erase IndexedDB. Export a workspace backup periodically.

## Map layers

- **Auto** selects Los Santos Districts for city schedules and Full San Andreas for county schedules.
- **Full San Andreas** is the primary high-resolution statewide map.
- **Los Santos Districts** is the primary city schedule reference.
- **Regional Sections** is a broad FiveM-style orientation reference.
- **Patrol Districts** is a law-enforcement reference.

Regional and patrol boundaries are visual references. They are not official Rockstar Popcycle polygons.

## Police presence

Ambient police traffic requires both:

```text
PercentCopCars
VEH_COPCAR weight
```

The new police presets update both for the checked time slots. Setting police presence to zero removes `VEH_COPCAR` from those selected rows.
