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

/**
 * Whether the linted file imports or the project depends on a supported
 * assertion library / test runner. Rules use this to avoid raising issues in
 * files that are not tests.
 */
export function hasSupportedAssertionLibrary(context: Rule.RuleContext): boolean {
  return importsOrDependsOnModule(context, ASSERTION_LIBRARIES, GLOBAL_ASSERTION_DEPENDENCIES);
}

/**
 * Whether the given AST node is an assertion call, recognised across chai,
 * sinon, vitest, supertest, cypress, global `expect*(...)` chains and node
 * `assert`. Pure-AST: does not require type information.
 */
export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  return (
    Chai.isAssertion(context, node) ||
    Sinon.isAssertion(context, node) ||
    Vitest.isAssertion(context, node) ||
    Supertest.isAssertion(context, node) ||
    Cypress.isAssertion(node) ||
    isGlobalAssertion(context, node)
  );
}

/**
 * Type-checker-aware counterpart of {@link isAssertion}, operating on TypeScript
 * AST nodes. Used when parser services are available to follow resolved types.
 */
export function isTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node): boolean {
  return (
    isGlobalTSAssertion(services, node) ||
    Chai.isTSAssertion(services, node) ||
    Sinon.isTSAssertion(services, node) ||
    Supertest.isTSAssertion(services, node) ||
    Vitest.isTSAssertion(services, node) ||
    Cypress.isTSAssertion(node)
  );
}

function isGlobalAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  // Check for global expect (mirrors isGlobalExpectExpression for TS)
  if (isGlobalExpectExpressionJS(node)) {
    return true;
  }
  return isFunctionCallFromNodeAssert(context, node);
}

/**
 * Checks if the node matches the pattern expectX(...).method() where:
 * - expectX is a function whose name starts with "expect" (e.g., expect, expectObservable, expectSubscriptions, expectTypeOf)
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
  return innerCall.callee.type === 'Identifier' && innerCall.callee.name.startsWith('expect');
}

function isFunctionCallFromNodeAssert(context: Rule.RuleContext, node: estree.Node) {
  const fullyQualifiedName = getFullyQualifiedName(context, node);
  return fullyQualifiedName?.split('.')[0] === 'assert';
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
    (innerCallExpression.expression as ts.Identifier).text.startsWith('expect')
  );
}

function isFunctionCallFromNodeAssertTS(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  const fqn = getFullyQualifiedNameTS(services, node);
  return fqn ? fqn?.startsWith('assert') : false;
}
