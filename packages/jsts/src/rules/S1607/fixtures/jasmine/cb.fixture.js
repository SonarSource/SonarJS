// Test cases with Jasmine

describe('foo', function() {
  it('should do something', function(done) {
    done();
  });
});

describe('foo', function() {
  // Reason: There is a bug in the code
  xit('should do something', function(done) {
    done();
  });
});

describe('foo', function() {
  xit('should do something', function(done) { // Reason: There is a bug in the code
    done();
  });
});

describe('foo', function() {
  xit('should do something', function(done) {
    // Reason: There is a bug in the code
    done();
  });
});

// Noncompliant@32 {{Remove this unit test or explain why it is ignored.}}

describe('foo', function() {
  xit('should do something', function(done) {
//^^^
    done();
  });
});

// Noncompliant@41

describe('foo', function() {
  xcontext('foo', function() {
    it('should do something', function(done) {
      done();
    });
  });
});

// Noncompliant@50

xdescribe('foo', function() {
  it('should do something', function(done) {
    done();
  });
});

// Noncompliant@60

describe('foo', function() {
  //
  xit('should do something', function(done) {
    done();
  });
});
