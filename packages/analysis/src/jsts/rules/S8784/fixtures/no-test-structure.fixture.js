'use strict';

// Approach 1 — a file with NO test structure (no describe/context/suite, no
// it/test/specify, no Playwright test/describe). The fate of a top-level assertion
// then depends entirely on its library:
//
//  * script-capable (node `assert`, chai, sinon, supertest) runs in a plain
//    `node file.js`, so a top-level assertion IS the test — a standalone smoke
//    test (e.g. jquery's `node_smoke_tests/document_missing.js`). NOT flagged.
//  * runner-bound (global `expect`, cypress `cy`) cannot exist without a runner
//    executing the file, so a top-level occurrence is genuinely misplaced even
//    with no describe/it anywhere (rspec example #1). STILL flagged — staying
//    silent here would be a false negative.
//
// chai's `expect` is aliased to `chaiExpect` so the bare `expect(...)` below is an
// unresolved global (runner-bound), not chai (script-capable).
const assert = require('node:assert');
const { expect: chaiExpect } = require('chai');
const sinon = require('sinon');
const supertest = require('supertest');

// --- script-capable: standalone-script semantics, not flagged ---
assert.throws(() => {
  factory({});
}, /requires a window/); // Compliant
assert.strictEqual(a, b); // Compliant
chaiExpect(value).to.equal(1); // Compliant
sinon.assert.calledOnce(spy); // Compliant
supertest(app).get('/').expect(200); // Compliant

// --- runner-bound: still flagged ---
expect(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
cy.get('.status').should('be.visible'); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}