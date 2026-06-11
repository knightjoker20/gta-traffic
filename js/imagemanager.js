// =====================================================
// IMAGE MANAGER
// Handles vehicle thumbnails, refresh, and extension fallback.
// Looks for jpg, then png, then webp in /images.
// =====================================================

function toggleImageMode() {
  imageMode = !imageMode;
  renderSection(currentSection);

  if (typeof scheduleWorkspaceUiSave === "function") {
    scheduleWorkspaceUiSave();
  }
}

function refreshImages() {
  imageRefreshVersion = Date.now();

  renderSection(currentSection);
  renderVehicleLibrary();

  updateStatus("Images refreshed. If a new image still does not appear, check filename and extension.");
}

function renderVehicleImage(model, cssClass) {
  const safeModel = escapeAttribute(model.toLowerCase());
  const altText = escapeAttribute(model);

  return `
    <img
      class="${cssClass}"
      src="images/${safeModel}.jpg?v=${imageRefreshVersion}"
      onerror="tryNextImage(this, '${safeModel}', 0)"
      alt="${altText}"
    >
  `;
}

function tryNextImage(img, model, step) {
  if (step === 0) {
    img.onerror = () => tryNextImage(img, model, 1);
    img.src = `images/${model}.png?v=${imageRefreshVersion}`;
    return;
  }

  if (step === 1) {
    img.onerror = () => tryNextImage(img, model, 2);
    img.src = `images/${model}.webp?v=${imageRefreshVersion}`;
    return;
  }

  const placeholder = document.createElement("div");
  placeholder.className = img.classList.contains("library-img") ? "no-img library-img" : "no-img";
  placeholder.textContent = "No image";

  img.replaceWith(placeholder);
}
