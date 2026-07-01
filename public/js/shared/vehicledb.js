/**
 * vehicledb.js — Shared GTA Mod File Database Client
 * ====================================================
 * Every page and tool can import this module to look up
 * data parsed from vehicles.meta, handling.meta,
 * popgroups.ymt.xml, and popcycle.dat files.
 *
 * Cross-reference chain:
 *   popcycle zone → vehGroup names (in popcycle_slots.veh_groups)
 *   vehGroup names → model names  (in popgroup_members)
 *   model name     → handlingId   (in vehicle_meta_entries)
 *   handlingId     → handling row (in handling_meta_entries)
 *
 * Usage:
 *   import VehicleDB from '/js/shared/vehicledb.js';
 *   const veh = await VehicleDB.getVehicle('sultan');
 *   const han = await VehicleDB.getHandling('sultan');
 *   const grp = await VehicleDB.getGroupsForModel('sultan');
 */

const BASE = '/api/moddb';

// ── helpers ────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Vehicle Meta entries ────────────────────────────────────────────

const VehicleDB = {

  /**
   * Get a single vehicle entry by spawn name (modelName).
   * Returns the DB row or null if not found.
   */
  async getVehicle(modelName, packId = 'default') {
    return apiFetch(`/vehicles/${encodeURIComponent(modelName)}?pack=${encodeURIComponent(packId)}`);
  },

  /**
   * List vehicle entries.
   * @param {object} opts - { packId, vehicleClass, search, limit, offset }
   */
  async listVehicles(opts = {}) {
    const p = new URLSearchParams();
    if (opts.packId)       p.set('pack',    opts.packId);
    if (opts.vehicleClass) p.set('class',   opts.vehicleClass);
    if (opts.search)       p.set('q',       opts.search);
    if (opts.limit)        p.set('limit',   String(opts.limit));
    if (opts.offset)       p.set('offset',  String(opts.offset));
    return apiFetch(`/vehicles?${p}`);
  },

  // ── Handling Meta entries ─────────────────────────────────────────

  /**
   * Get a handling entry by handlingName.
   * Pass handlingId from a vehicle_meta_entries row directly.
   */
  async getHandling(handlingName, packId = 'default') {
    return apiFetch(`/handling/${encodeURIComponent(handlingName)}?pack=${encodeURIComponent(packId)}`);
  },

  /**
   * Convenience: get the handling row for a vehicle by its modelName.
   * Looks up the vehicle first, then fetches its handling entry.
   */
  async getHandlingForVehicle(modelName, packId = 'default') {
    const veh = await this.getVehicle(modelName, packId);
    if (!veh?.handlingId) return null;
    return this.getHandling(veh.handlingId, packId);
  },

  // ── Popgroups ────────────────────────────────────────────────────

  /**
   * List all popgroup names of a given type.
   * @param {'ped'|'veh'} groupType
   */
  async listGroups(groupType = 'veh', packId = 'default') {
    return apiFetch(`/popgroups?type=${groupType}&pack=${encodeURIComponent(packId)}`);
  },

  /**
   * Get all members (model names) of a named popgroup.
   */
  async getGroup(groupName, groupType = 'veh', packId = 'default') {
    return apiFetch(
      `/popgroups/${encodeURIComponent(groupName)}?type=${groupType}&pack=${encodeURIComponent(packId)}`
    );
  },

  /**
   * Find all popgroups that contain a given model name (vehicle spawn name).
   */
  async getGroupsForModel(modelName, packId = 'default') {
    return apiFetch(
      `/popgroups/by-model/${encodeURIComponent(modelName)}?pack=${encodeURIComponent(packId)}`
    );
  },

  // ── Popcycle ─────────────────────────────────────────────────────

  /**
   * Get all time slots for a zone.
   * @param {string} zone - e.g. 'ALTA', 'ARMY'
   * @param {'weekday'|'weekend'|null} dayType - null = both
   */
  async getPopcycle(zone, dayType = null, packId = 'default') {
    const p = new URLSearchParams({ zone, pack: packId });
    if (dayType) p.set('day', dayType);
    return apiFetch(`/popcycle?${p}`);
  },

  /**
   * List all zone names stored in the DB.
   */
  async listZones(packId = 'default') {
    return apiFetch(`/popcycle/zones?pack=${encodeURIComponent(packId)}`);
  },

  // ── Cross-reference helpers ───────────────────────────────────────

  /**
   * Given a zone + hour slot, resolve: zone → vehGroups → modelNames → vehicle entries.
   * Returns: { zone, hourSlot, dayType, maxCars, groups: [{name, weight, vehicles: [...]}] }
   */
  async resolveZoneTraffic(zone, hourSlot = 6, dayType = 'weekday', packId = 'default') {
    const p = new URLSearchParams({ zone, hour: String(hourSlot), day: dayType, pack: packId });
    return apiFetch(`/popcycle/resolve?${p}`);
  },

  // ── Import helpers (used by upload tools) ────────────────────────

  /**
   * Import / re-import a vehicles.meta XML string.
   * @param {string} xmlText   - raw file content
   * @param {string} packId    - tag all entries with this pack id
   * @param {string} sourceFile - original filename for provenance
   * @returns {{ inserted, updated, skipped }}
   */
  async importVehiclesMeta(xmlText, packId = 'default', sourceFile = '') {
    const res = await fetch('/api/import/vehicles-meta', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml: xmlText, packId, sourceFile }),
    });
    if (!res.ok) throw new Error(`Import failed: HTTP ${res.status}`);
    return res.json();
  },

  /**
   * Import / re-import a handling.meta XML string.
   */
  async importHandlingMeta(xmlText, packId = 'default', sourceFile = '') {
    const res = await fetch('/api/import/handling-meta', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml: xmlText, packId, sourceFile }),
    });
    if (!res.ok) throw new Error(`Import failed: HTTP ${res.status}`);
    return res.json();
  },

  /**
   * Import / re-import a popgroups.ymt.xml string.
   * Replaces all existing members for this packId.
   */
  async importPopgroups(xmlText, packId = 'default', sourceFile = '') {
    const res = await fetch('/api/import/popgroups', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml: xmlText, packId, sourceFile }),
    });
    if (!res.ok) throw new Error(`Import failed: HTTP ${res.status}`);
    return res.json();
  },

  /**
   * Import / re-import a popcycle.dat text string.
   */
  async importPopcycle(text, packId = 'default', sourceFile = '') {
    const res = await fetch('/api/import/popcycle', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, packId, sourceFile }),
    });
    if (!res.ok) throw new Error(`Import failed: HTTP ${res.status}`);
    return res.json();
  },
};

export default VehicleDB;
