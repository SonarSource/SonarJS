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
import type { Rule } from 'eslint';
import {
  getUniqueWriteReference,
  getVariableFromName,
  unwrapTypeScriptExpression,
} from '../ast.js';
import { getFullyQualifiedName, hasDirectModuleOrigin } from '../module.js';
import { getFullyQualifiedNameTS } from '../module-ts.js';
import type estree from 'estree';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

export function isAssertion(context: Rule.RuleContext, node: estree.Node) {
  const fqn = extractFQNForCallExpression(context, node);
  return isFQNAssertion(fqn) || isLocalFactoryAssertion(context, node);
}

export function isTSAssertion(
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
  context: Rule.RuleContext,
) {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const fqn = getFullyQualifiedNameTS(services, node);
  return isFQNAssertion(fqn) || isTSLocalFactoryAssertion(context, services, node);
}

function isFQNAssertion(fqn: string | null | undefined) {
  if (!fqn) {
    return false;
  }

  const names = fqn.split('.');

  /**
   * Supertest assertions end in `.expect(...)` after the request's HTTP verb and
   * any intermediate request methods, such as `.send(...)` or `.set(...)`.
   */
  return names.length >= 3 && names[0] === 'supertest' && names.at(-1) === 'expect';
}

function extractFQNForCallExpression(context: Rule.RuleContext, node: estree.Node) {
  if (node.type !== 'CallExpression') {
    return undefined;
  }

  return getFullyQualifiedName(context, node);
}

/**
 * Recognize an assertion on a request from a local factory that directly returns a Supertest call.
 *
 * ```js
 * import request from 'supertest';
 * const http = () => request(app);
 * http().get('/').expect(200); // accepted
 *
 * const fakeHttp = () => fakeRequest(app);
 * fakeHttp().get('/').expect(200); // rejected
 * ```
 *
 * The factory has no parameters. The `http()` call has no arguments and uses a stable Supertest
 * import or `require('supertest')`. Agent factories must use a named `agent` import.
 */
function isLocalFactoryAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  const identifier = getFactoryIdentifier(node);
  if (!identifier) {
    return false;
  }
  const factory = resolveLocalFactory(context, identifier);
  if (factory?.params.length !== 0 || factory?.async || factory?.generator) {
    return false;
  }
  const expression = getReturnedExpression(factory);
  const returned = expression && unwrapTypeScriptExpression(expression);
  if (returned?.type !== 'CallExpression' || returned.optional) {
    return false;
  }
  const callee = unwrapTypeScriptExpression(returned.callee);
  if (hasDirectModuleOrigin(context, callee, 'supertest')) {
    // Example: const http = () => request(app); http().get('/').expect(200);
    return true;
  }
  if (
    callee.type === 'Identifier' &&
    hasDirectModuleOrigin(context, callee, 'supertest', 'agent')
  ) {
    // Example: import { agent } from 'supertest'; const http = () => agent(app); http().get('/').expect(200);
    return true;
  }
  return false;
}

function isTSLocalFactoryAssertion(
  context: Rule.RuleContext,
  services: ParserServicesWithTypeInformation,
  node: ts.Node,
): boolean {
  const mapped = services.tsNodeToESTreeNodeMap.get(node);
  return (
    mapped?.type === 'CallExpression' &&
    isLocalFactoryAssertion(context, mapped as estree.CallExpression)
  );
}

/**
 * Extract `http` from `http().post('/').send(data).expect(201)`.
 * Require at least two methods, no optional chaining, and no arguments to `http()`.
 * Reject computed members such as `http()['post']('/').expect(201)` and `.use(...)` calls.
 */
function getFactoryIdentifier(node: estree.Node): estree.Identifier | undefined {
  if (node.type !== 'CallExpression') {
    return undefined;
  }
  let current = node;
  let methodCount = 0;
  while (true) {
    const callee = unwrapTypeScriptExpression(current.callee);
    if (callee.type !== 'MemberExpression') {
      break;
    }
    const object = unwrapTypeScriptExpression(callee.object);
    if (
      current.optional ||
      callee.optional ||
      callee.computed ||
      callee.property.type !== 'Identifier' ||
      object.type !== 'CallExpression' ||
      (methodCount === 0 && callee.property.name !== 'expect') ||
      // Plugins can replace expect.
      callee.property.name === 'use'
    ) {
      return undefined;
    }
    methodCount++;
    current = object;
  }
  const callee = unwrapTypeScriptExpression(current.callee);
  return methodCount >= 2 &&
    !current.optional &&
    current.arguments.length === 0 &&
    callee.type === 'Identifier'
    ? callee
    : undefined;
}

/**
 * Resolve `http()` only when `http` names one local function definition.
 * Accept `function http() { ... }` with no writes to `http`.
 * Accept `const http = () => ...` or `let http = function () { ... }` with one initializer write.
 * Reject imported functions, aliases, and reassigned factories.
 */
function resolveLocalFactory(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): estree.Function | undefined {
  const variable = getVariableFromName(context, identifier.name, identifier);
  if (variable?.defs.length !== 1) {
    return undefined;
  }
  const definition = variable.defs[0];
  if (
    definition.type === 'FunctionName' &&
    definition.node.type === 'FunctionDeclaration' &&
    !variable.references.some(reference => reference.isWrite())
  ) {
    return definition.node;
  }
  if (definition.type === 'Variable') {
    const initializer = (definition.node as estree.VariableDeclarator).init;
    if (
      (initializer?.type === 'FunctionExpression' ||
        initializer?.type === 'ArrowFunctionExpression') &&
      getUniqueWriteReference(variable) === initializer
    ) {
      return initializer;
    }
  }
  return undefined;
}

/**
 * Accept an expression body or one `return request(app)` statement.
 * Reject setup statements and conditional returns, which do not identify one direct request call.
 */
function getReturnedExpression(factory: estree.Function): estree.Expression | undefined {
  if (factory.body.type !== 'BlockStatement') {
    return factory.body;
  }
  const [statement] = factory.body.body;
  return factory.body.body.length === 1 && statement.type === 'ReturnStatement'
    ? (statement.argument ?? undefined)
    : undefined;
}
