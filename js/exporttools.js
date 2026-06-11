// =====================================================
// EXPORT TOOLS
// Builds GTA-style popgroups XML.
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
