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
      const emailText = payload.user.email || "Account";
      // Build two-letter initials from the email address
      const initials = emailText.split("@")[0].replace(/[^a-z0-9]/gi, " ").trim().split(/\s+/)
        .map(w => w[0]).slice(0, 2).join("").toUpperCase() || "ME";

      // Compact avatar trigger
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "gta-account-nav-trigger";
      trigger.textContent = initials;
      trigger.setAttribute("aria-label", "Account menu");
      trigger.setAttribute("aria-expanded", "false");

      // Flyout panel
      const flyout = document.createElement("div");
      flyout.className = "gta-account-nav-flyout";
      flyout.setAttribute("role", "menu");

      const emailEl = document.createElement("span");
      emailEl.className = "account-email";
      emailEl.textContent = emailText;

      flyout.append(
        emailEl,
        createAccountNavLink("/dashboard.html", "Dashboard", "primary"),
        createAccountNavButton("Log Out", logoutFromAccountNav)
      );

      // Toggle open/close
      trigger.addEventListener("click", event => {
        event.stopPropagation();
        const isOpen = flyout.classList.toggle("open");
        trigger.setAttribute("aria-expanded", String(isOpen));
      });

      // Close when clicking anywhere outside
      document.addEventListener("click", () => {
        if (flyout.classList.contains("open")) {
          flyout.classList.remove("open");
          trigger.setAttribute("aria-expanded", "false");
        }
      });

      // Prevent flyout clicks from bubbling up and immediately closing
      flyout.addEventListener("click", event => event.stopPropagation());

      nav.classList.add("is-logged-in");
      nav.append(trigger, flyout);
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
