/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

/**
 * Low-level assertion detector primitives used by the framework catalog.
 *
 * This is intentionally distinct from `assertions.ts`, which extracts the
 * *structure* of an assertion (subject, predicate, comparison) for rules that
 * reason about assertion arguments. Framework selection and rule-specific
 * interpretation live in `assertion-frameworks.ts`.
 */
import type { Rule } from 'eslint';
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';
import * as Playwright from './playwright.js';
import * as Vitest from './vitest.js';
import { getParent } from './ancestor.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from './module.js';
import { getFullyQualifiedNameTS, importsModuleTS } from './module-ts.js';

const SUPPORTED_TEST_FRAMEWORK_IMPORTS = [
  '@jest/globals',
  '@playwright/test',
  'chai',
  'cypress',
  'jasmine',
  'jest',
  'mocha',
  'bun:test',
  'node:test',
  'sinon',
  'supertest',
  'uvu',
  'vitest',
];

const SUPPORTED_TEST_FRAMEWORK_DEPENDENCIES = [
  '@jest/globals',
  '@playwright/test',
  'chai',
  'cypress',
  'jasmine',
  'jasmine-core',
  'jasmine-node',
  'jest',
  'karma-jasmine',
  'mocha',
  'sinon',
  'supertest',
  'uvu',
  'vitest',
];

// Known global `expect*(...)` entry points: the universal `expect`, rxjs marble
// testing's `expectObservable`/`expectSubscriptions`, and vitest's `expectTypeOf`.
// Matched by exact name (not an `expect`-prefix) so unrelated identifiers such as
// `expectation(...)` or `expected(...)` in production code are not treated as
// assertions.
const GLOBAL_EXPECT_NAMES = new Set([
  'expect',
  'expectObservable',
  'expectSubscriptions',
  'expectTypeOf',
]);

const CHAI_NON_TERMINAL_PROPERTY_NAMES = new Set([
  'all',
  'also',
  'and',
  'any',
  'at',
  'be',
  'been',
  'but',
  'deep',
  'does',
  'have',
  'has',
  'is',
  'itself',
  'nested',
  'not',
  'of',
  'ordered',
  'own',
  'same',
  'still',
  'that',
  'to',
  'which',
  'with',
]);

const CHAI_TERMINAL_PROPERTY_NAMES = new Set([
  'Arguments',
  'NaN',
  'arguments',
  'empty',
  'exist',
  'extensible',
  'false',
  'finite',
  'frozen',
  'null',
  'ok',
  'sealed',
  'true',
  'undefined',
]);

export function hasSupportedTestFramework(context: Rule.RuleContext): boolean {
  return importsOrDependsOnModule(
    context,
    SUPPORTED_TEST_FRAMEWORK_IMPORTS,
    SUPPORTED_TEST_FRAMEWORK_DEPENDENCIES,
  );
}

// All FQN roots whose calls are compile-time-only type checks: Vitest's
// `expectTypeOf`/`assertType` and the standalone `expect-type` package's
// `expectTypeOf` (which Vitest uses internally and may be imported directly).
const TYPE_LEVEL_ASSERTION_ROOTS = [...Vitest.TYPE_LEVEL_ROOTS, 'expect-type.expectTypeOf'];

/**
 * Whether `node` is a compile-time-only type check that must not be flagged for
 * placement outside a test case.
 */
export function isTypeLevelAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const fqn = getFullyQualifiedName(context, node);
  return (
    fqn !== null &&
    TYPE_LEVEL_ASSERTION_ROOTS.some(root => fqn === root || fqn.startsWith(`${root}.`))
  );
}

/**
 * Incomplete Chai `foo.should` property chains are not assertions on their own.
 * We exclude them so S2699 does not treat an unfinished `should` chain as an assertion
 * and miss the "Add at least one assertion to this test case." issue.
 */
export function isIncompleteShouldAccess(context: Rule.RuleContext, node: estree.Node): boolean {
  if (!isShouldMember(node)) {
    return false;
  }
  return !isCompleteESTreeShouldPropertyChain(context, node);
}

/**
 * Whether a typed Chai `should` property access ends in a complete assertion.
 */
export function isChaiShouldTSAssertion(node: ts.Node): boolean {
  return (
    isTSShouldAccess(node) &&
    importsModuleTS(node.getSourceFile(), ['chai']) &&
    isCompleteTSShouldPropertyChain(node)
  );
}

function isTSShouldAccess(node: ts.Node): node is ts.PropertyAccessExpression {
  return ts.isPropertyAccessExpression(node) && node.name.text === 'should';
}

/**
 * Checks if the node matches the pattern expectX(...).method() where:
 * - expectX is one of the known global expect entry points ({@link GLOBAL_EXPECT_NAMES})
 *   or a Playwright `expect(...)` entry point
 * - method is a chained property access with a method call (e.g., .toBe(), .toEqual(), .not.toBe())
 *
 * This mirrors the TypeScript isGlobalExpectExpression function logic.
 */
export function isGlobalExpectAssertion(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): boolean {
  if (node.callee.type !== 'MemberExpression') {
    return false;
  }

  // Walk up the chain of member expressions to find the innermost call expression
  // This handles: expect(...).toBe() as well as expect(...).not.toBe()
  // Also handles: expectObservable(...).toBe(...), expectSubscriptions(...).toBe(...), etc.
  let current: estree.Expression | estree.Super = node.callee.object;
  while (current.type === 'MemberExpression') {
    current = current.object;
  }

  if (current.type !== 'CallExpression') {
    return false;
  }

  const innerCall = current;
  return (
    (innerCall.callee.type === 'Identifier' && GLOBAL_EXPECT_NAMES.has(innerCall.callee.name)) ||
    Playwright.isExpectFqn(getFullyQualifiedName(context, innerCall.callee))
  );
}

