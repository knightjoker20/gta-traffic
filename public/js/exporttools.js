// =====================================================
// EXPORT TOOLS
// Builds GTA-style popgroups XML + vehicles.meta patch.
// Important: model entries export as:
// <Item>
//   <Name>model</Name>
//   <Variations type="NULL"/>
// </Item>
// =====================================================

function buildPopgroupsXML() {
  let text = originalText || "";

  const vehXML = buildGTASectionXML("vehGroups", parsedData.vehicles);
  const pedXML = buildGTASectionXML("pedGroups", parsedData.peds);

  text = replaceSectionText(text, "vehGroups", vehXML);
  text = replaceSectionText(text, "pedGroups", pedXML);

  return text;
}

function replaceSectionText(fullText, tag, newSection) {
  const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "i");

  if (regex.test(fullText)) {
    return fullText.replace(regex, newSection);
  }

  return fullText + "\n" + newSection;
}

function buildGTASectionXML(tag, groups) {
  const lines = [];

  lines.push(`  <${tag}>`);

  groups.forEach(group => {
    lines.push(`    <Item>`);
    lines.push(`      <Name>${escapeXML(group.name)}</Name>`);
    lines.push(`      <models>`);

    group.models.forEach(model => {
      lines.push(`        <Item>`);
      lines.push(`          <Name>${escapeXML(model)}</Name>`);
      lines.push(`          <Variations type="NULL"/>`);
      lines.push(`        </Item>`);
    });

    lines.push(`      </models>`);

    if (group.flags) {
      lines.push(`      <flags>${escapeXML(group.flags)}</flags>`);
    }

    lines.push(`    </Item>`);
  });

  lines.push(`  </${tag}>`);

  return lines.join("\n");
}

function buildSingleGroupXML(group, baseIndent) {
  const lines = [];
  const i = baseIndent;

  lines.push(`${i}<Item>`);
  lines.push(`${i}  <Name>${escapeXML(group.name)}</Name>`);
  lines.push(`${i}  <models>`);

  group.models.forEach(model => {
    lines.push(`${i}    <Item>`);
    lines.push(`${i}      <Name>${escapeXML(model)}</Name>`);
    lines.push(`${i}      <Variations type="NULL"/>`);
    lines.push(`${i}    </Item>`);
  });

  lines.push(`${i}  </models>`);

  if (group.flags) {
    lines.push(`${i}  <flags>${escapeXML(group.flags)}</flags>`);
  }

  lines.push(`${i}</Item>`);

  return lines.join("\n");
}

async function copyVehGroupsToClipboard() {
  if (!originalText) {
    alert("Load a popgroups file first.");
    return;
  }

  const xmlText = buildGTASectionXML("vehGroups", parsedData.vehicles);

  try {
    await navigator.clipboard.writeText(xmlText);
    updateStatus("VEH Groups copied to clipboard.");
  } catch (err) {
    alert("Clipboard copy failed. Try running from localhost.");
    console.error(err);
  }
}

async function copyCurrentGroupOnly() {
  if (!originalText) {
    alert("Load a popgroups file first.");
    return;
  }

  const opened = Array.from(openGroups[currentSection]);

  if (opened.length !== 1) {
    alert("Open exactly one group first.");
    return;
  }

  const groupIndex = opened[0];
  const group = parsedData[currentSection][groupIndex];

  const xmlText = buildSingleGroupXML(group, "    ");

  try {
    await navigator.clipboard.writeText(xmlText);
    updateStatus(`Copied group ${group.name} to clipboard.`);
  } catch (err) {
    alert("Clipboard copy failed. Try running from localhost.");
    console.error(err);
  }
}

