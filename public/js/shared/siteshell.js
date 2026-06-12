// =====================================================
// [MODULE: SITE_TOOL_MENU]
// Shared GTA-Traffic.com tool navigation.
// Edit SITE_TOOL_NAV_ITEMS once to update every page using it.
// =====================================================

const SITE_TOOL_NAV_ITEMS = [
  {
    label: "Popgroups",
    href: "index.html",
    page: "popgroups"
  },
  {
    label: "Popcycle",
    href: "popcycle.html",
    page: "popcycle"
  },
  {
    label: "Vehicle.meta",
    href: "vehicle-meta.html",
    page: "vehicle-meta"
  },
  {
    label: "Handling.meta",
    href: "handling-meta.html",
    page: "handling-meta"
  },
  {
    label: "Vehicle Library",
    href: "vehicle-library.html",
    page: "library"
  },
  {
    label: "Pack Builder",
    href: "index.html#packBuilderPanel",
    page: "pack-builder"
  },
  {
    label: "LOD Scanner",
    href: "index.html#lodScannerPanel",
    page: "lod-scanner"
  }
];

function renderSiteToolMenu() {
  const host = document.getElementById("siteToolMenu");

  if (!host) return;

  const activePage =
    document.body.dataset.page || "";

  host.innerHTML = `
    <nav class="site-tool-menu" aria-label="GTA Traffic tools">
      <button
        class="site-tool-menu-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="siteToolMenuLinks"
      >
        Tools Menu
      </button>

      <div
        id="siteToolMenuLinks"
        class="site-tool-menu-links"
      >
        ${SITE_TOOL_NAV_ITEMS.map(item => `
          <a
            class="site-tool-menu-link ${
              item.page === activePage ? "active" : ""
            }"
            href="${item.href}"
          >
            ${item.label}
          </a>
        `).join("")}
      </div>
    </nav>
  `;

  const toggle =
    host.querySelector(".site-tool-menu-toggle");

  const links =
    host.querySelector(".site-tool-menu-links");

  toggle?.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

document.addEventListener(
  "DOMContentLoaded",
  renderSiteToolMenu
);

// [END MODULE: SITE_TOOL_MENU]
