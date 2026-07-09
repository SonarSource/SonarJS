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
 * Shared assertion detection used by rules that need to recognise assertion
 * calls and gate on the presence of an assertion library / test runner
 * (e.g. S2699 "tests should include assertions" and S8784 "assertions should
 * be inside test cases or hooks").
 *
 * This is intentionally distinct from `assertions.ts`, which extracts the
 * *structure* of an assertion (subject, predicate, comparison) for rules that
 * reason about assertion arguments. Here we only answer two yes/no questions:
 * "does this file use a supported assertion library?" and "is this node an
 * assertion call?".
 */
import type { Rule } from 'eslint';
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';
import * as Chai from './chai.js';
import * as Sinon from './sinon.js';
import * as Vitest from './vitest.js';
import * as Supertest from './supertest.js';
import * as Cypress from './cypress.js';
import { getParent } from './ancestor.js';
import { isIdentifier } from './ast.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from './module.js';
import { getFullyQualifiedNameTS, importsModuleTS } from './module-ts.js';

const ASSERTION_LIBRARIES = [
  'chai',
  'sinon',
  'vitest',
  'supertest',
  '@playwright/test',
  'assert',
  'assert/strict',
  'node:assert',
  'node:assert/strict',
  'uvu/assert',
];
// runners that expose assertion APIs as globals (no import required).
const GLOBAL_ASSERTION_DEPENDENCIES = ['jasmine', 'jest', 'cypress', '@playwright/test'];

const SUPPORTED_TEST_FRAMEWORK_IMPORTS = [
  '@jest/globals',
  '@playwright/test',
  'chai',
  'cypress',
  'jasmine',
  'jest',
  'mocha',
  'node:test',
  'sinon',
  'supertest',
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

const UVU_ASSERT_METHODS = new Set([
  'ok',
  'is',
  'is.not',
  'equal',
  'type',
  'instance',
  'match',
  'snapshot',
  'fixture',
  'throws',
  'unreachable',
  'not',
  'not.ok',
  'not.equal',
  'not.type',
  'not.instance',
  'not.match',
  'not.snapshot',
  'not.fixture',
  'not.throws',
]);

const JS_PLAYWRIGHT_EXPECT_POLL_FQN = '@playwright.test.expect.poll';
const TS_PLAYWRIGHT_EXPECT_POLL_FQN = '@playwright/test.expect.poll';
const JS_UVU_ASSERT_FQN_PREFIX = 'uvu.assert.';
const TS_UVU_ASSERT_FQN_PREFIX = 'uvu/assert.';

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

/**
 * Whether the linted file imports or the project depends on a supported
 * assertion library / test runner. Rules use this to avoid raising issues in
 * files that are not tests.
 */
export function hasSupportedAssertionLibrary(context: Rule.RuleContext): boolean {
  return importsOrDependsOnModule(context, ASSERTION_LIBRARIES, GLOBAL_ASSERTION_DEPENDENCIES);
}

export function hasSupportedTestFramework(context: Rule.RuleContext): boolean {
  return importsOrDependsOnModule(
    context,
    SUPPORTED_TEST_FRAMEWORK_IMPORTS,
    SUPPORTED_TEST_FRAMEWORK_DEPENDENCIES,
  );
}

type AssertionDetector = (context: Rule.RuleContext, node: estree.Node) => boolean;

/**
 * AST assertion detectors, classified by whether the assertion API can run
 * without a test runner. This is the single source of truth for the split:
 * {@link isAssertion} matches any detector, {@link isScriptCapableAssertion} only
 * the script-capable ones. A new library is one classified entry here, so the two
 * predicates can never drift apart.
 *
 * Script-capable — node `assert`, uvu `assert`, chai, sinon, supertest — are
 * ordinary libraries usable in a plain `node file.js`. Runner-bound — vitest,
 * cypress, global `expect*(...)` chains — only exist because a runner executes
 * the file.
 *
 * Classification is by library, not syntax: a chai `expect(x).to.equal(y)` is also
 * matched by the name-based global-`expect` detector (on the outer `.to.equal(...)`
 * call), so the script-capable Chai detector (on the inner `chai.expect(...)` call)
 * must be able to claim it — which it does, because `isScriptCapableAssertion`
 * checks the script-capable detectors directly.
 */
const SCRIPT_CAPABLE_DETECTORS: AssertionDetector[] = [
  Chai.isAssertion,
  Sinon.isAssertion,
  Supertest.isAssertion,
  isFunctionCallFromNodeAssert,
  isUvuAssertAssertion,
];

const RUNNER_BOUND_DETECTORS: AssertionDetector[] = [
  Vitest.isAssertion,
  (_context, node) => Cypress.isAssertion(node),
  (context, node) => node.type === 'CallExpression' && isGlobalExpectExpressionJS(context, node),
];

const ASSERTION_DETECTORS: AssertionDetector[] = [
  ...SCRIPT_CAPABLE_DETECTORS,
  ...RUNNER_BOUND_DETECTORS,
];

/**
 * Whether the given AST node is an assertion call, recognised across chai,
 * sinon, vitest, supertest, cypress, global `expect*(...)` chains and node
 * `assert`. Pure-AST: does not require type information.
 */
export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  return ASSERTION_DETECTORS.some(detect => detect(context, node));
}

/**
 * Whether `node` is an assertion from a library that runs in a plain script with
 * no test runner (node `assert`, uvu `assert`, chai, sinon, supertest). The
 * complement among assertions — vitest, cypress, global `expect` — is
 * "runner-bound". Callers deciding "is this runner-bound?" should test
 * `isAssertion(...) && !isScriptCapableAssertion(...)`.
 */
export function isScriptCapableAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  return SCRIPT_CAPABLE_DETECTORS.some(detect => detect(context, node));
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
 * Type-checker-aware counterpart of {@link isAssertion}, operating on TypeScript
 * AST nodes. Used when parser services are available to follow resolved types.
 */
export function isTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
  context?: Rule.RuleContext,
): boolean {
  return (
    isGlobalTSAssertion(services, node, context) ||
    isExtendedTSShouldAccess(node) ||
    Chai.isTSAssertion(services, node) ||
    Sinon.isTSAssertion(services, node) ||
    Supertest.isTSAssertion(services, node) ||
    isUvuAssertTSAssertion(services, node) ||
    Vitest.isTSAssertion(services, node) ||
    Cypress.isTSAssertion(node)
  );
}

