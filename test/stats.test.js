const test = require('node:test');
const assert = require('node:assert');

const stats = require('../scripts/stats.js');

test.beforeEach(() => {
  stats.useStorage(stats.createMemoryStorage());
});

test('problemKey collapses commutative operands but preserves order otherwise', () => {
  assert.strictEqual(stats.problemKey({ a: 6, b: 7, op: '*' }), stats.problemKey({ a: 7, b: 6, op: '*' }));
  assert.strictEqual(stats.problemKey({ a: 6, b: 7, op: '+' }), stats.problemKey({ a: 7, b: 6, op: '+' }));

  assert.notStrictEqual(stats.problemKey({ a: 10, b: 3, op: '-' }), stats.problemKey({ a: 3, b: 10, op: '-' }));
  assert.notStrictEqual(stats.problemKey({ a: 42, b: 7, op: '/' }), stats.problemKey({ a: 7, b: 42, op: '/' }));
});

test('percentile interpolates the 90th percentile', () => {
  const values = [];
  for (let i = 1; i <= 10; i++) {
    values.push(i * 1000);
  }
  // rank = 0.9 * 9 = 8.1 -> between 9000 and 10000
  assert.strictEqual(stats.percentile(values, 90), 9100);
  assert.strictEqual(stats.percentile([500], 90), 500);
  assert.strictEqual(stats.percentile([], 90), null);
});

test('recordAttempt accumulates attempts and errors across commutative variants', () => {
  stats.recordAttempt({ a: 6, b: 7, op: '*' }, { hadError: true, timeMs: 4000 });
  stats.recordAttempt({ a: 7, b: 6, op: '*' }, { hadError: false, timeMs: 2000 });

  const spots = stats.getTroubleSpots({ minAttempts: 1, limit: 10 });
  const six_seven = spots.find(s => s.key === stats.problemKey({ a: 6, b: 7, op: '*' }));

  assert.ok(six_seven, 'expected the 6x7 fact to be tracked');
  assert.strictEqual(six_seven.attempts, 2);
  assert.strictEqual(six_seven.errors, 1);
  assert.strictEqual(six_seven.errorRate, 0.5);
});

test('getTroubleSpots honours the minimum-attempts threshold', () => {
  for (let i = 0; i < 5; i++) {
    stats.recordAttempt({ a: 8, b: 9, op: '*' }, { hadError: true, timeMs: 5000 });
  }
  stats.recordAttempt({ a: 2, b: 2, op: '*' }, { hadError: true, timeMs: 1000 });

  const spots = stats.getTroubleSpots({ minAttempts: 3, limit: 10 });
  assert.strictEqual(spots.length, 1);
  assert.strictEqual(spots[0].key, stats.problemKey({ a: 8, b: 9, op: '*' }));
});

test('getTroubleSpots sorts by error rate then p90 time', () => {
  // Worst error rate.
  for (let i = 0; i < 4; i++) {
    stats.recordAttempt({ a: 7, b: 8, op: '*' }, { hadError: true, timeMs: 3000 });
  }
  // Lower error rate but still troublesome.
  stats.recordAttempt({ a: 6, b: 6, op: '*' }, { hadError: true, timeMs: 6000 });
  stats.recordAttempt({ a: 6, b: 6, op: '*' }, { hadError: false, timeMs: 6000 });
  stats.recordAttempt({ a: 6, b: 6, op: '*' }, { hadError: false, timeMs: 6000 });

  const spots = stats.getTroubleSpots({ minAttempts: 3, limit: 10 });
  assert.strictEqual(spots[0].key, stats.problemKey({ a: 7, b: 8, op: '*' }));
  assert.ok(spots[0].errorRate > spots[1].errorRate);
});

test('getAll returns every tracked fact, unfiltered by attempt threshold', () => {
  stats.recordAttempt({ a: 6, b: 7, op: '*' }, { hadError: true, timeMs: 3000 });
  stats.recordAttempt({ a: 2, b: 2, op: '*' }, { hadError: false, timeMs: 800 });

  const all = stats.getAll();
  const keys = Object.keys(all);
  assert.strictEqual(keys.length, 2);

  const sixSeven = all[stats.problemKey({ a: 7, b: 6, op: '*' })];
  assert.ok(sixSeven, 'expected 6x7 in getAll output');
  assert.strictEqual(sixSeven.label, '6 × 7');
  assert.strictEqual(sixSeven.attempts, 1);
});

test('rolling window keeps only the most recent samples', () => {
  for (let i = 1; i <= 25; i++) {
    stats.recordAttempt({ a: 3, b: 4, op: '*' }, { hadError: false, timeMs: i * 100 });
  }
  const spots = stats.getTroubleSpots({ minAttempts: 1, limit: 10 });
  const fact = spots.find(s => s.key === stats.problemKey({ a: 3, b: 4, op: '*' }));
  // Last 20 samples are 600..2500ms; p90 over those, not the early 100ms ones.
  assert.ok(fact.p90Ms >= 2000, `expected recent samples to dominate p90, got ${fact.p90Ms}`);
});
