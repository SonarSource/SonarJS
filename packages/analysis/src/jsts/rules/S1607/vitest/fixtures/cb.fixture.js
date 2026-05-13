// Test cases with Vitest

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

test.skip('should do something', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

it.skip('should do something', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

describe.skip('foo', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

suite.skip('foo', function() {});

// Reason: There is a bug in the code
suite.skip('foo', function() {});
