(() => {
  const trigger = document.querySelector(".dashboard-questionnaire-trigger");
  const dialog = document.getElementById("questionnaire-dialog");
  if (!trigger || !dialog) return;

  const form = document.getElementById("questionnaire-form");
  const progress = document.getElementById("questionnaire-progress");
  const progressLabel = document.getElementById("questionnaire-progress-label");
  const questionTitle = document.getElementById("questionnaire-question");
  const hint = document.getElementById("questionnaire-hint");
  const choices = document.getElementById("questionnaire-choices");
  const error = document.getElementById("questionnaire-error");
  const loadError = document.getElementById("questionnaire-load-error");
  const nextButton = document.getElementById("questionnaire-next");
  const completePanel = document.getElementById("questionnaire-complete");
  const matchStatus = document.getElementById("questionnaire-match-status");
  const matchesContainer = document.getElementById("questionnaire-matches");
  const matchGenerate = document.getElementById("questionnaire-match-generate");
  const matchRetry = document.getElementById("questionnaire-match-retry");
  const matchLoading = document.getElementById("questionnaire-match-loading");
  let questions = [];
  let questionIndex = 0;
  let isLoadingMatches = false;

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    dialog.showModal();
    loadQuestionnaire();
  });

  dialog.querySelector(".questionnaire-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".questionnaire-done").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  form.addEventListener("submit", submitAnswer);
  matchGenerate.addEventListener("click", loadMatches);
  matchRetry.addEventListener("click", loadMatches);

  async function loadQuestionnaire() {
    form.hidden = true;
    completePanel.hidden = true;
    matchesContainer.replaceChildren();
    matchGenerate.hidden = false;
    matchRetry.hidden = true;
    matchStatus.textContent = "Choose Generate my matches to see your options.";
    loadError.textContent = "";
    error.textContent = "";
    progressLabel.textContent = "Loading questionnaire…";

    questions = [];
    questionIndex = 0;
    progress.value = 0;
    const endpoint = document.body.dataset.apiQuestionnaire;
    const resetResponse = await window.Pace.apiFetch(endpoint, { method: "DELETE" });
    if (!resetResponse.ok || !resetResponse.data) {
      loadError.textContent =
        resetResponse.error || "Unable to reset the questionnaire. Please try again.";
      progressLabel.textContent = "";
      return;
    }

    const response = await window.Pace.apiFetch(endpoint);
    if (!response.ok || !response.data) {
      loadError.textContent = response.error || "Unable to load the questionnaire. Please try again.";
      progressLabel.textContent = "";
      return;
    }

    questions = response.data.questions;
    questionIndex = response.data.answered_count;
    progress.max = questions.length;
    progress.value = questionIndex;
    if (questionIndex >= questions.length) {
      progressLabel.textContent = `${questions.length} of ${questions.length} questions complete`;
      showMatches();
      return;
    }
    renderQuestion();
  }

  function renderQuestion() {
    const question = questions[questionIndex];
    const isMultiple = question.type === "multiple";
    const isNumber = question.type === "number";
    progress.value = questionIndex;
    progressLabel.textContent = `Question ${questionIndex + 1} of ${questions.length}`;
    questionTitle.textContent = question.question;
    hint.textContent = isNumber
      ? "Enter a whole number."
      : isMultiple
        ? "Select all that apply."
        : "Choose one answer.";
    nextButton.textContent = questionIndex === questions.length - 1 ? "Finish" : "Next";
    error.textContent = "";
    if (isNumber) {
      const label = document.createElement("label");
      label.className = "questionnaire-number-input";
      label.htmlFor = `questionnaire-${question.id}`;
      label.textContent = "Amount";
      const input = document.createElement("input");
      input.type = "number";
      input.name = "questionnaire-answer";
      input.id = label.htmlFor;
      input.min = String(question.min);
      input.max = String(question.max);
      input.step = String(question.step);
      input.required = true;
      label.append(input);
      choices.replaceChildren(label);
    } else {
      choices.replaceChildren(
        ...question.choices.map((choice, choiceIndex) => {
          const label = document.createElement("label");
          label.className = "questionnaire-choice";
          const input = document.createElement("input");
          input.type = isMultiple ? "checkbox" : "radio";
          input.name = "questionnaire-answer";
          input.value = choice;
          input.id = `questionnaire-${question.id}-${choiceIndex}`;
          const text = document.createElement("span");
          text.textContent = choice;
          label.append(input, text);
          return label;
        })
      );
    }
    form.hidden = false;
  }

  async function submitAnswer(event) {
    event.preventDefault();
    const question = questions[questionIndex];
    let answer;
    if (question.type === "number") {
      const input = form.querySelector('input[name="questionnaire-answer"]');
      if (!input.value || !input.reportValidity()) return;
      answer = Number(input.value);
    } else {
      const selected = Array.from(form.querySelectorAll('input[name="questionnaire-answer"]:checked'));
      if (selected.length === 0) {
        error.textContent = "Choose an answer to continue.";
        return;
      }
      answer = question.type === "multiple"
        ? selected.map((input) => input.value)
        : selected[0].value;
    }

    nextButton.disabled = true;
    error.textContent = "";
    const response = await window.Pace.apiFetch(
      document.body.dataset.apiQuestionnaire,
      { method: "POST", body: { question_id: question.id, answer } }
    );
    nextButton.disabled = false;

    if (!response.ok || !response.data) {
      error.textContent = response.error || "Unable to save your answer. Please try again.";
      return;
    }

    questionIndex = response.data.answered_count;
    progress.value = questionIndex;
    if (response.data.complete) {
      progressLabel.textContent = `${questions.length} of ${questions.length} questions complete`;
      form.hidden = true;
      showMatches();
      return;
    }
    renderQuestion();
  }

  function showMatches() {
    completePanel.hidden = false;
    matchesContainer.replaceChildren();
    matchGenerate.hidden = false;
    matchRetry.hidden = true;
    matchStatus.textContent = "Choose Generate my matches to see your options.";
  }

  async function loadMatches() {
    if (isLoadingMatches) return;
    isLoadingMatches = true;
    matchGenerate.hidden = true;
    matchRetry.hidden = true;
    matchGenerate.disabled = true;
    matchRetry.disabled = true;
    matchLoading.hidden = false;
    matchesContainer.replaceChildren();
    matchStatus.textContent = "Finding options that fit your answers…";
    try {
      const response = await window.Pace.apiFetch(
        document.body.dataset.apiQuestionnaireMatches,
        { method: "POST", timeoutMs: 45000 }
      );
      if (!response.ok || !response.data) {
        matchStatus.textContent = response.error || "Unable to find matches right now.";
        matchRetry.hidden = false;
        return;
      }

      if (!Array.isArray(response.data.matches) || response.data.matches.length === 0) {
        matchStatus.textContent = response.data.message || "No matching credit options are available right now.";
        return;
      }

      const uniqueMatches = [];
      const seenNames = new Set();
      response.data.matches.forEach((match) => {
        const key = String(match.account_name || "").trim().toLocaleLowerCase();
        if (!key || seenNames.has(key)) return;
        seenNames.add(key);
        uniqueMatches.push(match);
      });
      if (uniqueMatches.length === 0) {
        matchStatus.textContent = response.data.message || "No matching credit options are available right now.";
        return;
      }

      matchStatus.textContent = response.data.notice || "";
      uniqueMatches.forEach((match, index) => {
        matchesContainer.append(createMatchCard(match, index));
      });
    } catch (error) {
      matchStatus.textContent = "Unable to find matches right now. Please try again.";
      matchRetry.hidden = false;
      console.error("Credit matching request failed.", error);
    } finally {
      isLoadingMatches = false;
      matchLoading.hidden = true;
      matchGenerate.disabled = false;
      matchRetry.disabled = false;
    }
  }

  function createMatchCard(match, index) {
    const card = document.createElement("article");
    card.className = "questionnaire-match";

    const rank = document.createElement("p");
    rank.className = "questionnaire-match-rank";
    rank.textContent = index === 0 ? "Best match" : `Match ${index + 1}`;

    const logo = document.createElement("div");
    logo.className = "questionnaire-match-logo";
    const fallback = document.createElement("span");
    fallback.className = "questionnaire-match-logo-fallback";
    fallback.textContent = String(match.account_name || "Credit option")
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
    logo.append(fallback);

    if (match.logo_url) {
      const image = document.createElement("img");
      image.src = match.logo_url;
      image.alt = `${match.account_name} logo`;
      image.addEventListener("load", () => fallback.remove(), { once: true });
      image.addEventListener("error", () => image.remove(), { once: true });
      logo.append(image);
    }

    const name = document.createElement("h4");
    name.className = "questionnaire-match-name";
    const nameLink = document.createElement("a");
    nameLink.href = match.lender_url || "https://example.com/";
    nameLink.target = "_blank";
    nameLink.rel = "noopener noreferrer";
    nameLink.textContent = match.account_name || "Credit option";
    name.append(nameLink);

    const reason = document.createElement("p");
    reason.className = "questionnaire-match-reason";
    reason.textContent = match.reason || "";

    const considerations = document.createElement("ul");
    considerations.className = "questionnaire-match-considerations";
    (Array.isArray(match.considerations) ? match.considerations : []).forEach((item) => {
      const detail = document.createElement("li");
      detail.textContent = item;
      considerations.append(detail);
    });

    card.append(rank, logo, name, reason);
    if (considerations.childElementCount > 0) card.append(considerations);
    return card;
  }
})();
