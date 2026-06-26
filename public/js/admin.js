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

function renderAdminUsers(users = []) {
  if (!els.usersList) {
    return;
  }

  if (!users.length) {
    els.usersList.innerHTML =
      '<div class="empty-state">No users found.</div>';
    return;
  }

  els.usersList.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Name</th>
          <th>Role</th>
          <th>Plan</th>
          <th>Status</th>
          <th>Created</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td>${escapeHTML(user.email)}</td>
            <td>${escapeHTML(user.displayName || "�")}</td>
            <td><span class="pill">${escapeHTML(user.role)}</span></td>
            <td><span class="pill">${escapeHTML(user.plan)}</span></td>
            <td><span class="pill status-${escapeHTML(user.status)}">${escapeHTML(user.status)}</span></td>
            <td>${escapeHTML(user.createdAt || "�")}</td>
            <td>${escapeHTML(user.notes || "")}</td>
          </tr>
        `).join("")}
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
