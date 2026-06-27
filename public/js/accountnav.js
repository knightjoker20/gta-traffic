function createAccountNavLink(href, label, className = "") {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;

  if (className) {
    link.className = className;
  }

  return link;
}

function createAccountNavButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

async function logoutFromAccountNav() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin"
  });

  window.location.href = "/login.html";
}

async function renderAccountNav() {
  if (document.querySelector(".gta-account-nav")) {
    return;
  }

  const nav = document.createElement("nav");
  nav.className = "gta-account-nav";
  nav.setAttribute("aria-label", "Account navigation");

  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin"
    });

    const payload = await response.json().catch(() => ({}));

    if (response.ok && payload.authenticated && payload.user) {
      const email = document.createElement("span");
      email.className = "account-email";
      email.textContent = payload.user.email || "Account";

      nav.append(
        email,
        createAccountNavLink("/dashboard.html", "Dashboard", "primary"),
        createAccountNavButton("Log Out", logoutFromAccountNav)
      );
    } else {
      nav.append(
        createAccountNavLink("/register.html", "Create Free Account", "primary"),
        createAccountNavLink("/login.html", "Log In")
      );
    }
  } catch {
    nav.append(
      createAccountNavLink("/register.html", "Create Free Account", "primary"),
      createAccountNavLink("/login.html", "Log In")
    );
  }

  document.body.appendChild(nav);
}

document.addEventListener("DOMContentLoaded", renderAccountNav);
