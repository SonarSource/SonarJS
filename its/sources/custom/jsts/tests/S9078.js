import { test } from 'vitest';

test.each([
  ['Alice', 'admin'],
  ['Bob', 'user'],
  ['Alice', 'admin'], // Noncompliant {{Remove this duplicate test case; it matches the case at index 0.}}
])('handles users', (name, role) => {
  expect(name).toBeDefined();
  expect(role).toBeDefined();
});
