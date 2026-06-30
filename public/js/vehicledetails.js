function normalizeInstallType(value) {
  const raw = String(value || "").trim();
  const key = raw.toLowerCase();

  if (!key) {
    return "";
  }

  if (key === "stock" || key === "vanilla") {
    return "Vanilla";
  }

  if (key === "add-on" || key === "addon" || key === "add on") {
    return "Add-On";
  }

  if (key === "replacement") {
    return "Replacement";
  }

  return raw;
}

// =====================================================
// GTA Traffic Vehicle Details V1.0
// Displays merged parsed data and saves custom reference
// fields and images to the shared Vehicle Library DB.
// =====================================================

(() => {
  "use strict";

const store = window.vehicleLibraryStore;

const state = {
  vehicles: [],
  vehicle: null,
  handling: null,
  saveTimer: null,
  source: "local",
  appearanceMetadata: null,
  appearanceMetadataError: ""
};

const el = id => document.getElementById(id);
  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(message, type = "good") {
    const host = el("vdStatus");
    host.className = `vl-status ${type}`;
    host.textContent = message;
  }

  function setSaveState(message, type = "saved") {
    const host = el("vdSaveState");
    host.textContent = message;
    host.className = `vd-save-state ${type === "saved" ? "" : type}`;
  }

  function currentModelFromUrl() {
    return new URLSearchParams(location.search).get("model") || "";
  }

  function displayTitle(vehicle) {
    return vehicle.custom?.displayName || vehicle.vehiclesMeta?.gameName || vehicle.modelName || "Unnamed Vehicle";
  }

  function cleanClassName(value) {
    const raw = String(value || "UNKNOWN").replace(/^VC_/, "").replaceAll("_", " ").trim();
    return raw ? raw.replace(/\b\w/g, match => match.toUpperCase()) : "Unknown";
  }

  function initials(value) {
    const words = String(value || "??").replace(/[^a-z0-9]+/gi, " ").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "??";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  function formatValue(value, fallback = "Not listed") {
    return String(value ?? "").trim() || fallback;
  }

  function detailItem(label, value) {
    return `<div class="vd-detail-item"><span>${escapeHTML(label)}</span><strong>${escapeHTML(formatValue(value))}</strong></div>`;
  }

  function handlingRow(label, value) {
    return `<div class="vd-handling-row"><span>${escapeHTML(label)}</span><strong>${escapeHTML(formatValue(value))}</strong></div>`;
  }

  function driveType(bias) {
    const value = Number(bias);
    if (!Number.isFinite(value)) return "Not listed";
    if (value <= 0) return "Rear-wheel drive";
    if (value >= 1) return "Front-wheel drive";
    if (Math.abs(value - 0.5) < 0.001) return "Equal all-wheel drive";
    return value < 0.5 ? "Rear-biased AWD" : "Front-biased AWD";
  }

  function estimatedSpeed(flatVelocity, unit) {
    const value = Number(flatVelocity);
    if (!Number.isFinite(value)) return "Not listed";
    const converted = unit === "mph" ? value * 0.82 : value * 1.32;
    return `${converted.toFixed(0)} ${unit}`;
  }


  function setupDetailStaticImageFallback(image, model, label) {
    let step = 0;
    image.addEventListener("error", function tryNext() {
      step += 1;
      if (step === 1) { image.src = `images/${encodeURIComponent(model)}.png`; return; }
      if (step === 2) { image.src = `images/${encodeURIComponent(model)}.webp`; return; }
      image.replaceWith(Object.assign(document.createElement("div"), {
        className: "vd-image-placeholder",
        innerHTML: `<span>VEHICLE</span><strong>${escapeHTML(label)}</strong>`
      }));
    });
  }

  function renderImage() {
    const frame = el("vdImageFrame");
    const image = state.vehicle.custom?.imageDataUrl;
    const title = displayTitle(state.vehicle);
    frame.innerHTML = image
      ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(title)}">`
      : `<img data-vd-static-image src="images/${encodeURIComponent(state.vehicle.modelName.toLowerCase())}.jpg" alt="${escapeHTML(title)}">`;
    if (!image) {
      const staticImage = frame.querySelector("[data-vd-static-image]");
      setupDetailStaticImageFallback(staticImage, state.vehicle.modelName.toLowerCase(), initials(title));
    }
    el("vdRemoveImage").disabled = !image;
  }

  function renderIdentity() {
    const vehicle = state.vehicle;
    const meta = vehicle.vehiclesMeta || {};
    const handling = state.handling;
    const title = displayTitle(vehicle);
    document.title = `${title} - GTA Traffic Vehicle Library`;
    el("vdDisplayTitle").textContent = title;
    el("vdModelName").textContent = `Model: ${vehicle.modelName}`;

    const badges = [
      meta.vehicleMakeName ? `<span class="vd-badge orange">${escapeHTML(meta.vehicleMakeName)}</span>` : "",
      meta.vehicleClass ? `<span class="vd-badge">${escapeHTML(cleanClassName(meta.vehicleClass))}</span>` : "",
      meta.vehicleType ? `<span class="vd-badge">${escapeHTML(meta.vehicleType)}</span>` : "",
      handling?.AIHandling ? `<span class="vd-badge green">AI: ${escapeHTML(handling.AIHandling)}</span>` : "",
      vehicle.custom?.installed === true ? `<span class="vd-badge installed">INSTALLED</span>` : "",
      normalizeInstallType(vehicle.custom?.installType) ? `<span class="vd-badge green">${escapeHTML(normalizeInstallType(vehicle.custom.installType))}</span>` : ""
    ].filter(Boolean);
    el("vdIdentityBadges").innerHTML = badges.join("");

    el("vdSourceCompleteness").innerHTML = `
      <span class="vd-source-chip ${meta.modelName ? "ready" : ""}">${meta.modelName ? "✓" : "—"} vehicles.meta</span>
      <span class="vd-source-chip ${handling ? "ready" : ""}">${handling ? "✓" : "—"} handling.meta</span>
      <span class="vd-source-chip ${(vehicle.popgroups || []).length ? "ready" : ""}">${(vehicle.popgroups || []).length ? "✓" : "—"} Popgroups</span>
    `;

    el("vdFavorite").textContent = vehicle.custom?.favorite ? "★ Favorite" : "☆ Add Favorite";
    const installButton = el("vdInstallButton");
    const isInstalled = vehicle.custom?.installed === true;
    installButton.textContent = isInstalled ? "✓ Installed" : "+ Install Vehicle";
    installButton.classList.toggle("active", isInstalled);
    installButton.setAttribute("aria-pressed", String(isInstalled));
    renderImage();
  }

  function renderVehicleMeta() {
    const meta = state.vehicle.vehiclesMeta || {};
    const fields = [
      ["modelName", state.vehicle.modelName],
      ["gameName", meta.gameName],
      ["vehicleMakeName", meta.vehicleMakeName],
      ["vehicleClass", meta.vehicleClass],
      ["vehicleType", meta.vehicleType],
      ["handlingId", meta.handlingId],
      ["txdName", meta.txdName],
      ["audioNameHash", meta.audioNameHash],
      ["layout", meta.layout],
      ["plateType", meta.plateType],
      ["wheelType", meta.wheelType],
      ["frequency", meta.frequency],
      ["maxNum", meta.maxNum],
      ["maxNumOfSameColor", meta.maxNumOfSameColor],
      ["identicalModelSpawnDistance", meta.identicalModelSpawnDistance],
      ["swankness", meta.swankness]
    ];
    el("vdVehicleMetaDetails").innerHTML = fields.map(([label, value]) => detailItem(label, value)).join("");
  }

  function renderHandling() {
    const handling = state.handling;
    if (!handling) {
      const handlingId = state.vehicle.vehiclesMeta?.handlingId || "this vehicle";
      el("vdHandlingSummary").innerHTML = `<div class="vd-no-data">No imported handling.meta profile matches <strong>${escapeHTML(handlingId)}</strong>. Import the correct handling.meta file from the Vehicle Library page.</div>`;
      return;
    }

    const groups = [
      ["Identity & Drivetrain", [
        ["handlingName", handling.handlingName],
        ["AIHandling", handling.AIHandling],
        ["Drive type", driveType(handling.fDriveBiasFront)],
        ["Drive bias front", handling.fDriveBiasFront],
        ["Forward gears", handling.nInitialDriveGears],
        ["Subhandling", (handling.subHandlingTypes || []).join(", ")]
      ]],
      ["Power & Speed", [
        ["Mass (kg)", handling.fMass],
        ["Drive force", handling.fInitialDriveForce],
        ["Drive inertia", handling.fDriveInertia],
        ["Top-gear redline value", handling.fInitialDriveMaxFlatVel],
        ["Estimated speed", `${estimatedSpeed(handling.fInitialDriveMaxFlatVel, "mph")} / ${estimatedSpeed(handling.fInitialDriveMaxFlatVel, "kph")}`],
        ["Initial drag", handling.fInitialDragCoeff]
      ]],
      ["Braking & Steering", [
        ["Brake force", handling.fBrakeForce],
        ["Brake bias front", handling.fBrakeBiasFront],
        ["Handbrake force", handling.fHandBrakeForce],
        ["Steering lock", handling.fSteeringLock],
        ["Up-shift rate", handling.fClutchChangeRateScaleUpShift],
        ["Down-shift rate", handling.fClutchChangeRateScaleDownShift]
      ]],
      ["Traction", [
        ["Traction curve max", handling.fTractionCurveMax],
        ["Traction curve min", handling.fTractionCurveMin],
        ["Lateral curve", handling.fTractionCurveLateral],
        ["Traction bias front", handling.fTractionBiasFront],
        ["Low-speed loss", handling.fLowSpeedTractionLossMult],
        ["Surface loss multiplier", handling.fTractionLossMult]
      ]],
      ["Suspension & Roll", [
        ["Suspension force", handling.fSuspensionForce],
        ["Compression damping", handling.fSuspensionCompDamp],
        ["Rebound damping", handling.fSuspensionReboundDamp],
        ["Suspension raise", handling.fSuspensionRaise],
        ["Anti-roll force", handling.fAntiRollBarForce],
        ["Roll center front/rear", `${formatValue(handling.fRollCentreHeightFront, "—")} / ${formatValue(handling.fRollCentreHeightRear, "—")}`]
      ]],
      ["Damage", [
        ["Collision multiplier", handling.fCollisionDamageMult],
        ["Weapon multiplier", handling.fWeaponDamageMult],
        ["Deformation multiplier", handling.fDeformationDamageMult],
        ["Engine multiplier", handling.fEngineDamageMult]
      ]]
    ];

    el("vdHandlingSummary").innerHTML = `<div class="vd-handling-groups">${groups.map(([title, rows]) => `
      <div class="vd-handling-group"><h3>${escapeHTML(title)}</h3><div class="vd-handling-list">${rows.map(([label, value]) => handlingRow(label, value)).join("")}</div></div>
    `).join("")}</div>`;
  }

  function renderPopgroups() {
    const groups = state.vehicle.popgroups || [];
    el("vdPopgroups").innerHTML = groups.length
      ? groups
          .slice()
          .sort((a, b) => a.groupName.localeCompare(b.groupName))
          .map(group => `<div class="vd-group-chip">${escapeHTML(group.groupName)}<small>${escapeHTML(group.sourceFile || "Popgroups")}</small></div>`)
          .join("")
      : `<div class="vd-no-data">This vehicle has not been found in an imported Popgroups file.</div>`;
  }

  function safeExternalUrl(value) {
    const url = String(value || "").trim();

    if (!url || !/^https?:\/\//i.test(url)) {
      return "";
    }

    return url;
  }

  async function loadAppearanceMetadata(modelName) {
    state.appearanceMetadata = null;
    state.appearanceMetadataError = "";

    if (!window.vehicleCloud?.getVehicleAppearance) {
      state.appearanceMetadataError =
        "Vehicle appearance lookup is not available in this build.";
      return;
    }

    try {
      state.appearanceMetadata =
        await window.vehicleCloud.getVehicleAppearance(
          modelName,
          { workspaceId: "default" }
        );
    } catch (error) {
      console.warn("Vehicle appearance metadata could not be loaded.", error);

      state.appearanceMetadataError =
        error.message ||
        "Vehicle appearance metadata could not be loaded.";
    }
  }

  async function loadPackMemberships(modelName) {
    state.packMemberships = [];
    state.packMembershipsError = "";

    if (!window.vehicleCloud?.getVehiclePacks) {
      state.packMembershipsError =
        "Pack membership lookup is not available in this build.";
      return;
    }

    try {
      state.packMemberships =
        await window.vehicleCloud.getVehiclePacks(
          modelName,
          { workspaceId: "default" }
        );
    } catch (error) {
      console.warn("Pack memberships could not be loaded.", error);

      state.packMembershipsError =
        error.message ||
        "Pack memberships could not be loaded.";
    }
  }

  function renderPackMemberships() {
    const host = el("vdPackMemberships");

    if (!host) {
      return;
    }

    if (state.packMembershipsError) {
      host.innerHTML =
        '<div class="vd-no-data">' +
        escapeHTML(state.packMembershipsError) +
        '</div>';
      return;
    }

    const memberships = state.packMemberships || [];

    if (!memberships.length) {
      host.innerHTML =
        '<div class="vd-no-data">No cloud pack membership found for this vehicle yet. Assign it in the Pack Tracker, then sync the Pack Tracker to cloud.</div>';
      return;
    }

    const DLC_REFERENCE_MARKER = "[GTA_DLC_REFERENCE]";

    function packFromMembership(membership) {
      return membership.pack || membership || {};
    }

    function getPackTitle(membership) {
      const pack = packFromMembership(membership);

      return (
        pack.name ||
        membership.packName ||
        pack.packName ||
        pack.packKey ||
        membership.packId ||
        "Unknown pack"
      );
    }

    function getPackNotes(membership) {
      const pack = packFromMembership(membership);

      return (
        pack.notes ||
        membership.notes ||
        ""
      );
    }

    function isGtaDlcReference(membership) {
      const pack = packFromMembership(membership);
      const notes = getPackNotes(membership);
      const sourceType = String(pack.sourceType || membership.sourceType || "").toLowerCase();
      const sourceLabel = String(pack.sourceLabel || membership.sourceLabel || "").toLowerCase();

      return (
        String(notes).includes(DLC_REFERENCE_MARKER) ||
        sourceType.includes("gta-dlc-reference") ||
        sourceLabel.includes("gta dlc reference") ||
        sourceLabel.includes("rockstar")
      );
    }

    function parseDlcReferenceNotes(notes) {
      const text = String(notes || "");
      const sourceTypeMatch = text.match(/sourceType=([^\s]+)/i);
      const sourceFileMatch = text.match(/sourceFile=([^\s]+)/i);

      return {
        sourceType: sourceTypeMatch ? sourceTypeMatch[1] : "",
        sourceFile: sourceFileMatch ? sourceFileMatch[1] : ""
      };
    }

    function formatSourceType(value) {
      const clean = String(value || "").trim();

      const labels = {
        "rockstar-dlc": "Rockstar DLC",
        "base-game": "Base Game",
        "patchday": "Patchday",
        "update-rpf": "update.rpf",
        "custom-reference": "Custom Reference"
      };

      return labels[clean] || clean || "GTA Reference";
    }

    function cleanReferenceNotes(notes) {
      return String(notes || "")
        .split("\n")
        .filter(line => !line.includes(DLC_REFERENCE_MARKER))
        .join("\n")
        .trim();
    }

    function metaSpan(label, value) {
      if (!String(value || "").trim()) {
        return "";
      }

      return (
        '<span><strong>' +
        escapeHTML(label) +
        ':</strong> ' +
        escapeHTML(value) +
        '</span>'
      );
    }

    function renderGtaSource(membership) {
      const pack = packFromMembership(membership);
      const title = getPackTitle(membership);
      const notes = getPackNotes(membership);
      const ref = parseDlcReferenceNotes(notes);

      const dlcFolder =
        pack.dlcFolder ||
        membership.dlcFolder ||
        pack.dlc ||
        membership.dlc ||
        "";

      const sourceType = formatSourceType(
        ref.sourceType ||
        pack.sourceType ||
        membership.sourceType
      );

      const sourceFile = ref.sourceFile || "vehicles.meta";

      const meta = [
        metaSpan("DLC Folder", dlcFolder),
        metaSpan("Source Type", sourceType),
        metaSpan("Source File", sourceFile),
        metaSpan("Type", membership.relationshipType)
      ].filter(Boolean).join("");

      const cleanNotes = cleanReferenceNotes(notes);

      return [
        '<article class="vd-pack-entry vd-pack-entry-gta">',
        '<div class="vd-pack-entry-header">',
        '<h3>' + escapeHTML(title) + '</h3>',
        '<span class="vd-pack-badge gta">Rockstar / GTA Source</span>',
        '</div>',
        meta ? '<div class="vd-pack-meta">' + meta + '</div>' : '',
        cleanNotes ? '<p class="vd-pack-notes">' + escapeHTML(cleanNotes) + '</p>' : '',
        '</article>'
      ].join("");
    }

    function renderModPack(membership) {
      const pack = packFromMembership(membership);
      const title = getPackTitle(membership);

      const website = safeExternalUrl(
        pack.website ||
        membership.website
      );

      const notes = getPackNotes(membership);

      const meta = [
        metaSpan("Creator", pack.creator || membership.creator),
        metaSpan("DLC Folder", pack.dlcFolder || membership.dlcFolder),
        metaSpan("Version", pack.version || membership.version),
        metaSpan("Type", membership.relationshipType),
        metaSpan(
          "Source",
          pack.sourceLabel ||
          membership.sourceLabel ||
          pack.sourceType ||
          membership.sourceType
        )
      ].filter(Boolean).join("");

      return [
        '<article class="vd-pack-entry vd-pack-entry-mod">',
        '<div class="vd-pack-entry-header">',
        '<h3>' + escapeHTML(title) + '</h3>',
        '<span class="vd-pack-badge mod">Mod Pack</span>',
        '</div>',
        meta ? '<div class="vd-pack-meta">' + meta + '</div>' : '',
        notes ? '<p class="vd-pack-notes">' + escapeHTML(notes) + '</p>' : '',
        website
          ? '<a class="vd-pack-link" href="' +
            escapeHTML(website) +
            '" target="_blank" rel="noopener noreferrer">Open source website</a>'
          : '',
        '</article>'
      ].join("");
    }

    const gtaSources = memberships.filter(isGtaDlcReference);
    const modPacks = memberships.filter(membership => !isGtaDlcReference(membership));

    host.innerHTML = [
      gtaSources.length
        ? [
            '<section class="vd-pack-group vd-pack-group-gta">',
            '<h3 class="vd-pack-group-title">Rockstar / GTA Source History</h3>',
            gtaSources.map(renderGtaSource).join(""),
            '</section>'
          ].join("")
        : "",
      modPacks.length
        ? [
            '<section class="vd-pack-group vd-pack-group-mod">',
            '<h3 class="vd-pack-group-title">Mod Pack Membership</h3>',
            modPacks.map(renderModPack).join(""),
            '</section>'
          ].join("")
        : ""
    ].join("");
  }

  function renderAppearanceValue(label, value) {
    if (!String(value || "").trim()) {
      return "";
    }

    return (
      '<span><strong>' +
      escapeHTML(label) +
      ':</strong> ' +
      escapeHTML(value) +
      '</span>'
    );
  }

  function renderAppearanceMetadata() {
    const host = el("vdAppearanceMetadata");

    if (!host) {
      return;
    }

    if (state.appearanceMetadataError) {
      host.innerHTML =
        '<div class="vd-no-data">' +
        escapeHTML(state.appearanceMetadataError) +
        '</div>';
      return;
    }

    const appearance = state.appearanceMetadata || {};
    const variation = appearance.variation || null;
    const kits = Array.isArray(appearance.kits) ? appearance.kits : [];
    const lights = Array.isArray(appearance.lights) ? appearance.lights : [];

    if (!variation && !kits.length && !lights.length) {
      host.innerHTML =
        '<div class="vd-no-data">No carvariations.meta or carcols.meta data has been saved for this vehicle yet.</div>';
      return;
    }

    const cards = [];

    if (variation) {
      const meta = [
        renderAppearanceValue("Source", variation.sourceLabel),
        renderAppearanceValue("DLC Folder", variation.dlcFolder),
        renderAppearanceValue("Source File", variation.sourceFileName),
        renderAppearanceValue("Colors", (variation.colors || []).join(", ")),
        renderAppearanceValue("Kits", (variation.kits || []).join(", ")),
        renderAppearanceValue("Livery Count", variation.liveryCount),
        renderAppearanceValue("Enabled Liveries", (variation.enabledLiveries || []).map(item => item.index).join(", ")),
        renderAppearanceValue("Light Settings", variation.lightSettings),
        renderAppearanceValue("Siren Settings", variation.sirenSettings)
      ].filter(Boolean).join("");

      const plates = (variation.plateProbabilities || [])
        .map(item =>
          [
            item.name || "Plate",
            item.value || ""
          ].filter(Boolean).join(": ")
        )
        .filter(Boolean)
        .join(", ");

      cards.push([
        '<article class="vd-appearance-entry">',
        '<h3>Appearance / Variations</h3>',
        meta ? '<div class="vd-pack-meta">' + meta + '</div>' : '',
        plates
          ? '<p class="vd-pack-notes"><strong>Plate Probabilities:</strong> ' +
            escapeHTML(plates) +
            '</p>'
          : '',
        '</article>'
      ].join(""));
    }

    kits.forEach(kit => {
      const meta = [
        renderAppearanceValue("Kit Name", kit.kitName),
        renderAppearanceValue("Kit ID", kit.kitId),
        renderAppearanceValue("Kit Type", kit.kitType),
        renderAppearanceValue("Stat Mods", kit.statModCount),
        renderAppearanceValue("Stat Types", (kit.statModTypes || []).join(", ")),
        renderAppearanceValue("Visible Mods", kit.visibleModCount),
        renderAppearanceValue("Linked Mods", kit.linkedModCount),
        renderAppearanceValue("Source File", kit.sourceFileName)
      ].filter(Boolean).join("");

      cards.push([
        '<article class="vd-appearance-entry">',
        '<h3>Customization / Mod Kit</h3>',
        meta ? '<div class="vd-pack-meta">' + meta + '</div>' : '',
        '</article>'
      ].join(""));
    });

    lights.forEach(light => {
      const meta = [
        renderAppearanceValue("Light ID", light.lightId),
        renderAppearanceValue("Name", light.name),
        renderAppearanceValue("Headlight Texture", light.headLightTexture),
        renderAppearanceValue("Headlight Color", light.headLightColor),
        renderAppearanceValue("Taillight Color", light.tailLightColor),
        renderAppearanceValue("Indicator Color", light.indicatorColor),
        renderAppearanceValue("Source File", light.sourceFileName)
      ].filter(Boolean).join("");

      cards.push([
        '<article class="vd-appearance-entry">',
        '<h3>Lighting Profile</h3>',
        meta ? '<div class="vd-pack-meta">' + meta + '</div>' : '',
        '</article>'
      ].join(""));
    });

    host.innerHTML = cards.join("");
  }

  function renderSources() {
    const entries = [];
    (state.vehicle.sources?.vehiclesMeta || []).forEach(file => entries.push(["vehicles.meta", file]));
    (state.vehicle.sources?.popgroups || []).forEach(file => entries.push(["Popgroups", file]));
    if (state.handling?.sourceFile) entries.push(["handling.meta", state.handling.sourceFile]);
    el("vdSources").innerHTML = entries.length
      ? entries.map(([type, file]) => `<div class="vd-source-entry"><strong>${escapeHTML(file)}</strong><span>${escapeHTML(type)}</span></div>`).join("")
      : `<div class="vd-no-data">No source filenames have been recorded for this vehicle.</div>`;
  }

  const CUSTOM_FIELDS = [
    "displayName", "rockstarDlc", "sourcePack", "gameVersion", "installDate", "installType", "replacementFor",
    "dlcFolderPath", "yftPath", "yftHiPath", "ytdPath", "vehiclesMetaPath",
    "handlingMetaPath", "downloadUrl", "tags", "notes"
  ];

  const CUSTOM_IDS = {
    displayName: "vdCustomDisplayName",
    rockstarDlc: "vdRockstarDlc",
    sourcePack: "vdSourcePack",
    gameVersion: "vdGameVersion",
    installDate: "vdInstallDate",
    installType: "vdInstallType",
    replacementFor: "vdReplacementFor",
    dlcFolderPath: "vdDlcFolderPath",
    yftPath: "vdYftPath",
    yftHiPath: "vdYftHiPath",
    ytdPath: "vdYtdPath",
    vehiclesMetaPath: "vdVehiclesMetaPath",
    handlingMetaPath: "vdHandlingMetaPath",
    downloadUrl: "vdDownloadUrl",
    tags: "vdTags",
    notes: "vdNotes"
  };

  function populateCustomForm() {
    const custom = state.vehicle.custom || {};
    CUSTOM_FIELDS.forEach(field => {
      el(CUSTOM_IDS[field]).value = custom[field] || "";
    });
    el("vdInstalled").checked = custom.installed === true;
    setSaveState("Saved", "saved");
  }

  function collectCustomForm() {
    const values = {};

    CUSTOM_FIELDS.forEach(field => {
      values[field] = el(CUSTOM_IDS[field]).value.trim();
    });

    values.installed = el("vdInstalled").checked;

    if (values.installed && !values.installDate) {
      values.installDate = new Date().toISOString().slice(0, 10);
    }

    return values;
  }

  function customToCloudChanges(custom) {
    return {
      displayName: custom.displayName || "",
      rockstarDlc: custom.rockstarDlc || "",
      sourcePack: custom.sourcePack || "",
      gameVersion: custom.gameVersion || "",
      installDate: custom.installDate || "",
      installationType: normalizeInstallType(custom.installType) || "",
      replacementSlot: custom.replacementFor || "",
      installedDlcFolder: custom.dlcFolderPath || "",
      yftPath: custom.yftPath || "",
      hiYftPath: custom.yftHiPath || "",
      ytdPath: custom.ytdPath || "",
      vehiclesMetaPath: custom.vehiclesMetaPath || "",
      handlingMetaPath: custom.handlingMetaPath || "",
      downloadUrl: custom.downloadUrl || "",
      tags: custom.tags || "",
      notes: custom.notes || "",
      installed: custom.installed === true,
      favorite: custom.favorite === true
    };
  }

  async function saveCurrentVehicle({ quiet = false } = {}) {
    if (!state.vehicle) {
      return false;
    }

    clearTimeout(state.saveTimer);

    try {
      if (!window.vehicleCloud?.updateVehicle) {
        throw new Error(
          "The cloud vehicle save service did not load."
        );
      }

      setSaveState("Saving...", "dirty");

      const nextCustom = {
        ...(state.vehicle.custom || {}),
        ...collectCustomForm()
      };

      const savedCloudVehicle =
        await window.vehicleCloud.updateVehicle(
          state.vehicle.modelName,
          customToCloudChanges(nextCustom)
        );

      state.vehicle.custom = nextCustom;
      state.vehicle.updatedAt =
        savedCloudVehicle.updatedAt ||
        new Date().toISOString();

      await store.putVehicle(state.vehicle);

      setSaveState("Saved to cloud", "saved");
      renderIdentity();

      if (!quiet) {
        setStatus(
          `Saved cloud library details for ${state.vehicle.modelName}.`,
          "good"
        );
      }

      return true;
    } catch (error) {
      console.error(error);
      setSaveState("Save failed", "bad");

      if (!quiet) {
        setStatus(
          error.message ||
            "The vehicle details could not be saved.",
          "bad"
        );
      }

      return false;
    }
  }

  function scheduleSave() {
    setSaveState("Unsaved changes", "dirty");
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => saveCurrentVehicle({ quiet: true }), 650);
  }

  async function resizeImage(file) {
    if (file.size > 12 * 1024 * 1024) throw new Error("Choose an image smaller than 12 MB.");
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("The image could not be read."));
      reader.readAsDataURL(file);
    });

    const image = await new Promise((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("The selected file is not a readable image."));
      candidate.src = source;
    });

    const maxWidth = 1280;
    const maxHeight = 800;
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  }

  function populateVehicleSelector() {
    const select = el("vdVehicleSelect");
    select.innerHTML = state.vehicles.map(vehicle => `<option value="${escapeHTML(vehicle.modelName)}">${escapeHTML(displayTitle(vehicle))} (${escapeHTML(vehicle.modelName)})</option>`).join("");
    select.value = state.vehicle.modelName;
  }

  function navigateRelative(offset) {
    const index = state.vehicles.findIndex(vehicle => vehicle.id === state.vehicle.id);
    if (index < 0 || !state.vehicles.length) return;
    const nextIndex = (index + offset + state.vehicles.length) % state.vehicles.length;
    location.href = `vehicle-details.html?model=${encodeURIComponent(state.vehicles[nextIndex].modelName)}`;
  }

