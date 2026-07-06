# GTA-Traffic.com Project Reference

Generated: 2026-06-29T23:01:57.670Z

## Current Mission

GTA-Traffic.com is a cloud-backed GTA V vehicle reference, import, and mod-management platform.

The project should stay centered on:

- Safe incremental imports.
- Source-aware vehicle data.
- Preserving custom user data.
- Distinguishing Rockstar/base game/DLC sources from mod/add-on packs.
- Making Vehicle Details the trusted per-model reference page.
- Keeping Pack DB, Popgroups, vehicles.meta, handling.meta, and image data connected without overwriting unrelated data.

## Current Branch

- Branch: `feature/incremental-cloud-imports`
- Latest commit: `b48c221 Separate GTA DLC reference pack cloud sync`
- Working tree at generation time: `?? tools/generate-project-reference.cjs`

## Core Data Sources

### vehicles.meta

Used for technical vehicle identity and metadata.

Expected data includes:

- modelName
- txdName
- handlingId
- gameName
- vehicleMakeName
- vehicleClass
- layout
- audioNameHash
- flags
- frequency / swankness / max counts where available
- source label
- DLC folder
- original source path

### handling.meta

Used for handling profiles linked by handlingName / handlingId.

Expected behavior:

- Import incrementally.
- Update by handlingName.
- Avoid duplicate handling records.
- Preserve source labels and paths.

### Popgroups

Used for traffic group membership.

Expected behavior:

- Import incrementally.
- Track source file.
- Replace older relationships from the same source file.
- Avoid overwriting custom vehicle data.
- Create minimal vehicle records only when needed.

### Pack DB / Pack Tracker

Used for mod pack and DLC reference membership.

Two major pack types now exist:

#### Mod Pack Membership

Normal add-on/mod packs.

Expected source:

- `sourceType: "pack-tracker"`
- `sourceLabel: "Pack Tracker"`

#### Rockstar / GTA Source History

Rockstar/base game/DLC reference packs generated from vehicles.meta.

Expected source:

- `sourceType: "gta-dlc-reference"`
- `sourceLabel: "Rockstar DLC Reference"`
- notes marker: `[GTA_DLC_REFERENCE] sourceType=rockstar-dlc sourceFile=vehicles.meta`

Confirmed working example:

- `retinue`
- Pack: `mpsmuggler`
- Source Type: `gta-dlc-reference`
- Vehicle Details section: `Rockstar / GTA Source History`

## Vehicle Details Page

Vehicle Details is the per-model reference page.

It should show:

- vehicles.meta data.
- linked handling.meta data.
- Popgroups membership.
- Rockstar / GTA Source History.
- Mod Pack Membership.
- Source-file information.
- Custom user metadata.
- Favorite/installed state.
- Vehicle image from cloud storage.
- Tags, notes, install paths, and download URL.

Important rule:

Do not add global DOM injectors or MutationObserver-based pack display scripts. Pack display must stay inside `public/js/vehicledetails.js`.

Removed/avoid:

- `public/js/vehiclepackdetails.js`

## Cloud Storage

### Cloudflare D1

Used for:

- vehicle records
- handling profiles
- Popgroups relationships
- favorites
- installed status
- notes
- tags
- custom metadata
- pack records
- pack memberships
- source history

### Cloudflare R2

Used for:

- vehicle images
- bulk image uploads
- image replacement/deletion

## Current Verified Milestones

### 23G-C1 � GTA DLC Reference Builder

Status: Complete.

Pack DB Builder supports GTA DLC Reference mode and can build a pack from vehicles.meta.

### 23G-C2 � Vehicle Details Pack Source Panel

Status: Complete.

Vehicle Details separates:

- Rockstar / GTA Source History
- Mod Pack Membership

Confirmed with `retinue` and `mpsmuggler`.

## Development Rules

1. Keep source-aware data separate from user custom data.
2. Do not overwrite favorites, installed state, notes, tags, custom names, images, or user paths during imports.
3. Treat Rockstar DLC/base-game references differently from mod packs.
4. Patch existing page-specific renderers instead of adding global page injectors.
5. Always check Git state before new work.
6. Always run syntax checks before deploy.
7. Prefer small, tested feature steps over broad rewrites.
8. Keep this reference updated after each completed milestone.

