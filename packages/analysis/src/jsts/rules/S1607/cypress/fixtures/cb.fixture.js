// Test cases with Cypress

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

describe.skip('foo', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

it.skip('should do something', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

context.skip('foo', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

specify.skip('should do something', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

xdescribe('foo', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

xit('should do something', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

xcontext('foo', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

xspecify('should do something', function() {});

// Reason: There is a bug in the code
context.skip('foo', function() {});

// Reason: There is a bug in the code
xspecify('should do something', function() {});
