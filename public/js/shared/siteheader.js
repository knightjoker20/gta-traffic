(function () {
  const PAGE_TAGLINES = {
    "popgroups": "Traffic tools built for modders",
    "popcycle": "PopCycle Editor",
    "vehicle-meta": "Vehicles.meta Editor",
    "handling-meta": "Handling.meta Editor",
    "vehicle-library": "Vehicle Library",
    "vehicle-details": "Vehicle Details",
    "dashboard": "Account Dashboard",
    "login": "Account Access",
    "register": "Create Account",
    "admin": "Admin Console",
    "pricing": "Pricing",
    "relationships": "Relationships Editor",
    "dispatch": "Dispatch Editor",
    "events": "Events Editor",
    "resources": "Modding Resources",
    "community": "Community"
  };

  function getPageTagline() {
    const page = document.body?.dataset?.page || "";
    return PAGE_TAGLINES[page] || "Traffic tools built for modders";
  }

  function renderSiteHeader() {
    if (!document.body) {
      return;
    }

    const existingHeader = document.querySelector(".app-header");
    const header = existingHeader || document.createElement("header");

    header.className = "app-header";
    header.innerHTML = `
      <a class="brand-left" href="/" aria-label="Return to GTA Traffic Studio">
        <img class="site-logo" src="/assets/gta-traffic-logo.png" alt="GTA Traffic Studio Logo">
        <div class="brand-copy">
          <div class="brand-title">GTA Traffic Studio</div>
          <div class="tagline">${getPageTagline()}</div>
        </div>
      </a>
    `;

    if (!existingHeader) {
      document.body.insertBefore(header, document.body.firstChild);
    }
  }

  renderSiteHeader();
})();


