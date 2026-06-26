const ADMIN_TOKEN_KEY = "gtaTrafficAdminToken";

const els = {
  tokenInput: document.getElementById("adminTokenInput"),
  saveTokenBtn: document.getElementById("saveAdminTokenBtn"),
  clearTokenBtn: document.getElementById("clearAdminTokenBtn"),
  refreshSummaryBtn: document.getElementById("refreshSummaryBtn"),
  status: document.getElementById("adminStatus"),
  summaryGrid: document.getElementById("summaryGrid")
};

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

function renderSummary(summary = {}) {
  els.summaryGrid.innerHTML = [
    renderSummaryCard("Users", summary.users ?? "—"),
    renderSummaryCard("Workspaces", summary.workspaces ?? "—"),
    renderSummaryCard("Packs", summary.packs ?? "—"),
    renderSummaryCard("Vehicle Assignments", summary.vehicleAssignments ?? "—"),
    renderSummaryCard("Images", summary.images ?? "—"),
    renderSummaryCard("Import Jobs", summary.importJobs ?? "—")
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

  if (getAdminToken()) {
    setStatus("Admin token found. Click Refresh Summary to test access.", "good");
  }
}

initAdminDashboard();
