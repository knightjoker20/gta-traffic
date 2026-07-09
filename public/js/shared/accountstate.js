// =====================================================
// GTA Traffic Account State V1.0
// Single shared source of truth for "what tier is this
// user" on the client. Fetches /api/auth/me exactly once
// per page load and caches the result. Every page that
// needs to know loggedIn/plan/role should read from here
// instead of calling /api/auth/me itself.
// =====================================================

window.GTAAccountState = (() => {
  "use strict";

  const DEFAULT_STATE = Object.freeze({
    loggedIn: false,
    userId: null,
    email: "",
    displayName: "",
    role: "",
    plan: "",
    isPremium: false,
    isAdmin: false,
    workspaces: []
  });

  // Keep this whitelist in sync with requirePremium()/requireAdminSession()
  // in src/index.js — these are the client-side mirror of those checks.
  function deriveFlags(user) {
    const role = String(user?.role || "").toLowerCase();
    const plan = String(user?.plan || "").toLowerCase();

    const isAdmin = ["admin", "owner"].includes(role);
    const isPremium =
      ["premium", "admin"].includes(plan) ||
      ["admin", "owner", "moderator"].includes(role);

    return { isAdmin, isPremium };
  }

  async function fetchAccountState() {
    try {
      const response = await fetch("/api/auth/me", { credentials: "same-origin" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.authenticated || !payload.user) {
        return { ...DEFAULT_STATE };
      }

      const { isAdmin, isPremium } = deriveFlags(payload.user);

      return {
        loggedIn: true,
        userId: payload.user.id || null,
        email: payload.user.email || "",
        displayName: payload.user.displayName || payload.user.email || "",
        role: payload.user.role || "",
        plan: payload.user.plan || "",
        isPremium,
        isAdmin,
        workspaces: payload.workspaces || []
      };
    } catch (error) {
      console.warn("Account state could not be loaded.", error);
      return { ...DEFAULT_STATE };
    }
  }

  let statePromise = null;

  // Returns a Promise<state>. Safe to call from multiple scripts on the
  // same page — only fetches once, every caller shares the same promise.
  function get() {
    if (!statePromise) {
      statePromise = fetchAccountState().then(state => {
        document.dispatchEvent(new CustomEvent("gta-account-state-ready", { detail: state }));
        return state;
      });
    }
    return statePromise;
  }

  // Forces a fresh fetch — call after login/logout/plan changes so a
  // page that's still open picks up the new state without a full reload.
  function refresh() {
    statePromise = null;
    return get();
  }

  return { get, refresh };
})();
