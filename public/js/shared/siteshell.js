// =====================================================
// [MODULE: SITE_TOOL_MENU]
// Shared GTA-Traffic.com tool navigation.
// Edit SITE_TOOL_NAV_ITEMS once to update every page using it.
// =====================================================

const SITE_TOOL_NAV_ITEMS = [
  {
    label: "Home",
    href: "/",
    page: "home"
  },
  {
    label: "Popgroups",
    href: "popgroups.html",
    page: "popgroups"
  },
  {
    label: "Popcycle",
    href: "popcycle.html",
    page: "popcycle"
  },
  {
    label: "Vehicles.meta",
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
    label: "Pack Builder ✦",
    href: "pack-builder.html",
    page: "pack-builder"
  },
  {
    label: "Car Download DB",
    href: "mod-catalog.html",
    page: "mod-catalog"
  },
  {
    label: "Flags Reference",
    href: "handling-flags.html",
    page: "flags-reference"
  },
  {
    label: "Pricing",
    href: "pricing.html",
    page: "pricing"
  },
  {
    label: "Relationships",
    href: "relationships.html",
    page: "relationships"
  },
  {
    label: "Dispatch",
    href: "dispatch.html",
    page: "dispatch"
  },
  {
    label: "Trains",
    href: "trains.html",
    page: "trains"
  },
  {
    label: "Events",
    href: "events.html",
    page: "events"
  },
  {
    label: "NPC Combat",
    href: "combat.html",
    page: "combat"
  },
  {
    label: "Combat Tasks",
    href: "combattasks.html",
    page: "combattasks"
  },
  {
    label: "Random Events",
    href: "randomevents.html",
    page: "randomevents"
  },
  {
    label: "Resources",
    href: "resources.html",
    page: "resources"
  },
  {
    label: "Community",
    href: "community.html",
    page: "community"
  },
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


// =====================================================
// [MODULE: BACK TO TOP]
// Shared scroll-to-top button. Appears on any page
// once the user scrolls past 400px.
// =====================================================

(function () {
  const SCROLL_THRESHOLD = 400;
  const BTN_ID = "siteBackToTop";

  function injectStyles() {
    if (document.getElementById("siteBackToTopStyle")) return;
    const style = document.createElement("style");
    style.id = "siteBackToTopStyle";
    style.textContent = `
      #siteBackToTop {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 9999;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 1px solid rgba(148, 163, 184, 0.3);
        background: rgba(15, 23, 42, 0.85);
        color: #94a3b8;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 0.25s ease, transform 0.25s ease, background 0.15s, border-color 0.15s, color 0.15s;
        pointer-events: none;
      }
      #siteBackToTop.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      #siteBackToTop:hover {
        background: rgba(30, 41, 59, 0.95);
        border-color: rgba(148, 163, 184, 0.6);
        color: #e2e8f0;
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();

    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = "&#8679;"; // ⇧ upward arrow
    document.body.appendChild(btn);

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", () => {
      if (window.scrollY > SCROLL_THRESHOLD) {
        btn.classList.add("visible");
      } else {
        btn.classList.remove("visible");
      }
    }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// [END MODULE: BACK TO TOP]