function isExtendedTSShouldAccess(node: ts.Node): boolean {
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
 * - method is a chained property access with a method call (e.g., .toBe(), .toEqual(), .not.toBe())
 *
 * This mirrors the TypeScript isGlobalExpectExpression function logic.
 */
function isGlobalExpectExpressionJS(
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
  return isGlobalExpectCall(innerCall.callee) || isPlaywrightExpectPollCall(context, innerCall);
}

function isGlobalExpectCall(callee: estree.Expression | estree.Super): boolean {
  return callee.type === 'Identifier' && GLOBAL_EXPECT_NAMES.has(callee.name);
}

function isPlaywrightExpectPollCall(
  context: Rule.RuleContext,
  call: estree.CallExpression,
): boolean {
  const { callee } = call;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    !isIdentifier(callee.property, 'poll')
  ) {
    return false;
  }

  if (getFullyQualifiedName(context, callee) === JS_PLAYWRIGHT_EXPECT_POLL_FQN) {
    return true;
  }

  return (
    callee.object.type === 'Identifier' &&
    callee.object.name === 'expect' &&
    importsOrDependsOnModule(context, ['@playwright/test'], ['@playwright/test'])
  );
}

function isFunctionCallFromNodeAssert(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const fullyQualifiedName = getFullyQualifiedName(context, node);
  return fullyQualifiedName?.split('.')[0] === 'assert';
}

function isUvuAssertAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const fqn = getFullyQualifiedName(context, node);
  const method = fqn?.slice(JS_UVU_ASSERT_FQN_PREFIX.length);
  return (
    fqn?.startsWith(JS_UVU_ASSERT_FQN_PREFIX) === true &&
    method !== undefined &&
    UVU_ASSERT_METHODS.has(method)
  );
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

function isGlobalTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
  context?: Rule.RuleContext,
) {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const callExpressionNode = node as ts.CallExpression;
  // check for global expect
  if (isGlobalExpectExpression(services, callExpressionNode, context)) {
    return true;
  }
  return isFunctionCallFromNodeAssertTS(services, node);
}

function isGlobalExpectExpression(
  services: ParserServicesWithTypeInformation,
  node: ts.CallExpression,
  context?: Rule.RuleContext,
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
    isGlobalExpectCallTS(innerCallExpression.expression) ||
    isPlaywrightExpectPollCallTS(services, innerCallExpression, context)
  );
}

function isGlobalExpectCallTS(expression: ts.Expression): boolean {
  return ts.isIdentifier(expression) && GLOBAL_EXPECT_NAMES.has(expression.text);
}

function isPlaywrightExpectPollCallTS(
  services: ParserServicesWithTypeInformation,
  call: ts.CallExpression,
  context?: Rule.RuleContext,
): boolean {
  if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'poll') {
    return false;
  }

  if (getFullyQualifiedNameTS(services, call.expression) === TS_PLAYWRIGHT_EXPECT_POLL_FQN) {
    return true;
  }

  return (
    ts.isIdentifier(call.expression.expression) &&
    call.expression.expression.text === 'expect' &&
    (importsModuleTS(call.getSourceFile(), ['@playwright/test']) ||
      (context !== undefined &&
        importsOrDependsOnModule(context, ['@playwright/test'], ['@playwright/test'])))
  );
}

function isFunctionCallFromNodeAssertTS(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  const fqn = getFullyQualifiedNameTS(services, node);
  const root = fqn?.split('.')[0];
  return root === 'assert' || root === 'assert/strict';
}

function isUvuAssertTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  const fqn = getFullyQualifiedNameTS(services, node);
  const method = fqn?.slice(TS_UVU_ASSERT_FQN_PREFIX.length);
  return (
    fqn?.startsWith(TS_UVU_ASSERT_FQN_PREFIX) === true &&
    method !== undefined &&
    UVU_ASSERT_METHODS.has(method)
  );
}