// =====================================================
// VEHICLES.META SPAWN PATCH EXPORT
// Generates a vehicles.meta containing only the vehicles
// present in the active popgroups vehGroups, with their
// spawn tuning values (frequency, maxNum,
// identicalModelSpawnDistance, maxNumOfSameColor) patched
// to whatever the user has set in the editor.
//
// Vehicles whose raw XML was captured at meta-drop time
// (_rawXml) get a surgically-patched complete Item.
// Vehicles with no raw XML get a minimal Item built from
// whatever parsed fields we have, with a warning comment.
//
// Install the output to:
//   update\update.rpf\common\data\vehicles.meta
// (use OpenIV; this file wins over all DLC versions)
// =====================================================

// XMLSerializer adds xmlns="" to every element when the source document
// has no namespace. GTA V's rage parser chokes on those declarations and
// crashes on load. Strip them before embedding the XML.
function cleanSerializedVehicleXml(xml) {
  // Remove xmlns="" and xmlns:xsi="" style declarations
  let out = xml.replace(/\s+xmlns(?::[a-zA-Z0-9_]+)?="[^"]*"/g, "");
  // Ensure the root <Item> tag has the required type attribute
  out = out.replace(
    /^(\s*<Item)(\s*>|\s+(?!type=))/,
    '$1 type="CVehicleModelInfo__InitData"$2'
  );
  return out;
}

function patchTrafficFieldInXml(xml, fieldName, value) {
  // Handles <frequency value="5"/> style
  const attrRx = new RegExp(
    `(<${fieldName}\\s+value=")[^"]*("\\s*/?>)`, "i"
  );
  if (attrRx.test(xml)) {
    return xml.replace(attrRx, `$1${value}$2`);
  }
  // Handles <frequency>5</frequency> style
  const textRx = new RegExp(
    `(<${fieldName}>)[^<]*(</[^>]+>)`, "i"
  );
  if (textRx.test(xml)) {
    return xml.replace(textRx, `$1${value}$2`);
  }
  return xml;
}

