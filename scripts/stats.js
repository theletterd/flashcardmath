(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.flashcardStats = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const STORAGE_KEY = "flashcardStats:v1";
  const MAX_TIME_SAMPLES = 20;
  const DEFAULT_MIN_ATTEMPTS = 3;
  const DEFAULT_LIMIT = 5;
  const COMMUTATIVE_OPS = { "+": true, "*": true };
  const OP_DISPLAY = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  function createMemoryStorage() {
    const data = Object.create(null);
    return {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
      },
      setItem(key, value) {
        data[key] = String(value);
      },
      removeItem(key) {
        delete data[key];
      },
    };
  }

  function detectStorage() {
    try {
      if (typeof localStorage !== "undefined" && localStorage) {
        // Touch it to surface SecurityError (e.g. private mode) early.
        const probe = "__flashcardStats_probe__";
        localStorage.setItem(probe, "1");
        localStorage.removeItem(probe);
        return localStorage;
      }
    } catch (err) {
      /* fall through to in-memory */
    }
    return createMemoryStorage();
  }

  let storage = detectStorage();

  // Canonicalize operands so commutative problems share one identity.
  function canonicalOperands(question) {
    let { a, b, op } = question;
    if (COMMUTATIVE_OPS[op] && a > b) {
      const temp = a;
      a = b;
      b = temp;
    }
    return { a, b, op };
  }

  function problemKey(question) {
    const { a, b, op } = canonicalOperands(question);
    return `${a}${op}${b}`;
  }

  function formatProblem(record) {
    const symbol = OP_DISPLAY[record.op] || record.op;
    return `${record.a} ${symbol} ${record.b}`;
  }

  function percentile(values, p) {
    if (!Array.isArray(values) || values.length === 0) {
      return null;
    }
    const sorted = values.slice().sort((x, y) => x - y);
    if (sorted.length === 1) {
      return sorted[0];
    }
    const rank = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper) {
      return sorted[lower];
    }
    const fraction = rank - lower;
    return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
  }

  function emptyStore() {
    return { version: 1, problems: {} };
  }

  function load() {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.problems) {
          return parsed;
        }
      }
    } catch (err) {
      /* corrupt or unavailable: start fresh */
    }
    return emptyStore();
  }

  function save(store) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (err) {
      /* storage full or unavailable: silently skip persistence */
    }
  }

  function recordAttempt(question, outcome) {
    const opts = outcome || {};
    const store = load();
    const key = problemKey(question);
    let record = store.problems[key];
    if (!record) {
      const { a, b, op } = canonicalOperands(question);
      record = { a, b, op, attempts: 0, errors: 0, times: [] };
      store.problems[key] = record;
    }

    record.attempts += 1;
    if (opts.hadError) {
      record.errors += 1;
    }
    const timeMs = opts.timeMs;
    if (typeof timeMs === "number" && Number.isFinite(timeMs) && timeMs >= 0) {
      record.times.push(Math.round(timeMs));
      if (record.times.length > MAX_TIME_SAMPLES) {
        record.times.splice(0, record.times.length - MAX_TIME_SAMPLES);
      }
    }

    save(store);
    return record;
  }

  function summarize(key, record) {
    return {
      key,
      a: record.a,
      b: record.b,
      op: record.op,
      label: formatProblem(record),
      attempts: record.attempts,
      errors: record.errors,
      errorRate: record.attempts ? record.errors / record.attempts : 0,
      p90Ms: percentile(record.times, 90),
    };
  }

  function getTroubleSpots(options) {
    const opts = options || {};
    const minAttempts = opts.minAttempts != null ? opts.minAttempts : DEFAULT_MIN_ATTEMPTS;
    const limit = opts.limit != null ? opts.limit : DEFAULT_LIMIT;

    const store = load();
    const rows = Object.keys(store.problems)
      .map(key => summarize(key, store.problems[key]))
      .filter(row => row.attempts >= minAttempts)
      .filter(row => row.errors > 0 || row.p90Ms != null);

    rows.sort((x, y) => {
      if (y.errorRate !== x.errorRate) {
        return y.errorRate - x.errorRate;
      }
      return (y.p90Ms || 0) - (x.p90Ms || 0);
    });

    return limit > 0 ? rows.slice(0, limit) : rows;
  }

  function getAll() {
    const store = load();
    const result = {};
    Object.keys(store.problems).forEach(key => {
      result[key] = summarize(key, store.problems[key]);
    });
    return result;
  }

  function reset() {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch (err) {
      /* nothing to clear */
    }
  }

  // Test seam: swap in an isolated storage backend.
  function useStorage(custom) {
    storage = custom || createMemoryStorage();
  }

  return {
    problemKey,
    formatProblem,
    percentile,
    recordAttempt,
    getTroubleSpots,
    getAll,
    reset,
    useStorage,
    createMemoryStorage,
  };
});
