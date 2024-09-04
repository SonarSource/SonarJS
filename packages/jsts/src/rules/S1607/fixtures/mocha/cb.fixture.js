// Test cases with Mocha

describe('foo', function() {
  it('should do something', function(done) {
    done();
  });
});

describe('foo', function() {
  // Reason: There is a bug in the code
  it.skip('should do something', function(done) { // Compliant
    done();
  });
});


describe('foo', function() {
  it.skip('should do something', function(done) { // Noncompliant {{Remove this unit test or explain why it is ignored.}}
//^^^^^^^
    done();
  });
});

describe('foo', function() {
  context.skip('foo', function() { // Noncompliant
    it('should do something', function(done) {
      done();
    });
  });
});

describe.skip('foo', function() { // Noncompliant
  it('should do something', function(done) {
    done();
  });
});