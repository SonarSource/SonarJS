const { expect } = require('chai');
const assert = require('node:assert');

// --- NONCOMPLIANT: module top level (runs at file load) ---
expect(config.enabled).to.equal(true); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
assert.strictEqual(a, b); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

// --- NONCOMPLIANT: directly inside describe / context / suite bodies ---
describe('user service', () => {
  expect(config.enabled).to.equal(true); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
});

context('a context', () => {
  expect(x).to.equal(y); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
});

suite('a tdd suite', () => {
  expect(x).to.equal(y); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
});

describe('function-expression callback', function () {
  expect(a).to.equal(b); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
});

// --- NONCOMPLIANT: control flow is not a function boundary ---
describe('control flow', () => {
  if (cond) {
    expect(a).to.equal(b); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  }
  for (const t of cases) {
    assert.ok(t); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  }
});

// --- NONCOMPLIANT: nested describes, assertion in the inner describe body ---
describe('outer', () => {
  describe('inner', () => {
    expect(x).to.equal(y); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  });
});

// --- NONCOMPLIANT: callback as the only argument, and modifier forms ---
describe(() => {
  expect(x).to.equal(y); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
});

describe.only('focused', () => {
  expect(x).to.equal(y); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
});

// --- COMPLIANT: inside a test case ---
describe('with test cases', () => {
  it('does a thing', () => {
    expect(config.enabled).to.equal(true); // Compliant
  });
  test('a test', () => {
    expect(x).to.equal(y); // Compliant
  });
  specify('a spec', () => {
    expect(x).to.equal(y); // Compliant
  });
});

// --- COMPLIANT: inside a lifecycle hook ---
describe('with hooks', () => {
  beforeEach(() => {
    expect(a).to.equal(b); // Compliant
  });
  afterAll(() => {
    expect(a).to.equal(b); // Compliant
  });
});

// --- COMPLIANT: inside any other function (conservative — cannot prove it runs outside a test) ---
describe('with helpers', () => {
  [1, 2].forEach(() => {
    expect(a).to.equal(b); // Compliant
  });
  const helper = () => {
    expect(a).to.equal(b); // Compliant
  };
  helper();
  (function () {
    expect(a).to.equal(b); // Compliant
  })();
});

function topLevelHelper() {
  expect(a).to.equal(b); // Compliant
}

// --- COMPLIANT: assertion is not a standalone statement (helper-builder patterns) ---
describe('not a statement', () => {
  const result = expect(x).to.equal(y); // Compliant
  wrapper(expect(x).to.equal(y)); // Compliant - the statement is wrapper(...), the assertion is an argument
});

// --- COMPLIANT (known limitation): concise arrow body has no statement, so it is not flagged ---
describe('concise body', () => expect(x).to.equal(y)); // Compliant

// --- DEDUPE: a single chained assertion is reported at most once ---
expect(value).to.have.property('name').that.equals('x'); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
