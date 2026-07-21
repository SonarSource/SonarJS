import { test } from 'vitest';

test.each([
  ['Alice', 'admin'],
  ['Bob', 'user'],
  ['Alice', 'admin'], // Noncompliant {{Remove this duplicate parameterized test case matching index 0, adding a redundant execution.}}
])('handles users', (name, role) => {
  expect(name).toBeDefined();
  expect(role).toBeDefined();
});
