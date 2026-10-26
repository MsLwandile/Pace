(() => {
  const bubbleHost = document.getElementById("factor-bubbles");
  const score = document.getElementById("factor-game-score");
  const result = document.getElementById("factor-game-result");
  const reset = document.getElementById("factor-game-reset");
  if (!bubbleHost || !score || !result || !reset) return;

  const factors = [
    { label: "Timeous repayments", correct: true },
    { label: "Gym membership", correct: false },
    { label: "Missed payments", correct: true },
    { label: "Income", correct: false },
    { label: "Applying everywhere for credit", correct: true },
    { label: "Prepaid expenses", correct: false },
    { label: "Maxing out credit limits", correct: true },
    { label: "Previous unpaid debt", correct: true },
    { label: "Credit history", correct: true },
    { label: "Favourite sport", correct: false },
  ];

  let found = 0;
  let gameFinished = false;
  reset.addEventListener("click", startGame);
  startGame();

  function startGame() {
    found = 0;
    gameFinished = false;
    result.textContent = "";
    reset.hidden = true;
    score.textContent = "Choose all the correct bubbles.";
    bubbleHost.replaceChildren(...factors.map(makeBubble));
    requestAnimationFrame(() => {
      bubbleHost.querySelectorAll(".factor-bubble:not(.is-correct)").forEach((bubble) => {
        bubble.dataset.offsetX = "0";
        bubble.dataset.offsetY = "0";
      });
    });
  }

  function makeBubble(factor, index) {
    const bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "factor-bubble";
    bubble.textContent = factor.label;
    bubble.dataset.tone = String(index % 4);

    if (factor.correct) {
      bubble.addEventListener("click", () => {
        if (gameFinished) return;
        found += 1;
        bubble.classList.add("is-correct");
        bubble.disabled = true;
        score.textContent = `${found} of ${factors.filter((item) => item.correct).length} correct factors found`;
        if (found === factors.filter((item) => item.correct).length) {
          finishGame();
        }
      });
    } else {
      bubble.addEventListener("pointerenter", () => {
        if (!gameFinished) moveBubble(bubble);
      });
      bubble.addEventListener("click", () => {
        if (gameFinished) return;
        moveBubble(bubble);
        score.textContent = "That one is not usually a direct credit-profile factor. Keep looking!";
      });
    }
    return bubble;
  }

  function moveBubble(bubble) {
    const hostRect = bubbleHost.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const currentX = Number(bubble.dataset.offsetX || 0);
    const currentY = Number(bubble.dataset.offsetY || 0);
    const baseLeft = bubbleRect.left - currentX;
    const baseTop = bubbleRect.top - currentY;
    const left = hostRect.left + bubbleHost.clientLeft;
    const top = hostRect.top + bubbleHost.clientTop;
    const right = left + bubbleHost.clientWidth;
    const bottom = top + bubbleHost.clientHeight;
    const minX = left - baseLeft;
    const maxX = right - (baseLeft + bubbleRect.width);
    const minY = top - baseTop;
    const maxY = bottom - (baseTop + bubbleRect.height);

    if (minX > maxX || minY > maxY) return;

    const nextX = randomOffset(minX, maxX, currentX);
    const nextY = randomOffset(minY, maxY, currentY);
    bubble.dataset.offsetX = String(nextX);
    bubble.dataset.offsetY = String(nextY);
    bubble.style.transform = `translate(${nextX}px, ${nextY}px)`;
  }

  function randomOffset(minimum, maximum, current) {
    if (maximum - minimum < 2) return minimum;

    let next = current;
    for (let attempt = 0; attempt < 8 && Math.abs(next - current) < 24; attempt += 1) {
      next = minimum + Math.random() * (maximum - minimum);
    }
    return next;
  }

  function finishGame() {
    gameFinished = true;
    bubbleHost.querySelectorAll("button").forEach((bubble) => {
      bubble.disabled = true;
    });
    result.textContent = `You found ${found} of ${factors.filter((item) => item.correct).length} credit factors. Remember: lenders may also consider income when assessing affordability, even though it is not usually a direct credit-score factor.`;
    reset.hidden = false;
  }
})();
