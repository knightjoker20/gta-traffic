// =====================================================
// VEHICLE LOD + STREAMING LOAD TRACKER
//
// Scans file names and file sizes from .yft and .ytd files.
// It does not upload or inspect binary model contents.
//
// Calibration:
// - Adder example: about 1.96 MB total
// - Topcar 720 example: about 56.8 MB total
// =====================================================

const LOAD_TIERS = [
  { maxMb: 3, label: "Vanilla", cssClass: "rating-vanilla" },
  { maxMb: 8, label: "Light", cssClass: "rating-light" },
  { maxMb: 20, label: "Moderate", cssClass: "rating-moderate" },
  { maxMb: 40, label: "Heavy", cssClass: "rating-heavy" },
  { maxMb: 60, label: "Extreme", cssClass: "rating-extreme" },
  { maxMb: Infinity, label: "Critical", cssClass: "rating-critical" }
];

function setupAssetDropZone(zone) {
  zone.addEventListener("dragover", event => {
    event.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", event => {
    event.preventDefault();
    zone.classList.remove("dragover");

    const files = Array.from(event.dataTransfer.files);
    scanVehicleAssetFiles(files);
  });
}

function scanVehicleAssetFiles(files) {
  const supported = files.filter(file => /\.(yft|ytd)$/i.test(file.name));

  if (!supported.length) {
    setAssetStatus("No .yft or .ytd files were found.", true);
    return;
  }

  const batch = {};
  const sharedFiles = [];
  let acceptedFiles = 0;

  supported.forEach(file => {
    const parsed = parseVehicleAssetFileName(file.name);

    if (!parsed) return;

    acceptedFiles++;

    const fileInfo = {
      name: file.name,
      size: file.size,
      path: file.webkitRelativePath || file.name
    };

    if (parsed.shared) {
      sharedFiles.push(fileInfo);
      return;
    }

    if (!batch[parsed.model]) {
      batch[parsed.model] = createEmptyAssetRecord(parsed.model);
    }

    batch[parsed.model][parsed.slot] = fileInfo;
  });

  let addedVehicles = 0;
  let updatedVehicles = 0;

  Object.entries(batch).forEach(([model, incoming]) => {
    const existing = vehicleAssets[model];

    if (existing) {
      updatedVehicles++;
      vehicleAssets[model] = {
        ...existing,
        ...removeNullAssetSlots(incoming),
        modelName: model,
        scannedAt: new Date().toISOString()
      };
    } else {
      addedVehicles++;
      vehicleAssets[model] = {
        ...incoming,
        scannedAt: new Date().toISOString()
      };
    }

    recalculateAssetRecord(vehicleAssets[model]);
  });

  if (sharedFiles.length) {
    const sharedByPath = new Map(
      sharedAssetFiles.map(file => [file.path || file.name, file])
    );

    sharedFiles.forEach(file => sharedByPath.set(file.path || file.name, file));
    sharedAssetFiles = Array.from(sharedByPath.values());
  }

  saveVehicleAssetDatabase();

  setAssetStatus(
    `Scanned ${acceptedFiles} files. Added ${addedVehicles} vehicles, updated ${updatedVehicles}. ` +
    `Shared texture files: ${sharedFiles.length}.`
  );

  renderAssetSummary();
  renderSection(currentSection);
  renderVehicleLibrary();
}

function parseVehicleAssetFileName(fileName) {
  const baseName = fileName.replace(/^.*[\\/]/, "");
  const lower = baseName.toLowerCase();

  if (!/\.(yft|ytd)$/.test(lower)) return null;

  // Generic/shared texture dictionaries are tracked separately.
  if (lower.startsWith("vehicles_") && lower.endsWith(".ytd")) {
    return {
      shared: true,
      model: "",
      slot: "shared"
    };
  }

  if (lower.endsWith("_hi.yft")) {
    return {
      shared: false,
      model: lower.slice(0, -7),
      slot: "hiYft"
    };
  }

  if (lower.endsWith(".yft")) {
    return {
      shared: false,
      model: lower.slice(0, -4),
      slot: "baseYft"
    };
  }

  if (lower.endsWith("+hi.ytd")) {
    return {
      shared: false,
      model: lower.slice(0, -7),
      slot: "hiYtd"
    };
  }

  if (lower.endsWith("_hi.ytd")) {
    return {
      shared: false,
      model: lower.slice(0, -7),
      slot: "hiYtd"
    };
  }

  if (lower.endsWith(".ytd")) {
    return {
      shared: false,
      model: lower.slice(0, -4),
      slot: "baseYtd"
    };
  }

  return null;
}

