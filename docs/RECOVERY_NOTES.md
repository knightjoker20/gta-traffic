# GTA-Traffic.com Recovery Notes

Generated: 2026-06-29T23:01:57.670Z

## Git First

Before any new feature work:

```powershell
git status
git pull --rebase origin feature/incremental-cloud-imports
git status --short
```

If there are local changes, do not pull until they are committed, stashed, or backed up.

## Standard Validation

Run before deploy:

```powershell
node --check ".\public\js\packdatabase.js"
node --check ".\public\js\vehicledetails.js"
node --check ".\public\js\vehiclecloud.js"
node --check ".\public\js\vehiclelibrary.js"
node --check ".\public\js\popgroups-workspace.js"
node --check ".\public\js\rpfscanner\rpf7parser.js"
node --check ".\public\js\rpfscanner\rpfscannerapp.js"
git diff --check
git status --short
```

Deploy:

```powershell
npx.cmd wrangler deploy
```

## Known Bad Pattern

Do not restore or re-add:

```text
public/js/vehiclepackdetails.js
```

Reason:

Pack membership display must stay inside `vehicledetails.js`. The old global injector approach risked breaking Vehicle Library and other pages.

## If Vehicle Library Breaks

**Check the case-sensitive script path first** (see below) — this has been the cause every time
the page loaded with an empty header/nav but "0 vehicles" and no console error.

Check:

```powershell
git status --short
Select-String -Path ".\public\vehicle-library.html" -Pattern "vehiclepackdetails|<<<<<<<|=======|>>>>>>>"
node --check ".\public\js\vehiclelibrary.js"
node --check ".\public\js\vehiclecloud.js"
```

## Known Recurring Bug: Case-Sensitive Script Path (vehiclelibrary.js)

This has silently broken the Vehicle Library page's data loading multiple times — no console
error, no thrown exception, just `/js/vehicleLibrary.js` 404ing in production while
`vlStatus` stays stuck on "Opening the local vehicle database..." forever.

Root cause: the file on disk is `public/js/vehiclelibrary.js` (all lowercase). Windows is
case-insensitive, so any casing "just works" while editing locally. Cloudflare's deployed static
asset store is case-sensitive, so a `<script src="...">` reference that doesn't match the on-disk
casing exactly will 404 live even though the laptop shows nothing wrong.

**Every time `vehiclelibrary.js` or `vehicle-library.html`'s `<script>` tags are touched, verify
before deploying:**

```powershell
Get-ChildItem .\public\js\vehiclelibrary.js | Select-Object Name
Select-String -Path .\public\vehicle-library.html -Pattern "vehiclelibrary\.js|vehicleLibrary\.js"
```

Both must show the exact same lowercase casing (`vehiclelibrary.js`). If the `Select-String`
match shows `vehicleLibrary.js` (capital L) anywhere, fix the script tag to lowercase before
deploying — do not rename the file to match instead, since case-only renames don't reliably
stick through git on a case-insensitive filesystem and will likely drift back.

## "Installed" Status Is Local-Only (IndexedDB, Not Cloud)

`vehicle.custom.installed` lives only in the browser's local `vehicleLibraryStore`
(IndexedDB), written by vehicle-library.html, vehicle-details.html, and the RPF DLC
folder scanner (`public/js/rpfscanner/`). It does not sync across browsers/PCs and is
separate from the cloud vehicle records (`/api/vehicles`) that popgroups.html's sidebar
renders from. The popgroups sidebar installed checkbox (`popgroups-workspace.js`,
`toggleInstalledFromSidebar`) reads/writes this same local IndexedDB store directly -
if a vehicle shown in the popgroups sidebar has never been imported into the local
Vehicle Library, checking the box creates a minimal local record on the fly.

## If GTA DLC Reference Does Not Show

Check API:

```powershell
Invoke-RestMethod "https://gta-traffic.com/api/vehicle-packs?modelName=retinue&workspaceId=default" |
  ConvertTo-Json -Depth 20
```

Expected:

```text
sourceType: gta-dlc-reference
sourceLabel: Rockstar DLC Reference
notes: [GTA_DLC_REFERENCE] sourceType=rockstar-dlc sourceFile=vehicles.meta
```

If `total: 0`, the DLC reference pack was not saved to cloud or the vehicles.meta did not contain that model.

If it shows `pack-tracker`, the pack was saved as a normal mod pack instead of GTA DLC Reference.

