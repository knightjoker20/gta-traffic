# GTA Traffic Studio — Feature Tier Matrix

Updated: 2026-07-08

Companion to `PROJECT_SCOPE_AND_ROADMAP.md`. That doc describes three user
types (Guest, Premium User, Admin/Owner) and the Save Locally / Save to
Profile / Admin Publish to Cloud language. In the actual code, "Premium User"
already splits into two distinct behaviors — anyone logged in vs. `plan =
premium` — so this doc makes that split explicit as four tiers and maps every
current write-capable feature to one of them.

---

## The four tiers

| Tier | Who | How it's checked server-side |
|---|---|---|
| Guest | No account | No session |
| Free account | Logged in, `plan = free` | `checkLibraryWriteAuthorization()` — any valid session |
| Premium | Logged in, `plan = premium` (or role admin/owner/moderator) | `requirePremium()` |
| Admin / staff | `role` in `admin`, `owner` | `requireAdminSession()` |

`checkLibraryWriteAuthorization()` also accepts a static `LIBRARY_WRITE_TOKEN`
header as an alternative to a session, for scripts/import tooling — that's
unrelated to the plan/role system and shouldn't be treated as a tier.

---

## Feature matrix

### Browse & view — Guest and up

Read-only. No session required.

- Vehicle library, vehicle details, handling, popgroups
- Appearance metadata, source history
- Pack Tracker membership (view only)
- Popcycle visual map viewer

### Personal data & sync — Free account and up

Requires login. Writes are scoped to the user's own data (favorites, notes,
tags, field-edit overrides) or are additive catalog contributions to the
shared library tables (`vehicles`, `handling_profiles` — these are global,
not per-user, by design; see "Open items" below).

- Favorites, notes, tags, install flags (`vehicle_field_edits` pattern)
- Personal field-edit overrides — vehicle and handling (`vehicle_field_edits`,
  `handling_field_edits`)
- Pack Tracker assignment & bulk-assign tools
- Dashboard saved cloud projects
- Import/patch vehicles.meta, handling.meta, carcols.meta, pack data
  (`handleLibraryV2Import`, `handleVehicleAppearanceImport`,
  `handlePackImport`, `handleVehiclePatch`, `handleMetaFilePut`,
  `handleMetaFileDelete`) — gated by `checkLibraryWriteAuthorization()`

### Premium — `plan = premium` and up

- Pack Builder — create and export install packs (`handleBuilderPackList` and
  the rest of `/api/builder/*`, gated by `requirePremium()`)
- Curated premium resources — planned, nothing built yet. First thing to
  decide: what actually goes here beyond Pack Builder.

### Admin / staff — `role` in `admin`, `owner`

Everything that affects other users' accounts, the site itself, or
permanently destroys shared data. Gated by `requireAdminSession()`.

- User & role management (`handleAdminUserList/Create/Update`)
- Workspace administration (`handleAdminWorkspaceList`,
  `handleAdminWorkspaceMemberList/Upsert`)
- Admin summary (`handleAdminSummary`)
- Deleting a vehicle record outright (`handleVehicleDelete`)

---

## Fixed 2026-07-08

Found while building this matrix: every `handleAdmin*` endpoint and
`handleVehicleDelete` were gated by `checkLibraryWriteAuthorization()` —
which only checks "is anyone logged in," not role. In practice this meant
any free account could list every registered user's email, create new
accounts (including passing `role: "admin"` in the request body), edit any
user's role/plan/status, manage workspace membership, and permanently delete
any vehicle from the shared library — all with zero role check.

Fix: added `requireAdminSession()` (checks `role` in `admin`/`owner`,
mirroring the existing `requirePremium()` pattern) and switched all seven
admin handlers plus `handleVehicleDelete` to use it. Admin user-create,
user-update, workspace-member-upsert, and vehicle-delete now also write to
`admin_audit_log` with the acting admin's user ID and email — most of these
had no audit trail before.

Left unchanged: `checkLibraryWriteAuthorization()` still allows any free
account to import/patch vehicles.meta, handling.meta, appearance data, and
pack data. That's the core cataloging feature of the site, not a bug — a
free account overwriting their own imported catalog data is expected. Only
whole-record *deletion* and anything touching other users' accounts moved to
admin-only.

---

## Open items (not yet built)

- **No shared client-side account-state helper.** `/api/auth/me` already
  returns `plan` and `role`, but no page reads them — `accountnav.js` only
  branches on logged-in vs logged-out. Every page that needs a tier check
  currently infers it ad hoc (e.g. `vehicledetails.js` reading
  `result.loggedIn` from a field-edits response). Worth building one helper
  that fetches `/api/auth/me` once and exposes
  `{loggedIn, plan, role, isPremium, isAdmin}` globally.
- **No visual premium/admin indicator anywhere in the UI.** A paying user
  looks identical to a free user today.
- **No reusable gating UI pattern.** The disabled-input + tooltip + hint
  pattern already used for "log in to customize this field" on Vehicle
  Details is the right shape to reuse for premium gates — not yet extracted
  into a shared component.
- **`vehicles` and `handling_profiles` are single global tables**, not scoped
  per user or workspace. That's an intentional community-catalog model for
  now, but means any free account's import can overwrite another's. Worth
  revisiting if the site gets real concurrent contributors.
- **Premium tier has no exclusive feature besides Pack Builder.** Needs a
  product decision before "Premium subscription + billing" (roadmap backlog)
  is worth building.
