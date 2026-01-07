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
  const DEFAULT_COUNT = 30;
  const DEFAULT_OPS = ["*"];
  const DEFAULT_MUL_MAX_OPERAND = 10;

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

    let count = Math.floor(toFiniteNumber(sanitized.count, DEFAULT_COUNT));
    if (!Number.isFinite(count) || count < 1) {
      count = DEFAULT_COUNT;
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

  function randNonZeroInt(min, max) {
    const rangeMin = Math.ceil(min);
    const rangeMax = Math.floor(max);
    if (rangeMin > rangeMax) {
      return null;
    }
    if (rangeMin === 0 && rangeMax === 0) {
      return null;
    }

    if (rangeMin > 0 || rangeMax < 0) {
      return randInt(rangeMin, rangeMax);
    }

    const negativeCount = -rangeMin;
    const positiveCount = rangeMax;
    const total = negativeCount + positiveCount;
    const pickNegative = Math.random() * total < negativeCount;

    if (pickNegative) {
      return randInt(rangeMin, -1);
    }
    return randInt(1, rangeMax);
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
        a = randNonZeroInt(operandMin, operandMax);
        b = randNonZeroInt(operandMin, operandMax);
        if (a === null || b === null) {
          continue;
        }

        if (op === "-" && min >= 0 && b > a) {
          const temp = a;
          a = b;
          b = temp;
        }

        ans = op === "+" ? a + b : a - b;
      } else if (op === "*") {
        a = randInt(1, mulOperandLimit);
        b = randInt(1, mulOperandLimit);
        ans = a * b;
      } else if (op === "/") {
        b = randNonZeroInt(operandMin, operandMax);
        ans = randNonZeroInt(min, max);
        if (b === null || ans === null) {
          continue;
        }
        a = ans * b;
      } else {
        continue;
      }

      if (op === "*" || (ans >= min && ans <= max)) {
        return { a, b, op, ans };
      }
    }

    const ans = Math.min(Math.max(min, operandMin), max);
    const fallbackOperand = randNonZeroInt(operandMin || 1, Math.max(1, operandMax)) || 1;

    if (op === "-") {
      return { a: ans || fallbackOperand, b: fallbackOperand, op, ans: (ans || fallbackOperand) - fallbackOperand };
    }
    if (op === "*") {
      const limitedOperand = Math.min(Math.max(1, mulOperandLimit), mulOperandLimit);
      return { a: limitedOperand, b: limitedOperand, op, ans: limitedOperand * limitedOperand };
    }
    if (op === "/") {
      return { a: ans || fallbackOperand, b: fallbackOperand, op, ans: (ans || fallbackOperand) / fallbackOperand };
    }
    return { a: fallbackOperand, b: ans || fallbackOperand, op: "+", ans: fallbackOperand + (ans || fallbackOperand) };
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