function buildMinimalVehicleItem(model, meta) {
  const m = meta || {};
  const lines = [
    `    <!-- SPAWN TUNING ONLY — minimal entry, no raw XML captured for ${escapeXML(model)} -->`,
    `    <Item type="CVehicleModelInfo__InitData">`,
    `      <modelName>${escapeXML(m.modelName || model)}</modelName>`,
    `      <txdName>${escapeXML(m.txdName || model)}</txdName>`,
    `      <handlingId>${escapeXML(m.handlingId || model.toUpperCase())}</handlingId>`,
    `      <gameName>${escapeXML(m.gameName || model.toUpperCase())}</gameName>`,
    `      <vehicleMakeName>${escapeXML(m.vehicleMakeName || "CARNOTFOUND")}</vehicleMakeName>`,
    `      <expressionDictName>null</expressionDictName>`,
    `      <expressionName>null</expressionName>`,
    `      <animConvRoofDictName>null</animConvRoofDictName>`,
    `      <animConvRoofName>null</animConvRoofName>`,
    `      <animConvRoofWindowsAffected/>`,
    `      <ptfxAssetName>null</ptfxAssetName>`,
    `      <audioNameHash>${escapeXML(m.audioNameHash || "AUDIBMWTRUCK")}</audioNameHash>`,
    `      <layout>${escapeXML(m.layout || "LAYOUT_STD_SPORT")}</layout>`,
    `      <coverBoundOffsets/>`,
    `      <explosionInfo>EXPLOSION_INFO_DEFAULT</explosionInfo>`,
    `      <scenarioLayout/>`,
    `      <cameraName>FOLLOW_CHEETAH_CAMERA</cameraName>`,
    `      <aimCameraName>MID_BOX_VEHICLE_AIM_CAMERA</aimCameraName>`,
    `      <bonnetCameraName>VEHICLE_BONNET_CAMERA_STANDARD_LONG_REBLA</bonnetCameraName>`,
    `      <povCameraName>REDUCED_NEAR_CLIP_POV_CAMERA</povCameraName>`,
    `      <vfxInfoName>VFXVEHICLEINFO_CAR_GENERIC</vfxInfoName>`,
    `      <shouldUseCinematicViewMode value="true"/>`,
    `      <shouldCameraTransitionOnClimbUpDown value="false"/>`,
    `      <shouldCameraIgnoreExiting value="false"/>`,
    `      <AllowPretendOccupants value="true"/>`,
    `      <AllowJoyriding value="true"/>`,
    `      <AllowSundayDriving value="true"/>`,
    `      <AllowBodyColorMapping value="true"/>`,
    `      <wheelScale value="0.300000"/>`,
    `      <wheelScaleRear value="0.300000"/>`,
    `      <dirtLevelMin value="0.000000"/>`,
    `      <dirtLevelMax value="1.000000"/>`,
    `      <envEffScaleMin value="0.000000"/>`,
    `      <envEffScaleMax value="1.000000"/>`,
    `      <envEffScaleMin2 value="0.000000"/>`,
    `      <envEffScaleMax2 value="1.000000"/>`,
    `      <damageMapScale value="0.500000"/>`,
    `      <damageOffsetScale value="0.500000"/>`,
    `      <diffuseTint value="0x00FFFFFF"/>`,
    `      <steerWheelMult value="1.000000"/>`,
    `      <HDTextureDist value="5.000000"/>`,
    `      <lodDistances content="float_array">`,
    `        10.000000`,
    `        25.000000`,
    `        60.000000`,
    `        120.000000`,
    `        500.000000`,
    `        500.000000`,
    `      </lodDistances>`,
    `      <minSeatHeight value="0.85"/>`,
    `      <identicalModelSpawnDistance value="${m.identicalModelSpawnDistance ?? 200}"/>`,
    `      <maxNumOfSameColor value="${m.maxNumOfSameColor ?? 2}"/>`,
    `      <defaultBodyHealth value="1000.000000"/>`,
    `      <pretendOccupantsScale value="1.000000"/>`,
    `      <visibleSpawnDistScale value="1.000000"/>`,
    `      <trackerPathWidth value="2.000000"/>`,
    `      <weaponForceMult value="1.000000"/>`,
    `      <frequency value="${m.frequency ?? 1}"/>`,
    `      <swankness>${escapeXML(m.swankness || "SWANKNESS_3")}</swankness>`,
    `      <maxNum value="${m.maxNum ?? 10}"/>`,
    `      <flags>FLAG_AVERAGE_CAR</flags>`,
    `      <type>${escapeXML(m.vehicleType || "VEHICLE_TYPE_CAR")}</type>`,
    `      <plateType>VPT_BACK_PLATES</plateType>`,
    `      <dashboardType>VDT_DUKES</dashboardType>`,
    `      <vehicleClass>${escapeXML(m.vehicleClass || "VC_COMPACT")}</vehicleClass>`,
    `      <wheelType>VWT_STANDARD</wheelType>`,
    `      <trailers/>`,
    `      <additionalTrailers/>`,
    `      <drivers/>`,
    `      <extraIncludes/>`,
    `      <doorsWithCollisionWhenClosed/>`,
    `      <driveableDoors/>`,
    `      <bumpersNeedToCollideWithMap value="false"/>`,
    `      <needsRopeTexture value="false"/>`,
    `      <requiredExtras/>`,
    `      <rewards/>`,
    `      <cinematicPartCamera/>`,
    `      <NmBraceOverrideSet/>`,
    `      <buoyancySphereOffset x="0.000000" y="0.000000" z="0.000000"/>`,
    `      <buoyancySphereSizeScale value="1.000000"/>`,
    `      <pOverrideRagdollThreshold type="NULL"/>`,
    `    </Item>`
  ];
  return lines.join("\n");
}

