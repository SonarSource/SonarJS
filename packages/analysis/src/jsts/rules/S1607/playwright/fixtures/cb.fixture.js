// Test cases with Playwright

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

test.skip('should do something', async () => {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

test.describe.skip('foo', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

test.describe.parallel.skip('foo', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

test.describe.serial.skip('foo', function() {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

test.skip(`should do something`, async () => {});

// Noncompliant@+2 {{Remove this unit test or explain why it is ignored.}}

test.describe.skip(`foo ${suffix}`, function() {});

test.skip(({ browserName }) => browserName === 'firefox', 'reason');

test.skip(browserName === 'firefox', 'reason');

// Reason: There is a bug in the code
test.skip('should do something', async () => {});
