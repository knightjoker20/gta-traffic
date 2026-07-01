function setDashboardStatus(message) {
  const status = document.getElementById("dashboardStatus");

  if (status) {
    status.textContent = message;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function renderWorkspaces(workspaces = []) {
  const workspaceList = document.getElementById("workspaceList");

  if (!workspaceList) {
    return;
  }

  if (!workspaces.length) {
    workspaceList.innerHTML =
      '<div class="workspace-item">No active workspaces found.</div>';
    setText("workspaceBadge", "Workspace: None");
    return;
  }

  setText("workspaceBadge", "Workspace: " + workspaces.length);

  workspaceList.innerHTML = workspaces.map(workspace => {
    return `
      <div class="workspace-item">
        <strong>${escapeHTML(workspace.name)}</strong>
        <div class="muted">${escapeHTML(workspace.id)}</div>
        <div>Role: ${escapeHTML(workspace.role)} � Status: ${escapeHTML(workspace.status)}</div>
      </div>
    `;
  }).join("");
}

function renderActivity(user, workspaces = []) {
  const activityList = document.getElementById("activityList");

  if (!activityList) {
    return;
  }

  const items = [
    "Signed in as " + (user.email || "account user") + ".",
    "Loaded " + workspaces.length + " active workspace(s).",
    "Project saving foundation is next on the roadmap."
  ];

  activityList.innerHTML = items.map(item => {
    return `<div class="activity-item">${escapeHTML(item)}</div>`;
  }).join("");
}

function renderDashboard(payload) {
  const user = payload.user || {};
  const workspaces = payload.workspaces || [];
  const displayName = user.displayName || user.email || "User";

  setText("welcomeTitle", "Welcome, " + displayName);
  setText("accountSummary", "Your GTA Traffic account is ready for saved workspaces and project tools.");
  setText("planBadge", "Plan: " + (user.plan || "free"));
  setText("sessionBadge", "Session: Active");

  setText("accountEmail", user.email || "�");
  setText("accountRole", user.role || "free_user");
  setText("accountPlan", user.plan || "free");

  const accountStatusBadge = document.getElementById("accountStatusBadge");

  if (accountStatusBadge) {
    accountStatusBadge.textContent = user.status || "active";
  }

  // Admin link is always visible — admin.html itself still requires the
  // library/admin token for any real reads or writes, so showing the nav
  // link to every signed-in account is not a privilege escalation. This
  // also avoids a catch-22 where the link to grant yourself admin was
  // hidden until you already had an admin role.
  document.getElementById("adminLink")?.classList.remove("hidden");

  renderWorkspaces(workspaces);
  renderActivity(user, workspaces);
}

async function loadDashboard() {
  setDashboardStatus("Loading account...");

  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin"
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "Could not load dashboard.");
    }

    renderDashboard(payload);
    setDashboardStatus("Dashboard loaded.");
  } catch (error) {
    setDashboardStatus(error.message || "Dashboard failed to load.");
  }
}

async function logout() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin"
  });

  window.location.href = "/login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  loadDashboard();
});
