const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function read(file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function write(file, content) {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart() + "\n", "utf8");
}

function cmd(command) {
  try {
    return cp.execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    return "";
  }
}

function listFiles(dir, extensions) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];

  const out = [];

  function walk(folder) {
    for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
      const itemPath = path.join(folder, item.name);
      const rel = path.relative(root, itemPath).replaceAll("\\", "/");

      if (item.isDirectory()) {
        if (["node_modules", ".git", ".wrangler", "dist", "build"].includes(item.name)) continue;
        walk(itemPath);
        continue;
      }

      if (!extensions || extensions.some(ext => item.name.toLowerCase().endsWith(ext))) {
        out.push(rel);
      }
    }
  }

  walk(full);
  return out.sort();
}

function contains(file, pattern) {
  return read(file).includes(pattern);
}

const branch = cmd("git branch --show-current") || "unknown";
const latestCommit = cmd("git log -1 --oneline") || "unknown";
const status = cmd("git status --short") || "clean";

const publicHtml = listFiles("public", [".html"]);
const publicJs = listFiles("public/js", [".js"]);
const publicCss = listFiles("public/css", [".css"]);
const migrations = listFiles("migrations", [".sql"]);

const featureFlags = [
  ["Vehicle Library", exists("public/vehicle-library.html")],
  ["Vehicle Details", exists("public/vehicle-details.html")],
  ["Vehicle cloud helper", exists("public/js/vehiclecloud.js")],
  ["Vehicle details renderer", exists("public/js/vehicledetails.js")],
  ["Pack DB / Pack Tracker", exists("public/js/packdatabase.js")],
  ["Pack Builder", exists("public/js/packbuilder.js")],
  ["GTA DLC Reference mode", contains("public/js/packdatabase.js", "gta-dlc-reference")],
  ["Rockstar / GTA Source History panel", contains("public/js/vehicledetails.js", "Rockstar / GTA Source History")],
  ["Vehicle image cloud upload", contains("public/js/vehiclecloud.js", "uploadVehicleImage")],
  ["Source History API helper", contains("public/js/vehiclecloud.js", "getSourceHistory")],
  ["Popcycle tool", exists("public/popcycle.html")],
  ["Workspace storage", exists("public/js/workspacestorage.js")],
  ["Cloudflare Worker", exists("src/index.js")],
  ["D1 migrations", migrations.length > 0]
];

const now = new Date().toISOString();

const projectReference = `
# GTA-Traffic.com Project Reference

Generated: ${now}

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

- Branch: \`${branch}\`
- Latest commit: \`${latestCommit}\`
- Working tree at generation time: \`${status}\`

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

- \`sourceType: "pack-tracker"\`
- \`sourceLabel: "Pack Tracker"\`

#### Rockstar / GTA Source History

Rockstar/base game/DLC reference packs generated from vehicles.meta.

Expected source:

- \`sourceType: "gta-dlc-reference"\`
- \`sourceLabel: "Rockstar DLC Reference"\`
- notes marker: \`[GTA_DLC_REFERENCE] sourceType=rockstar-dlc sourceFile=vehicles.meta\`

Confirmed working example:

- \`retinue\`
- Pack: \`mpsmuggler\`
- Source Type: \`gta-dlc-reference\`
- Vehicle Details section: \`Rockstar / GTA Source History\`

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

Do not add global DOM injectors or MutationObserver-based pack display scripts. Pack display must stay inside \`public/js/vehicledetails.js\`.

Removed/avoid:

- \`public/js/vehiclepackdetails.js\`

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

### 23G-C1 — GTA DLC Reference Builder

Status: Complete.

Pack DB Builder supports GTA DLC Reference mode and can build a pack from vehicles.meta.

### 23G-C2 — Vehicle Details Pack Source Panel

Status: Complete.

Vehicle Details separates:

- Rockstar / GTA Source History
- Mod Pack Membership

Confirmed with \`retinue\` and \`mpsmuggler\`.

## Development Rules

1. Keep source-aware data separate from user custom data.
2. Do not overwrite favorites, installed state, notes, tags, custom names, images, or user paths during imports.
3. Treat Rockstar DLC/base-game references differently from mod packs.
4. Patch existing page-specific renderers instead of adding global page injectors.
5. Always check Git state before new work.
6. Always run syntax checks before deploy.
7. Prefer small, tested feature steps over broad rewrites.
8. Keep this reference updated after each completed milestone.
`;

