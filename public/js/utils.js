// =====================================================
// UTILS
// Small helper functions used by multiple modules.
// =====================================================

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeXML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function scrollToPanel(id) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function setupDropZone(zone, handler) {
  zone.addEventListener("dragover", e => {
    e.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("dragover");

    Array.from(e.dataTransfer.files).forEach(file => handler(file));
  });
}

function getText(parent, tag) {
  const node = parent.querySelector(`:scope > ${tag}`);
  return node ? node.textContent.trim() : "";
}

function updateStatus(message) {
  els.status.innerHTML = hasUnsavedChanges
    ? `<span class="unsaved">${message}</span>`
    : `<span class="saved">${message}</span>`;
}

function markUnsaved() {
  hasUnsavedChanges = true;
  updateStatus("Changes autosaved locally. Export XML when ready for GTA.");

  if (typeof schedulePopgroupsProjectSave === "function") {
    schedulePopgroupsProjectSave();
  }
}

function openImageSearch(model) {
  const query = encodeURIComponent(`GTA V ${model} vehicle mod`);
  window.open(`https://www.google.com/search?tbm=isch&q=${query}`, "_blank");
}
