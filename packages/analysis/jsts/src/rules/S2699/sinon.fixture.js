const sinon = require('sinon');
const { assert } = sinon;

describe('sinon test cases', () => {


  it('assert.<method>', () => { // Compliant
    assert.called(spy);
  });

  it('sinon.assert.<method>', () => { // Compliant
    sinon.assert.calledOnce(spy);
  });

  it('transitive assertion', () => { // Compliant
    check();
  });

  function check() {
    assert.called(spy);
  }

  it('no assertion', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    alert('msg');
  });
});
