/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type estree from 'estree';

/**
 * Test framework structural functions whose callbacks define test structure
 * rather than business logic. Covers: Mocha, Jest, Vitest, Jasmine, Node.js test runner.
 */
export const TEST_FRAMEWORK_STRUCTURE_FUNCTIONS = new Set([
  // Test suites
  'describe',
  'context', // Mocha alias for describe
  'suite', // Mocha TDD interface
  // Test cases
  'it',
  'test',
  'specify', // Mocha alias for it
  // Lifecycle hooks
  'before',
  'after',
  'beforeEach',
  'afterEach',
  'beforeAll', // Jest, Vitest
  'afterAll', // Jest, Vitest
  // Skipped tests (Mocha, Jest, Jasmine)
  'xdescribe',
  'xcontext',
  'xit',
  'xtest',
  // Focused tests (Mocha, Jest, Jasmine)
  'fdescribe',
  'fcontext',
  'fit',
  'ftest',
]);

/**
 * Checks if a CallExpression is a test framework structural function.
 * Handles both direct calls (describe()) and member expressions (describe.only()).
 */
export function isTestFrameworkCall(node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const { callee } = node;

  // Direct call: describe("test", () => {})
  if (callee.type === 'Identifier') {
    return TEST_FRAMEWORK_STRUCTURE_FUNCTIONS.has(callee.name);
  }

  // Member expression: describe.only("test", () => {}), test.skip("test", () => {}), etc.
  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    return TEST_FRAMEWORK_STRUCTURE_FUNCTIONS.has(callee.object.name);
  }

  return false;
}
