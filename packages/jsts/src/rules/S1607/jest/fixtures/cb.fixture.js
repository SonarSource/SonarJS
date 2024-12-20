// Test cases with Jest

describe('foo', function() {
  it('should do something', function(done) {
    done();
  });
});

describe('foo', function() {
  // Reason: There is a bug in the code
  it.skip('should do something', function(done) {
    done();
  });
});

// Noncompliant@19 {{Remove this unit test or explain why it is ignored.}}

describe('foo', function() {
  it.skip('should do something', function(done) {
//^^^^^^^
    done();
  });
});

// Noncompliant@28 {{Remove this unit test or explain why it is ignored.}}

describe('foo', function() {
  test.skip('should do something', function(done) {
    done();
  });
});

// Noncompliant@35 {{Remove this unit test or explain why it is ignored.}}

describe.skip('foo', function() {
  it('should do something', function(done) {
    done();
  });
});

// Noncompliant@44 {{Remove this unit test or explain why it is ignored.}}

describe('foo', function() {
  xit('should do something', function(done) {
    done();
  });
});

// Noncompliant@52 {{Remove this unit test or explain why it is ignored.}}

describe('foo', function() {
  xtest('should do something', function(done) {
    done();
  });
});

// Noncompliant@59 {{Remove this unit test or explain why it is ignored.}}

xdescribe('foo', function() {
  it('should do something', function(done) {
    done();
  });
});
