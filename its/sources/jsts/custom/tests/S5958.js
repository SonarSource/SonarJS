const expect = require("chai").expect;
const fs = require("fs");

describe("exceptions are not tested properly", function() {
  const funcThrows = function () { throw new TypeError('What is this type?'); };
  const funcNoThrow = function () { /*noop*/ };

  it("forgot to pass the error to 'done()'", function(done) {
    fs.readFile("/etc/zshrc", 'utf8', function(err, data) {
      try {
        expect(data).to.match(/some expected string/);
      } catch (e) {  // Noncompliant {{Either the exception should be passed to "done(e)", or the exception should be tested further.}}
        //           ^
        done();
      }
    });
  });

  it("does not 'expect' a specific exception", function() {
    expect(funcThrows).to.throw();  // Noncompliant {{Assert more concrete exception type or assert the message of exception.}}
    //                    ^^^^^
    // Error is not precise enough
    expect(funcThrows).to.throw(Error);  // Noncompliant  {{Assert more concrete exception type or assert the message of exception.}}
    expect(funcNoThrow).to.not.throw(Error);  // Noncompliant. {{Assert more concrete exception type or assert the message of exception.}}
  });
});
