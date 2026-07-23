import { test } from 'vitest';

test.each([
  ['Alice', 'admin'],
  //^^^^^^^^^^^^^^^^^^> {{Original test case.}}
  ['Bob', 'user'],
  ['Alice', 'admin'], // Noncompliant {{Remove this duplicate test case.}}
])('handles users', (name, role) => {
  expect(name).toBeDefined();
  expect(role).toBeDefined();
});
