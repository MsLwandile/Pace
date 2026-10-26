"use strict";

const jaguarSlider = document.querySelector("#jaguar-slider");
const jaguarPosition = document.querySelector("#jaguar-poll-position");

if (jaguarSlider && jaguarPosition) {
  const describePosition = (value) => {
    if (value <= 35) {
      return `Your position: ${value}/100 — leaning toward Jaguar?`;
    }
    if (value >= 65) {
      return `Your position: ${value}/100 — leaning toward No Jaguar?`;
    }
    return `Your position: ${value}/100 — somewhere in the middle.`;
  };

  const updatePosition = () => {
    const description = describePosition(Number(jaguarSlider.value));
    jaguarPosition.textContent = description;
    jaguarSlider.setAttribute("aria-valuetext", description);
  };

  jaguarSlider.addEventListener("input", updatePosition);
  updatePosition();
}
