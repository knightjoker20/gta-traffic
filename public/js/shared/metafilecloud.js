// =====================================================
// GTA Traffic Meta File Cloud  V1.0
// Shared module for storing and retrieving raw GTA
// meta files (vehicles.meta, handling.meta, etc.)
// from Cloudflare R2 via the Worker API.
//
// Usage (any page that includes this script):
//   await window.metaFileCloud.saveFile(fileType, packName, rawXml, metadata)
//   await window.metaFileCloud.getFile(fileType, packOrModel)
//   await window.metaFileCloud.listFiles(fileType)
//
// Supported fileType values (matches API):
//   'vehicles-meta'  'handling-meta'  'carcols-meta'
//   'carvariations-meta'  'popgroups'  (extensible)
// =====================================================

(() => {
  "use strict";

  const META_FILE_TOKEN_KEY = "gtaTrafficMetaFileToken";
  const BASE = "/api/meta-files";

  // ── Auth token (reuses Library Write Token) ───────
  function getToken() {
    let token = sessionStorage.getItem(META_FILE_TOKEN_KEY);
    if (!token) {
      token = String(window.prompt("Enter the GTA Traffic library write token:") || "").trim();
      if (token) sessionStorage.setItem(META_FILE_TOKEN_KEY, token);
    }
    return token;
  }

  function clearToken() {
    sessionStorage.removeItem(META_FILE_TOKEN_KEY);
  }

  function authHeaders(extra = {}) {
    return {
      "X-Library-Token": getToken(),
      ...extra
    };
  }

  // ── Core fetch helper ─────────────────────────────
  async function apiFetch(method, path, body, extraHeaders = {}) {
    const headers = { Accept: "application/json", ...extraHeaders };
    const opts = { method, headers };

    if (body !== undefined) {
      if (typeof body === "string") {
        headers["Content-Type"] = "application/xml; charset=utf-8";
        opts.body = body;
      } else {
        headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
      }
    }

    const res = await fetch(BASE + path, opts);

    // Handle 401 by clearing stored token so next call prompts again
    if (res.status === 401) {
      clearToken();
      throw new Error("Unauthorized — check your library write token.");
    }

    let json;
    try { json = await res.json(); }
    catch { throw new Error(`Meta file API returned non-JSON (HTTP ${res.status})`); }

    if (!res.ok || json.ok === false) {
      throw new Error(json.error || `API error HTTP ${res.status}`);
    }

    return json;
  }

  // ── Public API ────────────────────────────────────

  /**
   * Save a raw meta file to the cloud.
   * @param {string} fileType   e.g. 'vehicles-meta'
   * @param {string} packName   e.g. 'greenaid' or 'charger69'
   * @param {string} rawXml     Full XML text of the file
   * @param {object} metadata   { originalFilename, entryNames: string[] }
   * @returns {Promise<object>} API response
   */
  async function saveFile(fileType, packName, rawXml, metadata = {}) {
    const path = `/${encodeURIComponent(fileType)}/${encodeURIComponent(packName)}`;
    const headers = authHeaders({
      "X-Original-Filename": metadata.originalFilename || "",
      "X-Entry-Names": JSON.stringify(metadata.entryNames || [])
    });
    return apiFetch("PUT", path, rawXml, headers);
  }

  /**
   * Retrieve a raw meta file from the cloud.
   * Accepts either a pack name ('greenaid') or a model name ('astro88').
   * Returns { ok, file: { packName, fileType, entryCount, entryNames, xml, updatedAt } }
   */
  async function getFile(fileType, packOrModel) {
    const path = `/${encodeURIComponent(fileType)}/${encodeURIComponent(packOrModel)}`;
    return apiFetch("GET", path);
  }

  /**
   * List all stored files, optionally filtered by fileType.
   * Returns { ok, files: [{ fileType, packName, entryCount, originalFilename, updatedAt }] }
   */
  async function listFiles(fileType) {
    const qs = fileType ? `?fileType=${encodeURIComponent(fileType)}` : "";
    return apiFetch("GET", qs);
  }

  /**
   * Delete a stored meta file.
   */
  async function deleteFile(fileType, packName) {
    const path = `/${encodeURIComponent(fileType)}/${encodeURIComponent(packName)}`;
    return apiFetch("DELETE", path, undefined, authHeaders());
  }

  /**
   * Sanitize a string for use as a pack name key.
   * Lowercases, strips extension, replaces non-alphanumeric with hyphens.
   */
  function sanitizePackName(value) {
    return String(value || "")
      .replace(/\.(meta|xml|txt)$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      || "unnamed";
  }

  // ── Expose globally ───────────────────────────────
  window.metaFileCloud = {
    saveFile,
    getFile,
    listFiles,
    deleteFile,
    sanitizePackName,
    clearToken
  };

})();
