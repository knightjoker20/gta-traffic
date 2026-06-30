// =====================================================
// VD Meta Upload V1.0
// Drop-zone upload for vehicles.meta and handling.meta
// on the Vehicle Details page. Parses XML in-browser,
// extracts the matching model entry, saves to cloud.
// =====================================================

(() => {
  "use strict";

  // ── XML helpers ──────────────────────────────────
  function parseXml(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const err = doc.querySelector("parsererror");
    if (err) throw new Error("Invalid XML: " + err.textContent.slice(0, 120));
    return doc;
  }

  function textValue(el, tag) {
    const node = el.querySelector(tag);
    return node ? node.textContent.trim() : "";
  }

  function attrValue(el, attr) {
    const node = el.querySelector(`[name="${attr}"]`) || el.querySelector(attr);
    return node ? (node.getAttribute("value") ?? node.textContent.trim()) : "";
  }

  // ── Parse vehicles.meta → array of vehicle records ──
  function parseVehiclesMeta(text, fileName) {
    const doc = parseXml(text);
    const items = [
      ...doc.querySelectorAll("InitDatas > Item"),
      ...doc.querySelectorAll("CVehicleModelInfo__InitDataList > InitDatas > Item")
    ];
    return items.map(item => {
      const modelName = textValue(item, "modelName");
      if (!modelName) return null;
      return {
        modelName,
        vehiclesMeta: {
          modelName,
          txdName: textValue(item, "txdName"),
          handlingId: textValue(item, "handlingId"),
          gameName: textValue(item, "gameName"),
          vehicleMakeName: textValue(item, "vehicleMakeName"),
          vehicleClass: textValue(item, "vehicleClass"),
          vehicleType: textValue(item, "type"),
          audioNameHash: textValue(item, "audioNameHash"),
          layout: textValue(item, "layout"),
          plateType: textValue(item, "plateType"),
          wheelType: textValue(item, "wheelType"),
          frequency: attrValue(item, "frequency"),
          swankness: textValue(item, "swankness"),
          maxNum: attrValue(item, "maxNum"),
          maxNumOfSameColor: attrValue(item, "maxNumOfSameColor"),
          identicalModelSpawnDistance: attrValue(item, "identicalModelSpawnDistance")
        },
        sources: { vehiclesMeta: [fileName] }
      };
    }).filter(Boolean);
  }

  // ── Parse handling.meta → array of profiles ──────
  const HANDLING_FIELDS = [
    "fMass","fInitialDragCoeff","fDownForceModifier","fPercentSubmerged",
    "fDriveBiasFront","nInitialDriveGears","fInitialDriveForce","fDriveInertia",
    "fClutchChangeRateScaleUpShift","fClutchChangeRateScaleDownShift","fInitialDriveMaxFlatVel",
    "fBrakeForce","fBrakeBiasFront","fHandBrakeForce","fSteeringLock",
    "fTractionCurveMax","fTractionCurveMin","fTractionCurveLateral",
    "fLowSpeedTractionLossMult","fTractionBiasFront","fTractionLossMult",
    "fSuspensionForce","fSuspensionCompDamp","fSuspensionReboundDamp",
    "fSuspensionUpperLimit","fSuspensionLowerLimit","fSuspensionRaise",
    "fSuspensionBiasFront","fAntiRollBarForce","fAntiRollBarBiasFront",
    "fRollCentreHeightFront","fRollCentreHeightRear","fCollisionDamageMult",
    "fWeaponDamageMult","fDeformationDamageMult","fEngineDamageMult"
  ];

  function directChildren(el, tag) {
    if (!el) return [];
    return [...el.children].filter(c => !tag || c.tagName === tag);
  }

  function parseHandlingMeta(text, fileName) {
    const doc = parseXml(text);
    const handlingData = doc.getElementsByTagName("HandlingData")[0];
    if (!handlingData) return [];
    return directChildren(handlingData, "Item")
      .filter(item => item.getAttribute("type") === "CHandlingData" || item.querySelector("handlingName"))
      .map(item => {
        const handlingName = textValue(item, "handlingName");
        if (!handlingName) return null;
        const profile = {
          handlingName,
          AIHandling: textValue(item, "AIHandling"),
          sourceFile: fileName,
          subHandlingTypes: directChildren(
            item.querySelector("SubHandlingData"), "Item"
          ).map(sub => sub.getAttribute("type") || "UNKNOWN").filter(Boolean),
          updatedAt: new Date().toISOString()
        };
        HANDLING_FIELDS.forEach(field => {
          const node = item.querySelector(`[name="${field}"]`) || item.querySelector(field);
          profile[field] = node ? (node.getAttribute("value") ?? node.textContent.trim()) : "";
        });
        return profile;
      }).filter(Boolean);
  }

  // ── UI helpers ────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  function setZoneState(zoneId, state, message) {
    const zone = el(zoneId);
    if (!zone) return;
    zone.dataset.state = state; // idle | loading | success | error
    const msg = zone.querySelector(".vd-upload-msg");
    if (msg && message !== undefined) msg.textContent = message;
  }

  // ── Core upload logic ─────────────────────────────
  async function uploadVehiclesMeta(file, modelName) {
    setZoneState("vdVehiclesMetaZone", "loading", "Parsing…");
    let text;
    try {
      text = await file.text();
    } catch {
      setZoneState("vdVehiclesMetaZone", "error", "Could not read file.");
      return;
    }

    let records;
    try {
      records = parseVehiclesMeta(text, file.name);
    } catch (e) {
      setZoneState("vdVehiclesMetaZone", "error", "XML parse error: " + e.message);
      return;
    }

    const match = records.find(r => r.modelName.toLowerCase() === modelName.toLowerCase());
    if (!match) {
      setZoneState("vdVehiclesMetaZone", "error",
        `"${modelName}" not found in this vehicles.meta (${records.length} entries scanned).`);
      return;
    }

    setZoneState("vdVehiclesMetaZone", "loading", "Saving to cloud…");
    try {
      // 1. Update parsed vehicle records in D1
      await window.vehicleCloud.importLibraryBatch({
        importMode: "vehicles-meta",
        sourceFile: file.name,
        vehicles: [match],
        handlingProfiles: []
      });

      // 2. Store the full raw file in R2 so the editor can auto-load it
      if (window.metaFileCloud) {
        const packName = getPackName(modelName);
        const entryNames = records.map(r => r.modelName);
        await window.metaFileCloud.saveFile("vehicles-meta", packName, text, {
          originalFilename: file.name,
          entryNames
        });
      }

      const count = records.length;
      setZoneState("vdVehiclesMetaZone", "success",
        `✓ Saved — ${count} vehicle${count !== 1 ? "s" : ""} stored from ${file.name}`);
      if (typeof window.vdReloadVehicle === "function") window.vdReloadVehicle();
    } catch (e) {
      setZoneState("vdVehiclesMetaZone", "error", e.message || "Upload failed.");
    }
  }

  async function uploadHandlingMeta(file, modelName) {
    setZoneState("vdHandlingMetaZone", "loading", "Parsing…");
    let text;
    try {
      text = await file.text();
    } catch {
      setZoneState("vdHandlingMetaZone", "error", "Could not read file.");
      return;
    }

    let profiles;
    try {
      profiles = parseHandlingMeta(text, file.name);
    } catch (e) {
      setZoneState("vdHandlingMetaZone", "error", "XML parse error: " + e.message);
      return;
    }

    // Match by handlingName OR by modelName (some vehicles use same-named handling)
    const lower = modelName.toLowerCase();
    const match = profiles.find(p =>
      p.handlingName.toLowerCase() === lower
    );

    if (!match) {
      const names = profiles.slice(0, 5).map(p => p.handlingName).join(", ");
      setZoneState("vdHandlingMetaZone", "error",
        `No profile named "${modelName}" found. File has: ${names}${profiles.length > 5 ? "…" : ""}`);
      return;
    }

    setZoneState("vdHandlingMetaZone", "loading", "Saving to cloud…");
    try {
      // 1. Update parsed handling records in D1
      await window.vehicleCloud.importLibraryBatch({
        importMode: "handling-meta",
        sourceFile: file.name,
        vehicles: [],
        handlingProfiles: [match]
      });

      // 2. Store the full raw file in R2
      if (window.metaFileCloud) {
        const packName = getPackName(modelName);
        const entryNames = profiles.map(p => p.handlingName);
        await window.metaFileCloud.saveFile("handling-meta", packName, text, {
          originalFilename: file.name,
          entryNames
        });
      }

      const count = profiles.length;
      setZoneState("vdHandlingMetaZone", "success",
        `✓ Saved — ${count} profile${count !== 1 ? "s" : ""} stored from ${file.name}`);
      if (typeof window.vdReloadVehicle === "function") window.vdReloadVehicle();
    } catch (e) {
      setZoneState("vdHandlingMetaZone", "error", e.message || "Upload failed.");
    }
  }

  // ── Resolve pack name for storage key ───────────────
  function getPackName(modelName) {
    // Use sourcePack from vehicle details page if available,
    // otherwise fall back to the model name itself
    const packField = document.getElementById("vdSourcePack");
    const rawPack = packField ? packField.value.trim() : "";
    const base = rawPack || modelName;
    return window.metaFileCloud
      ? window.metaFileCloud.sanitizePackName(base)
      : base.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  }

  // ── Drop zone wiring ──────────────────────────────
  function wireDropZone(zoneId, inputId, handler) {
    const zone = el(zoneId);
    const input = el(inputId);
    if (!zone || !input) return;

    function getModel() {
      return new URLSearchParams(location.search).get("model") || "";
    }

    function handleFile(file) {
      if (!file) return;
      const model = getModel();
      if (!model) {
        setZoneState(zoneId, "error", "No vehicle model in URL.");
        return;
      }
      handler(file, model);
    }

    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") input.click(); });

    input.addEventListener("change", () => {
      if (input.files[0]) handleFile(input.files[0]);
      input.value = "";
    });

    zone.addEventListener("dragover", e => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", e => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      handleFile(e.dataTransfer.files[0]);
    });
  }

  // ── Init ──────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    wireDropZone("vdVehiclesMetaZone", "vdVehiclesMetaPicker", uploadVehiclesMeta);
    wireDropZone("vdHandlingMetaZone", "vdHandlingMetaPicker", uploadHandlingMeta);
  });

})();