const projectStatus = `
# GTA-Traffic.com Current Status

Generated: ${now}

## Git

- Branch: \`${branch}\`
- Latest commit: \`${latestCommit}\`
- Working tree: \`${status}\`

## Feature Inventory

${featureFlags.map(([name, enabled]) => `- ${enabled ? "?" : "??"} ${name}`).join("\n")}

## Current Confirmed State

- Vehicle Library exists and is the main browser/search/reference entry point.
- Vehicle Details exists and is the per-model detail view.
- Pack DB Builder exists.
- Pack Tracker cloud sync exists.
- GTA DLC Reference mode exists.
- Rockstar / GTA Source History display exists.
- Mod Pack Membership display exists.
- The confirmed working test case is \`retinue\` from \`mpsmuggler\`.

## Files Detected

### HTML

${publicHtml.map(file => `- ${file}`).join("\n") || "- None detected"}

### JavaScript

${publicJs.map(file => `- ${file}`).join("\n") || "- None detected"}

### CSS

${publicCss.map(file => `- ${file}`).join("\n") || "- None detected"}

### Migrations

${migrations.map(file => `- ${file}`).join("\n") || "- None detected"}
`;

const architecture = `
# GTA-Traffic.com Architecture Notes

Generated: ${now}

## Frontend

The frontend is mostly static HTML/CSS/JS under \`public/\`.

Important pages:

- \`public/index.html\` — main Popgroups / Pack DB Builder workspace.
- \`public/vehicle-library.html\` — searchable vehicle library.
- \`public/vehicle-details.html\` — per-vehicle details page.
- \`public/popcycle.html\` — Popcycle visual editor.

Important JavaScript:

- \`public/js/packdatabase.js\` — Pack Tracker, Pack DB Builder, GTA DLC Reference sync.
- \`public/js/vehicledetails.js\` — Vehicle Details rendering and custom field persistence.
- \`public/js/vehiclecloud.js\` — cloud API helper.
- \`public/js/vehiclelibrary.js\` — Vehicle Library browsing, filtering, rendering.
- \`public/js/vehiclelibrarystore.js\` — local/cloud data bridge for vehicle library.
- \`public/js/workspacestorage.js\` — IndexedDB workspace storage.
- \`public/js/maincloudsync.js\` — main page import bridge to cloud library.

## Backend

Cloudflare Worker source is expected in:

- \`src/index.js\`

Cloudflare resources:

- D1 database: vehicle/library/pack/source records.
- R2 bucket: vehicle images.
- Worker routes: API endpoints for library, images, packs, vehicle packs, source history, admin/user functionality.

## Pack Source Model

Pack records must preserve their source identity.

Normal mod/add-on packs:

\`\`\`text
sourceType: pack-tracker
sourceLabel: Pack Tracker
\`\`\`

Rockstar/GTA DLC reference packs:

\`\`\`text
sourceType: gta-dlc-reference
sourceLabel: Rockstar DLC Reference
notes: [GTA_DLC_REFERENCE] sourceType=rockstar-dlc sourceFile=vehicles.meta
\`\`\`

Vehicle Details uses these fields to split pack data into the correct display sections.
`;

const roadmap = `
# GTA-Traffic.com Roadmap

Generated: ${now}

## Completed Recently

### 23G-C1 — GTA DLC Reference Builder

- GTA DLC Reference mode added to Pack DB Builder.
- vehicles.meta can be parsed into a DLC reference pack.
- Rockstar Games defaults are applied.
- DLC reference notes marker is added.

### 23G-C2 — Vehicle Details Rockstar / GTA Source History

- Vehicle Details now separates Rockstar/GTA source history from normal mod pack membership.
- Confirmed with \`retinue\` from \`mpsmuggler\`.

## Recommended Next Work

### 23G-C3 — Bulk Rockstar DLC Reference Import Pass

Goal:

Import more vanilla/Rockstar DLC vehicles.meta files so Vehicle Details can build broad Rockstar source history.

Tasks:

- Import base game vehicles.meta.
- Import major Rockstar DLC vehicles.meta files.
- Confirm pack counts after each cloud sync.
- Spot-check several vehicles from each DLC.
- Avoid patchday folders unless they contain vehicles.meta.

### 23G-C4 — Patchday Asset Reference Mode

Goal:

Track patchday visual/model/texture override history separately from vehicles.meta source history.

Important:

Patchday folders often contain YFT/YTD asset overrides, not first-source vehicle definitions.

Display target:

- Vehicle Details section: Visual / Patchday Overrides

### 23G-D — Vehicle Reference Enricher

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
- Clean generic test rows like \`vehicles.meta\`, \`handling.meta\`, and \`popgroups.ymt.xml\`.

### Admin/User System

Continue building:

- account management
- admin user controls
- protected endpoints
- user workspaces
- paid/free feature separation
`;

