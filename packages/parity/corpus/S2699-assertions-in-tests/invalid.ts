declare function require(moduleName: string): any;
declare function it(name: string, callback: () => void): void;

const chai = require('chai');

it('missing assertion', () => {
  const value = 1 + 1;
  value.toString();
});