async function loadVehicle(modelName) {
  const normalizedModel =
    String(modelName || "").toLowerCase();

  const vehicle =
    state.vehicles.find(candidate =>
      String(candidate.modelName || "")
        .toLowerCase() === normalizedModel
    ) ||
    await store.getVehicle(modelName);

  if (!vehicle) {
    setStatus(
      `Vehicle ${modelName || "record"} was not found. Return to the library and import the source files first.`,
      "bad"
    );

    el("vdPage").hidden = true;
    return;
  }

  state.vehicle = vehicle;

  state.handling =
    vehicle.vehiclesMeta?.handlingId
      ? await store.getHandlingProfile(
          vehicle.vehiclesMeta.handlingId
        )
      : null;

  await loadPackMemberships(vehicle.modelName);
  await loadAppearanceMetadata(vehicle.modelName);

  el("vdPage").hidden = false;

  populateVehicleSelector();
  renderIdentity();
  renderVehicleMeta();
  renderHandling();
  renderPopgroups();
  renderPackMemberships();
  renderAppearanceMetadata();
  renderSources();
  populateCustomForm();

  setStatus(
    `Loaded ${vehicle.modelName} from the ${
      state.source === "cloud"
        ? "cloud"
        : "local fallback"
    } Vehicle Library.`,
    state.source === "cloud"
      ? "good"
      : "warn"
  );
}

  function bindEvents() {
    el("vdVehicleSelect").addEventListener("change", event => {
      if (event.target.value) location.href = `vehicle-details.html?model=${encodeURIComponent(event.target.value)}`;
    });
    el("vdPrevious").addEventListener("click", () => navigateRelative(-1));
    el("vdNext").addEventListener("click", () => navigateRelative(1));

    el("vdCustomForm").addEventListener("submit", event => {
      event.preventDefault();
      saveCurrentVehicle();
    });
    CUSTOM_FIELDS.forEach(field => {
      el(CUSTOM_IDS[field]).addEventListener("input", scheduleSave);
      el(CUSTOM_IDS[field]).addEventListener("change", scheduleSave);
    });

el("vdInstallButton").addEventListener(
  "click",
  async () => {
    const previousInstalled =
      state.vehicle.custom?.installed === true;

    const nextInstalled =
      !previousInstalled;

    state.vehicle.custom =
      state.vehicle.custom || {};

    state.vehicle.custom.installed =
      nextInstalled;

    if (
      nextInstalled &&
      !state.vehicle.custom.installDate
    ) {
      state.vehicle.custom.installDate =
        new Date().toISOString().slice(0, 10);
    }

    el("vdInstalled").checked =
      nextInstalled;

    el("vdInstallDate").value =
      state.vehicle.custom.installDate || "";

    const saved =
      await saveCurrentVehicle({
        quiet: true
      });

    if (!saved) {
      state.vehicle.custom.installed =
        previousInstalled;

      el("vdInstalled").checked =
        previousInstalled;

      renderIdentity();
      return;
    }

    renderIdentity();

    setStatus(
      nextInstalled
        ? "Marked as installed in the cloud library."
        : "Removed installed status from the cloud library.",
      "good"
    );
  }
);
    el("vdInstalled").addEventListener("change", () => {
      if (el("vdInstalled").checked && !el("vdInstallDate").value) {
        el("vdInstallDate").value = new Date().toISOString().slice(0, 10);
      }
      scheduleSave();
    });

  el("vdFavorite").addEventListener(
  "click",
  async () => {
    state.vehicle.custom =
      state.vehicle.custom || {};

    const previousFavorite =
      state.vehicle.custom.favorite === true;

    const nextFavorite =
      !previousFavorite;

    state.vehicle.custom.favorite =
      nextFavorite;

    const saved =
      await saveCurrentVehicle({
        quiet: true
      });

    if (!saved) {
      state.vehicle.custom.favorite =
        previousFavorite;

      renderIdentity();
      return;
    }

    renderIdentity();

    setStatus(
      nextFavorite
        ? "Added to cloud favorites."
        : "Removed from cloud favorites.",
      "good"
    );
  }
);

  el("vdChooseImage").addEventListener(
  "click",
  () => el("vdImagePicker").click()
);

el("vdImagePicker").addEventListener(
  "change",
  async event => {
    const file = event.target.files[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp"
      ].includes(file.type)
    ) {
      setStatus(
        "Choose a PNG, JPEG, or WebP image.",
        "bad"
      );

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatus(
        "Choose an image that is 10 MB or smaller.",
        "bad"
      );

      return;
    }

    if (!window.vehicleCloud?.uploadVehicleImage) {
      setStatus(
        "The cloud image upload service did not load.",
        "bad"
      );

      return;
    }

    const chooseButton =
      el("vdChooseImage");

    chooseButton.disabled = true;

    setStatus(
      `Uploading ${file.name} to cloud storage...`,
      "warn"
    );

    try {
      const uploadedImage =
        await window.vehicleCloud.uploadVehicleImage(
          state.vehicle.modelName,
          file
        );

      state.vehicle.custom =
        state.vehicle.custom || {};

      state.vehicle.custom.imageDataUrl =
        uploadedImage.imageUrl;

      state.vehicle.updatedAt =
        new Date().toISOString();

      await store.putVehicle(
        state.vehicle
      );

      renderImage();

      setStatus(
        "Vehicle image saved to R2 cloud storage.",
        "good"
      );
    } catch (error) {
      console.error(error);

      setStatus(
        error.message ||
        "The vehicle image could not be uploaded.",
        "bad"
      );
    } finally {
      chooseButton.disabled = false;
    }
  }
);

    el("vdRemoveImage").addEventListener(
  "click",
  async () => {
    if (!state.vehicle.custom?.imageDataUrl) {
      return;
    }

    if (!window.vehicleCloud?.deleteVehicleImage) {
      setStatus(
        "The cloud image deletion service did not load.",
        "bad"
      );

      return;
    }

    const confirmed = window.confirm(
      `Remove the cloud image for ${state.vehicle.modelName}?`
    );

    if (!confirmed) {
      return;
    }

    const removeButton =
      el("vdRemoveImage");

    removeButton.disabled = true;

    setStatus(
      "Removing the vehicle image from cloud storage...",
      "warn"
    );

    try {
      await window.vehicleCloud.deleteVehicleImage(
        state.vehicle.modelName
      );

      state.vehicle.custom.imageDataUrl = "";

      state.vehicle.updatedAt =
        new Date().toISOString();

      await store.putVehicle(
        state.vehicle
      );

      renderImage();

      setStatus(
        "Vehicle image removed from R2 cloud storage.",
        "good"
      );
    } catch (error) {
      console.error(error);

      setStatus(
        error.message ||
        "The vehicle image could not be removed.",
        "bad"
      );
    } finally {
      removeButton.disabled =
        !state.vehicle.custom?.imageDataUrl;
    }
  }
);

  }

