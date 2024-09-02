// Test cases with Jasmine

describe('foo', function() {
  it('should do something', function(done) {
    done();
  });
});

describe('foo', function() {
  // Reason: There is a bug in the code
  xit('should do something', function(done) { // Compliant
    done();
  });
});


describe('foo', function() {
  xit('should do something', function(done) { // Noncompliant {{Remove this unit test or explain why it is ignored.}}
//^^^
    done();
  });
});

describe('foo', function() {
  xcontext('foo', function() { // Noncompliant
    it('should do something', function(done) {
      done();
    });
  });
});

xdescribe('foo', function() { // Noncompliant
  it('should do something', function(done) {
    done();
  });
});