const recoveryNotes = `
# GTA-Traffic.com Recovery Notes

Generated: ${now}

## Git First

Before any new feature work:

\`\`\`powershell
git status
git pull --rebase origin feature/incremental-cloud-imports
git status --short
\`\`\`

If there are local changes, do not pull until they are committed, stashed, or backed up.

## Standard Validation

Run before deploy:

\`\`\`powershell
node --check ".\\public\\js\\packdatabase.js"
node --check ".\\public\\js\\vehicledetails.js"
node --check ".\\public\\js\\vehiclecloud.js"
node --check ".\\public\\js\\vehiclelibrary.js"
git diff --check
git status --short
\`\`\`

Deploy:

\`\`\`powershell
npx.cmd wrangler deploy
\`\`\`

## Known Bad Pattern

Do not restore or re-add:

\`\`\`text
public/js/vehiclepackdetails.js
\`\`\`

Reason:

Pack membership display must stay inside \`vehicledetails.js\`. The old global injector approach risked breaking Vehicle Library and other pages.

## If Vehicle Library Breaks

Check:

\`\`\`powershell
git status --short
Select-String -Path ".\\public\\vehicle-library.html" -Pattern "vehiclepackdetails|<<<<<<<|=======|>>>>>>>"
node --check ".\\public\\js\\vehiclelibrary.js"
node --check ".\\public\\js\\vehiclecloud.js"
\`\`\`

## If GTA DLC Reference Does Not Show

Check API:

\`\`\`powershell
Invoke-RestMethod "https://gta-traffic.com/api/vehicle-packs?modelName=retinue&workspaceId=default" |
  ConvertTo-Json -Depth 20
\`\`\`

Expected:

\`\`\`text
sourceType: gta-dlc-reference
sourceLabel: Rockstar DLC Reference
notes: [GTA_DLC_REFERENCE] sourceType=rockstar-dlc sourceFile=vehicles.meta
\`\`\`

If \`total: 0\`, the DLC reference pack was not saved to cloud or the vehicles.meta did not contain that model.

If it shows \`pack-tracker\`, the pack was saved as a normal mod pack instead of GTA DLC Reference.
`;

const featureRegister = `
# GTA-Traffic.com Feature Register

Generated: ${now}

| Feature | Status | Primary Files |
|---|---:|---|
| Vehicle Library | Active | public/vehicle-library.html, public/js/vehiclelibrary.js, public/js/vehiclecloud.js |
| Vehicle Details | Active | public/vehicle-details.html, public/js/vehicledetails.js |
| Vehicle Images | Active | public/js/vehiclecloud.js, Cloudflare R2 |
| Pack DB / Pack Tracker | Active | public/js/packdatabase.js |
| GTA DLC Reference Builder | Complete | public/js/packdatabase.js, public/index.html |
| Rockstar / GTA Source History | Complete | public/js/vehicledetails.js, public/css/vehicle-library.css |
| Mod Pack Membership | Active | public/js/vehicledetails.js, public/js/packdatabase.js |
| Popgroups Import | Active | public/js/maincloudsync.js, public/js/popgroups.js |
| handling.meta Import | Active | public/js/handlingmetaeditor.js |
| vehicles.meta Import | Active | public/js/vehiclemetaeditor.js, public/js/vehiclemeta.js |
| Source History | Active / needs cleanup | src/index.js, public/js/vehiclecloud.js, public/js/vehiclelibrary.js |
| Popcycle Editor | Active | public/popcycle.html, public/js/popcycle/* |
| Workspace Storage | Active | public/js/workspacestorage.js |
`;

write("PROJECT_REFERENCE.md", projectReference);
write("PROJECT_STATUS.md", projectStatus);
write("PROJECT_ROADMAP.md", roadmap);
write("docs/ARCHITECTURE.md", architecture);
write("docs/FEATURE_REGISTER.md", featureRegister);
write("docs/RECOVERY_NOTES.md", recoveryNotes);

console.log("Updated project reference files:");
console.log("- PROJECT_REFERENCE.md");
console.log("- PROJECT_STATUS.md");
console.log("- PROJECT_ROADMAP.md");
console.log("- docs/ARCHITECTURE.md");
console.log("- docs/FEATURE_REGISTER.md");
console.log("- docs/RECOVERY_NOTES.md");
