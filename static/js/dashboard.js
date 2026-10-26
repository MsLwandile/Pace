/* ==========================================================================
   dashboard.js — Hydrates the dashboard from /api/dashboard
   ========================================================================== */
(() => {
  const { apiFetch, formatZAR, DEMO_FALLBACK, toast } = window.Pace;

  const state = {
    data: null,
    offline: false,
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    await loadData();
    renderHeader();
    renderSummary();
  }

  function renderHeader() {
    document.getElementById("user-name").textContent = "Pacey";
  }

  async function loadData() {
    const res = await apiFetch(document.body.dataset.apiDashboard);
    if (res.ok && res.data) {
      state.data = res.data;
    } else {
      state.data = DEMO_FALLBACK.dashboard;
      state.offline = true;
      toast("Showing offline demo data — API unavailable.", { type: "info" });
    }
  }

  function renderSummary() {
    const d = state.data;
    if (!d) return;

    document.getElementById("credit-limit").textContent = formatZAR(d.credit.limit);

    document.getElementById("tier-label").textContent = `Tier ${d.credit.tier}`;
  }
})();