declare function require(moduleName: string): any;
declare function it(name: string, callback: (done: (error?: unknown) => void) => void): void;

const chai = require('chai');

function verify(value: number) {
  chai.expect(value).to.equal(2);
}

it('delegates assertion', () => {
  verify(1 + 1);
});

it('uses done', done => {
  done(new Error('boom'));
});