/**
 * Whether `node` is a call rooted at the node `assert` module — `assert(...)` itself or any of its
 * methods. Pure-AST counterpart of {@link isNodeAssertTSAssertion}.
 */
export function isNodeAssertAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const fullyQualifiedName = getFullyQualifiedName(context, node);
  return fullyQualifiedName?.split('.')[0] === 'assert';
}

function isShouldMember(node: estree.Node): node is estree.MemberExpression {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'should'
  );
}

function isCompleteESTreeShouldPropertyChain(
  context: Rule.RuleContext,
  node: estree.MemberExpression,
): boolean {
  let current: estree.Node = node;
  let parent = getParent(context, node);

  while (isESTreeChaiShouldChainContinuation(parent, current)) {
    const grandparent = getParent(context, parent);
    if (isESTreeCallOnNode(grandparent, parent)) {
      return true;
    }
    if (CHAI_TERMINAL_PROPERTY_NAMES.has(parent.property.name)) {
      if (!isESTreeChaiShouldChainContinuation(grandparent, parent)) {
        return true;
      }
      current = parent;
      parent = grandparent;
      continue;
    }
    if (
      !CHAI_NON_TERMINAL_PROPERTY_NAMES.has(parent.property.name) &&
      !isESTreeChaiShouldChainContinuation(grandparent, parent)
    ) {
      return false;
    }
    current = parent;
    parent = grandparent;
  }

  return false;
}

function isCompleteTSShouldPropertyChain(node: ts.PropertyAccessExpression): boolean {
  let current: ts.Node = node;
  let parent = node.parent;

  while (isTSChaiShouldChainContinuation(parent, current)) {
    const grandparent = parent.parent;
    if (isTSCallOnNode(grandparent, parent)) {
      return true;
    }
    if (CHAI_TERMINAL_PROPERTY_NAMES.has(parent.name.text)) {
      if (!isTSChaiShouldChainContinuation(grandparent, parent)) {
        return true;
      }
      current = parent;
      parent = grandparent;
      continue;
    }
    if (
      !CHAI_NON_TERMINAL_PROPERTY_NAMES.has(parent.name.text) &&
      !isTSChaiShouldChainContinuation(grandparent, parent)
    ) {
      return false;
    }
    current = parent;
    parent = grandparent;
  }

  return false;
}

function isESTreeCallOnNode(
  parent: estree.Node | undefined,
  node: estree.Node,
): parent is estree.CallExpression {
  return parent?.type === 'CallExpression' && parent.callee === node;
}

function isTSCallOnNode(parent: ts.Node | undefined, node: ts.Node): parent is ts.CallExpression {
  return parent !== undefined && ts.isCallExpression(parent) && parent.expression === node;
}

function isESTreeChaiShouldChainContinuation(
  parent: estree.Node | undefined,
  node: estree.Node,
): parent is estree.MemberExpression & { property: estree.Identifier } {
  return (
    parent?.type === 'MemberExpression' &&
    parent.object === node &&
    !parent.computed &&
    parent.property.type === 'Identifier'
  );
}

function isTSChaiShouldChainContinuation(
  parent: ts.Node | undefined,
  node: ts.Node,
): parent is ts.PropertyAccessExpression {
  return (
    parent !== undefined && ts.isPropertyAccessExpression(parent) && parent.expression === node
  );
}

/**
 * Type-checker-aware counterpart of {@link isGlobalExpectAssertion}: a resolved global
 * `expect*(...)` chain. Node `assert` is deliberately not covered here — it is its own catalog
 * entry, {@link isNodeAssertTSAssertion}.
 */
export function isGlobalTSExpectAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
) {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const callExpressionNode = node as ts.CallExpression;
  return isGlobalExpectExpression(services, callExpressionNode);
}

function isGlobalExpectExpression(
  services: ParserServicesWithTypeInformation,
  node: ts.CallExpression,
) {
  if (node.expression.kind !== ts.SyntaxKind.PropertyAccessExpression) {
    return false;
  }

  // Walk up the chain of property accesses to find the innermost call expression
  // This handles: expect(...).toHaveBeenCalled() as well as expect(...).not.toHaveBeenCalled()
  // Also handles: expectObservable(...).toBe(...), expectSubscriptions(...).toBe(...), etc.
  let current: ts.Expression = (node.expression as ts.PropertyAccessExpression).expression;
  while (current.kind === ts.SyntaxKind.PropertyAccessExpression) {
    current = (current as ts.PropertyAccessExpression).expression;
  }

  if (current.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }

  const innerCallExpression = current as ts.CallExpression;
  return (
    (innerCallExpression.expression.kind === ts.SyntaxKind.Identifier &&
      GLOBAL_EXPECT_NAMES.has((innerCallExpression.expression as ts.Identifier).text)) ||
    Playwright.isExpectFqn(getFullyQualifiedNameTS(services, innerCallExpression.expression))
  );
}

/**
 * Type-checker-aware counterpart of {@link isNodeAssertAssertion}, also accepting the
 * `assert/strict` entry point.
 */
export function isNodeAssertTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  const fqn = getFullyQualifiedNameTS(services, node);
  const root = fqn?.split('.')[0];
  return root === 'assert' || root === 'assert/strict';
}
