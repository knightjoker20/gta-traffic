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

function renderDashboard(payload) {
  const user = payload.user || {};
  const workspaces = payload.workspaces || [];

  document.getElementById("welcomeTitle").textContent =
    "Welcome, " + (user.displayName || user.email || "User");

  document.getElementById("accountSummary").textContent =
    (user.email || "") + " • " + (user.role || "free_user");

  document.getElementById("planBadge").textContent =
    "Plan: " + (user.plan || "free");

  const workspaceList = document.getElementById("workspaceList");

  if (!workspaceList) {
    return;
  }

  if (!workspaces.length) {
    workspaceList.innerHTML =
      '<div class="workspace-item">No active workspaces found.</div>';
    return;
  }

  workspaceList.innerHTML = workspaces.map(workspace => {
    return `
      <div class="workspace-item">
        <strong>${escapeHTML(workspace.name)}</strong>
        <div class="muted">${escapeHTML(workspace.id)}</div>
        <div>Role: ${escapeHTML(workspace.role)} • Status: ${escapeHTML(workspace.status)}</div>
      </div>
    `;
  }).join("");
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
