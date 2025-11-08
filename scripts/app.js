(function () {
  const logic = typeof flashcardLogic !== "undefined" ? flashcardLogic : null;
  if (!logic) {
    throw new Error("flashcardLogic is not available");
  }

  const startBtn = document.getElementById("startBtn");
  const answerInput = document.getElementById("answerInput");
  const problemText = document.getElementById("problemText");
  const statusText = document.getElementById("statusText");
  const summary = document.getElementById("summary");
  const answerRow = document.getElementById("answerRow");

  const minInput = document.getElementById("minValue");
  const maxInput = document.getElementById("maxValue");
  const countInput = document.getElementById("questionCount");
  const opAdd = document.getElementById("opAdd");
  const opSub = document.getElementById("opSub");
  const settingsToggle = document.getElementById("settingsToggle");
  const settingsPanel = document.getElementById("settingsPanel");

  let questions = [];
  let index = 0;
  let correct = 0;
  let startTime = 0;

  function isSettingsOpen() {
    return !settingsPanel.classList.contains("hidden");
  }

  function openSettingsPanel() {
    settingsPanel.classList.remove("hidden");
    settingsToggle.setAttribute("aria-expanded", "true");
  }

  function closeSettingsPanel() {
    settingsPanel.classList.add("hidden");
    settingsToggle.setAttribute("aria-expanded", "false");
  }

  function toggleSettingsPanel() {
    if (isSettingsOpen()) {
      closeSettingsPanel();
    } else {
      openSettingsPanel();
    }
  }

  settingsToggle.addEventListener("click", toggleSettingsPanel);

  function handleSettingsFocusOut(event) {
    const next = event.relatedTarget;
    if (next && (next === settingsToggle || settingsPanel.contains(next))) {
      return;
    }
    closeSettingsPanel();
  }

  settingsToggle.addEventListener("blur", handleSettingsFocusOut);
  settingsPanel.addEventListener("focusout", handleSettingsFocusOut);

  document.addEventListener("pointerdown", event => {
    if (!isSettingsOpen()) {
      return;
    }
    const target = event.target;
    if (target === settingsToggle || settingsPanel.contains(target)) {
      return;
    }
    closeSettingsPanel();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && isSettingsOpen()) {
      closeSettingsPanel();
      settingsToggle.focus();
    }
  });

  function getConfigFromInputs() {
    return {
      min: minInput.value,
      max: maxInput.value,
      count: countInput.value,
      ops: [
        ...(opAdd.checked ? ["+"] : []),
        ...(opSub.checked ? ["-"] : []),
      ],
    };
  }

  function applyConfigToInputs(config) {
    minInput.value = config.min;
    maxInput.value = config.max;
    countInput.value = config.count;

    const hasAddition = config.ops.includes("+");
    const hasSubtraction = config.ops.includes("-");
    opAdd.checked = hasAddition;
    opSub.checked = hasSubtraction;
  }

  function renderProblem(question) {
    return `
      <div class="equation-row">
        <span class="operand operand-a">${question.a}</span>
      </div>
      <div class="equation-row">
        <span class="operator">${question.op}</span>
        <span class="operand operand-b">${question.b}</span>
      </div>
      <hr />
    `;
  }

  function focusAnswerInput() {
    answerInput.focus();
    answerInput.select();
  }

  function showQuestion() {
    const question = questions[index];
    if (!question) {
      finishRound();
      return;
    }

    problemText.innerHTML = renderProblem(question);
    problemText.classList.remove("finished");
    answerRow.classList.remove("hidden");
    answerInput.value = "";
    focusAnswerInput();
    statusText.textContent = "";
    statusText.className = "status";
  }

  function finishRound() {
    if (!questions.length) {
      problemText.textContent = "Click Start";
      problemText.classList.remove("finished");
      answerRow.classList.add("hidden");
      startBtn.classList.remove("hidden");
      return;
    }

    const elapsedSeconds = ((performance.now() - startTime) / 1000);
    const totalTime = elapsedSeconds.toFixed(1);
    const average = (elapsedSeconds / questions.length).toFixed(2);

    problemText.classList.add("finished");
    problemText.innerHTML = `
      <div class="done-message">Done!</div>
      <div class="results">
        <div class="result-line"><strong>Score:</strong> ${correct}/${questions.length}</div>
        <div class="result-line"><strong>Total time:</strong> ${totalTime}s</div>
        <div class="result-line"><strong>Avg per question:</strong> ${average}s</div>
      </div>
    `;
    answerRow.classList.add("hidden");
    startBtn.classList.remove("hidden");
    statusText.textContent = "";
    statusText.className = "status";
    summary.innerHTML = "";
  }

  function startRound() {
    const configInput = getConfigFromInputs();
    const { questions: generated, config } = logic.generateQuestions(configInput);

    applyConfigToInputs(config);

    questions = generated;
    index = 0;
    correct = 0;
    summary.innerHTML = "";
    startTime = performance.now();

    closeSettingsPanel();
    startBtn.classList.add("hidden");

    showQuestion();
  }

  function isRoundActive() {
    return startBtn.classList.contains("hidden");
  }

  countInput.addEventListener("change", () => {
    if (isRoundActive()) {
      startRound();
    }
  });

  function submitAnswer() {
    if (!questions.length || !questions[index]) {
      return;
    }

    const currentQuestion = questions[index];
    const userAnswer = Number(answerInput.value);

    if (userAnswer === currentQuestion.ans) {
      correct += 1;
      statusText.textContent = "✅ Correct!";
      statusText.className = "status correct";
    } else {
      statusText.textContent = `❌ It's ${currentQuestion.ans}`;
      statusText.className = "status wrong";
    }

    index += 1;
    setTimeout(showQuestion, 400);
  }

  startBtn.addEventListener("click", startRound);
  answerInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAnswer();
    }
  });
})();
