(() => {
  document.addEventListener("DOMContentLoaded", loadInsights);

  async function loadInsights() {
    const response = await window.Pace.apiFetch(document.body.dataset.apiInsights);
    if (!response.ok || !response.data) {
      window.Pace.toast(response.error || "Unable to refresh your monthly insights.", { type: "error" });
      return;
    }

    const { insights, report } = response.data;
    document.getElementById("report-period").textContent = report.period;
    document.getElementById("report-summary").textContent = report.summary;
    document.getElementById("report-disclaimer").textContent = report.disclaimer;
    replaceList("report-metrics", report.metrics, (metric, item) => {
      item.textContent = `${metric.label}: ${metric.value}`;
    });
    replaceList("insights-list", insights, (insight, item) => {
      const month = document.createElement("span");
      month.className = "badge badge-neutral";
      month.textContent = insight.month;

      const title = document.createElement("h3");
      title.textContent = insight.title;

      const body = document.createElement("p");
      body.textContent = insight.body;
      item.append(month, title, body);
    });
    replaceList("report-next-steps", report.next_steps, (step, item) => {
      const title = document.createElement("strong");
      title.textContent = step.title;
      const body = document.createElement("p");
      body.textContent = step.body;
      item.append(title, body);
    });
  }

  function replaceList(id, values, renderItem) {
    const list = document.getElementById(id);
    list.replaceChildren(
      ...values.map((value) => {
        const item = document.createElement("li");
        renderItem(value, item);
        return item;
      })
    );
  }
})();
