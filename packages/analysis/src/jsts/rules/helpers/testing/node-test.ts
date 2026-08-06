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
 * `node:test`'s built-in assertions, reached through the `TestContext` the runner passes to a test
 * callback:
 *
 * ```js
 * import test from 'node:test';
 * test('t', t => { t.assert.equal(actual, expected); });
 * ```
 *
 * `TestContext.assert` (Node 22+) re-exposes the `node:assert` methods bound to the test, so
 * `t.assert.equal` fails the test exactly as `assert.equal` would. It is nonetheless invisible to
 * the `node:assert` detectors: the file imports `node:test`, never `node:assert`, and the receiver
 * is a callback parameter rather than a module binding.
 */
import type { Rule } from 'eslint';
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';
import { getVariableFromScope, isFunctionNode, isIdentifier } from '../ast.js';
import { getFullyQualifiedName } from '../module.js';
import { importsModuleTS } from '../module-ts.js';

const TEST_MODULE = 'node:test';

/**
 * Every `node:test` entry point resolves to a name rooted at the module itself, which
 * {@link getFullyQualifiedName} normalises to `test` — `test` for a default import, `test.it` and
 * `test.describe` for the named ones.
 */
const NODE_TEST_ROOT = 'test';

/** `node:test` entry points whose callback receives a `TestContext`. */
const TEST_FUNCTION_NAMES = new Set(['test', 'it']);

/**
 * Whether `node` is a `<context>.assert.<method>(...)` call whose receiver is the context parameter
 * of an enclosing `node:test` callback. Pure-AST: does not require type information.
 */
export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const receiver = getAssertReceiver(node.callee);
  return receiver !== undefined && isTestContextParameter(context, node, receiver);
}

/**
 * Counterpart of {@link isAssertion} for the type-aware visitor, which walks TypeScript nodes and
 * never reaches the ESTree detector above.
 *
 * Deliberately structural rather than type-based: `TestContext` only resolves when `@types/node` is
 * part of the program, and the context parameter is plain `any` when it is not — including in this
 * repository's own type-aware rule tests. Matching the shape keeps the two paths in agreement
 * instead of making recognition depend on whether types happen to be installed.
 */
export function isTSAssertion(services: ParserServicesWithTypeInformation, node: ts.Node): boolean {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const call = node as ts.CallExpression;
  const receiver = getAssertReceiverTS(call.expression);
  return (
    receiver !== undefined &&
    importsModuleTS(node.getSourceFile(), [TEST_MODULE]) &&
    isTestContextParameterTS(services, call, receiver)
  );
}

/** {@link getAssertReceiver} on a TypeScript callee. */
function getAssertReceiverTS(callee: ts.Expression): ts.Identifier | undefined {
  if (!ts.isPropertyAccessExpression(callee)) {
    return undefined;
  }
  const assertAccess = callee.expression;
  if (
    !ts.isPropertyAccessExpression(assertAccess) ||
    assertAccess.name.text !== 'assert' ||
    !ts.isIdentifier(assertAccess.expression)
  ) {
    return undefined;
  }
  return assertAccess.expression;
}

/** {@link isTestContextParameter} on the TypeScript AST. */
function isTestContextParameterTS(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
  receiver: ts.Identifier,
): boolean {
  const checker = services.program.getTypeChecker();
  const receiverSymbol = checker.getSymbolAtLocation(receiver);
  if (receiverSymbol === undefined) {
    return false;
  }
  for (let current = node.parent; current !== undefined; current = current.parent) {
    if (!ts.isFunctionExpression(current) && !ts.isArrowFunction(current)) {
      continue;
    }
    const [first] = current.parameters;
    if (
      first === undefined ||
      !ts.isIdentifier(first.name) ||
      checker.getSymbolAtLocation(first.name) !== receiverSymbol
    ) {
      continue;
    }
    const parent = current.parent;
    return (
      parent !== undefined && ts.isCallExpression(parent) && isNodeTestCalleeTS(parent.expression)
    );
  }
  return false;
}

/**
 * Whether `callee` names a `node:test` entry point. The source file is already known to import
 * `node:test`, so matching the callee name is enough to separate `test(...)` / `it(...)` from an
 * unrelated call that happens to take a callback.
 */
function isNodeTestCalleeTS(callee: ts.Expression): boolean {
  if (ts.isIdentifier(callee)) {
    return TEST_FUNCTION_NAMES.has(callee.text);
  }
  return (
    ts.isPropertyAccessExpression(callee) &&
    (TEST_FUNCTION_NAMES.has(callee.name.text) || isNodeTestCalleeTS(callee.expression))
  );
}

/** The `t` of a `t.assert.<method>` callee, or `undefined` if `callee` is not that shape. */
function getAssertReceiver(callee: estree.Node): estree.Identifier | undefined {
  if (callee.type !== 'MemberExpression' || callee.computed) {
    return undefined;
  }
  const assertAccess = callee.object;
  if (
    assertAccess.type !== 'MemberExpression' ||
    assertAccess.computed ||
    !isIdentifier(assertAccess.property, 'assert') ||
    assertAccess.object.type !== 'Identifier'
  ) {
    return undefined;
  }
  return assertAccess.object;
}

/**
 * Whether `receiver` resolves to the first parameter of an enclosing `node:test` callback — i.e.
 * the runner-supplied `TestContext`, rather than an unrelated local that happens to expose an
 * `assert` member.
 */
function isTestContextParameter(
  context: Rule.RuleContext,
  node: estree.Node,
  receiver: estree.Identifier,
): boolean {
  const receiverVariable = getVariableFromScope(
    context.sourceCode.getScope(receiver),
    receiver.name,
  );
  if (receiverVariable === undefined) {
    return false;
  }
  const ancestors = context.sourceCode.getAncestors(
    node as Parameters<typeof context.sourceCode.getAncestors>[0],
  );
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const enclosing = ancestors[i];
    if (!isFunctionNode(enclosing)) {
      continue;
    }
    const [first] = enclosing.params;
    if (
      first?.type !== 'Identifier' ||
      getVariableFromScope(context.sourceCode.getScope(first), first.name) !== receiverVariable
    ) {
      // A nearer function shadowing nothing keeps the search going; one that binds `name` to
      // something else means the receiver is not a test context.
      continue;
    }
    const parent = ancestors[i - 1];
    return (
      parent?.type === 'CallExpression' &&
      parent.arguments.includes(enclosing as estree.Expression) &&
      isNodeTestCall(context, parent)
    );
  }
  return false;
}

function isNodeTestCall(context: Rule.RuleContext, call: estree.CallExpression): boolean {
  return getFullyQualifiedName(context, call)?.split('.')[0] === NODE_TEST_ROOT;
}
