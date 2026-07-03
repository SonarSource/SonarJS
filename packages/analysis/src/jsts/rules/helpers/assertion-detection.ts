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
import { getFullyQualifiedName, importsOrDependsOnModule } from './module.js';
import { getFullyQualifiedNameTS } from './module-ts.js';

const ASSERTION_LIBRARIES = [
  'chai',
  'sinon',
  'vitest',
  'supertest',
  '@playwright/test',
  'assert',
  'node:assert',
];
// runners that expose assertion APIs as globals (no import required).
const GLOBAL_ASSERTION_DEPENDENCIES = ['jasmine', 'jest', 'cypress', '@playwright/test'];

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

/**
 * Whether the linted file imports or the project depends on a supported
 * assertion library / test runner. Rules use this to avoid raising issues in
 * files that are not tests.
 */
export function hasSupportedAssertionLibrary(context: Rule.RuleContext): boolean {
  return importsOrDependsOnModule(context, ASSERTION_LIBRARIES, GLOBAL_ASSERTION_DEPENDENCIES);
}

type AssertionDetector = (context: Rule.RuleContext, node: estree.Node) => boolean;

/**
 * AST assertion detectors, classified by whether the assertion API can run
 * without a test runner. This is the single source of truth for the split:
 * {@link isAssertion} matches any detector, {@link isScriptCapableAssertion} only
 * the script-capable ones. A new library is one classified entry here, so the two
 * predicates can never drift apart.
 *
 * Script-capable — node `assert`, chai, sinon, supertest — are ordinary libraries
 * usable in a plain `node file.js`. Runner-bound — vitest, cypress, global
 * `expect*(...)` chains — only exist because a runner executes the file.
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
];

const RUNNER_BOUND_DETECTORS: AssertionDetector[] = [
  Vitest.isAssertion,
  (_context, node) => Cypress.isAssertion(node),
  (_context, node) => node.type === 'CallExpression' && isGlobalExpectExpressionJS(node),
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
 * no test runner (node `assert`, chai, sinon, supertest). The complement among
 * assertions — vitest, cypress, global `expect` — is "runner-bound". Callers
 * deciding "is this runner-bound?" should test
 * `isAssertion(...) && !isScriptCapableAssertion(...)`.
 */
export function isScriptCapableAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  return SCRIPT_CAPABLE_DETECTORS.some(detect => detect(context, node));
}

/**
 * Bare Chai `foo.should` property reads are not assertions on their own.
 * We exclude them so S2699 does not treat an incomplete `should` chain as an assertion
 * and miss the "Add at least one assertion to this test case." issue.
 */
export function isStandaloneShouldAccess(context: Rule.RuleContext, node: estree.Node): boolean {
  if (!isShouldMember(node)) {
    return false;
  }
  const parent = getParent(context, node);
  return !isExtendingShouldChainParent(parent, node);
}

/**
 * Type-checker-aware counterpart of {@link isAssertion}, operating on TypeScript
 * AST nodes. Used when parser services are available to follow resolved types.
 */
export function isTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node): boolean {
  return (
    isGlobalTSAssertion(services, node) ||
    isExtendedTSShouldAccess(node) ||
    Chai.isTSAssertion(services, node) ||
    Sinon.isTSAssertion(services, node) ||
    Supertest.isTSAssertion(services, node) ||
    Vitest.isTSAssertion(services, node) ||
    Cypress.isTSAssertion(node)
  );
}

function isExtendedTSShouldAccess(node: ts.Node): boolean {
  return (
    isTSShouldAccess(node) &&
    isChaiImported(node.getSourceFile()) &&
    isTSExtendingShouldChainParent(node.parent, node)
  );
}

function isTSShouldAccess(node: ts.Node): node is ts.PropertyAccessExpression {
  return ts.isPropertyAccessExpression(node) && node.name.text === 'should';
}

function isTSExtendingShouldChainParent(parent: ts.Node | undefined, node: ts.Node): boolean {
  if (
    parent === undefined ||
    !ts.isPropertyAccessExpression(parent) ||
    parent.expression !== node
  ) {
    return false;
  }
  const grandparent = parent.parent;
  return (
    (ts.isPropertyAccessExpression(grandparent) && grandparent.expression === parent) ||
    (ts.isCallExpression(grandparent) && grandparent.expression === parent)
  );
}

const chaiImportCache = new WeakMap<ts.SourceFile, boolean>();
function isChaiImported(sourceFile: ts.SourceFile): boolean {
  const cached = chaiImportCache.get(sourceFile);
  if (cached !== undefined) {
    return cached;
  }
  const result = sourceFile.statements.some(statement => {
    if (ts.isImportDeclaration(statement)) {
      return (
        ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === 'chai'
      );
    }
    return (
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(declaration =>
        isChaiRequireInitializer(declaration.initializer),
      )
    );
  });
  chaiImportCache.set(sourceFile, result);
  return result;
}

function isChaiRequireInitializer(initializer: ts.Expression | undefined): boolean {
  if (initializer === undefined) {
    return false;
  }
  if (ts.isPropertyAccessExpression(initializer)) {
    return isChaiRequireInitializer(initializer.expression);
  }
  return (
    ts.isCallExpression(initializer) &&
    ts.isIdentifier(initializer.expression) &&
    initializer.expression.text === 'require' &&
    initializer.arguments[0] !== undefined &&
    ts.isStringLiteral(initializer.arguments[0]) &&
    initializer.arguments[0].text === 'chai'
  );
}

/**
 * Checks if the node matches the pattern expectX(...).method() where:
 * - expectX is one of the known global expect entry points ({@link GLOBAL_EXPECT_NAMES})
 * - method is a chained property access with a method call (e.g., .toBe(), .toEqual(), .not.toBe())
 *
 * This mirrors the TypeScript isGlobalExpectExpression function logic.
 */
function isGlobalExpectExpressionJS(node: estree.CallExpression): boolean {
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
  return innerCall.callee.type === 'Identifier' && GLOBAL_EXPECT_NAMES.has(innerCall.callee.name);
}

function isFunctionCallFromNodeAssert(context: Rule.RuleContext, node: estree.Node): boolean {
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

function isExtendingShouldChainParent(
  parent: estree.Node | undefined,
  node: estree.MemberExpression,
): boolean {
  return (
    (parent?.type === 'MemberExpression' && parent.object === node) ||
    (parent?.type === 'CallExpression' && parent.callee === node)
  );
}

function isGlobalTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node) {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const callExpressionNode = node as ts.CallExpression;
  // check for global expect
  if (isGlobalExpectExpression(callExpressionNode)) {
    return true;
  }
  return isFunctionCallFromNodeAssertTS(services, node);
}

function isGlobalExpectExpression(node: ts.CallExpression) {
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
    innerCallExpression.expression.kind === ts.SyntaxKind.Identifier &&
    GLOBAL_EXPECT_NAMES.has((innerCallExpression.expression as ts.Identifier).text)
  );
}

function isFunctionCallFromNodeAssertTS(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  const fqn = getFullyQualifiedNameTS(services, node);
  return fqn?.split('.')[0] === 'assert';
}
