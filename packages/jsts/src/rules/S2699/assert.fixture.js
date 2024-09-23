const {equal} = require('node:assert');
const assert = require('node:assert');

describe('node.js assert library test cases', () => {
  it('assert.<method>', () => { // Compliant
    equal(5, 5);
  });

  it('assert.<method>', () => { // Compliant
    assert.equal(5, 5);
  });

  it('equal', () => { // Noncompliant
    console.log(5);
  });
});
