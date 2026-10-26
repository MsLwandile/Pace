(() => {
  const sliders = Array.from(document.querySelectorAll(".simulator-control input[type='range']"));
  const needle = document.getElementById("impact-meter-needle");
  const result = document.getElementById("impact-meter-result");
  if (!sliders.length || !needle || !result) return;

  function updateMeter() {
    let positive = 0;
    let negative = 0;

    sliders.forEach((slider) => {
      const value = Number(slider.value);
      if (slider.dataset.impact === "positive") {
        positive += (value - 50) * 0.8;
      } else {
        negative += value * Number(slider.dataset.weight || 0.2);
      }
    });

    const difference = positive - negative;
    const maximum = difference >= 0 ? 40 : 120;
    const angle = Math.max(-90, Math.min(90, (difference / maximum) * 90));
    needle.style.transform = `rotate(${angle}deg)`;

    if (angle < -12) {
      result.textContent = "Leaning toward negative impact";
      result.dataset.impact = "negative";
    } else if (angle > 12) {
      result.textContent = "Leaning toward positive impact";
      result.dataset.impact = "positive";
    } else {
      result.textContent = "Balanced impact";
      result.dataset.impact = "balanced";
    }
  }

  sliders.forEach((slider) => slider.addEventListener("input", updateMeter));
  updateMeter();
})();
