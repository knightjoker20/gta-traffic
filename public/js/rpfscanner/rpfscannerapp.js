// =====================================================
// GTA Traffic Vehicle Library - RPF DLC Folder Scanner
// Lets the user point at a local mods/DLC folder, reads the
// real .rpf archives inside it (via RpfParser), and marks
// matching library vehicles as installed - the same way the
// existing loose .yft/.ytd drop scanner does, just sourced
// from inside real archives instead of a flat file list.
// =====================================================

(() => {
  "use strict";

  const store = window.vehicleLibraryStore;

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  async function walkDirectoryForRpf(dirHandle, pathPrefix, out) {
    for await (const [name, handle] of dirHandle.entries()) {
      const path = pathPrefix ? `${pathPrefix}/${name}` : name;
      if (handle.kind === "directory") {
        await walkDirectoryForRpf(handle, path, out);
      } else if (/\.rpf$/i.test(name)) {
        out.push({ path, handle });
      }
    }
  }

  // A DLC scan always SETS installed=true for everything it finds - it never
  // flips a vehicle back to not-installed just because it ran twice (unlike
  // the loose .yft/.ytd drop zone above, which is a manual on/off toggle by
  // design). Re-scanning the same folder repeatedly must be a safe no-op.
  //
  // If a scanned model isn't already in the local Vehicle Library, a minimal
  // record is created for it (enriched with vehicles.meta and handling.meta
  // data pulled from inside the archive, when present) rather than being
  // silently dropped - otherwise a mostly-empty local library would make this
  // scanner look like it does nothing at all.
  async function markMatchedInstalled(modelIds, sourceLabel, filesByIdMap, metaByIdMap, handlingDataMap) {
    const currentMap = new Map((await store.getVehicles()).map(vehicle => [vehicle.id, vehicle]));
    const updated = [];
    const installed = [];
    const created = [];
    const handlingProfilesToStore = new Map();
    const today = new Date().toISOString().slice(0, 10);

    modelIds.forEach(id => {
      let vehicle = currentMap.get(id);
      const meta = metaByIdMap.get(id);

      // Resolve handling profile for this vehicle via its handlingId
      const handlingKey = (meta?.handlingId || "").toLowerCase();
      const handlingProfile = handlingKey ? handlingDataMap.get(handlingKey) : null;
      if (handlingProfile && !handlingProfilesToStore.has(handlingProfile.id)) {
        handlingProfilesToStore.set(handlingProfile.id, handlingProfile);
      }

      if (!vehicle) {
        vehicle = {
          id,
          modelName: meta?.modelName || id,
          gameName: meta?.gameName || meta?.modelName || id,
          vehiclesMeta: {
            modelName: meta?.modelName || id,
            handlingId: meta?.handlingId || "",
            gameName: meta?.gameName || "",
            vehicleMakeName: meta?.vehicleMakeName || "",
            vehicleClass: meta?.vehicleClass || "",
            vehicleType: meta?.vehicleType || ""
          },
          custom: {},
          createdAt: new Date().toISOString()
        };
        created.push(vehicle.modelName || id);
      } else if (meta) {
        // Enrich existing entry — only fill in fields that are currently blank
        vehicle.vehiclesMeta = vehicle.vehiclesMeta || {};
        if (!vehicle.vehiclesMeta.handlingId && meta.handlingId)
          vehicle.vehiclesMeta.handlingId = meta.handlingId;
        if (!vehicle.vehiclesMeta.gameName && meta.gameName)
          vehicle.vehiclesMeta.gameName = meta.gameName;
        if (!vehicle.vehiclesMeta.vehicleMakeName && meta.vehicleMakeName)
          vehicle.vehiclesMeta.vehicleMakeName = meta.vehicleMakeName;
        if (!vehicle.vehiclesMeta.vehicleClass && meta.vehicleClass)
          vehicle.vehiclesMeta.vehicleClass = meta.vehicleClass;
      }

      vehicle.custom = vehicle.custom || {};
      vehicle.custom.installed = true;
      vehicle.custom.installDate = vehicle.custom.installDate || today;
      vehicle.custom.lastInstallScanFiles = filesByIdMap.get(id) || [];
      vehicle.custom.lastInstallScanAt = new Date().toISOString();
      vehicle.custom.installSource = sourceLabel;
      vehicle.updatedAt = new Date().toISOString();

      updated.push(vehicle);
      installed.push(vehicle.modelName || vehicle.id);
    });

    if (updated.length) await store.putVehicles(updated);

    // Persist handling profiles discovered inside the archives
    const profilesToSave = [...handlingProfilesToStore.values()];
    if (profilesToSave.length) await store.putHandlingProfiles(profilesToSave);

    return { installed, created, handlingLinked: profilesToSave.length };
  }

  function renderScanResult(summary) {
    const host = el("vlInstallScanResult");
    if (!host) return;

    const warnings = summary.warnings || [];
    const metaWarnings = summary.metaWarnings || [];

    const metaStatLine = (summary.metaFilesFound > 0)
      ? `<div class="vl-scan-meta-stat">${summary.metaFilesParsed ?? 0} / ${summary.metaFilesFound} vehicles.meta files yielded model data</div>`
      : '';

    host.innerHTML = `
      <div class="vl-scan-summary">
        <div><strong>${summary.installed.length}</strong><span>Marked installed</span></div>
        <div><strong>${summary.created.length}</strong><span>New library entries added</span></div>
        <div><strong>${summary.handlingLinked ?? 0}</strong><span>Handling profiles linked</span></div>
        <div><strong>${summary.archiveCount}</strong><span>Archives read</span></div>
        <div><strong>${summary.filesScanned}</strong><span>${escapeHTML(summary.fileLabel || "Files scanned")}</span></div>
      </div>
      ${metaStatLine}
      ${summary.extraNote ? `<div class="vl-scan-warning">${escapeHTML(summary.extraNote)}</div>` : ""}
      ${metaWarnings.length ? `<div class="vl-scan-warning vl-scan-warning--meta"><strong>⚠ Meta file issues (${metaWarnings.length}):</strong><br>${metaWarnings.map(escapeHTML).join("<br>")}</div>` : ""}
      ${!summary.installed.length && !warnings.length && !metaWarnings.length ? `<div class="vl-scan-warning">No .yft/.ytd model files were found inside those archives. If this folder only holds non-vehicle DLC (peds, maps, etc.), that's expected.</div>` : ""}
      ${warnings.length ? `<div class="vl-scan-warning"><strong>Notes:</strong><br>${warnings.slice(0, 8).map(escapeHTML).join("<br>")}${warnings.length > 8 ? `<br>and ${warnings.length - 8} more` : ""}</div>` : ""}
      ${summary.installed.length ? `<button type="button" class="secondary" onclick="location.reload()">Refresh Vehicle Grid</button>` : ""}
    `;
  }

  // Shared core: scan an array of { path, handle } archive entries and write results to the library.
  async function scanArchiveList(archiveHandles, sourceLabel, button) {
    const modelIds = new Set();
    const filesByIdMap = new Map();
    const metaByIdMap = new Map();
    const handlingDataMap = new Map();
    const allWarnings = [];
    const allMetaWarnings = [];
    let encryptedSkipped = 0;
    let archiveCount = 0;
    let metaFilesFound = 0;
    let metaFilesParsed = 0;

    for (let i = 0; i < archiveHandles.length; i++) {
      const { path, handle } = archiveHandles[i];
      button.textContent = `Scanning ${i + 1} of ${archiveHandles.length}...`;

      try {
        const file = await handle.getFile();
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const result = await window.RpfParser.scanArchiveBuffer(bytes, path, {
          readVehiclesMeta: true,
          readHandlingMeta: true
        });

        archiveCount += result.archiveCount;
        encryptedSkipped += result.encryptedSkipped;
        metaFilesFound  += result.metaFilesFound  || 0;
        metaFilesParsed += result.metaFilesParsed || 0;
        allWarnings.push(...result.warnings);
        allMetaWarnings.push(...(result.metaWarnings || []));

        result.modelAssets.forEach((asset, modelId) => {
          const id = store.normalizeId(modelId);
          modelIds.add(id);
          if (!filesByIdMap.has(id)) filesByIdMap.set(id, []);
          filesByIdMap.get(id).push(...asset.files);
        });

        result.metaModels.forEach(meta => {
          const id = store.normalizeId(meta.modelName);
          metaByIdMap.set(id, meta);
          modelIds.add(id);
        });

        result.handlingData.forEach((profile, handlingId) => {
          handlingDataMap.set(handlingId, profile);
        });
      } catch (error) {
        allWarnings.push(`${path}: could not be read (${error.message}).`);
      }
    }

    button.textContent = "Matching against your library...";
    const { installed, created, handlingLinked } = await markMatchedInstalled(
      modelIds,
      sourceLabel,
      filesByIdMap,
      metaByIdMap,
      handlingDataMap
    );

    renderScanResult({
      installed,
      created,
      handlingLinked,
      archiveCount,
      metaFilesFound,
      metaFilesParsed,
      metaWarnings: allMetaWarnings,
      filesScanned: archiveHandles.length,
      fileLabel: "Archives scanned",
      warnings: allWarnings,
      extraNote: encryptedSkipped
        ? `${encryptedSkipped} encrypted archive${encryptedSkipped === 1 ? "" : "s"} were skipped (likely official Rockstar content) - no decryption is performed by this tool.`
        : ""
    });
  }

  // ── Multi-folder queue ──────────────────────────────────────────────
  // The browser only allows one directory picker call at a time, so folders
  // are collected into a queue first, then all scanned together in one pass.

  const pendingFolders = [];

  function setRpfButtonsDisabled(disabled) {
    ["vlRpfAddFolderButton", "vlRpfFilesButton"].forEach(id => {
      const btn = el(id);
      if (btn) btn.disabled = disabled;
    });
    const scanBtn = el("vlRpfScanAllButton");
    if (scanBtn) scanBtn.disabled = disabled;
  }

  function renderFolderQueue() {
    const host = el("vlRpfFolderQueue");
    if (!host) return;

    if (!pendingFolders.length) {
      host.classList.add("vl-hidden");
      host.innerHTML = "";
      return;
    }

    host.classList.remove("vl-hidden");
    host.innerHTML = `
      <ul class="vl-rpf-folder-list">
        ${pendingFolders.map((folder, i) => `
          <li class="vl-rpf-folder-item">
            <span class="vl-rpf-folder-name">📁 ${escapeHTML(folder.name)}</span>
            <button type="button" class="vl-rpf-folder-remove" data-index="${i}" aria-label="Remove ${escapeHTML(folder.name)}">✕</button>
          </li>
        `).join("")}
      </ul>
      <div class="vl-rpf-queue-actions">
        <button id="vlRpfScanAllButton" class="btn-orange" type="button">
          Scan ${pendingFolders.length} folder${pendingFolders.length === 1 ? "" : "s"}
        </button>
        <button id="vlRpfClearFoldersButton" class="secondary vl-rpf-clear" type="button">Clear</button>
      </div>
    `;

    host.querySelectorAll(".vl-rpf-folder-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        pendingFolders.splice(Number(btn.dataset.index), 1);
        renderFolderQueue();
      });
    });

    el("vlRpfScanAllButton")?.addEventListener("click", runAllFolderScans);
    el("vlRpfClearFoldersButton")?.addEventListener("click", () => {
      pendingFolders.length = 0;
      renderFolderQueue();
    });
  }

  async function addFolderToQueue() {
    if (!window.RpfParser) {
      el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">The RPF parser script did not load.</div>`;
      return;
    }
    if (typeof window.showDirectoryPicker !== "function") {
      el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">Your browser does not support folder scanning. Use Chrome, Edge, Opera, Brave, or another Chromium-based browser.</div>`;
      return;
    }

    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker({ id: "gta-traffic-dlc-scan", mode: "read" });
    } catch {
      return; // cancelled
    }

    if (pendingFolders.some(f => f.name === dirHandle.name)) {
      el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">"${escapeHTML(dirHandle.name)}" is already in the queue.</div>`;
      return;
    }

    pendingFolders.push({ name: dirHandle.name, handle: dirHandle });
    renderFolderQueue();
  }

  async function runAllFolderScans() {
    if (!pendingFolders.length) return;

    setRpfButtonsDisabled(true);
    const scanBtn = el("vlRpfScanAllButton");
    const addBtn = el("vlRpfAddFolderButton");
    const folderNames = pendingFolders.map(f => f.name).join(", ");

    try {
      if (scanBtn) scanBtn.textContent = "Finding .rpf files...";

      const archiveHandles = [];
      for (const folder of pendingFolders) {
        await walkDirectoryForRpf(folder.handle, folder.name, archiveHandles);
      }

      if (!archiveHandles.length) {
        el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">No .rpf files were found in those folders.</div>`;
        return;
      }

      await scanArchiveList(archiveHandles, `RPF scan: ${folderNames}`, scanBtn || addBtn);

      // Clear queue on success
      pendingFolders.length = 0;
      renderFolderQueue();
    } catch (error) {
      console.error(error);
      el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">Scan failed: ${escapeHTML(error.message || String(error))}</div>`;
    } finally {
      setRpfButtonsDisabled(false);
      renderFolderQueue(); // resets scan button text
    }
  }

  async function runRpfFilesScan() {
    const button = el("vlRpfFilesButton");
    if (!button) return;

    if (!window.RpfParser) {
      el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">The RPF parser script did not load.</div>`;
      return;
    }
    if (typeof window.showOpenFilePicker !== "function") {
      el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">Your browser does not support file picking. Use Chrome or Edge.</div>`;
      return;
    }

    let fileHandles;
    try {
      fileHandles = await window.showOpenFilePicker({
        id: "gta-traffic-rpf-files",
        multiple: true,
        types: [{ description: "RPF archives", accept: { "application/octet-stream": [".rpf"] } }]
      });
    } catch (error) {
      return; // user cancelled
    }

    if (!fileHandles.length) return;

    const archiveHandles = fileHandles.map(handle => ({ path: handle.name, handle }));
    const originalLabel = button.textContent;
    button.disabled = true;
    el("vlRpfAddFolderButton") && (el("vlRpfAddFolderButton").disabled = true);

    try {
      await scanArchiveList(archiveHandles, `RPF files: ${fileHandles.map(h => h.name).join(", ")}`, button);
    } catch (error) {
      console.error(error);
      el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">Scan failed: ${escapeHTML(error.message || String(error))}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
      el("vlRpfAddFolderButton") && (el("vlRpfAddFolderButton").disabled = false);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!store) return;
    el("vlRpfAddFolderButton")?.addEventListener("click", addFolderToQueue);
    el("vlRpfFilesButton")?.addEventListener("click", runRpfFilesScan);
  });
})();
