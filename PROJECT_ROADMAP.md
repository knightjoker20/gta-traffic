# GTA-Traffic.com Roadmap

Generated: 2026-06-29T23:01:57.670Z

## Completed Recently

### 23G-C1 � GTA DLC Reference Builder

- GTA DLC Reference mode added to Pack DB Builder.
- vehicles.meta can be parsed into a DLC reference pack.
- Rockstar Games defaults are applied.
- DLC reference notes marker is added.

### 23G-C2 � Vehicle Details Rockstar / GTA Source History

- Vehicle Details now separates Rockstar/GTA source history from normal mod pack membership.
- Confirmed with `retinue` from `mpsmuggler`.

## Recommended Next Work

### 23G-C3 � Bulk Rockstar DLC Reference Import Pass

Goal:

Import more vanilla/Rockstar DLC vehicles.meta files so Vehicle Details can build broad Rockstar source history.

Tasks:

- Import base game vehicles.meta.
- Import major Rockstar DLC vehicles.meta files.
- Confirm pack counts after each cloud sync.
- Spot-check several vehicles from each DLC.
- Avoid patchday folders unless they contain vehicles.meta.

### 23G-C4 � Patchday Asset Reference Mode

Goal:

Track patchday visual/model/texture override history separately from vehicles.meta source history.

Important:

Patchday folders often contain YFT/YTD asset overrides, not first-source vehicle definitions.

Display target:

- Vehicle Details section: Visual / Patchday Overrides

### 23G-D � Vehicle Reference Enricher

Goal:

Parse GTABase-style saved HTML/source and enrich Vehicle Details with public reference data.

Keep separate from vehicles.meta technical source history.

Potential fields:

- display name
- manufacturer
- class
- DLC/title update
- release date
- price
- acquisition
- real-life inspiration
- image URL

### Source History Cleanup

Goals:

- Supersede older imports from the same source path.
- Add filtering by vehicles.meta / handling.meta / Popgroups.
- Add links from Vehicle Details to source-history records.
- Clean generic test rows like `vehicles.meta`, `handling.meta`, and `popgroups.ymt.xml`.

### Admin/User System

Continue building:

- account management
- admin user controls
- protected endpoints
- user workspaces
- paid/free feature separation

