const { expect } = require('chai');

// The only `describe`/`it` in this file are LOCALLY defined, so the file has no
// real test structure: isMochaTestConstruct rejects local bindings — both when
// deciding "is this a suite callback?" and "does the file have test structure?".
// A script-capable (chai) top-level assertion is therefore treated as a standalone
// script and is NOT flagged. This pins that both gates reuse isMochaTestConstruct,
// not a naive "is there an identifier named `describe`/`it`".
expect(top).to.equal(level); // Compliant

function describe(name, cb) {
  cb();
}
function it(name, cb) {
  cb();
}

describe('not a real suite', () => {
  it('not a real test', () => {
    expect(x).to.equal(y); // Compliant
  });
});

// A locally-defined `test` must not count as Playwright test structure either: a
// bare `test(...)` is only recognised when its base binds to `@playwright/test`,
// never by name. Otherwise this unrelated local `test()` would flip the whole-file
// flag and wrongly flag the script-capable top-level assertion above.
function test(name, cb) {
  cb();
}
test('not a real test', () => {
  expect(x).to.equal(y); // Compliant
});

// A runner-bound assertion cannot come from a local binding — its presence proves
// a runner is executing the file — so it is still flagged even with no real test
// structure.
cy.get('.app').should('exist'); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}