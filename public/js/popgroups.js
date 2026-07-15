// =====================================================
// POPGROUPS PARSER + GROUP EDITING
// Handles reading popgroups XML and moving/adding/removing vehicles.
// =====================================================

function handlePopgroupsFile(file) {
  loadedFileName = file.name.replace(/\.[^/.]+$/, "");

  const reader = new FileReader();

  reader.onload = e => {
    parsePopgroups(e.target.result, file.name);
  };

  reader.readAsText(file);
}

function parsePopgroups(text, filename) {
  originalText = text;

  parsedData = {
    vehicles: [],
    peds: []
  };

  openGroups = {
    vehicles: new Set(),
    peds: new Set()
  };

  hiddenGroups = {
    vehicles: new Set(),
    peds: new Set()
  };

  hasUnsavedChanges = false;

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");

  if (xml.querySelector("parsererror")) {
    els.status.innerHTML = "Error: Could not parse popgroups file.";
    return;
  }

  originalXMLDoc = xml;

  parseSection(xml, "vehGroups", "vehicles");
  parseSection(xml, "pedGroups", "peds");

  updateStatus(
    `Loaded ${filename}: ${parsedData.vehicles.length} vehicle groups, ${parsedData.peds.length} ped groups`
  );

  showSection("vehicles");

  if (typeof saveCurrentPopgroupsProject === "function") {
    saveCurrentPopgroupsProject({ silent: true });
  }

  if (typeof renderWorkspaceStatus === "function") {
    renderWorkspaceStatus(`Saved recent project: ${filename}`);
  }

  // Load installed flags from the Vehicle Library and re-render cards once ready
  loadInstalledModelsFromLibrary().then(() => renderSection(currentSection)).catch(() => {});

  if (typeof syncMainPagePopgroupsToCloud === "function") {
    syncMainPagePopgroupsToCloud(filename)
      .then(result => {
        if (result?.ok) {
          updateStatus(
            `Loaded ${filename}: ${parsedData.vehicles.length} vehicle groups, ` +
            `${parsedData.peds.length} ped groups | ` +
            `Cloud synced ${Number(result.imported || 0).toLocaleString()} Popgroups memberships.`
          );
        }
      })
      .catch(error => {
        console.warn("Main page Popgroups cloud sync failed.", error);

        if (els?.status) {
          els.status.innerHTML += `
            <br>
            <span class="warning">
              Cloud sync failed: ${escapeHTML(error.message || "Unknown error")}
            </span>
          `;
        }
      });
  }
}

function parseSection(xml, xmlTag, targetKey) {
  const section = xml.querySelector(xmlTag);
  if (!section) return;

  const groups = section.querySelectorAll(":scope > Item");

  groups.forEach(group => {
    const nameNode = group.querySelector(":scope > Name");
    const modelsNode = group.querySelector(":scope > models");
    const flagsNode = group.querySelector(":scope > flags");

    if (!nameNode || !modelsNode) return;

    const models = Array.from(modelsNode.children)
      .map(item => {
        const childName = item.querySelector(":scope > Name");
        return childName ? childName.textContent.trim() : item.textContent.trim();
      })
      .filter(Boolean);

    parsedData[targetKey].push({
      name: nameNode.textContent.trim(),
      models,
      flags: flagsNode ? flagsNode.textContent.trim() : ""
    });
  });
}

function showSection(section) {
  currentSection = section;
  els.sectionTitle.textContent = section === "vehicles" ? "Vehicles" : "Peds";

  document.querySelectorAll(".pg-section-tab").forEach(button => {
    button.classList.toggle("active", button.dataset.section === section);
  });

  renderSection(section);

  if (typeof schedulePopgroupsProjectSave === "function") {
    schedulePopgroupsProjectSave();
  }

  if (typeof scheduleWorkspaceUiSave === "function") {
    scheduleWorkspaceUiSave();
  }
}

function openAllGroups() {
  parsedData[currentSection].forEach((group, index) => {
    openGroups[currentSection].add(index);
  });

  renderSection(currentSection);

  if (typeof schedulePopgroupsProjectSave === "function") {
    schedulePopgroupsProjectSave();
  }
}

function closeAllGroups() {
  openGroups[currentSection].clear();
  renderSection(currentSection);

  if (typeof schedulePopgroupsProjectSave === "function") {
    schedulePopgroupsProjectSave();
  }
}

function copyGroupToMP(section, groupIndex) {
  const spGroup = parsedData[section][groupIndex];
  const mpGroupName = spGroup.name + "_MP";
  const mpGroupIndex = parsedData[section].findIndex(g => g.name === mpGroupName);

  if (mpGroupIndex === -1) {
    alert(`No matching group "${mpGroupName}" found.`);
    return;
  }

  const mpGroup = parsedData[section][mpGroupIndex];

  if (!confirm(
    `This will replace all ${mpGroup.models.length} entries in "${mpGroupName}" with ` +
    `the ${spGroup.models.length} entries from "${spGroup.name}".\n\nContinue?`
  )) return;

  mpGroup.models = [...spGroup.models];

  // Make sure the MP group is open so the user sees the result
  openGroups[section].add(mpGroupIndex);

  markUnsaved();
  renderSection(section);
}

async function loadInstalledModelsFromLibrary() {
  try {
    const store = window.vehicleLibraryStore;
    if (!store) return;
    const vehicles = await store.getVehicles();
    installedModels = new Set(
      vehicles
        .filter(v => v.custom?.installed === true)
        .map(v => String(v.modelName || v.id || "").toLowerCase())
        .filter(Boolean)
    );
  } catch (e) {
    console.warn("Could not load installed models from library.", e);
  }
}

function addEntry(section, groupIndex) {
  const input = document.getElementById(`add-${section}-${groupIndex}`);
  const value = input.value.trim();

  if (!value) return;

  parsedData[section][groupIndex].models.push(value);
  input.value = "";

  openGroups[section].add(groupIndex);

  markUnsaved();
  renderSection(section);
}

function removeEntry(section, groupIndex, modelIndex) {
  parsedData[section][groupIndex].models.splice(modelIndex, 1);

  openGroups[section].add(groupIndex);

  markUnsaved();
  renderSection(section);
}

function dragStartFromGroup(event, section, groupIndex, modelIndex) {
  draggedItem = {
    source: "group",
    section,
    groupIndex,
    modelIndex
  };

  event.dataTransfer.effectAllowed = "move";
}

function dragStartFromLibrary(event, modelName) {
  draggedItem = {
    source: "library",
    section: "vehicles",
    modelName
  };

  event.dataTransfer.effectAllowed = "copy";
}

function allowDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-over");
}

function dragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}

function dropCard(event, section, targetGroupIndex) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-over");

  if (!draggedItem) return;

  if (section !== "vehicles" && draggedItem.source === "library") return;

  if (draggedItem.source === "library") {
    const model = draggedItem.modelName;

    parsedData[section][targetGroupIndex].models.push(model);
    openGroups[section].add(targetGroupIndex);

    draggedItem = null;

    markUnsaved();
    renderSection(section);
    return;
  }

  if (draggedItem.source === "group") {
    if (draggedItem.section !== section) return;
    if (draggedItem.groupIndex === targetGroupIndex) return;

    const model = parsedData[section][draggedItem.groupIndex].models.splice(draggedItem.modelIndex, 1)[0];

    parsedData[section][targetGroupIndex].models.push(model);

    openGroups[section].add(draggedItem.groupIndex);
    openGroups[section].add(targetGroupIndex);

    draggedItem = null;

    markUnsaved();
    renderSection(section);
  }
}
