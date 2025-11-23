const test = require('node:test');
const assert = require('node:assert');

const logic = require('../scripts/logic.js');

test('normalizeConfig sorts min and max values and coalesces ops', () => {
  const config = logic.normalizeConfig({
    min: 10,
    max: -5,
    count: 0,
    ops: ['x', '-', '*', '/'],
    mulMaxOperand: 8.9,
  });

  assert.strictEqual(config.min, -5);
  assert.strictEqual(config.max, 10);
  assert.strictEqual(config.count, 1);
  assert.deepStrictEqual(config.ops, ['-', '*', '/']);
  assert.strictEqual(config.mulMaxOperand, 8);
});

test('normalizeConfig uses default range and operations', () => {
  const config = logic.normalizeConfig({});

  assert.strictEqual(config.min, 0);
  assert.strictEqual(config.max, 30);
  assert.strictEqual(config.count, 1);
  assert.deepStrictEqual(config.ops, ['+', '-', '*']);
  assert.strictEqual(config.mulMaxOperand, 6);
});

test('normalizeConfig enforces minimum multiplication operand limit', () => {
  const config = logic.normalizeConfig({ mulMaxOperand: -3 });
  assert.strictEqual(config.mulMaxOperand, 1);
});

test('generateQuestions creates the requested number of questions', () => {
  const { questions, config } = logic.generateQuestions({
    min: 0,
    max: 5,
    count: 5,
    ops: ['+'],
  });

  assert.strictEqual(questions.length, 5);
  assert.strictEqual(config.count, 5);
  questions.forEach(q => {
    assert.strictEqual(typeof q.a, 'number');
    assert.strictEqual(typeof q.b, 'number');
    assert.strictEqual(typeof q.ans, 'number');
    assert.strictEqual(q.ans >= config.min && q.ans <= config.max, true);
  });
});

test('createQuestion falls back to range when subtraction would underflow', () => {
  const question = logic.createQuestion('-', 0, 2);
  assert.ok(question.ans >= 0);
  assert.ok(question.ans <= 2);
  assert.ok(question.a >= question.b);
});

test('generateQuestions subtraction questions obey configured range', () => {
  const { questions, config } = logic.generateQuestions({
    min: 0,
    max: 10,
    count: 20,
    ops: ['-'],
  });

  assert.strictEqual(config.min, 0);
  assert.strictEqual(config.max, 10);
  questions.forEach(q => {
    assert.ok(q.ans >= config.min, 'answer below minimum');
    assert.ok(q.ans <= config.max, 'answer above maximum');
    assert.ok(q.a >= q.b, 'min constraint violated for subtraction');
  });
});

test('generateQuestions multiplication questions obey configured range', () => {
  const { questions, config } = logic.generateQuestions({
    min: 0,
    max: 10,
    count: 20,
    ops: ['*'],
    mulMaxOperand: 3,
  });

  assert.strictEqual(config.min, 0);
  assert.strictEqual(config.max, 10);
  assert.strictEqual(config.mulMaxOperand, 3);
  questions.forEach(q => {
    assert.strictEqual(q.op, '*');
    assert.ok(Number.isInteger(q.a));
    assert.ok(Number.isInteger(q.b));
    assert.ok(q.a >= 1 && q.a <= config.mulMaxOperand, 'operand a outside multiplication limit');
    assert.ok(q.b >= 1 && q.b <= config.mulMaxOperand, 'operand b outside multiplication limit');
    assert.strictEqual(q.a * q.b, q.ans);
    assert.notStrictEqual(q.a, 0);
    assert.notStrictEqual(q.b, 0);
  });
});

test('operands are non-zero for supported operations', () => {
  const { questions } = logic.generateQuestions({
    min: 0,
    max: 12,
    count: 50,
    ops: ['+', '-', '*', '/'],
    mulMaxOperand: 4,
  });

  questions.forEach(q => {
    assert.notStrictEqual(q.a, 0, 'operand a should not be zero');
    assert.notStrictEqual(q.b, 0, 'operand b should not be zero');
  });
});

test('generateQuestions division questions obey configured range', () => {
  const { questions, config } = logic.generateQuestions({
    min: 0,
    max: 12,
    count: 20,
    ops: ['/'],
  });

  assert.strictEqual(config.min, 0);
  assert.strictEqual(config.max, 12);
  questions.forEach(q => {
    assert.strictEqual(q.op, '/');
    assert.notStrictEqual(q.b, 0);
    assert.notStrictEqual(q.a, 0);
    assert.ok(Number.isInteger(q.a));
    assert.ok(Number.isInteger(q.b));
    assert.ok(q.ans >= config.min, 'answer below minimum');
    assert.ok(q.ans <= config.max, 'answer above maximum');
    assert.strictEqual(q.a / q.b, q.ans);
  });
});
