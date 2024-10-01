// Test cases with Mocha

describe('foo', function () {
  it('should do something', function (done) {
    done();
  });
});

describe('foo', function () {
  // Reason: There is a bug in the code
  it.skip('should do something', function (done) {
    done();
  });
});

// Noncompliant@19 {{Remove this unit test or explain why it is ignored.}}

describe('foo', function () {
  it.skip('should do something', function (done) {
    //^^^^^^^
    done();
  });
});

// Noncompliant@28

describe('foo', function () {
  context.skip('foo', function () {
    it('should do something', function (done) {
      done();
    });
  });
});

// Noncompliant@37

describe.skip('foo', function () {
  it('should do something', function (done) {
    done();
  });
});
