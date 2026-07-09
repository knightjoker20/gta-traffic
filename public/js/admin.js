const ADMIN_TOKEN_KEY = "gtaTrafficAdminToken";

const els = {
  tokenInput: document.getElementById("adminTokenInput"),
  saveTokenBtn: document.getElementById("saveAdminTokenBtn"),
  clearTokenBtn: document.getElementById("clearAdminTokenBtn"),
  refreshSummaryBtn: document.getElementById("refreshSummaryBtn"),
  status: document.getElementById("adminStatus"),
  summaryGrid: document.getElementById("summaryGrid"),
  userSearchInput: document.getElementById("adminUserSearchInput"),
  refreshUsersBtn: document.getElementById("refreshUsersBtn"),
  createUserBtn: document.getElementById("createAdminUserBtn"),
  userEmailInput: document.getElementById("adminUserEmailInput"),
  userDisplayNameInput: document.getElementById("adminUserDisplayNameInput"),
  userRoleInput: document.getElementById("adminUserRoleInput"),
  userPlanInput: document.getElementById("adminUserPlanInput"),
  userStatusInput: document.getElementById("adminUserStatusInput"),
  userNotesInput: document.getElementById("adminUserNotesInput"),
  usersStatus: document.getElementById("adminUsersStatus"),
  usersList: document.getElementById("adminUsersList")
};

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(message, tone = "") {
  els.status.textContent = message;
  els.status.className = "admin-status" + (tone ? " " + tone : "");
}

function getAdminToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function saveAdminToken() {
  const token = els.tokenInput.value.trim();

  if (!token) {
    setStatus("Enter an admin token before saving.", "warning");
    return;
  }

  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  els.tokenInput.value = "";

  setStatus("Admin token saved in this browser.", "good");
}

function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  els.tokenInput.value = "";
  setStatus("Admin token cleared.", "warning");
}

