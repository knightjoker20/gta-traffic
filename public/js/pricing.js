(() => {
  "use strict";

  function el(id) {
    return document.getElementById(id);
  }

  function setStatus(message, type) {
    const host = el("pricingFormStatus");
    if (!host) return;
    host.textContent = message;
    host.className = `pr-form-status ${type || ""}`.trim();
  }

  async function onSubmit(event) {
    event.preventDefault();

    const emailInput = el("pricingEmailInput");
    const noteInput = el("pricingNoteInput");
    const submitButton = el("pricingSubmitButton");

    const email = emailInput.value.trim();
    const note = noteInput.value.trim();

    if (!email) {
      setStatus("Enter an email address.", "bad");
      return;
    }

    submitButton.disabled = true;
    setStatus("Submitting...", "");

    try {
      const response = await fetch("/api/premium-interest", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, note })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "That didn't go through — try again in a moment.");
      }

      setStatus("Thanks — you're on the list. We'll email you when Pro is ready.", "good");
      emailInput.value = "";
      noteInput.value = "";
    } catch (error) {
      setStatus(error.message || "That didn't go through — try again in a moment.", "bad");
    } finally {
      submitButton.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = el("pricingInterestFormEl");
    if (form) form.addEventListener("submit", onSubmit);
  });
})();
