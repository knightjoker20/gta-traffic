# GTA Traffic Studio

GTA Traffic Studio is a browser-based toolkit for managing GTA V traffic, vehicle metadata, handling data, and custom vehicle libraries.

The project is designed for modders who want a simpler way to organize large vehicle packs, edit traffic-related files, track installed vehicles, and prepare future custom add-on DLC packs.

## Current Version

**V1.3.1 — Cloudflare Stable**

This version has been cleaned up for Linux and Cloudflare compatibility, including case-sensitive file paths and a dedicated production folder.

## Main Features

### Popgroups Editor

* Import `popgroups.ymt` or XML exports
* Separate vehicle and ped groups
* Search and edit traffic groups
* Copy individual groups
* Export edited XML
* Save browser workspace
* Track vehicle packs and source files
* Open vehicle records in the Vehicle Library

### Popcycle Editor

* Import and edit `popcycle.dat`
* Organize traffic settings by region
* View mapped Los Santos areas
* Save and restore projects
* Export edited files

### Vehicle.meta Editor

* Import `vehicles.meta`
* Edit traffic-related vehicle settings
* Adjust values individually or with Quick Edit
* Edit:

  * `frequency`
  * `maxNum`
  * `maxNumOfSameColor`
  * `identicalModelSpawnDistance`
  * vehicle class
  * vehicle type
  * handling ID
  * layout
  * audio name
  * swankness
* Save multiple imported files
* Export using a custom DLC/meta name
* Analyze missing or invalid values

### Handling.meta Editor

* Import `handling.meta`
* Select vehicles by `handlingName`
* Edit handling values per vehicle
* Use increment and decrement controls
* Sort and edit AI handling types
* Edit advanced handling sections
* Save multiple handling files
* Export named handling files
* Analyze duplicate or invalid entries

### Vehicle Library

* Merge data from:

  * `vehicles.meta`
  * `handling.meta`
  * popgroups files
* Search and filter vehicles
* Sort by installed status
* Mark vehicles as installed or not installed
* Mark favorites
* Open a dedicated vehicle details page
* Store:

  * Rockstar DLC
  * source pack
  * replacement slot
  * YFT location
  * YTD location
  * handling location
  * notes
  * tags
  * install date
  * game version
* Scan `.yft` and `.ytd` files to mark vehicles installed
* Export and restore local library backups

### Vehicle Asset Scanner

* Scan `.yft` and `.ytd` files
* Record filename and file size
* Match files to known vehicle model names
* Estimate traffic streaming load
* Export asset database
* Keep all scanned files local to the browser

## Project Structure

```text
gta-traffic/
├── public/
│   ├── index.html
│   ├── popcycle.html
│   ├── vehicle-meta.html
│   ├── handling-meta.html
│   ├── vehicle-library.html
│   ├── vehicle-details.html
│   ├── assets/
│   ├── css/
│   ├── data/
│   └── js/
├── docs/
├── integration/
├── wrangler.jsonc
├── .gitignore
└── README.md
```

The live website is deployed only from the `public/` folder.

## Technology

* HTML
* CSS
* JavaScript
* IndexedDB
* Local browser storage
* GitHub
* Cloudflare Workers with Static Assets

No frontend framework is currently used.

## Deployment

The site is deployed through Cloudflare Workers.

The production files are located in:

```text
public/
```

The Cloudflare configuration is stored in:

```text
wrangler.jsonc
```

Current asset configuration:

```json
{
  "assets": {
    "directory": "./public"
  }
}
```

Deploy command:

```bash
npx wrangler deploy
```

## Local Data

The current version stores project and library data in the browser using IndexedDB and local storage.

This means:

* Data is stored on the current device and browser
* Data may not appear on another computer
* Clearing browser data may remove saved projects
* JSON backups should be exported regularly

The future cloud version will use:

* Cloudflare D1 for structured vehicle data
* Cloudflare R2 for vehicle screenshots
* IndexedDB as an offline fallback

## File Privacy

The current tools run locally in the browser.

Imported GTA files are parsed in the browser and are not uploaded to a server.

Vehicle screenshots and cloud libraries are planned for a future version.

## Planned Features

* Cloud vehicle database
* Cloud screenshot storage
* User accounts
* Cross-device library sync
* Custom DLC Pack Builder
* `carvariations.meta` parser
* `carcols.meta` parser
* Add-on pack conflict detection
* Mod-kit ID collision detection
* OpenIV-ready DLC export
* Installed vehicle inventory export
* Backup and restore across devices

## Development Rules

* Preserve the existing plain HTML, CSS, and JavaScript architecture
* Keep filenames and paths lowercase
* Treat file paths as case-sensitive
* Do not expose database credentials in browser code
* Store screenshots and binary files outside the database
* Keep GitHub as the source of truth
* Test new features in a separate branch before merging into production
* Do not remove IndexedDB fallback until cloud storage is stable

## Important GTA Files

The project currently works with:

```text
popgroups.ymt
popcycle.dat
vehicles.meta
handling.meta
```

Future support is planned for:

```text
carvariations.meta
carcols.meta
content.xml
setup2.xml
dlctext.meta
```

## Disclaimer

GTA Traffic Studio is an independent community project and is not affiliated with Rockstar Games or Take-Two Interactive.

Grand Theft Auto, GTA V, Rockstar Games, and related names and assets are trademarks of their respective owners.

Users are responsible for backing up their GTA V files before installing or editing mods.

## Author

Created and maintained by Tim Phillips.

Project website:

```text
gta-traffic.com
```
