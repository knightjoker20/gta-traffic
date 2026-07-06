function setAuthStatus(message, tone = "") {
  const status = document.getElementById("authStatus");

  if (!status) {
    return;
  }

  status.textContent = message;
  status.className = "status" + (tone ? " " + tone : "");
}

async function submitAuthForm(event) {
  event.preventDefault();

  const mode = document.body.dataset.authMode;
  const email = document.getElementById("emailInput")?.value?.trim() || "";
  const password = document.getElementById("passwordInput")?.value || "";
  const displayName = document.getElementById("displayNameInput")?.value?.trim() || "";
  const confirmPassword = document.getElementById("confirmPasswordInput")?.value || "";

  if (mode === "register" && password !== confirmPassword) {
    setAuthStatus("Passwords do not match.", "danger");
    return;
  }

  if (password.length < 8) {
    setAuthStatus("Password must be at least 8 characters.", "danger");
    return;
  }

  const endpoint =
    mode === "register"
      ? "/api/auth/register"
      : "/api/auth/login";

  const body =
    mode === "register"
      ? { email, displayName, password }
      : { email, password };

  setAuthStatus(mode === "register" ? "Creating account..." : "Logging in...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "Authentication failed.");
    }

    setAuthStatus("Success. Opening dashboard...", "good");
    window.location.href = "/dashboard.html";
  } catch (error) {
    setAuthStatus(error.message || "Authentication failed.", "danger");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("authForm")?.addEventListener("submit", submitAuthForm);
});
