const { expect } = require('chai');

// flagged: a genuine top-level assertion is still reported here
expect(top).to.equal(level); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

// A locally-defined `describe` is not the framework construct, so assertions in
// its callback must NOT be flagged (isMochaTestConstruct rejects local bindings).
function describe(name, cb) {
  cb();
}

describe('not a real suite', () => {
  expect(x).to.equal(y); // Compliant
});
