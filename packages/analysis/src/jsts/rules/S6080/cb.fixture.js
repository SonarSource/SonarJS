import {expect} from 'chai';

describe('test suite', () => {

  it('unexpected timeout disabling', () => {
    this.timeout(2147483648); // Noncompliant {{Set this timeout to 0 if you want to disable it, otherwise use a value lower than 2147483648.}}
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
