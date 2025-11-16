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
  const DEFAULT_MUL_MAX_OPERAND = 5;

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

    let mulMaxOperand = toFiniteNumber(sanitized.mulMaxOperand, DEFAULT_MUL_MAX_OPERAND);
    if (!Number.isFinite(mulMaxOperand)) {
      mulMaxOperand = DEFAULT_MUL_MAX_OPERAND;
    }
    mulMaxOperand = Math.max(1, Math.trunc(mulMaxOperand));

    return { min, max, count, ops, mulMaxOperand };
  }

  function randInt(min, max) {
    const rangeMin = Math.ceil(min);
    const rangeMax = Math.floor(max);
    return Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
  }

  function createQuestion(op, min, max, options = {}) {
    const { mulMaxOperand = DEFAULT_MUL_MAX_OPERAND } = options || {};
    const mulOperandLimit = Math.max(
      1,
      Math.trunc(toFiniteNumber(mulMaxOperand, DEFAULT_MUL_MAX_OPERAND)),
    );

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
        const mulRangeMin = Math.max(operandMin, -mulOperandLimit);
        const mulRangeMax = Math.min(operandMax, mulOperandLimit);
        if (mulRangeMin > mulRangeMax) {
          continue;
        }
        a = randInt(mulRangeMin, mulRangeMax);
        b = randInt(mulRangeMin, mulRangeMax);
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
      const limitedOperand = Math.min(Math.max(ans, -mulOperandLimit), mulOperandLimit);
      return { a: limitedOperand, b: 1, op, ans: limitedOperand };
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
      questions.push(createQuestion(op, config.min, config.max, config));
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
