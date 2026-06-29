(function () {
  function styleElement(element, styles) {
    if (!element) return;

    Object.entries(styles).forEach(([key, value]) => {
      element.style[key] = value;
    });
  }

  function setStatus(message, type) {
    const status = document.getElementById("packBuilderStatus");

    if (!status) return;

    status.innerHTML =
      '<div class="' + (type || "success") + '">' +
      String(message || "") +
      "</div>";
  }

  function forcePackBuilderDropZoneStyles() {
    const dropZone = document.getElementById("packBuilderMetaDropZone");
    const metaInput = document.getElementById("builderVehicleMetaInput");
    const icon = dropZone?.querySelector(".pack-meta-drop-icon");
    const title = dropZone?.querySelector(".pack-meta-drop-title");
    const subtitle = dropZone?.querySelector(".pack-meta-drop-subtitle");

    styleElement(dropZone, {
      display: "flex",
      width: "100%",
      minHeight: "150px",
      boxSizing: "border-box",
      margin: "18px 0 14px",
      padding: "34px 22px",
      border: "2px dashed rgba(148, 163, 184, 0.38)",
      borderRadius: "16px",
      background: "rgba(2, 6, 23, 0.55)",
      color: "#cbd5e1",
      textAlign: "center",
      cursor: "pointer",
      userSelect: "none",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "8px"
    });

    styleElement(icon, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "64px",
      height: "36px",
      border: "1px solid rgba(168, 85, 247, 0.75)",
      borderRadius: "10px",
      color: "#c084fc",
      fontSize: "0.9rem",
      fontWeight: "950",
      letterSpacing: "0.12em"
    });

    styleElement(title, {
      display: "block",
      fontSize: "1.15rem",
      fontWeight: "950",
      color: "#e5e7eb"
    });

    styleElement(subtitle, {
      display: "block",
      color: "#94a3b8",
      fontSize: "0.94rem"
    });

    styleElement(metaInput, {
      display: "block",
      width: "100%",
      minWidth: "100%",
      maxWidth: "100%",
      minHeight: "220px",
      margin: "10px 0 18px",
      boxSizing: "border-box",
      resize: "vertical"
    });
  }

  async function readPackBuilderMetaFile(file) {
    if (!file) return;

    const fileName = String(file.name || "").toLowerCase();

    if (
      !fileName.endsWith(".meta") &&
      !fileName.endsWith(".xml") &&
      !fileName.endsWith(".txt")
    ) {
      setStatus("Please use a .meta, .xml, or .txt file.", "error");
      return;
    }

    const metaInput = document.getElementById("builderVehicleMetaInput");

    if (!metaInput) {
      setStatus("vehicles.meta paste box was not found.", "error");
      return;
    }

    metaInput.value = await file.text();

    if (typeof window.buildPackJsonFromVehicleMeta === "function") {
      window.buildPackJsonFromVehicleMeta();
      setStatus("vehicles.meta loaded into Pack DB Builder.", "success");
    } else if (typeof buildPackJsonFromVehicleMeta === "function") {
      buildPackJsonFromVehicleMeta();
      setStatus("vehicles.meta loaded into Pack DB Builder.", "success");
    } else {
      setStatus("vehicles.meta loaded. Click Build From vehicles.meta.", "warning");
    }
  }

  function wirePackBuilderMetaDropZone() {
    const dropZone = document.getElementById("packBuilderMetaDropZone");
    const fileInput = document.getElementById("packBuilderMetaFileInput");

    if (!dropZone || !fileInput) {
      return false;
    }

    forcePackBuilderDropZoneStyles();

    if (dropZone.dataset.dropzoneReady === "true") {
      return true;
    }

    dropZone.dataset.dropzoneReady = "true";

    dropZone.addEventListener("click", function () {
      fileInput.click();
    });

    dropZone.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener("change", function (event) {
      const file = event.target.files?.[0];

      readPackBuilderMetaFile(file).finally(function () {
        event.target.value = "";
      });
    });

    ["dragenter", "dragover"].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        event.stopPropagation();

        dropZone.classList.add("is-dragging");
        dropZone.style.borderColor = "rgba(168, 85, 247, 0.95)";
        dropZone.style.background = "rgba(88, 28, 135, 0.24)";
      });
    });

    ["dragleave", "dragend"].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (event) {
        event.preventDefault();
        event.stopPropagation();

        dropZone.classList.remove("is-dragging");
        dropZone.style.borderColor = "rgba(148, 163, 184, 0.38)";
        dropZone.style.background = "rgba(2, 6, 23, 0.55)";
      });
    });

    dropZone.addEventListener("drop", function (event) {
      event.preventDefault();
      event.stopPropagation();

      dropZone.classList.remove("is-dragging");
      dropZone.style.borderColor = "rgba(148, 163, 184, 0.38)";
      dropZone.style.background = "rgba(2, 6, 23, 0.55)";

      const file = event.dataTransfer?.files?.[0];
      readPackBuilderMetaFile(file);
    });

    return true;
  }

  function startPackBuilderMetaDropZone() {
    wirePackBuilderMetaDropZone();

    let attempts = 0;
    const timer = window.setInterval(function () {
      attempts += 1;
      forcePackBuilderDropZoneStyles();

      if (wirePackBuilderMetaDropZone() || attempts > 40) {
        window.clearInterval(timer);
      }
    }, 500);
  }

  window.forcePackBuilderDropZoneStyles = forcePackBuilderDropZoneStyles;
  window.wirePackBuilderMetaDropZone = wirePackBuilderMetaDropZone;
  window.readPackBuilderMetaFile = readPackBuilderMetaFile;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPackBuilderMetaDropZone);
  } else {
    startPackBuilderMetaDropZone();
  }
})();
