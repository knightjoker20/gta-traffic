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
  function mergeVehiclesMeta(rawXmlList) {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<CVehicleModelInfo__InitDataList>',
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
  <colors>
    <headerBackground useBlackTextColor="FALSE">$FF0D1117</headerBackground>
    <iconBackground>$FF1F6B3A</iconBackground>
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
STEP 2 — ADD TO dlclist.xml  (REQUIRED)
═══════════════════════════════════════════════
Location: mods/update/update.rpf/common/data/dlclist.xml

Add this line INSIDE <Paths>, AFTER all existing entries:

  <Item>dlcpacks:/${pack.dlc_name}/</Item>

⚠ Back up dlclist.xml before editing.
⚠ The trailing slash is required.

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
