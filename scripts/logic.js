(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.flashcardLogic = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DEFAULT_MIN = 0;
  const DEFAULT_MAX = 30;
  const DEFAULT_OPS = ["+", "-", "*"];

  function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeConfig(config) {
    const sanitized = { ...config };

    let min = toFiniteNumber(sanitized.min, DEFAULT_MIN);
    let max = toFiniteNumber(sanitized.max, DEFAULT_MAX);
    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }
    min = Math.trunc(min);
    max = Math.trunc(max);

    let count = Math.floor(toFiniteNumber(sanitized.count, 1));
    if (!Number.isFinite(count) || count < 1) {
      count = 1;
    }

    const opsInput = Array.isArray(sanitized.ops) ? sanitized.ops : DEFAULT_OPS;
    const ops = opsInput.filter(op => op === "+" || op === "-" || op === "*" || op === "/");
    if (!ops.length) {
      ops.push(...DEFAULT_OPS);
    }

    return { min, max, count, ops };
  }

  function randInt(min, max) {
    const rangeMin = Math.ceil(min);
    const rangeMax = Math.floor(max);
    return Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
  }

  function createQuestion(op, min, max) {
    const operandMin = Math.min(min, 0);
    const operandMax = Math.max(max, 0);

    for (let attempt = 0; attempt < 200; attempt++) {
      let a;
      let b;
      let ans;

      if (op === "+" || op === "-") {
        a = randInt(operandMin, operandMax);
        b = randInt(operandMin, operandMax);

        if (op === "-" && min >= 0 && b > a) {
          const temp = a;
          a = b;
          b = temp;
        }

        ans = op === "+" ? a + b : a - b;
      } else if (op === "*") {
        a = randInt(operandMin, operandMax);
        b = randInt(operandMin, operandMax);
        ans = a * b;
      } else if (op === "/") {
        b = randInt(operandMin, operandMax);
        if (b === 0) {
          continue;
        }
        ans = randInt(min, max);
        a = ans * b;
      } else {
        continue;
      }

      if (ans >= min && ans <= max) {
        return { a, b, op, ans };
      }
    }

    const ans = Math.min(Math.max(min, operandMin), max);
    if (op === "-") {
      return { a: ans, b: 0, op, ans };
    }
    if (op === "*") {
      return { a: ans, b: 1, op, ans };
    }
    if (op === "/") {
      return { a: ans, b: 1, op, ans };
    }
    return { a: ans, b: 0, op: "+", ans };
  }

  function generateQuestions(configInput) {
    const config = normalizeConfig(configInput);
    const questions = [];

    for (let i = 0; i < config.count; i++) {
      const op = config.ops[randInt(0, config.ops.length - 1)];
      questions.push(createQuestion(op, config.min, config.max));
    }

    return { questions, config };
  }

  return {
    createQuestion,
    generateQuestions,
    normalizeConfig,
    randInt,
  };
});