async function initialize() {
  bindEvents();

  try {
    await store.openDatabase();

    const [
      localVehicles,
      localHandlingProfiles
    ] = await Promise.all([
      store.getVehicles(),
      store.getHandlingProfiles()
    ]);

    let vehicles = localVehicles;
    let handlingProfiles =
      localHandlingProfiles;

    state.source = "local";

    if (window.vehicleCloud?.getLibraryData) {
      try {
        const cloudData =
          await window.vehicleCloud.getLibraryData(
            localVehicles
          );

        if (cloudData.vehicles.length > 0) {
          vehicles = cloudData.vehicles;

          handlingProfiles =
            cloudData.handlingProfiles;

          await Promise.all([
            store.putVehicles(vehicles),

            store.putHandlingProfiles(
              handlingProfiles
            )
          ]);

          state.source = "cloud";
        }
      } catch (error) {
        console.warn(
          "Cloud details unavailable. Using IndexedDB fallback.",
          error
        );
      }
    }

    state.vehicles = vehicles.sort(
      (a, b) =>
        displayTitle(a).localeCompare(
          displayTitle(b)
        )
    );

    if (!state.vehicles.length) {
      setStatus(
        "The Vehicle Library is empty.",
        "warn"
      );

      el("vdVehicleSelect").innerHTML =
        `<option value="">No vehicles available</option>`;

      return;
    }

    const requested =
      currentModelFromUrl() ||
      state.vehicles[0].modelName;

    await loadVehicle(requested);
  } catch (error) {
    console.error(error);

    setStatus(
      "The Vehicle Library could not be opened.",
      "bad"
    );
  }
}

  document.addEventListener("DOMContentLoaded", initialize);
})();






