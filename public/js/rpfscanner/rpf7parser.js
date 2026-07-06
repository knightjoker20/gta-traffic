// =====================================================
// GTA Traffic RPF Scanner - RPF7 Archive Parser
// Reads real .rpf (Rockstar Package File) archives in the
// browser to find installed add-on vehicle model names.
//
// Byte layout confirmed against CodeWalker's open-source
// RpfFile.cs (github.com/dexyfex/CodeWalker), the community
// reference implementation for this format.
//
// Scope: this parser only reads unencrypted archives (the
// kind produced by add-on/mod tools). Official Rockstar-
// shipped archives use AES/NG encryption with proprietary
// keys - this tool does not implement or embed any of that
// key material, and simply skips/flags anything encrypted.
// =====================================================

window.RpfParser = (() => {
  "use strict";

  const MAGIC = 0x52504637; // "RPF7" - GTA V archive signature
  const ENC_NONE = 0;
  const ENC_OPEN = 0x4e45504f; // "OPEN" - unencrypted table of contents
  const DIR_SENTINEL = 0x7fffff00;
  const MAX_NEST_DEPTH = 6;

  function readCString(bytes, start) {
    let end = start;
    while (end < bytes.length && bytes[end] !== 0) end++;
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(start, end));
  }

  async function inflateRawBlock(bytes) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("This browser does not support DecompressionStream.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  }

  function readEntryRawBytes(bytes, archiveStartPos, entry) {
    const pos = archiveStartPos + entry.fileOffsetBlocks * 512;
    const size = entry.fileSize > 0 ? entry.fileSize : entry.uncompressedSize;
    if (!size || pos + size > bytes.length) return null;
    return bytes.subarray(pos, pos + size);
  }

  async function extractBinaryEntryText(bytes, archiveStartPos, entry) {
    if (entry.encryptionType !== 0) return null; // encrypted single file - no decryption performed
    const raw = readEntryRawBytes(bytes, archiveStartPos, entry);
    if (!raw) return null;
    const inflated = entry.fileSize > 0 ? await inflateRawBlock(raw) : raw;
    return new TextDecoder("utf-8", { fatal: false }).decode(inflated);
  }

  const HANDLING_FIELDS = [
    "fMass", "fInitialDragCoeff", "fDownForceModifier", "fPercentSubmerged",
    "fDriveBiasFront", "nInitialDriveGears", "fInitialDriveForce", "fDriveInertia",
    "fClutchChangeRateScaleUpShift", "fClutchChangeRateScaleDownShift", "fInitialDriveMaxFlatVel",
    "fBrakeForce", "fBrakeBiasFront", "fHandBrakeForce", "fSteeringLock",
    "fTractionCurveMax", "fTractionCurveMin", "fTractionCurveLateral",
    "fLowSpeedTractionLossMult", "fTractionBiasFront", "fTractionLossMult",
    "fSuspensionForce", "fSuspensionCompDamp", "fSuspensionReboundDamp",
    "fSuspensionUpperLimit", "fSuspensionLowerLimit", "fSuspensionRaise",
    "fSuspensionBiasFront", "fAntiRollBarForce", "fAntiRollBarBiasFront",
    "fRollCentreHeightFront", "fRollCentreHeightRear", "fCollisionDamageMult",
    "fWeaponDamageMult", "fDeformationDamageMult", "fEngineDamageMult"
  ];

  function parseVehiclesMetaModelNames(xmlText) {
    const records = [];
    try {
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");
      if (doc.querySelector("parsererror")) return records;

      // Primary: standard <InitDatas><Item> format (covers most mods)
      let items = [...doc.querySelectorAll("InitDatas > Item")];

      // Fallback 1: some tools use the type name as the element name instead of "Item"
      //   e.g. <InitDatas><CVehicleModelInfo__InitData>...</CVehicleModelInfo__InitData></InitDatas>
      if (!items.length) {
        items = [...doc.querySelectorAll("InitDatas > *")].filter(el => el.querySelector("modelName"));
      }

      // Fallback 2: modelName found somewhere in the document — grab its parent element
      if (!items.length) {
        items = [...new Set([...doc.querySelectorAll("modelName")].map(el => el.parentElement).filter(Boolean))];
      }

      items.forEach(item => {
        const modelName = item.querySelector("modelName")?.textContent?.trim();
        if (!modelName) return;
        records.push({
          modelName,
          handlingId: item.querySelector("handlingId")?.textContent?.trim() || "",
          gameName: item.querySelector("gameName")?.textContent?.trim() || "",
          vehicleMakeName: item.querySelector("vehicleMakeName")?.textContent?.trim() || "",
          vehicleClass: item.querySelector("vehicleClass")?.textContent?.trim() || "",
          vehicleType: item.querySelector("type")?.textContent?.trim() || ""
        });
      });
    } catch (error) {
      // Malformed or unexpected XML - name-based matching from .yft/.ytd entries still works.
    }
    return records;
  }

  function parseHandlingMetaData(xmlText) {
    const records = [];
    try {
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");
      if (doc.querySelector("parsererror")) return records;

      // Primary: <HandlingData> wrapper; fallback to any element with <handlingName>
      const handlingDataEl = doc.querySelector("HandlingData");
      const handlingItems = handlingDataEl
        ? [...handlingDataEl.children]
        : [...doc.querySelectorAll("handlingName")].map(el => el.parentElement).filter(Boolean);

      handlingItems.forEach(item => {
        if (item.getAttribute("type") !== "CHandlingData" && !item.querySelector("handlingName")) return;
        const handlingName = item.querySelector("handlingName")?.textContent?.trim();
        if (!handlingName) return;

        const profile = {
          id: handlingName.toLowerCase(),
          handlingName,
          AIHandling: item.querySelector("AIHandling")?.textContent?.trim() || "",
          subHandlingTypes: [...(item.querySelector("SubHandlingData")?.children || [])]
            .map(sub => sub.getAttribute("type") || "UNKNOWN")
            .filter(Boolean),
          updatedAt: new Date().toISOString()
        };

        HANDLING_FIELDS.forEach(field => {
          const node = item.querySelector(field);
          if (!node) return;
          const raw = node.getAttribute("value");
          if (raw === null) return;
          const val = parseFloat(raw);
          if (!isNaN(val)) profile[field] = val;
        });

        records.push(profile);
      });
    } catch (error) {
      // Malformed XML - skip silently.
    }
    return records;
  }

  function recordModelAssetName(result, nameLower, path) {
    const match = nameLower.match(/^(.*)\.(yft|ytd)$/);
    if (!match) return;
    const modelId = match[1].replace(/_hi$/, "");
    if (!modelId) return;
    if (!result.modelAssets.has(modelId)) {
      result.modelAssets.set(modelId, { modelId, files: [] });
    }
    result.modelAssets.get(modelId).files.push(path);
  }

  // Parses one archive's bytes (a single dlc.rpf, already read into memory as a Uint8Array).
  // Recurses into nested .rpf archives (a top-level dlc.rpf commonly contains a nested vehicles.rpf, etc).
  // Returns { archiveLabel, modelAssets: Map, metaModels: Map, handlingData: Map, warnings: string[], archiveCount, encryptedSkipped }
  async function scanArchiveBuffer(bytes, archiveLabel, options = {}) {
    const result = {
      archiveLabel,
      modelAssets: new Map(),
      metaModels: new Map(),
      handlingData: new Map(),
      warnings: [],
      archiveCount: 0,
      encryptedSkipped: 0
    };

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    async function scanOne(startPos, label, depth) {
      if (depth > MAX_NEST_DEPTH) {
        result.warnings.push(`${label}: nested too deeply, stopped recursing.`);
        return;
      }
      if (startPos + 16 > bytes.length) {
        result.warnings.push(`${label}: truncated archive header, skipped.`);
        return;
      }

      const version = view.getUint32(startPos, true);
      if (version !== MAGIC) {
        result.warnings.push(`${label}: not a recognized RPF7 archive, skipped.`);
        return;
      }
      result.archiveCount++;

      const entryCount = view.getUint32(startPos + 4, true);
      const namesLength = view.getUint32(startPos + 8, true);
      const encryption = view.getUint32(startPos + 12, true);

      if (encryption !== ENC_NONE && encryption !== ENC_OPEN) {
        result.warnings.push(`${label}: table of contents is encrypted (likely official Rockstar content) - skipped, no decryption is performed.`);
        result.encryptedSkipped++;
        return;
      }

      const entriesStart = startPos + 16;
      const namesStart = entriesStart + entryCount * 16;
      if (namesStart + namesLength > bytes.length) {
        result.warnings.push(`${label}: truncated table of contents, skipped.`);
        return;
      }
      const namesBytes = bytes.subarray(namesStart, namesStart + namesLength);

      const entries = [];
      for (let i = 0; i < entryCount; i++) {
        const base = entriesStart + i * 16;
        const lo = view.getUint32(base, true);
        const hi = view.getUint32(base + 4, true);

        if (hi === DIR_SENTINEL) {
          entries.push({
            kind: "dir",
            nameOffset: lo,
            entriesIndex: view.getUint32(base + 8, true),
            entriesCount: view.getUint32(base + 12, true)
          });
        } else if ((hi & 0x80000000) === 0) {
          entries.push({
            kind: "binary",
            nameOffset: lo & 0xffff,
            fileSize: ((lo >>> 16) & 0xffff) | ((hi & 0xff) << 16),
            fileOffsetBlocks: hi >>> 8,
            uncompressedSize: view.getUint32(base + 8, true),
            encryptionType: view.getUint32(base + 12, true)
          });
        } else {
          entries.push({ kind: "resource", nameOffset: lo & 0xffff });
        }
      }

      entries.forEach(entry => {
        entry.name = readCString(namesBytes, entry.nameOffset);
        entry.nameLower = entry.name.toLowerCase();
      });

      if (!entries.length) return;

      const stack = [{ node: entries[0], path: label }];
      while (stack.length) {
        const { node, path } = stack.pop();
        if (node.kind !== "dir") continue;

        const start = node.entriesIndex;
        const end = node.entriesIndex + node.entriesCount;

        for (let i = start; i < end && i < entries.length; i++) {
          const child = entries[i];
          const childPath = `${path}/${child.name}`;

          if (child.kind === "dir") {
            stack.push({ node: child, path: childPath });
            continue;
          }

          if (child.kind === "resource") {
            recordModelAssetName(result, child.nameLower, childPath);
            continue;
          }

          // plain binary entry
          if (child.nameLower.endsWith(".rpf")) {
            if (child.encryptionType !== 0) {
              result.warnings.push(`${childPath}: nested archive is encrypted - skipped.`);
              result.encryptedSkipped++;
              continue;
            }
            const nestedStart = startPos + child.fileOffsetBlocks * 512;
            await scanOne(nestedStart, childPath, depth + 1);
            continue;
          }

          if (child.nameLower === "vehicles.meta" && options.readVehiclesMeta !== false) {
            result.metaFilesFound = (result.metaFilesFound || 0) + 1;
            try {
              if (child.encryptionType !== 0) {
                result.metaWarnings = result.metaWarnings || [];
                result.metaWarnings.push(`${childPath}: vehicles.meta is encrypted — skipped.`);
              } else {
                const text = await extractBinaryEntryText(bytes, startPos, child);
                if (!text) {
                  result.metaWarnings = result.metaWarnings || [];
                  result.metaWarnings.push(`${childPath}: vehicles.meta could not be read (bad offset or zero size).`);
                } else {
                  const before = result.metaModels.size;
                  parseVehiclesMetaModelNames(text).forEach(record => {
                    result.metaModels.set(record.modelName.toLowerCase(), { ...record, archivePath: childPath });
                  });
                  if (result.metaModels.size === before) {
                    result.metaWarnings = result.metaWarnings || [];
                    result.metaWarnings.push(`${childPath}: vehicles.meta found but no model names extracted (unexpected XML structure).`);
                  } else {
                    result.metaFilesParsed = (result.metaFilesParsed || 0) + 1;
                  }
                }
              }
            } catch (error) {
              result.metaWarnings = result.metaWarnings || [];
              result.metaWarnings.push(`${childPath}: vehicles.meta error — ${error.message}.`);
            }
            continue;
          }

          if (child.nameLower === "handling.meta" && options.readHandlingMeta !== false) {
            result.handlingFilesFound = (result.handlingFilesFound || 0) + 1;
            try {
              if (child.encryptionType !== 0) {
                result.metaWarnings = result.metaWarnings || [];
                result.metaWarnings.push(`${childPath}: handling.meta is encrypted — skipped.`);
              } else {
                const text = await extractBinaryEntryText(bytes, startPos, child);
                if (!text) {
                  result.metaWarnings = result.metaWarnings || [];
                  result.metaWarnings.push(`${childPath}: handling.meta could not be read (bad offset or zero size).`);
                } else {
                  const before = result.handlingData.size;
                  parseHandlingMetaData(text).forEach(profile => {
                    result.handlingData.set(profile.id, { ...profile, archivePath: childPath });
                  });
                  if (result.handlingData.size > before) {
                    result.handlingFilesParsed = (result.handlingFilesParsed || 0) + 1;
                  }
                }
              }
            } catch (error) {
              result.metaWarnings = result.metaWarnings || [];
              result.metaWarnings.push(`${childPath}: handling.meta error — ${error.message}.`);
            }
            continue;
          }

          recordModelAssetName(result, child.nameLower, childPath);
        }
      }
    }

    await scanOne(0, archiveLabel, 0);
    return result;
  }

  return { scanArchiveBuffer };
})();
