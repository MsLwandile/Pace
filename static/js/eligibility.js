(() => {
  const form = document.getElementById("eligibility-form");
  if (!form) return;

  const incomeInput = document.getElementById("monthly-income");
  const errorMessage = document.getElementById("eligibility-error");
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";

    const monthlyIncome = Number(incomeInput.value);
    if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
      errorMessage.textContent = "Enter a valid non-negative monthly income.";
      return;
    }

    submitButton.disabled = true;
    const response = await window.Pace.apiFetch(
      document.body.dataset.apiEligibilityRecompute,
      { method: "POST", body: { monthly_income: monthlyIncome } }
    );
    submitButton.disabled = false;

    if (!response.ok || !response.data) {
      errorMessage.textContent = response.error || "Unable to recalculate your estimate.";
      return;
    }

    const result = response.data;
    document.getElementById("eligibility-reason").textContent = result.reason;
    document.getElementById("eligibility-limit").textContent =
      window.Pace.formatZAR(result.limit, { decimals: 0 });
    document.getElementById("eligibility-tier").textContent = result.tier_label;
    document.querySelector(".tier-icon").textContent = result.tier;
    document.getElementById("eligibility-calculation").replaceChildren(
      ...result.how_calculated.map((item) => {
        const listItem = document.createElement("li");
        listItem.textContent = item;
        return listItem;
      })
    );
  });
})();
