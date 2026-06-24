import { test, expect } from '@playwright/test';

// flagged: assertion at module top level
expect(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

test.describe('a suite', () => {
  // flagged: directly inside the test.describe body (runs at collection time)
  expect(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

  test('does a thing', async () => {
    expect(value).toBe(1); // Compliant
  });

  test.beforeEach(async () => {
    expect(value).toBe(0); // Compliant
  });
});

test.describe.only('a focused suite', () => {
  // flagged: modifier forms are still suite bodies
  expect(value).toBe(1); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
});
