# GTA-Traffic.com Architecture Notes

Generated: 2026-06-29T23:01:57.670Z

## Frontend

The frontend is mostly static HTML/CSS/JS under `public/`.

Important pages:

- `public/index.html` � main Popgroups / Pack DB Builder workspace.
- `public/vehicle-library.html` � searchable vehicle library.
- `public/vehicle-details.html` � per-vehicle details page.
- `public/popcycle.html` � Popcycle visual editor.

Important JavaScript:

- `public/js/packdatabase.js` � Pack Tracker, Pack DB Builder, GTA DLC Reference sync.
- `public/js/vehicledetails.js` � Vehicle Details rendering and custom field persistence.
- `public/js/vehiclecloud.js` � cloud API helper.
- `public/js/vehiclelibrary.js` � Vehicle Library browsing, filtering, rendering.
- `public/js/vehiclelibrarystore.js` � local/cloud data bridge for vehicle library.
- `public/js/workspacestorage.js` � IndexedDB workspace storage.
- `public/js/maincloudsync.js` � main page import bridge to cloud library.

## Backend

Cloudflare Worker source is expected in:

- `src/index.js`

Cloudflare resources:

- D1 database: vehicle/library/pack/source records.
- R2 bucket: vehicle images.
- Worker routes: API endpoints for library, images, packs, vehicle packs, source history, admin/user functionality.

## Pack Source Model

Pack records must preserve their source identity.

Normal mod/add-on packs:

```text
sourceType: pack-tracker
sourceLabel: Pack Tracker
```

Rockstar/GTA DLC reference packs:

```text
sourceType: gta-dlc-reference
sourceLabel: Rockstar DLC Reference
notes: [GTA_DLC_REFERENCE] sourceType=rockstar-dlc sourceFile=vehicles.meta
```

Vehicle Details uses these fields to split pack data into the correct display sections.

