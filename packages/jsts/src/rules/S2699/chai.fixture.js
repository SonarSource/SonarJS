const chai = require('chai');
const { assert, expect, should } = chai;

should();

describe('test cases', () => {
  it('no assertion', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    alert('msg');
  });

  it('no transitive assertion', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    nocheck();
  });

  it.skip('non compliant', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    alert('msg');
  });

  it.only('non compliant', () => { // Noncompliant {{Add at least one assertion to this test case.}}
    alert('msg');
  });

  function nocheck() {
    alert('msg');
  }

  it('foo') // missing callback
});

describe('chai test cases', () => {
  it('expect', () => { // Compliant
    expect(1).to.equal(2);
  });

  it('chai.expect', () => { // Compliant
    chai.expect(1).to.equal(2);
  });

  it('assert', () => { // Compliant
    assert([] !== [2]);
  });

  it('chai.assert', () => { // Compliant
    chai.assert([] !== [2]);
  });

  it('assert.<method>', () => { // Compliant
    assert.equal(1, 2);
  });

  it('chai.assert.<method>', () => { // Compliant
    chai.assert.equal(1, 2);
  });

  it('should', () => { // Compliant
    'foo'.should.equal('bar');
  });

  it('transitive assertion', () => { // Compliant
    check();
  });

  function check() {
    expect(1).to.equal(2);
  }
});
