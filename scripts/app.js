(function () {
  const logic = typeof flashcardLogic !== "undefined" ? flashcardLogic : null;
  if (!logic) {
    throw new Error("flashcardLogic is not available");
  }

  const stats = typeof flashcardStats !== "undefined" ? flashcardStats : null;

  const startBtn = document.getElementById("startBtn");
  const answerInput = document.getElementById("answerInput");
  const problemText = document.getElementById("problemText");
  const statusText = document.getElementById("statusText");
  const summary = document.getElementById("summary");
  const answerRow = document.getElementById("answerRow");

  const minInput = document.getElementById("minValue");
  const maxInput = document.getElementById("maxValue");
  const countInput = document.getElementById("questionCount");
  const mulMaxOperandInput = document.getElementById("mulMaxOperand");
  const opAdd = document.getElementById("opAdd");
  const opSub = document.getElementById("opSub");
  const opMul = document.getElementById("opMul");
  const opDiv = document.getElementById("opDiv");
  const settingsToggle = document.getElementById("settingsToggle");
  const settingsPanel = document.getElementById("settingsPanel");
  const resetStatsBtn = document.getElementById("resetStatsBtn");
  const statsToggle = document.getElementById("statsToggle");
  const statsPanel = document.getElementById("statsPanel");
  const statsClose = document.getElementById("statsClose");
  const statsPanelContent = document.getElementById("statsPanelContent");

  let questions = [];
  let index = 0;
  let firstTryCorrect = 0;
  let attemptsForCurrent = 0;
  let startTime = 0;
  let questionStartTime = 0;
  let heatmapMetric = "accuracy";

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

  function isStatsOpen() {
    return statsPanel && !statsPanel.classList.contains("hidden");
  }

  function openStatsPanel() {
    closeSettingsPanel();
    renderStatsPanel();
    statsPanel.classList.remove("hidden");
    statsToggle.setAttribute("aria-expanded", "true");
  }

  function closeStatsPanel() {
    statsPanel.classList.add("hidden");
    statsToggle.setAttribute("aria-expanded", "false");
  }

  function toggleStatsPanel() {
    if (isStatsOpen()) {
      closeStatsPanel();
    } else {
      openStatsPanel();
    }
  }

  if (statsToggle && statsPanel) {
    statsToggle.addEventListener("click", toggleStatsPanel);

    if (statsClose) {
      statsClose.addEventListener("click", () => {
        closeStatsPanel();
        statsToggle.focus();
      });
    }

    document.addEventListener("pointerdown", event => {
      if (!isStatsOpen()) {
        return;
      }
      const target = event.target;
      if (target === statsToggle || statsPanel.contains(target)) {
        return;
      }
      closeStatsPanel();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && isStatsOpen()) {
        closeStatsPanel();
        statsToggle.focus();
      }
    });
  }

  function getConfigFromInputs() {
    return {
      min: minInput.value,
      max: maxInput.value,
      count: countInput.value,
      mulMaxOperand: mulMaxOperandInput.value,
      ops: [
        ...(opAdd.checked ? ["+"] : []),
        ...(opSub.checked ? ["-"] : []),
        ...(opMul.checked ? ["*"] : []),
        ...(opDiv.checked ? ["/"] : []),
      ],
    };
  }

  function applyConfigToInputs(config) {
    minInput.value = config.min;
    maxInput.value = config.max;
    countInput.value = config.count;
    mulMaxOperandInput.value = config.mulMaxOperand;

    const hasAddition = config.ops.includes("+");
    const hasSubtraction = config.ops.includes("-");
    const hasMultiplication = config.ops.includes("*");
    const hasDivision = config.ops.includes("/");
    opAdd.checked = hasAddition;
    opSub.checked = hasSubtraction;
    opMul.checked = hasMultiplication;
    opDiv.checked = hasDivision;
  }

  function renderProblem(question) {
    const operatorDisplay = {
      "+": "+",
      "-": "-",
      "*": "×",
      "/": "÷",
    };
    const opSymbol = operatorDisplay[question.op] || question.op;
    return `
      <div class="equation-row">
        <span class="operand operand-a">${question.a}</span>
      </div>
      <div class="equation-row">
        <span class="operator">${opSymbol}</span>
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

    attemptsForCurrent = 0;
    questionStartTime = performance.now();
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
        <div class="result-line"><strong>Score:</strong> ${firstTryCorrect}/${questions.length}</div>
        <div class="result-line"><strong>Total time:</strong> ${totalTime}s</div>
        <div class="result-line"><strong>Avg per question:</strong> ${average}s</div>
      </div>
    `;
    answerRow.classList.add("hidden");
    startBtn.classList.remove("hidden");
    statusText.textContent = "";
    statusText.className = "status";
    renderReport();
  }

  function startRound() {
    const configInput = getConfigFromInputs();
    const { questions: generated, config } = logic.generateQuestions(configInput);

    applyConfigToInputs(config);

    questions = generated;
    index = 0;
    firstTryCorrect = 0;
    attemptsForCurrent = 0;
    summary.innerHTML = "";
    summary.classList.add("hidden");
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

  function recordOutcome(question, hadError) {
    if (!stats) {
      return;
    }
    const timeMs = questionStartTime ? performance.now() - questionStartTime : null;
    stats.recordAttempt(question, { hadError, timeMs });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
  }

  // Hue 140 (green / good) down to 0 (red / trouble) as t goes 0 -> 1.
  function troubleHue(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 140 * (1 - clamped);
  }

  function buildTroubleHtml() {
    const spots = stats.getTroubleSpots({ minAttempts: 3, limit: 5 });
    if (!spots.length) {
      return "";
    }

    const rows = spots
      .map(spot => {
        const pct = Math.round(spot.errorRate * 100);
        const p90 = spot.p90Ms != null ? `${(spot.p90Ms / 1000).toFixed(1)}s` : "—";
        return `
          <li class="trouble-item">
            <span class="trouble-problem">${escapeHtml(spot.label)}</span>
            <span class="trouble-metric">${pct}% missed</span>
            <span class="trouble-metric">p90 ${p90}</span>
          </li>`;
      })
      .join("");

    return `
      <h2 class="trouble-title">🔥 Trouble spots</h2>
      <ul class="trouble-list">${rows}</ul>
      <p class="trouble-note">All-time history · problems practiced 3+ times</p>
    `;
  }

  function buildHeatmapHtml(all) {
    const MIN_OPERAND = 2;
    let maxOperand = 12;
    let minP90 = Infinity;
    let maxP90 = -Infinity;
    let hasMultiplication = false;

    Object.keys(all).forEach(key => {
      const stat = all[key];
      if (stat.op !== "*") {
        return;
      }
      hasMultiplication = true;
      maxOperand = Math.max(maxOperand, stat.a, stat.b);
      if (stat.p90Ms != null) {
        minP90 = Math.min(minP90, stat.p90Ms);
        maxP90 = Math.max(maxP90, stat.p90Ms);
      }
    });
    maxOperand = Math.min(maxOperand, 20);

    if (!hasMultiplication) {
      return `
        <h2 class="trouble-title">🌡️ Times-table heatmap</h2>
        <p class="trouble-note">Practice some × problems to fill in the grid.</p>
      `;
    }

    const cellStat = (a, b) => all[stats.problemKey({ a, b, op: "*" })];

    const headerCells = [`<div class="heat-corner">×</div>`];
    for (let b = MIN_OPERAND; b <= maxOperand; b++) {
      headerCells.push(`<div class="heat-head">${b}</div>`);
    }
    let grid = `<div class="heat-row">${headerCells.join("")}</div>`;

    for (let a = MIN_OPERAND; a <= maxOperand; a++) {
      const cells = [`<div class="heat-head">${a}</div>`];
      for (let b = MIN_OPERAND; b <= maxOperand; b++) {
        const stat = cellStat(a, b);
        if (!stat || stat.attempts === 0) {
          cells.push(
            `<div class="heat-cell untested" title="${a} × ${b} — not practiced">${a * b}</div>`,
          );
          continue;
        }

        let hue;
        if (heatmapMetric === "speed") {
          if (stat.p90Ms == null || maxP90 === minP90) {
            hue = troubleHue(0.5);
          } else {
            hue = troubleHue((stat.p90Ms - minP90) / (maxP90 - minP90));
          }
        } else {
          hue = troubleHue(stat.errorRate);
        }

        const pct = Math.round(stat.errorRate * 100);
        const p90 = stat.p90Ms != null ? `${(stat.p90Ms / 1000).toFixed(1)}s` : "—";
        const title = `${a} × ${b} — ${pct}% missed · p90 ${p90} · ${stat.attempts} tries`;
        cells.push(
          `<div class="heat-cell" style="background:hsl(${hue}, 65%, 55%)" title="${title}">${a * b}</div>`,
        );
      }
      grid += `<div class="heat-row">${cells.join("")}</div>`;
    }

    const lowLabel = heatmapMetric === "speed" ? "Faster" : "Mastered";
    const highLabel = heatmapMetric === "speed" ? "Slower" : "Trouble";

    return `
      <div class="heatmap-header">
        <h2 class="trouble-title">🌡️ Times-table heatmap</h2>
        <div class="heatmap-toggle">
          <button type="button" data-metric="accuracy" class="${heatmapMetric === "accuracy" ? "active" : ""}">Accuracy</button>
          <button type="button" data-metric="speed" class="${heatmapMetric === "speed" ? "active" : ""}">Speed</button>
        </div>
      </div>
      <div class="heatmap-scroll"><div class="heatmap">${grid}</div></div>
      <div class="heatmap-legend">
        <span>${lowLabel}</span>
        <span class="legend-bar"></span>
        <span>${highLabel}</span>
        <span class="legend-swatch"></span>
        <span>Not practiced</span>
      </div>
    `;
  }

  function buildReportHtml() {
    if (!stats) {
      return "";
    }
    const all = stats.getAll();
    if (!Object.keys(all).length) {
      return "";
    }
    return `
      <div class="heatmap-section">${buildHeatmapHtml(all)}</div>
      ${buildTroubleHtml()}
    `;
  }

  function renderReport() {
    const html = buildReportHtml();
    if (!html) {
      summary.innerHTML = "";
      summary.classList.add("hidden");
      return;
    }
    summary.innerHTML = html;
    summary.classList.remove("hidden");
  }

  function renderStatsPanel() {
    if (!statsPanelContent) {
      return;
    }
    const html = buildReportHtml();
    statsPanelContent.innerHTML =
      html ||
      `<p class="stats-empty">No practice history yet.<br />Play a round to start building your heatmap!</p>`;
  }

  function refreshReports() {
    if (!summary.classList.contains("hidden")) {
      renderReport();
    }
    if (statsPanel && isStatsOpen()) {
      renderStatsPanel();
    }
  }

  function submitAnswer() {
    if (!questions.length || !questions[index]) {
      return;
    }

    const currentQuestion = questions[index];
    const userAnswer = Number(answerInput.value);

    if (userAnswer === currentQuestion.ans) {
      const hadError = attemptsForCurrent > 0;
      if (!hadError) {
        firstTryCorrect += 1;
      }
      recordOutcome(currentQuestion, hadError);
      statusText.textContent = "✅ Correct!";
      statusText.className = "status correct";
      attemptsForCurrent = 0;
      index += 1;
      setTimeout(showQuestion, 400);
    } else {
      attemptsForCurrent += 1;
      statusText.textContent = "❌ Try again";
      statusText.className = "status wrong";
      focusAnswerInput();
    }
  }

  if (resetStatsBtn) {
    resetStatsBtn.addEventListener("click", () => {
      if (!stats) {
        return;
      }
      const confirmReset =
        typeof window === "undefined" || typeof window.confirm !== "function"
          ? true
          : window.confirm("Clear all tracked trouble spots? This can't be undone.");
      if (!confirmReset) {
        return;
      }
      stats.reset();
      refreshReports();
    });
  }

  // Toggle the heatmap metric without leaving the report (delegated; works in both
  // the end-of-round summary and the anytime stats panel, and survives re-render).
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-metric]");
    if (!button) {
      return;
    }
    heatmapMetric = button.getAttribute("data-metric");
    refreshReports();
  });

  startBtn.addEventListener("click", startRound);
  answerInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAnswer();
    }
  });

  // Show any existing history right away, before the first round of the session.
  renderReport();
})();
