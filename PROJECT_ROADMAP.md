# GTA-Traffic.com Roadmap

Updated: 2026-06-29

---

## Completed

### Core Platform
- Vehicle Library browser (grid/list, search, filter, sort, pagination, random pick)
- Vehicle Details pages (full vehicles.meta, handling, Popgroups, source history, images, custom fields)
- Incremental importers: vehicles.meta, handling.meta, Popgroups XML/YMT (batch, non-destructive)
- Vehicle image upload/management via Cloudflare R2
- Cloud persistence via Cloudflare D1 (vehicles, handling, popgroups, packs, source history, favorites, installed, notes, tags, paths)
- IndexedDB browser-side cache/fallback
- Popcycle visual map editor (schedules, group weights, presets, area map, batch edit, export)
- Pack DB / Pack Tracker with GTA DLC Reference mode
- Rockstar / GTA Source History separated from Mod Pack Membership on Vehicle Details
- Dashboard with saved cloud projects (create, open, version history, archive)
- Auth foundation (register, login, logout, /api/auth/me)
- Admin user management (list, edit, disable)
- Admin workspace membership API
- Source History backend: D1 table, write helper, import session IDs, aggregation, API endpoint (/api/source-history)
- Vehicle Appearance Metadata: carcols.meta import API (/api/vehicle-appearance/import), D1 tables for variations, mod kits, and light settings (migration 007)

---

## In Progress

### Step 19E — Source History UI Panel
**Status:** Partially built, needs to be verified/completed and pushed.

Goal: Show recent imports directly on the Vehicle Library page below the vehicle grid.

Remaining tasks:
- Confirm `getSourceHistory()` is exported from `vehiclecloud.js`
- Confirm `renderSourceHistory()` and `refreshSourceHistory()` are in `vehiclelibrary.js`
- Confirm Source History panel HTML is in `vehicle-library.html` below `.vl-layout`
- Apply CSS breakpoint fix: change `max-width: 1150px` to `max-width: 900px` in `vehicle-library.css`
- Run `node --check` on vehiclelibrary.js and vehiclecloud.js
- Commit all unstaged changes and push

### Vehicle Appearance UI
**Status:** Backend complete, frontend partial.

The API and D1 tables for carcols.meta import are done (`/api/vehicle-appearance`, `/api/vehicle-appearance/import`, migration 007). The frontend parser preview and import options were added in recent commits but the full UI integration needs validation.

Remaining tasks:
- Validate carcols.meta import end-to-end in browser
- Show appearance data (colors, kits, liveries, lights) on Vehicle Details page
- Confirm no overwrite of existing custom vehicle data on re-import

---

## Next Up

### Step 19F — Source History Cleanup
After 19E is stable:

- Mark older imports from the same `source_path` as `superseded` when a new import completes
- Add filter buttons (vehicles.meta / handling.meta / Popgroups) to the Source History panel
- Add "View all history" page or modal
- Add source history links from Vehicle Details pages
- Clean test data rows with generic source paths (`vehicles.meta`, `handling.meta`, `popgroups.ymt.xml`)

### Step 21 — Pack Tracker Cloud UX Polish
- Rename developer cloud sync controls to clearly indicate admin-only access
- Improve empty-local-data messages so free users understand what to do
- Separate "Save Locally" language from "Publish to Cloud" language throughout the UI

### Step 22 — Admin + User Foundation
Foundations (migrations 004/005, auth API, admin user API) are in place. Needs:

- Admin dashboard shell with navigation to all admin sections
- Admin summary/health API (vehicle count, pack count, user count, recent imports)
- Role/plan/status fields on user records
- Admin audit log (log important admin actions to D1)
- User workspace structure (link workspaces to user accounts)
- Protected endpoints that check role before allowing access

### Step 23 — Admin Pack & Library Management
- Add/edit/archive packs from admin dashboard (move out of public Pack DB Builder UI)
- Manage vehicle-pack memberships from admin dashboard
- View and resolve duplicate packs
- View and clean orphan memberships
- Safe pack export/import with dry-run preview

### Step 24 — Image / Photo Pack Admin
- Media asset table in D1
- Admin UI for bulk image uploads to R2
- Store image metadata (model name, source, dimensions) in D1
- Assign images to model names and set primary vehicle image
- Review and resolve unmapped images

---

## Planned — Medium Term

### 23G-C3 — Bulk Rockstar DLC Reference Import Pass
Import vanilla and major Rockstar DLC vehicles.meta files to build broad source history in Vehicle Details.

- Import base game vehicles.meta
- Import major DLC vehicles.meta files (mpsmuggler, mpsecurity, mpsum2, etc.)
- Confirm pack counts after each sync
- Spot-check several vehicles per DLC
- Skip patchday folders unless they contain a vehicles.meta

### 23G-C4 — Patchday Asset Reference Mode
Track patchday YFT/YTD asset override history separately from vehicles.meta source history.

- Parse patchday folder structure to identify model/texture overrides
- Store as a separate reference type (not vehicles.meta source history)
- Display on Vehicle Details as: **Visual / Patchday Overrides**

### 23G-D — Vehicle Reference Enricher
Enrich Vehicle Details with public reference data (GTABase-style).

Potential fields: display name, manufacturer, class, DLC/title update, release date, price, acquisition method, real-life inspiration, reference image URL.

Keep entirely separate from vehicles.meta technical source history.

### Source History — Supersede Logic
When a new import completes for the same `source_path`, automatically mark previous rows from that path as `status = 'superseded'` so the history stays clean.

---

## Backlog (Future Scope)

- Premium user subscription + billing
- User workspaces (save/load personal library data across devices)
- Public community features (ratings, submissions, reviews)
- Automated image recognition / AI vehicle classification
- Advanced database SQL console (owner-only, after audit log is solid)
- Full moderation queue
- Streaming risk integration (LOD data, population limits)
- Population curve graph in Popcycle editor
- Direct pedestrian/vehicle group editing in Popcycle
- Popgroups group-name validation against loaded vehicles

---

## Development Rules (Standing)

1. Never overwrite favorites, installed state, notes, tags, custom names, images, or user paths during imports.
2. Keep Rockstar DLC reference data separate from mod pack data.
3. Patch page-specific renderers — do not add global DOM injectors or MutationObserver scripts.
4. Always run `git status` and `node --check` before deploying.
5. Prefer archive/disable over permanent delete in admin tools.
6. Use dry-run preview before large imports or bulk operations.
7. Keep dangerous database tools owner-only until audit logging is solid.
8. Source paths should use OpenIV/RPF style (e.g. `update/x64/dlcpacks/mpsecurity/dlc.rpf/...`), not local disk paths.
9. Deploy with `npx wrangler versions upload` for preview; use branch alias URL for testing before moving production traffic.