function renderSummaryCard(label, value) {
  return `
    <div class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function getAdminHeaders(includeJson = false) {
  const token = getAdminToken();

  const headers = {
    "x-library-token": token
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function setUsersStatus(message, tone = "") {
  if (!els.usersStatus) {
    return;
  }

  els.usersStatus.textContent = message;
  els.usersStatus.className = "inline-status" + (tone ? " " + tone : "");
}

// ── User cache for drawer lookups ───────────────────────
let _adminUsersCache = {};

function formatTimeAgo(dateStr) {
  if (!dateStr) return "never";
  const date = new Date(dateStr);
  if (isNaN(date)) return String(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return diffMin + "m ago";
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + "h ago";
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return diffD + "d ago";
  return date.toLocaleDateString();
}

function isRecentlyOnline(dateStr) {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 15 * 60 * 1000;
}

function getAvatarInitial(user) {
  if (user.displayName && user.displayName.trim()) return user.displayName.trim()[0].toUpperCase();
  if (user.email) return user.email[0].toUpperCase();
  return "?";
}

function renderAdminUsers(users = []) {
  if (!els.usersList) return;

  _adminUsersCache = {};
  users.forEach(u => { _adminUsersCache[u.id] = u; });

  if (!users.length) {
    els.usersList.innerHTML = '<div class="empty-state">No users found.</div>';
    return;
  }

  els.usersList.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th></th>
          <th>Email</th>
          <th>Name</th>
          <th>Role</th>
          <th>Plan</th>
          <th>Status</th>
          <th>Last seen</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => {
          const online = isRecentlyOnline(user.lastLoginAt);
          const safeId = escapeHTML(user.id);
          return `
            <tr>
              <td style="width:28px">
                <span class="user-online-dot ${online ? "online" : "offline"}"
                  title="${online ? "Active in last 15 min" : "Offline"}"></span>
              </td>
              <td>${escapeHTML(user.email)}</td>
              <td>${escapeHTML(user.displayName || "\u2014")}</td>
              <td><span class="pill">${escapeHTML(user.role)}</span></td>
              <td><span class="pill">${escapeHTML(user.plan)}</span></td>
              <td><span class="pill status-${escapeHTML(user.status)}">${escapeHTML(user.status)}</span></td>
              <td>${escapeHTML(formatTimeAgo(user.lastLoginAt))}</td>
              <td>
                <div class="row-actions">
                  <button class="btn-row-action accent"
                    onclick="openDrawerById('${safeId}','edit')">Edit</button>
                  <button class="btn-row-action"
                    onclick="openDrawerById('${safeId}','activity')">Activity</button>
                </div>
              </td>
            </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

async function loadAdminUsers() {
  if (!getAdminToken()) {
    setUsersStatus("Admin token required before loading users.", "warning");
    return;
  }

  const query =
    els.userSearchInput?.value?.trim() || "";

  const url =
    "/api/admin/users" +
    (query ? "?query=" + encodeURIComponent(query) : "");

  setUsersStatus("Loading users...");

  try {
    const response = await fetch(url, {
      headers: getAdminHeaders()
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    renderAdminUsers(payload.users || []);
    setUsersStatus(
      "Loaded " + (payload.users || []).length + " user(s).",
      "good"
    );
  } catch (error) {
    console.warn("Admin users load failed.", error);
    setUsersStatus(
      "User load failed: " + (error.message || "Unknown error"),
      "danger"
    );
  }
}

function clearCreateUserForm() {
  if (els.userEmailInput) els.userEmailInput.value = "";
  if (els.userDisplayNameInput) els.userDisplayNameInput.value = "";
  if (els.userRoleInput) els.userRoleInput.value = "free_user";
  if (els.userPlanInput) els.userPlanInput.value = "free";
  if (els.userStatusInput) els.userStatusInput.value = "active";
  if (els.userNotesInput) els.userNotesInput.value = "";
}

async function createAdminUser() {
  if (!getAdminToken()) {
    setUsersStatus("Admin token required before creating users.", "warning");
    return;
  }

  const body = {
    email: els.userEmailInput?.value?.trim() || "",
    displayName: els.userDisplayNameInput?.value?.trim() || "",
    role: els.userRoleInput?.value || "free_user",
    plan: els.userPlanInput?.value || "free",
    status: els.userStatusInput?.value || "active",
    notes: els.userNotesInput?.value?.trim() || ""
  };

  if (!body.email) {
    setUsersStatus("Email is required.", "warning");
    return;
  }

  setUsersStatus("Creating user...");

  try {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: getAdminHeaders(true),
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    clearCreateUserForm();

    setUsersStatus(
      "Created user: " + payload.user.email,
      "good"
    );

    await loadAdminUsers();
    await loadAdminSummary();
  } catch (error) {
    console.warn("Admin user create failed.", error);
    setUsersStatus(
      "Create user failed: " + (error.message || "Unknown error"),
      "danger"
    );
  }
}

function renderSummary(summary = {}) {
  els.summaryGrid.innerHTML = [
    renderSummaryCard("Users", summary.users ?? "�"),
    renderSummaryCard("Workspaces", summary.workspaces ?? "�"),
    renderSummaryCard("Packs", summary.packs ?? "�"),
    renderSummaryCard("Vehicle Assignments", summary.vehicleAssignments ?? "�"),
    renderSummaryCard("Images", summary.images ?? "�"),
    renderSummaryCard("Import Jobs", summary.importJobs ?? "�")
  ].join("");
}

async function loadAdminSummary() {
  const token = getAdminToken();

  if (!token) {
    setStatus("Admin token required before checking summary.", "warning");
    return;
  }

  setStatus("Checking admin summary...");

  try {
    const response = await fetch("/api/admin/summary", {
      headers: {
        "x-library-token": token
      }
    });

    if (response.status === 404) {
      setStatus("Admin summary API is not built yet. Dashboard shell is ready.", "warning");
      return;
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    renderSummary(payload.summary || payload);
    setStatus("Admin summary loaded.", "good");
  } catch (error) {
    console.warn("Admin summary failed.", error);
    setStatus("Admin summary failed: " + (error.message || "Unknown error"), "danger");
  }
}

function initAdminDashboard() {
  renderSummary();

  els.saveTokenBtn.addEventListener("click", saveAdminToken);
  els.clearTokenBtn.addEventListener("click", clearAdminToken);
  els.refreshSummaryBtn.addEventListener("click", loadAdminSummary);

  els.refreshUsersBtn?.addEventListener("click", loadAdminUsers);
  els.createUserBtn?.addEventListener("click", createAdminUser);

  els.userSearchInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      loadAdminUsers();
    }
  });

  if (getAdminToken()) {
    setStatus("Admin token found. Click Refresh Summary to test access.", "good");
  }
}

initAdminDashboard();
document.addEventListener("DOMContentLoaded", initUserDrawer);



// ═══════════════════════════════════════════════════════
// User Edit / Activity Drawer
// ═══════════════════════════════════════════════════════

let _drawerUser = null;

function openDrawerById(userId, tab = "edit") {
  const user = _adminUsersCache[userId];
  if (!user) return;
  openDrawer(user, tab);
}

function openDrawer(user, tab = "edit") {
  _drawerUser = user;

  // Header
  document.getElementById("drawerAvatar").textContent = getAvatarInitial(user);
  document.getElementById("drawerUserName").textContent = user.displayName || user.email;
  document.getElementById("drawerUserEmail").textContent = user.email;

  // Edit form
  document.getElementById("drawerUserId").value      = user.id || "";
  document.getElementById("drawerDisplayName").value = user.displayName || "";
  document.getElementById("drawerRole").value         = user.role || "free_user";
  document.getElementById("drawerPlan").value         = user.plan || "free";
  document.getElementById("drawerStatus").value       = user.status || "active";
  document.getElementById("drawerNotes").value        = user.notes || "";
  setDrawerEditStatus("");

  // Show drawer
  document.getElementById("userDrawerOverlay").removeAttribute("hidden");
  document.body.style.overflow = "hidden";

  switchDrawerTab(tab);
}

function closeDrawer() {
  _drawerUser = null;
  document.getElementById("userDrawerOverlay").setAttribute("hidden", "");
  document.body.style.overflow = "";
}

function switchDrawerTab(tab) {
  document.querySelectorAll(".drawer-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.getElementById("drawerTabEdit").hidden     = (tab !== "edit");
  document.getElementById("drawerTabActivity").hidden = (tab !== "activity");

  if (tab === "activity" && _drawerUser) {
    loadUserActivity(_drawerUser.id);
  }
}

function setDrawerEditStatus(message, tone = "") {
  const el = document.getElementById("drawerEditStatus");
  if (!el) return;
  el.textContent = message;
  el.className = "drawer-edit-status" + (tone ? " " + tone : "");
}

async function saveDrawerEdit() {
  const userId = document.getElementById("drawerUserId")?.value;
  if (!userId) return;

  if (!getAdminToken()) {
    setDrawerEditStatus("Admin token required.", "warning");
    return;
  }

  const body = {
    displayName: document.getElementById("drawerDisplayName").value.trim(),
    role:        document.getElementById("drawerRole").value,
    plan:        document.getElementById("drawerPlan").value,
    status:      document.getElementById("drawerStatus").value,
    notes:       document.getElementById("drawerNotes").value.trim()
  };

  setDrawerEditStatus("Saving...");

  try {
    const response = await fetch(
      "/api/admin/users/" + encodeURIComponent(userId),
      { method: "PATCH", headers: getAdminHeaders(true), body: JSON.stringify(body) }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "HTTP " + response.status);

    _drawerUser = payload.user;
    _adminUsersCache[userId] = payload.user;
    document.getElementById("drawerUserName").textContent = payload.user.displayName || payload.user.email;
    setDrawerEditStatus("Saved.", "good");

    await loadAdminUsers();
    await loadAdminSummary();
  } catch (err) {
    setDrawerEditStatus("Save failed: " + (err.message || "Unknown error"), "danger");
  }
}

async function disableDrawerUser() {
  const userId = document.getElementById("drawerUserId")?.value;
  const email  = _drawerUser?.email || "this user";
  if (!userId) return;
  if (!confirm("Disable " + email + "?")) return;
  document.getElementById("drawerStatus").value = "disabled";
  await saveDrawerEdit();
}

async function deleteDrawerUser() {
  const userId = document.getElementById("drawerUserId")?.value;
  const email  = _drawerUser?.email || "this user";
  if (!userId) return;

  if (!getAdminToken()) {
    setDrawerEditStatus("Admin token required.", "warning");
    return;
  }

  if (!confirm(
    "Permanently delete " + email + "?\n\n" +
    "This cannot be undone. Their sessions will also be removed."
  )) return;

  if (!confirm("Second confirmation: delete " + email + " forever?")) return;

  setDrawerEditStatus("Deleting...", "warning");

  try {
    const response = await fetch(
      "/api/admin/users/" + encodeURIComponent(userId),
      { method: "DELETE", headers: getAdminHeaders() }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "HTTP " + response.status);

    closeDrawer();
    await loadAdminUsers();
    await loadAdminSummary();
    setUsersStatus("Deleted user: " + email, "good");
  } catch (err) {
    setDrawerEditStatus("Delete failed: " + (err.message || "Unknown error"), "danger");
  }
}

async function loadUserActivity(userId) {
  const statsEl = document.getElementById("drawerActivityStats");
  const feedEl  = document.getElementById("drawerActivityFeed");
  if (!statsEl || !feedEl) return;

  statsEl.innerHTML = '<div class="drawer-stat-card" style="grid-column:1/-1"><div class="lbl">Loading…</div></div>';
  feedEl.innerHTML  = "";

  if (!getAdminToken()) {
    feedEl.innerHTML = '<div class="empty-state">Admin token required.</div>';
    return;
  }

  try {
    const response = await fetch(
      "/api/admin/users/" + encodeURIComponent(userId) + "/sessions",
      { headers: getAdminHeaders() }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || "HTTP " + response.status);

    const sessions       = payload.sessions || [];
    const savedProjects  = payload.savedProjects;

    statsEl.innerHTML = `
      <div class="drawer-stat-card">
        <div class="val">${sessions.length}</div>
        <div class="lbl">Sessions</div>
      </div>
      <div class="drawer-stat-card">
        <div class="val">${savedProjects != null ? savedProjects : "\u2014"}</div>
        <div class="lbl">Saved projects</div>
      </div>`;

    if (!sessions.length) {
      feedEl.innerHTML = '<div class="empty-state">No sessions recorded yet.</div>';
      return;
    }

    feedEl.innerHTML = sessions.map(s => {
      const active = s.expiresAt && new Date(s.expiresAt) > new Date();
      return `
        <div class="drawer-activity-item">
          <div class="drawer-activity-icon${active ? " active" : ""}">${active ? "\u25cf" : "\u25cb"}</div>
          <div class="drawer-activity-text">
            <strong>${active ? "Active session" : "Session"}</strong>
            <span>Started ${escapeHTML(formatTimeAgo(s.createdAt))} &middot; last seen ${escapeHTML(formatTimeAgo(s.lastSeenAt))}</span>
          </div>
        </div>`;
    }).join("");

  } catch (err) {
    statsEl.innerHTML = "";
    feedEl.innerHTML  = `<div class="empty-state" style="color:var(--danger)">Failed to load: ${escapeHTML(err.message || "Unknown error")}</div>`;
  }
}

function initUserDrawer() {
  document.getElementById("drawerCloseBtn")?.addEventListener("click", closeDrawer);

  // Close on overlay backdrop click
  document.getElementById("userDrawerOverlay")?.addEventListener("click", e => {
    if (e.target.id === "userDrawerOverlay") closeDrawer();
  });

  document.getElementById("drawerSaveBtn")?.addEventListener("click", saveDrawerEdit);
  document.getElementById("drawerDisableBtn")?.addEventListener("click", disableDrawerUser);
  document.getElementById("drawerDeleteBtn")?.addEventListener("click", deleteDrawerUser);

  document.querySelectorAll(".drawer-tab").forEach(btn => {
    btn.addEventListener("click", () => switchDrawerTab(btn.dataset.tab));
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !document.getElementById("userDrawerOverlay")?.hidden) {
      closeDrawer();
    }
  });
}


/* Workspace membership admin panel */
function getWorkspaceMembershipFields() {
  return {
    workspaceSelect: document.getElementById("workspaceMembershipWorkspaceInput"),
    userIdInput: document.getElementById("workspaceMembershipUserIdInput"),
    roleInput: document.getElementById("workspaceMembershipRoleInput"),
    statusInput: document.getElementById("workspaceMembershipStatusInput"),
    saveBtn: document.getElementById("saveWorkspaceMembershipBtn"),
    loadWorkspacesBtn: document.getElementById("loadAdminWorkspacesBtn"),
    loadMembershipsBtn: document.getElementById("loadAdminMembershipsBtn"),
    searchInput: document.getElementById("workspaceMembershipSearchInput"),
    searchBtn: document.getElementById("searchWorkspaceMembershipsBtn"),
    statusText: document.getElementById("workspaceMembershipStatus"),
    list: document.getElementById("workspaceMembershipList")
  };
}

function escapeWorkspaceMembershipHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setWorkspaceMembershipStatus(message, tone = "") {
  const fields = getWorkspaceMembershipFields();

  if (!fields.statusText) {
    return;
  }

  fields.statusText.textContent = message;
  fields.statusText.className = "inline-status" + (tone ? " " + tone : "");
}

function renderWorkspaceOptions(workspaces = []) {
  const fields = getWorkspaceMembershipFields();

  if (!fields.workspaceSelect) {
    return;
  }

  if (!workspaces.length) {
    fields.workspaceSelect.innerHTML =
      '<option value="">No workspaces found</option>';
    return;
  }

  fields.workspaceSelect.innerHTML =
    workspaces.map(workspace => {
      const label =
        escapeWorkspaceMembershipHTML(workspace.name || workspace.id) +
        " (" +
        escapeWorkspaceMembershipHTML(workspace.id) +
        ")";

      return (
        '<option value="' +
        escapeWorkspaceMembershipHTML(workspace.id) +
        '">' +
        label +
        '</option>'
      );
    }).join("");
}

function renderWorkspaceMemberships(memberships = []) {
  const fields = getWorkspaceMembershipFields();

  if (!fields.list) {
    return;
  }

  if (!memberships.length) {
    fields.list.innerHTML =
      '<div class="empty-state">No workspace memberships found.</div>';
    return;
  }

  const rows = memberships.map(member => {
    return [
      "<tr>",
      "<td>" + escapeWorkspaceMembershipHTML(member.workspaceName || "�") + "</td>",
      "<td>" + escapeWorkspaceMembershipHTML(member.workspaceId || "�") + "</td>",
      "<td>" + escapeWorkspaceMembershipHTML(member.email || "�") + "</td>",
      "<td>" + escapeWorkspaceMembershipHTML(member.displayName || "�") + "</td>",
      "<td>" + escapeWorkspaceMembershipHTML(member.userId || "�") + "</td>",
      '<td><span class="pill">' + escapeWorkspaceMembershipHTML(member.role || "viewer") + "</span></td>",
      '<td><span class="pill status-' + escapeWorkspaceMembershipHTML(member.status || "active") + '">' + escapeWorkspaceMembershipHTML(member.status || "active") + "</span></td>",
      "<td>" + escapeWorkspaceMembershipHTML(member.updatedAt || "�") + "</td>",
      "</tr>"
    ].join("");
  }).join("");

  fields.list.innerHTML =
    '<table class="admin-table workspace-membership-table">' +
      "<thead>" +
        "<tr>" +
          "<th>Workspace</th>" +
          "<th>Workspace ID</th>" +
          "<th>User Email</th>" +
          "<th>Name</th>" +
          "<th>User ID</th>" +
          "<th>Role</th>" +
          "<th>Status</th>" +
          "<th>Updated</th>" +
        "</tr>" +
      "</thead>" +
      "<tbody>" + rows + "</tbody>" +
    "</table>";
}

async function loadAdminWorkspacesForMemberships() {
  if (!getAdminToken()) {
    setWorkspaceMembershipStatus("Admin token required before loading workspaces.", "warning");
    return;
  }

  setWorkspaceMembershipStatus("Loading workspaces...");

  try {
    const response = await fetch("/api/admin/workspaces", {
      headers: getAdminHeaders()
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "HTTP " + response.status);
    }

    renderWorkspaceOptions(payload.workspaces || []);

    setWorkspaceMembershipStatus(
      "Loaded " + (payload.workspaces || []).length + " workspace(s).",
      "good"
    );
  } catch (error) {
    console.warn("Workspace load failed.", error);
    setWorkspaceMembershipStatus(
      "Workspace load failed: " + (error.message || "Unknown error"),
      "danger"
    );
  }
}

async function loadAdminWorkspaceMemberships() {
  if (!getAdminToken()) {
    setWorkspaceMembershipStatus("Admin token required before loading memberships.", "warning");
    return;
  }

  const fields = getWorkspaceMembershipFields();
  const query = fields.searchInput?.value?.trim() || "";

  const url =
    "/api/admin/workspace-members" +
    (query ? "?query=" + encodeURIComponent(query) : "");

  setWorkspaceMembershipStatus("Loading memberships...");

  try {
    const response = await fetch(url, {
      headers: getAdminHeaders()
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "HTTP " + response.status);
    }

    renderWorkspaceMemberships(payload.memberships || []);

    setWorkspaceMembershipStatus(
      "Loaded " + (payload.memberships || []).length + " membership(s).",
      "good"
    );
  } catch (error) {
    console.warn("Workspace memberships load failed.", error);
    setWorkspaceMembershipStatus(
      "Membership load failed: " + (error.message || "Unknown error"),
      "danger"
    );
  }
}

async function saveAdminWorkspaceMembership() {
  if (!getAdminToken()) {
    setWorkspaceMembershipStatus("Admin token required before saving memberships.", "warning");
    return;
  }

  const fields = getWorkspaceMembershipFields();

  const body = {
    workspaceId: fields.workspaceSelect?.value?.trim() || "",
    userId: fields.userIdInput?.value?.trim() || "",
    role: fields.roleInput?.value || "viewer",
    status: fields.statusInput?.value || "active"
  };

  if (!body.workspaceId) {
    setWorkspaceMembershipStatus("Workspace is required.", "warning");
    return;
  }

  if (!body.userId) {
    setWorkspaceMembershipStatus("User ID is required.", "warning");
    return;
  }

  setWorkspaceMembershipStatus("Saving membership...");

  try {
    const response = await fetch("/api/admin/workspace-members", {
      method: "POST",
      headers: getAdminHeaders(true),
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "HTTP " + response.status);
    }

    setWorkspaceMembershipStatus(
      "Saved membership for " + (payload.membership.email || payload.membership.userId),
      "good"
    );

    await loadAdminWorkspaceMemberships();

    if (typeof loadAdminSummary === "function") {
      await loadAdminSummary();
    }
  } catch (error) {
    console.warn("Workspace membership save failed.", error);
    setWorkspaceMembershipStatus(
      "Save membership failed: " + (error.message || "Unknown error"),
      "danger"
    );
  }
}

function initWorkspaceMembershipPanel() {
  const fields = getWorkspaceMembershipFields();

  if (!fields.saveBtn) {
    return;
  }

  fields.loadWorkspacesBtn?.addEventListener("click", loadAdminWorkspacesForMemberships);
  fields.loadMembershipsBtn?.addEventListener("click", loadAdminWorkspaceMemberships);
  fields.searchBtn?.addEventListener("click", loadAdminWorkspaceMemberships);
  fields.saveBtn?.addEventListener("click", saveAdminWorkspaceMembership);

  fields.searchInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      loadAdminWorkspaceMemberships();
    }
  });
}

document.addEventListener("DOMContentLoaded", initWorkspaceMembershipPanel);
