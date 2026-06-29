const sinon = require('sinon');

// flagged: sinon assertion at module top level
sinon.assert.calledOnce(spy); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

describe('sinon', () => {
  // flagged: directly in the describe body
  sinon.assert.calledWith(spy, 42); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

  it('checks the spy', () => {
    sinon.assert.calledOnce(spy); // Compliant
  });

  beforeEach(() => {
    sinon.assert.notCalled(spy); // Compliant
  });
});
