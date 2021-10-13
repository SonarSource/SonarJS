import {expect} from 'chai';

describe('test suite', () => {

  it('unexpected timeout disabling', () => {
    this.timeout(2147483648); // Noncompliant
    //           ^^^^^^^^^^
  });

  it('expected timeout disabling', () => {
    this.timeout(0); // Compliant
  });

  it('expected timeout', () => {
    this.timeout(2147483647); // Compliant
  });
});

it('coverage', () => {
  this.timeout();
  timeout(2147483648);
});
this.timeout('coverage');
