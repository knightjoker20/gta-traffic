// =====================================================
// pack-builder-export.js
// OIV export engine for Pack Builder (premium)
// Loaded lazily when the user clicks "Export .OIV"
//
// Entry point: window.pbExport(pack, vehicles, metaCache)
//   pack     — { id, name, dlc_name, version, author_name, description, status }
//   vehicles — [{ vehicle_id, sort_order, has_yft, has_yft_hi, has_ytd, ... }]
//   metaCache — { [vehicleId]: { vehicles, handling, carcols, carvariations } }
//              (status-only cache; raw_xml is fetched fresh from the server)
// =====================================================

(function () {
  'use strict';

  const JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

  // Branding icon bundled as base64 to avoid Cloudflare cache/deploy timing issues
  const OIV_ICON_B64 = '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';

  // ── Utilities ──────────────────────────────────────────────────────────────

  function escXml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function indentBlock(xml, spaces) {
    const pad = ' '.repeat(spaces);
    return xml.trim().split('\n').map(l => pad + l).join('\n');
  }

  function loadJSZip() {
    return new Promise((resolve, reject) => {
      if (window.JSZip) { resolve(window.JSZip); return; }
      const s = document.createElement('script');
      s.src = JSZIP_CDN;
      s.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error('JSZip did not load'));
      s.onerror = () => reject(new Error('Failed to load JSZip from CDN'));
      document.head.appendChild(s);
    });
  }

  // ── Meta fetching ──────────────────────────────────────────────────────────
  // Fetches all 4 meta types for a vehicle from the server.
  // Returns: { vehicles, handling, carcols, carvariations }
  // Each entry: { raw_xml, parsed_json, kit_name, status, warnings }

  async function fetchVehicleMeta(vehicleId) {
    const r = await fetch(`/api/builder/vehicle-meta/${vehicleId}`, {
      credentials: 'include',
    });
    if (!r.ok) throw new Error(`Meta fetch failed for "${vehicleId}" (${r.status})`);
    const data = await r.json();
    // API returns { ok, vehicle_id, meta: { vehicles, handling, ... }, complete }
    // Unwrap the meta map so callers can do meta[type].raw_xml directly
    return data.meta || {};
  }

  // ── Merge engine ───────────────────────────────────────────────────────────

  // Ensures an <Item> element has the required type attribute.
  // GTA V's RSC deserializer silently skips <Item> blocks that are missing it.
  function ensureItemType(xml, typeName) {
    const trimmed = xml.trim();
    // Already has a type attribute → leave untouched
    if (/^<Item\s[^>]*\btype=/.test(trimmed)) return trimmed;
    // No type attribute → inject it right after <Item
    return trimmed.replace(/^<Item(\s|>)/, `<Item type="${typeName}"$1`);
  }

  // vehicles.meta
  // Wraps all per-vehicle <Item> blocks in a CVehicleModelInfo__InitDataList.
  // <residentTxd>vehshare</residentTxd> is REQUIRED — without it GTA V cannot
  // resolve shared vehicle textures and silently refuses to spawn the vehicle.
  function mergeVehiclesMeta(rawXmlList) {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<CVehicleModelInfo__InitDataList>',
      '  <residentTxd>vehshare</residentTxd>',
      '  <residentAnims />',
      '  <InitDatas>',
      ...rawXmlList.map(x => indentBlock(ensureItemType(x, 'CVehicleModelInfo__InitData'), 4)),
      '  </InitDatas>',
      '</CVehicleModelInfo__InitDataList>',
    ].join('\n');
  }

  // handling.meta
  function mergeHandlingMeta(rawXmlList) {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<CHandlingDataMgr>',
      '  <HandlingData>',
      ...rawXmlList.map(x => indentBlock(ensureItemType(x, 'CHandlingData'), 4)),
      '  </HandlingData>',
      '</CHandlingDataMgr>',
    ].join('\n');
  }

  // carcols.meta
  // The hard part: each vehicle's kit id must be unique in the merged file.
  // Generic names like "0_default_modkit" are renamed to "{vehicleId}_modkit".
  // Returns { xml, kitRenameMap } where kitRenameMap = { vehicleId: { old, new } }
  function mergeCarcolsMeta(rows) {
    // rows = [{ vehicleId, rawXml, kitName }]
    const kitRenameMap = {};

    const processedItems = rows.map(({ vehicleId, rawXml, kitName }, idx) => {
      const oldName = (kitName || '0_default_modkit').trim();
      const newName = `${vehicleId}_modkit`;
      kitRenameMap[vehicleId] = { old: oldName, new: newName };

      let xml = rawXml.trim();

      // 1. Replace the Item id attribute: <Item id="oldName">
      xml = xml.replace(
        new RegExp(`(<Item\\s+id=")${escRe(oldName)}(")`, 'gi'),
        `$1${newName}$2`
      );

      // 2. Replace any bare text references to the old name inside the block
      //    (some mods inline kit name as text content in child elements)
      xml = xml.replace(new RegExp(`\\b${escRe(oldName)}\\b`, 'g'), newName);

      // 3. Renumber the numeric <id value="N"> to avoid duplicates across vehicles.
      //    Each vehicle gets a unique sequential ID starting from 1.
      xml = xml.replace(/<id\s+value="\d+"\s*\/>/gi, `<id value="${idx + 1}" />`);

      return xml;
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<CVehicleModelInfoVarGlobal>',
      '  <Kits>',
      ...processedItems.map(x => indentBlock(x, 4)),
      '  </Kits>',
      '  <Lights />',
      '</CVehicleModelInfoVarGlobal>',
    ].join('\n');

    return { xml, kitRenameMap };
  }

  // carvariations.meta
  // After carcols kit rename, update the kit references in each vehicle's
  // carvariations block so they point to the new name.
  function mergeCarvariationsMeta(rows, kitRenameMap) {
    // rows = [{ vehicleId, rawXml }]
    const processedItems = rows.map(({ vehicleId, rawXml }) => {
      const rename = kitRenameMap[vehicleId];
      if (!rename || rename.old === rename.new) return rawXml.trim();

      // Replace all occurrences of the old kit name with the new one
      return rawXml.trim().replace(
        new RegExp(`\\b${escRe(rename.old)}\\b`, 'g'),
        rename.new
      );
    });

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<CVehicleModelInfoVariation>',
      '  <variationData>',
      ...processedItems.map(x => indentBlock(x, 4)),
      '  </variationData>',
      '</CVehicleModelInfoVariation>',
    ].join('\n');
  }

  // ── XML generators ─────────────────────────────────────────────────────────

  function buildAssemblyXml(pack, vehicles, modelFiles) {
    const modelEntries = vehicles.flatMap(v => {
      const lines = [];
      if (modelFiles[`${v.vehicle_id}.yft`])
        lines.push(`        <add source="models/${v.vehicle_id}.yft">${v.vehicle_id}.yft</add>`);
      if (modelFiles[`${v.vehicle_id}_hi.yft`])
        lines.push(`        <add source="models/${v.vehicle_id}_hi.yft">${v.vehicle_id}_hi.yft</add>`);
      if (modelFiles[`${v.vehicle_id}.ytd`])
        lines.push(`        <add source="models/${v.vehicle_id}.ytd">${v.vehicle_id}.ytd</add>`);
      return lines;
    });

    const verParts = (pack.version || '1.0').split('.');
    // OpenIV requires a GUID in {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX} format
    const packGuid = `{${crypto.randomUUID().toUpperCase()}}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.1" id="${packGuid}" target="Five">
  <metadata>
    <name>${escXml(pack.name)}</name>
    <version>
      <major>${escXml(verParts[0] || '1')}</major>
      <minor>${escXml(verParts[1] || '0')}</minor>
      <tag>RELEASE</tag>
    </version>
    <author>
      <displayName>${escXml(pack.author_name || 'GTA Traffic Studio')}</displayName>
    </author>
    <description footerLink="https://gta-traffic.com" footerLinkTitle="GTA-Traffic.com"><![CDATA[${(pack.description || 'GTA V traffic mod pack generated by GTA-Traffic.com').replace(/\]\]>/g, ']]]]><![CDATA[>')}]]></description>
  </metadata>
  <icon>icon.png</icon>
  <colors>
    <headerBackground useBlackTextColor="FALSE">$FF0A0118</headerBackground>
    <iconBackground>$FF0A0118</iconBackground>
  </colors>
  <content>
    <archive path="update/x64/dlcpacks/${pack.dlc_name}/dlc.rpf" createIfNotExist="True" type="RPF7">
      <add source="meta/content.xml">content.xml</add>
      <add source="meta/setup2.xml">setup2.xml</add>
      <add source="meta/vehicles.meta">data/vehicles.meta</add>
      <add source="meta/handling.meta">data/handling.meta</add>
      <add source="meta/carcols.meta">data/carcols.meta</add>
      <add source="meta/carvariations.meta">data/carvariations.meta</add>
      <archive path="x64/vehicles.rpf" createIfNotExist="True" type="RPF7">
${modelEntries.join('\n')}
      </archive>
    </archive>
    <archive path="update\\update.rpf" createIfNotExist="True" type="RPF7">
      <xml path="common\\data\\dlclist.xml">
        <add xpath="/SMandatoryPacksData/Paths" append="Last">
          <Item>dlcpacks:/${pack.dlc_name}/</Item>
        </add>
      </xml>
    </archive>
  </content>
</package>`;
  }

  // content.xml — tells the game engine what data files this DLC loads
  // Uses dlc_{name}:/ path alias registered by setup2.xml <deviceName>
  // %PLATFORM% resolves to "x64" on PC
  function buildContentXml(pack, vehicles) {
    const dev = `dlc_${pack.dlc_name}`;
    const ts  = new Date().toLocaleString('en-GB', { hour12: false })
                  .replace(',', '');
    return `<?xml version="1.0" encoding="UTF-8"?>
<CDataFileMgr__ContentsOfDataFileXml>
  <disabledFiles />
  <includedXmlFiles />
  <includedDataFiles />
  <dataFiles>
    <Item>
      <filename>${dev}:/data/vehicles.meta</filename>
      <fileType>VEHICLE_METADATA_FILE</fileType>
      <overlay value="false" />
      <disabled value="true" />
      <persistent value="false" />
    </Item>
    <Item>
      <filename>${dev}:/data/handling.meta</filename>
      <fileType>HANDLING_FILE</fileType>
      <overlay value="false" />
      <disabled value="true" />
      <persistent value="false" />
    </Item>
    <Item>
      <filename>${dev}:/data/carcols.meta</filename>
      <fileType>CARCOLS_FILE</fileType>
      <overlay value="false" />
      <disabled value="true" />
      <persistent value="false" />
    </Item>
    <Item>
      <filename>${dev}:/data/carvariations.meta</filename>
      <fileType>VEHICLE_VARIATION_FILE</fileType>
      <overlay value="false" />
      <disabled value="true" />
      <persistent value="false" />
    </Item>
    <Item>
      <filename>${dev}:/%PLATFORM%/vehicles.rpf</filename>
      <fileType>RPF_FILE</fileType>
      <overlay value="false" />
      <disabled value="true" />
      <persistent value="true" />
    </Item>
  </dataFiles>
  <contentChangeSets>
    <Item>
      <changeSetName>${pack.dlc_name}_AUTOGEN</changeSetName>
      <filesToDisable />
      <filesToEnable>
        <Item>${dev}:/data/handling.meta</Item>
        <Item>${dev}:/data/vehicles.meta</Item>
        <Item>${dev}:/data/carcols.meta</Item>
        <Item>${dev}:/data/carvariations.meta</Item>
        <Item>${dev}:/%PLATFORM%/vehicles.rpf</Item>
      </filesToEnable>
      <txdToLoad />
      <txdToUnload />
      <residentResources />
      <unregisterResources />
    </Item>
  </contentChangeSets>
  <patchFiles />
</CDataFileMgr__ContentsOfDataFileXml>`;
  }

  // setup2.xml — registers the DLC device name (dlc_{name}:/) with the game
  function buildSetup2Xml(pack) {
    const ts = new Date().toLocaleString('en-GB', { hour12: false }).replace(',', '');
    return `<?xml version="1.0" encoding="UTF-8"?>
<SSetupData>
  <deviceName>dlc_${pack.dlc_name}</deviceName>
  <datFile>content.xml</datFile>
  <timeStamp>${ts}</timeStamp>
  <nameHash>${pack.dlc_name}</nameHash>
  <contentChangeSetGroups>
    <Item>
      <NameHash>GROUP_STARTUP</NameHash>
      <ContentChangeSets>
        <Item>${pack.dlc_name}_AUTOGEN</Item>
      </ContentChangeSets>
    </Item>
  </contentChangeSetGroups>
  <type>EXTRACONTENT_COMPAT_PACK</type>
  <order value="9" />
</SSetupData>`;
  }

  // Plain-text install guide included in the .oiv
  function buildInstallNotes(pack, vehicles, kitRenameMap, metaOnly) {
    const kitLog = Object.entries(kitRenameMap)
      .map(([vid, r]) => `  ${vid}: "${r.old}" → "${r.new}"`)
      .join('\n');

    const modelsNote = metaOnly ? `
⚠ META-ONLY PACKAGE — MODEL FILES NOT INCLUDED
This OIV contains meta files only (.meta, content.xml, setup2.xml).
Model files (.yft / .ytd) were NOT included.

REQUIRED after installing this OIV:
  Open OpenIV and navigate to:
    mods/update/x64/dlcpacks/${pack.dlc_name}/dlc.rpf/x64/vehicles.rpf/
  Then drag-drop each vehicle's .yft and .ytd into that RPF.
  Without the model files, vehicles will NOT spawn (even if they
  appear in a trainer's vehicle list).
` : '';

    return `GTA Traffic Studio — Pack Builder
Pack:      ${pack.name}
DLC name:  ${pack.dlc_name}
Vehicles:  ${vehicles.length}
Generated: ${new Date().toISOString()}
${modelsNote}
═══════════════════════════════════════════════
STEP 1 — INSTALL THE OIV
═══════════════════════════════════════════════
Open the .oiv with OpenIV:
  • Drag it onto the OpenIV window, OR
  • File → Open Package

Click "Install". OpenIV will create:
  mods/update/x64/dlcpacks/${pack.dlc_name}/dlc.rpf

Expected DLC structure after install:
  dlc.rpf/
  ├─ content.xml
  ├─ setup2.xml
  ├─ data/
  │   ├─ vehicles.meta
  │   ├─ handling.meta
  │   ├─ carcols.meta
  │   └─ carvariations.meta
  └─ x64/
      └─ vehicles.rpf/
          ├─ ${vehicles[0]?.vehicle_id || 'vehicle'}.yft
          └─ ${vehicles[0]?.vehicle_id || 'vehicle'}.ytd

═══════════════════════════════════════════════
STEP 2 — dlclist.xml  (handled automatically)
═══════════════════════════════════════════════
The OIV installer adds this entry to dlclist.xml for you:

  <Item>dlcpacks:/${pack.dlc_name}/</Item>

Location: mods/update/update.rpf/common/data/dlclist.xml

The OIV includes the full vanilla DLC list so it works
correctly whether or not you already have a mods-folder
copy of dlclist.xml.

If your vehicle pack does not load after installing, open
that file in OpenIV and confirm the line above is present
inside <Paths>. The trailing slash is required.

═══════════════════════════════════════════════
STEP 3 — VERIFY WITH OPENIV BEFORE LAUNCHING
═══════════════════════════════════════════════
Before starting GTA V, open OpenIV and confirm:
  ✓ dlcpacks/${pack.dlc_name}/dlc.rpf  EXISTS
  ✓ dlc.rpf/content.xml                EXISTS
  ✓ dlc.rpf/setup2.xml                 EXISTS
  ✓ dlc.rpf/data/vehicles.meta         EXISTS
  ✓ dlc.rpf/x64/vehicles.rpf           EXISTS and NOT EMPTY
  ✓ dlc.rpf/x64/vehicles.rpf/*.yft     at least one model file

If vehicles.rpf is empty → the spawn will fail with "no valid model."

═══════════════════════════════════════════════
TROUBLESHOOTING — "No valid model" on spawn
═══════════════════════════════════════════════
This error means the game cannot find the model file in streaming.

Check in this order:
  1. dlclist.xml has <Item>dlcpacks:/${pack.dlc_name}/</Item>
  2. vehicles.rpf contains the .yft files for each vehicle
     (use OpenIV to open dlc.rpf → x64 → vehicles.rpf and verify)
  3. The .yft filename matches the vehicle spawn name exactly
     e.g. vehicle spawn name "sultan" → file must be "sultan.yft"
  4. The DLC entry in dlclist.xml uses the EXACT same name as the
     dlcpacks folder:  "${pack.dlc_name}"
  5. Restart GTA V completely after changing dlclist.xml

NOTE: Some trainers show vehicles in their menu from a hardcoded list,
even if the DLC isn't loaded. The vehicle appearing in the spawn menu
does NOT confirm the DLC is active. Verify via step 1 and 2 above.

═══════════════════════════════════════════════
CARCOLS KIT RENAMES (merge log)
═══════════════════════════════════════════════
Kit names were renamed to avoid ID collisions in the merged file:

${kitLog || '  (no renames needed — all vehicles use default modkit or have no carcols)'}

═══════════════════════════════════════════════
INCLUDED VEHICLES (${vehicles.length} total)
═══════════════════════════════════════════════
${vehicles.map((v, i) => `${String(i + 1).padStart(3)}. ${v.vehicle_id}`).join('\n')}
`;
  }

  // ── OIV packager ───────────────────────────────────────────────────────────

  async function buildOiv(pack, vehicles, mergedMeta, modelFiles, kitRenameMap, onProgress) {
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    const metaOnly = Object.keys(modelFiles).length === 0;

    onProgress('Writing assembly.xml…');
    zip.file('assembly.xml', buildAssemblyXml(pack, vehicles, modelFiles));
    zip.file('INSTALL_NOTES.txt', buildInstallNotes(pack, vehicles, kitRenameMap, metaOnly));

    // Bundle the GTA Traffic branding icon (base64-embedded — no network request needed)
    try {
      const iconBin = Uint8Array.from(atob(OIV_ICON_B64), c => c.charCodeAt(0));
      zip.file('icon.png', iconBin);
    } catch (_) { /* non-fatal */ }

    // OpenIV expects all source files inside a top-level "content/" folder.
    // source= paths in assembly.xml are relative to content/.
    const contentDir = zip.folder('content');

    onProgress('Writing meta files…');
    const metaFolder = contentDir.folder('meta');
    metaFolder.file('vehicles.meta',      mergedMeta.vehicles);
    metaFolder.file('handling.meta',      mergedMeta.handling);
    metaFolder.file('carcols.meta',       mergedMeta.carcols);
    metaFolder.file('carvariations.meta', mergedMeta.carvariations);
    metaFolder.file('content.xml',        buildContentXml(pack, vehicles));
    metaFolder.file('setup2.xml',         buildSetup2Xml(pack));
    // dlclist.xml is patched via XPath in assembly.xml — no separate file needed

    onProgress('Adding model files…');
    const modelsFolder = contentDir.folder('models');
    for (const [name, buf] of Object.entries(modelFiles)) {
      modelsFolder.file(name, buf); // already ArrayBuffer, read at drop time
    }

    onProgress('Compressing…');
    const blob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      ({ percent }) => onProgress(`Compressing… ${percent.toFixed(0)}%`)
    );

    return blob;
  }

  // ── Export overlay UI ──────────────────────────────────────────────────────

  function createOverlay(pack, vehicles) {
    document.getElementById('pbExportOverlay')?.remove();

    const el = document.createElement('div');
    el.id = 'pbExportOverlay';
    el.className = 'pb-modal-overlay';
    el.innerHTML = `
      <div class="pb-modal pb-export-modal">

        <div class="pb-modal-header">
          <div>
            <h3>Export OIV — ${escXml(pack.name)}</h3>
            <p class="small">Drop model files below, then click Export. Meta files are fetched from the server.</p>
          </div>
          <button class="pb-modal-close" id="pbeClose" type="button">✕</button>
        </div>

        <div class="pb-export-body">

          <div class="pb-export-drop-zone" id="pbeDropZone">
            <div class="pb-drop-icon">📁</div>
            <div class="pb-drop-label">Drop .yft &amp; .ytd files here</div>
            <div class="pb-drop-sub">Processed in-browser — files are never uploaded</div>
            <input type="file" id="pbeFileInput" accept=".yft,.ytd" multiple hidden>
            <button class="secondary" id="pbeBrowseBtn" type="button">Browse Files</button>
          </div>

          <div class="pb-model-grid" id="pbeModelGrid">
            ${vehicles.map(v => `
              <div class="pb-model-row" id="pbemr-${v.vehicle_id}">
                <span class="pb-vehicle-model">${v.vehicle_id}</span>
                <div class="pb-model-pips" style="margin-left:auto;display:flex;gap:4px">
                  <span class="pb-model-pip pb-model-pip--miss" id="pbemp-${v.vehicle_id}-yft"  title="${v.vehicle_id}.yft">YFT</span>
                  <span class="pb-model-pip pb-model-pip--miss" id="pbemp-${v.vehicle_id}-hi"   title="${v.vehicle_id}_hi.yft">HI</span>
                  <span class="pb-model-pip pb-model-pip--miss" id="pbemp-${v.vehicle_id}-ytd"  title="${v.vehicle_id}.ytd">YTD</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div id="pbeMergeWarnings" class="pb-warnings" hidden></div>

          <div id="pbeProgress" class="pb-export-progress" hidden></div>

        </div>

        <div class="pb-modal-footer">
          <span id="pbeFileCount" class="pb-upload-status">No model files added yet</span>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="secondary" id="pbeMetaOnlyBtn" type="button" title="Export OIV with meta files only — add model files manually in OpenIV later">⬇ Meta Only</button>
            <button class="btn-orange" id="pbeExportBtn" type="button">Export .OIV</button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(el);
    return el;
  }

  function updatePip(vehicleId, type, ready) {
    const pip = document.getElementById(`pbemp-${vehicleId}-${type}`);
    if (!pip) return;
    pip.className = ready ? 'pb-model-pip pb-model-pip--ok' : 'pb-model-pip pb-model-pip--miss';
  }

  // ── Export orchestration ───────────────────────────────────────────────────

  async function runExport(pack, vehicles, modelFiles, overlay) {
    const progressEl = overlay.querySelector('#pbeProgress');
    const warningsEl = overlay.querySelector('#pbeMergeWarnings');
    const exportBtn  = overlay.querySelector('#pbeExportBtn');

    function setProgress(msg, color) {
      progressEl.hidden = false;
      progressEl.textContent = msg;
      progressEl.style.color = color || '';
    }

    exportBtn.disabled = true;
    warningsEl.hidden = true;

    try {
      // 1. Fetch all meta
      const metaByVehicle = {};
      const allWarnings = [];

      for (const v of vehicles) {
        setProgress(`Fetching meta: ${v.vehicle_id}…`);
        const meta = await fetchVehicleMeta(v.vehicle_id);
        metaByVehicle[v.vehicle_id] = meta;

        for (const type of ['vehicles', 'handling', 'carcols', 'carvariations']) {
          const entry = meta[type];
          if (!entry?.raw_xml) {
            allWarnings.push({ vid: v.vehicle_id, type, msg: 'Not uploaded — will be skipped' });
          } else if (entry.status === 'error') {
            allWarnings.push({ vid: v.vehicle_id, type, msg: entry.warnings?.[0] || 'Validation error' });
          } else if (entry.warnings?.length) {
            entry.warnings.forEach(w => allWarnings.push({ vid: v.vehicle_id, type, msg: w }));
          }
        }
      }

      // 2. Block on missing required meta (carcols is optional)
      const REQUIRED_EXPORT = ['vehicles', 'handling', 'carvariations'];
      const missing = vehicles.filter(v =>
        REQUIRED_EXPORT.some(t => !metaByVehicle[v.vehicle_id]?.[t]?.raw_xml)
      );
      if (missing.length) {
        throw new Error(
          `Missing meta files for: ${missing.map(v => v.vehicle_id).join(', ')}. ` +
          'Open the meta modal and upload vehicles, handling, and carvariations for each vehicle.'
        );
      }

      // 3. Merge all meta
      setProgress('Merging vehicles.meta…');
      const vehiclesXml = mergeVehiclesMeta(
        vehicles.map(v => metaByVehicle[v.vehicle_id].vehicles.raw_xml)
      );

      setProgress('Merging handling.meta…');
      const handlingXml = mergeHandlingMeta(
        vehicles.map(v => metaByVehicle[v.vehicle_id].handling.raw_xml)
      );

      setProgress('Merging carcols.meta (renaming kit IDs)…');
      // Only include vehicles that actually have a carcols entry (it's optional)
      const carcolsRows = vehicles
        .filter(v => metaByVehicle[v.vehicle_id].carcols?.raw_xml)
        .map(v => ({
          vehicleId: v.vehicle_id,
          rawXml:    metaByVehicle[v.vehicle_id].carcols.raw_xml,
          kitName:   metaByVehicle[v.vehicle_id].carcols.kit_name,
        }));
      const { xml: carcolsXml, kitRenameMap } = mergeCarcolsMeta(carcolsRows);

      setProgress('Merging carvariations.meta…');
      const carvarsRows = vehicles.map(v => ({
        vehicleId: v.vehicle_id,
        rawXml:    metaByVehicle[v.vehicle_id].carvariations.raw_xml,
      }));
      const carvariationsXml = mergeCarvariationsMeta(carvarsRows, kitRenameMap);

      // 4. Show any warnings (non-blocking)
      if (allWarnings.length) {
        warningsEl.hidden = false;
        warningsEl.innerHTML =
          `<strong>⚠ ${allWarnings.length} merge warning${allWarnings.length !== 1 ? 's' : ''}</strong>` +
          `<ul>${allWarnings.map(w =>
            `<li><code>${w.vid}</code> [${w.type}] — ${w.msg}</li>`
          ).join('')}</ul>`;
      }

      // 5. Build and download
      setProgress('Building .oiv package…');
      const mergedMeta = {
        vehicles:      vehiclesXml,
        handling:      handlingXml,
        carcols:       carcolsXml,
        carvariations: carvariationsXml,
      };

      const blob = await buildOiv(
        pack, vehicles, mergedMeta, modelFiles, kitRenameMap, setProgress
      );

      // 6. Trigger download
      const metaOnly = Object.keys(modelFiles).length === 0;
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = metaOnly ? `${pack.dlc_name}-meta-only.oiv` : `${pack.dlc_name}.oiv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setProgress(`✓ ${pack.dlc_name}.oiv downloaded! See INSTALL_NOTES.txt inside the package.`, '#4ade80');

    } catch (err) {
      setProgress(`✗ ${err.message}`, '#fca5a5');
      exportBtn.disabled = false;
    }
  }

  // ── Entry point ────────────────────────────────────────────────────────────

  window.pbExport = function (pack, vehicles, _metaCache) {
    const modelFiles = {}; // { 'sultan.yft': ArrayBuffer, ... } — read immediately on drop

    const overlay = createOverlay(pack, vehicles);

    // ── Close ──
    overlay.querySelector('#pbeClose').addEventListener('click', () => overlay.remove());

    // ── File handling ──
    // Read ArrayBuffers immediately — browser revokes File access after drag session ends
    async function handleFiles(fileList) {
      for (const file of fileList) {
        const name = file.name.toLowerCase();
        if (!name.endsWith('.yft') && !name.endsWith('.ytd')) continue;

        modelFiles[name] = await file.arrayBuffer();

        // Update pip
        const base = name.replace(/_hi\.yft$/, '').replace(/\.(yft|ytd)$/, '');
        if (name.endsWith('_hi.yft'))  updatePip(base, 'hi',  true);
        else if (name.endsWith('.yft')) updatePip(base, 'yft', true);
        else if (name.endsWith('.ytd')) updatePip(base, 'ytd', true);
      }

      const count = Object.keys(modelFiles).length;
      overlay.querySelector('#pbeFileCount').textContent =
        count === 0 ? 'No model files added yet' : `${count} model file${count !== 1 ? 's' : ''} ready`;
    }

    // Drop zone
    const dropZone = overlay.querySelector('#pbeDropZone');
    const fileInput = overlay.querySelector('#pbeFileInput');

    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });

    overlay.querySelector('#pbeBrowseBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });

    // ── Export ──
    overlay.querySelector('#pbeExportBtn').addEventListener('click', () => {
      runExport(pack, vehicles, modelFiles, overlay);
    });

    // ── Meta-only export (no model files) ──
    overlay.querySelector('#pbeMetaOnlyBtn').addEventListener('click', () => {
      runExport(pack, vehicles, {}, overlay);
    });
  };

})();
