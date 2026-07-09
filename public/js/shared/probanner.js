// =====================================================
// Pro upsell banner — shown on pages with cloud-save features.
// Visible only to logged-in, non-premium accounts (FNL visitors get their
// own "log in" prompts already; Pro/admin accounts see nothing here).
// Drop <div id="proBannerSlot"></div> anywhere on a page and load this
// script (after shared/accountstate.js) to render it.
// =====================================================

(() => {
  "use strict";

  async function renderProBanner() {
    const slot = document.getElementById("proBannerSlot");
    if (!slot) return;

    let account = null;

    try {
      account = window.GTAAccountState
        ? await window.GTAAccountState.get()
        : null;
    } catch {
      account = null;
    }

    const loggedIn = Boolean(account?.loggedIn);
    const isPremium = Boolean(account?.isPremium);

    if (!loggedIn || isPremium) {
      slot.hidden = true;
      slot.innerHTML = "";
      return;
    }

    slot.hidden = false;
    slot.innerHTML = `
      <div class="pro-banner">
        <span class="pro-banner-badge">Free plan</span>
        <span class="pro-banner-copy">Pro adds the Pack Builder and more automation across your garage.</span>
        <a class="pro-banner-link" href="/pricing.html">See what's coming</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", renderProBanner);
})();
