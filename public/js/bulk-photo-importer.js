// =====================================================
// BULK VEHICLE PHOTO IMPORTER (Admin dashboard)
// Accepts a .zip of vehicle screenshots OR individual
// JPG / PNG / WebP files dropped directly. When images
// are dropped individually they are packed into a zip
// client-side (via JSZip) before upload, so the backend
// endpoint stays unchanged.
// =====================================================

(function () {
  const UPLOAD_TOKEN_KEY = "gtaTrafficImageUploadToken";
  const MAX_ZIP_BYTES    = 90 * 1024 * 1024;  // 90 MB
  const MAX_IMAGE_BYTES  = 10 * 1024 * 1024;  // 10 MB per image
  const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const ACCEPTED_IMAGE_EXTS  = [".jpg", ".jpeg", ".png", ".webp"];

  const STATUS_LABELS = {
    uploaded:        "Uploaded",
    unmatched:       "Unmatched",
    tooLarge:        "Too large",
    skippedExisting: "Skipped (existing)",
    skipped:         "Skipped",
    failed:          "Failed"
  };

  const STATUS_TONES = {
    uploaded:        "good",
    unmatched:       "warning",
    tooLarge:        "warning",
    skippedExisting: "muted",
    skipped:         "muted",
    failed:          "danger"
  };

  // selectedFile  → a single .zip File
  // selectedImages → array of image File objects
  let selectedFile   = null;
  let selectedImages = [];

  // ── helpers ────────────────────────────────────────

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
    if (value >= 1024 * 1024) return (value / (1024 * 1024)).toFixed(2) + " MB";
    if (value >= 1024)        return (value / 1024).toFixed(1) + " KB";
    return value + " B";
  }

  function isImageFile(file) {
    if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return true;
    const lower = file.name.toLowerCase();
    return ACCEPTED_IMAGE_EXTS.some(ext => lower.endsWith(ext));
  }

  function getUploadToken() {
    try { return localStorage.getItem(UPLOAD_TOKEN_KEY) || ""; }
    catch { return ""; }
  }

  function saveUploadToken(token) {
    try { localStorage.setItem(UPLOAD_TOKEN_KEY, token); }
    catch { /* localStorage unavailable */ }
  }

  function clearUploadToken() {
    try { localStorage.removeItem(UPLOAD_TOKEN_KEY); }
    catch { /* no-op */ }
  }

  function setStatus(message, tone) {
    const status = document.getElementById("bulkPhotoStatus");
    if (!status) return;
    status.textContent = message;
    status.className = "inline-status" + (tone ? " " + tone : "");
  }

  // ── JSZip loader ───────────────────────────────────

  let _jszipPromise = null;

  function loadJSZip() {
    if (_jszipPromise) return _jszipPromise;
    _jszipPromise = new Promise((resolve, reject) => {
      if (window.JSZip) { resolve(window.JSZip); return; }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload  = () => resolve(window.JSZip);
      script.onerror = () => reject(new Error("Failed to load JSZip"));
      document.head.appendChild(script);
    });
    return _jszipPromise;
  }

  // ── section build ──────────────────────────────────

  function buildSection() {
    const container = document.getElementById("adminBulkPhotoPanel");
    if (!container || container.dataset.built === "true") return container;
    container.dataset.built = "true";

    container.innerHTML = `
      <div class="section-heading bulk-photo-heading">
        <div>
          <h2>Bulk Vehicle Photo Importer</h2>
          <p>
            Drop a <strong>.zip</strong> of vehicle screenshots, or drag individual
            <strong>JPG / PNG / WebP</strong> images directly. Name each file exactly like the
            vehicle&rsquo;s model name (e.g. <code>zentorno.png</code>) &mdash; subfolders inside
            a zip are fine, and matching is case-insensitive. Unmatched files are skipped and
            listed below.
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

      <div class="bulk-photo-dropzone" id="bulkPhotoDropZone" tabindex="0" role="button"
           aria-label="Choose a zip or image files">
        <strong id="bulkPhotoDropTitle">Drop a .zip or JPG / PNG / WebP files here, or click to browse</strong>
        <span>Images up to 10 MB each &middot; .zip up to 90 MB total &middot; Multiple images OK</span>
      </div>
      <input type="file" id="bulkPhotoFileInput"
             accept=".zip,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
             multiple class="hidden">

      <div class="bulk-photo-actions">
        <button type="button" id="bulkPhotoUploadBtn" disabled>Upload &amp; Overwrite Photos</button>
        <span class="inline-status" id="bulkPhotoStatus">Choose a zip or image files to begin.</span>
      </div>

      <div class="bulk-photo-summary" id="bulkPhotoSummary"></div>
      <div class="bulk-photo-results-wrap" id="bulkPhotoResultsWrap"></div>
    `;

    return container;
  }

  // ── state helpers ──────────────────────────────────

  function clearSelection() {
    selectedFile   = null;
    selectedImages = [];
  }

  function updateUploadButtonState() {
    const uploadBtn = document.getElementById("bulkPhotoUploadBtn");
    if (uploadBtn) {
      uploadBtn.disabled = !(selectedFile || selectedImages.length > 0);
    }
  }

  function setDropTitle(text) {
    const el = document.getElementById("bulkPhotoDropTitle");
    if (el) el.textContent = text;
  }

  // ── file handling ──────────────────────────────────

  function handleFilesChosen(files) {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Single zip
    if (fileArray.length === 1 && fileArray[0].name.toLowerCase().endsWith(".zip")) {
      const zip = fileArray[0];

      if (zip.size > MAX_ZIP_BYTES) {
        setStatus(
          `That zip is ${formatBytes(zip.size)}. The limit is ` +
          `${Math.floor(MAX_ZIP_BYTES / (1024 * 1024))} MB per upload.`,
          "danger"
        );
        return;
      }

      clearSelection();
      selectedFile = zip;
      setDropTitle(`${zip.name} (${formatBytes(zip.size)})`);
      setStatus("Ready to upload zip.", "good");
      updateUploadButtonState();
      return;
    }

    // One or more image files
    const images    = fileArray.filter(isImageFile);
    const nonImages = fileArray.filter(f => !isImageFile(f) && !f.name.toLowerCase().endsWith(".zip"));
    const tooLarge  = images.filter(f => f.size > MAX_IMAGE_BYTES);
    const valid     = images.filter(f => f.size <= MAX_IMAGE_BYTES);

    if (nonImages.length > 0) {
      setStatus(
        `Skipped ${nonImages.length} unsupported file(s). Only JPG, PNG, WebP, or a single .zip are accepted.`,
        "warning"
      );
    }

    if (tooLarge.length > 0) {
      setStatus(
        `${tooLarge.length} image(s) exceed 10 MB and were skipped.` +
        (valid.length > 0 ? ` ${valid.length} image(s) ready.` : ""),
        "warning"
      );
    }

    if (valid.length === 0) {
      setStatus("No valid image files found. Use JPG, PNG, or WebP under 10 MB.", "danger");
      return;
    }

    clearSelection();
    selectedImages = valid;

    const totalBytes = valid.reduce((sum, f) => sum + f.size, 0);
    setDropTitle(
      valid.length === 1
        ? `${valid[0].name} (${formatBytes(valid[0].size)})`
        : `${valid.length} images selected (${formatBytes(totalBytes)} total)`
    );

    if (tooLarge.length === 0 && nonImages.length === 0) {
      setStatus(`${valid.length} image(s) ready to upload.`, "good");
    }

    updateUploadButtonState();
  }

  // ── results rendering ──────────────────────────────

  function renderSummary(summary) {
    const summaryEl = document.getElementById("bulkPhotoSummary");
    if (!summaryEl) return;

    const order = ["uploaded", "unmatched", "tooLarge", "skippedExisting", "skipped", "failed"];

    summaryEl.innerHTML = order
      .filter(status => summary[status])
      .map(status => `
        <span class="bulk-photo-pill ${STATUS_TONES[status] || ""}">
          ${escapeHTML(STATUS_LABELS[status] || status)}: ${summary[status]}
        </span>
      `)
      .join("");
  }

  function renderResults(results) {
    const wrap = document.getElementById("bulkPhotoResultsWrap");
    if (!wrap) return;

    if (!results.length) {
      wrap.innerHTML = '<div class="empty-state">No entries were processed.</div>';
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
              <td><span class="bulk-photo-pill ${STATUS_TONES[result.status] || ""}">
                ${escapeHTML(STATUS_LABELS[result.status] || result.status)}
              </span></td>
              <td>${escapeHTML(result.modelName || "—")}</td>
              <td>${escapeHTML(result.fileName  || "—")}</td>
              <td class="muted">${escapeHTML(result.message || "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // ── upload ─────────────────────────────────────────

  async function getUploadZipBuffer() {
    // Already a zip — return its buffer directly
    if (selectedFile) {
      return selectedFile.arrayBuffer();
    }

    // Pack individual images into a zip client-side
    const JSZip  = await loadJSZip();
    const zipper = new JSZip();

    for (const img of selectedImages) {
      zipper.file(img.name, img);
    }

    return zipper.generateAsync({
      type:               "arraybuffer",
      compression:        "DEFLATE",
      compressionOptions: { level: 6 }
    });
  }

  async function uploadZip() {
    if (!selectedFile && selectedImages.length === 0) {
      setStatus("Choose a zip or image files first.", "warning");
      return;
    }

    const token = getUploadToken();
    if (!token) {
      setStatus("Enter and save the image upload token first.", "warning");
      return;
    }

    const skipExisting = document.getElementById("bulkPhotoSkipExisting")?.checked || false;
    const isImages     = selectedImages.length > 0;

    const confirmMsg = isImages
      ? `This will upload ${selectedImages.length} image(s) and overwrite any existing matching vehicle photos. Continue?`
      : "This will overwrite existing vehicle photos for every matched file in the zip. Continue?";

    if (!window.confirm(confirmMsg)) return;

    const uploadBtn = document.getElementById("bulkPhotoUploadBtn");
    if (uploadBtn) uploadBtn.disabled = true;

    setStatus(
      isImages
        ? `Packing ${selectedImages.length} image(s) and uploading…`
        : "Uploading and processing zip…",
      ""
    );

    try {
      const fileBuffer = await getUploadZipBuffer();

      const response = await fetch(
        "/api/vehicle-images/import-bulk?skipExisting=" + (skipExisting ? "true" : "false"),
        {
          method:  "POST",
          headers: { "x-upload-token": token, "Content-Type": "application/zip" },
          body:    fileBuffer
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
      setStatus("Bulk import failed: " + (error.message || "Unknown error"), "danger");
    } finally {
      updateUploadButtonState();
    }
  }

  // ── wiring ─────────────────────────────────────────

  function wireSection(section) {
    if (section.dataset.wired === "true") return;
    section.dataset.wired = "true";

    const tokenInput   = document.getElementById("bulkPhotoTokenInput");
    const saveTokenBtn = document.getElementById("bulkPhotoSaveTokenBtn");
    const clearTokenBtn= document.getElementById("bulkPhotoClearTokenBtn");
    const dropZone     = document.getElementById("bulkPhotoDropZone");
    const fileInput    = document.getElementById("bulkPhotoFileInput");
    const uploadBtn    = document.getElementById("bulkPhotoUploadBtn");

    if (getUploadToken() && tokenInput) {
      tokenInput.placeholder = "Image upload token saved in this browser";
    }

    saveTokenBtn?.addEventListener("click", () => {
      const token = tokenInput?.value?.trim() || "";
      if (!token) { setStatus("Enter an upload token before saving.", "warning"); return; }
      saveUploadToken(token);
      tokenInput.value = "";
      tokenInput.placeholder = "Image upload token saved in this browser";
      setStatus("Upload token saved in this browser.", "good");
    });

    clearTokenBtn?.addEventListener("click", () => {
      clearUploadToken();
      if (tokenInput) { tokenInput.value = ""; tokenInput.placeholder = "Image upload token"; }
      setStatus("Upload token cleared.", "warning");
    });

    dropZone?.addEventListener("click",  () => fileInput?.click());

    dropZone?.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput?.click();
      }
    });

    fileInput?.addEventListener("change", event => {
      handleFilesChosen(event.target.files);
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
      handleFilesChosen(event.dataTransfer?.files);
    });

    uploadBtn?.addEventListener("click", uploadZip);

    // Preload JSZip so packing is instant when the user clicks upload
    loadJSZip().catch(() => { /* non-fatal — loads on demand if this fails */ });
  }

  // ── init ───────────────────────────────────────────

  function initBulkPhotoImporter() {
    const section = buildSection();
    if (section) wireSection(section);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBulkPhotoImporter);
  } else {
    initBulkPhotoImporter();
  }
})();