function buildVehiclesMetaForGroups() {
  const vm = (typeof vehicleMeta !== "undefined" ? vehicleMeta : null) || window.vehicleMeta || {};

  // Collect unique models from all vehGroups
  const allModels = [];
  const seen = new Set();
  (parsedData?.vehicles || []).forEach(group => {
    (group.models || []).forEach(model => {
      const key = String(model).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        allModels.push({ model, key });
      }
    });
  });

  if (!allModels.length) return null;

  const patchedItems = [];
  const noRawXml = [];   // models we built minimal entries for
  const noMeta = [];     // models with zero data at all

  const SPAWN_FIELDS = [
    ["frequency",                 m => m.frequency],
    ["maxNum",                    m => m.maxNum],
    ["identicalModelSpawnDistance", m => m.identicalModelSpawnDistance],
    ["maxNumOfSameColor",         m => m.maxNumOfSameColor]
  ];

  allModels.forEach(({ model, key }) => {
    const meta = vm[key];

    if (meta?._rawXml) {
      // Best path: patch traffic values directly into captured raw XML.
      // Clean namespace artifacts added by XMLSerializer first.
      let xml = cleanSerializedVehicleXml(meta._rawXml);

      SPAWN_FIELDS.forEach(([field, getter]) => {
        const v = getter(meta);
        if (v !== null && v !== undefined && String(v).trim() !== "") {
          xml = patchTrafficFieldInXml(xml, field, v);
        }
      });

      // Wrap in <Item> if the serializer gave us just the inner element name
      if (!xml.trim().startsWith("<Item")) {
        xml = `    <Item type="CVehicleModelInfo__InitData">${xml}</Item>`;
      } else {
        // Indent by 4 spaces
        xml = xml.split("\n").map(l => "    " + l).join("\n");
      }

      patchedItems.push(xml);

    } else if (meta) {
      // Have some parsed fields but no raw XML — build minimal Item
      patchedItems.push(buildMinimalVehicleItem(model, meta));
      noRawXml.push(model);

    } else {
      // No meta at all — skip but report
      noMeta.push(model);
    }
  });

  if (!patchedItems.length) return null;

  const warnings = [];
  if (noRawXml.length) {
    warnings.push(
      `  <!-- WARNING: The following vehicles had no raw XML captured (no file drop).\n` +
      `       Minimal entries were generated — verify these vehicles work in-game:\n` +
      `       ${noRawXml.join(", ")} -->`
    );
  }
  if (noMeta.length) {
    warnings.push(
      `  <!-- INFO: The following vehicles had no meta data and were SKIPPED.\n` +
      `       Drop their vehicles.meta on the popgroups page to include them:\n` +
      `       ${noMeta.join(", ")} -->`
    );
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- GTA Traffic Studio — Spawn Tuning Override -->`,
    `<!-- Install to: update\\update.rpf\\common\\data\\vehicles.meta -->`,
    `<!-- This file overrides spawn values for vehicles in your popgroups. -->`,
    `<!-- It wins over all DLC vehicles.meta files when installed to update.rpf -->`,
    `<CVehicleModelInfo__InitDataList>`,
    `  <InitDatas>`,
    ...warnings,
    ...patchedItems,
    `  </InitDatas>`,
    `</CVehicleModelInfo__InitDataList>`
  ].join("\n");
}

function exportVehiclesMeta() {
  if (!parsedData?.vehicles?.length) {
    alert("Load a popgroups file first.");
    return;
  }

  const xml = buildVehiclesMetaForGroups();

  if (!xml) {
    alert("No vehicle meta data found. Drop your vehicles.meta files on this page first.");
    return;
  }

  const blob = new Blob([xml], { type: "text/xml" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "vehicles_spawn_patch.meta";
  a.click();
  URL.revokeObjectURL(url);

  updateStatus("vehicles.meta spawn patch downloaded. Install to update\\update.rpf\\common\\data\\vehicles.meta");
}

function exportEditedXML() {
  if (!originalText) {
    alert("Load a popgroups file first.");
    return;
  }

  const xmlText = buildPopgroupsXML();

  const blob = new Blob([xmlText], {
    type: "text/xml"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${loadedFileName}_edited.xml`;
  a.click();

  URL.revokeObjectURL(url);

  hasUnsavedChanges = false;
  updateStatus("Export complete. GTA-style formatted XML downloaded.");

  if (typeof saveCurrentPopgroupsProject === "function") {
    saveCurrentPopgroupsProject({ silent: true });
  }
}
