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
  // record is created for it (enriched with vehicles.meta data pulled from
  // inside the archive, when present) rather than being silently dropped -
  // otherwise a mostly-empty local library would make this scanner look like
  // it does nothing at all.
  async function markMatchedInstalled(modelIds, sourceLabel, filesByIdMap, metaByIdMap) {
    const currentMap = new Map((await store.getVehicles()).map(vehicle => [vehicle.id, vehicle]));
    const updated = [];
    const installed = [];
    const created = [];
    const today = new Date().toISOString().slice(0, 10);

    modelIds.forEach(id => {
      let vehicle = currentMap.get(id);
      const meta = metaByIdMap.get(id);

      if (!vehicle) {
        vehicle = {
          id,
          modelName: meta?.modelName || id,
          gameName: meta?.gameName || meta?.modelName || id,
          vehiclesMeta: {
            modelName: meta?.modelName || id,
            gameName: meta?.gameName || "",
            vehicleMakeName: meta?.vehicleMakeName || ""
          },
          custom: {},
          createdAt: new Date().toISOString()
        };
        created.push(vehicle.modelName || id);
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
    return { installed, created };
  }

  function renderScanResult(summary) {
    const host = el("vlInstallScanResult");
    if (!host) return;

    const warnings = summary.warnings || [];

    host.innerHTML = `
      <div class="vl-scan-summary">
        <div><strong>${summary.installed.length}</strong><span>Marked installed</span></div>
        <div><strong>${summary.created.length}</strong><span>New library entries added</span></div>
        <div><strong>${summary.archiveCount}</strong><span>Archives read</span></div>
        <div><strong>${summary.filesScanned}</strong><span>${escapeHTML(summary.fileLabel || "Files scanned")}</span></div>
      </div>
      ${summary.extraNote ? `<div class="vl-scan-warning">${escapeHTML(summary.extraNote)}</div>` : ""}
      ${!summary.installed.length && !warnings.length ? `<div class="vl-scan-warning">No .yft/.ytd model files were found inside those archives. If this folder only holds non-vehicle DLC (peds, maps, etc.), that's expected.</div>` : ""}
      ${warnings.length ? `<div class="vl-scan-warning"><strong>Notes:</strong><br>${warnings.slice(0, 8).map(escapeHTML).join("<br>")}${warnings.length > 8 ? `<br>and ${warnings.length - 8} more` : ""}</div>` : ""}
      ${summary.installed.length ? `<button type="button" class="secondary" onclick="location.reload()">Refresh Vehicle Grid</button>` : ""}
    `;
  }

  async function runRpfFolderScan() {
    const button = el("vlRpfScanButton");
    if (!button) return;

    if (!window.RpfParser) {
      el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">The RPF parser script did not load.</div>`;
      return;
    }
    if (typeof window.showDirectoryPicker !== "function") {
      el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">Your browser does not support folder scanning (showDirectoryPicker). Use Chrome or Edge, or drop loose .yft/.ytd files above instead.</div>`;
      return;
    }

    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker({ id: "gta-traffic-dlc-scan", mode: "read" });
    } catch (error) {
      return; // user cancelled the picker
    }

    const originalLabel = button.textContent;
    button.disabled = true;

    try {
      button.textContent = "Finding .rpf files...";
      const archiveHandles = [];
      await walkDirectoryForRpf(dirHandle, dirHandle.name, archiveHandles);

      if (!archiveHandles.length) {
        el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">No .rpf files were found in that folder.</div>`;
        return;
      }

      const modelIds = new Set();
      const filesByIdMap = new Map();
      const metaByIdMap = new Map();
      const allWarnings = [];
      let encryptedSkipped = 0;
      let archiveCount = 0;

      for (let i = 0; i < archiveHandles.length; i++) {
        const { path, handle } = archiveHandles[i];
        button.textContent = `Scanning ${i + 1} of ${archiveHandles.length}...`;

        try {
          const file = await handle.getFile();
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const result = await window.RpfParser.scanArchiveBuffer(bytes, path, { readVehiclesMeta: true });

          archiveCount += result.archiveCount;
          encryptedSkipped += result.encryptedSkipped;
          allWarnings.push(...result.warnings);

          result.modelAssets.forEach((asset, modelId) => {
            const id = store.normalizeId(modelId);
            modelIds.add(id);
            if (!filesByIdMap.has(id)) filesByIdMap.set(id, []);
            filesByIdMap.get(id).push(...asset.files);
          });

          result.metaModels.forEach(meta => {
            const id = store.normalizeId(meta.modelName);
            metaByIdMap.set(id, meta);
            modelIds.add(id); // a model found only via vehicles.meta (no loose .yft/.ytd entry) still counts
          });
        } catch (error) {
          allWarnings.push(`${path}: could not be read (${error.message}).`);
        }
      }

      button.textContent = "Matching against your library...";
      const { installed, created } = await markMatchedInstalled(
        modelIds,
        `RPF scan: ${dirHandle.name}`,
        filesByIdMap,
        metaByIdMap
      );

      renderScanResult({
        installed,
        created,
        archiveCount,
        filesScanned: archiveHandles.length,
        fileLabel: "Archives scanned",
        warnings: allWarnings,
        extraNote: encryptedSkipped
          ? `${encryptedSkipped} encrypted archive${encryptedSkipped === 1 ? "" : "s"} were skipped (likely official Rockstar content) - no decryption is performed by this tool.`
          : ""
      });
    } catch (error) {
      console.error(error);
      el("vlInstallScanResult").innerHTML = `<div class="vl-scan-warning">The DLC folder scan failed: ${escapeHTML(error.message || String(error))}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!store) return;
    el("vlRpfScanButton")?.addEventListener("click", runRpfFolderScan);
  });
})();