function createEmptyAssetRecord(model) {
  return {
    modelName: model,
    baseYft: null,
    hiYft: null,
    baseYtd: null,
    hiYtd: null,
    modelBytes: 0,
    textureBytes: 0,
    totalBytes: 0,
    scannedAt: new Date().toISOString()
  };
}

function removeNullAssetSlots(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([key, value]) => {
      if (["baseYft", "hiYft", "baseYtd", "hiYtd"].includes(key)) {
        return Boolean(value);
      }
      return true;
    })
  );
}

function recalculateAssetRecord(record) {
  record.modelBytes =
    getFileSize(record.baseYft) +
    getFileSize(record.hiYft);

  record.textureBytes =
    getFileSize(record.baseYtd) +
    getFileSize(record.hiYtd);

  record.totalBytes = record.modelBytes + record.textureBytes;
}

function getFileSize(fileInfo) {
  return fileInfo && Number.isFinite(fileInfo.size) ? fileInfo.size : 0;
}

function getVehicleAsset(model) {
  return vehicleAssets[String(model).toLowerCase()] || null;
}

function getLoadTier(totalBytes) {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return {
      label: "Unknown",
      cssClass: "rating-unknown",
      maxMb: 0
    };
  }

  const mb = bytesToMb(totalBytes);
  return LOAD_TIERS.find(tier => mb <= tier.maxMb) || LOAD_TIERS.at(-1);
}

function getVehicleLoadInfo(model) {
  const key = String(model).toLowerCase();
  const asset = vehicleAssets[key] || null;
  const meta = vehicleMeta[key] || null;
  const tier = getLoadTier(asset ? asset.totalBytes : 0);

  return {
    model: key,
    asset,
    meta,
    tier,
    warnings: buildVehicleWarnings(asset, meta)
  };
}

function buildVehicleWarnings(asset, meta) {
  const warnings = [];

  if (!asset) {
    warnings.push("Vehicle files have not been scanned");
  } else {
    if (!asset.baseYft) warnings.push("Base YFT not detected");
    if (!asset.hiYft) warnings.push("Separate HI model not detected");
    if (!asset.baseYtd && !asset.hiYtd) {
      warnings.push("Texture dictionary not detected in scan");
    }

    if (bytesToMb(asset.modelBytes) > 16) {
      warnings.push("Extreme combined model-file load");
    } else if (bytesToMb(asset.modelBytes) > 8) {
      warnings.push("Heavy combined model-file load");
    }

    if (bytesToMb(asset.textureBytes) > 16) {
      warnings.push("Extreme texture-dictionary load");
    } else if (bytesToMb(asset.textureBytes) > 8) {
      warnings.push("Heavy texture-dictionary load");
    }

    if (bytesToMb(asset.totalBytes) > 40) {
      warnings.push("High GTA streaming-risk vehicle");
    }
  }

  if (!meta) {
    warnings.push("No vehicles.meta match");
  } else if (!Array.isArray(meta.lodDistances) || !meta.lodDistances.length) {
    warnings.push("LOD distance values unavailable");
  }

  return warnings;
}

