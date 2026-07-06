// =====================================================
// BULK VEHICLE PHOTO IMPORTER (Admin dashboard)
// Lets the site admin upload a .zip of vehicle screenshots
// and overwrite vehicle images in bulk. Like the rest of
// admin.html, the page itself isn't role-gated — the write
// is protected server-side by the existing IMAGE_UPLOAD_TOKEN,
// same as the single-image upload endpoint and
// bulk-upload-vehicle-images.ps1.
// =====================================================

(function () {
  const UPLOAD_TOKEN_KEY = "gtaTrafficImageUploadToken";
  const MAX_ZIP_BYTES = 90 * 1024 * 1024;

  const STATUS_LABELS = {
    uploaded: "Uploaded",
    unmatched: "Unmatched",
    tooLarge: "Too large",
    skippedExisting: "Skipped (existing)",
    skipped: "Skipped",
    failed: "Failed"
  };

  const STATUS_TONES = {
    uploaded: "good",
    unmatched: "warning",
    tooLarge: "warning",
    skippedExisting: "muted",
    skipped: "muted",
    failed: "danger"
  };

  let selectedFile = null;

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);

    if (value >= 1024 * 1024) {
      return (value / (1024 * 1024)).toFixed(2) + " MB";
    }

    if (value >= 1024) {
      return (value / 1024).toFixed(1) + " KB";
    }

    return value + " B";
  }

  function getUploadToken() {
    try {
      return localStorage.getItem(UPLOAD_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function saveUploadToken(token) {
    try {
      localStorage.setItem(UPLOAD_TOKEN_KEY, token);
    } catch {
      /* localStorage unavailable — token just won't persist */
    }
  }

  function clearUploadToken() {
    try {
      localStorage.removeItem(UPLOAD_TOKEN_KEY);
    } catch {
      /* no-op */
    }
  }

  function setStatus(message, tone) {
    const status = document.getElementById("bulkPhotoStatus");

    if (!status) {
      return;
    }

    status.textContent = message;
    status.className = "inline-status" + (tone ? " " + tone : "");
  }

  function buildSection() {
    const container = document.getElementById("adminBulkPhotoPanel");

    if (!container || container.dataset.built === "true") {
      return container;
    }

    container.dataset.built = "true";

    container.innerHTML = `
      <div class="section-heading bulk-photo-heading">
        <div>
          <h2>Bulk Vehicle Photo Importer</h2>
          <p>
            Upload a .zip of vehicle screenshots to overwrite photos in the vehicle image library.
            Name each file exactly like the vehicle's model name (for example
            <code>zentorno.png</code>) — subfolders inside the zip are fine, and matching is
            case-insensitive. Unmatched files are skipped and listed below.
          </p>
        </div>
      </div>

      <div class="token-row">
        <input id="bulkPhotoTokenInput" type="password" placeholder="Image upload token" autocomplete="off">
        <button type="button" id="bulkPhotoSaveTokenBtn">Save Token</button>
        <button type="button" class="secondary" id="bulkPhotoClearTokenBtn">Clear</button>
      </div>

      <label class="bulk-photo-checkbox-row">
        <input type="checkbox" id="bulkPhotoSkipExisting">
        <span>Skip vehicles that already have a photo (otherwise existing photos are overwritten)</span>
      </label>

      <div class="bulk-photo-dropzone" id="bulkPhotoDropZone" tabindex="0" role="button" aria-label="Choose a zip file">
        <strong id="bulkPhotoDropTitle">Drop a .zip file here, or click to browse</strong>
        <span>Images up to 10 MB each &middot; .zip up to 90 MB total &middot; JPG, PNG, WebP supported</span>
      </div>
      <input type="file" id="bulkPhotoFileInput" accept=".zip" class="hidden">

      <div class="bulk-photo-actions">
        <button type="button" id="bulkPhotoUploadBtn" disabled>Upload &amp; Overwrite Photos</button>
        <span class="inline-status" id="bulkPhotoStatus">Choose a zip file to begin.</span>
      </div>

      <div class="bulk-photo-summary" id="bulkPhotoSummary"></div>
      <div class="bulk-photo-results-wrap" id="bulkPhotoResultsWrap"></div>
    `;

    return container;
  }

  function updateUploadButtonState() {
    const uploadBtn = document.getElementById("bulkPhotoUploadBtn");

    if (uploadBtn) {
      uploadBtn.disabled = !selectedFile;
    }
  }

  function handleFileChosen(file) {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setStatus("Please choose a .zip file.", "danger");
      return;
    }

    if (file.size > MAX_ZIP_BYTES) {
      setStatus(
        `That zip is ${formatBytes(file.size)}. The limit is ` +
          `${Math.floor(MAX_ZIP_BYTES / (1024 * 1024))} MB per upload.`,
        "danger"
      );
      return;
    }

    selectedFile = file;

    const dropTitle = document.getElementById("bulkPhotoDropTitle");

    if (dropTitle) {
      dropTitle.textContent = `${file.name} (${formatBytes(file.size)})`;
    }

    setStatus("Ready to upload.", "good");
    updateUploadButtonState();
  }

  function renderSummary(summary) {
    const summaryEl = document.getElementById("bulkPhotoSummary");

    if (!summaryEl) {
      return;
    }

    const order = [
      "uploaded",
      "unmatched",
      "tooLarge",
      "skippedExisting",
      "skipped",
      "failed"
    ];

    summaryEl.innerHTML = order
      .filter(status => summary[status])
      .map(status => {
        return `
          <span class="bulk-photo-pill ${STATUS_TONES[status] || ""}">
            ${escapeHTML(STATUS_LABELS[status] || status)}: ${summary[status]}
          </span>
        `;
      })
      .join("");
  }

  function renderResults(results) {
    const wrap = document.getElementById("bulkPhotoResultsWrap");

    if (!wrap) {
      return;
    }

    if (!results.length) {
      wrap.innerHTML = '<div class="empty-state">No zip entries were processed.</div>';
      return;
    }

    wrap.innerHTML = `
      <table class="bulk-photo-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Vehicle Model</th>
            <th>File</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(result => `
            <tr>
              <td><span class="bulk-photo-pill ${STATUS_TONES[result.status] || ""}">${escapeHTML(STATUS_LABELS[result.status] || result.status)}</span></td>
              <td>${escapeHTML(result.modelName || "—")}</td>
              <td>${escapeHTML(result.fileName || "—")}</td>
              <td class="muted">${escapeHTML(result.message || "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  async function uploadZip() {
    if (!selectedFile) {
      setStatus("Choose a zip file first.", "warning");
      return;
    }

    const token = getUploadToken();

    if (!token) {
      setStatus("Enter and save the image upload token first.", "warning");
      return;
    }

    const skipExisting =
      document.getElementById("bulkPhotoSkipExisting")?.checked || false;

    const confirmed = window.confirm(
      "This will overwrite existing vehicle photos for every matched file in the zip. Continue?"
    );

    if (!confirmed) {
      return;
    }

    const uploadBtn = document.getElementById("bulkPhotoUploadBtn");

    if (uploadBtn) {
      uploadBtn.disabled = true;
    }

    setStatus("Uploading and processing zip...", "");

    try {
      const fileBuffer = await selectedFile.arrayBuffer();

      const response = await fetch(
        "/api/vehicle-images/import-bulk?skipExisting=" + (skipExisting ? "true" : "false"),
        {
          method: "POST",
          headers: {
            "x-upload-token": token,
            "Content-Type": "application/zip"
          },
          body: fileBuffer
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      renderSummary(payload.summary || {});
      renderResults(payload.results || []);

      const uploadedCount = payload.summary?.uploaded || 0;
      setStatus(`Done. ${uploadedCount} photo(s) uploaded.`, "good");
    } catch (error) {
      setStatus(
        "Bulk import failed: " + (error.message || "Unknown error"),
        "danger"
      );
    } finally {
      updateUploadButtonState();
    }
  }

  function wireSection(section) {
    if (section.dataset.wired === "true") {
      return;
    }

    section.dataset.wired = "true";

    const tokenInput = document.getElementById("bulkPhotoTokenInput");
    const saveTokenBtn = document.getElementById("bulkPhotoSaveTokenBtn");
    const clearTokenBtn = document.getElementById("bulkPhotoClearTokenBtn");
    const dropZone = document.getElementById("bulkPhotoDropZone");
    const fileInput = document.getElementById("bulkPhotoFileInput");
    const uploadBtn = document.getElementById("bulkPhotoUploadBtn");

    if (getUploadToken() && tokenInput) {
      tokenInput.placeholder = "Image upload token saved in this browser";
    }

    saveTokenBtn?.addEventListener("click", () => {
      const token = tokenInput?.value?.trim() || "";

      if (!token) {
        setStatus("Enter an upload token before saving.", "warning");
        return;
      }

      saveUploadToken(token);
      tokenInput.value = "";
      tokenInput.placeholder = "Image upload token saved in this browser";
      setStatus("Upload token saved in this browser.", "good");
    });

    clearTokenBtn?.addEventListener("click", () => {
      clearUploadToken();

      if (tokenInput) {
        tokenInput.value = "";
        tokenInput.placeholder = "Image upload token";
      }

      setStatus("Upload token cleared.", "warning");
    });

    dropZone?.addEventListener("click", () => fileInput?.click());

    dropZone?.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput?.click();
      }
    });

    fileInput?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      handleFileChosen(file);
    });

    ["dragenter", "dragover"].forEach(eventName => {
      dropZone?.addEventListener(eventName, event => {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.add("is-dragging");
      });
    });

    ["dragleave", "dragend"].forEach(eventName => {
      dropZone?.addEventListener(eventName, event => {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.remove("is-dragging");
      });
    });

    dropZone?.addEventListener("drop", event => {
      event.preventDefault();
      event.stopPropagation();
      dropZone.classList.remove("is-dragging");

      const file = event.dataTransfer?.files?.[0];
      handleFileChosen(file);
    });

    uploadBtn?.addEventListener("click", uploadZip);
  }

  function initBulkPhotoImporter() {
    const section = buildSection();

    if (section) {
      wireSection(section);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBulkPhotoImporter);
  } else {
    initBulkPhotoImporter();
  }
})();
