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

Check:

```powershell
git status --short
Select-String -Path ".\public\vehicle-library.html" -Pattern "vehiclepackdetails|<<<<<<<|=======|>>>>>>>"
node --check ".\public\js\vehiclelibrary.js"
node --check ".\public\js\vehiclecloud.js"
```

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