function bytesToMb(bytes) {
  return bytes / (1024 * 1024);
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Not detected";

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024).toLocaleString()} KB`;
  }

  return `${bytesToMb(bytes).toFixed(2)} MB`;
}

function formatLodDistances(values) {
  if (!Array.isArray(values) || !values.length) return "Not available";

  return values
    .map(value => Number.isInteger(value) ? String(value) : value.toFixed(1))
    .join(" / ");
}

function renderLoadBadge(tier) {
  return `<span class="load-badge ${tier.cssClass}">${escapeHTML(tier.label)}</span>`;
}

function renderLodBox(model) {
  const info = getVehicleLoadInfo(model);
  const asset = info.asset;
  const meta = info.meta;

  if (!asset && !meta) {
    return `
      <div class="lod-box">
        <div class="lod-box-header">
          <strong>LOD / Streaming</strong>
          ${renderLoadBadge(info.tier)}
        </div>
        <div class="small">Scan YFT/YTD files and load vehicles.meta for details.</div>
      </div>
    `;
  }

  return `
    <div class="lod-box">
      <div class="lod-box-header">
        <strong>LOD / Streaming</strong>
        ${renderLoadBadge(info.tier)}
      </div>

      <div class="lod-size-row"><span>Base YFT</span><strong>${formatFileSize(asset?.baseYft?.size || 0)}</strong></div>
      <div class="lod-size-row"><span>HI YFT</span><strong>${formatFileSize(asset?.hiYft?.size || 0)}</strong></div>
      <div class="lod-size-row"><span>YTD</span><strong>${formatFileSize(asset?.baseYtd?.size || 0)}</strong></div>
      ${asset?.hiYtd
        ? `<div class="lod-size-row"><span>HI YTD</span><strong>${formatFileSize(asset.hiYtd.size)}</strong></div>`
        : ""}
      <div class="lod-size-row"><span>Total</span><strong>${formatFileSize(asset?.totalBytes || 0)}</strong></div>

      <div class="lod-distance-line">
        <strong>LOD distances:</strong> ${escapeHTML(formatLodDistances(meta?.lodDistances))}
      </div>

      ${info.warnings.length
        ? `<ul class="lod-warning-list">${info.warnings.map(warning => `<li>${escapeHTML(warning)}</li>`).join("")}</ul>`
        : ""}
    </div>
  `;
}

function renderCompactLodBox(model) {
  const info = getVehicleLoadInfo(model);

  return `
    <div class="lod-compact">
      <span>${formatFileSize(info.asset?.totalBytes || 0)}</span>
      ${renderLoadBadge(info.tier)}
    </div>
  `;
}

function getGroupAssetSummary(models) {
  const uniqueModels = Array.from(new Set(models.map(model => model.toLowerCase())));
  const known = uniqueModels
    .map(model => getVehicleAsset(model))
    .filter(Boolean);

  const counts = {
    "Vanilla-like": 0,
    "Light": 0,
    "Moderate": 0,
    "Heavy": 0,
    "Extreme": 0,
    "Critical": 0
  };

  known.forEach(asset => {
    const tier = getLoadTier(asset.totalBytes);
    if (counts[tier.label] !== undefined) counts[tier.label]++;
  });

  const totalBytes = known.reduce((sum, asset) => sum + asset.totalBytes, 0);
  const averageBytes = known.length ? totalBytes / known.length : 0;
  const largest = known.reduce(
    (current, asset) => !current || asset.totalBytes > current.totalBytes ? asset : current,
    null
  );

  let riskLabel = "Low";
  let riskClass = "risk-low";

  if (
    counts.Critical > 0 ||
    counts.Extreme >= 3 ||
    bytesToMb(averageBytes) > 25
  ) {
    riskLabel = "High";
    riskClass = "risk-high";
  } else if (
    counts.Extreme > 0 ||
    counts.Heavy >= 5 ||
    bytesToMb(averageBytes) > 12
  ) {
    riskLabel = "Elevated";
    riskClass = "risk-elevated";
  } else if (
    counts.Heavy > 0 ||
    counts.Moderate >= 10 ||
    bytesToMb(averageBytes) > 6
  ) {
    riskLabel = "Moderate";
    riskClass = "risk-moderate";
  }

  return {
  uniqueCount: uniqueModels.length,
  knownCount: known.length,
  totalBytes,
  averageBytes,
  largest,
  counts,
  riskLabel,
  riskClass
};

}

function renderGroupLoadSummary(models) {
  const summary = getGroupAssetSummary(models);

  if (!summary.knownCount) {
    return `
      <span class="group-load-summary">
        <span class="group-risk rating-unknown">Load unknown</span>
      </span>
    `;
  }

  return `
    <span class="group-load-summary">
      <span class="group-risk ${summary.riskClass}">${summary.riskLabel} streaming risk</span>
      <span class="count">Total ${formatFileSize(summary.totalBytes)}</span>
      <span class="count">Avg ${formatFileSize(summary.averageBytes)}</span>
      ${summary.counts.Extreme + summary.counts.Critical > 0
        ? `<span class="warning">${summary.counts.Extreme + summary.counts.Critical} extreme/critical</span>`
        : ""}
    </span>
  `;
}

function renderAssetSummary() {
  if (!els.assetSummary) return;

  const assets = Object.values(vehicleAssets);
  const totalBytes = assets.reduce((sum, asset) => sum + (asset.totalBytes || 0), 0);

  const tierCounts = {
    "Vanilla-like": 0,
    "Light": 0,
    "Moderate": 0,
    "Heavy": 0,
    "Extreme": 0,
    "Critical": 0
  };

  let missingHi = 0;
  let missingTexture = 0;

  assets.forEach(asset => {
    const tier = getLoadTier(asset.totalBytes);
    if (tierCounts[tier.label] !== undefined) tierCounts[tier.label]++;

    if (!asset.hiYft) missingHi++;
    if (!asset.baseYtd && !asset.hiYtd) missingTexture++;
  });

  els.assetSummary.innerHTML = `
    <div class="asset-summary-grid">
      ${renderAssetStat("Scanned vehicles", assets.length)}
      ${renderAssetStat("Known library size", formatFileSize(totalBytes))}
      ${renderAssetStat("Vanilla-like", tierCounts["Vanilla"])}
      ${renderAssetStat("Light", tierCounts.Light)}
      ${renderAssetStat("Moderate", tierCounts.Moderate)}
      ${renderAssetStat("Heavy", tierCounts.Heavy)}
      ${renderAssetStat("Extreme", tierCounts.Extreme)}
      ${renderAssetStat("Critical", tierCounts.Critical)}
      ${renderAssetStat("No separate HI", missingHi)}
      ${renderAssetStat("No texture detected", missingTexture)}
      ${renderAssetStat("Shared YTD files", sharedAssetFiles.length)}
    </div>
  `;
}

function renderAssetStat(label, value) {
  return `
    <div class="asset-stat">
      <small>${escapeHTML(label)}</small>
      <strong>${escapeHTML(value)}</strong>
    </div>
  `;
}

function saveVehicleAssetDatabase() {
  const data = {
    version: 1,
    vehicleAssets,
    sharedAssetFiles,
    savedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error(error);
    setAssetStatus(
      "The browser could not save the asset database. Export a JSON backup.",
      true
    );
  }
}

function loadVehicleAssetDatabase() {
  const raw = localStorage.getItem(ASSET_STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    vehicleAssets = data.vehicleAssets || {};
    sharedAssetFiles = data.sharedAssetFiles || [];

    Object.values(vehicleAssets).forEach(recalculateAssetRecord);
  } catch (error) {
    console.warn("Could not load vehicle asset database.", error);
  }
}

function downloadVehicleAssetDatabase() {
  const data = {
    version: 1,
    vehicleAssets,
    sharedAssetFiles,
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "gta_traffic_vehicle_asset_database.json";
  anchor.click();

  URL.revokeObjectURL(url);
}

function importVehicleAssetDatabase(file) {
  const reader = new FileReader();

  reader.onload = event => {
    try {
      const data = JSON.parse(event.target.result);

      if (!data.vehicleAssets) {
        alert("This is not a valid vehicle asset database.");
        return;
      }

      vehicleAssets = data.vehicleAssets;
      sharedAssetFiles = data.sharedAssetFiles || [];

      Object.values(vehicleAssets).forEach(recalculateAssetRecord);

      saveVehicleAssetDatabase();
      setAssetStatus(
        `Imported ${Object.keys(vehicleAssets).length} vehicle asset records.`
      );

      renderAssetSummary();
      renderSection(currentSection);
      renderVehicleLibrary();
    } catch (error) {
      console.error(error);
      alert("Could not import the vehicle asset database.");
    }
  };

  reader.readAsText(file);
}

function clearVehicleAssetDatabase() {
  if (!confirm("Clear all scanned vehicle file-size data?")) return;

  vehicleAssets = {};
  sharedAssetFiles = [];

  localStorage.removeItem(ASSET_STORAGE_KEY);

  setAssetStatus("Vehicle asset database cleared.");
  renderAssetSummary();
  renderSection(currentSection);
  renderVehicleLibrary();
}

function setAssetStatus(message, isWarning = false) {
  if (!els.assetStatus) return;

  els.assetStatus.innerHTML = isWarning
    ? `<span class="warning">${escapeHTML(message)}</span>`
    : `<span class="saved">${escapeHTML(message)}</span>`;
}
